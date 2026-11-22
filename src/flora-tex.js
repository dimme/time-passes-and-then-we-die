// Foliage, trunk and rock textures, painted once on canvases; and the swaying alpha-tested leaf material.
import * as THREE from 'three';
import { rng } from './util.js?v=ef07112a';
import { canvasTex, tileNoise } from './textures.js?v=ef07112a';

export const windTime = { value: 0 };
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const sheet = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.lineCap = g.lineJoin = 'round'; return g; };
/** Draw into one cell of an atlas, clipped a little inside it, with the origin at its corner. */
function cell(g, x, y, w, h, draw) { g.save(); g.beginPath(); g.rect(x + 2, y + 2, w - 4, h - 4); g.clip(); g.translate(x, y); draw(w, h); g.restore(); }
const line = (g, x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };

/**
 * Cut-out texture from a canvas. Colour is bled into the transparent texels and every mip level is rescaled to keep
 * (most of) the coverage of the full image, so foliage gets no dark fringes and thins out less with distance.
 */
function cutoutTex(g, thr = 0.4) {
  let w = g.canvas.width, h = g.canvas.height; const src = g.getImageData(0, 0, w, h).data, mean = [0, 0, 0];
  let d = new Uint8Array(w * h * 4), cnt = 0;
  for (let i = 0; i < src.length; i += 4) if (src[i + 3] > 200) { mean[0] += src[i]; mean[1] += src[i + 1]; mean[2] += src[i + 2]; cnt++; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, o = ((h - 1 - y) * w + x) * 4, a = src[i + 3];
    for (let k = 0; k < 3; k++) d[o + k] = a > 8 ? src[i + k] : mean[k] / (cnt || 1);
    d[o + 3] = a;
  }
  const cover = (m, s) => { let k = 0; for (let i = 3; i < m.length; i += 4) if (m[i] * s > thr * 255) k++; return k / (m.length / 4); };
  const mips = [{ data: d, width: w, height: h }], want = cover(d, 1) * 0.85;
  while (w > 1 || h > 1) {
    const W2 = Math.max(1, w >> 1), H2 = Math.max(1, h >> 1), m = new Uint8Array(W2 * H2 * 4);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const acc = [0, 0, 0, 0]; let wt = 0;
      for (let j = 0; j < 4; j++) {
        const i = (Math.min(h - 1, y * 2 + (j >> 1)) * w + Math.min(w - 1, x * 2 + (j & 1))) * 4, a = d[i + 3] + 1;
        acc[0] += d[i] * a; acc[1] += d[i + 1] * a; acc[2] += d[i + 2] * a; acc[3] += d[i + 3]; wt += a;
      }
      const o = (y * W2 + x) * 4; m[o] = acc[0] / wt; m[o + 1] = acc[1] / wt; m[o + 2] = acc[2] / wt; m[o + 3] = acc[3] / 4;
    }
    let lo = 0.5, hi = Math.min(1.7, 1 + 0.12 * mips.length); for (let it = 0; it < 12; it++) { const s = (lo + hi) / 2; if (cover(m, s) < want) lo = s; else hi = s; }   // capped, or edge-on cards turn into solid slabs
    const out = m.slice(); for (let i = 3; i < out.length; i += 4) out[i] = Math.min(255, out[i] * hi);
    d = m; w = W2; h = H2; mips.push({ data: out, width: w, height: h });
  }
  const t = new THREE.DataTexture(mips[0].data, mips[0].width, mips[0].height, THREE.RGBAFormat);
  t.mipmaps = mips; t.generateMipmaps = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

// ---------- broadleaf sprays ----------
// half-outlines of a leaf, [distance along the midrib, half-width]
const LEAF = {
  oak: [[0, 0.1], [0.14, 0.4], [0.24, 0.8], [0.32, 0.45], [0.45, 1], [0.54, 0.55], [0.66, 0.9], [0.75, 0.45], [0.86, 0.6], [1, 0]],
  tulip: [[0, 0.1], [0.08, 0.75], [0.3, 1], [0.44, 0.7], [0.58, 0.95], [0.86, 0.62], [0.8, 0]],
  elm: [[0, 0], [0.12, 0.6], [0.38, 1], [0.7, 0.7], [1, 0]],
};
function leaf(g, prof, x, y, a, len, wid, fill, rib) {
  g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0);
  for (const [t, w] of prof) g.lineTo(t * len, -w * wid);
  for (let i = prof.length - 1; i >= 0; i--) g.lineTo(prof[i][0] * len, prof[i][1] * wid);
  g.closePath(); g.fillStyle = fill; g.fill();
  line(g, 0, 0, len * 0.9, 0, rib, 0.8); g.restore();
}
/** A leafy branchlet growing up from the bottom centre of a cell: twigs first, then shaded leaves, then sunlit ones. */
function spray(g, r, W, H, S) {
  const leaves = [];
  const twig = (x, y, a, len, d) => {
    a += (r() - 0.5) * 0.5; const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    line(g, x, y, ex, ey, hsl(28, 22, 14 + r() * 8), 1 + d * 1.1);
    for (let t = d === 3 ? 0.3 : 0.12, side = r() < 0.5 ? 1 : -1; t < 1; t += S.step / len, side = -side) leaves.push([x + (ex - x) * t, y + (ey - y) * t, a + side * (0.6 + r() * 0.7)]);
    leaves.push([ex, ey, a + (r() - 0.5) * 0.6]);
    if (!d) return;
    twig(ex, ey, a + (r() - 0.5) * 0.5, len * 0.7, d - 1);
    const n = 2 + ((r() * 2) | 0);
    for (let k = 0, side = r() < 0.5 ? 1 : -1; k < n; k++, side = -side) { const t = 0.3 + (0.65 * (k + r())) / n; twig(x + (ex - x) * t, y + (ey - y) * t, a + side * (0.55 + r() * 0.5), len * (0.78 - t * 0.3) * (0.7 + r() * 0.5), d - 1); }
  };
  twig(W / 2, H - 4, -Math.PI / 2 + (r() - 0.5) * 0.3, H * 0.29, 3);
  for (let i = leaves.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [leaves[i], leaves[j]] = [leaves[j], leaves[i]]; }
  leaves.forEach(([x, y, a], i) => {
    const deep = i < leaves.length * 0.4, l = deep ? 14 + r() * 8 : 24 + r() * 12 + (r() < 0.15 ? 5 : 0), len = S.len * (0.7 + r() * 0.5);
    leaf(g, S.prof, x, y, a, len, len * S.wide, hsl(S.hue + r() * S.dh, S.sat - 5 + r() * 12 - (deep ? 6 : 0), l), hsl(S.hue - 10, 30, l + 9, 0.7));
  });
}
function broadTex(seed, S) {
  const g = sheet(512, 512), r = rng(seed);
  for (let i = 0; i < 4; i++) cell(g, (i & 1) * 256, (i >> 1) * 256, 256, 256, (W, H) => spray(g, r, W, H, S));
  return cutoutTex(g);
}

// ---------- conifer boughs, each growing left → right along a 512 × 256 cell ----------
function pineBough(g, r, W, H) {
  const shoot = (x, y, a, len, d) => {
    a += (r() - 0.5) * 0.25; const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    line(g, x, y, ex, ey, hsl(25, 25, 17), 1.5 + d * 2);
    if (d) for (let k = 0, side = r() < 0.5 ? 1 : -1, n = d === 2 ? 13 : 3; k < n; k++, side = -side) {
      const t = 0.12 + (0.8 * (k + r() * 0.7)) / n; shoot(x + (ex - x) * t, y + (ey - y) * t, a + side * (0.45 + r() * 0.35), len * (d === 2 ? 0.34 - t * 0.14 : 0.4) * (0.7 + r() * 0.6), d - 1);
    }
    // tufts of long soft needles, thickest towards the shoot's end
    for (let k = 0, n = Math.max(2, (len / 13) | 0); k <= n; k++) {
      const t = d === 2 ? 0.45 + 0.55 * (k / n) : k / n, px = x + (ex - x) * t, py = y + (ey - y) * t;
      for (let i = 0; i < 15; i++) { const b = a + (r() - 0.5) * 2.4, l = 12 + r() * 12; line(g, px, py, px + Math.cos(b) * l, py + Math.sin(b) * l, hsl(78 + r() * 30, 18 + r() * 16, 15 + r() * 26), 1 + r() * 1); }
    }
  };
  shoot(3, H / 2, 0, W * 0.8, 2);
}
function spruceBough(g, r, W, H) {
  const brush = (x, y, a, len) => {   // a twig bristling with short needles
    for (let s = 0; s < len; s += 2) { const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s; for (const e of [-1, 1]) { const b = a + e * (0.6 + r() * 0.7), l = 4 + r() * 5; line(g, px, py, px + Math.cos(b) * l, py + Math.sin(b) * l, hsl(88 + r() * 34, 18 + r() * 14, 13 + r() * 22), 1.6); } }
    line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, hsl(28, 22, 15), 1.2);
  };
  for (let x = 14, side = 1; x < W - 34; x += 9 + r() * 6, side = -side) {
    const t = x / W, len = H * 0.47 * Math.min(1, 0.5 + t * 3) * (1.04 - t) ** 0.6 * (0.7 + r() * 0.4), a = side * (0.75 + r() * 0.35);
    brush(x, H / 2, a, len);
    for (let k = 0; k < 3; k++) { const s = len * (0.25 + 0.22 * k + r() * 0.1); brush(x + Math.cos(a) * s, H / 2 + Math.sin(a) * s, a - side * (0.5 + r() * 0.4) * (k & 1 ? -1 : 1), len * 0.32); }
  }
  brush(3, H / 2, 0, W - 22);
}
/** Araucaria: rope-like shoots armoured with overlapping scale leaves. */
function araucariaBough(g, r, W, H) {
  const rope = (x, y, a, len, wid, bend) => {
    g.save(); g.translate(x, y); g.rotate(a);
    for (let s = 0; s < len; s += wid * 0.3) {
      const k = wid * (s > len - wid * 2 ? Math.max(0.25, (len - s) / (wid * 2)) : 1); g.rotate((bend * wid * 0.3) / len);
      for (let j = -1; j <= 1; j++) {
        g.fillStyle = hsl(86 + r() * 26, 26 + r() * 14, 16 + r() * 13 + j * 4);
        g.beginPath(); g.moveTo(0, j * k * 0.36 - k * 0.3); g.lineTo(k * 0.85, j * k * 0.42); g.lineTo(0, j * k * 0.36 + k * 0.3); g.fill();
      }
      g.translate(wid * 0.3, 0);
    }
    g.restore();
  };
  for (let x = 46, side = 1; x < W - 70; x += 22 + r() * 10, side = -side) { const t = x / W; rope(x, H / 2, side * (0.95 + r() * 0.2), H * 0.5 * (1 - t * 0.55) * (0.75 + r() * 0.3), 10, -side * 0.5); }
  rope(2, H / 2, 0, W - 10, 16, 0);
}
function coniferTex() {
  const g = sheet(1024, 512), r = rng(7);
  [pineBough, pineBough, spruceBough, araucariaBough].forEach((f, i) => cell(g, (i & 1) * 512, (i >> 1) * 256, 512, 256, (W, H) => f(g, r, W, H)));
  return cutoutTex(g);
}

// ---------- fronds: four 1024 × 256 strips (cycad, palm, tree fern, fiddlehead) ----------
/** Pinnate frond: tapering leaflets either side of a rachis. */
function pinnate(g, r, W, H, P) {
  const mid = H / 2;
  for (let x = W * 0.05; x < W - 16; x += P.step * (0.85 + r() * 0.3)) {
    const t = x / W, len = H * 0.47 * P.prof(t) * (0.9 + r() * 0.15);
    for (const e of [-1, 1]) {
      if (r() < P.gaps) continue;
      const a = e * (P.ang - t * 0.25 + (r() - 0.5) * P.wild), ca = Math.cos(a), sa = Math.sin(a), tx = x + ca * len + Math.abs(sa) * len * P.sweep, ty = mid + sa * len, l = P.lit[0] + r() * (P.lit[1] - P.lit[0]);
      g.fillStyle = hsl(P.hue + r() * 18, P.sat + r() * 10, l);
      g.beginPath(); g.moveTo(x - P.wid / 2, mid); g.quadraticCurveTo(x + ca * len * 0.5 - P.wid * 0.6, mid + sa * len * 0.55, tx, ty); g.quadraticCurveTo(x + ca * len * 0.5 + P.wid * 0.8, mid + sa * len * 0.5, x + P.wid / 2, mid); g.fill();
      g.strokeStyle = hsl(P.hue - 12, P.sat, l + 12, 0.55); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, mid); g.quadraticCurveTo(x + ca * len * 0.5, mid + sa * len * 0.52, tx, ty); g.stroke();
    }
  }
  g.fillStyle = P.rachis; g.beginPath(); g.moveTo(0, mid - 5); g.lineTo(W - 12, mid - 1); g.lineTo(W - 12, mid + 1); g.lineTo(0, mid + 5); g.fill();
}
/** Twice-divided fern frond: pinnae, each a small feather of pinnules. */
function fernFrond(g, r, W, H) {
  const mid = H / 2;
  for (let x = W * 0.09, side = 1; x < W - 10; side = -side) {
    const t = x / W, len = H * 0.48 * Math.sin(Math.PI * Math.min(1, 0.22 + t * 0.8)) ** 0.8 * (0.9 + r() * 0.15), a = side * (1.3 - t * 0.45 + (r() - 0.5) * 0.12), ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 3; s < len; s += 4.4) {
      const k = Math.sin(Math.PI * Math.min(1, 0.2 + (s / len) * 0.8)) ** 0.7, pl = 4 + 13 * k * (0.5 + 0.5 * (len / (H * 0.48))), px = x + ca * s, py = mid + sa * s;
      for (const e of [-1, 1]) { const b = a + e * 1.05; line(g, px, py, px + Math.cos(b) * pl, py + Math.sin(b) * pl, hsl(84 + r() * 22, 34 + r() * 14, 19 + r() * 24), 1.9); }
    }
    line(g, x, mid, x + ca * len, mid + sa * len, hsl(70, 30, 30), 1.2);
    x += (27 - t * 11) * (side < 0 ? 1 : 0.15);
  }
  g.fillStyle = hsl(32, 35, 20); g.beginPath(); g.moveTo(0, mid - 4); g.lineTo(W - 6, mid - 0.8); g.lineTo(W - 6, mid + 0.8); g.lineTo(0, mid + 4); g.fill();
}
/** A young fern frond still coiled: a scaly crozier. */
function fiddlehead(g, r, W, H) {
  const pts = [[W / 2 + 46, H - 2], [W / 2 + 46, H * 0.45]], c = [W / 2, H * 0.45];
  for (let th = 0; th < 10.5; th += 0.25) { const R = 46 * (1 - th / 11.5); pts.push([c[0] + Math.cos(th) * R, c[1] - Math.sin(th) * R]); }
  for (let i = 1; i < pts.length; i++) {
    const k = i / pts.length;
    line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], hsl(48 + k * 40, 30, 20 + k * 12), 15 - k * 9);
    for (let j = 0; j < 3; j++) { const b = r() * 6.28; line(g, pts[i][0], pts[i][1], pts[i][0] + Math.cos(b) * 9, pts[i][1] + Math.sin(b) * 9, hsl(28, 40, 22 + r() * 14), 1); }
  }
}
function frondTex() {
  const g = sheet(1024, 1024), r = rng(4);
  const soft = (t) => Math.min(1, 0.25 + t * 5) * Math.min(1, 0.2 + (1 - t) * 2.6);
  cell(g, 0, 0, 1024, 256, (W, H) => pinnate(g, r, W, H, { step: 7, prof: soft, ang: 1.15, wild: 0.06, sweep: 0.12, wid: 6, gaps: 0, hue: 84, sat: 34, lit: [16, 30], rachis: hsl(62, 32, 30) }));
  cell(g, 0, 256, 1024, 256, (W, H) => pinnate(g, r, W, H, { step: 9, prof: (t) => Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)) ** 0.5, ang: 0.95, wild: 0.3, sweep: 0.3, wid: 7, gaps: 0.06, hue: 78, sat: 30, lit: [19, 35], rachis: hsl(58, 35, 34) }));
  cell(g, 0, 512, 1024, 256, (W, H) => fernFrond(g, r, W, H));
  cell(g, 0, 768, 256, 256, (W, H) => fiddlehead(g, r, W, H));
  return cutoutTex(g);
}

// ---------- ground cover: eight 256 × 256 tufts ----------
function blades(g, r, W, H, n, h0, h1, lit, heads = 0) {
  for (let i = 0; i < n; i++) {
    const x = W / 2 + (r() + r() - 1) * W * 0.44, rx = W / 2 + (x - W / 2) * 0.55, h = H * (h0 + r() * (h1 - h0)), lean = (r() - 0.5) * H * 0.4, hue = 66 + r() * 34, l = lit * (0.75 + r() * 0.5);
    const gr = g.createLinearGradient(0, H, 0, H - h); gr.addColorStop(0, hsl(hue, 30, l * 0.75)); gr.addColorStop(1, hsl(hue, 24 + r() * 14, l));
    g.strokeStyle = gr; g.lineWidth = 1.4 + r() * 2.2; g.beginPath(); g.moveTo(rx, H); g.quadraticCurveTo(x + lean * 0.2, H - h * 0.6, x + lean, H - h); g.stroke();
    if (r() < heads) { g.save(); g.translate(x + lean, H - h); g.rotate(Math.atan2(-h * 0.4, lean * 0.8) + Math.PI / 2); g.fillStyle = hsl(36 + r() * 10, 34, 46 + r() * 16); g.beginPath(); g.ellipse(0, -5, 1.8, 7, 0, 0, 6.3); g.fill(); g.restore(); }
  }
}
function flowers(g, r, W, H, n, hue, sat, lum, size) {
  for (let i = 0; i < n; i++) {
    const x = W * (0.15 + r() * 0.7), y = H * (0.25 + r() * 0.45);
    line(g, W / 2 + (x - W / 2) * 0.5, H, x, y, hsl(80, 30, 28), 1.6);
    g.fillStyle = hsl(hue + r() * 14, sat, lum + r() * 10); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.05) * size, y + Math.sin(k * 1.05) * size, size * 0.75, 0, 6.3); g.fill(); }
    g.fillStyle = hsl(44, 85, 52); g.beginPath(); g.arc(x, y, size * 0.6, 0, 6.3); g.fill();
  }
}
function fernClump(g, r, W, H, n, reach) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i + r()) / n - 0.5) * 2.5, L = H * reach * (0.7 + r() * 0.4), bend = (a + Math.PI / 2) * 0.5; let x = W / 2, y = H, d = a;
    for (let s = 0; s < L; s += 4) {
      const k = Math.sin(Math.PI * Math.min(1, 0.15 + (s / L) * 0.85)), pl = 2 + 11 * k; d += (bend * 4) / L; x += Math.cos(d) * 4; y += Math.sin(d) * 4;
      for (const e of [-1, 1]) line(g, x, y, x + Math.cos(d + e * 1.2) * pl, y + Math.sin(d + e * 1.2) * pl, hsl(84 + r() * 24, 28 + r() * 12, 44 + r() * 30), 1.5);
    }
  }
}
function horsetails(g, r, W, H) {
  for (let i = 0; i < 9; i++) {
    const x = W * (0.12 + r() * 0.76), h = H * (0.4 + r() * 0.55), lean = (r() - 0.5) * 0.25;
    for (let s = 12; s < h; s += 13) {
      const px = x + lean * s, py = H - s, bl = 26 * (1 - s / h) + 5;
      for (const e of [-1, 1]) for (let k = 0; k < 3; k++) { const b = -Math.PI / 2 + e * (0.7 + k * 0.3); line(g, px, py, px + Math.cos(b) * bl, py + Math.sin(b) * bl, hsl(96 + r() * 20, 26, 44 + r() * 20), 1.1); }
    }
    line(g, x, H, x + lean * h, H - h, hsl(92, 28, 48), 3);
  }
}
function coverTex() {
  const g = sheet(2048, 256), r = rng(31);
  [
    (W, H) => blades(g, r, W, H, 70, 0.45, 0.97, 78, 0.35),
    (W, H) => blades(g, r, W, H, 100, 0.2, 0.55, 76),
    (W, H) => blades(g, r, W, H, 110, 0.15, 0.42, 70),
    (W, H) => { blades(g, r, W, H, 70, 0.25, 0.7, 76, 0.1); flowers(g, r, W, H, 5, 48, 85, 55, 5); flowers(g, r, W, H, 4, 300, 55, 86, 4.5); },
    (W, H) => { fernClump(g, r, W, H, 5, 0.5); blades(g, r, W, H, 40, 0.2, 0.6, 72); flowers(g, r, W, H, 5, 268, 45, 58, 4); },
    (W, H) => fernClump(g, r, W, H, 7, 0.85),
    (W, H) => { horsetails(g, r, W, H); fernClump(g, r, W, H, 4, 0.4); },
    (W, H) => fernClump(g, r, W, H, 9, 0.55),
  ].forEach((f, i) => cell(g, i * 256, 0, 256, 256, f));
  return cutoutTex(g);
}

// ---------- trunks and rock ----------
/** Trunk armoured with the diamond scars of fallen leaf bases (cycads, tree ferns). */
function armourTex() {
  const g = sheet(256, 256), r = rng(9); g.fillStyle = '#2c231b'; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j <= 16; j++) for (let i = 0; i <= 8; i++) {
    const x = (i + (j & 1) / 2) * 32, y = j * 16, l = 24 + r() * 16;
    g.fillStyle = hsl(26 + r() * 10, 22, l); g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x, y - 10); g.lineTo(x + 14, y); g.lineTo(x, y + 10); g.fill();
    g.fillStyle = hsl(30, 20, l + 12); g.beginPath(); g.moveTo(x - 9, y - 1); g.lineTo(x, y - 8); g.lineTo(x + 9, y - 1); g.fill();
  }
  return canvasTex(g.canvas);
}
/** Palm stem: fibrous, ringed with old leaf scars. */
function palmTex() {
  const g = sheet(128, 256), r = rng(10); g.fillStyle = '#8d8272'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 500; i++) { const x = r() * 128, y = r() * 256; line(g, x, y, x + (r() - 0.5) * 3, y + 8 + r() * 22, hsl(32, 12, 36 + r() * 30, 0.5), 1); }
  for (let y = 0; y < 256; y += 16) { line(g, 0, y + 2, 128, y + 2, 'rgba(40,32,24,0.55)', 2.5); line(g, 0, y + 5, 128, y + 5, 'rgba(225,215,195,0.3)', 2); }
  return canvasTex(g.canvas);
}
/** Weathered rock: speckled grain, cracks, pale and rusty lichen. Tileable. */
function rockTex() {
  const S = 512, g = sheet(S, S), r = rng(77), n = tileNoise(S, 4, 6, 41), img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const v = 105 + n[i] * 95 + (r() < 0.08 ? -34 : r() * 14); img.data.set([v, v * 0.97, v * 0.92, 255], i * 4); }
  g.putImageData(img, 0, 0);
  const wrap = (f) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); f(); g.restore(); } };
  for (let i = 0; i < 16; i++) {
    const pts = [[r() * S, r() * S]]; let a = r() * 6.28;
    for (let k = 0; k < 22; k++) { a += (r() - 0.5) * 0.9; const p = pts[k]; pts.push([p[0] + Math.cos(a) * 14, p[1] + Math.sin(a) * 14]); }
    const w = 0.8 + r() * 1.6;
    wrap(() => { g.strokeStyle = 'rgba(30,28,26,0.6)'; g.lineWidth = w; g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); });
  }
  for (let i = 0; i < 46; i++) {
    const x = r() * S, y = r() * S, rust = r() < 0.12, blobs = []; for (let k = 0; k < 10; k++) blobs.push([(r() - 0.5) * 34, (r() - 0.5) * 34, 4 + r() * 10]);
    wrap(() => { g.fillStyle = rust ? 'rgba(170,132,70,0.2)' : `rgba(${188 + r() * 30},${196 + r() * 24},${160 + r() * 24},0.24)`; for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(x + bx, y + by, br, 0, 6.3); g.fill(); } });
  }
  return canvasTex(g.canvas);
}

/**
 * Swaying alpha-tested foliage. Options: sway; fadeR (shrink instances away towards this distance from the camera);
 * cells (the map is an atlas of this many columns, picked per instance by the `aCell` attribute);
 * ownColour (reddish, tan and lilac texels — flowers, seed heads — keep their colour instead of taking the tint).
 */
export function leafMat(map, { sway = 0.012, fadeR = 0, cells = 0, ownColour = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1, metalness: 0, vertexColors: true });
  m.alphaToCoverage = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windTime;
    sh.vertexShader = `uniform float uTime;\n${cells ? 'attribute float aCell;\n' : ''}` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.17;
      #else
        float ph = 0.0;
      #endif
      float sw = (sin(uTime * 1.3 + ph + position.y * 0.3) + 0.5 * sin(uTime * 2.9 + ph * 1.7 + position.x)) * ${sway.toFixed(4)} * position.y;
      transformed.x += sw; transformed.z += sw * 0.6;
      ${fadeR ? `#ifdef USE_INSTANCING
        transformed *= 1.0 - smoothstep(${(fadeR * 0.55).toFixed(1)}, ${(fadeR * 0.95).toFixed(1)}, distance(cameraPosition.xz, (modelMatrix * instanceMatrix[3]).xz));
      #endif` : ''}`);
    if (cells) sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n vMapUv.x = (vMapUv.x + aCell) / ${cells.toFixed(1)};`);
    // foliage carries soft "volume" normals; do not flip them on back faces
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
    // leaves are translucent, so light wraps round to faces turned from the sun; and matt, because a leaf seen
    // from behind keeps its outward normal, which would make the specular term flare white
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace('saturate( dot( geometryNormal, directLight.direction ) )', 'saturate( dot( geometryNormal, directLight.direction ) * 0.7 + 0.3 )'))
      .replace('totalDiffuse + totalSpecular + totalEmissiveRadiance', 'totalDiffuse');
    if (ownColour) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb = mix(diffuseColor.rgb, sampledDiffuseColor.rgb, smoothstep(0.02, 0.1, max(sampledDiffuseColor.r, sampledDiffuseColor.b) - sampledDiffuseColor.g));`);
  };
  return m;
}

/** All plant textures, built once. */
let _tex;
export function floraTextures() {
  return _tex ||= {
    oak: broadTex(1, { prof: LEAF.oak, len: 20, wide: 0.27, step: 13, hue: 74, dh: 24, sat: 32 }),
    tulip: broadTex(2, { prof: LEAF.tulip, len: 18, wide: 0.42, step: 15, hue: 72, dh: 22, sat: 36 }),
    elm: broadTex(3, { prof: LEAF.elm, len: 13, wide: 0.3, step: 8.5, hue: 78, dh: 24, sat: 32 }),
    conifer: coniferTex(), frond: frondTex(), cover: coverTex(), armour: armourTex(), palm: palmTex(), rock: rockTex(),
  };
}
