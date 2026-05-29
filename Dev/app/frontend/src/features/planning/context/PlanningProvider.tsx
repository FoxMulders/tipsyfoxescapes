import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { PropFabricationKind } from "@/components/planning/PropFabricationSection";
import { estimateJuniorAddOnSlots, estimatePuzzleNodes } from "../domain/estimatePuzzleNodes";
import { buildPlanningBody } from "../domain/buildPlanningBody";
import { getSuggestedPropOptionsForPlanning, isCommercialVenueEventContext } from "../domain/propPresets";
import { collectStrictPlanningMissing, flagMissingFields } from "../domain/validation";
import type { PlanningFormState } from "../domain/planningTypes";
import { countPlacedPuzzleNodes } from "../../../../../shared/roomLayout";
import { planningReducer, createInitialPlanningState, type PlanningAction } from "./planningReducer";

export type PlanningContextValue = {
  state: PlanningFormState;
  dispatch: Dispatch<PlanningAction>;
  propPresetLabels: string[];
  commercialVenueContext: boolean;
  livePuzzleEstimate: number;
  plannerMainPuzzleTarget: number;
  juniorAddOnPuzzleSlots: number;
  placedPuzzleNodeCount: number;
  estimatePulseKey: string;
  buildBody: (mode: "draft" | "strict") => ReturnType<typeof buildPlanningBody>;
  collectMissing: () => string[];
  flagMissing: (missing: string[]) => void;
  clearValidation: (key: string) => void;
  maxConcurrent: number;
};

const PlanningContext = createContext<PlanningContextValue | null>(null);

export function PlanningProvider({
  children,
  initialOverrides,
}: {
  children: ReactNode;
  initialOverrides?: Partial<PlanningFormState>;
}) {
  const [state, dispatch] = useReducer(planningReducer, undefined, () => createInitialPlanningState(initialOverrides));

  const propPresetLabels = useMemo(
    () => getSuggestedPropOptionsForPlanning(state.environmentType, state.eventType).map((o) => o.label),
    [state.environmentType, state.eventType],
  );

  const commercialVenueContext = useMemo(() => isCommercialVenueEventContext(state.eventType), [state.eventType]);

  const livePuzzleEstimate = useMemo(() => {
    const pc = Number(state.playersConcurrent);
    const sd = Number(state.sessionDurationMinutes);
    if (!Number.isFinite(pc) || pc < 1 || !Number.isFinite(sd) || sd < 1) return 4;
    return estimatePuzzleNodes(Math.floor(pc), Math.floor(sd));
  }, [state.playersConcurrent, state.sessionDurationMinutes]);

  const plannerMainPuzzleTarget = useMemo(() => {
    if (state.useCustomMainPuzzleCount) {
      const n = Number.parseInt(state.customMainPuzzleCountStr.trim(), 10);
      if (Number.isFinite(n)) return Math.min(24, Math.max(1, Math.trunc(n)));
    }
    return livePuzzleEstimate;
  }, [state.useCustomMainPuzzleCount, state.customMainPuzzleCountStr, livePuzzleEstimate]);

  const juniorAddOnPuzzleSlots = useMemo(() => {
    const sd = Number(state.sessionDurationMinutes);
    return estimateJuniorAddOnSlots(Number.isFinite(sd) ? sd : 45, state.youthAddOnEnabled);
  }, [state.youthAddOnEnabled, state.sessionDurationMinutes]);

  const placedPuzzleNodeCount = useMemo(() => countPlacedPuzzleNodes(state.roomLayout), [state.roomLayout]);

  const estimatePulseKey = `${state.playersConcurrent}-${state.participantsTotal}-${state.sessionDurationMinutes}`;

  const maxConcurrent = useMemo(() => {
    const pt = Number(state.participantsTotal);
    return Number.isFinite(pt) && pt >= 1 ? Math.min(99, Math.trunc(pt)) : 99;
  }, [state.participantsTotal]);

  const buildBody = useCallback((mode: "draft" | "strict") => buildPlanningBody(state, mode), [state]);

  const collectMissing = useCallback(() => collectStrictPlanningMissing(state), [state]);

  const flagMissing = useCallback(
    (missing: string[]) => dispatch({ type: "SET_VALIDATION_FLAGS", flags: flagMissingFields(missing, state.validationFlags) }),
    [state.validationFlags],
  );

  const clearValidation = useCallback((key: string) => dispatch({ type: "CLEAR_VALIDATION", key }), []);

  const value = useMemo<PlanningContextValue>(
    () => ({
      state,
      dispatch,
      propPresetLabels,
      commercialVenueContext,
      livePuzzleEstimate,
      plannerMainPuzzleTarget,
      juniorAddOnPuzzleSlots,
      placedPuzzleNodeCount,
      estimatePulseKey,
      buildBody,
      collectMissing,
      flagMissing,
      clearValidation,
      maxConcurrent,
    }),
    [
      state,
      propPresetLabels,
      commercialVenueContext,
      livePuzzleEstimate,
      plannerMainPuzzleTarget,
      juniorAddOnPuzzleSlots,
      placedPuzzleNodeCount,
      estimatePulseKey,
      buildBody,
      collectMissing,
      flagMissing,
      clearValidation,
      maxConcurrent,
    ],
  );

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

export function usePlanning(): PlanningContextValue {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error("usePlanning must be used within PlanningProvider");
  return ctx;
}

/** Optional bridge for App.tsx during migration — returns null outside provider. */
export function usePlanningOptional(): PlanningContextValue | null {
  return useContext(PlanningContext);
}

export type { PropFabricationKind };
