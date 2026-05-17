import type { TargetInterface } from "./contracts";

export type OperatingMode = "home" | "venue";

export const targetInterfaceToOperatingMode = (target: TargetInterface): OperatingMode =>
  target === "commercial_venue" ? "venue" : "home";

export const operatingModeToTargetInterface = (mode: OperatingMode): TargetInterface =>
  mode === "venue" ? "commercial_venue" : "home_party";

export type LiveGameResult = "in_progress" | "success" | "fail";

export type LiveEventType =
  | "session_init"
  | "timer_start"
  | "timer_pause"
  | "timer_adjust"
  | "puzzle_complete"
  | "clue_sent"
  | "player_count"
  | "game_end";

export type LiveEvent = {
  id: string;
  type: LiveEventType;
  atMs: number;
  detail?: Record<string, unknown>;
};

export type LivePuzzleRow = {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  completedAtMs?: number;
};

export type LiveGameState = {
  sessionId: string;
  planName: string;
  operatingMode: OperatingMode;
  durationMinutes: number;
  playersConcurrent: number;
  activePlayerCount: number;
  timerRunning: boolean;
  timerStartedAtMs: number | null;
  timerPausedElapsedMs: number;
  timerAdjustmentMs: number;
  currentClue: string;
  preSavedHints: string[];
  puzzles: LivePuzzleRow[];
  events: LiveEvent[];
  gameResult: LiveGameResult;
  gameEndedAtMs?: number;
  updatedAtMs: number;
};

export type LeaderboardEntry = {
  planName: string;
  sessionId: string;
  result: "success" | "fail";
  elapsedMs: number;
  completedAtMs: number;
};
