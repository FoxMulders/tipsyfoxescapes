import { describe, expect, it } from "vitest";
import {
  buildNarrativeNodesFromStory,
  buildPuzzleGraphFromProgression,
  buildVirtualStatesFromPuzzles,
  findBrokenPuzzleDepsAfterNarrativeDelete,
  registerSensorVirtualState,
  resolveSimulatorOutputs,
  validateCreativeEnginesState,
  type CreativeEnginesSnapshot,
  type NarrativeTimelineNode,
  type PuzzleDependencyNode,
} from "../../../../shared/creativeEngines.js";
import { buildProgressionGraph } from "../../../../shared/progressionGraph.js";

const samplePuzzles = [
  { id: "pz_1", title: "Wall Map Cipher", audienceTrack: "main" as const },
  { id: "pz_2", title: "Cabinet Lock", audienceTrack: "main" as const },
  { id: "pz_3", title: "Junior Color Match", audienceTrack: "youth_addon" as const },
];

const sampleStages = [
  {
    stage: 1,
    title: "Stage 1",
    storyBeat: "Parallel discovery",
    requiredPuzzleIds: ["pz_1", "pz_2"],
  },
  {
    stage: 2,
    title: "Stage 2",
    storyBeat: "Convergence",
    requiredPuzzleIds: ["pz_3"],
  },
];

describe("creativeEngines validation", () => {
  it("flags broken puzzle deps when narrative trigger is removed", () => {
    const narrativeNodes = buildNarrativeNodesFromStory(sampleStages, samplePuzzles, true);
    const actNode = narrativeNodes.find((n) => n.kind === "act" && n.actIndex === 1)!;
    const puzzleNodes: PuzzleDependencyNode[] = [
      {
        id: "puzzle_pz_2",
        puzzleId: "pz_2",
        label: "Cabinet Lock",
        x: 0,
        y: 0,
        narrativeTriggerId: actNode.triggerRef,
      },
    ];
    const broken = findBrokenPuzzleDepsAfterNarrativeDelete(actNode, puzzleNodes);
    expect(broken).toHaveLength(1);
    expect(broken[0]?.puzzleId).toBe("pz_2");

    const snapshot: CreativeEnginesSnapshot = {
      narrativeNodes: narrativeNodes.filter((n) => n.id !== actNode.id),
      puzzleNodes,
      puzzleEdges: [],
      virtualStates: buildVirtualStatesFromPuzzles(samplePuzzles),
      hardwareMappings: [],
    };
    const issues = validateCreativeEnginesState(snapshot, samplePuzzles.map((p) => p.id));
    expect(issues.some((i) => i.code === "PUZZLE_BROKEN_NARRATIVE_REF")).toBe(true);
  });

  it("registers sensor virtual state in hardware matrix", () => {
    const base = {
      virtualStates: buildVirtualStatesFromPuzzles(samplePuzzles),
      hardwareMappings: [],
    };
    const next = registerSensorVirtualState("door_mat", "Entry mat", "gpio-12", base);
    expect(next.virtualStates.some((v) => v.source === "sensor")).toBe(true);
    expect(next.hardwareMappings.some((m) => m.outputKind === "sensor" && m.port === "gpio-12")).toBe(true);
  });

  it("builds puzzle graph from progression graph", () => {
    const graph = buildProgressionGraph({
      puzzles: samplePuzzles.filter((p) => p.audienceTrack === "main"),
      playersConcurrent: 4,
      pathKind: "nonlinear",
    });
    const { puzzleNodes, puzzleEdges } = buildPuzzleGraphFromProgression(graph, samplePuzzles);
    expect(puzzleNodes.length).toBeGreaterThan(0);
    expect(puzzleEdges.length).toBeGreaterThan(0);
  });

  it("resolves simulator outputs for puzzle solve including DMX", () => {
    const virtualStates = buildVirtualStatesFromPuzzles(samplePuzzles);
    const narrativeNodes = buildNarrativeNodesFromStory(sampleStages, samplePuzzles, false);
    const snapshot: CreativeEnginesSnapshot = {
      narrativeNodes,
      puzzleNodes: [],
      puzzleEdges: [],
      virtualStates,
      hardwareMappings: [
        {
          id: "hw_dmx",
          virtualStateId: virtualStates[0]!.id,
          outputKind: "dmx",
          port: "universe-1",
          channel: 1,
          label: "Green wash",
          enabled: true,
        },
      ],
    };
    const events = resolveSimulatorOutputs(snapshot, "pz_1");
    expect(events.some((e) => e.type === "puzzle_solved")).toBe(true);
    expect(events.some((e) => e.type === "hardware_output" && e.outputKind === "dmx")).toBe(true);
    expect(events.some((e) => e.type === "narrative_advance")).toBe(true);
  });

  it("flags narrative nodes referencing unknown puzzles", () => {
    const node: NarrativeTimelineNode = {
      id: "orphan_clue",
      kind: "clue",
      label: "Missing puzzle clue",
      track: "adult",
      actIndex: 1,
      puzzleIds: ["pz_missing"],
    };
    const issues = validateCreativeEnginesState(
      {
        narrativeNodes: [node],
        puzzleNodes: [],
        puzzleEdges: [],
        virtualStates: [],
        hardwareMappings: [],
      },
      ["pz_1"],
    );
    expect(issues.some((i) => i.code === "NARRATIVE_UNKNOWN_PUZZLE")).toBe(true);
  });
});
