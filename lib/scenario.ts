import 'server-only';

import type {
  CreativeBrief,
  CreativeOutput,
  CreativePattern,
  GameIdentity,
  ScenarioPrompt,
} from '@/lib/types';

/**
 * Builds the Scenario prompt from brief + game + selected pattern.
 * Pure function — Implemented in Phase 8 (REQ-step4-creative-output, brief + prompt).
 */
export function buildScenarioPrompt(
  _brief: CreativeBrief,
  _game: GameIdentity,
  _pattern: CreativePattern,
): ScenarioPrompt {
  throw new Error('buildScenarioPrompt not implemented in Phase 1 — see Phase 8');
}

/**
 * Generates the final 30s vertical ad via Scenario API.
 * Implemented in Phase 9 (REQ-step4-creative-output, video generation).
 */
export async function generateScenarioAd(_prompt: ScenarioPrompt): Promise<CreativeOutput> {
  throw new Error('generateScenarioAd not implemented in Phase 1 — see Phase 9');
}
