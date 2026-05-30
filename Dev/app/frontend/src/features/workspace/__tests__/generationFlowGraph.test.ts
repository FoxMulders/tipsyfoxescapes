import { describe, expect, it } from "vitest";
import type { RoomSkeleton } from "../../../../../shared/roomSkeleton";
import { generationToFlowGraph } from "../generationFlowGraph";

const skeleton: RoomSkeleton = {
  flow_pattern: "linear_4zone",
  flow_summary: "Four rooms in sequence.",
  zones: [
    { zone_id: "z1", name: "Entry", primary_player_action: "Find key", suggested_hardware_profile: "print_and_play" },
    { zone_id: "z2", name: "Lab", primary_player_action: "Mix formula", suggested_hardware_profile: "analog_sensor" },
  ],
};

const puzzles = [
  { id: "p1", title: "Cipher Lock", category: "logic", objective: "Decode the wall symbols." },
  { id: "p2", title: "Pressure Plate", category: "physical", objective: "Align weights on the floor." },
];

describe("generationToFlowGraph", () => {
  it("maps zones left-to-right and attaches puzzle beats beneath zones", () => {
    const { nodes, edges } = generationToFlowGraph(skeleton, puzzles);
    const zoneNodes = nodes.filter((n) => n.type === "blueprintZone");
    const puzzleNodes = nodes.filter((n) => n.type === "puzzleBeat");

    expect(zoneNodes).toHaveLength(2);
    expect(puzzleNodes).toHaveLength(2);
    expect(zoneNodes[1].position.x).toBeGreaterThan(zoneNodes[0].position.x);
    expect(puzzleNodes[0].position.y).toBeGreaterThan(zoneNodes[0].position.y);
    expect(edges.some((e) => e.id === "flow-z1-z2")).toBe(true);
    expect(edges.some((e) => e.source === "z1" && e.target === "puzzle-p1")).toBe(true);
  });

  it("returns empty graph when skeleton has no zones", () => {
    const { nodes, edges } = generationToFlowGraph(null, puzzles);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});
