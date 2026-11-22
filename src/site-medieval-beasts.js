// Farm animals for the later ages: the plough ox and the sheep, built with the same rig as the wild animals (animals-rig.js),
// plus herds of them standing still (baked to one instanced mesh) and living mounts and draught animals that walk a path.
import * as THREE from 'three';
import { Rig, loft, mass, cone, slab, frustum, put, hide, hex, BLACK, HOOF, pose } from './animals-rig.js?v=fea1c89f';
import { species } from './animals.js?v=fea1c89f';
import { pathOf, where } from './site-medieval-kit.js?v=fea1c89f';

const tone = (base, target) => { const a = hex(base), b = hex(target); return b.map((v, i) => v / a[i]); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const ONE = [1, 1, 1];
/** Two toes side by side with dew claws behind. */
function cloven(b, f, z, toe, a, ball) {
  for (const s of [1, -1]) {
    b.detail(frustum([toe[0] - a, 0, z + s * a * 0.55, a, a * 0.48], [toe[0] - a * 1.7, a * 1.5, z + s * a * 0.45, a * 0.62, a * 0.44, 0.45], 8), f, HOOF);
    b.detail(cone(a * 0.22, a * 0.7, ball[0] - a * 0.55, ball[1] - a * 0.3, z + s * a * 0.45, 2.5), f, HOOF);
  }
}
/** A four-legged animal from side-view profiles (as animals-mammals.js builds its own). */
function quadruped(s) {
  const b = new Rig(), T = s.tile;
  b.bone('body', null, ...s.body);
  const tail = b.run('tail', 'body', s.tailJ), neck = b.run('neck', 'body', s.neckJ), hj = s.neckJ[s.neckJ.length - 1];
  b.bone('head', neck[neck.length - 1], hj[0], hj[1], 0, [...s.nose, 0]);
  const spine = b.path([...tail.slice().reverse(), 'body', ...neck, 'head'], 0.45);
  b.skin(loft(s.torso, { segs: 18, tile: T, capA: 0.7, capB: 0.7 }), spine);
  b.skin(loft(s.neck, { segs: 12, tile: T, capA: 0.5 }), spine, s.neckTint);
  b.skin(loft(s.head, { segs: 12, tile: T, capA: 0.8, capB: 0.7 }), 'head', s.headTint);
  if (s.tail) b.skin(loft(s.tail, { segs: 7, tile: T, capA: 0.5, capB: 1, ref: [1, 0, 0] }), spine, s.tailTint);
  [['f', s.fore, [0.25, 0.75]], ['h', s.hind, [0, 0.5]]].forEach(([n, L, ph]) => [1, -1].forEach((sd, i) => {
    const z = sd * L.z, names = b.limb(n + (i ? 'r' : 'l'), 'body', z, L.J, L.toe, L.R, L.M, { ...L, top: L.top && [L.top[0], L.top[1], sd * L.top[2], L.top[3], L.top[4], L.top[5]], tile: T, phase: ph[i], mode: n === 'f' ? 'lock' : 'panto' });
    cloven(b, names[3], z, L.toe, L.foot, L.J[3]);
  }));
  const [ex, ey, ez, er] = s.eye;
  b.pair('detail', (sd) => [mass(ex, ey, sd * ez, er, er, er * 0.8), 'head', BLACK]);
  if (s.nostril) b.pair('detail', (sd) => [mass(s.nostril[0], s.nostril[1], sd * s.nostril[2], s.nostril[3], s.nostril[3] * 0.6, s.nostril[3] * 0.5, -0.9), 'head', BLACK]);
  { const [x, y, z, len, w, out, fwd] = s.ear, o = [[-w * 0.35, 0], [-w, len * 0.4], [-w * 0.6, len * 0.8], [0, len], [w * 0.6, len * 0.8], [w, len * 0.4], [w * 0.35, 0]]; b.pair('skin', (sd) => [put(slab(o, w * 0.5, T), x, y, sd * z, sd * out, sd * fwd, -0.15), 'head', s.headTint]); }
  b.wave(tail, 'x', s.wag || 0.1, { kt: 1.7, lag: 0.7 }).sway(neck[0], 'z', s.nod || 0.03, { kg: 2, kph: 0 }).sway('head', 'z', -(s.nod || 0.03) * 0.8, { kg: 2, phase: 0.5, kph: 0 }).sway('head', 'y', 0.08, { kt: 0.31 });
  if (s.extra) s.extra(b, spine);
  return b.build({ color: s.color, tex: s.tex, coat: s.coat, gait: s.gait, rough: s.rough || 0.9 });
}

let MADE;
/** { ox, sheep }: factories returning { obj, bones, def, … } facing +x with the feet at y = 0. */
export function beasts() {
  if (MADE) return MADE;
  const SHORT = hide('short', 15), SHAG = hide('shag', 16);
  // ---------- the plough ox: 1.3 m at the withers, deep in the chest, head carried low under the yoke ----------
  const OC = 0x8a5a36, pale = tone(OC, 0xcdb89a), dark = tone(OC, 0x3a2a20);
  const ox = quadruped({
    color: OC, tex: SHORT, tile: 0.6, gait: { duty: 0.68, stride: 0.8, bob: 0.008 }, nod: 0.04, wag: 0.12,
    body: [0, 0.95], tailJ: [[-0.88, 1.2], [-0.96, 1.0], [-0.98, 0.7], [-0.97, 0.4]], neckJ: [[0.6, 1.1], [0.85, 1.14], [1.08, 1.15]], nose: [1.52, 0.82],
    torso: [[-0.9, 1.0, 0, 0.15, 0.2, 0.14, 0.2], [-0.76, 0.99, 0, 0.3, 0.36, 0.3, 0.1], [-0.5, 0.97, 0, 0.33, 0.4, 0.36, 0.05], [-0.2, 0.95, 0, 0.3, 0.42, 0.38], [0.1, 0.94, 0, 0.31, 0.43, 0.37, 0.1],
      [0.38, 0.95, 0, 0.36, 0.44, 0.33, 0.25], [0.55, 0.97, 0, 0.36, 0.42, 0.27, 0.35], [0.7, 1.0, 0, 0.26, 0.36, 0.2, 0.4], [0.8, 1.02, 0, 0.16, 0.22, 0.14, 0.4]],
    neck: [[0.55, 1.05, 0, 0.24, 0.36, 0.17, 0.3], [0.75, 1.1, 0, 0.2, 0.32, 0.14, 0.4], [0.95, 1.13, 0, 0.17, 0.25, 0.12, 0.3], [1.1, 1.15, 0, 0.15, 0.2, 0.115]],
    head: [[1.04, 1.17, 0, 0.13, 0.14, 0.13], [1.17, 1.1, 0, 0.13, 0.17, 0.135], [1.29, 1.0, 0, 0.1, 0.14, 0.105], [1.41, 0.9, 0, 0.085, 0.11, 0.085], [1.49, 0.83, 0, 0.075, 0.085, 0.08]],
    tail: [[-0.86, 1.2, 0, 0.035], [-0.95, 1.0, 0, 0.025], [-0.98, 0.7, 0, 0.02], [-0.975, 0.5, 0, 0.03], [-0.97, 0.36, 0, 0.045], [-0.97, 0.3, 0, 0.012]],
    eye: [1.2, 1.13, 0.125, 0.024], nostril: [1.51, 0.83, 0.045, 0.02], ear: [1.07, 1.2, 0.13, 0.17, 0.06, 1.25, -0.3],
    fore: { z: 0.2, J: [[0.62, 0.92], [0.5, 0.72], [0.52, 0.4], [0.525, 0.16]], toe: [0.6, 0], foot: 0.06, top: [-0.06, 0.2, -0.07, 0.13, 0.18, 0.08],
      R: [[0.14, 0.18, 0.1], [0.085, 0.11, 0.07], [0.06, 0.055, 0.052], [0.048, 0.052, 0.045]], M: [null, [0.25, 0.075, 0.09, 0.06], [0.5, 0.04, 0.045, 0.036]], ext: [[0.555, 0.08, 0.042, 0.042, 0.046]], lift: 0.12, fold: 1.0 },
    hind: { z: 0.21, J: [[-0.58, 1.02], [-0.42, 0.76], [-0.72, 0.5], [-0.68, 0.17]], toe: [-0.6, 0], foot: 0.06, top: [-0.02, 0.1, -0.08, 0.2, 0.24, 0.11],
      R: [[0.2, 0.25, 0.13], [0.115, 0.125, 0.085], [0.062, 0.07, 0.05], [0.048, 0.052, 0.045]], M: [[0.5, 0.17, 0.2, 0.11], [0.3, 0.08, 0.1, 0.06], [0.5, 0.04, 0.046, 0.034]], ext: [[-0.64, 0.08, 0.042, 0.042, 0.046]], lift: 0.11 },
    coat: (x, y, z, ny) => mix(mix(ONE, pale, Math.max((0.62 - y) * 3, x > 1.36 ? 1 : 0)), dark, (0.2 - y) * 8),
    extra: (b) => {   // horns sweeping out, forward and up
      const H = hex(0xd8ccb0);
      b.pair('detail', (s) => [loft([[1.06, 1.26, s * 0.1, 0.035], [1.07, 1.3, s * 0.24, 0.03], [1.13, 1.38, s * 0.33, 0.022], [1.22, 1.48, s * 0.35, 0.006]], { segs: 7, sub: 3, capB: 2 }), 'head', H]);
    },
  });
  // ---------- a medieval sheep: small (0.65 m at the shoulder), long in the leg, dark-faced, in full fleece ----------
  const SC = 0xd2c8ac, face = tone(SC, 0x4a4036);
  const sheep = quadruped({
    color: SC, tex: SHAG, tile: 0.25, gait: { duty: 0.62, stride: 0.3, bob: 0.004 }, wag: 0.2, neckTint: [0.95, 0.95, 0.95], headTint: face,
    body: [0, 0.5], tailJ: [[-0.44, 0.62], [-0.48, 0.52], [-0.5, 0.42]], neckJ: [[0.3, 0.6], [0.4, 0.7], [0.48, 0.8]], nose: [0.72, 0.7],
    torso: [[-0.46, 0.52, 0, 0.1, 0.13, 0.1], [-0.36, 0.52, 0, 0.2, 0.2, 0.2], [-0.15, 0.52, 0, 0.22, 0.21, 0.23], [0.1, 0.52, 0, 0.22, 0.22, 0.23], [0.28, 0.53, 0, 0.21, 0.21, 0.2], [0.39, 0.55, 0, 0.13, 0.15, 0.12]],
    neck: [[0.28, 0.58, 0, 0.13, 0.16, 0.12], [0.38, 0.68, 0, 0.1, 0.12, 0.09], [0.47, 0.78, 0, 0.075, 0.085, 0.07]],
    head: [[0.45, 0.81, 0, 0.06, 0.065, 0.062], [0.53, 0.79, 0, 0.062, 0.07, 0.064], [0.62, 0.75, 0, 0.045, 0.055, 0.045], [0.7, 0.71, 0, 0.035, 0.04, 0.036]],
    tail: [[-0.43, 0.63, 0, 0.04], [-0.48, 0.52, 0, 0.035], [-0.5, 0.42, 0, 0.018]],
    eye: [0.56, 0.805, 0.058, 0.014], ear: [0.47, 0.82, 0.06, 0.09, 0.035, 1.4, -0.2],
    fore: { z: 0.09, J: [[0.27, 0.42], [0.22, 0.34], [0.23, 0.19], [0.235, 0.06]], toe: [0.27, 0], foot: 0.022, top: [-0.02, 0.08, -0.03, 0.05, 0.07, 0.04],
      R: [[0.05, 0.06, 0.045], [0.03, 0.035, 0.028], [0.02, 0.02, 0.019], [0.018, 0.019, 0.017]], M: [null, [0.25, 0.026, 0.03, 0.024], [0.5, 0.014, 0.015, 0.013]], ext: [[0.25, 0.03, 0.016, 0.016, 0.017]], lift: 0.05, fold: 1 },
    hind: { z: 0.1, J: [[-0.3, 0.5], [-0.22, 0.36], [-0.36, 0.25], [-0.345, 0.06]], toe: [-0.31, 0], foot: 0.022, top: [-0.01, 0.05, -0.035, 0.08, 0.09, 0.05],
      R: [[0.08, 0.1, 0.06], [0.045, 0.05, 0.035], [0.022, 0.025, 0.019], [0.018, 0.019, 0.017]], M: [[0.5, 0.07, 0.085, 0.05], [0.3, 0.03, 0.04, 0.025], [0.5, 0.014, 0.016, 0.013]], ext: [[-0.325, 0.03, 0.016, 0.016, 0.017]], lift: 0.045 },
    coat: (x, y) => mix(ONE, face, (0.3 - y) * 12),
  });
  return (MADE = { ox, sheep });
}

const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
/** One animal frozen in a pose (gait angle g; `head` lowers the neck to graze) as a plain geometry. */
export function baked(make, g = 0, head = 0) {
  const a = make(); pose(a, g, 0);
  if (head) for (const n of ['neck0', 'neck1']) a.bones[a.def.ix[n]].rotation.z -= head * 0.5;
  a.obj.updateMatrixWorld(true);
  const parts = [];
  a.obj.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.skeleton.update(); const src = o.geometry, P = src.attributes.position, pos = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { o.getVertexPosition(i, _v); pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z; }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('uv', src.attributes.uv); out.setAttribute('color', src.attributes.color); out.setIndex(src.index);
    out.computeVertexNormals(); parts.push({ geo: out, mat: o.material });
  });
  // one geometry, drawn with the hide material
  let nv = 0, ni = 0; for (const p of parts) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const geo = new THREE.BufferGeometry(), index = new Uint32Array(ni); let vo = 0, io = 0;
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) { const arr = new Float32Array(nv * size); let o = 0; for (const p of parts) { arr.set(p.geo.attributes[name].array, o); o += p.geo.attributes.position.count * size; } geo.setAttribute(name, new THREE.BufferAttribute(arr, size)); }
  for (const p of parts) { for (let i = 0; i < p.geo.index.count; i++) index[io++] = p.geo.index.array[i] + vo; vo += p.geo.attributes.position.count; }
  geo.setIndex(new THREE.BufferAttribute(index, 1)); geo.computeBoundingSphere();
  return { geo, mat: parts[0].mat };
}
/** A herd standing about: items [{ x, z, rot, s }] of a baked animal, as one instanced mesh. */
export function herdOf(world, bakedAnimal, items) {
  const m = new THREE.InstancedMesh(bakedAnimal.geo, bakedAnimal.mat, items.length); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
  items.forEach((it, i) => m.setMatrixAt(i, _m.compose(_v.set(it.x, world.heightAt(it.x, it.z), it.z), _q.setFromAxisAngle(UP, it.rot || 0), _s.setScalar(it.s || 1))));
  return m;
}

/**
 * Living animals that walk a path in step with an actor (an ox before the plough, a horse under a rider or before a cart).
 * items: [{ make, path, speed, phase, ahead?, side?, u0?, u1?, scale?, load? (an Object3D carried on its back) }]
 */
export class Walkers {
  constructor(world, group, items) {
    this.world = world; this.group = group; this.o = { x: 0, z: 0, rot: 0 };
    this.items = items.map((it) => {
      const a = it.make(); a.obj.traverse((o) => { if (o.isMesh) o.castShadow = true; }); if (it.scale) a.obj.scale.setScalar(it.scale); if (it.load) a.obj.add(it.load);
      a.obj.visible = false; group.add(a.obj);
      return { ahead: 0, side: 0, ...it, u0: it.u0 ?? -Infinity, u1: it.u1 ?? Infinity, a, P: it.path ? pathOf(it.path) : null };
    });
  }
  update(u, t) {
    const o = this.o;
    for (const it of this.items) {
      const on = u >= it.u0 && u < it.u1; it.a.obj.visible = on; if (!on) continue;
      let d = 0;
      if (it.P) { d = it.phase * it.P.route + it.speed * t + it.ahead; where(it.P, d, o); } else { o.x = it.x; o.z = it.z; o.rot = it.rot || 0; }
      const c = Math.cos(o.rot), s = Math.sin(o.rot), x = o.x + s * it.side, z = o.z + c * it.side;
      it.a.obj.position.set(x, this.world.heightAt(x, z), z); it.a.obj.rotation.y = o.rot;
      const def = it.a.def; pose(it.a, it.P ? (2 * Math.PI * def.gait.duty * d) / (def.gait.stride * (it.scale || 1)) : 0, t);
    }
  }
}
export const horse = () => species().horse();
