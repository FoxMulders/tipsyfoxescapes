import { promises as fs } from "fs";
import path from "path";
import { ensureDataDir, getDataDir } from "./dataDir.js";

type SessionSnapshot = Record<string, unknown>;

const tokensPath = (): string => path.join(getDataDir(), "auth-tokens.json");
const sessionsPath = (): string => path.join(getDataDir(), "planning-sessions.json");

export const loadAuthTokens = async (authTokens: Map<string, string>): Promise<void> => {
  try {
    const raw = await fs.readFile(tokensPath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    authTokens.clear();
    for (const [token, userId] of Object.entries(parsed)) {
      if (token && userId) authTokens.set(token, userId);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
};

export const persistAuthTokens = async (authTokens: Map<string, string>): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(tokensPath(), JSON.stringify(Object.fromEntries(authTokens), null, 2), "utf8");
};

export const loadPlanningSessions = async (
  sessions: Map<string, unknown>,
  revive: (raw: SessionSnapshot) => unknown,
): Promise<void> => {
  try {
    const raw = await fs.readFile(sessionsPath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, SessionSnapshot>;
    sessions.clear();
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
  await ensureDataDir();
  const out: Record<string, SessionSnapshot> = {};
  for (const [id, session] of sessions.entries()) {
    out[id] = serialize(session);
  }
  await fs.writeFile(sessionsPath(), JSON.stringify(out), "utf8");
};
