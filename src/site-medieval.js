// Medieval Europe: Chartres, a cathedral town on the plain of the Beauce, from the Frankish village among Roman ruins (500)
// through the open fields and Fulbert's church (1000), the cathedral going up (1194–1221), the walled town, the plague (1348) and after.
// East is +x, south is +z. The town stands on flat ground at 6 m; the Eure runs along the east side.
import * as THREE from 'three';
import { rng, smooth } from './util.js?v=fea1c89f';
import { uToYear, yearToU } from './timeline.js?v=fea1c89f';
import { makeKinds } from './flora.js?v=fea1c89f';
import { actors } from './people-actors.js?v=fea1c89f';
import { Bag } from './vehicles-kit.js?v=fea1c89f';
import { Kit, Props, Followers, fin, mat4, texture, clipped, loop, smoke, append, grove } from './site-medieval-kit.js?v=fea1c89f';
import { beasts, baked, herdOf, Walkers, horse } from './site-medieval-beasts.js?v=fea1c89f';
import { woodenChurch, stoneChurch, westFront, northSpire, cathedralBody, scaffold, crane, walls } from './site-medieval-cathedral.js?v=fea1c89f';

const G = 6, WATER = 4.6, CZ = 18, RA = 175, RB = 150;   // ground, river level, and the town wall: an oval about (0, CZ)
const riverX = (z) => 338 + 14 * Math.sin(z / 170);
function base(x, z) {
  const d = Math.abs(x - riverX(z)); let h = d < 12 ? -2 : d < 22 ? -2 + (G + 2) * smooth((d - 12) / 10) : G;
  const far = Math.hypot(x, z);
  if (far > 620) h += smooth((far - 620) / 380) * (10 + 9 * Math.sin(x * 0.006 + 1) * Math.cos(z * 0.005));   // low swells on the horizon
  return h;
}
const hexA = (h, o) => { o[0] = (h >> 16 & 255) / 255; o[1] = (h >> 8 & 255) / 255; o[2] = (h & 255) / 255; };
const inTown = (x, z, k = 1) => (x / (RA * k)) ** 2 + ((z - CZ) / (RB * k)) ** 2 < 1;
const eye = { x: -150, z: 18 };
const PLAGUE = 1348;

const DARK = ['pane', 0x30363c, 'tile'];
const rd = rng(9731);   // chance for the detail alone: the town's layout keeps its own sequence
const TIMBER = [0x4a382a, 0x3e3026, 0x57422e, 0x352a22], SHUT = [0x6a4a30, 0x5a3c28, 0x7a5a3a, 0x4a4a3a, 0x6a3a2a, 0x3a4a44];
/** A hut of the early village: low wattle-and-daub walls under a deep hipped thatch. */
function hut(kit, r, w = 6.5, d = 4.6) {
  const c = [0xc8b890, 0xb8a47c, 0xd0c0a0][Math.floor(r() * 3)]; kit.shell = true;
  walls(kit, 'daub', -w / 2, -d / 2, w / 2, d / 2, 0, 1.7, 0.25, c, (s, l) => {
    if (s !== 's') return [];
    const o = { x: l * 0.4, y: 0, w: 0.9, h: 1.55, arch: 'flat', fill: ['plank', 0x4a3424, 'tile'] };
    kit.trim(o, 0.25, { head: ['plank', 0x4a382a, 0.14, 0.06, 0.2], jambs: ['plank', 0x4a382a, 0.12, 0.06] }); return [o];
  });
  kit.shell = false;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box('plank', sx * (w / 2 + 0.3) - 0.09, 0, sz * (d / 2 + 0.3) - 0.09, sx * (w / 2 + 0.3) + 0.09, 1.72, sz * (d / 2 + 0.3) + 0.09, 0x4a382a, 'tb');   // the corner posts stand proud of the daub
  kit.gable('thatch', null, -w / 2, -d / 2, w / 2, d / 2, 1.7, 3 + r() * 0.6, { over: 0.75, hip: 1.9, col: [0.75 + r() * 0.25, 0.75 + r() * 0.2, 0.7 + r() * 0.2] });
  kit.solid(-w / 2, -d / 2, w / 2, d / 2);
}
/** A town house: timber frame (or stone below), upper floors jettied over the street on their joists, shuttered windows, a steep roof. Front faces +z. */
function house(kit, r, { w, d, floors, late }) {
  const fh = 3, wallM = late || r() < 0.6 ? 'frame' : 'daub', roofM = late ? (r() < 0.85 ? 'tile' : 'thatch') : r() < 0.6 ? 'thatch' : 'tile', jet = floors > 1 && wallM === 'frame' ? 0.45 : 0;
  const tint = [[0.96, 0.93, 0.86], [0.9, 0.84, 0.72], [0.98, 0.9, 0.78], [0.85, 0.82, 0.76]][Math.floor(r() * 4)], stoneBase = late && r() < 0.3;
  const D = 0.22, tc = TIMBER[Math.floor(rd() * 4)], sc = SHUT[Math.floor(rd() * 6)], framed = wallM === 'frame', xo = w / 2 + D, shop = late && rd() < 0.45, PALE = 0xcfc7b6;
  kit.shell = true;
  for (let k = 0; k < floors; k++) {
    kit.shell = !(shop && k === 0);   // a shop's ground floor can be walked into: its walls keep their inner faces
    const z1 = d / 2 + jet * k, y = k * fh, stone = k === 0 && stoneBase;
    walls(kit, stone ? 'stone' : wallM, -w / 2, -d / 2, w / 2, z1, y, fh, D, stone ? 0xe0d8c8 : tint, (s, l) => {
      if (s === 's') {
        const o = k === 0 ? [shop ? { x: l * 0.28, y: 0, w: 1.3, h: 2.2, arch: stoneBase ? 'point' : 'flat' } : { x: l * 0.28, y: 0, w: 1.05, h: 2.1, arch: stoneBase ? 'point' : 'flat', fill: ['plank', 0x5a3c28, 'tile'], back: 0.7 }, { x: l * 0.7, y: 1, w: 1.5, h: 1.2, arch: 'flat', fill: DARK }] : [{ x: l * 0.28, y: 1, w: 1, h: 1.3, arch: 'flat', fill: DARK }, { x: l * 0.72, y: 1, w: 1, h: 1.3, arch: 'flat', fill: DARK }];
        o.forEach((h, i) => {
          const m = stone ? 'stone' : 'plank', c = stone ? PALE : tc;
          if (k === 0 && i === 0) kit.trim(h, D, { head: [m, c, stone ? 0.3 : 0.2, 0.06, 0.16], jambs: stone ? undefined : ['plank', tc, 0.14, 0.06], step: ['stone', 0xb0a898, 0.42, 0.16] });
          else kit.trim(h, D, { sill: [m, c, 0.1, 0.11, 0.1], head: [m, c, 0.15, 0.05, 0.1], bars: ['plank', tc, h.w > 1.2 ? 3 : 2, 1, 0.07], shutters: !(k === 0 && shop) && rd() < 0.8 ? ['plank', sc, 0.75 + rd() * 0.25] : undefined });
        });
        return o;
      }
      if (s === 'n' && r() < 0.6) { const h = { x: l / 2, y: 1.1, w: 0.8, h: 1.1, arch: 'flat', fill: DARK }; kit.trim(h, D, { sill: ['plank', tc, 0.08, 0.1, 0.08], head: ['plank', tc, 0.13, 0.05, 0.08] }); return [h]; }
      return [];
    });
    if (framed && !stone) for (const sx of [-1, 1]) kit.box('plank', sx * xo - (sx > 0 ? 0.2 : 0.06), y, z1 + D - 0.2, sx * xo + (sx > 0 ? 0.06 : 0.2), y + fh, z1 + D + 0.06, tc, 'tb');   // corner posts, proud of the plaster
    if (jet && k > 0) {
      const zp = d / 2 + jet * (k - 1) + D, n = Math.max(4, Math.round(w / 1.05));
      kit.box('plank', -w / 2 - 0.3, y - 0.24, zp - D, w / 2 + 0.3, y + 0.04, z1 + D + 0.08, tc, '');   // the bressumer carrying the floor above
      for (let i = 0; i <= n; i++) { const x = -w / 2 + (w * i) / n; kit.box('plank', x - 0.08, y - 0.4, zp, x + 0.08, y - 0.24, z1 + D + 0.05, tc, 'tnew'); }   // joist ends
      for (const sx of [-1, 1]) kit.poly('plank', [[sx * (xo - 0.1), y - 0.4, zp], [sx * (xo - 0.1), y - 0.4, z1 + D], [sx * (xo - 0.1), y - 1.15, zp]], tc);   // brackets
    }
  }
  kit.shell = false;
  // a low stone plinth keeps the sill beam off the wet ground
  if (!stoneBase) { const dx = -w / 2 + w * 0.28; kit.box('stone', -xo - 0.05, 0, -d / 2 - D - 0.05, xo + 0.05, 0.4, d / 2 + D, 0xa8a090, 'bs'); kit.box('stone', -xo - 0.05, 0, d / 2, dx - 0.7, 0.4, d / 2 + D + 0.05, 0xa8a090, 'bn'); kit.box('stone', dx + 0.7, 0, d / 2, xo + 0.05, 0.4, d / 2 + D + 0.05, 0xa8a090, 'bn'); }
  const zf = d / 2 + jet * (floors - 1), ridge = r() < 0.6 ? 'z' : 'x', span = ridge === 'z' ? w : d + jet * (floors - 1), thatch = roofM === 'thatch', H = floors * fh, rh = span * (thatch ? 0.62 : 0.72);
  kit.gable(roofM, wallM, -w / 2, -d / 2, w / 2, zf, H, rh, { axis: ridge, over: 0.55, wcol: tint, col: [0.8 + r() * 0.2, 0.8 + r() * 0.2, 0.8 + r() * 0.2], barge: thatch ? ['thatch', [0.5, 0.46, 0.36], 0.34] : ['plank', tc, 0.26] });
  if (framed) { if (ridge === 'z') kit.box('plank', -xo, H - 0.12, zf + D - 0.04, xo, H + 0.12, zf + D + 0.07, tc, 'n'); else for (const sx of [-1, 1]) kit.box('plank', sx * xo - 0.07, H - 0.12, -d / 2, sx * xo + 0.07, H + 0.12, zf + D, tc, ''); }   // the tie beam under the gable
  if (late && r() < 0.5) { const top = H + rh + 1; kit.box('stone', -w / 2 + 0.3, H, -d / 2 + 0.6, -w / 2 + 1.2, top, -d / 2 + 1.5, 0xc8c0b0, ''); kit.box('stone', -w / 2 + 0.18, top - 0.3, -d / 2 + 0.48, -w / 2 + 1.32, top - 0.08, -d / 2 + 1.62, 0xa8a094, ''); }
  else if (thatch || rd() < 0.5) { const m = ridge === 'z' ? [0, (zf - d / 2) / 2 - d * 0.15] : [-w * 0.15, (zf - d / 2) / 2], q = 0.45; kit.gable(roofM, 'plank', m[0] - q, m[1] - q, m[0] + q, m[1] + q, H + rh - 0.05, 0.5, { axis: ridge, over: 0.12, wcol: 0x2a2018, col: [0.6, 0.58, 0.55], eave: false, ridge: false }); }   // a smoke louvre on the ridge
  if (shop) {   // a shop: the shutter let down as a counter, and a pentice over it
    const gx = -w / 2 + w * 0.7, z = d / 2 + D;
    kit.box('plank', gx - 0.85, 0.9, z, gx + 0.85, 0.97, z + 0.48, sc, 'n'); for (const sx of [-1, 1]) kit.box('plank', gx + sx * 0.75 - 0.04, 0, z + 0.38, gx + sx * 0.75 + 0.04, 0.9, z + 0.45, tc, 'tb');
    kit.poly(roofM === 'tile' ? 'tile' : 'plank', [[gx - 1.15, 2.32, z + 0.8], [gx + 1.15, 2.32, z + 0.8], [gx + 1.15, 2.74, z], [gx - 1.15, 2.74, z]], roofM === 'tile' ? [0.8, 0.78, 0.76] : sc);
    for (const sx of [-1, 1]) kit.poly('plank', [[gx + sx * 1.05, 2.3, z + 0.72], [gx + sx * 1.05, 2.7, z], [gx + sx * 1.05, 1.85, z]], tc);
  }
  if (late && floors > 1 && rd() < 0.3) { const sx = -w / 2 + w * 0.5, z = zf + D; kit.box('plank', sx - 0.035, fh + 2.5, z, sx + 0.035, fh + 2.57, z + 1, tc, 'n'); kit.box('plank', sx - 0.025, fh + 1.9, z + 0.4, sx + 0.025, fh + 2.44, z + 0.95, [0x8a3a2a, 0x2a4a6a, 0xb89a3a, 0x3a5a3a][Math.floor(rd() * 4)], ''); }   // a hanging sign
  if (!shop) { kit.solid(-w / 2, -d / 2, w / 2, d / 2); return; }
  // inside the shop: a boarded floor, the joists of the room above, a counter under the window, a bench, and the stock on shelves
  const dx = -w / 2 + w * 0.28, gx = -w / 2 + w * 0.7, zb = d / 2, WARES = [0x8a3a2a, 0x3a5a7a, 0xc8b070, 0x6a7a4a];
  kit.poly('plank', [[-w / 2, 0.12, -d / 2], [-w / 2, 0.12, zb], [w / 2, 0.12, zb], [w / 2, 0.12, -d / 2]], 0x9a8a70).poly('plank', [[-w / 2, fh - 0.02, -d / 2], [w / 2, fh - 0.02, -d / 2], [w / 2, fh - 0.02, zb], [-w / 2, fh - 0.02, zb]], 0x7a6a54);
  for (let z = -d / 2 + 0.8; z < zb - 0.3; z += 1.1) kit.box('plank', -w / 2, fh - 0.24, z - 0.08, w / 2, fh - 0.02, z + 0.08, tc, 't');
  kit.box('plank', gx - 1.1, 0, zb - 1.6, gx + 1.1, 0.95, zb - 1.05, 0x8a6a48, 'b').box('plank', -w / 2 + 0.1, 0, -d / 2 + 1, -w / 2 + 0.5, 0.45, d / 4, 0x6a5038, 'b');
  let q = 0; for (const y of [0.9, 1.6, 2.3]) { kit.box('plank', -w / 2 + 1, y, -d / 2, w / 2 - 0.4, y + 0.05, -d / 2 + 0.45, 0x7a5a3a, 'b'); for (let x = -w / 2 + 1.2; x < w / 2 - 0.8; x += 0.7) kit.box('plank', x, y + 0.05, -d / 2 + 0.06, x + 0.45, y + 0.42, -d / 2 + 0.4, WARES[q++ % 4], 'b'); }
  kit.solid(-w / 2 - D, -d / 2 - D, w / 2 + D, -d / 2).solid(-w / 2 - D, -d / 2, -w / 2, zb + D).solid(w / 2, -d / 2, w / 2 + D, zb + D).solid(-w / 2, zb, dx - 0.65, zb + D).solid(dx + 0.65, zb, w / 2, zb + D);
  kit.solid(gx - 1.1, zb - 1.6, gx + 1.1, zb - 1.05).solid(-w / 2, -d / 2, w / 2 - 0.4, -d / 2 + 0.45);
  const e = kit.M.elements, pz = zb - 2.1; SHOPS.push({ x: e[0] * gx + e[8] * pz + e[12], z: e[2] * gx + e[10] * pz + e[14], ry: Math.atan2(e[8], e[10]), from: kit.span[0], door: [e[0] * dx + e[8] * zb + e[12], e[2] * dx + e[10] * zb + e[14]] });
}
const SHOPS = [];

function build({ world, group }) {
  const r = rng(1194), kit = new Kit(), props = new Props(), Y = yearToU, list = [], INF = Infinity;
  const clipY = { value: 1e6 }, clipScaffold = { value: 1e6 };
  const WOOD = fin(0x6a4a2c, 0.9), PALE = fin(0xa88a5c, 0.9), STONEF = fin(0xb8b0a0, 0.95), CLOTHS = [0x8a2a22, 0x2a4a7a, 0xc8b070, 0x4a6a3a, 0xd8d0bc].map((c) => fin(c, 0.95)), IRON = fin(0x2e2e32, 0.5, 0.6), EARTH = fin(0x6a563c, 1), GOLD = fin(0xd0a850, 0.95), EMBER = fin(0xff5a10, 0.8, 0, 2.5);

  // ---------- people ----------
  /** One or more people from year a to b; commoners may be missing from the plague until the town recovers. */
  const P = (outfit, action, x, z, rot, a, b, o = {}) => {
    const hit = !o.safe && a < PLAGUE && b > PLAGUE && r() < 0.5, back = 1370 + r() * 60;
    const one = (f, t) => list.push({ outfit, action, x, z, rot, ...o, u0: Y(f), u1: Y(t) });
    if (hit) { one(a, PLAGUE + r() * 2); if (back < b) one(back, b); } else one(a, b);
  };
  const folk = () => (r() < 0.5 ? 'medieval' : 'medieval-f'), ang = () => r() * 6.283;
  const walker = (path, a, b, o = {}) => P(o.outfit || folk(), o.action || 'walk', path[0][0], path[0][1], 0, a, b, { path, speed: 1.1 + r() * 0.3, phase: r(), ...o });

  // ---------- the land: fields, roads, the town floor ----------
  const flat = (mat, x0, z0, x1, z1, col, y = 0.05, alongZ = false) => kit.poly(mat, alongZ ? [[x0, G + y, z0], [x0, G + y, z1], [x1, G + y, z1], [x1, G + y, z0]] : [[x0, G + y, z0], [x1, G + y, z0], [x1, G + y, z1], [x0, G + y, z1]], col);
  const WHEAT = 0xd9c070, GREEN = 0x86a552, FALLOW = 0x9a8562;
  kit.during(500, 850, () => { flat('strips', -150, 50, -95, 125, GREEN); flat('strips', 60, -120, 130, -70, FALLOW, 0.05, true); flat('strips', -120, -110, -60, -62, WHEAT); });
  kit.during(850, INF, () => {
    // three great fields, each a patchwork of furlongs whose strips run their own way
    const field = (x0, z0, x1, z1, col, nx, nz) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const c = new THREE.Color(col).multiplyScalar(0.88 + r() * 0.24); flat('strips', x0 + ((x1 - x0) * i) / nx + 1.5, z0 + ((z1 - z0) * j) / nz + 1.5, x0 + ((x1 - x0) * (i + 1)) / nx - 1.5, z0 + ((z1 - z0) * (j + 1)) / nz - 1.5, [c.r, c.g, c.b], 0.05, (i + j) % 2 === 1); } };
    field(-640, -330, -240, 330, WHEAT, 3, 4); field(-230, -470, 290, -190, GREEN, 4, 2); field(-230, 208, 180, 470, FALLOW, 3, 2);
    flat('earth', -640, CZ - 2.5, -RA, CZ + 2.5, 0xc8b898, 0.12); flat('earth', -2.5, CZ + RB, 2.5, 470, 0xc8b898, 0.12, true);
  });
  kit.during(500, INF, () => flat('earth', RA, CZ - 2.5, 316, CZ + 2.5, 0xc8b898, 0.08));
  kit.during(1100, INF, () => { const ring = []; for (let k = 0; k < 40; k++) ring.push([Math.cos((-k / 40) * 6.2832) * (RA + 6), G + 0.04, CZ + Math.sin((-k / 40) * 6.2832) * (RB + 6)]); kit.poly('earth', ring, 0xb8a888); });
  kit.during(1200, INF, () => { flat('cobble', 4, 30, 70, 90, 0xd0c8b8, 0.07); flat('cobble', -84, -64, -48, -16, 0xd0c8b8, 0.07); });

  // ---------- Roman ruins the first village is built among ----------
  kit.during(500, 1060, () => kit.at(-12, G, 62, 0.2, () => {
    kit.box('stone', -1, 0, -1.6, 22, 0.5, 1.6, 0xb8b0a0, '');
    [5.2, 3.1, 5.6, 1.4, 4.4, 0.9].forEach((h, i) => { kit.cyl('stone', 1.5 + i * 3.8, 0, 0.5, 0.5 + h, 0.5, 0.44, 12, 0xc8c0b0, { open: false }); if (h > 5) kit.box('stone', 0.9 + i * 3.8, 0.5 + h, -0.6, 2.1 + i * 3.8, 0.95 + h, 0.6, 0xc0b8a8, ''); });
    kit.cyl('stone', 9, 3, 0.45, 0.9, 0.5, 0.5, 12, 0xb8b0a0, { open: false });
    kit.at(-3, 0, -12, 0, () => { kit.panel('rubble', 13, 5, [{ x: 6.5, y: 0, w: 3.4, h: 4.2, arch: 'round' }], 1.1, 0xd8d0c0); kit.box('rubble', 0, 5, 0, 4.2, 6.6, 1.1, 0xd8d0c0, '').box('rubble', 9.5, 5, 0, 13, 5.9, 1.1, 0xd8d0c0, '').box('rubble', 13, 0, 0, 19, 2.2, 1.1, 0xd0c8b8, ''); kit.solid(0, 0, 4.8, 1.1).solid(8.2, 0, 19, 1.1); });
    kit.solid(0, -0.8, 21, 0.8);
  }));

  // ---------- the well, from Roman times to the market place ----------
  kit.at(14, G, 44, 0, () => { kit.cyl('stone', 0, 0, 0, 0.95, 1.25, 1.2, 14, 0xc8c0b0); kit.cyl('stone', 0, 0, 0, 0.95, 0.95, 0.95, 14, 0x706a60); kit.solid(-1.2, -1.2, 1.2, 1.2); });
  { const b = props.bag(); for (const s of [1, -1]) b.box(WOOD, 0.14, 2.4, 0.14, 14 + s * 1.3, G + 1.2, 44); b.rod(WOOD, [12.6, G + 2.2, 44], [15.4, G + 2.2, 44], 0.08, 6).rod(PALE, [14, G + 2.2, 44], [14, G + 0.9, 44], 0.015, 4); b.box(WOOD, 0.3, 0.3, 0.3, 14, G + 0.85, 44); }

  // ---------- the early village ----------
  const HUTS = [[-45, 5], [-30, 30], [5, 20], [35, 12], [52, -12], [-62, -25], [26, 60], [-22, 84], [60, 38], [-80, 22], [-70, 52], [-44, 96], [2, 104], [44, 84], [78, 64], [88, 8], [92, -32], [-92, -8], [-104, 44]];
  HUTS.forEach(([x, z], i) => kit.during(i < 9 ? 500 : 780 + i * 12, 1100, () => kit.at(x, G, z, ang(), () => hut(kit, r))));
  { const tmp = new Bag(); kit.during(500, 1000, () => kit.at(-4, G, -40, 0, () => woodenChurch(kit, tmp))); append(props.bag(500, 1000), tmp, mat4(-4, G, -40)); }
  kit.during(1000, 1194, () => kit.at(-20, G, -40, 0, () => stoneChurch(kit)));
  // farmsteads outside the walls, by the west road
  [[-205, -8], [-222, 44], [-212, -40], [-236, 2], [-204, 120], [60, 196], [-60, 192], [228, -40]].forEach(([x, z]) => kit.during(850, INF, () => kit.at(x, G, z, ang(), () => hut(kit, r, 8, 5))));

  // ---------- the cathedral ----------
  const CX = -50, CZ0 = -40;
  { const tmp = new Bag(); kit.during(1150, INF, () => kit.at(CX, G, CZ0, 0, () => westFront(kit, tmp))); append(props.bag(1150, INF), tmp, mat4(CX, G, CZ0)); }
  kit.during(1150, 1230, () => kit.at(CX, G, CZ0, 0, () => northSpire(kit, true)));
  kit.during(1230, INF, () => kit.at(CX, G, CZ0, 0, () => northSpire(kit, false)));
  kit.during(1194, INF, () => { kit.tag = 'clip'; kit.at(CX, G, CZ0, 0, () => cathedralBody(kit)); });
  append(props.bag(1194, 1226, 'clip'), scaffold(new Bag()), mat4(CX, G, CZ0));
  kit.during(1226, INF, () => kit.at(CX, G, CZ0, 0, () => {   // the high altar in the choir, on two steps, and a rail of candles before it
    kit.box('stone', 96, 0, -4, 103, 0.3, 4, 0xd0c8b8, 'b').box('stone', 97, 0.3, -3, 102, 0.6, 3, 0xd0c8b8, 'b').box('stone', 98.6, 0.6, -1.6, 100, 1.65, 1.6, 0xe8e0d0, 'b').box('stone', 98.4, 1.65, -1.8, 100.2, 1.78, 1.8, 0xd8d0c0, 'b');
    kit.solid(98.4, -1.8, 100.2, 1.8);
  }));
  { const b = props.bag(1226, INF); for (const z of [-1.2, 1.2]) b.box(GOLD, 0.08, 0.5, 0.08, CX + 99.3, G + 2.03, CZ0 + z).box(EMBER, 0.05, 0.12, 0.05, CX + 99.3, G + 2.34, CZ0 + z); b.box(GOLD, 0.05, 0.9, 0.05, CX + 99.3, G + 2.23, CZ0).box(GOLD, 0.5, 0.05, 0.05, CX + 99.3, G + 2.45, CZ0); b.box(fin(0xd8d0bc, 1), 1.5, 0.04, 3.4, CX + 99.3, G + 1.8, CZ0);
    for (let i = 0; i < 9; i++) b.box(EMBER, 0.04, 0.1, 0.04, CX + 93, G + 1.1, CZ0 - 2 + i * 0.5).box(fin(0xe8e0c8, 1), 0.06, 0.25, 0.06, CX + 93, G + 0.93, CZ0 - 2 + i * 0.5); b.box(IRON, 0.06, 0.05, 4.4, CX + 93, G + 0.78, CZ0); for (const z of [-2.2, 2.2]) b.box(IRON, 0.05, 0.78, 0.05, CX + 93, G + 0.39, CZ0 + z); }
  props.put(crane(), -2, G, -9, Math.PI / 2, 1194, 1226);
  kit.during(1194, 1262, () => kit.at(-36, G, -10, 0, () => {   // the masons' lodge: an open-fronted shed, with stone waiting round it
    walls(kit, 'plank', 0, -3, 14, 0, 0, 2.6, 0.15, 0xa89878, () => []); kit.poly('thatch', [[-0.6, 2.4, 3.6], [14.6, 2.4, 3.6], [14.6, 3.8, -3.4], [-0.6, 3.8, -3.4]]);
    for (const x of [0.2, 7, 13.8]) kit.box('plank', x - 0.1, 0, 3, x + 0.1, 2.5, 3.2, 0x7a6248, '');
    for (let i = 0; i < 16; i++) { const x = -6 + r() * 60, z = 4 + r() * 5, s = 0.5 + r() * 0.5; kit.box('stone', x, 0, z, x + s * 1.6, s * 0.8, z + s, 0xffffff, ''); }
    kit.solid(0, -3, 14, 0);
  }));

  // ---------- the town wall and its three gates ----------
  const wp = (k) => { const a = ((k - 0.5) / 36) * 6.2832; return [Math.cos(a) * RA, CZ + Math.sin(a) * RB]; };
  kit.during(1180, INF, () => {
    for (let k = 0; k < 36; k++) {
      const [x0, z0] = wp(k + 1), [x1, z1] = wp(k), gate = k % 9 === 0 && k !== 27;
      kit.along(x0, z0, x1, z1, G, (l) => {
        if (gate) {
          kit.panel('stone', l, 12, [{ x: l / 2, y: 0, w: 4.4, h: 5.6, arch: 'point', sharp: 0.7 }, { x: l / 2, y: 7.4, w: 0.5, h: 2, arch: 'flat', fill: DARK }], 3, 0xf0ebe0);
          kit.solid(0, 0, l / 2 - 2.2, 3).solid(l / 2 + 2.2, 0, l, 3); kit.cyl('tile', l / 2, 1.5, 12, 16, 9, 0.05, 4, 0xffffff, { a0: Math.PI / 4 });
          const gh = { x: l / 2, y: 0, w: 4.4, h: 5.6, arch: 'point', sharp: 0.7 };
          for (let i = 0; i < 2; i++) kit.trim(gh, 3, { head: ['stone', i ? 0xd0c8b8 : 0xe0d8c8, 0.42, 0.08 + i * 0.14, 0, i * 0.42] });   // two orders round the arch
          kit.poly('plank', [[l / 2 - 2.2, 3.5, 1.2], [l / 2 + 2.2, 3.5, 1.2], [l / 2 + 2.2, 5.6, 1.2], [l / 2 - 2.2, 5.6, 1.2]], 0x3a3028);   // the portcullis, raised
          kit.box('stone', l / 2 - 3.3, 9.2, 3, l / 2 + 3.3, 11.3, 3.8, 0xe8e2d4, 'n'); for (let x = l / 2 - 3; x <= l / 2 + 3.01; x += 1.2) kit.box('stone', x - 0.2, 8.4, 3, x + 0.2, 9.2, 3.7, 0xd0c8b8, 'nt');   // a machicolated gallery over the arch
          kit.box('stone', 0, 11.6, 3, l, 12, 3.2, 0xd0c8b8, 'n').poly('stone', [[0, 0, 3.7], [l / 2 - 6.4, 0, 3.7], [l / 2 - 6.4, 2.4, 3], [0, 2.4, 3]], 0xe0d8c8).poly('stone', [[l / 2 + 6.4, 0, 3.7], [l, 0, 3.7], [l, 2.4, 3], [l / 2 + 6.4, 2.4, 3]], 0xe0d8c8);
          for (const s of [-1, 1]) { const tx = l / 2 + s * 4.5; kit.cyl('stone', tx, 3, 0, 13.6, 2.3, 2.15, 10, 0xf0ebe0).cyl('stone', tx, 3, -0.3, 2.4, 2.95, 2.3, 10, 0xe0d8c8).cyl('stone', tx, 3, 12.2, 12.6, 2.2, 2.5, 10, 0xd0c8b8).cyl('stone', tx, 3, 12.6, 13.7, 2.5, 2.5, 10, 0xf0ebe0).cyl('tile', tx, 3, 13.7, 17.6, 2.9, 0.05, 10); kit.poly('pane', [[tx - 0.07, 6, 5.27], [tx + 0.07, 6, 5.27], [tx + 0.07, 7.5, 5.26], [tx - 0.07, 7.5, 5.26]], 0x101214); kit.solid(tx - 2, 3, tx + 2, 5); }
        } else {
          kit.box('stone', 0, 0, 0, l, 8, 1.8, 0xf0ebe0, 'b'); kit.solid(0, 0, l, 1.8);
          kit.poly('stone', [[0, 0, 2.6], [l, 0, 2.6], [l, 2.4, 1.8], [0, 2.4, 1.8]], 0xe0d8c8);   // the battered foot
          kit.box('stone', 0, 7.5, 1.8, l, 7.85, 1.98, 0xd0c8b8, 'n').box('stone', 0, 8, -0.25, l, 8.25, 0.05, 0xd0c8b8, 's');   // string course under the parapet, and the wall-walk's inner kerb
          for (let x = 3.5; x < l - 3; x += 6.9) kit.poly('pane', [[x - 0.07, 4.3, 1.82], [x + 0.07, 4.3, 1.82], [x + 0.07, 5.7, 1.82], [x - 0.07, 5.7, 1.82]], 0x101214);   // arrow loops
        }
        if (!gate) for (let x = 0.6; x < l - 1; x += 2.3) kit.box('stone', x, 8, 1.3, x + 1.3, 9, 1.8, 0xe8e2d4, 'b');
      });
      kit.cyl('stone', x0, z0, G, G + 12.5, 4.2, 4, 14, 0xf0ebe0); kit.cyl('tile', x0, z0, G + 12.6, G + 18.4, 5.1, 0.05, 14, 0xffffff);
      kit.cyl('stone', x0, z0, G - 0.4, G + 2.8, 5.1, 4.22, 14, 0xe0d8c8).cyl('stone', x0, z0, G + 6.9, G + 7.2, 4.18, 4.18, 14, 0xd0c8b8).cyl('stone', x0, z0, G + 10.4, G + 11.1, 4.03, 4.55, 14, 0xd0c8b8).cyl('stone', x0, z0, G + 11.1, G + 12.6, 4.55, 4.55, 14, 0xf0ebe0);   // batter, band, corbel table, parapet
      { const out = Math.atan2(z0 - CZ, x0); for (const da of [-0.8, 0, 0.8]) { const a = out + da, px = x0 + Math.cos(a) * 4.17, pz = z0 + Math.sin(a) * 4.17, tx = -Math.sin(a) * 0.08, tz = Math.cos(a) * 0.08; kit.poly('pane', [[px - tx, G + 4.4, pz - tz], [px + tx, G + 4.4, pz + tz], [px + tx, G + 6, pz + tz], [px - tx, G + 6, pz - tz]], 0x101214); } }
      kit.at(x0, 0, z0, 0, () => kit.solid(-3.6, -3.6, 3.6, 3.6));
    }
  });

  // ---------- streets and houses ----------
  const RESERVED = [[-54, -82, 84, 1], [-86, -66, -50, -14], [-136, -66, -84, -10], [2, 28, 72, 92], [-34, -114, 14, -82]];
  const STREETS = [[-170, 18, 170, 18], [0, 18, 0, 164], [-112, 105, 112, 105], [-70, 18, -70, 105], [88, 18, 88, 105], [112, -72, 112, 18], [-150, -30, -150, 18]], taken = [];
  for (const [x0, z0, x1, z1] of STREETS) RESERVED.push(x0 === x1 ? [x0 - 3, z0, x0 + 3, z1] : [x0, z0 - 3, x1, z0 + 3]);
  const free = (a) => !RESERVED.some((b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) && !taken.some((b) => a[0] < b[2] + 0.4 && a[2] > b[0] - 0.4 && a[1] < b[3] + 0.4 && a[3] > b[1] - 0.4) && [[a[0], a[1]], [a[2], a[1]], [a[0], a[3]], [a[2], a[3]]].every(([x, z]) => inTown(x, z, 0.93));
  const hearths = [];
  for (const [x0, z0, x1, z1] of STREETS) for (const side of [1, -1]) {
    const vert = x0 === x1, L = vert ? z1 - z0 : x1 - x0;
    for (let t = 3; t < L - 6;) {
      const w = 5.5 + r() * 3, d = 7.5 + r() * 3.5, c = t + w / 2, off = side * (3.4 + d / 2);
      const cx = vert ? x0 + off : x0 + c, cz = vert ? z0 + c : z0 + off, box = vert ? [cx - d / 2, cz - w / 2, cx + d / 2, cz + w / 2] : [cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2];
      if (r() < 0.9 && free(box)) {
        taken.push(box);
        const far = Math.hypot(cx / RA, (cz - CZ) / RB) + r() * 0.35, from = far < 0.62 ? 1100 : far < 0.95 ? 1200 : 1420, ry = vert ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : side > 0 ? Math.PI : 0;
        kit.during(from, INF, () => kit.at(cx, G, cz, ry, () => house(kit, r, { w, d, floors: from === 1100 ? 1 + (r() < 0.5) : 2 + (r() < 0.35), late: from > 1100 })));
        if (r() < 0.3) hearths.push({ x: cx, y: G + 9, z: cz, size: 0.7, from, dark: 0.35 });
      }
      t += w + (r() < 0.2 ? 2.5 : 0.3);
    }
  }
  for (let i = 0; i < 9; i++) hearths.push({ x: HUTS[i][0], y: G + 4.6, z: HUTS[i][1], size: 0.6, from: 500, to: 1100, dark: 0.35 });

  // ---------- the market: hall, cross, stalls, smithy ----------
  kit.during(1200, INF, () => {
    kit.gable('tile', 'frame', 24, 52, 46, 62, G + 4.2, 4.6, { over: 0.8 });
    kit.at(58, G, 40, 0, () => { kit.cyl('stone', 0, 0, 0, 0.4, 2, 2, 8, 0xd8d0c0, { open: false }); kit.cyl('stone', 0, 0, 0.4, 0.8, 1.3, 1.3, 8, 0xd8d0c0, { open: false }); kit.cyl('stone', 0, 0, 0.8, 4.4, 0.2, 0.16, 8, 0xe8e0d0); kit.box('stone', -0.6, 3.6, -0.12, 0.6, 3.85, 0.12, 0xe8e0d0, ''); kit.solid(-1.5, -1.5, 1.5, 1.5); });
    // the smithy: a tiled roof on posts over the forge
    kit.gable('tile', 'plank', 50, 78, 60, 86, G + 3, 2.6, { over: 0.5 }); kit.box('stone', 51, G, 79, 53.2, G + 1, 81.4, 0xa8a094, 'b'); kit.box('stone', 51.4, G + 1, 79.3, 52, G + 5.6, 80, 0xa8a094, 'b');
    kit.at(0, 0, 0, 0, () => kit.solid(51, 79, 53.2, 81.4));
  });
  { const b = props.bag(1200, INF);
    for (const x of [24.4, 31.6, 38.4, 45.6]) for (const z of [52.4, 61.6]) { b.box(WOOD, 0.3, 4.2, 0.3, x, G + 2.1, z); b.rod(WOOD, [x, G + 3, z], [x + (x < 35 ? 1.1 : -1.1), G + 4.1, z], 0.07, 4); }
    for (const [x, z] of [[50.3, 78.3], [59.7, 78.3], [50.3, 85.7], [59.7, 85.7]]) b.box(WOOD, 0.24, 3, 0.24, x, G + 1.5, z);
    b.box(EMBER, 1.5, 0.08, 1.6, 52.1, G + 1.04, 80.2); b.box(IRON, 0.5, 0.5, 0.5, 54.4, G + 0.25, 84.5);
    // stalls: a trestle table under an awning
    const stall = new Bag(), cloth = () => CLOTHS[Math.floor(r() * CLOTHS.length)];
    stall.box(WOOD, 2.4, 0.06, 1, 0, 0.82, 0); for (const sx of [-1, 1]) { stall.box(WOOD, 0.08, 0.82, 0.8, sx * 1, 0.41, 0); stall.box(WOOD, 0.07, 2.2, 0.07, sx * 1.2, 1.1, -0.6); stall.box(WOOD, 0.07, 1.9, 0.07, sx * 1.2, 0.95, 0.7); }
    for (const [x, z, ry] of [[10, 58, 1.57], [10, 66, 1.57], [10, 74, 1.57], [20, 82, 0], [30, 82, 0], [40, 82, 0], [66, 52, -1.57], [66, 62, -1.57], [66, 72, -1.57], [24, 36, 3.14], [34, 36, 3.14], [44, 36, 3.14]]) {
      props.put(stall, x, G, z, ry, 1200, INF); const m = mat4(x, G, z, ry), c = cloth();
      b.add(new THREE.PlaneGeometry(2.6, 1.6), c, m.clone().multiply(mat4(0, 2.08, 0.05, 0, -Math.PI / 2 + 0.23)));
      for (let k = 0; k < 5; k++) b.add(new THREE.SphereGeometry(0.13, 6, 4), [GOLD, fin(0xa83a2a, 0.9), fin(0x6a8a3a, 0.9), fin(0xd8d0bc, 0.9)][Math.floor(r() * 4)], m.clone().multiply(mat4(-0.9 + k * 0.45, 0.95, (r() - 0.5) * 0.5)));
      P(folk(), 'trade', x - Math.sin(ry) * 0.9, z - Math.cos(ry) * 0.9, ry - Math.PI / 2, 1200, INF);
      P(folk(), r() < 0.5 ? 'talk' : 'stand', x + Math.sin(ry) * 1.9, z + Math.cos(ry) * 1.9, ry + Math.PI / 2, 1200, INF);
    }
  }
  for (let i = 0; i < 12; i++) { const x = 16 + r() * 44, z = 42 + r() * 36; if (x > 22 && x < 48 && z > 50 && z < 64) continue; P(folk(), ['talk', 'stand', 'talk', 'carry'][i % 4] === 'carry' ? 'stand' : ['talk', 'stand', 'talk'][i % 3], x, z, ang(), 1200, INF); }
  P('medieval', 'hammer', 54.6, 82.4, 2.6, 1200, INF, { safe: 1 }); P('medieval', 'hammer', 56.8, 80, -2.4, 1200, INF);
  for (const [x, z, ry] of [[-52, 22.4, -1.57], [-30, 22.4, -1.57], [40, 109.4, -1.57], [-20, 109.4, -1.57]]) P('medieval-f', 'spin', x, z, ry, 1100, INF);
  for (const [x, z, ry] of [[-40, 22.2, 1.57], [56, 109.2, 1.57], [-8, 109.2, 1.57]]) P(folk(), 'weave', x, z, ry, 1100, INF);
  // water from the well
  P('medieval-f', 'fetch-water', 15.6, 45.2, -2.5, 500, INF, { safe: 1 }); P('medieval', 'fetch-water', 12.3, 44.6, 0.3, 900, INF);
  walker([[15, 47], [6, 30], [0, 20], [-40, 18]], 1100, INF, { outfit: 'medieval-f', action: 'fetch-water' }); walker([[16, 46], [40, 70], [60, 100], [88, 104]], 1100, INF, { outfit: 'medieval-f', action: 'fetch-water' });
  // people in the streets
  for (const [x0, z0, x1, z1] of STREETS) for (let k = 0; k < (x1 - x0 + z1 - z0 > 200 ? 5 : 2); k++) { const o = (r() - 0.5) * 3; walker(x0 === x1 ? [[x0 + o, z0 + 2], [x0 + o, z1 - 2]] : [[x0 + 2, z0 + o], [x1 - 2, z0 + o]], 1100, INF, r() < 0.25 ? { action: 'carry', prop: r() < 0.5 ? 'sack' : 'basket' } : {}); }
  walker([[-640, 17], [-176, 17]], 850, INF, { action: 'carry', prop: 'sack' }); walker([[-176, 19], [-400, 19]], 850, INF); walker([[176, 19], [395, 19]], 900, INF, { action: 'carry', prop: 'sack', outfit: 'medieval' }); walker([[392, 17.2], [182, 17.2]], 1100, INF, { action: 'carry', prop: 'basket' }); walker([[1, 172], [1, 400]], 850, INF);

  // ---------- the canons' cloister ----------
  kit.during(1050, INF, () => kit.at(-132, G, -60, 0, () => {
    walls(kit, 'stone', 0, 0, 46, 46, 0, 5.2, 0.7, 0xe8e2d4, (s, l) => (s === 'e' ? [{ x: l / 2, y: 0, w: 2.2, h: 3.4, arch: 'round' }] : []));
    kit.along(9, 37, 37, 37, 0, (l) => kit.panel('stone', l, 3.6, Array.from({ length: 7 }, (_, i) => ({ x: 2 + i * 4, y: 0.7, w: 2.6, h: 2.5, arch: 'round' })), 0.5, 0xf0ebe0)); kit.along(37, 9, 9, 9, 0, (l) => kit.panel('stone', l, 3.6, Array.from({ length: 7 }, (_, i) => ({ x: 2 + i * 4, y: 0.7, w: 2.6, h: 2.5, arch: 'round' })), 0.5, 0xf0ebe0));
    kit.along(37, 37, 37, 9, 0, (l) => kit.panel('stone', l, 3.6, Array.from({ length: 7 }, (_, i) => ({ x: 2 + i * 4, y: i === 3 ? 0 : 0.7, w: 2.6, h: i === 3 ? 3.2 : 2.5, arch: 'round' })), 0.5, 0xf0ebe0)); kit.along(9, 9, 9, 37, 0, (l) => kit.panel('stone', l, 3.6, Array.from({ length: 7 }, (_, i) => ({ x: 2 + i * 4, y: 0.7, w: 2.6, h: 2.5, arch: 'round' })), 0.5, 0xf0ebe0));
    kit.poly('tile', [[9, 3.6, 37], [37, 3.6, 37], [46, 5, 46], [0, 5, 46]]).poly('tile', [[37, 3.6, 9], [9, 3.6, 9], [0, 5, 0], [46, 5, 0]]).poly('tile', [[37, 3.6, 37], [37, 3.6, 9], [46, 5, 0], [46, 5, 46]]).poly('tile', [[9, 3.6, 9], [9, 3.6, 37], [0, 5, 46], [0, 5, 0]]);
    walls(kit, 'stone', 0, -10, 46, 0, 0, 8, 0.7, 0xe8e2d4, (s, l) => (s === 'n' || s === 's' ? Array.from({ length: 6 }, (_, i) => ({ x: 4 + i * 7.6, y: 4.6, w: 1, h: 2.4, arch: 'round', fill: DARK })) : [])); kit.gable('tile', 'stone', 0, -10, 46, 0, 8, 4.4, { over: 0.4, wcol: 0xe8e2d4 });
    kit.solid(0, -10, 46, 0.7).solid(0, 0, 0.7, 46).solid(0, 45.3, 46, 46).solid(45.3, 0, 46, 21.8).solid(45.3, 24.2, 46, 46);
  }));
  const CL = (x, z) => [-132 + x, -60 + z];
  for (let i = 0; i < 4; i++) { const [x, z] = CL(13 + i * 6, 5); P('monk', 'write', x, z, -1.57, 1050, INF, { safe: 1 }); }
  for (const [x, z] of [[20, 23], [26, 23], [23, 27]]) { const [wx, wz] = CL(x, z); P('monk', 'pray', wx, wz, 1.57, 1050, INF, { safe: 1 }); }
  for (let i = 0; i < 3; i++) P('monk', 'walk', 0, 0, 0, 1050, INF, { safe: 1, path: [CL(5, 5), CL(41, 5), CL(41, 41), CL(5, 41), CL(5, 5)], speed: 0.8, phase: i * 0.04 });
  P('monk', 'pray', -8, -36, 3.14, 500, 1000, { safe: 1 }); P('monk', 'kneel', -8.5, -41, 3.14, 500, 1000, { safe: 1 }); P('monk', 'pray', -24, -40, 3.14, 1000, 1194, { safe: 1 }); P('monk', 'stand', -23, -43, 2.6, 1000, 1194, { safe: 1 });
  for (let i = 0; i < 4; i++) P('monk', 'walk', 0, 0, 0, 1226, INF, { safe: 1, path: [[-80, -40], [-56, -40]], speed: 0.7, phase: i * 0.03 });
  for (const [x, z] of [[-60, -34], [-62, -45], [-66, -39]]) P(folk(), i3(x) ? 'kneel' : 'pray', x, z, 0, 1226, INF);
  function i3(x) { return Math.round(x) % 2 === 0; }

  // ---------- building the cathedral, 1194–1226 ----------
  const W0 = 1194, W1 = 1226, mason = (action, x, z, rot, o) => P('medieval', action, x, z, rot, W0, W1, o);
  for (let i = 0; i < 9; i++) mason('chisel', -34 + i * 5.2 + r(), -3.5 + (i % 2) * 3, ang());
  for (let i = 0; i < 3; i++) mason('saw', 40 + i * 5, 0.5, 1.57 + r()); mason('hammer', 58, 1.5, 2);
  for (let i = 0; i < 3; i++) mason('dig', 66 + i * 2.2, -6 + i, ang(), { prop: 'hoe', action: 'hoe' });
  for (let i = 0; i < 5; i++) walker([[-36, 1.6], [40, 1.6], [60, -10]], W0, W1, { outfit: 'medieval', action: 'carry', prop: i % 2 ? 'basket' : 'sack', phase: i / 5 });
  for (let i = 0; i < 2; i++) walker([[2, -5.5], [8, -1]], W0, W1, { outfit: 'medieval', action: 'haul', speed: 0.4, phase: i * 0.2 });
  mason('point', -6, -2, 1.9, { safe: 1 }); P('monk', 'stand', -8, -1, 1.2, W0, W1, { safe: 1 });

  // ---------- knights ----------
  for (const k of [0, 9, 18]) { const [x0, z0] = wp(k + 1), [x1, z1] = wp(k), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ox = mx / RA, oz = (mz - CZ) / RB, tx = -oz, tz = ox; for (const s of [1, -1]) P('knight', 'guard', mx + ox * 5 + tx * s * 4, mz + oz * 5 + tz * s * 4, Math.atan2(-oz, ox), 1180, INF, { safe: 1 }); }
  P('knight', 'guard', -9, -34, 3.14, 900, 1150, { safe: 1 });
  const rides = [{ path: Array.from({ length: 41 }, (_, k) => [Math.cos((k / 40) * 6.2832) * (RA + 22), CZ + Math.sin((k / 40) * 6.2832) * (RB + 22)]), speed: 2.6, phase: 0.1, from: 1000 },
    { path: Array.from({ length: 41 }, (_, k) => [Math.cos((-k / 40) * 6.2832) * (RA + 27), CZ + Math.sin((-k / 40) * 6.2832) * (RB + 27)]), speed: 2.2, phase: 0.6, from: 1100 }, { path: [[-630, 16], [-180, 16], [-180, 20], [-630, 20], [-630, 16]], speed: 2.4, phase: 0.8, from: 950 }];
  const riders = rides.map((q, i) => { const a = actors({ heightAt: () => 0, sea: -99 }, [{ outfit: 'knight', action: 'ride', x: -0.05, z: 0, rot: 0, y: 1.36, s: 1 }], { seed: 30 + i }), g = new THREE.Group(); g.add(...a.meshes); q.load = g; return a; });

  // ---------- the fields ----------
  // reaping the wheat: a line of reapers working into the standing corn, binders and carriers behind
  for (let i = 0; i < 11; i++) P(i % 4 === 3 ? 'medieval-f' : 'medieval', 'reap', -262 + (i % 3) * 0.8, -104 + i * 6.4, Math.PI, 850, INF);
  for (let i = 0; i < 5; i++) P('medieval-f', 'crouch', -257 - r() * 2, -98 + i * 13, ang(), 850, INF);
  for (let i = 0; i < 4; i++) walker([[-252, -90 + i * 20], [-246, 10], [-214, 40]], 850, INF, { action: 'carry', prop: 'basket' });
  // ploughing the fallow with ox teams, a boy with a goad at their heads
  const teams = [{ path: loop(-170, 232, -40, 250), phase: 0, from: 850 }, { path: loop(-150, 268, -20, 286), phase: 0.45, from: 850 }, { path: loop(-150, 60, -100, 72), phase: 0.2, from: 500, to: 850 }];
  const oxen = [], B = beasts();
  for (const tm of teams) {
    const a = tm.from, b = tm.to || INF, route = 2 * (Math.abs(tm.path[1][0] - tm.path[0][0]) + Math.abs(tm.path[2][1] - tm.path[1][1]));
    P('medieval', 'plough', 0, 0, 0, a, b, { safe: 1, path: tm.path, speed: 0.75, phase: tm.phase });
    P('medieval', 'herd', 0, 0, 0, a, b, { safe: 1, path: tm.path.map(([x, z]) => [x, z]), speed: 0.75, phase: tm.phase + 5.6 / route, s: 0.72 });
    for (const side of [0.55, -0.55]) oxen.push({ make: B.ox, path: tm.path, speed: 0.75, phase: tm.phase, ahead: 3.5, side, u0: Y(a), u1: Y(b), scale: 0.95 });
  }
  // sowing the spring field, hoeing, and threshing at the barn
  for (let i = 0; i < 6; i++) walker([[-120 + i * 34, -196], [-120 + i * 34, -300]], 850, INF, { outfit: 'medieval', action: 'sow', speed: 0.9 });
  for (let i = 0; i < 6; i++) P(folk(), 'hoe', -196 + (i % 3) * 3 + r(), -22 + i * 2.6, ang(), 850, INF);
  for (const [x, z] of [[-128, 66], [-118, 80], [-134, 96], [84, -92], [100, -104]]) P(folk(), 'hoe', x, z, ang(), 500, 850, { safe: 1 });
  kit.during(900, INF, () => kit.at(-212, G, 78, 0.1, () => {   // the tithe barn and its threshing floor
    walls(kit, 'rubble', -6, -13, 6, 13, 0, 4.2, 0.6, 0xe0d8c8, (s, l) => (s === 'e' ? [{ x: l / 2, y: 0, w: 3.6, h: 3.8, arch: 'flat', fill: ['plank', 0x4a3424, 'tile'], back: 0.8 }] : [])); kit.gable('thatch', 'rubble', -6, -13, 6, 13, 4.2, 6.4, { axis: 'z', over: 0.6, wcol: 0xe0d8c8 }); kit.solid(-6, -13, 6, 13);
    kit.cyl('earth', 15, 0, 0.06, 0.07, 6.5, 0.1, 20, 0xd8c8a0);
  }));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; P('medieval', 'thresh', -197 + Math.cos(a) * 3.2, 79.5 + Math.sin(a) * 3.2, Math.PI - a, 900, INF); }
  for (let i = 0; i < 3; i++) walker([[-200, 76], [-205.5, 77.5]], 900, INF, { action: 'carry', prop: 'sack', outfit: 'medieval', speed: 0.9 });
  // the first villagers at home: grinding, cooking, spinning
  [[-43, 9.5, 'grind'], [-28, 34.5, 'cook'], [7, 24.5, 'grind'], [37, 16, 'spin'], [24, 64.5, 'cook'], [-20, 88.5, 'grind'], [62, 42, 'weave'], [50, -8, 'spin'], [-60, -21, 'cook']].forEach(([x, z, act]) => P('medieval-f', act, x, z, ang(), 500, 1100, { safe: 1 }));
  for (let i = 0; i < 8; i++) { const h = HUTS[Math.floor(r() * 9)], g = HUTS[Math.floor(r() * 9)]; walker([[h[0] + 4, h[1] + 4], [14 + r() * 4, 47 + r() * 3], [g[0] - 4, g[1] + 4]], 500, 1100, r() < 0.4 ? { action: 'carry', prop: 'basket', safe: 1 } : { safe: 1 }); }

  // ---------- the mill on the Eure, and the bridge ----------
  const MX = riverX(60) - 28;
  kit.during(900, INF, () => kit.at(MX, G, 60, 0, () => {
    walls(kit, 'rubble', 0, -5, 10, 5, -4, 9, 0.6, 0xe0d8c8, (s, l) => (s === 'w' ? [{ x: l / 2, y: 4, w: 1.3, h: 2.2, arch: 'round', fill: ['plank', 0x4a3424, 'tile'] }] : s === 'e' ? [] : [{ x: l / 2, y: 6, w: 0.8, h: 1.2, arch: 'round', fill: DARK }]));
    kit.gable('thatch', 'rubble', 0, -5, 10, 5, 5, 5, { over: 0.6, wcol: 0xe0d8c8 }); kit.solid(0, -5, 10, 5);
  }));
  const wheelBag = new Bag();
  for (const x of [-0.6, 0.6]) { wheelBag.add(new THREE.TorusGeometry(2.4, 0.1, 5, 26).rotateY(Math.PI / 2), WOOD, mat4(x, 0, 0)); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; wheelBag.rod(WOOD, [x, 0, 0], [x, Math.sin(a) * 2.4, Math.cos(a) * 2.4], 0.06, 4); } }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283; wheelBag.box(PALE, 1.3, 0.5, 0.05, 0, Math.sin(a) * 2.45, Math.cos(a) * 2.45, a, 0, 0); }
  wheelBag.rod(WOOD, [-1.6, 0, 0], [1, 0, 0], 0.14, 6);
  const wheel = new THREE.Mesh(props.loose(wheelBag.geo()), props.mat); wheel.position.set(MX + 11.2, WATER + 1.5, 60); wheel.castShadow = true; group.add(wheel);
  for (let i = 0; i < 3; i++) walker([[MX - 1.2, 60], [MX - 30, 40], [178, 20]], 900, INF, { action: 'carry', prop: 'sack', outfit: 'medieval', phase: i / 3 });
  kit.during(1100, INF, () => { const bx = riverX(CZ) - 24; for (const s of [1, -1]) kit.along(bx, CZ + s * 2.8, bx + 48, CZ + s * 2.8, -3, (l) => kit.panel('stone', l, 10.1, [8, 24, 40].map((x) => ({ x, y: 0, w: 12, h: 8.4, arch: 'round' })), 0.5, 0xe8e2d4)); kit.box('earth', bx - 8, G - 0.6, CZ - 2.8, bx + 56, G + 0.1, CZ + 2.8, 0xc8b898, ''); flat('earth', bx + 56, CZ - 2.5, 400, CZ + 2.5, 0xc8b898, 0.08);
    kit.platform(bx - 8, CZ - 2.8, bx + 56, CZ + 2.8, G + 0.1); kit.solid(bx, CZ - 2.8, bx + 48, CZ - 2.3, { lo: G, hi: G + 2 }).solid(bx, CZ + 2.8, bx + 48, CZ + 3.3, { lo: G, hi: G + 2 }); });

  // ---------- the plague ----------
  { const b = props.bag(PLAGUE, 1420), CR = fin(0x5a4630, 0.9);
    for (let i = 0; i < 26; i++) { const x = -29 + (i % 9) * 4.4 + r(), z = -109 + Math.floor(i / 9) * 7 + r(); b.ball(EARTH, x, G + 0.05, z, 0.55, 0.22, 1.05); b.box(CR, 0.07, 0.9, 0.07, x, G + 0.5, z - 1.1); b.box(CR, 0.5, 0.07, 0.07, x, G + 0.72, z - 1.1); } }
  kit.during(1100, INF, () => { for (let i = 0; i < 7; i++) kit.at(-26 + i * 5.6, G, -86, 0, () => { kit.box('stone', -0.12, 0, -0.1, 0.12, 1.3, 0.1, 0xb8b0a0, ''); kit.box('stone', -0.4, 0.8, -0.1, 0.4, 1, 0.1, 0xb8b0a0, ''); }); });
  const cartPath = [[-2, 16], [-46, 10], [-46, -84], [-33, -96]];
  P('medieval', 'push', 0, 0, 0, PLAGUE, 1352, { safe: 1, path: cartPath, speed: 0.55, phase: 0.2 });
  P('medieval', 'dig', -12, -95.5, 0.4, PLAGUE, 1352, { safe: 1 }); P('medieval', 'dig', -3.5, -102, 2.4, PLAGUE, 1352, { safe: 1 });
  P('monk', 'pray', -20, -100, 0.3, PLAGUE, 1352, { safe: 1 }); P('medieval-f', 'kneel', -24.5, -108, 1.57, PLAGUE, 1352, { safe: 1 }); P('medieval-f', 'kneel', -16, -94, 1.2, PLAGUE, 1352, { safe: 1 });
  const cartBag = new Bag(), SHROUD = fin(0xcfc8b4, 1);
  cartBag.box(WOOD, 1.9, 0.08, 1, 0.3, 0.62, 0); for (const s of [1, -1]) { cartBag.box(WOOD, 1.9, 0.3, 0.05, 0.3, 0.8, s * 0.5); cartBag.rod(WOOD, [-0.65, 0.66, s * 0.42], [-1.5, 0.98, s * 0.25], 0.035, 5); cartBag.add(new THREE.TorusGeometry(0.5, 0.045, 5, 18), WOOD, mat4(0.4, 0.5, s * 0.6)); for (let k = 0; k < 4; k++) cartBag.rod(WOOD, [0.4 + Math.cos(k * 0.785) * 0.5, 0.5 + Math.sin(k * 0.785) * 0.5, s * 0.6], [0.4 - Math.cos(k * 0.785) * 0.5, 0.5 - Math.sin(k * 0.785) * 0.5, s * 0.6], 0.025, 4); }
  cartBag.ball(SHROUD, 0.3, 0.84, 0.12, 0.85, 0.16, 0.22).ball(SHROUD, 0.25, 0.86, -0.2, 0.8, 0.15, 0.2);
  const cart = new Followers(world, props.loose(cartBag.geo()), props.mat, [{ path: cartPath, speed: 0.55, phase: 0.2, ahead: 1.55, u0: Y(PLAGUE), u1: Y(1352) }]); group.add(cart.mesh);

  // ---------- standing corn, sheaves, sheep, trees ----------
  const wheatGeo = new THREE.PlaneGeometry(2.2, 1.15).translate(0, 0.57, 0), wg2 = wheatGeo.clone().rotateY(Math.PI / 2), wpos = new Float32Array([...wheatGeo.attributes.position.array, ...wg2.attributes.position.array]), wuv = new Float32Array([...wheatGeo.attributes.uv.array, ...wg2.attributes.uv.array]);
  const wgeo = new THREE.BufferGeometry(); wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3)); wgeo.setAttribute('uv', new THREE.BufferAttribute(wuv, 2)); wgeo.setIndex([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]); wgeo.computeVertexNormals();
  const wn = wgeo.attributes.normal; for (let i = 0; i < wn.count; i++) wn.setXYZ(i, 0, 1, 0);
  const wheat = new THREE.InstancedMesh(wgeo, new THREE.MeshStandardMaterial({ map: texture('wheat'), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }), 5200), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 5200; i++) { const x = -263.2 - r() ** 1.5 * 80, z = -112 + r() * 84; wheat.setMatrixAt(i, _m.compose(_p.set(x, G, z), _q.setFromAxisAngle(UP, r() * 3.14), _s.set(0.8 + r() * 0.5, 0.85 + r() * 0.3, 1))); }
  wheat.receiveShadow = true; wheat.frustumCulled = false; group.add(wheat);
  { const b = props.bag(850, INF); for (let i = 0; i < 26; i++) { const x = -258 + r() * 14, z = -108 + r() * 80; b.cyl(GOLD, 0.1, 0.42, 1.1, x, G + 0.55, z, 7); b.cyl(GOLD, 0.3, 0.1, 0.3, x, G + 1.2, z, 7); } }
  const flock = [], grazing = baked(B.sheep, 0.4, 1), alert = baked(B.sheep, 1.9, 0);
  for (let i = 0; i < 46; i++) { const cx = [215, 250, 232][i % 3], cz = [90, 150, 230][i % 3]; flock.push({ x: cx + (r() - 0.5) * 44, z: cz + (r() - 0.5) * 50, rot: ang(), s: 0.9 + r() * 0.25 }); }
  const sheep = [herdOf(world, grazing, flock.filter((_, i) => i % 4)), herdOf(world, alert, flock.filter((_, i) => i % 4 === 0))]; group.add(...sheep);
  P('medieval', 'herd', 0, 0, 0, 500, INF, { safe: 1, path: loop(200, 70, 262, 250), speed: 0.6 }); P('medieval', 'stand', 240, 120, 2, 500, INF, { safe: 1, prop: 'staff' });

  const K = globalThis.__floraKinds || (globalThis.__floraKinds = makeKinds()), woods = [];
  /** n trees shared among `kinds`, standing from the start until year `until`. */
  const trees = (kinds, n, place, until, size) => { for (const kind of kinds) { const items = []; for (let i = 0; i < n / kinds.length; i++) { const p = place(); if (!p) continue; const g = 0.72 + r() * 0.3; items.push({ x: p[0], z: p[1], s: size[0] + r() * (size[1] - size[0]), rot: ang(), tint: [g * (0.85 + r() * 0.3), g, g * (0.7 + r() * 0.3)] }); } const meshes = grove(world, K[kind], items, { cz: CZ }); group.add(...meshes); woods.push({ meshes, until }); } };
  const dry = (x, z) => Math.abs(x - riverX(z)) > 24;
  const inField = (x, z) => (x > -645 && x < -236 && Math.abs(z) < 335) || (x > -235 && x < 295 && z < -186 && z > -475) || (x > -235 && x < 185 && z > 204 && z < 475);
  trees(['broadleaf', 'elm'], 300, () => { const x = (r() * 2 - 1) * 900, z = (r() * 2 - 1) * 900; return !inField(x, z) && dry(x, z) && !inTown(x, z, 1.45) && Math.abs(z - CZ) > 8 ? [x, z] : null; }, INF, [0.7, 1.4]);
  trees(['elmB'], 44, () => { const z = (r() * 2 - 1) * 700, s = r() < 0.5 ? -1 : 1; return Math.abs(z - CZ) < 12 || Math.abs(z - 60) < 14 ? null : [riverX(z) + s * (25 + r() * 10), z]; }, INF, [0.5, 0.9]);
  // the old woodland where the great fields will be, felled as the village grows
  const old = () => { const x = (r() * 2 - 1) * 640, z = (r() * 2 - 1) * 470; return (inField(x, z) || (inTown(x, z, 1.45) && !inTown(x, z, 0.78))) && dry(x, z) && !(x > -160 && x < -90 && z > 45 && z < 130) && Math.abs(z - CZ) > 8 ? [x, z] : null; };
  trees(['broadleafB'], 120, old, 760, [0.7, 1.4]); trees(['elmC'], 120, old, 850, [0.7, 1.4]);
  trees(['shrub'], 70, () => { const x = (r() * 2 - 1) * 600, z = (r() * 2 - 1) * 520; return !inField(x, z) && dry(x, z) && !inTown(x, z, 1.25) && Math.abs(z - CZ) > 6 ? [x, z] : null; }, INF, [0.8, 1.6]);

  // ---------- inside: shopkeepers behind their counters, people at prayer in the churches (their own random sequence, so the town keeps its layout) ----------
  const rq = rng(4471), add = (outfit, action, x, z, rot, a, b) => list.push({ outfit, action, x, z, rot, u0: Y(a), u1: Y(b) }), sex = () => (rq() < 0.5 ? 'medieval' : 'medieval-f');
  for (const q of SHOPS) add(sex(), rq() < 0.6 ? 'trade' : 'stand', q.x, q.z, q.ry - Math.PI / 2, q.from, INF);
  for (let i = 0; i < 9; i++) add(i % 4 === 0 ? 'monk' : sex(), i % 3 ? 'kneel' : 'pray', CX + 24 + rq() * 34, CZ0 + (rq() - 0.5) * 9, (rq() - 0.5) * 0.3, 1226, INF);
  add('monk', 'pray', CX + 95, CZ0, 0, 1226, INF);
  for (let i = 0; i < 4; i++) add(sex(), i % 2 ? 'kneel' : 'pray', -4 + rq() * 12, -40 + (rq() - 0.5) * 6, 0, 1000, 1194);
  for (let i = 0; i < 3; i++) add(sex(), 'kneel', -1 + rq() * 6, -40 + (rq() - 0.5) * 4, 0, 500, 1000);
  // ---------- assemble ----------
  kit.build(group, { clip: (m) => clipped(m, clipY) }); props.build(group, { clip: (m) => clipped(m, clipScaffold, true) });
  const floorK = kit.floor(); let year = 1000;
  const ground = Object.create(world); ground.heightAt = (x, z) => Math.max(world.heightAt(x, z), floorK(x, z, year));   // people walk on decks and floors, not under them
  const people = actors(ground, list, { seed: 7 }); group.add(...people.meshes);
  const mounts = new Walkers(ground, group, [...oxen, ...rides.map((q) => ({ make: horse, path: q.path, speed: q.speed, phase: q.phase, u0: Y(q.from), load: q.load }))]);
  const fumes = smoke(hearths, { per: 5, rise: 1.6, wind: [0.9, 0.3], life: 9, grey: 0.5 }); group.add(fumes.mesh);
  const hit = kit.collider();
  const RISE = [[1194, 0.3], [1200, 14.5], [1208, 24], [1215, 36.5], [1221, 51], [1226, 60]];
  return {
    update(u, t, env, camera, view) {
      year = uToYear(u); eye.x = camera.position.x; eye.z = camera.position.z;
      kit.update(year); props.update(year);
      let h = 1e6; if (year < 1226) { h = 0; for (let i = 0; i < RISE.length - 1; i++) if (year >= RISE[i][0]) h = RISE[i][1] + ((RISE[i + 1][1] - RISE[i][1]) * Math.min(1, (year - RISE[i][0]) / (RISE[i + 1][0] - RISE[i][0]))); }
      clipY.value = G + h; clipScaffold.value = G + h + 4.5;
      wheat.visible = year >= 850; wheel.visible = year >= 900; wheel.rotation.x = t * 0.5;
      people.update(u, t, view); mounts.update(u, t); for (const a of riders) a.update(u, t); cart.update(u, t); fumes.update(year, t, group.parent);
      for (const w of woods) { const on = year < w.until; for (const m of w.meshes) m.visible = on; }
    },
    collide(pos) { hit(pos, year); },
    floorAt(x, z) { return floorK(x, z, year); },
  };
}

export default {
  place: 'Chartres · France', coords: [48.45, 1.49],
  terrain: { base, relief: () => 0, bounds: { x: 400, z: 440 }, tint: (x, z, b) => (b < 5.6 ? 0.8 : 1) },
  spawn: { x: 70, z: 66, yaw: 0.76 },
  env(year, env) {
    hexA(0x4f86c8, env.top); hexA(0xc6d8e2, env.hor); hexA(0x5f7f3c, env.ground); hexA(0x4a5f35, env.far); hexA(0x4c6a52, env.water); hexA(0xfff2d8, env.sun); hexA(0xffffff, env.cloudCol);
    env.sea = WATER; env.hill = 1; env.ice = -60; env.cloud = 0.5; env.precip = 0; env.fogD = 0.0015; env.sunEl = 0.8; env.sunI = 2.1; env.amb = 1; env.exposure = 1; env.bloom = 0.25; env.glow = 0; env.meteor = 0; hexA(0, env.lava);
    // the plague years: a low grey sky
    const p = Math.max(0, 1 - Math.abs(year - 1349.5) / 4);
    if (p > 0) { env.cloud += 0.42 * p; env.sunI -= 0.9 * p; env.fogD += 0.0022 * p; for (let i = 0; i < 3; i++) { env.top[i] += (0.52 - env.top[i]) * p * 0.8; env.hor[i] += (0.7 - env.hor[i]) * p * 0.7; env.cloudCol[i] -= 0.3 * p; } }
    // grass outside the walls, trodden earth within
    const d = Math.hypot(eye.x / RA, (eye.z - CZ) / RB);
    env.grass = year < 1100 ? 0.55 * smooth((Math.hypot(eye.x, eye.z - 30) - 40) / 80) + 0.2 : 0.85 * smooth((d - 0.95) / 0.35);
  },
  events: [
    { y: 500, t: 'A village in the ruins', h: 'Autricum was a Roman town. Now a few thatched huts and a timber church stand among its fallen columns, and the forest has come back to the edge of the plots.', w: 'The empire in the west ended a generation ago. Clovis, king of the Franks, has just been baptised.' },
    { y: 858, t: 'Northmen on the river', h: 'Vikings came up the Eure and burned the church. It has been rebuilt. The woods are being cleared, strip by strip, for the plough.', w: 'Charlemagne’s empire has been split among his grandsons. In 876 one of them gives Chartres a relic: the veil of the Virgin.' },
    { y: 1000, t: 'Open fields', h: 'Three great fields, each a patchwork of strips: wheat, spring corn, fallow. Ox teams drag the heavy plough, a mill turns on the river, and the church is stone.', w: 'Fulbert will make the school here famous. Norse sailors reach America; in China, money is printed on paper.' },
    { y: 1145, t: 'The west front', h: 'Two towers and three carved doorways rise in front of the old church. People of every rank are said to harness themselves to the carts of stone.', w: 'Paris is building in a new style, all ribs and light. A second crusade is being preached.' },
    { y: 1194, t: 'After the fire', h: 'On 10 June 1194 the church burned; only the west front and the crypt survived. The rebuilding began at once, behind a forest of scaffolding.', w: 'Saladin died last year. In twelve years a Mongol chief will take the name Genghis Khan.' },
    { y: 1221, t: 'The vaults are closed', h: 'In under thirty years: vaults 36 metres up, held by flying buttresses, and walls that are mostly coloured glass. The canons take their seats in the choir.', w: 'Magna Carta is six years old. Paris has a university; so does Bologna.' },
    { y: 1260, t: 'The dedication', h: 'The cathedral is dedicated in October 1260, with King Louis IX present. The town has walls, a market, tanners and weavers along the river.', w: 'The Mongols have taken Baghdad. Europe is warmer and fuller of people than it has ever been.' },
    { y: 1348, t: 'The pestilence', h: 'The plague reaches the Île-de-France in the summer of 1348. Half the houses are shut. A cart goes round, and the churchyard is full of new earth.', w: 'Between a third and a half of Europe dies in four years. It will take two centuries to refill the villages.' },
    { y: 1360, t: 'Black Monday', h: 'An English army camped outside these walls is caught by a hailstorm that kills men and horses. Its king makes peace at Brétigny, an hour’s walk away.', w: 'The war between France and England will last, on and off, a hundred and sixteen years.' },
    { y: 1450, t: 'Recovery', h: 'The fields are worked again and the market is busy. Labour is scarce, so wages are better than they have ever been. The spires have not changed.', w: 'In Mainz, Gutenberg is printing with movable type. In 1492 three ships will sail west from Spain.' },
  ],
  build,
};
