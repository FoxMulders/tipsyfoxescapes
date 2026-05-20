const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const readAppVersion = () => {
  const bundled = join(__dirname, "app-version.json");
  if (existsSync(bundled)) {
    try {
      const data = JSON.parse(readFileSync(bundled, "utf8"));
      if (typeof data.version === "string" && data.version.trim()) return data.version.trim();
    } catch {
      /* fall through */
    }
  }
  const pkgPath = join(__dirname, "..", "frontend", "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
};

const version = readAppVersion();

const resolveBuildId = () => {
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA ?? "").trim();
  if (sha) return sha.slice(0, 7);
  const deployment = String(process.env.VERCEL_DEPLOYMENT_ID ?? "").trim();
  if (deployment) return deployment;
  return String(process.env.BUILD_ID ?? "").trim();
};

/** Public app version for ops and footer cross-check. */
module.exports = function handler(_req, res) {
  const build = resolveBuildId();
  const body = JSON.stringify({
    version,
    build: build || new Date().toISOString(),
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.end(body);
};
