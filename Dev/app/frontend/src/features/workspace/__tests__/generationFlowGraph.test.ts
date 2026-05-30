import { describe, expect, it } from "vitest";
import type { RoomSkeleton } from "../../../../../shared/roomSkeleton";
import {
  generationToFlowGraph,
  GRID_MIN_H_GAP,
  GRID_MIN_V_GAP,
  layoutHasCollisionViolations,
  nodesViolateMinGap,
} from "../generationFlowGraph";

const skeleton: RoomSkeleton = {
  flow_pattern: "linear_4zone",
  flow_summary: "Entry → Gallery → Workshop → Airlock.",
  zones: [
    { zone_id: "z1", name: "Entry", primary_player_action: "Find key", suggested_hardware_profile: "print_and_play" },
    { zone_id: "z2", name: "Gallery", primary_player_action: "Decode symbols", suggested_hardware_profile: "analog_sensor" },
    { zone_id: "z3", name: "Workshop", primary_player_action: "Assemble clue", suggested_hardware_profile: "print_and_play" },
    { zone_id: "z4", name: "Airlock", primary_player_action: "Release exit", suggested_hardware_profile: "relay_maglock" },
  ],
};

const puzzles = [
  { id: "p1", title: "Clockwork Clue", category: "logic", objective: "Decode the haunted toy inventory tags." },
  { id: "p2", title: "Spirit Shelf", category: "physical", objective: "Balance the possessed marionette weights." },
  { id: "p3", title: "Shopkeeper Seal", category: "electronic", objective: "Align the cursed music-box sequence." },
];

describe("generationToFlowGraph", () => {
  it("maps zones left-to-right with grid row/col and attaches puzzle beats beneath zones", () => {
    const { nodes, edges, layoutMode } = generationToFlowGraph(skeleton, puzzles);
    expect(layoutMode).toBe("grid");

    const zoneNodes = nodes.filter((n) => n.type === "blueprintZone");
    const puzzleNodes = nodes.filter((n) => n.type === "puzzleBeat");

    expect(zoneNodes).toHaveLength(4);
    expect(puzzleNodes).toHaveLength(3);
    expect(zoneNodes[1].position.x - zoneNodes[0].position.x).toBeGreaterThanOrEqual(GRID_MIN_H_GAP);
    expect(puzzleNodes[0].position.y).toBeGreaterThan(zoneNodes[0].position.y + GRID_MIN_V_GAP);
    expect(zoneNodes[1].data.kind === "zone" && zoneNodes[1].data.col).toBe(1);
    expect(edges.some((e) => e.id === "flow-z1-z2")).toBe(true);
    expect(edges.some((e) => e.source === "z1" && e.target === "puzzle-p1")).toBe(true);
    expect(layoutHasCollisionViolations(nodes)).toBe(false);
  });

  it("returns empty graph when skeleton has no zones", () => {
    const { nodes, edges } = generationToFlowGraph(null, puzzles);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("detects collision violations below minimum gap", () => {
    const tightA = { id: "a", type: "blueprintZone" as const, position: { x: 0, y: 0 }, data: { kind: "zone" as const, zoneId: "a", label: "A", action: "", row: 0, col: 0 } };
    const tightB = { id: "b", type: "blueprintZone" as const, position: { x: 10, y: 10 }, data: { kind: "zone" as const, zoneId: "b", label: "B", action: "", row: 0, col: 1 } };
    expect(nodesViolateMinGap(tightA, tightB)).toBe(true);
  });
});
