# Roadmap: Voodoo Creative Radar

## Overview

Voodoo Creative Radar est un outil interne Next.js qui transforme un signal marché live (Sensor Tower) en une publicité 30s testable (Scenario), via extraction de patterns créatifs gagnants par Gemini. Le roadmap suit le **découpage en 10 phases imposé par le PRD** (`voodoo-creative-radar-prd.md`) — chaque phase est gated sur validation locale avant de passer à la suivante. Le déroulé va de la fondation (shell, landing, page projet, state global) vers les 4 étapes du workflow utilisateur (Game Identity → Market Scan → Pattern Analysis → Creative Output), pour finir sur le polish UI/erreurs/loading et la mise en production Vercel.

Granularité config : `standard` (5–8 phases). Choix retenu : **conserver les 10 phases PRD** pour préserver la traçabilité 1:1 entre les phases du PRD et celles du roadmap pendant le hackathon. Cette décision est documentée dans PROJECT.md (Key Decisions).

## Cross-cutting Constraints (issues de la recherche)

Ces règles s'appliquent à **toutes** les phases. Les chercheurs les ont identifiées comme bloquantes pour la démo. Détail : `.planning/research/SUMMARY.md`.

- **Vercel timeouts** : chaque `app/api/*/route.ts` exporte `export const maxDuration = 300` et `export const runtime = "nodejs"`. Mirroir dans `vercel.json`. Tester sur le **Preview déployé**, pas sur `next dev`.
- **Server-only enforcement** : `import 'server-only'` en tête de `lib/{sensorTower,gemini,scenario,prompts}.ts` — bloque la fuite de secrets côté client à la compilation.
- **No raw JSON** : aucun `JSON.stringify` dans une UI de production. Atomes `<LoadingState>` / `<ErrorState>` posés en Phase 1 et réutilisés partout.
- **Loading texts verbatim** : 4 constantes dans `lib/copy.ts` posées en Phase 1, jamais paraphrasées (`Running Sensor Tower scan...`, `Analyzing selected ad with Gemini...`, `Generating creative brief...`, `Generating 30-second ad with Scenario...`).
- **Hydration-safe state** : Zustand v5 + `persist` + `partialize` (transient `loading`/`error` exclus) + `skipHydration: true` ; rehydrate via `useEffect` au root layout ; UI dépendante de localStorage gated sur un flag `hydrated`. **À poser en Phase 1, sinon refactor douloureux après Phase 6.**
- **Stack lock Phase 1** : Next.js 16.2.x · React 19.2 · TS strict + `noUncheckedIndexedAccess` · Tailwind v4.1 zéro-config (`@import "tailwindcss"` + `@theme` dans `globals.css`, pas de `tailwind.config.js`) · Zustand 5 · ESLint flat + Prettier + `prettier-plugin-tailwindcss` · pnpm 9 · native HTML5 `<video>` (pas de `react-player`/`mux-player`).
- **Mock dev branche** : `NEXT_PUBLIC_USE_DEV_MOCKS=true` est l'**unique** chemin vers `data/devMockAds.ts` ; ribbon jaune `DEV MOCK` persistant quand actif ; assertion build-time que la production n'a jamais le flag set.
- **Validation à la frontière** : Zod schémas pour valider toute réponse Sensor Tower / Gemini / Scenario à l'entrée des route handlers, avant qu'elle ne touche le state.

## Phases

**Phase Numbering:**
- Integer phases (1–10) : travail planifié pour le MVP démo
- Decimal phases (ex. 4.1) : insertions urgentes pendant l'exécution

- [x] **Phase 1: App Shell + Landing** - Scaffold Next.js + Tailwind, layout global, landing page premium, fondations env/secrets/architecture fichiers (completed 2026-04-25)
- [ ] **Phase 2: Project Page Structure** - Page `/project` avec sidebar, 4 onglets, header projet, state global frontend
- [ ] **Phase 3: Game Identity (Step 1)** - Sélecteur 2 jeux hardcodés, auto-fill catégorie + tags éditables
- [ ] **Phase 4: Market Scan UI + Sensor Tower Service** - UI configuration scan + service `lib/sensorTower.ts` live (sans ranking ni sélection)
- [ ] **Phase 5: Top 3 Ranking + Ad Selection** - Tri des ads, KPI cards, top 3 cards, sélection d'une ad, grille complète optionnelle
- [ ] **Phase 6: Gemini Video Analysis (Step 3a)** - Service `lib/gemini.ts` full-video + UI non-JSON de l'analyse de l'ad sélectionnée
- [ ] **Phase 7: Pattern Ranking + Selection (Step 3b)** - `lib/scoring.ts` (formule 35/25/20/20) + UI 3 patterns + pattern mapping table + sélection
- [ ] **Phase 8: Creative Brief + Scenario Prompt (Step 4a)** - Brief éditable + génération du prompt Scenario à partir du brief
- [ ] **Phase 9: Scenario Generation + Final Video (Step 4b)** - `lib/scenario.ts` `generateScenarioAd` + rendu vidéo 30s verticale + rationale
- [ ] **Phase 10: Polish + Error/Loading States + Vercel Readiness** - Loading texts exacts, error states, polish UI, build Vercel-ready, validation MVP end-to-end

## Phase Details

### Phase 1: App Shell + Landing
**Goal**: Pose les fondations techniques (Next.js + TS + Tailwind) et livre une landing page publique qui présente le produit. Pas encore de fonctionnalité de workflow, mais le projet build, déploie sur Vercel, et raconte la promesse produit.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-file-architecture, REQ-env-variables, REQ-landing-page
**Success Criteria** (what must be TRUE):
  1. `pnpm dev` démarre l'app Next.js (App Router + TypeScript + Tailwind) sans erreur
  2. La page `/` affiche le titre `Voodoo Creative Radar`, la tagline `From Market Signals to Testable Creatives`, le paragraphe descriptif PRD et les 4 cartes de workflow numérotées
  3. Le bouton `Get Started` route bien vers `/project` (page placeholder pour cette phase)
  4. L'arborescence `app/`, `components/`, `lib/`, `prompts/`, `data/` existe avec les fichiers minimaux du PRD ; `.env.local.example` shippé avec les 4 variables vides ; `.env*` est git-ignoré
  5. UI premium light : fond blanc/off-white, typographie charcoal, un seul accent, cards arrondies, no dark mode, no JSON brut visible
**Technical Anchors** (cf. research/SUMMARY.md) :
  - Scaffold via `pnpm create next-app@latest --yes` (Next.js 16.2.x + React 19.2 + TS strict + Tailwind v4.1 + ESLint flat + Turbopack), puis `pnpm add zustand clsx tailwind-merge zod`
  - `tsconfig.json` : `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
  - `app/globals.css` : `@import "tailwindcss"` + `@theme` (tokens accent unique, charcoal `#1a1a1a`, off-white `#fafafa`)
  - `lib/copy.ts` : 4 constantes loading texts verbatim PRD (utilisées dès Phase 4)
  - `lib/types.ts` : tous les types PRD (`GameIdentity`, `MarketAd`, …, `AppState`)
  - `lib/state.ts` : Zustand v5 + `persist({ storage: createJSONStorage(() => localStorage), partialize, skipHydration: true })` ; rehydrate via `useEffect` au root layout, gate UI sur flag `hydrated`
  - `components/ui/*` : `<Button>`, `<Card>`, `<Badge>`, `<Select>`, `<Input>`, `<Textarea>`, `<Tabs>`, `<LoadingState>`, `<ErrorState>` — atomes réutilisés par toutes les phases
  - `data/games.ts` : 2 jeux PRD verbatim
  - `.env.local.example` avec `SENSOR_TOWER_API_KEY=`, `GEMINI_API_KEY=`, `SCENARIO_API_KEY=`, `NEXT_PUBLIC_USE_DEV_MOCKS=false`
**Plans**: TBD
**UI hint**: yes

### Phase 2: Project Page Structure
**Goal**: Le squelette de l'espace de travail — page `/project` avec sidebar, header, 4 onglets navigables et state global frontend prêt à accueillir les 4 étapes du workflow. Aucune fonctionnalité métier dans les onglets, mais la coquille est complète.
**Depends on**: Phase 1
**Requirements**: REQ-project-page, REQ-global-state
**Success Criteria** (what must be TRUE):
  1. La page `/project` affiche le header `Demo Project — Voodoo Creative Radar`
  2. La sidebar gauche affiche `Voodoo Creative Radar`, le groupe `Projects`, `• Demo Project` actif, et `+ New Project` (visible mais non fonctionnel)
  3. 4 onglets dans l'ordre — `1. Game Identity`, `2. Market Scan`, `3. Pattern Analysis`, `4. Creative Output` — sont navigables manuellement
  4. Le type `AppState` (avec `currentStep`, `gameIdentity`, `marketScanConfig`, `marketScanResult`, `selectedAd`, `geminiAnalysis`, `topPatterns`, `selectedPattern`, `creativeBrief`, `scenarioPrompt`, `creativeOutput`) existe dans `lib/types.ts` et un store frontend dans `lib/state.ts` expose ce state aux 4 onglets
  5. Aucun JSON brut visible — chaque onglet affiche un placeholder UI propre quand son state est vide
**Technical Anchors** :
  - State Zustand consommé via hook `useApp()` ; aucune prop drilling entre tabs
  - Validation manuelle : refresh navigateur sur chaque tab → state restauré depuis localStorage sans warning hydration
  - `WorkflowTabs.tsx` client component ; `AppShell.tsx` + `Sidebar.tsx` peuvent rester server components
  - Onglet placeholder : `<EmptyState>` consistant (pas de `JSON.stringify(state)` même en dev)
**Plans**: TBD
**UI hint**: yes

### Phase 3: Game Identity (Step 1)
**Goal**: L'onglet 1 fonctionne de bout en bout — l'utilisateur choisit un jeu Voodoo, voit la catégorie et les tags se pré-remplir, peut éditer, sauvegarder, et continuer vers l'étape suivante. C'est la première interaction métier.
**Depends on**: Phase 2
**Requirements**: REQ-step1-game-identity
**Success Criteria** (what must be TRUE):
  1. Le sélecteur liste exactement 2 jeux : `Marble Sort` (Puzzle) et `Control Mob` (Battle), avec les tags exacts du PRD (`data/games.ts`)
  2. Sélectionner un jeu auto-remplit Catégorie et Tags ; les deux champs restent éditables manuellement
  3. Le bouton `Save Game Identity` persiste un objet conforme au type `GameIdentity` dans le state global
  4. Le bouton `Continue to Market Scan` est désactivé tant qu'aucun jeu n'est sauvegardé, puis active et bascule vers l'onglet 2
  5. Aucun JSON brut visible ; UI cohérente avec le design system de la phase 1
**Plans**: TBD
**UI hint**: yes

### Phase 4: Market Scan UI + Sensor Tower Service
**Goal**: Le service Sensor Tower est branché en live (clé API `.env.local`) et l'UI de configuration du scan est posée. À la fin de la phase, un appel réel à Sensor Tower retourne un `MarketScanResult` brut — sans encore le tri Top 3 ni la sélection (livrés en phase 5).
**Depends on**: Phase 3
**Requirements**: REQ-step2-market-scan (livraison partielle — UI + service)
**Success Criteria** (what must be TRUE):
  1. L'onglet 2 affiche les 3 dropdowns config — Number of ads (`10 / 20 / 30 / 50`), Time range (`Last 30 days / Last 60 days / Last 90 days`), Market (`US / France / UK / Global`) — et un bouton `Run Sensor Tower scan`
  2. `lib/sensorTower.ts` expose `fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult>` ; un appel live retourne au moins 1 `MarketAd` réel avec les champs disponibles (id, gameName, adId, creativeUrl/videoUrl/imageUrl, network, format, firstSeen, lastSeen, market)
  3. Pendant l'appel, le loading text exact `Running Sensor Tower scan...` est affiché
  4. Aucun fallback silencieux : sans `NEXT_PUBLIC_USE_DEV_MOCKS=true` et sans clé API valide, l'UI affiche une erreur explicite (les mocks `data/devMockAds.ts` ne sont activés que par ce flag et ne sont jamais labélisés comme "real Sensor Tower data")
  5. Le `MarketScanResult` est stocké dans le state global et reste disponible pour la phase 5
**Technical Anchors** :
  - Route handler `app/api/sensor-tower/scan/route.ts` avec `export const runtime = "nodejs"`, `export const maxDuration = 300`, `export const dynamic = "force-dynamic"`
  - Auth Sensor Tower : query param `auth_token=...` (PAS Bearer header) ; `ad_types` requis sinon 422
  - Validation Zod du body input + de la réponse Sensor Tower au boundary
  - Taxonomie d'erreurs en union discriminée : `{ kind: "auth" | "bad_params" | "rate_limit" | "server" | "network", message, retryAfterSec? }` ; parser `Retry-After` sur 429
  - `lib/sensorTower.ts` annoté `import 'server-only'` ; le client appelle `fetch('/api/sensor-tower/scan', ...)`, jamais l'API externe directement
  - Mode mock : `if (process.env.NEXT_PUBLIC_USE_DEV_MOCKS === 'true')` → `data/devMockAds.ts` + ribbon jaune `DEV MOCK` persistant en haut de l'app
  - Spike pré-implémentation : confirmer endpoint exact + champs disponibles depuis `voodoo-hack/api/sensortower.ts`
**Plans**: TBD
**UI hint**: yes

### Phase 5: Top 3 Ranking + Ad Selection
**Goal**: La phase qui transforme un dump d'ads en un Top 3 actionnable. KPI cards, ranking avec la priorité de signaux du PRD, cards top 3 cliquables, et sélection persistée. C'est la fin du Step 2 utilisateur.
**Depends on**: Phase 4
**Requirements**: REQ-step2-market-scan (livraison finale — ranking + sélection)
**Success Criteria** (what must be TRUE):
  1. Les KPI cards affichent : Ads retrieved, Competitor games found, Networks detected, Market, Time range — calculés depuis `MarketScanResult`
  2. Le tri Top 3 applique l'ordre de priorité PRD : share of voice → impressions → spend estimate → recency → internal metadata score
  3. Les 3 ad cards top affichent rank, thumbnail, gameName, adId, network, format, performanceSignal (+ label), first/last seen, rankingReason et un bouton `Select this ad`
  4. Une grille optionnelle des autres ads est visible sous le Top 3
  5. Cliquer `Select this ad` persiste l'ad dans `selectedAd` du state global et active visuellement l'onglet 3
**Technical Anchors** :
  - Ranking déterministe : tri stable, fallback en cascade quand un signal manque (le Top 3 doit être reproductible pour la démo)
  - `rankingReason` calculé côté client (transparent pour l'utilisateur) — ex. "Highest share of voice (12.4%)"
  - Tester avec ≥ 30 ads pour valider la logique de cascade
**Plans**: TBD
**UI hint**: yes

### Phase 6: Gemini Video Analysis (Step 3a)
**Goal**: La vidéo de l'ad sélectionnée passe dans Gemini en analyse full-video, et l'UI rend le résultat sous une forme humaine (pas de JSON). C'est la moitié du Step 3 — sans encore l'extraction des patterns.
**Depends on**: Phase 5
**Requirements**: REQ-step3-pattern-analysis (livraison partielle — analyse Gemini)
**Success Criteria** (what must be TRUE):
  1. `lib/gemini.ts` expose `analyzeSelectedAdWithGemini(ad: MarketAd, game: GameIdentity): Promise<GeminiAdAnalysis>` ; un appel réel sur l'ad sélectionnée retourne un `GeminiAdAnalysis` complet (videoSummary, openingHook, hook0To3s, sceneFlow[], visualPatterns[], gameplayMechanics[], emotionalTriggers[], textOverlays[], cta, visualStyle, pacing, whyItWorks, applicabilityToGame, confidence)
  2. L'analyse est full-video par défaut (frame extraction uniquement si techniquement requis, et signalé dans les logs)
  3. L'onglet 3 affiche dans cet ordre, sans JSON brut : Selected Ad Preview, Video Summary, Opening Hook, 0–3s Hook, Scene Flow, Visual Patterns, Gameplay Mechanics, Emotional Triggers, Text Overlays, CTA, Visual Style, Pacing, Why It Works, Applicability to Selected Game, Confidence
  4. Pendant l'appel, le loading text exact `Analyzing selected ad with Gemini...` est affiché
  5. En cas d'erreur Gemini, l'ad sélectionnée est préservée dans le state, un message d'erreur clair s'affiche et un bouton `Retry` relance l'appel
**Technical Anchors** (phase à plus haut risque technique) :
  - Route handler `app/api/gemini/analyze/route.ts` : `runtime = "nodejs"`, **`maxDuration = 300`** (Vercel Fluid Compute requis), `dynamic = "force-dynamic"`
  - **Files API obligatoire** : les URLs Sensor Tower CDN sont signées/expirent/referrer-gated → ne JAMAIS passer à `fileData.fileUri`
  - Flux : server-fetch des bytes vidéo → `client.files.upload({ file, config: { mimeType: 'video/mp4' } })` → polling `client.files.get({ name })` jusqu'à `state === "ACTIVE"` → `createPartFromUri(uri, mimeType)` → `generateContent`
  - Modèle : `gemini-2.5-pro` (qualité analyse vidéo) ; fallback `gemini-2.5-flash` si latence
  - Output structuré : `responseMimeType: "application/json"` + `responseJsonSchema` correspondant à `GeminiAdAnalysis` ; validation Zod en sortie ; check `finishReason !== "SAFETY"`
  - Safety thresholds : `BLOCK_ONLY_HIGH` sur `HARM_CATEGORY_VIOLENCE` + `HARM_CATEGORY_DANGEROUS_CONTENT` (Control Mob = combat)
  - Prompt source : `prompts/gemini-video-analysis.md` (markdown chargé via `lib/prompts.ts` annoté `import 'server-only'`)
  - Spike pré-implémentation : valider sur Preview Vercel qu'une ad ~30-60s tient dans la fenêtre 300s
**Plans**: TBD
**UI hint**: yes

### Phase 7: Pattern Ranking + Selection (Step 3b)
**Goal**: Extraire 3 patterns créatifs scorés depuis l'analyse Gemini + ad + jeu, les afficher avec sub-scores, mapping table et sélection. Fin du Step 3 utilisateur.
**Depends on**: Phase 6
**Requirements**: REQ-step3-pattern-analysis (livraison finale — scoring + sélection)
**Success Criteria** (what must be TRUE):
  1. `lib/scoring.ts` expose `generateTopPatterns(analysis, ad, game): CreativePattern[]` retournant **exactement 3** patterns
  2. Chaque pattern est scoré selon la formule `Pattern Score = 35% Frequency + 25% Game Fit + 20% Freshness + 20% Creative Actionability`, et expose les 4 sub-scores en plus du score total
  3. Chaque card pattern affiche rank, name, score total, les 4 sub-scores, explanation, source evidence, adaptation au jeu sélectionné, confidence et un bouton `Select this pattern`
  4. Une "Pattern mapping table" est rendue avec colonnes Market Pattern · Evidence · Adaptation to Target Game · Confidence
  5. Cliquer `Select this pattern` persiste le pattern dans `selectedPattern` du state global et débloque l'onglet 4
**Technical Anchors** :
  - `lib/scoring.ts` est **pur** (pas d'I/O) → testable en isolation sans Gemini
  - Pattern Mapping Table = livrable de premier plan (la screenshot que les juges retiendront), pas un sous-composant
  - `prompts/pattern-extraction.md` réutilisé si Gemini est sollicité pour l'extraction (sinon scoring déterministe à partir de `GeminiAdAnalysis`)
**Plans**: TBD
**UI hint**: yes

### Phase 8: Creative Brief + Scenario Prompt (Step 4a)
**Goal**: Construire et éditer le brief créatif, puis générer le prompt Scenario à partir du brief, du jeu et du pattern sélectionné. La vidéo n'est pas encore générée — c'est la moitié du Step 4.
**Depends on**: Phase 7
**Requirements**: REQ-step4-creative-output (livraison partielle — brief + prompt)
**Success Criteria** (what must be TRUE):
  1. L'onglet 4 affiche les 5 sections en ordre : Selected Pattern · Creative Brief (éditable) · Scenario Prompt · Scenario Output (placeholder vide à ce stade) · Rationale
  2. Le brief contient les 11 champs requis : Creative concept, Selected pattern, Opening hook, 30-second scene flow (timeline 0–3s / 3–7s / 7–15s / 15–23s / 23–30s), Visual direction, Gameplay reference, Text overlays, CTA, Rationale, Source ad evidence, Adaptation to selected game
  3. Un bouton `Generate Creative Brief` produit un brief initial à partir de pattern + jeu + analyse Gemini, avec le loading text exact `Generating creative brief...`
  4. Le brief est éditable (champs texte) avant génération du prompt ; un bouton `Generate Scenario Prompt` produit un `ScenarioPrompt` (`durationSec: 30`, `format: "vertical_mobile_ad"`) qui inclut : durée 30s, format vertical mobile, catégorie + tags du jeu, pattern sélectionné, scene-by-scene, visual style, text overlays, CTA, rationale
  5. `lib/scenario.ts` expose `buildScenarioPrompt(brief, game, pattern): ScenarioPrompt` et le résultat est stocké dans `scenarioPrompt` du state global
**Technical Anchors** :
  - Brief inline-éditable champ par champ ; chaque mutation persiste dans Zustand (et donc localStorage)
  - `ScenarioPrompt` est **dérivé** et read-only côté UI — la chaîne `brief → prompt` doit rester visible (trust chain)
  - `prompts/creative-brief-generation.md` + `prompts/scenario-prompt-generation.md` ; chargement via `lib/prompts.ts` (`import 'server-only'`)
  - Si la génération du brief utilise Gemini, route handler `/api/gemini/brief` séparée avec `maxDuration = 300`
**Plans**: TBD
**UI hint**: yes

### Phase 9: Scenario Generation + Final Video (Step 4b)
**Goal**: Appeler Scenario en live pour générer **la** vidéo 30s verticale finale et la rendre dans l'UI avec le rationale. C'est la livraison de la promesse démo : "real market signal → testable creative".
**Depends on**: Phase 8
**Requirements**: REQ-step4-creative-output (livraison finale — génération vidéo Scenario)
**Success Criteria** (what must be TRUE):
  1. `lib/scenario.ts` expose `generateScenarioAd(prompt: ScenarioPrompt): Promise<CreativeOutput>` ; un appel live produit un `CreativeOutput` avec un `scenarioVideoUrl` jouable
  2. L'output est **une seule** vidéo de 30 secondes au format `vertical_mobile_ad` (pas de variantes multiples)
  3. La section Scenario Output affiche le lecteur vidéo + statut (`idle | generating | complete | error`) ; pendant l'appel, le loading text exact `Generating 30-second ad with Scenario...` est affiché
  4. La section Rationale rend le pourquoi du choix créatif (lien explicite pattern → brief → vidéo)
  5. Un bouton `Regenerate` relance la génération sans perdre le brief ni le prompt ; en cas d'erreur, brief et prompt restent visibles, un message clair s'affiche, le bouton retry est disponible
**Technical Anchors** (deuxième phase à plus haut risque technique) :
  - **Architecture two-route obligatoire** (les jobs Scenario dépassent même 800s — single-route polling = mort certaine au timeout)
    - `POST /api/scenario/start` : valide le prompt → soumet le job → renvoie `{ jobId }` (rapide, < 5s)
    - `GET /api/scenario/status?jobId=...` : poll Scenario, renvoie `{ status, videoUrl?, error? }`
  - Polling client : intervalle 3-5s, cap 8 minutes, `AbortController` au unmount du composant, `jobId` persisté en localStorage pour récupération après refresh
  - Lifecycle : gérer les 5 statuts Scenario (`queued | processing | success | failed | canceled`) avec UI distincte chacun
  - Auth Scenario : Basic Base64 `key:secret` (pas Bearer)
  - Modèle : confirmer avant implémentation que le `modelId` choisi supporte `aspectRatio: "9:16"` ET `duration: 30` natifs
  - Vidéo rendue dans une frame mobile via `<video controls playsInline>` natif (pas de lib externe)
  - `/api/scenario/generate` (route unique) **interdite** — refactor garanti à la première erreur de timeout
  - Spike pré-implémentation : tester un job complet sur Preview Vercel avant d'écrire l'UI
**Plans**: TBD
**UI hint**: yes

### Phase 10: Polish + Error/Loading States + Vercel Readiness
**Goal**: Boucler le MVP — chaque chemin d'erreur/loading est conforme au PRD au mot près, l'UI est polie en mode démo, le build passe sur Vercel, et le happy-path bout-en-bout est validé manuellement.
**Depends on**: Phase 9
**Requirements**: REQ-error-and-loading-states, REQ-mvp-definition
**Success Criteria** (what must be TRUE):
  1. Les 4 loading texts apparaissent verbatim aux moments prévus : `Running Sensor Tower scan...`, `Analyzing selected ad with Gemini...`, `Generating creative brief...`, `Generating 30-second ad with Scenario...`
  2. Les 3 chemins d'erreur respectent les règles PRD : Sensor Tower (clear error, reste sur Market Scan tab, retry, jamais de fake silencieux), Gemini (erreur dans Pattern Analysis, retry, ad préservée), Scenario (brief + prompt restent visibles, erreur affichée, retry)
  3. UI revue de bout en bout : aucun JSON brut visible, design system cohérent (white/off-white, charcoal, single accent, rounded cards, subtle shadows, premium motion minimal)
  4. `pnpm build` passe sans erreur ; le projet déploie sur Vercel ; les variables d'env sont documentées dans `README.md`
  5. Happy path démo validé manuellement : Game → Scan → Top 3 → Sélection → Gemini → Pattern → Brief → Prompt → Vidéo 30s — narrative "The creative is generated from a real market signal — not from a generic prompt." tient
**Technical Anchors** (verification phase) :
  - `vercel.json` : mirroir des `maxDuration` par route (300s sur les 3+ route handlers)
  - `error.tsx` + `loading.tsx` posés au bon scope dans `app/`
  - Audit grep : aucun `JSON.stringify` dans le rendu UI (`grep -r "JSON.stringify" app/ components/` doit ne rien renvoyer côté UI)
  - Audit grep : aucun secret leakage (`grep -rE "(SENSOR_TOWER|GEMINI|SCENARIO)_API_KEY" app/ components/` doit ne renvoyer que des fichiers `lib/*.ts` côté serveur)
  - Diff loading texts vs PRD : les 4 chaînes apparaissent à l'identique (`grep -E "Running Sensor Tower|Analyzing selected ad|Generating creative brief|Generating 30-second" -r`)
  - Vercel env vars set dans **Production + Preview + Development** (les 3 scopes)
  - `NEXT_PUBLIC_USE_DEV_MOCKS` **absent** en Production (assertion build-time)
  - Demo rehearsal complète sur l'URL Preview déployée, pas en local
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Les phases s'exécutent dans l'ordre numérique : 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Chaque phase est gated sur validation locale avant la suivante (protocole PRD : discuss → list → implement → verify → fix → next).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell + Landing | 4/4 | Complete    | 2026-04-25 |
| 2. Project Page Structure | 0/TBD | Not started | - |
| 3. Game Identity (Step 1) | 0/TBD | Not started | - |
| 4. Market Scan UI + Sensor Tower Service | 0/TBD | Not started | - |
| 5. Top 3 Ranking + Ad Selection | 0/TBD | Not started | - |
| 6. Gemini Video Analysis (Step 3a) | 0/TBD | Not started | - |
| 7. Pattern Ranking + Selection (Step 3b) | 0/TBD | Not started | - |
| 8. Creative Brief + Scenario Prompt (Step 4a) | 0/TBD | Not started | - |
| 9. Scenario Generation + Final Video (Step 4b) | 0/TBD | Not started | - |
| 10. Polish + Error/Loading States + Vercel Readiness | 0/TBD | Not started | - |

---
*Roadmap initialized: 2026-04-25 — derived from voodoo-creative-radar-prd.md (10-phase build sequence, granularity standard, traceability PRD↔phases preserved).*
