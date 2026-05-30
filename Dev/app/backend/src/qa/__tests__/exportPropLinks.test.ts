import { describe, expect, it } from "vitest";
import { buildPropPuzzleLinkTable, buildStagingInventorySection } from "../../exportRunbook.js";

describe("export prop-puzzle sections", () => {
  it("builds prop link table for puzzle carriers", () => {
    const lines = buildPropPuzzleLinkTable([
      {
        id: "p1",
        title: "Dial the orrery",
        category: "logic",
        difficulty: "medium",
        objective: "3-digit code",
        howItWorks: "Turn brass rings",
        solveSteps: [],
        referenceLinks: [],
        propPuzzleLink: {
          propId: "inv1",
          propLabel: "Brass orrery",
          logicKernel: "align rings",
          clueDelivers: "3-digit code",
        },
      },
    ]);
    expect(lines.join("\n")).toContain("Brass orrery");
    expect(lines.join("\n")).toContain("Dial the orrery");
  });

  it("builds staging section for set dressing", () => {
    const lines = buildStagingInventorySection([
      { name: "Velvet rug", role: "set_dressing", stagingNotes: "Center of study" },
    ]);
    expect(lines.join("\n")).toContain("Velvet rug");
    expect(lines.join("\n")).toContain("set dressing");
  });
});
