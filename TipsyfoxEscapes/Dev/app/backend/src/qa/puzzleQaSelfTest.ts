import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyPuzzleQaGate, auditPuzzleQa } from "../puzzleQa.js";

const failures: string[] = [];

const good = applyPuzzleQaGate(
  [
    {
      id: "qa_good",
      category: "logic",
      themeTags: ["library"],
      title: "Cipher Index",
      objective: "Decode the archive index card.",
      howItWorks:
        "Players find a cipher key on the Cipher Index card and decode a short message that unlocks the next compartment.",
      themeFitReason: 'For "Haunted Library", this cipher uses mis-shelved index cards as diegetic clues.',
      referenceLinks: [
        {
          title: "Arduino tone reference",
          url: "https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/",
        },
      ],
      solveSteps: ["Find key", "Decode message"],
      difficulty: "medium",
    },
  ],
  { themeName: "Haunted Library", strict: true },
);
if (!good[0]?.puzzleQa?.passed) failures.push("Expected valid puzzle to pass strict QA");

const badLinks = auditPuzzleQa(
  {
    id: "qa_bad_links",
    category: "logic",
    themeTags: [],
    title: "Pattern Archive",
    objective: "Match symbols.",
    howItWorks: "Players collect symbols from props and align the Pattern Archive sequence on the board.",
    themeFitReason: 'For "Haunted Library", symbol order mirrors misfiled spine colors.',
    referenceLinks: [
      {
        title: "Generic search",
        url: "https://www.youtube.com/results?search_query=escape+room",
      },
    ],
    solveSteps: ["Collect", "Align"],
    difficulty: "medium",
  },
  { themeName: "Haunted Library", strict: true },
  [{ title: "Generic search", url: "https://www.youtube.com/results?search_query=escape+room" }],
);
if (badLinks.passed) failures.push("Expected YouTube search URL to fail strict QA");

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverSrc = readFileSync(path.join(backendRoot, "src/server.ts"), "utf8");
const poolStart = serverSrc.indexOf("const puzzlePoolByCategory");
const poolEnd = serverSrc.indexOf("const fillThemeTemplate");
const pool = poolStart >= 0 && poolEnd > poolStart ? serverSrc.slice(poolStart, poolEnd) : "";

if (/results\?search_query/.test(pool)) {
  failures.push("Catalog still contains YouTube search result URLs — remove from puzzlePoolByCategory");
}
if (/Playful Technology channel/.test(pool) && /category: "logic"/.test(pool)) {
  failures.push("Catalog has generic channel links on non-electronic puzzles — use specific video or doc URLs");
}

if (failures.length > 0) {
  console.error("[puzzle-qa] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("[puzzle-qa] PASS");
