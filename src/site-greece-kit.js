// Building blocks shared by the classical places (site-greece.js, site-rome.js): masonry textures, a batcher that
// merges everything of one material and one span of years into one mesh, columns of the orders, temples, stoas,
// houses, arcades, scaffolding, boats, trees, beasts and the footprints the visitor cannot walk through.
import * as THREE from 'three';
import { rng, clamp, box as ubox, cyl as ucyl, merge, vcMat } from './util.js';
import { canvasTex, shared, tileNoise } from './textures.js';
import { animTime } from './organic.js';
import { pose } from './animals.js';
import { Builder, grow, foliage, norm } from './flora-geo.js';
import { leafMat, floraTextures } from './flora-tex.js';

const TAU = Math.PI * 2;
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _n3 = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
/** A colour as linear [r, g, b]: from a hex number or as given. */
export const lin = (c) => { if (Array.isArray(c)) return c; _col.set(c); return [_col.r, _col.g, _col.b]; };
/** The colour made lighter or darker by a random amount. */
export const tone = (c, r, amt = 0.12) => { const k = 1 + (r() - 0.5) * 2 * amt, v = lin(c); return [v[0] * k, v[1] * k, v[2] * k]; };
export const shade = (c, k) => { const v = lin(c); return [v[0] * k, v[1] * k, v[2] * k]; };
/** Heading (as actors and buildings use it: 0 faces +x) from one point towards another. */
export const toward = (x, z, tx, tz) => Math.atan2(-(tz - z), tx - x);

// =====================================================================================
// Textures: each is `m` metres across and is laid on by position, so courses run true round every corner
// =====================================================================================
function canvas(S, draw) { const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'), S); return c; }
function speckle(g, S, r, n, lo, hi, a) { for (let i = 0; i < n; i++) { const v = lo + r() * (hi - lo); g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(r() * S, r() * S, 1 + r() * 2.5, 1 + r() * 2.5); } }
/** Courses of blocks: `rows` courses, about `per` blocks in each, with dark joints and each block its own tone. */
function coursed(S, seed, rows, per, { base = 226, vary = 26, joint = 0.4, jw = 1.5, rough = 5000 } = {}) {
  return canvas(S, (g) => {
    const r = rng(seed), h = S / rows; g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, S, S);
    for (let j = 0; j < rows; j++) {
      let x = -r() * S / per;
      while (x < S) { const w = (S / per) * (0.7 + r() * 0.6), v = base - vary + r() * vary * 2; g.fillStyle = `rgb(${v},${v * 0.985},${v * 0.96})`; g.fillRect(x, j * h, w, h); g.fillStyle = `rgba(40,34,28,${joint})`; g.fillRect(x, j * h, jw, h); x += w; }
      g.fillStyle = `rgba(40,34,28,${joint})`; g.fillRect(0, j * h, S, jw);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, j * h + jw, S, 1);
    }
    speckle(g, S, r, rough, 120, 255, 0.07);
  });
}
/** Stones fitted together without courses (cyclopean walls, polygonal paving): the cells of scattered points. */
function fitted(S, seed, n, { lo = 150, hi = 230, gap = 40, edge = 0.09, tint = [1, 0.97, 0.92] } = {}) {
  const r = rng(seed), pts = []; for (let i = 0; i < n; i++) pts.push([r() * S, r() * S, lo + r() * (hi - lo)]);
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, grain = tileNoise(S, 16, 3, seed);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9, v = 0;
    for (const p of pts) { let dx = Math.abs(x - p[0]), dy = Math.abs(y - p[1]); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy; const q = dx * dx + dy * dy; if (q < d1) { d2 = d1; d1 = q; v = p[2]; } else if (q < d2) d2 = q; }
    const e = (Math.sqrt(d2) - Math.sqrt(d1)) / S, k = e < edge * 0.25 ? 0 : Math.min(1, e / edge), val = (gap + (v - gap) * (0.35 + 0.65 * k)) * (0.85 + 0.3 * grain[y * S + x]) * (e < edge * 0.25 ? 0.6 : 1), i = (y * S + x) * 4;
    d[i] = val * tint[0]; d[i + 1] = val * tint[1]; d[i + 2] = val * tint[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
const mottled = (S, seed, lo, hi, streak = 0) => canvas(S, (g) => {
  const r = rng(seed), n = tileNoise(S, 4, 5, seed), f = tileNoise(S, 32, 2, seed + 3), img = g.createImageData(S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { const x = i % S, k = streak ? 0.5 + 0.5 * Math.sin(x * streak + n[i] * 9) : 0.5, v = (lo + (hi - lo) * (n[i] * 0.6 + f[i] * 0.25 + k * 0.15)); d[i * 4] = v; d[i * 4 + 1] = v * 0.985; d[i * 4 + 2] = v * 0.96; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); if (!streak) speckle(g, S, r, 1500, 90, 255, 0.06);
});
const tiles = (S) => canvas(S, (g) => {   // pan tiles with a raised cover tile over every join, overlapping down the slope
  const r = rng(71), nu = 5, nv = 4, w = S / nu, h = S / nv; g.fillStyle = '#c9c9c9'; g.fillRect(0, 0, S, S);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const v = 190 + r() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * w, j * h, w, h);
    const gr = g.createLinearGradient(0, j * h, 0, (j + 1) * h); gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(0.12, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)'); g.fillStyle = gr; g.fillRect(i * w, j * h, w, h);
  }
  for (let i = 0; i < nu; i++) { const x = i * w, gr = g.createLinearGradient(x - w * 0.16, 0, x + w * 0.16, 0); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.4)'); gr.addColorStop(0.7, 'rgba(225,225,225,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = gr; g.fillRect(x - w * 0.16, 0, w * 0.32, S); g.fillRect(x - w * 0.16 + S, 0, w * 0.32, S); }
  speckle(g, S, r, 2500, 60, 255, 0.07);
});
const planks = (S, seed, n, lo, hi) => canvas(S, (g) => {
  const r = rng(seed), w = S / n;
  for (let i = 0; i < n; i++) { const v = lo + r() * (hi - lo); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * w, 0, w, S); for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},0.07)`; g.fillRect(i * w + r() * w, 0, 1 + r() * 1.5, S); } g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * w, 0, 1.5, S); }
});

/**
 * Every surface: name → [tile in the atlas, metres one repeat covers, roughness, metalness, laid flat on the ground?].
 * All of them share one texture atlas and one material (two, with the flat ones), so a whole place is a handful of draw calls.
 */
const SURF = {
  marble: [0, 4, 0.62, 0], ashlar: [1, 4, 0.9, 0], cyclop: [2, 6, 0.95, 0], brick: [3, 2, 0.9, 0], plaster: [4, 5, 0.92, 0], tile: [5, 2, 0.8, 0], wood: [6, 1.6, 0.9, 0], thatch: [7, 2.5, 1, 0],
  rock: [8, 14, 0.95, 0], metal: [9, 1, 0.38, 0.85], slab: [10, 4, 0.85, 0, 1], flag: [11, 4.5, 0.85, 0, 1], earth: [12, 9, 1, 0, 1], plain: [9, 1, 0.9, 0], glow: [9, 1, 0.9, 0],
};
let MATS;
function materials() {
  if (MATS) return MATS;
  const T = shared(), S = 256, c = document.createElement('canvas'); c.width = c.height = S * 4; const g = c.getContext('2d');
  const tilesOf = [
    coursed(S, 3, 4, 2.2, { base: 238, vary: 9, joint: 0.16, jw: 1, rough: 2500 }), coursed(S, 5, 8, 3.2, { base: 220, vary: 26, joint: 0.42 }), fitted(S, 4, 22, { lo: 140, hi: 225, gap: 30, edge: 0.1 }),
    coursed(S, 9, 28, 7, { base: 212, vary: 30, joint: 0.3, jw: 1.5, rough: 3000 }), mottled(S, 11, 196, 250), tiles(S), planks(S, 13, 8, 150, 235), mottled(S, 15, 130, 250, 0.9),
    T.rockMap.image, null, coursed(S, 21, 6, 4, { base: 222, vary: 22, joint: 0.5, jw: 2 }), fitted(S, 8, 38, { lo: 120, hi: 200, gap: 45, edge: 0.07, tint: [0.96, 0.98, 1] }), T.groundMap.image,
  ];
  g.fillStyle = '#fff'; g.fillRect(0, 0, S * 4, S * 4);
  tilesOf.forEach((t, i) => { if (t) g.drawImage(t, (i % 4) * S, (3 - Math.floor(i / 4)) * S, S, S); });
  const map = canvasTex(c); map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const mk = (o) => {
    const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, ...o });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute vec3 aSurf;\nvarying vec3 vSurf;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSurf = aSurf;');
      sh.fragmentShader = 'varying vec3 vSurf;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `
          vec2 gx = dFdx(vMapUv), gy = dFdy(vMapUv); float lod = log2(max(length(gx), length(gy)) * ${S}.0 + 1e-6);
          float mg = min(0.47, pow(2.0, ceil(max(lod, 0.0))) / ${S}.0);
          vec2 tuv = clamp(fract(vMapUv), mg, 1.0 - mg); float ti = floor(vSurf.x + 0.5);
          vec4 sampledDiffuseColor = textureGrad(map, (vec2(mod(ti, 4.0), floor(ti / 4.0)) + tuv) * 0.25, gx * 0.25, gy * 0.25);
          diffuseColor *= sampledDiffuseColor;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurf.y;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurf.z;');
    };
    return m;
  };
  return (MATS = { solid: mk({}), flat: mk({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }) });
}

// =====================================================================================
// Batch: everything of one material that stands for the same years becomes one mesh
// =====================================================================================
class Buf {
  constructor() { this.a = new Float32Array(8192); this.n = 0; }
  room(k) { if (this.n + k > this.a.length) { const b = new Float32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; } }
}
const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), CYL = {}, cylOf = (seg) => CYL[seg] || (CYL[seg] = new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0));
const CONE = {}, coneOf = (seg, k) => CONE[seg + ':' + k] || (CONE[seg + ':' + k] = new THREE.CylinderGeometry(k, 1, 1, seg).translate(0, 0.5, 0));
export class Batch {
  constructor() { this.mats = materials(); this.bins = new Map(); this.span = [-Infinity, Infinity]; this.T = new THREE.Matrix4(); this.stack = []; this.meshes = []; }
  /** What is added from now on stands from year y0 until year y1. */
  when(y0 = -Infinity, y1 = Infinity) { this.span = [y0, y1]; return this; }
  /** Work in a frame at (x, y, z), turned by ry about the vertical (0: local +x is world +x). */
  push(x, y, z, ry = 0) { this.stack.push(this.T.clone()); this.T.multiply(_m2.compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, ry), _s.set(1, 1, 1))); return this; }
  pop() { this.T.copy(this.stack.pop()); return this; }
  /** Add a geometry under matrix m (within the current frame). uv = [su, sv] keeps the geometry's own uv, scaled to metres; otherwise the texture is laid on by position. */
  add(mat, geo, color = 0xffffff, m = null, uv = null) {
    const F = SURF[mat], key = (F[4] ? 'flat' : 'solid') + '|' + this.span[0] + '|' + this.span[1]; let bin = this.bins.get(key);
    if (!bin) this.bins.set(key, bin = { mat: F[4] ? 'flat' : 'solid', y0: this.span[0], y1: this.span[1], p: new Buf(), n: new Buf(), u: new Buf(), c: new Buf(), f: new Buf() });
    const M = _m.copy(this.T); if (m) M.multiply(m); _n3.getNormalMatrix(M);
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color, I = geo.index, cnt = I ? I.count : P.count, c = lin(color), sc = 1 / F[1];
    bin.p.room(cnt * 3); bin.n.room(cnt * 3); bin.c.room(cnt * 3); bin.u.room(cnt * 2); bin.f.room(cnt * 3);
    const p = bin.p.a, n = bin.n.a, cc = bin.c.a, u = bin.u.a, f = bin.f.a; let o = bin.p.n, ou = bin.u.n;
    for (let k = 0; k < cnt; k += 3) {
      const i0 = I ? I.getX(k) : k, i1 = I ? I.getX(k + 1) : k + 1, i2 = I ? I.getX(k + 2) : k + 2;
      _a.fromBufferAttribute(P, i0).applyMatrix4(M); _b.fromBufferAttribute(P, i1).applyMatrix4(M); _c.fromBufferAttribute(P, i2).applyMatrix4(M);
      _n.subVectors(_b, _a).cross(_p.subVectors(_c, _a)); const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z), top = ay >= ax && ay >= az, side = !top && ax > az;
      for (let j = 0; j < 3; j++) {
        const i = j === 0 ? i0 : j === 1 ? i1 : i2, v = j === 0 ? _a : j === 1 ? _b : _c;
        p[o] = v.x; p[o + 1] = v.y; p[o + 2] = v.z; f[o] = F[0]; f[o + 1] = F[2]; f[o + 2] = F[3];
        _n.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); n[o] = _n.x; n[o + 1] = _n.y; n[o + 2] = _n.z;
        cc[o] = c[0] * (C ? C.getX(i) : 1); cc[o + 1] = c[1] * (C ? C.getY(i) : 1); cc[o + 2] = c[2] * (C ? C.getZ(i) : 1);
        if (uv) { u[ou] = U.getX(i) * uv[0] * sc; u[ou + 1] = U.getY(i) * uv[1] * sc; }
        else if (top) { u[ou] = v.x * sc; u[ou + 1] = v.z * sc; } else if (side) { u[ou] = v.z * sc; u[ou + 1] = v.y * sc; } else { u[ou] = v.x * sc; u[ou + 1] = v.y * sc; }
        o += 3; ou += 2;
      }
    }
    bin.p.n = bin.n.n = bin.c.n = bin.f.n = o; bin.u.n = ou; return this;
  }
  /** A geometry placed at (x, y, z): turned by rz, then rx, then ry, and scaled first. */
  geo(mat, col, g, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1, uv = null) {
    return this.add(mat, g, col, new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz)), uv);
  }
  /** A box w × h × d standing on (x, y, z). */
  box(mat, col, w, h, d, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { return this.geo(mat, col, BOX, x, y, z, ry, rx, rz, w, h, d); }
  /** A round (or tapering) drum standing on (x, y, z): radius rt at the top, rb at the foot. */
  cyl(mat, col, rt, rb, h, x = 0, y = 0, z = 0, seg = 12, ry = 0) { return this.geo(mat, col, rt === rb ? cylOf(seg) : coneOf(seg, rt / rb), x, y, z, ry, 0, 0, rb, h, rb); }
  /** A bar of radius r from a to b. */
  rod(mat, col, a, b, r, seg = 6) {
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const l = _a.length();
    return this.add(mat, cylOf(seg), col, new THREE.Matrix4().compose(_p.set(a[0], a[1], a[2]), _q.setFromUnitVectors(UP, _a.normalize()), _s.set(r, l, r)));
  }
  /** A beam with a square section from a to b (level or sloping). */
  beam(mat, col, a, b, w, h = w) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz);
    return this.geo(mat, col, BOX, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h / 2, (a[2] + b[2]) / 2, Math.atan2(-dz, dx), 0, Math.asin(dy / l), l, h, w);
  }
  /** Make the meshes and add them to the group. */
  build(group) {
    for (const bin of this.bins.values()) {
      const g = new THREE.BufferGeometry(), cut = (b, k) => new THREE.BufferAttribute(b.a.slice(0, b.n), k);
      g.setAttribute('position', cut(bin.p, 3)); g.setAttribute('normal', cut(bin.n, 3)); g.setAttribute('color', cut(bin.c, 3)); g.setAttribute('uv', cut(bin.u, 2)); g.setAttribute('aSurf', cut(bin.f, 3));
      const mat = this.mats[bin.mat], mesh = new THREE.Mesh(g, mat); mesh.castShadow = !mat.polygonOffset; mesh.receiveShadow = true;
      this.meshes.push({ mesh, y0: bin.y0, y1: bin.y1 }); group.add(mesh);
    }
    this.bins.clear(); return this;
  }
  update(year) { for (const m of this.meshes) m.mesh.visible = year >= m.y0 && year < m.y1; }
  get triangles() { let n = 0; for (const m of this.meshes) n += m.mesh.geometry.attributes.position.count / 3; return n; }
}

/** A geometry from loose triangles [[x, y, z] × 3 …], flat shaded. */
export function flatGeo(tris) {
  const p = [], n = [];
  for (const [a, b, c] of tris) { _a.set(...a); _b.set(...b); _c.set(...c); _n.subVectors(_b, _a).cross(_p.subVectors(_c, _a)).normalize(); for (const v of [a, b, c]) { p.push(...v); n.push(_n.x, _n.y, _n.z); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); return g;
}
/** A gable: a triangle w wide and h high standing across z, t thick along x (centred). */
export function gableGeo(w, h, t) {
  const a = [-t / 2, 0, -w / 2], b = [-t / 2, 0, w / 2], c = [-t / 2, h, 0], d = [t / 2, 0, -w / 2], e = [t / 2, 0, w / 2], f = [t / 2, h, 0];
  return flatGeo([[a, b, c], [d, f, e], [a, c, f], [a, f, d], [b, e, f], [b, f, c], [a, d, e], [a, e, b]]);
}
const ARCH = {};
/** A wall w × h, t thick, pierced by an arch `aw` wide springing at height `spring` (and from `sill` up, if it is a window). Stands on y = 0 across x, centred. */
export function archGeo(w, h, t, aw, spring, sill = 0) {
  const key = [w, h, t, aw, spring, sill].map((v) => v.toFixed(2)).join(); if (ARCH[key]) return ARCH[key];
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0);
  if (sill > 0) { s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0); const o = new THREE.Path(); o.moveTo(-aw / 2, sill); o.lineTo(-aw / 2, spring); o.absarc(0, spring, aw / 2, Math.PI, 0, true); o.lineTo(aw / 2, sill); o.lineTo(-aw / 2, sill); s.holes.push(o); }
  else { s.lineTo(-aw / 2, 0); s.lineTo(-aw / 2, spring); s.absarc(0, spring, aw / 2, Math.PI, 0, true); s.lineTo(aw / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0); }
  return (ARCH[key] = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 7 }).translate(0, 0, -t / 2));
}

// =====================================================================================
// Columns
// =====================================================================================
const SHAFT = {};
/** A shaft of height 1 and foot radius 1, narrowing with a slight swelling (entasis); fluted if `flutes`. */
function shaftGeo(flutes, taper) {
  const key = flutes + ':' + taper; if (SHAFT[key]) return SHAFT[key];
  const segs = flutes ? flutes * 2 : 12, rings = flutes ? 5 : 4, pos = [], idx = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings, R = 1 - taper * t * (0.55 + 0.45 * t);
    for (let i = 0; i < segs; i++) { const a = (i / segs) * TAU, rr = R * (flutes && i % 2 ? 0.925 : 1); pos.push(Math.cos(a) * rr, t, Math.sin(a) * rr); }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) { const a = j * segs + i, b = j * segs + ((i + 1) % segs), c = a + segs, d = b + segs; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return (SHAFT[key] = g);
}
const ORDER = { doric: { base: 0, cap: 0.42, flutes: 20, taper: 0.2 }, ionic: { base: 0.32, cap: 0.4, flutes: 24, taper: 0.14 }, corinthian: { base: 0.32, cap: 1.05, flutes: 24, taper: 0.13 }, tuscan: { base: 0.3, cap: 0.42, flutes: 0, taper: 0.17 } };
/**
 * A column h high and d thick at the foot, standing on (x, y, z). order: doric | ionic | corinthian | tuscan.
 * o: { ry (which way its face looks), frac (how much of the shaft stands, when unfinished or broken), lo (plain shaft for far ones), band (colour of the painted necking), cap (colour of the capital) }
 */
export function column(B, mat, col, x, y, z, h, d, order = 'doric', o = {}) {
  const O = ORDER[order], r = d / 2, bh = O.base * d, ch = O.cap * d, sh = h - bh - ch, frac = o.frac ?? 1, rt = r * (1 - O.taper), cap = o.cap || col, ry = o.ry || 0;
  if (bh) { B.cyl(mat, col, r * 1.3, r * 1.36, bh * 0.4, x, y, z, 16); B.cyl(mat, col, r * 1.1, r * 1.24, bh * 0.6, x, y + bh * 0.4, z, 16); }
  B.geo(mat, col, shaftGeo(o.lo ? 0 : O.flutes, O.taper), x, y + bh, z, 0, 0, 0, r, sh * frac, r);
  if (frac < 1) return;
  const yc = y + bh + sh;
  if (order === 'doric' || order === 'tuscan') {
    if (o.band) B.cyl(mat, o.band, rt * 1.03, rt * 1.03, ch * 0.14, x, yc - ch * 0.16, z, 16);
    B.cyl(mat, cap, rt * 1.42, rt, ch * 0.52, x, yc, z, 16); B.box(mat, cap, rt * 2.95, ch * 0.48, rt * 2.95, x, yc + ch * 0.52, z, ry);
  } else if (order === 'ionic') {
    B.cyl(mat, cap, rt * 1.2, rt, ch * 0.4, x, yc, z, 16);
    const c = Math.cos(ry), s = Math.sin(ry), vr = ch * 0.36;
    for (const e of [1, -1]) { const ox = s * e * rt * 1.25, oz = c * e * rt * 1.25, fx = c * rt * 1.12, fz = -s * rt * 1.12; B.rod(mat, o.band || cap, [x + ox - fx, yc + ch * 0.36, z + oz - fz], [x + ox + fx, yc + ch * 0.36, z + oz + fz], vr, 10); }
    B.box(mat, cap, rt * 2.3, ch * 0.3, rt * 3.2, x, yc + ch * 0.42, z, ry); B.box(mat, cap, rt * 2.7, ch * 0.24, rt * 2.7, x, yc + ch * 0.74, z, ry);
  } else {
    B.cyl(mat, cap, rt * 1.12, rt * 0.98, ch * 0.9, x, yc, z, 12); B.cyl(mat, cap, rt * 1.36, rt * 1.02, ch * 0.4, x, yc + ch * 0.04, z, 8); B.cyl(mat, cap, rt * 1.6, rt * 1.1, ch * 0.42, x, yc + ch * 0.44, z, 8, 0.39);
    B.box(mat, cap, rt * 3, ch * 0.14, rt * 3, x, yc + ch * 0.86, z, ry);
  }
}

// =====================================================================================
// Footprints: what the visitor cannot walk through (each for its own years)
// =====================================================================================
export class Blocks {
  constructor() { this.list = []; this.year = 0; }
  rect(x, z, hx, hz, ry = 0, y0 = -Infinity, y1 = Infinity) { this.list.push({ x, z, hx, hz, c: Math.cos(ry), s: Math.sin(ry), y0, y1, R: Math.hypot(hx, hz) + 1 }); }
  circle(x, z, r, y0 = -Infinity, y1 = Infinity) { this.list.push({ x, z, r, y0, y1, R: r + 1 }); }
  /** Is (x, z) inside something standing in `year`? (pad widens every footprint.) */
  inside(x, z, year, pad = 0) {
    for (const b of this.list) {
      if (year < b.y0 || year >= b.y1) continue; const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > b.R + pad || Math.abs(dz) > b.R + pad) continue;
      if (b.r) { if (dx * dx + dz * dz < (b.r + pad) ** 2) return b; } else if (Math.abs(dx * b.c - dz * b.s) < b.hx + pad && Math.abs(dx * b.s + dz * b.c) < b.hz + pad) return b;
    }
    return null;
  }
  collide(pos, rad = 0.6) {
    for (const b of this.list) {
      if (this.year < b.y0 || this.year >= b.y1) continue; const dx = pos.x - b.x, dz = pos.z - b.z; if (Math.abs(dx) > b.R || Math.abs(dz) > b.R) continue;
      if (b.r) { const d = Math.hypot(dx, dz), R = b.r + rad; if (d < R && d > 1e-4) { pos.x = b.x + (dx / d) * R; pos.z = b.z + (dz / d) * R; } continue; }
      let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; const px = b.hx + rad - Math.abs(lx), pz = b.hz + rad - Math.abs(lz);
      if (px <= 0 || pz <= 0) continue;
      if (px < pz) lx = Math.sign(lx || 1) * (b.hx + rad); else lz = Math.sign(lz || 1) * (b.hz + rad);
      pos.x = b.x + lx * b.c + lz * b.s; pos.z = b.z - lx * b.s + lz * b.c;
    }
  }
}

// =====================================================================================
// Temples
// =====================================================================================
export const C = {
  marble: 0xdcd7cb, pentelic: 0xe0d5be, poros: 0xc4b48e, tufa: 0x8c775c, travertine: 0xc9bea5, stucco: 0xd4c8ac, mud: 0xa89068, limewash: 0xd6cfbb, brick: 0xb86a48, tile: 0xb5593a, tileOld: 0x9a5a40, tileMarble: 0xe6e0d0,
  blue: 0x1f3f8a, red: 0xa32a1c, gold: 0xd8a83a, bronze: 0x6a5a34, door: 0x4a3420, wood: 0x8a6a44, oldWood: 0x6a5238, dark: 0x1a1612, soot: 0x3a3430, basalt: 0x55565c, earth: 0xa08a64, green: 0x3c6a4a, ochre: 0xc9953c,
};
/** Four beams round a rectangle (x0..x1, −Z..Z) at height y: h high, bw wide. */
function frame(B, mat, col, x0, x1, Z, y, h, bw) {
  B.box(mat, col, bw, h, 2 * Z + bw, x1, y, 0); B.box(mat, col, bw, h, 2 * Z + bw, x0, y, 0);
  B.box(mat, col, x1 - x0 - bw, h, bw, (x0 + x1) / 2, y, Z); B.box(mat, col, x1 - x0 - bw, h, bw, (x0 + x1) / 2, y, -Z);
}
/**
 * A temple with its long axis along local x and its door at +x.
 * o: x, z, ry, y?, w (across), l (along), nf (columns across the front), ns (along a flank, for a peripteral temple), colH, d, order, steps, podium (height; stairs at the front only),
 *    peripteral (columns all round) or porch (rows of columns at the front), mat, col, roofCol, paint: 'greek' | 'roman' | 'plain', stage 0..1 (how far built), ruin 0..1, burnt, rear (a porch at the back too)
 */
export function temple(K, o) {
  const { B, world } = K, r = K.r, { x, z, ry = 0, w, l, nf, ns = 0, colH, d, order = 'doric', steps = 3, podium = 0, peripteral = !podium, porch = 2, mat = 'marble', col = C.marble, roofCol = C.tile, paint = 'greek', stage = 1, ruin = 0, burnt = 0 } = o;
  const y = o.y ?? world.heightAt(x, z), sH = o.sH || 0.42, tread = 0.5, greek = paint === 'greek', stone = burnt ? shade(col, 0.55) : col, dim = shade(stone, 0.86);
  B.push(x, y, z, ry);
  B.box(mat, dim, l + 2 * tread * steps + 0.8, 4, w + 2 * tread * steps + 0.8, 0, -4, 0);
  let Y = 0;
  if (podium) {
    B.box(mat, dim, l + 0.5, 0.5, w + 0.5, 0, 0, 0); B.box(mat, stone, l, podium - 0.3, w, 0, 0, 0); B.box(mat, stone, l + 0.4, 0.3, w + 0.4, 0, podium - 0.3, 0); Y = podium;
    const n = Math.ceil(podium / 0.24), run = 0.36, sw = w * (o.stairW || 0.72);
    for (let k = 0; k < n; k++) B.box(mat, stone, run, ((k + 1) * podium) / n, sw, l / 2 + (n - k - 0.5) * run, 0, 0);
    for (const e of [1, -1]) B.box(mat, stone, n * run, podium, (w - sw) / 2, l / 2 + (n * run) / 2, 0, e * (sw / 2 + (w - sw) / 4));
  }
  for (let i = 0; i < steps; i++) { const e = 2 * tread * (steps - 1 - i); B.box(mat, i % 2 ? stone : dim, l + e, sH, w + e, 0, Y + i * sH, 0); }
  Y += steps * sH;
  const m = d * 0.78, X = l / 2 - m, Z = w / 2 - m, sz = (2 * Z) / (nf - 1), sx = ns > 1 ? (2 * X) / (ns - 1) : sz, built = clamp(stage * 2, 0, 1);
  const band = greek ? C.blue : null, cols = [];
  if (peripteral) { for (let i = 0; i < nf; i++) for (const e of [1, -1]) cols.push([e * X, -Z + i * sz, 0]); for (let j = 1; j < ns - 1; j++) for (const e of [1, -1]) cols.push([-X + j * sx, e * Z, Math.PI / 2]); }
  else {
    for (let k = 0; k < porch; k++) for (let i = 0; i < nf; i++) if (k === 0 || i === 0 || i === nf - 1) cols.push([X - k * sz, -Z + i * sz, 0]);
    if (o.rear) for (let i = 0; i < nf; i++) cols.push([-X, -Z + i * sz, 0]);
  }
  for (const [cx, cz, cr] of cols) {
    let frac = built < 1 ? clamp(built + (r() - 0.5) * 0.5, 0.12, 0.95) : 1; if (ruin && r() < ruin * 0.6) frac = 0.15 + r() * 0.6;
    column(B, mat, burnt ? tone(stone, r, 0.2) : stone, cx, Y, cz, colH, d, order, { ry: cr, frac, band, cap: o.capCol && !burnt ? o.capCol : stone });
  }
  // the room inside
  const xb = peripteral ? -X + sx * 1.5 : o.rear ? -X + sz : -l / 2 + 0.25, xf = peripteral ? X - sx * 1.5 : X - (porch - 1) * sz - sz * 0.55, cz = peripteral ? Z - sz * 0.95 : Z + (o.rear ? 0 : m - 0.3), wt = 0.8, ch = colH * (built < 1 ? 0.25 + 0.6 * built : 1);
  if (o.cella !== false) {
    const wall = burnt ? shade(stone, 0.8) : stone, dw = Math.min(cz * 0.8, 3.4), dh = Math.min(ch - 0.4, colH * 0.72);
    B.box(mat, wall, wt, ch, 2 * cz, xb, Y, 0); B.box(mat, wall, xf - xb, ch, wt, (xf + xb) / 2, Y, cz - wt / 2); B.box(mat, wall, xf - xb, ch, wt, (xf + xb) / 2, Y, -cz + wt / 2);
    for (const e of [1, -1]) B.box(mat, wall, wt, ch, cz - dw / 2, xf, Y, e * (cz + dw / 2) / 2);
    if (ch > dh + 0.2) B.box(mat, wall, wt, ch - dh, dw, xf, Y + dh, 0);
    if (stage >= 1 && !ruin) B.box('wood', greek ? C.bronze : C.door, 0.14, dh, dw, xf - 0.1, Y, 0);
    if (greek && stage >= 1 && !burnt) frame(B, mat, C.blue, xb, xf, cz - wt / 2, Y + ch - d * 0.5, d * 0.4, wt + 0.06);
    if (o.engaged) for (let j = 0; j * sz <= xf - xb - 0.5; j++) for (const e of [1, -1]) column(B, mat, stone, xb + j * sz, Y, e * cz, colH, d, order, { lo: 1, ry: Math.PI / 2 });
  }
  // beams, frieze, cornice
  const x0 = peripteral || o.rear ? -X : xb, x1 = X, yE = Y + colH, aH = d * 0.62, fH = d * 0.62, cH = d * 0.3, ov = d * 0.45, up = stage >= 0.5 && ruin < 0.6;
  if (up) {
    frame(B, mat, stone, x0, x1, Z, yE, aH, d * 0.86);
    if (!burnt && paint !== 'plain') frame(B, mat, greek ? C.red : C.gold, x0, x1, Z, yE + aH - d * 0.07, d * 0.07, d * 0.92);
    frame(B, mat, greek && order !== 'doric' && !burnt ? shade(C.blue, 1.2) : stone, x0, x1, Z, yE + aH, fH, d * 0.8);
    if (order === 'doric' && paint !== 'plain') {
      const tri = burnt ? C.soot : greek ? C.blue : shade(stone, 0.8), tw = d * 0.42;
      for (let k = 0; k <= (nf - 1) * 2; k++) for (const e of [x0, x1]) B.box(mat, tri, d * 0.9, fH, tw, e, yE + aH, -Z + (k * sz) / 2);
      const nfl = Math.round((x1 - x0) / (sx / 2)); for (let k = 1; k < nfl; k++) for (const e of [1, -1]) B.box(mat, tri, tw, fH, d * 0.9, x0 + (k * (x1 - x0)) / nfl, yE + aH, e * Z);
    } else if (paint === 'roman' && !burnt) B.box('metal', C.bronze, 0.1, fH * 0.45, Z * 1.3, x1 + d * 0.4, yE + aH + fH * 0.28, 0);
    B.box(mat, stone, x1 - x0 + 2 * ov + d * 0.8, cH, 2 * Z + 2 * ov + d * 0.8, (x0 + x1) / 2, yE + aH + fH, 0);
    if (!burnt && paint !== 'plain') frame(B, mat, greek ? C.red : C.gold, x0 - ov, x1 + ov, Z + ov, yE + aH + fH + cH, d * 0.06, d * 0.82);
  }
  // pediments and roof
  if (up && stage >= 0.8 && !ruin) {
    const p = greek ? 0.26 : 0.38, S = Z + ov + d * 0.4, rh = S * Math.tan(p), yR = yE + aH + fH + cH, L = x1 - x0 + 2 * ov + d * 0.8, xc = (x0 + x1) / 2;
    for (const e of [1, -1]) {
      const px = e > 0 ? x1 + ov : x0 - ov;
      B.geo(mat, stone, gableGeo(2 * S, rh, 0.6), px, yR, 0);
      if (paint !== 'plain' && !burnt) {
        B.geo(mat, greek ? C.blue : shade(stone, 0.9), gableGeo(2 * S * 0.84, rh * 0.84, 0.1), px + e * 0.3, yR + rh * 0.05, 0);
        if (greek || o.sculpture) for (let k = -4; k <= 4; k++) { const fz = (k / 5) * S * 0.84, fh = (rh * 0.84 - Math.abs(fz) * Math.tan(p)) * 0.82; if (fh > 0.25) { B.box(mat, k % 2 ? C.pentelic : shade(C.gold, 1.1), 0.3, fh, Math.min(0.7, fh * 0.45), px + e * 0.42, yR + rh * 0.05, fz); B.geo(mat, C.pentelic, BALL, px + e * 0.42, yR + rh * 0.05 + fh, fz, 0, 0, 0, 0.16, 0.18, 0.16); } }
      }
      const gold = stage >= 1 ? (burnt ? C.soot : C.gold) : stone;
      B.cyl('metal', gold, 0.05, d * 0.32, d * 1.1, px, yR + rh, 0, 6); for (const q of [1, -1]) B.cyl('metal', gold, 0.05, d * 0.24, d * 0.7, px, yR + 0.1, q * S * 0.96, 6);
    }
    const sl = S / Math.cos(p) + 0.25;
    for (const e of [1, -1]) B.geo('tile', roofCol, BOX, xc, yR + rh / 2 + 0.02, (e * S) / 2, 0, e * p, 0, L, 0.2, sl, [L, sl]);
    B.rod('tile', shade(roofCol, 0.85), [xc - L / 2, yR + rh + 0.2, 0], [xc + L / 2, yR + rh + 0.2, 0], 0.16, 6);
  } else if (ruin && up) for (let k = 0; k < 6; k++) B.box(mat, shade(stone, 0.7), 1 + r() * 2, 0.5 + r() * 0.6, 0.8 + r(), (r() - 0.5) * l * 0.8, Y, (r() - 0.5) * w * 0.7, r() * 3);
  B.pop();
  const ext = tread * steps + 0.3 + (podium ? 0.2 : 0);
  if (!o.pass) K.C.rect(x, z, l / 2 + ext, w / 2 + ext, ry, ...B.span);
  if (podium) { const n = Math.ceil(podium / 0.24) * 0.36; K.C.rect(x + Math.cos(ry) * (l / 2 + n / 2), z - Math.sin(ry) * (l / 2 + n / 2), n / 2, w / 2, ry, ...B.span); }
  return { top: y + Y, yE: y + Y + colH, X, Z };
}
const BALL = new THREE.SphereGeometry(1, 8, 6);
export { BALL, BOX };

// =====================================================================================
// A stoa: a long hall open through a colonnade on its +z side
// =====================================================================================
/** o: x, z, ry, l, dp (depth), colH, d, order, n (columns), mat, col, roofCol, wall (colour of the back wall), panels (painted pictures on the back wall), inner (a second row of columns), steps */
export function stoa(K, o) {
  const { B, world } = K, { x, z, ry = 0, l, dp, colH = 5, d = 0.75, order = 'doric', mat = 'marble', col = C.marble, roofCol = C.tile, wall = C.limewash, steps = 2 } = o, y = o.y ?? world.heightAt(x, z);
  const n = o.n || Math.round(l / (d * 3.4)), sH = 0.3, Y = steps * sH, dim = shade(col, 0.85);
  B.push(x, y, z, ry);
  B.box(mat, dim, l + 1.2, 3, dp + 1.2, 0, -3, 0);
  for (let i = 0; i < steps; i++) B.box(mat, i % 2 ? col : dim, l + (steps - 1 - i) * 0.8, sH, dp + (steps - 1 - i) * 0.8, 0, i * sH, 0);
  B.box('plaster', wall, l, colH, 0.6, 0, Y, -dp / 2 + 0.3); for (const e of [1, -1]) B.box('plaster', wall, 0.6, colH, dp * (o.open ? 0.5 : 1) - 0.6, e * (l / 2 - 0.3), Y, o.open ? -dp / 4 : 0);
  B.box('plaster', o.dado || shade(C.red, 0.9), l - 1.3, 1.1, 0.06, 0, Y, -dp / 2 + 0.62);
  if (o.panels) for (let k = 0; k < o.panels; k++) { const px = (k + 0.5 - o.panels / 2) * (l / o.panels); B.box('wood', C.wood, l / o.panels - 0.8, 2.3, 0.08, px, Y + 1.5, -dp / 2 + 0.63); B.box('plaster', [C.ochre, C.red, C.blue, C.green][k % 4], l / o.panels - 1.1, 2, 0.05, px, Y + 1.65, -dp / 2 + 0.68); B.box('plaster', C.stucco, (l / o.panels - 1.1) * 0.5, 1.1, 0.03, px + 0.4, Y + 1.9, -dp / 2 + 0.71); }
  const zf = dp / 2 - d * 0.7, xs = l / 2 - d * 0.7;
  for (let i = 0; i < n; i++) column(B, mat, col, -xs + (i * 2 * xs) / (n - 1), Y, zf, colH, d, order, { ry: -Math.PI / 2, band: o.band });
  if (o.inner) for (let i = 1; i < n - 1; i += 2) column(B, mat, col, -xs + (i * 2 * xs) / (n - 1), Y, 0, colH * 1.25, d * 0.9, 'ionic', { ry: -Math.PI / 2, lo: 1 });
  const aH = d * 0.6, yE = Y + colH;
  B.box(mat, col, l, aH, d * 0.85, 0, yE, zf); B.box(mat, o.frieze || col, l, aH, d * 0.8, 0, yE + aH, zf); B.box(mat, col, l + 0.6, d * 0.25, d * 1.5, 0, yE + 2 * aH, zf);
  if (order === 'doric') for (let k = 0; k <= (n - 1) * 2; k++) B.box(mat, o.tri || C.blue, d * 0.4, aH, d * 0.9, -xs + (k * xs) / (n - 1), yE + aH, zf);
  B.box('plaster', wall, l, 2 * aH + d * 0.25, 0.6, 0, yE, -dp / 2 + 0.3);
  let yR = yE + 2 * aH + d * 0.25;
  if (o.upper) {   // a second, lighter storey
    const h2 = o.upper; B.box('wood', C.oldWood, l, 0.3, dp - 0.6, 0, yR - 0.3, 0);
    for (let i = 0; i < n; i++) column(B, mat, col, -xs + (i * 2 * xs) / (n - 1), yR, zf, h2, d * 0.72, 'ionic', { ry: -Math.PI / 2, lo: 1 });
    B.box(mat, col, l, 0.9, 0.2, 0, yR, zf); B.box('plaster', wall, l, h2 + aH, 0.6, 0, yR, -dp / 2 + 0.3); for (const e of [1, -1]) B.box('plaster', wall, 0.6, h2 + aH, dp - 0.6, e * (l / 2 - 0.3), yR, 0);
    B.box(mat, col, l + 0.4, aH, d * 0.8, 0, yR + h2, zf); yR += h2 + aH;
  }
  const p = 0.3, S = dp / 2 + 0.5, rh = S * Math.tan(p), sl = S / Math.cos(p) + 0.2;
  for (const e of [1, -1]) { B.geo('tile', roofCol, BOX, 0, yR + rh / 2, (e * S) / 2, 0, e * p, 0, l + 1, 0.18, sl, [l + 1, sl]); B.geo('plaster', wall, gableGeo(dp, rh, 0.6), e * (l / 2 - 0.3), yR, 0); }
  B.box('wood', C.oldWood, l, 0.25, dp - 1, 0, yR - 0.25, 0);
  B.pop(); K.C.rect(x, z, l / 2 + 0.6, dp / 2 + 0.6, ry, ...B.span);
}

// =====================================================================================
// Houses
// =====================================================================================
/** A plain house: w along local x, dp deep, door on +z. o: h, roof 'tile' | 'flat' | 'thatch', wall (colour), wmat, roofCol, wing (a second block making an L), yard */
export function house(K, o) {
  const { B, world, r } = K, { x, z, ry = 0, w, dp, h = 3, roof = 'tile', wmat = 'plaster', wall = C.limewash, roofCol = C.tile } = o, y = o.y ?? world.heightAt(x, z);
  B.push(x, y, z, ry);
  B.box('cyclop', shade(C.poros, 0.8), w + 0.16, 2.5, dp + 0.16, 0, -1.9, 0); B.box(wmat, wall, w, h, dp, 0, 0.5, 0);
  B.box('wood', C.door, 1, 1.9, 0.1, (r() - 0.5) * w * 0.4, 0.5, dp / 2 + 0.02); B.box(wmat, shade(wall, 0.9), 1.3, 0.14, 0.2, 0, 2.42, dp / 2 + 0.04);
  for (const e of [-1, 1]) if (r() < 0.7) B.box('wood', C.dark, 0.5, 0.5, 0.08, e * w * 0.33, h - 0.6, dp / 2 + 0.01);
  if (r() < 0.6) B.box('wood', C.dark, 0.08, 0.5, 0.5, w / 2 + 0.01, h - 0.6, (r() - 0.5) * dp * 0.5);
  const top = 0.5 + h;
  if (roof === 'flat') { B.box(wmat, shade(wall, 0.92), w + 0.3, 0.3, dp + 0.3, 0, top, 0); for (let k = 0; k < 5; k++) B.rod('wood', C.oldWood, [-w / 2 + (k + 0.5) * (w / 5), top - 0.12, dp / 2], [-w / 2 + (k + 0.5) * (w / 5), top - 0.12, dp / 2 + 0.35], 0.07, 5); }
  else {
    const p = roof === 'thatch' ? 0.8 : 0.36, S = dp / 2 + 0.4, rh = S * Math.tan(p), sl = S / Math.cos(p) + 0.1, rm = roof === 'thatch' ? 'thatch' : 'tile';
    for (const e of [1, -1]) { B.geo(rm, roofCol, BOX, 0, top + rh / 2 - 0.06, (e * S) / 2, 0, e * p, 0, w + 0.7, roof === 'thatch' ? 0.3 : 0.14, sl, [w + 0.7, sl]); B.geo(wmat, wall, gableGeo(dp, rh, 0.3), e * (w / 2 - 0.15), top, 0); }
    B.rod(rm, shade(roofCol, 0.8), [-w / 2 - 0.35, top + rh + 0.08, 0], [w / 2 + 0.35, top + rh + 0.08, 0], 0.12, 5);
  }
  if (o.yard) {   // a walled court in front, with a gate
    const yd = o.yard, wc = shade(wall, 0.94);
    for (const e of [1, -1]) B.box(wmat, wc, 0.4, 2.2, yd, e * (w / 2 - 0.2), 0, dp / 2 + yd / 2);
    for (const e of [1, -1]) B.box(wmat, wc, w / 2 - 0.9, 2.2, 0.4, e * (w / 4 + 0.45), 0, dp / 2 + yd - 0.2);
    B.box('wood', C.door, 1.8, 0.25, 0.5, 0, 2.05, dp / 2 + yd - 0.2);
    if (o.shed) { B.box('tile', roofCol, w * 0.45, 0.12, yd * 0.7, -w * 0.26, 2.3, dp / 2 + yd * 0.4, 0, 0, 0.12); for (const q of [0.15, 0.6]) B.rod('wood', C.wood, [-w * 0.05, 0, dp / 2 + yd * q], [-w * 0.05, 2.3, dp / 2 + yd * q], 0.08, 5); }
  }
  B.pop(); K.C.rect(x + Math.sin(ry) * ((o.yard || 0) / 2), z + Math.cos(ry) * ((o.yard || 0) / 2), w / 2 + 0.2, dp / 2 + (o.yard || 0) / 2 + 0.2, ry, ...B.span);
}

// =====================================================================================
// Building sites: scaffolding, cranes, blocks and drums waiting to go up
// =====================================================================================
/** Scaffolding along the line a → b (each [x, z], local), h high, standing `out` clear of it on the left of a → b. */
export function scaffold(K, a, b, h, y = 0, out = 1.1) {
  const { B, r } = K, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = uz, nz = -ux, n = Math.max(2, Math.round(L / 2.6)), W = C.wood;
  const at = (t, o) => [a[0] + ux * t + nx * o, a[1] + uz * t + nz * o];
  for (let i = 0; i <= n; i++) for (const o of [0.25, out + 0.25]) { const [px, pz] = at((i / n) * L, o); B.rod('wood', tone(W, r), [px, y, pz], [px, y + h + 0.6 + r() * 0.8, pz], 0.07, 5); }
  for (let lv = 1; lv * 2.1 <= h + 0.1; lv++) {
    const yy = y + lv * 2.1;
    for (const o of [0.25, out + 0.25]) { const p = at(-0.3, o), q = at(L + 0.3, o); B.rod('wood', W, [p[0], yy, p[1]], [q[0], yy, q[1]], 0.055, 5); }
    for (let i = 0; i <= n; i++) { const p = at((i / n) * L, 0.05), q = at((i / n) * L, out + 0.5); B.rod('wood', W, [p[0], yy + 0.06, p[1]], [q[0], yy + 0.06, q[1]], 0.05, 5); }
    if (lv % 2 === 0 || lv * 2.1 > h - 2.2) { const c = at(L / 2, out / 2 + 0.25); B.box('wood', tone(C.wood, r), L, 0.06, out - 0.1, c[0], yy + 0.11, c[1], Math.atan2(-uz, ux)); }
  }
  for (let i = 0; i < n; i += 2) { const p = at((i / n) * L, out + 0.25), q = at(((i + 1) / n) * L, out + 0.25); B.rod('wood', W, [p[0], y, p[1]], [q[0], y + Math.min(h, 4.2), q[1]], 0.045, 5); }
}
/** A two-legged lifting frame with a windlass (or a treadwheel `wheel` metres across), a block hanging from its head. */
export function crane(K, x, y, z, ry, h = 9, wheel = 0) {
  const { B } = K, W = C.wood; B.push(x, y, z, ry);
  const head = [h * 0.42, h * 0.9, 0];
  for (const e of [1, -1]) B.rod('wood', W, [0, 0, e * h * 0.22], head, 0.11, 6);
  B.rod('wood', W, [0.9, h * 0.3, -h * 0.15], [0.9, h * 0.3, h * 0.15], 0.07, 5);
  B.rod('wood', C.stucco, head, [-h * 0.9, 0, h * 0.35], 0.02, 4); B.rod('wood', C.stucco, head, [-h * 0.9, 0, -h * 0.35], 0.02, 4);
  B.rod('wood', C.stucco, head, [head[0], h * 0.34, 0], 0.025, 4); B.box('marble', C.pentelic, 1.1, 0.8, 0.9, head[0], h * 0.34 - 0.8, 0);
  B.rod('wood', C.stucco, head, [0.3, 1, 0], 0.02, 4);
  if (wheel) { B.geo('wood', W, TORUS, -0.4, wheel / 2 + 0.2, 0, 0, 0, 0, wheel / 2, wheel / 2, 1.1); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI; B.rod('wood', W, [-0.4 - Math.cos(a) * wheel / 2, wheel / 2 + 0.2 - Math.sin(a) * wheel / 2, 0], [-0.4 + Math.cos(a) * wheel / 2, wheel / 2 + 0.2 + Math.sin(a) * wheel / 2, 0], 0.05, 4); } B.rod('wood', W, [-0.4, wheel / 2 + 0.2, -0.9], [-0.4, wheel / 2 + 0.2, 0.9], 0.09, 6); for (const e of [1, -1]) B.rod('wood', W, [-0.4, 0, e * 0.85], [-0.4, wheel / 2 + 0.2, e * 0.85], 0.08, 5); }
  else { B.rod('wood', W, [0.3, 1, -0.7], [0.3, 1, 0.7], 0.1, 6); for (const e of [1, -1]) { B.rod('wood', W, [0.3, 0, e * 0.6], [0.3, 1.1, e * 0.6], 0.07, 5); B.rod('wood', W, [0.3, 0.55, e * 0.75], [0.3, 1.45, e * 0.75], 0.03, 4); } }
  B.pop();
}
const TORUS = new THREE.TorusGeometry(1, 0.06, 5, 20).scale(1, 1, 5);

// =====================================================================================
// Ground laid over the terrain: paving, bare rock, beaten earth
// =====================================================================================
/**
 * A sheet following the ground over (x0..x1, z0..z1) in cells of `res` metres. fn(x, z) → null to leave a gap, or [lift, colour].
 * The terrain is drawn as flat 10 m triangles, so a thin sheet only lies true on level or evenly sloping ground; give uneven ground a lift of a metre or more.
 */
export function drape(B, world, mat, x0, z0, x1, z1, res, fn) {
  const nx = Math.ceil((x1 - x0) / res), nz = Math.ceil((z1 - z0) / res), V = [], p = [], n = [], c = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz, f = fn(x, z); V.push(f ? [x, world.heightAt(x, z) + f[0], z, lin(f[1])] : null); }
  const N = (a, b, cc) => { _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]); return _a.cross(_b).normalize(); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = V[j * (nx + 1) + i], b = V[j * (nx + 1) + i + 1], d = V[(j + 1) * (nx + 1) + i], e = V[(j + 1) * (nx + 1) + i + 1]; if (!a || !b || !d || !e) continue;
    for (const [q, s, t] of [[a, d, b], [b, d, e]]) { const nn = N(q, s, t); for (const v of [q, s, t]) { p.push(v[0], v[1], v[2]); n.push(nn.x, nn.y, nn.z); c.push(v[3][0], v[3][1], v[3][2]); } }
  }
  if (!p.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const T = B.T.clone(); B.T.identity(); B.add(mat, g); B.T.copy(T);
}

// =====================================================================================
// Trees of the Mediterranean, as plain instanced fields that come and go with the years
// =====================================================================================
let KINDS;
function treeKinds() {
  if (KINDS) return KINDS;
  const T = shared(), X = floraTextures(), bark = new THREE.MeshStandardMaterial({ roughness: 0.95, map: T.barkMap, normalMap: T.barkNormal, color: 0x7d6e5c });
  const broad = leafMat(X.elm, { sway: 0.008 }), needle = leafMat(X.conifer, { sway: 0.006 });
  const B4 = [[0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5]], PINE = [[0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]];
  const mk = (seed, S, len, rad, F, mat) => { const r = rng(seed), wood = new Builder(), leaves = new Builder(), tips = []; grow(wood, tips, r, S, [0, -0.3, 0], norm((r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2), len, rad); foliage(leaves, tips, r, F); return [{ geo: wood.build(), mat: bark }, { geo: leaves.build(), mat, leaf: true }]; };
  const twig = { segs: 1, sides: 0, taper: 0.3, wob: 0.6, tufts: 3 };
  const olive = [{ segs: 3, sides: 8, taper: 0.75, wob: 0.3, kids: 5, from: 0.45, ang: [0.7, 1.2], ratio: 1.25, rr: 0.6, lead: 0.9, flare: 1.5 }, { segs: 3, sides: 4, taper: 0.45, wob: 0.4, up: 0.08, kids: 3, from: 0.3, ang: [0.5, 1.0], lift: 0.2, ratio: 0.62, rr: 0.6, lead: 0.6 }, { segs: 2, sides: 3, taper: 0.4, wob: 0.4, kids: 2, from: 0.3, ang: [0.5, 0.9], ratio: 0.6, rr: 0.6, lead: 0.6 }, twig];
  const cypress = [{ segs: 8, sides: 6, taper: 0.12, wob: 0.02, kids: 30, from: 0.07, ang: [0.22, 0.4], ratio: 0.17, fall: 0.55, rr: 0.3, lead: 0.05 }, { segs: 2, sides: 3, taper: 0.4, wob: 0.15, up: 0.25, kids: 2, from: 0.3, ang: [0.2, 0.4], ratio: 0.5, rr: 0.6, lead: 0.5 }, { ...twig, wob: 0.3 }];
  const pine = [{ segs: 6, sides: 8, taper: 0.55, wob: 0.05, kids: 8, from: 0.8, ang: [1.0, 1.4], ratio: 0.42, rr: 0.5, lead: 0.12 }, { segs: 3, sides: 4, taper: 0.4, wob: 0.25, up: 0.12, kids: 4, from: 0.3, ang: [0.5, 1.0], ratio: 0.55, rr: 0.6, lead: 0.5 }, { ...twig, tufts: 4 }];
  return (KINDS = {
    olive: mk(5, olive, 1.7, 0.3, { size: 1.5, wide: 0.9, droop: -0.1, spread: 0.9, cells: B4 }, broad), oliveB: mk(6, olive, 1.3, 0.36, { size: 1.4, wide: 0.9, droop: -0.2, spread: 1, cells: B4 }, broad),
    cypress: mk(7, cypress, 11, 0.24, { size: 1.5, wide: 0.75, droop: 0.5, spread: 0.35, cells: B4 }, broad),
    pine: mk(9, pine, 11, 0.3, { size: 2.6, wide: 0.9, droop: 0.15, spread: 0.7, cells: PINE }, needle),
    shrub: mk(12, [{ segs: 2, sides: 4, taper: 0.5, wob: 0.4, kids: 6, from: 0.1, ang: [0.6, 1.2], ratio: 0.8, rr: 0.7, lead: 0.6 }, twig], 0.8, 0.07, { size: 1.0, wide: 0.95, droop: 0, spread: 0.9, cells: B4 }, broad),
  });
}
/** items: [{ kind, x, z, s, rot?, tint?, y0?, y1? }]. Returns { update(year) }. */
export function trees(world, group, items, seed = 3) {
  const K = treeKinds(), r = rng(seed), sets = [], CH = 700;
  const by = new Map(); for (const it of items) { const key = it.kind + ':' + Math.floor(it.x / CH) + ':' + Math.floor(it.z / CH); if (!by.has(key)) by.set(key, []); by.get(key).push(it); }
  for (const [key, list] of by) {
    const parts = K[key.split(':')[0]], meshes = parts.map((p) => { const m = new THREE.InstancedMesh(p.geo, p.mat, list.length); m.castShadow = m.receiveShadow = true; return m; });
    let cx = 0, cz = 0; for (const it of list) { cx += it.x / list.length; cz += it.z / list.length; it.rot ??= r() * TAU; it.y0 ??= -Infinity; it.y1 ??= Infinity; }
    let R = 0; for (const it of list) R = Math.max(R, Math.hypot(it.x - cx, it.z - cz));
    const sphere = new THREE.Sphere(new THREE.Vector3(cx, world.heightAt(cx, cz), cz), R + 30);
    list.forEach((it, i) => meshes.forEach((m, k) => m.setColorAt(i, parts[k].leaf ? _col.setRGB(...(it.tint || [1, 1, 1])) : _col.setRGB(1, 1, 1))));
    for (const m of meshes) { m.boundingSphere = sphere; m.instanceMatrix = meshes[0].instanceMatrix; group.add(m); }
    sets.push({ list, meshes, key: -1 });
  }
  return { update(year) {
    for (const S of sets) {
      let key = 0; for (let i = 0; i < S.list.length; i++) if (year >= S.list[i].y0 && year < S.list[i].y1) key += i + 1;
      if (key === S.key) continue; S.key = key;
      S.list.forEach((it, i) => { const on = year >= it.y0 && year < it.y1, s = on ? it.s : 0; S.meshes[0].setMatrixAt(i, _m.compose(_p.set(it.x, world.heightAt(it.x, it.z) - 0.08, it.z), _q.setFromAxisAngle(UP, it.rot), _s.set(s, s, s))); });
      S.meshes[0].instanceMatrix.needsUpdate = true; for (const m of S.meshes) m.visible = key > 0;
    }
  } };
}

// =====================================================================================
// Beasts: animals that circle a spot, or walk a looping track (and may draw a cart)
// =====================================================================================
/** Turn a path into a loop description: { pts, cum, L }. */
export function loopOf(path) { const pts = path.slice(); if (Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) > 1e-3) pts.push(pts[0]); const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }
function onLoop(P, d, out) { d = ((d % P.L) + P.L) % P.L; let i = 0; while (i < P.cum.length - 2 && P.cum[i + 1] < d) i++; const t = (d - P.cum[i]) / (P.cum[i + 1] - P.cum[i] || 1), a = P.pts[i], b = P.pts[i + 1]; out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; return out; }
/** The same path shifted sideways by `off` metres (to the right of the way it runs). */
export function beside(path, off) {
  const n = path.length, closed = Math.hypot(path[0][0] - path[n - 1][0], path[0][1] - path[n - 1][1]) < 1e-3, m = closed ? n - 1 : n, out = [];
  for (let i = 0; i < m; i++) {
    const a = path[closed ? (i - 1 + m) % m : Math.max(0, i - 1)], b = path[closed ? (i + 1) % m : Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    out.push([path[i][0] - (dz / l) * off, path[i][1] + (dx / l) * off]);
  }
  if (closed) out.push(out[0]); return out;
}
const _o = [0, 0], _o2 = [0, 0];
export class Beasts {
  constructor(world, group) { this.world = world; this.group = group; this.list = []; this.r = rng(99); }
  /** n animals circling near (cx, cz). */
  circle(make, n, y0, y1, { cx = 0, cz = 0, spread = 100, R = [15, 40], speed = 1.2, fly = 0, scale = [0.9, 1.1] } = {}) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const a = make(), sc = scale[0] + r() * (scale[1] - scale[0]), Rr = R[0] + r() * (R[1] - R[0]), v = speed * (0.8 + r() * 0.4), g = a.def.gait; a.obj.scale.setScalar(sc);
      this.list.push({ ...a, cx: cx + (r() * 2 - 1) * spread, cz: cz + (r() * 2 - 1) * spread, R: Rr, w: (v / Rr) * (r() < 0.5 ? -1 : 1), gait: (TAU * g.duty * v) / (g.stride * sc), half: a.def.half * sc, flap: a.def.flight && a.def.flight.rate * (0.85 + r() * 0.3), ph: r() * 6.28, y0, y1, fly: fly && fly * (0.6 + r() * 0.8), in: false });
    }
  }
  /** One animal walking the loop `path` at `speed`, starting `phase` (0..1) of the way round plus `lead` metres; tow: { obj, back, wheels, wr } follows `back` metres behind. */
  trail(make, path, speed, phase, y0, y1, { lead = 0, scale = 1, tow = null } = {}) {
    const a = make(), g = a.def.gait; a.obj.scale.setScalar(scale);
    const it = { ...a, P: loopOf(path), speed, d0: phase, lead, gait: (TAU * g.duty * speed) / (g.stride * scale), ph: this.r() * 6.28, y0, y1, in: false, tow }; this.list.push(it); return it;
  }
  update(year, t) {
    animTime.value = t; const W = this.world;
    for (const a of this.list) {
      const vis = year >= a.y0 && year < a.y1;
      if (vis !== a.in) { a.in = vis; if (vis) { this.group.add(a.obj); if (a.tow) this.group.add(a.tow.obj); } else { this.group.remove(a.obj); if (a.tow) this.group.remove(a.tow.obj); } }
      if (!vis) continue;
      if (a.P) {
        const d = a.d0 * a.P.L + a.speed * t + a.lead; onLoop(a.P, d, _o); onLoop(a.P, d + 0.5, _o2);
        a.obj.position.set(_o[0], W.heightAt(_o[0], _o[1]), _o[1]); a.obj.rotation.y = Math.atan2(-(_o2[1] - _o[1]), _o2[0] - _o[0]);
        if (a.tow) { const T = a.tow; onLoop(a.P, d - T.back, _o); onLoop(a.P, d - T.back + 0.8, _o2); T.obj.position.set(_o[0], W.heightAt(_o[0], _o[1]), _o[1]); T.obj.rotation.y = Math.atan2(-(_o2[1] - _o[1]), _o2[0] - _o[0]); if (T.wheels) T.wheels.rotation.z = -d / T.wr; }
        pose(a, t * a.gait + a.ph, t); continue;
      }
      const ang = a.ph + t * a.w, c = Math.cos(ang), sn = Math.sin(ang), x = a.cx + c * a.R, z = a.cz + sn * a.R, s = Math.sign(a.w), dx = -sn * s, dz = c * s;
      a.obj.rotation.y = Math.atan2(-dz, dx);
      if (a.fly) { a.obj.position.set(x, a.fly + Math.sin(t * 0.4 + a.ph) * 4 + Math.max(0, W.heightAt(x, z)), z); a.obj.rotation.z = Math.cos(t * 0.4 + a.ph) * 0.08; a.obj.rotation.x = s * 0.3; }
      else { const yf = W.heightAt(x + dx * a.half, z + dz * a.half), yb = W.heightAt(x - dx * a.half, z - dz * a.half); a.obj.position.set(x, (yf + yb) / 2, z); a.obj.rotation.z = Math.atan2(yf - yb, a.half * 2); }
      pose(a, t * a.gait + a.ph, t);
    }
  }
}

/** A two-wheeled cart with a pole, to be drawn by an animal: { obj, wheels, wr, back }. load: 'jars' | 'stone' | 'sacks' | 'hay'. */
export function cart(load = 'jars', seed = 1) {
  const r = rng(seed), W = 0x8a6a44, D = 0x5a4630, wr = 0.62, parts = [];
  parts.push(ubox(2.3, 0.08, 1.2, W, 0, wr + 0.12, 0), ubox(0.1, 0.1, 1.3, D, 0, wr, 0));
  for (const e of [1, -1]) { parts.push(ubox(2.3, 0.07, 0.07, D, 0, wr + 0.6, e * 0.6)); for (let k = -2; k <= 2; k++) parts.push(ubox(0.06, 0.5, 0.06, D, k * 0.52, wr + 0.38, e * 0.6)); }
  parts.push(ucyl(0.045, 0.055, 2.5, D, 2.3, wr + 0.2, 0, 6, 0, 0, Math.PI / 2 - 0.06), ubox(0.08, 0.08, 1.3, D, 3.45, wr + 0.3, 0));
  if (load === 'jars') for (let i = 0; i < 8; i++) { const x = -0.85 + (i % 4) * 0.55, z = i < 4 ? -0.28 : 0.28; parts.push(ucyl(0.12, 0.2, 0.5, 0xb06a40, x, wr + 0.42, z, 8), ucyl(0.07, 0.12, 0.25, 0xb06a40, x, wr + 0.78, z, 8)); }
  else if (load === 'stone') parts.push(ubox(1.3, 0.6, 0.9, 0xe8e0cc, -0.1, wr + 0.46, 0), ubox(0.7, 0.4, 0.6, 0xddd4c0, 0.1, wr + 0.96, 0.05));
  else if (load === 'hay') parts.push(ubox(2.1, 0.8, 1.1, 0xc8a850, 0, wr + 0.56, 0), ubox(1.6, 0.4, 0.9, 0xbfa048, 0, wr + 1.16, 0));
  else for (let i = 0; i < 6; i++) parts.push(ucyl(0.2, 0.24, 0.75, 0xb8a47c, -0.8 + (i % 3) * 0.75, wr + 0.38 + (i > 2 ? 0.36 : 0), (r() - 0.5) * 0.3, 7, Math.PI / 2, 0, 0));
  const mat = vcMat({ flatShading: true, roughness: 0.9 }), body = new THREE.Mesh(merge(parts), mat), wp = [];
  for (const e of [1, -1]) { wp.push(ucyl(wr, wr, 0.09, D, 0, 0, e * 0.72, 16, Math.PI / 2), ucyl(0.1, 0.1, 0.2, D, 0, 0, e * 0.72, 8, Math.PI / 2)); for (let k = 0; k < 2; k++) wp.push(ubox(wr * 1.9, 0.09, 0.11, W, 0, 0, e * 0.72, 0, 0, (k * Math.PI) / 2 + 0.4)); }
  const wheels = new THREE.Mesh(merge(wp), mat); wheels.position.y = wr;
  const obj = new THREE.Group(); obj.add(body, wheels); body.castShadow = wheels.castShadow = true;
  return { obj, wheels, wr, back: 3.3 };
}

// =====================================================================================
// Boats
// =====================================================================================
/** A wooden hull, bow at +x: len, beam, depth; sheer lifts the ends. Returns triangles' geometry with normals (for Batch.add). */
export function hullGeo(len, beam, depth, { sheer = 0.5, stern = 0.6, n = 12 } = {}) {
  const st = [], sec = 5;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = (t - 0.5) * len, w = (beam / 2) * Math.pow(Math.sin(Math.PI * clamp(0.04 + t * 0.92, 0, 1)), 0.6) * (t < 0.5 ? 1 : 1 - 0.25 * (t - 0.5) * 2), up = sheer * Math.pow(Math.abs(t - 0.5) * 2, 2.2) * (t < 0.5 ? stern / 0.5 : 1), ring = [];
    for (let k = 0; k <= sec * 2; k++) { const a = (k / (sec * 2)) * Math.PI, c = Math.cos(a), s = Math.sin(a); ring.push([x, depth + up - depth * Math.pow(s, 0.7), -c * w * (0.55 + 0.45 * (1 - s * 0.6))]); }
    st.push(ring);
  }
  const tris = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < sec * 2; k++) { const a = st[i][k], b = st[i + 1][k], c = st[i][k + 1], d = st[i + 1][k + 1]; tris.push([a, b, c], [b, d, c], [a, c, b], [b, c, d]); }
  const g = flatGeo(tris); return g;
}

/** A standing figure h high on a pedestal `base` high: bronze or painted marble. o: { mat, col, baseCol, spear, shield, robe (colour) } */
export function statue(K, x, y, z, ry, h, o = {}) {
  const { B } = K, mat = o.mat || 'metal', col = o.col || C.bronze, b = o.base ?? h * 0.5, k = h / 1.75;
  B.push(x, y, z, ry);
  if (b) { B.box('marble', o.baseCol || C.marble, 0.9 * k + 0.3, b, 0.9 * k + 0.3, 0, 0, 0); B.box('marble', o.baseCol || C.marble, 0.9 * k + 0.55, 0.14 * k + 0.05, 0.9 * k + 0.55, 0, b, 0); }
  const Y = b + (b ? 0.14 * k + 0.05 : 0);
  B.geo(mat, o.robe || col, shaftGeo(9, 0.35), 0, Y, 0, 0, 0, 0, 0.21 * k, 1.0 * k, 0.17 * k);
  B.geo(mat, col, BALL, 0, Y + 1.2 * k, 0, 0, 0, 0, 0.2 * k, 0.3 * k, 0.15 * k); B.geo(mat, col, BALL, 0.01 * k, Y + 1.61 * k, 0, 0, 0, 0, 0.1 * k, 0.125 * k, 0.1 * k);
  B.rod(mat, col, [0, Y + 1.4 * k, 0.2 * k], [0.02 * k, Y + 0.85 * k, 0.26 * k], 0.045 * k, 5);
  if (o.spear) { B.rod(mat, col, [0, Y + 1.4 * k, -0.2 * k], [0.25 * k, Y + 1.5 * k, -0.34 * k], 0.045 * k, 5); B.rod(mat, col, [0.25 * k, Y, -0.36 * k], [0.25 * k, Y + 2.3 * k, -0.36 * k], 0.02 * k, 5); B.cyl(mat, col, 0.01, 0.07 * k, 0.2 * k, 0, Y + 1.72 * k, 0, 6); }
  else B.rod(mat, col, [0, Y + 1.4 * k, -0.2 * k], [0.3 * k, Y + 1.25 * k, -0.24 * k], 0.045 * k, 5);
  if (o.shield) B.geo(mat, col, BALL, 0.05 * k, Y + 0.95 * k, 0.33 * k, 0, 0, 0, 0.3 * k, 0.3 * k, 0.05 * k);
  B.pop();
  if (b) K.C.rect(x, z, 0.5 * k + 0.3, 0.5 * k + 0.3, ry, ...B.span);
}
/** A strip `width` wide laid on the ground along a path. */
export function road(B, world, mat, path, width, col, lift = 0.05) {
  const tris = [], hw = width / 2;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, n = Math.max(1, Math.ceil((L + width) / 5));
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const t = -hw + ((L + width) * k) / n, cx = ax + ux * t, cz = az + uz * t, l = [cx + uz * hw, 0, cz - ux * hw], rr = [cx - uz * hw, 0, cz + ux * hw];
      l[1] = world.heightAt(l[0], l[2]) + lift + i * 0.002; rr[1] = world.heightAt(rr[0], rr[2]) + lift + i * 0.002;
      if (prev) tris.push([prev[0], prev[1], l], [prev[1], rr, l]); prev = [l, rr];
    }
  }
  const T = B.T.clone(); B.T.identity(); B.add(mat, flatGeo(tris), col); B.T.copy(T);
}

/** Warn (once, in the console) about actors standing inside something or in the water: for checking a place while building it. */
export function audit(name, list, blocks, world, sea, yearOf) {
  let bad = 0;
  for (const a of list) {
    let hit = false;
    const year = a.u0 !== undefined && a.u0 > -1 ? yearOf(a.u0) + 1 : a.u1 !== undefined && a.u1 < 2 ? yearOf(a.u1) - 1 : null, pts = a.path || [[a.x, a.z]];
    const years = year === null ? [a.yr ?? 0] : [year];
    for (const yr of years) for (let i = 0; i < pts.length; i++) {
      const steps = a.path && i < pts.length - 1 ? Math.ceil(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / 1.5) : 1;
      for (let s = 0; s < steps; s++) {
        const x = pts[i][0] + (a.path && steps > 1 ? ((pts[i + 1][0] - pts[i][0]) * s) / steps : 0), z = pts[i][1] + (a.path && steps > 1 ? ((pts[i + 1][1] - pts[i][1]) * s) / steps : 0);
        const b = blocks.inside(x, z, yr, 0.15), wet = !a.afloat && world.heightAt(x, z) < sea + 0.05;
        if ((b || wet) && !hit && (hit = true) && bad++ < 400) console.warn(`[audit ${name}] ${a.outfit} ${a.action} at ${x.toFixed(1)}, ${z.toFixed(1)} year ${yr.toFixed(0)}: ${b ? 'inside a footprint at ' + b.x.toFixed(0) + ', ' + b.z.toFixed(0) : 'in the water'}`);
      }
    }
  }
  console.warn(`[audit ${name}] ${list.length} actors, ${bad} problems`);
}
