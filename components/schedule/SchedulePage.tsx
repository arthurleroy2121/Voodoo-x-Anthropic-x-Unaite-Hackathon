'use client';

import { useEffect, useState } from 'react';

import { useApp } from '@/lib/state';

import { PreviewNotice } from './PreviewNotice';
import { ScheduleTable } from './ScheduleTable';
import { ScheduledPipelineCard } from './ScheduledPipelineCard';

/**
 * Dedicated /schedule view. Reads from the same Zustand store used by the
 * sidebar popover — no parallel data path. We gate the table behind a small
 * `hydrated` flag because the store uses `skipHydration: true` (StoreHydrator
 * triggers rehydrate from a useEffect).
 */
export function SchedulePage() {
  // Lazy initial state: if the store already finished hydrating before this
  // component mounts, start in `true` directly so we never need to call
  // setState synchronously inside an effect (React 19 / `react-hooks/
  // set-state-in-effect` rule). On SSR `hasHydrated()` is false, which is the
  // desired pre-hydration value anyway.
  const [hydrated, setHydrated] = useState(() => useApp.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return undefined;
    // setState lives inside the subscription callback (i.e. driven by an
    // external system event), not in the effect body, so the lint rule is
    // satisfied.
    return useApp.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--color-charcoal)]">
          Schedule
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Manage recurring market intelligence runs for your projects.
        </p>
      </header>

      <PreviewNotice variant="banner" />

      <ScheduledPipelineCard variant="card" />

      <section aria-label="Scheduled projects">
        {hydrated ? (
          <ScheduleTable />
        ) : (
          <div
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center text-sm text-[var(--color-muted)]"
            aria-busy="true"
          >
            Loading schedules…
          </div>
        )}
      </section>
    </div>
  );
}
