/** Shared helpers for stale planning session recovery (serverless restart, TTL, etc.). */

export type ApiErrorPayload = { error?: { code?: string; message?: string } };

export const isInvalidPlanningSessionError = (data: ApiErrorPayload | undefined): boolean =>
  data?.error?.code === "INVALID_SESSION";

export const isInvalidPlanningSessionResponse = (response: Response, data: ApiErrorPayload): boolean =>
  (response.status === 404 || response.status === 400) && isInvalidPlanningSessionError(data);

export const planningSessionRecoveryNotice =
  "Your planning session expired. We started a fresh one—your login is still active.";
