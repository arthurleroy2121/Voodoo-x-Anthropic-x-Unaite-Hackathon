import 'server-only';

import { z } from 'zod';

import { AdCharacteristicSchema } from '@/lib/api/characteristics';
import { GameIdentitySchema, MarketAdSchema } from '@/lib/api/schemas';

export const ScenarioPromptSceneSchema = z.object({
  scene_number: z.number().int().min(1),
  duration: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  action: z.string().min(1),
  environment: z.string().min(1),
  camera: z.string().min(1),
  mood: z.string().min(1),
  scenario_prompt: z.string().min(1),
});

export const ScenarioPromptBriefSchema = z.object({
  global_style_prompt: z.string().min(1),
  scenes: z.array(ScenarioPromptSceneSchema).min(3).max(4),
  audio_direction: z.string().min(1),
  text_overlays: z.array(z.string()),
});

const GeminiAnalysisInputSchema = z.object({
  videoSummary: z.string(),
  visualStyle: z.string(),
  pacing: z.string(),
  sceneFlow: z.array(
    z.object({ timestamp: z.string(), description: z.string() }),
  ),
  visualPatterns: z.array(z.string()),
  emotionalTriggers: z.array(z.string()),
  gameplayMechanics: z.array(z.string()).optional(),
  textOverlays: z.array(z.string()).optional(),
});

export const ScenarioPromptRequestSchema = z.object({
  ad: MarketAdSchema,
  game: GameIdentitySchema,
  geminiAnalysis: GeminiAnalysisInputSchema,
  /**
   * The characteristics the user checked in the new checklist UI. The brief
   * is built from the union of these traits — there is no longer a single
   * "selected pattern".
   */
  selectedCharacteristics: z.array(AdCharacteristicSchema).min(1),
});
