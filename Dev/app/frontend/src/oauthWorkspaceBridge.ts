/** Serialize in-progress builder fields before OAuth redirect; re-apply after login. */

const WORKSPACE_KEY = "escape-room-builder-oauth-workspace-v1";
const MAX_AGE_MS = 15 * 60 * 1000;

export type OAuthWorkspaceDraft = {
  savedAt: number;
  wizardStep: string;
  playersConcurrent: string;
  participantsTotal: string;
  sessionDurationMinutes: string;
  environmentType: string;
  availableItems: string;
  eventType: string;
  targetInterface: string;
  venueBuildType: string;
  roomDifficulty: string;
  themeMustMatchEnvironment: boolean;
  youthAddOnEnabled: boolean;
  youthAddOnGatesAdultFlow: boolean;
  youthAddOnAgeNote: string;
};

const readRaw = (): string | null => {
  try {
    return window.sessionStorage.getItem(WORKSPACE_KEY) ?? window.localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
};

const writeRaw = (payload: string): void => {
  try {
    window.sessionStorage.setItem(WORKSPACE_KEY, payload);
    window.localStorage.setItem(WORKSPACE_KEY, payload);
  } catch {
    // quota / private mode
  }
};

const clearRaw = (): void => {
  try {
    window.sessionStorage.removeItem(WORKSPACE_KEY);
    window.localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    // ignore
  }
};

export const stashWorkspaceDraftForOAuth = (draft: Omit<OAuthWorkspaceDraft, "savedAt">): void => {
  writeRaw(JSON.stringify({ ...draft, savedAt: Date.now() } satisfies OAuthWorkspaceDraft));
};

export const peekWorkspaceDraftForOAuth = (): OAuthWorkspaceDraft | null => {
  try {
    const raw = readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthWorkspaceDraft;
    if (!parsed || Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const consumeWorkspaceDraftForOAuth = (): OAuthWorkspaceDraft | null => {
  const row = peekWorkspaceDraftForOAuth();
  clearRaw();
  return row;
};
