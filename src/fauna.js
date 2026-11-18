import * as THREE from 'three';
import { rng, box, cyl, cone, part, merge, vcMat } from './util.js';
import { yearToU } from './timeline.js';
import { canvasTex, normalMap } from './textures.js';

const H = Math.PI / 2;
const animTime = { value: 0 };

// =====================================================================================
// Organic geometry: a tube swept along a smooth path with a radius profile
// =====================================================================================
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return p1.map((_, i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
/**
 * pts: [x, y, z, radius]. wz squashes or widens the cross-section sideways.
 * back / belly are brightness multipliers baked into vertex colours (countershading).
 */
function tube(pts, { segs = 14, sub = 5, wz = 1, vScale = 0.45, back = 0.78, belly = 1.3, uRep = 0, tone = 1 } = {}) {
  const S = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < sub; k++) S.push(cr(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)], k / sub));
  S.push(pts[pts.length - 1]);
  let maxR = 0; for (const p of pts) maxR = Math.max(maxR, p[3]);
  const rep = uRep || Math.max(1, Math.round((2 * Math.PI * maxR * (0.5 + wz * 0.5)) / 2.2));
  const pos = [], uv = [], col = [], idx = [], T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), ref = new THREE.Vector3();
  let dist = 0;
  for (let j = 0; j < S.length; j++) {
    const a = S[Math.max(0, j - 1)], b = S[Math.min(S.length - 1, j + 1)], c = S[j], r = Math.max(0.001, c[3]);
    if (j > 0) dist += Math.hypot(c[0] - S[j - 1][0], c[1] - S[j - 1][1], c[2] - S[j - 1][2]);
    T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    ref.set(0, 0, 1); if (Math.abs(T.z) > 0.9) ref.set(1, 0, 0);
    N.crossVectors(ref, T).normalize(); B.crossVectors(T, N);
    for (let k = 0; k <= segs; k++) {
      const an = (k / segs) * Math.PI * 2, cs = Math.cos(an), sn = Math.sin(an);
      pos.push(c[0] + (N.x * cs + B.x * sn * wz) * r, c[1] + (N.y * cs + B.y * sn * wz) * r, c[2] + (N.z * cs + B.z * sn * wz) * r);
      uv.push((k / segs) * rep, dist * vScale);
      const up = N.y * cs + B.y * sn, sh = tone * (up > 0 ? 1 + (back - 1) * Math.min(1, up * 1.4) : 1 + (belly - 1) * Math.min(1, -up * 1.3));
      col.push(sh, sh, sh * (up < 0 ? 0.96 : 1));
    }
  }
  const W = segs + 1;
  for (let j = 0; j < S.length - 1; j++) for (let k = 0; k < segs; k++) { const a = j * W + k, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal;   // weld the seam so lighting is continuous around the tube
  for (let j = 0; j < S.length; j++) { const a = j * W, b = a + segs, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
  return g;
}
const flatTube = (pts, o = {}) => tube(pts, { back: 1, belly: 1, ...o }).toNonIndexed();
/** Give every vertex one flat colour (values above 1 are allowed: they survive a dark material tint). */
function paintGeo(g, r, gg = r, b = r) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((v) => v ** 2.2);
/** Sphere / cone / box pieces for details, coloured and placed. */
const blob = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => paintGeo(part(new THREE.SphereGeometry(r, 12, 9), 0xffffff, x, y, z, 0, 0, rz, sx, sy, sz), ...c);
const spike = (r, h, c, x, y, z, rz = 0, rx = 0, sz = 1) => paintGeo(part(new THREE.ConeGeometry(r, h, 8), 0xffffff, x, y, z, rx, 0, rz, 1, 1, sz), ...c);
const WHITE = [1, 1, 1], BLACK = [0.012, 0.012, 0.012], IVORY = hex(0xe8dcc0), HORN = hex(0x5a4a3a), TOOTH = hex(0xf0ead8), NAIL = hex(0x2a2420);

// =====================================================================================
// Skin, fur and feather detail textures (tileable; colour comes from the material + vertex colours)
// =====================================================================================
function skinTex(kind, seed, { stripes = 0, spots = 0 } = {}) {
  const S = 512, r = rng(seed);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; };
  const [cc, col] = mk(), [hc, hgt] = mk();
  col.fillStyle = '#d8d8d8'; col.fillRect(0, 0, S, S); hgt.fillStyle = '#808080'; hgt.fillRect(0, 0, S, S);
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, rad = 30 + r() * 80, a = (r() - 0.5) * 0.22; wrap((ox, oy) => { const g = col.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); g.addColorStop(0, a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); col.fillStyle = g; col.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2); }); }
  if (kind === 'scales') {
    const cw = 16, ch = 14;
    for (let y = 0, row = 0; y < S + ch; y += ch, row++) for (let x = -cw; x < S + cw; x += cw) {
      const px = x + (row % 2) * (cw / 2) + (r() - 0.5) * 2, py = y + (r() - 0.5) * 2, rad = cw * (0.5 + r() * 0.08);
      const g = hgt.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, '#d8d8d8'); g.addColorStop(0.7, '#a0a0a0'); g.addColorStop(1, '#303030'); hgt.fillStyle = g; hgt.beginPath(); hgt.arc(px, py, rad, 0, 7); hgt.fill();
      col.strokeStyle = 'rgba(0,0,0,0.22)'; col.lineWidth = 1.3; col.beginPath(); col.arc(px, py, rad * 0.9, 0, 7); col.stroke();
      col.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.1})`; col.beginPath(); col.arc(px, py, rad * 0.85, 0, 7); col.fill();
    }
  } else if (kind === 'wrinkle') {
    for (let i = 0; i < 420; i++) {
      const y = r() * S, x = r() * S, len = 40 + r() * 160, a = 0.1 + r() * 0.25, horizontal = r() < 0.75;
      for (const [ctx, c] of [[col, `rgba(0,0,0,${a})`], [hgt, `rgba(0,0,0,${a * 2})`]]) wrap((ox, oy) => {
        ctx.strokeStyle = c; ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); ctx.moveTo(x + ox, y + oy);
        if (horizontal) ctx.bezierCurveTo(x + ox + len * 0.3, y + oy + 8, x + ox + len * 0.6, y + oy - 8, x + ox + len, y + oy + 3); else ctx.bezierCurveTo(x + ox + 5, y + oy + len * 0.15, x + ox - 5, y + oy + len * 0.3, x + ox + 2, y + oy + len * 0.45);
        ctx.stroke();
      });
    }
    for (let i = 0; i < 3000; i++) { hgt.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},0.25)`; hgt.fillRect(r() * S, r() * S, 2, 2); }
  } else if (kind === 'fur') {
    for (let i = 0; i < 26000; i++) {
      const x = r() * S, y = r() * S, len = 10 + r() * 26, lean = (r() - 0.5) * 7, v = r();
      col.strokeStyle = v < 0.5 ? `rgba(0,0,0,${0.1 + r() * 0.3})` : `rgba(255,245,225,${0.08 + r() * 0.26})`; col.lineWidth = 0.8 + r() * 1.2;
      hgt.strokeStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${0.25 + r() * 0.4})`; hgt.lineWidth = 1 + r();
      for (const ctx of [col, hgt]) wrap((ox, oy) => { if (Math.abs(ox) + Math.abs(oy) && x > 40 && x < S - 40 && y > 40 && y < S - 40) return; ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + lean, y + oy - len); ctx.stroke(); });
    }
  } else if (kind === 'feather') {
    const cw = 44, ch = 26;
    for (let y = S + ch, row = 0; y > -ch; y -= ch, row++) for (let x = -cw; x < S + cw; x += cw) {
      const px = x + (row % 2) * (cw / 2), py = y;
      const g = hgt.createLinearGradient(0, py - ch * 1.6, 0, py); g.addColorStop(0, '#606060'); g.addColorStop(1, '#e0e0e0');
      for (const [ctx, fill, stroke] of [[hgt, g, 'rgba(0,0,0,0.9)'], [col, `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.12})`, 'rgba(0,0,0,0.35)']]) {
        ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py - ch * 0.8, cw * 0.52, ch * 1.3, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py - ch * 0.8); ctx.lineTo(px, py + ch * 0.5); ctx.stroke();
      }
    }
  }
  for (let i = 0; i < stripes; i++) {   // dark bands running around the body, ragged and broken
    const y = (i + 0.5) * (S / stripes) + (r() - 0.5) * 14;
    for (let x = 0; x < S; x += 6) { const w = (9 + r() * 12) * (0.4 + 0.6 * Math.abs(Math.sin((x / S) * Math.PI))); col.fillStyle = `rgba(20,12,6,${0.38 + r() * 0.25})`; col.fillRect(x, y - w / 2 + Math.sin(x * 0.05 + i) * 6, 7, w); }
  }
  for (let i = 0; i < spots; i++) { const x = r() * S, y = r() * S, a = 8 + r() * 22; wrap((ox, oy) => { col.fillStyle = `rgba(20,14,8,${0.2 + r() * 0.3})`; col.beginPath(); col.ellipse(x + ox, y + oy, a, a * (0.6 + r() * 0.5), r() * 3, 0, 7); col.fill(); }); }
  const hd = hgt.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = hd[i * 4] / 255;
  return { map: canvasTex(cc), normalMap: normalMap(h, S, kind === 'fur' ? 2.2 : 3.2) };
}
/** Skin material; `tail` makes everything behind x = tail.from sway from side to side. */
function skinMat(tex, color, { rough = 0.82, tail, trunk, side } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, map: tex.map, normalMap: tex.normalMap, roughness: rough, vertexColors: true, side: side || THREE.FrontSide });
  if (tail || trunk) m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = animTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = modelMatrix[3].x * 0.7 + modelMatrix[3].z * 0.3;
      ${tail ? `float tq = max(0.0, (${tail.from.toFixed(2)} - position.x) / ${tail.len.toFixed(2)});
      transformed.z += sin(uTime * ${(tail.speed || 1.5).toFixed(2)} + ph - tq * 2.2) * ${tail.amp.toFixed(2)} * tq * tq;` : ''}
      ${trunk ? `float kq = step(${trunk.x.toFixed(2)}, position.x) * clamp((${trunk.top.toFixed(2)} - position.y) / ${trunk.len.toFixed(2)}, 0.0, 1.0);
      transformed.z += sin(uTime * 0.9 + ph) * ${trunk.amp.toFixed(2)} * kq * kq; transformed.x += sin(uTime * 0.6 + ph * 1.3) * ${(trunk.amp * 0.5).toFixed(2)} * kq * kq;` : ''}`);
  };
  return m;
}
const detailMat = (tail) => skinMat({ map: null, normalMap: null }, 0xffffff, { rough: 0.5, tail });

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

function makers() {
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
      for (const l of a.legs) {
        const p = g + l.phase;
        l.hip.rotation.z = l.rest[0] + Math.sin(p) * l.amp[0];
        l.knee.rotation.z = l.rest[1] - Math.max(0, Math.cos(p)) * l.amp[1];   // the leg folds as it swings forward
      }
      if (a.wings.length) {
        const glide = Math.sin(t * 0.23 + a.ph * 2) > 0.55 ? 0.15 : 1, f = t * a.flap + a.ph;
        for (const w of a.wings) { w.inner.rotation.x = -(0.12 + Math.sin(f) * 0.55 * glide); w.outer.rotation.x = -(Math.sin(f - 0.9) * 0.6 * glide - 0.1); }
        a.obj.rotation.z = Math.sin(t * 0.7 + a.ph) * 0.1; a.obj.rotation.x = s * 0.25;
      }
      if (a.jaw) a.jaw.rotation.z = -0.06 - Math.max(0, Math.sin(t * 0.35 + a.ph)) ** 12 * 0.55;
    }
  }
}

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
function personParts(variant) {
  PM = PM || { cloth: personMat(0.85), skin: personMat(0.6) };
  const g = personOf(variant);
  return [{ geo: g.top, mat: PM.cloth }, { geo: g.bottom, mat: PM.cloth, tintKey: 'legs' }, { geo: g.skin, mat: PM.skin, tintKey: 'skin' }];
}
/** A standing figure as one vertex-coloured geometry, for campfires and villages. */
export function staticPerson(variant, topHex, bottomHex, skinRGB) {
  const g = personOf(variant), tint = (geo, c) => { const o = geo.clone(), a = o.attributes.color; for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * c[0], a.getY(i) * c[1], a.getZ(i) * c[2]); o.deleteAttribute('aLimb'); return o; };
  return merge([tint(g.top, hex(topHex)), tint(g.bottom, hex(bottomHex)), tint(g.skin, skinRGB.map((v) => v ** 2.2))]);
}

// =====================================================================================
// Vehicles
// =====================================================================================
const paint = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55 });
const matte = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, ...o });
const glassy = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.85 });
const white = (g) => part(g.index ? g.toNonIndexed() : g, 0xffffff);
function extrude(pts, depth, bevel = 0.06) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(depth - bevel * 2) / 2); return g;
}
const wheel = (x, z, r = 0.34, w = 0.24) => [cyl(r, r, w, 0x141414, x, r, z, 14, H, 0, 0), cyl(r * 0.55, r * 0.55, w + 0.02, 0x8a8e92, x, r, z, 10, H, 0, 0)];

function cartParts(M) {
  const horse = M.horse().obj; horse.updateMatrixWorld(true);
  const hg = []; horse.traverse((o) => { if (o.isMesh) { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const c = g.attributes.color, b = hex(0x6a4428); for (let i = 0; i < c.count; i++) { const dark = o.material.map ? 1 : 0; c.setXYZ(i, c.getX(i) * (dark ? b[0] : 1), c.getY(i) * (dark ? b[1] : 1), c.getZ(i) * (dark ? b[2] : 1)); } g.translate(2.6, 0, 0); hg.push(g); } });
  const wood = [box(2.5, 0.12, 1.4, 0x6a4c2c, -0.6, 0.95, 0), box(2.5, 0.5, 0.06, 0x5a3e24, -0.6, 1.25, 0.7), box(2.5, 0.5, 0.06, 0x5a3e24, -0.6, 1.25, -0.7), box(0.06, 0.5, 1.4, 0x5a3e24, -1.85, 1.25, 0), box(1.6, 0.7, 1.2, 0x9a8a68, -0.8, 1.6, 0),
    box(2.2, 0.06, 0.06, 0x3a2a1c, 1.5, 1.0, 0.5), box(2.2, 0.06, 0.06, 0x3a2a1c, 1.5, 1.0, -0.5)];
  for (const z of [0.78, -0.78]) for (const x of [0.1, -1.4]) { wood.push(part(new THREE.TorusGeometry(0.55, 0.05, 6, 16), 0x2a2018, x, 0.6, z)); for (let k = 0; k < 4; k++) wood.push(box(1.05, 0.04, 0.04, 0x3a2a1c, x, 0.6, z, 0, 0, (k * Math.PI) / 4)); }
  return [{ geo: merge([...hg, ...wood]), mat: matte({ roughness: 0.9 }), tint: false }];
}
function carParts(style) {
  if (style === 'old') {
    const body = white(extrude([[-1.9, 0.5], [-1.9, 1.0], [-1.75, 1.85], [0.2, 1.85], [0.3, 1.15], [1.75, 1.05], [1.85, 0.5]], 1.5, 0.04));
    const trim = merge([...wheel(1.2, 0.8, 0.42, 0.14), ...wheel(1.2, -0.8, 0.42, 0.14), ...wheel(-1.2, 0.8, 0.42, 0.14), ...wheel(-1.2, -0.8, 0.42, 0.14),
      box(1.0, 0.06, 0.34, 0x101010, 1.2, 0.9, 0.82), box(1.0, 0.06, 0.34, 0x101010, 1.2, 0.9, -0.82), box(1.0, 0.06, 0.34, 0x101010, -1.2, 0.9, 0.82), box(1.0, 0.06, 0.34, 0x101010, -1.2, 0.9, -0.82),
      box(0.08, 0.5, 1.0, 0xb0a070, 1.88, 0.85, 0), cyl(0.12, 0.12, 0.1, 0xfff4c0, 1.9, 1.0, 0.55, 10, 0, 0, H), cyl(0.12, 0.12, 0.1, 0xfff4c0, 1.9, 1.0, -0.55, 10, 0, 0, H)]);
    const glass = merge([box(1.3, 0.55, 1.53, 0x1c2228, -0.75, 1.5, 0), box(0.04, 0.55, 1.3, 0x1c2228, 0.27, 1.5, 0)]);
    return [{ geo: body, mat: paint() }, { geo: trim, mat: matte(), tint: false }, { geo: glass, mat: glassy(), tint: false }];
  }
  if (style === 'pod') {
    const body = white(new THREE.SphereGeometry(1, 24, 14).scale(2.1, 0.72, 0.95).translate(0, 0.92, 0));
    const glass = part(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1.75, 0.76, 0.9), 0x14202a, 0.1, 0.95, 0);
    const trim = merge([...wheel(1.2, 0.78, 0.3, 0.2), ...wheel(1.2, -0.78, 0.3, 0.2), ...wheel(-1.2, 0.78, 0.3, 0.2), ...wheel(-1.2, -0.78, 0.3, 0.2), box(0.06, 0.08, 1.5, 0xc8f4ff, 2.05, 0.9, 0), box(0.06, 0.08, 1.5, 0xff3040, -2.05, 0.9, 0)]);
    return [{ geo: body, mat: paint() }, { geo: trim, mat: matte(), tint: false }, { geo: glass, mat: glassy(), tint: false }];
  }
  const body = white(extrude([[-2.2, 0.32], [-2.22, 0.78], [-1.95, 0.95], [-1.3, 1.0], [-0.8, 1.42], [0.5, 1.42], [1.15, 1.0], [2.0, 0.9], [2.2, 0.68], [2.2, 0.32]], 1.78));
  const glass = part(extrude([[-1.22, 1.0], [-0.76, 1.37], [0.47, 1.37], [1.06, 1.0]], 1.81, 0.02), 0x10161c);
  const trim = merge([...wheel(1.35, 0.82), ...wheel(1.35, -0.82), ...wheel(-1.35, 0.82), ...wheel(-1.35, -0.82),
    box(0.05, 0.12, 0.4, 0xfff6d8, 2.2, 0.72, 0.6), box(0.05, 0.12, 0.4, 0xfff6d8, 2.2, 0.72, -0.6), box(0.05, 0.12, 0.4, 0xc01818, -2.22, 0.8, 0.6), box(0.05, 0.12, 0.4, 0xc01818, -2.22, 0.8, -0.6), box(0.06, 0.2, 1.7, 0x1a1a1a, 2.21, 0.42, 0), box(0.06, 0.2, 1.7, 0x1a1a1a, -2.21, 0.42, 0)]);
  return [{ geo: body, mat: paint() }, { geo: trim, mat: matte(), tint: false }, { geo: glass, mat: glassy(), tint: false }];
}
function flyerParts(bright) {
  const body = part(new THREE.SphereGeometry(1, 20, 12).scale(2.7, 0.42, 1.05), bright ? 0xf4f8ff : 0x2a2e36);
  const canopy = part(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45).scale(1.2, 0.5, 0.75), 0x0c1218, 0.4, 0.15, 0);
  const lights = merge([paintGeo(box(0.15, 0.14, 1.5, 0xffffff, -2.6, 0, 0), 6, 0.4, 0.6), paintGeo(box(0.15, 0.14, 1.2, 0xffffff, 2.6, 0, 0), 5, 5, 4), paintGeo(box(3.2, 0.05, 0.08, 0xffffff, 0, -0.38, 0.6), 0.6, 3, 4), paintGeo(box(3.2, 0.05, 0.08, 0xffffff, 0, -0.38, -0.6), 0.6, 3, 4)]);
  return [{ geo: merge([body, canopy]), mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.8 }), tint: false }, { geo: lights, mat: new THREE.MeshBasicMaterial({ vertexColors: true }), tint: false, cast: false }];
}
function shipParts(kind) {
  const hull = (l, w, h, c) => [box(l, h, w, c, 0, h / 2 - 0.5, 0), cone(w / 2, l * 0.2, c, l * 0.6, h / 2 - 0.5, 0, 4, 0, Math.PI / 4, -H)];
  let p;
  if (kind === 'sail') {
    p = [...hull(22, 6, 4, 0x5a3a22), box(22.4, 0.5, 6.3, 0x3a2616, 0, 3.6, 0)];
    for (const x of [-6, 1, 8]) { p.push(cyl(0.2, 0.25, 22, 0x4a3420, x, 14, 0, 8)); p.push(box(0.3, 7, 9, 0xf0e8d8, x + 0.4, 18, 0)); p.push(box(0.3, 6, 11, 0xe8e0cc, x + 0.4, 10, 0)); p.push(box(0.15, 0.15, 11.4, 0x4a3420, x, 13.2, 0), box(0.15, 0.15, 9.4, 0x4a3420, x, 21.6, 0)); }
  } else if (kind === 'steam') p = [...hull(50, 9, 6, 0x2a2a2e), box(30, 4, 7, 0xe8e4dc, -2, 7.5, 0), box(22, 2.5, 6, 0xe8e4dc, -2, 10.7, 0), cyl(1.4, 1.4, 8, 0xb03020, 2, 14, 0, 14), cyl(1.4, 1.4, 8, 0xb03020, -8, 14, 0, 14), cyl(1.45, 1.45, 1.2, 0x1a1a1a, 2, 17.6, 0, 14), cyl(1.45, 1.45, 1.2, 0x1a1a1a, -8, 17.6, 0, 14)];
  else {
    p = [...hull(90, 14, 8, 0x7a2a22), box(10, 14, 12, 0xf0f0f0, -36, 14, 0)];
    const cols = [0x2a6a9a, 0xb0542a, 0x3a8a4a, 0xc8a83a, 0x8a8a8a];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) p.push(box(6.5, 3, 11, cols[(i * 3 + j) % 5], -24 + i * 7, 9 + j * 3.1, 0));
  }
  return [{ geo: merge(p), mat: vcMat({ roughness: 0.7 }), tint: false }];
}

// =====================================================================================
// Things that move in straight lanes
// =====================================================================================
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
class Movers {
  /** items: { lane, alt, off, v (signed), axis 'z'|'x', u0, u1, tint, legs?, skin?, s } */
  constructor(world, parts, items, { span = 480, ground = true, bob = 0 } = {}) {
    this.world = world; this.items = items; this.span = span; this.ground = ground; this.bob = bob;
    this.meshes = parts.map(({ geo, mat, tint = true, tintKey = 'tint', cast = true }) => {
      const m = new THREE.InstancedMesh(geo, mat, items.length); m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true;
      items.forEach((it, i) => m.setColorAt(i, tint ? _c.setRGB(...(it[tintKey] || it.tint)) : _c.setRGB(1, 1, 1)));
      return m;
    });
    for (let k = 1; k < this.meshes.length; k++) this.meshes[k].instanceMatrix = this.meshes[0].instanceMatrix;
    this.minU = Math.min(...items.map((i) => i.u0)); this.maxU = Math.max(...items.map((i) => i.u1));
  }
  update(u, t) {
    const on = !(u < this.minU || u > this.maxU);
    for (const m of this.meshes) m.visible = on;
    if (!on) return;
    const L = this.span * 2, w = this.world, first = this.meshes[0];
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (u < it.u0 || u >= it.u1) { first.setMatrixAt(i, ZERO); continue; }
      const along = ((((it.off + it.v * t) % L) + L) % L) - this.span;
      const x = it.axis === 'z' ? it.lane : along, z = it.axis === 'z' ? along : it.lane;
      let y = this.ground ? Math.max(w.heightAt(x, z), w.sea - 0.15) + it.alt : it.alt;
      if (this.bob) y += Math.abs(Math.cos(along * 2.6)) * this.bob;
      _q.setFromAxisAngle(UP, it.axis === 'z' ? (it.v > 0 ? -H : H) : (it.v > 0 ? 0 : Math.PI));
      first.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.setScalar(it.s || 1)));
    }
    first.instanceMatrix.needsUpdate = true;
  }
}

export function buildFauna(world, scene) {
  const r = rng(4242), Y = yearToU, M = makers();
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

  const movers = [];
  const mk = (parts, items, opts) => { const m = new Movers(world, parts, items, opts); movers.push(m); scene.add(...m.meshes); return m; };
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
  // wheels
  mk(cartParts(M), lanes(26, 1640, 1905, { jf: 200, jt: 22, v: [2, 3.5], off: (ax) => (ax === 'z' ? 3 : 1.8) }), { bob: 0.03 });
  const lane = (ax) => (ax === 'z' ? 1.8 + Math.floor(r() * 2) * 3 : 1.8);
  mk(carParts('old'), lanes(40, 1903, 1946, { jf: 25, jt: 12, v: [6, 10], off: lane, alt: 0.05, tint: cloth([0x101010, 0x141414, 0x1a1210, 0x10141c, 0x3a1410]) }));
  mk(carParts(), lanes(90, 1940, 2060, { jf: 40, jt: 40, v: [9, 15], off: lane, alt: 0.05, tint: cloth([0xf2c018, 0xf2c018, 0xf2c018, 0xe8e8e8, 0x202428, 0x8a1a1a, 0x2a4a7a, 0x9aa0a8, 0x3a5a3a]) }));
  mk(carParts('pod'), lanes(60, 2035, 2170, { jf: 40, jt: 30, v: [10, 14], off: lane, alt: 0.05, tint: cloth([0xffffff, 0xe0f0ff, 0xd0d8e0]) }));
  // the sky fills up
  mk(flyerParts(false), lanes(170, 2140, 2850, { jf: 120, jt: 130, v: [25, 50], off: () => r() * 16 - 8, alt: () => 25 + Math.floor(r() * 7) * 28 + r() * 4, cross: 0.45 }), { ground: false });
  mk(flyerParts(true), lanes(40, 2960, 9200, { jf: 40, jt: 600, v: [30, 60], off: () => r() * 80 - 40, alt: () => 60 + r() * 250, cross: 0.5 }), { ground: false });
  // ships on both rivers
  const river = (n, from, to, v, jt = 30) => Array.from({ length: n }, (_, i) => {
    const dir = i % 2 ? 1 : -1;
    return { lane: (i % 2 ? 1 : -1) * (360 + r() * 140), alt: 0, off: r() * 3000, v: dir * (v + r() * 2), axis: 'z', u0: Y(from + i * 6), u1: Y(to + r() * jt), tint: [1, 1, 1] };
  });
  const shipOpts = { span: 1500, ground: false };
  const fleets = [
    mk(shipParts('sail'), [...river(1, 1524, 1525, 3, 0), ...river(1, 1609, 1611, 3, 0), ...river(8, 1624, 1880)], shipOpts),
    mk(shipParts('steam'), river(6, 1838, 1960), shipOpts),
    mk(shipParts('cargo'), river(5, 1955, 2150, 5), shipOpts),
  ];

  return {
    herd, movers,
    update(u, t) {
      herd.update(u, t);
      for (const f of fleets) for (const it of f.items) it.alt = world.sea;
      for (const m of movers) m.update(u, t);
    },
  };
}
