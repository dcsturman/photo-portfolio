#!/usr/bin/env node
/* ============================================================================
   prep-photos.js  —  housekeeping for the photo portfolio.

   Run from anywhere:   node scripts/prep-photos.js

   It does three things:

   1. Cross-checks images/ against photos.js and reports:
        • images on disk that are NOT listed in photos.js
            -> appends a skeleton entry for each (you then set category + caption)
        • photos.js entries whose image file is MISSING from disk   -> flagged
        • entries with an EMPTY caption                              -> flagged

   2. Losslessly optimizes any JPEG larger than THRESHOLD using jpegtran
      (-optimize -progressive -copy all). This is pixel-identical to the
      original and keeps the ICC colour profile + metadata; it only rebuilds
      the JPEG's Huffman tables and makes it progressive. Savings are modest
      (that's what "lossless" buys you) and a file is only replaced if it
      actually got smaller.

   Exit code: 0 if everything is clean, 1 if something needs your attention
   (handy for a pre-commit hook later).
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// ---- config -------------------------------------------------------------
const THRESHOLD = 1_000_000; // bytes (~1 MB). Files bigger than this get optimized.
const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "images");
const PHOTOS_JS = path.join(ROOT, "photos.js");
const VALID_CATEGORIES = ["People", "Places", "Critters"];

const ASSET_RE = /\.(jpe?g|png|webp)$/i; // counts as a "photo" for the cross-check
const JPEG_RE = /\.jpe?g$/i;             // jpegtran only handles JPEG

const mb = (b) => (b / 1048576).toFixed(2) + " MB";

// ---- load photos.js as data ---------------------------------------------
let src = fs.readFileSync(PHOTOS_JS, "utf8");
let PHOTOS;
try {
  // photos.js just declares `const PHOTOS = [...]`; run it and hand back the array.
  PHOTOS = Function(`${src}\nreturn PHOTOS;`)();
} catch (e) {
  console.error(`✗ Could not parse photos.js — fix the syntax first:\n  ${e.message}`);
  process.exit(2);
}

const onDisk = fs.readdirSync(IMAGES_DIR).filter((f) => ASSET_RE.test(f)).sort();
const referenced = new Set(PHOTOS.map((p) => p.file));

// ---- 1. cross-check ------------------------------------------------------
const missingFromJs = onDisk.filter((f) => !referenced.has(f));
const missingOnDisk = PHOTOS.filter((p) => !onDisk.includes(p.file)).map((p) => p.file);
const noCaption = PHOTOS.filter((p) => !p.caption || !String(p.caption).trim()).map((p) => p.file);
const badCategory = PHOTOS.filter((p) => !VALID_CATEGORIES.includes(p.category))
  .map((p) => `${p.file} (category: ${JSON.stringify(p.category)})`);

console.log("— Cross-check —");
console.log(`  ${PHOTOS.length} entries in photos.js, ${onDisk.length} image files on disk.`);

if (missingFromJs.length) {
  // Append a skeleton entry for each new image, just before the closing "];".
  const block = missingFromJs
    .map(
      (f) =>
        `  { file: ${JSON.stringify(f)}, category: "Places", caption: "" }, ` +
        `// TODO: set category (People/Places/Critters) & caption`
    )
    .join("\n");
  const idx = src.lastIndexOf("];");
  if (idx === -1) {
    console.error("  ✗ Couldn't find the end of the PHOTOS array to append to.");
    process.exit(2);
  }
  src = src.slice(0, idx) + block + "\n" + src.slice(idx);
  fs.writeFileSync(PHOTOS_JS, src);
  console.log(`  + added ${missingFromJs.length} skeleton entr${missingFromJs.length === 1 ? "y" : "ies"} to photos.js:`);
  missingFromJs.forEach((f) => console.log(`      ${f}   <- set its category & caption`));
}

if (missingOnDisk.length) {
  console.log(`  ! ${missingOnDisk.length} entr${missingOnDisk.length === 1 ? "y" : "ies"} reference a file that is NOT on disk:`);
  missingOnDisk.forEach((f) => console.log(`      ${f}`));
}
if (badCategory.length) {
  console.log(`  ! ${badCategory.length} entr${badCategory.length === 1 ? "y" : "ies"} have an unknown category:`);
  badCategory.forEach((s) => console.log(`      ${s}`));
}
if (noCaption.length) {
  console.log(`  ! ${noCaption.length} entr${noCaption.length === 1 ? "y" : "ies"} have no caption yet:`);
  noCaption.forEach((f) => console.log(`      ${f}`));
}
if (!missingFromJs.length && !missingOnDisk.length && !badCategory.length && !noCaption.length) {
  console.log("  ✓ everything lines up.");
}

// ---- 2. lossless optimization -------------------------------------------
console.log(`\n— Lossless optimize (JPEGs over ${mb(THRESHOLD)}) —`);

let haveJpegtran = true;
try {
  execFileSync("jpegtran", ["-version"], { stdio: "ignore" });
} catch {
  // -version isn't supported everywhere; fall back to a PATH check.
  try {
    execFileSync("bash", ["-lc", "command -v jpegtran"], { stdio: "ignore" });
  } catch {
    haveJpegtran = false;
  }
}

if (!haveJpegtran) {
  console.log("  · jpegtran not found — skipping. Install it with:  brew install mozjpeg");
} else {
  let optimized = 0;
  let saved = 0;
  for (const f of onDisk.filter((f) => JPEG_RE.test(f))) {
    const fp = path.join(IMAGES_DIR, f);
    const before = fs.statSync(fp).size;
    if (before <= THRESHOLD) continue;

    const tmp = fp + ".opt-tmp";
    try {
      execFileSync("jpegtran", ["-optimize", "-progressive", "-copy", "all", "-outfile", tmp, fp]);
    } catch (e) {
      console.log(`  ✗ ${f}: jpegtran failed (${e.message.split("\n")[0]})`);
      continue;
    }
    const after = fs.statSync(tmp).size;
    if (after > 0 && after < before) {
      fs.renameSync(tmp, fp); // atomic replace
      optimized++;
      saved += before - after;
      console.log(`  ✓ ${f}: ${mb(before)} -> ${mb(after)}  (-${((100 * (before - after)) / before).toFixed(1)}%)`);
    } else {
      fs.unlinkSync(tmp);
      console.log(`  · ${f}: already optimal (${mb(before)})`);
    }
  }
  console.log(
    optimized
      ? `  total: optimized ${optimized} file${optimized === 1 ? "" : "s"}, saved ${mb(saved)}.`
      : "  nothing over threshold needed optimizing."
  );
}

// ---- 3. photo-meta.js (pixel dimensions) --------------------------------
/* The site needs each photo's aspect ratio to lay out the coverflow. Reading it
   from a generated file means the page can draw the correct layout immediately,
   instead of downloading every image first just to measure it. Regenerated on
   every run, so it can't drift. */
console.log("\n— photo-meta.js —");

/* Pull width/height straight out of the JPEG's SOF marker. No dependencies.
   (Safe here: none of these files carry an EXIF orientation flag, so the stored
   dimensions are the displayed dimensions.) */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null; // not a JPEG
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    i += 2;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue; // no payload
    if (i + 1 >= buf.length) break;
    const len = buf.readUInt16BE(i);
    // SOF0-SOF15 carry the frame size (but c4/c8/cc are DHT/JPG/DAC, not SOF).
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { h: buf.readUInt16BE(i + 3), w: buf.readUInt16BE(i + 5) };
    i += len;
  }
  return null;
}

const meta = {};
const unreadable = [];
for (const f of onDisk.filter((f) => JPEG_RE.test(f))) {
  const size = jpegSize(fs.readFileSync(path.join(IMAGES_DIR, f)));
  if (size && size.w && size.h) meta[f] = size;
  else unreadable.push(f);
}

const metaJs =
  "/* AUTO-GENERATED by scripts/prep-photos.js — do not edit by hand.\n" +
  "   Pixel dimensions of each photo, so the gallery can lay itself out\n" +
  "   before any image has downloaded. Re-run the script after adding photos. */\n" +
  "const PHOTO_META = {\n" +
  Object.keys(meta).sort()
    .map((f) => `  ${JSON.stringify(f)}: { w: ${meta[f].w}, h: ${meta[f].h} },`)
    .join("\n") +
  "\n};\n";

fs.writeFileSync(path.join(ROOT, "photo-meta.js"), metaJs);
console.log(`  ✓ wrote photo-meta.js (${Object.keys(meta).length} photos).`);
if (unreadable.length) {
  console.log(`  ! could not read dimensions for ${unreadable.length} file(s):`);
  unreadable.forEach((f) => console.log(`      ${f}`));
}

// ---- 4. weight report ----------------------------------------------------
/* Big files are the main thing that makes the site feel slow on a phone. The
   site now only downloads the photos you can see, so this is about the few
   heavyweights, not the total. Re-export anything flagged here at quality ~80. */
const HEAVY = 1_200_000; // bytes — a 2048px q80 export lands well under this
const heavy = onDisk
  .map((f) => ({ f, size: fs.statSync(path.join(IMAGES_DIR, f)).size }))
  .filter((x) => x.size > HEAVY)
  .sort((a, b) => b.size - a.size);

console.log("\n— Weight check —");
const totalBytes = onDisk.reduce((n, f) => n + fs.statSync(path.join(IMAGES_DIR, f)).size, 0);
console.log(`  ${onDisk.length} photos, ${mb(totalBytes)} total, ${mb(totalBytes / onDisk.length)} average.`);
if (heavy.length) {
  console.log(`  ! ${heavy.length} file(s) over ${mb(HEAVY)} — consider re-exporting at quality ~80:`);
  heavy.forEach((x) => console.log(`      ${x.f}  ${mb(x.size)}`));
} else {
  console.log("  ✓ no outsized files.");
}

// ---- exit ----------------------------------------------------------------
const needsAttention =
  missingFromJs.length || missingOnDisk.length || badCategory.length || noCaption.length;
if (needsAttention) {
  console.log("\n⚠  Some entries need your attention (see ! and TODO lines above).");
}
process.exit(needsAttention ? 1 : 0);
