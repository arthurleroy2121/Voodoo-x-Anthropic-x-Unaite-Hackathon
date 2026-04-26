import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { getCategoryLabel } from '@/lib/sensortower/categories';
import {
  getAppMetadataBatch,
  getTopAdvertisers,
  getTopGrossingRanking,
} from '@/lib/sensortower/client';
import {
  aggregateAdvertisersByPublisher,
  computeHHI,
  interpretHHI,
  slicePublishers,
} from '@/lib/sensortower/aggregate';
import type {
  DashboardKpis,
  DashboardPublishers,
  DashboardTopGames,
  MarketScanResponse,
  SectionPayload,
  STAppMetadata,
  STRankingEntry,
  STRankingResponse,
  STTopAppsResponse,
} from '@/lib/sensortower/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ENDPOINTS_HIT = [
  'unified/ad_intel/top_apps?role=advertisers',
  'ios/ranking?chart_type=topgrossingapplications',
  'ios/apps (metadata batch)',
];

/**
 * Orchestrateur du dashboard market-scan.
 *
 * Lance les 3 fetches Sensor Tower en parallèle (`Promise.allSettled`) :
 *   1. Top advertisers (publicitaires actifs sur la catégorie)
 *   2. Top publishers (concentration éditeurs)
 *   3. Top grossing ranking (classement App Store du segment)
 *
 * Puis enrichit le ranking avec un appel batch `/ios/apps` pour récupérer
 * noms / icônes / publishers (le ranking brut ne renvoie que des app_ids).
 *
 * Chaque section est wrappée dans un `SectionPayload<T>` discriminé :
 * un fetch qui fail ne crash pas les autres — la section UI affiche son ErrorState
 * et le reste du dashboard reste rendu.
 */
export async function GET(req: NextRequest) {
  const categoryParam = req.nextUrl.searchParams.get('categoryId');
  const categoryId = categoryParam ? Number.parseInt(categoryParam, 10) : NaN;

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return NextResponse.json(
      { error: 'Invalid or missing `categoryId` query param.' },
      { status: 422 },
    );
  }

  // Lance les 2 fetches Sensor Tower en parallèle. allSettled pour ne pas bloquer.
  // NB : on n'appelle PAS top_apps?role=publishers car son param `network` n'accepte
  // que les ad-mediation networks (AdMob, Unity…), inadapté au cas "concentration éditeurs".
  // À la place, on agrège le résultat advertisers par publisher_id (cf. aggregate.ts §6).
  const [advertisersRes, rankingRes] = await Promise.allSettled([
    getTopAdvertisers({ category: categoryId, country: 'US', limit: 50 }),
    getTopGrossingRanking({ category: categoryId, country: 'US' }),
  ]);

  // ─── KPI section + Publishers section (tous deux dérivés de advertisers) ─
  let kpis: SectionPayload<DashboardKpis>;
  let publishers: SectionPayload<DashboardPublishers>;
  if (advertisersRes.status === 'fulfilled') {
    kpis = { ok: true, data: buildKpis(advertisersRes.value) };
    publishers = { ok: true, data: buildPublishersFromAdvertisers(advertisersRes.value) };
  } else {
    const errMsg =
      advertisersRes.reason instanceof Error
        ? advertisersRes.reason.message
        : 'Échec du chargement des advertisers';
    kpis = { ok: false, error: errMsg };
    publishers = { ok: false, error: errMsg };
  }

  // ─── Top games section (ranking + metadata join) ─────────────────────────
  let topGames: SectionPayload<DashboardTopGames>;
  if (rankingRes.status === 'fulfilled') {
    try {
      topGames = { ok: true, data: await buildTopGames(rankingRes.value) };
    } catch (e) {
      topGames = {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : 'Échec du chargement des metadata des jeux',
      };
    }
  } else {
    topGames = {
      ok: false,
      error:
        rankingRes.reason instanceof Error
          ? rankingRes.reason.message
          : 'Échec du chargement du classement',
    };
  }

  const payload: MarketScanResponse = {
    categoryId,
    categoryLabel: getCategoryLabel(categoryId),
    kpis,
    topGames,
    publishers,
    meta: {
      fetchedAt: new Date().toISOString(),
      endpointsHit: ENDPOINTS_HIT,
    },
  };

  return NextResponse.json(payload, { status: 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section builders
// ─────────────────────────────────────────────────────────────────────────────

function buildKpis(advertisers: STTopAppsResponse): DashboardKpis {
  const apps = advertisers.apps ?? [];
  const top3 = apps.slice(0, 3);
  // Sensor Tower returns `sov` en pourcentage 0..100, mais le contrat de
  // `formatPercentFR` attend une fraction 0..1 → on divise par 100.
  const top3SovPct = top3.reduce((acc, a) => acc + (a.sov ?? 0), 0);
  return {
    activeAdvertisers: apps.length,
    top3SovCumulative: top3SovPct / 100,
    // KPI3 (nb creatives uniques) est rempli par l'endpoint /ads — on met 0 ici
    // pour que la KPI strip puisse afficher les 2 premiers KPI dès le mount,
    // et l'UI client merge avec la valeur réelle quand l'ads endpoint répond.
    uniqueCreatives: 0,
  };
}

function buildPublishersFromAdvertisers(
  advertisers: STTopAppsResponse,
): DashboardPublishers {
  const aggregated = aggregateAdvertisersByPublisher(advertisers.apps ?? []);
  const { topSlices, othersShare } = slicePublishers(aggregated, 7);
  const hhi = computeHHI(aggregated, 10);
  return {
    topSlices,
    othersShare,
    hhi,
    hhiInterpretation: interpretHHI(hhi),
  };
}

async function buildTopGames(ranking: STRankingResponse): Promise<DashboardTopGames> {
  const ids = (ranking.ranking ?? []).slice(0, 10).map(String);
  if (ids.length === 0) {
    return { entries: [] };
  }

  // Enrichit avec metadata. Si ce call fail, on remonte l'erreur (catché en haut).
  const meta = await getAppMetadataBatch({ appIds: ids });
  const byId = new Map<string, STAppMetadata>();
  for (const app of meta.apps ?? []) {
    byId.set(String(app.app_id), app);
  }

  const entries: STRankingEntry[] = ids.map((appId, idx) => {
    const m = byId.get(appId);
    return {
      rank: idx + 1,
      appId,
      name: m?.name ?? `App ${appId}`,
      publisherName: m?.publisher_name ?? 'Éditeur inconnu',
      iconUrl: m?.icon_url ?? null,
    };
  });

  return { entries };
}
