#!/usr/bin/env node
/**
 * Run all four QA departments. Used locally and in GitHub Actions on every push.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exitWithSummary } from "./lib/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function run(dept, script) {
  const r = spawnSync(process.execPath, [path.join(here, script)], { stdio: "inherit" });
  return { department: dept, pass: r.status === 0, detail: r.status !== 0 ? `exit ${r.status}` : "" };
}

const results = [
  run("code", "code-qa.mjs"),
  run("workflow", "workflow-qa.mjs"),
  run("story_editor", "story-editor-qa.mjs"),
  run("puzzle", "puzzle-qa.mjs"),
];

exitWithSummary(results);
