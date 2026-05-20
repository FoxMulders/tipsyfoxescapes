import type { AuthSessionRecord } from "./authSession.js";
import { readJsonBlob, writeJsonBlob } from "./kvJsonStore.js";

type SessionSnapshot = Record<string, unknown>;

const AUTH_TOKENS_FILE = "auth-tokens.json";
const SESSIONS_FILE = "planning-sessions.json";

const nowMs = (): number => Date.now();
const LEGACY_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LEGACY_REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const isSessionRecord = (value: unknown): value is AuthSessionRecord => {
  if (!value || typeof value !== "object") return false;
  const row = value as AuthSessionRecord;
  return (
    typeof row.userId === "string" &&
    typeof row.accessToken === "string" &&
    typeof row.refreshToken === "string" &&
    typeof row.accessExpiresAt === "number" &&
    typeof row.refreshExpiresAt === "number"
  );
};

export const loadAuthSessions = async (): Promise<AuthSessionRecord[]> => {
  const parsed = await readJsonBlob<unknown>(AUTH_TOKENS_FILE);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed.filter(isSessionRecord);
  }
  if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { sessions?: unknown }).sessions)) {
    return ((parsed as { sessions: unknown[] }).sessions ?? []).filter(isSessionRecord);
  }
  const legacy = parsed as Record<string, unknown>;
  const issued = nowMs();
  const rows: AuthSessionRecord[] = [];
  for (const [accessToken, value] of Object.entries(legacy)) {
    if (!accessToken) continue;
    if (typeof value === "string" && value) {
      rows.push({
        userId: value,
        accessToken,
        refreshToken: `rt_migrated_${accessToken.slice(-12)}`,
        accessExpiresAt: issued + LEGACY_ACCESS_TTL_MS,
        refreshExpiresAt: issued + LEGACY_REFRESH_TTL_MS,
      });
      continue;
    }
    if (isSessionRecord(value) && value.accessToken === accessToken) {
      rows.push(value);
    }
  }
  return rows;
};

export const persistAuthSessions = async (sessions: AuthSessionRecord[]): Promise<void> => {
  await writeJsonBlob(AUTH_TOKENS_FILE, { version: 2, sessions });
};

/** @deprecated Use loadAuthSessions — fills legacy access→userId map. */
export const loadAuthTokens = async (authTokens: Map<string, string>): Promise<void> => {
  const rows = await loadAuthSessions();
  authTokens.clear();
  for (const row of rows) {
    authTokens.set(row.accessToken, row.userId);
  }
};

/** @deprecated Use persistAuthSessions */
export const persistAuthTokens = async (authTokens: Map<string, string>): Promise<void> => {
  const issued = nowMs();
  const sessions: AuthSessionRecord[] = Array.from(authTokens.entries()).map(([accessToken, userId]) => ({
    userId,
    accessToken,
    refreshToken: `rt_legacy_${accessToken.slice(-12)}`,
    accessExpiresAt: issued + LEGACY_ACCESS_TTL_MS,
    refreshExpiresAt: issued + LEGACY_REFRESH_TTL_MS,
  }));
  await persistAuthSessions(sessions);
};

export const loadPlanningSessions = async (
  sessions: Map<string, unknown>,
  revive: (raw: SessionSnapshot) => unknown,
): Promise<void> => {
  try {
    const parsed = await readJsonBlob<Record<string, SessionSnapshot>>(SESSIONS_FILE);
    sessions.clear();
    if (!parsed) return;
    for (const [id, snapshot] of Object.entries(parsed)) {
      sessions.set(id, revive(snapshot));
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
};

export const persistPlanningSessions = async (
  sessions: Map<string, unknown>,
  serialize: (session: unknown) => SessionSnapshot,
): Promise<void> => {
  const out: Record<string, SessionSnapshot> = {};
  for (const [id, session] of sessions.entries()) {
    out[id] = serialize(session);
  }
  await writeJsonBlob(SESSIONS_FILE, out);
};
