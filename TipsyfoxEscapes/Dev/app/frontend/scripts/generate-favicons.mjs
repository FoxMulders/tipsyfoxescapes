/**
 * Generates favicon PNGs (and favicon.ico) from public/tipsy-fox-logo.JPEG.
 * Run: node scripts/generate-favicons.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const src = join(publicDir, "tipsy-fox-logo.JPEG");

const sizes = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, name));
  console.log(`Wrote ${name}`);
}

await sharp(src)
  .resize(32, 32, { fit: "cover", position: "centre" })
  .toFile(join(publicDir, "favicon.ico"));

console.log("Wrote favicon.ico");
