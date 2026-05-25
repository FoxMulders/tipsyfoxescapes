import type { ServiceHealth } from "./serviceHealth.ts";

export type OAuthExchangeResult = {
  authToken: string;
  refreshToken?: string;
  accessExpiresAt?: number;
  refreshExpiresAt?: number;
  user?: Record<string, unknown>;
};

type ExchangeErrorBody = {
  error?: { code?: string; message?: string };
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const exchangeOnce = async (
  apiBase: string,
  code: string,
  deviceId: string,
): Promise<{ ok: true; data: OAuthExchangeResult } | { ok: false; status: number; code?: string; message: string }> => {
  const response = await fetch(`${apiBase}/api/auth/oauth/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
    body: JSON.stringify({ code }),
  });
  const data = (await response.json()) as OAuthExchangeResult & ExchangeErrorBody;
  if (!response.ok || !data.authToken) {
    return {
      ok: false,
      status: response.status,
      code: data.error?.code,
      message: data.error?.message ?? "Sign-in exchange failed. Please try again.",
    };
  }
  return { ok: true, data };
};

/** Redeem OAuth exchange code; retry once on ephemeral cross-instance miss. */
export const completeOAuthExchange = async (
  apiBase: string,
  code: string,
  deviceId: string,
  health?: ServiceHealth | null,
): Promise<OAuthExchangeResult> => {
  const first = await exchangeOnce(apiBase, code, deviceId);
  if (first.ok) return first.data;

  const shouldRetry =
    first.code === "EXCHANGE_INVALID" &&
    (health?.authStore === "ephemeral" || health == null) &&
    first.status === 401;

  if (shouldRetry) {
    await sleep(900);
    const second = await exchangeOnce(apiBase, code, deviceId);
    if (second.ok) return second.data;
    throw new Error(second.message);
  }

  throw new Error(first.message);
};
