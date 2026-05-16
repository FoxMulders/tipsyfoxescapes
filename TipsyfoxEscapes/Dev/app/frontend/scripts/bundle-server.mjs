import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(frontendRoot, "../backend/src/serverless.ts");
const outfile = join(frontendRoot, "api/server.cjs");

console.log("[bundle-server] Bundling", entry, "→", outfile);

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: true,
  logLevel: "info",
  mainFields: ["module", "main"],
});

console.log("[bundle-server] Done.");
