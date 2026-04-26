import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  buildAppMetaIndex,
  expandNetworkAlias,
  mergeCreativesAcrossNetworks,
} from '@/lib/sensortower/aggregate';
import {
  getAppMetadataBatch,
  getTopCreativesByNetwork,
} from '@/lib/sensortower/client';
import type {
  AdTypeFilter,
  DashboardAds,
  MarketScanAdsResponse,
  NetworkAlias,
  SectionPayload,
  STAdUnit,
  STCreativesTopResponse,
} from '@/lib/sensortower/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const KNOWN_NETWORK_ALIASES: NetworkAlias[] = ['Meta', 'TikTok', 'Youtube'];
const KNOWN_AD_TYPES: AdTypeFilter[] = ['video', 'image', 'playable'];

/**
 * Map du filtre UI ad_type → comma-separated values acceptées par Sensor Tower.
 * Source : `Doc Sensor TOWER/sensor-tower.md` §9.4.
 */
const AD_TYPE_FILTER_TO_ST: Record<AdTypeFilter, string[]> = {
  video: ['video', 'video-rewarded', 'video-interstitial', 'video-other'],
  image: ['image', 'image-banner', 'image-interstitial', 'image-other', 'banner', 'full_screen'],
  playable: [
    'playable',
    'interactive-playable',
    'interactive-playable-rewarded',
    'interactive-playable-other',
  ],
};

/**
 * Endpoint dédié aux top 3 ads. Séparé de l'orchestrateur principal pour permettre
 * un re-fetch léger quand l'utilisateur ne change que les filtres ads, sans
 * relancer KPIs / ranking / publishers.
 *
 * Query params :
 *   - `categoryId` (number, requis)
 *   - `networks` (csv de NetworkAlias = Meta|TikTok|Youtube ; default : tous)
 *   - `adTypes` (csv de AdTypeFilter = video|image|playable ; default : tous)
 *
 * Stratégie :
 *   1. Expand chaque NetworkAlias coché en noms ST réels (Meta → 3 networks).
 *   2. Compose le `ad_types` ST depuis l'union des AdTypeFilter cochés.
 *   3. Lance `creatives/top` en parallèle, 1 call par network ST (creatives/top rejette `All Networks`).
 *   4. Récupère metadata des advertisers (1 batch ios/apps).
 *   5. Merge cross-network → top 3 round-robin.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const categoryParam = params.get('categoryId');
  const categoryId = categoryParam ? Number.parseInt(categoryParam, 10) : NaN;
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return NextResponse.json(
      { error: 'Invalid or missing `categoryId` query param.' },
      { status: 422 },
    );
  }

  // Parse filters with safe defaults (= tous cochés).
  const networksRaw = params.get('networks');
  const adTypesRaw = params.get('adTypes');

  const networksRequested = parseAliasList<NetworkAlias>(
    networksRaw,
    KNOWN_NETWORK_ALIASES as readonly NetworkAlias[],
  );
  const adTypesRequested = parseAliasList<AdTypeFilter>(
    adTypesRaw,
    KNOWN_AD_TYPES as readonly AdTypeFilter[],
  );

  // Expand to actual Sensor Tower network names.
  const stNetworks = networksRequested.flatMap((alias) => expandNetworkAlias(alias));
  // Compose ad_types CSV for Sensor Tower (intersected with the user's filter).
  const stAdTypes = adTypesRequested.flatMap((t) => AD_TYPE_FILTER_TO_ST[t]).join(',');

  // ─── Empty filter case ──────────────────────────────────────────────────
  if (stNetworks.length === 0 || stAdTypes.length === 0) {
    const payload: MarketScanAdsResponse = {
      categoryId,
      ads: { ok: true, data: { ads: [], totalObserved: 0 } },
      meta: {
        fetchedAt: new Date().toISOString(),
        networksRequested,
        adTypesRequested,
      },
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // ─── Parallel fetch creatives/top per network ───────────────────────────
  const fetches = await Promise.allSettled(
    stNetworks.map((networkName) =>
      getTopCreativesByNetwork({
        category: categoryId,
        country: 'US',
        network: networkName,
        adTypes: stAdTypes,
        limit: 30,
      }).then(
        (resp): { network: string; resp: STCreativesTopResponse } => ({
          network: networkName,
          resp,
        }),
      ),
    ),
  );

  // Accumulate successful slots ; per-network errors are collapsed silently into
  // "less ads" but a global error is only declared if EVERY network failed.
  const successfulSlots: Array<{ network: string; adUnits: STAdUnit[] }> = [];
  const errorMessages: string[] = [];
  for (const f of fetches) {
    if (f.status === 'fulfilled') {
      successfulSlots.push({
        network: f.value.network,
        adUnits: f.value.resp.ad_units ?? [],
      });
    } else {
      errorMessages.push(
        f.reason instanceof Error ? f.reason.message : String(f.reason),
      );
    }
  }

  // ─── Total failure case ─────────────────────────────────────────────────
  if (successfulSlots.length === 0) {
    const ads: SectionPayload<DashboardAds> = {
      ok: false,
      error: errorMessages[0] ?? 'Échec du chargement des ads',
    };
    const payload: MarketScanAdsResponse = {
      categoryId,
      ads,
      meta: {
        fetchedAt: new Date().toISOString(),
        networksRequested,
        adTypesRequested,
      },
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // ─── Collect advertiser app_ids for metadata batch ──────────────────────
  const appIds = new Set<string>();
  for (const slot of successfulSlots) {
    for (const adUnit of slot.adUnits) {
      const id = adUnit.app_id ?? adUnit.app_info?.app_id;
      if (id != null) appIds.add(String(id));
    }
  }

  // Single metadata batch call. If it fails we still merge with empty meta.
  let appMetaIndex: ReturnType<typeof buildAppMetaIndex> = new Map();
  if (appIds.size > 0) {
    try {
      const meta = await getAppMetadataBatch({ appIds: [...appIds] });
      appMetaIndex = buildAppMetaIndex(meta.apps ?? []);
    } catch {
      // Non-fatal — UI shows "App <id>" as a fallback name.
    }
  }

  // ─── Merge round-robin → top 3 ──────────────────────────────────────────
  const merged = mergeCreativesAcrossNetworks(
    successfulSlots,
    { adTypeFilter: adTypesRequested },
    appMetaIndex,
    3,
  );

  const payload: MarketScanAdsResponse = {
    categoryId,
    ads: { ok: true, data: merged },
    meta: {
      fetchedAt: new Date().toISOString(),
      networksRequested,
      adTypesRequested,
    },
  };

  return NextResponse.json(payload, { status: 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseAliasList<T extends string>(
  raw: string | null,
  knownValues: readonly T[],
): T[] {
  if (!raw) return [...knownValues];
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [...knownValues];
  const knownSet = new Set<string>(knownValues);
  const filtered = parts.filter((p): p is T => knownSet.has(p));
  return filtered;
}
