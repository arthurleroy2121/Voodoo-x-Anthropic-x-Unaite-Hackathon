// data/games.ts
// 2 hardcoded games (PRD lines 86-99 — keep verbatim names, category, tags).
// MVP scope (D-24) — extension to >2 games is v2 (CAT-01).

import type { GameIdentity } from '@/lib/types';

export const GAMES: GameIdentity[] = [
  {
    gameId: 'puzzle-game',
    gameName: 'Puzzle Voodoo Game',
    category: 'Puzzle',
    tags: ['casual', 'logic', 'level-based', 'satisfying', 'challenge'],
  },
  {
    gameId: 'battle-game',
    gameName: 'Battle Voodoo Game',
    category: 'Battle',
    tags: ['combat', 'strategy', 'characters', 'progression', 'mid-core'],
  },
];
