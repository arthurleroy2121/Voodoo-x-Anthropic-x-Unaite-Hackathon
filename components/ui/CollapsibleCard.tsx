'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface CollapsibleCardProps {
  title: string;
  description?: string;
  /** Small badge/label rendered to the right of the title (e.g. an item count). */
  meta?: React.ReactNode;
  /** Whether the card is expanded on first render. Defaults to false. */
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Card with a clickable header that expands/collapses its content.
 * Used to keep the Pattern Analysis page ergonomic by hiding heavy sections
 * (Gemini analysis, top patterns, pattern mapping) behind a single click.
 */
export function CollapsibleCard({
  title,
  description,
  meta,
  defaultOpen = false,
  className,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center justify-between gap-4 rounded-xl px-6 py-4 text-left transition-colors',
          'hover:bg-[var(--color-surface-hover,rgba(0,0,0,0.02))]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[var(--color-charcoal)]">
              {title}
            </h2>
            {meta && (
              <span className="text-xs text-[var(--color-muted)]">{meta}</span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
          <span>{open ? 'Hide' : 'Show'}</span>
          <Chevron open={open} />
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] px-6 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('transition-transform duration-200', open && 'rotate-180')}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
