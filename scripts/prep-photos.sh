#!/usr/bin/env bash
# ============================================================================
#  prep-photos.sh  —  housekeeping for the photo portfolio.  (pure bash, macOS)
#
#  Run from anywhere:   ./scripts/prep-photos.sh
#
#  It does four things:
#
#  1. Cross-checks images/ against photos.js and reports:
#       - images on disk that are NOT listed in photos.js
#           -> appends a skeleton entry for each (you then set category + caption)
#       - photos.js entries whose image file is MISSING from disk   -> flagged
#       - entries with an EMPTY caption                              -> flagged
#       - entries whose category is not People/Places/Critters       -> flagged
#
#  2. Losslessly optimizes any JPEG larger than THRESHOLD using jpegtran
#     (-optimize -progressive -copy all). Pixel-identical to the original,
#     keeps the ICC profile + metadata; only rebuilds the JPEG's Huffman
#     tables and makes it progressive. A file is only replaced if it actually
#     got smaller. If jpegtran isn't installed, it's skipped (not an error).
#
#  3. Regenerates photo-meta.js (each JPEG's pixel dimensions) via `sips`, so
#     the gallery can lay itself out before any image has downloaded.
#
#  4. Weight report: total/average size, and flags oversized files to re-export.
#
#  Exit code: 0 if everything is clean, 1 if something needs your attention
#  (new skeletons added, missing files, empty captions, bad categories).
#
#  Written for macOS bash 3.2 — no associative arrays, no mapfile.
# ============================================================================

set -u

# ---- config ---------------------------------------------------------------
THRESHOLD=1000000   # bytes (~1 MB). JPEGs bigger than this get optimized.
HEAVY=1200000       # bytes. Files over this are flagged in the weight report.
VALID_CATEGORIES="People Places Critters"

# Resolve the repo root as the parent of this script's directory, so the
# script works no matter where it's invoked from.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGES_DIR="$ROOT/images"
PHOTOS_JS="$ROOT/photos.js"
PHOTO_META="$ROOT/photo-meta.js"

# A scratch dir for the temp files we use in place of bash-4 arrays.
TMPDIR_WORK="$(mktemp -d "${TMPDIR:-/tmp}/prep-photos.XXXXXX")"
trap 'rm -rf "$TMPDIR_WORK"' EXIT

# ---- helpers --------------------------------------------------------------

# bytes -> "X.XX MB"
mb() {
  awk -v b="$1" 'BEGIN { printf "%.2f MB", b / 1048576 }'
}

# size of a file in bytes (macOS stat)
fsize() {
  stat -f%z "$1"
}

# ---- sanity checks --------------------------------------------------------
if [ ! -f "$PHOTOS_JS" ]; then
  echo "✗ photos.js not found at $PHOTOS_JS" >&2
  exit 2
fi
if [ ! -d "$IMAGES_DIR" ]; then
  echo "✗ images/ not found at $IMAGES_DIR" >&2
  exit 2
fi

# ---- gather: images on disk ----------------------------------------------
# Sorted list of image basenames (jpg/jpeg/png), one per line.
ON_DISK="$TMPDIR_WORK/on_disk"
find "$IMAGES_DIR" -maxdepth 1 -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) \
  -exec basename {} \; | LC_ALL=C sort > "$ON_DISK"

# Just the JPEGs (jpegtran + sips only handle these), sorted.
ON_DISK_JPEG="$TMPDIR_WORK/on_disk_jpeg"
grep -iE '\.jpe?g$' "$ON_DISK" > "$ON_DISK_JPEG" || true

# ---- parse photos.js ------------------------------------------------------
# One entry per line; each entry line contains `file: "..."`. We pull out
# file / category / caption with grep + sed. Fields we can't parse are marked.
#
# REFERENCED  : basenames referenced by photos.js, sorted (for comm).
# NO_CAPTION  : files whose caption is empty.
# BAD_CATEGORY: "file (category: "X")" lines.
# QUOTE_WARN  : raw lines whose caption contains an embedded double-quote
#               (the one thing this line parser can't handle that eval could).
REFERENCED="$TMPDIR_WORK/referenced"
NO_CAPTION="$TMPDIR_WORK/no_caption"
BAD_CATEGORY="$TMPDIR_WORK/bad_category"
QUOTE_WARN="$TMPDIR_WORK/quote_warn"
: > "$REFERENCED"; : > "$NO_CAPTION"; : > "$BAD_CATEGORY"; : > "$QUOTE_WARN"

# Iterate only over lines that declare a photo entry (contain `file:`).
grep -nE 'file:[[:space:]]*"' "$PHOTOS_JS" | while IFS= read -r line; do
  lineno="${line%%:*}"
  content="${line#*:}"

  # Strip the trailing `// ...` reminder comment before parsing, so quotes or
  # keywords inside a comment can't confuse the field extraction below.
  entry="${content%%//*}"

  file="$(printf '%s\n' "$entry" | sed -nE 's/.*file:[[:space:]]*"([^"]*)".*/\1/p')"
  category="$(printf '%s\n' "$entry" | sed -nE 's/.*category:[[:space:]]*"([^"]*)".*/\1/p')"

  [ -z "$file" ] && continue
  printf '%s\n' "$file" >> "$REFERENCED"

  # Caption: capture everything between `caption: "` and its closing `"`.
  # If the caption itself contains a `"`, this match stops early, so we
  # separately detect embedded quotes and warn.
  caption="$(printf '%s\n' "$entry" | sed -nE 's/.*caption:[[:space:]]*"([^"]*)".*/\1/p')"

  # Detect an embedded double-quote in the caption value: count the quotes in
  # the object from `caption: "` onward (comment already stripped). A clean
  # caption has exactly 2 (its opening + closing); 3+ means a literal `"`.
  after_caption="$(printf '%s\n' "$entry" | sed -nE 's/.*(caption:[[:space:]]*".*)/\1/p')"
  qcount="$(printf '%s' "$after_caption" | tr -cd '"' | wc -c | tr -d ' ')"
  if [ "$qcount" -gt 2 ]; then
    printf '%s: %s\n' "$lineno" "$content" >> "$QUOTE_WARN"
  fi

  # Empty caption? (trim whitespace)
  trimmed="$(printf '%s' "$caption" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  if [ -z "$trimmed" ]; then
    printf '%s\n' "$file" >> "$NO_CAPTION"
  fi

  # Category must be one of the valid set.
  case " $VALID_CATEGORIES " in
    *" $category "*) : ;;
    *) printf '%s (category: "%s")\n' "$file" "$category" >> "$BAD_CATEGORY" ;;
  esac
done

# `while` above ran in a subshell (pipe); its files persist, that's what we read.
LC_ALL=C sort -o "$REFERENCED" "$REFERENCED"

ENTRY_COUNT="$(grep -cE 'file:[[:space:]]*"' "$PHOTOS_JS")"
DISK_COUNT="$(wc -l < "$ON_DISK" | tr -d ' ')"

# ---- 1. cross-check -------------------------------------------------------
# images on disk NOT referenced in photos.js
MISSING_FROM_JS="$TMPDIR_WORK/missing_from_js"
comm -23 "$ON_DISK" "$REFERENCED" > "$MISSING_FROM_JS"
# photos.js entries whose file is NOT on disk
MISSING_ON_DISK="$TMPDIR_WORK/missing_on_disk"
comm -13 "$ON_DISK" "$REFERENCED" > "$MISSING_ON_DISK"

n_missing_from_js="$(grep -c . "$MISSING_FROM_JS" || true)"
n_missing_on_disk="$(grep -c . "$MISSING_ON_DISK" || true)"
n_no_caption="$(grep -c . "$NO_CAPTION" || true)"
n_bad_category="$(grep -c . "$BAD_CATEGORY" || true)"
n_quote_warn="$(grep -c . "$QUOTE_WARN" || true)"

echo "— Cross-check —"
echo "  $ENTRY_COUNT entries in photos.js, $DISK_COUNT image files on disk."

# Append a skeleton entry for each new image, just before the closing "];".
if [ "$n_missing_from_js" -gt 0 ]; then
  BLOCK="$TMPDIR_WORK/skeleton_block"
  : > "$BLOCK"
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    printf '  { file: "%s", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption\n' \
      "$f" >> "$BLOCK"
  done < "$MISSING_FROM_JS"

  # Insert BLOCK immediately before the last line that is exactly "];"
  # (optionally indented). awk buffers so we can target the final closer.
  NEW_PHOTOS="$TMPDIR_WORK/photos.new"
  if ! awk -v blockfile="$BLOCK" '
    # Read the skeleton block into memory once.
    BEGIN {
      nb = 0
      while ((getline l < blockfile) > 0) { block[++nb] = l }
    }
    { lines[NR] = $0 }
    $0 ~ /^[[:space:]]*\];[[:space:]]*$/ { last_close = NR }
    END {
      if (last_close == 0) { exit 3 }   # no array closer found
      for (i = 1; i <= NR; i++) {
        if (i == last_close) {
          for (j = 1; j <= nb; j++) print block[j]
        }
        print lines[i]
      }
    }
  ' "$PHOTOS_JS" > "$NEW_PHOTOS"; then
    echo "  ✗ Couldn't find the end of the PHOTOS array to append to." >&2
    exit 2
  fi
  cat "$NEW_PHOTOS" > "$PHOTOS_JS"

  if [ "$n_missing_from_js" -eq 1 ]; then
    echo "  + added 1 skeleton entry to photos.js:"
  else
    echo "  + added $n_missing_from_js skeleton entries to photos.js:"
  fi
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    echo "      $f   <- set its category & caption"
  done < "$MISSING_FROM_JS"
fi

if [ "$n_missing_on_disk" -gt 0 ]; then
  echo "  ! $n_missing_on_disk entr$([ "$n_missing_on_disk" -eq 1 ] && echo y || echo ies) reference a file that is NOT on disk:"
  while IFS= read -r f; do [ -n "$f" ] && echo "      $f"; done < "$MISSING_ON_DISK"
fi
if [ "$n_bad_category" -gt 0 ]; then
  echo "  ! $n_bad_category entr$([ "$n_bad_category" -eq 1 ] && echo y || echo ies) have an unknown category:"
  while IFS= read -r s; do [ -n "$s" ] && echo "      $s"; done < "$BAD_CATEGORY"
fi
if [ "$n_no_caption" -gt 0 ]; then
  echo "  ! $n_no_caption entr$([ "$n_no_caption" -eq 1 ] && echo y || echo ies) have no caption yet:"
  while IFS= read -r f; do [ -n "$f" ] && echo "      $f"; done < "$NO_CAPTION"
fi
if [ "$n_quote_warn" -gt 0 ]; then
  echo "  ! $n_quote_warn caption(s) contain an embedded double-quote — this line-based"
  echo "    parser can't read them reliably; check these by hand:"
  while IFS= read -r s; do [ -n "$s" ] && echo "      line $s"; done < "$QUOTE_WARN"
fi
if [ "$n_missing_from_js" -eq 0 ] && [ "$n_missing_on_disk" -eq 0 ] && \
   [ "$n_bad_category" -eq 0 ] && [ "$n_no_caption" -eq 0 ]; then
  echo "  ✓ everything lines up."
fi

# ---- 2. lossless optimization --------------------------------------------
echo ""
echo "— Lossless optimize (JPEGs over $(mb "$THRESHOLD")) —"

if ! command -v jpegtran >/dev/null 2>&1; then
  echo "  · jpegtran not found — skipping. Install it with:  brew install mozjpeg"
else
  optimized=0
  saved=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    fp="$IMAGES_DIR/$f"
    before="$(fsize "$fp")"
    [ "$before" -le "$THRESHOLD" ] && continue

    tmp="$fp.opt-tmp"
    if ! jpegtran -optimize -progressive -copy all -outfile "$tmp" "$fp" 2>/dev/null; then
      echo "  ✗ $f: jpegtran failed"
      rm -f "$tmp"
      continue
    fi
    after="$(fsize "$tmp")"
    if [ "$after" -gt 0 ] && [ "$after" -lt "$before" ]; then
      mv "$tmp" "$fp"
      optimized=$((optimized + 1))
      saved=$((saved + before - after))
      pct="$(awk -v b="$before" -v a="$after" 'BEGIN { printf "%.1f", 100 * (b - a) / b }')"
      echo "  ✓ $f: $(mb "$before") -> $(mb "$after")  (-${pct}%)"
    else
      rm -f "$tmp"
      echo "  · $f: already optimal ($(mb "$before"))"
    fi
  done < "$ON_DISK_JPEG"

  if [ "$optimized" -gt 0 ]; then
    echo "  total: optimized $optimized file$([ "$optimized" -eq 1 ] && echo '' || echo s), saved $(mb "$saved")."
  else
    echo "  nothing over threshold needed optimizing."
  fi
fi

# ---- 3. photo-meta.js (pixel dimensions) ----------------------------------
# The site needs each photo's aspect ratio to lay out the coverflow. Reading it
# from a generated file means the page can draw the correct layout immediately,
# instead of downloading every image first just to measure it. Regenerated on
# every run, so it can't drift.
echo ""
echo "— photo-meta.js —"

META_LINES="$TMPDIR_WORK/meta_lines"
UNREADABLE="$TMPDIR_WORK/unreadable"
: > "$META_LINES"; : > "$UNREADABLE"

while IFS= read -r f; do
  [ -z "$f" ] && continue
  fp="$IMAGES_DIR/$f"
  # `sips -g` prints "  pixelWidth: 2048" / "  pixelHeight: 1365".
  dims="$(sips -g pixelWidth -g pixelHeight "$fp" 2>/dev/null)"
  w="$(printf '%s\n' "$dims" | sed -nE 's/.*pixelWidth:[[:space:]]*([0-9]+).*/\1/p')"
  h="$(printf '%s\n' "$dims" | sed -nE 's/.*pixelHeight:[[:space:]]*([0-9]+).*/\1/p')"
  if [ -n "$w" ] && [ -n "$h" ] && [ "$w" -gt 0 ] && [ "$h" -gt 0 ]; then
    printf '  "%s": { w: %s, h: %s },\n' "$f" "$w" "$h" >> "$META_LINES"
  else
    printf '%s\n' "$f" >> "$UNREADABLE"
  fi
done < "$ON_DISK_JPEG"

# ON_DISK_JPEG is already sorted, so META_LINES is sorted by filename.
{
  echo "/* AUTO-GENERATED by scripts/prep-photos.sh — do not edit by hand."
  echo "   Pixel dimensions of each photo, so the gallery can lay itself out"
  echo "   before any image has downloaded. Re-run the script after adding photos. */"
  echo "const PHOTO_META = {"
  cat "$META_LINES"
  echo "};"
} > "$PHOTO_META"

n_meta="$(grep -c . "$META_LINES" || true)"
echo "  ✓ wrote photo-meta.js ($n_meta photos)."
n_unreadable="$(grep -c . "$UNREADABLE" || true)"
if [ "$n_unreadable" -gt 0 ]; then
  echo "  ! could not read dimensions for $n_unreadable file(s):"
  while IFS= read -r f; do [ -n "$f" ] && echo "      $f"; done < "$UNREADABLE"
fi

# ---- 4. weight report -----------------------------------------------------
# Big files are the main thing that makes the site feel slow on a phone. The
# site only downloads the photos you can see, so this is about the few
# heavyweights, not the total. Re-export anything flagged here at quality ~80.
echo ""
echo "— Weight check —"

HEAVY_LIST="$TMPDIR_WORK/heavy"
: > "$HEAVY_LIST"
total=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  sz="$(fsize "$IMAGES_DIR/$f")"
  total=$((total + sz))
  if [ "$sz" -gt "$HEAVY" ]; then
    printf '%s\t%s\n' "$sz" "$f" >> "$HEAVY_LIST"
  fi
done < "$ON_DISK"

if [ "$DISK_COUNT" -gt 0 ]; then
  avg=$((total / DISK_COUNT))
else
  avg=0
fi
echo "  $DISK_COUNT photos, $(mb "$total") total, $(mb "$avg") average."

n_heavy="$(grep -c . "$HEAVY_LIST" || true)"
if [ "$n_heavy" -gt 0 ]; then
  echo "  ! $n_heavy file(s) over $(mb "$HEAVY") — consider re-exporting at quality ~80:"
  # Largest first.
  LC_ALL=C sort -rn "$HEAVY_LIST" | while IFS="$(printf '\t')" read -r sz f; do
    echo "      $f  $(mb "$sz")"
  done
else
  echo "  ✓ no outsized files."
fi

# ---- exit -----------------------------------------------------------------
if [ "$n_missing_from_js" -gt 0 ] || [ "$n_missing_on_disk" -gt 0 ] || \
   [ "$n_bad_category" -gt 0 ] || [ "$n_no_caption" -gt 0 ]; then
  echo ""
  echo "⚠  Some entries need your attention (see ! and TODO lines above)."
  exit 1
fi
exit 0
