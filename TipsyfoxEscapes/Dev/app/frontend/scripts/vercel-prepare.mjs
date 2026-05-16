/**
 * Builds the Express backend and copies dist + node_modules into api/_bundle
 * so Vercel serverless can import them when Root Directory is frontend/.
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = join(frontendRoot, "..", "backend");
const bundleRoot = join(frontendRoot, "api", "_bundle");

console.log("[vercel-prepare] Building backend at", backendRoot);
execSync("npm ci", { cwd: backendRoot, stdio: "inherit" });
execSync("npm run build", { cwd: backendRoot, stdio: "inherit" });

console.log("[vercel-prepare] Copying backend into", bundleRoot);
rmSync(bundleRoot, { recursive: true, force: true });
mkdirSync(bundleRoot, { recursive: true });
cpSync(join(backendRoot, "dist"), join(bundleRoot, "dist"), { recursive: true });
cpSync(join(backendRoot, "node_modules"), join(bundleRoot, "node_modules"), { recursive: true });

console.log("[vercel-prepare] Done.");
