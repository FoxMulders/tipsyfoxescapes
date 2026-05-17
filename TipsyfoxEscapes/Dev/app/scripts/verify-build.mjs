import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  join(appRoot, "api/oauth.cjs"),
  join(appRoot, "api/server.cjs"),
  join(appRoot, "api/health.js"),
  join(appRoot, "api/version.js"),
  join(appRoot, "api/app-version.json"),
  join(appRoot, "api/index.js"),
  join(appRoot, "frontend/dist/index.html"),
];

for (const path of required) {
  if (!existsSync(path)) {
    console.error("[verify-build] Missing:", path);
    process.exit(1);
  }
}

console.log("[verify-build] OK — API bundle and frontend dist present.");
