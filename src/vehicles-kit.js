// Building blocks for vehicles: one material whose finish is set per vertex, and smooth lofted / swept / revolved skins.
import * as THREE from 'three';
import { cr } from './organic.js?v=fea1c89f';

// =====================================================================================
// Finishes and the material that reads them
// =====================================================================================
/** A finish: colour plus [roughness, metalness, glow, how much of the per-instance paint colour it takes]. */
export const fin = (color, rough = 0.7, metal = 0, glow = 0, paint = 0) => { const c = new THREE.Color(color); return { c: [c.r, c.g, c.b], s: [rough, metal, glow, paint] }; };

/** Standard material driven by the `surf` vertex attribute, so paint, glass, chrome, rubber and lamps share one draw call. */
export function vehicleMat(opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => {
    // wheels roll: `spin` holds each wheel vertex's axle (x, y) and radius, and the distance travelled comes from the instance's own position
    const roll = (v) => `
      #ifdef USE_INSTANCING
        if (spin.z > 0.0) { float ra = -dot(instanceMatrix[3].xyz, normalize(instanceMatrix[0].xyz)) / spin.z, rc = cos(ra), rs = sin(ra); ${v} }
      #endif`;
    sh.vertexShader = 'attribute vec4 surf;\nattribute vec3 spin;\nvarying vec4 vSurf;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>' + roll('objectNormal.xy = vec2(objectNormal.x * rc - objectNormal.y * rs, objectNormal.x * rs + objectNormal.y * rc);'))
      .replace('#include <begin_vertex>', '#include <begin_vertex>' + roll('vec2 rq = transformed.xy - spin.xy; transformed.xy = spin.xy + vec2(rq.x * rc - rq.y * rs, rq.x * rs + rq.y * rc);'))
      .replace('#include <color_vertex>', `vSurf = surf; vColor = color;
      #ifdef USE_INSTANCING_COLOR
        vColor *= mix(vec3(1.0), instanceColor, surf.w);
      #endif`);
    sh.fragmentShader = 'varying vec4 vSurf;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurf.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurf.y;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance += vColor * vSurf.z;');
  };
  return m;
}

// =====================================================================================
// A bag of triangles
// =====================================================================================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _n3 = new THREE.Matrix3();
const NO_AXLE = [0, 0, 0];
const SPHERE = new THREE.SphereGeometry(1, 10, 7).toNonIndexed(), BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
export class Bag {
  constructor() { this.p = []; this.n = []; this.c = []; this.s = []; this.w = []; this.axle = null; }   // axle: [x, y, radius] while a wheel is being built
  get tris() { return this.p.length / 9; }
  vert(p, n, f) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(f.c[0], f.c[1], f.c[2]); this.s.push(f.s[0], f.s[1], f.s[2], f.s[3]); this.w.push(...(this.axle || NO_AXLE)); }
  /** Add a three.js geometry, transformed by matrix m. `own` keeps its vertex colours (multiplied by the finish colour). */
  add(geo, f, m, own = false) {
    const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, N = g.attributes.normal, C = own && g.attributes.color;
    if (m) _n3.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i); if (m) _v.applyMatrix4(m); this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i); if (m) _v.applyMatrix3(_n3).normalize(); this.n.push(_v.x, _v.y, _v.z);
      this.c.push(f.c[0] * (C ? C.getX(i) : 1), f.c[1] * (C ? C.getY(i) : 1), f.c[2] * (C ? C.getZ(i) : 1)); this.s.push(...f.s); this.w.push(...(this.axle || NO_AXLE));
    }
    return this;
  }
  box(f, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) { return this.add(BOX, f, at(x, y, z, rx, ry, rz, w, h, d)); }
  ball(f, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) { return this.add(SPHERE, f, at(x, y, z, rx, ry, rz, sx, sy, sz)); }
  cyl(f, rt, rb, h, x, y, z, seg = 8, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), f, at(x, y, z, rx, ry, rz)); }
  /** A straight round bar from a to b. */
  rod(f, a, b, r, seg = 5, r2 = r) {
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const l = _v.length();
    _m.compose(_s.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q.setFromUnitVectors(UP, _v.normalize()), ONE);
    return this.add(new THREE.CylinderGeometry(r2, r, l, seg, 1, true), f, _m);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('surf', new THREE.Float32BufferAttribute(this.s, 4));
    g.setAttribute('spin', new THREE.Float32BufferAttribute(this.w, 3));
    return g;
  }
}
const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
export const at = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// =====================================================================================
// Curves and skins
// =====================================================================================
/** Smooth function through control points [[x, y], …] that never overshoots them (monotone cubic); flat beyond the ends. */
export function curve(pts) {
  if (typeof pts === 'number') return () => pts;
  const n = pts.length, d = [], m = [];
  for (let k = 0; k < n - 1; k++) d.push((pts[k + 1][1] - pts[k][1]) / (pts[k + 1][0] - pts[k][0]));
  for (let k = 0; k < n; k++) m.push(k === 0 ? d[0] : k === n - 1 ? d[n - 2] : d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2);
  for (let k = 0; k < n - 1; k++) {
    if (d[k] === 0) { m[k] = m[k + 1] = 0; continue; }
    const a = m[k] / d[k], b = m[k + 1] / d[k], h = Math.hypot(a, b);
    if (h > 3) { m[k] = (3 / h) * a * d[k]; m[k + 1] = (3 / h) * b * d[k]; }
  }
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1]; if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let k = 0; while (x > pts[k + 1][0]) k++;
    const h = pts[k + 1][0] - pts[k][0], t = (x - pts[k][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * pts[k][1] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * pts[k + 1][1] + (t3 - t2) * h * m[k + 1];
  };
}

/**
 * Skin a grid of points P[i][j] = [x, y, z]. f(i, j) gives the finish of each quad (null leaves a hole).
 * Normals are smoothed across neighbouring quads unless they meet at more than the crease angle.
 * The outside is the side from which i runs to the right while j runs up; `flip` turns it over, `both` makes a two-sided sheet.
 */
export function skin(bag, P, f, { wrap = false, flip = false, crease = 0.72, both = false } = {}) {
  const ni = P.length, nj = P[0].length, qj = wrap ? nj : nj - 1, fn = typeof f === 'function' ? f : () => f;
  const N = [], U = [];
  for (let i = 0; i < ni - 1; i++) for (let j = 0; j < qj; j++) {
    const a = P[i][j], b = P[i + 1][j], c = P[i][(j + 1) % nj], d = P[i + 1][(j + 1) % nj];
    const ux = d[0] - a[0], uy = d[1] - a[1], uz = d[2] - a[2], vx = c[0] - b[0], vy = c[1] - b[1], vz = c[2] - b[2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], l = Math.hypot(...n) || 1;
    N.push(n); U.push([n[0] / l, n[1] / l, n[2] / l]);
  }
  const q = (i, j) => { if (wrap) j = (j + qj) % qj; return i < 0 || i >= ni - 1 || j < 0 || j >= qj ? -1 : i * qj + j; };
  const normal = (i, j, k, sgn) => {   // normal of quad k at grid vertex (i, j)
    const u = U[k], n = [0, 0, 0];
    for (const o of [q(i - 1, j - 1), q(i - 1, j), q(i, j - 1), q(i, j)]) if (o >= 0 && (o === k || U[o][0] * u[0] + U[o][1] * u[1] + U[o][2] * u[2] > crease)) { n[0] += N[o][0]; n[1] += N[o][1]; n[2] += N[o][2]; }
    const l = (Math.hypot(...n) || 1) * sgn; return [n[0] / l, n[1] / l, n[2] / l];
  };
  for (let i = 0; i < ni - 1; i++) for (let j = 0; j < qj; j++) {
    const k = i * qj + j, j1 = (j + 1) % nj, fi = N[k][0] || N[k][1] || N[k][2] ? fn(i, j) : null;   // collapsed quads are dropped
    if (!fi) continue;
    for (const sgn of both ? [1, -1] : [flip ? -1 : 1]) {
      const c = [[i, j], [i + 1, j], [i, j1], [i + 1, j1]].map(([a, b], o) => [P[a][b], normal(a, o < 2 ? j : j + 1, k, sgn)]);
      for (const o of sgn > 0 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]) bag.vert(c[o][0], c[o][1], fi);
    }
  }
}

/**
 * Loft a skin through stations xs along x. ring(x, i) → [[y, z, dx?], …]: by default half a section from bottom centre
 * to top centre, mirrored in z; with `full` a whole closed section. f(i, strip, side) → finish; caps: [finish, finish] closes the ends.
 */
export function loft(bag, xs, ring, f, { full = false, caps, ...o } = {}) {
  let n = 0;
  const P = xs.map((x, i) => {
    const h = ring(x, i), pts = h.map(([y, z, dx = 0]) => [x + dx, y, z]); n = h.length;
    if (!full) for (let k = n - 2; k >= 1; k--) pts.push([x + (h[k][2] || 0), h[k][0], -h[k][1]]);
    return pts;
  });
  const fn = typeof f === 'function' ? f : () => f;
  skin(bag, P, full ? fn : (i, j) => (j < n - 1 ? fn(i, j, 1) : fn(i, 2 * n - 3 - j, -1)), { wrap: true, ...o });
  if (caps) [P[0], P[P.length - 1]].forEach((ring, e) => caps[e] && cap(bag, ring, caps[e], !e));
  return P;
}
/** Close a ring of points with a fan around its centre. */
export function cap(bag, ring, f, flip) {
  const c = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length, s[2] + p[2] / ring.length], [0, 0, 0]);
  skin(bag, [ring.map(() => c), ring], f, { wrap: true, flip });
}

/**
 * Sweep a closed section [[a, b], …] along a smoothed path [[x, y, z, scale?], …]. `ref` is the direction the section's
 * b axis leans towards (up for a path on the ground, sideways for one in a vertical plane).
 */
export function sweep(bag, path, section, f, { ref = [0, 1, 0], sub = 4, caps = true, crease = 0.5 } = {}) {
  const S = [];
  for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < sub; k++) S.push(cr(path[Math.max(0, i - 1)], path[i], path[i + 1], path[Math.min(path.length - 1, i + 2)], k / sub));
  S.push(path[path.length - 1]);
  let area = 0; section.forEach(([a, b], k) => { const [c, d] = section[(k + 1) % section.length]; area += a * d - c * b; });
  const sec = area > 0 ? [...section].reverse() : section, R = new THREE.Vector3(...ref), T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
  const P = S.map((c, j) => {
    const a = S[Math.max(0, j - 1)], b = S[Math.min(S.length - 1, j + 1)], s = c[3] === undefined ? 1 : c[3];
    T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); Nn.crossVectors(R, T).normalize(); B.crossVectors(T, Nn);
    return sec.map(([u, v]) => [c[0] + (Nn.x * u + B.x * v) * s, c[1] + (Nn.y * u + B.y * v) * s, c[2] + (Nn.z * u + B.z * v) * s]);
  });
  skin(bag, P, f, { wrap: true, crease });
  if (caps) { cap(bag, P[0], typeof f === 'function' ? f(0, 0) : f, true); cap(bag, P[P.length - 1], typeof f === 'function' ? f(S.length - 2, 0) : f, false); }
}
/** Section shapes for sweeps: an ellipse and a rounded slab. */
export const oval = (a, b, n = 8) => Array.from({ length: n }, (_, k) => [a * Math.cos((k / n) * Math.PI * 2), b * Math.sin((k / n) * Math.PI * 2)]);

/** Revolve a profile [[axial, radius], …] around the x axis (then place it with matrix m). f(i, j) → finish. */
export function revolve(bag, prof, f, m, seg = 16, o = {}) {
  const P = prof.map(([a, r]) => Array.from({ length: seg }, (_, j) => {
    const t = -(j / seg) * Math.PI * 2; _v.set(a, r * Math.cos(t), r * Math.sin(t)); if (m) _v.applyMatrix4(m); return [_v.x, _v.y, _v.z];
  }));
  skin(bag, P, f, { wrap: true, crease: 0.8, ...o });
}

// =====================================================================================
// Wheels
// =====================================================================================
/** Matrix that puts the x axis of a revolved shape along the axle, outer face away from the car's centre line. */
const axle = (x, y, z, out = Math.sign(z) || 1) => at(x, y, z, 0, out > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
/**
 * A road wheel standing on y = 0 at (x, z); z is the tyre's centre plane. o: { tyre, wall, rim, hub, dark } finishes and
 * `spokes` (number of rim spokes, 0 for a plain dish), `cap` (hubcap dome height).
 */
export function wheel(bag, x, z, r, w, o) {
  bag.axle = [x, r, r];
  const rr = r * (o.rimR || 0.64), h = w / 2, n = o.spokes || 0, seg = n ? n * 4 : 16;
  const prof = [[-h, 0], [-h, r * 0.86], [-h + 0.05, r], [h - 0.05, r], [h - 0.012, r * 0.93], [h, r * 0.82], [h - 0.02, rr],
    [h - 0.022, rr * 0.93], [h - 0.06, rr * 0.84], [h - 0.045 + (o.cap || 0) * 0.5, rr * (o.capR || 0.3)], [h - 0.03 + (o.cap || 0), 0]];
  revolve(bag, prof, (i, j) => (i < 4 ? o.tyre : i < 6 ? (i === 5 && o.wall) || o.tyre : i === 6 ? o.rim : i === 7 ? o.rim : i === 8 ? (n && j % 4 > 1 ? o.dark : o.face || o.rim) : o.hub || o.rim), axle(x, r, z), seg);
  bag.axle = null;
}
/** A spoked wheel (wagons, early cars): thin tyre, felloe, spokes and hub. */
export function spokedWheel(bag, x, z, r, w, n, o) {
  bag.axle = [x, r, r];
  const h = w / 2, ri = r - (o.depth || 0.07), m = axle(x, r, z);
  revolve(bag, [[-h, ri], [-h, r - 0.01], [-h * 0.6, r], [h * 0.6, r], [h, r - 0.01], [h, ri], [-h, ri]], (i) => (i > 0 && i < 4 ? o.tyre : o.rim), m, 20);
  revolve(bag, [[-h * 1.6, 0], [-h * 1.6, o.hubR || 0.06], [h * 1.8, o.hubR || 0.06], [h * 2.4, (o.hubR || 0.06) * 0.6], [h * 2.5, 0]], o.hub || o.rim, m, 8);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    bag.rod(o.spoke || o.rim, [x + c * 0.04, r + s * 0.04, z], [x + c * ri, r + s * ri, z], o.spokeR || 0.014, 4);
  }
  bag.axle = null;
}
