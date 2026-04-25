# Voodoo Creative Radar

Outil interne Next.js qui transforme un signal marché live (Sensor Tower) en une publicité 30s testable (Scenario), via extraction de patterns créatifs gagnants par Gemini.

## Stack

- Next.js 16.2 (App Router, Turbopack)
- React 19.2
- TypeScript 5.6+ strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Tailwind CSS 4.1 zero-config (`@theme` dans `app/globals.css`)
- Zustand 5 (state global, hydration-safe)
- pnpm 9

## Setup

```bash
cp .env.local.example .env.local
# remplir les 3 clés API : SENSOR_TOWER_API_KEY, GEMINI_API_KEY, SCENARIO_API_KEY
pnpm install
pnpm dev
```

## Scripts

- `pnpm dev` — démarre le serveur de développement (Turbopack)
- `pnpm build` — build de production
- `pnpm lint` — ESLint flat config
- `pnpm start` — lance le build de production

## Deploy

Vercel (auto-détection Next.js). Variables d'env à configurer dans **Production + Preview + Development**. `NEXT_PUBLIC_USE_DEV_MOCKS` doit être absent en Production.

## Documentation

- `voodoo-creative-radar-prd.md` — PRD source
- `.planning/PROJECT.md` — vision + contraintes
- `.planning/ROADMAP.md` — 10 phases du build
- `CLAUDE.md` — guide pour Claude Code

## Sandbox archivée

L'app Vite préliminaire a été archivée sous le tag git `vite-sandbox-final`. `git checkout vite-sandbox-final` pour y revenir.
