import 'server-only';

import type { GameIdentity, GeminiAdAnalysis, MarketAd } from '@/lib/types';

/**
 * Analyzes the selected ad's full video with Gemini.
 * Implemented in Phase 6 (REQ-step3-pattern-analysis — Gemini side).
 */
export async function analyzeSelectedAdWithGemini(
  _ad: MarketAd,
  _game: GameIdentity,
): Promise<GeminiAdAnalysis> {
  throw new Error('analyzeSelectedAdWithGemini not implemented in Phase 1 — see Phase 6');
}
