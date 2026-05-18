#!/usr/bin/env node
/**
 * Code QA — typecheck / compile backend + frontend.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const app = path.join(root, "Dev/app");

function run(cmd, args, cwd, label) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, SKIP_VERSION_BUMP: "1" } });
  if (r.status !== 0) {
    console.error(`[code-qa] ${label} failed (exit ${r.status ?? 1})`);
    return false;
  }
  return true;
}

const backendOk = run("npm", ["run", "build"], path.join(app, "backend"), "backend tsc");
const frontendOk = run("npm", ["run", "build"], path.join(app, "frontend"), "frontend tsc+vite");
const unitOk = run("npm", ["run", "test:unit"], path.join(app, "backend"), "backend unit/self-tests");

if (!backendOk || !frontendOk || !unitOk) {
  process.exit(1);
}
console.log("[code-qa] PASS — builds and unit self-tests succeeded.");
