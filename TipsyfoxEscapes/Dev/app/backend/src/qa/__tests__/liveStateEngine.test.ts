import { describe, expect, it } from "vitest";
import {
  applyPuzzleComplete,
  applyTimerAction,
  computePuzzleProgress,
  computeRemainingMs,
} from "../liveStateEngine.js";
import { baseLiveState } from "./helpers/liveFixtures.js";

describe("Live operation state engine (Gamemaster console)", () => {
  const t0 = 1_700_000_000_000;

  it("starts and pauses the countdown timer", () => {
    let state = baseLiveState();
    state = applyTimerAction(state, "start", { now: t0 });
    expect(state.timerRunning).toBe(true);
    state = applyTimerAction(state, "pause", { now: t0 + 60_000 });
    expect(state.timerRunning).toBe(false);
    expect(state.timerPausedElapsedMs).toBe(60_000);
    expect(state.events.some((e) => e.type === "timer_start")).toBe(true);
    expect(state.events.some((e) => e.type === "timer_pause")).toBe(true);
  });

  it("adjusts remaining time with +1 / -1 minute overrides", () => {
    let state = baseLiveState({ durationMinutes: 45, timerAdjustmentMs: 0 });
    state = applyTimerAction(state, "adjust", { deltaMinutes: -1 });
    expect(computeRemainingMs(state, t0)).toBe(46 * 60_000);
    state = applyTimerAction(state, "adjust", { deltaMinutes: 1 });
    expect(computeRemainingMs(state, t0)).toBe(45 * 60_000);
  });

  it("recalculates puzzle progress when a row is completed", () => {
    let state = baseLiveState();
    expect(computePuzzleProgress(state).ratio).toBe(0);
    state = applyPuzzleComplete(state, "p1", t0);
    state = applyPuzzleComplete(state, "p2", t0);
    const progress = computePuzzleProgress(state);
    expect(progress.solved).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.ratio).toBeCloseTo(2 / 3);
  });
});
