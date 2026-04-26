'use client';

import { Badge } from '@/components/ui/Badge';
import type { GeminiAdAnalysis } from '@/lib/types';

interface GeminiAnalysisPanelProps {
  analysis: GeminiAdAnalysis;
}

export function GeminiAnalysisPanel({ analysis }: GeminiAnalysisPanelProps) {
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Video Summary" body={analysis.videoSummary} />
        <Section title="Opening Hook" body={analysis.openingHook} />
        <Section title="0–3s Hook" body={analysis.hook0To3s} />
        <Section title="CTA" body={analysis.cta} />
      </div>

      <div className="mt-6">
        <SectionHeading>Scene Flow</SectionHeading>
        <ol className="mt-3 space-y-2 border-l border-[var(--color-border)] pl-4">
          {analysis.sceneFlow.map((s, idx) => (
            <li key={`${s.timestamp}-${idx}`} className="flex flex-col gap-0.5">
              <span className="text-xs font-mono uppercase tracking-wide text-[var(--color-accent)]">
                {s.timestamp}
              </span>
              <span className="text-sm text-[var(--color-charcoal)]">
                {s.description}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <ListSection title="Visual Patterns" items={analysis.visualPatterns} />
        <ListSection title="Gameplay Mechanics" items={analysis.gameplayMechanics} />
        <ListSection title="Emotional Triggers" items={analysis.emotionalTriggers} />
        <ListSection
          title="Text Overlays"
          items={analysis.textOverlays.length ? analysis.textOverlays : ['(none)']}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Visual Style" body={analysis.visualStyle} />
        <Section title="Pacing" body={analysis.pacing} />
        <Section title="Why It Works" body={analysis.whyItWorks} />
        <Section
          title="Applicability to Selected Game"
          body={analysis.applicabilityToGame}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <SectionHeading>Confidence</SectionHeading>
        <Badge variant={analysis.confidence >= 70 ? 'accent' : 'neutral'}>
          {analysis.confidence}/100
        </Badge>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <SectionHeading>{title}</SectionHeading>
      <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
        {body}
      </p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <SectionHeading>{title}</SectionHeading>
      <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-charcoal)]">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--color-accent)]">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
      {children}
    </h3>
  );
}
