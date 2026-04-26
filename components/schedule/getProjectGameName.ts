import type { Project } from '@/lib/types';

/**
 * Map of every game id ever used in the workspace → human-readable game name.
 *
 * Why this duplication? `setGameIdentity` is only committed when the user
 * clicks "Start Market Scan →" in the Game Identity step. Before that, only
 * `gameSetupDraft.gameId` is populated. To avoid showing "No game selected"
 * for users who picked a game in the dropdown but haven't yet started a scan,
 * we need to translate the draft id into a display name without depending on
 * `gameIdentity` being committed.
 *
 * The two hard-coded lookups below mirror the local `GAMES` arrays in
 * `components/game/GameIdentity.tsx` (current canonical ids) and
 * `data/games.ts` (legacy/PRD ids) — kept in sync intentionally.
 */
const GAME_NAME_BY_ID: Readonly<Record<string, string>> = {
  // GameIdentity.tsx (active path)
  'marble-sort': 'Marble Sort',
  'control-mob': 'Control Mob',
  // data/games.ts (PRD reference)
  'puzzle-game': 'Puzzle Voodoo Game',
  'battle-game': 'Battle Voodoo Game',
};

const FALLBACK_LABEL = 'No game selected';

/**
 * Resolves the display name of the game associated with a project, walking the
 * preference order:
 *   1. Committed `gameIdentity.gameName`
 *   2. Selected-but-not-committed `gameSetupDraft.gameId` → mapped via
 *      `GAME_NAME_BY_ID`
 *   3. Hard fallback string
 *
 * Returns `FALLBACK_LABEL` for `undefined` projects so call sites can pass the
 * result of `Map#get` directly without nil-checks.
 */
export function getProjectGameName(project: Project | undefined): string {
  if (!project) return FALLBACK_LABEL;

  const committed = project.workflow.gameIdentity?.gameName;
  if (committed) return committed;

  const draftId = project.workflow.gameSetupDraft?.gameId;
  if (draftId && GAME_NAME_BY_ID[draftId]) {
    return GAME_NAME_BY_ID[draftId];
  }

  return FALLBACK_LABEL;
}

export const NO_GAME_LABEL = FALLBACK_LABEL;
