// Inside the three pyramids: their passages and chambers at true size and in their surveyed places (after Petrie, 1883, and
// Maragioglio & Rinaldi), walkable, lit by a few oil lamps. Everything here is in each pyramid's own frame: x metres east of its
// centre, z metres south of it (the game's z runs south), y metres above its base.
import * as THREE from 'three';
import { C, lin, shade } from './site-egypt-kit.js';
import { K1, K2, K3, builtCourses } from './site-egypt-land.js';

const tan = (deg) => Math.tan((deg * Math.PI) / 180);
const LIME = lin(C.lime), GRANITE = lin(C.granite), ROCK = shade(C.rock, 0.85), DARK = [0.02, 0.018, 0.015], TURA = lin(C.tura);
const STEP = 1.5;   // largest piece of wall, so that the lamplight baked into the corners reads

/**
 * A cell: a passage or a room, a box along the line a -> b ([x, z]) hw either side of it, its floor rising from y0 to y1 and its
 * ceiling ht above the floor. o: { walls: 'LRAB' (left l = +hw, right, the end at a, the end at b), gapsL/gapsR: [[s0, s1, h0, h1]],
 * gapsA/gapsB: [[l0, l1, h0, h1]], ceil (false: open), ceilGaps/floorGaps: [[s0, s1]], gable (rise of a ridged roof along the line),
 * steps (footholds on a slope), col, draw (false: collision only), inset: [left, right] (how far the walls keep you off them), holes }
 */
const cell = (a, b, hw, y0, y1, ht, o = {}) => ({ a, b, hw, y0, y1, ht, walls: 'LR', col: LIME, ...o });

// ---------------------------------------------------------------------------------------------------------------------------------
// The layouts
// ---------------------------------------------------------------------------------------------------------------------------------
function khufu() {
  const X = 7.29, w = 0.525, k = K1.b / 2 / K1.H, D = tan(26.52), A = tan(26.04), cells = [], extra = [], lamps = [];
  const ye = 16.97, ze = -(K1.b / 2 - ye * k), yD = (z) => ye - (z - ze) * D;                 // the entrance and the Descending Passage
  const yBot = -27.0, zBot = ze + (ye - yBot) / D;                                               // its foot, 27 m down in the rock (about 99 m of passage)
  const zG = -41.6, yQ = 21.7, yA = (z) => yQ - (zG - z) * A;                                   // the Ascending Passage rises to the Gallery's foot
  const zFoot = ((ye + 1.34 + ze * D) - (yQ - zG * A)) / (D + A),   // where its floor leaves the roof of the Descending Passage
   zPlug = zFoot + 5.2 * Math.cos(Math.atan(A));
  const zR = -78.5;   // where the robbers broke through the west wall of the Descending Passage, to climb round the granite plugs
  cells.push(cell([X, ze - 0.6], [X, zBot], w, yD(ze - 0.6), yBot, 1.34, { steps: true, ceilGaps: [[zFoot - ze + 0.6 - 0.2, zFoot - ze + 0.6 + 2.6]], gapsL: [[zR - ze + 0.6 - 0.9, zR - ze + 0.6 + 0.6, 0, 1.34]], name: 'Descending Passage' }));
  const zC0 = zBot + 8.9;   // the low horizontal passage, then the Subterranean Chamber
  cells.push(cell([X, zBot], [X, zC0], 0.4, yBot, yBot, 0.9, { col: ROCK }));
  cells.push(cell([-5.5, zC0 + 4.18], [8.58, zC0 + 4.18], 4.18, yBot, yBot, 4.0, { walls: 'LRAB', col: ROCK, gapsR: [[X - 0.4 + 5.5, X + 0.4 + 5.5, 0, 0.9]], gapsL: [[5.5 - 0.35, 5.5 + 0.35, 0, 0.75]], holes: [[2, 4, zC0 + 3.6, zC0 + 5.6], [-5.5, -1.5, zC0 + 5.2, zC0 + 8.36]], name: 'Subterranean Chamber' }));
  cells.push(cell([0, zC0 + 8.36], [0, zC0 + 8.36 + 16.4], 0.35, yBot, yBot, 0.75, { col: ROCK, walls: 'LRB', draw: true, walk: false }));   // the dead-end passage, too low to walk
  extra.push({ pit: [2, 4, zC0 + 3.6, zC0 + 5.6, yBot] }, { rock: [-5.5, -1.5, zC0 + 5.2, zC0 + 8.36, yBot, yBot + 1.3] });
  // the robbers' way round the plugs, and the Ascending Passage above them
  cells.push(cell([X - 1.05, zR - 0.6], [X - 1.05, zPlug + 0.6], 0.75, yD(zR) + 0.05, yA(zPlug + 0.6), 1.9, { walls: 'LRAB', col: ROCK, steps: true, gapsR: [[0, 1.5, 0, 1.6], [zPlug - zR - 0.4, zPlug - zR + 1.2, 0, 1.3]], inset: [0.2, 0], name: 'robbers\' tunnel' }));
  cells.push(cell([X, zPlug], [X, zG], w, yA(zPlug), yQ, 1.34, { steps: true, walls: 'LR', gapsL: [[0, 0.8, 0, 1.34]], name: 'Ascending Passage' }));
  extra.push({ plugs: [X, w, zFoot, zPlug, yA] });
  // the Queen's Chamber passage, beneath the Gallery's floor, and the chamber
  const zQ = -2.9, zStep = -8.4;
  cells.push(cell([X, zG], [X, zG + 2.4], w, yQ, yQ, 8, { walls: '', ceil: false, inset: [0, 0] }));   // the foot of the Gallery, open above
  cells.push(cell([X, zG + 2.4], [X, zStep], w, yQ, yQ, 1.17, {}));
  cells.push(cell([X, zStep], [X, zQ], w, yQ - 0.5, yQ - 0.5, 1.73, { gapsA: [[-w, w, 0.5, 1.73]], walls: 'LRA' }));
  cells.push(cell([2.6, -0.025], [7.83, -0.025], 2.875, yQ - 0.5, yQ - 0.5, 4.69, { walls: 'LRAB', gable: 1.54, gapsR: [[X - w - 2.6, X + w - 2.6, 0, 1.73]], gapsB: [[-0.785 + 0.61, 0.785 + 0.61, 0, 4.67]], name: 'Queen\'s Chamber' }));
  extra.push({ niche: [7.83, 0.585, yQ - 0.5] });
  // the Grand Gallery, the Antechamber, the King's Chamber
  const zT = zG + 46.7 * Math.cos(Math.atan(A)), yT = yA(zT), yK = 42.84;
  extra.push({ gallery: [X, zG, zT, yQ, A] });
  for (const [sd, ins] of [[1, [0, 0.2]], [-1, [0.2, 0]]]) {   // the side ramps (worn down at their foot, where you step up onto them from the landing)
    cells.push(cell([X + sd * 0.775, zG], [X + sd * 0.775, zG + 1.2], 0.255, yQ + 0.05, yA(zG + 1.2) + 0.53, 6, { draw: false, inset: ins }));
    cells.push(cell([X + sd * 0.775, zG + 1.2], [X + sd * 0.775, zT], 0.255, yA(zG + 1.2) + 0.53, yT + 0.53, 6, { draw: false, inset: ins }));
  }
  cells.push(cell([X, zG + 2.4], [X, zT], 0.52, yA(zG + 2.4), yT, 6, { draw: false, inset: [0, 0] }));
  cells.push(cell([X, zT], [X, zT + 1.52], 1.03, yK, yK, 7.5, { draw: false, inset: [0.2, 0.2] }));   // the Great Step
  cells.push(cell([X, zT + 1.52], [X, zT + 2.84], w, yK, yK, 1.11, {}));
  cells.push(cell([X, zT + 2.84], [X, zT + 3.49], 0.825, yK, yK, 1.11, { col: GRANITE, walls: 'LRA', gapsA: [[-w, w, 0, 1.11]] }));
  cells.push(cell([X, zT + 3.49], [X, zT + 5.79], 0.825, yK, yK, 3.79, { col: GRANITE, walls: 'LRB', gapsB: [[-w, w, 0, 1.11]], name: 'Antechamber' }));
  extra.push({ leaf: [X, zT + 3.2, zT + 3.6, yK + 1.11, yK + 3.79], slots: [X, 0.825, zT + 3.9, yK] });
  cells.push(cell([X, zT + 5.79], [X, zT + 8.32], w, yK, yK, 1.11, { col: GRANITE }));
  const zK = zT + 8.32;
  cells.push(cell([-2.6, zK + 2.615], [7.87, zK + 2.615], 2.615, yK, yK, 5.84, { walls: 'LRAB', col: GRANITE, gapsR: [[X - w + 2.6, X + w + 2.6, 0, 1.11]], holes: [[-1.95, -0.85, zK + 1.45, zK + 3.85]], name: 'King\'s Chamber' }));
  extra.push({ sarcophagus: [-1.4, zK + 2.65, yK, 0.98, 2.28, 1.05, GRANITE, true] }, { mark: [2.5, zK + 0.01, yK + 0.9, 'z'] }, { mark: [2.5, zK + 5.22, yK + 0.9, 'Z'] });   // and the mouths of the two shafts
  extra.push({ shaft: [X - w, zG + 0.6, yQ, 'R'] });   // the mouth of the Well Shaft at the foot of the Gallery's west wall
  lamps.push([X, yBot + 1.2, zBot - 6], [1.5, yBot + 1.6, zC0 + 3], [X, yD(-40) + 1, -40], [X - 1, yD(zR) + 1.2, zR + 1], [X, yA(-55) + 1, -55], [X, yQ + 1.6, zG + 1.2], [5.2, yQ, 0], [X, yA(-24) + 2.5, -24], [X, yA(-6) + 2.5, -6], [X, yK + 1.6, zT + 4.6], [3, yK + 2.2, zK + 2.6]);
  // a stair of blocks up to the entrance, 17 m up the north face (not ancient: the casing hid the door, which is shown open)
  const stair = []; for (let i = 0; i < 43; i++) { const top = ye - i * 0.4; if (top < 0.2) break; stair.push([X, ze - 0.55 - i * 0.5, 2.2, 0.5, top]); }
  return { K: K1, cells, extra, lamps, hole: [X - w, X + w, ye - 0.3, ye + 1.7], stair };
}

function khafre() {
  const X = 12.6, w = 0.525, k = K2.b / 2 / K2.H, cells = [], extra = [], lamps = [];
  const ye = 11.54, ze = -(K2.b / 2 - ye * k), U = tan(25.92), z0 = ze + ye / U;                    // upper entrance and passage, down to the rock
  const zB = -2.5;   // the burial chamber's north wall
  cells.push(cell([X, ze - 0.6], [X, z0], w, ye + 0.6 * U, 0, 1.19, { steps: true, col: GRANITE, name: 'upper descending passage' }));
  const zJ = -84 + 10 / tan(22);   // where the lower passage, climbing back, comes up through the floor of the upper one
  cells.push(cell([X, z0], [X, zB], w, 0, 0, 1.78, { floorGaps: [[zJ - 3.2 - z0, zJ - z0]], name: 'horizontal passage' }));
  extra.push({ portcullis: [X, w, z0 + 1.2, 0, 1.78] });
  cells.push(cell([-1, 0], [13.15, 0], 2.5, 0, 0, 5.3, { walls: 'LRAB', gable: 1.53, gapsR: [[X - w + 1, X + w + 1, 0, 1.78]], holes: [[-0.2, 2.6, -0.8, 0.8]], name: 'burial chamber' }));
  extra.push({ sarcophagus: [1.2, 0, 0, 2.63, 1.07, 0.97, GRANITE, false, true] });
  // the lower entrance in the pavement, its passage into the rock, the subsidiary chamber, and the climb back to the upper passage
  const zl = -(K2.b / 2) - 9.5, LD = tan(21.67), zl1 = zl + 10 / LD;
  cells.push(cell([X, zl], [X, zl1], w, 0, -10, 1.19, { steps: true, clip: 0, name: 'lower descending passage' }));
  cells.push(cell([X, zl1], [X, -84], w, -10, -10, 1.75, { gapsL: [[-89.2 - zl1, -87.8 - zl1, 0, 1.2]] }));
  cells.push(cell([X - w, -88.5], [11, -88.5], 0.7, -10, -10, 1.2, { walls: 'LR' }));
  cells.push(cell([0.6, -88], [11, -88], 1.56, -10, -10, 2.61, { walls: 'LRAB', gapsB: [[-0.5 - 0, 0.5 - 0, 0, 1.2]].map(([a, b, c, d]) => [a - 0.5, b - 0.5, c, d]), name: 'subsidiary chamber' }));
  cells.push(cell([X, -84], [X, zJ], w, -10, 0, 1.19, { steps: true, clip: 0, walls: 'LR', name: 'lower ascending passage' }));
  lamps.push([6, 3.5, 0], [X, 1.4, -40], [X, 1.4, -70], [5, -8.6, -88], [X, -8.8, zl1 + 1]);
  return { K: K2, cells, extra, lamps, hole: [X - w, X + w, ye - 0.3, ye + 1.6], mouth: [X, w, zl, zl + 3.3] };
}

function menkaure() {
  const X = 0, w = 0.525, k = K3.b / 2 / K3.H, cells = [], extra = [], lamps = [];
  const ye = 4.0, ze = -(K3.b / 2 - ye * k), M = tan(26.03), z1 = ze + 28.5, y1 = ye - 28.5 * M;
  cells.push(cell([X, ze - 0.6], [X, z1], w, ye + 0.6 * M, y1, 1.2, { steps: true, col: GRANITE, name: 'descending passage' }));
  cells.push(cell([X, z1], [X, z1 + 3.84], 1.04, y1, y1, 1.91, { walls: 'LRAB', gapsA: [[-w, w, 0, 1.2]], gapsB: [[-w, w, 0, 1.2]], panels: true, name: 'panelled chamber' }));
  const zA = z1 + 3.84 + 8.12;
  cells.push(cell([X, z1 + 3.84], [X, zA], w, y1, y1, 1.2, { col: GRANITE }));
  extra.push({ slots3: [X, w, z1 + 4.6, y1] });
  const zAn = zA + 1.92, yL = y1 - 4;
  extra.push({ mark: [0, zAn - 1.91, y1 + 3.3, 'z', 1.05, 1.2] });   // the mouth of the older, unfinished passage above
  cells.push(cell([-7.1, zAn], [7.1, zAn], 1.92, y1, y1, 4.87, { walls: 'LRAB', gapsR: [[7.1 - w, 7.1 + w, 0, 1.2]], floorGaps: [[0, 3.1]], floorGapL: [-w, w], holes: [[-7.1, -4, zAn - w, zAn + w]], name: 'antechamber' }));
  cells.push(cell([-4, zAn], [-12.5, zAn], w, y1, yL, 1.8, { steps: true, walls: 'LR', gapsL: [[5.0, 6.0, 0, 1.8]], clip: y1, name: 'passage down' }));
  cells.push(cell([-12.5, zAn], [-14.6, zAn], w, yL, yL, 1.8, {}));
  cells.push(cell([-21.2, zAn], [-14.6, zAn], 1.3, yL, yL, 2.5, { walls: 'LRAB', col: GRANITE, gable: 0.92, gapsB: [[-w, w, 0, 1.8]], holes: [[-20.9, -18.3, zAn - 0.55, zAn + 0.55]], name: 'burial chamber' }));
  extra.push({ sarcophagus: [-19.6, zAn, yL, 2.6, 0.95, 0.9, lin(C.basalt), false] });
  const yN = y1 - 3.0;
  cells.push(cell([-9.5, zAn - w], [-9.5, zAn - 2.6], 0.5, y1 - 2.6, yN, 1.8, { steps: true, walls: 'LR' }));
  cells.push(cell([-11.0, zAn - 4.15], [-8.0, zAn - 4.15], 1.55, yN, yN, 2.3, { walls: 'LRAB', gapsL: [[1.0, 2.0, 0, 1.8]], niches: true, name: 'niche room' }));
  lamps.push([0, y1 + 3.2, zAn], [-17.5, yL + 1.8, zAn], [0, y1 + 1.4, z1 + 1.9], [-9.5, yN + 1.5, zAn - 4.15], [X, (ye + y1) / 2 + 0.9, (ze + z1) / 2]);
  const stair = []; for (let i = 0; i < 12; i++) { const top = ye - i * 0.4; if (top < 0.2) break; stair.push([X, ze - 0.55 - i * 0.5, 2.0, 0.5, top]); }
  return { K: K3, cells, extra, lamps, hole: [X - w, X + w, ye - 0.3, ye + 1.6], stair };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------------------------------------------
class Tris {
  constructor() { this.t = []; }
  /** A flat quad facing `n` (it is turned to face it), col its colour. */
  quad(A, B, C2, D2, n, col) {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C2[0] - A[0], vy = C2[1] - A[1], vz = C2[2] - A[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, flip = cx * n[0] + cy * n[1] + cz * n[2] < 0;
    if (flip) { this.t.push([A, C2, B, n, col], [A, D2, C2, n, col]); } else { this.t.push([A, B, C2, n, col], [A, C2, D2, n, col]); }
    return this;
  }
  /** An axis-aligned box (outer faces). */
  box(x0, y0, z0, x1, y1, z1, col, faces = 'xXyYzZ') {
    const P = (a, b, c) => [a ? x1 : x0, b ? y1 : y0, c ? z1 : z0];
    if (faces.includes('x')) this.quad(P(0, 0, 0), P(0, 0, 1), P(0, 1, 1), P(0, 1, 0), [-1, 0, 0], col);
    if (faces.includes('X')) this.quad(P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0), [1, 0, 0], col);
    if (faces.includes('y')) this.quad(P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1), [0, -1, 0], col);
    if (faces.includes('Y')) this.quad(P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1), [0, 1, 0], col);
    if (faces.includes('z')) this.quad(P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), [0, 0, -1], col);
    if (faces.includes('Z')) this.quad(P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1), [0, 0, 1], col);
    return this;
  }
}
/** The parts of [a0, a1] x [h0, h1] left after cutting out the holes [[g0, g1, k0, k1]]: [[a0, a1, h0, h1]...]. */
function pieces(a0, a1, h0, h1, holes) {
  const cuts = [a0, a1]; for (const g of holes) for (const v of [g[0], g[1]]) if (v > a0 && v < a1) cuts.push(v);
  cuts.sort((p, q) => p - q); const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i], s1 = cuts[i + 1]; if (s1 - s0 < 1e-3) continue; const m = (s0 + s1) / 2;
    const ex = holes.filter((g) => g[0] <= m && g[1] >= m).map((g) => [Math.max(h0, g[2]), Math.min(h1, g[3])]).filter((g) => g[1] > g[0]).sort((p, q) => p[0] - q[0]);
    let h = h0; for (const [k0, k1] of ex) { if (k0 > h) out.push([s0, s1, h, k0]); h = Math.max(h, k1); } if (h < h1) out.push([s0, s1, h, h1]);
  }
  return out;
}
const split = (a0, a1) => { const n = Math.max(1, Math.ceil((a1 - a0) / STEP)), out = []; for (let i = 0; i < n; i++) out.push([a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n]); return out; };

function frame(c) {
  const L = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]), ux = (c.b[0] - c.a[0]) / L, uz = (c.b[1] - c.a[1]) / L, vx = -uz, vz = ux;
  const f = (s) => c.y0 + ((c.y1 - c.y0) * s) / L;
  return { L, ux, uz, vx, vz, f, P: (s, l, y) => [c.a[0] + ux * s + vx * l, y, c.a[1] + uz * s + vz * l] };
}
/** Draws a cell's inner faces into T. */
function drawCell(T, c) {
  const { L, ux, uz, vx, vz, f, P } = frame(c), col = c.col, wall = shade(col, 0.9), top = (s) => Math.min(f(s) + c.ht, c.clip ?? Infinity);
  const wallSide = (l, gaps, nIn) => {
    for (const [a0, a1, h0, h1] of pieces(0, L, 0, c.ht + (c.gable ? 0 : 0), gaps || [])) for (const [s0, s1] of split(a0, a1)) for (const [k0, k1] of split(h0, h1)) {
      const y00 = f(s0) + k0, y01 = Math.min(f(s0) + k1, top(s0)), y10 = f(s1) + k0, y11 = Math.min(f(s1) + k1, top(s1)); if (y01 <= y00 && y11 <= y10) continue;
      T.quad(P(s0, l, y00), P(s1, l, y10), P(s1, l, Math.max(y10, y11)), P(s0, l, Math.max(y00, y01)), nIn, wall);
    }
  };
  if (c.walls.includes('L')) wallSide(c.hw, c.gapsL, [-vx, 0, -vz]);
  if (c.walls.includes('R')) wallSide(-c.hw, c.gapsR, [vx, 0, vz]);
  for (const [end, s, sg] of [['A', 0, 1], ['B', L, -1]]) {
    if (!c.walls.includes(end)) continue;
    const gaps = c['gaps' + end] || [], y = f(s), H = Math.min(c.ht, top(s) - y), n = [ux * sg, 0, uz * sg];
    for (const [l0, l1, h0, h1] of pieces(-c.hw, c.hw, 0, H, gaps)) for (const [a0, a1] of split(l0, l1)) for (const [k0, k1] of split(h0, h1)) T.quad(P(s, a0, y + k0), P(s, a1, y + k0), P(s, a1, y + k1), P(s, a0, y + k1), n, wall);
    if (c.gable) T.quad(P(s, -c.hw, y + c.ht), P(s, c.hw, y + c.ht), P(s, 0, y + c.ht + c.gable), P(s, 0, y + c.ht + c.gable), n, wall);
  }
  // floor: a stair of footholds where it slopes
  const fl = shade(col, 0.8), fg = (c.floorGaps || []);
  const floorQuad = (s0, s1, y) => { const gl = c.floorGapL || [-c.hw, c.hw];
    if (fg.some(([g0, g1]) => s0 >= g0 - 1e-3 && s1 <= g1 + 1e-3)) { for (const [l0, l1] of [[-c.hw, gl[0]], [gl[1], c.hw]]) if (l1 - l0 > 1e-3) T.quad(P(s0, l0, y), P(s1, l0, y), P(s1, l1, y), P(s0, l1, y), [0, 1, 0], fl); return; }
    T.quad(P(s0, -c.hw, y), P(s1, -c.hw, y), P(s1, c.hw, y), P(s0, c.hw, y), [0, 1, 0], fl); };
  const cutsF = [0, L]; for (const [g0, g1] of fg) cutsF.push(Math.max(0, Math.min(L, g0)), Math.max(0, Math.min(L, g1))); cutsF.sort((p, q) => p - q);
  if (c.steps && Math.abs(c.y1 - c.y0) > 0.3) {
    const n = Math.max(1, Math.round(L / 0.45)), d = L / n;
    for (let i = 0; i < n; i++) { const s0 = i * d, s1 = s0 + d, y = c.y1 > c.y0 ? f(s0) : f(s1), yr = c.y1 > c.y0 ? f(s1) : f(s0); floorQuad(s0, s1, y);
      const sr = c.y1 > c.y0 ? s1 : s0; T.quad(P(sr, -c.hw, Math.min(y, yr)), P(sr, c.hw, Math.min(y, yr)), P(sr, c.hw, Math.max(y, yr)), P(sr, -c.hw, Math.max(y, yr)), [-ux * Math.sign(c.y1 - c.y0), 0, -uz * Math.sign(c.y1 - c.y0)], shade(fl, 1.1)); }
  } else for (let i = 0; i < cutsF.length - 1; i++) for (const [s0, s1] of split(cutsF[i], cutsF[i + 1])) floorQuad(s0, s1, f(s0));
  // ceiling, flat or ridged
  if (c.ceil !== false) {
    const cg = c.ceilGaps || [], cut = [0, L]; for (const [g0, g1] of cg) cut.push(Math.max(0, Math.min(L, g0)), Math.max(0, Math.min(L, g1))); cut.sort((p, q) => p - q);
    for (let i = 0; i < cut.length - 1; i++) { const m = (cut[i] + cut[i + 1]) / 2; if (cg.some(([g0, g1]) => m > g0 && m < g1)) continue;
      for (const [s0, s1] of split(cut[i], cut[i + 1])) {
        if (f(s0) + c.ht > (c.clip ?? Infinity)) continue;
        if (c.gable) for (const sd of [-1, 1]) T.quad(P(s0, sd * c.hw, f(s0) + c.ht), P(s1, sd * c.hw, f(s1) + c.ht), P(s1, 0, f(s1) + c.ht + c.gable), P(s0, 0, f(s0) + c.ht + c.gable), [-vx * sd, -1, -vz * sd], shade(col, 0.8));
        else T.quad(P(s0, -c.hw, f(s0) + c.ht), P(s1, -c.hw, f(s1) + c.ht), P(s1, c.hw, f(s1) + c.ht), P(s0, c.hw, f(s0) + c.ht), [0, -1, 0], shade(col, 0.75));
      } }
  }
  if (c.panels) for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) { const s0 = 0.25 + i * 0.6, l = sd * (c.hw - 0.01); T.quad(P(s0, l, f(s0) + 0.3), P(s0 + 0.3, l, f(s0) + 0.3), P(s0 + 0.3, l, f(s0) + 1.6), P(s0, l, f(s0) + 1.6), [-vx * sd, 0, -vz * sd], shade(col, 0.55)); }   // the carved panelling, a palace façade in stone
  if (c.niches) for (let i = 0; i < 6; i++) { const east = i < 4, s = east ? L - 0.01 : 0.45 + (i - 4) * 1.2, l = east ? -1.2 + i * 0.8 : -(c.hw - 0.01), y = f(0) + 0.4;
    if (east) T.quad(P(s, l - 0.3, y), P(s, l + 0.3, y), P(s, l + 0.3, y + 1.0), P(s, l - 0.3, y + 1.0), [-ux, 0, -uz], DARK); else T.quad(P(s, l, y), P(s + 0.6, l, y), P(s + 0.6, l, y + 1.0), P(s, l, y + 1.0), [vx, 0, vz], DARK); }
}

/** The Grand Gallery: a slot 2.06 m wide and 8.6 m high, its walls stepping in by a hand in each of seven courses, a ramp along each side. */
function gallery(T, X, z0, z1, y0, A) {
  const yA = (z) => y0 + (z - z0) * A, n = Math.ceil((z1 - z0) / STEP), base = 2.82, course = (8.6 - base) / 7, col = LIME, wall = shade(LIME, 0.92);
  for (let i = 0; i < n; i++) {
    const za = z0 + ((z1 - z0) * i) / n, zb = z0 + ((z1 - z0) * (i + 1)) / n, ya = yA(za), yb = yA(zb);
    for (const sd of [-1, 1]) {
      const x = (l) => X + sd * l, nIn = [-sd, 0, 0];
      for (const [h0, h1] of split(0.53, base)) T.quad([x(1.03), ya + h0, za], [x(1.03), yb + h0, zb], [x(1.03), yb + h1, zb], [x(1.03), ya + h1, za], nIn, wall);
      for (let k = 0; k < 7; k++) { const l = 1.03 - 0.076 * (k + 1), h0 = base + k * course, h1 = h0 + course;
        T.quad([x(l), ya + h0, za], [x(l), yb + h0, zb], [x(l), yb + h1, zb], [x(l), ya + h1, za], nIn, shade(wall, 1 - k * 0.03)).quad([x(l + 0.076), ya + h0, za], [x(l), ya + h0, za], [x(l), yb + h0, zb], [x(l + 0.076), yb + h0, zb], [0, -1, 0], shade(wall, 0.7)); }
      T.quad([x(1.03), ya + 0.53, za], [x(0.52), ya + 0.53, za], [x(0.52), yb + 0.53, zb], [x(1.03), yb + 0.53, zb], [0, 1, 0], shade(col, 0.85));   // the ramp's top
      T.quad([x(0.52), ya + 0.53, za], [x(0.52), yb + 0.53, zb], [x(0.52), yb - 1.2, zb], [x(0.52), ya - 1.2, za], [-sd, 0, 0], shade(col, 0.8));   // and its inner face
      for (let s = 0.3; s < zb - za; s += 1.56) { const z = za + s, y = yA(z) + 0.535; T.quad([x(0.92), y, z], [x(0.62), y, z], [x(0.62), y, z + 0.5], [x(0.92), y, z + 0.5], [0, 1, 0], DARK); }   // the slots cut in the ramps
    }
    const rl = 1.03 - 0.076 * 7, yt = 8.6; T.quad([X - rl, ya + yt, za], [X + rl, ya + yt, za], [X + rl, yb + yt, zb], [X - rl, yb + yt, zb], [0, -1, 0], shade(col, 0.7));   // the roof slabs
    if (za >= z0 + 2.4 - 1e-3) { const s = 0.45, m = Math.max(1, Math.round((zb - za) / s)); for (let j = 0; j < m; j++) { const q0 = za + ((zb - za) * j) / m, q1 = za + ((zb - za) * (j + 1)) / m, y = yA(q0);
      T.quad([X - 0.52, y, q0], [X + 0.52, y, q0], [X + 0.52, y, q1], [X - 0.52, y, q1], [0, 1, 0], shade(col, 0.8)).quad([X - 0.52, y, q1], [X + 0.52, y, q1], [X + 0.52, yA(q1), q1], [X - 0.52, yA(q1), q1], [0, 0, -1], shade(col, 0.9)); } }   // footholds up the floor
  }
  // the pit at the Gallery's foot above the Queen's passage: its sides; the north end wall with the mouth of the Ascending Passage; the Great Step and the south wall
  T.quad([X - 0.52, y0 + 1.17, z0 + 2.4], [X + 0.52, y0 + 1.17, z0 + 2.4], [X + 0.52, yA(z0 + 2.4), z0 + 2.4], [X - 0.52, yA(z0 + 2.4), z0 + 2.4], [0, 0, -1], shade(col, 0.85));
  for (const [l0, l1, h0, h1] of pieces(-1.03, 1.03, 0, 8.6, [[-0.525, 0.525, 0, 1.34]])) T.quad([X + l0, y0 + h0, z0], [X + l1, y0 + h0, z0], [X + l1, y0 + h1, z0], [X + l0, y0 + h1, z0], [0, 0, 1], wall);
  const yK = 42.84, yT = yA(z1);
  T.quad([X - 1.03, yT, z1], [X + 1.03, yT, z1], [X + 1.03, yK, z1], [X - 1.03, yK, z1], [0, 0, -1], wall).quad([X - 1.03, yK, z1], [X + 1.03, yK, z1], [X + 1.03, yK, z1 + 1.52], [X - 1.03, yK, z1 + 1.52], [0, 1, 0], shade(col, 0.8));
  for (const sd of [-1, 1]) T.quad([X + sd * 1.03, yK, z1], [X + sd * 1.03, yK, z1 + 1.52], [X + sd * 1.03, yT + 8.6, z1 + 1.52], [X + sd * 1.03, yT + 8.6, z1], [-sd, 0, 0], wall);
  for (const [l0, l1, h0, h1] of pieces(-1.03, 1.03, 0, yT + 8.6 - yK, [[-0.525, 0.525, 0, 1.11]])) T.quad([X + l0, yK + h0, z1 + 1.52], [X + l1, yK + h0, z1 + 1.52], [X + l1, yK + h1, z1 + 1.52], [X + l0, yK + h1, z1 + 1.52], [0, 0, -1], wall);
  T.quad([X - 1.03, yT + 8.6, z1], [X + 1.03, yT + 8.6, z1], [X + 1.03, yT + 8.6, z1 + 1.52], [X - 1.03, yT + 8.6, z1 + 1.52], [0, -1, 0], shade(col, 0.7));
}

function drawExtra(T, e) {
  if (e.gallery) gallery(T, ...e.gallery);
  if (e.mark) { const [x, z, y, ax, w = 0.21, h = 0.21] = e.mark, n = ax === 'z' ? [0, 0, 1] : [0, 0, -1]; T.quad([x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z], n, DARK); }
  if (e.pit) { const [x0, x1, z0, z1, y] = e.pit; T.quad([x0, y + 0.02, z0], [x1, y + 0.02, z0], [x1, y + 0.02, z1], [x0, y + 0.02, z1], [0, 1, 0], DARK); T.box(x0 - 0.15, y, z0 - 0.15, x1 + 0.15, y + 0.12, z0, ROCK, 'zY').box(x0 - 0.15, y, z1, x1 + 0.15, y + 0.12, z1 + 0.15, ROCK, 'ZY'); }
  if (e.rock) { const [x0, x1, z0, z1, y0, y1] = e.rock; T.box(x0, y0, z0, x1, y1, z1, shade(ROCK, 0.9), 'XYz'); T.box(x0, y1, z0 + 1.2, x1 - 1.6, y1 + 1.1, z1, shade(ROCK, 0.85), 'XYz'); }   // the rock the masons never cut away
  if (e.plugs) { const [X, w, zf, zp, yA] = e.plugs; const ht = 1.34;   // the three granite plugs, still in place: their lower end in the roof of the Descending Passage, the upper where the robbers' tunnel comes in
    T.quad([X - w, yA(zp), zp], [X + w, yA(zp), zp], [X + w, yA(zp) + ht, zp], [X - w, yA(zp) + ht, zp], [0, 0.45, -1], GRANITE).quad([X - w, yA(zf) - 0.02, zf], [X + w, yA(zf) - 0.02, zf], [X + w, yA(zf + 2.4) - 0.02, zf + 2.4], [X - w, yA(zf + 2.4) - 0.02, zf + 2.4], [0, -1, 0], GRANITE); }
  if (e.niche) { const [x, zc, y] = e.niche; for (let k = 0; k < 4; k++) { const hw = 0.785 - 0.13 * k, y0 = y + k * 1.17, y1 = y0 + 1.17;   // the corbelled niche in the east wall
    T.quad([x + 1.04, y0, zc - hw], [x + 1.04, y0, zc + hw], [x + 1.04, y1, zc + hw], [x + 1.04, y1, zc - hw], [-1, 0, 0], shade(LIME, 0.7));
    for (const sd of [-1, 1]) T.quad([x, y0, zc + sd * hw], [x + 1.04, y0, zc + sd * hw], [x + 1.04, y1, zc + sd * hw], [x, y1, zc + sd * hw], [0, 0, -sd], shade(LIME, 0.8));
    if (k) for (const sd of [-1, 1]) T.quad([x, y0, zc + sd * hw], [x, y0, zc + sd * (hw + 0.13)], [x, y1, zc + sd * (hw + 0.13)], [x, y1, zc + sd * hw], [-1, 0, 0], shade(LIME, 0.9));
    T.quad([x, y0, zc - hw], [x + 1.04, y0, zc - hw], [x + 1.04, y0, zc + hw], [x, y0, zc + hw], [0, 1, 0], shade(LIME, 0.75)); }
    T.quad([x, y + 4.68, zc - 0.4], [x + 1.04, y + 4.68, zc - 0.4], [x + 1.04, y + 4.68, zc + 0.4], [x, y + 4.68, zc + 0.4], [0, -1, 0], shade(LIME, 0.6)); }
  if (e.leaf) { const [X, z0, z1, y0, y1] = e.leaf; T.box(X - 0.825, y0, z0, X + 0.825, y1, z1, shade(GRANITE, 0.85), 'yzZ'); }   // the granite leaf you stoop under
  if (e.slots) { const [X, hw, z0, y] = e.slots; for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) T.quad([X + sd * (hw - 0.01), y + 0.3, z0 + k * 0.55], [X + sd * (hw - 0.01), y + 0.3, z0 + k * 0.55 + 0.25], [X + sd * (hw - 0.01), y + 3.6, z0 + k * 0.55 + 0.25], [X + sd * (hw - 0.01), y + 3.6, z0 + k * 0.55], [-sd, 0, 0], DARK); }   // the portcullis grooves, empty
  if (e.slots3) { const [X, w, z0, y] = e.slots3; for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) T.quad([X + sd * (w - 0.01), y, z0 + k * 1.1], [X + sd * (w - 0.01), y, z0 + k * 1.1 + 0.3], [X + sd * (w - 0.01), y + 1.2, z0 + k * 1.1 + 0.3], [X + sd * (w - 0.01), y + 1.2, z0 + k * 1.1], [-sd, 0, 0], DARK); }
  if (e.portcullis) { const [X, w, z, y, h] = e.portcullis; T.quad([X - w, y + h - 0.01, z], [X + w, y + h - 0.01, z], [X + w, y + h - 0.01, z + 0.4], [X - w, y + h - 0.01, z + 0.4], [0, -1, 0], shade(GRANITE, 0.7)); }   // the raised portcullis, its foot in the roof
  if (e.sarcophagus) { const [x, z, y, w, d, h, col, hollow, sunk] = e.sarcophagus, y0 = sunk ? y - h + 0.4 : y, y1 = y0 + h;
    T.box(x - w / 2, y0, z - d / 2, x + w / 2, y1, z + d / 2, col, 'xXzZY');
    T.quad([x - w / 2 + 0.15, y1 + 0.005, z - d / 2 + 0.15], [x + w / 2 - 0.15, y1 + 0.005, z - d / 2 + 0.15], [x + w / 2 - 0.15, y1 + 0.005, z + d / 2 - 0.15], [x - w / 2 + 0.15, y1 + 0.005, z + d / 2 - 0.15], [0, 1, 0], hollow || sunk ? DARK : shade(col, 1.1));
    if (sunk) T.box(x + w / 2 + 0.3, y, z - 0.6, x + w / 2 + 1.5, y + 0.28, z + 0.5, shade(col, 0.9), 'xXzZY'); }   // Khafre's lid lies broken beside it
  if (e.shaft) { const [x, z, y] = e.shaft; T.quad([x + 0.01, y, z - 0.35], [x + 0.01, y, z + 0.35], [x + 0.01, y + 0.9, z + 0.35], [x + 0.01, y + 0.9, z - 0.35], [1, 0, 0], DARK); }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// One pyramid's inside: its mesh, lamps and the floor you stand on
// ---------------------------------------------------------------------------------------------------------------------------------
class Inside {
  constructor(def, mat) {
    const { K, cells, extra, lamps } = def; this.K = K; this.def = def;
    const T = new Tris(); for (const c of cells) if (c.draw !== false) drawCell(T, c); for (const e of extra) drawExtra(T, e);
    // the lamps: a flame on a little stand, and their light baked into the stone
    for (const [x, y, z] of lamps) { T.box(x - 0.08, y - 0.5, z - 0.08, x + 0.08, y - 0.38, z + 0.08, shade(C.clay, 0.5)); for (const r of [0, Math.PI / 2]) { const c = Math.cos(r) * 0.06, s = Math.sin(r) * 0.06; T.quad([x - c, y - 0.38, z - s], [x + c, y - 0.38, z + s], [x, y - 0.2, z], [x, y - 0.2, z], [s, 0, -c], [4, 2.6, 1.0]).quad([x + c, y - 0.38, z + s], [x - c, y - 0.38, z - s], [x, y - 0.2, z], [x, y - 0.2, z], [-s, 0, c], [4, 2.6, 1.0]); } }
    const tri = T.t.map((t) => ({ t, y: Math.min(t[0][1], t[1][1], t[2][1]) })).sort((a, b) => a.y - b.y);
    this.minY = tri.map((q) => q.y);
    const N = tri.length * 3, pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), col = new Float32Array(N * 3), uv = new Float32Array(N * 2);
    tri.forEach(({ t }, i) => {
      const n = t[3], nl = Math.hypot(n[0], n[1], n[2]) || 1, ax = Math.abs(n[1]) > 0.7 ? 1 : Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2;
      for (let k = 0; k < 3; k++) {
        const p = t[k], o = (i * 3 + k) * 3; pos[o] = K.x + p[0]; pos[o + 1] = K.lvl + p[1]; pos[o + 2] = K.z + p[2]; nor[o] = n[0] / nl; nor[o + 1] = n[1] / nl; nor[o + 2] = n[2] / nl;
        let light = 0.05; for (const [lx, ly, lz] of lamps) { const d = Math.hypot(p[0] - lx, p[1] - ly, p[2] - lz); light += 1.5 * Math.max(0, 1 - d / 9) ** 2; }
        const c = t[4], self = c[0] > 1.5; for (let j = 0; j < 3; j++) col[o + j] = self ? c[j] : c[j] * Math.min(1.25, light);
        uv[(i * 3 + k) * 2] = (ax === 0 ? p[2] : p[0]) / 2.5; uv[(i * 3 + k) * 2 + 1] = (ax === 1 ? p[2] : p[1]) / 2.5;
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere(); this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.cells = cells.filter((c) => c.walk !== false).map((c) => ({ ...c, ...frame(c), maxY: Math.max(c.y0, c.y1), crouch: Math.min(0.62, Math.max(0, 1.85 - c.ht)) }));
    this.top = -1;
  }
  update(year) {
    const K = this.K, top = year < K.y0 ? -1 : year >= K.y1 ? 1e9 : (builtCourses(K, year) * K.H) / K.n;
    if (top === this.top) return; this.top = top;
    let n = 0; while (n < this.minY.length && this.minY[n] <= Math.max(top, 0) + 0.5) n++;
    this.mesh.visible = top >= 0 && n > 0; this.mesh.geometry.setDrawRange(0, n * 3);
  }
  /** The floor (lowered where you must stoop) of the passage or room at (x, z) nearest the feet, kept rad from its walls; or null. */
  find(x, z, feet, rad) {
    if (this.top < 0) return null;
    const K = this.K, lx = x - K.x, lz = z - K.z, fy = feet - K.lvl; let best = null, bd = Infinity;
    for (const c of this.cells) {
      if (c.maxY > Math.max(this.top, 0) + 0.5) continue;
      const dx = lx - c.a[0], dz = lz - c.a[1], s = dx * c.ux + dz * c.uz, l = dx * c.vx + dz * c.vz, ins = c.inset || [rad, rad];
      const sA = c.walls.includes('A') ? rad : -0.4, sB = c.walls.includes('B') ? rad : -0.4;
      if (s < sA || s > c.L - sB || l > c.hw - ins[0] || l < -c.hw + ins[1]) continue;
      if (c.holes && c.holes.some((h) => lx > h[0] - rad && lx < h[1] + rad && lz > h[2] - rad && lz < h[3] + rad)) continue;
      const y = c.f(s) - c.crouch, d = y - fy; if (d > 0.75 || d < -1.0) continue;
      if (Math.abs(d) < bd) { bd = Math.abs(d); best = y; }
    }
    return best === null ? null : best + K.lvl;
  }
}

/** All three insides. mat: the material they share (unlit: the light is the lamps', baked in). */
export function buildInsides(group, map) {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, map }), defs = [khufu(), khafre(), menkaure()];
  const list = defs.map((d) => new Inside(d, mat)); for (const q of list) group.add(q.mesh);
  return {
    defs, list,
    update(year) { for (const q of list) q.update(year); },
    find(x, z, feet, rad = 0.2) { for (const q of list) { const y = q.find(x, z, feet, rad); if (y !== null) return y; } return null; },
  };
}
