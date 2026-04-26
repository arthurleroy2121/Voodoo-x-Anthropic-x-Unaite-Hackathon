#!/usr/bin/env node
// scripts/generate-seed-placeholders.mjs
// One-off generator for the 20 SVG placeholders shown in the Creative Output
// seed image picker (10 frames × 2 games). Run with:
//
//   node scripts/generate-seed-placeholders.mjs
//
// Re-running overwrites existing SVGs. Real screenshots replacing these
// placeholders should be JPGs at the SAME basename (seed-01.jpg etc.) and the
// EXTENSION constant in `data/seedImages.ts` flipped from 'svg' → 'jpg'.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_SEEDS = path.join(ROOT, 'public', 'seed-images');

const PALETTES = {
  'marble-sort': {
    label: 'Marble Sort',
    bgFrom: '#FFD3E0',
    bgTo: '#9DCBFF',
    accent: '#E91E63',
    secondary: '#6C5CE7',
    detail: '#00B894',
    motif: 'marbles',
  },
  'control-mob': {
    label: 'Control Mob',
    bgFrom: '#FF7E47',
    bgTo: '#2D3436',
    accent: '#FF6B35',
    secondary: '#FFC93C',
    detail: '#DC3545',
    motif: 'troops',
  },
};

const COUNT = 10;
const W = 1080;
const H = 1920;

/** Decorative motif rendered behind the big number. Two flavours, one per game. */
function decorativeMotif(motif, p, n) {
  const rot = (n - 1) * 36;

  if (motif === 'marbles') {
    // Concentric "tube + marbles" abstraction at the centre, rotated per seed.
    const marbleColors = [p.accent, p.secondary, p.detail];
    const marbles = Array.from({ length: 5 }, (_, i) => {
      const cy = -340 + i * 170;
      const fill = marbleColors[(n + i) % marbleColors.length];
      return `<circle cx="0" cy="${cy}" r="78" fill="${fill}" opacity="0.92"/>`;
    }).join('\n      ');

    return `
    <g transform="translate(${W / 2} ${H / 2 - 220}) rotate(${rot})">
      <rect x="-120" y="-460" width="240" height="940" rx="120" ry="120" fill="white" opacity="0.55"/>
      <rect x="-120" y="-460" width="240" height="940" rx="120" ry="120" fill="none" stroke="${p.secondary}" stroke-width="6" opacity="0.6"/>
      ${marbles}
    </g>`;
  }

  // 'troops' — chevron formation evoking a charging mob.
  const chevrons = Array.from({ length: 6 }, (_, i) => {
    const y = -360 + i * 150;
    const widen = 260 + i * 30;
    const opacity = 0.18 + i * 0.06;
    return `<polygon points="${-widen},${y + 100} 0,${y - 60} ${widen},${y + 100}" fill="${i % 2 === 0 ? p.secondary : p.detail}" opacity="${opacity.toFixed(2)}"/>`;
  }).join('\n      ');

  return `
    <g transform="translate(${W / 2} ${H / 2 - 200}) rotate(${rot * 0.3})">
      ${chevrons}
    </g>`;
}

function buildSvg(gameId, n) {
  const p = PALETTES[gameId];
  const seed = String(n).padStart(2, '0');
  const motif = decorativeMotif(p.motif, p, n);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.bgFrom}"/>
      <stop offset="1" stop-color="${p.bgTo}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
      <stop offset="0" stop-color="black" stop-opacity="0"/>
      <stop offset="1" stop-color="black" stop-opacity="0.32"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
${motif}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- Top label -->
  <g font-family="system-ui, -apple-system, Segoe UI, sans-serif" fill="white">
    <rect x="${W / 2 - 240}" y="80" width="480" height="92" rx="46" ry="46" fill="rgba(0,0,0,0.32)"/>
    <text x="${W / 2}" y="142" font-size="52" font-weight="700" text-anchor="middle" letter-spacing="2">${p.label}</text>
  </g>

  <!-- Big seed number -->
  <text x="${W / 2}" y="${H / 2 + 220}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="540" font-weight="900" text-anchor="middle" fill="white" opacity="0.94">${seed}</text>
  <text x="${W / 2}" y="${H / 2 + 360}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="64" font-weight="600" text-anchor="middle" fill="white" letter-spacing="14" opacity="0.85">SEED</text>

  <!-- Bottom note -->
  <text x="${W / 2}" y="${H - 80}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="34" font-weight="500" text-anchor="middle" fill="white" opacity="0.78">Placeholder · replace with real screenshot</text>
</svg>
`;
}

async function main() {
  for (const gameId of Object.keys(PALETTES)) {
    const dir = path.join(PUBLIC_SEEDS, gameId);
    await fs.mkdir(dir, { recursive: true });
    for (let i = 1; i <= COUNT; i++) {
      const n = String(i).padStart(2, '0');
      const filePath = path.join(dir, `seed-${n}.svg`);
      await fs.writeFile(filePath, buildSvg(gameId, i), 'utf8');
      // eslint-disable-next-line no-console
      console.log(`✓ ${path.relative(ROOT, filePath)}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\nGenerated ${COUNT * 2} placeholders.`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
