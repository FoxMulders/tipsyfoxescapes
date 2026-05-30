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
};

export type FlowNodeData = ZoneNodeData | PuzzleNodeData;

const EDGE_STYLE = { stroke: "#5b8fd9", strokeWidth: 2 };
const FLOW_EDGE_STYLE = { stroke: "#22d3ee", strokeWidth: 2.5 };

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
    puzzles.forEach((puzzle, index) => {
      const zoneIndex = index % zones.length;
      const zone = zones[zoneIndex];
      const zoneNode = nodes.find((n) => n.id === zone.zone_id);
      if (!zoneNode) return;

      const puzzleNodeId = `puzzle-${puzzle.id}`;
      const colOffset = Math.floor(index / zones.length);
      nodes.push({
        id: puzzleNodeId,
        type: "puzzleBeat",
        position: {
          x: zoneNode.position.x + colOffset * 24,
          y: zoneNode.position.y + BLUEPRINT_NODE_GAP_Y * 0.85,
        },
        draggable: true,
        data: {
          kind: "puzzle",
          puzzleId: puzzle.id,
          title: puzzle.title,
          category: puzzle.category,
          objective: puzzle.objective,
          zoneId: zone.zone_id,
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

  return { nodes, edges };
}

export { BLUEPRINT_NODE_GAP_X, BLUEPRINT_NODE_GAP_Y, BLUEPRINT_ORIGIN_X, BLUEPRINT_ORIGIN_Y, zonePosition };
