# Decisions Intel

> Synthesized from classified ADRs. Highest-precedence source for architectural and product decisions.
> No ADR was provided in this ingest. Decisions below are surfaced from the PRD as `proposed` (PRD-precedence), and should be promoted to ADRs only via explicit ADR documents.

## ADR Inventory

(None — no ADR documents in classification set.)

## Proposed Decisions Surfaced from PRD

These statements come from the PRD and act as `proposed` decisions until an ADR formalizes them. They are not LOCKED. Any future ADR that contradicts one of these takes precedence.

### Decision: Stack imposed — Next.js (App Router) + TypeScript + React + Tailwind CSS
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header + "FILE ARCHITECTURE")
- Statement: The product is built with Next.js (App Router), TypeScript, React, Tailwind CSS.
- Scope: frontend framework + language + styling

### Decision: Deploy target — Vercel
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header + "ACCEPTANCE CRITERIA — Technical")
- Statement: Vercel is the deploy target. No other target.
- Scope: hosting / deployment

### Decision: No database, frontend state only
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header "No database. Frontend state only." + "GLOBAL STATE" section)
- Statement: No backend database. State is held in the frontend; localStorage persistence is optional.
- Scope: data layer / persistence

### Decision: Sensor Tower must be called live — no silent fallback in live mode
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 2 — "CRITICAL: Sensor Tower must be called live. No preloaded database. No silent fallback to fake data in live mode.")
- Statement: In live mode, Sensor Tower is the sole source of market ad data. Dev mocks are gated behind `NEXT_PUBLIC_USE_DEV_MOCKS=true` and live in `data/devMockAds.ts`; they must never be presented as real Sensor Tower data.
- Scope: market data integrity

### Decision: API key set — Sensor Tower, Gemini, Scenario via .env.local
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (ENV VARIABLES)
- Statement: The product depends on three external APIs — Sensor Tower (live market ads), Gemini (video analysis), Scenario (video generation). Keys live in `.env.local`. An `.env.local.example` ships with empty keys.
- Scope: integrations / secrets

### Decision: Final output — one 30-second vertical mobile video ad
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (header + STEP 4 + MVP DEFINITION)
- Statement: The MVP produces exactly one 30-second vertical mobile ad via Scenario. Multiple-video output is out of scope.
- Scope: deliverable / scope boundary

### Decision: 10-phase build sequence (PRD-defined)
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (PHASES section)
- Statement: Implementation follows 10 phases, each gated on local verification before moving to the next. The roadmap may regroup phases if pertinent.
- Scope: delivery cadence

### Decision: Hardcoded 2-game catalog for MVP — Marble Sort + Control Mob
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 1 — GAME IDENTITY)
- Statement: The game selector ships with exactly two hardcoded games: Marble Sort (Puzzle) and Control Mob (Battle). Auto-fill of category and tags from the selected game; both fields editable.
- Scope: data seed / MVP boundary

### Decision: Pattern scoring formula — 35/25/20/20
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (STEP 3 — PATTERN ANALYSIS, "Scoring formula")
- Statement: Pattern Score = 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability. Exactly 3 patterns are extracted per analyzed ad.
- Scope: pattern extraction algorithm

### Decision: UI premium light, no dark mode, no raw JSON
- Status: proposed
- Source: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md (UI DESIGN RULES + landing UI requirements)
- Statement: White/off-white backgrounds, charcoal typography, single accent color, rounded cards, subtle shadows. No dark mode, no cyberpunk aesthetic, no raw JSON visible to users.
- Scope: visual design / UX

---
*Synthesized 2026-04-25 from 1 PRD document. No ADRs ingested.*
