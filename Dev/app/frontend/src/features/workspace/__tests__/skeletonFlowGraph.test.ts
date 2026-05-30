import { describe, expect, it } from "vitest";
import { BLUEPRINT_NODE_GAP_X, BLUEPRINT_ORIGIN_X, zonePosition } from "../skeletonFlowGraph";

describe("zonePosition", () => {
  it("lays linear zones out left-to-right on the x axis", () => {
    const a = zonePosition(0, 4, "linear_4zone");
    const b = zonePosition(1, 4, "linear_4zone");
    const c = zonePosition(2, 4, "linear_4zone");
    expect(b.x - a.x).toBe(BLUEPRINT_NODE_GAP_X);
    expect(c.x - b.x).toBe(BLUEPRINT_NODE_GAP_X);
    expect(a.y).toBe(b.y);
  });

  it("staggers multilinear zones on two horizontal tracks", () => {
    const first = zonePosition(0, 4, "multilinear");
    const second = zonePosition(1, 4, "multilinear");
    const third = zonePosition(2, 4, "multilinear");
    expect(first.x).toBe(BLUEPRINT_ORIGIN_X);
    expect(second.x).toBe(BLUEPRINT_ORIGIN_X);
    expect(third.x).toBeGreaterThan(first.x);
    expect(first.y).not.toBe(second.y);
  });

  it("fans nonlinear zones from a hub to the right", () => {
    const hub = zonePosition(0, 4, "nonlinear_open");
    const branch = zonePosition(1, 4, "nonlinear_open");
    expect(branch.x).toBeGreaterThan(hub.x);
  });
});
