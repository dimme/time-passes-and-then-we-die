// Manchester, 1770–1840: a market town of hand-loom weavers on the Irwell becomes the first industrial city.
// East is +x, south is +z. Old town to the north-west, the Bridgewater Canal and its basin across the middle (z = 120),
// the mills of Ancoats to the north-east, the 1830 railway on its viaduct along z = 19, terraces to the south-east.
import * as THREE from 'three';
import { rng, smooth } from './util.js';
import { uToYear, yearToU } from './timeline.js';
import { makeKinds } from './flora.js';
import { species } from './animals.js';
import { actors } from './people-actors.js';
import { cartParts } from './vehicles.js';
import { Bag, vehicleMat } from './vehicles-kit.js';
import { Kit, Props, Followers, fin, mat4, clipped, pathOf, where, smoke, grove } from './site-medieval-kit.js';
import { Walkers, horse } from './site-medieval-beasts.js';
import { walls } from './site-medieval-cathedral.js';
import { trainParts, track } from './site-manchester-train.js';

const G = 6, WATER = 4.8, CANAL = 120, RIVER = -330, DECK = 6.5, RAILZ = 16.5;
const quay = (x) => { const a = Math.abs(x); return a < 60 ? 22 : a > 70 ? 7 : 22 - (a - 60) * 1.5; };   // half-width of the water: canal, and the basin at Castlefield
function base(x, z) {
  let h = G; const dr = Math.abs(x - RIVER - 10 * Math.sin(z / 150));
  if (dr < 22) h = dr < 12 ? -2 : -2 + (G + 2) * smooth((dr - 12) / 10);
  if (x > RIVER) { const d = Math.abs(z - CANAL), hw = quay(x) + 2; if (d < hw + 11) h = Math.min(h, d < hw ? 2.5 : 2.5 + (G - 2.5) * smooth((d - hw) / 11)); }
  const far = Math.hypot(x, z); if (far > 700) h += smooth((far - 700) / 300) * (14 + 10 * Math.sin(x * 0.005) * Math.cos(z * 0.006 + 1));   // the Pennine foothills
  return h;
}
const hexA = (h, o, k = 1) => { o[0] += ((h >> 16 & 255) / 255 - o[0]) * k; o[1] += ((h >> 8 & 255) / 255 - o[1]) * k; o[2] += ((h & 255) / 255 - o[2]) * k; };
const eye = { x: 0, z: 0 };
const LIT = ['lit', 0xffffff, 'tile'], PANE = ['pane', 0x56606a, 'tile'];

/** A row of brick houses sharing one roof: local x 0..len, front towards +z. kind: 'georgian' | 'weaver' | 'back' (back-to-backs). */
function terrace(kit, r, len, { kind = 'back', col = 0xffffff, lit = 0.3, late = false } = {}) {
  const unit = kind === 'georgian' ? 6.2 : kind === 'weaver' ? 5 : 4, floors = kind === 'back' ? 2 : 3, fh = kind === 'georgian' ? 3.3 : 2.8, d = kind === 'back' ? 8.4 : 9, n = Math.max(1, Math.round(len / unit)), u = len / n, H = floors * fh;
  const win = (x, y, w, h) => ({ x, y, w, h, arch: 'flat', fill: r() < lit ? LIT : PANE }), door = kind === 'georgian' ? [0x1c2a20, 0x2a1c14, 0x1a1a22] : [0x3a2a1c, 0x2c3a2c, 0x4a3020];
  walls(kit, 'brick', 0, -d / 2, len, d / 2, 0, H, 0.25, col, (s) => {
    const o = []; if (s === 'e' || s === 'w') return kind === 'georgian' ? [win(d / 2, fh + 1, 1, 1.7)] : [];
    for (let i = 0; i < n; i++) {
      const x0 = 0.25 + i * u;
      if (s === 's') o.push({ x: x0 + u * 0.27, y: 0, w: 1, h: kind === 'georgian' ? 2.7 : 2.05, arch: kind === 'georgian' ? 'round' : 'flat', fill: ['plank', door[Math.floor(r() * 3)], 'tile'], back: 0.7 }); else if (kind !== 'back') o.push(win(x0 + u * 0.3, 0.9, 1, 1.5));
      o.push(win(x0 + u * 0.72, 0.9, kind === 'georgian' ? 1.15 : 1, kind === 'georgian' ? 1.9 : 1.4));
      for (let k = 1; k < floors; k++) {
        if (kind === 'weaver' && k === floors - 1) o.push(win(x0 + u / 2, k * fh + 0.9, u - 1.3, 1.15));   // the long loom-shop window under the eaves
        else { o.push(win(x0 + u * 0.72, k * fh + 0.85, kind === 'georgian' ? 1.15 : 1, kind === 'georgian' ? 1.9 : 1.35)); if (kind !== 'back') o.push(win(x0 + u * 0.27, k * fh + 0.85, kind === 'georgian' ? 1.15 : 1, kind === 'georgian' ? 1.9 : 1.35)); }
      }
    }
    return o;
  });
  kit.gable('slate', 'brick', 0, -d / 2, len, d / 2, H, d * 0.3, { over: 0.25, wcol: col, col: late ? 0xb8b8b8 : 0xffffff });
  for (let i = 0; i <= n; i++) { const x = Math.min(len - 0.6, Math.max(0.6, i * u)); kit.box('brick', x - 0.5, H + d * 0.12, -0.45, x + 0.5, H + d * 0.3 + 1.2, 0.45, col, 'b'); for (const dx of [-0.25, 0.25]) kit.cyl('tile', x + dx, 0, H + d * 0.3 + 1.2, H + d * 0.3 + 1.65, 0.13, 0.1, 6, 0xd0b0a0); }
  kit.solid(0, -d / 2, len, d / 2);
  return { n, u, d };
}
/** A cotton mill: seven storeys of brick and regular windows, a stair tower, an engine house and its chimney. Local x 0..len, z ±9. */
function mill(kit, r, len, { floors = 7, col = 0xffffff, lit = 0.75, tall = 44, chimneys }) {
  const fh = 3.3, W = 9, H = floors * fh, bays = Math.floor(len / 3.1);
  walls(kit, 'brick', 0, -W, len, W, 0, H, 0.5, col, (s, l) => {
    const n = s === 's' || s === 'n' ? bays : 5, o = [];
    for (let k = 0; k < floors; k++) for (let i = 0; i < n; i++) { if (k === 0 && s === 's' && i === Math.floor(n / 2)) { o.push({ x: (l * (i + 0.5)) / n, y: 0, w: 1.9, h: 2.9, arch: 'round', fill: ['plank', 0x2a2620, 'tile'], back: 0.7 }); continue; } o.push({ x: (l * (i + 0.5)) / n, y: k * fh + 0.95, w: 1.25, h: 1.9, arch: 'flat', fill: r() < lit ? LIT : PANE }); }
    return o;
  });
  kit.gable('slate', 'brick', 0, -W, len, W, H, 3.6, { over: 0.2, wcol: col, col: 0xb0b0b0 });
  kit.box('brick', -5, 0, -3, 0, H + 3.5, 3, col); kit.box('lead', -4.6, H + 3.5, -2.6, -0.4, H + 5.2, 2.6, 0x70767c, 'b');   // stair tower with the water tank on top
  // engine house and chimney
  walls(kit, 'brick', len, -W, len + 9, -W + 11, 0, 10, 0.4, col, (s, l) => (s === 's' ? [{ x: l / 2, y: 1.2, w: 2.4, h: 6.5, arch: 'round', fill: LIT }] : s === 'e' ? [{ x: l / 2, y: 1.2, w: 2.4, h: 6.5, arch: 'round', fill: LIT }] : []));
  kit.gable('slate', 'brick', len, -W, len + 9, -W + 11, 10, 2.6, { over: 0.2, wcol: col, col: 0xb0b0b0 });
  const cx = len + 4.5, cz = -W + 15;
  kit.box('brick', cx - 2.6, 0, cz - 2.6, cx + 2.6, 5, cz + 2.6, col); kit.cyl('brick', cx, cz, 5, tall, 2.2, 1.25, 10, col); kit.cyl('brick', cx, cz, tall - 1, tall, 1.5, 1.5, 10, 0xc8c0b8);
  kit.solid(-5, -W, len + 9, W).solid(cx - 2.6, cz - 2.6, cx + 2.6, cz + 2.6);
  const e = kit.M.elements; chimneys.push({ x: e[0] * cx + e[8] * cz + e[12], y: G + tall + 1, z: e[2] * cx + e[10] * cz + e[14], size: 3.4, from: kit.span[0] });
}

function build({ world, group }) {
  const r = rng(1830), kit = new Kit(), props = new Props(), Y = yearToU, list = [], INF = Infinity, chimneys = [];
  const clipY = { value: 1e6 };
  const WOOD = fin(0x6a4a2c, 0.9), PALE = fin(0xa88a5c, 0.9), IRON = fin(0x2e2e32, 0.5, 0.6), COAL = fin(0x0e0e10, 0.95), CLOTH = fin(0xe8e4d8, 0.95), BALE = fin(0xd8d0bc, 1), SACK = fin(0x9a8a68, 1), TAR = fin(0x2a2420, 0.8), RED = fin(0x8a3220, 0.7), EMBER = fin(0xff5a10, 0.8, 0, 2.5), GREENF = fin(0x2f4a36, 0.7);
  const ang = () => r() * 6.283;
  // working dress is drab; a few better coats among it
  const DRAB = [0x4a4238, 0x3a3a40, 0x5a4a3a, 0x2e3238, 0x6a5a48, 0x4a3a34, 0x55504a], lin = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }, drab = () => lin(DRAB[Math.floor(r() * DRAB.length)]);
  const P = (outfit, action, x, z, rot, a, b, o = {}) => list.push({ outfit, action, x, z, rot, ...(o.fine ? {} : { tint: drab(), legs: drab() }), ...o, u0: Y(a), u1: Y(b) });
  const man = () => (r() < 0.5 ? 'georgian' : 'millhand'), woman = () => 'dress', anyone = () => (r() < 0.55 ? 'millhand' : 'dress'), late = () => (r() < 0.45 ? 'dress' : r() < 0.7 ? 'hat' : 'millhand');
  const walker = (path, a, b, o = {}) => P(o.outfit || anyone(), o.action || 'walk', path[0][0], path[0][1], 0, a, b, { path, speed: 1.1 + r() * 0.35, phase: r(), ...o });
  let flats = 0; const flat = (mat, x0, z0, x1, z1, col, y0 = 0.05, y = y0 + (flats++ % 9) * 0.004) => kit.poly(mat, [[x0, G + y, z0], [x1, G + y, z0], [x1, G + y, z1], [x0, G + y, z1]], col);

  // ---------- the canal: stone quays, towpaths, the basin ----------
  const XS = [-312, -70, -60, 60, 70, 620];
  for (const s of [1, -1]) for (let i = 0; i < XS.length - 1; i++) {
    const x0 = XS[i], x1 = XS[i + 1], z0 = CANAL + s * quay(x0 === -70 || x0 === 70 ? x0 + (x0 < 0 ? -1 : 1) : x0), z1 = CANAL + s * quay(x1 === -70 || x1 === 70 ? x1 + (x1 < 0 ? -1 : 1) : x1), zo = CANAL + s * 38;
    kit.poly('stone', [[x0, 2, z0], [x1, 2, z1], [x1, G + 0.06, z1], [x0, G + 0.06, z0]], 0x9a948a);
    kit.poly('cobble', [[x0, G + 0.06, z0], [x1, G + 0.06, z1], [x1, G + 0.06, zo], [x0, G + 0.06, zo]], 0xe8e4dc);
    for (let x = x0 + 6; x < x1 && x < 300; x += 14) { const t = (x - x0) / (x1 - x0), z = z0 + (z1 - z0) * t - s * 0.5; kit.cyl('stone', x, z, G, G + 0.75, 0.16, 0.2, 8, 0x4a4a4a, { open: false }); }   // mooring posts
  }
  // ---------- meadows and tenter grounds that the town will swallow ----------
  kit.during(1770, 1797, () => flat('strips', 76, -40, 300, 80, 0x7f9a55)); kit.during(1770, 1800, () => flat('strips', 60, 160, 300, 330, 0x86a05a)); kit.during(1770, 1826, () => flat('strips', -290, -22, -30, 60, 0x8aa25c));
  kit.during(1770, INF, () => { flat('cobble', -190, -230, -80, -150, 0xffffff, 0.07); flat('cobble', -300, -124, 300, -116, 0xf0ece4, 0.07); flat('cobble', -34, -330, -26, 82, 0xf0ece4, 0.07); flat('cobble', -204, -330, -196, -20, 0xf0ece4, 0.07); });
  kit.during(1797, INF, () => { flat('cobble', 60, 40, 300, 64, 0xe0dcd4, 0.07); flat('cobble', 140, -116, 152, 40, 0xe0dcd4, 0.07); });
  kit.during(1800, INF, () => flat('cobble', 60, 158, 300, 330, 0xd8d4cc, 0.045));
  { const b = props.bag(1770, 1826);   // tenter frames: new cloth stretched on hooks to dry and bleach
    for (let i = 0; i < 7; i++) { const z = -8 + i * 9, x0 = -250 + (i % 2) * 12, n = 9; for (let k = 0; k <= n; k++) b.box(WOOD, 0.1, 1.7, 0.1, x0 + k * 5, G + 0.85, z); b.box(WOOD, n * 5, 0.07, 0.07, x0 + n * 2.5, G + 1.65, z).box(WOOD, n * 5, 0.07, 0.07, x0 + n * 2.5, G + 0.5, z); if (i % 3 !== 1) b.add(new THREE.PlaneGeometry(n * 5 - 6, 1.1), CLOTH, mat4(x0 + n * 2.5 - (i % 2) * 3, G + 1.08, z + 0.06)); } }
  for (const [x, z] of [[-240, -4], [-200, 14], [-150, 5], [-120, 32]]) P(woman(), 'stand', x, z, 1.57, 1770, 1826); P(man(), 'crouch', -180, 23.5, 1.57, 1770, 1826); P(man(), 'carry', 0, 0, 0, 1770, 1826, { path: [[-230, 40], [-60, 44], [-40, 70]], prop: 'sack', speed: 1.1, phase: 0.3 });

  // ---------- the old town: the collegiate church, the market place, Georgian streets ----------
  kit.at(-250, G, -262, 0, () => {   // the Collegiate Church (the cathedral to be): a Perpendicular nave and a tall west tower
    const C = 0x9a9488, GL = ['glass', 0xffffff, 'fit', [0.03, 0, 0.47, 1]];
    walls(kit, 'stone', 12, -9, 60, 9, 0, 13, 0.8, C, (s, l) => (s === 's' || s === 'n' ? Array.from({ length: 7 }, (_, i) => ({ x: (l * (i + 0.5)) / 7, y: 3, w: 3.2, h: 8, arch: 'point', sharp: 0.5, fill: GL })) : s === 'e' ? [{ x: l / 2, y: 3, w: 6, h: 9, arch: 'point', sharp: 0.5, fill: GL }] : []));
    kit.gable('lead', 'stone', 12, -9, 60, 9, 13, 3.4, { over: 0.2, wcol: C, col: 0x9aa0a6 });
    for (let i = 0; i <= 7; i++) for (const s of [1, -1]) { kit.box('stone', 12 + (i * 48) / 7 - 0.5, 0, s * 9.8 - 0.9, 12 + (i * 48) / 7 + 0.5, 12, s * 9.8 + 0.9, C); kit.cyl('stone', 12 + (i * 48) / 7, s * 10, 13, 16, 0.5, 0.05, 4, C); }
    walls(kit, 'stone', 0, -6, 12, 6, 0, 36, 0.9, C, (s, l) => [...(s === 'w' ? [{ x: l / 2, y: 0, w: 2.6, h: 5, arch: 'point', fill: ['plank', 0x3a2a1c, 'tile'], back: 0.8 }, { x: l / 2, y: 8, w: 4, h: 9, arch: 'point', sharp: 0.5, fill: GL }] : []), { x: l * 0.3, y: 25, w: 1.6, h: 7, arch: 'point', fill: ['plank', 0x2a221c, 'tile'] }, { x: l * 0.7, y: 25, w: 1.6, h: 7, arch: 'point', fill: ['plank', 0x2a221c, 'tile'] }]);
    for (let x = -0.2; x < 12; x += 1.9) for (const z of [-6.6, 6.2]) kit.box('stone', x, 36, z, x + 1, 37.2, z + 0.5, C, 'b');
    for (const [x, z] of [[0, -6], [0, 6], [12, -6], [12, 6]]) { kit.box('stone', x - 0.9, 0, z - 0.9, x + 0.9, 37, z + 0.9, C); kit.cyl('stone', x, z, 37, 42, 0.9, 0.05, 4, C, { a0: Math.PI / 4 }); }
    kit.solid(0, -6.5, 12, 6.5).solid(12, -10.5, 60, 10.5);
  });
  // street rows: [x, z, length, facing ry, kind, from year, tint]
  const ROWS = [
    [-190, -146, 110, 0, 'georgian', 1770, 0xf0dcd0], [-80, -234, 110, Math.PI, 'georgian', 1770, 0xe8d4c8], [-76, -150, 84, -Math.PI / 2, 'georgian', 1770, 0xf0dcd0], [-194, -234, 84, Math.PI / 2, 'georgian', 1770, 0xe8d0c0],
    [-186, -112, 150, Math.PI, 'georgian', 1770, 0xe8d4c8], [-20, -112, 150, Math.PI, 'georgian', 1790, 0xd8c8bc], [-300, -128, 96, 0, 'weaver', 1770, 0xe0ccc0], [-192, -128, 158, 0, 'weaver', 1770, 0xe8d4c8], [-22, -128, 150, 0, 'georgian', 1780, 0xe0d0c4],
    [-22, -100, 60, -Math.PI / 2, 'weaver', 1770, 0xe0ccc0], [-38, -40, 60, Math.PI / 2, 'weaver', 1775, 0xd8c8bc], [-22, -30, 50, -Math.PI / 2, 'georgian', 1785, 0xd8c8bc], [-208, -40, 70, Math.PI / 2, 'weaver', 1780, 0xd8c8bc], [-192, -110, 70, -Math.PI / 2, 'back', 1795, 0xc8b8ac],
    [-180, -90, 130, 0, 'back', 1805, 0xc0b0a4], [-180, -66, 130, 0, 'back', 1815, 0xb8a89c], [-180, -42, 130, 0, 'back', 1822, 0xb0a094], [-300, -90, 84, 0, 'back', 1810, 0xb8a89c], [-300, -66, 84, 0, 'back', 1820, 0xb0a094],
    [-20, -250, 120, 0, 'georgian', 1790, 0xd8c8bc], [-20, -200, 120, 0, 'back', 1805, 0xc0b0a4], [-20, -176, 120, 0, 'back', 1812, 0xb8a89c], [120, -250, 150, 0, 'back', 1820, 0xb0a094], [120, -226, 150, 0, 'back', 1826, 0xa89a90], [-20, -300, 280, 0, 'back', 1830, 0xa89a90],
    [-190, -300, 150, 0, 'georgian', 1780, 0xe0d0c4], [160, -100, 130, 0, 'back', 1808, 0xb8a89c], [160, -76, 130, 0, 'back', 1816, 0xb0a094], [160, -146, 130, 0, 'weaver', 1790, 0xd0c0b4], [160, -190, 130, 0, 'back', 1824, 0xa89a90],
  ];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 2; i++) ROWS.push([64 + i * 118, 176 + j * 22, 108, j % 2 ? Math.PI : 0, 'back', [1800, 1806, 1812, 1818, 1824, 1829, 1833][j] + i * 3, [0xc8b8ac, 0xc0b0a4, 0xb8a89c, 0xb0a094, 0xa89a90, 0xa09288, 0x988a80][j]]);
  for (let j = 0; j < 5; j++) ROWS.push([-290, 176 + j * 24, 150, 0, 'back', 1812 + j * 5, 0xb0a094], [-120, 176 + j * 24, 150, 0, 'back', 1816 + j * 5, 0xa89a90]);
  const doors = [];
  for (const [x, z, len, ry, kind, from, col] of ROWS) kit.during(from, INF, () => kit.at(ry === Math.PI ? x + len : x, G, ry === Math.PI / 2 ? z : ry === -Math.PI / 2 ? z + len : z, ry, () => {
    const t = terrace(kit, r, len, { kind, col, lit: 0.18 + (from - 1770) * 0.004, late: from > 1810 }), e = kit.M.elements;
    for (let i = 0; i < t.n; i++) if (r() < 0.3) { const lx = (i + 0.3) * t.u, lz = t.d / 2 + 1; doors.push({ x: e[0] * lx + e[8] * lz + e[12], z: e[2] * lx + e[10] * lz + e[14], rot: ry - Math.PI / 2, kind, from }); }
    if (r() < 0.8) chimneys.push({ x: e[0] * len * 0.5 + e[12], y: G + (kind === 'back' ? 9.5 : 13), z: e[2] * len * 0.5 + e[14], size: 0.9, from, dark: 0.7 });
  }));
  // the market place: stalls, traders, buyers
  { const b = props.bag(), stall = new Bag(), CL = [0x8a2a22, 0x2a4a7a, 0xc8b070, 0x4a6a3a, 0xd8d0bc].map((c) => fin(c, 0.95));
    stall.box(WOOD, 2.4, 0.06, 1, 0, 0.82, 0); for (const sx of [-1, 1]) { stall.box(WOOD, 0.08, 0.82, 0.8, sx * 1, 0.41, 0); stall.box(WOOD, 0.07, 2.2, 0.07, sx * 1.2, 1.1, -0.6); stall.box(WOOD, 0.07, 1.9, 0.07, sx * 1.2, 0.95, 0.7); }
    for (let i = 0; i < 14; i++) {
      const x = -176 + (i % 7) * 13, z = i < 7 ? -214 : -168, ry = i < 7 ? 0 : Math.PI, m = mat4(x, G, z, ry);
      props.put(stall, x, G, z, ry); b.add(new THREE.PlaneGeometry(2.6, 1.6), CL[i % 5], m.clone().multiply(mat4(0, 2.08, 0.05, 0, -Math.PI / 2 + 0.23)));
      for (let k = 0; k < 5; k++) b.add(new THREE.SphereGeometry(0.13, 6, 4), [fin(0xd0a850, 0.9), fin(0xa83a2a, 0.9), fin(0x6a8a3a, 0.9), CLOTH][Math.floor(r() * 4)], m.clone().multiply(mat4(-0.9 + k * 0.45, 0.95, (r() - 0.5) * 0.5)));
      P(anyone(), 'trade', x - Math.sin(ry) * 0.9, z - Math.cos(ry) * 0.9, ry - Math.PI / 2, 1770, INF); P(anyone(), r() < 0.5 ? 'talk' : 'stand', x + Math.sin(ry) * 1.9, z + Math.cos(ry) * 1.9, ry + Math.PI / 2, 1770, INF);
    }
    // the market cross and the pump
    kit.at(-135, G, -190, 0, () => { kit.cyl('stone', 0, 0, 0, 0.5, 2.4, 2.4, 8, 0xa8a298, { open: false }); kit.cyl('stone', 0, 0, 0.5, 5, 0.3, 0.22, 8, 0xa8a298); kit.box('stone', -0.7, 4, -0.15, 0.7, 4.3, 0.15, 0xa8a298, ''); kit.solid(-2, -2, 2, 2); });
    b.box(IRON, 0.3, 1.5, 0.3, -100, G + 0.75, -196).rod(IRON, [-100, G + 1.3, -196], [-100.9, G + 1.6, -196], 0.03, 5);
  }
  for (let i = 0; i < 14; i++) P(i % 5 === 0 ? 'hat' : anyone(), ['talk', 'stand', 'talk'][i % 3], -180 + r() * 90, -206 + r() * 30, ang(), i % 5 === 0 ? 1800 : 1770, INF, i % 5 === 0 ? { fine: 1 } : {});
  P(woman(), 'fetch-water', -98.6, -195.4, 2.6, 1770, INF);

  // ---------- hand-loom weavers and spinners, while they last ----------
  doors.filter((d) => d.kind === 'weaver').slice(0, 14).forEach((d, i) => { if (i % 2) P(woman(), 'spin', d.x, d.z, d.rot, 1770, 1806); else P(i % 4 ? man() : woman(), 'weave', d.x, d.z, d.rot + Math.PI / 2, 1770, 1822); });
  doors.filter((d) => d.kind !== 'weaver').slice(0, 26).forEach((d, i) => P(i % 3 ? woman() : man(), i % 4 === 0 ? 'talk' : 'stand', d.x, d.z, d.rot, d.from, INF, i % 3 === 1 ? { s: 0.62 + r() * 0.12 } : {}));

  // ---------- warehouses on the basin ----------
  const warehouse = (x0, z0, x1, z1, floors, from, col, front) => kit.during(from, INF, () => {
    walls(kit, 'brick', x0, z0, x1, z1, G, floors * 3.4, 0.5, col, (s, l) => { const o = [], n = Math.floor(l / 3.4); for (let k = 0; k < floors; k++) for (let i = 0; i < n; i++) { const x = (l * (i + 0.5)) / n, load = s === front && i % 4 === 1; o.push(load ? { x, y: k * 3.4 + 0.1, w: 1.7, h: 2.5, arch: 'round', fill: ['plank', 0x3a3028, 'tile'], back: 0.7 } : { x, y: k * 3.4 + 1.1, w: 0.95, h: 1.4, arch: 'round', fill: r() < 0.2 ? LIT : PANE }); } return o; });
    kit.gable('slate', 'brick', x0, z0, x1, z1, G + floors * 3.4, 4, { over: 0.2, wcol: col, col: 0xb0b0b0, axis: x1 - x0 > z1 - z0 ? 'x' : 'z' }); kit.at(0, 0, 0, 0, () => kit.solid(x0, z0, x1, z1));
  });
  warehouse(-56, 62, -6, 80, 5, 1770, 0xd8c4b8, 's'); warehouse(6, 62, 54, 80, 5, 1789, 0xc8b8ac, 's'); warehouse(-58, 160, -16, 178, 4, 1793, 0xc8b8ac, 'n');
  { const b = props.bag(); for (const x of [-46, -32.5, -19]) { b.box(WOOD, 0.2, 0.2, 2.2, x + 1.6, G + 16.6, 81); b.rod(PALE, [x + 1.6, G + 16.5, 81.9], [x + 1.6, G + 5, 81.9], 0.02, 4); b.box(BALE, 0.9, 0.7, 0.7, x + 1.6, G + 4.6, 81.9); }
    // bales, casks and coal on the quays
    for (let i = 0; i < 26; i++) b.box(BALE, 1.1, 0.75, 0.8, -52 + (i % 9) * 1.3 + r() * 0.2, G + 0.4 + Math.floor(i / 9) * 0.76, 86 + (i % 2) * 0.9, 0, r() * 0.2, 0);
    for (const [x, z, s] of [[-34, 150, 3.2], [-26, 152, 2.4], [-40, 153, 2], [22, 151, 3], [30, 149, 2.2], [14, 153, 1.8]]) b.ball(COAL, x, G, z, s, s * 0.45, s * 0.8);
    for (let i = 0; i < 8; i++) b.cyl(WOOD, 0.3, 0.3, 0.9, 30 + (i % 4) * 0.75, G + 0.45, 86 + Math.floor(i / 4) * 0.8, 10);
  }

  // ---------- the mills of Ancoats ----------
  const MILLS = [[84, 84, 58, 1798, 0xc8b0a0, 44], [168, 84, 60, 1798, 0xc0aa9c, 40], [78, 22, 62, 1806, 0xb8a498, 48], [170, 22, 68, 1818, 0xa89488, 52], [250, 84, 56, 1824, 0xa08c82, 56]];
  for (const [x, z, len, from, col, tall] of MILLS) kit.during(from, INF, () => kit.at(x, G, z, 0, () => mill(kit, r, len, { col, tall, chimneys, lit: 0.8 })));
  kit.during(1798, INF, () => { for (const [x0, x1] of [[60, 78], [152, 162]]) kit.box('brick', x0, G, 63, x1, G + 3, 63.5, 0xc0aa9c, 'b'); kit.at(0, 0, 0, 0, () => kit.solid(60, 63, 78, 63.5)); });
  // the forest of chimneys beyond: more of them every decade, each with its mill
  for (let i = 0; i < 64; i++) {
    const a = r() * 6.283, d = 340 + r() * 520, x = Math.cos(a) * d * 1.1 + 60, z = Math.sin(a) * d - 20; if (Math.abs(x - RIVER) < 30 || Math.abs(z - CANAL) < 34) continue;
    const from = 1800 + Math.floor((i / 64) ** 0.8 * 38), h = 30 + r() * 30, col = [0xa89488, 0x988678, 0x8a7a70][i % 3];
    kit.during(from, INF, () => { kit.cyl('brick', x, z, G, G + h, 2.4, 1.3, 8, col); if (i % 2 === 0) { const w = 30 + r() * 30, fl = 5 + Math.floor(r() * 3); kit.box('brick', x + 6, G, z - 8, x + 6 + w, G + fl * 3.3, z + 8, col, 'b'); kit.gable('slate', 'brick', x + 6, z - 8, x + 6 + w, z + 8, G + fl * 3.3, 3, { wcol: col, col: 0x909090 }); } });
    chimneys.push({ x, y: G + h + 1, z, size: 3.6, from });
  }

  // ---------- the railway, 1830: viaduct, bridge over the Irwell, Liverpool Road station and its warehouse ----------
  kit.during(1826, INF, () => {
    kit.tag = 'clip';
    for (const z of [12, 26]) kit.along(z === 12 ? -44 : -290, z === 12 ? 12 : 26, z === 12 ? -290 : -44, z, G, (l) => kit.panel('brick', l, DECK + 1, Array.from({ length: Math.floor(l / 11) }, (_, i) => ({ x: 6 + i * 11, y: 0, w: 8.4, h: 5.4, arch: 'round' })), 0.6, 0xb8a498));
    kit.poly('cobble', [[-640, G + DECK, 12], [-44, G + DECK, 12], [-44, G + DECK, 26], [-640, G + DECK, 26]], 0xc8c4bc);
    for (const z of [10.6, 26.8]) kit.along(-620, z, -290, z, -3, (l) => kit.panel('stone', l, 9 + DECK + 1, [{ x: l - 20, y: 0, w: 19, h: 13, arch: 'round' }, { x: l - 44, y: 0, w: 19, h: 13, arch: 'round' }, ...Array.from({ length: 22 }, (_, i) => ({ x: 8 + i * 11.5, y: 9, w: 8.6, h: 5.4, arch: 'round' }))], 0.6, 0xa8a298));
    for (let x = -284.5; x < -46; x += 11) kit.at(0, 0, 0, 0, () => kit.solid(x - 1.3, 12, x + 1.3, 26));
  });
  kit.during(1830, INF, () => {
    // the station: a stuccoed front on Liverpool Road, the platform behind it at the level of the rails
    walls(kit, 'daub', -112, 26, -44, 37, G, 11.5, 0.4, 0xe8e0cc, (s, l) => (s === 's' ? [...Array.from({ length: 9 }, (_, i) => ({ x: 4 + i * 7.5, y: 6.6, w: 1.3, h: 2.6, arch: 'flat', fill: i % 2 ? LIT : PANE })), ...Array.from({ length: 9 }, (_, i) => (i === 4 ? { x: 4 + i * 7.5, y: 0, w: 2.2, h: 3.6, arch: 'round', fill: ['plank', 0x2a1c14, 'tile'], back: 0.7 } : { x: 4 + i * 7.5, y: 1.2, w: 1.3, h: 2.4, arch: 'flat', fill: PANE }))] : []));
    kit.box('stone', -112.4, G + 11.5, 25.6, -43.6, G + 12.2, 37.4, 0xd8d0c0, 'b'); kit.at(0, 0, 0, 0, () => kit.solid(-112, 26, -44, 37));
    walls(kit, 'brick', -40, 2, 36, 30, G, 13, 0.5, 0xb8a498, (s, l) => { const o = [], n = Math.floor(l / 3.6); for (let k = 0; k < 4; k++) for (let i = 0; i < n; i++) o.push({ x: (l * (i + 0.5)) / n, y: k * 3.2 + 1, w: 1, h: 1.5, arch: 'round', fill: r() < 0.25 ? LIT : PANE }); return o; });
    kit.gable('slate', 'brick', -40, 2, 36, 30, G + 13, 4, { wcol: 0xb8a498, col: 0xa8a8a8 }); kit.at(0, 0, 0, 0, () => kit.solid(-40, 2, 36, 30));
  });
  { const b = props.bag(1830, INF); track(b, -640, -44, G + DECK + 0.02, RAILZ); track(b, -640, -44, G + DECK + 0.02, RAILZ + 5); }
  const TR = trainParts(), train = new THREE.InstancedMesh(TR.geo, vehicleMat(), 1); train.frustumCulled = false; train.castShadow = true; group.add(train);
  const crewList = [{ outfit: 'millhand', action: 'stand', x: TR.footplate[0] + 0.2, z: 0.3, rot: 0, y: TR.footplate[1], tint: lin(0x2a2a30) }, { outfit: 'millhand', action: 'stand', x: TR.footplate[0] - 0.3, z: -0.35, rot: 0.4, y: TR.footplate[1], tint: lin(0x3a3028) }];
  TR.seats.forEach(([x, y, z], i) => { if (i % 5 !== 3) crewList.push({ outfit: i % 3 ? (i % 2 ? 'hat' : 'millhand') : 'dress', action: 'sit', x, z, rot: i % 2 ? 0 : Math.PI, y, seat: 0.42 }); });
  const crew = actors({ heightAt: () => 0, sea: -99 }, crewList, { seed: 3 }), crewG = new THREE.Group(); crewG.add(...crew.meshes); group.add(crewG);
  const steam = smoke([{ x: TR.chimney[0], y: TR.chimney[1], z: 0, size: 1.1, dark: 0.25 }], { per: 14, rise: 2.4, wind: [-3.5, 0.6], life: 6, grey: 0.5 }); group.add(steam.mesh);
  const platform = actors({ heightAt: () => G + DECK, sea: -99 }, Array.from({ length: 10 }, (_, i) => ({ outfit: ['hat', 'dress', 'hat', 'millhand', 'dress'][i % 5], action: ['stand', 'talk', 'stand'][i % 3], x: -104 + i * 5.6 + r() * 2, z: 23 + r() * 1.8, rot: 1.57 + (r() - 0.5), u0: Y(1830) })), { seed: 4 }); group.add(...platform.meshes);
  // the navvies who built it
  for (let i = 0; i < 9; i++) P(man(), 'dig', -270 + i * 26 + r() * 6, i % 2 ? 5 + r() * 3 : 31 + r() * 4, ang(), 1826, 1830);
  const barrowPaths = [[[-260, 8], [-60, 8], [-60, 5], [-260, 5], [-260, 8]], [[-280, 33], [-90, 33], [-90, 30], [-280, 30], [-280, 33]]], barrows = [];
  for (let i = 0; i < 6; i++) { const path = barrowPaths[i % 2], ph = i / 6 + r() * 0.1; P(man(), 'push', 0, 0, 0, 1826, 1830, { path, speed: 0.9, phase: ph }); barrows.push({ path, speed: 0.9, phase: ph, ahead: 1.0, u0: Y(1826), u1: Y(1830) }); }
  for (let i = 0; i < 4; i++) walker([[-250 + i * 50, 2], [-240 + i * 50, 10]], 1826, 1830, { outfit: 'millhand', action: 'carry', prop: 'basket', speed: 0.8 });
  // foundations for the second row of mills
  for (let i = 0; i < 6; i++) P(man(), 'dig', 84 + i * 9 + r() * 4, 16 + r() * 10, ang(), 1803, 1806);
  for (let i = 0; i < 2; i++) { const path = [[80, 10], [140, 10], [140, 8], [80, 8], [80, 10]]; P(man(), 'push', 0, 0, 0, 1803, 1806, { path, speed: 0.9, phase: i * 0.5 }); barrows.push({ path, speed: 0.9, phase: i * 0.5, ahead: 1.0, u0: Y(1803), u1: Y(1806) }); }
  const barrow = new Bag(); barrow.box(WOOD, 0.9, 0.3, 0.6, 0.15, 0.55, 0); barrow.ball(fin(0x5a4a38, 1), 0.15, 0.72, 0, 0.4, 0.16, 0.26); for (const s of [1, -1]) barrow.rod(WOOD, [0.7, 0.3, s * 0.12], [-0.9, 0.72, s * 0.3], 0.025, 4).rod(WOOD, [-0.2, 0.45, s * 0.28], [-0.25, 0, s * 0.28], 0.025, 4); barrow.add(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 12).rotateX(Math.PI / 2), WOOD, mat4(0.75, 0.26, 0));
  const barrowMesh = new Followers(world, props.loose(barrow.geo()), props.mat, barrows); group.add(barrowMesh.mesh);

  // ---------- on the water: barges under way and moored ----------
  const bargeBag = new Bag();
  { const hull = new THREE.Shape(); [[-10, -1.9], [8, -2], [10.6, -1], [11.2, 0], [10.6, 1], [8, 2], [-10, 1.9], [-10.8, 0.9], [-10.8, -0.9]].forEach(([x, z], i) => (i ? hull.lineTo(x, z) : hull.moveTo(x, z)));
    bargeBag.add(new THREE.ExtrudeGeometry(hull, { depth: 1.5, bevelEnabled: false }).rotateX(Math.PI / 2), TAR, mat4(0, 0.85, 0)); bargeBag.box(WOOD, 17, 0.06, 3.4, -0.8, 0.5, 0);
    for (const s of [1, -1]) bargeBag.box(RED, 20, 0.12, 0.1, -0.5, 0.9, s * 1.95);
    bargeBag.box(GREENF, 3, 0.9, 2.6, -8, 1.1, 0).box(TAR, 3.2, 0.06, 2.8, -8, 1.58, 0).cyl(IRON, 0.08, 0.08, 0.7, -7.2, 1.9, 0.6, 6); bargeBag.rod(WOOD, [-10.6, 1.2, 0], [-9, 1.75, 0], 0.05, 5).box(WOOD, 0.1, 1.2, 0.5, -10.9, 0.5, 0); bargeBag.rod(WOOD, [7.5, 0.5, 0], [7.5, 2.3, 0], 0.07, 6); }
  const coalLoad = new Bag(); coalLoad.ball(COAL, 0, 0.5, 0, 6, 0.75, 1.5).ball(COAL, -3, 0.5, 0.2, 3, 0.9, 1.4);
  const baleLoad = new Bag(); for (let i = 0; i < 30; i++) baleLoad.box(BALE, 1.2, 0.8, 0.9, -5.5 + (i % 10) * 1.25, 0.9 + Math.floor(i / 20) * 0.82, -0.95 + (Math.floor(i / 10) % 2) * 1.9 - (i >= 20 ? 0.9 : 0) + (i >= 20 ? 0.9 : 0) * 0, 0, 0, 0);
  for (const [x, z, ry, load] of [[-30, 139.5, 0, coalLoad], [26, 139.6, Math.PI, coalLoad], [-30, 100.4, Math.PI, baleLoad], [34, 100.5, 0, null]]) { props.put(bargeBag, x, WATER - 0.55, z, ry); if (load) props.put(load, x, WATER - 0.55, z, ry); }
  const barges = [{ path: [[-296, 117.4], [36, 117.4], [50, 120], [36, 122.6], [-296, 122.6], [-304, 120], [-296, 117.4]], speed: 1.05, phase: 0.05, load: coalLoad }, { path: [[280, 122.6], [-36, 122.6], [-50, 120], [-36, 117.4], [280, 117.4], [290, 120], [280, 122.6]], speed: 1.0, phase: 0.4, load: baleLoad }].map((q) => {
    const full = new Bag(); full.p.push(...bargeBag.p); full.n.push(...bargeBag.n); full.c.push(...bargeBag.c); full.s.push(...bargeBag.s); full.w.push(...bargeBag.w); for (const k of ['p', 'n', 'c', 's', 'w']) full[k].push(...q.load[k]);
    const mesh = new THREE.Mesh(props.loose(full.geo()), props.mat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    const men = actors({ heightAt: () => 0, sea: -99 }, [{ outfit: 'millhand', action: 'stand', x: -9.6, z: 0.5, rot: 0.2, y: 0.53, prop: 'staff', tint: drab() }, { outfit: 'millhand', action: 'fish', x: 8.6, z: -1.1, rot: -1.2, y: 0.53, prop: 'staff', tint: drab() }], { seed: 9 }); mesh.add(...men.meshes);
    return { ...q, P: pathOf(q.path), mesh, men };
  });
  // a horse on the towpath for each, led by a boy
  const towing = barges.map((q, i) => { const z = i ? 130 : 110, x0 = i ? 270 : -290, x1 = i ? -30 : 30, path = [[x0, z], [x1, z], [x1, z + (i ? 2.5 : -2.5)], [x0, z + (i ? 2.5 : -2.5)], [x0, z]], sp = q.speed * (pathOf(path).L / q.P.L); P('millhand', 'herd', 0, 0, 0, 1770, INF, { path, speed: sp, phase: q.phase + 2.6 / pathOf(path).L, s: 0.74 }); return { make: horse, path, speed: sp, phase: q.phase }; });
  // unloading: coal heavers and porters
  for (let i = 0; i < 8; i++) walker([[i < 4 ? -30 : 24, 143.2], [i < 4 ? -34 : 20, 149], [i < 4 ? -50 : 60, 156]], 1770, INF, { outfit: 'millhand', action: 'carry', prop: 'sack', speed: 0.85, tint: lin(0x24242a) });
  for (let i = 0; i < 6; i++) walker([[-36 + i * 2, 97], [-44 + i * 5, 88], [-31, 81.5]], 1770, INF, { outfit: 'millhand', action: 'carry', prop: i % 2 ? 'sack' : 'basket', speed: 0.85 });
  for (const [x, z, rot, act] of [[-12, 96, -1.57, 'point'], [-10.6, 95, 2.2, 'talk'], [40, 96, -1.2, 'stand'], [-62, 145, 1, 'talk'], [-63.4, 146, -2, 'stand']]) P(act === 'point' ? 'hat' : man(), act, x, z, rot, 1770, INF, act === 'point' ? { fine: 1 } : {});
  // the smithy by the basin: chains, horseshoes, boat fittings
  kit.at(74, G, 150, 0, () => { kit.gable('slate', 'brick', 0, 0, 12, 8, 3.2, 2.4, { over: 0.4, wcol: 0xc0aa9c }); walls(kit, 'brick', 0, 0, 12, 0.5, 0, 3.2, 0.3, 0xc0aa9c); kit.box('brick', 1, 0, 1, 3.4, 1, 3.2, 0xb0a094, 'b'); kit.box('brick', 1.6, 1, 1, 2.6, 7, 2, 0xb0a094, 'b'); kit.solid(0, 0, 12, 0.8).solid(1, 1, 3.4, 3.2); });
  { const b = props.bag(); for (const [x, z] of [[74.2, 157.8], [85.8, 157.8]]) b.box(WOOD, 0.22, 3.2, 0.22, x, G + 1.6, z); b.box(EMBER, 1.6, 0.08, 1.4, 76.2, G + 1.04, 152.2); chimneys.push({ x: 76.1, y: G + 7.4, z: 151.5, size: 0.9, from: 1770, dark: 0.8 }); }
  P(man(), 'hammer', 78.6, 153.6, 2.9, 1770, INF); P(man(), 'hammer', 81.5, 155.4, -2.2, 1770, INF); P(man(), 'hammer', 84, 152.4, 2.4, 1790, INF);

  // ---------- mill hands: the walk to the shift, the crowd at the gates when the bell rings ----------
  const hand = (path, from, o = {}) => { const kid = r() < 0.28; walker(path, from, INF, { outfit: late(), speed: 1.25 + r() * 0.3, ...(kid ? { s: 0.6 + r() * 0.14 } : {}), ...o }); };
  for (let i = 0; i < 16; i++) hand([[62 + r() * 3, 46 + r() * 12], [296, 46 + r() * 12]], i < 9 ? 1798 : 1812);
  for (let i = 0; i < 12; i++) hand([[143 + r() * 6, -112], [143 + r() * 6, 40], [150 + r() * 20, 52]], i < 6 ? 1798 : 1815);
  for (let i = 0; i < 12; i++) hand([[58 - r() * 6, 160 + r() * 150], [56 - r() * 4, 148], [62, 104], [62 + r() * 4, 60]].map(([x, z], k) => (k === 0 ? [x, z] : [x, z])).filter(() => true), i < 6 ? 1802 : 1820);
  for (let i = 0; i < 22; i++) { const kid = i % 4 === 1; P(i % 2 ? 'dress' : i % 4 ? 'hat' : 'millhand', ['stand', 'talk', 'stand', 'talk'][i % 4], 144 + (r() - 0.5) * 16, 57 + r() * 5.5, -1.57 + (r() - 0.5) * 1.4, i < 12 ? 1798 : 1816, INF, kid ? { s: 0.6 + r() * 0.12 } : {}); }
  { const b = props.bag(1798, INF); b.box(IRON, 0.12, 5, 0.12, 163, G + 2.5, 63).box(IRON, 0.9, 0.08, 0.08, 162.6, G + 5, 63).cyl(fin(0xb08a34, 0.4, 0.8), 0.12, 0.3, 0.45, 162.2, G + 4.7, 63, 10); }   // the factory bell
  // ---------- streets: walkers, packhorses, carts ----------
  for (let i = 0; i < 26; i++) { const o = (r() - 0.5) * 5, late = i % 3 === 0; walker(i % 2 ? [[-296, -120 + o], [296, -120 + o]] : i % 4 ? [[-30 + o, -326], [-30 + o, 78]] : [[-200 + o, -326], [-200 + o, -24]], late ? 1810 : 1770, late ? INF : i % 3 === 1 ? 1815 : INF, late && i % 2 ? { outfit: 'hat', fine: 1 } : r() < 0.2 ? { action: 'carry', prop: 'basket' } : {}); }
  for (let i = 0; i < 10; i++) { const z = 187 + (i % 6) * 22 + (i % 2 ? 0 : 22); walker([[66 + r() * 10, z], [290, z]], 1803 + (i % 6) * 6, INF, i % 3 === 0 ? { s: 0.62 } : {}); }
  const packPath = [[-296, -118], [-204, -118], [-204, -196], [-180, -196], [-180, -122], [-296, -122], [-296, -118]], packs = [];
  { const pk = new Bag(); for (const s of [1, -1]) { pk.box(BALE, 0.7, 0.5, 0.34, -0.05, 1.3, s * 0.48); pk.ball(SACK, -0.05, 1.62, s * 0.2, 0.36, 0.2, 0.26); } pk.box(fin(0x3a2a1c, 0.8), 0.5, 0.05, 0.9, -0.05, 1.5, 0);
    const geo = props.loose(pk.geo()); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(geo, props.mat); m.castShadow = true; packs.push({ make: horse, path: packPath, speed: 1.1, phase: 0.3, ahead: -i * 3.2, u0: Y(1770), u1: Y(1802), load: m, scale: 0.86 }); } }
  P('millhand', 'herd', 0, 0, 0, 1770, 1802, { path: packPath, speed: 1.1, phase: 0.3 + 2.4 / pathOf(packPath).L }); P('millhand', 'walk', 0, 0, 0, 1770, 1802, { path: packPath, speed: 1.1, phase: 0.3 - 12 / pathOf(packPath).L });
  const cartGeo = cartParts(species(), { horse: false })[0], cartRoutes = [{ path: [[-290, -121.5], [290, -121.5], [290, -118.5], [-290, -118.5], [-290, -121.5]], speed: 1.5, phase: 0.1 }, { path: [[-28.5, -320], [-28.5, 72], [-31.5, 72], [-31.5, -320], [-28.5, -320]], speed: 1.4, phase: 0.55 }, { path: [[70, 49], [290, 49], [290, 53], [70, 53], [70, 49]], speed: 1.4, phase: 0.3, u0: Y(1798) }, { path: [[-60, 150], [58, 150], [58, 153], [-60, 153], [-60, 150]], speed: 1.2, phase: 0.7 }];
  const carts = new Followers(world, cartGeo.geo, cartGeo.mat, cartRoutes); group.add(carts.mesh);

  // ---------- trees and hedges of the country town, most of them gone by the end ----------
  const K = globalThis.__floraKinds || (globalThis.__floraKinds = makeKinds()), woods = [];
  const trees = (kind, n, place, until, size) => { const items = []; for (let i = 0; i < n; i++) { const p = place(); if (!p) continue; const g = 0.7 + r() * 0.3; items.push({ x: p[0], z: p[1], s: size[0] + r() * (size[1] - size[0]), rot: ang(), tint: [g * 0.9, g, g * 0.75] }); } const meshes = grove(world, K[kind], items, { wedges: 4 }); group.add(...meshes); woods.push({ meshes, until }); };
  const open = (x, z) => Math.abs(x - RIVER) > 26 && Math.abs(z - CANAL) > 42, ring = (d0, d1) => () => { const a = ang(), d = d0 + r() * (d1 - d0), x = Math.cos(a) * d, z = Math.sin(a) * d; return open(x, z) ? [x, z] : null; };
  trees('broadleaf', 70, ring(340, 520), 1802, [0.7, 1.3]); trees('elm', 70, ring(420, 700), 1818, [0.7, 1.3]); trees('broadleafB', 80, ring(560, 900), 1832, [0.7, 1.3]); trees('elmB', 60, ring(700, 950), INF, [0.7, 1.2]);
  trees('elmC', 40, () => [60 + r() * 240, r() < 0.5 ? -36 + r() * 110 : 164 + r() * 160], 1796, [0.5, 1.1]);

  // ---------- assemble ----------
  kit.build(group, { clip: (m) => clipped(m, clipY) }); props.build(group);
  const people = actors(world, list, { seed: 11 }); group.add(...people.meshes);
  const horses = new Walkers(world, group, [...towing, ...packs, ...cartRoutes.map((q) => ({ make: horse, path: q.path, speed: q.speed, phase: q.phase, ahead: 2.8, u0: q.u0 }))]);
  const soot = smoke(chimneys, { per: 9, rise: 4.5, wind: [3.4, 1.1], life: 16, grey: 0.045 }); group.add(soot.mesh);
  const hit = kit.collider(); let year = 1800; const o = { x: 0, z: 0, rot: 0 }, _m = new THREE.Matrix4();
  return {
    update(u, t, env, camera, view) {
      year = uToYear(u); eye.x = camera.position.x; eye.z = camera.position.z;
      kit.update(year); props.update(year); clipY.value = year >= 1830 ? 1e6 : G + 0.4 + ((year - 1826) / 4) * (DECK + 1.2);
      people.update(u, t, view); platform.update(u, t); horses.update(u, t); carts.update(u, t); barrowMesh.update(u, t);
      for (const q of barges) { where(q.P, q.phase * q.P.route + q.speed * t, o); q.mesh.position.set(o.x, WATER - 0.55 + 0.03 * Math.sin(t * 0.8 + q.phase * 9), o.z); q.mesh.rotation.y = o.rot; q.men.update(u, t); }
      // the train: in from Liverpool, a wait at the platform, and out again backwards
      const on = year >= 1830; train.visible = crewG.visible = steam.mesh.visible = on;
      if (on) {
        const p = (t / 140) % 1, k = p < 0.42 ? 1 - (1 - p / 0.42) ** 2 : p < 0.6 ? 1 : 1 - ((p - 0.6) / 0.4) ** 2, x = -640 + k * 588;
        train.setMatrixAt(0, _m.makeTranslation(x, G + DECK + 0.12, RAILZ)); train.instanceMatrix.needsUpdate = true;
        crewG.position.set(x, G + DECK + 0.12, RAILZ); crew.update(u, t);
        steam.mesh.position.set(x, G + DECK + 0.12, RAILZ); steam.U.uWind.value.x = p < 0.42 ? -5 * (1 - k) - 0.6 : p < 0.6 ? 0.5 : 4 * ((p - 0.6) / 0.4); steam.update(year, t, group.parent);
      }
      soot.U.uAmount.value = 0.75 + 0.25 * smooth((year - 1800) / 30); soot.update(year, t, group.parent);
      for (const w of woods) { const on = year < w.until; for (const m of w.meshes) m.visible = on; }
    },
    collide(pos) { hit(pos, year); },
  };
}

export default {
  place: 'Manchester · England', coords: [53.48, -2.24],
  terrain: { base, relief: () => 0, bounds: { x: 300, z: 330 }, tint: (x, z, b) => (b < 5.6 ? 0.75 : 1) },
  spawn: { x: -135, z: -165, yaw: 0 },
  env(year, env) {
    const k = smooth((year - 1782) / 52), set = (h, o) => hexA(h, o, 1);   // how far the smoke has closed in
    set(0x5f8fc4, env.top); set(0xc8d8de, env.hor); set(0x6f7c50, env.ground); set(0x55603f, env.far); set(0x4a5a50, env.water); set(0xffeccc, env.sun); set(0xf0ece4, env.cloudCol);
    hexA(0x77705c, env.top, k * 0.92); hexA(0xb9a67c, env.hor, k); hexA(0x5a564a, env.ground, 0.25 + k * 0.75); hexA(0x403c34, env.far, k); hexA(0x3a3a30, env.water, k); hexA(0xffb878, env.sun, k); hexA(0x9c8c70, env.cloudCol, k);
    env.sea = WATER; env.hill = 1; env.ice = -60; env.precip = 0; env.glow = 0; env.meteor = 0; env.exposure = 1; hexA(0, env.lava, 1);
    env.cloud = 0.5 + 0.35 * k; env.fogD = 0.0016 + 0.0052 * k; env.sunEl = 0.5 - 0.2 * k; env.sunI = 1.9 - 0.75 * k; env.amb = 1 - 0.1 * k; env.bloom = 0.25 + 0.2 * k;
    const out = Math.max(Math.abs(eye.x) - 310, Math.abs(eye.z) - 300, year < 1797 && eye.x > 70 && eye.z < 84 && eye.z > -40 ? 30 : -99, year < 1800 && eye.x > 64 && eye.z > 164 ? 30 : -99, year < 1826 && eye.x < -34 && eye.z > -18 && eye.z < 56 ? 30 : -99);
    env.grass = 0.75 * smooth(out / 30 + 1);
  },
  events: [
    { y: 1770, t: 'A town of weavers', h: 'A market town of some 25,000 on the Irwell. In the long top-floor windows hand-looms clack; cloth dries on tenter frames; packhorses carry it away. The Duke of Bridgewater’s canal has halved the price of coal.', w: 'New York is a colonial port of about 22,000 people, grumbling about taxes on tea and paper.' },
    { y: 1776, t: 'Water frames and steam', h: 'Arkwright’s spinning frames have moved thread-making out of the cottage, and James Watt’s first engines are at work. The weavers have never had so much yarn.', w: 'In New York a quarter of the city burns in September 1776, days after the British army takes it. They will stay seven years.' },
    { y: 1783, t: 'The first mill', h: 'Arkwright builds a five-storey cotton mill at Shudehill, with a steam engine to lift water back over its wheel. More canal warehouses rise at Castlefield.', w: 'The last British troops sail out of New York in November 1783. Half the town is still in ruins.' },
    { y: 1798, t: 'Ancoats', h: 'Steam now turns the spindles directly. Seven-storey mills go up along the canal in Ancoats, lit by gas within a few years, and rows of back-to-back houses fill the fields around them.', w: 'New York has 60,000 people and yellow fever most summers. It has just lost the federal government to Philadelphia.' },
    { y: 1811, t: 'Bell and shift', h: 'About 90,000 people. The mill bell sets the day: fourteen hours, children among the adults. Machine-breakers are abroad in the north, and the hand-loom weavers are starving slowly.', w: 'In New York the commissioners publish their plan of 1811: a grid of numbered streets and avenues laid over the whole island, hills and all.' },
    { y: 1819, t: 'Peterloo', h: 'On 16 August 1819 some 60,000 people gather on St Peter’s Field to ask for the vote. Cavalry ride into them: about eighteen are killed and hundreds hurt. The mills do not stop.', w: 'In New York the grid is being cut street by street. Steamboats work the Hudson, and the first has just crossed the Atlantic.' },
    { y: 1825, t: 'Chimneys', h: 'More than a hundred steam mills, and power looms beside the spinning. Visitors count the chimneys and cannot see the far side of the town for smoke.', w: 'The Erie Canal opens in October 1825, joining New York to the Great Lakes. Within a decade it is the largest city in the Americas.' },
    { y: 1830, t: 'The railway', h: 'The Liverpool and Manchester Railway opens on 15 September 1830: steam locomotives on a double track, to a timetable, over a viaduct into Liverpool Road station. A government minister is run down and killed on the first day.', w: 'New York has 200,000 people. Its first railroad, a mile of horse-drawn track, opens two years later.' },
    { y: 1838, t: 'Shock city', h: 'A quarter of a million people, the sky yellow-grey at noon, the rivers black. Life is short in the back-to-backs, and Manchester’s cloth is worn on every continent.', w: 'New York passes 300,000 and is digging an aqueduct forty miles long to bring in clean water. Its own factories and tenements are coming.' },
  ],
  build,
};
