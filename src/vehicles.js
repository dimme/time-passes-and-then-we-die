// Vehicles: carts, cars, pods, flying traffic and ships.
import * as THREE from 'three';
import { box, cyl, cone, part, merge, vcMat } from './util.js';
import { yearToU } from './timeline.js';
import { paintGeo, hex } from './organic.js';
import { species } from './animals.js';
import { Movers, traffic, CROSS_SPAN } from './movers.js';

const H = Math.PI / 2;
// =====================================================================================
// Vehicles
// =====================================================================================
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

export function cartParts(M) {
  const horse = M.horse().obj; horse.updateMatrixWorld(true);
  const hg = []; horse.traverse((o) => { if (o.isMesh) { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const c = g.attributes.color, b = hex(0x6a4428); for (let i = 0; i < c.count; i++) { const dark = o.material.map ? 1 : 0; c.setXYZ(i, c.getX(i) * (dark ? b[0] : 1), c.getY(i) * (dark ? b[1] : 1), c.getZ(i) * (dark ? b[2] : 1)); } g.translate(2.6, 0, 0); hg.push(g); } });
  const wood = [box(2.5, 0.12, 1.4, 0x6a4c2c, -0.6, 0.95, 0), box(2.5, 0.5, 0.06, 0x5a3e24, -0.6, 1.25, 0.7), box(2.5, 0.5, 0.06, 0x5a3e24, -0.6, 1.25, -0.7), box(0.06, 0.5, 1.4, 0x5a3e24, -1.85, 1.25, 0), box(1.6, 0.7, 1.2, 0x9a8a68, -0.8, 1.6, 0),
    box(2.2, 0.06, 0.06, 0x3a2a1c, 1.5, 1.0, 0.5), box(2.2, 0.06, 0.06, 0x3a2a1c, 1.5, 1.0, -0.5)];
  for (const z of [0.78, -0.78]) for (const x of [0.1, -1.4]) { wood.push(part(new THREE.TorusGeometry(0.55, 0.05, 6, 16), 0x2a2018, x, 0.6, z)); for (let k = 0; k < 4; k++) wood.push(box(1.05, 0.04, 0.04, 0x3a2a1c, x, 0.6, z, 0, 0, (k * Math.PI) / 4)); }
  return [{ geo: merge([...hg, ...wood]), mat: matte({ roughness: 0.9 }), tint: false }];
}
export function carParts(style) {
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
export function flyerParts(bright) {
  const body = part(new THREE.SphereGeometry(1, 20, 12).scale(2.7, 0.42, 1.05), bright ? 0xf4f8ff : 0x2a2e36);
  const canopy = part(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45).scale(1.2, 0.5, 0.75), 0x0c1218, 0.4, 0.15, 0);
  const lights = merge([paintGeo(box(0.15, 0.14, 1.5, 0xffffff, -2.6, 0, 0), 6, 0.4, 0.6), paintGeo(box(0.15, 0.14, 1.2, 0xffffff, 2.6, 0, 0), 5, 5, 4), paintGeo(box(3.2, 0.05, 0.08, 0xffffff, 0, -0.38, 0.6), 0.6, 3, 4), paintGeo(box(3.2, 0.05, 0.08, 0xffffff, 0, -0.38, -0.6), 0.6, 3, 4)]);
  return [{ geo: merge([body, canopy]), mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.8 }), tint: false }, { geo: lights, mat: new THREE.MeshBasicMaterial({ vertexColors: true }), tint: false, cast: false }];
}
export function shipParts(kind) {
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


export function buildVehicles(world, scene, r) {
  const { lanes, cloth } = traffic(r), Y = yearToU, movers = [];
  const mk = (parts, items, opts = {}) => { const m = new Movers(world, parts, items, { crossSpan: opts.ground === false ? 0 : CROSS_SPAN, ...opts }); movers.push(m); scene.add(...m.meshes); return m; };
  // wheels
  mk(cartParts(species()), lanes(26, 1640, 1905, { jf: 200, jt: 22, v: [2, 3.5], off: (ax) => (ax === 'z' ? 3 : 1.8) }), { bob: 0.03 });
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

  return { movers, fleets };
}
