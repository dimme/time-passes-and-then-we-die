import * as THREE from 'three';
import { rng, smooth, clamp, box, cyl, cone, ball, part, merge, vcMat, prismGeo, shadowed } from './util.js';
import { yearToU } from './timeline.js';
import { LAND } from './world.js';

const Y = yearToU;
const GROW = 0.0035;

// ---------- procedural facade textures ----------
function facade({ wall, win, frame, ww = 0.5, wh = 0.6, lit = 0, litCols = ['#ffe9a8'], piers, band, speck = 14, holes = 0 }) {
  const S = 256, C = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), r = rng(wall.length * 977 + win.length * 131 + Math.round(ww * 100));
  g.fillStyle = wall; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${(r() * speck) / 255})`; g.fillRect(r() * S, r() * S, 2 + r() * 6, 1 + r() * 2); }
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const w = C * ww, h = C * wh, x = cx * C + (C - w) / 2, y = cy * C + (C - h) / 2;
    if (frame) { g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6); }
    g.fillStyle = r() < lit ? litCols[Math.floor(r() * litCols.length)] : win; g.fillRect(x, y, w, h);
    if (!lit) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, y, w, h * 0.35); }
  }
  if (piers) { g.fillStyle = piers; for (let cx = 0; cx <= 4; cx++) g.fillRect(cx * C - 5, 0, 10, S); }
  if (band) { g.fillStyle = band; for (let cy = 0; cy <= 4; cy++) g.fillRect(0, cy * C - 3, S, 6); }
  for (let i = 0; i < holes; i++) { g.fillStyle = r() < 0.5 ? '#141412' : 'rgba(60,90,40,0.7)'; g.beginPath(); g.ellipse(r() * S, r() * S, 6 + r() * 22, 6 + r() * 30, r() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const NEON = ['#ff3ad8', '#3af0ff', '#ffd23a', '#7a5cff', '#ff5a3a', '#e8f4ff'];
const STYLES = {
  dutch: { tex: { wall: '#a8623a', win: '#2a2622', frame: '#e8e0cc', ww: 0.3, wh: 0.42 }, roof: 0x9a4a2a },
  brick: { tex: { wall: '#8a4636', win: '#262a30', frame: '#e0d8c8', ww: 0.34, wh: 0.56 }, roof: 0x45454c },
  brownstone: { tex: { wall: '#6a4636', win: '#1e2024', frame: '#7a5444', ww: 0.36, wh: 0.6 }, roof: 0x2e2c2c },
  tenement: { tex: { wall: '#7c3c2c', win: '#202428', frame: '#c8b8a0', ww: 0.38, wh: 0.58, band: 'rgba(30,20,16,0.55)' }, roof: 0x302e2e },
  castiron: { tex: { wall: '#c8c0b0', win: '#2a3038', ww: 0.6, wh: 0.72, piers: '#b0a898' }, roof: 0x3a3a3c },
  factory: { tex: { wall: '#6e3a2c', win: '#3a4a50', frame: '#4a2a22', ww: 0.66, wh: 0.6 }, roof: 0x2a2828 },
  deco: { tex: { wall: '#c9bca2', win: '#2c3238', ww: 0.34, wh: 0.7, piers: '#d8ccb4' }, roof: 0x8a8274 },
  decobrick: { tex: { wall: '#9a6a4a', win: '#2a2c30', ww: 0.34, wh: 0.66, piers: '#a87858' }, roof: 0x5a4a40 },
  glass: { tex: { wall: '#c0ccd2', win: '#5f93bd', ww: 0.86, wh: 0.84, speck: 4 }, roof: 0x6a6e72 },
  dark: { tex: { wall: '#1c2228', win: '#2f4a60', ww: 0.9, wh: 0.9, speck: 4 }, roof: 0x3a3e42 },
  bronze: { tex: { wall: '#2a2018', win: '#5a4a34', ww: 0.8, wh: 0.9, speck: 4 }, roof: 0x2a2420 },
  wtc: { tex: { wall: '#b8bcc0', win: '#5a646c', ww: 0.22, wh: 1, piers: '#c4c8cc', speck: 4 }, roof: 0x8a8e92 },
  green: { tex: { wall: '#e8ece4', win: '#6aa0b8', ww: 0.84, wh: 0.62, band: '#3f8a3a', speck: 4 }, roof: 0x3f8a3a },
  neon: { tex: { wall: '#0e0e16', win: '#06060a', ww: 0.5, wh: 0.34, lit: 0.4, litCols: NEON, speck: 6 }, roof: 0x101018, glow: true },
  white: { tex: { wall: '#f2f6f6', win: '#8adfe8', ww: 1, wh: 0.16, speck: 3 }, roof: 0xf2f6f6 },
  ruin: { tex: { wall: '#6c6c62', win: '#161614', ww: 0.5, wh: 0.6, holes: 26, speck: 30 }, roof: 0x4a5a3a },
};
const MATS = {};
function mats(style) {
  if (!MATS[style]) {
    const s = STYLES[style], map = facade(s.tex);
    const side = new THREE.MeshLambertMaterial({ map });
    if (s.glow) { side.emissive.set(0xffffff); side.emissiveMap = map; side.emissiveIntensity = 1.4; }
    const roof = new THREE.MeshLambertMaterial({ color: s.roof, side: THREE.DoubleSide });
    MATS[style] = [side, roof]; MATS[style].roof = roof; MATS[style].side = side;
  }
  return MATS[style];
}
const flat = (c, opts) => new THREE.MeshLambertMaterial({ color: c, ...opts });
const PLAIN = { silver: flat(0xc8ccd2), steel: flat(0x8a9098), wood: flat(0x5a4028), tile: flat(0x9a4a2a, { side: THREE.DoubleSide }), slate: flat(0x45454c, { side: THREE.DoubleSide }), brick: flat(0x7a4234), white: flat(0xf4f8f8) };
const VC = vcMat(), VCB = new THREE.MeshBasicMaterial({ vertexColors: true });

/** A textured box standing on y=0 whose windows stay ~3 m × 3.5 m whatever its size. */
function slab(w, h, d, style, r, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const uv = g.attributes.uv, ox = Math.floor(r() * 4) / 4, oy = Math.floor(r() * 4) / 4;
  const sv = Math.max(1, Math.round(h / 3.5)) / 4;
  for (let i = 0; i < 24; i++) {
    const f = i >> 2; if (f === 2 || f === 3) continue;
    const su = Math.max(1, Math.round((f < 2 ? d : w) / 3)) / 4;
    uv.setXY(i, uv.getX(i) * su + ox, uv.getY(i) * sv + oy);
  }
  // two draw calls per box: the four walls, then the roof (the underside is never seen)
  const ix = g.index.array, order = [0, 1, 4, 5, 2], idx = [];
  for (const f of order) for (let k = 0; k < 6; k++) idx.push(ix[f * 6 + k]);
  g.setIndex(idx); g.clearGroups(); g.addGroup(0, 24, 0); g.addGroup(24, 6, 1);
  const m = new THREE.Mesh(g, mats(style)); m.position.set(x, y, z); return m;
}
const grp = (...ch) => { const g = new THREE.Group(); g.add(...ch); return g; };
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// ---------- building types: each returns { obj, fw, fd } ----------
const pick = (r, a) => a[Math.floor(r() * a.length)];
const TYPES = {
  dutch(r) {
    const w = 6.5 + r() * 2.5, d = 8 + r() * 4, h = 4.2 + r() * 2;
    return { obj: grp(slab(w, h, d, 'dutch', r), at(new THREE.Mesh(prismGeo(w + 0.5, 3.6, d + 0.4), PLAIN.tile), 0, h, 0), at(new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, 0.8), PLAIN.brick), 0, h + 2.6, d * 0.3)), fw: w, fd: d };
  },
  colonial(r) {
    const w = 9 + r() * 7, d = 10 + r() * 6, h = 7 + r() * 4.5;
    return { obj: grp(slab(w, h, d, 'brick', r), at(new THREE.Mesh(prismGeo(w + 0.4, 2.4, d + 0.4), PLAIN.slate), 0, h, 0), at(new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), PLAIN.brick), w * 0.3, h + 1.8, 0)), fw: w, fd: d };
  },
  tenement(r) {
    const w = 20 + r() * 4, d = 17 + r() * 4, h = 13 + r() * 12;
    const o = grp(slab(w, h, d, pick(r, ['brownstone', 'tenement', 'tenement', 'castiron']), r));
    if (r() < 0.45) o.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 8), PLAIN.wood), w * 0.25, h + 2.8, d * 0.2), at(new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.2, 8), PLAIN.wood), w * 0.25, h + 4.9, d * 0.2));
    return { obj: o, fw: w, fd: d };
  },
  factory(r) {
    const w = 23, d = 20, h = 10 + r() * 6;
    return { obj: grp(slab(w, h, d, 'factory', r), at(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 30, 8), PLAIN.brick), w * 0.3, 15, -d * 0.25)), fw: w, fd: d };
  },
  deco(r) {
    const w = 21 + r() * 3, d = 18 + r() * 3, H = r() < 0.1 ? 190 + r() * 80 : 45 + r() * 110, st = r() < 0.6 ? 'deco' : 'decobrick';
    const o = grp(slab(w, H * 0.5, d, st, r), slab(w * 0.74, H * 0.3, d * 0.74, st, r, 0, H * 0.5, 0), slab(w * 0.46, H * 0.2, d * 0.46, st, r, 0, H * 0.8, 0));
    if (H > 100) o.add(at(new THREE.Mesh(new THREE.ConeGeometry(w * 0.16, H * 0.12, 4), PLAIN.silver), 0, H * 1.06, 0));
    return { obj: o, fw: w, fd: d };
  },
  glass(r) {
    const w = 18 + r() * 6, d = 15 + r() * 6, H = 50 + r() * r() * 190, st = pick(r, ['glass', 'glass', 'dark', 'bronze']);
    return { obj: grp(slab(w, H, d, st, r), slab(w * 0.5, 5, d * 0.5, st === 'glass' ? 'dark' : st, r, 0, H, 0)), fw: w, fd: d };
  },
  contemporary(r) {
    if (r() < 0.3) { const w = 11 + r() * 4, H = 240 + r() * 190; return { obj: grp(slab(w, H, w, pick(r, ['dark', 'glass']), r)), fw: w, fd: w }; }
    const w = 19 + r() * 5, d = 16 + r() * 5, H = 80 + r() * 160, st = r() < 0.6 ? 'green' : 'dark';
    return { obj: grp(slab(w, H * 0.7, d, st, r), slab(w * 0.8, H * 0.3, d * 0.7, st, r, w * 0.1, H * 0.7, 0)), fw: w, fd: d };
  },
  mega(r) {
    const w = 22 + r() * 2.5, d = 19 + r() * 2, H = 220 + r() * r() * 650;
    const c1 = pick(r, NEON), c2 = pick(r, NEON), sw = 0.5;
    const strips = merge([box(sw, H, sw, c1, w / 2, H / 2, d / 2), box(sw, H, sw, c1, -w / 2, H / 2, -d / 2), box(w + 0.6, 0.7, d + 0.6, c2, 0, 18 + r() * 30, 0), box(w + 0.6, 0.7, d + 0.6, c2, 0, 70 + r() * 80, 0), box(1.5, 1.5, 1.5, 0xff2020, 0, H + 1, 0)]);
    return { obj: grp(slab(w, H, d, 'neon', r), new THREE.Mesh(strips, VCB)), fw: w, fd: d };
  },
  spire(r) {
    const H = 160 + r() * 300, R = 7 + r() * 4;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.25, R, H, 14, 1), PLAIN.white); body.position.y = H / 2;
    const rings = [];
    for (let i = 1; i <= 4; i++) { const y = (H * i) / 5.5, rr = R * (1 - (y / H) * 0.75) + 2.5; rings.push(cyl(rr, rr, 1.2, 0x3f9a48, 0, y, 0, 14), cyl(rr * 0.9, rr * 0.9, 0.5, 0x8adfe8, 0, y - 0.9, 0, 14)); }
    return { obj: grp(body, new THREE.Mesh(merge(rings), VC)), fw: R * 2, fd: R * 2 };
  },
  ruin(r) {
    const w = 8 + r() * 14, d = 8 + r() * 12, h = 3 + r() * r() * 30;
    const m = slab(w, h, d, 'ruin', r); m.rotation.set((r() - 0.5) * 0.12, r() * 0.4, (r() - 0.5) * 0.12);
    return { obj: grp(m), fw: w, fd: d, noGrow: true };
  },
};

// ---------- the history of one building lot ----------
function planLot(r, dist) {
  const seq = [];
  let t = Math.min(1872, 1626 + dist * 0.55 + r() * 30), e;
  if (t < 1700) { e = 1700 + r() * 85; seq.push([t, e, 'dutch']); t = e; }
  if (t < 1835) { e = 1835 + r() * 45; seq.push([t, e, 'colonial']); t = e; }
  e = 1895 + r() * 70; seq.push([t, e, r() < 0.14 ? 'factory' : 'tenement']); t = e;
  while (t < 2150) {
    let type;
    if (t < 1940) { type = 'deco'; e = r() < 0.45 ? 1955 + r() * 45 : 2120 + r() * 160; }
    else if (t < 2005) { type = 'glass'; e = r() < 0.5 ? 2025 + r() * 100 : 2150 + r() * 130; }
    else { type = 'contemporary'; e = 2160 + r() * 140; }
    seq.push([t, e, type]); t = e;
  }
  if (r() < 0.72) seq.push([t, 2750 + r() * 230, 'mega']);
  else seq[seq.length - 1][1] = 2700 + r() * 250;          // a relic survives in the shadows
  if (r() < 0.09) { const a = 2965 + r() * 50, b = 9000 + r() * 4000; seq.push([a, b, 'spire'], [b, 20000 + r() * 70000, 'ruin']); }
  else if (r() < 0.22) seq.push([9600 + r() * 600, 22000 + r() * 70000, 'ruin']);
  return seq;
}

// ---------- hand-made landmarks ----------
function empireState(r) {
  const o = grp(slab(62, 24, 40, 'deco', r), slab(50, 66, 32, 'deco', r, 0, 24, 0), slab(38, 170, 25, 'deco', r, 0, 90, 0), slab(28, 46, 19, 'deco', r, 0, 260, 0), slab(15, 14, 11, 'deco', r, 0, 306, 0));
  o.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1, 4.5, 61, 8), PLAIN.silver), 0, 350.5, 0));
  return o;
}
function chrysler(r) {
  const o = grp(slab(38, 60, 36, 'decobrick', r), slab(27, 150, 26, 'deco', r, 0, 60, 0));
  o.add(at(new THREE.Mesh(new THREE.CylinderGeometry(8.5, 13, 22, 8), PLAIN.silver), 0, 221, 0), at(new THREE.Mesh(new THREE.CylinderGeometry(4, 8.5, 22, 8), PLAIN.silver), 0, 243, 0), at(new THREE.Mesh(new THREE.ConeGeometry(4, 64, 8), PLAIN.silver), 0, 286, 0));
  return o;
}
function oneWTC(r) {
  const g = new THREE.CylinderGeometry(13.5, 19, 390, 4, 1); const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 28);
  const t = new THREE.Mesh(g, mats('glass').side); t.rotation.y = Math.PI / 4; t.position.y = 27 + 195;
  return grp(slab(27, 27, 27, 'dark', r), t, at(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.2, 124, 6), PLAIN.silver), 0, 417 + 62, 0));
}
function bridge() {
  const stone = 0x8c7c6a, steel = 0x6a6258, p = [box(440, 1.6, 10, 0x5a544e, 425, 21, 0), box(100, 1.4, 10, 0x5a544e, 157, 12.2, 0, 0, 0, Math.atan2(17.5, 96))];
  for (const x of [330, 520]) { p.push(box(8, 30, 20, stone, x, 7, 0), box(8, 28, 5, stone, x, 36, -7.5), box(8, 28, 5, stone, x, 36, 7.5), box(8, 28, 4, stone, x, 36, 0), box(9, 4, 21, stone, x, 51, 0)); }
  for (const z of [-5.2, 5.2]) {
    const cable = (x1, y1, x2, y2) => p.push(box(Math.hypot(x2 - x1, y2 - y1), 0.5, 0.5, steel, (x1 + x2) / 2, (y1 + y2) / 2, z, 0, 0, Math.atan2(y2 - y1, x2 - x1)));
    cable(215, 22, 330, 50); cable(330, 50, 425, 24); cable(425, 24, 520, 50); cable(520, 50, 640, 22);
    for (let x = 235; x < 630; x += 14) { const y = x < 330 ? 22 + ((x - 215) / 115) * 28 : x < 425 ? 50 - ((x - 330) / 95) * 26 : x < 520 ? 24 + ((x - 425) / 95) * 26 : 50 - ((x - 520) / 120) * 28; p.push(box(0.14, y - 21, 0.14, steel, x, (y + 21) / 2, z)); }
  }
  return new THREE.Mesh(merge(p), VC);
}
function windmill() {
  const body = new THREE.Mesh(merge([cyl(2, 3.2, 9, 0x6a5038, 0, 4.5, 0, 8), cone(2.4, 2.4, 0x3a2e24, 0, 10.2, 0, 8)]), VC);
  const blades = new THREE.Mesh(merge([0, 1, 2, 3].map((i) => box(1.3, 7.5, 0.15, 0xd8ccb0, Math.sin(i * Math.PI / 2) * 4, Math.cos(i * Math.PI / 2) * 4, 0, 0, 0, -i * Math.PI / 2))), VC);
  blades.position.set(0, 9, 2.6);
  const g = grp(body, blades); g.userData.tick = (t) => { blades.rotation.z = t * 0.7; };
  return g;
}
function fort() {
  const e = 0x7c6a4c, p = [];
  for (const s of [-1, 1]) { p.push(box(36, 3.2, 1.6, e, 0, 1.6, s * 17), box(1.6, 3.2, 36, e, s * 17, 1.6, 0)); for (const q of [-1, 1]) p.push(cyl(3, 3.6, 3.6, e, s * 17, 1.8, q * 17, 4, 0, Math.PI / 4)); }
  p.push(box(14, 5, 8, 0xa8623a, -4, 2.5, -5), part(prismGeo(8.5, 3, 14.5), 0x9a4a2a, -4, 5, -5, 0, Math.PI / 2), box(8, 4, 6, 0xa8623a, 7, 2, 6), part(prismGeo(6.5, 2.4, 8.5), 0x9a4a2a, 7, 4, 6, 0, Math.PI / 2));
  p.push(cyl(0.12, 0.12, 14, 0x4a3a2a, 12, 7, -12), box(3, 0.6, 0.05, 0xf08020, 13.6, 13.6, -12), box(3, 0.6, 0.05, 0xffffff, 13.6, 13, -12), box(3, 0.6, 0.05, 0x2040a0, 13.6, 12.4, -12));
  return new THREE.Mesh(merge(p), vcMat({ side: THREE.DoubleSide }));
}
function campfire(light = true) {
  const logs = new THREE.Mesh(merge([box(1.6, 0.25, 0.25, 0x3a2a1c, 0, 0.15, 0, 0, 0.5), box(1.6, 0.25, 0.25, 0x3a2a1c, 0, 0.15, 0, 0, -0.6), box(1.5, 0.25, 0.25, 0x2a1c12, 0, 0.3, 0, 0, 1.6)]), VC);
  const flame = new THREE.Mesh(merge([cone(0.45, 1.5, 0xff8a1a, 0, 0.9, 0, 5), cone(0.25, 0.9, 0xffe070, 0, 0.7, 0, 5)]), VCB);
  const g = grp(logs, flame);
  if (light) { const l = new THREE.PointLight(0xff8a3a, 260, 45, 1.6); l.position.y = 1.5; g.add(l); g.userData.tick = (t) => { flame.scale.set(1 + Math.sin(t * 13) * 0.15, 1 + Math.sin(t * 17 + 1) * 0.25, 1 + Math.cos(t * 11) * 0.15); l.intensity = 230 + Math.sin(t * 19) * 40 + Math.sin(t * 7) * 30; }; }
  return g;
}
const figureGeo = (c, x, z, ry = 0) => [cyl(0.2, 0.26, 1.05, c, x, 0.6, z, 6), ball(0.17, 0xb07850, x, 1.3, z)];
function lenapeVillage(r) {
  const p = [];
  const dome = (x, z, s, sz = 1) => { p.push(part(new THREE.SphereGeometry(2.6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x7a5c3c, x, 0, z, 0, r() * 6, 0, s, s, s * sz), box(0.9 * s, 1.3 * s, 0.3, 0x1c140e, x + 2.45 * s, 0.65 * s, z)); };
  dome(-9, -6, 1); dome(-10, 5, 1.1); dome(8, -8, 0.9); dome(10, 4, 1); dome(-1, 10, 1); dome(1, -14, 1.2, 2.6);
  for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 2.5 + r() * 5; p.push(...figureGeo(pick(r, [0x8a6a4a, 0x9a7a52, 0x6a4a34]), Math.cos(a) * d, Math.sin(a) * d)); }
  for (let i = 0; i < 24; i++) p.push(cone(0.35, 1.8, 0x7a9a3a, 16 + (i % 6) * 1.6, 0.9, -4 + Math.floor(i / 6) * 1.8, 4));   // maize
  p.push(box(5, 0.5, 0.8, 0x6a4a2a, -16, 0.3, -2, 0, 0.4));   // canoe
  const g = grp(new THREE.Mesh(merge(p), vcMat({ side: THREE.DoubleSide })), campfire()); g.userData.tick = g.children[1].userData.tick; return g;
}
function paleoCamp(r) {
  const p = [];
  for (const [x, z] of [[-5, -3], [5, -4], [0, 6]]) p.push(cone(2.2, 3.4, 0x9a8464, x, 1.7, z, 7), cyl(0.05, 0.05, 1.2, 0x3a2a1c, x, 3.8, z));
  for (let i = 0; i < 5; i++) { const a = i * 1.3, d = 2.2 + (i % 2); p.push(...figureGeo(0x7a6248, Math.cos(a) * d, Math.sin(a) * d)); }
  const g = grp(new THREE.Mesh(merge(p), VC), campfire()); g.userData.tick = g.children[1].userData.tick; return g;
}
function elevator() {
  const base = new THREE.Mesh(merge([cyl(26, 34, 14, 0xf0f4f4, 0, 5, 0, 16), cyl(10, 22, 30, 0xe0ecec, 0, 27, 0, 16), cyl(27, 27, 1, 0x8adfe8, 0, 12.5, 0, 16)]), VC);
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 9000, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); tether.position.y = 4500;
  const car = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8af4ff, fog: false }));
  const g = grp(base, tether, car); g.userData.tick = (t) => { car.position.y = 40 + ((t * 30) % 1500); };
  return g;
}
function holo(text, col) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = col; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n'); lines.forEach((l, i) => g.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * 66));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
}

// ---------- assemble ----------
export function buildCity(world, scene) {
  const group = new THREE.Group(); scene.add(group);
  const occ = [];     // buildings: appear, grow, get replaced
  const props = [];   // everything else with a lifespan
  const addOcc = (b, x, z, y0, y1) => { shadowed(b.obj); b.obj.position.set(x, LAND, z); occ.push({ ...b, x, z, u0: Y(y0), u1: Y(y1), in: false }); };
  const addProp = (obj, x, z, y0, y1, ground = true) => { shadowed(obj); obj.position.set(x, ground ? LAND : 0, z); props.push({ obj, x, z, u0: Y(y0), u1: Y(y1), ground, in: false, tick: obj.userData.tick }); };

  const reserved = { '2,-3': 1929, '1,-5': 1927, '1,1': 1966, '1,2': 1966, '2,1': 0, '1,0': 1733 };
  for (let c = 0; c < 4; c++) for (let row = -8; row < 8; row++) {
    const cut = reserved[`${c},${row}`];
    if (cut === 0) continue;
    const bx = -150 + c * 100, bz = row * 60 + 30;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = bx + (i - 1) * 26.67, z = bz + (j - 0.5) * 24;
      const r = rng(c * 7919 + (row + 20) * 104729 + i * 31 + j * 17 + 5);
      for (const [a, b, type] of planLot(r, Math.hypot(x, z - 40))) {
        if (cut && a >= cut) break;
        addOcc(TYPES[type](r), x + (a < 1811 ? (r() - 0.5) * 5 : 0), z + (a < 1811 ? (r() - 0.5) * 3 : 0), a, cut ? Math.min(b, cut) : b);
      }
    }
  }
  const r = rng(99);
  addOcc({ obj: empireState(r), fw: 62, fd: 40 }, 50, -150, 1930, 2760);
  addOcc({ obj: chrysler(r), fw: 38, fd: 36 }, -50, -270, 1928.5, 2720);
  const tower = () => { const t = grp(slab(26, 415, 26, 'wtc', r)); return t; };
  const north = tower(); north.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 110, 6), PLAIN.silver), 0, 470, 0));
  addOcc({ obj: north, fw: 26, fd: 26 }, -68, 81, 1970, 2001.7);
  addOcc({ obj: tower(), fw: 26, fd: 26 }, -32, 99, 1971.5, 2001.7);
  for (const [x, z] of [[-68, 81], [-32, 99]]) addProp(new THREE.Mesh(merge([box(24, 0.5, 24, 0x6a6e72, 0, 0.25, 0), box(20, 0.52, 20, 0x0c1014, 0, 0.26, 0)]), VC), x, z, 2011, 2900);
  addOcc({ obj: oneWTC(r), fw: 27, fd: 27 }, -50, 150, 2012.5, 2700);

  // streets (laid out by the 1811 plan)
  const sp = [];
  for (let k = -2; k <= 2; k++) sp.push(box(13, 0.06, 1000, 0xffffff, k * 100, 0.03, 0));
  for (let k = -8; k <= 8; k++) sp.push(box(480, 0.06, 7, 0xffffff, 0, 0.05, k * 60));
  const streetMat = new THREE.MeshLambertMaterial({ color: 0x6a5a48 });
  const streets = new THREE.Mesh(merge(sp), streetMat);
  addProp(streets, 0, 0, 1811, 2950);
  const dirt = new THREE.Color(0x6e5c46), asphalt = new THREE.Color(0x2b2b30), u1811 = Y(1811), u1925 = Y(1925);

  // a park that outlives almost everything around it
  const pk = [box(76, 0.12, 44, 0x4f8a3a, 0, 0.06, 0), box(76, 0.14, 3, 0xb8b0a0, 0, 0.07, 0), box(3, 0.14, 44, 0xb8b0a0, 0, 0.07, 0), cyl(5, 5.5, 0.6, 0x9a968c, 0, 0.3, 0, 12), cyl(0.5, 0.8, 2.4, 0x9a968c, 0, 1.5, 0, 8)];
  for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 68, z = (r() - 0.5) * 38; if (Math.abs(x) < 7 && Math.abs(z) < 7) continue; pk.push(cyl(0.3, 0.45, 5, 0x4a3524, x, 2.5, z), ball(3.2, i % 2 ? 0x3f7a2a : 0x4a8a30, x, 7, z, 1, 0.8, 1)); }
  addProp(new THREE.Mesh(merge(pk), VC), -50, 30, 1733, 2160);
  // people before the city
  addProp(paleoCamp(r), 26, 34, -11.4e3, -9200);
  addProp(lenapeVillage(r), 24, 22, 950, 1640);
  // New Amsterdam
  addProp(fort(), 62, 90, 1626, 1790);
  addProp(windmill(), 22, 92, 1628, 1740);
  addProp(new THREE.Mesh(merge(Array.from({ length: 94 }, (_, i) => box(4.6, 3.4 + (i % 3) * 0.3, 0.4, 0x5a4630, -232.5 + i * 5, 1.7, 0))), VC), 0, -66, 1653, 1699);
  // Brooklyn Bridge
  addProp(bridge(), 0, -120, 1883, 6000, false);
  // megacity holograms
  const slogans = ['TIME IS\nRUNNING', 'MEMORIES\n50% OFF', 'RAIN AGAIN\nTOMORROW', 'LIVE\nFOREVER*', 'NEW NEW\nYORK', 'BREATHE™', 'SKY: SOLD', 'YOU ARE\nHERE'];
  slogans.forEach((s, i) => {
    const h = holo(s, NEON[i % 5]); const onAve = i % 2 === 0;
    h.rotation.y = onAve ? 0 : Math.PI / 2;
    addProp(h, onAve ? (i % 4 === 0 ? 0 : 100 * (i % 3 - 1)) : -40 + i * 22, (onAve ? -70 - i * 35 : 60 * ((i % 3) - 1)) + (i === 7 ? 120 : 0), 2190 + i * 6, 2820 - i * 9, false);
    h.position.y = 30 + (i % 4) * 22;
  });
  // the star age
  addProp(elevator(), 420, 200, 2990, 9600, false);

  let lastV = -1, lastU = -9;
  return {
    update(u, t) {
      const moved = world.shapeVersion !== lastV; lastV = world.shapeVersion;
      if (u !== lastU || moved) {
        lastU = u;
        for (const o of occ) {
          const vis = u >= o.u0 && u < o.u1;
          if (vis !== o.in) { o.in = vis; vis ? group.add(o.obj) : group.remove(o.obj); }
          if (moved) o.obj.position.y = world.heightAt(o.x, o.z) - 0.05;
          if (vis && !o.noGrow) o.obj.scale.y = Math.max(0.02, smooth((u - o.u0) / GROW));
        }
        for (const p of props) {
          const vis = u >= p.u0 && u < p.u1;
          if (vis !== p.in) { p.in = vis; vis ? group.add(p.obj) : group.remove(p.obj); }
          if (moved && p.ground) p.obj.position.y = world.heightAt(p.x, p.z);
        }
        streetMat.color.copy(dirt).lerp(asphalt, smooth((u - u1811) / (u1925 - u1811)));
      }
      for (const p of props) if (p.in && p.tick) p.tick(t);
    },
    /** Push a point out of any building standing right now. */
    collide(pos, rad = 0.7) {
      for (const o of occ) {
        if (!o.in) continue;
        const dx = pos.x - o.x, dz = pos.z - o.z, px = o.fw / 2 + rad - Math.abs(dx), pz = o.fd / 2 + rad - Math.abs(dz);
        if (px > 0 && pz > 0) { if (px < pz) pos.x += (dx < 0 ? -1 : 1) * px; else pos.z += (dz < 0 ? -1 : 1) * pz; }
      }
    },
    count: () => group.children.length,
  };
}
