// lib/sensortower/aggregate.ts
// Helpers d'agrégation des données Sensor Tower pour le dashboard market scan.
// Pas d'import 'server-only' : ces fonctions sont des transformations pures et
// peuvent être utilisées aussi bien côté serveur (orchestrateur) que côté tests.

import type {
  AdTypeFilter,
  DashboardAd,
  NetworkAlias,
  STAdUnit,
  STAppMetadata,
  STTopApp,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Concentration index (Herfindahl-Hirschman)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule l'indice HHI sur les top N publishers.
 * Formule : `Σ(market_share_pct²)` où market_share_pct est en pourcentage entier (0-100).
 * Range : 0 (parfaitement fragmenté) à 10000 (monopole).
 *
 * On utilise `sov` comme proxy de market share (faute d'avoir des données revenus).
 * À normaliser sur la somme des SoV du top N visible — c'est l'approximation que
 * la note UI précise.
 */
export function computeHHI(
  publishers: Array<{ sov?: number | undefined }>,
  topN = 10,
): number {
  const slice = publishers.slice(0, topN);
  const sumSov = slice.reduce((acc, p) => acc + (p.sov ?? 0), 0);
  if (sumSov <= 0) return 0;
  // Normalise les SoV sur la somme du top N pour obtenir des market shares qui somment à 1.
  const hhi = slice.reduce((acc, p) => {
    const share = (p.sov ?? 0) / sumSov;
    const sharePct = share * 100;
    return acc + sharePct * sharePct;
  }, 0);
  // Arrondi à l'entier pour affichage propre.
  return Math.round(hhi);
}

/** Catégorise le HHI selon les seuils standards de l'antitrust américain. */
export function interpretHHI(
  hhi: number,
): 'concentré' | 'modérément concentré' | 'fragmenté' {
  if (hhi > 2500) return 'concentré';
  if (hhi >= 1500) return 'modérément concentré';
  return 'fragmenté';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Network alias expansion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapping NetworkAlias UI → noms Sensor Tower exact attendus par l'API.
 * "Meta" est un alias commercial qui regroupe 3 networks ST distincts
 * (Facebook + Instagram + Meta Audience Network) — on les paralléle côté serveur.
 */
const NETWORK_ALIAS_TO_ST: Record<NetworkAlias, string[]> = {
  Meta: ['Facebook', 'Instagram', 'Meta Audience Network'],
  TikTok: ['TikTok'],
  Youtube: ['Youtube'],
};

/**
 * Reverse map : nom Sensor Tower (lower-case) → alias UI.
 * Sert au moment du rendu : on tag chaque ad avec son alias plutôt que le nom ST brut.
 */
const ST_NETWORK_TO_ALIAS: Record<string, NetworkAlias> = {
  facebook: 'Meta',
  instagram: 'Meta',
  'meta audience network': 'Meta',
  tiktok: 'TikTok',
  youtube: 'Youtube',
};

export function expandNetworkAlias(alias: NetworkAlias): string[] {
  return NETWORK_ALIAS_TO_ST[alias];
}

/**
 * Renvoie l'alias UI correspondant à un nom Sensor Tower brut, ou `null` si
 * non reconnu (ne devrait pas arriver vu qu'on n'appelle que les aliases connus).
 */
export function networkToAlias(stNetworkName: string): NetworkAlias | null {
  return ST_NETWORK_TO_ALIAS[stNetworkName.toLowerCase()] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Ad type detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map un `ad_type` Sensor Tower brut vers un format UI simple.
 * Les valeurs ad_type contiennent souvent des sous-types (`image-banner`, `video-rewarded`…)
 * — on aplatit en 3 buckets pour les filtres UI.
 */
export function detectAdFormat(adType: string | undefined): AdTypeFilter | 'unknown' {
  if (!adType) return 'unknown';
  const t = adType.toLowerCase();
  if (t.includes('playable') || t.includes('interactive')) return 'playable';
  if (t.includes('video')) return 'video';
  if (t.includes('image') || t.includes('banner') || t === 'full_screen') return 'image';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Merge cross-network top creatives → top 3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métadata par app_id pour résoudre les noms de jeu / icones après merge.
 * On accepte une Map plutôt qu'un Array pour O(1) lookup.
 */
export type AppMetaIndex = Map<string, STAppMetadata>;

/** Construit l'index par app_id depuis le payload `getAppMetadataBatch`. */
export function buildAppMetaIndex(apps: STAppMetadata[]): AppMetaIndex {
  const idx = new Map<string, STAppMetadata>();
  for (const app of apps) {
    idx.set(String(app.app_id), app);
  }
  return idx;
}

/**
 * Merge les ad_units retournés par les appels `creatives/top` parallélisés
 * (1 par network), déduplique par creative.id (un même creative peut apparaître
 * sur plusieurs networks — improbable mais safe), et retourne le top 3 dans
 * l'ordre natif Sensor Tower (chaque API call est déjà ordonné par ranking).
 *
 * Stratégie de tri lorsque plusieurs networks remontent :
 * - On interleave les top 3 de chaque network puis on tronque à 3 globalement.
 * - Si un network a un seul ad_unit alors qu'un autre en a 30, l'ordre prend
 *   le 1er du network 1, le 1er du network 2, le 1er du network 3, etc.
 *   (round-robin) — assure une diversité visuelle network sur les 3 cards.
 */
export function mergeCreativesAcrossNetworks(
  byNetwork: Array<{ network: string; adUnits: STAdUnit[] }>,
  filters: { adTypeFilter: AdTypeFilter[] },
  appMeta: AppMetaIndex,
  topN = 3,
): { ads: DashboardAd[]; totalObserved: number } {
  // Filtrage par ad type côté UI.
  const filterSet = new Set(filters.adTypeFilter);
  const wantsAny = filterSet.size === 0;

  // Compte total de creatives observés (avant filtre top N) pour le KPI.
  let totalObserved = 0;
  for (const slot of byNetwork) {
    totalObserved += slot.adUnits.length;
  }

  // Round-robin : on prend [n0[0], n1[0], n2[0], n0[1], n1[1], n2[1], …] puis on filtre.
  const seen = new Set<string>();
  const flat: DashboardAd[] = [];
  let index = 0;
  let exhausted = false;

  while (!exhausted && flat.length < topN * 5 /* safety cap */) {
    exhausted = true;
    for (const slot of byNetwork) {
      const adUnit = slot.adUnits[index];
      if (!adUnit) continue;
      exhausted = false;

      const firstCreative = adUnit.creatives[0];
      if (!firstCreative) continue;
      if (seen.has(firstCreative.id)) continue;

      const adFormat = detectAdFormat(adUnit.ad_type);
      if (!wantsAny && adFormat !== 'unknown' && !filterSet.has(adFormat)) continue;
      // Si ad type est unknown mais l'utilisateur a sélectionné au moins un filtre,
      // on garde unknown uniquement si tous filtres sont cochés.
      if (!wantsAny && adFormat === 'unknown' && filterSet.size < 3) continue;

      const alias = networkToAlias(slot.network);
      if (!alias) continue;

      const appIdRaw = adUnit.app_id ?? adUnit.app_info?.app_id;
      const appIdStr = appIdRaw == null ? null : String(appIdRaw);
      const meta = appIdStr ? appMeta.get(appIdStr) : undefined;

      const gameName =
        meta?.name ?? adUnit.app_info?.name ?? `App ${appIdStr ?? '?'}`;
      const publisherName =
        meta?.publisher_name ?? adUnit.app_info?.publisher_name ?? '';
      const iconUrl = meta?.icon_url ?? adUnit.app_info?.icon_url ?? null;

      seen.add(firstCreative.id);
      flat.push({
        creativeId: firstCreative.id,
        adUnitId: adUnit.id,
        network: slot.network,
        networkAlias: alias,
        adType: adUnit.ad_type ?? 'unknown',
        format: adFormat,
        thumbUrl: firstCreative.thumb_url ?? null,
        creativeUrl: firstCreative.creative_url ?? null,
        previewUrl: firstCreative.preview_url ?? null,
        videoDurationSec: firstCreative.video_duration ?? null,
        appId: appIdStr,
        gameName,
        publisherName,
        iconUrl,
        creativesCount: adUnit.creatives.length,
      });

      if (flat.length >= topN) {
        return { ads: flat.slice(0, topN), totalObserved };
      }
    }
    index += 1;
  }

  return { ads: flat.slice(0, topN), totalObserved };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Publishers slicing for the donut
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convertit un STTopAppsResponse.apps (publishers) en slices pour le donut :
 * top N + agrégat "Autres". Les SoV peuvent ne pas sommer à 1 (top_apps en
 * retourne souvent un sous-ensemble) — on les normalise sur le total visible.
 */
export function slicePublishers(
  publishers: STTopApp[],
  topN = 7,
): {
  topSlices: Array<{ publisherName: string; sovShare: number }>;
  othersShare: number;
} {
  const totalSov = publishers.reduce((acc, p) => acc + (p.sov ?? 0), 0);
  if (totalSov <= 0) {
    return { topSlices: [], othersShare: 0 };
  }

  const top = publishers.slice(0, topN);
  const others = publishers.slice(topN);

  const topSlices = top.map((p) => ({
    publisherName: p.publisher_name ?? p.name ?? 'Inconnu',
    sovShare: (p.sov ?? 0) / totalSov,
  }));

  const othersSov = others.reduce((acc, p) => acc + (p.sov ?? 0), 0);
  const othersShare = othersSov / totalSov;

  return { topSlices, othersShare };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Aggregate advertisers → publishers (group by publisher_id, sum SoV)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sensor Tower's `top_apps?role=publishers` accepts only ad-mediation networks
 * (Admob, Unity, Mintegral…), not social networks. Pour montrer la concentration
 * des éditeurs sur l'espace publicitaire d'une catégorie, on agrège plutôt
 * `role=advertisers` (= apps qui font de la pub) par `publisher_id`. Une même
 * maison d'édition (ex. Supercell) qui pousse 5 jeux différents apparaît alors
 * comme 1 seule slice avec la SoV cumulée des 5 jeux.
 *
 * @returns Liste de publishers triée par SoV décroissante, prête pour `slicePublishers`
 *          et `computeHHI`.
 */
export function aggregateAdvertisersByPublisher(
  advertisers: STTopApp[],
): STTopApp[] {
  const byPublisher = new Map<
    string,
    { publisher_id: string; publisher_name: string; sov: number }
  >();

  for (const adv of advertisers) {
    const pubId = adv.publisher_id ?? `_unknown_${adv.app_id}`;
    const pubName = adv.publisher_name ?? adv.name ?? 'Inconnu';
    const sov = adv.sov ?? 0;
    const existing = byPublisher.get(pubId);
    if (existing) {
      existing.sov += sov;
    } else {
      byPublisher.set(pubId, { publisher_id: pubId, publisher_name: pubName, sov });
    }
  }

  // Convert to STTopApp shape for compatibility with `slicePublishers` / `computeHHI`.
  const aggregated: STTopApp[] = [...byPublisher.values()]
    .sort((a, b) => b.sov - a.sov)
    .map((p) => ({
      app_id: p.publisher_id,
      name: p.publisher_name,
      publisher_id: p.publisher_id,
      publisher_name: p.publisher_name,
      sov: p.sov,
    }));

  return aggregated;
}
