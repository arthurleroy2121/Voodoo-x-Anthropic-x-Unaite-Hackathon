// lib/sensortower/categories.ts
// Mapping iOS App Store category IDs ↔ libellés FR + résolution depuis les
// `category` strings utilisés par le store Zustand existant ("Puzzle", "Battle"…).
// Source : `Doc Sensor TOWER/sensor-tower.md` §9.1.

/** ID iOS App Store → libellé FR court. */
export const IOS_CATEGORY_LABELS: Record<number, string> = {
  6014: 'Jeux',
  7001: 'Action',
  7002: 'Aventure',
  7003: 'Casual',
  7004: 'Plateau',
  7005: 'Cartes',
  7006: 'Casino',
  7009: 'Famille',
  7011: 'Musique',
  7012: 'Puzzle',
  7013: 'Course',
  7014: 'Rôle',
  7015: 'Simulation',
  7016: 'Sport',
  7017: 'Stratégie',
  7018: 'Quiz',
  7019: 'Lettres',
};

/**
 * Mapping `gameIdentity.category` (string libre choisi côté Game Identity tab)
 * → iOS App Store category ID. Les strings utilisés actuellement par
 * `data/games.ts` sont "Puzzle" et "Battle". On normalise en lower-case avant
 * lookup pour tolérer les variations de casse.
 */
export const STRING_CATEGORY_TO_IOS_ID: Record<string, number> = {
  puzzle: 7012,
  battle: 7001,
  action: 7001,
  combat: 7001,
  // Extensibilité v2 : ajouter ici si la liste des jeux Voodoo s'élargit.
  arcade: 7003,
  casual: 7003,
  racing: 7013,
  rpg: 7014,
  simulation: 7015,
  strategy: 7017,
  word: 7019,
};

/**
 * Résout un libellé string libre vers un iOS category ID.
 * @returns L'ID numérique iOS, ou `null` si la catégorie n'est pas mappée.
 */
export function resolveCategoryId(category: string | undefined | null): number | null {
  if (!category) return null;
  const key = category.trim().toLowerCase();
  return STRING_CATEGORY_TO_IOS_ID[key] ?? null;
}

/**
 * Récupère le libellé FR d'un iOS category ID. Fallback sur "Catégorie #<id>"
 * pour les IDs non mappés (au lieu de throw — un dashboard avec un titre approximatif
 * vaut mieux qu'un crash).
 */
export function getCategoryLabel(id: number): string {
  return IOS_CATEGORY_LABELS[id] ?? `Catégorie #${id}`;
}
