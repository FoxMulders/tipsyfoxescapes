/**
 * Unified creative engines state: narrative timeline, puzzle dependency graph, site hardware matrix.
 * Shared between frontend store and backend QA validation tests.
 */

import type { ProgressionEdge, ProgressionGraph, ProgressionNode } from "./progressionGraph.js";

export type CreativeEngineTab = "timeline" | "puzzle" | "hardware";

export type AudienceTrack = "adult" | "junior";

export type NarrativeNodeKind = "act" | "clue" | "dialogue_trigger" | "beat";

export type NarrativeTimelineNode = {
  id: string;
  kind: NarrativeNodeKind;
  label: string;
  track: AudienceTrack;
  actIndex: number;
  puzzleIds: string[];
  dialogueTrigger?: string;
  condition?: string;
  /** Puzzle dependency edges may reference this trigger id. */
  triggerRef?: string;
};

export type PuzzleDependencyEdgeKind = "requires" | "gates" | "contributes";

export type PuzzleDependencyNode = {
  id: string;
  puzzleId: string;
  label: string;
  x: number;
  y: number;
  /** Optional narrative trigger that must fire before this puzzle unlocks. */
  narrativeTriggerId?: string;
};

export type PuzzleDependencyEdge = {
  id: string;
  from: string;
  to: string;
  kind: PuzzleDependencyEdgeKind;
  label?: string;
  /** dashed = optional / contributes; solid = hard lock */
  strokeStyle?: "solid" | "dashed";
};

export type HardwareOutputKind = "relay" | "maglock" | "dmx" | "sensor";

export type VirtualStateRef = {
  id: string;
  label: string;
  source: "puzzle" | "narrative" | "sensor";
  sourceId: string;
};

export type HardwareMappingRow = {
  id: string;
  virtualStateId: string;
  outputKind: HardwareOutputKind;
  port: string;
  channel?: number;
  label: string;
  enabled: boolean;
};

export type ValidationIssue = {
  id: string;
  severity: "error" | "warning";
  code: string;
  message: string;
  relatedIds: string[];
  engine: "narrative" | "puzzle" | "hardware" | "cross";
};

export type CreativeEnginesSnapshot = {
  narrativeNodes: NarrativeTimelineNode[];
  puzzleNodes: PuzzleDependencyNode[];
  puzzleEdges: PuzzleDependencyEdge[];
  virtualStates: VirtualStateRef[];
  hardwareMappings: HardwareMappingRow[];
};

export type BootstrapPuzzle = {
  id: string;
  title: string;
  audienceTrack?: "main" | "youth_addon";
};

export type BootstrapStoryStage = {
  stage: number;
  title: string;
  storyBeat: string;
  requiredPuzzleIds: string[];
};

export const puzzleVirtualStateId = (puzzleId: string): string => `vs_puzzle_${puzzleId}_solved`;

export const puzzleVirtualStateLabel = (puzzleTitle: string): string => `${puzzleTitle.replace(/\s+/g, "_")}_Solved`;

export const sensorVirtualStateId = (sensorId: string): string => `vs_sensor_${sensorId}_active`;

const edgeKindFromProgression = (kind: ProgressionEdge["kind"]): PuzzleDependencyEdgeKind =>
  kind === "contributes" ? "contributes" : "requires";

const layoutPuzzleNode = (index: number, total: number, threadIndex = 0, threadCount = 1): { x: number; y: number } => {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const x = 80 + col * 160 + threadIndex * 24;
  const y = 60 + row * 100 + threadIndex * (280 / Math.max(threadCount, 1));
  return { x, y };
};

export const buildPuzzleGraphFromProgression = (
  graph: ProgressionGraph,
  puzzles: BootstrapPuzzle[],
): Pick<CreativeEnginesSnapshot, "puzzleNodes" | "puzzleEdges"> => {
  const puzzleById = new Map(puzzles.map((p) => [p.id, p] as const));
  const puzzleNodes: PuzzleDependencyNode[] = [];
  const puzzleEdges: PuzzleDependencyEdge[] = [];

  const progressionPuzzleNodes = graph.nodes.filter((n): n is ProgressionNode & { puzzleId: string } =>
    n.kind === "puzzle" && Boolean(n.puzzleId),
  );

  progressionPuzzleNodes.forEach((node, index) => {
    const threadIndex = graph.threads.findIndex((t) => t.puzzleIds.includes(node.puzzleId!));
    const { x, y } = layoutPuzzleNode(index, progressionPuzzleNodes.length, Math.max(0, threadIndex), graph.threads.length);
    puzzleNodes.push({
      id: node.id,
      puzzleId: node.puzzleId!,
      label: puzzleById.get(node.puzzleId!)?.title ?? node.label,
      x,
      y,
    });
  });

  graph.edges.forEach((edge, idx) => {
    const fromIsPuzzle = edge.from.startsWith("puzzle_") || graph.nodes.some((n) => n.id === edge.from && n.kind === "puzzle");
    const toIsPuzzle = edge.to.startsWith("puzzle_") || graph.nodes.some((n) => n.id === edge.to && n.kind === "puzzle");
    if (!fromIsPuzzle && !toIsPuzzle) return;
    const kind = edgeKindFromProgression(edge.kind);
    puzzleEdges.push({
      id: `edge_${idx}_${edge.from}_${edge.to}`,
      from: edge.from,
      to: edge.to,
      kind,
      label: edge.label,
      strokeStyle: kind === "contributes" ? "dashed" : "solid",
    });
  });

  return { puzzleNodes, puzzleEdges };
};

export const buildNarrativeNodesFromStory = (
  stages: BootstrapStoryStage[],
  puzzles: BootstrapPuzzle[],
  youthAddOnEnabled: boolean,
): NarrativeTimelineNode[] => {
  const nodes: NarrativeTimelineNode[] = [];
  const puzzleById = new Map(puzzles.map((p) => [p.id, p] as const));

  stages.forEach((stage) => {
    const actId = `act_${stage.stage}`;
    nodes.push({
      id: actId,
      kind: "act",
      label: stage.title || `Act ${stage.stage}`,
      track: "adult",
      actIndex: stage.stage,
      puzzleIds: stage.requiredPuzzleIds,
      dialogueTrigger: `act_${stage.stage}_enter`,
      triggerRef: `trigger_${actId}`,
    });
    nodes.push({
      id: `beat_${stage.stage}`,
      kind: "beat",
      label: stage.storyBeat,
      track: "adult",
      actIndex: stage.stage,
      puzzleIds: stage.requiredPuzzleIds,
    });
    stage.requiredPuzzleIds.forEach((puzzleId) => {
      const puzzle = puzzleById.get(puzzleId);
      nodes.push({
        id: `clue_${stage.stage}_${puzzleId}`,
        kind: "clue",
        label: `Clue — ${puzzle?.title ?? puzzleId}`,
        track: (puzzle?.audienceTrack ?? "main") === "youth_addon" ? "junior" : "adult",
        actIndex: stage.stage,
        puzzleIds: [puzzleId],
      });
    });
  });

  if (youthAddOnEnabled) {
    puzzles
      .filter((p) => p.audienceTrack === "youth_addon")
      .forEach((puzzle, idx) => {
        nodes.push({
          id: `junior_trigger_${puzzle.id}`,
          kind: "dialogue_trigger",
          label: `Junior dialogue — ${puzzle.title}`,
          track: "junior",
          actIndex: idx + 1,
          puzzleIds: [puzzle.id],
          dialogueTrigger: `junior_${puzzle.id}_hint`,
          triggerRef: `trigger_junior_${puzzle.id}`,
          condition: "player_track=junior",
        });
      });
  }

  return nodes;
};

export const buildVirtualStatesFromPuzzles = (puzzles: BootstrapPuzzle[]): VirtualStateRef[] =>
  puzzles.map((puzzle) => ({
    id: puzzleVirtualStateId(puzzle.id),
    label: puzzleVirtualStateLabel(puzzle.title),
    source: "puzzle" as const,
    sourceId: puzzle.id,
  }));

export const buildDefaultHardwareMappings = (virtualStates: VirtualStateRef[]): HardwareMappingRow[] =>
  virtualStates.slice(0, 3).map((vs, index) => ({
    id: `hw_${vs.id}`,
    virtualStateId: vs.id,
    outputKind: index === 2 ? "dmx" : "relay",
    port: index === 2 ? "universe-1" : `relay-${index + 1}`,
    channel: index === 2 ? 1 : undefined,
    label: vs.label,
    enabled: true,
  }));

export const validateCreativeEnginesState = (
  snapshot: CreativeEnginesSnapshot,
  knownPuzzleIds: readonly string[],
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const puzzleIdSet = new Set(knownPuzzleIds);
  const narrativeIds = new Set(snapshot.narrativeNodes.map((n) => n.id));
  const triggerRefs = new Set(
    snapshot.narrativeNodes.map((n) => n.triggerRef).filter((t): t is string => Boolean(t)),
  );
  const virtualStateIds = new Set(snapshot.virtualStates.map((v) => v.id));
  const puzzleNodeIds = new Set(snapshot.puzzleNodes.map((n) => n.id));

  for (const node of snapshot.narrativeNodes) {
    for (const puzzleId of node.puzzleIds) {
      if (!puzzleIdSet.has(puzzleId)) {
        issues.push({
          id: `narrative_missing_puzzle_${node.id}_${puzzleId}`,
          severity: "error",
          code: "NARRATIVE_UNKNOWN_PUZZLE",
          message: `Narrative "${node.label}" references missing puzzle ${puzzleId}.`,
          relatedIds: [node.id, puzzleId],
          engine: "narrative",
        });
      }
    }
  }

  for (const node of snapshot.puzzleNodes) {
    if (!puzzleIdSet.has(node.puzzleId)) {
      issues.push({
        id: `puzzle_node_orphan_${node.id}`,
        severity: "error",
        code: "PUZZLE_NODE_ORPHAN",
        message: `Puzzle node "${node.label}" has no matching puzzle in the session.`,
        relatedIds: [node.id, node.puzzleId],
        engine: "puzzle",
      });
    }
    if (node.narrativeTriggerId && !narrativeIds.has(node.narrativeTriggerId) && !triggerRefs.has(node.narrativeTriggerId)) {
      issues.push({
        id: `puzzle_broken_narrative_${node.id}`,
        severity: "error",
        code: "PUZZLE_BROKEN_NARRATIVE_REF",
        message: `Puzzle "${node.label}" depends on deleted narrative trigger ${node.narrativeTriggerId}.`,
        relatedIds: [node.id, node.narrativeTriggerId],
        engine: "cross",
      });
    }
  }

  for (const edge of snapshot.puzzleEdges) {
    if (!puzzleNodeIds.has(edge.from) && !graphNodeExists(snapshot, edge.from)) {
      issues.push({
        id: `edge_missing_from_${edge.id}`,
        severity: "error",
        code: "PUZZLE_EDGE_BROKEN",
        message: `Dependency edge missing source node ${edge.from}.`,
        relatedIds: [edge.id, edge.from],
        engine: "puzzle",
      });
    }
    if (!puzzleNodeIds.has(edge.to) && !graphNodeExists(snapshot, edge.to)) {
      issues.push({
        id: `edge_missing_to_${edge.id}`,
        severity: "error",
        code: "PUZZLE_EDGE_BROKEN",
        message: `Dependency edge missing target node ${edge.to}.`,
        relatedIds: [edge.id, edge.to],
        engine: "puzzle",
      });
    }
  }

  for (const row of snapshot.hardwareMappings) {
    if (!virtualStateIds.has(row.virtualStateId)) {
      issues.push({
        id: `hardware_orphan_${row.id}`,
        severity: "error",
        code: "HARDWARE_ORPHAN_STATE",
        message: `Hardware row "${row.label}" maps unknown virtual state ${row.virtualStateId}.`,
        relatedIds: [row.id, row.virtualStateId],
        engine: "hardware",
      });
    }
    if (row.outputKind === "sensor" && !row.port.trim()) {
      issues.push({
        id: `hardware_sensor_port_${row.id}`,
        severity: "warning",
        code: "HARDWARE_SENSOR_PORT",
        message: `Sensor "${row.label}" needs a register port.`,
        relatedIds: [row.id],
        engine: "hardware",
      });
    }
  }

  const mappedStateIds = new Set(snapshot.hardwareMappings.map((m) => m.virtualStateId));
  for (const vs of snapshot.virtualStates) {
    if (vs.source === "sensor" && !mappedStateIds.has(vs.id)) {
      issues.push({
        id: `sensor_unmapped_${vs.id}`,
        severity: "warning",
        code: "SENSOR_UNMAPPED",
        message: `Sensor register "${vs.label}" is not wired in the hardware matrix.`,
        relatedIds: [vs.id],
        engine: "hardware",
      });
    }
  }

  return issues;
};

const graphNodeExists = (snapshot: CreativeEnginesSnapshot, nodeId: string): boolean =>
  snapshot.puzzleNodes.some((n) => n.id === nodeId) ||
  nodeId === "start" ||
  nodeId === "finale" ||
  nodeId.startsWith("gateway_") ||
  nodeId.startsWith("code_");

/** After deleting a narrative node, return puzzle nodes whose narrativeTriggerId is now broken. */
export const findBrokenPuzzleDepsAfterNarrativeDelete = (
  deletedNode: NarrativeTimelineNode,
  puzzleNodes: PuzzleDependencyNode[],
): PuzzleDependencyNode[] => {
  const refs = new Set<string>([deletedNode.id]);
  if (deletedNode.triggerRef) refs.add(deletedNode.triggerRef);
  if (deletedNode.dialogueTrigger) refs.add(deletedNode.dialogueTrigger);
  return puzzleNodes.filter((n) => n.narrativeTriggerId && refs.has(n.narrativeTriggerId));
};

/** Register a sensor in virtual states and optionally seed a hardware matrix row. */
export const registerSensorVirtualState = (
  sensorId: string,
  label: string,
  port: string,
  existing: Pick<CreativeEnginesSnapshot, "virtualStates" | "hardwareMappings">,
): Pick<CreativeEnginesSnapshot, "virtualStates" | "hardwareMappings"> => {
  const vsId = sensorVirtualStateId(sensorId);
  if (existing.virtualStates.some((v) => v.id === vsId)) {
    return existing;
  }
  const virtualStates: VirtualStateRef[] = [
    ...existing.virtualStates,
    { id: vsId, label, source: "sensor", sourceId: sensorId },
  ];
  const hardwareMappings: HardwareMappingRow[] = [
    ...existing.hardwareMappings,
    {
      id: `hw_${vsId}`,
      virtualStateId: vsId,
      outputKind: "sensor",
      port,
      label,
      enabled: true,
    },
  ];
  return { virtualStates, hardwareMappings };
};

export type SimulatorEvent =
  | { type: "puzzle_solved"; puzzleId: string; virtualStateId: string }
  | { type: "narrative_advance"; nodeId: string; actIndex: number }
  | { type: "hardware_output"; mappingId: string; outputKind: HardwareOutputKind; value: string | number };

export const resolveSimulatorOutputs = (
  snapshot: CreativeEnginesSnapshot,
  puzzleId: string,
): SimulatorEvent[] => {
  const vsId = puzzleVirtualStateId(puzzleId);
  const events: SimulatorEvent[] = [
    { type: "puzzle_solved", puzzleId, virtualStateId: vsId },
  ];
  const mappings = snapshot.hardwareMappings.filter((m) => m.virtualStateId === vsId && m.enabled);
  for (const mapping of mappings) {
    events.push({
      type: "hardware_output",
      mappingId: mapping.id,
      outputKind: mapping.outputKind,
      value: mapping.outputKind === "dmx" ? 65280 : 1,
    });
  }
  const narrative = snapshot.narrativeNodes.find((n) => n.puzzleIds.includes(puzzleId) && n.kind === "act");
  if (narrative) {
    events.push({ type: "narrative_advance", nodeId: narrative.id, actIndex: narrative.actIndex });
  }
  return events;
};
