import type {
  CreativePattern,
  GameIdentity,
  GeminiAdAnalysis,
  MarketAd,
} from '@/lib/types';

/**
 * Generates exactly 3 ranked creative patterns from a Gemini analysis + ad + game.
 * Pure scoring function (no I/O). Formula:
 *   Pattern Score = 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability
 * Implemented in Phase 7 (REQ-step3-pattern-analysis — scoring side).
 */
export function generateTopPatterns(
  _analysis: GeminiAdAnalysis,
  _ad: MarketAd,
  _game: GameIdentity,
): CreativePattern[] {
  throw new Error('generateTopPatterns not implemented in Phase 1 — see Phase 7');
}
