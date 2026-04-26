'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AdCharacteristic,
  AppState,
  CreativeBrief,
  CreativeOutput,
  GameIdentity,
  GameSetupDraft,
  GeminiAdAnalysis,
  MarketAd,
  MarketScanConfig,
  MarketScanResult,
  Project,
  ProjectWorkflow,
  ScenarioPrompt,
  ScenarioPromptBrief,
  WorkflowStep,
} from '@/lib/types';

// Actions exposed by the store. Phase 1 wires the API; Phase 2 connects to tabs.
type Actions = {
  setStep: (s: WorkflowStep) => void;
  setGameSetupDraft: (d: GameSetupDraft | undefined) => void;
  setGameIdentity: (g: GameIdentity | undefined) => void;
  setMarketScanConfig: (c: MarketScanConfig | undefined) => void;
  setMarketScanResult: (r: MarketScanResult | undefined) => void;
  setSelectedAd: (a: MarketAd | undefined) => void;
  setGeminiAnalysis: (a: GeminiAdAnalysis | undefined) => void;
  setAdCharacteristics: (c: AdCharacteristic[] | undefined) => void;
  setSelectedCharacteristicIds: (ids: string[] | undefined) => void;
  setCreativeBrief: (b: CreativeBrief | undefined) => void;
  setScenarioPrompt: (p: ScenarioPrompt | undefined) => void;
  setScenarioPromptBrief: (b: ScenarioPromptBrief | undefined) => void;
  setScenarioPromptDraft: (d: string | undefined) => void;
  /** Persist the user's starting frame pick (id + url stored together). */
  setStartSeedImage: (id: string | undefined, url: string | undefined) => void;
  /** Persist the user's finishing frame pick (id + url stored together). */
  setEndSeedImage: (id: string | undefined, url: string | undefined) => void;
  setCreativeOutput: (o: CreativeOutput | undefined) => void;
  addProject: (name?: string) => string;
  selectProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  removeProject: (id: string) => void;
  reset: () => void;
};

const initial: AppState = { currentStep: 'game' };

type StoreState = AppState & Actions;

// Workflow fields that are stored both at the flat AppState level (active workspace)
// and inside each Project's snapshot (per-project memory).
const WORKFLOW_KEYS = [
  'gameSetupDraft',
  'gameIdentity',
  'marketScanConfig',
  'marketScanResult',
  'selectedAd',
  'geminiAnalysis',
  'adCharacteristics',
  'selectedCharacteristicIds',
  'creativeBrief',
  'scenarioPrompt',
  'scenarioPromptBrief',
  'scenarioPromptDraft',
  'startSeedImageId',
  'startSeedImageUrl',
  'endSeedImageId',
  'endSeedImageUrl',
  'creativeOutput',
] as const;

type WorkflowKey = (typeof WORKFLOW_KEYS)[number];
const WORKFLOW_KEY_SET: ReadonlySet<string> = new Set(WORKFLOW_KEYS);

function isWorkflowField(key: string): key is WorkflowKey | 'currentStep' {
  return key === 'currentStep' || WORKFLOW_KEY_SET.has(key);
}

function snapshotFromState(s: Partial<AppState>): ProjectWorkflow {
  const w: ProjectWorkflow = { currentStep: s.currentStep ?? 'game' };
  for (const key of WORKFLOW_KEYS) {
    const v = s[key];
    if (v !== undefined) {
      (w as Record<string, unknown>)[key] = v;
    }
  }
  return w;
}

function applySnapshot(prev: StoreState, snapshot: ProjectWorkflow): StoreState {
  // Zustand v5 shallow-merges the return of set(updater) into the current state,
  // so `delete next[key]` would NOT actually remove the key — the previous value
  // would survive the merge. Assign `undefined` instead so the merge overwrites
  // any stale value carried over from the previous project's workspace.
  const next: Record<string, unknown> = { ...prev, currentStep: snapshot.currentStep };
  for (const key of WORKFLOW_KEYS) {
    const v = snapshot[key];
    next[key] = v;
  }
  return next as StoreState;
}

function syncCurrentProject(state: StoreState, changedKey: string): StoreState {
  if (!isWorkflowField(changedKey)) return state;
  if (!state.currentProjectId) return state;
  const projects = state.projects ?? [];
  const idx = projects.findIndex((p) => p.id === state.currentProjectId);
  if (idx === -1) return state;
  const current = projects[idx];
  if (!current) return state;
  const updated: Project = { ...current, workflow: snapshotFromState(state) };
  const newProjects = [...projects];
  newProjects[idx] = updated;
  return { ...state, projects: newProjects };
}

// With exactOptionalPropertyTypes: true, we cannot pass `undefined` to Zustand's set()
// via a plain object — TypeScript rejects `{ prop: undefined }` on optional props.
// Solution: use a state updater function that merges into the previous state explicitly.
function setField<K extends keyof AppState>(
  set: (fn: (prev: StoreState) => StoreState) => void,
  key: K,
  value: AppState[K],
) {
  set((prev) => {
    const next = { ...prev, [key]: value } as StoreState;
    return syncCurrentProject(next, key as string);
  });
}

function newProjectId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextDefaultName(projects: Project[]) {
  const used = projects
    .map((p) => /^New Project (\d+)$/.exec(p.name)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const next = used.length ? Math.max(...used) + 1 : 1;
  return `New Project ${next}`;
}

function persistOutgoingSnapshot(state: StoreState): StoreState {
  if (!state.currentProjectId) return state;
  const projects = state.projects ?? [];
  const idx = projects.findIndex((p) => p.id === state.currentProjectId);
  if (idx === -1) return state;
  const current = projects[idx];
  if (!current) return state;
  const updated: Project = { ...current, workflow: snapshotFromState(state) };
  const newProjects = [...projects];
  newProjects[idx] = updated;
  return { ...state, projects: newProjects };
}

export const useApp = create<AppState & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setStep: (currentStep) => setField(set, 'currentStep', currentStep),
      setGameSetupDraft: (d) => setField(set, 'gameSetupDraft', d),
      setGameIdentity: (g) => setField(set, 'gameIdentity', g),
      setMarketScanConfig: (c) => setField(set, 'marketScanConfig', c),
      setMarketScanResult: (r) => setField(set, 'marketScanResult', r),
      setSelectedAd: (a) => setField(set, 'selectedAd', a),
      setGeminiAnalysis: (a) => setField(set, 'geminiAnalysis', a),
      setAdCharacteristics: (c) => setField(set, 'adCharacteristics', c),
      setSelectedCharacteristicIds: (ids) =>
        setField(set, 'selectedCharacteristicIds', ids),
      setCreativeBrief: (b) => setField(set, 'creativeBrief', b),
      setScenarioPrompt: (p) => setField(set, 'scenarioPrompt', p),
      setScenarioPromptBrief: (b) => setField(set, 'scenarioPromptBrief', b),
      setScenarioPromptDraft: (d) => setField(set, 'scenarioPromptDraft', d),
      setStartSeedImage: (id, url) =>
        set((prev) => {
          // Atomic update: write both keys together so they never diverge
          // between project switches or persistence flushes.
          const next = {
            ...prev,
            startSeedImageId: id,
            startSeedImageUrl: url,
          } as StoreState;
          let synced = syncCurrentProject(next, 'startSeedImageId');
          synced = syncCurrentProject(synced, 'startSeedImageUrl');
          return synced;
        }),
      setEndSeedImage: (id, url) =>
        set((prev) => {
          const next = {
            ...prev,
            endSeedImageId: id,
            endSeedImageUrl: url,
          } as StoreState;
          let synced = syncCurrentProject(next, 'endSeedImageId');
          synced = syncCurrentProject(synced, 'endSeedImageUrl');
          return synced;
        }),
      setCreativeOutput: (o) => setField(set, 'creativeOutput', o),
      addProject: (name) => {
        const id = newProjectId();
        set((prev) => {
          // Snapshot outgoing project before resetting the active workspace.
          const withOutgoing = persistOutgoingSnapshot(prev);
          // Clear workflow fields so the new project starts blank.
          const cleared = applySnapshot(withOutgoing, { currentStep: 'game' });
          const existing = cleared.projects ?? [];
          const finalName = name?.trim() || nextDefaultName(existing);
          const fresh: Project = {
            id,
            name: finalName,
            workflow: { currentStep: 'game' },
          };
          return {
            ...cleared,
            projects: [...existing, fresh],
            currentProjectId: id,
          };
        });
        return id;
      },
      selectProject: (id) =>
        set((prev) => {
          const projects = prev.projects ?? [];
          const target = projects.find((p) => p.id === id);
          if (!target) return prev;
          if (prev.currentProjectId === id) return prev;
          // Save the outgoing project's workflow snapshot.
          const withOutgoing = persistOutgoingSnapshot(prev);
          // Apply the target project's snapshot to the active workspace.
          const restored = applySnapshot(withOutgoing, target.workflow);
          return { ...restored, currentProjectId: id };
        }),
      renameProject: (id, name) =>
        set((prev) => {
          const trimmed = name.trim();
          if (!trimmed) return prev;
          const existing = prev.projects ?? [];
          return {
            ...prev,
            projects: existing.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
          };
        }),
      removeProject: (id) =>
        set((prev) => {
          const projects = prev.projects ?? [];
          if (!projects.some((p) => p.id === id)) return prev;
          const remaining = projects.filter((p) => p.id !== id);

          // Deleting a non-active project: just drop it from the list.
          if (prev.currentProjectId !== id) {
            return { ...prev, projects: remaining };
          }

          // Deleted the active project: switch to the first remaining (if any).
          if (remaining.length > 0) {
            const next = remaining[0]!;
            const restored = applySnapshot(prev, next.workflow);
            return { ...restored, projects: remaining, currentProjectId: next.id };
          }

          // No projects left: wipe the active workspace and unset the pointer.
          const cleared = applySnapshot(prev, { currentStep: 'game' });
          return {
            ...cleared,
            projects: remaining,
            currentProjectId: undefined,
          } as unknown as StoreState;
        }),
      reset: () =>
        set((state) => {
          const {
            currentStep: _cs,
            projects: _ps,
            currentProjectId: _cpi,
            gameIdentity: _gi,
            marketScanConfig: _msc,
            marketScanResult: _msr,
            selectedAd: _sa,
            geminiAnalysis: _ga,
            adCharacteristics: _ac,
            selectedCharacteristicIds: _sci,
            creativeBrief: _cb,
            scenarioPrompt: _snp,
            scenarioPromptBrief: _spb,
            scenarioPromptDraft: _spd,
            startSeedImageId: _ssid,
            startSeedImageUrl: _ssur,
            endSeedImageId: _esid,
            endSeedImageUrl: _esur,
            creativeOutput: _co,
            ...actions
          } = state;
          return { ...actions, ...initial };
        }),
    }),
    {
      name: 'vcr.appstate.v1',
      version: 7,
      // v1 used `projectName: string`. v2 introduced `projects[]` + `currentProjectId`.
      // v3 added `workflow` to each Project. v4 hard-resets every project's
      // workflow snapshot to recover from pollution caused by earlier buggy
      // versions where workflow data leaked across projects. v6 drops the legacy
      // `topPatterns` / `selectedPattern` slices in favour of `adCharacteristics`
      // + `selectedCharacteristicIds`; we wipe workflow snapshots again so no
      // ghost selection (a pattern id with no matching pattern card in the UI)
      // can keep the new flow disabled. v7 splits the single `seedImageId` /
      // `seedImageUrl` slice into `startSeedImage*` + `endSeedImage*` (Phase 9
      // v3 — Seedance 2.0 takes a starting AND a finishing frame). We wipe
      // workflow snapshots again so the new picker UI is never gated by a
      // stale single-frame selection.
      migrate: (persistedState, version) => {
        let s = (persistedState ?? {}) as Partial<AppState> & {
          projectName?: string;
          projects?: Array<{ id: string; name: string; workflow?: ProjectWorkflow }>;
        };

        if (version < 2 && s.projectName && !s.projects) {
          const id = newProjectId();
          const { projectName: _omit, ...rest } = s;
          s = {
            ...rest,
            projects: [{ id, name: s.projectName, workflow: { currentStep: 'game' } }],
            currentProjectId: id,
          };
        }

        if (version < 7) {
          // Wipe every project's workflow snapshot AND the flat workflow state.
          // Project list and names are preserved. The active project (if any)
          // still points to the same id, just with an empty workspace.
          const projects: Project[] = (s.projects ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            workflow: { currentStep: 'game' },
          }));
          const next: Partial<AppState> = {
            currentStep: 'game',
            projects,
          };
          if (s.currentProjectId) next.currentProjectId = s.currentProjectId;
          s = next as typeof s;
        }

        return s as AppState;
      },
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return localStorage;
      }),
      // Persist only domain state, never transient UI flags (loading/error).
      partialize: (s) => ({
        currentStep: s.currentStep,
        projects: s.projects,
        currentProjectId: s.currentProjectId,
        gameSetupDraft: s.gameSetupDraft,
        gameIdentity: s.gameIdentity,
        marketScanConfig: s.marketScanConfig,
        marketScanResult: s.marketScanResult,
        selectedAd: s.selectedAd,
        geminiAnalysis: s.geminiAnalysis,
        adCharacteristics: s.adCharacteristics,
        selectedCharacteristicIds: s.selectedCharacteristicIds,
        creativeBrief: s.creativeBrief,
        scenarioPrompt: s.scenarioPrompt,
        scenarioPromptBrief: s.scenarioPromptBrief,
        scenarioPromptDraft: s.scenarioPromptDraft,
        startSeedImageId: s.startSeedImageId,
        startSeedImageUrl: s.startSeedImageUrl,
        endSeedImageId: s.endSeedImageId,
        endSeedImageUrl: s.endSeedImageUrl,
        creativeOutput: s.creativeOutput,
      }),
      // CRITICAL (PITFALLS.md): skipHydration prevents Next.js App Router hydration mismatch.
      // Phase 2 calls useApp.persist.rehydrate() from a useEffect in app/layout.tsx
      // and gates UI on a `hydrated` flag.
      skipHydration: true,
    },
  ),
);
