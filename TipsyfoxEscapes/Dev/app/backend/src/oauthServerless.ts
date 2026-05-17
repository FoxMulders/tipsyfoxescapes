import { promises as fs } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { FREE_TIER_ROOM_ALLOWANCE, isTrialTierUser } from "./billing/trial.js";
import { ensureDataDir, getDataDir } from "./dataDir.js";
import { handleGitHubWebhook } from "./githubWebhook.js";
import { buildOAuthCallbackUrl, resolveAuthCallbackBaseUrl } from "./oauthCallbackUrl.js";
import { exchangeOAuthCode } from "./oauthTokenExchange.js";
import { createOAuthState, verifyOAuthState } from "./oauthState.js";

export { handleGitHubWebhook };
import { readJsonBlob, writeJsonBlob } from "./kvJsonStore.js";
import { loadAuthTokens, persistAuthTokens } from "./runtimePersistence.js";

export type OAuthProvider = "google" | "facebook" | "github";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  provider: OAuthProvider | "local";
  password?: string;
  isAdmin: boolean;
  roomAllowance: number;
  exportCreditsRemaining: number;
  trialUsedAt?: string | null;
};

type PublicUser = {
  id: string;
  name: string;
  email: string;
  provider: StoredUser["provider"];
  isAdmin: boolean;
  roomAllowance: number;
  savedRoomCount: number;
  roomsRemaining: number;
  hasFullCatalog: boolean;
  billingTier: "admin" | "pack" | "trial" | "free";
  exportCreditsRemaining: number;
  trialUsed: boolean;
  trialRemaining: boolean;
  canSaveRooms: boolean;
  orgPoolBonusSlots: number;
};

const MAX_ROOM_ALLOWANCE = 100_000;
const usersPath = (): string => path.join(getDataDir(), "users.json");
const usersByEmail = new Map<string, StoredUser>();
const authTokens = new Map<string, string>();
let nextUserId = 1;
let storageReady: Promise<void> | null = null;

const parseAdminEmails = (): Set<string> => {
  const merged = new Set<string>();
  for (const entry of String(process.env.ADMIN_EMAILS ?? "").split(/[,;\s]+/)) {
    const e = entry.trim().toLowerCase();
    if (e) merged.add(e);
  }
  return merged;
};

const toPublicUser = (user: StoredUser): PublicUser => {
  const cap = user.isAdmin
    ? MAX_ROOM_ALLOWANCE
    : Math.max(FREE_TIER_ROOM_ALLOWANCE, Math.min(MAX_ROOM_ALLOWANCE, Math.floor(user.roomAllowance)));
  let billingTier: PublicUser["billingTier"] = "free";
  if (user.isAdmin) billingTier = "admin";
  else if (user.roomAllowance > FREE_TIER_ROOM_ALLOWANCE) billingTier = "pack";
  else if (isTrialTierUser(user) && !user.trialUsedAt) billingTier = "trial";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    isAdmin: user.isAdmin,
    roomAllowance: cap,
    savedRoomCount: 0,
    roomsRemaining: cap,
    hasFullCatalog: user.isAdmin || user.roomAllowance > FREE_TIER_ROOM_ALLOWANCE,
    billingTier,
    exportCreditsRemaining: user.isAdmin ? 1_000_000 : Math.max(0, Math.floor(user.exportCreditsRemaining)),
    orgPoolBonusSlots: 0,
    trialUsed: Boolean(user.trialUsedAt),
    trialRemaining: isTrialTierUser(user) && !user.trialUsedAt,
    canSaveRooms: user.isAdmin || cap > 0,
  };
};

const persistUsers = async (): Promise<void> => {
  const rows = Array.from(usersByEmail.values()).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    password: user.password,
    isAdmin: user.isAdmin,
    roomAllowance: user.roomAllowance,
    exportCreditsRemaining: user.exportCreditsRemaining,
    trialUsedAt: user.trialUsedAt ?? null,
  }));
  await writeJsonBlob("users.json", rows);
};

const loadUsers = async (): Promise<void> => {
  try {
    const rows =
      (await readJsonBlob<Array<Partial<StoredUser> & { id?: string; email?: string }>>("users.json")) ?? [];
    usersByEmail.clear();
    let maxNum = 0;
    for (const row of rows) {
      const email = String(row.email ?? "").trim().toLowerCase();
      if (!email || !row.id) continue;
      const idMatch = /^usr_(\d+)$/.exec(String(row.id));
      if (idMatch) maxNum = Math.max(maxNum, Number(idMatch[1]));
      const user: StoredUser = {
        id: String(row.id),
        name: String(row.name ?? "User").trim(),
        email,
        provider: (row.provider as StoredUser["provider"]) ?? "local",
        password: row.password,
        isAdmin: Boolean(row.isAdmin),
        roomAllowance: Math.min(
          MAX_ROOM_ALLOWANCE,
          Math.max(FREE_TIER_ROOM_ALLOWANCE, Math.floor(Number(row.roomAllowance) || FREE_TIER_ROOM_ALLOWANCE)),
        ),
        exportCreditsRemaining: Math.max(0, Math.floor(Number(row.exportCreditsRemaining) || 0)),
        trialUsedAt: row.trialUsedAt ?? null,
      };
      usersByEmail.set(email, user);
    }
    nextUserId = Math.max(nextUserId, maxNum + 1);
    const admins = parseAdminEmails();
    for (const user of usersByEmail.values()) {
      if (admins.has(user.email)) user.isAdmin = true;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
};

const ensureStorage = (): Promise<void> => {
  if (!storageReady) {
    storageReady = (async () => {
      await ensureDataDir();
      await Promise.all([loadUsers(), loadAuthTokens(authTokens)]);
    })();
  }
  return storageReady;
};

const safeOAuthReturnTo = (raw: string): URL => {
  const fallback = "http://localhost:5173/";
  const trimmed = String(raw ?? "").trim() || fallback;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return new URL(fallback);
    return u;
  } catch {
    return new URL(fallback);
  }
};

const redirect = (res: ServerResponse, location: string, statusCode = 302): void => {
  res.statusCode = statusCode;
  res.setHeader("Location", location);
  res.end();
};

const redirectOAuthStartFailure = (
  res: ServerResponse,
  returnToRaw: string,
  code: string,
  message: string,
): void => {
  const u = safeOAuthReturnTo(returnToRaw);
  u.searchParams.set("oauth_error", code);
  u.searchParams.set("oauth_message", message);
  redirect(res, u.toString());
};

const buildAuthSuccessRedirect = (returnTo: string, authToken: string, user: StoredUser): string => {
  const url = safeOAuthReturnTo(returnTo);
  url.searchParams.set("auth_token", authToken);
  url.searchParams.set("auth_user", encodeURIComponent(JSON.stringify(toPublicUser(user))));
  return url.toString();
};

const upsertSocialUser = (provider: OAuthProvider, email: string, name: string): StoredUser => {
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmails = parseAdminEmails();
  let user = usersByEmail.get(normalizedEmail);
  if (!user) {
    user = {
      id: `usr_${nextUserId++}`,
      name: name.trim(),
      email: normalizedEmail,
      provider,
      isAdmin: adminEmails.has(normalizedEmail),
      roomAllowance: FREE_TIER_ROOM_ALLOWANCE,
      exportCreditsRemaining: 0,
    };
    usersByEmail.set(normalizedEmail, user);
    void persistUsers();
  } else if (adminEmails.has(normalizedEmail)) {
    user.isAdmin = true;
    void persistUsers();
  }
  return user;
};

const createAuthTokenForUser = async (user: StoredUser): Promise<string> => {
  const authToken = `tok_${user.id}_${Date.now()}`;
  authTokens.set(authToken, user.id);
  await persistAuthTokens(authTokens);
  return authToken;
};

type OAuthRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
};

/** Merge Vercel `req.query` with the URL query string (some handlers only populate one). */
const readQuery = (req: OAuthRequest): URLSearchParams => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const params = url.searchParams;
  const q = req.query;
  if (q && typeof q === "object") {
    for (const [key, value] of Object.entries(q)) {
      if (value === undefined || params.has(key)) continue;
      const scalar = Array.isArray(value) ? value[0] : value;
      if (scalar !== undefined && scalar !== null) params.set(key, String(scalar));
    }
  }
  return params;
};

export const resolveOAuthProvider = (req: OAuthRequest, providerRaw: string): string => {
  const fromArg = String(providerRaw ?? "").trim().toLowerCase();
  if (fromArg) return fromArg;
  const fromQuery = String(req.query?.provider ?? "").trim().toLowerCase();
  if (fromQuery) return fromQuery;
  const path = String(req.url ?? "").split("?")[0] || "";
  const match = path.match(/\/oauth\/(google|facebook|github)\//i);
  return match?.[1]?.toLowerCase() ?? "";
};

const providerEnabled = (provider: OAuthProvider): boolean => {
  if (provider === "google") {
    return String(process.env.OAUTH_GOOGLE_ENABLED ?? "1").trim() !== "0";
  }
  return true;
};

const isAllowedProvider = (raw: string): raw is OAuthProvider =>
  raw === "google" || raw === "facebook" || raw === "github";

/** Meta webhook subscription verification (Facebook Developer → Webhooks). */
export const handleFacebookWebhookVerify = (req: IncomingMessage, res: ServerResponse): void => {
  const query = readQuery(req);
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");
  const expected = String(process.env.FACEBOOK_VERIFY_TOKEN ?? "").trim();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(challenge);
    return;
  }
  res.statusCode = 403;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Forbidden");
};

export const handleOAuthStart = async (
  req: IncomingMessage,
  res: ServerResponse,
  providerRaw: string,
): Promise<void> => {
  const returnTo = readQuery(req).get("returnTo")?.trim() || "http://localhost:5173/";
  try {
    const provider = String(providerRaw ?? "").toLowerCase();
    if (!isAllowedProvider(provider)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "provider must be google, facebook, or github.", details: [] },
        }),
      );
      return;
    }
    if (!providerEnabled(provider)) {
      redirectOAuthStartFailure(res, returnTo, "provider_disabled", `${provider} sign-in is temporarily unavailable.`);
      return;
    }

    const callbackBaseUrl = resolveAuthCallbackBaseUrl(undefined, req.headers as Record<string, string | string[] | undefined>);
    const clientId = String(process.env[`${provider.toUpperCase()}_CLIENT_ID`] ?? "").trim();
    const clientSecret = String(process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] ?? "").trim();
    if (!callbackBaseUrl || !clientId || !clientSecret) {
      const exampleCallback = buildOAuthCallbackUrl(provider, callbackBaseUrl || "http://localhost:5173");
      redirectOAuthStartFailure(
        res,
        returnTo,
        "not_configured",
        `Social sign-in is not configured. Set AUTH_CALLBACK_BASE_URL, ${provider.toUpperCase()}_CLIENT_ID, and ${provider.toUpperCase()}_CLIENT_SECRET. Register redirect URI: ${exampleCallback}`,
      );
      return;
    }

    const callbackUri = buildOAuthCallbackUrl(provider);
    const state = createOAuthState(provider, returnTo);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUri,
      state,
    });

    if (provider === "google") {
      params.set("response_type", "code");
      params.set("scope", "openid email profile");
      params.set("access_type", "offline");
      params.set("prompt", "select_account");
      redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
      return;
    }
    if (provider === "facebook") {
      params.set("response_type", "code");
      params.set("scope", "email,public_profile");
      redirect(res, `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
      return;
    }
    params.set("response_type", "code");
    params.set("scope", "read:user user:email");
    redirect(res, `https://github.com/login/oauth/authorize?${params.toString()}`);
  } catch (err) {
    redirectOAuthStartFailure(
      res,
      returnTo,
      "start_failed",
      `OAuth start failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

export const handleOAuthCallback = async (
  req: IncomingMessage,
  res: ServerResponse,
  providerRaw: string,
): Promise<void> => {
  const provider = resolveOAuthProvider(req, providerRaw);
  const query = readQuery(req);
  const code = String(query.get("code") ?? "");
  const state = String(query.get("state") ?? "");
  const oauthError = String(query.get("error") ?? "").trim();
  const oauthErrorDescription = String(query.get("error_description") ?? "").trim();

  if (!isAllowedProvider(provider)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Unknown OAuth provider.", details: [] } }));
    return;
  }
  if (!providerEnabled(provider)) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "PROVIDER_DISABLED", message: `${provider} sign-in is disabled.`, details: [] } }));
    return;
  }

  const stateData = verifyOAuthState(state, provider);
  if (!stateData) {
    const fallbackReturn = `${resolveAuthCallbackBaseUrl() || "http://localhost:5173"}/`;
    const message = state
      ? "Invalid or expired OAuth callback state. Start sign-in again from the app."
      : "Missing OAuth state. Start sign-in again from the app.";
    redirectOAuthStartFailure(res, fallbackReturn, "invalid_state", message);
    return;
  }
  if (!code) {
    const message =
      oauthErrorDescription ||
      (oauthError === "redirect_uri_mismatch"
        ? `GitHub redirect URI must exactly match ${buildOAuthCallbackUrl("github")}`
        : oauthError
          ? `${provider} sign-in failed (${oauthError}).`
          : "Authorization was not completed. Try signing in again.");
    redirectOAuthStartFailure(res, stateData.returnTo, oauthError || "access_denied", message);
    return;
  }

  try {
    await ensureStorage();
    const clientId = String(process.env[`${provider.toUpperCase()}_CLIENT_ID`] ?? "").trim();
    const clientSecret = String(process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] ?? "").trim();
    const callbackUri = buildOAuthCallbackUrl(
      provider,
      resolveAuthCallbackBaseUrl(undefined, req.headers as Record<string, string | string[] | undefined>),
    );
    const { email, name } = await exchangeOAuthCode(provider, code, clientId, clientSecret, callbackUri);
    if (!email) throw new Error(`${provider} account did not provide a usable email.`);
    const user = upsertSocialUser(provider, email, name);
    const authToken = await createAuthTokenForUser(user);
    redirect(res, buildAuthSuccessRedirect(stateData.returnTo, authToken, user));
  } catch (error) {
    const detail = String(error instanceof Error ? error.message : error);
    // eslint-disable-next-line no-console
    console.error(`[oauth] ${provider} callback failed:`, detail);
    redirectOAuthStartFailure(
      res,
      stateData.returnTo,
      "verification_failed",
      `OAuth verification failed for ${provider}. ${detail}`,
    );
  }
};
