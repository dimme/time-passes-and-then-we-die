// Ships on the two rivers: a 17th-century three-master, an ocean liner and a container ship. Waterline at y = 0, bow towards +x.
import { rng, lerp, smooth, clamp } from './util.js';
import { Bag, fin, curve, loft, skin, revolve, vehicleMat, at } from './vehicles-kit.js';

const PI = Math.PI;
const S = {
  oak: fin(0x6e4c2c, 0.85), wale: fin(0x2c1e12, 0.85), tallow: fin(0xcfc6aa, 0.9), ochre: fin(0xc0902c, 0.75), green: fin(0x2f4a36, 0.8), red: fin(0x8a2418, 0.8),
  deck: fin(0x8f7248, 0.9), spar: fin(0x7a5830, 0.8), canvas: fin(0xe9e0c8, 0.95), canvas2: fin(0xdcd2b6, 0.95), rope: fin(0x2a2218, 0.9), glass: fin(0x1c2830, 0.08, 1),
  lamp: fin(0xffc860, 0.4, 0, 2.5), black: fin(0x16171a, 0.6), boot: fin(0x7c1c14, 0.7), white: fin(0xf0eee8, 0.55), teak: fin(0xb39566, 0.85), funnel: fin(0xc8421c, 0.6),
  steel: fin(0x8a8e92, 0.5, 0.6), navy: fin(0x1e3350, 0.6), deckGreen: fin(0x3c5a48, 0.8), orange: fin(0xe07a1c, 0.7), blue: fin(0x2c4a9a, 0.7), lit: fin(0xffe2a0, 0.4, 0, 1.2),
};
const BOXES = [0x2a6a9a, 0xb0542a, 0x3a8a4a, 0xc8a83a, 0x8a8a8a, 0x7a2a22, 0x1c3c6a, 0xd8d4c8, 0x9a3a2a, 0x2e7a80].map((c) => fin(c, 0.7, 0.2));

/**
 * Loft a hull with its deck. d = { xs, keel, y1 (height of greatest beam), beam (half-beam), full (2 = round bilge, higher
 * = boxier, towards 1 = V), deck, flare (metres the topsides lean out at the rail): curves over x; bulwark, levels (heights
 * of the plating strips up to y1), tops (fractions from y1 to the rail), rake(x, y) → how far the ends lean,
 * paint(strip, x) with strips 'h0'… below y1, 't0'… above, 'rail', 'bul', 'deck' }.
 */
function hull(bag, d) {
  const beam = curve(d.beam), full = curve(d.full), deck = curve(d.deck), flare = curve(d.flare ?? 0), { keel, y1, levels, tops, bulwark = 1, thick = 0.25 } = d;
  const side = (x, y) => (y <= y1 ? beam(x) * (1 - ((y1 - y) / (y1 - keel)) ** full(x)) ** (1 / full(x)) : beam(x) + flare(x) * ((y - y1) / (deck(x) + bulwark - y1)) ** 1.5);
  const names = [...levels.slice(1).map((_, k) => 'h' + k), ...tops.map((_, k) => 't' + k), 'rail', 'bul', 'deck'];
  loft(bag, d.xs, (x) => {
    const yd = deck(x), yr = yd + bulwark, pts = levels.map((y) => [y, side(x, y)]);
    for (const f of tops) pts.push([lerp(y1, yr, f), side(x, lerp(y1, yr, f))]);
    const zr = side(x, yr); pts.push([yr, Math.max(0, zr - thick)], [yd, Math.max(0, zr - thick - 0.05)], [yd + Math.min(0.15, zr * 0.03), 0]);
    for (const p of pts) p.push(d.rake(x, p[0]));
    return pts;
  }, (i, k) => d.paint(names[k], (d.xs[i] + d.xs[i + 1]) / 2), { caps: d.caps, crease: 0.6 });
  return { side, deck, at: (x, y) => [x + d.rake(x, y), y, side(x, y)] };
}
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => lerp(a, b, k / n));
/** A deckhouse: rounded-off block from x0 to x1 with a band of windows. */
function house(bag, x0, x1, y0, y1, hw, { round = 1.5, win = [0.45, 0.8], pitch = 2.2, wall = S.white, roof = S.teak, glass = S.glass } = {}) {
  const xs = range(x0, x1, Math.max(4, Math.round((x1 - x0) / pitch)));
  const w = (x) => hw - round * (1 - Math.sqrt(Math.max(0, 1 - (Math.max(0, x - (x1 - round), x0 + round - x) / round) ** 2)));
  loft(bag, [x0, x0 + round * 0.12, x0 + round * 0.4, ...xs.filter((x) => x > x0 + round * 0.7 && x < x1 - round * 0.7), x1 - round * 0.4, x1 - round * 0.12, x1].sort((a, b) => a - b),
    (x) => [[y0, 0], [y0, w(x)], [lerp(y0, y1, win[0]), w(x)], [lerp(y0, y1, win[1]), w(x)], [y1, w(x)], [y1 + 0.02, w(x) * 0.9], [y1 + 0.1, 0]],
    (i, k) => (k === 0 ? null : k === 2 ? (i % 2 ? glass : wall) : k >= 4 ? roof : wall), { caps: [wall, wall], crease: 0.5 });
}
/** A raked funnel or mast standing on (x, y): [height, radius] profile, f(i) finishes. */
const stack = (bag, x, y, prof, f, rake = 0, sx = 1, seg = 12, z = 0) => revolve(bag, prof, f, at(x, y, z, 0, 0, PI / 2 + rake, 1, sx, 1), seg);
const line = (bag, a, b, r = 0.04, f = S.rope) => bag.rod(f, a, b, r, 3);
/** A flag flying aft from (x, y): stripes top to bottom. */
function flag(bag, x, y, l, h, stripes) {
  const P = range(0, 1, stripes.length).map((v) => range(0, 1, 6).map((u) => [x - u * l, y - v * h - u * u * h * 0.25, Math.sin(u * 7) * l * 0.08 * u]));
  skin(bag, P, (i) => stripes[i], { both: true, crease: -1 });
}

// ---------- 17th-century ship: high stern, three masts, square sails and a lateen mizzen ----------
function sailShip(bag) {
  const H = hull(bag, {
    xs: [-13, -12.6, ...range(-12, 8, 20), -8.62, -8.38, -3.12, -2.88, 6.28, 6.52, 8.8, 9.6, 10.4, 11.1, 11.7, 12.2, 12.6, 12.9, 13].sort((a, b) => a - b), keel: -2.6, y1: 1.3, bulwark: 1,
    beam: [[-13, 2.3], [-10, 2.95], [-4, 3.3], [3, 3.3], [8, 2.8], [11, 1.7], [12.4, 0.7], [13, 0.14]],
    full: [[-13, 1.15], [-9, 1.7], [-3, 2.6], [4, 2.6], [10, 1.6], [13, 1.2]],
    deck: [[-13, 5.5], [-8.62, 5.1], [-8.38, 4.0], [-3.12, 3.8], [-2.88, 2.5], [6.28, 2.4], [6.52, 3.7], [11.5, 4.0], [13, 4.3]],
    flare: [[-13, -0.5], [0, -0.6], [9, -0.3], [13, 0]],
    levels: [-2.6, -2.5, -2.1, -1.4, -0.6, 0.25, 0.9, 1.3], tops: [0.3, 0.62, 0.8, 1],
    rake: (x, y) => smooth((x - 8) / 5) * 2.4 * ((y + 2.6) / 7) ** 1.4 - smooth((-9 - x) / 4) * 1.1 * clamp((y + 0.5) / 6, 0, 1),
    paint: (s, x) => (s === 'deck' ? S.deck : s === 'bul' ? S.oak : s < 'h5' ? S.tallow : s === 'h6' || s === 't1' ? S.wale : s === 't3' || s === 'rail' ? (x < -3 || x > 6.4 ? S.ochre : S.wale) : s === 't2' && (x < -3 || x > 6.4) ? S.green : S.oak),
    caps: [S.oak, null],
  });
  // stern: windows, lantern, rudder, ensign
  const sx = -13 - 1.1;
  bag.box(S.ochre, 0.12, 1.3, 3.6, sx + 0.05, 4.2, 0, 0, 0, 0.18); bag.box(S.glass, 0.14, 0.7, 3.0, sx + 0.03, 4.25, 0, 0, 0, 0.18);
  for (const z of [-1.0, 0, 1.0]) bag.box(S.ochre, 0.16, 0.74, 0.12, sx + 0.03, 4.25, z, 0, 0, 0.18);
  bag.box(S.wale, 0.25, 4.6, 0.12, -13.25, -0.4, 0, 0, 0, 0.1);
  line(bag, [sx - 0.1, 6.4, 0], [sx - 0.5, 8.2, 0], 0.05, S.spar); bag.ball(S.lamp, sx - 0.45, 7.7, 0.0, 0.22, 0.3, 0.22);
  line(bag, [sx, 6.5, 0.9], [sx - 0.7, 10.5, 0.9], 0.05, S.spar); flag(bag, sx - 0.7, 10.4, 3.2, 2.1, [S.orange, S.white, S.blue]);
  // gunports, hatch, capstan, ship's bell
  for (const s of [1, -1]) for (const x of [-6.5, -4.5, -1, 1, 3, 5]) { const p = H.at(x, 2.25); bag.box(S.red, 0.55, 0.5, 0.06, p[0], p[1], s * (p[2] + 0.01), s * 0.12); }
  bag.box(S.wale, 3, 0.25, 1.8, 3.2, 2.62, 0); bag.cyl(S.spar, 0.3, 0.38, 0.9, -1.2, 2.95, 0, 8); bag.box(S.wale, 1.8, 0.3, 1.4, -5.6, 4.0, 0);
  // masts, yards and sails
  const mast = (x, y0, top, r) => { stack(bag, x, y0, [[0, r], [top * 0.6, r * 0.8], [top * 0.6, r * 1.9], [top * 0.6 + 0.12, r * 1.9], [top * 0.6 + 0.12, r * 0.55], [top, r * 0.3], [top, 0]], S.spar, -0.02, 1, 7); };
  const yard = (x, y, w, r = 0.13) => { bag.rod(S.spar, [x, y, 0], [x, y, w / 2], r, 5, r * 0.5); bag.rod(S.spar, [x, y, 0], [x, y, -w / 2], r, 5, r * 0.5); };
  const sail = (x, yt, yb, wt, wb, belly) => {
    const P = range(-1, 1, 8).map((u) => range(0, 1, 6).map((v) => [x + belly * ((1 - u * u) ** 0.7 * Math.sin(PI * (0.06 + 0.86 * v)) ** 0.8 + 0.35 * v), lerp(yt, yb, v) + 0.07 * (yt - yb) * (1 - u * u) * v * v, u * lerp(wt, wb, v) / 2]));
    skin(bag, P, (i) => (i % 2 ? S.canvas : S.canvas2), { both: true, crease: -1 });
  };
  for (const [x, y0, top, k] of [[0.3, 2.4, 25, 1], [7.4, 3.8, 20, 0.84]]) {
    const yl = y0 + top * 0.45, yt = y0 + top * 0.9, ym = y0 + top * 0.6;
    mast(x, y0, top, 0.3 * k); yard(x + 0.35, yl, 11.6 * k); yard(x + 0.3, yt, 6.6 * k, 0.1);
    sail(x + 0.4, yl - 0.1, y0 + 2.2, 11 * k, 11.4 * k, 1.5 * k); sail(x + 0.35, yt - 0.1, yl + 0.5, 6.2 * k, 10.6 * k, 1.1 * k);
    for (const s of [1, -1]) {
      for (let q = 0; q < 4; q++) { const p = H.at(x - 0.3 - q * 0.55, H.deck(x) + 1); line(bag, [x, ym, s * 0.25], [p[0], p[1], s * p[2]]); }
      line(bag, [x - 0.1, y0 + top - 0.5, 0], [x - 3.2, H.deck(x - 3.2) + 1, s * H.side(x - 3.2, H.deck(x - 3.2) + 1)], 0.03);
      line(bag, [x + 0.35, yl, s * 5.8 * k], [x - 5.5, H.deck(x - 5.5) + 1, s * 2.8], 0.025); line(bag, [x + 0.5, y0 + 2.4, s * 5.6 * k], [x - 4, H.deck(x - 4) + 1, s * 3], 0.025);
    }
    flag(bag, x, y0 + top + 0.9, 2.6 * k, 0.5, [S.red]); line(bag, [x, y0 + top - 0.2, 0], [x, y0 + top + 1, 0], 0.04, S.spar);
  }
  line(bag, [0.3, 17.4, 0], [7.4, 4.9, 0]); line(bag, [0.3, 27, 0], [7.4, 15.8, 0], 0.03); line(bag, [7.4, 15.8, 0], [17.5, 7.6, 0]); line(bag, [7.4, 23.4, 0], [19, 8.3, 0], 0.03);
  // bowsprit, beakhead and spritsail
  bag.rod(S.spar, [11.2, 4.6, 0], [19.2, 8.4, 0], 0.22, 6, 0.1); yard(16.6, 6.6, 6, 0.09); sail(16.7, 6.5, 3.6, 5.6, 5.8, 0.6);
  bag.box(S.ochre, 3.2, 0.25, 0.5, 14.6, 4.1, 0, 0, 0, 0.3); for (const s of [1, -1]) line(bag, [13, 4.6, s * 0.5], [16.2, 5.3, 0], 0.07, S.oak);
  // mizzen with its lateen sail
  mast(-8.3, 5.1, 14, 0.2); bag.rod(S.spar, [-3.6, 9.2, 0.3], [-12.6, 19, 0.3], 0.11, 5, 0.06);
  const L = range(0, 1, 6).map((u) => range(0, 1, 5).map((v) => { const a = [lerp(-3.9, -12.3, u), lerp(9.4, 18.6, u)], b = [lerp(-8.3, -13.6, u), 7.2 + u * 0.3]; return [lerp(a[0], b[0], v), lerp(a[1], b[1], v), 0.35 + Math.sin(PI * u) * Math.sin(PI * v) * 0.9]; }));
  skin(bag, L, (i) => (i % 2 ? S.canvas : S.canvas2), { both: true, crease: -1 });
  for (const s of [1, -1]) for (let q = 0; q < 3; q++) { const p = H.at(-8.6 - q * 0.5, 6.1); line(bag, [-8.3, 13.5, s * 0.2], [p[0], p[1], s * p[2]]); }
  line(bag, [-8.3, 19.1, 0], [0.3, 17.4, 0], 0.03);
}

// ---------- ocean liner, c. 1910 ----------
function liner(bag) {
  const H = hull(bag, {
    xs: [-55, -54.6, -53.8, -52.5, ...range(-50, 42.5, 37), 45, 47.5, 49.5, 51.2, 52.6, 53.7, 54.5, 55], keel: -4.5, y1: 2, bulwark: 1.0, thick: 0.3,
    beam: [[-55, 0.3], [-53.5, 2.4], [-49, 4.9], [-40, 6.5], [-26, 7], [20, 7], [34, 6.2], [44, 4.1], [50.5, 1.9], [54.4, 0.25], [55, 0.12]],
    full: [[-55, 1.3], [-45, 1.8], [-28, 4.5], [22, 4.5], [42, 1.9], [55, 1.3]],
    deck: [[-55, 8.4], [-30, 7.3], [8, 7.0], [38, 8.0], [55, 10.2]],
    levels: [-4.5, -4.3, -3.4, -2, -0.7, 0.55, 2], tops: [0.5, 0.82, 1],
    rake: (x, y) => smooth((x - 44) / 11) * 2.2 * ((y + 4.5) / 14) - smooth((-44 - x) / 11) * 4.5 * clamp((y - 0.5) / 8, 0, 1) ** 0.7,
    paint: (s, x) => (s === 'deck' ? S.teak : s === 'bul' ? S.white : s < 'h5' ? S.boot : (s === 't2' || s === 'rail') && x > -42 && x < 36 ? S.white : S.black),
  });
  house(bag, -37, 31, 7.0, 9.7, 6.3, { round: 3 }); house(bag, -33, 27, 9.7, 12.2, 5.6, { round: 2.5, win: [0.35, 0.75] });
  house(bag, -25, 17, 12.2, 14.3, 3.6, { round: 1.5, pitch: 3, roof: S.white }); house(bag, 19.5, 26.5, 12.2, 14.9, 5.2, { round: 1.2, win: [0.5, 0.86], pitch: 1.2, roof: S.white });
  bag.box(S.white, 2.2, 0.25, 15.5, 23, 14.75, 0);
  for (const x of [11, -3, -17]) {
    stack(bag, x, 13.5, [[0, 2.05], [8.2, 2.0], [8.2, 2.02], [10.8, 2.0], [10.8, 1.75], [9.5, 1.7]], (i) => (i < 1 ? S.funnel : S.black), 0.14, 1.3, 14);
    for (const s of [1, -1]) line(bag, [x - 1.2, 21.5, s * 1.2], [x - 5, 14.3, s * 3.4], 0.03);
  }
  // lifeboats under their davits along the boat deck
  for (const s of [1, -1]) for (let k = 0; k < 9; k++) {
    const x = -29 + k * 6.3;
    loft(bag, range(x - 3.6, x + 3.6, 6), (xx) => { const t = Math.max(0, 1 - ((xx - x) / 3.6) ** 2), w = 1.1 * t ** 0.5; return [[13.0 - 0.9 * t ** 0.6, s * 5.9], [13.2 - 0.5 * t, s * 5.9 + w * 0.8], [13.9, s * 5.9 + w], [14.0, s * 5.9], [13.9, s * 5.9 - w], [13.2 - 0.5 * t, s * 5.9 - w * 0.8]]; }, (i, j) => (j === 2 || j === 3 ? S.oak : S.white), { full: true, crease: 0.3 });
    for (const dx of [-2.6, 2.6]) { line(bag, [x + dx, 12.2, s * 5.2], [x + dx, 14.6, s * 5.4], 0.07, S.white); line(bag, [x + dx, 14.6, s * 5.4], [x + dx, 14.5, s * 6], 0.07, S.white); }
  }
  // masts with their stays, crow's nest, flags
  for (const [x, y] of [[41, 8.2], [-43, 7.6]]) {
    stack(bag, x, y, [[0, 0.42], [16, 0.3], [27, 0.12], [27, 0]], S.ochre, 0.1, 1, 7);
    const top = [x - 2.2, y + 21.8, 0];
    for (const s of [1, -1]) { for (const q of [-1.5, 0.5]) { const p = H.at(x + q - 1, H.deck(x) + 1); line(bag, top, [p[0], p[1], s * p[2]], 0.035); } }
    line(bag, top, [x > 0 ? 54 : -20, x > 0 ? 11.3 : 22.5, 0], 0.035); line(bag, top, [x > 0 ? 13.5 : -57, x > 0 ? 24 : 9.6, 0], 0.035);
  }
  stack(bag, 39.4, 19, [[0, 0.5], [0, 0.7], [1.2, 0.75], [1.2, 0.5]], S.white, 0, 1, 8);
  line(bag, [-58.2, 9.4, 0], [-59, 13, 0], 0.06, S.white); flag(bag, -59, 12.9, 3.6, 2.2, [S.red]); flag(bag, 38.4, 35, 2.6, 1.4, [S.blue]);
  for (const [x, z] of [[33, 2.4], [33, -2.4], [-39, 2], [-39, -2], [5, 3], [-10, -3], [-22, 3]]) stack(bag, x, x > -30 && x < 30 ? 14.3 : H.deck(x), [[0, 0.35], [1.6, 0.35], [2.1, 0.6], [2.1, 0]], (i) => (i === 2 ? S.red : S.white), 0, 1, 7, z);
  bag.box(S.teak, 6, 0.5, 4, 37, 8.4, 0); bag.box(S.teak, 7, 0.5, 4.5, -44, 8.1, 0);
}

// ---------- container ship ----------
function boxShip(bag) {
  const r = rng(51);
  const H = hull(bag, {
    xs: [...range(-75, 45, 30), 47, 49, 51, 54, 58, 62, 66, 69, 71.5, 73.4, 74.6, 75], keel: -6, y1: 1.5, bulwark: 1.1, thick: 0.4,
    beam: [[-75, 9.6], [-70, 11], [-56, 11.5], [36, 11.5], [50, 10.3], [62, 6.6], [70, 2.7], [74.4, 0.3], [75, 0.15]],
    full: [[-75, 1.4], [-62, 2.6], [-42, 7], [30, 7], [56, 2.6], [75, 1.4]],
    deck: [[-75, 8.6], [47, 8.6], [49, 11], [75, 12]],
    flare: [[36, 0], [58, 2.2], [70, 2.8], [75, 1.6]],
    levels: [-6, -5.8, -5, -3, -1.2, 0.3, 1.5], tops: [0.4, 0.8, 1],
    rake: (x, y) => smooth((x - 52) / 23) * 7.5 * Math.max(0, y / 13) ** 1.2,
    paint: (s) => (s === 'deck' ? S.deckGreen : s === 'bul' ? S.navy : s < 'h5' ? S.boot : S.navy),
    caps: [S.navy, null],
  });
  bag.ball(S.boot, 75.5, -2.6, 0, 5.5, 2.6, 2.2);
  // accommodation block: seven decks with ribbon windows, bridge wings, funnel and radar mast
  for (let k = 0; k < 7; k++) {
    const y = 8.6 + k * 2.8, top = k === 6, w = top ? 23.4 : 19 - (k > 4 ? 2 : 0), l = top ? 9 : 12;
    bag.box(S.white, l, 2.8, w, top ? -50.5 : -52, y + 1.4, 0); bag.box(S.glass, l + 0.06, top ? 1.1 : 0.55, w + 0.06 - (top ? 5 : 0), top ? -50.5 : -52, y + 1.75, 0);
  }
  bag.box(S.white, 4, 1.2, 4, -50.5, 28.8, 0); stack(bag, -50.5, 29.4, [[0, 0.3], [6, 0.15], [6, 0]], S.white, 0, 1, 6); bag.box(S.white, 0.3, 0.3, 5, -50.5, 32.5, 0);
  stack(bag, -61.5, 8.6, [[0, 2.4], [15, 2.2], [15, 2.25], [17, 2.2], [19, 2.1], [19, 1.8], [18, 1.7]], (i) => (i === 0 ? S.navy : i < 3 ? S.orange : S.black), 0.03, 1.5, 12);
  bag.box(S.orange, 9, 3.2, 3.2, -69, 10.3, 7, 0, 0, -0.3); bag.box(S.orange, 2, 1.4, 3.2, -69, 10.6, -7);
  // containers: bays of forty-footers stacked on the hatch covers
  for (let b = 0; b < 8; b++) {
    const x = -37.6 + b * 13.1, rows = Math.min(9, Math.floor((H.side(x + 6.2, 9) - 0.6) / 1.22) * 2), base = x > 47 ? 12.2 : 9.3;
    bag.box(S.steel, 12.4, 0.7, rows * 2.5 + 0.4, x, base - 0.35, 0);
    for (let k = 0; k < rows; k++) {
      const n = Math.max(1, Math.round((b === 0 || b === 7 ? 3 : 4.2) + r() * 1.6 - Math.abs(k - (rows - 1) / 2) * 0.12));
      for (let t = 0; t < n; t++) {
        const f = BOXES[Math.floor(r() * BOXES.length)], z = (k - (rows - 1) / 2) * 2.5;
        if (r() < 0.25) for (const q of [-3.08, 3.08]) bag.box(f, 6.04, 2.56, 2.42, x + q, base + 1.3 + t * 2.6, z); else bag.box(f, 12.2, 2.56, 2.42, x, base + 1.3 + t * 2.6, z);
      }
    }
    if (b) bag.box(S.steel, 0.5, 9, rows * 2.5 + 1.5, x - 6.55, base + 4.5, 0);
  }
  // forecastle: mast, windlasses
  stack(bag, 68, 12, [[0, 0.5], [9, 0.3], [9, 0]], S.white, 0, 1, 6); bag.box(S.white, 0.3, 0.3, 4, 68, 19, 0);
  for (const s of [1, -1]) { bag.cyl(S.black, 0.7, 0.7, 1.6, 63, 12.8, s * 2.2, 8, PI / 2); bag.ball(S.lit, 68, 21.2, s * 0.01, 0.25); }
}

/** kind: 'sail' | 'steam' | 'cargo'. */
export function shipParts(kind) {
  const bag = new Bag(); ({ sail: sailShip, steam: liner, cargo: boxShip })[kind](bag);
  return [{ geo: bag.geo(), mat: vehicleMat(), tint: false }];
}
