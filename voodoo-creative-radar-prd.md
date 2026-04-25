# Voodoo Creative Radar — PRD for Claude Code

> **Product:** Voodoo Creative Radar
> **Tagline:** From Market Signals to Testable Creatives
> **Stack:** Next.js · TypeScript · React · Tailwind CSS
> **Deploy target:** Vercel
> **APIs:** Sensor Tower (live) · Gemini · Scenario
> **No database.** Frontend state only.
> **Final output:** One 30-second video ad generated via Scenario.

---

## INSTRUCTIONS FOR CLAUDE CODE

Build this project using the GSD methodology, phase by phase. For each phase:
1. Discuss the implementation
2. List files to create/modify
3. Implement
4. Verify locally
5. Fix issues
6. Only move to the next phase after validation

**Do not add features outside this PRD. Do not feature creep. Quality over completeness.**

---

## PHASES

```
Phase 1  — App shell + landing page + global structure
Phase 2  — Project page with 4 workflow tabs
Phase 3  — Game Identity step
Phase 4  — Market Scan UI + Sensor Tower service layer
Phase 5  — Top 3 ads ranking + ad selection
Phase 6  — Gemini video analysis service + UI
Phase 7  — Pattern ranking + pattern selection
Phase 8  — Creative brief editor + Scenario prompt
Phase 9  — Scenario generation + final video output
Phase 10 — UI polish + error states + loading states + Vercel readiness
```

---

## PAGES

### `/` — Landing page

Content:
- Title: `Voodoo Creative Radar`
- Tagline: `From Market Signals to Testable Creatives`
- Description: `Analyse market ads, extract winning creative patterns, and generate a testable 30-second ad for a selected Voodoo game.`
- 4 workflow cards: `1. Select a game` / `2. Scan the market` / `3. Analyze winning patterns` / `4. Generate a creative`
- CTA button: `Get Started` → navigates to `/project`

UI requirements: premium, light, clean, Voodoo-inspired, slightly gaming. White/off-white backgrounds, charcoal typography, one strong accent color, rounded cards, subtle shadows. No dark mode, no cyberpunk, no raw JSON visible.

### `/project` — Project page

Header: `Demo Project — Voodoo Creative Radar`

4 tabs:
```
[1. Game Identity] [2. Market Scan] [3. Pattern Analysis] [4. Creative Output]
```

User can navigate between tabs manually. The expected flow is sequential.

Left sidebar:
```
Voodoo Creative Radar
─────────────────────
Projects
• Demo Project

+ New Project (visible but not functional for MVP)
```

---

## STEP 1 — GAME IDENTITY

**Goal:** User selects a Voodoo game. App auto-fills category + tags. User can edit both.

Game data (hardcoded for MVP):
```ts
const games = [
  {
    id: "puzzle-game",
    name: "Puzzle Voodoo Game",
    category: "Puzzle",
    tags: ["casual", "logic", "level-based", "satisfying", "challenge"]
  },
  {
    id: "battle-game",
    name: "Battle Voodoo Game",
    category: "Battle",
    tags: ["combat", "strategy", "characters", "progression", "mid-core"]
  }
]
```

UI fields: Game selector dropdown · Category field (editable) · Tags field (editable)

Actions: `Save Game Identity` · `Continue to Market Scan`

Output type:
```ts
type GameIdentity = {
  gameId: string
  gameName: string
  category: string
  tags: string[]
}
```

---

## STEP 2 — MARKET SCAN

**Goal:** Call Sensor Tower live with category + tags from Step 1. Display results. User selects one ad from the top 3.

**CRITICAL: Sensor Tower must be called live. No preloaded database. No silent fallback to fake data in live mode.**

Dev mock allowed only via: `NEXT_PUBLIC_USE_DEV_MOCKS=true` (default: false). Mock data lives in `data/devMockAds.ts` and is never presented as real Sensor Tower data.

User inputs (3 dropdowns):
- Number of ads: `10 / 20 / 30 / 50`
- Time range: `Last 30 days / Last 60 days / Last 90 days`
- Market: `US / France / UK / Global`

Config type:
```ts
type MarketScanConfig = {
  category: string
  tags: string[]
  numberOfAds: 10 | 20 | 30 | 50
  timeRange: "30d" | "60d" | "90d"
  market: "US" | "France" | "UK" | "Global"
}
```

Service: `lib/sensorTower.ts`
```ts
async function fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult>
```

Retrieve from Sensor Tower (all available fields): competitor games · ad IDs · creative URLs · video URLs · thumbnails · network · format · first seen · last seen · impressions · share of voice · spend estimate.

Ranking logic (use best available):
1. Share of voice
2. Impressions
3. Spend estimate
4. Recency (last seen)
5. Internal metadata score

UI sections:
- Config panel (category, tags, dropdowns, `Run Market Scan` button)
- KPI cards: Ads retrieved · Competitor games found · Networks detected · Market · Time range
- Top 3 ad cards (rank · thumbnail · game name · ad ID · network · format · performance signal · first/last seen · ranking reason · `Select this ad` button)
- Optional: full ads grid below top 3

Loading text: `Running Sensor Tower scan...`
Error: clear error message + retry button, no silent replacement with fake data.

Actions: `Run Market Scan` · `Select Ad #1` · `Select Ad #2` · `Select Ad #3` · `Continue to Pattern Analysis`

Output types:
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

---

## STEP 3 — PATTERN ANALYSIS

**Goal:** Analyze the selected ad's full video with Gemini. Display individual analysis. Extract 3 creative patterns. User selects one.

This step is the intellectual core of the product. It must produce the "wow" moment of the demo.

Service: `lib/gemini.ts`
```ts
async function analyzeSelectedAdWithGemini(
  ad: MarketAd,
  game: GameIdentity
): Promise<GeminiAdAnalysis>
```

Gemini receives: full video of selected ad · ad metadata · game category · game tags.
Target: full video analysis. Frame extraction only if technically required.

Gemini output type:
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

UI analysis sections (no raw JSON dump):
Selected Ad Preview · Video Summary · Opening Hook · 0-3s Hook · Scene Flow · Visual Patterns · Gameplay Mechanics · Emotional Triggers · Text Overlays · CTA · Visual Style · Pacing · Why It Works · Applicability to Selected Game · Confidence

Pattern extraction: `lib/scoring.ts`
```ts
function generateTopPatterns(
  analysis: GeminiAdAnalysis,
  ad: MarketAd,
  game: GameIdentity
): CreativePattern[]
```

Extract exactly 3 patterns. Pattern examples: `Fail-first hook` · `Timer pressure` · `Reward reveal` · `Challenge CTA` · `Transformation payoff` · `Fast loop demonstration` · `Before/after reveal`

Scoring formula:
```
Pattern Score = 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability

Frequency: strength of pattern presence in selected ad + Sensor Tower signals
Game Fit: compatibility with selected game category + tags
Freshness: recency based on first seen / last seen
Creative Actionability: ease of turning pattern into Scenario prompt + 30s video
```

Each pattern card shows:
rank · pattern name · total score · frequency score · game fit score · freshness score · creative actionability score · explanation · source evidence · adaptation to selected game · confidence · `Select this pattern` button

Pattern mapping table:
| Market Pattern | Evidence | Adaptation to Target Game | Confidence |

Loading text: `Analyzing selected ad with Gemini...`

Actions: `Analyze Selected Ad with Gemini` · `Select Pattern #1` · `Select Pattern #2` · `Select Pattern #3` · `Continue to Creative Output`

Output types:
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

---

## STEP 4 — CREATIVE OUTPUT

**Goal:** Generate one 30-second vertical mobile ad via Scenario from the selected pattern + brief.

Service: `lib/scenario.ts`
```ts
function buildScenarioPrompt(brief: CreativeBrief, game: GameIdentity, pattern: CreativePattern): ScenarioPrompt

async function generateScenarioAd(prompt: ScenarioPrompt): Promise<CreativeOutput>
```

Page sections (all required):
1. **Selected Pattern** summary
2. **Creative Brief** — generated, then editable by user before sending to Scenario
3. **Scenario Prompt** — derived from edited brief
4. **Scenario Output** — video preview + generation status
5. **Rationale** — why this creative was generated this way

Creative brief required fields:
```
Creative concept · Selected pattern · Opening hook · 30-second scene flow ·
Visual direction · Gameplay reference · Text overlays · CTA ·
Rationale · Source ad evidence · Adaptation to selected game
```

Example brief structure:
```
Creative Concept: Fix the mistake before it is too late.
Selected Pattern: Fail-first Hook
Opening Hook: The ad opens with a visible wrong move that creates immediate frustration and curiosity.
30-Second Scene Flow:
  0-3s: Show a losing or wrong action inspired by the selected ad pattern.
  3-7s: Increase tension with visual feedback.
  7-15s: Show the correct move or reversal.
  15-23s: Show reward, progress, or payoff.
  23-30s: End with a strong CTA.
Visual Direction: Clean, polished, Voodoo-like mobile game aesthetic. Light, readable, playful, premium.
Text Overlays: "Can you fix this?" / "Only the best players solve it." / "Play now."
CTA: Play Now
Rationale: This creative uses the selected market pattern identified from the top Sensor Tower ad and adapts it to the selected game's category and tags.
```

Scenario prompt must include: 30s duration · vertical mobile ad format · game category · game tags · selected pattern · scene by scene · visual style · text overlays · CTA · rationale.

Loading text: `Generating 30-second ad with Scenario...`
Error: keep brief + prompt visible, show error, allow retry.

Actions: `Generate Creative Brief` · `Edit Brief` · `Generate Scenario Prompt` · `Generate 30s Ad with Scenario` · `Regenerate`

Output types:
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

---

## GLOBAL STATE

No database. Frontend state only.

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

Optional: lightweight localStorage to preserve state on refresh.

---

## FILE ARCHITECTURE

```
/
├── app/
│   ├── page.tsx
│   ├── project/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── WorkflowTabs.tsx
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── WorkflowCards.tsx
│   │   └── LandingCTA.tsx
│   ├── game/
│   │   ├── GameIdentityStep.tsx
│   │   ├── GameSelector.tsx
│   │   ├── CategoryField.tsx
│   │   └── TagsEditor.tsx
│   ├── market/
│   │   ├── MarketScanStep.tsx
│   │   ├── MarketScanConfig.tsx
│   │   ├── MarketKpiCards.tsx
│   │   ├── TopAdCard.tsx
│   │   ├── TopAdsRanking.tsx
│   │   └── AdsGrid.tsx
│   ├── patterns/
│   │   ├── PatternAnalysisStep.tsx
│   │   ├── GeminiAnalysisPanel.tsx
│   │   ├── SceneFlowTimeline.tsx
│   │   ├── PatternCard.tsx
│   │   ├── PatternRanking.tsx
│   │   └── PatternMappingTable.tsx
│   ├── creative/
│   │   ├── CreativeOutputStep.tsx
│   │   ├── CreativeBriefEditor.tsx
│   │   ├── ScenarioPromptPreview.tsx
│   │   ├── ScenarioVideoPreview.tsx
│   │   └── CreativeRationale.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Select.tsx
│       ├── Input.tsx
│       ├── Textarea.tsx
│       ├── Tabs.tsx
│       └── LoadingState.tsx
├── lib/
│   ├── types.ts
│   ├── state.ts
│   ├── scoring.ts
│   ├── formatters.ts
│   ├── sensorTower.ts
│   ├── gemini.ts
│   └── scenario.ts
├── prompts/
│   ├── gemini-video-analysis.md
│   ├── pattern-extraction.md
│   ├── creative-brief-generation.md
│   └── scenario-prompt-generation.md
├── data/
│   ├── games.ts
│   └── devMockAds.ts        ← dev mock only, never presented as real data
├── public/assets/
├── .env.local.example
├── README.md
└── package.json
```

---

## ENV VARIABLES

`.env.local`:
```env
SENSOR_TOWER_API_KEY=
GEMINI_API_KEY=
SCENARIO_API_KEY=
NEXT_PUBLIC_USE_DEV_MOCKS=false
```

Create `.env.local.example` with all keys empty.

---

## ERROR HANDLING RULES

| API | On failure |
|-----|-----------|
| Sensor Tower | Clear error message · Stay on Market Scan tab · Retry button · No silent fake data replacement |
| Gemini | Error state in Pattern Analysis · Retry button · Preserve selected ad |
| Scenario | Keep brief + prompt visible · Show generation error · Retry button |

Every API call must have a visible loading state with these exact texts:
- `Running Sensor Tower scan...`
- `Analyzing selected ad with Gemini...`
- `Generating creative brief...`
- `Generating 30-second ad with Scenario...`

---

## UI DESIGN RULES

**Do:**
- White / off-white backgrounds
- Soft grey sections
- Black or charcoal typography
- One strong accent color
- Rounded cards + subtle shadows
- Clean spacing + large visual previews
- Minimal premium motion

**Don't:**
- Dark mode dominant
- Cyberpunk aesthetic
- Overloaded dashboard
- Raw JSON visible anywhere
- Childish or generic SaaS look
- Unnecessary animations

---

## ACCEPTANCE CRITERIA

**Landing:** Product name + tagline visible · 4-step workflow clear · `Get Started` → `/project` · Premium light UI.

**Game Identity:** 2-game dropdown · Auto-fill category + tags · Both fields editable · Continue to Market Scan.

**Market Scan:** 3 config dropdowns · Sensor Tower called live · Results displayed · Top 3 ranked and shown · User can select one ad.

**Pattern Analysis:** Full video sent to Gemini · Individual analysis displayed (no raw JSON) · Exactly 3 patterns extracted + scored · Pattern mapping table visible · User can select one pattern.

**Creative Output:** Selected pattern shown · Brief generated + editable · Scenario prompt generated · Scenario called · 30s video displayed · Rationale + evidence shown.

**Technical:** No database · Frontend state only · Vercel-compatible · `.env.local` for all API keys · All loading + error states implemented · Clean modular file structure.

---

## MVP DEFINITION

The MVP is complete when:

> A user can select a Voodoo game, configure a live Sensor Tower scan, pick one of the top 3 ads, analyze its full video with Gemini, extract and select one of 3 creative patterns, edit a brief, generate a Scenario prompt, and produce a 30-second video ad via Scenario.

**Key narrative for demo:**
> "The creative is generated from a real market signal — not from a generic prompt."

**One-liner:**
> From Market Signals to Testable Creatives.
