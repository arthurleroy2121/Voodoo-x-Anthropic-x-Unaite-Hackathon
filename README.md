# Voodoo Creative Radar

**Voodoo × Anthropic × Unaite Hackathon · Track 3 · 2026-04-25 to 2026-04-26 · 30h**

A live market intelligence pipeline that turns a Sensor Tower signal into a testable 15-second vertical ad — without a single generic prompt.

Pick a game → scan its top-performing competitor creatives → let Gemini extract the winning patterns → replicate those patterns into a brand-new Scenario-generated ad.

---

## Track 3 — The brief

Track 3 asked competitors to build an end-to-end creative intelligence system:

1. **Select** a Voodoo game as the target
2. **Identify** similar games competing in the same market segment
3. **Retrieve** the top-performing creatives across those games, ranked by interaction rate (IPM, CTR)
4. **Study** the creative patterns driving performance in each ad
5. **Analyse** how those patterns link together — hooks, mechanics, pacing, emotion, CTA
6. **Replicate** the extracted pattern playbook to generate new creatives for the target game

The Creative Radar automates every step of that loop, live, from real market data.

---

## Architecture

```
User picks a Voodoo game
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1 · Market scan (Sensor Tower)                        │
│                                                             │
│  app/api/sensorTower/route.ts                               │
│  └─ live scan of competitor games in same category         │
│  └─ ranks creatives by interaction rate (IPM / CTR)        │
│  └─ returns Top 3 ads with metadata + CDN URL              │
└──────────────────────────┬──────────────────────────────────┘
                           │  user selects one ad
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2 · Pattern extraction (Gemini Files API)             │
│                                                             │
│  app/api/gemini/route.ts                                    │
│  └─ server fetches ad bytes → Gemini Files API upload      │
│  └─ polls until state === "ACTIVE"                         │
│  └─ generateContent with responseJsonSchema (15 fields)    │
│  └─ Zod boundary validation + finishReason check           │
│  └─ outputs: hook type, pacing, emotion, mechanic,         │
│              CTA style, visual language … (15 fields)      │
│  └─ clusters into 3 replicable creative patterns           │
└──────────────────────────┬──────────────────────────────────┘
                           │  user picks a pattern + edits brief
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3 · Ad generation (Scenario img2vid)                  │
│                                                             │
│  POST  app/api/scenario/start   → { jobId }                │
│  GET   app/api/scenario/status?jobId=...                    │
│  └─ client polls every 3-5s, 8-min cap                     │
│  └─ AbortController on unmount                             │
│  └─ jobId persisted in localStorage for refresh recovery   │
│  └─ chains two clips: 10s + 5s = 15s vertical ad          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              15-second vertical ad, ready to test
```

---

## The five pipeline stages

### Stage 1 · Game selection
The user picks a Voodoo game from the built-in catalogue. Each game has a seed image gallery (`data/`) used as the starting frame for generation.

### Stage 2 · Live Sensor Tower scan
`lib/sensorTower.ts` (server-only) calls the Sensor Tower API and returns the top 3 ads for competitor games in the same category, ranked by interaction rate. No mock data in production — a visible `DEV MOCK` ribbon is injected when `NEXT_PUBLIC_USE_DEV_MOCKS=true`.

### Stage 3 · Gemini pattern analysis
`lib/gemini.ts` uploads the selected ad to Gemini via the Files API (server-fetch → upload → poll → `generateContent`). It never passes Sensor Tower CDN URLs directly to Gemini. The model responds with a strict JSON schema covering 15 creative fields, validated with Zod. The output is clustered into 3 distinct replicable patterns rendered as labeled sections in the UI — never raw JSON.

### Stage 4 · Brief editing
The user selects one of the 3 patterns and can edit the generated creative brief before sending it to Scenario. The brief encodes the pattern playbook (hook, mechanic, pacing, CTA) into a Scenario-compatible prompt.

### Stage 5 · Scenario video generation
Two sequential `img2vid` calls produce a chained 15-second vertical ad: a 10-second main clip + a 5-second CTA clip. The client polls `GET /api/scenario/status` until the job completes, with recovery if the page is refreshed mid-generation.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19.2 + Tailwind CSS 4.1 (zero-config, `@theme` in `globals.css`) |
| Language | TypeScript 5.6+ strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| State | Zustand 5 (`persist` + `partialize` + `skipHydration`) |
| Market data | Sensor Tower API (live, no silent fallback) |
| Pattern analysis | Gemini API (Files API upload flow, JSON schema, Zod validation) |
| Ad generation | Scenario API (img2vid, two-route polling, chained clips) |
| Package manager | pnpm 9 |
| Deployment | Vercel (all routes export `maxDuration = 300`, `runtime = "nodejs"`) |

---

## Quick start

### Prerequisites

- Node.js ≥ 18 and pnpm 9
- API keys for Sensor Tower, Gemini, and Scenario

### Install

```bash
git clone https://github.com/arthurleroy2121/Voodoo-x-Anthropic-x-Unaite-Hackathon.git
cd Voodoo-x-Anthropic-x-Unaite-Hackathon
pnpm install
```

```bash
cp .env.local.example .env.local
```

```env
SENSOR_TOWER_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
SCENARIO_API_KEY=your_key_here

# Optional — enables dev mocks with a visible DEV MOCK ribbon
NEXT_PUBLIC_USE_DEV_MOCKS=true
```

```bash
pnpm dev      # → http://localhost:3000 (Turbopack)
pnpm build    # production build
pnpm start    # run production build
pnpm lint     # ESLint flat config
```

---

## Repo layout

```
.
├── README.md
├── CLAUDE.md                        ← guide for Claude Code agents
├── voodoo-creative-radar-prd.md     ← original PRD (verbatim source)
├── .env.example / .env.local.example
│
├── .planning/
│   ├── PROJECT.md                   ← vision, constraints, key decisions
│   ├── ROADMAP.md                   ← 10 build phases with goals + success criteria
│   ├── REQUIREMENTS.md              ← REQ-IDs and phase traceability
│   ├── STATE.md                     ← current phase + project memory
│   └── research/SUMMARY.md          ← stack, architecture, pitfalls
│
├── app/
│   ├── page.tsx                     ← main UI (game picker → scan → analyse → generate)
│   ├── globals.css                  ← Tailwind @theme tokens
│   └── api/
│       ├── sensorTower/route.ts     ← live market scan
│       ├── gemini/route.ts          ← ad analysis + pattern extraction
│       └── scenario/
│           ├── start/route.ts       ← POST → { jobId }
│           └── status/route.ts      ← GET polling → video URLs
│
├── lib/
│   ├── sensorTower.ts               ← server-only Sensor Tower client
│   ├── gemini.ts                    ← server-only Gemini Files API client
│   ├── scenario.ts                  ← server-only Scenario client
│   ├── prompts.ts                   ← server-only prompt templates
│   └── copy.ts                      ← loading text constants (verbatim)
│
├── components/                      ← React UI components
├── prompts/                         ← Gemini system prompts (one per call)
├── data/                            ← game catalogue + seed image galleries
├── docs/                            ← supplementary documentation
├── scripts/                         ← utility scripts
│
├── scenario-openapi.yaml            ← Scenario API spec references
└── Doc Sensor TOWER/                ← Sensor Tower API documentation
```

---

## Deployment

Auto-deploys to Vercel on push to `main`. All API routes export `maxDuration = 300` and `runtime = "nodejs"` — mirrored in `vercel.json` — to handle Gemini upload polling and Scenario generation within Vercel's function timeout limits.

Required env vars in Vercel (Production + Preview + Development): `SENSOR_TOWER_API_KEY`, `GEMINI_API_KEY`, `SCENARIO_API_KEY`. `NEXT_PUBLIC_USE_DEV_MOCKS` must be absent in Production.

---

## Jury axes · Track 3

Equally weighted:

**Intelligence depth** — does the pattern analysis actually capture what makes an ad perform, or is it surface-level description?

**Pipeline genericity** — does the system work across different game genres, or is it hardcoded to one title?

**Creative fidelity** — does the generated ad visibly replicate the extracted pattern, not just match the brief on paper?

**AI usage** — AI across the full loop: market scan interpretation, video analysis via Files API, structured pattern extraction with schema enforcement, prompt-to-video generation.

Our differentiator: **the creative is generated from a real market signal — not a generic prompt.**
