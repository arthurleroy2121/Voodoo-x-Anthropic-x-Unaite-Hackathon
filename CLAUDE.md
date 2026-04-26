# Voodoo Creative Radar — Claude Project Guide

Source of truth lives in `.planning/`. Read these in order before acting:

1. `.planning/PROJECT.md` — what this is, core value, requirements buckets, constraints, key decisions
2. `.planning/ROADMAP.md` — 10 phases mirroring the PRD, each with goal + success criteria + requirements
3. `.planning/REQUIREMENTS.md` — REQ-IDs and traceability to phases
4. `.planning/research/SUMMARY.md` — distilled stack/architecture/pitfalls (read full domain files for depth)
5. `.planning/STATE.md` — current phase + project memory
6. `voodoo-creative-radar-prd.md` — original PRD (verbatim source)

## Workflow

GSD methodology, phase by phase. For each phase:
- `/gsd-discuss-phase N` → gather context
- `/gsd-plan-phase N` → produce PLAN.md
- `/gsd-execute-phase N` → execute with atomic commits
- `/gsd-verify-work` after execution

Mode: **YOLO** (auto-approve). Granularity: standard. Workflow agents enabled (research, plan-check, verifier, nyquist). Models: balanced.

## Stack (locked at Phase 1)

- Next.js 16.2.x (App Router, Turbopack default), React 19.2, TypeScript 5.6+ strict
- Tailwind CSS 4.1.x (zero-config, `@theme` in `globals.css`, no `tailwind.config.js`)
- Zustand 5.x with `persist` + `partialize` + `skipHydration`
- ESLint flat config + Prettier + `prettier-plugin-tailwindcss`
- pnpm 9.x
- Native HTML5 `<video>` (no react-player / mux-player)
- `import 'server-only'` on `lib/{sensorTower,gemini,scenario,prompts}.ts`

## Critical rules (from PRD + research)

- **Sensor Tower live only.** Mock data only via `NEXT_PUBLIC_USE_DEV_MOCKS=true` with a visible `DEV MOCK` ribbon. Never silent fallback.
- **No raw JSON anywhere in the UI.** Render Gemini's 15 fields as labeled sections.
- **Loading texts verbatim** as `lib/copy.ts` constants:
  - `Running Sensor Tower scan...`
  - `Analyzing selected ad with Gemini...`
  - `Generating creative brief...`
  - `Generating 15-second ad with Scenario...`
- **Vercel timeouts**: every `app/api/*/route.ts` exports `maxDuration = 300` and `runtime = "nodejs"`. Mirror in `vercel.json`.
- **Gemini = Files API upload flow** (server-fetch bytes → upload → poll until `state==="ACTIVE"` → `generateContent` with `responseMimeType: "application/json"` + `responseJsonSchema` + Zod boundary validation + `finishReason` check). Never pass Sensor Tower CDN URLs directly.
- **Scenario = two-route polling**: `POST /api/scenario/start` → `{ jobId }`; client polls `GET /api/scenario/status?jobId=...` (3-5s, 8-min cap, AbortController on unmount, jobId in localStorage for refresh recovery).
- **Hydration-safe state from Phase 1**: Zustand at root layout, `skipHydration: true`, rehydrate via `useEffect`, gate localStorage UI on `hydrated` flag.
- **No DB, no dark mode, no multi-project, > 2 games. No.**

## Output

The MVP ships when a user can: pick a Voodoo game → run a live Sensor Tower scan → select one of the Top 3 ads → analyze it with Gemini → select one of 3 patterns → edit a brief → generate a Scenario prompt → pick a starting frame from the per-game seed gallery → produce a 15s vertical ad (chained 10s + 5s clips). Demo line: *"The creative is generated from a real market signal — not a generic prompt."*

## Voodoo-hack sandbox

`voodoo-hack/` is an independent Vite/React experiment with prior SensorTower MCP wiring. **Do not** modify it for this project unless explicitly asked. The Creative Radar is a separate Next.js app at the repo root.
