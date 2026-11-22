// Building blocks for Giza: masonry textures, battered blocks, lofted shapes, and a collector that merges
// everything of one material and one span of years into a single mesh.
import * as THREE from 'three';
import { rng, merge } from './util.js?v=c0a40a57';
import { tileNoise, normalMap, canvasTex } from './textures.js?v=c0a40a57';
import { yearToU } from './timeline.js?v=c0a40a57';

const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
/** Linear RGB of a hex colour (or pass an array through). */
export const lin = (c) => { if (Array.isArray(c)) return c; _c.set(c); return [_c.r, _c.g, _c.b]; };
export const shade = (c, k) => lin(c).map((v) => v * k);

// colours of the place
export const C = {
  lime: 0xc4b48a, limeDark: 0xa8966c, tura: 0xe9e3d3, granite: 0x9a6253, basalt: 0x35332f, rock: 0xb9a57a,
  mud: 0x94744f, mudDark: 0x7a5e3f, plaster: 0xd6c9aa, wood: 0x6b4a2b, woodPale: 0x9a7a4a, reed: 0xb89c5c, sand: 0xd2b783,
  dark: 0x1a1612, clay: 0xa8683c, linen: 0xe8e2d4, gold: 0xd0a030, blue: 0x2f4f8a, red: 0x9a3a28, green: 0x4f7a35,
};

// ---------- textures ----------
/** Coursed masonry: { map, normalMap }. `course` and `len` are in pixels of a 512 px tile. */
export function masonry({ course = 64, len = [90, 170], joint = 0.55, jw = 2.5, vary = 0.2, grain = 0.18, seed = 1, bump = 3, stagger = 0 }) {
  const S = 512, r = rng(seed), n = tileNoise(S, 8, 5, seed + 3), h = new Float32Array(S * S);
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  for (let y0 = 0, row = 0; y0 < S; y0 += course, row++) {
    const edges = []; let x = stagger ? (row % 2) * len[0] * 0.5 : r() * len[0];
    while (x < S + len[1]) { edges.push([x, r()]); x += len[0] + r() * (len[1] - len[0]); }
    for (let y = y0; y < Math.min(S, y0 + course); y++) for (let px = 0; px < S; px++) {
      let k = 0; while (k < edges.length - 1 && edges[k + 1][0] <= px) k++;
      const e = edges[k], dx = Math.min(px - e[0] < 0 ? px - e[0] + S : px - e[0], (edges[k + 1] ? edges[k + 1][0] : S + e[0]) - px), dy = Math.min(y - y0, y0 + course - 1 - y);
      const dj = Math.min(dx, dy), jt = Math.max(0, 1 - dj / jw), i = y * S + px;
      const v = (1 - vary + vary * e[1]) * (1 - grain + grain * 2 * n[i]) * (1 - (1 - joint) * jt);
      h[i] = (0.55 + 0.3 * e[1] + 0.3 * n[i]) * (1 - jt);
      d[i * 4] = Math.min(255, v * 255); d[i * 4 + 1] = Math.min(255, v * 250); d[i * 4 + 2] = Math.min(255, v * 240); d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return { map: canvasTex(cv), normalMap: normalMap(h, S, bump) };
}
/** Bundled reeds / thatch / matting: fine parallel stalks. */
export function reedTex() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), r = rng(5);
  g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const x = r() * S, l = 30 + r() * 120, y = r() * S, v = 120 + r() * 120; g.strokeStyle = `rgba(${v},${v * 0.96},${v * 0.85},0.7)`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + l); g.stroke(); }
  for (let y = 40; y < S; y += 64) { g.fillStyle = 'rgba(60,45,25,0.5)'; g.fillRect(0, y, S, 3); }
  return canvasTex(cv);
}
/** A row of standing grain, tileable sideways, transparent between the stalks. */
export function cropTex() {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), r = rng(11);
  for (let i = 0; i < 230; i++) {
    const x = r() * W, top = H * (0.04 + r() * 0.3), lean = (r() - 0.5) * 26, v = 150 + r() * 90;
    for (const ox of [-W, 0, W]) {
      g.strokeStyle = `rgb(${v},${v},${v * 0.9})`; g.lineWidth = 2 + r(); g.beginPath(); g.moveTo(x + ox, H); g.quadraticCurveTo(x + ox, H * 0.5, x + ox + lean, top); g.stroke();
      g.fillStyle = `rgb(${Math.min(255, v + 35)},${Math.min(255, v + 30)},${v * 0.8})`; g.beginPath(); g.ellipse(x + ox + lean, top + 9, 4, 15, lean * 0.02, 0, 7); g.fill();   // the ear
      if (i % 3 === 0) { g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + ox, H * 0.75); g.quadraticCurveTo(x + ox + 14, H * 0.55, x + ox + 26 * Math.sign(lean || 1), H * 0.62); g.stroke(); }   // a leaf
    }
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** A clump of papyrus: tall bare stems, each with a mop of fine rays. */
export function papyrusTex() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), r = rng(23);
  for (let i = 0; i < 16; i++) {
    const x0 = S * (0.3 + r() * 0.4), x1 = S * (0.1 + r() * 0.8), y1 = S * (0.1 + r() * 0.35), v = 120 + r() * 80;
    g.strokeStyle = `rgb(${v * 0.8},${v},${v * 0.7})`; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, S); g.quadraticCurveTo(x0, S * 0.5, x1, y1); g.stroke();
    g.lineWidth = 1.2; for (let k = 0; k < 34; k++) { const a = -Math.PI * (0.02 + 0.96 * r()), l = 14 + r() * 22; g.strokeStyle = `rgb(${v * 0.95},${v * 1.15},${v * 0.7})`; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(x1 + Math.cos(a) * l * 0.7, y1 + Math.sin(a) * l, x1 + Math.cos(a) * l * 1.2, y1 + Math.sin(a) * l * 0.5 + 6); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- geometry ----------
/** Move a geometry: rotate about y (then x, z), then translate. */
export function put(g, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  g.applyMatrix4(_m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz))); return g;
}
/** A block standing on y = 0 whose walls lean inward (`bx`, `bz` metres per metre of height), as Egyptian walls do. */
export function block(w, h, d, bx = 0, bz = bx) {
  const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i); p.setX(i, p.getX(i) * Math.max(0, 1 - (2 * bx * t) / w)); p.setZ(i, p.getZ(i) * Math.max(0, 1 - (2 * bz * t) / d)); }
  g.computeVertexNormals(); return g;
}
/** A wall from (x0, z0) to (x1, z1), battered on both faces. */
export function wall(x0, z0, x1, z1, h, t, y = 0, batter = 0.04) {
  const L = Math.hypot(x1 - x0, z1 - z0); return put(block(L + t, h, t, 0, batter), (x0 + x1) / 2, y, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0));
}
/** A solid of revolution from a profile [[radius, y] …]. */
export const lathe = (prof, segs = 12) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), segs);
/** A barrel vault (half cylinder) of width w and length len along z, springing from y = 0. */
export const vault = (w, len, rise = w / 2) => { const g = new THREE.CylinderGeometry(w / 2, w / 2, len, 10, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2); g.scale(1, rise / (w / 2), 1); return g; };
/** A round bar between two points. */
export function bar(a, b, r0, r1 = r0, segs = 6) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), g = new THREE.CylinderGeometry(r1, r0, len, segs).translate(0, len / 2, 0);
  g.applyQuaternion(_q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).translate(a[0], a[1], a[2]); return g;
}
/**
 * A smooth skin through cross-sections. rings: [x, y, z, up, down, half-width, power?] along any path; each section is a
 * superellipse in the plane across `axis` ('x': sections in y–z, 'y': sections in x–z with up/down along x).
 */
export function skin(rings, { segs = 16, axis = 'x', capA = true, capB = true, sub = 3 } = {}) {
  const S = [], cr = (a, b, c, d, t) => b.map((_, i) => 0.5 * (2 * b[i] + (c[i] - a[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t * t + (3 * b[i] - a[i] - 3 * c[i] + d[i]) * t * t * t));
  const R = rings.map((q) => (q.length < 7 ? [...q, 2] : q));
  for (let i = 0; i < R.length - 1; i++) for (let k = 0; k < sub; k++) S.push(cr(R[Math.max(0, i - 1)], R[i], R[i + 1], R[Math.min(R.length - 1, i + 2)], k / sub));
  S.push(R[R.length - 1]);
  const pos = [], idx = [], W = segs + 1;
  for (const s of S) for (let k = 0; k <= segs; k++) {
    const a = (k / segs) * Math.PI * 2, cu = Math.cos(a), su = Math.sin(a), p = 2 / Math.max(1.2, s[6]);
    const u = Math.sign(cu) * Math.abs(cu) ** p * (cu > 0 ? s[3] : s[4]), w = Math.sign(su) * Math.abs(su) ** p * s[5];
    if (axis === 'x') pos.push(s[0], s[1] + u, s[2] + w); else pos.push(s[0] + u, s[1], s[2] + w);
  }
  for (let j = 0; j < S.length - 1; j++) for (let k = 0; k < segs; k++) { const a = j * W + k, b = a + 1, c = a + W, d = c + 1; if (axis === 'x') idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  for (const [on, j, flip] of [[capA, 0, false], [capB, S.length - 1, true]]) {
    if (!on) continue; const s = S[j], o = pos.length / 3; pos.push(s[0], s[1], s[2]);
    for (let k = 0; k < segs; k++) { const a = j * W + k, b = a + 1; if ((axis === 'x') !== flip) idx.push(o, b, a); else idx.push(o, a, b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/**
 * Finish a geometry for merging: non-indexed, one colour (or colour(x, y, z) → [r, g, b] linear), and texture
 * coordinates projected along whichever axis each face looks down, `s` metres to a tile.
 */
export function fin(geo, color, s = 4) {
  const g = geo.index ? geo.toNonIndexed() : geo; if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position.array, N = p.length / 3, col = new Float32Array(N * 3), uv = new Float32Array(N * 2), fn = typeof color === 'function' ? color : null, c = fn ? null : lin(color);
  for (let i = 0; i < N; i += 3) {
    const a = i * 3, ux = p[a + 3] - p[a], uy = p[a + 4] - p[a + 1], uz = p[a + 5] - p[a + 2], vx = p[a + 6] - p[a], vy = p[a + 7] - p[a + 1], vz = p[a + 8] - p[a + 2];
    const nx = Math.abs(uy * vz - uz * vy), ny = Math.abs(uz * vx - ux * vz), nz = Math.abs(ux * vy - uy * vx), ax = ny > nx * 1.6 && ny > nz * 1.6 ? 1 : nx > nz ? 0 : 2;
    for (let k = 0; k < 3; k++) {
      const j = (i + k) * 3, x = p[j], y = p[j + 1], z = p[j + 2], q = fn ? fn(x, y, z) : c;
      col[j] = q[0]; col[j + 1] = q[1]; col[j + 2] = q[2];
      uv[(i + k) * 2] = (ax === 0 ? z : x) / s; uv[(i + k) * 2 + 1] = (ax === 1 ? z : y) / s;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}

/** Collects finished pieces by material and span of years, and turns each pile into one mesh. */
export class Parts {
  constructor(spans) { this.spans = spans; this.piles = new Map(); }
  /** mat: a key of the materials given to build(); span: a key of `spans` ([from year, to year]). */
  add(mat, span, geo, color, s) { const k = mat + '|' + span; if (!this.piles.has(k)) this.piles.set(k, []); this.piles.get(k).push(fin(geo, color, s)); return this; }
  build(group, mats) {
    this.meshes = [];
    for (const [k, list] of this.piles) {
      const [mat, span] = k.split('|'), m = new THREE.Mesh(merge(list), mats[mat]), [a, b] = this.spans[span];
      m.castShadow = mat !== 'field'; m.receiveShadow = true; m.userData = { u0: yearToU(a), u1: yearToU(b) }; group.add(m); this.meshes.push(m);
      for (const g of list) g.dispose();
    }
    this.piles.clear(); return this.meshes;
  }
  update(u) { for (const m of this.meshes) m.visible = u >= m.userData.u0 && u < m.userData.u1; }
}

// ---------- paths ----------
/** A closed polyline moved sideways by `off` metres (to the right of travel when positive). */
export function offsetLoop(path, off) {
  const n = path.length - 1, out = [];
  for (let i = 0; i < n; i++) {
    const a = path[(i + n - 1) % n], b = path[i], c = path[(i + 1) % n];
    let d0x = b[0] - a[0], d0z = b[1] - a[1], d1x = c[0] - b[0], d1z = c[1] - b[1]; const l0 = Math.hypot(d0x, d0z) || 1, l1 = Math.hypot(d1x, d1z) || 1;
    d0x /= l0; d0z /= l0; d1x /= l1; d1z /= l1;
    let nx = -(d0z + d1z), nz = d0x + d1x; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    const k = off / Math.max(0.5, nx * -d0z + nz * d0x); out.push([b[0] + nx * k, b[1] + nz * k]);
  }
  out.push(out[0].slice()); return out;
}
/** Round the corners of a closed polyline with arcs of about `rad` metres. */
export function roundLoop(pts, rad = 3, steps = 4) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n], la = Math.hypot(a[0] - b[0], a[1] - b[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]), r = Math.min(rad, la / 2.2, lc / 2.2);
    const p = [b[0] + ((a[0] - b[0]) / la) * r, b[1] + ((a[1] - b[1]) / la) * r], q = [b[0] + ((c[0] - b[0]) / lc) * r, b[1] + ((c[1] - b[1]) / lc) * r];
    for (let k = 0; k <= steps; k++) { const t = k / steps, s = 1 - t; out.push([s * s * p[0] + 2 * s * t * b[0] + t * t * q[0], s * s * p[1] + 2 * s * t * b[1] + t * t * q[1]]); }
  }
  out.push(out[0].slice()); return out;
}
/** Follows a closed path as an actor on the same path does: at(d) → [x, z, heading]. */
export class Track {
  constructor(path) { this.path = path; this.cum = [0]; for (let i = 1; i < path.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])); this.L = this.cum[this.cum.length - 1]; this._a = [0, 0]; this._b = [0, 0]; }
  pt(d, out) {
    const c = this.cum, n = c.length - 1; d = ((d % this.L) + this.L) % this.L; let i = 0; while (i < n - 1 && c[i + 1] < d) i++;
    const t = (d - c[i]) / (c[i + 1] - c[i] || 1), p = this.path[i], q = this.path[i + 1]; out[0] = p[0] + (q[0] - p[0]) * t; out[1] = p[1] + (q[1] - p[1]) * t; return out;
  }
  at(d, out, span = 0.6) { this.pt(d - span, this._a); this.pt(d + span, this._b); this.pt(d, out); out[2] = Math.atan2(this._a[1] - this._b[1], this._b[0] - this._a[0]); return out; }
}

// ---------- things to bump into, and to stand on ----------
/**
 * An obstacle: an axis-aligned rectangle r = [x0, x1, z0, z1] (or, with `box`, a turned rectangle inside it), standing in years
 * [a, b). With `top` (a height, or a function (x, z, year) -> height) it is something you can stand on: it stops you only while your
 * feet are more than 0.6 m below its top, and carries you once you are up. `deck`: you can also pass underneath it.
 */
export const rectOb = (r, a = -1e9, b = 1e9, o = {}) => ({ r, a, b, ...o });
/** A w x d rectangle centred on (x, z), turned by ry as put() turns things (local x along (cos ry, -sin ry)). */
export function boxOb(x, z, w, d, ry, a = -1e9, b = 1e9, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry), ex = (Math.abs(c) * w + Math.abs(s) * d) / 2, ez = (Math.abs(s) * w + Math.abs(c) * d) / 2;
  return { r: [x - ex, x + ex, z - ez, z + ez], a, b, box: { x, z, c, s, hw: w / 2, hd: d / 2 }, ...o };
}
/** A strip of half-width hw from p to q ([x, z]). */
export const stripOb = (p, q, hw, a, b, o) => boxOb((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.hypot(q[0] - p[0], q[1] - p[1]), hw * 2, -Math.atan2(q[1] - p[1], q[0] - p[0]), a, b, o);
export class Obstacles {
  constructor(list) { this.list = list; this.year = 0; this.feet = -Infinity; }
  static inside(o, x, z, pad) {
    if (x < o.r[0] - pad || x > o.r[1] + pad || z < o.r[2] - pad || z > o.r[3] + pad) return false;
    if (!o.box) return true;
    const b = o.box, dx = x - b.x, dz = z - b.z;
    return Math.abs(dx * b.c - dz * b.s) < b.hw + pad && Math.abs(dx * b.s + dz * b.c) < b.hd + pad;
  }
  topOf(o, x, z) { return typeof o.top === 'function' ? o.top(x, z, this.year) : o.top; }
  /** Does something stop a visitor whose feet are at `feet` from standing at (x, z)? rad: how close they may come. */
  blocked(x, z, feet, rad = 0.3) {
    for (const o of this.list) {
      if (this.year < o.a || this.year >= o.b || !Obstacles.inside(o, x, z, o.top !== undefined ? 0.05 : rad)) continue;   // a step: only its own edge
      if (o.top !== undefined) { const t = this.topOf(o, x, z); if (feet > t - 0.6 || (o.deck && feet < t - 2.4)) continue; }
      return o;
    }
    return null;
  }
  /** The highest top under (x, z) that the visitor can be standing on, or -Infinity. */
  floorAt(x, z) {
    let h = -Infinity;
    for (const o of this.list) {
      if (o.top === undefined || o.rail || this.year < o.a || this.year >= o.b || !Obstacles.inside(o, x, z, 0)) continue;
      const t = this.topOf(o, x, z); if (t > h && t < this.feet + 1.2) h = t;
    }
    return h;
  }
}
