// Drop a generated illustration into an ekādaśī story, correctly sized.
//
//   node scripts/add-ekadashi-panel.mjs kamika 1 ~/Downloads/whatever.png
//   node scripts/add-ekadashi-panel.mjs --list          (what has art so far)
//   node scripts/add-ekadashi-panel.mjs --list kamika
//
// Takes whatever an image generator gave you - any size, PNG or JPG - and
// writes public/ekadashi/<slug>/panel-<N>.webp at exactly 1200x900. The page
// reserves that 4:3 box whether or not the file exists (DESIGN.md §6), so
// adding art never moves a line of narration.
//
// It validates the slug and the panel number against lib/ekadashi-stories.ts
// rather than trusting the arguments: a typo'd slug would otherwise create a
// folder nothing ever reads, and the art would simply never appear with no
// error to explain why.
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 900;
const QUALITY = 82;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const storiesPath = path.join(webRoot, "lib", "ekadashi-stories.ts");
const artRoot = path.join(webRoot, "public", "ekadashi");

/** {slug: panelCount}, read straight from the data file so this script and
 * the page can never disagree about how many panels a story has. */
function readStories() {
  const src = readFileSync(storiesPath, "utf8");
  const blocks = src.split(/\n    slug: "/).slice(1);
  const stories = new Map();
  for (const block of blocks) {
    const slug = block.slice(0, block.indexOf('"'));
    const body = block.split(/\n  \},/)[0];
    stories.set(slug, (body.match(/\n        caption:/g) ?? []).length);
  }
  return stories;
}

function list(stories, only) {
  let withArt = 0;
  let total = 0;
  for (const [slug, panels] of stories) {
    if (only && slug !== only) continue;
    const dir = path.join(artRoot, slug);
    const have = existsSync(dir)
      ? readdirSync(dir).filter((f) => /^panel-\d+\.webp$/.test(f)).length
      : 0;
    withArt += have;
    total += panels;
    const bar = "#".repeat(have) + ".".repeat(Math.max(0, panels - have));
    console.log(`  ${slug.padEnd(18)} ${String(have).padStart(2)}/${panels}  ${bar}`);
  }
  console.log(`\n  ${withArt} of ${total} panels illustrated.`);
}

const args = process.argv.slice(2);
const stories = readStories();

if (args[0] === "--list") {
  if (args[1] && !stories.has(args[1])) {
    console.error(`Unknown story "${args[1]}".`);
    process.exit(1);
  }
  list(stories, args[1]);
  process.exit(0);
}

const [slug, panelArg, source] = args;
if (!slug || !panelArg || !source) {
  console.error("usage: node scripts/add-ekadashi-panel.mjs <slug> <panel> <image>");
  console.error("       node scripts/add-ekadashi-panel.mjs --list [slug]");
  process.exit(1);
}

if (!stories.has(slug)) {
  console.error(`Unknown story "${slug}". Known slugs:\n  ${[...stories.keys()].join("\n  ")}`);
  process.exit(1);
}

const panelCount = stories.get(slug);
const panel = Number(panelArg);
if (!Number.isInteger(panel) || panel < 1 || panel > panelCount) {
  console.error(`"${slug}" has ${panelCount} panels, so <panel> must be 1-${panelCount} (got ${panelArg}).`);
  process.exit(1);
}

if (!existsSync(source)) {
  console.error(`No such image: ${source}`);
  process.exit(1);
}

const outDir = path.join(artRoot, slug);
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `panel-${panel}.webp`);
const replacing = existsSync(outPath);

const input = sharp(source);
const meta = await input.metadata();

await input
  // `cover` matches the CSS: the page also crops rather than letterboxes, so
  // what you see here is exactly what the panel will show.
  .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
  .webp({ quality: QUALITY })
  .toFile(outPath);

const ratio = (meta.width / meta.height).toFixed(2);
console.log(`${replacing ? "replaced" : "wrote"} ${path.relative(webRoot, outPath)}`);
console.log(`  source ${meta.width}x${meta.height} (${ratio}:1) -> ${WIDTH}x${HEIGHT} (1.33:1)`);
if (Math.abs(meta.width / meta.height - WIDTH / HEIGHT) > 0.12) {
  console.log(`  NOTE: source was not 4:3, so it was cropped. Regenerate at 4:3 if the crop lost something.`);
}
console.log(`\nNow set \`art: true\` on panel ${panel} of "${slug}" in lib/ekadashi-stories.ts.`);
