# Architecture Research

**Domain:** Next.js 15 App Router single-page wizard with serverless API proxies (Sensor Tower, Gemini, Scenario), frontend-only state, no DB. Final output = 30s vertical MP4.
**Researched:** 2026-04-25
**Confidence:** HIGH (backed by official Vercel/Next.js/Gemini/Scenario docs + recent ecosystem articles; LOW only on exact Sensor Tower endpoint shape since the API is a private contract — not researched here)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Browser (React 19 + Next.js 15)                    │
│                                                                          │
│  Server Components (default)        Client Components ("use client")     │
│  ┌──────────────────────────┐       ┌──────────────────────────────────┐ │
│  │ app/layout.tsx           │       │ WorkflowTabs (controls activeTab)│ │
│  │ app/page.tsx (Hero,      │       │ GameIdentityStep                 │ │
│  │   WorkflowCards, CTA)    │       │ MarketScanStep                   │ │
│  │ app/project/page.tsx     │  ──>  │ PatternAnalysisStep              │ │
│  │   (shell only)           │       │ CreativeOutputStep               │ │
│  │ AppShell, Sidebar,       │       │ Video players, editors           │ │
│  │   TopBar (presentational)│       │ Subscribers to Zustand store     │ │
│  └──────────────────────────┘       └──────────────┬───────────────────┘ │
│                                                    │                     │
│                             ┌──────────────────────▼──────────────────┐  │
│                             │    Zustand store (lib/state.ts)         │  │
│                             │  AppState + persist(localStorage)       │  │
│                             └──────────────────────┬──────────────────┘  │
│                                                    │                     │
│                             ┌──────────────────────▼──────────────────┐  │
│                             │  Service layer (lib/*.ts) — client-only │  │
│                             │  sensorTower.ts · gemini.ts · scenario  │  │
│                             │  Each: typed fetch() to /api/*          │  │
│                             │  Branches on NEXT_PUBLIC_USE_DEV_MOCKS  │  │
│                             └──────────────────────┬──────────────────┘  │
└────────────────────────────────────────────────────┼─────────────────────┘
                                                     │ fetch (JSON)
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│       Vercel Serverless / Fluid Compute  (app/api/*/route.ts)            │
│                                                                          │
│  /api/sensor-tower/scan      /api/gemini/analyze     /api/scenario/      │
│  POST: MarketScanConfig      POST: ad+game           ├── start  POST     │
│  → calls Sensor Tower        → uploads video to      │   → starts job    │
│  → ranks → returns           │   Gemini Files API    ├── status?id=...   │
│    MarketScanResult          → polls until ACTIVE    │   → polls Scenario│
│                              → calls generateContent │   /v1/jobs/{id}   │
│  maxDuration ≤ 60s (pro)     → returns               └── final asset URL │
│                              GeminiAdAnalysis                            │
│  Server-side ONLY:                                                       │
│  SENSOR_TOWER_API_KEY · GEMINI_API_KEY · SCENARIO_API_KEY                │
└──────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │  External APIs (HTTPS)         │
                  │  Sensor Tower · Gemini · Scenario │
                  └────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `app/layout.tsx` | Root HTML, fonts, global CSS, Tailwind reset | **Server component**, no `"use client"` |
| `app/page.tsx` | Static landing (Hero + WorkflowCards + CTA) | **Server component** — fully static, no interactivity beyond a `<Link>` |
| `app/project/page.tsx` | Renders `<AppShell>` + active step component | **Client component** (it must subscribe to Zustand `currentStep`) |
| `components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx` | Pure presentational chrome | Server components if no event handlers; otherwise client |
| `components/layout/WorkflowTabs.tsx` | Tab switcher (writes `currentStep` to store) | **Client component** |
| `components/landing/*` | Hero, WorkflowCards, LandingCTA | **Server components** (static marketing) |
| `components/{game,market,patterns,creative}/*Step.tsx` | One per wizard step, orchestrates substeps | **Client components** (read/write Zustand) |
| `components/ui/*` | Atoms: Button, Card, Input, Select, Tabs, LoadingState | Client components by default (most have onClick/onChange); Card/Badge can be server |
| `lib/types.ts` | All shared TS types from PRD (`AppState`, `GameIdentity`, `MarketAd`, etc.) | Type-only module, no runtime |
| `lib/state.ts` | Zustand store + `persist` middleware → localStorage | **Client-only module** (`"use client"` not needed; importing module is fine since Zustand is tree-shaken; but the store hook is client-side) |
| `lib/sensorTower.ts`, `gemini.ts`, `scenario.ts` | Typed client → calls `/api/*` route handlers | Client modules — never import API SDKs that need secrets |
| `lib/scoring.ts` | Pure function: pattern scoring formula (35/25/20/20) | Pure TS, runs client-side after Gemini response arrives |
| `lib/formatters.ts` | Date/number/percentage display helpers | Pure TS |
| `app/api/sensor-tower/scan/route.ts` | POST handler: validate config (zod), call Sensor Tower with secret, rank, return JSON | Vercel Function, `runtime = "nodejs"`, `maxDuration = 60` |
| `app/api/gemini/analyze/route.ts` | POST handler: receives `{ ad, game }`, uploads video to Gemini Files API, polls until ACTIVE, calls `generateContent`, returns `GeminiAdAnalysis` | Vercel Function, **needs Fluid Compute** (`maxDuration = 300`) |
| `app/api/scenario/start/route.ts` | POST handler: build prompt → POST `/v1/generate/custom/{modelId}` → return `{ jobId }` | Short, < 5s |
| `app/api/scenario/status/route.ts` | GET handler with `?jobId=…` → GET `/v1/jobs/{jobId}` → return `{ status, progress, assetUrl? }` | Short, < 2s — called repeatedly by client |

---

## Recommended Project Structure

(Imposed by PRD — confirmed appropriate.)

```
/
├── app/
│   ├── layout.tsx                   # Root, fonts, Tailwind globals — SERVER
│   ├── page.tsx                     # Landing — SERVER (static)
│   ├── globals.css                  # Tailwind directives + Voodoo design tokens
│   ├── error.tsx                    # Global error boundary (catch-all)
│   ├── project/
│   │   ├── page.tsx                 # Wizard host — CLIENT
│   │   ├── loading.tsx              # Suspense fallback for first paint
│   │   └── error.tsx                # Wizard-scoped error boundary
│   └── api/
│       ├── sensor-tower/
│       │   └── scan/route.ts        # POST  — runtime nodejs, maxDuration 60
│       ├── gemini/
│       │   └── analyze/route.ts     # POST  — runtime nodejs, maxDuration 300 (Fluid)
│       └── scenario/
│           ├── start/route.ts       # POST  — kicks job, returns jobId
│           └── status/route.ts      # GET   — polls job status
├── components/
│   ├── layout/                      # AppShell, Sidebar, TopBar, WorkflowTabs
│   ├── landing/                     # Hero, WorkflowCards, LandingCTA  (server)
│   ├── game/                        # GameIdentityStep + 3 fields      (client)
│   ├── market/                      # MarketScanStep + KPI/Top3 cards  (client)
│   ├── patterns/                    # PatternAnalysisStep + panels     (client)
│   ├── creative/                    # CreativeOutputStep + brief editor (client)
│   └── ui/                          # Button, Card, Badge, Select, etc.
├── lib/
│   ├── types.ts                     # All PRD types (no runtime)
│   ├── state.ts                     # Zustand store + persist
│   ├── scoring.ts                   # Pattern scoring (pure)
│   ├── formatters.ts                # Display helpers (pure)
│   ├── sensorTower.ts               # client → POST /api/sensor-tower/scan
│   ├── gemini.ts                    # client → POST /api/gemini/analyze
│   ├── scenario.ts                  # client → POST /api/scenario/start + poll
│   ├── api/                         # (suggested addition)
│   │   ├── env.ts                   # Server-only secret accessors (typed, throws if missing)
│   │   ├── schemas.ts               # zod schemas shared by route handlers
│   │   └── errors.ts                # Error envelope helper { ok: false, code, message }
│   └── prompts.ts                   # Loads prompts/*.md as strings (server-only)
├── prompts/
│   ├── gemini-video-analysis.md
│   ├── pattern-extraction.md
│   ├── creative-brief-generation.md
│   └── scenario-prompt-generation.md
├── data/
│   ├── games.ts                     # The 2 hardcoded games
│   └── devMockAds.ts                # Used ONLY when NEXT_PUBLIC_USE_DEV_MOCKS=true
├── public/assets/
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Structure Rationale

- **`app/api/*` mirrors the 3 external APIs** — one route segment per provider, easy to reason about envs and timeouts per route. Scenario gets two segments (`start` + `status`) because the polling pattern requires it.
- **`lib/api/`** (suggested addition not in PRD) — concentrates server-only concerns (env access, zod schemas, error envelope) so route handlers stay thin. Keeps secrets out of any module that could be imported by a client component.
- **`lib/*.ts` services are CLIENT modules** — they call our own `/api/*` routes; they never import provider SDKs. This guarantees keys never end up in the browser bundle.
- **`components/{game,market,patterns,creative}/`** — one folder per wizard step, exactly as PRD. Keeps step coupling explicit and limits churn on a single step.
- **`prompts/*.md`** read on the server inside route handlers (use `node:fs` at module-load time or `import` via a build-time loader). Never expose to client.

---

## Architectural Patterns

### Pattern 1: Thin Route Handler + Service Layer Mirror

**What:** Each external API gets exactly two layers:
1. **Server route handler** (`app/api/.../route.ts`) — owns the secret, validates input with zod, calls the provider, normalizes response, returns typed JSON envelope.
2. **Client service** (`lib/{provider}.ts`) — typed `fetch()` wrapper with the same input/output types from `lib/types.ts`. The component never knows whether the implementation is real, mock, or remote.

**When to use:** Every external API call in this project. Mandatory because the PRD requires secrets to stay server-side.

**Trade-offs:**
- Pros: clean boundary, secrets safe, mockable at one layer (`NEXT_PUBLIC_USE_DEV_MOCKS`), type-safe both sides.
- Cons: two files per API instead of one — fine here (only 3 APIs).

**Example:**

```typescript
// lib/api/schemas.ts (server-importable, zod runtime)
import { z } from "zod";

export const MarketScanConfigSchema = z.object({
  category: z.string().min(1),
  tags: z.array(z.string()).min(1).max(20),
  numberOfAds: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]),
  timeRange: z.enum(["30d", "60d", "90d"]),
  market: z.enum(["US", "France", "UK", "Global"]),
});

// app/api/sensor-tower/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MarketScanConfigSchema } from "@/lib/api/schemas";
import { errorEnvelope } from "@/lib/api/errors";

export const runtime = "nodejs";
export const maxDuration = 60; // requires Pro for >10s

export async function POST(req: NextRequest) {
  const parsed = MarketScanConfigSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      errorEnvelope("VALIDATION", parsed.error.issues),
      { status: 422 },
    );
  }
  try {
    const result = await callSensorTower(parsed.data); // uses process.env.SENSOR_TOWER_API_KEY
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return NextResponse.json(errorEnvelope("UPSTREAM", String(e)), { status: 502 });
  }
}

// lib/sensorTower.ts (client)
import type { MarketScanConfig, MarketScanResult } from "@/lib/types";
import { devMockAds } from "@/data/devMockAds";

export async function fetchSensorTowerAds(
  config: MarketScanConfig,
): Promise<MarketScanResult> {
  if (process.env.NEXT_PUBLIC_USE_DEV_MOCKS === "true") {
    return { config, ads: devMockAds, topAds: devMockAds.slice(0, 3) };
  }
  const res = await fetch("/api/sensor-tower/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.message ?? "Sensor Tower scan failed");
  return json.data as MarketScanResult;
}
```

### Pattern 2: Standardized Error Envelope

**What:** Every `/api/*` returns either `{ ok: true, data: <T> }` or `{ ok: false, code: string, message: string, issues?: unknown }` with a meaningful HTTP status. Client services translate `ok: false` into a thrown `Error` with a stable code.

**When to use:** All route handlers in this project — the PRD's "Error Handling Rules" section requires distinct user-visible error states per API.

**Trade-offs:** Slightly more verbose than throwing raw, but makes UI retry logic trivial and keeps the error texts consistent.

```typescript
// lib/api/errors.ts (server-only)
export type ApiError = { ok: false; code: ErrorCode; message: string; issues?: unknown };
export type ErrorCode = "VALIDATION" | "UPSTREAM" | "TIMEOUT" | "RATE_LIMIT" | "INTERNAL";
export const errorEnvelope = (code: ErrorCode, detail: unknown): ApiError => ({
  ok: false, code, message: typeof detail === "string" ? detail : "Request failed", issues: detail,
});
```

### Pattern 3: Zustand Store + `persist` Middleware (Single Source of Truth)

**What:** One store typed as `AppState` (PRD §"GLOBAL STATE"). All wizard tabs read/write through it. `persist` middleware persists to `localStorage` so a refresh does not lose state.

**When to use:** Picked over alternatives because:

| Option | Verdict | Reason |
|--------|---------|--------|
| **Zustand + persist** | ✅ CHOSEN | One small store, no provider, persist for free, ergonomic in client components, well-known SSR fix (skip hydration on server). |
| React Context | ❌ | 4 deeply nested contexts (one per step) → re-render storms; manual localStorage glue; no derived selectors. |
| `nuqs` (URL state) | ❌ | `selectedAd`, `geminiAnalysis`, `creativeOutput` are large objects with video URLs / nested structures — they don't fit in a query string and would leak preview URLs in the address bar. |
| TanStack Query | Optional pairing | Useful for server-state caching (Sensor Tower, Gemini result), but not required by MVP — Zustand alone covers it. |

**Trade-offs:**
- Pros: minimal boilerplate, perfect fit for the PRD's `AppState` shape, free localStorage persistence, no provider tree.
- Cons: SSR hydration mismatch with `persist` if the same store is read during server render — mitigated by reading the store **only inside client components** (which is how the PRD's wizard already works) and using the `onRehydrateStorage` / hydration-flag pattern.

**Example:**

```typescript
// lib/state.ts
"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState } from "@/lib/types";

type Actions = {
  setStep: (s: AppState["currentStep"]) => void;
  setGameIdentity: (g: AppState["gameIdentity"]) => void;
  setMarketScanResult: (r: AppState["marketScanResult"]) => void;
  setGeminiAnalysis: (a: AppState["geminiAnalysis"]) => void;
  // ...
  reset: () => void;
};

const initial: AppState = { currentStep: "game" };

export const useApp = create<AppState & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setStep: (currentStep) => set({ currentStep }),
      setGameIdentity: (gameIdentity) => set({ gameIdentity }),
      setMarketScanResult: (marketScanResult) => set({ marketScanResult }),
      setGeminiAnalysis: (geminiAnalysis) => set({ geminiAnalysis }),
      reset: () => set(initial),
    }),
    {
      name: "vcr.appstate.v1",
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient UI/loading flags
      partialize: (s) => ({
        currentStep: s.currentStep,
        gameIdentity: s.gameIdentity,
        marketScanConfig: s.marketScanConfig,
        marketScanResult: s.marketScanResult,
        selectedAd: s.selectedAd,
        geminiAnalysis: s.geminiAnalysis,
        topPatterns: s.topPatterns,
        selectedPattern: s.selectedPattern,
        creativeBrief: s.creativeBrief,
        scenarioPrompt: s.scenarioPrompt,
        creativeOutput: s.creativeOutput,
      }),
      skipHydration: true, // we explicitly call rehydrate() from a client mount
    },
  ),
);

// In project/page.tsx (client):
//   useEffect(() => { useApp.persist.rehydrate(); }, []);
```

### Pattern 4: Long-Running Calls — Two Strategies, Not One

**What:** Gemini and Scenario are both slow but their shapes differ, so they need different patterns:

| Provider | Step shape | Vercel timeout fit | Strategy |
|----------|-----------|---------------------|----------|
| Sensor Tower | Single request, < 30s typical | Fits in 60s Pro / 10s Hobby | Single `POST` round trip; if Hobby and >10s, must move to Fluid Compute or accept failures. |
| Gemini | Files API upload → poll until ACTIVE → `generateContent` (30–90s end-to-end) | Does NOT fit in 10s Hobby; barely fits 60s Pro for short ads | **Run end-to-end inside one Fluid Compute function** (`maxDuration = 300`). Server polls Gemini Files API internally; client makes ONE `POST /api/gemini/analyze` and waits. |
| Scenario | `POST` start → returns `jobId` → poll `/v1/jobs/{jobId}` (often several minutes) | Cannot run synchronously even at 300s | **Two-route async pattern**: client kicks `POST /api/scenario/start` (returns `{ jobId }` in seconds), then client polls `GET /api/scenario/status?jobId=...` every 3-5s. The `status` route is a thin proxy to `/v1/jobs/{jobId}`. |

**When to use:** Required by Vercel timeout constraints. Sensor Tower may also need this if a scan exceeds 60s — but typical responses are sub-30s.

**Trade-offs:**
- Pros: keeps secrets server-side; works on Hobby for the cheap routes; only Gemini needs Pro/Fluid; client UX shows progress meaningfully (Scenario percentage from job).
- Cons: client must own polling logic; need a "stuck job" timeout (PRD says retry-on-error, not infinite polling).

**Example — Scenario polling:**

```typescript
// app/api/scenario/start/route.ts
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(req: NextRequest) { /* validate, POST to /v1/generate/custom/{modelId}, return jobId */ }

// app/api/scenario/status/route.ts
export const runtime = "nodejs";
export const maxDuration = 10;
export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json(errorEnvelope("VALIDATION", "missing jobId"), { status: 422 });
  const r = await fetch(`https://api.cloud.scenario.com/v1/jobs/${jobId}`, {
    headers: { Authorization: `Basic ${process.env.SCENARIO_API_KEY}` },
  });
  const job = await r.json();
  return NextResponse.json({ ok: true, data: job });
}

// lib/scenario.ts (client)
export async function generateScenarioAd(prompt: ScenarioPrompt): Promise<CreativeOutput> {
  const start = await fetch("/api/scenario/start", { method: "POST", body: JSON.stringify(prompt) });
  const { data: { jobId } } = await start.json();
  // Poll with backoff, hard timeout at 8 min
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    await sleep(3000);
    const s = await fetch(`/api/scenario/status?jobId=${jobId}`);
    const { data: job } = await s.json();
    if (job.status === "success") return mapToCreativeOutput(job);
    if (job.status === "failed" || job.status === "canceled") throw new Error(`Scenario job ${job.status}`);
  }
  throw new Error("Scenario job timed out");
}
```

### Pattern 5: Suspense + Route-Segment `error.tsx` Boundaries

**What:**
- `app/project/loading.tsx` — first-paint Suspense fallback for the wizard shell.
- `app/project/error.tsx` — wizard-scoped error boundary that renders a "Something broke, click to reset" UI without crashing the whole app.
- `app/error.tsx` — root catch-all.
- **Inline error UI per step** for API failures (PRD requires per-API loading + retry) — these are NOT thrown; they're stored in the Zustand store as a per-step status flag (e.g., `marketScan: { status: "error", message: "..." }`).

**When to use:** PRD-mandated. Each step has its own loading text and retry button — that's UI state, not a thrown error. Reserve `error.tsx` for unexpected crashes only.

### Pattern 6: Dev Mock Toggle Branches in the Service Layer

**What:** `NEXT_PUBLIC_USE_DEV_MOCKS=true` is read at the **top of each `lib/{provider}.ts`** function. If true → return data from `data/devMockAds.ts` (or equivalent). If false → call `/api/*`. **Never** branch in components or in route handlers — single decision point.

**When to use:** Local dev without API keys, or hackathon demo backup. PRD forbids silent fake-data fallback in live mode, so the branch must be explicit and visible.

```typescript
if (process.env.NEXT_PUBLIC_USE_DEV_MOCKS === "true") return mockData; // visible, not silent
```

The `NEXT_PUBLIC_` prefix is mandatory for client-side reading; this is acceptable because the flag itself is not a secret.

---

## Data Flow

### Request Flow — Sensor Tower (representative)

```
[User clicks "Run Market Scan"]
     ↓
[MarketScanStep (client)]
     ↓ calls
[lib/sensorTower.ts → fetchSensorTowerAds(config)]
     ↓ POST /api/sensor-tower/scan
[app/api/sensor-tower/scan/route.ts]
     ↓ zod validate → call Sensor Tower API with SENSOR_TOWER_API_KEY
[Sensor Tower API]
     ↓ raw response
[Route handler: rank by SoV/impressions/spend/recency → MarketScanResult]
     ↓ JSON { ok: true, data: MarketScanResult }
[lib/sensorTower.ts: parse + type-check]
     ↓
[useApp.setMarketScanResult(...)]
     ↓
[All subscribers re-render: TopAdsRanking, MarketKpiCards]
```

### Request Flow — Gemini (synchronous on server)

```
[User clicks "Analyze Selected Ad with Gemini"]
     ↓
[lib/gemini.ts → analyzeSelectedAdWithGemini(ad, game)]
     ↓ POST /api/gemini/analyze  (stays open 30–90s)
[Route handler — Fluid Compute, maxDuration 300]
  1. Fetch ad.videoUrl (or pass URL through)
  2. Upload to Gemini Files API (or use inline if < 20MB)
  3. Poll file.state until "ACTIVE"
  4. generateContent(prompt + file)
  5. Parse JSON → GeminiAdAnalysis (zod)
     ↓ JSON
[lib/scoring.ts → generateTopPatterns(analysis, ad, game)]   ← runs CLIENT-SIDE, pure
     ↓
[useApp.setGeminiAnalysis(...) + setTopPatterns(...)]
```

### Request Flow — Scenario (async with polling)

```
[User clicks "Generate 30s Ad with Scenario"]
     ↓
[lib/scenario.ts → generateScenarioAd(prompt)]
     ↓ POST /api/scenario/start
[Route handler] → POST /v1/generate/custom/{modelId} → returns { jobId }
     ↓
[Client poll loop, 3–5s interval, 8-min hard cap]
     GET /api/scenario/status?jobId=…
       → Route handler GET /v1/jobs/{jobId}
       → returns { status, progress, assetUrl? }
     ↓ on status === "success"
[useApp.setCreativeOutput({ ..., scenarioVideoUrl, status: "complete" })]
```

### State Management

```
                     ┌─────────────────────────────┐
                     │  useApp() — Zustand store    │
                     │  AppState + actions          │
                     │  persist → localStorage      │
                     └────┬───────────────┬─────────┘
                          │ subscribe     │ subscribe
                          ▼               ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ MarketScanStep   │  │ PatternAnalysisStep │
              └────────┬─────────┘  └─────────┬─────────┘
                       │ setX(...)             │ setX(...)
                       ▼                       ▼
                     useApp.setState — single source of truth
```

### Key Data Flows

1. **Step → Step handoff:** Each step writes its output (`gameIdentity`, `marketScanResult.selectedAd`, `selectedPattern`) to the store; the next step reads it on mount and is disabled if the prerequisite is missing. A guard hook returns the user to the earliest unfilled step on hydration.
2. **Loading & error per API:** Each step also has a local `status: "idle" | "loading" | "error" | "success"` slice (kept in the store, not persisted, so refresh = idle). PRD's mandated loading texts come from a constants file used by `<LoadingState>`.
3. **Persistence boundary:** Heavy fields (`marketScanResult.ads`, `geminiAnalysis`) are persisted; transient `status` flags and Scenario polling state are NOT persisted (`partialize`).

---

## Vercel Timeout Constraint Cheat Sheet

| Plan | Default | Max (synchronous) | Max with Fluid Compute | Verdict for this app |
|------|---------|-------------------|------------------------|---------------------|
| Hobby | 10s | 60s (`maxDuration`) | 300s | **Insufficient** for `/api/gemini/analyze` if videos are >30s of content. Sensor Tower + Scenario start/status fit. |
| Pro | 15s | 300s | 800s | **Recommended for the demo.** Set `maxDuration = 300` on `/api/gemini/analyze` with Fluid Compute. |

**Decision for the hackathon:** target Pro (or Hobby + Fluid Compute = up to 5 min) and configure each route explicitly:

```typescript
// app/api/gemini/analyze/route.ts
export const runtime = "nodejs";
export const maxDuration = 300;     // requires Fluid Compute on Hobby
export const dynamic = "force-dynamic";
```

If hackathon runs on Hobby without Fluid Compute, the only safe path is the **Scenario-style two-route polling pattern for Gemini too** (kick a job → poll). For MVP, prefer enabling Fluid Compute and keeping the Gemini route synchronous.

---

## Build Order — Mapping PRD's 10 Phases to 5–7 GSD Phases

The PRD's 10 phases are fine-grained. For GSD we recommend grouping into **6 phases**:

| GSD Phase | PRD Phases | Includes | Why grouped |
|-----------|-----------|----------|-------------|
| **P1 — Foundation** | PRD 1 | Next.js 15 scaffold, Tailwind, design tokens, `app/layout`, `app/page` (landing), `components/landing/*`, `components/ui/*` (Button, Card, Badge, LoadingState first), `lib/types.ts`, `lib/state.ts` (empty store), `data/games.ts`, `.env.local.example` | Static surface + types + store. Nothing depends on APIs yet. Verifiable: landing renders, `/project` placeholder renders. |
| **P2 — Wizard Shell + Game Identity** | PRD 2 + 3 | `app/project/page.tsx`, `AppShell`, `Sidebar`, `TopBar`, `WorkflowTabs`, `GameIdentityStep` + sub-fields, store hydration logic | Game step has no external API → ideal for proving the wizard plumbing (state, tab nav, persist). |
| **P3 — Market Scan (Sensor Tower)** | PRD 4 + 5 | `lib/sensorTower.ts`, `lib/api/{schemas,errors,env}.ts`, `app/api/sensor-tower/scan/route.ts`, `MarketScanStep`, `MarketScanConfig`, `MarketKpiCards`, `TopAdCard`, `TopAdsRanking`, `AdsGrid`, `data/devMockAds.ts`, ad selection wiring | First end-to-end API integration. Establishes the route-handler pattern + dev-mock branch + zod + error envelope reused by P4 and P5. |
| **P4 — Pattern Analysis (Gemini + scoring)** | PRD 6 + 7 | `lib/gemini.ts`, `app/api/gemini/analyze/route.ts` (Fluid Compute config), `lib/scoring.ts`, `prompts/gemini-video-analysis.md`, `prompts/pattern-extraction.md`, `PatternAnalysisStep`, `GeminiAnalysisPanel`, `SceneFlowTimeline`, `PatternCard`, `PatternRanking`, `PatternMappingTable` | The "wow" step. Highest technical risk (long-running, Files API, video URL handling). Isolated phase = budget for retry/refinement. |
| **P5 — Creative Output (Scenario)** | PRD 8 + 9 | `lib/scenario.ts`, `app/api/scenario/{start,status}/route.ts`, `prompts/creative-brief-generation.md`, `prompts/scenario-prompt-generation.md`, `CreativeOutputStep`, `CreativeBriefEditor`, `ScenarioPromptPreview`, `ScenarioVideoPreview`, `CreativeRationale`, polling client logic | Two-route async pattern with longest UX. Depends on P4's selected pattern. |
| **P6 — Polish + Vercel Readiness** | PRD 10 | `error.tsx` boundaries, Suspense `loading.tsx`, design QA pass, `vercel.json` (per-route runtime/maxDuration), README, env example, deploy verification, dev-mock smoke test | Final hardening. Touches every route. |

**Dependency-blocking summary** (informs strict ordering):

```
lib/types.ts        ← blocks: all components, all lib/*, all routes
lib/state.ts        ← blocks: all step components
lib/api/{env,errors,schemas}.ts ← blocks: all route handlers
components/ui/*     ← blocks: all step components (atoms first)
P1 → P2             ← P2 needs the shell, types, store, ui atoms
P2 → P3             ← P3 needs WorkflowTabs + Game Identity output in store
P3 → P4             ← P4 needs selectedAd in store
P4 → P5             ← P5 needs selectedPattern in store
P3 → can run partially in parallel with P2 polish if scoped to the route handler only
P6 ← any time after P5 (but ideally last for Vercel deploy gate)
```

---

## Scaling Considerations

This is a hackathon demo with **single-user, single-project, no DB**. Scaling is essentially N/A, but for completeness:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–10 demo users | Current architecture is correct. |
| 100+ users / day | Add rate limiting on `/api/*` (Vercel KV or `@upstash/ratelimit`). Add caching of Sensor Tower scans by config hash for 1h. |
| 1k+ users | Move long-running Scenario polling out of the client into a queue (Inngest, QStash) so users can leave the page. Add a real DB for projects. Out of scope for MVP. |

### Scaling Priorities

1. **First bottleneck:** API key rate limits (Sensor Tower, Gemini, Scenario). Mitigation: per-IP rate limit on our routes.
2. **Second bottleneck:** Scenario job queueing (jobs can take minutes; tab close = lost result). Mitigation: webhook + persisted job IDs (out of MVP scope).

---

## Anti-Patterns

### Anti-Pattern 1: Calling provider SDKs directly from client components

**What people do:** Import `@google/genai` in a client component or expose the API key with a `NEXT_PUBLIC_` prefix.
**Why it's wrong:** Leaks the key to every visitor's browser bundle. PRD forbids it. Also breaks rate-limit accounting.
**Do this instead:** Always go through `app/api/*` route handlers. Read keys via `process.env.X` with no `NEXT_PUBLIC_` prefix. Validate at boot in `lib/api/env.ts`.

### Anti-Pattern 2: Putting wizard state in URL or React Context

**What people do:** Use `useSearchParams` / `nuqs` for `selectedAd`, or wrap the app in 4 nested context providers.
**Why it's wrong:** `selectedAd` and `geminiAnalysis` are large nested objects with video URLs — URL-state explodes the URL and leaks state into the address bar; nested contexts cause re-render storms and don't persist.
**Do this instead:** Single Zustand store with `persist` middleware. URL state only for `currentStep` if you want shareable deep-links (optional polish).

### Anti-Pattern 3: Synchronous waiting for Scenario inside a route handler

**What people do:** `POST /api/scenario/generate` that internally polls until done — can take 5–10 minutes, exceeds even Fluid Compute on Hobby.
**Why it's wrong:** Times out at 300s/800s, kills the function, user sees nothing.
**Do this instead:** Two-route pattern (`/start` returns `jobId`, `/status` polled by client). Documented in Pattern 4.

### Anti-Pattern 4: Silent fallback to mock data

**What people do:** Catch a Sensor Tower error and return mock ads "to keep the demo working".
**Why it's wrong:** PRD explicitly forbids it — credibility of the demo depends on "real market signal".
**Do this instead:** Show the error state with the mandated text + retry button. Mock data is gated by `NEXT_PUBLIC_USE_DEV_MOCKS=true` only.

### Anti-Pattern 5: Storing transient loading flags in `persist`

**What people do:** Persist the entire Zustand store, including `loading: true` flags.
**Why it's wrong:** Refreshing during a Gemini call brings back `loading: true` forever with no in-flight request.
**Do this instead:** Use `partialize` in Zustand `persist` to whitelist persisted fields (PRD `AppState` shape only); status flags live outside that whitelist.

### Anti-Pattern 6: Reading `prompts/*.md` from a client component

**What people do:** `import md from "@/prompts/gemini-video-analysis.md"` in a step component.
**Why it's wrong:** Ships the prompt to the browser, which (a) bloats the bundle and (b) leaks IP to anyone running the app. The prompt is server-only.
**Do this instead:** Read prompts inside route handlers via `node:fs` or a server-only loader (`import` with `?raw` in a server module).

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes / Gotchas |
|---------|---------------------|-----------------|
| Sensor Tower | Single POST round trip in route handler. Auth via `SENSOR_TOWER_API_KEY` header. | API contract not part of this research. PRD lists fields to retrieve — confirm endpoint shape during P3. |
| Gemini (Google AI) | `@google/genai` SDK in route handler. Files API: upload → poll until `ACTIVE` → `generateContent`. Use `responseSchema` (or zod-on-string) for structured `GeminiAdAnalysis`. | Files API is mandatory for video > 20MB. Polling interval ~ 1–2s. ACTIVE state can take 10–60s. Total route duration: 30–90s typical → must run on Fluid Compute. |
| Scenario | Two routes: `POST /v1/generate/custom/{modelId}` returns `jobId`; `GET /v1/jobs/{jobId}` polled. Auth via `SCENARIO_API_KEY` (Basic). | Jobs can take several minutes. Status values: `queued | processing | success | failed | canceled`. `metadata.assetIds` → resolve to download URL via `/v1/assets/{id}` if needed. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client component ↔ Zustand store | direct `useApp(selector)` | One store, no provider. |
| Client service `lib/{provider}.ts` ↔ Route handler `app/api/*/route.ts` | `fetch()` JSON over same origin | Stable typed envelope `{ ok, data | code, message }`. |
| Route handler ↔ External API | provider SDK or `fetch` with secret header | Secrets accessed only via `lib/api/env.ts` (throws if missing at boot). |
| `lib/scoring.ts` ↔ Pattern UI | pure function called in client after Gemini response arrives | No I/O — easy to unit test. |
| `prompts/*.md` ↔ Route handlers | `node:fs.readFileSync` at module load (cached) | Server-only, never imported by client. |

---

## Open Questions / Risks

1. **Sensor Tower endpoint contract** — PRD lists fields but no URL/auth shape. Resolve in P3 spike before implementing the route handler.
2. **Gemini route duration** — confirm whether typical 30s ad analysis fits in 300s Fluid Compute window. If borderline, may need to switch Gemini to two-route async like Scenario. Test in P4 spike.
3. **Scenario model selection** — which `{modelId}` produces 30s vertical mobile ads? Resolve in P5 spike (likely Kling-v2-1 or similar; check `docs.scenario.com/docs/video-generation`).
4. **Hobby vs Pro** — confirm Vercel plan available for the demo before committing to Fluid Compute.

---

## Sources

- [Vercel — Configuring Maximum Duration for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration) — HIGH
- [Vercel — Functions Limits](https://vercel.com/docs/functions/limitations) — HIGH
- [Vercel changelog — Serverless Functions can now run up to 5 minutes](https://vercel.com/changelog/serverless-functions-can-now-run-up-to-5-minutes) — HIGH
- [Next.js — Route Handlers (App Router)](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — HIGH
- [Dub blog — Using Zod to validate Next.js API Route Handlers](https://dub.co/blog/zod-api-validation) — MEDIUM
- [Google AI — Video understanding (Gemini API)](https://ai.google.dev/gemini-api/docs/video-understanding) — HIGH
- [Google AI — Files API (Gemini)](https://ai.google.dev/gemini-api/docs/files) — HIGH
- [Scenario — Video Generation](https://docs.scenario.com/docs/video-generation) — HIGH
- [Scenario — API Examples / Quick Start](https://help.scenario.com/en/articles/getting-started-with-api-example/) — HIGH
- [Zustand — `persist` middleware + Next.js SSR (issue #1145)](https://github.com/pmndrs/zustand/issues/1145) — MEDIUM
- [Zustand — Next.js hydration discussion #2788](https://github.com/pmndrs/zustand/discussions/2788) — MEDIUM
- [Zuplo — Asynchronous Operations in REST APIs](https://zuplo.com/learning-center/asynchronous-operations-in-rest-apis-managing-long-running-tasks) — MEDIUM
- [Inngest — How to solve Next.js timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts) — MEDIUM

---
*Architecture research for: Voodoo Creative Radar (Next.js 15 App Router + serverless API proxies)*
*Researched: 2026-04-25*
