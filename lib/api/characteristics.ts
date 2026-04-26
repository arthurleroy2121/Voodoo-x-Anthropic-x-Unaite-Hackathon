import 'server-only';

import { z } from 'zod';

import { GameIdentitySchema, MarketAdSchema } from '@/lib/api/schemas';

// Closed taxonomy — must mirror `AD_CHARACTERISTIC_CATEGORIES` in lib/types.ts.
// Re-declared here as a Zod enum so this module stays free of runtime cycles
// (lib/types.ts is a pure-types module, importable by client and server, and
// we only need the literal list anyway).
export const AdCharacteristicCategoryEnum = z.enum([
  'Visuel',
  'Narratif',
  'Émotionnel',
  'Sonore',
  'Gameplay',
  'Rythme',
  'CTA',
  'Hook',
  'Format',
]);

export const AdCharacteristicSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'id must be a lowercase slug (a-z, 0-9, -)'),
  label: z.string().min(2).max(120),
  category: AdCharacteristicCategoryEnum,
  description: z.string().min(8).max(400),
  evidence: z.string().min(2).max(400),
});

export const AdCharacteristicsResponseSchema = z.object({
  characteristics: z.array(AdCharacteristicSchema).min(5).max(10),
});

// Same shape Gemini sees as `responseJsonSchema`. We accept the same arrays
// to keep the contract simple — the route handler enforces uniqueness on `id`.
export const AdCharacteristicsResponseSchemaForGemini =
  AdCharacteristicsResponseSchema;

const GeminiAnalysisInputSchema = z.object({
  videoSummary: z.string(),
  openingHook: z.string(),
  hook0To3s: z.string(),
  visualStyle: z.string(),
  pacing: z.string(),
  whyItWorks: z.string(),
  cta: z.string(),
  sceneFlow: z.array(
    z.object({ timestamp: z.string(), description: z.string() }),
  ),
  visualPatterns: z.array(z.string()),
  emotionalTriggers: z.array(z.string()),
  gameplayMechanics: z.array(z.string()),
  textOverlays: z.array(z.string()),
});

export const AdCharacteristicsRequestSchema = z.object({
  ad: MarketAdSchema,
  game: GameIdentitySchema,
  geminiAnalysis: GeminiAnalysisInputSchema,
});
