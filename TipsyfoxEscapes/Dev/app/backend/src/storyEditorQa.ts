/**
 * Story Editor QA department — narrative continuity, hooks, theme-fit structure.
 * See QA/departments/story_editor_qa.md
 */

import {
  auditJuniorHooksForContext,
  auditThemeFitNarrative,
  type JuniorHookLike,
  type StoryEditorQaIssue,
} from "../../shared/qa/storyEditorRules.js";

export type { StoryEditorQaIssue };

export type StoryEditorQaReport = {
  passed: boolean;
  issues: StoryEditorQaIssue[];
};

export type StoryPlanForQa = {
  situation?: string;
  premise?: string;
  missionObjective?: string;
  stages?: Array<{ title?: string; requiredPuzzleIds?: string[]; requiredPuzzleTitles?: string[] }>;
  puzzleLinks?: Array<{ puzzleId?: string }>;
};

export const auditStoryPlan = (
  plan: StoryPlanForQa | null | undefined,
  puzzleIds: string[],
  themeName: string,
): StoryEditorQaReport => {
  const issues: StoryEditorQaIssue[] = [];
  if (!plan) {
    issues.push({
      code: "STORY_PLAN_MISSING",
      severity: "warn",
      field: "storyPlan",
      message: "No story plan present for this session.",
      requiredChange: "Regenerate puzzles to produce a story plan, or load a saved plan with narrative beats.",
    });
    return { passed: !issues.some((i) => i.severity === "error"), issues };
  }
  const theme = themeName.trim();
  const corpus = `${plan.situation ?? ""} ${plan.premise ?? ""} ${plan.missionObjective ?? ""}`.toLowerCase();
  if (theme && corpus.length > 20) {
    const tokens = theme.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    if (!corpus.includes(theme.toLowerCase()) && !tokens.some((t) => corpus.includes(t))) {
      issues.push({
        code: "STORY_PLAN_THEME_DRIFT",
        severity: "error",
        field: "storyPlan",
        message: `Story plan does not reference theme "${theme}".`,
        requiredChange: `Edit situation/premise/mission to name "${theme}" explicitly.`,
      });
    }
  }
  const idSet = new Set(puzzleIds);
  for (const stage of plan.stages ?? []) {
    for (const pid of stage.requiredPuzzleIds ?? []) {
      if (pid && !idSet.has(pid)) {
        issues.push({
          code: "STORY_STAGE_UNKNOWN_PUZZLE",
          severity: "error",
          field: "storyPlan.stages",
          message: `Stage "${stage.title ?? "?"}" references missing puzzle id ${pid}.`,
          requiredChange: "Regenerate story plan or replace the puzzle so stage links resolve.",
        });
      }
    }
  }
  return { passed: !issues.some((i) => i.severity === "error"), issues };
};

export const auditJuniorHooks = (
  hooks: JuniorHookLike[],
  themeName: string,
  environmentType: string,
): StoryEditorQaReport => {
  const issues = auditJuniorHooksForContext(hooks, themeName, environmentType);
  return { passed: !issues.some((i) => i.severity === "error"), issues };
};

/** Cross-department: Puzzle QA delegates theme-fit narrative checks here. */
export const auditPuzzleThemeFitForStoryEditor = (
  themeFitReason: string,
  themeName: string,
): StoryEditorQaReport => {
  const issues = auditThemeFitNarrative(themeFitReason, themeName, "themeFitReason");
  return { passed: !issues.some((i) => i.severity === "error"), issues };
};

export const formatStoryEditorFixes = (issues: StoryEditorQaIssue[]): string[] =>
  issues.map((i) => i.requiredChange ?? i.message);
