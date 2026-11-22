// The Liverpool & Manchester Railway, 1830: a Rocket-type locomotive, its tender, a first-class coach and open
// second-class carriages. Built along +x (the engine leads), rails at y = 0, standard gauge.
import * as THREE from 'three';
import { Bag, fin, spokedWheel, at } from './vehicles-kit.js?v=ef07112a';

const Y = fin(0xe0b020, 0.5), BLACK = fin(0x16161a, 0.5, 0.3), WHITE = fin(0xe8e4d8, 0.6), COPPER = fin(0xb86a38, 0.35, 0.8), IRON = fin(0x2c2c30, 0.45, 0.7), BRASS = fin(0xc8a040, 0.3, 0.9), WOOD = fin(0x7a5a38, 0.85),
  BLUE = fin(0x2a4a8a, 0.6), GREEN = fin(0x2a5a3a, 0.6), DARK = fin(0x20242a, 0.3, 0.2), OAK = fin(0x5a3c22, 0.8), COAL = fin(0x0c0c0e, 0.9), FIRE = fin(0xff7a20, 0.8, 0, 2.5);
const GAUGE = 0.7175;
const wheels = (b, x, r, n, rim) => { for (const s of [1, -1]) spokedWheel(b, x, s * GAUGE, r, 0.09, n, { tyre: IRON, rim, hub: rim, hubR: r * 0.16, spokeR: 0.022, depth: 0.07 }); b.rod(IRON, [x, r, -GAUGE], [x, r, GAUGE], 0.045, 6); };
const cylX = (b, f, r, len, x, y, z, seg = 14) => b.add(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), f, at(x, y, z));

/** The whole train as one geometry; returns { geo, chimney: [x, y, z], seats: [[x, y, z, rot]…], footplate: [x, y] }. */
export function trainParts() {
  const b = new Bag(), seats = [];
  // ---------- the engine (front axle at x = 0) ----------
  wheels(b, 0, 0.72, 12, Y); wheels(b, -2.1, 0.38, 8, Y);
  for (const s of [1, -1]) { b.box(Y, 3.6, 0.14, 0.08, -1.05, 0.95, s * 0.56); b.rod(IRON, [0, 0.72, s * 0.56], [0, 0.95, s * 0.56], 0.04, 5); b.rod(IRON, [-2.1, 0.38, s * 0.56], [-2.1, 0.95, s * 0.56], 0.04, 5); }
  cylX(b, Y, 0.51, 1.85, -0.75, 1.55, 0, 18);                                             // boiler, lagged in yellow-painted wood
  for (const x of [-1.6, -1.0, -0.4, 0.1]) cylX(b, BRASS, 0.525, 0.05, x, 1.55, 0, 18);    // bands
  cylX(b, BLACK, 0.52, 0.3, 0.32, 1.55, 0, 18);                                           // smokebox
  b.cyl(WHITE, 0.15, 0.17, 2.9, 0.32, 3.5, 0, 12); b.cyl(WHITE, 0.26, 0.15, 0.3, 0.32, 5.05, 0, 12); b.cyl(BLACK, 0.2, 0.2, 0.2, 0.32, 2.05, 0, 12);   // the tall chimney with its crown
  b.box(COPPER, 0.75, 1.25, 1.1, -2.0, 1.55, 0); b.ball(COPPER, -2.0, 2.2, 0, 0.36, 0.2, 0.5);   // firebox
  b.box(FIRE, 0.03, 0.22, 0.3, -2.385, 1.25, 0);
  b.cyl(BRASS, 0.07, 0.09, 0.4, -1.2, 2.2, 0, 8); b.cyl(BRASS, 0.05, 0.05, 0.5, -0.4, 2.25, 0, 8);   // safety valves
  for (const s of [1, -1]) {   // inclined cylinders at the back, driving the front wheels
    b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.75, 10), BRASS, at(-1.9, 1.75, s * 0.78, 0, 0, -0.95)); b.rod(IRON, [-1.6, 1.53, s * 0.8], [0.3, 0.72, s * 0.82], 0.03, 5); b.rod(IRON, [0.3, 0.72, s * 0.76], [0.3, 0.72, s * 0.86], 0.05, 6);
    b.box(Y, 0.6, 0.05, 0.3, -0.1, 1.5, s * 0.82, 0, 0, 0.1);
  }
  b.box(WOOD, 0.9, 0.06, 1.5, -2.8, 0.98, 0); for (const s of [1, -1]) b.rod(IRON, [-3.2, 1, s * 0.72], [-3.2, 1.9, s * 0.72], 0.02, 4);   // footplate
  b.box(IRON, 0.5, 0.08, 0.08, 0.95, 0.9, 0);
  // ---------- tender: a wagon with a water barrel and coal ----------
  const tx = -5.2; wheels(b, tx + 0.9, 0.45, 8, Y); wheels(b, tx - 0.9, 0.45, 8, Y);
  b.box(Y, 3, 0.2, 1.5, tx, 1, 0); for (const s of [1, -1]) b.box(Y, 3, 0.5, 0.06, tx, 1.35, s * 0.74); b.box(Y, 0.06, 0.5, 1.5, tx - 1.5, 1.35, 0);
  cylX(b, OAK, 0.5, 1.5, tx - 0.6, 1.72, 0, 14); for (const x of [-1.2, -0.6, 0]) cylX(b, IRON, 0.51, 0.04, tx + x, 1.72, 0, 14);
  b.ball(COAL, tx + 0.8, 1.3, 0, 0.6, 0.3, 0.6); b.box(IRON, 0.7, 0.06, 0.06, tx + 1.8, 0.95, 0).box(IRON, 0.9, 0.06, 0.06, tx - 1.9, 0.95, 0);
  // ---------- carriages ----------
  const under = (cx, len, col) => { wheels(b, cx + len * 0.28, 0.46, 10, col); wheels(b, cx - len * 0.28, 0.46, 10, col); b.box(OAK, len, 0.18, 1.5, cx, 1.0, 0); for (const s of [1, -1]) { b.box(IRON, 0.25, 0.1, 0.1, cx + s * (len / 2 + 0.1), 1, 0.5); b.box(IRON, 0.25, 0.1, 0.1, cx + s * (len / 2 + 0.1), 1, -0.5); } b.box(IRON, 0.5, 0.05, 0.05, cx - len / 2 - 0.35, 0.95, 0); };
  // first class: three stage-coach bodies on one frame, yellow below and black above
  const c1 = -10.6; under(c1, 5, Y);
  for (let k = -1; k <= 1; k++) { const x = c1 + k * 1.6; b.box(Y, 1.56, 0.7, 1.9, x, 1.45, 0); b.box(BLACK, 1.56, 0.85, 1.9, x, 2.22, 0); for (const s of [1, -1]) { b.box(DARK, 0.5, 0.5, 0.02, x, 2.25, s * 0.96); b.box(DARK, 0.3, 0.45, 0.02, x - 0.55, 2.25, s * 0.96); b.box(DARK, 0.3, 0.45, 0.02, x + 0.55, 2.25, s * 0.96); b.box(BRASS, 0.04, 0.12, 0.03, x + 0.2, 1.75, s * 0.97); } }
  b.box(BLACK, 5, 0.08, 2, c1, 2.68, 0, 0, 0, 0); b.box(OAK, 0.6, 0.5, 1.2, c1, 2.95, 0);   // roof and luggage
  // second class: open carriages with bench seats, blue
  for (const [cx, col] of [[-16.6, BLUE], [-22.6, GREEN]]) {
    under(cx, 5, col); for (const s of [1, -1]) { b.box(col, 5, 0.75, 0.06, cx, 1.46, s * 0.95); for (const x of [-2.4, -0.8, 0.8, 2.4]) b.rod(IRON, [cx + x, 1.8, s * 0.95], [cx + x, 2.75, s * 0.95], 0.025, 4); }
    b.box(col, 0.06, 0.75, 1.9, cx - 2.5, 1.46, 0).box(col, 0.06, 0.75, 1.9, cx + 2.5, 1.46, 0); b.box(WHITE, 5.1, 0.05, 2.1, cx, 2.78, 0);
    for (const x of [-1.8, -0.6, 0.6, 1.8]) { b.box(WOOD, 0.4, 0.05, 1.7, cx + x, 1.5, 0); for (const z of [-0.5, 0.5]) seats.push([cx + x, 1.1, z, 0]); }
  }
  return { geo: b.geo(), chimney: [0.32, 5.3, 0], seats, footplate: [-2.8, 1.01], length: 26 };
}
/** A length of track along +x: iron rails on stone sleeper blocks, as the line was first laid. */
export function track(b, x0, x1, y, z) {
  const RAIL = fin(0x4a4a50, 0.4, 0.8), BLOCK = fin(0x9a968c, 0.95);
  for (const s of [1, -1]) b.box(RAIL, x1 - x0, 0.1, 0.06, (x0 + x1) / 2, y + 0.05, z + s * GAUGE);
  for (let x = x0; x < x1; x += 0.92) for (const s of [1, -1]) b.box(BLOCK, 0.5, 0.06, 0.5, x, y - 0.02, z + s * GAUGE);
  return b;
}
