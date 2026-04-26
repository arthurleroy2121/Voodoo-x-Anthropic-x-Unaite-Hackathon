// Client-side wrapper for the Gemini ad-characteristics route. The handler at
// app/api/gemini/characteristics/route.ts owns the secret.

import type {
  AdCharacteristic,
  GameIdentity,
  GeminiAdAnalysis,
  MarketAd,
} from '@/lib/types';

export async function extractAdCharacteristics(
  ad: MarketAd,
  game: GameIdentity,
  analysis: GeminiAdAnalysis,
): Promise<AdCharacteristic[]> {
  const res = await fetch('/api/gemini/characteristics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ad,
      game,
      geminiAnalysis: {
        videoSummary: analysis.videoSummary,
        openingHook: analysis.openingHook,
        hook0To3s: analysis.hook0To3s,
        visualStyle: analysis.visualStyle,
        pacing: analysis.pacing,
        whyItWorks: analysis.whyItWorks,
        cta: analysis.cta,
        sceneFlow: analysis.sceneFlow,
        visualPatterns: analysis.visualPatterns,
        emotionalTriggers: analysis.emotionalTriggers,
        gameplayMechanics: analysis.gameplayMechanics,
        textOverlays: analysis.textOverlays,
      },
    }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Characteristics extraction failed: HTTP ${res.status}`);
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
  return (json as unknown as { data: { characteristics: AdCharacteristic[] } })
    .data.characteristics;
}
