# photos.sturman.org

Daniel Sturman's photography portfolio — a static site (plain HTML/CSS/JS, no
build step) hosted on GitHub Pages.

## Files

| File | What it is |
|------|------------|
| `index.html`  | Page structure |
| `styles.css`  | All styling |
| `app.js`      | Coverflow gallery + the bead-on-a-wire category filter |
| `photos.js`   | **The control file** — photo order, captions, and categories |
| `photo-meta.js` | *Generated* — each photo's pixel dimensions, so the gallery can lay out before any image downloads. Don't hand-edit; run the prep script |
| `images/`     | The photographs |
| `CNAME`       | Custom domain for GitHub Pages (`photos.sturman.org`) |
| `.nojekyll`   | Tells GitHub Pages to serve files as-is (no Jekyll build) |

## Editing the gallery

Everything you'd normally change lives in `photos.js`:

- **Order** — photos appear in the order listed; move a line to reorder.
- **`caption`** — the text shown under each photo.
- **`category`** — one of `"People"`, `"Places"`, `"Critters"` (the
  *Everything* filter shows them all).

Drop new images into `images/`, then run:

```sh
node scripts/prep-photos.js
```

It adds a skeleton line to `photos.js` for each new photo (you fill in the
category + caption), flags anything inconsistent, regenerates `photo-meta.js`,
and losslessly optimizes any oversized JPEGs. **Run it after adding photos** —
otherwise `photo-meta.js` is stale and the new photos briefly lay out at the
wrong aspect ratio before they load.

## Viewing photos

- **Click** a photo in the cascade to bring it forward; **swipe** or use the
  arrows / arrow keys to move through the gallery.
- **Double-click** (or **long-press** on a phone/iPad) to expand a photo full
  screen. Click anywhere, or press *Esc*, to close.

## Speed

The gallery only downloads the photos you can actually see — the active one plus
a few either side — and the rest arrive as you move through it. `photo-meta.js`
lets the page draw the correct layout before any photo has loaded.

## Editing the artist statement

The statement is in **`artist-statement.md`** and is loaded into the page at
runtime — edit that file (plain Markdown: blank line between paragraphs,
`*italic*`, `**bold**`, `# heading`). No need to touch `index.html`.

## Image export

Export photos for the web at a **fixed long edge of ~2048 px** (not a
percentage), **sRGB**, JPEG quality ~80. This keeps files small (~0.5 MB) and
the gallery fast.

## Local preview

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Hosted on GitHub Pages from the `main` branch. Pushing to `main` publishes the
site. The custom domain is configured via the `CNAME` file plus a DNS record
for `photos.sturman.org`.
