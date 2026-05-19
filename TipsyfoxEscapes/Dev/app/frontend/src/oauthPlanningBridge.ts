/** Preserve active planning session across OAuth redirects (token fingerprint changes after login). */

const OAUTH_PLANNING_KEY = "escape-room-builder-oauth-planning-v1";
const MAX_AGE_MS = 15 * 60 * 1000;

export type OAuthPlanningStash = {
  sessionId: string;
  deviceId: string;
  savedAt: number;
};

export const stashPlanningSessionForOAuth = (sessionId: string, deviceId: string): void => {
  const id = sessionId.trim();
  const dev = deviceId.trim();
  if (!id || !dev) return;
  try {
    const row: OAuthPlanningStash = { sessionId: id, deviceId: dev, savedAt: Date.now() };
    window.sessionStorage.setItem(OAUTH_PLANNING_KEY, JSON.stringify(row));
  } catch {
    // private mode / quota
  }
};

export const peekOAuthPlanningStash = (): OAuthPlanningStash | null => {
  try {
    const raw = window.sessionStorage.getItem(OAUTH_PLANNING_KEY);
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
  try {
    window.sessionStorage.removeItem(OAUTH_PLANNING_KEY);
  } catch {
    // ignore
  }
  return row;
};
