import type { Request, Response } from "express";
import type { Express } from "express";
import { readJsonBlob, writeJsonBlob } from "./kvJsonStore.js";
import type {
  LeaderboardEntry,
  LiveGameState,
  LivePuzzleRow,
  OperatingMode,
  PlayerDisplayMode,
} from "../../shared/liveContracts.js";
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
const activeSseConnections = new Map<string, number>();

/** Count in-memory venue live sessions owned by a user (excludes the session being activated). */
export const countActiveVenueLiveSessions = (
  ownerUserId: string,
  excludeSessionId: string,
  resolveOwner: (sessionId: string) => string | undefined,
): number => {
  let count = 0;
  for (const [sid, state] of liveMemory.entries()) {
    if (sid === excludeSessionId) continue;
    if (state.operatingMode !== "venue") continue;
    if (resolveOwner(sid) === ownerUserId) count += 1;
  }
  return count;
};
export const getActiveLiveConnectionStats = (): Array<{ sessionId: string; connections: number }> =>
  [...activeSseConnections.entries()]
    .map(([sessionId, connections]) => ({ sessionId, connections }))
    .filter((entry) => entry.connections > 0);
const subscribers = new Map<string, Set<(state: LiveGameState) => void>>();
const leaderboards: LeaderboardEntry[] = [];

const liveBlobName = (sessionId: string): string => `live-game-${sessionId}.json`;

const normalizeLiveState = (state: LiveGameState): LiveGameState => ({
  ...state,
  playerDisplayMode: state.playerDisplayMode ?? "active_game",
  currentStageIndex: state.currentStageIndex ?? 0,
  playerDisplayReady: state.playerDisplayReady ?? false,
  playerDisplayReadyAtMs: state.playerDisplayReadyAtMs ?? null,
  customMediaLabel: state.customMediaLabel ?? "",
});

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
  if (cached) return normalizeLiveState(cached);
  const fromDisk = await readJsonBlob<LiveGameState>(liveBlobName(sessionId));
  if (fromDisk) {
    const normalized = normalizeLiveState(fromDisk);
    liveMemory.set(sessionId, normalized);
    return normalized;
  }
  return null;
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
    playerDisplayMode: "active_game",
    currentStageIndex: 0,
    playerDisplayReady: false,
    playerDisplayReadyAtMs: null,
    customMediaLabel: "",
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
    hasGmConsoleAccess?: (req: Request) => boolean | Promise<boolean>;
    readAuthUser?: (req: Request) => { id: string; isAdmin?: boolean } | undefined | Promise<{ id: string; isAdmin?: boolean } | undefined>;
    getSessionOwnerId?: (sessionId: string) => string | undefined;
    assertLiveInitAllowed?: (
      req: Request,
      sessionId: string,
      operatingMode: OperatingMode,
    ) => { code: string; message: string } | null | Promise<{ code: string; message: string } | null>;
    appendOperationalAudit?: (entry: {
      ts: string;
      action: string;
      email?: string;
      detail?: Record<string, unknown>;
    }) => Promise<void>;
  },
): void => {
  const liveDenied = (res: Response, denied: { code: string; message: string }): void => {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
  };

  const requireWritableLiveState = async (
    req: Request,
    res: Response,
    sessionId: string,
  ): Promise<LiveGameState | null> => {
    const state = await getLiveState(sessionId);
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return null;
    }
    if (state.operatingMode === "venue" && deps.assertLiveInitAllowed) {
      const denied = await Promise.resolve(deps.assertLiveInitAllowed(req, sessionId, "venue"));
      if (denied) {
        liveDenied(res, denied);
        return null;
      }
    }
    return state;
  };

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
    if (deps.assertLiveInitAllowed) {
      const denied = await Promise.resolve(deps.assertLiveInitAllowed(req, sessionId, operatingMode));
      if (denied) {
        liveDenied(res, denied);
        return;
      }
    }
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
    if (state.operatingMode === "venue" && deps.assertLiveInitAllowed) {
      const denied = await Promise.resolve(deps.assertLiveInitAllowed(req, sessionId, "venue"));
      if (denied) {
        liveDenied(res, denied);
        return;
      }
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const currentConnections = (activeSseConnections.get(sessionId) ?? 0) + 1;
    activeSseConnections.set(sessionId, currentConnections);
    void deps.appendOperationalAudit?.({
      ts: new Date().toISOString(),
      action: "live_sse_connected",
      detail: { sessionId, operatingMode: state.operatingMode, activeConnections: currentConnections },
    });

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
      const remaining = Math.max(0, (activeSseConnections.get(sessionId) ?? 1) - 1);
      if (remaining > 0) activeSseConnections.set(sessionId, remaining);
      else activeSseConnections.delete(sessionId);
      void deps.appendOperationalAudit?.({
        ts: new Date().toISOString(),
        action: "live_sse_disconnected",
        detail: { sessionId, activeConnections: remaining },
      });
    });
  });

  app.post("/api/live/:sessionId/timer", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
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
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
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
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
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
    if (stateBefore.operatingMode === "venue" && deps.assertLiveInitAllowed) {
      const denied = await Promise.resolve(deps.assertLiveInitAllowed(req, sessionId, "venue"));
      if (denied) {
        liveDenied(res, denied);
        return;
      }
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

  app.post("/api/live/:sessionId/player-ready", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
    const state = await patchLive(sessionId, (s) => {
      s.playerDisplayReady = true;
      s.playerDisplayReadyAtMs = Date.now();
      s.events.push({
        id: `ev_${Date.now()}_ready`,
        type: "player_ready",
        atMs: Date.now(),
      });
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({
      state,
      elapsedMs: computeElapsedMs(state),
      remainingMs: computeRemainingMs(state),
    });
  });

  app.post("/api/live/:sessionId/display", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
    const modeRaw = String(req.body?.mode ?? "");
    const allowed: PlayerDisplayMode[] = ["active_game", "hint_overlay", "end_game", "custom_media"];
    const mode = allowed.includes(modeRaw as PlayerDisplayMode) ? (modeRaw as PlayerDisplayMode) : null;
    if (!mode) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "mode must be active_game, hint_overlay, end_game, or custom_media.", details: [] },
      });
      return;
    }
    const customMediaLabel = String(req.body?.customMediaLabel ?? "").trim().slice(0, 120);
    const state = await patchLive(sessionId, (s) => {
      s.playerDisplayMode = mode;
      if (customMediaLabel) s.customMediaLabel = customMediaLabel;
      s.events.push({
        id: `ev_${Date.now()}_display`,
        type: "display_mode",
        atMs: Date.now(),
        detail: { mode, customMediaLabel: s.customMediaLabel },
      });
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({
      state,
      elapsedMs: computeElapsedMs(state),
      remainingMs: computeRemainingMs(state),
    });
  });

  app.post("/api/live/:sessionId/stage", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
    const index = Math.floor(Number(req.body?.index));
    const state = await patchLive(sessionId, (s) => {
      if (Number.isFinite(index) && index >= 0 && index < 32) {
        s.currentStageIndex = index;
        s.events.push({
          id: `ev_${Date.now()}_stage`,
          type: "stage_change",
          atMs: Date.now(),
          detail: { index },
        });
      }
    });
    if (!state) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Live session not found.", details: [] } });
      return;
    }
    res.json({ state, elapsedMs: computeElapsedMs(state), remainingMs: computeRemainingMs(state) });
  });

  app.post("/api/live/:sessionId/end", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "").trim();
    if (!(await requireWritableLiveState(req, res, sessionId))) return;
    const result = req.body?.result === "fail" ? "fail" : "success";
    const state = await patchLive(sessionId, (s) => {
      if (s.gameResult === "in_progress") {
        s.gameResult = result;
        s.playerDisplayMode = "end_game";
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
    const operatingMode = deps.deriveOperatingMode(session);
    if (operatingMode === "venue" && deps.assertLiveInitAllowed) {
      const denied = await Promise.resolve(deps.assertLiveInitAllowed(req, sessionId, "venue"));
      if (denied) {
        liveDenied(res, denied);
        return;
      }
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
