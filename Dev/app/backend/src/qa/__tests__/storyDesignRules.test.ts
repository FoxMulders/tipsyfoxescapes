import { describe, expect, it } from "vitest";
import {
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
});
