/** Lightweight OAuth-only entry — avoids loading api/server.cjs on social sign-in cold starts. */
const { createRequire } = require("node:module");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const requireFromHere = createRequire(__filename);
const oauthBundlePath = join(__dirname, "oauth.cjs");
let oauthHandler;

const loadOAuthHandler = () => {
  if (!oauthHandler) {
    if (!existsSync(oauthBundlePath)) throw new Error("api/oauth.cjs was not built.");
    oauthHandler = requireFromHere(oauthBundlePath);
  }
  return oauthHandler;
};

const pathnameFromReq = (req) => {
  for (const raw of [
    req.headers["x-vercel-original-url"],
    req.headers["x-original-url"],
    req.headers["x-invoke-path"],
  ]) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const pathname = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0] || "";
      if (pathname.startsWith("/api/")) return pathname;
    } catch {
      /* next */
    }
  }
  const raw = String(req.url ?? "/").split("?")[0] || "/";
  try {
    return new URL(raw, "http://localhost").pathname;
  } catch {
    return raw;
  }
};

const resolveRoute = (req) => {
  const kind = String(req.query?.kind ?? "").trim().toLowerCase();
  const provider = String(req.query?.provider ?? "").trim().toLowerCase();
  if (kind === "complete") return { kind: "complete" };
  if (kind === "start" && provider) return { kind: "start", provider };
  if (kind === "callback" && provider) return { kind: "callback", provider };

  const pathname = pathnameFromReq(req);
  if (pathname === "/api/auth/oauth/complete" || pathname === "/api/auth/oauth/complete/") {
    return { kind: "complete" };
  }
  const start = pathname.match(/^\/api\/auth\/oauth\/(google|facebook|github)\/start\/?$/i);
  if (start) return { kind: "start", provider: start[1].toLowerCase() };
  const callback = pathname.match(/^\/api\/auth\/oauth\/(google|facebook|github)\/callback\/?$/i);
  if (callback) return { kind: "callback", provider: callback[1].toLowerCase() };
  return null;
};

module.exports = async function handler(req, res) {
  const route = resolveRoute(req);
  if (!route) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Unknown OAuth route.", details: [] } }));
    return;
  }
  try {
    const oauth = loadOAuthHandler();
    if (route.kind === "complete") return oauth.handleOAuthComplete(req, res);
    if (route.kind === "start") return oauth.handleOAuthStart(req, res, route.provider);
    return oauth.handleOAuthCallback(req, res, route.provider);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = message.includes("not built") ? 503 : 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "OAUTH_HANDLER_FAILED", message } }));
  }
};
