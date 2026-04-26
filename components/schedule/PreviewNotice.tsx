import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Mandatory preview notice — text MUST stay verbatim per the Schedule PRD
 * (Section 2 & Section 4). Displayed both in the popover and in the dedicated
 * /schedule page so users always know automation isn't wired up yet.
 */
export const SCHEDULE_PREVIEW_NOTICE =
  'Scheduling is a preview feature. Automated runs are not enabled yet in this MVP.';

export interface PreviewNoticeProps {
  /** `compact` for the popover, `banner` for the full page. */
  variant?: 'compact' | 'banner';
  className?: string;
}

export function PreviewNotice({ variant = 'compact', className }: PreviewNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]',
        variant === 'compact' && 'px-3 py-2 text-xs text-[var(--color-muted)]',
        variant === 'banner' && 'px-4 py-3 text-sm text-[var(--color-charcoal)]',
        className,
      )}
    >
      <AlertCircle
        className={cn(
          'mt-0.5 shrink-0 text-[var(--color-accent)]',
          variant === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4',
        )}
        aria-hidden="true"
      />
      <p className="leading-snug">{SCHEDULE_PREVIEW_NOTICE}</p>
    </div>
  );
}
