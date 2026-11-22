// Uruk in southern Mesopotamia, 4000 – 2700 BCE: the first city. A flat plain of silt between the Euphrates and
// its canals, barley in long strips, a town of mud brick round two temple precincts — and in them the first writing.
import * as THREE from 'three';
import { rng, smooth, clamp } from './util.js?v=fea1c89f';
import { yearToU, uToYear } from './timeline.js?v=fea1c89f';
import { actors } from './people-actors.js?v=fea1c89f';
import { Shape, field, sheaf, heap, pot, ladder, house, opening, furnish, Solids, kinds, planted, lin, shade, local, rect } from './site-crescent-kit.js?v=fea1c89f';
import { livestock, standing, drove, loopOf, onLoop } from './site-crescent-animals.js?v=fea1c89f';

const FLAT = 3, CANAL = 135, RIVER = 310;
const PX0 = -100, PX1 = -40, PZ0 = -120, PZ1 = -60, PH = 13, H0 = 7;   // the terrace of the sky god, and its height before it was raised
const SX1 = -10, SZ0 = -100, SZ1 = -80, E = 0.01;                      // its stair
const ROAD = 20, GATE_Z = 0, WALL_X = 240, WALL_N = -290;
const SPAWN = { x: 31, z: 84, yaw: 0.36 };

function base(x, z) {
  const river = FLAT - 7 * clamp((60 - Math.abs(x - RIVER)) / 20, 0, 1), canal = x < 262 ? FLAT - 4.5 * clamp((15 - Math.abs(z - CANAL)) / 10, 0, 1) : FLAT;
  return Math.min(river, canal);
}
/** Only the temple terrace stands above the plain; env.hill raises it from H0 to PH when it is rebuilt. */
function relief(x, z) {
  if (x > PX0 + E && x < PX1 - E && z > PZ0 + E && z < PZ1 - E) return PH;
  if (x >= PX1 - E && x < SX1 && z > SZ0 + E && z < SZ1 - E) return (PH * (SX1 - x)) / (SX1 - PX1);
  return 0;
}
const hillAt = (year) => (H0 + (PH - H0) * smooth((year + 3520) / 60)) / PH;
const set = (c, r, g, b) => { c[0] = r; c[1] = g; c[2] = b; };
const Y = yearToU;
const MUD = lin(0xb39a72), MUD2 = lin(0xa48a64), WHITE = lin(0xeee8da), CLAY = lin(0xb08a5e), BUFF = lin(0xc8b48c), STRAW = lin(0xd8b45c), TIMBER = lin(0x6a4c30), WATER = lin(0x4a5a40), DARK = lin(0x16110c), REED = lin(0xb89c5c), BITUMEN = lin(0x2a2622);

/** A wall face of buttresses and stepped niches from a to b, its outer side on the left of that direction seen from above (−dz, dx). */
function niched(S, m, a, b, y0, y1, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), tx = dx / L, tz = dz / L, nx = -tz, nz = tx, dep = o.depth || 0.35;
  let bw = o.bw || 1.3, nw = o.nw || 1.1; const n = Math.max(1, Math.round((L - bw) / (bw + nw))), f = L / (n * (bw + nw) + bw); bw *= f; nw *= f;
  const prof = [[0, 0]];
  for (let i = 0; i < n; i++) { const t = i * (bw + nw) + bw; prof.push([t, 0], [t, -dep], [t + nw / 3, -dep], [t + nw / 3, -1.7 * dep], [t + (2 * nw) / 3, -1.7 * dep], [t + (2 * nw) / 3, -dep], [t + nw, -dep], [t + nw, 0]); }
  prof.push([L, 0]);
  const W = (t, off) => [a[0] + tx * t + nx * off, a[1] + tz * t + nz * off], pts = prof.map(([t, off]) => W(t, off));
  for (let i = 0, u = 0; i < prof.length - 1; i++) {   // the backs of the niches lie in shadow: darker the deeper they are
    const d0 = Math.min(prof[i][1], prof[i + 1][1]), side = prof[i][1] !== prof[i + 1][1];
    S.prism(m, [pts[i], pts[i + 1]], y0, y1, { open: true, u0: u, col: shade(o.col, side ? 0.7 : d0 < -1.2 * dep ? 0.58 : d0 < 0 ? 0.8 : 1) }); u += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  }
  for (let i = 0; i < prof.length - 1; i++) if (prof[i + 1][0] - prof[i][0] > 1e-3) S.cap(m, [pts[i], pts[i + 1], W(prof[i + 1][0], -2 * dep), W(prof[i][0], -2 * dep)], y1, o.col);
}
/** A building whose four walls are niched and buttressed, with a flat roof. */
function nichedBlock(S, m, x, z, w, d, rot, y0, h, o = {}) {
  const C = rect(x, z, w, d, rot).reverse(), dep = o.depth || 0.35;
  for (let k = 0; k < 4; k++) {
    const A = C[k], B = C[(k + 1) % 4], dr = o.door && o.door.k === k ? o.door : null;
    if (!dr) { niched(S, m, A, B, y0, y0 + h, o); continue; }
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), at = (t) => [A[0] + ((B[0] - A[0]) * t) / L, A[1] + ((B[1] - A[1]) * t) / L];
    niched(S, m, A, at(dr.a0), y0, y0 + h, o); niched(S, m, at(dr.a1), B, y0, y0 + h, o);
    const P0 = at(dr.a0), P1 = at(dr.a1), nx = -(B[1] - A[1]) / L, nz = (B[0] - A[0]) / L, t = dr.depth;   // its outer side is on the left: (-dz, dx)
    const q = (p, off, y) => [p[0] - nx * off, y, p[1] - nz * off];
    S.quad(m, q(P0, 0, y0 + dr.h), q(P1, 0, y0 + dr.h), q(P1, 0, y0 + h), q(P0, 0, y0 + h), o.col);   // over the door
    S.quad(m, q(P1, 0, y0 + dr.h), q(P0, 0, y0 + dr.h), q(P0, t, y0 + dr.h), q(P1, t, y0 + dr.h), shade(o.col, 0.7));   // its soffit
    S.quad(m, q(P0, 0, y0), q(P0, t, y0), q(P0, t, y0 + dr.h), q(P0, 0, y0 + dr.h), shade(o.col, 0.85)).quad(m, q(P1, t, y0), q(P1, 0, y0), q(P1, 0, y0 + dr.h), q(P1, t, y0 + dr.h), shade(o.col, 0.85));   // and reveals
  }
  S.cap('plaster', rect(x, z, w - dep * 3.9, d - dep * 3.9, rot), y0 + h - 0.02, o.roofCol || shade(o.col, 0.95));
  // the niches stop short of the top: a plain band of wall closes them and stands a finger proud as a coping; a darker course at the foot
  const bh = o.band ?? Math.min(1, h * 0.13), e = 0.04;
  for (const [lx, lz, bw, bd] of [[0, d / 2 - dep + e, w + 2 * e, 2 * dep], [0, -(d / 2 - dep + e), w + 2 * e, 2 * dep], [w / 2 - dep + e, 0, 2 * dep, d + 2 * e], [-(w / 2 - dep + e), 0, 2 * dep, d + 2 * e]]) {
    const p = local(x, z, rot, lx, lz); S.box(m, p[0], y0 + h - bh, p[1], bw, bh + 0.05, bd, rot, { col: shade(o.col, 0.97) });
  }
}
/** A boat of bundled reeds, bow and stern drawn up to points: centred on (x, z), heading along rot, afloat at y. */
function reedBoat(S, x, y, z, rot, len = 7, beam = 1.5) {
  const N = 12, K = 7, ring = [], col = shade(REED, 0.9);
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * 2 - 1, wd = (beam / 2) * Math.max(0.06, 1 - t * t) ** 0.55, rise = 1.25 * Math.abs(t) ** 3.2, pts = [];
    for (let k = 0; k <= K; k++) { const a = Math.PI * (k / K), px = t * len / 2 - 0.25 * rise * Math.sign(t), pz = Math.cos(a) * wd, py = y + rise - Math.sin(a) * 0.38 * Math.max(0.25, 1 - t * t) + 0.3; const q = local(x, z, rot, px, pz); pts.push([q[0], py, q[1]]); }
    ring.push(pts);
  }
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < K; k++) S.quad('reed', ring[i][k + 1], ring[i + 1][k + 1], ring[i + 1][k], ring[i][k], col, [k * 0.3, i * 0.6]);
    S.quad('reed', ring[i][0], ring[i + 1][0], ring[i + 1][K], ring[i][K], shade(col, 1.12), [i * 0.6, 0]);   // the deck of matting
  }
  for (const t of [-0.8, -0.45, 0, 0.45, 0.8]) { const i = Math.round(((t + 1) / 2) * N), p = ring[i]; for (let k = 0; k < K; k++) S.beam('wood', p[k].map((v, j) => v + (j === 1 ? -0.012 : 0)), p[k + 1].map((v, j) => v + (j === 1 ? -0.012 : 0)), 0.035, 0.035, 4, BITUMEN, false); }   // lashings
}
/** A reed house of the marshes: arches of bundled reed covered in matting. Long axis along rot. */
function mudhif(S, x, y, z, rot, len = 12, wd = 5.2, ht = 4.2) {
  const K = 10, arch = (px, s = 1) => { const out = []; for (let k = 0; k <= K; k++) { const a = Math.PI * (k / K), q = local(x, z, rot, px, Math.cos(a) * wd / 2 * s); out.push([q[0], y + Math.sin(a) ** 0.8 * ht * s, q[1]]); } return out; };
  const n = Math.round(len / 1.5); let prev = arch(-len / 2);
  for (let i = 1; i <= n; i++) { const cur = arch(-len / 2 + (len * i) / n); for (let k = 0; k < K; k++) S.quad('reed', prev[k + 1], cur[k + 1], cur[k], prev[k], shade(REED, 0.85 + (i % 2) * 0.12), [i * 1.5, k * 0.8]); prev = cur; }
  for (let i = 0; i <= n; i++) { const p = arch(-len / 2 + (len * i) / n, 1.035); for (let k = 0; k < K; k++) S.beam('reed', p[k], p[k + 1], 0.16, 0.16, 5, shade(REED, 0.72), false); }   // the ribs
  for (const e of [-1, 1]) {   // end walls of lattice, a door in one, pillars of reed at the corners
    const p = arch((e * len) / 2);
    for (let k = 0; k < K / 2; k++) S.quad('reed', p[k], p[K - k], p[K - k - 1], p[k + 1], shade(REED, 1.05), [[0, k], [4, k], [4, k + 1], [0, k + 1]], [e, 0, 0]);
    for (const sd of [-1, 1]) { const q = local(x, z, rot, (e * len) / 2 + e * 0.15, (sd * wd) / 2); S.beam('reed', [q[0], y, q[1]], [q[0], y + ht + 1.2, q[1]], 0.3, 0.1, 6, shade(REED, 0.8)); }
    if (e > 0) { const P = (pz, h) => { const q = local(x, z, rot, len / 2 + 0.04, pz); return [q[0], y + h, q[1]]; }; S.quad('plain', P(0.55, 0), P(-0.55, 0), P(-0.55, 1.8), P(0.55, 1.8), DARK); }
  }
}

function build({ world, group }) {
  const r = rng(3300), K = kinds(), L = livestock(), solids = new Solids(), people = [], herds = [], walkers = [];
  const P = (outfit, action, x, z, rot = 0, o = {}) => people.push({ outfit: o.s && o.s < 0.75 ? F : outfit, action, x, z, rot, ...o });
  const M = 'sumerian', F = 'sumerian-f', PR = 'sumerian-priest', mf = () => (r() < 0.6 ? M : F);
  const sub = (from, to) => { const g = new THREE.Group(); g.userData = { u0: from === undefined ? -Infinity : Y(from), u1: to === undefined ? Infinity : Y(to) }; group.add(g); return g; };
  const always = sub(), town2 = sub(-3700), town3 = sub(-3150), eanna = sub(-3600), preEanna = sub(undefined, -3600), walled = sub(-2950), wheels = sub(-3200), oldTemple = sub(undefined, -3490), whiteTemple = sub(-3490), plat = sub();
  const S = new Shape(), S2 = new Shape(), S3 = new Shape(), SE = new Shape(), SPre = new Shape(), SW = new Shape(), ST0 = new Shape(), ST1 = new Shape(), SPl = new Shape();
  const flat = () => FLAT;

  // ---------- the terrace and its temples ----------
  SPl.prism('brick', rect((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, PX1 - PX0, PZ1 - PZ0), 0, PH + 0.04, { batter: 1.1, col: MUD, cap: 'plaster', capCol: shade(BUFF, 0.95) });
  SPl.prism('brick', rect((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, PX1 - PX0 + 1.6, PZ1 - PZ0 + 1.6), -0.3, 1.1, { col: MUD2 });
  for (let k = 0; k < 4; k++) for (let a = -26; a <= 26; a += 5.2) {   // buttresses up its sloping faces
    if (k === 1 && Math.abs(a) < 11) continue;
    const q = k === 0 ? [(PX0 + PX1) / 2 + a, PZ0 + 0.25] : k === 1 ? [PX1 - 0.25, (PZ0 + PZ1) / 2 + a] : k === 2 ? [(PX0 + PX1) / 2 + a, PZ1 - 0.25] : [PX0 + 0.25, (PZ0 + PZ1) / 2 + a];
    SPl.box('brick', q[0], 0, q[1], k % 2 ? 1.5 : 2.2, PH - 0.5, k % 2 ? 2.2 : 1.5, 0, { col: shade(MUD, 0.93), batter: 0.25 });
  }
  { // the stair: sixty steps between two sloping walls
    const n = 60, run = (SX1 - PX1) / n, rise = PH / n, z0 = -95, z1 = -85, c = shade(BUFF, 0.9);
    for (let k = 0; k < n; k++) { const x0 = SX1 - k * run, x1 = x0 - run, yb = Math.max(0, (k - 0.5) * rise), yt = (k + 0.5) * rise;
      SPl.quad('brick', [x0, yb, z1], [x0, yb, z0], [x0, yt, z0], [x0, yt, z1], shade(c, 0.85)).quad('brick', [x0, yt, z1], [x0, yt, z0], [x1, yt, z0], [x1, yt, z1], c, null, [0, 1, 0]); }
    for (const [za, zb] of [[SZ0, z0], [z1, SZ1]]) { const t0 = 1.2, t1 = PH + 0.9;
      SPl.quad('brick', [PX1, 0, zb], [SX1, 0, zb], [SX1, t0, zb], [PX1, t1, zb], MUD, [[0, 0], [30, 0], [30, t0], [0, t1]]).quad('brick', [SX1, 0, za], [PX1, 0, za], [PX1, t1, za], [SX1, t0, za], MUD, [[0, 0], [30, 0], [30, t1], [0, t0]])
        .quad('brick', [SX1, t0, za], [PX1, t1, za], [PX1, t1, zb], [SX1, t0, zb], shade(MUD, 1.08)).quad('brick', [SX1, 0, zb], [SX1, 0, za], [SX1, t0, za], [SX1, t0, zb], MUD); }
  }
  const TC = [-72, -90];
  // the White Temple: 17.5 × 22.3 m, washed with gypsum, niches all round
  ST1.box('plaster', TC[0], 0, TC[1], 19.5, 0.5, 24.3, 0, { col: shade(WHITE, 0.9) });
  nichedBlock(ST1, 'plaster', TC[0], TC[1], 17.5, 22.3, 0, 0.5, 7, { col: WHITE, depth: 0.32, door: { k: 1, a0: 22.3 / 2 - 0.65, a1: 22.3 / 2 + 0.65, h: 3.4, depth: 1.0 } });
  { // inside: a long middle hall under a high roof lit from the clerestory, rooms either side, an altar at the north end and an offering table
    const X0 = TC[0], Z0 = TC[1], IN = shade(WHITE, 0.82), y0 = 0.5, face = (x0, z0, x1, z1, ya, yb, n, c = IN) => { const rx = n[1], rz = -n[0]; if ((x1 - x0) * rx + (z1 - z0) * rz < 0) [x0, z0, x1, z1] = [x1, z1, x0, z0]; ST1.quad('plaster', [x0, ya, z0], [x1, ya, z1], [x1, yb, z1], [x0, yb, z0], c); };
    const ix = 7.75, iz = 10.15, hx = 3.2, pt = 0.5, ys = 6.0, yh = 9.4, gz = 0.7;
    face(X0 - ix, Z0 - iz, X0 - ix, Z0 + iz, y0, ys, [1, 0]); face(X0 - ix, Z0 - iz, X0 + ix, Z0 - iz, y0, ys, [0, 1]); face(X0 - ix, Z0 + iz, X0 + ix, Z0 + iz, y0, ys, [0, -1]);
    face(X0 + ix, Z0 - iz, X0 + ix, Z0 - 0.65, y0, ys, [-1, 0]); face(X0 + ix, Z0 + 0.65, X0 + ix, Z0 + iz, y0, ys, [-1, 0]); face(X0 + ix, Z0 - 0.65, X0 + ix, Z0 + 0.65, y0 + 3.4, ys, [-1, 0]);
    for (const sd of [-1, 1]) {   // the walls of the hall: pierced at the middle, rising above the side rooms to the clerestory
      const xi = X0 + sd * hx, xo = X0 + sd * (hx + pt);
      for (const [za, zb] of [[Z0 - iz, Z0 - gz], [Z0 + gz, Z0 + iz]]) { face(xi, za, xi, zb, y0, yh, [-sd, 0]); face(xo, za, xo, zb, y0, ys, [sd, 0]); }
      face(xi, Z0 - gz, xi, Z0 + gz, y0 + 3.0, yh, [-sd, 0]); face(xo, Z0 - gz, xo, Z0 + gz, y0 + 3.0, ys, [sd, 0]);
      for (const z of [Z0 - gz, Z0 + gz]) ST1.quad('plaster', [xi, y0, z], [xo, y0, z], [xo, y0 + 3.0, z], [xi, y0 + 3.0, z], shade(IN, 0.9)).quad('plaster', [xo, y0, z], [xi, y0, z], [xi, y0 + 3.0, z], [xo, y0 + 3.0, z], shade(IN, 0.9));
      ST1.cap('plaster', rect(X0 + sd * (hx + pt + (ix - hx - pt) / 2), Z0, ix - hx - pt, 2 * iz), ys, shade(IN, 0.75), true);   // the ceilings of the side rooms
      for (let k = -3; k <= 3; k++) { const z = Z0 + k * 2.6; face(xi - sd * 0.01, z - 0.4, xi - sd * 0.01, z + 0.4, 8.35, 9.0, [-sd, 0], lin(0xfff4dc)); }   // daylight through the clerestory
    }
    for (const z of [Z0 - iz, Z0 + iz]) face(X0 - hx, z, X0 + hx, z, ys, yh, [0, z < Z0 ? 1 : -1]);
    ST1.cap('plaster', rect(X0, Z0, 2 * hx, 2 * iz), yh, shade(IN, 0.7), true);
    ST1.cap('plaster', rect(X0, Z0, 2 * ix, 2 * iz), y0 + 0.02, shade(BUFF, 0.95));
    ST1.box('plaster', X0, y0, Z0 - iz + 1.3, 3.0, 0.4, 2.2, 0, { col: shade(WHITE, 0.9) }); ST1.box('plaster', X0, y0 + 0.4, Z0 - iz + 1.0, 2.2, 0.9, 1.4, 0, { col: shade(WHITE, 0.95) });   // the stepped altar
    ST1.box('brick', X0, y0, Z0 + 2.5, 1.6, 0.8, 1.1, 0, { col: shade(BUFF, 0.9) }); ST1.cap('plain', rect(X0, Z0 + 2.5, 1.0, 0.6), y0 + 0.81, BITUMEN);   // the offering table, black with burning
    for (let k = 0; k < 5; k++) pot(ST1, X0 - ix + 0.6, y0, Z0 - 6 + k * 1.1, 'pithos', shade(CLAY, 0.85 + r() * 0.2), 0.8);
    solids.room(X0, Z0, 17.5, 22.3, 0, 1.0, [[1, 0, 1.3]], Y(-3490));
    for (const sd of [-1, 1]) for (const [za, zb] of [[Z0 - iz, Z0 - gz], [Z0 + gz, Z0 + iz]]) solids.box(X0 + sd * (hx + pt / 2), (za + zb) / 2, pt, zb - za, 0, Y(-3490), Infinity, { rad: 0.3 });
    solids.box(X0, Z0 - iz + 1.2, 3.0, 2.4, 0, Y(-3490), Infinity, { rad: 0.3 }).box(X0, Z0 + 2.5, 1.6, 1.1, 0, Y(-3490), Infinity, { rad: 0.3 });
    solids.platform(X0, Z0, 19.5, 24.3, 0, () => FLAT + PH * world.hill + 0.5, Y(-3490));
  }
  ST1.box('plaster', TC[0], 7.45, TC[1], 6.4, 2.0, 19.6, 0, { col: shade(WHITE, 0.98), batter: 0.08 });   // the long middle hall stands higher than the rooms on either side, lit from under its roof
  ST1.box('plaster', TC[0], 9.42, TC[1], 6.7, 0.16, 19.9, 0, { col: shade(WHITE, 0.9) });
  for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) { const X = TC[0] + s * 3.21, z = TC[1] + k * 2.6;
    ST1.quad('plain', [X, 8.35, z + s * 0.4], [X, 8.35, z - s * 0.4], [X, 9.0, z - s * 0.4], [X, 9.0, z + s * 0.4], DARK); }
  for (const [f, a] of [[1, 0], [2, 3]]) opening(ST1, TC[0], 0.5, TC[1], 17.5, 22.3, 0, f, a, 1.3, 3.4, 0, null, { out: 0.03, hole: f === 1 });
  for (let k = 0; k < 4; k++) pot(ST1, TC[0] + 12, 0, TC[1] - 4.5 + k * 3, 'pithos', shade(CLAY, 0.9), 1);
  ST1.box('plaster', TC[0] + 14, 0, TC[1], 1.6, 1.0, 1.2, 0, { col: shade(WHITE, 0.95) });   // an offering table
  // the smaller temple that stood here before
  ST0.box('plaster', TC[0], 0, TC[1], 14, 0.4, 17, 0, { col: MUD2 });
  nichedBlock(ST0, 'plaster', TC[0], TC[1], 12, 15, 0, 0.4, 5, { col: shade(BUFF, 0.95), depth: 0.3 });
  opening(ST0, TC[0], 0.4, TC[1], 12, 15, 0, 1, 0, 1.1, 2.6, 0, null, { out: 0.03 });
  solids.box(TC[0], TC[1], 19.5, 24.3, 0, -Infinity, Y(-3490)).box(PX0, -90, 1, 61).box(-70, PZ0, 61, 1).box(-70, PZ1, 61, 1).box(PX1, (PZ0 - 95) / 2, 1, 26).box(PX1, (PZ1 - 85) / 2, 1, 26).box(-25, -97.5, 30, 5).box(-25, -82.5, 30, 5);

  // ---------- Eanna, the precinct of Inanna ----------
  const EC = [92, -130];
  // the court of cone mosaic: a terrace, a wall and a row of great half-columns, every surface patterned
  SE.box('mosaic', EC[0], FLAT - 0.2, EC[1] + 14, 34, 1.5, 12, 0, { col: [1, 1, 1], cap: 'plaster', capCol: BUFF });
  SE.box('mosaic', EC[0], FLAT + 1.3, EC[1] + 9.4, 34, 5.2, 1.6, 0, { col: [1, 1, 1], cap: 'plaster', capCol: MUD });
  for (let k = 0; k < 8; k++) { const cx = EC[0] - 14 + k * 4; SE.lathe('mosaic', cx, FLAT + 1.3, EC[1] + 11.4, [[1.3, 0], [1.28, 3.2], [1.2, 5.0]], 16, { col: [1, 1, 1], cap: 'plaster', capCol: MUD }); solids.circle(cx, EC[1] + 11.4, 1.3, Y(-3600)); }
  for (let k = 0; k < 5; k++) SE.box('brick', EC[0], FLAT - 0.2, EC[1] + 20 + k * 0.45, 8, 1.3 - k * 0.28, 0.45, 0, { col: BUFF });   // steps up
  solids.box(EC[0], EC[1] + 14, 34, 12, 0, Y(-3600));
  // the great temple behind it, and the long storehouses where the accounts are kept
  nichedBlock(SE, 'plaster', EC[0] + 6, EC[1] - 22, 52, 22, 0, FLAT - 0.2, 8.7, { col: shade(BUFF, 1.05), bw: 1.6, nw: 1.4, depth: 0.45 });
  for (const a of [-12, 12]) opening(SE, EC[0] + 6, FLAT, EC[1] - 22, 52, 22, 0, 2, a, 1.6, 3.6, 0, null, { out: 0.03 });
  solids.box(EC[0] + 6, EC[1] - 22, 52, 22, 0, Y(-3600));
  for (let k = 0; k < 4; k++) { const x = EC[0] - 36, z = EC[1] - 26 + k * 13; house(SE, r, x, FLAT, z, 22, 6.5, 4.2, 0, { m: 'brick', col: shade(MUD, 0.9 + r() * 0.15), footing: false, door: 1, windows: 0, beams: false }); solids.box(x, z, 22, 6.5, 0, Y(-3600)); }
  const jars = (Sx, x, z, n, kind = 'jar', sp = 0.75) => { for (let i = 0; i < n; i++) pot(Sx, x + (i % 5) * sp + (r() - 0.5) * 0.1, FLAT, z + ((i / 5) | 0) * sp + (r() - 0.5) * 0.1, kind, shade(CLAY, 0.75 + r() * 0.45), 0.85 + r() * 0.3); };
  jars(SE, EC[0] - 22.5, EC[1] - 20, 20); jars(SE, EC[0] - 22.5, EC[1] - 4, 15); jars(SE, EC[0] - 22.5, EC[1] + 6, 10, 'pithos', 1);
  heap(SE, EC[0] - 15, FLAT, EC[1] - 12, 1.6, 1.0, STRAW);

  // ---------- the town ----------
  const blocked = (x, z, m = 0) => (x > PX0 - 9 - m && x < SX1 + 14 + m && z > PZ0 - 9 - m && z < PZ1 + 9 + m) || (x > EC[0] - 50 - m && x < EC[0] + 36 + m && z > EC[1] - 37 - m && z < EC[1] + 24 + m)
    || (Math.abs(x - ROAD) < 5.5 + m && z > -72) || (x > 2 - m && x < EC[0] - 50 && z > -112 - m && z < -66 + m) || (Math.abs(z + 150) < 3.5 + m && x > -220 && x < 46);
  const homes = [];
  for (let i = 0; i < 31; i++) for (let j = 0; j < 18; j++) {
    const x = -225 + i * 15 + (r() - 0.5) * 2.4, z = -276 + j * 15 + (r() - 0.5) * 2.4, w = 8.5 + r() * 4.5, d = 8.5 + r() * 4.5, h = r() < 0.16 ? 5.6 + r() * 1.2 : 3 + r() * 1.3;
    if (blocked(x, z, Math.max(w, d) / 2) || z > -16 || r() < 0.07) continue;
    const dist = Math.hypot(x - ROAD, z + 90), Sx = dist < 135 ? S : dist < 215 ? S2 : S3, from = dist < 135 ? -Infinity : dist < 215 ? Y(-3700) : Y(-3150), rot = (r() - 0.5) * 0.12;
    const nearRoad = Math.abs(x - ROAD) < 45 || dist < 70;
    const open = nearRoad && Sx === S && h < 5 && homes.filter((q) => q.open).length < 2;   // two houses by the road stand open: walk in
    const hs = house(Sx, r, x, FLAT, z, w, d, h, rot, { m: r() < 0.75 ? 'brick' : 'plaster', col: shade(r() < 0.12 ? BUFF : MUD, 0.82 + r() * 0.3), footing: false, parapet: 0.45, beams: nearRoad, door: (r() * 4) | 0, windows: nearRoad ? 2 : 1, batter: 0.14, spouts: true, mat: true, open });
    if (open) { solids.room(x, z, w, d, rot, hs.t, [[hs.door, hs.da, hs.dw]], from); furnish(Sx, hs, FLAT, rng(3400 + homes.length), { benchM: 'brick' }); }
    else solids.box(x, z, w, d, rot, from);
    homes.push({ x, z, w, d, h, rot, from, nearRoad, open: open ? hs : null });
    if (nearRoad && r() < 0.3) { const q = local(x, z, rot, w / 2 + 1, (r() - 0.5) * d * 0.4); ladder(Sx, q[0], FLAT, q[1], h + 0.5, rot + Math.PI); }
  }
  // houses where Eanna will be laid out
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const x = EC[0] - 40 + i * 16 + (r() - 0.5) * 3, z = EC[1] - 30 + j * 14 + (r() - 0.5) * 3, w = 9 + r() * 4, d = 8 + r() * 3; if (r() < 0.2) continue; house(SPre, r, x, FLAT, z, w, d, 3 + r(), 0, { m: 'brick', col: shade(MUD, 0.85 + r() * 0.25), footing: false, beams: false }); solids.box(x, z, w, d, 0, -Infinity, Y(-3600)); }
  // the road from the quay through the gate to the temples
  const DUST = lin(0xb8a680);
  S.quad('plaster', [ROAD - 4, FLAT + 0.03, 122], [ROAD + 4, FLAT + 0.03, 122], [ROAD + 4, FLAT + 0.03, -70], [ROAD - 4, FLAT + 0.03, -70], DUST, [0, 0], [0, 1, 0]);
  S.quad('plaster', [SX1, FLAT + 0.03, -70], [EC[0] - 50, FLAT + 0.03, -70], [EC[0] - 50, FLAT + 0.03, -110], [SX1, FLAT + 0.03, -110], DUST, [0, 0], [0, 1, 0]);

  // ---------- the city wall (the work, they will say, of Gilgamesh) ----------
  const WH = 8.2;
  const wallRun = (x0, z0, x1, z1) => {
    const horiz = z0 === z1, len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    SW.box('brick', cx, -0.3, cz, horiz ? len : 5, WH + 0.3, horiz ? 5 : len, 0, { col: MUD, batter: 0.35, cap: 'plaster', capCol: shade(MUD, 1.05) });
    SW.box('brick', cx, -0.3, cz, horiz ? len : 5.6, 1.7, horiz ? 5.6 : len, 0, { col: shade(MUD, 0.76) });   // the foot of the wall, dark and eaten back
    for (let t = 5.5; t < len - 3; t += 5.5) {   // flat buttresses between the towers, their heads standing above the parapet
      if ((t - 11) % 22 === 0) continue;
      const x = horiz ? Math.min(x0, x1) + t : x0 + Math.sign(x0) * 2.75, z = horiz ? z0 + 2.75 : Math.min(z0, z1) + t;
      SW.box('brick', x, -0.3, z, horiz ? 1.8 : 0.9, WH + 1.75, horiz ? 0.9 : 1.8, 0, { col: shade(MUD, 0.93 + ((t * 7) % 5) * 0.02), batter: 0.1 });
    }
    SW.prism('brick', rect(cx, cz, horiz ? len - 0.5 : 4.2, horiz ? 4.2 : len - 0.5), WH, WH + 0.01, { col: MUD, cap: false });
    for (const side of [-1, 1]) SW.box('brick', horiz ? cx : cx + side * 2.0, WH, horiz ? cz + side * 2.0 : cz, horiz ? len - 0.6 : 0.6, 1.0, horiz ? 0.6 : len - 0.6, 0, { col: shade(MUD, 0.95) });
    solids.box(cx, cz, horiz ? len : 5, horiz ? 5 : len, 0, Y(-2950));
    for (let t = 11; t < len - 5; t += 22) {   // half-round towers along the outer face
      const x = horiz ? Math.min(x0, x1) + t : x0 + Math.sign(x0) * 2.2, z = horiz ? z0 + 2.2 : Math.min(z0, z1) + t, a0 = horiz ? 0 : x0 > 0 ? -Math.PI / 2 : Math.PI / 2;
      SW.lathe('brick', x, -0.3, z, [[3.6, 0], [3.3, WH + 1.2]], 10, { a0, a1: a0 + Math.PI, col: shade(MUD, 0.97), cap: 'plaster', capCol: MUD }); SW.lathe('brick', x, WH + 0.9, z, [[3.45, 0], [3.45, 1.0], [2.9, 1.0], [2.9, 0.01]], 10, { a0, a1: a0 + Math.PI, col: shade(MUD, 0.92) });
    }
  };
  wallRun(-WALL_X, GATE_Z, ROAD - 10, GATE_Z); wallRun(ROAD + 10, GATE_Z, WALL_X, GATE_Z); wallRun(-WALL_X, GATE_Z - 2.5, -WALL_X, WALL_N); wallRun(WALL_X, GATE_Z - 2.5, WALL_X, WALL_N);
  for (const s of [-1, 1]) { SW.box('brick', ROAD + s * 8, -0.3, GATE_Z, 7, 12, 9, 0, { col: shade(MUD, 0.96), batter: 0.4, cap: 'plaster' }); nichedDecor(SW, ROAD + s * 8, GATE_Z + 4.55, 12); solids.box(ROAD + s * 8, GATE_Z, 7, 9, 0, Y(-2950)); }
  SW.box('brick', ROAD, 5.2, GATE_Z, 9.4, 5.6, 6, 0, { col: MUD, cap: 'plaster' }); SW.cap('brick', rect(ROAD, GATE_Z, 9.4, 6), 5.2, shade(MUD, 0.6), true);
  for (let k = -4; k <= 4; k++) SW.beam('wood', [ROAD + k * 1.0, 5.1, GATE_Z - 3.2], [ROAD + k * 1.0, 5.1, GATE_Z + 3.2], 0.14, 0.14, 5, TIMBER);
  function nichedDecor(Sx, x, z, h) { for (const a of [-1.8, 0, 1.8]) { Sx.quad('plain', [x + a - 0.35, 1.5, z], [x + a + 0.35, 1.5, z], [x + a + 0.35, h - 2.5, z], [x + a - 0.35, h - 2.5, z], shade(MUD, 0.5)); } }

  // ---------- fields, ditches ----------
  const plots = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 29; i++) {
    const x = -238 + i * 17 + 7, z = row ? 87 : 41;
    if (Math.abs(x - ROAD) < 13 || (row === 0 && x > -78 && x < 114) || (x > 196 && row === 1) || (Math.abs(x - SPAWN.x) < 4)) continue;
    plots.push({ x, z, row, i });
  }
  const STAGES = ['ripe', 'ripe', 'ripe', 'green', 'green', 'ploughed', 'ploughed', 'stubble', 'sown'];
  for (const p of plots) { p.stage = STAGES[(r() * STAGES.length) | 0]; p.cut = p.stage === 'ripe' && r() < 0.65 ? 0.2 + r() * 0.5 : 0; }
  const fix = (x, z, stage, cut = 0) => { let b = null; for (const p of plots) if (!p.fix && (!b || Math.hypot(p.x - x, p.z - z) < Math.hypot(b.x - x, b.z - z))) b = p; b.stage = stage; b.cut = cut; b.fix = true; return b; };
  fix(SPAWN.x - 16, 87, 'ripe', 0.4); fix(SPAWN.x + 18, 87, 'ploughed').team = 1; fix(SPAWN.x - 34, 87, 'ploughed').team = 1; fix(SPAWN.x + 36, 87, 'green'); fix(-150, 41, 'ploughed').team = 1; fix(SPAWN.x + 54, 87, 'ripe', 0.55);
  let carriers = 0;
  for (const p of plots) {
    const w = 39 + r() * 3, d = 13.2, rot = Math.PI / 2, f = field(S, r, p.x, p.z, w, d, rot, FLAT, p.stage, { cut: p.cut, tall: 1.1 });
    if (p.stage === 'ripe' && p.cut) {
      const n = 3 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++) { const q = f.at(f.cutX - 0.5 - r() * 0.25, -d / 2 + (d * (k + 0.5)) / n + (r() - 0.5) * 0.5); P(mf(), 'reap', q[0], q[1], rot + (r() - 0.5) * 0.2); }
      { const q = f.at(f.cutX - 2.6, (r() - 0.5) * d * 0.5); P(F, 'crouch', q[0], q[1], rot + 2.6); }
      if (carriers++ < 5) P(M, 'carry', 0, 0, 0, { path: [[p.x - 8.3, p.z], [p.x - 8.3, 64], [ROAD + (p.x > ROAD ? 8 : -8), 64], [58, 54]], prop: 'basket' });
    } else if (p.stage === 'ploughed') {
      if (p.team) {   // a pair of oxen, the ploughman, and the sower dropping seed into the furrow behind him
        const z0 = p.z - w / 2 + 4, z1 = p.z + w / 2 - 4, loop = [[p.x - 3.3, z0], [p.x - 3.3, z1], [p.x - 1.5, z1 + 2], [p.x + 1.5, z1 + 2], [p.x + 3.3, z1], [p.x + 3.3, z0], [p.x + 1.5, z0 - 2], [p.x - 1.5, z0 - 2], [p.x - 3.3, z0]], lp = loopOf(loop), phase = r(), speed = 0.62;
        P(M, 'plough', 0, 0, 0, { path: loop, speed, phase }); P(M, 'sow', 0, 0, 0, { path: loop, speed, phase: phase - 2.4 / lp.L });
        P(M, 'herd', 0, 0, 0, { path: loop, speed, phase: phase + 5.6 / lp.L, s: 0.7 });   // the boy who leads the team
        for (const side of [-1, 1]) walkers.push({ make: L.ox, lp, speed, phase, ahead: 3.5, side: side * 0.55, s: 0.92 });
      } else for (let k = 0; k < 3; k++) { const q = f.at(-w / 2 + 3 + r() * (w - 8), -d / 2 + (d * (k + 0.5)) / 3); P(M, r() < 0.6 ? 'hoe' : 'dig', q[0], q[1], rot + (r() - 0.5) * 0.4); }
    } else if (p.stage === 'green' && r() < 0.7) { for (let k = 0; k < 2; k++) { const q = f.at((r() - 0.5) * w * 0.7, (r() - 0.5) * d * 0.7); P(mf(), 'crouch', q[0], q[1], r() * 6); } }
    else if (p.stage === 'stubble') p.sheep = [f.at(-w / 4, -d / 5), f.at(w / 5, d / 4), f.at(w / 3, -d / 4), f.at(0, 0)];
    else if (p.stage === 'sown' && r() < 0.6) { const q = f.at(0, d / 2 + 0.6); P(M, 'dig', q[0], q[1], 0); }   // clearing the ditch
  }
  // ditches from the canal between the strips, and the men who keep them open
  for (let i = 0; i <= 29; i += 1) { const x = -238 + i * 17 - 1.5; if (Math.abs(x - ROAD) < 14 || x > 200) continue; const z0 = x > -80 && x < 116 ? 64 : 19;
    S.quad('water', [x - 0.45, FLAT + 0.05, 120], [x + 0.45, FLAT + 0.05, 120], [x + 0.45, FLAT + 0.05, z0], [x - 0.45, FLAT + 0.05, z0], WATER, null, [0, 1, 0]).quad('earth', [x - 1, FLAT + 0.03, 120], [x + 1, FLAT + 0.03, 120], [x + 1, FLAT + 0.03, z0], [x - 1, FLAT + 0.03, z0], lin(0x7a684a), null, [0, 1, 0]);
    if (i % 4 === 1) P(M, 'dig', x + 0.9, 70 + r() * 40, Math.PI); if (i % 5 === 2) P(F, 'fetch-water', x + 1.0, 72 + r() * 36, Math.PI); }
  S.quad('water', [-240, FLAT + 0.05, 62.5], [-240, FLAT + 0.05, 63.5], [196, FLAT + 0.05, 63.5], [196, FLAT + 0.05, 62.5], WATER, null, [0, 1, 0]);

  // ---------- outside the gate: threshing, weaving, pots, the market ----------
  const TF = [62, 44];
  S.lathe('plaster', TF[0], FLAT, TF[1], [[8, 0], [7.9, 0.06]], 28, { col: lin(0xc9bb9b), cap: 'plaster' });
  for (let k = 0; k < 14; k++) { const a = r() * 6.283, d = 1 + r() * 5; S.lathe('reed', TF[0] + Math.cos(a) * d, FLAT + 0.05, TF[1] + Math.sin(a) * d, [[0.8, 0], [0.6, 0.1], [0.05, 0.16]], 7, { col: shade(STRAW, 0.8 + r() * 0.3), sx: 1.5, rot: r() * 3 }); }
  heap(S, TF[0] + 10, FLAT, TF[1] - 3, 1.8, 1.1, STRAW); heap(S, TF[0] + 10.5, FLAT, TF[1] + 3, 1.2, 0.7, lin(0xe0d0a0)); solids.circle(TF[0] + 10, TF[1] - 3, 1.5);
  for (let k = 0; k < 10; k++) sheaf(S, TF[0] - 10 - (k % 3) * 0.7, FLAT, TF[1] - 2 + ((k / 3) | 0) * 0.8, r, 1.2);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.283 + 0.4; P(M, 'thresh', TF[0] + Math.cos(a) * 3.4, TF[1] + Math.sin(a) * 3.4, Math.PI - a); }
  P(F, 'trade', TF[0] + 8, TF[1] - 1.4, 0.3); P(F, 'trade', TF[0] + 8.6, TF[1] + 1.6, -0.2); jars(S, TF[0] + 7, TF[1] + 7, 10);
  P(M, 'write', TF[0] + 9.2, TF[1] + 5.6, -1.2, { u0: Y(-3350) }); P(M, 'talk', TF[0] + 9.2, TF[1] + 5.6, -1.2, { u1: Y(-3350) }); P(M, 'carry', 0, 0, 0, { path: [[TF[0] + 6, TF[1] + 8], [ROAD + 2, 60], [ROAD + 2, -60], [EC[0] - 20, EC[1] - 10]], prop: 'sack' });
  // an awning of reed mats on posts
  const awning = (x, z, w, d, h = 2.5) => { for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]]) S.beam('wood', [x + px * w / 2, FLAT, z + pz * d / 2], [x + px * w / 2, FLAT + h, z + pz * d / 2], 0.07, 0.06, 5, TIMBER); S.box('reed', x, FLAT + h, z, w + 0.8, 0.09, d + 0.8, 0, { col: shade(REED, 0.9), cap: 'reed' }); S.cap('reed', rect(x, z, w + 0.8, d + 0.8), FLAT + h, shade(REED, 0.6), true); };
  // the weavers: wool is what the city sells
  awning(-22, 40, 16, 6);
  for (let k = 0; k < 6; k++) P(F, 'weave', -28.5 + k * 2.6, 41, Math.PI / 2);
  for (let k = 0; k < 4; k++) P(F, 'spin', -27 + k * 3.4, 46.5, 1 + r()); for (let k = 0; k < 5; k++) heap(S, -14 + (k % 3) * 1.1, FLAT, 35 + ((k / 3) | 0) * 1.1, 0.5, 0.45, lin(0xddd6c4), 'plaster');   // fleeces
  // the potters: wheels, kilns, rows of the plain bowls that rations are measured in
  const PY = [-58, 42]; awning(PY[0], PY[1], 12, 5);
  for (let k = 0; k < 5; k++) P(M, 'potter', PY[0] - 5 + k * 2.4, PY[1] + 0.6, Math.PI / 2);
  for (const [kx, kz] of [[PY[0] - 10, PY[1] - 7], [PY[0] - 4, PY[1] - 9]]) { S.lathe('brick', kx, FLAT - 0.1, kz, [[1.5, 0], [1.5, 1.2], [1.2, 2.0], [0.55, 2.5], [0.4, 2.55]], 12, { col: shade(MUD2, 0.8), cap: 'plain', capCol: DARK }); S.quad('plain', [kx - 0.3, FLAT, kz + 1.52], [kx + 0.3, FLAT, kz + 1.52], [kx + 0.3, FLAT + 0.55, kz + 1.52], [kx - 0.3, FLAT + 0.55, kz + 1.52], DARK); solids.circle(kx, kz, 1.5); P(M, 'tend-fire', kx + 0.3, kz + 2.7, Math.PI / 2 + 0.3, { prop: 'none' }); }
  for (let i = 0; i < 60; i++) pot(S, PY[0] + 3 + (i % 10) * 0.42, FLAT, PY[1] - 6 - ((i / 10) | 0) * 0.42, 'bevel', shade(BUFF, 0.8 + r() * 0.3), 1.3); jars(S, PY[0] - 3, PY[1] + 4.5, 15); jars(S, PY[0] + 4, PY[1] + 4.5, 8, 'pithos', 1.0);
  P(M, 'dig', PY[0] + 10, PY[1] - 2, 0); heap(S, PY[0] + 11.5, FLAT, PY[1] - 2, 1.3, 0.6, lin(0x8a7050)); P(M, 'carry', 0, 0, 0, { path: [[PY[0] + 2, PY[1] + 6.5], [ROAD - 3, 60], [ROAD - 3, 117]], prop: 'jar' });
  // the market by the road
  for (let k = 0; k < 6; k++) { const z = 24 + k * 6, s = k % 2 ? 1 : -1, x = ROAD + s * 6.5; jars(S, x + s * 1.2 - 1, z - 0.8, 6); pot(S, x + s * 1.4, FLAT, z + 1.6, 'basket', shade(REED, 0.9), 1.2); P(mf(), 'trade', x, z, s > 0 ? Math.PI : 0); P(mf(), k % 3 ? 'talk' : 'stand', x - s * 1.5, z + 0.3, s > 0 ? 0 : Math.PI); if (k % 2) P(M, 'sit', x + s * 1.2, z + 2.4, s > 0 ? Math.PI : 0); }

  // ---------- the quay ----------
  S.box('brick', ROAD + 6, FLAT - 2.6, 122.6, 56, 2.63, 4.4, 0, { col: MUD2, cap: 'plaster', capCol: BUFF });
  for (let k = 0; k < 4; k++) { reedBoat(S, -14 + k * 15, 0.12, 128.3, (r() - 0.5) * 0.12, 6.5 + r() * 1.5); if (k % 2) jars(S, -15 + k * 15, 123.2, 4); }
  jars(S, ROAD + 7, 121.5, 15); jars(S, ROAD + 14, 121.8, 10, 'pithos', 1); for (let k = 0; k < 6; k++) pot(S, ROAD - 9 + (k % 3) * 0.8, FLAT, 121.6 + ((k / 3) | 0) * 0.8, 'basket', shade(REED, 0.9), 1.2);
  P(M, 'write', ROAD + 11.5, 120.2, -Math.PI / 2, { u0: Y(-3350) }); P(M, 'talk', ROAD + 11.5, 120.2, -Math.PI / 2, { u1: Y(-3350) }); P(M, 'trade', ROAD + 6, 120.4, 0); P(M, 'talk', ROAD + 4.4, 120.6, 0.2); P(F, 'stand', ROAD - 6, 121.5, -1.2);
  for (let k = 0; k < 4; k++) P(M, 'carry', 0, 0, 0, { path: [[ROAD - 2 + k, 121], [ROAD - 2 + k, 10], [ROAD - 2 + k, -60], [EC[0] - 26, EC[1] - 8]], prop: ['jar', 'sack', 'basket', 'jar'][k], phase: k / 4 });
  for (let k = 0; k < 3; k++) P(M, 'fish', 251.5, 30 + k * 26, 0); P(M, 'fish', -60, 124.6, -Math.PI / 2); P(M, 'fish', 120, 124.6, -Math.PI / 2);
  // reed houses by the river, where the marsh people live
  mudhif(S, 214, FLAT, 86, 0.2); mudhif(S, 222, FLAT, 104, -0.1, 10, 4.6, 3.8); mudhif(S, 208, FLAT, 44, 1.5, 9, 4.4, 3.6);
  solids.box(214, 86, 12, 5.2, 0.2).box(222, 104, 10, 4.6, -0.1).box(208, 44, 9, 4.4, 1.5);
  P(F, 'cook', 224, 92.5, 1); P(M, 'sit', 226, 94.5, 2.5); P(F, 'weave', 210, 80, 0.8, { prop: 'none' }); P(M, 'stand', 229, 96, 3, { s: 0.6 }); reedBoat(S, 256, 0.7, 90, 1.45, 6);

  // ---------- inside the walls ----------
  for (let k = 0; k < 12; k++) P(mf(), k % 3 === 0 ? 'carry' : 'walk', 0, 0, 0, { path: [[ROAD - 3 + (k % 6) * 1.2, 14], [ROAD - 3 + (k % 6) * 1.2, -64], [k % 2 ? EC[0] - 44 : -2, -72 - (k % 4) * 8]], phase: r(), prop: k % 6 === 0 ? 'jar' : k % 3 === 0 ? 'basket' : undefined });
  for (let k = 0; k < 6; k++) P(mf(), 'walk', 0, 0, 0, { path: [[-200 + k * 20, -150 + (k % 2) * 2 - 1], [40, -150 + (k % 2) * 2 - 1]], phase: r() });
  for (let k = 0; k < 9; k++) { const x = 4 + r() * 34, z = -106 + r() * 30; P(mf(), ['talk', 'stand', 'trade', 'sit', 'stand'][k % 5], x, z, r() * 6, k === 4 ? { s: 0.6 } : {}); }
  // the procession: priests in fleece skirts, bearers with jars and baskets, up the stair to the god's house
  const WAY = [[32, -90], [SX1, -90], [PX1, -90], [-56, -90]];
  for (let k = 0; k < 6; k++) P(PR, 'walk', 0, 0, 0, { path: WAY, phase: k * 0.035, speed: 0.9 });
  for (let k = 0; k < 4; k++) P(k % 2 ? F : M, 'carry', 0, 0, 0, { path: WAY.map(([x, z]) => [x, z + (k % 2 ? 1.6 : -1.6)]), phase: 0.25 + k * 0.03, speed: 0.9, prop: k % 2 ? 'jar' : 'basket' });
  P(PR, 'pray', -58, -92.5, Math.PI); P(PR, 'pray', -58, -87.5, Math.PI); P(PR, 'bow-down', -55, -90, Math.PI); P(M, 'bow-down', -6, -93, Math.PI); P(F, 'bow-down', -5, -87, Math.PI); P(F, 'pray', -3, -90, Math.PI);
  P(M, 'guard', SX1 + 1, -96.5, 0); P(M, 'guard', SX1 + 1, -83.5, 0);
  // the scribes of Eanna, counting what comes in: jars of barley, sheep, bales of wool
  for (let k = 0; k < 6; k++) { P(M, 'write', EC[0] - 21 + k * 1.6, EC[1] - 13.2 + (k % 2) * 6, k % 2 ? Math.PI / 2 : -Math.PI / 2, { u0: Y(-3350) }); P(M, k % 2 ? 'sit' : 'talk', EC[0] - 21 + k * 1.6, EC[1] - 13.2 + (k % 2) * 6, k % 2 ? Math.PI / 2 : -Math.PI / 2, { u0: Y(-3600), u1: Y(-3350) }); }
  P(PR, 'point', EC[0] - 10, EC[1] - 8, Math.PI, { u0: Y(-3600) }); P(M, 'trade', EC[0] - 13, EC[1] - 6, 0.3, { u0: Y(-3600) }); P(PR, 'stand', EC[0] - 2, EC[1] + 23, -Math.PI / 2, { u0: Y(-3600), prop: 'staff' }); P(F, 'pray', EC[0] + 3, EC[1] + 24, Math.PI / 2, { u0: Y(-3600) }); P(M, 'bow-down', EC[0] + 6, EC[1] + 25, Math.PI / 2, { u0: Y(-3600) });
  herds.push(standing(world, L.sheep, [0, 1, 2, 3, 4, 5].map((k) => ({ x: EC[0] - 12 + (k % 3) * 1.5 + r(), z: EC[1] - 1 + ((k / 3) | 0) * 1.6, rot: r() * 6, s: 0.9 + r() * 0.2, u0: Y(-3600) }))));
  // on the roofs
  homes.filter((h) => h.nearRoad && h.h < 5).slice(0, 40).forEach((h, k) => { if (k % 3) return; const q = local(h.x, h.z, h.rot, (r() - 0.5) * (h.w - 3), (r() - 0.5) * (h.d - 3)); P(k % 2 ? F : M, ['sit', 'spin', 'sleep', 'stand', 'grind'][(k / 3 | 0) % 5], q[0], q[1], r() * 6, { y: h.h, u0: h.from }); });
  // guards at the gate and on the wall
  for (const s of [-1, 1]) P(M, 'guard', ROAD + s * 3.6, GATE_Z + 5.4, -Math.PI / 2, { u0: Y(-2950) });
  for (let k = 0; k < 4; k++) P(M, 'patrol', 0, 0, 0, { path: k < 2 ? [[ROAD - 14, 0], [-WALL_X + 6, 0]] : [[ROAD + 14, 0], [WALL_X - 6, 0]], y: WH, phase: r(), u0: Y(-2950) });
  // building the wall: brick carriers before it stands
  for (let k = 0; k < 8; k++) P(M, 'carry', 0, 0, 0, { path: [[-60 + k * 14, 16], [-60 + k * 14, 4]], prop: k % 2 ? 'basket' : 'sack', phase: r(), u0: Y(-3000), u1: Y(-2950) });

  // ---------- animals ----------
  const sheepTint = () => { const g = 0.8 + r() * 0.35; return [g, g, g * (0.9 + r() * 0.1)]; };
  const PAST = [-292, 64], flockAt = [], n = 30;
  for (let k = 0; k < n; k++) flockAt.push({ x: PAST[0] + (r() - 0.5) * 60, z: PAST[1] + (r() - 0.5) * 80, rot: r() * 6.283, s: 0.85 + r() * 0.3, tint: sheepTint() });
  const onStubble = plots.filter((p) => p.sheep).flatMap((p) => p.sheep.map(([x, z]) => ({ x, z, rot: r() * 6.283, s: 0.85 + r() * 0.3, tint: sheepTint() })));
  herds.push(standing(world, L.sheep, flockAt.filter((_, i) => i % 3 === 0)), standing(world, L.sheep, [...flockAt.filter((_, i) => i % 3), ...onStubble], { graze: 1.0, g: 2.2 }));
  herds.push(standing(world, L.goat, [0, 1, 2, 3, 4].map((k) => ({ x: 232 + r() * 8, z: 60 + r() * 14, rot: r() * 6, s: 0.9 + r() * 0.2 })), { graze: 1.25, g: 2.2 }));
  P(M, 'stand', PAST[0] + 34, PAST[1] - 20, 2.6, { prop: 'staff' }); P(M, 'write', PAST[0] + 36, PAST[1] - 17, 2.2, { u0: Y(-3350) }); P(M, 'sit', PAST[0] + 30, PAST[1] + 30, 1);
  const LOOP = [[-262, 26], [-262, 108], [-322, 108], [-322, 26], [-262, 26]];
  P(M, 'herd', 0, 0, 0, { path: LOOP, speed: 0.7, phase: 0.2 }); for (let k = 0; k < 5; k++) walkers.push({ make: L.sheep, path: LOOP, speed: 0.7, phase: 0.2, ahead: 2.5 + k * 1.3, side: (k % 3 - 1) * 1.2, s: 0.9 + r() * 0.2 });
  // carts on solid wheels, once somebody has thought of them
  const CARTWAY = [[ROAD - 1.6, 112], [ROAD - 1.6, -62], [ROAD + 1.6, -66], [ROAD + 1.6, 112], [ROAD - 1.6, 112]], cartLp = loopOf(CARTWAY), carts = [];
  for (const phase of [0.1, 0.62]) {
    const g = new THREE.Group(), C = new Shape(); wheels.add(g);
    // a bed of planks on two long timbers, stake sides, wheels of three boards pegged together with battens, a pole and a yoke
    const T2 = shade(TIMBER, 0.8), T3 = shade(TIMBER, 1.25);
    for (let k = 0; k < 5; k++) C.box('wood', -0.2, 0.66, -0.5 + k * 0.25, 2.5, 0.07, 0.235, 0, { col: shade(TIMBER, 0.95 + (k % 2) * 0.2) });
    for (const s of [-1, 1]) {
      C.box('wood', -0.2, 0.56, s * 0.45, 2.7, 0.1, 0.1, 0, { col: T2 });
      C.beam('wood', [-0.2, 0.52, s * 0.72], [-0.2, 0.52, s * 0.8], 0.52, 0.52, 16, shade(TIMBER, 0.9));   // the wheel
      C.beam('wood', [-0.2, 0.52, s * 0.69], [-0.2, 0.52, s * 0.83], 0.53, 0.53, 16, shade(TIMBER, 0.6), false);   // its tyre of rawhide
      C.beam('wood', [-0.2, 0.52, s * 0.66], [-0.2, 0.52, s * 0.93], 0.13, 0.1, 8, T2);   // the nave
      C.beam('wood', [-0.2, 0.44, s * 0.9], [-0.2, 0.62, s * 0.9], 0.02, 0.02, 4, T3);   // the linchpin
      for (const dx of [-0.24, 0.24]) C.box('wood', -0.2 + dx, 0.14, s * 0.815, 0.07, 0.76, 0.035, 0, { col: T3 });   // battens across the three boards
      for (const dx of [-0.17, 0.17]) C.box('wood', -0.2 + dx, 0.03, s * 0.8, 0.012, 0.98, 0.012, 0, { col: shade(TIMBER, 0.35) });   // the joints between them
      for (let k = 0; k < 5; k++) C.beam('wood', [-1.35 + k * 0.575, 0.7, s * 0.6], [-1.35 + k * 0.575, 1.22, s * 0.64], 0.028, 0.024, 4, TIMBER, false);   // stakes
      C.beam('wood', [-1.42, 1.18, s * 0.64], [1.02, 1.18, s * 0.64], 0.027, 0.027, 4, T3); C.beam('wood', [-1.42, 0.95, s * 0.62], [1.02, 0.95, s * 0.62], 0.022, 0.022, 4, TIMBER, false);
    }
    C.box('wood', 1.02, 0.7, 0, 0.05, 0.55, 1.26, 0, { col: shade(TIMBER, 1.1) }); C.box('wood', -1.42, 0.7, 0, 0.05, 0.3, 1.26, 0, { col: TIMBER });   // head and tail boards
    C.beam('wood', [-0.2, 0.52, -0.9], [-0.2, 0.52, 0.9], 0.06, 0.06, 6, T2); C.beam('wood', [-1.3, 0.56, 0], [1.6, 0.6, 0], 0.055, 0.055, 5, T2); C.beam('wood', [1.6, 0.6, 0], [3.9, 1.12, 0], 0.055, 0.045, 5, TIMBER);
    C.beam('wood', [3.85, 1.14, -0.8], [3.85, 1.14, 0.8], 0.055, 0.055, 6, T3); for (const s of [-1, 1]) for (const dz of [0.42, 0.78]) C.beam('wood', [3.85, 1.14, s * dz], [3.87, 0.86, s * dz], 0.02, 0.02, 4, T2, false);   // the yoke and its pegs
    for (let k = 0; k < 6; k++) pot(C, -1 + (k % 3) * 0.75, 0.74, -0.3 + ((k / 3) | 0) * 0.6, 'jar', shade(CLAY, 0.8 + r() * 0.4), 0.8);
    C.mesh(g);
    const at = walkers.length; for (const side of [-1, 1]) walkers.push({ make: L.ox, lp: cartLp, speed: 0.8, phase, ahead: 0, side: side * 0.6, s: 0.92, u0: Y(-3200) });
    carts.push({ g, at }); P(M, 'herd', 0, 0, 0, { path: CARTWAY, speed: 0.8, phase: phase + 2.2 / cartLp.L, u0: Y(-3200) });
  }
  const droves = drove(world, group, walkers);

  // ---------- boats under way ----------
  const boats = [], crewed = (lp, speed, phase, n2) => {
    const g = new THREE.Group(), B = new Shape(); always.add(g);
    reedBoat(B, 0, 0, 0, 0, 7.5); for (let k = 0; k < 3; k++) pot(B, -0.4 + k * 0.6, 0.3, (k % 2) * 0.3 - 0.15, 'jar', shade(CLAY, 0.8 + r() * 0.4), 0.75); B.mesh(g);
    const crew = actors(null, Array.from({ length: n2 }, (_, k) => ({ outfit: M, action: 'paddle', x: k ? -2.0 : 1.6, z: k ? 0.25 : -0.25, rot: 0, y: 0.3, phase: k * 0.3 })), { seed: 7 + boats.length });
    g.add(...crew.meshes); boats.push({ g, crew, lp, speed, phase });
  };
  const canalLoop = loopOf([[-230, 132.5], [225, 132.5], [232, 135], [225, 137.5], [-230, 137.5], [-237, 135]]), riverLoop = loopOf([[290, -330], [290, 330], [300, 345], [318, 330], [318, -330], [304, -345]]);
  crewed(canalLoop, 1.1, 0.05, 2); crewed(canalLoop, 1.0, 0.4, 2); crewed(canalLoop, 1.2, 0.72, 2); crewed(riverLoop, 1.3, 0.1, 2); crewed(riverLoop, 1.2, 0.55, 2);

  // ---------- palms, reeds ----------
  const green = () => { const g = 0.6 + r() * 0.25; return [g * (0.9 + r() * 0.3), g, g * (0.7 + r() * 0.3)]; };
  const palms = [];
  const palm = (x, z) => { if (Math.abs(x - ROAD) < 34 && z < 130 || Math.hypot(x - SPAWN.x, z - SPAWN.z) < 8) return; palms.push({ x, z, s: 0.75 + r() * 0.5, rot: r() * 6.283, tint: green() }); };
  for (let x = -420; x < 246; x += 9 + r() * 9) { palm(x, 114.5 + r() * 3); palm(x + 4, 153 + r() * 4); }
  for (let k = 0; k < 70; k++) palm(-400 + r() * 640, 162 + r() * 150);
  for (let k = 0; k < 16; k++) palm(238 + r() * 12, -300 + r() * 420); for (let k = 0; k < 30; k++) palm(385 + r() * 200, -400 + r() * 800);
  homes.filter((h, i) => i % 9 === 0).forEach((h) => { palms.push({ x: h.x + h.w / 2 + 1.5, z: h.z + h.d / 2 + 1.5, s: 0.7 + r() * 0.4, rot: r() * 6, tint: green() }); });
  planted(always, K.palm, palms.filter((_, i) => i % 2 === 0), flat); planted(always, K.palmB, palms.filter((_, i) => i % 2 === 1), flat);
  const scrub = []; for (let k = 0; k < 150; k++) { const x = -500 + r() * 1000, z = (r() < 0.5 ? 160 + r() * 300 : -320 - r() * 250); scrub.push({ x, z, s: 0.5 + r() * 0.8, rot: r() * 6, tint: [0.7, 0.62, 0.42].map((v) => v * (0.8 + r() * 0.4)) }); }
  planted(always, K.shrubB, scrub.filter((s) => base(s.x, s.z) > 2.9), flat);
  { // reed beds along the water
    const b = S.of('crop'), up = [0, 1, 0], clump = (x, z) => { const y = Math.max(base(x, z), 0) - 0.1, w = 1 + r() * 1.2, a = r() * 3.14, dx = Math.cos(a) * w, dz = Math.sin(a) * w, hh = 2 + r() * 1.6, c = shade(lin(0x62702e), 0.6 + r() * 0.6), lo = shade(c, 0.55), u0 = r() * 3;
      b.quad([[x - dx, y, z - dz], up, u0, 0, lo], [[x + dx, y, z + dz], up, u0 + w, 0, lo], [[x + dx, y + hh, z + dz], up, u0 + w, 1, c], [[x - dx, y + hh, z - dz], up, u0, 1, c]); };
    for (let k = 0; k < 420; k++) { const z = -420 + r() * 840; if (z > 108 && z < 162) continue; clump(253 + r() * 9, z); if (k % 2) clump(358 + r() * 10, z); }
    for (let k = 0; k < 260; k++) { const x = -430 + r() * 680; if (x > ROAD - 26 && x < ROAD + 36) continue; clump(x, r() < 0.4 ? 124.5 + r() * 3 : 142.5 + r() * 4); }
  }
  // a bridge of palm trunks and planks across the canal, where the road from the quay meets it, and a path on to the far fields
  const BR = { x: ROAD, z0: CANAL - 17, z1: CANAL + 17, hw: 1.3 }, deckY = (z) => FLAT + 0.08 + 0.75 * Math.sin(Math.PI * clamp((z - BR.z0) / (BR.z1 - BR.z0), 0, 1));
  const deckAt = (x, z) => (Math.abs(x - BR.x) < BR.hw && z > BR.z0 && z < BR.z1 ? deckY(z) : -Infinity);
  { const n = 34, c = shade(TIMBER, 1.1);
    for (let i = 0; i < n; i++) { const za = BR.z0 + ((BR.z1 - BR.z0) * i) / n, zb = BR.z0 + ((BR.z1 - BR.z0) * (i + 1)) / n, ya = deckY(za), yb = deckY(zb), k = 0.85 + r() * 0.3;
      S.quad('wood', [BR.x - BR.hw, ya, za], [BR.x - BR.hw, yb, zb], [BR.x + BR.hw, yb, zb], [BR.x + BR.hw, ya, za], shade(c, k), null, [0, 1, 0]);
      for (const sd of [-1, 1]) S.quad('wood', [BR.x + sd * BR.hw, ya - 0.25, za], [BR.x + sd * BR.hw, yb - 0.25, zb], [BR.x + sd * BR.hw, yb, zb], [BR.x + sd * BR.hw, ya, za], shade(c, 0.7)); }
    for (const sd of [-1, 1]) { S.beam('wood', [BR.x + sd * BR.hw * 0.7, deckY(BR.z0) - 0.3, BR.z0], [BR.x + sd * BR.hw * 0.7, deckY(CANAL) - 0.3, CANAL], 0.2, 0.2, 6, TIMBER); S.beam('wood', [BR.x + sd * BR.hw * 0.7, deckY(CANAL) - 0.3, CANAL], [BR.x + sd * BR.hw * 0.7, deckY(BR.z1) - 0.3, BR.z1], 0.2, 0.2, 6, TIMBER);   // the palm-trunk stringers
      for (let k = 0; k <= 8; k++) { const z = BR.z0 + ((BR.z1 - BR.z0) * k) / 8, y = deckY(z); S.beam('wood', [BR.x + sd * (BR.hw + 0.05), y, z], [BR.x + sd * (BR.hw + 0.05), y + 1.0, z], 0.05, 0.045, 5, TIMBER); }   // the posts of the hand-rail
      for (let k = 0; k < 8; k++) { const za = BR.z0 + ((BR.z1 - BR.z0) * k) / 8, zb = BR.z0 + ((BR.z1 - BR.z0) * (k + 1)) / 8; S.beam('wood', [BR.x + sd * (BR.hw + 0.05), deckY(za) + 0.95, za], [BR.x + sd * (BR.hw + 0.05), deckY(zb) + 0.95, zb], 0.035, 0.035, 5, TIMBER, false); }
      for (const z of [CANAL - 6, CANAL, CANAL + 6]) S.beam('wood', [BR.x + sd * BR.hw * 0.7, base(BR.x, z) - 0.5, z], [BR.x + sd * BR.hw * 0.7, deckY(z) - 0.35, z], 0.14, 0.12, 6, shade(TIMBER, 0.8)); }   // piers driven into the canal bed
    S.quad('plaster', [ROAD - 3, FLAT + 0.03, BR.z1], [ROAD + 3, FLAT + 0.03, BR.z1], [ROAD + 3, FLAT + 0.03, 176], [ROAD - 3, FLAT + 0.03, 176], lin(0xb8a680), [0, 0], [0, 1, 0]);   // the path on to the fields
  }
  solids.platform(BR.x, CANAL, BR.hw * 2, BR.z1 - BR.z0, 0, (x, z) => deckY(z), -Infinity, Infinity, 'deck');
  for (const sd of [-1, 1]) solids.platform(BR.x + sd * (BR.hw + 0.1), CANAL, 0.2, BR.z1 - BR.z0 - 1, 0, (x, z) => deckY(z), -Infinity, Infinity, 'rail');
  for (let k = 0; k < 3; k++) P(k % 2 ? F : M, 'carry', 0, 0, 0, { path: [[ROAD + 0.4, 100], [ROAD + 0.4, 176], [ROAD + 12, 186], [ROAD + 0.4, 176], [ROAD + 0.4, 100]], prop: k ? 'basket' : 'bucket', phase: k * 0.33, speed: 1.1 });
  // fields across the canal
  for (let i = 0; i < 26; i++) for (let j = 0; j < 2; j++) if (r() < 0.8) field(S, r, -400 + i * 24 + 10, 178 + j * 46 + 20, 40, 19, Math.PI / 2, FLAT, STAGES[(r() * STAGES.length) | 0], { tall: 1.1 });

  // ---------- meshes, people ----------
  S.mesh(always); S2.mesh(town2); S3.mesh(town3); SE.mesh(eanna); SPre.mesh(preEanna); SW.mesh(walled); SPl.mesh(plat);
  const tOld = new THREE.Group(), tNew = new THREE.Group(); oldTemple.add(tOld); whiteTemple.add(tNew); ST0.mesh(tOld); ST1.mesh(tNew);
  const onDeck = { heightAt: (x, z) => Math.max(world.heightAt(x, z), deckAt(x, z)), get sea() { return world.sea; } };   // people on the bridge walk on its deck
  const folk = actors(onDeck, people, { seed: 33 }); group.add(...folk.meshes);
  const groups = [always, town2, town3, eanna, preEanna, walled, wheels, oldTemple, whiteTemple, plat], _o = [0, 0], _a = [0, 0];

  return {
    update(u, t, env, camera, view) {
      solids.u = u;
      for (const g of groups) g.visible = u >= g.userData.u0 && u < g.userData.u1;
      const hill = world.hill; plat.position.y = FLAT; plat.scale.y = hill; tOld.position.y = tNew.position.y = FLAT + PH * hill; walled.position.y = FLAT;
      for (const h of herds) h.update(u);
      droves.update(u, t);
      for (const c of carts) { const it = droves.items[c.at], jt = droves.items[c.at + 1]; if (it.x === undefined) continue;
        const cx = (it.x + jt.x) / 2, cz = (it.z + jt.z) / 2; c.g.position.set(cx - it.dx * 3.6, FLAT, cz - it.dz * 3.6); c.g.rotation.y = Math.atan2(-it.dz, it.dx); }
      for (const b of boats) {
        const d = b.phase * b.lp.L + b.speed * t; onLoop(b.lp, d, _o); onLoop(b.lp, d + 2, _a);
        b.g.position.set(_o[0], world.sea + 0.1 + 0.03 * Math.sin(t * 1.3 + b.phase * 9), _o[1]); b.g.rotation.y = Math.atan2(-(_a[1] - _o[1]), _a[0] - _o[0]); b.crew.update(u, t);
      }
      folk.update(u, t, view);
    },
    collide(pos) { solids.collide(pos); },
    floorAt(x, z) { return solids.floorAt(x, z); },
    audit: { solids, homes, deckAt },
  };
}

export default {
  place: 'Mesopotamia · Uruk', coords: [31.32, 45.64],
  terrain: { base, relief, bounds: { x: 640, z: 700 } },
  spawn: SPAWN,
  env(year, env) {
    set(env.top, 0.24, 0.5, 0.86); set(env.hor, 0.88, 0.85, 0.74); set(env.ground, 0.64, 0.56, 0.4); set(env.far, 0.64, 0.56, 0.4); set(env.water, 0.36, 0.4, 0.26); set(env.sun, 1, 0.95, 0.82);
    env.sea = 0; env.hill = hillAt(year); env.ice = -60; env.fogD = 0.0013; env.sunEl = 1.0; env.sunI = 2.5; env.amb = 1.05; env.cloud = 0.1; env.precip = 0; env.grass = 0.04;
  },
  events: [
    { y: -4000, t: 'Two villages become a town', h: 'Barley in long strips between the ditches, reed boats on the canal, houses of mud brick crowding round a temple on a terrace. No rain to speak of: every ear here was watered by hand.', w: 'On the plains of the Euphrates, villages are growing into something new. Elsewhere farmers reach Britain and Scandinavia.' },
    { y: -3700, t: 'The potter\'s wheel', h: 'The town has doubled. Potters throw on a wheel and turn out the same plain bowl by the thousand: a day\'s ration of barley, handed to everyone who works for the temple.', w: 'Copper is cast in moulds from Iran to the Balkans. Uruk\'s merchants found colonies far up the Euphrates.' },
    { y: -3600, t: 'Eanna', h: 'A whole quarter is cleared for Inanna, goddess of the storehouse. Walls and columns are studded with clay cones, their heads dipped red, black and white.', w: 'The city needs timber, stone and metal that the plain does not have. Everything must be traded for, and somebody has to keep count.' },
    { y: -3500, t: 'The White Temple', h: 'The terrace of the sky god An is raised to thirteen metres and a temple set on top, washed with gypsum so that it shines across the plain. Processions climb the stair.', w: 'The wheel, used by potters, is put under a cart at about this time, here and in Europe. On the steppe north of the Black Sea, horses are being tamed.' },
    { y: -3350, t: 'Writing', h: 'In Eanna, clerks press reeds into tablets of damp clay: a sign for barley, a sign for sheep, marks for the numbers. It is bookkeeping. It is also the first writing anywhere.', w: 'In Egypt, labels with the first hieroglyphs are tied to grave goods at Abydos. In the Alps a man with a copper axe dies on a glacier and is not found for five thousand years.' },
    { y: -3200, t: 'The first city', h: 'Carts on solid wooden wheels come up from the quay behind oxen. Forty thousand people may live here now: more than have ever lived in one place.', w: 'Egypt is about to become one kingdom. Newgrange is built in Ireland.' },
    { y: -3000, t: 'Bronze, and names', h: 'The signs on the tablets have turned into wedges and begun to spell sounds: names, then sentences. Tin is mixed with copper.', w: 'A dozen cities now share the plain of Sumer, and quarrel over water. In Peru, people raise mounds and plazas at Caral.' },
    { y: -2950, t: 'The wall', h: 'A wall of mud brick, nine kilometres round, with hundreds of towers. Later poets will give the credit to one king.', w: 'Kings rule the cities now, beside the temples. Along the Indus, towns are being laid out on a grid.' },
    { y: -2750, t: 'Gilgamesh', h: '"Go up on the wall of Uruk and walk around; examine its foundation, inspect its brickwork." A king of that name probably reigned about now. The rest is the oldest story we have.', w: 'In Egypt, Djoser\'s architect is about to pile six stone platforms into the first pyramid.' },
  ],
  build,
};
