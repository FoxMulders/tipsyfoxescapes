import { describe, expect, it } from "vitest";
import { enrichPuzzlesWithManufacturingSchema } from "../../puzzleManufacturingSchema.js";

const staticMaglock = {
  id: "pz_electronic_maglock",
  category: "electronic" as const,
  title: "Maglock Sequence",
  objective: "Release maglock",
  howItWorks: "Reed sequence energizes relay.",
  referenceLinks: [],
  solveSteps: ["Sweep magnet"],
  difficulty: "medium" as const,
  isStaticCatalog: true,
  electronicDetails: {
    parts: ["Arduino Uno", "Maglock"],
    wiringDiagram: ["D7 -> relay IN"],
    wiringDiagramSvg: "<svg/>",
    buildSteps: ["Bench test"],
    arduinoCode: "// bespoke static catalog sketch\nvoid setup(){} void loop(){}",
    pinoutTable: [{ pin: "D7", function: "GPIO", connectsTo: "relay" }],
  },
};

const aiPuzzle = {
  id: "pz_ai_1",
  category: "electronic" as const,
  title: "Relay Bus",
  objective: "Complete relay sequence",
  howItWorks: "Players press buttons.",
  referenceLinks: [],
  solveSteps: ["Wire relay", "Press sequence"],
  difficulty: "medium" as const,
  isStaticCatalog: false,
  hardware_profile: "relay_maglock" as const,
  electronicDetails: {
    hardware_profile: "relay_maglock" as const,
    parts: ["Arduino Uno", "Relay module", "Reed switches"],
    wiringDiagram: ["D7 -> relay IN", "D2 -> reed switch"],
    wiringDiagramSvg: "",
    buildSteps: ["Mount relay"],
    arduinoCode: "// preview only",
  },
};

const enrichDeps = {
  normalizeInventory: (items: string[]) => items,
  describeItem: () => ({ placement: "Table", puzzleUses: "Interact with prop." }),
  scoreItemForPuzzle: () => 0,
  minAnchorScore: 99,
  sentenceCaseLead: (s: string) => s,
  environmentType: "basement",
  themeName: "Test Theme",
  availableItems: [],
};

describe("enrichPuzzlesWithManufacturingSchema static catalog bypass", () => {
  it("preserves static catalog arduinoCode and pinoutTable", () => {
    const [out] = enrichPuzzlesWithManufacturingSchema([staticMaglock], enrichDeps);
    expect(out?.electronicDetails?.arduinoCode).toContain("bespoke static catalog sketch");
    expect(out?.electronicDetails?.pinoutTable).toEqual(staticMaglock.electronicDetails.pinoutTable);
  });

  it("routes AI puzzles through production templates", () => {
    const [out] = enrichPuzzlesWithManufacturingSchema([aiPuzzle], enrichDeps);
    expect(out?.hardware_profile).toBe("relay_maglock");
    expect(out?.electronicDetails?.arduinoCode).toContain("relayPin");
    expect(out?.electronicDetails?.arduinoCode).not.toContain("preview only");
  });
});
