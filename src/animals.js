// Animals: jointed legs, bodies assembled from swept tubes, and the herd that wanders the island.
import * as THREE from 'three';
import { rng, part, merge } from './util.js';
import { yearToU } from './timeline.js';
import { H, animTime, tube, flatTube, paintGeo, hex, blob, spike, WHITE, BLACK, IVORY, HORN, TOOTH, NAIL, skinTex, skinMat, detailMat } from './organic.js';

// =====================================================================================
// Jointed legs
// =====================================================================================
const legCache = new Map();
/**
 * spec: { hipY, ratio:[thigh, shin], r:[top, knee, ankle], rest:[hip, knee], amp:[hip, knee], foot, tone }
 * Segment lengths are solved so the foot touches the ground in the rest pose.
 */
function legGeos(spec) {
  const key = JSON.stringify(spec); if (legCache.has(key)) return legCache.get(key);
  const [h0, k0] = spec.rest, [ra, rb, rc] = spec.r, footH = spec.foot === 'claw' ? rc * 0.9 : spec.foot === 'hoof' ? rc * 1.6 : rc * 0.5;
  const s = (spec.hipY - footH) / (spec.ratio[0] * Math.cos(h0) + spec.ratio[1] * Math.cos(h0 + k0)), L1 = spec.ratio[0] * s, L2 = spec.ratio[1] * s, tone = spec.tone || 1;
  const thigh = tube([[0, ra * 0.5, 0, ra * 0.7], [0, -L1 * 0.12, 0, ra], [0, -L1 * 0.6, 0, (ra + rb) * 0.52], [0, -L1, 0, rb]], { segs: 10, sub: 3, back: 1, belly: 1.12, tone });
  const shinT = tube([[0, rb * 0.3, 0, rb * 0.95], [0, -L2 * 0.35, 0, (rb * 1.3 + rc) / 2.3], [0, -L2 * 0.85, 0, rc], [0, -L2, 0, rc * (spec.foot === 'pad' ? 1.12 : 0.9)]], { segs: 10, sub: 3, back: 1, belly: 1.1, tone }).toNonIndexed();
  const foot = [], lie = -(h0 + k0), rot = (g) => { g.translate(0, L2, 0); g.rotateZ(lie); g.translate(0, -L2, 0); return g; };
  if (spec.foot === 'pad') {
    foot.push(blob(rc * 1.2, [tone, tone, tone], rc * 0.12, -L2 + rc * 0.2, 0, 1.08, 0.55, 1.08));
    for (const a of [-0.7, 0, 0.7]) foot.push(blob(rc * 0.26, [tone * 1.5, tone * 1.45, tone * 1.3], Math.cos(a) * rc * 1.22, -L2 + rc * 0.02, Math.sin(a) * rc * 1.22, 1, 0.9, 1));
  } else if (spec.foot === 'hoof') {
    foot.push(rot(paintGeo(part(new THREE.CylinderGeometry(rc * 1.0, rc * 1.45, rc * 2.1, 9), 0xffffff, rc * 0.25, -L2 - rc * 0.75, 0), 0.08, 0.07, 0.06)));
  } else if (spec.foot === 'claw') {
    for (const a of [-0.5, 0, 0.5, Math.PI]) {
      const len = rc * (a === Math.PI ? 2.2 : 5.2), dx = Math.cos(a), dz = Math.sin(a);
      foot.push(rot(flatTube([[0, -L2, 0, rc * 0.85], [dx * len * 0.5, -L2 - rc * 0.1, dz * len * 0.5, rc * 0.6], [dx * len, -L2 - rc * 0.45, dz * len, rc * 0.42]], { segs: 7, sub: 3, tone })));
      foot.push(rot(paintGeo(flatTube([[dx * len, -L2 - rc * 0.4, dz * len, rc * 0.4], [dx * (len + rc * 1.1), -L2 - rc * 0.55, dz * (len + rc * 1.1), rc * 0.22], [dx * (len + rc * 1.9), -L2 - rc * 0.95, dz * (len + rc * 1.9), 0.01]], { segs: 6, sub: 2 }), ...NAIL)));
    }
  }
  const out = { thigh, shin: merge([shinT, ...foot]), L1 };
  legCache.set(key, out); return out;
}

// =====================================================================================
// Assembling a creature
// =====================================================================================
/**
 * def: { body, mat, legs: [{ at:[x,y,z], phase, spec }], skin: [geo…], detail: [geo…], dmat,
 *        jaw: { geo, at:[x,y], detail }, wings: {…} }
 * returns a factory → { obj, legs, wings, jaw }
 */
function creature(def) {
  const skinExtra = def.skin && def.skin.length ? merge(def.skin) : null;
  const detail = def.detail && def.detail.length ? merge(def.detail) : null;
  const dmat = def.dmat || detailMat();
  const legG = (def.legs || []).map((l) => legGeos(l.spec));
  return () => {
    const obj = new THREE.Group(), out = { obj, legs: [], wings: [], jaw: null };
    obj.add(new THREE.Mesh(def.body, def.mat));
    if (skinExtra) obj.add(new THREE.Mesh(skinExtra, def.mat));
    if (detail) obj.add(new THREE.Mesh(detail, dmat));
    (def.legs || []).forEach((l, i) => {
      const hip = new THREE.Group(), knee = new THREE.Group(), g = legG[i];
      hip.position.set(...l.at); knee.position.y = -g.L1;
      hip.add(new THREE.Mesh(g.thigh, def.legMat || def.mat), knee); knee.add(new THREE.Mesh(g.shin, def.legMat || def.mat));
      obj.add(hip); out.legs.push({ hip, knee, phase: l.phase, rest: l.spec.rest, amp: l.spec.amp });
    });
    if (def.jaw) { const j = new THREE.Mesh(def.jaw.geo, def.mat); j.position.set(def.jaw.at[0], def.jaw.at[1], 0); obj.add(j); out.jaw = j; }
    if (def.wings) for (const s of [1, -1]) {
      const inner = new THREE.Group(), outer = new THREE.Group();
      inner.position.set(...def.wings.at); inner.position.z *= s; inner.scale.z = s; outer.position.set(...def.wings.elbow);
      inner.add(new THREE.Mesh(def.wings.inner, def.wings.mat), outer); outer.add(new THREE.Mesh(def.wings.outer, def.wings.mat));
      obj.add(inner); out.wings.push({ inner, outer, side: s });
    }
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return out;
  };
}
const diag = (xf, xb, y, z, specF, specB = specF, yb = y) => [
  { at: [xf, y, z], phase: 0, spec: specF }, { at: [xf, y, -z], phase: Math.PI, spec: specF },
  { at: [xb, yb, z], phase: Math.PI, spec: specB }, { at: [xb, yb, -z], phase: 0, spec: specB },
];
/** A flat membrane / feathered panel from a list of [x, z] outline points (fan from the first). */
function panel(outline, droop = 0) {
  const p = [], uv = [];
  for (let i = 1; i < outline.length - 1; i++) for (const q of [outline[0], outline[i], outline[i + 1]]) { p.push(q[0], -droop * q[1] * q[1] * 0.02, q[1]); uv.push(q[0] * 0.35, q[1] * 0.35); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return paintGeo(g, 1);
}

export function makers() {
  const TX = {
    scales: skinTex('scales', 1), striped: skinTex('scales', 2, { stripes: 7 }), spotted: skinTex('scales', 3, { spots: 60 }), wrinkle: skinTex('wrinkle', 4),
    fur: skinTex('fur', 5), furSpot: skinTex('fur', 6, { spots: 26 }), feather: skinTex('feather', 7),
  };
  const M = {};
  const pillar = (hipY, r, amp = 0.3) => ({ hipY, ratio: [1, 0.95], r: [r, r * 0.82, r * 0.74], rest: [0.04, -0.08], amp: [amp, 0.32], foot: 'pad' });

  // ---------- sauropod ----------
  {
    const body = tube([[-13.5, 3.2, 0, 0.06], [-9.5, 4.4, 0, 0.42], [-5.8, 5.3, 0, 1.0], [-3, 5.7, 0, 1.95], [0, 5.9, 0, 2.45], [3, 6.1, 0, 2.05], [5, 7.3, 0, 1.05], [7.1, 10.0, 0, 0.64], [9.1, 12.5, 0, 0.5], [10.3, 13.3, 0, 0.46], [11.2, 13.3, 0, 0.5], [12.0, 13.1, 0, 0.4], [12.5, 12.95, 0, 0.26], [12.7, 12.9, 0, 0.04]], { wz: 0.82, segs: 18, back: 0.72, belly: 1.35 });
    const tail = { from: -3, len: 10, amp: 1.5, speed: 0.9 };
    const detail = [blob(0.075, BLACK, 11.55, 13.52, 0.37), blob(0.075, BLACK, 11.55, 13.52, -0.37), blob(0.04, BLACK, 12.45, 13.12, 0.1), blob(0.04, BLACK, 12.45, 13.12, -0.1),
      paintGeo(part(new THREE.BoxGeometry(0.75, 0.025, 0.5), 0xffffff, 12.3, 12.88, 0, 0, 0, -0.1), 0.02)];
    for (let i = 0; i < 16; i++) detail.push(spike(0.11, 0.3, hex(0x4a4a3a), -2 + i * 0.75 - 6, 5.55 + 2.15 * Math.exp(-(((i * 0.75 - 6) / 4.2) ** 2)) + 0.12, 0));
    M.sauropod = creature({ body, mat: skinMat(TX.wrinkle, 0x8a8a70, { tail }), dmat: detailMat(tail), detail, legs: diag(3.1, -2.9, 4.7, 1.45, pillar(4.7, 0.82), pillar(4.9, 0.88), 4.9) });
  }
  // ---------- theropods ----------
  {
    const body = tube([[-6.6, 3.55, 0, 0.04], [-4.3, 3.45, 0, 0.3], [-2.3, 3.32, 0, 0.62], [-0.6, 3.3, 0, 0.95], [0.8, 3.45, 0, 1.02], [1.9, 3.9, 0, 0.8], [2.6, 4.5, 0, 0.5], [3.1, 5.0, 0, 0.46], [3.6, 5.3, 0, 0.5], [4.3, 5.27, 0, 0.42], [5.0, 5.17, 0, 0.3], [5.45, 5.08, 0, 0.2], [5.58, 5.04, 0, 0.03]], { wz: 0.66, segs: 16, back: 0.7, belly: 1.4 });
    const arm = (s) => [flatTube([[1.95, 3.45, s * 0.5, 0.15], [2.35, 2.95, s * 0.56, 0.1], [2.75, 2.75, s * 0.56, 0.07]], { segs: 7, sub: 3 }),
      paintGeo(flatTube([[2.72, 2.77, s * 0.6, 0.05], [2.95, 2.68, s * 0.62, 0.03], [3.05, 2.55, s * 0.62, 0.005]], { segs: 5, sub: 2 }), ...NAIL), paintGeo(flatTube([[2.72, 2.75, s * 0.5, 0.05], [2.95, 2.62, s * 0.5, 0.03], [3.03, 2.48, s * 0.5, 0.005]], { segs: 5, sub: 2 }), ...NAIL)];
    const skin = [...arm(1), ...arm(-1), blob(0.13, WHITE, 3.9, 5.5, 0.27, 1.6, 0.7, 0.8), blob(0.13, WHITE, 3.9, 5.5, -0.27, 1.6, 0.7, 0.8)];   // brow ridges
    const detail = [blob(0.07, BLACK, 3.98, 5.4, 0.3), blob(0.07, BLACK, 3.98, 5.4, -0.3), blob(0.035, BLACK, 5.3, 5.15, 0.1), blob(0.035, BLACK, 5.3, 5.15, -0.1)];
    for (let i = 0; i < 11; i++) for (const s of [1, -1]) detail.push(spike(0.035, 0.17 - (i % 3) * 0.02, TOOTH, 4.2 + i * 0.125, 4.93 - i * 0.008, s * (0.25 - i * 0.012), Math.PI));
    const jawTeeth = []; for (let i = 0; i < 9; i++) for (const s of [1, -1]) jawTeeth.push(spike(0.03, 0.13, [5, 5, 4.5], 0.75 + i * 0.125, -0.05 - i * 0.012, s * (0.2 - i * 0.012)));
    const jaw = merge([flatTube([[0, 0, 0, 0.1], [0.5, -0.2, 0, 0.21], [1.3, -0.26, 0, 0.17], [1.85, -0.26, 0, 0.1], [1.98, -0.25, 0, 0.02]], { segs: 10, sub: 3, wz: 1.25, tone: 1.15 }), ...jawTeeth]);
    const leg = { hipY: 3.2, ratio: [1, 1.55], r: [0.55, 0.3, 0.13], rest: [0.6, -1.0], amp: [0.5, 0.55], foot: 'claw' }, tail = { from: -1, len: 5.5, amp: 0.9, speed: 1.6 };
    for (const [name, c, tex] of [['theropod', 0x9a7248, TX.striped], ['raptor', 0x7a7a4a, TX.spotted]])
      M[name] = creature({ body, mat: skinMat(tex, c, { tail }), skin, detail, jaw: { geo: jaw, at: [3.55, 4.98] }, legs: [{ at: [0.2, 3.2, 0.62], phase: 0, spec: leg }, { at: [0.2, 3.2, -0.62], phase: Math.PI, spec: leg }] });
  }
  // ---------- stegosaur ----------
  {
    const body = tube([[-5.6, 1.5, 0, 0.04], [-3.5, 2.0, 0, 0.45], [-1.5, 2.7, 0, 1.2], [0, 3.0, 0, 1.5], [1.5, 2.6, 0, 1.2], [2.8, 1.8, 0, 0.55], [3.5, 1.4, 0, 0.36], [4.1, 1.26, 0, 0.26], [4.5, 1.18, 0, 0.14], [4.62, 1.15, 0, 0.02]], { wz: 0.8, segs: 16, back: 0.75, belly: 1.3 });
    const tail = { from: -1.5, len: 4, amp: 0.7 }, plate = hex(0xb8683a), detail = [];
    for (let i = 0; i < 10; i++) { const t = i / 9, x = -3.3 + i * 0.72, s = 0.5 + 0.75 * Math.sin(t * Math.PI) ** 0.8, y = 1.95 + 1.9 * Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.9 + s * 0.6; detail.push(spike(s * 0.62, s * 1.7, plate, x, y, i % 2 ? 0.16 : -0.16, 0, 0, 0.14)); }
    for (const [x, s] of [[-4.6, 1], [-4.6, -1], [-5.1, 1], [-5.1, -1]]) detail.push(spike(0.08, 1.0, IVORY, x, 2.0, s * 0.35, 0.3, s * 0.9));
    detail.push(blob(0.045, BLACK, 4.0, 1.42, 0.2), blob(0.045, BLACK, 4.0, 1.42, -0.2), spike(0.13, 0.3, HORN, 4.62, 1.14, 0, -H - 0.2));
    M.stego = creature({ body, mat: skinMat(TX.scales, 0x8a8450, { tail }), dmat: detailMat(tail), detail, legs: diag(1.6, -1.6, 1.75, 0.85, pillar(1.75, 0.4, 0.4), pillar(2.25, 0.46, 0.4), 2.25) });
  }
  // ---------- triceratops ----------
  {
    const body = tube([[-4.4, 1.5, 0, 0.04], [-3, 2.0, 0, 0.42], [-1.6, 2.5, 0, 1.12], [0, 2.75, 0, 1.38], [1.4, 2.55, 0, 1.18], [2.3, 2.25, 0, 0.82], [3.0, 2.05, 0, 0.66], [3.6, 1.92, 0, 0.56], [4.2, 1.72, 0, 0.42], [4.7, 1.5, 0, 0.26], [4.92, 1.4, 0, 0.03]], { wz: 0.86, segs: 16, back: 0.75, belly: 1.3 });
    const skin = [blob(1, WHITE, 2.75, 2.85, 0, 0.2, 1.15, 1.35, 0.5)], hornC = IVORY;
    for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; skin.push(blob(0.12, [0.8, 0.8, 0.8], 2.75 - Math.cos(a) * 0.55 * 1.0 - 0.02, 2.85 + Math.cos(a) * 1.0, Math.sin(a) * 1.36)); }
    const detail = [spike(0.14, 1.25, hornC, 3.95, 2.75, 0.34, -1.05), spike(0.14, 1.25, hornC, 3.95, 2.75, -0.34, -1.05), spike(0.12, 0.45, hornC, 4.45, 1.98, 0, -0.5), spike(0.17, 0.42, HORN, 4.95, 1.34, 0, -H - 0.45),
      blob(0.055, BLACK, 3.75, 2.2, 0.47), blob(0.055, BLACK, 3.75, 2.2, -0.47)];
    M.triceratops = creature({ body, mat: skinMat(TX.scales, 0x8c7a5c, { tail: { from: -1.6, len: 3, amp: 0.3 } }), skin, detail, legs: diag(1.5, -1.5, 1.9, 0.8, pillar(1.9, 0.42, 0.42), pillar(2.1, 0.48, 0.42), 2.1) });
  }
  // ---------- pterosaur ----------
  {
    const body = tube([[-1.0, -0.05, 0, 0.02], [-0.55, 0, 0, 0.2], [0.1, 0.05, 0, 0.3], [0.6, 0.2, 0, 0.17], [0.95, 0.5, 0, 0.11], [1.25, 0.7, 0, 0.15], [1.9, 0.68, 0, 0.11], [2.8, 0.58, 0, 0.05], [3.5, 0.5, 0, 0.008]], { segs: 10, sub: 4, back: 0.8, belly: 1.3 });
    const skin = [flatTube([[1.3, 0.78, 0, 0.1], [0.9, 1.0, 0, 0.07], [0.35, 1.15, 0, 0.01]], { segs: 8, sub: 3, wz: 0.3 }),
      flatTube([[-0.5, -0.05, 0.14, 0.07], [-1.2, -0.12, 0.2, 0.04], [-1.7, -0.14, 0.22, 0.02]], { segs: 6, sub: 2 }), flatTube([[-0.5, -0.05, -0.14, 0.07], [-1.2, -0.12, -0.2, 0.04], [-1.7, -0.14, -0.22, 0.02]], { segs: 6, sub: 2 })];
    const detail = [blob(0.04, BLACK, 1.45, 0.78, 0.12), blob(0.04, BLACK, 1.45, 0.78, -0.12)];
    const arm = (len) => flatTube([[0.35, 0, 0, 0.07], [0.5, 0, len * 0.5, 0.05], [0.45, 0, len, 0.03]], { segs: 6, sub: 3 });
    const wmat = skinMat(TX.wrinkle, 0x9a7a66, { rough: 0.7, side: THREE.DoubleSide });
    M.pterosaur = creature({ body, mat: skinMat(TX.scales, 0x8a705c), skin, detail, wings: { at: [0.15, 0.1, 0.22], elbow: [0, 0, 2.5], mat: wmat,
      inner: merge([panel([[0.45, 0], [0.5, 2.5], [-0.75, 2.5], [-1.5, 0.3], [-1.1, -0.1]]), arm(2.5)]), outer: merge([panel([[0.5, 0], [-0.1, 3.6], [-0.75, 0]], 1), flatTube([[0.45, 0, 0, 0.035], [0.1, -0.1, 2.2, 0.025], [-0.1, -0.25, 3.6, 0.008]], { segs: 5, sub: 3 })]) } });
  }
  // ---------- birds ----------
  for (const [name, c, wc, beak] of [['crow', 0x202024, 0x18181c, hex(0x202020)], ['gull', 0xe8e8e4, 0x9aa0a8, hex(0xe0a020)], ['hawk', 0x7a5636, 0x5a3e28, hex(0x3a3020)]]) {
    const body = tube([[-0.36, 0.0, 0, 0.012], [-0.22, 0.0, 0, 0.07], [-0.05, 0.0, 0, 0.115], [0.1, 0.02, 0, 0.12], [0.22, 0.06, 0, 0.08], [0.29, 0.1, 0, 0.07], [0.35, 0.11, 0, 0.055], [0.39, 0.1, 0, 0.008]], { segs: 10, sub: 4, back: 0.9, belly: 1.15 });
    const detail = [spike(0.022, 0.12, beak, 0.43, 0.095, 0, -H - 0.1), blob(0.012, BLACK, 0.33, 0.125, 0.045), blob(0.012, BLACK, 0.33, 0.125, -0.045),
      paintGeo(panel([[-0.2, 0], [-0.62, 0.17], [-0.66, 0], [-0.62, -0.17]]), ...hex(wc)), paintGeo(panel([[-0.2, 0], [-0.62, -0.17], [-0.66, 0], [-0.62, 0.17]]), ...hex(wc))];
    const wmat = skinMat(TX.feather, wc, { rough: 0.75, side: THREE.DoubleSide });
    M[name] = creature({ body, mat: skinMat(TX.feather, c), detail, wings: { at: [0.08, 0.06, 0.07], elbow: [0, 0, 0.36], mat: wmat,
      inner: panel([[0.13, 0], [0.16, 0.36], [-0.17, 0.36], [-0.2, 0]]), outer: panel([[0.16, 0], [0.1, 0.3], [-0.05, 0.52], [-0.16, 0.34], [-0.17, 0]], 6) } });
  }
  // ---------- four-legged mammals from one recipe ----------
  const quad = ({ len, h, girth, neck, rise, headL, headR, tail = 0.4, tex = TX.fur, color, legR, wz = 0.85, ears = 0.5, horn, antler, mane, bushy, belly = 1.45, hock = 0.5, foot = 'hoof', tailHair }) => {
    const nx = len / 2 + neck * 0.75, ny = h + rise, hip = h - girth * 0.35;
    const body = tube([[-len / 2 - tail, h * 0.74, 0, bushy ? girth * 0.2 : 0.02], [-len / 2 - tail * 0.45, h * 0.9, 0, bushy ? girth * 0.42 : girth * 0.16], [-len / 2, h, 0, girth * 0.84], [-len * 0.15, h + girth * 0.03, 0, girth], [len * 0.28, h + girth * 0.07, 0, girth * 1.05], [len / 2, h + rise * 0.35, 0, girth * 0.72],
      [nx - headR * 0.3, ny - headR * 0.2, 0, headR * 1.0], [nx + headL * 0.3, ny + headR * 0.12, 0, headR * 1.05], [nx + headL * 0.7, ny - headR * 0.3, 0, headR * 0.7], [nx + headL * 0.98, ny - headR * 0.58, 0, headR * 0.5], [nx + headL * 1.06, ny - headR * 0.6, 0, 0.02]], { wz, segs: 14, back: 0.82, belly });
    const skin = [], detail = [], ex = nx + headL * 0.42, ey = ny + headR * 0.38;
    if (ears) for (const s of [1, -1]) skin.push(paintGeo(part(new THREE.ConeGeometry(headR * ears, headR * ears * 3, 8), 0xffffff, nx - headR * 0.1, ny + headR * (0.9 + ears), s * headR * 0.85, s * 0.5, 0, 0.35, 0.5, 1, 1), 0.9));
    detail.push(blob(headR * 0.17, BLACK, ex, ey, headR * 0.76), blob(headR * 0.17, BLACK, ex, ey, -headR * 0.76), blob(headR * 0.3, BLACK, nx + headL * 1.02, ny - headR * 0.5, 0, 0.7, 0.8, 1.1));
    if (horn) detail.push(spike(headR * 0.38, horn, IVORY, nx + headL * 0.72, ny + horn * 0.42, 0, -0.25));
    if (antler) for (const s of [1, -1]) {
      const bx = nx + 0.02, by = ny + headR * 0.85, A = antler, c = hex(0x9a8260);
      detail.push(paintGeo(flatTube([[bx, by, s * 0.07, 0.03], [bx - A * 0.25, by + A * 0.45, s * 0.22, 0.028], [bx - A * 0.1, by + A * 0.85, s * 0.42, 0.02], [bx + A * 0.15, by + A * 1.1, s * 0.46, 0.008]], { segs: 6, sub: 4 }), ...c));
      for (const [t, l] of [[0.25, 0.4], [0.5, 0.45], [0.75, 0.35]]) detail.push(paintGeo(flatTube([[bx - A * 0.22 * (t < 0.6 ? 1 : 0.4), by + A * (0.2 + t * 0.8), s * (0.12 + t * 0.32), 0.02], [bx + A * l * 0.5, by + A * (0.35 + t * 0.85), s * (0.16 + t * 0.34), 0.014], [bx + A * l, by + A * (0.6 + t * 0.8), s * (0.18 + t * 0.34), 0.005]], { segs: 5, sub: 3 }), ...c));
    }
    if (mane) for (let i = 0; i < 9; i++) { const t = i / 8; detail.push(paintGeo(part(new THREE.BoxGeometry(neck * 0.2, headR * 1.5, 0.05), 0xffffff, len / 2 - girth * 0.2 + (nx - headR * 0.5 - len / 2 + girth * 0.2) * t, h + girth * 0.75 + (ny + headR * 0.7 - h - girth * 0.75) * t, 0, 0, 0, 0.5 + t * 0.4), ...mane)); }
    if (tailHair) detail.push(paintGeo(flatTube([[-len / 2 - tail * 0.2, h * 0.95, 0, 0.05], [-len / 2 - tail * 0.7, h * 0.7, 0, 0.09], [-len / 2 - tail * 0.8, h * 0.3, 0, 0.03]], { segs: 7, sub: 3 }), ...tailHair));
    if (antler || color === 0xb08858) detail.push(blob(girth * 0.3, [0.95, 0.93, 0.88], -len / 2 - 0.02, h * 0.93, 0, 0.5, 1, 0.9));   // white rump
    const tone = foot === 'hoof' ? 0.85 : 1;
    const front = { hipY: hip, ratio: [1, 1.05], r: [legR * 1.6, legR, legR * 0.72], rest: [0.03, -0.06], amp: [0.5, 0.55], foot, tone };
    const hind = { hipY: hip, ratio: [1, 1.1], r: [legR * 2.1, legR * 1.05, legR * 0.72], rest: [-hock * 0.55, hock], amp: [0.5, 0.45], foot, tone };
    const tl = { from: -len / 2 + girth * 0.2, len: tail + girth, amp: bushy ? 0.12 : 0.05, speed: 2.2 };
    return creature({ body, mat: skinMat(tex, color, { rough: tex === TX.fur || tex === TX.furSpot ? 0.95 : 0.8, tail: tl }), skin, detail, legs: diag(len / 2 - girth * 0.5, -len / 2 + girth * 0.5, hip, girth * 0.5, front, hind) });
  };
  M.deer = quad({ len: 1.5, h: 1.22, girth: 0.3, neck: 0.5, rise: 0.75, headL: 0.42, headR: 0.125, tail: 0.14, color: 0xa87848, legR: 0.055, antler: 0.62 });
  M.doe = quad({ len: 1.4, h: 1.12, girth: 0.28, neck: 0.45, rise: 0.65, headL: 0.4, headR: 0.115, tail: 0.14, color: 0xb08858, legR: 0.05 });
  M.wolf = quad({ len: 1.25, h: 0.82, girth: 0.25, neck: 0.3, rise: 0.22, headL: 0.42, headR: 0.13, tail: 0.6, bushy: true, color: 0x7a7670, legR: 0.055, ears: 0.38, foot: 'pad', hock: 0.6, belly: 1.25 });
  M.small = quad({ len: 0.9, h: 0.52, girth: 0.2, neck: 0.25, rise: 0.25, headL: 0.3, headR: 0.1, tail: 0.5, color: 0x7a5c44, legR: 0.045, ears: 0.4, foot: 'pad', tex: TX.furSpot });
  M.bronto = quad({ len: 3.6, h: 2.3, girth: 0.95, neck: 0.8, rise: 0.15, headL: 1.1, headR: 0.42, tail: 0.6, tex: TX.wrinkle, color: 0x857c70, legR: 0.24, horn: 0.9, ears: 0.25, foot: 'pad', hock: 0.25, belly: 1.2 });
  M.horse = quad({ len: 1.9, h: 1.55, girth: 0.42, neck: 0.75, rise: 0.8, headL: 0.62, headR: 0.17, tail: 0.3, color: 0x6a4428, legR: 0.075, ears: 0.3, mane: hex(0x18120c), tailHair: hex(0x18120c), belly: 1.15 });
  // ---------- mammoth / mastodon ----------
  {
    const mk = (hump, c, curl) => {
      const body = tube([[-2.95, 2.0, 0, 0.04], [-2.55, 2.85, 0, 0.5], [-1.3, 3.35, 0, 1.15], [0.4, 3.6 + hump, 0, 1.38], [1.6, 3.9 + hump, 0, 1.02], [2.35, 4.0 + hump, 0, 0.88], [2.95, 3.4 + hump * 0.5, 0, 0.62], [3.2, 2.5, 0, 0.3], [3.3, 1.5, 0, 0.21], [3.5, 0.7, 0, 0.15], [3.85, 0.45, 0, 0.1], [4.02, 0.5, 0, 0.02]], { wz: 0.86, segs: 18, back: 0.85, belly: 1.1 });
      const skin = [1, -1].map((s) => blob(0.42, [0.85, 0.85, 0.85], 2.05, 3.75 + hump * 0.8, s * 0.78, 0.35, 1, 0.5));
      const detail = [blob(0.075, BLACK, 2.78, 3.75 + hump * 0.75, 0.6), blob(0.075, BLACK, 2.78, 3.75 + hump * 0.75, -0.6)];
      for (const s of [1, -1]) detail.push(paintGeo(flatTube([[2.75, 3.0 + hump * 0.4, s * 0.38, 0.15], [3.3, 1.9, s * 0.66, 0.145], [4.2 + curl, 1.35, s * (0.62 + curl * 0.5), 0.11], [5.0 + curl, 1.9 + curl * 1.5, s * (0.4 - curl * 0.3), 0.07], [5.1 + curl * 0.6, 2.7 + curl * 2, s * (0.2 - curl * 0.5), 0.015]], { segs: 9, sub: 6 }), ...IVORY));
      const leg = pillar(2.85, 0.48, 0.34);
      return creature({ body, mat: skinMat(TX.fur, c, { rough: 1, trunk: { x: 2.95, top: 3.3, len: 3, amp: 0.35 } }), skin, detail, legs: diag(1.5, -1.6, 2.85, 0.72, leg) });
    };
    M.mammoth = mk(0.45, 0x6a4326, 0.32); M.mastodon = mk(0.05, 0x64503c, 0);
  }
  return M;
}

// =====================================================================================
// Wandering animals
// =====================================================================================
/** Set an animal's joints for gait phase g at time t (also used by tools/viewer). */
export function pose(a, g, t) {
  const ph = a.ph || 0;
  for (const l of a.legs) {
    const p = g + l.phase;
    l.hip.rotation.z = l.rest[0] + Math.sin(p) * l.amp[0];
    l.knee.rotation.z = l.rest[1] - Math.max(0, Math.cos(p)) * l.amp[1];   // the leg folds as it swings forward
  }
  if (a.wings.length) {
    const glide = Math.sin(t * 0.23 + ph * 2) > 0.55 ? 0.15 : 1, f = t * (a.flap || 3) + ph;
    for (const w of a.wings) { w.inner.rotation.x = -(0.12 + Math.sin(f) * 0.55 * glide); w.outer.rotation.x = -(Math.sin(f - 0.9) * 0.6 * glide - 0.1); }
  }
  if (a.jaw) a.jaw.rotation.z = -0.06 - Math.max(0, Math.sin(t * 0.35 + ph)) ** 12 * 0.55;
}

class Herd {
  constructor(world, scene) { this.world = world; this.scene = scene; this.list = []; this.r = rng(77); }
  add(make, n, from, to, { R = [20, 70], speed = 1.5, fly = 0, scale = [0.8, 1.2], stride = 2, flap = 3 } = {}) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const a = make(), sc = scale[0] + r() * (scale[1] - scale[0]); a.obj.scale.setScalar(sc);
      const Rr = R[0] + r() * (R[1] - R[0]), v = speed * (0.7 + r() * 0.6);
      this.list.push({ ...a, cx: (r() * 2 - 1) * (215 - Rr), cz: (r() * 2 - 1) * 260, R: Rr, w: (v / Rr) * (r() < 0.5 ? -1 : 1), gait: (v / (stride * sc)) * 3, flap: flap * (0.85 + r() * 0.3), ph: r() * 6.28, u0: yearToU(from), u1: yearToU(to), fly: fly && fly * (0.6 + r() * 0.8), in: false });
    }
  }
  update(u, t) {
    animTime.value = t;
    for (const a of this.list) {
      const vis = u >= a.u0 && u < a.u1;
      if (vis !== a.in) { a.in = vis; vis ? this.scene.add(a.obj) : this.scene.remove(a.obj); }
      if (!vis) continue;
      const ang = a.ph + t * a.w, x = a.cx + Math.cos(ang) * a.R, z = a.cz + Math.sin(ang) * a.R, s = Math.sign(a.w), g = t * a.gait + a.ph;
      a.obj.position.set(x, a.fly ? a.fly + Math.sin(t * 0.4 + a.ph) * 4 : this.world.surfaceAt(x, z) + Math.abs(Math.sin(g)) * 0.03 * a.obj.scale.x, z);
      a.obj.rotation.y = Math.atan2(-Math.cos(ang) * s, -Math.sin(ang) * s);
      pose(a, g, t);
      if (a.wings.length) { a.obj.rotation.z = Math.sin(t * 0.7 + a.ph) * 0.1; a.obj.rotation.x = s * 0.25; }
    }
  }
}


let MAKERS;
/** Factories for every species, built once. */
export function species() { return MAKERS || (MAKERS = makers()); }

export function buildAnimals(world, scene) {
  const M = species();
  const herd = new Herd(world, scene);
  // dinosaurs
  herd.add(M.raptor, 7, -236e6, -66.02e6, { R: [15, 50], speed: 4, scale: [0.35, 0.6], stride: 1.6 });      // small early hunters
  herd.add(M.sauropod, 5, -190e6, -66.02e6, { R: [50, 120], speed: 1.6, scale: [0.9, 1.4], stride: 5 });
  herd.add(M.stego, 4, -160e6, -100e6, { R: [25, 60], speed: 1.1, stride: 2.2 });
  herd.add(M.theropod, 3, -150e6, -66.02e6, { R: [40, 90], speed: 4.5, scale: [1.5, 2.2], stride: 3 });
  herd.add(M.triceratops, 5, -100e6, -66.02e6, { R: [25, 70], speed: 1.2, scale: [1.2, 1.7], stride: 2.4 });
  herd.add(M.pterosaur, 7, -210e6, -66.02e6, { R: [40, 140], speed: 12, fly: 45, scale: [1, 2], flap: 2.6 });
  // mammals
  herd.add(M.small, 8, -62e6, -30e6, { R: [8, 30], speed: 2.5, stride: 0.6 });
  herd.add(M.bronto, 5, -45e6, -30e6, { R: [25, 70], speed: 1.3, stride: 2.4 });
  herd.add(M.mastodon, 6, -20e6, -1.2e6, { R: [30, 80], speed: 1.2, stride: 2.6 });
  herd.add(M.deer, 4, -20e6, -1.2e6, { R: [15, 50], speed: 2.2, stride: 1.3 });
  herd.add(M.doe, 5, -20e6, -1.2e6, { R: [15, 50], speed: 2.2, stride: 1.3 });
  herd.add(M.mastodon, 5, -130e3, -100e3, { R: [30, 80], speed: 1.2, stride: 2.6 });
  herd.add(M.mammoth, 7, -95e3, -27e3, { R: [30, 90], speed: 1.1, stride: 2.8 });
  herd.add(M.mammoth, 5, -16.5e3, -10.5e3, { R: [30, 90], speed: 1.1, stride: 2.8 });
  herd.add(M.mastodon, 4, -15e3, -9500, { R: [30, 80], speed: 1.2, stride: 2.6 });
  herd.add(M.deer, 8, -15e3, -9000, { R: [20, 60], speed: 2.2, scale: [1.2, 1.5], stride: 1.3 });   // caribou
  herd.add(M.wolf, 4, -15e3, 1650, { R: [30, 90], speed: 2.6, stride: 1.0 });
  herd.add(M.deer, 6, -9000, 1700, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.doe, 9, -9000, 1700, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.deer, 6, 9500, 140e6, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.doe, 9, 9500, 140e6, { R: [12, 50], speed: 1.8, stride: 1.3 });
  herd.add(M.wolf, 4, 12000, 140e6, { R: [30, 90], speed: 2.6, stride: 1.0 });
  herd.add(M.mastodon, 5, 2e6, 140e6, { R: [30, 80], speed: 1.2, scale: [0.6, 1.5], stride: 2.6 });   // whatever comes next
  // birds: woodland, then city and harbour, then woodland again
  herd.add(M.crow, 8, -60e6, 2e8, { R: [20, 90], speed: 9, fly: 22, scale: [0.9, 1.3], flap: 9 });
  herd.add(M.hawk, 4, -30e6, 1850, { R: [60, 140], speed: 11, fly: 45, scale: [1.4, 1.9], flap: 5 });
  herd.add(M.hawk, 4, 9500, 2e8, { R: [60, 140], speed: 11, fly: 45, scale: [1.4, 1.9], flap: 5 });
  herd.add(M.gull, 9, -6000, 2165, { R: [50, 150], speed: 10, fly: 30, scale: [1.1, 1.5], flap: 6 });
  herd.add(M.gull, 6, 2960, 1e6, { R: [50, 150], speed: 10, fly: 30, scale: [1.1, 1.5], flap: 6 });

  return herd;
}
