import type { PlanningFormState } from "./planningTypes";

export function collectStrictPlanningMissing(state: PlanningFormState): string[] {
  const missing: string[] = [];
  const pc = Number(state.playersConcurrent);
  const pt = Number(state.participantsTotal);
  const sd = Number(state.sessionDurationMinutes);
  if (!Number.isFinite(pc) || pc < 1 || pc > 99) missing.push("playersConcurrent");
  if (!Number.isFinite(pt) || pt < 1 || pt > 99) missing.push("participantsTotal");
  if (Number.isFinite(pc) && Number.isFinite(pt) && pc > pt) {
    missing.push("headcountOrder");
    if (!missing.includes("playersConcurrent")) missing.push("playersConcurrent");
    if (!missing.includes("participantsTotal")) missing.push("participantsTotal");
  }
  if (!Number.isFinite(sd) || sd < 10 || sd > 180) missing.push("sessionDurationMinutes");
  if (!state.environmentType.trim()) missing.push("environmentType");
  return missing;
}

export function flagMissingFields(
  missing: string[],
  current: Record<string, boolean>,
): Record<string, boolean> {
  const next = { ...current };
  for (const key of missing) next[key] = true;
  return next;
}
