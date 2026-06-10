/* ============================================================
   app.js  —  coverflow gallery + bead-on-a-wire category filter.
   (You normally won't need to edit this; edit photos.js instead.)
   ============================================================ */

const CATEGORIES = ["Everything", "People", "Places", "Critters"];
const SVGNS = "http://www.w3.org/2000/svg";

/* ---- tuning knobs for the coverflow look ---- */
const VISIBLE = 5;     // active photo + 4 shrinking ones to the right
const SHRINK  = 0.72;  // each step to the right is 72% the size of the previous
const STEP    = 0.62;  // how far the next card sits across the current one (overlap)

/* ---- state ---- */
let list = [];         // currently filtered photos (in display order)
let active = 0;        // index into `list` of the big photo
let cards = [];        // { el, img, photo } in the same order as `list`
const ar = {};         // aspect ratio (w/h) per filename, learned on preload

const coverflow = document.getElementById("coverflow");
const captionEl = document.getElementById("caption");
const countEl   = document.getElementById("count");

/* ============================================================
   1. Preload images to learn their aspect ratios, then start.
   ============================================================ */
function preloadThen(start) {
  let pending = PHOTOS.length;
  if (!pending) return start();
  PHOTOS.forEach((p) => {
    const im = new Image();
    im.onload = () => { ar[p.file] = im.naturalWidth / im.naturalHeight; done(); };
    im.onerror = () => { ar[p.file] = 1.5; done(); }; // sensible fallback
    im.src = "images/" + p.file;
    function done() { if (--pending === 0) start(); }
  });
}

/* ============================================================
   2. Coverflow
   ============================================================ */
function applyFilter(category) {
  list = category === "Everything"
    ? PHOTOS.slice()
    : PHOTOS.filter((p) => p.category === category);
  active = 0;
  buildCards();
  layout();
  updateInfo();
}

function buildCards() {
  coverflow.innerHTML = "";
  cards = [];
  list.forEach((p, i) => {
    const card = document.createElement("figure");
    card.className = "card";

    const img = document.createElement("img");
    img.src = "images/" + p.file;
    img.alt = p.caption || p.file;
    img.loading = "lazy";
    img.draggable = false;

    card.appendChild(img);
    card.addEventListener("click", () => {
      if (swipeHappened) return;            // a swipe shouldn't also promote a card
      if (i !== active) { active = i; layout(); updateInfo(); }
    });

    coverflow.appendChild(card);
    cards.push({ el: card, photo: p });
  });
}

function layout() {
  const n = list.length;
  if (!n) return;

  const W = coverflow.clientWidth;
  const H = coverflow.clientHeight;
  // --- responsive sizing -------------------------------------------------
  // Phones: one big photo + a small peek of the next. The hero is sized to
  // FILL the screen by its own orientation (landscape fills the width,
  // portrait fills the height), so it's large either way instead of being
  // shrunk to make room for a 5-up cascade.
  // Desktop: the full cascade, with the hero capped by width so it can't
  // balloon and crowd out the cascade on large screens.
  const mobile = W < 700;

  let activeH, slotW, margin, step, shrink, effVis;
  if (mobile) {
    const heroAspect = ar[list[active].file] || 1.5;
    activeH = Math.min(H * 0.92, (W * 0.86) / heroAspect);
    slotW   = activeH * heroAspect;          // the hero's own width
    margin  = W * 0.04;
    step    = 0.8;                            // push the follower mostly off-screen (a peek)
    shrink  = 0.7;
    effVis  = Math.min(2, n);                 // hero + one follower
  } else {
    activeH = Math.min(H * 0.86, W * 0.42);
    slotW   = activeH * 1.5;                  // uniform landscape-ish footprint
    margin  = Math.max(W * 0.04, 64);
    step    = STEP;
    shrink  = SHRINK;
    effVis  = Math.min(VISIBLE, n);
  }

  const slotX = [];
  const slotS = [];
  let cursor = margin;
  for (let k = 0; k < effVis; k++) {
    const s = Math.pow(shrink, k);
    slotX[k] = cursor;
    slotS[k] = s;
    cursor += slotW * s * step;
  }
  const parkRight = cursor;                   // where off-screen-right cards wait

  cards.forEach((c, i) => {
    let off = ((i - active) % n + n) % n;     // 0..n-1
    if (off > n / 2) off -= n;                // treat the far half as "behind, to the left"

    const aspect = ar[c.photo.file] || 1.5;
    const baseW = activeH * aspect;           // full-size width (scaled via transform)
    let x, s, opacity, z, interactive;

    if (off >= 0 && off < effVis) {           // visible cascade
      s = slotS[off];
      x = slotX[off] + (slotW * s - baseW * s) / 2;   // center image within its slot
      opacity = 1;
      z = 100 - off;
      interactive = true;
    } else if (off < 0) {                     // just exited — slide off to the left
      s = slotS[0];
      x = -baseW * 1.1;
      opacity = 0;
      z = 0;
      interactive = false;
    } else {                                  // waiting off-screen right — fades in
      s = slotS[effVis - 1];
      x = parkRight + (slotW * s - baseW * s) / 2;
      opacity = 0;
      z = 0;
      interactive = false;
    }

    const y = (H - activeH * s) / 2;          // vertically centered
    c.el.style.width = baseW + "px";
    c.el.style.height = activeH + "px";
    c.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    c.el.style.opacity = opacity;
    c.el.style.zIndex = z;
    c.el.style.pointerEvents = interactive ? "auto" : "none";
    c.el.classList.toggle("is-active", off === 0);
  });
}

function updateInfo() {
  const n = list.length;
  if (!n) { captionEl.textContent = ""; countEl.textContent = ""; return; }
  const p = list[active];
  if (p.caption) {
    captionEl.textContent = p.caption;
  } else {
    captionEl.innerHTML =
      `<span class="cap-hint">add a caption in photos.js &mdash; ${p.file}</span>`;
  }
  countEl.textContent = `${active + 1} / ${n}`;
}

function nextPhoto() { const n = list.length; if (n) { active = (active + 1) % n; layout(); updateInfo(); } }
function prevPhoto() { const n = list.length; if (n) { active = (active - 1 + n) % n; layout(); updateInfo(); } }

document.getElementById("next").addEventListener("click", nextPhoto);
document.getElementById("prev").addEventListener("click", prevPhoto);
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") nextPhoto();
  else if (e.key === "ArrowLeft") prevPhoto();
});
window.addEventListener("resize", layout);

/* ---- swipe to advance (touch / trackpad / mouse) ----
   Tier 1: detect a horizontal flick and step one photo, reusing the arrows'
   logic. We don't capture the pointer or preventDefault, so vertical page
   scrolling is untouched; the CSS `touch-action: pan-y` lets the browser keep
   vertical panning while we own horizontal gestures. */
const SWIPE_MIN = 45;            // px of horizontal travel before it counts as a swipe
let swipeHappened = false;       // set on a real swipe so the card click is ignored
let swipeStartX = 0, swipeStartY = 0, swiping = false;

coverflow.addEventListener("pointerdown", (e) => {
  if (!e.isPrimary) return;      // ignore second finger (pinch, etc.)
  swiping = true;
  swipeHappened = false;
  swipeStartX = e.clientX;
  swipeStartY = e.clientY;
});

function endSwipe(e) {
  if (!swiping) return;
  swiping = false;
  const dx = e.clientX - swipeStartX;
  const dy = e.clientY - swipeStartY;
  if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
    swipeHappened = true;        // horizontal, far enough -> it's a swipe
    if (dx < 0) nextPhoto();     // swipe left -> next
    else prevPhoto();            // swipe right -> previous
  }
}

window.addEventListener("pointerup", endSwipe);
window.addEventListener("pointercancel", () => { swiping = false; });

/* ============================================================
   3. Bead-on-a-wire category filter
   ============================================================ */
const svg     = document.getElementById("wire");
const path    = document.getElementById("wirePath");
const bead     = document.getElementById("bead");
const stopsG  = document.getElementById("stops");

const STOP_FRACS = [0.07, 0.37, 0.64, 0.93]; // where the 4 labels sit along the wire
let total = 0;       // wire length
let stops = [];      // { len, x, y, cat, dot, label }
let beadLen = 0;     // current bead position along the wire
let dragging = false;

function buildStops() {
  total = path.getTotalLength();
  STOP_FRACS.forEach((f, idx) => {
    const len = total * f;
    const pt = path.getPointAtLength(len);

    const dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("class", "wire-stop");
    dot.setAttribute("r", 5);
    dot.setAttribute("cx", pt.x);
    dot.setAttribute("cy", pt.y);

    const label = document.createElementNS(SVGNS, "text");
    label.setAttribute("class", "wire-label");
    label.setAttribute("x", pt.x);
    label.setAttribute("y", Math.max(15, pt.y - 22)); // sit above the wire
    label.setAttribute("text-anchor", "middle");
    label.textContent = CATEGORIES[idx];

    const go = () => selectStop(idx, true);
    dot.addEventListener("click", go);
    label.addEventListener("click", go);

    stopsG.appendChild(dot);
    stopsG.appendChild(label);
    stops.push({ len, x: pt.x, y: pt.y, cat: CATEGORIES[idx], dot, label });
  });
}

function setBeadAt(len) {
  beadLen = len;
  const p = path.getPointAtLength(len);
  bead.setAttribute("cx", p.x);
  bead.setAttribute("cy", p.y);
}

function highlight(idx) {
  stops.forEach((s, i) => {
    const on = i === idx;
    s.dot.classList.toggle("is-active", on);
    s.label.classList.toggle("is-active", on);
  });
  bead.setAttribute("aria-valuetext", stops[idx].cat);
}

function nearestStop(len) {
  let best = 0, bd = Infinity;
  stops.forEach((s, i) => { const d = Math.abs(s.len - len); if (d < bd) { bd = d; best = i; } });
  return best;
}

function selectStop(idx, animate) {
  highlight(idx);
  if (animate) animateBeadTo(stops[idx].len);
  else setBeadAt(stops[idx].len);
  applyFilter(stops[idx].cat);
}

function animateBeadTo(target) {
  const start = beadLen;
  const t0 = performance.now();
  const dur = 380;
  function frame(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);  // ease-out
    setBeadAt(start + (target - start) * e);
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* convert a pointer event to SVG user coordinates */
function toSvg(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/* find the point on the wire closest to (x, y) */
function closestLen(x, y) {
  let best = 0, bd = Infinity;
  const N = 280;
  for (let i = 0; i <= N; i++) {
    const l = (total * i) / N;
    const p = path.getPointAtLength(l);
    const dx = p.x - x, dy = p.y - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

bead.addEventListener("pointerdown", (e) => {
  dragging = true;
  bead.classList.add("grabbing");
  bead.setPointerCapture(e.pointerId);
  e.preventDefault();
});
svg.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const m = toSvg(e);
  setBeadAt(closestLen(m.x, m.y));
  highlight(nearestStop(beadLen));   // live preview of which label it'll land on
});
window.addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;
  bead.classList.remove("grabbing");
  selectStop(nearestStop(beadLen), true);   // snap to the nearest label + filter
});

/* keyboard support on the bead */
bead.addEventListener("keydown", (e) => {
  const cur = nearestStop(beadLen);
  if (e.key === "ArrowRight" || e.key === "ArrowUp") { selectStop(Math.min(stops.length - 1, cur + 1), true); e.preventDefault(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { selectStop(Math.max(0, cur - 1), true); e.preventDefault(); }
});

/* ============================================================
   4. Go
   ============================================================ */
preloadThen(() => {
  buildStops();
  // Allow a category via the URL hash, e.g. #People (handy for sharing/linking).
  const fromHash = CATEGORIES.find(
    (c) => c.toLowerCase() === decodeURIComponent(location.hash.slice(1)).toLowerCase()
  );
  const startIdx = fromHash ? CATEGORIES.indexOf(fromHash) : 0;
  highlight(startIdx);
  setBeadAt(stops[startIdx].len);
  applyFilter(CATEGORIES[startIdx]);
});
