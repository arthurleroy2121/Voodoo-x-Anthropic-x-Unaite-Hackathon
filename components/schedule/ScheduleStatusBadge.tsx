import { cn } from '@/lib/utils';

import type { ProjectSchedule } from '@/lib/types';

export interface ScheduleStatusBadgeProps {
  status: ProjectSchedule['status'];
  className?: string;
}

/**
 * Status pill matching the existing `Badge` aesthetic but with a positive-green
 * variant for `Active` (PRD: "Active = positive green, Paused = neutral grey").
 * We avoid re-using `<Badge variant="accent">` because the brand accent is
 * pink (#E91E63) — not the "positive" green the spec calls for.
 */
export function ScheduleStatusBadge({ status, className }: ScheduleStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'Active' && 'bg-emerald-100 text-emerald-700',
        status === 'Paused' && 'bg-[var(--color-border)] text-[var(--color-muted)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mr-1.5 h-1.5 w-1.5 rounded-full',
          status === 'Active' && 'bg-emerald-500',
          status === 'Paused' && 'bg-[var(--color-muted)]',
        )}
      />
      {status}
    </span>
  );
}
