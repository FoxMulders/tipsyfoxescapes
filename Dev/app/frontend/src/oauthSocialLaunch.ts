/** Client-side social OAuth launch — session-persisted redirect with resilient timeout. */

export type SocialOAuthProvider = "google" | "facebook" | "github";

export const PRODUCTION_APP_ORIGIN = "https://www.tipsyfoxescapes.ca";
export const OAUTH_REDIRECT_TIMEOUT_MS = 20_000;

const OAUTH_PENDING_KEY = "escape-room-builder-oauth-pending-v1";

type PendingSocialOAuth = {
  provider: SocialOAuthProvider;
  startedAt: number;
};

/** Canonical return URL after OAuth; production always uses www.tipsyfoxescapes.ca. */
export const resolveOAuthReturnTo = (): string => {
  if (typeof window === "undefined") return `${PRODUCTION_APP_ORIGIN}/`;
  const { pathname, search, hash } = window.location;
  const path = `${pathname}${search}${hash}`;
  const host = window.location.hostname.toLowerCase();
  if (host === "tipsyfoxescapes.ca" || host === "www.tipsyfoxescapes.ca") {
    return `${PRODUCTION_APP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${window.location.origin}${path}`;
};

export const stashPendingSocialOAuth = (provider: SocialOAuthProvider): void => {
  try {
    const payload: PendingSocialOAuth = { provider, startedAt: Date.now() };
    sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(payload));
  } catch {
    /* sessionStorage unavailable */
  }
};

export const peekPendingSocialOAuth = (): PendingSocialOAuth | null => {
  try {
    const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSocialOAuth>;
    if (
      (parsed.provider !== "google" && parsed.provider !== "facebook" && parsed.provider !== "github") ||
      typeof parsed.startedAt !== "number"
    ) {
      return null;
    }
    return { provider: parsed.provider, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
};

export const clearPendingSocialOAuth = (): void => {
  try {
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
};

/** Restore in-flight redirect UI after refresh/back during provider handshake. */
export const restorePendingSocialOAuthProvider = (): SocialOAuthProvider | null => {
  const pending = peekPendingSocialOAuth();
  if (!pending) return null;
  if (Date.now() - pending.startedAt > OAUTH_REDIRECT_TIMEOUT_MS) {
    clearPendingSocialOAuth();
    return null;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("auth_token") || url.searchParams.get("oauth_error") || url.searchParams.get("oauth_code")) {
    clearPendingSocialOAuth();
    return null;
  }
  return pending.provider;
};

export type LaunchSocialOAuthOptions = {
  provider: SocialOAuthProvider;
  startUrl: string;
  onTimeout: () => void;
  onLaunchError: (message: string) => void;
};

/** Navigate to OAuth start; survives slow cold starts and clears false timeouts on page hide. */
export const launchSocialOAuthRedirect = (opts: LaunchSocialOAuthOptions): void => {
  const { provider, startUrl, onTimeout, onLaunchError } = opts;
  stashPendingSocialOAuth(provider);

  let safetyTimer: ReturnType<typeof window.setTimeout> | null = null;
  let released = false;

  const release = (timedOut: boolean): void => {
    if (released) return;
    released = true;
    if (safetyTimer !== null) window.clearTimeout(safetyTimer);
    window.removeEventListener("pagehide", onPageHide);
    if (timedOut) clearPendingSocialOAuth();
  };

  const onPageHide = (): void => {
    release(false);
  };

  window.addEventListener("pagehide", onPageHide, { once: true });

  safetyTimer = window.setTimeout(() => {
    release(true);
    onTimeout();
  }, OAUTH_REDIRECT_TIMEOUT_MS);

  try {
    window.location.assign(startUrl);
  } catch (err) {
    release(true);
    clearPendingSocialOAuth();
    onLaunchError(`Could not start ${provider} sign-in — please try again.`);
    // eslint-disable-next-line no-console
    console.error("[social-auth] launch failed:", provider, err);
  }
};
