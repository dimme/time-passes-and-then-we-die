import * as THREE from 'three';
import { rng, smooth, box, cyl, cone, ball, merge, vcMat } from './util.js';
import { yearToU } from './timeline.js';

const FADE = 0.003;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

/** A field of instanced things, each alive for its own span of time. */
export class Scatter {
  constructor(world, geo, items, mat = vcMat()) {
    this.world = world; this.items = items;
    this.mesh = new THREE.InstancedMesh(geo, mat, items.length);
    this.mesh.frustumCulled = false; this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.minU = Infinity; this.maxU = -Infinity;
    items.forEach((it, i) => {
      this.minU = Math.min(this.minU, it.u0); this.maxU = Math.max(this.maxU, it.u1);
      this.mesh.setColorAt(i, _c.setRGB(it.tint[0], it.tint[1], it.tint[2]));
    });
    this.lastU = -9; this.lastV = -1;
  }
  update(u) {
    if (u < this.minU - FADE || u > this.maxU + FADE) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    if (u === this.lastU && this.world.shapeVersion === this.lastV) return;
    this.lastU = u; this.lastV = this.world.shapeVersion;
    const w = this.world;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const f = it.s * smooth((u - it.u0) / FADE + (it.u0 <= 0 ? 1 : 0)) * smooth((it.u1 - u) / FADE + (it.u1 >= 1 ? 1 : 0));
      if (f <= 0.001) { _m.makeScale(0, 0, 0); }
      else {
        _p.set(it.x, w.heightAt(it.x, it.z) - 0.1, it.z); _q.setFromAxisAngle(UP, it.rot);
        _m.compose(_p, _q, _s.set(it.sx ? it.sx * f : f, it.sy ? it.sy * f : f, it.sx ? it.sx * f : f));
      }
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------- plant & rock geometry ----------
function fronds(trunkH, trunkR, leafLen, n, leafCol, trunkCol = 0x5a4630) {
  const parts = [cyl(trunkR * 0.8, trunkR, trunkH, trunkCol, 0, trunkH / 2, 0)];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = leafLen * 0.45;
    parts.push(box(leafLen, 0.12, leafLen * 0.28, leafCol, Math.cos(a) * r, trunkH + 0.1 - leafLen * 0.12, -Math.sin(a) * r, 0, a, -0.35));
  }
  parts.push(ball(trunkR * 1.5, leafCol, 0, trunkH, 0));
  return merge(parts);
}
export const GEO = {
  broadleaf: merge([cyl(0.35, 0.55, 6, 0x4a3524, 0, 3, 0), ball(4, 0x3f7a2a, 0, 8.5, 0, 1, 0.8, 1), ball(2.8, 0x4a8a30, 1.8, 10.5, 1, 1, 0.8, 1), ball(2.6, 0x356a26, -1.6, 7.6, -1.2)]),
  conifer: merge([cyl(0.3, 0.45, 4, 0x4a3524, 0, 2, 0), cone(3.2, 6, 0x2a5a30, 0, 6, 0, 7), cone(2.4, 5, 0x2f6434, 0, 9.5, 0, 7), cone(1.5, 4, 0x356e3a, 0, 12.5, 0, 7)]),
  spruce: merge([cyl(0.2, 0.3, 3, 0x3a2a1c, 0, 1.5, 0), cone(1.7, 5, 0x24483a, 0, 4.5, 0, 6), cone(1.2, 4, 0x284e3e, 0, 7.5, 0, 6), cone(0.7, 3, 0x2c5644, 0, 10, 0, 6)]),
  cycad: fronds(2.2, 0.55, 3.6, 8, 0x3a7a2a),
  treefern: fronds(7, 0.35, 4.6, 9, 0x4a8a34, 0x3a2a1c),
  palm: fronds(10, 0.3, 4.2, 7, 0x4f9438, 0x7a6448),
  araucaria: merge([cyl(0.45, 0.8, 18, 0x4a3828, 0, 9, 0), cone(5, 2, 0x26502a, 0, 15, 0, 8), cone(4, 2, 0x2a5a2e, 0, 17, 0, 8), cone(2.6, 2.4, 0x2e6432, 0, 19, 0, 8)]),
  dead: merge([cyl(0.2, 0.45, 9, 0x2a2420, 0, 4.5, 0), cyl(0.08, 0.16, 4, 0x2a2420, 1.2, 7, 0, 5, 0, 0, -0.8), cyl(0.08, 0.16, 3.4, 0x2a2420, -1, 5.6, 0.4, 5, 0.3, 0, 0.9), cyl(0.06, 0.12, 3, 0x2a2420, 0.2, 8.4, -0.9, 5, -0.7, 0, 0.2)]),
  rock: merge([ball(1, 0x8a8a86, 0, 0.5, 0, 1.4, 0.8, 1.1), ball(0.6, 0x7a7a78, 1.1, 0.25, 0.5)]),
  shrub: merge([ball(0.9, 0x6a7a3a, 0, 0.6, 0, 1, 0.7, 1), ball(0.7, 0x7a8440, 0.8, 0.45, 0.3), ball(0.6, 0x5f6e34, -0.5, 0.4, -0.6)]),
  lowrise: box(1, 1, 1, 0xffffff, 0, 0.5, 0),
};

export function buildFlora(world, scene) {
  const r = rng(1234);
  const Y = yearToU;
  const sets = [];
  const island = () => [(r() * 2 - 1) * 222, (r() * 2 - 1) * 620];
  const shore = () => [(r() < 0.5 ? -1 : 1) * (585 + r() * 330) - (r() < 0.2 ? 60 : 0), (r() * 2 - 1) * 900];
  const green = () => { const g = 0.75 + r() * 0.5; return [g * (0.85 + r() * 0.3), g, g * (0.8 + r() * 0.3)]; };
  const grey = () => { const g = 0.7 + r() * 0.5; return [g, g, g]; };

  /** add n instances; span(x,z) returns [yearFrom, yearTo] */
  function add(geo, n, place, span, size = [0.7, 1.5], tint = green, extra) {
    const items = [];
    for (let i = 0; i < n; i++) {
      const [x, z] = place();
      const [a, b] = span(x, z);
      const it = { x, z, s: size[0] + r() * (size[1] - size[0]), rot: r() * 6.28, u0: a <= -235e6 ? -1 : Y(a), u1: Y(b), tint: tint() };
      if (extra) extra(it);
      items.push(it);
    }
    const s = new Scatter(world, geo, items); sets.push(s); scene.add(s.mesh);
  }
  const both = (n) => (i) => (r() < 0.82 ? island() : shore());
  const span = (a, b, ja = 0, jb = 0) => () => [a + r() * ja, b + r() * jb];

  // Mesozoic
  add(GEO.cycad, 500, both(), span(-236e6, -66.03e6, 0, 1e4), [0.6, 1.6]);
  add(GEO.treefern, 380, both(), span(-236e6, -66.03e6, 0, 1e4));
  add(GEO.araucaria, 380, both(), span(-236e6, -66.03e6, 0, 1e4), [0.7, 1.7]);
  add(GEO.conifer, 250, both(), span(-190e6, -66.03e6, 20e6, 1e4), [0.8, 1.8]);
  // ash and stumps after the impact
  add(GEO.dead, 400, both(), span(-66.025e6, -65.9e6, 5e3, 5e4), [0.6, 1.4], grey);
  add(GEO.cycad, 300, both(), span(-65.95e6, -60e6, 3e4, 20e6), [0.3, 0.7]);
  // Cenozoic
  add(GEO.palm, 350, both(), span(-65.5e6, -36e6, 8e6, 4e6));
  add(GEO.broadleaf, 800, both(), span(-64e6, -1.5e6, 12e6, 1e6), [0.8, 2]);
  add(GEO.conifer, 300, both(), span(-40e6, -1.2e6, 5e6, 6e5), [0.8, 1.7]);
  // warm pause between glaciations
  add(GEO.broadleaf, 500, both(), span(-152e3, -95e3, 4e3, 20e3));
  // tundra & thaw
  add(GEO.spruce, 250, both(), span(-128e3, -34e3, 8e3, 6e3), [0.6, 1.3]);
  add(GEO.shrub, 300, both(), span(-100e3, -30e3, 20e3, 3e3), [0.6, 1.4]);
  add(GEO.rock, 160, both(), span(-17e3, 1700, 800, 111), [0.8, 3.5], grey);
  add(GEO.shrub, 300, both(), span(-16e3, -9000, 1000, 2000), [0.6, 1.4]);
  add(GEO.spruce, 450, both(), span(-14.5e3, -7000, 3000, 2500), [0.7, 1.5]);
  // Mannahatta: cleared outward from the tip of the island as the town grows
  const clear = (x, z) => Math.abs(x) > 300 ? 1840 + r() * 40 : Math.min(1845, 1626 + Math.hypot(x, z - 40) * 0.5 + r() * 30);
  add(GEO.broadleaf, 1500, both(), (x, z) => [-9500 + r() * 3500, clear(x, z)], [0.8, 2.1]);
  add(GEO.conifer, 400, both(), (x, z) => [-9000 + r() * 3000, clear(x, z)], [0.8, 1.6]);
  // street trees
  add(GEO.broadleaf, 260, () => [Math.round(r() * 4 - 2) * 100 + (r() < 0.5 ? -11.5 : 11.5), Math.round((r() * 2 - 1) * 40) * 12 + 6], span(1860, 2140, 120, 60), [0.4, 0.75]);
  // far-shore city
  const cityTint = () => { const g = 0.45 + r() * 0.35; return [g * (1 + r() * 0.15), g, g * (0.9 + r() * 0.2)]; };
  add(GEO.lowrise, 420, shore, span(1700, 2930, 220, 60), [1, 1], cityTint, (it) => { it.rot = 0; it.sx = 12 + r() * 22; it.sy = 8 + r() * 22; });
  add(GEO.lowrise, 160, shore, span(1930, 2920, 150, 60), [1, 1], cityTint, (it) => { it.rot = 0; it.sx = 18 + r() * 16; it.sy = 50 + r() * 150; });
  add(GEO.lowrise, 90, shore, span(2180, 2900, 200, 60), [1, 1], () => [0.16, 0.14, 0.22], (it) => { it.rot = 0; it.sx = 30 + r() * 30; it.sy = 250 + r() * 500; });
  // gardens of the star age, then the forest that takes it all back
  add(GEO.broadleaf, 1400, both(), span(2940, 150e6, 500, 90e6), [0.7, 2]);
  add(GEO.conifer, 350, both(), span(9000, 120e6, 20000, 90e6), [0.8, 1.7]);
  // the long drying
  add(GEO.rock, 300, both(), span(120e6, 7.6e9, 100e6, 0), [0.6, 2.6], () => { const g = 0.8 + r() * 0.4; return [g * 1.25, g * 0.95, g * 0.8]; });
  add(GEO.shrub, 400, both(), span(280e6, 560e6, 60e6, 80e6), [0.6, 1.5]);
  add(GEO.palm, 120, both(), span(300e6, 540e6, 40e6, 60e6), [0.5, 0.9]);
  add(GEO.dead, 350, both(), span(520e6, 1.0e9, 100e6, 150e6), [0.5, 1.3], grey);

  return { update(u) { for (const s of sets) s.update(u); } };
}
