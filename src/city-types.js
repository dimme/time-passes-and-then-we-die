// Building types. Each TYPES[name](r, corner) returns { obj, fw, fd }: obj stands on y=0 centred on its footprint with its
// street front facing +z; corner is -1 / +1 when the -x / +x side also faces a street.
import * as THREE from 'three';
import { Kit, Solid, M, facadeOf, lin, WHITE, NEON, pick } from './city-kit.js?v=740e009b';

const PI = Math.PI;
const SIDES = [[0, 1, 0], [1, 0, PI / 2], [0, -1, PI], [-1, 0, -PI / 2]];
/** Visit the four walls of a w × d rectangle: fn(width, i) runs in a frame whose z=0 plane is that wall, facing out. i: 0 front, 1 right, 2 back, 3 left. */
export function around(k, w, d, x, y, z, fn) { SIDES.forEach(([sx, sz, ry], i) => k.at(x + (sx * w) / 2, y, z + (sz * d) / 2, ry, () => fn(i % 2 ? d : w, i))); }
export const mul = (c, t) => [c[0] * t[0], c[1] * t[1], c[2] * t[2]];
// what glows behind glass after dark (linear, × the night level)
export const DARK = [0, 0, 0], CANDLE = [0.8, 0.42, 0.14], LAMP = [1.1, 0.8, 0.45], SHOP = [1.6, 1.35, 0.95], OFFICE = [1.3, 1.4, 1.5];
const STONE = 0xb9b2a2, TAR = 0x2c2c2e, IRON = 0x1b1d1d, WOOD = 0x5a4028;

/** A wall in the plane z=0 of the frame with real openings: the facade is cut round each hole { x, y, w, h } and the reveals are lined. */
export function pierced(k, F, x0, x1, y0, y1, holes, tint = WHITE, depth = 0.16, jamb) {
  const cuts = (lo, hi, a, b) => [...new Set([lo, hi, ...holes.flatMap((h) => [a(h), b(h)])])].filter((v) => v >= lo && v <= hi).sort((p, q) => p - q);
  const xs = cuts(x0, x1, (h) => h.x - h.w / 2, (h) => h.x + h.w / 2), ys = cuts(y0, y1, (h) => h.y, (h) => h.y + h.h);
  const open = (x, y) => holes.some((h) => Math.abs(x - h.x) < h.w / 2 && y > h.y && y < h.y + h.h);
  for (let j = 0; j + 1 < ys.length; j++) for (let i = 0, s = -1; i < xs.length; i++) {
    const solid = i + 1 < xs.length && !open((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2);
    if (solid && s < 0) s = i;
    if (!solid && s >= 0) { k.quad(F.side, tint, [xs[s], ys[j], 0], [xs[i], ys[j], 0], [xs[i], ys[j + 1], 0], [xs[s], ys[j + 1], 0]); s = -1; }
  }
  const c = jamb || mul(mul(F.wall, tint), [0.8, 0.8, 0.8]);
  for (const h of holes) {
    const l = h.x - h.w / 2, r = h.x + h.w / 2, b = h.y, t = h.y + h.h, d = -depth;
    k.quad(M.trim, c, [l, b, 0], [l, b, d], [l, t, d], [l, t, 0]); k.quad(M.trim, c, [r, b, d], [r, b, 0], [r, t, 0], [r, t, d]);
    k.quad(M.trim, c, [l, t, 0], [l, t, d], [r, t, d], [r, t, 0]); if (b > y0) k.quad(M.trim, c, [l, b, d], [l, b, 0], [r, b, 0], [r, b, d]);
  }
}
/** Glazing in the plane z: a painted frame that shows between the panes as glazing bars. */
export function glaze(k, x, y, w, h, z, glow = DARK, cols = 1, rows = 1, frame = 0xe6dfd0, t = 0.06, bar = 0.035) {
  k.quad(M.trim, frame, [x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]);
  const pw = (w - 2 * t - (cols - 1) * bar) / cols, ph = (h - 2 * t - (rows - 1) * bar) / rows, zz = z + 0.025;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const px = x - w / 2 + t + i * (pw + bar), py = y + t + j * (ph + bar); k.quad(M.lit, glow, [px, py, zz], [px + pw, py, zz], [px + pw, py + ph, zz], [px, py + ph, zz]); }
}
/** Flat roof deck behind a parapet with a coping, for a w × d block whose walls reach y. */
export function flatRoof(k, w, d, x, y, z, wallCol, par = 0.8, roofCol = TAR, cope = STONE) {
  const t = 0.3, a = w / 2, b = d / 2;
  k.at(x, y, z, 0, () => {
    k.quad(M.trim, roofCol, [-a, 0, b], [a, 0, b], [a, 0, -b], [-a, 0, -b]);
    if (!par) return;
    around(k, w, d, 0, 0, 0, (fw) => {
      k.box(M.trim, wallCol, fw, par, t, 0, 0, -t / 2, 'bflr'); k.quad(M.trim, wallCol, [-fw / 2, 0, 0], [fw / 2, 0, 0], [fw / 2, par, 0], [-fw / 2, par, 0]);
      k.box(M.trim, cope, fw + 0.12, 0.09, t + 0.12, 0, par, -t / 2, 'b');
    });
  });
}
/** Projecting sills and lintels on the lower storeys of a painted facade f (as returned by Kit.wall). */
function relief(k, F, f, floors, sill, lintel, o = {}) {
  const w = F.ww * f.bw;
  for (let fl = 0; fl < Math.min(floors, f.nf); fl++) for (let i = 0; i < f.n; i++) {
    if (o.skip && o.skip(i, fl)) continue;
    const x = f.x0 + (i + 0.5) * f.bw, y = f.y0 + (fl + F.wy) * f.fh;
    if (sill !== null) k.box(M.trim, sill, w + 0.3, 0.1, 0.17, x, y - 0.11, 0.085, 'k');
    if (lintel !== null) k.box(M.trim, lintel, w + (o.hood ? 0.45 : 0.3), o.hood ? 0.2 : 0.26, o.hood ? 0.26 : 0.09, x, y + F.wh * f.fh + (o.hood ? 0.1 : 0.03), o.hood ? 0.13 : 0.045, 'k');
  }
}
/** A bracketed cornice along the top of a street front: x0..x1 at height y in the frame of that wall. */
function cornice(k, x0, x1, y, col, size = 1, brackets = 0) {
  const w = x1 - x0, x = (x0 + x1) / 2, s = size;
  k.box(M.trim, col, w + 0.06, 0.28 * s, 0.2 * s, x, y - 0.75 * s, 0.1 * s, 'k'); k.box(M.trim, col, w + 0.2, 0.3 * s, 0.45 * s, x, y - 0.47 * s, 0.225 * s, 'k'); k.box(M.trim, col, w + 0.4, 0.17 * s, 0.75 * s, x, y - 0.17 * s, 0.375 * s, 'k');
  for (let i = 0; i <= brackets; i++) k.box(M.trim, col, 0.16, 0.55 * s, 0.5 * s, x0 + 0.12 + ((w - 0.24) * i) / brackets, y - 1.02 * s, 0.25 * s, 'kt');
}
/** A flight of steps rising along +z towards the wall at z=0 … built outwards: top landing at height rise against the wall, foot at z = run. */
function steps(k, x, w, rise, run, col, n = Math.max(1, Math.round(rise / 0.19))) {
  for (let i = 0; i < n; i++) k.box(M.trim, col, w, (rise * (n - i)) / (n + 1), run / n, x, 0, (run * (i + 0.5)) / n, 'kb');
}
/** Timber water tank on a steel frame. */
export function waterTank(k, x, y, z, s = 1) {
  const R = 1.5 * s, H = 3 * s, leg = 2.4 * s;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box(M.trim, IRON, 0.14, leg, 0.14, x + a * R * 0.7, y, z + b * R * 0.7, 'tb');
  for (const a of [-1, 1]) { k.rod(M.trim, IRON, 0.07, [x - R * 0.7, y + 0.1, z + a * R * 0.7], [x + R * 0.7, y + leg - 0.1, z + a * R * 0.7]); k.rod(M.trim, IRON, 0.07, [x + a * R * 0.7, y + 0.1, z + R * 0.7], [x + a * R * 0.7, y + leg - 0.1, z - R * 0.7]); }
  k.box(M.trim, IRON, R * 1.7, 0.14, R * 1.7, x, y + leg, z);
  k.cyl(M.trim, 0x6a5036, R, R * 1.04, H, x, y + leg + 0.14, z, 14, true);
  for (const q of [0.15, 0.5, 0.85]) k.cyl(M.trim, IRON, R * 1.06, R * 1.06, 0.07, x, y + leg + 0.14 + H * q, z, 14, true);
  k.cyl(M.trim, 0x4a3a2a, 0.08, R * 1.12, R * 0.6, x, y + leg + 0.14 + H, z, 14);
}
/** Striped canvas awning over a shop front. */
function awning(k, x0, x1, y, r, drop = 0.75, out = 1.25) {
  const a = pick(r, [0x8a2a22, 0x2f5a3a, 0x24406a, 0xb89030, 0x3a3a3a]), b = r() < 0.6 ? 0xe8e0cc : a, n = Math.max(2, Math.round((x1 - x0) / 0.45));
  for (let i = 0; i < n; i++) {
    const p = x0 + ((x1 - x0) * i) / n, q = x0 + ((x1 - x0) * (i + 1)) / n, c = i % 2 ? b : a;
    k.sheet(M.trim, c, [p, y - drop, out], [q, y - drop, out], [q, y, 0.1], [p, y, 0.1]); k.quad(M.trim, c, [p, y - drop - 0.22, out], [q, y - drop - 0.22, out], [q, y - drop, out], [p, y - drop, out]);
  }
  for (const s of [x0, x1]) k.sheet(M.trim, a, [s, y - drop, out], [s, y, 0.1], [s, y - drop, 0.1]);
}
/** A shop front filling x0..x1 × 0..g of the wall plane: piers, stall riser, plate glass, a recessed door, signboard and cornice. */
function shop(k, r, x0, x1, g, o = {}) {
  const pier = o.pier ?? 0xb0a898, paint = o.paint ?? pick(r, [0x2c3a30, 0x3a2420, 0x1f2a3a, 0x2a2a2a, 0x5a2a20, 0xc8c0a8]), sign = pick(r, [0x1c1c1c, 0x7a1f1a, 0x1f3a5a, 0x2f4a2f, 0xd8cfb0, 0x4a3420, 0xb08a2a]);
  const pw = 0.42, top = g - 1, w = x1 - x0, zg = -0.18, glow = r() < 0.75 ? SHOP : DARK;
  for (const x of [x0 + pw / 2, x1 - pw / 2]) k.box(M.trim, pier, pw, top, 0.34, x, 0, -0.07, 'kb');
  k.box(M.trim, sign, w, 0.72, 0.3, (x0 + x1) / 2, top, -0.06, 'kb'); k.box(M.trim, pier, w + 0.06, 0.28, 0.5, (x0 + x1) / 2, top + 0.72, 0.02, 'k');
  k.box(M.trim, 0xe8e0c8, w * (0.35 + r() * 0.4), 0.3, 0.02, (x0 + x1) / 2, top + 0.2, 0.1, 'kb');      // lettering panel
  let a = x0 + pw, b = x1 - pw;
  if (o.door) {   // the door to the flats upstairs
    const dw = 1.15, dx = o.door > 0 ? b - dw / 2 : a + dw / 2;
    k.quad(M.trim, 0x2a1e18, [dx - dw / 2, 0, -0.32], [dx + dw / 2, 0, -0.32], [dx + dw / 2, 2.25, -0.32], [dx - dw / 2, 2.25, -0.32]); glaze(k, dx, 2.25, dw, top - 2.25, -0.32, LAMP, 1, 1, paint);
    k.box(M.trim, pier, 0.16, top, 0.3, o.door > 0 ? b - dw - 0.08 : a + dw + 0.08, 0, -0.1, 'kb');
    if (o.door > 0) b -= dw + 0.16; else a += dw + 0.16;
  }
  // plate glass either side of the shop door
  const sd = 1, mid = (a + b) / 2 + (r() - 0.5) * Math.max(0, b - a - 2.6);
  k.box(M.trim, paint, b - a, 0.55, 0.12, (a + b) / 2, 0, zg + 0.04, 'kb'); k.box(M.trim, paint, b - a, 0.14, 0.12, (a + b) / 2, top - 0.14, zg + 0.04, 'kt');
  k.quad(M.lit, glow, [a, 0.55, zg], [b, 0.55, zg], [b, top - 0.14, zg], [a, top - 0.14, zg]);
  for (const x of [mid - sd / 2, mid + sd / 2]) k.box(M.trim, paint, 0.07, top - 0.14, 0.1, x, 0, zg + 0.05, 'kb');
  k.box(M.trim, paint, sd, 0.1, 0.1, mid, 2.2, zg + 0.05, 'k'); k.quad(M.trim, 0x8a8478, [mid - sd / 2, 0, zg + 0.11], [mid + sd / 2, 0, zg + 0.11], [mid + sd / 2, 0.12, zg + 0.11], [mid - sd / 2, 0.12, zg + 0.11]);
  if (o.awning ?? r() < 0.45) awning(k, a - 0.1, b + 0.1, top + 0.05, r);
  if (r() < 0.5) { const bx = r() < 0.5 ? x0 + 0.25 : x1 - 0.25; k.rod(M.trim, IRON, 0.04, [bx, top + 1.45, 0], [bx, top + 1.45, 1]); k.box(M.trim, sign, 0.06, 0.75, 0.8, bx, top + 0.66, 0.58); k.box(M.trim, 0xe8e0c8, 0.07, 0.3, 0.5, bx, top + 0.9, 0.58); }      // a blade sign on an iron bracket
  if (r() < 0.55) { const n = 1 + Math.floor(r() * 3), s = r() < 0.5 ? 1 : -1, e = s > 0 ? a : b; for (let j = 0; j < n; j++) k.box(M.trim, j % 2 ? 0x8a6a44 : 0x6a5236, 0.55, 0.38 + (j % 2) * 0.1, 0.4, e + s * (0.4 + j * 0.62), 0, 0.3, 'b'); if (r() < 0.5) k.cyl(M.trim, 0x5a4028, 0.26, 0.23, 0.78, e + s * (0.45 + n * 0.62), 0, 0.33, 8); }      // crates and a barrel under the window
}
/** Iron fire escape down the front of a tenement: a balcony at every storey of the facade f, joined by stairs. */
function fireEscape(k, F, f, i0, n = f.nf) {
  const xl = f.x0 + i0 * f.bw + (f.bw * (1 - F.ww)) / 2 - 0.25, xr = xl + f.bw + F.ww * f.bw + 0.5, D = 1;
  for (let fl = 0; fl < n; fl++) {
    const y = f.y0 + (fl + F.wy) * f.fh - 0.4;
    k.box(M.trim, IRON, xr - xl, 0.05, D, (xl + xr) / 2, y, D / 2, '');
    k.rail(IRON, xl, D, xr, D, y + 0.05, 0.95); k.rail(IRON, xl, 0, xl, D, y + 0.05, 0.95); k.rail(IRON, xr, 0, xr, D, y + 0.05, 0.95);
    for (const x of [xl + 0.3, xr - 0.3]) k.rod(M.trim, IRON, 0.05, [x, y, D * 0.8], [x, y - 0.55, 0.02]);
    if (fl) { const s = fl % 2 ? 1 : -1, c = (xl + xr) / 2; k.rod(M.trim, IRON, 0.05, [c - s * (xr - xl) * 0.36, y - f.fh + 0.05, D * 0.6], [c + s * (xr - xl) * 0.36, y + 0.02, D * 0.6], 4, 0.45); }
  }
  const y = f.y0 + F.wy * f.fh - 0.4; for (const z of [0.55, 0.95]) k.rod(M.trim, IRON, 0.04, [xl + 0.35, y, z], [xl + 0.35, y - 2.1, z]);   // the drop ladder
}
const BLOB = new THREE.IcosahedronGeometry(1, 1), TUFT = new THREE.IcosahedronGeometry(1, 0);      // foliage near the street, and high up where nobody can tell
/** Painted walls of one rectangular stage of a tower, y0..y1 on a w × d plan centred at x, z; fn(f, width, i) can dress each wall in its own frame. */
export function stage(k, F, w, d, x, z, y0, y1, tint, fn) { around(k, w, d, x, y0, z, (fw, i) => { const f = k.wall(F, -fw / 2, fw / 2, 0, y1 - y0, 0, tint); if (fn) fn(f, fw, i); }); }
/** Vertical piers standing proud of a wall at every `step` bays, running `over` past its top as finials. */
export function piers(k, f, fw, h, col, wd = 0.44, dp = 0.22, over = 0.9, step = 1) { for (let q = 0; q <= f.n; q += step) k.box(M.trim, col, wd, h + over, dp, -fw / 2 + q * f.bw, 0, dp / 2 - 0.02, 'kb'); }
/** A band of louvres or stone wrapped round a wall: plant floors, string courses. */
const band = (k, fw, y, h, col, out = 0.08) => k.box(M.trim, col, fw + out * 2, h, out + 0.02, 0, y, out / 2, 'k');
/** A glazed lobby or shop floor along a street wall: plinth, plate glass between mullions, fascia and an entrance canopy. */
export function lobby(k, r, fw, g, frame, glow = OFFICE, canopy = true) {
  const n = Math.max(2, Math.round(fw / 3)), top = g - 0.7;
  k.box(M.trim, 0x38383a, fw, 0.35, 0.12, 0, 0, -0.08, 'kb'); k.quad(M.lit, glow, [-fw / 2, 0.35, -0.15], [fw / 2, 0.35, -0.15], [fw / 2, top, -0.15], [-fw / 2, top, -0.15]);
  for (let q = 0; q <= n; q++) { const end = q % n === 0; k.box(M.trim, frame, end ? 0.55 : 0.1, top, end ? 0.36 : 0.16, -fw / 2 + (q * fw) / n + (q ? (end ? -0.275 : 0) : 0.275), 0, end ? -0.02 : -0.08, 'kb'); }
  k.box(M.trim, frame, fw, 0.1, 0.14, 0, 2.7, -0.09, 'k'); k.box(M.trim, frame, fw, 0.7, 0.34, 0, top, -0.03, 'k');
  let cx = 0;
  if (canopy) { cx = (r() - 0.5) * Math.max(0, fw - 8); k.box(M.trim, frame, 5.2, 0.2, 2.3, cx, 3.25, 1.05); for (const s of [-1, 1]) k.box(M.trim, 0x141414, 0.06, 2.35, 0.06, cx + s * 0.9, 0.35, -0.1, 'kb'); }
  // a revolving door in its glass drum, a swing door either side with steel pulls, the street number in steel over them
  k.cyl(M.lit, glow, 1.05, 1.05, 2.3, cx, 0.35, 0.15, 10, true); k.cyl(M.trim, frame, 1.12, 1.12, 0.2, cx, 2.62, 0.15, 10); k.cyl(M.trim, 0x38383a, 1.12, 1.12, 0.06, cx, 0.3, 0.15, 10);
  for (const a of [0.5, 0.5 + PI / 2]) k.at(cx, 0, 0.15, a, () => k.box(M.metal, 0x8a8e92, 1.96, 2.2, 0.035, 0, 0.38, 0, 'b'));
  for (const s of [-1, 1]) { for (const x of [1.4, 2.5]) k.box(M.trim, frame, 0.08, 2.35, 0.16, cx + s * x, 0.35, -0.08, 'kb'); k.box(M.metal, 0xc8ccd0, 0.05, 1, 0.07, cx + s * 1.62, 1, -0.09, 'kb'); }
  k.box(M.metal, 0xc8ccd0, 2.4, 0.3, 0.05, cx, top + 0.2, 0.17, 'kb');
}
/** A lattice radio mast: two crossed planes of truss, a pole and a warning light. */
export function mast(k, x, y, z, h, w = 1.2, light = true) {
  k.strip(0x9a2a22, [x - w / 2, y, z], [x - w / 2, y + h * 0.8, z], [w, 0, 0], 1); k.strip(0x9a2a22, [x, y, z - w / 2], [x, y + h * 0.8, z - w / 2], [0, 0, w], 1);
  k.cyl(M.trim, 0xb8bcc0, 0.05, 0.12, h, x, y, z, 6);
  if (light) k.box(M.glow, 0xff2a1a, 0.5, 0.5, 0.5, x, y + h, z);
}
/** A flat lid over a ring of [x, z] points. */
export function cap(k, pts, y, col) { for (let i = 1; i + 1 < pts.length; i++) k.quad(M.trim, col, [pts[0][0], y, pts[0][1]], [pts[i][0], y, pts[i][1]], [pts[i + 1][0], y, pts[i + 1][1]]); }
/** The One World Trade Center form: a 2a × 2b rectangle at y0 turning into its own diamond at y1, as eight tall triangles of curtain wall. */
export function facets(k, F, a, b, y0, y1, tint = WHITE) {
  const C = [[-a, b], [a, b], [a, -b], [-a, -b]], Mid = [[0, b], [a, 0], [0, -b], [-a, 0]], nf = Math.round((y1 - y0) / F.ch);
  for (let i = 0; i < 4; i++) {
    const p = C[i], q = C[(i + 1) % 4], m = Mid[i], l = Mid[(i + 3) % 4], n = Math.max(2, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / F.cw)), n2 = Math.max(2, Math.round(Math.hypot(m[0] - l[0], m[1] - l[1]) / F.cw));
    k.facet(F, tint, [p[0], y0, p[1], 0, 0], [q[0], y0, q[1], n, 0], [m[0], y1, m[1], n / 2, nf]); k.facet(F, tint, [p[0], y0, p[1], n2 / 2, 0], [m[0], y1, m[1], n2, nf], [l[0], y1, l[1], 0, nf]);
  }
}
const street = (i, corner) => i === 0 || (i === 1 && corner > 0) || (i === 3 && corner < 0);
/** The two-storey base of a 1930s tower along one street wall: polished granite, bronze shop fronts and, if asked, a tall portal. */
export function decoBase(k, f, fw, g, stone, base, gold, portal) {
  // two-storey base: polished granite, bronze shop fronts and a tall portal
  k.box(M.trim, base, fw, 0.7, 0.14, 0, 0, 0.06, 'kb'); k.box(M.trim, stone, fw + 0.1, 0.8, 0.34, 0, g - 0.8, 0.12, 'k'); k.box(M.trim, stone, fw + 0.36, 0.15, 0.5, 0, g - 0.06, 0.22, 'k');
  k.quad(M.lit, SHOP, [-fw / 2, 0.7, -0.12], [fw / 2, 0.7, -0.12], [fw / 2, g - 0.8, -0.12], [-fw / 2, g - 0.8, -0.12]);
  k.box(M.metal, gold, fw, 0.75, 0.08, 0, 3.9, -0.08, 'k');
  const ent = portal ? Math.floor(f.n / 2) - 1 : -9;
  for (let q = 0; q <= f.n; q++) { if (q === ent + 1) continue; const big = q % 2 === 0 || q === f.n; k.box(M.trim, big ? stone : lin(0x2a2622), big ? 0.9 : 0.1, g - 0.8, big ? 0.4 : 0.1, -fw / 2 + q * f.bw + (q === 0 ? 0.3 : q === f.n ? -0.3 : 0), 0, big ? 0.14 : -0.05, 'kb'); }
  if (ent >= 0) {
    const x = -fw / 2 + (ent + 1) * f.bw;
    for (const s of [-1, 1]) k.box(M.trim, stone, 0.8, g - 0.2, 0.7, x + s * (f.bw - 0.05), 0, 0.3, 'kb');
    k.box(M.trim, stone, f.bw * 2 + 0.7, 1.3, 0.7, x, g - 1.5, 0.3, 'k'); k.box(M.metal, gold, f.bw * 2 - 0.8, 1.7, 0.1, x, 3.2, -0.02, 'k');
    for (let q = -2; q <= 2; q++) k.box(M.metal, gold, 0.08, 3.2, 0.1, x + q * 0.8, 0, -0.03, 'kb');
    k.box(M.metal, gold, f.bw * 2 + 0.6, 0.3, 1.8, x, 3.2, 1);
  }
}
const finish = (k, fw, fd, extra) => ({ obj: k.build(), fw, fd, ...extra });

export const TYPES = {
  /** New Amsterdam, c. 1650: a narrow brick house, its crow-stepped gable to the street, under a steep pantiled roof. */
  dutch(r) {
    const k = new Kit(r), F = facadeOf('hollandbrick'), w = 6 + r() * 2.4, d = 8.5 + r() * 3.5, h = 4.3 + r() * 2.3, rise = w * 0.64, T = 0.32, two = h > 5.4;
    const tint = pick(r, [WHITE, WHITE, [0.82, 0.66, 0.6], [1.2, 1.14, 0.98], [0.9, 0.8, 0.7]]), paint = pick(r, [0x2f4a36, 0x7a2a22, 0x30404e, 0x8a6a2a]), stone = 0xbdb5a2;
    const dx = (r() < 0.5 ? -1 : 1) * (w / 2 - 1.25), lit = () => (r() < 0.45 ? CANDLE : DARK);
    k.box(M.trim, 0x77705f, w + 0.1, 1.9, d + 0.1, 0, -1.6, 0, 'b');      // footing, deep enough for sloping ground
    around(k, w, d, 0, 0, 0, (fw, i) => {
      const holes = [], win = (x, y, ww, hh) => holes.push({ x, y, w: ww, h: hh });
      if (i === 0) { holes.push({ x: dx, y: 0.3, w: 1.05, h: 2.1, door: 1 }); win(-dx * 0.75, 1.05, 1, 1.5); if (two) for (const s of [-1, 1]) win(s * w * 0.23, h - 2.05, 0.9, 1.35); }
      else if (i === 2) { holes.push({ x: w * 0.2, y: 0.3, w: 0.95, h: 2, door: 1 }); win(-w * 0.2, 1.1, 0.85, 1.3); }
      else for (const s of [-1, 1]) { win(s * d * 0.24, 1.15, 0.8, 1.25); if (two && r() < 0.6) win(s * d * 0.24, h - 1.95, 0.75, 1.15); }
      pierced(k, F, -fw / 2, fw / 2, 0, h, holes, tint);
      for (const o of holes) {
        if (o.door) {   // a divided door of painted planks, a small light over it
          k.quad(M.trim, paint, [o.x - o.w / 2, o.y, -0.12], [o.x + o.w / 2, o.y, -0.12], [o.x + o.w / 2, o.y + 1.85, -0.12], [o.x - o.w / 2, o.y + 1.85, -0.12]);
          k.box(M.trim, 0x1c1814, o.w, 0.04, 0.03, o.x, o.y + 0.95, -0.12, 'k'); glaze(k, o.x, o.y + 1.85, o.w, o.h - 1.85, -0.12, lit(), 3, 1, 0xd8d0b8, 0.04);
          k.box(M.trim, stone, o.w + 0.5, 0.2, 0.12, o.x, o.y + o.h, 0.02, 'k');
        } else {
          glaze(k, o.x, o.y, o.w, o.h, -0.13, lit(), 2, 3, 0xe2dac4, 0.05, 0.03);
          k.box(M.trim, stone, o.w + 0.24, 0.09, 0.14, o.x, o.y - 0.09, 0.03, 'k');
          if (i === 0) for (const s of [-1, 1]) k.box(M.trim, paint, o.w / 2, o.h, 0.05, o.x + s * (o.w * 0.75 + 0.03), o.y, 0.025, 'k');   // shutters folded back
        }
      }
    });
    // the stoep: a stone step with a bench either side of the door
    k.box(M.trim, 0x9a9486, 2.5, 0.3, 1.2, dx, 0, d / 2 + 0.6, 'kb'); k.box(M.trim, 0x9a9486, 2.9, 0.14, 1.6, dx, 0, d / 2 + 0.8, 'kb');
    for (const s of [-1, 1]) k.box(M.trim, WOOD, 0.3, 0.45, 1, dx + s * 1.05, 0.3, d / 2 + 0.6, 'kb');
    const sol = new Solid(); sol.pad(dx, d / 2 + 0.8, 1.45, 0.8, 0.14); sol.pad(dx, d / 2 + 0.6, 1.25, 0.6, 0.3);
    // crow-stepped gables front and back, capped with stone
    const n = 5 + (w > 7.4), tw = (w / 2 - 0.42) / n, sh = (rise + 0.5) / n;
    for (const s of [1, -1]) k.at(0, h, s * (d / 2 - T / 2), s > 0 ? 0 : PI, () => {
      for (let i = 0; i < n; i++) {
        const hw = w / 2 - i * tw; k.box(F.side, tint, hw * 2, sh, T, 0, i * sh, 0, 'b');
        for (const q of i === n - 1 ? [0] : [-1, 1]) k.box(M.trim, stone, i === n - 1 ? hw * 2 + 0.1 : tw + 0.1, 0.08, T + 0.1, q * (hw - tw / 2), (i + 1) * sh, 0, 'b');
      }
      if (s < 0) return;
      for (const q of [-1, 1]) { k.box(M.trim, IRON, 0.07, 0.55, 0.04, q * w * 0.3, -0.75, T / 2 + 0.02, 'k'); k.box(M.trim, IRON, 0.07, 0.45, 0.04, q * w * 0.16, sh * 1.1, T / 2 + 0.02, 'k'); }      // wrought-iron wall anchors
      k.rod(M.trim, IRON, 0.035, [0, n * sh, 0], [0, n * sh + 1.2, 0]); k.sheet(M.trim, IRON, [0, n * sh + 0.85, 0], [0.5, n * sh + 0.98, 0], [0, n * sh + 1.1, 0]);      // weathervane
      k.box(M.trim, paint, 0.9, 1.25, 0.05, 0, 0.45, T / 2 + 0.02, 'k'); k.box(M.trim, stone, 1.1, 0.1, 0.1, 0, 0.35, T / 2 + 0.03, 'k');     // loft door and hoist beam
      k.box(M.trim, WOOD, 0.13, 0.13, 0.95, 0, 2.05, T / 2 + 0.4, 'k'); glaze(k, 0, sh * (n - 2) + 0.1, 0.45, 0.55, T / 2 + 0.01, DARK, 1, 1, 0xe2dac4, 0.05);
    });
    const tile = lin(pick(r, [0xb5532f, 0xa84a2a, 0xc0603a, 0x8a4a34])), ov = 0.28, a = w / 2 + ov, he = h - (ov * rise) / (w / 2), hr = h + rise, zf = d / 2 - T, RT = M.tile();
    k.quad(RT, tile, [-a, he, zf], [0, hr, zf], [0, hr, -zf], [-a, he, -zf]); k.quad(RT, tile, [a, he, -zf], [0, hr, -zf], [0, hr, zf], [a, he, zf]);
    k.box(F.side, tint, 0.75, rise * 0.5 + 1.3, 0.75, w * 0.18, h + rise * 0.5, -d * 0.2, 'b'); k.box(M.trim, stone, 0.9, 0.1, 0.9, w * 0.18, h + rise + 1.3, -d * 0.2);
    return finish(k, w, d, { pads: sol.pads });
  },

  /** Georgian and Federal New York: Flemish-bond brick, six-over-six sashes, a fanlit door up a stoop, dormers in a pitched roof between end chimneys. */
  colonial(r) {
    const k = new Kit(r), F = facadeOf('redbrick'), bays = r() < 0.45 ? 3 : 5, w = bays === 3 ? 7.8 + r() * 2 : 12.5 + r() * 3.5, d = 9.5 + r() * 4, st = 2 + (r() < 0.55), base = 0.95, fh = 3.05, h = base + st * fh + 0.3, rise = d * 0.3;
    const tint = pick(r, [WHITE, WHITE, [0.85, 0.75, 0.72], [1.25, 1.2, 1.05], [0.75, 0.6, 0.55], [1.3, 1.35, 1.3]]), white = 0xe9e4d6, stone = 0xc2bba8, paint = pick(r, [0x1e2a22, 0x16181c, 0x3a1c18, 0x1c2836]), shut = r() < 0.55;
    const sp = (w - 0.5) / bays, doorBay = bays === 3 ? (r() < 0.5 ? 0 : 2) : 2, bx = (i) => (i - (bays - 1) / 2) * sp, lit = () => (r() < 0.4 ? LAMP : DARK), dxr = bx(doorBay);
    k.box(M.trim, 0x77705f, w + 0.1, 1.6, d + 0.1, 0, -1.6, 0, 'tb');
    around(k, w, d, 0, 0, 0, (fw, i) => {
      const holes = [];
      for (let f = 0; f < st; f++) {
        const y = base + f * fh + 0.78, hh = f === st - 1 && st === 3 ? 1.45 : 1.8;
        if (i === 0) for (let b = 0; b < bays; b++) { if (f || b !== doorBay) holes.push({ x: bx(b), y, w: 1.02, h: hh, f: 1 }); }
        else if (i === 2) for (const b of bays === 3 ? [-1, 1] : [-1.5, 0, 1.5]) holes.push({ x: (b * fw) / 4.2, y, w: 1, h: hh });
        else for (const s of [-1, 1]) holes.push({ x: s * fw * 0.3, y, w: 0.95, h: hh });
      }
      if (i === 0) holes.push({ x: dxr, y: base, w: 1.3, h: 2.95, door: 1 });
      pierced(k, F, -fw / 2, fw / 2, 0, h, holes, tint);
      k.box(M.trim, stone, fw + 0.12, base, 0.07, 0, 0, 0.035, 'kb');       // water table
      for (const o of holes) {
        if (o.door) {   // panelled door under a fanlight, framed by pilasters and an entablature
          k.quad(M.trim, paint, [o.x - 0.65, o.y, -0.14], [o.x + 0.65, o.y, -0.14], [o.x + 0.65, o.y + 2.25, -0.14], [o.x - 0.65, o.y + 2.25, -0.14]);
          k.box(M.trim, 0x0c0c0c, 0.03, 2.15, 0.02, o.x, o.y + 0.05, -0.14, 'k'); glaze(k, o.x, o.y + 2.25, 1.3, 0.7, -0.14, LAMP, 5, 1, white, 0.06, 0.04);
          for (const s of [-1, 1]) k.box(M.trim, white, 0.22, 3, 0.14, o.x + s * 0.78, o.y, 0.07, 'kb');
          k.box(M.trim, white, 2.1, 0.32, 0.3, o.x, o.y + 3, 0.15, 'k'); k.box(M.trim, white, 2.3, 0.09, 0.4, o.x, o.y + 3.32, 0.2, 'k');
        } else {
          glaze(k, o.x, o.y, o.w, o.h, -0.12, lit(), 3, 4, white, 0.055, 0.03);
          k.box(M.trim, stone, o.w + 0.26, 0.1, 0.15, o.x, o.y - 0.1, 0.035, 'k'); k.box(M.trim, stone, o.w + 0.34, 0.27, 0.06, o.x, o.y + o.h, 0.03, 'k');
          if (o.f && shut) for (const s of [-1, 1]) k.box(M.trim, paint, o.w / 2, o.h, 0.05, o.x + s * (o.w * 0.75 + 0.03), o.y, 0.025, 'k');
        }
      }
      if (i % 2 === 0) k.box(M.trim, white, fw + 0.5, 0.34, 0.32, 0, h - 0.3, 0.16, 'k');       // eaves cornice
    });
    // stoop with iron railings
    const run = 1.7, zf = d / 2, sol = new Solid();
    sol.at(dxr, zf, 0, () => { sol.pad(0, 0.45, 0.95, 0.45, base); sol.steps(0, 0.9, 1.9, base, run - 0.3, 5); });
    k.at(dxr, 0, zf, 0, () => { k.box(M.trim, stone, 1.9, base, 0.9, 0, 0, 0.45, 'kb'); k.at(0, 0, 0.9, 0, () => steps(k, 0, 1.9, base, run - 0.3, stone, 5)); for (const s of [-1, 1]) { const x = s * 0.9, P = [[x, base, 0.05], [x, base, 0.9], [x, 0.15, run + 0.55]]; for (const p of P) k.rod(M.trim, IRON, 0.04, p, [p[0], p[1] + 0.9, p[2]]); for (const o of [0.9, 0.45]) { k.rod(M.trim, IRON, 0.035, [x, base + o, 0.05], [x, base + o, 0.9]); k.rod(M.trim, IRON, 0.035, [x, base + o, 0.9], [x, 0.15 + o, run + 0.55]); } } });
    // pitched roof, ridge parallel to the street
    const RM = r() < 0.6 ? M.slate() : M.shingle(), rc = lin(RM === M.slate() ? pick(r, [0x50525c, 0x44464e, 0x5a4a50]) : pick(r, [0x7a6a58, 0x62564a])), a = w / 2 + 0.12, ze = zf + 0.3, he = h - (0.3 * rise) / zf, hr = h + rise;
    k.quad(RM, rc, [-a, he, ze], [a, he, ze], [a, hr, 0], [-a, hr, 0]); k.quad(RM, rc, [a, he, -ze], [-a, he, -ze], [-a, hr, 0], [a, hr, 0]);
    for (const s of [-1, 1]) {
      const x = (s * w) / 2;
      k.quad(F.side, tint, ...(s > 0 ? [[x, h, zf], [x, h, -zf], [x, hr, 0]] : [[x, h, -zf], [x, h, zf], [x, hr, 0]]));
      k.box(F.side, tint, 0.85, 2.5, 1.7, x - s * 0.44, hr - 1.1, 0, 'b'); k.box(M.trim, stone, 1, 0.1, 1.85, x - s * 0.44, hr + 1.4, 0);
      for (const q of [-0.45, 0.45]) k.cyl(M.trim, 0x9a5a3c, 0.13, 0.16, 0.4, x - s * 0.44, hr + 1.5, q, 8);
    }
    // dormers
    const slope = rise / zf, nd = bays === 3 ? 2 : 3;
    for (let q = 0; q < nd; q++) {
      const x = (q - (nd - 1) / 2) * sp * (bays === 3 ? 1 : 1.5), z0 = zf - 0.7, y0 = h + slope * 0.7, dh = 1.35, L = dh / slope, dw = 1.25;
      k.box(M.trim, white, dw, dh, L, x, y0, z0 - L / 2, 'kb'); glaze(k, x, y0 + 0.25, 0.8, 1, z0 + 0.01, lit(), 2, 3, white, 0.05, 0.03);
      k.quad(RM, rc, [x - dw / 2 - 0.1, y0 + dh, z0 + 0.12], [x, y0 + dh + 0.5, z0 + 0.12], [x, y0 + dh + 0.5, z0 - L - 0.5 / slope], [x - dw / 2 - 0.1, y0 + dh, z0 - L]);
      k.quad(RM, rc, [x + dw / 2 + 0.1, y0 + dh, z0 - L], [x, y0 + dh + 0.5, z0 - L - 0.5 / slope], [x, y0 + dh + 0.5, z0 + 0.12], [x + dw / 2 + 0.1, y0 + dh, z0 + 0.12]);
      k.quad(M.trim, white, [x - dw / 2, y0 + dh, z0], [x + dw / 2, y0 + dh, z0], [x, y0 + dh + 0.45, z0]);
    }
    return finish(k, w, d, { pads: sol.pads });
  },
  /** The walk-up city, 1840–1960: a row of party-wall buildings — brownstones up their stoops, brick tenements over shops, or cast-iron lofts. */
  tenement(r, corner = 0) {
    const k = new Kit(r), kind = pick(r, ['brownstone', 'tenement', 'tenement', 'tenementarch', 'castiron']), F = facadeOf(kind), W = 22.5 + r() * 1.5, D = 19 + r() * 2;
    const bs = kind === 'brownstone', ci = kind === 'castiron', yard = bs ? 2.5 : 0, d = D - yard - 3, zc = D / 2 - yard - d / 2, nb = ci ? 2 : 3 + (r() < 0.5);
    const sol = new Solid(), cuts = [-W / 2]; for (let i = 1; i < nb; i++) cuts.push(-W / 2 + (W * (i + (r() - 0.5) * 0.3)) / nb); cuts.push(W / 2);
    const tints = bs ? [WHITE, [0.85, 0.8, 0.78], [1.15, 1.02, 0.95], [0.7, 0.66, 0.66], [1.3, 1.25, 1.2]] : ci ? [WHITE, [0.8, 0.82, 0.86], [0.66, 0.72, 0.66], [1.06, 0.98, 0.84], [0.95, 0.8, 0.7]] : [WHITE, [0.8, 0.72, 0.7], [1.25, 1.1, 0.9], [0.62, 0.52, 0.5], [1.4, 1.3, 1.1], [0.95, 0.75, 0.7]];
    const g = bs ? 1.5 : ci ? 4.7 : 3.9, nf0 = bs ? 3 : ci ? 4 : 4 + Math.floor(r() * 2);
    for (let b = 0; b < nb; b++) {
      const x0 = cuts[b], x1 = cuts[b + 1], w = x1 - x0, cx = (x0 + x1) / 2, nf = Math.max(2, nf0 + Math.floor(r() * 3) - 1), H = g + nf * F.ch, tint = pick(r, tints), wc = mul(F.wall, tint);
      const trimC = bs ? wc : ci ? mul(wc, [1.05, 1.05, 1.05]) : lin(pick(r, [0xc9bfae, 0xb9ad98, 0x8a7a68, 0xd8d0c0])), corn = bs ? mul(wc, [0.7, 0.7, 0.7]) : ci ? wc : lin(pick(r, [0x3a2a20, 0x2c3a30, 0x4a4038, 0x6a5a48, 0x8a8478, 0x24201c]));
      const streetL = b === 0 && corner < 0, streetR = b === nb - 1 && corner > 0, door = r() < 0.5 ? 1 : -1;
      around(k, w, d, cx, 0, zc, (fw, i) => {
        const street = i === 0 || (i === 1 && streetR) || (i === 3 && streetL), f = k.wall(F, -fw / 2, fw / 2, g, H, 0, tint);
        if (!street) { k.wall(F, -fw / 2, fw / 2, 0, g, 0, tint, 0, 1); return; }
        if (bs) {
          // English basement, then a high stoop to the parlour floor
          k.box(M.trim, mul(wc, [0.8, 0.8, 0.8]), fw, g, 0.1, 0, 0, 0.02, 'kb'); k.box(M.trim, wc, fw + 0.1, 0.16, 0.2, 0, g - 0.08, 0.07, 'k');
          const db = i === 0 ? (door > 0 ? f.n - 1 : 0) : -1, dx = f.x0 + (db + 0.5) * f.bw;
          for (let q = 0; q < f.n; q++) if (q !== db) glaze(k, f.x0 + (q + 0.5) * f.bw, 0.35, 0.95, 0.8, 0.075, r() < 0.3 ? LAMP : DARK, 2, 1, 0x1c1814);
          relief(k, F, f, 2, wc, wc, { hood: true, skip: (q, fl) => q === db && fl === 0 });
          if (db >= 0) {
            for (const s of [-1, 1]) k.box(M.trim, wc, 0.3, 3.1, 0.3, dx + s * 0.85, g, 0.15, 'kb');
            k.box(M.trim, wc, 2.3, 0.4, 0.5, dx, g + 3.1, 0.25, 'k'); k.box(M.trim, wc, 1.4, 3.1, 0.06, dx, g, 0.03, 'kb');
            k.quad(M.trim, 0x24160f, [dx - 0.62, g, 0.07], [dx + 0.62, g, 0.07], [dx + 0.62, g + 2.35, 0.07], [dx - 0.62, g + 2.35, 0.07]); glaze(k, dx, g + 2.4, 1.24, 0.6, 0.07, LAMP, 1, 1, 0x24160f);
            sol.at(cx + dx, zc + d / 2, 0, () => { sol.pad(0, 0.25, 0.85, 0.25, g); sol.steps(0, 0.5, 1.7, g, 1.9, 7); });
            k.at(dx, 0, 0, 0, () => {
              k.box(M.trim, wc, 1.7, g, 0.5, 0, 0, 0.25, 'kb'); k.at(0, 0, 0.5, 0, () => steps(k, 0, 1.7, g, 1.9, wc, 7));
              for (const s of [-1, 1]) { k.rod(M.trim, wc, 0.24, [s * 0.97, g - 0.05, 0], [s * 0.97, 0.1, 2.4], 4, 0.5); k.box(M.trim, wc, 0.3, 0.95, 0.3, s * 0.97, 0, 2.45); k.rail(IRON, s * 0.97, 0, s * 0.97, 2.4, g + 0.2, 0.75, 0, 0.35); }
            });
            k.rail(IRON, -fw / 2, yard - 0.05, dx - 1.15, yard - 0.05, 0, 1); k.rail(IRON, dx + 1.15, yard - 0.05, fw / 2, yard - 0.05, 0, 1);
          }
        } else if (ci) {
          // iron columns carry the front: all glass between them at street level, an entablature at every floor
          const top = g - 0.7;
          for (let q = 0; q <= f.n; q++) { const x = f.x0 + q * f.bw; k.cyl(M.trim, trimC, 0.15, 0.17, top - 0.5, x, 0.5, 0.02, 6, true); k.box(M.trim, trimC, 0.42, 0.5, 0.42, x, 0, 0.02, 'kb'); k.box(M.trim, trimC, 0.44, 0.22, 0.44, x, top - 0.22, 0.02, 'k'); }
          k.box(M.trim, trimC, fw, 0.7, 0.36, 0, top, -0.02, 'k'); k.box(M.trim, trimC, fw + 0.1, 0.14, 0.6, 0, g - 0.14, 0.08, 'k');
          k.box(M.trim, 0x2a2e2a, fw, 0.5, 0.1, 0, 0, -0.2, 'kb'); k.quad(M.lit, r() < 0.7 ? SHOP : DARK, [-fw / 2, 0.5, -0.22], [fw / 2, 0.5, -0.22], [fw / 2, top, -0.22], [-fw / 2, top, -0.22]);
          for (let q = 0; q < f.n; q++) k.box(M.trim, 0x2a2e2a, 0.06, top, 0.08, f.x0 + (q + 0.5) * f.bw, 0, -0.18, 'kb');
          for (let fl = 1; fl <= f.nf; fl++) k.box(M.trim, trimC, fw + 0.06, 0.42, fl === f.nf ? 0.1 : 0.24, 0, g + fl * f.fh - 0.21, fl === f.nf ? 0.05 : 0.12, 'k');
          for (let fl = 0; fl < Math.min(1, f.nf); fl++) for (let q = 0; q <= f.n; q++) k.cyl(M.trim, trimC, 0.13, 0.15, f.fh - 0.5, f.x0 + q * f.bw, g + fl * f.fh + 0.2, 0.03, 6, true);
        } else {
          if (fw < 9) shop(k, r, -fw / 2, fw / 2, g, { pier: trimC, door: i === 0 ? door : 0 });
          else { const m = (r() - 0.5) * 2; shop(k, r, -fw / 2, m, g, { pier: trimC }); shop(k, r, m, fw / 2, g, { pier: trimC }); }
          relief(k, F, f, 2, trimC, kind === 'tenementarch' ? null : trimC);
          if (i === 0 && f.n >= 3 && (b + nb) % 2) fireEscape(k, F, f, door > 0 ? 0 : f.n - 2);
        }
        cornice(k, -fw / 2, fw / 2, H + 0.75, corn, ci ? 1.25 : bs ? 0.9 : 0.8 + r() * 0.4, Math.max(2, Math.round(fw / (ci ? 1.9 : 1.7))));
        if (ci && i === 0) k.quad(M.trim, corn, [-fw * 0.22, H + 0.75, 0.3], [fw * 0.22, H + 0.75, 0.3], [0, H + 0.75 + fw * 0.09, 0.3]);
      });
      flatRoof(k, w, d, cx, H, zc, wc, 0.75);
      // on the roof: stair bulkhead, chimneys along the party wall, sometimes a water tank
      k.box(M.trim, mul(wc, [0.85, 0.85, 0.85]), 2.2, 2.5, 3, cx - w / 2 + 1.6, H, zc - d * 0.2, 'b'); k.box(M.trim, TAR, 2.5, 0.12, 3.3, cx - w / 2 + 1.6, H + 2.5, zc - d * 0.2);
      for (let q = 0; q < 2; q++) { k.box(M.trim, mul(wc, [0.75, 0.75, 0.75]), 0.6, 1.9, 1.1, cx + w / 2 - 0.5, H, zc + d * (0.25 - q * 0.45), 'b'); k.box(M.trim, STONE, 0.72, 0.08, 1.22, cx + w / 2 - 0.5, H + 1.9, zc + d * (0.25 - q * 0.45)); }
      if (nf >= 4 && r() < (ci ? 0.8 : 0.4)) waterTank(k, cx + (r() - 0.5) * (w - 4.5), H, zc - d * 0.1 + (r() - 0.5) * 3, 0.85 + r() * 0.25);
    }
    return finish(k, W, D, bs ? { pads: sol.pads, body: [0, zc, W / 2, d / 2] } : {});
  },
  /** Mills and warehouses, 1835–1965: brick piers and big iron windows under a flat or saw-tooth roof, a loading dock, a tall stack. */
  factory(r, corner = 0) {
    const k = new Kit(r), F = facadeOf('factory'), B = facadeOf('redbrick'), W = 23, D = 20, d = 16.5, zc = D / 2 - d / 2, shed = r() < 0.4, nf = shed ? 1 : 3 + (r() < 0.5), H = shed ? 6.2 : nf * F.ch + 0.6;
    const tint = pick(r, [WHITE, [0.8, 0.74, 0.72], [1.15, 1.02, 0.9], [0.66, 0.58, 0.56]]), bt = mul(tint, [0.92, 0.9, 0.94]), wc = mul(F.wall, tint), dock = r() < 0.5 ? 1 : -1;
    k.box(M.trim, 0x6a655c, W + 0.1, 1.6, d + 0.1, 0, -1.6, zc, 'tb');
    stage(k, F, W, d, 0, zc, 0, H, tint, (f, fw, i) => {
      for (let q = 0; q <= f.n; q++) k.box(B.side, bt, 0.62, H + (shed ? 0 : 0.75), 0.24, -fw / 2 + q * f.bw + (q === 0 ? 0.31 : q === f.n ? -0.31 : 0), 0, 0.1, 'kb');
      k.box(B.side, bt, fw, 0.5, 0.2, 0, H - 0.55, 0.08, 'k'); k.box(B.side, bt, fw + 0.1, 0.35, 0.32, 0, H - 0.1, 0.14, 'k');     // corbelled brick cornice
      k.box(M.trim, 0x8a8478, fw, 0.5, 0.12, 0, 0, 0.04, 'kb');
      if (!street(i, corner)) return;
      // wagon doors under iron lintels, one of them behind a loading dock
      for (let q = i === 0 ? 0 : 1; q < f.n; q += 2 + (f.n > 5)) {
        const x = -fw / 2 + (q + 0.5) * f.bw, dw = f.bw - 0.9;
        k.box(M.trim, pick(r, [0x3a4a3a, 0x5a2a20, 0x4a4036, 0x2c3440]), dw, 3.5, 0.08, x, 0, 0.06, 'kb'); k.box(M.trim, IRON, dw + 0.4, 0.3, 0.2, x, 3.5, 0.1, 'k'); k.box(M.trim, IRON, 0.05, 3.5, 0.03, x, 0, 0.11, 'kb');
      }
      if (i === 0) {
        const x = dock * (fw / 2 - f.bw * 1.5), L = f.bw * 2.4;
        k.box(M.trim, 0x8a857a, L, 1.1, 2.2, x, 0, 1.1, 'kb'); k.at(x - dock * (L / 2 + 0.5), 0, 0.7, 0, () => { for (let q = 0; q < 5; q++) k.box(M.trim, 0x8a857a, 1, 0.22 * (5 - q), 0.28, 0, 0, 0.14 + q * 0.28, 'kb'); });
        k.sheet(M.trim, 0x4a4e50, [x - L / 2 - 0.2, 4.2, 0.1], [x + L / 2 + 0.2, 4.2, 0.1], [x + L / 2 + 0.2, 3.75, 2.9], [x - L / 2 - 0.2, 3.75, 2.9]);
        for (const s of [-1, 1]) k.rod(M.trim, IRON, 0.07, [x + s * L * 0.42, 5.4, 0.1], [x + s * L * 0.42, 3.8, 2.7]);
      }
    });
    if (shed) {
      // north-light roof: glazed faces to one side, slates to the other; the gable walls follow the saw teeth
      const n = 5, tw = W / n, rise = 2.3, zf = d / 2, RM = M.trim, rc = lin(0x3c3e44);
      for (let q = 0; q < n; q++) {
        const x0 = -W / 2 + q * tw, x1 = x0 + tw, xs = x0 + 0.55;
        k.at(0, H, zc, 0, () => {
          k.quad(RM, rc, [xs, rise, zf], [x1, 0, zf], [x1, 0, -zf], [xs, rise, -zf]); k.quad(M.trim, 0x2a2e30, [x0, 0, -zf], [x0, 0, zf], [xs, rise, zf], [xs, rise, -zf]);
          for (let j = 0; j < 8; j++) { const a = -zf + 0.15 + (j * (d - 0.3)) / 8, b = a + (d - 0.3) / 8 - 0.1; k.quad(M.lit, LAMP, [x0 - 0.02, 0.25, a], [x0 - 0.02, 0.25, b], [xs - 0.06, rise - 0.15, b], [xs - 0.06, rise - 0.15, a]); }
          for (const s of [1, -1]) k.quad(B.side, bt, ...(s > 0 ? [[x0, 0, zf], [x1, 0, zf], [xs, rise, zf]] : [[x1, 0, -zf], [x0, 0, -zf], [xs, rise, -zf]]));
        });
      }
    } else {
      flatRoof(k, W, d, 0, H, zc, wc, 0.7);
      k.at((r() - 0.5) * 6, H, zc, 0, () => {   // a glazed lantern lights the top floor
        k.box(M.trim, 0x3a3e40, 10, 0.5, 4, 0, 0, 0, 'b'); for (const s of [-1, 1]) k.quad(M.lit, LAMP, ...(s > 0 ? [[-5, 0.5, 2], [5, 0.5, 2], [5, 1.5, 0.3], [-5, 1.5, 0.3]] : [[5, 0.5, -2], [-5, 0.5, -2], [-5, 1.5, -0.3], [5, 1.5, -0.3]]));
        k.box(M.trim, 0x3a3e40, 10.2, 0.12, 0.7, 0, 1.5, 0); for (const s of [-1, 1]) k.quad(M.trim, 0x3a3e40, ...(s > 0 ? [[5, 0.5, 2], [5, 0.5, -2], [5, 1.5, -0.3], [5, 1.5, 0.3]] : [[-5, 0.5, -2], [-5, 0.5, 2], [-5, 1.5, 0.3], [-5, 1.5, -0.3]]));
      });
      if (r() < 0.7) waterTank(k, -dock * W * 0.3, H, zc - d * 0.15, 1.2);
    }
    // the boiler stack: a tapering round brick shaft on a square base, corbelled at the top
    const sx = -dock * (W / 2 - 1.9), sz = -D / 2 + 1.7, SH = 26 + r() * 14;
    k.box(B.side, bt, 3.2, 5, 3.2, sx, 0, sz, 'b'); k.box(B.side, bt, 3.5, 0.4, 3.5, sx, 5, sz);
    k.su = 1; k.sv = SH / 12; k.cyl(B.side, bt, 0.85, 1.45, SH, sx, 5.4, sz, 14, true); k.su = k.sv = 1;
    k.cyl(B.side, mul(bt, [0.8, 0.8, 0.8]), 1.02, 0.9, 0.9, sx, 5.4 + SH - 1.6, sz, 14, true); k.cyl(B.side, mul(bt, [0.7, 0.7, 0.7]), 1.08, 1.08, 0.5, sx, 5.4 + SH - 0.7, sz, 14); k.cyl(M.trim, 0x0c0c0c, 0.7, 0.7, 0.05, sx, 5.4 + SH - 0.18, sz, 14);
    return finish(k, W, D);
  },

  /** 1925–1940: the setback skyscraper the zoning law drew — stone base, soaring piers, stepped tiers and an ornamented crown. */
  deco(r, corner = 0) {
    const k = new Kit(r), name = pick(r, ['deco', 'deco', 'decobrick', 'decobrick', 'decodark']), F = facadeOf(name), cw = F.cw;
    const nx = 10 + Math.floor(r() * 2), nz = 8 + Math.floor(r() * 2), W = nx * cw, D = nz * cw, H = r() < 0.1 ? 190 + r() * 80 : 45 + r() * 110, tall = H > 105, g = 2 * F.ch;
    const tint = name === 'deco' ? pick(r, [WHITE, [1, 0.95, 0.85], [0.86, 0.87, 0.9], [1.05, 0.98, 0.92]]) : name === 'decobrick' ? pick(r, [WHITE, [0.85, 0.8, 0.78], [1.15, 1.1, 0.95], [0.9, 0.7, 0.6]]) : WHITE;
    const wc = mul(F.wall, tint), pc = mul(F.pier, tint), stone = name === 'decodark' ? lin(0x2a2826) : lin(0xcfc6b0), gold = name === 'decodark' ? 0xd8b060 : pick(r, [0xb8bcc0, 0x9a7a4a, 0xc8ccd0]), base = lin(pick(r, [0x3a3836, 0x5a4a44, 0x2a2c30]));
    const cuts = tall ? [0.3 + r() * 0.08, 0.5 + r() * 0.06, 0.64 + r() * 0.06, 1] : [0.5 + r() * 0.12, 0.8 + r() * 0.06, 1], inset = tall ? [0, 2, 4, nx - Math.max(5, nx - 6)] : [0, 2, 4], T = [];
    let y = g;
    cuts.forEach((c, i) => { const y1 = y + Math.max(2, Math.round((g + (H - g) * c - y) / F.ch)) * F.ch; T.push({ w: (nx - inset[i]) * cw, d: Math.max(4, nz - inset[i]) * cw, y0: y, y1 }); y = y1; });
    T.forEach((t, ti) => {
      stage(k, F, t.w, t.d, 0, 0, t.y0, t.y1, tint, (f, fw, i) => {
        const st = street(i, corner), hh = t.y1 - t.y0;
        if (ti || st) piers(k, f, fw, hh, pc, 0.46, 0.24, ti === T.length - 1 ? 2 : 1.1);
        band(k, fw, hh - 0.7, 0.5, F.dark, 0.05);
        if (f.nf > 2) {   // metal spandrels with a chevron under the top storey of every stage
          const ya = (f.nf - 2 + F.wy + F.wh) * f.fh + 0.1, sh = (1 - F.wh) * f.fh - 0.2, hw = (f.bw * F.ww) / 2;
          for (let q = 0; q < f.n; q++) { const x = -fw / 2 + (q + 0.5) * f.bw; k.quad(M.metal, gold, [x - hw, ya, 0.03], [x + hw, ya, 0.03], [x + hw, ya + sh, 0.03], [x - hw, ya + sh, 0.03]); k.quad(M.trim, F.dark, [x - hw * 0.8, ya + sh * 0.15, 0.045], [x + hw * 0.8, ya + sh * 0.15, 0.045], [x, ya + sh * 0.85, 0.045]); }
        }
        if (ti) return;
        if (!st) { k.wall(F, -fw / 2, fw / 2, -g, 0, 0, tint, 0, 2); return; }
        k.at(0, -g, 0, 0, () => decoBase(k, f, fw, g, stone, base, gold, i === 0));
      });
      flatRoof(k, t.w, t.d, 0, t.y1, 0, wc, 1, TAR, pc);
      if (ti < T.length - 1) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = a * (t.w / 2 - 0.75), z = b * (t.d / 2 - 0.75); k.box(M.trim, pc, 1.5, 2.5, 1.5, x, t.y1, z, 'b'); k.box(M.trim, pc, 0.95, 1.2, 0.95, x, t.y1 + 2.5, z, 'b'); k.box(M.metal, gold, 0.4, 0.9, 0.4, x, t.y1 + 3.7, z, 'b'); }      // stepped corner blocks at each setback
    });
    // the crown
    const top = T[T.length - 1], yT = top.y1, tw = top.w, td = top.d, kind = tall ? 0 : Math.floor(r() * 3);
    if (kind === 0) {
      let yy = yT;
      [0.78, 0.56, 0.36].forEach((q, i) => {
        const hh = (4.5 + i * 1.5) * (tall ? 1.3 : 1); k.box(M.trim, wc, tw * q, hh, td * q, 0, yy, 0, 'b');
        around(k, tw * q, td * q, 0, yy, 0, (fw) => {
          for (let j = 0; j < 3; j++) { const a = -fw * 0.3 + j * fw * 0.2 + 0.2, b = a + fw * 0.2 - 0.4; k.quad(M.lit, LAMP, [a, 0.8, 0.02], [b, 0.8, 0.02], [b, hh - 0.8, 0.02], [a, hh - 0.8, 0.02]); }
          for (const s of [-1, 1]) k.box(M.trim, pc, 0.5, hh + 1, 0.3, s * (fw / 2 - 0.25), 0, 0.1, 'kb');
        });
        yy += hh;
      });
      const R = Math.min(tw, td) * 0.13; k.cyl(M.metal, gold, R * 0.8, R, 5, 0, yy, 0, 8); k.cyl(M.metal, gold, 0.12, R * 0.8, 6, 0, yy + 5, 0, 8); k.cyl(M.metal, gold, 0.04, 0.14, H * 0.1 + 4, 0, yy + 11, 0, 6);
    } else if (kind === 1) {
      // a hipped copper roof gone green, a finial on its peak
      const a = tw / 2 - 0.6, b = td / 2 - 0.6, hh = Math.min(tw, td) * 0.55, cu = 0x5f9a86, y0 = yT + 1;
      k.box(M.trim, wc, tw - 1, 1, td - 1, 0, yT, 0, 'b');
      k.quad(M.trim, cu, [-a, y0, b], [a, y0, b], [0, y0 + hh, 0]); k.quad(M.trim, cu, [a, y0, b], [a, y0, -b], [0, y0 + hh, 0]); k.quad(M.trim, cu, [a, y0, -b], [-a, y0, -b], [0, y0 + hh, 0]); k.quad(M.trim, cu, [-a, y0, -b], [-a, y0, b], [0, y0 + hh, 0]);
      k.cyl(M.metal, gold, 0.05, 0.25, 5, 0, y0 + hh - 0.6, 0, 6);
    } else {
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { k.box(M.trim, pc, 1.8, 3.5, 1.8, a * (tw / 2 - 0.9), yT, b * (td / 2 - 0.9), 'b'); k.box(M.trim, pc, 1.1, 1.4, 1.1, a * (tw / 2 - 0.9), yT + 3.5, b * (td / 2 - 0.9), 'b'); }
      k.box(M.trim, wc, tw * 0.5, 4.5, td * 0.5, 0, yT, 0, 'b'); waterTank(k, tw * 0.1, yT + 4.5, 0, 1.1); k.cyl(M.metal, 0xb8bcc0, 0.04, 0.08, 9, -tw * 0.15, yT + 4.5, 0, 6);
    }
    return finish(k, W, D);
  },

  /** 1950–2000, the International Style: curtain-walled slabs on plazas and podiums, plant floors, a clutter of machinery on top. */
  glass(r, corner = 0) {
    const k = new Kit(r), name = pick(r, ['glass', 'glass', 'dark', 'bronze']), F = facadeOf(name), W = 21 + r() * 3.3, D = 17.5 + r() * 3.5, H = 50 + r() * r() * 190, mode = r() < 0.4 ? 0 : r() < 0.55 ? 1 : 2;
    const tint = name === 'glass' ? pick(r, [WHITE, [0.85, 1, 0.95], [1, 0.95, 0.85], [0.8, 0.85, 1]]) : WHITE, frame = mul(F.wall, tint), fin = mul(frame, [0.8, 0.8, 0.8]), louvre = lin(name === 'glass' ? 0x70767c : 0x24282c), stone = 0xa8a39a;
    const fins = name !== 'glass' || r() < 0.4;
    /** one stage of curtain wall with its fins and plant-floor louvres */
    const tower = (w, d, x, z, y0, y1, plant) => {
      const ny = Math.max(1, Math.round((y1 - y0) / F.ch)); y1 = y0 + ny * F.ch;
      stage(k, F, w, d, x, z, y0, y1, tint, (f, fw) => {
        if (fins) for (let q = 0; q <= f.n; q += 2) k.box(M.trim, fin, 0.14, y1 - y0, 0.2, -fw / 2 + q * f.bw, 0, 0.09, 'kbt');
        for (const p of plant) band(k, fw, Math.round((p * (y1 - y0)) / F.ch) * F.ch, F.ch * (p > 0.9 ? 2 : 1), louvre, 0.22);
      });
      return y1;
    };
    let tw, td, tx = 0, tz, top, g;
    if (mode === 0) {
      // a slab lifted on columns over a glass lobby, set back behind its own plaza
      g = 7.4; tw = W - r() * 2; td = D - 5.5 - r() * 2; tz = -D / 2 + td / 2;
      k.box(M.trim, stone, W, 0.4, D, 0, 0, 0, 'b'); k.box(M.trim, stone, W * 0.6, 0.2, 0.9, 0, 0, D / 2 + 0.3, 'kb');
      for (const s of [-1, 1]) { const px = s * (W / 2 - 2.6), pz = D / 2 - 1.6; k.box(M.trim, 0x4a4844, 3.6, 0.55, 1.8, px, 0.4, pz, 'b'); k.box(M.trim, 0x3f6a34, 3.3, 0.35, 1.5, px, 0.95, pz, 'b'); for (let q = 0; q < 3; q++) k.geo(M.trim, 0x35602e, BLOB, px + (q - 1) * 1.05, 1.45, pz, 0, q, 0, 0.6, 0.5 + r() * 0.3, 0.6); }
      k.cyl(M.trim, 0xb8bcc0, 0.04, 0.07, 11, (r() - 0.5) * 6, 0.4, D / 2 - 1, 6);
      around(k, tw - 2.6, td - 2.6, 0, 0.4, tz, (fw) => { const n = Math.round(fw / 2.8); k.quad(M.lit, OFFICE, [-fw / 2, 0, 0], [fw / 2, 0, 0], [fw / 2, g - 0.4, 0], [-fw / 2, g - 0.4, 0]); for (let q = 0; q <= n; q++) k.box(M.trim, fin, 0.09, g - 0.4, 0.12, -fw / 2 + (q * fw) / n, 0, 0.04, 'kb'); k.box(M.trim, fin, fw, 0.1, 0.1, 0, 2.6, 0.04, 'k'); });
      around(k, tw, td, 0, 0.4, tz, (fw) => { const n = Math.max(2, Math.round(fw / 5)); for (let q = 0; q <= n; q++) k.box(M.trim, frame, 0.7, g - 0.4, 0.7, -fw / 2 + 0.35 + (q * (fw - 0.7)) / n, 0, -0.36, 'b'); });
      k.box(M.trim, 0xd8d4c8, tw, 0.35, td, 0, g - 0.35, tz, 't');
      top = tower(tw, td, 0, tz, g, H, H > 110 ? [0.5, 0.94] : [0.9]);
    } else {
      // a tower rising from a street-wall podium, or stepping back in stages
      g = 4.6; const ph = g + (mode === 1 ? 2 + Math.floor(r() * 3) : Math.round((H * 0.4) / F.ch)) * F.ch;
      around(k, W, D, 0, 0, 0, (fw, i) => { if (street(i, corner)) lobby(k, r, fw, g, frame, r() < 0.5 ? SHOP : OFFICE); else k.wall(F, -fw / 2, fw / 2, 0, g, 0, tint, 0, 1); });
      tower(W, D, 0, 0, g, ph, []); flatRoof(k, W, D, 0, ph, 0, frame, 1.1, 0x5a5c5e, frame);
      if (mode === 1) { tw = W * (0.6 + r() * 0.2); td = D * (0.6 + r() * 0.15); tx = (r() - 0.5) * (W - tw); tz = (-(D - td) / 2) * r(); top = tower(tw, td, tx, tz, ph, H, H > 110 ? [0.5, 0.94] : [0.9]); }
      else { const m = tower(W - 4 * F.cw, D - 4 * F.cw, 0, 0, ph, ph + (H - ph) * 0.55, []); flatRoof(k, W - 4 * F.cw, D - 4 * F.cw, 0, m, 0, frame, 1.1, 0x5a5c5e, frame); tw = W - 8 * F.cw; td = D - 7 * F.cw; tz = 0; top = tower(tw, td, 0, 0, m, H, [0.88]); }
    }
    flatRoof(k, tw, td, tx, top, tz, frame, 1.3, 0x5a5c5e, frame);
    // roof plant: a louvred penthouse, cooling towers, sometimes a mast
    k.box(M.trim, louvre, tw * 0.55, 4.6, td * 0.5, tx - tw * 0.1, top, tz, 'b');
    for (let q = 0; q < 2; q++) { const x = tx + tw * 0.33, z = tz + (q - 0.5) * td * 0.4; k.box(M.trim, 0x8a8e90, 2.6, 2.4, 2.6, x, top, z, 'b'); k.cyl(M.trim, 0x5a5e60, 1, 1, 0.5, x, top + 2.4, z, 10); }
    { const bx = tx - tw * 0.36, bz = tz + td / 2 - 2.4, zo = tz + td / 2 + 0.9, yc = top - 9;      // the window-cleaning rig and its cradle
      k.box(M.trim, 0xd0a428, 1.6, 1.3, 2.2, bx, top, bz, 'b'); k.rod(M.trim, 0xd0a428, 0.28, [bx, top + 1.2, bz], [bx, top + 3.4, zo]); for (const s of [-1, 1]) k.rod(M.trim, 0x1c1c1c, 0.04, [bx + s, yc + 1.1, zo], [bx, top + 3.4, zo]);
      k.box(M.trim, 0x9a9ea2, 2.6, 0.25, 0.7, bx, yc, zo); k.rail(0x30343a, bx - 1.3, zo + 0.35, bx + 1.3, zo + 0.35, yc + 0.25, 0.9); k.rail(0x30343a, bx - 1.3, zo - 0.35, bx + 1.3, zo - 0.35, yc + 0.25, 0.9);
      around(k, tw - 0.7, td - 0.7, tx, top + 1.3, tz, (fw) => k.rail(0x30343a, -fw / 2, 0, fw / 2, 0, 0, 0.9)); }
    if (H > 120 && r() < 0.45) mast(k, tx - tw * 0.1, top + 4.6, tz, 22 + r() * 30, 1.4, false);
    return finish(k, W, D);
  },
  /** 2005–2160: slender supertalls, and towers that taper, twist, stack and grow gardens. */
  contemporary(r, corner = 0) {
    const k = new Kit(r);
    const base = (F, W, D, g, tint, frame) => around(k, W, D, 0, 0, 0, (fw, i) => { if (street(i, corner)) lobby(k, r, fw, g, frame, OFFICE, i === 0); else k.wall(F, -fw / 2, fw / 2, 0, g, 0, tint, 0, Math.round(g / F.ch) || 1); });
    if (r() < 0.3) {
      const kind = Math.floor(r() * 3), H = 240 + r() * 190;
      if (kind === 0) {
        // a bare concrete grid of square windows, open plant floors every dozen storeys to let the wind through
        const F = facadeOf('grid'), w = 3 * F.cw, tint = pick(r, [WHITE, [0.88, 0.89, 0.92], [1, 0.96, 0.88]]), wc = mul(F.wall, tint), g = 6.9, top = g + Math.round((H - g) / F.ch) * F.ch;
        base(F, w, w, g, tint, wc);
        for (let y = g; y < top - 0.01;) {
          const y1 = Math.min(top, y + 12 * F.ch); stage(k, F, w, w, 0, 0, y, y1, tint); y = y1;
          if (top - y < 4 * F.ch) continue;
          k.box(M.trim, 0x16181a, w - 1.6, F.ch, w - 1.6, 0, y, 0, 'tb'); k.quad(M.trim, wc, [-w / 2, y, w / 2], [w / 2, y, w / 2], [w / 2, y, -w / 2], [-w / 2, y, -w / 2]); k.quad(M.trim, wc, [-w / 2, y + F.ch, -w / 2], [w / 2, y + F.ch, -w / 2], [w / 2, y + F.ch, w / 2], [-w / 2, y + F.ch, w / 2]);
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) k.box(M.trim, wc, 1, F.ch, 1, a * (w / 2 - 0.5), y, b * (w / 2 - 0.5), 'tb');
          y += F.ch;
        }
        flatRoof(k, w, w, 0, top, 0, wc, 1.2, 0x8a8a88, wc);
        return finish(k, w, w);
      }
      if (kind === 1) {
        // a blade of glass between bronze-finned flanks, feathering away in setbacks towards the top
        const F = facadeOf('clear'), w = 9 * F.cw, d = 11 * F.cw, tint = pick(r, [WHITE, [0.9, 0.95, 1], [1, 0.97, 0.9]]), frame = mul(F.wall, tint), bronze = lin(pick(r, [0x8a6a44, 0x9a8a70, 0x4a4a4c])), g = 8;
        base(F, w, d, g, tint, bronze);
        const cuts = [0.5, 0.62, 0.73, 0.83, 0.91, 1]; let y = g, dd = d;
        cuts.forEach((c, i) => {
          const y1 = y + Math.max(2, Math.round((g + (H - g) * c - y) / F.ch)) * F.ch, z = d / 2 - dd / 2;
          stage(k, F, w, dd, 0, z, y, y1, tint, (f, fw, fi) => { if (fi % 2) piers(k, f, fw, y1 - y, bronze, 0.28, 0.4, 0, 1); });
          flatRoof(k, w, dd, 0, y1, z, frame, 1.2, 0x8a8a88, frame); y = y1; dd -= F.cw * (i < 4 ? 1 : 2);
        });
        for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) k.box(M.trim, bronze, 0.3, 14, 0.3, a * (w / 2 - 0.15), y, d / 2 - 0.15 - b * (dd + F.cw * 2 - 0.3), 'b');
        for (const q of [7, 14]) k.box(M.trim, bronze, w, 0.3, dd + F.cw * 2, 0, y + q - 0.3, d / 2 - dd / 2 - F.cw, '');
        return finish(k, w, d);
      }
      // a chamfered shaft drawn to a faceted point under a mast
      const F = facadeOf(pick(r, ['clear', 'dark'])), a = 6.5 + r() * 1.2, c = 1.6, g = 8, frame = F.wall, ring = (y, s, ch = c * s) => ({ y, pts: [[-a * s + ch, a * s], [a * s - ch, a * s], [a * s, a * s - ch], [a * s, -a * s + ch], [a * s - ch, -a * s], [-a * s + ch, -a * s], [-a * s, -a * s + ch], [-a * s, a * s - ch]] });
      base(F, a * 2, a * 2, g, WHITE, lin(0x2a2c30));
      k.skin(F, [ring(g, 1), ring(H * 0.72, 0.95), ring(H * 0.88, 0.74), ring(H * 0.96, 0.5), ring(H, 0.3)]);
      cap(k, ring(H, 0.3).pts, H - 1.5, frame); k.cyl(M.metal, 0xc8ccd0, 0.06, 0.5, H * 0.12, 0, H - 1.5, 0, 8);
      return finish(k, a * 2, a * 2);
    }
    const W = 20 + r() * 4, D = 17 + r() * 4, H = 80 + r() * 160, form = Math.floor(r() * 4), F = facadeOf(form === 3 ? 'green' : pick(r, ['clear', 'clear', 'dark', 'glass'])), g = 2 * F.ch;
    const tint = pick(r, [WHITE, [0.9, 0.96, 1], [1, 0.97, 0.9], [0.85, 1, 0.95]]), frame = mul(F.wall, tint);
    base(F, W, D, g, tint, form === 3 ? lin(0x8a8478) : lin(0x2c2e32));
    k.quad(M.trim, 0x8a8a86, [-W / 2, g, D / 2], [W / 2, g, D / 2], [W / 2, g, -D / 2], [-W / 2, g, -D / 2]);
    if (form === 0) {
      // the plan turns as it climbs
      const hw = W * 0.4, hd = D * 0.4, c = 2.2, turn = (0.45 + r() * 0.5) * (r() < 0.5 ? -1 : 1), n = Math.max(4, Math.round((H - g) / (3 * F.ch))), rings = [];
      for (let j = 0; j <= n; j++) { const t = j / n, s = 1 - 0.14 * t, co = Math.cos(turn * t), si = Math.sin(turn * t); rings.push({ y: g + t * (H - g), pts: [[-hw + c, hd], [hw - c, hd], [hw, hd - c], [hw, -hd + c], [hw - c, -hd], [-hw + c, -hd], [-hw, -hd + c], [-hw, hd - c]].map(([x, z]) => [(x * co + z * si) * s, (-x * si + z * co) * s]) }); }
      k.skin(F, rings, tint); cap(k, rings[n].pts, H - 2.2, frame);
      k.box(M.trim, 0x5a5e62, hw * 0.8, 3.4, hd * 0.8, 0, H - 2.2, 0, 'b');
    } else if (form === 1) {
      // eight leaning triangles: a square at the foot, a square turned 45° at the top
      const a = W / 2 - 1, b = D / 2 - 1; facets(k, F, a, b, g, H, tint); cap(k, [[0, b], [a, 0], [0, -b], [-a, 0]], H - 2, frame);
      k.box(M.trim, 0x5a5e62, a * 0.6, 3.5, b * 0.6, 0, H - 2, 0, 'b'); if (r() < 0.5) k.cyl(M.metal, 0xc8ccd0, 0.06, 0.45, H * 0.14, 0, H + 1.5, 0, 8);
    } else if (form === 2) {
      // boxes stacked out of line, a recessed floor between each
      const n = 3 + Math.floor(r() * 3); let y = g, w, d, x, z;
      for (let i = 0; i < n; i++) {
        w = W * (0.72 + r() * 0.2); d = D * (0.72 + r() * 0.2); x = (r() - 0.5) * (W - w); z = (r() - 0.5) * (D - d);
        const y1 = y + Math.max(3, Math.round((H - g) / n / F.ch) - 1) * F.ch;
        k.box(M.trim, 0x1a1c1e, w * 0.8, F.ch, d * 0.8, x * 0.5, y, z * 0.5, 'tb'); k.box(M.trim, 0xc8c8c4, w, 0.3, d, x, y + F.ch - 0.3, z, 't');
        stage(k, F, w, d, x, z, y + F.ch, y1 + F.ch, tint); flatRoof(k, w, d, x, y1 + F.ch, z, frame, 1.1, 0x8a8a88, frame); y = y1 + F.ch;
      }
      k.box(M.trim, 0x5a5e62, w * 0.5, 3.4, d * 0.5, x, y, z, 'b');
    } else {
      // garden terraces step back up the street front
      const n = 4 + Math.floor(r() * 3); let y = g, d = D;
      for (let i = 0; i < n; i++) {
        const y1 = i === n - 1 ? g + Math.round((H - g) / F.ch) * F.ch : y + Math.max(3, Math.round(((H - g) * (0.3 + 0.7 * ((i + 1) / n)) + g - y) / F.ch)) * F.ch, z = -D / 2 + d / 2;
        stage(k, F, W, d, 0, z, y, y1, tint); flatRoof(k, W, d, 0, y1, z, frame, 1.1, 0x6f8a52, frame);
        const zt = z + d / 2 - 1.3; k.box(M.trim, 0x3f7a36, W - 1.2, 0.5, 1.6, 0, y1, zt, 'b');
        for (let q = 0; q < 7; q++) { const x = (q - 3) * (W - 3) / 6 + (r() - 0.5), tree = r() < 0.4; if (tree) k.cyl(M.trim, 0x4a3a28, 0.07, 0.1, 1.8, x, y1 + 0.4, zt, 5, true); k.geo(M.trim, pick(r, [0x3a6a30, 0x4a7a38, 0x2f5a2c]), TUFT, x, y1 + (tree ? 2.8 : 0.9), zt, 0, q, 0, tree ? 1.3 : 0.8, tree ? 1.2 : 0.6, tree ? 1.3 : 0.8); }
        y = y1; d -= 2.6 + r() * 1.5;
      }
    }
    return finish(k, W, D);
  },

  /** 2200–3000, the imagined megacity: black arcologies stepping up into the rain, strung with neon, signs, decks, ducts and bridges. */
  mega(r, corner = 0) {
    const k = new Kit(r), F = facadeOf('neon'), W = 22 + r() * 2.5, D = 19 + r() * 2, H = 220 + r() * r() * 650, c1 = pick(r, NEON), c2 = pick(r, NEON), hull = 0x15151c, steel = 0x24252f;
    /** a sign in an alphabet nobody alive today can read */
    const sign = (x, y, w, h, col, vertical) => {
      k.box(M.trim, 0x08080c, w, h, 0.5, x, y, 0.25, 'kb'); const e = 0.25, z = 0.52;
      for (const [bx, by, bw, bh] of [[x, y, w, e], [x, y + h - e, w, e], [x - w / 2 + e / 2, y, e, h], [x + w / 2 - e / 2, y, e, h]]) k.quad(M.glow, col, [bx - bw / 2, by, z], [bx + bw / 2, by, z], [bx + bw / 2, by + bh, z], [bx - bw / 2, by + bh, z]);
      const n = Math.max(1, Math.round((vertical ? h : w) / (vertical ? w : h))), cs = (vertical ? h : w) / n, s = Math.min(w, h) * 0.6;
      for (let i = 0; i < n; i++) {
        const cx = vertical ? x : x - w / 2 + (i + 0.5) * cs, cy = vertical ? y + (i + 0.5) * cs : y + h / 2;
        for (let q = 0; q < 4; q++) { const hz = r() < 0.5, a = (Math.floor(r() * 3) - 1) * s * 0.33, lw = hz ? s * (0.5 + r() * 0.5) : s * 0.14, lh = hz ? s * 0.14 : s * (0.5 + r() * 0.5), px = cx + (hz ? 0 : a), py = cy + (hz ? a : 0); k.quad(M.glow, col, [px - lw / 2, py - lh / 2, z], [px + lw / 2, py - lh / 2, z], [px + lw / 2, py + lh / 2, z], [px - lw / 2, py + lh / 2, z]); }
      }
    };
    const n = 3 + Math.floor(r() * 3), tiers = []; let w = W, d = D, x = 0, z = 0, y = 0;
    for (let i = 0; i < n; i++) {
      const y1 = Math.round((H * (0.2 + 0.8 * ((i + 1) / n) ** 1.4)) / F.ch) * F.ch; tiers.push({ w, d, x, z, y, y1 });
      stage(k, F, w, d, x, z, y, y1, WHITE, (f, fw, fi) => {
        const hh = y1 - y;
        // the megaframe: corner columns, a belt truss every dozen storeys and a diagonal across each bay of it
        const nb = Math.max(1, Math.round(hh / 44)), bh = hh / nb;
        for (const s of [-1, 1]) k.box(M.trim, steel, 1.5, hh, 0.7, s * (fw / 2 - 0.75), 0, 0.3, 'kb');
        for (let j = 0; j < nb; j++) { const s = (j + fi) % 2 ? 1 : -1; k.box(M.trim, steel, fw - 3, 1.4, 0.55, 0, (j + 1) * bh - 2.8, 0.26, 'k'); k.rod(M.trim, steel, 0.9, [s * (fw / 2 - 1.2), j * bh, 0.24], [-s * (fw / 2 - 1.2), (j + 1) * bh - 2.8, 0.24], 4, 0.45); }
        if ((fi + i) % 2 === 0) k.box(M.glow, i % 2 ? c2 : c1, 0.4, hh, 0.3, -fw / 2 + 0.75, 0, 0.72, 'kb');
        if (i < 2 && r() < 0.75) { const v = r() < 0.6, sw = v ? 3 + r() * 2.5 : fw * (0.5 + r() * 0.3), sh = v ? Math.min(hh * 0.5, 18 + r() * 30) : 5 + r() * 4; sign((r() - 0.5) * (fw - sw - 2), (i ? 6 : 14) + r() * Math.max(1, hh - sh - 24), sw, sh, pick(r, NEON), v); }
        if (fi === 2 || (fi % 2 && r() < 0.5)) for (let q = 0; q < 3; q++) k.cyl(M.trim, 0x22232c, 0.55, 0.55, hh, fw * 0.2 + q * 1.5, 0, 0.5, 6, true);      // ducts
        if (i || !street(fi, corner)) return;
        // the street: a dark arcade of lit stalls
        k.box(M.trim, hull, fw, 0.9, 0.5, 0, 5.2, 0.25, 'k'); k.quad(M.glow, c2, [-fw / 2, 5.2, 0.52], [fw / 2, 5.2, 0.52], [fw / 2, 5.45, 0.52], [-fw / 2, 5.45, 0.52]);
        const m = Math.round(fw / 4.2);
        for (let q = 0; q < m; q++) {
          const sw = fw / m, sx = -fw / 2 + (q + 0.5) * sw, col = pick(r, NEON), a = sx - sw / 2 + 0.6, b = sx + sw / 2, c = (a + b) / 2;
          k.box(M.trim, hull, 0.6, 5.2, 0.5, sx - sw / 2 + 0.3, 0, 0.25, 'kb');
          if (r() < 0.85) {   // an open stall: lit shelves of goods behind a counter, a canopy edged in neon, its sign above
            k.quad(M.glow, mul(lin(col), [0.2, 0.2, 0.2]), [a, 0.2, 0.04], [b, 0.2, 0.04], [b, 3.4, 0.04], [a, 3.4, 0.04]);
            for (const y of [1.45, 2.05, 2.65]) { k.box(M.trim, 0x0a0a10, b - a, 0.06, 0.3, c, y, 0.2, 'k'); k.quad(M.glow, mul(lin(pick(r, NEON)), [0.45, 0.45, 0.45]), [a + 0.2, y + 0.06, 0.12], [b - 0.2, y + 0.06, 0.12], [b - 0.2, y + 0.4, 0.12], [a + 0.2, y + 0.4, 0.12]); }      // goods on the shelves, one lit strip a shelf
            k.box(M.trim, 0x1c1d26, b - a - 0.2, 1, 0.4, c, 0, 0.42, 'kb'); k.box(M.metal, 0x5a5e68, b - a, 0.06, 0.5, c, 1, 0.42, 'k');
            k.sheet(M.trim, 0x14141c, [a - 0.1, 3.05, 1.7], [b + 0.1, 3.05, 1.7], [b + 0.1, 3.5, 0.3], [a - 0.1, 3.5, 0.3]); k.quad(M.glow, col, [a - 0.1, 2.93, 1.71], [b + 0.1, 2.93, 1.71], [b + 0.1, 3.05, 1.71], [a - 0.1, 3.05, 1.71]);
            sign(c, 3.75, (b - a) * (0.5 + r() * 0.4), 1.15, col, false);
          } else { k.box(M.metal, 0x2a2c34, b - a, 3.4, 0.06, c, 0.1, 0.07, 'kb'); for (let j = 1; j < 9; j++) k.box(M.trim, 0x101016, b - a, 0.04, 0.03, c, 0.1 + j * 0.38, 0.1, 'kb'); }      // shuttered
        }
        k.box(M.trim, hull, 0.6, 5.2, 0.5, fw / 2 - 0.3, 0, 0.25, 'kb');
      });
      // a service deck rings the top of every tier
      const o = i ? 3 : 1.6; k.box(M.trim, hull, w + o, 1.3, d + o, x, y1 - 1.3, z); k.box(M.glow, i % 2 ? c1 : c2, w + o + 0.1, 0.22, d + o + 0.1, x, y1 - 0.9, z, 'tb');
      const nw = w * (0.6 + r() * 0.22), nd = d * (0.6 + r() * 0.22); x += (r() - 0.5) * (w - nw); z += (r() - 0.5) * (d - nd); w = nw; d = nd; y = y1;
    }
    // bridges at set levels meet those of the neighbouring towers at the lot line
    for (const by of [72, 156, 276]) { const t = tiers.find((q) => by > q.y + 6 && by < q.y1 - 12); if (t) for (const s of [-1, 1]) { const x0 = t.x + (s * t.w) / 2, x1 = s * 13.34; k.box(M.trim, hull, Math.abs(x1 - x0), 3.2, 3.4, (x0 + x1) / 2, by, t.z, 'lr'); k.box(M.glow, c1, Math.abs(x1 - x0), 0.5, 3.5, (x0 + x1) / 2, by + 1.5, t.z, 'lrtb'); } }
    // roofscape: vent stacks, aerials, warning lights
    const t = tiers[n - 1];
    for (let q = 0; q < 3; q++) { const vx = t.x + (r() - 0.5) * t.w * 0.7, vz = t.z + (r() - 0.5) * t.d * 0.7, vh = 5 + r() * 9; k.cyl(M.trim, 0x22232c, 1, 1.3, vh, vx, H, vz, 8, true); k.cyl(M.glow, 0xff5a2a, 1.02, 1.02, 0.3, vx, H + vh - 0.6, vz, 8, true); }
    for (let q = 0; q < 4; q++) { const ax = t.x + (r() - 0.5) * t.w * 0.8, az = t.z + (r() - 0.5) * t.d * 0.8, ah = 15 + r() * 55; k.cyl(M.trim, 0x30323c, 0.05, 0.22, ah, ax, H, az, 5, true); k.box(M.glow, 0xff2020, 0.7, 0.7, 0.7, ax, H + ah, az); for (let j = 1; j < 3; j++) k.box(M.trim, 0x30323c, 2.2 - j * 0.6, 0.08, 0.08, ax, H + ah * (0.5 + j * 0.15), az); }
    return finish(k, W, D);
  },

  /** 3000–10,000, the imagined garden age: white spires grown rather than built, ringed with hanging gardens. */
  spire(r) {
    const k = new Kit(r), F = facadeOf('white'), H = 160 + r() * 300, R = 6 + r() * 2, kind = Math.floor(r() * 3), N = 16, M2 = 22, rings = [], white = 0xf2f6f6;
    const prof = (t) => (0.3 + 0.7 * (1 - t) ** 1.3 + 0.45 * Math.exp(-t * 22) + (kind === 1 ? 0.3 * Math.exp(-(((t - 0.87) / 0.06) ** 2)) : kind === 2 ? 0.5 * Math.max(0, (t - 0.8) / 0.2) ** 1.5 : 0)) * R;
    for (let j = 0; j <= M2; j++) { const t = (j / M2) ** 0.9, rad = prof(t); rings.push({ y: t * H, pts: Array.from({ length: N }, (_, i) => [Math.sin((i / N) * PI * 2) * rad, Math.cos((i / N) * PI * 2) * rad]) }); }
    k.skin(F, rings, WHITE, true);
    // structure: eight ribs that leave the ground like roots and wind up the shaft, a floor ring every few storeys, four arched doors
    const ribC = 0xdfe8ea, tw = (r() < 0.5 ? 1 : -1) * (0.5 + r()), at = (an, rad, y) => [Math.sin(an) * rad, y, Math.cos(an) * rad];
    for (let i = 0; i < 8; i++) for (let j = 0; j < M2; j++) {
      const [A, B] = [j, j + 1].map((q) => { const t = (q / M2) ** 0.9, rad = prof(t), an = (i / 8) * PI * 2 + t * tw, w = 0.45 / rad; return [at(an - w, rad * 0.95, t * H), at(an, rad + 0.8 + 3 * Math.exp(-t * 18), t * H), at(an + w, rad * 0.95, t * H)]; });
      k.sheet(M.trim, ribC, A[0], A[1], B[1], B[0]); k.sheet(M.trim, ribC, A[1], A[2], B[2], B[1]);
    }
    for (let y = 26; y < H * 0.93; y += 26) { const a = prof(y / H); k.lathe(M.trim, white, [[a - 0.15, 0], [a + 0.75, 0.12], [a + 0.75, 0.32], [a - 0.15, 0.5]], 0, y, 0, N); }
    for (let i = 0; i < 4; i++) k.at(0, 0, 0, (i * PI) / 2 + PI / 8, () => { const r0 = prof(0), zf = r0 * 0.93; k.box(M.trim, white, 3.8, 5.8, r0 * 0.3, 0, 0, r0 * 0.78, 'b'); k.quad(M.lit, [0.5, 1.2, 1.3], [-1.3, 0, zf + 0.02], [1.3, 0, zf + 0.02], [1.3, 3.9, zf + 0.02], [-1.3, 3.9, zf + 0.02]); k.geo(M.lit, [0.5, 1.2, 1.3], new THREE.CircleGeometry(1.3, 10, 0, PI), 0, 3.9, zf + 0.02); });
    // hanging gardens
    for (const t of [0.2 + r() * 0.08, 0.42 + r() * 0.08, 0.63 + r() * 0.06]) {
      const y = t * H, a = prof(t), b = a + 4.5 + r() * 3.5;
      k.lathe(M.trim, white, [[a * 0.9, -4.5], [b * 0.8, -1.4], [b, -0.3], [b + 0.1, 0.5], [b - 0.5, 0.5]], 0, y, 0, N); k.cyl(M.trim, 0x4f9a48, b - 0.4, b - 0.4, 0.2, 0, y + 0.25, 0, N);
      for (let q = 0; q < 9; q++) { const an = (q / 9) * PI * 2 + r(), rr = (a + b) / 2 + 0.3, tree = q % 3 === 0; k.geo(M.trim, pick(r, [0x3f8a3a, 0x58a84a, 0x2f7a3a, 0xc85a8a]), TUFT, Math.sin(an) * rr, y + (tree ? 2.4 : 0.9), Math.cos(an) * rr, 0, q, 0, tree ? 1.4 : 0.9, tree ? 1.9 : 0.7, tree ? 1.4 : 0.9); }
    }
    const top = prof(1);
    if (kind === 2) { k.cyl(M.trim, 0x4f9a48, top - 0.3, top - 0.3, 0.3, 0, H - 0.8, 0, N); for (let q = 0; q < 7; q++) { const an = q * 0.9, rr = top * 0.6 * (q % 2 ? 1 : 0.45); k.geo(M.trim, pick(r, [0x3f8a3a, 0x58a84a, 0xe8c0d8]), TUFT, Math.sin(an) * rr, H + 1.6, Math.cos(an) * rr, 0, q, 0, 1.6, 2.2, 1.6); } }
    else { k.lathe(M.trim, white, [[top, 0], [top * 0.7, 3], [top * 0.3, 7], [0.12, 12 + H * 0.03]], 0, H, 0, N); k.geo(M.metal, 0xd8e8ea, new THREE.TorusGeometry(top * 2.2, 0.16, 6, 28), 0, H + 5, 0, PI / 2); }
    return finish(k, prof(0.02) * 2, prof(0.02) * 2);
  },

  /** After the city: floors gone, walls standing to different heights, steel bared, rubble under moss and young trees. Does not grow. */
  ruin(r) {
    const k = new Kit(r), F = facadeOf('ruin'), w = 8 + r() * 14, d = 8 + r() * 12, h = 3 + r() * r() * 30, T = 0.4;
    const tint = pick(r, [WHITE, [0.85, 0.95, 0.8], [1.05, 0.95, 0.85], [0.8, 0.8, 0.78]]), inner = mul(F.wall, [0.55, 0.6, 0.5]), cx = r() < 0.5 ? -1 : 1, cz = r() < 0.5 ? -1 : 1, green = [0x4a6a34, 0x5a7a3a, 0x3f5a30, 0x6a8a44];
    // how much still stands: least at the corner that gave way
    const stand = (X, Z) => Math.max(0.5, h * Math.min(1, 0.08 + 1.1 * (Math.hypot(X - (cx * w) / 2, Z - (cz * d) / 2) / Math.hypot(w, d)) ** 1.3) * (0.55 + r() * 0.45));
    SIDES.forEach(([sx, sz, ry], i) => {
      const fw = i % 2 ? d : w, n = Math.max(2, Math.round(fw / F.cw)), bw = fw / n;
      k.at((sx * w) / 2, 0, (sz * d) / 2, ry, () => {
        for (let q = 0; q < n; q++) {
          const x0 = -fw / 2 + q * bw, x1 = x0 + bw, xm = (x0 + x1) / 2, hq = stand((sx * w) / 2 + xm * Math.cos(ry), (sz * d) / 2 - xm * Math.sin(ry)), jag = 0.4 + r() * 1.6, xj = x0 + r() * bw;
          k.wall(F, x0, x1, 0, hq, 0, tint, 1, Math.max(1, Math.round(hq / F.ch))); k.quad(F.side, tint, [x0, hq, 0], [x1, hq, 0], [xj, hq + jag, 0]);
          k.quad(M.trim, inner, [x1, 0, -T], [x0, 0, -T], [x0, hq, -T], [x1, hq, -T]); k.quad(M.trim, inner, [x1, hq, -T], [x0, hq, -T], [xj, hq + jag, -T]);
          k.quad(M.trim, inner, [x0, 0, -T], [x0, 0, 0], [x0, hq, 0], [x0, hq, -T]); k.quad(M.trim, inner, [x1, 0, 0], [x1, 0, -T], [x1, hq, -T], [x1, hq, 0]);
          k.quad(M.trim, inner, [x0, hq, 0], [x1, hq, 0], [x1, hq, -T], [x0, hq, -T]);
          if (r() < 0.5) { const vw = bw * (0.3 + r() * 0.6), vh = Math.min(hq, 1 + r() * 6), vx = x0 + r() * (bw - vw), c = pick(r, green); k.quad(M.trim, c, [vx, hq - vh, 0.05], [vx + vw, hq - vh * (0.6 + r() * 0.4), 0.05], [vx + vw, hq, 0.05], [vx, hq, 0.05]); k.geo(M.trim, c, BLOB, vx + vw / 2, hq, -T / 2, 0, q, 0, vw * 0.7, 0.5 + r() * 0.5, 0.6); }
        }
      });
    });
    // what is left of the floors, the frame, and the heap they fell into
    for (let y = F.ch; y < h * 0.8; y += F.ch) if (r() < 0.7) { const sw = w * (0.3 + r() * 0.4), sd = d * (0.3 + r() * 0.4); k.box(M.trim, 0x6a6a62, sw, 0.3, sd, (-cx * (w - sw)) / 2 * 0.95, y, (-cz * (d - sd)) / 2 * 0.95); }
    if (h > 10) for (let q = 0; q < 5; q++) { const x = (r() - 0.5) * w * 0.7, z = (r() - 0.5) * d * 0.7, hh = stand(x, z) * (0.8 + r() * 0.5); k.box(M.trim, 0x5a3622, 0.3, hh, 0.3, x, 0, z, 'b'); if (q) k.rod(M.trim, 0x5a3622, 0.25, [x, hh * 0.7, z], [x + (r() - 0.5) * 6, hh * (0.3 + r() * 0.5), z + (r() - 0.5) * 6]); }
    k.geo(M.trim, 0x64625a, BLOB, (cx * w) / 4, 0, (cz * d) / 4, 0, r() * 6, 0, w * 0.42, 1 + h * 0.07, d * 0.42); k.geo(M.trim, 0x566a3c, BLOB, (-cx * w) / 6, 0, (cz * d) / 5, 0, r() * 6, 0, w * 0.35, 0.8 + h * 0.03, d * 0.35);
    for (let q = 0; q < 4 + w / 4; q++) { const x = (r() - 0.5) * w, z = (r() - 0.5) * d, s = 0.8 + r() * 1.6, tree = r() < 0.35; if (tree) k.cyl(M.trim, 0x4a3a28, 0.1, 0.18, 3, x, 0, z, 5, true); k.geo(M.trim, pick(r, green), BLOB, x, tree ? 4 : s * 0.5, z, 0, q, 0, tree ? 2.2 : s, tree ? 2 : s * 0.7, tree ? 2.2 : s); }
    return finish(k, w, d, { noGrow: true });
  },
};
