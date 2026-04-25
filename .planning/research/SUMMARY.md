# Research Summary — Voodoo Creative Radar

**Date:** 2026-04-25
**Confidence:** HIGH overall (HIGH on Stack/Features/Architecture · HIGH on Vercel/Gemini/Next.js pitfalls · MEDIUM on Scenario lifecycle · MEDIUM on Sensor Tower endpoint)

## Executive Summary

Voodoo Creative Radar is a tightly-scoped 4-step Next.js 16 wizard whose entire credibility rests on the demo sentence *"the creative is generated from a real market signal — not a generic prompt."* The PRD has done most of the architectural thinking; research's job was to lock versions, validate the proxy-route pattern, expose operational risks, and propose a build order that front-loads risk.

The PRD's 10 phases collapse cleanly into **6 GSD phases** respecting the strict dependency chain: Game → Sensor Tower → Selected Ad → Gemini → Selected Pattern → Brief → Scenario. Risk is concentrated in P4 (Gemini Files API + Vercel timeout + JSON schema + content moderation) and P5 (Scenario two-route polling). P3 (Sensor Tower) carries the highest narrative-credibility risk — any silent fallback to mock data destroys the thesis.

The dominant cross-cutting differentiator is the **visible trust chain** — every PRD anti-feature exists to keep that chain visible and must be defended against scope creep.

## Recommended Build Order — 6 GSD phases mapping the PRD's 10

| GSD Phase | Maps to PRD | Goal | Risk | Notes |
|-----------|-------------|------|------|-------|
| **P1 — Foundation** | PRD 1 + 10 setup | Lock stack, scaffold Next.js 16.2.4 + Tailwind v4.1 + Zustand v5 persist + design system + landing page | LOW | Front-loads tokens, copy, atoms, types, state. Hydration-safe pattern locked here. |
| **P2 — Wizard Shell + Game Identity** | PRD 2 + 3 | App shell, sidebar, 4 tabs, Step 1 (auto-fill, editable, persisted) | LOW | No external API. Validates state survives tab nav + refresh. |
| **P3 — Market Scan (Sensor Tower live)** | PRD 4 + 5 | Live API call + Top 3 ranking + ad selection. Establishes the route-handler + service-layer + dev-mock-branch + error-envelope + Zod-validation pattern reused by P4 + P5. | HIGH (narrative credibility) | DEV MOCK ribbon when `NEXT_PUBLIC_USE_DEV_MOCKS=true`. Spike: confirm endpoint contract from `voodoo-hack/api/sensortower.ts`. |
| **P4 — Pattern Analysis (Gemini full-video)** | PRD 6 + 7 | Files API upload → analyze → 3 scored patterns → selection. **The wow phase.** | HIGH (technical) | Fluid Compute (`maxDuration=300`). 15 named structured sections, no JSON dump. Pattern Mapping Table = demo screenshot. |
| **P5 — Creative Output (Scenario)** | PRD 8 + 9 | Editable brief → derived prompt → 30s 9:16 video via two-route polling | HIGH (technical) | Mandatory split: `POST /api/scenario/start` → `{ jobId }` ; client polls `GET /api/scenario/status?jobId=...`. Brief preserved on error. |
| **P6 — Polish + Vercel Readiness** | PRD 10 polish | Verification phase. `vercel.json` mirror, error/loading boundaries, secrets-leak audit, "no JSON anywhere" pass, env vars in all scopes, demo rehearsal. | MEDIUM | Treat as a pitfall checklist, not just polish. |

## Stack — Locked at Phase 1 (no revisits)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Next.js | `16.2.4` | App Router, Turbopack default, route handlers > server actions for explicit RPC |
| React | `19.2.x` | Bundled with Next 16 |
| TypeScript | `5.6+` strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | PRD insists on type safety for 3 external API contracts |
| Tailwind | `4.1.x` zero-config, `@import "tailwindcss"` + `@theme` in `app/globals.css` | No `tailwind.config.js` ; premium light tokens centralized |
| State | Zustand `5.0.x` + `persist` + `createJSONStorage(() => localStorage)` + `partialize` + `skipHydration: true` | Beats Jotai/Context/nuqs for flat ~10-field state, persistence, and SSR safety |
| Linter | ESLint flat config (`eslint.config.mjs`) + `eslint-config-next` + Prettier + `prettier-plugin-tailwindcss` | Biome rejected — Next-specific rule coverage matters more than perf for a hackathon |
| Package manager | pnpm `9.x` | User default; faster install on Vercel |
| Server-only enforcement | `import 'server-only'` on `lib/{sensorTower,gemini,scenario}.ts` + `lib/prompts.ts` | Compile-time guarantee secrets never reach the client |
| Video player | Native HTML5 `<video>` | No `react-player`/`mux-player`/`Vidstack` — over-engineering for 2 MP4s |
| Helpers | `clsx` + `tailwind-merge` for `cn()`; optional `lucide-react` for icons | Standard combo |

## Top 5 Critical Pitfalls (shape the roadmap)

1. **Vercel function timeout (default 10s Hobby / 15s Pro)** — Gemini takes 30-90s, Scenario 30-180s. Every `app/api/*/route.ts` MUST `export const maxDuration = 300` + `export const runtime = "nodejs"`. Mirror in `vercel.json`. Test on **deployed Preview**, not `next dev`.
2. **Sensor Tower error taxonomy (401/403/422/429/5xx)** — Discriminated union. Missing `ad_types` → 422. Auth = `auth_token` query string (NOT Bearer). Parse `Retry-After` for 429. Generic "something went wrong" + infinite-retry-on-401 is the most common silent demo failure.
3. **Gemini Files API upload flow** — Sensor Tower CDN URLs are signed/expiring/referrer-gated → cannot pass as `fileData.fileUri`. Mandatory: server-fetch bytes → `client.files.upload` → poll `files.get()` until `state==="ACTIVE"` → `createPartFromUri()` → `generateContent` with `responseMimeType: "application/json"` + `responseJsonSchema` + Zod boundary validation + `finishReason` check.
4. **Scenario two-route polling** — Single-route polling dies at timeout while the job continues to burn credits. Two routes + client-side polling (3-5s, 8-min cap, AbortController on unmount, jobId in localStorage for tab-refresh recovery) + lifecycle handling for all 5 statuses (`queued | processing | success | failed | canceled`).
5. **Hydration-safe state provider in P1** — Mount Zustand at root layout, set `skipHydration: true`, call `useApp.persist.rehydrate()` from `useEffect`, gate localStorage-dependent UI on `hydrated` flag, exclude transient `loading`/`error` flags from `partialize`. Cheap at P1, expensive after P4.

## Cross-cutting Must-Haves Threading Through Every Phase

- **Loading texts verbatim** as `lib/copy.ts` constants — never paraphrased
  - `Running Sensor Tower scan...`
  - `Analyzing selected ad with Gemini...`
  - `Generating creative brief...`
  - `Generating 30-second ad with Scenario...`
- **No JSON dump anywhere** — P1 enforces `<ErrorState>`/`<LoadingState>` atoms; P4 renders Gemini's 15 fields as labeled sections, never `JSON.stringify`; P6 grep audit
- **Visible trust chain** — Pattern Mapping Table (P4), derived read-only Scenario prompt (P5), Rationale section linking output back to source ad (P5)
- **No silent fallback to mock data in live mode** — `NEXT_PUBLIC_USE_DEV_MOCKS=true` only, with persistent yellow `DEV MOCK` ribbon when active; build-time assertion that production never has the flag set
- **Server-only enforcement** — `import 'server-only'` blocks client leakage at compile time

## Differentiators (the "wow" surface)

- **Pattern Mapping Table** (Phase 4) — `Market Pattern | Evidence | Adaptation to Game | Confidence`. The screenshot judges will retain.
- **Live Sensor Tower badge with timestamp** — proves the signal is real on demo day
- **Editable creative brief preserved across Scenario errors** — robustness signals craft
- **Derived read-only Scenario prompt** — visible chain from brief to API call

## Anti-features (defended in Out of Scope)

- No DB / backend persistence
- No dark mode / cyberpunk aesthetic
- No multi-project (the `+ New Project` button is visible-but-non-functional)
- More than 2 games (Marble Sort + Control Mob only)
- No frame extraction unless technically required
- No fallback to fake data in live mode

## Open Questions / Spikes Required

| Phase | Spike |
|-------|-------|
| P3 | Confirm Sensor Tower endpoint path + required `ad_types` + response shape (mirror `voodoo-hack/api/sensortower.ts`) |
| P3 | Sensor Tower video URL availability + TTL + referrer policy → fallback strategy for ads lacking `videoUrl` |
| P4 | Gemini 300s window vs typical 30-60s ad length on deployed Preview; confirm `gemini-2.5-pro` + safety thresholds for combat content |
| P5 | Scenario `modelId` supporting `aspectRatio: "9:16"` + `duration: 30` ; Basic auth Base64 `key:secret` |
| P6 | Confirm Vercel plan (Hobby + Fluid Compute vs Pro) before deploy |

## Phase Research Recommendations

- **Phase 3 (Market Scan)** → 🔍 deeper research (Sensor Tower endpoint contract)
- **Phase 4 (Pattern Analysis)** → 🔍 deeper research (Gemini Files API + structured output + safety)
- **Phase 5 (Creative Output)** → 🔍 deeper research (Scenario lifecycle + model selection)
- **Phase 1, 2, 6** → standard patterns, plan straight to implementation

## Sources

See per-domain research files for complete citation lists:
- `STACK.md` — Next.js / Tailwind / Zustand / Vercel docs
- `FEATURES.md` — DataCamp dashboard design, Mixpeek AI video tools, Uplifted creative briefs, Vercel design system
- `ARCHITECTURE.md` — Vercel docs, Next.js docs, Google AI Files API, Scenario API, Zustand persist + SSR
- `PITFALLS.md` — Context7 verified Vercel/Next.js/Gemini docs, Scenario API docs, voodoo-hack/api/sensortower.ts
