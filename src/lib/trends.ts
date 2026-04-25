import {
  getCategoryHistory,
  getSalesEstimates,
  getApps,
  type AppMetadata,
  type Os,
  type SalesReportRow,
  type SensorTowerResult,
} from './sensortower';

// iOS category 6014 = Games, 7003 = Casual Games (Apple).
// Android category 'GAME_CASUAL' on Google Play.
export const HYPER_CASUAL_CATEGORIES = {
  ios: '7003',
  android: 'GAME_CASUAL',
} as const;

export interface TrendCandidate {
  app_id: string;
  name: string;
  publisher: string;
  icon?: string;
  recent_downloads: number;
  baseline_downloads: number;
  momentum: number; // (recent / baseline) — 1.0 means flat, 2.0 means doubled
  score: number; // composite ranking score
}

export interface DetectTrendsParams {
  os: Extract<Os, 'ios' | 'android'>;
  countries?: string[];
  /** how many top-chart apps to evaluate (more = slower + more API calls) */
  topN?: number;
  /** today's date in YYYY-MM-DD; defaults to today UTC */
  today?: string;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(today: Date, n: number): Date {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function extractTopAppIds(payload: unknown, limit: number): string[] {
  if (!payload || typeof payload !== 'object') return [];

  const collect = (arr: unknown[]): string[] =>
    arr
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const r = row as Record<string, unknown>;
        const id = r.app_id ?? r.id;
        return id !== undefined && id !== null ? String(id) : null;
      })
      .filter((x): x is string => x !== null);

  const flat: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      flat.push(...collect(node));
      node.forEach(visit);
    } else if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };
  visit(payload);

  // dedupe, preserve order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of flat) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
      if (result.length >= limit) break;
    }
  }
  return result;
}

function sumDownloadsByApp(rows: SalesReportRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.app_id);
    out.set(key, (out.get(key) ?? 0) + (row.units ?? 0));
  }
  return out;
}

export interface DetectTrendsResult {
  ok: true;
  candidates: TrendCandidate[];
  evaluated: number;
}

export interface DetectTrendsError {
  ok: false;
  error: string;
}

export async function detectHyperCasualTrends(
  params: DetectTrendsParams,
): Promise<DetectTrendsResult | DetectTrendsError> {
  const { os, countries = ['US'], topN = 25 } = params;
  const today = params.today ? new Date(`${params.today}T00:00:00Z`) : new Date();

  const recentStart = daysAgo(today, 7);
  const recentEnd = daysAgo(today, 1);
  const baselineStart = daysAgo(today, 30);
  const baselineEnd = daysAgo(today, 8);

  // 1) Fetch top free chart of casual games yesterday
  const chart = await getCategoryHistory({
    os,
    category: HYPER_CASUAL_CATEGORIES[os],
    chart_type: 'topfreeapplications',
    countries,
    date: ymd(recentEnd),
  });
  if (!chart.ok) return { ok: false, error: `Top chart fetch failed: ${chart.error}` };

  const appIds = extractTopAppIds(chart.data, topN);
  if (appIds.length === 0) {
    return { ok: false, error: 'No app IDs returned from top chart' };
  }

  // 2) Fetch metadata + recent / baseline downloads in parallel
  const [metaRes, recentRes, baselineRes]: [
    SensorTowerResult<{ apps: AppMetadata[] }>,
    SensorTowerResult<SalesReportRow[]>,
    SensorTowerResult<SalesReportRow[]>,
  ] = await Promise.all([
    getApps({ os, app_ids: appIds, country: countries[0] }),
    getSalesEstimates({
      os,
      app_ids: appIds,
      countries,
      date_granularity: 'daily',
      start_date: ymd(recentStart),
      end_date: ymd(recentEnd),
    }),
    getSalesEstimates({
      os,
      app_ids: appIds,
      countries,
      date_granularity: 'daily',
      start_date: ymd(baselineStart),
      end_date: ymd(baselineEnd),
    }),
  ]);

  if (!metaRes.ok) return { ok: false, error: `Apps fetch failed: ${metaRes.error}` };
  if (!recentRes.ok) return { ok: false, error: `Recent sales fetch failed: ${recentRes.error}` };
  if (!baselineRes.ok)
    return { ok: false, error: `Baseline sales fetch failed: ${baselineRes.error}` };

  const metaById = new Map<string, AppMetadata>();
  for (const app of metaRes.data.apps ?? []) {
    metaById.set(String(app.app_id), app);
  }

  const recentMap = sumDownloadsByApp(recentRes.data);
  const baselineMap = sumDownloadsByApp(baselineRes.data);

  // 3) Build candidates with momentum score
  const candidates: TrendCandidate[] = appIds.map((id) => {
    const recent = recentMap.get(id) ?? 0;
    // baseline normalized to a 7-day window for fair comparison (baseline = 23 days)
    const baselineRaw = baselineMap.get(id) ?? 0;
    const baseline7 = baselineRaw * (7 / 23);
    const momentum = baseline7 > 0 ? recent / baseline7 : recent > 0 ? Infinity : 0;
    const meta = metaById.get(id);

    // composite score: log(recent) + momentum bonus, finite and monotone
    const finiteMomentum = Number.isFinite(momentum) ? momentum : 5;
    const score = Math.log10(1 + recent) * (1 + Math.min(finiteMomentum, 5));

    return {
      app_id: id,
      name: meta?.name ?? `app:${id}`,
      publisher: meta?.publisher_name ?? 'unknown',
      icon: meta?.icon,
      recent_downloads: Math.round(recent),
      baseline_downloads: Math.round(baseline7),
      momentum: Number.isFinite(momentum) ? Number(momentum.toFixed(2)) : -1,
      score: Number(score.toFixed(2)),
    };
  });

  candidates.sort((a, b) => b.score - a.score);

  return { ok: true, candidates, evaluated: appIds.length };
}
