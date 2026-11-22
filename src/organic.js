// Shared building blocks for living things: swept tubes, small detail shapes, skin textures and materials.
import * as THREE from 'three';
import { rng, part } from './util.js?v=fea1c89f';
import { canvasTex, normalMap } from './textures.js?v=fea1c89f';

export const H = Math.PI / 2;
/** Time uniform shared by every animated skin material. */
export const animTime = { value: 0 };

// =====================================================================================
// Organic geometry: a tube swept along a smooth path with a radius profile
// =====================================================================================
export function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return p1.map((_, i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
/**
 * pts: [x, y, z, radius]. wz squashes or widens the cross-section sideways.
 * back / belly are brightness multipliers baked into vertex colours (countershading).
 */
export function tube(pts, { segs = 14, sub = 5, wz = 1, vScale = 0.45, back = 0.78, belly = 1.3, uRep = 0, tone = 1 } = {}) {
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
export const flatTube = (pts, o = {}) => tube(pts, { back: 1, belly: 1, ...o }).toNonIndexed();
/** Give every vertex one flat colour (values above 1 are allowed: they survive a dark material tint). */
export function paintGeo(g, r, gg = r, b = r) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
export const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((v) => v ** 2.2);
/** Sphere / cone / box pieces for details, coloured and placed. */
export const blob = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => paintGeo(part(new THREE.SphereGeometry(r, 12, 9), 0xffffff, x, y, z, 0, 0, rz, sx, sy, sz), ...c);
export const spike = (r, h, c, x, y, z, rz = 0, rx = 0, sz = 1) => paintGeo(part(new THREE.ConeGeometry(r, h, 8), 0xffffff, x, y, z, rx, 0, rz, 1, 1, sz), ...c);
export const WHITE = [1, 1, 1], BLACK = [0.012, 0.012, 0.012], IVORY = hex(0xe8dcc0), HORN = hex(0x5a4a3a), TOOTH = hex(0xf0ead8), NAIL = hex(0x2a2420);

// =====================================================================================
// Skin, fur and feather detail textures (tileable; colour comes from the material + vertex colours)
// =====================================================================================
export function skinTex(kind, seed, { stripes = 0, spots = 0 } = {}) {
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
export function skinMat(tex, color, { rough = 0.82, tail, trunk, side } = {}) {
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
export const detailMat = (tail) => skinMat({ map: null, normalMap: null }, 0xffffff, { rough: 0.5, tail });

