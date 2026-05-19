import { describe, expect, it } from "vitest";
import { redactPuzzlesForClient, stripMakerElectronicsFromPuzzles, toPuzzlePreview } from "../../puzzlePresentation.js";

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

  it("stripMakerElectronicsFromPuzzles removes wiring and firmware", () => {
    const electronic = {
      id: "pz_e",
      category: "electronic",
      title: "Panel",
      objective: "Wire it",
      difficulty: "medium",
      electronicDetails: {
        parts: ["Arduino"],
        wiringDiagram: ["D2 in"],
        buildSteps: ["Solder"],
        arduinoCode: "void setup(){}",
        wiringDiagramSvg: "<svg/>",
      },
    };
    const stripped = stripMakerElectronicsFromPuzzles([electronic], false)[0];
    expect(stripped.electronicDetails?.parts).toEqual(["Arduino"]);
    expect(stripped.electronicDetails?.wiringDiagram).toEqual([]);
    expect(stripped.electronicDetails?.arduinoCode).toBe("");
  });
});
