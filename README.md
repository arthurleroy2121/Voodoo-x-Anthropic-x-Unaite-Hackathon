# Voodoo Hack

Repo hackathon **Voodoo x Unaite x Anthropic** — 25–26 avril 2026.
Prototype jouable/utilisable dans un navigateur, déployable en une commande.

## Tracks

1. **Jeu Voodoo-style** — hyper-casual browser game, Claude pilote gameplay/narration, Scenario génère les assets.
2. **Outil interne** — productivité / créa / data pour les équipes Voodoo, Claude en cerveau.
3. **Carte blanche / AI-native** — idée originale qui n'existait pas sans LLM.

Détail des pistes dans [`docs/IDEAS.md`](docs/IDEAS.md).

## Stack

- **Vite 6** + **React 18** + **TypeScript 5.7**
- **Tailwind v4** (plugin Vite, config zéro)
- **@anthropic-ai/sdk** — Claude côté serverless (`/api/claude`)
- **zustand** — state légère
- **lucide-react** — icônes

### Libs gardées "au cas où" (à retirer samedi soir si inutilisées)

- **phaser** — si Track 1 (jeu 2D)
- **three** + **@react-three/fiber** — si pivot 3D

## Setup (collaborateur)

```bash
git clone https://github.com/antoinevoinchet-spec/voodoo-hack.git
cd voodoo-hack
pnpm install
cp .env.example .env.local   # remplir ANTHROPIC_API_KEY et SENSOR_TOWER_API_TOKEN
```

> Prérequis : Node ≥ 20, `pnpm` (`npm i -g pnpm`), et — pour le MCP SensorTower — `uv` (`brew install uv` ou `curl -LsSf https://astral.sh/uv/install.sh | sh`).

### Workflow Git

```bash
git pull --rebase origin main         # avant de commencer
# … code …
git checkout -b feat/ma-feature       # branche par feature (recommandé)
git add <fichiers>
git commit -m "feat: description courte"
git push -u origin feat/ma-feature
gh pr create --base main --fill        # ou via l'UI GitHub
```

Pour rester simple en hackathon, on peut aussi pousser directement sur `main` (`git push origin main`) si on est synchros — mais `git pull --rebase` avant chaque push pour éviter les merges parasites.

### MCP servers (Claude Code)

Le repo contient `.mcp.json` à la racine, qui déclare deux serveurs MCP partagés : `scenario` (Scenario.gg, génération d'assets) et `sensortower` (analyse marché mobile).

À la **première ouverture du projet** dans Claude Code, un prompt demande d'approuver les serveurs : répondre **Approve**. Après ça, ils sont actifs automatiquement à chaque session.

Vérifier ou réactiver depuis Claude Code :

```
/mcp                                   # liste les serveurs et leur statut
```

Si un serveur est `disabled`, l'activer avec :

```
claude mcp list                        # depuis le shell, hors Claude Code
claude mcp enable scenario             # ou: sensortower
```

Authentification (à faire une fois par poste) :

1. **SensorTower** — remplir `SENSOR_TOWER_API_TOKEN` dans `.env.local` (obtenu sur sensortower.com). Le serveur MCP lit la variable d'env automatiquement.
2. **Scenario** — taper `/mcp` dans Claude Code, sélectionner `scenario` → `Authenticate` (flow OAuth, ouvre le navigateur).

## Dev

```bash
pnpm dev               # Vite, http://localhost:5173 (front only)
pnpm dev:api           # vercel dev — front + /api/claude en local (pour smoke test Claude)
```

> ⚠️ `pnpm dev` ne sert pas l'API route. Utiliser `pnpm dev:api` pour tester le bouton "Ask Claude".

## Deploy (1 commande)

```bash
vercel --prod
```

Première fois : `vercel login` puis `vercel link`. Ajouter `ANTHROPIC_API_KEY` (et `SCENARIO_API_KEY`) dans les Environment Variables du projet Vercel.

## Structure

```
api/
  claude.ts           # serverless route — appelle Claude, garde la clé côté serveur
src/
  components/         # composants React
  game/               # logique Phaser (scenes, entities)
  lib/                # wrappers Claude, Scenario, utils
  hooks/              # custom hooks React
  assets/             # images Scenario, sons
  types/              # types TS partagés
docs/
  PITCH.md            # à remplir dimanche matin
  DECISIONS.md        # journal de choix (utile au pitch)
  IDEAS.md            # brainstorm samedi 10h
```

## Checklist hackathon

- [ ] Équipe formée (2–3 pers.)
- [ ] `.env` renseigné (Anthropic + Scenario)
- [ ] Déploiement Vercel fait au moins 1 fois (ne jamais tester le deploy dimanche 14h)
- [ ] Brainstorm samedi 10h → idée choisie 11h (cf. `docs/IDEAS.md`)
- [ ] MVP jouable samedi 22h
- [ ] Démo répétée dimanche 13h
- [ ] `PITCH.md` écrit dimanche 12h
- [ ] Pitch live dimanche 14h30

## Docs

- [`docs/PITCH.md`](docs/PITCH.md)
- [`docs/DECISIONS.md`](docs/DECISIONS.md)
- [`docs/IDEAS.md`](docs/IDEAS.md)
