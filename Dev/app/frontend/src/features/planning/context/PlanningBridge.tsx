import type { MutableRefObject } from "react";
import { usePlanning, type PlanningContextValue } from "./PlanningProvider";

export function PlanningBridge({ outRef }: { outRef: MutableRefObject<PlanningContextValue | null> }) {
  const planning = usePlanning();
  outRef.current = planning;
  return null;
}
