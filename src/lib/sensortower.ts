export type Os = 'ios' | 'android' | 'unified';

export type SensorTowerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

interface ProxyParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

async function callProxy<T>(
  path: string,
  params: ProxyParams = {},
): Promise<SensorTowerResult<T>> {
  try {
    const res = await fetch('/api/sensortower', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, params }),
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload: unknown = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const error =
        isJson && payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : typeof payload === 'string'
            ? payload
            : `HTTP ${res.status}`;
      return { ok: false, error, status: res.status };
    }

    return { ok: true, data: payload as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- Top charts (category history) ----------

export interface TopChartEntry {
  app_id: string | number;
  rank: number;
  name?: string;
  publisher_name?: string;
  icon?: string;
}

export interface CategoryHistoryParams {
  os: Os;
  category: string; // e.g. '6014' (iOS Games), '7001' (Android Games)
  chart_type: 'topfreeapplications' | 'toppaidapplications' | 'topgrossingapplications';
  countries: string[]; // e.g. ['US','FR']
  date: string; // YYYY-MM-DD
  end_date?: string;
}

export function getCategoryHistory(p: CategoryHistoryParams) {
  const os = p.os === 'unified' ? 'ios' : p.os;
  return callProxy<unknown>(`${os}/category/category_history`, {
    category: p.category,
    chart_type: p.chart_type,
    countries: p.countries,
    date: p.date,
    end_date: p.end_date ?? p.date,
  });
}

// ---------- App metadata ----------

export interface AppMetadata {
  app_id: string | number;
  name: string;
  publisher_name?: string;
  publisher_id?: string;
  categories?: string[];
  release_date?: string;
  current_version_release_date?: string;
  rating?: number;
  rating_count?: number;
  icon?: string;
  description?: string;
}

export interface GetAppsParams {
  os: Os;
  app_ids: string[];
  country?: string;
}

export function getApps(p: GetAppsParams) {
  const os = p.os === 'unified' ? 'ios' : p.os;
  return callProxy<{ apps: AppMetadata[] }>(`${os}/apps`, {
    app_ids: p.app_ids,
    country: p.country ?? 'US',
  });
}

// ---------- Sales report estimates (downloads + revenue) ----------

export interface SalesReportRow {
  app_id: string | number;
  date: string;
  country: string;
  units?: number; // downloads
  revenue?: number; // micro-USD
}

export interface SalesEstimatesParams {
  os: Os;
  app_ids: string[];
  countries: string[];
  date_granularity: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
}

export function getSalesEstimates(p: SalesEstimatesParams) {
  const os = p.os === 'unified' ? 'ios' : p.os;
  return callProxy<SalesReportRow[]>(`${os}/sales_report_estimates`, {
    app_ids: p.app_ids,
    countries: p.countries,
    date_granularity: p.date_granularity,
    start_date: p.start_date,
    end_date: p.end_date,
  });
}

// ---------- Top publishers (used for benchmarking vs Voodoo competitors) ----------

export interface TopPublishersParams {
  os: Os;
  category: string;
  countries: string[];
  date: string;
  end_date?: string;
  measure?: 'units' | 'revenue';
}

export function getTopPublishers(p: TopPublishersParams) {
  const os = p.os === 'unified' ? 'ios' : p.os;
  return callProxy<unknown>(`${os}/top_and_trending/publishers`, {
    category: p.category,
    countries: p.countries,
    date: p.date,
    end_date: p.end_date ?? p.date,
    measure: p.measure ?? 'units',
  });
}

// ---------- Featured today (App Store editorial) ----------

export interface FeaturedTodayParams {
  countries: string[];
  start_date: string;
  end_date: string;
}

export function getFeaturedToday(p: FeaturedTodayParams) {
  return callProxy<unknown>('ios/featured/today/stories', {
    countries: p.countries,
    start_date: p.start_date,
    end_date: p.end_date,
  });
}
