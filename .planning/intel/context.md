# Context Intel

> Synthesized from classified DOCs. Running notes keyed by topic, with source attribution.
> No DOC document was provided in the ingest set. Background context below is surfaced from the PRD's narrative sections (precedence 2) and from the existing PROJECT.md. Treat as ambient context, not as binding contract.

## DOC Inventory

(None — no DOC documents in classification set.)

## Topic: Product Vision & Demo Narrative
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header + MVP DEFINITION) and /Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md (What This Is, Core Value)
- Notes:
  - Tagline: `From Market Signals to Testable Creatives`.
  - Demo headline: "The creative is generated from a real market signal — not from a generic prompt."
  - Internal tool aimed at a Voodoo creative strategist / UA manager who wants to go from "market data" to "testable creative" in minutes, no DB, all frontend.
  - Each generated creative must remain traceable back to a pattern observed on a top competitor ad.

## Topic: Workflow Shape (4 user-facing steps over 10 build phases)
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (PHASES + PAGES)
- Notes:
  - User journey is 4 sequential steps: Game Identity → Market Scan → Pattern Analysis → Creative Output.
  - Build cadence is 10 phases (1: shell + landing; 2: project page tabs; 3: Game Identity; 4: Market Scan UI + Sensor Tower service; 5: Top 3 ranking + selection; 6: Gemini service + UI; 7: Pattern ranking + selection; 8: Brief editor + Scenario prompt; 9: Scenario generation + final video; 10: UI polish + error/loading + Vercel readiness).
  - Roadmap may regroup phases if pertinent — that decision is left to the GSD roadmapper.

## Topic: External Surroundings (existing repo state)
- Source: /Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md (Context section)
- Notes:
  - The Hackathon repo already contains a sandbox subfolder `voodoo-hack/` (Vite/React/TS, with SensorTower MCP integration). Decision logged 2026-04-25: it stays independent — Creative Radar is built as a fresh Next.js app at the repo root per the PRD.
  - MCP configurations for Scenario + SensorTower already exist in `voodoo-hack/.mcp.json` and can be used for exploration / debugging.
  - No Next.js code yet at repo root — greenfield scaffold.

## Topic: Game Catalog (MVP seed data)
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 1)
- Notes:
  - Two hardcoded games:
    - `marble-sort` — Marble Sort — Puzzle. Tags: casual, logic, level-based, satisfying, challenge, sorting, color-matching.
    - `control-mob` — Control Mob — Battle. Tags: combat, strategy, characters, progression, mid-core, crowd-control, recruitment.
  - Lives in `data/games.ts`. The `+ New Project` button is decorative for the MVP.

## Topic: Pattern Vocabulary (examples for extraction)
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3)
- Notes:
  - Example patterns the extractor may surface: `Fail-first hook`, `Timer pressure`, `Reward reveal`, `Challenge CTA`, `Transformation payoff`, `Fast loop demonstration`, `Before/after reveal`.
  - Each pattern card must show rank, name, total score, the four sub-scores (frequency / game fit / freshness / creative actionability), explanation, source evidence, adaptation to game, confidence, and a `Select this pattern` button.
  - A "Pattern mapping table" (Market Pattern · Evidence · Adaptation to Target Game · Confidence) is required UI.

## Topic: Creative Brief Reference Structure
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 4 — Example brief structure)
- Notes:
  - Example brief seeds the editor:
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

## Topic: Out-of-Scope (from PROJECT.md)
- Source: /Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md (Out of Scope) — derived from PRD constraints
- Notes:
  - Backend database / persistence — PRD imposes "no database, frontend state only".
  - Dark mode and cyberpunk aesthetic — PRD imposes light premium UI.
  - Functional multi-projects — `+ New Project` is visible but non-functional in MVP.
  - More than the 2 hardcoded games — MVP limited to Marble Sort + Control Mob.
  - Frame extraction in Gemini analysis — only if technically required; default is full-video.
  - Silent fallback to fake data in live mode — PRD explicitly forbids it.
  - Multiple final videos — MVP produces exactly one 30-second creative.

## Topic: Existing Research Notes
- Source: /Users/antoinevoinchet/Desktop/Hackathon/.planning/research/STACK.md, ARCHITECTURE.md, FEATURES.md, PITFALLS.md (research outputs already present)
- Notes:
  - Research files exist and are treated as DOC-class context (low precedence). They were not part of this ingest's classification set, so they are not synthesized here. The roadmapper may consult them directly via `EXISTING_CONTEXT`.

---
*Synthesized 2026-04-25. No DOC ingested; topics surfaced from PRD narrative + existing PROJECT.md.*
