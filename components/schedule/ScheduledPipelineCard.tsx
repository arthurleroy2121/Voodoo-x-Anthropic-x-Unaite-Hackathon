import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const PIPELINE_STEPS = [
  'Market Scan',
  'Gemini Pattern Analysis',
  'Scenario Creative Generation',
] as const;

export interface ScheduledPipelineCardProps {
  /** `inline` is the compact form used inside the popover. */
  variant?: 'inline' | 'card';
  className?: string;
}

/**
 * Visual representation of the future automated pipeline. Pure documentation —
 * nothing executes here. The exact wording in the longer copy below is taken
 * verbatim from the Schedule PRD (Section 4 — pipeline info card).
 */
export function ScheduledPipelineCard({
  variant = 'card',
  className,
}: ScheduledPipelineCardProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3',
          className,
        )}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Scheduled pipeline
        </p>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[var(--color-charcoal)]">
          {PIPELINE_STEPS.map((step, idx) => (
            <li key={step} className="inline-flex items-center gap-1.5">
              <span className="font-medium">{step}</span>
              {idx < PIPELINE_STEPS.length - 1 && (
                <ArrowRight
                  className="h-3 w-3 text-[var(--color-muted)]"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5',
        className,
      )}
      aria-label="Scheduled pipeline overview"
    >
      <p className="mb-3 text-sm leading-relaxed text-[var(--color-charcoal)]">
        When enabled in production, each scheduled project will automatically
        rerun:
      </p>
      <ol className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {PIPELINE_STEPS.map((step, idx) => (
          <li key={step} className="inline-flex items-center gap-2">
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 font-medium text-[var(--color-charcoal)]">
              {step}
            </span>
            {idx < PIPELINE_STEPS.length - 1 && (
              <ArrowRight
                className="h-4 w-4 text-[var(--color-muted)]"
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs leading-relaxed text-[var(--color-muted)]">
        For now, schedules are saved only as UI configuration. No automated run
        is triggered.
      </p>
    </section>
  );
}
