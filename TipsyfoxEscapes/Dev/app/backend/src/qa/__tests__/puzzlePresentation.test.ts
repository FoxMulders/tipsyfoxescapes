import { describe, expect, it } from "vitest";
import { redactPuzzlesForClient, toPuzzlePreview } from "../../puzzlePresentation.js";

const samplePuzzle = {
  id: "pz_1",
  category: "logic",
  title: "Laser Maze Deduction",
  objective: "Decode the beam path using mirrors.",
  difficulty: "medium",
};

describe("puzzlePresentation", () => {
  it("returns preview labels when not paid", () => {
    const out = redactPuzzlesForClient([samplePuzzle], false);
    expect(out).toHaveLength(1);
    const preview = out[0] as ReturnType<typeof toPuzzlePreview>;
    expect(preview.locked).toBe(true);
    expect(preview.previewLabel).toContain("Puzzle 1:");
    expect(preview.previewLabel).toContain("Laser Maze");
    expect("objective" in preview).toBe(false);
  });

  it("returns full puzzles when access granted", () => {
    const out = redactPuzzlesForClient([samplePuzzle], true);
    expect(out[0]).toMatchObject({ objective: samplePuzzle.objective });
  });
});
