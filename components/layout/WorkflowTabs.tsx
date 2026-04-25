'use client';

import { useState } from 'react';

import { Tabs, type Tab } from '@/components/ui/Tabs';

const TABS: readonly Tab[] = [
  { id: 'game', label: '1. Game Identity' },
  { id: 'market', label: '2. Market Scan' },
  { id: 'patterns', label: '3. Pattern Analysis' },
  { id: 'creative', label: '4. Creative Output' },
] as const;

const TAB_LABELS: Record<string, string> = {
  game: '1. Game Identity',
  market: '2. Market Scan',
  patterns: '3. Pattern Analysis',
  creative: '4. Creative Output',
};

export function WorkflowTabs() {
  // Phase 1: local state. Phase 2 will replace with:
  //   const activeTab = useApp((s) => s.currentStep);
  //   const setActiveTab = useApp((s) => s.setStep);
  const [activeTab, setActiveTab] = useState<string>('game');

  return (
    <div className="flex flex-col">
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="p-8">
        <p className="text-sm text-[--color-muted]">
          {`${TAB_LABELS[activeTab] ?? 'Étape'} — à venir`}
        </p>
      </div>
    </div>
  );
}
