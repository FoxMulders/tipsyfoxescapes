/** Shared helpers for stale planning session recovery (serverless restart, TTL, etc.). */

export type ApiErrorPayload = { error?: { code?: string; message?: string } };

export const isInvalidPlanningSessionError = (data: ApiErrorPayload | undefined): boolean =>
  data?.error?.code === "INVALID_SESSION";

export const isInvalidPlanningSessionResponse = (response: Response, data: ApiErrorPayload): boolean =>
  (response.status === 404 || response.status === 400) && isInvalidPlanningSessionError(data);

export const planningSessionRecoveryNotice =
  "Your planning session expired. We started a fresh one—your login is still active.";

export type PlanningSessionHealth = {
  ok: boolean;
  sessionId: string;
  leaseExpiresAt: number;
};

export type ConnectivityStatus = "connected" | "degraded" | "offline";

export const fetchPlanningSessionHealth = async (
  sessionId: string,
  headers: HeadersInit,
  apiBase = "",
): Promise<PlanningSessionHealth | null> => {
  try {
    const res = await fetch(`${apiBase}/api/planning/session/${sessionId}/health`, { headers });
    const data = (await res.json()) as PlanningSessionHealth & ApiErrorPayload;
    if (!res.ok || !data.ok) return null;
    return data;
  } catch {
    return null;
  }
};

export const renewPlanningSessionLease = async (
  sessionId: string,
  headers: HeadersInit,
  apiBase = "",
): Promise<{ ok: boolean; leaseExpiresAt?: number }> => {
  try {
    const res = await fetch(`${apiBase}/api/planning/session/${sessionId}/lease`, {
      method: "POST",
      headers,
    });
    const data = (await res.json()) as { ok?: boolean; leaseExpiresAt?: number };
    return { ok: res.ok && Boolean(data.ok), leaseExpiresAt: data.leaseExpiresAt };
  } catch {
    return { ok: false };
  }
};

/** Green = healthy lease + live stream; amber = reconnecting or lease renew pending; red = session/live down. */
export const deriveConnectivityStatus = (input: {
  planningOk: boolean;
  streamConnected: boolean;
  streamError: boolean;
}): ConnectivityStatus => {
  if (!input.planningOk) return "offline";
  if (!input.streamConnected || input.streamError) return "degraded";
  return "connected";
};
