import 'server-only';

import { z } from 'zod';

// Mirror of GameIdentity from lib/types.ts. Kept here as Zod for body validation.
export const GameIdentitySchema = z.object({
  gameId: z.string().min(1),
  gameName: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).max(50),
});

// Mirror of MarketAd. videoUrl is REQUIRED for Gemini analysis (the client
// guards on it before calling the route, but we re-check at the boundary).
export const MarketAdSchema = z.object({
  id: z.string().min(1),
  rank: z.number().int().optional(),
  gameName: z.string().min(1),
  adId: z.string().min(1),
  creativeUrl: z.string().url().optional(),
  videoUrl: z.string().url(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  network: z.string().optional(),
  format: z.enum(['video', 'image', 'playable', 'unknown']).optional(),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  market: z.string().optional(),
  performanceSignal: z.number().optional(),
  performanceSignalLabel: z.string().optional(),
  rankingReason: z.string().optional(),
});

export const GeminiAnalyzeRequestSchema = z.object({
  ad: MarketAdSchema,
  game: GameIdentitySchema,
});

// Mirror of GeminiAdAnalysis (lib/types.ts). Used both as the response schema
// passed to Gemini (`responseJsonSchema`) AND as the boundary validator for
// the JSON Gemini returns.
//
// `adId` is filled by the server from the request — we strip it from the
// schema we send to Gemini (see route handler). This Zod schema represents
// the FINAL shape after the server merges adId back in.
export const SceneFlowEntrySchema = z.object({
  timestamp: z.string().min(1),
  description: z.string().min(1),
});

export const GeminiAdAnalysisSchema = z.object({
  adId: z.string().min(1),
  videoSummary: z.string().min(1),
  openingHook: z.string().min(1),
  hook0To3s: z.string().min(1),
  sceneFlow: z.array(SceneFlowEntrySchema).min(1),
  visualPatterns: z.array(z.string()).min(1),
  gameplayMechanics: z.array(z.string()).min(1),
  emotionalTriggers: z.array(z.string()).min(1),
  textOverlays: z.array(z.string()),
  cta: z.string().min(1),
  visualStyle: z.string().min(1),
  pacing: z.string().min(1),
  whyItWorks: z.string().min(1),
  applicabilityToGame: z.string().min(1),
  confidence: z.number().min(0).max(100),
});

// Schema sent to Gemini's `responseJsonSchema` — same as the analysis schema
// without `adId` (server fills adId from request after validation).
export const GeminiAdAnalysisResponseSchema = GeminiAdAnalysisSchema.omit({
  adId: true,
});
