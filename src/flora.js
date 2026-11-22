import * as THREE from 'three';
import { rng, smooth, box, vcMat } from './util.js?v=740e009b';
import { yearToU } from './timeline.js?v=740e009b';
import { shared } from './textures.js?v=740e009b';
import { windTime, leafMat, floraTextures } from './flora-tex.js?v=740e009b';
import { Builder, norm, tube, arc, ribbon, kite, grow, foliage, boulder } from './flora-geo.js?v=740e009b';

const FADE = 0.003;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const GRASS_U = yearToU(-56e6);

// ---------- instanced fields ----------
// A field is split into square cells so that whatever is behind the camera, or outside the sun's shadow
// box, is not drawn at all; distant cells draw foliage with fewer leaf cards. Nothing is ever left out.
const PER_CELL = 5;    // sparse fields get bigger cells, so culling never costs more draw calls than it saves
const LOD = [[140, 1], [300, 0.62], [Infinity, 0.38]];   // [cell distance up to (m), fraction of leaf triangles drawn]
const lodCache = new WeakMap();
/** Versions of a foliage geometry that share its buffers but draw only a prefix of its (shuffled) triangles. */
function lodsOf(geo) {
  let l = lodCache.get(geo); if (l) return l;
  const n = geo.index ? geo.index.count : geo.attributes.position.count, src = geo.index ? geo.index.array : null;
  // shuffle in pairs of triangles (most leaf cards are two) so any prefix thins the crown evenly
  const pairs = Math.floor(n / 6), order = Array.from({ length: pairs }, (_, k) => k), r = rng(n + 17);
  for (let k = pairs - 1; k > 0; k--) { const q = Math.floor(r() * (k + 1)); [order[k], order[q]] = [order[q], order[k]]; }
  const idx = new Uint32Array(n);
  order.forEach((from, to) => { for (let v = 0; v < 6; v++) idx[to * 6 + v] = src ? src[from * 6 + v] : from * 6 + v; });
  for (let v = pairs * 6; v < n; v++) idx[v] = src ? src[v] : v;
  const index = new THREE.BufferAttribute(idx, 1);
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  l = LOD.map(([, f]) => {
    const g = new THREE.BufferGeometry();
    for (const name in geo.attributes) g.setAttribute(name, geo.attributes[name]);
    g.setIndex(index); g.setDrawRange(0, Math.floor((n * f) / 6) * 6); g.boundingSphere = geo.boundingSphere;
    return g;
  });
  lodCache.set(geo, l); return l;
}

/** A field of instanced things, each alive for its own span of time. `parts` share one set of transforms. */
export class Scatter {
  constructor(world, parts, items) {
    this.world = world; this.items = items;
    // reach of one instance from its own origin, for the cells' culling spheres
    let reach = 0;
    for (const { geo } of parts) { if (!geo.boundingSphere) geo.computeBoundingSphere(); reach = Math.max(reach, geo.boundingSphere.radius + geo.boundingSphere.center.length()); }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const it of items) { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x); z0 = Math.min(z0, it.z); z1 = Math.max(z1, it.z); }
    const size = Math.min(260, Math.max(110, Math.sqrt(((x1 - x0 + 1) * (z1 - z0 + 1) * PER_CELL) / Math.max(1, items.length))));
    const half = this.half = size * Math.SQRT1_2, byCell = new Map();
    for (const it of items) {
      const cx = Math.floor(it.x / size), cz = Math.floor(it.z / size), key = cx + ':' + cz;
      let c = byCell.get(key); if (!c) byCell.set(key, c = { x: (cx + 0.5) * size, z: (cz + 0.5) * size, items: [], big: 0 });
      c.items.push(it); c.big = Math.max(c.big, it.s * Math.max(1, it.sx || 1, it.sy || 1));
    }
    this.cells = [...byCell.values()]; this.meshes = [];
    for (const c of this.cells) {
      const sphere = new THREE.Sphere(new THREE.Vector3(c.x, 0, c.z), half + reach * c.big + 20);
      c.lod = 0;
      c.meshes = parts.map(({ geo, mat, tint = true, cast = true }) => {
        const lods = mat.alphaTest > 0 ? lodsOf(geo) : null;
        const m = new THREE.InstancedMesh(lods ? lods[0] : geo, mat, c.items.length);
        m.boundingSphere = sphere; m.castShadow = cast; m.receiveShadow = true; m.userData.lods = lods;
        c.items.forEach((it, i) => m.setColorAt(i, tint ? _c.setRGB(it.tint[0], it.tint[1], it.tint[2]) : _c.setRGB(1, 1, 1)));
        return m;
      });
      for (let k = 1; k < c.meshes.length; k++) c.meshes[k].instanceMatrix = c.meshes[0].instanceMatrix;
      this.meshes.push(...c.meshes);
    }
    this.minU = Infinity; this.maxU = -Infinity;
    for (const it of items) { this.minU = Math.min(this.minU, it.u0); this.maxU = Math.max(this.maxU, it.u1); }
    this.lastU = -9; this.lastV = -1; this.on = true;
  }
  /** camera is optional: with it, distant cells switch to lighter foliage. */
  update(u, camera) {
    const on = !(u < this.minU - FADE || u > this.maxU + FADE);
    if (!on) { if (this.on) { this.on = false; for (const m of this.meshes) m.visible = false; } return; }
    const w = this.world, refresh = !this.on || u !== this.lastU || w.shapeVersion !== this.lastV;
    this.on = true; this.lastU = u; this.lastV = w.shapeVersion;
    for (const c of this.cells) {
      if (refresh) {
        const first = c.meshes[0]; let alive = 0;
        for (let i = 0; i < c.items.length; i++) {
          const it = c.items[i];
          const f = it.s * smooth((u - it.u0) / FADE + (it.u0 <= 0 ? 1 : 0)) * smooth((it.u1 - u) / FADE + (it.u1 >= 1 ? 1 : 0));
          if (f <= 0.001) { _m.makeScale(0, 0, 0); }
          else {
            alive++;
            _p.set(it.x, w.heightAt(it.x, it.z) - 0.1, it.z); _q.setFromAxisAngle(UP, it.rot);
            _m.compose(_p, _q, _s.set(it.sx ? it.sx * f : f, it.sy ? it.sy * f : f, it.sx ? it.sx * f : f));
          }
          first.setMatrixAt(i, _m);
        }
        first.instanceMatrix.needsUpdate = true;
        for (const m of c.meshes) m.visible = alive > 0;
      }
      if (camera) {
        const d = Math.hypot(camera.position.x - c.x, camera.position.z - c.z) - this.half;
        const lod = d < LOD[0][0] ? 0 : d < LOD[1][0] ? 1 : 2;
        if (lod !== c.lod) { c.lod = lod; for (const m of c.meshes) if (m.userData.lods) m.geometry = m.userData.lods[lod]; }
      }
    }
  }
}

// ---------- the plants ----------
const B4 = [[0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5]];   // 2 × 2 atlas of leaf sprays
const CELL = { pine: [[0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]], spruce: [[0, 0, 0.5, 0.5]], araucaria: [[0.5, 0, 1, 0.5]], cycad: [0, 0.75, 1, 1], palm: [0, 0.5, 1, 0.75], fern: [0, 0.25, 1, 0.5], fiddle: [0, 0, 0.25, 0.25] };

// branching habits, one entry per level: trunk, limbs, branches, twigs (see grow())
const HABIT = {
  // white oak: short stout bole, heavy near-horizontal limbs, crown broader than tall
  oak: [
    { segs: 4, sides: 9, taper: 0.8, wob: 0.1, kids: 6, from: 0.5, ang: [0.9, 1.3], ratio: 1.45, rr: 0.6, lead: 1.0 },
    { segs: 4, sides: 5, taper: 0.45, wob: 0.3, up: 0.09, kids: 3, from: 0.3, ang: [0.6, 1.0], lift: 0.25, ratio: 0.66, rr: 0.6, lead: 0.6 },
    { segs: 3, sides: 3, taper: 0.4, wob: 0.35, up: 0.05, kids: 2, from: 0.3, ang: [0.5, 0.9], lift: 0.2, ratio: 0.6, rr: 0.6, lead: 0.6 },
    { segs: 1, sides: 0, taper: 0.3, wob: 0.6, tufts: 3 },
  ],
  // tulip tree: tall straight bole clear of branches, narrow crown of ascending limbs
  tulip: [
    { segs: 8, sides: 8, taper: 0.3, wob: 0.04, kids: 15, from: 0.4, ang: [0.85, 1.25], ratio: 0.3, fall: 0.7, rr: 0.45, lead: 0.07 },
    { segs: 4, sides: 4, taper: 0.35, wob: 0.25, up: 0.12, kids: 4, from: 0.2, ang: [0.5, 0.9], lift: 0.15, ratio: 0.5, rr: 0.6, lead: 0.5 },
    { segs: 1, sides: 0, taper: 0.3, wob: 0.6, tufts: 3 },
  ],
  // American elm: bole dividing into steep limbs that fan out like a vase and arch over, twigs drooping
  elm: [
    { segs: 4, sides: 8, taper: 0.8, wob: 0.06, kids: 5, from: 0.7, ang: [0.3, 0.55], ratio: 1.25, rr: 0.62, lead: 1.2 },
    { segs: 5, sides: 5, taper: 0.4, wob: 0.2, up: -0.045, kids: 4, from: 0.4, ang: [0.4, 0.7], ratio: 0.6, rr: 0.6, lead: 0.55 },
    { segs: 3, sides: 3, taper: 0.4, wob: 0.3, up: -0.12, kids: 2, from: 0.3, ang: [0.4, 0.8], ratio: 0.6, rr: 0.6, lead: 0.6 },
    { segs: 1, sides: 0, taper: 0.3, wob: 0.5, up: -0.3, tufts: 4 },
  ],
  dead: [
    { segs: 5, sides: 8, taper: 0.5, wob: 0.12, kids: 5, from: 0.4, ang: [0.6, 1.1], ratio: 0.5, fall: 0.4, rr: 0.5, lead: 0.3 },
    { segs: 3, sides: 4, taper: 0.4, wob: 0.4, up: 0.08, kids: 2, from: 0.3, ang: [0.5, 0.9], ratio: 0.55, rr: 0.6, lead: 0.5 },
    { segs: 2, sides: 3, taper: 0.1, wob: 0.5, tufts: 0 },
  ],
  snag: [
    { segs: 4, sides: 8, taper: 0.55, wob: 0.1, kids: 3, from: 0.45, ang: [0.7, 1.2], ratio: 0.3, rr: 0.4 },
    { segs: 2, sides: 4, taper: 0.1, wob: 0.5, tufts: 0 },
  ],
  bush: [
    { segs: 2, sides: 3, taper: 0.5, wob: 0.3, kids: 2, from: 0.4, ang: [0.4, 0.8], ratio: 0.6, rr: 0.7, lead: 0.5 },
    { segs: 1, sides: 0, taper: 0.3, wob: 0.5, tufts: 3 },
  ],
};

export function makeKinds() {
  const T = shared(), X = floraTextures(), K = {};
  const solid = (o) => new THREE.MeshStandardMaterial({ roughness: 0.95, ...o });
  const bark = solid({ map: T.barkMap, normalMap: T.barkNormal, color: 0x6a5140 }), greyBark = solid({ map: T.barkMap, normalMap: T.barkNormal, color: 0x7d756a });
  const armour = solid({ map: X.armour, color: 0xb8a48c }), fibre = solid({ map: X.armour, color: 0xa08468 }), palmBark = solid({ map: X.palm });
  const rockMat = solid({ map: X.rock, normalMap: T.rockNormal, normalScale: new THREE.Vector2(1.5, 1.5), vertexColors: true, roughness: 0.92 });
  const L = { oak: leafMat(X.oak), tulip: leafMat(X.tulip, { sway: 0.014 }), elm: leafMat(X.elm, { sway: 0.016 }), conifer: leafMat(X.conifer, { sway: 0.006 }), frond: leafMat(X.frond, { sway: 0.018 }) };
  const parts = (wood, woodMat, leaves, mat) => [{ geo: wood.build(), mat: woodMat, tint: false }, { geo: leaves.build(), mat }];

  /** Broadleaf tree: a branching skeleton with leaf sprays on its twigs; several individuals per species. */
  const tree = (name, n, S, len, rad, F, woodMat, mat) => ['', 'B', 'C'].slice(0, n).forEach((suffix, i) => {
    const r = rng(name.length * 97 + i * 31 + 5), wood = new Builder(), leaves = new Builder(), tips = [];
    grow(wood, tips, r, S, [0, -0.3, 0], norm((r() - 0.5) * 0.12, 1, (r() - 0.5) * 0.12), len * (0.85 + r() * 0.3), rad);
    if (F) foliage(leaves, tips, r, F);
    K[name + suffix] = F ? parts(wood, woodMat, leaves, mat) : [{ geo: wood.build(), mat: woodMat }];
  });
  tree('broadleaf', 3, HABIT.oak, 3.5, 0.5, { size: 2.9, wide: 0.95, droop: -0.1, spread: 0.9, cells: B4 }, bark, L.oak);
  tree('broadleaf2', 3, HABIT.tulip, 17, 0.4, { size: 2.7, wide: 0.95, droop: -0.05, spread: 0.9, cells: B4 }, greyBark, L.tulip);
  tree('elm', 3, HABIT.elm, 4.6, 0.42, { size: 2.7, wide: 0.9, droop: -0.45, spread: 0.9, cells: B4 }, greyBark, L.elm);
  tree('dead', 2, HABIT.dead, 9, 0.4, null, bark);
  tree('snag', 1, HABIT.snag, 5.5, 0.33, null, bark);

  /** Conifer: whorls of boughs up a single straight stem. */
  const conifer = (seed, P, woodMat = bark) => {
    const r = rng(seed), wood = new Builder(), leaves = new Builder(), h = P.h * (0.9 + r() * 0.2), y0 = h * P.clear;
    grow(wood, [], r, [{ segs: 8, sides: 8, taper: 0.1, tufts: 0 }], [0, -0.3, 0], [0, 1, 0], h + 0.3, P.rad);
    for (let k = 0; k < (P.stubs || 0); k++) { const A = arc([0, h * (0.14 + r() * (P.clear - 0.14)), 0], r() * 6.28, -0.1 + r() * 0.4, -0.2, 0.5 + r() * 1.1, 2); tube(wood, A.map((q) => q[0]), (i) => 0.035 - i * 0.012, 3); }   // dead lower branches
    for (let y = y0; y < h * 0.955; y += P.gap * (0.75 + r() * 0.5)) {
      const t = (y - y0) / (h - y0), n = P.n + ((r() * 2) | 0), a0 = r() * 6.28, dark = 0.7 + 0.28 * t;
      for (let k = 0; k < n; k++) {
        if (r() < P.miss) continue;
        const az = a0 + (k / n) * 6.283 + (r() - 0.5) * 0.5, len = P.spread * P.prof(t) * (0.7 + r() * 0.5), pitch = P.pitch[0] + (P.pitch[1] - P.pitch[0]) * t + (r() - 0.5) * 0.25;
        const A = arc([0, y, 0], az, pitch, P.bend[0] + (P.bend[1] - P.bend[0]) * t, len, P.segs, 1.5), look = { fold: P.fold, uv: P.cells[(r() * P.cells.length) | 0], col: [dark, dark, dark], shade: [0.62, 1.05], cut: P.cut, vol: [[0, y - len * 0.6, 0], 0.65] };
        if (P.woody) tube(wood, A.map((q) => q[0]), (i) => len * 0.013 * (1 - i / (P.segs + 0.4)) + 0.008, 3);
        ribbon(leaves, A, len * P.wide, { ...look, from: P.woody ? 1 : 0 });
        if (P.woody) for (const e of [-1, 1]) ribbon(leaves, arc(A[1][0], az + e * (0.55 + r() * 0.4), pitch + 0.1, 0.15, len * 0.6, 1), len * 0.5, look);   // side plumes
        if (P.cross) ribbon(leaves, A, len * P.wide * 0.22, { ...look, fold: 0, roll: 1.57, cut: null, uv: [look.uv[0], look.uv[1] * 0.65 + look.uv[3] * 0.35, look.uv[2], look.uv[1] * 0.35 + look.uv[3] * 0.65] });
      }
    }
    for (const az of [0, 1.57]) ribbon(leaves, arc([0, h * 0.9, 0], az, 1.5, 0, h * 0.1 + 0.35, 1), P.spread * 0.3, { uv: P.cells[0], cut: P.cut });   // the leader
    return parts(wood, woodMat, leaves, L.conifer);
  };
  // white pine: bare bole, tiers of level limbs with upswept plumes, ragged outline
  const pine = { h: 17, rad: 0.3, clear: 0.36, stubs: 6, gap: 1.0, n: 5, miss: 0.18, spread: 4.8, prof: (t) => 1 - 0.75 * t ** 1.5, pitch: [-0.08, 0.6], bend: [0.3, 0.2], segs: 3, wide: 0.7, fold: 0.3, cut: kite(0.5, 0.15), woody: true, cells: CELL.pine };
  // spruce: narrow spire, boughs sweeping down with hanging branchlets
  const spruce = { h: 13, rad: 0.2, clear: 0.08, gap: 0.5, n: 6, miss: 0.08, spread: 2.7, prof: (t) => (1 - 0.86 * t) * Math.min(1, 0.75 + t * 3), pitch: [-0.4, 0.35], bend: [0.5, 0.1], segs: 2, wide: 0.95, fold: -0.5, cut: kite(0.55, 0.1), cells: CELL.spruce };
  // araucaria (monkey puzzle): tall bare trunk, domed crown of whorled rope-like branches
  const araucaria = { h: 22, rad: 0.42, clear: 0.56, gap: 1.0, n: 7, miss: 0.05, spread: 5.2, prof: (t) => (1 - t ** 2.2) ** 0.5 * 0.85 + 0.15, pitch: [-0.5, 0.95], bend: [0.95, -0.25], segs: 3, wide: 0.8, fold: 0.2, cut: kite(0.8, 0.25), cross: true, cells: CELL.araucaria };
  K.conifer = conifer(21, pine); K.coniferB = conifer(22, { ...pine, h: 14, spread: 5.2, clear: 0.3 }); K.coniferC = conifer(23, { ...pine, h: 19, miss: 0.3 });
  K.spruce = conifer(31, spruce); K.spruceB = conifer(32, { ...spruce, h: 10.5, spread: 2.2 }); K.spruceC = conifer(33, { ...spruce, h: 15, spread: 2.9, miss: 0.2 });
  K.araucaria = conifer(41, araucaria, greyBark); K.araucariaB = conifer(42, { ...araucaria, h: 18, clear: 0.48, spread: 5.8 }, greyBark);

  /** Rosette of fronds on one unbranched stem: cycads, tree ferns, palms. Young fronds stand up in the middle, old ones hang. */
  const rosette = (seed, P, woodMat) => {
    const r = rng(seed), wood = new Builder(), leaves = new Builder(), tips = [];
    grow(wood, tips, r, [{ segs: P.segs, sides: 9, taper: P.taper, wob: P.wob, flare: P.flare, tufts: 1 }], [0, -0.25, 0], norm((r() - 0.5) * P.wob * 3, 1, (r() - 0.5) * P.wob * 3), P.h * (0.8 + r() * 0.4) + 0.25, P.rad);
    const top = tips[0][0], frondAt = (az, pitch, bend, len, o) => ribbon(leaves, arc([top[0] + Math.cos(az) * P.rad * 0.5, top[1] - 0.05, top[2] + Math.sin(az) * P.rad * 0.5], az, pitch, bend, len, P.fsegs, 1.3), len * P.wide, { fold: P.fold, uv: P.cell, shade: [0.7, 1.05], cut: kite(0.4, 0.15), ...o });
    for (let i = 0; i < P.n; i++) {
      const q = (i + 0.5) / P.n, lit = 1 - 0.3 * q;
      frondAt(i * 2.4 + r() * 0.5, P.pitch[0] + (P.pitch[1] - P.pitch[0]) * q ** 0.8 + (r() - 0.5) * 0.2, P.bend * (0.7 + r() * 0.6), P.len * Math.min(1, 0.5 + q * 2) * (0.85 + r() * 0.3), { col: [lit, lit, lit * 0.95] });
    }
    for (let i = 0; i < (P.dead || 0); i++) frondAt(i * 2.4 + r(), -0.9 - r() * 0.4, -0.5, P.len * (0.5 + r() * 0.3), { col: [1.5, 0.85, 0.45], fold: -0.5 });   // a skirt of dead brown fronds
    for (let i = 0; i < (P.fiddle || 0); i++) ribbon(leaves, arc(top, i * 2.1, 1.25 + r() * 0.3, 0, 0.6 + r() * 0.5, 1), 0.7, { uv: CELL.fiddle, tall: true, roll: r() * 3 });
    return parts(wood, woodMat, leaves, L.frond);
  };
  const cycad = { h: 1.3, rad: 0.36, flare: 0.25, segs: 3, taper: 0.85, wob: 0, n: 26, len: 2.5, wide: 0.42, pitch: [1.3, 0.1], bend: -0.75, fold: 0.45, fsegs: 4, cell: CELL.cycad };
  const treefern = { h: 5.5, rad: 0.17, segs: 5, taper: 0.75, wob: 0.05, n: 15, len: 3.7, wide: 0.36, pitch: [1.2, 0.3], bend: -1.7, fold: 0.15, fsegs: 6, dead: 6, fiddle: 3, cell: CELL.fern };
  const palm = { h: 10, rad: 0.2, segs: 6, taper: 0.8, wob: 0.07, n: 24, len: 4.3, wide: 0.42, pitch: [1.3, -0.5], bend: -1.3, fold: -0.4, fsegs: 6, cell: CELL.palm };
  K.cycad = rosette(51, cycad, armour); K.cycadB = rosette(52, { ...cycad, h: 2.2, n: 20, len: 2.1 }, armour);
  K.treefern = rosette(53, treefern, fibre); K.treefernB = rosette(54, { ...treefern, h: 3.6, n: 12 }, fibre);
  K.palm = rosette(55, palm, palmBark); K.palmB = rosette(56, { ...palm, h: 7.5, n: 17 }, palmBark);

  /** Shrub: several woody stems from the ground, leafy at the tips. */
  const bush = (seed, stems, len, splay, size) => {
    const r = rng(seed), wood = new Builder(), leaves = new Builder(), tips = [];
    for (let i = 0; i < stems; i++) { const az = i * 2.4 + r(); grow(wood, tips, r, HABIT.bush, [Math.cos(az) * 0.12, -0.1, Math.sin(az) * 0.12], norm(Math.cos(az) * splay, 1, Math.sin(az) * splay), len * (0.7 + r() * 0.6), 0.035); }
    foliage(leaves, tips, r, { size, wide: 0.95, droop: 0, spread: 0.8, cells: B4 });
    return parts(wood, bark, leaves, L.elm);
  };
  K.shrub = bush(71, 6, 0.8, 0.6, 1.0); K.shrubB = bush(72, 8, 0.4, 1.1, 0.7);

  // glacial erratic, frost-split slab, water-rounded boulder
  K.rock = [{ geo: boulder(rng(81)), mat: rockMat }];
  K.rockB = [{ geo: boulder(rng(82), { planes: 14, sx: 1.5, sy: 0.6, sz: 1.1, depth: 0.42, lump: 0.03 }), mat: rockMat }];
  K.rockC = [{ geo: boulder(rng(83), { planes: 5, sx: 1.1, sy: 0.85, sz: 1, depth: 0.15, lump: 0.07 }), mat: rockMat }];

  K.lowrise = [{ geo: box(1, 1, 1, 0xffffff, 0, 0.5, 0), mat: vcMat({ flatShading: false, roughness: 0.8 }) }];
  return K;
}

// ---------- ground cover: tufts that follow the player ----------
// atlas columns: 0 tall grass in seed, 1–2 turf, 3 meadow flowers, 4 herbs, 5 ferns, 6 horsetails, 7 low ferns
const COVER = { ferns: [5, 5, 5, 6, 6, 7, 7, 7, 5, 6], grass: [0, 1, 1, 1, 2, 2, 2, 3, 4, 1] };
class GroundCover {
  constructor(world, scene, tex) {
    this.world = world;
    const r = rng(31);
    this.mat = leafMat(tex, { sway: 0.09, fadeR: 46, cells: 8, ownColour: true });
    const b = new Builder(), up = [0, 1, 0];
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI, dx = Math.cos(a) * 0.45, dz = Math.sin(a) * 0.45; b.quad([[-dx, 0, -dz], up, 0, 0], [[dx, 0, dz], up, 1, 0], [[dx, 0.7, dz], up, 1, 1], [[-dx, 0.7, -dz], up, 0, 1]); }
    const N = this.N = 14000, R = this.R = 46, geo = b.build();
    this.cells = new THREE.InstancedBufferAttribute(new Float32Array(N), 1); geo.setAttribute('aCell', this.cells);
    this.mesh = new THREE.InstancedMesh(geo, this.mat, N); this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    this.off = new Float32Array(N * 2); this.rnd = new Float32Array(N); this.cell = new Int32Array(N * 2).fill(1e9);
    for (let i = 0; i < N; i++) { this.off[i * 2] = r() * R * 2; this.off[i * 2 + 1] = r() * R * 2; this.rnd[i] = r(); }
    this.lastV = -1; this.lastSea = 0; this.mix = null;
    scene.add(this.mesh);
  }
  update(u, env, camera) {
    const n = Math.floor(Math.min(1, env.grass) * this.N);
    this.mesh.visible = n > 0; if (!n) return;
    this.mesh.count = n;
    // grasses and flowering herbs only spread after the dinosaurs; before that the ground is ferns and horsetails
    const mix = u < GRASS_U ? COVER.ferns : COVER.grass;
    if (mix !== this.mix) { this.mix = mix; for (let i = 0; i < this.N; i++) this.cells.array[i] = mix[(((this.rnd[i] * 977) % 1) * 10) | 0]; this.cells.needsUpdate = true; }
    this.mat.color.setRGB(env.ground[0] * 0.95, env.ground[1] * 0.9, env.ground[2] * 0.85, THREE.SRGBColorSpace);
    const w = this.world, D = this.R * 2, cx = camera.position.x, cz = camera.position.z;
    const all = w.shapeVersion !== this.lastV || Math.abs(env.sea - this.lastSea) > 0.3; if (all) { this.lastV = w.shapeVersion; this.lastSea = env.sea; this.cell.fill(1e9); }   // tufts not in use right now must re-seat too, or they come back at their old height
    let dirty = false;
    for (let i = 0; i < n; i++) {
      const kx = Math.floor((cx + this.R - this.off[i * 2]) / D), kz = Math.floor((cz + this.R - this.off[i * 2 + 1]) / D);
      if (!all && kx === this.cell[i * 2] && kz === this.cell[i * 2 + 1]) continue;
      this.cell[i * 2] = kx; this.cell[i * 2 + 1] = kz; dirty = true;
      const x = this.off[i * 2] + kx * D, z = this.off[i * 2 + 1] + kz * D, y = w.heightAt(x, z), q = this.rnd[i];
      const s = Math.abs(x) > w.profile.bounds.x + 18 || y < env.sea + 0.25 ? 0 : 0.5 + q * 0.8;
      _m.compose(_p.set(x, y - 0.03, z), _q.setFromAxisAngle(UP, q * 6.283), _s.set(s, s * (0.6 + ((q * 7) % 1) * 0.8), s));
      this.mesh.setMatrixAt(i, _m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function buildFlora(world, scene) {
  const r = rng(1234);
  const Y = yearToU, K = makeKinds();
  const sets = [];
  const island = () => [(r() * 2 - 1) * 222, (r() * 2 - 1) * 620];
  const shore = () => [(r() < 0.5 ? -1 : 1) * (585 + r() * 330) - (r() < 0.2 ? 60 : 0), (r() * 2 - 1) * 900];
  const green = () => { const g = 0.7 + r() * 0.34; return [g * (0.82 + r() * 0.36), g, g * (0.72 + r() * 0.3)]; };
  // mostly green, with the odd tree turned yellow, russet or red
  const autumnal = () => { const g = 0.7 + r() * 0.34, q = r(); return q < 0.05 ? [g * 1.7, g * 1.15, g * 0.4] : q < 0.1 ? [g * 1.5, g * 0.8, g * 0.4] : q < 0.13 ? [g * 1.6, g * 0.55, g * 0.35] : [g * (0.82 + r() * 0.36), g, g * (0.72 + r() * 0.3)]; };
  const grey = () => { const g = 0.6 + r() * 0.5; return [g * (1 + r() * 0.06), g, g * (0.94 + r() * 0.06)]; };
  // each species is a few individuals, shared out evenly
  const OAK = ['broadleaf', 'broadleafB', 'broadleafC'], TULIP = ['broadleaf2', 'broadleaf2B', 'broadleaf2C'], ELM = ['elm', 'elmB', 'elmC'], PINE = ['conifer', 'coniferB', 'coniferC'], SPRUCE = ['spruce', 'spruceB', 'spruceC'];
  const CYCAD = ['cycad', 'cycadB'], FERN = ['treefern', 'treefernB'], ARAUCARIA = ['araucaria', 'araucariaB'], PALM = ['palm', 'palmB'], DEAD = ['dead', 'deadB', 'snag'], ROCK = ['rock', 'rockB', 'rockC'], SHRUB = ['shrub', 'shrubB'];

  /** add n instances shared among `kinds`; span(x,z) returns [yearFrom, yearTo] */
  function add(kinds, n, place, span, size = [0.7, 1.5], tint = green, extra) {
    for (const kind of [].concat(kinds)) {
      const items = [];
      for (let i = Math.round(n / [].concat(kinds).length); i > 0; i--) {
        const [x, z] = place();
        let [a, b] = span(x, z);
        if (Math.abs(x - 150) < 17 && Math.abs(z - 150) < 17 && a < 9600 && b > 2990) { if (a < 2990) b = 2990; else a = 9600; }   // the space elevator's plaza stays clear while it stands
        const it = { x, z, s: size[0] + r() * (size[1] - size[0]), rot: r() * 6.28, u0: Y(a), u1: Y(b), tint: tint() };
        if (extra) extra(it);
        items.push(it);
      }
      const s = new Scatter(world, K[kind], items); sets.push(s); scene.add(...s.meshes);
    }
  }
  const both = () => () => (r() < 0.82 ? island() : shore());
  const span = (a, b, ja = 0, jb = 0) => () => [a + r() * ja, b + r() * jb];

  // before the forests: bare rock, microbial mounds in the shallows, then moss and the first trees
  const basalt = () => { const g = 0.28 + r() * 0.25; return [g * 1.05, g, g * 0.95]; };
  add(ROCK, 420, both(), span(-4.38e9, -420e6, 0.15e9, 160e6), [0.6, 3], basalt);
  add(ROCK, 300, both(), span(-3.55e9, -560e6, 0.5e9, 20e6), [0.5, 1.4], () => { const g = 0.45 + r() * 0.3; return [g * 0.8, g, g * 0.6]; });   // stromatolites
  add(SHRUB, 600, both(), span(-468e6, -400e6, 30e6, 25e6), [0.12, 0.35]);            // moss and liverworts
  add(SHRUB, 400, both(), span(-425e6, -252.15e6, 25e6, 5e4), [0.4, 1.1]);
  add(FERN, 560, both(), span(-390e6, -296e6, 8e6, 40e6), [0.8, 2.2]);                // the first trees, then the coal swamps
  add(FERN, 240, both(), span(-388e6, -252.15e6, 8e6, 5e4), [0.8, 2]);
  add(ARAUCARIA, 300, both(), span(-318e6, -252.15e6, 16e6, 5e4), [0.6, 1.3]);        // early conifers
  add(CYCAD, 240, both(), span(-288e6, -252.15e6, 16e6, 5e4), [0.6, 1.4]);
  add(DEAD, 400, both(), span(-252.15e6, -249e6, 4e4, 2.5e6), [0.6, 1.4], () => { const g = 0.3 + r() * 0.3; return [g, g, g]; });
  // Mesozoic
  add(CYCAD, 480, both(), span(-249e6, -66.03e6, 10e6, 1e4), [0.7, 1.7]);
  add(FERN, 360, both(), span(-249e6, -66.03e6, 10e6, 1e4));
  add(ARAUCARIA, 360, both(), span(-249e6, -66.03e6, 10e6, 1e4), [0.7, 1.5]);
  add(PINE, 240, both(), span(-190e6, -66.03e6, 20e6, 1e4), [0.8, 1.6]);
  // ash and stumps after the impact
  add(DEAD, 400, both(), span(-66.025e6, -65.9e6, 5e3, 5e4), [0.6, 1.4], () => { const g = 0.25 + r() * 0.3; return [g, g, g]; });
  add(CYCAD, 300, both(), span(-65.95e6, -60e6, 3e4, 20e6), [0.3, 0.7]);
  // Cenozoic
  add(PALM, 330, both(), span(-65.5e6, -36e6, 8e6, 4e6));
  add(OAK, 300, both(), span(-64e6, -1.5e6, 12e6, 1e6), [0.8, 1.9]);
  add(TULIP, 260, both(), span(-64e6, -1.5e6, 12e6, 1e6), [0.7, 1.5]);
  add(ELM, 240, both(), span(-64e6, -1.5e6, 12e6, 1e6), [0.7, 1.6]);
  add(PINE, 280, both(), span(-40e6, -1.2e6, 5e6, 6e5), [0.8, 1.6]);
  // warm pause between glaciations
  add(OAK, 260, both(), span(-152e3, -95e3, 4e3, 20e3));
  add(ELM, 240, both(), span(-152e3, -95e3, 4e3, 20e3));
  // tundra & thaw
  add(SPRUCE, 250, both(), span(-128e3, -34e3, 8e3, 6e3), [0.6, 1.3]);
  add(SHRUB, 300, both(), span(-100e3, -30e3, 20e3, 3e3), [0.6, 1.4], autumnal);
  add(ROCK, 160, both(), span(-17e3, 1700, 800, 111), [0.6, 2.6], grey);
  add(SHRUB, 300, both(), span(-16e3, -9000, 1000, 2000), [0.6, 1.4], autumnal);
  add(SPRUCE, 450, both(), span(-14.5e3, -7000, 3000, 2500), [0.7, 1.5]);
  // Mannahatta: cleared outward from the tip of the island as the town grows
  const clear = (x, z) => (Math.abs(x) > 300 ? 1840 + r() * 40 : Math.min(1845, 1626 + Math.hypot(x, z - 40) * 0.5 + r() * 30));
  const wild = (from, jit) => (x, z) => [from + r() * jit, clear(x, z)];
  add(OAK, 540, both(), wild(-9500, 3500), [0.8, 2], autumnal);
  add(TULIP, 450, both(), wild(-9500, 3500), [0.7, 1.5], autumnal);
  add(ELM, 450, both(), wild(-9500, 3500), [0.7, 1.6], autumnal);
  add(PINE, 380, both(), wild(-9000, 3000), [0.8, 1.6]);
  add(SHRUB, 500, both(), wild(-9000, 3000), [0.6, 1.6]);
  // street trees: elms
  add(ELM, 260, () => [Math.round(r() * 4 - 2) * 100 + (r() < 0.5 ? -8.4 : 8.4), Math.round((r() * 2 - 1) * 40) * 12 + 6], span(1860, 2140, 120, 60), [0.38, 0.6]);
  // the park by the starting corner
  add(['broadleaf', 'broadleafB', 'elm'], 18, () => { for (;;) { const x = (r() - 0.5) * 70, z = (r() - 0.5) * 40; if (Math.abs(x) > 7 || Math.abs(z) > 7) return [-50 + x, 30 + z]; } }, span(1733, 2160, 20, 30), [0.6, 1]);
  // far-shore city
  const cityTint = () => { const g = 0.45 + r() * 0.35; return [g * (1 + r() * 0.15), g, g * (0.9 + r() * 0.2)]; };
  add('lowrise', 420, shore, span(1700, 2930, 220, 60), [1, 1], cityTint, (it) => { it.rot = 0; it.sx = 12 + r() * 22; it.sy = 8 + r() * 22; });
  add('lowrise', 160, shore, span(1930, 2920, 150, 60), [1, 1], cityTint, (it) => { it.rot = 0; it.sx = 18 + r() * 16; it.sy = 50 + r() * 150; });
  add('lowrise', 90, shore, span(2180, 2900, 200, 60), [1, 1], () => [0.16, 0.14, 0.22], (it) => { it.rot = 0; it.sx = 30 + r() * 30; it.sy = 250 + r() * 500; });
  // gardens of the star age, then the forest that takes it all back
  add(OAK, 500, both(), span(2940, 150e6, 500, 90e6), [0.7, 1.9]);
  add(TULIP, 430, both(), span(2940, 150e6, 500, 90e6), [0.7, 1.5]);
  add(ELM, 420, both(), span(2940, 150e6, 500, 90e6), [0.7, 1.6]);
  add(PINE, 330, both(), span(9000, 120e6, 20000, 90e6), [0.8, 1.6]);
  add(SHRUB, 400, both(), span(3000, 120e6, 3000, 90e6), [0.6, 1.6]);
  // the long drying
  add(ROCK, 300, both(), span(120e6, 7.6e9, 100e6, 0), [0.6, 2.6], () => { const g = 0.8 + r() * 0.4; return [g * 1.25, g * 0.95, g * 0.8]; });
  add(SHRUB, 400, both(), span(280e6, 560e6, 60e6, 80e6), [0.6, 1.5], () => { const g = 0.8 + r() * 0.3; return [g * 1.3, g * 1.1, g * 0.6]; });
  add(PALM, 120, both(), span(300e6, 540e6, 40e6, 60e6), [0.5, 0.9]);
  add(DEAD, 350, both(), span(520e6, 1.0e9, 100e6, 150e6), [0.5, 1.3], grey);

  const cover = new GroundCover(world, scene, floraTextures().cover);
  /** `plants` false: only the ground cover (used while another place is on screen). */
  return { cover, update(u, time, env, camera, plants = true) { windTime.value = time; if (plants) for (const s of sets) s.update(u, camera); cover.update(u, env, camera); } };
}
