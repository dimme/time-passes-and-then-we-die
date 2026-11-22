// The first livestock: goats, sheep and cattle, shaped from one hoofed build. A few walk with their herders
// (rigged, as the game's other animals are); the many that stand and graze are copies of one posed body.
import * as THREE from 'three';
import { Rig, loft, mass, cone, slab, frustum, put, hide, hex, BLACK, HOOF, pose, TAU } from './animals-rig.js?v=740e009b';

const tone = (base, target) => { const a = hex(base), b = hex(target); return b.map((v, i) => v / a[i]); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const ONE = [1, 1, 1];

/** Two toes side by side with dew claws behind. a = half length of one hoof. */
function cloven(b, f, z, toe, a, ball) {
  for (const s of [1, -1]) {
    b.detail(frustum([toe[0] - a, 0, z + s * a * 0.55, a, a * 0.48], [toe[0] - a * 1.7, a * 1.5, z + s * a * 0.45, a * 0.62, a * 0.44, 0.45], 8), f, HOOF);
    b.detail(cone(a * 0.22, a * 0.7, ball[0] - a * 0.55, ball[1] - a * 0.3, z + s * a * 0.45, 2.5), f, HOOF);
  }
}
/** A four-legged mammal from side-view profiles (the same recipe as animals-mammals.js, which does not export it). */
function quadruped(s) {
  const b = new Rig(), T = s.tile;
  b.bone('body', null, ...s.body);
  const tail = b.run('tail', 'body', s.tailJ), neck = b.run('neck', 'body', s.neckJ), hj = s.neckJ[s.neckJ.length - 1];
  b.bone('head', neck[neck.length - 1], hj[0], hj[1], 0, [...s.nose, 0]);
  const spine = b.path([...tail.slice().reverse(), 'body', ...neck, 'head'], 0.45);
  b.skin(loft(s.torso, { segs: 18, tile: T, capA: 0.7, capB: 0.7 }), spine);
  b.skin(loft(s.neck, { segs: 12, tile: T, capA: 0.5 }), spine);
  b.skin(loft(s.head, { segs: 12, tile: T, capA: 0.8, capB: 0.7 }), 'head');
  b.skin(loft(s.tail, { segs: 7, tile: T, capA: 0.5, capB: 1, ref: [1, 0, 0] }), spine, s.tailTint);
  [['f', s.fore, [0.25, 0.75]], ['h', s.hind, [0, 0.5]]].forEach(([n, L, ph]) => [1, -1].forEach((sd, i) => {
    const z = sd * L.z, names = b.limb(n + (i ? 'r' : 'l'), 'body', z, L.J, L.toe, L.R, L.M, { ...L, top: [L.top[0], L.top[1], sd * L.top[2], L.top[3], L.top[4], L.top[5]], tile: T, segs: 8, phase: ph[i], mode: n === 'f' ? 'lock' : 'panto' });
    cloven(b, names[3], z, L.toe, L.foot, L.J[3]);
  }));
  const [ex, ey, ez, er] = s.eye;
  b.pair('detail', (sd) => [mass(ex, ey, sd * ez, er, er, er * 0.8), 'head', BLACK]);
  b.pair('skin', (sd) => [mass(ex - er * 0.2, ey + er * 0.75, sd * (ez - er * 0.35), er * 1.5, er * 0.7, er, -0.25), 'head']);
  b.detail(mass(...s.nosePad), 'head', BLACK);
  { const [x, y, z, len, w, out, fwd] = s.ear, o = [[-w * 0.35, 0], [-w, len * 0.4], [-w * 0.6, len * 0.8], [0, len], [w * 0.6, len * 0.8], [w, len * 0.4], [w * 0.35, 0]]; b.pair('skin', (sd) => [put(slab(o, w * 0.5, T), x, y, sd * z, sd * out, sd * fwd, -0.15), 'head', s.earTint]); }
  b.wave(tail, 'x', s.wag || 0.12, { kt: 1.7, lag: 0.7 }).sway(neck[0], 'z', 0.03, { kg: 2, kph: 0 }).sway('head', 'z', -0.024, { kg: 2, phase: 0.5, kph: 0 }).sway('head', 'y', 0.1, { kt: 0.31 });
  if (s.extra) s.extra(b, spine);
  return b.build({ color: s.color, tex: s.tex, coat: s.coat, gait: s.gait, rough: 0.9 });
}

// the white-tailed deer of animals-mammals.js, as the pattern the farm animals are cut from
const D = {
  body: [0, 0.8], tailJ: [[-0.55, 0.93], [-0.61, 0.83], [-0.65, 0.72]], neckJ: [[0.4, 0.9], [0.55, 1.12], [0.67, 1.36]], nose: [0.97, 1.25],
  torso: [[-0.56, 0.86, 0, 0.09, 0.12, 0.09, 0.2], [-0.46, 0.85, 0, 0.165, 0.2, 0.155, 0.2], [-0.3, 0.83, 0, 0.195, 0.19, 0.175, 0.15], [-0.1, 0.81, 0, 0.175, 0.17, 0.175, 0.1],
    [0.1, 0.79, 0, 0.185, 0.21, 0.19, 0.2], [0.3, 0.78, 0, 0.22, 0.235, 0.18, 0.35], [0.42, 0.79, 0, 0.2, 0.22, 0.15, 0.4], [0.52, 0.81, 0, 0.13, 0.16, 0.1, 0.4]],
  neck: [[0.36, 0.86, 0, 0.14, 0.19, 0.115], [0.47, 1.0, 0, 0.1, 0.125, 0.078], [0.58, 1.17, 0, 0.07, 0.085, 0.06], [0.66, 1.31, 0, 0.058, 0.068, 0.054], [0.69, 1.38, 0, 0.052, 0.058, 0.05]],
  head: [[0.65, 1.385, 0, 0.05, 0.055, 0.052], [0.73, 1.365, 0, 0.062, 0.07, 0.064], [0.82, 1.325, 0, 0.045, 0.06, 0.046], [0.9, 1.285, 0, 0.032, 0.045, 0.033], [0.955, 1.257, 0, 0.027, 0.032, 0.028]],
  tail: [[-0.53, 0.94, 0, 0.04, 0.04, 0.045], [-0.6, 0.84, 0, 0.035, 0.035, 0.05], [-0.65, 0.73, 0, 0.02, 0.02, 0.03]],
  eye: [0.775, 1.385, 0.056, 0.017], nosePad: [0.972, 1.252, 0, 0.02, 0.02, 0.024], ear: [0.665, 1.42, 0.05, 0.15, 0.04, 0.75, -0.5],
  fore: { z: 0.085, J: [[0.44, 0.74], [0.33, 0.6], [0.345, 0.33], [0.35, 0.085]], toe: [0.4, 0], top: [-0.03, 0.1, -0.035, 0.06, 0.09, 0.04],
    R: [[0.06, 0.09, 0.05], [0.038, 0.05, 0.034], [0.024, 0.022, 0.022], [0.02, 0.022, 0.019]], M: [null, [0.25, 0.034, 0.042, 0.029], [0.5, 0.015, 0.017, 0.014]], ext: [[0.375, 0.045, 0.019, 0.019, 0.02]], lift: 0.1, fold: 1.1 },
  hind: { z: 0.09, J: [[-0.36, 0.86], [-0.25, 0.63], [-0.47, 0.42], [-0.45, 0.09]], toe: [-0.4, 0], top: [-0.01, 0.06, -0.04, 0.09, 0.11, 0.05],
    R: [[0.1, 0.13, 0.065], [0.06, 0.065, 0.042], [0.026, 0.03, 0.022], [0.02, 0.022, 0.019]], M: [[0.5, 0.09, 0.11, 0.058], [0.3, 0.04, 0.052, 0.03], [0.5, 0.016, 0.019, 0.015]], ext: [[-0.425, 0.045, 0.019, 0.019, 0.02]], lift: 0.09 },
};
/**
 * Reshape the pattern: kx / ky stretch length and leg height, girth fattens the barrel, legR the legs, zk sets them apart;
 * the neck turns by neckRot about its root and grows by neckLen; the head turns by headRot and grows by headK (hr its thickness); tailK lengthens the tail.
 * coat(x, y, z, ny) and horns(H, hr) work in the finished animal's own coordinates (H maps a point of the pattern's head).
 */
function ungulate(o) {
  const { kx, ky, girth, legR, zk = girth, neckRot = 0, neckLen = 1, headRot = 0, headK = 1, hr = headK, tailK = 1, earK = 1 } = o;
  const N0 = [0.4, 0.86], H0 = D.neckJ[2], rot = (p, c, a, k) => { const dx = (p[0] - c[0]) * k, dy = (p[1] - c[1]) * k, cs = Math.cos(a), sn = Math.sin(a); return [dx * cs - dy * sn, dx * sn + dy * cs]; };
  const neckT = (x, y) => { const q = rot([x, y], N0, neckRot, neckLen); return [N0[0] + q[0], N0[1] + q[1]]; }, HJ = neckT(...H0);
  const N = (x, y) => { const q = neckT(x, y); return [q[0] * kx, q[1] * ky]; };
  const H = (x, y) => { const q = rot([x, y], H0, neckRot + headRot, headK); return [(HJ[0] + q[0]) * kx, (HJ[1] + q[1]) * ky]; };
  const T0 = D.tailJ[0], tl = (x, y) => [(T0[0] + (x - T0[0]) * (0.6 + 0.4 * tailK)) * kx, (T0[1] + (y - T0[1]) * tailK) * ky];
  const leg = (L) => ({ ...L, z: L.z * zk, J: L.J.map(([x, y]) => [x * kx, y * ky]), toe: [L.toe[0] * kx, 0], foot: 0.03 * legR * (o.hoof || 1), top: [L.top[0] * kx, L.top[1] * ky, L.top[2] * zk, L.top[3] * girth, L.top[4] * girth, L.top[5] * girth],
    R: L.R.map((q, i) => q.map((v) => v * (i === 0 ? (legR + girth) / 2 : legR))), M: L.M.map((q) => q && [q[0], q[1] * legR, q[2] * legR, q[3] * legR]), ext: L.ext.map(([x, y, ...q]) => [x * kx, y * ky, ...q.map((v) => v * legR)]), lift: L.lift * ky });
  const nk = D.neck.length - 1;
  return quadruped({
    color: o.color, tex: o.tex, tile: 0.35 * Math.max(kx, 1), gait: { duty: 0.62, stride: 0.5 * kx }, coat: o.coat, wag: o.wag,
    body: [0, 0.8 * ky], tailJ: D.tailJ.map(([x, y]) => tl(x, y)), neckJ: [[N0[0] * kx, 0.9 * ky], N(...D.neckJ[1]), N(...D.neckJ[2])], nose: H(...D.nose),
    torso: D.torso.map(([x, y, z, a, b, w, e]) => [x * kx, y * ky + (o.sag ? -o.sag * Math.max(0, 1 - Math.abs(x) * 3) : 0), z, a * girth, b * girth, w * girth * (o.wide || 1), e]),
    neck: D.neck.map(([x, y, z, a, b, w], i) => { const k = girth + (hr - girth) * (i / nk) ** 0.7; return [...N(x, y), z, a * k, b * k * (o.dewlap && i < 3 ? 1.35 : 1), w * k]; }),
    head: D.head.map(([x, y, z, a, b, w]) => [...H(x, y), z, a * hr, b * hr, w * hr]),
    tail: D.tail.map(([x, y, z, a, b, w]) => [...tl(x, y), z, a * legR * 0.8, b * legR * 0.8, w * legR * 0.6]), tailTint: o.tailTint,
    eye: [...H(D.eye[0], D.eye[1]), D.eye[2] * hr, D.eye[3] * Math.sqrt(hr)], nosePad: [...H(D.nosePad[0], D.nosePad[1]), 0, 0.02 * hr, 0.02 * hr, 0.024 * hr],
    ear: [...H(D.ear[0] - 0.01, D.ear[1] - 0.01), D.ear[2] * hr, 0.15 * earK, 0.04 * earK * 1.2, o.earOut ?? 1.25, -0.5], earTint: o.earTint,
    fore: leg(D.fore), hind: leg(D.hind),
    extra: (b, spine) => o.horns && o.horns(b, (x, y, z) => [...H(x, y), z * hr], spine),
  });
}
const horn = (b, H, pts, col) => b.pair('detail', (s) => [loft(pts.map(([x, y, z, r]) => [...H(x, y, s * z), r]), { segs: 7, sub: 4, capB: 2 }), 'head', col]);

let MAKERS;
/** goat, sheep, cattle and ox makers: each returns { obj, bones, def … } facing +x with its feet at y = 0. */
export function livestock() {
  if (MAKERS) return MAKERS;
  const SHORT = hide('short', 7), M = MAKERS = {};
  // bezoar-coloured goat, 0.7 m at the shoulder: scimitar horns, a beard, a short tail held up
  {
    const C = 0x8a6a48, pale = tone(C, 0xd8ccb0), dark = tone(C, 0x2c2218);
    M.goat = ungulate({
      color: C, tex: SHORT, kx: 0.7, ky: 0.68, girth: 0.92, legR: 0.95, zk: 1.0, neckRot: -0.2, neckLen: 0.75, headK: 0.82, hr: 0.95, tailK: -0.35, earK: 0.8, wag: 0.3, tailTint: dark,
      coat: (x, y, z, ny) => {
        let c = mix(ONE, dark, (ny - 0.82) * 6);                                    // the black stripe down the spine
        c = mix(c, pale, Math.min((0.5 - y) * 10, -ny * 3 - 0.8) * (y > 0.3 ? 1 : 0));   // belly
        if (y < 0.3) c = mix(c, dark, (0.3 - y) * 5 * (x > 0 ? 1 : 0.5));            // dark shins
        if (x > 0.28 && x < 0.36 && y < 0.62 && y > 0.3) c = mix(c, dark, 0.8);     // shoulder stripe
        return c;
      },
      horns: (b, H) => {
        horn(b, H, [[0.7, 1.42, 0.03, 0.021], [0.66, 1.56, 0.05, 0.018], [0.56, 1.68, 0.08, 0.013], [0.42, 1.72, 0.12, 0.004]], hex(0x4a4036));
        b.detail(put(cone(0.02, 0.1, 0, 0, 0, Math.PI), ...H(0.86, 1.25, 0)), 'head', hex(0x2c2218));   // beard
      },
    });
  }
  // early sheep, still more hair than wool, pale with a darker face and legs
  {
    const C = 0xc4b494, face = tone(C, 0x6a5038), white = tone(C, 0xe6dec8);
    M.sheep = ungulate({
      color: C, tex: SHORT, kx: 0.68, ky: 0.62, girth: 1.22, legR: 0.95, zk: 1.05, neckRot: -0.5, neckLen: 0.62, headRot: 0.1, headK: 0.8, hr: 1.0, tailK: 1.5, earK: 0.75, earOut: 1.5, wag: 0.25, wide: 1.06,
      coat: (x, y, z, ny) => {
        let c = mix(white, ONE, ny * 0.5 + 0.5);
        if (y < 0.3) c = mix(c, face, (0.32 - y) * 9);                               // bare dark legs
        if (x > 0.42) c = mix(c, face, (x - 0.42) * 12);                             // face
        return c;
      },
    });
  }
  // longhorned cattle not long out of the aurochs: 1.35 m at the withers, red-brown, darker forequarters, pale muzzle
  const cattle = (C, darkC, k) => {
    const dark = tone(C, darkC), pale = tone(C, 0xd8ccb0);
    return ungulate({
      color: C, tex: SHORT, kx: 1.38 * k, ky: 1.3 * k, girth: 2.0 * k, legR: 1.9 * k, zk: 2.1 * k, neckRot: -0.82, neckLen: 0.78, headRot: 0.22, headK: 1.65 * k, hr: 2.0 * k, tailK: 3.3, earK: 1.3 * k, earOut: 1.5, wag: 0.2, sag: 0.03, dewlap: 1, hoof: 1.15, tailTint: dark,
      coat: (x, y, z, ny) => {
        let c = mix(ONE, dark, (x - 0.1) * 0.9 + (ny > 0.6 ? 0.1 : 0));              // darker towards the shoulders and head
        c = mix(c, pale, (ny - 0.9) * 5 * (x < 0.4 ? 1 : 0));                         // the pale stripe along the back
        if (y < 0.5 * k) c = mix(c, dark, (0.5 * k - y) * 3);
        if (x > 1.02 * k && y < 1.0 * k) c = mix(c, pale, 1);                         // muzzle ring
        return c;
      },
      horns: (b, H) => horn(b, H, [[0.69, 1.41, 0.045, 0.02], [0.68, 1.47, 0.14, 0.019], [0.72, 1.56, 0.21, 0.015], [0.8, 1.62, 0.2, 0.009], [0.86, 1.64, 0.17, 0.003]], hex(0xd8d0b8)),
    });
  };
  M.cattle = cattle(0x7a4428, 0x2a1a12, 1); M.ox = cattle(0x5a4636, 0x241c16, 1.06);
  return M;
}

const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
const baked = new Map();
/** The animal's body in one stance as plain geometry: graze lowers the head to the ground (radians at the neck), g is the point in its stride. */
function bake(make, graze, g) {
  const key = graze + ':' + g; let per = baked.get(make); if (!per) baked.set(make, per = {});
  if (per[key]) return per[key];
  const a = make(); a.ph = 0; pose(a, g, 0);
  if (graze) { const B = a.bones, ix = a.def.ix; B[ix.neck0].rotation.z -= graze * 0.62; B[ix.neck1].rotation.z -= graze * 0.3; B[ix.head].rotation.z -= graze * 0.08; }
  a.obj.updateMatrixWorld(true);
  const parts = [];
  for (const m of a.obj.children) {
    if (!m.isSkinnedMesh) continue;
    const geo = m.geometry.clone(), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { _v.fromBufferAttribute(p, i); m.applyBoneTransform(i, _v); p.setXYZ(i, _v.x, _v.y, _v.z); }
    geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight'); geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox();
    parts.push({ geo, mat: m.material });
  }
  return (per[key] = parts);
}
/**
 * Animals standing still. items: [{ x, z, rot, s?, tint? [r, g, b], u0?, u1? }]; o: { graze (0 = head up, about 1.5 = muzzle in the grass), g (stride) }.
 * Returns { meshes, update(u) }.
 */
export function standing(world, make, items, { graze = 0, g = 0.9 } = {}) {
  const parts = bake(make, graze, g), meshes = parts.map(({ geo, mat }, k) => {
    const m = new THREE.InstancedMesh(geo, mat, items.length); m.castShadow = k === 0; m.receiveShadow = true; m.frustumCulled = false;
    items.forEach((it, i) => m.setColorAt(i, it.tint && k === 0 ? _c.setRGB(...it.tint) : _c.setRGB(1, 1, 1)));
    return m;
  });
  for (let k = 1; k < meshes.length; k++) meshes[k].instanceMatrix = meshes[0].instanceMatrix;
  let lastU = null, lastV = -1;
  return {
    meshes,
    update(u) {
      if (u === lastU && world.shapeVersion === lastV) return; lastU = u; lastV = world.shapeVersion;
      let n = 0;
      for (const it of items) {
        if (u < (it.u0 ?? -Infinity) || u >= (it.u1 ?? Infinity)) continue;
        const s = it.s || 1; _m.compose(_p.set(it.x, world.heightAt(it.x, it.z), it.z), _q.setFromAxisAngle(UP, it.rot || 0), _s.set(s, s, s)); meshes[0].setMatrixAt(n, _m);
        meshes[0].setColorAt(n, it.tint ? _c.setRGB(it.tint[0], it.tint[1], it.tint[2]) : _c.setRGB(1, 1, 1)); n++;
      }
      for (const m of meshes) { m.count = n; m.visible = n > 0; }
      meshes[0].instanceMatrix.needsUpdate = true; if (meshes[0].instanceColor) meshes[0].instanceColor.needsUpdate = true;
    },
  };
}

/** A closed path's length table. */
export function loopOf(path) {
  const pts = path.slice(); if (Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) > 1e-3) pts.push(pts[0]);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
export function onLoop(lp, d, out) {
  d = ((d % lp.L) + lp.L) % lp.L; let i = 0; const n = lp.cum.length - 1; while (i < n - 1 && lp.cum[i + 1] < d) i++;
  const t = (d - lp.cum[i]) / (lp.cum[i + 1] - lp.cum[i] || 1), p = lp.pts[i], q = lp.pts[i + 1];
  out[0] = p[0] + (q[0] - p[0]) * t; out[1] = p[1] + (q[1] - p[1]) * t; return out;
}
const _a = [0, 0], _b = [0, 0], _o = [0, 0];
/**
 * Animals walking round closed paths, in step with actors given the same path, speed and phase.
 * list: [{ make, path, speed, phase (0..1), ahead (m further along than the phase says), side (m to the left), s, u0, u1, y }]
 * Returns { update(u, t) }; the animals are added to `group`.
 */
export function drove(world, group, list) {
  const items = list.map((o) => { const a = o.make(), s = o.s || 1; a.obj.scale.setScalar(s); a.obj.visible = false; group.add(a.obj); a.ph = (o.phase || 0) * 40; return { ...o, a, s, lp: o.lp || loopOf(o.path), half: a.def.half * s }; });
  return {
    items,
    update(u, t) {
      for (const it of items) {
        const on = !(u < (it.u0 ?? -Infinity) || u >= (it.u1 ?? Infinity)); it.a.obj.visible = on; if (!on) continue;
        const d = (it.phase || 0) * it.lp.L + it.speed * t + (it.ahead || 0);
        onLoop(it.lp, d, _o); onLoop(it.lp, d - it.half, _a); onLoop(it.lp, d + it.half, _b);
        let dx = _b[0] - _a[0], dz = _b[1] - _a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const x = (_a[0] + _b[0]) / 2 + dz * (it.side || 0), z = (_a[1] + _b[1]) / 2 - dx * (it.side || 0);
        it.a.obj.position.set(x, world.heightAt(x, z) + (it.y || 0), z); it.a.obj.rotation.y = Math.atan2(-dz, dx);
        it.x = x; it.z = z; it.dx = dx; it.dz = dz;
        const G = it.a.def.gait; pose(it.a, (TAU * G.duty * d) / (G.stride * it.s) + it.a.ph, t);
      }
    },
  };
}
