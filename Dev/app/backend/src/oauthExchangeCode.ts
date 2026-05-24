import crypto from "crypto";
import { readJsonBlob, writeJsonBlob } from "./kvJsonStore.js";
import { safeOAuthReturnToUrl } from "./oauthCallbackUrl.js";

const EXCHANGE_BLOB = "oauth-exchanges.json";
const EXCHANGE_TTL_MS = 120_000;

export type AuthExchangePayload = {
  authToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt?: number;
  user: Record<string, unknown>;
};

type StoredExchange = AuthExchangePayload & { exp: number };

const pruneExpired = (store: Record<string, StoredExchange>, now: number): void => {
  for (const [key, entry] of Object.entries(store)) {
    if (!entry || entry.exp < now) delete store[key];
  }
};

/** One-time code for post-OAuth / email-verify handoff — tokens never appear in browser URL. */
export const createAuthExchangeCode = async (payload: AuthExchangePayload): Promise<string> => {
  const code = crypto.randomBytes(24).toString("base64url");
  const now = Date.now();
  const store = (await readJsonBlob<Record<string, StoredExchange>>(EXCHANGE_BLOB)) ?? {};
  pruneExpired(store, now);
  store[code] = { ...payload, exp: now + EXCHANGE_TTL_MS };
  await writeJsonBlob(EXCHANGE_BLOB, store);
  return code;
};

export const consumeAuthExchangeCode = async (code: string): Promise<AuthExchangePayload | null> => {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return null;
  const store = (await readJsonBlob<Record<string, StoredExchange>>(EXCHANGE_BLOB)) ?? {};
  const entry = store[trimmed];
  const now = Date.now();
  pruneExpired(store, now);
  if (!entry || entry.exp < now) {
    delete store[trimmed];
    await writeJsonBlob(EXCHANGE_BLOB, store);
    return null;
  }
  delete store[trimmed];
  await writeJsonBlob(EXCHANGE_BLOB, store);
  const { exp: _exp, ...payload } = entry;
  return payload;
};

export const buildOAuthSuccessRedirectUrl = (returnTo: string, exchangeCode: string): string => {
  const url = safeOAuthReturnToUrl(returnTo);
  url.searchParams.set("oauth_code", exchangeCode);
  return url.toString();
};
