import type { Request, Response } from "express";
import type { Express } from "express";
import { readJsonBlob, writeJsonBlob } from "./kvJsonStore.js";
import type { LeaderboardEntry, LiveGameState, LivePuzzleRow, OperatingMode } from "../../shared/liveContracts.js";
import { validateClueForOperatingMode } from "./qa/cluePolicy.js";
import { buildResetChecklistSteps } from "./qa/resetChecklist.js";
import {
  applyClue,
  applyPuzzleComplete,
  applyTimerAction,
  computeElapsedMs,
  computeRemainingMs,
} from "./qa/liveStateEngine.js";

const liveMemory = new Map<string, LiveGameState>();
const subscribers = new Map<string, Set<(state: LiveGameState) => void>>();
const leaderboards: LeaderboardEntry[] = [];

const liveBlobName = (sessionId: string): string => `live-game-${sessionId}.json`;

const notify = (sessionId: string, state: LiveGameState): void => {
  const subs = subscribers.get(sessionId);
  if (!subs) return;
  for (const fn of subs) fn(state);
};

export const subscribeLive = (sessionId: string, fn: (state: LiveGameState) => void): (() => void) => {
  let set = subscribers.get(sessionId);
  if (!set) {
    set = new Set();
    subscribers.set(sessionId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) subscribers.delete(sessionId);
  };
};

export const getLiveState = async (sessionId: string): Promise<LiveGameState | null> => {
  const cached = liveMemory.get(sessionId);
  if (cached) return cached;
  const fromDisk = await readJsonBlob<LiveGameState>(liveBlobName(sessionId));
  if (fromDisk) liveMemory.set(sessionId, fromDisk);
  return fromDisk;
};

const persistLive = async (state: LiveGameState): Promise<void> => {
  state.updatedAtMs = Date.now();
  liveMemory.set(state.sessionId, state);
  await writeJsonBlob(liveBlobName(state.sessionId), state);
  notify(state.sessionId, state);
};

export { computeElapsedMs, computeRemainingMs } from "./qa/liveStateEngine.js";

export const initLiveState = async (input: {
  sessionId: string;
  planName: string;
  operatingMode: OperatingMode;
  durationMinutes: number;
  playersConcurrent: number;
  puzzles: LivePuzzleRow[];
  preSavedHints?: string[];
}): Promise<LiveGameState> => {
  const existing = await getLiveState(input.sessionId);
  if (existing) return existing;

  const state: LiveGameState = {
    sessionId: input.sessionId,
    planName: input.planName,
    operatingMode: input.operatingMode,
    durationMinutes: input.durationMinutes,
    playersConcurrent: input.playersConcurrent,
    activePlayerCount: input.playersConcurrent,
    timerRunning: false,
    timerStartedAtMs: null,
    timerPausedElapsedMs: 0,
    timerAdjustmentMs: 0,
    currentClue: "",
    preSavedHints: input.preSavedHints ?? [],
    puzzles: input.puzzles,
    events: [
      {
        id: `ev_${Date.now()}_init`,
        type: "session_init",
        atMs: Date.now(),
        detail: { operatingMode: input.operatingMode },
      },
    ],
    gameResult: "in_progress",
    updatedAtMs: Date.now(),
  };
  await persistLive(state);
  return state;
};

const patchLive = async (
  sessionId: string,
  mutator: (state: LiveGameState) => void,
): Promise<LiveGameState | null> => {
  const state = await getLiveState(sessionId);
  if (!state) return null;
  mutator(state);
  await persistLive(state);
  return state;
};

export const getLeaderboard = (): LeaderboardEntry[] =>
  [...leaderboards].sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, 50);

export type LivePlanningSession = {
  planningInput: {
    playersConcurrent: number;
    sessionDurationMinutes: number;
    availableItems: string[];
  };
  selectedTheme?: { name: string };
  currentPuzzles: Array<{ id: string; title: string; category: string; solveSteps: string[] }>;
};

export const registerLiveRoutes = (
  app: Express,
  deps: {
    resolvePlanningSession: (sessionId: string) => LivePlanningSession | undefined;
    deriveOperatingMode: (session: LivePlanningSession) => OperatingMode;
    hasGmConsoleAccess: (req: Request) => boolean;
  },
): void => {
  app.post("/api/live/:sessionId/init", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const session = deps.resolvePlanningSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Planning session not found.", details: [] } });
      return;
    }
    const operatingMode =
      req.body?.operatingMode === "home" || req.body?.operatingMode === "venue"
        ? req.body.operatingMode
        : deps.deriveOperatingMode(session);
    const puzzles: LivePuzzleRow[] = session.currentPuzzles.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      completed: false,
    }));
    const hints = session.currentPuzzles
      .flatMap((p) => p.solveSteps.slice(0, 1))
      .filter(Boolean)
      .slice(0, 8);
    const state = await initLiveState({
      sessionId,
      planName: session.selectedTheme?.name ?? "Escape room",
      operatingMode,
      durationMinutes: session.planningInput.sessionDurationMinutes,
      playersConcurrent: session.planningInput.playersConcurrent,
      puzzles,
      preSavedHints: hints,
    });
    res.json({ state, hasGmConsole: operatingMode === "venue" });
  });

  app.get("/api/live/:sessionId", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const state = await getLiveState(sessionId);
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not initialized.", details: [] } });
      return;
    }
    res.json({
      state,
      elapsedMs: computeElapsedMs(state),
      remainingMs: computeRemainingMs(state),
    });
  });

  app.get("/api/live/:sessionId/stream", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const state = await getLiveState(sessionId);
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not initialized.", details: [] } });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (s: LiveGameState) => {
      const payload = JSON.stringify({
        state: s,
        elapsedMs: computeElapsedMs(s),
        remainingMs: computeRemainingMs(s),
      });
      res.write(`data: ${payload}\n\n`);
    };
    send(state);
    const unsub = subscribeLive(sessionId, send);
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsub();
    });
  });

  app.post("/api/live/:sessionId/timer", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const action = String(req.body?.action ?? "");
    const deltaMin = Number(req.body?.deltaMinutes);
    const state = await patchLive(sessionId, (s) => {
      if (Number.isFinite(deltaMin) && deltaMin !== 0) {
        const updated = applyTimerAction(s, "adjust", { deltaMinutes: deltaMin });
        Object.assign(s, updated);
        return;
      }
      const timerAction =
        action === "start" || action === "pause" || action === "adjust" ? action : null;
      if (!timerAction) return;
      const updated = applyTimerAction(s, timerAction, {
        deltaMinutes: action === "adjust" ? deltaMin : undefined,
      });
      Object.assign(s, updated);
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({ state, elapsedMs: computeElapsedMs(state), remainingMs: computeRemainingMs(state) });
  });

  app.post("/api/live/:sessionId/players", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const count = Math.floor(Number(req.body?.count));
    const state = await patchLive(sessionId, (s) => {
      if (Number.isFinite(count) && count >= 0 && count <= 99) {
        s.activePlayerCount = count;
        s.events.push({
          id: `ev_${Date.now()}_pc`,
          type: "player_count",
          atMs: Date.now(),
          detail: { count },
        });
      }
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({ state });
  });

  app.post("/api/live/:sessionId/puzzles/:puzzleId/complete", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const puzzleId = String(req.params.puzzleId ?? "").trim();
    const state = await patchLive(sessionId, (s) => {
      const updated = applyPuzzleComplete(s, puzzleId);
      Object.assign(s, updated);
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({ state });
  });

  app.post("/api/live/:sessionId/clue", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const clueRaw = String(req.body?.clue ?? "");
    const stateBefore = await getLiveState(sessionId);
    if (!stateBefore) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    const clueCheck = validateClueForOperatingMode(clueRaw, stateBefore.operatingMode, stateBefore.preSavedHints);
    if (!clueCheck.ok) {
      res.status(422).json({
        error: { code: clueCheck.code, message: clueCheck.message, details: [] },
      });
      return;
    }
    const state = await patchLive(sessionId, (s) => {
      const updated = applyClue(s, clueCheck.clue);
      Object.assign(s, updated);
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({ state });
  });

  app.post("/api/live/:sessionId/end", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const result = req.body?.result === "fail" ? "fail" : "success";
    const state = await patchLive(sessionId, (s) => {
      if (s.gameResult === "in_progress") {
        s.gameResult = result;
        s.gameEndedAtMs = Date.now();
        s.timerRunning = false;
        if (s.timerStartedAtMs != null) {
          s.timerPausedElapsedMs += Date.now() - s.timerStartedAtMs;
          s.timerStartedAtMs = null;
        }
        const elapsedMs = computeElapsedMs(s);
        s.events.push({
          id: `ev_${Date.now()}_end`,
          type: "game_end",
          atMs: Date.now(),
          detail: { result, elapsedMs },
        });
        leaderboards.push({
          planName: s.planName,
          sessionId: s.sessionId,
          result,
          elapsedMs,
          completedAtMs: s.gameEndedAtMs,
        });
        if (leaderboards.length > 200) leaderboards.splice(0, leaderboards.length - 200);
      }
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({ state });
  });

  app.get("/api/live/leaderboard", (_req, res) => {
    res.json({ entries: getLeaderboard() });
  });

  app.get("/api/live/:sessionId/reset-checklist", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    const session = deps.resolvePlanningSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Planning session not found.", details: [] } });
      return;
    }
    const steps = buildResetChecklistSteps({
      puzzles: session.currentPuzzles.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category as "logic" | "physical" | "electronic",
      })),
      availableItems: session.planningInput.availableItems,
    });
    res.json({ steps });
  });
};
