# Feature Research

**Domain:** AI-driven creative intelligence + ad generation tool for hyper-casual mobile games (Voodoo Creative Radar)
**Researched:** 2026-04-25
**Confidence:** HIGH (PRD is the source of truth — research validates the prescribed surface against 2026 ecosystem expectations)

## Executive Summary

The PRD is tightly scoped and opinionated, which is the correct posture for a hackathon demo. Cross-referencing it against 2026 patterns for ad-intelligence dashboards (Sensor Tower / MobileAction / VidMob), AI video analysis tools (Memories.ai / OutlierKit / ScreenApp), AI video generators (Runway / Pika / Scenario), and premium light SaaS aesthetics (Linear / Vercel) confirms that the prescribed feature set hits the table stakes for credibility and lands the differentiating "wow" beats in the right places (Step 3 Gemini analysis + Step 4 Scenario output).

The research surfaces three operational risks the roadmap must anticipate:

1. **Trust chain visibility is a differentiator, not a flourish.** In 2026, AI products are judged on how transparently they show "where this came from." The PRD already mandates a Pattern Mapping Table, source evidence, and rationale — this must be treated as P1, not polish.
2. **Loading state copy is load-bearing UX.** The PRD specifies exact loading texts (`Running Sensor Tower scan...`, `Analyzing selected ad with Gemini...`, etc.). 2026 best practice strongly endorses *specific* loading copy over generic "Loading…", so honor those texts verbatim — they are not arbitrary.
3. **Anti-features are doing work.** The "no JSON dump", "no dark mode", "no DB", "no multi-project" exclusions are credibility moats. Each one removes a class of demo failure (cluttered UI, off-brand look, race conditions, broken navigation).

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist for an ad-intelligence + AI creative tool in 2026. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes / PRD Cross-ref |
|---------|--------------|------------|----------------------|
| 4-step linear wizard with persistent stepper | Multi-step AI workflows in 2026 universally use a stepper/tab pattern (Mutiny, Pencil, Smartly). User must know where they are. | S | PRD `/project` page — 4 tabs `[1. Game Identity] [2. Market Scan] [3. Pattern Analysis] [4. Creative Output]` |
| Manual tab navigation (non-blocking) | Users want to revisit prior steps without losing state (e.g., re-pick an ad). | S | PRD: "User can navigate between tabs manually." |
| Premium light theme with single accent | Modern SaaS reference (Vercel, Linear) treats restraint as elegance — one accent, mostly grayscale. | S | PRD UI rules: white/off-white, charcoal type, one accent, rounded cards |
| KPI cards row at top of Market Scan | Dashboard convention: top row answers "Is everything okay?" (Ads retrieved · Competitor games · Networks · Market · Time range). | S | PRD: "KPI cards: Ads retrieved · Competitor games found · Networks detected · Market · Time range" |
| Top-N ranked ad cards with thumbnails | Ad-intelligence tools (MobileAction, VidMob, AppTweak) all surface top creatives as visual cards with rank badges. | M | PRD: "Top 3 ad cards (rank · thumbnail · game name · ad ID · network · format · performance signal · first/last seen · ranking reason · `Select this ad` button)" |
| Configurable scan filters (count / time range / market) | 2026 ad-intelligence baseline: timeframe + geo + result count. | S | PRD: 3 dropdowns — 10/20/30/50 · 30d/60d/90d · US/FR/UK/Global |
| Network + format chips on each ad | Visual taxonomy of ad placements is universal in this category. | S | PRD MarketAd: `network`, `format: "video" | "image" | "playable" | "unknown"` |
| Selected ad video preview | Users won't trust analysis of a creative they can't watch. | S | PRD: "Selected Ad Preview" required section in Step 3 |
| Specific, descriptive loading state copy | UX writing best practice 2026: prefer "Running Sensor Tower scan..." over generic "Loading…" — reduces anxiety, signals what's happening. | S | PRD imposes 4 exact strings — honor verbatim. **DO NOT genericize.** |
| Visible error state with retry button | Mandatory for any external API call. Silent failure = broken trust. | S | PRD error rules table — Sensor Tower / Gemini / Scenario all require Retry + visible error |
| No silent fallback to mock data in live mode | Crédibilité de la démo dépend de "real signal." Mock fallback = perceived dishonesty. | S | PRD: "No silent fallback to fake data in live mode." Dev mode gated by `NEXT_PUBLIC_USE_DEV_MOCKS=true`. |
| Game selector with auto-fill of category + tags | Step 1 has to feel intelligent on the first interaction. | S | PRD: dropdown → auto-fill, fields editable |
| Editable category + tags (override auto-fill) | UA managers customize taxonomies; locked fields feel patronizing. | S | PRD: "Both fields editable" |
| Sequential CTA at bottom of each step | "Continue to X" pattern is universal in wizards. | S | PRD: `Continue to Market Scan`, `Continue to Pattern Analysis`, `Continue to Creative Output` |
| Sidebar with project list (read-only OK) | Frame the app as project-aware even if MVP is single-project. | S | PRD sidebar: "Projects · Demo Project · + New Project (visible but not functional)" |
| Final video preview embedded in-page | Users expect to *see* the output, not download a file. | M | PRD Step 4: "Scenario Output — video preview + generation status" |

### Differentiators (Competitive Advantage — the "Wow" Moments)

Features that elevate the demo from "yet another wizard" to "this is the future of UA creative." These align with the Core Value: "each creative is traceable to a real market signal."

| Feature | Value Proposition | Complexity | Notes / PRD Cross-ref |
|---------|-------------------|------------|----------------------|
| Live Sensor Tower call with verifiable metadata | The hackathon thesis. Without this, the rest is theater. Top ads must show real `firstSeen` / `lastSeen` / `network` from live API. | L | PRD Step 2 — `lib/sensorTower.ts` with `fetchSensorTowerAds(config)` |
| Multi-criteria ranking with `rankingReason` per ad | "Why is this ad #1?" must be answerable in one glance. Tools like VidMob hide ranking logic; surfacing it is a trust win. | M | PRD: ranking by SoV → impressions → spend → recency → metadata; `rankingReason` field per ad |
| Gemini full-video analysis (not frame-only) | 2026 SOTA: Gemini 1.5/2.0 supports native video input. Sending the full video (vs sampled frames) = higher fidelity, better differentiation. | L | PRD: "Target: full video analysis. Frame extraction only if technically required." |
| Structured analysis sections (no JSON dump) | Direct competitor pain point — many AI tools dump raw JSON or walls of text. Sectioned UI (Hook · Scene Flow · Patterns · CTA · Why It Works) reads as polished. | M | PRD: 15 named analysis sections — Video Summary, Opening Hook, 0-3s Hook, Scene Flow, Visual Patterns, Gameplay Mechanics, Emotional Triggers, Text Overlays, CTA, Visual Style, Pacing, Why It Works, Applicability, Confidence |
| Scene Flow timeline (timestamped, scrollable) | Concrete visualization of what happens at 0-3s / 3-7s / etc. — far more credible than prose. Dribbble/Behance 2026 patterns favor horizontal timeline cards. | M | PRD `GeminiAdAnalysis.sceneFlow: { timestamp; description }[]` + `components/patterns/SceneFlowTimeline.tsx` |
| 0-3s hook callout (separate from general hook) | Hyper-casual UA wisdom: the first 3 seconds determine CTR. Calling it out explicitly = domain expertise made visible. | S | PRD `GeminiAdAnalysis.hook0To3s` |
| Pattern scoring with 4 transparent sub-scores | Black-box AI scores erode trust. Showing Frequency / Game Fit / Freshness / Creative Actionability with weights = explainability. | M | PRD scoring formula: 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability. Each pattern card shows all 4 sub-scores. |
| Confidence badge per Gemini analysis + per pattern | 2026 trust UX standard: surface model confidence; users penalize false certainty more than admitted uncertainty. | S | PRD: `confidence: number` on `GeminiAdAnalysis` and `CreativePattern` |
| Pattern → Evidence → Adaptation mapping table | The "trust chain" made tabular: `[Market Pattern] [Evidence] [Adaptation to Target Game] [Confidence]`. This is the demo screenshot judges will remember. | M | PRD: "Pattern mapping table: Market Pattern · Evidence · Adaptation to Target Game · Confidence" |
| Editable creative brief (inline, structured) | 2026 creative-brief tools (Briefly, Uplifted) all support inline edit + structured fields. Generated brief without editability = frustrating. | M | PRD: "Creative Brief — generated, then editable by user before sending to Scenario" — 11 structured fields |
| Brief preserved on Scenario error | Most generative AI tools lose user input on retry. Preserving brief + prompt across errors is a defensive-UX moat. | S | PRD error rules: "Scenario · Keep brief + prompt visible · Show generation error · Retry button" |
| Visible Scenario prompt (derived from brief) | Showing the prompt = transparency about what's actually sent to the model. Mirrors ChatGPT-style "show the chain of thought" trust signal. | S | PRD: "Scenario Prompt — derived from edited brief" — own page section |
| Rationale section on final output | "Why this creative was generated this way." Closes the trust loop — links output back to source ad. | S | PRD: "Rationale — why this creative was generated this way" — required Step 4 section |
| 30s vertical mobile ad output | The category-correct format (Voodoo runs vertical). Anything else = miss. | M | PRD: `format: "vertical_mobile_ad"`, `durationSec: 30` |
| Regenerate without losing brief | Iteration is normal; users will generate 2-3 times. Preserving brief on regenerate = key UX. | S | PRD action: `Regenerate` |
| Demo narrative built into UI copy | Tagline "From Market Signals to Testable Creatives" repeated across landing + final output reinforces the story. | S | PRD landing tagline + closing narrative: "The creative is generated from a real market signal — not from a generic prompt." |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem reasonable but the PRD explicitly excludes. **Keep flagged — do not let scope creep reintroduce them.**

| Feature | Why Requested | Why Problematic | Alternative (PRD-aligned) |
|---------|---------------|-----------------|---------------------------|
| Raw JSON viewer for Gemini output | "Power users want the data" | Breaks premium feel, looks like a debug tool, contradicts UI rules | Structured sectioned UI with all 15 fields surfaced as readable blocks |
| Backend database / persistence | "What if user wants to come back?" | Doubles surface area, adds auth, race conditions, deploy complexity for zero MVP value | Frontend state only; optional `localStorage` snapshot |
| Multi-project list, fully functional | "Looks more product-like" | "+ New Project" being functional means project CRUD, listing, deletion, navigation — entire feature tree | Sidebar shows the list **visually** but only Demo Project is wired |
| Dark mode | "Standard SaaS toggle" | Doubles design tokens, contradicts Voodoo-light brand direction | Premium light only — single accent, consistent across views |
| Cyberpunk / "AI futuristic" aesthetic | "Looks like an AI tool" | Off-brand for Voodoo (playful, accessible casual gaming), feels generic | Light/charcoal/single-accent — Voodoo-inspired, "premium playful" |
| More than 2 selectable games | "Should support all Voodoo titles" | Each game requires correct category + tag taxonomy, vetted live data | Hardcoded Marble Sort + Control Mob; tags editable for ad-hoc tuning |
| Sampled-frames Gemini analysis (when full video works) | "Cheaper / faster" | Loses scene flow fidelity, undermines "individual analysis" wow moment | Full-video Gemini call; frame extraction only as last-resort fallback |
| Silent fallback to mock data on Sensor Tower failure | "Demo must always work" | Destroys "real market signal" credibility — judges spot fake data instantly | Visible error + Retry button. Mock data only behind explicit env flag, never presented as live |
| Generate multiple final videos in parallel | "User wants options" | Triples Scenario cost + complexity, dilutes demo focus | One creative, well — `Regenerate` button for iteration on the same brief |
| Generic loading copy ("Loading…", spinner only) | "Standard pattern" | 2026 UX research: generic loaders increase user anxiety; specific copy reduces perceived wait time | Use PRD-mandated exact strings ("Running Sensor Tower scan...", etc.) |
| Free-form prompt input to Scenario | "Power user feature" | Bypasses the entire pattern → brief → prompt chain that *is* the product | Brief stays the editable surface; prompt is *derived* + read-only |
| Auth / accounts / sharing | "Real product needs login" | Out of scope for hackathon, no DB anyway | Single-tenant demo, URL is the share mechanism |
| Mobile-responsive tool UI | "Modern apps are responsive" | Tool is desktop-first by design; output is mobile vertical video. Conflating the two confuses the brand. | Tool: desktop ≥1280px first. Output preview: vertical 9:16 frame inside desktop layout. |
| In-app A/B test / performance prediction | "Like VidMob does" | Massive scope, requires historical data + ML | Cite Sensor Tower signals as proxy in `rankingReason`; predictive scoring is V2 |
| Comments / collaboration / approvals | "Creative briefs need stakeholders" | No auth, no DB, no users | Single-user demo; stakeholders watch the demo together |

## Feature Dependencies

```
Step 1: Game Identity
    └── feeds category + tags into ──> Step 2: Market Scan Config
                                            └── Sensor Tower live call ──> Top 3 Ads ──> User selects 1 ad
                                                                                              │
                                                                                              ▼
                                                                                     Step 3: Pattern Analysis
                                                                                              │
                                                          Selected ad video + game ──> Gemini full-video analysis
                                                                                              │
                                                                                              ▼
                                                                          15 analysis sections (no JSON)
                                                                                              │
                                                                                              ▼
                                                                              3 patterns extracted + scored
                                                                              (uses analysis + ad + game)
                                                                                              │
                                                                                              ▼
                                                                                     User selects 1 pattern
                                                                                              │
                                                                                              ▼
                                                                                     Step 4: Creative Output
                                                                                              │
                                                                            Selected pattern ──> Brief generated
                                                                                              │
                                                                                  Brief (editable) ──> Scenario prompt (derived)
                                                                                              │
                                                                                              ▼
                                                                                     Scenario API ──> 30s video
                                                                                              │
                                                                                              ▼
                                                                              Rationale + source evidence shown


Cross-cutting (every step):
    [Loading state copy] ──enhances──> [API call sections]
    [Error state + Retry] ──enhances──> [API call sections]
    [Confidence badges] ──enhances──> [Gemini analysis] + [Pattern scoring]
    [localStorage snapshot] ──enhances──> [Global frontend state]


Conflicts:
    [Live Sensor Tower] ──conflicts──> [Silent mock fallback]   (PRD-forbidden)
    [Premium light UI] ──conflicts──> [Dark mode toggle]         (PRD-forbidden)
    [Structured analysis sections] ──conflicts──> [Raw JSON dump] (PRD-forbidden)
    [Editable brief surface] ──conflicts──> [Free-form Scenario prompt input] (breaks the chain)
```

### Dependency Notes

- **Step 2 hard-blocks Step 3:** Gemini cannot analyze without a `selectedAd` carrying a usable `videoUrl` or `creativeUrl`. If Step 2 returns ads without video assets, Step 3 cannot run. Roadmap implication: validate that the chosen ranking surface always returns at least one playable creative.
- **Step 3 hard-blocks Step 4:** Brief generation depends on `geminiAnalysis` + `selectedPattern` (`creativeBrief-generation.md` prompt template). No analysis = no brief.
- **Game Identity (Step 1) influences scoring in Step 3:** `gameFitScore` (25% weight) requires `category + tags` from Step 1. If Step 1 is skipped, scoring degrades.
- **Loading copy + Error states enhance every API call:** Cross-cutting concern. Build once (`components/ui/LoadingState.tsx`), reuse 3x.
- **`localStorage` snapshot enhances Global state:** Optional per PRD, but cheap insurance against accidental refresh during a demo.
- **Mock data flag (`NEXT_PUBLIC_USE_DEV_MOCKS`) conflicts with live thesis:** Must never display mock data as real. The flag is for dev-loop only; UI should *visually* signal mock mode (e.g., a `DEV MOCK` ribbon) when active.

## MVP Definition

### Launch With (v1) — Aligned with PRD's 10 Phases

The PRD itself defines MVP. Bullet list mirrors PRD MVP definition + acceptance criteria.

- [ ] **Landing page** — title, tagline, 4 workflow cards, `Get Started` CTA, premium light UI (PRD `/`)
- [ ] **Project shell with sidebar + 4 tabs** (PRD `/project`)
- [ ] **Step 1 — Game Identity:** Marble Sort + Control Mob dropdown, auto-fill category/tags, both editable, Continue button (PRD Step 1)
- [ ] **Step 2 — Market Scan:** 3 config dropdowns, **live Sensor Tower call**, KPI cards, Top 3 ranked ad cards with `rankingReason`, ad selection, optional full grid (PRD Step 2)
- [ ] **Step 3 — Pattern Analysis:** **Full-video Gemini call**, 15 structured sections (no JSON), Scene Flow timeline, **3 patterns extracted with 4 sub-scores**, Pattern Mapping Table (Pattern · Evidence · Adaptation · Confidence), pattern selection (PRD Step 3)
- [ ] **Step 4 — Creative Output:** Selected pattern summary, **editable creative brief** (11 fields), derived Scenario prompt (read-only), `Generate 30s Ad` → Scenario API, video preview, Rationale section, Regenerate (PRD Step 4)
- [ ] **Loading states** with PRD-mandated exact copy on every API call
- [ ] **Error states** with Retry on every API call; brief + prompt preserved on Scenario error
- [ ] **No-DB frontend state** (`AppState`), optional localStorage snapshot
- [ ] **`.env.local`** for the 3 API keys + `.env.local.example`
- [ ] **Vercel-ready deploy**

### Add After Validation (v1.x) — Post-Demo Polish

Features that strengthen the demo if time permits, but don't block the v1 narrative.

- [ ] **Optional ads grid below Top 3** (PRD says "Optional") — useful for showing breadth of the scan but not required for the demo flow
- [ ] **`DEV MOCK` visual ribbon** when `NEXT_PUBLIC_USE_DEV_MOCKS=true` — operational safety net so mock mode is never mistaken for live
- [ ] **localStorage state snapshot** — refresh-safety during the live demo
- [ ] **Subtle premium motion** (page transitions, card hover lift) — only if it doesn't distract; PRD says "Minimal premium motion"
- [ ] **Keyboard shortcuts** for Continue / Regenerate — judges-friendly polish
- [ ] **Copy-to-clipboard on Scenario prompt** — small but useful trust gesture
- [ ] **Download / share final video** — adds to the takeaway moment

### Future Consideration (v2+) — Out of Hackathon Scope

- [ ] Multi-project / project CRUD with persistence
- [ ] Auth + multi-user collaboration (comments on briefs)
- [ ] Game catalog beyond Marble Sort + Control Mob
- [ ] Multiple final videos in parallel (A/B variants)
- [ ] Performance prediction / historical CTR linkage à la VidMob
- [ ] Export brief to PDF / Notion / Figma
- [ ] Real-time Sensor Tower polling / scheduled scans
- [ ] Pattern library learning across past projects

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Live Sensor Tower call | HIGH (thesis-critical) | HIGH (real API integration, error handling, schema mapping) | P1 |
| Top 3 ad cards with `rankingReason` | HIGH | MEDIUM | P1 |
| Gemini full-video analysis | HIGH (wow moment #1) | HIGH (video upload/URL handling, prompt engineering) | P1 |
| Structured analysis sections (no JSON) | HIGH | MEDIUM (15 sections × layout) | P1 |
| Scene Flow timeline | HIGH (visual credibility) | MEDIUM | P1 |
| 3 patterns + 4 sub-scores | HIGH (explainability) | MEDIUM (scoring formula) | P1 |
| Pattern Mapping Table | HIGH (trust chain made visible) | LOW (pure layout) | P1 |
| Editable creative brief | HIGH | MEDIUM (11 fields, inline editing, autosave) | P1 |
| Scenario 30s video generation | HIGH (wow moment #2) | HIGH (API call, async status, video render) | P1 |
| Rationale + source evidence on output | HIGH (trust chain close) | LOW | P1 |
| PRD-mandated loading copy | MEDIUM | LOW | P1 |
| Error + Retry on every API | HIGH (demo safety) | LOW (shared component) | P1 |
| Game Identity step | MEDIUM (gates everything) | LOW (hardcoded data) | P1 |
| Premium light UI tokens | HIGH (brand fit) | MEDIUM (Tailwind config + tokens) | P1 |
| Sidebar with read-only project list | LOW (cosmetic context) | LOW | P1 |
| Optional full ads grid | LOW | LOW | P2 |
| localStorage snapshot | MEDIUM (demo safety) | LOW | P2 |
| `DEV MOCK` visual ribbon | MEDIUM (integrity safety) | LOW | P2 |
| Subtle motion / hover states | LOW | LOW | P2 |
| Copy-to-clipboard on prompt | LOW | LOW | P2 |
| Keyboard shortcuts | LOW | LOW | P3 |
| Multi-project CRUD | LOW (out of MVP) | HIGH | P3 (deferred) |
| Auth / accounts | LOW (out of MVP) | HIGH | P3 (deferred) |
| Export / share video | MEDIUM | MEDIUM | P3 |

**Priority key:**
- **P1** — Must have for hackathon demo (PRD acceptance criteria)
- **P2** — Should have if Phase 10 polish window allows
- **P3** — Nice to have / out of MVP scope

## Competitor Feature Analysis

| Feature | VidMob (enterprise creative intel) | MobileAction / AppTweak (ad intel) | Pencil / Briefly (AI brief) | Runway / Pika / Scenario (AI video) | Our Approach |
|---------|------------------------------------|------------------------------------|------------------------------|--------------------------------------|--------------|
| Ad-intelligence dashboard | KPI cards + creative library + performance overlay | Top creatives ranked by SoV / impressions | N/A | N/A | KPI cards + Top 3 with `rankingReason` (lighter, demo-focused) |
| Top-N ranking transparency | Mostly black-box | Surfaces SoV / creative score | N/A | N/A | **Surface ranking reason per ad + 4 sub-scores per pattern** (more transparent than category leaders) |
| Video creative analysis | AI tags creative elements vs business outcomes | OCR + scene segmentation + tags | N/A | N/A | **Gemini full-video → 15 named sections** (richer than tag-based) |
| Pattern extraction | "Creative Genome" (proprietary) | Limited | N/A | N/A | **3 patterns scored on 4 axes, with evidence + adaptation** |
| Brief generation | Manual or templated | N/A | AI-generated, structured templates | N/A | AI-generated brief from pattern, **inline editable**, 11 structured fields |
| Brief → prompt chain | N/A | N/A | Brief is the deliverable | Free-form prompt input | **Brief is editable surface; prompt is derived + read-only** (chain is visible) |
| Final video output | Production handled by humans | N/A | N/A | Generative video, often free-form prompt | **30s vertical mobile ad, prompt-derived from brief** (full chain) |
| Trust / traceability | Performance overlay | Source attribution (network, region) | N/A | Generally weak | **Full chain visible: ad → pattern → brief → prompt → video, with rationale** |
| UI aesthetic | Enterprise SaaS | Data-dense | Templated | Studio / dark / cyberpunk | **Voodoo premium light** — distinctive in the AI-video category |
| Loading UX | Generic | Generic | Generic | Often shows queue position | **PRD-specified, action-specific copy** ("Running Sensor Tower scan…") |

**Strategic positioning:** Voodoo Creative Radar is not a VidMob competitor — it's a *demo-grade tool* that shows a UA-strategist workflow end-to-end in 4 minutes. The differentiator is **the visible chain**: every other category leader hides one or more steps (the data, the analysis, or the prompt). This product hides nothing.

## UI / UX Pattern Notes (per the 8 sub-questions)

### 1. Ad-intelligence dashboard UX
- **KPI cards** at top, single row — Label → Value → optional supporting label. No deltas needed (single point-in-time scan, not historical).
- **Top-N pattern**: 3 cards in a horizontal row on desktop, ranked badges (#1/#2/#3) using a single accent color, thumbnail prominent (~16:9 or 1:1 if not 9:16-cropped).
- **Network / format chips** as small pill badges next to ad metadata (`Meta` · `video` · `90d`).
- **Time-range / market / count** as native `<select>` styled as Tailwind components — no fancy multi-select needed.
- **Run button** anchored next to config, primary accent only on actionable verbs.

### 2. AI video analysis presentation
- **15 sections** organized as a single-column scrollable panel with section titles + body cards. No tabs (forces scanning) and no accordions (hides info judges want to see).
- **Hook callout**: dedicated colored card for `0-3s Hook` with the timestamp prominent — this is the most important UX element of Step 3.
- **Scene Flow timeline**: horizontal scrollable timeline with timestamp markers. Behance/Dribbble 2026 patterns use a horizontal timeline of 3-6 cards with elapsed-time labels.
- **Confidence badge**: small pill near analysis title, color-coded (green ≥ 0.8 / amber 0.5-0.8 / grey < 0.5). Never hide low confidence — surface it.
- **What users hate** (validated by 2026 UX research): raw JSON, walls of unstructured text, no source link, false certainty. PRD already excludes all of these.

### 3. Creative brief editor
- **Inline editing per field** (click → edit). Use `<textarea>` (auto-grow) for long fields, `<input>` for short. Avoid modal editors — they break flow.
- **Scene-by-scene structure** for `sceneFlow30s` field: render as a vertical list of `[timestamp] [description]` rows, each editable inline.
- **Autosave to local React state** on blur (no backend). Optionally debounced sync to localStorage.
- **Reset / Regenerate brief** as secondary buttons — give users an out without forcing them to reload.
- **Visual diff between AI-generated and user-edited fields** is a P3 nicety.

### 4. AI generation status UX
- **Linear progress / indeterminate spinner** with PRD-mandated copy is enough for ≤90s waits (Scenario timeframe). No queue position needed if the API doesn't expose it.
- **Disable Generate button while in-flight**, show inline status near the button.
- **Regenerate** = same button label/position once a video exists; clears the video preview but **keeps brief + prompt**.
- **Error retry without losing brief** — mandatory per PRD. Implementation: brief + prompt live in `AppState`, Scenario call is an effect; failure does not mutate state.

### 5. Trust and traceability
- **Pattern Mapping Table** as the trust artifact: 4 columns (Pattern · Evidence · Adaptation · Confidence). One row per pattern. This is the screenshot judges remember.
- **Source ad evidence** on every pattern card — quote or summary tied back to `selectedAd`.
- **Visible chain**: pattern card → brief field provenance → derived prompt → final video. Each downstream artifact references the upstream one.
- **Rationale section** on Step 4: paragraph explaining "this creative came from this ad via this pattern." Closes the loop.

### 6. Premium light UI design tokens
- **Backgrounds**: page `#FAFAFA`, card `#FFFFFF`, soft section dividers via 1px `#E5E7EB` border or shadow `0 1px 2px rgba(0,0,0,0.04)`.
- **Type**: charcoal `#0F172A` headings, `#475569` body, system font stack or Inter.
- **Accent**: ONE color used sparingly — only for primary CTAs, ranked badges, links, selected states. Suggested: a Voodoo-aligned vibrant accent (e.g., a saturated coral/magenta or signature purple — confirm with brand team). Avoid generic blue.
- **Border radius**: 8-12px on cards, 6-8px on inputs/buttons. Vercel-style (avoid the 16px+ "consumer SaaS" feel).
- **Spacing**: generous — `py-12` between sections, `gap-6` in card grids.
- **Motion**: 150-200ms ease for hover lifts, no parallax, no auto-playing animations.

### 7. Loading state copy patterns
- 2026 UX research **strongly endorses specific, action-oriented loading copy**. The PRD-mandated strings are best-practice — keep them verbatim.
- Anti-pattern: replacing them with "Loading…" or generic spinners.
- Consider adding tiny secondary text under each one (e.g., "This usually takes 30-60 seconds") for the longer Scenario step — but only if PRD permits; if PRD is strict, honor verbatim.

### 8. Mobile responsiveness expectations
- **Tool itself: desktop-first.** Designed for ≥1280px. Acceptable down to 1024px. Below that, show a "Best viewed on desktop" notice rather than a half-broken mobile layout.
- **Output preview: vertical 9:16.** Render the Scenario video in a centered phone-frame mock or a 9:16 container with `max-w-[360px]`. The ad is mobile; the studio is desktop. Conflating the two is confusing.
- This split mirrors how Figma, Runway, and other creative-studio tools handle "build on desktop, output for mobile."

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Table stakes feature list | HIGH | PRD is explicit + cross-validated against 2026 ad-intel + AI dashboard patterns |
| Differentiators | HIGH | Trust-chain transparency is a documented 2026 trend; PRD already operationalizes it |
| Anti-features | HIGH | PRD's Out of Scope is well-reasoned and survives 2026 best-practice scrutiny |
| Feature complexity (S/M/L) | MEDIUM | Estimates assume Sensor Tower / Gemini / Scenario APIs behave as documented. Sensor Tower video URL availability is the largest unknown. |
| Dependency graph | HIGH | Linear wizard, dependencies are obvious from PRD types |
| Loading copy strategy | HIGH | 2026 UX research aligns with PRD's specific-text mandate |
| Premium light token recommendations | MEDIUM | Vercel/Linear aesthetic is well-documented; exact Voodoo accent color requires brand confirmation |

## Open Questions for Roadmap

1. **Does Sensor Tower reliably return playable `videoUrl` for hyper-casual ads?** If not, Phase 6 (Gemini analysis) needs a fallback strategy (e.g., redirect via creative URL, frame extraction). Flag for Phase 4 research.
2. **What's Voodoo's exact brand accent color?** Affects `tailwind.config.ts` tokens. Default to a placeholder (e.g., `#FF3D71` coral or signature purple) until confirmed.
3. **Does Gemini accept video URLs directly, or does it require upload/inline data?** Affects Phase 6 architecture. Likely needs Context7/official docs check during Phase 6 research.
4. **Scenario API: does it expose generation progress / queue position?** If yes, P2 enhancement to surface it. If no, indeterminate progress is fine.
5. **Should the brief fields show "AI-generated" vs "user-edited" indicator?** P3 polish, but useful for trust. Defer unless Phase 10 has time.

## Sources

- [Marketing Dashboards: The #1 Guide with 25+ Examples for 2026 — Improvado](https://improvado.io/blog/12-best-marketing-dashboard-examples-and-templates)
- [Effective Dashboard Design: Principles, Best Practices, and Examples — DataCamp](https://www.datacamp.com/tutorial/dashboard-design-tutorial)
- [Smart SaaS Dashboard Design Guide (2026) — F1Studioz](https://f1studioz.com/blog/smart-saas-dashboard-design/)
- [Dashboard Design in 2026: Do's and Don'ts — Think Design](https://think.design/blog/dashboard-design-in-2026-dos-and-donts/)
- [Best AI Video Analysis Tools in 2026 — Mixpeek](https://mixpeek.com/curated-lists/best-ai-video-analysis-tools)
- [AI Video Analysis: Tools, Use Cases & How It Works (2026) — Articsledge](https://www.articsledge.com/post/ai-video-analysis)
- [Memories.ai — AI Video Analysis & Visual Memory Platform](https://memories.ai)
- [Best YouTube Video Analyzer AI Tools in 2026 — OutlierKit](https://outlierkit.com/blog/best-youtube-analyzer-ai-tools)
- [Top 10 Creative Brief Tools for 2026 — Uplifted.ai](https://www.uplifted.ai/blog/post/top-10-creative-brief-tools-for-2026-from-ai-collaboration-to-performance-driven-workflows)
- [Briefly | AI Powered Creative Brief Generator](https://briefly-generator.webflow.io/)
- [Sora vs Runway vs Pika: AI Video Generator Comparison — pxz.ai](https://pxz.ai/blog/sora-vs-runway-vs-pika-best-ai-video-generator-2026-comparison)
- [Best AI Video Editors 2026: Testing Runway, Pika, Kling 2.0, Veo 3, Sora 2 — Humai](https://www.humai.blog/best-ai-video-editors-2026-testing-runway-pika-kling-2-0-veo-3-sora-2/)
- [UX and AI in 2026: From Experimentation to Trust — Cleverit Group](https://www.cleveritgroup.com/en/blog/ux-and-ai-in-2026-from-experimentation-to-trust)
- [Designing Trust in AI Products: UX Strategies for Product Leaders — Standard Beagle](https://standardbeagle.com/designing-trust-in-ai-products/)
- [Building trust in the AI era with privacy-led UX — MIT Technology Review](https://www.technologyreview.com/2026/04/15/1135530/building-trust-in-the-ai-era-with-privacy-led-ux/)
- [Vercel Design System Breakdown: Colors, Typography, and Tokens — SeedFlip](https://seedflip.co/blog/vercel-design-system)
- [Which UI libraries/frameworks support the Linear aesthetic? — LogRocket](https://blog.logrocket.com/ux-design/linear-design-ui-libraries-design-kits-layout-grid/)
- [The Modern Color Palette: UI/UX Color Trends That Define 2026 — Recursion](https://recursion.software/blog/ui-color-trends-2026)
- [7 SaaS UI Design Trends in 2026 — SaaSUI Blog](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)
- [Best AI Creative Intelligence Platforms for Mobile Games (2026) — Segwise](https://segwise.ai/blog/creative-intelligence-for-mobile-games-dtc-subscription-apps)
- [Ad Strategy Analysis for Hyper-Casual Games — MobileAction](https://www.mobileaction.co/blog/ad-strategy-analysis-hyper-casual-games/)
- [Ultimate Guide to Creative Testing for Mobile Game User Acquisition — Segwise](https://segwise.ai/blog/creative-testing-mobile-game-user-acquisition-guide)
- [Loading | Primer (GitHub Design System)](https://primer.style/ui-patterns/loading)
- [10 UX Writing Best Practices for Clear & Concise UI Copy — ParallelHQ](https://www.parallelhq.com/blog/ux-writing-best-practices)
- [10 UX Best Practices to Follow in 2026 — UX Pilot](https://uxpilot.ai/blogs/ux-best-practices)
- [Designing A Timeline For Mobile Video Editing — img.ly](https://img.ly/blog/designing-a-timeline-for-mobile-video-editing/)
- [50 Best Dashboard Design Examples for 2026 — Muzli](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)

---
*Feature research for: Voodoo Creative Radar (AI-driven creative intelligence + 30s ad generation)*
*Researched: 2026-04-25*
