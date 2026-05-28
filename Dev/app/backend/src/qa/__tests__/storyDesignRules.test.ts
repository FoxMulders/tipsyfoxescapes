import { describe, expect, it } from "vitest";
import {
  auditNarrativeProgression,
  auditPropAffordanceForPuzzle,
  buildBookCoverPremise,
  formatHostProgressionRule,
  stripMetaImmersionBreaks,
} from "../../../../shared/qa/storyDesignRules.js";

describe("storyDesignRules", () => {
  it("strips meta immersion breaks from premise source", () => {
    const out = stripMetaImmersionBreaks("Players are cast inside a fake scenario. The vault waits.");
    expect(out).not.toMatch(/cast inside/i);
    expect(out).toContain("vault");
  });

  it("builds book-cover premise without theme label stub", () => {
    const premise = buildBookCoverPremise(
      "Midnight Archive",
      "Midnight Archive: Find the ledger",
      "Recover the ledger before the building locks down.",
    );
    expect(premise).toMatch(/^When the story begins,/);
    expect(premise).not.toMatch(/^Midnight Archive:/);
  });

  it("formats per-puzzle progression steps", () => {
    const rule = formatHostProgressionRule(
      [
        {
          puzzleId: "p1",
          puzzleTitle: "Spine Cipher",
          storyRole: "Opening beat — north wall",
          unlocks: "Contributes fragment 3; Gateway A → Tech station.",
        },
      ],
      "Escape before dawn.",
    );
    expect(rule).toContain("1. **Spine Cipher**");
    expect(rule).toContain("Finale:");
  });

  it("flags floor lamp paired with magnetic lock copy", () => {
    const issues = auditPropAffordanceForPuzzle({
      id: "p1",
      title: "Magnetic lock sequence",
      objective: "Align magnetic triggers in order.",
      howItWorks: "Players align polarity fields on the lock face.",
      physical_anchor_prop: "Floor lamp",
    });
    expect(issues.some((i) => i.code === "STORY_PROP_AFFORDANCE_MISMATCH")).toBe(true);
  });

  it("flags bookshelf as weighted switch", () => {
    const issues = auditPropAffordanceForPuzzle({
      id: "p2",
      title: "Weighted switch",
      objective: "Apply the correct weight to trip the latch.",
      howItWorks: "Players load mass until the pressure plate clicks.",
      physical_anchor_prop: "Bookshelf",
    });
    expect(issues.some((i) => i.code === "STORY_PROP_AFFORDANCE_MISMATCH")).toBe(true);
  });

  it("flags an orphan puzzle that maps to no progression beat", () => {
    const puzzles = [
      { id: "p1", title: "Spine Cipher", objective: "Decode.", howItWorks: "Players decode the spine cipher.", themeFitReason: "For the Haunted Library, the spine cipher reveals the misfiled volume." },
      { id: "p2", title: "Orphan Box", objective: "Open.", howItWorks: "Players open a box.", themeFitReason: "For the Haunted Library, the box hides a relic in the reading room." },
    ];
    const links = [
      { puzzleId: "p1", puzzleTitle: "Spine Cipher", storyRole: "Opening beat", unlocks: "Contributes fragment 3." },
    ];
    const issues = auditNarrativeProgression(puzzles, links, "Escape before dawn.");
    expect(issues.some((i) => i.code === "STORY_ORPHAN_PUZZLE" && i.field === "puzzle.p2")).toBe(true);
  });

  it("errors when a multi-puzzle set has no progression links", () => {
    const puzzles = [
      { id: "p1", title: "A", objective: "x", howItWorks: "y", themeFitReason: "For the theme, A advances the story toward the vault." },
    ];
    const issues = auditNarrativeProgression(puzzles, [], "Open the vault.");
    expect(issues.some((i) => i.code === "STORY_PROGRESSION_NO_LINKS")).toBe(true);
  });

  it("does not flag youth-track puzzles as orphans", () => {
    const puzzles = [
      { id: "p1", title: "Main", objective: "x", howItWorks: "y", themeFitReason: "For the theme, the main beat advances the plot toward the exit." },
      { id: "y1", title: "Junior", objective: "x", howItWorks: "y", themeFitReason: "Junior track beat.", audienceTrack: "youth_addon" as const },
    ];
    const links = [{ puzzleId: "p1", puzzleTitle: "Main", storyRole: "Opening beat", unlocks: "Contributes fragment 1." }];
    const issues = auditNarrativeProgression(puzzles, links, "Reach the exit.");
    expect(issues.some((i) => i.code === "STORY_ORPHAN_PUZZLE")).toBe(false);
  });
});
