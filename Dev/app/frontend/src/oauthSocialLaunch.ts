/** Client-side social OAuth launch — session-persisted redirect with resilient timeout. */

export type SocialOAuthProvider = "google" | "facebook" | "github";

export const PRODUCTION_APP_ORIGIN = "https://www.tipsyfoxescapes.ca";
/** Stale pending UI recovery — not a hard redirect deadline (serverless cold starts can exceed 20s). */
export const OAUTH_REDIRECT_TIMEOUT_MS = 120_000;
/** If assign() did not leave the builder shell, surface an error quickly. */
const OAUTH_LAUNCH_STUCK_MS = 12_000;

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
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "back_forward") {
      clearPendingSocialOAuth();
      return null;
    }
  } catch {
    /* ignore */
  }
  return pending.provider;
};

const OAUTH_RETURN_GRACE_MS = 2_000;

/** Clear stale pending OAuth when user returns via Back/visibility without completing sign-in. */
export const subscribeOAuthPendingRecovery = (onCancelled: () => void): (() => void) => {
  const handlePossibleCancel = (): void => {
    const pending = peekPendingSocialOAuth();
    if (!pending) return;
    if (Date.now() - pending.startedAt < OAUTH_RETURN_GRACE_MS) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("oauth_code") || url.searchParams.get("oauth_error")) return;
    clearPendingSocialOAuth();
    onCancelled();
  };

  const onPageShow = (): void => {
    window.setTimeout(handlePossibleCancel, 50);
  };

  const onVisibility = (): void => {
    if (document.visibilityState === "visible") {
      window.setTimeout(handlePossibleCancel, 50);
    }
  };

  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisibility);
  };
};

export type LaunchSocialOAuthOptions = {
  provider: SocialOAuthProvider;
  startUrl: string;
  onTimeout: () => void;
  onLaunchError: (message: string) => void;
};

const isBuilderShellUrl = (href: string): boolean => {
  try {
    const path = new URL(href).pathname;
    return path === "/" || path === "/index.html";
  } catch {
    return true;
  }
};

/** Navigate to OAuth start; do not treat slow serverless cold starts as client timeouts. */
export const launchSocialOAuthRedirect = (opts: LaunchSocialOAuthOptions): void => {
  const { provider, startUrl, onTimeout, onLaunchError } = opts;
  stashPendingSocialOAuth(provider);

  const launchHref = window.location.href;
  let released = false;
  let stuckTimer: ReturnType<typeof window.setTimeout> | null = null;

  const release = (): void => {
    if (released) return;
    released = true;
    if (stuckTimer !== null) window.clearTimeout(stuckTimer);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("visibilitychange", onVisibilityHidden);
  };

  const onPageHide = (): void => {
    release();
  };

  const onVisibilityHidden = (): void => {
    if (document.visibilityState === "hidden") release();
  };

  window.addEventListener("pagehide", onPageHide, { once: true });
  window.addEventListener("visibilitychange", onVisibilityHidden);

  try {
    window.location.assign(startUrl);
  } catch (err) {
    release();
    clearPendingSocialOAuth();
    onLaunchError(`Could not start ${provider} sign-in — please try again.`);
    // eslint-disable-next-line no-console
    console.error("[social-auth] launch failed:", provider, err);
    return;
  }

  stuckTimer = window.setTimeout(() => {
    if (released) return;
    const stillOnBuilder =
      document.visibilityState === "visible" &&
      window.location.href === launchHref &&
      isBuilderShellUrl(window.location.href);
    release();
    if (stillOnBuilder) {
      clearPendingSocialOAuth();
      onTimeout();
    }
  }, OAUTH_LAUNCH_STUCK_MS);
};
