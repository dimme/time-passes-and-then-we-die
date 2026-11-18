// Road cars. Each body is one skin lofted from side-view curves; glass, lamps and trim are picked out of that same skin.
import { clamp, lerp } from './util.js';
import { Bag, fin, curve, loft, skin, sweep, oval, revolve, wheel, spokedWheel, vehicleMat, at } from './vehicles-kit.js';

const PI = Math.PI;
export const F = {
  paint: fin(0xffffff, 0.26, 0.55, 0, 1), glass: fin(0x2a3640, 0.04, 1), under: fin(0x060606, 0.95), rubber: fin(0x101011, 0.88), gap: fin(0x030303, 0.9),
  chrome: fin(0xe6eaee, 0.09, 1), alloy: fin(0xa4a9ae, 0.32, 0.9), black: fin(0x121214, 0.45, 0.1), gloss: fin(0x050506, 0.12, 0.3), grille: fin(0x0a0a0c, 0.4, 0.6),
  head: fin(0xfff0cc, 0.2, 0, 0.9), led: fin(0xe4f0ff, 0.2, 0, 2.2), tail: fin(0xe01208, 0.3, 0, 1.3), amber: fin(0xff8a10, 0.3, 0, 0.9), sign: fin(0xffd84a, 0.4, 0, 1.6),
  wall: fin(0xe6e2d6, 0.8), plate: fin(0xe8e4d0, 0.6), top: fin(0x0c0c0d, 0.8), straw: fin(0xc9b47a, 0.6), brass: fin(0xc8a040, 0.25, 1), white: fin(0xf2f2f2, 0.3, 0.2),
};
const COLS = [-1, -0.94, -0.7, -0.45, -0.2, 0, 0.2, 0.45, 0.7, 0.94, 1];

/**
 * Loft a car body. d = { x0, x1 (tail and nose), top (centre-line silhouette), belt (shoulder line), sill (lower edge of
 * the sides), half (half-width at the shoulder), crown (rise of the top surface towards the centre line): curves over x;
 * T: heights of the side strips as fractions between sill and belt; tumble: lean of the glasshouse; tuck: how far the
 * sills sit inboard; bow: how far the ends sweep back at the corners; arches: [x, radius, centre height] wheel openings;
 * lines: door shut lines; cuts: extra stations; paint(strip, x) and front / rear(strip, z fraction) choose the finishes }.
 * Strips are 'under', 'well', 's0'…, 'glass' (shoulder to roof rail), 'rail' and 'roof'.
 */
function carBody(bag, d) {
  const top = curve(d.top), beltC = curve(d.belt), sill = curve(d.sill), half = curve(d.half), crown = curve(d.crown ?? 0.035);
  const { x0, x1, T, bow = 0.1, tumble = 0.33, tuck = 0.05, arches = [], lines = [], cols = COLS, step = 0.24 } = d;
  const W0 = half((x0 + x1) / 2);
  const edge = (x) => { let y = sill(x); for (const [xa, ra, ya] of arches) { const dx = Math.abs(x - xa); if (dx < ra) y = Math.max(y, ya + Math.sqrt(ra * ra - dx * dx)); } return y; };
  const bx = (x, z) => { const e = x > (x0 + x1) / 2 ? x1 : x0, t = clamp(1 - Math.abs(e - x) / 0.8, 0, 1); return (e === x1 ? -1 : 1) * bow * t * t * (z / W0) ** 2; };
  const belt = (x) => Math.min(beltC(x), top(x) - crown(x) - 0.04);
  const ring = (x) => {
    const W = half(x), c = crown(x), yt = top(x) - c, yb = belt(x), ys = sill(x), ye = edge(x), yf = ys - 0.04, g = yt - yb;
    const r = Math.min(0.07, g * 0.5), Wr = W - 0.015 - tumble * g - r * 0.5, zi = W - 0.36;
    const pts = [[yf, 0], [yf, zi], [ye > ys ? ye : yf, zi]];
    for (const t of T) { const y = Math.max(ye, lerp(ys, yb, t)); pts.push([y, W - tuck * (1 - (y - ys) / (yb - ys)) ** 2]); }
    pts.push([yt - r, Wr + r * 0.9], [yt - r * 0.3, Wr]);
    for (const q of [0.66, 0.33, 0]) pts.push([yt + c * (1 - q * q) - r * 0.3 * q ** 4, Wr * q]);
    for (const p of pts) p.push(bx(x, p[1]));
    return pts;
  };
  const names = ['under', 'under', 'well', ...T.slice(1).map((_, k) => 's' + k), 'glass', 'rail', 'roof', 'roof', 'roof'];
  const key = [x0, x1, ...(d.cuts || [])];
  for (const e of [0.03, 0.08, 0.16, 0.28, 0.44]) key.push(x0 + e, x1 - e);
  for (const [xa, ra] of arches) { for (let k = 0; k <= 8; k++) key.push(xa - ra * Math.cos((k * PI) / 8)); key.push(xa - ra - 0.004, xa + ra + 0.004); }
  for (const l of lines) key.push(l - 0.006, l + 0.006);
  for (let x = x0, n = key.length; x < x1; x += step) if (!key.slice(0, n).some((k) => Math.abs(k - x) < step * 0.55)) key.push(x);
  const xs = key.sort((a, b) => a - b).filter((x, i) => i === 0 || x - key[i - 1] > 0.002);
  loft(bag, xs, ring, (i, k) => {
    const n = names[k], x = (xs[i] + xs[i + 1]) / 2;
    if (n === 'under' || n === 'well') return F.under;
    return n !== 'roof' && lines.some((l) => Math.abs(x - l) < 0.006) ? F.gap : d.paint(n, x);
  });
  for (const [e, flip, f] of [[x1, false, d.front], [x0, true, d.rear]]) {
    const P = ring(e).map(([y, z]) => cols.map((c) => [e + bx(e, z * c), y, z * c]));
    skin(bag, P, (k, c) => (names[k] === 'under' ? null : names[k] === 'well' ? F.under : f(names[k] === 'roof' ? 'rail' : names[k], (cols[c] + cols[c + 1]) / 2)), { flip });
  }
  return { half, top, belt, bx, x0, x1 };
}
/** Paths hugging the body at height y, `off` outside it: across one end, and around its corners. */
const across = (B, e, y, off, q = 0.92) => [-q, -q * 0.66, -q * 0.33, 0, q * 0.33, q * 0.66, q].map((c) => { const z = B.half(e) * c; return [e + B.bx(e, z) + Math.sign(e) * off, y, -z]; });
const around = (B, e, y, off, len = 0.5) => {
  const s = Math.sign(e), side = [len, len * 0.5, 0.12].map((q) => { const x = e - s * q, w = B.half(x); return [x + B.bx(x, w), y, w + off]; });
  return [...side, ...across(B, e, y, off), ...side.reverse().map(([x, yy, z]) => [x, yy, -z])];
};
const arcPath = (x, y, z, r, a0 = 0, a1 = PI, n = 6) => Array.from({ length: n + 1 }, (_, k) => { const a = lerp(a0, a1, k / n); return [x + r * Math.cos(a), y + r * Math.sin(a), z]; });
const wheels = (bag, B, axles, r, w, o) => { for (const x of axles) for (const s of [1, -1]) wheel(bag, x, s * (B.half(x) - 0.035 - w / 2), r, w, o); };
/** A round lamp facing along x: bezel and domed lens. */
const lamp = (bag, x, y, z, r, dir, lens, bezel = F.chrome) => revolve(bag, [[-r * 0.9, r * 0.75], [-r * 0.2, r * 1.08], [0, r * 1.08], [0.01, r * 0.92], [r * 0.22, r * 0.6], [r * 0.3, 0]], (i) => (i < 3 ? bezel : lens), at(x, y, z, 0, dir > 0 ? 0 : PI, 0), 12);
const mirrors = (bag, B, x, f, o = 0.09) => { for (const s of [1, -1]) { bag.ball(f, x, B.belt(x) + 0.09, s * (B.half(x) + o), 0.04, 0.055, 0.08); bag.box(f, 0.05, 0.03, o, x + 0.02, B.belt(x) + 0.05, s * (B.half(x) + o * 0.4)); } };
const handles = (bag, B, xs, y, f = F.chrome) => { for (const x of xs) for (const s of [1, -1]) bag.box(f, 0.13, 0.028, 0.03, x, y, s * B.half(x)); };
const within = (x, a, b) => x > a && x < b, LOW = new Set(['s0', 's1', 's2']), LENS = new Set(['0.58', '0.83']);

// ---------- 1980s three-box sedan; with a roof light it is a yellow cab ----------
function sedan(bag, cab) {
  const B = carBody(bag, {
    x0: -2.8, x1: 2.5, T: [0, 0.2, 0.42, 0.5, 0.93, 1], bow: 0.13, tumble: 0.36, cols: [-1, -0.95, -0.72, -0.69, -0.47, -0.44, -0.15, 0.15, 0.44, 0.47, 0.69, 0.72, 0.95, 1],
    top: [[-2.8, 0.9], [-2.7, 0.98], [-1.8, 1.02], [-1.7, 1.03], [-1.12, 1.42], [-0.95, 1.455], [0, 1.47], [0.32, 1.45], [0.45, 1.4], [1.0, 1.03], [1.1, 1.01], [2.2, 0.95], [2.42, 0.9], [2.5, 0.82]],
    belt: [[-2.8, 0.84], [-2.6, 0.93], [-1.7, 0.95], [1.0, 0.94], [2.3, 0.88], [2.5, 0.77]],
    sill: [[-2.8, 0.44], [-2.15, 0.25], [1.95, 0.25], [2.5, 0.38]],
    half: [[-2.8, 0.82], [-2.62, 0.94], [-1.8, 0.975], [1.0, 0.975], [2.15, 0.955], [2.4, 0.92], [2.5, 0.86]],
    arches: [[-1.5, 0.4, 0.33], [1.45, 0.4, 0.33]], lines: [0.97, -0.21, -1.07], cuts: [0.4, 0.86, 1.02, -0.26, -0.16, -1.12, -1.68, 2.36, -2.64],
    paint: (s, x) => (s === 'roof' ? (within(x, 0.4, 1.0) || within(x, -1.68, -1.12) ? F.glass : F.paint)
      : s === 'glass' ? (within(x, -1.12, 0.86) && !within(x, -0.26, -0.16) ? F.glass : F.paint)
      : s === 's2' ? F.black : s === 's3' && x > 2.36 ? F.amber : s === 's3' && x < -2.64 ? F.tail : F.paint),
    front: (s, c) => (s === 's3' ? (Math.abs(c) < 0.44 ? F.grille : LENS.has(Math.abs(c).toFixed(2)) ? F.head : F.chrome) : LOW.has(s) ? F.black : F.paint),
    rear: (s, c) => (s === 's3' ? (Math.abs(c) < 0.44 ? F.paint : LENS.has(Math.abs(c).toFixed(2)) ? F.tail : F.chrome) : LOW.has(s) ? F.black : F.paint),
  });
  wheels(bag, B, [-1.5, 1.45], 0.33, 0.21, { tyre: F.rubber, rim: F.chrome, face: F.alloy, hub: F.chrome, cap: 0.03, capR: 0.5 });
  for (const e of [2.5, -2.8]) sweep(bag, around(B, e, e > 0 ? 0.47 : 0.52, 0.035, 0.42), oval(0.045, 0.075, 6), F.chrome, { sub: 2 });
  for (const y of [0.6, 0.65, 0.7]) sweep(bag, across(B, 2.5, y, 0.004, 0.42), oval(0.012, 0.012, 4), F.chrome, { sub: 1 });
  mirrors(bag, B, 0.88, F.chrome, 0.07); handles(bag, B, [0.02, -0.98], 0.86);
  bag.box(F.plate, 0.02, 0.13, 0.32, -2.8, 0.7, 0);
  if (cab) { bag.box(F.sign, 0.14, 0.13, 0.46, -0.3, 1.545, 0); bag.box(F.black, 0.2, 0.03, 0.52, -0.3, 1.475, 0); }
}

// ---------- 1950s sedan: tall rounded body, chrome everywhere, whitewall tyres ----------
function fifties(bag) {
  const B = carBody(bag, {
    x0: -2.55, x1: 2.45, T: [0, 0.3, 0.5, 0.56, 0.9, 1], bow: 0.22, tumble: 0.4, tuck: 0.07,
    top: [[-2.55, 0.8], [-2.45, 0.9], [-2.1, 1.02], [-1.6, 1.13], [-1.25, 1.3], [-0.8, 1.55], [-0.2, 1.62], [0.3, 1.58], [0.5, 1.48], [0.86, 1.16], [1.0, 1.12], [1.9, 1.07], [2.3, 0.99], [2.45, 0.88]],
    belt: [[-2.55, 0.72], [-2.3, 0.88], [-1.5, 1.0], [0.8, 1.03], [2.0, 0.98], [2.45, 0.82]],
    sill: [[-2.55, 0.46], [-2.0, 0.3], [1.9, 0.3], [2.45, 0.42]],
    half: [[-2.55, 0.66], [-2.4, 0.84], [-1.6, 0.93], [0, 0.94], [1.9, 0.92], [2.3, 0.86], [2.45, 0.74]],
    crown: [[-2.5, 0.05], [-1.2, 0.07], [0.3, 0.07], [0.9, 0.1], [2.2, 0.09], [2.45, 0.05]],
    arches: [[-1.45, 0.4, 0.3], [1.47, 0.43, 0.355]], lines: [0.8, -0.14, -1.0], cuts: [0.38, 0.72, 0.84, -0.19, -0.09, -0.95, -1.22, -0.8, 1.9, -1.9],
    paint: (s, x) => (s === 'roof' ? (within(x, 0.38, 0.84) || within(x, -1.22, -0.8) ? F.glass : F.paint)
      : s === 'glass' ? (within(x, -0.95, 0.72) && !within(x, -0.19, -0.09) ? F.glass : F.paint)
      : s === 's2' && within(x, -1.9, 1.9) ? F.chrome : F.paint),
    front: (s, c) => ((s === 's1' || s === 's2' || s === 's3') && Math.abs(c) < 0.6 ? F.grille : F.paint),
    rear: () => F.paint,
  });
  wheels(bag, B, [-1.45, 1.47], 0.355, 0.19, { tyre: F.rubber, wall: F.wall, rim: F.paint, face: F.paint, hub: F.chrome, cap: 0.05, capR: 0.62, rimR: 0.58 });
  for (const e of [2.45, -2.55]) {
    sweep(bag, around(B, e, 0.5, 0.05, 0.45), oval(0.05, 0.07, 6), F.chrome, { sub: 2 });
    for (const s of [1, -1]) bag.ball(F.chrome, e + Math.sign(e) * 0.08, 0.53, s * 0.36, 0.05, 0.12, 0.05);
  }
  for (const y of [0.64, 0.72, 0.8]) sweep(bag, across(B, 2.45, y, 0.012, 0.66), oval(0.022, 0.022, 5), F.chrome, { sub: 2 });
  for (const s of [1, -1]) {
    lamp(bag, 2.45 + B.bx(2.45, 0.6) - 0.01, 0.86, s * 0.6, 0.1, 1, F.head);
    lamp(bag, -2.55 + B.bx(-2.55, 0.56) + 0.01, 0.8, s * 0.56, 0.055, -1, F.tail);
  }
  bag.ball(F.chrome, 2.2, B.top(2.2) + 0.02, 0, 0.16, 0.025, 0.03);
  handles(bag, B, [0.0, -0.86], 0.93); bag.box(F.plate, 0.02, 0.13, 0.3, -2.56, 0.72, 0);
}

// ---------- 2010s crossover ----------
function suv(bag) {
  const B = carBody(bag, {
    x0: -2.3, x1: 2.3, T: [0, 0.2, 0.45, 0.7, 0.9, 1], bow: 0.2, tumble: 0.3, cols: [-1, -0.94, -0.8, -0.7, -0.45, -0.2, 0, 0.2, 0.45, 0.7, 0.8, 0.94, 1],
    top: [[-2.3, 1.02], [-2.26, 1.14], [-1.92, 1.62], [-1.8, 1.665], [-0.5, 1.69], [0.15, 1.65], [0.3, 1.6], [1.02, 1.15], [1.15, 1.12], [1.9, 1.04], [2.2, 0.98], [2.3, 0.9]],
    belt: [[-2.3, 0.98], [-2.1, 1.1], [-1.0, 1.07], [0.9, 1.01], [1.9, 0.95], [2.3, 0.85]],
    sill: [[-2.3, 0.46], [-1.85, 0.3], [1.8, 0.3], [2.3, 0.38]],
    half: [[-2.3, 0.78], [-2.15, 0.89], [-1.4, 0.925], [1.3, 0.925], [2.0, 0.9], [2.2, 0.85], [2.3, 0.76]],
    arches: [[-1.36, 0.42, 0.36], [1.32, 0.42, 0.36]], lines: [0.9, -0.2, -0.93], cuts: [0.26, 0.84, 1.02, -0.25, -0.15, -1.0, -1.08, -1.88, -2.24, 2.16, -2.14],
    paint: (s, x) => (s === 'roof' ? (within(x, 0.26, 1.0) || within(x, -2.24, -1.94) ? F.glass : F.paint)
      : s === 'glass' ? (!within(x, -1.88, 0.84) ? F.paint : within(x, -0.25, -0.15) || within(x, -1.08, -1.0) ? F.gloss : F.glass)
      : s === 's0' ? F.black : s === 's4' && x > 2.16 ? F.led : s >= 's3' && x < -2.14 ? F.tail : F.paint),
    front: (s, c) => (s === 's0' ? F.black : s === 's4' ? (Math.abs(c) > 0.45 ? F.led : F.gloss) : s === 's3' && Math.abs(c) < 0.45 ? F.grille : s === 's1' ? (Math.abs(c) < 0.45 ? F.grille : Math.abs(c) > 0.8 && Math.abs(c) < 0.94 ? F.head : F.black) : F.paint),
    rear: (s, c) => (s === 's0' ? F.black : (s === 's3' || s === 's4') && Math.abs(c) > 0.45 ? F.tail : s === 's1' && Math.abs(c) > 0.8 && Math.abs(c) < 0.94 ? F.amber : F.paint),
  });
  wheels(bag, B, [-1.36, 1.32], 0.36, 0.235, { tyre: F.rubber, rim: F.alloy, face: F.alloy, dark: F.under, hub: F.alloy, spokes: 5, rimR: 0.68, capR: 0.22 });
  for (const x of [-1.36, 1.32]) for (const s of [1, -1]) sweep(bag, arcPath(x, 0.36, s * (B.half(x) - 0.012), 0.43, -0.25, PI + 0.25), oval(0.035, 0.03, 5), F.black, { ref: [0, 0, 1], sub: 2, caps: false });
  for (const s of [1, -1]) sweep(bag, [[-1.7, 1.675, s * 0.6], [-1.6, 1.71, s * 0.6], [-0.6, 1.73, s * 0.61], [0.05, 1.7, s * 0.6], [0.15, 1.665, s * 0.6]], oval(0.02, 0.018, 5), F.alloy, { sub: 2 });
  mirrors(bag, B, 0.86, F.paint, 0.1); handles(bag, B, [0.05, -0.85], 0.98, F.paint);
  bag.box(F.plate, 0.02, 0.12, 0.32, -2.31, 0.86, 0);
}

// ---------- self-driving pod: one smooth volume under a glass canopy ----------
function pod(bag) {
  const B = carBody(bag, {
    x0: -2.1, x1: 2.1, T: [0, 0.4, 0.66, 0.76, 1], bow: 0, tumble: 0.42, tuck: 0.09, step: 0.2,
    top: [[-2.1, 0.86], [-1.95, 1.12], [-1.5, 1.48], [-0.7, 1.68], [0.2, 1.68], [1.1, 1.46], [1.75, 1.1], [2.1, 0.84]],
    belt: [[-2.1, 0.76], [-1.8, 0.88], [1.7, 0.86], [2.1, 0.74]],
    sill: [[-2.1, 0.36], [-1.7, 0.2], [1.7, 0.2], [2.1, 0.36]],
    half: [[-2.1, 0.27], [-2.06, 0.37], [-2.0, 0.46], [-1.9, 0.58], [-1.7, 0.74], [-1.4, 0.87], [-1.0, 0.93], [1.0, 0.93], [1.4, 0.87], [1.7, 0.74], [1.9, 0.58], [2.0, 0.46], [2.06, 0.37], [2.1, 0.27]],
    crown: 0.06, arches: [[-1.32, 0.35, 0.3], [1.32, 0.35, 0.3]], lines: [0.62, -0.62], cuts: [-1.72, 1.72, -0.5, 0.2, 1.8, -1.8],
    paint: (s, x) => (s === 'roof' ? (within(x, -1.72, 1.72) && !within(x, -0.5, 0.2) ? F.glass : F.paint)
      : s === 'glass' ? (within(x, -1.72, 1.72) ? F.glass : F.paint)
      : s === 's2' && x > 1.8 ? F.led : s === 's2' && x < -1.8 ? F.tail : F.paint),
    front: (s) => (s === 's2' ? F.led : s === 's0' ? F.gloss : F.paint),
    rear: (s) => (s === 's2' ? F.tail : s === 's0' ? F.gloss : F.paint),
  });
  wheels(bag, B, [-1.32, 1.32], 0.3, 0.2, { tyre: F.rubber, rim: F.white, face: F.white, hub: F.led, rimR: 0.8, capR: 0.12, cap: 0.012 });
  revolve(bag, [[0, 0.16], [0.05, 0.15], [0.09, 0.1], [0.1, 0]], (i) => (i === 0 ? F.gloss : F.black), at(-0.15, B.top(-0.15) - 0.01, 0, 0, 0, PI / 2), 12);
}

// ---------- 1900s–1930s car: upright cabin, separate wings and running boards, exposed radiator ----------
function vintage(bag) {
  const B = carBody(bag, {
    x0: -1.62, x1: 1.45, T: [0, 0.86, 0.94, 1], bow: 0.03, tumble: 0.08, tuck: 0.02, cols: [-1, -0.8, -0.5, 0, 0.5, 0.8, 1],
    top: [[-1.62, 1.6], [-1.56, 1.76], [-0.6, 1.83], [0.4, 1.8], [0.5, 1.76], [0.53, 1.27], [0.62, 1.22], [1.4, 1.16], [1.45, 1.13]],
    belt: [[-1.62, 1.2], [0.5, 1.2], [0.62, 1.1], [1.45, 1.05]],
    sill: [[-1.62, 0.5], [0.45, 0.5], [0.62, 0.6], [1.45, 0.62]],
    half: [[-1.62, 0.6], [-1.5, 0.68], [0.4, 0.68], [0.62, 0.52], [1.4, 0.4], [1.45, 0.38]],
    crown: [[-1.6, 0.04], [0.5, 0.04], [0.62, 0.08], [1.45, 0.07]],
    lines: [0.44, -0.46], cuts: [-1.46, -0.52, -0.4, 0.38, 0.5, 0.53, 0.62, 1.38],
    paint: (s, x) => (s === 'roof' ? (within(x, 0.5, 0.53) ? F.glass : x < 0.5 ? F.top : F.paint)
      : s === 'glass' ? (within(x, -1.46, 0.38) && !within(x, -0.52, -0.4) ? F.glass : F.paint)
      : s === 's1' && x < 0.5 ? F.gap : x > 1.38 ? F.chrome : F.paint),
    front: (s, c) => (s >= 's0' && s <= 's2' && Math.abs(c) < 0.8 ? F.grille : F.chrome),
    rear: (s, c) => (s === 'glass' && Math.abs(c) < 0.5 ? F.glass : F.paint),
  });
  const wing = [[-0.016, -0.15], [0.012, -0.11], [0.02, 0], [0.012, 0.11], [-0.016, 0.15], [-0.03, 0.11], [-0.022, 0], [-0.03, -0.11]];
  for (const s of [1, -1]) {
    sweep(bag, [[1.8, 0.52, s * 0.72], [1.62, 0.78, s * 0.72], [1.3, 0.87, s * 0.72], [0.98, 0.76, s * 0.72], [0.72, 0.48, s * 0.72], [0.45, 0.37, s * 0.72], [-0.7, 0.37, s * 0.72], [-0.93, 0.62, s * 0.72], [-1.3, 0.87, s * 0.72], [-1.66, 0.74, s * 0.72], [-1.84, 0.5, s * 0.72]], wing, F.gloss, { ref: [0, 0, 1], sub: 3 });
    for (const x of [1.3, -1.31]) spokedWheel(bag, x, s * 0.72, 0.38, 0.1, 12, { tyre: F.rubber, rim: F.straw, hub: F.chrome, hubR: 0.07, spokeR: 0.016 });
    lamp(bag, 1.42, 0.98, s * 0.47, 0.105, 1, F.head, F.chrome);
    bag.box(F.gloss, 2.9, 0.1, 0.06, -0.1, 0.44, s * 0.36);
    bag.box(F.chrome, 0.12, 0.025, 0.03, 0.3, 1.08, s * 0.685); bag.box(F.chrome, 0.12, 0.025, 0.03, -0.6, 1.08, s * 0.685);
  }
  for (const x of [1.3, -1.31]) bag.rod(F.gloss, [x, 0.38, -0.7], [x, 0.38, 0.7], 0.035, 6);
  bag.rod(F.chrome, [1.42, 0.98, -0.47], [1.42, 0.98, 0.47], 0.015, 5);
  for (const [x, d] of [[1.86, 1], [-1.9, -1]]) for (const y of [0.5, 0.58]) sweep(bag, [[x - d * 0.12, y, 0.82], [x, y, 0.7], [x + d * 0.02, y, 0], [x, y, -0.7], [x - d * 0.12, y, -0.82]], oval(0.012, 0.022, 5), F.chrome, { sub: 2 });
  bag.box(F.top, 0.2, 0.025, 1.2, 0.6, 1.735, 0, 0, 0, -0.3);
  revolve(bag, [[-0.06, 0.2], [-0.06, 0.34], [-0.03, 0.375], [0.03, 0.375], [0.06, 0.34], [0.06, 0.2]], F.rubber, at(-1.74, 0.95, 0), 16); revolve(bag, [[-0.03, 0], [-0.04, 0.2], [0.06, 0.2]], F.straw, at(-1.76, 0.95, 0, 0, PI, 0), 12);
  bag.ball(F.chrome, 1.43, B.top(1.43) + 0.03, 0, 0.03);
}

const STYLES = { sedan, cab: (b) => sedan(b, true), fifties, suv, pod, old: vintage };
/** style: 'old' (1900s–30s) | 'fifties' | 'sedan' (default, 1980s) | 'cab' | 'suv' | 'pod'. One part; only the paintwork takes the instance tint. */
export function carParts(style = 'sedan') {
  const bag = new Bag(); STYLES[style](bag);
  return [{ geo: bag.geo(), mat: vehicleMat() }];
}
