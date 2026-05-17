/** True when running the Vite dev server (local). */
export const isLocalDev = (): boolean => import.meta.env.DEV;

export const backendUnreachableMessage = (): string =>
  isLocalDev()
    ? "Cannot reach the backend API. Start it in Dev/app/backend with npm run dev (Vite proxies /api to port 3001)."
    : "Cannot reach the server API. Refresh the page. If this continues, the API may be temporarily unavailable—try again in a few minutes.";

export const unexpectedApiResponseMessage = (status?: number): string => {
  const statusBit = status && status > 0 ? ` (HTTP ${status})` : "";
  return isLocalDev()
    ? `The API returned a non-JSON response${statusBit}. Check backend logs and Vercel function build output.`
    : `The server returned an unexpected response${statusBit}. Refresh and try again; contact support if it persists.`;
};

/** Classify errors from fetch + response.json() in one try block. */
export const classifyApiCatchError = (err: unknown, response?: Response): string => {
  if (err instanceof SyntaxError) {
    return unexpectedApiResponseMessage(response?.status);
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/unexpected token|json|non-json/i.test(msg)) {
    return unexpectedApiResponseMessage(response?.status);
  }
  return backendUnreachableMessage();
};
