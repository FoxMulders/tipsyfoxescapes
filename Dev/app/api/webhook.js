const { createRequire } = require("node:module");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const requireFromHere = createRequire(__filename);
const oauthBundlePath = join(__dirname, "oauth.cjs");

/** Meta webhook verification at /webhook (production callback URL). */
module.exports = async function handler(req, res) {
  if (!existsSync(oauthBundlePath)) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "OAUTH_HANDLER_MISSING", message: "api/oauth.cjs was not built." } }));
    return;
  }
  try {
    const oauth = requireFromHere(oauthBundlePath);
    return oauth.handleFacebookWebhookVerify(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "WEBHOOK_HANDLER_FAILED", message } }));
  }
};
