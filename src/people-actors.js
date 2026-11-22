// Actors: people who do things, anywhere — farm, carry, build, hunt, pray — each in the dress of their time.
//   const site = actors(world, [{ outfit: 'neolithic', action: 'reap', x: 12, z: -4, rot: 1.2 }, …]); scene.add(...site.meshes);
//   each frame: site.update(u, t, view)
import * as THREE from 'three';
import { rng } from './util.js?v=fea1c89f';
import { HIP, HELD, GRIP, CHEST, CROWN, join } from './people-body.js?v=fea1c89f';
import { OUTFITS as OUTFIT, personOf } from './people-outfits.js?v=fea1c89f';
import { PROPS as PROP } from './people-props.js?v=fea1c89f';
import { ACTION } from './people-actions.js?v=fea1c89f';
import { Pose, rigMat, POSE_SIZE, PALM } from './people-rig.js?v=fea1c89f';

/** The names an actor can use: `outfit`, `action`, and `prop` (several props joined with '+', or 'none'). */
export const OUTFITS = Object.keys(OUTFIT).filter((k) => !OUTFIT[k].walkOnly), ACTIONS = Object.keys(ACTION), PROPS = Object.keys(PROP);

// =====================================================================================
// Default looks: cloth and skin tones for each outfit's time and place (sRGB here, linear when used)
// =====================================================================================
const SKIN = {
  africa: [[0.36, 0.24, 0.17], [0.3, 0.2, 0.14], [0.42, 0.28, 0.19], [0.26, 0.17, 0.13]],
  iceage: [[0.55, 0.38, 0.27], [0.48, 0.33, 0.23], [0.62, 0.45, 0.33]],
  levant: [[0.74, 0.54, 0.4], [0.68, 0.48, 0.34], [0.8, 0.6, 0.45], [0.6, 0.42, 0.3]],
  nile: [[0.66, 0.44, 0.3], [0.58, 0.38, 0.26], [0.72, 0.5, 0.35], [0.48, 0.32, 0.22], [0.4, 0.27, 0.19]],
  med: [[0.82, 0.62, 0.48], [0.74, 0.54, 0.4], [0.88, 0.68, 0.54], [0.66, 0.46, 0.33], [0.55, 0.38, 0.27]],
  north: [[0.92, 0.74, 0.62], [0.88, 0.68, 0.54], [0.94, 0.8, 0.7], [0.82, 0.62, 0.48]],
  america: [[0.62, 0.43, 0.3], [0.68, 0.48, 0.34], [0.56, 0.38, 0.27]],
  all: [[0.96, 0.78, 0.66], [0.88, 0.68, 0.54], [0.74, 0.54, 0.4], [0.55, 0.38, 0.27], [0.4, 0.27, 0.19], [0.94, 0.8, 0.7]],
};
// hair is tinted from a mid brown: black, near black, dark brown, brown, auburn, blond, grey
const HAIRS = [[0.25, 0.25, 0.3], [0.4, 0.4, 0.42], [0.6, 0.6, 0.6], [1, 1, 1], [2.6, 1.2, 0.7], [5, 4, 2.4], [5, 5.5, 6.5]];
const HIDES = [0x8a6a48, 0x7a5a3a, 0x9a7a52, 0x6a4a30], WOOL = [0xc8bca0, 0xb0a080, 0x9a8a68, 0x8a7458, 0xd8d0b8, 0x7a6048], LINEN = [0xe8e2d4, 0xf0ece0, 0xdcd4c0], DYED = [0xe8e2d4, 0xd8c8a0, 0xb86a3a, 0x8a3a2a, 0x4a5a7a, 0xc8b890],
  HOMESPUN = [0x6a5a3a, 0x7a3a2a, 0x3a4a6a, 0x4a5a3a, 0x8a7a58, 0x5a3a4a, 0x9a8a68], DARK = [0x1c1c20, 0x2a2420, 0x30343c, 0x3a3028], RAIN = [0x8aa8b8, 0xb8b8c4, 0xc0a0b4, 0x9cc0b0, 0xc4bc88, 0x70707c],
  STREET = [0x2a2a30, 0x3a4a6a, 0x7a2a2a, 0xc8c0b0, 0x4a6a4a, 0x808890, 0x7a4a6a], NEON = [[0.1, 1.5, 1.8], [1.9, 0.15, 1.1], [1.8, 1.4, 0.15], [0.3, 1.8, 0.45], [1.9, 0.45, 0.12]];
/** outfit → [tint palette, legs palette, skin tones, how many of the hair colours occur] */
const LOOK = {
  paleo: [HIDES, HIDES, 'africa', 1], 'paleo-f': [HIDES, HIDES, 'africa', 1], iceage: [HIDES, HIDES, 'iceage', 3], 'iceage-f': [HIDES, HIDES, 'iceage', 3],
  neolithic: [WOOL, WOOL, 'levant', 3], 'neolithic-f': [WOOL, WOOL, 'levant', 3], sumerian: [WOOL, WOOL, 'levant', 2], 'sumerian-priest': [WOOL, WOOL, 'levant', 2], 'sumerian-f': [WOOL, WOOL, 'levant', 2],
  egyptian: [LINEN, LINEN, 'nile', 1], 'egyptian-f': [LINEN, LINEN, 'nile', 1], overseer: [LINEN, LINEN, 'nile', 1], pharaoh: [LINEN, LINEN, 'nile', 1],
  greek: [DYED, LINEN, 'med', 3], 'greek-f': [DYED, LINEN, 'med', 3], himation: [DYED, LINEN, 'med', 3], hoplite: [[0x8a1c14, 0x7a2018, 0x2a3a6a], LINEN, 'med', 3],
  roman: [[0xd8d0bc, 0xb8a888, 0x8a5a3a, 0x7a2a22, 0x4a5a4a, 0xc8b080], LINEN, 'med', 4], 'roman-f': [[0xd8d0bc, 0xc8b080, 0xb8a888, 0xd8c8a0], [0x7a2a22, 0x4a5a7a, 0xb86a3a, 0x4a5a4a, 0x8a5a7a], 'med', 4],
  toga: [[0xf0ece0, 0xe8e0cc], LINEN, 'med', 4], legionary: [[0x8a1c14, 0x7a2018], LINEN, 'med', 4],
  medieval: [HOMESPUN, [0x4a3c30, 0x5a5648, 0x3a3028, 0x6a5a4a], 'north', 7], 'medieval-f': [HOMESPUN, HOMESPUN, 'north', 7], monk: [[0x2a2420, 0x3a3028, 0x4a4038], [0x2a2420], 'north', 7], knight: [[0x8a1c14, 0x1c3a8a, 0xd8d0bc, 0x2a5a2a, 0xc8a030], DARK, 'north', 7],
  raincoat: [RAIN, DARK, 'all', 7], 'raincoat-f': [RAIN, DARK, 'all', 7], native: [HIDES, HIDES, 'america', 1],
};
const DRAB = [0x3a3632, 0x4a4238, 0x2e3038, 0x5a4e40, 0x3c4438, 0x6a5e4e];
LOOK.georgian = [DRAB, [0x6a5e4e, 0x3a3632, 0x8a8068], 'north', 7]; LOOK.millhand = [DRAB, DRAB, 'north', 7];
const PLAIN = [STREET, DARK, 'all', 7];

// =====================================================================================
// Geometry for one group: everybody with the same outfit and the same things in hand
// =====================================================================================
const GROUND = 9, TINTS = ['tint', 'legs', 'skin', 'hair', 'glow'], ROW = POSE_SIZE + TINTS.length * 4;
const groupGeo = {}, bodies = {};
/** Say which of the actor's tints a geometry's tinted vertices take (aRig.z: 1 = their own colour, 0 = tint, 2… = the rest of TINTS). */
function tinted(g, key) { const rig = g.attributes.aRig, n = TINTS.indexOf(key); for (let i = 0; i < rig.count; i++) if (rig.getZ(i) < 0.5) rig.setZ(i, n && n + 1); return g; }
/** Cloth, skin and hair of an outfit as one geometry, so a group's bodies are one draw call. */
const bodyOf = (outfit, g) => bodies[outfit] || (bodies[outfit] = join([g.gloss ? null : g.top, g.bottom, g.skin, g.hair].map((p, i) => p && tinted(p.clone(), TINTS[i])).filter(Boolean)));
/** Set every vertex's limb and side, keeping its `fixed` flag. */
function attach(g, limb, side) { const rig = g.attributes.aRig; for (let i = 0; i < rig.count; i++) rig.setXY(i, limb, side); return g; }
/** Mirror a geometry to the other side of the body. */
function mirrored(g) { g.scale(1, 1, -1); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } return g; }
/** The outfit plus the props, as [{ geo, kind, ground }]; `tool` says whether a hand is holding something. */
function groupParts(outfit, prop, left) {
  const key = outfit + '|' + prop + '|' + left; if (groupGeo[key]) return groupGeo[key];
  const g = personOf(outfit), s = left ? -1 : 1, held = { prop: [], glow: g.glow ? [tinted(g.glow.clone(), 'glow')] : [] }, ground = { prop: [], glow: [] }; let tool = false;
  for (const name of prop.split('+')) for (const [where, geo, kind = 'prop'] of PROP[name] ? PROP[name](s) : []) {
    tinted(geo, 'glow');
    if (where === 'tool') { held[kind].push(attach(geo.translate(PALM[0], PALM[1], s * (g.armZ + PALM[2])), HELD, s * g.armZ)); tool = true; }
    else if (where === 'off') held[kind].push(attach((s > 0 ? mirrored(geo) : geo).translate(PALM[0], PALM[1], -s * (g.armZ + PALM[2])), GRIP, -s * g.armZ));
    else if (where === 'ground') ground[kind].push(attach(geo, GROUND, 0));
    else held[kind].push(attach(geo, where === 'head' ? CROWN : CHEST, 0));
  }
  const all = (list) => (list.length ? join(list) : null);
  const parts = [{ geo: bodyOf(outfit, g), kind: 'body' }, { geo: g.gloss && g.top, kind: 'gloss' }, { geo: g.metal, kind: 'metal' },
    { geo: all(held.prop), kind: 'prop' }, { geo: all(held.glow), kind: 'glow' }, { geo: all(ground.prop), kind: 'prop', ground: true }, { geo: all(ground.glow), kind: 'glow', ground: true }].filter((p) => p.geo);
  return (groupGeo[key] = { parts, tool, armZ: g.armZ, stride: g.stride, f: g.f });
}

// =====================================================================================
// actors()
// =====================================================================================
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color(), _sphere = new THREE.Sphere();
const WHITE = [1, 1, 1];
const UP = new THREE.Vector3(0, 1, 0), HIPV = new THREE.Vector3(0, HIP, 0), P = new Pose(), _at = [0, 0], _a = [0, 0], _b = [0, 0];
const SHADOW_REACH = 70;   // as for Movers: actors this close stay drawn behind the camera so their shadows do not vanish
/** A point `d` metres along a path, going there and back unless it is a loop. */
function along(a, d, out) {
  const n = a.cum.length - 1, L = a.cum[n]; d = ((d % a.route) + a.route) % a.route; if (d > L) d = 2 * L - d;
  let i = 0; while (i < n - 1 && a.cum[i + 1] < d) i++;
  const t = (d - a.cum[i]) / (a.cum[i + 1] - a.cum[i] || 1), p = a.path[i], q = a.path[i + 1];
  out[0] = p[0] + (q[0] - p[0]) * t; out[1] = p[1] + (q[1] - p[1]) * t; return out;
}
/**
 * list: [{ outfit, action, x, z, rot, s?, prop?, path?, speed?, phase?, u0?, u1?, tint?, legs?, skin?, hair?, glow?, seat?, y?, afloat? }]
 *   x, z: where the actor stands (metres); rot: heading about +y (0 = facing +x); s: scale (about 1 by default, a little varied).
 *   prop: overrides the action's own (names joined with '+', or 'none'). u0, u1: the span of the timeline (slider units) it is there for.
 *   path: [[x, z] …] to walk along and back (a loop if the last point equals the first) at `speed` m/s, for the walking actions.
 *   phase: 0..1, where in its cycle (and along its path) it starts. tint / legs / skin / hair / glow: linear RGB, chosen to suit the outfit if absent.
 *   seat: height sat on (sit, potter, row, paddle). y: height above the ground (a mount's back, a boat's floor). afloat: stands on the sea when it covers the ground.
 * opts: { seed = 1, seat = 0, cast = true (shadows) }
 * Returns { meshes, update(u, t, view) }; view = { frustum, eye } culls as Movers does.
 */
/** Every group of actors that is on screen, with where each of its people stands (for the sounds they make). */
export const LIVE = new Set();
export function actors(world, list, { seed = 1, seat = 0, cast = true } = {}) {
  const r = rng(seed), pick = (pal) => pal[Math.floor(r() * pal.length)], lin = (h) => { _c.set(h); return [_c.r, _c.g, _c.b]; }, byKey = new Map();
  for (const a of list) {
    const act = ACTION[a.action] || ACTION.stand, outfit = OUTFIT[a.outfit] ? a.outfit : 'modern', kit = OUTFIT[outfit].kit || {};
    const prop = a.prop === undefined ? (act.prop || 'none').split('+').map((n) => kit[n] || n).join('+') : a.prop || 'none', key = outfit + '|' + prop + '|' + (act.left ? 1 : 0);
    if (!byKey.has(key)) byKey.set(key, { ...groupParts(outfit, prop, act.left ? 1 : 0), items: [] });
    const G = byKey.get(key), look = LOOK[outfit] || PLAIN, it = {
      act, x: a.x, z: a.z, rot: a.rot || 0, y: a.y || 0, afloat: !!a.afloat, s: a.s || (G.f ? 0.93 : 1) * (0.95 + r() * 0.1), u0: a.u0 ?? -Infinity, u1: a.u1 ?? Infinity, phase: a.phase ?? r(),
      tint: a.tint || lin(pick(look[0])), legs: a.legs || lin(pick(look[1])), skin: a.skin || pick(SKIN[look[2]]).map((v) => v ** 2.2), hair: a.hair || HAIRS[Math.floor(r() ** 1.5 * look[3])], glow: a.glow || pick(NEON),
      w: { ph: null, moving: false, stride: G.stride * (act.walk || 1), seat: a.seat ?? act.seat ?? seat, tool: G.tool, prop },
    };
    if (a.path && a.path.length > 1 && act.walk) {
      it.path = a.path; it.cum = [0]; for (let i = 1; i < a.path.length; i++) it.cum.push(it.cum[i - 1] + Math.hypot(a.path[i][0] - a.path[i - 1][0], a.path[i][1] - a.path[i - 1][1]));
      const L = it.cum[it.cum.length - 1], loop = Math.hypot(a.path[0][0] - a.path[a.path.length - 1][0], a.path[0][1] - a.path[a.path.length - 1][1]) < 1e-3;
      it.route = loop ? L : 2 * L; it.loop = loop; it.speed = a.speed || 1.25 * (act.walk || 1);
    }
    G.items.push(it);
  }
  const groups = [...byKey.values()], meshes = [];
  for (const G of groups) {
    const n = G.items.length, pose = G.pose = new THREE.DataTexture(new Float32Array(n * ROW), ROW / 4, n, THREE.RGBAFormat, THREE.FloatType), byKind = {};   // a row per actor: its pose, then its tints
    G.meshes = [];
    for (const part of G.parts) {
      const mat = byKind[part.kind] || (byKind[part.kind] = rigMat(part.kind, pose)), m = new THREE.InstancedMesh(part.geo, mat, n); m.frustumCulled = false; m.castShadow = cast && part.kind !== 'glow'; m.receiveShadow = true; m.customDepthMaterial = mat.userData.depth; m.userData.ground = !!part.ground;
      const first = G.meshes.find((o) => o.userData.ground === m.userData.ground); if (first) m.instanceMatrix = first.instanceMatrix;   // the body's parts share one matrix buffer, things on the ground another
      G.meshes.push(m); meshes.push(m);
    }
    G.body = G.meshes.find((m) => !m.userData.ground); G.floor = G.meshes.find((m) => m.userData.ground);
    G.minU = Math.min(...G.items.map((i) => i.u0)); G.maxU = Math.max(...G.items.map((i) => i.u1));
  }
  const groundAt = (x, z, afloat) => { const h = world && world.heightAt ? world.heightAt(x, z) : 0; return afloat && world && world.sea > h ? world.sea : h; };

  function update(u, t, view) {
    for (const G of groups) {
      const on = !(u < G.minU || u >= G.maxU); let k = 0;
      if (on) for (let i = 0; i < G.items.length; i++) {
        const a = G.items[i], w = a.w; if (u < a.u0 || u >= a.u1) continue;
        let x = a.x, z = a.z, rot = a.rot; w.ph = null; w.moving = false;
        if (a.path) {   // where it is along its path, and which way that runs
          const d = a.phase * a.route + a.speed * t;   // along() folds the way back in, so d + 0.3 is always ahead
          along(a, d, _at); along(a, d - 0.3, _a); along(a, d + 0.3, _b); x = _at[0]; z = _at[1];
          if (Math.hypot(_b[0] - _a[0], _b[1] - _a[1]) > 0.05) rot = Math.atan2(_a[1] - _b[1], _b[0] - _a[0]);
          w.ph = d / (w.stride * a.s); w.moving = true;
        }
        const y = groundAt(x, z, a.afloat) + a.y;
        if (np < pts.length / 3) { pts[np * 3] = x; pts[np * 3 + 1] = y + 1.5; pts[np * 3 + 2] = z; np++; }
        if (view) {
          _sphere.center.set(x, y + 1, z); _sphere.radius = 3.6 * a.s;
          const dx = x - view.eye.x, dz = z - view.eye.z;
          if (dx * dx + dz * dz > SHADOW_REACH * SHADOW_REACH && !view.frustum.intersectsSphere(_sphere)) continue;
        }
        const data = G.pose.image.data, row = k * ROW;
        P.rest(); a.act.pose(P, t + a.phase * 20, w); P.solve(data, row, G.armZ, a.act.left ? 1 : 0);
        for (let j = 0; j < TINTS.length; j++) data.set(a[TINTS[j]] || WHITE, row + POSE_SIZE + j * 4);
        _q.setFromAxisAngle(UP, rot); _s.setScalar(a.s);
        if (G.floor) G.floor.setMatrixAt(k, _m.compose(_p.set(x, y, z), _q, _s));
        _p.copy(P.hip).sub(_v.copy(HIPV).applyQuaternion(P.root)).multiplyScalar(a.s).applyQuaternion(_q); _p.x += x; _p.y += y; _p.z += z;
        G.body.setMatrixAt(k, _m.compose(_p, _q.multiply(P.root), _s));
        k++;
      }
      for (const m of G.meshes) { m.count = k; m.visible = k > 0; }
      if (k) { G.pose.needsUpdate = true; G.body.instanceMatrix.needsUpdate = true; if (G.floor) G.floor.instanceMatrix.needsUpdate = true; }
    }
  }
  const pts = new Float32Array(Math.max(3, list.length * 3)); let np = 0;
  const api = { meshes, pts, get np() { return np; }, t: -1, update(u, t, view) { np = 0; api.t = performance.now(); update(u, t, view); } };
  LIVE.add(api);
  return api;
}
