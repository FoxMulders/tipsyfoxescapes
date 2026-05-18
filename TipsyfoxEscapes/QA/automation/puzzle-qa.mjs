#!/usr/bin/env node
/**
 * Puzzle QA — catalog static scan + puzzleQa module self-test (tsx).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backend = path.join(root, "Dev/app/backend");

const scan = spawnSync("npx", ["tsx", path.join("src/qa/catalogStaticScan.ts")], {
  cwd: backend,
  stdio: "inherit",
  shell: true,
});
if (scan.status !== 0) process.exit(scan.status ?? 1);

const selfTest = spawnSync("npx", ["tsx", path.join("src/qa/puzzleQaSelfTest.ts")], {
  cwd: backend,
  stdio: "inherit",
  shell: true,
});
process.exit(selfTest.status === 0 ? 0 : 1);
