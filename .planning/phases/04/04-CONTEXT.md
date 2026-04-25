# Phase 4 & 5: Market Scan — Context & Brainstorm

**Gathered:** 2026-04-25
**Status:** Brainstorm complet — décisions en attente (voir section OPEN DECISIONS)
**Spike réalisé:** Appels SensorTower MCP + curl direct avec le token `ST0_76ewxi5k_Jm9uGG4YjLhbyd`

---

## Résultats du spike SensorTower

### Ce qui fonctionne avec le token

| Endpoint | Résultat |
|---|---|
| `GET /v1/unified/ad_intel/top_apps` | ✅ Top advertisers avec SOV — ex: Candy Crush 8.13%, Gossip Harbor 7.03% |
| `GET /v1/unified/ad_intel/creatives/top` | ✅ 72 333 creatives dispo pour Puzzle/Facebook/mars 2026 |
| `GET /v1/unified/ad_intel/creatives` | ✅ Creatives filtrées par app_id avec `share` par ad_unit |
| `GET /v1/unified/search_entities` | ✅ Recherche publisher/app — Voodoo trouvé (`publisher_id: 59bad4eb63f2dc0d0b9689e1`) |
| `GET /v1/ios/apps` | ✅ Metadata d'app (nom, icône, rating, downloads) |
| Health check + category IDs | ✅ |

### Ce qui NE fonctionne PAS (erreurs validées)

- `WW` / `Global` comme `country` → rejeté explicitement par l'API
- `60d` comme période → n'existe pas (API accepte `week` / `month` / `quarter` uniquement)
- `All Networks` sur `creatives/top` → rejeté (uniquement accepté sur `top_apps`)
- IDs App Store iOS directs (`1345822201`) sur les endpoints `unified` → retournent `[]` ; il faut des **unified SensorTower IDs** (format `55c5028802ac64f9c0001faf`)

### Champs retournés utilisables

**`top_apps`:**
```
app_id (unified ST ID), name, publisher_name, publisher_id, icon_url, sov
```

**`creatives/top`:**
```
id, app_id, network, ad_type, first_seen_at, last_seen_at,
creatives[].creative_url, creatives[].thumb_url, creatives[].preview_url,
creatives[].width, creatives[].height, creatives[].message, creatives[].button_text,
app_info.name, app_info.icon_url
```

**`creatives` (par app_id spécifique):**
```
...idem + share (part dans les dépenses réseau), breakdown, top_publishers
available_networks[] (liste des réseaux qui ont des données)
```

**Assets media :** URLs S3 sans auth requise — `https://x-ad-assets.s3.amazonaws.com/media_asset/<id>/thumb`

---

## Problèmes de mapping Phase 3 → Phase 4

### 1. Catégorie : `GameIdentity.category` → ST category ID

Phase 3 produit `category: 'Puzzle'` ou `category: 'Battle'`.
SensorTower utilise des IDs numériques pour les sous-catégories de Games :

```
'Puzzle'  → 7012
'Battle'  → ❓  Action (7001) ? Strategy (7017) ? Casual (7003) ?
```

**Décision requise :** quel category ID pour "Battle" ? (voir OPEN DECISIONS)

Mapping complet iOS à placer dans `lib/sensorTower.ts` :
```
7001 Action | 7002 Adventure | 7003 Casual | 7012 Puzzle
7013 Racing | 7014 Role Playing | 7015 Simulation | 7017 Strategy
```

### 2. `timeRange` : le PRD dit `'60d'` mais l'API ne l'a pas

| PRD | API | Statut |
|---|---|---|
| `'30d'` | `period=month` | ✅ |
| `'60d'` | ❌ n'existe pas | Problème |
| `'90d'` | `period=quarter` | ✅ |

**Décision requise :** remplacer `'60d'` par `'7d'` (→ `period=week`) ou autre (voir OPEN DECISIONS).

La date envoyée à ST est `today - period` calculée server-side :
```typescript
// ex pour '30d' : date = "2026-03-26" (today - 30j = début de la fenêtre)
function getPeriodStartDate(timeRange: '7d' | '30d' | '90d'): string
```

### 3. `market` : "Global" n'existe pas

L'API rejette explicitement `WW` avec la liste des pays valides :
`US, AU, CA, CN, FR, DE, GB, IT, JP, KR, RU, AR, AT, BE, BR, ...`

**Décision requise :** supprimer "Global" ou le simuler (voir OPEN DECISIONS).

### 4. Network : champ manquant dans `MarketScanConfig`

`creatives/top` refuse `All Networks` — il faut un réseau précis.
`top_apps` accepte `All Networks`.

Ça introduit un **choix UX** : on affiche les top creatives de quel réseau ?

Réseaux les plus pertinents pour le casual mobile :
```
TikTok | Facebook | Unity | Admob | Instagram | Meta Audience Network
```

**Décision requise :** dropdown Network dans la config Phase 4, ou réseau fixe par défaut (voir OPEN DECISIONS).

---

## Architecture des appels API

### Flow Phase 4 : un scan = deux appels parallèles

```
fetchSensorTowerAds(config: MarketScanConfig): Promise<MarketScanResult>
  │
  ├── Appel 1 : GET /unified/ad_intel/top_apps
  │     params : category, country, network="All Networks", period, date, limit=20
  │     → top publishers avec SOV → sera utilisé pour enrichir les creatives + Phase 5 KPIs
  │
  └── Appel 2 : GET /unified/ad_intel/creatives/top
        params : category, country, network=<config.network>, period, date,
                 ad_types="video,video-interstitial,playable", limit=config.numberOfAds
        → top creatives ordonnés (ordre API = rang de pertinence)

  → Merge : enrichir chaque creative avec le SOV de son publisher (match sur app_id)
  → Construire MarketScanResult
```

### Pourquoi deux appels et pas un ?

- `creatives/top` ne contient pas le SOV (Share of Voice) — c'est dans `top_apps`
- SOV est le signal de ranking prioritaire du PRD (Phase 5)
- `creatives/top` donne les creatives visuelles avec `thumb_url` pour l'affichage
- Les deux sont nécessaires pour construire une ad card complète

### Alternative Phase 5 (optionnelle)

Si on veut plus de détail sur les creatives des 3 tops seulement :
```
GET /unified/ad_intel/creatives
  app_ids=<3 top app_ids from top_apps>
  + display_breakdown=true
  → share par creative, breakdown réseau, top publishers
```
Utile pour la Phase 5 "grille optionnelle" et le rankingReason détaillé.

---

## KPIs Phase 5

### KPI cards (barre au-dessus du Top 3)

```
[Ads retrieved: N]   [Competitors found: N]   [Networks: N]   [Market: US]   [Period: 30 days]
```

| KPI | Source | Calcul |
|---|---|---|
| Ads retrieved | `count` de `creatives/top` (tronqué à `numberOfAds`) | Directement disponible |
| Competitors found | count distinct de `app_id` dans `ad_units[]` | Calculé client |
| Networks detected | `available_networks[]` de `creatives` ou count distinct | Calculé client |
| Market | `config.market` | Pass-through |
| Time range | `config.timeRange` formaté | Pass-through |

### Signaux de ranking Top 3 (ordre de priorité)

Le PRD dit : `SOV → impressions → spend → recency`. Ce qu'on a vraiment :

| Signal PRD | Proxy disponible | Qualité |
|---|---|---|
| Share of Voice | `top_apps.sov` (par publisher) | ✅ direct |
| Impressions | ❌ pas exposé | Absent |
| Spend estimate | `creatives.share` (part dans dépenses réseau) | Bon proxy |
| Recency | `last_seen_at` | ✅ direct |

**Ranking réel à implémenter :**
```
1. share desc  (meilleure granularité par creative)
2. sov desc    (SOV publisher pour départager)
3. last_seen_at desc  (recency en tiebreaker final)
```

### Ad card Phase 5

Champs affichés par card :
```
rank (1/2/3)
thumb_url (thumbnail du creative)
app_info.name (gameName du concurrent)
network
ad_type (video / playable / image)
first_seen_at → last_seen_at (durée de diffusion)
share (%) — affiché comme "Creative share"
sov (%) — affiché comme "Publisher SOV"
rankingReason — ex: "Highest creative share (82.2%) on TikTok"
bouton [Select this ad]
```

---

## Types à modifier / créer

### `MarketScanConfig` — changements vs PRD

```typescript
export type MarketScanConfig = {
  category: string;          // inchangé, vient de GameIdentity
  tags: string[];            // inchangé
  numberOfAds: 10 | 20 | 30 | 50;  // inchangé
  timeRange: '7d' | '30d' | '90d'; // ← '60d' retiré, '7d' ajouté
  market: 'US' | 'France' | 'UK' | 'Germany' | 'Japan'; // ← 'Global' retiré
  network: 'TikTok' | 'Facebook' | 'Unity' | 'Admob' | 'Instagram'; // ← NOUVEAU
};
```

### `MarketAd` — enrichissement avec champs ST réels

```typescript
export type MarketAd = {
  id: string;
  rank?: number;
  gameName: string;
  adId: string;
  creativeUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;     // = thumb_url ST
  network?: string;
  format?: 'video' | 'image' | 'playable' | 'unknown';
  firstSeen?: string;
  lastSeen?: string;
  market?: string;
  // Champs enrichis depuis ST
  appId?: string;            // unified ST app_id (pour Gemini phase 6+)
  sov?: number;              // publisher SOV % depuis top_apps
  share?: number;            // creative share % depuis creatives endpoint
  performanceSignal?: number;
  performanceSignalLabel?: string;
  rankingReason?: string;
};
```

---

## Structure de `lib/sensorTower.ts`

```typescript
import 'server-only';

// Mappings internes (PRD → ST)
const CATEGORY_MAP: Record<string, number> = {
  Puzzle: 7012,
  Battle: 7001,   // ← à valider
};
const MARKET_MAP: Record<string, string> = {
  US: 'US', France: 'FR', UK: 'GB', Germany: 'DE', Japan: 'JP',
};
const PERIOD_MAP: Record<string, 'week' | 'month' | 'quarter'> = {
  '7d': 'week', '30d': 'month', '90d': 'quarter',
};

function getPeriodStartDate(period: 'week' | 'month' | 'quarter'): string {
  // Calcule today - N jours en YYYY-MM-DD
  // week = 7j, month = 30j, quarter = 90j
}

async function fetchTopAdvertisers(params): Promise<STTopApp[]>
async function fetchTopCreatives(params): Promise<STCreative[]>

export async function fetchSensorTowerAds(
  config: MarketScanConfig
): Promise<MarketScanResult>
```

### Route handler `app/api/sensor-tower/scan/route.ts`

```typescript
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST { config: MarketScanConfig }
// 1. Valider input avec Zod
// 2. Si NEXT_PUBLIC_USE_DEV_MOCKS → retourner data/devMockAds.ts
// 3. Appel fetchSensorTowerAds(config)
// 4. Valider response ST avec Zod avant de toucher au state
// 5. Retourner MarketScanResult
```

### Gestion d'erreurs (union discriminée)

```typescript
type SensorTowerError =
  | { kind: 'auth';        message: string }
  | { kind: 'bad_params';  message: string; field?: string }
  | { kind: 'rate_limit';  message: string; retryAfterSec: number }
  | { kind: 'server';      message: string; statusCode: number }
  | { kind: 'network';     message: string };
```

---

## UI Phase 4 — Configuration du scan

Dropdowns dans l'ordre :

```
Number of ads:  [10]  [20]  [30]  [50]
Time range:     [7 days]  [30 days]  [90 days]
Market:         [US ▼]   (US | France | UK | Germany | Japan)
Network:        [TikTok ▼]  (TikTok | Facebook | Unity | Admob | Instagram)

[Run Sensor Tower scan]
```

Loading state : texte verbatim `Running Sensor Tower scan...` (depuis `lib/copy.ts`)

---

## OPEN DECISIONS

Les 5 décisions à prendre avant de lancer `/gsd-plan-phase 4` :

| # | Décision | Options | Reco |
|---|---|---|---|
| D-01 | Category ST pour "Battle" | `7001` Action / `7017` Strategy / `7003` Casual | **7001 Action** |
| D-02 | Remplacer `'60d'` par | `'7d'` (week) / garder `'60d'` mappé sur quarter (trompe) | **`'7d'`** |
| D-03 | Market "Global" | Supprimer / multi-call US+FR+GB merge | **Supprimer, 5 pays** |
| D-04 | Network | Dropdown dans config / réseau fixe (TikTok) | **Dropdown** |
| D-05 | Ranking signal principal | `share` desc / `sov` desc / ordre API natif | **`share` desc** |

---

---

## Points à adresser — Phase 4 : Market Scan & Service Sensor Tower

> Cette phase est le premier point d'entrée des données réelles. La qualité repose sur la fiabilité de la connexion et la validation des données.

### Robustesse du service `lib/sensorTower.ts`

**Sécurité — étanchéité des secrets**
- `import 'server-only'` en tête de `lib/sensorTower.ts` : bloque la compilation si le module est importé côté client
- La clé API ne transite jamais dans le bundle JS client — uniquement dans les route handlers `app/api/`
- Le client appelle `/api/sensor-tower/scan` (route interne), jamais `api.sensortower.com` directement
- Vérification build-time : `NEXT_PUBLIC_USE_DEV_MOCKS` absent en Production (assertion explicite au démarrage)

**Gestion des timeouts**
- Chaque route handler exporte `export const maxDuration = 300` et `export const runtime = "nodejs"` (Vercel Fluid Compute)
- Les deux appels ST (`top_apps` + `creatives/top`) sont faits en `Promise.all` pour ne pas doubler la latence
- Mirroir obligatoire dans `vercel.json` : `{ "functions": { "app/api/sensor-tower/scan/route.ts": { "maxDuration": 300 } } }`
- À tester sur Preview Vercel déployé, pas sur `next dev` (les timeouts locaux ne sont pas représentatifs)

**Validation Zod**
- Deux schémas distincts : un pour le body POST entrant (`MarketScanConfigSchema`), un pour la réponse ST brute (`STTopAppSchema`, `STCreativeSchema`)
- La réponse ST est validée **avant** de toucher au state — si Zod échoue, on throw une `SensorTowerError { kind: 'bad_response' }` propre
- Les champs optionnels ST (`share`, `sov`, `thumb_url`) sont wrappés en `.optional()` — leur absence ne fait pas crasher le parsing
- `MarketScanResult` ne sort de la route handler que si Zod a validé les deux côtés (input + output)

**Taxonomie d'erreurs**
- Union discriminée (pas d'`Error` générique) :
  ```typescript
  type SensorTowerError =
    | { kind: 'auth';         message: string }                       // 401
    | { kind: 'bad_params';   message: string; field?: string }       // 422
    | { kind: 'rate_limit';   message: string; retryAfterSec: number } // 429 + parse Retry-After header
    | { kind: 'bad_response'; message: string }                       // Zod parse failure
    | { kind: 'server';       message: string; statusCode: number }   // 5xx
    | { kind: 'network';      message: string }                       // fetch throw
  ```
- Le `429` parse le header `Retry-After` ST (valeur en secondes) et l'expose dans `retryAfterSec` pour que l'UI affiche "Réessayer dans 42 secondes" au lieu d'un code technique
- L'UI ne reçoit jamais de stack trace — seulement le `kind` + `message` métier

### Expérience de configuration UI

**Contrôle du scan — dropdowns**
- Ordre des dropdowns dans l'onglet 2 : `Number of ads` → `Time range` → `Market` → `Network`
- Valeurs finales (après brainstorm, voir OPEN DECISIONS) :
  - Number of ads : `10 | 20 | 30 | 50`
  - Time range : `7 days | 30 days | 90 days` (pas de 60 jours — non supporté par l'API)
  - Market : `US | France | UK | Germany | Japan` (pas de Global — rejeté par l'API)
  - Network : `TikTok | Facebook | Unity | Admob | Instagram`
- Les dropdowns sont pré-remplis depuis le state Zustand si un scan précédent a déjà été configuré

**État de chargement**
- Texte verbatim obligatoire : `Running Sensor Tower scan...` (depuis `lib/copy.ts`, jamais inline)
- Spinner ou skeleton visible pendant les deux appels parallèles ST
- Bouton `Run Sensor Tower scan` désactivé + texte de chargement pendant l'exécution (pas de double-submit)

**Mode mock — hygiène de démo**
- Ribbon jaune `DEV MOCK` persistant en haut de l'app quand `NEXT_PUBLIC_USE_DEV_MOCKS=true`
- Le ribbon est rendu dans `app/layout.tsx` (visible sur toutes les pages, pas seulement l'onglet 2)
- `data/devMockAds.ts` structure identique à `MarketScanResult` live — les composants Phase 5 ne savent pas distinguer mock vs live
- Assertion build-time : si `NEXT_PUBLIC_USE_DEV_MOCKS=true` et `NODE_ENV=production` → erreur explicite au build

---

## Points à adresser — Phase 5 : Top 3 Ranking & Ad Selection

> Ici, l'enjeu est de transformer un "dump" de données en une intelligence de marché séduisante pour l'utilisateur.

### Intelligence du ranking

**Logique de cascade — déterministe**
- Implémentation : `[...ads].sort(compareAds)` avec comparateur pur (pas de mutation)
- Ordre de priorité (cascade) :
  1. `share` desc — part du creative dans les dépenses réseau (meilleur proxy spend/impressions disponible)
  2. `sov` desc — Share of Voice publisher (tiebreaker niveau éditeur)
  3. `last_seen_at` desc — recency (tiebreaker final)
- Le tri est **stable** : deux ads avec exactement les mêmes signaux gardent leur ordre d'origine (ordre API = pertinence ST)
- Tester avec ≥ 30 ads pour valider la cascade quand `share` est absent sur certaines entrées

**Ranking reason — phrase humaine**
- Calculé côté client, jamais côté serveur (dérivé = lecture seule)
- Règle : la reason reflète **le signal qui a réellement placé cette ad en tête**
  ```
  share > 0     → "Highest creative share (82.2%) on TikTok"
  share = 0/null → "Highest publisher SOV (8.1%)"
  sov = 0/null  → "Most recently active (last seen 3 days ago)"
  ```
- Jamais de JSON brut dans `rankingReason` — toujours une string formatée

**Fallback logic — zéro trou dans le Top 3**
- Si `share` absent → cascade sur `sov`
- Si `sov` absent → cascade sur `last_seen_at`
- Si `last_seen_at` absent → ordre natif API (index position dans `ad_units[]`)
- Si moins de 3 ads retournées → afficher 1 ou 2 cards sans forcer un "3ème" vide
- Le Top 3 est toujours reproductible pour la même config (déterministe, pas de random)

### Visualisation premium & UX

**Cartes KPI — crédibilité du scan**
- 5 métriques macro affichées avant le Top 3 :
  ```
  [Ads retrieved: N]  [Competitors found: N]  [Networks: N]  [Market: US]  [Period: 30 days]
  ```
- `Competitors found` = count distinct de `app_id` dans les `ad_units[]` retournés
- `Networks detected` = longueur de `available_networks[]` ou count distinct de `network` dans les ad_units
- Ces KPI cards donnent de la crédibilité au scan et contextualisent le Top 3 avant que l'utilisateur le voie

**Cartes Top 3 — design des composants**
- Chaque card affiche dans l'ordre :
  - Rang `#1 / #2 / #3` (badge accent)
  - Thumbnail (depuis `thumb_url` S3 — image sans auth)
  - `app_info.name` (nom du jeu concurrent)
  - Network + ad_type (ex: `TikTok · Video`)
  - `first_seen_at` → `last_seen_at` (durée de diffusion formatée en "jours")
  - Creative share % (si disponible) + Publisher SOV %
  - `rankingReason` (phrase humaine, pas de JSON)
  - Bouton `[Select this ad]`
- La card sélectionnée a un état visuel distinct (border accent, check icon)

**Grille secondaire — les autres ads**
- Section `See all N ads` collapsible sous le Top 3 (fermée par défaut)
- Grille 3 ou 4 colonnes avec cards compactes (thumbnail + nom + network)
- Pas de ranking reason sur les ads secondaires — juste les données brutes
- Objectif : consultable sans polluer la lisibilité du Top 3

### Persistance du state — Zustand & hydration

- La sélection d'une ad (`selectedAd`) est persistée via Zustand `persist` → survit au refresh
- `partialize` exclut les champs transitoires (`loading`, `error`) de la persistence localStorage
- `skipHydration: true` sur le store + rehydrate via `useEffect` au root layout (posé en Phase 1, réutilisé ici)
- Gate de l'UI dépendante de `selectedAd` sur le flag `hydrated` — évite le flash "aucune sélection" au SSR puis "sélection restaurée" au client
- Test de validation : sélectionner une ad, refresh, vérifier que l'onglet 3 est activé et que l'ad est bien pré-sélectionnée

---

*Document créé le 2026-04-25 — spike SensorTower réalisé, brainstorm Phase 4/5 complet.*
*Prochaine étape : valider les 5 OPEN DECISIONS → `/gsd-plan-phase 4`*
