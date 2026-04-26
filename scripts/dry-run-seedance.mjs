#!/usr/bin/env node
// scripts/dry-run-seedance.mjs
//
// Phase 9 v3 (Seedance 2.0) — sanity-check the production body shape WITHOUT
// burning Creative Units.
//
// Sends the exact body that lib/scenario.ts will use, but with `?dryRun=true`,
// against POST /v1/generate/custom/{modelId}. The endpoint validates the
// payload and returns either:
//   200 { creativeUnitsCost, ... }       → body is accepted, ready to ship
//   422 { error: "validation: …" }       → body is wrong, fix before coding prod
//
// We use real PNGs from public/seed-images/marble-sort/ so the file size,
// MIME type and base64 length are representative of production.
//
// Usage:
//   node scripts/dry-run-seedance.mjs
//   node scripts/dry-run-seedance.mjs --start seed-01.png --end seed-04.png
//   node scripts/dry-run-seedance.mjs --modelId model_bytedance-seedance-2-0-fast
//
// Exit codes:
//   0 — dry run accepted (200 with cost). Ready to flip prod.
//   1 — dry run rejected. Read the printed error and adjust constants in
//       lib/scenario.ts (or this script) before going further.

import { readFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// .env.local loader — duplicated from discover-scenario-video-models.mjs to
// keep this script standalone and runnable on a fresh checkout.
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  for (const p of [resolve(REPO_ROOT, '.env.local'), resolve(REPO_ROOT, '.env')]) {
    try {
      const txt = readFileSync(p, 'utf8');
      for (const rawLine of txt.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!(k in process.env)) process.env[k] = v;
      }
    } catch {
      // ignore
    }
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCENARIO_BASE_URL =
  process.env.SCENARIO_API_URL ?? 'https://api.cloud.scenario.com/v1';
const KEY = process.env.SCENARIO_API_KEY;
const SECRET = process.env.SCENARIO_API_SECRET ?? '';

if (!KEY) {
  console.error('SCENARIO_API_KEY missing in .env.local');
  process.exit(1);
}

const AUTH = `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const MODEL_ID = arg('--modelId', 'model_bytedance-seedance-2-0');
const SEED_DIR = arg('--seedDir', 'public/seed-images/marble-sort');
const START_NAME = arg('--start', 'seed-01.png');
const END_NAME = arg('--end', 'seed-04.png');
const PROMPT = arg(
  '--prompt',
  'Camera slowly pans across a vibrant marble sorting puzzle as colored balls cascade down twisting glass tubes, smooth seamless animation, vertical mobile-game ad aesthetic',
);
const DURATION = Number(arg('--duration', '15'));
const RESOLUTION = arg('--resolution', '720p');
const ASPECT_RATIO = arg('--aspectRatio', 'adaptive');
const GENERATE_AUDIO = arg('--generateAudio', 'false') === 'true';

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function readImageAsDataUrl(relPath) {
  const abs = resolve(REPO_ROOT, relPath);
  const buf = readFileSync(abs);
  const mime = MIME_BY_EXT[extname(abs).toLowerCase()] ?? 'image/png';
  return {
    abs,
    sizeKB: (buf.byteLength / 1024).toFixed(1),
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  console.log('# Seedance 2.0 dry-run');
  console.log(`base url     : ${SCENARIO_BASE_URL}`);
  console.log(`api key      : ${KEY.replace(/.(?=.{4})/g, '*')}`);
  console.log(`modelId      : ${MODEL_ID}`);
  console.log(`prompt       : ${PROMPT.slice(0, 80)}${PROMPT.length > 80 ? '…' : ''}`);
  console.log(`duration     : ${DURATION}s`);
  console.log(`resolution   : ${RESOLUTION}`);
  console.log(`aspectRatio  : ${ASPECT_RATIO}`);
  console.log(`generateAudio: ${GENERATE_AUDIO}\n`);

  const startPath = `${SEED_DIR}/${START_NAME}`;
  const endPath = `${SEED_DIR}/${END_NAME}`;
  const start = readImageAsDataUrl(startPath);
  const end = readImageAsDataUrl(endPath);
  console.log(`start image  : ${start.abs}  (${start.sizeKB} KB)`);
  console.log(`end image    : ${end.abs}  (${end.sizeKB} KB)\n`);

  const body = {
    image: start.dataUrl,
    lastFrameImage: end.dataUrl,
    prompt: PROMPT,
    duration: DURATION,
    resolution: RESOLUTION,
    aspectRatio: ASPECT_RATIO,
    generateAudio: GENERATE_AUDIO,
  };

  // For logging — strip the data URLs, they're huge.
  const bodyForLog = {
    ...body,
    image: `[data:${start.dataUrl.length} bytes]`,
    lastFrameImage: `[data:${end.dataUrl.length} bytes]`,
  };
  console.log('body (data: truncated):');
  console.log(JSON.stringify(bodyForLog, null, 2));
  console.log('');

  const url = `${SCENARIO_BASE_URL}/generate/custom/${encodeURIComponent(
    MODEL_ID,
  )}?dryRun=true`;
  console.log(`POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: AUTH,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  console.log(`\nstatus: ${res.status} ${res.statusText}`);
  console.log('response:');
  console.log(typeof json === 'string' ? json : JSON.stringify(json, null, 2));

  if (res.ok) {
    const cost =
      json?.creativeUnitsCost ??
      json?.cuCost ??
      json?.billing?.cuCost ??
      '(none — but request was accepted)';
    console.log(`\n✅ DRY RUN OK — body shape is valid for ${MODEL_ID}.`);
    console.log(`Estimated CU cost: ${cost}`);
    console.log(
      'Safe to commit lib/scenario.ts with these constants.',
    );
    process.exit(0);
  }

  console.log(`\n❌ DRY RUN REJECTED (HTTP ${res.status}).`);
  console.log('Adjust the body in this script + lib/scenario.ts and re-run.');
  process.exit(1);
})().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
