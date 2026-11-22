// Instanced things that travel along the street grid (people, carts, cars) or through the air and rivers.
import * as THREE from 'three';
import { yearToU } from './timeline.js?v=740e009b';
import { LAND, ISLAND } from './world.js?v=740e009b';

const H = Math.PI / 2;
/** Streets that cross the island stop this far from its centre line. */
export const CROSS_SPAN = ISLAND - 6;
// =====================================================================================
// Things that move in straight lanes
// =====================================================================================
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), _sphere = new THREE.Sphere();
const TURN = 5;            // metres from the end of a cross street over which a traveller turns round
const SHADOW_REACH = 70;   // travellers this close stay drawn even when behind the camera, so their shadows do not vanish
export class Movers {
  /** items: { lane, alt, off, v (signed), axis 'z'|'x', u0, u1, tint, legs?, skin?, s } */
  /** opts.sidewalk: these walk on the raised sidewalks, so they only stop when the water tops the curb. */
  constructor(world, parts, items, { span = 480, crossSpan = 0, ground = true, bob = 0, sidewalk = false, foot } = {}) {
    this.world = world; this.items = items; this.span = span; this.crossSpan = crossSpan || span; this.ground = ground; this.bob = bob; this.floodAt = sidewalk ? LAND + 0.16 : LAND - 0.25;
    this.reach = 0; this.colors = [];
    this.meshes = parts.map(({ geo, mat, tint = true, tintKey = 'tint', cast = true }) => {
      const m = new THREE.InstancedMesh(geo, mat, items.length); m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true;
      items.forEach((it, i) => m.setColorAt(i, tint ? _c.setRGB(...(it[tintKey] || it.tint)) : _c.setRGB(1, 1, 1)));
      this.colors.push(m.instanceColor.array.slice());   // per-traveller colours, re-packed each frame with the visible ones
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      this.reach = Math.max(this.reach, geo.boundingSphere.radius + geo.boundingSphere.center.length());
      return m;
    });
    this.reach *= Math.max(1, ...items.map((i) => i.s || 1));
    this.foot = foot === undefined ? this.reach < 2.6 : foot;   // people on foot take the bridge's boardwalk, wheels its roadway
    for (let k = 1; k < this.meshes.length; k++) this.meshes[k].instanceMatrix = this.meshes[0].instanceMatrix;
    this.minU = Math.min(...items.map((i) => i.u0)); this.maxU = Math.max(...items.map((i) => i.u1));
  }
  /**
   * Where a traveller is at time t: { x, y, z, yaw, run } (run = metres travelled, for gaits). Avenues run on past the
   * horizon, so travellers there simply come round again; cross streets end at the waterfront, where they turn back.
   */
  where(it, t) {
    const w = this.world, o = this._at || (this._at = {});
    let x, z;
    if (it.axis === 'z' || this.crossSpan === this.span) {
      const span = this.span, L = span * 2, along = ((((it.off + it.v * t) % L) + L) % L) - span;
      x = it.axis === 'z' ? it.lane : along; z = it.axis === 'z' ? along : it.lane;
      o.yaw = it.axis === 'z' ? (it.v > 0 ? -H : H) : (it.v > 0 ? 0 : Math.PI); o.run = along;
    } else {
      // back and forth between the two ends of the street; the street with the bridge on it carries on over the river
      const street = Math.round(it.lane / 60) * 60, deck = this.ground && w.deck && w.deck.z === street ? w.deck : null;
      const lo = -this.crossSpan, hi = deck ? deck.end - 8 : this.crossSpan, L = hi - lo;
      const q = (((it.off + Math.abs(it.v) * t + (it.v < 0 ? L : 0)) % (2 * L)) + 2 * L) % (2 * L), out = q < L, pos = out ? lo + q : hi - (q - L), dir = out ? 1 : -1;
      // swing across the street and round through 180° over the last few metres
      let side = (it.lane - street) * dir;
      if (deck && pos > deck.x0 - 14) side = Math.sign(side || 1) * (Math.abs(side) + ((this.foot ? deck.walk : deck.road) - Math.abs(side)) * Math.min(1, (pos - deck.x0 + 14) / 14));
      const e = Math.min(1, Math.min(pos - lo, hi - pos) / TURN), nearEnd = dir > 0 ? hi - pos < pos - lo : pos - lo < hi - pos;
      x = pos; z = street + side * e;
      o.yaw = (dir > 0 ? 0 : Math.PI) + (1 - e) * H * (nearEnd ? 1 : -1) * Math.sign(side || 1) * -dir;
      o.run = q;
      const dy = deck ? deck.yAt(x, z - street) : null;
      if (dy !== null) { o.x = x; o.z = z; o.y = Math.max(dy, w.heightAt(x, z)) + it.alt; if (this.bob) o.y += Math.abs(Math.cos(o.run * 2.6)) * this.bob; return o; }
    }
    o.x = x; o.z = z; o.y = this.ground ? Math.max(w.heightAt(x, z), w.sea - 0.15) + it.alt : it.alt;
    if (this.bob) o.y += Math.abs(Math.cos(o.run * 2.6)) * this.bob;
    return o;
  }
  /** view = { frustum, eye }: only travellers in sight (or near enough to cast a shadow into it) are sent to the GPU. */
  update(u, t, view) {
    const on = !(u < this.minU || u > this.maxU);
    for (const m of this.meshes) m.visible = on;
    this.np = 0; if (!on) return;
    const w = this.world, first = this.meshes[0], flooded = this.ground && w.sea > this.floodAt;   // nothing drives or walks through a flooded street
    let k = 0; const rec = this.sound && (this.pts || (this.pts = new Float32Array(this.items.length * 3))); this.np = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (flooded || u < it.u0 || u >= it.u1) continue;
      const at = this.where(it, t), x = at.x, y = at.y, z = at.z;
      if (rec) { rec[this.np * 3] = x; rec[this.np * 3 + 1] = y + 1.2; rec[this.np * 3 + 2] = z; this.np++; }   // where its sounds come from
      _p.set(x, y, z);
      if (view) {
        _sphere.center.set(x, y + this.reach * 0.5, z); _sphere.radius = this.reach * 1.3 + 1;
        const dx = x - view.eye.x, dz = z - view.eye.z;
        if (dx * dx + dz * dz > SHADOW_REACH * SHADOW_REACH && !view.frustum.intersectsSphere(_sphere)) continue;
      }
      _q.setFromAxisAngle(UP, at.yaw);
      first.setMatrixAt(k, _m.compose(_p, _q, _s.setScalar(it.s || 1)));
      for (let m = 0; m < this.meshes.length; m++) { const a = this.meshes[m].instanceColor.array, c = this.colors[m]; a[k * 3] = c[i * 3]; a[k * 3 + 1] = c[i * 3 + 1]; a[k * 3 + 2] = c[i * 3 + 2]; }
      k++;
    }
    for (const m of this.meshes) { m.count = k; m.visible = k > 0; m.instanceColor.needsUpdate = true; }
    first.instanceMatrix.needsUpdate = true;
  }
}


/** Helpers for laying out traffic: `lanes` places n travellers on the avenue / cross-street grid. */
export function traffic(r) {
  const Y = yearToU;
  const SKINS = [[0.96, 0.78, 0.66], [0.88, 0.68, 0.54], [0.74, 0.54, 0.4], [0.55, 0.38, 0.27], [0.4, 0.27, 0.19], [0.94, 0.8, 0.7]].map((c) => c.map((v) => v ** 2.2));   // linear
  const lanes = (n, from, to, { jf = 0, jt = 0, v = [8, 14], off = 4, alt = 0, tint, legs, cross = 0.3, s } = {}) => {
    const items = [];
    for (let i = 0; i < n; i++) {
      const dir = r() < 0.5 ? -1 : 1, axis = r() < cross ? 'x' : 'z';
      const base = axis === 'z' ? Math.round(r() * 4 - 2) * 100 : Math.round(r() * 14 - 7) * 60;
      const o = typeof off === 'function' ? off(axis) : off;
      items.push({ lane: base + dir * o * (axis === 'z' ? -1 : 1), alt: typeof alt === 'function' ? alt() : alt, off: r() * 960, v: dir * (v[0] + r() * (v[1] - v[0])), axis, u0: Y(from + (i / n) * jf), u1: Y(to + r() * jt),
        tint: tint ? tint() : [1, 1, 1], legs: legs ? legs() : undefined, skin: SKINS[Math.floor(r() * SKINS.length)], s: typeof s === 'function' ? s() : s });
    }
    return items;
  };
  const cloth = (pal) => () => { const c = new THREE.Color(pal[Math.floor(r() * pal.length)]); return [c.r, c.g, c.b]; };
  return { lanes, cloth, SKINS };
}
