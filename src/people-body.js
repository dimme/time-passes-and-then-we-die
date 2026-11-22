// The human body: an anatomical figure (about 7.5 heads tall) lofted from rings and tagged for the animation shaders.
import * as THREE from 'three';
import { smooth } from './util.js?v=ef07112a';
import { cr } from './organic.js?v=ef07112a';

// =====================================================================================
// Geometry helpers: everything is indexed, smooth-shaded, and tagged for the walk shader
// =====================================================================================
/**
 * Limb ids stored in aRig.x; the vertex shaders move each one differently. Things carried (actors only): HELD turns freely in a hand,
 * GRIP is fixed to a forearm, CHEST and CROWN ride on the ribcage and the head. HOLD is an arm kept raised by the walk shader.
 */
export const BODY = 0, LEG = 1, ARM = 2, SKIRT = 3, HELD = 4, GRIP = 5, CHEST = 6, CROWN = 7, HOLD = 8;
// joint heights of the 1.75 m rest pose (the shaders use the same numbers)
export const HIP = 0.93, KNEE = 0.5, ANKLE = 0.08, SHOULDER = 1.42, ELBOW = 1.13;
export const sm = (a, b, x) => smooth((x - a) / (b - a));
/**
 * Flat colour plus rig data: aRig = (limb, side or weight, 1 if the colour ignores the instance tint).
 * For legs `side` is +1 / -1 (the z side); for arms and things in a hand it is the signed z of the shoulder; for skirts it is how closely the cloth follows the legs.
 */
export function tag(g, c, limb = BODY, side = 0, fixed = 0) {
  const n = g.attributes.position.count, col = new Float32Array(n * 3), rig = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col.set(c, i * 3); rig.set([limb, side, fixed], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aRig', new THREE.BufferAttribute(rig, 3)); return g;
}
/**
 * A skin stretched over stacked rings [x, y, z, rx, rz]: ellipses in the horizontal plane, smoothed between rings.
 * n > 2 squares the cross-section off (chests, shoes); cap = 'top' | 'bottom' | 'both' closes the ends.
 */
export function loft(rings, { segs = 12, sub = 1, n = 2, cap = '' } = {}) {
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
export const ell = (rx, ry, rz, x, y, z, tilt = 0, segs = 6, rows = 4) => new THREE.SphereGeometry(1, segs, rows).scale(rx, ry, rz).rotateZ(tilt).translate(x, y, z);
/** Merge indexed geometries, keeping position / normal / color / uv / aRig. */
export function join(geos) {
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
export const TORSO = [
  [[0.8, 0, 0.06, 0.1], [0.86, -0.005, 0.09, 0.153], [0.93, -0.012, 0.106, 0.17], [1, -0.008, 0.1, 0.163], [1.08, 0, 0.092, 0.148], [1.19, 0.004, 0.102, 0.156], [1.3, 0.01, 0.116, 0.168],
    [1.38, 0.004, 0.106, 0.172], [1.43, -0.004, 0.088, 0.166], [1.458, -0.008, 0.07, 0.128], [1.478, -0.009, 0.06, 0.082], [1.5, -0.01, 0.054, 0.058], [1.53, -0.008, 0.05, 0.05], [1.59, 0, 0.048, 0.048]],
  [[0.8, 0, 0.06, 0.1], [0.86, -0.006, 0.092, 0.16], [0.93, -0.016, 0.11, 0.18], [1, -0.01, 0.098, 0.166], [1.09, 0, 0.08, 0.124], [1.19, 0.004, 0.09, 0.134], [1.285, 0.022, 0.116, 0.148],
    [1.37, 0.004, 0.09, 0.152], [1.425, -0.004, 0.076, 0.146], [1.455, -0.008, 0.062, 0.11], [1.476, -0.009, 0.052, 0.07], [1.5, -0.01, 0.046, 0.049], [1.53, -0.008, 0.042, 0.042], [1.59, 0, 0.042, 0.042]],
];
/** One torso ring at height y, let out by `grow`; below the hips a garment hangs from them and flares. */
export function torsoAt(f, y, grow, flare) {
  const P = TORSO[f];
  if (flare !== undefined) grow += 0.012 * sm(1.02, 0.9, y);   // ease over the seat
  if (flare !== undefined && y < HIP) { const k = 1 + flare * (HIP - y); return [P[2][1], y, 0, P[2][2] * k + grow, P[2][3] * k + grow]; }
  let i = 0; while (i < P.length - 2 && P[i + 1][0] < y) i++;
  const a = P[i], b = P[i + 1], t = (y - a[0]) / (b[0] - a[0]), at = (k) => a[k] + (b[k] - a[k]) * t;
  return [at(1), y, 0, at(2) + grow, at(3) + grow];
}
/** The torso (or a garment over it) between two heights. */
export function torso(f, y0, y1, grow = 0, { flare, cap = '', n = 2.5 } = {}) {
  const ys = [y0, ...TORSO[f].map((p) => p[0]).filter((y) => y > y0 + 0.015 && y < y1 - 0.015), y1];
  return loft(ys.sort((a, b) => a - b).map((y) => torsoAt(f, y, grow, flare)), { segs: 14, n, cap });
}
// Arm and leg rings [x, y, z offset from the joint line, half depth, half width]; the limbs hang straight so the shader can bend them.
export const ARM_RINGS = [[0, 1.462, -0.016, 0.016, 0.016], [0, 1.448, -0.006, 0.038, 0.038], [0, 1.41, 0, 0.051, 0.05], [0, 1.33, 0.006, 0.047, 0.045], [0.004, 1.24, 0.012, 0.045, 0.041],
  [0, ELBOW, 0.02, 0.036, 0.035], [0.004, 1.07, 0.024, 0.039, 0.036], [0.004, 0.96, 0.03, 0.03, 0.03], [0.004, 0.885, 0.033, 0.024, 0.027]];
export const LEG_RINGS = [[-0.01, 0.98, 0, 0.06, 0.06], [-0.008, 0.9, 0, 0.092, 0.082], [-0.002, 0.8, 0, 0.085, 0.08], [0.002, 0.66, -0.004, 0.072, 0.068], [0.004, 0.55, -0.007, 0.06, 0.057],
  [0.006, KNEE, -0.008, 0.055, 0.054], [-0.004, 0.44, -0.008, 0.052, 0.05], [-0.014, 0.36, -0.008, 0.058, 0.053], [-0.01, 0.25, -0.009, 0.046, 0.043], [-0.004, 0.15, -0.01, 0.034, 0.033], [0, ANKLE, -0.01, 0.033, 0.031]];
/** Part of a limb between two heights: rings are cut at y0 / y1, scaled by k and let out by grow(y). */
export function limb(rings, side, Z, y0, y1, { k = 1, grow = () => 0, cap = '', segs = 10 } = {}) {
  const at = (y) => { let i = 0; while (i < rings.length - 2 && rings[i + 1][1] > y) i++; const a = rings[i], b = rings[i + 1], t = (y - a[1]) / (b[1] - a[1]); return a.map((v, j) => v + (b[j] - v) * t); };
  const ys = [y1, ...rings.map((p) => p[1]).filter((y) => y < y1 - 0.012 && y > y0 + 0.012), y0];
  return loft(ys.map((y) => { const [x, , z, rx, rz] = at(y), g = grow(y); return [x, y, side * (Z + z), rx * k + g, rz * k + g]; }), { segs, cap });
}
/** A relaxed hand: palm and slightly curled fingers as one mitten, plus a thumb pointing forward. */
export function hand(side, Z, k) {
  const z = (d) => side * (Z + 0.033 + d);
  return [loft([[0.004, 0.895, z(0), 0.023 * k, 0.019 * k], [0.008, 0.862, z(0), 0.036 * k, 0.017 * k], [0.012, 0.81, z(-0.002), 0.043 * k, 0.015 * k], [0.017, 0.76, z(-0.008), 0.04 * k, 0.013 * k],
    [0.024, 0.715, z(-0.017), 0.034 * k, 0.012 * k], [0.03, 0.69, z(-0.024), 0.02 * k, 0.008 * k]], { segs: 8, cap: 'bottom' }),
  loft([[0.03, 0.86, z(-0.004), 0.015 * k, 0.012 * k], [0.052, 0.815, z(-0.009), 0.012 * k, 0.011 * k], [0.06, 0.772, z(-0.014), 0.007 * k, 0.007 * k]], { segs: 6, cap: 'bottom' })];
}
/** A shoe lying along x with a flat sole; the ankle joint sits above x = 0. Vertices near the ground are painted as the sole. */
export function shoe(side, Z, upper, sole, bulk = 1) {
  const z = side * (Z - 0.01), g = loft([[-0.03, -0.074, z, 0.012, 0.012], [-0.034, -0.064, z, 0.05, 0.034], [-0.036, -0.02, z, 0.062, 0.041], [-0.034, 0.03, z, 0.056, 0.044], [-0.026, 0.08, z, 0.042, 0.047],
    [-0.022, 0.13, z, 0.034, 0.048], [-0.018, 0.17, z, 0.028, 0.041], [-0.016, 0.196, z, 0.016, 0.022]].map(([h, x, zz, rh, rw]) => [h * bulk, x, zz, rh * bulk, rw * bulk]), { segs: 10, n: 2.6, cap: 'both' }).rotateZ(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
  g.computeVertexNormals(); tag(g, upper, LEG, side, 1);
  const c = g.attributes.color; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.016) c.setXYZ(i, ...sole);
  return g;
}

export const HEAD = 1.642;
/** Skull surface along a unit direction (x forward): a cranium that narrows to the jaw and tucks in at the nape. */
export function headPt(dx, dy, dz, grow = 0) {
  const dn = Math.max(0, -dy), rx = dx > 0 ? 0.092 : 0.1 * (1 - 0.42 * sm(0.2, 0.95, dn)), ry = dy > 0 ? 0.108 : 0.124, rz = 0.077 * (1 + 0.16 * sm(0.2, 0.7, dn) * (1 - sm(0.72, 1, dn)));
  return [dx * (rx + grow) + 0.026 * sm(0, 1, dn), HEAD + dy * (ry + grow), dz * (rz + grow)];
}
/** A sphere reshaped by fn(direction) → point. */
export function shaped(fn, segs, rows) {
  const g = new THREE.SphereGeometry(1, segs, rows), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, ...fn(p.getX(i), p.getY(i), p.getZ(i)));
  g.computeVertexNormals(); return g;
}
/** Head with eye sockets and chin; `faceX(y, z)` finds the face surface so features can be set into it. */
export function head() {
  const g = shaped((dx, dy, dz) => {
    const p = headPt(dx, dy, dz);
    if (dx > 0) p[0] += 0.011 * Math.exp(-(((p[1] - 1.535) / 0.02) ** 2) - (p[2] / 0.03) ** 2) - 0.008 * Math.exp(-(((p[1] - 1.647) / 0.013) ** 2) - ((Math.abs(p[2]) - 0.032) / 0.017) ** 2);
    return p;
  }, 20, 14), p = g.attributes.position;
  const faceX = (y, z) => { let best = 0, d = 1e9; for (let i = 0; i < p.count; i++) { const e = (p.getY(i) - y) ** 2 + (p.getZ(i) - z) ** 2; if (p.getX(i) > 0 && e < d) { d = e; best = p.getX(i); } } return best; };
  return { g, faceX };
}
/** A shell over the skull wherever mask(direction) > 0 (hair, coif); the rest hides inside the head. */
export const shell = (mask, thick) => shaped((dx, dy, dz) => { const m = mask(dx, dy, dz); return headPt(dx, dy, dz, m > 0 ? thick * m * (1 + 0.5 * Math.max(0, dy)) : -0.015); }, 20, 12);
export const hairline = (drop) => (dx, dy, dz) => sm(-0.08, 0.12, dy * 0.9 - dx * 0.85 + 0.2 + drop - 0.22 * Math.abs(dz));
