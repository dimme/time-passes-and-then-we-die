// The city through time: every lot's succession of buildings, the landmarks, the streets and everything standing in them.
//   city-kit.js        facade textures, shared materials, the geometry accumulator
//   city-types.js      the building types
//   city-landmarks.js  Empire State, Chrysler, the World Trade Center, Brooklyn Bridge
//   city-props.js      camps, fort, mill, wall, park, street furniture, the far future
import * as THREE from 'three';
import { rng, smooth, clamp } from './util.js';
import { yearToU } from './timeline.js';
import { LAND } from './world.js';
import { shared, canvasTex, normalMap, tileNoise, detailMap } from './textures.js';
import { Scatter } from './flora.js';
import { Kit, M, NEON, setNight, conform } from './city-kit.js';
import { TYPES } from './city-types.js';
import { empireState, chrysler, twinTower, oneWTC, bridge, BRIDGE_DECK } from './city-landmarks.js';
import { paleoCamp, lenapeVillage, fort, windmill, palisade, park, pool, elevator, holo, lampParts, signalParts, hydrantParts, subwayParts } from './city-props.js';

export { TYPES };
const Y = yearToU;
const GROW = 0.0035;
const KEEP = 620;       // buildings kept built at once; the least recently seen beyond that are freed

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

// ---------- assemble ----------
export function buildCity(world, scene) {
  const group = new THREE.Group(); scene.add(group);
  const occ = [];     // buildings: appear, grow, get replaced. Built only when first seen.
  const props = [];   // everything else with a lifespan
  /** make() → { obj, fw, fd }; place(b) → [x, z] once its footprint is known */
  const addOcc = (make, place, ry, y0, y1) => occ.push({ make, place, ry, u0: Y(y0), u1: Y(y1), in: false, obj: null, x: 0, z: 0, fw: 0, fd: 0, seen: 0 });
  const addProp = (obj, x, z, y0, y1, ground = true) => { obj.position.set(x, ground ? LAND : 0, z); props.push({ obj, x, z, u0: Y(y0), u1: Y(y1), ground, in: false, tick: obj.userData.tick }); return obj; };
  /** the land at a point relative to (X, Z), for things that stood on the island's original hills */
  const liftAt = (X, Z) => (x, z) => world.heightAt(X + x, Z + z) - world.heightAt(X, Z);

  const reserved = { '2,-3': 1929, '1,-5': 1927, '1,1': 1966, '1,2': 1966, '2,1': 0, '1,0': 1733 };
  for (let c = 0; c < 4; c++) for (let row = -8; row < 8; row++) {
    const cut = reserved[`${c},${row}`];
    if (cut === 0) continue;
    const bx = -150 + c * 100, bz = row * 60 + 30;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = bx + (i - 1) * 26.67, z = bz + (j - 0.5) * 24, seed = c * 7919 + (row + 20) * 104729 + i * 31 + j * 17 + 5, r = rng(seed);
      // every building fronts its cross street; the end lots of a block turn a second face to the avenue
      const dir = j ? 1 : -1, side = i - 1, ry = j ? 0 : Math.PI, corner = side * dir;
      planLot(r, Math.hypot(x, z - 40)).forEach(([a, b, type], n) => {
        if (cut && a >= cut) return;
        const old = a < 1811, jx = old ? (r() - 0.5) * 5 : 0, jz = old ? (r() - 0.5) * 3 : 0, turn = type === 'dutch' ? (r() - 0.5) * 0.5 : 0;
        addOcc(() => TYPES[type](rng(seed * 31 + n * 977), corner), (o) => (old ? [x + jx, z + jz] : [x + side * (13.33 - o.fw / 2), z + dir * (12 - o.fd / 2)]), ry + turn, a, cut ? Math.min(b, cut) : b);
      });
    }
  }
  const r = rng(99), fixed = (make, x, z, y0, y1) => addOcc(() => make(rng(x * 13 + z)), () => [x, z], 0, y0, y1);
  fixed(empireState, 50, -150, 1930, 2760);
  fixed(chrysler, -50, -270, 1928.5, 2720);
  fixed((q) => twinTower(q, true), -64, 150, 1970, 2001.7);
  fixed((q) => twinTower(q, false), -36, 90, 1971.5, 2001.7);
  for (const [x, z] of [[-64, 150], [-36, 90]]) addProp(pool(), x, z, 2011, 2900);
  fixed(oneWTC, -27, 150, 2012.5, 2700);

  // streets (laid out by the 1811 plan): packed earth and cobbles first, marked asphalt later
  const T = shared();
  const quad = (o, x0, z0, x1, z1, y, u0, v0, u1, v1, swap) => {
    const P = [[x0, z0], [x0, z1], [x1, z1], [x1, z0]], U = swap ? [[v0, u0], [v1, u0], [v1, u1], [v0, u1]] : [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    for (const k of [0, 1, 2, 0, 2, 3]) { o.p.push(P[k][0], y, P[k][1]); o.n.push(0, 1, 0); o.uv.push(U[k][0], U[k][1]); }
  };
  const geoOf = (o) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); return g; };
  const flatMesh = (o, mat) => { const m = new THREE.Mesh(geoOf(o), mat); m.receiveShadow = true; return m; };
  const roadTex = (lanes) => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), rr = rng(lanes * 7 + 3);
    g.fillStyle = '#2f2f33'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rr() < 0.5 ? '0,0,0' : '255,255,255'},${rr() * 0.07})`; g.fillRect(rr() * 512, rr() * 512, 1 + rr() * 3, 1 + rr() * 3); }
    if (lanes < 2) for (const x of lanes ? [70, 190, 322, 442] : [128, 384]) { const s = g.createLinearGradient(x - 30, 0, x + 30, 0); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.5, 'rgba(0,0,0,0.22)'); s.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = s; g.fillRect(x - 30, 0, 60, 512); }   // the dark track tyres leave down each lane
    for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); let x = rr() * 512, y = rr() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rr() - 0.5) * 60; y += rr() * 50; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(20,20,22,0.5)'; g.fillRect(rr() * 400, rr() * 400, 40 + rr() * 90, 30 + rr() * 60); }   // patches
    g.fillStyle = '#d8b83a';
    if (lanes === 1) { g.fillRect(250, 0, 4, 512); g.fillRect(258, 0, 4, 512); g.fillStyle = '#d8d8d0'; for (const x of [128, 384]) g.fillRect(x - 2, 0, 4, 190); g.fillRect(14, 0, 4, 512); g.fillRect(494, 0, 4, 512); }
    else if (!lanes) g.fillRect(253, 0, 6, 256);
    return canvasTex(c);
  };
  const zebra = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f2f33'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#d6d6ce'; g.fillRect(24, 0, 80, 128); const rr = rng(8); for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(40,40,44,0.3)'; g.fillRect(rr() * 128, rr() * 128, 1 + rr() * 2, 1 + rr()); } return canvasTex(c); })();
  const ave = { p: [], n: [], uv: [] }, cross = { p: [], n: [], uv: [] }, plain = { p: [], n: [], uv: [] }, zeb = { p: [], n: [], uv: [] }, old = { p: [], n: [], uv: [] };
  for (let k = -2; k <= 2; k++) { quad(ave, k * 100 - 6.5, -500, k * 100 + 6.5, 500, 0.03, 0, 0, 1, 1000 / 12); quad(old, k * 100 - 6.5, -500, k * 100 + 6.5, 500, 0.03, 0, 0, 13 / 1.6, 625); }
  for (let k = -8; k <= 8; k++) { quad(cross, -240, k * 60 - 3.5, 240, k * 60 + 3.5, 0.04, 0, 0, 1, 480 / 8, true); quad(old, -240, k * 60 - 3.5, 240, k * 60 + 3.5, 0.04, 0, 0, 300, 7 / 1.6); }
  const iron = new Kit(), stop = 0xd6d6ce;      // manhole covers, drain gratings and stop lines
  for (let a = -2; a <= 2; a++) for (let k = -8; k <= 8; k++) {
    const x = a * 100, z = k * 60;
    quad(plain, x - 6.5, z - 6.2, x + 6.5, z + 6.2, 0.05, 0, 0, 1.3, 1.2); quad(plain, x - 9.2, z - 3.5, x + 9.2, z + 3.5, 0.05, 0, 0, 1.8, 0.7);
    for (const s of [-1, 1]) {
      quad(zeb, x - 6.5, z + s * 4.9 - 1.3, x + 6.5, z + s * 4.9 + 1.3, 0.06, 0, 0, 10, 1); quad(zeb, x + s * 7.9 - 1.3, z - 3.5, x + s * 7.9 + 1.3, z + 3.5, 0.06, 0, 0, 6, 1, true);
      iron.box(M.trim, stop, 6, 0.01, 0.4, x + s * 3.2, 0.055, z - s * 7, 'b'); iron.box(M.trim, 0x1c1c1e, 0.9, 0.012, 0.45, x + s * 6.2, 0.06, z + s * 6.6, 'b');
    }
    iron.cyl(M.trim, 0x2a2826, 0.42, 0.42, 0.012, x + 1.8, 0.058, z + 1.2, 12); if (k < 8) { iron.cyl(M.trim, 0x2a2826, 0.42, 0.42, 0.012, x - 2.2, 0.036, z + 21, 12); iron.cyl(M.trim, 0x35322e, 0.36, 0.36, 0.012, x + 3.4, 0.036, z + 41, 12); }
    if (a < 2) iron.cyl(M.trim, 0x2a2826, 0.42, 0.42, 0.012, x + 37 + (k & 3) * 9, 0.046, z + 0.9, 12);
  }
  const asph = { roughness: 0.82, normalMap: T.groundNormal, normalScale: new THREE.Vector2(0.5, 0.5) }, modern = new THREE.Group();
  modern.add(flatMesh(ave, new THREE.MeshStandardMaterial({ map: roadTex(1), ...asph })), flatMesh(cross, new THREE.MeshStandardMaterial({ map: roadTex(0), ...asph })),
    flatMesh(plain, new THREE.MeshStandardMaterial({ map: roadTex(2), ...asph })), flatMesh(zeb, new THREE.MeshStandardMaterial({ map: zebra, ...asph })), iron.build());
  addProp(modern, 0, 0, 1912, 2950);
  // cobbles: rows of rounded setts
  const cob = (() => {
    const S = 256, h = new Float32Array(S * S), base = tileNoise(S, 8, 3, 7);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const row = Math.floor(y / 32), fx = ((x + (row % 2) * 32) % 64) / 64, fy = (y % 32) / 32; h[y * S + x] = Math.min(1, Math.sin(fx * Math.PI) ** 0.35 * Math.sin(fy * Math.PI) ** 0.35) * (0.75 + 0.25 * base[y * S + x]); }
    return { map: detailMap(h, S, 0.45, 1.0), normalMap: normalMap(h, S, 6) };
  })();
  const streetMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9, map: cob.map, normalMap: cob.normalMap });
  addProp(flatMesh(old, streetMat), 0, 0, 1811, 1912);
  const dirt = new THREE.Color(0x8a7458), asphalt = new THREE.Color(0x77736c), u1811 = Y(1811), u1925 = Y(1870);
  // sidewalks: a raised slab of flagstones under every block, edged with a granite curb
  const paving = (() => {
    const S = 256, h = new Float32Array(S * S), n = tileNoise(S, 16, 3, 11);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = (x % 64 < 2 || y % 64 < 2 ? 0.25 : 0.8) * (0.85 + 0.15 * n[y * S + x]) + 0.1 * n[y * S + x];
    return { map: detailMap(h, S, 0.55, 1.05), normalMap: normalMap(h, S, 3) };
  })();
  const walk = { p: [], n: [], uv: [] }, curbs = new Kit();
  for (let c = 0; c < 4; c++) for (let row = -8; row < 8; row++) {
    const bx = -150 + c * 100, bz = row * 60 + 30;
    quad(walk, bx - 43.2, bz - 26.2, bx + 43.2, bz + 26.2, 0.17, 0, 0, 86.4 / 4.5, 52.4 / 4.5);
    for (const s of [-1, 1]) { curbs.box(M.trim, 0x8f8d88, 87, 0.185, 0.3, bx, 0, bz + s * 26.35, 'b'); curbs.box(M.trim, 0x8f8d88, 0.3, 0.185, 52.4, bx + s * 43.35, 0, bz, 'bfk'); }
  }
  const walks = new THREE.Group(); walks.add(flatMesh(walk, new THREE.MeshStandardMaterial({ color: 0x9a9892, roughness: 0.88, map: paving.map, normalMap: paving.normalMap })), curbs.build());
  addProp(walks, 0, 0, 1811, 2950);

  // street furniture, instanced: gas lamps, then the bishop's crook, then the cobra head; signals, hydrants, subway entrances
  const furniture = [], scatter = (parts, items) => { const s = new Scatter(world, parts, items); scene.add(...s.meshes); furniture.push(s); };
  const one = [1, 1, 1], lampAt = (y0, y1) => { const items = []; for (let a = -2; a <= 2; a++) for (const s of [-1, 1]) for (let z = -465; z <= 465; z += 30) items.push({ x: a * 100 + s * 7.2, z: z + (s > 0 ? 15 : 0), s: 1, rot: s > 0 ? Math.PI : 0, u0: Y(y0(z)), u1: Y(y1(z)), tint: one }); return items; };
  scatter(lampParts('gas'), lampAt((z) => 1825 + Math.abs(z) * 0.1, (z) => 1908 + (z % 7)));
  scatter(lampParts('crook'), lampAt((z) => 1908 + (z % 7), (z) => 1962 + (z % 5)));
  scatter(lampParts('cobra'), lampAt((z) => 1962 + (z % 5), (z) => 2170 + (z % 7) * 5));
  const sig = [], hyd = [], sub = [];
  for (let a = -2; a <= 2; a++) for (let k = -8; k <= 8; k++) {
    const x = a * 100, z = k * 60;
    for (const s of [-1, 1]) sig.push({ x: x - s * 7.3, z: z + s * 4.6, s: 1, rot: s > 0 ? 0 : Math.PI, u0: Y(1922 + Math.abs(k) * 1.5), u1: Y(2165), tint: one });
    if (k < 8) for (const s of [-1, 1]) hyd.push({ x: x + s * 6.95, z: z + 30 + s * 9, s: 1, rot: s > 0 ? Math.PI : 0, u0: Y(1845 + Math.abs(k) * 3), u1: Y(2165), tint: one });
    if (Math.abs(a) < 2 && k % 4 === 0 && k < 8) sub.push({ x: x + 8.6, z: z + 10.5, s: 1, rot: 0, u0: Y(1904 + Math.abs(k)), u1: Y(2165), tint: one });
  }
  scatter(signalParts(), sig); scatter(hydrantParts(), hyd); scatter(subwayParts(), sub);

  // a park that outlives almost everything around it
  addProp(park(r, liftAt(-50, 30)), -50, 30, 1733, 2160);
  // people before the city
  addProp(paleoCamp(r, liftAt(26, 34)), 26, 34, -11.4e3, -9200);
  addProp(lenapeVillage(r, liftAt(24, 22)), 24, 22, 950, 1640);
  // New Amsterdam
  addProp(fort(r, liftAt(62, 90)), 62, 90, 1626, 1790);
  addProp(windmill(r), 22, 92, 1628, 1740);
  addProp(palisade(r, liftAt(0, -66)), 0, -66, 1653, 1699);
  // Brooklyn Bridge
  addProp(bridge(r), 0, -120, 1883, 6000, false);
  const deck = { ...BRIDGE_DECK, z: -120, yAt: BRIDGE_DECK.yAt }, uBridge = [Y(1883), Y(6000)];
  // megacity holograms
  const SIGN_SPOTS = [[0, 90], [50, 60], [0, -150], [-50, -60], [100, 30], [150, 0], [-100, -30], [-50, 120]];
  const slogans = ['TIME IS\nRUNNING', 'MEMORIES\n50% OFF', 'RAIN AGAIN\nTOMORROW', 'LIVE\nFOREVER*', 'NEW NEW\nYORK', 'BREATHE™', 'SKY: SOLD', 'YOU ARE\nHERE'];
  slogans.forEach((s, i) => {
    // each hangs over the middle of a street, facing along it, and is narrower than the gap between the buildings
    const h = holo(s, '#' + NEON[i % 5].toString(16).padStart(6, '0')), onAve = i % 2 === 0, [x, z] = SIGN_SPOTS[i];
    h.rotation.y = onAve ? 0 : Math.PI / 2; h.scale.setScalar(onAve ? 0.38 : 0.23);
    addProp(h, x, z, 2190 + i * 6, 2820 - i * 9, false);
    h.position.y = (onAve ? 20 : 15) + (i % 3) * 7;
  });
  // megacity: the streets are canals, so the sidewalks are joined by footbridges at every corner
  const fb = { p: [], n: [], uv: [] }, slab = (x0, z0, x1, z1) => quad(fb, x0, z0, x1, z1, 0.19, 0, 0, (x1 - x0) / 3, (z1 - z0) / 3);
  for (let a = -2; a <= 2; a++) for (let k = -8; k <= 8; k++) for (const s of [-1, 1]) {
    const x = a * 100, z = k * 60;
    slab(x + s * 8.25 - 1.75, z - 3.6, x + s * 8.25 + 1.75, z + 3.6);     // along the avenue, over the cross street
    slab(x - 6.6, z + s * 4.75 - 1.25, x + 6.6, z + s * 4.75 + 1.25);     // along the cross street, over the avenue
  }
  addProp(flatMesh(fb, new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.55, metalness: 0.5, emissive: 0x16303a })), 0, 0, 2172, 2950);
  // the star age
  addProp(elevator(), 420, 200, 2990, 9600, false);

  /** Build a building the first time it is needed, and set it on its lot. */
  const realise = (o) => {
    const b = o.make(); o.obj = b.obj; o.fw = b.fw; o.fd = b.fd; o.noGrow = b.noGrow; [o.x, o.z] = o.place(o);
    o.obj.rotation.y = o.ry; o.obj.position.set(o.x, world.heightAt(o.x, o.z) - 0.05, o.z); built++;
  };
  const free = () => {
    const idle = occ.filter((o) => o.obj && !o.in).sort((a, b) => a.seen - b.seen);
    for (const o of idle.slice(0, built - KEEP)) { o.obj.traverse((m) => m.geometry && m.geometry.dispose()); o.obj = null; built--; }
  };
  let lastV = -1, lastU = -9, built = 0, stamp = 0, last = 0, wait = [];
  return {
    update(u, t) {
      world.deck = u >= uBridge[0] && u < uBridge[1] ? deck : null;   // while it stands, the bridge can be walked and driven over
      const moved = world.shapeVersion !== lastV, now = performance.now(), frame = now - last; lastV = world.shapeVersion; last = now;
      if (u !== lastU || moved) {
        lastU = u; stamp++; wait = [];
        for (const o of occ) {
          const vis = u >= o.u0 && u < o.u1;
          if (vis && !o.obj) { wait.push(o); continue; }
          if (vis !== o.in) { o.in = vis; vis ? group.add(o.obj) : group.remove(o.obj); }
          if (!vis) continue;
          o.seen = stamp;
          if (moved) o.obj.position.y = world.heightAt(o.x, o.z) - 0.05;
          if (!o.noGrow) o.obj.scale.y = Math.max(0.02, smooth((u - o.u0) / GROW));
        }
        for (const p of props) {
          const vis = u >= p.u0 && u < p.u1;
          if (vis !== p.in) { p.in = vis; vis ? group.add(p.obj) : group.remove(p.obj); if (vis && p.ground) conform(p.obj, world.hill); }
          if (moved && p.ground) { p.obj.position.y = world.heightAt(p.x, p.z) + (p.obj.userData.lift || 0); if (vis) conform(p.obj, world.hill); }
        }
        streetMat.color.copy(dirt).lerp(asphalt, smooth((u - u1811) / (u1925 - u1811)));
        for (const s of furniture) s.update(u);
      }
      // buildings not yet made are built a few per frame, so dragging through the centuries stays smooth
      if (wait.length) {
        const budget = clamp(frame * 0.3, 8, 400);
        for (let n = 0; wait.length && (n < 4 || performance.now() - now < budget); n++) {
          const o = wait.pop(); realise(o); o.in = true; o.seen = stamp; group.add(o.obj);
          if (!o.noGrow) o.obj.scale.y = Math.max(0.02, smooth((u - o.u0) / GROW));
        }
        if (built > KEEP + 60) free();
      }
      for (const p of props) if (p.in && p.tick) p.tick(t);
      setNight(world.night);      // windows and street lamps come on as the light fails
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
