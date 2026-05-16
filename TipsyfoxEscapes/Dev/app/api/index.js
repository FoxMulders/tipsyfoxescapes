const { createRequire } = require("node:module");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const requireFromHere = createRequire(__filename);
const serverBundlePath = join(__dirname, "server.cjs");
let expressHandler;

/** Restore full /api/... path after rewrite to /api. */
const normalizeApiUrl = (req) => {
  const query = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  for (const raw of [
    req.headers["x-vercel-original-url"],
    req.headers["x-original-url"],
    req.headers["x-invoke-path"],
  ]) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const pathname = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0] || "";
      if (pathname.startsWith("/api")) {
        req.url = pathname + query;
        return;
      }
    } catch {
      /* next */
    }
  }
  if (!String(req.url ?? "").startsWith("/api")) {
    const pathOnly = String(req.url ?? "/").split("?")[0] || "/";
    req.url = `/api${pathOnly === "/" ? "" : pathOnly}` + query;
  }
};

module.exports = async function handler(req, res) {
  normalizeApiUrl(req);
  if (!existsSync(serverBundlePath)) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: {
          code: "SERVER_BUNDLE_MISSING",
          message:
            "api/server.cjs was not built. Check the Vercel build log for [bundle-server] and confirm Root Directory is TipsyfoxEscapes/Dev/app.",
        },
      }),
    );
    return;
  }
  try {
    if (!expressHandler) {
      const mod = requireFromHere(serverBundlePath);
      expressHandler = mod.default ?? mod;
    }
    return expressHandler(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "SERVER_LOAD_FAILED", message } }));
  }
};
