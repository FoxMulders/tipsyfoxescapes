const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const readBundledRelease = () => {
  const bundled = join(__dirname, "app-version.json");
  if (!existsSync(bundled)) return null;
  try {
    return JSON.parse(readFileSync(bundled, "utf8"));
  } catch {
    return null;
  }
};

const readAppVersion = () => {
  const bundled = readBundledRelease();
  if (bundled && typeof bundled.version === "string" && bundled.version.trim()) {
    return bundled.version.trim();
  }
  const pkgPath = join(__dirname, "..", "frontend", "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
};

const resolveBuildId = () => {
  const bundled = readBundledRelease();
  if (bundled && typeof bundled.build === "string" && bundled.build.trim()) {
    return bundled.build.trim();
  }
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? "").trim();
  if (sha) return sha.slice(0, 7);
  const deployment = String(process.env.VERCEL_DEPLOYMENT_ID ?? "").trim();
  if (deployment) return deployment;
  return String(process.env.BUILD_ID ?? "").trim();
};

const version = readAppVersion();

/** Public app version for ops and footer cross-check. */
module.exports = function handler(_req, res) {
  const build = resolveBuildId();
  const body = JSON.stringify({
    version,
    build: build || "local",
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.end(body);
};
