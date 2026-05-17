export type OAuthProvider = "google" | "facebook" | "github";

const OAUTH_CALLBACK_PATH_RE = /\/api\/auth\/oauth\/(?:google|facebook|github)\/callback$/i;

/** Origin-only base from AUTH_CALLBACK_BASE_URL (strips accidental full callback paths). */
export const resolveAuthCallbackBaseUrl = (raw?: string): string => {
  let base = String(raw ?? process.env.AUTH_CALLBACK_BASE_URL ?? "").trim();
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
