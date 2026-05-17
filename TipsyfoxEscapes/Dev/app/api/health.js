/** Confirms Vercel routes /api/* to serverless functions. */
export default function handler(_req, res) {
  const kvUrl = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const kvToken = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  const body = JSON.stringify({
    ok: true,
    service: "escape-room-builder",
    authStore: process.env.VERCEL ? (kvUrl && kvToken ? "kv" : "ephemeral") : "local",
    ts: new Date().toISOString(),
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}
