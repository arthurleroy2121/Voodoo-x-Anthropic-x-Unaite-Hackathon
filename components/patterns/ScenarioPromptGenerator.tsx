'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { concatenateScenarioBrief } from '@/lib/scenarioPrompt';
import { useApp } from '@/lib/state';
import type { ScenarioPromptBrief } from '@/lib/types';

import { UnifiedPromptView } from './UnifiedPromptView';

interface ScenarioPromptGeneratorProps {
  brief: ScenarioPromptBrief;
  onUseInCreativeOutput: () => void;
}

/**
 * Renders the unified prompt container + the "Use in Creative Output" CTA.
 * The "Generate" trigger now lives in `PromptSectionDivider`, which the parent
 * step (`PatternAnalysisStep`) wires to the API call. This component is a
 * pure view of the resulting brief.
 */
export function ScenarioPromptGenerator({
  brief,
  onUseInCreativeOutput,
}: ScenarioPromptGeneratorProps) {
  const setDraft = useApp((s) => s.setScenarioPromptDraft);

  const [sceneOverrides, setSceneOverrides] = useState<Record<number, string>>(
    {},
  );

  const concatenated = useMemo(
    () => concatenateScenarioBrief(brief, sceneOverrides),
    [brief, sceneOverrides],
  );

  function handleUseInCreativeOutput() {
    setDraft(concatenated);
    onUseInCreativeOutput();
  }

  return (
    <div className="flex flex-col gap-4">
      <UnifiedPromptView
        brief={brief}
        overrides={sceneOverrides}
        onOverrideChange={(num, value) =>
          setSceneOverrides((prev) => ({ ...prev, [num]: value }))
        }
        concatenated={concatenated}
      />

      <div className="flex justify-end">
        <Button onClick={handleUseInCreativeOutput} size="lg">
          Use this prompt in Creative Output →
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper exposed for parent steps that need to reset per-scene edits when a
 * fresh brief comes in. Currently unused but kept for symmetry with the
 * previous API surface (the parent re-mounts on key change anyway).
 */
export type { ScenarioPromptBrief };
