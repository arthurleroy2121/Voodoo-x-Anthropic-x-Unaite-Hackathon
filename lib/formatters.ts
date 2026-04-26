/**
 * Formatters for display values (dates, percentages, large numbers).
 *
 * Two locales are supported:
 *   - `en-US` (default helpers) — used by the existing landing / project tabs.
 *   - `fr-FR` (`*FR` helpers) — used by the Market Scan dashboard (Phase 4).
 *
 * Don't migrate the en-US helpers : keeping them stable preserves existing
 * snapshots and React component output.
 */

// ─────────────────────────────────────────────────────────────────────────────
// en-US helpers (existing — DO NOT CHANGE without migration plan)
// ─────────────────────────────────────────────────────────────────────────────

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// fr-FR helpers (Phase 4 — Market Scan dashboard)
// ─────────────────────────────────────────────────────────────────────────────

const NUMBER_COMPACT_FR = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const PERCENT_FR = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const REVENUE_FR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
  // Forcer le suffix M / Md plutôt que le code USD complet ne marche pas via Intl ;
  // on garde le format "12,4 M $US" qui est la convention fr-FR officielle pour USD.
});

const DATE_FR = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * Formate un montant USD en compact fr-FR (ex. `1234567` → "1,2 M $US",
 * `1234567890` → "1,2 Md $US").
 */
export function formatRevenueFR(usd: number): string {
  if (!Number.isFinite(usd)) return '—';
  return REVENUE_FR.format(usd);
}

/** Formate un nombre brut en compact fr-FR (ex. `12400000` → "12,4 M"). */
export function formatNumberCompactFR(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return NUMBER_COMPACT_FR.format(n);
}

/** Formate une fraction (0..1) en pourcentage fr-FR avec 1 décimale ("4,2 %"). */
export function formatPercentFR(fraction: number): string {
  if (!Number.isFinite(fraction)) return '—';
  return PERCENT_FR.format(fraction);
}

/** Formate une date ISO en `26 avr. 2026` (fr-FR). */
export function formatDateFR(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FR.format(d);
}

/** Formate une plage de dates en `12 mars 2026 → 11 avr. 2026`. */
export function formatDateRangeFR(startISO: string | Date, endISO: string | Date): string {
  return `${formatDateFR(startISO)} → ${formatDateFR(endISO)}`;
}
