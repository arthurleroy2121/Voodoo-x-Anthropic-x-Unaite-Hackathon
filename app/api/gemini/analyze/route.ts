import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import {
  createPartFromUri,
  FileState,
  FinishReason,
  GoogleGenAI,
  type Part,
} from '@google/genai';
import { z } from 'zod';

import { getGeminiKey } from '@/lib/api/env';
import { errorEnvelope } from '@/lib/api/errors';
import {
  GeminiAdAnalysisResponseSchema,
  GeminiAdAnalysisSchema,
  GeminiAnalyzeRequestSchema,
} from '@/lib/api/schemas';
import { loadPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 240_000;

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

async function pollUntilActive(
  ai: GoogleGenAI,
  fileName: string,
  timeoutMs: number,
): Promise<{ uri: string; mimeType: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const file = await ai.files.get({ name: fileName });
    if (file.state === FileState.ACTIVE && file.uri && file.mimeType) {
      return { uri: file.uri, mimeType: file.mimeType };
    }
    if (file.state === FileState.FAILED) {
      throw new Error(
        `Gemini file processing failed: ${file.error?.message ?? 'unknown error'}`,
      );
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Gemini file did not become ACTIVE within timeout');
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const log = (stage: string, extra?: Record<string, unknown>) => {
    const ms = Date.now() - t0;
    console.log(
      `[gemini/analyze] +${ms}ms ${stage}${extra ? ' ' + JSON.stringify(extra) : ''}`,
    );
  };

  // 1. Validate request body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      errorEnvelope('VALIDATION', 'Invalid JSON body'),
      { status: 422 },
    );
  }
  const parsed = GeminiAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      errorEnvelope('VALIDATION', parsed.error.message),
      { status: 422 },
    );
  }
  const { ad, game } = parsed.data;
  log('request validated', {
    model: MODEL,
    adId: ad.adId,
    videoUrl: ad.videoUrl,
  });

  // 2. Build the video Part — YouTube native vs Files API upload.
  const ai = new GoogleGenAI({ apiKey: getGeminiKey() });
  let videoPart: Part;
  try {
    if (isYouTubeUrl(ad.videoUrl)) {
      log('using YouTube native part');
      videoPart = createPartFromUri(ad.videoUrl, 'video/mp4');
    } else {
      log('fetching video URL');
      const res = await fetch(ad.videoUrl);
      if (!res.ok) {
        log('video fetch failed', { status: res.status });
        return NextResponse.json(
          errorEnvelope(
            'UPSTREAM',
            `videoUrl fetch failed: ${res.status} ${res.statusText}`,
          ),
          { status: 502 },
        );
      }
      const blob = await res.blob();
      const inferredMime = blob.type || 'video/mp4';
      log('video fetched', { sizeBytes: blob.size, mimeType: inferredMime });
      log('uploading to Gemini Files API');
      const uploaded = await ai.files.upload({
        file: blob,
        config: { mimeType: inferredMime },
      });
      log('upload complete', { name: uploaded.name, state: uploaded.state });
      if (!uploaded.name) {
        return NextResponse.json(
          errorEnvelope('UPSTREAM', 'Gemini upload returned no file name'),
          { status: 502 },
        );
      }
      log('polling until ACTIVE');
      const active = await pollUntilActive(ai, uploaded.name, POLL_TIMEOUT_MS);
      log('file ACTIVE', { uri: active.uri, mimeType: active.mimeType });
      videoPart = createPartFromUri(active.uri, active.mimeType);
    }
  } catch (e) {
    console.error('[gemini/analyze] video preparation failed', e);
    return NextResponse.json(errorEnvelope('UPSTREAM', e), { status: 502 });
  }

  // 3. Generate structured analysis.
  let rawText: string | undefined;
  try {
    const prompt = await loadPrompt('gemini-video-analysis');
    const userMsg =
      `Target game: ${game.gameName} — category "${game.category}" — tags: ${game.tags.join(', ') || '(none)'}.\n` +
      `Ad metadata: source advertiser "${ad.gameName}", adId "${ad.adId}".`;

    const responseSchema = z.toJSONSchema(GeminiAdAnalysisResponseSchema, {
      target: 'draft-07',
      reused: 'inline',
    });

    log('calling generateContent', { model: MODEL });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [videoPart, { text: `${prompt}\n\n${userMsg}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
      },
    });
    log('generateContent returned', {
      finishReason: result.candidates?.[0]?.finishReason,
      hasText: Boolean(result.text),
    });

    const finishReason = result.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== FinishReason.STOP) {
      return NextResponse.json(
        errorEnvelope('BAD_RESPONSE', `Gemini finishReason=${finishReason}`),
        { status: 502 },
      );
    }
    rawText = result.text;
    if (!rawText) {
      return NextResponse.json(
        errorEnvelope('BAD_RESPONSE', 'Gemini returned empty response text'),
        { status: 502 },
      );
    }
  } catch (e) {
    console.error('[gemini/analyze] generateContent failed', e);
    return NextResponse.json(errorEnvelope('UPSTREAM', e), { status: 502 });
  }

  // 4. Parse + boundary validation.
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (e) {
    return NextResponse.json(
      errorEnvelope('BAD_RESPONSE', `Gemini response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`),
      { status: 502 },
    );
  }

  const merged =
    parsedJson && typeof parsedJson === 'object'
      ? { ...(parsedJson as Record<string, unknown>), adId: ad.adId }
      : { adId: ad.adId };
  const validated = GeminiAdAnalysisSchema.safeParse(merged);
  if (!validated.success) {
    return NextResponse.json(
      errorEnvelope('BAD_RESPONSE', validated.error.message),
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, data: validated.data });
}
