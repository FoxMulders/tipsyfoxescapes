/**
 * Bumps Dev/app/frontend/package.json semver.
 *
 * Policy (see vite.config.ts):
 * - MAJOR: public / product releases only — run `npm run bump:major` (or APP_VERSION_BUMP=major).
 * - MINOR: larger behavior changes — `npm run bump:minor` (or APP_VERSION_BUMP=minor).
 * - PATCH: small edits — auto on `npm run dev` / `npm run build` (predev/prebuild), or `npm run bump:patch`.
 *
 * Skip automation: SKIP_VERSION_BUMP=1 npm run dev
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.SKIP_VERSION_BUMP === "1") {
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const raw = String(pkg.version || "0.0.0");
const m = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
if (!m) {
  console.error("package.json version must be MAJOR.MINOR.PATCH (e.g. 1.4.2)");
  process.exit(1);
}

let major = Number(m[1]);
let minor = Number(m[2]);
let patch = Number(m[3]);

const fromArgv = process.argv[2];
const kind = (fromArgv || process.env.APP_VERSION_BUMP || "patch").toLowerCase();

if (kind === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (kind === "minor") {
  minor += 1;
  patch = 0;
} else if (kind === "patch" || kind === "") {
  patch += 1;
} else {
  console.error(`Unknown bump "${kind}". Use patch, minor, or major.`);
  process.exit(1);
}

pkg.version = `${major}.${minor}.${patch}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log(`[bump-app-version] ${raw} → ${pkg.version} (${kind})`);
