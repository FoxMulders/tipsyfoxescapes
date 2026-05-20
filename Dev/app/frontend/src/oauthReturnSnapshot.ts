/** Full builder snapshot before OAuth redirect; rehydrated immediately after login. */

import type { OAuthWorkspaceDraft } from "./oauthWorkspaceBridge.js";

const SNAPSHOT_KEY = "escape-room-builder-oauth-return-v1";
const MAX_AGE_MS = 15 * 60 * 1000;

export type OAuthReturnSnapshot = OAuthWorkspaceDraft & {
  savedAt: number;
  sessionId: string;
  deviceId: string;
  themePath: "custom" | "generated" | null;
  selectedThemeId: string;
  themes: Array<{
    id: string;
    name: string;
    description: string;
    tldr?: string;
    recommendedPuzzles?: Array<{ id: string; title: string; category: string; objective: string; howItWorks: string; difficulty: string }>;
  }>;
  puzzles: unknown[];
  existingPuzzles: Array<{ name: string; link: string; roomPart: string }>;
  suggestedAdditions: string[];
  suggestedAdditionsRequired: string[];
  storyPlan: unknown | null;
  compatibilityPassed: boolean | null;
  approvedForBuild: boolean;
  useCustomMainPuzzleCount: boolean;
  customMainPuzzleCountStr: string;
  useCustomMix: boolean;
  customMixLogic: string;
  customMixPhysical: string;
  customMixElectronic: string;
};

const readRaw = (): string | null => {
  try {
    return window.sessionStorage.getItem(SNAPSHOT_KEY) ?? window.localStorage.getItem(SNAPSHOT_KEY);
  } catch {
    return null;
  }
};

const writeRaw = (payload: string): void => {
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, payload);
    window.localStorage.setItem(SNAPSHOT_KEY, payload);
  } catch {
    // quota / private mode
  }
};

const clearRaw = (): void => {
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY);
    window.localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
};

export const stashOAuthReturnSnapshot = (snapshot: Omit<OAuthReturnSnapshot, "savedAt">): void => {
  writeRaw(JSON.stringify({ ...snapshot, savedAt: Date.now() } satisfies OAuthReturnSnapshot));
};

export const peekOAuthReturnSnapshot = (): OAuthReturnSnapshot | null => {
  try {
    const raw = readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthReturnSnapshot;
    if (!parsed || Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const consumeOAuthReturnSnapshot = (): OAuthReturnSnapshot | null => {
  const row = peekOAuthReturnSnapshot();
  clearRaw();
  return row;
};
