import { describe, expect, it } from "vitest";
import { applyPuzzleQaGate, auditPuzzleQa } from "../../puzzleQa.js";

describe("Puzzle QA (migrated)", () => {
  it("passes a valid strict puzzle", () => {
    const out = applyPuzzleQaGate(
      [
        {
          id: "qa_good",
          category: "logic",
          themeTags: ["library"],
          title: "Cipher Index",
          objective: "Decode the archive index card.",
          howItWorks:
            "Players find a cipher key on the Cipher Index card and decode a short message that unlocks the next compartment.",
          themeFitReason: 'For "Haunted Library", this cipher uses mis-shelved index cards as diegetic clues.',
          referenceLinks: [
            {
              title: "Arduino tone reference",
              url: "https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/",
            },
          ],
          solveSteps: ["Find key", "Decode message"],
          difficulty: "medium",
        },
      ],
      { themeName: "Haunted Library", strict: true },
    );
    expect(out[0]?.puzzleQa?.passed).toBe(true);
  });

  it("fails YouTube search URLs in strict mode", () => {
    const report = auditPuzzleQa(
      {
        id: "qa_bad_links",
        category: "logic",
        themeTags: [],
        title: "Pattern Archive",
        objective: "Match symbols.",
        howItWorks: "Players collect symbols from props and align the Pattern Archive sequence on the board.",
        themeFitReason: 'For "Haunted Library", symbol order mirrors misfiled spine colors.',
        referenceLinks: [
          {
            title: "Generic search",
            url: "https://www.youtube.com/results?search_query=escape+room",
          },
        ],
        solveSteps: ["Collect", "Align"],
        difficulty: "medium",
      },
      { themeName: "Haunted Library", strict: true },
      [{ title: "Generic search", url: "https://www.youtube.com/results?search_query=escape+room" }],
    );
    expect(report.passed).toBe(false);
  });
});
