import { describe, expect, it } from "vitest";
import {
  buildConsolidatedBomTable,
  buildGmLiveOpsBriefing,
  buildNarrativeJustification,
  buildTechnicalPuzzleSections,
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
    expect(text).toContain("Science Lab");
    expect(text).toContain("beaker");
    expect(text).toContain("Why it belongs here");
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
