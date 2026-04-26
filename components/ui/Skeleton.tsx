import { cn } from '@/lib/utils';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton primitive — bloc rectangulaire pulsé pour les états de loading.
 *
 * Tokens utilisés (zéro nouvelle couleur) :
 *  - `bg-[var(--color-border)]/60` : fond gris-clair semi-transparent
 *  - `animate-pulse` : animation Tailwind built-in
 *
 * Le shape (taille, rounded) est driven via `className` pour rester flexible.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-border)]/60',
        className,
      )}
      {...props}
    />
  );
}
