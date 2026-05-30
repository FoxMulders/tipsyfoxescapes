import { describe, expect, it } from "vitest";
import {
  migrateAvailableItemsToInventory,
  normalizeInventoryItems,
  puzzleEligibleInventory,
} from "../../../../shared/inventory.js";
import { isStaticCatalogTitle } from "../../staticCatalogTitles.js";
import { auditPuzzleQa } from "../../puzzleQa.js";
import { inferAffordancesFromName, findPuzzlesUsingProp } from "../../inventoryPlanning.js";

describe("inventory migration", () => {
  it("migrates legacy string arrays to InventoryItem", () => {
    const items = migrateAvailableItemsToInventory(["Brass compass", "Journal", "not specified yet"]);
    expect(items).toHaveLength(2);
    expect(items[0]?.status).toBe("use");
    expect(items[0]?.role).toBe("unassigned");
  });

  it("filters puzzle-eligible props", () => {
    const items = normalizeInventoryItems([
      { id: "a", name: "Trunk", status: "use", role: "puzzle_carrier" },
      { id: "b", name: "Rug", status: "use", role: "set_dressing" },
      { id: "c", name: "Keys", status: "exclude", role: "unassigned" },
    ]);
    const eligible = puzzleEligibleInventory(items);
    expect(eligible.map((i) => i.name)).toEqual(["Trunk"]);
  });
});

describe("static catalog QA gate", () => {
  it("flags catalog titles on AI puzzles", () => {
    const report = auditPuzzleQa(
      {
        id: "p1",
        category: "logic",
        themeTags: ["generic"],
        title: "Cipher Index",
        objective: "Find code",
        howItWorks: "Decode",
        referenceLinks: [],
        solveSteps: ["Step 1"],
        difficulty: "medium",
        isStaticCatalog: false,
      },
      { themeName: "Victorian Study" },
    );
    expect(report.passed).toBe(false);
    expect(report.issues.some((i) => i.code === "STATIC_CATALOG_TITLE")).toBe(true);
  });

  it("allows catalog titles when explicitly marked static", () => {
    const report = auditPuzzleQa(
      {
        id: "p1",
        category: "logic",
        themeTags: ["generic"],
        title: "Cipher Index",
        objective: "Find code",
        howItWorks: "Decode",
        referenceLinks: [],
        solveSteps: ["Step 1"],
        difficulty: "medium",
        isStaticCatalog: true,
      },
      { themeName: "Victorian Study" },
    );
    expect(report.issues.some((i) => i.code === "STATIC_CATALOG_TITLE")).toBe(false);
  });
});

describe("inventory planning helpers", () => {
  it("infers affordances from prop names", () => {
    const a = inferAffordancesFromName("Antique wooden trunk");
    expect(a?.materials).toContain("wood");
    expect(a?.traits).toContain("lockable");
  });

  it("finds puzzles bound to a prop", () => {
    const ids = findPuzzlesUsingProp(
      [{ id: "pz1", propPuzzleLink: { propId: "inv1", propLabel: "Trunk", logicKernel: "open", clueDelivers: "code" } }],
      "inv1",
    );
    expect(ids).toEqual(["pz1"]);
  });

  it("detects static catalog titles", () => {
    expect(isStaticCatalogTitle("Maglock / Magnetic Lock Sequence")).toBe(true);
    expect(isStaticCatalogTitle("Brass dial chronometer")).toBe(false);
  });
});
