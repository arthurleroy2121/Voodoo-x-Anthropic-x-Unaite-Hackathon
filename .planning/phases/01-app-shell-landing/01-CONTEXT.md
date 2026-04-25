# Phase 1: App Shell + Landing — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Cette phase pose les **fondations techniques** (Next.js 16.2 + React 19.2 + TS strict + Tailwind v4 zéro-config + Zustand 5 hydration-safe + ESLint flat + Prettier + pnpm 9) **et** livre :
1. la **landing publique `/`** (titre, tagline, paragraphe descriptif, stepper horizontal 4 étapes, CTA)
2. le **shell visuel `/project`** (AppShell + Sidebar + 4 onglets navigables, contenus statiques)
3. l'**arborescence fichiers PRD complète** (`app/`, `components/{layout,landing,game,market,patterns,creative,ui}/`, `lib/`, `prompts/`, `data/`)
4. les **fondations cross-cutting** : `lib/copy.ts` (4 loading texts verbatim), `lib/types.ts` (tous types PRD), `lib/state.ts` (Zustand persist + skipHydration), atomes UI (`<Button>`, `<Card>`, `<Badge>`, `<Select>`, `<Input>`, `<Textarea>`, `<Tabs>`, `<LoadingState>`, `<ErrorState>`), tokens design system (`@theme` dans `globals.css`), `data/games.ts` (2 jeux), `.env.local.example`.

**Hors scope cette phase** : aucune logique métier (pas d'appel Sensor Tower / Gemini / Scenario), pas de state branché aux tabs (Phase 2), aucun mobile responsive (Phase 10 polish).

</domain>

<decisions>
## Implementation Decisions

### Repo placement & cleanup

- **D-01:** L'app Next.js est scaffoldée **à la racine de `voodoo-hack/`** (et non au parent `/Hackathon/` ni dans un sous-dossier). Décision : `voodoo-hack/` devient l'unique repo Next.js + planning + collaboration.
- **D-02:** Préserver avant scaffold : `voodoo-hack/.planning/`, `voodoo-hack/.mcp.json`, `voodoo-hack/voodoo-creative-radar-prd.md`, `voodoo-hack/.gitignore` (à étendre), `voodoo-hack/.env*`, `voodoo-hack/CLAUDE.md` (à mettre à jour), `voodoo-hack/README.md` (à réécrire pour Next.js).
- **D-03:** `voodoo-hack/api/sensortower.ts` est **déplacé en `voodoo-hack/.planning/research/sensortower-reference.ts`** comme documentation/référence pour Phase 4 (mapping endpoint, query params, error handling). N'est plus exécuté par le runtime.
- **D-04:** L'app Vite existante est préservée en **tag git `vite-sandbox-final`** sur le dernier commit Vite **avant** la suppression. Permet un retour ponctuel via `git checkout vite-sandbox-final` si besoin.
- **D-05:** À supprimer pendant le scaffold : `src/`, `index.html`, `vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.*.tsbuildinfo`, `dist/`, `node_modules/`, `pnpm-lock.yaml` actuel (sera regénéré par Next), le `vercel.json` actuel (Vite-spécifique), le `package.json` actuel (sera remplacé par celui de `pnpm create next-app`).
- **D-06:** `CLAUDE.md` à mettre à jour : la phrase "voodoo-hack reste indépendant ; le Creative Radar est construit comme nouvelle app Next.js à la racine" devient caduque. Remplacement : "voodoo-hack/ est l'app Next.js Creative Radar — la sandbox Vite a été archivée sous le tag git vite-sandbox-final."
- **D-07:** `PROJECT.md` Context section à mettre à jour : "à la racine du repo Hackathon" → "à la racine de `voodoo-hack/` (l'app Vite a été remplacée)".

### Visual identity

- **D-08:** Single accent color = **`#E91E63`** (Material Pink magenta). Token CSS `--color-accent` exposé via `@theme` dans `app/globals.css`. Usage strict : CTA primary, numéros stepper landing, focus rings, link hovers, active tab indicator. Aucun autre élément ne porte du magenta (préserve l'effet "single accent").
- **D-09:** Typographie = **Geist Sans** via `next/font/google` (ou `next/font/local` si offline). Geist Mono optionnel pour `adId`/code. Pas de pairing éditorial (rejeté pour limiter le tuning hackathon).
- **D-10:** Palette tokens de base (locked dans `@theme`) :
  - `--color-bg: #fafafa` (off-white page background)
  - `--color-surface: #ffffff` (cards / surfaces élevées)
  - `--color-charcoal: #1a1a1a` (texte principal)
  - `--color-muted: #6b7280` (texte secondaire ; ≈ neutral-500)
  - `--color-border: #e5e5e5` (≈ neutral-200)
  - `--color-accent: #E91E63`
- **D-11:** Pas de dark mode (PRD strict). Aucun `prefers-color-scheme` handler.

### Landing composition (`/`)

- **D-12:** Layout = **stepper horizontal numéroté** (`01 — 02 — 03 — 04`) connecté par une ligne fine, numéros magenta `#E91E63`, titre + 1 phrase descriptive sous chaque numéro. Ordre PRD : `1. Select a game` / `2. Scan the market` / `3. Analyze winning patterns` / `4. Generate a creative`.
- **D-13:** Position du CTA `Get Started` = **au-dessus du stepper** (au-dessus de la fold sur desktop). Le stepper sert de "voici comment ça marche" pour le user qui scrolle.
- **D-14:** Contenu strictement PRD : titre `Voodoo Creative Radar`, tagline `From Market Signals to Testable Creatives`, paragraphe descriptif, CTA, stepper, **rien d'autre** (pas de demo line en footer, pas de live badge, pas de teaser screenshot).
- **D-15:** Desktop-first : aucun travail responsive mobile en Phase 1. Le stepper peut casser sous 768px — accepté pour cette phase, à corriger en Phase 10.

### `/project` placeholder scope

- **D-16:** `/project` reçoit un **shell pré-construit visuel** dès Phase 1 : AppShell (header `Demo Project — Voodoo Creative Radar`) + Sidebar (`Voodoo Creative Radar`, group `Projects`, `• Demo Project` actif, `+ New Project` grisé) + WorkflowTabs (4 onglets navigables `1. Game Identity` / `2. Market Scan` / `3. Pattern Analysis` / `4. Creative Output`).
- **D-17:** Frontière Phase 1 / Phase 2 :
  - **Phase 1 livre** : composants visuels (`AppShell.tsx`, `Sidebar.tsx`, `WorkflowTabs.tsx`) avec placeholders statiques par tab (texte simple `Étape X — à venir`) **+** `lib/state.ts` (store Zustand 5 setup avec `persist` + `partialize` + `skipHydration` + hook `useApp()`) **+** `lib/types.ts` (tous types PRD : `GameIdentity`, `MarketScanConfig`, `MarketScanResult`, `MarketAd`, `GeminiAdAnalysis`, `CreativePattern`, `PatternAnalysisResult`, `CreativeBrief`, `ScenarioPrompt`, `CreativeOutput`, `AppState`).
  - **Phase 2 livre** : brancher `useApp()` aux tabs, ajouter `<EmptyState>` par tab quand le state est vide, valider l'hydration sur refresh navigateur (rehydrate via `useEffect` au root layout, gate UI sur flag `hydrated`).
- **D-18:** `WorkflowTabs.tsx` est un client component (`"use client"`). `AppShell.tsx` et `Sidebar.tsx` peuvent rester server components.

### Stack lock (Phase 1 = source unique de vérité, plus jamais rediscuté)

- **D-19:** Versions exactes :
  - Next.js `16.2.x` (App Router, Turbopack default)
  - React `19.2.x`
  - TypeScript `5.6+` strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
  - Tailwind CSS `4.1.x` zéro-config — `@import "tailwindcss"` + `@theme` dans `app/globals.css`, **pas de `tailwind.config.js`**
  - Zustand `5.0.x`
  - ESLint flat config + `eslint-config-next` + Prettier + `prettier-plugin-tailwindcss`
  - pnpm `9.x`
  - Helpers : `clsx` + `tailwind-merge` (utilitaire `cn()`), Zod, `lucide-react` pour icônes
- **D-20:** `import 'server-only'` posé sur `lib/{sensorTower,gemini,scenario,prompts}.ts` dès Phase 1, même si les implémentations sont des stubs vides — bloque la fuite de secrets côté client à la compilation.
- **D-21:** Native HTML5 `<video>` uniquement (Phase 9). Pas de `react-player`, `mux-player`, `Vidstack` ajouté en deps.

### Cross-cutting fundamentals (posés en Phase 1, réutilisés partout)

- **D-22:** `lib/copy.ts` expose 4 constantes loading texts verbatim PRD : `RUNNING_SENSOR_TOWER_SCAN = "Running Sensor Tower scan..."`, `ANALYZING_AD_WITH_GEMINI = "Analyzing selected ad with Gemini..."`, `GENERATING_CREATIVE_BRIEF = "Generating creative brief..."`, `GENERATING_30S_AD = "Generating 30-second ad with Scenario..."`. Jamais paraphrasées.
- **D-23:** Atomes UI dans `components/ui/` : `Button`, `Card`, `Badge`, `Select`, `Input`, `Textarea`, `Tabs`, `LoadingState`, `ErrorState`, `EmptyState`. Skel : minimum viable, design tokens depuis `@theme`. Phase 1 ne style que ce que la landing + le shell `/project` consomment ; les autres atomes restent à API stable mais skin minimal — refinés au fur et à mesure.
- **D-24:** `data/games.ts` = 2 jeux hardcodés conformes au PRD (`Marble Sort` Puzzle + `Control Mob` Battle, tags exacts).
- **D-25:** `.env.local.example` shippé avec : `SENSOR_TOWER_API_KEY=`, `GEMINI_API_KEY=`, `SCENARIO_API_KEY=`, `NEXT_PUBLIC_USE_DEV_MOCKS=false`. `.env*` est git-ignoré (vérifier `.gitignore` — étendre si nécessaire).

### Claude's Discretion (laissé au planner / executor)

- Choix exact de la lib d'icônes au-delà de `lucide-react` (probablement aucune autre).
- Naming exact des classes Tailwind utilities (toléré toute variante équivalente).
- Layout précis pixel-perfect du hero (espace vertical, taille du h1, etc.) tant que les tokens sont respectés.
- Comportement du flag `hydrated` (Phase 2 le branche, Phase 1 expose juste l'API).
- `vercel.json` minimal Next.js : laisser `pnpm create next-app` le générer ou en écrire un explicite (Phase 1 peut suffire avec un fichier vide ; les `maxDuration` route-handlers arriveront avec les routes Phase 4+).

### Folded Todos

(Aucun todo n'a été remonté par le matching de phase pour Phase 1.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning ou implementing.**

### PRD & planning sources
- `voodoo-creative-radar-prd.md` — Source de vérité unique. Lire intégralement, en particulier les sections "FILE ARCHITECTURE", "ENV VARIABLES", "UI DESIGN RULES", "PHASES" (Phase 1).
- `.planning/PROJECT.md` — Vision, core value, requirements, contraintes, key decisions.
- `.planning/REQUIREMENTS.md` — REQ-file-architecture, REQ-env-variables, REQ-landing-page (mappés à Phase 1).
- `.planning/ROADMAP.md` §"Phase 1: App Shell + Landing" — goal, success criteria, technical anchors. Lire aussi §"Cross-cutting Constraints (issues de la recherche)".

### Research outputs (essentiels Phase 1)
- `.planning/research/SUMMARY.md` — Distillé. §"Stack — Locked at Phase 1", §"Top 5 Critical Pitfalls" (#5 hydration-safe state), §"Cross-cutting Must-Haves".
- `.planning/research/STACK.md` — Détails versions Next/Tailwind/Zustand/Vercel + sources Context7-verified.
- `.planning/research/ARCHITECTURE.md` — File arborescence, server/client boundary, server-only enforcement.
- `.planning/research/PITFALLS.md` — Hydration mismatch (Zustand persist + Next App Router), Vercel timeouts default 10s, Tailwind v4 zéro-config gotchas.
- `.planning/research/FEATURES.md` — Inspirations design system premium light (Vercel design system, dashboard patterns).

### Intel / context
- `.planning/intel/decisions.md` — 10 décisions issues du PRD (stack, deploy, no-DB, live Sensor Tower, etc.).
- `.planning/intel/constraints.md` — Contraintes techniques.
- `.planning/intel/requirements.md` — Requirements granulaires.

### Référence Phase 4 (préservée pour réutilisation)
- `.planning/research/sensortower-reference.ts` (issu du déplacement de `voodoo-hack/api/sensortower.ts`) — Endpoint mapping Sensor Tower, query params, error handling. Pas consommé en Phase 1, à lire en Phase 4.

### Configuration MCP (déjà active)
- `voodoo-hack/.mcp.json` — Servers Scenario + SensorTower MCP configurés (variables d'env via `.env.local`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (depuis voodoo-hack/ Vite — à NE PAS porter)
- `voodoo-hack/src/components/ClaudeTest.tsx`, `voodoo-hack/src/components/TrendsPanel.tsx`, `voodoo-hack/src/App.tsx` : Vite + Tailwind v4 + dark mode + violet accent. **Stack incompatible** (Vite vs Next, dark vs light, violet vs magenta) — aucune réutilisation. Sera supprimé pendant le scaffold (préservé via tag git `vite-sandbox-final`).
- `voodoo-hack/api/sensortower.ts` : serverless function format Vercel-Vite. Logique utile en Phase 4 mais à réécrire en route handler Next.js. Déplacé en `.planning/research/sensortower-reference.ts`.

### Established Patterns (à conserver)
- Tailwind v4 zéro-config avec `@import "tailwindcss"` : déjà éprouvé dans le sandbox Vite, on continue avec la même syntaxe en Next.js (juste `@theme` au lieu de classes utilitaires inline pour les tokens).
- Configuration MCP Scenario + SensorTower : `voodoo-hack/.mcp.json` déjà configuré pour collaboration GitHub. Reste tel quel.

### Integration Points (cibles du scaffold)
- `voodoo-hack/.gitignore` : à étendre avec `.next/`, `node_modules/`, `.env*.local`, `*.tsbuildinfo`, `dist/`, `.vercel/`. Vérifier que `.env*` est bien ignoré.
- `voodoo-hack/package.json` : sera remplacé par celui généré par `pnpm create next-app@latest`.
- `voodoo-hack/vercel.json` : actuel pointe sur build Vite, sera supprimé. Next.js + Vercel s'auto-détectent ; `vercel.json` explicite seulement si on a besoin de `maxDuration` sur les route handlers (Phase 4+).
- `voodoo-hack/README.md` : à réécrire pour refléter Next.js (commands `pnpm dev` / `pnpm build` / `pnpm lint`, env vars, deploy Vercel).
- `voodoo-hack/CLAUDE.md` : section "Voodoo-hack sandbox" à mettre à jour (la sandbox Vite n'existe plus).

</code_context>

<specifics>
## Specific Ideas

- **Magenta exact** : `#E91E63` (Material Pink). User a précisé "utilise le site Voodoo.io" mais le scraping n'a pas remonté de hex code (HTML/markdown sans CSS). Hex retenu comme proxy stable, à ajuster facilement plus tard via le token CSS `--color-accent` si Voodoo brand exact diverge.
- **Inspiration design** : Vercel design system + Linear (premium light + single accent). Le stepper horizontal s'inspire des stepper Stripe Checkout / Vercel onboarding.
- **Geist** : choix premium standard Next.js 16 / Vercel. Geist Mono réservé aux IDs (`adId`, `jobId`) en monospace pour signal "système / data réelle".
- **`+ New Project` non fonctionnel** : grisé visuellement (charcoal opacity 40%) avec curseur `not-allowed`, aucun handler. Visible mais non utilisable, conformément au PRD.

</specifics>

<deferred>
## Deferred Ideas

- **Mobile responsive du stepper landing** → Phase 10 polish. Stack vertical numéroté (ligne fine à gauche, numéro magenta + titre + desc à droite) sous 768px.
- **Palette étendue (KPI cards, charts, status colors)** → Phase 4-7 selon besoin. Probablement : `--color-success` `#10b981`, `--color-warning` `#f59e0b`, `--color-error` `#ef4444`, ajoutés au `@theme` quand nécessaires (jamais comme accent — single accent reste magenta).
- **Motion / animations** → Phase 10 si temps. Phase 1 reste statique (au plus : transitions `transition-colors` sur hovers).
- **SEO meta tags + favicon + og image** → non-critique pour démo interne. Ajouter en Phase 10 si temps (`app/layout.tsx` `metadata` + `app/icon.png`).
- **README content détaillé** → Phase 10. Phase 1 README minimal suffit (commands + deploy).
- **Accessibilité WCAG audit complet** → non-critique pour démo. Garder les bases en Phase 1 (focus rings visibles, sémantique HTML, contrast ratios charcoal/off-white déjà OK), audit complet Phase 10 si temps.
- **`vercel.json` explicite avec `maxDuration` mirroir** → Phase 4+ quand les route handlers existent. Phase 1 peut s'en passer (Next.js + Vercel auto-detect suffit).

### Boundary shift consigné

- **Note pour `/gsd-plan-phase 2`** : Phase 1 a absorbé le shell visuel (`AppShell`, `Sidebar`, `WorkflowTabs`) initialement prévu en Phase 2, ainsi que la création du store Zustand `lib/state.ts`. Phase 2 reste responsable de : (a) brancher `useApp()` aux tabs, (b) ajouter `<EmptyState>` par tab quand state vide, (c) valider l'hydration sur refresh, (d) fournir le hook `useApp()` consommé par les composants des phases 3-9. Le success criterion #4 de Phase 2 (`AppState` existe + store expose le state aux 4 onglets) reste valide ; le success criterion #1-3 (header, sidebar, tabs navigables) sont déjà délivrés en Phase 1 et seront validés en Phase 2 sans rework.

</deferred>

---

*Phase: 01-app-shell-landing*
*Context gathered: 2026-04-25*
