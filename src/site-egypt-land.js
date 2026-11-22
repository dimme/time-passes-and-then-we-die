// The ground at Giza: a limestone plateau above the Nile's flood plain. x runs east, z south; the river is at x > 780.
import { smooth, clamp, lerp } from './util.js?v=740e009b';

export const PLAIN = 1.6, LOW = 3, RH = 24;          // flood plain, low desert, greatest height of the building ramp (m)
export const SLOPE = 0.7857;                          // run per rise of a pyramid face (51.84°)
/** The three pyramids: centre, base, height, level of the rock they stand on, years building, height of granite casing. */
export const K1 = { x: 40, z: -380, b: 230.3, H: 146.6, lvl: 30, y0: -2600, y1: -2560, granite: 0, n: 210 };
export const K2 = { x: -290, z: -20, b: 215.3, H: 143.5, lvl: 34, y0: -2560, y1: -2530, granite: 1.1, n: 180 };
export const K3 = { x: -540, z: 370, b: 104.6, H: 65.5, lvl: 36, y0: -2530, y1: -2500, granite: 15, n: 90 };
/** Khufu's ramp: from the quarry north to the south face. The quarry lies south of it. */
export const RAMP = { x: 65, z0: -95, z1: K1.z + K1.b / 2, half: 12 };
export const QUARRY = { x0: 20, x1: 150, z0: -40, z1: 50, floor: 22 };
export const SPHINX = { x: 300, z: 172, lvl: 4.2 };
export const TOWN = { x0: 335, x1: 468, z0: 395, z1: 650 };
export const BASINS = [[505, 590, -510, -440], [590, 800, -487, -463], [440, 505, 188, 252], [505, 800, 208, 232]];   // harbours and their canals [x0, x1, z0, z1]

const rectD = (x, z, x0, x1, z0, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
/** Flat ground [x0, x1, z0, z1, level, margin]: under each pyramid, temple and town. */
const PADS = [
  [K2.x - 135, K2.x + 235, K2.z - 135, K2.z + 135, K2.lvl, 70], [K3.x - 75, K3.x + 75, K3.z - 75, K3.z + 110, K3.lvl, 80],
  [SPHINX.x - 48, SPHINX.x + 44, SPHINX.z - 20, SPHINX.z + 20, SPHINX.lvl, 12], [345, 418, 128, 262, 3.4, 20],
  [455, 500, -505, -445, 2.4, 14], [55, 105, 345, 400, 27.5, 30],
];
/** Edge of the flood plain: the low desert reaches further east where the workers' town stands. */
const plainEdge = (z) => 425 + 50 * smooth((z - 330) / 70) * smooth((720 - z) / 70);

export function natural(x, z) {
  const b = smooth((z + 50) / 200), xe = 330 - 140 * b, w = 70 + 210 * b;
  let top = 30 + 4 * smooth((-x - 80) / 200);
  const far = smooth((Math.max(-x - 760, Math.abs(z) - 820)) / 240);
  if (far > 0) top += far * (5 * Math.sin(x * 0.011 + 1) * Math.cos(z * 0.009) + 3 * Math.sin(x * 0.023 + z * 0.017));
  let h = LOW + (top - LOW) * smooth((xe - x) / w + 0.5);
  for (const p of PADS) { const d = rectD(x, z, p[0], p[1], p[2], p[3]); if (d < p[5]) h = lerp(h, p[4], smooth(1 - d / p[5])); }
  return h;
}
function base(x, z) {
  let h = natural(x, z);
  // the quarry and the cutting that leads out of it, up to the foot of the ramp
  const q = QUARRY, dq = rectD(x, z, q.x0 + 8, q.x1 - 8, q.z0 + 8, q.z1 - 8); if (dq < 8) h = Math.min(h, lerp(30, q.floor, smooth(1 - dq / 8)));
  if (z < q.z0 + 10 && z > RAMP.z0 - 10) { const t = clamp((q.z0 - z) / (q.z0 - RAMP.z0 - 5), 0, 1), cut = q.floor + (30 - q.floor) * t + Math.max(0, Math.abs(x - RAMP.x) - 15) * 0.8; h = Math.min(h, cut); }
  // down to the flood plain, its harbours and canals, and the river
  const xp = plainEdge(z); h = lerp(h, PLAIN, smooth((x - xp + 12) / 24));
  if (x > 430) for (const r of BASINS) { const d = rectD(x, z, r[0], r[1], r[2], r[3]); if (d < 9) h = Math.min(h, lerp(PLAIN, -2.6, smooth(1 - d / 9))); }
  if (x > 770) h = Math.min(h, lerp(PLAIN, -5, smooth((x - 772) / 34)));
  return h;
}
/** The building ramp and the working level it reaches, as built to its full height: the year scales it (env.hill). */
function relief(x, z) {
  const R = RAMP, t = clamp((R.z0 - z) / (R.z0 - R.z1), 0, 1), ax = Math.abs(x - R.x);
  let f = 0;
  if (z < R.z0 && z > K1.z - 60 && ax < R.half + RH) f = clamp(RH * t - Math.max(0, ax - R.half) * 2, 0, RH);
  const dIn = K1.b / 2 - Math.max(Math.abs(x - K1.x), Math.abs(z - K1.z)) - 14;   // inside the pyramid, clear of its faces
  if (dIn > 0) f = Math.max(f, Math.min(RH, dIn * 1.2));
  return f;
}
/** Darker soil on the plain, pale dust on the plateau. */
function tint(x, z, b) {
  if (b < PLAIN + 0.5 && x > 380) return b < 0.3 ? 0.55 : 0.4;
  return 1 + 0.08 * Math.sin(x * 0.031 + z * 0.017) * Math.sin(z * 0.023);
}
export const terrain = { base, relief, tint, bounds: { x: 900, z: 1100 } };
/** Height of the ground without the ramp. */
export const ground = base;
/** How high the working level of a pyramid stands in a given year: its volume grows evenly, so the height races at first. */
export function builtHeight(P, year) { const f = clamp((year - P.y0) / (P.y1 - P.y0), 0, 1); return P.H * (1 - Math.cbrt(1 - f)); }
/** The scale of Khufu's ramp (env.hill) in a year: it rises with the pyramid until it reaches its full height, and is cleared away afterwards. */
export function builtCourses(P, year) { return year >= P.y1 ? P.n : Math.floor((builtHeight(P, year) / P.H) * P.n); }
export function rampScale(year) { return year >= K1.y1 ? 0 : Math.min(1, (builtCourses(K1, year) * K1.H) / K1.n / RH); }
