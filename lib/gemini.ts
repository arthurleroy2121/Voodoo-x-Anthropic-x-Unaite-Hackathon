// Client-side wrapper for the Gemini analysis route. The route handler at
// app/api/gemini/analyze/route.ts owns the secret and the Files API flow.

import type { GameIdentity, GeminiAdAnalysis, MarketAd } from '@/lib/types';

export async function analyzeSelectedAdWithGemini(
  ad: MarketAd,
  game: GameIdentity,
): Promise<GeminiAdAnalysis> {
  if (!ad.videoUrl) {
    throw new Error('selectedAd.videoUrl is required for Gemini analysis');
  }
  const res = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ad, game }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Gemini analysis failed: HTTP ${res.status}`);
  }
  if (
    !res.ok ||
    !json ||
    typeof json !== 'object' ||
    !('ok' in json) ||
    !(json as { ok: unknown }).ok
  ) {
    const msg =
      json && typeof json === 'object' && 'message' in json
        ? String((json as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json as unknown as { data: GeminiAdAnalysis }).data;
}
