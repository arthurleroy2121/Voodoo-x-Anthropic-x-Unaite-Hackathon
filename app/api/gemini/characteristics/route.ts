import 'server-only';

import { FinishReason, GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AdCharacteristicsRequestSchema,
  AdCharacteristicsResponseSchema,
  AdCharacteristicsResponseSchemaForGemini,
} from '@/lib/api/characteristics';
import { getGeminiKey } from '@/lib/api/env';
import { errorEnvelope } from '@/lib/api/errors';
import { loadPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash';

function buildUserMessage(
  data: ReturnType<typeof AdCharacteristicsRequestSchema.parse>,
): string {
  const { ad, game, geminiAnalysis: a } = data;
  const sceneFlow = a.sceneFlow
    .map((s) => `${s.timestamp} — ${s.description}`)
    .join('\n');
  return [
    `Source ad: "${ad.gameName}" (${ad.network ?? 'unknown network'}, ad ${ad.adId}).`,
    `Target game: ${game.gameName} — category "${game.category}" — tags: ${game.tags.join(', ') || '(none)'}.`,
    '',
    '─── Source analysis ───',
    `Video summary: ${a.videoSummary}`,
    `Opening hook (0–3s): ${a.hook0To3s}`,
    `Opening hook (extended): ${a.openingHook}`,
    `Visual style: ${a.visualStyle}`,
    `Pacing: ${a.pacing}`,
    `Why it works: ${a.whyItWorks}`,
    `CTA: ${a.cta}`,
    '',
    'Scene flow:',
    sceneFlow || '(empty)',
    '',
    `Visual patterns: ${a.visualPatterns.join(' | ') || '(none)'}`,
    `Emotional triggers: ${a.emotionalTriggers.join(' | ') || '(none)'}`,
    `Gameplay mechanics: ${a.gameplayMechanics.join(' | ') || '(none)'}`,
    `Text overlays: ${a.textOverlays.join(' | ') || '(none)'}`,
    '',
    'Now extract 5 to 10 distinct, ad-specific characteristics following the rules and JSON shape from the system prompt.',
  ].join('\n');
}

function dedupeAndCap(
  items: ReturnType<typeof AdCharacteristicsResponseSchema.parse>['characteristics'],
) {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const c of items) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= 10) break;
  }
  return out;
}

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

  const parsed = AdCharacteristicsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      errorEnvelope('VALIDATION', parsed.error.message),
      { status: 422 },
    );
  }

  let systemPrompt: string;
  try {
    systemPrompt = await loadPrompt('ad-characteristics');
  } catch (e) {
    return NextResponse.json(errorEnvelope('INTERNAL', e), { status: 500 });
  }

  const userMessage = buildUserMessage(parsed.data);

  let rawText: string | undefined;
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiKey() });
    const responseSchema = z.toJSONSchema(
      AdCharacteristicsResponseSchemaForGemini,
      { target: 'draft-07', reused: 'inline' },
    );

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
      },
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
    return NextResponse.json(errorEnvelope('UPSTREAM', e), { status: 502 });
  }

  // Defensive: strip optional markdown fencing if Gemini ignores responseMimeType.
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (e) {
    return NextResponse.json(
      errorEnvelope(
        'BAD_RESPONSE',
        `Gemini response was not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
      ),
      { status: 502 },
    );
  }

  const validated = AdCharacteristicsResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    return NextResponse.json(
      errorEnvelope('BAD_RESPONSE', validated.error.message),
      { status: 502 },
    );
  }

  // Dedupe `id` collisions and cap the list at 10 — the schema already enforces
  // a min of 5, so we don't need to pad.
  const cleanList = dedupeAndCap(validated.data.characteristics);
  if (cleanList.length < 5) {
    return NextResponse.json(
      errorEnvelope(
        'BAD_RESPONSE',
        `Gemini returned ${cleanList.length} unique characteristic(s) after dedup — need at least 5.`,
      ),
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { characteristics: cleanList },
  });
}
