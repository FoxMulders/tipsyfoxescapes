import type { Edge, Node } from "@xyflow/react";
import type { RoomSkeleton, RoomZone } from "../../../../shared/roomSkeleton";

export type ZoneNodeData = {
  label: string;
  action: string;
  hardware?: string;
  zoneId: string;
};

const PLACEHOLDER_NODES: Node<ZoneNodeData>[] = [
  {
    id: "placeholder-entry",
    type: "zone",
    position: { x: 40, y: 120 },
    data: {
      zoneId: "placeholder-entry",
      label: "Entry briefing",
      action: "Orient players and set the story hook.",
    },
  },
  {
    id: "placeholder-core",
    type: "zone",
    position: { x: 320, y: 80 },
    data: {
      zoneId: "placeholder-core",
      label: "Core challenge",
      action: "Main puzzle beat — generate skeleton to customize.",
    },
  },
  {
    id: "placeholder-finale",
    type: "zone",
    position: { x: 600, y: 140 },
    data: {
      zoneId: "placeholder-finale",
      label: "Finale",
      action: "Escape or unlock moment.",
    },
  },
];

const PLACEHOLDER_EDGES: Edge[] = [
  { id: "pe-1", source: "placeholder-entry", target: "placeholder-core", animated: true },
  { id: "pe-2", source: "placeholder-core", target: "placeholder-finale", animated: true },
];

function zonePosition(index: number, total: number, pattern: RoomSkeleton["flow_pattern"]): { x: number; y: number } {
  if (pattern === "nonlinear_open") {
    const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: 40 + col * 200, y: 40 + row * 140 };
  }
  const y = pattern === "multilinear" ? (index % 2 === 0 ? 60 : 160) : 100;
  return { x: 40 + index * 220, y };
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
      type: "zone",
      position: pos,
      data: {
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
        id: `e-${zones[0].zone_id}-${zones[i].zone_id}`,
        source: zones[0].zone_id,
        target: zones[i].zone_id,
        animated: true,
        style: { stroke: "#22d3ee", strokeWidth: 2 },
      });
    }
  } else {
    for (let i = 0; i < zones.length - 1; i += 1) {
      edges.push({
        id: `e-${zones[i].zone_id}-${zones[i + 1].zone_id}`,
        source: zones[i].zone_id,
        target: zones[i + 1].zone_id,
        animated: true,
        style: { stroke: "#22d3ee", strokeWidth: 2 },
      });
    }
  }

  return { nodes, edges };
}
