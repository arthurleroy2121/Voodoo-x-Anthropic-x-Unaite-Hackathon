// lib/types.ts
// Type definitions verbatim from voodoo-creative-radar-prd.md.
// No runtime — pure types, importable from server and client.

export type GameIdentity = {
  gameId: string;
  gameName: string;
  category: string;
  tags: string[];
};

export type MarketScanConfig = {
  category: string;
  tags: string[];
  numberOfAds: 10 | 20 | 30 | 50;
  timeRange: '7d' | '30d' | '90d';
  // market is hardcoded server-side (DEFAULT_MARKET in lib/sensorTower.ts)
};

export type MarketAd = {
  id: string;
  rank?: number;
  gameName: string;
  adId: string;
  creativeUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  network?: string;
  format?: 'video' | 'image' | 'playable' | 'unknown';
  firstSeen?: string;
  lastSeen?: string;
  market?: string;
  performanceSignal?: number;
  performanceSignalLabel?: string;
  rankingReason?: string;
};

export type MarketScanResult = {
  config: MarketScanConfig;
  ads: MarketAd[];
  topAds: MarketAd[];
  selectedAd?: MarketAd;
};

export type GeminiAdAnalysis = {
  adId: string;
  videoSummary: string;
  openingHook: string;
  hook0To3s: string;
  sceneFlow: { timestamp: string; description: string }[];
  visualPatterns: string[];
  gameplayMechanics: string[];
  emotionalTriggers: string[];
  textOverlays: string[];
  cta: string;
  visualStyle: string;
  pacing: string;
  whyItWorks: string;
  applicabilityToGame: string;
  confidence: number;
};

// ── Ad characteristics (Section 3 — emergent typed traits) ─────────────────
//
// Closed taxonomy of characteristic categories. Kept in sync with the Zod
// enum in `lib/api/characteristics.ts` and the Gemini prompt in
// `prompts/ad-characteristics.md`.
export const AD_CHARACTERISTIC_CATEGORIES = [
  'Visuel',
  'Narratif',
  'Émotionnel',
  'Sonore',
  'Gameplay',
  'Rythme',
  'CTA',
  'Hook',
  'Format',
] as const;

export type AdCharacteristicCategory =
  (typeof AD_CHARACTERISTIC_CATEGORIES)[number];

/**
 * One emergent trait identified by Gemini in a specific ad. Between 5 and 10
 * are returned per analysis. The user multi-selects them via checkboxes; the
 * scenario prompt is built from the union of checked items.
 */
export type AdCharacteristic = {
  /** Stable slug derived from `label` (used as React key + selection id). */
  id: string;
  /** Short noun phrase (~3–8 words) describing the trait. */
  label: string;
  /** Closed-set category — drives grouping in the checklist UI. */
  category: AdCharacteristicCategory;
  /** One-sentence explanation of how the trait manifests in this ad. */
  description: string;
  /** Verbatim quote / timestamp from the source analysis backing the trait. */
  evidence: string;
};

export type CreativeBrief = {
  concept: string;
  openingHook: string;
  sceneFlow30s: { timestamp: string; description: string }[];
  visualDirection: string;
  gameplayReference: string;
  textOverlays: string[];
  cta: string;
  rationale: string;
  sourceEvidence: string;
  adaptationToGame: string;
};

export type ScenarioPrompt = {
  prompt: string;
  durationSec: 15;
  format: 'vertical_mobile_ad';
};

export type ScenarioPromptScene = {
  scene_number: number;
  duration: string;
  title: string;
  subject: string;
  action: string;
  environment: string;
  camera: string;
  mood: string;
  scenario_prompt: string;
};

export type ScenarioPromptBrief = {
  global_style_prompt: string;
  scenes: ScenarioPromptScene[];
  audio_direction: string;
  text_overlays: string[];
};

/**
 * Final 15-second video result from Scenario, generated as a single img2video
 * clip via Seedance 2.0 (`model_bytedance-seedance-2-0`). The model takes a
 * starting frame ("image") AND a finishing frame ("lastFrameImage"), then
 * interpolates the 15s clip between them at 720p with no audio.
 *
 * Note: `brief`, `scenarioPrompt` are intentionally optional because step 3's
 * outputs already live elsewhere in the store; this type now focuses on the
 * video artifact + the ingredients used to generate it.
 */
export type CreativeOutput = {
  brief?: CreativeBrief;
  scenarioPrompt?: ScenarioPrompt;
  /** Picked starting frame id (e.g. "marble-sort/seed-01"). */
  startSeedImageId?: string;
  /** Public URL of the starting frame, persisted alongside its id. */
  startSeedImageUrl?: string;
  /** Picked finishing frame id (e.g. "marble-sort/seed-04"). */
  endSeedImageId?: string;
  /** Public URL of the finishing frame, persisted alongside its id. */
  endSeedImageUrl?: string;
  /** Final 15-second video URL served by Scenario CDN. */
  videoUrl?: string;
  /** Scenario job id for traceability. */
  scenarioJobId?: string;
  totalDurationSec?: 15;
  status: 'idle' | 'generating' | 'complete' | 'error';

  // ── Legacy fields (kept readable for older persisted snapshots) ─────────
  /** @deprecated v2 single-frame pipeline. Use `startSeedImageId` instead. */
  seedImageId?: string;
  /** @deprecated v2 single-frame pipeline. Use `startSeedImageUrl` instead. */
  seedImageUrl?: string;
  /** @deprecated v1 chained pipeline. Use `videoUrl` instead. */
  scenarioVideoUrl?: string;
  /** @deprecated v1 chained pipeline. Use `videoUrl` instead. */
  clipAUrl?: string;
  /** @deprecated v1 chained pipeline. */
  clipBUrl?: string;
  /** @deprecated v1 chained pipeline. */
  lastFrameUrl?: string;
  /** @deprecated v1 chained pipeline. Use `scenarioJobId` instead. */
  jobIds?: { clipA?: string; clipB?: string };
};

export type WorkflowStep = 'game' | 'market' | 'patterns' | 'creative';

// Transient form state for the Game Identity tab. Stored per-project so that
// dropdown selections survive project switches without requiring a "Save" click.
export type GameSetupDraft = {
  gameId?: string;
  scanPeriod?: '7d' | '30d' | '90d';
};

export type ProjectWorkflow = {
  currentStep: WorkflowStep;
  gameSetupDraft?: GameSetupDraft;
  gameIdentity?: GameIdentity;
  marketScanConfig?: MarketScanConfig;
  marketScanResult?: MarketScanResult;
  selectedAd?: MarketAd;
  geminiAnalysis?: GeminiAdAnalysis;
  /** Emergent characteristics returned by `/api/gemini/characteristics`. */
  adCharacteristics?: AdCharacteristic[];
  /** Ids of characteristics the user checked in the checklist. */
  selectedCharacteristicIds?: string[];
  creativeBrief?: CreativeBrief;
  scenarioPrompt?: ScenarioPrompt;
  scenarioPromptBrief?: ScenarioPromptBrief;
  scenarioPromptDraft?: string;
  /** Picked starting frame id (e.g. "marble-sort/seed-01") — feeds Seedance 2.0 `image` field. */
  startSeedImageId?: string;
  /** Public URL of the starting frame, persisted alongside its id. */
  startSeedImageUrl?: string;
  /** Picked finishing frame id (e.g. "marble-sort/seed-04") — feeds Seedance 2.0 `lastFrameImage` field. */
  endSeedImageId?: string;
  /** Public URL of the finishing frame, persisted alongside its id. */
  endSeedImageUrl?: string;
  creativeOutput?: CreativeOutput;
};

export type Project = {
  id: string;
  name: string;
  workflow: ProjectWorkflow;
};

export type AppState = {
  currentStep: WorkflowStep;
  projects?: Project[];
  currentProjectId?: string;
  gameSetupDraft?: GameSetupDraft;
  gameIdentity?: GameIdentity;
  marketScanConfig?: MarketScanConfig;
  marketScanResult?: MarketScanResult;
  selectedAd?: MarketAd;
  geminiAnalysis?: GeminiAdAnalysis;
  adCharacteristics?: AdCharacteristic[];
  selectedCharacteristicIds?: string[];
  creativeBrief?: CreativeBrief;
  scenarioPrompt?: ScenarioPrompt;
  scenarioPromptBrief?: ScenarioPromptBrief;
  scenarioPromptDraft?: string;
  startSeedImageId?: string;
  startSeedImageUrl?: string;
  endSeedImageId?: string;
  endSeedImageUrl?: string;
  creativeOutput?: CreativeOutput;
};
