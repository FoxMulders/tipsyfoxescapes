import { loadAuthSession, type StoredAuthSession } from "./authStorage.js";

export type AuthErrorCode =
  | "UNAUTHORIZED"
  | "TOKEN_MISSING"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "REFRESH_INVALID"
  | "REFRESH_EXPIRED"
  | "USER_NOT_FOUND";

type AuthApiConfig = {
  apiBase: string;
  deviceId: string;
  getSession: () => StoredAuthSession;
  persistSession: (session: StoredAuthSession) => void;
  onSessionExpired: (message?: string) => void;
};

const PROACTIVE_REFRESH_SKEW_MS = 5 * 60 * 1000;

let config: AuthApiConfig | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const configureAuthApi = (next: AuthApiConfig): void => {
  config = next;
};

export const parseAuthErrorCode = (payload: unknown): AuthErrorCode | undefined => {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return undefined;
  const code = (payload as { error?: { code?: string } }).error?.code;
  if (
    code === "UNAUTHORIZED" ||
    code === "TOKEN_MISSING" ||
    code === "TOKEN_EXPIRED" ||
    code === "TOKEN_INVALID" ||
    code === "REFRESH_INVALID" ||
    code === "REFRESH_EXPIRED" ||
    code === "USER_NOT_FOUND"
  ) {
    return code;
  }
  return undefined;
};

export const isRecoverableAuthError = (code?: AuthErrorCode): boolean =>
  code === "TOKEN_EXPIRED" || code === "TOKEN_MISSING";

export const isFatalAuthError = (code?: AuthErrorCode): boolean =>
  code === "TOKEN_INVALID" ||
  code === "REFRESH_INVALID" ||
  code === "REFRESH_EXPIRED" ||
  code === "USER_NOT_FOUND";

export const shouldProactiveRefresh = (accessExpiresAt: number): boolean => {
  if (!accessExpiresAt) return false;
  return Date.now() >= accessExpiresAt - PROACTIVE_REFRESH_SKEW_MS;
};

const readJsonSafe = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const refreshAuthTokens = async (): Promise<boolean> => {
  if (!config) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = config!.getSession();
    const refreshToken = session.refreshToken.trim();

    if (!refreshToken) {
      // No refresh token in React state — check if another tab already refreshed.
      const stored = loadAuthSession();
      if (stored.authToken.trim() && stored.authToken !== session.authToken) {
        config!.persistSession(stored);
        return true;
      }
      return false;
    }

    try {
      const response = await fetch(`${config!.apiBase}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": config!.deviceId,
        },
        body: JSON.stringify({ refreshToken }),
      });
      const data = (await readJsonSafe(response)) as {
        authToken?: string;
        refreshToken?: string;
        accessExpiresAt?: number;
        refreshExpiresAt?: number;
        user?: unknown;
        error?: { code?: AuthErrorCode; message?: string };
      };

      if (!response.ok || !data.authToken) {
        const code = parseAuthErrorCode(data);
        if (isFatalAuthError(code)) {
          // Before treating this as fatal, check whether another tab already
          // won the refresh race and wrote a valid token to localStorage.
          const stored = loadAuthSession();
          if (stored.authToken.trim() && stored.authToken !== session.authToken) {
            config!.persistSession(stored);
            return true;
          }
          config!.onSessionExpired(data.error?.message);
        }
        return false;
      }

      config!.persistSession({
        authToken: data.authToken,
        refreshToken: data.refreshToken ?? refreshToken,
        authUser: data.user ?? session.authUser,
        accessExpiresAt:
          typeof data.accessExpiresAt === "number" ? data.accessExpiresAt : session.accessExpiresAt,
        refreshExpiresAt:
          typeof data.refreshExpiresAt === "number" ? data.refreshExpiresAt : session.refreshExpiresAt,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

const buildAuthHeaders = (session: StoredAuthSession, init?: RequestInit): Headers => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = session.authToken.trim();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (config) headers.set("X-Device-Id", config.deviceId);
  return headers;
};

export const authFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  if (!config) {
    return fetch(input, init);
  }

  const run = async (allowRefresh: boolean): Promise<Response> => {
    let session = config!.getSession();
    if (allowRefresh && session.refreshToken && shouldProactiveRefresh(session.accessExpiresAt)) {
      await refreshAuthTokens();
      session = config!.getSession();
    }

    const response = await fetch(input, { ...init, headers: buildAuthHeaders(session, init) });
    if (response.status !== 401 || !allowRefresh) return response;

    const data = await readJsonSafe(response.clone());
    const code = parseAuthErrorCode(data);
    if (!isRecoverableAuthError(code)) {
      if (isFatalAuthError(code)) {
        // Check cross-tab: another tab may have already refreshed the token.
        const stored = loadAuthSession();
        const currentToken = config!.getSession().authToken;
        if (stored.authToken.trim() && stored.authToken !== currentToken) {
          config!.persistSession(stored);
          return run(false);
        }
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error?: { message?: string } }).error?.message ?? "")
            : "";
        config!.onSessionExpired(message || undefined);
      }
      return response;
    }

    const refreshed = await refreshAuthTokens();
    if (!refreshed) return response;
    return run(false);
  };

  return run(true);
};

export const ensureAuthBootstrap = async (): Promise<"guest" | "authenticated"> => {
  if (!config) return "guest";
  const session = config.getSession();
  if (!session.authToken.trim()) return "guest";

  if (session.refreshToken && shouldProactiveRefresh(session.accessExpiresAt)) {
    await refreshAuthTokens();
  }

  try {
    const response = await authFetch(`${config.apiBase}/api/me`, { method: "GET" });
    if (response.ok) return "authenticated";
    const data = await readJsonSafe(response);
    const code = parseAuthErrorCode(data);
    if (code === "TOKEN_EXPIRED" && session.refreshToken) {
      const refreshed = await refreshAuthTokens();
      if (refreshed) {
        const retry = await authFetch(`${config.apiBase}/api/me`, { method: "GET" });
        return retry.ok ? "authenticated" : "guest";
      }
    }
    if (isFatalAuthError(code)) return "guest";
    return session.authToken.trim() ? "authenticated" : "guest";
  } catch {
    return session.authToken.trim() ? "authenticated" : "guest";
  }
};
