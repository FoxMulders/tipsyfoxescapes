import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const apiDir = dirname(fileURLToPath(import.meta.url));
const serverBundlePath = join(apiDir, "server.cjs");
let expressHandler;

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

export default async function handler(req, res) {
  normalizeApiUrl(req);
  if (!existsSync(serverBundlePath)) {
    res.status(503).json({
      error: {
        code: "SERVER_BUNDLE_MISSING",
        message:
          "api/server.cjs was not built. Check the Vercel build log for [bundle-server] and confirm Root Directory is TipsyfoxEscapes/Dev/app.",
      },
    });
    return;
  }
  try {
    if (!expressHandler) {
      const mod = require(serverBundlePath);
      expressHandler = mod.default ?? mod;
    }
    return expressHandler(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: { code: "SERVER_LOAD_FAILED", message },
    });
  }
}
