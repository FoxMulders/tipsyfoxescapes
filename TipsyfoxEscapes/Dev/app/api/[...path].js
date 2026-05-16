import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
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
  if (!expressHandler) {
    const mod = require("./server.cjs");
    expressHandler = mod.default ?? mod;
  }
  return expressHandler(req, res);
}
