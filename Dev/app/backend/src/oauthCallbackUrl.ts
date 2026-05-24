export type OAuthProvider = "google" | "facebook" | "github";

export const PRODUCTION_APP_ORIGIN = "https://www.tipsyfoxescapes.ca";

const OAUTH_CALLBACK_PATH_RE = /\/api\/auth\/oauth\/(?:google|facebook|github)\/callback$/i;

const LOCAL_DEV_FALLBACK = "http://localhost:5173/";

/** Canonical post-login return URL; locks production hosts to www.tipsyfoxescapes.ca. */
export const normalizeOAuthReturnTo = (raw: string): string => {
  const trimmed = String(raw ?? "").trim() || LOCAL_DEV_FALLBACK;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return LOCAL_DEV_FALLBACK;
    const host = u.hostname.toLowerCase();
    if (host === "tipsyfoxescapes.ca" || host === "www.tipsyfoxescapes.ca") {
      return `${PRODUCTION_APP_ORIGIN}${u.pathname}${u.search}${u.hash}`;
    }
    return u.toString();
  } catch {
    return LOCAL_DEV_FALLBACK;
  }
};

export const safeOAuthReturnToUrl = (raw: string): URL => new URL(normalizeOAuthReturnTo(raw));

type HeaderBag = Record<string, string | string[] | undefined>;

const firstHeader = (headers: HeaderBag | undefined, name: string): string => {
  const raw = headers?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value ?? "").split(",")[0]?.trim() ?? "";
};

/** Origin-only base from AUTH_CALLBACK_BASE_URL (strips accidental full callback paths). */
export const resolveAuthCallbackBaseUrl = (raw?: string, headers?: HeaderBag): string => {
  let base = String(raw ?? process.env.AUTH_CALLBACK_BASE_URL ?? "").trim();
  if (!base && headers) {
    const host = firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host");
    if (host) {
      const proto = firstHeader(headers, "x-forwarded-proto") || "https";
      base = `${proto}://${host}`;
    }
  }
  if (!base) return "";
  base = base.replace(/\/+$/, "");
  while (OAUTH_CALLBACK_PATH_RE.test(base)) {
    base = base.replace(OAUTH_CALLBACK_PATH_RE, "").replace(/\/+$/, "");
  }
  return base;
};

/** Full redirect URI registered with the OAuth provider. */
export const buildOAuthCallbackUrl = (provider: OAuthProvider, raw?: string): string => {
  const origin = resolveAuthCallbackBaseUrl(raw);
  if (!origin) return "";
  return `${origin}/api/auth/oauth/${provider}/callback`;
};
