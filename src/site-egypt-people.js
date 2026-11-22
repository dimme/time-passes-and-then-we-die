// The people of Giza and what they are doing: farmers on the flood plain, gangs hauling stone, masons, scribes, bakers, priests,
// boatmen — and the oxen, sledges, boats and chariot that move with them.
import * as THREE from 'three';
import { rng } from './util.js?v=740e009b';
import { yearToU } from './timeline.js?v=740e009b';
import { actors } from './people-actors.js?v=740e009b';
import { species } from './animals.js?v=740e009b';
import { pose, TAU } from './animals-rig.js?v=740e009b';
import { C, Parts, shade, put, block, bar, fin, offsetLoop, roundLoop, Track } from './site-egypt-kit.js?v=740e009b';
import { K1, K2, K3, RAMP, QUARRY, SPHINX, TOWN, PLAIN, RH, ground } from './site-egypt-land.js?v=740e009b';
import { FIELDS, FLOOR, PASTURE, VILLAGE, BOATS, SHADUFS, boat } from './site-egypt-plain.js?v=740e009b';
import { cattle, Team, grazing } from './site-egypt-animals.js?v=740e009b';

const Y = yearToU, EVER = [-1e12, 1e12], frac = (v) => v - Math.floor(v);
const toward = (x, z, tx, tz) => Math.atan2(z - tz, tx - x);
const N = Math.PI / 2, S = -Math.PI / 2, E = 0, W = Math.PI;

export function buildPeople({ world, group, mats }) {
  const r = rng(1250), list = [], jit = (a) => (r() - 0.5) * a;
  /** One actor: span = [from year, to year]. */
  const A = (outfit, action, x, z, rot, span = EVER, o = {}) => { list.push({ outfit, action, x, z, rot, u0: Y(span[0]), u1: Y(span[1]), ...o }); };
  const walk = (outfit, action, path, span = EVER, o = {}) => A(outfit, action, path[0][0], path[0][1], 0, span, { path, ...o });
  const man = 'egyptian', woman = 'egyptian-f';

  // =========================== the flood plain ===========================
  const tracks = [], team = new Team(world, group), oxen = cattle();
  // reaping: a line of men working into the standing barley, women gleaning behind, baskets going to the threshing floor, a scribe keeping count
  {
    const f = FIELDS.reap;
    for (let i = 0; i < 9; i++) A(man, 'reap', f[0] + 4 + i * 5 + jit(1.5), f[2] + 15 + (i % 3) * 1.3 + jit(1), N + jit(0.5));
    for (let i = 0; i < 3; i++) A(woman, 'crouch', f[0] + 8 + i * 13 + jit(3), f[2] + 21 + jit(2), N + jit(1));
    for (let i = 0; i < 4; i++) walk(man, 'carry', [[f[0] + 20, f[3] + 2.5], [533, f[3] + 1], [FLOOR.x - 9, FLOOR.z + 4]], EVER, { phase: i / 4 });
    A('overseer', 'stand', f[0] + 26, f[3] + 4.2, N, EVER, { prop: 'staff' }); A(man, 'write', f[0] + 29, f[3] + 4, N + 0.4);
    const g = FIELDS.reap2; for (let i = 0; i < 6; i++) A(man, 'reap', g[0] + 6 + i * 8 + jit(2), g[2] + 20 + jit(3), N + jit(0.5));
    A('overseer', 'point', g[0] + 30, g[3] + 3, N, EVER, { prop: 'staff' });
  }
  // ploughing: two yoke of oxen going up and down the fallow, a sower walking ahead scattering seed for the plough to turn in
  {
    const f = FIELDS.plough;
    [[f[2] + 4, f[2] + 11, 0], [f[2] + 19, f[2] + 27, 0.45]].forEach(([z0, z1, ph], k) => {
      const path = roundLoop([[f[0] + 4, z0], [f[1] - 4, z0], [f[1] - 4, z1], [f[0] + 4, z1]], 2.5), tr = new Track(path), speed = 0.8;
      walk(man, 'plough', path, EVER, { phase: ph, speed }); walk(man, 'sow', path, EVER, { phase: frac(ph + 9 / tr.L), speed });
      walk(man, 'herd', offsetLoop(path, 1.5), EVER, { phase: frac(ph + 4.6 / tr.L), speed: speed * 1.04 });   // the boy who drives the team
      tracks.push({ tr, ph, speed, key: k }); for (const s of [-1, 1]) team.add(oxen[(k + (s > 0)) % 2], tr, 4.1, s * 0.46, 1, k);
    });
    // the yokes and plough poles, moving with the teams
    const P = new Parts({ all: EVER }); P.add('plain', 'all', bar([2.55, 0.74, 0], [4.55, 1.28, 0], 0.035), C.wood).add('plain', 'all', bar([4.6, 1.33, -0.8], [4.6, 1.33, 0.8], 0.045), C.woodPale);
    for (const s of [-1, 1]) P.add('plain', 'all', bar([4.6, 1.33, s * 0.46], [4.75, 1.45, s * 0.2], 0.012), C.reed).add('plain', 'all', bar([4.6, 1.33, s * 0.46], [4.75, 1.45, s * 0.72], 0.012), C.reed);
    const src = P.build(new THREE.Group(), mats)[0];
    for (const t of tracks) { t.yoke = new THREE.Mesh(src.geometry, mats.plain); t.yoke.castShadow = true; group.add(t.yoke); }
  }
  // hoeing the ditch banks, and carrying water to the young crop from the canal
  {
    const f = FIELDS.hoe; for (let i = 0; i < 6; i++) A(man, 'hoe', f[0] + 3 + i * 8 + jit(2), f[2] - 2.6 + jit(0.8), (i % 2 ? S : N) + jit(0.6));
    for (let i = 0; i < 4; i++) walk(i % 2 ? woman : man, 'fetch-water', [[533.5 + (i % 2), 240], [533 + (i % 2), 300], [531, 336], [f[1] - 6 - i * 4, f[2] + 2]], EVER, { phase: i / 4 });
    for (const [x, z] of [[540, 239.6], [551, 239.8]]) A(man, 'fetch-water', x, z, N, [-1e12, -1500]);
    for (const [x, z] of SHADUFS) A(man, 'fetch-water', x + 0.3, z - 1.1, N, [-1500, 1e12]);   // working the shadufs
    for (let i = 0; i < 3; i++) walk(man, 'carry2', [[600, 258], [600, 396], [650, 398]], EVER, { phase: i / 3 });
    for (let i = 0; i < 3; i++) { const p = roundLoop([[612, 404 + i * 9], [652, 404 + i * 9], [652, 408 + i * 9], [612, 408 + i * 9]], 1.5); walk(man, 'sow', p, EVER, { phase: r() }); }
  }
  // the threshing floor: oxen driven round and round over the sheaves, men forking straw, women winnowing with scoops
  {
    const F = FLOOR, ring = (rad, n = 20) => { const p = []; for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; p.push([F.x + Math.cos(a) * rad, F.z + Math.sin(a) * rad]); } p[n] = p[0].slice(); return p; };
    const tr = new Track(ring(4.6)), speed = 0.7; tracks.push({ tr, ph: 0, speed, key: 2 });
    for (let i = 0; i < 3; i++) team.add(oxen[i % 2], tr, i * 2.5 + 2.4, (i - 1) * 0.15, 0.94, 2);
    walk(man, 'herd', ring(4.6), EVER, { phase: 0, speed });
    for (let i = 0; i < 3; i++) { const a = 1 + i * 2.1; A(man, 'thresh', F.x + Math.cos(a) * 7.2, F.z + Math.sin(a) * 7.2, toward(Math.cos(a), Math.sin(a), 0, 0), EVER, { prop: 'staff' }); }
    for (let i = 0; i < 3; i++) A(woman, 'trade', F.x + F.r + 2.2 + Math.cos(i * 2.1) * 2.6, F.z + 3 + Math.sin(i * 2.1) * 2.6, toward(Math.cos(i * 2.1), Math.sin(i * 2.1), 0, 0));
    A(man, 'write', F.x + F.r + 5.5, F.z - 1, W);
  }
  // the herd at pasture, with its herdsmen
  {
    const p = PASTURE, spots = []; for (let i = 0; i < 11; i++) spots.push([p[0] + 8 + r() * (p[1] - p[0] - 16), p[2] + 8 + r() * (p[3] - p[2] - 16), r() * 6.28, 0.85 + r() * 0.2, r() < 0.4]);
    grazing(world, group, spots, ground);
    walk(man, 'herd', roundLoop([[p[0] + 3, p[2] + 3], [p[1] - 3, p[2] + 3], [p[1] - 3, p[3] - 3], [p[0] + 3, p[3] - 3]], 4), EVER, { speed: 0.7 }); A(man, 'sit', p[0] + 2, p[3] - 4, E);
  }

  // =========================== the village ===========================
  {
    const V = VILLAGE, bx = V.x1 + 8, bz = V.z0 + 62;
    for (let i = 0; i < 3; i++) A(woman, 'cook', bx - 1 + i * 2.2, bz + 2.5 + jit(1), S + jit(0.4));
    for (let i = 0; i < 4; i++) A(woman, 'grind', bx - 5 + i * 1.5, bz + 9.5, S);
    for (let i = 0; i < 4; i++) walk(woman, 'carry', [[437, 262], [428, 300], [bx + 4, bz - 9]], EVER, { prop: 'jar', phase: i / 4 });
    A(man, 'potter', bx + 9, bz + 10, W); A(woman, 'spin', V.x0 + 30, V.z0 + 20, E); A(woman, 'spin', V.x0 + 32, V.z0 + 21.5, W);
    for (const [x, z] of [[V.x0 + 18, V.z0 + 44], [V.x0 + 50, V.z0 + 70], [V.x1 + 3, V.z0 + 20]]) { A(man, 'talk', x, z, E); A(r() < 0.5 ? woman : man, 'talk', x + 1.3, z + 0.2, W); }
    for (let i = 0; i < 4; i++) A(i % 2 ? woman : man, 'sit', V.x0 + 12 + i * 17 + jit(2), V.z0 + 19 + (i % 2) * 27, r() * 6);
    for (let i = 0; i < 3; i++) walk(man, 'carry', [[V.x1 + 7, V.z0 + 28], [V.x1 + 12, V.z0 + 20], [444, 254]], EVER, { prop: 'sack', phase: i / 3 });
    A(man, 'stand', V.x1 + 12, V.z0 + 12, W, EVER, { prop: 'staff' });
  }

  // =========================== river and harbours ===========================
  for (const [x, z, ry] of BOATS.skiffs) { A(man, 'fish', x + Math.cos(ry) * 1.1, z - Math.sin(ry) * 1.1, ry + 0.3, EVER, { afloat: true, y: 0.32 }); A(man, 'sit', x - Math.cos(ry) * 1.2, z + Math.sin(ry) * 1.2, ry, EVER, { afloat: true, y: 0.32 }); }
  for (let i = 0; i < 3; i++) walk(man, 'carry', [[438, 206], [424, 212], [420, 262]], EVER, { prop: 'sack', phase: i / 3 });
  A(man, 'trade', 432, 216, E); A(man, 'talk', 433.4, 216.3, W); A(man, 'write', 430, 221, N);
  // a cargo boat under oars, going up and down the river
  const river = new THREE.Group(); group.add(river);
  {
    const P = new Parts({ all: EVER }); boat(P, 'all', [0, 0, 0, 0], false); for (const m of P.build(river, mats)) m.frustumCulled = false;
    const crew = []; for (let i = 0; i < 5; i++) for (const s of [-1, 1]) crew.push({ outfit: man, action: 'row', x: 5 - i * 1.7, z: s * 1.05, rot: W, y: 0.95, phase: 0 });
    crew.push({ outfit: man, action: 'stand', x: -7.6, z: 0, rot: E, y: 0.95 }, { outfit: 'overseer', action: 'point', x: 6.6, z: 0, rot: E, y: 0.95 });
    river.crew = actors({ heightAt: () => 0, sea: 0 }, crew, { seed: 5 }); river.add(...river.crew.meshes);
  }

  // =========================== stone ===========================
  // gangs on the ropes: two files to a sledge, a man wetting the sand before the runners, a foreman beside them
  const sledges = [];
  const haulLoop = (pts, span, n, per, loaded, key) => {
    const centre = roundLoop(pts, 4), tr = new Track(centre), speed = 0.75, files = [-0.8, 0.8].map((o) => { const p = offsetLoop(centre, o); return { p, L: new Track(p).L }; }), side = offsetLoop(centre, 3);
    for (let s = 0; s < n; s++) {
      const f0 = s / n;
      for (const f of files) for (let k = 0; k < per; k++) walk(man, 'haul', f.p, span, { phase: frac(f0 + (4.3 + k * 1.45) / tr.L), speed: (speed * f.L) / tr.L });
      walk(man, 'fetch-water', centre, span, { phase: frac(f0 + 2.6 / tr.L), speed });
      walk('overseer', 'herd', side, span, { phase: frac(f0 + 6 / tr.L), speed: (speed * new Track(side).L) / tr.L });
      sledges.push({ tr, f0, speed, loaded, u0: Y(span[0]), u1: Y(span[1]) });
    }
  };
  const qz = QUARRY.z0 + 34;
  haulLoop([[RAMP.x - 4.5, qz], [RAMP.x - 4.5, RAMP.z1 - 12], [RAMP.x + 4.5, RAMP.z1 - 12], [RAMP.x + 4.5, qz]], [K1.y0, K1.y1], 4, 6, (d) => d < qz - RAMP.z1 + 16, 0);
  haulLoop([[RAMP.x - 4.5, qz], [RAMP.x - 4.5, RAMP.z0 - 12], [-150, 105], [K2.x - 34, K2.z + K2.b / 2 + 172], [K2.x - 26, K2.z + K2.b / 2 + 172], [-142, 112], [RAMP.x + 4.5, RAMP.z0 - 4], [RAMP.x + 4.5, qz]], [K2.y0, K2.y1], 4, 6, (d) => d < 632, 1);
  haulLoop([[K3.x + 110, K3.z + 250], [K3.x - 4, K3.z + K3.b / 2 + 116], [K3.x + 4, K3.z + K3.b / 2 + 116], [K3.x + 118, K3.z + 244]], [K3.y0, K3.y1], 2, 6, (d) => d < 140, 2);
  // in the quarry: cutting blocks free with copper chisels and wooden mallets, levering them out, carrying off the chippings
  {
    const q = QUARRY, f = [-2610, K3.y1], later = [K3.y1, -2150];
    for (let i = 0; i < 9; i++) A(man, 'chisel', q.x1 - 36 + (i % 5) * 4.6 + jit(1), q.z1 - 27 - Math.floor(i / 5) * 5 + jit(1), E + jit(1.2), f);
    for (let i = 0; i < 4; i++) A(man, 'chisel', q.x0 + 30 + i * 9 + jit(2), q.z1 - 16 + jit(2), S + jit(1), later);
    for (let i = 0; i < 4; i++) A(man, 'push', q.x0 + 42 + i * 1.1, q.z0 + 28 + (i % 2) * 0.9, W, f);
    for (let i = 0; i < 5; i++) walk(man, 'carry', [[q.x1 - 30, q.z1 - 30], [q.x0 + 50, q.z0 + 40], [q.x0 + 18, q.z0 + 22]], f, { phase: i / 5 });
    A('overseer', 'point', q.x1 - 42, q.z1 - 30, E, f, { prop: 'staff' }); A(man, 'write', q.x1 - 44, q.z1 - 32.5, E, f); A('overseer', 'stand', q.x0 + 46, q.z0 + 24, E, f, { prop: 'staff' });
  }
  // on the working level of the Great Pyramid, while the ramp still reaches it: setting and trimming the blocks
  {
    const span = [K1.y0 + 0.6, K1.y0 + 16.5], z0 = RAMP.z1;
    for (let i = 0; i < 6; i++) A(man, 'push', RAMP.x - 8 + (i % 3) * 1.2, z0 - 22 - Math.floor(i / 3) * 6, N + jit(0.2), span);
    for (let i = 0; i < 5; i++) A(man, 'chisel', RAMP.x + 6 + (i % 2) * 3.4, z0 - 16 - i * 3.6, W + jit(0.6), span);
    A('overseer', 'point', RAMP.x, z0 - 30, S, span, { prop: 'staff' }); A(man, 'write', RAMP.x + 1.8, z0 - 31, S, span);
    for (let i = 0; i < 5; i++) walk(i % 2 ? man : man, 'carry', [[RAMP.x + 10, RAMP.z0 + 6], [RAMP.x + 10, z0 - 8], [RAMP.x + 9, z0 - 18]], [K1.y0, K1.y1], { phase: i / 5 });
    for (let i = 0; i < 3; i++) walk(man, 'fetch-water', [[RAMP.x - 10, RAMP.z0 + 8], [RAMP.x - 10, z0 - 6]], [K1.y0, K1.y1], { phase: i / 3 });
    // dressing the casing at the foot of each pyramid as it nears completion
    for (let i = 0; i < 6; i++) A(man, 'chisel', K1.x + K1.b / 2 + 2.2, K1.z - 40 + i * 14 + jit(3), W, [K1.y0 + 12, K1.y1 + 4]);
    for (let i = 0; i < 6; i++) A(man, 'chisel', K2.x + K2.b / 2 + 2.2, K2.z - 40 + i * 14 + jit(3), W, [K2.y0 + 8, K2.y1 + 4]);
    for (let i = 0; i < 6; i++) A(man, 'chisel', K3.x - 30 + i * 12 + jit(3), K3.z - K3.b / 2 - 2.2, S, [K3.y0 + 6, K3.y1 + 3]);
    for (let i = 0; i < 5; i++) A(man, 'chisel', SPHINX.x - 30 + i * 13, SPHINX.z + 12.5, N, [-2552, -2530]);   // carving the Sphinx
    for (let i = 0; i < 4; i++) A(man, 'chisel', K2.x + K2.b / 2 + 2.2, K2.z + 50 + i * 9, W, [-1300, 1e12]);   // Ramesses' men taking casing stone
    A('overseer', 'point', K2.x + K2.b / 2 + 8, K2.z + 62, W, [-1300, 1e12], { prop: 'staff' });
  }
  // Khufu's harbour: Tura limestone coming off the boats, a scribe keeping the log
  {
    const span = [K1.y0, K3.y1], y = 0.6;
    for (let i = 0; i < 5; i++) A(man, 'chisel', 462 + i * 7 + jit(2), -492 + (i % 2) * 30 + jit(2), r() * 6, span, { y });
    for (let i = 0; i < 4; i++) walk(man, 'carry', [[498, -466], [470, -470], [452, -476]], span, { prop: 'sack', phase: i / 4, y: 0 });
    A(man, 'write', 494, -480, E, span, { y }); A('overseer', 'stand', 492, -478, E, span, { y, prop: 'staff' }); A(man, 'guard', 500, -452, E, span, { y, prop: 'spear' });
  }

  // =========================== the builders' town ===========================
  {
    const T = TOWN, span = [-2600, -2450];
    for (let b = 0; b < 2; b++) {
      const z = T.z0 + 43 + b * 44;
      for (let i = 0; i < 4; i++) walk(i % 2 ? woman : man, 'carry', [[T.x0 + 6, z + (i % 2)], [T.x0 + 60, z + (i % 2)], [T.x0 + 68, z + 14]], span, { prop: i % 2 ? 'jar' : 'basket', phase: i / 4 });
      for (let i = 0; i < 5; i++) A(man, 'sit', T.x0 + 12 + i * 11 + jit(2), z + 2.4, N + jit(1), span);
      A(man, 'talk', T.x0 + 30, z - 1.5, E, span); A(man, 'talk', T.x0 + 31.3, z - 1.3, W, span);
    }
    for (let i = 0; i < 5; i++) A(woman, 'cook', T.x0 + 63 + (i % 2) * 2.5, T.z0 + 10 + i * 6, W, span);
    for (let i = 0; i < 5; i++) A(woman, 'grind', T.x0 + 64, T.z0 + 52 + i * 1.6, W, span);
    A(man, 'guard', 386.2, T.z0 - 20, N, [-2600, -2150], { prop: 'spear' }); A(man, 'guard', 392.8, T.z0 - 20, N, [-2600, -2150], { prop: 'spear' });
    for (let i = 0; i < 4; i++) walk(man, 'carry', [[389.5, T.z0 - 4], [389.5, T.z0 - 40], [330, 300], [200, 120], [RAMP.x + 24, QUARRY.z1 + 12]], [-2600, -2535], { phase: i / 4 });   // bread and beer going up to the gangs
    A('overseer', 'stand', T.x0 + 62, T.z0 + 166, W, span, { prop: 'staff' }); A(man, 'write', T.x0 + 60, T.z0 + 168, W, span); A(man, 'write', T.x0 + 60, T.z0 + 170, W, span);
  }

  // =========================== temples, priests and kings ===========================
  {
    const cult = [K2.y1, -2150], sx = 394.5;
    for (let i = 0; i < 3; i++) A(man, 'pray', sx + 3, SPHINX.z - 15 + i * 1.6, W, cult); for (let i = 0; i < 2; i++) A(man, 'bow-down', sx + 5.5, SPHINX.z - 14.5 + i * 2, W, cult);
    A(man, 'guard', 397, 213, E, cult, { prop: 'spear' }); A(man, 'guard', 397, 243, E, cult, { prop: 'spear' });
    for (let i = 0; i < 3; i++) walk(woman, 'carry', [[430, 226], [400, 228 - 13]], cult, { prop: 'basket', phase: i / 3 });   // offerings
    const e1 = K1.x + K1.b / 2 + 56; A(man, 'pray', e1, K1.z - 1.5, W, [K1.y1, -2150]); A(man, 'pray', e1, K1.z + 1.5, W, [K1.y1, -2150]); A(man, 'guard', e1 - 2, K1.z + 5, E, [K1.y1, -2150], { prop: 'spear' });
    // Khufu comes to see his pyramid
    const kx = RAMP.x + 30, kz = RAMP.z0 + 4, visit = [-2578, -2566];
    A('pharaoh', 'stand', kx, kz, toward(kx, kz, RAMP.x, RAMP.z0 - 60), visit, { prop: 'staff', s: 1.03 });
    for (const s of [-1, 1]) A(man, 'stand', kx + 1, kz + s * 1.1, N, visit, { prop: 'torch' });   // (fan bearers: the nearest thing to hand)
    for (let i = 0; i < 4; i++) A(man, 'guard', kx + 3 + (i % 2) * 1.2, kz - 2 + Math.floor(i / 2) * 4, W, visit, { prop: 'spear' });
    for (let i = 0; i < 3; i++) A(man, 'bow-down', kx - 4, kz - 5 + i * 1.5, toward(kx - 4, kz, kx, kz), visit); A('overseer', 'talk', kx - 1.6, kz - 1, E, visit);
    // the New Kingdom: pilgrims at the Sphinx, and the prince who cleared it
    const nk = [-1400, 1e12], px = SPHINX.x + 41;
    for (let i = 0; i < 3; i++) A(i % 2 ? woman : man, 'pray', px + 2 + i * 0.4, SPHINX.z - 3 + i * 2.6, W, nk); A(man, 'bow-down', px + 4.5, SPHINX.z + 0.4, W, nk); A(man, 'write', px + 6, SPHINX.z + 5, W, nk);
    A('pharaoh', 'pray', px - 1.5, SPHINX.z, W, [-1402, -1392]); for (const s of [-1, 1]) A(man, 'guard', px + 1, SPHINX.z + s * 6, W, [-1402, -1392], { prop: 'spear' });
    for (let i = 0; i < 6; i++) walk(man, 'carry', [[SPHINX.x + 30, SPHINX.z + 13 + (i % 2)], [SPHINX.x + 52, SPHINX.z + 30], [SPHINX.x + 60, SPHINX.z + 70]], [-1404, -1398], { phase: i / 6 });   // carrying the sand away
  }
  const cast = actors(world, list, { seed: 26 }); group.add(...cast.meshes);

  // ---- sledges ----
  const SP = new Parts({ all: EVER });
  for (const s of [-1, 1]) { SP.add('plain', 'all', put(block(2.7, 0.15, 0.13), 0, 0, s * 0.45), C.wood); SP.add('plain', 'all', put(block(0.5, 0.13, 0.13), 1.5, 0.06, s * 0.45, 0, 0, 0.5), C.wood); SP.add('plain', 'all', bar([1.55, 0.2, s * 0.45], [3.1, 0.12, s * 0.8], 0.02), C.reed); }
  for (const x of [-1, 0, 1]) SP.add('plain', 'all', put(block(0.12, 0.1, 1.1), x, 0.14, 0), C.woodPale);
  const frameGeo = SP.build(new THREE.Group(), mats)[0].geometry;
  SP.add('blocks', 'all', put(block(1.7, 0.95, 1.15), -0.05, 0.24, 0), C.lime, 6); for (const x of [-0.5, 0.45]) SP.add('blocks', 'all', put(block(0.05, 0.98, 1.19), x, 0.24, 0), shade(C.reed, 0.6));
  const stoneGeo = SP.build(new THREE.Group(), mats)[0].geometry;
  const frames = new THREE.InstancedMesh(frameGeo, mats.plain, sledges.length), stones = new THREE.InstancedMesh(stoneGeo, mats.blocks, sledges.length);
  for (const m of [frames, stones]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; group.add(m); }

  // ---- a chariot at exercise below the Sphinx (New Kingdom) ----
  const chariot = new THREE.Group(); group.add(chariot);
  {
    const P = new Parts({ all: EVER }), wood = shade(C.woodPale, 0.9);
    for (const s of [-1, 1]) {
      P.add('plain', 'all', put(new THREE.TorusGeometry(0.47, 0.03, 6, 20), 0, 0.5, s * 0.78), wood); P.add('plain', 'all', put(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8).rotateX(N), 0, 0.5, s * 0.78), wood);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; P.add('plain', 'all', bar([0, 0.5, s * 0.78], [Math.cos(a) * 0.46, 0.5 + Math.sin(a) * 0.46, s * 0.78], 0.018), wood); }
    }
    P.add('plain', 'all', bar([0, 0.5, -0.82], [0, 0.5, 0.82], 0.035), wood).add('plain', 'all', put(block(0.95, 0.05, 1.05), 0.2, 0.56, 0), shade(C.wood, 1.1));
    P.add('plain', 'all', put(new THREE.CylinderGeometry(0.52, 0.52, 0.75, 12, 1, true, -0.2, Math.PI + 0.4).rotateY(0), 0.22, 0.98, 0), shade(C.red, 0.9));   // the body: a low curved front of leather
    P.add('plain', 'all', bar([0.6, 0.58, 0], [2.9, 1.25, 0], 0.03), wood).add('plain', 'all', bar([2.9, 1.27, -0.55], [2.9, 1.27, 0.55], 0.03), wood);
    for (const m of P.build(chariot, mats)) { m.frustumCulled = false; m.material = mats.plainBoth || (mats.plainBoth = Object.assign(mats.plain.clone(), { side: THREE.DoubleSide })); }
    chariot.horses = [-1, 1].map((s) => { const a = species().horse(); a.obj.scale.setScalar(0.86); a.obj.position.set(2.5, 0, s * 0.5); a.ph = s; chariot.add(a.obj); return a; });
    chariot.crew = actors({ heightAt: () => 0, sea: -9 }, [{ outfit: 'overseer', action: 'push', x: 0.22, z: 0.2, rot: 0, y: 0.6 }, { outfit: 'pharaoh', action: 'stand', x: 0.05, z: -0.22, rot: 0, y: 0.6, prop: 'bow' }], { seed: 3 }); chariot.add(...chariot.crew.meshes);
    chariot.u0 = Y(-1500);
  }

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _a = [0, 0, 0], _b = [0, 0, 0], ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const dists = (key) => { const t = tracks[key]; return t.ph * t.tr.L + t.speed * dists.t; };
  return {
    update(u, t, view) {
      cast.update(u, t, view);
      dists.t = t; team.update(dists, t);
      for (const k of tracks) if (k.yoke) { const p = k.tr.at(dists(k.key), _a, 0.5); k.yoke.position.set(p[0], PLAIN, p[1]); k.yoke.rotation.y = p[2]; }
      // sledges: each rides its track between the files of its gang, loaded on the way out
      sledges.forEach((s, i) => {
        if (u < s.u0 || u >= s.u1) { frames.setMatrixAt(i, ZERO); stones.setMatrixAt(i, ZERO); return; }
        const d = frac(s.f0 + (s.speed * t) / s.tr.L) * s.tr.L, p = s.tr.at(d, _a, 0.9), q = s.tr.pt(d + 1.2, _b), y = world.heightAt(p[0], p[1]), y1 = world.heightAt(q[0], q[1]);
        _q.setFromEuler(_e.set(0, p[2], Math.atan2(y1 - y, 1.2), 'YZX')); _m.compose(_p.set(p[0], y + 0.02, p[1]), _q, _s.set(1, 1, 1));
        frames.setMatrixAt(i, _m); stones.setMatrixAt(i, s.loaded(d) ? _m : ZERO);
      });
      frames.instanceMatrix.needsUpdate = stones.instanceMatrix.needsUpdate = true;
      // the boat on the river
      const R = BOATS.river, a = t * 0.004 + 1, cz = (R.z0 + R.z1) / 2, hz = (R.z1 - R.z0) / 2;
      river.position.set(R.x + Math.cos(a) * 34, world.sea, cz + Math.sin(a) * hz); river.rotation.y = Math.atan2(-Math.cos(a) * hz, -Math.sin(a) * 34); river.crew.update(u, t, null);
      // the chariot
      chariot.visible = u >= chariot.u0;
      if (chariot.visible) {
        const b = t * 0.14, cx = 384, cz2 = 62, x = cx + Math.cos(b) * 22, z = cz2 + Math.sin(b) * 48, dx = -Math.sin(b) * 22, dz = Math.cos(b) * 48, v = Math.hypot(dx, dz) * 0.14;
        chariot.position.set(x, ground(x, z), z); chariot.rotation.y = Math.atan2(-dz, dx); chariot.crew.update(u, t, null);
        chariot.dist = (chariot.dist || 0) + v * Math.min(0.1, Math.abs(t - (chariot.t || t))); chariot.t = t;
        for (const h of chariot.horses) { const g = h.def.gait; pose(h, (TAU * g.duty * chariot.dist) / (g.stride * 0.86) + h.ph, t); }
      }
    },
  };
}
