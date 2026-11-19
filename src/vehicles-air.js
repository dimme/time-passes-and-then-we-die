// Things that fly over Manhattan, period by period: balloons, airships, aeroplanes, helicopters, drones and what comes after.
// Every model faces +x with y up, in metres, and hangs around its own centre; starboard is +z.
import * as THREE from 'three';
import { yearToU } from './timeline.js';
import { rng, lerp, clamp } from './util.js';
import { Movers } from './movers.js';
import { Bag, fin, curve, loft, skin, revolve, vehicleMat, at } from './vehicles-kit.js';

const PI = Math.PI, RAD = PI / 180;
const A = {
  // balloons
  silk: fin(0xe6d9b0, 0.85), silk2: fin(0xdccd9e, 0.85), gore: fin(0xffffff, 0.85, 0, 0, 1), rope: fin(0x4a3c28, 0.9), wicker: fin(0x9a7440, 0.9), wickerD: fin(0x5e4422, 0.9), sand: fin(0xb8a67c, 0.95), coat: fin(0x2c2a30, 0.9), skin: fin(0xc89a78, 0.8),
  // airships
  dope: fin(0xc2c6c8, 0.45, 0.35), dope2: fin(0xb4b9bc, 0.48, 0.35), ring: fin(0x9da3a6, 0.5, 0.3), keel: fin(0x8e9497, 0.55, 0.3), envelope: fin(0xdcdfe0, 0.55, 0.1), stripe: fin(0xffffff, 0.5, 0.1, 0, 1),
  // aeroplanes
  paint: fin(0xffffff, 0.35, 0.3, 0, 1), white: fin(0xf2f3f4, 0.32, 0.15), grey: fin(0xb2b7bc, 0.4, 0.3), alu: fin(0xc9cdd0, 0.26, 0.85), aluD: fin(0xa9aeb2, 0.3, 0.85), chrome: fin(0xe6eaee, 0.12, 1),
  yellow: fin(0xdcae28, 0.6), wood: fin(0x7a5a36, 0.7), steel: fin(0x55585c, 0.45, 0.7), iron: fin(0x2a2b2e, 0.5, 0.6), black: fin(0x121316, 0.6), rubber: fin(0x151516, 0.9), glass: fin(0x1c2a36, 0.06, 1), leather: fin(0x3a2616, 0.7),
  dark: fin(0x08090a, 0.8), fan: fin(0x2c3036, 0.35, 0.8),
  red: fin(0xff2010, 0.3, 0, 2.6), green: fin(0x18ff50, 0.3, 0, 2.6), strobe: fin(0xffffff, 0.3, 0, 3), lit: fin(0xffe2a0, 0.4, 0, 1.4),
  // megacity
  hull: fin(0x1c1e26, 0.4, 0.6), hull2: fin(0x101116, 0.5, 0.5), neon: fin(0xffffff, 0.4, 0, 2.4, 1), cyan: fin(0x20e8ff, 0.4, 0, 2.4), amber: fin(0xffa020, 0.4, 0, 2.2), pink: fin(0xff2890, 0.4, 0, 2.4), dim: fin(0x16182a, 0.4, 0, 0.5), lift: fin(0x1c9cff, 0.3, 0, 2.6),
  // far future
  pearl: fin(0xf4f8ff, 0.22, 0.2), shade: fin(0xccd6e4, 0.2, 0.6), gold: fin(0x6a4c1a, 0.05, 1), halo: fin(0x7ab8ff, 0.3, 0, 2), sun: fin(0xffc878, 0.3, 0, 1.8),
};
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => lerp(a, b, k / n));
/** Stations from a to b, closer together towards both ends. */
const ease = (a, b, n) => range(0, 1, n).map((t) => lerp(a, b, 0.5 - 0.5 * Math.cos(t * PI)));
const sorted = (a) => [...new Set(a)].sort((p, q) => p - q);

// =====================================================================================
// Skins: bodies, aerofoils, windows, wheels
// =====================================================================================
const fn = (v) => (typeof v === 'function' ? v : curve(v));
/**
 * Loft a streamlined body along x. d = { y: centre line, up / down: height above and below it, w: half-width } as curves
 * or functions of x, p: squareness of the section (2 = ellipse). `a`: the angles (degrees, keel -90 … crown 90) between
 * the strips of one side. f(x, strip, i) → finish, or null for a hole. Returns (x, degrees) → [y, z] on the skin.
 */
function body(bag, xs, d, f, a = 10, o = {}) {
  const ang = typeof a === 'number' ? range(-90, 90, a) : a, yc = fn(d.y ?? 0), up = fn(d.up), dn = fn(d.down ?? d.up), w = fn(d.w ?? d.up), e = 2 / (d.p || 2);
  const pt = (x, deg) => { const s = Math.sin(deg * RAD), c = Math.max(0, Math.cos(deg * RAD)); return [yc(x) + (s > 0 ? up(x) : dn(x)) * Math.sign(s) * Math.abs(s) ** e, w(x) * c ** e]; };
  loft(bag, xs, (x) => ang.map((t) => pt(x, t)), (i, k) => f((xs[i] + xs[i + 1]) / 2, k, i), { crease: 0.3, ...o });
  return pt;
}
/** A row of cabin windows in the strip a body left open between angles a0 and a1: panes w wide every `pitch`. */
function windows(bag, pt, x0, x1, pitch, w, a0, a1, wall, glass) {
  const n = Math.floor((x1 - x0) / pitch), xs = [x0];
  for (let k = 0; k < n; k++) xs.push(x0 + (k + 0.5) * pitch - w / 2, x0 + (k + 0.5) * pitch + w / 2);
  xs.push(x1);
  for (const s of [1, -1]) skin(bag, xs.map((x) => [a0, a1].map((t) => { const [y, z] = pt(x, t); return [x, y, s * z]; })), (i) => (i % 2 ? glass : wall), { flip: s < 0, crease: -1 });
}
/** Skin a closed tube of rings, working out which way is out from the middle of the tube. */
function shell(bag, P, f, o = {}) {
  const i = (P.length - 1) >> 1, a = P[i][2], b = P[i + 1][2], c = P[i][3], d = P[i + 1][3], m = [0, 1, 2].map((k) => (P[i].reduce((s, p) => s + p[k], 0) + P[i + 1].reduce((s, p) => s + p[k], 0)) / (2 * P[i].length));
  const u = [d[0] - a[0], d[1] - a[1], d[2] - a[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const out = [0, 1, 2].reduce((s, k) => s + n[k] * ((a[k] + b[k] + c[k] + d[k]) / 4 - m[k]), 0);
  skin(bag, P, f, { wrap: true, crease: 0.1, flip: out < 0, ...o });
}
// aerofoil: [distance back from the leading edge, half-thickness], trailing edge first
const FOIL = [[1, 0.05], [0.72, 0.45], [0.48, 0.84], [0.28, 1], [0.12, 0.84], [0.035, 0.5], [0, 0]];
/**
 * A wing, fin or strut through stations [x of leading edge, y, z, chord, thickness]; the section stands square to the span.
 * The far end is rounded off (and the near one with `root`). f(station, j): j 0…5 upper side from trailing to leading edge, 6…11 lower side back again.
 */
function foil(bag, st, f, { camber = 0.25, root = false } = {}) {
  const sec = [...FOIL.map(([u, h]) => [u, h * (1 + camber)]), ...FOIL.slice(1, -1).reverse().map(([u, h]) => [u, -h * (1 - camber)])], n = st.length;
  const Dy = st[n - 1][2] - st[0][2], Dz = st[0][1] - st[n - 1][1], sgn = Dy < 0 || (Math.abs(Dy) < 1e-6 && Dz < 0) ? -1 : 1;   // keep the cambered side up (or to starboard)
  const P = st.map(([x, y, z, c, th], i) => {
    const a = st[Math.max(0, i - 1)], b = st[Math.min(n - 1, i + 1)], ny = b[2] - a[2], nz = a[1] - b[1], l = (Math.hypot(ny, nz) || 1) * sgn;
    return sec.map(([u, h]) => [x - u * c, y + ((ny / l) * h * th) / 2, z + ((nz / l) * h * th) / 2]);
  });
  const end = (i, j) => { const [x, y, z, c, th] = st[i], q = st[j], dy = y - q[1], dz = z - q[2], l = Math.hypot(dy, dz) || 1, e = th * 0.6; return sec.map(([u]) => [x - (0.5 + (u - 0.5) * 0.72) * c, y + (dy / l) * e, z + (dz / l) * e]); };
  P.push(end(n - 1, n - 2)); if (root) P.unshift(end(0, 1));
  const g = typeof f === 'function' ? (i, j) => f(clamp(i - (root ? 1 : 0), 0, n - 2), j) : f;
  shell(bag, P, g);
}
/** The same foil on both sides of the aircraft. */
const pair = (bag, st, f, o) => { for (const s of [1, -1]) foil(bag, st.map(([x, y, z, c, th]) => [x, y, s * z, c, th]), f, o); };
/** A wheel on an axle along z. */
function tyre(bag, x, y, z, r, w, hub = A.steel) {
  revolve(bag, [[-w / 2, 0], [-w / 2, r * 0.5], [-w / 2, r * 0.86], [-w * 0.28, r], [w * 0.28, r], [w / 2, r * 0.86], [w / 2, r * 0.5], [w / 2, 0]], (i) => (i === 0 || i === 6 ? hub : A.rubber), at(x, y, z, 0, PI / 2, 0), 12);
}
/** An egg-shaped pod along x: profile [[x, radius], …] from the tail forwards. */
const pod = (bag, prof, f, x, y, z, seg = 10) => revolve(bag, prof, f, at(x, y, z), seg);

// =====================================================================================
// Translucent extras: blurred propellers, rotor discs and contrails
// =====================================================================================
class Veil {
  constructor() { this.p = []; this.c = []; }
  quad(a, b, c, d, ca, cb, cc, cd) { for (const [p, col] of [[a, ca], [b, cb], [c, cc], [b, cb], [d, cd], [c, cc]]) { this.p.push(...p); this.c.push(...col); } }
  /** A spinning disc round o in the plane of unit vectors U and V: faint at the hub, densest towards the tips. */
  disc(o, U, V, r, col = [0.1, 0.1, 0.11], alpha = 0.3, n = 20) {
    const P = (k, q) => { const t = (k / n) * PI * 2, c = Math.cos(t) * q, s = Math.sin(t) * q; return [o[0] + U[0] * c + V[0] * s, o[1] + U[1] * c + V[1] * s, o[2] + U[2] * c + V[2] * s]; };
    const rings = [[0.1, 0.25], [0.6, 0.8], [0.9, 1], [1, 0]];
    for (let q = 0; q < rings.length - 1; q++) for (let k = 0; k < n; k++) {
      const [r0, a0] = rings[q], [r1, a1] = rings[q + 1], c0 = [...col, a0 * alpha], c1 = [...col, a1 * alpha];
      this.quad(P(k, r0 * r), P(k + 1, r0 * r), P(k, r1 * r), P(k + 1, r1 * r), c0, c0, c1, c1);
    }
  }
  /** A round trail along -x through [x, y, z, radius, opacity] stations. */
  trail(st, n = 8) {
    const ring = ([x, y, z, r]) => range(0, 1, n).map((t) => [x, y + Math.cos(t * PI * 2) * r, z + Math.sin(t * PI * 2) * r]);
    for (let i = 0; i < st.length - 1; i++) {
      const a = ring(st[i]), b = ring(st[i + 1]), ca = [1, 1, 1, st[i][4]], cb = [1, 1, 1, st[i + 1][4]];
      for (let k = 0; k < n; k++) this.quad(a[k], a[k + 1], b[k], b[k + 1], ca, ca, cb, cb);
    }
  }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 4)); return g; }
}
const X = [1, 0, 0], Yv = [0, 1, 0], Z = [0, 0, 1];

// =====================================================================================
// Materials: aircraft sit in thinner haze than the streets, so they stay in sight on a clear day
// =====================================================================================
const mats = {};
function thin(m, haze) {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth * ${haze.toFixed(4)}));
    #endif`);
  };
  m.customProgramCacheKey = () => `air-${m.type}-${haze}`;
  return m;
}
const solidMat = (haze) => (mats['s' + haze] ||= thin(vehicleMat(), haze));
const veilMat = (haze) => (mats['v' + haze] ||= thin(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }), haze));

// =====================================================================================
// Gas balloon, 19th century: varnished silk under a rope net, wicker car
// =====================================================================================
function balloon(bag) {
  const R = 7, yc = 14.6, N = 16, up = at(0, 0, 0, 0, 0, PI / 2), on = (t, k, q = R + 0.04) => { const a = (k / N) * PI * 2, s = Math.sin(t * RAD) * q; return [s * Math.cos(a), yc + Math.cos(t * RAD) * q, s * Math.sin(a)]; };
  const neck = yc - R * Math.SQRT2 + 0.5, prof = [[neck - 0.5, 0.42], [neck - 0.1, 0.46], [neck, 0.5], ...range(135, 0, 12).map((t) => [yc + R * Math.cos(t * RAD), R * Math.sin(t * RAD)])];
  revolve(bag, prof, (i, j) => (i > 5 && i < 9 ? A.gore : i > 13 ? A.gore : (j >> 1) % 2 ? A.silk : A.silk2), up, N * 2);   // a painted band round the equator and a painted crown
  revolve(bag, [[yc + R - 0.02, 0.9], [yc + R + 0.05, 0.8], [yc + R + 0.08, 0]], A.wood, up, 12);   // valve
  // net: meridian cords, girdles, then crow's feet down to the load ring
  const hoop = (k) => { const a = (k / N) * PI * 2; return [0.95 * Math.cos(a), neck - 1.6, 0.95 * Math.sin(a)]; };
  for (let k = 0; k < N; k++) {
    const T = [8, 22, 37, 52, 67, 82, 97, 112];
    for (let q = 0; q < T.length - 1; q++) bag.rod(A.rope, on(T[q], k), on(T[q + 1], k), 0.035, 3);
    bag.rod(A.rope, on(112, k), hoop(k + (k % 2 ? -0.5 : 0.5)), 0.03, 3); bag.rod(A.rope, hoop(k), hoop(k + 1), 0.05, 4);
  }
  for (const t of [8, 30, 52, 74, 97, 112]) { const y = yc + R * Math.cos(t * RAD), q = R * Math.sin(t * RAD) + 0.03; revolve(bag, [[y - 0.05, q], [y + 0.05, q]], A.rope, up, N * 2); }
  // car, its ropes, ballast and crew
  bag.box(A.wicker, 1.5, 1.05, 1.15, 0, 0.53, 0); bag.box(A.wickerD, 1.58, 0.1, 1.23, 0, 1.08, 0); bag.box(A.dark, 1.36, 0.02, 1.01, 0, 1.135, 0); bag.box(A.wickerD, 1.54, 0.08, 1.19, 0, 0.04, 0);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2 + PI / 8, c = Math.cos(a), s = Math.sin(a), m = Math.max(Math.abs(c) / 0.75, Math.abs(s) / 0.575); bag.rod(A.rope, [c / m, 1.1, s / m], hoop((k + 0.5) * 2), 0.022, 3); }
  for (const [x, z] of [[0.8, 0.3], [-0.8, -0.2], [0.3, 0.63], [-0.4, -0.63]]) { bag.box(A.sand, 0.2, 0.3, 0.2, x, 0.72, z, 0.1, 0.3, 0.1); bag.rod(A.rope, [x, 0.85, z], [x * 0.93, 1.1, z * 0.93], 0.012, 3); }
  for (const [x, z, h] of [[0.3, 0.15, 0], [-0.35, -0.2, -0.06]]) {
    bag.ball(A.coat, x, 1.42 + h, z, 0.19, 0.36, 0.15); bag.ball(A.skin, x, 1.9 + h, z, 0.1, 0.115, 0.1); bag.cyl(A.black, 0.085, 0.09, 0.13, x, 2.04 + h, z, 8); bag.cyl(A.black, 0.15, 0.15, 0.02, x, 1.99 + h, z, 8);
  }
  bag.rod(A.rope, [0.7, 1.05, -0.5], [0.95, -6, -0.7], 0.02, 3); bag.rod(A.iron, [0.95, -6, -0.7], [0.95, -6.5, -0.7], 0.04, 4);   // trail rope and grapnel
}

// =====================================================================================
// Rigid airship, c. 1930: faceted silver hull over ring frames, cruciform fins, control car and five engine cars
// =====================================================================================
function zeppelin(bag, veil) {
  const R = 15.25, SEG = 28;
  const r = curve([[-118, 0.02], [-108.6, 0.2], [-94.4, 0.4], [-70.8, 0.66], [-47.2, 0.85], [-23.6, 0.96], [0, 1], [42.5, 1], [59, 0.97], [75.5, 0.88], [89.7, 0.74], [101.5, 0.56], [110.9, 0.36], [115.6, 0.2], [118, 0]].map(([x, k]) => [x, k * R]));
  const frames = range(-105, 105, 14), xs = sorted([-118, -116, -112, ...frames.flatMap((x) => [x - 0.35, x + 0.35]), ...frames.slice(1).map((x) => x - 7.5), 109, 112.5, 115, 116.8, 117.7, 118]);
  revolve(bag, xs.map((x) => [x, r(x)]), (i, j) => { const x = (xs[i] + xs[i + 1]) / 2; return x > 114.5 ? A.keel : xs[i + 1] - xs[i] < 1 ? A.ring : j === 13 || j === 14 ? A.keel : j % 2 ? A.dope : A.dope2; }, null, SEG, { crease: 0.985 });
  bag.rod(A.steel, [117.5, 0, 0], [119.6, 0, 0], 0.25, 6, 0.08);
  // fins with their rudders and elevators
  for (const [cy, cz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    foil(bag, [[3, -60, 50, 3.4], [9.5, -73, 37.5, 2.6], [14, -85, 26, 1.7], [16.6, -95, 15.5, 0.9]].map(([q, x, c, th]) => [x, cy * q, cz * q, c, th]), (i, j) => (j === 5 || j === 6 ? A.ring : A.dope), { camber: 0 });
    foil(bag, [[4.2, -110.3, 6.2, 0.8], [11, -110.6, 5.6, 0.7], [15.8, -110.4, 4, 0.5]].map(([q, x, c, th]) => [x, cy * q, cz * q, c, th]), A.dope2, { camber: 0 });
  }
  bag.ball(A.keel, -96, -r(-96) - 1.2, 0, 2.2, 1.3, 0.7);   // bumper under the lower fin
  // control car and passenger cabin, let into the hull forward
  const gx = sorted([66, 66.6, 67.6, ...range(69, 91, 22), 92.2, 93.4, 94.6, 95.6, 96.4, 97]);
  body(bag, gx, { p: 2.6, y: (x) => -r(x) + 0.5, up: 1.6, down: [[66, 0.4], [69.5, 2.5], [92, 2.7], [95.6, 1.9], [97, 0.4]], w: [[66, 0.3], [70, 2.7], [90, 3.0], [94.5, 2.3], [96.4, 1.2], [97, 0.3]] },
    (x, k, i) => (k === 3 && x > 69 && x < 96 && (x > 90.6 || i % 2) ? A.glass : k < 2 ? A.keel : A.dope), [-90, -62, -44, -34, -12, 20, 90]);
  // engine cars on struts, pusher propellers
  for (const [x, deg] of [[12, 52], [12, -52], [-30, 52], [-30, -52], [-56, 0]]) {
    const q = r(x), c = -Math.cos(deg * RAD), s = Math.sin(deg * RAD), y = c * (q + 2.7), z = s * (q + 2.7);
    pod(bag, [[-3.6, 0.05], [-3.3, 0.5], [-2, 1.05], [0, 1.25], [2, 1.02], [3.2, 0.5], [3.55, 0.05]], (i) => (i < 1 ? A.steel : A.dope2), x, y, z);
    for (const dx of [-1.8, 1.8]) bag.rod(A.steel, [x + dx * 0.7, c * (q + 1.9), s * (q + 1.9)], [x + dx * 1.6, c * (q - 0.3), s * (q - 0.3)], 0.12, 4);
    for (const w of [-14, 14]) bag.rod(A.steel, [x, y + 0.6 * Math.abs(s), z], [x, -Math.cos((deg + w) * RAD) * (q - 0.2), Math.sin((deg + w) * RAD) * (q - 0.2)], 0.1, 4);
    veil.disc([x - 3.75, y, z], Yv, Z, 1.9);
  }
}

// =====================================================================================
// Blimp: one smooth gas bag, a small car slung beneath, four fins
// =====================================================================================
function blimp(bag, veil) {
  const R = 7, SEG = 32;
  const r = curve([[-29, 0], [-27.2, 0.17], [-23.1, 0.4], [-17.3, 0.63], [-8.5, 0.87], [0.25, 0.98], [6.1, 1], [12, 0.96], [17.8, 0.85], [22.5, 0.68], [26, 0.48], [28.3, 0.25], [29.5, 0]].map(([x, k]) => [x, k * R]));
  const xs = sorted([-29, -28.6, ...range(-28, 28, 28), -15, 19, 27.6, 28.9, 29.3, 29.5]);
  revolve(bag, xs.map((x) => [x, r(x)]), (i, j) => { const x = (xs[i] + xs[i + 1]) / 2; return x > 27.6 ? (j % 2 ? A.ring : A.dope2) : x > -15 && x < 19 && (j + 1) % 16 > 7 && (j + 1) % 16 < 10 ? A.stripe : A.envelope; }, null, SEG);
  bag.rod(A.steel, [29.2, 0, 0], [30.6, 0, 0], 0.16, 6, 0.05);
  for (const s of [1, -1]) bag.rod(A.rope, [26.4, -r(26.4) * 0.8, s * r(26.4) * 0.55], [26, -10.5, s * 3.2], 0.03, 3);   // handling lines
  for (const [cy, cz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    foil(bag, [[1.5, -13.5, 11.5, 0.8], [4.6, -16, 9.8, 0.6], [9.2, -20.2, 6.2, 0.36]].map(([q, x, c, th]) => [x, cy * q, cz * q, c, th]), (i, j) => (j === 0 || j === 11 ? A.stripe : A.envelope), { camber: 0 });
    for (const x of [-17.5, -22]) for (const s of [1, -1]) bag.rod(A.rope, [x, cy * 7.2 + cz * s * 0.1, cz * 7.2 + cy * s * 0.1], [x + 1, cy * r(x) * 0.9 + cz * s * 2.2, cz * r(x) * 0.9 + cy * s * 2.2], 0.02, 3);
  }
  // car: glazed nose, a row of windows, one wheel, an engine either side driving a pusher propeller
  body(bag, [0, 0.25, 0.7, 1.4, 2.1, 2.5, 3.2, 3.6, 4.3, 4.7, 5.4, 5.8, 6.4, 6.9, 7.3, 7.5], { p: 2.6, y: -7.25, up: 1.1, down: [[0, 0.3], [1.2, 1.4], [6, 1.5], [7, 0.9], [7.5, 0.3]], w: [[0, 0.2], [1.3, 0.85], [6, 0.9], [7, 0.62], [7.5, 0.15]] },
    (x, k, i) => (k === 3 && x > 2 && (x > 5.8 || i % 2 === 0) ? A.glass : k === 2 && x > 6.4 ? A.glass : k < 1 ? A.stripe : A.white), [-90, -60, -36, -26, -4, 30, 90]);
  bag.rod(A.steel, [3.6, -8.6, 0], [3.6, -9.15, 0], 0.06, 5); tyre(bag, 3.6, -9.2, 0, 0.3, 0.16);
  for (const s of [1, -1]) {
    pod(bag, [[-0.9, 0.03], [-0.75, 0.22], [0, 0.32], [0.7, 0.26], [0.95, 0.03]], A.aluD, 1.3, -7.7, s * 1.75, 8);
    bag.rod(A.steel, [1.5, -7.6, s * 0.8], [1.5, -7.7, s * 1.6], 0.07, 4); bag.rod(A.steel, [0.9, -7.2, s * 0.8], [1.0, -7.6, s * 1.6], 0.05, 4);
    veil.disc([0.33, -7.7, s * 1.75], Yv, Z, 0.98);
  }
}

// =====================================================================================
// Biplane, 1920s–30s: staggered fabric wings on N-struts, open cockpits, uncowled radial engine
// =====================================================================================
function biplane(bag, veil) {
  const xs = [-4.6, -4.45, -4.1, -3.5, -2.7, -1.9, -1.0, -0.92, -0.36, -0.28, 0.3, 0.38, 0.94, 1.02, 1.6, 2.05, 2.32, 2.45];
  body(bag, xs, { p: 3, y: [[-4.6, 0.2], [-2, 0.05], [0, 0], [2.45, 0]], up: [[-4.6, 0.3], [-3, 0.38], [-1.2, 0.55], [0.9, 0.62], [2.0, 0.56], [2.45, 0.44]], down: [[-4.6, 0.06], [-3, 0.28], [-1, 0.5], [1, 0.6], [2.45, 0.44]], w: [[-4.6, 0.02], [-3.2, 0.2], [-1, 0.4], [1.2, 0.44], [2.45, 0.41]] },
    (x, k) => (k === 6 && ((x > -0.92 && x < -0.36) || (x > 0.38 && x < 0.94)) ? A.dark : x > 1.6 ? A.alu : A.paint), [-90, -55, -25, 0, 25, 50, 70, 90], { caps: [null, A.aluD] });
  // radial engine and airscrew
  revolve(bag, [[2.45, 0.27], [2.74, 0.25], [2.88, 0.12], [3.02, 0.1], [3.1, 0]], (i) => (i > 1 ? A.wood : A.steel), null, 10);
  for (let k = 0; k < 7; k++) { const a = (k / 7) * PI * 2, c = Math.cos(a), s = Math.sin(a); bag.rod(A.iron, [2.6, c * 0.2, s * 0.2], [2.6, c * 0.5, s * 0.5], 0.085, 6); bag.rod(A.steel, [2.6, c * 0.5, s * 0.5], [2.6, c * 0.56, s * 0.56], 0.1, 6, 0.06); bag.rod(A.steel, [2.76, c * 0.22, s * 0.22], [2.68, c * 0.52, s * 0.52], 0.012, 3); }
  veil.disc([3.0, 0, 0], Yv, Z, 1.25);
  // wings
  const wing = (x, y, half, dih) => foil(bag, [[x - 0.3, y + dih, -half, 0.85, 0.1], [x, y + dih * 0.93, -half + 0.32, 1.5, 0.17], [x, y, 0, 1.5, 0.17], [x, y + dih * 0.93, half - 0.32, 1.5, 0.17], [x - 0.3, y + dih, half, 0.85, 0.1]], A.yellow, { root: true });
  wing(1.5, 1.22, 4.9, 0.04); wing(0.85, -0.5, 4.6, 0.14);
  for (const s of [1, -1]) {
    const uf = [1.18, 1.14, s * 3.3], ur = [0.42, 1.14, s * 3.3], lf = [0.53, -0.3, s * 3.3], lr = [-0.23, -0.3, s * 3.3], cf = [1.18, 1.14, s * 0.46], cr = [0.42, 1.14, s * 0.46], rf = [0.53, -0.4, s * 0.44], rr = [-0.23, -0.4, s * 0.44];
    for (const [a, b] of [[lf, uf], [lr, ur], [lf, ur]]) bag.rod(A.paint, a, b, 0.04, 4);                                   // interplane N-strut
    for (const [a, b] of [[[1.3, 0.48, s * 0.4], cf], [[0.2, 0.55, s * 0.41], cr], [[1.3, 0.48, s * 0.4], cr]]) bag.rod(A.paint, a, b, 0.03, 4);   // cabane
    for (const [a, b] of [[rf, uf], [rr, ur], [cf, lf], [cr, lr]]) bag.rod(A.steel, a, b, 0.012, 3);                         // flying and landing wires
    // undercarriage
    tyre(bag, 1.25, -1.5, s * 0.95, 0.33, 0.15, A.paint);
    bag.rod(A.paint, [1.75, -0.5, s * 0.38], [1.25, -1.5, s * 0.82], 0.04, 4); bag.rod(A.paint, [0.7, -0.5, s * 0.38], [1.25, -1.5, s * 0.82], 0.035, 4); bag.rod(A.steel, [1.25, -1.5, s * 0.86], [1.25, -1.05, 0], 0.03, 4);
    bag.rod(A.steel, [-4.0, 1.25, 0], [-4.05, 0.36, s * 1.25], 0.01, 3); bag.rod(A.steel, [-4.0, -0.05, 0], [-4.05, 0.3, s * 1.25], 0.01, 3);
  }
  bag.rod(A.steel, [-4.15, -0.02, 0], [-4.42, -0.42, 0], 0.03, 4); tyre(bag, -4.45, -0.45, 0, 0.11, 0.07);
  // tail
  foil(bag, [[-3.45, 0.3, 0, 1.25, 0.1], [-3.8, 0.95, 0, 1.15, 0.08], [-4.22, 1.42, 0, 0.72, 0.06]], A.paint, { camber: 0 });
  foil(bag, [[-4.0, 0.33, -1.72, 0.62, 0.05], [-3.6, 0.33, -1.25, 1.12, 0.08], [-3.42, 0.33, 0, 1.38, 0.09], [-3.6, 0.33, 1.25, 1.12, 0.08], [-4.0, 0.33, 1.72, 0.62, 0.05]], A.yellow, { camber: 0, root: true });
  // crew behind their windscreens
  for (const x of [-0.66, 0.64]) { bag.ball(A.leather, x, 0.72, 0, 0.13, 0.14, 0.12); bag.box(A.glass, 0.02, 0.22, 0.44, x + 0.4, 0.72, 0, 0, 0, -0.5); }
}

// =====================================================================================
// Twin-engined propeller airliner, 1930s–50s: polished metal, low tapered wing, big rounded fin
// =====================================================================================
function propliner(bag, veil) {
  const wx = range(0, 6, 6).map((k) => -3.4 + k * 1.05), inWin = (x) => wx.some((c) => Math.abs(x - c) < 0.2);
  const xs = sorted([-10.6, -10.45, -10.1, -9.4, -8.4, -7.2, -6, -4.9, -4.1, ...wx.flatMap((c) => [c - 0.21, c + 0.21]), 3.6, 4.4, 5.2, 6, 6.75, 7.2, 7.75, 8.15, 8.5, 8.78, 8.94, 9]);
  body(bag, xs, { y: [[-10.6, 0.6], [-4, 0.12], [0, 0], [6, 0], [9, -0.4]], up: [[-10.6, 0.14], [-8, 0.55], [-4, 1.08], [0, 1.3], [5.6, 1.3], [7, 1.2], [7.9, 0.9], [8.6, 0.5], [9, 0.04]], down: [[-10.6, 0.1], [-8, 0.45], [-4, 0.98], [0, 1.3], [5, 1.3], [7.5, 1.0], [8.6, 0.5], [9, 0.04]],
    w: [[-10.6, 0.05], [-8, 0.5], [-4, 1.02], [-1, 1.25], [5, 1.25], [6.3, 1.12], [7.6, 0.84], [8.5, 0.46], [9, 0.04]] },
  (x, k) => (k === 4 && inWin(x) ? A.glass : x > 6.75 && x < 7.75 && (k === 5 || k === 6) ? A.glass : x > 8.5 ? A.aluD : k >= 3 && k <= 5 && x > -8.4 && x < 7.2 ? A.paint : A.alu), [-90, -60, -30, 2, 9, 23, 30, 52, 72, 90]);
  bag.box(A.alu, 0.05, 0.42, 0.05, 7.25, 1.05, 0, 0, 0, -0.75);   // windscreen centre post
  // wing: flat centre section, tapered outer panels with dihedral; black de-icer boots
  const boot = (i, j) => (j === 5 || j === 6 ? A.black : A.alu);
  pair(bag, [[3.79, -0.75, 0, 4.69, 0.7], [2.76, -0.75, 4.3, 3.66, 0.56], [0.55, 0.06, 13.6, 1.25, 0.17], [0.3, 0.12, 14.25, 0.75, 0.1]], (i, j) => (i > 0 ? boot(i, j) : A.alu));
  for (const s of [1, -1]) {
    // nacelle, cowling, half-buried main wheel, three-bladed airscrew
    const z = s * 2.95, y = -0.55;
    pod(bag, [[-1.6, 0.02], [-0.8, 0.3], [0.5, 0.5], [2.5, 0.63], [4.4, 0.67], [4.45, 0.73], [5.4, 0.73], [5.72, 0.64], [5.8, 0.52], [5.62, 0.46], [5.55, 0]], (i) => (i === 4 ? A.iron : i > 7 ? A.dark : i > 4 ? A.aluD : A.alu), 0, y, z, 14);
    revolve(bag, [[5.5, 0.17], [5.95, 0.15], [6.12, 0]], A.chrome, at(0, y, z), 8); veil.disc([5.98, y, z], Yv, Z, 1.72);
    tyre(bag, 3.5, -1.12, z, 0.56, 0.36, A.aluD);
    bag.ball(s > 0 ? A.green : A.red, 0.0, 0.12, s * 14.4, 0.07);
  }
  // tail: fin with dorsal fillet, tailplane, tail wheel
  foil(bag, [[-5.6, 0.75, 0, 4.9, 0.3], [-7.6, 1.7, 0, 3.25, 0.26], [-8.55, 2.9, 0, 2.3, 0.2], [-9.2, 3.65, 0, 1.3, 0.12]], (i, j) => (i > 0 && (j === 5 || j === 6) ? A.black : j === 0 || j === 11 ? A.paint : A.alu), { camber: 0 });
  pair(bag, [[-7.3, 0.62, 0, 3.0, 0.3], [-8.6, 0.62, 3.4, 1.5, 0.14], [-8.95, 0.62, 3.95, 0.85, 0.08]], boot, { camber: 0 });
  bag.rod(A.steel, [-8.8, -0.05, 0], [-9.1, -0.52, 0], 0.05, 4); tyre(bag, -9.12, -0.58, 0, 0.2, 0.14);
  bag.rod(A.steel, [5.6, 1.3, 0], [5.45, 1.9, 0], 0.03, 4); bag.rod(A.steel, [5.45, 1.9, 0], [-9.1, 3.7, 0], 0.008, 3);   // aerial mast and wire
  bag.ball(A.red, -0.5, 1.36, 0, 0.07);
}

// =====================================================================================
// Jet airliners: a four-engined pioneer and the later twin with big fans and upturned wing tips
// =====================================================================================
const JETS = {
  four: { x0: -20.6, x1: 21.7, R: 1.86, wing: { x: 10.5, sweep: 0.78, chord: 10.3, kink: [7.7, -1.6], tip: [19.95, 2.8], y: -1.15, dih: 0.12 }, engines: [[7.9, 5.6, 0.72, 3.5], [14, 5.6, 0.72, 3.5]],
    fin: [[1, -11.5, 7.4, 0.55], [8.0, -18, 2.6, 0.24]], tail: [[0, -14.4, 5.0, 0.5], [6.6, -19.3, 1.9, 0.18]], tailY: 0.9 },
  twin: { x0: -18.8, x1: 18.8, R: 1.98, wing: { x: 7.0, sweep: 0.5, chord: 7.6, kink: [6.3, -0.1], tip: [17.05, 1.5], y: -1.15, dih: 0.09 }, engines: [[5.75, 4.6, 1.12, 2.7]],
    fin: [[1, -10.0, 6.6, 0.5], [7.8, -15.3, 2.0, 0.2]], tail: [[0, -13.5, 4.2, 0.45], [6.2, -17.0, 1.3, 0.14]], tailY: 0.9, winglet: true },
};
function jet(bag, veil, kind, trail) {
  const J = JETS[kind], { x0, x1, R, wing: W } = J, four = kind === 'four', T = 5.6 * R, N = 2.8 * R, c0 = x0 + T, c1 = x1 - N, k = (pts) => pts.map(([x, v]) => [x, v * R]);
  const xa = c0 + 0.6, xb = c1 - 0.5;   // the cabin windows run between these
  const xs = sorted([...[0, 0.05, 0.14, 0.28, 0.45, 0.63, 0.82, 1].map((t) => x0 + t * T), xa, ...range(xa, xb, 6), xb, ...[1, 0.82, 0.66, 0.54, 0.44, 0.34, 0.25, 0.17, 0.1, 0.045, 0.012, 0].map((t) => x1 - t * N)]);
  const liv = four ? A.alu : A.white;
  const pt = body(bag, xs, {
    y: k([[x0, 0.56], [x0 + 0.5 * T, 0.3], [c0, 0], [c1, 0], [x1 - 0.5 * N, -0.12], [x1, -0.34]]),
    up: k([[x0, 0.12], [x0 + 0.4 * T, 0.5], [x0 + 0.75 * T, 0.87], [c0, 1], [c1, 1], [x1 - 0.72 * N, 0.94], [x1 - 0.45 * N, 0.74], [x1 - 0.22 * N, 0.5], [x1 - 0.06 * N, 0.24], [x1, 0.02]]),
    down: k([[x0, 0.12], [x0 + 0.4 * T, 0.55], [x0 + 0.75 * T, 0.9], [c0, 1], [c1, 1], [x1 - 0.66 * N, 0.88], [x1 - 0.36 * N, 0.62], [x1 - 0.12 * N, 0.34], [x1, 0.02]]),
    w: k([[x0, 0.1], [x0 + 0.4 * T, 0.5], [x0 + 0.75 * T, 0.88], [c0, 1], [c1, 1], [x1 - 0.7 * N, 0.9], [x1 - 0.42 * N, 0.68], [x1 - 0.18 * N, 0.42], [x1 - 0.05 * N, 0.2], [x1, 0.02]]),
  }, (x, s) => {
    if (s === 5 && x > xa && x < xb) return null;
    if (x > x1 - 0.6 * N && x < x1 - 0.36 * N && s > 5 && s < 9) return A.glass;
    if (x > x1 - 0.1 * N) return four ? A.black : A.grey;
    if (four) return s >= 4 && s <= 6 && x < x1 - 0.36 * N ? A.paint : s > 6 ? A.white : A.alu;
    return x < x0 + 0.7 * T ? A.paint : s < 2 ? A.grey : A.white;
  }, [-90, -64, -38, -15, 4, 13, 21, 34, 50, 68, 90]);
  windows(bag, pt, xa, xb, 0.56, 0.25, 13, 21, four ? A.paint : A.white, A.glass);
  // wing: swept, kinked at the inboard engine, with dihedral; bright leading edge
  const le = (z) => W.x - W.sweep * z, wy = (z) => W.y + W.dih * z, [zk, tek] = W.kink, [zt, ct] = W.tip, wf = (i, j) => (j === 5 || j === 6 ? A.chrome : four ? A.alu : A.grey);
  const st = [[le(0), wy(0), 0, W.chord, W.chord * 0.13], [le(zk), wy(zk), zk, le(zk) - tek, (le(zk) - tek) * 0.12], [le(zt), wy(zt), zt, ct, ct * 0.1]];
  if (J.winglet) st.push([le(zt) - 0.45, wy(zt) + 0.5, zt + 0.42, ct * 0.8, 0.12], [le(zt) - 1.55, wy(zt) + 2.3, zt + 0.72, ct * 0.36, 0.06]);
  else st.push([le(zt) - 0.5, wy(zt) + 0.03, zt + 0.35, ct * 0.6, ct * 0.06]);
  pair(bag, st, (i, j) => (J.winglet && i > 2 ? A.paint : wf(i, j)));
  const chordAt = (z) => (z < zk ? lerp(W.chord, le(zk) - tek, z / zk) : lerp(le(zk) - tek, ct, (z - zk) / (zt - zk)));
  body(bag, ease(le(0) + 1.5, le(0) - W.chord - 2.2, 10), { p: 2.6, y: W.y - 0.35, up: 0.5, down: (x) => 0.75 * Math.sin(clamp((le(0) + 1.5 - x) / (W.chord + 3.7), 0, 1) * PI) ** 0.6 + 0.02, w: (x) => (R + 0.12) * Math.sin(clamp((le(0) + 1.5 - x) / (W.chord + 3.7), 0, 1) * PI) ** 0.4 + 0.02 }, () => (four ? A.alu : A.grey), 6);   // belly fairing
  for (const s of [1, -1]) {
    for (const [z, len, r, ahead] of J.engines) {
      const xf = le(z) + ahead, xc = xf - len / 2, y = wy(z) - r - (four ? 0.55 : 0.2), zz = s * z;
      pod(bag, [[-0.5, 0], [-0.5, 0.42], [-0.37, 0.5], [-0.36, four ? 0.62 : 0.8], [-0.2, 0.93], [0.1, 1], [0.38, 0.96], [0.5, 0.86], [0.47, 0.78], [0.3, 0.76], [0.3, 0]].map(([a, q]) => [a * len, q * r]),
        (i, j) => (i === 0 ? A.dark : i === 1 ? A.steel : i === 2 ? A.dark : i < 6 ? (four ? A.alu : A.paint) : i === 6 ? A.chrome : i < 9 ? A.aluD : j % 2 ? A.fan : A.dark), xc, y, zz, 16);
      revolve(bag, [[-0.64 * len, 0], [-0.5 * len, 0.3 * r]], A.steel, at(xc, y, zz), 8); revolve(bag, [[0.3 * len, 0.3 * r], [0.42 * len, 0]], A.aluD, at(xc, y, zz), 8);
      foil(bag, [[xc + 0.3 * len, y + r * 0.7, zz, len * 0.72, 0.34], [le(z) + (four ? 1.4 : 0.5), wy(z) - chordAt(z) * 0.035, zz, chordAt(z) * 0.55 + (four ? 1.4 : 0.5), 0.24]], four ? A.alu : A.grey, { camber: 0 });
      if (trail) veil.trail([[xc - len - 12, y, zz, 0.5, 0], [xc - len - 60, y, zz, 1.3, 0.75], [-260, y + 2, zz * 0.9, 3.2, 0.7], [-560, y + 5, zz * 0.8, 5.5, 0.45], [-900, y + 9, zz * 0.7, 8, 0.2], [-1300, y + 14, zz * 0.6, 11, 0]]);
    }
    for (const z of four ? [4.2, 11, 16.6] : [3.6, 8.6, 11.6, 14.4]) pod(bag, [[-1.7, 0.02], [-1.2, 0.2], [0, 0.3], [1.1, 0.22], [1.5, 0.02]], four ? A.alu : A.grey, le(z) - chordAt(z) * 0.82, wy(z) - chordAt(z) * 0.05 - 0.2, s * z, 6);   // flap track fairings
    bag.ball(s > 0 ? A.green : A.red, le(zt) - 0.2, wy(zt), s * (zt + 0.2), 0.09);
  }
  // tail
  foil(bag, J.fin.map(([y, x, c, th]) => [x, y, 0, c, th]), (i, j) => (j === 5 || j === 6 ? A.chrome : A.paint), { camber: 0 });
  pair(bag, J.tail.map(([z, x, c, th]) => [x, J.tailY + 0.11 * z, z, c, th]), wf, { camber: 0 });
  if (four) { const [y, x] = J.fin[1]; bag.rod(A.alu, [x - 0.3, y + 0.05, 0], [x + 2.6, y + 0.1, 0], 0.07, 5, 0.03); }   // aerial probe
  bag.ball(A.red, 2, R + 0.04, 0, 0.1); bag.ball(A.red, 0, -R - 0.75, 0, 0.1); bag.ball(A.strobe, x0 - 0.02, pt(x0, 0)[0], 0, 0.08);
}

// =====================================================================================
// Light helicopter: glazed pod, engine on the roof, slender boom, skids
// =====================================================================================
function helicopter(bag, veil) {
  body(bag, [-2.3, -2.12, -1.7, -1.25, -0.95, -0.1, 0.02, 0.95, 1.08, 1.5, 1.9, 2.25, 2.55, 2.78, 2.9], { p: 2.4, y: [[-2.3, 0.25], [-1, 0.05], [1, 0], [2.9, -0.3]], up: [[-2.3, 0.2], [-1.6, 0.6], [-0.6, 0.8], [0.8, 0.8], [1.6, 0.68], [2.3, 0.42], [2.75, 0.2], [2.9, 0.03]],
    down: [[-2.3, 0.2], [-1.4, 0.6], [0, 0.72], [1.6, 0.68], [2.4, 0.42], [2.9, 0.03]], w: [[-2.3, 0.18], [-1.5, 0.5], [-0.5, 0.66], [1.2, 0.66], [2.0, 0.55], [2.6, 0.3], [2.9, 0.03]] },
  (x, k) => (x > 1.08 && x < 2.78 && k >= 4 && k <= 6 ? A.glass : x > 1.9 && x < 2.6 && k === 1 ? A.glass : x > -0.95 && x < 0.95 && (k === 4 || k === 5) && Math.abs(x + 0.04) > 0.07 ? A.glass : k === 0 ? A.black : k === 3 ? A.white : A.paint), [-90, -60, -32, -8, 6, 34, 60, 80, 90]);
  body(bag, ease(-2.7, 0.75, 8), { p: 2.3, y: 0.82, up: (x) => 0.42 * Math.sin(clamp((x + 2.7) / 3.45, 0, 1) * PI) ** 0.5 + 0.01, down: 0.25, w: (x) => 0.4 * Math.sin(clamp((x + 2.7) / 3.45, 0, 1) * PI) ** 0.5 + 0.01 }, (x) => (x < -2.2 ? A.iron : A.paint), 6);   // engine cowling
  bag.rod(A.iron, [-2.5, 0.95, 0], [-3.0, 1.0, 0], 0.11, 6);
  // boom, stabiliser, swept fin and tail rotor
  bag.rod(A.paint, [-1.9, 0.32, 0], [-6.35, 0.52, 0], 0.3, 8, 0.11); bag.ball(A.paint, -6.35, 0.52, 0, 0.14);
  foil(bag, [[-4.0, 0.44, -1.0, 0.5, 0.05], [-4.0, 0.44, 1.0, 0.5, 0.05]], A.paint, { camber: -0.3, root: true });
  foil(bag, [[-5.55, -0.42, 0.04, 0.45, 0.05], [-5.95, 0.5, 0.04, 0.72, 0.07], [-6.5, 1.45, 0.04, 0.48, 0.05]], A.white, { camber: 0, root: true });
  bag.rod(A.steel, [-6.35, 0.52, 0], [-6.35, 0.52, -0.3], 0.05, 5); bag.box(A.black, 0.1, 1.56, 0.012, -6.35, 0.52, -0.3, 0, 0, 0.5); veil.disc([-6.35, 0.52, -0.31], X, Yv, 0.8, [0.1, 0.1, 0.11], 0.22, 14);
  // rotor: mast, hub, two blades and the blur of their sweep
  bag.cyl(A.steel, 0.06, 0.07, 0.62, 0, 1.5, 0, 6); bag.cyl(A.steel, 0.16, 0.16, 0.12, 0, 1.78, 0, 8); bag.rod(A.steel, [0, 1.84, -0.3], [0, 1.84, 0.3], 0.02, 4);
  for (const s of [1, -1]) bag.box(A.black, 4.9, 0.03, 0.33, s * 2.55 * Math.cos(0.5), 1.8, -s * 2.55 * Math.sin(0.5), 0, 0.5, s * 0.02);
  veil.disc([0, 1.81, 0], X, Z, 5.08, [0.12, 0.12, 0.13], 0.16, 28);
  // skids on their cross tubes
  for (const s of [1, -1]) {
    const z = s * 0.98, y = -1.4;
    bag.rod(A.steel, [-1.6, y, z], [1.75, y, z], 0.04, 5); bag.rod(A.steel, [1.75, y, z], [2.1, y + 0.1, z], 0.04, 5); bag.rod(A.steel, [2.1, y + 0.1, z], [2.3, y + 0.3, z], 0.04, 5);
    for (const x of [-0.85, 0.95]) { bag.rod(A.steel, [x, -0.66, s * 0.3], [x, -1.0, s * 0.8], 0.035, 5); bag.rod(A.steel, [x, -1.0, s * 0.8], [x, y, z], 0.035, 5); }
    bag.ball(s > 0 ? A.green : A.red, 0.2, 0.1, s * 0.67, 0.045);
  }
  bag.ball(A.red, -1.6, 1.26, 0, 0.06);
}

// =====================================================================================
// Delivery drone: four rotors on arms, a parcel underneath
// =====================================================================================
function drone(bag, veil) {
  bag.ball(A.white, 0, 0, 0, 0.3, 0.09, 0.17); bag.ball(A.black, 0.2, -0.03, 0, 0.09, 0.06, 0.08); bag.box(A.black, 0.2, 0.05, 0.14, -0.05, 0.085, 0);
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const x = sx * 0.46, z = sz * 0.46;
    bag.rod(A.black, [sx * 0.1, 0, sz * 0.08], [x, 0.03, z], 0.022, 5); bag.cyl(A.iron, 0.045, 0.045, 0.09, x, 0.06, z, 8); veil.disc([x, 0.115, z], X, Z, 0.3, [0.1, 0.1, 0.11], 0.3, 12);
    bag.rod(A.black, [sx * 0.16, -0.04, sz * 0.12], [sx * 0.24, -0.5, sz * 0.26], 0.012, 4);
    bag.box(sx > 0 ? A.strobe : A.red, 0.03, 0.03, 0.03, x, -0.01, z);
  }
  for (const sz of [1, -1]) bag.rod(A.black, [-0.3, -0.5, sz * 0.26], [0.3, -0.5, sz * 0.26], 0.012, 4);
  bag.box(A.paint, 0.36, 0.26, 0.3, 0, -0.26, 0); bag.box(A.black, 0.365, 0.03, 0.305, 0, -0.26, 0);
}

// =====================================================================================
// Megacity advertising airship: a broad dark lifting hull carrying two walls of light
// =====================================================================================
function adship(bag) {
  const r = rng(2187), GLOW = [A.neon, A.cyan, A.amber, A.pink, A.neon, A.strobe];
  body(bag, ease(-85, 85, 36), { p: 2.4, y: [[-85, 3], [0, 0], [85, -1.5]], up: [[-85, 0.8], [-70, 6], [-30, 11], [20, 11], [60, 7], [80, 2.5], [85, 0.2]], down: [[-85, 0.8], [-60, 6], [0, 9], [50, 7], [78, 3], [85, 0.2]], w: [[-85, 3], [-75, 13], [-40, 22], [10, 23], [50, 17], [75, 7], [85, 0.4]] },
    (x, k, i) => (k === 4 ? (i % 3 ? A.cyan : A.hull2) : k === 0 && Math.abs(x) < 62 ? (i % 2 ? A.dim : A.hull2) : k === 8 && Math.abs(x - 10) < 40 && i % 4 === 0 ? A.lit : k < 4 ? A.hull2 : A.hull), [-90, -62, -36, -14, -3, 3, 14, 36, 62, 90]);
  // display walls: abstract blocks of colour, never lettering
  const NX = 24, NY = 5, x0 = -60, cw = 5, top = -7.5, ch = 4.6;
  for (const s of [1, -1]) {
    const cell = [];
    for (let a = 0; a < 3; a++) {   // three "adverts" a side, each in its own style
      const style = Math.floor(r() * 4), c1 = GLOW[Math.floor(r() * GLOW.length)], c2 = GLOW[Math.floor(r() * GLOW.length)], bars = Array.from({ length: 8 }, () => Math.floor(r() * (NY + 1)));
      for (let i = 0; i < 8; i++) for (let j = 0; j < NY; j++) {
        const edge = i === 0 || i === 7 || j === 0 || j === NY - 1;
        cell[(a * 8 + i) * NY + j] = i === 7 && a < 2 ? A.hull2 : style === 0 ? (edge ? c1 : (i + j) % 2 ? c2 : A.dim) : style === 1 ? (NY - 1 - j < bars[i] ? c1 : A.dim) : style === 2 ? ((i + j) % 3 === 0 ? c2 : c1) : Math.hypot(i - 3, (j - 2) * 1.2) < 2.2 ? c2 : j === NY - 1 ? c1 : A.dim;
      }
    }
    const P = range(0, NX, NX).map((i) => range(0, NY, NY).map((j) => [x0 + i * cw, top - j * ch, s * (15.5 + j * 0.9)]));
    skin(bag, P, (i, j) => cell[i * NY + j], { both: true, crease: -1 });
    bag.box(A.hull, NX * cw + 2, 0.8, 1.2, 0, top + 0.2, s * 15.4); bag.box(A.hull, NX * cw + 2, 0.6, 1, 0, top - NY * ch - 0.2, s * 20.1);
    for (const x of [-52, -18, 18, 52]) bag.box(A.hull2, 1.6, 5, 1.6, x, top + 2.4, s * 14.6);
    // vectoring fans on outriggers
    for (const [x, y, z] of [[44, 1, 24.5], [-52, 2.5, 25.5]]) {
      revolve(bag, [[-2, 4.4], [-1.6, 5.2], [1.6, 5.4], [2.2, 4.9], [1.6, 4.5], [-2, 4.4]], (i) => (i === 3 ? A.cyan : A.hull), at(x, y, s * z, 0, 0, PI / 2), 16);
      revolve(bag, [[-0.3, 0], [-0.3, 4.5]], A.lift, at(x, y, s * z, 0, 0, PI / 2), 16); revolve(bag, [[0.3, 4.5], [0.3, 0]], A.hull2, at(x, y, s * z, 0, 0, PI / 2), 16);
      bag.box(A.hull, 3, 1.2, 10, x, y, s * (z - 8));
    }
    foil(bag, [[-62, 6, s * 9, 20, 2.4], [-76, 21, s * 17, 10, 1]], (i, j) => (j === 0 || j === 11 ? A.pink : A.hull), { camber: 0 });
    bag.box(s > 0 ? A.green : A.red, 1.2, 1.2, 1.2, 12, 0, s * 23.2);
  }
  // bridge under the bow, running lights along the keel, strobes
  body(bag, sorted([40, 41, ...range(43, 63, 10), 65, 66.5, 67.5]), { p: 2.6, y: -8, up: 2, down: [[40, 0.5], [44, 3.2], [62, 3.4], [66, 2.2], [67.5, 0.5]], w: [[40, 0.5], [44, 5], [62, 5], [66, 3], [67.5, 0.4]] }, (x, k, i) => (k === 2 && x > 43 && (i % 2 || x > 63) ? A.lit : A.hull2), [-90, -50, -30, -8, 30, 90]);
  for (let x = -70; x <= 30; x += 10) bag.box(A.amber, 0.9, 0.5, 0.9, x, -9.2 + Math.abs(x) * 0.035 + (x < 0 ? Math.abs(x) * 0.02 : 0), 0);
  bag.box(A.strobe, 1, 1, 1, 0, 11.4, 0); bag.box(A.strobe, 1, 1, 1, -84.5, 3, 0); bag.box(A.red, 1, 1, 1, -78, 22, 17.6); bag.box(A.red, 1, 1, 1, -78, 22, -17.6);
}

// =====================================================================================
// Far future: a great white glider, quiet as a cloud
// =====================================================================================
function glider(bag) {
  body(bag, ease(-140, 140, 44), { y: [[-140, 7], [-40, 0], [140, -5]], up: [[-140, 0.2], [-112, 5], [-40, 11], [30, 11], [100, 5.5], [132, 1.6], [140, 0.15]], down: [[-140, 0.2], [-90, 5], [0, 8], [90, 5], [140, 0.15]], w: [[-140, 0.4], [-120, 8], [-50, 20], [20, 22], [90, 13], [128, 4], [140, 0.3]] },
    (x, k) => (k === 3 ? A.halo : k === 7 && x > 24 && x < 104 ? A.gold : k === 0 && Math.abs(x) < 95 ? A.sun : k < 3 ? A.shade : A.pearl), [-90, -55, -25, -6, 1, 22, 50, 74, 90]);
  pair(bag, [[34, -1, 12, 50, 5.5], [8, 4, 62, 26, 2.6], [-36, 15, 122, 13, 1.2], [-78, 29, 168, 6, 0.5], [-100, 38, 186, 2.5, 0.2]], (i, j) => (j === 0 || j === 11 ? A.halo : j > 5 ? A.shade : A.pearl), { camber: 0.4 });
  for (const s of [1, -1]) {
    foil(bag, [[-96, 6, s * 7, 30, 2.4], [-122, 22, s * 20, 14, 1.1], [-140, 36, s * 30, 5, 0.4]], (i, j) => (j === 0 || j === 11 ? A.halo : A.pearl), { camber: 0 });
    bag.ball(s > 0 ? A.green : A.red, -102, 38.3, s * 186.5, 0.6);
  }
}

// =====================================================================================
// Part lists
// =====================================================================================
const BUILD = { balloon, zeppelin, blimp, biplane, propliner, jet4: (b, v, t) => jet(b, v, 'four', t), jet: (b, v, t) => jet(b, v, 'twin', t), helicopter, drone, adship, glider };
export const AIR_KINDS = Object.keys(BUILD);
/** Instanced parts for one kind of aircraft. haze: how much of the scene's fog it takes; trail: jets draw a contrail. */
export function airParts(kind, { haze = 0.05, trail = false, cast = false } = {}) {
  const bag = new Bag(), veil = new Veil();
  BUILD[kind](bag, veil, trail);
  const parts = [{ geo: bag.geo(), mat: solidMat(haze), cast }];
  if (veil.p.length) parts.push({ geo: veil.geo(), mat: veilMat(haze), tint: false, cast: false });
  return parts;
}

// =====================================================================================
// Flight: travellers on straight courses in any direction, weaving in gentle banked S-turns
// =====================================================================================
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _sphere = new THREE.Sphere(), G = 9.8;
class Flight extends Movers {
  /** items: { cx, cz, hdg, alt, off, v, u0, u1, tint, s, w, ph, bank, pitch, sway, bob }: a course through (cx, cz) on heading hdg (0 = +x, PI/2 = north). */
  update(u, t, view) {
    const on = !(u < this.minU || u > this.maxU), first = this.meshes[0], L = this.span * 2;
    for (const m of this.meshes) m.visible = on;
    if (!on) return;
    let k = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (u < it.u0 || u >= it.u1) continue;
      const along = ((((it.off + it.v * t) % L) + L) % L) - this.span, ph = it.ph + t * it.w, sn = Math.sin(ph), D = (G * it.bank) / (it.w * it.w);   // a bank of b·sin swings the track D·sin to the side
      const c = Math.cos(it.hdg), s = Math.sin(it.hdg), side = -D * sn, scale = (it.s || 1) * clamp((this.span - Math.abs(along)) / (this.span * 0.04), 0, 1);   // shrinks to nothing where the course wraps round
      _p.set(it.cx + c * along + s * side, it.alt + it.bob * Math.sin(ph * 0.6), it.cz - s * along + c * side);
      if (view) {
        _sphere.center.copy(_p); _sphere.radius = this.reach * 1.1 + 1;
        const dx = _p.x - view.eye.x, dz = _p.z - view.eye.z;
        if ((!first.castShadow || dx * dx + dz * dz > 4900) && !view.frustum.intersectsSphere(_sphere)) continue;
      }
      _q.setFromEuler(_e.set((it.bank + it.sway) * sn, it.hdg + Math.atan2(D * it.w * Math.cos(ph), it.v), it.pitch + it.sway * Math.cos(ph * 0.7), 'YZX'));
      first.setMatrixAt(k, _m.compose(_p, _q, _s.setScalar(scale)));
      for (let m = 0; m < this.meshes.length; m++) { const a = this.meshes[m].instanceColor.array, col = this.colors[m]; a[k * 3] = col[i * 3]; a[k * 3 + 1] = col[i * 3 + 1]; a[k * 3 + 2] = col[i * 3 + 2]; }
      k++;
    }
    for (const m of this.meshes) { m.count = k; m.visible = k > 0; m.instanceColor.needsUpdate = true; }
    first.instanceMatrix.needsUpdate = true;
  }
}

// =====================================================================================
// The sky through the ages
// =====================================================================================
const PAL = {
  balloon: [0xe6d9b0, 0xb8322a, 0x2c4a8a, 0xd9a428, 0x3a6a4a], blimp: [0x1c3a7a, 0xb02020, 0x1a1a1c, 0xd08a18, 0x2a6a5a], biplane: [0x1c3a6a, 0xa81c1c, 0x24503a, 0xb8bcc0, 0xdcae28, 0xd06a18],
  liner: [0x1c3a8a, 0xb01c20, 0x18604a, 0xd0801c, 0x202428, 0x5a2a7a, 0x1a7aa8], heli: [0x1c3a7a, 0xb01c20, 0xe8e8e8, 0xd8b020, 0x1a1c20, 0x2a6a4a], neon: [0xff2890, 0x20e8ff, 0xffa020, 0x9a50ff, 0x40ff90],
};
/** Aircraft of every period; returns their movers (already added to the scene). */
export function buildAircraft(world, scene) {
  const r = rng(1903), Y = yearToU, out = [], lin = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  /**
   * n travellers from year `from` (each `step` years after the last) to `to`. where: 'free' crosses the island on any heading (for
   * craft above the rooftops), 'river' follows the Hudson or the East River, 'street' keeps to the street grid.
   */
  const fly = (n, from, to, { where = 'free', alt, v, span, step = 0, pal, bank = 0, pitch = 0, sway = 0, bob = 0, s }) => Array.from({ length: n }, (_, i) => {
    const dir = r() < 0.5 ? 1 : -1, ns = where === 'river' || (where === 'street' && r() < 0.6);
    const hdg = where === 'free' ? r() * PI * 2 : ns ? dir * PI / 2 : dir > 0 ? 0 : PI;
    const cx = where === 'free' ? (r() - 0.5) * 900 : where === 'river' ? (r() < 0.5 ? 1 : -1) * (310 + r() * 250) : ns ? Math.round(r() * 4 - 2) * 100 + (r() - 0.5) * 9 : 0;
    const cz = where === 'free' ? (r() - 0.5) * 1100 : where === 'street' && !ns ? Math.round(r() * 14 - 7) * 60 + (r() - 0.5) * 5 : 0;
    return { cx, cz, hdg, alt: lerp(alt[0], alt[1], (i + r()) / n), off: r() * span * 2, v: lerp(v[0], v[1], r()), u0: Y(from + i * step), u1: Y(to + r() * 3), tint: pal ? lin(pal[Math.floor(r() * pal.length)]) : [1, 1, 1],
      w: 0.1 + r() * 0.08, ph: r() * 7, bank, pitch, sway, bob, s };
  });
  const mk = (kind, items, span, opts) => { const m = new Flight(world, airParts(kind, opts), items, { span, ground: false }); out.push(m); scene.add(...m.meshes); };
  const add = (kind, n, from, to, o, opts) => mk(kind, fly(n, from, to, o), o.span, opts);

  add('balloon', 3, 1830, 1910, { alt: [180, 380], v: [2, 4.5], span: 1100, step: 12, pal: PAL.balloon, sway: 0.03, bob: 1.5 });
  add('zeppelin', 2, 1924, 1937, { alt: [490, 580], v: [13, 18], span: 2400, step: 4 });
  add('blimp', 1, 1925, 2100, { where: 'river', alt: [240, 330], v: [8, 11], span: 1800, pal: PAL.blimp, sway: 0.015, bob: 2 });
  add('blimp', 1, 1958, 2100, { alt: [560, 620], v: [9, 12], span: 2000, pal: PAL.blimp, sway: 0.015, bob: 2 });
  add('biplane', 2, 1911, 1940, { where: 'river', alt: [110, 240], v: [30, 38], span: 1700, step: 6, pal: PAL.biplane, bank: 0.1, bob: 2 });
  add('biplane', 2, 1919, 1940, { alt: [460, 600], v: [32, 40], span: 2000, step: 5, pal: PAL.biplane, bank: 0.22, bob: 2 });
  add('propliner', 3, 1934, 1962, { alt: [520, 800], v: [55, 68], span: 2600, step: 4, pal: PAL.liner, bank: 0.12 });
  add('jet4', 2, 1958, 1986, { alt: [650, 900], v: [85, 100], span: 3200, step: 3, pal: PAL.liner, bank: 0.1, pitch: 0.04 });
  add('jet', 3, 1968, 2110, { alt: [650, 950], v: [85, 100], span: 3200, step: 10, pal: PAL.liner, bank: 0.1, pitch: 0.04 });
  // cruising far overhead, drawing contrails
  add('jet4', 2, 1959, 1990, { alt: [1700, 2300], v: [55, 62], span: 5000, step: 4, pal: PAL.liner }, { haze: 0.02, trail: true });
  add('jet', 3, 1972, 2110, { alt: [1700, 2400], v: [55, 62], span: 5000, step: 12, pal: PAL.liner }, { haze: 0.02, trail: true });
  add('helicopter', 3, 1950, 2110, { where: 'river', alt: [110, 260], v: [26, 38], span: 1500, step: 8, pal: PAL.heli, bank: 0.06, pitch: -0.07, bob: 1.5 });
  add('helicopter', 1, 1965, 2110, { alt: [560, 620], v: [30, 40], span: 1800, pal: PAL.heli, bank: 0.12, pitch: -0.07, bob: 1.5 });
  add('drone', 16, 2016, 2160, { where: 'street', alt: [20, 80], v: [8, 14], span: 520, step: 3, pal: [0xf0b020, 0xf2f2f2, 0x9a7440, 0x2a6ad0], pitch: -0.12, sway: 0.03, bob: 0.4 }, { cast: true });
  add('adship', 3, 2180, 2850, { where: 'river', alt: [190, 420], v: [5, 8], span: 1700, step: 12, pal: PAL.neon, bob: 3 }, { haze: 0.1 });
  add('glider', 2, 2970, 9400, { alt: [620, 820], v: [16, 22], span: 3400, step: 30, bank: 0.03 }, { haze: 0.03 });
  return out;
}
