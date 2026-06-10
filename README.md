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
| `images/`     | The photographs |
| `CNAME`       | Custom domain for GitHub Pages (`photos.sturman.org`) |
| `.nojekyll`   | Tells GitHub Pages to serve files as-is (no Jekyll build) |

## Editing the gallery

Everything you'd normally change lives in `photos.js`:

- **Order** — photos appear in the order listed; move a line to reorder.
- **`caption`** — the text shown under each photo.
- **`category`** — one of `"People"`, `"Places"`, `"Critters"` (the
  *Everything* filter shows them all).

Drop new images into `images/` and add a matching line in `photos.js`.

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
