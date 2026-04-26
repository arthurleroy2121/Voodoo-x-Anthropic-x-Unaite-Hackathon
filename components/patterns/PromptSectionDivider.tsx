'use client';

import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { GENERATING_SCENARIO_PROMPT } from '@/lib/copy';
import { cn } from '@/lib/utils';

interface PromptSectionDividerProps {
  /** Whether the user has selected enough characteristics to proceed. */
  canGenerate: boolean;
  /** True while the scenario-prompt API call is in flight. */
  loading: boolean;
  /** True after the first successful generation — the button label flips. */
  hasBrief: boolean;
  onGenerate: () => void;
  /** Helper text shown beneath the button when `canGenerate === false`. */
  hint?: string | undefined;
}

/**
 * Strong visual separator between the Patterns section (above) and the
 * Prompt section (below). Hosts the big "Generate Scenario Prompt" CTA in
 * its center — that button is the visual hinge of step 3.
 */
export function PromptSectionDivider({
  canGenerate,
  loading,
  hasBrief,
  onGenerate,
  hint,
}: PromptSectionDividerProps) {
  return (
    <section
      className={cn(
        'relative my-2 flex flex-col items-center gap-4 overflow-hidden rounded-2xl',
        'border border-dashed border-[var(--color-accent)]/40',
        'bg-gradient-to-b from-[var(--color-accent)]/5 via-[var(--color-surface)] to-[var(--color-accent)]/5',
        'px-6 py-10',
      )}
      aria-label="Generate Scenario Prompt"
    >
      {/* Decorative top/bottom hairlines so the divider reads as a section break */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-60"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-60"
      />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        Step 3 · From characteristics to prompt
      </p>

      <Button
        type="button"
        size="lg"
        onClick={onGenerate}
        disabled={!canGenerate || loading}
        className="min-w-[260px] text-base"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {hasBrief ? 'Re-generate Scenario Prompt' : 'Generate Scenario Prompt'}
      </Button>

      {loading && (
        <div className="mt-2 w-full max-w-md">
          <LoadingState text={GENERATING_SCENARIO_PROMPT} />
        </div>
      )}

      {!loading && !canGenerate && hint && (
        <p className="text-xs text-[var(--color-muted)]">{hint}</p>
      )}
    </section>
  );
}
