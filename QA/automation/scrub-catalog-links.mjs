#!/usr/bin/env node
/** One-off maintainer script: remove YouTube search + bare channel refs from puzzlePoolByCategory in server.ts */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../Dev/app/backend/src/server.ts",
);
let src = readFileSync(serverPath, "utf8");
const start = src.indexOf("const puzzlePoolByCategory");
const end = src.indexOf("const fillThemeTemplate");
if (start < 0 || end < 0) {
  console.error("Could not locate puzzle pool in server.ts");
  process.exit(1);
}
const before = src.slice(0, start);
const pool = src.slice(start, end);
const after = src.slice(end);

let cleaned = pool;
cleaned = cleaned.replace(/\n\s*\{\s*\n\s*title:\s*"[^"]*"\s*,\s*\n\s*url:\s*"https:\/\/www\.youtube\.com\/results\?search_query=[^"]*"\s*,\s*\n\s*\},/g, "");
cleaned = cleaned.replace(/\n\s*refPlayfulTechnology\("Playful Technology channel"\),?/g, "");
cleaned = cleaned.replace(/\n\s*refPuzzlePieces\("Puzzle Pieces channel"\),?/g, "");
cleaned = cleaned.replace(/,\s*,/g, ",");
cleaned = cleaned.replace(/\[\s*,/g, "[");
cleaned = cleaned.replace(/,\s*\]/g, "]");

writeFileSync(serverPath, before + cleaned + after, "utf8");
console.log("Scrubbed catalog referenceLinks in server.ts");
