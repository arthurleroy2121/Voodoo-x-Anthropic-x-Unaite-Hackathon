import 'server-only';

import { FinishReason, GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getGeminiKey } from '@/lib/api/env';
import { errorEnvelope } from '@/lib/api/errors';
import {
  ScenarioPromptBriefSchema,
  ScenarioPromptRequestSchema,
} from '@/lib/api/scenarioPrompt';
import { loadPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash';

function buildUserMessage(
  data: ReturnType<typeof ScenarioPromptRequestSchema.parse>,
): string {
  const { ad, game, geminiAnalysis, selectedCharacteristics } = data;
  const sceneFlow = geminiAnalysis.sceneFlow
    .map((s) => `${s.timestamp} — ${s.description}`)
    .join('\n');
  const emotionalTriggers = geminiAnalysis.emotionalTriggers.join(', ');
  const visualPatterns = geminiAnalysis.visualPatterns.join(', ');

  const characteristicsBlock = selectedCharacteristics
    .map(
      (c, i) =>
        `${i + 1}. [${c.category}] ${c.label}\n   Description : ${c.description}\n   Evidence : ${c.evidence}`,
    )
    .join('\n');

  return [
    "Voici l'analyse de la publicité concurrente et les caractéristiques que l'utilisateur a sélectionnées pour son adaptation :",
    '',
    `Jeu source analysé : ${ad.gameName}`,
    `Jeu cible (Vodou) : ${game.gameName}`,
    `Catégorie : ${game.category}`,
    '',
    `Style visuel source : ${geminiAnalysis.visualStyle}`,
    `Pacing : ${geminiAnalysis.pacing}`,
    'Structure des scènes :',
    sceneFlow,
    '',
    `Caractéristiques sélectionnées par l'utilisateur (${selectedCharacteristics.length}) — combine-les toutes dans le brief :`,
    characteristicsBlock,
    '',
    `Déclencheurs émotionnels : ${emotionalTriggers}`,
    `Patterns visuels récurrents : ${visualPatterns}`,
    '',
    `Génère le brief Scenario complet pour adapter cette combinaison de caractéristiques au jeu ${game.gameName}.`,
  ].join('\n');
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

  const parsed = ScenarioPromptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      errorEnvelope('VALIDATION', parsed.error.message),
      { status: 422 },
    );
  }

  let systemPrompt: string;
  try {
    systemPrompt = await loadPrompt('scenario-prompt-generator');
  } catch (e) {
    return NextResponse.json(errorEnvelope('INTERNAL', e), { status: 500 });
  }

  const userMessage = buildUserMessage(parsed.data);

  let rawText: string | undefined;
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiKey() });
    const responseSchema = z.toJSONSchema(ScenarioPromptBriefSchema, {
      target: 'draft-07',
      reused: 'inline',
    });

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

  const validated = ScenarioPromptBriefSchema.safeParse(parsedJson);
  if (!validated.success) {
    return NextResponse.json(
      errorEnvelope('BAD_RESPONSE', validated.error.message),
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, data: validated.data });
}
