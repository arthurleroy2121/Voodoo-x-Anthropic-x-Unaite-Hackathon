# Phase 1: App Shell + Landing — Discussion Log

> **Audit trail only.** Ne pas utiliser comme input pour planning, research ou execution agents.
> Les décisions canoniques sont dans `01-CONTEXT.md` — ce log préserve les alternatives considérées.

**Date:** 2026-04-25
**Phase:** 01-app-shell-landing
**Areas discussed:** Repo placement, Visual identity, Landing composition, /project placeholder scope

---

## Repo placement

### Q1 — Où scaffolder l'app Next.js ?

| Option | Description | Selected |
|--------|-------------|----------|
| Remplacer Vite dans voodoo-hack/ | Scaffold Next.js à la racine de voodoo-hack/, supprimer fichiers Vite | ✓ |
| Sous-dossier voodoo-hack/app/ ou /web/ | Garder Vite intact, Next.js cohabite dans un sous-dossier | |
| Parent /Hackathon/ | App Next.js au niveau parent, créer un nouveau remote GitHub | |

**User's choice:** Remplacer Vite dans voodoo-hack/
**Notes:** Décision motivée par : (1) `.planning/` est déjà dans voodoo-hack/, (2) le remote GitHub partagé avec le binôme est dans voodoo-hack/, (3) PRD impose l'arborescence à la racine, (4) le parent /Hackathon/ n'a pas de remote GitHub. L'app Vite a fini son job (câblage SensorTower MCP capturé dans .planning/research/ et .mcp.json).

### Q2 — Que faire de api/sensortower.ts ?

| Option | Description | Selected |
|--------|-------------|----------|
| Déplacer dans .planning/research/ | Renommer en sensortower-reference.ts comme documentation Phase 4 | ✓ |
| Garder dans voodoo-hack/api/ | Risque collision conceptuelle avec app/api/ Next.js | |
| Supprimer | Le fichier reste dans git history | |

**User's choice:** Déplacer dans .planning/research/
**Notes:** Préservation pour réutilisation Phase 4 (mapping endpoint Sensor Tower, query params, error handling) sans risque de confusion avec les route handlers Next.js.

### Q3 — Préserver l'app Vite avant nuke ?

| Option | Description | Selected |
|--------|-------------|----------|
| Tag git "vite-sandbox-final" | Tag sur le dernier commit Vite avant scaffold Next | ✓ |
| Branche "vite-sandbox" | Branche dédiée plus visible mais pollue les branches GitHub | |
| Nuke sans cérémonie | Le code est dans git history de toute façon | |

**User's choice:** Tag git "vite-sandbox-final"
**Notes:** Permet `git checkout vite-sandbox-final` si retour ponctuel nécessaire, sans encombrer les branches actives.

---

## Visual identity

### Q4 — Quel single accent color ?

| Option | Description | Selected |
|--------|-------------|----------|
| Voodoo magenta/pink | Accent rose/magenta vif, clin d'œil à la palette Voodoo | ✓ |
| Bleu électrique sobre | #2563EB type Vercel/Linear, ultra-safe | |
| Charcoal monochrome | Pas d'accent, charcoal pur | |
| Orange chaud | #F97316, gaming-friendly | |

**User's choice:** Voodoo magenta/pink
**Notes:** User a explicitement demandé d'aligner sur le site Voodoo.io. Tentative de scraping voodoo.io n'a pas remonté de hex code (HTML/markdown sans CSS). Décision de prendre un magenta proxy stable.

### Q4-bis — Hex magenta exact ?

| Option | Description | Selected |
|--------|-------------|----------|
| User passe le hex Voodoo (DevTools) | Inspection manuelle voodoo.io | |
| Magenta vif #E91E63 (Material Pink) | Standard, lisible, premium | ✓ |
| Magenta plus intense #FF3B7B | Voodoo-vibe, pop/saturated | |
| Magenta franc #DB006E (deep pink) | Profond, contraste max | |

**User's choice:** #E91E63 (Material Pink)
**Notes:** Token CSS `--color-accent` exposé via `@theme`, ajustable plus tard si Voodoo brand exact diverge.

### Q5 — Quelle typographie ?

| Option | Description | Selected |
|--------|-------------|----------|
| Geist Sans (Vercel default) | next/font/google, look premium Next 16 | ✓ |
| Inter (universel) | Plus lisible mais moins distinctif | |
| Pairing éditorial (serif + sans) | Effet editorial, 1h de tuning en plus | |

**User's choice:** Geist Sans
**Notes:** Geist Mono optionnel pour adId/code (signal "système/data réelle"). Pas de pairing éditorial (rejeté pour limiter le tuning hackathon).

---

## Landing composition

### Q6 — Layout pour la section workflow ?

| Option | Description | Selected |
|--------|-------------|----------|
| Grille 2x2 typographique | 4 cartes blanches en grille 2x2 | |
| Stepper horizontal numéroté | 01 → 02 → 03 → 04 connectés par ligne fine | ✓ |
| Bento card asymétrique | 1 grande carte + 3 petites | |
| Liste verticale numérotée | Colonne unique éditoriale | |

**User's choice:** Stepper horizontal numéroté
**Notes:** Préview ASCII validée. Effet narratif "voici comment ça marche" lisible d'un coup d'œil.

### Q7 — Contenu additionnel sur la landing ?

| Option | Description | Selected |
|--------|-------------|----------|
| Demo line en footer | Phrase démo PRD en sous-titre | |
| Live badge "Sensor Tower live data" | Anticipation différenciateur | |
| Mini-screenshot/visuel teaser | Image résultat avant clic | |
| Rien de plus (PRD strict only) | Titre + tagline + paragraphe + 4 cartes + CTA uniquement | ✓ |

**User's choice:** Rien de plus (PRD strict)
**Notes:** Le PRD est respecté mot pour mot, rien à défendre. Le plus rapide à livrer pour hackathon.

### Q8 — Position du CTA Get Started ?

| Option | Description | Selected |
|--------|-------------|----------|
| Au-dessus du stepper | Hero + CTA en haut, stepper en dessous | ✓ |
| En bas, après le stepper | Hero → stepper → CTA | |
| Dupliqué (haut + bas) | CTA aux deux endroits | |

**User's choice:** Au-dessus du stepper
**Notes:** Au-dessus de la fold sur desktop. User qui sait clique direct, user curieux scrolle.

### Q9 — Comportement responsive du stepper sur mobile ?

| Option | Description | Selected |
|--------|-------------|----------|
| Stack vertical numéroté | Sous 768px : ligne verticale + numéros + titres + descs | |
| Stepper compact 2x2 | Grille 2x2 sans connecteur | |
| Desktop only first | Phase 1 = desktop only, mobile reporté | ✓ |

**User's choice:** Desktop only first
**Notes:** Risque démo accepté (juges sur écran). Stack vertical numéroté reporté en Phase 10 polish (consigné dans deferred).

---

## /project placeholder scope

### Q10 — Niveau du placeholder /project en Phase 1 ?

| Option | Description | Selected |
|--------|-------------|----------|
| Stub minimal (h1 "Coming next") | Phase 2 builds le shell from scratch | |
| Shell pré-construit (sidebar + 4 onglets vides) | AppShell + Sidebar + Tabs déjà en Phase 1 | ✓ |
| Redirect / → /project = même page | Astucieux mais peut paraitre cassé | |

**User's choice:** Shell pré-construit (sidebar + 4 onglets vides)
**Notes:** Préview ASCII validée. Tirage de scope vers Phase 1 — boundary réajustée à la question suivante.

### Q11 — Frontière Phase 1 / Phase 2 avec le shell pré-construit ?

| Option | Description | Selected |
|--------|-------------|----------|
| P1 = shell visuel + Zustand setup ; P2 = state branché aux tabs | AppShell+Sidebar+WorkflowTabs statiques + lib/state.ts ; P2 branche useApp() + EmptyState + hydration validation | ✓ |
| P1 = shell visuel seul ; P2 = Zustand + state branché | Repousse hydration-safe pattern (cher si fait après P6) | |
| P1 = tout (shell + Zustand + state branché) | Collapse Phase 1+2 en une seule, casse la traçabilité PRD | |

**User's choice:** P1 = shell visuel + Zustand setup ; P2 = state branché aux tabs
**Notes:** Boundary nette : visuel statique vs. état dynamique. lib/state.ts + lib/types.ts complet en P1 (hydration-safe pattern locked tôt comme demandé par la recherche).

---

## Claude's Discretion

- Choix exact lib d'icônes au-delà de `lucide-react` (probablement aucune autre)
- Naming exact classes Tailwind utilities
- Layout précis pixel-perfect du hero (tant que tokens respectés)
- Comportement du flag `hydrated` (Phase 2 le branche)
- `vercel.json` minimal Next.js (laisser auto-générer ou écrire explicite)

## Deferred Ideas (à reprendre en phases ultérieures)

- Mobile responsive du stepper → Phase 10
- Palette étendue (success/warning/error tokens) → Phase 4-7 au besoin
- Motion / animations → Phase 10 si temps
- SEO meta tags + favicon + og image → Phase 10 si temps
- README content détaillé → Phase 10
- Accessibilité WCAG audit complet → Phase 10 si temps
- `vercel.json` explicite avec `maxDuration` → Phase 4+ avec les route handlers

## Note pour le planner Phase 2

Phase 1 a absorbé `AppShell`, `Sidebar`, `WorkflowTabs` (visuels statiques) + `lib/state.ts` (Zustand setup). Phase 2 reste responsable de : brancher `useApp()` aux tabs, ajouter `<EmptyState>` par tab, valider hydration sur refresh, fournir le hook `useApp()` consommé par phases 3-9. Le success criterion #4 de Phase 2 reste valide ; les criterions #1-3 (header, sidebar, tabs navigables) sont déjà livrés en Phase 1 et seront validés en Phase 2 sans rework.
