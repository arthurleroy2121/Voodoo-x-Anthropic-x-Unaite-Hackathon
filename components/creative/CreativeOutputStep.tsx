'use client';

// components/creative/CreativeOutputStep.tsx
// Step 4 of the workflow — Creative Output.
//
// Pipeline visible to the user (Phase 9 v3 — Seedance 2.0):
//   1. Review the Scenario prompt drafted in step 3 (editable textarea).
//   2. Pick a STARTING frame from the per-game seed image library.
//   3. Pick a FINISHING frame from the per-game seed image library.
//   4. Click "Generate with Seedance 2.0" — server orchestrates a single 15s
//      img2video job (`model_bytedance-seedance-2-0`) at 720p with no audio
//      and aspectRatio="adaptive", returning the video URL.
//   5. The resulting 15-second ad is played via <ScenarioVideoPlayer />,
//      with a download link to the MP4.

import { Download, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { ScenarioVideoPlayer } from '@/components/creative/ScenarioVideoPlayer';
import { SeedFramePicker } from '@/components/creative/SeedFramePicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { GENERATING_15S_AD } from '@/lib/copy';
import { generateScenarioVideo } from '@/lib/scenarioVideo';
import { useApp } from '@/lib/state';

type Phase = 'idle' | 'generating' | 'done' | 'error';

export function CreativeOutputStep() {
  const draft = useApp((s) => s.scenarioPromptDraft);
  const setDraft = useApp((s) => s.setScenarioPromptDraft);
  const setStep = useApp((s) => s.setStep);
  const gameIdentity = useApp((s) => s.gameIdentity);
  const startSeedImageId = useApp((s) => s.startSeedImageId);
  const startSeedImageUrl = useApp((s) => s.startSeedImageUrl);
  const endSeedImageId = useApp((s) => s.endSeedImageId);
  const endSeedImageUrl = useApp((s) => s.endSeedImageUrl);
  const creativeOutput = useApp((s) => s.creativeOutput);
  const setCreativeOutput = useApp((s) => s.setCreativeOutput);

  const [phase, setPhase] = useState<Phase>(() =>
    creativeOutput?.videoUrl ? 'done' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Empty state — no prompt yet.
  if (!draft) {
    return (
      <Card
        title="4. Creative Output"
        description="Generate a 15-second vertical ad with Seedance 2.0 from your Scenario prompt."
      >
        <p className="text-sm text-[var(--color-muted)]">
          No Scenario prompt yet. Head back to the Pattern Analysis tab,
          generate a Scenario brief and send it here.
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => setStep('patterns')}>
            ← Back to Pattern Analysis
          </Button>
        </div>
      </Card>
    );
  }

  const hasStart = Boolean(startSeedImageId && startSeedImageUrl);
  const hasEnd = Boolean(endSeedImageId && endSeedImageUrl);

  const canGenerate =
    hasStart &&
    hasEnd &&
    Boolean(gameIdentity?.gameId) &&
    draft.trim().length >= 10 &&
    phase !== 'generating';

  async function runGeneration() {
    if (
      !canGenerate ||
      !startSeedImageUrl ||
      !endSeedImageUrl ||
      !gameIdentity?.gameId ||
      !draft
    ) {
      return;
    }

    setErrorMessage(null);
    setPhase('generating');

    // Mark the generation as in-flight in the persisted store. We snapshot
    // the start+end pair here so a refresh during generation still shows
    // which frames were used (even if the user picks different ones later).
    setCreativeOutput({
      ...creativeOutput,
      ...(startSeedImageId !== undefined ? { startSeedImageId } : {}),
      ...(startSeedImageUrl !== undefined ? { startSeedImageUrl } : {}),
      ...(endSeedImageId !== undefined ? { endSeedImageId } : {}),
      ...(endSeedImageUrl !== undefined ? { endSeedImageUrl } : {}),
      status: 'generating',
    });

    try {
      const data = await generateScenarioVideo({
        prompt: draft,
        startImageUrl: startSeedImageUrl,
        endImageUrl: endSeedImageUrl,
        gameId: gameIdentity.gameId,
      });

      setCreativeOutput({
        ...creativeOutput,
        ...(startSeedImageId !== undefined ? { startSeedImageId } : {}),
        ...(startSeedImageUrl !== undefined ? { startSeedImageUrl } : {}),
        ...(endSeedImageId !== undefined ? { endSeedImageId } : {}),
        ...(endSeedImageUrl !== undefined ? { endSeedImageUrl } : {}),
        videoUrl: data.videoUrl,
        scenarioJobId: data.jobId,
        totalDurationSec: 15,
        status: 'complete',
      });
      setPhase('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMessage(msg);
      setPhase('error');
      setCreativeOutput({
        ...creativeOutput,
        status: 'error',
      });
    }
  }

  const isBusy = phase === 'generating';

  // Friendly inline hint depending on which frames are still missing.
  let frameHint: string | null = null;
  if (!hasStart && !hasEnd) {
    frameHint = 'Pick a starting AND a finishing frame above to enable generation.';
  } else if (!hasStart) {
    frameHint = 'Pick a starting frame above to enable generation.';
  } else if (!hasEnd) {
    frameHint = 'Pick a finishing frame above to enable generation.';
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="4. Creative Output"
        description="Review your prompt, pick a starting and a finishing frame, then generate the 15-second ad with Seedance 2.0."
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Your Scenario Prompt
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isBusy}
            className="min-h-[280px] resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 font-mono text-xs leading-relaxed text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60"
          />
        </label>
      </Card>

      <SeedFramePicker kind="start" />
      <SeedFramePicker kind="end" />

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              type="button"
              onClick={runGeneration}
              disabled={!canGenerate}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {phase === 'done'
                ? 'Re-generate with Seedance 2.0'
                : 'Generate with Seedance 2.0'}
            </Button>

            {frameHint && (
              <p className="text-xs text-[var(--color-muted)]">{frameHint}</p>
            )}
            {phase === 'done' && (
              <p className="text-xs italic text-[var(--color-muted)]">
                Edit the prompt or pick different frames, then re-generate.
              </p>
            )}
          </div>

          {isBusy && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <LoadingState text={GENERATING_15S_AD} />
              <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                Seedance 2.0 generates 15s at 720p in a single render —
                typically 2-4 minutes. Please keep this tab open.
              </p>
            </div>
          )}

          {phase === 'error' && errorMessage && (
            <ErrorState message={errorMessage} onRetry={runGeneration} />
          )}
        </div>
      </Card>

      {phase === 'done' && creativeOutput?.videoUrl && (
        <Card
          title="Your 15-second creative"
          description="Generated by Scenario (Seedance 2.0) · 720p · adaptive aspect ratio · no audio."
        >
          <ScenarioVideoPlayer
            videoUrl={creativeOutput.videoUrl}
            {...(creativeOutput.startSeedImageUrl
              ? { posterUrl: creativeOutput.startSeedImageUrl }
              : {})}
          />

          <div className="mt-5 grid gap-2 text-xs sm:max-w-sm">
            <a
              href={creativeOutput.videoUrl}
              target="_blank"
              rel="noreferrer noopener"
              download
              className="inline-flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-accent)]/60"
            >
              <span className="font-medium">Download video (15s)</span>
              <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
                <Download className="size-3.5" aria-hidden="true" />
                MP4
              </span>
            </a>
          </div>

          {creativeOutput.scenarioJobId && (
            <p className="mt-4 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Scenario job ID · {creativeOutput.scenarioJobId}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
