import * as THREE from 'three';
import { rng, box, cyl, cone, ball, merge, vcMat } from './util.js';
import { yearToU } from './timeline.js';
import { LAND } from './world.js';

const H = Math.PI / 2;

// ---------- creature geometry (all face +x, feet on y=0) ----------
function sauropod() {
  const c = 0x6f7f5c, d = 0x5c6a4c;
  return merge([
    ball(2.6, c, 0, 5.6, 0, 2.2, 1, 1, 1),
    cyl(0.6, 1.2, 9, c, 7.9, 9.6, 0, 6, 0, 0, -0.75),
    box(1.8, 0.9, 1, d, 11.6, 13.2, 0),
    cone(1.3, 11, d, -10.5, 5, 0, 6, 0, 0, H + 0.08),
    cyl(0.75, 0.85, 4.6, d, 3.2, 2.3, 1.5), cyl(0.75, 0.85, 4.6, d, 3.2, 2.3, -1.5),
    cyl(0.75, 0.85, 4.6, d, -3.2, 2.3, 1.5), cyl(0.75, 0.85, 4.6, d, -3.2, 2.3, -1.5),
  ]);
}
function theropod() {
  const c = 0x8a5a38, d = 0x6a4028;
  return merge([
    ball(1.1, c, 0, 3.2, 0, 2.1, 1, 0.85, 1),
    cone(0.8, 5.5, d, -4.6, 3.4, 0, 6, 0, 0, H),
    cyl(0.45, 0.7, 1.8, c, 2.3, 4.1, 0, 6, 0, 0, -0.7),
    box(1.9, 0.9, 0.9, c, 3.5, 4.9, 0), box(1.5, 0.3, 0.7, d, 3.6, 4.25, 0),
    cyl(0.4, 0.3, 2.6, d, 0.1, 1.3, 0.6), cyl(0.4, 0.3, 2.6, d, 0.1, 1.3, -0.6),
    box(0.9, 0.2, 0.5, d, 0.5, 0.1, 0.6), box(0.9, 0.2, 0.5, d, 0.5, 0.1, -0.6),
    box(0.7, 0.18, 0.18, d, 1.9, 2.9, 0.5), box(0.7, 0.18, 0.18, d, 1.9, 2.9, -0.5),
  ]);
}
function stego() {
  const c = 0x7a7444, d = 0x5a5632, parts = [
    ball(1.5, c, 0, 2.4, 0, 2, 1, 0.9, 1), cone(0.8, 4.5, d, -4.6, 1.9, 0, 6, 0, 0, H + 0.2),
    box(1.3, 0.6, 0.6, d, 3.5, 1.3, 0), cyl(0.35, 0.5, 1.6, c, 2.7, 1.7, 0, 5, 0, 0, -1.1),
    cyl(0.4, 0.4, 1.6, d, 1.6, 0.8, 0.8), cyl(0.4, 0.4, 1.6, d, 1.6, 0.8, -0.8), cyl(0.45, 0.45, 2, d, -1.6, 1, 0.9), cyl(0.45, 0.45, 2, d, -1.6, 1, -0.9),
  ];
  for (let i = 0; i < 7; i++) parts.push(cone(0.55, 1.3 - Math.abs(i - 3) * 0.15, 0xa8623a, -2.7 + i * 0.9, 4.2 - Math.abs(i - 3) * 0.22, 0, 4));
  return merge(parts);
}
function pterosaur() {
  const c = 0x8a6a5a;
  return merge([
    ball(0.5, c, 0, 0, 0, 2, 0.7, 0.7), cone(0.2, 1.8, 0xc8a86a, 1.7, 0.15, 0, 5, 0, 0, -H), cone(0.15, 1, 0xa84a3a, 0.6, 0.5, 0, 4, 0, 0, H + 0.6),
    box(1.4, 0.06, 4.2, c, 0, 0.1, 2.3, 0.18, 0.25, 0), box(1.4, 0.06, 4.2, c, 0, 0.1, -2.3, -0.18, -0.25, 0),
  ]);
}
function quad({ len, bh, bw, leg, col, dark = col, neck = 0.5, headL = 0.6, tusk = 0, trunk = 0, antler = 0, horn = 0, tail = 0.5, shag = 0 }) {
  const top = leg + bh, p = [
    box(len, bh, bw, col, 0, leg + bh / 2, 0),
    box(headL * 0.8, neck + bh * 0.4, bw * 0.6, col, len / 2 + headL * 0.15, top - bh * 0.25 + neck / 2, 0, 0, 0, -0.35),
    box(headL, headL * 0.62, bw * 0.62, dark, len / 2 + headL * 0.75, top - bh * 0.2 + neck, 0),
    box(tail, 0.12, 0.12, dark, -len / 2 - tail * 0.4, top - 0.2, 0, 0, 0, 0.6),
  ];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(box(bw * 0.3, leg, bw * 0.3, dark, sx * (len / 2 - bw * 0.2), leg / 2, sz * bw * 0.32));
  const hx = len / 2 + headL * 1.1, hy = top - bh * 0.2 + neck;
  if (shag) p.push(box(len * 0.6, bh * 0.5, bw * 1.08, dark, len * 0.15, top + shag * 0.2, 0));
  if (trunk) p.push(cyl(0.2, 0.12, trunk, dark, hx + 0.15, hy - trunk / 2, 0, 5, 0, 0, 0.12));
  if (tusk) for (const s of [-1, 1]) p.push(cone(0.13, tusk, 0xf0e8d0, hx + tusk * 0.3, hy - 0.75, s * bw * 0.28, 5, 0, 0, -H + 0.5));
  if (antler) for (const s of [-1, 1]) {
    p.push(box(0.06, antler, 0.06, 0xd8c8a0, hx - headL * 0.6, hy + headL * 0.3 + antler / 2, s * 0.14, s * 0.3, 0, 0));
    p.push(box(antler * 0.6, 0.05, 0.05, 0xd8c8a0, hx - headL * 0.4, hy + headL * 0.3 + antler * 0.7, s * 0.3, 0, 0, 0.5));
  }
  if (horn) p.push(cone(0.18, horn, 0xd8d0b8, hx + headL * 0.2, hy + headL * 0.3 + horn / 2, 0, 5));
  return merge(p);
}
const figure = () => merge([cyl(0.2, 0.26, 1.05, 0xffffff, 0, 0.6, 0, 6), ball(0.17, 0xe0b890, 0, 1.3, 0), box(0.5, 0.5, 0.2, 0xdddddd, 0, 0.85, 0)]);

function cart() {
  const horse = quad({ len: 1.7, bh: 0.65, bw: 0.5, leg: 0.95, col: 0x5a3a24, dark: 0x3a2618, neck: 0.7, headL: 0.6 });
  horse.translate(2.2, 0, 0);
  const wheel = (x, z) => cyl(0.55, 0.55, 0.1, 0x2a2018, x, 0.55, z, 10, H, 0, 0);
  return merge([horse, box(2.4, 0.7, 1.3, 0x6a4a2a, -0.5, 1.1, 0), box(1.6, 0.9, 1.2, 0x8a7a5a, -0.8, 1.9, 0), wheel(0.2, 0.7), wheel(0.2, -0.7), wheel(-1.2, 0.7), wheel(-1.2, -0.7)]);
}
function car(style) {
  const wheel = (x, z) => cyl(0.36, 0.36, 0.25, 0x111111, x, 0.36, z, 8, H, 0, 0);
  const wheels = [wheel(1.3, 0.8), wheel(1.3, -0.8), wheel(-1.3, 0.8), wheel(-1.3, -0.8)];
  if (style === 'old') return merge([box(3.4, 0.6, 1.5, 0x1c1c1c, 0, 0.75, 0), box(1.8, 1, 1.4, 0x242424, -0.4, 1.5, 0), box(1, 0.5, 1.1, 0x1c1c1c, 1.3, 1.2, 0), ...wheels]);
  if (style === 'pod') return merge([ball(1, 0xffffff, 0, 0.95, 0, 2, 0.75, 0.95, 1), box(2.2, 0.3, 1.5, 0x334455, 0, 1.25, 0)]);
  return merge([box(4.3, 0.7, 1.8, 0xffffff, 0, 0.7, 0), box(2.3, 0.6, 1.6, 0x39424a, -0.2, 1.3, 0), ...wheels]);
}
function flyer(bright) {
  return merge([
    box(5, 0.7, 2, bright ? 0xf4f8ff : 0x30343c, 0, 0, 0), box(2.2, 0.5, 1.6, bright ? 0x9ae0f0 : 0x7fd0ff, 0.3, 0.55, 0),
    box(0.2, 0.3, 1.9, 0xff3050, -2.6, 0, 0), box(0.2, 0.3, 1.9, 0xfff0c0, 2.6, 0, 0),
  ]);
}
function ship(kind) {
  const hull = (l, w, h, c) => [box(l, h, w, c, 0, h / 2 - 0.5, 0), cone(w / 2, l * 0.2, c, l * 0.6, h / 2 - 0.5, 0, 4, 0, Math.PI / 4, -H)];
  if (kind === 'sail') {
    const p = [...hull(22, 6, 4, 0x5a3a22)];
    for (const x of [-6, 1, 8]) { p.push(cyl(0.2, 0.25, 22, 0x4a3420, x, 14, 0)); p.push(box(0.3, 7, 9, 0xf0e8d8, x + 0.4, 18, 0)); p.push(box(0.3, 6, 11, 0xe8e0cc, x + 0.4, 10, 0)); }
    return merge(p);
  }
  if (kind === 'steam') return merge([...hull(50, 9, 6, 0x2a2a2e), box(30, 4, 7, 0xe8e4dc, -2, 7.5, 0), cyl(1.4, 1.4, 8, 0xb03020, 2, 13, 0, 8), cyl(1.4, 1.4, 8, 0xb03020, -8, 13, 0, 8)]);
  const p = [...hull(90, 14, 8, 0x7a2a22), box(10, 14, 12, 0xf0f0f0, -36, 14, 0)];
  const cols = [0x2a6a9a, 0xb0542a, 0x3a8a4a, 0xc8a83a, 0x8a8a8a];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) p.push(box(6.5, 3, 11, cols[(i * 3 + j) % 5], -24 + i * 7, 9 + j * 3.1, 0));
  return merge(p);
}

// ---------- wandering animals ----------
class Herd {
  constructor(world, scene) { this.world = world; this.scene = scene; this.list = []; this.r = rng(77); }
  add(geo, n, from, to, { R = [20, 70], speed = 1.5, fly = 0, scale = [0.8, 1.2], bob = 0.1, mat } = {}) {
    const r = this.r; mat = mat || vcMat();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.scale.setScalar(scale[0] + r() * (scale[1] - scale[0]));
      const Rr = R[0] + r() * (R[1] - R[0]);
      this.list.push({ m, cx: (r() * 2 - 1) * (215 - Rr), cz: (r() * 2 - 1) * 260, R: Rr, w: (speed * (0.7 + r() * 0.6)) / Rr * (r() < 0.5 ? -1 : 1), ph: r() * 6.28, u0: yearToU(from), u1: yearToU(to), fly: fly && fly * (0.6 + r() * 0.8), bob, in: false });
    }
  }
  update(u, t) {
    for (const a of this.list) {
      const vis = u >= a.u0 && u < a.u1;
      if (vis !== a.in) { a.in = vis; vis ? this.scene.add(a.m) : this.scene.remove(a.m); }
      if (!vis) continue;
      const ang = a.ph + t * a.w, x = a.cx + Math.cos(ang) * a.R, z = a.cz + Math.sin(ang) * a.R, s = Math.sign(a.w);
      a.m.position.set(x, a.fly ? a.fly + Math.sin(t * 0.4 + a.ph) * 4 : this.world.surfaceAt(x, z) + Math.abs(Math.sin(t * 3 + a.ph)) * a.bob, z);
      a.m.rotation.y = Math.atan2(-Math.cos(ang) * s, -Math.sin(ang) * s);
      if (a.fly) a.m.rotation.z = Math.sin(t * 2.5 + a.ph) * 0.12;
    }
  }
}

// ---------- things that move in straight lanes (people, carts, cars, flyers, ships) ----------
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
class Movers {
  /** items: { lane, alt, off, v (signed), axis 'z'|'x', u0, u1, tint, s } */
  constructor(world, geo, items, { mat = vcMat(), span = 480, ground = true } = {}) {
    this.world = world; this.items = items; this.span = span; this.ground = ground;
    this.mesh = new THREE.InstancedMesh(geo, mat, items.length); this.mesh.frustumCulled = false; this.mesh.castShadow = !mat.isMeshBasicMaterial;
    this.minU = Math.min(...items.map((i) => i.u0)); this.maxU = Math.max(...items.map((i) => i.u1));
    items.forEach((it, i) => this.mesh.setColorAt(i, _c.setRGB(...it.tint)));
  }
  update(u, t) {
    if (u < this.minU || u > this.maxU) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const L = this.span * 2, w = this.world;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (u < it.u0 || u >= it.u1) { this.mesh.setMatrixAt(i, ZERO); continue; }
      const along = ((((it.off + it.v * t) % L) + L) % L) - this.span;
      const x = it.axis === 'z' ? it.lane : along, z = it.axis === 'z' ? along : it.lane;
      const y = this.ground ? Math.max(w.heightAt(x, z), w.sea - 0.15) + it.alt : it.alt;
      _q.setFromAxisAngle(UP, it.axis === 'z' ? (it.v > 0 ? -H : H) : (it.v > 0 ? 0 : Math.PI));
      this.mesh.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.setScalar(it.s || 1)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function buildFauna(world, scene) {
  const r = rng(4242), Y = yearToU;
  const herd = new Herd(world, scene);
  // dinosaurs
  herd.add(theropod(), 5, -236e6, -66.02e6, { R: [15, 50], speed: 4, scale: [0.5, 0.8], bob: 0.25 });   // small early hunters
  herd.add(sauropod(), 5, -190e6, -66.02e6, { R: [50, 120], speed: 1.6, scale: [0.9, 1.4], bob: 0.15 });
  herd.add(stego(), 4, -160e6, -66.02e6, { R: [25, 60], speed: 1.2, bob: 0.08 });
  herd.add(theropod(), 3, -150e6, -66.02e6, { R: [40, 90], speed: 5, scale: [1.5, 2.2], bob: 0.3 });
  herd.add(pterosaur(), 6, -210e6, -66.02e6, { R: [40, 140], speed: 12, fly: 45, scale: [1, 2] });
  // mammals
  const early = quad({ len: 1.1, bh: 0.5, bw: 0.4, leg: 0.5, col: 0x7a5a40, dark: 0x5a4030, neck: 0.3, headL: 0.45 });
  herd.add(early, 8, -62e6, -30e6, { R: [8, 30], speed: 3, bob: 0.12 });
  herd.add(quad({ len: 3.8, bh: 1.7, bw: 1.4, leg: 1.4, col: 0x6a6258, dark: 0x4a443c, neck: 0.3, headL: 1.2, horn: 0.9 }), 5, -45e6, -30e6, { R: [25, 70], speed: 1.4 });
  const mast = quad({ len: 4.2, bh: 2.1, bw: 1.7, leg: 1.9, col: 0x5c4634, dark: 0x40301f, neck: 0.5, headL: 1.2, tusk: 2.2, trunk: 2.6 });
  herd.add(mast, 6, -20e6, -1.2e6, { R: [30, 80], speed: 1.3 });
  const deer = quad({ len: 1.5, bh: 0.6, bw: 0.45, leg: 0.9, col: 0x9a6a3c, dark: 0x6a4626, neck: 0.75, headL: 0.5, antler: 0.7, tail: 0.2 });
  herd.add(deer, 6, -20e6, -1.2e6, { R: [15, 50], speed: 2.5, bob: 0.15 });
  herd.add(mast, 5, -130e3, -100e3, { R: [30, 80], speed: 1.3 });
  const mammoth = quad({ len: 4.6, bh: 2.5, bw: 1.9, leg: 2, col: 0x6a4424, dark: 0x4a2e16, neck: 0.7, headL: 1.4, tusk: 3.2, trunk: 3, shag: 1 });
  herd.add(mammoth, 7, -95e3, -27e3, { R: [30, 90], speed: 1.2 });
  herd.add(mammoth, 5, -16.5e3, -10.5e3, { R: [30, 90], speed: 1.2 });
  herd.add(mast, 4, -15e3, -9500, { R: [30, 80], speed: 1.3 });
  herd.add(deer, 8, -15e3, -9000, { R: [20, 60], speed: 2.5, scale: [1.2, 1.5], bob: 0.15 });   // caribou
  herd.add(deer, 14, -9000, 1700, { R: [12, 50], speed: 2, bob: 0.15 });
  herd.add(deer, 14, 9500, 140e6, { R: [12, 50], speed: 2, bob: 0.15 });
  herd.add(mast, 5, 2e6, 140e6, { R: [30, 80], speed: 1.3, scale: [0.6, 1.5] });   // whatever comes next
  herd.add(pterosaur(), 5, -60e6, 2e8, { R: [30, 120], speed: 9, fly: 40, scale: [0.25, 0.4] });    // birds, roughly

  const movers = [];
  const mk = (geo, items, opts) => { const m = new Movers(world, geo, items, opts); movers.push(m); scene.add(m.mesh); };
  const lanes = (n, from, to, { jf = 0, jt = 0, v = [8, 14], off = 4, alt = 0, tint, cross = 0.3, s } = {}) => {
    const items = [];
    for (let i = 0; i < n; i++) {
      const dir = r() < 0.5 ? -1 : 1, axis = r() < cross ? 'x' : 'z';
      const base = axis === 'z' ? Math.round(r() * 4 - 2) * 100 : Math.round(r() * 14 - 7) * 60;
      const o = typeof off === 'function' ? off(axis) : off;
      items.push({ lane: base + dir * o * (axis === 'z' ? -1 : 1), alt: typeof alt === 'function' ? alt() : alt, off: r() * 960, v: dir * (v[0] + r() * (v[1] - v[0])), axis, u0: Y(from + (i / n) * jf), u1: Y(to + r() * jt), tint: tint ? tint() : [1, 1, 1], s });
    }
    return items;
  };
  const cloth = (pal) => () => { const c = new THREE.Color(pal[Math.floor(r() * pal.length)]); return [c.r, c.g, c.b]; };
  // pedestrians: the population grows with the city
  const person = figure();
  mk(person, lanes(60, 1626, 1900, { jf: 150, jt: 20, v: [1, 1.6], off: (ax) => (ax === 'z' ? 7.2 + r() * 2.3 : 4 + r() * 1.5), cross: 0.4, tint: cloth([0x5a4a3a, 0x3a3a4a, 0x7a6a5a, 0x8a3a2a, 0x2a2a2a, 0xd8d0c0]) }));
  mk(person, lanes(150, 1800, 2160, { jf: 120, jt: 30, v: [1, 1.7], off: (ax) => (ax === 'z' ? 7.2 + r() * 2.3 : 4 + r() * 1.5), cross: 0.4, tint: cloth([0x2a2a30, 0x3a4a6a, 0x6a2a2a, 0xc8c0b0, 0x4a6a4a, 0xd0a030, 0x808890, 0x202020]) }));
  mk(person, lanes(40, 2970, 9300, { jf: 30, jt: 600, v: [1, 1.5], off: () => r() * 30, cross: 0.5, tint: cloth([0xffffff, 0xd8f0f0, 0xf0e8d0, 0xc0e0ff]) }));
  // wheels
  mk(cart(), lanes(26, 1640, 1905, { jf: 200, jt: 22, v: [2, 3.5], off: (ax) => (ax === 'z' ? 3 : 1.8), tint: () => [1, 1, 1] }));
  mk(car('old'), lanes(40, 1903, 1946, { jf: 25, jt: 12, v: [6, 10], off: (ax) => (ax === 'z' ? 1.8 + Math.floor(r() * 2) * 3 : 1.8) }));
  mk(car(), lanes(90, 1940, 2060, { jf: 40, jt: 40, v: [9, 15], off: (ax) => (ax === 'z' ? 1.8 + Math.floor(r() * 2) * 3 : 1.8), tint: cloth([0xf2c018, 0xf2c018, 0xf2c018, 0xe8e8e8, 0x202428, 0x8a1a1a, 0x2a4a7a, 0x9aa0a8, 0x3a5a3a]) }));
  mk(car('pod'), lanes(60, 2035, 2170, { jf: 40, jt: 30, v: [10, 14], off: (ax) => (ax === 'z' ? 1.8 + Math.floor(r() * 2) * 3 : 1.8), tint: cloth([0xffffff, 0xe0f0ff, 0xd0d8e0]) }));
  // the sky fills up
  const basic = new THREE.MeshBasicMaterial({ vertexColors: true });
  mk(flyer(false), lanes(170, 2140, 2850, { jf: 120, jt: 130, v: [25, 50], off: () => r() * 16 - 8, alt: () => 25 + Math.floor(r() * 7) * 28 + r() * 4, cross: 0.45 }), { mat: basic, ground: false });
  mk(flyer(true), lanes(40, 2960, 9200, { jf: 40, jt: 600, v: [30, 60], off: () => r() * 80 - 40, alt: () => 60 + r() * 250, cross: 0.5 }), { mat: basic, ground: false });
  // ships on both rivers
  const river = (n, from, to, v, jt = 30) => Array.from({ length: n }, (_, i) => {
    const dir = i % 2 ? 1 : -1;
    return { lane: (i % 2 ? 1 : -1) * (360 + r() * 140), alt: 0, off: r() * 3000, v: dir * (v + r() * 2), axis: 'z', u0: Y(from + i * 6), u1: Y(to + r() * jt), tint: [1, 1, 1] };
  });
  const shipOpts = { span: 1500, ground: false };
  const fleets = [
    new Movers(world, ship('sail'), [...river(1, 1524, 1525, 3, 0), ...river(1, 1609, 1611, 3, 0), ...river(8, 1624, 1880)], shipOpts),
    new Movers(world, ship('steam'), river(6, 1838, 1960), shipOpts),
    new Movers(world, ship('cargo'), river(5, 1955, 2150, 5), shipOpts),
  ];
  for (const f of fleets) { scene.add(f.mesh); f.update0 = f.update; f.update = (u, t) => { f.items.forEach((it) => { it.alt = world.sea; }); f.update0(u, t); }; movers.push(f); }

  return { update(u, t) { herd.update(u, t); for (const m of movers) m.update(u, t); } };
}
