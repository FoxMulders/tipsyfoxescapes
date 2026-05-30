import type { Edge, Node } from "@xyflow/react";
import type { RoomSkeleton, RoomZone } from "../../../../shared/roomSkeleton";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import { BLUEPRINT_ORIGIN_X, BLUEPRINT_ORIGIN_Y } from "./skeletonFlowGraph";

export type ZoneNodeData = {
  kind: "zone";
  label: string;
  action: string;
  hardware?: string;
  zoneId: string;
  row: number;
  col: number;
};

export type PuzzleNodeData = {
  kind: "puzzle";
  puzzleId: string;
  title: string;
  category: string;
  objective: string;
  zoneId: string;
  narrativeHook?: string;
  row: number;
  col: number;
};

export type FlowNodeData = ZoneNodeData | PuzzleNodeData;

export type LinearFlowStep = {
  order: number;
  kind: "zone" | "puzzle";
  id: string;
  label: string;
  detail?: string;
};

export type FlowGraphLayout = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  layoutMode: "grid" | "linear";
  linearSteps: LinearFlowStep[];
};

const EDGE_STYLE = { stroke: "#5b8fd9", strokeWidth: 2 };
const FLOW_EDGE_STYLE = { stroke: "#22d3ee", strokeWidth: 2.5 };

/** Minimum edge-to-edge buffer between node bounding boxes (px). */
export const GRID_MIN_H_GAP = 300;
export const GRID_MIN_V_GAP = 200;

const ZONE_WIDTH = 260;
const ZONE_HEIGHT = 160;
const PUZZLE_WIDTH = 240;
const PUZZLE_HEIGHT = 170;

const estimateNodeSize = (node: Node<FlowNodeData>): { w: number; h: number } => {
  if (node.type === "blueprintZone") return { w: ZONE_WIDTH, h: ZONE_HEIGHT };
  return { w: PUZZLE_WIDTH, h: PUZZLE_HEIGHT };
};

type Bounds = { x: number; y: number; w: number; h: number };

const nodeBounds = (node: Node<FlowNodeData>): Bounds => {
  const size = estimateNodeSize(node);
  return {
    x: node.position.x,
    y: node.position.y,
    w: size.w,
    h: size.h,
  };
};

/** True when horizontal and vertical edge gaps are both below required minimums (overlap / too tight). */
export const nodesViolateMinGap = (
  a: Node<FlowNodeData>,
  b: Node<FlowNodeData>,
  minH = GRID_MIN_H_GAP,
  minV = GRID_MIN_V_GAP,
): boolean => {
  const ba = nodeBounds(a);
  const bb = nodeBounds(b);
  // React Flow positions are top-left; measure edge-to-edge separation.
  const hGap = Math.max(ba.x - (bb.x + bb.w), bb.x - (ba.x + ba.w));
  const vGap = Math.max(ba.y - (bb.y + bb.h), bb.y - (ba.y + ba.h));
  return hGap < minH && vGap < minV;
};

export const layoutHasCollisionViolations = (nodes: Node<FlowNodeData>[]): boolean => {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (nodesViolateMinGap(nodes[i], nodes[j])) return true;
    }
  }
  return false;
};

function zoneGridPosition(col: number, row = 0): { x: number; y: number } {
  return {
    x: BLUEPRINT_ORIGIN_X + col * (ZONE_WIDTH + GRID_MIN_H_GAP),
    y: BLUEPRINT_ORIGIN_Y + row * (ZONE_HEIGHT + GRID_MIN_V_GAP),
  };
}

function puzzleGridPosition(zoneCol: number, stackIndex: number, zonePos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: zonePos.x,
    y: zonePos.y + ZONE_HEIGHT + GRID_MIN_V_GAP + stackIndex * (PUZZLE_HEIGHT + GRID_MIN_V_GAP),
  };
}

function buildLinearSteps(zones: RoomZone[], puzzles: PuzzleInspectorSlice[]): LinearFlowStep[] {
  const steps: LinearFlowStep[] = [];
  let order = 1;
  for (const zone of zones) {
    steps.push({
      order: order++,
      kind: "zone",
      id: zone.zone_id,
      label: zone.name,
      detail: zone.primary_player_action,
    });
  }
  for (const puzzle of puzzles) {
    steps.push({
      order: order++,
      kind: "puzzle",
      id: puzzle.id,
      label: puzzle.title,
      detail: puzzle.objective,
    });
  }
  return steps;
}

/** Grid placement by room order (Entry → … → Airlock); linear fallback when spacing cannot be guaranteed. */
export function generationToFlowGraph(
  skeleton: RoomSkeleton | null,
  puzzles: PuzzleInspectorSlice[],
): FlowGraphLayout {
  if (!skeleton?.zones?.length) {
    return { nodes: [], edges: [], layoutMode: "grid", linearSteps: [] };
  }

  const zones = skeleton.zones.filter((z: RoomZone) => z.zone_id.trim() && z.name.trim());
  const nodes: Node<FlowNodeData>[] = zones.map((zone: RoomZone, index: number) => {
    const col = index;
    const row = 0;
    const position = zoneGridPosition(col, row);
    return {
      id: zone.zone_id,
      type: "blueprintZone",
      position,
      draggable: false,
      data: {
        kind: "zone",
        zoneId: zone.zone_id,
        label: zone.name,
        action: zone.primary_player_action,
        hardware: zone.suggested_hardware_profile,
        row,
        col,
      },
    };
  });

  const edges: Edge[] = [];

  if (skeleton.flow_pattern === "nonlinear_open") {
    for (let i = 1; i < zones.length; i += 1) {
      edges.push({
        id: `flow-${zones[0].zone_id}-${zones[i].zone_id}`,
        source: zones[0].zone_id,
        target: zones[i].zone_id,
        sourceHandle: "door-out",
        targetHandle: "door-in",
        animated: true,
        style: FLOW_EDGE_STYLE,
      });
    }
  } else {
    for (let i = 0; i < zones.length - 1; i += 1) {
      edges.push({
        id: `flow-${zones[i].zone_id}-${zones[i + 1].zone_id}`,
        source: zones[i].zone_id,
        target: zones[i + 1].zone_id,
        sourceHandle: "door-out",
        targetHandle: "door-in",
        animated: true,
        style: FLOW_EDGE_STYLE,
      });
    }
  }

  if (puzzles.length > 0 && zones.length > 0) {
    const puzzlesPerZone = Math.max(1, Math.ceil(puzzles.length / zones.length));
    puzzles.forEach((puzzle, index) => {
      const zoneIndex = Math.min(zones.length - 1, Math.floor(index / puzzlesPerZone));
      const zone = zones[zoneIndex];
      const zoneNode = nodes.find((n) => n.id === zone.zone_id);
      if (!zoneNode) return;

      const stackIndex = index % puzzlesPerZone;
      const zoneCol = zoneIndex;
      const puzzleNodeId = `puzzle-${puzzle.id}`;
      const position = puzzleGridPosition(zoneCol, stackIndex, zoneNode.position);

      nodes.push({
        id: puzzleNodeId,
        type: "puzzleBeat",
        position,
        draggable: false,
        data: {
          kind: "puzzle",
          puzzleId: puzzle.id,
          title: puzzle.title,
          category: puzzle.category,
          objective: puzzle.objective,
          zoneId: zone.zone_id,
          narrativeHook: puzzle.narrativeHook,
          row: stackIndex + 1,
          col: zoneCol,
        },
      });

      edges.push({
        id: `link-${zone.zone_id}-${puzzleNodeId}`,
        source: zone.zone_id,
        target: puzzleNodeId,
        sourceHandle: "door-s-out",
        targetHandle: "puzzle-in",
        animated: false,
        style: EDGE_STYLE,
      });
    });
  }

  const linearSteps = buildLinearSteps(zones, puzzles);
  const layoutMode = layoutHasCollisionViolations(nodes) ? "linear" : "grid";

  return {
    nodes: layoutMode === "grid" ? nodes : [],
    edges: layoutMode === "grid" ? edges : [],
    layoutMode,
    linearSteps,
  };
}
