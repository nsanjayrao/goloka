// One-off script: rasterize web/public/icons/icon.svg (the maskable PWA
// mark) into the PNG sizes referenced by web/public/manifest.json.
// Run with: node scripts/generate-icons.mjs
//
// Uses `sharp` (devDependency) to render the SVG at the target pixel size
// directly, so the output is crisp rather than a scaled-down bitmap.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const svgPath = path.join(iconsDir, "icon.svg");
const svg = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`wrote ${outPath} (${size}x${size})`);
}
