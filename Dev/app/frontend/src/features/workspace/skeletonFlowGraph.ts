import type { Edge, Node } from "@xyflow/react";
import type { RoomSkeleton, RoomZone } from "../../../../shared/roomSkeleton";

export type ZoneNodeData = {
  label: string;
  action: string;
  hardware?: string;
  zoneId: string;
};

/** Horizontal left-to-right floor-plan spacing (px). */
export const BLUEPRINT_NODE_GAP_X = 350;
export const BLUEPRINT_NODE_GAP_Y = 130;
export const BLUEPRINT_ORIGIN_X = 48;
export const BLUEPRINT_ORIGIN_Y = 96;

const PLACEHOLDER_NODES: Node<ZoneNodeData>[] = [
  {
    id: "placeholder-entry",
    type: "blueprintZone",
    position: { x: BLUEPRINT_ORIGIN_X, y: BLUEPRINT_ORIGIN_Y },
    data: {
      zoneId: "placeholder-entry",
      label: "Entry Antechamber",
      action: "Players receive briefing and initial orientation in this vestibule.",
    },
  },
  {
    id: "placeholder-core",
    type: "blueprintZone",
    position: { x: BLUEPRINT_ORIGIN_X + BLUEPRINT_NODE_GAP_X, y: BLUEPRINT_ORIGIN_Y },
    data: {
      zoneId: "placeholder-core",
      label: "Main Workshop",
      action: "Central floor space for hands-on puzzle stations and prop tables.",
    },
  },
  {
    id: "placeholder-finale",
    type: "blueprintZone",
    position: { x: BLUEPRINT_ORIGIN_X + BLUEPRINT_NODE_GAP_X * 2, y: BLUEPRINT_ORIGIN_Y },
    data: {
      zoneId: "placeholder-finale",
      label: "Exit Airlock",
      action: "Final chamber with maglock or release mechanism leading out.",
    },
  },
];

const PLACEHOLDER_EDGES: Edge[] = [
  {
    id: "pe-1",
    source: "placeholder-entry",
    target: "placeholder-core",
    sourceHandle: "door-out",
    targetHandle: "door-in",
    animated: true,
    style: { stroke: "#5b8fd9", strokeWidth: 2 },
  },
  {
    id: "pe-2",
    source: "placeholder-core",
    target: "placeholder-finale",
    sourceHandle: "door-out",
    targetHandle: "door-in",
    animated: true,
    style: { stroke: "#5b8fd9", strokeWidth: 2 },
  },
];

/** Left-to-right floor plan layout — x is the primary axis. */
export function zonePosition(
  index: number,
  _total: number,
  pattern: RoomSkeleton["flow_pattern"],
): { x: number; y: number } {
  if (pattern === "nonlinear_open") {
    if (index === 0) {
      return { x: BLUEPRINT_ORIGIN_X, y: BLUEPRINT_ORIGIN_Y + BLUEPRINT_NODE_GAP_Y * 0.5 };
    }
    const branchIndex = index - 1;
    const col = 1 + Math.floor(branchIndex / 3);
    const row = branchIndex % 3;
    return {
      x: BLUEPRINT_ORIGIN_X + col * BLUEPRINT_NODE_GAP_X,
      y: BLUEPRINT_ORIGIN_Y + row * BLUEPRINT_NODE_GAP_Y,
    };
  }

  if (pattern === "multilinear") {
    const col = Math.floor(index / 2);
    const track = index % 2;
    return {
      x: BLUEPRINT_ORIGIN_X + col * BLUEPRINT_NODE_GAP_X,
      y: BLUEPRINT_ORIGIN_Y + track * BLUEPRINT_NODE_GAP_Y,
    };
  }

  return {
    x: BLUEPRINT_ORIGIN_X + index * BLUEPRINT_NODE_GAP_X,
    y: BLUEPRINT_ORIGIN_Y,
  };
}

export function roomSkeletonToFlowGraph(skeleton: RoomSkeleton | null): {
  nodes: Node<ZoneNodeData>[];
  edges: Edge[];
} {
  if (!skeleton?.zones?.length) {
    return { nodes: PLACEHOLDER_NODES, edges: PLACEHOLDER_EDGES };
  }

  const zones = skeleton.zones.filter((z: RoomZone) => z.zone_id.trim() && z.name.trim());
  const nodes: Node<ZoneNodeData>[] = zones.map((zone: RoomZone, index: number) => {
    const pos = zonePosition(index, zones.length, skeleton.flow_pattern);
    return {
      id: zone.zone_id,
      type: "blueprintZone",
      position: pos,
      draggable: true,
      data: {
        zoneId: zone.zone_id,
        label: zone.name,
        action: zone.primary_player_action,
        hardware: zone.suggested_hardware_profile,
      },
    };
  });

  const edgeStyle = { stroke: "#5b8fd9", strokeWidth: 2 };
  const edges: Edge[] = [];

  if (skeleton.flow_pattern === "nonlinear_open") {
    for (let i = 1; i < zones.length; i += 1) {
      edges.push({
        id: `e-${zones[0].zone_id}-${zones[i].zone_id}`,
        source: zones[0].zone_id,
        target: zones[i].zone_id,
        sourceHandle: "door-out",
        targetHandle: "door-in",
        animated: true,
        style: edgeStyle,
      });
    }
  } else {
    for (let i = 0; i < zones.length - 1; i += 1) {
      edges.push({
        id: `e-${zones[i].zone_id}-${zones[i + 1].zone_id}`,
        source: zones[i].zone_id,
        target: zones[i + 1].zone_id,
        sourceHandle: "door-out",
        targetHandle: "door-in",
        animated: true,
        style: edgeStyle,
      });
    }
  }

  return { nodes, edges };
}
