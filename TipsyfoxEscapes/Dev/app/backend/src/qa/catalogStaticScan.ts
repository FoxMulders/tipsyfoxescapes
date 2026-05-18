#!/usr/bin/env node
/**
 * @deprecated Use `npm run test:unit` (Vitest). Kept for direct script invocation.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPuzzlePoolSource, scanPuzzleCatalog } from "./catalogScan.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverPath = path.join(backendRoot, "src/server.ts");
const src = readFileSync(serverPath, "utf8");
const pool = extractPuzzlePoolSource(src);
const failures = scanPuzzleCatalog(pool);

if (failures.length > 0) {
  console.error("[puzzle-qa] Catalog static scan FAILED");
  for (const f of failures) {
    console.error(`[ERROR] ${f.code}: ${f.message}`);
    console.error(`       → ${f.requiredChange}`);
  }
  process.exit(1);
}
console.log("[puzzle-qa] Catalog static scan PASS");
