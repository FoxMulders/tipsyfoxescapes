/**
 * Story Design QA department — immersion, prop affordances, progression readability.
 * See QA/departments/story_design_qa.md
 */

import {
  auditInventoryHostCopy,
  auditPremiseImmersion,
  auditPropAffordanceForPuzzle,
  auditStoryDesignPlan,
  type PuzzlePropForQa,
  type StoryDesignQaIssue,
} from "../../shared/qa/storyDesignRules.js";

export type { StoryDesignQaIssue };

export type StoryDesignQaReport = {
  passed: boolean;
  issues: StoryDesignQaIssue[];
};

export type StoryPlanForDesignQa = {
  premise?: string;
  progressionRule?: string;
  puzzleLinks?: Array<{
    puzzleId: string;
    puzzleTitle: string;
    storyRole: string;
    unlocks: string;
  }>;
};

export const auditStoryDesign = (
  plan: StoryPlanForDesignQa | null | undefined,
  puzzles: PuzzlePropForQa[],
  suggestedAdditionLines: string[] = [],
): StoryDesignQaReport => {
  const issues: StoryDesignQaIssue[] = [];
  if (plan) {
    issues.push(...auditPremiseImmersion(plan.premise ?? ""));
    issues.push(
      ...auditStoryDesignPlan(plan.premise ?? "", plan.progressionRule ?? "", plan.puzzleLinks ?? []),
    );
  }
  for (const puzzle of puzzles) {
    issues.push(...auditPropAffordanceForPuzzle(puzzle));
  }
  issues.push(...auditInventoryHostCopy(suggestedAdditionLines));
  return { passed: !issues.some((i) => i.severity === "error"), issues };
};

export const formatStoryDesignFixes = (issues: StoryDesignQaIssue[]): string[] =>
  issues.map((i) => i.requiredChange ?? i.message);
