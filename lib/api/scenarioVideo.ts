// lib/api/scenarioVideo.ts
// Zod schemas for the POST /api/scenario/generate endpoint.
// Runs on both client and server (no `server-only` import) — pure types.
//
// Phase 9 v3 (Seedance 2.0): the endpoint now requires BOTH a starting frame
// (`startImageUrl`) and a finishing frame (`endImageUrl`). They feed Seedance
// 2.0's `image` (first frame) and `lastFrameImage` (last frame) inputs.

import { z } from 'zod';

/**
 * Anti-SSRF guard for image URL inputs: only paths under /public/seed-images/
 * are accepted, so callers cannot ask the server to base64-encode arbitrary
 * remote URLs or paths outside the seed-images library.
 */
export const SEED_PATH_RE =
  /^\/seed-images\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|png|webp|svg)$/i;

const SEED_PATH_MESSAGE =
  '%FIELD% must be a /seed-images/<gameId>/<file>.{jpg|png|webp|svg} path';

/**
 * Body shape accepted by `/api/scenario/generate`.
 *
 * `startImageUrl` and `endImageUrl` are restricted to public seed-image paths
 * under /public to prevent SSRF — only files we already host can be sent to
 * Scenario as the starting / finishing frames.
 */
export const ScenarioGenerateRequestSchema = z.object({
  prompt: z.string().min(10).max(20_000),
  startImageUrl: z
    .string()
    .regex(SEED_PATH_RE, SEED_PATH_MESSAGE.replace('%FIELD%', 'startImageUrl')),
  endImageUrl: z
    .string()
    .regex(SEED_PATH_RE, SEED_PATH_MESSAGE.replace('%FIELD%', 'endImageUrl')),
  gameId: z.string().min(1).max(64),
});

export type ScenarioGenerateRequest = z.infer<typeof ScenarioGenerateRequestSchema>;

/**
 * Successful response payload — a single video URL + the Scenario job id.
 * Wrapped by the standard `{ ok: true, data: ... }` envelope at the route level.
 */
export const ScenarioGenerateDataSchema = z.object({
  videoUrl: z.string().url(),
  jobId: z.string(),
  durationSec: z.literal(15),
});

export type ScenarioGenerateData = z.infer<typeof ScenarioGenerateDataSchema>;
