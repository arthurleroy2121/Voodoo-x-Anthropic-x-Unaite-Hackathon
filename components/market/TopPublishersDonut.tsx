import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPercentFR } from '@/lib/formatters';
import type {
  DashboardPublishers,
  DashboardPublishersSlice,
  SectionPayload,
} from '@/lib/sensortower/types';

export interface TopPublishersDonutProps {
  publishers: SectionPayload<DashboardPublishers> | undefined;
}

/**
 * Donut chart SVG inline (pas de lib chart externe) + légende verticale + HHI au centre.
 *
 * Palette : 7 nuances de l'accent token via opacity Tailwind, + muted pour "Autres".
 * Aucune nouvelle couleur n'est introduite — seules des opacités du token existant.
 */
const SLICE_OPACITIES = [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.22] as const;

export function TopPublishersDonut({ publishers }: TopPublishersDonutProps) {
  if (!publishers) {
    return <DonutSkeleton />;
  }

  if (!publishers.ok) {
    return (
      <Card title="Concentration éditeurs">
        <ErrorState message={publishers.error} />
      </Card>
    );
  }

  const { topSlices, othersShare, hhi, hhiInterpretation } = publishers.data;

  if (topSlices.length === 0) {
    return (
      <Card title="Concentration éditeurs">
        <EmptyState
          title="Pas de données éditeur"
          description="Sensor Tower n'a renvoyé aucun publisher pour cette catégorie."
        />
      </Card>
    );
  }

  // Compose les segments du donut (top + Autres si > 0).
  const segments = topSlices.map((slice, i) => ({
    label: slice.publisherName,
    share: slice.sovShare,
    opacity: SLICE_OPACITIES[Math.min(i, SLICE_OPACITIES.length - 1)] ?? 0.2,
    isOthers: false,
  }));
  if (othersShare > 0.001) {
    segments.push({
      label: 'Autres',
      share: othersShare,
      opacity: 1,
      isOthers: true,
    });
  }

  return (
    <Card title="Concentration éditeurs">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <DonutSvg segments={segments} hhi={hhi} />
        <Legend segments={segments} />
      </div>
      <div className="mt-4 flex flex-col gap-1 border-t border-[var(--color-border)] pt-4">
        <p className="text-sm text-[var(--color-charcoal)]">
          Marché <span className="font-semibold">{hhiInterpretation}</span>
          <span className="ml-2 text-[var(--color-muted)]">
            (HHI {hhi.toLocaleString('fr-FR')})
          </span>
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          Indice approximatif basé sur le top 10 des éditeurs visibles. HHI &gt; 2500 :
          marché concentré ; 1500-2500 : modérément concentré ; &lt; 1500 : fragmenté.
        </p>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Donut SVG
// ─────────────────────────────────────────────────────────────────────────────

interface Segment {
  label: string;
  share: number;
  opacity: number;
  isOthers: boolean;
}

interface DonutSvgProps {
  segments: Segment[];
  hhi: number;
}

const SIZE = 168;
const RADIUS = 68;
const STROKE = 22;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function DonutSvg({ segments, hhi }: DonutSvgProps) {
  // Compute cumulative offsets up-front so the JSX render closure is purely
  // declarative (no mid-render mutation — Next 16 / React 19 react-hooks/immutability).
  const renderedSegments = segments.reduce<
    Array<Segment & { dash: number; gap: number; offset: number }>
  >((acc, seg) => {
    const prev = acc.at(-1);
    const cumulativeBefore = prev ? prev.offset / -CIRCUMFERENCE + prev.share : 0;
    const dash = seg.share * CIRCUMFERENCE;
    const gap = CIRCUMFERENCE - dash;
    const offset = -cumulativeBefore * CIRCUMFERENCE;
    acc.push({ ...seg, dash, gap, offset });
    return acc;
  }, []);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Répartition des éditeurs"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />
        {renderedSegments.map((seg, i) => {
          // Couleur : accent au plein, muted pour "Autres".
          const stroke = seg.isOthers ? 'var(--color-muted)' : 'var(--color-accent)';
          return (
            <circle
              key={`${seg.label}-${i}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={stroke}
              strokeOpacity={seg.opacity}
              strokeWidth={STROKE}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={seg.offset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-semibold text-[var(--color-charcoal)]">
          {hhi.toLocaleString('fr-FR')}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          HHI
        </span>
      </div>
    </div>
  );
}

interface LegendProps {
  segments: Segment[];
}

function Legend({ segments }: LegendProps) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-1.5 self-stretch">
      {segments.map((seg, i) => (
        <li
          key={`${seg.label}-${i}`}
          className="flex items-center gap-2"
          title={seg.label}
        >
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{
              backgroundColor: seg.isOthers
                ? 'var(--color-muted)'
                : 'var(--color-accent)',
              opacity: seg.opacity,
            }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-charcoal)]">
            {seg.label}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-[var(--color-muted)]">
            {formatPercentFR(seg.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function DonutSkeleton() {
  return (
    <Card title="Concentration éditeurs">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Skeleton className="size-[168px] shrink-0 rounded-full" />
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5 self-stretch">
          {Array.from({ length: 7 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-sm" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-8" />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// Re-export type for callers that want to pass slices around.
export type { DashboardPublishersSlice };
