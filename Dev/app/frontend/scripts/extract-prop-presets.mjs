import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsx = path.join(__dirname, "../src/App.tsx");
const out = path.join(__dirname, "../src/features/planning/domain/propPresets.ts");
const lines = fs.readFileSync(appTsx, "utf8").split(/\r?\n/);
const chunk = lines.slice(1219, 1536).join("\n");
const wrapped = `/** Prop preset suggestions for planning environments — extracted from App.tsx */\n${chunk
  .replace(/^function isCommercialVenueEventContext/m, "export function isCommercialVenueEventContext")
  .replace(/^const EVENT_CONTEXT_PRESETS/m, "export const EVENT_CONTEXT_PRESETS")
  .replace(
    /^type SuggestedPropOption/m,
    "export type SuggestedPropOption",
  )
  .replace(
    /^function getSuggestedPropOptionsForPlanning/m,
    "export function getSuggestedPropOptionsForPlanning",
  )}\n`;
fs.writeFileSync(out, wrapped);
console.log("Wrote", out, wrapped.length, "chars");
