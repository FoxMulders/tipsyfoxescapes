#!/usr/bin/env node
/**
 * Workflow QA — static checks on API surface, wizard flow hooks, planning contracts.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printDepartmentFailures } from "./lib/report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverPath = path.join(root, "Dev/app/backend/src/server.ts");
const appPath = path.join(root, "Dev/app/frontend/src/App.tsx");
const agentsPath = path.join(root, "AGENTS.md");

const failures = [];

const routerPath = path.join(root, "Dev/app/frontend/src/AppRouter.tsx");
const gmPath = path.join(root, "Dev/app/frontend/src/pages/GmConsolePage.tsx");

const mustExist = [
  ['app.post("/api/planning/session"', serverPath],
  ["/api/puzzles/generate", serverPath],
  ["/api/puzzles/:puzzleId/replace", serverPath],
  ["/api/live/:sessionId/init", path.join(root, "Dev/app/backend/src/liveGame.ts")],
  ["/api/live/:sessionId/stream", path.join(root, "Dev/app/backend/src/liveGame.ts")],
  ["MissionFlowMap", appPath],
  ["data-testid=\"mission-flow-map\"", appPath],
  ["/gm/:sessionId", routerPath],
  ["/room/:sessionId/player-display", routerPath],
  ["Gamemaster Live Console", gmPath],
  ["HomePostExportModal", appPath],
  ["export-live-actions", appPath],
];

for (const [needle, file] of mustExist) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    failures.push({
      severity: "error",
      code: "WORKFLOW_MISSING_SURFACE",
      field: path.basename(file),
      message: `Expected workflow anchor missing: ${needle}`,
      requiredChange: `Restore ${needle} in ${path.relative(root, file)} per AGENTS.md routes.`,
    });
  }
}

const agents = readFileSync(agentsPath, "utf8");
for (const route of ["/api/themes/generate", "/api/plans/:sessionId/export"]) {
  if (!agents.includes(route)) {
    failures.push({
      severity: "warn",
      code: "WORKFLOW_AGENTS_DRIFT",
      field: "AGENTS.md",
      message: `AGENTS.md missing documented route ${route}.`,
      requiredChange: `Update AGENTS.md to match server.ts.`,
    });
  }
}

const healthPath = path.join(root, "Dev/app/api/health.js");
if (!existsSync(healthPath)) {
  failures.push({
    severity: "error",
    code: "WORKFLOW_HEALTH_ENDPOINT",
    field: "api/health.js",
    message: "Health handler missing for deploy smoke.",
    requiredChange: "Ensure Dev/app/api/health.js exists for Vercel.",
  });
}

if (failures.some((f) => f.severity === "error")) {
  printDepartmentFailures("workflow", failures);
  process.exit(1);
}
console.log("[workflow-qa] PASS — static workflow anchors present.");
if (failures.length) printDepartmentFailures("workflow", failures);
