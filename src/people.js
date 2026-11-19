// People: an anatomical figure (about 7.5 heads tall) dressed for its century, walking the streets or standing by a fire.
// The body is in people-body.js, the clothes in people-outfits.js; people who do things other than walk are in people-actors.js.
import * as THREE from 'three';
import { merge } from './util.js';
import { hex } from './organic.js';
import { HIP, KNEE, ANKLE, SHOULDER, ELBOW } from './people-body.js';
import { personOf } from './people-outfits.js';
import { surface } from './people-rig.js';
import { Movers, traffic, CROSS_SPAN } from './movers.js';

// =====================================================================================
// The walk: a gait cycle computed per vertex from the instance's position along its path
// =====================================================================================
const WALK = /* glsl */`
  attribute vec3 aRig;
  uniform float uStride;
  const float HIP = ${HIP}, KNEE = ${KNEE.toFixed(2)}, ANK = ${ANKLE}, SHO = ${SHOULDER}, ELB = ${ELBOW}, TAU = 6.2831853, STANCE = 0.62;
  vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(p.x * c - p.y * s, p.x * s + p.y * c); }
  // A planted foot, t = 0..1 through the stance: ankle position relative to the hip (xy), foot pitch (z, toes up positive), toe bend (w).
  // The foot rolls from the heel on to its sole, then up over the ball; the ground point it rolls over moves back at walking speed, so nothing slides.
  vec4 planted(float t) {
    float f = 0.32 * (1.0 - smoothstep(0.0, 0.2, t)) - 0.95 * pow(smoothstep(0.58, 1.0, t), 1.3), px = f > 0.0 ? -0.055 : 0.125;
    return vec4(vec2(-0.07 + uStride * STANCE * (0.5 - t) + px, 0.0) + rot2(vec2(-px, ANK), f), f, max(0.0, -f));
  }
  vec4 footAt(float u) {
    if (u < STANCE) return planted(u / STANCE);
    float s = (u - STANCE) / (1.0 - STANCE); vec4 a = planted(1.0), b = planted(0.0);   // swing: lift, carry forward, reach for the heel strike
    return vec4(mix(a.x, b.x, mix(s, smoothstep(0.0, 1.0, s), 0.6)), mix(a.y, b.y, smoothstep(0.0, 0.9, s)) + 0.055 * sin(3.14159 * pow(s, 0.8)), mix(a.z, b.z, smoothstep(0.1, 0.8, s)), a.w * (1.0 - smoothstep(0.0, 0.3, s)));
  }
  // two-bone IK from the hip to the ankle: thigh angle, knee flexion, foot pitch, toe bend
  vec4 legPose(float u, float hipY) {
    vec4 F = footAt(u); vec2 d = vec2(F.x, F.y - hipY); float l1 = HIP - KNEE, l2 = KNEE - ANK, len = min(length(d), (l1 + l2) * 0.999);
    return vec4(atan(d.x, -d.y) + acos((l1 * l1 + len * len - l2 * l2) / (2.0 * l1 * len)), 3.14159 - acos((l1 * l1 + l2 * l2 - len * len) / (2.0 * l1 * l2)), F.z, F.w);
  }
  // how far forward a posed leg is at height y
  float legX(vec4 P, float y) { float ky = HIP - (HIP - KNEE) * cos(P.x); return y > ky ? tan(P.x) * (HIP - y) : (HIP - KNEE) * sin(P.x) + tan(P.x - P.y) * (ky - y); }
  void bend(inout vec3 p, inout vec3 n, vec2 pivot, float a) { p.xy = pivot + rot2(p.xy - pivot, a); n.xy = rot2(n.xy, a); }
  vec3 rig(vec3 p, inout vec3 n) {
    #ifdef USE_INSTANCING
      vec3 fw = instanceMatrix[0].xyz, o = instanceMatrix[3].xyz; float sc = length(fw); fw /= sc;
      float ph = dot(o.xz, fw.xz) / (uStride * sc) + fract(dot(o.xz, vec2(-fw.z, fw.x)) * 0.37);   // distance walked, in strides
      float u = fract(ph), mine = fract(ph + (aRig.y > 0.0 ? 0.0 : 0.5)), y = p.y;
      float hipY = HIP - 0.024 - 0.0155 * uStride * cos(2.0 * TAU * (u - 0.04)), sway = 0.016 * sin(TAU * (u - 0.05));   // lowest with both feet down, leaning over the standing leg
      if (aRig.x == 1.0) {
        vec4 P = legPose(mine, hipY);
        bend(p, n, vec2(0.125, 0.012), P.w * smoothstep(0.105, 0.145, p.x) * step(y, ANK + 0.03));   // toes stay flat while the heel lifts
        bend(p, n, vec2(0.0, ANK), (P.z - P.x + P.y) * (1.0 - smoothstep(ANK - 0.005, ANK + 0.05, y)));
        bend(p, n, vec2(0.0, KNEE), -P.y * (1.0 - smoothstep(KNEE - 0.06, KNEE + 0.06, y)));
        bend(p, n, vec2(0.0, HIP), P.x * (1.0 - smoothstep(HIP - 0.06, HIP + 0.06, y)));
        p.y += hipY - HIP; p.z += sway * smoothstep(ANK, HIP, y);
        return p;
      }
      if (aRig.x == 2.0) {   // arms counter-swing, the elbow bending as the hand comes forward
        float sw = 0.04 - 0.36 * cos(TAU * mine);
        bend(p, n, vec2(0.0, ELB), (0.16 + 0.4 * smoothstep(-0.4, 0.4, sw)) * (1.0 - smoothstep(ELB - 0.05, ELB + 0.05, y)));
        bend(p, n, vec2(0.0, SHO), sw * (1.0 - smoothstep(SHO - 0.03, SHO + 0.05, y)));
        y = SHO;
      }
      if (aRig.x == 8.0) {   // an arm held up, carrying an umbrella
        bend(p, n, vec2(0.0, ELB), 1.75 * (1.0 - smoothstep(ELB - 0.05, ELB + 0.05, y)));
        bend(p, n, vec2(0.0, SHO), 0.12 * (1.0 - smoothstep(SHO - 0.03, SHO + 0.05, y)));
        y = SHO;
      }
      if (aRig.x == 3.0 && y < HIP) {   // cloth follows the leg under it; between the legs the leading one carries the front, the trailing one the back
        float a = legX(legPose(u, hipY), y), b = legX(legPose(fract(u + 0.5), hipY), y), c = mix(b, a, smoothstep(-0.05, 0.05, p.z));
        float ca = mix(c, a, smoothstep(-0.1, 0.03, p.z)), cb = mix(c, b, 1.0 - smoothstep(-0.03, 0.1, p.z));
        p.x += (p.x > 0.0 ? max(c, max(ca, cb)) : min(c, min(ca, cb))) * aRig.y;
      }
      float yaw = -0.07 * cos(TAU * u) * smoothstep(0.98, 1.38, y) * (1.0 - smoothstep(1.47, 1.56, y)), c = cos(yaw), s = sin(yaw);   // shoulders turn against the hips
      p.xz = vec2(p.x * c + p.z * s, p.z * c - p.x * s); n.xz = vec2(n.x * c + n.z * s, n.z * c - n.x * s);
      p.x += 0.045 * max(0.0, p.y - HIP); p.y += hipY - HIP; p.z += sway;
    #endif
    return p;
  }
`;
const mats = {};
/** Materials are shared between outfits with the same stride; `fixed` vertices keep their own colour under the instance tint. */
function personMat(kind, stride) {
  const key = kind + '/' + stride; if (mats[key]) return mats[key];
  const m = mats[key] = surface(kind), uStride = { value: stride }, plain = 'vec3 up = vec3(0.0, 1.0, 0.0); vec3 transformed = rig(position, up);';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uStride = uStride;
    sh.vertexShader = WALK + sh.vertexShader
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n if (aRig.z > 0.5) vColor.xyz = color.xyz;\n#endif')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vec3 rigged = rig(position, objectNormal);')
      .replace('#include <begin_vertex>', m.isMeshBasicMaterial ? plain : 'vec3 transformed = rigged;');
  };
  // shadows follow the walk too: give each mesh drawn with this material a matching depth material
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => { sh.uniforms.uStride = uStride; sh.vertexShader = WALK + sh.vertexShader.replace('#include <begin_vertex>', plain); };
  m.onBeforeRender = (_r, _s, _c, _g, obj) => { obj.customDepthMaterial = depth; };
  return m;
}
/** Instanced parts for Movers. Armour is untinted; light strips take the traveller's `glow` colour and cast no shadow. */
export function personParts(variant) {
  const g = personOf(variant), mat = (kind) => personMat(kind, g.stride);
  return [{ geo: g.top, mat: mat(g.gloss ? 'gloss' : 'cloth') }, { geo: g.bottom, mat: mat('cloth'), tintKey: 'legs' }, { geo: g.skin, mat: mat('skin'), tintKey: 'skin' }, { geo: g.hair, mat: mat('hair'), tintKey: 'hair' },
    { geo: g.metal, mat: mat('metal'), tint: false }, { geo: g.glow, mat: mat('glow'), tintKey: 'glow', cast: false }].filter((p) => p.geo);
}
/** A standing figure as one vertex-coloured geometry, for campfires and villages. */
export function staticPerson(variant, topHex, bottomHex, skinRGB) {
  const g = personOf(variant), tints = [hex(topHex), hex(bottomHex), skinRGB.map((v) => v ** 2.2), [0.35, 0.3, 0.3], [1, 1, 1]];
  return merge([g.top, g.bottom, g.skin, g.hair, g.metal].map((geo, k) => {
    if (!geo) return null;
    const o = geo.toNonIndexed(), c = o.attributes.color, rig = o.attributes.aRig;
    for (let i = 0; i < c.count; i++) if (!rig.getZ(i)) c.setXYZ(i, c.getX(i) * tints[k][0], c.getY(i) * tints[k][1], c.getZ(i) * tints[k][2]);
    o.deleteAttribute('aRig'); return o;
  }).filter(Boolean));
}

export function buildPeople(world, scene, r) {
  const { lanes, cloth } = traffic(r), movers = [];
  const side = (ax) => (ax === 'z' ? 7.2 + r() * 2.3 : 4 + r() * 1.5), tall = (k) => () => k * (0.94 + r() * 0.12);
  // hair is tinted from a mid brown: black, dark brown, brown, auburn, blond, grey
  const HAIRS = [[0.25, 0.25, 0.3], [0.6, 0.6, 0.6], [1, 1, 1], [2.6, 1.2, 0.7], [5, 4, 2.4], [5, 5.5, 6.5]], hairOf = () => HAIRS[Math.floor(r() ** 1.6 * HAIRS.length)];
  // pedestrians: the population grows with the city, and dresses for its century
  const crowd = (variant, n, from, to, o, woman, opts) => {
    const items = lanes(n, from, to, { v: [1, 1.6], off: side, cross: 0.4, s: tall(woman ? 0.93 : 1), ...o });
    for (const it of items) { it.hair = hairOf(); if (o.glow) it.glow = o.glow(); if (woman) it.v *= 0.92; }
    const m = new Movers(world, personParts(variant), items, { crossSpan: CROSS_SPAN, ...opts }); movers.push(m); scene.add(...m.meshes);
  };
  const drab = cloth([0x4a3c30, 0x33333c, 0x6a5a4a, 0x5a2a22, 0x242424, 0x3a4a3a]), dark = cloth([0x1c1c20, 0x2a2420, 0x30343c, 0x3a3028]);
  const gowns = cloth([0x6a3a3a, 0x3a4a6a, 0x7a6a50, 0x40503a, 0x8a8478, 0x503a50]), skirts = cloth([0x5a3030, 0x30405a, 0x6a5a44, 0x384830, 0x2a2a30]);
  crowd('colonial', 34, 1626, 1810, { jf: 150, jt: 20, tint: drab, legs: drab });
  crowd('dress', 30, 1630, 1915, { jf: 150, jt: 12, tint: gowns, legs: skirts }, true);
  crowd('hat', 44, 1790, 1905, { jf: 80, jt: 12, alt: 0.16, tint: dark, legs: dark });
  crowd('suit', 50, 1890, 1962, { jf: 40, jt: 12, alt: 0.16, tint: cloth([0x2a2a30, 0x3a3630, 0x30343c, 0x4a4844, 0x242428]), legs: dark });
  crowd('skirt', 40, 1912, 1975, { jf: 30, jt: 20, alt: 0.16, tint: cloth([0xc8c0b0, 0x7a2a2a, 0x3a4a6a, 0xe8e4dc, 0x4a6a4a, 0x8a6a7a]), legs: skirts }, true);
  const bright = cloth([0x2a2a30, 0x3a4a6a, 0x7a2a2a, 0xc8c0b0, 0x4a6a4a, 0xd0a030, 0x808890, 0x202020, 0x7a4a6a, 0xe8e4dc, 0x1e5a8a]), jeans = cloth([0x2a3a5a, 0x1c1c20, 0x3a3a40, 0x5a5648, 0x243048, 0x6a6a70]);
  crowd('modern', 75, 1950, 2160, { jf: 40, jt: 30, alt: 0.16, tint: bright, legs: jeans });
  crowd('longhair', 70, 1950, 2160, { jf: 40, jt: 30, alt: 0.16, tint: bright, legs: jeans }, true);
  // the megacity: dark and wet, so rain capes with a light strip at the hem, and umbrellas with glowing rims
  const rain = cloth([0x8aa8b8, 0xb8b8c4, 0xc0a0b4, 0x9cc0b0, 0xc4bc88, 0x70707c, 0x384048]), neon = () => [[0.1, 1.5, 1.8], [1.9, 0.15, 1.1], [1.8, 1.4, 0.15], [0.3, 1.8, 0.45], [1.9, 0.45, 0.12], [0.7, 0.4, 2]][Math.floor(r() * 6)];
  const wet = { jf: 40, jt: 30, alt: 0.16, tint: rain, legs: dark, glow: neon };
  crowd('raincoat', 46, 2190, 2850, wet, false, { sidewalk: true });
  crowd('raincoat-f', 40, 2190, 2850, wet, true, { sidewalk: true });
  crowd('umbrella', 44, 2190, 2850, wet, false, { sidewalk: true });
  crowd('robe', 40, 2970, 9300, { jf: 30, jt: 600, off: () => r() * 30, cross: 0.5, tint: cloth([0xffffff, 0xd8f0f0, 0xf0e8d0, 0xc0e0ff]), legs: cloth([0xffffff, 0xe8f4f4, 0xf4ecd8]) });
  return movers;
}
