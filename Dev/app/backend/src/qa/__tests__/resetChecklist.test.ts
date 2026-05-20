import { describe, expect, it } from "vitest";
import { buildResetChecklistSteps, validateResetChecklistCoverage } from "../resetChecklist.js";

describe("Interactive reset checklist validation", () => {
  const input = {
    puzzles: [
      { id: "p1", title: "Cipher Index", category: "logic" as const },
      { id: "p2", title: "Signal Panel", category: "electronic" as const },
    ],
    availableItems: ["Brass key", "UV lamp"],
  };

  it("builds steps covering electronics, puzzles, and props", () => {
    const steps = buildResetChecklistSteps(input);
    const joined = steps.join("\n");
    expect(joined).toMatch(/power down|electronic/i);
    expect(joined).toContain("Cipher Index");
    expect(joined).toContain("Signal Panel");
    expect(joined).toContain("Brass key");
    expect(validateResetChecklistCoverage(steps, input)).toHaveLength(0);
  });

  it("fails validation when electronic power-down step is missing", () => {
    const badSteps = [
      "Reset locks only.",
      "Puzzle 1 — Cipher Index: restore props.",
      'Return "Brass key" to home.',
    ];
    const issues = validateResetChecklistCoverage(badSteps, input);
    expect(issues.some((i) => i.code === "RESET_MISSING_ELECTRONICS")).toBe(true);
    expect(issues.some((i) => i.code === "RESET_MISSING_PUZZLE")).toBe(true);
  });
});
