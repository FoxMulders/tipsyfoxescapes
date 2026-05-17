import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(appRoot, "frontend", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = typeof pkg.version === "string" ? pkg.version : "0.0.0";
const outPath = join(appRoot, "api", "app-version.json");
writeFileSync(outPath, JSON.stringify({ version }, null, 0) + "\n", "utf8");
console.log(`[write-app-version] ${version} → api/app-version.json`);
