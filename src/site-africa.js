// East African Rift, 7 million to 70 thousand years ago: a lake-margin plain like Olduvai's, between the fault scarp
// and a rift lake with a volcano beyond it. Upright apes, then stone knappers, hand-axe makers, fire keepers, and us.
import * as THREE from 'three';
import { rng, smooth, part, ball, cyl } from './util.js';
import { shared } from './textures.js';
import { makeKinds } from './flora.js';
import { Builder, norm, tube, arc, foliage } from './flora-geo.js';
import { leafMat, floraTextures } from './flora-tex.js';
import { actors } from './people-actors.js';
import { Y, TAU, keyed, rgb, tone, facing, drawnGround, Stuff, Fires, Beasts, Field, thatchTex, hearth, debitage } from './site-africa-kit.js';

const sin = Math.sin, cos = Math.cos, exp = Math.exp;

// ---------- the land ----------
const shoreAt = (z) => 215 + 30 * sin(z * 0.006 + 0.8) + 14 * sin(z * 0.017);
const streamZ = (x) => -150 + 40 * sin(x * 0.008);
const riverX = (z) => -306 + 10 * sin(z * 0.011);
const KOPJE = [-130, 140];
function base(x, z) {
  let h = 9 + 1.6 * sin(x * 0.011 + z * 0.006 + 1) + 1.2 * sin(z * 0.014 - 0.5) * cos(x * 0.008);
  h -= 2.2 * exp(-(((z - streamZ(x)) / 20) ** 2)) * smooth((x + 290) / 60);              // a seasonal stream bed
  const dk = Math.hypot(x - KOPJE[0], z - KOPJE[1]); h += 13 * exp(-((dk / 36) ** 2));   // a granite kopje
  h += 4.5 * exp(-((x + 2) ** 2 + (z - 8) ** 2) / 2200);                                   // the rise the visitor arrives on
  const e = smooth((x - shoreAt(z) + 95) / 160); h += (-6 - h) * e;                        // the lake basin
  h -= 11 * exp(-(((x - riverX(z)) / 17) ** 2));                                          // the river under the scarp
  if (x < -380) { const k = smooth((-x - 380) / 440); h += 135 * k + (7 * sin(z * 0.012 + x * 0.004) + 4 * sin(z * 0.031 - x * 0.02)) * smooth((-x - 380) / 160); }   // the rift wall
  const az = Math.abs(z); if (az > 760) h += 45 * smooth((az - 760) / 400) * (1 - e);
  return h;
}
const terrain = { base, relief: () => 0, bounds: { x: 290, z: 380 }, tint: (x, z, b) => (b < 4.2 ? 0.82 : b > 22 ? 0.78 : 1) };

// ---------- the years ----------
const A0 = -4.2e6, LOM = -3.3e6, H0 = -2.6e6, H1 = -1.7e6, FIRE = -1.0e6, S0 = -300e3, FISH = -92e3;
const LAKE = [[-7e6, 3.4], [-2.6e6, 3.2], [-1.95e6, 4.4], [-1.2e6, 3.4], [-300e3, 3.0], [-160e3, 2.8], [-132e3, 0.5], [-100e3, 0.7], [-92e3, 3.0], [-70e3, 2.8]];
const DRY = [[-7e6, 0], [-3.4e6, 0.15], [-2.6e6, 0.6], [-1.7e6, 0.85], [-300e3, 0.8], [-160e3, 0.85], [-132e3, 1.25], [-100e3, 1.2], [-90e3, 0.75], [-70e3, 0.9]];
const C = { green: rgb(0x77824c), gold: rgb(0xb09a58), top: rgb(0x4a90d6), hor0: rgb(0xd8e4d8), hor1: rgb(0xecdcb8), water: rgb(0x5f8a80), sun: rgb(0xfff0d0) };

const events = [
  [-7e6, 'Before us', 'A wooded valley floor between a fault scarp and a rift lake. Elephant kin, three-toed horses, antelope. Nothing here walks upright.', 'The rift is tearing East Africa open, and forest is thinning to woodland. Somewhere on this continent the line to chimpanzees and the line to you are parting.'],
  [A0, 'Upright', 'Small apes cross the grass on two legs, hands free, heads no bigger than a chimpanzee\'s. At night they go back up into the trees.', 'Australopithecus. At Laetoli, a little south of here, three of them will walk through wet volcanic ash and leave their footprints.'],
  [LOM, 'The first tools', 'Someone sets a cobble on a flat rock and hits it with another. The broken edge cuts.', 'Lomekwi, west of Lake Turkana: the oldest stone tools known. Lucy\'s kind is walking in Ethiopia.'],
  [H0, 'Oldowan', 'Knappers strike sharp flakes from lava cobbles carried up from the stream bed. A dead elephant by the lake is cut apart before the scavengers close in.', 'The ice ages are beginning and Africa is drying. The first members of our own genus, Homo, are among the toolmakers.'],
  [-1.85e6, 'Two kinds of human', 'Slight, big-brained toolmakers camp under the acacia. Along the stream a heavy-jawed cousin chews sedge and roots. They know each other by sight.', 'The volcano across the lake has collapsed into a crater. Homo erectus has already walked out of Africa as far as Georgia.'],
  [H1, 'The hand-axe', 'Tall people with long legs. They shape stone on both faces into a teardrop that fits the palm, and will go on making that one tool for more than a million years.', 'Homo erectus. The hand-axe will be carried from here to India and to Britain.'],
  [FIRE, 'Fire', 'A hearth. The night has a centre now: people sit round it, cook, and stay awake after dark.', 'Ash and burnt bone a million years old lie deep in Wonderwerk Cave in South Africa. The heavy-jawed cousins are dying out.'],
  [S0, 'Homo sapiens', 'Brush shelters round the fires. Spears tipped with stone, red ochre ground to powder, children who take a long time to grow up.', 'The oldest known bones of our species lie at Jebel Irhoud in Morocco. In Europe the Neanderthals are taking shape.'],
  [-132e3, 'Drought', 'The rains have failed for longer than anyone remembers. The lake has drawn back across cracked mud, and the band digs for roots and for water.', 'The whole of humankind may be a few tens of thousands of people. On the coasts some of them are wearing beads of pierced shell.'],
  [FISH, 'The rains return', 'The lake is back. Fishers stand in the shallows with barbed spears; at dusk the camp dances round the fire.', 'At Katanda on the Semliki river, people carve harpoon points from bone and take catfish as long as a child.'],
  [-74e3, 'Leaving', 'A band walks north along the lake shore with its children and its fire, and does not come back.', 'Toba has erupted in Sumatra. Within a few thousand years small groups cross out of Africa; everyone born outside it will descend from them.'],
].map(([y, t, h, w]) => ({ y, t, h, w }));

function env(year, e) {
  const dry = keyed(DRY, year);
  e.ice = -60; e.hill = 1; e.sea = keyed(LAKE, year); e.precip = 0; e.lava[0] = e.lava[1] = e.lava[2] = 0; e.glow = 0; e.meteor = 0;
  tone(e.ground, C.green, C.gold, dry); tone(e.far, C.green, C.gold, dry);
  tone(e.hor, C.hor0, C.hor1, Math.min(1, dry)); e.top[0] = C.top[0]; e.top[1] = C.top[1]; e.top[2] = C.top[2];
  e.water[0] = C.water[0]; e.water[1] = C.water[1]; e.water[2] = C.water[2]; e.sun[0] = C.sun[0]; e.sun[1] = C.sun[1]; e.sun[2] = C.sun[2];
  e.cloudCol[0] = e.cloudCol[1] = e.cloudCol[2] = 1;
  e.fogD = 0.00105 + 0.0003 * Math.max(0, dry - 0.9) * 4; e.sunI = 2.5; e.sunEl = 0.82; e.sunSize = 0.035; e.amb = 1.05; e.cloud = 0.42 - 0.22 * Math.min(1, dry); e.grass = 1 - 0.45 * Math.max(0, dry - 0.85) * 2.5;
  e.bloom = 0.25; e.exposure = 1; e.moonHot = 0;
}

// ---------- plants ----------
const B4 = [[0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5]];
/** Umbrella thorn: a short leaning bole, limbs that fan out and flatten into a wide, thin crown. */
function acacia(seed, { h = 6.5, wide = 6, rad = 0.26 } = {}, barkMat, leaf) {
  const r = rng(seed), wood = new Builder(), leaves = new Builder(), tips = [], fork = [(r() - 0.5) * 0.5, h * (0.3 + r() * 0.1), (r() - 0.5) * 0.5];
  tube(wood, [[0, -0.3, 0], [fork[0] * 0.3, fork[1] * 0.4, fork[2] * 0.3], fork], (i, an) => rad * (1 - i * 0.16) * (i ? 1 : 1.35 + 0.2 * sin(an * 5)), 8, 2);
  const limbs = 4 + (r() * 2 | 0), a0 = r() * TAU;
  for (let k = 0; k < limbs; k++) {
    const az = a0 + (k / limbs) * TAU + (r() - 0.5) * 0.5, L = (h - fork[1]) * 0.75 + wide * (0.75 + r() * 0.4), A = arc(fork, az, 1.15 - r() * 0.2, -1.0 - r() * 0.15, L, 6, 1.2), pts = A.map((q) => q[0]);
    tube(wood, pts, (i) => rad * 0.52 * (1 - i / 7.5), 5, 1);
    for (let j = 2; j <= 6; j++) for (let m = 0; m < 2; m++) {
      const len = 1.3 + r() * 1.5, B = arc(pts[j], az + (m ? 1 : -1) * (0.5 + r() * 1.0), 0.75 - j * 0.07, -0.55, len, 2);
      tube(wood, B.map((q) => q[0]), (i) => rad * 0.16 * (1 - i / 3), 3, 1);
      for (const t of [1, 2]) for (let q = 0; q < 2; q++) tips.push([[B[t][0][0] + (r() - 0.5) * 0.9, B[t][0][1], B[t][0][2] + (r() - 0.5) * 0.9], norm(B[t][1][0] + (r() - 0.5), 0.12, B[t][1][2] + (r() - 0.5))]);
    }
    tips.push([pts[6], norm(A[6][1][0], 0.1, A[6][1][2])]);
  }
  foliage(leaves, tips, r, { size: 2.3, wide: 1.05, droop: 0, spread: 0.55, cells: B4 });
  let yc = 0; for (const [p] of tips) yc += p[1] / tips.length;
  for (let i = 1; i < leaves.p.length; i += 3) leaves.p[i] = yc + 0.25 + (leaves.p[i] - yc) * 0.38;   // press the sprays into a flat table
  return [{ geo: wood.build(), mat: barkMat, tint: false }, { geo: leaves.build(), mat: leaf }];
}

// ---------- things people make and leave ----------
const BONE = 0xd8d0b8, LAVA = 0x4a4642, MEAT = 0x6a1c14, HIDE_C = 0x5a5048, OCHRE = 0x8a2c14;
/** A grid surface from P(i, j) → [position, normal, u, v, colour?], facing the side the normals point to. */
function surf(b, P, NI, NJ) { for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) b.quad(P(i + 1, j), P(i, j), P(i, j + 1), P(i + 1, j + 1)); }
/** A windbreak of bent branches covered with grass and leafy brush, open towards +x. */
function brushShelter(seed) {
  const r = rng(seed), th = new Builder(), wood = new Builder(), R = 1.75, H = 1.5, a0 = 1.0, a1 = TAU - 1.0, w = [r() * 6, r() * 6];
  const at = (a, e, k = 1) => { const q = 1 + 0.06 * sin(a * 3.1 + w[0]) + 0.05 * sin(e * 4 + a * 1.3 + w[1]), c = cos(e) * R * q * k; return [c * cos(a), sin(e) * H * q * k, c * sin(a)]; };
  surf(th, (i, j) => { const a = a0 + (a1 - a0) * i / 14, e = (j / 6) * 1.5708; return [at(a, e), norm(cos(e) * cos(a), sin(e) * 1.1 + 0.1, cos(e) * sin(a)), i / 14 * 4, 1.3 - j / 6 * 1.3, [0.9 + 0.2 * r(), 0.9 + 0.15 * r(), 0.85]]; }, 14, 6);
  for (let k = 0; k < 6; k++) { const a = a0 + (a1 - a0) * (k + 0.5 * (k % 2)) / 5.5, pts = []; for (let j = 0; j <= 5; j++) pts.push(at(a, j / 5 * 1.5, 1.035)); tube(wood, pts, () => 0.022, 4, 1); }
  for (const e of [0.5, 1.0]) { const pts = []; for (let i = 0; i <= 10; i++) pts.push(at(a0 + (a1 - a0) * i / 10, e, 1.04)); tube(wood, pts, () => 0.016, 3, 1); }
  // bedding of cut grass inside
  const bed = part(new THREE.SphereGeometry(1, 10, 5), 0xa89858, -0.35, 0.02, 0, 0, 0, 0, 1.1, 0.07, 0.95);
  return { thatch: th.build(), wood: wood.build(), bed };
}
/** A big carcass on its side: hide, opened flank, ribs, skull and tusks. */
function carcass() {
  const g = [ball(1, HIDE_C, 0, 0.55, 0, 1.7, 0.66, 0.95, 2), ball(1, HIDE_C, -1.45, 0.5, 0.05, 0.85, 0.55, 0.8, 2), ball(1, MEAT, 0.35, 0.8, 0.3, 0.9, 0.42, 0.6, 1), ball(1, HIDE_C, 2.0, 0.5, -0.1, 0.62, 0.55, 0.52, 2)];
  for (let i = 0; i < 8; i++) g.push(part(new THREE.TorusGeometry(0.62 - 0.025 * Math.abs(i - 3.5), 0.03, 5, 10, 2.7), BONE, -0.3 + i * 0.19, 0.6, 0.32, 0, 1.5708, 0.45));
  for (const s of [1, -1]) g.push(part(new THREE.TorusGeometry(0.75, 0.05, 5, 8, 1.3), 0xe6dcc2, 2.6, 0.1, s * 0.32 - 0.1, 1.5708 - s * 0.25, 0, -0.2));   // tusks
  for (const [x, z, a, up] of [[-1.5, -1.0, 1.35, 0], [-1.2, -1.05, 1.75, 0.25], [0.9, -1.0, 1.3, 0], [1.25, -1.1, 1.8, 0.3]]) g.push(cyl(0.2, 0.26, 1.5, HIDE_C, x, 0.24 + up, z, 8, 1.5708 - up * 0.6, 0, a - 1.5708));   // legs
  g.push(cyl(0.07, 0.16, 1.5, HIDE_C, 2.75, 0.12, 0.55, 7, 1.5708, 0.9, 0), part(new THREE.SphereGeometry(1, 10, 6), HIDE_C, 1.75, 0.82, 0.0, 0, 0, 0.3, 0.5, 0.06, 0.6));               // trunk, ear
  for (const [x, z, a] of [[-1.7, 1.3, 0.4], [-0.6, 1.6, 1.9], [0.9, 1.5, 0.9]]) g.push(cyl(0.035, 0.045, 0.7, BONE, x, 0.04, z, 5, 1.5708, a, 0));
  return g;
}
// ---------- the mountains beyond the lake (too far for the fog to leave anything but a shape) ----------
function mountain(R, H, crater, seed, rag = 1) {
  const r = rng(seed), N = 14;
  const pts = []; for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new THREE.Vector2(R * (crater + (1 - crater) * (1 - t) ** 1.7), H * t ** 0.85)); }
  pts.push(new THREE.Vector2(R * crater * 0.82, H * 0.93), new THREE.Vector2(0.01, H * 0.9));
  const g = new THREE.LatheGeometry(pts, 40), p = g.attributes.position, col = new Float32Array(p.count * 3), ph = [r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)), t = p.getY(i) / H, gul = 0.5 + 0.5 * sin(a * 23 + ph[0]) * sin(a * 9 + ph[1]);
    const k = 1 + 0.06 * gul * (1 - t); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
    p.setY(i, p.getY(i) * (1 + rag * t * t * (0.07 * sin(a * 3 + ph[1]) + 0.05 * sin(a * 7 + ph[0]) + 0.03 * sin(a * 13))));
    const c = (0.98 - 0.2 * gul * (0.3 + t) - 0.3 * t) * (0.8 + 0.2 * cos(a + 2.2)); col.set([c, c, c * 1.03], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

function build({ world, group }) {
  const r = rng(7021), T = shared(), X = floraTextures(), K = makeKinds();
  const H = (x, z) => world.heightAt(x, z);
  const CAMP = [45, -15], QUARRY = [-72, 78], DIG = [28, 118], PARAN = [-25, -112], TREE = [53, -27];
  let bx = 110; while (H(bx, 48) > 5.5 && bx < 260) bx += 0.5; const BUTCH = [bx, 48];          // the carcass lies just above the highest lake
  let fx = 110; while (H(fx, -70) > 3.25 && fx < 260) fx += 0.25;                                // where the fishers stand
  const keep = [[...CAMP, 24], [...BUTCH, 9], [...QUARRY, 10], [...DIG, 14], [...PARAN, 10], [14, 0, 7]];
  const open = (x, z, m = 1) => keep.every(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) > kr * m);
  const dryLand = (x, z) => H(x, z) > 5.6 && x > -280 && x < 280;

  // ----- plants -----
  const bark = new THREE.MeshStandardMaterial({ map: T.barkMap, normalMap: T.barkNormal, color: 0x6a5a48, roughness: 0.95 }), thorn = leafMat(X.elm, { sway: 0.008 });
  const sets = [], olive = () => { const g = 0.62 + r() * 0.3; return [g * (0.95 + r() * 0.3), g, g * (0.6 + r() * 0.25)]; }, lush = () => { const g = 0.7 + r() * 0.3; return [g * (0.85 + r() * 0.25), g, g * (0.7 + r() * 0.2)]; },
    grey = () => { const g = 0.55 + r() * 0.35; return [g * 1.08, g, g * 0.92]; };
  const scatter = (parts, n, place, span, size, tint, cast = true) => {
    const items = [];
    for (let i = 0; i < n; i++) { const q = place(); if (!q) continue; const [a, b] = span(q[0], q[1]); items.push({ x: q[0], z: q[1], s: size[0] + r() * (size[1] - size[0]), rot: r() * TAU, u0: a === -Infinity ? -1 : Y(a), u1: b === Infinity ? 2 : Y(b), tint: (q[2] || tint)() }); }
    if (items.length) sets.push(new Field(world, group, parts, items, { cast, grid: items.length < 40 ? 1 : 3 }));
  };
  const plain = (xr = 560, zr = 620, x0 = -60) => () => { for (let k = 0; k < 30; k++) { const x = (r() * 2 - 1) * xr + x0, z = (r() * 2 - 1) * zr; if (H(x, z) > 5.8 && H(x, z) < 60 && open(x, z)) return [x, z]; } return null; };
  const scarp = () => [-340 - r() * 420, (r() * 2 - 1) * 620];
  const always = () => [-Infinity, Infinity], some = (...fs) => () => fs[r() * fs.length | 0]();
  const AC = [acacia(11, {}, bark, thorn), acacia(12, { h: 8, wide: 7.5, rad: 0.32 }, bark, thorn)];
  for (const a of AC) scatter(a, 85, some(plain(), plain(250, 330, -30), scarp), () => [r() < 0.5 ? -Infinity : -6e6 + r() * 4e6, Infinity], [0.8, 1.35], olive);
  scatter(AC[1], 1, () => TREE, always, [1.45, 1.45], olive);                                       // the camp's shade tree
  // the older, wetter country: woodland that thins as Africa dries
  scatter(K.broadleaf, 150, some(plain(), plain(240, 380, -50), plain(240, 380, -50)), () => [-Infinity, -3.8e6 + r() * 2.4e6], [0.7, 1.3], lush);
  // fig and fever trees along the stream and the river, doum palms by the lake
  scatter(K.broadleafC, 70, some(() => { const x = -280 + r() * 440, z = streamZ(x) + (r() - 0.5) * 50; return H(x, z) > 5.5 ? [x, z] : null; }, () => { const z = (r() * 2 - 1) * 700; return [riverX(z) + (r() < 0.5 ? -1 : 1) * (30 + r() * 26), z]; }), always, [0.7, 1.4], lush);
  scatter(K.palmB, 34, () => { for (let k = 0; k < 40; k++) { const z = (r() * 2 - 1) * 520, x = shoreAt(z) - 95 + r() * 75; if (H(x, z) > 5.2 && H(x, z) < 8 && open(x, z)) return [x, z]; } return null; }, always, [0.6, 1.0], lush);
  scatter(K.shrub, 380, some(plain(480, 560), plain(240, 300, -20), scarp), always, [0.8, 2.0], olive, false);
  scatter(K.shrubB, 260, scarp, always, [2.2, 4.5], olive, false);                                   // thorn scrub up the rift wall
  // granite: the kopje's piled boulders, loose stone on the plain and along the stream, dark lava cobbles at the outcrop
  const dark = () => { const g = 0.16 + r() * 0.1; return [g, g * 0.96, g * 0.95]; };
  scatter(K.rockC, 34, () => { const a = r() * TAU, d = Math.sqrt(r()) * 34; return [KOPJE[0] + cos(a) * d, KOPJE[1] + sin(a) * d]; }, always, [1.6, 4.5], grey);
  scatter(K.rockC, 100, some(plain(420, 500), () => { const x = -270 + r() * 400; return [x, streamZ(x) + (r() - 0.5) * 16]; }), always, [0.3, 1.1], grey);
  scatter(K.rockB, 30, () => { const a = r() * TAU, d = 3.5 + Math.sqrt(r()) * 11; return [QUARRY[0] + cos(a) * d, QUARRY[1] + sin(a) * d]; }, always, [0.25, 0.7], dark);

  // ----- scenery -----
  const stuff = new Stuff(world, group), fires = new Fires(group);
  stuff.mat('plain', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))
    .mat('rock', new THREE.MeshStandardMaterial({ vertexColors: true, map: T.rockMap, normalMap: T.rockNormal, roughness: 0.95 }))
    .mat('wood', new THREE.MeshStandardMaterial({ vertexColors: true, map: T.barkMap, color: 0x8a7458, roughness: 0.95 }))
    .mat('thatch', new THREE.MeshStandardMaterial({ vertexColors: true, map: thatchTex(), roughness: 1, side: THREE.DoubleSide }));
  const solid = [];   // [x, z, radius, u0, u1] the visitor walks round
  const block = (x, z, rad, from = -Infinity, to = Infinity) => solid.push([x, z, rad, from === -Infinity ? -1 : Y(from), to === Infinity ? 2 : Y(to)]);
  const fireAt = (x, z, o) => fires.add(x, drawnGround(world, x, z) + 0.06, z, o);
  block(TREE[0], TREE[1], 0.7);

  // the carcass at the lake's edge: one in the knappers' time, another for the hand-axe makers
  for (const [from, to, dx, rot] of [[H0, H1, 0, 0.5], [H1, S0, 2.5, 2.4]]) { stuff.add('plain', carcass(), BUTCH[0] + dx, BUTCH[1], { rot, from, to }); stuff.add('rock', debitage(31, 40, 3.2, to === S0 ? 6 : 0), BUTCH[0] + dx, BUTCH[1], { from, to }); block(BUTCH[0] + dx, BUTCH[1], 1.9, from, to); }
  // Lomekwi: anvil stones by the stream
  stuff.add('rock', [ball(0.3, LAVA, 0, 0.08, 0, 1.3, 0.5, 1, 1), ball(0.24, LAVA, 1.4, 0.06, 0.5, 1.2, 0.5, 1, 1), ...debitage(5, 18, 1.6)], PARAN[0], PARAN[1], { from: LOM, to: H0 });
  // the knappers' camp under the tree, with the ring of lava blocks found at Olduvai
  const ring = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ring.push(ball(0.2 + r() * 0.1, LAVA, cos(a) * 2.1, 0.1, sin(a) * 2.1, 1.2, 0.75, 1, 1)); }
  stuff.add('rock', ring, CAMP[0] - 6, CAMP[1] + 7, { from: H0, to: H1 });
  stuff.add('rock', debitage(41, 70, 3.4), CAMP[0] + 6.5, CAMP[1] - 6, { from: H0, to: H1 });
  stuff.add('rock', debitage(42, 80, 3.6, 14), CAMP[0] + 6.5, CAMP[1] - 6, { from: H1, to: S0 });
  stuff.add('rock', debitage(43, 60, 2.6, 3), CAMP[0] + 7, CAMP[1] - 6, { from: S0 });
  stuff.add('rock', [ball(0.34, LAVA, 0, 0.1, 0, 1.2, 0.55, 1, 1)], CAMP[0] + 6.5, CAMP[1] - 6, { from: H0 });
  stuff.add('rock', debitage(44, 90, 5, 8), QUARRY[0], QUARRY[1], { from: H0 });
  // hearths: bare fires at first, stone-ringed in our own time
  stuff.add('plain', hearth(1, false), CAMP[0], CAMP[1], { from: FIRE, to: S0 }); fireAt(CAMP[0], CAMP[1], { from: FIRE, to: S0, size: 0.9 });
  const F1 = CAMP, F2 = [CAMP[0] - 6.5, CAMP[1] + 5.5];
  for (const [f, size] of [[F1, 1], [F2, 1.3]]) { stuff.add('plain', hearth(f[0], true), f[0], f[1], { from: S0 }); fireAt(f[0], f[1], { from: S0, size, smoke: 9 }); block(f[0], f[1], 0.7, S0); }
  block(CAMP[0], CAMP[1], 0.7, FIRE, S0);
  // our own camp: brush shelters in a ring, opening on the fires; red ochre where it is ground
  const SHELTER = [20, 75, 128, 205, 258, 312].map((d, i) => { const a = d * Math.PI / 180, x = CAMP[0] + cos(a) * 14.5, z = CAMP[1] + sin(a) * 14.5; return [x, z, facing(x, z, CAMP[0], CAMP[1]), i]; });
  for (const [x, z, rot, i] of SHELTER) { const s = brushShelter(60 + i); stuff.add('thatch', [s.thatch, s.bed], x, z, { rot, from: S0, s: 1 + 0.12 * sin(i * 2.1) }); stuff.add('wood', s.wood, x, z, { rot, from: S0, s: 1 + 0.12 * sin(i * 2.1) }); block(x, z, 1.5, S0); }
  const OCH = [CAMP[0] + 2, CAMP[1] - 9.5];
  stuff.add('plain', [part(new THREE.CircleGeometry(0.9, 12), OCHRE, 0, 0.02, 0, -1.5708), ball(0.09, OCHRE, 0.5, 0.05, 0.4), ball(0.07, OCHRE, -0.4, 0.04, 0.5), ball(0.11, 0x9a3418, 0.2, 0.06, -0.6)], OCH[0] + 0.6, OCH[1], { from: S0 });
  stuff.build(); fires.build();

  // the volcano: a smoking cone until it founders into a caldera, with an older, quieter neighbour
  const farMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), haze = [0, 0, 0], BLUE = [0.36, 0.43, 0.56];
  const cone = new THREE.Mesh(mountain(2700, 1500, 0.07, 3, 0.25), farMat), caldera = new THREE.Mesh(mountain(2900, 640, 0.5, 4), farMat), other = new THREE.Mesh(mountain(1900, 700, 0.12, 5, 0.4), farMat);
  cone.position.set(5200, -30, -1500); caldera.position.copy(cone.position); other.position.set(4300, -30, 2600);
  const pg = new THREE.CylinderGeometry(520, 60, 1500, 12, 6, true).translate(0, 750, 0), pp = pg.attributes.position, pc = new Float32Array(pp.count * 4);
  for (let i = 0; i < pp.count; i++) { const t = pp.getY(i) / 1500; pp.setX(i, pp.getX(i) + 900 * t * t); pc.set([1, 1, 1, sin(Math.PI * Math.min(1, t * 1.2)) * (1 - 0.6 * t)], i * 4); }
  pg.setAttribute('color', new THREE.BufferAttribute(pc, 4));
  const plume = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0xd8d4d0, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  plume.position.set(5200, 1440, -1500);
  for (const m of [cone, caldera, other, plume]) { m.frustumCulled = false; m.renderOrder = -5; group.add(m); }
  const U_COLLAPSE = Y(-1.95e6), U_SMOKE = Y(-2.7e6);

  // ----- animals -----
  const beasts = new Beasts(world, group, 9), away = (x, z) => dryLand(x, z) && open(x, z, 1.2);
  beasts.add('mastodon', 3, -7e6, Infinity, { at: [125, -200], R: [34, 44], spread: 14, speed: 0.8, scale: [0.85, 1.1], ok: away });
  beasts.add('mastodon', 2, -7e6, A0, { at: [30, 40], R: [45, 55], spread: 10, speed: 0.8, ok: dryLand });
  beasts.add('doe', 8, -7e6, Infinity, { at: [-185, -45], R: [40, 48], spread: 20, speed: 0.9, scale: [0.9, 1.25], ok: away });
  beasts.add('doe', 5, -7e6, Infinity, { at: [110, 215], R: [30, 38], spread: 16, speed: 0.9, scale: [0.8, 1.05], ok: away });
  beasts.add('horse', 5, -7e6, Infinity, { at: [-70, 270], R: [45, 55], spread: 18, speed: 1.1, scale: [0.72, 0.85], ok: away });
  beasts.add('wolf', 3, -3.5e6, Infinity, { at: [BUTCH[0] - 12, BUTCH[1] + 34], R: [11, 13], spread: 6, speed: 1.3, scale: [0.5, 0.58], ok: dryLand });   // jackals waiting their turn
  beasts.add('hawk', 4, -7e6, Infinity, { at: [BUTCH[0], BUTCH[1]], R: [18, 40], spread: 10, speed: 8, fly: 34, apart: true, scale: [1.3, 1.6] });        // vultures
  beasts.add('crow', 3, -7e6, Infinity, { at: [CAMP[0], CAMP[1]], R: [20, 50], spread: 30, speed: 8, fly: 16, apart: true });

  // ----- people -----
  const SK = [[0.36, 0.24, 0.17], [0.3, 0.2, 0.14], [0.42, 0.28, 0.19], [0.26, 0.17, 0.13]].map((c) => c.map((v) => v ** 2.2)), FUR = [0.035, 0.026, 0.02];
  const KIND = {
    // upright apes: small, dark-haired all over
    ape: () => { const k = 0.8 + r() * 0.5, c = FUR.map((v) => v * k); return { s: 0.6 + r() * 0.12, skin: SK[3], tint: c, legs: c, hair: [0.2, 0.2, 0.22] }; },
    robust: () => { const k = 0.9 + r() * 0.5, c = FUR.map((v) => v * k); return { s: 0.68 + r() * 0.1, skin: SK[3], tint: c, legs: c, hair: [0.2, 0.2, 0.22] }; },
    // the first Homo: small and unclothed (the wrap takes the colour of the skin)
    habilis: () => { const sk = SK[r() * 4 | 0], c = sk.map((v) => v * 0.8); return { s: 0.7 + r() * 0.1, skin: sk, tint: c, legs: c }; },
    erectus: () => { const sk = SK[r() * 4 | 0], c = sk.map((v) => v * 0.8); return { s: 0.94 + r() * 0.08, skin: sk, tint: c, legs: c }; },
    sapiens: () => ({}), child: () => ({ s: 0.5 + r() * 0.22 }),
  };
  const L = [];
  /** One person: kind, [from, to] years, action, where, heading, and anything else an actor takes. */
  const put = (kind, span, action, x, z, rot, o = {}) => L.push({ outfit: (o.f ?? r() < 0.5) ? 'paleo-f' : 'paleo', action, x, z, rot, u0: Y(span[0]), u1: span[1] === Infinity ? Infinity : Y(span[1]), ...KIND[kind](), ...o });
  /** n people round a point, facing it. */
  const circle = (kind, span, actions, cx, cz, rad, n, o = {}, a0 = 0, arcLen = TAU) => { for (let i = 0; i < n; i++) { const a = a0 + (i + (o.jit ? (r() - 0.5) * 0.5 : 0)) / n * arcLen, x = cx + cos(a) * rad * (1 + (r() - 0.5) * 0.12), z = cz + sin(a) * rad; put(kind, span, actions[i % actions.length], x, z, facing(x, z, cx, cz), o); } };
  const [cx, cz] = CAMP, AP = [A0, -2.0e6], HA = [H0, H1], ER = [H1, S0], ERF = [FIRE, S0], SA = [S0, Infinity];
  const toLake = [[cx + 19, cz + 4], [100, 22], [BUTCH[0] - 6, BUTCH[1] - 2]], toQuarry = [[cx - 12, cz + 20], [-20, 52], [QUARRY[0] + 7, QUARRY[1] - 3]], toDig = [[cx + 4, cz + 20], [36, 70], [DIG[0] + 3, DIG[1] - 9]];
  const walkers = (kind, span, action, path, n, o = {}) => { for (let i = 0; i < n; i++) put(kind, span, action, path[0][0], path[0][1], 0, { path, phase: (i + r() * 0.5) / n, ...o }); };

  // upright apes: a family crossing the plain in file, others resting and feeding under the trees
  const trail = [[-235, 95], [-150, 60], [-60, 30], [20, 55], [95, 20], [150, -45]];
  for (let i = 0; i < 4; i++) put('ape', AP, 'walk', 0, 0, 0, { path: trail.map(([x, z]) => [x + i * 0.3, z + (i % 2) * 0.9]), phase: 0.3 + i * 0.006, speed: 1.0 });
  circle('ape', AP, ['sit', 'crouch', 'sit', 'sleep', 'crouch', 'stand'], TREE[0] + 1, TREE[1] + 4, 3.6, 6, { jit: 1 });
  circle('ape', AP, ['crouch', 'stand', 'crouch', 'sit'], DIG[0], DIG[1], 4, 4, { jit: 1 });
  // Lomekwi: the first knappers, three of them, at the anvil stones
  circle('ape', [LOM, H0], ['knap', 'crouch', 'knap'], PARAN[0] + 0.5, PARAN[1] + 0.2, 1.3, 3);
  // Paranthropus: the heavy-jawed cousins, feeding along the stream
  circle('robust', [-2.3e6, -1.2e6], ['crouch', 'sit', 'crouch', 'stand', 'crouch', 'sit', 'walk'], PARAN[0] - 14, PARAN[1] - 6, 5.5, 7, { jit: 1 });

  // Oldowan: knapping, cutting up the carcass, carrying stone and meat, resting under the tree
  circle('habilis', HA, ['knap'], cx + 6.5, cz - 6, 1.5, 5);
  circle('habilis', HA, ['sit', 'crouch', 'sit', 'sleep', 'crouch', 'sit', 'sleep'], cx - 6, cz + 7, 3.6, 7, { jit: 1 });
  circle('habilis', HA, ['crouch', 'stand', 'sit', 'crouch'], TREE[0] - 1, TREE[1] + 5, 3, 4, { jit: 1 });
  circle('habilis', HA, ['scrape'], BUTCH[0] + 0.2, BUTCH[1] + 0.2, 2.2, 5, { prop: 'handaxe' }, 0.4);
  circle('habilis', HA, ['stand', 'point', 'stand'], BUTCH[0] - 3, BUTCH[1] + 3, 5.5, 3, { prop: 'none' }, 1.2, 3);
  walkers('habilis', HA, 'carry', toLake, 4, { prop: 'sack' });
  walkers('habilis', HA, 'walk', toQuarry, 5, { prop: 'hammerstone' });
  circle('habilis', HA, ['knap', 'crouch', 'knap'], QUARRY[0], QUARRY[1], 2.4, 4, { jit: 1 });
  circle('habilis', HA, ['crouch', 'dig', 'crouch', 'stand'], DIG[0], DIG[1], 4.5, 5, { jit: 1 });

  // hand-axe makers: the same places, taller people, a fire after a while, hunters out on the plain
  circle('erectus', ER, ['knap'], cx + 6.5, cz - 6, 1.7, 6);
  circle('erectus', [H1, FIRE], ['sit', 'sleep', 'sit', 'crouch', 'talk', 'sit', 'sleep', 'stand'], cx, cz, 3.4, 8, { jit: 1 });
  circle('erectus', ERF, ['tend-fire', 'sit', 'sit', 'tend-fire', 'sit', 'sit', 'sit'], cx, cz, 1.25, 7, { prop: 'none' });
  circle('erectus', ERF, ['sleep', 'talk', 'stand', 'sleep'], cx, cz, 4.6, 4, { jit: 1 }, 0.7);
  circle('child', ER, ['sit', 'crouch', 'stand', 'crouch'], cx - 5, cz + 6, 2, 4, { jit: 1 });
  circle('erectus', ER, ['scrape'], BUTCH[0] + 2.7, BUTCH[1] + 0.2, 2.3, 6, { prop: 'handaxe' }, 0.2);
  circle('erectus', ER, ['stand', 'point'], BUTCH[0] - 2, BUTCH[1] + 5, 6, 2, { prop: 'staff' }, 1.4, 2);
  walkers('erectus', ER, 'carry', toLake, 5, { prop: 'sack' });
  walkers('erectus', ER, 'walk', toQuarry, 4, { prop: 'hammerstone' });
  circle('erectus', ER, ['knap', 'knap', 'crouch'], QUARRY[0], QUARRY[1], 2.6, 5, { jit: 1 });
  circle('erectus', ER, ['dig', 'dig', 'crouch'], DIG[0], DIG[1], 5, 6, { jit: 1, f: true });
  walkers('erectus', ER, 'carry', toDig, 3, { prop: 'sack', f: true });
  const hunt = [[-120, -20], [-150, -30], [-172, -52]];
  for (let i = 0; i < 6; i++) put('erectus', ER, 'stalk', 0, 0, 0, { path: hunt.map(([x, z]) => [x + (i % 3) * 3, z + (i % 2) * 4 + i]), phase: 0.1 + i * 0.03, prop: 'staff', f: false, speed: 0.55 });

  // Homo sapiens: the camp
  circle('sapiens', SA, ['tend-fire', 'sit', 'cook', 'sit', 'sit', 'tend-fire', 'sit', 'sit'], F1[0], F1[1], 1.3, 8, { prop: 'none' });
  circle('child', SA, ['sit', 'crouch', 'sit'], F1[0], F1[1], 2.3, 3, { jit: 1 }, 2);
  circle('sapiens', SA, ['dance'], F2[0], F2[1], 2.5, 7, {}, 0.3);
  circle('child', SA, ['dance', 'dance'], F2[0], F2[1], 3.6, 2, {}, 1.5, 2);
  circle('sapiens', SA, ['pray', 'talk'], F2[0], F2[1], 4.2, 2, {}, 3.6, 1.2);
  circle('sapiens', SA, ['knap'], cx + 7, cz - 6, 1.6, 4, { f: false });
  for (let i = 0; i < 3; i++) put('sapiens', SA, 'scrape', cx - 8.5 + i * 0.4, cz - 8 + i * 1.7, 0.4, { f: true });
  for (let i = 0; i < 2; i++) put('sapiens', SA, 'grind', OCH[0], OCH[1] - 0.8 + i * 1.6, 0, { f: i === 0 });
  for (const i of [1, 4]) { const [x, z, rot] = SHELTER[i]; put('sapiens', SA, 'sleep', x - cos(rot) * 0.3, z + sin(rot) * 0.3, rot + 1.57); }
  for (const i of [0, 3]) { const [x, z, rot] = SHELTER[i]; put('sapiens', SA, 'sit', x + cos(rot) * 1.5, z - sin(rot) * 1.5, rot); }
  circle('sapiens', SA, ['talk', 'stand', 'talk'], cx + 9, cz + 5, 0.9, 3);
  const round = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU; round.push([cx + cos(a) * 19.5, cz + sin(a) * 19.5]); }
  walkers('child', SA, 'walk', round, 4, { speed: 2.1 });
  // … and its work: gathering roots, bringing in the kill, stone from the outcrop, hunters, a lookout on the kopje, fishers
  circle('sapiens', SA, ['dig', 'dig', 'crouch', 'dig'], DIG[0], DIG[1], 5.5, 8, { jit: 1, f: true });
  circle('child', SA, ['crouch', 'stand'], DIG[0] + 2, DIG[1] + 1, 2, 3, { jit: 1 });
  walkers('sapiens', SA, 'carry', toDig, 4, { prop: 'sack', f: true });
  walkers('sapiens', SA, 'carry', toLake, 4, { prop: 'sack' });
  walkers('sapiens', SA, 'walk', toQuarry, 3, { prop: 'hammerstone' });
  circle('sapiens', SA, ['knap', 'knap', 'crouch'], QUARRY[0], QUARRY[1], 2.6, 4, { jit: 1, f: false });
  for (let i = 0; i < 7; i++) put('sapiens', SA, 'stalk', 0, 0, 0, { path: hunt.map(([x, z]) => [x + (i % 3) * 3, z + (i % 2) * 4 + i]), phase: 0.1 + i * 0.03, f: false, speed: 0.55 });
  put('sapiens', SA, 'spear', -160, -30, facing(-160, -30, -185, -45), { f: false }); put('sapiens', SA, 'spear', -156, -36, facing(-156, -36, -185, -45), { f: false });
  circle('sapiens', SA, ['point', 'stand', 'guard'], KOPJE[0] + 30, KOPJE[1] - 22, 1.2, 3, { prop: 'spear', f: false });
  for (let i = 0; i < 4; i++) put('sapiens', [FISH, Infinity], 'fish', fx + (i % 2) * 1.2, -70 + i * 7, 0.2 * (i % 2), { f: false });
  walkers('sapiens', [-132e3, FISH], 'carry', [[cx + 19, cz + 4], [110, 10], [fx + 30, -40]], 4, { prop: 'waterskin' });   // the long walk for water in the drought
  // the band that leaves, walking north along the shore
  const north = [[cx + 22, cz - 8], [120, -90], [150, -230], [140, -370]];
  for (let i = 0; i < 9; i++) put(i % 3 === 2 ? 'child' : 'sapiens', [-76e3, Infinity], i % 4 === 1 ? 'carry' : 'walk', 0, 0, 0, { path: north.map(([x, z]) => [x + (i % 3) * 1.2, z]), phase: 0.02 * i, prop: i % 4 === 1 ? 'sack' : i % 4 === 0 ? 'spear' : 'none', speed: 1.1 });

  const cast = actors(world, L, { seed: 12 }); group.add(...cast.meshes);

  let uNow = 0;
  return {
    update(u, t, env, camera, view) {
      uNow = u;
      for (const s of sets) s.update(u);
      stuff.update(u); fires.update(u, t); beasts.update(u, t, camera); cast.update(u, t, view);
      tone(haze, env.hor, BLUE, 0.42); farMat.color.setRGB(haze[0], haze[1], haze[2], THREE.SRGBColorSpace);
      cone.visible = u < U_COLLAPSE; caldera.visible = !cone.visible; plume.visible = u > U_SMOKE && u < U_COLLAPSE;
    },
    collide(pos) {
      for (const [x, z, rad, u0, u1] of solid) {
        if (uNow < u0 || uNow >= u1) continue;
        const dx = pos.x - x, dz = pos.z - z, d = Math.hypot(dx, dz), R = rad + 0.5;
        if (d < R && d > 1e-4) { pos.x = x + dx / d * R; pos.z = z + dz / d * R; }
      }
    },
  };
}

export default { place: 'East African Rift · Olduvai Gorge', coords: [-2.99, 35.35], terrain, spawn: { x: 14, z: 0, yaw: -1.15 }, env, events, build };
