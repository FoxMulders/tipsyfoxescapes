import { auditJuniorHooksForContext, auditThemeFitNarrative } from "../../../shared/qa/storyEditorRules.js";

const failures: string[] = [];

const themeFitBad = auditThemeFitNarrative("This puzzle uses deduction.", "Haunted Library");
if (themeFitBad.length === 0) failures.push("Expected theme fit audit to fail when theme unnamed");

const themeFitOk = auditThemeFitNarrative('For "Haunted Library", players decode stacks.', "Haunted Library");
if (themeFitOk.length > 0) failures.push("Expected valid theme fit to pass");

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
if (!hooks.some((h) => h.code === "STORY_HOOK_OFF_THEME")) {
  failures.push("Expected patio/garden hook to fail for Haunted Library theme");
}

if (failures.length > 0) {
  console.error("[story-editor-qa] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("[story-editor-qa] PASS");
