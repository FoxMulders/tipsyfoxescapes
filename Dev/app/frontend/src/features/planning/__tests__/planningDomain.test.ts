import { describe, expect, it } from "vitest";
import { estimatePuzzleNodes, estimateJuniorAddOnSlots } from "../domain/estimatePuzzleNodes";
import { collectStrictPlanningMissing } from "../domain/validation";
import { buildPlanningBody } from "../domain/buildPlanningBody";
import { DEFAULT_PLANNING_FORM_STATE } from "../domain/planningTypes";
import { snapMeters } from "../layout-designer/layoutScene";
import { planningReducer } from "../context/planningReducer";

describe("estimatePuzzleNodes", () => {
  it("returns 1 for very short sessions", () => {
    expect(estimatePuzzleNodes(6, 5)).toBe(1);
  });

  it("scales with duration and headcount", () => {
    expect(estimatePuzzleNodes(6, 45)).toBeGreaterThan(3);
  });
});

describe("validation", () => {
  it("flags headcount order", () => {
    const missing = collectStrictPlanningMissing({
      ...DEFAULT_PLANNING_FORM_STATE,
      playersConcurrent: "8",
      participantsTotal: "4",
      sessionDurationMinutes: "45",
      environmentType: "Living room",
    });
    expect(missing).toContain("headcountOrder");
  });
});

describe("buildPlanningBody", () => {
  it("builds strict body when valid", () => {
    const body = buildPlanningBody(
      {
        ...DEFAULT_PLANNING_FORM_STATE,
        playersConcurrent: "4",
        participantsTotal: "8",
        sessionDurationMinutes: "45",
        environmentType: "Living room",
      },
      "strict",
    );
    expect(body?.playersConcurrent).toBe(4);
    expect(body?.environmentType).toBe("Living room");
  });
});

describe("layout snap", () => {
  it("snaps to half meter grid", () => {
    expect(snapMeters(1.2, 0.5, true)).toBe(1);
    expect(snapMeters(1.3, 0.5, true)).toBe(1.5);
  });
});

describe("planningReducer layout place", () => {
  it("adds prop to available items when placing linked prop", () => {
    const next = planningReducer(DEFAULT_PLANNING_FORM_STATE, {
      type: "LAYOUT_PLACE",
      element: { kind: "prop", label: "Fake gauge", xM: 1, yM: 1, meta: { propKey: "Fake gauge" } },
    });
    expect(next.availableItems).toContain("Fake gauge");
    expect(next.roomLayout.elements.length).toBe(DEFAULT_PLANNING_FORM_STATE.roomLayout.elements.length + 1);
  });
});

describe("junior slots", () => {
  it("returns 0 when disabled", () => {
    expect(estimateJuniorAddOnSlots(45, false)).toBe(0);
  });
});
