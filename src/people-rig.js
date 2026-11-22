// The actors' skeleton: a pose is solved on the CPU (feet and hands by two-bone IK) and applied per vertex on the GPU.
import * as THREE from 'three';
import { HIP, KNEE, ANKLE, SHOULDER, ELBOW } from './people-body.js?v=c0a40a57';

const V = THREE.Vector3, Q = THREE.Quaternion;
/** Where the spine bends, where a hand grips (x, y, and z beyond the shoulder line), and the half-width between the hip joints. */
export const WAIST = new V(-0.02, 1.06, 0), PALM = [0.012, 0.795, 0.033], LEGZ = 0.089;
const UPPER = SHOULDER - ELBOW, FORE = ELBOW - PALM[1], THIGH = HIP - KNEE, SHIN = KNEE - ANKLE, HIPV = new V(0, HIP, 0);
const X = new V(1, 0, 0), Y = new V(0, 1, 0), Z = new V(0, 0, 1);
/** Floats of pose per actor sent to the shader: seven texels. */
export const POSE_SIZE = 28;

// =====================================================================================
// Vertex shader: joint rotations and tints arrive in a float texture, one row of texels per actor
// =====================================================================================
// texel 0 = spine (quaternion xyz), head nod | 1, 2 = right, left shoulder (xyz), elbow | 3, 4 = right, left hip (xyz), knee
// 5 = right ankle, left ankle, head turn, right toes | 6 = the held thing against its forearm (xyz), left toes
const RIG = /* glsl */`
  attribute vec3 aRig;
  uniform highp sampler2D uPose;
  vec4 aP0, aP1, aP2, aP3, aP4, aP5, aP6;
  const float HIP = ${HIP}, KNEE = ${KNEE.toFixed(2)}, ANK = ${ANKLE}, SHO = ${SHOULDER}, ELB = ${ELBOW};
  vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(p.x * c - p.y * s, p.x * s + p.y * c); }
  vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
  // a rotation given by the xyz of its unit quaternion (w >= 0), applied by weight w
  vec4 quat(vec3 v, float w) { return normalize(vec4(v * w, mix(1.0, sqrt(max(0.0, 1.0 - dot(v, v))), w))); }
  void turn(inout vec3 p, inout vec3 n, vec3 c, vec4 q) { p = c + qrot(q, p - c); n = qrot(q, n); }
  void bend(inout vec3 p, inout vec3 n, vec2 c, float a) { p.xy = c + rot2(p.xy - c, a); n.xy = rot2(n.xy, a); }
  // thigh and shin of one leg; cloth hanging over a bent leg is drawn in against it by 'hug'
  void leg(inout vec3 p, inout vec3 n, float side, float y, float hug) {
    vec4 L = side > 0.0 ? aP3 : aP4;
    float k = hug * max(smoothstep(0.3, 0.65, length(L.xyz)), smoothstep(0.9, 2.0, L.w) * step(y, KNEE + 0.1));
    p.x = sign(p.x) * mix(abs(p.x), min(abs(p.x), 0.11), k);
    float kn = L.w * (1.0 - smoothstep(KNEE - 0.06, KNEE + 0.06, y));
    p.x += 0.022 * sin(min(L.w, 2.4) * 0.5) * exp(-pow((y - KNEE) / 0.07, 2.0)) * (1.0 - hug);   // the kneecap keeps its shape in a deep bend
    bend(p, n, vec2(0.0, KNEE), -kn);
    turn(p, n, vec3(0.0, HIP, side * ${LEGZ}), quat(L.xyz, 1.0 - smoothstep(HIP - 0.06, HIP + 0.06, y)));
  }
  // aRig.z says how a vertex is coloured: 1 = as painted, otherwise by one of the actor's tints (texels 7…)
  vec3 tintOf(float slot) { return abs(slot - 1.0) < 0.5 ? vec3(1.0) : texelFetch(uPose, ivec2(7 + int(max(0.0, slot - 1.0) + 0.5), gl_InstanceID), 0).rgb; }
  vec3 rig(vec3 p, inout vec3 n) {
    #ifdef USE_INSTANCING
      float limb = aRig.x, y = p.y, chest = 0.0, crown = 0.0;
      if (limb > 8.5) return p;   // things standing on the ground
      aP0 = texelFetch(uPose, ivec2(0, gl_InstanceID), 0); aP1 = texelFetch(uPose, ivec2(1, gl_InstanceID), 0); aP2 = texelFetch(uPose, ivec2(2, gl_InstanceID), 0); aP3 = texelFetch(uPose, ivec2(3, gl_InstanceID), 0);
      aP4 = texelFetch(uPose, ivec2(4, gl_InstanceID), 0); aP5 = texelFetch(uPose, ivec2(5, gl_InstanceID), 0); aP6 = texelFetch(uPose, ivec2(6, gl_InstanceID), 0);
      if (limb == 1.0) {
        float s = aRig.y; vec2 f = s > 0.0 ? aP5.xw : vec2(aP5.y, aP6.w);
        bend(p, n, vec2(0.125, 0.012), f.y * smoothstep(0.105, 0.145, p.x) * step(y, ANK + 0.03));   // toes stay flat while the heel lifts
        bend(p, n, vec2(0.0, ANK), f.x * (1.0 - smoothstep(ANK - 0.005, ANK + 0.05, y)));
        leg(p, n, s, y, 0.0);
        return p;
      }
      if (limb == 2.0 || limb == 4.0 || limb == 5.0 || limb == 8.0) {   // an arm, or something in its hand
        float s = sign(aRig.y), part = limb == 2.0 || limb == 8.0 ? 1.0 : 0.0; vec4 A = s > 0.0 ? aP1 : aP2;
        if (limb == 4.0) turn(p, n, vec3(${PALM[0]}, ${PALM[1]}, aRig.y + s * ${PALM[2]}), quat(aP6.xyz, 1.0));
        bend(p, n, vec2(0.0, ELB), A.w * mix(1.0, 1.0 - smoothstep(ELB - 0.05, ELB + 0.05, y), part));
        turn(p, n, vec3(0.0, SHO, aRig.y), quat(A.xyz, mix(1.0, 1.0 - smoothstep(SHO - 0.03, SHO + 0.05, y), part)));
        chest = 1.0;
      } else if (limb == 3.0 && y < HIP + 0.05) {   // cloth below the hips goes with the leg under it
        vec3 a = p, b = p, na = n, nb = n; leg(a, na, 1.0, y, 1.0); leg(b, nb, -1.0, y, 1.0);
        float m = smoothstep(-0.07, 0.07, p.z), k = aRig.y * (1.0 - smoothstep(HIP - 0.16, HIP + 0.05, y));
        vec3 c = mix(b, a, m); float ca = mix(c.x, a.x, smoothstep(-0.1, 0.03, p.z)), cb = mix(c.x, b.x, 1.0 - smoothstep(-0.03, 0.1, p.z));
        c.x = p.x > 0.0 ? max(c.x, max(ca, cb)) : min(c.x, min(ca, cb));   // between the legs the leading one carries the front of the cloth, the trailing one the back
        p = mix(p, c, k); n = normalize(mix(n, mix(nb, na, m), k));
      }
      if (limb == 6.0) chest = 1.0;
      if (limb == 7.0) crown = 1.0;
      if (chest < 0.5) {
        float h = max(crown, smoothstep(1.47, 1.56, y)), c = cos(aP5.z * h), s = sin(aP5.z * h); vec3 neck = vec3(-0.01, 1.5, 0.0);
        p -= neck; p.xy = rot2(p.xy, -aP0.w * h); n.xy = rot2(n.xy, -aP0.w * h);
        p.xz = vec2(p.x * c + p.z * s, p.z * c - p.x * s); n.xz = vec2(n.x * c + n.z * s, n.z * c - n.x * s); p += neck;
      }
      turn(p, n, vec3(${WAIST.x}, ${WAIST.y}, 0.0), quat(aP0.xyz, max(chest, smoothstep(0.98, 1.32, y))));
    #endif
    return p;
  }
`;
const KINDS = { body: { roughness: 0.78 }, cloth: { roughness: 0.85 }, gloss: { roughness: 0.22 }, skin: { roughness: 0.6 }, hair: { roughness: 0.7 }, metal: { roughness: 0.45, metalness: 0.5 }, prop: { roughness: 0.8 }, glow: null };
/** A material for one kind of surface of a person; 'glow' is unlit. */
export const surface = (kind) => (KINDS[kind] ? new THREE.MeshStandardMaterial({ vertexColors: true, ...KINDS[kind] }) : new THREE.MeshBasicMaterial({ vertexColors: true }));
/**
 * A material for one group of actors, whose poses are the rows of the texture `pose` (they all compile to the same few programs).
 * userData.depth is its shadow twin.
 */
export function rigMat(kind, pose) {
  const m = surface(kind), uPose = { value: pose };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPose = uPose;
    sh.vertexShader = RIG + sh.vertexShader
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING\n vColor.xyz *= tintOf(aRig.z);\n#endif')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vec3 rigged = rig(position, objectNormal);')
      .replace('#include <begin_vertex>', KINDS[kind] ? 'vec3 transformed = rigged;' : 'vec3 up = vec3(0.0, 1.0, 0.0); vec3 transformed = rig(position, up);');
  };
  const depth = m.userData.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => { sh.uniforms.uPose = uPose; sh.vertexShader = RIG + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 up = vec3(0.0, 1.0, 0.0); vec3 transformed = rig(position, up);'); };
  return m;
}

// =====================================================================================
// Pose: what an action asks of the body, in the actor's own space (x forward, y up from the ground, z to its right; metres)
// =====================================================================================
const fract = (v) => v - Math.floor(v), ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2, STANCE = 0.62;
const _q = new Q(), _ql = new Q(), _t = new Q(), _ri = new Q(), _si = new Q(), _ch = new Q(), _v = new V(), _s = new V(), _d = new V(), _pp = new V(), _h = new V(), _x = new V(), _y = new V(), _m = new THREE.Matrix4(), _e = new THREE.Euler();
/** A planted or swinging foot, u = 0..1 through the gait cycle: [ankle x from the hip, ankle height, pitch, toe bend] (the walk shader's maths). */
function footAt(u, stride, out) {
  const planted = (t, o) => {
    const f = 0.32 * (1 - ss(0, 0.2, t)) - 0.95 * ss(0.58, 1, t) ** 1.3, px = f > 0 ? -0.055 : 0.125, c = Math.cos(f), s = Math.sin(f);
    o[0] = -0.07 + stride * STANCE * (0.5 - t) + px - px * c - ANKLE * s; o[1] = -px * s + ANKLE * c; o[2] = f; o[3] = Math.max(0, -f); return o;
  };
  if (u < STANCE) return planted(u / STANCE, out);
  const s = (u - STANCE) / (1 - STANCE), a = planted(1, [0, 0, 0, 0]), b = planted(0, out), m = (p, q, t) => p + (q - p) * t;
  out[0] = m(a[0], b[0], m(s, ss(0, 1, s), 0.6)); out[1] = m(a[1], b[1], ss(0, 0.9, s)) + 0.055 * Math.sin(Math.PI * s ** 0.8); out[2] = m(a[2], b[2], ss(0.1, 0.8, s)); out[3] = a[3] * (1 - ss(0, 0.3, s));
  return out;
}
const _f = [0, 0, 0, 0];

export class Pose {
  constructor() {
    this.hip = new V(); this.root = new Q(); this.spine = new Q(); this.tool = new Q();
    this.foot = [0, 1].map(() => ({ p: new V(), pole: new V(), pitch: 0, toe: 0, free: null }));
    this.hand = [0, 1].map(() => ({ p: new V(), pole: new V(), fk: [0, 0, 0, 0], ik: false }));
    this.rest();
  }
  /** Standing at ease. Limbs are indexed 0 = right, 1 = left. */
  rest() {
    this.hip.set(0, HIP, 0); this.root.identity(); this.spine.identity(); this.tool.identity(); this.nod = this.look = 0;
    for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; this.stand(i, 0, s * LEGZ); this.swing(i, 0.03, 0.05, 0, 0.18); this.hand[i].pole.set(-0.5, -0.6, s * 0.6); }
    return this;
  }
  /** Pelvis: where the hip joints' midpoint is, leaning forward, turned to its left, tilted to its right (radians). */
  pelvis(x, y, z, lean = 0, turn = 0, tilt = 0) { this.hip.set(x, y, z); this.root.setFromEuler(_e.set(tilt, turn, -lean, 'YZX')); return this; }
  /** Spine: bent forward, twisted to the left, leaning to the right. */
  back(bend, twist = 0, side = 0) { this.spine.setFromEuler(_e.set(side, twist, -bend, 'YZX')); return this; }
  /** Head: nodding down, turned to the left. */
  face(nod, look = 0) { this.nod = nod; this.look = look; return this; }
  /** A foot with its ankle at (x, y, z), pitched toes-up; the knee points along the pole (in the pelvis's frame). */
  step(i, x, y, z, pitch = 0, toe = 0, px = 1, py = 0, pz = 0) { const f = this.foot[i]; f.p.set(x, y, z); f.pitch = pitch; f.toe = toe; f.free = null; f.pole.set(px, py, pz); return this; }
  /** A foot flat on the ground. */
  stand(i, x, z, px = 1, py = 0, pz = 0) { return this.step(i, x, ANKLE, z, 0, 0, px, py, pz); }
  /** As step(), but the ankle joint is given directly (for feet that are not on the ground). */
  loose(i, x, y, z, ankle, px = 1, py = 0, pz = 0) { this.step(i, x, y, z, 0, 0, px, py, pz); this.foot[i].free = ankle; return this; }
  /** A hand reaching for a point; the elbow points along the pole (in the chest's frame). */
  reach(i, x, y, z, px = -0.5, py = -0.6, pz = 0.6) { const h = this.hand[i]; h.p.set(x, y, z); h.pole.set(px, py, (i ? -1 : 1) * pz); h.ik = true; return this; }
  /** An arm by its joints: swung forward, raised sideways, twisted inward, elbow bent. */
  swing(i, fwd, out = 0.05, twist = 0, elbow = 0.18) { const h = this.hand[i]; h.fk[0] = fwd; h.fk[1] = out; h.fk[2] = twist; h.fk[3] = elbow; h.ik = false; return this; }
  /** Point the held thing: its long axis (+y) along d, its working edge (+x) towards e. */
  aim(dx, dy, dz, ex = 1, ey = 0, ez = 0) {
    _y.set(dx, dy, dz).normalize(); _x.set(ex, ey, ez); _x.addScaledVector(_y, -_x.dot(_y)).normalize(); _h.crossVectors(_x, _y);
    this.tool.setFromRotationMatrix(_m.makeBasis(_x, _y, _h)); return this;
  }
  /** Both hands on a shaft: the tool hand at (x, y, z), the other `gap` metres along it (negative = towards the butt). */
  grip(i, x, y, z, dx, dy, dz, gap, ex, ey, ez) {
    this.aim(dx, dy, dz, ex, ey, ez); const n = gap / Math.hypot(dx, dy, dz);
    this.reach(i, x, y, z); if (gap) this.reach(1 - i, x + dx * n, y + dy * n, z + dz * n); return this;
  }
  /** Walking: `ph` is the distance covered in strides. Sets pelvis, feet and swinging arms; `drop` lowers the hips, `lean` tips the body forward. */
  gait(ph, stride, drop = 0, lean = 0.045, width = LEGZ) {
    if (ph === null) return this.pelvis(0.02, HIP - 0.012 - drop * 1.1, 0, lean).stand(0, -0.12 - drop, width + 0.02).stand(1, 0.14 + drop, -width - 0.02);   // not going anywhere: a braced stance
    const u = fract(ph);
    this.pelvis(0, HIP - 0.024 - drop - 0.0155 * stride * Math.cos(2 * TAU * (u - 0.04)), 0.016 * Math.sin(TAU * (u - 0.05)), lean).back(0, 0.07 * Math.cos(TAU * u));
    for (let i = 0; i < 2; i++) {
      const m = fract(ph + i * 0.5), F = footAt(m, stride, _f), sw = 0.04 - 0.36 * Math.cos(TAU * m);
      this.step(i, F[0], F[1], (i ? -1 : 1) * width, F[2], F[3]); this.swing(i, sw, 0.04, 0, 0.16 + 0.4 * ss(-0.4, 0.4, sw));
    }
    return this;
  }

  /**
   * Solve the joints and write them to arr[o .. o + 28). `armZ` is the outfit's shoulder half-width, `side` the hand (0 right, 1 left)
   * holding the tool. Afterwards this.root / this.hip place the pelvis: world = hip + root · (rest − (0, HIP, 0)).
   */
  solve(arr, o, armZ, side) {
    const put = (k, q, w) => { const s = q.w < 0 ? -1 : 1; arr[o + k] = q.x * s; arr[o + k + 1] = q.y * s; arr[o + k + 2] = q.z * s; arr[o + k + 3] = w; };
    _ri.copy(this.root).invert(); _si.copy(this.spine).invert(); _ch.copy(this.root).multiply(this.spine);
    put(0, this.spine, this.nod);
    for (let i = 0; i < 2; i++) {   // legs, in the pelvis's frame
      const f = this.foot[i], s = i ? -1 : 1;
      _v.copy(f.p).sub(this.hip).applyQuaternion(_ri).add(HIPV);
      const knee = ik(_s.set(0, HIP, s * LEGZ), _v, f.pole, THIGH, SHIN, -1, _ql);
      put(12 + i * 4, _ql, knee);
      let ankle = f.free;
      if (ankle === null) {   // pitch the foot against whatever the shin is doing; of the two solutions take the one an ankle can reach
        _t.copy(this.root).multiply(_ql).multiply(_q.setFromAxisAngle(Z, -knee));
        const xs = _x.copy(X).applyQuaternion(_t).y, ys = _y.copy(Y).applyQuaternion(_t).y, r = Math.hypot(xs, ys) || 1, a = Math.asin(Math.max(-1, Math.min(1, Math.sin(f.pitch) / r))), d = Math.atan2(xs, ys);
        const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v)), a1 = wrap(a - d), a2 = wrap(Math.PI - a - d);
        ankle = Math.abs(a1 + 0.4) < Math.abs(a2 + 0.4) ? a1 : a2;
      }
      arr[o + 20 + i] = ankle; arr[o + (i ? 27 : 23)] = f.toe;
    }
    for (let i = 0; i < 2; i++) {   // arms, in the chest's frame
      const h = this.hand[i], s = i ? -1 : 1; let elbow = h.fk[3];
      if (h.ik) {
        _v.copy(h.p).sub(this.hip).applyQuaternion(_ri).add(HIPV).sub(WAIST).applyQuaternion(_si).add(WAIST);
        elbow = ik(_s.set(0, SHOULDER, s * armZ), _v, h.pole, UPPER, FORE, 1, _ql);
      } else _ql.setFromEuler(_e.set(-s * h.fk[1], -s * h.fk[2], h.fk[0], 'XZY'));
      put(4 + i * 4, _ql, elbow);
      if (i === side) put(24, _t.copy(_ch).multiply(_ql).multiply(_q.setFromAxisAngle(Z, elbow)).invert().multiply(this.tool), arr[o + 27]);
    }
    arr[o + 22] = this.look;
  }
}
/** Two-bone IK from joint S to target T: sets q to the upper bone's rotation from rest (hanging down, hinge on z) and returns the hinge's flexion. dir = 1 elbow, -1 knee. */
function ik(S, T, pole, l1, l2, dir, q) {
  _d.copy(T).sub(S); const far = _d.length() || 1e-6, len = Math.max(Math.abs(l1 - l2) + 0.02, Math.min(far, (l1 + l2) * 0.999));
  _d.multiplyScalar(1 / far);
  _pp.copy(pole).addScaledVector(_d, -pole.dot(_d)); if (_pp.lengthSq() < 1e-6) _pp.set(_d.y, -_d.x, 0.01); _pp.normalize();
  const a = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  _y.copy(_d).multiplyScalar(-a).addScaledVector(_pp, -h).normalize();   // from the hinge back up to the joint
  _h.crossVectors(_pp, _d).multiplyScalar(dir).normalize(); _x.crossVectors(_y, _h);
  q.setFromRotationMatrix(_m.makeBasis(_x, _y, _h));
  return Math.PI - Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - len * len) / (2 * l1 * l2))));
}
