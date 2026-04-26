// Client-side wrapper for the Gemini scenario-prompt route. The route handler
// at app/api/gemini/scenario-prompt/route.ts owns the secret.

import type {
  AdCharacteristic,
  GameIdentity,
  GeminiAdAnalysis,
  MarketAd,
  ScenarioPromptBrief,
} from '@/lib/types';

export async function generateScenarioPrompt(
  ad: MarketAd,
  game: GameIdentity,
  geminiAnalysis: GeminiAdAnalysis,
  selectedCharacteristics: AdCharacteristic[],
): Promise<ScenarioPromptBrief> {
  const res = await fetch('/api/gemini/scenario-prompt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ad,
      game,
      geminiAnalysis: {
        videoSummary: geminiAnalysis.videoSummary,
        visualStyle: geminiAnalysis.visualStyle,
        pacing: geminiAnalysis.pacing,
        sceneFlow: geminiAnalysis.sceneFlow,
        visualPatterns: geminiAnalysis.visualPatterns,
        emotionalTriggers: geminiAnalysis.emotionalTriggers,
        gameplayMechanics: geminiAnalysis.gameplayMechanics,
        textOverlays: geminiAnalysis.textOverlays,
      },
      selectedCharacteristics,
    }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Scenario prompt generation failed: HTTP ${res.status}`);
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
  return (json as unknown as { data: ScenarioPromptBrief }).data;
}

export function concatenateScenarioBrief(
  brief: ScenarioPromptBrief,
  scenePromptOverrides?: Record<number, string>,
): string {
  const parts: string[] = [];
  parts.push(brief.global_style_prompt.trim());
  for (const scene of brief.scenes) {
    const prompt =
      scenePromptOverrides?.[scene.scene_number] ?? scene.scenario_prompt;
    parts.push(
      `--- SCENE ${scene.scene_number}: ${scene.title} (${scene.duration}) ---\n${prompt.trim()}`,
    );
  }
  parts.push(`AUDIO: ${brief.audio_direction}`);
  parts.push(
    `TEXT OVERLAYS: ${brief.text_overlays.length ? brief.text_overlays.join(' | ') : '(none)'}`,
  );
  return parts.join('\n\n');
}
