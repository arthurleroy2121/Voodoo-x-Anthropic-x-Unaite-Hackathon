# Journal de décisions

Format : `YYYY-MM-DD HH:MM — décision — raison — trade-off accepté`.

- 2026-04-25 09:00 — Stack Vite + React + TS + Tailwind v4 — bootstrap rapide, familier à l'équipe — moins adapté si on pivote full 3D.
- 2026-04-25 09:00 — Claude appelé via `/api/claude` serverless — ne jamais exposer la clé côté client — nécessite `vercel dev` pour tester en local.

## Phase 4 — Market Scan Dashboard (étape 2 du workflow)

- 2026-04-26 02:30 — Dashboard market scan **embedé dans l'onglet `market`** de `WorkflowTabs`, pas de route `/dashboard?category=<id>` autonome — préserve l'intégration AppShell + sidebar + multi-projet Zustand existante — trade-off : on dévie du prompt initial qui demandait une route dédiée.
- 2026-04-26 02:30 — **Scope V1 = 4 endpoints Sensor Tower validés uniquement** (`top_apps` publishers + advertisers, `creatives/top`, `ios/ranking`, `ios/apps` metadata) — les fonctions `gamesBreakdown` / `getImpressions` du prompt initial ne sont pas dans la doc validée du token et risquent 403 — trade-off : pas de KPI revenus/downloads absolus en USD ni de delta vs période précédente, on rank par Share-of-Voice natif Sensor Tower.
- 2026-04-26 02:30 — **Géo US-only** au lieu de loop 17 pays — premier rendu en ~3-5s au lieu de 23s+ minimum vu le rate limit 6 req/s — trade-off : pas de vue worldwide, suffisant pour démo hackathon.
- 2026-04-26 02:30 — **Locale `fr-FR`** sur le dashboard via nouveaux helpers `formatRevenueFR` / `formatNumberCompactFR`, sans toucher aux helpers `en-US` existants de `formatters.ts` — trade-off : mix linguistique landing/dashboard accepté.
- 2026-04-26 02:30 — **Navigation au clic sur AdCard via Zustand** (`setSelectedAd` + `setStep('patterns')`) plutôt que `router.push('/pattern?...')` — cohérent avec la mécanique d'onglets existante — trade-off : on dévie du prompt initial.
- 2026-04-26 02:30 — **Alias network "Meta"** = `Facebook` + `Instagram` + `Meta Audience Network` (3 valeurs Sensor Tower) — `creatives/top` rejette `All Networks` donc on parallélise — trade-off : 3 calls par toggle Meta au lieu d'1.
- 2026-04-26 02:30 — **Exception couleurs** : 3 logos network tiers (Meta `#1877F2`, TikTok `#FF0050`, YouTube `#FF0000`) hardcodés dans `AdCard` — règle design system préserve les tokens partout ailleurs ; ces 3 valeurs sont des marques tierces documentées en commentaire et grep-blacklisted lors de la QA finale.
- 2026-04-26 02:30 — **Env var = `SENSOR_TOWER_API_KEY`** (déjà en place), pas de renommage en `_TOKEN` comme suggéré dans le prompt — cohérence avec `.env.local.example` existant.
- 2026-04-26 02:30 — **Cache Sensor Tower** : `next: { revalidate: 300 }` (5 min) sur le proxy `app/api/sensortower/[...endpoint]/route.ts` — limite la pression sur le rate limit 6 req/s — trade-off : changements en temps réel invisibles pendant 5 min, acceptable pour data 30j.
- 2026-04-26 02:30 — **Endpoint dashboard splitté en 2** : `/api/dashboard/market-scan` (KPI + games + publishers, fetch unique au mount) et `/api/dashboard/market-scan/ads` (re-fetch indépendant à chaque toggle de filtre) — évite de re-fetcher tout quand l'utilisateur ne change que les networks/ad_types des ads.
- 2026-04-26 02:30 — **Rendu partiel par section** via `Promise.allSettled` côté server + payload `{ data | error }` par section — chaque section affiche son `<ErrorState>` indépendamment, pas de crash global — trade-off : code orchestrateur un peu plus verbeux.
