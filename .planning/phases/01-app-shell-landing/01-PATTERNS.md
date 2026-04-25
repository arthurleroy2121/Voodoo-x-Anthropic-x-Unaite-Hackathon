# Phase 1: App Shell + Landing — Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 22 nouveaux fichiers à créer
**Analogs found:** 8 / 22 (depuis le codebase Vite existant — limités car stack incompatible)

---

## Contexte : Analogies disponibles vs. fichiers à créer from scratch

Le codebase Vite existant (`src/`) est en **stack incompatible** (dark mode + violet accent + Vite runtime). Aucun fichier ne peut être porté directement. Les analogies identifiées ci-dessous fournissent des **patterns de logique réutilisables** (structure des composants, gestion des erreurs, fetch patterns) mais les tokens visuels et la config runtime doivent être réécrits intégralement.

---

## File Classification

| Nouveau fichier | Role | Data Flow | Analog le plus proche | Qualité du match |
|---|---|---|---|---|
| `app/layout.tsx` | layout | request-response | `src/main.tsx` | partial (structure root) |
| `app/page.tsx` | component (server) | static | `src/App.tsx` | partial (structure page) |
| `app/project/page.tsx` | component (server) | static | `src/App.tsx` | partial (shell structure) |
| `app/globals.css` | config/styles | static | `src/index.css` | exact (syntaxe `@import "tailwindcss"`) |
| `components/ui/Button.tsx` | component (ui atom) | request-response | `src/components/ClaudeTest.tsx` lignes 29-35 | role-match (bouton avec states) |
| `components/ui/Card.tsx` | component (ui atom) | static | `src/App.tsx` lignes 14-20 | role-match (conteneur carte) |
| `components/ui/Badge.tsx` | component (ui atom) | static | aucun — à écrire from scratch | none |
| `components/ui/Select.tsx` | component (ui atom) | request-response | `src/components/TrendsPanel.tsx` lignes 37-46 | role-match (select native) |
| `components/ui/Input.tsx` | component (ui atom) | request-response | `src/components/TrendsPanel.tsx` lignes 48-56 | role-match (input native) |
| `components/ui/Textarea.tsx` | component (ui atom) | request-response | `src/components/ClaudeTest.tsx` lignes 23-28 | role-match (textarea native) |
| `components/ui/Tabs.tsx` | component (ui atom) | event-driven | `src/components/TrendsPanel.tsx` | partial (state pattern) |
| `components/ui/LoadingState.tsx` | component (ui atom) | static | `src/components/TrendsPanel.tsx` lignes 71-78 | role-match (Loader2 spinner) |
| `components/ui/ErrorState.tsx` | component (ui atom) | static | `src/components/ClaudeTest.tsx` lignes 43-47 | role-match (affichage erreur) |
| `components/ui/EmptyState.tsx` | component (ui atom) | static | aucun — à écrire from scratch | none |
| `components/landing/HeroSection.tsx` | component (server) | static | `src/App.tsx` lignes 5-12 | partial (header structure) |
| `components/landing/WorkflowStepper.tsx` | component (server) | static | aucun — à écrire from scratch | none |
| `components/layout/AppShell.tsx` | layout | static | `src/App.tsx` lignes 6-9 | partial (main + header) |
| `components/layout/Sidebar.tsx` | component (server) | static | aucun — à écrire from scratch | none |
| `components/layout/WorkflowTabs.tsx` | component (client) | event-driven | `src/components/TrendsPanel.tsx` | partial (useState pattern) |
| `lib/copy.ts` | utility | static | aucun — constantes verbatim PRD | none |
| `lib/types.ts` | types | static | `src/lib/sensortower.ts` (structure types) | role-match (types TypeScript stricts) |
| `lib/state.ts` | store | event-driven | aucun — Zustand n'existait pas dans le Vite | none |
| `data/games.ts` | data | static | aucun — à écrire from scratch | none |
| `.env.local.example` | config | static | aucun — à écrire from scratch | none |

---

## Pattern Assignments

### `app/globals.css` (config/styles, static)

**Analog:** `src/index.css` (lignes 1-6)

**Pattern exact réutilisable — syntaxe Tailwind v4** :
```css
@import "tailwindcss";
```

**Ce que le nouveau fichier ajoute (non présent dans l'analog)** — tokens `@theme` :
```css
@import "tailwindcss";

@theme {
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-charcoal: #1a1a1a;
  --color-muted: #6b7280;
  --color-border: #e5e5e5;
  --color-accent: #E91E63;
}

html, body {
  background-color: var(--color-bg);
  color: var(--color-charcoal);
}
```

**Annotation :** La ligne `@import "tailwindcss"` est directement réutilisable depuis `src/index.css` ligne 1. Les tokens `@theme` remplacent totalement le dark mode Vite (classes `bg-neutral-900`, `text-neutral-100`, etc.).

---

### `app/layout.tsx` (layout, request-response)

**Analog partiel :** `src/main.tsx`

**Pattern structurel root (à adapter pour Next.js App Router)** — depuis `src/main.tsx` :
```typescript
// src/main.tsx — structure root Vite (référence pattern uniquement)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Pattern Next.js cible — à écrire from scratch** :
```typescript
// app/layout.tsx — SERVER COMPONENT, pas de "use client"
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';  // ou next/font/google
import './globals.css';

export const metadata: Metadata = {
  title: 'Voodoo Creative Radar',
  description: 'From Market Signals to Testable Creatives',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}
```

**Note hydration (D-17 / PITFALLS.md) :** Le `useEffect` de rehydration Zustand appartient à Phase 2. Phase 1 expose seulement `lib/state.ts` avec `skipHydration: true`.

---

### `app/page.tsx` (component server, static)

**Analog partiel :** `src/App.tsx` (structure page — dark mode à ignorer totalement)

**Structure générale réutilisable depuis `src/App.tsx`** :
```typescript
// src/App.tsx lignes 6-9 — structure header (à adapter : tokens light)
<main className="min-h-full p-8 max-w-5xl mx-auto">
  <header className="mb-8 flex items-center gap-3">
    <h1 className="text-2xl font-semibold tracking-tight">...</h1>
  </header>
```

**Pattern cible — SERVER COMPONENT statique** :
```typescript
// app/page.tsx
import HeroSection from '@/components/landing/HeroSection';
import WorkflowStepper from '@/components/landing/WorkflowStepper';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[--color-bg]">
      <HeroSection />
      <WorkflowStepper />
    </main>
  );
}
```

---

### `app/project/page.tsx` (component server, static)

**Analog :** `src/App.tsx` (structure shell avec sections)

**Contenu Phase 1 — shell visuel statique uniquement** :
```typescript
// app/project/page.tsx — SERVER COMPONENT Phase 1
import AppShell from '@/components/layout/AppShell';
import Sidebar from '@/components/layout/Sidebar';
import WorkflowTabs from '@/components/layout/WorkflowTabs';

export default function ProjectPage() {
  return (
    <AppShell>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <WorkflowTabs />
      </main>
    </AppShell>
  );
}
```

---

### `components/ui/Button.tsx` (ui atom, request-response)

**Analog :** `src/components/ClaudeTest.tsx` lignes 29-35 + `src/components/TrendsPanel.tsx` lignes 70-78

**Pattern bouton existant — dark mode, à réécrire avec tokens light** :
```typescript
// ClaudeTest.tsx lignes 29-35 — pattern structurel (Loader2 + disabled + className)
<button
  onClick={onSubmit}
  disabled={loading || !prompt.trim()}
  className="inline-flex items-center gap-2 self-start rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
  {loading ? 'Asking Claude…' : 'Ask Claude'}
</button>
```

**Logique à copier :** `inline-flex items-center gap-2`, `disabled:opacity-50 disabled:cursor-not-allowed`, `rounded-md`, pattern `loading ? <Loader2> : <Icon>`.

**Pattern cible avec tokens light** :
```typescript
// components/ui/Button.tsx
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-[--color-accent] text-white hover:opacity-90',
        variant === 'ghost' && 'text-[--color-charcoal] hover:bg-[--color-border]',
        variant === 'outline' && 'border border-[--color-border] text-[--color-charcoal] hover:bg-[--color-border]',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className,
      )}
      {...props}
    />
  );
}
```

---

### `components/ui/Select.tsx` (ui atom, request-response)

**Analog :** `src/components/TrendsPanel.tsx` lignes 37-46

**Pattern select natif existant — à réécrire avec tokens light** :
```typescript
// TrendsPanel.tsx lignes 37-46 — structure label + select (dark mode à ignorer)
<label className="flex flex-col text-xs text-neutral-400">
  OS
  <select
    value={os}
    onChange={(e) => setOs(e.target.value as Os)}
    className="mt-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm"
  >
    <option value="ios">iOS</option>
    <option value="android">Android</option>
  </select>
</label>
```

**Logique à copier :** `flex flex-col`, `rounded-md border`, `px-2 py-1 text-sm`, pattern label + select natif HTML5.

**Pattern cible** :
```typescript
// components/ui/Select.tsx
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[--color-muted]">
      {label}
      <select
        className={cn(
          'rounded-md border border-[--color-border] bg-[--color-surface]',
          'px-3 py-2 text-sm text-[--color-charcoal]',
          'focus:outline-none focus:ring-2 focus:ring-[--color-accent]',
          className,
        )}
        {...props}
      />
    </label>
  );
}
```

---

### `components/ui/Input.tsx` (ui atom, request-response)

**Analog :** `src/components/TrendsPanel.tsx` lignes 48-56

**Pattern input natif existant** :
```typescript
// TrendsPanel.tsx lignes 48-56 — input avec label (dark mode à ignorer)
<label className="flex flex-col text-xs text-neutral-400">
  Country
  <input
    value={country}
    onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
    className="mt-1 w-20 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm font-mono"
  />
</label>
```

**Logique à copier :** `rounded-md border`, `text-sm`, `focus:outline-none focus:ring-*`, pattern label + input.

---

### `components/ui/Textarea.tsx` (ui atom, request-response)

**Analog :** `src/components/ClaudeTest.tsx` lignes 23-28

**Pattern textarea existant** :
```typescript
// ClaudeTest.tsx lignes 23-28 — textarea avec focus ring (dark mode à ignorer)
<textarea
  className="w-full rounded-md border border-neutral-800 bg-neutral-950 p-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
  rows={3}
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
/>
```

**Logique à copier :** `w-full rounded-md border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[accent]`, pattern `rows` prop.

---

### `components/ui/LoadingState.tsx` (ui atom, static)

**Analog :** `src/components/TrendsPanel.tsx` lignes 71-78 + `src/components/ClaudeTest.tsx` lignes 32-33

**Pattern Loader2 existant** :
```typescript
// ClaudeTest.tsx lignes 32-33 — spinner Loader2 avec animate-spin
{loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
{loading ? 'Asking Claude…' : 'Ask Claude'}

// TrendsPanel.tsx ligne 75
{loading ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
```

**Logique à copier :** `Loader2` de `lucide-react` avec `animate-spin`, texte de chargement comme prop.

**Pattern cible** :
```typescript
// components/ui/LoadingState.tsx
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 text-[--color-muted]">
      <Loader2 className="size-5 animate-spin text-[--color-accent]" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
```

---

### `components/ui/ErrorState.tsx` (ui atom, static)

**Analog :** `src/components/ClaudeTest.tsx` lignes 43-47 + `src/components/TrendsPanel.tsx` lignes 80-84

**Pattern erreur existant** :
```typescript
// ClaudeTest.tsx lignes 43-47 — bloc erreur
{error && (
  <pre className="whitespace-pre-wrap rounded-md border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
    {error}
  </pre>
)}

// TrendsPanel.tsx lignes 80-84 — même pattern
{error && (
  <pre className="whitespace-pre-wrap rounded-md border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
    {error}
  </pre>
)}
```

**Logique à copier :** `rounded-md border`, couleurs sémantiques error, `whitespace-pre-wrap`. Ajouter un `retry` button conforme PRD.

**Pattern cible** :
```typescript
// components/ui/ErrorState.tsx
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

---

### `components/ui/Card.tsx` (ui atom, static)

**Analog :** `src/App.tsx` lignes 14-20

**Pattern conteneur carte existant** :
```typescript
// App.tsx lignes 14-20 — section carte (dark mode à ignorer)
<section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 mb-6">
  <h2 className="text-sm font-medium text-neutral-300 mb-1">...</h2>
  <p className="text-xs text-neutral-500 mb-4">...</p>
</section>
```

**Logique à copier :** `rounded-xl border p-6`, structure `h2 + p` pour titre/description.

**Pattern cible avec tokens light** :
```typescript
// components/ui/Card.tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export function Card({ title, description, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[--color-border] bg-[--color-surface] p-6',
        className,
      )}
      {...props}
    >
      {title && <h2 className="text-sm font-semibold text-[--color-charcoal] mb-1">{title}</h2>}
      {description && <p className="text-xs text-[--color-muted] mb-4">{description}</p>}
      {children}
    </div>
  );
}
```

---

### `components/ui/Badge.tsx` (ui atom, static)

**Analog :** aucun — à écrire from scratch. Voir section "No Analog Found".

---

### `components/ui/Tabs.tsx` (ui atom, event-driven)

**Analog :** `src/components/TrendsPanel.tsx` lignes 7-9 (useState pattern)

**Pattern state management tab existant** :
```typescript
// TrendsPanel.tsx lignes 7-9 — useState pour contrôle d'état
const [os, setOs] = useState<Os>('ios');
```

**Logique à copier :** state local avec `useState`, props `value`/`onChange` pour version controlled.

**Pattern cible — "use client" requis (D-18)** :
```typescript
// components/ui/Tabs.tsx
'use client';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex border-b border-[--color-border]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.id
              ? 'border-[--color-accent] text-[--color-accent]'
              : 'border-transparent text-[--color-muted] hover:text-[--color-charcoal]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

---

### `components/landing/HeroSection.tsx` (component server, static)

**Analog :** `src/App.tsx` lignes 5-12

**Pattern header avec icône + titre existant** :
```typescript
// App.tsx lignes 6-11 — header avec icône lucide-react
import { Sparkles } from 'lucide-react';

<header className="mb-8 flex items-center gap-3">
  <Sparkles className="size-6 text-violet-400" />
  <h1 className="text-2xl font-semibold tracking-tight">Voodoo Hack</h1>
  <span className="text-xs text-neutral-500 ml-auto">Voodoo x Unaite x Anthropic...</span>
</header>
```

**Logique à copier :** `flex items-center gap-3`, `font-semibold tracking-tight`, import lucide-react.

**Pattern cible — contenu PRD strict (D-14)** :
```typescript
// components/landing/HeroSection.tsx — SERVER COMPONENT
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="flex flex-col items-center text-center px-8 py-24">
      <h1 className="text-5xl font-semibold tracking-tight text-[--color-charcoal]">
        Voodoo Creative Radar
      </h1>
      <p className="mt-4 text-xl text-[--color-muted]">
        From Market Signals to Testable Creatives
      </p>
      <p className="mt-6 max-w-2xl text-base text-[--color-muted]">
        {/* paragraphe descriptif PRD */}
      </p>
      <Link
        href="/project"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-[--color-accent] px-6 py-3 text-base font-medium text-white hover:opacity-90"
      >
        Get Started
      </Link>
    </section>
  );
}
```

---

### `components/landing/WorkflowStepper.tsx` (component server, static)

**Analog :** aucun dans le codebase Vite. Voir section "No Analog Found".

**Inspiration design (D-12) :** Stripe Checkout stepper / Vercel onboarding. Pattern à écrire from scratch.

---

### `components/layout/AppShell.tsx` (layout, static)

**Analog :** `src/App.tsx` ligne 6 (`<main className="min-h-full ...">`)

**Pattern layout wrapper existant** :
```typescript
// App.tsx ligne 6 — wrapper main
<main className="min-h-full p-8 max-w-5xl mx-auto">
```

**Pattern cible — SERVER COMPONENT (D-18)** :
```typescript
// components/layout/AppShell.tsx
interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[--color-bg]">
      <header className="fixed top-0 left-0 right-0 z-10 h-14 flex items-center px-6 border-b border-[--color-border] bg-[--color-surface]">
        <span className="text-sm font-semibold text-[--color-charcoal]">
          Demo Project — Voodoo Creative Radar
        </span>
      </header>
      <div className="flex flex-1 pt-14">
        {children}
      </div>
    </div>
  );
}
```

---

### `components/layout/Sidebar.tsx` (component server, static)

**Analog :** aucun dans le codebase Vite. Voir section "No Analog Found".

**Contenu requis (D-16) :** `Voodoo Creative Radar` titre, group `Projects`, `• Demo Project` actif, `+ New Project` grisé avec `cursor-not-allowed opacity-40`.

---

### `components/layout/WorkflowTabs.tsx` (component client, event-driven)

**Analog :** `src/components/TrendsPanel.tsx` (logique useState)

**Pattern state tab existant — à adapter avec Zustand Phase 2** :
```typescript
// TrendsPanel.tsx lignes 7-9 — useState pour sélection
const [os, setOs] = useState<Os>('ios');
```

**Pattern cible — "use client" obligatoire (D-18)** :
```typescript
// components/layout/WorkflowTabs.tsx
'use client';

const TABS = [
  { id: 'game', label: '1. Game Identity' },
  { id: 'market', label: '2. Market Scan' },
  { id: 'patterns', label: '3. Pattern Analysis' },
  { id: 'creative', label: '4. Creative Output' },
] as const;

export function WorkflowTabs() {
  // Phase 1 : activeTab local (Phase 2 branchera sur useApp())
  const [activeTab, setActiveTab] = useState<string>('game');

  return (
    <div>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="p-6">
        <p className="text-sm text-[--color-muted]">Étape {/* index */ + 1} — à venir</p>
      </div>
    </div>
  );
}
```

---

### `lib/types.ts` (types, static)

**Analog :** `src/lib/sensortower.ts` (structure types TypeScript strict)

**Pattern types existant réutilisable** — depuis `src/lib/sensortower.ts` lignes 1-10 :
```typescript
// sensortower.ts — pattern type union Result
export type SensorTowerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };
```

**Tous les types PRD à implémenter (source : PRD lignes 108-396)** — copier verbatim :
- `GameIdentity` (lignes 108-114)
- `MarketScanConfig` (lignes 133-140)
- `MarketAd` (lignes 169-186)
- `MarketScanResult` (lignes 188-193)
- `GeminiAdAnalysis` (lignes 217-234)
- `CreativePattern` (lignes 272-285)
- `PatternAnalysisResult` (lignes 287-293)
- `CreativeBrief` (lignes 348-361)
- `ScenarioPrompt` (lignes 362-366)
- `CreativeOutput` (lignes 368-375)
- `AppState` (lignes 384-396)

**Pattern d'import :** pas de runtime — `lib/types.ts` est type-only, aucun `import 'server-only'`.

---

### `lib/state.ts` (store, event-driven)

**Analog :** aucun dans le Vite (Zustand absent). Pattern issu exclusivement de ARCHITECTURE.md.

**Pattern à copier depuis ARCHITECTURE.md lignes 267-315** :
```typescript
// lib/state.ts — pattern Zustand 5 + persist + skipHydration
"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState } from "@/lib/types";

// skipHydration: true — rehydrate via useEffect dans layout (Phase 2)
export const useApp = create<AppState & Actions>()(
  persist(
    (set) => ({ ...initial, /* actions */ }),
    {
      name: "vcr.appstate.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ /* champs persistés uniquement */ }),
      skipHydration: true,
    },
  ),
);
```

**Clé critique (PITFALLS.md) :** `skipHydration: true` est OBLIGATOIRE pour éviter le hydration mismatch Next.js App Router + Zustand persist.

---

### `lib/copy.ts` (utility, static)

**Analog :** aucun — constantes verbatim PRD (D-22).

**Contenu exact à implémenter** :
```typescript
// lib/copy.ts — jamais paraphrasé, verbatim PRD
export const RUNNING_SENSOR_TOWER_SCAN = "Running Sensor Tower scan...";
export const ANALYZING_AD_WITH_GEMINI = "Analyzing selected ad with Gemini...";
export const GENERATING_CREATIVE_BRIEF = "Generating creative brief...";
export const GENERATING_30S_AD = "Generating 30-second ad with Scenario...";
```

---

### `data/games.ts` (data, static)

**Analog :** aucun — données hardcodées PRD (D-24).

**Contenu exact (PRD lignes 86-99, D-24)** :
```typescript
// data/games.ts — 2 jeux conformes PRD
// Note: le PRD utilise "Puzzle Voodoo Game" / "Battle Voodoo Game"
// D-24 mentionne "Marble Sort Puzzle + Control Mob Battle" — utiliser les noms du PRD
// (le planner/executor doit vérifier avec voodoo-creative-radar-prd.md lignes 86-99)
import type { GameIdentity } from '@/lib/types';

export const GAMES: GameIdentity[] = [
  {
    gameId: "puzzle-game",
    gameName: "Puzzle Voodoo Game",
    category: "Puzzle",
    tags: ["casual", "logic", "level-based", "satisfying", "challenge"],
  },
  {
    gameId: "battle-game",
    gameName: "Battle Voodoo Game",
    category: "Battle",
    tags: ["combat", "strategy", "characters", "progression", "mid-core"],
  },
];
```

---

### `.env.local.example` (config, static)

**Analog :** aucun — à créer (D-25).

**Contenu exact** :
```env
# Server-only — never use NEXT_PUBLIC_ prefix for API keys
SENSOR_TOWER_API_KEY=
GEMINI_API_KEY=
SCENARIO_API_KEY=

# Public flag — controls dev mock mode (default: false)
NEXT_PUBLIC_USE_DEV_MOCKS=false
```

---

## Shared Patterns

### Utilitaire `cn()` (clsx + tailwind-merge)

**Source à créer :** `lib/utils.ts` (non listé dans CONTEXT.md mais nécessaire pour tous les ui atoms)
**Apply to :** Tous les composants `components/ui/*.tsx`

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### Tokens CSS design system

**Source :** `app/globals.css` `@theme` block
**Apply to :** Tous les composants — références via `var(--color-*)` ou classes Tailwind custom

| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#fafafa` | `background-color` page |
| `--color-surface` | `#ffffff` | Cards, inputs, sidebar |
| `--color-charcoal` | `#1a1a1a` | Texte principal |
| `--color-muted` | `#6b7280` | Texte secondaire |
| `--color-border` | `#e5e5e5` | Borders |
| `--color-accent` | `#E91E63` | CTA, numéros stepper, focus rings, active tab |

### Pattern "use client" — règle stricte

**Source :** D-18 + ARCHITECTURE.md
**Apply to :** `components/layout/WorkflowTabs.tsx` uniquement parmi les fichiers Phase 1
**Rule :** `AppShell.tsx` et `Sidebar.tsx` restent Server Components (pas de `"use client"`).

### Import paths — alias `@/`

**Source :** `src/lib/sensortower.ts` (pattern import local)
**Apply to :** Tous les fichiers

**Pattern à suivre :**
```typescript
import type { AppState } from '@/lib/types';       // types
import { cn } from '@/lib/utils';                   // utilities
import { Button } from '@/components/ui/Button';    // ui atoms
```

### Pattern TypeScript strict

**Source :** `src/lib/trends.ts` (TypeScript strict existant — seul analog avec typage rigoureux)

**Pattern union result réutilisable depuis `src/lib/sensortower.ts` lignes 3-5** :
```typescript
// Pattern result discriminé (à utiliser dans lib/state.ts actions)
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

**Règles TypeScript (D-19 + global CLAUDE.md) :**
- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- Typer explicitement toutes les fonctions exportées et props de composants
- Pas d'`any` — utiliser `unknown` pour les inputs externes

---

## No Analog Found

Fichiers sans correspondance dans le codebase Vite — le planner doit écrire from scratch en se basant uniquement sur RESEARCH.md et le PRD :

| Fichier | Role | Data Flow | Raison |
|---|---|---|---|
| `components/ui/Badge.tsx` | ui atom | static | Aucun badge dans le Vite sandbox |
| `components/ui/EmptyState.tsx` | ui atom | static | Aucun état vide dans le Vite sandbox |
| `components/landing/WorkflowStepper.tsx` | component server | static | Aucun stepper horizontal — nouveau composant PRD-specific |
| `components/layout/Sidebar.tsx` | layout | static | Aucun sidebar dans le Vite sandbox |
| `lib/copy.ts` | utility | static | Constantes verbatim PRD — aucun analog applicable |
| `lib/state.ts` | store | event-driven | Zustand absent du Vite sandbox |
| `data/games.ts` | data | static | Données hardcodées nouvelles |
| `.env.local.example` | config | static | Nouveau fichier (Vite n'avait pas de .env.local.example) |

**Références pour écrire ces fichiers :**
- `WorkflowStepper.tsx` : D-12 (stepper horizontal `01 — 02 — 03 — 04`) + FEATURES.md (inspiration Stripe/Vercel onboarding)
- `Badge.tsx` : STACK.md §5 (custom Tailwind primitives ~30 lignes)
- `EmptyState.tsx` : D-17 (Phase 2 le consomme — Phase 1 crée l'API, skin minimal)
- `lib/state.ts` : ARCHITECTURE.md Pattern 3 (lignes 267-315) + PITFALLS.md (hydration mismatch)
- `data/games.ts` : PRD lignes 86-99 (source unique de vérité pour les noms de jeux)

---

## Annotations : Vite → Next.js — Ce qui change, ce qui reste

| Aspect | Vite sandbox (src/) | Next.js cible | Action |
|---|---|---|---|
| Directive Tailwind | `@import "tailwindcss"` | `@import "tailwindcss"` | **Copier identique** |
| Config Tailwind | Classes utilitaires inline | `@theme { ... }` dans globals.css | Réécrire |
| Mode couleur | Dark (bg-neutral-950) | Light (--color-bg: #fafafa) | Réécrire totalement |
| Accent | `violet-*` / `emerald-*` | `--color-accent: #E91E63` | Réécrire totalement |
| State management | `useState` local | Zustand 5 + persist | Nouveau |
| Runtime | Vite (browser) | Next.js App Router (server + client) | Nouveau |
| Icônes | `lucide-react` (Sparkles, Loader2, Send, TrendingUp, Loader2) | `lucide-react` (mêmes) | **Réutiliser** |
| Pattern Loader2 | `<Loader2 className="size-4 animate-spin" />` | Identique | **Copier identique** |
| Pattern erreur | `<pre className="...border-red-900/60...">` | `<div className="...border-red-200 bg-red-50...">` | Adapter tokens |
| TypeScript strict | Partiel (pas de `noUncheckedIndexedAccess`) | `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes` | Configurer tsconfig |

---

## Metadata

**Scope de recherche analog :** `src/` entier (13 fichiers) + `.planning/research/` (ARCHITECTURE.md, STACK.md)
**Fichiers scannés :** 13 fichiers source + 2 fichiers de recherche + PRD
**Date d'extraction des patterns :** 2026-04-25
