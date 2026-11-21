// Rome, 150 BCE – 500 CE: the Forum between the Capitoline and the Palatine, the Tiber, the Colosseum, an aqueduct and the road out.
// Tufa, brick and timber under the Republic; marble at the height of the empire; then fire, stripped roofs and grass between the paving stones.
import * as THREE from 'three';
import { rng, clamp, smooth } from './util.js';
import { yearToU, uToYear } from './timeline.js';
import { actors } from './people-actors.js';
import { species } from './animals.js';
import { Batch, Blocks, Beasts, C, temple, column, archRing, scaffold, crane, drape, road, statue, trees, cart, hullGeo, gableGeo, archGeo, beside, loopOf, toward, tone, shade, audit, BOX, BALL } from './site-greece-kit.js';

const F = 12, PI = Math.PI, U = yearToU;
const T0 = [-520, -300], TU = [0.427, 0.904];                                   // the Tiber: a point on its centre line, and the way it flows
const river = (x, z) => (x - T0[0]) * TU[1] - (z - T0[1]) * TU[0];             // metres east of the centre line
const bank = (t, d) => [T0[0] + TU[0] * t + TU[1] * d, T0[1] + TU[1] * t - TU[0] * d];
const capD = (x, z) => Math.hypot(x + 250, z + 20), palD = (x, z) => Math.hypot((x + 60) / 1.35, z - 175);
function base(x, z) {
  const d = river(x, z);
  let h = F + 22 * smooth((95 - capD(x, z)) / 50) + 24 * smooth((125 - palD(x, z)) / 50) + 12 * smooth((-z - 110) / 200);
  h += 3 * Math.sin(x * 0.019 + 1) * Math.cos(z * 0.016) * smooth((x - 660) / 120) + 130 * smooth((x - 800) / 260) * (0.6 + 0.4 * Math.sin(z * 0.005)) + 90 * smooth((Math.abs(z) - 760) / 300);
  h -= 4 * smooth((170 - d) / 100) * (d > 0 ? 1 : 0) + (d <= 0 ? 4 : 0); h += 55 * smooth((-d - 170) / 260);   // the low ground by the river; the Janiculum beyond it
  const f = smooth((62 - Math.abs(d)) / 27); return h * (1 - f) - 5 * f;
}
const hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
const tint = (x, z) => (x > 480 && x < 780 ? 0.86 + 0.3 * hash(Math.floor(x / 44), Math.floor(z / 30)) : 1);
const hex = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255], put = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }, mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const SKY = hex(0x3a84d6), HOR = hex(0xd6e0e4), GROUND = hex(0x80704e), WATER = hex(0x5a6a4a), FAR = hex(0x7a8060), DULL = hex(0xb8bcb8), WEEDY = hex(0x6f7446);
const COL = { cx: 300, cz: 30, a: 94, b: 78 };

const events = [
  { y: -150, t: 'The Republic', h: 'A city of brick, timber and brown tufa, some 300,000 people. The Forum is market, law court and parliament at once; the senators meet in the Curia at its corner.', w: 'In 146 BCE Rome destroys Carthage and Corinth in the same year. Polybius, a Greek hostage, is explaining to his countrymen how it happened.' },
  { y: -144, t: 'The Aqua Marcia', h: 'A new aqueduct is being built: 91 kilometres of channel, the last stretch carried on arches, bringing cold spring water from the Anio valley.', w: 'On Rhodes, Hipparchus is cataloguing the stars. Within a generation the Han open the Silk Road.' },
  { y: -44, t: 'The Ides of March', h: 'Caesar is stabbed at a meeting of the Senate, and his body is burned here in the Forum. His heir will end the Republic and call it a restoration.', w: 'Cleopatra rules Egypt for fourteen more years. Rome now holds everything from Spain to Syria.' },
  { y: 1, t: 'Augustus', h: 'Augustus boasts that he found a city of brick and leaves it marble. A million people live here; seven aqueducts bring their water, and 200,000 of them are given free grain.', w: 'The Han census of 2 CE counts 58 million people. A carpenter\'s son is growing up in Galilee.' },
  { y: 64, t: 'The Great Fire', h: 'Fire burns for six days and then three more. Of the city\'s fourteen districts only four are untouched. Nero builds a palace with a lake on the ruins.', w: 'The Christians are blamed and killed. In Judaea, revolt is two years away.' },
  { y: 80, t: 'The Colosseum', h: 'Where Nero\'s lake was, Vespasian and Titus have built an amphitheatre for 50,000, paid for with the spoils of Jerusalem. The opening games last a hundred days.', w: 'Vesuvius buried Pompeii last year. In China, paper is about to come into use.' },
  { y: 117, t: 'The widest empire', h: 'Under Trajan the empire is as large as it will ever be, from northern Britain to the Persian Gulf. Rome has ten aqueducts, a thousand fountains, and blocks of flats six storeys high.', w: 'Some sixty million people live under Roman law, and as many under the Han. Ptolemy will soon map the sky from Alexandria.' },
  { y: 271, t: 'Walls', h: 'For the first time in six centuries Rome needs a wall. Aurelian builds nineteen kilometres of brick in five years. Emperors seldom come here now.', w: 'Plague and civil war: more than twenty emperors in fifty years. The Sasanians rule Persia; the Han have fallen.' },
  { y: 330, t: 'The capital moves', h: 'Constantine has made Christianity lawful and founded a new capital on the Bosporus. Rome keeps its Senate, its marble and its bread dole; the court is elsewhere.', w: 'The Gupta kings are rising in India. The Maya are building Tikal.' },
  { y: 410, t: 'The sack', h: 'Alaric\'s Goths come in by the Salarian Gate and loot for three days. The Basilica Aemilia burns; coins melt into its marble floor and are still there.', w: '"The city which had taken the whole world was itself taken," writes Jerome in Bethlehem. Britain is told to look to its own defence.' },
  { y: 455, t: 'The Vandals', h: 'Fourteen days of plunder this time. The gilded bronze tiles are stripped from the Temple of Jupiter. The aqueducts still run; grass grows between the paving stones.', w: 'Attila died two years ago. Each decade fewer people live in Rome.' },
  { y: 476, t: 'The last emperor', h: 'A boy called Romulus Augustulus is pensioned off by a Germanic general. Hardly anyone here notices: the Senate still meets, and there are still games in the Colosseum.', w: 'In Constantinople the empire goes on for another thousand years. In India Aryabhata is born; he will work out that the Earth turns.' },
];

/** A block of flats: shops under a beam on the street side (+z), brick storeys above. Returns where its shop fronts are. */
function insula(K, o) {
  const { B, r } = K, { x, z, ry = 0, w, dp, floors, col = C.brick, ruin = 0 } = o, y = o.y ?? K.world.heightAt(x, z) - 0.2, n = Math.max(2, Math.round(w / 4.2)), bw = w / n, wall = ruin ? shade(col, 0.55) : col, fronts = [];
  // q: this block's own dice (the shared ones must fall as they always did). Half the blocks keep their plaster, peeling off the brick.
  const q = rng(Math.abs(Math.floor(x * 31.7 + z * 17.3)) + 11), rend = !ruin && q() < 0.5, fm = rend ? 'render' : 'brick', fcol = rend ? tone([C.stucco, C.ochre, 0xd8b890][Math.floor(q() * 3)], q, 0.08) : wall, bal = floors > 2 && q() < 0.4;
  const win = (wx, wy, wz, wr) => (ruin ? B.quad('plain', C.dark, 1, 1.4, wx, wy + 0.15, wz, wr) : B.quad('window', tone(0xffffff, q, 0.12), 1.3, 1.75, wx, wy, wz, wr, [0.5, 0.5, q() < 0.5 ? 0 : 0.5, q() < 0.5 ? 0 : 0.5]));
  B.push(x, y, z, ry);
  B.slab('ashlar', C.tufa, w + 0.3, 3.2, dp + 0.3, 0, -3, 0); B.slab('plaster', 0x5a4c3c, w - 0.2, 4, dp - 1.6, 0, 0, -0.8);
  for (let i = 0; i <= n; i++) B.slab('brick', wall, 0.8, 3.3, 1.6, -w / 2 + i * bw + (i === 0 ? 0.4 : i === n ? -0.4 : 0), 0, dp / 2 - 0.8);
  B.box('ashlar', ruin ? C.soot : C.travertine, w, 0.7, 1.7, 0, 3.3, dp / 2 - 0.85);
  for (let i = 0; i < n; i++) {
    const bx = -w / 2 + (i + 0.5) * bw; fronts.push([x + Math.cos(ry) * bx + Math.sin(ry) * (dp / 2), z - Math.sin(ry) * bx + Math.cos(ry) * (dp / 2)]);
    if (o.shops && !ruin) { B.box('ashlar', C.travertine, bw * 0.5, 0.95, 0.5, bx - bw * 0.14, 0, dp / 2 - 0.3); for (let k = 0; k < 3; k++) B.cyl('plaster', [0xb06a40, 0x8a5a3a, 0xc8a050][(i + k) % 3], 0.1, 0.16, 0.34, bx - bw * 0.3 + k * 0.4, 0.95, dp / 2 - 0.3, 8); if (i % 2 === 0) B.box('wood', tone(C.wood, r), bw * 0.9, 0.07, 1.5, bx, 3.1, dp / 2 + 0.6, 0, 0.3); else if (q() < 0.6) B.box('plaster', tone([0xa8502e, 0xc9a050, 0x7a8a6a][i % 3], q, 0.1), bw * 0.8, 0.05, 1.3, bx, 3.05, dp / 2 + 0.5, 0, 0.36); }
  }
  const up = ruin ? Math.max(1, Math.round((floors - 1) * (0.3 + r() * 0.4))) : floors - 1;
  for (let k = 0; k < up; k++) {
    const yy = 4 + k * 3.1, t4 = tone(wall, r, 0.04); B.slab(fm, rend ? fcol : t4, w, 3.1, dp, 0, yy, 0); B.box('ashlar', ruin ? C.soot : C.travertine, w + 0.24, 0.18, dp + 0.24, 0, yy, 0);
    for (let i = 0; i < n; i++) for (const e of [1, -1]) win(-w / 2 + (i + 0.5) * bw, yy + 0.8, e * (dp / 2 + 0.02), e > 0 ? 0 : PI);
    for (const e of [1, -1]) for (const qq of [-0.25, 0.25]) win(e * (w / 2 + 0.02), yy + 0.8, qq * dp, e * PI / 2);
    if (k === 0 && (o.balcony || bal) && !ruin) { B.box('wood', C.wood, w * 0.7, 0.12, 1.1, 0, yy + 0.1, dp / 2 + 0.55); B.box('wood', C.oldWood, w * 0.7, 0.9, 0.07, 0, yy + 0.2, dp / 2 + 1.08); }
  }
  const top = 4 + up * 3.1;
  if (ruin) for (let k = 0; k < 5; k++) B.box('brick', wall, 1.5 + r() * 3, 1 + r() * 2.5, 0.6, (r() - 0.5) * w * 0.8, top, (r() < 0.5 ? -1 : 1) * (dp / 2 - 0.3));
  else { const p = 0.3, S = dp / 2 + 0.5, rh = S * Math.tan(p), sl = S / Math.cos(p) + 0.1; for (const e of [1, -1]) { B.geo('tile', o.roofCol || C.tile, BOX, 0, top + rh / 2 - 0.05, (e * S) / 2, 0, e * p, 0, w + 0.8, 0.14, sl, [w + 0.8, sl]); B.geo(fm, fcol, gableGeo(dp, rh, 0.4), e * (w / 2 - 0.2), top, 0); } B.rod('tile', shade(o.roofCol || C.tile, 0.8), [-w / 2 - 0.4, top + rh + 0.05, 0], [w / 2 + 0.4, top + rh + 0.05, 0], 0.13, 5); }
  B.pop(); K.C.rect(x, z, w / 2 + 0.2, dp / 2 + 0.2, ry, ...B.span); return fronts;
}
/** A basilica: a long hall behind `storeys` of arcades on its +z side, a raised nave lit from above. */
function basilica(K, o) {
  const { B, r } = K, { x, z, ry = 0, l, dp, storeys = 2, mat = 'marble', col = C.marble, ruin = 0 } = o, y = K.world.heightAt(x, z), n = Math.round(l / 5.2), bw = l / n, sh = 7.4, stone = ruin ? shade(col, 0.5) : col;
  B.push(x, y, z, ry); B.slab(mat, shade(stone, 0.85), l + 2.4, 3.6, dp + 2.4, 0, -3, 0); B.slab(mat, stone, l + 1.2, 0.5, dp + 1.2, 0, 0.6, 0);
  const st = ruin ? 1 : storeys, H = 1.1 + st * sh;
  for (let s = 0; s < st; s++) for (let i = 0; i < n; i++) {
    if (ruin && r() < 0.3) continue; const bx = -l / 2 + (i + 0.5) * bw, yy = 1.1 + s * sh;
    B.geo(mat, stone, archGeo(bw, sh - 1, 1.3, bw * 0.62, (sh - 1) * 0.5), bx, yy, dp / 2 - 0.65); B.box(mat, stone, bw + 0.05, 1, 1.7, bx, yy + sh - 1, dp / 2 - 0.65);
    archRing(B, stone, bx, yy, dp / 2 - 0.65, 0, 1.3, bw * 0.62, (sh - 1) * 0.5, 0.42, 1); B.box(mat, stone, bw * 0.38 + 0.2, 0.3, 1.52, bx - bw / 2, yy + (sh - 1) * 0.5 - 0.3, dp / 2 - 0.65);   // wedge stones round the arch, an impost under its springing
    column(B, mat, stone, bx - bw / 2, yy, dp / 2 + 0.1, sh - 1, 0.8, s ? 'ionic' : 'tuscan', { lo: 1, ry: -PI / 2 });
  }
  const w0 = ruin ? shade(stone, 0.8) : C.stucco;
  B.box('plaster', w0, l, H - 1.1, 0.8, 0, 1.1, -dp / 2 + 0.4); for (const e of [1, -1]) B.box('plaster', w0, 0.8, H - 1.1, dp, e * (l / 2 - 0.4), 1.1, 0); B.box('plaster', ruin ? C.soot : 0x6a5c4c, l - 2, H - 1.1, 0.5, 0, 1.1, dp / 2 - 5);
  if (!ruin) {
    B.box('tile', C.tile, l + 0.6, 0.2, dp + 0.6, 0, H, 0); const nh = 5, nd = dp * 0.42; B.box('plaster', C.stucco, l - 8, nh, nd, 0, H + 0.2, 0);
    for (let i = 1; i < n - 1; i++) for (const e of [1, -1]) B.quad('window', 0xffffff, 1.9, 2.5, -l / 2 + (i + 0.5) * bw, H + 1.6, e * (nd / 2 + 0.02), e > 0 ? 0 : PI, [0.5, 0.5, 0, 0]);
    const p = 0.34, S = nd / 2 + 0.6, rh = S * Math.tan(p), sl = S / Math.cos(p) + 0.1; for (const e of [1, -1]) { B.geo('tile', C.tile, BOX, 0, H + 0.2 + nh + rh / 2 - 0.05, (e * S) / 2, 0, e * p, 0, l - 7, 0.16, sl, [l - 7, sl]); B.geo('plaster', C.stucco, gableGeo(nd, rh, 0.4), e * (l / 2 - 4.2), H + 0.2 + nh, 0); }
  } else for (let k = 0; k < 10; k++) B.box(mat, C.soot, 1 + r() * 3, 0.4 + r(), 0.6 + r(), (r() - 0.5) * l * 0.9, 1.1, (r() - 0.5) * dp * 0.7, r() * 3);
  B.pop(); K.C.rect(x, z, l / 2 + 1.2, dp / 2 + 1.2, ry, ...B.span);
}
/** A triumphal arch across local x (people pass along z): one opening or three, columns on pedestals, an attic with gilded letters, a chariot on top. */
function arch(K, o) {
  const { B } = K, { x, z, ry = 0, w, h, t, triple = 0, col = C.marble } = o, y = K.world.heightAt(x, z), aw = triple ? w * 0.27 : w * 0.4, sw = triple ? w * 0.13 : 0, attic = h * 0.27, body = h - attic;
  B.push(x, y, z, ry);
  const piece = (cx, pw, opening, spring) => { B.geo('marble', col, archGeo(pw, body, t, opening, spring), cx, 0, 0); archRing(B, col, cx, 0, 0, 0, t, opening, spring, opening * 0.11); };
  if (triple) { piece(0, w * 0.42, aw, body * 0.52); for (const e of [1, -1]) piece(e * w * 0.355, w * 0.29, sw, body * 0.3); } else piece(0, w, aw, body * 0.52);
  B.box('marble', col, w + 0.6, 0.7, t + 0.6, 0, body, 0); B.box('marble', col, w, attic - 0.7, t, 0, body + 0.7, 0); B.box('marble', col, w + 0.5, 0.4, t + 0.5, 0, h - 0.4, 0);
  for (const e of [1, -1]) { B.box('metal', C.bronze, w * 0.6, attic * 0.4, 0.08, 0, body + attic * 0.35, e * (t / 2 + 0.02)); for (const cx of triple ? [-0.44, -0.16, 0.16, 0.44] : [-0.42, -0.24, 0.24, 0.42]) { B.box('marble', col, 1.3, body * 0.24, 1.3, cx * w, 0, e * (t / 2 + 0.5)); column(B, 'marble', o.shaft || col, cx * w, body * 0.24, e * (t / 2 + 0.5), body * 0.76, 0.85, 'corinthian', { ry: PI / 2 }); B.box('marble', col, 1.5, 0.7, 1.6, cx * w, body, e * (t / 2 + 0.4)); } }
  if (!o.bare) { B.box('metal', C.gold, 3.4, 0.9, 1.6, 0, h, 0); for (let k = -1.5; k <= 1.5; k++) B.geo('metal', C.gold, BALL, k * 0.9, h + 1.5, 0.6, 0, 0, 0, 0.3, 0.75, 0.9); statue(K, 0, h + 0.9, -0.5, -PI / 2, 2.6, { base: 0, col: C.gold }); }
  B.pop();
  const c = Math.cos(ry), s = Math.sin(ry), blk = (cx, hw) => K.C.rect(x + c * cx, z - s * cx, hw, t / 2 + 1.2, ry, ...B.span);
  if (triple) { blk(-w * 0.27, w * 0.07); blk(w * 0.27, w * 0.07); blk(-w * 0.47, w * 0.05); blk(w * 0.47, w * 0.05); } else { blk(-w * 0.35, w * 0.16); blk(w * 0.35, w * 0.16); }
}
/** The amphitheatre: `tiers` of its four storeys built. */
function colosseum(K, tiers, done) {
  const { B } = K, { cx, cz, a, b } = COL, N = 80, y = F - 0.3, TH = [10.6, 11.6, 11.4, 13.6], ORD = ['tuscan', 'ionic', 'corinthian'], tr = C.travertine;
  const pt = (i, s = 1) => { const th = (i / N) * 6.2832; return [cx + Math.cos(th) * a * s, cz + Math.sin(th) * b * s]; };
  B.push(0, y, 0, 0);
  let y0 = 0;
  for (let k = 0; k < tiers; k++) {
    const h = TH[k];
    for (let i = 0; i < N; i++) {
      const p = pt(i), q = pt(i + 1), mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, w = Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) * 5) / 5 + 0.1, ry = toward(p[0], p[1], q[0], q[1]);
      if (k < 3) { B.geo('marble', tr, archGeo(w, h - 1.7, 2.6, 4.2, k ? 4.4 : 4.9, k ? 1.1 : 0), mx, y0, mz, ry); B.box('marble', shade(tr, 0.93), w + 0.1, 1.7, 3, mx, y0 + h - 1.7, mz, ry); column(B, 'marble', shade(tr, 1.08), p[0] + (p[0] - cx) * 0.012, y0, p[1] + (p[1] - cz) * 0.012, h - 1.7, 0.95, ORD[k], { lo: 1, ry: ry + PI / 2 }); archRing(B, shade(tr, 0.84), mx, y0, mz, ry + PI, 2.6, 4.2, k ? 4.4 : 4.9, 0.55, 1); B.box('marble', shade(tr, 0.9), 2.75, 0.35, 2.9, p[0], y0 + (k ? 4.4 : 4.9) - 0.35, p[1], ry); }
      else { B.box('marble', tr, w + 0.1, h, 2.2, mx, y0, mz, ry); B.box('marble', shade(tr, 0.9), 0.9, h - 1, 2.6, p[0], y0, p[1], ry); if (i % 2) B.box('wood', C.dark, 1.5, 1.7, 2.3, mx, y0 + 5, mz, ry); else B.geo('metal', C.bronze, BALL, mx + (mx - cx) * 0.012, y0 + 5.6, mz + (mz - cz) * 0.012, ry, 0, 0, 1.1, 1.1, 0.12); B.box('marble', tr, w + 0.3, 0.9, 3, mx, y0 + h - 0.9, mz, ry); for (const f of [0.3, 0.7]) { const X = p[0] + (q[0] - p[0]) * f, Zz = p[1] + (q[1] - p[1]) * f; B.box('marble', tr, 0.5, 0.7, 0.7, X + (X - cx) * 0.016, y0 + h - 3.7, Zz + (Zz - cz) * 0.016, ry); } if (done && i % 2 === 0) B.rod('wood', C.oldWood, [p[0], y0 + h - 3, p[1]], [p[0], y0 + h + 5, p[1]], 0.12, 5); }
      const pi = pt(i, 0.9), qi = pt(i + 1, 0.9); B.slab('marble', shade(tr, 0.45), Math.hypot(qi[0] - pi[0], qi[1] - pi[1]) + 0.2, h, 1.2, (pi[0] + qi[0]) / 2, y0, (pi[1] + qi[1]) / 2, ry);
    }
    y0 += h;
  }
  // the seating, falling to the arena in three sweeps
  const top = Math.min(y0 - 3, 40), prof = [[0.47, 3.6], [0.58, 10], [0.58, 12], [0.72, 23], [0.72, 26], [0.88, 39]].filter(([, h]) => h <= top + 0.1), tris = [];
  if (prof.length) prof.push([0.9, prof[prof.length - 1][1]]);
  for (let i = 0; i < N; i++) for (let k = 0; k < prof.length - 1; k++) { const [s0, h0] = prof[k], [s1, h1] = prof[k + 1], A = pt(i, s0), Bq = pt(i + 1, s0), Cq = pt(i, s1), D = pt(i + 1, s1); tris.push([[A[0], h0, A[1]], [Cq[0], h1, Cq[1]], [Bq[0], h0, Bq[1]]], [[Bq[0], h0, Bq[1]], [Cq[0], h1, Cq[1]], [D[0], h1, D[1]]]); }
  for (let i = 0; i < N; i++) { const A = pt(i, 0.47), Bq = pt(i + 1, 0.47); tris.push([[cx, 0.3, cz], [A[0], 0.3, A[1]], [Bq[0], 0.3, Bq[1]]], [[A[0], 0.3, A[1]], [A[0], 3.6, A[1]], [Bq[0], 0.3, Bq[1]]], [[Bq[0], 0.3, Bq[1]], [A[0], 3.6, A[1]], [Bq[0], 3.6, Bq[1]]]); }
  const g = new THREE.BufferGeometry(), P = [], Nn = [], Cc = [], sand = [0.6, 0.48, 0.3], seat = [0.62, 0.58, 0.5];
  for (const t of tris) { const u = new THREE.Vector3(t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]), v = new THREE.Vector3(t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]), nn = u.cross(v).normalize(); if (nn.y < 0) { nn.negate(); const s = t[1]; t[1] = t[2]; t[2] = s; } for (const q of t) { P.push(...q); Nn.push(nn.x, nn.y, nn.z); Cc.push(...(q[1] < 0.5 ? sand : seat)); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); B.add('ashlar', g);
  B.pop();
  if (!done) {   // scaffolding round the newest storey, cranes on the rim
    for (let i = 0; i < N; i += 2) { const p = pt(i, 1.03), q = pt(i + 1, 1.03); scaffold(K, [q[0], q[1]], [p[0], p[1]], Math.min(y0, 12), y + Math.max(0, y0 - 12), 1.2); }
    for (let i = 5; i < N; i += 10) { const p = pt(i, 0.95); crane(K, p[0], y + y0, p[1], toward(cx, cz, p[0], p[1]), 12, 3.2); }
  }
}

function build({ world, group }) {
  const r = rng(753), B = new Batch(), CB = new Blocks(), K = { B, C: CB, world, r }, H = (x, z) => world.heightAt(x, z), M = species(), A = [];
  const add = (outfit, action, x, z, rot, y0, y1, o) => { const a = { outfit, action, x, z, rot, ...o }; if (y0 !== undefined && y0 > -150) a.u0 = U(y0); if (y1 !== undefined && y1 < 500) a.u1 = U(y1); A.push(a); return a; };
  const walkers = (outfits, action, path, n, y0, y1, o = {}) => { for (let i = 0; i < n; i++) add(outfits[i % outfits.length], action, path[0][0], path[0][1], 0, y0, y1, { path, phase: (i + r() * 0.5) / n, ...o }); };
  const circle = (outfits, cx, cz, n, rad, y0, y1, o = {}) => { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + r() * 0.4, x = cx + Math.cos(a) * rad * (0.85 + r() * 0.3), z = cz + Math.sin(a) * rad; add(outfits[i % outfits.length], i % 3 === 0 ? 'point' : i % 3 === 1 ? 'talk' : 'stand', x, z, toward(x, z, cx, cz), y0, y1, o); } };
  const fade = () => (r() < 0.3 ? 410 : r() < 0.5 ? 455 : undefined);   // when someone is gone from the shrinking city
  const crew = (x, z, y0, y1, n, R = 7) => { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, px = x + Math.cos(a) * R * (0.5 + r() * 0.6), pz = z + Math.sin(a) * R * (0.5 + r() * 0.6); add('roman', ['chisel', 'hammer', 'saw', 'chisel', 'hammer'][i % 5], px, pz, r() * 6.28, y0, y1); } };

  // ------------------------------------------------------------------ ground: paving, roads, the river banks
  const MARCH = [[660, -3], [470, -3], [434, -6], [404, -50], [300, -56], [219, -56], [205, -4], [126, 8], [100, 8], [30, 14], [0, 18], [-20, 22], [-96, 22], [-96, -22], [-10, -22], [100, -4], [124, -4], [198, -12], [213, -62], [300, -62], [406, -56], [438, -11], [470, -11], [660, -11], [660, -3]];
  const VICUS = [[-138, 24], [-138, 60], [-200, 122], [-238, 140]], ARGI = [[-94.5, -24], [-94.5, -200]], APPIA = [[205, -8], [213, -59], [404, -53], [436, -7], [960, -7]];
  B.when(-150, -80); drape(B, world, 'earth', -176, -40, -1, 36, 10, () => [0.04, 0x8a7a60]);
  B.when(-80, 455); drape(B, world, 'slab', -176, -40, -1, 36, 10, () => [0.04, shade(C.travertine, 0.8)]);
  B.when(455, Infinity); drape(B, world, 'slab', -176, -40, -1, 36, 5, (x, z) => [0.04, hash(Math.floor(x / 5), Math.floor(z / 5)) < 0.3 ? 0x6a6a48 : shade(C.travertine, 0.7 + 0.25 * hash(Math.floor(x / 5) + 9, Math.floor(z / 5)))]);
  B.when(); road(B, world, 'flag', [[-170, -22], [-10, -22]], 7, C.basalt, 0.05, 1); road(B, world, 'flag', [[-10, -20], [100, -3], [205, -8]], 13, C.basalt, 0.05, 1); road(B, world, 'flag', APPIA, 8, C.basalt, 0.05, 1); road(B, world, 'flag', VICUS, 5, C.basalt, 0.05, 1); road(B, world, 'flag', ARGI, 8, C.basalt, 0.05, 1); road(B, world, 'flag', [[-96, 22], [-20, 22], [30, 14], [126, 8]], 6, C.basalt, 0.05, 1);
  B.when(80, Infinity); drape(B, world, 'slab', 180, -70, 420, 130, 10, (x, z) => { const q = Math.hypot((x - COL.cx) / (COL.a + 26), (z - COL.cz) / (COL.b + 26)); return q < 1 ? [0.04, shade(C.travertine, 0.9)] : null; });
  for (let x = 520; x <= 940; x += 70) { B.cyl('marble', C.travertine, 0.26, 0.3, 1.9, x, H(x, -15), -15, 10); B.box('marble', C.travertine, 0.8, 0.5, 0.8, x, H(x, -15) - 0.1, -15); CB.circle(x, -15, 0.5); }   // milestones

  // ------------------------------------------------------------------ the Capitoline
  const jup = { x: -250, z: -20, ry: 0, w: 38, l: 44, nf: 6, colH: 13, d: 1.7, porch: 3, podium: 4, steps: 0, peripteral: false };
  B.when(-150, 82); temple(K, { ...jup, order: 'tuscan', mat: 'ashlar', col: C.stucco, roofCol: C.tileOld, paint: 'plain', sculpture: 1 });
  B.when(82, 455); temple(K, { ...jup, order: 'corinthian', col: C.marble, roofCol: C.gold, paint: 'roman', capCol: C.gold });
  B.when(455, Infinity); temple(K, { ...jup, order: 'corinthian', col: shade(C.marble, 0.85), roofCol: 0x5a4c3e, paint: 'plain' });
  B.when(-150, -78); B.box('ashlar', C.tufa, 9, 16, 74, -181, F - 2, 0);
  B.when(-78, Infinity); B.push(-180, F, 0, 0); B.box('ashlar', C.tufa, 11, 15, 74, 0, -3, 0);   // the Tabularium: the state archive, an arcade over a wall of tufa
  for (let i = 0; i < 11; i++) { B.geo('ashlar', C.poros, archGeo(6.6, 7.6, 1.4, 3.8, 3.8), 5, 12, -33 + i * 6.6, PI / 2); archRing(B, C.poros, 5, 12, -33 + i * 6.6, PI / 2, 1.4, 3.8, 3.8, 0.45, 1); column(B, 'ashlar', C.travertine, 5.8, 12, -36.3 + i * 6.6, 6.6, 0.8, 'tuscan', { lo: 1 }); }
  B.box('ashlar', C.travertine, 1.8, 1, 74, 5, 19.6, 0); B.box('plaster', 0x5a4c3c, 1, 7.6, 72, 1.5, 12, 0); B.box('tile', C.tile, 12, 0.3, 75, 0, 20.6, 0); B.pop();
  CB.rect(-180, 0, 6, 37.5);
  B.when(-150, Infinity); for (const [x, z, ry] of [[-285, 40, 0.3], [-236, 34, 1.2], [-300, -46, 0]]) temple(K, { x, z, ry, w: 11, l: 17, nf: 4, colH: 6.5, d: 0.85, order: 'ionic', porch: 1, podium: 2.2, steps: 0, mat: 'ashlar', col: C.stucco, paint: 'plain' });

  // ------------------------------------------------------------------ the Forum
  const side = (o) => ({ podium: 4.5, steps: 0, peripteral: false, porch: 2, ...o });
  const saturn = side({ x: -150, z: 32, ry: PI / 2, w: 18, l: 26, nf: 6, colH: 10.5, d: 1.25 });
  B.when(-150, -42); temple(K, { ...saturn, order: 'tuscan', mat: 'ashlar', col: C.stucco, roofCol: C.tileOld, paint: 'plain' });
  B.when(-42, Infinity); temple(K, { ...saturn, order: 'ionic', col: C.marble, paint: 'roman' });
  const castor = side({ x: -12, z: 50, ry: PI / 2, w: 22, l: 32, nf: 8, colH: 12, d: 1.3, podium: 6 });
  B.when(-150, 6); temple(K, { ...castor, nf: 6, order: 'ionic', mat: 'ashlar', col: C.stucco, roofCol: C.tileOld, paint: 'plain' });
  B.when(6, Infinity); temple(K, { ...castor, order: 'corinthian', col: C.marble, paint: 'roman', sculpture: 1 });
  B.when(-121, Infinity); temple(K, side({ x: -159, z: -36, ry: 0, w: 22, l: 15, nf: 6, colH: 9.5, d: 1.1, porch: 1, order: 'corinthian', col: C.marble, paint: 'roman', podium: 3.5 }));   // Concord
  B.when(-29, Infinity); temple(K, side({ x: -8, z: 0, ry: PI, w: 17, l: 19, nf: 6, colH: 9.5, d: 1.05, order: 'corinthian', col: C.marble, paint: 'roman', podium: 5, stairW: 0.3 }));   // the deified Julius
  B.when(141, Infinity); temple(K, side({ x: 22, z: -52, ry: -PI / 2, w: 20, l: 28, nf: 6, colH: 13, d: 1.4, order: 'corinthian', col: C.marble, capCol: C.marble, paint: 'roman', podium: 5 }));   // Antoninus and Faustina
  B.when(); insula(K, { x: 49, z: 47, ry: PI, w: 44, dp: 22, floors: 2, col: C.stucco }); insula(K, { x: 128, z: 42, ry: PI, w: 40, dp: 20, floors: 3, col: C.brick, shops: 1 });   // the house of the Vestals; warehouses
  // Vesta: a round shrine where the fire never goes out
  B.when(); B.push(12, F, 32, 0); B.cyl('marble', C.marble, 7.6, 7.8, 2.2, 0, -0.4, 0, 28); for (let i = 0; i < 20; i++) column(B, 'marble', C.marble, Math.cos(i * 0.314) * 6.7, 1.8, Math.sin(i * 0.314) * 6.7, 6.2, 0.7, 'corinthian', { lo: i % 2 });
  B.cyl('marble', C.stucco, 4.9, 4.9, 6.2, 0, 1.8, 0, 24); B.cyl('marble', C.marble, 7.5, 7.5, 0.9, 0, 8, 0, 28); B.cyl('tile', C.tile, 1.2, 7.8, 3, 0, 8.9, 0, 28); B.box('wood', C.bronze, 0.2, 3.6, 1.6, 4.86, 1.8, 0); B.pop(); CB.circle(12, 32, 8);
  // the speakers' platform, its front hung with the beaks of captured ships
  B.push(-124, F, 0, 0); B.box('ashlar', C.tufa, 10, 3, 24, 0, 0, 0); B.box('marble', C.marble, 10.4, 0.3, 24.4, 0, 3, 0); for (let k = -4; k <= 4; k++) { B.geo('metal', C.bronze, BOX, 5.1, 1.7, k * 2.5, 0, 0, -PI / 2, 0.36, 1.3, 0.36); B.box('marble', C.marble, 0.14, 1, 0.14, 5, 3.3, k * 2.5 + 1.25); }
  B.box('marble', C.marble, 0.12, 0.12, 24, 5, 4.3, 0); for (const e of [1, -1]) { column(B, 'marble', C.marble, -3.5, 3.3, e * 9, 7, 0.8, 'corinthian', { lo: 1 }); statue(K, -3.5, 10.3, e * 9, 0, 2.2, { base: 0 }); } B.pop(); CB.rect(-124, 0, 5.2, 12.2);
  B.when(-20, Infinity); B.cyl('metal', C.gold, 0.5, 0.56, 3.4, -131, F + 0.3, 15, 14); B.box('marble', C.marble, 1.6, 0.5, 1.6, -131, F, 15); CB.circle(-131, 15, 1);   // the golden milestone
  // the Senate house
  for (const [y0, y1, w, dpt, h, col] of [[-150, -52, 14, 20, 12, C.tufa], [-29, Infinity, 18, 26, 20, C.brick]]) {
    B.when(y0, y1); B.push(-110, F, -48, 0); B.box('ashlar', C.travertine, w + 1, 1.6, dpt + 1, 0, -0.6, 0); B.box(col === C.brick ? 'brick' : 'ashlar', col, w, h, dpt, 0, 1, 0);
    for (let k = 0; k < 8; k++) B.box('ashlar', C.travertine, 3.2 + k * 0.5, 0.2, 3, 0, 0.8 - k * 0.2 + 0.2, dpt / 2 + 1 + k * 0.15);
    B.box('wood', C.bronze, 3.4, 6, 0.2, 0, 1, dpt / 2 + 0.05); B.box('marble', C.marble, 4.4, 0.6, 0.5, 0, 7, dpt / 2 + 0.1); for (const k of [-1, 0, 1]) B.box('wood', C.dark, 1.8, 3, 0.1, k * (w * 0.3), 1 + h * 0.62, dpt / 2 + 0.03);
    const p = 0.38, S = w / 2 + 0.6, rh = S * Math.tan(p), sl = S / Math.cos(p) + 0.1; for (const e of [1, -1]) { B.geo('tile', C.tile, BOX, (e * S) / 2, 1 + h + rh / 2, 0, PI / 2, e * p, 0, dpt + 1, 0.16, sl, [dpt + 1, sl]); B.geo(col === C.brick ? 'brick' : 'ashlar', col, gableGeo(w, rh, 0.5), 0, 1 + h, e * (dpt / 2 - 0.25), PI / 2); }
    B.pop(); CB.rect(-110, -48, w / 2 + 0.5, dpt / 2 + 2, 0, y0, y1);
  }
  B.when(-150, -34); basilica(K, { x: -45, z: -53, l: 84, dp: 24, storeys: 1, mat: 'ashlar', col: C.stucco });
  B.when(-34, 410); basilica(K, { x: -45, z: -53, l: 86, dp: 26 });
  B.when(410, Infinity); basilica(K, { x: -45, z: -53, l: 86, dp: 26, ruin: 1 });
  B.when(-150, -54); basilica(K, { x: -85, z: 52, ry: PI, l: 80, dp: 24, storeys: 1, mat: 'ashlar', col: C.stucco });
  B.when(-46, Infinity); basilica(K, { x: -85, z: 53, ry: PI, l: 96, dp: 34 });
  B.when(-54, -46); B.box('marble', C.marble, 98, 1.6, 36, -85, F - 0.5, 53); scaffold(K, [-133, 35], [-37, 35], 8, F + 1.1); CB.rect(-85, 53, 49, 18, 0, -54, -46);
  for (let i = 0; i < 6; i++) { B.when(i < 3 ? -40 : 60, 455); statue(K, -80 + i * 13, F, i % 2 ? -28.8 : 27.2, i % 2 ? -PI / 2 : PI / 2, 2.3, { base: 2.6, col: i % 3 ? C.bronze : C.gold }); }
  B.when(203, Infinity); arch(K, { x: -146, z: -22, ry: PI / 2, w: 23, h: 21, t: 11, triple: 1 });      // Septimius Severus
  B.when(81, Infinity); arch(K, { x: 112, z: -4, ry: PI / 2, w: 13.5, h: 15.4, t: 4.8 });               // Titus
  B.when(315, Infinity); arch(K, { x: 196, z: 84, ry: 0.5, w: 25.7, h: 21, t: 7.4, triple: 1, shaft: C.ochre });   // Constantine
  // Venus and Roma, the largest temple in the city
  B.when(121, 135); B.box('ashlar', C.travertine, 66, 3, 40, 150, F - 1, -58); scaffold(K, [118, -77], [182, -77], 8, F + 2); for (let k = 0; k < 8; k++) column(B, 'marble', C.marble, 122 + k * 8, F + 2, -74, 13, 1.5, 'corinthian', { frac: 0.3 + r() * 0.5 }); CB.rect(150, -58, 33, 20, 0, 121, 135);
  B.when(135, Infinity); B.box('ashlar', C.travertine, 66, 2.4, 40, 150, F - 0.6, -58); temple(K, { x: 150, z: -58, w: 27, l: 54, nf: 8, ns: 16, colH: 13, d: 1.45, order: 'corinthian', col: C.marble, roofCol: C.gold, paint: 'roman', steps: 3, y: F + 1.8 });
  // the Basilica of Maxentius: three vaults, each as high as a ten-storey house
  const yard = [64, -70];
  B.when(306, 312); B.box('brick', C.brick, 80, 9, 3, 75, F, -93); scaffold(K, [115, -91], [35, -91], 12, F); crane(K, 60, F, -75, 0.4, 13, 3);
  B.when(312, Infinity); B.push(75, F, -68, 0); for (let k = -1; k <= 1; k++) B.geo('brick', C.brick, archGeo(26.6, 26, 17, 21, 14), k * 26.6, 0, -16.5); B.box('brick', C.brick, 80, 26, 2, 0, 0, -25.5); B.box('brick', tone(C.brick, r), 80, 36, 22, 0, 0, 3);
  for (let k = -1; k <= 1; k++) B.geo('brick', shade(C.brick, 0.6), archGeo(22, 9, 0.4, 16, 0.5, 0.4), k * 26.6, 25.5, 14.1); B.box('tile', C.tile, 82, 0.4, 24, 0, 36, 3); B.box('tile', C.tile, 81, 0.4, 18, 0, 26, -17); B.box('marble', C.marble, 80, 1.2, 4, 0, -0.4, 16); B.pop(); CB.rect(75, -68, 40.5, 26, 0, 312);
  B.when(-150, 306);   // before it: a builders' yard that is never empty
  B.box('brick', C.brick, 22, 4.5, 0.9, yard[0], F - 0.5, yard[1] - 12); B.box('brick', C.brick, 0.9, 6.5, 14, yard[0] - 11, F - 0.5, yard[1] - 5); scaffold(K, [yard[0] + 11, yard[1] - 11.3], [yard[0] - 11, yard[1] - 11.3], 6.3, F); crane(K, yard[0] + 6, F, yard[1] - 5, 2.2, 9, 2.6);
  for (let i = 0; i < 10; i++) B.box(i % 3 ? 'marble' : 'ashlar', i % 3 ? C.marble : C.tufa, 1.2 + r(), 0.6 + r() * 0.4, 0.8 + r() * 0.4, yard[0] - 8 + (i % 5) * 4.4, F, yard[1] + 3 + Math.floor(i / 5) * 3.2, r());
  for (let i = 0; i < 6; i++) B.rod('wood', C.wood, [yard[0] + 12, F + 0.15 + (i % 3) * 0.3, yard[1] - 2 + (i % 2) * 0.4], [yard[0] + 19, F + 0.15 + (i % 3) * 0.3, yard[1] - 2 + (i % 2) * 0.4], 0.15, 6);
  CB.rect(yard[0], yard[1] - 12, 11.5, 1.6, 0, -150, 306);
  crew(yard[0], yard[1] + 1, undefined, 306, 9, 8); walkers(['roman'], 'carry', [[yard[0] + 16, yard[1] + 6], [yard[0] - 2, yard[1] - 8]], 3, undefined, 306, { prop: 'sack' }); add('toga', 'point', yard[0] + 14, yard[1] + 10, 2.4, undefined, 306); add('roman', 'write', yard[0] + 15.5, yard[1] + 11, 2.6, undefined, 306);
  for (let i = 0; i < 4; i++) add('roman', 'haul', 0, 0, 0, undefined, 306, { path: [[yard[0] + 30, yard[1] + 14 + (i % 2)], [yard[0] + 12, yard[1] + 12 + (i % 2)]], phase: 0.1 + Math.floor(i / 2) * 0.03, speed: 0.6 });

  // ------------------------------------------------------------------ the Colosseum, the Colossus beside it
  for (const [y0, y1, tiers] of [[72, 75, 1], [75, 78, 2], [78, 80, 3], [80, Infinity, 4]]) { B.when(y0, y1); colosseum(K, tiers, tiers === 4); }
  for (const dx of [-16, 0, 16]) CB.circle(COL.cx + dx, COL.cz, 79.5, 72);
  B.when(72, 80); for (let i = 0; i < 24; i++) B.box('marble', C.travertine, 1.4 + r(), 0.8, 1 + r() * 0.5, 176 + r() * 24, F, -22 + r() * 60, r() * 3);
  crew(188, 6, 72, 80, 12, 14); walkers(['roman'], 'carry', [[176, -20], [196, 30], [200, 60]], 4, 72, 80); for (let i = 0; i < 6; i++) add('roman', 'haul', 0, 0, 0, 72, 80, { path: [[150, 6 + (i % 2) * 1.1], [196, 12 + (i % 2) * 1.1]], phase: 0.2 + Math.floor(i / 2) * 0.013, speed: 0.6 });
  add('toga', 'point', 172, 30, 0.2, 72, 80); add('toga', 'talk', 173.5, 31.4, 3.4, 72, 80);
  B.when(128, 410); statue(K, 228, H(228, -85), -85, PI, 24, { base: 6, col: C.gold });                             // the Colossus of the Sun
  B.when(89, 455); B.cyl('brick', C.brick, 0.8, 2.6, 13, 190, F, 62, 16); B.cyl('marble', C.marble, 7.5, 7.5, 0.9, 190, F - 0.2, 62, 28); CB.circle(190, 62, 7.6, 89, 455);   // the Meta Sudans, a fountain like a turning-post

  // ------------------------------------------------------------------ the Palatine
  B.when(-150, 92); for (let i = 0; i < 9; i++) { const x = -130 + (i % 5) * 34 + r() * 8, z = 150 + Math.floor(i / 5) * 40 + r() * 8; if (palD(x, z) < 70) insula(K, { x, z, ry: r() * 3, w: 16, dp: 12, floors: 2, col: C.stucco }); }
  B.when(92, Infinity); B.push(-60, 0, 175, 0);
  for (let k = 0; k < 14; k++) { B.geo('brick', C.brick, archGeo(11, 13, 4, 7.5, 7), -71.5 + k * 11, 22.5, -76); B.geo('brick', tone(C.brick, r, 0.05), archGeo(11, 11, 4, 7, 5.5), -71.5 + k * 11, 12, -80); }
  B.box('brick', C.brick, 156, 36.5, 6, 0, 0, -72); B.box('marble', C.marble, 150, 12, 70, 0, 35.5, -28); B.box('tile', C.tile, 152, 0.5, 72, 0, 47.5, -28); for (let k = 0; k < 18; k++) column(B, 'marble', C.marble, -68 + k * 8, 35.6, -64.5, 10, 1.1, 'corinthian', { lo: 1 });
  B.box('marble', C.marble, 150, 1.6, 4, 0, 45.6, -64); B.box('brick', C.brick, 60, 16, 50, 30, 35.5, 36); B.box('tile', C.tile, 62, 0.5, 52, 30, 51.5, 36); B.pop(); CB.rect(-60, 147, 78, 37, 0, 92); CB.rect(-30, 211, 30, 25, 0, 92);

  // ------------------------------------------------------------------ the aqueduct
  const AQ = 150, aq = (x0, x1, y0, y1) => { B.when(y0, y1); for (let x = x0; x < x1; x += 7) { B.geo('ashlar', C.tufa, archGeo(7, 9, 2.8, 5, 4.4), x + 3.5, F + 9.5, AQ); B.slab('ashlar', tone(C.tufa, r, 0.05), 2, 13.5, 2.8, x, Math.min(H(x, AQ), F) - 4, AQ); archRing(B, shade(C.tufa, 1.22), x + 3.5, F + 9.5, AQ, 0, 2.8, 5, 4.4, 0.6); B.box('ashlar', shade(C.tufa, 1.12), 2.3, 0.4, 3.2, x, F + 13.5, AQ); } B.box('ashlar', C.tufa, x1 - x0 + 2, 0.4, 3.2, (x0 + x1) / 2, F + 18.5, AQ); B.box('ashlar', C.poros, x1 - x0, 2.2, 2.2, (x0 + x1) / 2, F + 18.9, AQ); };
  aq(500, 962, -150, Infinity); aq(143, 500, -140, Infinity);
  B.when(-150, -140); for (let x = 437; x < 500; x += 7) B.box('ashlar', C.tufa, 2, 4 + (x - 437) * 0.2, 2.8, x, F - 4, AQ); scaffold(K, [500, AQ - 1.6], [437, AQ - 1.6], 16, F); scaffold(K, [437, AQ + 1.6], [500, AQ + 1.6], 16, F); crane(K, 470, F, AQ - 9, PI / 2, 15, 3);
  crew(476, AQ - 14, -150, -140, 7, 6); walkers(['roman'], 'carry', [[500, AQ - 20], [450, AQ - 6]], 3, -150, -140);
  B.when(-140, Infinity); B.box('brick', C.brick, 12, 22, 10, 138, F - 1, AQ); B.box('tile', C.tile, 13, 0.4, 11, 138, F + 21, AQ); CB.rect(138, AQ, 6.2, 5.2, 0, -140);
  for (let x = 157; x < 962; x += 7) CB.circle(x, AQ, 1.5);
  // Aurelian's wall and the gate with two arches
  for (const [y0, y1, h] of [[271, 402, 8], [402, Infinity, 15]]) {
    B.when(y0, y1); for (let z = -414; z < 400; z += 30) { if (z === -24) continue; B.box('brick', tone(C.brick, r, 0.05), 3.6, h + 3, 30, 470, F - 3, z + 15); for (let k = 0; k < 10; k++) B.box('brick', C.brick, 0.6, 0.9, 1.5, 471.5, F + h, z + 1.5 + k * 3); B.box('brick', C.brick, 8, h + 8, 7.4, 472, F - 3, z); B.box('tile', C.tile, 8.6, 0.3, 8, 472, F + h + 5, z); }
    B.push(470, F, -7, PI / 2); for (const e of [1, -1]) B.geo('marble', C.travertine, archGeo(8, 9.5, 4.4, 4.8, 4.6), e * 4, 0, 0); B.box('brick', C.brick, 16, h - 4, 4.2, 0, 9.5, 0); for (const e of [1, -1]) { B.cyl('brick', C.brick, 4.6, 4.6, h + 9, e * 12.4, -1, -1.5, 16); B.cyl('tile', C.tile, 0.3, 5, 2.4, e * 12.4, h + 8, -1.5, 16); } B.pop();
  }
  for (let z = -414; z < 400; z += 30) if (z !== -24) CB.rect(470, z + 15, 2.2, 15.5, 0, 271);
  CB.rect(470, -7, 2.6, 1.2, 0, 271); CB.circle(471.5, -19.4, 4.8, 271); CB.circle(471.5, 5.4, 4.8, 271);
  B.when(271, 275); scaffold(K, [468, 30], [468, 120], 8, F); crew(458, 60, 271, 275, 7, 6); walkers(['roman'], 'carry', [[452, 36], [462, 80]], 3, 271, 275);

  // ------------------------------------------------------------------ the city: blocks of flats, the street of shops, the bakery
  const keep = [[-48, -116, -18, -93], [214, -102, 242, -68], [-250, 90, -170, 170], [-125, -300, -64, -62], [118, -80, 184, -34], [28, -96, 120, -40], [9, -70, 34, -28]], open = (x, z, hw, hd) => { for (const k of keep) if (x + hw > k[0] && x - hw < k[2] && z + hd > k[1] && z - hd < k[3]) return false; for (let i = 0; i < MARCH.length - 1; i++) { const ax = MARCH[i][0], az = MARCH[i][1], bx = MARCH[i + 1][0] - ax, bz = MARCH[i + 1][1] - az, t = clamp(((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz), 0, 1); if (Math.hypot(x - ax - bx * t, z - az - bz * t) < Math.hypot(hw, hd) + 6) return false; } return true; };
  const blocks = { a: [], b: [], c: [], d: [] };
  const lot = (x, z, w, dp, ry) => {
    if (!open(x, z, w / 2, dp / 2) || CB.inside(x, z, 200, 16) || CB.inside(x, z, -100, 16) || capD(x, z) < 108 || palD(x, z) < 132 || river(x, z) < 80 || Math.hypot((x - COL.cx) / (COL.a + 34), (z - COL.cz) / (COL.b + 34)) < 1 || r() < 0.12) return;
    const col = tone(r() < 0.75 ? C.brick : C.ochre, r, 0.1), end = r() < 0.28 ? 'b' : r() < 0.45 ? 'c' : 'd', floors = 3 + Math.floor(r() * 3.4), o = { x, z, ry, w, dp, col, balcony: r() < 0.5, roofCol: tone(C.tile, r, 0.12) };
    blocks.a.push({ ...o, floors: 2 + Math.floor(r() * 1.6), col: tone(r() < 0.5 ? C.stucco : C.ochre, r, 0.12), roofCol: tone(C.tileOld, r, 0.1) }); blocks[end].push({ ...o, floors });
  };
  for (let x = -230; x <= 440; x += 33) for (const z of [-118, -152, -186, -220, -254, -288]) lot(x + (r() - 0.5) * 3, z, 23 + r() * 3, 20, r() < 0.5 ? 0 : PI);
  for (let x = 200; x <= 440; x += 33) lot(x, -88, 24, 18, 0);
  for (let x = 110; x <= 440; x += 33) for (const z of [186, 220, 254, 288]) lot(x + (r() - 0.5) * 3, z, 23 + r() * 3, 20, r() < 0.5 ? 0 : PI);
  for (let x = 366; x <= 440; x += 33) for (const z of [-20, 14, 48, 82, 116]) lot(x, z, 24, 20, PI / 2);
  for (let t = 150; t <= 700; t += 36) for (const d of [-96, -130, -164]) { const [x, z] = bank(t, d); blocks.a.push({ x, z, ry: Math.atan2(TU[0], TU[1]) + PI / 2, w: 22, dp: 18, floors: 2, col: tone(C.ochre, r, 0.1), roofCol: C.tileOld, yr: 1 }); }
  for (const [list, y0, y1, ruin] of [[blocks.a, -150, 64], [blocks.b, 64, 410], [blocks.c, 64, 455], [blocks.d, 64, Infinity], [blocks.b, 410, Infinity, 1], [blocks.c, 455, Infinity, 1]]) { B.when(y0, y1); for (const o of list) insula(K, { ...o, ruin }); }
  B.when(64, Infinity); for (const o of blocks.a) if (o.yr) insula(K, { ...o, floors: 3, col: C.brick });
  // the Argiletum: shops on both sides, a street fountain, the bakers' yard behind
  const fronts = [];
  for (const [y0, y1, fl, col] of [[-150, 64, 3, C.ochre], [64, Infinity, 5, C.brick]]) { B.when(y0, y1); for (const zc of [-84, -114, -144, -174]) for (const e of [1, -1]) { const f = insula(K, { x: -94.5 - e * 17.5, z: zc, ry: e * PI / 2, w: 26, dp: 16, floors: fl + (zc === -114 ? 1 : 0), col: tone(col, r, 0.06), shops: 1, balcony: 1 }); if (y0 < 0) fronts.push(...f.map((p) => [p[0], p[1], e])); } }
  fronts.forEach(([x, z, e], i) => {
    if (i % 2) return; const end = fade();
    add(i % 3 ? 'roman' : 'roman-f', 'trade', x - e * 0.9, z - 0.6, e > 0 ? 0 : PI, undefined, end, { ok: 1 });
    if (i % 4 === 0) add(['roman-f', 'toga', 'roman'][(i / 4) % 3], i % 8 ? 'talk' : 'stand', x + e * 1.7, z - 0.3 + r() * 0.8, e > 0 ? PI : 0, undefined, end);
  });
  B.when(); B.push(-94.5, H(-94.5, -129), -129, 0); B.box('marble', C.travertine, 3.2, 0.9, 1.7, 0, 0, 0); B.box('plaster', 0x3a6a7a, 2.8, 0.06, 1.3, 0, 0.88, 0); B.box('marble', C.travertine, 0.6, 1.9, 0.5, 0, 0, -0.85); B.geo('metal', C.bronze, BALL, 0, 1.5, -0.6, 0, 0, 0, 0.14, 0.14, 0.14); B.pop(); CB.rect(-94.5, -129, 1.7, 1);
  add('roman-f', 'fetch-water', -93.6, -127.2, -PI / 2 - 0.3); add('roman-f', 'fetch-water', -95.8, -127.3, -PI / 2 + 0.2); add('roman', 'fetch-water', -92.2, -129.2, PI, undefined, 455); add('roman-f', 'talk', -97.4, -127, 0.5, undefined, 410); add('roman-f', 'stand', -98.3, -128.3, 0.2);
  walkers(['roman-f'], 'carry', [[-97.4, -126.4], [-99, -160], [-99, -196]], 2, undefined, undefined, { prop: 'jar' }); walkers(['roman-f', 'roman-f', 'roman'], 'carry', [[-92.4, -126.2], [-90, -100], [-92, -66], [-96, -30], [-70, -26]], 3, undefined, 455, { prop: 'jar' });
  walkers(['roman'], 'fetch-water', [[-92, -130.6], [-90, -150], [-90, -196]], 2, undefined, 410);
  // the bakery: hourglass mills of lava turned by hand, querns, an oven
  const BK = [-34, -104]; B.when(); B.push(BK[0], H(BK[0], BK[1]), BK[1], 0);
  for (const mx of [-7, 0]) { B.cyl('ashlar', C.basalt, 0.35, 0.9, 1, mx, 0, 0, 14); B.cyl('ashlar', shade(C.basalt, 1.2), 0.62, 0.3, 0.75, mx, 0.95, 0, 14); B.cyl('ashlar', shade(C.basalt, 1.2), 0.3, 0.62, 0.75, mx, 0.2, 0, 14); B.rod('wood', C.wood, [mx - 1.75, 1.25, 0], [mx + 1.75, 1.25, 0], 0.05, 5); }
  B.geo('brick', C.brick, BALL, 8, 0.9, -5, 0, 0, 0, 2, 1.5, 2); B.box('brick', C.brick, 4.4, 1, 4.4, 8, 0, -5); B.box('plaster', C.dark, 0.9, 0.6, 0.3, 8, 1, -2.95); B.cyl('brick', C.brick, 0.25, 0.3, 1.6, 8, 2.2, -5.8, 8);
  B.box('wood', C.wood, 3, 0.08, 1, 3, 0.85, -6); for (const e of [1, -1]) B.box('wood', C.oldWood, 0.1, 0.85, 0.9, 3 + e * 1.3, 0, -6); for (let k = 0; k < 6; k++) B.geo('plaster', 0xb88a4a, BALL, 2 + k * 0.4, 0.98, -6, 0, 0, 0, 0.17, 0.08, 0.17);
  B.pop(); CB.circle(BK[0] - 7, BK[1], 1); CB.circle(BK[0], BK[1], 1); CB.rect(BK[0] + 8, BK[1] - 5, 2.3, 2.3);
  const ring = (cx, cz, R, n = 12) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * 6.2832) * R, cz + Math.sin((i / n) * 6.2832) * R]);
  for (const mx of [-7, 0]) for (const ph of [0, 0.5]) add('roman', 'push', 0, 0, 0, undefined, undefined, { path: ring(BK[0] + mx, BK[1], 1.85), phase: ph, speed: 0.7 });
  add('roman-f', 'grind', BK[0] - 4, BK[1] + 5, -1.2); add('roman-f', 'grind', BK[0] - 1, BK[1] + 5.6, -1.9); add('roman', 'cook', BK[0] + 7.4, BK[1] - 2, PI / 2 + 0.1, undefined, undefined, { prop: 'none' }); add('roman', 'stand', BK[0] + 3, BK[1] - 4.8, PI / 2); add('roman-f', 'cook', BK[0] + 12, BK[1] + 3, 2.6);
  walkers(['roman', 'roman-f'], 'carry', [[BK[0] + 3, BK[1] - 4], [BK[0] - 12, BK[1] + 9], [-66, -68.6], [-88, -68.6], [-90, -80]], 2);
  keep.push([BK[0] - 12, BK[1] - 10, BK[0] + 14, BK[1] + 9]);
  B.when(113, Infinity); B.push(-94.5, H(-94.5, -215), -215, 0); B.box('marble', C.marble, 5.6, 5, 5.6, 0, 0, 0); B.cyl('marble', C.marble, 1.6, 1.85, 27, 0, 5, 0, 20); for (let k = 0; k < 22; k++) B.cyl('marble', shade(C.marble, 0.82), 1.9 - k * 0.011, 1.9 - k * 0.011, 0.14, 0, 5.6 + k * 1.2, 0, 20); B.box('marble', C.marble, 4.4, 0.9, 4.4, 0, 32, 0); statue(K, 0, 32.9, 0, PI / 2, 3.6, { base: 0, col: C.gold }); B.pop(); CB.rect(-94.5, -215, 3, 3, 0, 113);   // Trajan's column

  // ------------------------------------------------------------------ the Tiber: the stone bridge, the wharf, the round temple
  const bry = Math.atan2(TU[0], TU[1]),   // the deck runs across the stream, bank to bank
  [bx, bz] = bank(520, 0), deck = F - 2.5;
  B.when(-150, -142); B.push(bx, 0, bz, bry); for (let k = -2; k <= 2; k++) B.box('ashlar', C.tufa, 6, deck + 6, 9, k * 22, -7, 0); B.box('wood', C.oldWood, 124, 0.5, 7, 0, deck - 0.5, 0); for (const e of [1, -1]) B.box('wood', C.wood, 124, 1, 0.2, 0, deck, e * 3.4); B.pop();
  B.when(-142, Infinity); B.push(bx, 0, bz, bry); for (let k = -2.5; k <= 2.5; k++) { B.geo('ashlar', C.tufa, archGeo(22, deck + 1, 8.5, 16, 0.4), k * 22, -1, 0); archRing(B, C.travertine, k * 22, -1, 0, 0, 8.5, 16, 0.4, 1.2); } for (let k = -3; k <= 3; k++) B.box('ashlar', C.travertine, 6.4, deck + 6, 10, k * 22, -7, 0); B.box('ashlar', C.travertine, 134, 0.5, 9.5, 0, deck, 0); for (const e of [1, -1]) B.box('ashlar', C.travertine, 134, 1.1, 0.5, 0, deck + 0.5, e * 4.5); B.pop();
  B.when(); const wharf = bank(455, 60), wa = Math.atan2(-TU[1], TU[0]);
  B.push(wharf[0], 0, wharf[1], wa); B.box('ashlar', C.tufa, 80, 9.6, 5, 0, -8, 0); for (let k = -3; k <= 3; k++) B.box('ashlar', C.travertine, 0.8, 0.9, 0.8, k * 11, 1.6, 1.5);
  for (const k of [-18, 16]) { B.push(k, -0.75, 6.2, 0); B.add('wood', hullGeo(15, 4.4, 1.9, { sheer: 0.7 }), 0x5a4630); B.box('wood', C.wood, 12, 0.08, 3.2, 0, 1, 0); for (let i = 0; i < 10; i++) { B.cyl('plaster', 0xb06a40, 0.13, 0.22, 0.7, -4 + (i % 5) * 1, 1.05, -0.5 + Math.floor(i / 5) * 1, 8); } B.rod('wood', C.wood, [2, 1, 0], [2, 7, 0], 0.09, 6); B.pop(); }
  B.pop();
  const wp = (a, d) => bank(455 + a, 60 + d), stacks = wp(7, 11);
  B.push(stacks[0], H(...stacks), stacks[1], wa); for (let i = 0; i < 24; i++) { B.cyl('plaster', 0xb06a40, 0.14, 0.24, 0.8, (i % 8) * 0.55 - 2, 0, Math.floor(i / 8) * 0.55, 8); B.cyl('plaster', 0xb06a40, 0.07, 0.14, 0.28, (i % 8) * 0.55 - 2, 0.8, Math.floor(i / 8) * 0.55, 8); } for (let i = 0; i < 5; i++) B.box('marble', C.marble, 1.6, 0.8, 1, 8 + (i % 3) * 2, (i > 2 ? 0.8 : 0), 0.3 + (i % 2) * 0.2, 0.1 * i); B.pop(); CB.circle(stacks[0], stacks[1], 2.6);
  for (let i = 0; i < 5; i++) add('roman', 'carry', 0, 0, 0, undefined, i > 2 ? 410 : undefined, { prop: i % 2 ? 'amphora' : 'sack', path: [wp(-18 + i, 4.5), wp(-14, 12), wp(-2, 22), wp(30, 40)], phase: i / 5 });
  for (let i = 0; i < 3; i++) add('roman', 'chisel', ...wp(10 + i * 4, 21 + (i % 2) * 2), r() * 6, undefined, 410); add('roman', 'saw', ...wp(24, 22), 1, undefined, 410); add('toga', 'write', ...wp(-10, 20), wa + 1.5, undefined, 410); add('roman', 'point', ...wp(-12, 21.5), wa - 1, undefined, 410);
  add('roman', 'row', ...wp(-18 - 4, -6.2), wa + PI, undefined, undefined, { afloat: 1, y: 0.35, prop: 'none', ok: 1 });
  for (const [t, d, a] of [[330, 8, 0.4], [620, -12, 3.4]]) { const [x, z] = bank(t, d), ry = Math.atan2(-TU[1], TU[0]) + a; B.push(x, -0.35, z, ry); B.add('wood', hullGeo(6, 1.8, 0.8, { sheer: 0.4 }), 0x6a5238); B.box('wood', C.wood, 4.6, 0.05, 1.2, 0, 0.42, 0); B.pop(); add('roman', 'row', x - Math.cos(ry) * 0.8, z + Math.sin(ry) * 0.8, ry + PI, undefined, undefined, { afloat: 1, y: -0.12, ok: 1, prop: 'none' }); add('roman', 'fish', x + Math.cos(ry) * 1.5, z - Math.sin(ry) * 1.5, ry + 1, undefined, undefined, { afloat: 1, y: 0.1, ok: 1 }); }
  B.when(-120, Infinity); const hv = [-196, 152]; B.push(hv[0], H(...hv), hv[1], 0); B.cyl('marble', C.marble, 7.6, 7.9, 1.6, 0, -0.4, 0, 26); for (let i = 0; i < 20; i++) column(B, 'marble', C.pentelic, Math.cos(i * 0.314) * 6.8, 1.2, Math.sin(i * 0.314) * 6.8, 8.6, 0.8, 'corinthian', { lo: i % 2 }); B.cyl('marble', C.pentelic, 4.6, 4.6, 8.6, 0, 1.2, 0, 22); B.cyl('tile', C.tile, 0.3, 8, 2.6, 0, 9.8, 0, 26); B.pop(); CB.circle(hv[0], hv[1], 8);
  temple(K, side({ x: -214, z: 112, ry: -0.5, w: 11, l: 19, nf: 4, colH: 7.4, d: 0.85, order: 'ionic', mat: 'ashlar', col: C.travertine, paint: 'plain', podium: 2.4, engaged: 1 }));   // Portunus, god of the harbour
  keep.push([-250, 90, -170, 170]);

  // ------------------------------------------------------------------ outside the walls: tombs, a farm, fields under the aqueduct
  B.when(-30, Infinity); B.box('ashlar', C.travertine, 16, 5, 16, 560, F - 1, -34); B.cyl('ashlar', C.travertine, 9, 9, 9, 560, F + 4, -34, 28); B.cyl('marble', C.marble, 9.2, 9.2, 0.8, 560, F + 12.6, -34, 28); CB.rect(560, -34, 8, 8, 0, -30);
  B.when(); for (const [x, z, ry] of [[520, -26, 0], [612, -28, 0.2], [700, -27, 0]]) { temple(K, { x, z, ry: -PI / 2 + ry, w: 5, l: 7, nf: 2, colH: 3.6, d: 0.5, order: 'tuscan', porch: 1, podium: 1.4, steps: 0, peripteral: false, mat: 'ashlar', col: C.tufa, paint: 'plain' }); }
  const FARM = [574, 62]; house2(K, FARM[0], FARM[1]);
  function house2(Kk, x, z) { const y = H(x, z); B.push(x, y, z, 0); B.box('ashlar', C.tufa, 20.4, 3, 12.4, 0, -2.5, 0); B.box('plaster', C.stucco, 20, 4.2, 12, 0, 0.5, 0); const p = 0.32, S = 6.6, rh = S * Math.tan(p), sl = S / Math.cos(p); for (const e of [1, -1]) { B.geo('tile', C.tile, BOX, 0, 4.7 + rh / 2, (e * S) / 2, 0, e * p, 0, 21, 0.15, sl, [21, sl]); B.geo('plaster', C.stucco, gableGeo(12, rh, 0.4), e * 9.8, 4.7, 0); } B.box('wood', C.door, 1.4, 2.4, 0.1, -3, 0.5, 6.02); for (const k of [3, 7]) B.box('wood', C.dark, 0.7, 0.7, 0.08, k, 2.6, 6.02); B.box('plaster', C.stucco, 14, 2, 0.5, 17, 0, 6); B.box('plaster', C.stucco, 0.5, 2, 14, 24, 0, -1); for (let k = 0; k < 4; k++) B.box('plaster', 0xc8a850, 2.2, 1.6 - (k % 2) * 0.4, 2.2, 13 + (k % 2) * 3, 0, -3 - Math.floor(k / 2) * 3); B.pop(); Kk.C.rect(x, z, 10.3, 6.3); }
  B.when(); drape(B, world, 'earth', 500, 16, 640, 132, 6, (x, z) => (x > 560 && x < 600 && z > 46 && z < 80 ? null : [0.05, Math.floor((z - 16) / 14.5) % 2 ? shade(0x7a6040, 0.9 + 0.2 * hash(Math.floor(x / 3), 3)) : 0xb8a058]));
  const beasts = new Beasts(world, group);
  for (const [z, ph] of [[22, 0], [34, 0.5]]) { const loop = [[506, z], [634, z], [634, z + 3], [506, z + 3], [506, z]]; add('roman', 'plough', 0, 0, 0, undefined, undefined, { path: loop, phase: ph, speed: 0.85 }); beasts.trail(M.horse, loop, 0.85, ph, -Infinity, Infinity, { lead: 3.4, scale: 0.8 }); }
  for (let i = 0; i < 4; i++) add('roman', 'hoe', 512 + i * 9 + r() * 3, 92 + (i % 2) * 2.4, r() * 0.6);
  add('roman', 'sow', 0, 0, 0, undefined, undefined, { path: [[508, 108], [632, 108], [632, 111], [508, 111], [508, 108]] });
  for (let i = 0; i < 5; i++) add(i % 3 === 2 ? 'roman-f' : 'roman', 'reap', 606 + i * 5 + r() * 2, 62 + r() * 4, 0.3 * (r() - 0.5), undefined, i > 2 ? 455 : undefined);
  walkers(['roman', 'roman-f'], 'carry', [[612, 68], [600, 84], [590, 71]], 2); add('roman-f', 'spin', 566, 71, -PI / 2); add('roman-f', 'weave', 571, 70.5, PI / 2); add('roman', 'thresh', 592, 52, 0); add('roman', 'thresh', 595.5, 53.5, PI);
  const lanes = [...beside(APPIA.slice(3).map(([x, z]) => [Math.min(x, 800), z]), -0.8), ...beside(APPIA.slice(3).map(([x, z]) => [Math.min(x, 800), z]), 0.8).reverse()]; lanes[0] = [484, lanes[0][1]]; lanes[lanes.length - 1] = [484, lanes[lanes.length - 1][1]]; lanes.push(lanes[0]);
  const LL = loopOf(lanes).L;
  [['hay', 0.1], ['stone', 0.55], ['jars', 0.8]].forEach(([load, ph], i) => { beasts.trail(M.horse, lanes, 1.15, ph, -Infinity, i === 1 ? 410 : Infinity, { scale: 0.84, tow: cart(load, i + 3) }); add('roman', 'herd', 0, 0, 0, undefined, i === 1 ? 410 : undefined, { path: lanes, phase: ph + 5.4 / LL, speed: 1.15 }); });

  // ------------------------------------------------------------------ the legions on the road
  const ML = loopOf(MARCH).L;
  for (const [ph, end] of [[0.02, undefined], [0.5, 400]]) for (let f = 0; f < 4; f++) { const P = beside(MARCH, (f - 1.5) * 1.0), Lf = loopOf(P).L; for (let k = 0; k < 8; k++) add('legionary', 'march', 0, 0, 0, undefined, end, { path: P, speed: (1.3 * Lf) / ML, phase: ph - (k * 1.6) / ML }); }
  for (const z of [-17, 3]) add('legionary', 'guard', 464, z, PI, 271);

  // ------------------------------------------------------------------ the people of the Forum
  add('toga', 'point', -121, 2, 0, undefined, 455, { y: 3.3, ok: 1 }); add('toga', 'stand', -122.4, -3, 0.2, undefined, 455, { y: 3.3, ok: 1 }); add('roman', 'write', -121.5, 7, 0.4, undefined, 410, { y: 3.3, ok: 1 });
  for (let i = 0; i < 12; i++) { const x = -114 + (i % 4) * 2.1 + r(), z = -6 + Math.floor(i / 4) * 5 + r() * 2; add(['toga', 'roman', 'roman-f', 'toga'][i % 4], i % 5 === 0 ? 'talk' : 'stand', x, z, toward(x, z, -121, 2) + (r() - 0.5) * 0.3, undefined, i % 2 ? fade() : undefined); }
  circle(['toga'], -106, -28, 5, 1.5, -52); circle(['toga', 'toga', 'roman'], -116, -29, 4, 1.3, undefined, 455); circle(['toga'], -60, -30, 4, 1.4, undefined, 410); circle(['toga', 'roman-f', 'roman'], -40, 12, 4, 1.4); circle(['toga', 'toga', 'roman'], -66, -6, 5, 1.6, undefined, 455); circle(['roman', 'roman-f'], -52, 9, 3, 1.1, undefined, 410); circle(['toga', 'roman'], -74, 14, 3, 1.2);
  add('roman', 'trade', -58, -14, PI / 2 + 0.3, undefined, 455); add('roman-f', 'trade', -47, -15, PI / 2, undefined, 410); add('roman-f', 'stand', -57.6, -12.4, -PI / 2); add('roman', 'sit', -30, -2, PI, undefined, 455); add('roman', 'write', -33, 4, 2.6);
  for (let i = 0; i < 4; i++) add(i % 2 ? 'toga' : 'roman', 'write', -100 + i * 9, 33.4, PI / 2, -46, i > 1 ? 410 : undefined, { y: 1.1, ok: 1 });
  walkers(['toga', 'roman', 'roman-f', 'toga', 'roman'], 'walk', [[-100, -10], [-60, 6], [-24, -12]], 5, undefined, 455); walkers(['roman', 'roman-f', 'toga'], 'walk', beside(ARGI, 2.5), 5); walkers(['roman', 'roman-f'], 'walk', beside(VICUS, -1), 3);
  walkers(['roman-f', 'roman', 'toga', 'roman'], 'walk', [[4, 20], [60, 22], [118, 14], [190, 4]], 4, undefined, 455); walkers(['roman', 'roman-f'], 'walk', beside(APPIA.slice(1, 4), 4.5), 3);
  for (let i = 0; i < 4; i++) add(i % 2 ? 'roman-f' : 'toga', 'pray', 19.5 + i * 1.5, 24 - i * 1.1, -PI / 2 - 0.9, undefined, i > 1 ? 380 : 394); add('roman-f', 'tend-fire', 21.6, 34.5, PI, undefined, 394, { prop: 'none' });
  for (let i = 0; i < 6; i++) add(['roman', 'roman-f', 'toga'][i % 3], ['talk', 'stand', 'point'][i % 3], 180 - (i % 3) * 3 + r() * 2, 26 + Math.floor(i / 3) * 14 + r() * 3, r() * 6.28, 80, 455);

  // ------------------------------------------------------------------ trees, beasts and birds
  const T = [];
  for (let i = 0; i < 260; i++) { const x = -640 + r() * 1500, z = -420 + r() * 840; if (CB.inside(x, z, 200, 4) || CB.inside(x, z, -100, 4) || CB.inside(x, z, 300, 4) || Math.abs(river(x, z)) < 75 || base(x, z) > 70 || !open(x, z, 3, 3) || (x > -175 && x < -18 && Math.abs(z) < 34) || (x > 496 && x < 644 && z > 12 && z < 136)) continue; const out = x > 480 || river(x, z) < 0, g = 0.6 + r() * 0.3, k = r(); if (!out && k > 0.35) continue; T.push({ kind: k < 0.4 ? 'pine' : k < 0.7 ? 'cypress' : 'olive', x, z, s: 0.6 + r() * 0.5, tint: k < 0.4 ? [g * 0.85, g, g * 0.75] : k < 0.7 ? [g * 0.7, g * 0.85, g * 0.7] : [g * 0.85, g, g * 0.9] }); }
  for (let x = 510; x < 940; x += 17) for (const z of [8, -22]) if (!CB.inside(x, z, 100, 3)) T.push({ kind: (x / 17 | 0) % 3 ? 'cypress' : 'pine', x: x + r() * 3, z: z + (z > 0 ? 1 : -1) * r() * 3, s: 0.6 + r() * 0.4, tint: [0.55, 0.68, 0.5] });
  for (let i = 0; i < 26; i++) { const x = -165 + r() * 140, z = (r() < 0.5 ? -1 : 1) * (8 + r() * 20); if (!CB.inside(x, z, 480, 2)) T.push({ kind: 'shrub', x, z, s: 0.6 + r() * 0.9, tint: [0.7, 0.8, 0.5], y0: 440 + r() * 40 }); }
  const grove = trees(world, group, T, 11);
  beasts.circle(M.crow, 3, -Infinity, Infinity, { cx: -60, cz: 0, spread: 150, R: [30, 80], speed: 8, fly: 34 }); beasts.circle(M.gull, 3, -Infinity, Infinity, { cx: -300, cz: 160, spread: 60, R: [30, 80], speed: 9, fly: 18 }); beasts.circle(M.hawk, 1, -Infinity, Infinity, { cx: 600, cz: 60, spread: 80, R: [80, 140], speed: 10, fly: 70 });
  beasts.circle(M.horse, 2, -Infinity, Infinity, { cx: 600, cz: -110, spread: 30, R: [8, 20], speed: 0.9, scale: [0.8, 0.92] });

  B.when().build(group);
  const folk = actors(world, A, { seed: 9 }); group.add(...folk.meshes);
  if (typeof location !== 'undefined' && location.search.includes('audit')) { audit('rome', A.filter((a) => !a.ok).map((a) => ({ yr: 200, ...a })), CB, world, 0, uToYear); console.warn('[audit rome] triangles ' + B.triangles); }
  return { update(u, t, env, camera, view) { const year = uToYear(u); CB.year = year; B.update(year); grove.update(year); beasts.update(year, t); folk.update(u, t, view); }, collide: (pos) => CB.collide(pos) };
}

export default {
  place: 'Italy · Rome', coords: [41.89, 12.49],
  terrain: { base, relief: () => 0, bounds: { x: 660, z: 330 }, tint },
  spawn: { x: -86, z: -2, yaw: -PI / 2 - 0.06 },
  env(year, e) {
    const late = smooth((year - 380) / 100);
    e.hill = 1; e.sea = 0; e.ice = -60; e.grass = 0.22 * late; e.precip = 0; e.cloud = 0.22 + 0.3 * late; e.fogD = 0.0015; e.sunI = 2.1 - 0.4 * late; e.sunEl = 0.66; e.amb = 0.95; e.glow = 0; e.exposure = 0.95; e.bloom = 0.15;   // a lower, warmer sun and less fill, so marble faces read apart instead of burning white
    put(e.top, SKY); put(e.hor, mix3(HOR, DULL, late)); put(e.ground, mix3(GROUND, WEEDY, late)); put(e.water, WATER); put(e.far, FAR); put(e.lava, [0, 0, 0]); put(e.sun, [1.0, 0.9, 0.76]);
    for (const [y, w] of [[64.4, 1], [410.3, 0.9], [455.3, 0.7]]) { const k = 1 - Math.abs(year - y) / w; if (k > 0) { e.fogD += 0.0025 * k; e.sunI -= 0.9 * k; put(e.hor, [e.hor[0] - 0.25 * k, e.hor[1] - 0.4 * k, e.hor[2] - 0.5 * k]); } }   // smoke over the city
  },
  events, build,
};
