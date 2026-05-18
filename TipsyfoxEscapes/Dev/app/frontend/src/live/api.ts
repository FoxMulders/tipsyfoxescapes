import type { LeaderboardEntry, LiveGameState, OperatingMode } from "../../../shared/liveContracts";

const API_BASE = "";

export type LiveSnapshot = {
  state: LiveGameState;
  elapsedMs: number;
  remainingMs: number;
};

export const initLiveSession = async (
  sessionId: string,
  operatingMode?: OperatingMode,
): Promise<{ state: LiveGameState; hasGmConsole: boolean }> => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operatingMode ? { operatingMode } : {}),
  });
  const data = (await res.json()) as { state?: LiveGameState; hasGmConsole?: boolean; error?: { message?: string } };
  if (!res.ok || !data.state) throw new Error(data.error?.message ?? "Could not start live session.");
  return { state: data.state, hasGmConsole: Boolean(data.hasGmConsole) };
};

export const fetchLiveSnapshot = async (sessionId: string): Promise<LiveSnapshot> => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}`);
  const data = (await res.json()) as LiveSnapshot & { error?: { message?: string } };
  if (!res.ok || !data.state) throw new Error(data.error?.message ?? "Live session not found.");
  return data;
};

export const postLiveTimer = async (
  sessionId: string,
  action: "start" | "pause" | "adjust",
  deltaMinutes?: number,
) => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/timer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, deltaMinutes }),
  });
  return (await res.json()) as LiveSnapshot;
};

export const postPuzzleComplete = async (sessionId: string, puzzleId: string) => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/puzzles/${puzzleId}/complete`, { method: "POST" });
  return (await res.json()) as { state: LiveGameState };
};

export const postLiveClue = async (sessionId: string, clue: string) => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/clue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clue }),
  });
  return (await res.json()) as { state: LiveGameState };
};

export const postLivePlayers = async (sessionId: string, count: number) => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  return (await res.json()) as { state: LiveGameState };
};

export const postGameEnd = async (sessionId: string, result: "success" | "fail") => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result }),
  });
  return (await res.json()) as { state: LiveGameState };
};

export const fetchResetChecklist = async (sessionId: string): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/api/live/${sessionId}/reset-checklist`);
  const data = (await res.json()) as { steps?: string[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Checklist unavailable.");
  return data.steps ?? [];
};

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const res = await fetch(`${API_BASE}/api/live/leaderboard`);
  const data = (await res.json()) as { entries?: LeaderboardEntry[] };
  return data.entries ?? [];
};

export const formatMsClock = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
