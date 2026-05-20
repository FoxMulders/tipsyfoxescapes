export const AUTH_STORAGE_KEY = "escape-room-builder-auth-v1";

export type StoredAuthSession = {
  authToken: string;
  refreshToken: string;
  authUser: unknown | null;
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

const emptySession = (): StoredAuthSession => ({
  authToken: "",
  refreshToken: "",
  authUser: null,
  accessExpiresAt: 0,
  refreshExpiresAt: 0,
});

export const loadAuthSession = (): StoredAuthSession => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return emptySession();
    const parsed = JSON.parse(raw) as {
      authToken?: unknown;
      refreshToken?: unknown;
      authUser?: unknown;
      accessExpiresAt?: unknown;
      refreshExpiresAt?: unknown;
    };
    return {
      authToken: typeof parsed.authToken === "string" ? parsed.authToken : "",
      refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : "",
      authUser: parsed.authUser ?? null,
      accessExpiresAt:
        typeof parsed.accessExpiresAt === "number" && Number.isFinite(parsed.accessExpiresAt)
          ? parsed.accessExpiresAt
          : 0,
      refreshExpiresAt:
        typeof parsed.refreshExpiresAt === "number" && Number.isFinite(parsed.refreshExpiresAt)
          ? parsed.refreshExpiresAt
          : 0,
    };
  } catch {
    return emptySession();
  }
};

export const saveAuthSession = (session: StoredAuthSession): void => {
  if (!session.authToken.trim()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

/**
 * Subscribe to auth session changes written by OTHER browser tabs/windows.
 * The callback receives the new session, or null when the other tab signed out.
 * Returns an unsubscribe function.
 */
export const subscribeCrossTabAuth = (
  callback: (session: StoredAuthSession | null) => void,
): (() => void) => {
  const handler = (e: StorageEvent) => {
    if (e.key !== AUTH_STORAGE_KEY) return;
    if (e.newValue === null || e.newValue === "") {
      callback(null);
      return;
    }
    const parsed = loadAuthSession();
    callback(parsed.authToken.trim() ? parsed : null);
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};
