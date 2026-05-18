#!/usr/bin/env node
/**
 * Story Editor QA — junior hooks + theme-fit rules (tsx).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(root, "Dev/app/backend/src/qa/storyEditorSelfTest.ts");

const r = spawnSync("npx", ["tsx", script], {
  cwd: path.join(root, "Dev/app/backend"),
  stdio: "inherit",
  shell: true,
});

process.exit(r.status === 0 ? 0 : 1);
