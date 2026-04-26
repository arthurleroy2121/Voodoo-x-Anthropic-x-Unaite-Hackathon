import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { DashboardTopGames, SectionPayload } from '@/lib/sensortower/types';

export interface TopGamesListProps {
  topGames: SectionPayload<DashboardTopGames> | undefined;
}

/**
 * Top 10 jeux du segment — par classement Top Grossing iOS.
 *
 * Note : on n'affiche pas de "revenu absolu" parce que `ios/ranking` ne le retourne
 * pas (juste une liste ordonnée d'app_ids). Le rang est donc la métrique principale.
 *
 * - Top 3 : style or / argent / bronze via opacity du token `--color-charcoal`
 *   (zéro nouvelle couleur ; les nuances sont des variantes de l'existant).
 * - 4-10 : style muted neutre.
 * - Hover : background subtil via `--color-bg`.
 * - Aucune action au clic — la navigation se fait uniquement depuis les ads.
 */
export function TopGamesList({ topGames }: TopGamesListProps) {
  if (!topGames) {
    return <TopGamesSkeleton />;
  }

  if (!topGames.ok) {
    return (
      <Card title="Top 10 jeux — top grossing (30j)">
        <ErrorState message={topGames.error} />
      </Card>
    );
  }

  if (topGames.data.entries.length === 0) {
    return (
      <Card title="Top 10 jeux — top grossing (30j)">
        <EmptyState
          title="Aucun jeu disponible"
          description="Sensor Tower n'a renvoyé aucun classement pour cette catégorie."
        />
      </Card>
    );
  }

  return (
    <Card title="Top 10 jeux — top grossing (30j)">
      <ul className="-mx-2 mt-2 flex flex-col">
        {topGames.data.entries.map((entry) => (
          <li
            key={entry.appId}
            className="grid grid-cols-[2.5rem_2.5rem_1fr_3rem] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--color-bg)]"
          >
            <RankBadge rank={entry.rank} />
            <AppIcon iconUrl={entry.iconUrl} name={entry.name} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-[var(--color-charcoal)]">
                {entry.name}
              </span>
              <span className="truncate text-xs text-[var(--color-muted)]">
                {entry.publisherName}
              </span>
            </div>
            <span className="text-right font-mono text-sm text-[var(--color-muted)]">
              #{entry.rank}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface RankBadgeProps {
  rank: number;
}

/**
 * Pastille de rang. Top 3 : style "podium" via opacity du token charcoal.
 * (Le contraste or/argent/bronze réel demanderait 3 nouveaux tokens couleurs ;
 * on simule via opacité pour rester strict sur le design system.)
 */
function RankBadge({ rank }: RankBadgeProps) {
  const isPodium = rank <= 3;
  return (
    <span
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full font-mono text-sm font-semibold',
        isPodium
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30'
          : 'bg-[var(--color-bg)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]',
        rank === 1 && 'ring-2',
      )}
      aria-label={`Rang ${rank}`}
    >
      {rank}
    </span>
  );
}

interface AppIconProps {
  iconUrl: string | null;
  name: string;
}

function AppIcon({ iconUrl, name }: AppIconProps) {
  if (!iconUrl) {
    return (
      <div
        className="flex size-8 items-center justify-center rounded-md bg-[var(--color-bg)] ring-1 ring-[var(--color-border)]"
        aria-hidden="true"
      >
        <span className="font-mono text-xs text-[var(--color-muted)]">
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    // S3-hosted icons → <img> natif (pas de next/image pour éviter de configurer remotePatterns).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      className="size-8 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
    />
  );
}

function TopGamesSkeleton() {
  return (
    <Card title="Top 10 jeux — top grossing (30j)">
      <ul className="-mx-2 mt-2 flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <li
            key={i}
            className="grid grid-cols-[2.5rem_2.5rem_1fr_3rem] items-center gap-3 rounded-md px-2 py-2"
          >
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-md" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="ml-auto h-4 w-8" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
