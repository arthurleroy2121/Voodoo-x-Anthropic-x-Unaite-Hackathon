import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumberCompactFR, formatPercentFR } from '@/lib/formatters';
import type { DashboardKpis, SectionPayload } from '@/lib/sensortower/types';

export interface KpiStripProps {
  /** Payload du fetch principal (advertisers count + top3 SoV). */
  kpis: SectionPayload<DashboardKpis> | undefined;
  /** Compteur de creatives observés depuis l'endpoint /ads (peut arriver après). */
  creativesCount: number | undefined;
}

/**
 * KPI Strip — 3 cartes (advertisers actifs / SoV top 3 / creatives observés).
 *
 * - V1 : pas de delta vs période précédente (pas d'endpoint J-60→J-30 dans la doc validée).
 * - Loading : skeleton si `kpis === undefined`.
 * - Erreur : ErrorState compact si `kpis.ok === false`.
 * - Le compteur de creatives provient de `TopAdsSection` (refresh indépendant) — il
 *   apparaît avec un léger delay normal après le fetch principal.
 */
export function KpiStrip({ kpis, creativesCount }: KpiStripProps) {
  if (!kpis) {
    return <KpiSkeletons />;
  }

  if (!kpis.ok) {
    return (
      <ErrorState
        message={`KPIs indisponibles : ${kpis.error}`}
      />
    );
  }

  const { activeAdvertisers, top3SovCumulative } = kpis.data;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <KpiCard
        label="Advertisers actifs"
        value={formatNumberCompactFR(activeAdvertisers)}
        sublabel="Annonceurs détectés sur la catégorie • 30 derniers jours"
      />
      <KpiCard
        label="SoV cumulé top 3"
        value={formatPercentFR(top3SovCumulative)}
        sublabel="Part de voix combinée des 3 premiers annonceurs"
      />
      <KpiCard
        label="Creatives observés"
        value={
          creativesCount === undefined
            ? '—'
            : formatNumberCompactFR(creativesCount)
        }
        sublabel="Total tous networks (Meta, TikTok, YouTube)"
        loading={creativesCount === undefined}
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sublabel: string;
  loading?: boolean;
}

function KpiCard({ label, value, sublabel, loading = false }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <span className="font-mono text-3xl font-semibold text-[var(--color-charcoal)]">
          {value}
        </span>
      )}
      <span className="text-xs text-[var(--color-muted)]">{sublabel}</span>
    </Card>
  );
}

function KpiSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-3 w-40" />
        </Card>
      ))}
    </div>
  );
}
