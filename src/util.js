import * as THREE from 'three';

// ---------- seeded random ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ---------- geometry helpers ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _c = new THREE.Color();

/** Bake a transform and a flat vertex colour into a geometry (returned non-indexed). */
export function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(_m);
  _c.set(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export const box = (w, h, d, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) =>
  part(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
export const cyl = (rt, rb, h, color, x = 0, y = 0, z = 0, seg = 6, rx = 0, ry = 0, rz = 0) =>
  part(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz);
export const cone = (r, h, color, x = 0, y = 0, z = 0, seg = 6, rx = 0, ry = 0, rz = 0) =>
  part(new THREE.ConeGeometry(r, h, seg), color, x, y, z, rx, ry, rz);
export const ball = (r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 0) =>
  part(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, 0, 0, 0, sx, sy, sz);

/** Merge non-indexed geometries that carry position / normal / color. */
export function merge(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o);
    nor.set(g.attributes.normal.array, o);
    col.set(g.attributes.color.array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

export const vcMat = (opts = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...opts });

/** Triangular prism (gable roof) sitting on y=0, ridge along z. */
export function prismGeo(w, h, d) {
  const x = w / 2, z = d / 2;
  const v = [
    -x, 0, z, x, 0, z, 0, h, z,           // front
    x, 0, -z, -x, 0, -z, 0, h, -z,        // back
    -x, 0, -z, -x, 0, z, 0, h, z, -x, 0, -z, 0, h, z, 0, h, -z,   // left slope
    x, 0, z, x, 0, -z, 0, h, -z, x, 0, z, 0, h, -z, 0, h, z,      // right slope
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}
