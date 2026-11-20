// The long-horned cattle of the Nile: drawing the plough, treading out the grain, grazing. Built on the shared animal rig.
import * as THREE from 'three';
import { Rig, loft, mass, cone, slab, frustum, put, hide, hex, BLACK, HOOF, pose, TAU } from './animals-rig.js';

const tone = (base, target) => { const a = hex(base), b = hex(target); return b.map((v, i) => v / a[i]); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const ONE = [1, 1, 1];
function cloven(b, f, z, toe, a, ball) {
  for (const s of [1, -1]) {
    b.detail(frustum([toe[0] - a, 0, z + s * a * 0.55, a, a * 0.48], [toe[0] - a * 1.7, a * 1.5, z + s * a * 0.45, a * 0.62, a * 0.44, 0.45], 8), f, HOOF);
    b.detail(cone(a * 0.22, a * 0.7, ball[0] - a * 0.55, ball[1] - a * 0.3, z + s * a * 0.45, 2.5), f, HOOF);
  }
}

/** An ox, 1.4 m at the withers, with the tall lyre-shaped horns of Old Kingdom cattle. `pied`: white with black patches instead of red-brown. */
function ox(pied) {
  const b = new Rig(), T = 0.4, C = pied ? 0xd8d0c0 : 0x8a5a38, dark = tone(C, pied ? 0x1c1a18 : 0x4a3020), pale = tone(C, 0xe0d4bc);
  b.bone('body', null, 0, 0.82);
  const tail = b.run('tail', 'body', [[-0.56, 0.95], [-0.62, 0.75], [-0.63, 0.5], [-0.62, 0.28]]), neck = b.run('neck', 'body', [[0.4, 0.9], [0.58, 1.0], [0.72, 1.08]]);
  b.bone('head', neck[neck.length - 1], 0.72, 1.08, 0, [1.02, 0.86, 0]);
  const spine = b.path([...tail.slice().reverse(), 'body', ...neck, 'head'], 0.45);
  b.skin(loft([[-0.56, 0.88, 0, 0.1, 0.14, 0.11, 0.2], [-0.46, 0.86, 0, 0.2, 0.26, 0.2, 0.2], [-0.3, 0.84, 0, 0.22, 0.27, 0.24, 0.1], [-0.1, 0.82, 0, 0.21, 0.29, 0.26, 0], [0.1, 0.8, 0, 0.22, 0.3, 0.26, 0.1], [0.3, 0.79, 0, 0.27, 0.3, 0.24, 0.25], [0.42, 0.8, 0, 0.25, 0.28, 0.2, 0.3], [0.52, 0.82, 0, 0.16, 0.2, 0.13, 0.3]], { segs: 20, tile: T, capA: 0.7, capB: 0.7 }), spine);
  b.skin(loft([[0.36, 0.86, 0, 0.2, 0.25, 0.15], [0.5, 0.95, 0, 0.15, 0.2, 0.11], [0.63, 1.03, 0, 0.11, 0.15, 0.09], [0.72, 1.08, 0, 0.09, 0.11, 0.08]], { segs: 14, tile: T, capA: 0.5 }), spine);
  b.skin(loft([[0.68, 1.1, 0, 0.075, 0.08, 0.085], [0.77, 1.07, 0, 0.085, 0.1, 0.09], [0.87, 1.0, 0, 0.065, 0.085, 0.07], [0.96, 0.92, 0, 0.055, 0.07, 0.06], [1.02, 0.87, 0, 0.05, 0.055, 0.058]], { segs: 14, tile: T, capA: 0.8, capB: 0.7 }), 'head');
  b.skin(loft([[-0.55, 0.96, 0, 0.03, 0.03, 0.035], [-0.62, 0.75, 0, 0.02, 0.02, 0.02], [-0.63, 0.5, 0, 0.016, 0.016, 0.016], [-0.63, 0.36, 0, 0.032, 0.032, 0.032], [-0.62, 0.27, 0, 0.015, 0.015, 0.015]], { segs: 8, tile: T, capA: 0.5, capB: 1, ref: [1, 0, 0] }), spine, dark);
  const fore = { z: 0.13, J: [[0.44, 0.74], [0.33, 0.6], [0.345, 0.33], [0.35, 0.085]], toe: [0.4, 0], top: [-0.03, 0.1, -0.035, 0.09, 0.13, 0.06], R: [[0.09, 0.13, 0.07], [0.055, 0.07, 0.05], [0.036, 0.034, 0.034], [0.03, 0.033, 0.03]], M: [null, [0.25, 0.05, 0.06, 0.043], [0.5, 0.024, 0.026, 0.022]], ext: [[0.375, 0.045, 0.028, 0.028, 0.03]], lift: 0.08, fold: 1.0 };
  const hind = { z: 0.14, J: [[-0.36, 0.86], [-0.25, 0.63], [-0.47, 0.42], [-0.45, 0.09]], toe: [-0.4, 0], top: [-0.01, 0.06, -0.05, 0.13, 0.15, 0.07], R: [[0.14, 0.18, 0.09], [0.085, 0.09, 0.06], [0.038, 0.044, 0.033], [0.03, 0.033, 0.03]], M: [[0.5, 0.13, 0.15, 0.08], [0.3, 0.056, 0.07, 0.042], [0.5, 0.024, 0.028, 0.022]], ext: [[-0.425, 0.045, 0.028, 0.028, 0.03]], lift: 0.07 };
  [['f', fore, [0.25, 0.75]], ['h', hind, [0, 0.5]]].forEach(([n, L, ph]) => [1, -1].forEach((sd, i) => {
    const z = sd * L.z, names = b.limb(n + (i ? 'r' : 'l'), 'body', z, L.J, L.toe, L.R, L.M, { ...L, top: [L.top[0], L.top[1], sd * L.top[2], L.top[3], L.top[4], L.top[5]], tile: T, phase: ph[i], mode: n === 'f' ? 'lock' : 'panto' });
    cloven(b, names[3], z, L.toe, 0.044, L.J[3]);
  }));
  b.pair('detail', (sd) => [mass(0.8, 1.09, sd * 0.078, 0.02, 0.02, 0.016), 'head', BLACK]);
  b.pair('skin', (sd) => [mass(0.796, 1.105, sd * 0.07, 0.03, 0.014, 0.02, -0.25), 'head']);
  b.detail(mass(1.035, 0.865, 0, 0.03, 0.035, 0.045), 'head', BLACK);
  const o = [[-0.016, 0], [-0.045, 0.05], [-0.027, 0.105], [0, 0.13], [0.027, 0.105], [0.045, 0.05], [0.016, 0]];
  b.pair('skin', (sd) => [put(slab(o, 0.022, T), 0.7, 1.1, sd * 0.085, sd * 1.3, sd * -0.3, -0.15), 'head']);
  const horn = hex(0xd8ccb0);
  b.pair('detail', (s) => [loft([[0.7, 1.13, s * 0.06, 0.03], [0.69, 1.2, s * 0.2, 0.026], [0.7, 1.34, s * 0.27, 0.019], [0.74, 1.48, s * 0.22, 0.006]], { segs: 6, sub: 4, capB: 2 }), 'head', horn]);
  b.wave(tail, 'x', 0.22, { kt: 1.7, lag: 0.7 }).sway(neck[0], 'z', 0.04, { kg: 2, kph: 0 }).sway('head', 'z', -0.03, { kg: 2, phase: 0.5, kph: 0 }).sway('head', 'y', 0.08, { kt: 0.31 });
  const patch = (x, y, z) => Math.sin(x * 9 + 1.3) * Math.cos(y * 7 + z * 11) + 0.6 * Math.sin(x * 4.3 - y * 3 + 2);
  return b.build({ color: C, tex: hide('short', 5), gait: { duty: 0.66, stride: 0.5 }, rough: 0.85, scale: 1.32,
    coat: pied ? (x, y, z) => (y > 0.45 && patch(x, y, z) > 0.35 ? dark : ONE) : (x, y, z, ny) => mix(mix(ONE, dark, (ny - 0.7) * 1.2 + (x > 0.85 ? 0.5 : 0)), pale, Math.min((0.62 - y) * 6, -ny * 3 - 1) * (y > 0.4 ? 1 : 0)) });
}

let MAKE;
export const cattle = () => MAKE || (MAKE = [ox(false), ox(true)]);

const _a = [0, 0, 0];
/** Animals that walk a track in step with the people on it: add(make, track, ahead, side) and update(d, t) per track. */
export class Team {
  constructor(world, group) { this.world = world; this.group = group; this.list = []; }
  /** `frac` → distance along the track is given at update; `ahead` metres in front of that point, `side` metres to its right. */
  add(make, track, ahead, side, scale = 1, key = 0) { const a = make(); a.obj.scale.setScalar(scale); a.ph = ahead * 3 + side * 5; this.group.add(a.obj); this.list.push({ a, track, ahead, side, scale, key }); return a; }
  /** dist(key) → metres travelled along that track. */
  update(dist, t, on = () => true) {
    for (const q of this.list) {
      const vis = on(q.key); q.a.obj.visible = vis; if (!vis) continue;
      const d = dist(q.key) + q.ahead, p = q.track.at(d, _a, 0.8), c = Math.cos(p[2]), s = Math.sin(p[2]), x = p[0] + s * q.side, z = p[1] + c * q.side;
      q.a.obj.position.set(x, this.world.heightAt(x, z), z); q.a.obj.rotation.y = p[2];
      const g = q.a.def.gait; pose(q.a, (TAU * g.duty * d) / (g.stride * q.scale) + q.a.ph, t);
    }
  }
}
/** A herd standing at graze: one instanced mesh per hide, no skeletons. spots: [x, z, heading, scale, pied]. */
export function grazing(world, group, spots, heightAt) {
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  cattle().forEach((make, k) => {
    const mine = spots.filter((s) => !!s[4] === !!k); if (!mine.length) return;
    for (const src of make().obj.children.filter((c) => c.isMesh)) {
      const m = new THREE.InstancedMesh(src.geometry, src.material, mine.length); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
      mine.forEach(([x, z, rot, s], i) => m.setMatrixAt(i, _m.compose(new THREE.Vector3(x, heightAt(x, z), z), _q.setFromAxisAngle(UP, rot), new THREE.Vector3(s, s, s))));
      group.add(m);
    }
  });
}
