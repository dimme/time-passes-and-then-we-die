import * as THREE from 'three';
import { rng, box, cyl, cone, part, merge, vcMat } from './util.js';
import { yearToU } from './timeline.js';
import { shared } from './textures.js';

const H = Math.PI / 2;

// ---------- organic geometry: a tube swept along a smooth path with a radius profile ----------
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return p1.map((_, i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
/** pts: [x, y, z, radius]. wz squashes or widens the cross-section sideways. Underside is tinted lighter. */
function tube(pts, { segs = 12, sub = 5, wz = 1, vScale = 0.45, belly = 0.3 } = {}) {
  const S = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < sub; k++) S.push(cr(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)], k / sub));
  S.push(pts[pts.length - 1]);
  const pos = [], uv = [], col = [], idx = [], T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), ref = new THREE.Vector3();
  let dist = 0;
  for (let j = 0; j < S.length; j++) {
    const a = S[Math.max(0, j - 1)], b = S[Math.min(S.length - 1, j + 1)], c = S[j], r = Math.max(0.001, c[3]);
    if (j > 0) dist += Math.hypot(c[0] - S[j - 1][0], c[1] - S[j - 1][1], c[2] - S[j - 1][2]);
    T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    ref.set(0, 0, 1); if (Math.abs(T.z) > 0.9) ref.set(1, 0, 0);
    N.crossVectors(ref, T).normalize(); B.crossVectors(T, N);
    for (let k = 0; k <= segs; k++) {
      const an = (k / segs) * Math.PI * 2, cs = Math.cos(an), sn = Math.sin(an);
      pos.push(c[0] + (N.x * cs + B.x * sn * wz) * r, c[1] + (N.y * cs + B.y * sn * wz) * r, c[2] + (N.z * cs + B.z * sn * wz) * r);
      uv.push((k / segs) * 2, dist * vScale);
      const shade = 1 - belly * 0.5 + belly * (1 - (N.y * cs + B.y * sn)) * 0.5; col.push(shade, shade, shade);
    }
  }
  const W = segs + 1;
  for (let j = 0; j < S.length - 1; j++) for (let k = 0; k < segs; k++) { const a = j * W + k, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // close the seam so lighting is continuous around the tube
  const n = g.attributes.normal;
  for (let j = 0; j < S.length; j++) { const a = j * W, b = a + segs, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
  return g;
}
/** A leg hanging down from its hip at the origin. */
const legGeo = (len, r0, r1, bend = 0.12) => tube([[0, 0.2 * r0, 0, r0 * 0.9], [0, -len * 0.08, 0, r0], [bend * len, -len * 0.5, 0, (r0 + r1) * 0.5], [0, -len * 0.92, 0, r1], [r1 * 0.5, -len, 0, r1 * 1.15], [r1 * 0.6, -len - 0.02, 0, 0.01]], { segs: 8, sub: 3, belly: 0.1 });

let SKIN;
function skins() {
  if (SKIN) return SKIN;
  const T = shared();
  const hide = (c, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, map: T.rockMap, normalMap: T.rockNormal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: rough, vertexColors: true });
  const fur = (c) => new THREE.MeshStandardMaterial({ color: c, map: T.groundMap, normalMap: T.barkNormal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 1, vertexColors: true });
  SKIN = { hide, fur, ivory: new THREE.MeshStandardMaterial({ color: 0xece2c6, roughness: 0.45, vertexColors: true }), eye: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.05, metalness: 0.3 }) };
  return SKIN;
}

// ---------- animals: each factory returns { obj, legs: [[mesh, phase]], wings: [[mesh, side]] } ----------
const eyeGeo = new THREE.SphereGeometry(1, 10, 8);
function assemble(body, mat, legSpec, legG, extra, eyes) {
  const obj = new THREE.Group(), legs = [];
  if (eyes) for (const s of [1, -1]) { const e = new THREE.Mesh(eyeGeo, skins().eye); e.position.set(eyes[0], eyes[1], s * eyes[2]); e.scale.setScalar(eyes[3]); obj.add(e); }
  const bm = new THREE.Mesh(body, mat); obj.add(bm);
  for (const [x, y, z, ph] of legSpec) { const l = new THREE.Mesh(legG, mat); l.position.set(x, y, z); obj.add(l); legs.push([l, ph]); }
  if (extra) obj.add(extra);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { obj, legs, wings: [] };
}
function makers() {
  const S = skins(), M = {};
  { // sauropod
    const body = tube([[-13.5, 3.2, 0, 0.06], [-9.5, 4.4, 0, 0.42], [-5.8, 5.3, 0, 1.0], [-3, 5.7, 0, 1.95], [0, 5.9, 0, 2.45], [3, 6.1, 0, 2.05], [5, 7.3, 0, 1.05], [7.1, 10.0, 0, 0.64], [9.1, 12.5, 0, 0.5], [10.3, 13.3, 0, 0.47], [11.3, 13.25, 0, 0.5], [12.2, 13.0, 0, 0.34], [12.6, 12.9, 0, 0.04]], { wz: 0.82, segs: 14 });
    const leg = legGeo(4.9, 0.78, 0.62, 0.05), mat = S.hide(0x7c8468);
    M.sauropod = () => assemble(body, mat, [[3.1, 4.9, 1.45, 0], [3.1, 4.9, -1.45, Math.PI], [-2.9, 4.9, 1.45, Math.PI], [-2.9, 4.9, -1.45, 0]], leg, null, [11.5, 13.45, 0.36, 0.09]);
  }
  { // theropod
    const body = tube([[-6.2, 3.5, 0, 0.04], [-3.2, 3.35, 0, 0.4], [-1.1, 3.2, 0, 0.86], [0.5, 3.3, 0, 1.02], [1.8, 3.7, 0, 0.72], [2.6, 4.45, 0, 0.4], [3.3, 5.1, 0, 0.6], [4.3, 4.98, 0, 0.5], [5.0, 4.8, 0, 0.3], [5.3, 4.72, 0, 0.03]], { wz: 0.7, segs: 12 });
    const arms = merge([tube([[1.9, 3.3, 0.45, 0.13], [2.4, 2.7, 0.5, 0.09], [2.8, 2.6, 0.5, 0.03]], { segs: 6, sub: 2 }).toNonIndexed(), tube([[1.9, 3.3, -0.45, 0.13], [2.4, 2.7, -0.5, 0.09], [2.8, 2.6, -0.5, 0.03]], { segs: 6, sub: 2 }).toNonIndexed()]);
    const leg = legGeo(3.05, 0.5, 0.2, -0.22);
    for (const [name, c] of [['theropod', 0x8a6040], ['raptor', 0x6a7044]]) { const mat = S.hide(c); M[name] = () => assemble(body, mat, [[0.1, 3.1, 0.6, 0], [0.1, 3.1, -0.6, Math.PI]], leg, new THREE.Mesh(arms, mat), [3.75, 5.3, 0.33, 0.09]); }
  }
  { // stegosaur
    const body = tube([[-5.6, 1.5, 0, 0.04], [-3.5, 2.0, 0, 0.45], [-1.5, 2.7, 0, 1.2], [0, 3.0, 0, 1.5], [1.5, 2.6, 0, 1.2], [2.8, 1.8, 0, 0.55], [3.6, 1.35, 0, 0.34], [4.3, 1.22, 0, 0.2], [4.55, 1.2, 0, 0.03]], { wz: 0.8 });
    const plates = [];
    for (let i = 0; i < 9; i++) { const x = -3 + i * 0.75, y = 3.5 + 0.9 * Math.sin((i / 8) * Math.PI) + (i > 6 ? -0.7 * (i - 6) : 0), s = 0.55 + 0.6 * Math.sin((i / 8) * Math.PI); plates.push(part(new THREE.ConeGeometry(s * 0.7, s * 1.6, 4), 0xffffff, x, y, (i % 2 ? 0.14 : -0.14), 0, 0, 0, 1, 1, 0.16)); }
    const mat = S.hide(0x7c7848), pm = S.hide(0xa8663c), leg = legGeo(1.9, 0.42, 0.34, 0.06);
    M.stego = () => assemble(body, mat, [[1.6, 1.9, 0.85, 0], [1.6, 1.9, -0.85, Math.PI], [-1.6, 1.9, 0.9, Math.PI], [-1.6, 1.9, -0.9, 0]], leg, new THREE.Mesh(merge(plates), pm), [3.9, 1.42, 0.2, 0.05]);
  }
  { // flyers: pterosaurs, later birds
    const body = tube([[-1.3, 0, 0, 0.02], [-0.6, 0, 0, 0.22], [0.2, 0.05, 0, 0.3], [0.8, 0.2, 0, 0.14], [1.2, 0.45, 0, 0.16], [2.0, 0.4, 0, 0.07], [2.9, 0.3, 0, 0.01]], { segs: 8, sub: 3 });
    const wing = new THREE.BufferGeometry();
    const wp = [0.5, 0, 0, 1.0, 0, 2.6, -0.9, 0, 0.2, 1.0, 0, 2.6, 0.3, 0, 5.2, -0.9, 0, 0.2, -0.9, 0, 0.2, 0.3, 0, 5.2, -0.6, 0, 2.6];
    wing.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wing.setAttribute('uv', new THREE.Float32BufferAttribute(wp.filter((_, i) => i % 3 !== 1).map((v) => v * 0.3), 2));
    wing.setAttribute('color', new THREE.Float32BufferAttribute(new Array(27).fill(1), 3)); wing.computeVertexNormals();
    for (const [name, c] of [['pterosaur', 0x8a705c], ['bird', 0x3a3a3e]]) {
      const mat = S.hide(c), wm = S.hide(c); wm.side = THREE.DoubleSide;
      M[name] = () => { const a = assemble(body, mat, [], null); for (const s of [1, -1]) { const w = new THREE.Mesh(wing, wm); w.scale.z = s; w.castShadow = true; a.obj.add(w); a.wings.push([w, s]); } return a; };
    }
  }
  // four-legged mammals from one recipe
  const quad = ({ len, h, girth, neck, rise, headL, headR, tail = 0.4, mat, legR, horn, antler, wz = 0.85 }) => {
    const nx = len / 2 + neck * 0.75, ny = h + rise;
    const body = tube([[-len / 2 - tail, h * 0.78, 0, 0.02], [-len / 2 - tail * 0.3, h * 0.95, 0, girth * 0.25], [-len / 2, h, 0, girth * 0.82], [-len * 0.15, h + girth * 0.04, 0, girth], [len * 0.28, h + girth * 0.08, 0, girth * 1.04], [len / 2, h + rise * 0.35, 0, girth * 0.72],
      [nx, ny, 0, headR * 1.05], [nx + headL * 0.45, ny + headR * 0.1, 0, headR], [nx + headL * 0.95, ny - headR * 0.5, 0, headR * 0.62], [nx + headL * 1.05, ny - headR * 0.55, 0, 0.02]], { wz });
    const leg = legGeo(h - girth * 0.3, legR, legR * 0.7, 0.05), hip = h - girth * 0.3;
    const extras = [];
    if (horn) extras.push(part(new THREE.ConeGeometry(headR * 0.4, horn, 7), 0xffffff, nx + headL * 0.75, ny + horn * 0.45, 0));
    if (antler) for (const s of [-1, 1]) { extras.push(tube([[nx + 0.05, ny + headR * 0.7, s * 0.08, 0.035], [nx - 0.1, ny + headR + antler * 0.5, s * 0.25, 0.03], [nx + 0.1, ny + headR + antler, s * 0.4, 0.012]], { segs: 5, sub: 3 }).toNonIndexed(), tube([[nx - 0.06, ny + headR + antler * 0.45, s * 0.22, 0.025], [nx + 0.3, ny + headR + antler * 0.7, s * 0.3, 0.01]], { segs: 5, sub: 2 }).toNonIndexed()); }
    const ex = extras.length ? merge(extras) : null;
    return () => assemble(body, mat, [[len / 2 - girth * 0.5, hip, girth * 0.5, 0], [len / 2 - girth * 0.5, hip, -girth * 0.5, Math.PI], [-len / 2 + girth * 0.45, hip, girth * 0.5, Math.PI], [-len / 2 + girth * 0.45, hip, -girth * 0.5, 0]], leg, ex && new THREE.Mesh(ex, skins().ivory), [nx + headL * 0.45, ny + headR * 0.45, headR * 0.72, headR * 0.2]);
  };
  M.deer = quad({ len: 1.5, h: 1.25, girth: 0.3, neck: 0.5, rise: 0.75, headL: 0.42, headR: 0.13, tail: 0.15, mat: S.fur(0xa87848), legR: 0.075, antler: 0.75 });
  M.doe = quad({ len: 1.4, h: 1.15, girth: 0.28, neck: 0.45, rise: 0.65, headL: 0.4, headR: 0.12, tail: 0.15, mat: S.fur(0xb08858), legR: 0.07 });
  M.small = quad({ len: 0.9, h: 0.55, girth: 0.2, neck: 0.25, rise: 0.25, headL: 0.3, headR: 0.1, tail: 0.5, mat: S.fur(0x7a5c44), legR: 0.06 });
  M.bronto = quad({ len: 3.6, h: 2.3, girth: 0.95, neck: 0.8, rise: 0.15, headL: 1.1, headR: 0.42, tail: 0.6, mat: S.hide(0x7a7268), legR: 0.32, horn: 0.9 });
  M.horse = quad({ len: 1.9, h: 1.55, girth: 0.42, neck: 0.75, rise: 0.8, headL: 0.6, headR: 0.17, tail: 0.7, mat: S.fur(0x6a4428), legR: 0.1 });
  { // mammoth / mastodon: domed head, sloping back, trunk and tusks
    const mk = (hump, c) => {
      const body = tube([[-2.95, 2.1, 0, 0.04], [-2.5, 2.9, 0, 0.5], [-1.3, 3.35, 0, 1.15], [0.4, 3.6 + hump, 0, 1.38], [1.6, 3.9 + hump, 0, 1.02], [2.35, 4.0 + hump, 0, 0.86], [2.95, 3.4 + hump * 0.5, 0, 0.6], [3.2, 2.5, 0, 0.3], [3.3, 1.5, 0, 0.21], [3.5, 0.65, 0, 0.15], [3.9, 0.42, 0, 0.1], [4.05, 0.46, 0, 0.02]], { wz: 0.86, segs: 14 });
      const tusks = merge([1, -1].map((s) => tube([[2.75, 3.0 + hump * 0.4, s * 0.38, 0.15], [3.35, 1.9, s * 0.62, 0.14], [4.3, 1.45, s * 0.56, 0.1], [5.0, 2.2, s * 0.3, 0.02]], { segs: 7, sub: 5, belly: 0 }).toNonIndexed()));
      const mat = S.fur(c), leg = legGeo(2.75, 0.46, 0.4, 0.03);
      return () => assemble(body, mat, [[1.5, 2.8, 0.72, 0], [1.5, 2.8, -0.72, Math.PI], [-1.6, 2.8, 0.72, Math.PI], [-1.6, 2.8, -0.72, 0]], leg, new THREE.Mesh(tusks, skins().ivory), [2.75, 3.75 + hump * 0.8, 0.62, 0.09]);
    };
    M.mammoth = mk(0.45, 0x70482a); M.mastodon = mk(0.05, 0x5c4a3c);
  }
  return M;
}

// ---------- wandering animals ----------
class Herd {
  constructor(world, scene) { this.world = world; this.scene = scene; this.list = []; this.r = rng(77); }
  add(make, n, from, to, { R = [20, 70], speed = 1.5, fly = 0, scale = [0.8, 1.2], stride = 2 } = {}) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const a = make(), sc = scale[0] + r() * (scale[1] - scale[0]); a.obj.scale.setScalar(sc);
      const Rr = R[0] + r() * (R[1] - R[0]), v = speed * (0.7 + r() * 0.6);
      this.list.push({ ...a, cx: (r() * 2 - 1) * (215 - Rr), cz: (r() * 2 - 1) * 260, R: Rr, w: (v / Rr) * (r() < 0.5 ? -1 : 1), gait: v / (stride * sc), ph: r() * 6.28, u0: yearToU(from), u1: yearToU(to), fly: fly && fly * (0.6 + r() * 0.8), in: false });
    }
  }
  update(u, t) {
    for (const a of this.list) {
      const vis = u >= a.u0 && u < a.u1;
      if (vis !== a.in) { a.in = vis; vis ? this.scene.add(a.obj) : this.scene.remove(a.obj); }
      if (!vis) continue;
      const ang = a.ph + t * a.w, x = a.cx + Math.cos(ang) * a.R, z = a.cz + Math.sin(ang) * a.R, s = Math.sign(a.w), g = t * a.gait * 3 + a.ph;
      a.obj.position.set(x, a.fly ? a.fly + Math.sin(t * 0.4 + a.ph) * 4 : this.world.surfaceAt(x, z) + Math.abs(Math.sin(g)) * 0.04 * a.obj.scale.x, z);
      a.obj.rotation.y = Math.atan2(-Math.cos(ang) * s, -Math.sin(ang) * s);
      for (const [leg, ph] of a.legs) leg.rotation.z = Math.sin(g + ph) * 0.42;
      for (const [wing, side] of a.wings) wing.rotation.x = -side * (0.15 + Math.sin(t * (a.fly > 0 && a.obj.scale.x < 0.6 ? 9 : 3.2) + a.ph) * 0.5);
      if (a.fly) a.obj.rotation.z = Math.sin(t * 0.7 + a.ph) * 0.1;
    }
  }
}

// ---------- people & vehicles ----------
const paint = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55 });
const matte = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, ...o });
const glassy = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.85 });
const white = (g) => part(g.index ? g.toNonIndexed() : g, 0xffffff);
function extrude(pts, depth, bevel = 0.06) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(depth - bevel * 2) / 2); return g;
}
const wheel = (x, z, r = 0.34, w = 0.24) => [cyl(r, r, w, 0x141414, x, r, z, 14, H, 0, 0), cyl(r * 0.55, r * 0.55, w + 0.02, 0x8a8e92, x, r, z, 10, H, 0, 0)];

function person() {
  const limb = (pts) => white(tube(pts, { segs: 6, sub: 2, belly: 0 }));
  const clothes = merge([
    white(tube([[0, 0.82, 0, 0.13], [0, 0.95, 0, 0.17], [0, 1.25, 0, 0.19], [0, 1.45, 0, 0.17], [0, 1.52, 0, 0.07]], { segs: 8, sub: 2, wz: 1.35, belly: 0 })),
    limb([[0, 0.86, 0.09, 0.09], [0.12, 0.45, 0.09, 0.075], [0.22, 0.06, 0.09, 0.06]]), limb([[0, 0.86, -0.09, 0.09], [-0.08, 0.45, -0.09, 0.075], [-0.2, 0.06, -0.09, 0.06]]),
    limb([[0, 1.42, 0.26, 0.06], [-0.06, 1.15, 0.28, 0.05], [-0.12, 0.92, 0.27, 0.04]]), limb([[0, 1.42, -0.26, 0.06], [0.08, 1.15, -0.28, 0.05], [0.16, 0.92, -0.27, 0.04]]),
    box(0.26, 0.07, 0.1, 0x2a2420, 0.27, 0.035, 0.09), box(0.26, 0.07, 0.1, 0x2a2420, -0.16, 0.035, -0.09),
  ]);
  const skin = merge([white(new THREE.SphereGeometry(0.115, 12, 10).translate(0.01, 1.64, 0)), white(new THREE.SphereGeometry(0.045, 6, 5).translate(-0.13, 0.88, 0.27)), white(new THREE.SphereGeometry(0.045, 6, 5).translate(0.17, 0.88, -0.27)),
    part(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), 0x2a2018, 0, 1.655, 0)]);
  return [{ geo: clothes, mat: matte() }, { geo: skin, mat: matte({ roughness: 0.6 }), tintKey: 'skin' }];
}
function cartParts() {
  const horse = makers.cache.horse().obj; horse.updateMatrixWorld(true);
  const hg = []; horse.traverse((o) => { if (o.isMesh) { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); hg.push(part(g, 0x6a4428, 2.6, 0, 0)); } });
  const wood = [box(2.5, 0.12, 1.4, 0x6a4c2c, -0.6, 0.95, 0), box(2.5, 0.5, 0.06, 0x5a3e24, -0.6, 1.25, 0.7), box(2.5, 0.5, 0.06, 0x5a3e24, -0.6, 1.25, -0.7), box(0.06, 0.5, 1.4, 0x5a3e24, -1.85, 1.25, 0), box(1.6, 0.7, 1.2, 0x9a8a68, -0.8, 1.6, 0),
    box(2.2, 0.06, 0.06, 0x3a2a1c, 1.5, 1.0, 0.5), box(2.2, 0.06, 0.06, 0x3a2a1c, 1.5, 1.0, -0.5)];
  for (const z of [0.78, -0.78]) for (const x of [0.1, -1.4]) { wood.push(part(new THREE.TorusGeometry(0.55, 0.05, 6, 16), 0x2a2018, x, 0.6, z)); for (let k = 0; k < 4; k++) wood.push(box(1.05, 0.04, 0.04, 0x3a2a1c, x, 0.6, z, 0, 0, (k * Math.PI) / 4)); }
  return [{ geo: merge([...hg, ...wood]), mat: matte({ roughness: 0.9 }), tint: false }];
}
function carParts(style) {
  if (style === 'old') {
    const body = white(extrude([[-1.9, 0.5], [-1.9, 1.0], [-1.75, 1.85], [0.2, 1.85], [0.3, 1.15], [1.75, 1.05], [1.85, 0.5]], 1.5, 0.04));
    const trim = merge([...wheel(1.2, 0.8, 0.42, 0.14), ...wheel(1.2, -0.8, 0.42, 0.14), ...wheel(-1.2, 0.8, 0.42, 0.14), ...wheel(-1.2, -0.8, 0.42, 0.14),
      box(1.0, 0.06, 0.34, 0x101010, 1.2, 0.9, 0.82), box(1.0, 0.06, 0.34, 0x101010, 1.2, 0.9, -0.82), box(1.0, 0.06, 0.34, 0x101010, -1.2, 0.9, 0.82), box(1.0, 0.06, 0.34, 0x101010, -1.2, 0.9, -0.82),
      box(0.08, 0.5, 1.0, 0xb0a070, 1.88, 0.85, 0), cyl(0.12, 0.12, 0.1, 0xfff4c0, 1.9, 1.0, 0.55, 10, 0, 0, H), cyl(0.12, 0.12, 0.1, 0xfff4c0, 1.9, 1.0, -0.55, 10, 0, 0, H)]);
    const glass = merge([box(1.3, 0.55, 1.53, 0x1c2228, -0.75, 1.5, 0), box(0.04, 0.55, 1.3, 0x1c2228, 0.27, 1.5, 0)]);
    return [{ geo: body, mat: paint() }, { geo: trim, mat: matte(), tint: false }, { geo: glass, mat: glassy(), tint: false }];
  }
  if (style === 'pod') {
    const body = white(new THREE.SphereGeometry(1, 24, 14).scale(2.1, 0.72, 0.95).translate(0, 0.92, 0));
    const glass = part(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1.75, 0.76, 0.9), 0x14202a, 0.1, 0.95, 0);
    const trim = merge([...wheel(1.2, 0.78, 0.3, 0.2), ...wheel(1.2, -0.78, 0.3, 0.2), ...wheel(-1.2, 0.78, 0.3, 0.2), ...wheel(-1.2, -0.78, 0.3, 0.2), box(0.06, 0.08, 1.5, 0xc8f4ff, 2.05, 0.9, 0), box(0.06, 0.08, 1.5, 0xff3040, -2.05, 0.9, 0)]);
    return [{ geo: body, mat: paint() }, { geo: trim, mat: matte(), tint: false }, { geo: glass, mat: glassy(), tint: false }];
  }
  const body = white(extrude([[-2.2, 0.32], [-2.22, 0.78], [-1.95, 0.95], [-1.3, 1.0], [-0.8, 1.42], [0.5, 1.42], [1.15, 1.0], [2.0, 0.9], [2.2, 0.68], [2.2, 0.32]], 1.78));
  const glass = part(extrude([[-1.22, 1.0], [-0.76, 1.37], [0.47, 1.37], [1.06, 1.0]], 1.81, 0.02), 0x10161c);
  const trim = merge([...wheel(1.35, 0.82), ...wheel(1.35, -0.82), ...wheel(-1.35, 0.82), ...wheel(-1.35, -0.82),
    box(0.05, 0.12, 0.4, 0xfff6d8, 2.2, 0.72, 0.6), box(0.05, 0.12, 0.4, 0xfff6d8, 2.2, 0.72, -0.6), box(0.05, 0.12, 0.4, 0xc01818, -2.22, 0.8, 0.6), box(0.05, 0.12, 0.4, 0xc01818, -2.22, 0.8, -0.6), box(0.06, 0.2, 1.7, 0x1a1a1a, 2.21, 0.42, 0), box(0.06, 0.2, 1.7, 0x1a1a1a, -2.21, 0.42, 0)]);
  return [{ geo: body, mat: paint() }, { geo: trim, mat: matte(), tint: false }, { geo: glass, mat: glassy(), tint: false }];
}
function flyerParts(bright) {
  const body = part(new THREE.SphereGeometry(1, 20, 12).scale(2.7, 0.42, 1.05), bright ? 0xf4f8ff : 0x2a2e36);
  const canopy = part(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45).scale(1.2, 0.5, 0.75), 0x0c1218, 0.4, 0.15, 0);
  const col = (g, rr, gg, bb) => { const c = g.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, rr, gg, bb); return g; };
  const lights = merge([col(box(0.15, 0.14, 1.5, 0xffffff, -2.6, 0, 0), 6, 0.4, 0.6), col(box(0.15, 0.14, 1.2, 0xffffff, 2.6, 0, 0), 5, 5, 4), col(box(3.2, 0.05, 0.08, 0xffffff, 0, -0.38, 0.6), 0.6, 3, 4), col(box(3.2, 0.05, 0.08, 0xffffff, 0, -0.38, -0.6), 0.6, 3, 4)]);
  return [{ geo: merge([body, canopy]), mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.8 }), tint: false }, { geo: lights, mat: new THREE.MeshBasicMaterial({ vertexColors: true }), tint: false, cast: false }];
}
function shipParts(kind) {
  const hull = (l, w, h, c) => [box(l, h, w, c, 0, h / 2 - 0.5, 0), cone(w / 2, l * 0.2, c, l * 0.6, h / 2 - 0.5, 0, 4, 0, Math.PI / 4, -H)];
  let p;
  if (kind === 'sail') {
    p = [...hull(22, 6, 4, 0x5a3a22), box(22.4, 0.5, 6.3, 0x3a2616, 0, 3.6, 0)];
    for (const x of [-6, 1, 8]) { p.push(cyl(0.2, 0.25, 22, 0x4a3420, x, 14, 0, 8)); p.push(box(0.3, 7, 9, 0xf0e8d8, x + 0.4, 18, 0)); p.push(box(0.3, 6, 11, 0xe8e0cc, x + 0.4, 10, 0)); p.push(box(0.15, 0.15, 11.4, 0x4a3420, x, 13.2, 0), box(0.15, 0.15, 9.4, 0x4a3420, x, 21.6, 0)); }
  } else if (kind === 'steam') p = [...hull(50, 9, 6, 0x2a2a2e), box(30, 4, 7, 0xe8e4dc, -2, 7.5, 0), box(22, 2.5, 6, 0xe8e4dc, -2, 10.7, 0), cyl(1.4, 1.4, 8, 0xb03020, 2, 14, 0, 14), cyl(1.4, 1.4, 8, 0xb03020, -8, 14, 0, 14), cyl(1.45, 1.45, 1.2, 0x1a1a1a, 2, 17.6, 0, 14), cyl(1.45, 1.45, 1.2, 0x1a1a1a, -8, 17.6, 0, 14)];
  else {
    p = [...hull(90, 14, 8, 0x7a2a22), box(10, 14, 12, 0xf0f0f0, -36, 14, 0)];
    const cols = [0x2a6a9a, 0xb0542a, 0x3a8a4a, 0xc8a83a, 0x8a8a8a];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) p.push(box(6.5, 3, 11, cols[(i * 3 + j) % 5], -24 + i * 7, 9 + j * 3.1, 0));
  }
  return [{ geo: merge(p), mat: vcMat({ roughness: 0.7 }), tint: false }];
}

// ---------- things that move in straight lanes ----------
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
class Movers {
  /** items: { lane, alt, off, v (signed), axis 'z'|'x', u0, u1, tint, skin?, s } */
  constructor(world, parts, items, { span = 480, ground = true, bob = 0 } = {}) {
    this.world = world; this.items = items; this.span = span; this.ground = ground; this.bob = bob;
    this.meshes = parts.map(({ geo, mat, tint = true, tintKey = 'tint', cast = true }) => {
      const m = new THREE.InstancedMesh(geo, mat, items.length); m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true;
      items.forEach((it, i) => m.setColorAt(i, tint ? _c.setRGB(...(it[tintKey] || it.tint)) : _c.setRGB(1, 1, 1)));
      return m;
    });
    for (let k = 1; k < this.meshes.length; k++) this.meshes[k].instanceMatrix = this.meshes[0].instanceMatrix;
    this.minU = Math.min(...items.map((i) => i.u0)); this.maxU = Math.max(...items.map((i) => i.u1));
  }
  update(u, t) {
    const on = !(u < this.minU || u > this.maxU);
    for (const m of this.meshes) m.visible = on;
    if (!on) return;
    const L = this.span * 2, w = this.world, first = this.meshes[0];
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (u < it.u0 || u >= it.u1) { first.setMatrixAt(i, ZERO); continue; }
      const along = ((((it.off + it.v * t) % L) + L) % L) - this.span;
      const x = it.axis === 'z' ? it.lane : along, z = it.axis === 'z' ? along : it.lane;
      let y = this.ground ? Math.max(w.heightAt(x, z), w.sea - 0.15) + it.alt : it.alt;
      if (this.bob) y += Math.abs(Math.sin(along * 2.2)) * this.bob;
      _q.setFromAxisAngle(UP, it.axis === 'z' ? (it.v > 0 ? -H : H) : (it.v > 0 ? 0 : Math.PI));
      first.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.setScalar(it.s || 1)));
    }
    first.instanceMatrix.needsUpdate = true;
  }
}

export function buildFauna(world, scene) {
  const r = rng(4242), Y = yearToU, M = makers(); makers.cache = M;
  const herd = new Herd(world, scene);
  // dinosaurs
  herd.add(M.raptor, 6, -236e6, -66.02e6, { R: [15, 50], speed: 4, scale: [0.4, 0.7], stride: 1.6 });      // small early hunters
  herd.add(M.sauropod, 5, -190e6, -66.02e6, { R: [50, 120], speed: 1.6, scale: [0.9, 1.4], stride: 5 });
  herd.add(M.stego, 4, -160e6, -66.02e6, { R: [25, 60], speed: 1.1, stride: 2.2 });
  herd.add(M.theropod, 3, -150e6, -66.02e6, { R: [40, 90], speed: 4.5, scale: [1.5, 2.2], stride: 3 });
  herd.add(M.pterosaur, 7, -210e6, -66.02e6, { R: [40, 140], speed: 12, fly: 45, scale: [1, 2] });
  // mammals
  herd.add(M.small, 8, -62e6, -30e6, { R: [8, 30], speed: 2.5, stride: 0.6 });
  herd.add(M.bronto, 5, -45e6, -30e6, { R: [25, 70], speed: 1.3, stride: 2.4 });
  herd.add(M.mastodon, 6, -20e6, -1.2e6, { R: [30, 80], speed: 1.2, stride: 2.6 });
  herd.add(M.deer, 4, -20e6, -1.2e6, { R: [15, 50], speed: 2.2, stride: 1.3 });
  herd.add(M.doe, 5, -20e6, -1.2e6, { R: [15, 50], speed: 2.2, stride: 1.3 });
  herd.add(M.mastodon, 5, -130e3, -100e3, { R: [30, 80], speed: 1.2, stride: 2.6 });
  herd.add(M.mammoth, 7, -95e3, -27e3, { R: [30, 90], speed: 1.1, stride: 2.8 });
  herd.add(M.mammoth, 5, -16.5e3, -10.5e3, { R: [30, 90], speed: 1.1, stride: 2.8 });
  herd.add(M.mastodon, 4, -15e3, -9500, { R: [30, 80], speed: 1.2, stride: 2.6 });
  herd.add(M.deer, 8, -15e3, -9000, { R: [20, 60], speed: 2.2, scale: [1.2, 1.5], stride: 1.3 });   // caribou
  herd.add(M.deer, 6, -9000, 1700, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.doe, 9, -9000, 1700, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.deer, 6, 9500, 140e6, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.doe, 9, 9500, 140e6, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.mastodon, 5, 2e6, 140e6, { R: [30, 80], speed: 1.2, scale: [0.6, 1.5], stride: 2.6 });   // whatever comes next
  herd.add(M.bird, 9, -60e6, 2e8, { R: [30, 120], speed: 9, fly: 40, scale: [0.2, 0.35] });

  const movers = [];
  const mk = (parts, items, opts) => { const m = new Movers(world, parts, items, opts); movers.push(m); scene.add(...m.meshes); return m; };
  const SKINS = [[1, 0.82, 0.68], [0.9, 0.7, 0.55], [0.72, 0.52, 0.38], [0.5, 0.34, 0.24], [0.36, 0.25, 0.18], [0.98, 0.86, 0.74]];
  const lanes = (n, from, to, { jf = 0, jt = 0, v = [8, 14], off = 4, alt = 0, tint, cross = 0.3, s } = {}) => {
    const items = [];
    for (let i = 0; i < n; i++) {
      const dir = r() < 0.5 ? -1 : 1, axis = r() < cross ? 'x' : 'z';
      const base = axis === 'z' ? Math.round(r() * 4 - 2) * 100 : Math.round(r() * 14 - 7) * 60;
      const o = typeof off === 'function' ? off(axis) : off;
      items.push({ lane: base + dir * o * (axis === 'z' ? -1 : 1), alt: typeof alt === 'function' ? alt() : alt, off: r() * 960, v: dir * (v[0] + r() * (v[1] - v[0])), axis, u0: Y(from + (i / n) * jf), u1: Y(to + r() * jt), tint: tint ? tint() : [1, 1, 1], skin: SKINS[Math.floor(r() * SKINS.length)], s: typeof s === 'function' ? s() : s });
    }
    return items;
  };
  const cloth = (pal) => () => { const c = new THREE.Color(pal[Math.floor(r() * pal.length)]); return [c.r, c.g, c.b]; };
  const side = (ax) => (ax === 'z' ? 7.2 + r() * 2.3 : 4 + r() * 1.5), tall = () => 0.92 + r() * 0.16;
  // pedestrians: the population grows with the city
  const P = person();
  mk(P, lanes(60, 1626, 1900, { jf: 150, jt: 20, v: [1, 1.6], off: side, cross: 0.4, s: tall, tint: cloth([0x5a4a3a, 0x3a3a4a, 0x7a6a5a, 0x8a3a2a, 0x2a2a2a, 0xd8d0c0]) }), { bob: 0.035 });
  mk(P, lanes(170, 1800, 2160, { jf: 120, jt: 30, v: [1, 1.7], off: side, cross: 0.4, s: tall, alt: 0.16, tint: cloth([0x2a2a30, 0x3a4a6a, 0x6a2a2a, 0xc8c0b0, 0x4a6a4a, 0xd0a030, 0x808890, 0x202020, 0x7a4a6a]) }), { bob: 0.035 });
  mk(P, lanes(40, 2970, 9300, { jf: 30, jt: 600, v: [1, 1.5], off: () => r() * 30, cross: 0.5, s: tall, tint: cloth([0xffffff, 0xd8f0f0, 0xf0e8d0, 0xc0e0ff]) }), { bob: 0.035 });
  // wheels
  mk(cartParts(), lanes(26, 1640, 1905, { jf: 200, jt: 22, v: [2, 3.5], off: (ax) => (ax === 'z' ? 3 : 1.8) }), { bob: 0.03 });
  const lane = (ax) => (ax === 'z' ? 1.8 + Math.floor(r() * 2) * 3 : 1.8);
  mk(carParts('old'), lanes(40, 1903, 1946, { jf: 25, jt: 12, v: [6, 10], off: lane, alt: 0.05, tint: cloth([0x101010, 0x141414, 0x1a1210, 0x10141c, 0x3a1410]) }));
  mk(carParts(), lanes(90, 1940, 2060, { jf: 40, jt: 40, v: [9, 15], off: lane, alt: 0.05, tint: cloth([0xf2c018, 0xf2c018, 0xf2c018, 0xe8e8e8, 0x202428, 0x8a1a1a, 0x2a4a7a, 0x9aa0a8, 0x3a5a3a]) }));
  mk(carParts('pod'), lanes(60, 2035, 2170, { jf: 40, jt: 30, v: [10, 14], off: lane, alt: 0.05, tint: cloth([0xffffff, 0xe0f0ff, 0xd0d8e0]) }));
  // the sky fills up
  mk(flyerParts(false), lanes(170, 2140, 2850, { jf: 120, jt: 130, v: [25, 50], off: () => r() * 16 - 8, alt: () => 25 + Math.floor(r() * 7) * 28 + r() * 4, cross: 0.45 }), { ground: false });
  mk(flyerParts(true), lanes(40, 2960, 9200, { jf: 40, jt: 600, v: [30, 60], off: () => r() * 80 - 40, alt: () => 60 + r() * 250, cross: 0.5 }), { ground: false });
  // ships on both rivers
  const river = (n, from, to, v, jt = 30) => Array.from({ length: n }, (_, i) => {
    const dir = i % 2 ? 1 : -1;
    return { lane: (i % 2 ? 1 : -1) * (360 + r() * 140), alt: 0, off: r() * 3000, v: dir * (v + r() * 2), axis: 'z', u0: Y(from + i * 6), u1: Y(to + r() * jt), tint: [1, 1, 1] };
  });
  const shipOpts = { span: 1500, ground: false };
  const fleets = [
    mk(shipParts('sail'), [...river(1, 1524, 1525, 3, 0), ...river(1, 1609, 1611, 3, 0), ...river(8, 1624, 1880)], shipOpts),
    mk(shipParts('steam'), river(6, 1838, 1960), shipOpts),
    mk(shipParts('cargo'), river(5, 1955, 2150, 5), shipOpts),
  ];

  return {
    herd,
    update(u, t) {
      herd.update(u, t);
      for (const f of fleets) for (const it of f.items) it.alt = world.sea;
      for (const m of movers) m.update(u, t);
    },
  };
}
