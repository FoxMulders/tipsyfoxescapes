type CompletionInput = {
  hasSession: boolean;
  hasTheme: boolean;
  puzzleCount: number;
  refusedSlots: number;
  hasStoryPlan: boolean;
  approvedForBuild: boolean;
  planSaved: boolean;
};

/** Rough builder completeness for Save Plan label (0–100). */
export const computePlanCompletionPercent = (input: CompletionInput): number => {
  let score = 0;
  if (input.hasSession) score += 10;
  if (input.hasTheme) score += 20;
  if (input.puzzleCount > 0) score += 30;
  if (input.refusedSlots === 0 && input.puzzleCount >= 3) score += 10;
  if (input.hasStoryPlan) score += 15;
  if (input.approvedForBuild) score += 10;
  if (input.planSaved) score += 5;
  return Math.min(100, Math.max(0, score));
};
