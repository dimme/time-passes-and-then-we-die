// Ice-age Europe, 70 to 14 thousand years ago: a limestone valley in the Dordogne, like the Vézère between Le Moustier,
// La Madeleine and Lascaux. Rock shelters under the cliff, a painted cave in it, steppe and a cold river below.
// Neanderthals have the valley first; our own kind arrives about 42,000 years ago and, much later, paints the cave.
import * as THREE from 'three';
import { rng, smooth, part, ball, cyl } from './util.js?v=c0a40a57';
import { shared, canvasTex } from './textures.js?v=c0a40a57';
import { makeKinds } from './flora.js?v=c0a40a57';
import { Builder, norm, tube } from './flora-geo.js?v=c0a40a57';
import { actors } from './people-actors.js?v=c0a40a57';
import { Y, TAU, keyed, rgb, tone, facing, drawnGround, Stuff, Fires, Beasts, Field, hideTex, hearth, debitage } from './site-africa-kit.js?v=c0a40a57';

const sin = Math.sin, cos = Math.cos, exp = Math.exp;

// ---------- the land ----------
const T = 8, FLOOD = 3.2, PLATEAU = 46, BACK = 58;                       // the terrace under the cliff, the valley floor, the top
const cliffX = (z) => 78 + 9 * sin(z * 0.012) + 5 * sin(z * 0.031 + 1);     // the foot of the cliff (rock to the east of it)
const riverX = (z) => -200 + 14 * sin(z * 0.009);
function base(x, z) {
  let h = T - (T - FLOOD) * smooth((10 - x) / 60);
  if (x < 10) h += 0.5 * sin(x * 0.04 + z * 0.02) * sin(z * 0.035) * smooth((10 - x) / 40);
  h -= 6.5 * exp(-(((x - riverX(z)) / 24) ** 2));
  if (x < -245) { const k = smooth((-x - 245) / 260); h += 62 * k + 5 * sin(z * 0.02 + x * 0.01) * k; }
  const e = x - cliffX(z) - BACK; if (e > 0) { const k = smooth(e / 50); h += (PLATEAU - T) * k + 2.5 * sin(z * 0.03 + x * 0.02) * k; }
  return h;
}
const terrain = { base, relief: () => 0, bounds: { x: 215, z: 250 }, tint: (x, z, b) => (b > 12 ? 0.86 : 1) };

// the cliff: how far its face stands back from the foot line at height y, with rock shelters hollowed under it
const SHELTERS = [[-70, 30, 5.5], [58, 20, 4.2]];   // [centre z, half length, depth]
const hollow = (z) => { let d = 0; for (const [c, half, deep] of SHELTERS) d = Math.max(d, deep * smooth((half - Math.abs(z - c)) / 8)); return d; };
const cliffH = (z) => (35 + 4 * sin(z * 0.021 + 1) + 2.5 * sin(z * 0.057)) * (1 - 0.86 * smooth((Math.abs(z) - 262) / 80));
function faceOff(z, y) {
  const strata = 0.55 * sin(y * 1.9 + 2 * sin(z * 0.013)) + 0.35 * sin(y * 0.73 + z * 0.02);
  return 0.085 * y + strata * smooth(y / 3) + 1.6 * sin(z * 0.047 + y * 0.11) * smooth(y / 6) + 0.7 * sin(z * 0.19 + y * 0.3) + hollow(z) * exp(-(((y - 1.3) / 2.3) ** 2));
}
const footX = (z) => cliffX(z) + faceOff(z, 0.8);   // where the rock stops a walker

// the cave: a passage into the hill that opens into a painted hall and pinches out beyond it
const CAVE_Z = 5, X0 = cliffX(CAVE_Z);
const PASSAGE = [[0, 2.5, 3.2], [9, 1.7, 2.5], [19, 3.0, 3.9], [30, 4.6, 5.6], [42, 3.6, 4.6], [49, 1.6, 2.7], [55, 0.3, 0.5]];   // [distance in, half width, height]
const U_HANDS = Y(-27e3), U_PAINT = Y(-19e3), U_LAMPS = Y(-37e3);
let inside = 0;   // how far into the cave the visitor is (0 outside … 1 well in): no grass or snow in there

// ---------- the years ----------
const N0 = -70e3, SAP = -42e3, N1 = -40e3, MARKS = -37e3, PAINT = -19e3, MAGD = -17e3, DOGS = -15e3;
const COLD = [[-70e3, 0.55], [-60e3, 0.35], [-50e3, 0.3], [-40e3, 0.4], [-30e3, 0.6], [-25e3, 1], [-19e3, 0.92], [-16.5e3, 0.6], [-14.7e3, 0.3], [-14e3, 0.15]];
const C = { steppe: rgb(0x8a8558), frost: rgb(0xa3a288), top: rgb(0x6a9cc8), hor: rgb(0xdde6ea), horCold: rgb(0xe8eef2), water: rgb(0x4f7068), sun: rgb(0xfff2dc) };

const events = [
  [N0, 'Neanderthal valley', 'A limestone valley at the edge of the cold. Under the overhang a band of Neanderthals keeps a fire, flakes flint and scrapes hides. Their kind has lived along this river for two thousand centuries.', 'The ice is advancing again. In Africa a few thousand people of another kind are setting out.'],
  [-55e3, 'The hunt', 'Reindeer, horse and bison cross the valley floor with the seasons. The hunters close in with heavy stone-tipped spears. A kill is meat, marrow, fat, hide and sinew.', 'People out of Africa are reaching Australia, by sea.'],
  [-45e3, 'A burial', 'Under the southern overhang a body is laid in a pit, knees drawn up, and covered.', 'At La Ferrassie, a short walk from this river, Neanderthals bury their dead: adults, children, a newborn.'],
  [SAP, 'Newcomers', 'Strangers come up the river: tall, lightly built, in sewn clothes, with tents of hide. For a while two kinds of human share the valley.', 'Homo sapiens has reached western Europe. In a cave on the upper Danube someone makes a flute from a vulture\'s wing bone.'],
  [N1, 'Alone', 'The overhang where the Neanderthals lived has other people\'s fires in it. Nobody makes the old tools now.', 'The Neanderthals are gone, though not quite: people outside Africa will carry a little of them in every cell.'],
  [MARKS, 'Marks on stone', 'On fallen blocks under the shelter people peck out rings and animals and rub them red. Some carry a torch into the cave in the cliff.', 'Abri Castanet, here in the Dordogne: among the oldest art in Europe. At Chauvet, lions and rhinoceroses are drawn in charcoal.'],
  [-27e3, 'Hands', 'In the cave a hand is pressed to the wall and red ochre blown round it. When the hand is taken away its shape stays.', 'Figures of women are carved from the Atlantic to Siberia; one at Laussel, nearby, holds up a bison horn.'],
  [-24e3, 'The great cold', 'Snow lies in the hollows all summer. The trees are nearly gone: the valley is steppe, wind and reindeer. People hold on here in the south while the north empties.', 'The ice sheets are at their greatest, three kilometres thick over Scandinavia. The sea is 120 metres lower, and Britain is abandoned.'],
  [PAINT, 'The painted cave', 'By the light of tallow lamps, painters cover the walls of the hall inside the hill: aurochs five metres long, horses, stags, rows of dots. Children are brought in to see.', 'Lascaux. The needle with an eye and the spear-thrower are new; people here will go on painting and engraving for thousands of years.'],
  [MAGD + 1000, 'Reindeer people', 'Hide tents on the terrace, salmon drying on racks, antler worked into harpoons. When the herds come the band drums and dances.', 'The ice is in retreat. At La Madeleine, just downstream, someone engraves a mammoth on a piece of its own ivory.'],
  [-14.7e3, 'The thaw', 'The winters loosen. Birch and pine come back up the valley, and the reindeer begin to move north.', 'The wolves that follow the camps are becoming dogs. In the Near East people are settling down beside stands of wild grain.'],
].map(([y, t, h, w]) => ({ y, t, h, w }));

function env(year, e) {
  const cold = keyed(COLD, year), out = 1 - inside;
  e.ice = -60; e.hill = 1; e.sea = 0.3 + 0.5 * (1 - cold) * (year > -16e3 ? 1 : 0.3); e.lava[0] = e.lava[1] = e.lava[2] = 0; e.glow = 0; e.meteor = 0;
  tone(e.ground, C.steppe, C.frost, cold); tone(e.far, C.steppe, C.frost, cold); tone(e.hor, C.hor, C.horCold, cold);
  for (let i = 0; i < 3; i++) { e.top[i] = C.top[i]; e.water[i] = C.water[i]; e.sun[i] = C.sun[i]; e.cloudCol[i] = 1; e.pCol[i] = 1; }
  e.fogD = 0.0017 + 0.0008 * cold; e.sunI = 2.0 - 0.3 * cold; e.sunEl = 0.66; e.sunSize = 0.035; e.amb = 1.0 + 0.1 * cold; e.cloud = 0.45 + 0.25 * cold;
  e.grass = (0.8 - 0.45 * cold) * out; e.precip = Math.max(0, cold - 0.5) * 1.1 * out; e.pVy = -1.5; e.pSize = 0.25;
  e.bloom = 0.25; e.exposure = 1; e.moonHot = 0;
}

// ---------- the cliff and the cave ----------
const ROWS = [0, 0.5, 1.1, 1.8, 2.6, 3.4, 4.3, 5.4, 7, 9, 12, 16, 21, 27, 33, 99], BACKS = [9, 30, 66, 116], DZ = 2.5, Z0 = -340, NZ = 272;
const HOLE = [1, 2, 0, 5];   // columns (from CAVE_Z − 2.5) and rows of the face left open for the cave mouth
function cliffGeo(world) {
  const cols = NZ + 1, rows = ROWS.length + BACKS.length, pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2), idx = [], r = rng(5);
  const iz0 = Math.round((CAVE_Z - 2.5 - Z0) / DZ);
  for (let i = 0; i < cols; i++) {
    const z = Z0 + i * DZ, H = cliffH(z), xf = cliffX(z), streak = Math.max(0, sin(z * 0.37) * sin(z * 0.11 + 2) - 0.25), warm = 0.5 + 0.5 * sin(z * 0.023 + 1);
    for (let j = 0; j < rows; j++) {
      const k = (i * rows + j), top = j >= ROWS.length; let x, y;
      if (!top) { y = j === ROWS.length - 1 ? H : Math.min(ROWS[j], H * (0.4 + 0.04 * j)); x = xf + faceOff(z, y) * (1 - smooth((9 - Math.abs(z - CAVE_Z)) / 4) * smooth((8 - y) / 3)) + (j ? (r() - 0.5) * 0.25 : 0); }
      else { const b = BACKS[j - ROWS.length], f = b / BACKS[BACKS.length - 1]; x = xf + faceOff(z, H) + b; y = H + (world.heightAt(x, z) + 0.6 - T - H) * smooth(f * 1.15) + 1.2 * sin(z * 0.08 + b) * (1 - f); }
      pos.set([x, T + y, z + (j && !top ? (r() - 0.5) * 0.5 : 0)], k * 3); uv.set([z / 16 + (top ? x / 16 : 0), y / 13], k * 2);
      // pale limestone in beds, rust-warm in places, with black streaks where water runs down and shade in the hollows
      const bed = 0.9 + 0.1 * sin(y * 2.3 + 2 * sin(z * 0.013)) + 0.06 * sin(y * 7.1 + z * 0.05), hol = hollow(z) * exp(-(((y - 1.6) / 2.6) ** 2)) / 5.5;
      let c = 0.5 * bed * (1 - 0.28 * streak * smooth(y / 8)) * (1 - 0.5 * hol) * (y < 0.3 ? 0.8 : 1);
      { let soot = 0; for (const [zc, wd, s] of [[-70, 6.5, 1], [-55, 4.5, 0.8], [58, 6, 0.95], [CAVE_Z, 3.4, 0.65]]) soot = Math.max(soot, s * exp(-(((z - zc) / wd) ** 2)));   // smoke of the hearths on the roof of each shelter, and of torches over the cave mouth
        c *= 1 - 0.66 * soot * smooth((y - 1.0) / 2.2) * exp(-((Math.max(0, y - 4.5) / 4.2) ** 2)); }
      if (top) { const f = smooth((BACKS[j - ROWS.length] - 6) / 30); col.set([c * (0.86 - 0.36 * f), c * (0.84 - 0.3 * f), c * (0.74 - 0.38 * f)], k * 3); }   // turf creeping over the top
      else col.set([c * (0.86 + 0.06 * warm), c * (0.82 + 0.02 * warm), c * (0.74 - 0.05 * warm)], k * 3);
    }
  }
  for (let i = 0; i < NZ; i++) for (let j = 0; j < rows - 1; j++) {
    if (i >= iz0 + HOLE[0] - 1 && i < iz0 + HOLE[1] && j >= HOLE[2] && j < HOLE[3]) continue;
    const a = i * rows + j, b = a + rows, c = a + 1, d = b + 1; idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** The passage as a curve: centre, heading and size at every metre in from the mouth. */
function passage() {
  const curve = new THREE.CatmullRomCurve3([[0.9, 0], [9, -1], [18, 4], [30, 7], [43, 5], [50, 0], [56, -2]].map(([x, z]) => new THREE.Vector3(X0 + x, 0, CAVE_Z + z))), n = 57, pts = curve.getSpacedPoints(n - 1), L = curve.getLength(), out = [];
  out.at = (d) => out[Math.max(0, Math.min(n - 1, Math.round(d / L * (n - 1))))];
  for (let i = 0; i < n; i++) {
    const d = (i / (n - 1)) * L, a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], len = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
    out.push({ d, x: pts[i].x, z: pts[i].z, dx, dz, nx: dz, nz: -dx, w: keyed2(PASSAGE, d, 1), h: keyed2(PASSAGE, d, 2) });   // (nx, nz): the left-hand wall going in
  }
  return out;
}
function keyed2(keys, d, k) { if (d <= keys[0][0]) return keys[0][k]; for (let i = 1; i < keys.length; i++) if (d < keys[i][0]) { const a = keys[i - 1], b = keys[i], t = smooth((d - a[0]) / (b[0] - a[0])); return a[k] + (b[k] - a[k]) * t; } return keys[keys.length - 1][k]; }
/** A point of the cave wall: ring p of the passage, at angle a over the arch (0 = foot of the left wall, π = the right), pulled `inset` metres inwards. */
function wallAt(p, a, inset = 0) {
  const q = 1 + 0.08 * sin(p.d * 0.9 + a * 3.1) + 0.05 * sin(p.d * 2.3 - a * 5.3), lat = (p.w * q - inset) * cos(a), up = (p.h * q - inset) * Math.max(0, sin(a)) ** 0.72;
  return [p.x + p.nx * lat, T + up, p.z + p.nz * lat];
}
const LAMPS = [[23, 0.72], [28.5, -0.7], [33, 0.74], [38.5, 0.66], [15, -0.6]];   // tallow lamps: [distance in, how far towards the left (+) or right wall]
/** Light as it falls on a point in the cave: grey daylight near the mouth, warm lamplight in the hall. */
function caveLight(P, x, y, z, d, lamps, out) {
  const day = 0.42 * exp(-Math.max(0, d) / 5.5) + 0.012; let warm = 0;
  if (lamps) for (const [ld, side] of LAMPS) { const p = P.at(ld), lx = p.x + p.nx * p.w * side, lz = p.z + p.nz * p.w * side, q = ((x - lx) ** 2 + (y - T - 0.5) ** 2 + (z - lz) ** 2) / 7; warm += 0.95 / (1 + q * q * 0.8 + q); }
  out[0] = day * 0.92 + warm * 1.0; out[1] = day * 0.96 + warm * 0.62; out[2] = day + warm * 0.3; return out;
}
function caveGeo(P, lamps) {
  const NA = 14, ring = NA + 1, pos = [], col = [], uv = [], idx = [], L = [0, 0, 0], r = rng(9);
  const push = (x, y, z, d, tintv, u, v) => { caveLight(P, x, y, z, d, lamps, L); pos.push(x, y, z); col.push(L[0] * tintv[0], L[1] * tintv[1], L[2] * tintv[2]); uv.push(u, v); };
  // a collar of rock round the mouth, then the passage itself
  const m = P[0]; for (let j = 0; j <= NA; j++) { const a = j / NA * Math.PI, q = wallAt(m, a); push(m.x, T + (q[1] - T) * 1.55 + (j === 0 || j === NA ? -1 : 0), m.z + (q[2] - m.z) * 1.6, 30, [0.5, 0.45, 0.4], j / NA * 4, 0); }
  P.forEach((p, i) => { for (let j = 0; j <= NA; j++) { const a = j / NA * Math.PI, q = wallAt(p, a), g = 0.5 + 0.12 * r() + 0.1 * sin(q[1] * 2.1 + p.d * 0.4); push(q[0], q[1] - (j === 0 || j === NA ? 0.3 : 0), q[2], p.d, [g * 1.06, g, g * 0.86], j / NA * 3, p.d / 5); } });
  for (let i = 0; i < P.length; i++) for (let j = 0; j < NA; j++) { const a = i * ring + j, b = a + ring; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  // the floor: trodden clay
  const f0 = pos.length / 3; P.forEach((p) => { for (const s of [1, 0, -1]) push(p.x + p.nx * p.w * 1.15 * s, T + 0.05, p.z + p.nz * p.w * 1.15 * s, p.d, [0.36, 0.3, 0.23], s, p.d / 3); });
  for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < 2; j++) { const a = f0 + i * 3 + j, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
/** A strip of the left wall between two distances and two heights of the arch, a hand's breadth inside the rock, to carry paint. */
function panelGeo(P, d0, d1, a0, a1, flip = false) {
  const NA = 8, pos = [], col = [], uv = [], idx = [], L = [0, 0, 0], i0 = P.indexOf(P.at(d0)), i1 = P.indexOf(P.at(d1));
  for (let i = i0; i <= i1; i++) for (let j = 0; j <= NA; j++) { const a = a0 + (a1 - a0) * j / NA, q = wallAt(P[i], flip ? Math.PI - a : a, 0.04); caveLight(P, q[0], q[1], q[2], P[i].d, true, L); pos.push(...q); col.push(L[0] * 1.15, L[1] * 1.15, L[2] * 1.15); uv.push(flip ? 1 - (i - i0) / (i1 - i0) : (i - i0) / (i1 - i0), j / NA); }
  for (let i = 0; i < i1 - i0; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}

/** Dordogne limestone: pale, bedded in level courses, pitted, with dark streaks where water comes down the face. */
function limeTex() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = rng(77);
  g.fillStyle = '#b9ad92'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const x = r() * S, y = r() * S, w = 20 + r() * 90, h = 3 + r() * 16, v = r(); g.fillStyle = v < 0.5 ? `rgba(120,104,80,${0.05 + r() * 0.1})` : `rgba(226,216,192,${0.05 + r() * 0.12})`; for (const ox of [0, S, -S]) { g.beginPath(); g.ellipse(x + ox, y, w, h, 0, 0, TAU); g.fill(); } }
  for (let y = 6 + r() * 20; y < S - 4; y += 9 + r() * r() * 70) {   // bedding planes: a dark joint with a lit lip under it
    const a = 2 + r() * 3, f = 0.01 + r() * 0.02, ph = r() * 6, k = Math.round(f * S / TAU) * TAU / S, lw = 1.2 + r() * 3.2;
    for (const [dy, col] of [[0, `rgba(52,44,34,${0.45 + r() * 0.3})`], [lw, 'rgba(232,224,204,0.35)']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let x = 0; x <= S; x += 8) g.lineTo(x, y + dy + a * sin(x * k + ph)); g.stroke(); }
  }
  for (let i = 0; i < 12; i++) { const x = r() * S, w = 8 + r() * 26, gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(40,36,32,0)'); gr.addColorStop(0.5, `rgba(40,36,32,${0.06 + r() * 0.14})`); gr.addColorStop(1, 'rgba(40,36,32,0)'); g.fillStyle = gr; g.fillRect(x - w, 0, w * 2, S); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(60,50,40,${0.1 + r() * 0.25})`; const s2 = 0.6 + r() * 2.2; g.fillRect(r() * S, r() * S, s2 * (1 + r() * 2), s2); }
  return canvasTex(c);
}

// ---------- the paintings ----------
const BLACK = '#1a1410', RED = '#8e2f1c', OCHRE = '#b06a2a', YELLOW = '#c79a3c', BROWN = '#5a3420';
/** One animal in the manner of Lascaux: small head, deep belly, thin legs in mid-stride. kind: 'bull' | 'horse' | 'stag' | 'cow'. */
function beast(g, x, y, s, kind, { dir = 1, fill = null, line = BLACK } = {}) {
  g.save(); g.translate(x, y); g.scale(s * dir, s); g.lineJoin = g.lineCap = 'round';
  const horse = kind === 'horse', stag = kind === 'stag', lw = kind === 'bull' ? 4.2 : 3;
  const body = () => {
    g.beginPath(); g.moveTo(-52, -6); g.bezierCurveTo(-34, -24, 8, -20, 30, -27);
    if (horse) { g.bezierCurveTo(40, -40, 48, -50, 56, -52); g.lineTo(72, -40); g.lineTo(70, -33); g.bezierCurveTo(60, -34, 54, -24, 49, -6); }
    else if (stag) { g.bezierCurveTo(40, -44, 46, -60, 52, -66); g.lineTo(68, -60); g.lineTo(66, -54); g.bezierCurveTo(56, -52, 52, -30, 48, -6); }
    else { g.bezierCurveTo(44, -34, 54, -40, 62, -40); g.lineTo(80, -30); g.lineTo(78, -23); g.bezierCurveTo(66, -22, 58, -14, 52, -2); }
    g.bezierCurveTo(46, 14, 28, horse ? 28 : 24, 0, horse ? 28 : 23); g.bezierCurveTo(-26, 24, -46, 16, -52, -6); g.closePath();
  };
  if (fill) { body(); g.globalAlpha = 0.82; g.fillStyle = fill; g.fill(); g.globalAlpha = 1; }
  else { body(); g.globalAlpha = 0.16; g.fillStyle = BLACK; g.fill(); g.globalAlpha = 1; }
  g.strokeStyle = line; g.lineWidth = lw; body(); g.stroke();
  // legs, tail
  g.lineWidth = lw * 0.9;
  for (const [x0, y0, x1, y1, x2, y2] of [[38, 12, 44, 30, 50, 46], [28, 18, 24, 34, 18, 50], [-32, 16, -28, 32, -22, 48], [-44, 6, -52, 26, -56, 46]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke(); }
  g.beginPath(); g.moveTo(-52, -6); g.quadraticCurveTo(-64, 2, horse ? -66 : -60, horse ? 30 : 22); g.stroke();
  if (horse) { g.lineWidth = lw * 2.6; g.strokeStyle = BLACK; g.beginPath(); g.moveTo(31, -29); g.quadraticCurveTo(42, -44, 55, -54); g.stroke(); }
  else if (stag) { g.lineWidth = lw * 0.8; for (const k of [0, 1]) { g.beginPath(); g.moveTo(54, -66); g.bezierCurveTo(50 - k * 10, -86, 30 - k * 14, -98, 16 - k * 12, -112); g.stroke(); for (const t of [0.3, 0.55, 0.8]) { const bx = 54 - (38 + k * 12) * t, by = -66 - 46 * t; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 12, by - 12); g.stroke(); } } }
  else { g.lineWidth = lw * 0.9; g.beginPath(); g.moveTo(62, -40); g.bezierCurveTo(66, -56, 80, -60, 90, -54); g.stroke(); g.beginPath(); g.moveTo(58, -40); g.bezierCurveTo(56, -60, 70, -70, 84, -66); g.stroke(); }
  g.fillStyle = line; g.beginPath(); g.arc(horse ? 60 : stag ? 58 : 68, horse ? -44 : stag ? -59 : -33, 1.6, 0, TAU); g.fill();
  g.restore();
}
/** Wear the paint as rock does: grain shows through, and flakes are missing. */
function weather(g, W, H, seed, n) { const r = rng(seed); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.5})`; const s = 1 + r() * r() * 9; g.fillRect(r() * W, r() * H, s, s * (0.4 + r())); } g.globalCompositeOperation = 'source-over'; }
function paintingTex() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const g = c.getContext('2d');
  beast(g, 430, 280, 3.9, 'bull', { dir: 1 });                                   // the great bulls, facing each other
  beast(g, 1320, 280, 4.0, 'bull', { dir: -1 });
  beast(g, 1700, 300, 2.5, 'bull', { dir: -1 });
  beast(g, 860, 215, 1.9, 'cow', { dir: 1, fill: RED, line: RED });
  beast(g, 150, 330, 1.5, 'horse', { dir: 1, fill: OCHRE });
  for (let i = 0; i < 5; i++) beast(g, 640 + i * 105, 400 - 12 * sin(i * 1.3), 0.95, 'horse', { dir: -1, fill: i % 2 ? YELLOW : OCHRE });   // the file of small horses
  for (let i = 0; i < 4; i++) beast(g, 930 + i * 78, 110 + 6 * sin(i * 2), 0.8, 'stag', { dir: -1, line: i % 2 ? BROWN : BLACK });
  beast(g, 1890, 160, 1.3, 'horse', { dir: -1, fill: BROWN });
  g.fillStyle = RED; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(1050 + i * 24, 470, 7, 0, TAU); g.fill(); }
  g.fillStyle = BLACK; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(250 + i * 22, 130, 6, 0, TAU); g.fill(); }
  g.strokeStyle = BLACK; g.lineWidth = 3; g.strokeRect(1560, 420, 44, 44); g.beginPath(); g.moveTo(1582, 420); g.lineTo(1582, 464); g.moveTo(1560, 442); g.lineTo(1604, 442); g.stroke();
  weather(g, 2048, 512, 3, 3500);
  return canvasTex(c);
}
function handsTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'), r = rng(12);
  for (let i = 0; i < 7; i++) {
    const x = 90 + i * 135 + r() * 30, y = 110 + r() * 60, s = 0.9 + r() * 0.3, gr = g.createRadialGradient(x, y, 20, x, y, 78 * s);
    gr.addColorStop(0, i % 3 ? 'rgba(142,47,28,0.9)' : 'rgba(26,20,16,0.85)'); gr.addColorStop(1, 'rgba(142,47,28,0)'); g.fillStyle = gr; g.fillRect(x - 90, y - 90, 180, 180);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.5); g.scale(s, s);
    g.beginPath(); g.ellipse(0, 12, 19, 22, 0, 0, TAU); g.fill();
    for (const [a, len] of [[-0.95, 30], [-0.33, 42], [0, 46], [0.3, 42], [0.62, 33]]) { g.save(); g.rotate(a); g.beginPath(); g.roundRect(-4.5, -len - 8, 9, len + 8, 4.5); g.fill(); g.restore(); }
    g.restore(); g.globalCompositeOperation = 'source-over';
  }
  weather(g, 1024, 256, 4, 2500);
  return canvasTex(c);
}

// ---------- things people make ----------
const BONE = 0xd9d2bc, FLINT = 0x6a6258, LIME = 0x8c8474, FISH = 0xb09474, MEAT = 0x70382a, POST = 0xb09878;
/** A cone of poles covered with sewn hides, its door towards +x, the skirt weighted with stones and mammoth bone. */
function tent(seed, R = 2.3, H = 3.1) {
  const r = rng(seed), hide = new Builder(), wood = new Builder(), bones = [], NP = 9, door = 0.36;
  const at = (a, t) => { const sag = 1 - 0.06 * Math.abs(sin(a * NP / 2)) * sin(Math.PI * t), k = R * (1 - t * 0.93) * sag; return [k * cos(a), H * t * 0.97, k * sin(a)]; };
  for (let i = 0; i < 36; i++) for (let j = 0; j < 6; j++) {
    const a0 = i / 36 * TAU, a1 = (i + 1) / 36 * TAU, t0 = j / 6, t1 = (j + 1) / 6, mid = ((a0 + a1) / 2 + Math.PI) % TAU - Math.PI;
    if (Math.abs(mid) < door * (1 - t0 * 1.6) && j < 3) continue;   // the doorway
    // whole hides sewn edge to edge in three rows, each row lapping over the one below; dark along the seams and the skirt, sooted round the smoke hole
    const pan = (ii) => { const band = j >> 1, n = [7, 6, 4][band]; return Math.floor((((ii + 36) % 36) / 36 * n + [0.3, 2.1, 1.2][band] + seed) % n) + band * 10; };
    const me = pan(i), tn = 0.8 + 0.3 * Math.abs(sin(me * 12.9898 + seed * 3.1)), sL = pan(i - 1) !== me ? 0.5 : 1, sR = pan(i + 1) !== me ? 0.5 : 1, lap = j % 2 === 0, k0 = lap && j ? 1.04 : 1;
    const P = (a, t, k, dark) => { const p = at(a, t); p[0] *= k; p[2] *= k; const c = tn * dark * (1 - 0.5 * smooth((t - 0.68) / 0.3)); return [p, norm(cos(a) * H, R, sin(a) * H), a / TAU * 5, t * 1.6, [c * 0.95, c * 0.9, c * 0.84]]; };
    hide.quad(P(a1, t0, k0, lap ? 0.5 : sR), P(a0, t0, k0, lap ? 0.5 : sL), P(a0, t1, 1, sL), P(a1, t1, 1, sR));
  }
  { const V = (a, t, k, c) => { const p = at(a, t); return [[p[0] * k, p[1], p[2] * k], norm(cos(a) * H, R, sin(a) * H), a / TAU * 5, t * 1.6, [c, c * 0.95, c * 0.88]]; };   // the door flap, thrown back and pegged
    hide.quad(V(door + 0.5, 0, 1.13, 0.6), V(door + 0.05, 0, 1.03, 0.75), V(door * 0.75, 0.44, 1.03, 0.85), V(door + 0.36, 0.4, 1.09, 0.7)); }
  for (const [t, k, rad] of [[0.47, 1.045, 0.012], [0.87, 1.25, 0.02]]) { const pts = []; for (let i = 0; i <= 18; i++) { const p = at(i / 18 * TAU, t); pts.push([p[0] * k, p[1], p[2] * k]); } tube(wood, pts, () => rad, 3, 1); }   // thongs round the cover and round the crossing of the poles
  for (let k = 0; k < NP; k++) { const a = (k + 0.5) / NP * TAU, b = at(a, 0), top = [-(b[0]) * 0.16, H * 1.17, -(b[2]) * 0.16]; tube(wood, [[b[0] * 1.02, 0, b[2] * 1.02], [b[0] * 0.06, H * 0.96, b[2] * 0.06], top], () => 0.035, 5, 1); }
  for (let k = 0; k < 14; k++) {
    const a = door + 0.2 + (k / 13) * (TAU - 2 * door - 0.4), x = cos(a) * (R + 0.12), z = sin(a) * (R + 0.12);
    if (k % 4 === 1) bones.push(cyl(0.05, 0.05, 0.8, BONE, x, 0.07, z, 6, 1.5708, -a + 1.5708, 0), ball(0.085, BONE, x - sin(a) * 0.4, 0.08, z + cos(a) * 0.4), ball(0.085, BONE, x + sin(a) * 0.4, 0.08, z - cos(a) * 0.4));
    else if (k % 7 === 3) bones.push(part(new THREE.TorusGeometry(0.9, 0.06, 5, 9, 1.5), 0xe6dcc2, x, 0.06, z, 1.5708, 0, a + 2.2));   // a tusk
    else bones.push(ball(0.17 + r() * 0.08, LIME, x, 0.08, z, 1.2, 0.7, 1, 1));
  }
  return { hide: hide.build(), wood: wood.build(), bones };
}
/** A drying rack: two forked posts, a rail, split fish or strips of meat hanging from it. */
function rack(what = FISH) {
  const g = [], w = [];
  for (const s of [-1, 1]) w.push(cyl(0.035, 0.045, 1.7, POST, 0, 0.85, s * 1.3, 6), cyl(0.03, 0.035, 1.75, POST, 0.3, 0.8, s * 1.3, 6, 0, 0, 0.36));
  w.push(cyl(0.028, 0.028, 2.9, POST, 0.02, 1.62, 0, 6, 1.5708, 0, 0));
  for (let i = 0; i < 9; i++) g.push(part(new THREE.SphereGeometry(1, 6, 4), what, 0.02, 1.32 - 0.03 * (i % 3), -1.05 + i * 0.26, 0, 0, 0, 0.035, 0.26, 0.08));
  return { wood: w, hung: g };
}
/** A block fallen from the shelter roof, pecked with rings and rubbed with ochre. */
function markedBlock() { return [ball(0.6, LIME, 0, 0.3, 0, 1.3, 0.6, 1, 2), ...[0, 1, 2].map((i) => part(new THREE.TorusGeometry(0.1, 0.022, 4, 10), 0x8e2f1c, -0.3 + i * 0.3, 0.67 - 0.03 * Math.abs(i - 1), 0.05 * i, 1.5708, 0, 0))]; }
/** A horse brought down on the valley floor. */
function kill() {
  const C = 0x8a6c48, g = [ball(1, C, 0, 0.32, 0, 1.0, 0.36, 0.5, 2), ball(1, C, 1.05, 0.26, 0.2, 0.42, 0.2, 0.2, 1), ball(1, C, 1.5, 0.2, 0.3, 0.3, 0.15, 0.13, 1), ball(1, 0x6a1c14, -0.1, 0.5, 0.1, 0.5, 0.2, 0.3, 1)];
  for (const [x, a] of [[-0.7, 1.2], [-0.5, 1.6], [0.5, 1.3], [0.7, 1.75]]) g.push(cyl(0.05, 0.07, 1.0, C, x, 0.1, -0.7, 6, 1.5708, 0, a - 1.5708));
  for (let i = 0; i < 6; i++) g.push(part(new THREE.TorusGeometry(0.3, 0.018, 4, 8, 2.6), BONE, -0.25 + i * 0.13, 0.36, 0.12, 0, 1.5708, 0.45));
  return g;
}

function build({ world, group }) {
  const r = rng(4410), TX = shared(), K = makeKinds(), P = passage();
  const H = (x, z) => world.heightAt(x, z);
  // places: the northern shelter (the Neanderthals', then ours), the southern one, the ground before the cave, the later camp
  const S1 = [cliffX(-70) + 1, -70], S2 = [cliffX(58) + 1, 58], COURT = [X0 - 19, CAVE_Z + 3], CAMP = [22, -18], KILL = [-78, 66], FORD = [riverX(-20) + 25, -20];
  const TF = [S2[0] - 30, 62], TENTS_A = [[-20, 44], [-22, 78], [-39, 50], [-40, 74]].map(([dx, z]) => [S2[0] + dx, z, facing(S2[0] + dx, z, TF[0], TF[1])]);   // from the newcomers' time
  const TENTS_M = [[CAMP[0] - 9, CAMP[1] - 9], [CAMP[0] + 3, CAMP[1] - 12], [CAMP[0] + 11, CAMP[1] - 3], [CAMP[0] - 12, CAMP[1] + 3], [CAMP[0] - 4, CAMP[1] + 11], [CAMP[0] + 8, CAMP[1] + 9]].map(([x, z]) => [x, z, facing(x, z, CAMP[0], CAMP[1])]);
  const keep = [[...S1, 30], [...S2, 26], [...COURT, 20], [...CAMP, 22], [...KILL, 8], [...TF, 24], [30, 0, 8]];
  const open = (x, z, m = 1) => keep.every(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) > kr * m);

  // ----- cliff, cave, paintings -----
  const cliff = new THREE.Mesh(cliffGeo(world), new THREE.MeshStandardMaterial({ vertexColors: true, map: limeTex(), normalMap: TX.rockNormal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.95 }));
  cliff.castShadow = cliff.receiveShadow = true; group.add(cliff);
  const caveMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: TX.rockMap, side: THREE.DoubleSide }), dark = new THREE.Mesh(caveGeo(P, false), caveMat), lit = new THREE.Mesh(caveGeo(P, true), caveMat);
  const paintMat = (map) => new THREE.MeshBasicMaterial({ map, vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const bulls = new THREE.Mesh(panelGeo(P, 21, 39, 0.1, 0.86), paintMat(paintingTex())), hands = new THREE.Mesh(panelGeo(P, 12, 19, 0.2, 0.75, true), paintMat(handsTex()));
  for (const m of [dark, lit, bulls, hands]) { m.frustumCulled = false; group.add(m); }
  bulls.renderOrder = hands.renderOrder = 1;

  // ----- plants: steppe with scrub, a few trees in shelter, more of them before and after the great cold -----
  const sets = [], sage = () => { const g = 0.62 + r() * 0.3; return [g * (0.95 + r() * 0.2), g, g * (0.78 + r() * 0.2)]; }, grey = () => { const g = 0.75 + r() * 0.35; return [g * 1.04, g, g * 0.92]; },
    russet = () => { const g = 0.6 + r() * 0.3, q = r(); return q < 0.3 ? [g * 1.5, g * 0.95, g * 0.5] : [g, g, g * 0.8]; };
  const scatter = (parts, n, place, span, size, tint, cast = true) => {
    parts = cast ? parts : parts.map((q) => ({ ...q, cast: false }));
    const items = [];
    for (let i = 0; i < n; i++) { const q = place(); if (!q) continue; const [a, b] = span(); items.push({ x: q[0], z: q[1], s: size[0] + r() * (size[1] - size[0]), rot: r() * TAU, u0: a === -Infinity ? -1 : Y(a), u1: b === Infinity ? 2 : Y(b), tint: tint() }); }
    if (items.length) sets.push(new Field(world, group, parts, items, { cast, grid: items.length < 40 ? 1 : 3 }));
  };
  const valley = () => { for (let k = 0; k < 40; k++) { const z = (r() * 2 - 1) * 420, x = -150 + r() * (cliffX(z) - 6 + 150); if (H(x, z) > 2.4 && open(x, z)) return [x, z]; } return null; };
  const farBank = () => { const z = (r() * 2 - 1) * 520; return [riverX(z) - 44 - r() * 330, z]; }, top = () => { const z = (r() * 2 - 1) * 420; return [cliffX(z) + 122 + r() * 260, z]; };
  const edge = () => { const z = (r() * 2 - 1) * 330; return [cliffX(z) + 14 + r() * 100, z]; };
  const some = (...fs) => () => fs[r() * fs.length | 0](), always = () => [-Infinity, Infinity], warm = () => (r() < 0.5 ? [-Infinity, -29e3 + r() * 3e3] : [-16.8e3 + r() * 1.5e3, Infinity]);
  scatter(K.spruce, 40, some(farBank, top, edge), always, [0.5, 1.0], sage, false); scatter(K.spruce, 24, valley, always, [0.5, 1.0], sage);
  scatter(K.spruceB, 100, some(farBank, farBank, top), warm, [0.6, 1.2], sage, false); scatter(K.spruceB, 40, valley, warm, [0.6, 1.2], sage);
  scatter(K.coniferB, 36, some(farBank, top), warm, [0.5, 0.85], sage, false); scatter(K.coniferB, 20, valley, warm, [0.5, 0.85], sage);
  scatter(K.shrub, 380, some(valley, valley, farBank, top, edge), always, [0.5, 1.3], russet, false);
  scatter(K.rockB, 130, some(() => { const z = (r() * 2 - 1) * 330, x = footX(z) - 1 - r() * r() * 16; return open(x, z, 0.5) && Math.abs(z - CAVE_Z) > 9 ? [x, z] : null; }, () => { const z = (r() * 2 - 1) * 400; return [riverX(z) + (r() < 0.5 ? -1 : 1) * (26 + r() * 12), z]; }, valley), always, [0.4, 1.9], grey);
  // snow: drifts that lie in the hollows and under the cliff, growing and shrinking with the cold
  const DRIFT = 150, driftGeo = new THREE.SphereGeometry(1, 12, 6).scale(1, 0.11, 1), drifts = new THREE.InstancedMesh(driftGeo, new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.7 }), DRIFT), driftAt = [];
  for (let i = 0; i < DRIFT; i++) { let q = null; while (!q) q = i % 5 ? valley() : farBank(); driftAt.push([q[0], q[1], 2 + r() * r() * 9, r() * TAU, 0.3 + r() * 0.65, 0.6 + r() * 0.8]); }
  drifts.receiveShadow = true; drifts.frustumCulled = false; group.add(drifts);
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0); let lastCold = -1;
  const snow = (cold) => {
    if (Math.abs(cold - lastCold) < 0.004) return; lastCold = cold; let k = 0;
    for (const [x, z, s, rot, need, asp] of driftAt) { const f = smooth((cold - need * 0.75) / 0.3); if (f < 0.02) continue; _m.compose(_p.set(x, drawnGround(world, x, z) - 0.05, z), _q.setFromAxisAngle(UP, rot), _s.set(s * f * asp, s * (0.6 + 0.4 * f), s * f)); drifts.setMatrixAt(k++, _m); }
    drifts.count = k; drifts.visible = k > 0; drifts.instanceMatrix.needsUpdate = true;
  };

  // ----- scenery -----
  const stuff = new Stuff(world, group), fires = new Fires(group), solid = [];
  stuff.mat('plain', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))
    .mat('rock', new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.rockMap, normalMap: TX.rockNormal, roughness: 0.95 }))
    .mat('wood', new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.barkMap, color: 0x8a7458, roughness: 0.95 }))
    .mat('hide', new THREE.MeshStandardMaterial({ vertexColors: true, map: hideTex(), roughness: 0.9, side: THREE.DoubleSide }));
  const block = (x, z, rad, from = -Infinity, to = Infinity) => solid.push([x, z, rad, from === -Infinity ? -1 : Y(from), to === Infinity ? 2 : Y(to)]);
  const fire = (x, z, from, to, size = 1, smoke = 7) => { stuff.add('plain', hearth(x * 7 + z, true, LIME), x, z, { from, to }); fires.add(x, drawnGround(world, x, z) + 0.06, z, { from, to, size, smoke }); block(x, z, 0.7, from, to); };
  const pitch = (list, from, to, seed) => list.forEach(([x, z, rot], i) => { const t = tent(seed + i, 2.1 + 0.3 * sin(i * 2.3), 2.9 + 0.3 * cos(i * 1.7)); stuff.add('hide', t.hide, x, z, { rot, from, to }); stuff.add('wood', t.wood, x, z, { rot, from, to }); stuff.add('rock', t.bones, x, z, { rot, from, to }); block(x, z, 2.2, from, to); });
  // hearths: under each shelter, before the cave, in the later camp
  const F1 = [S1[0] - 4.5, S1[1]], F1b = [S1[0] - 3.5, S1[1] + 15], F2 = [S2[0] - 4, S2[1]], FC = COURT, FM = CAMP;
  fire(...F1, N0, Infinity, 1.1); fire(...F1b, N0, Infinity, 0.8, 5); fire(...F2, SAP, Infinity, 1); fire(...FC, MARKS, Infinity, 1.5, 10); fire(...FM, MAGD, Infinity, 1.2, 9);
  fire(...TF, SAP, Infinity, 0.9, 6);
  stuff.add('rock', debitage(3, 90, 3, 0, FLINT), S1[0] - 3, S1[1] - 9); stuff.add('rock', debitage(4, 70, 2.6, 0, FLINT), S2[0] - 3, S2[1] + 8, { from: SAP });
  stuff.add('rock', [ball(0.3, LIME, 0, 0.1, 0, 1.2, 0.55, 1, 1)], S1[0] - 3, S1[1] - 9);
  // the grave under the southern shelter: an open pit, then a low mound under slabs
  stuff.add('plain', [part(new THREE.CircleGeometry(1.1, 14), 0x4a3c2c, 0, 0.03, 0, -1.5708, 0, 0, 1.25, 0.8, 1)], S2[0] - 1.5, S2[1] - 6, { from: -46.5e3, to: -44e3 });
  stuff.add('rock', [ball(1, 0x6a5a44, 0, 0, 0, 1.2, 0.22, 0.75, 2), ball(0.3, LIME, 0.2, 0.2, 0, 1.4, 0.3, 1, 1), ball(0.26, LIME, -0.5, 0.17, 0.1, 1.3, 0.3, 1, 1)], S2[0] - 1.5, S2[1] - 6, { from: -44e3, to: N1 });
  stuff.add('plain', kill(), KILL[0], KILL[1], { rot: 0.7, from: N0, to: N1 }); block(KILL[0], KILL[1], 1.1, N0, N1);
  stuff.add('rock', [0, 1, 2].flatMap((i) => markedBlock().map((g) => g.rotateY(i * 2.1).translate(i * 1.7 - 1.7, 0, sin(i * 4) * 0.8))), S1[0] - 0.5, S1[1] + 8, { from: MARKS });
  // tents
  pitch(TENTS_A, SAP, Infinity, 20); pitch(TENTS_M, MAGD, Infinity, 40);
  for (const [x, z, rot, what] of [[CAMP[0] - 16, CAMP[1] - 6, 0.4, FISH], [CAMP[0] - 15, CAMP[1] + 12, 1.1, FISH], [CAMP[0] + 15, CAMP[1] + 4, 2.0, MEAT]]) { const k = rack(what); stuff.add('wood', k.wood, x, z, { rot, from: MAGD }); stuff.add('plain', k.hung, x, z, { rot, from: MAGD }); block(x, z, 1.2, MAGD); }
  { const k = rack(MEAT); stuff.add('wood', k.wood, S2[0] - 14, S2[1] + 16, { rot: 0.9, from: SAP }); stuff.add('plain', k.hung, S2[0] - 14, S2[1] + 16, { rot: 0.9, from: SAP }); block(S2[0] - 14, S2[1] + 16, 1.2, SAP); }
  // a heap of mammoth bone and tusks by the camp, firewood by the fires
  const heap = []; for (let i = 0; i < 9; i++) heap.push(cyl(0.06, 0.07, 0.9 + r() * 0.4, BONE, (r() - 0.5) * 1.6, 0.1 + i * 0.03, (r() - 0.5) * 1.2, 6, 1.5708, r() * 3, 0)); for (let i = 0; i < 3; i++) heap.push(part(new THREE.TorusGeometry(1.0, 0.07, 5, 10, 1.7), 0xe6dcc2, i * 0.3 - 0.3, 0.12, 0.4 - i * 0.4, 1.4, 0, i * 0.5));
  stuff.add('rock', heap, TF[0] + 1, TF[1] + 24, { from: SAP });
  const wood = []; for (let i = 0; i < 14; i++) wood.push(cyl(0.04, 0.05, 1.0 + r() * 0.5, 0x5a4630, (r() - 0.5) * 0.5, 0.05 + (i % 4) * 0.08, (r() - 0.5) * 0.3 + (i % 3) * 0.12, 5, 1.5708, 0.1 * (r() - 0.5), 0));
  for (const [x, z, from] of [[F1[0] - 2.5, F1[1] + 3, N0], [FC[0] + 3, FC[1] + 3, MARKS], [FM[0] + 2.5, FM[1] - 3, MAGD]]) stuff.add('wood', wood, x, z, { from, rot: x });
  // tallow lamps in the hall: hollowed stones with a small flame
  for (const [ld, side] of LAMPS) { const p = P.at(ld), x = p.x + p.nx * p.w * side, z = p.z + p.nz * p.w * side; stuff.add('rock', [ball(0.11, 0xa89a88, 0, 0.1, 0, 1.3, 0.5, 1, 1)], x, z, { from: MARKS, y: 0.03 }); fires.add(x, T + 0.2, z, { from: MARKS, size: 0.2, smoke: 0 }); }
  stuff.build(); fires.build();

  // ----- animals -----
  const beasts = new Beasts(world, group, 21), floor = (x, z) => H(x, z) > 2.3 && H(x, z) < 7 && x > -165 && x < 0 && open(x, z, 1.1), bench = (x, z) => H(x, z) > 6.5 && x < cliffX(z) - 8 && open(x, z, 1.1);
  beasts.add('mammoth', 4, N0, -15e3, { at: [-80, -205], R: [28, 34], spread: 16, speed: 0.8, scale: [0.8, 1.1], ok: floor });
  beasts.add('horse', 6, N0, Infinity, { at: [-82, 170], R: [30, 36], spread: 16, speed: 1.0, scale: [0.82, 0.92], ok: floor });
  beasts.add('deer', 8, N0, Infinity, { at: [-88, -70], R: [30, 36], spread: 17, speed: 0.9, scale: [1.08, 1.22], ok: floor });          // reindeer
  beasts.add('wolf', 3, N0, Infinity, { at: [35, -205], R: [18, 24], spread: 8, speed: 1.6, ok: bench });
  beasts.add('wolf', 2, DOGS, Infinity, { at: [CAMP[0] - 2, CAMP[1] + 2], R: [17.5, 18], spread: 1, speed: 1.2, scale: [0.72, 0.8], ok: null });   // camp dogs
  beasts.add('hawk', 2, N0, Infinity, { at: [0, 0], R: [60, 110], spread: 60, speed: 9, fly: 55, apart: true });
  beasts.add('crow', 4, N0, Infinity, { at: [30, 20], R: [20, 60], spread: 50, speed: 8, fly: 22, apart: true });

  // ----- people -----
  const PALE = [[0.62, 0.45, 0.33], [0.7, 0.52, 0.4], [0.55, 0.38, 0.27]].map((c) => c.map((v) => v ** 2.2)), RAW = [0x6a4a30, 0x5a4230, 0x7a5a3a].map((h) => rgb(h).map((v) => v ** 2.2)), HAIR = [[0.4, 0.4, 0.42], [1, 1, 1], [2.6, 1.2, 0.7], [1.8, 1.1, 0.7]];
  const KIND = {
    // Neanderthals: short, broad, in wrapped hides (some bare-armed by the fire), brown and red hair
    nea: () => ({ s: 0.88 + r() * 0.06, skin: PALE[r() * 3 | 0], tint: RAW[r() * 3 | 0], legs: RAW[r() * 3 | 0], hair: HAIR[r() * 4 | 0] }),
    neaChild: () => ({ s: 0.5 + r() * 0.2, skin: PALE[r() * 3 | 0], tint: RAW[r() * 3 | 0], legs: RAW[r() * 3 | 0], hair: HAIR[r() * 4 | 0] }),
    sap: () => ({}), child: () => ({ s: 0.5 + r() * 0.22 }),
  };
  const L = [];
  const put = (kind, span, action, x, z, rot, o = {}) => { const f = o.f ?? r() < 0.5, bare = kind[0] === 'n' && (o.bare ?? r() < 0.45); L.push({ outfit: (bare ? 'paleo' : 'iceage') + (f ? '-f' : ''), action, x, z, rot, u0: Y(span[0]), u1: span[1] === Infinity ? Infinity : Y(span[1]), ...KIND[kind](), ...o }); };
  const circle = (kind, span, actions, cx, cz, rad, n, o = {}, a0 = 0, arcLen = TAU) => { for (let i = 0; i < n; i++) { const a = a0 + (i + (o.jit ? (r() - 0.5) * 0.5 : 0)) / n * arcLen, x = cx + cos(a) * rad * (1 + (o.jit ? (r() - 0.5) * 0.3 : 0)), z = cz + sin(a) * rad; put(kind, span, actions[i % actions.length], x, z, facing(x, z, cx, cz), o); } };
  const walkers = (kind, span, action, path, n, o = {}) => { for (let i = 0; i < n; i++) put(kind, span, action, path[0][0], path[0][1], 0, { path, phase: (i + r() * 0.5) / n, ...o }); };
  /** n people in a row under a shelter, backs to the rock. */
  const row = (kind, span, actions, x, z0, z1, n, o = {}) => { for (let i = 0; i < n; i++) put(kind, span, actions[i % actions.length], x + (r() - 0.5) * 0.8, z0 + (z1 - z0) * (i + 0.5) / n, Math.PI + (r() - 0.5) * 0.5, o); };
  const NE = [N0, N1], SA = [SAP, Infinity], S1SAP = [N1, Infinity], MA = [MAGD, Infinity], PA = [PAINT, Infinity];

  // Neanderthals at the northern shelter
  circle('nea', NE, ['tend-fire', 'sit', 'sit', 'tend-fire', 'sit', 'sit', 'sit'], F1[0], F1[1], 1.3, 7, { prop: 'none', bare: true });
  circle('neaChild', NE, ['sit', 'crouch', 'stand'], F1[0], F1[1], 2.4, 3, { jit: 1 }, 1);
  circle('nea', NE, ['knap'], S1[0] - 3, S1[1] - 9, 1.5, 5, { bare: true });
  for (let i = 0; i < 5; i++) put('nea', NE, 'scrape', S1[0] - 8 + (i % 2) * 2.4, S1[1] + 5 + i * 1.6, Math.PI * 0.9, {});
  circle('nea', NE, ['sit', 'cook', 'sit', 'crouch'], F1b[0], F1b[1], 1.3, 4, { prop: 'none' });
  row('nea', NE, ['sleep', 'sit', 'sleep', 'sit', 'sleep'], S1[0] + 1.6, S1[1] - 24, S1[1] + 24, 5);
  circle('neaChild', NE, ['crouch', 'stand', 'sit'], S1[0] - 9, S1[1] - 3, 1.6, 3, { jit: 1 });
  circle('nea', NE, ['talk', 'stand', 'talk'], S1[0] - 10, S1[1] - 15, 0.9, 3, { prop: 'none' });
  // … hunting on the valley floor, butchering a horse, carrying it home
  const huntN = [[S1[0] - 30, S1[1]], [-20, -74], [-56, -78]], homeN = [[S1[0] - 12, S1[1] + 6], [-10, 30], [KILL[0] + 5, KILL[1] - 2]];
  for (let i = 0; i < 6; i++) put('nea', NE, 'stalk', 0, 0, 0, { path: huntN.map(([x, z]) => [x + (i % 2) * 3, z + i * 2.2]), phase: 0.3 + i * 0.012, f: false, bare: false, speed: 0.6 });
  circle('nea', NE, ['scrape'], KILL[0], KILL[1], 1.5, 5, { prop: 'handaxe', bare: false });
  circle('nea', NE, ['guard', 'stand'], KILL[0] - 2, KILL[1] + 2, 5, 2, { prop: 'spear', bare: false, f: false }, 2, 2);
  walkers('nea', NE, 'carry', homeN, 5, { prop: 'sack', bare: false });
  // … and burying one of their own under the southern shelter
  const GR = [S2[0] - 1.5, S2[1] - 6], G0 = [-46.5e3, -44e3];
  put('nea', G0, 'lie', GR[0] + 0.5, GR[1], 0, { bare: true, y: 0.02 });
  circle('nea', G0, ['kneel', 'stand', 'kneel', 'stand', 'crouch', 'stand'], GR[0], GR[1], 2.1, 6, { prop: 'none' }, 1.6, 3.6);
  circle('nea', [N0, SAP], ['sit', 'knap', 'crouch', 'sit'], S2[0] - 3, S2[1] + 8, 1.4, 4, {});

  // Homo sapiens: the southern shelter and the tents before it
  circle('sap', SA, ['tend-fire', 'sit', 'cook', 'sit', 'sit', 'sit'], F2[0], F2[1], 1.3, 6, { prop: 'none' });
  circle('child', SA, ['sit', 'crouch', 'stand'], F2[0], F2[1], 2.4, 3, { jit: 1 }, 2);
  circle('sap', SA, ['knap'], S2[0] - 3, S2[1] + 8, 1.5, 4, { f: false });
  for (let i = 0; i < 4; i++) put('sap', SA, 'scrape', S2[0] - 9 + (i % 2) * 2.4, S2[1] - 12 + i * 1.7, Math.PI * 1.1, { f: true });
  row('sap', SA, ['sit', 'write', 'sit', 'sleep', 'write', 'sit'], S2[0] + 1.2, S2[1] - 16, S2[1] + 16, 6);
  circle('sap', SA, ['sit', 'sit', 'cook', 'talk', 'sit'], TF[0], TF[1], 1.4, 5, { prop: 'none' });
  circle('child', SA, ['crouch', 'stand'], TF[0] - 4, TF[1] + 4, 1.5, 3, { jit: 1 });
  walkers('child', SA, 'walk', [[S2[0] - 12, 30], [S2[0] - 13.5, 60], [S2[0] - 12, 92]], 3, { speed: 2 });
  // … hunters after the reindeer, wood and water coming in
  const huntS = [[10, 20], [-30, -30], [-58, -52]];
  for (let i = 0; i < 7; i++) put('sap', SA, 'stalk', 0, 0, 0, { path: huntS.map(([x, z]) => [x + (i % 3) * 2.5, z + (i % 2) * 3 + i]), phase: 0.25 + i * 0.012, f: false, speed: 0.6 });
  put('sap', SA, 'spear', -52, -40, facing(-52, -40, -88, -70), { f: false }); put('sap', SA, 'spear', -47, -46, facing(-47, -46, -88, -70), { f: false });
  walkers('sap', SA, 'carry', [[S2[0] - 12, 50], [0, 110], [-30, 200], [-20, 245]], 5, { prop: 'sack' });
  walkers('sap', SA, 'fetch-water', [[S2[0] - 16, 48], [-40, 30], [FORD[0], FORD[1]]], 3, { prop: 'waterskin', f: true });
  // … the northern shelter, once the Neanderthals have gone
  circle('sap', S1SAP, ['tend-fire', 'sit', 'sit', 'cook', 'sit'], F1[0], F1[1], 1.3, 5, { prop: 'none' });
  for (let i = 0; i < 3; i++) put('sap', S1SAP, 'scrape', S1[0] - 8, S1[1] + 6 + i * 1.7, Math.PI * 0.9, { f: true });
  row('sap', S1SAP, ['sit', 'sleep', 'write', 'sit'], S1[0] + 1.5, S1[1] - 18, S1[1] + 4, 4);
  circle('sap', [MARKS, Infinity], ['chisel', 'crouch', 'stand'], S1[0] - 0.5, S1[1] + 8, 1.9, 3, { prop: 'hammerstone' }, 2.2, 2.6);
  // … the cave: torch-bearers going in, and from the painters' time the hall at work
  const inner = (d, side) => { const p = P.at(d); return [p.x + p.nx * p.w * side, p.z + p.nz * p.w * side, p]; };
  const way = [[X0 - 9, CAVE_Z + 2], [X0 - 2, CAVE_Z], ...[4, 10, 16, 22, 28].map((d) => inner(d, -0.25).slice(0, 2))];
  walkers('sap', [MARKS, Infinity], 'walk', way, 2, { prop: 'torch', speed: 0.9 });
  for (const [d, k] of [[25, 0], [30, 1], [35.5, 2]]) { const [x, z, p] = inner(d, 1 - 0.95 / P.at(d).w); put('sap', PA, 'paint', x, z, facing(x, z, x + p.nx, z + p.nz), { f: k === 1 }); }
  for (const d of [27.5, 33]) { const [x, z, p] = inner(d, 0.45); put('sap', PA, 'stand', x, z, facing(x, z, x + p.nx, z + p.nz), { prop: 'torch' }); }
  { const [x, z, p] = inner(31.5, -0.2); put('sap', PA, 'grind', x, z, facing(x, z, x + p.nx, z + p.nz), {}); put('child', PA, 'stand', x - p.dx * 2, z - p.dz * 2, facing(x, z, x + p.nx, z + p.nz), {}); put('child', PA, 'point', x + p.dx * 3, z + p.dz * 3, facing(x, z, x + p.nx, z + p.nz), {}); put('sap', PA, 'crouch', x + p.dx * 5.5 + p.nx, z + p.dz * 5.5 + p.nz, facing(x, z, x + p.nx, z + p.nz), {}); }
  { const [x, z, p] = inner(15.5, -1 + 0.95 / P.at(15.5).w); put('sap', [-27e3, -24e3], 'paint', x, z, facing(x, z, x - p.nx, z - p.nz), {}); }
  // … the fire before the cave: a gathering place, with drums and a dance in the painters' time
  circle('sap', [MARKS, PAINT], ['sit', 'talk', 'sit', 'tend-fire', 'stand', 'sit'], FC[0], FC[1], 1.8, 6, { prop: 'none' });
  circle('sap', PA, ['dance'], FC[0], FC[1], 3.1, 9, {}, 0.2);
  circle('child', PA, ['dance', 'stand', 'dance'], FC[0], FC[1], 4.6, 3, {}, 2.6, 1.6);
  circle('sap', PA, ['drum', 'drum', 'pray', 'sit', 'sit'], FC[0], FC[1], 5.6, 5, {}, -0.9, 1.9);
  // … the reindeer hunters' camp
  circle('sap', MA, ['tend-fire', 'cook', 'sit', 'sit', 'sit', 'sit'], FM[0], FM[1], 1.4, 6, { prop: 'none' });
  for (let i = 0; i < 4; i++) put('sap', MA, 'scrape', CAMP[0] + 14 + (i % 2) * 2.3, CAMP[1] - 12 + i * 1.6, 0.3, { f: true });
  circle('sap', MA, ['knap', 'write', 'knap'], CAMP[0] + 3, CAMP[1] + 4.5, 1.3, 3, {});
  circle('child', MA, ['crouch', 'stand', 'sit', 'crouch'], CAMP[0] - 5, CAMP[1] - 3, 1.7, 4, { jit: 1 });
  for (const i of [0, 3]) { const [x, z, rot] = TENTS_M[i]; put('sap', MA, 'sit', x + cos(rot) * 2.9, z - sin(rot) * 2.9, rot, {}); }
  circle('sap', MA, ['talk', 'stand'], CAMP[0] - 15.5, CAMP[1] + 9.5, 0.9, 2, { prop: 'none' });
  for (let i = 0; i < 4; i++) put('sap', MA, 'fish', FORD[0] + (i % 2) * 1.2, FORD[1] + 14 + i * 7, Math.PI + 0.2 * (i % 2), { f: false });
  walkers('sap', MA, 'carry', [[CAMP[0] - 17, CAMP[1]], [-60, -10], [FORD[0] + 4, FORD[1] + 20]], 3, { prop: 'sack' });

  const cast = actors(world, L, { seed: 31 }); group.add(...cast.meshes);

  let uNow = 0;
  return {
    update(u, t, env, camera, view) {
      uNow = u;
      const cx = camera.position.x, cz = camera.position.z;
      inside = Math.abs(cz - CAVE_Z - 4) < 16 && cx > footX(cz) - 2 ? smooth((cx - X0 + 1) / 7) : 0;
      for (const s of sets) s.update(u);
      stuff.update(u); fires.update(u, t); beasts.update(u, t, camera); cast.update(u, t, view);
      snow(Math.max(0, (env.ground[2] - C.steppe[2]) / (C.frost[2] - C.steppe[2])));
      lit.visible = u >= U_LAMPS; dark.visible = !lit.visible; bulls.visible = u >= U_PAINT; hands.visible = u >= U_HANDS;
    },
    collide(pos) {
      const fx = footX(pos.z);
      if (pos.x > fx - 0.5) {   // against the rock: either in the cave, kept between its walls, or stopped at the cliff
        let best = 1e9, bp = null; for (const p of P) { const d = (pos.x - p.x) ** 2 + (pos.z - p.z) ** 2; if (d < best) { best = d; bp = p; } }
        const d = Math.sqrt(best), lim = Math.max(0.1, bp.w - 0.55);
        if (d < bp.w + 1.6 && Math.abs(pos.z - CAVE_Z) < 22) { if (d > lim) { pos.x = bp.x + (pos.x - bp.x) / d * lim; pos.z = bp.z + (pos.z - bp.z) / d * lim; } if (bp.d > 50) { pos.x = P[51].x; pos.z = P[51].z; } }
        else pos.x = fx - 0.5;
      }
      for (const [x, z, rad, u0, u1] of solid) {
        if (uNow < u0 || uNow >= u1) continue;
        const dx = pos.x - x, dz = pos.z - z, d = Math.hypot(dx, dz), R = rad + 0.5;
        if (d < R && d > 1e-4) { pos.x = x + dx / d * R; pos.z = z + dz / d * R; }
      }
    },
  };
}

export default { place: 'Ice-age Europe · Vézère valley, France', coords: [44.94, 1.1], terrain, spawn: { x: 30, z: 0, yaw: -1.35 }, env, events, build };
