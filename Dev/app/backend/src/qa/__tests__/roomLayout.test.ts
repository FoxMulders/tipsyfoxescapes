import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROOM_LAYOUT,
  formatRoomLayoutMarkdown,
  validateRoomLayout,
  countPlacedPuzzleNodes,
} from "../../../../shared/roomLayout.js";

describe("validateRoomLayout", () => {
  it("accepts a minimal valid document", () => {
    const parsed = validateRoomLayout(DEFAULT_ROOM_LAYOUT);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(1);
    expect(parsed?.elements.length).toBeGreaterThan(0);
  });

  it("rejects out-of-bounds elements", () => {
    const parsed = validateRoomLayout({
      ...DEFAULT_ROOM_LAYOUT,
      elements: [{ id: "a", kind: "prop", label: "Desk", xM: 99, yM: 1 }],
    });
    expect(parsed).toBeNull();
  });

  it("rejects unknown element kinds", () => {
    const parsed = validateRoomLayout({
      ...DEFAULT_ROOM_LAYOUT,
      elements: [{ id: "a", kind: "window", label: "Window", xM: 1, yM: 1 }],
    });
    expect(parsed).toBeNull();
  });
});

describe("countPlacedPuzzleNodes", () => {
  it("counts puzzle_node elements only", () => {
    const layout = validateRoomLayout({
      ...DEFAULT_ROOM_LAYOUT,
      elements: [
        { id: "p1", kind: "puzzle_node", label: "Node A", xM: 1, yM: 1 },
        { id: "p2", kind: "prop", label: "Prop", xM: 2, yM: 2 },
        { id: "p3", kind: "puzzle_node", label: "Node B", xM: 3, yM: 3 },
      ],
    });
    expect(layout).not.toBeNull();
    expect(countPlacedPuzzleNodes(layout!)).toBe(2);
  });
});

describe("formatRoomLayoutMarkdown", () => {
  it("returns placeholder when layout is missing", () => {
    expect(formatRoomLayoutMarkdown(undefined)).toEqual(["_No floor-plan elements placed in the layout designer._"]);
  });

  it("includes placed elements in export snippet", () => {
    const layout = validateRoomLayout({
      ...DEFAULT_ROOM_LAYOUT,
      elements: [{ id: "w1", kind: "wall", label: "North wall", xM: 4, yM: 0.5 }],
    });
    const lines = formatRoomLayoutMarkdown(layout ?? undefined);
    expect(lines.some((l) => l.includes("North wall"))).toBe(true);
  });
});
