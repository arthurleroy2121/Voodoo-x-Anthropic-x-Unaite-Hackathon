'use client';

// components/creative/SeedFramePicker.tsx
//
// Phase 9 v3 (Seedance 2.0) — collapsible 4×5 grid of preloaded reference
// frames for the active game. Always folded by default (matches Pattern
// Analysis ergonomics) — the user clicks "Show" to expand and pick a frame.
//
// Seedance 2.0 takes two frames: a starting one (`image`) and a finishing
// one (`lastFrameImage`). The same component handles both — pass `kind` to
// drive title/description copy and which slice of state to read/write.
// Selection is persisted per-project in the Zustand store via
// `setStartSeedImage` / `setEndSeedImage`.

import { Check, ImageOff } from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import { getSeedImages } from '@/data/seedImages';
import { useApp } from '@/lib/state';
import { cn } from '@/lib/utils';

export type SeedFrameKind = 'start' | 'end';

interface SeedFramePickerProps {
  kind: SeedFrameKind;
}

const COPY: Record<SeedFrameKind, {
  titlePrefix: string;
  description: string;
  emptyHint: string;
  metaPicked: (label: string) => string;
}> = {
  start: {
    titlePrefix: 'Choose a starting frame from',
    description:
      'Pick the reference image Seedance 2.0 will animate FROM. The 15-second clip starts on this frame and ends on the finishing frame below.',
    emptyHint: 'none picked yet',
    metaPicked: (label) => `${label} selected as start`,
  },
  end: {
    titlePrefix: 'Choose a finishing frame from',
    description:
      'Pick the reference image Seedance 2.0 will animate TO. The 15-second clip ends on this frame, completing the start → end transition.',
    emptyHint: 'none picked yet',
    metaPicked: (label) => `${label} selected as end`,
  },
};

export function SeedFramePicker({ kind }: SeedFramePickerProps) {
  const gameIdentity = useApp((s) => s.gameIdentity);
  const startSeedImageId = useApp((s) => s.startSeedImageId);
  const endSeedImageId = useApp((s) => s.endSeedImageId);
  const setStartSeedImage = useApp((s) => s.setStartSeedImage);
  const setEndSeedImage = useApp((s) => s.setEndSeedImage);

  const seeds = getSeedImages(gameIdentity?.gameId);
  const selectedId = kind === 'start' ? startSeedImageId : endSeedImageId;
  const setSelected = kind === 'start' ? setStartSeedImage : setEndSeedImage;
  const copy = COPY[kind];

  // Empty state — no game selected upstream.
  if (!gameIdentity) {
    return (
      <Card
        title={`${copy.titlePrefix.replace('from', '').trim()} reference image`}
        description="Pick the reference image Scenario will animate."
      >
        <p className="text-sm text-[var(--color-muted)]">
          Select a game in step 1 first — the seed image library is per-game.
        </p>
      </Card>
    );
  }

  // No seeds registered for this game id (manifest miss). Kept as a plain
  // (non-collapsible) Card because there's nothing useful to fold over.
  if (seeds.length === 0) {
    return (
      <Card
        title={`${copy.titlePrefix} ${gameIdentity.gameName}`}
        description={`No seed images registered for "${gameIdentity.gameName}".`}
      >
        <p className="text-sm text-[var(--color-muted)]">
          Add an entry for{' '}
          <code className="rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-xs">
            {gameIdentity.gameId}
          </code>{' '}
          in <code className="rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-xs">data/seedImages.ts</code>.
        </p>
      </Card>
    );
  }

  // Meta line shown next to the title in the collapsed header — at a glance
  // the user knows whether they've picked a frame yet without having to open.
  const selectedSeed = seeds.find((s) => s.id === selectedId);
  const meta = selectedSeed
    ? copy.metaPicked(selectedSeed.label)
    : `${seeds.length} images · ${copy.emptyHint}`;

  return (
    <CollapsibleCard
      title={`${copy.titlePrefix} ${gameIdentity.gameName}`}
      description={copy.description}
      meta={meta}
      defaultOpen={false}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {seeds.map((seed) => (
          <SeedThumb
            key={seed.id}
            id={seed.id}
            url={seed.url}
            label={seed.label}
            alt={seed.alt}
            selected={selectedId === seed.id}
            onSelect={() => setSelected(seed.id, seed.url)}
          />
        ))}
      </div>

      {selectedId && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Selected as <strong>{kind === 'start' ? 'start' : 'end'}</strong>:{' '}
          <code className="rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-[11px]">
            {selectedId}
          </code>
        </p>
      )}
    </CollapsibleCard>
  );
}

interface SeedThumbProps {
  id: string;
  url: string;
  label: string;
  alt: string;
  selected: boolean;
  onSelect: () => void;
}

function SeedThumb({ id, url, label, alt, selected, onSelect }: SeedThumbProps) {
  // Track 404s so we can swap in the "missing file" placeholder rather than
  // showing a broken image icon. The manifest is the source of truth, so the
  // tile must remain selectable even when the JPG hasn't been dropped yet.
  const [missing, setMissing] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${label} (${id})`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border-2 bg-[var(--color-bg)] text-left transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
        selected
          ? 'border-[var(--color-accent)] shadow-md ring-1 ring-[var(--color-accent)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/60 hover:shadow-sm',
      )}
    >
      <div className="relative aspect-[9/16] w-full bg-[var(--color-border)]/40">
        {missing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[var(--color-muted)]">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Missing
            </span>
          </div>
        ) : (
          // Plain <img> — we want a hard 404 → onError swap, which next/image
          // intercepts. The seed gallery is small (40 files max) so it's fine.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            loading="lazy"
            onError={() => setMissing(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {selected && (
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow"
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="text-[11px] font-medium text-[var(--color-charcoal)]">
          {label}
        </span>
      </div>
    </button>
  );
}
