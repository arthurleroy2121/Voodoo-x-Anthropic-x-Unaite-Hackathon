import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { errorEnvelope } from '@/lib/api/errors';
import { ScenarioGenerateRequestSchema } from '@/lib/api/scenarioVideo';
import { generateScenarioVideo } from '@/lib/scenario';

// Long-running orchestration (Scenario job + polling).
// Vercel Pro plans cap server functions at 300s; we leave 20s of headroom
// inside the polling loop (POLL_TIMEOUT_MS = 280_000).
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      errorEnvelope('VALIDATION', 'Invalid JSON body'),
      { status: 422 },
    );
  }

  const parsed = ScenarioGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      errorEnvelope('VALIDATION', parsed.error.message),
      { status: 422 },
    );
  }

  try {
    const result = await generateScenarioVideo(
      parsed.data.prompt,
      parsed.data.startImageUrl,
      parsed.data.endImageUrl,
    );

    return NextResponse.json({
      ok: true,
      data: {
        videoUrl: result.videoUrl,
        jobId: result.jobId,
        durationSec: result.durationSec,
      },
    });
  } catch (e) {
    // Best-effort: clean error envelope rather than a 500. Also log to dev
    // console so the underlying Scenario error (status, body) is visible.
    const message = e instanceof Error ? e.message : String(e);
    console.error('[scenario/generate] failed:', message);
    return NextResponse.json(errorEnvelope('UPSTREAM', e), { status: 502 });
  }
}
