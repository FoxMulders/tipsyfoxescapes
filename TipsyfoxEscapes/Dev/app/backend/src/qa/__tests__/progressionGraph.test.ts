import { describe, expect, it } from "vitest";
import { buildProgressionGraph, deriveStoryViewsFromGraph } from "../../../../shared/progressionGraph.js";

const samplePuzzles = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `pz_${i + 1}`,
    title: `Puzzle ${i + 1}`,
    category: i % 3 === 0 ? "logic" : i % 3 === 1 ? "physical" : "electronic",
    physical_anchor_prop: i === 0 ? "Wall map" : i === 2 ? "Locked cabinet" : undefined,
  }));

describe("progressionGraph", () => {
  it("builds parallel threads from session puzzles, not fixed example labels", () => {
    const graph = buildProgressionGraph({
      puzzles: samplePuzzles(6),
      playersConcurrent: 6,
      inventoryItems: ["sofa", "TV"],
      environmentType: "Living room",
      pathKind: "nonlinear",
    });
    expect(graph.threads.length).toBeGreaterThan(1);
    const labels = graph.threads.map((t) => t.label).join(" ");
    expect(labels).not.toMatch(/Globe|RFID Safe|Library Laptop|8413|213/i);
    expect(labels).toMatch(/Wall map|sofa|TV|station/i);
  });

  it("derives a master code from puzzle ids, not a hardcoded template", () => {
    const puzzles = samplePuzzles(5);
    const graph = buildProgressionGraph({
      puzzles,
      playersConcurrent: 4,
      pathKind: "multilinear",
    });
    expect(graph.masterCodeLabel.length).toBeGreaterThan(0);
    expect(graph.masterCodeLabel).not.toBe("213");
    expect(graph.masterCodeLabel).not.toBe("8413");
    const views = deriveStoryViewsFromGraph(graph, puzzles, "Escape before time runs out.", "Basement", {
      mid: "Mid beat.",
      final: "Final beat.",
    });
    expect(views.stages.length).toBeGreaterThan(0);
    expect(views.progressionRule).toMatch(/parallel|merge|finale/i);
    expect(views.progressionRule).not.toMatch(/Globe|RFID Safe|Library Laptop/i);
    expect(views.puzzleLinks.length).toBe(5);
  });

  it("linear path uses a single track chain", () => {
    const puzzles = samplePuzzles(3);
    const graph = buildProgressionGraph({
      puzzles,
      playersConcurrent: 2,
      pathKind: "linear",
    });
    expect(graph.parallelWidth).toBe(1);
    expect(graph.threads).toHaveLength(1);
    expect(graph.threads[0]?.puzzleIds).toEqual(["pz_1", "pz_2", "pz_3"]);
    const finaleEdges = graph.edges.filter((e) => e.to === "finale");
    expect(finaleEdges.length).toBeGreaterThan(0);
  });

  it("includes cross-track edges when multiple threads exist", () => {
    const graph = buildProgressionGraph({
      puzzles: samplePuzzles(6),
      playersConcurrent: 6,
      pathKind: "nonlinear",
    });
    const cross = graph.edges.filter((e) => e.label === "Cross-track clue");
    expect(cross.length).toBeGreaterThan(0);
  });
});
