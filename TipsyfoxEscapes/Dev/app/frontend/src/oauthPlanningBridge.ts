/** Preserve active planning session across OAuth redirects (token fingerprint changes after login). */

const OAUTH_PLANNING_KEY = "escape-room-builder-oauth-planning-v1";
const MAX_AGE_MS = 15 * 60 * 1000;

export type OAuthPlanningStash = {
  sessionId: string;
  deviceId: string;
  savedAt: number;
};

const readRaw = (): string | null => {
  try {
    return window.sessionStorage.getItem(OAUTH_PLANNING_KEY) ?? window.localStorage.getItem(OAUTH_PLANNING_KEY);
  } catch {
    return null;
  }
};

const writeRaw = (payload: string): void => {
  try {
    window.sessionStorage.setItem(OAUTH_PLANNING_KEY, payload);
    window.localStorage.setItem(OAUTH_PLANNING_KEY, payload);
  } catch {
    // private mode / quota
  }
};

const clearRaw = (): void => {
  try {
    window.sessionStorage.removeItem(OAUTH_PLANNING_KEY);
    window.localStorage.removeItem(OAUTH_PLANNING_KEY);
  } catch {
    // ignore
  }
};

export const stashPlanningSessionForOAuth = (sessionId: string, deviceId: string): void => {
  const id = sessionId.trim();
  const dev = deviceId.trim();
  if (!id || !dev) return;
  const row: OAuthPlanningStash = { sessionId: id, deviceId: dev, savedAt: Date.now() };
  writeRaw(JSON.stringify(row));
};

export const peekOAuthPlanningStash = (): OAuthPlanningStash | null => {
  try {
    const raw = readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthPlanningStash;
    if (!parsed?.sessionId?.trim() || !parsed?.deviceId?.trim()) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const consumeOAuthPlanningStash = (): OAuthPlanningStash | null => {
  const row = peekOAuthPlanningStash();
  clearRaw();
  return row;
};
