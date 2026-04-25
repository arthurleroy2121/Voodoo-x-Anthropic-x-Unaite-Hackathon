'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppState,
  CreativeBrief,
  CreativeOutput,
  CreativePattern,
  GameIdentity,
  GeminiAdAnalysis,
  MarketAd,
  MarketScanConfig,
  MarketScanResult,
  ScenarioPrompt,
} from '@/lib/types';

// Actions exposed by the store. Phase 1 wires the API; Phase 2 connects to tabs.
type Actions = {
  setStep: (s: AppState['currentStep']) => void;
  setGameIdentity: (g: GameIdentity | undefined) => void;
  setMarketScanConfig: (c: MarketScanConfig | undefined) => void;
  setMarketScanResult: (r: MarketScanResult | undefined) => void;
  setSelectedAd: (a: MarketAd | undefined) => void;
  setGeminiAnalysis: (a: GeminiAdAnalysis | undefined) => void;
  setTopPatterns: (p: CreativePattern[] | undefined) => void;
  setSelectedPattern: (p: CreativePattern | undefined) => void;
  setCreativeBrief: (b: CreativeBrief | undefined) => void;
  setScenarioPrompt: (p: ScenarioPrompt | undefined) => void;
  setCreativeOutput: (o: CreativeOutput | undefined) => void;
  setProjectName: (name: string) => void;
  reset: () => void;
};

const initial: AppState = { currentStep: 'game' };

// With exactOptionalPropertyTypes: true, we cannot pass `undefined` to Zustand's set()
// via a plain object — TypeScript rejects `{ prop: undefined }` on optional props.
// Solution: use a state updater function that merges into the previous state explicitly.
// This is equivalent to a direct set() call at runtime.
type StoreState = AppState & Actions;

function setField<K extends keyof AppState>(
  set: (fn: (prev: StoreState) => StoreState) => void,
  key: K,
  value: AppState[K],
) {
  set((prev) => ({ ...prev, [key]: value }));
}

export const useApp = create<AppState & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setStep: (currentStep) => set((prev) => ({ ...prev, currentStep })),
      setGameIdentity: (g) => setField(set, 'gameIdentity', g),
      setMarketScanConfig: (c) => setField(set, 'marketScanConfig', c),
      setMarketScanResult: (r) => setField(set, 'marketScanResult', r),
      setSelectedAd: (a) => setField(set, 'selectedAd', a),
      setGeminiAnalysis: (a) => setField(set, 'geminiAnalysis', a),
      setTopPatterns: (p) => setField(set, 'topPatterns', p),
      setSelectedPattern: (p) => setField(set, 'selectedPattern', p),
      setCreativeBrief: (b) => setField(set, 'creativeBrief', b),
      setScenarioPrompt: (p) => setField(set, 'scenarioPrompt', p),
      setCreativeOutput: (o) => setField(set, 'creativeOutput', o),
      setProjectName: (projectName) => set((prev) => ({ ...prev, projectName })),
      reset: () => set((prev) => ({ ...prev, ...initial })),
    }),
    {
      name: 'vcr.appstate.v1',
      storage: createJSONStorage(() => localStorage),
      // Persist only domain state, never transient UI flags (loading/error).
      partialize: (s) => ({
        currentStep: s.currentStep,
        projectName: s.projectName,
        gameIdentity: s.gameIdentity,
        marketScanConfig: s.marketScanConfig,
        marketScanResult: s.marketScanResult,
        selectedAd: s.selectedAd,
        geminiAnalysis: s.geminiAnalysis,
        topPatterns: s.topPatterns,
        selectedPattern: s.selectedPattern,
        creativeBrief: s.creativeBrief,
        scenarioPrompt: s.scenarioPrompt,
        creativeOutput: s.creativeOutput,
      }),
      // CRITICAL (PITFALLS.md): skipHydration prevents Next.js App Router hydration mismatch.
      // Phase 2 calls useApp.persist.rehydrate() from a useEffect in app/layout.tsx
      // and gates UI on a `hydrated` flag.
      skipHydration: true,
    },
  ),
);
