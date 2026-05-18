import type { LiveGameState } from "../../../../../shared/liveContracts.js";

export const baseLiveState = (overrides: Partial<LiveGameState> = {}): LiveGameState => ({
  sessionId: "sess_test",
  planName: "Test Theme",
  operatingMode: "venue",
  durationMinutes: 45,
  playersConcurrent: 6,
  activePlayerCount: 6,
  timerRunning: false,
  timerStartedAtMs: null,
  timerPausedElapsedMs: 0,
  timerAdjustmentMs: 0,
  currentClue: "",
  preSavedHints: ["Check the bookshelf", "Look under the desk"],
  puzzles: [
    { id: "p1", title: "Cipher Index", category: "logic", completed: false },
    { id: "p2", title: "Lock Box", category: "physical", completed: false },
    { id: "p3", title: "Signal Panel", category: "electronic", completed: false },
  ],
  events: [],
  gameResult: "in_progress",
  updatedAtMs: Date.now(),
  ...overrides,
});
