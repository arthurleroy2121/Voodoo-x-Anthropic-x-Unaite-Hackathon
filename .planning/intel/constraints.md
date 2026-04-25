# Constraints Intel

> Synthesized from classified SPECs. Technical contracts, schemas, and non-functional requirements.
> No SPEC document was ingested. The constraints below are surfaced from the PRD (precedence 2). They are honored as binding contracts; any later SPEC may refine them, and any ADR overrides them.

## SPEC Inventory

(None — no SPEC documents in classification set.)

## API & Service Contracts (from PRD)

### Contract: lib/sensorTower.ts
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 2 — service definition)
- Type: api-contract
- Content:
  ```ts
  async function fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult>
  ```
  - Live Sensor Tower call. Returns full ad set + computed `topAds` (top 3) + optional `selectedAd`.
  - Must surface every available field per ad: id, gameName, adId, creativeUrl, videoUrl, imageUrl, thumbnailUrl, network, format (`video | image | playable | unknown`), firstSeen, lastSeen, market, performanceSignal, performanceSignalLabel, rankingReason.
  - Ranking input order: share of voice → impressions → spend estimate → recency → internal metadata score.
  - No silent fake-data fallback in live mode. Dev mocks gated by `NEXT_PUBLIC_USE_DEV_MOCKS=true`.

### Contract: lib/gemini.ts
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3 — service definition)
- Type: api-contract
- Content:
  ```ts
  async function analyzeSelectedAdWithGemini(
    ad: MarketAd,
    game: GameIdentity
  ): Promise<GeminiAdAnalysis>
  ```
  - Inputs: full video URL of selected ad + ad metadata + game category + game tags.
  - Default behavior: full-video analysis. Frame extraction only when technically required.
  - Output: `GeminiAdAnalysis` (videoSummary, openingHook, hook0To3s, sceneFlow[], visualPatterns[], gameplayMechanics[], emotionalTriggers[], textOverlays[], cta, visualStyle, pacing, whyItWorks, applicabilityToGame, confidence).

### Contract: lib/scoring.ts
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3 — pattern extraction)
- Type: api-contract
- Content:
  ```ts
  function generateTopPatterns(
    analysis: GeminiAdAnalysis,
    ad: MarketAd,
    game: GameIdentity
  ): CreativePattern[]
  ```
  - Returns exactly 3 patterns.
  - Scoring formula:
    `Pattern Score = 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability`
  - Frequency = pattern presence in selected ad + Sensor Tower signals.
  - Game Fit = compatibility with selected game's category + tags.
  - Freshness = recency from first/last seen.
  - Creative Actionability = ease of converting pattern into Scenario prompt + 30s video.

### Contract: lib/scenario.ts
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 4 — service definitions)
- Type: api-contract
- Content:
  ```ts
  function buildScenarioPrompt(
    brief: CreativeBrief,
    game: GameIdentity,
    pattern: CreativePattern
  ): ScenarioPrompt

  async function generateScenarioAd(prompt: ScenarioPrompt): Promise<CreativeOutput>
  ```
  - Scenario prompt must include: 30s duration, vertical mobile ad format, game category, game tags, selected pattern, scene-by-scene flow, visual style, text overlays, CTA, rationale.
  - Output is one 30-second vertical mobile ad video.

## Schemas (from PRD)

### Schema: GameIdentity
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 1)
- Type: schema
- Content:
  ```ts
  type GameIdentity = {
    gameId: string
    gameName: string
    category: string
    tags: string[]
  }
  ```

### Schema: MarketScanConfig
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 2)
- Type: schema
- Content:
  ```ts
  type MarketScanConfig = {
    category: string
    tags: string[]
    numberOfAds: 10 | 20 | 30 | 50
    timeRange: "30d" | "60d" | "90d"
    market: "US" | "France" | "UK" | "Global"
  }
  ```

### Schema: MarketAd / MarketScanResult
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 2)
- Type: schema
- Content:
  ```ts
  type MarketAd = {
    id: string
    rank?: number
    gameName: string
    adId: string
    creativeUrl?: string
    videoUrl?: string
    imageUrl?: string
    thumbnailUrl?: string
    network?: string
    format?: "video" | "image" | "playable" | "unknown"
    firstSeen?: string
    lastSeen?: string
    market?: string
    performanceSignal?: number
    performanceSignalLabel?: string
    rankingReason?: string
  }

  type MarketScanResult = {
    config: MarketScanConfig
    ads: MarketAd[]
    topAds: MarketAd[]
    selectedAd?: MarketAd
  }
  ```

### Schema: GeminiAdAnalysis
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3)
- Type: schema
- Content:
  ```ts
  type GeminiAdAnalysis = {
    adId: string
    videoSummary: string
    openingHook: string
    hook0To3s: string
    sceneFlow: { timestamp: string; description: string }[]
    visualPatterns: string[]
    gameplayMechanics: string[]
    emotionalTriggers: string[]
    textOverlays: string[]
    cta: string
    visualStyle: string
    pacing: string
    whyItWorks: string
    applicabilityToGame: string
    confidence: number
  }
  ```

### Schema: CreativePattern / PatternAnalysisResult
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3)
- Type: schema
- Content:
  ```ts
  type CreativePattern = {
    id: string
    rank: number
    name: string
    score: number
    frequencyScore: number
    gameFitScore: number
    freshnessScore: number
    creativeActionabilityScore: number
    explanation: string
    evidence: string
    adaptationToGame: string
    confidence: number
  }

  type PatternAnalysisResult = {
    selectedAd: MarketAd
    geminiAnalysis: GeminiAdAnalysis
    topPatterns: CreativePattern[]
    selectedPattern?: CreativePattern
  }
  ```

### Schema: CreativeBrief / ScenarioPrompt / CreativeOutput
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 4)
- Type: schema
- Content:
  ```ts
  type CreativeBrief = {
    concept: string
    selectedPattern: string
    openingHook: string
    sceneFlow30s: { timestamp: string; description: string }[]
    visualDirection: string
    gameplayReference: string
    textOverlays: string[]
    cta: string
    rationale: string
    sourceEvidence: string
    adaptationToGame: string
  }

  type ScenarioPrompt = {
    prompt: string
    durationSec: 30
    format: "vertical_mobile_ad"
  }

  type CreativeOutput = {
    selectedPattern: CreativePattern
    brief: CreativeBrief
    scenarioPrompt: ScenarioPrompt
    scenarioVideoUrl?: string
    status: "idle" | "generating" | "complete" | "error"
  }
  ```

### Schema: AppState (frontend global)
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (GLOBAL STATE)
- Type: schema
- Content:
  ```ts
  type AppState = {
    currentStep: "game" | "market" | "patterns" | "creative"
    gameIdentity?: GameIdentity
    marketScanConfig?: MarketScanConfig
    marketScanResult?: MarketScanResult
    selectedAd?: MarketAd
    geminiAnalysis?: GeminiAdAnalysis
    topPatterns?: CreativePattern[]
    selectedPattern?: CreativePattern
    creativeBrief?: CreativeBrief
    scenarioPrompt?: ScenarioPrompt
    creativeOutput?: CreativeOutput
  }
  ```

## Non-functional Requirements (from PRD)

### NFR: Stack and deploy target
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header)
- Type: nfr
- Content: Next.js (App Router) · TypeScript · React · Tailwind CSS. Deploy target: Vercel. No alternative stack or hosting target permitted.

### NFR: No database, frontend state only
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (GLOBAL STATE)
- Type: nfr
- Content: No backend database. State is held entirely in the frontend; localStorage is optional and lightweight.

### NFR: Live data integrity for Sensor Tower
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 2 — CRITICAL)
- Type: nfr
- Content: In live mode, market ad data must come from Sensor Tower. No silent fallback to fake data. Dev mocks live in `data/devMockAds.ts` and are gated behind `NEXT_PUBLIC_USE_DEV_MOCKS=true` and never labeled as real.

### NFR: Loading-text fidelity
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (ERROR HANDLING RULES)
- Type: nfr
- Content: Loading texts must appear verbatim:
  - `Running Sensor Tower scan...`
  - `Analyzing selected ad with Gemini...`
  - `Generating creative brief...`
  - `Generating 30-second ad with Scenario...`

### NFR: Error handling rules per API
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (ERROR HANDLING RULES)
- Type: nfr
- Content:
  - Sensor Tower failure → clear error message; stay on Market Scan tab; retry button; no silent fake-data replacement.
  - Gemini failure → error state in Pattern Analysis; retry button; preserve selected ad.
  - Scenario failure → keep brief + prompt visible; show generation error; retry button.

### NFR: UI design rules
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (UI DESIGN RULES)
- Type: nfr
- Content:
  - Do: white/off-white backgrounds; soft grey sections; black or charcoal typography; one strong accent color; rounded cards + subtle shadows; clean spacing + large visual previews; minimal premium motion.
  - Don't: dark mode dominant; cyberpunk aesthetic; overloaded dashboard; raw JSON visible anywhere; childish or generic SaaS look; unnecessary animations.

### NFR: Final output specification
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header + STEP 4 + MVP DEFINITION)
- Type: nfr
- Content: A single 30-second vertical mobile ad video, generated via Scenario, with format `vertical_mobile_ad` and `durationSec: 30`.

### NFR: Secret management
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (ENV VARIABLES)
- Type: nfr
- Content: API keys live in `.env.local`. `.env.local.example` ships in repo with empty values. `.env*` is git-ignored. No secrets in source.

### NFR: MVP scope discipline
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (INSTRUCTIONS FOR CLAUDE CODE)
- Type: nfr
- Content: "Do not add features outside this PRD. Do not feature creep. Quality over completeness."

## Protocols (from PRD)

### Protocol: Phase-by-phase delivery
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (INSTRUCTIONS FOR CLAUDE CODE + PHASES)
- Type: protocol
- Content: For each of the 10 phases — Discuss the implementation → list files to create/modify → implement → verify locally → fix issues → only move to the next phase after validation.

---
*Synthesized 2026-04-25 from 1 PRD document. No SPECs ingested. 4 service contracts, 8 schemas, 9 NFRs, 1 protocol surfaced.*
