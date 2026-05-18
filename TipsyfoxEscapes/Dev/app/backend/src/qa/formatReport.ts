import type { PuzzleQaIssue } from "../puzzleQa.js";
import type { StoryEditorQaIssue } from "../storyEditorQa.js";

export type QaDepartment = "code" | "workflow" | "story_editor" | "puzzle";

export type FormattedQaFailure = {
  department: QaDepartment;
  code: string;
  severity: "error" | "warn";
  field: string;
  message: string;
  requiredChange: string;
};

export const formatPuzzleQaFixes = (issues: PuzzleQaIssue[]): FormattedQaFailure[] =>
  issues.map((i) => ({
    department: "puzzle",
    code: i.code,
    severity: i.severity,
    field: i.field,
    message: i.message,
    requiredChange: puzzleRequiredChange(i),
  }));

export const formatStoryEditorFixes = (issues: StoryEditorQaIssue[]): FormattedQaFailure[] =>
  issues.map((i) => ({
    department: "story_editor",
    code: i.code,
    severity: i.severity,
    field: i.field,
    message: i.message,
    requiredChange: i.requiredChange ?? i.message,
  }));

const puzzleRequiredChange = (issue: PuzzleQaIssue): string => {
  switch (issue.code) {
    case "HOW_IT_WORKS_SHORT":
      return "Expand how it works to describe player actions and the mechanism in complete sentences.";
    case "THEME_FIT_THEME_NAME":
    case "THEME_FIT_MISSING":
      return issue.message;
    case "REFERENCE_SEARCH_STRIPPED":
    case "REFERENCES_ALL_STRIPPED":
      return "Replace with one specific tutorial URL (watch/embed) or official doc that matches this exact puzzle title/mechanism.";
    case "PIN_MISMATCH":
      return "Align Dx pin labels in wiring notes, SVG labels, and Arduino constants.";
    case "SVG_INVALID":
      return "Provide a valid SVG wiring diagram that labels components from the parts list.";
    case "ELECTRONIC_DETAILS_MISSING":
      return "Add parts, wiring notes, build steps, diagram SVG, and Arduino sketch.";
    default:
      return issue.message;
  }
};

export const printFailures = (failures: FormattedQaFailure[], dept: QaDepartment): void => {
  const rows = failures.filter((f) => f.department === dept);
  if (rows.length === 0) return;
  console.error(`\n=== ${dept.toUpperCase()} QA FAILURES ===`);
  for (const f of rows) {
    const tag = f.severity === "error" ? "ERROR" : "WARN";
    console.error(`[${tag}] ${f.code} (${f.field}): ${f.message}`);
    console.error(`       → Required change: ${f.requiredChange}`);
  }
};
