import type { Edge, Node } from "@xyflow/react";
import type { RoomSkeleton, RoomZone } from "../../../../shared/roomSkeleton";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import { BLUEPRINT_NODE_GAP_X, BLUEPRINT_NODE_GAP_Y, BLUEPRINT_ORIGIN_X, BLUEPRINT_ORIGIN_Y, zonePosition } from "./skeletonFlowGraph";

export type ZoneNodeData = {
  kind: "zone";
  label: string;
  action: string;
  hardware?: string;
  zoneId: string;
};

export type PuzzleNodeData = {
  kind: "puzzle";
  puzzleId: string;
  title: string;
  category: string;
  objective: string;
  zoneId: string;
  narrativeHook?: string;
};

export type FlowNodeData = ZoneNodeData | PuzzleNodeData;

const EDGE_STYLE = { stroke: "#5b8fd9", strokeWidth: 2 };
const FLOW_EDGE_STYLE = { stroke: "#22d3ee", strokeWidth: 2.5 };

const PUZZLE_NODE_ESTIMATED_HEIGHT = 170;
const PUZZLE_STACK_GAP = 56;
const ZONE_PUZZLE_OFFSET = 220;
const MIN_NODE_GAP = 40;

const estimateNodeSize = (node: Node<FlowNodeData>): { w: number; h: number } => {
  if (node.type === "blueprintZone") return { w: 260, h: 160 };
  return { w: 240, h: PUZZLE_NODE_ESTIMATED_HEIGHT };
};

/** Push overlapping nodes apart so every pair keeps at least MIN_NODE_GAP between bounds. */
function enforceMinimumSpacing(nodes: Node<FlowNodeData>[]): Node<FlowNodeData>[] {
  const placed = nodes.map((node) => ({ ...node, position: { ...node.position } }));

  for (let pass = 0; pass < 24; pass += 1) {
    let adjusted = false;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const aSize = estimateNodeSize(a);
        const bSize = estimateNodeSize(b);
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const overlapX = aSize.w / 2 + bSize.w / 2 + MIN_NODE_GAP - Math.abs(dx);
        const overlapY = aSize.h / 2 + bSize.h / 2 + MIN_NODE_GAP - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX >= overlapY) {
            const pushX = dx >= 0 ? overlapX : -overlapX;
            b.position.x += pushX / 2;
            a.position.x -= pushX / 2;
          } else {
            const pushY = dy >= 0 ? overlapY : -overlapY;
            b.position.y += pushY / 2;
            a.position.y -= pushY / 2;
          }
          adjusted = true;
        }
      }
    }
    if (!adjusted) break;
  }

  return placed;
}

/** Post-generation logic tree: zones L→R with linked puzzle beats beneath each zone. */
export function generationToFlowGraph(
  skeleton: RoomSkeleton | null,
  puzzles: PuzzleInspectorSlice[],
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  if (!skeleton?.zones?.length) {
    return { nodes: [], edges: [] };
  }

  const zones = skeleton.zones.filter((z: RoomZone) => z.zone_id.trim() && z.name.trim());
  const nodes: Node<FlowNodeData>[] = zones.map((zone: RoomZone, index: number) => {
    const pos = zonePosition(index, zones.length, skeleton.flow_pattern);
    return {
      id: zone.zone_id,
      type: "blueprintZone",
      position: pos,
      draggable: true,
      data: {
        kind: "zone",
        zoneId: zone.zone_id,
        label: zone.name,
        action: zone.primary_player_action,
        hardware: zone.suggested_hardware_profile,
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

  if (puzzles.length > 0) {
    const zoneStackCounts = new Map<string, number>();

    puzzles.forEach((puzzle, index) => {
      const zoneIndex = index % zones.length;
      const zone = zones[zoneIndex];
      const zoneNode = nodes.find((n) => n.id === zone.zone_id);
      if (!zoneNode) return;

      const stackIndex = zoneStackCounts.get(zone.zone_id) ?? 0;
      zoneStackCounts.set(zone.zone_id, stackIndex + 1);

      const puzzleNodeId = `puzzle-${puzzle.id}`;
      nodes.push({
        id: puzzleNodeId,
        type: "puzzleBeat",
        position: {
          x: zoneNode.position.x,
          y:
            zoneNode.position.y +
            ZONE_PUZZLE_OFFSET +
            stackIndex * (PUZZLE_NODE_ESTIMATED_HEIGHT + PUZZLE_STACK_GAP),
        },
        draggable: true,
        data: {
          kind: "puzzle",
          puzzleId: puzzle.id,
          title: puzzle.title,
          category: puzzle.category,
          objective: puzzle.objective,
          zoneId: zone.zone_id,
          narrativeHook: puzzle.narrativeHook,
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

  return { nodes: enforceMinimumSpacing(nodes), edges };
}

export { BLUEPRINT_NODE_GAP_X, BLUEPRINT_NODE_GAP_Y, BLUEPRINT_ORIGIN_X, BLUEPRINT_ORIGIN_Y, zonePosition };
