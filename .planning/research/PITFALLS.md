# Pitfalls Research — Voodoo Creative Radar

**Domain:** Hackathon demo · Next.js 15 App Router · 3 external APIs (Sensor Tower live, Gemini video, Scenario video gen) · Frontend-only state · Vercel deploy
**Researched:** 2026-04-25
**Confidence:** HIGH on Vercel/Gemini/Next.js technical limits (Context7 verified) · MEDIUM on Scenario job lifecycle (official docs partial) · MEDIUM on Sensor Tower creatives endpoint (no public OpenAPI; pattern inferred from existing `voodoo-hack/api/sensortower.ts` proxy + community sources)

> **Demo narrative at stake:** "The creative is generated from a real market signal — not a generic prompt." Every pitfall below has demo-day consequences. Severity ratings reflect impact on this single sentence.

---

## Critical Pitfalls

### Pitfall 1: Vercel function timeout kills Gemini video analysis mid-call

**What goes wrong:**
Gemini full-video analysis on a 30-60s ad takes 20-90 seconds end-to-end (upload via Files API + ACTIVE polling + generateContent). On Vercel **Hobby plan**, the default Node function timeout is **10s** (default) and the maximum is **300s** if explicitly set via `maxDuration`. On **Pro**, default is 15s with up to 800s ceiling (fluid compute). If `maxDuration` is not exported from the route handler, the function dies at 10-15s, the user sees "Function execution timed out" or a generic 504, and the Gemini call is silently aborted server-side while billing continues.

**Why it happens:**
Devs assume "I'm calling an async API, Vercel will wait." Wrong — the *route handler* itself must finish within the configured window. Default `maxDuration` is unset → falls back to 10s/15s. Worse, `next dev` has no timeout, so this only surfaces on the deployed preview.

**How to avoid:**
- In every route handler that touches Gemini or Scenario, export:
  ```ts
  // app/api/gemini/analyze/route.ts
  export const maxDuration = 300 // Hobby max — explicit
  export const runtime = 'nodejs' // NOT edge (Files API needs Node)
  ```
- Add a `vercel.json` mirror as belt-and-suspenders:
  ```json
  { "functions": { "app/api/gemini/**": { "maxDuration": 300 }, "app/api/scenario/**": { "maxDuration": 300 } } }
  ```
- Test on a **deployed preview**, not just `next dev`. `next dev` will not reproduce this failure.
- For Scenario polling, do NOT poll server-side in a single long-running route. **Split into two routes**: `POST /api/scenario/start` (returns `jobId`) and `GET /api/scenario/status?jobId=...`. Client polls every 3-5s.

**Warning signs:**
- "FUNCTION_INVOCATION_TIMEOUT" in Vercel logs
- Network tab shows request hanging exactly 10s or 15s before 504
- Local works, deployed fails

**Phase to address:** Phase 6 (Gemini service layer) and Phase 9 (Scenario generation). Phase 10 (Vercel readiness) MUST verify `maxDuration` exports exist in all API routes.

---

### Pitfall 2: API keys leaked to the browser (CORS-driven temptation)

**What goes wrong:**
Sensor Tower auth uses `auth_token` query param. Gemini and Scenario use Bearer/Basic. Devs panicking about CORS errors will instinctively prefix env vars with `NEXT_PUBLIC_` to "make it work" → secrets shipped in the JS bundle to every visitor. With `next build`, the bundle is committed to Vercel CDN and cannot be revoked without rotating the keys. Sensor Tower keys in particular are billed per call — a leaked key is a budget event.

**Why it happens:**
- "Why does my fetch to `api.sensortower.com` fail with CORS?" → wrong fix: expose the key client-side.
- The PRD specifies `NEXT_PUBLIC_USE_DEV_MOCKS=true` — the only env var that legitimately uses `NEXT_PUBLIC_`. Devs may pattern-match and prefix all keys.

**How to avoid:**
- The three secrets MUST stay server-only:
  ```env
  SENSOR_TOWER_API_KEY=...     # server only
  GEMINI_API_KEY=...           # server only
  SCENARIO_API_KEY=...         # server only
  SCENARIO_API_SECRET=...      # server only — Scenario uses Basic auth (key:secret)
  NEXT_PUBLIC_USE_DEV_MOCKS=false  # only NEXT_PUBLIC_ allowed
  ```
- All three integrations go through Next.js **route handlers** (`app/api/...`) acting as proxies. Browser → `/api/sensor-tower` → server fetches with secret → returns sanitized JSON. This matches the existing pattern in `voodoo-hack/api/sensortower.ts` (allowlist + `auth_token` in query).
- Add a build-time check: `grep -r "NEXT_PUBLIC_.*_API_KEY" app/ components/ lib/` should return nothing.
- Add the secrets to Vercel project env vars under **Production AND Preview AND Development** scopes. Missing one is a frequent demo-day surprise.

**Warning signs:**
- Browser network tab shows direct calls to `api.sensortower.com`, `generativelanguage.googleapis.com`, or `api.cloud.scenario.com`
- `view-source:` on deployed site contains `sk_`, `Bearer`, or token-shaped strings
- CORS errors are being "fixed" by env var changes rather than by adding a proxy route

**Phase to address:** Phase 4 (Sensor Tower service), Phase 6 (Gemini), Phase 9 (Scenario). **Every** integration phase. Phase 10 must include a "secrets audit" pass.

---

### Pitfall 3: Silent fallback to mock data in production (PRD violation)

**What goes wrong:**
A try/catch in `lib/sensorTower.ts` falls back to `data/devMockAds.ts` on error "to keep the demo working." During the demo, the live API hits a 401 (key not propagated to prod env), the fallback fires, the screen shows ads — but they are fake. The demo's entire narrative ("real market signal") becomes a lie. The audience cannot tell. The presenter cannot tell either until someone asks "where do these games come from?" The demo loses credibility.

**Why it happens:**
- "Just in case the API is down" defensive coding feels safe.
- Dev mock flag (`NEXT_PUBLIC_USE_DEV_MOCKS`) is left on in a preview deployment.
- The mock and live paths share UI components, so there's no visible diff.

**How to avoid:**
- The PRD explicitly forbids this: *"No silent fallback to fake data in live mode."* Encode it in code:
  ```ts
  // lib/sensorTower.ts
  export async function fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult> {
    if (process.env.NEXT_PUBLIC_USE_DEV_MOCKS === 'true') {
      // Visible badge in UI: "Using dev mocks"
      return loadDevMocks(config)
    }
    const result = await callLiveSensorTower(config)
    if (!result.ok) {
      // PROPAGATE the error. Do NOT fall back.
      throw new SensorTowerError(result.error, result.status)
    }
    return result.data
  }
  ```
- When `NEXT_PUBLIC_USE_DEV_MOCKS=true`, render a persistent yellow banner: `Dev mocks active — not real Sensor Tower data`.
- In Vercel Production env, **do not set** `NEXT_PUBLIC_USE_DEV_MOCKS` at all (it defaults to `false`). Force a build-time assertion:
  ```ts
  if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_USE_DEV_MOCKS === 'true') {
    throw new Error('Dev mocks must not run in production')
  }
  ```

**Warning signs:**
- Demo ads show the same game names every run
- Network tab in DevTools never shows a call to `/api/sensor-tower`
- KPI counts are too round (exactly 30 ads, exactly 5 networks)

**Phase to address:** Phase 4 (Sensor Tower wiring) — primary. Phase 10 (Vercel readiness) — verification of env var scopes.

---

### Pitfall 4: Sensor Tower error taxonomy collapsed into "something went wrong"

**What goes wrong:**
The service catches all errors and renders a single generic message. In reality four classes need distinct UX:
- **401/403 (auth)** → key missing or invalid → blocks the demo entirely; need to redeploy with corrected env var
- **422 (bad params)** → Sensor Tower requires `ad_types` (and other params); missing → rejected. (Confirmed: community MCP wrappers enforce `ad_types` to avoid 422.)
- **429 (rate limit)** → backoff with `Retry-After` header; do not show a hostile error
- **5xx (upstream down)** → retry once, then surface as transient

Treating them identically means the user clicks "Retry" infinitely on a 401.

**Why it happens:**
- Devs catch `error` as a string and render it. Status code is lost.
- Sensor Tower's response shape varies by endpoint and is not formally documented publicly.

**How to avoid:**
- Type errors with status:
  ```ts
  type SensorTowerError =
    | { kind: 'auth'; status: 401 | 403; message: string }
    | { kind: 'bad_request'; status: 422; message: string; missingParams?: string[] }
    | { kind: 'rate_limit'; status: 429; retryAfterSec?: number }
    | { kind: 'upstream'; status: number; message: string }
    | { kind: 'network'; message: string }
  ```
- In the proxy route handler, parse `Retry-After` header and propagate as JSON:
  ```ts
  if (upstream.status === 429) {
    const retryAfter = upstream.headers.get('Retry-After')
    return Response.json({ kind: 'rate_limit', retryAfterSec: retryAfter ? Number(retryAfter) : undefined }, { status: 429 })
  }
  ```
- UI maps each kind to a distinct message. For 401 → "API key missing on server. Check Vercel env vars." (only visible in non-prod). For 429 → "Rate limited. Retrying in Xs..." with auto-retry.

**Unreliable fields to expect:** `impressions`, `share_of_voice`, `spend_estimate` are estimates and may be `null` for some ads. Ranking logic must degrade gracefully through the 5-step fallback the PRD specifies (SoV → impressions → spend → recency → metadata score). Never crash on `undefined` numeric fields.

**Warning signs:**
- Generic "Failed to fetch" message regardless of cause
- Top-level `try/catch` returns `string` rather than typed error
- No DevTools Network panel inspection in dev workflow

**Phase to address:** Phase 4 (Sensor Tower service + ranking). Phase 10 (error states polish).

---

### Pitfall 5: Gemini called with a video URL it cannot reach

**What goes wrong:**
The Sensor Tower creative URL is a CDN link (often signed, often expires, often gated by referer). Devs pass it directly to Gemini's `generateContent` as a `fileData.fileUri` — Gemini cannot fetch arbitrary external URLs. Gemini either returns a vague "could not access video" error or hallucinates analysis from the URL string alone. Result: `whyItWorks` field becomes a generic text not based on the actual video.

**Why it happens:**
- Confusion between Gemini Files API (`files.upload`) and inline `fileData.fileUri`. The latter only works for URIs Gemini owns (e.g. `https://generativelanguage.googleapis.com/v1beta/files/...`) or specific YouTube URLs (with restrictions).
- The Sensor Tower creative URL works in the browser preview, so devs assume Gemini can fetch it.

**How to avoid:**
- Always use the **Files API upload flow**:
  1. Server fetches the creative video bytes from the Sensor Tower URL
  2. Server uploads to Gemini via `client.files.upload({ file: blob, config: { mimeType: 'video/mp4' } })`
  3. Server polls `files.get({ name })` until `state === 'ACTIVE'` (typically 5-30s)
  4. Server calls `generateContent` with `createPartFromUri(file.uri, file.mimeType)`
  5. (Optional) `client.files.delete` after analysis to keep storage clean
- Hard cap on video size: Gemini Files API accepts videos up to ~2GB but **practical demo cap should be 50MB / ~2 min**. Reject anything larger with a clear error and let the user pick another ad.
- Verify MIME type before upload — Sensor Tower may serve `.mp4`, `.webm`, `.m4v`. Gemini supports `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`, `video/x-flv`, `video/mpg`, `video/webm`, `video/wmv`, `video/3gpp`. Reject unknown → fall back to image-only analysis.

**Warning signs:**
- Gemini analysis is suspiciously generic ("the ad shows engaging gameplay")
- `confidence` field returned is consistently low (<0.5)
- Latency is too short (<3s) — Gemini did not actually load the video
- Logs show `state: PROCESSING` errors

**Phase to address:** Phase 6 (Gemini service). Phase 6 needs a separate sub-task for "fetch creative bytes server-side then upload to Gemini Files API."

---

### Pitfall 6: Gemini returns free-text JSON that breaks `JSON.parse`

**What goes wrong:**
Prompt asks for "exactly this JSON structure" and Gemini wraps it in ```` ```json ... ``` ```` markdown fences, or adds a "Here is your analysis:" preamble, or truncates at the token limit, or includes an unescaped `"` inside `videoSummary`. `JSON.parse` throws, the route handler 500s, the user sees the error state and the analysis is lost.

**Why it happens:**
- Devs use prompt engineering ("respond with ONLY JSON") instead of the structured output feature.
- They forget to set `responseMimeType` and `responseJsonSchema` in `generationConfig`.
- They don't check `finishReason` — `MAX_TOKENS` truncates JSON mid-string.

**How to avoid:**
- Use **enforced structured output**:
  ```ts
  const response = await client.models.generateContent({
    model: 'gemini-2.5-pro', // pro for video reasoning quality; flash for speed
    contents: [...videoParts, promptText],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: GeminiAdAnalysisSchema, // matches PRD type
      maxOutputTokens: 4096, // generous for the 14 fields
      temperature: 0.4, // creative but consistent
    }
  })
  ```
- **Validate with Zod** at the proxy boundary before returning to the client:
  ```ts
  const GeminiAdAnalysisZod = z.object({
    adId: z.string(),
    videoSummary: z.string(),
    openingHook: z.string(),
    hook0To3s: z.string(),
    sceneFlow: z.array(z.object({ timestamp: z.string(), description: z.string() })),
    visualPatterns: z.array(z.string()),
    // ... 14 fields total per PRD
    confidence: z.number().min(0).max(1),
  })
  const parsed = GeminiAdAnalysisZod.safeParse(rawJson)
  if (!parsed.success) {
    // Retry once with a stricter prompt, then surface error
  }
  ```
- Check `response.candidates[0].finishReason`. If `MAX_TOKENS` or `SAFETY`, do NOT pass the partial JSON to the parser.
- Model choice: **`gemini-2.5-pro`** for production analysis quality (video reasoning); fall back to `gemini-2.5-flash` only for cost/latency reasons. Do NOT use `gemini-2.5-flash-lite` for video — it has reduced multimodal depth.

**Warning signs:**
- `JSON.parse` errors in server logs
- Trailing markdown fences in raw response
- Some fields randomly missing across runs (schema not enforced)
- Output text contains "I cannot..." (safety refusal — see Pitfall 7)

**Phase to address:** Phase 6 (Gemini analysis service). Add Zod validation at this phase.

---

### Pitfall 7: Gemini or Scenario refuses generation due to content moderation

**What goes wrong:**
Voodoo's "Control Mob" game is a "battle game" with combat. Gemini's safety filters can flag the analysis ("violence depicted") and return `finishReason: SAFETY` with no text. Scenario's content moderation refuses prompts mentioning "fight," "shoot," "blood," etc. Result: Pattern Analysis returns empty, or Scenario returns a job in `failed` state with reason `content_violation`.

**Why it happens:**
- Voodoo games involve gameplay terms (mob, combat, fight) that trigger safety classifiers.
- Demo prompt may copy the brief verbatim including aggressive overlays ("crush them all!").

**How to avoid:**
- For Gemini, set safety to lowest acceptable (`BLOCK_ONLY_HIGH` for `HARM_CATEGORY_VIOLENCE`):
  ```ts
  safetySettings: [
    { category: 'HARM_CATEGORY_VIOLENCE', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  ]
  ```
- Phrase prompts in mobile-game-marketing language: "casual combat," "playful action," "stylized characters," not "violence" or "killing."
- For Scenario, sanitize the prompt: strip strong verbs (kill, shoot, blood) and replace with the Voodoo-canonical alternatives. Maintain a small mapping in `lib/scenario.ts`.
- Always check `finishReason` (Gemini) and `status` (Scenario) before treating output as valid. On `SAFETY` or `failed`, surface a recoverable error: "Content moderation blocked this generation. Edit the brief and retry." — not a generic 500.

**Warning signs:**
- Empty Gemini response with no error in `error` field but `finishReason: SAFETY`
- Scenario job stuck on `failed` with `error: "content_policy"` or similar
- The same prompt works for "Marble Sort" but fails for "Control Mob"

**Phase to address:** Phase 6 (Gemini), Phase 9 (Scenario). Both phases need a "moderation fallback" sub-task.

---

### Pitfall 8: Scenario job polling architecture fights Vercel timeouts

**What goes wrong:**
Scenario's `POST /v1/generate/custom/{modelId}` returns a `jobId`. Generation takes 30-180s. Naive implementation: server route waits in a `while (!done) await sleep(3000)` loop and returns the video URL when ready. With `maxDuration: 60` (a common copy-paste from tutorials) the route dies before the job is done; the client sees a timeout, but **the job continues and credits are consumed**. Worse, the user clicks "Regenerate" → another job starts → double cost.

**Why it happens:**
- Synchronous mental model: "I'll just await the result."
- Tutorials show single-route patterns that work locally but die on Vercel.

**How to avoid:**
- **Decoupled architecture**: two routes + client polling.
  - `POST /api/scenario/generate` → starts the Scenario job, returns `{ jobId }` immediately. `maxDuration: 30` is enough.
  - `GET /api/scenario/status?jobId=...` → fetches job status from Scenario, returns `{ status, videoUrl?, error? }`. `maxDuration: 30`.
  - Client polls every 3-5s with `setInterval` (cleared on unmount). Stops on `success` | `failed` | `canceled`.
- Persist `jobId` in `localStorage` to recover from a tab refresh during generation (otherwise the job is "lost" from the UI but still running and billed).
- Show explicit polling state: `Generating 30-second ad with Scenario...` with elapsed seconds counter. Cap at 5 minutes — if not done, show `Generation taking longer than expected — check back later or retry`.
- Scenario job statuses to handle: `queued`, `processing`, `success`, `failed`, `canceled`. Treat `failed` and `canceled` as final.
- **Vertical 9:16 + 30s duration** must be passed in the request body. Most Scenario video models support 9:16 aspect ratio and configurable duration via `aspectRatio` and `duration` parameters — but **per-model constraints vary**. Pixverse v5 / v4.5 are confirmed to support flexible aspect ratios. Pick the model in `buildScenarioPrompt` and validate it supports 30s vertical before submission. If 30s exact is not natively supported by the chosen model, request the closest supported length and document the gap (do not silently truncate).

**Warning signs:**
- "Function timeout" right around 60s while Scenario job continues
- Scenario credits consumed but no video shown
- Multiple identical `jobId` rows on Scenario dashboard from one user click

**Phase to address:** Phase 9 (Scenario generation). Phase 9 must include the two-route split design upfront.

---

### Pitfall 9: localStorage hydration mismatch + state loss on tab navigation

**What goes wrong:**
The PRD says "frontend state only, optional localStorage." Two failure modes appear:

1. **Hydration mismatch**: A component reads `localStorage.getItem('appState')` during render. SSR has no `localStorage` → renders `undefined`. Client has it → renders the persisted state. React logs `Text content does not match server-rendered HTML` and re-renders, sometimes wiping state. Worse: if the AppShell key derives from state (e.g. `<div className={isDark ? 'dark' : 'light'}>`), the page flashes during hydration.

2. **State loss across the 4 tabs**: If `AppState` lives in component-local state inside `<MarketScanStep />`, navigating to `<PatternAnalysisStep />` and back loses the selected ad. The PRD allows manual tab navigation — devs must support back-and-forth.

**Why it happens:**
- React 18+ strict-mode hydration is unforgiving.
- Devs use `useState(() => JSON.parse(localStorage.getItem(...)))` directly.
- They use Context with a provider mounted *inside* a tab component, not in the root layout.

**How to avoid:**
- Mount the global state provider in `app/layout.tsx` (or a top-level `'use client'` wrapper component). Use Zustand or a React Context with reducer.
- Hydrate from localStorage **after mount**:
  ```ts
  'use client'
  export function AppStateProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AppState>(initialState)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
      const saved = localStorage.getItem('voodoo-app-state')
      if (saved) {
        try { setState(JSON.parse(saved)) } catch { /* ignore corrupted */ }
      }
      setHydrated(true)
    }, [])

    useEffect(() => {
      if (hydrated) localStorage.setItem('voodoo-app-state', JSON.stringify(state))
    }, [state, hydrated])

    return <Ctx.Provider value={{ state, setState, hydrated }}>{children}</Ctx.Provider>
  }
  ```
- Gate localStorage-dependent UI on `hydrated`:
  ```tsx
  if (!hydrated) return <LoadingState text="Loading workspace..." />
  ```
- Or use Next.js dynamic import with `ssr: false` for the project page if SSR is not adding value:
  ```ts
  const ProjectPage = dynamic(() => import('./ProjectPageClient'), { ssr: false })
  ```
- Never use `Date.now()`, `Math.random()`, or `window.X` in JSX rendered during SSR.

**Warning signs:**
- Console warnings: `Hydration failed because the initial UI does not match what was rendered on the server`
- White flash on first paint
- Selected ad disappears after navigating to "Pattern Analysis" and back
- `localStorage is not defined` in build logs

**Phase to address:** Phase 1 (App shell — set up provider correctly from the start) + Phase 2 (project tabs — verify state survives navigation). Cheap to do early, expensive to retrofit.

---

### Pitfall 10: Type safety lost at API boundary → runtime crashes on real data

**What goes wrong:**
Devs `as MarketAd[]` the response from Sensor Tower without validating. The API returns slightly different shape (e.g. `share_of_voice` as string `"0.342"` not number, or `first_seen` missing on some rows). UI does `.toFixed(2)` on a string → `TypeError`. The Top 3 ranking sort breaks on `undefined` impressions. Demo crashes mid-narrative.

**Why it happens:**
- TypeScript types are compile-time only. Runtime data shape is unverified.
- "I tested it once and it worked" — until Sensor Tower returns a different game's row format.

**How to avoid:**
- Zod schemas for **every** external API response, defined in `lib/types.ts`:
  ```ts
  export const MarketAdZod = z.object({
    id: z.string(),
    gameName: z.string(),
    adId: z.string(),
    creativeUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    network: z.string().optional(),
    format: z.enum(['video', 'image', 'playable', 'unknown']).default('unknown'),
    firstSeen: z.string().optional(), // ISO date string, validated by app code
    lastSeen: z.string().optional(),
    performanceSignal: z.coerce.number().optional(), // coerce string→number
    // ...
  })
  export type MarketAd = z.infer<typeof MarketAdZod>
  ```
- Validate at the proxy boundary, not in components:
  ```ts
  // app/api/sensor-tower/route.ts
  const raw = await upstream.json()
  const validated = z.array(MarketAdZod).safeParse(raw.ads)
  if (!validated.success) {
    return Response.json({ error: 'Sensor Tower returned unexpected shape', details: validated.error.format() }, { status: 502 })
  }
  ```
- Use `z.coerce.number()` for fields that may arrive as strings.
- For optional fields that drive ranking, define explicit fallback in `lib/scoring.ts` — never `??` chained 5 deep in JSX.

**Warning signs:**
- `TypeError: Cannot read properties of undefined (reading 'toFixed')` in production
- UI showing `NaN` or `Invalid Date`
- One specific ad consistently breaks the page

**Phase to address:** Phase 4 (Sensor Tower service), Phase 6 (Gemini), Phase 9 (Scenario). Make Zod schemas a deliverable per phase.

---

### Pitfall 11: Raw JSON visible to user (PRD violation)

**What goes wrong:**
Error states or loading states render `JSON.stringify(error, null, 2)` or `<pre>{JSON.stringify(analysis)}</pre>` "for debugging." Demo proceeds, user (Voodoo strategist persona) sees a wall of `{ "code": "ERR_X", "trace": [...] }` and the premium polish breaks. The PRD UI Design Rules forbid this explicitly: *"Don't: Raw JSON visible anywhere."*

**Why it happens:**
- Quick `<pre>{JSON.stringify(...)}</pre>` for dev visibility, never removed.
- Error boundaries default to printing the error stack.
- Analysis page is so dense (14 fields) that "let me just dump it" is tempting.

**How to avoid:**
- Lint rule or grep gate in CI: `grep -r "JSON.stringify" app/ components/ | grep -v "// dev:"` returns nothing user-facing.
- Every error UI uses a typed error component:
  ```tsx
  <ErrorState
    title="Sensor Tower scan failed"
    message="The market data could not be retrieved."
    detail={error.kind === 'rate_limit' ? `Rate limited — retrying in ${error.retryAfterSec}s` : undefined}
    onRetry={handleRetry}
  />
  ```
- The Gemini analysis page must render each of the 14 PRD fields in its own labeled section (Video Summary, Opening Hook, etc.) — never a JSON dump.
- Implement a custom `<details>` accordion only for "Source evidence" with formatted data, not raw `JSON.stringify`.

**Warning signs:**
- Curly braces visible on screen
- Field names like `"adId"` (camelCase) shown verbatim instead of "Ad ID"
- Error messages start with `Error:` followed by stack trace

**Phase to address:** Phase 6 (Gemini analysis UI), Phase 10 (UI polish). Phase 10 must do a "no raw JSON anywhere" pass.

---

### Pitfall 12: Loading text not exactly as PRD specifies

**What goes wrong:**
PRD imposes exact loading texts. Devs paraphrase ("Loading market data..." instead of `Running Sensor Tower scan...`). Demo narrative weakens — the PRD-imposed texts are the *brand voice*, surfacing the Sensor Tower / Gemini / Scenario integration in front of the audience.

**Why it happens:**
- Generic UI library defaults ("Loading...").
- Translation/copy work delegated and approximated.

**How to avoid:**
- Hardcode exact strings as constants in `lib/copy.ts`:
  ```ts
  export const LOADING_TEXT = {
    sensorTower: 'Running Sensor Tower scan...',
    gemini: 'Analyzing selected ad with Gemini...',
    creativeBrief: 'Generating creative brief...',
    scenario: 'Generating 30-second ad with Scenario...',
  } as const
  ```
- LoadingState component takes a key, not free text:
  ```tsx
  <LoadingState text={LOADING_TEXT.sensorTower} />
  ```
- Visual diff against PRD acceptance criteria during Phase 10 verification.

**Warning signs:**
- Loading text varies between runs (different developer wrote each step)
- "..." vs "…" inconsistency
- Translated to French (PRD specifies English UI text)

**Phase to address:** Phase 4, 6, 9 (each integration sets its own loading text). Phase 10 (consolidation pass).

---

### Pitfall 13: Demo-day env var omission on Vercel

**What goes wrong:**
Code works locally because `.env.local` has the keys. Devs deploy to Vercel and the project env vars are set on **Production** scope only. Then they share a **Preview URL** (from a PR) for the demo → keys don't apply → 401 cascade across all 3 APIs. Or the reverse: Preview is set, Production isn't, and the demo-day fresh deploy from `main` fails.

**Why it happens:**
- Vercel UI requires explicitly checking which scope each env var applies to (Production / Preview / Development).
- Devs set vars in Vercel project once and assume "all environments."

**How to avoid:**
- Set every secret in **all three scopes** (Production, Preview, Development) in Vercel project settings.
- `.env.local.example` listing all 4 vars (PRD §ENV VARIABLES) committed; `.env.local` in `.gitignore` (verified before first commit).
- Add a runtime startup check in each proxy route handler:
  ```ts
  if (!process.env.SENSOR_TOWER_API_KEY) {
    return Response.json({ error: 'SENSOR_TOWER_API_KEY missing on server', envHint: 'Set in Vercel env vars under Production + Preview scopes' }, { status: 500 })
  }
  ```
- Demo-day rehearsal: do a fresh deploy 30 minutes before the demo on the exact URL you'll show.

**Warning signs:**
- Local works, deployed 401s
- Vercel logs: `process.env.X is undefined`
- Preview URL works, Production doesn't (or vice versa)

**Phase to address:** Phase 10 (Vercel readiness) — explicit env var checklist.

---

### Pitfall 14: Cold start adding 3-8s to the first call (right when the demo opens)

**What goes wrong:**
Vercel functions cold-start. First call after a quiet period adds latency — for a Node runtime route that pulls in Gemini SDK, Zod, etc., 3-8s of pure init time *before* the API call even begins. The audience watches a blank screen during the most narratively-charged moment ("here's the live Sensor Tower scan...").

**Why it happens:**
- No warmup. Hobby plan has no always-on instances.
- Heavy SDKs (`@google/genai`, etc.) bloat the bundle.

**How to avoid:**
- Warm the routes 30 seconds before the demo: `curl https://your-app.vercel.app/api/health` or simply navigate to each tab.
- Build a `/api/warmup` route that pings each integration with a no-op or HEAD call, hit it before the demo.
- Keep API routes lean. Lazy-import heavy SDKs only when needed:
  ```ts
  // Avoid top-level: import { GoogleGenAI } from '@google/genai'
  async function getGeminiClient() {
    const { GoogleGenAI } = await import('@google/genai')
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  }
  ```

**Warning signs:**
- First call always 5-10s slower than subsequent calls
- Bundle analyzer shows `node_modules` >2MB in serverless function
- Vercel build logs say "Lambda size near limit"

**Phase to address:** Phase 10 (Vercel readiness). Add to demo-day checklist.

---

### Pitfall 15: Sensor Tower video URLs expire or 403 mid-demo

**What goes wrong:**
Sensor Tower creative URLs are CDN-signed and may expire, or be gated by referer. The Top 3 ad cards loaded fine 5 minutes ago; on selection click, the video preview shows a broken icon, OR Gemini's server-side fetch returns 403, OR Scenario's image-to-video flow fails because the source frame URL is dead.

**Why it happens:**
- CDN signed URLs have TTL (15min - 24h typical).
- Referer/origin restrictions block server-side fetch.

**How to avoid:**
- When a creative URL is needed for downstream (Gemini upload), fetch the bytes **immediately at scan time** server-side, cache in memory or proxy through `/api/sensor-tower/creative/:adId`.
- Don't rely on long-lived URLs in localStorage state — store the `adId` and re-resolve the creative URL at use time.
- For the in-page video preview (`<video src={...}>`), proxy through your own route:
  ```tsx
  <video src={`/api/sensor-tower/creative-proxy?adId=${ad.id}`} />
  ```
  The proxy fetches with proper auth and streams to the browser.
- Add explicit error UI for video preview load failure: "Video preview unavailable — analysis still works on cached video bytes."

**Warning signs:**
- `<video>` element silently fails (no `onerror` handler)
- 403 from server-side fetch when local browser fetch works (referer issue)
- Demo works at rehearsal, broken at showtime (TTL expired)

**Phase to address:** Phase 4 (Sensor Tower, video proxy route) + Phase 6 (Gemini, server-side fetch flow).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip Zod, cast `as any` on API responses | Saves 1-2h per integration | Production crashes on unexpected data shape; impossible to know which field broke | **Never** — too high a demo risk |
| `await` Scenario job in single route | Simpler mental model | Vercel timeout kills demo at exact dramatic moment | **Never** — split into two routes |
| Hardcode the demo's Sensor Tower response | Removes API dependency | Defeats the entire product narrative ("real signal") | **Only** as `NEXT_PUBLIC_USE_DEV_MOCKS=true` dev tool, with visible banner |
| Inline all state into one giant Context | Faster than picking Zustand | Re-renders entire app on each tab change; hydration nightmares | Acceptable for Phase 1-2 if Context is split per concern by Phase 5 |
| Skip `.env.local.example` | Saves 5 minutes | Next dev cannot run app; demo-day surprise on fresh checkout | **Never** — PRD requires it |
| Ship without server-side video bytes proxy for Gemini | One less route | Demo breaks when CDN URL expires | **Never** for the demo path; OK for "extra ads grid" if it's optional UI |
| Ignore `finishReason` on Gemini response | -10 LOC | Silent SAFETY refusals shown as empty analysis | **Never** |
| Single `loading: boolean` for whole workflow | Simple | User loses context (which step is loading?); PRD specifies different texts per step | **Never** — must be per-step |
| Skip Phase 10 polish to ship more features | More demo-able surface | The polish IS the demo. Premium feel is core to the brand. | **Never** — quality > completeness, per PRD |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sensor Tower | Calling from browser → CORS error | Server-side proxy at `/api/sensor-tower` (mirror `voodoo-hack/api/sensortower.ts` pattern: allowlist + `auth_token` query param) |
| Sensor Tower | Forgetting `ad_types` param on creatives endpoint | 422 response. Always include `ad_types` (community-confirmed requirement) |
| Sensor Tower | Treating `share_of_voice` as authoritative | It's an estimate, may be `null`. Use 5-step ranking fallback per PRD |
| Sensor Tower | Auth header `Bearer` | Wrong — uses `auth_token` query string parameter |
| Gemini | Passing creative URL directly to `fileData.fileUri` | Must use Files API: download bytes server-side → upload → poll until `ACTIVE` → reference by Files API URI |
| Gemini | Free-text JSON parsing | Use `responseMimeType: 'application/json'` + `responseJsonSchema` for enforced structure |
| Gemini | Choosing `gemini-2.5-flash-lite` for video reasoning | Use `gemini-2.5-pro` for analysis quality; `flash` only for cost/latency |
| Gemini | Edge runtime for Files API | Use `runtime: 'nodejs'` — Edge cannot do Files API uploads |
| Gemini | Ignoring `finishReason: SAFETY` | Always check; surface as recoverable user error |
| Gemini | 1-hour video uploads | Practical limit ~50MB / ~2min for hackathon latency. Most Voodoo competitor ads are 15-60s; this is fine |
| Scenario | Synchronous polling in single route | Two-route split: `start` returns `jobId`; `status` polled by client |
| Scenario | `Bearer` auth | Uses **HTTP Basic** with `key:secret` — base64 encode `${SCENARIO_API_KEY}:${SCENARIO_API_SECRET}` |
| Scenario | Hardcoded model ID | Different models support different aspect ratios and durations. Verify the chosen `modelId` supports `9:16` and 30s |
| Scenario | Trusting first poll response | Job goes through `queued → processing → success/failed/canceled`. Poll with backoff (3s → 5s → 10s) |
| Scenario | Treating output URL as permanent | Asset URLs may expire. Once received, save into state for the demo session; do not rely beyond the session |
| Vercel | Default `maxDuration` | Default 10s (Hobby) / 15s (Pro). Must explicitly set up to 300s (Hobby max) or 800s (Pro max). Export `maxDuration` from each route handler |
| Vercel | Env vars set only in Production | Set in Production + Preview + Development scopes |
| Vercel | Testing only on `next dev` | Always test on a deployed Preview before demo |
| Next.js 15 App Router | `'use client'` everywhere by default | Keep server components for static UI; only wrap interactive trees in `'use client'` |
| Next.js 15 App Router | localStorage in render | Read in `useEffect` after mount; gate UI on a `hydrated` flag |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all Top N ads' videos eagerly | Page hangs for 10s+, unnecessary bandwidth | Lazy-load video preview only on selection. Show thumbnails in grid. | At 50 ads (max) configurable in Market Scan |
| Re-running full Gemini analysis on tab navigation | Cost explosion, latency on every back-and-forth | Cache analysis result in `AppState` keyed by `adId`. Re-analyze only on explicit user action. | First demo-day click |
| Bundle includes all 3 SDKs in client | First load 2-5MB, slow first paint | SDKs only used in API routes (server). Client uses `fetch('/api/...')`. | Demo on a slow connection / large screen mirroring |
| Polling Scenario every 500ms | Hammers Scenario API → 429 | Poll every 3-5s with exponential backoff up to 10s | Always |
| Re-rendering entire `<ProjectPage>` on every state change | UI feels janky during typing in tags editor | Split state by tab; use `useReducer` or Zustand selectors | At 100+ tags or many input fields |
| No abort controller on in-flight fetches | User clicks Retry → 2 concurrent requests; race condition shows wrong result | `AbortController` per call; cancel previous on new submit | First demo retry |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `NEXT_PUBLIC_GEMINI_API_KEY` (or any of the 3 keys) in code | Key leaked in JS bundle on Vercel CDN — irrevocable until rotated; possible billing event | Server-only env vars; proxy routes; build-time grep check |
| Committing `.env.local` | Same as above + git history forever | `.env.local` in `.gitignore`; `git status` check before every commit; pre-commit hook for secret detection |
| Logging full Sensor Tower / Gemini / Scenario responses to Vercel logs | Vercel logs may contain PII (game user data) or quota-bearing tokens | Log only status codes + structured metadata; never raw bodies |
| Open proxy without path allowlist | Anyone can use your `/api/sensor-tower` to query any Sensor Tower endpoint with your key | Mirror `voodoo-hack/api/sensortower.ts` allowlist (`ALLOWED_PATH_PREFIXES`); reject `..` and absolute paths |
| Trusting client-supplied `path` in proxy | SSRF — client crafts internal URLs | Strict allowlist; never let client choose the upstream URL freely |
| Accepting arbitrary `prompt` from client and forwarding to Scenario | Cost-bomb (unbounded generation) + content moderation reputation risk | Server-side prompt builder from typed `CreativeBrief` only; do not accept raw `prompt` strings from client |
| No rate limiting on demo URL | Public Vercel URL → anyone hitting your endpoints burns API credits | Add a simple per-IP throttle in middleware; use a session token; accept that hackathon scope may skip this if URL is unshared |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No focus states on buttons / tabs | Keyboard navigation invisible; poor a11y; demo presenter cannot reliably tab through | Tailwind `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`; never `outline-none` without replacement |
| Low contrast accent color on white | Premium-light look but text becomes unreadable; WCAG AA failure | Verify accent color contrast >=4.5:1 against white for text, >=3:1 for UI components. Test with browser DevTools contrast checker |
| Dark mode flash on first paint | Even though no dark mode exists, system theme may apply default styles | Set explicit `bg-white` on `<html>`; verify no `dark:` classes leak from copied components |
| Tabs allow free navigation but skipping breaks downstream | User clicks "Pattern Analysis" before doing Market Scan → empty state without explanation | Each tab handles its own missing-prerequisite state with a clear pointer ("Run a Market Scan first"). Never crash, never redirect silently |
| Brief editor as a single giant `<textarea>` | Hard to edit individual fields (concept, hook, scene flow, CTA) | Per-field inputs matching the PRD's CreativeBrief type; auto-save on blur |
| No empty-state for "0 ads found" | Blank screen, looks like a bug | Explicit empty state with retry: "No ads matched your filters. Try a longer time range or different market." |
| Video preview without poster | Black square until play | `poster` attribute on `<video>`; fall back to thumbnail URL from Sensor Tower |
| Mobile responsive ignored entirely | Demo on a borrowed laptop / projector with weird aspect ratio looks broken | Desktop-first per PRD, but at minimum: grid breaks gracefully at <1024px; no horizontal scroll. Test on a 1280×800 projector |
| Animations on every element | Looks generic, opposite of "premium minimal motion" | Animate only: tab transitions, loading state, video reveal. No hover-bounce on every card. |
| Long Gemini analysis with no scroll cue | User doesn't realize there's content below the fold | Sticky tab bar; subtle bottom fade indicator; or split into accordion sections |

---

## "Looks Done But Isn't" Checklist

These items pass a quick visual review but fail under demo conditions.

- [ ] **Sensor Tower scan:** Often missing — verify a real network call to `api.sensortower.com` happens (DevTools Network tab shows it, response shape matches Zod schema, NOT served from `data/devMockAds.ts`)
- [ ] **Sensor Tower errors:** Often missing — verify 401/422/429/5xx each render a distinct UI state with retry, not a generic "error" message
- [ ] **Gemini video upload:** Often missing — verify Files API flow: bytes uploaded server-side, polled to ACTIVE, referenced by URI (not raw external URL)
- [ ] **Gemini structured output:** Often missing — verify `responseMimeType: 'application/json'` + `responseJsonSchema` set; Zod validation passes; `finishReason` checked
- [ ] **Pattern extraction:** Often missing — verify exactly **3** patterns produced (PRD), each with all 4 sub-scores summing per the formula (35/25/20/20)
- [ ] **Pattern mapping table:** Often missing per PRD — verify `Market Pattern | Evidence | Adaptation to Target Game | Confidence` columns are present
- [ ] **Scenario request:** Often missing — verify `aspectRatio: '9:16'` and `duration: 30` are actually in the request body sent to Scenario (inspect logs)
- [ ] **Scenario polling:** Often missing — verify two-route architecture (start + status); client-side `setInterval` cleanup on unmount
- [ ] **Scenario job lifecycle:** Often missing — verify all 5 states handled (`queued`, `processing`, `success`, `failed`, `canceled`)
- [ ] **30s output:** Often missing — verify the produced video is actually ~30s. If model produces shorter, surface a warning, do not silently accept
- [ ] **Vercel maxDuration:** Often missing — `grep -r "maxDuration" app/api/` returns export from EVERY API route
- [ ] **Vercel env vars:** Often missing — verify all 4 vars set in Production + Preview + Development scopes
- [ ] **No raw JSON visible:** Often missing — view every error state, every empty state. No `{` `}` or `[` `]` glyphs visible to user
- [ ] **Loading text exact:** Often missing — strings match PRD verbatim (`Running Sensor Tower scan...` etc.)
- [ ] **State persists across tabs:** Often missing — select an ad in tab 2, click tab 1, click tab 2 — selection still there
- [ ] **State persists on refresh (if localStorage enabled):** Often missing — refresh on tab 3, verify game + market scan + selected ad survive
- [ ] **Hydration clean:** Often missing — no React warnings in console on initial load
- [ ] **Brief editable:** Often missing — verify each PRD-required field is individually editable, not a single textarea
- [ ] **Video preview plays:** Often missing — Sensor Tower CDN URL works in a `<video>` tag, OR proxied through your own route
- [ ] **Get Started CTA navigates:** Often missing — verify `/` → `/project` works on deployed URL with full state init
- [ ] **`+ New Project` is visible but not functional:** Often missing — PRD specifies it must be VISIBLE but no-op; do not hide it, do not implement it |
- [ ] **Premium light look:** Often missing — verify no dark backgrounds anywhere, including error states; one accent color used consistently |
- [ ] **Confidence scores shown:** Often missing — Gemini's `confidence` and each pattern's `confidence` rendered as a percentage or 0-1 score, not hidden

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vercel function timeout (Pitfall 1) | LOW | Add `export const maxDuration = 300` to the offending route; redeploy. 5 min fix |
| API key leaked to client (Pitfall 2) | HIGH | Rotate ALL exposed keys at provider; force-purge git history if committed; rebuild bundle; audit Vercel env scopes. 1-2h |
| Silent fallback to fake data (Pitfall 3) | MEDIUM | Find the catch block, throw instead. Add the dev-mock banner. 30 min |
| Generic error message (Pitfall 4) | LOW | Add typed error union and switch in UI. 1h |
| Gemini cannot fetch URL (Pitfall 5) | MEDIUM | Implement server-side fetch + Files API upload. 2-3h. Block Phase 6 progress until fixed |
| JSON parse fails (Pitfall 6) | LOW | Switch to structured output + Zod. 1h |
| Content moderation refusal (Pitfall 7) | LOW-MEDIUM | Adjust prompt vocabulary; lower safety threshold. Iterate. 30min-2h |
| Scenario timeout (Pitfall 8) | MEDIUM | Refactor to two-route pattern. 2-3h. Better done upfront in Phase 9 |
| Hydration mismatch (Pitfall 9) | LOW-MEDIUM | Move localStorage read into `useEffect`; gate UI on `hydrated`. 1-2h |
| Runtime crash on missing field (Pitfall 10) | LOW | Add Zod schema, fix coerce. 30min per field |
| Raw JSON visible (Pitfall 11) | LOW | Replace with formatted components. 1-2h for the analysis page |
| Wrong loading text (Pitfall 12) | LOW | Constants file, single source of truth. 30 min |
| Env var missing on Vercel (Pitfall 13) | LOW | Vercel UI → set var on missing scope → redeploy. 5 min if you have the key handy |
| Cold start lag (Pitfall 14) | LOW | Hit `/api/warmup` 30s before demo. Acceptable workaround |
| Sensor Tower URL expired (Pitfall 15) | MEDIUM | Implement proxy + server-side bytes fetch. 1-2h. Better done upfront in Phase 4 |

---

## Pitfall-to-Phase Mapping

How the 10 PRD phases should address each pitfall:

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Vercel timeout | Phase 6 (Gemini), Phase 9 (Scenario), Phase 10 (readiness) | `grep maxDuration app/api/` shows export in every route; deployed Preview test |
| 2. Secret leaked client-side | Phase 4, 6, 9 (each integration), Phase 10 (audit) | `grep "NEXT_PUBLIC_.*KEY" .` empty; bundle inspection clean |
| 3. Silent fake-data fallback | Phase 4 | Network tab shows real Sensor Tower call; force a 401 → no fake data appears, error state shows |
| 4. Sensor Tower error taxonomy | Phase 4 | Force 401/422/429/5xx (mock at proxy level) → 4 distinct UI states |
| 5. Gemini video URL unreachable | Phase 6 | Logs show Files API upload + ACTIVE polling for every analysis call |
| 6. JSON parse failure | Phase 6 | Zod validation enforced; 10 retries on real ads succeed |
| 7. Content moderation refusal | Phase 6, 9 | Test with "Control Mob" (combat game); analysis succeeds; Scenario generates |
| 8. Scenario timeout | Phase 9 | Two-route architecture in place; 5-min generation works without function timeout |
| 9. Hydration mismatch / state loss | Phase 1 (provider), Phase 2 (tabs) | No React hydration warnings; tab navigation preserves state |
| 10. Type safety at API boundary | Phase 4, 6, 9 | Zod schemas in `lib/types.ts` for every external response shape |
| 11. Raw JSON visible | Phase 6, Phase 10 | Manual review pass; no `JSON.stringify` in user-facing code |
| 12. Wrong loading text | Phase 4, 6, 9, 10 | `lib/copy.ts` constants used everywhere; visual diff with PRD |
| 13. Env var omission on Vercel | Phase 10 | Vercel project settings show all 4 vars in 3 scopes; demo URL fresh-deployed |
| 14. Cold start lag | Phase 10 | Warmup route exists; demo-day checklist includes hit-warmup-30s-before |
| 15. Sensor Tower URL expired | Phase 4, 6 | Creative proxy route exists; Gemini uses server-fetched bytes |

### Phase ordering implications

- **Phase 1 (App shell)** — establish the global state provider and localStorage hydration pattern correctly. Cheap now, expensive later.
- **Phase 4 (Sensor Tower)** — the highest concentration of pitfalls (3, 4, 10, 13, 15). Dedicate solid time. This phase blocks the demo's credibility narrative.
- **Phase 6 (Gemini)** — second-most pitfall-heavy (5, 6, 7, 11). The "wow" of the demo. Don't rush.
- **Phase 9 (Scenario)** — architectural decision (two-route split, Pitfall 8) must be made upfront, not retrofitted.
- **Phase 10 (Polish + Vercel)** — explicit verification phase. Treat its acceptance criteria as a checklist of pitfalls 1, 2, 11, 12, 13, 14.

---

## Demo-Day Checklist

Run through this sequence 30-60 minutes before showing the demo:

**T-60min — Build & deploy:**
- [ ] Fresh deploy from `main` to the exact URL you'll demo (Vercel Production, not a stale Preview)
- [ ] Vercel env vars verified in **Production** scope (all 4 keys)
- [ ] `NEXT_PUBLIC_USE_DEV_MOCKS` is **unset** or `false` in Production
- [ ] Vercel logs show no startup errors

**T-30min — Smoke test the full flow:**
- [ ] Visit `/` — landing renders, premium light look, Get Started works
- [ ] Game Identity — both games selectable, fields editable
- [ ] Market Scan — Run Market Scan triggers a real Sensor Tower call (verify via Vercel logs)
- [ ] Top 3 ads load with thumbnails / video previews
- [ ] Select an ad → no console errors
- [ ] Pattern Analysis — Gemini call completes within ~60s, all 14 fields rendered, no raw JSON
- [ ] 3 patterns produced and selectable
- [ ] Creative Output — brief generated, editable, Scenario prompt visible
- [ ] Scenario job starts; polling works; ~2-4min to a 30s vertical video
- [ ] Video plays in the preview

**T-15min — Warmup:**
- [ ] Hit `/api/warmup` (or click through each tab once) to warm Vercel functions
- [ ] Test on the actual demo machine + browser + screen resolution
- [ ] Disable browser extensions that might interfere (ad blockers can break some CDN fetches)
- [ ] Have a backup plan: pre-recorded screen capture in case live demo fails

**T-5min — Final pre-flight:**
- [ ] Network connection stable (test by re-running the Market Scan once)
- [ ] No alerts / notifications enabled on demo machine
- [ ] Browser tab pinned, full-screen mode if presenting
- [ ] Backup tab open with the demo URL, ready in case main tab freezes

**Hackathon-specific time-management hazards:**
- [ ] Resist the urge to add features beyond PRD ("Just a 5th game!" "Just a comparison view!"). Per PRD: "Quality over completeness."
- [ ] Polish the demo path before optimizing edge paths. The judge sees one path.
- [ ] The narrative "real signal → real video" is the whole point. If at any moment the demo cannot show this trace (Sensor Tower → selected ad → Gemini analysis → pattern → Scenario video), the demo has failed regardless of UI polish.
- [ ] Don't refactor at T-3h. Freeze code at T-3h, only fix bugs found during rehearsal.
- [ ] Have a fallback: if Scenario fails repeatedly during rehearsal, identify whether to (a) demo with a previously-generated video and explain the architecture, or (b) demo only through Pattern Analysis. Make this call **before** showtime.

---

## Sources

- **Vercel Function Duration limits** (Context7 — `/websites/vercel`): Default 10s/15s on Hobby/Pro; up to 300s/800s with explicit `maxDuration` and fluid compute. ([Vercel Functions duration docs](https://vercel.com/docs/functions/configuring-functions/duration))
- **Gemini Video Files API** (Context7 — `/websites/ai_google_dev_gemini-api`): Files API required for >20MB or reusable videos; poll until `state === 'ACTIVE'`; max video duration 120s for embeddings, longer for general video understanding. ([Gemini Video Understanding docs](https://ai.google.dev/gemini-api/docs/video-understanding))
- **Gemini Structured Output** (Context7): `responseMimeType: 'application/json'` + `responseJsonSchema` enforces structure. ([Gemini JSON Mode docs](https://ai.google.dev/gemini-api/docs/json-mode))
- **Scenario API** ([video generation](https://docs.scenario.com/docs/video-generation), [API welcome](https://docs.scenario.com/docs/welcome-to-the-scenario-api)): Endpoints `POST /v1/generate/custom/{modelId}` + `GET /v1/jobs/{jobId}`; HTTP Basic auth (key:secret); statuses `queued|processing|success|failed|canceled`; aspect ratio + duration vary per model.
- **Sensor Tower integration pattern**: `/Users/antoinevoinchet/Desktop/Hackathon/voodoo-hack/api/sensortower.ts` — existing proxy with allowlist + `auth_token` query parameter (this codebase, not external).
- **Sensor Tower MCP wrapper** ([virusimmortal00/sensortower-mcp](https://github.com/virusimmortal00/sensortower-mcp)): `SENSOR_TOWER_API_TOKEN` auth; `ad_types` parameter required on creatives endpoint to avoid 422.
- **Next.js 15 App Router hydration** (Context7 — `/vercel/next.js`): Hydration mismatch on `Date.now()`, `Math.random()`, `window.X`, localStorage in render. Use `useEffect` + `hydrated` flag pattern.
- **PRD source of truth**: `/Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md` — exact loading text strings, "no raw JSON," "no silent fake data" rules.
- **Project context**: `/Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md` — confirms greenfield Next.js, hackathon constraints, single-game-MVP.

---
*Pitfalls research for: Voodoo Creative Radar (hackathon Next.js + Sensor Tower live + Gemini video + Scenario)*
*Researched: 2026-04-25*
