import { Badge } from '@/components/ui/Badge';

export interface DashboardHeaderProps {
  /** Libellé FR de la catégorie (ex. "Puzzle"). Résolu côté parent via `getCategoryLabel`. */
  categoryLabel: string;
}

/**
 * Header du dashboard market scan — H2 + 3 chips contextuels.
 * Tokens existants uniquement (Badge neutral, color-muted, color-charcoal).
 */
export function DashboardHeader({ categoryLabel }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-charcoal)] md:text-3xl">
        Étude de marché — <span className="text-[var(--color-accent)]">{categoryLabel}</span>
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{categoryLabel}</Badge>
        <Badge variant="neutral">30 derniers jours</Badge>
      </div>
    </header>
  );
}
