import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(appRoot, "backend/src/oauthServerless.ts");
const outfile = join(appRoot, "api/oauth.cjs");

console.log("[bundle-oauth] Bundling", entry, "→", outfile);

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  minify: true,
  legalComments: "none",
  logLevel: "info",
});

console.log("[bundle-oauth] Done.");
