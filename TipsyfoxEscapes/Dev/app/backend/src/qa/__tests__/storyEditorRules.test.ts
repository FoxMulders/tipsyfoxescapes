import { describe, expect, it } from "vitest";
import {
  auditJuniorHooksForContext,
  auditThemeFitNarrative,
} from "../../../../shared/qa/storyEditorRules.js";

describe("Story Editor QA (migrated)", () => {
  it("fails theme fit when theme name is absent", () => {
    const issues = auditThemeFitNarrative("This puzzle uses deduction.", "Haunted Library");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("passes theme fit when theme is named", () => {
    const issues = auditThemeFitNarrative('For "Haunted Library", players decode stacks.', "Haunted Library");
    expect(issues).toHaveLength(0);
  });

  it("flags junior hooks that match environment over theme", () => {
    const hooks = auditJuniorHooksForContext(
      [
        {
          title: "Greenhouse of the living codex",
          detail: "Plants as pages.",
          themeKeywords: ["garden", "greenhouse"],
          envKeywords: ["patio", "backyard"],
        },
      ],
      "Haunted Library",
      "Backyard / patio",
    );
    expect(hooks.some((h) => h.code === "STORY_HOOK_OFF_THEME")).toBe(true);
  });
});
