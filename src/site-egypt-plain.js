// Below the plateau: the black land of the flood plain with its fields, palms and papyrus, the harbours and their boats,
// the village on the desert's edge and the town of the pyramid builders. Also the land beyond the edge of the terrain.
import * as THREE from 'three';
import { rng, smooth, clamp, lerp } from './util.js';
import { makeKinds } from './flora.js';
import { C, lin, shade, put, block, wall, lathe, vault, bar, skin, fin, cropTex, papyrusTex } from './site-egypt-kit.js';
import { terrain, ground, PLAIN, BASINS, TOWN } from './site-egypt-land.js';

/** Where things on the plain are, for the people who work there. */
export const FIELDS = { reap: [480, 528, 262, 294], plough: [480, 528, 300, 332], hoe: [480, 528, 338, 370], reap2: [640, 700, 120, 160] };
export const FLOOR = { x: 562, z: 282, r: 8 };            // threshing floor
export const PASTURE = [548, 612, 302, 372];
export const VILLAGE = { x0: 345, x1: 414, z0: 272, z1: 376 };
/** Boats: [x, z, heading, kind]; kind 0 = cargo boat, 1 = papyrus skiff. */
export const BOATS = { quayA: [[540, -462, 0.1, 0], [548, -492, -0.15, 0]], quayB: [[472, 204, 0.05, 0], [468, 238, 3.1, 0]], skiffs: [[806, 300, 1.2, 1], [822, 352, -0.6, 1], [798, 420, 2.4, 1], [812, -120, 0.4, 1]], river: { x: 890, z0: -700, z1: 800 } };
export const SHADUFS = [[532, 238.5], [566, 238.5], [604, 238.5]];
const RESERVED = [[530, 542, 255, 380], [FLOOR.x - 12, FLOOR.x + 12, FLOOR.z - 12, FLOOR.z + 12], PASTURE];
const overlap = (a, b, m = 0) => a[0] < b[1] + m && a[1] > b[0] - m && a[2] < b[3] + m && a[3] > b[2] - m;
const plainEdge = (z) => 425 + 50 * smooth((z - 330) / 70) * smooth((720 - z) / 70);

/** The land beyond the terrain mesh, drawn with the terrain's own material so that it has no edge. */
function skirts(world, group) {
  const xs = [-6000, -3400, -2100, -1400, -1100], zs = [-6000, -3400, -2200, -1500, -1300];
  for (let x = -1000; x <= 1000; x += 10) xs.push(x); for (let z = -1200; z <= 1200; z += 10) zs.push(z);
  xs.push(1100, 1215, 1235, 1255, 1500, 2400, 3400, 6000); zs.push(1300, 1500, 2200, 3400, 6000);
  const at = (x, z) => {
    const xe = clamp(x, -1000, 1000), ze = clamp(z, -1200, 1200); let h = terrain.base(xe, ze);
    if (x > 1000) h = lerp(h, 2, smooth((x - 1215) / 40));
    let t = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(x * 0.13 + Math.sin(z * 0.11) * 2) * Math.cos(z * 0.09 + x * 0.02));
    if (h < 2.6 && h > -2) t *= 1.18; if (h < -2) t *= 0.72;
    return [x, h, z, t * terrain.tint(Math.max(xe, x > 1215 ? 500 : -1e9), ze, h)];
  };
  const pos = [], col = [], uv = [];
  for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < zs.length - 1; k++) {
    if (xs[i] >= -1000 && xs[i + 1] <= 1000 && zs[k] >= -1200 && zs[k + 1] <= 1200) continue;
    const a = at(xs[i], zs[k]), b = at(xs[i], zs[k + 1]), c = at(xs[i + 1], zs[k + 1]), d = at(xs[i + 1], zs[k]);
    for (const v of [a, b, c, a, c, d]) { pos.push(v[0], v[1], v[2]); col.push(v[3], v[3], v[3]); uv.push(v[0] / 9, v[2] / 9); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); const m = new THREE.Mesh(g, world.terrainMat); m.receiveShadow = true; m.frustumCulled = false; group.add(m);
}

/** A flat-roofed house of mud brick: leaning walls, a parapet, a low door, slit windows under the eaves, sometimes an awning or a roof stair. */
function house(P, span, r, x, z, w, d, h, ry) {
  const y = ground(x, z) - 0.3, c = shade(r() < 0.6 ? C.plaster : C.mud, 0.85 + r() * 0.2), T = (g, lx, ly, lz, rr = 0) => put(put(g, lx, ly, lz, rr), x, y, z, ry);
  P.add('brick', span, T(block(w, h + 0.3, d, 0.035), 0, 0, 0), c);
  for (const [lx, lz, ww, dd] of [[0, d / 2 - 0.36, w - 0.5, 0.3], [0, -d / 2 + 0.36, w - 0.5, 0.3], [w / 2 - 0.36, 0, 0.3, d - 0.5], [-w / 2 + 0.36, 0, 0.3, d - 0.5]]) P.add('brick', span, T(block(ww, 0.45, dd), lx, h + 0.3, lz), shade(c, 0.95));
  P.add('plain', span, T(block(0.9, 1.7, 0.3), w * (r() * 0.4 - 0.2), 0.3, d / 2 - 0.1), C.dark).add('plain', span, T(block(1.4, 0.16, 0.4), 0, 2.0, d / 2 - 0.08), C.wood);
  for (let i = 0; i < 2; i++) P.add('plain', span, T(block(0.16, 0.5, 0.3), (i ? 1 : -1) * w * 0.3, h - 0.7, d / 2 - 0.1 - 0.035 * h), C.dark);
  P.add('plain', span, T(block(0.3, 0.5, 0.16), w / 2 - 0.1 - 0.035 * h, h - 0.7, 0), C.dark);
  if (r() < 0.5) {   // a reed awning on poles before the door
    for (const s of [-1, 1]) P.add('plain', span, T(bar([s * 1.4, 0, d / 2 + 2.2], [s * 1.4, 2.1, d / 2 + 2.2], 0.05), 0, 0, 0), C.wood);
    P.add('reed', span, T(put(block(3.4, 0.06, 2.6), 0, 2.1, d / 2 + 1.1, 0, -0.08), 0, 0, 0), C.reed, 1.5);
  }
  if (r() < 0.4) for (let k = 0; k < 6; k++) P.add('brick', span, T(block(0.8, (h * (k + 1)) / 6, 0.5), -w / 2 - 0.4, 0, -d / 2 + 0.5 + k * 0.5), shade(c, 0.9));   // outside stair
  for (let k = 0; k < 3; k++) if (r() < 0.6) P.add('plain', span, T(lathe([[0.001, 0], [0.16, 0.02], [0.24, 0.3], [0.2, 0.55], [0.1, 0.62], [0.13, 0.7]], 8), w / 2 + 0.5 + r() * 0.6, 0.3, -d / 2 + 0.6 + k * 0.7), shade(C.clay, 0.8 + r() * 0.3));
  return [x - Math.max(w, d) / 2 - 0.3, x + Math.max(w, d) / 2 + 0.3, z - Math.max(w, d) / 2 - 0.3, z + Math.max(w, d) / 2 + 0.3];
}
/** A beehive granary of plastered mud, filled through the top and emptied by a hatch at the foot. */
function silo(P, span, x, z, s = 1) {
  const y = ground(x, z) - 0.1;
  P.add('brick', span, put(lathe([[1.35, 0], [1.4, 1.1], [1.2, 2.3], [0.75, 3.1], [0.3, 3.45], [0.28, 3.6], [0.001, 3.62]], 12), x, y, z, 0, 0, 0, s), C.plaster);
  P.add('plain', span, put(block(0.5, 0.5, 0.2), x, y + 0.25, z + 1.34 * s), C.wood);
  return [x - 1.4 * s, x + 1.4 * s, z - 1.4 * s, z + 1.4 * s];
}
/** A boat. Cargo boats are of wood, with a two-legged mast lowered on to its crutch and a deckhouse of matting; skiffs are bundles of papyrus. */
export function boat(P, span, [x, z, ry, kind], load) {
  const T = (g) => put(g, x, 0, z, ry);
  if (kind === 1) {
    P.add('reed', span, T(skin([[-3.4, 0.95, 0, 0.12, 0.12, 0.1], [-2.6, 0.35, 0, 0.16, 0.2, 0.32], [-1, 0.12, 0, 0.18, 0.24, 0.55], [1, 0.12, 0, 0.18, 0.24, 0.55], [2.5, 0.3, 0, 0.16, 0.2, 0.36], [3.3, 0.75, 0, 0.12, 0.12, 0.12]], { segs: 8 })), shade(C.reed, 1.05), 0.7);
    return;
  }
  const wood = shade(C.wood, 1.25);
  P.add('plain', span, T(skin([[-10, 2.3, 0, 0.25, 0.25, 0.2], [-8.6, 1.3, 0, 0.4, 0.5, 0.8], [-5, 0.55, 0, 0.5, 0.95, 1.9, 2.4], [0, 0.4, 0, 0.5, 0.95, 2.3, 2.4], [5, 0.55, 0, 0.5, 0.95, 1.9, 2.4], [8.4, 1.2, 0, 0.4, 0.5, 0.8], [9.6, 2, 0, 0.25, 0.25, 0.2]], { segs: 12 })), (px, py) => shade(wood, py > 0.75 ? 1 : 0.7));
  P.add('plain', span, T(put(block(11, 0.1, 3.2), 0, 0.9, 0)), shade(C.woodPale, 0.9));   // deck
  for (const s of [-1, 1]) P.add('plain', span, T(bar([-7.8, 1.2, s * 0.5], [-10.5, 0.1, s * 1.6], 0.06, 0.05)), wood).add('plain', span, T(put(block(1.3, 0.05, 0.4), -10.6, 0, s * 1.65, 0.3)), wood);   // steering oars
  P.add('plain', span, T(bar([-6.5, 1.2, 0], [-6.5, 2.6, 0], 0.07)), wood).add('plain', span, T(bar([3.5, 1, 0], [3.5, 2.3, 0], 0.07)), wood);
  for (const s of [-1, 1]) P.add('plain', span, T(bar([-6.5, 2.6, s * 0.25], [3.6, 2.35, s * 0.1], 0.07, 0.05)), wood);   // the mast, lowered
  if (load) for (let i = 0; i < 4; i++) P.add('fine', span, T(put(block(1.6, 0.9, 1.3), -2.4 + i * 1.9, 0.97, i % 2 ? 0.25 : -0.2, 0.05 * i)), shade(C.tura, 0.95 + 0.04 * i));
  else P.add('reed', span, T(put(vault(2.4, 3.4, 1.5), -3.2, 0.97, 0, Math.PI / 2)), C.reed, 1.2);
}

export function buildPlain({ P, group, mats, world }) {
  const r = rng(77), obstacles = [], ob = (rect, a = -1e9, b = 1e9) => obstacles.push({ r: rect, a, b });
  skirts(world, group);

  // ---- fields: strips of barley and emmer, green or ripe, flax, and ploughland; ditches between ----
  const crop = { pos: [], nor: [], col: [], uv: [] }, Y = PLAIN + 0.06;
  const TYPES = [[0x5f7f3a, 0.55, 0x789a48], [0xb89c48, 1.0, 0xd2b45a], [0x4a3a28, 0, 0], [0x4a7444, 0.4, 0x5c8a50], [0x869440, 0.8, 0x9aa64c]];
  const field = (x0, x1, z0, z1, type) => {
    const [ground0, hgt, cc] = TYPES[type], k = 0.85 + r() * 0.3;
    P.add('field', 'all', put(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), (x0 + x1) / 2, Y, (z0 + z1) / 2), shade(ground0, k * (hgt ? 0.8 : 1)), 9);
    if (!hgt) { for (let z = z0 + 0.4; z < z1; z += 0.8) P.add('field', 'all', put(new THREE.PlaneGeometry(x1 - x0, 0.3).rotateX(-Math.PI / 2), (x0 + x1) / 2, Y + 0.02, z), shade(ground0, k * 0.7), 9); return; }   // furrows
    const c = shade(cc, k);
    for (let z = z0 + 0.5; z < z1; z += 1.1) {
      const h = hgt * (0.9 + r() * 0.2), u0 = r() * 3, u1 = u0 + (x1 - x0) / 1.7, zz = z + (r() - 0.5) * 0.3;
      for (const [x, y, u, v] of [[x0, 0, u0, 0], [x1, 0, u1, 0], [x1, h, u1, 1], [x0, 0, u0, 0], [x1, h, u1, 1], [x0, h, u0, 1]]) { crop.pos.push(x, Y + y, zz + y * 0.12); crop.nor.push(0, 1, 0); crop.col.push(c[0], c[1], c[2]); crop.uv.push(u, v); }
    }
  };
  const special = [[FIELDS.reap, 1], [FIELDS.plough, 2], [FIELDS.hoe, 0], [FIELDS.reap2, 1]];
  for (const [f, t] of special) field(f[0], f[1], f[2], f[3], t);
  for (let z0 = -1150; z0 < 1130; z0 += 36) {
    let x0 = Math.max(plainEdge(z0), plainEdge(z0 + 32)) + 16;
    while (x0 < 730) {
      const x1 = Math.min(762, x0 + 34 + r() * 26), f = [x0, x1, z0, z0 + 32];
      if (x1 - x0 > 12 && !BASINS.some((b) => overlap(f, b, 13)) && !RESERVED.some((b) => overlap(f, b, 1)) && !special.some(([b]) => overlap(f, b, 1))) field(x0, x1, z0, z0 + 32, [0, 0, 1, 1, 2, 3, 4, 0][Math.floor(r() * 8)]);
      x0 = x1 + 3.5;
    }
    if ((z0 / 36) % 2 === 0 && !BASINS.some((b) => overlap([460, 760, z0 - 4, z0], b, 12))) P.add('field', 'all', put(new THREE.PlaneGeometry(300, 1.3).rotateX(-Math.PI / 2), 612, Y + 0.01, z0 - 2), 0x3a5650, 9);   // a ditch
  }
  P.add('field', 'all', put(new THREE.PlaneGeometry(PASTURE[1] - PASTURE[0], PASTURE[3] - PASTURE[2]).rotateX(-Math.PI / 2), (PASTURE[0] + PASTURE[1]) / 2, Y, (PASTURE[2] + PASTURE[3]) / 2), 0x6f8f44, 9);
  P.add('field', 'all', put(new THREE.PlaneGeometry(3700, 4200).rotateX(-Math.PI / 2), 1262 + 1850, 2.1, 0), 0x5f8a3c, 9);   // the far bank
  {
    const g = new THREE.BufferGeometry(); for (const [n, a, s] of [['position', crop.pos, 3], ['normal', crop.nor, 3], ['color', crop.col, 3], ['uv', crop.uv, 2]]) g.setAttribute(n, new THREE.Float32BufferAttribute(a, s));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: cropTex(), alphaTest: 0.4, side: THREE.DoubleSide, vertexColors: true, roughness: 1 })); m.receiveShadow = true; m.frustumCulled = false; group.add(m);
  }
  // threshing floor: trodden earth deep in straw, a heap of winnowed grain, stacks of sheaves
  {
    const F = FLOOR;
    P.add('plain', 'all', put(new THREE.CylinderGeometry(F.r, F.r + 0.6, 0.25, 28), F.x, PLAIN, F.z), 0xa88a55).add('reed', 'all', put(new THREE.CylinderGeometry(F.r - 1.2, F.r - 0.8, 0.22, 24), F.x, PLAIN + 0.14, F.z), 0xd8bc62, 1.2);
    P.add('plain', 'all', put(lathe([[1.7, 0], [1.1, 0.6], [0.3, 1.05], [0.001, 1.1]], 12), F.x + F.r + 2.2, PLAIN, F.z + 3), 0xd2b25a);
    for (let i = 0; i < 5; i++) P.add('reed', 'all', put(lathe([[0.75, 0], [0.8, 1], [0.45, 1.6], [0.001, 1.9]], 9), F.x - F.r - 2 - (i % 2) * 1.6, PLAIN, F.z - 5 + i * 1.9), 0xcdb05a, 1);
  }

  // ---- the village on the low desert (always there): houses round a lane, granaries, a bakery yard, a cattle pen ----
  const V = VILLAGE;
  for (let i = 0; i < 16; i++) {
    const col = i % 4, row = Math.floor(i / 4), w = 6.5 + r() * 3, d = 5.5 + r() * 2.5;
    ob(house(P, 'all', r, V.x0 + 9 + col * 16.5 + r() * 3, V.z0 + 8 + row * 26 + (col % 2) * 7 + r() * 2, w, d, 2.7 + r() * 0.9, (col % 2 ? Math.PI : 0) + (r() - 0.5) * 0.3));
  }
  for (let i = 0; i < 5; i++) ob(silo(P, 'all', V.x1 + 6, V.z0 + 30 + i * 3.4, 0.9 + (i % 2) * 0.15));
  {   // bakery yard: a low wall, bell-shaped bread moulds heating in stacks, vats for the beer mash
    const bx = V.x1 + 8, bz = V.z0 + 62, y = ground(bx, bz) - 0.2;
    for (const [a, b, c, d] of [[-7, -6, 7, -6], [-7, 6, 3, 6], [-7, -6, -7, 6]]) P.add('brick', 'all', wall(bx + a, bz + b, bx + c, bz + d, 1.3, 0.5, y, 0.03), C.mud);
    for (let i = 0; i < 26; i++) P.add('plain', 'all', put(lathe([[0.07, 0], [0.2, 0.28], [0.22, 0.34], [0.001, 0.34]], 8), bx - 5 + (i % 6) * 0.5 + r() * 0.1, y + 0.2 + (i > 17 ? 0.33 : 0), bz - 4.6 + Math.floor(i / 6) * 0.5), shade(C.clay, 0.6 + r() * 0.5));
    for (let i = 0; i < 4; i++) P.add('plain', 'all', put(lathe([[0.2, 0], [0.42, 0.3], [0.45, 0.75], [0.36, 0.9], [0.4, 0.95], [0.001, 0.8]], 10), bx + 3.6, y + 0.2, bz - 4 + i * 1.3), shade(C.clay, 0.9));
  }
  {   // cattle pen of reed fencing
    const px = V.x1 + 10, pz = V.z0 + 6, y = ground(px, pz) - 0.1;
    for (const [a, b, c, d] of [[-6, -5, 6, -5], [-6, 5, 6, 5], [-6, -5, -6, 5], [6, -5, 6, 2]]) P.add('reed', 'all', wall(px + a, pz + b, px + c, pz + d, 1.25, 0.12, y, 0), C.reed, 1.2);
  }

  // ---- the builders' town (while the pyramids rise): the Wall of the Crow, galleries of barracks, bakeries, the royal granary ----
  {
    const y = ground(350, TOWN.z0 - 14) - 0.6, wz = TOWN.z0 - 14;
    P.add('blocks', 'crow', wall(252, wz, 383, wz, 9.5, 9, y, 0.1), C.lime, 6).add('blocks', 'crow', wall(395, wz, 452, wz, 9.5, 9, y, 0.1), C.lime, 6);
    for (let i = 0; i < 3; i++) P.add('blocks', 'crow', put(block(3, 2.4, 13), 386.5 + i * 3.1, y + 7.1, wz), shade(C.lime, 0.9 + 0.05 * i), 6);
    ob([248, 383.5, wz - 5, wz + 5], -2605); ob([394.5, 456, wz - 5, wz + 5], -2605);
    for (let b = 0; b < 3; b++) for (let i = 0; i < 9; i++) {
      const gx = TOWN.x0 + 10 + i * 5.6, gz = TOWN.z0 + 22 + b * 44, gy = ground(gx, gz) - 0.3, c = shade(C.mud, 0.9 + r() * 0.2);
      P.add('brick', 'town', put(block(5, 3.1, 36, 0.03), gx, gy, gz), c).add('brick', 'town', put(vault(4.4, 35.5, 1.25), gx, gy + 3.05, gz), shade(c, 1.05));
      P.add('plain', 'town', put(block(1, 1.8, 0.3), gx, gy + 0.3, gz - 18), C.dark);
      for (const s of [-1, 1]) P.add('plain', 'town', put(bar([s * 1.9, 0, 0], [s * 1.9, 2.2, 0], 0.07), gx, gy + 0.3, gz - 20.6), C.wood);
      P.add('reed', 'town', put(block(5.4, 0.07, 3), gx, gy + 2.45, gz - 19.4), C.reed, 1.5);
    }
    ob([TOWN.x0 + 7, TOWN.x0 + 58, TOWN.z0 + 4, TOWN.z0 + 40], -2605, -2450); ob([TOWN.x0 + 7, TOWN.x0 + 58, TOWN.z0 + 48, TOWN.z0 + 84], -2605, -2450); ob([TOWN.x0 + 7, TOWN.x0 + 58, TOWN.z0 + 92, TOWN.z0 + 128], -2605, -2450);
    for (let i = 0; i < 18; i++) { const hx = TOWN.x0 + 74 + (i % 3) * 16 + r() * 4, hz = TOWN.z0 + 14 + Math.floor(i / 3) * 22 + r() * 4; ob(house(P, 'town', r, hx, hz, 7 + r() * 4, 6 + r() * 3, 2.8 + r(), r() * 6.28), -2605, -2450); }
    const ax = TOWN.x0 + 34, az = TOWN.z0 + 170, ay = ground(ax, az) - 0.4;   // the royal granary: a walled court of silos
    for (const [a, b, c, d] of [[-24, -20, 24, -20], [-24, 20, 24, 20], [-24, -20, -24, 20], [24, -20, 24, -4], [24, 4, 24, 20]]) P.add('brick', 'town', wall(ax + a, az + b, ax + c, az + d, 3.6, 1.6, ay, 0.05), C.mud);
    for (let i = 0; i < 14; i++) silo(P, 'town', ax - 18 + (i % 7) * 5.4, az - 8 + Math.floor(i / 7) * 14, 1.5);
    ob([ax - 25, ax + 25, az - 21, az + 21], -2605, -2450);
  }

  // ---- harbours: quays, boats ----
  for (const b of BOATS.quayA) boat(P, 'building', b, true);
  boat(P, 'all', BOATS.quayB[0], false); boat(P, 'old', BOATS.quayB[1], true);
  for (const b of BOATS.skiffs) boat(P, 'all', b);
  for (const [x, z] of [[440, 190], [440, 250], [505, -512], [505, -438]]) for (let i = 0; i < 4; i++) P.add('plain', 'all', put(bar([0, -1, 0], [0, 1.6, 0], 0.11), x + (i % 2) * 1.5, ground(x, z), z + (i > 1 ? 1.5 : 0)), C.wood);   // mooring posts
  // shadufs: the counterpoised water-lift reaches Egypt in the New Kingdom
  for (const [x, z] of SHADUFS) {
    const y = ground(x, z);
    for (const s of [-1, 1]) P.add('brick', 'nk', put(block(0.5, 2.3, 0.5, 0.05), x + s * 0.55, y - 0.2, z), C.mud);
    P.add('plain', 'nk', put(bar([-0.7, 2, 0], [0.7, 2, 0], 0.05), x, y, z), C.wood).add('plain', 'nk', put(bar([0, 1.5, 2.2], [0, 3.3, -2.6], 0.06, 0.04), x, y, z), C.wood);
    P.add('plain', 'nk', put(new THREE.SphereGeometry(0.34, 8, 6), x, y + 1.5, z + 2.2), shade(C.mud, 0.8)).add('plain', 'nk', put(bar([0, 3.3, -2.6], [0, 1.2, -2.7], 0.012), x, y, z), C.reed);
    P.add('plain', 'nk', put(lathe([[0.1, 0], [0.16, 0.3], [0.001, 0.3]], 8), x, y + 0.9, z - 2.7), C.clay);
  }

  // ---- trees: date palms along the edge of the fields and the river bank, sycomore figs by the village, tamarisk scrub, papyrus in the shallows ----
  const K = makeKinds(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
  const plant = (kind, items) => {
    const meshes = K[kind].map(({ geo, mat, tint = true }) => { const m = new THREE.InstancedMesh(geo, mat, items.length); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; items.forEach((it, i) => { const g = 0.75 + it.g * 0.3; m.setColorAt(i, tint ? _col.setRGB(g * it.t[0], g, g * it.t[1]) : _col.setRGB(1, 1, 1)); }); group.add(m); return m; });
    items.forEach((it, i) => { _m.compose(new THREE.Vector3(it.x, (it.x > 1000 ? 2 : ground(it.x, it.z)) - 0.15, it.z), _q.setFromAxisAngle(UP, it.rot), new THREE.Vector3(it.s, it.s, it.s)); for (const m of meshes) m.setMatrixAt(i, _m); });
  };
  const free = (x, z) => !obstacles.some((o) => x > o.r[0] - 2 && x < o.r[1] + 2 && z > o.r[2] - 2 && z < o.r[3] + 2) && !BASINS.some((b) => x > b[0] - 12 && x < b[1] + 12 && z > b[2] - 12 && z < b[3] + 12) && ground(x, z) > 1;
  const item = (x, z, s0, s1) => ({ x, z, s: s0 + r() * (s1 - s0), rot: r() * 6.28, g: r(), t: [0.85 + r() * 0.25, 0.75 + r() * 0.2] });
  const palms = [[], []], figs = [], scrub = [];
  const tryPalm = (x, z) => { if (Math.hypot(x - 536, z - 356) > 16 && free(x, z) && !special.some(([f]) => x > f[0] - 1 && x < f[1] + 1 && z > f[2] - 1 && z < f[3] + 1)) palms[r() < 0.6 ? 0 : 1].push(item(x, z, 0.75, 1.25)); };
  for (let z = -1130; z < 1130; z += 9 + r() * 22) { tryPalm(plainEdge(z) + 2 + r() * 12, z); if (r() < 0.7) tryPalm(764 + r() * 8, z + r() * 8); if (r() < 0.25) for (let k = 0; k < 5; k++) tryPalm(plainEdge(z) - 2 + r() * 20, z + r() * 14); }
  for (let i = 0; i < 26; i++) tryPalm(V.x0 + r() * (V.x1 - V.x0 + 24), V.z0 - 6 + r() * (V.z1 - V.z0 + 12));
  for (let i = 0; i < 40; i++) tryPalm(530 + r() * 12, 250 + r() * 135);
  for (let i = 0; i < 40; i++) palms[i % 2].push(item(1266 + r() * 60, -1500 + r() * 3000, 0.8, 1.3));
  for (let i = 0; i < 16; i++) { const x = i < 8 ? V.x0 + r() * 90 : 440 + r() * 300, z = i < 8 ? V.z0 + r() * 110 : -1000 + r() * 2000; if (free(x, z) && !(x > 478 && x < 615 && z > 250 && z < 380)) figs.push(item(x, z, 0.5, 0.75)); }
  for (let i = 0; i < 70; i++) { const z = -1100 + r() * 2200, x = r() < 0.5 ? plainEdge(z) - 30 + r() * 34 : 762 + r() * 12; if (free(x, z)) scrub.push(item(x, z, 1.2, 2.6)); }
  plant('palm', palms[0]); plant('palmB', palms[1]); plant('broadleaf', figs); plant('shrub', scrub);
  {
    const b = [], card = (a) => { const c = Math.cos(a) * 1.3, s = Math.sin(a) * 1.3; b.push(-c, 0, -s, c, 0, s, c, 3.6, s, -c, 0, -s, c, 3.6, s, -c, 3.6, -s); };
    card(0); card(1.05); card(2.1);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(18).fill([0, 1, 0]).flat(), 3));
    const spots = [];
    for (let z = -1150; z < 1150; z += 2 + r() * 9) { if (BASINS.some((q) => z > q[2] - 16 && z < q[3] + 16)) continue; const n = 1 + Math.floor(r() * 4); for (let k = 0; k < n; k++) spots.push([777 + r() * 8, z + r() * 3]); }
    for (const q of [BASINS[0], BASINS[2]]) for (let i = 0; i < 26; i++) spots.push([q[0] + 4 + r() * (q[1] - q[0] - 8), r() < 0.5 ? q[2] - 4 - r() * 2 : q[3] + 4 + r() * 2]);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: papyrusTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }), spots.length); m.frustumCulled = false; m.receiveShadow = true;
    spots.forEach(([x, z], i) => { const s = 0.7 + r() * 0.6; _m.compose(new THREE.Vector3(x, Math.max(-0.3, ground(x, z)) - 0.1, z), _q.setFromAxisAngle(UP, r() * 3), new THREE.Vector3(s, s, s)); m.setMatrixAt(i, _m); m.setColorAt(i, _col.setRGB(0.3 + r() * 0.15, 0.42 + r() * 0.12, 0.2)); });
    group.add(m);
  }
  return { obstacles, update() {} };
}
