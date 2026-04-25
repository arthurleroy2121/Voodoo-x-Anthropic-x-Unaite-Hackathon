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
  market: 'US' | 'France' | 'UK' | 'Global';
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

export type CreativePattern = {
  id: string;
  rank: number;
  name: string;
  score: number;
  frequencyScore: number;
  gameFitScore: number;
  freshnessScore: number;
  creativeActionabilityScore: number;
  explanation: string;
  evidence: string;
  adaptationToGame: string;
  confidence: number;
};

export type PatternAnalysisResult = {
  selectedAd: MarketAd;
  geminiAnalysis: GeminiAdAnalysis;
  topPatterns: CreativePattern[];
  selectedPattern?: CreativePattern;
};

export type CreativeBrief = {
  concept: string;
  selectedPattern: string;
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
  durationSec: 30;
  format: 'vertical_mobile_ad';
};

export type CreativeOutput = {
  selectedPattern: CreativePattern;
  brief: CreativeBrief;
  scenarioPrompt: ScenarioPrompt;
  scenarioVideoUrl?: string;
  status: 'idle' | 'generating' | 'complete' | 'error';
};

export type AppState = {
  currentStep: 'game' | 'market' | 'patterns' | 'creative';
  gameIdentity?: GameIdentity;
  marketScanConfig?: MarketScanConfig;
  marketScanResult?: MarketScanResult;
  selectedAd?: MarketAd;
  geminiAnalysis?: GeminiAdAnalysis;
  topPatterns?: CreativePattern[];
  selectedPattern?: CreativePattern;
  creativeBrief?: CreativeBrief;
  scenarioPrompt?: ScenarioPrompt;
  creativeOutput?: CreativeOutput;
};
