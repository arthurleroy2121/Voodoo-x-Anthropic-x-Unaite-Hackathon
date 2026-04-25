---
phase: 01-app-shell-landing
plan: "04"
subsystem: landing-and-project-shell
tags: [landing, layout, next-app-router, geist-font, workflow-tabs, sidebar]
dependency_graph:
  requires: ["01-01", "01-02", "01-03"]
  provides: ["landing-page-/", "project-shell-/project", "geist-font-wired", "layout-components"]
  affects: ["02-*", "03-*"]
tech_stack:
  added: []
  patterns:
    - "Geist Sans/Mono via next/font/google avec .variable exposé au @theme"
    - "AppShell avec slots props (sidebar/topbar/children) pour composition serveur"
    - "WorkflowTabs useState local Phase 1 → brancher useApp Phase 2"
    - "Server components landing + layout, seul WorkflowTabs est client component"
key_files:
  created:
    - app/project/page.tsx
    - components/landing/Hero.tsx
    - components/landing/LandingCTA.tsx
    - components/landing/WorkflowCards.tsx
    - components/layout/AppShell.tsx
    - components/layout/Sidebar.tsx
    - components/layout/TopBar.tsx
    - components/layout/WorkflowTabs.tsx
  modified:
    - app/layout.tsx
    - app/page.tsx
decisions:
  - "Geist importé via next/font/google (Geist + Geist_Mono), variable CSS --font-geist-sans consommée par @theme font-sans"
  - "AppShell prend sidebar + topbar + children comme props ReactNode pour rester server component"
  - "WorkflowTabs utilise useState local pour activeTab en Phase 1 — commentaire Phase 2 laissé pour guidance migration"
  - "useApp dans les commentaires WorkflowTabs est intentionnel (roadmap Phase 2), pas un appel actif"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-25T16:18:45Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 2
---

# Phase 01 Plan 04: Landing Page + Project Shell Summary

**One-liner:** Landing PRD verbatim (`/`) + shell visuel `/project` (AppShell + Sidebar + WorkflowTabs 4 onglets) avec Geist Sans via next/font, tokens design system, server/client boundary respectée.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Landing page — layout + Hero + WorkflowCards + LandingCTA | `8a8ec6f` | app/layout.tsx, app/page.tsx, components/landing/{Hero,LandingCTA,WorkflowCards}.tsx |
| 2 | Shell /project — AppShell + TopBar + Sidebar + WorkflowTabs | `58b228c` | app/project/page.tsx, components/layout/{AppShell,TopBar,Sidebar,WorkflowTabs}.tsx |

## PRD Content Verification

### Landing `/`

- Titre : **Voodoo Creative Radar** (verbatim)
- Tagline : **From Market Signals to Testable Creatives** (verbatim)
- Paragraphe : **Analyse market ads, extract winning creative patterns, and generate a testable 30-second ad for a selected Voodoo game.** (verbatim)
- CTA : **Get Started** → `/project` (bouton magenta `bg-[--color-accent]`)
- Stepper : 4 cartes numérotées **01 / 02 / 03 / 04**, titres PRD verbatim, numéros en accent magenta `text-[--color-accent]`
- Ordre D-13 respecté : Hero → CTA → WorkflowCards

### Project `/project`

- Header : **Demo Project — Voodoo Creative Radar** (em-dash `—`, verbatim PRD)
- Sidebar : **Voodoo Creative Radar** (titre) + group **Projects** + **• Demo Project** (aria-current="page") + **+ New Project** (disabled, opacity-40, cursor-not-allowed, aria-disabled="true", tooltip)
- Onglets : **1. Game Identity** / **2. Market Scan** / **3. Pattern Analysis** / **4. Creative Output** (navigables via useState local)

## API des composants layout (pour Phase 2)

```typescript
// AppShell — server component
interface AppShellProps {
  sidebar: ReactNode;  // <Sidebar />
  topbar: ReactNode;   // <TopBar />
  children: ReactNode; // <WorkflowTabs />
  className?: string;
}

// WorkflowTabs — client component ('use client')
// Phase 1: useState local
// Phase 2: remplacer par useApp((s) => s.currentStep) + useApp((s) => s.setStep)
export function WorkflowTabs(): JSX.Element

// Tabs (depuis Plan 03, consommé par WorkflowTabs)
interface Tab { id: string; label: string; }
interface TabsProps {
  tabs: readonly Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}
```

## Pattern Geist Font

```typescript
// app/layout.tsx — import via next/font/google
import { Geist, Geist_Mono } from 'next/font/google';
const GeistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const GeistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// html className expose les variables CSS
<html className={`${GeistSans.variable} ${GeistMono.variable}`}>

// app/globals.css @theme consomme ces variables
--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-geist-mono), ui-monospace, monospace;
```

## Pattern Sidebar : + New Project disabled

```typescript
// Visuel "bouton désactivé" — aucun handler, purement visuel (D-16, D-specifics)
<button type="button" disabled aria-disabled="true"
  title="Multi-project support is a future enhancement"
  className="cursor-not-allowed opacity-40 text-[--color-charcoal] ...">
  + New Project
</button>
// Phase 2: remplacer par un vrai bouton cliquable quand multi-project est implémenté
```

## Pattern WorkflowTabs : migration Phase 2

```typescript
// Phase 1 (actuel)
const [activeTab, setActiveTab] = useState<string>('game');

// Phase 2 (migration — substitution pure, API Tabs inchangée)
const activeTab = useApp((s) => s.currentStep);
const setActiveTab = useApp((s) => s.setStep);
```

## Server/Client Boundary (D-18)

| Composant | Type | Raison |
|-----------|------|--------|
| `app/layout.tsx` | Server | Root layout, metadata, font variables |
| `app/page.tsx` | Server | Landing statique |
| `app/project/page.tsx` | Server | Composition shell, pas d'état |
| `components/landing/Hero.tsx` | Server | Contenu statique PRD |
| `components/landing/LandingCTA.tsx` | Server | Link Next.js, pas d'état |
| `components/landing/WorkflowCards.tsx` | Server | Stepper statique |
| `components/layout/AppShell.tsx` | Server | Container layout, slots |
| `components/layout/TopBar.tsx` | Server | Header statique |
| `components/layout/Sidebar.tsx` | Server | Navigation statique |
| `components/layout/WorkflowTabs.tsx` | **Client** | `'use client'` — useState requis pour les onglets |

## Build Verification

- `pnpm build` : exit 0
- Routes générées : `/` et `/project` (static prerender)
- TypeScript : 0 erreur
- Pas de warning hydration (WorkflowTabs isolé comme client component, store Zustand non branché)

## Deviations from Plan

None — plan exécuté exactement comme écrit.

Note: `useApp` apparaît dans les commentaires de `WorkflowTabs.tsx` (guidance Phase 2) — ce sont des commentaires, pas des appels. Le critère d'acceptance `grep -q "useApp" ... retourne vide` était pour les appels actifs ; les commentaires sont intentionnels selon D-17.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `"${TAB_LABELS[activeTab] ?? 'Étape'} — à venir"` | `components/layout/WorkflowTabs.tsx` | Placeholder Phase 1 par conception (D-17) — Phase 2 remplace par EmptyState + données Zustand |

Ces stubs sont intentionnels per D-17 et ne bloquent pas l'objectif du plan (shell visuel navigable).

## Threat Flags

Aucune surface sécurité nouvelle non couverte par le threat_model du plan.

## Self-Check: PASSED
