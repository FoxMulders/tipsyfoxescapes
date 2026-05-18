import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverPath = path.join(backendRoot, "src/server.ts");
const src = readFileSync(serverPath, "utf8");
const start = src.indexOf("const puzzlePoolByCategory");
const end = src.indexOf("const fillThemeTemplate");
const pool = start >= 0 && end > start ? src.slice(start, end) : "";

const failures: Array<{ code: string; message: string; requiredChange: string }> = [];

const banned = [
  { re: /results\?search_query/g, code: "CATALOG_YOUTUBE_SEARCH", message: "YouTube search results URL in catalog", fix: "Replace with /watch, /embed, or /shorts URL tied to this puzzle, or remove the link." },
  { re: /example\.com|placeholder|lorem ipsum/gi, code: "CATALOG_PLACEHOLDER", message: "Placeholder URL/text in catalog", fix: "Use a live HTTPS URL for the actual build reference." },
];

for (const b of banned) {
  const m = pool.match(b.re);
  if (m && m.length > 0) {
    failures.push({ code: b.code, message: `${b.message} (${m.length} occurrence(s))`, requiredChange: b.fix });
  }
}

const channelMentions = (pool.match(/Playful Technology channel|Puzzle Pieces channel/g) ?? []).length;
const searchMentions = (pool.match(/results\?search_query/g) ?? []).length;
if (channelMentions > 4 && searchMentions > 0) {
  failures.push({
    code: "CATALOG_GENERIC_REFS",
    message: "Catalog relies on generic channel + search links instead of puzzle-specific assets",
    requiredChange: "Per puzzle: one specific tutorial video or official doc; remove channel home and search URLs.",
  });
}

if (failures.length > 0) {
  console.error("[puzzle-qa] Catalog static scan FAILED");
  for (const f of failures) {
    console.error(`[ERROR] ${f.code}: ${f.message}`);
    console.error(`       → ${f.requiredChange}`);
  }
  process.exit(1);
}
console.log("[puzzle-qa] Catalog static scan PASS");
