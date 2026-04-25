# Stack Research

**Domain:** Frontend-only Next.js 16 App Router app proxying 3 third-party APIs (Sensor Tower, Google Gemini, Scenario), 4-step wizard UI, vertical 30s video preview, Vercel deploy, no DB
**Researched:** 2026-04-25
**Confidence:** HIGH

---

## Executive Summary

Voodoo Creative Radar is a thin, opinionated Next.js 16.2 app: server-side route handlers proxy three external APIs (to keep secrets off the client), a Zustand v5 store with `persist` middleware drives the 4-step wizard, Tailwind CSS v4.1 produces the premium light UI, and the final 30s vertical MP4 plays in a native HTML5 `<video>` element. **No database, no ORM, no auth, no dark mode lib.** Every dependency below is justified by an explicit PRD constraint; everything else is in "What NOT to Use".

The stack is intentionally boring: it leverages defaults from `create-next-app@latest --yes` (TypeScript, Tailwind, ESLint, App Router, Turbopack) plus exactly three runtime additions: `zustand`, `clsx`, and `tailwind-merge`.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | `16.2.4` | Full-stack React framework with App Router, route handlers, Vercel-native deploy | PRD-imposed. Next.js 16 ships Turbopack as default bundler, ~400% faster `next dev`, native React 19.2 support, Vercel-optimized. Route handlers are the right primitive to proxy 3 third-party APIs while keeping API keys server-only. |
| **React** | `19.2.x` | UI rendering library | Bundled with Next 16; provides Server Components (used to read `process.env` server-side), `use()` hook, and Actions. No need to add separately when scaffolding via `create-next-app@latest`. |
| **TypeScript** | `5.6.x+` (strict) | Static typing for the entire codebase | PRD imposes TS. Strict mode catches the many `MarketAd`, `GeminiAdAnalysis`, `CreativePattern` shape mismatches that will otherwise leak into runtime UI bugs. |
| **Tailwind CSS** | `4.1.x` | Utility-first styling, design tokens via `@theme` | PRD imposes Tailwind. v4 is stable since Jan 2025, v4.1 (Apr 2025) is current. Zero-config with `@import "tailwindcss"` + PostCSS plugin — no `tailwind.config.js` needed in v4 (theme lives in CSS via `@theme`). Faster than v3 thanks to Oxide engine. |
| **pnpm** | `9.x` | Package manager | User default per global instructions. Faster install, content-addressable store, strict by default. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zustand** | `5.0.x` | Frontend wizard state + optional `localStorage` persistence | Step 4 wizard state must survive tab refresh per PRD. Zustand v5 = ~1.2 KB, hooks-only API, official `persist` middleware. Strictly better than React Context for cross-step writes (avoids re-render avalanches). |
| **clsx** | `2.1.x` | Conditional className composition | Tiny (240 B). Standard alongside Tailwind for `<div className={clsx("base", isActive && "ring-2")}>`. |
| **tailwind-merge** | `2.5.x` | De-duplicates conflicting Tailwind classes when merging via props | Lets `Button.tsx` accept `className` prop without class collisions (e.g., `bg-zinc-900` overriding default `bg-white`). Used jointly with `clsx` in a `cn()` utility. |
| **lucide-react** | `0.468.x+` | Icon set (light, line-style, matches premium aesthetic) | Tree-shakeable, ~16 KB per icon used. Better fit for the "premium light, slightly gaming" brief than Heroicons (too generic) or Tabler (too dense). Optional but recommended for the workflow cards on landing + tab icons. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ESLint flat config (`eslint.config.mjs`)** | Linting | Default in `create-next-app` since Next 15. Use `eslint-config-next` preset. Flat config is the only supported format in ESLint v9+. |
| **Prettier** | Formatting | Pair with `prettier-plugin-tailwindcss` to auto-sort utility classes. Ships independently from ESLint. |
| **TypeScript LSP (workspace version)** | Editor type-checking | Enable "Use Workspace Version" in VS Code; Next.js ships a custom TS plugin that catches Server/Client component boundary errors. |
| **Turbopack** | Dev + build bundler | Default in Next 16 — no opt-in needed. Set `NEXT_TURBOPACK=1` is no longer required. |

---

## Installation

```bash
# 1. Scaffold (one command — accepts all 2026 defaults: TS, Tailwind v4, ESLint flat, App Router, Turbopack, AGENTS.md)
pnpm create next-app@latest voodoo-creative-radar --yes

cd voodoo-creative-radar

# 2. Runtime deps (only three)
pnpm add zustand clsx tailwind-merge

# 3. Optional: icons for the premium UI
pnpm add lucide-react

# 4. Dev deps (Prettier + Tailwind class sorter)
pnpm add -D prettier prettier-plugin-tailwindcss
```

**Resulting `package.json` runtime section (target):**

```json
{
  "dependencies": {
    "next": "16.2.4",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "zustand": "^5.0.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/postcss": "^4.1.0",
    "postcss": "^8.4.49",
    "eslint": "^9.15.0",
    "eslint-config-next": "16.2.4",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.9"
  }
}
```

---

## Detailed Decisions (Per PRD Question)

### 1. Next.js version + App Router patterns — **Route Handlers, not Server Actions, for the 3 API proxies**

- **Version:** Next.js `16.2.4` (latest stable as of Apr 2026, source: nextjs.org/docs/app/getting-started/installation, lastUpdated 2026-04-23).
- **Pattern: route handlers** (`app/api/sensortower/route.ts`, `app/api/gemini/route.ts`, `app/api/scenario/route.ts`).
- **Why route handlers > server actions for this project:**
  - The wizard has explicit "Run Market Scan" / "Analyze with Gemini" / "Generate Ad" buttons firing fetches — that's an RPC pattern, not a form mutation.
  - The Sensor Tower call needs a clear loading state (PRD imposes literal text `Running Sensor Tower scan...`). Route handlers compose cleanly with `fetch` + `AbortController` from a client component using `useTransition`.
  - Scenario generation is long-running (video gen). Route handlers can stream / poll easily; server actions are awkward for non-form long-running ops.
  - Server actions are a better fit when CSRF-safe form submissions or progressive enhancement matter — neither applies here.
- **Caching strategy per route:**
  - Sensor Tower: `cache: 'no-store'` — PRD says "live, no preloaded database, no silent fallback". Live means live.
  - Gemini: `cache: 'no-store'` — analysis is per-ad, never cacheable.
  - Scenario: `cache: 'no-store'` — generation is per-prompt.
  - Add `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'` (not edge) on each handler — Sensor Tower SDK and Gemini Node SDK assume Node runtime; edge runtime breaks them.

### 2. TypeScript strict config

```jsonc
// tsconfig.json (delta from create-next-app default)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,    // catches ads[0] possibly undefined
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,  // matches PRD types with `?:` cleanly
    "moduleResolution": "bundler",
    "target": "ES2022",
    "paths": { "@/*": ["./*"] }
  }
}
```

Rationale: `noUncheckedIndexedAccess` is critical because the PRD types use bare arrays (`MarketAd[]`, `topPatterns: CreativePattern[]`) and the wizard renders `ads[0]`-style indexed access when picking a top-ranked ad — without this flag, an empty array silently typechecks.

### 3. Tailwind CSS v4 vs v3 — **Pick v4.1**

- **v4 stable since Jan 22, 2025; v4.1 is the current line as of Apr 2026.**
- v4 advantages aligned with this PRD:
  - **Zero JS config file** — theme lives in `globals.css` under `@theme { ... }`, easier to express the "one accent color, charcoal type, off-white surfaces" tokens directly.
  - **PostCSS-only setup** — single `@tailwindcss/postcss` plugin, no `content: [...]` array (auto-detection).
  - **Faster builds** with Oxide engine, matters less on a small app but matters on Turbopack HMR.
- **No reason to pick v3** unless integrating with a legacy plugin not yet ported (none are needed here).
- **Setup:**
  - `postcss.config.mjs` → `{ plugins: { "@tailwindcss/postcss": {} } }`
  - `app/globals.css` → `@import "tailwindcss";` then `@theme { --color-accent: oklch(...); --color-surface: ...; }` for the design tokens.
  - No `tailwind.config.js`.

### 4. State management — **Zustand v5 with `persist` middleware**

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Zustand v5** | ✅ Pick | 1.2 KB, hooks-only, official `persist({ name: 'voodoo-radar-state', storage: createJSONStorage(() => localStorage) })`. The PRD `AppState` shape is one flat object — exactly Zustand's sweet spot. Survives wizard refresh via localStorage in 5 lines. |
| **Jotai** | ❌ Skip | Atom-per-field model fights the PRD's monolithic `AppState` type. Persistence (`atomWithStorage`) is per-atom = lots of storage keys. Overkill for a 4-step wizard. |
| **React Context + useReducer** | ❌ Skip | Will trigger full subtree re-renders when any wizard field changes (e.g., editing a tag re-renders the video preview). Tedious to wire `localStorage` manually. |
| **nuqs (URL state)** | ❌ Skip for app state, ⚠️ optional for one thing | Wizard data (Gemini analysis JSON, Scenario video URL) is too large for URL. *However*, you could store only `currentStep` in the URL with `nuqs` for shareable links — not required by PRD, defer. |
| **Redux Toolkit** | ❌ Hard skip | Overkill for ~10 fields and zero async middleware needs. |

**Implementation sketch:**

```ts
// lib/state.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppState } from '@/lib/types'

type AppStore = AppState & {
  setGameIdentity: (g: GameIdentity) => void
  setMarketScanResult: (r: MarketScanResult) => void
  // ...etc
  reset: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentStep: 'game',
      setGameIdentity: (gameIdentity) => set({ gameIdentity, currentStep: 'market' }),
      // ...
      reset: () => set({ currentStep: 'game' }),
    }),
    {
      name: 'voodoo-radar-state',
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient generation status
      partialize: (state) => ({
        currentStep: state.currentStep,
        gameIdentity: state.gameIdentity,
        marketScanResult: state.marketScanResult,
        selectedAd: state.selectedAd,
        geminiAnalysis: state.geminiAnalysis,
        topPatterns: state.topPatterns,
        selectedPattern: state.selectedPattern,
        creativeBrief: state.creativeBrief,
      }),
    }
  )
)
```

### 5. Form/input primitives — **Custom Tailwind primitives, no shadcn**

- The PRD already lists `components/ui/Button.tsx`, `Card.tsx`, `Select.tsx`, `Input.tsx`, `Textarea.tsx`, `Tabs.tsx`. Build them as ~30-line styled wrappers around native HTML.
- **Why not shadcn/ui:** Adds Radix UI primitives (~40 KB), CVA, and the shadcn CLI workflow. For 8 simple, on-brand components you control 100% of the visual design (premium light UI is the whole differentiator), this is overkill *and* introduces dark-mode-aware tokens you'd have to fight.
- **One Radix primitive worth borrowing if needed:** `@radix-ui/react-tabs` for the workflow tabs (keyboard nav + ARIA). But for a 4-tab static layout, plain `<button>` + Zustand state is enough.
- **Tags editor**: native `<input>` + comma-split, no need for a multi-select lib at MVP scale.

### 6. Video player component — **Native HTML5 `<video>` element, NOT react-player or mux-player**

Two videos to render in this app, both MP4:

- **Step 3:** Selected ad's source video (URL from Sensor Tower).
- **Step 4:** Scenario-generated 30s vertical ad output.

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Native `<video>`** | ✅ Pick | Zero dependencies, ~5 lines, supports MP4 natively in all modern browsers (PRD targets Chrome 111+/Safari 16.4+). Vertical aspect via Tailwind `aspect-[9/16]` class. Built-in `controls`, `poster`, `playsinline`, `muted autoplay` for ad preview. |
| **react-player** | ❌ Skip | 200+ KB. Designed for multi-protocol (YouTube, Twitch, HLS, DASH). Sensor Tower delivers MP4 URLs, Scenario delivers MP4 URLs — no need. |
| **mux-player** | ❌ Skip | Mux-hosted streaming optimization. No Mux integration here. |
| **Vidstack** | ❌ Skip | Excellent player, but you're showing 2 short MP4s, not building a streaming UI. |

**Recommended JSX for the Scenario output:**

```tsx
<video
  src={creativeOutput.scenarioVideoUrl}
  controls
  playsInline
  className="aspect-[9/16] w-full max-w-[360px] rounded-2xl shadow-lg ring-1 ring-zinc-200"
  poster={ad.thumbnailUrl}
/>
```

### 7. Server-side fetching + caching for live Sensor Tower

**Strategy: no caching, opt-out explicitly. PRD says "live, no fallback".**

```ts
// app/api/sensortower/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const config: MarketScanConfig = await req.json()
  const res = await fetch('https://api.sensortower.com/...', {
    cache: 'no-store',                              // never cache
    headers: { Authorization: `Bearer ${process.env.SENSOR_TOWER_API_KEY!}` },
    body: JSON.stringify(buildPayload(config)),
    method: 'POST',
  })
  if (!res.ok) {
    return Response.json({ error: 'sensortower_failed', status: res.status }, { status: 502 })
  }
  return Response.json(await res.json())
}
```

- **No `revalidate`**: the 3 dropdowns (numberOfAds, timeRange, market) make every call distinct anyway.
- **Error path**: return 502 with a structured `{ error, status }` body so the client can display the PRD's required retry button — no silent fallback to mock data.
- **Dev mock toggle** (per PRD): the *client* checks `process.env.NEXT_PUBLIC_USE_DEV_MOCKS === 'true'` and returns `data/devMockAds.ts` directly instead of calling `/api/sensortower`. Never read the dev-mock flag inside the route handler — keep production code paths clean.

### 8. Env management — **3 server-only secrets, 1 public flag**

**`.env.local` (gitignored):**

```env
# Server-only — consumed only inside route handlers via process.env
SENSOR_TOWER_API_KEY=<secret>
GEMINI_API_KEY=<secret>
SCENARIO_API_KEY=<secret>

# Public — exposed to client bundle, read in components
NEXT_PUBLIC_USE_DEV_MOCKS=false
```

**Rules:**
- API keys MUST stay server-only (no `NEXT_PUBLIC_` prefix). Inlining a key with `NEXT_PUBLIC_` ships it to every browser and exposes the SDK quota.
- Never import `lib/sensorTower.ts`, `lib/gemini.ts`, `lib/scenario.ts` from a client component. Mark them with `import 'server-only'` at the top to make Next.js error at build time on accidental client import.
- `.env.local.example` (committed) lists all four keys with empty values — referenced explicitly in the PRD acceptance criteria.
- On Vercel, set the same three secret keys via dashboard → Project → Settings → Environment Variables. `NEXT_PUBLIC_USE_DEV_MOCKS` should NOT be set in Vercel production (defaults to undefined → falsy → real API calls).

### 9. Linting/format — **ESLint flat config + Prettier (NOT Biome for this project)**

| Choice | Decision |
|--------|----------|
| **ESLint flat config (`eslint.config.mjs`)** with `eslint-config-next` | ✅ Default in `create-next-app@latest`. Includes `next/core-web-vitals` rules — important to keep `<Image>` and `<Link>` usage correct. |
| **Prettier** + `prettier-plugin-tailwindcss` | ✅ Auto-sorts Tailwind classes — keeps the 8 UI components diffs readable. |
| **Biome** | ❌ Skip — Biome 2.2.x is fast and tempting (and offered by `create-next-app` since Next 16), but: (1) `eslint-config-next` has Next-specific rules Biome lacks; (2) for an 11-day hackathon there's zero ROI to learning Biome's rule names; (3) Prettier-plugin-tailwindcss ecosystem is more mature than Biome's Tailwind formatting. Reconsider Biome for a long-running project. |

**Note:** Starting with Next.js 16, `next build` no longer runs the linter. Add explicit `pnpm lint` to the pre-push hook or CI step.

### 10. Package manager — **pnpm 9.x**

- User global preference (per global instructions: "pnpm plutôt que npm pour les projets Node").
- Vercel detects `pnpm-lock.yaml` automatically — zero config.
- `pnpm create next-app@latest --yes` works identically to `npx create-next-app@latest`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand | Jotai | If state evolves into many independent reactive cells (e.g., per-pattern editing) — not the case here |
| Zustand | nuqs | If you want shareable wizard URLs — defer post-MVP |
| Native `<video>` | Vidstack | If you later need custom controls, captions, frame scrubbing |
| Tailwind v4 | Tailwind v3 | Only if a critical Tailwind v3 plugin you depend on hasn't been ported (not the case here) |
| Route handlers | Server actions | If wizard becomes form-driven with progressive enhancement |
| ESLint + Prettier | Biome | For a long-running codebase where 10x lint speed matters at scale |
| Custom UI primitives | shadcn/ui | If you need >15 complex primitives (combobox, command palette, drawer) — overkill for 8 simple ones |
| pnpm | npm | If a deploy pipeline forbids pnpm (Vercel doesn't) |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Any database / ORM (Prisma, Drizzle, Supabase, Postgres)** | PRD explicit: "No database. Frontend state only." | Zustand `persist` to localStorage |
| **Auth library (NextAuth, Clerk, Supabase Auth)** | No user accounts in MVP | Nothing |
| **Dark mode lib (`next-themes`)** | PRD: "No dark mode dominant" — light only | Hardcoded light tokens in `@theme` |
| **Redux Toolkit** | 30 KB+ for ~10 state fields, async middleware overkill for 3 fetches | Zustand |
| **react-player / mux-player / Vidstack** | Two MP4 URLs need a `<video>` tag, not a streaming SDK | Native `<video>` |
| **shadcn/ui (full)** | Brings Radix + CVA + dark-mode tokens you'd have to disable | 8 hand-rolled Tailwind components |
| **Tailwind v3** | v4 is stable 15 months, simpler config, faster | Tailwind v4.1 |
| **`next lint`** | Removed in Next 16 — `next build` no longer lints | `eslint` CLI directly via package.json script |
| **Edge runtime on API routes** | Sensor Tower / Gemini SDKs assume Node APIs (Buffer, fs); edge breaks them | `export const runtime = 'nodejs'` on each route handler |
| **`NEXT_PUBLIC_` prefix on API keys** | Ships the secret in the client JS bundle | Server-only env vars consumed in route handlers |
| **SWR / TanStack Query** | Three discrete one-shot fetches with explicit retry buttons. No revalidation, no polling, no infinite scroll. | Plain `fetch` inside a `useTransition` |
| **Framer Motion / GSAP** | PRD: "Minimal premium motion. No unnecessary animations." | Tailwind `transition-*` utilities |
| **`tailwind.config.js`** | Not needed in v4 — theme moves to CSS `@theme` | `globals.css` with `@theme { ... }` |
| **`getServerSideProps` / `getStaticProps`** | Pages Router APIs; this is App Router | Server components + route handlers |

---

## Stack Patterns by Variant

**If demo time is < 6 days (worst-case hackathon time):**
- Skip `tailwind-merge` and `lucide-react`; use emoji or plain text for icons; let Tailwind class collisions ride for 8 components.
- Skip `persist` middleware; rebuild state on refresh — accept the tradeoff for speed.

**If a 4th game is added post-MVP:**
- No stack change; the `data/games.ts` array grows. Stay clear of any "game database" temptation.

**If multi-user / saved projects emerge as a real requirement:**
- Stack must change: add Supabase (matches user's global preferences), promote `+ New Project` button to functional, gate routes with Supabase Auth. Out of scope for MVP per PROJECT.md.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.2.x` | `react@19.2.x`, `react-dom@19.2.x` | Strict pairing — Next 16 minor version dictates React peer. |
| `tailwindcss@4.1.x` | `@tailwindcss/postcss@4.1.x` (same minor), `postcss@8.4+` | v4 is a single repo; mismatched minors break. |
| `zustand@5.0.x` | `react@18.x` and `react@19.x` | v5 dropped React 17 support; required for React 19 in StrictMode. |
| `eslint@9.x` | `eslint-config-next@16.2.x` | Flat config only — `.eslintrc.json` not loaded under v9. |
| `prettier@3.4.x` | `prettier-plugin-tailwindcss@0.6.9+` | 0.6.9+ supports Tailwind v4 class detection. |
| `node@20.9+` | All of the above | Next 16 minimum runtime. Vercel deploys default to Node 22. |

---

## Confidence Assessment

| Recommendation | Confidence | Source |
|----------------|------------|--------|
| Next.js 16.2.4 latest | HIGH | Official docs lastUpdated 2026-04-23 (nextjs.org/docs/app/getting-started/installation) |
| Tailwind v4.1 stable | HIGH | tailwindcss.com/blog (v4.0 Jan 2025, v4.1 Apr 2025) |
| React 19.2 with Next 16 | HIGH | Next.js 16.2 release notes |
| Route handlers > Server Actions for this case | HIGH | Pattern matches Next.js documented use cases (RPC over forms) |
| `cache: 'no-store'` for live APIs | HIGH | Context7 `/vercel/next.js` route handler docs |
| Zustand v5 + `persist` for wizard state | HIGH | Context7 `/pmndrs/zustand` persist middleware docs |
| Native `<video>` for 2 MP4s | HIGH | Browser support matrix; no streaming requirement |
| ESLint flat config (not Biome) | MEDIUM | Both supported by `create-next-app` in Next 16; choice is opinion + Next-specific rule coverage |
| `noUncheckedIndexedAccess` strict flag | MEDIUM | Best practice for array-heavy PRD types; may surface false positives requiring narrow assertions |
| pnpm preferred | HIGH | User global instructions explicit |

---

## Sources

- **Context7 `/vercel/next.js`** — verified Next.js 16.2.4 latest (versions list ends at v16.2.2 in cache; official docs confirm 16.2.4 lastUpdated 2026-04-23), route handler caching patterns, env variable access patterns. **HIGH confidence.**
- **Context7 `/pmndrs/zustand`** (v5.0.12) — verified `persist` + `createJSONStorage` + `partialize` API. **HIGH confidence.**
- **Context7 `/biomejs/biome`** (v2.2.4) — verified Biome is a viable alternative; opted out for project-specific reasons (Next-specific rule coverage). **HIGH confidence.**
- **Context7 `/47ng/nuqs`** — verified URL state management; opted out for primary state, retained as optional for `currentStep` deep-linking. **HIGH confidence.**
- **nextjs.org/docs/app/getting-started/installation** (lastUpdated 2026-04-23) — verified `create-next-app` defaults: TS, Tailwind, ESLint flat, App Router, Turbopack default, AGENTS.md option, ESLint vs Biome choice prompt. **HIGH confidence.**
- **tailwindcss.com/docs/installation/framework-guides/nextjs** — verified v4 install procedure for Next.js: `tailwindcss + @tailwindcss/postcss + postcss`, `postcss.config.mjs` plugin, `@import "tailwindcss";` in `globals.css`. **HIGH confidence.**
- **tailwindcss.com/blog** — verified v4.0 stable Jan 2025, v4.1 stable Apr 2025. **HIGH confidence.**
- **Source PRD** (`/Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md`) — primary constraint authority for "no DB", "frontend state only", "live Sensor Tower no fallback", env var names, file architecture, UI rules. **AUTHORITATIVE.**
- **PROJECT.md** (`/Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md`) — confirmed Vercel target, no DB, MVP scope, hackathon timeline. **AUTHORITATIVE.**

---
*Stack research for: Next.js 16 frontend-only API-proxy SPA with 4-step video-generation wizard*
*Researched: 2026-04-25*
