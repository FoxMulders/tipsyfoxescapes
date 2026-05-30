import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import type { RoomSkeleton } from "../../../../../shared/roomSkeleton";
import type { PuzzleInspectorSlice } from "../WorkspaceInspectorPanel";
import { validateRoomDataForComplete } from "./generationEngine";
import type { GenerationStatus, RoomBriefContext, RoomData, ThemeContext } from "./generationTypes";

type GenerationState = {
  status: GenerationStatus;
  error: string | null;
  retryHint: string | null;
  roomData: RoomData | null;
  attemptInFlight: boolean;
};

type GenerationAction =
  | { type: "BEGIN" }
  | { type: "FAIL"; error: string; retryHint?: string }
  | { type: "COMMIT"; roomData: RoomData }
  | { type: "RESET" };

const initialState: GenerationState = {
  status: "idle",
  error: null,
  retryHint: null,
  roomData: null,
  attemptInFlight: false,
};

function generationReducer(state: GenerationState, action: GenerationAction): GenerationState {
  switch (action.type) {
    case "BEGIN":
      return { ...state, status: "generating", error: null, retryHint: null, attemptInFlight: true };
    case "FAIL":
      return {
        ...state,
        status: "error",
        error: action.error,
        retryHint: action.retryHint ?? null,
        attemptInFlight: false,
      };
    case "COMMIT":
      return {
        status: "complete",
        error: null,
        retryHint: null,
        roomData: action.roomData,
        attemptInFlight: false,
      };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export type GenerationProviderProps = {
  children: ReactNode;
  skeleton: RoomSkeleton | null;
  puzzles: PuzzleInspectorSlice[];
  telemetry: GenerationTelemetry | null;
  theme: ThemeContext | null;
  roomBrief: RoomBriefContext | null;
  externalGenerating: boolean;
  viewportWidth?: number;
};

type GenerationContextValue = {
  status: GenerationStatus;
  error: string | null;
  retryHint: string | null;
  roomData: RoomData | null;
  hasRoomData: boolean;
  isGenerating: boolean;
  resetGeneration: () => void;
  runGeneration: (task: () => void | Promise<void>) => Promise<void>;
};

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function GenerationProvider({
  children,
  skeleton,
  puzzles,
  telemetry,
  theme,
  roomBrief,
  externalGenerating,
  viewportWidth = 1280,
}: GenerationProviderProps) {
  const [state, dispatch] = useReducer(generationReducer, initialState);

  useEffect(() => {
    if (externalGenerating) {
      dispatch({ type: "BEGIN" });
      return;
    }

    if (!skeleton?.zones?.length || !puzzles.length || !theme?.id.trim()) {
      return;
    }

    const result = validateRoomDataForComplete({
      skeleton,
      puzzles,
      theme,
      roomBrief,
      telemetry,
      viewportWidth,
    });

    if (result.ok) {
      dispatch({ type: "COMMIT", roomData: result.roomData });
      return;
    }

    if (state.attemptInFlight) {
      dispatch({
        type: "FAIL",
        error: result.errors[0] ?? "Generation output failed validation.",
        retryHint: result.retryHint,
      });
    }
  }, [
    externalGenerating,
    skeleton,
    puzzles,
    theme,
    roomBrief,
    telemetry,
    viewportWidth,
    state.attemptInFlight,
  ]);

  const resetGeneration = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const runGeneration = useCallback(async (task: () => void | Promise<void>) => {
    dispatch({ type: "BEGIN" });
    try {
      await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      dispatch({ type: "FAIL", error: message });
    }
  }, []);

  const isGenerating = externalGenerating || state.attemptInFlight;
  const status: GenerationStatus = isGenerating ? "generating" : state.status;

  const value = useMemo(
    (): GenerationContextValue => ({
      status,
      error: state.error,
      retryHint: state.retryHint,
      roomData: state.roomData,
      hasRoomData: state.roomData !== null,
      isGenerating,
      resetGeneration,
      runGeneration,
    }),
    [status, state.error, state.retryHint, state.roomData, isGenerating, resetGeneration, runGeneration],
  );

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}

export function useGeneration(): GenerationContextValue {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within GenerationProvider");
  return ctx;
}
