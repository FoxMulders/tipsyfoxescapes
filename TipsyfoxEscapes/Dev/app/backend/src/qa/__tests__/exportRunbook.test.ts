import { describe, expect, it } from "vitest";
import {
  buildConsolidatedBomTable,
  buildGmLiveOpsBriefing,
  buildNarrativeJustification,
  buildTechnicalPuzzleSections,
  sanitizeExportPuzzlesForBilling,
  type ExportPuzzleRef,
  type ExportSessionContext,
} from "../../exportRunbook.js";

const ctx: ExportSessionContext = {
  environmentType: "Science Lab",
  themeName: "Submerged Lab",
  sessionDurationMinutes: 45,
  playersConcurrent: 4,
  operatingMode: "venue",
};

const samplePuzzle: ExportPuzzleRef = {
  id: "pz_1",
  title: "Cipher Index",
  category: "logic",
  difficulty: "medium",
  objective: "Decode the valve order from the wall chart.",
  howItWorks: "Players cross-reference color bands on the chart with labeled valves.",
  physical_anchor_prop: "beaker",
  narrative_justification:
    "Inside **Bench station**, the crew engages **beaker** to achieve: Decode the valve order from the wall chart.",
  bill_of_materials: ["beaker (host inventory anchor)", "Printed clue set"],
  build_documentation_url: "https://roomescapeartist.com/",
  themeFitReason:
    'Inventory tie-in (“beaker”): Clues are hidden inside glassware on the bench. Placement hint: Center workbench in Science Lab.',
  stageHint: "Bench station",
  solveSteps: ["Read the chart", "Label valves A–D", "Enter the color sequence"],
  referenceLinks: [
    {
      title: "Room Escape Artist — puzzle design",
      url: "https://roomescapeartist.com/",
      creditTo: "Industry reference",
    },
  ],
};

describe("exportRunbook", () => {
  it("buildNarrativeJustification includes where and why", () => {
    const text = buildNarrativeJustification(samplePuzzle, ctx);
    expect(text).toContain("Bench station");
    expect(text).toContain("beaker");
    expect(text).toMatch(/achieve|Why it belongs here/i);
  });

  it("buildConsolidatedBomTable emits markdown table rows", () => {
    const lines = buildConsolidatedBomTable([samplePuzzle], false);
    const table = lines.join("\n");
    expect(table).toContain("| Puzzle |");
    expect(table).toContain("Cipher Index");
  });

  it("buildTechnicalPuzzleSections includes narrative and build resources", () => {
    const lines = buildTechnicalPuzzleSections([samplePuzzle], ctx, false);
    const body = lines.join("\n");
    expect(body).toContain("Narrative justification");
    expect(body).toContain("Build resources");
    expect(body).toContain("roomescapeartist.com");
  });

  it("redacts electronic wiring when redactElectronic is true", () => {
    const electronic: ExportPuzzleRef = {
      ...samplePuzzle,
      id: "pz_e1",
      title: "Sensor Panel",
      category: "electronic",
      electronicDetails: {
        parts: ["Arduino Uno"],
        wiringDiagram: ["D2 → sensor signal"],
        buildSteps: ["Mount board"],
        arduinoCode: "void setup() {}",
        pinoutTable: [{ pin: "D2", function: "IN", connectsTo: "Sensor" }],
      },
    };
    const lines = buildTechnicalPuzzleSections([electronic], ctx, true);
    const body = lines.join("\n");
    expect(body).toContain("Maker electronics omitted");
    expect(body).not.toContain("void setup()");
    expect(body).not.toContain("D2 → sensor signal");
  });

  it("sanitizeExportPuzzlesForBilling strips maker metadata for trial users", () => {
    const electronic: ExportPuzzleRef = {
      ...samplePuzzle,
      id: "pz_e2",
      title: "Relay Gate",
      category: "electronic",
      bill_of_materials: ["Arduino Uno", "Printed clue set"],
      build_documentation_url: "https://example.com/build",
      electronicDetails: {
        parts: ["Arduino Uno"],
        wiringDiagram: ["D2 → relay IN"],
        buildSteps: ["Mount relay"],
        arduinoCode: "void setup() {}",
        pinoutTable: [{ pin: "D2", function: "OUT", connectsTo: "Relay" }],
      },
    };
    const sanitized = sanitizeExportPuzzlesForBilling([electronic], {
      isAdmin: false,
      trialUsedAt: null,
      exportCreditsRemaining: 0,
      roomAllowance: 0,
    } as never);
    expect(sanitized[0].build_documentation_url).toBeUndefined();
    expect(sanitized[0].bill_of_materials).toEqual(["Printed clue set"]);
    expect(sanitized[0].electronicDetails?.arduinoCode).toBe("");
    expect(sanitized[0].electronicDetails?.wiringDiagram).toEqual([]);
  });

  it("sanitizeExportPuzzlesForBilling leaves electronics for enthusiast tier", () => {
    const electronic: ExportPuzzleRef = {
      ...samplePuzzle,
      id: "pz_e3",
      category: "electronic",
      electronicDetails: {
        parts: ["Arduino Uno"],
        wiringDiagram: ["D2 → relay IN"],
        buildSteps: ["Mount relay"],
        arduinoCode: "void setup() {}",
      },
    };
    const sanitized = sanitizeExportPuzzlesForBilling([electronic], {
      isAdmin: false,
      lastPurchasedPlanId: "home_enthusiast",
      trialUsedAt: "2026-01-01T00:00:00.000Z",
      exportCreditsRemaining: 1,
      roomAllowance: 1,
    } as never);
    expect(sanitized[0].electronicDetails?.arduinoCode).toContain("void setup");
  });

  it("buildGmLiveOpsBriefing includes clue and recovery columns", () => {
    const lines = buildGmLiveOpsBriefing(
      [samplePuzzle],
      ctx,
      [{ puzzleTitle: "Cipher Index", storyRole: "Opening discovery puzzle." }],
    );
    const body = lines.join("\n");
    expect(body).toContain("Live Ops");
    expect(body).toContain("Failure recovery");
    expect(body).toContain("Cipher Index");
  });
});
