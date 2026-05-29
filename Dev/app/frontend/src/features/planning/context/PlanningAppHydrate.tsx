import { useEffect, useRef } from "react";
import type { PlanningFormState } from "../domain/planningTypes";
import { usePlanning } from "./PlanningProvider";

/** Pushes App.tsx planning fields into the provider after session restore or OAuth snapshot. */
export function PlanningAppHydrate({
  hydrateKey,
  payload,
}: {
  hydrateKey: string;
  payload: Partial<PlanningFormState>;
}) {
  const { dispatch } = usePlanning();
  const lastKey = useRef("");

  useEffect(() => {
    if (!hydrateKey || lastKey.current === hydrateKey) return;
    lastKey.current = hydrateKey;
    dispatch({ type: "HYDRATE", payload });
  }, [hydrateKey, payload, dispatch]);

  return null;
}
