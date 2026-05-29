import fs from "fs";

const p = new URL("../src/App.tsx", import.meta.url);
let lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => l.startsWith("function isCommercialVenueEventContext"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("function getStagingExampleParagraphs"));
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}
const keepHelper = `function corpusMentionsEscapeRoom(envRaw: string, eventRaw: string): boolean {
  const c = \`\${envRaw} \${eventRaw}\`.toLowerCase();
  return /\\b(escape|exit)\\s*room\\b|\\bescape\\s+game\\b|\\bpuzzle\\s*room\\b|\\bimmersive\\s+experience\\b/.test(c);
}`;
lines.splice(start, end - start, keepHelper);
fs.writeFileSync(p, lines.join("\n"));
console.log("removed", end - start, "lines");
