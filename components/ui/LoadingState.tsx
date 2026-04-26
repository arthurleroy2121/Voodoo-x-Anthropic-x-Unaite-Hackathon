import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({ text = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 text-[var(--color-muted)]',
        className,
      )}
    >
      <Loader2 className="size-5 animate-spin text-[var(--color-accent)]" aria-hidden="true" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
