'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import type { ScenarioPromptBrief } from '@/lib/types';

interface UnifiedPromptViewProps {
  brief: ScenarioPromptBrief;
  /** Per-scene prompt overrides keyed by scene_number. */
  overrides: Record<number, string>;
  onOverrideChange: (sceneNumber: number, value: string) => void;
  /** The fully concatenated prompt (Global + scenes + meta), copied by the bottom CTA. */
  concatenated: string;
}

/**
 * One unified container that holds the entire generated prompt:
 *   - Header (chapeau): Global Style intro
 *   - Body: scenes flowing in sequence, separated by thin horizontal rules
 *   - Footer: tech meta strip + single full-width "Copier tout le prompt"
 *
 * No per-scene Copy buttons. No per-scene cards. The visual unit is the prompt
 * as a whole — see CHANTIER 2b.
 */
export function UnifiedPromptView({
  brief,
  overrides,
  onOverrideChange,
  concatenated,
}: UnifiedPromptViewProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      {/* Header / chapeau — Global Style */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-charcoal)]">
            Generated Prompt
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {brief.scenes.length} scene{brief.scenes.length > 1 ? 's' : ''}
          </span>
        </div>
        <SectionHeading className="mt-3">Global Style</SectionHeading>
        <p className="mt-1 font-mono text-xs leading-relaxed text-[var(--color-charcoal)]">
          {brief.global_style_prompt}
        </p>
      </header>

      {/* Scenes — light separators only */}
      <div className="divide-y divide-[var(--color-border)]">
        {brief.scenes.map((scene) => {
          const value =
            overrides[scene.scene_number] ?? scene.scenario_prompt;
          return (
            <article key={scene.scene_number} className="px-6 py-5">
              <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[var(--color-muted)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  Scene {scene.scene_number}
                </span>
                <span className="text-sm font-medium text-[var(--color-charcoal)]">
                  {scene.title}
                </span>
                <span className="text-xs">· {scene.duration}</span>
              </header>

              <div className="mb-2 grid gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)] md:grid-cols-2">
                <MetaRow label="Subject" value={scene.subject} />
                <MetaRow label="Action" value={scene.action} />
                <MetaRow label="Environment" value={scene.environment} />
                <MetaRow label="Camera" value={scene.camera} />
                <MetaRow label="Mood" value={scene.mood} />
              </div>

              <textarea
                value={value}
                onChange={(e) =>
                  onOverrideChange(scene.scene_number, e.target.value)
                }
                aria-label={`Scenario prompt for scene ${scene.scene_number}`}
                className="mt-1 min-h-[110px] w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 font-mono text-xs leading-relaxed text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              />
            </article>
          );
        })}
      </div>

      {/* Tech meta strip + minimal floating copy icon */}
      <div className="relative border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-4 pr-14">
        <div className="grid gap-3 text-xs text-[var(--color-charcoal)] md:grid-cols-2">
          <div>
            <SectionHeading>Audio</SectionHeading>
            <p className="mt-1">{brief.audio_direction}</p>
          </div>
          <div>
            <SectionHeading>Text overlays</SectionHeading>
            {brief.text_overlays.length === 0 ? (
              <p className="mt-1 text-[var(--color-muted)]">(none)</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {brief.text_overlays.map((t, idx) => (
                  <li key={`${t}-${idx}`} className="flex gap-1.5">
                    <span aria-hidden="true" className="text-[var(--color-accent)]">
                      •
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <CopyAllButton text={concatenated} />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}:
      </span>
      <span className="text-[var(--color-charcoal)]">{value}</span>
    </div>
  );
}

function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]',
        className,
      )}
    >
      {children}
    </h3>
  );
}

function CopyAllButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Fallback for insecure contexts (no clipboard API).
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const label = copied ? 'Copié' : 'Copier tout le prompt';
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className={cn(
        'absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-md border transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
        copied
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-charcoal)]/40 hover:text-[var(--color-charcoal)]',
      )}
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
