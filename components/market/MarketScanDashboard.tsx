'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useApp } from '@/lib/state';
import { formatDateFR } from '@/lib/formatters';
import {
  getCategoryLabel,
  resolveCategoryId,
} from '@/lib/sensortower/categories';
import type { MarketScanResponse } from '@/lib/sensortower/types';

import { DashboardHeader } from './DashboardHeader';
import { KpiStrip } from './KpiStrip';
import { TopAdsSection } from './TopAdsSection';
import { TopGamesList } from './TopGamesList';
import { TopPublishersDonut } from './TopPublishersDonut';

/**
 * Racine du dashboard market scan — Client Component.
 *
 * Comportement :
 *   1. Lit `gameIdentity.category` depuis Zustand (string libre Puzzle/Battle).
 *   2. Resolve via `resolveCategoryId` → iOS category ID numérique.
 *   3. Si non résolvable → EmptyState explicite.
 *   4. Sinon, fetch l'orchestrateur principal au mount (KPIs + games + publishers).
 *   5. La section ads gère son propre fetch via `TopAdsSection` (re-fetch indépendant
 *      à chaque toggle de filtre).
 *   6. Notifie le KpiStrip du `creativesCount` retourné par l'endpoint /ads.
 *
 * Hydration-safe : on lit Zustand uniquement après mount (le `StoreHydrator`
 * mounted à la racine du layout assure que le store est rehydraté avant le
 * premier render des Client Components).
 */
export function MarketScanDashboard() {
  const category = useApp((s) => s.gameIdentity?.category);
  const [refetchKey, setRefetchKey] = useState(0);

  const categoryId = resolveCategoryId(category);

  // Aucune catégorie sélectionnée OU non mappée.
  if (!categoryId) {
    return (
      <EmptyState
        title="Catégorie non disponible"
        description={
          category
            ? `La catégorie « ${category} » n'est pas encore mappée vers un identifiant Sensor Tower. Sélectionne un jeu dans l'onglet Game Identity.`
            : "Sélectionne un jeu dans l'onglet Game Identity pour lancer une étude de marché."
        }
      />
    );
  }

  return (
    <DashboardContent
      key={`${categoryId}-${refetchKey}`}
      categoryId={categoryId}
      onRetry={() => setRefetchKey((k) => k + 1)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardContent — fait le fetch et orchestre les sections
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardContentProps {
  categoryId: number;
  onRetry: () => void;
}

function DashboardContent({ categoryId, onRetry }: DashboardContentProps) {
  const [payload, setPayload] = useState<MarketScanResponse | undefined>(undefined);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [creativesCount, setCreativesCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/dashboard/market-scan?categoryId=${categoryId}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as MarketScanResponse;
        if (!cancelled) {
          setPayload(json);
          setGlobalError(null);
        }
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        if (!cancelled) {
          setGlobalError(e instanceof Error ? e.message : 'Erreur de chargement');
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [categoryId]);

  // Erreur globale (catastrophe : la route orchestrateur elle-même a fail)
  if (globalError) {
    return (
      <div className="flex flex-col gap-4">
        <DashboardHeader categoryLabel={getCategoryLabel(categoryId)} />
        <ErrorState
          message={`Le dashboard n'a pas pu être chargé : ${globalError}`}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // Le payload arrive en un seul shot (l'orchestrateur fait Promise.allSettled
  // server-side et retourne tout d'un coup). Pendant le wait, chaque section
  // affiche son propre Skeleton via `undefined`.

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader
        categoryLabel={payload?.categoryLabel ?? getCategoryLabel(categoryId)}
      />

      {/* KPI Strip — 3 cartes */}
      <KpiStrip kpis={payload?.kpis} creativesCount={creativesCount} />

      {/* Grid 40/60 — Top 10 jeux (gauche, compact) + Donut publishers (droite, expansif).
          On donne plus de place au donut pour que la légende affiche les noms d'éditeurs en entier. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <TopGamesList topGames={payload?.topGames} />
        </div>
        <div className="md:col-span-3">
          <TopPublishersDonut publishers={payload?.publishers} />
        </div>
      </div>

      {/* Section Ads — full width */}
      <TopAdsSection
        categoryId={categoryId}
        onCreativesCount={setCreativesCount}
      />

      {/* Footer */}
      {payload && <DashboardFooter payload={payload} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer — timestamp + chips endpoints touchés
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardFooterProps {
  payload: MarketScanResponse;
}

function DashboardFooter({ payload }: DashboardFooterProps) {
  return (
    <footer className="mt-2 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)]">
      <p>
        Dernière mise à jour : {formatDateFR(payload.meta.fetchedAt)} •{' '}
        <span className="font-mono">
          {new Date(payload.meta.fetchedAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>{' '}
        • cache 5 min
      </p>
      <div className="flex flex-wrap gap-2">
        {payload.meta.endpointsHit.map((endpoint) => (
          <Badge key={endpoint} variant="neutral" className="font-mono text-[10px]">
            {endpoint}
          </Badge>
        ))}
        <Badge variant="neutral" className="font-mono text-[10px]">
          unified/ad_intel/creatives/top (× networks)
        </Badge>
      </div>
    </footer>
  );
}
