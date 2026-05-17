const { createRequire } = require("node:module");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const requireFromHere = createRequire(__filename);
const serverBundlePath = join(__dirname, "server.cjs");
const oauthBundlePath = join(__dirname, "oauth.cjs");
let expressHandler;
let oauthHandler;
const serverLoadPromise = existsSync(serverBundlePath)
  ? Promise.resolve().then(() => {
      const mod = requireFromHere(serverBundlePath);
      expressHandler = mod.default ?? mod;
    })
  : null;

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
  const pathQuery = req.query?.path;
  if (typeof pathQuery === "string" && pathQuery.trim()) {
    const segment = pathQuery.replace(/^\//, "");
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    params.delete("path");
    const rest = params.toString();
    req.url = `/api/${segment}${rest ? `?${rest}` : ""}`;
  }
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
  const pathQuery = req.query?.path;
  if (typeof pathQuery === "string" && pathQuery.trim()) {
    const segment = pathQuery.replace(/^\//, "");
    return `/api/${segment}`;
  }
  const raw = String(req.url ?? "/").split("?")[0] || "/";
  try {
    return new URL(raw, "http://localhost").pathname;
  } catch {
    return raw;
  }
};

const loadOAuthHandler = () => {
  if (!oauthHandler) {
    if (!existsSync(oauthBundlePath)) throw new Error("api/oauth.cjs was not built.");
    oauthHandler = requireFromHere(oauthBundlePath);
  }
  return oauthHandler;
};

const matchOAuthRoute = (pathname) => {
  const start = pathname.match(/^\/api\/auth\/oauth\/(google|facebook|github)\/start\/?$/i);
  if (start) return { kind: "start", provider: start[1].toLowerCase() };
  const callback = pathname.match(/^\/api\/auth\/oauth\/(google|facebook|github)\/callback\/?$/i);
  if (callback) return { kind: "callback", provider: callback[1].toLowerCase() };
  return null;
};

module.exports = async function handler(req, res) {
  normalizeApiUrl(req);
  const pathname = pathnameFromReq(req);
  if (pathname === "/api/webhooks/facebook" || pathname === "/api/webhooks/facebook/") {
    try {
      const oauth = loadOAuthHandler();
      return oauth.handleFacebookWebhookVerify(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.statusCode = message.includes("not built") ? 503 : 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: { code: "OAUTH_HANDLER_FAILED", message } }));
      return;
    }
  }
  const oauthRoute = matchOAuthRoute(pathname);
  if (oauthRoute) {
    try {
      const oauth = loadOAuthHandler();
      if (oauthRoute.kind === "start") return oauth.handleOAuthStart(req, res, oauthRoute.provider);
      return oauth.handleOAuthCallback(req, res, oauthRoute.provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.statusCode = message.includes("not built") ? 503 : 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: { code: "OAUTH_HANDLER_FAILED", message } }));
      return;
    }
  }
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
    if (!expressHandler && serverLoadPromise) await serverLoadPromise;
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
