/**
 * Single serverless entry for all /api/* routes (see vercel.json rewrites).
 */
let expressHandler;

/** Restore full /api/... path after Vercel rewrite to /api. */
const normalizeApiUrl = (req) => {
  const query = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const headerCandidates = [
    req.headers["x-vercel-original-url"],
    req.headers["x-original-url"],
    req.headers["x-invoke-path"],
  ];
  for (const raw of headerCandidates) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const pathname = raw.startsWith("http")
        ? new URL(raw).pathname
        : raw.split("?")[0] || "";
      if (pathname.startsWith("/api")) {
        req.url = pathname + query;
        return;
      }
    } catch {
      /* try next header */
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
    const mod = await import("../backend/dist/serverless.js");
    expressHandler = mod.default;
  }
  return expressHandler(req, res);
}
