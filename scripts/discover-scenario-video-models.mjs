#!/usr/bin/env node
// scripts/discover-scenario-video-models.mjs
//
// Phase 9 v3 (Seedance 2.0) — discovery helper.
//
// Reads SCENARIO_API_KEY / SCENARIO_API_SECRET from .env.local and lists every
// public Scenario model whose ID starts with `model_` (the catalog of custom
// video / image-2-video models exposed via /v1/generate/custom/{modelId}).
//
// What it does:
//   1. GET /v1/models?privacy=public&pageSize=500  (paginated until exhausted)
//   2. For each "custom" model, fetch GET /v1/models/{modelId} to get the
//      full `inputs[]` schema (the `/models` list endpoint truncates inputs).
//   3. Print a summary table to stdout (id | name | inputs).
//   4. Filter by /seedance/i and print those entries in a "matched" block —
//      that's where the Phase 9 implementation will pick the model id.
//   5. Persist the full payload to scenario-models.json at the repo root so
//      it can be diffed in git later.
//
// Usage:
//   node scripts/discover-scenario-video-models.mjs            # full dump
//   node scripts/discover-scenario-video-models.mjs --filter seedance
//   node scripts/discover-scenario-video-models.mjs --type video   # use ?type=
//
// Notes:
//   - The /v1/models endpoint expects either an API key Basic auth or
//     `Authorization: public-auth-token`. We use the API key+secret pair
//     because the team account may have curated/private mirrors of public
//     models, and we want to see *exactly* what THIS account can call.
//   - Model `inputs[]` describes the body shape of POST /generate/custom/{id}:
//       { name, type: 'string'|'file'|'number'|'boolean'|..., kind?, allowedValues?, required? }
//     That's the spec we'll mirror in lib/scenario.ts for Seedance.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const PROJECT_ROOT = resolve(REPO_ROOT, '..'); // VOODOO1/

// ---------------------------------------------------------------------------
// .env.local loader (zero-dep — Node 18+ has fetch built-in)
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const candidates = [
    resolve(REPO_ROOT, '.env.local'),
    resolve(REPO_ROOT, '.env'),
  ];
  for (const p of candidates) {
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
      // ignore missing file
    }
  }
}

loadEnvLocal();

const SCENARIO_BASE_URL =
  process.env.SCENARIO_API_URL ?? 'https://api.cloud.scenario.com/v1';
const KEY = process.env.SCENARIO_API_KEY;
const SECRET = process.env.SCENARIO_API_SECRET ?? '';

if (!KEY) {
  console.error(
    'SCENARIO_API_KEY missing. Set it in .env.local at the repo root.',
  );
  process.exit(1);
}

const AUTH = `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const FILTER = flag('--filter') ?? '';
const TYPE_FILTER = flag('--type'); // optional ?type=... query param

// ---------------------------------------------------------------------------
// Scenario API helpers
// ---------------------------------------------------------------------------

async function apiGet(path) {
  const url = `${SCENARIO_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: AUTH, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function listAllModels() {
  const all = [];
  let token = undefined;
  let page = 0;

  do {
    const params = new URLSearchParams();
    params.set('privacy', 'public');
    params.set('pageSize', '500');
    if (TYPE_FILTER) params.set('type', TYPE_FILTER);
    if (token) params.set('paginationToken', token);

    const json = await apiGet(`/models?${params}`);
    const models = Array.isArray(json.models) ? json.models : [];
    all.push(...models);
    page += 1;
    process.stdout.write(
      `· page ${page}: +${models.length} (total ${all.length})\n`,
    );

    token = json.paginationToken ?? json.nextPaginationToken;
  } while (token);

  return all;
}

async function fetchModelDetails(modelId) {
  try {
    const json = await apiGet(`/models/${encodeURIComponent(modelId)}`);
    return json.model ?? json;
  } catch (e) {
    return { __error: String(e instanceof Error ? e.message : e) };
  }
}

// ---------------------------------------------------------------------------
// Pretty print
// ---------------------------------------------------------------------------

function printInputsTable(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    console.log('    (no inputs[] declared on the list endpoint)');
    return;
  }
  for (const inp of inputs) {
    const required =
      inp.required?.always === true
        ? ' [required]'
        : inp.required?.ifNotDefined
          ? ' [conditional]'
          : '';
    const kind = inp.kind ? ` kind=${inp.kind}` : '';
    const allowed = Array.isArray(inp.allowedValues)
      ? ` allowed=[${inp.allowedValues.map((v) => JSON.stringify(v)).join(',')}]`
      : '';
    const range =
      inp.min !== undefined || inp.max !== undefined
        ? ` range=[${inp.min ?? '-∞'}, ${inp.max ?? '+∞'}]`
        : '';
    const def = inp.defaultValue !== undefined ? ` default=${JSON.stringify(inp.defaultValue)}` : '';
    console.log(
      `    - ${inp.name} : ${inp.type}${kind}${allowed}${range}${def}${required}`,
    );
  }
}

function printModel(m) {
  const tag = m.type ? `[${m.type}]` : '';
  console.log(`\n${m.id}  ${tag}  ${m.name ?? '(no name)'}`);
  if (m.shortDescription) {
    console.log(`  ${m.shortDescription}`);
  }
  if (Array.isArray(m.tags) && m.tags.length) {
    console.log(`  tags: ${m.tags.join(', ')}`);
  }
  printInputsTable(m.inputs ?? m.parameters);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  console.log('# Scenario model discovery\n');
  console.log(`base url: ${SCENARIO_BASE_URL}`);
  console.log(`api key:  ${KEY.replace(/.(?=.{4})/g, '*')}`);
  console.log(
    `filter:   ${FILTER ? JSON.stringify(FILTER) : '(none — printing every custom model)'}`,
  );
  console.log(`type:     ${TYPE_FILTER ?? '(any)'}\n`);

  console.log('1. Listing all public models …');
  const list = await listAllModels();
  console.log(`Found ${list.length} models total.\n`);

  // The list endpoint only returns inputs[] for `custom` models that wrap a
  // hosted video pipeline (Wan, Kling, Seedance, Veo, etc.). Filter to those.
  const customs = list.filter((m) => m.type === 'custom');
  console.log(`Of which custom (video / specialty) models: ${customs.length}\n`);

  // Hydrate inputs for every custom model — list endpoint sometimes truncates.
  console.log('2. Fetching detailed inputs[] for each custom model …');
  const detailed = [];
  for (const m of customs) {
    const full = await fetchModelDetails(m.id);
    detailed.push({ ...m, ...full });
    process.stdout.write('.');
  }
  console.log('\n');

  // Print full table.
  console.log('3. Catalog:');
  for (const m of detailed) printModel(m);

  // Match.
  if (FILTER) {
    const re = new RegExp(FILTER, 'i');
    const matched = detailed.filter(
      (m) => re.test(m.id ?? '') || re.test(m.name ?? ''),
    );
    console.log(
      `\n=== MATCHES for /${FILTER}/i (${matched.length}) ===========================`,
    );
    for (const m of matched) printModel(m);
  } else {
    // Always at least surface seedance hits — that's the goal of this script.
    const re = /seedance|bytedance|seed-?dance/i;
    const matched = detailed.filter(
      (m) => re.test(m.id ?? '') || re.test(m.name ?? ''),
    );
    console.log(
      `\n=== Auto-detected Seedance candidates (${matched.length}) ===============`,
    );
    if (matched.length === 0) {
      console.log(
        'None matched. Re-run with `--filter <substring>` to narrow down,',
      );
      console.log(
        'e.g. `node scripts/discover-scenario-video-models.mjs --filter video`.',
      );
    } else {
      for (const m of matched) printModel(m);
    }
  }

  // Persist to scenario-models.json (at the repo root, beside package.json
  // would be ../scenario-models.json — this file already exists empty there).
  const out = {
    fetchedAt: new Date().toISOString(),
    baseUrl: SCENARIO_BASE_URL,
    totalListed: list.length,
    customCount: detailed.length,
    customs: detailed.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      privacy: m.privacy,
      shortDescription: m.shortDescription,
      tags: m.tags,
      inputs: m.inputs ?? m.parameters,
      // Keep the raw object for archival (for diffing schemas later).
      raw: m,
    })),
  };

  // Try repo-root first, else project-root (one level up — matches
  // scenario-models.json that already exists at VOODOO1/scenario-models.json).
  const targets = [
    resolve(PROJECT_ROOT, 'scenario-models.json'),
    resolve(REPO_ROOT, 'scenario-models.json'),
  ];
  for (const t of targets) {
    try {
      writeFileSync(t, JSON.stringify(out, null, 2), 'utf8');
      console.log(`\nSaved full catalog to: ${t}`);
      break;
    } catch (e) {
      console.warn(`Failed to write ${t}: ${e}`);
    }
  }
})().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
