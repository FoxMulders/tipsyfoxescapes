/**
 * Pure live-session state transitions (Gamemaster console / player display).
 */
import type { LiveGameState, LiveEvent } from "../../../shared/liveContracts.js";

export type TimerAction = "start" | "pause" | "adjust";

const newEvent = (type: LiveEvent["type"], detail?: Record<string, unknown>): LiveEvent => ({
  id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  type,
  atMs: Date.now(),
  detail,
});

export const computeElapsedMs = (state: LiveGameState, now = Date.now()): number => {
  let elapsed = state.timerPausedElapsedMs + state.timerAdjustmentMs;
  if (state.timerRunning && state.timerStartedAtMs != null) {
    elapsed += now - state.timerStartedAtMs;
  }
  return elapsed;
};

export const computeRemainingMs = (state: LiveGameState, now = Date.now()): number => {
  const total = state.durationMinutes * 60_000;
  return Math.max(0, total - computeElapsedMs(state, now));
};

export const computePuzzleProgress = (
  state: Pick<LiveGameState, "puzzles">,
): { solved: number; total: number; ratio: number } => {
  const total = state.puzzles.length;
  const solved = state.puzzles.filter((p) => p.completed).length;
  return { solved, total, ratio: total > 0 ? solved / total : 0 };
};

export const applyTimerAction = (
  state: LiveGameState,
  action: TimerAction,
  opts?: { deltaMinutes?: number; now?: number },
): LiveGameState => {
  const next = { ...state, events: [...state.events] };
  const now = opts?.now ?? Date.now();

  if (action === "start") {
    if (!next.timerRunning) {
      next.timerStartedAtMs = now;
      next.timerRunning = true;
      next.events.push(newEvent("timer_start"));
    }
  } else if (action === "pause") {
    if (next.timerRunning && next.timerStartedAtMs != null) {
      next.timerPausedElapsedMs += now - next.timerStartedAtMs;
      next.timerStartedAtMs = null;
      next.timerRunning = false;
      next.events.push(newEvent("timer_pause"));
    }
  } else if (action === "adjust") {
    const deltaMin = Number(opts?.deltaMinutes);
    if (Number.isFinite(deltaMin)) {
      next.timerAdjustmentMs += deltaMin * 60_000;
      next.events.push(newEvent("timer_adjust", { deltaMinutes: deltaMin }));
    }
  }

  return next;
};

export const applyPuzzleComplete = (
  state: LiveGameState,
  puzzleId: string,
  now = Date.now(),
): LiveGameState => {
  const next = {
    ...state,
    puzzles: state.puzzles.map((p) => ({ ...p })),
    events: [...state.events],
  };
  const row = next.puzzles.find((p) => p.id === puzzleId);
  if (row && !row.completed) {
    row.completed = true;
    row.completedAtMs = now;
    next.events.push(newEvent("puzzle_complete", { puzzleId, title: row.title }));
  }
  return next;
};

export const applyClue = (state: LiveGameState, clue: string): LiveGameState => {
  const trimmed = clue.trim().slice(0, 500);
  const next = { ...state, events: [...state.events] };
  next.currentClue = trimmed;
  if (trimmed) next.events.push(newEvent("clue_sent", { clue: trimmed }));
  return next;
};

/** Payload shape pushed to player display / SSE consumers. */
export const buildPlayerDisplayPayload = (
  state: LiveGameState,
  now = Date.now(),
): {
  sessionId: string;
  planName: string;
  operatingMode: LiveGameState["operatingMode"];
  remainingMs: number;
  currentClue: string;
  progress: ReturnType<typeof computePuzzleProgress>;
} => ({
  sessionId: state.sessionId,
  planName: state.planName,
  operatingMode: state.operatingMode,
  remainingMs: computeRemainingMs(state, now),
  currentClue: state.currentClue,
  progress: computePuzzleProgress(state),
});
