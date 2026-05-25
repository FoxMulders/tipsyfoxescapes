import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(appRoot, "frontend", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = typeof pkg.version === "string" ? pkg.version : "0.0.0";

const resolveBuildId = () => {
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? "").trim();
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { cwd: appRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const build = resolveBuildId();
const payload = build ? { version, build } : { version };
const outPath = join(appRoot, "api", "app-version.json");
writeFileSync(outPath, JSON.stringify(payload, null, 0) + "\n", "utf8");
console.log(`[write-app-version] ${version}${build ? ` (${build})` : ""} → api/app-version.json`);
