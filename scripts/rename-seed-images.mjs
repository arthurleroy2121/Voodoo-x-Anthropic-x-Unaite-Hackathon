#!/usr/bin/env node
// scripts/rename-seed-images.mjs
// One-off helper: rename Windows screenshots ("Capture d'écran YYYY-MM-DD HHMMSS.png")
// to the canonical seed-NN.png convention, sorted alphabetically (which equals
// chronologically given the timestamp embedded in the screenshot filename).
//
// Usage:
//   node scripts/rename-seed-images.mjs
//
// Behaviour:
//   - For each game folder under public/seed-images/, pick all *.png files
//     whose name doesn't already match `seed-NN.png`, sort them lexically,
//     and rename in order: seed-01.png, seed-02.png, …
//   - Idempotent: re-running on already-clean folders is a no-op.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SEED_ROOT = path.join(ROOT, 'public', 'seed-images');

const SEED_PATTERN = /^seed-\d{2}\.png$/i;

async function renameGameFolder(gameId) {
  const dir = path.join(SEED_ROOT, gameId);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    console.warn(`(skip) ${gameId}: folder not found`);
    return;
  }

  // Pick every PNG that doesn't already follow the seed-NN convention.
  const candidates = entries
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .filter((name) => !SEED_PATTERN.test(name))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

  if (candidates.length === 0) {
    console.log(`(skip) ${gameId}: nothing to rename`);
    return;
  }

  console.log(`\n${gameId}:`);
  // Two-pass rename via tmp prefix to avoid collisions if a filename happens
  // to already be e.g. "seed-03.png" while another non-conventional one would
  // overwrite it. Safe even with French apostrophes / accents.
  const tmpPrefix = '__seed-tmp-';
  for (let i = 0; i < candidates.length; i++) {
    const src = candidates[i];
    const tmp = `${tmpPrefix}${i}.png`;
    await fs.rename(path.join(dir, src), path.join(dir, tmp));
    console.log(`  ${src}  →  ${tmp}`);
  }
  for (let i = 0; i < candidates.length; i++) {
    const tmp = `${tmpPrefix}${i}.png`;
    const final = `seed-${String(i + 1).padStart(2, '0')}.png`;
    await fs.rename(path.join(dir, tmp), path.join(dir, final));
    console.log(`  ${tmp}  →  ${final}`);
  }
}

async function main() {
  for (const gameId of ['marble-sort', 'control-mob']) {
    await renameGameFolder(gameId);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
