// Chartres: the wooden church, Fulbert's Romanesque church, and the Gothic cathedral at its true size
// (130 m long, vaults at 36 m, the old south spire at 105 m), with the scaffolding and crane of the years it was going up.
// Everything is built in a local frame: x runs from the west front (0) to the apse, z across (south is +z), y up from the floor.
import * as THREE from 'three';
import { mat4, fin } from './site-medieval-kit.js';
import { Bag } from './vehicles-kit.js';

const GLASS = ['glass', 0xffffff, 'fit', [0.03, 0, 0.47, 1]], ROSE = ['glass', 0xffffff, 'fit', [0.5, 0, 1, 1]], DARK = ['pane', 0x30363c, 'tile'], DOOR = ['plank', 0x6a3a2a, 'tile'];
const STONE = 0xffffff, AGED = 0xd8d2c4, LEAD = 0xb8c0c8;
/** A wall frame from a to b whose outside faces (ox, oz). */
function wall(kit, x0, z0, x1, z1, ox, oz, y, fn) {
  const dx = x1 - x0, dz = z1 - z0;
  if (-dz * ox + dx * oz < 0) kit.along(x1, z1, x0, z0, y, fn); else kit.along(x0, z0, x1, z1, y, fn);
}
/** Four walls round a rectangle, each a panel; holes(side, length) lists the openings of side 's' | 'e' | 'n' | 'w'. */
export function walls(kit, mat, x0, z0, x1, z1, y, h, depth, col, holes = () => []) {
  kit.along(x0, z1, x1, z1, y, (l) => kit.panel(mat, l + depth, h, holes('s', l), depth, col, -depth));
  kit.along(x1, z1, x1, z0, y, (l) => kit.panel(mat, l + depth, h, holes('e', l), depth, col, -depth));
  kit.along(x1, z0, x0, z0, y, (l) => kit.panel(mat, l + depth, h, holes('n', l), depth, col, -depth));
  kit.along(x0, z0, x0, z1, y, (l) => kit.panel(mat, l + depth, h, holes('w', l), depth, col, -depth));
}
const lancets = (l, n, y, w, h, fill = GLASS, arch = 'point') => Array.from({ length: n }, (_, i) => ({ x: (l * (i + 0.5)) / n, y, w, h, arch, fill }));

// =====================================================================================
// The first churches
// =====================================================================================
/** A timber church of the early Franks: plank walls, a thatched roof, a porch and a wooden cross. 16 × 7 m. */
export function woodenChurch(kit, props) {
  walls(kit, 'plank', 0, -3.5, 12, 3.5, 0, 4.2, 0.25, 0xb8a888, (s, l) => (s === 'w' ? [{ x: l / 2, y: 0, w: 1.5, h: 2.6, arch: 'flat', fill: ['plank', 0x4a3424, 'tile'] }] : s === 'e' ? [] : lancets(l, 3, 2.2, 0.5, 1.2, DARK, 'round')));
  kit.gable('thatch', 'plank', 0, -3.5, 12, 3.5, 4.2, 5, { over: 0.7, wcol: 0xb8a888 });
  walls(kit, 'plank', 12, -2.4, 16.5, 2.4, 0, 3.4, 0.25, 0xb8a888, (s, l) => (s === 'e' ? lancets(l, 1, 1.8, 0.5, 1.2, DARK, 'round') : []));
  kit.gable('thatch', 'plank', 12, -2.4, 16.5, 2.4, 3.4, 3.6, { over: 0.6, wcol: 0xb8a888 });
  kit.solid(0, -3.6, 16.5, 3.6);
  const b = props, W = fin(0x5a422c, 0.9); b.box(W, 0.14, 2.2, 0.14, -0.4, 10.2, 0); b.box(W, 0.14, 0.14, 1.1, -0.4, 10.7, 0);
}
/** Fulbert's church in little: rubble walls, round-headed windows, a tiled roof, an apse and a square west tower. 46 × 13 m. */
export function stoneChurch(kit) {
  const C = 0xe8e0d0;
  walls(kit, 'rubble', 8, -6.5, 40, 6.5, 0, 11, 0.9, C, (s, l) => (s === 's' || s === 'n' ? lancets(l, 6, 5.5, 1.1, 3.2, DARK, 'round') : []));
  for (let i = 0; i <= 6; i++) for (const s of [1, -1]) kit.box('stone', 8 + (i * 32) / 6 - 0.45, 0, s * 7.4 - 0.25, 8 + (i * 32) / 6 + 0.45, 10.4, s * 7.4 + 0.25, AGED);   // pilaster strips
  kit.gable('tile', 'rubble', 8, -6.5, 40, 6.5, 11, 5.2, { over: 0.5, wcol: C });
  kit.cyl('rubble', 40, 0, 0, 8.5, 5.2, 5.2, 14, C, { a0: 0, arc: Math.PI }); kit.cyl('tile', 40, 0, 8.5, 12.5, 5.6, 0.05, 14, 0xffffff, { a0: 0, arc: Math.PI });
  walls(kit, 'rubble', 0, -4.2, 8, 4.2, 0, 22, 0.9, C, (s, l) => [...(s === 'w' ? [{ x: l / 2, y: 0, w: 2.2, h: 4.2, arch: 'round', fill: DOOR, back: 0.8 }] : []), ...lancets(l, 2, 16.5, 1.2, 3.4, DARK, 'round'), ...(s === 'w' ? lancets(l, 1, 8, 1, 3, DARK, 'round') : [])]);
  kit.cyl('tile', 4, 0, 22, 28, 6.6, 0.05, 4, 0xffffff, { a0: Math.PI / 4 });
  kit.solid(0, -4.3, 8, 4.3).solid(8, -7, 40, 7).solid(40, -5, 45, 5);
}

// =====================================================================================
// The cathedral
// =====================================================================================
const NAVE0 = 16, BAY = 7, CROSS0 = 65, CROSS1 = 81, CHOIR1 = 109, AISLE = 16, VESSEL = 8, H_AISLE = 14, H_WALL = 36, RIDGE = 14;
/** One tower of the west front, centred on z = zc. */
function tower(kit, zc) {
  const z0 = zc - 8, z1 = zc + 8;
  [[0, 21, 0], [21, 34, 0.5], [34, 46, 1]].forEach(([y0, y1, inset], k) => {
    walls(kit, 'stone', inset, z0 + inset, 16 - inset, z1 - inset, y0, y1 - y0, 0.8, STONE, (s, l) => (k === 0 ? (s === 'w' ? [{ x: l / 2, y: 9, w: 2.4, h: 9, arch: 'point', fill: GLASS }] : s === 'e' ? [] : lancets(l, 1, 10, 1.6, 7, DARK))
      : k === 1 ? lancets(l, 2, 2.5, 2, 8, DARK) : lancets(l, 2, 1.5, 2.6, 8.5, ['plank', 0x2a221c, 'tile'])));
    kit.box('stone', inset - 0.5, y1 - 0.7, z0 + inset - 0.5, 16 - inset + 0.5, y1, z1 - inset + 0.5, AGED, '');   // string course
  });
  for (const [bx, bz] of [[0, z0], [0, z1], [16, z0], [16, z1]]) {   // corner buttresses, stepping in as they rise
    kit.box('stone', bx - 1.5, 0, bz - 1.5, bx + 1.5, 21, bz + 1.5, STONE); kit.box('stone', bx - 1.1, 21, bz - 1.1, bx + 1.1, 34, bz + 1.1, STONE); kit.box('stone', bx - 0.7, 34, bz - 0.7, bx + 0.7, 42, bz + 0.7, STONE);
    kit.cyl('stone', bx, bz, 42, 45, 1, 0.05, 4, AGED, { a0: Math.PI / 4 });
  }
  kit.solid(-1.5, z0 - 1.5, 17.5, z1 + 1.5);
}
/** The west front: the Royal Portal between the two towers, and the old south spire. */
export function westFront(kit, props) {
  for (const zc of [13, -13]) tower(kit, zc);
  // south tower: an eight-sided stone spire rising straight out of the square, with pinnacles and gabled windows at its foot
  kit.cyl('stone', 8, 13, 46, 57, 7.6, 7.2, 8, STONE, { a0: Math.PI / 8 });
  for (const [dx, dz] of [[-6, -6], [-6, 6], [6, -6], [6, 6]]) { kit.cyl('stone', 8 + dx, 13 + dz, 46, 56, 1.5, 1.3, 8, STONE); kit.cyl('stone', 8 + dx, 13 + dz, 56, 66, 1.5, 0.05, 8, AGED); }
  for (let k = 0; k < 4; k++) kit.at(8, 46, 13, (k * Math.PI) / 2, () => { kit.panel('stone', 4.4, 9, [{ x: 2.2, y: 1, w: 1.8, h: 6.5, arch: 'point', fill: ['plank', 0x2a221c, 'tile'] }], 0.6, STONE, 0); }) ;
  kit.cyl('stone', 8, 13, 57, 105, 7.3, 0.25, 8, STONE, { a0: Math.PI / 8 });
  const b = props, IRON = fin(0x3a3a3e, 0.5, 0.6); b.box(IRON, 0.12, 3.2, 0.12, 8, 106.5, 13); b.box(IRON, 0.12, 0.12, 1.5, 8, 107.2, 13);
  // between the towers: three portals, three lancets, the rose and a gable
  kit.along(3, -5, 3, 5, 0, (l) => kit.panel('stone', l, 37, [
    { x: 5, y: 0, w: 3.2, h: 7.6, arch: 'point', sharp: 0.6 }, { x: 1.7, y: 0, w: 2.1, h: 6, arch: 'point', sharp: 0.6, fill: DOOR, back: 0.8 }, { x: 8.3, y: 0, w: 2.1, h: 6, arch: 'point', sharp: 0.6, fill: DOOR, back: 0.8 },
    { x: 5, y: 10.5, w: 2.3, h: 10.5, arch: 'round', fill: GLASS }, { x: 1.9, y: 10.5, w: 1.9, h: 8.6, arch: 'round', fill: GLASS }, { x: 8.1, y: 10.5, w: 1.9, h: 8.6, arch: 'round', fill: GLASS },
    { x: 5, y: 23.2, w: 9, h: 9, arch: 'circle', fill: ROSE },
  ], 1.3, STONE));
  kit.box('stone', 1.4, 8.4, -5, 3, 9.6, 5, AGED, '').box('stone', 1.2, 33.6, -5, 3, 37, 5, AGED, '');   // lintel course and the gallery under the gable
  kit.poly('stone', [[3, 37, 5], [3, 37, -5], [3, 46, 0]], STONE);
  kit.solid(2.6, -5, 4.4, -1.7).solid(2.6, 1.7, 4.4, 5);
}
/** The north tower's timber spire sheathed in lead (the stone one that stands today was built in 1507–13, after a fire). */
export function northSpire(kit, low) {
  if (low) { kit.cyl('lead', 8, -13, 46, 53, 10.2, 0.05, 4, LEAD, { a0: Math.PI / 4 }); return; }
  kit.cyl('plank', 8, -13, 46, 50, 7.2, 7, 8, 0x8a7a66, { a0: Math.PI / 8 }); kit.cyl('lead', 8, -13, 50, 91, 7.6, 0.2, 8, LEAD, { a0: Math.PI / 8 });
}
/** A buttress pier with its flying arch, drawn in a frame whose +x points away from the wall it props: pier from x = r0, clerestory at x = rw. */
function pier(kit, r0, rw) {
  kit.box('stone', r0 - 0.4, 0, -0.9, r0 + 4.4, 21, 0.9, STONE); kit.box('stone', r0 + 1.4, 21, -0.75, r0 + 4.4, 31, 0.75, STONE);
  kit.poly('stone', [[r0 - 0.4, 21, 0.9], [r0 + 1.4, 21, 0.9], [r0 + 1.4, 23.5, 0.9], [r0 + 1.4, 23.5, -0.9], [r0 + 1.4, 21, -0.9], [r0 - 0.4, 21, -0.9]].slice(0, 3), AGED);
  kit.gable('lead', 'stone', r0 + 1.4, -0.75, r0 + 4.4, 0.75, 31, 2.2, { axis: 'x', over: 0.1, col: LEAD });
  const s = new THREE.Shape(), xa = r0 + 1.4, ya = 22.5, xb = rw + 0.9, yb = 30;   // the arch springs from the pier and leans on the wall under the vault
  s.moveTo(xa, ya); for (let k = 1; k <= 8; k++) { const a = (k / 8) * Math.PI / 2; s.lineTo(xa - (xa - xb) * Math.sin(a), ya + (yb - ya) * (1 - Math.cos(a))); }
  s.lineTo(xb, yb + 2.6); s.lineTo(xa, ya + 6.5); s.lineTo(xa, ya);
  kit.add('stone', new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 1 }), mat4(0, 0, -0.5), STONE, 1 / 3);
}
/** Nave, transepts, choir and apse. */
export function cathedralBody(kit) {
  const clerestory = (x0, x1, s) => {
    const n = Math.round((x1 - x0) / BAY);
    wall(kit, x0, s * VESSEL, x1, s * VESSEL, 0, s, 0, (l) => kit.panel('stone', l, H_AISLE, lancets(l, n, 0, 5.2, 11.8, undefined), 1.3, STONE));                      // the arcade
    wall(kit, x0, s * VESSEL, x1, s * VESSEL, 0, s, H_AISLE, (l) => kit.panel('stone', l, H_WALL - H_AISLE, lancets(l, n, 5.5, 4.6, 14.5), 1.1, STONE));                // triforium band and clerestory
    wall(kit, x0, s * AISLE, x1, s * AISLE, 0, s, 0, (l) => kit.panel('stone', l, H_AISLE, lancets(l, n, 3.6, 2.8, 8.4), 1, STONE));                                    // aisle wall
    kit.poly('lead', [[x0, H_AISLE, s * (AISLE + 1.3)], [x1, H_AISLE, s * (AISLE + 1.3)], [x1, 18.5, s * (VESSEL + 1)], [x0, 18.5, s * (VESSEL + 1)]], LEAD);
    for (let i = 0; i <= n; i++) { kit.at(x0 + i * BAY, 0, 0, (-s * Math.PI) / 2, () => pier(kit, AISLE + 1, VESSEL)); kit.at(x0 + i * BAY, 0, 0, 0, () => kit.solid(-0.9, s * 16.6, 0.9, s * 21.4).solid(-0.8, s * 7.6, 0.8, s * 9.6)); }
    kit.solid(x0, s * AISLE, x1, s * (AISLE + 1));
  };
  for (const s of [1, -1]) { clerestory(NAVE0, CROSS0, s); clerestory(CROSS1, CHOIR1, s); }
  kit.gable('lead', 'stone', NAVE0, -VESSEL - 1.1, CHOIR1, VESSEL + 1.1, H_WALL, RIDGE, { over: 0.5, col: LEAD });
  // transepts: a wall of lancets and a rose over three doors at each end
  for (const s of [1, -1]) {
    for (const x of [CROSS0, CROSS1]) wall(kit, x, s * AISLE, x, s * 32, x === CROSS0 ? -1 : 1, 0, 0, (l) => kit.panel('stone', l + 1, H_WALL, lancets(l, 2, 6, 2.6, 22), 1, STONE));
    wall(kit, CROSS0, s * 32, CROSS1, s * 32, 0, s, 0, (l) => kit.panel('stone', l, H_WALL, [
      { x: 8, y: 0, w: 2.8, h: 6.6, arch: 'point', fill: DOOR, back: 0.8 }, { x: 3.4, y: 0, w: 2, h: 5.4, arch: 'point', fill: DOOR, back: 0.8 }, { x: 12.6, y: 0, w: 2, h: 5.4, arch: 'point', fill: DOOR, back: 0.8 },
      ...lancets(l, 5, 11.5, 1.7, 7), { x: 8, y: 21, w: 11, h: 11, arch: 'circle', fill: ROSE }], 1.2, STONE));
    for (const x of [CROSS0, CROSS1]) { kit.box('stone', x - 1.6, 0, s * 32 - 1.6, x + 1.6, 44, s * 32 + 1.6, STONE); kit.cyl('lead', x, s * 32, 44, 50, 2.5, 0.05, 4, LEAD, { a0: Math.PI / 4 }); }
    // the porch
    wall(kit, CROSS0, s * 37.5, CROSS1, s * 37.5, 0, s, 0, (l) => kit.panel('stone', l, 10, lancets(l, 3, 0, 4, 8.2, undefined), 0.9, STONE));
    for (let k = 0; k < 3; k++) kit.gable('lead', 'stone', CROSS0 + (k * 16) / 3, s > 0 ? 33 : -38.4, CROSS0 + ((k + 1) * 16) / 3, s > 0 ? 38.4 : -33, 10, 3.4, { axis: 'z', over: 0.2, col: LEAD });
    kit.solid(CROSS0 - 1, s * 16, CROSS0, s * 33).solid(CROSS1, s * 16, CROSS1 + 1, s * 33).solid(CROSS0, s * 32, CROSS1, s * 33.2);
    for (let k = 0; k <= 3; k++) kit.solid(CROSS0 + (k * 16) / 3 - 0.6, s * 37.2, CROSS0 + (k * 16) / 3 + 0.6, s * 38.6);
  }
  kit.gable('lead', 'stone', CROSS0, -32, CROSS1, 32, H_WALL, RIDGE, { axis: 'z', over: 0.4, col: LEAD });
  // the apse: seven sides, an ambulatory round it, buttresses between
  const N = 7, cx = CHOIR1, P = (r, k) => [cx + r * Math.cos(Math.PI / 2 - (k / N) * Math.PI), r * Math.sin(Math.PI / 2 - (k / N) * Math.PI)];
  for (let k = 0; k < N; k++) {
    const [ax, az] = P(VESSEL + 0.6, k), [bx, bz] = P(VESSEL + 0.6, k + 1), [cx0, cz0] = P(AISLE + 0.8, k), [dx, dz] = P(AISLE + 0.8, k + 1);
    kit.along(ax, az, bx, bz, 0, (l) => kit.panel('stone', l, H_AISLE, [{ x: l / 2, y: 0, w: 2.5, h: 11.5, arch: 'point' }], 1.1, STONE));
    kit.along(ax, az, bx, bz, H_AISLE, (l) => kit.panel('stone', l, H_WALL - H_AISLE, [{ x: l / 2, y: 5.5, w: 2.3, h: 14.5, arch: 'point', fill: GLASS }], 1, STONE));
    kit.along(cx0, cz0, dx, dz, 0, (l) => { kit.panel('stone', l, H_AISLE, [{ x: l / 2, y: 3.6, w: 2.8, h: 8.4, arch: 'point', fill: GLASS }], 1, STONE); kit.solid(0, 0, l, 1); });
  }
  for (let k = 0; k <= N; k++) kit.at(cx, 0, 0, -(Math.PI / 2 - (k / N) * Math.PI), () => { pier(kit, AISLE + 1.6, VESSEL + 0.4); kit.solid(AISLE + 1, -0.9, AISLE + 6, 0.9); });
  kit.cyl('lead', cx, 0, H_AISLE, 18.5, AISLE + 2.2, VESSEL + 1.4, 14, LEAD, { a0: 0, arc: Math.PI });
  kit.cyl('lead', cx, 0, H_WALL, H_WALL + RIDGE, VESSEL + 2, 0.05, 14, LEAD, { a0: 0, arc: Math.PI });
  // inside: the floor, and the vault closing the vessel
  kit.poly('stone', [[4, 0.08, 16], [CHOIR1, 0.08, 16], [CHOIR1, 0.08, -16], [4, 0.08, -16]], 0xb8b0a0);
  kit.cyl('stone', cx, 0, 0.07, 0.09, 17, 0.1, 14, 0xb8b0a0, { a0: 0, arc: Math.PI });
  for (const s of [1, -1]) {
    kit.poly('stone', [[CROSS0, 0.08, s * 16], [CROSS1, 0.08, s * 16], [CROSS1, 0.08, s * 32], [CROSS0, 0.08, s * 32]], 0xb8b0a0);
    kit.poly('daub', [[NAVE0, 30.5, s * VESSEL], [CHOIR1, 30.5, s * VESSEL], [CHOIR1, 34.5, s * 3.6], [NAVE0, 34.5, s * 3.6]], 0xe8e0cc).poly('daub', [[NAVE0, 34.5, s * 3.6], [CHOIR1, 34.5, s * 3.6], [CHOIR1, 35.8, 0], [NAVE0, 35.8, 0]], 0xe8e0cc);
    kit.poly('lead', [[4, 18.5, s * 5], [NAVE0, 18.5, s * 5], [NAVE0, 18.5, s * 16], [4, 18.5, s * 16]].slice(0, 0).concat([[16, H_AISLE, s * 16.2], [16, H_AISLE, s * 8], [16, 18.5, s * 8]]), STONE);
  }
}
/** Timber scaffolding along both flanks and round the apse, lashed poles with plank stagings. */
export function scaffold(bag) {
  const W = fin(0x8a6a44, 0.9), P = fin(0xa88a5c, 0.9);
  for (const s of [1, -1]) {
    for (let x = NAVE0; x <= CHOIR1; x += 3.5) { if (x > CROSS0 - 2 && x < CROSS1 + 2) continue; for (const z of [21.8, 23.6]) bag.box(W, 0.14, 40, 0.14, x, 20, s * z); for (let y = 4; y < 40; y += 4) bag.box(W, 0.1, 0.1, 2, x, y, s * 22.7); }
    for (const [x0, x1] of [[NAVE0, CROSS0 - 2], [CROSS1 + 2, CHOIR1]]) for (let y = 4; y < 40; y += 4) { for (const z of [21.8, 23.6]) bag.box(W, x1 - x0, 0.1, 0.1, (x0 + x1) / 2, y, s * z); if (y % 8 === 0) bag.box(P, x1 - x0, 0.05, 1.7, (x0 + x1) / 2, y + 0.08, s * 22.7); }
    for (const [x0, x1] of [[NAVE0, CROSS0 - 2], [CROSS1 + 2, CHOIR1]]) for (let y = 0; y < 36; y += 8) bag.rod(W, [x0, y, s * 23.6], [x0 + 8, y + 8, s * 23.6], 0.05, 4).rod(W, [x1, y, s * 23.6], [x1 - 8, y + 8, s * 23.6], 0.05, 4);
    for (let y = 0.4; y < 38; y += 1) bag.box(W, 0.06, 0.05, 0.5, NAVE0 + 1, y, s * 22.7);   // a ladder
  }
  return bag;
}
/** A treadwheel crane: two men walking in the wheel wind the rope that lifts the stone. Stands on the ground, jib towards +x. */
export function crane() {
  const b = new Bag(), W = fin(0x7a5a38, 0.9), R = fin(0xb8a878, 0.9), S = fin(0xcfc6b0, 0.9), I = fin(0x3a3a3e, 0.5, 0.6);
  for (const z of [1.5, -1.5]) { b.box(W, 5, 0.25, 0.25, 0, 0.13, z); b.rod(W, [-2.2, 0.2, z], [0, 5.2, z], 0.12, 5).rod(W, [2.2, 0.2, z], [0, 5.2, z], 0.12, 5); }
  b.box(W, 0.25, 0.25, 3.4, -2.2, 0.13, 0).box(W, 0.25, 0.25, 3.4, 2.2, 0.13, 0).rod(W, [0, 5.2, -1.6], [0, 5.2, 1.6], 0.14, 6);
  b.rod(W, [0, 0.3, 0], [0, 9, 0], 0.16, 6).rod(W, [0, 8.6, 0], [6.5, 12.5, 0], 0.13, 6).rod(W, [0, 5.4, 0], [3.4, 10.6, 0], 0.09, 5).rod(W, [0, 9, 0], [-2.2, 5.3, 0], 0.08, 5);
  // the wheel, 4.6 m across, on the windlass
  for (const z of [0.7, -0.7]) { b.add(new THREE.TorusGeometry(2.3, 0.09, 5, 28), W, mat4(0, 2.75, z)); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.rod(W, [0, 2.75, z], [Math.cos(a) * 2.3, 2.75 + Math.sin(a) * 2.3, z], 0.05, 4); } }
  for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; b.box(W, 0.16, 0.03, 1.4, Math.cos(a) * 2.3, 2.75 + Math.sin(a) * 2.3, 0, 0, 0, a + Math.PI / 2); }
  b.rod(I, [0, 2.75, -1.6], [0, 2.75, 1.6], 0.09, 6);
  b.rod(R, [0, 2.9, 0.2], [0.2, 8.9, 0.1], 0.02, 4).rod(R, [0.2, 8.9, 0.1], [6.4, 12.45, 0], 0.02, 4).rod(R, [6.4, 12.45, 0], [6.4, 4.4, 0], 0.02, 4);
  b.box(S, 1.1, 0.7, 0.8, 6.4, 3.9, 0).box(I, 0.5, 0.06, 0.06, 6.4, 4.3, 0);
  return b;
}
