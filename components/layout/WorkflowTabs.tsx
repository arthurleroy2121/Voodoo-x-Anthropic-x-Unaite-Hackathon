'use client';

import { CreativeOutputStep } from '@/components/creative/CreativeOutputStep';
import { GameIdentity } from '@/components/game/GameIdentity';
import { MarketScanDashboard } from '@/components/market/MarketScanDashboard';
import { PatternAnalysisStep } from '@/components/patterns/PatternAnalysisStep';
import { Tabs, type Tab } from '@/components/ui/Tabs';
import { useApp } from '@/lib/state';
import type { WorkflowStep } from '@/lib/types';

const TABS: readonly Tab[] = [
  { id: 'game', label: '1. Game Identity' },
  { id: 'market', label: '2. Market Scan' },
  { id: 'patterns', label: '3. Pattern Analysis' },
  { id: 'creative', label: '4. Creative Output' },
] as const;

export function WorkflowTabs() {
  const activeTab = useApp((s) => s.currentStep);
  const setStep = useApp((s) => s.setStep);
  const currentProjectId = useApp((s) => s.currentProjectId);

  return (
    <div className="flex flex-col">
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setStep(id as WorkflowStep)}
      />
      {/* `key` forces a fresh mount of all tab content when the active project
          changes, so React-local form state cannot leak between projects. */}
      <div className="p-8" key={currentProjectId ?? 'no-project'}>
        {activeTab === 'game' && (
          <GameIdentity onStartMarketScan={() => setStep('market')} />
        )}
        {activeTab === 'market' && <MarketScanDashboard />}
        {activeTab === 'patterns' && (
          <PatternAnalysisStep onContinue={() => setStep('creative')} />
        )}
        {activeTab === 'creative' && <CreativeOutputStep />}
      </div>
    </div>
  );
}
