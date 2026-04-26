// lib/scenario.ts
// Server-only Scenario.gg client for generating a 15-second img2video clip.
//
// Strategy (chosen in Phase 9 v3 — replaces the Wan 2.6 single-frame impl):
//   Single-clip generation via ByteDance Seedance 2.0 (`model_bytedance-seedance-2-0`)
//   at duration=15s, resolution=720p, aspectRatio="adaptive", generateAudio=false.
//   Seedance 2.0 takes BOTH a starting frame (`image`) and a finishing frame
//   (`lastFrameImage`) and interpolates the 15s clip between them — no
//   chaining, no seam, no last-frame extraction needed.
//
// Body schema verified live on 2026-04-26 against the Scenario API:
//   - GET /v1/models?privacy=public  →  full inputs[] of model_bytedance-seedance-2-0
//   - POST /v1/generate/custom/model_bytedance-seedance-2-0?dryRun=true with
//     the body below returned 200 with creativeUnitsCost: 546.
//   See scripts/discover-scenario-video-models.mjs and scripts/dry-run-seedance.mjs.
//
// Confirmed body shape:
//   {
//     image:           "data:image/png;base64,…",   // starting frame
//     lastFrameImage:  "data:image/png;base64,…",   // finishing frame
//     prompt:          string,
//     duration:        15,                          // allowed: -1,4..15
//     resolution:      "720p",                      // allowed: 480p / 720p / 1080p
//     aspectRatio:     "adaptive",                  // allowed: 16:9 / 4:3 / 1:1 / 3:4 / 9:16 / 21:9 / adaptive
//     generateAudio:   false                        // boolean
//   }
//
// API surface (verified against the OpenAPI spec at
// https://docs.scenario.com/openapi/restapi.yaml on 2026-04-26):
//
//   POST /v1/generate/custom/{modelId}        — start an img2video job
//     returns: { job: { jobId, status, ... }, creativeUnitsCost, ... }
//   GET  /v1/jobs/{jobId}                     — poll the job status
//     returns: { job: { status, metadata: { assetIds[] }, ... } }
//   GET  /v1/assets/{assetId}                 — resolve an asset to its URL
//     returns: { asset: { url, type, ... } }

import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getScenarioKey } from '@/lib/api/env';

// ---------------------------------------------------------------------------
// Configuration — override via env if needed without redeploying code changes.
// ---------------------------------------------------------------------------

const SCENARIO_BASE_URL =
  process.env.SCENARIO_API_URL ?? 'https://api.cloud.scenario.com/v1';

/**
 * Scenario model id for image-to-video generation.
 *
 * Default: `model_bytedance-seedance-2-0` — ByteDance Seedance 2.0, the model
 * the PRD locks to for Phase 9 v3. Supports both first-frame (`image`) and
 * last-frame (`lastFrameImage`) inputs and a duration up to 15s.
 *
 * Other Seedance candidates verified available on this account
 * (see scenario-models.json):
 *   - `model_bytedance-seedance-2-0-fast` — faster but limited to 480p/720p
 *   - `model_bytedance-seedance-1-5-pro`  — older 1.5 Pro
 *   - `model_bytedance-seedance-1-pro`    — earlier 1.x line
 */
const SCENARIO_VIDEO_MODEL_ID =
  process.env.SCENARIO_VIDEO_MODEL_ID ?? 'model_bytedance-seedance-2-0';

/** Final ad duration shipped to the user. PRD locked to 15 seconds. */
const VIDEO_DURATION_SEC = 15 as const;

/** Output resolution. PRD locked to 720p; Seedance 2.0 also supports 480p / 1080p. */
const VIDEO_RESOLUTION = '720p' as const;

/**
 * Output aspect ratio. PRD says "auto" — Seedance 2.0 calls this `"adaptive"`
 * (the API rejects `"auto"`, see the model's allowedValues in scenario-models.json).
 */
const VIDEO_ASPECT_RATIO = 'adaptive' as const;

/** PRD: no audio generation. Seedance 2.0 returns silent video when this is false. */
const VIDEO_GENERATE_AUDIO = false as const;

const POLL_INTERVAL_MS = 3_000;
/** Stay under route `maxDuration = 300` with a safety margin for upload + I/O. */
const POLL_TIMEOUT_MS = 280_000;

// ---------------------------------------------------------------------------
// Auth — Scenario uses Basic auth with `<API_KEY>:<API_SECRET>` base64-encoded.
// Some accounts only have a single token: in that case set SCENARIO_API_SECRET
// empty (or unset) and we fall back to `API_KEY:` (Scenario CLI compatible).
// ---------------------------------------------------------------------------

function buildAuthHeader(): string {
  const key = getScenarioKey();
  const secret = process.env.SCENARIO_API_SECRET ?? '';
  const token = Buffer.from(`${key}:${secret}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

// ---------------------------------------------------------------------------
// Seed image loading — read /public file from disk + base64-encode. We can't
// rely on Scenario fetching localhost in dev; in production Vercel could host
// it but base64 keeps the codepath identical across envs.
// ---------------------------------------------------------------------------

interface Base64Image {
  base64: string;
  mime: string;
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function readPublicFileAsBase64(publicUrl: string): Promise<Base64Image> {
  if (!publicUrl.startsWith('/')) {
    throw new Error(
      `readPublicFileAsBase64: expected a leading slash, got "${publicUrl}"`,
    );
  }
  const safeRel = publicUrl.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(process.cwd(), 'public', safeRel));
  const publicRoot = path.normalize(path.join(process.cwd(), 'public'));
  if (!filePath.startsWith(publicRoot)) {
    throw new Error(`readPublicFileAsBase64: path escape detected (${publicUrl})`);
  }
  const ext = path.extname(filePath).toLowerCase();

  // Scenario's image-to-video models do NOT accept SVG — fail early with a
  // clear actionable message instead of waiting for the upstream 4xx.
  if (ext === '.svg') {
    throw new Error(
      `Cannot send "${publicUrl}" to Scenario: SVG placeholders are for the picker UI only. ` +
        `Drop a real JPG/PNG/WEBP screenshot at the same path (or update data/seedImages.ts EXTENSION).`,
    );
  }

  let buf: Buffer;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    throw new Error(
      `Seed image not found on disk at "${publicUrl}". Drop the file into ` +
        `public${safeRel.startsWith('/') ? safeRel : '/' + safeRel}.`,
    );
  }
  const mime = MIME_BY_EXT[ext] ?? 'image/jpeg';
  return { base64: buf.toString('base64'), mime };
}

function toDataUrl(img: Base64Image): string {
  return `data:${img.mime};base64,${img.base64}`;
}

// ---------------------------------------------------------------------------
// Generic Scenario calls
// ---------------------------------------------------------------------------

/** Authenticated GET against the Scenario API. */
async function scenarioGet<T = unknown>(pathRel: string): Promise<T> {
  const res = await fetch(`${SCENARIO_BASE_URL}${pathRel}`, {
    headers: {
      Authorization: buildAuthHeader(),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Scenario GET ${pathRel} → HTTP ${res.status}: ${text.slice(0, 800) || res.statusText}`,
    );
  }
  return (await res.json()) as T;
}

/**
 * POST /generate/custom/{modelId} — kicks off an async img2vid job on Seedance 2.0.
 *
 * Verified body shape (see file header):
 *   { image, lastFrameImage, prompt, duration, resolution, aspectRatio, generateAudio }
 */
async function createImageToVideoJob(
  startImage: Base64Image,
  endImage: Base64Image,
  prompt: string,
  durationSec: number,
): Promise<{ jobId: string }> {
  const body = {
    image: toDataUrl(startImage),
    lastFrameImage: toDataUrl(endImage),
    prompt,
    duration: durationSec,
    resolution: VIDEO_RESOLUTION,
    aspectRatio: VIDEO_ASPECT_RATIO,
    generateAudio: VIDEO_GENERATE_AUDIO,
  };

  const url = `${SCENARIO_BASE_URL}/generate/custom/${SCENARIO_VIDEO_MODEL_ID}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: buildAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Scenario createJob HTTP ${res.status}: ${text.slice(0, 800) || res.statusText}`,
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  // Verified shape: { job: { jobId, status, ... }, creativeUnitsCost, ... }
  const jobId =
    pickFirst<string>(json, ['job', 'jobId']) ??
    pickFirst<string>(json, ['jobId']);
  if (!jobId) {
    throw new Error(
      `Scenario createJob: cannot extract jobId from response: ${JSON.stringify(json).slice(0, 500)}`,
    );
  }
  return { jobId };
}

interface JobStatusResponse {
  job?: {
    jobId?: string;
    status?: string;
    metadata?: {
      assetIds?: string[];
      output?: Record<string, unknown>;
      input?: Record<string, unknown>;
    };
    progress?: number;
  };
}

interface AssetResponse {
  asset?: {
    assetId?: string;
    url?: string;
    type?: string;
    mimeType?: string;
  };
}

/**
 * Poll GET /jobs/{jobId} every POLL_INTERVAL_MS until status is success/failure
 * or POLL_TIMEOUT_MS elapses. Returns the resolved video URL once available.
 */
async function pollScenarioJob(jobId: string): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const json = await scenarioGet<JobStatusResponse>(`/jobs/${jobId}`);
    const status = String(json.job?.status ?? 'unknown').toLowerCase();

    if (status === 'success' || status === 'completed') {
      return await resolveVideoUrlForJob(jobId, json);
    }

    if (
      status === 'failure' ||
      status === 'failed' ||
      status === 'error' ||
      status === 'canceled' ||
      status === 'cancelled'
    ) {
      throw new Error(
        `Scenario job ${jobId} ended with status="${status}": ${JSON.stringify(json).slice(0, 500)}`,
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Scenario job ${jobId} did not complete within ${POLL_TIMEOUT_MS / 1000}s`,
  );
}

/**
 * After a job succeeds, resolve `metadata.assetIds[]` and pick the first
 * asset that looks like a video. Falls back to the first asset with a URL
 * if none are explicitly tagged as video.
 */
async function resolveVideoUrlForJob(
  jobId: string,
  job: JobStatusResponse,
): Promise<string> {
  const assetIds = job.job?.metadata?.assetIds ?? [];
  if (assetIds.length === 0) {
    throw new Error(
      `Scenario job ${jobId} succeeded but metadata.assetIds is empty: ${JSON.stringify(job).slice(0, 500)}`,
    );
  }

  const assets = await Promise.all(
    assetIds.map(async (id) => {
      try {
        const r = await scenarioGet<AssetResponse>(`/assets/${id}`);
        return r.asset;
      } catch (e) {
        console.warn(`[scenario] failed to resolve asset ${id}:`, e);
        return undefined;
      }
    }),
  );

  // Prefer video-typed asset; fall back to first asset with a URL.
  for (const a of assets) {
    if (!a?.url) continue;
    const isVideo =
      a.type?.toLowerCase().includes('video') ||
      a.mimeType?.toLowerCase().startsWith('video/');
    if (isVideo) return a.url;
  }

  const firstWithUrl = assets.find((a) => a?.url)?.url;
  if (firstWithUrl) return firstWithUrl;

  throw new Error(
    `Scenario job ${jobId} succeeded but no asset has a usable URL: ${JSON.stringify(assets).slice(0, 500)}`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateScenarioVideoResult {
  videoUrl: string;
  jobId: string;
  durationSec: 15;
}

/**
 * Generates a single 15-second img2video clip via Scenario (Seedance 2.0).
 *
 * Sequence:
 *   1. Read both seed images from /public, base64-encode each.
 *   2. POST `/generate/custom/model_bytedance-seedance-2-0` with the verified body
 *      (image + lastFrameImage + prompt + duration=15 + resolution=720p +
 *      aspectRatio=adaptive + generateAudio=false).
 *   3. Poll GET `/jobs/{jobId}` until status === "success".
 *   4. Resolve the video asset URL.
 */
export async function generateScenarioVideo(
  prompt: string,
  startSeedImagePublicUrl: string,
  endSeedImagePublicUrl: string,
): Promise<GenerateScenarioVideoResult> {
  const startImage = await readPublicFileAsBase64(startSeedImagePublicUrl);
  const endImage = await readPublicFileAsBase64(endSeedImagePublicUrl);

  const { jobId } = await createImageToVideoJob(
    startImage,
    endImage,
    prompt,
    VIDEO_DURATION_SEC,
  );
  const videoUrl = await pollScenarioJob(jobId);

  return { videoUrl, jobId, durationSec: VIDEO_DURATION_SEC };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walks the given JSON object trying each path in order, returning the first
 * value that matches the expected primitive type. Tolerant of missing keys
 * and array indices, returns `undefined` if none match.
 */
function pickFirst<T extends string>(
  obj: unknown,
  ...paths: Array<Array<string | number>>
): T | undefined {
  for (const p of paths) {
    let cur: unknown = obj;
    let ok = true;
    for (const seg of p) {
      if (cur == null) {
        ok = false;
        break;
      }
      if (typeof seg === 'number') {
        if (!Array.isArray(cur)) {
          ok = false;
          break;
        }
        cur = cur[seg];
      } else {
        if (typeof cur !== 'object') {
          ok = false;
          break;
        }
        cur = (cur as Record<string, unknown>)[seg];
      }
    }
    if (ok && typeof cur === 'string' && cur.length > 0) {
      return cur as T;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Legacy stubs — kept so existing imports don't break.
// ---------------------------------------------------------------------------

/**
 * @deprecated v1 chained-clip orchestrator (Kling 10+5). Replaced by
 * `generateScenarioVideo` which uses Seedance 2.0 with a start AND an end
 * frame. Kept exported only so older callers don't break at compile-time.
 * Falls back to using `seedImagePublicUrl` as both start and end frames so
 * call sites that haven't been updated still produce a clip (visually static
 * but valid).
 */
export async function generate15sScenarioVideo(
  prompt: string,
  seedImagePublicUrl: string,
): Promise<{ videoUrl: string; jobId: string; durationSec: 15 }> {
  return generateScenarioVideo(prompt, seedImagePublicUrl, seedImagePublicUrl);
}
