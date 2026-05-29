/** Confirms Vercel routes /api/* to serverless functions. */
export default function handler(_req, res) {
  const kvUrl = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const kvToken = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  const onVercel = Boolean(process.env.VERCEL);
  const warnings = [];
  if (onVercel) {
    if (!String(process.env.OPENAI_API_KEY ?? "").trim().startsWith("sk-")) {
      warnings.push(
        "OPENAI_API_KEY is not set — AI themes, Master Generator, and Council of Ten are disabled; the app serves static catalog fallbacks only.",
      );
    }
    if (!kvUrl || !kvToken) {
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
  }
  const body = JSON.stringify({
    ok: warnings.length === 0 || !onVercel,
    service: "escape-room-builder",
    authStore: onVercel ? (kvUrl && kvToken ? "kv" : "ephemeral") : "local",
    warnings,
    ts: new Date().toISOString(),
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}
