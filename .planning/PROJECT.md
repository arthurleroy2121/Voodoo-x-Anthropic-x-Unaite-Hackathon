# Voodoo Creative Radar

## What This Is

Voodoo Creative Radar transforme des signaux marché live (Sensor Tower) en une publicité vidéo testable de 30 secondes générée via Scenario, après extraction de patterns créatifs gagnants par Gemini. C'est un outil interne pensé pour un Voodoo creative strategist / UA manager qui veut passer de "data marché" à "creative testable" en quelques minutes, sans base de données, tout en frontend.

## Core Value

À partir d'un signal marché réel, le produit génère **une publicité 30s testable** pour un jeu Voodoo sélectionné — pas d'invention générique, chaque créatif est traçable jusqu'à un pattern observé sur le top des ads concurrentes.

## Requirements

### Validated

- [x] Landing page premium présentant le produit et le workflow en 4 étapes — Validé en Phase 1
- [x] Page projet `/project` avec 4 onglets de workflow navigables et sidebar — Validé en Phase 1

### Active

- [ ] Landing page premium présentant le produit et le workflow en 4 étapes
- [ ] Page projet `/project` avec 4 onglets de workflow (Game Identity, Market Scan, Pattern Analysis, Creative Output) et sidebar
- [ ] Étape 1 — sélection d'un jeu Voodoo (Marble Sort / Control Mob) avec auto-fill catégorie + tags éditables
- [ ] Étape 2 — appel live Sensor Tower configurable (nb d'ads, période, marché), Top 3 ads classés, sélection d'une ad
- [ ] Étape 3 — analyse vidéo Gemini (full video) de l'ad sélectionnée, affichage non-JSON, extraction de 3 patterns scorés, sélection d'un pattern
- [ ] Étape 4 — brief créatif éditable, prompt Scenario dérivé, génération vidéo 30s verticale, prévisualisation + rationale
- [ ] State global frontend uniquement (no DB), persistance optionnelle en localStorage
- [ ] Loading + error states explicites pour chaque appel API (textes imposés par le PRD)
- [ ] Déploiement Vercel-ready avec `.env.local` pour les 3 clés API
- [ ] UI premium light : blanc/charcoal + un seul accent, cards arrondies, no dark mode, no JSON brut

### Out of Scope

- Base de données / persistance backend — **Why:** PRD impose "no database, frontend state only"
- Dark mode et esthétique cyberpunk — **Why:** PRD impose UI light premium Voodoo-inspired
- Multi-projets fonctionnels (le bouton "+ New Project" est visible mais non fonctionnel) — **Why:** MVP single-project hardcodé
- Plus de 2 jeux dans le sélecteur — **Why:** MVP limité à Marble Sort + Control Mob
- Frame extraction de la vidéo Gemini — **Why:** sauf si techniquement requis ; cible = full video analysis
- Fallback silencieux vers du fake data en mode live — **Why:** PRD interdit explicitement (intégrité de la démo)
- Génération de plus d'une vidéo finale — **Why:** MVP = un creative 30s

## Context

- Hackathon Voodoo. Le PRD `voodoo-creative-radar-prd.md` est la source de vérité unique et impose les phases, l'architecture fichiers et l'UI.
- Un sous-dossier d'expérimentation `voodoo-hack/` existe déjà (Vite/React/TS, intégration SensorTower MCP). **Décision (2026-04-25)** : il reste indépendant ; le Creative Radar est construit comme nouvelle app **Next.js** à la racine, conformément au PRD.
- Configurations MCP Scenario + SensorTower déjà présentes dans `voodoo-hack/.mcp.json` (utilisables pour exploration / debug).
- Aucune base de code Next.js n'existe encore à la racine — projet greenfield à scaffold.
- Démo finale : "le creative est généré depuis un signal marché réel — pas un prompt générique."

## Constraints

- **Tech stack**: Next.js (App Router) + TypeScript + React + Tailwind CSS — imposé par le PRD
- **Deploy target**: Vercel — pas d'autre cible
- **APIs**: Sensor Tower (live, jamais de fake data en prod), Gemini (analyse vidéo), Scenario (génération vidéo) — clés via `.env.local`
- **Data**: aucune base de données ; state frontend uniquement, localStorage optionnel
- **UX**: jamais de JSON brut visible côté utilisateur ; loading texts imposés mot pour mot
- **Sécurité**: secrets jamais commités, `.env.local` listé dans `.gitignore`
- **Périmètre**: ne rien ajouter au-delà du PRD ("Quality over completeness")
- **Démo**: doit produire une vidéo 30s verticale via Scenario en fin de parcours

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Construire une app Next.js neuve à la racine de `voodoo-hack/` (sandbox Vite archivée sous tag `vite-sandbox-final`) | PRD impose Next.js + Vercel ; Vite incompatible App Router | ✓ Delivered in Phase 1 |
| Mode YOLO + agents complets (research, plan-check, verifier, nyquist) | Hackathon court mais qualité de démo critique — research/checks compensent l'absence de revue humaine | — Pending |
| Granularité standard (5-8 phases) en complément du découpage PRD à 10 phases | Le PRD propose 10 phases ; le roadmap GSD peut les regrouper si pertinent (laisser le roadmapper trancher) | — Pending |
| Aucune base de données, state frontend uniquement | Imposé par PRD pour minimiser surface du MVP et focus démo | — Pending |
| Sensor Tower en live obligatoire, fake data uniquement via flag dev | Imposé par PRD : la crédibilité de la démo repose sur "real market signal" | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after initialization*
