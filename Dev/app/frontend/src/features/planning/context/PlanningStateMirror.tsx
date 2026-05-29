import { useEffect, type ReactNode } from "react";
import { usePlanning } from "./PlanningProvider";
import type { PlanningFormState } from "../domain/planningTypes";

/** Mirrors planning reducer state to App.tsx for session sync and wizard guards. */
export function PlanningStateMirror({
  onChange,
}: {
  onChange: (state: PlanningFormState, buildStrict: () => ReturnType<typeof import("../domain/buildPlanningBody").buildPlanningBody>) => void;
}) {
  const planning = usePlanning();
  useEffect(() => {
    onChange(planning.state, () => planning.buildBody("strict"));
  }, [planning, planning.state, onChange]);
  return null;
}

export function PlanningProviderGate({ children }: { children: ReactNode }) {
  return children;
}
