import { isKvConfigured } from "./kvJsonStore.js";

/** Ops-facing warnings when production persistence or auth env is misconfigured. */
export const productionPersistenceWarnings = (): string[] => {
  if (!process.env.VERCEL) return [];
  const warnings: string[] = [];
  if (!isKvConfigured()) {
    warnings.push(
      "KV_REST_API_URL and KV_REST_API_TOKEN are not set — users, auth tokens, and OAuth exchange codes will not persist across serverless instances. Link Upstash Redis (Vercel KV) to this project.",
    );
  }
  if (!String(process.env.OAUTH_STATE_SECRET ?? process.env.USAGE_HASH_SALT ?? "").trim()) {
    warnings.push("OAUTH_STATE_SECRET is not set — social login will fail.");
  }
  if (!String(process.env.AUTH_CALLBACK_BASE_URL ?? "").trim()) {
    warnings.push("AUTH_CALLBACK_BASE_URL is not set — OAuth redirect URIs may not match provider console settings.");
  }
  return warnings;
};

export const resolveAuthStoreMode = (): "kv" | "ephemeral" | "local" => {
  if (!process.env.VERCEL) return "local";
  return isKvConfigured() ? "kv" : "ephemeral";
};
