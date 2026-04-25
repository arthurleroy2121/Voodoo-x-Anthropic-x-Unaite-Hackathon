import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[--color-border] bg-[--color-surface] p-12 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-[--color-charcoal]">{title}</h3>
      {description && (
        <p className="text-sm text-[--color-muted]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
