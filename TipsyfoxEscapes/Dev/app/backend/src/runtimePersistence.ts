import { readJsonBlob, writeJsonBlob } from "./kvJsonStore.js";

type SessionSnapshot = Record<string, unknown>;

const AUTH_TOKENS_FILE = "auth-tokens.json";
const SESSIONS_FILE = "planning-sessions.json";

export const loadAuthTokens = async (authTokens: Map<string, string>): Promise<void> => {
  const parsed = await readJsonBlob<Record<string, string>>(AUTH_TOKENS_FILE);
  authTokens.clear();
  if (!parsed) return;
  for (const [token, userId] of Object.entries(parsed)) {
    if (token && userId) authTokens.set(token, userId);
  }
};

export const persistAuthTokens = async (authTokens: Map<string, string>): Promise<void> => {
  await writeJsonBlob(AUTH_TOKENS_FILE, Object.fromEntries(authTokens));
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
