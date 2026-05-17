const { createRequire } = require("node:module");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const requireFromHere = createRequire(__filename);
const oauthBundlePath = join(__dirname, "..", "..", "..", "oauth.cjs");

module.exports = async function handler(req, res) {
  if (!existsSync(oauthBundlePath)) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "OAUTH_BUNDLE_MISSING", message: "OAuth bundle was not built." } }));
    return;
  }
  const oauth = requireFromHere(oauthBundlePath);
  const provider = String(req.query?.provider ?? "").toLowerCase();
  return oauth.handleOAuthStart(req, res, provider);
};
