import { useEffect } from "react";
import type { PlanningFormState } from "../domain/planningTypes";
import { usePlanning } from "./PlanningProvider";

export type PlanningStateSetters = {
  apply: (state: PlanningFormState) => void;
};

export function PlanningStateSync({ setters }: { setters: PlanningStateSetters }) {
  const { state } = usePlanning();
  useEffect(() => {
    setters.apply(state);
  }, [state, setters]);
  return null;
}
