// Everything that is not a building: camps and villages, the fort, the mill and the wall, the park, street furniture, the far future.
// Things that stood on the island's original rolling ground take a lift(x, z) function and ride the land (see Kit.on / conform).
import * as THREE from 'three';
import { merge, vcMat } from './util.js';
import { staticPerson } from './fauna.js';
import { Kit, Solid, inside, M, facadeOf, lin, WHITE, pick } from './city-kit.js';
import { around, pierced, glaze, mul, DARK, CANDLE, LAMP } from './city-types.js';

const PI = Math.PI, IRON = 0x1b1d1d, WOOD = 0x5a4028, STONE = 0x9a9488;
const BLOB = new THREE.IcosahedronGeometry(1, 1), HEMI = new THREE.SphereGeometry(1, 14, 6, 0, PI * 2, 0, PI / 2), BOWL = new THREE.SphereGeometry(1, 10, 5, 0, PI * 2, PI / 2, PI / 2);
const FIGURE = vcMat({ flatShading: false });
/** Standing figures at [x, z] spots, each turned towards (0, 0), settled on the land. */
function figures(r, spots, cols, lift) {
  const m = new THREE.Mesh(merge(spots.map(([x, z]) => { const c = pick(r, cols); return staticPerson('native', c, c, [0.62, 0.43, 0.3]).rotateY(Math.atan2(z, -x)).translate(x, lift ? lift(x, z) : 0, z); })), FIGURE);
  m.castShadow = m.receiveShadow = true; return m;
}
const group = (k, ...more) => { const g = k.build(); g.add(...more); return g; };

/** A hearth: a ring of stones, logs stacked on end, embers and a flame that flickers and lights the ground. */
export function campfire() {
  const k = new Kit(), f = new Kit();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2; k.geo(M.trim, i % 2 ? 0x6a6a66 : 0x7c7870, BLOB, Math.cos(a) * 0.85, 0.08, Math.sin(a) * 0.85, 0, a, 0, 0.2, 0.14, 0.24); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.3; k.rod(M.trim, i % 2 ? 0x2a1c12 : 0x3a2a1c, 0.14, [Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62], [Math.cos(a + 2.6) * 0.1, 0.72, Math.sin(a + 2.6) * 0.1], 6); }
  k.cyl(M.trim, 0x1a1512, 0.75, 0.8, 0.04, 0, 0, 0, 10); k.cyl(M.glow, 0xff5a10, 0.42, 0.5, 0.05, 0, 0.03, 0, 8);
  for (const [x, z, s, c] of [[0, 0, 1, 0xff7a14], [0.16, 0.1, 0.7, 0xff9a20], [-0.14, 0.12, 0.62, 0xff6a10], [0.02, -0.16, 0.66, 0xffb030], [0, 0, 0.5, 0xffe890]]) f.lathe(M.glow, c, [[0.02, 0], [0.26 * s, 0.25 * s], [0.2 * s, 0.7 * s], [0.07 * s, 1.25 * s], [0, 1.6 * s]], x, 0.12, z, 7);
  const flame = f.build(), l = new THREE.PointLight(0xff8a3a, 260, 45, 1.6), g = group(k, flame, l); l.position.y = 1.5;
  g.userData.tick = (t) => { flame.scale.set(1 + Math.sin(t * 13) * 0.12, 1 + Math.sin(t * 17 + 1) * 0.22, 1 + Math.cos(t * 11) * 0.12); flame.rotation.y = t * 1.7; l.intensity = 230 + Math.sin(t * 19) * 40 + Math.sin(t * 7) * 30; };
  return g;
}
const withFire = (g, x = 0, z = 0) => { const f = campfire(); f.position.set(x, 0, z); g.add(f); g.userData.tick = f.userData.tick; return g; };

/** Late Ice Age hunters, 11,400 BCE: hide tents on pole frames, a drying rack, bones, a hearth. */
export function paleoCamp(r, lift) {
  const k = new Kit(r, lift), hide = [0x9a8464, 0x8a7458, 0xa48e6c];
  for (const [x, z] of [[-5, -3], [5, -4], [0.5, 6.5]]) k.on(x, z, Math.atan2(-x, -z), () => {
    const c = pick(r, hide), R = 2.2 + r() * 0.4, H = 3.1 + r() * 0.4;
    k.cyl(M.trim, c, 0.22, R, H, 0, 0, 0, 11, true); k.cyl(M.trim, 0x0e0a08, 0.2, 0.2, 0.02, 0, H - 0.05, 0, 6);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.2; k.rod(M.trim, 0x3a2a1c, 0.06, [Math.cos(a) * R * 0.96, 0.1, Math.sin(a) * R * 0.96], [-Math.cos(a) * 0.35, H + 0.75, -Math.sin(a) * 0.35], 5); }
    k.quad(M.trim, 0x0e0a08, [-0.55, 0, R * 0.99], [0.55, 0, R * 0.99], [0.06, 1.7, R * 0.5 + 0.12]); k.sheet(M.trim, mul(lin(c), [0.8, 0.8, 0.8]), [0.55, 0, R], [1.15, 0.1, R * 0.92], [0.5, 1.35, R * 0.62]);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2 + 0.6; k.geo(M.trim, 0x74706a, BLOB, Math.cos(a) * (R + 0.1), 0.06, Math.sin(a) * (R + 0.1), 0, a, 0, 0.22, 0.14, 0.2); }
  });
  k.on(-6.5, 4.5, 0.5, () => {   // hides stretched to dry, a mammoth's tusks and ribs
    for (const x of [-1.4, 1.4]) k.rod(M.trim, 0x3a2a1c, 0.07, [x, 0, 0], [x, 1.9, 0], 5); k.rod(M.trim, 0x3a2a1c, 0.06, [-1.6, 1.8, 0], [1.6, 1.8, 0], 5);
    k.sheet(M.trim, 0x8a6a4a, [-1.2, 0.5, 0], [-0.1, 0.55, 0], [-0.15, 1.75, 0], [-1.15, 1.75, 0]); k.sheet(M.trim, 0x9a7e5c, [0.15, 0.7, 0], [1.2, 0.6, 0], [1.15, 1.75, 0], [0.2, 1.75, 0]);
  });
  k.on(6.5, 3.5, 0, () => { for (const s of [-1, 1]) k.geo(M.trim, 0xe4dcc4, new THREE.TorusGeometry(1.1, 0.08, 5, 10, PI * 0.8), s * 0.35, 0.1, 0, 0, s * 0.5 + PI / 2, 0); for (let i = 0; i < 4; i++) k.geo(M.trim, 0xd8d0b8, new THREE.TorusGeometry(0.55, 0.04, 4, 8, PI), -0.6 + i * 0.4, 0, 1.6, 0, PI / 2, 0); });
  return withFire(group(k, figures(r, Array.from({ length: 5 }, (_, i) => [Math.cos(i * 1.3) * (2.2 + (i % 2)), Math.sin(i * 1.3) * (2.2 + (i % 2))]), [0x7a6248, 0x6a543c, 0x8a7458], lift)));
}

/** A bark house: sheets of elm bark over a frame of bent saplings, a smoke hole in the roof, a hide over the door. `long` > 0 stretches it into a longhouse. */
function wigwam(k, r, s = 1, long = 0, sol = null) {
  const B = M.bark(), c = lin(pick(r, [0x8a6e4c, 0x7a6244, 0x957a56])), R = 2.7 * s, H = 2.5 * s, sap = 0x4a3826, zd = long ? long / 2 + R : R;
  k.su = 5; k.sv = 2;
  if (long) {
    // a longhouse: a doorway at each end (a gap in the bark below a lintel), the bark seen from inside smoke-dark
    const smoke = 0x4a3c2c, a = 0.85 / R, td = Math.acos(1.9 / H), shell = new THREE.CylinderGeometry(R, R, long, 12, 1, true, 0, PI);
    k.su = long / 2.5; k.geo(B, c, shell, 0, 0, 0, 0, PI / 2, PI / 2, H / R, 1, 1); k.geo(B, smoke, inside(shell), 0, 0, 0, 0, PI / 2, PI / 2, H / R, 1, 1); k.su = 5;
    const ends = [new THREE.SphereGeometry(R, 10, 3, 0, PI, 0, td), new THREE.SphereGeometry(R, 4, 3, 0, PI / 2 - a, td, PI / 2 - td), new THREE.SphereGeometry(R, 4, 3, PI / 2 + a, PI / 2 - a, td, PI / 2 - td)];
    for (const e of [1, -1]) for (const g of ends) { k.geo(B, c, g, 0, 0, (e * long) / 2, 0, e > 0 ? 0 : PI, 0, 1, H / R, 1); k.geo(B, smoke, inside(g), 0, 0, (e * long) / 2, 0, e > 0 ? 0 : PI, 0, 1, H / R, 1); }
    k.su = k.sv = 1;
    k.quad(M.earth(), 0x5a4a36, [-R + 0.1, 0.03, zd - 0.3], [R - 0.1, 0.03, zd - 0.3], [R - 0.1, 0.03, -zd + 0.3], [-R + 0.1, 0.03, -zd + 0.3]);   // the packed earth floor
    for (const sd of [-1, 1]) {   // sleeping platforms along both walls, divided into family compartments, with mats and furs
      const x = sd * (R - 0.75);
      k.box(M.trim, 0x6a5236, 1.1, 0.45, long - 0.6, x, 0, 0); k.box(M.trim, 0x3a2c1e, 0.08, 0.38, long - 0.6, x - sd * 0.56, 0, 0, 'b');
      for (let q = 0; q < 4; q++) {
        const z = -long / 2 + 0.3 + (q + 0.5) * (long - 0.6) / 4;
        k.box(M.trim, pick(r, [0x8a6a4a, 0x6a4a34, 0xa08060, 0x5a4636]), 0.95, 0.05, 1.7, x, 0.45, z, 'b');
        if (q) k.rod(M.trim, sap, 0.08, [x - sd * 0.55, 0, z - (long - 0.6) / 8], [x - sd * 0.55, 1.6, z - (long - 0.6) / 8], 5);
        if (r() < 0.6) k.lathe(M.trim, 0x8a5a3c, [[0.1, 0], [0.2, 0.15], [0.16, 0.32], [0.19, 0.38]], x - sd * 0.85, 0, z + 0.4, 7);
      }
      if (sol) sol.pad(x, 0, 0.55, (long - 0.6) / 2, 0.45);
    }
    for (const z of [-long / 3, 0, long / 3]) {   // a hearth under each smoke hole: a ring of stones round the embers
      for (let q = 0; q < 8; q++) k.geo(M.trim, pick(r, [0x7a746a, 0x8a8478, 0x5e5a52]), BLOB, Math.cos(q * 0.785) * 0.55, 0.05, z + Math.sin(q * 0.785) * 0.55, 0, q, 0, 0.17, 0.12, 0.15);
      k.cyl(M.glow, 0xff5a14, 0.4, 0.45, 0.04, 0, 0.02, z, 8);
      for (const an of [0.4, 2.1, 4.2]) k.rod(M.trim, 0x1c140c, 0.09, [Math.cos(an) * 0.42, 0.05, z + Math.sin(an) * 0.42], [Math.cos(an) * 0.05, 0.15, z + Math.sin(an) * 0.05], 5);
      k.box(M.trim, 0xc8a040, 0.12, 0.45, 0.12, 0.3, H - 0.65, z + 0.9, 'b'); k.box(M.trim, 0xb89038, 0.12, 0.4, 0.12, -0.3, H - 0.6, z - 0.9, 'b');   // maize hung to dry in the smoke
    }
    k.su = 5; k.sv = 2;
    if (sol) {   // its walls, with a way in at each end
      sol.wall(-R, -long / 2, -R, long / 2); sol.wall(R, -long / 2, R, long / 2);
      for (const e of [1, -1]) for (const [f0, f1] of [[0, PI / 2 - a], [PI / 2 + a, PI]]) for (let q = 0; q < 3; q++) {
        const p0 = f0 + ((f1 - f0) * q) / 3, p1 = f0 + ((f1 - f0) * (q + 1)) / 3;
        sol.wall(-Math.cos(p0) * R, e * (long / 2 + Math.sin(p0) * R), -Math.cos(p1) * R, e * (long / 2 + Math.sin(p1) * R));
      }
    }
    for (let z = -long / 2; z <= long / 2 + 0.01; z += long / 6) k.geo(M.trim, sap, new THREE.TorusGeometry(R + 0.04, 0.05, 4, 10, PI), 0, 0, z, 0, 0, 0, 1, H / R, 1);
    for (const z of [-long / 3, 0, long / 3]) k.cyl(M.trim, 0x0c0806, 0.4, 0.45, 0.06, 0, H - 0.02, z, 8);
    for (const a of [-1.15, -0.6, 0.6, 1.15]) k.rod(M.trim, sap, 0.07, [(R + 0.05) * Math.sin(a), (H + 0.05) * Math.cos(a), -long / 2], [(R + 0.05) * Math.sin(a), (H + 0.05) * Math.cos(a), long / 2], 5);      // poles lashed along the outside hold the bark down
  } else {
    k.geo(B, c, HEMI, 0, 0, 0, 0, r() * 6, 0, R, H, R); k.cyl(M.trim, 0x0c0806, 0.36, 0.42, 0.06, 0, H - 0.03, 0, 8);
    for (let q = 0; q < 4; q++) k.geo(M.trim, sap, new THREE.TorusGeometry(R + 0.03, 0.035, 4, 10, PI), 0, 0, 0, 0, (q + 0.5) * PI / 4, 0, 1, H / R, 1);      // bent saplings over the bark
    for (const y of [0.9 * s, 1.75 * s]) k.geo(M.trim, sap, new THREE.TorusGeometry(R * Math.sqrt(1 - (y / H) ** 2) + 0.03, 0.04, 4, 16), 0, y, 0, PI / 2);
  }
  k.su = k.sv = 1;
  // the doorway faces +z (a longhouse's two are open; a wigwam's is drawn, and the hut is solid)
  if (!long) { k.geo(M.trim, 0x120c08, new THREE.CircleGeometry(0.62, 8, 0, PI), 0, 0.85, zd * 0.955, -0.33); k.quad(M.trim, 0x120c08, [-0.62, 0, zd + 0.01], [0.62, 0, zd + 0.01], [0.62, 0.86, zd * 0.955], [-0.62, 0.86, zd * 0.955]); if (sol) sol.wall(0, 0, 0, 0, R); }
  const dw = long ? 0.95 : 0.62;
  k.sheet(M.trim, 0x9a8464, [dw, 0, zd + 0.03], [dw + 0.63, 0.05, zd - 0.1], [dw + 0.43, 1.3, zd - 0.35], [dw, 1.4, zd - 0.12]);
  for (const e of long ? [1, -1] : [1]) for (const x of [-dw - 0.1, dw + 0.1]) k.rod(M.trim, sap, 0.07, [x, 0, e * (zd + 0.02)], [x * 0.9, long ? 2 : 1.5, e * zd * (long ? 0.97 : 0.93)], 5);
}
/** A Lenape village, c. 950–1640: wigwams and a longhouse round a hearth, drying racks, a field of maize, dugout canoes. */
export function lenapeVillage(r, lift) {
  const k = new Kit(r, lift), sol = new Solid(), face = (x, z) => Math.atan2(-x, -z);
  for (const [x, z, s] of [[-9, -6, 1], [-10.5, 5, 1.1], [8, -8, 0.9], [10, 4.5, 1], [-1, 10.5, 1]]) k.on(x, z, face(x, z), () => sol.at(x, z, face(x, z), () => wigwam(k, r, s, 0, sol)));
  // the longhouse lies along the slope's contour, so both its doorways open at ground level instead of one being buried in the hill
  const L = lift || (() => 0), lay = (a) => Math.abs(L(1 + Math.sin(a) * 8, -15 + Math.cos(a) * 8) - L(1 - Math.sin(a) * 8, -15 - Math.cos(a) * 8));
  let ly = PI / 2; for (let a = 0; a < PI; a += PI / 24) if (lay(a) < lay(ly) - 0.05) ly = a;
  k.on(1, -15, ly, () => sol.at(1, -15, ly, () => wigwam(k, r, 1.1, 10, sol)));
  for (const [x, z, ry] of [[-15, -1, 0.4], [14, -2, -0.3]]) k.on(x, z, ry, () => {   // fish and hides drying
    for (const a of [-1.5, 1.5]) { k.rod(M.trim, 0x4a3826, 0.07, [a, 0, -0.3], [a, 1.9, 0], 5); k.rod(M.trim, 0x4a3826, 0.07, [a, 0, 0.3], [a, 1.9, 0], 5); } k.rod(M.trim, 0x4a3826, 0.06, [-1.8, 1.85, 0], [1.8, 1.85, 0], 5);
    for (let i = 0; i < 7; i++) k.sheet(M.trim, i % 3 ? 0xb8a890 : 0x8a6a4a, [-1.3 + i * 0.4, 1.2, 0], [-1.1 + i * 0.4, 1.2, 0], [-1.12 + i * 0.4, 1.83, 0], [-1.28 + i * 0.4, 1.83, 0]);
  });
  for (let i = 0; i < 30; i++) k.on(16 + (i % 6) * 1.5 + r() * 0.4, -5 + Math.floor(i / 6) * 1.7 + r() * 0.4, r() * 6, () => {   // maize, beans climbing it, squash at its foot
    const h = 1.5 + r() * 0.6; k.rod(M.trim, 0x7a9a3a, 0.04, [0, 0, 0], [0, h, 0], 4); k.geo(M.trim, 0x5c7a34, BLOB, 0.2, 0.1, 0.1, 0, i, 0, 0.35, 0.14, 0.3);
    for (let q = 0; q < 3; q++) { const a = q * 2.1, y = h * (0.35 + q * 0.2); k.sheet(M.trim, 0x6a9a34, [0, y, 0], [Math.cos(a) * 0.45, y + 0.3, Math.sin(a) * 0.45], [Math.cos(a) * 0.8, y - 0.05, Math.sin(a) * 0.8]); }
  });
  for (const [x, z, ry] of [[-17, -8, 0.5], [-18.5, -5.5, 0.35]]) k.on(x, z, ry, () => { k.geo(M.trim, 0x5a4026, BOWL, 0, 0.42, 0, 0, 0, 0, 2.7, 0.42, 0.42); k.geo(M.trim, 0x3a2816, BOWL, 0, 0.42, 0, 0, 0, 0, -2.55, 0.34, 0.34); });
  k.on(3.5, 3, 0, () => { k.lathe(M.trim, 0x8a5a3c, [[0.12, 0], [0.26, 0.2], [0.2, 0.42], [0.24, 0.5]], 0, 0, 0, 8); k.lathe(M.trim, 0x6a4a34, [[0.1, 0], [0.2, 0.15], [0.16, 0.3]], 0.6, 0, 0.2, 8); k.cyl(M.trim, WOOD, 0.2, 0.24, 0.6, -0.7, 0, 0.3, 8); k.rod(M.trim, 0x7a6248, 0.07, [-0.7, 0.5, 0.3], [-0.55, 1.5, 0.35], 5); });
  const spots = Array.from({ length: 7 }, () => { const a = r() * 6.28, d = 2.5 + r() * 5; return [Math.cos(a) * d, Math.sin(a) * d]; });
  const g = withFire(group(k, figures(r, spots, [0x8a6a4a, 0x9a7a52, 0x6a4a34], lift))); g.userData.solid = sol;
  return g;
}

/** A plain gabled house (ridge along x) with real openings, for the buildings inside the fort. */
function cottage(k, r, F, w, d, h, rise, roof, tint, o = {}) {
  const lit = () => (r() < 0.4 ? CANDLE : DARK);
  around(k, w, d, 0, 0, 0, (fw, i) => {
    const holes = []; const n = Math.max(1, Math.round(fw / 3.2));
    for (let f = 0; f * 2.9 + 2.6 < h; f++) for (let q = 0; q < n; q++) { const x = (q - (n - 1) / 2) * (fw / n); if (i === 0 && f === 0 && q === Math.floor(n / 2)) holes.push({ x, y: 0.15, w: o.dw || 1.1, h: o.dh || 2.1, door: 1 }); else if (i !== 2 || q % 2 === 0) holes.push({ x, y: f * 2.9 + 1, w: o.ww || 0.85, h: o.wh || 1.3 }); }
    pierced(k, F, -fw / 2, fw / 2, 0, h, holes, tint);
    for (const q of holes) { if (q.door && o.open) continue; if (q.door) k.quad(M.trim, o.paint || 0x3a2a1c, [q.x - q.w / 2, q.y, -0.12], [q.x + q.w / 2, q.y, -0.12], [q.x + q.w / 2, q.y + q.h, -0.12], [q.x - q.w / 2, q.y + q.h, -0.12]); else { glaze(k, q.x, q.y, q.w, q.h, -0.12, lit(), 2, 3, 0xe2dac4, 0.05, 0.03); k.box(M.trim, 0xbdb5a2, q.w + 0.2, 0.08, 0.12, q.x, q.y - 0.08, 0.03, 'k'); } }
  });
  const a = w / 2 + 0.25, z = d / 2 + 0.3, he = h - (0.3 * rise) / (d / 2), rc = lin(o.roof || 0xb5532f);
  k.quad(roof, rc, [-a, he, z], [a, he, z], [a, h + rise, 0], [-a, h + rise, 0]); k.quad(roof, rc, [a, he, -z], [-a, he, -z], [-a, h + rise, 0], [a, h + rise, 0]);
  for (const s of [-1, 1]) k.quad(F.side, tint, ...(s > 0 ? [[w / 2, h, d / 2], [w / 2, h, -d / 2], [w / 2, h + rise, 0]] : [[-w / 2, h, -d / 2], [-w / 2, h, d / 2], [-w / 2, h + rise, 0]]));
  k.box(F.side, tint, 0.7, 1.6, 0.7, w * 0.3, h + rise - 0.6, 0, 'b'); k.box(M.trim, 0x77705f, w + 0.1, 1.5, d + 0.1, 0, -1.5, 0, 'tb');
  if (o.open) room(k, w, d, h, o.dw, o.dh, o.open);
}
/** The inside of a w × d room whose door (dw × dh) is in the middle of its +z wall: floor, plastered walls, a beamed ceiling at h. */
function room(k, w, d, h, dw, dh, { wall = 0xd8d0bc, floor = 0x6a5038, beam = 0x4a3626 } = {}) {
  const a = w / 2 - 0.2, b = d / 2 - 0.2, x = dw / 2;
  k.quad(M.trim, wall, [-a, 0, -b], [a, 0, -b], [a, h, -b], [-a, h, -b]); k.quad(M.trim, wall, [-a, 0, b], [-a, 0, -b], [-a, h, -b], [-a, h, b]); k.quad(M.trim, wall, [a, 0, -b], [a, 0, b], [a, h, b], [a, h, -b]);
  k.quad(M.trim, wall, [-x, 0, b], [-a, 0, b], [-a, h, b], [-x, h, b]); k.quad(M.trim, wall, [a, 0, b], [x, 0, b], [x, h, b], [a, h, b]); k.quad(M.trim, wall, [x, dh + 0.15, b], [-x, dh + 0.15, b], [-x, h, b], [x, h, b]);
  k.quad(M.trim, wall, [-x, 0.15, b + 0.2], [-x, 0.15, b], [-x, dh + 0.15, b], [-x, dh + 0.15, b + 0.2]); k.quad(M.trim, wall, [x, 0.15, b], [x, 0.15, b + 0.2], [x, dh + 0.15, b + 0.2], [x, dh + 0.15, b]);   // the door's reveals
  k.quad(M.trim, floor, [-a, 0.15, b + 0.2], [a, 0.15, b + 0.2], [a, 0.15, -b], [-a, 0.15, -b]); k.quad(M.trim, beam, [-a, h, -b], [a, h, -b], [a, h, b], [-a, h, b]);
  for (let z = -b + 0.6; z < b; z += 1.2) k.box(M.trim, beam, 2 * a, 0.22, 0.2, 0, h - 0.22, z, 't');
}
/** Fort Amsterdam, 1626–1790: a square earthwork with four pointed bastions faced in stone, holding barracks, the governor's house and a church. */
export function fort(r, lift) {
  const k = new Kit(r, lift), S = 16, G = facadeOf('granite'), B = facadeOf('hollandbrick'), st = [0.86, 0.8, 0.7], sod = 0x64803f, earth = 0x7c6a4c, L = lift || (() => 0);
  const C = [[S - 7, S], [S - 7, S + 2.6], [S + 5.4, S + 5.4], [S + 2.6, S - 7], [S, S - 7]], out = [];
  for (let q = 0, P = C; q < 4; q++) { out.push(...P); P = P.map(([x, z]) => [z, -x]); }
  const GW = 2.75, gi = out.findIndex(([x, z]) => x === S - 7 && z === -S) + 1;   // the gate: cut the north curtain where the passage goes through
  out.splice(gi, 0, [GW, -S], [-GW, -S]);
  // rampart section, measured inwards from the foot of the scarp: [inset, height]
  const sec = [[0, 0], [0.9, 3.6], [0.9, 4.4], [1.7, 4.4], [1.7, 3.4], [4.2, 3.4], [6.3, 0]], cols = [null, earth, sod, earth, earth, sod], n = out.length;
  const nrm = out.map((p, i) => { const q = out[(i + 1) % n], l = Math.hypot(q[0] - p[0], q[1] - p[1]); return [-(q[1] - p[1]) / l, (q[0] - p[0]) / l]; });
  const ring = sec.map(([d, y]) => out.map((p, i) => { const a = nrm[(i + n - 1) % n], b = nrm[i], m = Math.max(0.45, 1 + a[0] * b[0] + a[1] * b[1]), x = p[0] - ((a[0] + b[0]) / m) * d, z = p[1] - ((a[1] + b[1]) / m) * d; return [x, y, z, undefined, undefined, L(x, z)]; }));
  for (let i = 0; i < n; i++) for (let s = 0; s + 1 < sec.length; s++) { const j = (i + 1) % n; if (i !== gi) k.quad(s ? M.earth() : G.side, s ? cols[s] : st, ring[s][i], ring[s][j], ring[s + 1][j], ring[s + 1][i]); }
  // what you bump into: the rampart (a wall along the middle of its section), the gate piers, the houses
  const sol = new Solid(), mid = 3.15;
  for (let i = 0; i < n; i++) {
    if (i === gi) continue;
    const p = out[i], q = out[(i + 1) % n], [nx, nz] = nrm[i], A = [p[0] - nx * mid, p[1] - nz * mid], Bq = [q[0] - nx * mid, q[1] - nz * mid];
    if (i === gi - 1) Bq[0] = GW + mid; if (i === gi + 1) A[0] = -GW - mid;     // stop short of the passage
    sol.wall(A[0], A[1], Bq[0], Bq[1], mid);
  }
  for (const s of [-1, 1]) sol.wall(s * 2.15, -S - 1.25, s * 2.15, -S + 6.25, 0.6);
  // gatehouse through the north curtain
  k.on(0, -S + 2.5, PI, () => {   // an open passage 3 m wide between two stone piers, its gates folded back
    for (const s of [-1, 1]) { k.box(G.side, st, 1.25, 5.2, 7.5, s * 2.125, 0, 0, 'b'); k.box(M.plank(), 0x5a4630, 0.1, 3.1, 1.45, s * 1.44, 0, 3.0, 'b'); }
    k.box(G.side, st, 3, 1.9, 7.5, 0, 3.3, 0); k.box(M.trim, 0xbdb5a2, 5.9, 0.3, 7.9, 0, 5.2, 0);
    for (const z of [3.8, -3.8]) k.box(M.trim, 0xbdb5a2, 3.5, 0.35, 0.1, 0, 3.1, z);
  });
  // inside: barracks along the west wall, the church of St Nicholas, the governor's house
  k.on(-5.5, 1, PI / 2, () => cottage(k, r, B, 11, 4.4, 5.2, 2.3, M.tile(), WHITE));
  sol.at(-5.5, 1, PI / 2, () => sol.room(11, 4.4)); sol.at(3.5, -6.5, 0, () => sol.room(6.5, 4.4));
  // the church of St Nicholas stands open: benches facing the pulpit, a brass chandelier, candles
  sol.at(5.5, 3.5, -PI / 2, () => { sol.room(9, 5, 1.8); sol.pad(0, 0.1, 4.3, 2.4, 0.15); sol.wall(0, -1.75, 0, -1.75, 0.6); sol.wall(-4.2, 0, -4.2, 0, 1.1); for (const sd of [-1, 1]) for (const z of [-0.9, 0.1, 1.1]) sol.wall(sd * 1.3, z, sd * 3, z, 0.25); });
  k.on(5.5, 3.5, -PI / 2, () => {
    cottage(k, r, B, 9, 5, 5, 3.6, M.tile(), [1.15, 1.1, 1], { wh: 2.2, ww: 0.8, roof: 0x8a4a34, dw: 1.8, dh: 2.6, open: {} });
    const oak = 0x4a3020;
    k.box(M.trim, oak, 1.1, 1.3, 0.9, 0, 0.05, -1.75); k.box(M.trim, oak, 0.9, 2.4, 0.1, 0, 0.05, -2.25, 'k'); k.box(M.trim, oak, 1.5, 0.12, 1.1, 0, 3.1, -1.75);   // pulpit and sounding board
    k.box(M.trim, 0xe8e0c8, 0.5, 0.06, 0.4, 0, 1.35, -1.6); for (let q = 0; q < 4; q++) k.box(M.trim, oak, 0.25, 0.8, 0.25, (q - 1.5) * 0.3, 0.05, -1.25);
    for (const sd of [-1, 1]) for (const z of [-0.9, 0.1, 1.1]) { k.box(M.trim, oak, 1.7, 0.08, 0.38, sd * 2.15, 0.45, z); k.box(M.trim, oak, 1.7, 0.55, 0.06, sd * 2.15, 0.5, z + 0.2); for (const e of [-0.8, 0.8]) k.box(M.trim, oak, 0.06, 0.45, 0.36, sd * 2.15 + e, 0.05, z, 'b'); }
    k.rod(M.trim, IRON, 0.02, [0, 5, 0], [0, 3.6, 0], 4); k.cyl(M.metal, 0xc8a040, 0.08, 0.12, 0.35, 0, 3.3, 0, 8);
    for (let q = 0; q < 6; q++) { const an = (q * PI) / 3, x = Math.cos(an) * 0.55, z = Math.sin(an) * 0.55; k.rod(M.metal, 0xc8a040, 0.03, [0, 3.4, 0], [x, 3.45, z], 4); k.box(M.trim, 0xf0e8d0, 0.04, 0.16, 0.04, x, 3.47, z, 'b'); k.box(M.glow, 0xffc060, 0.035, 0.05, 0.035, x, 3.63, z, 'b'); }
    for (const x of [-3.6, 3.6]) { k.box(M.trim, 0xf0e8d0, 0.04, 0.16, 0.04, x, 1.9, -2.2, 'b'); k.box(M.glow, 0xffc060, 0.035, 0.05, 0.035, x, 2.06, -2.2, 'b'); } k.box(B.side, [1.15, 1.1, 1], 2.2, 9, 2.2, -4.2, 0, 0, 'b'); k.geo(M.shingle(), 0x5a4a40, new THREE.ConeGeometry(1.8, 3.6, 4), -4.2, 10.8, 0, 0, PI / 4, 0); k.cyl(M.trim, IRON, 0.03, 0.03, 1.4, -4.2, 12.4, 0, 4); });
  k.on(3.5, -6.5, 0, () => cottage(k, r, B, 6.5, 4.4, 3.2, 2.1, M.tile(), [0.85, 0.7, 0.62]));
  // the flag of the Dutch Republic on the south-east bastion, guns on the others
  k.on(S + 1.6, S + 1.6, 0, () => { k.cyl(M.trim, 0x5a4a3a, 0.06, 0.1, 13, 0, 3.4, 0, 6); [0xf08020, 0xf4f4f0, 0x2040a0].forEach((c, i) => k.sheet(M.trim, c, [0.08, 15.4 - i * 0.6, 0], [3.2, 15.3 - i * 0.6, 0.25], [3.2, 15.9 - i * 0.6, 0.25], [0.08, 16 - i * 0.6, 0])); });
  for (const [x, z, ry] of [[-S - 1.4, S + 1.4, -PI / 4], [-S - 1.4, -S - 1.4, (-3 * PI) / 4], [S + 1.4, -S - 1.4, (3 * PI) / 4]]) k.on(x, z, ry, () => { k.rod(M.trim, 0x1c1c1c, 0.3, [0, 4, -0.9], [0, 4.25, 1.3], 8); k.box(M.trim, WOOD, 0.7, 0.4, 1.5, 0, 3.4, 0); for (const s of [-1, 1]) k.geo(M.trim, WOOD, new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10), s * 0.42, 3.8, 0.2, 0, 0, PI / 2); });
  const g = k.build(); g.userData.solid = sol;
  return g;
}

/** A Dutch smock mill, 1628–1740: an eight-sided weatherboarded tower on a stone base, a turning cap, four lattice sails half-clothed in canvas. */
export function windmill(r) {
  const k = new Kit(r), s = new Kit(r), P = M.plank(), HUB = 11.3;
  k.cyl(facadeOf('granite').side, [0.8, 0.76, 0.7], 3.7, 3.95, 2.2, 0, 0, 0, 8); k.sv = 4; k.su = 8; k.cyl(P, 0x7a6248, 2.25, 3.6, 8.2, 0, 2.2, 0, 8, true); k.su = k.sv = 1;
  k.cyl(M.trim, 0x4a3a2a, 4.9, 4.9, 0.16, 0, 4.4, 0, 8);   // the stage, with its rail and struts
  for (let i = 0; i < 8; i++) { const a = ((i + 0.5) / 8) * PI * 2, b = ((i + 1.5) / 8) * PI * 2, R = 4.85; k.rail(0x3a2c20, Math.sin(a) * R, Math.cos(a) * R, Math.sin(b) * R, Math.cos(b) * R, 4.56, 1); k.rod(M.trim, 0x4a3a2a, 0.12, [Math.sin(a) * R, 4.4, Math.cos(a) * R], [Math.sin(a) * 3.55, 2.3, Math.cos(a) * 3.55]); }
  k.quad(M.trim, 0x2a1c12, [-0.5, 0.1, 3.86], [0.5, 0.1, 3.86], [0.5, 2, 3.8], [-0.5, 2, 3.8]);
  for (const [y, a] of [[6.2, 0.9], [8.2, -1.2], [6.4, 2.6]]) k.at(0, y, 0, a, () => glaze(k, 0, 0, 0.6, 0.7, 3.62 - (y - 2.2) * 0.165 + 0.04, DARK, 2, 2, 0xd8d0b8, 0.05));
  k.sv = 2; k.su = 4; k.geo(M.shingle(), 0x4a3c30, HEMI, 0, 10.4, 0, 0, 0, 0, 2.5, 2.2, 2.9); k.su = k.sv = 1; k.cyl(M.trim, 0x3a2c20, 2.55, 2.4, 0.3, 0, 10.2, 0, 8);
  k.rod(M.trim, 0x3a2c20, 0.4, [0, HUB - 0.2, -1], [0, HUB, 3.4], 8); k.rod(M.trim, 0x3a2c20, 0.16, [0, 10.6, -2.6], [0, 4.6, -6.4]); k.rod(M.trim, 0x3a2c20, 0.1, [-1.6, 10.5, -1.8], [0, 6.6, -5.2]); k.rod(M.trim, 0x3a2c20, 0.1, [1.6, 10.5, -1.8], [0, 6.6, -5.2]);
  for (let i = 0; i < 4; i++) {   // sails in the x–y plane, turning about the windshaft
    const a = (i * PI) / 2, c = Math.cos(a), sn = Math.sin(a), at = (u, v) => [u * c - v * sn, u * sn + v * c, 0];
    s.rod(M.trim, 0x3a2c20, 0.2, at(0, 0), at(0, 9.2)); s.strip(0x4a3a2a, at(0.1, 1.6), at(0.1, 9), [1.9 * c, 1.9 * sn, 0], 0, 2.4); s.strip(0x4a3a2a, at(-0.1, 1.6), at(-0.1, 9), [-0.5 * c, -0.5 * sn, 0], 0, 2.4);
    s.sheet(M.trim, 0xe4d8bc, at(0.12, 1.7), at(1.25, 1.7), at(1.25, 8.9), at(0.12, 8.9));
  }
  const sails = s.build(), g = group(k, sails); sails.position.set(0, HUB, 3.3);
  g.userData.tick = (t) => { sails.rotation.z = t * 0.7; };
  return g;
}

/** The wall of Wall Street, 1653–1699: a palisade of pointed logs across the island, with gates where the roads go through. */
export function palisade(r, lift) {
  const k = new Kit(r, lift), log = new THREE.CylinderGeometry(0.19, 0.21, 3.4, 6, 1, true), tip = new THREE.ConeGeometry(0.19, 0.55, 6, 1, true), gates = [0, 100, -100];
  for (let x = -232; x <= 232; x += 0.4) {
    if (gates.some((g) => Math.abs(x - g) < 2.6)) continue;
    k.on(x, (r() - 0.5) * 0.12, 0, () => { const h = 0.92 + r() * 0.16, c = pick(r, [0x5a4630, 0x64503a, 0x4e3c2a, 0x6a5840]); k.geo(M.trim, c, log, 0, 1.7 * h - 0.3, 0, 0, r() * 6, 0, 1, h, 1); k.geo(M.trim, c, tip, 0, 3.4 * h + 0.27 - 0.3, 0, 0, 0, 0); });
  }
  for (let x = -230; x < 230; x += 6) if (!gates.some((g) => Math.abs(x + 3 - g) < 5.6)) k.on(x + 3, 0.3, 0, () => { k.box(M.trim, 0x4a3a28, 6, 0.16, 0.12, 0, 2.1, 0); k.rod(M.trim, 0x4a3a28, 0.14, [0, 0, 1.6], [0, 2.1, 0.1]); });
  for (const g of gates) k.on(g, 0, 0, () => { for (const s of [-1, 1]) { k.box(M.trim, 0x4a3a28, 0.45, 4.4, 0.45, s * 2.5, -0.3, 0); k.sheet(M.plank(), 0x6a5840, [s * 2.3, 0, 0], [s * 2.3, 0, 2.2], [s * 2.3, 2.9, 2.2], [s * 2.3, 2.9, 0]); } k.box(M.trim, 0x4a3a28, 5.8, 0.4, 0.5, 0, 3.7, 0); });
  return k.build();
}

/** Bowling Green: a fenced lawn with gravel walks, benches, flower beds and a fountain, 76 × 44 m. */
export function park(r, lift) {
  const k = new Kit(r, lift), W = 76, D = 44, E = M.earth(), L = lift || (() => 0), Y = 0.2, grass = [0x4f8a3a, 0x568f3e, 0x4a8436], nx = 10, nz = 6;
  const P = (x, z, y) => [x, y, z, undefined, undefined, L(x, z)], flat = (col, x0, z0, x1, z1, y) => k.quad(E, col, P(x0, z1, y), P(x1, z1, y), P(x1, z0, y), P(x0, z0, y));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) flat(grass[(i + j) % 3], -W / 2 + (i * W) / nx, -D / 2 + (j * D) / nz, -W / 2 + ((i + 1) * W) / nx, -D / 2 + ((j + 1) * D) / nz, Y);
  const gravel = 0xc2b8a0;
  for (let i = 0; i < nx; i++) flat(gravel, -W / 2 + (i * W) / nx, -1.6, -W / 2 + ((i + 1) * W) / nx, 1.6, Y + 0.03);
  for (let j = 0; j < nz; j++) flat(gravel, -1.6, -D / 2 + (j * D) / nz, 1.6, -D / 2 + ((j + 1) * D) / nz, Y + 0.035);
  k.on(0, 0, 0, () => {
    // the fountain in its gravel circle
    k.cyl(E, gravel, 9.5, 9.5, 0.05, 0, Y + 0.02, 0, 20); k.lathe(M.trim, STONE, [[5.4, 0], [5.5, 0.6], [5.3, 0.72], [4.9, 0.72], [4.8, 0.3]], 0, Y, 0, 20); k.cyl(M.lit, DARK, 4.85, 4.85, 0.02, 0, Y + 0.48, 0, 20);
    k.lathe(M.trim, STONE, [[1, 0.3], [0.55, 0.7], [0.32, 1.7], [0.5, 1.95], [1.7, 2.3], [1.8, 2.45], [1.6, 2.45], [0.3, 2.2], [0.22, 3.1], [0.5, 3.3], [0.12, 3.5]], 0, Y, 0, 12); k.cyl(M.lit, DARK, 1.62, 1.62, 0.02, 0, Y + 2.4, 0, 12);
    k.cyl(M.trim, 0xe8f0f4, 0.02, 0.1, 1.6, 0, Y + 3.5, 0, 6); for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; k.rod(M.trim, 0xe8f0f4, 0.04, [Math.sin(a) * 1.7, Y + 2.4, Math.cos(a) * 1.7], [Math.sin(a) * 2.6, Y + 0.5, Math.cos(a) * 2.6], 4); }
    for (let i = 0; i < 4; i++) k.at(0, Y, 0, PI / 4 + (i * PI) / 2, () => { k.cyl(M.trim, 0x3a2a1c, 2.2, 2.2, 0.12, 0, 0, 13.5, 10); for (let q = 0; q < 9; q++) k.geo(M.trim, pick(r, [0xc8343a, 0xe8c030, 0xd86a9a, 0xf0f0e0, 0x3f7a36]), BLOB, Math.sin(q * 2.4) * 1.3, 0.3, 13.5 + Math.cos(q * 2.4) * 1.3, 0, q, 0, 0.5, 0.35, 0.5); });
  });
  const bench = () => { k.box(M.trim, 0x5a4028, 1.8, 0.06, 0.45, 0, 0.43, 0); k.box(M.trim, 0x5a4028, 1.8, 0.36, 0.05, 0, 0.6, -0.22); for (const s of [-0.75, 0.75]) { k.box(M.trim, IRON, 0.06, 0.43, 0.45, s, 0, 0); k.box(M.trim, IRON, 0.05, 0.55, 0.05, s, 0.43, -0.22); } };
  for (const s of [-1, 1]) for (const d of [13, 21, 29]) for (const e of [-1, 1]) { k.on(s * d, e * 2.2, e > 0 ? PI : 0, () => k.at(0, Y, 0, 0, bench)); if (d < 20) k.on(e * 2.2, s * d, e > 0 ? -PI / 2 : PI / 2, () => k.at(0, Y, 0, 0, bench)); }
  // iron railings between stone posts, open where the walks come out
  const fence = (x0, z0, x1, z1) => { const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 4.75); for (let i = 0; i < n; i++) { const ax = x0 + ((x1 - x0) * i) / n, az = z0 + ((z1 - z0) * i) / n, bx = x0 + ((x1 - x0) * (i + 1)) / n, bz = z0 + ((z1 - z0) * (i + 1)) / n; k.on((ax + bx) / 2, (az + bz) / 2, 0, () => { const hx = (bx - ax) / 2, hz = (bz - az) / 2; k.rail(IRON, -hx, -hz, hx, hz, Y, 1.25); k.box(M.trim, STONE, 0.4, 1.5, 0.4, -hx, 0, -hz, 'b'); k.box(M.trim, STONE, 0.4, 1.5, 0.4, hx, 0, hz, 'b'); }); } };
  for (const s of [-1, 1]) { fence(-W / 2, (s * D) / 2, -2.2, (s * D) / 2); fence(2.2, (s * D) / 2, W / 2, (s * D) / 2); fence((s * W) / 2, -D / 2, (s * W) / 2, -2.2); fence((s * W) / 2, 2.2, (s * W) / 2, D / 2); }
  return k.build();
}

/** A memorial pool where a tower stood: a bronze parapet round falling water and a square void. */
export function pool() {
  const k = new Kit(), a = 15;
  k.box(M.trim, 0x8a8a86, a * 2 + 6, 0.22, a * 2 + 6, 0, 0, 0, 'b');
  around(k, a * 2, a * 2, 0, 0.2, 0, (fw) => { k.box(M.trim, 0x2a2a2c, fw + 1.2, 0.95, 1.2, 0, 0, 0.6, 'b'); k.box(M.metal, 0x5a4a34, fw + 1.3, 0.06, 1.3, 0, 0.95, 0.6); });
  k.box(M.lit, DARK, a * 2, 0.04, a * 2, 0, 0.3, 0, 'b'); k.box(M.trim, 0x040506, a * 0.9, 0.02, a * 0.9, 0, 0.36, 0, 'b');
  return k.build();
}

/** The space elevator's ground station, tether and climber. */
export function elevator() {
  const k = new Kit(), white = 0xf0f4f4;
  k.lathe(M.trim, white, [[36, -2], [34, 3], [27, 9], [24, 11.5], [20, 13], [14, 22], [10.5, 36], [9, 44], [6, 47], [2.2, 49]], 0, 0, 0, 32);
  k.cyl(M.glow, 0x8adfe8, 27.4, 27.4, 0.7, 0, 9.2, 0, 32, true); k.cyl(M.glow, 0x8adfe8, 14.3, 14.3, 0.5, 0, 22, 0, 32, true);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; k.rod(M.trim, white, 1.2, [Math.sin(a) * 33, 2, Math.cos(a) * 33], [Math.sin(a) * 6, 60, Math.cos(a) * 6], 6); k.geo(M.trim, white, HEMI, Math.sin(a) * 40, -1, Math.cos(a) * 40, 0, 0, 0, 5, 3.5, 5); }
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 9000, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); tether.position.y = 4500;
  const car = new THREE.Mesh(new THREE.LatheGeometry([[0, -7], [3.2, -4.5], [4.2, 0], [3.2, 4.5], [0, 7]].map((p) => new THREE.Vector2(p[0], p[1])), 12), new THREE.MeshBasicMaterial({ color: 0x8af4ff, fog: false }));
  const g = group(k, tether, car); g.userData.tick = (t) => { car.position.y = 60 + ((t * 30) % 1500); };
  return g;
}

/** A hologram hoarding. */
export function holo(text, col) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 4) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y, 512, 1); }
  g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = col; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n'); lines.forEach((l, i) => g.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * 66));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  // two faces back to back, so it reads the right way round from either end of the street
  const geo = new THREE.PlaneGeometry(44, 22), mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const front = new THREE.Mesh(geo, mat), back = new THREE.Mesh(geo, mat); back.rotation.y = Math.PI; front.add(back);
  return front;
}

// ---------- street furniture, as instanced parts (each stands on y = 0.1, its arm or face towards +x) ----------
const Y0 = 0.27;      // the top of the sidewalk, as Scatter sets things 0.1 m into the ground
/** Street lamps: 'gas' (a lantern on a fluted iron post), 'crook' (the bishop's-crook electric lamp of the 1910s) or 'cobra' (the modern cobra head). */
export function lampParts(kind) {
  const k = new Kit(), dark = kind === 'cobra' ? 0x7a8086 : 0x1c2420;
  if (kind === 'gas') {
    k.lathe(M.trim, dark, [[0.2, 0], [0.2, 0.25], [0.11, 0.5], [0.075, 0.9], [0.06, 2.75], [0.1, 2.8], [0.1, 2.9], [0.04, 2.95]], 0, Y0, 0, 8); k.rod(M.trim, dark, 0.035, [-0.32, Y0 + 2.6, 0], [0.32, Y0 + 2.6, 0]);
    k.lathe(M.lamp, WHITE, [[0.1, 2.97], [0.2, 3.45]], 0, Y0, 0, 4); k.lathe(M.trim, dark, [[0.24, 3.45], [0.08, 3.68], [0.03, 3.72], [0.03, 3.85], [0, 3.9]], 0, Y0, 0, 4);
    for (let i = 0; i < 4; i++) { const a = (i * PI) / 2 + PI / 4; k.rod(M.trim, dark, 0.02, [Math.sin(a) * 0.1, Y0 + 2.97, Math.cos(a) * 0.1], [Math.sin(a) * 0.2, Y0 + 3.45, Math.cos(a) * 0.2]); }
  } else if (kind === 'crook') {
    k.lathe(M.trim, dark, [[0.24, 0], [0.24, 0.3], [0.14, 0.7], [0.1, 1.2], [0.075, 6.2], [0.11, 6.25], [0.05, 6.4]], 0, Y0, 0, 8);
    k.geo(M.trim, dark, new THREE.TorusGeometry(0.75, 0.04, 5, 12, PI * 1.25), 0.75, Y0 + 6.35, 0, 0, 0, -PI * 0.25); k.geo(M.trim, dark, new THREE.TorusGeometry(0.3, 0.025, 4, 10), 0.36, Y0 + 6.0, 0);
    k.cyl(M.trim, dark, 0.08, 0.3, 0.22, 1.42, Y0 + 5.95, 0, 8); k.geo(M.lamp, WHITE, new THREE.SphereGeometry(0.24, 10, 7), 1.42, Y0 + 5.75, 0, 0, 0, 0, 1, 1.25, 1);
  } else {
    k.cyl(M.trim, dark, 0.07, 0.12, 8.6, 0, Y0, 0, 8); k.cyl(M.trim, dark, 0.2, 0.22, 0.5, 0, Y0, 0, 8); k.rod(M.trim, dark, 0.07, [0, Y0 + 8.3, 0], [1.5, Y0 + 9, 0], 6); k.rod(M.trim, dark, 0.07, [1.5, Y0 + 9, 0], [2.7, Y0 + 9.05, 0], 6);
    k.geo(M.trim, dark, BLOB, 3.05, Y0 + 9.04, 0, 0, 0, 0, 0.5, 0.11, 0.2); k.box(M.lamp, WHITE, 0.55, 0.05, 0.26, 3.1, Y0 + 8.9, 0);
  }
  return k.parts();
}
/** A traffic signal on a mast arm reaching +x over the roadway. */
export function signalParts() {
  const k = new Kit(), pole = 0x3a4a3e, yel = 0xc8a020;
  k.cyl(M.trim, pole, 0.09, 0.13, 6.2, 0, Y0, 0, 8); k.cyl(M.trim, pole, 0.22, 0.24, 0.6, 0, Y0, 0, 8); k.rod(M.trim, pole, 0.09, [0, Y0 + 5.9, 0], [4.6, Y0 + 6.3, 0], 6);
  for (const [x, y] of [[4.3, 5.2], [0.35, 2.9]]) { k.box(M.trim, yel, 0.32, 0.95, 0.3, x, Y0 + y, 0); [0xff2a1a, 0x4a3a10, 0x10401c].forEach((c, i) => { for (const s of [-1, 1]) k.geo(M.glow, c, new THREE.CircleGeometry(0.1, 8), x, Y0 + y + 0.78 - i * 0.3, s * 0.16, 0, s > 0 ? 0 : PI, 0); }); for (const s of [-1, 1]) [0x4a1410, 0x4a3a10, 0x2aff5a].forEach((c, i) => k.geo(M.glow, c, new THREE.CircleGeometry(0.1, 8), x + s * 0.17, Y0 + y + 0.78 - i * 0.3, 0, 0, (s * PI) / 2, 0)); }
  return k.parts();
}
/** A fire hydrant. */
export function hydrantParts() {
  const k = new Kit(), red = 0xa82a1c;
  k.lathe(M.trim, red, [[0.15, 0], [0.15, 0.08], [0.1, 0.1], [0.1, 0.5], [0.14, 0.53], [0.13, 0.6], [0.07, 0.72], [0.04, 0.74], [0.04, 0.8], [0, 0.8]], 0, Y0, 0, 8);
  k.rod(M.trim, red, 0.11, [-0.19, Y0 + 0.42, 0], [0.19, Y0 + 0.42, 0], 6); k.rod(M.trim, 0x8a8a86, 0.13, [0, Y0 + 0.36, 0], [0, Y0 + 0.36, 0.2], 6);
  return k.parts();
}
/** A subway entrance: a stair well behind iron railings between two globe lamps, opening towards -z. */
export function subwayParts() {
  const k = new Kit(), green = 0x1e4a34;
  k.box(M.trim, 0x050505, 1.7, 0.02, 4.4, 0, Y0, 0, 'b'); for (let i = 0; i < 6; i++) k.box(M.trim, 0x3a3a3a - i * 0x050505, 1.7, 0.02, 0.5, 0, Y0 + 0.01, -1.9 + i * 0.5, 'b');
  k.rail(green, -0.9, -2.2, -0.9, 2.2, Y0, 1.05); k.rail(green, 0.9, -2.2, 0.9, 2.2, Y0, 1.05); k.rail(green, -0.9, 2.2, 0.9, 2.2, Y0, 1.05);
  for (const s of [-1, 1]) { k.cyl(M.trim, green, 0.06, 0.08, 2.6, s * 0.95, Y0, -2.25, 6); k.geo(M.glow, 0x3aff7a, new THREE.SphereGeometry(0.2, 8, 6), s * 0.95, Y0 + 2.75, -2.25); }
  k.box(M.trim, green, 2, 0.4, 0.06, 0, Y0 + 2.1, -2.25); k.box(M.trim, 0xe8e8e0, 1.3, 0.16, 0.02, 0, Y0 + 2.22, -2.29);
  return k.parts();
}
