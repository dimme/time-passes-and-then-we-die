// People: one articulated figure in several historical outfits, walking the streets or standing by a fire.
import * as THREE from 'three';
import { part, merge } from './util.js';
import { flatTube, paintGeo, hex, blob, WHITE, BLACK } from './organic.js';
import { Movers, traffic, CROSS_SPAN } from './movers.js';

// =====================================================================================
// People
// =====================================================================================
const limbAttr = (g, swing, pivot) => { const n = g.attributes.position.count, a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = swing; a[i * 2 + 1] = pivot; } g.setAttribute('aLimb', new THREE.BufferAttribute(a, 2)); return g; };
/** variant: 'modern' | 'longhair' | 'hat' | 'dress' | 'robe' | 'native'. Returns { top, bottom, skin } geometries facing +x. */
function personGeo(variant) {
  const T = (pts, o) => flatTube(pts, { segs: 10, sub: 3, ...o });
  const top = [], bottom = [], skin = [];
  const L = (g, s, p) => limbAttr(g, s, p), still = (g) => limbAttr(g, 0, 0);
  // torso: hips → waist → chest → shoulders
  top.push(still(T([[0, 0.96, 0, 0.135], [0, 1.08, 0, 0.125], [0.01, 1.3, 0, 0.16], [0, 1.43, 0, 0.15], [0, 1.5, 0, 0.065]], { wz: 1.42 })));
  if (variant === 'hat' || variant === 'dress') top.push(still(T([[0, 0.78, 0, 0.19], [0, 0.98, 0, 0.16], [0, 1.1, 0, 0.14]], { wz: 1.3 })));   // coat skirts / bodice
  for (const s of [1, -1]) {
    top.push(L(T([[0, 1.43, s * 0.23, 0.058], [-0.01, 1.17, s * 0.255, 0.047], [0.03, 0.93, s * 0.25, 0.037]], { segs: 8 }), -s * 0.42, 1.42));
    skin.push(L(blob(0.042, WHITE, 0.04, 0.87, s * 0.25, 0.9, 1.25, 0.6), -s * 0.42, 1.42));
  }
  // legs or skirt
  if (variant === 'dress' || variant === 'robe') {
    bottom.push(still(T([[0, 1.04, 0, 0.13], [0, 0.85, 0, 0.19], [0, 0.45, 0, 0.27], [0, 0.1, 0, 0.33], [0, 0.07, 0, 0.3]], { wz: 1.05, segs: 14 })));
    for (const s of [1, -1]) bottom.push(L(paintGeo(part(new THREE.SphereGeometry(0.07, 8, 6), 0xffffff, 0.06, 0.04, s * 0.09, 0, 0, 0, 1.6, 0.55, 0.8), 0.03), s * 0.3, 0.9));
  } else {
    bottom.push(still(T([[0, 0.82, 0, 0.12], [0, 0.95, 0, 0.145], [0, 1.02, 0, 0.13]], { wz: 1.3 })));
    for (const s of [1, -1]) {
      bottom.push(L(T([[0, 0.92, s * 0.085, 0.085], [0.01, 0.52, s * 0.085, 0.066], [0, 0.1, s * 0.085, 0.05]], { segs: 8 }), s * 0.5, 0.92));
      bottom.push(L(paintGeo(part(new THREE.SphereGeometry(0.07, 8, 6), 0xffffff, 0.06, 0.045, s * 0.085, 0, 0, 0, 1.7, 0.6, 0.85), variant === 'native' ? 0.5 : 0.03), s * 0.5, 0.92));
    }
  }
  // neck, head, face, hair
  const hairC = 0.02;
  skin.push(still(T([[0, 1.47, 0, 0.055], [0.005, 1.57, 0, 0.05]], { segs: 8, sub: 2 })), still(blob(0.105, WHITE, 0.01, 1.675, 0, 0.98, 1.16, 0.9)),
    still(blob(0.022, [0.92, 0.85, 0.82], 0.112, 1.66, 0, 1, 1.3, 0.8)), still(blob(0.022, WHITE, 0.01, 1.675, 0.097, 0.6, 1.2, 0.5)), still(blob(0.022, WHITE, 0.01, 1.675, -0.097, 0.6, 1.2, 0.5)),
    still(blob(0.014, BLACK, 0.092, 1.695, 0.04)), still(blob(0.014, BLACK, 0.092, 1.695, -0.04)));
  skin.push(still(paintGeo(part(new THREE.SphereGeometry(0.112, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0xffffff, -0.008, 1.69, 0, 0, 0, 0.28, 1, 1.12, 0.94), hairC)));
  if (variant === 'longhair' || variant === 'dress' || variant === 'native' || variant === 'robe') skin.push(still(paintGeo(T([[-0.06, 1.74, 0, 0.09], [-0.1, 1.55, 0, 0.1], [-0.09, 1.36, 0, 0.07]], { wz: 1.25 }), hairC)));
  if (variant === 'hat') skin.push(still(paintGeo(part(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 16), 0xffffff, 0, 1.775, 0), 0.03)), still(paintGeo(part(new THREE.CylinderGeometry(0.105, 0.115, 0.13, 14), 0xffffff, 0, 1.845, 0), 0.03)));
  if (variant === 'dress') skin.push(still(paintGeo(part(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), 0xffffff, -0.02, 1.69, 0, 0, 0, 0.5), 1.4, 1.35, 1.2)));   // bonnet
  return { top: merge(top), bottom: merge(bottom), skin: merge(skin) };
}
const personCache = {};
const personOf = (v) => personCache[v] || (personCache[v] = personGeo(v));
function personMat(rough) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute vec2 aLimb;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float wa = aLimb.x * sin((instanceMatrix[3].x + instanceMatrix[3].z) * 2.6);
        float wc = cos(wa), ws = sin(wa), wy = transformed.y - aLimb.y;
        transformed = vec3(transformed.x * wc - wy * ws, transformed.x * ws + wy * wc + aLimb.y, transformed.z);
      #endif`);
  };
  return m;
}
let PM;
export function personParts(variant) {
  PM = PM || { cloth: personMat(0.85), skin: personMat(0.6) };
  const g = personOf(variant);
  return [{ geo: g.top, mat: PM.cloth }, { geo: g.bottom, mat: PM.cloth, tintKey: 'legs' }, { geo: g.skin, mat: PM.skin, tintKey: 'skin' }];
}
/** A standing figure as one vertex-coloured geometry, for campfires and villages. */
export function staticPerson(variant, topHex, bottomHex, skinRGB) {
  const g = personOf(variant), tint = (geo, c) => { const o = geo.clone(), a = o.attributes.color; for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * c[0], a.getY(i) * c[1], a.getZ(i) * c[2]); o.deleteAttribute('aLimb'); return o; };
  return merge([tint(g.top, hex(topHex)), tint(g.bottom, hex(bottomHex)), tint(g.skin, skinRGB.map((v) => v ** 2.2))]);
}


export function buildPeople(world, scene, r) {
  const { lanes, cloth } = traffic(r), movers = [];
  const mk = (parts, items, opts) => { const m = new Movers(world, parts, items, { crossSpan: CROSS_SPAN, ...opts }); movers.push(m); scene.add(...m.meshes); return m; };
  const side = (ax) => (ax === 'z' ? 7.2 + r() * 2.3 : 4 + r() * 1.5), tall = () => 0.92 + r() * 0.16;
  // pedestrians: the population grows with the city, and dresses for its century
  const walk = { bob: 0.025 }, ped = (o) => ({ v: [1, 1.6], off: side, cross: 0.4, s: tall, ...o });
  const drab = cloth([0x4a3c30, 0x33333c, 0x6a5a4a, 0x5a2a22, 0x242424, 0x3a4a3a]), dark = cloth([0x1c1c20, 0x2a2420, 0x30343c, 0x3a3028]);
  mk(personParts('hat'), lanes(34, 1626, 1900, ped({ jf: 150, jt: 20, tint: drab, legs: dark })), walk);
  mk(personParts('dress'), lanes(30, 1630, 1915, ped({ jf: 150, jt: 12, tint: cloth([0x6a3a3a, 0x3a4a6a, 0x7a6a50, 0x40503a, 0x8a8478, 0x503a50]), legs: cloth([0x5a3030, 0x30405a, 0x6a5a44, 0x384830, 0x2a2a30]) })), walk);
  mk(personParts('hat'), lanes(60, 1800, 1958, ped({ jf: 100, jt: 12, alt: 0.16, tint: dark, legs: dark })), walk);
  const bright = cloth([0x2a2a30, 0x3a4a6a, 0x7a2a2a, 0xc8c0b0, 0x4a6a4a, 0xd0a030, 0x808890, 0x202020, 0x7a4a6a, 0xe8e4dc, 0x1e5a8a]), jeans = cloth([0x2a3a5a, 0x1c1c20, 0x3a3a40, 0x5a5648, 0x243048, 0x6a6a70]);
  mk(personParts('modern'), lanes(75, 1915, 2160, ped({ jf: 60, jt: 30, alt: 0.16, tint: bright, legs: jeans })), walk);
  mk(personParts('longhair'), lanes(70, 1920, 2160, ped({ jf: 60, jt: 30, alt: 0.16, tint: bright, legs: jeans })), walk);
  mk(personParts('robe'), lanes(40, 2970, 9300, ped({ jf: 30, jt: 600, off: () => r() * 30, cross: 0.5, tint: cloth([0xffffff, 0xd8f0f0, 0xf0e8d0, 0xc0e0ff]), legs: cloth([0xffffff, 0xe8f4f4, 0xf4ecd8]) })), walk);
  return movers;
}
