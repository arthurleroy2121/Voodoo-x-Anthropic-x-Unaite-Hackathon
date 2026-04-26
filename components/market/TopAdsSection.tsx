'use client';

import { useEffect, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type {
  AdTypeFilter,
  DashboardAd,
  MarketScanAdsResponse,
  NetworkAlias,
} from '@/lib/sensortower/types';

import { AdCard } from './AdCard';

export interface TopAdsSectionProps {
  categoryId: number;
  /** Notification au parent du nb de creatives observés (pour le KPI strip). */
  onCreativesCount?: (count: number) => void;
}

const ALL_NETWORKS: NetworkAlias[] = ['Meta', 'TikTok', 'Youtube'];
const ALL_AD_TYPES: AdTypeFilter[] = ['video', 'image', 'playable'];

const NETWORK_LABEL: Record<NetworkAlias, string> = {
  Meta: 'Meta',
  TikTok: 'TikTok',
  Youtube: 'YouTube',
};

const AD_TYPE_LABEL: Record<AdTypeFilter, string> = {
  video: 'Vidéo',
  image: 'Image',
  playable: 'Playable',
};

/**
 * Section "Top 3 ads — input du générateur" (★ cœur hackathon).
 *
 * Charge les top creatives via `/api/dashboard/market-scan/ads`. Re-fetch à
 * chaque changement de filtre via `useTransition` (loading non-bloquant via opacity).
 *
 * Stratégie de fetch :
 *   - Au mount → fetch initial avec les 3 networks + 3 ad types cochés.
 *   - Au changement de filtre → re-fetch avec query string adaptée.
 *   - AbortController coupé à chaque fetch précédent pour éviter la race condition.
 */
export function TopAdsSection({ categoryId, onCreativesCount }: TopAdsSectionProps) {
  const [networks, setNetworks] = useState<NetworkAlias[]>(ALL_NETWORKS);
  const [adTypes, setAdTypes] = useState<AdTypeFilter[]>(ALL_AD_TYPES);
  const [ads, setAds] = useState<DashboardAd[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const params = new URLSearchParams();
      params.set('categoryId', String(categoryId));
      if (networks.length > 0) params.set('networks', networks.join(','));
      if (adTypes.length > 0) params.set('adTypes', adTypes.join(','));

      try {
        const res = await fetch(`/api/dashboard/market-scan/ads?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as MarketScanAdsResponse;
        if (json.ads.ok) {
          setAds(json.ads.data.ads);
          setError(null);
          onCreativesCount?.(json.ads.data.totalObserved);
        } else {
          setError(json.ads.error);
          setAds([]);
        }
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Échec du chargement');
        setAds([]);
      }
    }

    // Initial load — pas dans la transition (skeleton plein).
    if (ads === undefined) {
      load();
    } else {
      // Subsequent loads — wrapped in transition (opacity-50 visual feedback).
      startTransition(() => {
        load();
      });
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, networks.join(','), adTypes.join(',')]);

  function toggleNetwork(n: NetworkAlias) {
    setNetworks((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }

  function toggleAdType(t: AdTypeFilter) {
    setAdTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-[var(--color-charcoal)]">
            Top 3 ads — input du générateur
          </h3>
          <Badge variant="accent">★ Hackathon core</Badge>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          Les 3 ads les plus performantes par Share of Voice sur Meta + TikTok + YouTube.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 border-y border-[var(--color-border)] py-4">
        <FilterRow
          label="Networks"
          options={ALL_NETWORKS}
          selected={networks}
          onToggle={toggleNetwork}
          getLabel={(n) => NETWORK_LABEL[n]}
        />
        <FilterRow
          label="Type d'ad"
          options={ALL_AD_TYPES}
          selected={adTypes}
          onToggle={toggleAdType}
          getLabel={(t) => AD_TYPE_LABEL[t]}
        />
      </div>

      {/* Grid */}
      <AdsGrid
        ads={ads}
        error={error}
        isPending={isPending}
        hasFilters={networks.length > 0 && adTypes.length > 0}
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterRow
// ─────────────────────────────────────────────────────────────────────────────

interface FilterRowProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T[];
  onToggle: (option: T) => void;
  getLabel: (option: T) => string;
}

function FilterRow<T extends string>({
  label,
  options,
  selected,
  onToggle,
  getLabel,
}: FilterRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-bg)]',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-3.5 items-center justify-center rounded-sm border',
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)]',
                )}
              >
                {isSelected && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2 6.5 5 9.5 10 3" />
                  </svg>
                )}
              </span>
              {getLabel(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdsGrid
// ─────────────────────────────────────────────────────────────────────────────

interface AdsGridProps {
  ads: DashboardAd[] | undefined;
  error: string | null;
  isPending: boolean;
  hasFilters: boolean;
}

function AdsGrid({ ads, error, isPending, hasFilters }: AdsGridProps) {
  if (!hasFilters) {
    return (
      <EmptyState
        title="Aucun filtre actif"
        description="Coche au moins un network et un type d'ad pour voir les résultats."
      />
    );
  }

  if (ads === undefined) {
    return <AdsGridSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (ads.length === 0) {
    return (
      <EmptyState
        title="Pas de creatives"
        description="Aucune ad trouvée pour cette combinaison de filtres."
      />
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 transition-opacity md:grid-cols-3',
        isPending && 'opacity-50',
      )}
    >
      {ads.map((ad) => (
        <AdCard key={ad.creativeId} ad={ad} />
      ))}
    </div>
  );
}

function AdsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[9/16] w-full rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
