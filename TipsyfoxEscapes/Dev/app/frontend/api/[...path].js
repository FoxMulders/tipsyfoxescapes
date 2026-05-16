/**
 * Proxies /api/* from the Vercel deployment to the Express backend.
 * Set BACKEND_URL in Vercel → Project → Settings → Environment Variables
 * (e.g. https://api.yourdomain.com — no trailing slash).
 */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export const config = {
  api: { bodyParser: false },
};

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

/** @param {import("@vercel/node").VercelRequest} req */
/** @param {import("@vercel/node").VercelResponse} res */
export default async function handler(req, res) {
  const backendBase = String(process.env.BACKEND_URL ?? "").trim().replace(/\/$/, "");
  if (!backendBase) {
    res.status(503).json({
      error: {
        code: "BACKEND_NOT_CONFIGURED",
        message:
          "Set BACKEND_URL in Vercel project environment variables to your live Express API origin.",
      },
    });
    return;
  }

  // Vercel catch-all: path segments are in req.query.path, not always in req.url.
  const pathParam = req.query.path;
  const segments = Array.isArray(pathParam) ? pathParam.join("/") : String(pathParam ?? "").trim();
  const queryStart = typeof req.url === "string" ? req.url.indexOf("?") : -1;
  const queryString = queryStart >= 0 ? req.url.slice(queryStart) : "";
  const incomingPath = segments ? `/api/${segments}${queryString}` : `/api${queryString}`;
  const targetUrl = `${backendBase}${incomingPath}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (lower === "host" || HOP_BY_HOP.has(lower)) continue;
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
  }

  const method = req.method ?? "GET";
  /** @type {RequestInit} */
  const init = { method, headers, redirect: "manual" };
  if (method !== "GET" && method !== "HEAD") {
    const body = await readRawBody(req);
    if (body.length > 0) init.body = body;
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      error: { code: "BACKEND_UNREACHABLE", message: `Could not reach backend: ${message}` },
    });
    return;
  }

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}
