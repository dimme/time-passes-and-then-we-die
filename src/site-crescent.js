// The Fertile Crescent at Jericho, 9600 – 4000 BCE: a spring under dry hills, and the first people who stayed
// in one place to grow their food. Round houses and a stone tower first; later square houses, herds and pots.
import * as THREE from 'three';
import { rng, smooth } from './util.js';
import { yearToU, uToYear } from './timeline.js';
import { actors } from './people-actors.js';
import { Shape, field, sheaf, heap, pot, ladder, house, Solids, kinds, planted, lin, shade, local } from './site-crescent-kit.js';
import { livestock, standing, drove } from './site-crescent-animals.js';

const FLAT = 3, SEA = 2.1;
const V = [-70, -125], VR = 58, GATE = 0.9;          // the village, the radius of its wall, the bearing of its gate
const POOL = [-80, -35], FLOOR = [4, -68.5];         // the spring, the threshing floor
const STREAM = [[-66, -27], [-20, -2], [30, 12], [90, 22], [160, 40], [250, 46]];
const X0 = -38, Z0 = -108, CW = 21, CD = 16.5;       // the grid of plots, with a lane on the west and north of each cell
const SPAWN = { x: 22, z: -6, yaw: 0.66 };

const wob = (x, z) => Math.sin(x * 0.013 + 1.7) * Math.cos(z * 0.011 + 0.3) + 0.5 * Math.sin(x * 0.031 + z * 0.027 + 2);
function base(x, z) {
  let h = FLAT;
  const dp = Math.hypot(x - POOL[0], z - POOL[1]); if (dp < 26) h -= 3 * smooth(1 - dp / 26);
  return h + 8 * smooth((Math.abs(z) - 850) / 300);
}
function relief(x, z) {
  let h = 0;
  const w = -x - 240; if (w > 0) h += 150 * smooth(w / 560) ** 1.2 * (1 + 0.3 * wob(x, z)) + 14 * smooth(w / 80) * Math.abs(Math.sin(z * 0.012 + Math.sin(x * 0.01) * 1.5));   // the scarp of the Judean hills, cut by wadis
  const e = x - 720; if (e > 0) h += 90 * smooth(e / 280) * (1 + 0.25 * wob(z, x));                                                                                         // the hills of Moab across the valley
  const d = Math.hypot(x + 20, z + 40); if (d > 260) h += 1.3 * smooth((d - 260) / 150) * (1 + wob(x * 3, z * 3));
  return Math.max(0, h + (h > 6 ? 3.2 * Math.sin(h * 0.33 + wob(x * 2, z * 2)) * smooth((h - 6) / 20) : 0));   // ledges of harder rock
}
const distSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const toStream = (x, z) => { let d = 1e9; for (let i = 0; i < STREAM.length - 1; i++) d = Math.min(d, distSeg(x, z, STREAM[i], STREAM[i + 1])); return d; };
const set = (c, r, g, b) => { c[0] = r; c[1] = g; c[2] = b; };

const Y = yearToU;
const MUD = lin(0xb89a70), MUD2 = lin(0xa88a62), LIME = lin(0xd8d0bc), CLAY = lin(0xa8683c), STONE = lin(0xc0b49c), STRAW = lin(0xd8b45c), TIMBER = lin(0x6a4c30), WATER = lin(0x2c5650);

function build({ world, group }) {
  const r = rng(9600), H = (x, z) => world.heightAt(x, z), K = kinds(), L = livestock();
  const solids = new Solids(), people = [], herds = [], walkers = [];
  const P = (outfit, action, x, z, rot = 0, o = {}) => people.push({ outfit: o.s && o.s < 0.75 ? 'neolithic-f' : outfit, action, x, z, rot, ...o });   // children wear the plain tunic (and no beard)
  const mf = () => (r() < 0.5 ? 'neolithic' : 'neolithic-f'), M = 'neolithic', F = 'neolithic-f';
  const sub = (from, to) => { const g = new THREE.Group(); g.userData = { u0: from === undefined ? -Infinity : Y(from), u1: to === undefined ? Infinity : Y(to) }; group.add(g); return g; };
  const always = sub(), early = sub(undefined, -7600), late = sub(-7600), herding = sub(-8200), grown = sub(-8200), pots = sub(-7000), cows = sub(-6800), works = sub(-8500, -8300), walls = sub(-8500);
  const S = new Shape(), SA = new Shape(), SB = new Shape(), SH = new Shape(), SG = new Shape(), SP = new Shape(), SC = new Shape(), SW = new Shape(), SK = new Shape();

  // ---------- the spring and its stream ----------
  for (let i = 0; i < STREAM.length - 1; i++) {
    const a = STREAM[i], b = STREAM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l, n = Math.ceil(l / 6);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, f0 = (i + t0) / (STREAM.length - 1), f1 = (i + t1) / (STREAM.length - 1), w0 = 1.3 - 0.9 * f0, w1 = 1.3 - 0.9 * f1;
      const p = (t, w, y) => [[a[0] + dx * t + nx * w, FLAT + y, a[1] + dz * t + nz * w], [a[0] + dx * t - nx * w, FLAT + y, a[1] + dz * t - nz * w]];
      const [l0, r0] = p(t0, w0, 0.06), [l1, r1] = p(t1, w1, 0.06), [L0, R0] = p(t0, w0 + 0.7, 0.03), [L1, R1] = p(t1, w1 + 0.7, 0.03);
      S.quad('water', l0, l1, r1, r0, WATER, null, [0, 1, 0]).quad('earth', L0, L1, R1, R0, lin(0x8a7455), [f0 * 60, 0], [0, 1, 0]);
    }
  }
  // the threshing floor: trodden earth and plaster, ringed with stones
  S.lathe('plaster', FLOOR[0], FLAT, FLOOR[1], [[7, 0], [6.9, 0.06]], 28, { col: lin(0xcdbf9f), cap: 'plaster' });
  for (let k = 0; k < 40; k++) { const a = (k / 40) * 6.283; S.lathe('stone', FLOOR[0] + Math.cos(a) * 7.1, FLAT - 0.1, FLOOR[1] + Math.sin(a) * 7.1, [[0.3, 0], [0.27, 0.22], [0.1, 0.33]], 5, { col: shade(STONE, 0.8 + r() * 0.3) }); }
  for (let k = 0; k < 16; k++) { const a = r() * 6.283, d = 1 + r() * 4; S.lathe('reed', FLOOR[0] + Math.cos(a) * d, FLAT + 0.05, FLOOR[1] + Math.sin(a) * d, [[0.8, 0], [0.6, 0.1], [0.05, 0.16]], 7, { col: shade(STRAW, 0.8 + r() * 0.3), sx: 1.5, rot: r() * 3 }); }   // corn spread to be beaten
  heap(S, FLOOR[0] + 8.5, FLAT, FLOOR[1] - 3, 1.5, 0.9, STRAW); heap(S, FLOOR[0] + 9, FLAT, FLOOR[1] + 2, 1.1, 0.6, lin(0xe0d0a0));
  for (let k = 0; k < 9; k++) sheaf(S, FLOOR[0] - 8.5 - (k % 3) * 0.7, FLAT, FLOOR[1] - 2 + ((k / 3) | 0) * 0.8, r, 1.1);
  solids.circle(FLOOR[0] + 8.5, FLOOR[1] - 3, 1.2);
  // round bins of mud and straw for the grain, on stone footings
  const bin = (Sx, x, z, s = 1) => { Sx.lathe('stone', x, FLAT - 0.1, z, [[0.75 * s, 0], [0.72 * s, 0.3]], 9, { col: STONE }); Sx.lathe('plaster', x, FLAT + 0.2, z, [[0.68 * s, 0], [0.8 * s, 0.6 * s], [0.7 * s, 1.2 * s], [0.42 * s, 1.5 * s], [0.02, 1.62 * s]], 10, { col: shade(MUD, 0.9 + r() * 0.2) }); solids.circle(x, z, 0.7 * s); };
  for (let k = 0; k < 4; k++) bin(S, FLOOR[0] - 3 + k * 2.1, FLOOR[1] - 10.5, 1 + (k % 2) * 0.15);

  // ---------- the fields ----------
  const plots = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 15; j++) {
    const cx = X0 + CW * i + CW / 2 + 1, cz = Z0 + CD * j + CD / 2 + 1;
    if (Math.hypot(cx - V[0], cz - V[1]) < VR + 22 || Math.hypot(cx - POOL[0], cz - POOL[1]) < 34 || Math.hypot(cx - FLOOR[0], cz - FLOOR[1]) < 19 || toStream(cx, cz) < 11.5) continue;
    if (Math.hypot(cx - SPAWN.x, cz - SPAWN.z) < 9 || (i > 7 && j < 2) || r() < 0.06) continue;
    plots.push({ i, j, cx, cz, far: Math.hypot(cx - POOL[0], cz - POOL[1]) > 150 });
  }
  const STAGES = ['ripe', 'ripe', 'ripe', 'green', 'green', 'ploughed', 'ploughed', 'stubble', 'sown', 'fallow'];
  for (const p of plots) { p.stage = STAGES[(r() * STAGES.length) | 0]; p.cut = p.stage === 'ripe' && r() < 0.6 ? 0.25 + r() * 0.45 : 0; }
  const near = (x, z, stage, cut = 0) => { let b = null; for (const p of plots) if (!p.fix && (!b || Math.hypot(p.cx - x, p.cz - z) < Math.hypot(b.cx - x, b.cz - z))) b = p; if (b) { b.stage = stage; b.cut = cut; b.fix = true; } };
  near(SPAWN.x - 12, SPAWN.z - 16, 'ripe', 0.45); near(SPAWN.x + 14, SPAWN.z - 12, 'ploughed'); near(SPAWN.x - 20, SPAWN.z + 6, 'green'); near(SPAWN.x + 4, SPAWN.z + 16, 'ripe', 0.6); near(SPAWN.x + 22, SPAWN.z + 8, 'stubble');
  let carriers = 0;
  for (const p of plots) {
    const turn = r() < 0.3, w = (turn ? CD : CW) - 4 - r() * 1.5, d = (turn ? CW : CD) - 4 - r() * 1.5, rot = (turn ? Math.PI / 2 : 0) + (r() - 0.5) * 0.06, Sx = p.far ? SG : S, t = p.far ? { u0: Y(-8200) } : {};
    const f = field(Sx, r, p.cx, p.cz, w, d, rot, FLAT, p.stage, { cut: p.cut });
    const at = (px, pz) => f.at(px, pz);
    if (p.stage === 'ripe' && p.cut) {   // reapers working into the standing corn, the cut sheaves behind them
      const n = 3 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++) { const q = at(f.cutX - 0.5 - r() * 0.25, -d / 2 + (d * (k + 0.5)) / n + (r() - 0.5) * 0.6); P(mf(), 'reap', q[0], q[1], rot + (r() - 0.5) * 0.2, t); }
      { const q = at(f.cutX - 2.5, (r() - 0.5) * d * 0.5); P(F, 'crouch', q[0], q[1], rot + 2.5, t); sheaf(Sx, ...at(f.cutX - 3.2, (r() - 0.5) * d * 0.5).flatMap((v, k) => (k ? [v] : [v, FLAT])), r); }   // binding sheaves
      if (carriers < 6 && !p.far) {   // and somebody carrying them along the lanes to the threshing floor
        carriers++; const lx = X0 + CW * p.i + (p.cx < FLOOR[0] ? CW : 0), lz = Z0 + CD * 3 + 0.2;
        P(mf(), 'carry', lx, p.cz, 0, { path: [[lx, p.cz], [lx, lz], [FLOOR[0] - 5, lz], [FLOOR[0] - 7.5, FLOOR[1] + 4]], prop: 'basket', ...t });
      }
    } else if (p.stage === 'ploughed') {
      if (r() < 0.55) { const n = 2 + ((r() * 3) | 0); for (let k = 0; k < n; k++) { const q = at(-w / 2 + 2 + r() * (w - 5) * 0.3 + k * 1.1, -d / 2 + (d * (k + 0.5)) / n); P(r() < 0.7 ? M : F, r() < 0.7 ? 'hoe' : 'dig', q[0], q[1], rot + (r() - 0.5) * 0.3, t); } }
      else for (let k = 0; k < 2; k++) { const pz = -d / 2 + 2 + r() * (d - 4), a = at(-w / 2 + 1, pz), b = at(w / 2 - 1, pz); P(F, 'sow', a[0], a[1], 0, { path: [a, b], ...t }); }
    } else if (p.stage === 'green' && r() < 0.6) { for (let k = 0; k < 2; k++) { const q = at((r() - 0.5) * w * 0.7, (r() - 0.5) * d * 0.7); P(mf(), 'crouch', q[0], q[1], r() * 6, t); } }   // weeding
    else if (p.stage === 'sown' && r() < 0.5) { const q = at(0, 0); P(M, 'stand', q[0], q[1], r() * 6, { s: 0.62, prop: 'staff', ...t }); }   // a child keeping the birds off
    else if (p.stage === 'stubble') { p.goats = [at(-w / 4, -d / 5), at(w / 5, d / 4), at(w / 3, -d / 4)]; if (r() < 0.6) { const q = at(0, d / 4); P(F, 'crouch', q[0], q[1], r() * 6, t); } }
  }

  // ---------- threshing, winnowing, grinding ----------
  for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.283 + 0.3; P(M, 'thresh', FLOOR[0] + Math.cos(a) * 3.2, FLOOR[1] + Math.sin(a) * 3.2, Math.PI - a + (r() - 0.5) * 0.3); }
  P(F, 'trade', FLOOR[0] + 6.8, FLOOR[1] - 2.2, 0.4); P(F, 'trade', FLOOR[0] + 7.6, FLOOR[1] + 1.4, -0.3);   // winnowing: tossing the grain for the wind to clean
  P(F, 'crouch', FLOOR[0] + 7.4, FLOOR[1] - 4.6, 1.2);
  for (let k = 0; k < 3; k++) P(F, 'grind', FLOOR[0] - 4 + k * 2.4, FLOOR[1] - 8.3, -Math.PI / 2 + (r() - 0.5) * 0.3);
  P(M, 'stand', FLOOR[0] - 6, FLOOR[1] - 7, 0.5, { s: 0.6 }); P(M, 'talk', FLOOR[0] + 1, FLOOR[1] + 8.2, 1.2); P(M, 'stand', FLOOR[0] + 2.2, FLOOR[1] + 8.6, 2.6, { prop: 'staff' });
  const gate = [V[0] + Math.cos(GATE) * VR, V[1] + Math.sin(GATE) * VR], inGate = [V[0] + Math.cos(GATE) * (VR - 14), V[1] + Math.sin(GATE) * (VR - 14)], outGate = [V[0] + Math.cos(GATE) * (VR + 6), V[1] + Math.sin(GATE) * (VR + 6)];
  for (let k = 0; k < 3; k++) P(mf(), 'carry', 0, 0, 0, { path: [[FLOOR[0] - 4, FLOOR[1] - 6.5], [FLOOR[0] - 12, FLOOR[1] - 8], outGate, inGate], prop: k === 1 ? 'sack' : 'basket', phase: k / 3 });

  // ---------- water ----------
  for (let k = 0; k < 4; k++) { const a = -0.5 + k * 0.42, d = 21.5; P(F, 'fetch-water', POOL[0] + Math.cos(a) * d, POOL[1] + Math.sin(a) * d, Math.PI - a, { prop: k % 2 ? 'waterskin' : 'bucket' }); }
  for (let k = 0; k < 3; k++) P(F, 'fetch-water', 0, 0, 0, { path: [[POOL[0] + 21, POOL[1] - 6], [-52, -60], outGate, inGate], prop: 'waterskin', phase: k / 3, u1: Y(-7000) });
  for (let k = 0; k < 3; k++) P(F, 'carry', 0, 0, 0, { path: [[POOL[0] + 21, POOL[1] - 6], [-52, -60], outGate, inGate], prop: 'jar', phase: k / 3, u0: Y(-7000) });
  for (let k = 0; k < 4; k++) { const a = 2.2 + k * 0.5; P(M, k % 2 ? 'stand' : 'walk', POOL[0] + Math.cos(a) * 24, POOL[1] + Math.sin(a) * 24, r() * 6, { s: 0.55 + r() * 0.12, path: k % 2 ? undefined : [[POOL[0] + Math.cos(a) * 24, POOL[1] + Math.sin(a) * 24], [POOL[0] + Math.cos(a + 0.5) * 27, POOL[1] + Math.sin(a + 0.5) * 27]], speed: 1.8 }); }   // children by the water
  // mud bricks: a pit by the spring, rows of loaves drying in the sun
  const YARD = [-112, -20];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) if (r() < 0.85) S.lathe('plaster', YARD[0] + i * 0.55 + (r() - 0.5) * 0.08, FLAT, YARD[1] + j * 0.9, [[0.2, 0], [0.19, 0.07], [0.1, 0.11]], 6, { col: shade(MUD2, 0.85 + r() * 0.3), sx: 1, rot: 0 });
  heap(S, YARD[0] - 3, FLAT, YARD[1] + 2, 1.6, 0.7, lin(0x7a6040)); heap(S, YARD[0] - 2.4, FLAT, YARD[1] - 1.6, 0.9, 0.5, STRAW);
  P(M, 'dig', YARD[0] - 5, YARD[1] + 2.4, 0); P(M, 'crouch', YARD[0] - 0.8, YARD[1] + 1.2, 0); P(F, 'crouch', YARD[0] - 0.8, YARD[1] + 3.4, 0.3); P(M, 'carry', 0, 0, 0, { path: [[YARD[0] + 2, YARD[1] - 2], [-70, -52], outGate, inGate], prop: 'basket' });
  P(F, 'fetch-water', YARD[0] - 3, YARD[1] + 5, -1.2, { path: [[YARD[0] - 3, YARD[1] + 5], [POOL[0] - 20, POOL[1] + 6]], prop: 'bucket' });

  // ---------- the wall and the tower ----------
  const g0 = GATE + 3.2 / VR, g1 = GATE - 3.2 / VR + Math.PI * 2;
  SW.lathe('stone', V[0], FLAT - 0.4, V[1], [[VR + 1.0, 0], [VR + 0.75, 4], [VR - 0.75, 4], [VR - 0.9, 0]], 120, { a0: g0, a1: g1, col: STONE });
  for (const [a, flip] of [[g0, 0], [g1, 1]]) { const c = Math.cos(a), s = Math.sin(a), p = (rr, h) => [V[0] + c * rr, FLAT - 0.4 + h, V[1] + s * rr], q = [p(VR + 1, 0), p(VR - 0.9, 0), p(VR - 0.75, 4), p(VR + 0.75, 4)]; flip ? SW.quad('stone', q[0], q[1], q[2], q[3], STONE) : SW.quad('stone', q[1], q[0], q[3], q[2], STONE); }
  const TW = [V[0] - VR + 6.5, V[1]];
  SW.lathe('stone', TW[0], FLAT - 0.4, TW[1], [[4.6, 0], [4.35, 3], [3.9, 6.5], [3.5, 8.9]], 28, { col: shade(STONE, 0.95), cap: 'stone' });
  SW.lathe('plain', TW[0], FLAT + 8.52, TW[1], [[0.55, 0], [0.01, 0.0]], 8, { col: lin(0x14100c) });   // the head of the stair inside
  { const p = (dz, h) => [TW[0] + 4.56 - h * 0.085, FLAT + h, TW[1] + dz]; SW.quad('plain', p(0.4, 0), p(-0.4, 0), p(-0.4, 1.5), p(0.4, 1.5), lin(0x14100c)); SW.beam('stone', p(0.7, 1.62), p(-0.7, 1.62), 0.16, 0.16, 5, shade(STONE, 0.8)); }   // the low door at its foot
  solids.circle(TW[0], TW[1], 4.6, Y(-8500));
  // while it is being raised: stone heaps, carriers, men dragging blocks
  for (let k = 0; k < 6; k++) heap(SK, TW[0] + 9 + r() * 8, FLAT, TW[1] - 6 + r() * 12, 0.8 + r() * 0.8, 0.5 + r() * 0.4, shade(STONE, 0.8 + r() * 0.3), 'stone');
  for (let k = 0; k < 6; k++) P(M, 'carry', 0, 0, 0, { path: [[TW[0] + 12, TW[1] + (k - 3) * 2], [TW[0] + 6, TW[1] + (k - 3) * 0.8]], prop: 'basket', phase: r(), u0: Y(-8500), u1: Y(-8300) });
  for (let k = 0; k < 3; k++) P(M, 'haul', 0, 0, 0, { path: [[inGate[0] - 4, inGate[1] - 2 + k], [TW[0] + 14, TW[1] + 6 + k]], phase: k * 0.3, u0: Y(-8500), u1: Y(-8300) });
  for (let k = 0; k < 4; k++) { const a = -1 + k * 0.6; P(M, k % 2 ? 'crouch' : 'dig', TW[0] + Math.cos(a) * 5.6, TW[1] + Math.sin(a) * 5.6, Math.PI - a, { u0: Y(-8500), u1: Y(-8300) }); }

  // ---------- the village ----------
  const inWall = (x, z, m) => Math.hypot(x - V[0], z - V[1]) < VR - m, lane = (x, z) => distSeg(x, z, gate, V);
  const place = (list, rad, tries = 60) => {
    for (let t = 0; t < tries; t++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * (VR - 4 - rad), x = V[0] + Math.cos(a) * d, z = V[1] + Math.sin(a) * d;
      if (!inWall(x, z, rad + 3) || lane(x, z) < rad + 1.6 || Math.hypot(x - TW[0], z - TW[1]) < rad + 8) continue;
      if (list.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + rad + 0.9)) continue;
      const it = { x, z, r: rad }; list.push(it); return it;
    }
    return null;
  };
  const yards = (list, n) => { const out = []; for (let t = 0; t < 4000 && out.length < n; t++) { const it = place([...list, ...out], 1.5, 1); if (it) out.push(it); } return out; };
  // round houses of hog-backed mud brick on stone footings, roofed with reed and mud (9600 – 7600 BCE)
  const round = [];
  for (let k = 0; k < 52; k++) {
    const R = 2.0 + r() * 0.9, it = place(round, R + 0.5); if (!it) continue;
    const { x, z } = it, door = Math.atan2(V[1] - z, V[0] - x) + (r() - 0.5) * 1.6, gap = 0.5 / R, a0 = door + gap, a1 = door - gap + Math.PI * 2, c = shade(MUD, 0.85 + r() * 0.3);
    SA.lathe('stone', x, FLAT - 0.2, z, [[R + 0.14, 0], [R + 0.1, 0.6]], 14, { a0, a1, col: shade(STONE, 0.9) });
    SA.lathe('plaster', x, FLAT + 0.4, z, [[R + 0.06, 0], [R - 0.02, 1.5]], 14, { a0, a1, col: c });
    SA.lathe('plaster', x, FLAT + 1.55, z, [[R + 0.02, 0], [R - 0.02, 0.35]], 4, { a0: door - gap, a1: door + gap, col: c });
    SA.lathe('plain', x, FLAT, z, [[R - 0.3, 0], [R - 0.3, 1.6]], 3, { a0: door - gap * 1.3, a1: door + gap * 1.3, col: lin(0x16110c) });
    { const p = (a, h) => [x + Math.cos(a) * (R + 0.08), FLAT + h, z + Math.sin(a) * (R + 0.08)]; SA.beam('wood', p(door - gap * 1.4, 1.6), p(door + gap * 1.4, 1.6), 0.07, 0.07, 5, TIMBER); }
    SA.lathe('reed', x, FLAT + 1.72, z, [[R + 0.5, 0], [R + 0.2, 0.22], [R * 0.72, 0.62], [R * 0.36, 0.9], [0.02, 1.0]], 14, { col: shade(lin(0xb09a68), 0.8 + r() * 0.3) });
    solids.circle(x, z, R + 0.1, -Infinity, Y(-7600)); it.r = R + 0.5;
  }
  for (let k = 0; k < 12; k++) { const it = place(round, 1.0); if (it) { bin(SA, it.x, it.z, 0.9 + r() * 0.3); solids.list.pop(); solids.circle(it.x, it.z, 0.7, -Infinity, Y(-7600)); } }
  // square houses with plastered floors, flat roofs and yards (after 7600 BCE)
  const square = [];
  for (let k = 0; k < 38; k++) {
    const w = 5 + r() * 2.6, d = 3.8 + r() * 1.6, h = 2.4 + r() * 0.6, it = place(square, Math.hypot(w, d) / 2 + 0.3); if (!it) continue;
    const rot = ((r() * 2) | 0) * Math.PI / 2 + (r() - 0.5) * 0.25 + 0.3, c = shade(r() < 0.25 ? LIME : MUD, 0.85 + r() * 0.25);
    house(SB, r, it.x, FLAT, it.z, w, d, h, rot, { col: c, door: (r() * 4) | 0 }); it.h = h; it.w = w; it.d = d; it.rot = rot;
    solids.box(it.x, it.z, w, d, rot, Y(-7600));
    if (r() < 0.4) { const q = local(it.x, it.z, rot, w / 2 + 1.0, (r() - 0.5) * d * 0.5); ladder(SB, q[0], FLAT, q[1], h + 0.3, rot + Math.PI); }
    if (r() < 0.5) for (let j = 0; j < 3; j++) { const q = local(it.x, it.z, rot, (r() - 0.5) * (w - 1.6), (r() - 0.5) * (d - 1.6)); r() < 0.5 ? heap(SB, q[0], FLAT + h, q[1], 0.45, 0.25, STRAW) : pot(SP, q[0], FLAT + h, q[1], 'jar', shade(CLAY, 0.8 + r() * 0.4), 0.8); }
  }
  for (let k = 0; k < 8; k++) { const it = place(square, 1.0); if (it) { bin(SB, it.x, it.z, 1 + r() * 0.3); solids.list.pop(); solids.circle(it.x, it.z, 0.75, Y(-7600)); } }

  // life between the houses
  const scenes = (spots, t, lateToo) => {
    spots.forEach((s, k) => {
      const { x, z } = s, a = r() * 6.283, at = (d, da = 0) => [x + Math.cos(a + da) * d, z + Math.sin(a + da) * d], face = (da) => Math.PI - (a + da), kind = k % 9;
      const Q = (outfit, action, d, da, o = {}) => { const q = at(d, da); P(outfit, action, q[0], q[1], face(da), { ...t, ...o }); };
      if (kind === 0 || kind === 5) { Q(F, 'cook', 0.9, 0); Q(mf(), 'sit', 1.3, 2.2); Q(M, 'sit', 1.3, 4.1, { s: 0.6 }); }
      else if (kind === 1) { Q(F, 'grind', 0.8, 0); Q(F, 'grind', 0.8, 3.14); }
      else if (kind === 2) { Q(M, 'knap', 0.7, 0); Q(M, 'sit', 1.0, 2.6); }
      else if (kind === 3) { Q(M, 'scrape', 0.7, 0); Q(F, 'spin', 1.4, 2.4); }
      else if (kind === 4) { Q(mf(), 'talk', 0.7, 0); Q(mf(), 'stand', 0.7, 3.14); Q(M, 'stand', 1.3, 1.5, { s: 0.58 }); }
      else if (kind === 6) { if (lateToo) { Q(F, 'weave', 0.6, 0, { u0: Y(-6500) }); Q(F, 'spin', 1.3, 2.6, { u0: Y(-6500) }); } else { Q(M, 'sleep', 0.4, 0); Q(F, 'sit', 1.2, 2); } }
      else if (kind === 7) {
        if (lateToo) {   // potters building jars from coils of clay, a firing pit beside them
          for (const da of [0, 2.1, 4.2]) { Q(F, 'potter', 1.25, da, { prop: 'none', seat: 0, u0: Y(-7000) }); const q = at(0.8, da); pot(SP, q[0], FLAT, q[1], 'jar', shade(CLAY, 0.9 + r() * 0.2), 0.62); }
          for (let j = 0; j < 7; j++) { const q = at(2.2 + r() * 0.8, 1 + r() * 4); pot(SP, q[0], FLAT, q[1], r() < 0.5 ? 'jar' : 'bowl', shade(CLAY, 0.7 + r() * 0.5), 0.7 + r() * 0.4); }
        } else { Q(M, 'knap', 0.7, 0); Q(M, 'crouch', 0.9, 3); }
      } else { Q(M, 'walk', 0, 0, { s: 0.6, path: [at(1.4, 0), at(1.4, 2), at(1.4, 4), at(1.4, 0)], speed: 2.2 }); Q(F, 'stand', 0.3, 0, { s: 0.55 }); }
    });
  };
  scenes(yards(round, 26), { u1: Y(-7600) }, false);
  scenes(yards(square, 30), { u0: Y(-7600) }, true);
  // people on the roofs, where the work and the sleeping are done
  square.filter((s) => s.h).slice(0, 9).forEach((s, k) => { const q = local(s.x, s.z, s.rot, (r() - 0.5) * (s.w - 2.4), (r() - 0.5) * (s.d - 2.4)); P(k % 3 ? F : M, ['sit', 'spin', 'sleep', 'stand'][k % 4], q[0], q[1], r() * 6, { y: s.h, u0: Y(-7600) }); });
  for (let k = 0; k < 4; k++) P(mf(), 'walk', 0, 0, 0, { path: [outGate, inGate, [V[0] + (r() - 0.5) * 8, V[1] + (r() - 0.5) * 8]], phase: r() });

  // ---------- pens and herds ----------
  const pen = (Sx, x, z, R, open) => { Sx.lathe('stone', x, FLAT - 0.2, z, [[R + 0.45, 0], [R + 0.3, 1.25], [R - 0.3, 1.25], [R - 0.45, 0]], 36, { a0: open + 1.1 / R, a1: open - 1.1 / R + 6.2832, col: shade(STONE, 0.85) }); };
  const PENS = [[-150, -55, 8, 0.3], [-128, -22, 7, -0.6], [-172, -18, 10, -0.2]];
  pen(SH, ...PENS[0]); pen(SH, ...PENS[1]); pen(SC, ...PENS[2]);
  const inPen = (k, n, tint) => { const [x, z, R] = PENS[k], out = []; for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * (R - 1.6); out.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, rot: r() * 6.283, s: 0.85 + r() * 0.3, tint: tint() }); } return out; };
  const goatTint = () => { const g = 0.7 + r() * 0.6; return [g, g * (0.9 + r() * 0.15), g * (0.8 + r() * 0.3)]; }, sheepTint = () => { const g = 0.75 + r() * 0.35; return [g, g, g * (0.9 + r() * 0.1)]; }, cowTint = () => { const g = 0.6 + r() * 0.7; return [g, g * (0.85 + r() * 0.2), g * (0.8 + r() * 0.3)]; };
  const split = (list) => [list.filter((_, i) => i % 2 === 0), list.filter((_, i) => i % 2 === 1)];
  const stubble = plots.filter((p) => p.goats).flatMap((p) => p.goats.map(([x, z]) => ({ x, z, rot: r() * 6.283, s: 0.85 + r() * 0.25, tint: goatTint(), u0: Y(-8200) })));
  const [g1s, g2s] = split(inPen(0, 12, goatTint).map((o) => ({ ...o, u0: Y(-8200) }))), [s1, s2] = split(inPen(1, 10, sheepTint).map((o) => ({ ...o, u0: Y(-7500) }))), [c1, c2] = split(inPen(2, 7, cowTint).map((o) => ({ ...o, u0: Y(-6800) })));
  herds.push(standing(world, L.goat, g1s), standing(world, L.goat, [...g2s, ...stubble], { graze: 1.25, g: 2.2 }), standing(world, L.sheep, s1), standing(world, L.sheep, s2, { graze: 1.0, g: 2.2 }), standing(world, L.cattle, c1), standing(world, L.cattle, c2, { graze: 0.7, g: 2.2 }));
  for (const h of herds) group.add(...h.meshes);
  P(M, 'stand', PENS[0][0] + 9.5, PENS[0][1] + 4, 3, { prop: 'staff', u0: Y(-8200) }); P(F, 'crouch', PENS[1][0] + 2, PENS[1][1] + 1, 1, { u0: Y(-7500) }); P(M, 'stand', PENS[2][0] + 11.5, PENS[2][1] - 3, 3, { prop: 'staff', u0: Y(-6800) });
  // a flock out on the scrub with its herder; later sheep, later still cattle
  const LOOP = [[-150, 14], [-70, 36], [-48, 96], [-130, 124], [-212, 70], [-150, 14]];
  const flock = (make, n, phase, from, speed, s) => {
    P(M, 'herd', 0, 0, 0, { path: LOOP, speed, phase, u0: Y(from) });
    for (let k = 0; k < n; k++) walkers.push({ make, path: LOOP, speed, phase, ahead: 2.5 + k * 1.5 + r(), side: (k % 3 - 1) * 1.3 + (r() - 0.5) * 0.6, s: s * (0.9 + r() * 0.2), u0: Y(from) });
  };
  flock(L.goat, 5, 0, -8200, 0.75, 1); flock(L.sheep, 4, 0.36, -7500, 0.75, 1); flock(L.cattle, 2, 0.7, -6800, 0.75, 1);
  const droves = drove(world, group, walkers);
  // the first years: no herds yet, hunters come home with spears
  for (let k = 0; k < 3; k++) P(M, 'patrol', 0, 0, 0, { path: [[-190, 40 + k * 2], [-100, -52], outGate], phase: 0.1 + k * 0.02, u1: Y(-8200) });

  // ---------- plants ----------
  const green = (lo = 0.62) => { const g = lo + r() * 0.25; return [g * (0.9 + r() * 0.3), g, g * (0.7 + r() * 0.3)]; }, dusty = () => { const g = 0.55 + r() * 0.3; return [g * 1.25, g, g * 0.8]; };
  const free = (x, z) => !(x > X0 - 2 && x < X0 + CW * 10 + 2 && z > Z0 - 2 && z < Z0 + CD * 15 + 2 && toStream(x, z) > 4.5 && Math.hypot(x - FLOOR[0], z - FLOOR[1]) > 14) && Math.hypot(x - V[0], z - V[1]) > VR + 5 && Math.hypot(x - POOL[0], z - POOL[1]) > 18 && !PENS.some((p) => Math.hypot(x - p[0], z - p[1]) < p[2] + 2) && Math.hypot(x - YARD[0], z - YARD[1]) > 8 && Math.hypot(x - SPAWN.x, z - SPAWN.z) > 5;
  const scatter = (n, pick, s0, s1, tint) => { const out = []; for (let t = 0; t < n * 30 && out.length < n; t++) { const [x, z] = pick(); if (free(x, z)) out.push({ x, z, s: s0 + r() * (s1 - s0), rot: r() * 6.283, tint: tint() }); } return out; };
  const ring = (c, d0, d1) => () => { const a = r() * 6.283, d = d0 + r() * (d1 - d0); return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; };
  const byStream = () => { const i = (r() * (STREAM.length - 1)) | 0, t = r(), a = STREAM[i], b = STREAM[i + 1]; return [a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 9, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 9]; };
  planted(always, K.palm, [...scatter(9, ring(POOL, 19, 34), 0.7, 1.15, green), ...scatter(6, byStream, 0.6, 1, green)], H);
  planted(always, K.palmB, [...scatter(8, ring(POOL, 19, 38), 0.8, 1.3, green), ...scatter(7, byStream, 0.7, 1.1, green), ...scatter(5, ring(V, VR + 8, VR + 30), 0.8, 1.2, green)], H);
  planted(always, K.shrub, [...scatter(40, ring(POOL, 18, 60), 0.6, 1.3, green), ...scatter(30, byStream, 0.5, 1.1, green), ...scatter(110, () => [-260 + r() * 620, -330 + r() * 640], 0.4, 1.0, dusty)], H);
  planted(always, K.shrubB, [...scatter(140, () => [-420 + r() * 900, -420 + r() * 840], 0.5, 1.2, dusty), ...scatter(70, () => [-700 + r() * 440, -500 + r() * 1000], 0.7, 1.6, dusty)], H);
  const tan = () => { const g = 0.62 + r() * 0.3; return [g * 1.12, g, g * 0.82]; };
  planted(always, K.rock, scatter(60, () => [-760 + r() * 520, -600 + r() * 1200], 0.8, 3.2, tan), H);
  planted(always, K.rockB, [...scatter(60, () => [-760 + r() * 520, -600 + r() * 1200], 0.8, 3.5, tan), ...scatter(40, () => [-300 + r() * 700, -400 + r() * 800], 0.3, 0.9, tan)], H);
  // reeds in the wet ground round the spring
  { const b = S.of('crop'), up = [0, 1, 0]; for (let k = 0; k < 150; k++) { const a = r() * 6.283, d = 15.5 + r() * 4.5, x = POOL[0] + Math.cos(a) * d, z = POOL[1] + Math.sin(a) * d, y = H(x, z) - 0.15, w = 0.9 + r() * 0.9, b0 = r() * 3.14, dx = Math.cos(b0) * w, dz = Math.sin(b0) * w, hh = 1.4 + r() * 1.1, c = shade(lin(0x56682e), 0.6 + r() * 0.6), lo = shade(c, 0.6), u0 = r() * 3;
    b.quad([[x - dx, y, z - dz], up, u0, 0, lo], [[x + dx, y, z + dz], up, u0 + w, 0, lo], [[x + dx, y + hh, z + dz], up, u0 + w, 1, c], [[x - dx, y + hh, z - dz], up, u0, 1, c]); } }

  // ---------- meshes, people ----------
  S.mesh(always); SA.mesh(early); SB.mesh(late); SH.mesh(herding); SG.mesh(grown); SP.mesh(pots); SC.mesh(cows); SK.mesh(works); const wallMeshes = SW.mesh(walls);
  const folk = actors(world, people, { seed: 96 }); group.add(...folk.meshes);
  const groups = [always, early, late, herding, grown, pots, cows, works, walls];

  return {
    update(u, t, env, camera, view) {
      const year = uToYear(u); solids.u = u;
      for (const g of groups) g.visible = u >= g.userData.u0 && u < g.userData.u1;
      // the tower rises over two centuries; four thousand years later the town's own rubble has half buried it and the wall
      const rise = smooth((year + 8500) / 200), sunk = smooth((year + 7600) / 500);
      for (const m of wallMeshes) { m.scale.y = 0.3 + 0.7 * rise; m.position.y = (FLAT - 0.4) * (1 - m.scale.y) - 2.4 * sunk; }
      for (const h of herds) h.update(u);
      droves.update(u, t); folk.update(u, t, view);
    },
    collide(pos) {
      solids.collide(pos);
      if (solids.u >= Y(-8500)) {   // the wall: a ring with one gap
        const dx = pos.x - V[0], dz = pos.z - V[1], d = Math.hypot(dx, dz);
        if (Math.abs(d - VR) < 1.6) { let a = Math.atan2(dz, dx) - GATE; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) * VR > 2.2) { const to = d < VR ? VR - 1.6 : VR + 1.6; pos.x = V[0] + (dx / d) * to; pos.z = V[1] + (dz / d) * to; } }
      }
    },
  };
}

export default {
  place: 'Fertile Crescent · Jericho', coords: [31.87, 35.44],
  terrain: { base, relief, bounds: { x: 620, z: 760 }, tint: (x, z) => (Math.hypot(x + 20, z + 40) < 250 ? 0.9 : x < -300 ? 1.08 : 1) },
  spawn: SPAWN,
  env(year, env) {
    set(env.top, 0.2, 0.47, 0.86); set(env.hor, 0.9, 0.86, 0.74); set(env.ground, 0.72, 0.62, 0.45); set(env.far, 0.72, 0.62, 0.45); set(env.water, 0.2, 0.42, 0.42); set(env.sun, 1, 0.95, 0.84);
    env.sea = SEA; env.hill = 1; env.ice = -60; env.fogD = 0.0011; env.sunEl = 0.98; env.sunI = 2.5; env.amb = 1.05; env.cloud = 0.12; env.precip = 0; env.grass = 0.07;
  },
  events: [
    { y: -9600, t: 'The ice is over', h: 'A spring under dry hills. The people who used to camp here have stayed: round houses of mud, and patches of wild barley and emmer that they sow themselves.', w: 'The cold snap of the Younger Dryas has ended. At Göbekli Tepe, hunters raise carved stone pillars. Perhaps five million people are alive.' },
    { y: -9000, t: 'Sown, not gathered', h: 'Hoes of flint and antler, sickles with a gloss on the blade from cutting stems. Gazelle is still the meat. Grain goes into bins and is ground every day.', w: 'Farming begins in several valleys between the Levant and the Zagros at once. Nobody decided it.' },
    { y: -8500, t: 'The tower', h: 'They are piling field stones into a tower nine metres across, with a stair of twenty-two steps inside, and a wall round the whole settlement. No one alive has seen anything so large built.', w: 'Jericho may hold a thousand people or more, most of whom will never have to move camp.' },
    { y: -8200, t: 'Goats', h: 'Goats in pens, and a herder walking them out to the scrub. The fields have spread along the stream; the ears no longer shatter when ripe, so the corn waits for the sickle.', w: 'Goats and sheep are herded in the Zagros and Anatolia; cattle and pigs follow. Cyprus is settled by farmers who bring their animals by boat.' },
    { y: -7600, t: 'Square houses', h: 'The round huts are gone. Houses have corners now, floors of polished lime plaster and flat roofs to work and sleep on. The dead are buried under the floor; some skulls are kept and given faces of plaster.', w: 'Çatalhöyük is founded in Anatolia: thousands of people in houses entered through the roof.' },
    { y: -7000, t: 'Pots and cattle', h: 'Fired clay: jars built from coils, a little lopsided. Cattle stand in a pen by the spring. The old tower is half buried in the rubble of the town it guarded.', w: 'Rice and millet are grown in China, squash and the ancestor of maize in Mexico. In East Asia pottery is already ten thousand years old.' },
    { y: -6200, t: 'Dry years', h: 'A cold, dry spell that lasts for generations. The spring keeps running, but the fields are fewer and for long stretches the mound is nearly empty.', w: 'Meltwater from the last of the Canadian ice floods the Atlantic and chills the north. Rising seas drown the plains between Britain and the continent.' },
    { y: -5500, t: 'Looms', h: 'Flax and wool on upright looms weighted with lumps of clay. Sheep are kept for more than meat now. People have been farming this ground for four thousand years.', w: 'Farmers reach central Europe with longhouses and cattle. In Mesopotamia, villages dig canals to water land where no rain falls. Copper is smelted in the Balkans.' },
    { y: -4500, t: 'Copper and olives', h: 'Olive and date are tended as orchards. Traders bring copper tools down the valley. The village is small; the news is made elsewhere.', w: 'In the south of Mesopotamia the temple at Eridu has been rebuilt a dozen times, each larger. Soon one of those towns will be a city.' },
  ],
  build,
};
