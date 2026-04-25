---
phase: 01-app-shell-landing
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - .env.local.example
  - .gitignore
  - .prettierrc
  - README.md
  - app/globals.css
  - app/layout.tsx
  - app/page.tsx
  - app/project/page.tsx
  - components/landing/Hero.tsx
  - components/landing/LandingCTA.tsx
  - components/landing/WorkflowCards.tsx
  - components/layout/AppShell.tsx
  - components/layout/Sidebar.tsx
  - components/layout/TopBar.tsx
  - components/layout/WorkflowTabs.tsx
  - components/ui/Badge.tsx
  - components/ui/Button.tsx
  - components/ui/Card.tsx
  - components/ui/EmptyState.tsx
  - components/ui/ErrorState.tsx
  - components/ui/Input.tsx
  - components/ui/LoadingState.tsx
  - components/ui/Select.tsx
  - components/ui/Tabs.tsx
  - components/ui/Textarea.tsx
  - data/games.ts
  - lib/copy.ts
  - lib/formatters.ts
  - lib/gemini.ts
  - lib/prompts.ts
  - lib/scenario.ts
  - lib/scoring.ts
  - lib/sensorTower.ts
  - lib/state.ts
  - lib/types.ts
  - lib/utils.ts
  - next.config.ts
  - package.json
  - tsconfig.json
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Le scaffold Phase 1 est globalement bien structuré : boundaries `server-only` correctement posées sur les quatre stubs lib, `skipHydration: true` sur Zustand, Tailwind v4 zero-config utilisé correctement avec `@theme` dans `globals.css`, et aucun secret hardcodé.

Un problème critique a été identifié : `lib/state.ts` importe et utilise directement `localStorage` dans un fichier marqué `'use client'` sans aucune garde, ce qui fait crasher le module côté SSR si Next.js tente de l'évaluer avant l'hydratation. Quatre avertissements couvrent des risques de bugs subtils : `noUncheckedIndexedAccess` ignoré sur un accès de tableau, duplication de données dans `WorkflowTabs`, une signature `Input`/`Select`/`Textarea` avec un `id` prop qui n'associe pas le label de façon fiable, et le `reset()` du store qui ne réinitialise pas les champs optionnels déjà persistés.

---

## Critical Issues

### CR-01: `localStorage` accédé directement dans `createJSONStorage` sans garde SSR

**File:** `lib/state.ts:69`

**Issue:** `createJSONStorage(() => localStorage)` est évalué au moment où le module est chargé. Avec `skipHydration: true` et le `persist` middleware de Zustand, Zustand ne lit pas `localStorage` au démarrage — mais l'arrow function `() => localStorage` est passée comme factory à `createJSONStorage`, qui l'appelle immédiatement à l'initialisation du store pour créer l'objet `storage`. Si Next.js évalue ce module côté serveur (via un import transitif dans un Server Component ou lors du build SSR), `localStorage` est `undefined` et le module lève une `ReferenceError`.

`lib/state.ts` est marqué `'use client'`, ce qui protège dans la plupart des cas — mais ce marquage ne garantit pas l'absence d'évaluation côté serveur en cas d'import accidentel. La pratique correcte est de lazy-getter sur `window` ou d'utiliser un `noop` storage côté serveur.

**Fix:**
```typescript
// Remplacer ligne 69 dans lib/state.ts
storage: createJSONStorage(() => {
  if (typeof window === 'undefined') {
    // Côté serveur — storage no-op, skipHydration empêche toute lecture
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }
  return localStorage;
}),
```

---

## Warnings

### WR-01: `noUncheckedIndexedAccess` — accès non gardé sur `TAB_LABELS[activeTab]`

**File:** `components/layout/WorkflowTabs.tsx:32`

**Issue:** Avec `noUncheckedIndexedAccess: true` activé dans `tsconfig.json`, l'accès `TAB_LABELS[activeTab]` retourne `string | undefined`. Le code utilise `?? 'Étape'` comme fallback, ce qui est correct pour l'affichage — mais TypeScript strict exige que ce pattern soit systématique. Le vrai problème est que `TAB_LABELS` est une duplication exacte des `TABS` définis juste au-dessus (même ids, mêmes labels), introduisant un risque de désynchronisation silencieuse si un onglet est renommé.

**Fix:** Supprimer `TAB_LABELS` et dériver le label depuis `TABS` :
```typescript
// Remplacer TAB_LABELS et la ligne de rendu (32)
const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Étape';

// Dans le JSX :
<p className="text-sm text-[--color-muted]">
  {`${activeLabel} — à venir`}
</p>
```

### WR-02: `Input`, `Select`, `Textarea` — association label/input cassée si `id` absent

**File:** `components/ui/Input.tsx:7`, `components/ui/Select.tsx:7`, `components/ui/Textarea.tsx:7`

**Issue:** Les trois composants wrappent `<input>`/`<select>`/`<textarea>` dans un `<label>`. Cette technique (implicit label) fonctionne sans `id` — le label englobe le contrôle. Cependant, les trois composants acceptent un prop `id` optionnel et le transmettent uniquement au contrôle, pas à `htmlFor` du label. Si un appelant passe `id` en espérant une association explicite (ex. pour `aria-describedby` ou un test `getByLabelText`), l'association n'est pas doublée. Le cas réel de bug : `id` passé mais `label` absent — le `<label>` sans texte est rendu quand même (la balise enveloppante), créant un label vide autour du contrôle.

**Fix:** Soit supprimer le prop `id` des trois composants (l'implicit label suffit), soit ajouter `htmlFor={id}` sur le `<label>` quand `id` est fourni :
```typescript
// Dans Input.tsx, Select.tsx, Textarea.tsx — balise label
<label htmlFor={id} className="flex flex-col gap-1 text-sm">
```

### WR-03: `reset()` dans le store Zustand ne vide pas les champs optionnels persistés

**File:** `lib/state.ts:65`

**Issue:** `reset: () => set((prev) => ({ ...prev, ...initial }))` fusionne `initial` (qui vaut `{ currentStep: 'game' }`) dans le state existant via spread. Les champs optionnels de `AppState` (`gameIdentity`, `selectedAd`, etc.) qui étaient déjà définis restent présents car le spread ne les écrase pas — `initial` ne les contient pas. Résultat : un appel à `reset()` ne remet pas l'état à zéro.

**Fix:**
```typescript
reset: () => set(() => ({ ...initial })),
// ou, pour être explicite avec exactOptionalPropertyTypes :
reset: () =>
  set(() => ({
    currentStep: 'game',
    gameIdentity: undefined,
    marketScanConfig: undefined,
    marketScanResult: undefined,
    selectedAd: undefined,
    geminiAnalysis: undefined,
    topPatterns: undefined,
    selectedPattern: undefined,
    creativeBrief: undefined,
    scenarioPrompt: undefined,
    creativeOutput: undefined,
  })),
```

### WR-04: `lucide-react` version `^1.11.0` — probablement une version inexistante

**File:** `package.json:14`

**Issue:** La version `^1.11.0` de `lucide-react` est anormale — la librairie a sauté de `0.x` à `0.400+` puis `0.500+` sans atteindre `1.x` à la date de rédaction (avril 2026). Soit il s'agit d'une future version major qui n'existait pas au moment du pinning, soit d'une faute de frappe pour `^0.511.0` ou similaire. Une résolution incorrecte du package pourrait faire échouer `pnpm install` silencieusement ou installer une version inattendue.

**Fix:** Vérifier la version réellement installée et corriger le range dans `package.json` :
```bash
pnpm list lucide-react
# Corriger le range en conséquence, ex :
# "lucide-react": "^0.511.0"
```

---

## Info

### IN-01: `lib/scoring.ts` n'a pas le guard `server-only` alors que `lib/gemini.ts` et `lib/scenario.ts` l'ont

**File:** `lib/scoring.ts:1`

**Issue:** `generateTopPatterns` est une fonction pure sans I/O — pas d'appel réseau, pas de secret. L'absence de `server-only` est donc intentionnelle et correcte. Cependant, le commentaire en tête du fichier ne le précise pas, contrairement aux autres stubs. À la Phase 7, si un secret ou une logique serveur est ajouté, l'absence du guard sera invisible.

**Fix:** Ajouter un commentaire explicite :
```typescript
// lib/scoring.ts
// Pure scoring function — no server-only guard needed (no I/O, no secrets).
// If server-side logic is added in Phase 7, add `import 'server-only'`.
```

### IN-02: `app/layout.tsx` — pas de `ZustandProvider` / rehydratation dans le layout Phase 1

**File:** `app/layout.tsx:21`

**Issue:** Le commentaire dans `lib/state.ts:85` indique que la Phase 2 doit appeler `useApp.persist.rehydrate()` depuis un `useEffect` dans `app/layout.tsx` et gérer un flag `hydrated`. Phase 1 ne l'implémente pas, ce qui est attendu — mais le layout ne contient aucun commentaire TODO pour rappeler ce point critique. Sans ce guard, dès la Phase 2 quand les composants liront le store, des mismatches d'hydratation sont probables.

**Fix:** Ajouter un commentaire dans `app/layout.tsx` :
```typescript
// TODO Phase 2: wrap children with ZustandHydrator ('use client' component)
// that calls useApp.persist.rehydrate() in useEffect + gates UI on hydrated flag.
```

### IN-03: `next.config.ts` — `turbopack.root` redondant

**File:** `next.config.ts:4`

**Issue:** `turbopack: { root: __dirname }` configure explicitement la racine Turbopack sur le répertoire courant, qui est la valeur par défaut. Cette option n'ajoute rien et peut prêter à confusion si quelqu'un cherche à comprendre pourquoi elle est présente.

**Fix:** Supprimer l'option si elle n'est pas nécessaire :
```typescript
const nextConfig: NextConfig = {};
export default nextConfig;
```

### IN-04: `components/ui/ErrorState.tsx` marqué `'use client'` sans nécessité

**File:** `components/ui/ErrorState.tsx:1`

**Issue:** `ErrorState` est un composant purement déclaratif : il reçoit `message` (string) et `onRetry` (callback optionnel) comme props. Il n'utilise pas de hooks (`useState`, `useEffect`, etc.) ni d'API navigateur. Le marquage `'use client'` est donc inutile — il force inutilement le bundle client à inclure ce composant même s'il est rendu dans un Server Component.

**Fix:** Supprimer la directive `'use client'` en ligne 1. Le prop `onRetry?: () => void` est un callback passé depuis un parent client — il fonctionnera sans problème une fois le parent déclaré `'use client'`.

---

_Reviewed: 2026-04-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
