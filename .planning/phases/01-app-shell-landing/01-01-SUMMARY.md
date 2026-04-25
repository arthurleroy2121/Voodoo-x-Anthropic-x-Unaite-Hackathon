---
phase: 01-app-shell-landing
plan: "01"
subsystem: scaffold
tags: [next.js, scaffold, tailwind, typescript, design-system]
dependency_graph:
  requires: []
  provides:
    - Next.js 16.2 scaffold with App Router
    - TypeScript strict config (noUncheckedIndexedAccess + exactOptionalPropertyTypes)
    - Tailwind v4 zero-config with design system tokens in app/globals.css
    - PRD directory structure (components/, lib/, prompts/, data/, app/project/)
    - .env.local.example with 4 PRD vars
    - git tag vite-sandbox-final preserving Vite history
  affects:
    - All downstream plans (02-04) rely on this scaffold
tech_stack:
  added:
    - next@16.2.4
    - react@19.2.4
    - typescript@5.9.3 (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
    - tailwindcss@4.2.4 (zero-config, @theme in globals.css)
    - zustand@5.0.12
    - clsx@2.1.1
    - tailwind-merge@3.5.0
    - zod@4.3.6
    - lucide-react@1.11.0
    - geist@1.7.0
    - prettier@3.8.3 + prettier-plugin-tailwindcss@0.7.3
  patterns:
    - App Router (no pages/ directory)
    - Turbopack as dev server
    - @import "tailwindcss" + @theme for zero-config Tailwind v4
    - alias @/* → ./* via tsconfig paths
key_files:
  created:
    - package.json (Next.js 16.2.4 + all deps)
    - tsconfig.json (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
    - next.config.ts (turbopack.root set to __dirname)
    - app/globals.css (@theme with 6 PRD color tokens + Geist font tokens)
    - app/layout.tsx (root layout — stub from next-app scaffold)
    - app/page.tsx (root page — stub from next-app scaffold)
    - .env.local.example (4 PRD vars)
    - .prettierrc (prettier-plugin-tailwindcss config)
    - .planning/research/sensortower-reference.ts (moved from api/sensortower.ts)
    - components/{layout,landing,game,market,patterns,creative,ui}/.gitkeep
    - lib/.gitkeep, prompts/.gitkeep, data/.gitkeep
  modified:
    - .gitignore (extended with Next.js + Vercel + .env*.local patterns)
    - README.md (rewritten for Next.js stack)
decisions:
  - "Scaffold in temp dir then copy: pnpm create next-app refused non-empty directory — used /tmp/voodoo-next-scaffold then copied preserving .planning/, CLAUDE.md, .mcp.json, voodoo-creative-radar-prd.md"
  - "turbopack.root = __dirname in next.config.ts: fixed warning about multiple pnpm-lock.yaml detected in workspace"
  - "No tailwind.config.*: Tailwind v4 zero-config via @import tailwindcss + @theme in globals.css exclusively"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-25"
  tasks_completed: 3
  files_created: 30+
  files_modified: 3
---

# Phase 1 Plan 01: Next.js Scaffold — Summary

**One-liner:** Next.js 16.2.4 (App Router + Turbopack) scaffold replacing Vite sandbox, with TypeScript strict, Tailwind v4 zero-config design tokens, and full PRD directory structure.

## What Was Built

Remplacement complet de la sandbox Vite par un projet Next.js 16.2 propre à la racine de `voodoo-hack/`. L'historique Vite est préservé via le tag git `vite-sandbox-final`. Le scaffold pose toutes les fondations requises par les plans suivants (02-04).

## Versions Exactes Installées

| Package | Version |
|---------|---------|
| next | 16.2.4 |
| react + react-dom | 19.2.4 |
| typescript | 5.9.3 |
| tailwindcss | 4.2.4 |
| zustand | 5.0.12 |
| clsx | 2.1.1 |
| tailwind-merge | 3.5.0 |
| zod | 4.3.6 |
| lucide-react | 1.11.0 |
| geist | 1.7.0 |
| prettier | 3.8.3 |
| prettier-plugin-tailwindcss | 0.7.3 |

## Tag `vite-sandbox-final`

Créé sur le commit `fb783d1` (dernier état Vite avant scaffold). Contenu : `src/`, `vite.config.ts`, `index.html`, `package.json` Vite, etc. Rollback possible via `git checkout vite-sandbox-final`.

## Fichiers Vite Supprimés

- `src/` (App.tsx, components/, lib/, hooks/, assets/, types/, main.tsx, index.css, vite-env.d.ts)
- `index.html`
- `vite.config.ts`
- `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.json` (Vite)
- `vercel.json` (Vite-specific)
- `package.json` (Vite — remplacé par Next.js)
- `pnpm-lock.yaml` (Vite — regénéré)
- `api/claude.ts` (serverless Vite-format)
- `api/sensortower.ts` → déplacé en `.planning/research/sensortower-reference.ts`

## Design System Tokens (`@theme` dans `app/globals.css`)

```css
--color-bg: #fafafa        /* page background */
--color-surface: #ffffff   /* cards, inputs */
--color-charcoal: #1a1a1a  /* texte principal */
--color-muted: #6b7280     /* texte secondaire */
--color-border: #e5e5e5    /* bordures */
--color-accent: #E91E63    /* CTA, stepper, focus rings, active tab */
--font-sans: var(--font-geist-sans), ...
--font-mono: var(--font-geist-mono), ...
```

Aucun `tailwind.config.*` — Tailwind v4 zero-config exclusivement via `@import "tailwindcss"` + `@theme`.

## Output `pnpm build`

```
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 1397ms
✓ TypeScript: Finished in 1542ms
✓ Generating static pages (4/4)

Route (app)
┌ ○ /
└ ○ /_not-found
```

Exit code 0, aucune erreur TypeScript, aucun warning.

## Conventions pour les Plans 02-04

1. **Pas de `tailwind.config.*`** — tokens via `var(--color-*)` ou classes Tailwind custom générées par `@theme`
2. **Alias `@/`** pour tous les imports : `@/lib/types`, `@/components/ui/Button`, etc.
3. **TypeScript strict** : `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` — typer toutes les fonctions exportées, pas d'`any`
4. **`"use client"`** uniquement sur les composants avec state/events (ex: WorkflowTabs) — le reste reste Server Component
5. **Zustand `skipHydration: true`** — la rehydration se fait via `useEffect` dans le layout (Phase 2)
6. **`import 'server-only'`** à poser sur `lib/{sensorTower,gemini,scenario,prompts}.ts` dès Plan 02
7. **Pas de dark mode** — aucun `prefers-color-scheme` handler

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm create next-app refuse dossier non-vide**
- **Found during:** Task 2
- **Issue:** `pnpm create next-app@latest . --yes` échoue car `.planning/`, `CLAUDE.md`, `voodoo-creative-radar-prd.md`, `.mcp.json` sont présents dans le dossier cible
- **Fix:** Scaffold dans `/tmp/voodoo-next-scaffold` puis copie manuelle des fichiers générés vers le worktree, en préservant les fichiers à conserver listés en D-02
- **Files modified:** Aucun fichier préservé écrasé
- **Commit:** 2025944

**2. [Rule 1 - Warning] Warning workspace root Turbopack**
- **Found during:** Task 2 (premier pnpm build)
- **Issue:** Next.js détecte deux `pnpm-lock.yaml` (racine Hackathon + worktree) et affiche un warning sur la workspace root
- **Fix:** Ajout de `turbopack: { root: __dirname }` dans `next.config.ts`
- **Files modified:** `next.config.ts`
- **Commit:** 2025944 (inclus avant commit)

## Known Stubs

Les fichiers suivants sont des stubs intentionnels à compléter en Phase 1 (Plans 02-04) :
- `app/layout.tsx` — layout Next.js scaffold (sera retravaillé en Plan 04 avec Geist font + ZustandProvider)
- `app/page.tsx` — page scaffold Next.js par défaut (sera remplacée en Plan 04 par HeroSection + WorkflowStepper)
- `components/*/. gitkeep` — dossiers vides, composants créés en Plan 02-03
- `lib/.gitkeep`, `prompts/.gitkeep`, `data/.gitkeep` — stubs, fichiers créés en Plan 02

Ces stubs sont intentionnels et ne bloquent pas l'objectif de ce plan (scaffold propre qui build).

## Threat Surface Scan

Aucune nouvelle surface de sécurité introduite au-delà du threat model du plan :
- T-01-01 mitigé : `.env*.local` dans `.gitignore`, vérifié `git ls-files | grep .env` = vide
- T-01-02 mitigé : aucun `NEXT_PUBLIC_` sur les clés secrètes dans `.env.local.example`
- T-01-03 mitigé : tag `vite-sandbox-final` créé AVANT toute suppression

## Self-Check: PASSED

Fichiers clés vérifiés :
- [x] `package.json` — next@16.2.4, zustand, zod, clsx, tailwind-merge, lucide-react, geist
- [x] `tsconfig.json` — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
- [x] `app/globals.css` — @import tailwindcss + @theme avec 6 tokens couleurs + fonts
- [x] `.env.local.example` — 4 vars PRD
- [x] `.gitignore` — .next/, .env*.local, node_modules/
- [x] `components/{ui,layout,landing,game,market,patterns,creative}/` — présents
- [x] `lib/`, `prompts/`, `data/`, `app/project/` — présents
- [x] git tag vite-sandbox-final — existe et pointe sur commit Vite valide
- [x] pnpm build — exit 0, aucune erreur TypeScript

Commits vérifiés :
- [x] 82c5fb7 — chore(01-01): tag vite-sandbox-final + cleanup Vite files
- [x] 2025944 — feat(01-01): scaffold Next.js 16.2 + deps + tsconfig strict
- [x] ece7ece — feat(01-01): design system tokens + .env.local.example + README
