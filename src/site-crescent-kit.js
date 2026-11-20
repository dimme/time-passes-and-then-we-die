// Building blocks shared by the first farming village (site-crescent.js) and the first city (site-sumer.js):
// procedural textures for mud brick, plaster, rubble, reed and tilled earth, a small geometry builder that
// collects everything of one material into one mesh, standing crops, and things to bump into.
import * as THREE from 'three';
import { rng } from './util.js';
import { canvasTex, normalMap, shared } from './textures.js';
import { leafMat } from './flora-tex.js';
import { Builder } from './flora-geo.js';
import { makeKinds } from './flora.js';

export const lin = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((v) => v ** 2.2);
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const W = [1, 1, 1];

// ---------------------------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------------------------
/** A colour canvas and a height canvas drawn together; returns { map, normalMap }. */
function pair(S, base, strength, draw) {
  const mk = (fill) => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, S, S); return [c, g]; };
  const [cc, col] = mk(base), [hc, hgt] = mk('#808080');
  draw(col, hgt, S);
  const hd = hgt.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = hd[i * 4] / 255;
  return { map: canvasTex(cc), normalMap: normalMap(h, S, strength) };
}
const grey = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
/** Soft light and dark patches, wrapped at the edges. */
function mottle(g, S, r, n, rad, amt) {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, R = rad * (0.5 + r()), a = (r() - 0.5) * amt;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      if (x + ox < -R || x + ox > S + R || y + oy < -R || y + oy > S + R) continue;
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); gr.addColorStop(0, a > 0 ? `rgba(255,250,235,${a})` : `rgba(20,12,0,${-a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2);
    }
  }
}
function flecks(g, S, r, n, len, cols, w = 1) {
  for (let i = 0; i < n; i++) { const x = r() * S, y = r() * S, a = r() * 6.28, l = len * (0.4 + r()); g.strokeStyle = cols[(r() * cols.length) | 0]; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
}

let TEX;
function textures() {
  if (TEX) return TEX;
  const r = rng(909);
  TEX = {};
  // sun-dried mud brick laid in courses, the joints washed out by rain
  TEX.brick = pair(512, '#d6cfc0', 3, (c, h, S) => {
    const rows = 16, rh = S / rows, bl = S / 4;
    for (let j = 0; j < rows; j++) for (let i = -1; i < 5; i++) {
      const x = i * bl + (j % 2) * bl * 0.5 + (r() - 0.5) * 4, y = j * rh, v = 196 + r() * 44, w = bl - 3 - r() * 3;
      c.fillStyle = `rgb(${v},${v * 0.965},${v * 0.9})`; c.fillRect(x + 1.5, y + 2, w, rh - 3.5);
      h.fillStyle = grey(150 + r() * 50); h.fillRect(x + 2, y + 2.5, w - 1, rh - 4.5);
    }
    h.globalCompositeOperation = 'multiply'; mottle(h, S, r, 60, 40, 0.5); h.globalCompositeOperation = 'source-over';
    mottle(c, S, r, 90, 60, 0.3); flecks(c, S, r, 900, 5, ['rgba(60,40,10,0.18)', 'rgba(255,245,210,0.2)']);
    c.fillStyle = 'rgba(70,50,25,0.28)'; for (let j = 0; j < rows; j++) c.fillRect(0, j * rh, S, 2);
    for (let i = 0; i < 14; i++) { const x = r() * S, y = r() * S; c.fillStyle = 'rgba(80,60,30,0.12)'; c.fillRect(x, y, 3 + r() * 5, 30 + r() * 90); }   // rain streaks
  });
  // mud plaster with chopped straw, patched and cracked (white, so that vertex colours make it mud or gypsum wash)
  TEX.plaster = pair(512, '#e4dfd4', 2.2, (c, h, S) => {
    mottle(c, S, r, 160, 70, 0.22); mottle(h, S, r, 200, 50, 0.4);
    flecks(c, S, r, 2600, 7, ['rgba(120,95,40,0.22)', 'rgba(255,250,225,0.3)', 'rgba(70,50,20,0.15)']);
    flecks(h, S, r, 1600, 7, [grey(60, 0.25), grey(220, 0.25)]);
    for (let i = 0; i < 9; i++) {   // cracks
      let x = r() * S, y = r() * S, a = r() * 6.28; c.strokeStyle = 'rgba(50,35,15,0.35)'; h.strokeStyle = grey(20, 0.7); c.lineWidth = h.lineWidth = 1.2;
      c.beginPath(); h.beginPath(); c.moveTo(x, y); h.moveTo(x, y);
      for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 1.2; x += Math.cos(a) * 11; y += Math.sin(a) * 11; c.lineTo(x, y); h.lineTo(x, y); }
      c.stroke(); h.stroke();
    }
  });
  // field stones laid dry: rounded cobbles of limestone and flint
  TEX.stone = pair(512, '#4c463c', 5, (c, h, S) => {
    h.fillStyle = grey(30); h.fillRect(0, 0, S, S);
    const rows = 9, rh = S / rows;
    for (let j = 0; j < rows; j++) for (let x = -20 + r() * 20; x < S + 20;) {
      const w = 32 + r() * 46, y = j * rh + rh / 2 + (r() - 0.5) * 8, hh = rh * (0.42 + r() * 0.12), v = 150 + r() * 80, tint = r();
      for (const ox of [0, S, -S]) {
        const X = x + w / 2 + ox; if (X < -60 || X > S + 60) continue;
        const gr = c.createRadialGradient(X - w * 0.12, y - hh * 0.3, 2, X, y, w * 0.62); gr.addColorStop(0, `rgb(${v + 14},${(v + 10) * (0.95 + tint * 0.04)},${v * (0.82 + tint * 0.12)})`); gr.addColorStop(1, `rgb(${v * 0.62},${v * 0.58},${v * 0.5})`);
        c.fillStyle = gr; c.beginPath(); c.ellipse(X, y, w / 2 - 1.5, hh, (r() - 0.5) * 0.2, 0, 6.3); c.fill();
        const g2 = h.createRadialGradient(X, y, 1, X, y, w * 0.55); g2.addColorStop(0, grey(235)); g2.addColorStop(0.7, grey(170)); g2.addColorStop(1, grey(40));
        h.fillStyle = g2; h.beginPath(); h.ellipse(X, y, w / 2 - 1, hh + 1, 0, 0, 6.3); h.fill();
      }
      x += w;
    }
    flecks(c, S, r, 500, 3, ['rgba(255,255,255,0.12)', 'rgba(0,0,0,0.15)']);
  });
  // bundled reed and thatch: stems lying along v
  TEX.reed = pair(512, '#b9a268', 4, (c, h, S) => {
    for (let i = 0; i < 2600; i++) {
      const x = r() * S, y = r() * S, len = 60 + r() * 160, v = 140 + r() * 100, dx = (r() - 0.5) * 8;
      for (const oy of [0, -S]) { c.strokeStyle = `rgba(${v},${v * 0.86},${v * 0.52},0.75)`; c.lineWidth = 1 + r() * 1.6; c.beginPath(); c.moveTo(x, y + oy); c.lineTo(x + dx, y + oy + len); c.stroke();
        h.strokeStyle = grey(60 + r() * 190, 0.8); h.lineWidth = 2; h.beginPath(); h.moveTo(x, y + oy); h.lineTo(x + dx, y + oy + len); h.stroke(); }
    }
    for (let j = 0; j < 4; j++) { c.fillStyle = 'rgba(60,45,20,0.3)'; c.fillRect(0, j * S / 4 + 8, S, 3); h.fillStyle = grey(20, 0.6); h.fillRect(0, j * S / 4 + 8, S, 4); }   // bindings / shadow lines of the layers
  });
  // tilled earth: furrows along u (white-ish, tinted by vertex colour)
  TEX.earth = pair(512, '#cfc6b6', 4, (c, h, S) => {
    const n = 8, fh = S / n;
    for (let j = 0; j < n; j++) for (let y = 0; y < fh; y++) {
      const k = 0.5 - 0.5 * Math.cos((y / fh) * 6.283), v = 150 + k * 80;
      c.fillStyle = `rgb(${v},${v * 0.95},${v * 0.86})`; c.fillRect(0, j * fh + y, S, 1); h.fillStyle = grey(40 + k * 190); h.fillRect(0, j * fh + y, S, 1);
    }
    mottle(c, S, r, 200, 26, 0.3); mottle(h, S, r, 500, 12, 0.5);
    for (let i = 0; i < 2500; i++) { const x = r() * S, y = r() * S, s = 1 + r() * 3.5, d = r() < 0.5; c.fillStyle = d ? 'rgba(40,28,12,0.25)' : 'rgba(255,245,220,0.25)'; c.fillRect(x, y, s, s * 0.8); h.fillStyle = grey(d ? 50 : 230, 0.5); h.fillRect(x, y, s, s); }
  });
  // clay cones pressed point-first into wet plaster, their painted heads making lozenges and zigzags
  TEX.mosaic = pair(512, '#3a342c', 3, (c, h, S) => {
    const n = 64, d = S / n, cols = ['#e2d6ba', '#26211d', '#9a3524'];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + (j % 2) * 0.5) * d, y = (j + 0.5) * d, band = Math.floor(j / 16) % 4, a = (i + (j % 2) * 0.5) % 16, b = j % 16;
      let k;
      if (band === 0) k = Math.floor((Math.abs(a - 8) + Math.abs(b - 8)) / 2.7) % 3;             // nested lozenges
      else if (band === 1) k = Math.floor(((a + Math.abs(b - 8)) % 16) / 2.7) % 3;               // zigzag
      else if (band === 2) k = Math.floor((Math.abs(a - 8) + b * 0.5) / 2.7) % 3;                // triangles
      else k = (Math.floor(a / 4) + Math.floor(b / 4)) % 2 ? 0 : (Math.abs(a - 8) < 4 ? 2 : 1);   // chequer
      for (const ox of [0, -S]) {
        c.fillStyle = cols[k]; c.beginPath(); c.arc(x + ox + d / 2, y, d * 0.46, 0, 6.3); c.fill();
        const g2 = h.createRadialGradient(x + ox + d / 2, y, 0, x + ox + d / 2, y, d * 0.5); g2.addColorStop(0, grey(230)); g2.addColorStop(1, grey(60)); h.fillStyle = g2; h.beginPath(); h.arc(x + ox + d / 2, y, d * 0.48, 0, 6.3); h.fill();
      }
    }
    mottle(c, S, r, 60, 50, 0.18);
  });
  // a row of standing cereal: stems, blades and bearded ears (pale, tinted green or gold by vertex colour)
  {
    const S = 256, cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = S; const g = cvs.getContext('2d');
    for (let i = 0; i < 150; i++) {
      const x = r() * 512, top = S * (0.04 + r() * 0.3), lean = (r() - 0.5) * 22, v = 190 + r() * 60;
      for (const ox of [0, 512, -512]) {
        g.strokeStyle = `rgba(${v},${v},${v * 0.82},1)`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x + ox, S); g.quadraticCurveTo(x + ox, S * 0.5, x + ox + lean, top + 26); g.stroke();
        for (let k = 0; k < 2; k++) { const y0 = S * (0.45 + r() * 0.4), d = (r() < 0.5 ? -1 : 1) * (10 + r() * 18); g.lineWidth = 2.6; g.beginPath(); g.moveTo(x + ox, y0); g.quadraticCurveTo(x + ox + d * 0.6, y0 - 40, x + ox + d, y0 - 14 - r() * 30); g.stroke(); }   // blades
        g.fillStyle = `rgba(${v + 10},${v + 6},${v * 0.78},1)`; g.beginPath(); g.ellipse(x + ox + lean, top + 14, 4.2, 15, lean * 0.012, 0, 6.3); g.fill();   // the ear
        g.lineWidth = 0.9; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + ox + lean, top + 16 + Math.abs(k) * 3); g.lineTo(x + ox + lean + k * 5, top - 12 + Math.abs(k) * 2); g.stroke(); }   // awns
      }
    }
    TEX.crop = canvasTex(cvs);
  }
  return TEX;
}

/** Texture tile sizes in metres: geometry carries uv in metres ÷ tile. */
const TILE = { brick: 1.4, plaster: 3.2, stone: 1.7, reed: 1.6, earth: 2.6, mosaic: 2.4, wood: 1.2, plain: 1, water: 1, crop: 1 };
let MATS;
/** One material per surface; everything is tinted by vertex colour. */
export function materials() {
  if (MATS) return MATS;
  const T = textures(), G = shared(), std = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, vertexColors: true, roughness: 0.95, metalness: 0, ...o });
  MATS = {
    brick: std(T.brick), plaster: std(T.plaster, { normalScale: new THREE.Vector2(0.7, 0.7) }), stone: std(T.stone, { roughness: 0.9 }), reed: std(T.reed, { side: THREE.DoubleSide }),
    earth: std(T.earth, { roughness: 1 }), mosaic: std(T.mosaic, { roughness: 0.7 }), wood: std({ map: G.barkMap, normalMap: G.barkNormal }, { roughness: 0.9 }),
    plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0 }),
    crop: leafMat(T.crop, { sway: 0.035 }),
  };
  return MATS;
}

let KINDS;
/** The game's plants (palms, shrubs, rocks…), built once for both places. */
export const kinds = () => KINDS || (KINDS = makeKinds());

// ---------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Collects geometry by material name; `mesh()` turns each into one mesh. Faces are wound counter-clockwise seen from outside. */
export class Shape {
  constructor() { this.b = {}; }
  of(m) { return this.b[m] || (this.b[m] = new Builder()); }
  /** a, b along the bottom (left to right seen from outside), c above b, d above a. uv in metres from (u0, v0) unless given as [[u, v] × 4]. */
  quad(m, a, b, c, d, col = W, uv, n) {
    const t = TILE[m] || 1, nn = n || unit(cross(sub(b, a), sub(d, a)));
    let q = uv;
    if (!q || q.length === 2) { const u0 = q ? q[0] : 0, v0 = q ? q[1] : 0, L = Math.hypot(...sub(b, a)), H = Math.hypot(...sub(d, a)); q = [[u0, v0], [u0 + L, v0], [u0 + L, v0 + H], [u0, v0 + H]]; }
    this.of(m).quad([a, nn, q[0][0] / t, q[0][1] / t, col], [b, nn, q[1][0] / t, q[1][1] / t, col], [c, nn, q[2][0] / t, q[2][1] / t, col], [d, nn, q[3][0] / t, q[3][1] / t, col]);
    return this;
  }
  /** A flat polygon facing up at height y; plan = [[x, z] …]. */
  cap(m, plan, y, col = W, down = false) {
    const pts = plan.map((p) => new THREE.Vector2(p[0], p[1])), tris = THREE.ShapeUtils.triangulateShape(pts, []), b = this.of(m), t = TILE[m] || 1, n = [0, down ? -1 : 1, 0];
    for (const [i, j, k] of tris) {
      const A = plan[i], B = plan[j], C = plan[k], up = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]) > 0, v = (p) => [[p[0], y, p[1]], n, p[0] / t, p[1] / t, col];
      up !== down ? b.tri(v(A), v(B), v(C)) : b.tri(v(A), v(C), v(B));
    }
    return this;
  }
  /**
   * Walls standing on a plan [[x, z] …] from y0 to y1. o: { batter (m the top leans in), col, cap (material of the top, false for none),
   * capCol, skip (edge indices left open), open (the plan is a line, not a ring) }.
   */
  prism(m, plan, y0, y1, o = {}) {
    let P = plan.slice(); const n = P.length;
    let area = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    if ((area > 0) !== !!o.inward && !o.open) P.reverse();   // inward: the faces look into the ring (a parapet's inner side)
    let cx = 0, cz = 0; for (const p of P) { cx += p[0] / n; cz += p[1] / n; }
    let rad = 0; for (const p of P) rad += Math.hypot(p[0] - cx, p[1] - cz) / n;
    const k = 1 - (o.batter || 0) / (rad || 1), top = o.open ? P : P.map((p) => [cx + (p[0] - cx) * k, cz + (p[1] - cz) * k]), col = o.col || W;
    let u = o.u0 || 0;
    for (let i = 0; i < (o.open ? n - 1 : n); i++) {
      const j = (i + 1) % n, a = P[i], b = P[j], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!(o.skip && o.skip.includes(i)) && L > 1e-4) this.quad(m, [a[0], y0, a[1]], [b[0], y0, b[1]], [top[j][0], y1, top[j][1]], [top[i][0], y1, top[i][1]], col, [u, y0]);
      u += L;
    }
    if (o.cap !== false && !o.open) this.cap(o.cap || m, top, y1, o.capCol || col);
    return this;
  }
  /** A block w × h × d standing on y0 at (x, z), turned by rot about +y. */
  box(m, x, y0, z, w, h, d, rot = 0, o = {}) { return this.prism(m, rect(x, z, w, d, rot), y0, y0 + h, o); }
  /**
   * A turned shape about the vertical through (x, z): prof = [[radius, height] …] from the bottom up.
   * o: { a0, a1 (an arc only), col, cap (close the top: material), sx (stretch along local x), rot }.
   */
  lathe(m, x, y0, z, prof, segs = 16, o = {}) {
    const a0 = o.a0 || 0, a1 = o.a1 === undefined ? Math.PI * 2 : o.a1, col = o.col || W, t = TILE[m] || 1, b = this.of(m), sx = o.sx || 1, cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
    const at = (r, y, a) => { const px = Math.cos(a) * r * sx, pz = Math.sin(a) * r; return [x + px * cr + pz * sr, y0 + y, z - px * sr + pz * cr]; };
    const nat = (nr, ny, a) => { const px = Math.cos(a) * nr / sx, pz = Math.sin(a) * nr, v = unit([px * cr + pz * sr, ny, -px * sr + pz * cr]); return v; };
    let v = 0;
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, h0] = prof[i], [r1, h1] = prof[i + 1], dr = r1 - r0, dh = h1 - h0, L = Math.hypot(dr, dh) || 1, nr = dh / L, ny = -dr / L, R = Math.max(r0, r1);
      for (let k = 0; k < segs; k++) {
        const A = a0 + ((a1 - a0) * k) / segs, B = a0 + ((a1 - a0) * (k + 1)) / segs, uA = (A * R) / t, uB = (B * R) / t, nA = nat(nr, ny, A), nB = nat(nr, ny, B);
        b.quad([at(r0, h0, B), nB, uB, v / t, col], [at(r0, h0, A), nA, uA, v / t, col], [at(r1, h1, A), nA, uA, (v + L) / t, col], [at(r1, h1, B), nB, uB, (v + L) / t, col]);
      }
      v += L;
    }
    if (o.cap) { const [r, h] = prof[prof.length - 1], ring = []; for (let k = 0; k < segs; k++) { const p = at(r, h, a0 + ((a1 - a0) * k) / segs); ring.push([p[0], p[2]]); } this.cap(o.cap, ring, y0 + h, o.capCol || col); }
    return this;
  }
  /** A round bar from p to q (radius r0 at p, r1 at q). */
  beam(m, p, q, r0, r1 = r0, sides = 6, col = W, ends = true) {
    const d = unit(sub(q, p)), s = unit(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), e = cross(d, s), b = this.of(m), t = TILE[m] || 1, L = Math.hypot(...sub(q, p));
    const ring = (c, r, k) => { const a = (k / sides) * 6.2832, n = [s[0] * Math.cos(a) + e[0] * Math.sin(a), s[1] * Math.cos(a) + e[1] * Math.sin(a), s[2] * Math.cos(a) + e[2] * Math.sin(a)]; return [[c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r], n]; };
    for (let k = 0; k < sides; k++) {
      const [a, na] = ring(p, r0, k), [bb, nb] = ring(p, r0, k + 1), [c, nc] = ring(q, r1, k + 1), [dd, nd] = ring(q, r1, k), u0 = (k / sides) * 6.28 * r0 / t, u1 = ((k + 1) / sides) * 6.28 * r0 / t;
      b.quad([a, na, u0, 0, col], [bb, nb, u1, 0, col], [c, nc, u1, L / t, col], [dd, nd, u0, L / t, col]);
      if (ends) { b.tri([q, d, 0, 0, col], [dd, d, 0, 0, col], [c, d, 0, 0, col]); const nd2 = [-d[0], -d[1], -d[2]]; b.tri([p, nd2, 0, 0, col], [bb, nd2, 0, 0, col], [a, nd2, 0, 0, col]); }
    }
    return this;
  }
  /** Add one mesh per material to `group`. */
  mesh(group, { cast = true, receive = true } = {}) {
    const M = materials(), out = [];
    for (const name in this.b) {
      const geo = this.b[name].build(); if (!geo.attributes.position.count) continue;
      const m = new THREE.Mesh(geo, M[name]); m.castShadow = cast && name !== 'water' && name !== 'earth' && name !== 'crop'; m.receiveShadow = receive; m.name = name; group.add(m); out.push(m);
    }
    return out;
  }
}
/** Corners of a w × d rectangle centred on (x, z), turned by rot (so that local +x points along (cos rot, −sin rot)). */
export function rect(x, z, w, d, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([px, pz]) => [x + px * c + pz * s, z - px * s + pz * c]);
}
/** A local point (px, pz) of something at (x, z) turned by rot, in world [x, z]. */
export const local = (x, z, rot, px, pz) => { const c = Math.cos(rot), s = Math.sin(rot); return [x + px * c + pz * s, z - px * s + pz * c]; };

// ---------------------------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------------------------
const EARTH = { ploughed: lin(0x806a4e), sown: lin(0x927654), green: lin(0x7c6646), ripe: lin(0x9c8658), stubble: lin(0xb89a5e), fallow: lin(0xa48c62) };
const CROP = { sown: [lin(0x6c7a46), 0.14], green: [shade(lin(0x62703f), 0.85), 0.5], ripe: [lin(0xd8b45c), 0.95], stubble: [lin(0xc8a85a), 0.13] };
/**
 * A plot of cereal w (along the furrows) × d at (x, z), turned by rot, lying on flat ground at height y.
 * stage: ploughed | sown | green | ripe | stubble | fallow. cut (0..1): the first part of a ripe plot is already reaped to stubble.
 * Returns { at(px, pz) → world [x, z], cutX } for placing the people who work it.
 */
export function field(S, r, x, z, w, d, rot, y, stage, { cut = 0, bund = true, tall = 1 } = {}) {
  const P = (px, pz, py) => { const q = local(x, z, rot, px, pz); return [q[0], y + py, q[1]]; };
  const earthOf = (st, x0, x1) => { const c = shade(EARTH[st], 0.9 + r() * 0.2); S.quad('earth', P(x0, d / 2, 0.045), P(x1, d / 2, 0.045), P(x1, -d / 2, 0.045), P(x0, -d / 2, 0.045), c, [x0, 0], [0, 1, 0]); };
  const cropOf = (st, x0, x1) => {
    if (!CROP[st]) return;
    const [c0, h0] = CROP[st], h = h0 * tall, up = [0, 1, 0], b = S.of('crop'), gap = st === 'ripe' || st === 'green' ? 0.34 : 0.5, sparse = st === 'sown' || st === 'stubble';
    const card = (a, bq, hh, c) => {
      const L = Math.hypot(bq[0] - a[0], bq[2] - a[2]), u0 = r() * 3, u1 = u0 + L / (sparse ? 2.6 : 1.5), lx = (r() - 0.5) * 0.16, lz = (r() - 0.5) * 0.16, lo = shade(c, 0.62);
      b.quad([a, up, u0, 0, lo], [bq, up, u1, 0, lo], [[bq[0] + lx, bq[1] + hh, bq[2] + lz], up, u1, 1, c], [[a[0] + lx, a[1] + hh, a[2] + lz], up, u0, 1, c]);
    };
    for (let pz = -d / 2 + 0.2; pz < d / 2 - 0.1; pz += gap * (0.8 + r() * 0.4)) card(P(x0, pz, 0.03), P(x1, pz, 0.03), h * (0.85 + r() * 0.3), shade(c0, 0.82 + r() * 0.36));
    for (let px = x0 + 0.3; px < x1 - 0.1; px += (sparse ? 1.6 : 0.9) * (0.8 + r() * 0.4)) card(P(px, -d / 2 + 0.1, 0.03), P(px, d / 2 - 0.1, 0.03), h * (0.85 + r() * 0.3), shade(c0, 0.82 + r() * 0.36));
  };
  const cutX = -w / 2 + w * cut;
  if (stage === 'ripe' && cut > 0) {
    earthOf('stubble', -w / 2, cutX); cropOf('stubble', -w / 2, cutX); earthOf('ripe', cutX, w / 2); cropOf('ripe', cutX, w / 2);
    for (let px = -w / 2 + 1.2; px < cutX - 1; px += 2.6 + r() * 1.5) { const q = P(px, (r() - 0.5) * d * 0.7, 0); sheaf(S, q[0], q[1], q[2], r); }
  } else { earthOf(stage, -w / 2, w / 2); cropOf(stage, -w / 2, w / 2); if (stage === 'stubble') for (let k = 0; k < (w * d) / 28; k++) { const q = P((r() - 0.5) * w * 0.8, (r() - 0.5) * d * 0.8, 0); sheaf(S, q[0], q[1], q[2], r); } }
  if (bund) {   // a low bank of earth round the plot
    const c = shade(EARTH.fallow, 0.85), o = rect(x, z, w + 0.5, d + 0.5, rot), i = rect(x, z, w - 0.1, d - 0.1, rot);
    for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4, m = (a, bq) => [(a[0] + bq[0]) / 2, y + 0.2, (a[1] + bq[1]) / 2], v = (p, h) => [p[0], y + h, p[1]];
      S.quad('earth', v(o[k2], 0), v(o[k], 0), m(o[k], i[k]), m(o[k2], i[k2]), c).quad('earth', v(i[k], 0.04), v(i[k2], 0.04), m(o[k2], i[k2]), m(o[k], i[k]), c); }
  }
  return { at: (px, pz) => local(x, z, rot, px, pz), cutX, rot, w, d };
}
/** A stook: sheaves of cut corn stood together to dry. */
export function sheaf(S, x, y, z, r, s = 1) {
  const c = shade(lin(0xd8c080), 0.85 + r() * 0.3); s *= 0.72;
  S.lathe('reed', x, y, z, [[0.3 * s, 0], [0.16 * s, 0.5 * s], [0.13 * s, 0.62 * s], [0.3 * s, 0.98 * s]], 7, { col: c, cap: 'reed', capCol: shade(c, 1.1) });
}
/** A pile of threshed grain or chaff. */
export function heap(S, x, y, z, rad, h, col, m = 'plaster') {
  S.lathe(m, x, y, z, [[rad, 0], [rad * 0.8, h * 0.45], [rad * 0.45, h * 0.85], [0.02, h]], 10, { col });
}

// ---------------------------------------------------------------------------------------------
// Pots and other small things
// ---------------------------------------------------------------------------------------------
export const POTS = {
  jar: [[0.1, 0], [0.24, 0.16], [0.3, 0.36], [0.26, 0.56], [0.14, 0.68], [0.12, 0.74], [0.17, 0.8]],
  pithos: [[0.14, 0], [0.34, 0.25], [0.42, 0.6], [0.36, 0.95], [0.24, 1.1], [0.27, 1.18]],
  bowl: [[0.07, 0], [0.2, 0.08], [0.26, 0.17]],
  bevel: [[0.05, 0], [0.09, 0.1]],   // the mass-produced ration bowl of Uruk
  basket: [[0.2, 0], [0.3, 0.22], [0.33, 0.36]],
};
export function pot(S, x, y, z, kind, col, s = 1, m = 'plain') {
  const p = POTS[kind].map(([rr, h]) => [rr * s, h * s]);
  S.lathe(m, x, y, z, p, kind === 'bevel' ? 6 : 9, { col });
  const [rr, h] = p[p.length - 1]; S.lathe(m, x, y, z, [[rr * 0.9, h - 0.02 * s], [0.01, h - 0.06 * s]], kind === 'bevel' ? 6 : 9, { col: shade(col, kind === 'basket' ? 1.2 : 0.35) });   // the dark mouth / the load
}
/** A ladder leaning from (x, z) on the ground up to height h, climbing towards direction rot. */
export function ladder(S, x, y, z, h, rot, col = lin(0x6a4c30)) {
  const reach = h * 0.3, side = (k) => local(x, z, rot, 0, k * 0.26), top = (k) => local(x, z, rot, reach, k * 0.22);
  for (const k of [-1, 1]) { const a = side(k), b = top(k); S.beam('wood', [a[0], y, a[1]], [b[0], y + h + 0.5, b[1]], 0.035, 0.03, 5, col); }
  for (let i = 1; i < h / 0.34; i++) { const f = (i * 0.34) / (h + 0.5), a = side(-1), b = top(-1), c = side(1), d = top(1); S.beam('wood', [a[0] + (b[0] - a[0]) * f, y + (h + 0.5) * f, a[1] + (b[1] - a[1]) * f], [c[0] + (d[0] - c[0]) * f, y + (h + 0.5) * f, c[1] + (d[1] - c[1]) * f], 0.022, 0.022, 4, col, false); }
}

// ---------------------------------------------------------------------------------------------
// Things to bump into
// ---------------------------------------------------------------------------------------------
/** Circles and turned rectangles the visitor cannot enter, each for its own span of the timeline. */
export class Solids {
  constructor() { this.list = []; this.u = 0; }
  circle(x, z, r, u0 = -Infinity, u1 = Infinity) { this.list.push({ x, z, r, u0, u1 }); return this; }
  box(x, z, w, d, rot = 0, u0 = -Infinity, u1 = Infinity) { this.list.push({ x, z, w, d, c: Math.cos(rot), s: Math.sin(rot), u0, u1 }); return this; }
  collide(pos, rad = 0.6) {
    const u = this.u;
    for (const o of this.list) {
      if (u < o.u0 || u >= o.u1) continue;
      const dx = pos.x - o.x, dz = pos.z - o.z;
      if (o.r) { const dist = Math.hypot(dx, dz), need = o.r + rad; if (dist < need && dist > 1e-4) { pos.x = o.x + (dx / dist) * need; pos.z = o.z + (dz / dist) * need; } continue; }
      if (Math.abs(dx) + Math.abs(dz) > o.w + o.d + rad * 2) continue;
      const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c, px = o.w / 2 + rad - Math.abs(lx), pz = o.d / 2 + rad - Math.abs(lz);
      if (px > 0 && pz > 0) {
        let nx = lx, nz = lz; if (px < pz) nx += (lx < 0 ? -1 : 1) * px; else nz += (lz < 0 ? -1 : 1) * pz;
        pos.x = o.x + nx * o.c + nz * o.s; pos.z = o.z - nx * o.s + nz * o.c;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Plants and houses
// ---------------------------------------------------------------------------------------------
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(), _pp = new THREE.Vector3(), UPY = new THREE.Vector3(0, 1, 0);
/**
 * Copies of one of the game's plants or rocks (`parts` from kinds()) merged into one mesh per part, standing on the ground as it is now.
 * items: [{ x, z, s, rot, tint [r, g, b], sy? }]
 */
export function planted(group, parts, items, heightAt) {
  if (!items.length) return [];
  return parts.map(({ geo, mat, tint = true, cast = true }) => {
    const src = geo.index ? geo.toNonIndexed() : geo, n = src.attributes.position.count, N = n * items.length, sp = src.attributes.position, sn = src.attributes.normal, su = src.attributes.uv, sc = src.attributes.color;
    const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), uv = new Float32Array(N * 2), col = new Float32Array(N * 3);
    items.forEach((it, k) => {
      _pm.compose(_pp.set(it.x, heightAt(it.x, it.z) - 0.1, it.z), _pq.setFromAxisAngle(UPY, it.rot || 0), _ps.set(it.s, it.s * (it.sy || 1), it.s));
      const t = tint && it.tint ? it.tint : W;
      for (let i = 0; i < n; i++) {
        const o = (k * n + i) * 3;
        _pv.fromBufferAttribute(sp, i).applyMatrix4(_pm); pos[o] = _pv.x; pos[o + 1] = _pv.y; pos[o + 2] = _pv.z;
        _pv.fromBufferAttribute(sn, i).applyQuaternion(_pq); nor[o] = _pv.x; nor[o + 1] = _pv.y; nor[o + 2] = _pv.z;
        if (su) { uv[(k * n + i) * 2] = su.getX(i); uv[(k * n + i) * 2 + 1] = su.getY(i); }
        col[o] = (sc ? sc.getX(i) : 1) * t[0]; col[o + 1] = (sc ? sc.getY(i) : 1) * t[1]; col[o + 2] = (sc ? sc.getZ(i) : 1) * t[2];
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; group.add(m); return m;
  });
}

const DARK = lin(0x1a140e), TIMBER = lin(0x6a4c30);
/** A point on face f (0: −z side, 1: +x, 2: +z, 3: −x) of a w × d block at (x, z) turned by rot: `along` the face (to the right, seen from outside), `out` from it. Returns [x, z]. */
export function onFace(x, z, w, d, rot, f, along, out) {
  const p = f === 0 ? [-along, -d / 2 - out] : f === 1 ? [w / 2 + out, -along] : f === 2 ? [along, d / 2 + out] : [-w / 2 - out, along];
  return local(x, z, rot, p[0], p[1]);
}
/** A dark opening framed in the wall on face f: a doorway (y0 = 0) or a window. */
export function opening(S, x, y, z, w, d, rot, f, along, ow, oh, y0, frame, o = {}) {
  const P = (a, out, h) => { const q = onFace(x, z, w, d, rot, f, a, out); return [q[0], y + h, q[1]]; }, e = o.out || 0.05;
  S.quad('plain', P(along - ow / 2, e, y0), P(along + ow / 2, e, y0), P(along + ow / 2, e, y0 + oh), P(along - ow / 2, e, y0 + oh), o.col || DARK);
  if (o.lintel !== false) S.beam('wood', P(along - ow / 2 - 0.22, e + 0.05, y0 + oh + 0.07), P(along + ow / 2 + 0.22, e + 0.05, y0 + oh + 0.07), 0.075, 0.075, 5, TIMBER);
  if (frame) for (const k of [-1, 1]) {   // jambs standing proud of the wall
    const a0 = along + k * (ow / 2 + 0.11), q = onFace(x, z, w, d, rot, f, a0, e * 0.5);
    S.box(frame.m, q[0], y + y0, q[1], f % 2 ? e + 0.12 : 0.22, oh, f % 2 ? 0.22 : e + 0.12, rot, { col: frame.col });
  }
}
/**
 * A flat-roofed house of mud brick: w × d × h at (x, z) on ground y, turned by rot.
 * o: { m ('plaster' | 'brick'), col, footing (stone course), parapet (m), beams (ends showing under the roof), door (face), windows, roofCol, batter }
 */
export function house(S, r, x, y, z, w, d, h, rot, o = {}) {
  const m = o.m || 'plaster', col = o.col || lin(0xb89a70), bat = o.batter ?? 0.1, par = o.parapet ?? 0.3;
  if (o.footing !== false) S.box('stone', x, y - 0.3, z, w + 0.2, 0.75, d + 0.2, rot, { col: lin(0xb8ac98), cap: 'stone' });
  S.box(m, x, y, z, w, h + par, d, rot, { col, batter: bat, cap: false });
  const k = 1 - bat / (Math.hypot(w, d) / 2), tw = w * k, td = d * k, th = 0.32;
  S.cap('plaster', rect(x, z, tw - th, td - th, rot), y + h, o.roofCol || shade(col, 1.08));   // the roof, a hand's depth below the parapet
  S.prism(m, rect(x, z, tw - th * 2, td - th * 2, rot), y + h, y + h + par, { col: shade(col, 0.9), cap: false, inward: true });
  { const A = rect(x, z, tw, td, rot), B = rect(x, z, tw - th * 2, td - th * 2, rot), Y = y + h + par;   // the top of the parapet
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; S.quad(m, [B[i][0], Y, B[i][1]], [B[j][0], Y, B[j][1]], [A[j][0], Y, A[j][1]], [A[i][0], Y, A[i][1]], shade(col, 1.05), null, [0, 1, 0]); } }
  if (o.beams !== false) for (const f of [0, 2]) for (let a = -w / 2 + 0.5; a < w / 2 - 0.3; a += 0.75 + r() * 0.15) {
    const p = onFace(x, z, w, d, rot, f, a, -0.3), q = onFace(x, z, w, d, rot, f, a, 0.28 + r() * 0.1); S.beam('wood', [p[0], y + h - 0.16, p[1]], [q[0], y + h - 0.18, q[1]], 0.07, 0.06, 5, TIMBER);
  }
  const f = o.door ?? 2, span = f % 2 ? d : w;
  opening(S, x, y, z, w, d, rot, f, (r() - 0.5) * span * 0.4, 0.8, Math.min(1.6, h - 0.7), 0, { m, col: shade(col, 0.92) });
  for (let i = 0; i < (o.windows ?? 2); i++) { const wf = (f + 1 + ((r() * 3) | 0)) % 4, sp = wf % 2 ? d : w; opening(S, x, y, z, w, d, rot, wf, (r() - 0.5) * sp * 0.6, 0.32, 0.36, h - 1.0, null, { lintel: false, out: 0.07 }); }
  return { x, z, w, d, h, rot };
}
