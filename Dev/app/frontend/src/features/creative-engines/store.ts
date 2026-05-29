/**
 * Lightweight reactive store (Zustand-style API without extra dependency).
 */

import {
  buildDefaultHardwareMappings,
  buildNarrativeNodesFromStory,
  buildPuzzleGraphFromProgression,
  buildVirtualStatesFromPuzzles,
  registerSensorVirtualState,
  validateCreativeEnginesState,
  type BootstrapPuzzle,
  type BootstrapStoryStage,
  type CreativeEngineTab,
  type CreativeEnginesSnapshot,
  type HardwareMappingRow,
  type NarrativeTimelineNode,
  type PuzzleDependencyEdge,
  type PuzzleDependencyNode,
  type ValidationIssue,
} from "../../../../shared/creativeEngines.ts";
import type { ProgressionGraph } from "../../../../shared/progressionGraph.ts";

export type CreativeEnginesUiState = CreativeEnginesSnapshot & {
  activeTab: CreativeEngineTab;
  selectedNarrativeId: string | null;
  selectedPuzzleNodeId: string | null;
  selectedHardwareId: string | null;
  leftShelfCollapsed: boolean;
  rightShelfCollapsed: boolean;
  knownPuzzleIds: string[];
  validationIssues: ValidationIssue[];
  simulatorLog: string[];
  simulatorConnected: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();

const emptySnapshot = (): CreativeEnginesSnapshot => ({
  narrativeNodes: [],
  puzzleNodes: [],
  puzzleEdges: [],
  virtualStates: [],
  hardwareMappings: [],
});

let state: CreativeEnginesUiState = {
  ...emptySnapshot(),
  activeTab: "timeline",
  selectedNarrativeId: null,
  selectedPuzzleNodeId: null,
  selectedHardwareId: null,
  leftShelfCollapsed: false,
  rightShelfCollapsed: false,
  knownPuzzleIds: [],
  validationIssues: [],
  simulatorLog: [],
  simulatorConnected: false,
};

const revalidate = (snapshot: CreativeEnginesSnapshot, knownPuzzleIds: string[]): ValidationIssue[] =>
  validateCreativeEnginesState(snapshot, knownPuzzleIds);

const commit = (partial: Partial<CreativeEnginesUiState>): void => {
  const next = { ...state, ...partial };
  if (
    partial.narrativeNodes ||
    partial.puzzleNodes ||
    partial.puzzleEdges ||
    partial.virtualStates ||
    partial.hardwareMappings ||
    partial.knownPuzzleIds
  ) {
    next.validationIssues = revalidate(
      {
        narrativeNodes: next.narrativeNodes,
        puzzleNodes: next.puzzleNodes,
        puzzleEdges: next.puzzleEdges,
        virtualStates: next.virtualStates,
        hardwareMappings: next.hardwareMappings,
      },
      next.knownPuzzleIds,
    );
  }
  state = next;
  listeners.forEach((l) => l());
};

export const creativeEnginesStore = {
  getState: (): CreativeEnginesUiState => state,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setActiveTab: (activeTab: CreativeEngineTab): void => commit({ activeTab }),
  toggleLeftShelf: (): void => commit({ leftShelfCollapsed: !state.leftShelfCollapsed }),
  toggleRightShelf: (): void => commit({ rightShelfCollapsed: !state.rightShelfCollapsed }),
  selectNarrative: (selectedNarrativeId: string | null): void => commit({ selectedNarrativeId }),
  selectPuzzleNode: (selectedPuzzleNodeId: string | null): void => commit({ selectedPuzzleNodeId }),
  selectHardware: (selectedHardwareId: string | null): void => commit({ selectedHardwareId }),
  appendSimulatorLog: (line: string): void =>
    commit({ simulatorLog: [...state.simulatorLog.slice(-49), line] }),
  setSimulatorConnected: (simulatorConnected: boolean): void => commit({ simulatorConnected }),

  bootstrap: (input: {
    puzzles: BootstrapPuzzle[];
    stages: BootstrapStoryStage[];
    progressionGraph?: ProgressionGraph | null;
    youthAddOnEnabled: boolean;
  }): void => {
    const knownPuzzleIds = input.puzzles.map((p) => p.id);
    const narrativeNodes = buildNarrativeNodesFromStory(input.stages, input.puzzles, input.youthAddOnEnabled);
    const virtualStates = buildVirtualStatesFromPuzzles(input.puzzles);
    let puzzleNodes: PuzzleDependencyNode[] = [];
    let puzzleEdges: PuzzleDependencyEdge[] = [];
    if (input.progressionGraph) {
      const graphPart = buildPuzzleGraphFromProgression(input.progressionGraph, input.puzzles);
      puzzleNodes = graphPart.puzzleNodes;
      puzzleEdges = graphPart.puzzleEdges;
    }
    const hardwareMappings = buildDefaultHardwareMappings(virtualStates);
    commit({
      narrativeNodes,
      puzzleNodes,
      puzzleEdges,
      virtualStates,
      hardwareMappings,
      knownPuzzleIds,
      selectedNarrativeId: narrativeNodes[0]?.id ?? null,
      selectedPuzzleNodeId: puzzleNodes[0]?.id ?? null,
      selectedHardwareId: hardwareMappings[0]?.id ?? null,
      validationIssues: revalidate(
        { narrativeNodes, puzzleNodes, puzzleEdges, virtualStates, hardwareMappings },
        knownPuzzleIds,
      ),
    });
  },

  deleteNarrativeNode: (nodeId: string): void => {
    const narrativeNodes = state.narrativeNodes.filter((n) => n.id !== nodeId);
    commit({
      narrativeNodes,
      selectedNarrativeId: state.selectedNarrativeId === nodeId ? (narrativeNodes[0]?.id ?? null) : state.selectedNarrativeId,
    });
  },

  addNarrativeNode: (partial: Omit<NarrativeTimelineNode, "id">): void => {
    const id = `narrative_${Date.now()}`;
    commit({
      narrativeNodes: [...state.narrativeNodes, { ...partial, id }],
      selectedNarrativeId: id,
    });
  },

  updatePuzzleNodePosition: (nodeId: string, x: number, y: number): void => {
    commit({
      puzzleNodes: state.puzzleNodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    });
  },

  addSensorRegister: (sensorId: string, label: string, port: string): void => {
    const next = registerSensorVirtualState(sensorId, label, port, {
      virtualStates: state.virtualStates,
      hardwareMappings: state.hardwareMappings,
    });
    commit({
      virtualStates: next.virtualStates,
      hardwareMappings: next.hardwareMappings,
      selectedHardwareId: next.hardwareMappings[next.hardwareMappings.length - 1]?.id ?? state.selectedHardwareId,
    });
  },

  updateHardwareMapping: (id: string, patch: Partial<HardwareMappingRow>): void => {
    commit({
      hardwareMappings: state.hardwareMappings.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  },

  linkPuzzleToNarrativeTrigger: (puzzleNodeId: string, narrativeTriggerId: string | undefined): void => {
    commit({
      puzzleNodes: state.puzzleNodes.map((n) =>
        n.id === puzzleNodeId ? { ...n, narrativeTriggerId } : n,
      ),
    });
  },

  reset: (): void => {
    state = {
      ...emptySnapshot(),
      activeTab: "timeline",
      selectedNarrativeId: null,
      selectedPuzzleNodeId: null,
      selectedHardwareId: null,
      leftShelfCollapsed: false,
      rightShelfCollapsed: false,
      knownPuzzleIds: [],
      validationIssues: [],
      simulatorLog: [],
      simulatorConnected: false,
    };
    listeners.forEach((l) => l());
  },
};

