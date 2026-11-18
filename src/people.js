// People: an anatomical figure (about 7.5 heads tall) dressed for its century, walking the streets or standing by a fire.
import * as THREE from 'three';
import { merge, smooth } from './util.js';
import { cr, hex, WHITE } from './organic.js';
import { Movers, traffic, CROSS_SPAN } from './movers.js';

// =====================================================================================
// Geometry helpers: everything is indexed, smooth-shaded, and tagged for the walk shader
// =====================================================================================
/** Limb ids stored in aRig.x; the vertex shader moves each one differently. */
const BODY = 0, LEG = 1, ARM = 2, SKIRT = 3;
// joint heights of the 1.75 m rest pose (the walk shader uses the same numbers)
const HIP = 0.93, KNEE = 0.5, ANKLE = 0.08, SHOULDER = 1.42, ELBOW = 1.13;
const sm = (a, b, x) => smooth((x - a) / (b - a));
/**
 * Flat colour plus rig data: aRig = (limb, side or weight, 1 if the colour ignores the instance tint).
 * For legs and arms `side` is +1 / -1 (the z side); for skirts it is how closely the cloth follows the legs.
 */
function tag(g, c, limb = BODY, side = 0, fixed = 0) {
  const n = g.attributes.position.count, col = new Float32Array(n * 3), rig = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col.set(c, i * 3); rig.set([limb, side, fixed], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aRig', new THREE.BufferAttribute(rig, 3)); return g;
}
/**
 * A skin stretched over stacked rings [x, y, z, rx, rz]: ellipses in the horizontal plane, smoothed between rings.
 * n > 2 squares the cross-section off (chests, shoes); cap = 'top' | 'bottom' | 'both' closes the ends.
 */
function loft(rings, { segs = 12, sub = 1, n = 2, cap = '' } = {}) {
  const S = [], last = rings.length - 1;
  for (let i = 0; i < last; i++) for (let k = 0; k < sub; k++) S.push(cr(rings[Math.max(0, i - 1)], rings[i], rings[i + 1], rings[Math.min(last, i + 2)], k / sub));
  S.push(rings[last]);
  const pos = [], uv = [], idx = [], up = rings[last][1] > rings[0][1], sq = (v) => Math.sign(v) * Math.abs(v) ** (2 / n);
  S.forEach(([x, y, z, rx, rz], j) => { for (let k = 0; k < segs; k++) { const a = (k / segs) * Math.PI * 2; pos.push(x + sq(Math.cos(a)) * rx, y, z + sq(Math.sin(a)) * rz); uv.push(k / segs, j / (S.length - 1)); } });
  const tri = (a, b, c, flip) => (flip ? idx.push(a, c, b) : idx.push(a, b, c));
  for (let j = 0; j < S.length - 1; j++) for (let k = 0; k < segs; k++) { const a = j * segs + k, b = j * segs + ((k + 1) % segs), c = a + segs, d = b + segs; tri(a, c, b, !up); tri(b, c, d, !up); }
  for (const [end, want] of [[0, 'bottom'], [S.length - 1, 'top']]) {
    if (cap !== 'both' && cap !== (up ? want : want === 'top' ? 'bottom' : 'top')) continue;
    const c = pos.length / 3; pos.push(S[end][0], S[end][1], S[end][2]); uv.push(0.5, end ? 1 : 0);
    for (let k = 0; k < segs; k++) tri(c, end * segs + k, end * segs + ((k + 1) % segs), (end > 0) !== !up);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Ellipsoid, optionally tilted about z (pitch) before it is placed. */
const ell = (rx, ry, rz, x, y, z, tilt = 0, segs = 6, rows = 4) => new THREE.SphereGeometry(1, segs, rows).scale(rx, ry, rz).rotateZ(tilt).translate(x, y, z);
/** Merge indexed geometries, keeping position / normal / color / uv / aRig. */
function join(geos) {
  const out = new THREE.BufferGeometry(), idx = []; let n = 0;
  for (const g of geos) { for (const i of g.index.array) idx.push(i + n); n += g.attributes.position.count; }
  for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['uv', 2], ['aRig', 3]]) {
    const arr = new Float32Array(n * size); let o = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  out.setIndex(idx); return out;
}

// =====================================================================================
// Anatomy
// =====================================================================================
// Torso cross-sections [y, centre x, half depth, half width] from below the crotch to inside the head: 0 = male, 1 = female.
const TORSO = [
  [[0.8, 0, 0.06, 0.1], [0.86, -0.005, 0.09, 0.153], [0.93, -0.012, 0.106, 0.17], [1, -0.008, 0.1, 0.163], [1.08, 0, 0.092, 0.148], [1.19, 0.004, 0.102, 0.156], [1.3, 0.01, 0.116, 0.168],
    [1.38, 0.004, 0.106, 0.172], [1.43, -0.004, 0.088, 0.166], [1.458, -0.008, 0.07, 0.128], [1.478, -0.009, 0.06, 0.082], [1.5, -0.01, 0.054, 0.058], [1.53, -0.008, 0.05, 0.05], [1.59, 0, 0.048, 0.048]],
  [[0.8, 0, 0.06, 0.1], [0.86, -0.006, 0.092, 0.16], [0.93, -0.016, 0.11, 0.18], [1, -0.01, 0.098, 0.166], [1.09, 0, 0.08, 0.124], [1.19, 0.004, 0.09, 0.134], [1.285, 0.022, 0.116, 0.148],
    [1.37, 0.004, 0.09, 0.152], [1.425, -0.004, 0.076, 0.146], [1.455, -0.008, 0.062, 0.11], [1.476, -0.009, 0.052, 0.07], [1.5, -0.01, 0.046, 0.049], [1.53, -0.008, 0.042, 0.042], [1.59, 0, 0.042, 0.042]],
];
/** One torso ring at height y, let out by `grow`; below the hips a garment hangs from them and flares. */
function torsoAt(f, y, grow, flare) {
  const P = TORSO[f];
  if (flare !== undefined) grow += 0.012 * sm(1.02, 0.9, y);   // ease over the seat
  if (flare !== undefined && y < HIP) { const k = 1 + flare * (HIP - y); return [P[2][1], y, 0, P[2][2] * k + grow, P[2][3] * k + grow]; }
  let i = 0; while (i < P.length - 2 && P[i + 1][0] < y) i++;
  const a = P[i], b = P[i + 1], t = (y - a[0]) / (b[0] - a[0]), at = (k) => a[k] + (b[k] - a[k]) * t;
  return [at(1), y, 0, at(2) + grow, at(3) + grow];
}
/** The torso (or a garment over it) between two heights. */
function torso(f, y0, y1, grow = 0, { flare, cap = '', n = 2.5 } = {}) {
  const ys = [y0, ...TORSO[f].map((p) => p[0]).filter((y) => y > y0 + 0.015 && y < y1 - 0.015), y1];
  return loft(ys.sort((a, b) => a - b).map((y) => torsoAt(f, y, grow, flare)), { segs: 14, n, cap });
}
// Arm and leg rings [x, y, z offset from the joint line, half depth, half width]; the limbs hang straight so the shader can bend them.
const ARM_RINGS = [[0, 1.462, -0.016, 0.016, 0.016], [0, 1.448, -0.006, 0.038, 0.038], [0, 1.41, 0, 0.051, 0.05], [0, 1.33, 0.006, 0.047, 0.045], [0.004, 1.24, 0.012, 0.045, 0.041],
  [0, ELBOW, 0.02, 0.036, 0.035], [0.004, 1.07, 0.024, 0.039, 0.036], [0.004, 0.96, 0.03, 0.03, 0.03], [0.004, 0.885, 0.033, 0.024, 0.027]];
const LEG_RINGS = [[-0.01, 0.98, 0, 0.06, 0.06], [-0.008, 0.9, 0, 0.092, 0.082], [-0.002, 0.8, 0, 0.085, 0.08], [0.002, 0.66, -0.004, 0.072, 0.068], [0.004, 0.55, -0.007, 0.06, 0.057],
  [0.006, KNEE, -0.008, 0.055, 0.054], [-0.004, 0.44, -0.008, 0.052, 0.05], [-0.014, 0.36, -0.008, 0.058, 0.053], [-0.01, 0.25, -0.009, 0.046, 0.043], [-0.004, 0.15, -0.01, 0.034, 0.033], [0, ANKLE, -0.01, 0.033, 0.031]];
/** Part of a limb between two heights: rings are cut at y0 / y1, scaled by k and let out by grow(y). */
function limb(rings, side, Z, y0, y1, { k = 1, grow = () => 0, cap = '', segs = 10 } = {}) {
  const at = (y) => { let i = 0; while (i < rings.length - 2 && rings[i + 1][1] > y) i++; const a = rings[i], b = rings[i + 1], t = (y - a[1]) / (b[1] - a[1]); return a.map((v, j) => v + (b[j] - v) * t); };
  const ys = [y1, ...rings.map((p) => p[1]).filter((y) => y < y1 - 0.012 && y > y0 + 0.012), y0];
  return loft(ys.map((y) => { const [x, , z, rx, rz] = at(y), g = grow(y); return [x, y, side * (Z + z), rx * k + g, rz * k + g]; }), { segs, cap });
}
/** A relaxed hand: palm and slightly curled fingers as one mitten, plus a thumb pointing forward. */
function hand(side, Z, k) {
  const z = (d) => side * (Z + 0.033 + d);
  return [loft([[0.004, 0.895, z(0), 0.023 * k, 0.019 * k], [0.008, 0.862, z(0), 0.036 * k, 0.017 * k], [0.012, 0.81, z(-0.002), 0.043 * k, 0.015 * k], [0.017, 0.76, z(-0.008), 0.04 * k, 0.013 * k],
    [0.024, 0.715, z(-0.017), 0.034 * k, 0.012 * k], [0.03, 0.69, z(-0.024), 0.02 * k, 0.008 * k]], { segs: 8, cap: 'bottom' }),
  loft([[0.03, 0.86, z(-0.004), 0.015 * k, 0.012 * k], [0.052, 0.815, z(-0.009), 0.012 * k, 0.011 * k], [0.06, 0.772, z(-0.014), 0.007 * k, 0.007 * k]], { segs: 6, cap: 'bottom' })];
}
/** A shoe lying along x with a flat sole; the ankle joint sits above x = 0. Vertices near the ground are painted as the sole. */
function shoe(side, Z, upper, sole, bulk = 1) {
  const z = side * (Z - 0.01), g = loft([[-0.03, -0.074, z, 0.012, 0.012], [-0.034, -0.064, z, 0.05, 0.034], [-0.036, -0.02, z, 0.062, 0.041], [-0.034, 0.03, z, 0.056, 0.044], [-0.026, 0.08, z, 0.042, 0.047],
    [-0.022, 0.13, z, 0.034, 0.048], [-0.018, 0.17, z, 0.028, 0.041], [-0.016, 0.196, z, 0.016, 0.022]].map(([h, x, zz, rh, rw]) => [h * bulk, x, zz, rh * bulk, rw * bulk]), { segs: 10, n: 2.6, cap: 'both' }).rotateZ(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
  g.computeVertexNormals(); tag(g, upper, LEG, side, 1);
  const c = g.attributes.color; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.016) c.setXYZ(i, ...sole);
  return g;
}

const HEAD = 1.642;
/** Skull surface along a unit direction (x forward): a cranium that narrows to the jaw and tucks in at the nape. */
function headPt(dx, dy, dz, grow = 0) {
  const dn = Math.max(0, -dy), rx = dx > 0 ? 0.092 : 0.1 * (1 - 0.42 * sm(0.2, 0.95, dn)), ry = dy > 0 ? 0.108 : 0.124, rz = 0.077 * (1 + 0.16 * sm(0.2, 0.7, dn) * (1 - sm(0.72, 1, dn)));
  return [dx * (rx + grow) + 0.026 * sm(0, 1, dn), HEAD + dy * (ry + grow), dz * (rz + grow)];
}
/** A sphere reshaped by fn(direction) → point. */
function shaped(fn, segs, rows) {
  const g = new THREE.SphereGeometry(1, segs, rows), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, ...fn(p.getX(i), p.getY(i), p.getZ(i)));
  g.computeVertexNormals(); return g;
}
/** Head with eye sockets and chin; `faceX(y, z)` finds the face surface so features can be set into it. */
function head() {
  const g = shaped((dx, dy, dz) => {
    const p = headPt(dx, dy, dz);
    if (dx > 0) p[0] += 0.011 * Math.exp(-(((p[1] - 1.535) / 0.02) ** 2) - (p[2] / 0.03) ** 2) - 0.008 * Math.exp(-(((p[1] - 1.647) / 0.013) ** 2) - ((Math.abs(p[2]) - 0.032) / 0.017) ** 2);
    return p;
  }, 20, 14), p = g.attributes.position;
  const faceX = (y, z) => { let best = 0, d = 1e9; for (let i = 0; i < p.count; i++) { const e = (p.getY(i) - y) ** 2 + (p.getZ(i) - z) ** 2; if (p.getX(i) > 0 && e < d) { d = e; best = p.getX(i); } } return best; };
  return { g, faceX };
}
/** A shell over the skull wherever mask(direction) > 0 (hair, coif); the rest hides inside the head. */
const shell = (mask, thick) => shaped((dx, dy, dz) => { const m = mask(dx, dy, dz); return headPt(dx, dy, dz, m > 0 ? thick * m * (1 + 0.5 * Math.max(0, dy)) : -0.015); }, 20, 12);
const hairline = (drop) => (dx, dy, dz) => sm(-0.08, 0.12, dy * 0.9 - dx * 0.85 + 0.2 + drop - 0.22 * Math.abs(dz));

// =====================================================================================
// Outfits
// =====================================================================================
const HAIR = hex(0x3a2a1c), LEATHER = hex(0x2a1c14), SOLE = hex(0x14100c), LINEN = hex(0xe8e2d4), FELT = hex(0x1c1a18), BUCKSKIN = hex(0x9a7448), EYE = hex(0xe6e2dc), IRIS = hex(0x2a1a10);
/**
 * f: 1 = female build. coat: hem height of the upper garment (it follows the legs below the hips). sleeve: cuff height.
 * legs: 'trousers' | 'breeches' | 'bare' | 'none'. skirt: hem height of a skirt in the trouser colour. hair: 'short' | 'bob' | 'long'.
 */
const OUTFITS = {
  modern: { coat: 0.87, grow: 0.014, collar: 1, hair: 'short', shoes: [hex(0x8a8a8a), LINEN] },
  longhair: { f: 1, coat: 0.9, grow: 0.008, hair: 'long', slim: 1 },
  suit: { buttons: 2, coat: 0.82, grow: 0.014, flare: 0.25, shirt: 1, hat: 'fedora', hair: 'short', cuffs: 1 },
  skirt: { f: 1, coat: 1.04, grow: 0.01, collar: 1, skirt: 0.5, legs: 'bare', hair: 'bob' },
  hat: { buttons: 4, coat: 0.53, grow: 0.016, flare: 0.5, shirt: 1, hat: 'top', hair: 'short' },
  colonial: { buttons: 6, coat: 0.56, grow: 0.018, flare: 0.6, falling: 1, legs: 'breeches', hat: 'brim', hair: 'bob', shoes: [LEATHER, SOLE, hex(0xb8b0a0)] },
  dress: { f: 1, coat: 1.04, grow: 0.008, falling: 1, skirt: 0.04, legs: 'none', hat: 'coif', hair: 'short', puff: 0.01, spread: 0.035, stride: 1 },
  robe: { coat: 0.98, grow: 0.022, skirt: 0.07, legs: 'none', hair: 'short', wide: 0.12, sash: 1, cowl: 1, spread: 0.02, stride: 1.05, shoes: [LINEN, hex(0x8a8478)] },
  native: { coat: 0.68, grow: 0.012, flare: 0.5, sleeve: 1.22, hair: 'long', band: 1, sash: 1, fringe: 1, shoes: [BUCKSKIN, hex(0x5a4028)], soft: 1 },
};
/** Returns { top, bottom, skin, hair } geometries, facing +x, plus the stride the outfit allows. */
function personGeo(variant) {
  const o = OUTFITS[variant], f = o.f || 0, top = [], bottom = [], skin = [], hair = [];
  const armZ = (f ? 0.158 : 0.178) + (o.spread || 0), armK = f ? 0.86 : 1, legZ = f ? 0.09 : 0.088, legK = f ? 0.96 : 1;
  const dark = (c, k) => c.map((v) => v * k);

  // upper garment, hem to collar; anything below the hips swings with the thighs
  top.push(tag(torso(f, o.coat, 1.494, o.grow, { flare: o.flare || 0.12, cap: 'bottom' }), WHITE, SKIRT, 1));
  if (o.collar) top.push(tag(loft([[-0.008, 1.47, 0, 0.082, 0.094], [-0.01, 1.5, 0, 0.071, 0.075], [-0.01, 1.516, 0, 0.066, 0.069]], { segs: 12 }), dark(WHITE, 0.82)));
  if (o.cowl) top.push(tag(loft([[-0.01, 1.42, 0, 0.11, 0.15], [-0.014, 1.47, 0, 0.1, 0.12], [-0.02, 1.52, 0, 0.085, 0.09], [-0.02, 1.535, 0, 0.07, 0.074]], { segs: 12 }), dark(WHITE, 0.9)));
  if (o.falling) top.push(tag(torso(f, 1.385, 1.5, o.grow + 0.012, { cap: 'bottom' }), LINEN, BODY, 0, 1));   // broad linen collar / kerchief
  if (o.shirt) {   // shirt front and collar showing between the lapels, with a dark tie
    const front = (y) => { const t = torsoAt(f, y, o.grow); return t[0] + t[3]; }, cx = front(1.41), tilt = Math.atan2(front(1.31) - front(1.46), 0.15);
    top.push(tag(ell(0.018, 0.075, 0.034, cx - 0.007, 1.412, 0, tilt), LINEN, BODY, 0, 1), tag(ell(0.018, 0.06, 0.011, cx - 0.002, 1.41, 0, tilt), FELT, BODY, 0, 1),
      tag(loft([[-0.009, 1.478, 0, 0.074, 0.08], [-0.01, 1.52, 0, 0.062, 0.064]], { segs: 12 }), LINEN, BODY, 0, 1));
  }
  for (let i = 0; i < (o.buttons || 0); i++) { const y = 1.24 - i * 0.075, t = torsoAt(f, y, o.grow, o.flare || 0.12); top.push(tag(ell(0.006, 0.011, 0.011, t[0] + t[3], y, 0, 0, 6, 4), o.buttons > 3 ? hex(0xa08a50) : FELT, BODY, 0, 1)); }
  if (o.sash) top.push(tag(torso(f, 0.99, 1.05, o.grow + 0.008, { flare: 0 }), o.band ? LEATHER : dark(WHITE, 0.55), BODY, 0, o.band ? 1 : 0));
  if (o.fringe) top.push(tag(torso(f, o.coat - 0.05, o.coat + 0.005, o.grow + 0.004, { flare: (o.flare || 0) + 0.12 }), dark(WHITE, 0.7), SKIRT, 1));

  for (const s of [1, -1]) {
    // arms: sleeve to the cuff, bare forearm below a short sleeve, then the hand
    const cuff = o.sleeve || 0.895, wide = (y) => o.grow * 0.7 + (o.puff || 0) + (o.wide || 0) * sm(1.4, 0.9, y) * 0.5;
    top.push(tag(limb(ARM_RINGS, s, armZ, cuff, 1.462, { k: armK, grow: wide, cap: 'both' }), WHITE, ARM, s));
    if (o.cuffs || o.falling) top.push(tag(limb(ARM_RINGS, s, armZ, cuff, cuff + 0.024, { k: armK, grow: (y) => wide(y) + 0.006, cap: 'bottom' }), LINEN, ARM, s, 1));
    if (cuff > 0.9) skin.push(tag(limb(ARM_RINGS, s, armZ, 0.885, cuff + 0.03, { k: armK }), WHITE, ARM, s));
    skin.push(...hand(s, armZ, armK).map((g) => tag(g, WHITE, ARM, s)));

    // legs
    const legs = o.legs || 'trousers', L = (y0, y1, grow, cap) => limb(LEG_RINGS, s, legZ, y0, y1, { k: legK, grow, cap });
    if (legs === 'trousers') bottom.push(tag(L(0.062, 0.98, (y) => (o.slim ? 0.005 : 0.009 + 0.02 * sm(0.42, 0.1, y)) + (o.slim ? 0.012 : 0.004) * sm(0.2, 0.07, y), 'bottom'), WHITE, LEG, s));
    if (legs === 'breeches') bottom.push(tag(L(0.44, 0.98, (y) => 0.012 + 0.006 * sm(0.5, 0.44, y), 'bottom'), WHITE, LEG, s), tag(L(ANKLE, 0.47, () => 0.002), LINEN, LEG, s, 1));
    if (legs === 'bare') skin.push(tag(L(ANKLE, 0.8, () => 0), WHITE, LEG, s));
    if (legs === 'none') bottom.push(tag(L(ANKLE, 0.3, () => 0), dark(WHITE, 0.5), LEG, s));
    const [upper, sole, buckle] = o.shoes || [LEATHER, SOLE];
    bottom.push(shoe(s, legZ, upper, sole, o.soft ? 0.9 : 1));
    if (buckle) bottom.push(tag(ell(0.016, 0.01, 0.02, 0.07, 0.078, s * (legZ - 0.01), -0.5), buckle, LEG, s, 1));
  }
  if ((o.legs || 'trousers') !== 'none') bottom.push(tag(torso(f, 0.8, 1.04, 0.006, { cap: 'both', n: 2.2 }), WHITE));   // seat of the trousers
  if (o.skirt) {
    const w = torsoAt(f, 1.07, 0.022), h = o.skirt, full = h < 0.2, R = (y, rx, rz) => [-0.012 * sm(1.06, 0.9, y), y, 0, rx, rz];
    const rings = full ? [w, R(0.99, 0.125, 0.172), R(0.9, 0.16, 0.19), R(0.75, 0.2, 0.215), R(0.5, 0.265, 0.275), R(0.25, 0.315, 0.325), R(h, 0.345, 0.355)]
      : [w, R(0.99, 0.122, 0.178), R(0.9, 0.132, 0.195), R(0.7, 0.16, 0.215), R(h, 0.19, 0.24)];
    if (o.wide) rings.splice(1, 6, R(0.9, 0.14, 0.19), R(0.5, 0.19, 0.235), R(0.25, 0.22, 0.26), R(h, 0.24, 0.275));   // a robe falls straighter than a dress
    bottom.push(tag(loft(rings, { segs: 16, sub: 2, cap: 'bottom' }), WHITE, SKIRT, full ? 0.55 : 1));
  }

  // neck, head and face
  const { g: skull, faceX } = head(), mid = faceX(1.612, 0);
  skin.push(tag(torso(f, 1.476, 1.59, -0.003, { n: 2 }), WHITE), tag(skull, WHITE),
    tag(loft([[mid - 0.006, 1.662, 0, 0.008, 0.008], [mid - 0.001, 1.63, 0, 0.011, 0.0095], [mid + 0.007, 1.604, 0, 0.016, 0.0155], [mid + 0.002, 1.591, 0, 0.012, 0.0135]], { segs: 8, cap: 'bottom' }), WHITE),   // nose: narrow bridge to a broader tip
    tag(ell(0.007, 0.006, 0.022, faceX(1.57, 0) - 0.001, 1.57, 0), [0.74, 0.44, 0.42]));   // lips
  for (const s of [1, -1]) {
    const ex = faceX(1.647, 0.032);
    skin.push(tag(ell(0.012, 0.03, 0.007, -0.006, 1.634, s * 0.078, 0.2), dark(WHITE, 0.92)),   // ear
      tag(ell(0.006, 0.0068, 0.0145, ex + 0.002, 1.647, s * 0.032), EYE, BODY, 0, 1), tag(ell(0.004, 0.0064, 0.0066, ex + 0.0056, 1.647, s * 0.0315), IRIS, BODY, 0, 1));
    hair.push(tag(ell(0.006, 0.0034, 0.019, faceX(1.667, 0.033) + 0.003, 1.667, s * 0.033), dark(HAIR, 0.8)));   // eyebrow
  }

  // hair
  hair.push(tag(shell(hairline(o.hair === 'short' ? -0.07 : 0.25), 0.017), HAIR));
  if (o.hair === 'bob') hair.push(tag(loft([[-0.022, 1.7, 0, 0.085, 0.086], [-0.032, 1.62, 0, 0.082, 0.096], [-0.04, 1.55, 0, 0.07, 0.1], [-0.045, 1.5, 0, 0.05, 0.085]], { segs: 14, cap: 'bottom' }), HAIR));
  if (o.hair === 'long') hair.push(tag(loft([[-0.022, 1.7, 0, 0.085, 0.086], [-0.035, 1.62, 0, 0.08, 0.097], [-0.055, 1.54, 0, 0.066, 0.104], [-0.088, 1.45, 0, 0.044, 0.118], [-0.112, 1.34, 0, 0.03, 0.105], [-0.118, 1.26, 0, 0.012, 0.06]], { segs: 12, sub: 2, cap: 'bottom' }), HAIR));
  if (o.band) hair.push(tag(loft([[-0.004, 1.69, 0, 0.097, 0.081], [-0.004, 1.712, 0, 0.094, 0.078]], { segs: 14 }), hex(0x8a2a1c), BODY, 0, 1));

  // hats
  const crown = (rings, c, fixed = 1) => tag(loft(rings.map(([y, rx, rz]) => [-0.006, y, 0, rx, rz]), { segs: 16, cap: 'top' }), c, BODY, 0, fixed);
  const brim = (rx, rz, c, tilt = 0, fixed = 1) => tag(ell(rx, 0.007, rz, -0.006, 1.7, 0, tilt, 18, 4), c, BODY, 0, fixed);
  if (o.hat === 'top') hair.push(crown([[1.695, 0.1, 0.086], [1.72, 0.097, 0.083], [1.8, 0.097, 0.083], [1.87, 0.103, 0.089]], FELT), brim(0.15, 0.132, FELT));
  if (o.hat === 'brim') hair.push(crown([[1.695, 0.1, 0.086], [1.75, 0.093, 0.08], [1.82, 0.08, 0.068]], FELT), brim(0.215, 0.205, FELT));
  if (o.hat === 'fedora') top.push(crown([[1.695, 0.1, 0.086], [1.75, 0.098, 0.083], [1.8, 0.092, 0.072], [1.812, 0.07, 0.04]], dark(WHITE, 0.75), 0), brim(0.158, 0.14, dark(WHITE, 0.7), -0.08, 0),
    tag(loft([[-0.006, 1.7, 0, 0.102, 0.088], [-0.006, 1.725, 0, 0.1, 0.086]], { segs: 16 }), FELT, BODY, 0, 1));
  if (o.hat === 'coif') hair.push(tag(shell((dx, dy, dz) => sm(-0.05, 0.1, dy * 0.7 - dx + 0.4 - 0.1 * Math.abs(dz)), 0.026), LINEN, BODY, 0, 1));

  return { top: join(top), bottom: join(bottom), skin: join(skin), hair: join(hair), stride: o.stride || 1.3 };
}
const personCache = {};
const personOf = (v) => personCache[v] || (personCache[v] = personGeo(v));

// =====================================================================================
// The walk: a gait cycle computed per vertex from the instance's position along its path
// =====================================================================================
const WALK = /* glsl */`
  attribute vec3 aRig;
  uniform float uStride;
  const float HIP = ${HIP}, KNEE = ${KNEE.toFixed(2)}, ANK = ${ANKLE}, SHO = ${SHOULDER}, ELB = ${ELBOW}, TAU = 6.2831853, STANCE = 0.62;
  vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(p.x * c - p.y * s, p.x * s + p.y * c); }
  // A planted foot, t = 0..1 through the stance: ankle position relative to the hip (xy), foot pitch (z, toes up positive), toe bend (w).
  // The foot rolls from the heel on to its sole, then up over the ball; the ground point it rolls over moves back at walking speed, so nothing slides.
  vec4 planted(float t) {
    float f = 0.32 * (1.0 - smoothstep(0.0, 0.2, t)) - 0.95 * pow(smoothstep(0.58, 1.0, t), 1.3), px = f > 0.0 ? -0.055 : 0.125;
    return vec4(vec2(-0.07 + uStride * STANCE * (0.5 - t) + px, 0.0) + rot2(vec2(-px, ANK), f), f, max(0.0, -f));
  }
  vec4 footAt(float u) {
    if (u < STANCE) return planted(u / STANCE);
    float s = (u - STANCE) / (1.0 - STANCE); vec4 a = planted(1.0), b = planted(0.0);   // swing: lift, carry forward, reach for the heel strike
    return vec4(mix(a.x, b.x, mix(s, smoothstep(0.0, 1.0, s), 0.6)), mix(a.y, b.y, smoothstep(0.0, 0.9, s)) + 0.055 * sin(3.14159 * pow(s, 0.8)), mix(a.z, b.z, smoothstep(0.1, 0.8, s)), a.w * (1.0 - smoothstep(0.0, 0.3, s)));
  }
  // two-bone IK from the hip to the ankle: thigh angle, knee flexion, foot pitch, toe bend
  vec4 legPose(float u, float hipY) {
    vec4 F = footAt(u); vec2 d = vec2(F.x, F.y - hipY); float l1 = HIP - KNEE, l2 = KNEE - ANK, len = min(length(d), (l1 + l2) * 0.999);
    return vec4(atan(d.x, -d.y) + acos((l1 * l1 + len * len - l2 * l2) / (2.0 * l1 * len)), 3.14159 - acos((l1 * l1 + l2 * l2 - len * len) / (2.0 * l1 * l2)), F.z, F.w);
  }
  // how far forward a posed leg is at height y
  float legX(vec4 P, float y) { float ky = HIP - (HIP - KNEE) * cos(P.x); return y > ky ? tan(P.x) * (HIP - y) : (HIP - KNEE) * sin(P.x) + tan(P.x - P.y) * (ky - y); }
  void bend(inout vec3 p, inout vec3 n, vec2 pivot, float a) { p.xy = pivot + rot2(p.xy - pivot, a); n.xy = rot2(n.xy, a); }
  vec3 rig(vec3 p, inout vec3 n) {
    #ifdef USE_INSTANCING
      vec3 fw = instanceMatrix[0].xyz, o = instanceMatrix[3].xyz; float sc = length(fw); fw /= sc;
      float ph = dot(o.xz, fw.xz) / (uStride * sc) + fract(dot(o.xz, vec2(-fw.z, fw.x)) * 0.37);   // distance walked, in strides
      float u = fract(ph), mine = fract(ph + (aRig.y > 0.0 ? 0.0 : 0.5)), y = p.y;
      float hipY = HIP - 0.024 - 0.0155 * uStride * cos(2.0 * TAU * (u - 0.04)), sway = 0.016 * sin(TAU * (u - 0.05));   // lowest with both feet down, leaning over the standing leg
      if (aRig.x == 1.0) {
        vec4 P = legPose(mine, hipY);
        bend(p, n, vec2(0.125, 0.012), P.w * smoothstep(0.105, 0.145, p.x) * step(y, ANK + 0.03));   // toes stay flat while the heel lifts
        bend(p, n, vec2(0.0, ANK), (P.z - P.x + P.y) * (1.0 - smoothstep(ANK - 0.005, ANK + 0.05, y)));
        bend(p, n, vec2(0.0, KNEE), -P.y * (1.0 - smoothstep(KNEE - 0.06, KNEE + 0.06, y)));
        bend(p, n, vec2(0.0, HIP), P.x * (1.0 - smoothstep(HIP - 0.06, HIP + 0.06, y)));
        p.y += hipY - HIP; p.z += sway * smoothstep(ANK, HIP, y);
        return p;
      }
      if (aRig.x == 2.0) {   // arms counter-swing, the elbow bending as the hand comes forward
        float sw = 0.04 - 0.36 * cos(TAU * mine);
        bend(p, n, vec2(0.0, ELB), (0.16 + 0.4 * smoothstep(-0.4, 0.4, sw)) * (1.0 - smoothstep(ELB - 0.05, ELB + 0.05, y)));
        bend(p, n, vec2(0.0, SHO), sw * (1.0 - smoothstep(SHO - 0.03, SHO + 0.05, y)));
        y = SHO;
      }
      if (aRig.x == 3.0 && y < HIP) p.x += mix(legX(legPose(fract(u + 0.5), hipY), y), legX(legPose(u, hipY), y), smoothstep(-0.05, 0.05, p.z)) * aRig.y;   // cloth follows the leg under it
      float yaw = -0.07 * cos(TAU * u) * smoothstep(0.98, 1.38, y) * (1.0 - smoothstep(1.47, 1.56, y)), c = cos(yaw), s = sin(yaw);   // shoulders turn against the hips
      p.xz = vec2(p.x * c + p.z * s, p.z * c - p.x * s); n.xz = vec2(n.x * c + n.z * s, n.z * c - n.x * s);
      p.x += 0.045 * max(0.0, p.y - HIP); p.y += hipY - HIP; p.z += sway;
    #endif
    return p;
  }
`;
const mats = {};
/** Materials are shared between outfits with the same stride; `fixed` vertices keep their own colour under the instance tint. */
function personMat(rough, stride) {
  const key = rough + '/' + stride; if (mats[key]) return mats[key];
  const m = mats[key] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough }), uStride = { value: stride };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uStride = uStride;
    sh.vertexShader = WALK + sh.vertexShader
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n if (aRig.z > 0.5) vColor.xyz = color.xyz;\n#endif')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vec3 rigged = rig(position, objectNormal);')
      .replace('#include <begin_vertex>', 'vec3 transformed = rigged;');
  };
  // shadows follow the walk too: give each mesh drawn with this material a matching depth material
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => { sh.uniforms.uStride = uStride; sh.vertexShader = WALK + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 up = vec3(0.0, 1.0, 0.0); vec3 transformed = rig(position, up);'); };
  m.onBeforeRender = (_r, _s, _c, _g, obj) => { obj.customDepthMaterial = depth; };
  return m;
}
export function personParts(variant) {
  const g = personOf(variant), cloth = personMat(0.85, g.stride);
  return [{ geo: g.top, mat: cloth }, { geo: g.bottom, mat: cloth, tintKey: 'legs' }, { geo: g.skin, mat: personMat(0.6, g.stride), tintKey: 'skin' }, { geo: g.hair, mat: personMat(0.7, g.stride), tintKey: 'hair' }];
}
/** A standing figure as one vertex-coloured geometry, for campfires and villages. */
export function staticPerson(variant, topHex, bottomHex, skinRGB) {
  const g = personOf(variant), tints = [hex(topHex), hex(bottomHex), skinRGB.map((v) => v ** 2.2), [0.35, 0.3, 0.3]];
  return merge([g.top, g.bottom, g.skin, g.hair].map((geo, k) => {
    const o = geo.toNonIndexed(), c = o.attributes.color, rig = o.attributes.aRig;
    for (let i = 0; i < c.count; i++) if (!rig.getZ(i)) c.setXYZ(i, c.getX(i) * tints[k][0], c.getY(i) * tints[k][1], c.getZ(i) * tints[k][2]);
    o.deleteAttribute('aRig'); return o;
  }));
}

export function buildPeople(world, scene, r) {
  const { lanes, cloth } = traffic(r), movers = [];
  const side = (ax) => (ax === 'z' ? 7.2 + r() * 2.3 : 4 + r() * 1.5), tall = (k) => () => k * (0.94 + r() * 0.12);
  // hair is tinted from a mid brown: black, dark brown, brown, auburn, blond, grey
  const HAIRS = [[0.25, 0.25, 0.3], [0.6, 0.6, 0.6], [1, 1, 1], [2.6, 1.2, 0.7], [5, 4, 2.4], [5, 5.5, 6.5]], hairOf = () => HAIRS[Math.floor(r() ** 1.6 * HAIRS.length)];
  // pedestrians: the population grows with the city, and dresses for its century
  const crowd = (variant, n, from, to, o, woman) => {
    const items = lanes(n, from, to, { v: [1, 1.6], off: side, cross: 0.4, s: tall(woman ? 0.93 : 1), ...o });
    for (const it of items) { it.hair = hairOf(); if (woman) it.v *= 0.92; }
    const m = new Movers(world, personParts(variant), items, { crossSpan: CROSS_SPAN }); movers.push(m); scene.add(...m.meshes);
  };
  const drab = cloth([0x4a3c30, 0x33333c, 0x6a5a4a, 0x5a2a22, 0x242424, 0x3a4a3a]), dark = cloth([0x1c1c20, 0x2a2420, 0x30343c, 0x3a3028]);
  const gowns = cloth([0x6a3a3a, 0x3a4a6a, 0x7a6a50, 0x40503a, 0x8a8478, 0x503a50]), skirts = cloth([0x5a3030, 0x30405a, 0x6a5a44, 0x384830, 0x2a2a30]);
  crowd('colonial', 34, 1626, 1810, { jf: 150, jt: 20, tint: drab, legs: drab });
  crowd('dress', 30, 1630, 1915, { jf: 150, jt: 12, tint: gowns, legs: skirts }, true);
  crowd('hat', 44, 1790, 1905, { jf: 80, jt: 12, alt: 0.16, tint: dark, legs: dark });
  crowd('suit', 50, 1890, 1962, { jf: 40, jt: 12, alt: 0.16, tint: cloth([0x2a2a30, 0x3a3630, 0x30343c, 0x4a4844, 0x242428]), legs: dark });
  crowd('skirt', 40, 1912, 1975, { jf: 30, jt: 20, alt: 0.16, tint: cloth([0xc8c0b0, 0x7a2a2a, 0x3a4a6a, 0xe8e4dc, 0x4a6a4a, 0x8a6a7a]), legs: skirts }, true);
  const bright = cloth([0x2a2a30, 0x3a4a6a, 0x7a2a2a, 0xc8c0b0, 0x4a6a4a, 0xd0a030, 0x808890, 0x202020, 0x7a4a6a, 0xe8e4dc, 0x1e5a8a]), jeans = cloth([0x2a3a5a, 0x1c1c20, 0x3a3a40, 0x5a5648, 0x243048, 0x6a6a70]);
  crowd('modern', 75, 1950, 2160, { jf: 40, jt: 30, alt: 0.16, tint: bright, legs: jeans });
  crowd('longhair', 70, 1950, 2160, { jf: 40, jt: 30, alt: 0.16, tint: bright, legs: jeans }, true);
  crowd('robe', 40, 2970, 9300, { jf: 30, jt: 600, off: () => r() * 30, cross: 0.5, tint: cloth([0xffffff, 0xd8f0f0, 0xf0e8d0, 0xc0e0ff]), legs: cloth([0xffffff, 0xe8f4f4, 0xf4ecd8]) });
  return movers;
}
