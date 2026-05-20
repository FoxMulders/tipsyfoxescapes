import type express from "express";
import {
  authErrorBody,
  type AuthErrorCode,
  type AuthTokenStore,
  type AuthValidation,
  resolveAuthValidation,
  sendAuthError,
} from "./authSession.js";

export type { AuthErrorCode, AuthValidation };

export const respondAuthValidation = (
  res: express.Response,
  validation: Extract<AuthValidation, { ok: false }>,
): void => {
  const status =
    validation.code === "TOKEN_EXPIRED" || validation.code === "REFRESH_EXPIRED" ? 401 : 401;
  sendAuthError(res, status, validation.code, validation.message);
};

/** Resolve bearer auth; writes structured 401 when missing/invalid/expired. */
export const requireAuthUserId = async (
  req: express.Request,
  res: express.Response,
  store: AuthTokenStore,
): Promise<string | undefined> => {
  const validation = await resolveAuthValidation(req, store);
  if (!validation.ok) {
    respondAuthValidation(res, validation);
    return undefined;
  }
  return validation.userId;
};

export const isAuthErrorPayload = (
  payload: unknown,
): payload is { error?: { code?: string; message?: string } } =>
  Boolean(payload && typeof payload === "object" && "error" in payload);

export const parseAuthErrorCode = (payload: unknown): AuthErrorCode | undefined => {
  if (!isAuthErrorPayload(payload)) return undefined;
  const code = payload.error?.code;
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

export { authErrorBody, sendAuthError };
