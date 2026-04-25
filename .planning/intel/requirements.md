# Requirements Intel

> Synthesized from classified PRDs. Each requirement traces to its source document.
> Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (single PRD, precedence 2, not locked)

## Pages

### REQ-landing-page
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (PAGES — `/`)
- Description: Public landing page at `/` introducing the product, the 4-step workflow, with a CTA that routes to `/project`.
- Acceptance criteria:
  - Title `Voodoo Creative Radar` visible
  - Tagline `From Market Signals to Testable Creatives` visible
  - Description paragraph rendered as specified by PRD
  - 4 workflow cards labeled `1. Select a game` / `2. Scan the market` / `3. Analyze winning patterns` / `4. Generate a creative`
  - CTA button `Get Started` navigates to `/project`
  - Premium light UI (white/off-white background, charcoal typography, single accent, rounded cards, subtle shadows; no dark mode; no raw JSON)
- Scope: page `/`

### REQ-project-page
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (PAGES — `/project`)
- Description: Project page at `/project` with header, 4 workflow tabs, and left sidebar.
- Acceptance criteria:
  - Header reads `Demo Project — Voodoo Creative Radar`
  - 4 tabs in order: `1. Game Identity`, `2. Market Scan`, `3. Pattern Analysis`, `4. Creative Output`
  - User can navigate between tabs manually; expected flow is sequential
  - Left sidebar shows `Voodoo Creative Radar`, `Projects` group, `• Demo Project`, and `+ New Project` (visible but not functional for MVP)
- Scope: page `/project`

## Workflow Steps

### REQ-step1-game-identity
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 1 — GAME IDENTITY + ACCEPTANCE CRITERIA)
- Description: User selects a Voodoo game; the app auto-fills category + tags; both fields are editable.
- Acceptance criteria:
  - Game selector dropdown lists exactly 2 games: `Marble Sort` (Puzzle), `Control Mob` (Battle), with the tag arrays defined in the PRD
  - Selecting a game auto-fills the Category and Tags fields
  - Category and Tags are editable
  - Action buttons: `Save Game Identity`, `Continue to Market Scan`
  - Output conforms to `GameIdentity` type defined in PRD
- Scope: workflow step 1

### REQ-step2-market-scan
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 2 — MARKET SCAN + ACCEPTANCE CRITERIA)
- Description: Live Sensor Tower scan based on category + tags; user picks one ad from the top 3.
- Acceptance criteria:
  - 3 config dropdowns: Number of ads (`10 / 20 / 30 / 50`), Time range (`Last 30 days / Last 60 days / Last 90 days`), Market (`US / France / UK / Global`)
  - Service `lib/sensorTower.ts` exposes `fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult>`
  - Sensor Tower is called live; no silent fallback to fake data in live mode
  - Dev mocks gated by `NEXT_PUBLIC_USE_DEV_MOCKS=true`, sourced from `data/devMockAds.ts`, never labeled as real Sensor Tower data
  - Ranking applies the listed signals in order: share of voice → impressions → spend estimate → recency → internal metadata score
  - KPI cards rendered: Ads retrieved, Competitor games found, Networks detected, Market, Time range
  - Top 3 ad cards display: rank, thumbnail, game name, ad ID, network, format, performance signal, first/last seen, ranking reason, `Select this ad` button
  - Optional full ads grid below the top 3
  - Loading text exactly `Running Sensor Tower scan...`
  - Error state shows clear message + retry, no silent fake data substitution
  - Output conforms to `MarketAd` and `MarketScanResult` types
- Scope: workflow step 2

### REQ-step3-pattern-analysis
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3 — PATTERN ANALYSIS + ACCEPTANCE CRITERIA)
- Description: Gemini analyzes the selected ad's full video; the UI shows a non-JSON breakdown; exactly 3 scored patterns are extracted; user selects one.
- Acceptance criteria:
  - Service `lib/gemini.ts` exposes `analyzeSelectedAdWithGemini(ad: MarketAd, game: GameIdentity): Promise<GeminiAdAnalysis>`
  - Gemini receives the full video plus ad metadata, game category, and game tags
  - Frame extraction only if technically required; target is full-video analysis
  - UI sections rendered (no raw JSON): Selected Ad Preview, Video Summary, Opening Hook, 0–3s Hook, Scene Flow, Visual Patterns, Gameplay Mechanics, Emotional Triggers, Text Overlays, CTA, Visual Style, Pacing, Why It Works, Applicability to Selected Game, Confidence
  - Pattern extraction service `lib/scoring.ts` exposes `generateTopPatterns(analysis, ad, game): CreativePattern[]`, returning exactly 3 patterns
  - Scoring formula applied: 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability
  - Each pattern card shows: rank, name, total score, all 4 sub-scores, explanation, source evidence, adaptation to selected game, confidence, `Select this pattern` button
  - Pattern mapping table visible (Market Pattern · Evidence · Adaptation to Target Game · Confidence)
  - Loading text exactly `Analyzing selected ad with Gemini...`
  - Output conforms to `GeminiAdAnalysis`, `CreativePattern`, `PatternAnalysisResult` types
- Scope: workflow step 3

### REQ-step4-creative-output
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 4 — CREATIVE OUTPUT + ACCEPTANCE CRITERIA)
- Description: Generate one 30-second vertical mobile ad via Scenario from the selected pattern + brief.
- Acceptance criteria:
  - Service `lib/scenario.ts` exposes `buildScenarioPrompt(brief, game, pattern): ScenarioPrompt` and `generateScenarioAd(prompt: ScenarioPrompt): Promise<CreativeOutput>`
  - Page renders all 5 sections in order: Selected Pattern · Creative Brief (editable) · Scenario Prompt · Scenario Output · Rationale
  - Brief contains all required fields: Creative concept, Selected pattern, Opening hook, 30-second scene flow, Visual direction, Gameplay reference, Text overlays, CTA, Rationale, Source ad evidence, Adaptation to selected game
  - Brief editable before Scenario call; Scenario prompt regenerated from edited brief
  - Scenario prompt includes: 30s duration, vertical mobile ad format, game category, game tags, selected pattern, scene-by-scene, visual style, text overlays, CTA, rationale
  - Loading text exactly `Generating 30-second ad with Scenario...` (and `Generating creative brief...` for brief generation)
  - On error, brief + prompt remain visible, error displayed, retry available
  - Action buttons: `Generate Creative Brief`, `Edit Brief`, `Generate Scenario Prompt`, `Generate 30s Ad with Scenario`, `Regenerate`
  - Output conforms to `CreativeBrief`, `ScenarioPrompt`, `CreativeOutput` types; final video is 30s vertical mobile format
- Scope: workflow step 4

## Cross-cutting

### REQ-global-state
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (GLOBAL STATE)
- Description: Single frontend state object holds all workflow data; no database.
- Acceptance criteria:
  - `AppState` type matches the PRD definition exactly (`currentStep`, `gameIdentity`, `marketScanConfig`, `marketScanResult`, `selectedAd`, `geminiAnalysis`, `topPatterns`, `selectedPattern`, `creativeBrief`, `scenarioPrompt`, `creativeOutput`)
  - State lives in the frontend (e.g. context/store under `lib/state.ts`)
  - Optional lightweight localStorage to preserve state across refresh
- Scope: global state

### REQ-error-and-loading-states
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (ERROR HANDLING RULES)
- Description: Each external API call has a visible loading state and an explicit error path with retry; no silent fake-data substitution.
- Acceptance criteria:
  - Sensor Tower: clear error message, stays on Market Scan tab, retry button, never falls back to fake data silently
  - Gemini: error state in Pattern Analysis, retry button, preserves selected ad
  - Scenario: keeps brief + prompt visible, shows generation error, retry button
  - Loading texts implemented verbatim: `Running Sensor Tower scan...`, `Analyzing selected ad with Gemini...`, `Generating creative brief...`, `Generating 30-second ad with Scenario...`
- Scope: cross-cutting reliability

### REQ-file-architecture
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (FILE ARCHITECTURE)
- Description: Source layout follows the PRD-imposed tree.
- Acceptance criteria:
  - `app/` contains `page.tsx`, `project/page.tsx`, `layout.tsx`, `globals.css`
  - `components/` is split into `layout/`, `landing/`, `game/`, `market/`, `patterns/`, `creative/`, `ui/` with the named files
  - `lib/` contains `types.ts`, `state.ts`, `scoring.ts`, `formatters.ts`, `sensorTower.ts`, `gemini.ts`, `scenario.ts`
  - `prompts/` contains `gemini-video-analysis.md`, `pattern-extraction.md`, `creative-brief-generation.md`, `scenario-prompt-generation.md`
  - `data/` contains `games.ts` and `devMockAds.ts` (dev only; never presented as real)
  - Project ships `.env.local.example`, `README.md`, `package.json`
- Scope: source tree

### REQ-env-variables
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (ENV VARIABLES)
- Description: API keys and feature flags live in `.env.local`; an example file ships in repo.
- Acceptance criteria:
  - `.env.local` declares `SENSOR_TOWER_API_KEY`, `GEMINI_API_KEY`, `SCENARIO_API_KEY`, `NEXT_PUBLIC_USE_DEV_MOCKS=false`
  - `.env.local.example` ships with all keys empty
  - Secrets never committed; `.env*` is git-ignored
- Scope: configuration

### REQ-mvp-definition
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (MVP DEFINITION + ACCEPTANCE CRITERIA — Technical)
- Description: End-to-end happy path produces one 30s vertical ad from a real Sensor Tower signal.
- Acceptance criteria:
  - User can: select a game → configure a live Sensor Tower scan → pick one of the top 3 ads → analyze its full video with Gemini → extract and select one of 3 patterns → edit a brief → generate a Scenario prompt → produce a 30s Scenario video
  - Demo narrative holds: "The creative is generated from a real market signal — not from a generic prompt."
  - Vercel-compatible build, all loading + error states implemented, clean modular file structure
- Scope: end-to-end MVP

---
*Synthesized 2026-04-25 from 1 PRD document. 11 requirements extracted.*
