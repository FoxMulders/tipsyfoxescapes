import crypto, { timingSafeEqual } from "crypto";
import { normalizeOAuthReturnTo } from "./oauthCallbackUrl.js";

type OAuthProvider = "google" | "facebook" | "github";

type OAuthStatePayload = {
  provider: OAuthProvider;
  returnTo: string;
  exp: number;
  nonce: string;
};

const oauthStateSecret = (): string => {
  const secret = String(process.env.OAUTH_STATE_SECRET ?? process.env.USAGE_HASH_SALT ?? "").trim();
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET (or USAGE_HASH_SALT) must be set for OAuth.");
  }
  return secret;
};

const sign = (body: string): string =>
  crypto.createHmac("sha256", oauthStateSecret()).update(body).digest("base64url");

export const createOAuthState = (provider: OAuthProvider, returnTo: string): string => {
  const payload: OAuthStatePayload = {
    provider,
    returnTo: normalizeOAuthReturnTo(returnTo),
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
};

export const verifyOAuthState = (
  state: string,
  expectedProvider: OAuthProvider,
): { returnTo: string } | null => {
  const trimmed = String(state ?? "").trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (payload.provider !== expectedProvider) return null;
    if (typeof payload.returnTo !== "string" || !payload.returnTo.trim()) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { returnTo: payload.returnTo };
  } catch {
    return null;
  }
};
