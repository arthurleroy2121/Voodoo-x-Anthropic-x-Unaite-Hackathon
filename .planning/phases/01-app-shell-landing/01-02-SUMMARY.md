---
phase: 01-app-shell-landing
plan: "02"
subsystem: foundations
tags: [typescript, zustand, types, server-only, state-management]
dependency_graph:
  requires:
    - "01-01: Next.js scaffold + tsconfig strict + directory structure"
  provides:
    - "lib/types.ts: 11 types PRD verbatim (source unique pour toutes les phases 2-9)"
    - "lib/copy.ts: 4 constantes loading texts verbatim PRD"
    - "lib/utils.ts: helper cn() clsx + tailwind-merge"
    - "lib/state.ts: store Zustand 5 hydration-safe (persist + skipHydration)"
    - "data/games.ts: 2 jeux Voodoo hardcodés conformes GameIdentity"
    - "lib/sensorTower.ts + gemini.ts + scenario.ts + prompts.ts: stubs server-only"
    - "lib/scoring.ts + formatters.ts: stubs purs (pas server-only)"
  affects:
    - "Phase 2: branchera useApp() aux tabs + rehydration"
    - "Phase 3: atomes UI importeront cn() depuis lib/utils.ts"
    - "Phase 4: implémentera fetchSensorTowerAds dans lib/sensorTower.ts"
    - "Phase 6: implémentera analyzeSelectedAdWithGemini + loadPrompt"
    - "Phase 7: implémentera generateTopPatterns dans lib/scoring.ts"
    - "Phase 8: implémentera buildScenarioPrompt dans lib/scenario.ts"
    - "Phase 9: implémentera generateScenarioAd dans lib/scenario.ts"
tech_stack:
  added:
    - server-only@0.0.1 (barrière compilation Next.js, importé par 4 libs API)
  patterns:
    - "Zustand 5 persist + partialize + skipHydration: true (D-17, PITFALLS.md)"
    - "setField() updater function pattern pour exactOptionalPropertyTypes compat"
    - "import 'server-only' en ligne 1 (D-20, T-02-01)"
key_files:
  created:
    - lib/types.ts (11 types PRD verbatim)
    - lib/copy.ts (4 constantes loading texts verbatim)
    - lib/utils.ts (helper cn())
    - lib/state.ts (store Zustand 5 hydration-safe)
    - data/games.ts (2 jeux Voodoo conformes PRD)
    - lib/sensorTower.ts (stub server-only)
    - lib/gemini.ts (stub server-only)
    - lib/scenario.ts (stub server-only)
    - lib/prompts.ts (stub server-only)
    - lib/scoring.ts (stub pur)
    - lib/formatters.ts (stub pur)
  modified:
    - package.json (ajout server-only)
    - pnpm-lock.yaml
decisions:
  - "setField() updater function pour contourner exactOptionalPropertyTypes + Zustand set() — Zustand partial set() avec T|undefined sur une propriété optionnelle est rejeté par TS strict ; solution : updater function (prev) => ({...prev, key: value})"
  - "server-only installé comme dépendance explicite — absent du scaffold Phase 1, requis dès Phase 1 pour les 4 stubs (D-20)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-25"
  tasks_completed: 3
  files_created: 11
  files_modified: 2
---

# Phase 1 Plan 02: TypeScript Foundations — Summary

**One-liner:** 11 types PRD verbatim + store Zustand 5 hydration-safe + 4 stubs server-only + données jeux + helper cn() — fondations TypeScript complètes pour toutes les phases 2-9.

## What Was Built

Pose de toutes les fondations TypeScript du projet Creative Radar. Aucune logique métier — uniquement les types, constantes, store d'état, et stubs typés qui serviront de contrat d'interface pour les plans suivants.

## Types PRD Exportés (`lib/types.ts`)

| Type | Source PRD | Description |
|------|-----------|-------------|
| `GameIdentity` | lignes 108-114 | Identité d'un jeu Voodoo (gameId, gameName, category, tags) |
| `MarketScanConfig` | lignes 132-138 | Configuration du scan Sensor Tower (numberOfAds, timeRange, market) |
| `MarketAd` | lignes 140-157 | Une publicité retournée par Sensor Tower |
| `MarketScanResult` | lignes 159-164 | Résultat complet du scan (ads, topAds, selectedAd) |
| `GeminiAdAnalysis` | lignes 217-234 | Analyse Gemini d'une vidéo (15 champs verbatim) |
| `CreativePattern` | lignes 270-283 | Pattern créatif scoré (4 scores + explanation + evidence) |
| `PatternAnalysisResult` | lignes 285-290 | Résultat de l'analyse patterns |
| `CreativeBrief` | lignes 348-360 | Brief créatif éditable (concept, sceneFlow30s, cta, rationale...) |
| `ScenarioPrompt` | lignes 362-366 | Prompt Scenario (durationSec: 30, format: 'vertical_mobile_ad') |
| `CreativeOutput` | lignes 368-375 | Output final (scenarioVideoUrl, status: idle/generating/complete/error) |
| `AppState` | lignes 377-390 | État global wizard (currentStep: 'game'|'market'|'patterns'|'creative') |

## Constantes Copy Verbatim (`lib/copy.ts`)

| Constante | Valeur verbatim PRD |
|-----------|---------------------|
| `RUNNING_SENSOR_TOWER_SCAN` | `'Running Sensor Tower scan...'` |
| `ANALYZING_AD_WITH_GEMINI` | `'Analyzing selected ad with Gemini...'` |
| `GENERATING_CREATIVE_BRIEF` | `'Generating creative brief...'` |
| `GENERATING_30S_AD` | `'Generating 30-second ad with Scenario...'` |

## Décisions Zustand (`lib/state.ts`)

- **Clé localStorage** : `vcr.appstate.v1` (versionnée — bump à v2 si AppState évolue)
- **Champs persistés** : tous les champs domaine (11 champs AppState)
- **Champs NON persistés** : aucun champ transient (loading, error) n'existe encore — seront ajoutés dans les plans fonctionnels mais jamais dans `partialize`
- **`skipHydration: true`** : obligatoire pour Next.js App Router (PITFALLS.md hydration mismatch). Phase 2 appellera `useApp.persist.rehydrate()` depuis un `useEffect` dans `app/layout.tsx`
- **Pattern `setField()`** : contournement nécessaire pour `exactOptionalPropertyTypes: true` — Zustand `set({ prop: undefined })` est rejeté par TS strict sur les propriétés optionnelles. Solution : updater function `(prev) => ({ ...prev, key: value })`

## Stubs Server-Only

| Fichier | `import 'server-only'` | Implémenté en | Fonction(s) |
|---------|----------------------|--------------|-------------|
| `lib/sensorTower.ts` | oui (ligne 1) | Phase 4 | `fetchSensorTowerAds()` |
| `lib/gemini.ts` | oui (ligne 1) | Phase 6 | `analyzeSelectedAdWithGemini()` |
| `lib/scenario.ts` | oui (ligne 1) | Phase 8/9 | `buildScenarioPrompt()`, `generateScenarioAd()` |
| `lib/prompts.ts` | oui (ligne 1) | Phase 6 | `loadPrompt()` |
| `lib/scoring.ts` | non (pur) | Phase 7 | `generateTopPatterns()` |
| `lib/formatters.ts` | non (pur) | — | `formatPercent()`, `formatNumber()`, `formatDate()` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `server-only` absent des deps du scaffold**
- **Found during:** Task 3
- **Issue:** `import 'server-only'` cause une erreur à la compilation si le paquet n'est pas installé. Il était absent du `package.json` généré en Plan 01-01.
- **Fix:** `pnpm add server-only` avant la création des stubs
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Commit:** 8675ec7

**2. [Rule 1 - Bug] `exactOptionalPropertyTypes: true` incompatible avec Zustand `set({ prop: undefined })`**
- **Found during:** Task 2 (tsc --noEmit)
- **Issue:** TypeScript strict rejette `set({ gameIdentity: undefined })` car `Partial<AppState>` avec `exactOptionalPropertyTypes` n'accepte pas `| undefined` sur les propriétés optionnelles via objet littéral
- **Fix:** Utilisation d'une fonction utilitaire `setField()` avec updater `(prev) => ({ ...prev, key: value })` — equivalent runtime, compatible TS strict
- **Files modified:** `lib/state.ts`
- **Commit:** 47d4b40

## Threat Surface Scan

Aucune nouvelle surface de sécurité introduite au-delà du threat model :
- T-02-01 mitigé : `import 'server-only';` en ligne 1 sur les 4 libs API — vérifié par `head -1`
- T-02-02 accepté : localStorage sans secrets (état applicatif uniquement)
- T-02-06 mitigé : tous les stubs lèvent une `Error` explicite mentionnant la phase d'implémentation

## Self-Check: PASSED

Fichiers vérifiés :
- [x] `lib/types.ts` — 11 exports `type`, AppState.currentStep, durationSec: 30, format: 'vertical_mobile_ad'
- [x] `lib/copy.ts` — 4 constantes verbatim PRD
- [x] `lib/utils.ts` — `cn()` via twMerge(clsx(inputs))
- [x] `data/games.ts` — 2 jeux (Puzzle + Battle), import depuis @/lib/types
- [x] `lib/state.ts` — 'use client', skipHydration: true, name: 'vcr.appstate.v1', partialize sans loading/error
- [x] `lib/sensorTower.ts` — `import 'server-only';` ligne 1
- [x] `lib/gemini.ts` — `import 'server-only';` ligne 1
- [x] `lib/scenario.ts` — `import 'server-only';` ligne 1
- [x] `lib/prompts.ts` — `import 'server-only';` ligne 1
- [x] `lib/scoring.ts` — pas de server-only (pur)
- [x] `lib/formatters.ts` — pas de server-only (pur)
- [x] `pnpm exec tsc --noEmit` — exit 0
- [x] `pnpm build` — exit 0, aucune erreur TypeScript

Commits vérifiés :
- [x] 8675ec7 — feat(01-02): types PRD verbatim + copy constants + games data + cn()
- [x] 47d4b40 — feat(01-02): Zustand 5 store hydration-safe
- [x] 1307c58 — feat(01-02): stubs server-only libs + scoring + formatters
