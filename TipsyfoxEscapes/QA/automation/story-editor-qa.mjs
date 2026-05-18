#!/usr/bin/env node
/**
 * Story Editor QA — Vitest storyEditorRules suite.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backend = path.join(root, "Dev/app/backend");

const r = spawnSync(
  "npx",
  ["vitest", "run", "src/qa/__tests__/storyEditorRules.test.ts", "src/qa/__tests__/uiCopyProse.test.ts"],
  {
    cwd: backend,
    stdio: "inherit",
    shell: true,
  },
);
process.exit(r.status === 0 ? 0 : 1);
