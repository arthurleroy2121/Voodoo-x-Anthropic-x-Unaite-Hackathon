import 'server-only';

import type {
  STAppsResponse,
  STCreativesTopResponse,
  STRankingResponse,
  STTopAppsResponse,
} from './types';

/**
 * Wrappers typés autour des 4 endpoints Sensor Tower validés.
 *
 * Tous appellent la proxy interne `/api/sensortower/[...endpoint]` pour bénéficier :
 *  - de l'injection serveur du `auth_token`
 *  - du cache `next: { revalidate: 300 }`
 *  - du logging dev des headers de quota
 *
 * Ces fonctions sont uniquement importables depuis du code serveur (Server Components,
 * route handlers). `import 'server-only'` plante l'import en build client.
 *
 * Date helper : on calcule J-30 ici plutôt que de l'exposer comme param, pour
 * verrouiller la fenêtre "30 derniers jours" décidée en V1.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD pour aujourd'hui (UTC). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD pour J-N (UTC). */
function nDaysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Construit l'URL absolue vers la proxy interne. En server-side fetch on a
 * besoin d'une URL absolue ; on essaie successivement :
 *   1. `INTERNAL_API_BASE_URL` (override explicite)
 *   2. `VERCEL_URL` (auto-set sur Vercel)
 *   3. `http://localhost:3000` (fallback dev)
 */
function internalUrl(path: string): string {
  const explicit = process.env.INTERNAL_API_BASE_URL;
  if (explicit) return `${explicit.replace(/\/$/, '')}${path}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}${path}`;
  const port = process.env.PORT ?? '3000';
  return `http://localhost:${port}${path}`;
}

/**
 * Fetch helper qui appelle la proxy et retourne le JSON typé. Throw une Error
 * détaillée si la proxy retourne un envelope d'erreur ou un status != 200.
 */
async function fetchProxy<T>(
  endpointPath: string,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    search.append(k, String(v));
  }
  const url = internalUrl(
    `/api/sensortower/${endpointPath}${search.toString() ? `?${search.toString()}` : ''}`,
  );

  const res = await fetch(url, {
    method: 'GET',
    signal: signal ?? null,
    // Le cache est appliqué dans la proxy elle-même via `next.revalidate`,
    // donc côté wrapper on laisse le default (qui hit le cache de la proxy).
    next: { revalidate: 300 },
    headers: { accept: 'application/json' },
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(
      `Sensor Tower proxy ${endpointPath} → HTTP ${res.status}: ${rawText.slice(0, 400)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(
      `Sensor Tower proxy ${endpointPath} returned non-JSON body: ${(e as Error).message}`,
    );
  }

  // Une proxy en erreur retourne `{ ok: false, code, message }` — on detect et throw.
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'ok' in parsed &&
    (parsed as { ok: unknown }).ok === false
  ) {
    const message =
      'message' in parsed && typeof (parsed as { message: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : 'unknown proxy error';
    throw new Error(`Sensor Tower proxy ${endpointPath} error: ${message}`);
  }

  return parsed as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Top advertisers / publishers — GET /v1/{os}/ad_intel/top_apps
// ─────────────────────────────────────────────────────────────────────────────

export type TopAppsParams = {
  os?: 'ios' | 'android' | 'unified';
  category: number;
  country?: string;
  network?: string;
  limit?: number;
};

/**
 * Top publishers (par Share of Voice publicitaire) sur la catégorie.
 * Date par défaut = J-30. Network par défaut = "All Networks" (accepté par top_apps).
 */
export async function getTopPublishers(
  params: TopAppsParams,
  signal?: AbortSignal,
): Promise<STTopAppsResponse> {
  return fetchProxy<STTopAppsResponse>(
    `${params.os ?? 'unified'}/ad_intel/top_apps`,
    {
      role: 'publishers',
      date: nDaysAgoIso(30),
      period: 'month',
      category: params.category,
      country: params.country ?? 'US',
      network: params.network ?? 'All Networks',
      limit: params.limit ?? 10,
    },
    signal,
  );
}

/** Top advertisers (mêmes mécanismes que getTopPublishers). */
export async function getTopAdvertisers(
  params: TopAppsParams,
  signal?: AbortSignal,
): Promise<STTopAppsResponse> {
  return fetchProxy<STTopAppsResponse>(
    `${params.os ?? 'unified'}/ad_intel/top_apps`,
    {
      role: 'advertisers',
      date: nDaysAgoIso(30),
      period: 'month',
      category: params.category,
      country: params.country ?? 'US',
      network: params.network ?? 'All Networks',
      limit: params.limit ?? 50,
    },
    signal,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. iOS top grossing ranking — GET /v1/ios/ranking
// ─────────────────────────────────────────────────────────────────────────────

export type RankingParams = {
  category: number;
  country?: string;
  date?: string;
};

/**
 * Top grossing ranking iOS pour la catégorie. Retourne un tableau ordonné d'app_ids
 * (string). La metadata (nom, icon) doit être complétée via `getAppMetadataBatch`.
 */
export async function getTopGrossingRanking(
  params: RankingParams,
  signal?: AbortSignal,
): Promise<STRankingResponse> {
  return fetchProxy<STRankingResponse>(
    'ios/ranking',
    {
      category: params.category,
      chart_type: 'topgrossingapplications',
      country: params.country ?? 'US',
      date: params.date ?? todayIso(),
    },
    signal,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. iOS app metadata batch — GET /v1/ios/apps
// ─────────────────────────────────────────────────────────────────────────────

export type AppMetadataParams = {
  appIds: Array<string | number>;
  country?: string;
};

/**
 * Récupère metadata (nom, publisher, icon, …) pour une liste d'app IDs iOS.
 * `app_ids` est un comma-separated. Limite documentée : pas explicite, on chunk
 * raisonnablement à 100 par appel pour rester safe.
 */
export async function getAppMetadataBatch(
  params: AppMetadataParams,
  signal?: AbortSignal,
): Promise<STAppsResponse> {
  if (params.appIds.length === 0) {
    return { apps: [] };
  }
  const ids = params.appIds.map(String).join(',');
  return fetchProxy<STAppsResponse>(
    'ios/apps',
    {
      app_ids: ids,
      country: params.country ?? 'US',
    },
    signal,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Top creatives par network — GET /v1/{os}/ad_intel/creatives/top
// ─────────────────────────────────────────────────────────────────────────────

export type TopCreativesParams = {
  os?: 'ios' | 'android' | 'unified';
  category: number;
  country?: string;
  /** Network unique — `creatives/top` rejette `All Networks`. */
  network: string;
  /** Liste comma-separated d'ad types acceptés par l'API. */
  adTypes: string;
  limit?: number;
};

/**
 * Top creatives pour un network unique sur la catégorie. La doc indique que
 * `creatives/top` rejette `All Networks` ; pour cumuler plusieurs networks il faut
 * paralléliser l'appel et merger côté serveur (cf. `lib/sensortower/aggregate.ts`).
 */
export async function getTopCreativesByNetwork(
  params: TopCreativesParams,
  signal?: AbortSignal,
): Promise<STCreativesTopResponse> {
  return fetchProxy<STCreativesTopResponse>(
    `${params.os ?? 'unified'}/ad_intel/creatives/top`,
    {
      date: nDaysAgoIso(30),
      period: 'month',
      category: params.category,
      country: params.country ?? 'US',
      network: params.network,
      ad_types: params.adTypes,
      limit: params.limit ?? 30,
    },
    signal,
  );
}

// Helpers exportés pour les orchestrateurs.
export const dateHelpers = {
  todayIso,
  nDaysAgoIso,
};
