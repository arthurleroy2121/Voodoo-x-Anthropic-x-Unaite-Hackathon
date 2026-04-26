'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { extractAdCharacteristics } from '@/lib/characteristics';
import { ANALYZING_AD_WITH_GEMINI } from '@/lib/copy';
import { analyzeSelectedAdWithGemini } from '@/lib/gemini';
import { generateScenarioPrompt } from '@/lib/scenarioPrompt';
import { useApp } from '@/lib/state';
import type { AdCharacteristic } from '@/lib/types';

import { CharacteristicChecklist } from './CharacteristicChecklist';
import { GeminiAnalysisPanel } from './GeminiAnalysisPanel';
import { PromptSectionDivider } from './PromptSectionDivider';
import { ScenarioPromptGenerator } from './ScenarioPromptGenerator';
import { SelectedAdPreview } from './SelectedAdPreview';
import { TestAdUrlPanel } from './TestAdUrlPanel';

interface PatternAnalysisStepProps {
  onContinue?: () => void;
}

const EXTRACTING_CHARACTERISTICS =
  'Extracting characteristics from the analyzed ad...';

export function PatternAnalysisStep({ onContinue }: PatternAnalysisStepProps) {
  const selectedAd = useApp((s) => s.selectedAd);
  const gameIdentity = useApp((s) => s.gameIdentity);
  const geminiAnalysis = useApp((s) => s.geminiAnalysis);
  const adCharacteristics = useApp((s) => s.adCharacteristics);
  const selectedCharacteristicIds = useApp(
    (s) => s.selectedCharacteristicIds,
  );
  const brief = useApp((s) => s.scenarioPromptBrief);

  const setGeminiAnalysis = useApp((s) => s.setGeminiAnalysis);
  const setAdCharacteristics = useApp((s) => s.setAdCharacteristics);
  const setSelectedCharacteristicIds = useApp(
    (s) => s.setSelectedCharacteristicIds,
  );
  const setScenarioPromptBrief = useApp((s) => s.setScenarioPromptBrief);
  const setSelectedAd = useApp((s) => s.setSelectedAd);

  const [analyzeStatus, setAnalyzeStatus] = useState<
    'idle' | 'analyzing' | 'extracting' | 'error'
  >('idle');
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [promptStatus, setPromptStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [promptError, setPromptError] = useState<string | null>(null);

  const allowTestUrl = process.env.NEXT_PUBLIC_ALLOW_TEST_AD_URL === 'true';

  const checkedIds = selectedCharacteristicIds ?? [];
  const checkedCharacteristics: AdCharacteristic[] = (
    adCharacteristics ?? []
  ).filter((c) => checkedIds.includes(c.id));

  const canGeneratePrompt =
    Boolean(selectedAd && gameIdentity && geminiAnalysis) &&
    checkedCharacteristics.length > 0;

  const generateHint =
    !geminiAnalysis
      ? 'Run pattern analysis first.'
      : !adCharacteristics || adCharacteristics.length === 0
        ? 'Waiting for characteristics extraction.'
        : checkedCharacteristics.length === 0
          ? 'Pick at least one characteristic above.'
          : undefined;

  async function runAnalysis() {
    if (!selectedAd || !gameIdentity) return;
    setAnalyzeError(null);
    setAnalyzeStatus('analyzing');
    try {
      const analysis = await analyzeSelectedAdWithGemini(
        selectedAd,
        gameIdentity,
      );
      setGeminiAnalysis(analysis);

      // Reset downstream state — fresh analysis means stale characteristics +
      // brief don't apply anymore.
      setAdCharacteristics(undefined);
      setSelectedCharacteristicIds(undefined);
      setScenarioPromptBrief(undefined);

      setAnalyzeStatus('extracting');
      const characteristics = await extractAdCharacteristics(
        selectedAd,
        gameIdentity,
        analysis,
      );
      setAdCharacteristics(characteristics);
      setSelectedCharacteristicIds([]);
      setAnalyzeStatus('idle');
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : String(e));
      setAnalyzeStatus('error');
    }
  }

  async function runPromptGeneration() {
    if (
      !canGeneratePrompt ||
      !selectedAd ||
      !gameIdentity ||
      !geminiAnalysis
    ) {
      return;
    }
    setPromptError(null);
    setPromptStatus('loading');
    try {
      const result = await generateScenarioPrompt(
        selectedAd,
        gameIdentity,
        geminiAnalysis,
        checkedCharacteristics,
      );
      setScenarioPromptBrief(result);
      setPromptStatus('idle');
    } catch (e) {
      setPromptError(e instanceof Error ? e.message : String(e));
      setPromptStatus('error');
    }
  }

  function toggleCharacteristic(id: string, next: boolean) {
    const current = selectedCharacteristicIds ?? [];
    const nextIds = next
      ? Array.from(new Set([...current, id]))
      : current.filter((x) => x !== id);
    setSelectedCharacteristicIds(nextIds);
  }

  // Guard: game identity must exist (came from step 1).
  if (!gameIdentity) {
    return (
      <Card title="3. Pattern Analysis">
        <p className="text-sm text-[var(--color-muted)]">
          Select a game in the Game Identity tab first.
        </p>
      </Card>
    );
  }

  // No selected ad yet — show the dev URL panel if allowed, else a hint.
  if (!selectedAd) {
    return (
      <div className="flex flex-col gap-6">
        <Card title="3. Pattern Analysis">
          <p className="text-sm text-[var(--color-muted)]">
            Pick one of the Top 3 ads in the Market Scan tab to start analyzing
            patterns.
          </p>
        </Card>
        {allowTestUrl && <TestAdUrlPanel />}
      </div>
    );
  }

  const showCharacteristics =
    geminiAnalysis &&
    adCharacteristics &&
    adCharacteristics.length > 0 &&
    analyzeStatus !== 'analyzing' &&
    analyzeStatus !== 'extracting';

  return (
    <div className="flex flex-col gap-6">
      <SelectedAdPreview ad={selectedAd} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={runAnalysis}
          disabled={
            analyzeStatus === 'analyzing' || analyzeStatus === 'extracting'
          }
          size="lg"
        >
          {geminiAnalysis ? 'Re-run analysis' : 'Run pattern analysis'}
        </Button>
        {allowTestUrl && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedAd(undefined);
              setGeminiAnalysis(undefined);
              setAdCharacteristics(undefined);
              setSelectedCharacteristicIds(undefined);
              setScenarioPromptBrief(undefined);
              setAnalyzeStatus('idle');
              setAnalyzeError(null);
              setPromptStatus('idle');
              setPromptError(null);
            }}
          >
            Clear test ad
          </Button>
        )}
      </div>

      {analyzeStatus === 'analyzing' && (
        <Card>
          <LoadingState text={ANALYZING_AD_WITH_GEMINI} />
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Full-video analysis typically takes 30–90 seconds. Keep this tab
            open.
          </p>
        </Card>
      )}

      {analyzeStatus === 'extracting' && (
        <Card>
          <LoadingState text={EXTRACTING_CHARACTERISTICS} />
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Identifying 5–10 emergent traits in the ad. ~10 seconds.
          </p>
        </Card>
      )}

      {analyzeStatus === 'error' && analyzeError && (
        <ErrorState message={analyzeError} onRetry={runAnalysis} />
      )}

      {geminiAnalysis &&
        analyzeStatus !== 'analyzing' &&
        analyzeStatus !== 'extracting' && (
          <CollapsibleCard
            title="Gemini analysis"
            description="Structured read of the selected ad's full video."
          >
            <GeminiAnalysisPanel analysis={geminiAnalysis} />
          </CollapsibleCard>
        )}

      {showCharacteristics && (
        <>
          <CharacteristicChecklist
            characteristics={adCharacteristics!}
            selectedIds={checkedIds}
            onToggle={toggleCharacteristic}
          />

          <PromptSectionDivider
            canGenerate={canGeneratePrompt}
            loading={promptStatus === 'loading'}
            hasBrief={Boolean(brief)}
            onGenerate={runPromptGeneration}
            hint={generateHint}
          />

          {promptStatus === 'error' && promptError && (
            <ErrorState
              message={promptError}
              onRetry={runPromptGeneration}
            />
          )}

          {brief && promptStatus !== 'loading' && (
            <ScenarioPromptGenerator
              brief={brief}
              onUseInCreativeOutput={() => onContinue?.()}
            />
          )}
        </>
      )}
    </div>
  );
}
