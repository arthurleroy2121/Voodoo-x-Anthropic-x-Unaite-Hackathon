# Requirements: Voodoo Creative Radar

**Defined:** 2026-04-25
**Source PRD:** `/Users/antoinevoinchet/Desktop/Hackathon/voodoo-creative-radar-prd.md`
**Core Value:** Transformer un signal marché réel (Sensor Tower) en une publicité 30s testable pour un jeu Voodoo, traçable jusqu'à un pattern observé sur une top ad concurrente.

## v1 Requirements

Requirements pour la release initiale (MVP démo hackathon). Chaque ID est mappé à une phase unique du roadmap. Les IDs sont conservés tels qu'extraits dans `intel/requirements.md` (préfixe `REQ-`).

### Pages

- [x] **REQ-landing-page**: Landing publique `/` introduisant le produit, le workflow 4 étapes, avec CTA `Get Started` vers `/project`. Doit afficher le titre `Voodoo Creative Radar`, la tagline `From Market Signals to Testable Creatives`, le paragraphe descriptif et 4 cartes de workflow (`1. Select a game` / `2. Scan the market` / `3. Analyze winning patterns` / `4. Generate a creative`). UI premium light, no dark mode, no JSON brut.

- [ ] **REQ-project-page**: Page projet `/project` avec header `Demo Project — Voodoo Creative Radar`, 4 onglets séquentiels (`1. Game Identity`, `2. Market Scan`, `3. Pattern Analysis`, `4. Creative Output`) et sidebar gauche (`Voodoo Creative Radar`, group `Projects`, `• Demo Project`, `+ New Project` non fonctionnel).

### Workflow Steps

- [ ] **REQ-step1-game-identity**: Onglet 1 — sélecteur listant exactement 2 jeux (`Marble Sort` Puzzle, `Control Mob` Battle) avec tags PRD ; auto-fill catégorie + tags éditables ; boutons `Save Game Identity` et `Continue to Market Scan` ; output conforme au type `GameIdentity`.

- [ ] **REQ-step2-market-scan**: Onglet 2 — appel live Sensor Tower (`lib/sensorTower.ts` → `fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult>`), 3 dropdowns config (Number of ads `10/20/30/50`, Time range `30/60/90d`, Market `US/France/UK/Global`), KPI cards (Ads retrieved, Competitor games found, Networks detected, Market, Time range), Top 3 ad cards classés (rank, thumbnail, gameName, adId, network, format, performanceSignal, first/last seen, rankingReason, bouton `Select this ad`), grille complète optionnelle, loading text exact `Running Sensor Tower scan...`, erreur explicite + retry, **aucun fallback fake en mode live** (mocks dev gated par `NEXT_PUBLIC_USE_DEV_MOCKS=true`). Output conforme aux types `MarketAd` et `MarketScanResult`.

- [ ] **REQ-step3-pattern-analysis**: Onglet 3 — analyse Gemini full-video (`lib/gemini.ts` → `analyzeSelectedAdWithGemini(ad, game): Promise<GeminiAdAnalysis>`) avec sections UI non-JSON (Selected Ad Preview, Video Summary, Opening Hook, 0–3s Hook, Scene Flow, Visual Patterns, Gameplay Mechanics, Emotional Triggers, Text Overlays, CTA, Visual Style, Pacing, Why It Works, Applicability to Selected Game, Confidence) ; extraction de 3 patterns scorés via `lib/scoring.ts` → `generateTopPatterns(analysis, ad, game): CreativePattern[]` (formule `35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability`) ; cards pattern complètes (rank, name, score total + 4 sub-scores, explanation, evidence, adaptation, confidence, bouton `Select this pattern`) ; pattern mapping table ; loading text exact `Analyzing selected ad with Gemini...`. Output conforme à `GeminiAdAnalysis`, `CreativePattern`, `PatternAnalysisResult`.

- [ ] **REQ-step4-creative-output**: Onglet 4 — brief créatif éditable (Creative Concept, Selected Pattern, Opening Hook, 30s Scene Flow, Visual Direction, Gameplay Reference, Text Overlays, CTA, Rationale, Source Evidence, Adaptation), prompt Scenario dérivé via `lib/scenario.ts` → `buildScenarioPrompt(brief, game, pattern): ScenarioPrompt`, génération vidéo `generateScenarioAd(prompt): Promise<CreativeOutput>` (durée 30s, format `vertical_mobile_ad`), 5 sections en ordre (Selected Pattern · Creative Brief · Scenario Prompt · Scenario Output · Rationale), boutons `Generate Creative Brief`, `Edit Brief`, `Generate Scenario Prompt`, `Generate 30s Ad with Scenario`, `Regenerate`, loading texts exacts `Generating creative brief...` et `Generating 30-second ad with Scenario...`, erreurs préservant brief + prompt. Output conforme à `CreativeBrief`, `ScenarioPrompt`, `CreativeOutput`.

### Cross-cutting

- [ ] **REQ-global-state**: Type `AppState` exact (`currentStep`, `gameIdentity`, `marketScanConfig`, `marketScanResult`, `selectedAd`, `geminiAnalysis`, `topPatterns`, `selectedPattern`, `creativeBrief`, `scenarioPrompt`, `creativeOutput`) ; state frontend uniquement (context/store dans `lib/state.ts`) ; persistance localStorage optionnelle.

- [ ] **REQ-error-and-loading-states**: Chaque appel externe a un loading state visible et un chemin d'erreur explicite avec retry. Sensor Tower → message clair, reste sur l'onglet, retry, jamais de fake silencieux. Gemini → erreur dans Pattern Analysis, retry, ad sélectionnée préservée. Scenario → brief + prompt restent visibles, erreur affichée, retry. Loading texts implémentés au mot près.

- [x] **REQ-file-architecture**: Arborescence imposée par PRD — `app/` (`page.tsx`, `project/page.tsx`, `layout.tsx`, `globals.css`), `components/` (`layout/`, `landing/`, `game/`, `market/`, `patterns/`, `creative/`, `ui/`), `lib/` (`types.ts`, `state.ts`, `scoring.ts`, `formatters.ts`, `sensorTower.ts`, `gemini.ts`, `scenario.ts`), `prompts/` (`gemini-video-analysis.md`, `pattern-extraction.md`, `creative-brief-generation.md`, `scenario-prompt-generation.md`), `data/` (`games.ts`, `devMockAds.ts`), plus `.env.local.example`, `README.md`, `package.json`.

- [x] **REQ-env-variables**: `.env.local` déclare `SENSOR_TOWER_API_KEY`, `GEMINI_API_KEY`, `SCENARIO_API_KEY`, `NEXT_PUBLIC_USE_DEV_MOCKS=false` ; `.env.local.example` shippé avec valeurs vides ; `.env*` git-ignoré ; aucun secret commité.

- [ ] **REQ-mvp-definition**: Happy path bout-en-bout opérationnel — sélectionner un jeu → configurer un scan Sensor Tower live → choisir une des Top 3 ads → analyser sa vidéo full avec Gemini → extraire et sélectionner 1 des 3 patterns → éditer un brief → générer un prompt Scenario → produire une vidéo 30s verticale Scenario. Build Vercel-compatible. Démo narrative tient : "The creative is generated from a real market signal — not from a generic prompt."

## v2 Requirements

Reportées au-delà du MVP hackathon. Non intégrées au roadmap actuel.

### Multi-projets

- **MULTI-01**: Bouton `+ New Project` fonctionnel (création / liste / suppression de projets côté UI)
- **MULTI-02**: Persistance multi-projets (localStorage ou backend)

### Catalogue jeux étendu

- **CAT-01**: Catalogue de jeux Voodoo > 2 (chargement depuis source de vérité, recherche, filtrage)

### Génération avancée

- **GEN-01**: Génération de plusieurs variantes vidéo en un seul run (A/B testing créatif)
- **GEN-02**: Frame extraction systématique pour analyse Gemini ultra-fine
- **GEN-03**: Export du brief créatif en PDF / partage par lien

### Authentification & équipe

- **AUTH-01**: Auth utilisateur, rôles (creative strategist vs admin)
- **AUTH-02**: Multi-utilisateurs partageant des projets

## Out of Scope

Exclusions explicites pour prévenir le scope creep.

| Feature | Reason |
|---------|--------|
| Base de données / backend persistant | PRD impose "no database, frontend state only" — state vit dans le frontend uniquement |
| Dark mode et esthétique cyberpunk | PRD impose UI light premium Voodoo-inspired (single accent, no dark mode) |
| Multi-projets fonctionnels (`+ New Project` actif) | MVP single-project hardcodé — bouton visible mais non fonctionnel |
| Catalogue de plus de 2 jeux | MVP limité à `Marble Sort` + `Control Mob` (data/games.ts) |
| Frame extraction par défaut dans Gemini | Cible = full-video analysis ; frame extraction uniquement si techniquement requis |
| Fallback silencieux vers fake data en mode live | PRD interdit explicitement — la crédibilité de la démo repose sur "real market signal" |
| Génération de plusieurs vidéos finales | MVP = exactement une vidéo Scenario 30s verticale |
| JSON brut visible dans l'UI | PRD impose une présentation humaine, jamais de JSON exposé à l'utilisateur |
| Cible de déploiement autre que Vercel | PRD impose Vercel comme deploy target unique |
| Auth utilisateur / RBAC | Hors scope MVP — outil interne mono-utilisateur démo |

## Traceability

Chaque requirement v1 mappé sur une phase unique. Les phases suivent le découpage PRD à 10 phases (granularité standard préservée pour traçabilité PRD↔phases pendant le hackathon).

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-file-architecture | Phase 1 | Complete |
| REQ-env-variables | Phase 1 | Complete |
| REQ-landing-page | Phase 1 | Complete |
| REQ-project-page | Phase 2 | Pending |
| REQ-global-state | Phase 2 | Pending |
| REQ-step1-game-identity | Phase 3 | Pending |
| REQ-step2-market-scan | Phase 4 | Pending |
| REQ-step2-market-scan (Top 3 + selection) | Phase 5 | Pending |
| REQ-step3-pattern-analysis (Gemini) | Phase 6 | Pending |
| REQ-step3-pattern-analysis (scoring + selection) | Phase 7 | Pending |
| REQ-step4-creative-output (brief + prompt) | Phase 8 | Pending |
| REQ-step4-creative-output (Scenario video) | Phase 9 | Pending |
| REQ-error-and-loading-states | Phase 10 | Pending |
| REQ-mvp-definition | Phase 10 | Pending |

> **Note de mapping** : `REQ-step2-market-scan`, `REQ-step3-pattern-analysis` et `REQ-step4-creative-output` sont chacun livrés en **deux phases** (UI + service d'abord, ranking/sélection ensuite ; Gemini d'abord, scoring ensuite ; brief/prompt d'abord, génération vidéo ensuite). Le requirement reste considéré comme "Complete" uniquement quand la deuxième phase associée passe la validation. Cette décomposition préserve le découpage PRD à 10 phases tout en respectant la règle "1 requirement = 1 phase principale" via la sémantique : la phase finale est l'owner du critère d'acceptation complet.

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after initial roadmap creation*
