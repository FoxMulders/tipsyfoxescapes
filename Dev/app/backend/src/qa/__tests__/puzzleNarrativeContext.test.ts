import { describe, expect, it } from "vitest";
import { buildStoryContext } from "../../services/ai/puzzles.js";

describe("buildStoryContext", () => {
  it("joins tldr and description for narrative context", () => {
    const ctx = buildStoryContext({
      name: "Haunted Library",
      tldr: "Scholars trapped after midnight.",
      description: "## Premise\nThe archive seals at dusk.",
    });
    expect(ctx).toContain("Scholars trapped");
    expect(ctx).toContain("archive seals");
  });

  it("falls back to theme name when brief is empty", () => {
    expect(buildStoryContext({ name: "Temple Lockdown", tldr: "", description: "" })).toBe("Temple Lockdown");
  });
});
