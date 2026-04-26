// lib/sensortower/types.ts
// Types stricts mirroring les fields validés dans `Doc Sensor TOWER/sensor-tower.md`.
// Phase 4 — Market Scan dashboard.
//
// Pure types, no runtime — importable depuis Server Components et Client Components.
// Tous les fields sont marqués optional sauf ceux confirmés présents dans 100% des
// réponses validées, pour rester safe sur `noUncheckedIndexedAccess`.

// ─────────────────────────────────────────────────────────────────────────────
// 1. Top apps (advertisers / publishers) — endpoint `/v1/{os}/ad_intel/top_apps`
// ─────────────────────────────────────────────────────────────────────────────

/** Une ligne de la liste retournée quand `role=advertisers` ou `role=publishers`. */
export type STTopApp = {
  app_id: string | number;
  name: string;
  publisher_name?: string;
  publisher_id?: string;
  icon_url?: string;
  os?: 'ios' | 'android' | 'unified' | string;
  /** Identifiant interne Sensor Tower (≠ app_id pour les apps unifiées). */
  id?: string;
  entity_type?: string;
  is_unified?: boolean;
  /** Share of Voice — float entre 0 et 1 (ex. 0.0421 = 4.21 %). */
  sov?: number;
  canonical_country?: string;
  custom_tags?: Record<string, unknown>;
};

export type STTopAppsResponse = {
  apps: STTopApp[];
  /** Présent dans certaines réponses ; pas obligatoire. */
  count?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Top creatives — endpoint `/v1/{os}/ad_intel/creatives/top`
// ─────────────────────────────────────────────────────────────────────────────

/** Métadata sur l'app annonceur, embedée dans `ad_units[].app_info` quand présent. */
export type STAdUnitAppInfo = {
  app_id?: string | number;
  name?: string;
  publisher_name?: string;
  publisher_id?: string;
  icon_url?: string;
  os?: string;
};

/** Un creative individuel dans `ad_units[].creatives[]`. */
export type STCreative = {
  id: string;
  /** URL de l'asset original (image ou vidéo) sur S3. */
  creative_url?: string;
  preview_url?: string;
  thumb_url?: string;
  /** Durée de la vidéo en secondes (si applicable). */
  video_duration?: number;
  width?: number;
  height?: number;
  message?: string;
  button_text?: string;
};

/** Type d'ad accepté par l'API Sensor Tower. */
export type STAdType =
  | 'image'
  | 'image-banner'
  | 'image-interstitial'
  | 'image-other'
  | 'banner'
  | 'full_screen'
  | 'video'
  | 'video-rewarded'
  | 'video-interstitial'
  | 'video-other'
  | 'playable'
  | 'interactive-playable'
  | 'interactive-playable-rewarded'
  | 'interactive-playable-other';

/** Un groupe d'ad (perceptual hash group) retourné par creatives/top. */
export type STAdUnit = {
  id: string;
  app_id?: string | number;
  network: string;
  phashion_group?: string;
  ad_type?: STAdType | string;
  first_seen_at?: string;
  last_seen_at?: string;
  creatives: STCreative[];
  ad_formats?: string[];
  app_info?: STAdUnitAppInfo;
  /** `share` n'est PAS présent dans creatives/top mais l'est dans creatives ; on garde optional pour permettre le re-tri. */
  share?: number;
};

export type STCreativesTopResponse = {
  count?: number;
  available_networks?: string[];
  ad_units: STAdUnit[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. App metadata — endpoint `/v1/ios/apps`
// ─────────────────────────────────────────────────────────────────────────────

export type STAppCategory = string | { id?: string | number; name?: string };

export type STAppMetadata = {
  app_id: string | number;
  name?: string;
  publisher_name?: string;
  publisher_id?: string;
  icon_url?: string;
  os?: string;
  active?: boolean;
  url?: string;
  categories?: STAppCategory[];
  valid_countries?: string[];
  top_countries?: string[];
  release_date?: string;
  updated_date?: string;
  rating?: number;
  rating_count?: number;
  global_rating_count?: number;
  price?: number;
  description?: string;
  screenshot_urls?: string[];
  tablet_screenshot_urls?: string[];
  unified_app_id?: string;
  canonical_country?: string;
};

export type STAppsResponse = {
  apps: STAppMetadata[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Store ranking — endpoint `/v1/ios/ranking`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le format Sensor Tower de la réponse ranking est inhabituel : `ranking` est
 * un tableau plat d'app_ids ordonnés (string), pas d'objets riches. La metadata
 * (nom, icon, publisher) doit être complétée via un appel séparé à `/v1/ios/apps`.
 */
export type STRankingResponse = {
  category?: string | number;
  chart_type?: string;
  country?: string;
  date?: string;
  ranking: Array<string | number>;
};

/** Représentation enrichie côté serveur après jointure ranking + apps metadata. */
export type STRankingEntry = {
  rank: number;
  appId: string;
  name: string;
  publisherName: string;
  iconUrl: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Network alias (pour le filtre "Meta" qui regroupe 3 valeurs Sensor Tower)
// ─────────────────────────────────────────────────────────────────────────────

export type NetworkAlias = 'Meta' | 'TikTok' | 'Youtube';
export type AdTypeFilter = 'video' | 'image' | 'playable';

// ─────────────────────────────────────────────────────────────────────────────
// 6. Payload du dashboard market-scan (rendu partiel section par section)
// ─────────────────────────────────────────────────────────────────────────────

export type SectionPayload<T> = { ok: true; data: T } | { ok: false; error: string };

export type DashboardKpis = {
  /** Nombre d'advertisers actifs sur la catégorie + période (count des top_apps?role=advertisers). */
  activeAdvertisers: number;
  /** Somme des SoV des 3 premiers advertisers, en fraction (0..1). */
  top3SovCumulative: number;
  /** Nombre total de creatives uniques observés tous networks confondus. */
  uniqueCreatives: number;
};

export type DashboardTopGames = {
  entries: STRankingEntry[];
};

export type DashboardPublishersSlice = {
  publisherName: string;
  sovShare: number;
};

export type DashboardPublishers = {
  topSlices: DashboardPublishersSlice[];
  /** "Autres" agrégé : reste hors top N. */
  othersShare: number;
  /** Indice de Herfindahl-Hirschman (somme carrés × 10000). */
  hhi: number;
  hhiInterpretation: 'concentré' | 'modérément concentré' | 'fragmenté';
};

export type DashboardAd = {
  creativeId: string;
  adUnitId: string;
  network: string;
  /** Network normalisé pour l'UI : Meta / TikTok / Youtube. */
  networkAlias: NetworkAlias;
  adType: string;
  /** "video" | "image" | "playable" */
  format: AdTypeFilter | 'unknown';
  thumbUrl: string | null;
  creativeUrl: string | null;
  previewUrl: string | null;
  videoDurationSec: number | null;
  appId: string | null;
  gameName: string;
  publisherName: string;
  iconUrl: string | null;
  /** Nombre de creatives observés dans ce phashion group (proxy d'activité). */
  creativesCount: number;
};

export type DashboardAds = {
  ads: DashboardAd[];
  /** Total brut de creatives observés tous networks (avant top 3 trim). */
  totalObserved: number;
};

export type MarketScanResponse = {
  categoryId: number;
  categoryLabel: string;
  kpis: SectionPayload<DashboardKpis>;
  topGames: SectionPayload<DashboardTopGames>;
  publishers: SectionPayload<DashboardPublishers>;
  meta: {
    fetchedAt: string;
    endpointsHit: string[];
  };
};

export type MarketScanAdsResponse = {
  categoryId: number;
  ads: SectionPayload<DashboardAds>;
  meta: {
    fetchedAt: string;
    networksRequested: string[];
    adTypesRequested: string[];
  };
};
