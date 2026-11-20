// Athens, 1250 – 150 BCE: the rock of the Acropolis above the agora, olive groves, and the sea at Piraeus.
// A Mycenaean citadel first, then a village under its old wall, a painted archaic town, the Persian fire, and the marble of Pericles.
import * as THREE from 'three';
import { rng, clamp, smooth } from './util.js';
import { yearToU, uToYear } from './timeline.js';
import { actors } from './people-actors.js';
import { species } from './animals.js';
import { Batch, Blocks, Beasts, C, temple, stoa, house, column, scaffold, crane, drape, road, statue, trees, cart, hullGeo, gableGeo, beside, loopOf, toward, tone, shade, audit, BOX, BALL } from './site-greece-kit.js';

const PLAIN = 9, TOP = 46, PY = 50, PI = Math.PI, U = yearToU;
const SEA = [-0.45, 0.893], SHORE = [0.893, 0.45], HARBOUR = [-297, 282];
const sup = (x, z) => Math.pow(Math.abs(x / 125) ** 2.6 + Math.abs(z / 66) ** 2.6, 1 / 2.6);
function acro(x, z) { const q = sup(x, z); if (q >= 1.7) return 0; const t = smooth((1.7 - q) / 0.7); return 10 * t * t + 27 * smooth((1 - q) / 0.2); }
function ramp(x, z) { return x > -215 && x < -90 ? clamp((x + 205) / 97, 0, 1) * (TOP - PLAIN) * (1 - smooth((Math.abs(z) - 10.5) / 9)) : 0; }
function base(x, z) {
  let h = PLAIN + Math.max(acro(x, z), ramp(x, z));
  h += 8 * smooth((60 - Math.hypot(x + 262, z + 150)) / 38);                                   // Kolonos Agoraios, the hill of the smiths
  h += 2.5 * Math.sin(x * 0.021 + 1) * Math.cos(z * 0.017) * smooth((Math.hypot(x + 60, z + 60) - 330) / 150);
  h += 120 * Math.max(0, 1 - Math.hypot(x - 340, z + 360) / 230) ** 1.6;                         // Lykabettos
  h += 170 * smooth((x - 620) / 380) * (0.7 + 0.3 * Math.sin(z * 0.006)) + 130 * smooth((-z - 780) / 380) * (0.75 + 0.25 * Math.sin(x * 0.007));   // Hymettos, Parnes
  const s = SEA[0] * x + SEA[1] * z, f = smooth((s - 280) / 200);
  h = h * (1 - f) - 7 * f;
  h += 60 * Math.max(0, 1 - Math.hypot(x + 760, z - 900) / 260) ** 1.4 * smooth((s - 600) / 200);   // Salamis across the strait
  return h;
}
const hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
const tint = (x, z) => (sup(x, z) < 1.5 ? 1.12 : Math.hypot(x + 60, z + 60) > 300 ? 0.86 + 0.3 * hash(Math.floor((x + z * 0.3) / 46), Math.floor((z - x * 0.3) / 34)) : 1);

const WAY = [[-228, -232], [-150, -150], [-128, -112], [-150, -60], [-196, -22], [-212, -5], [-204, 0], [-108, 0], [-84, 0], [-60, -3], [45, -3], [66, -6]];
const PORT_ROAD = [[-150, -60], [-215, 60], [-262, 190], [-292, 268]];
const hex = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const put = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
const SKY = hex(0x2f7fd8), HOR = hex(0xcfe2ee), GROUND = hex(0x8c7f55), WATER = hex(0x1c5a8c), FAR = hex(0x8a8a6a);

const events = [
  { y: -1250, t: 'The citadel', h: 'A king\'s hall stands on the rock, behind a new wall of boulders so large that later Greeks will say the Cyclopes built it. Below: barley, olives and a few dozen houses.', w: 'Mycenae, Tiryns and Pylos keep their accounts on clay tablets. Within two generations nearly every palace in Greece will burn.' },
  { y: -1100, t: 'After the palaces', h: 'The hall is gone and nobody here remembers how to write. A village of thatched huts shelters under the old wall.', w: 'Iron is replacing bronze. The Phoenicians sail west with an alphabet of twenty-two letters.' },
  { y: -750, t: 'The alphabet', h: 'The village is a town again. Its potters paint jars with bands of pattern, and someone scratches a line of verse on a wine jug in the new letters.', w: 'Homer\'s poems take shape. The first Olympic Games are dated to 776 BCE. Greeks found cities from the Black Sea to Sicily.' },
  { y: -594, t: 'Solon', h: 'The open ground below the rock becomes the agora, where everything is bought, sold and argued over. Solon cancels debts and forbids enslaving citizens for them.', w: 'Nebuchadnezzar rules Babylon. Thales of Miletus is said to have foretold the eclipse of 585 BCE.' },
  { y: -508, t: 'Rule by the people', h: 'Kleisthenes reorders the citizens, and they begin to vote on their own laws. A stone temple of Athena stands on the rock, painted red and blue.', w: 'Rome has just expelled its last king. Darius rules from the Aegean to the Indus; Confucius is teaching in China, the Buddha in India.' },
  { y: -480, t: 'The Persians burn Athens', h: 'Xerxes\' army takes the empty city and burns every temple on the rock. The Athenians watch from their ships, and win at Salamis, in the strait beyond the harbour.', w: 'Three hundred Spartans have just died at Thermopylae. Next year the Persians are beaten at Plataea and do not come back.' },
  { y: -447, t: 'The Parthenon', h: 'Pericles spends the allies\' tribute on marble. Drums from Mount Pentelikon, sixteen kilometres away, are dragged up the ramp. The building takes nine years, its sculpture six more.', w: 'Athens leads an empire of some two hundred cities. Herodotus is writing the first history; Sophocles is about to stage Antigone.' },
  { y: -432, t: 'Finished', h: 'The temple is done, bright with paint and gilding, Athena in gold and ivory inside. In the agora Socrates is asking awkward questions.', w: 'Next year the war with Sparta begins. The year after, plague kills perhaps a quarter of the Athenians, Pericles among them.' },
  { y: -404, t: 'Defeat', h: 'Athens surrenders to Sparta. The Long Walls to the harbour are pulled down to the music of flute-girls. Five years later the city puts Socrates to death.', w: 'Democracy returns within a year. Plato will found his Academy in an olive grove outside the walls, about 387 BCE.' },
  { y: -338, t: 'Macedon', h: 'Philip of Macedon defeats Athens and Thebes at Chaeronea. The city keeps its temples and its schools (Aristotle teaches at the Lyceum) but not its freedom to make war.', w: 'Philip\'s son Alexander will reach Egypt, Babylon and the Indus, and die at thirty-two in 323 BCE.' },
  { y: -280, t: 'A city of schools', h: 'Zeno teaches in the Painted Stoa, which is why his followers are called Stoics; Epicurus teaches in his garden. Foreign kings pay for colonnades to be remembered here.', w: 'The library at Alexandria is collecting every book in the world. About 240 BCE Eratosthenes measures the Earth. Rome and Carthage go to war.' },
  { y: -160, t: 'Rome arrives', h: 'King Attalos of Pergamon gives the agora a stoa two storeys high. In 146 BCE Greece becomes a Roman province; young Romans come here to study.', w: 'Carthage and Corinth are destroyed in the same year. The centre of this story moves west.' },
];

function build({ world, group }) {
  const r = rng(4471), B = new Batch(), CB = new Blocks(), K = { B, C: CB, world, r }, H = (x, z) => world.heightAt(x, z), M = species();
  const A = [];   // the people
  const add = (outfit, action, x, z, rot, y0, y1, o) => { const a = { outfit, action, x, z, rot, ...o }; if (y0 !== undefined && y0 > -1250) a.u0 = U(y0); if (y1 !== undefined && y1 < -150) a.u1 = U(y1); A.push(a); return a; };
  const walkers = (outfits, action, path, n, y0, y1, o = {}) => { for (let i = 0; i < n; i++) add(outfits[i % outfits.length], action, path[0][0], path[0][1], 0, y0, y1, { path, phase: (i + r() * 0.5) / n, ...o }); };
  const circle = (outfits, cx, cz, n, rad, y0, y1, o = {}) => { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + r() * 0.4, x = cx + Math.cos(a) * rad * (0.85 + r() * 0.3), z = cz + Math.sin(a) * rad; add(outfits[i % outfits.length], i % 3 === 0 ? 'point' : i % 3 === 1 ? 'talk' : 'stand', x, z, toward(x, z, cx, cz), y0, y1, o); } };
  const keep = [];   // ground kept clear of houses: [x0, z0, x1, z1]

  // ------------------------------------------------------------------ the rock
  drape(B, world, 'rock', -232, -126, 192, 126, 2.5, (x, z) => {
    const q = sup(x, z); if (q < 0.74 || q > 1.3 || (x < -95 && Math.abs(z) < 19.5)) return null;
    const k = smooth((q - 0.74) / 0.1) * smooth((1.3 - q) / 0.25), n = Math.sin(x * 0.9 + z * 0.37) * Math.cos(z * 0.8 - x * 0.21) + 0.6 * Math.sin(x * 2.3 + 1) * Math.cos(z * 1.9);
    const g = 0.85 + 0.25 * hash(Math.floor(x / 5), Math.floor(z / 4)); return [0.25 + k * (1.7 + 1.3 * n), [0.25 * g, 0.215 * g, 0.165 * g]];
  });
  drape(B, world, 'earth', -130, -60, 110, 60, 5, (x, z) => (sup(x, z) < 0.83 ? [0.05, 0x9c917c] : null));
  drape(B, world, 'earth', -206, -9.5, -106, 9.5, 4.75, () => [0.05, 0x978a72]);
  for (const e of [1, -1]) B.beam('ashlar', C.poros, [-207, PLAIN - 4, e * 11.6], [-106, TOP - 4, e * 11.6], 2.4, 9.2);
  // the wall round the summit: boulders first, squared blocks after the Persians
  for (const [mat, col, up, th, y0, y1] of [['cyclop', 0xb3a78f, 6.5, 4.6, -1250, -479], ['ashlar', C.poros, 4.6, 2.6, -479, Infinity]]) {
    B.when(y0, y1); const N = 72, pt = (i) => { const a = (i / N) * 6.2832, c = Math.cos(a), s = Math.sin(a); return [125 * 0.83 * Math.sign(c) * Math.abs(c) ** (2 / 2.6), 66 * 0.83 * Math.sign(s) * Math.abs(s) ** (2 / 2.6)]; };
    for (let i = 0; i < N; i++) {
      const a = pt(i), b = pt(i + 1), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (mx < -90 && Math.abs(mz) < 15) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); B.box(mat, tone(col, r, 0.06), L + 1, 12 + up, th, mx, TOP - 12, mz, toward(a[0], a[1], b[0], b[1]));
      if (y0 < -1000) CB.rect(mx, mz, L / 2 + 0.5, 1.6, toward(a[0], a[1], b[0], b[1]));
      else if (mz < -30 && i % 2 === 0 && Math.abs(mx) < 60) B.cyl('marble', shade(C.pentelic, 0.85), 0.9, 0.9, 1.1, mx, TOP + 0.6, mz - 1.4, 14);   // drums of the burnt temple built into the north wall
    }
  }
  B.when(-1250, -437);   // the old gate: two bastions
  for (const e of [1, -1]) { B.box('cyclop', 0xb3a78f, 12, 16, 9, -101, TOP - 9, e * 16.5); CB.rect(-101, e * 16.5, 6, 4.5, 0, -1250, -437); }

  // ------------------------------------------------------------------ on the summit
  B.when(-1250, -1100);   // the Mycenaean hall: a porch with two red columns, a great room, storerooms
  B.push(8, TOP, -24, 0);
  B.box('cyclop', 0xa89c84, 25, 1.1, 13, 0, -0.5, 0); B.box('plaster', C.ochre, 18, 5, 11, -2.5, 0.6, 0); B.box('plaster', shade(C.red, 0.9), 18.1, 0.8, 11.1, -2.5, 0.6, 0); B.box('plaster', C.stucco, 24.4, 0.5, 12.4, 0, 5.6, 0);
  for (const e of [1, -1]) { B.cyl('wood', C.red, 0.42, 0.3, 4.6, 8.6, 0.6, e * 2.2, 12); B.cyl('plaster', C.dark, 0.6, 0.5, 0.4, 8.6, 5.2, e * 2.2, 12); B.box('plaster', C.ochre, 5, 5, 0.7, 9, 0.6, e * 5.2); }
  B.box('wood', C.door, 0.2, 3.4, 2.2, 6.6, 0.6, 0); for (let k = 0; k < 9; k++) B.rod('wood', C.oldWood, [-10 + k * 2.6, 5.5, -6.6], [-10 + k * 2.6, 5.5, 6.6], 0.13, 6);
  B.pop(); CB.rect(8, -24, 12.6, 6.8, 0, -1250, -1100);
  for (const [x, z] of [[-20, -30], [-30, -16], [34, -34], [44, -22]]) house(K, { x, z, ry: r() * 0.4, w: 7, dp: 5, h: 2.8, roof: 'flat', wall: C.stucco });
  B.when(-1100, -700); for (const [x, z] of [[2, -26], [22, -22], [-16, -18]]) house(K, { x, z, ry: PI / 2 + r(), w: 7, dp: 4.5, h: 2.2, roof: 'thatch', wall: C.mud, roofCol: 0xb89a58 });
  B.when(-700, -570); temple(K, { x: 6, z: -24, w: 7, l: 15, nf: 2, colH: 4, d: 0.7, porch: 1, peripteral: false, steps: 1, mat: 'ashlar', col: C.poros, y: TOP });
  const old = { x: 5, z: -22, w: 18, l: 40, nf: 6, ns: 12, colH: 7.6, d: 1.55, mat: 'ashlar', col: C.poros, y: TOP };
  B.when(-570, -480); temple(K, old);
  B.when(-480, -421); temple(K, { ...old, ruin: 0.9, burnt: 1 });
  const parth = { x: 22, z: 24, w: 30.9, l: 69.5, nf: 8, ns: 17, colH: 10.4, d: 1.9, col: C.pentelic, roofCol: C.tileMarble, capCol: C.pentelic, y: PY };
  B.when(-488, Infinity); B.box('ashlar', C.poros, 79, 12, 42, 22, PY - 12, 24); for (let k = 0; k < 10; k++) B.box('ashlar', C.poros, 1, PY - TOP - k * 0.4, 12, -18 - k * 0.5, TOP, 24); CB.rect(22, 24, 39.8, 21.2, 0, -488);
  B.when(-488, -480); temple(K, { ...parth, stage: 0.08 });
  B.when(-480, -447); temple(K, { ...parth, stage: 0.08, burnt: 1 });
  const works = (x0, z0, x1, z1, h, cranes) => {   // scaffolding round a building and cranes on its floor
    scaffold(K, [x0, z0], [x1, z0], h, PY); scaffold(K, [x1, z1], [x0, z1], h, PY); scaffold(K, [x1, z0], [x1, z1], h, PY);
    for (const [x, z, ry, ch] of cranes) crane(K, x, PY + 1.3, z, ry, ch);
  };
  B.when(-447, -443); temple(K, { ...parth, stage: 0.3 }); works(-13, 8, 57, 40, 6.5, [[0, 24, 0, 9], [40, 24, PI, 9]]);
  B.when(-443, -440); temple(K, { ...parth, stage: 0.62 }); works(-13, 8, 57, 40, 12.8, [[10, 24, PI / 2, 14], [44, 24, -PI / 2, 14]]);
  B.when(-440, -438); temple(K, { ...parth, stage: 0.9 }); scaffold(K, [59, 8], [59, 40], 15, PY); scaffold(K, [-15, 40], [-15, 8], 15, PY);
  B.when(-438, Infinity); temple(K, parth);
  B.when(-438, -432); scaffold(K, [59, 12], [59, 36], 16.5, PY);   // the sculptors are still at the pediments
  B.when(-447, -432);   // the masons' yard west of the temple
  for (let i = 0; i < 14; i++) { const x = -48 + r() * 26, z = 9 + r() * 30; if (i % 2) B.cyl('marble', C.pentelic, 0.95, 0.95, 1.05, x, TOP, z, 16); else B.box('marble', C.pentelic, 1.6 + r(), 0.7 + r() * 0.5, 0.9 + r() * 0.5, x, TOP, z, r() * 3); }
  B.when(-456, Infinity); statue(K, -64, TOP, -20, PI, 7.5, { base: 2, spear: 1, shield: 1 });   // Athena Promachos, in bronze, looking to the gate
  B.when(-560, Infinity); B.box('ashlar', C.poros, 9, 1.6, 4.5, 72, TOP, -8); B.box('ashlar', C.poros, 10.5, 0.4, 6, 72, TOP, -8); CB.rect(72, -8, 5.2, 3, 0, -560);
  // the gate of Mnesikles
  const gate = { x: -97, z: 0, ry: PI, w: 21, l: 17, nf: 6, colH: 8.6, d: 1.55, porch: 1, rear: 1, peripteral: false, cella: false, steps: 1, sH: 0.1, col: C.pentelic, roofCol: C.tileMarble, y: TOP, pass: 1 };
  B.when(-437, -432); temple(K, { ...gate, stage: 0.62 }); scaffold(K, [-106.5, -11], [-106.5, 11], 9, TOP - 0.6);
  B.when(-432, Infinity); temple(K, gate);
  for (const e of [1, -1]) { temple(K, { x: -99, z: e * 19, ry: e * PI / 2, w: 12, l: 10, nf: 3, colH: 5.8, d: 1.05, porch: 1, peripteral: false, steps: 1, col: C.pentelic, roofCol: C.tileMarble, y: TOP }); B.box('marble', C.pentelic, 17, 6, 0.8, -97, TOP, e * 3.4 + e * 0.01); }
  for (const e of [1, -1]) CB.rect(-97, e * 8.5, 9, 5.3, 0, -437);
  B.when(-427, Infinity); B.box('ashlar', C.poros, 13, 22, 10, -104, TOP - 22, 30); temple(K, { x: -104, z: 30, w: 5.6, l: 8.4, nf: 4, colH: 4.1, d: 0.55, order: 'ionic', porch: 1, rear: 1, peripteral: false, col: C.pentelic, roofCol: C.tileMarble, y: TOP });   // Athena Nike on her bastion
  // the Erechtheion
  const erech = { x: 8, z: -27, w: 11.6, l: 22.8, nf: 6, colH: 6.6, d: 0.72, order: 'ionic', porch: 1, peripteral: false, col: C.pentelic, roofCol: C.tileMarble, y: TOP };
  B.when(-421, -406); temple(K, { ...erech, stage: 0.6 }); scaffold(K, [-4, -33.5], [20, -33.5], 7, TOP); scaffold(K, [20, -20.5], [-4, -20.5], 7, TOP);
  B.when(-406, Infinity); temple(K, erech);
  temple(K, { x: 1, z: -37.5, ry: PI / 2, w: 10.6, l: 8, nf: 4, colH: 7.4, d: 0.8, order: 'ionic', porch: 2, peripteral: false, cella: false, steps: 1, col: C.pentelic, roofCol: C.tileMarble, y: TOP - 1.2 });
  B.push(1, TOP, -18.6, 0); B.box('marble', C.pentelic, 6.4, 2, 3.6, 0, 0, 0);   // the porch of the maidens
  for (const [x, z] of [[-2.4, 1.2], [-0.8, 1.2], [0.8, 1.2], [2.4, 1.2], [-2.4, -0.4], [2.4, -0.4]]) { statue(K, x, 2, z, -PI / 2, 2.25, { mat: 'marble', col: C.pentelic, base: 0, robe: C.stucco }); B.cyl('marble', C.pentelic, 0.3, 0.2, 0.25, x, 4.2, z, 10); }
  B.box('marble', C.pentelic, 6.6, 0.55, 3.8, 0, 4.45, 0); B.box('marble', C.blue, 6.7, 0.12, 3.9, 0, 4.75, 0); B.pop(); CB.rect(1, -18.6, 3.4, 2, 0, -406);

  // ------------------------------------------------------------------ the theatre on the south slope
  for (const [y0, y1, col, mat] of [[-500, -330, C.wood, 'wood'], [-330, Infinity, C.poros, 'ashlar']]) {
    B.when(y0, y1); B.push(25, PLAIN, 100, 0);
    for (let i = 0; i < 15; i++) B.geo(mat, i % 2 ? col : shade(col, 0.9), new THREE.CylinderGeometry(13 + i * 0.95, 13 + i * 0.95, (i + 1) * 0.42 + 2, 28, 1, false, PI / 2, PI), 0, ((i + 1) * 0.42 + 2) / 2 - 2, 0);
    B.box(mat, col, 30, 5, 6, 0, 0, 13); B.box('tile', C.tile, 31, 0.2, 7, 0, 5, 13, 0, 0.12); for (let k = -3; k <= 3; k++) column(B, mat === 'wood' ? 'wood' : 'marble', mat === 'wood' ? C.red : C.marble, k * 3.6, 0, 9.4, 3.8, 0.5, 'doric', { lo: 1 });
    B.pop();
  }
  CB.rect(25, 113, 15.5, 3.5, 0, -500); keep.push([-12, 66, 62, 122]);

  // ------------------------------------------------------------------ the agora
  keep.push([112, -246, 244, -148], [92, -152, 150, -136], [-232, -226, -80, -78], [-300, -200, -225, -100], [-90, -262, 10, -196], [38, -152, 92, -124], [-278, -258, -234, -224], [104, -112, 136, -86]);
  B.when(-600, Infinity); drape(B, world, 'earth', -212, -208, -92, -90, 10, () => [0.04, 0xa39272]);
  B.when(); road(B, world, 'earth', WAY.slice(0, 7), 6, 0xa08f70); road(B, world, 'earth', PORT_ROAD, 5, 0x9a8a6a);
  B.when(-460, Infinity); stoa(K, { x: -150, z: -214, l: 40, dp: 11, panels: 4, band: C.blue });                                    // the Painted Stoa
  B.when(-500, Infinity); stoa(K, { x: -217, z: -196, ry: PI / 2, l: 18, dp: 8, colH: 4.2, d: 0.65, mat: 'ashlar', col: C.poros });   // the Royal Stoa
  house(K, { x: -221, z: -124, ry: PI / 2, w: 20, dp: 18, h: 6.5, wmat: 'ashlar', wall: C.poros });                                 // the council house
  B.when(-425, Infinity); stoa(K, { x: -218, z: -160, ry: PI / 2, l: 42, dp: 11, col: C.pentelic, inner: 1 });                      // the Stoa of Zeus
  stoa(K, { x: -150, z: -86, ry: PI, l: 80, dp: 12, colH: 4.6, mat: 'ashlar', col: C.poros, wall: C.mud });                           // the South Stoa
  B.when(-470, Infinity); B.cyl('plaster', C.limewash, 9, 9, 5.5, -206, PLAIN - 0.5, -101, 24); B.cyl('ashlar', C.poros, 9.2, 9.2, 1.4, -206, PLAIN - 0.5, -101, 24); B.cyl('tile', C.tile, 0.4, 9.9, 3.4, -206, PLAIN + 5, -101, 24); CB.circle(-206, -101, 9.2, -470);   // the Tholos
  B.when(-530, Infinity); stoa(K, { x: -99, z: -104, ry: -PI / 2, l: 14, dp: 7, colH: 3.6, d: 0.6, n: 5, mat: 'ashlar', col: C.poros }); B.box('plaster', 0x3a6a8a, 0.9, 0.08, 11, -99.5, PLAIN + 1.2, -104); B.box('ashlar', C.poros, 1.2, 0.6, 12, -99.5, PLAIN + 0.6, -104);   // the fountain house
  B.when(-522, Infinity); B.push(-140, PLAIN, -186, 0.3); for (const [x, z, w, d] of [[0, 4.5, 9.4, 0.4], [0, -4.5, 9.4, 0.4], [4.5, 0, 0.4, 3.4], [-4.5, 0, 0.4, 9.4], [4.5, 3.4, 0.4, 2.6], [4.5, -3.4, 0.4, 2.6]]) B.box('ashlar', C.poros, w, 1.1, d, x, 0, z); B.box('marble', C.marble, 2.4, 1.2, 1.4, 0, 0, 0); B.pop(); CB.circle(-140, -186, 6, -522);   // the altar of the Twelve Gods
  B.when(-477, Infinity); for (const e of [0, 1]) statue(K, -160 + e * 1.3, PLAIN, -128, -PI / 2, 2, { base: e ? 0 : 1.2, spear: 1 });
  B.when(-159, Infinity); stoa(K, { x: -86, z: -168, ry: -PI / 2, l: 70, dp: 13, colH: 5.2, d: 0.8, col: C.pentelic, inner: 1, upper: 3.6, n: 24 });   // the Stoa of Attalos
  // the smiths' temple on its hill
  const heph = { x: -262, z: -150, w: 13.7, l: 31.8, nf: 6, ns: 13, colH: 5.7, d: 1.02, col: C.pentelic, roofCol: C.tileMarble };
  B.when(-449, -415); temple(K, { ...heph, stage: 0.62 }); B.push(-262, H(-262, -150), -150); scaffold(K, [-17, -8.2], [17, -8.2], 7); scaffold(K, [17, 8.2], [-17, 8.2], 7); B.pop();
  B.when(-415, Infinity); temple(K, heph);
  // market stalls: an awning on four posts, a table of wares
  B.when(-600, Infinity);
  const STALLS = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) STALLS.push([-200 + i * 11, -150 + j * 15]);
  STALLS.forEach(([x, z], i) => {
    B.push(x, PLAIN, z, 0); for (const [px, pz] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) B.rod('wood', C.wood, [px, 0, pz], [px, pz < 0 ? 2.5 : 2.1, pz], 0.05, 5);
    B.box('plaster', [C.stucco, 0xb8643c, 0x7a8a9a, C.ochre][i % 4], 3.4, 0.05, 2.5, 0, 2.3, 0, 0, 0.2); B.box('wood', C.wood, 2.6, 0.08, 0.9, 0, 0.8, 0.2); for (const e of [1, -1]) B.box('wood', C.oldWood, 0.1, 0.8, 0.8, e * 1.1, 0, 0.2);
    for (let k = 0; k < 5; k++) { const kx = -1 + k * 0.5; if (i % 3 === 0) { B.cyl('plaster', 0xb86a3c, 0.07, 0.13, 0.32, kx, 0.88, 0.2, 8); B.cyl('plaster', C.dark, 0.05, 0.07, 0.1, kx, 1.2, 0.2, 8); } else if (i % 3 === 1) B.geo('plaster', [0x7a8a3a, 0xb8483a, 0xd8b04a][k % 3], BALL, kx, 0.98, 0.2, 0, 0, 0, 0.2, 0.1, 0.2); else B.box('plaster', [C.stucco, 0x8a3a2a, 0x4a5a7a][k % 3], 0.4, 0.1 + 0.04 * k, 0.6, kx, 0.88, 0.2); }
    B.pop(); CB.rect(x, z + 0.2, 1.4, 0.6, 0, -600);
    add(i % 4 === 3 ? 'greek-f' : 'greek', 'trade', x + (r() - 0.5), z - 0.75, -PI / 2, -600);
    if (i % 4 !== 2) add(['himation', 'greek-f', 'greek'][i % 3], i % 2 ? 'talk' : 'stand', x + (r() - 0.5) * 1.6, z + 1.7 + r() * 0.5, PI / 2, -600);
  });

  // before there was an agora: a threshing floor, a well and a few huts on the same ground
  B.when(-1250, -600); B.cyl('cyclop', 0xa89c84, 6.5, 6.6, 0.5, -158, PLAIN - 0.36, -168, 28); for (let k = 0; k < 6; k++) B.geo('thatch', 0xc8a850, BALL, -158 + Math.cos(k * 1.05) * 3.4, PLAIN + 0.16, -168 + Math.sin(k * 1.05) * 3.4, k, 0, 0, 1.5, 0.12, 0.8);
  for (let k = 0; k < 3; k++) { B.cyl('thatch', 0xc8a850, 0.3, 1.5, 2.4, -146 + k * 3.4, PLAIN, -158 - k * 2.4, 10); }
  B.cyl('cyclop', 0x9a9080, 1, 1.1, 0.8, -186, PLAIN, -150, 14); B.cyl('plaster', C.dark, 0.8, 0.8, 0.05, -186, PLAIN + 0.72, -150, 14); CB.circle(-186, -150, 1.2, -1250, -600);
  for (const [x, z, ry, y0, y1] of [[-204, -186, 0.3, -1250, -1100], [-120, -196, 2, -1250, -1100], [-196, -120, 1.2, -1250, -1100], [-206, -184, 0.5, -1100, -600], [-118, -200, 1.8, -1100, -600], [-126, -128, 4, -1100, -600]]) { B.when(y0, y1); house(K, { x, z, ry, w: 7, dp: 4.6, h: 2.3, roof: y0 < -1200 ? 'flat' : 'thatch', wall: y0 < -1200 ? C.stucco : C.mud, roofCol: 0xb89a58 }); }
  for (let i = 0; i < 4; i++) add('greek', 'thresh', -158 + Math.cos(i * 1.57 + 0.4) * 3.6, -168 + Math.sin(i * 1.57 + 0.4) * 3.6, toward(Math.cos(i * 1.57 + 0.4), Math.sin(i * 1.57 + 0.4), 0, 0), undefined, -600);
  add('greek-f', 'fetch-water', -184.4, -149.4, PI, undefined, -600); add('greek-f', 'carry', 0, 0, 0, undefined, -600, { prop: 'jar', path: [[-184, -147.6], [-200, -178]] }); add('greek-f', 'carry', 0, 0, 0, undefined, -600, { prop: 'jar', path: [[-187.6, -150.6], [-200, -128]] });
  walkers(['greek', 'greek-f'], 'carry', [[-152, -162], [-140, -150], [-122, -190]], 3, undefined, -600); add('greek', 'sit', -148, -174, 2.6, undefined, -600); add('greek', 'talk', -149.6, -175.6, 0.6, undefined, -600); add('greek-f', 'spin', -166, -178, -1, undefined, -600); add('greek-f', 'grind', -170, -160, 0.4, undefined, -600);
  for (let i = 0; i < 4; i++) add(i % 2 ? 'greek' : 'greek-f', 'reap', -130 + i * 4.5 + r() * 2, -150 + r() * 5, PI + r() * 0.4, undefined, -600); for (let i = 0; i < 3; i++) add('greek', 'hoe', -176 - i * 5, -196 + r() * 3, 0.4, undefined, -600);
  // ------------------------------------------------------------------ the town
  const clear = (x, z, pad) => { for (const k of keep) if (x > k[0] - pad && x < k[2] + pad && z > k[1] - pad && z < k[3] + pad) return false; for (const P of [WAY, PORT_ROAD]) for (let i = 0; i < P.length - 1; i++) { const ax = P[i][0], az = P[i][1], bx = P[i + 1][0] - ax, bz = P[i + 1][1] - az, t = clamp(((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz), 0, 1); if (Math.hypot(x - ax - bx * t, z - az - bz * t) < pad + 4) return false; } return sup(x, z) > 1.78 + pad * 0.012; };
  const homes = { myc: [], dark: [], a: [], b: [] };
  for (let gx = -330; gx <= 250; gx += 14.5) for (let gz = -300; gz <= 215; gz += 14.5) {
    const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3, d = Math.hypot(x + 60, z + 60), ry = Math.floor(r() * 4) * PI / 2 + (r() - 0.5) * 0.3, e = r(), w = 6.5 + r() * 3, dp = 4.6 + r() * 1.6;
    if (d > 300 || SEA[0] * x + SEA[1] * z > 235 || !clear(x, z, 7) || Math.abs(H(x, z) - PLAIN) > 0.05) continue;
    const north = Math.abs(x - 30) < 130 && z > -175 && z < -100;
    if (north && e < 0.55) homes.myc.push({ x, z, ry, w: w * 0.8, dp: dp * 0.9, h: 2.6, roof: 'flat', wall: tone(C.stucco, r, 0.08) });
    if (north && r() < 0.4) homes.dark.push({ x, z, ry, w: w * 0.75, dp: 4.4, h: 2.1, roof: 'thatch', wall: tone(C.mud, r, 0.1), roofCol: tone(0xb89a58, r, 0.15) });
    if (r() < 0.3 + 0.55 * smooth((260 - d) / 200)) (d < 190 && r() < 0.6 ? homes.a : homes.b).push({ x, z, ry, w, dp, h: 2.9 + r() * 1.4, wall: tone(r() < 0.7 ? C.limewash : C.mud, r, 0.08), roofCol: tone(C.tile, r, 0.14), yard: r() < 0.5 ? 3 + r() * 1.5 : 0, shed: r() < 0.5 });
  }
  for (const [list, y0, y1] of [[homes.myc, -1250, -1100], [homes.dark, -1100, -720], [homes.a, -720, Infinity], [homes.b, -590, Infinity]]) { B.when(y0, y1); for (const h of list) house(K, h); }
  // the Long Walls to the harbour, and the ship sheds
  const wallRun = (off) => { const P = beside(PORT_ROAD.slice(1), off); for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, ry = toward(a[0], a[1], b[0], b[1]), y = Math.min(H(a[0], a[1]), H(b[0], b[1])); B.box('ashlar', C.poros, L + 2, 6, 2.6, mx, y - 3, mz, ry); B.box('plaster', C.mud, L + 2, 4.5, 2.2, mx, y + 3, mz, ry); B.box('ashlar', C.poros, 5, 12, 5, a[0], y - 3, a[1], ry); B.box('tile', C.tile, 5.6, 0.3, 5.6, a[0], y + 9, a[1], ry); CB.rect(mx, mz, L / 2 + 1, 1.4, ry, ...B.span); } };
  for (const [y0, y1] of [[-457, -404], [-393, Infinity]]) { B.when(y0, y1); wallRun(42); wallRun(-42); }
  B.when(-480, Infinity); const ry0 = Math.atan2(SEA[0], SEA[1]);
  for (let k = 0; k < 6; k++) { const x = HARBOUR[0] + SHORE[0] * (14 + k * 8.4) - SEA[0] * 22, z = HARBOUR[1] + SHORE[1] * (14 + k * 8.4) - SEA[1] * 22; house(K, { x, z, ry: ry0, w: 7.6, dp: 30, h: 4.2, wmat: 'ashlar', wall: C.poros, y: 2.2 }); }

  // ------------------------------------------------------------------ boats
  const boat = (x, z, ry, len, beam, depth, col, mast) => {
    B.push(x, -depth * 0.42, z, ry); B.add('wood', hullGeo(len, beam, depth, { sheer: depth * 0.5 }), col); B.box('wood', shade(col, 1.15), len * 0.8, 0.06, beam * 0.72, 0, depth * 0.5, 0);
    if (mast) { B.rod('wood', C.wood, [0, depth * 0.5, 0], [0, mast, 0], 0.07, 6); B.rod('wood', C.wood, [0, mast * 0.9, -beam * 0.9], [0, mast * 0.9, beam * 0.9], 0.05, 5); B.box('plaster', C.stucco, 0.25, 0.4, beam * 1.7, 0, mast * 0.9 - 0.42, 0); }
    B.pop();
  };
  const sea = (a, b) => [HARBOUR[0] + SEA[0] * a + SHORE[0] * b, HARBOUR[1] + SEA[1] * a + SHORE[1] * b], along = Math.atan2(-SHORE[1], SHORE[0]);
  B.when();
  for (const [a, b, turn] of [[38, -30, 0.5], [55, 18, -0.9], [30, 75, 2.6]]) {
    const [x, z] = sea(a, b), ry = along + turn, c = Math.cos(ry), s = Math.sin(ry); boat(x, z, ry, 6.2, 1.9, 0.85, 0x6a5238, 0);
    add('greek', 'fish', x + c * 1.6, z - s * 1.6, ry - 1.2, undefined, undefined, { afloat: 1, y: 0.1 }); add('greek', 'row', x - c * 1.2, z + s * 1.2, ry + PI, undefined, undefined, { afloat: 1, y: -0.15, prop: 'none' });
  }
  { const [x, z] = sea(120, -90); boat(x, z, along + 0.3, 16, 5, 2.6, 0x5a4630, 9); B.push(x, 0, z, along + 0.3); B.box('plaster', C.stucco, 0.12, 5, 7.4, 0.3, 3.4, 0); B.pop(); }
  B.when(-483, Infinity);   // a trireme off the harbour mouth
  const TRI = sea(72, 44), tc = Math.cos(along), ts = Math.sin(along);
  boat(TRI[0], TRI[1], along, 36, 4.6, 2.3, 0x4a3a2a, 0); B.push(TRI[0], 0, TRI[1], along);
  B.geo('metal', C.bronze, BOX, 18.4, -0.5, 0, 0, 0, -PI / 2, 0.5, 2.6, 0.5); B.rod('wood', 0x4a3a2a, [-17.5, 1.2, 0], [-20.5, 4.6, 0], 0.22, 6); B.rod('wood', 0x4a3a2a, [-20.5, 4.6, 0], [-18.6, 6, 0], 0.16, 6);
  B.geo('plaster', C.stucco, BALL, 16.6, 1.2, 2.2, 0, 0, 0, 0.1, 0.5, 0.5); B.geo('plaster', C.stucco, BALL, 16.6, 1.2, -2.2, 0, 0, 0, 0.1, 0.5, 0.5);
  for (const e of [1, -1]) { B.box('wood', 0x5a4630, 30, 0.25, 0.5, -1, 1.25, e * 2.5); for (let i = 0; i < 26; i++) B.rod('wood', C.wood, [-13.5 + i * 1.05, 1.2 - (i % 3) * 0.25, e * 2.3], [-14.3 + i * 1.05, -0.5, e * (5.6 - (i % 3) * 0.5)], 0.035, 4); }
  B.pop();
  for (let i = 0; i < 11; i++) for (const e of [1, -1]) { const lx = -11.5 + i * 2.3, lz = e * 1.45; add('greek', 'row', TRI[0] + tc * lx + ts * lz, TRI[1] - ts * lx + tc * lz, along + PI, -483, undefined, { afloat: 1, y: 0.25, prop: 'none', phase: 0 }); }
  for (const [lx, lz] of [[14, 0.5], [12, -0.6], [-15.5, 0]]) add('hoplite', 'guard', TRI[0] + tc * lx + ts * lz, TRI[1] - ts * lx + tc * lz, along, -483, undefined, { afloat: 1, y: 0.45 });

  // ------------------------------------------------------------------ work on the land
  // olive press yard: a stone basin with two millstones turned by men walking round it, a beam press beside
  B.when(); B.push(120, PLAIN, -99, 0); B.cyl('ashlar', 0x9a9488, 1.25, 1.35, 0.7, 0, 0, 0, 16); B.cyl('wood', C.wood, 0.09, 0.09, 1.5, 0, 0.7, 0, 6); B.rod('wood', C.wood, [-2.3, 1.25, 0], [2.3, 1.25, 0], 0.06, 6);
  for (const e of [1, -1]) B.geo('ashlar', 0x8a857a, new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14).rotateZ(PI / 2), e * 0.7, 1.2, 0);
  B.box('ashlar', 0x9a9488, 1.6, 0.5, 1.6, 6, 0, 3); B.beam('wood', C.oldWood, [3.2, 1.1, 3], [9.5, 1.6, 3], 0.3); B.box('ashlar', 0x9a9488, 0.9, 1, 0.9, 9.4, 0, 3); for (let k = 0; k < 4; k++) B.geo('plaster', 0x8a6a3a, BALL, 5.6 + (k % 2) * 0.8, 0.7 + (k >> 1) * 0.25, 2.6 + (k >> 1) * 0.5, 0, 0, 0, 0.5, 0.14, 0.5);
  for (let k = 0; k < 5; k++) { B.cyl('plaster', 0xb06a40, 0.2, 0.32, 0.8, -4 + k * 0.8, 0, 5, 9); B.cyl('plaster', 0xb06a40, 0.12, 0.2, 0.3, -4 + k * 0.8, 0.8, 5, 9); }
  B.pop(); CB.circle(120, -99, 1.4);
  const ringPath = (cx, cz, R, n = 12) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * 6.2832) * R, cz + Math.sin((i / n) * 6.2832) * R]);
  for (const ph of [0, 0.5]) add('greek', 'push', 122, -99, 0, undefined, undefined, { path: ringPath(120, -99, 2.25), phase: ph, speed: 0.75 });
  add('greek', 'stand', 127, -94.5, 0.4); add('greek-f', 'crouch', 115.5, -94.4, 0.3);
  // the groves
  const T = [];
  for (let gx = 130; gx <= 400; gx += 18) for (let gz = -150; gz <= 110; gz += 18) { const x = gx + (r() - 0.5) * 7, z = gz + (r() - 0.5) * 7; if (sup(x, z) < 2 || !clear(x, z, 3) || CB.inside(x, z, -430, 4) || r() < 0.12) continue; const g = 0.8 + r() * 0.3; T.push({ kind: 'olive', x, z, s: 0.8 + r() * 0.5, tint: [g * 0.82, g * 0.95, g * 0.86] }); }
  for (let i = 0; i < 90; i++) { const x = -420 + r() * 840, z = -420 + r() * 700, d = Math.hypot(x + 60, z + 60); if (d < 235 || base(x, z) < 4 || base(x, z) > 60 || (x > 120 && z > -160 && z < 120)) continue; const g = 0.75 + r() * 0.3; T.push({ kind: 'olive', x, z, s: 0.7 + r() * 0.6, tint: [g * 0.82, g * 0.95, g * 0.86] }); }
  for (let i = 0; i < 80; i++) { const x = -330 + r() * 600, z = -300 + r() * 520; if (!clear(x, z, 2) || CB.inside(x, z, -430, 2.5) || CB.inside(x, z, -1200, 2.5) || Math.abs(H(x, z) - PLAIN) > 3 || (x > 100 && x < 250 && z < -150)) continue; const g = 0.5 + r() * 0.2; T.push({ kind: 'cypress', x, z, s: 0.6 + r() * 0.6, tint: [g * 0.8, g, g * 0.8], y0: r() < 0.5 ? -1250 : -700 }); }
  for (let i = 0; i < 60; i++) { const a = r() * 6.283, q = 1.2 + r() * 0.45, x = Math.cos(a) * 125 * q, z = Math.sin(a) * 66 * q * (0.9 + r() * 0.3); if (sup(x, z) < 1.15 || (x < -90 && Math.abs(z) < 24) || CB.inside(x, z, -430, 2) || (z > 60 && Math.abs(x - 25) < 40)) continue; const g = 0.7 + r() * 0.3; T.push({ kind: 'shrub', x, z, s: 0.8 + r() * 1.1, tint: [g * 0.9, g, g * 0.75] }); }
  for (let i = 0; i < 45; i++) { const a = r() * 6.283, d = 60 + r() * 150, x = 340 + Math.cos(a) * d, z = -360 + Math.sin(a) * d, g = 0.6 + r() * 0.25; T.push({ kind: 'pine', x, z, s: 0.6 + r() * 0.5, tint: [g * 0.85, g, g * 0.8] }); }
  const grove = trees(world, group, T);
  // olive harvest: beating the branches with poles, gathering, carrying
  const OL = T.filter((t) => t.kind.startsWith('olive') && t.x > 135 && t.x < 215 && t.z > -100 && t.z < -20).slice(0, 7);
  OL.forEach((t, i) => { add('greek', 'thresh', t.x - 1.9, t.z + 0.3, 0, undefined, undefined, { prop: 'staff' }); add(i % 2 ? 'greek-f' : 'greek', 'crouch', t.x + 1.2, t.z + 1.7 + r(), r() * 6); if (i < 4) add(i % 2 ? 'greek' : 'greek-f', 'carry', t.x, t.z, 0, undefined, undefined, { path: [[t.x + 2.4, t.z - 1.5], [140, t.z * 0.5 - 48], [124, -92]] }); });
  // fields north-east: ploughing with a mule, hoeing, sowing, reaping
  const FIELD = [120, -238, 236, -160];
  B.when(); drape(B, world, 'earth', FIELD[0], FIELD[1], FIELD[2], FIELD[3], 6, (x, z) => [0.05, Math.floor((z + 238) / 13) % 2 ? shade(0x8a6f48, 0.9 + 0.2 * hash(Math.floor(x / 3), 7)) : 0xc0a860]);
  const beasts = new Beasts(world, group);
  for (const [z, ph] of [[-232, 0], [-206, 0.45]]) { const loop = [[126, z], [230, z], [230, z + 3], [126, z + 3], [126, z]]; add('greek', 'plough', 0, 0, 0, undefined, undefined, { path: loop, phase: ph, speed: 0.85 }); beasts.trail(M.horse, loop, 0.85, ph, -Infinity, Infinity, { lead: 3.4, scale: 0.78 }); }
  for (let i = 0; i < 4; i++) add('greek', 'hoe', 134 + i * 9 + r() * 3, -219 + (i % 2) * 2, r() * 0.6 - 0.3);
  add('greek', 'sow', 0, 0, 0, undefined, undefined, { path: [[128, -193], [228, -193], [228, -190.5], [128, -190.5], [128, -193]] });
  for (let i = 0; i < 5; i++) add(i % 3 === 2 ? 'greek-f' : 'greek', 'reap', 150 + i * 5.5 + r() * 2, -178 - r() * 3, 0.2 * (r() - 0.5));
  walkers(['greek', 'greek-f'], 'carry', [[176, -172], [150, -150], [112, -145], [94, -141]], 3);
  // the household yard north of the rock: weaving, spinning, grinding, cooking
  [[46, -146, 0], [53, -146, 0], [60, -146, 0]].forEach(([x, z]) => add('greek-f', 'weave', x, z, PI / 2));
  for (let i = 0; i < 4; i++) add('greek-f', 'spin', 44 + i * 4.5, -132 + (i % 2) * 2.5, -PI / 2 + (r() - 0.5));
  add('greek-f', 'grind', 72, -144, 2.4); add('greek-f', 'grind', 76, -139, 2.9); add('greek-f', 'cook', 84, -146, 2.6); add('greek', 'cook', 86, -132, -2.2);
  add('greek', 'sit', 80, -128, -1.2); add('greek-f', 'talk', 66, -131, 0.5); add('greek-f', 'stand', 68, -130, 3.6);
  // potters and their kiln (the Kerameikos), a smithy under the hill
  B.when(-760, Infinity); B.push(-256, PLAIN, -246, 0); B.cyl('plaster', 0x9a6a4a, 1.3, 1.7, 1.5, 0, 0, 0, 14); B.geo('plaster', 0x9a6a4a, BALL, 0, 1.5, 0, 0, 0, 0, 1.3, 1.1, 1.3); B.box('plaster', C.dark, 0.7, 0.7, 0.4, 0, 0, 1.55);
  for (let k = 0; k < 12; k++) { const x = 4 + (k % 6) * 0.75, z = -2 + Math.floor(k / 6) * 0.9; B.cyl('plaster', k % 3 ? 0xb5683c : C.dark, 0.14, 0.24, 0.55, x, 0, z, 9); B.cyl('plaster', k % 3 ? 0xb5683c : C.dark, 0.1, 0.14, 0.2, x, 0.55, z, 9); }
  B.pop(); CB.circle(-256, -246, 1.9, -760);
  for (let i = 0; i < 5; i++) add('greek', 'potter', -272 + i * 3.6, -234 - (i % 2) * 3, PI / 2 - 0.4 + r() * 0.8, -760);
  add('greek', 'paint', -246, -232, 2.2, -760); add('greek', 'carry', 0, 0, 0, -760, undefined, { prop: 'amphora', path: [[-262, -240], [-240, -228], [-212, -214], [-196, -160]] });
  B.when(-600, Infinity); B.push(-240, PLAIN, -116, 0); B.box('cyclop', 0x8a8478, 1.4, 0.9, 1.4, 0, 0, 0); B.box('plaster', C.dark, 1, 0.1, 1, 0, 0.9, 0); B.box('wood', C.wood, 3.6, 0.1, 3.6, 0.6, 2.6, 0.6, 0, 0.1); for (const [x, z] of [[-1, -1], [2.2, -1], [-1, 2.2], [2.2, 2.2]]) B.rod('wood', C.wood, [x, 0, z], [x, 2.6, z], 0.06, 5); B.pop(); CB.circle(-240, -116, 1);
  add('greek', 'hammer', -238.4, -113.8, 0.2, -600); add('greek', 'hammer', -236, -117, 2.8, -600); add('greek', 'tend-fire', -241.6, -116, 0, -600, undefined, { prop: 'none' });

  // ------------------------------------------------------------------ the people of the town
  // the first builders: boulders for the wall
  B.when(-1250, -1200); for (let i = 0; i < 9; i++) B.geo('cyclop', 0xb3a78f, BALL, -60 - r() * 28, TOP + 0.5, 24 + r() * 14, r() * 3, 0, 0, 0.9 + r() * 0.6, 0.7, 0.8 + r() * 0.4);
  for (let i = 0; i < 4; i++) add('greek', 'chisel', -62 - i * 6, 20 + (i % 2) * 5, r() * 6, -1250, -1200);
  for (let i = 0; i < 5; i++) add('greek', 'carry', 0, 0, 0, -1250, -1100, { path: [[-214, -10], [-204, -6], [-108, -6], [-70, 10 + i * 3]], phase: i / 5 });
  for (const [x, z] of [[-112, 6], [-112, -6], [-84, 5], [-84, -5]]) add('hoplite', 'guard', x, z, PI);
  // everyday traffic on the ramp and the ways
  walkers(['greek', 'greek-f', 'greek'], 'carry', [[-214, -30], [-203, -6], [-125, -6], [-110, -1.4], [-84, -1.4], [-60, -8], [-40, -10]], 3, -1100);
  walkers(['himation', 'greek', 'greek-f', 'himation'], 'walk', [[-226, -230], [-150, -152], [-126, -112], [-148, -60], [-170, -48]], 5, -700);
  walkers(['greek-f'], 'carry', [[-103.5, -100], [-126, -96], [-150, -58], [-170, -44]], 3, -530, undefined, { prop: 'jar' }); walkers(['greek-f'], 'carry', [[-103.5, -108], [-120, -112], [-128, -180], [-100, -230]], 2, -530, undefined, { prop: 'jar' });
  add('greek-f', 'talk', -105, -103, 0.3, -530); add('greek-f', 'stand', -105.5, -105.5, -0.2, -530); add('greek-f', 'fetch-water', -103.8, -99, 0, -530);
  walkers(['greek', 'greek'], 'carry', PORT_ROAD, 4, -700, undefined, { prop: 'amphora' }); walkers(['greek', 'himation', 'greek-f'], 'walk', beside(PORT_ROAD, 1.8), 3, -700);
  const lanes = [...beside(PORT_ROAD, -1.4), ...beside(PORT_ROAD, 1.4).reverse()]; lanes.push(lanes[0]);
  beasts.trail(M.horse, lanes, 1.2, 0.2, -700, Infinity, { scale: 0.82, tow: cart('jars', 2) }); add('greek', 'herd', 0, 0, 0, -700, undefined, { path: lanes, phase: 0.2 + 5.2 / loopOf(lanes).L, speed: 1.2 });
  // talk in the agora; the philosophers in the Painted Stoa
  circle(['himation', 'greek', 'himation'], -152, -176, 5, 1.5, -600); circle(['himation', 'himation', 'greek'], -118, -140, 4, 1.3, -600); circle(['greek', 'himation'], -178, -104, 3, 1.1, -600);
  for (let i = 0; i < 7; i++) add('himation', ['talk', 'point', 'stand', 'sit', 'talk', 'stand', 'point'][i], -164 + i * 4.6 + r(), -213.5 + (i % 2) * 2.2, [0.6, 2.4, -PI / 2, -PI / 2, 0.3, 2.9, -1.2][i], -460, undefined, { y: 0.6, ok: 1 });
  circle(['himation'], -150, -203, 6, 1.7, -460); add('himation', 'write', -139, -204.5, 2.6, -460); add('greek', 'sit', -161, -205, 0.2, -460);
  walkers(['himation', 'himation', 'greek'], 'walk', [[-168, -206.5], [-132, -206.5]], 3, -460);
  // hoplites drilling: eight files, four deep
  const DRILL = [[-80, -252], [0, -252], [0, -206], [-80, -206], [-80, -252]], L0 = loopOf(DRILL).L;
  for (let f = 0; f < 8; f++) { const P = beside(DRILL, (f - 3.5) * 1.05), Lf = loopOf(P).L; for (let k = 0; k < 4; k++) add('hoplite', 'march', 0, 0, 0, -650, undefined, { path: P, speed: 1.25 * Lf / L0, phase: 0.3 - (k * 1.5) / L0 }); }
  add('hoplite', 'point', -40, -229, PI / 2, -650); add('himation', 'stand', -42, -228, PI / 2, -650);
  // the procession of the Panathenaia, from the city gate up to the altar
  const WL = loopOf(WAY).L - Math.hypot(WAY[0][0] - 66, WAY[0][1] + 6);
  [['himation', 'herd'], ['greek-f', 'carry'], ['greek-f', 'carry'], ['greek-f', 'walk'], ['greek-f', 'walk'], ['greek-f', 'carry'], ['greek-f', 'carry'], ['greek', 'carry', 'amphora'], ['greek', 'carry', 'amphora'], ['himation', 'walk'], ['himation', 'walk'], ['himation', 'walk'], ['himation', 'walk'], ['greek', 'walk'], ['greek', 'walk'], ['hoplite', 'march'], ['hoplite', 'march'], ['hoplite', 'march'], ['hoplite', 'march']]
    .forEach(([o, a, p], i) => add(o, a, 0, 0, 0, -566, undefined, { path: i % 2 ? beside(WAY, 0.75) : beside(WAY, -0.75), phase: 0.3 - (Math.floor(i / 2) * 1.7) / (2 * WL), speed: 1.05, ...(p ? { prop: p } : {}) }));
  for (let i = 0; i < 5; i++) add(i % 2 ? 'himation' : 'greek-f', 'pray', 66 + (i % 3) * 1.6, -13.5 - Math.floor(i / 3) * 1.5, PI / 2 + (r() - 0.5) * 0.3, -560);
  // building the Parthenon
  for (let i = 0; i < 9; i++) add('greek', 'chisel', -48 + (i % 5) * 5.6 + r(), 11 + Math.floor(i / 5) * 9 + r() * 4, r() * 6.28, -447, -432);
  add('himation', 'point', -24, 5, -0.5, -447, -432); add('himation', 'talk', -22.5, 4, 2.4, -447, -432); add('greek', 'write', -21, 6.2, 2.9, -447, -432);
  for (let i = 0; i < 2; i++) add('greek', 'saw', -30 + i * 7, 41, 1.5, -447, -438);
  walkers(['greek'], 'carry', [[-22, 1.6], [20, 1.4], [60, 1.6]], 3, -447, -438, { prop: 'sack' }); walkers(['greek'], 'carry2', [[-205, 3], [-108, 3], [-84, 4], [-50, 6]], 2, -447, -438);
  for (let i = 0; i < 4; i++) add('greek', 'paint', 60, 14 + i * 6.5, PI, -438, -432, { y: PY - TOP + 4.3, ok: 1 });
  const HAUL = [[-203, 4.5], [-108, 4.5], [-84, 5.5], [-56, 10], [-50, 14], [-56, 13], [-84, 8.2], [-108, 7.8], [-203, 7.8], [-203, 4.5]], HL = loopOf(HAUL);
  for (let i = 0; i < 8; i++) add('greek', 'haul', 0, 0, 0, -447, -438, { path: i % 2 ? beside(HAUL, 0.55) : beside(HAUL, -0.55), speed: 0.7, phase: 0.1 - (Math.floor(i / 2) * 1.25) / HL.L });
  const sledge = new THREE.Group(), sb = new Batch(); sb.box('wood', C.oldWood, 3.2, 0.16, 0.2, 0, 0, 0.6); sb.box('wood', C.oldWood, 3.2, 0.16, 0.2, 0, 0, -0.6); for (let k = -1; k <= 1; k++) sb.box('wood', C.wood, 0.2, 0.12, 1.5, k * 1.2, 0.16, 0); sb.build(sledge);
  const drum = new Batch(); drum.cyl('marble', C.pentelic, 0.95, 0.95, 1.1, 0, 0.28, 0, 18); const drumG = new THREE.Group(); drum.build(drumG); sledge.add(drumG); group.add(sledge);
  // the Erechtheion masons; later the stonecutters of the theatre
  for (let i = 0; i < 6; i++) add('greek', i === 5 ? 'paint' : 'chisel', 26 + (i % 3) * 6 + r(), -13.5 + Math.floor(i / 3) * 4.5, r() * 6.28, -421, -406);
  for (let i = 0; i < 4; i++) add('greek', 'chisel', 52 + i * 4, 118 + (i % 2) * 3, r() * 6.28, -342, -330);
  // a chorus rehearsing in the orchestra, and people on the benches
  for (let i = 0; i < 8; i++) add(i % 2 ? 'greek' : 'himation', 'dance', 25 + Math.cos(i * 0.785) * 5, 104 + Math.sin(i * 0.785) * 4, toward(Math.cos(i * 0.785), Math.sin(i * 0.785), 0, 0), -500);
  for (let i = 0; i < 12; i++) { const tier = 2 + (i % 5) * 2, a = PI * (1.12 + 0.76 * r()), R = 13 + tier * 0.95 - 0.5, x = 25 + Math.cos(a) * R, z = 100 + Math.sin(a) * R; add(i % 3 ? 'himation' : 'greek-f', 'sit', x, z, toward(x, z, 25, 104), -500, undefined, { y: PLAIN + tier * 0.42 - H(x, z), seat: 0.42, ok: 1 }); }
  // loading at the harbour
  const q0 = sea(-5, -3), q1 = sea(-30, -8); walkers(['greek'], 'carry', [q0, q1, sea(-55, -14)], 4, -480, undefined, { prop: 'amphora' }); add('himation', 'point', q0[0] - 3, q0[1] - 4, 1, -480); add('greek', 'stand', q0[0] - 4.4, q0[1] - 3, 3.6, -480);

  // ------------------------------------------------------------------ beasts and birds
  beasts.circle(M.gull, 4, -Infinity, Infinity, { cx: HARBOUR[0], cz: HARBOUR[1] + 40, spread: 70, R: [30, 90], speed: 9, fly: 16 });
  beasts.circle(M.crow, 3, -Infinity, Infinity, { cx: 60, cz: -60, spread: 150, R: [30, 80], speed: 8, fly: 30 });
  beasts.circle(M.hawk, 1, -Infinity, Infinity, { cx: 0, cz: 0, spread: 60, R: [80, 140], speed: 10, fly: 75 });
  beasts.circle(M.horse, 2, -Infinity, Infinity, { cx: 300, cz: -200, spread: 30, R: [8, 20], speed: 0.9, scale: [0.78, 0.9] });

  B.when().build(group);
  const folk = actors(world, A, { seed: 7 }); group.add(...folk.meshes);
  if (typeof location !== 'undefined' && location.search.includes('audit')) audit('greece', A.filter((a) => !a.ok), CB, world, 0, uToYear);
  const _a = [0, 0], _b = [0, 0], at = (P, d, out) => { d = ((d % P.L) + P.L) % P.L; let i = 0; while (i < P.cum.length - 2 && P.cum[i + 1] < d) i++; const t = (d - P.cum[i]) / (P.cum[i + 1] - P.cum[i]); out[0] = P.pts[i][0] + (P.pts[i + 1][0] - P.pts[i][0]) * t; out[1] = P.pts[i][1] + (P.pts[i + 1][1] - P.pts[i][1]) * t; return out; };
  return {
    update(u, t, env, camera, view) {
      const year = uToYear(u); CB.year = year; B.update(year); grove.update(year); beasts.update(year, t); folk.update(u, t, view);
      sledge.visible = year >= -447 && year < -438;
      if (sledge.visible) {
        const d = 0.1 * HL.L + 0.7 * t - 9; at(HL, d, _a); at(HL, d + 1, _b); const ya = H(_a[0], _a[1]), yb = H(_b[0], _b[1]);
        sledge.position.set(_a[0], ya + 0.08, _a[1]); sledge.rotation.set(0, Math.atan2(-(_b[1] - _a[1]), _b[0] - _a[0]), 0); sledge.rotation.order = 'YZX'; sledge.rotation.z = Math.atan2(yb - ya, 1);
        drumG.visible = (((d % HL.L) + HL.L) % HL.L) < HL.cum[4];
      }
    },
    collide: (pos) => CB.collide(pos),
  };
}

export default {
  place: 'Greece · Athens', coords: [37.97, 23.73],
  terrain: { base, relief: () => 0, bounds: { x: 400, z: 400 }, tint },
  spawn: { x: -172, z: -196, yaw: 3.9 },
  env(year, e) {
    e.hill = 1; e.sea = 0; e.ice = -60; e.grass = 0.06; e.precip = 0; e.cloud = 0.16; e.fogD = 0.0011; e.sunI = 2.2; e.sunEl = 0.95; e.amb = 1.05; e.glow = 0;
    put(e.top, SKY); put(e.hor, HOR); put(e.ground, GROUND); put(e.water, WATER); put(e.far, FAR); put(e.lava, [0, 0, 0]);
    if (year > -481 && year < -478) { const k = 1 - Math.abs(year + 479.7) / 1.4; if (k > 0) { e.fogD += 0.002 * k; e.sunI -= 0.9 * k; put(e.hor, [HOR[0] - 0.25 * k, HOR[1] - 0.38 * k, HOR[2] - 0.5 * k]); } }   // the smoke of the Persian fire
  },
  events, build,
};
