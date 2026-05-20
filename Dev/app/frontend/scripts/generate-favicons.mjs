/**
 * Generates favicon PNGs (and favicon.ico) from the fox in public/tipsy-fox-logo.JPEG.
 * Crops to the seated fox only (no title or decorative frame).
 * Run: node scripts/generate-favicons.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const src = join(publicDir, "tipsy-fox-logo.JPEG");

/** Crop tuned for tipsy-fox-logo.JPEG — fox character only. */
const FOX_CROP_RATIOS = {
  left: 0.28,
  top: 0.32,
  width: 0.44,
  height: 0.47,
};

const { width, height } = await sharp(src).metadata();
const crop = {
  left: Math.round(width * FOX_CROP_RATIOS.left),
  top: Math.round(height * FOX_CROP_RATIOS.top),
  width: Math.round(width * FOX_CROP_RATIOS.width),
  height: Math.round(height * FOX_CROP_RATIOS.height),
};

const foxOnly = sharp(src).extract(crop);

const sizes = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await foxOnly
    .clone()
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, name));
  console.log(`Wrote ${name}`);
}

await foxOnly
  .clone()
  .resize(32, 32, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .toFile(join(publicDir, "favicon.ico"));

console.log("Wrote favicon.ico (from fox crop)");
