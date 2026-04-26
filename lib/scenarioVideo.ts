// lib/scenarioVideo.ts
// Client-side wrapper for the `/api/scenario/generate` route.
//
// Phase 9 v3 (Seedance 2.0) — both `startImageUrl` and `endImageUrl` are now
// required on the wire. The server reads each /public/seed-images/... path,
// base64-encodes them, and forwards to `model_bytedance-seedance-2-0` as
// `image` + `lastFrameImage`.

import type { ScenarioGenerateData } from '@/lib/api/scenarioVideo';

export interface GenerateScenarioVideoArgs {
  prompt: string;
  startImageUrl: string;
  endImageUrl: string;
  gameId: string;
}

/**
 * Kicks off the 15-second img2video generation on the server and resolves with
 * the video URL once the Scenario (Seedance 2.0) job has completed (or rejects
 * with a descriptive error). Expect ~2-4 minutes end-to-end.
 */
export async function generateScenarioVideo(
  args: GenerateScenarioVideoArgs,
): Promise<ScenarioGenerateData> {
  const res = await fetch('/api/scenario/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Scenario video generation failed: HTTP ${res.status}`);
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

  return (json as unknown as { data: ScenarioGenerateData }).data;
}
