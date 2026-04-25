## Conflict Detection Report

Mode: merge
Generated: 2026-04-25
Inputs analyzed:
  - 1 classification (PRD): /Users/antoinevoinchet/Desktop/Hackathon/.planning/intel/classifications/voodoo-creative-radar-prd.json
  - 1 source PRD: /Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md
  - Existing context: /Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md, /Users/antoinevoinchet/Desktop/Hackathon/.planning/research/STACK.md, /Users/antoinevoinchet/Desktop/Hackathon/.planning/research/ARCHITECTURE.md
Precedence applied: ADR > SPEC > PRD > DOC

Cross-reference cycle detection: PASS (no cycles — 0 cross_refs declared)
UNKNOWN low-confidence docs: 0
LOCKED ADRs in ingest: 0

### BLOCKERS (0)

(none)

### WARNINGS (0)

(none — only one PRD ingested, so no competing acceptance variants are possible)

### INFO (1)

[INFO] Single-source ingest, no precedence conflicts triggered
  Note: Only one classified document was ingested — voodoo-creative-radar-prd.md (PRD, precedence 2, locked=false). No ADR or SPEC was provided that could outrank or contradict it. Existing /Users/antoinevoinchet/Desktop/Hackathon/.planning/PROJECT.md was derived from this same PRD on 2026-04-25; spot-check confirms alignment on stack (Next.js App Router + TypeScript + React + Tailwind), deploy target (Vercel), data layer (no DB, frontend state only), Sensor Tower live-only policy, 30s vertical Scenario output, and the 2-game catalog. No contradiction with locked decisions in PROJECT.md (PROJECT.md contains no `<decisions locked>` block). Synthesis proceeded with PRD content treated as authoritative and surfaced as `proposed` decisions awaiting future ADR formalization.
