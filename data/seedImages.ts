// data/seedImages.ts
// Manifest of preloaded seed images shown in the Creative Output picker.
// Up to 10 reference frames per game, used as the start image for Scenario img2vid.
//
// File convention (drop the actual files in public/seed-images/<gameId>/):
//   - Format: SVG (placeholders) or JPEG/PNG/WEBP (real screenshots)
//   - Aspect: 9:16 vertical (recommended 1080×1920 raster, viewBox for SVG)
//   - Naming: seed-01.<ext> … seed-10.<ext>
//   - Missing files render as a grey placeholder in <SeedFramePicker /> — the
//     manifest is the source of truth, not the filesystem.
//
// To swap placeholders for real screenshots for a given game:
//   1. Drop seed-01.<ext> … seed-10.<ext> in public/seed-images/<gameId>/
//   2. Bump that game's `extension` field below from 'svg' → the new ext.
// Each game keeps its own extension, so games can migrate independently.

export type SeedImageExtension = 'svg' | 'jpg' | 'jpeg' | 'png' | 'webp';

export type SeedImage = {
  /** Stable id, persisted in the project workflow (e.g. "marble-sort/seed-07"). */
  id: string;
  /** Public URL served by Next.js from /public. */
  url: string;
  /** Short, human-readable label shown under the thumbnail. */
  label: string;
  /** Alt text for accessibility. */
  alt: string;
};

interface GameSeedConfig {
  /** Display name shown in the picker title and thumbnail alt text. */
  gameName: string;
  /** Number of seeds 01..count generated for this game (max 99 fits zero-pad). */
  count: number;
  /** File extension the manifest will resolve URLs against. */
  extension: SeedImageExtension;
}

/**
 * Per-game seed configuration. Keys must match the `gameId` values defined in
 * components/game/GameIdentity.tsx so the picker can resolve the right list.
 */
const SEED_CONFIG: Record<string, GameSeedConfig> = {
  'marble-sort': {
    gameName: 'Marble Sort',
    // Curated set of 6 reference frames — the gameplay variety doesn't need
    // 10 slots, six are enough to cover the core scenes (Level intro / empty
    // board / Level Completed popup / mid-game / next level / colour mix).
    count: 6,
    // Real Marble Sort gameplay screenshots — files must exist as
    // public/seed-images/marble-sort/seed-01.png … seed-06.png.
    extension: 'png',
  },
  'control-mob': {
    gameName: 'Control Mob',
    count: 10,
    // Real Control Mob gameplay screenshots — files must exist as
    // public/seed-images/control-mob/seed-01.png … seed-10.png.
    extension: 'png',
  },
};

function buildSeedList(gameId: string, cfg: GameSeedConfig): SeedImage[] {
  return Array.from({ length: cfg.count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `${gameId}/seed-${n}`,
      url: `/seed-images/${gameId}/seed-${n}.${cfg.extension}`,
      label: `Seed ${n}`,
      alt: `${cfg.gameName} reference frame ${n}`,
    };
  });
}

/**
 * Map of `gameId` → preloaded seed images, derived from SEED_CONFIG.
 */
export const SEED_IMAGES: Record<string, SeedImage[]> = Object.fromEntries(
  Object.entries(SEED_CONFIG).map(([gameId, cfg]) => [
    gameId,
    buildSeedList(gameId, cfg),
  ]),
);

/** Convenience lookup that never throws — returns [] for unknown game ids. */
export function getSeedImages(gameId: string | undefined): SeedImage[] {
  if (!gameId) return [];
  return SEED_IMAGES[gameId] ?? [];
}

/** Find a single seed image by its stable id. */
export function findSeedImage(id: string | undefined): SeedImage | undefined {
  if (!id) return undefined;
  for (const list of Object.values(SEED_IMAGES)) {
    const hit = list.find((s) => s.id === id);
    if (hit) return hit;
  }
  return undefined;
}
