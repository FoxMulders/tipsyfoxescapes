import type express from "express";
import { randomBytes } from "node:crypto";
import { loadAuthSessions, persistAuthSessions } from "./runtimePersistence.js";

export type AuthErrorCode =
  | "UNAUTHORIZED"
  | "TOKEN_MISSING"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "REFRESH_INVALID"
  | "REFRESH_EXPIRED"
  | "USER_NOT_FOUND";

export type AuthSessionRecord = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

export type AuthValidation =
  | { ok: true; userId: string; record: AuthSessionRecord }
  | { ok: false; code: AuthErrorCode; message: string };

export type IssuedAuthTokens = {
  authToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

const ACCESS_TTL_MS = Number(process.env.AUTH_ACCESS_TTL_MS ?? 7 * 24 * 60 * 60 * 1000);
const REFRESH_TTL_MS = Number(process.env.AUTH_REFRESH_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);

const randomSuffix = (): string => randomBytes(12).toString("hex");

export const extractBearerToken = (req: express.Request): string | undefined => {
  const authHeader = String(req.headers.authorization ?? "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  return token || undefined;
};

export class AuthTokenStore {
  private byAccess = new Map<string, AuthSessionRecord>();
  private byRefresh = new Map<string, string>();
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const rows = await loadAuthSessions();
    this.byAccess.clear();
    this.byRefresh.clear();
    for (const row of rows) {
      this.index(row);
    }
    this.loaded = true;
  }

  private index(record: AuthSessionRecord): void {
    this.byAccess.set(record.accessToken, record);
    this.byRefresh.set(record.refreshToken, record.accessToken);
  }

  async syncToDisk(): Promise<void> {
    await persistAuthSessions(Array.from(this.byAccess.values()));
  }

  private async persist(): Promise<void> {
    await this.syncToDisk();
  }

  async reloadFromDisk(): Promise<void> {
    this.loaded = false;
    await this.ensureLoaded();
  }

  validateAccessToken(accessToken: string): AuthValidation {
    const token = accessToken.trim();
    if (!token) {
      return { ok: false, code: "TOKEN_MISSING", message: "Auth token is required." };
    }
    const record = this.byAccess.get(token);
    if (!record) {
      return {
        ok: false,
        code: "TOKEN_INVALID",
        message: "Sign-in token is not recognized. Please log in again.",
      };
    }
    const now = Date.now();
    if (record.accessExpiresAt > 0 && now >= record.accessExpiresAt) {
      return {
        ok: false,
        code: "TOKEN_EXPIRED",
        message: "Sign-in session expired. Refresh or log in again.",
      };
    }
    return { ok: true, userId: record.userId, record };
  }

  async validateAccessTokenWithReload(accessToken: string): Promise<AuthValidation> {
    let result = this.validateAccessToken(accessToken);
    if (result.ok || result.code !== "TOKEN_INVALID") return result;
    await this.ensureLoaded();
    result = this.validateAccessToken(accessToken);
    return result;
  }

  async issueTokenPair(userId: string): Promise<IssuedAuthTokens> {
    await this.ensureLoaded();
    const now = Date.now();
    const accessToken = `tok_${userId}_${now}_${randomSuffix()}`;
    const refreshToken = `rt_${randomSuffix()}`;
    const record: AuthSessionRecord = {
      userId,
      accessToken,
      refreshToken,
      accessExpiresAt: now + ACCESS_TTL_MS,
      refreshExpiresAt: now + REFRESH_TTL_MS,
    };
    this.index(record);
    await this.persist();
    return {
      authToken: accessToken,
      refreshToken,
      accessExpiresAt: record.accessExpiresAt,
      refreshExpiresAt: record.refreshExpiresAt,
    };
  }

  async refreshTokenPair(refreshToken: string): Promise<
    | { ok: true; tokens: IssuedAuthTokens; userId: string }
    | { ok: false; code: AuthErrorCode; message: string }
  > {
    await this.ensureLoaded();
    const rt = refreshToken.trim();
    if (!rt) {
      return { ok: false, code: "REFRESH_INVALID", message: "Refresh token is required." };
    }
    const accessKey = this.byRefresh.get(rt);
    if (!accessKey) {
      return { ok: false, code: "REFRESH_INVALID", message: "Refresh token is not recognized." };
    }
    const existing = this.byAccess.get(accessKey);
    if (!existing || existing.refreshToken !== rt) {
      return { ok: false, code: "REFRESH_INVALID", message: "Refresh token is not recognized." };
    }
    const now = Date.now();
    if (existing.refreshExpiresAt > 0 && now >= existing.refreshExpiresAt) {
      this.revokeRecord(existing);
      await this.persist();
      return { ok: false, code: "REFRESH_EXPIRED", message: "Refresh session expired. Please log in again." };
    }
    this.revokeRecord(existing);
    const tokens = await this.issueTokenPair(existing.userId);
    return { ok: true, tokens, userId: existing.userId };
  }

  private revokeRecord(record: AuthSessionRecord): void {
    this.byAccess.delete(record.accessToken);
    this.byRefresh.delete(record.refreshToken);
  }

  /** @deprecated Legacy map compatibility — returns userId only. */
  getLegacyUserId(accessToken: string): string | undefined {
    return this.byAccess.get(accessToken)?.userId;
  }
}

export const authErrorBody = (code: AuthErrorCode, message: string) => ({
  error: { code, message, details: [] as string[] },
});

export const sendAuthError = (
  res: express.Response,
  status: number,
  code: AuthErrorCode,
  message: string,
): void => {
  res.status(status).json(authErrorBody(code, message));
};

export const resolveAuthUserId = async (
  req: express.Request,
  store: AuthTokenStore,
): Promise<string | undefined> => {
  const validation = await resolveAuthValidation(req, store);
  return validation.ok ? validation.userId : undefined;
};

export const resolveAuthValidation = async (
  req: express.Request,
  store: AuthTokenStore,
): Promise<AuthValidation> => {
  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, code: "TOKEN_MISSING", message: "Auth token is required." };
  }
  return store.validateAccessTokenWithReload(token);
};
