// Building blocks for animals: lofted skins, a small skeleton builder with skin weights, leg IK and hide textures.
import * as THREE from 'three';
import { rng } from './util.js?v=fea1c89f';
import { canvasTex, normalMap } from './textures.js?v=fea1c89f';

export const H = Math.PI / 2, TAU = Math.PI * 2;
export const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((v) => v ** 2.2);
export const BLACK = [0.012, 0.012, 0.012], IVORY = hex(0xe6dcc2), HORN = hex(0x4a4036), TOOTH = hex(0xeee8d6), NAIL = hex(0x2a2420), HOOF = hex(0x1c1814);
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// =====================================================================================
// Geometry
// =====================================================================================
const cr = (a, b, c, d, t) => b.map((_, i) => 0.5 * (2 * b[i] + (c[i] - a[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t * t + (3 * b[i] - a[i] - 3 * c[i] + d[i]) * t * t * t));
const full = (p) => (p.length > 5 ? [p[0], p[1], p[2], p[3], p[4], p[5], p[6] || 0] : [p[0], p[1], p[2], p[3], p[3], p.length > 4 ? p[4] : p[3], 0]);
/**
 * A skin swept along a smooth path. pts: [x, y, z, r] | [x, y, z, r, halfWidth] | [x, y, z, above, below, halfWidth, egg].
 * `above` / `below` are measured along `ref` (up for bodies, forward for legs); egg > 0 narrows the lower half (a keel),
 * egg < 0 the upper half. capA / capB close an end with a dome that long (in radii).
 */
export function loft(pts, { segs = 14, sub = 4, tile = 1, capA = 0, capB = 0, ref = [0, 1, 0], swap = false } = {}) {
  const P = pts.map(full), S = [];
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < sub; k++) S.push(cr(P[Math.max(0, i - 1)], P[i], P[i + 1], P[Math.min(P.length - 1, i + 2)], k / sub));
  S.push(P[P.length - 1]);
  const cap = (a, b, len) => {
    const d = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], l = Math.hypot(...d) || 1, R = ((a[3] + a[4]) / 2) * len;
    return [0.3, 0.6, 0.85, 0.995].map((u) => { const s = Math.sqrt(1 - u * u); return [a[0] + (d[0] / l) * R * u, a[1] + (d[1] / l) * R * u, a[2] + (d[2] / l) * R * u, a[3] * s, a[4] * s, a[5] * s, a[6]]; });
  };
  if (capA) S.unshift(...cap(S[0], S[1], capA).reverse());
  if (capB) S.push(...cap(S[S.length - 1], S[S.length - 2], capB));
  let per = 0; for (const p of S) per = Math.max(per, (Math.PI * (p[3] + p[4] + 2 * p[5])) / 2);
  const rep = Math.max(1, Math.round(per / tile)), W = segs + 1;
  const pos = [], uv = [], idx = [], T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), R = new THREE.Vector3(...ref);
  let dist = 0;
  for (let j = 0; j < S.length; j++) {
    const a = S[Math.max(0, j - 1)], b = S[Math.min(S.length - 1, j + 1)], c = S[j];
    if (j > 0) dist += Math.hypot(c[0] - S[j - 1][0], c[1] - S[j - 1][1], c[2] - S[j - 1][2]);
    T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    N.copy(R).addScaledVector(T, -R.dot(T)); if (N.lengthSq() < 0.01) N.set(R.y, R.z, R.x).addScaledVector(T, -T.dot(N.set(R.y, R.z, R.x)));
    N.normalize(); B.crossVectors(T, N);
    for (let k = 0; k <= segs; k++) {
      const an = (k / segs) * TAU, cu = Math.cos(an), su = Math.sin(an), h = Math.max(0.0005, cu > 0 ? c[3] : c[4]) * cu, w = Math.max(0.0005, c[5]) * su * (1 + c[6] * cu);
      pos.push(c[0] + N.x * h + B.x * w, c[1] + N.y * h + B.y * w, c[2] + N.z * h + B.z * w);
      swap ? uv.push(dist / tile, (k / segs) * rep) : uv.push((k / segs) * rep, dist / tile);
    }
  }
  for (let j = 0; j < S.length - 1; j++) for (let k = 0; k < segs; k++) { const a = j * W + k, b = a + 1, c = a + W, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal;   // weld the seam so lighting is continuous around the skin
  for (let j = 0; j < S.length; j++) { const a = j * W, b = a + segs, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
  return g;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
/** Rotate (x, then y, then z), scale and place a geometry. */
export function put(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  g.applyMatrix4(_m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'ZYX')), new THREE.Vector3(sx, sy, sz)));
  if (sx * sy * sz !== 1) g.computeVertexNormals();
  return g;
}
/** An ellipsoid of muscle / bone under the skin, or (painted) an eye, a nail… */
export function mass(x, y, z, sx, sy, sz, rz = 0, ry = 0, tile = 1, fine = 1) {
  const g = new THREE.SphereGeometry(1, Math.round(14 * fine), Math.round(10 * fine)), uv = g.attributes.uv, k = Math.max(1, Math.round((Math.max(sx, sy, sz) * 4) / tile));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k * 0.5);
  return put(g, x, y, z, 0, ry, rz, sx, sy, sz);
}
/** A cone with its base at the origin pointing along +y before placing (horn, tooth, claw, lock of hair). */
export function cone(r, h, x, y, z, rz = 0, rx = 0, sz = 1, segs = 7) {
  const g = new THREE.ConeGeometry(r, h, segs, 1, true); g.translate(0, h / 2, 0);
  return put(g, x, y, z, rx, 0, rz, 1, 1, sz);
}
/** A thin plate from an outline in the xy plane, `th` thick at the centre and sharp at the rim. */
export function slab(outline, th, tile = 1) {
  const n = outline.length, cx = outline.reduce((s, p) => s + p[0], 0) / n, cy = outline.reduce((s, p) => s + p[1], 0) / n, pos = [], uv = [];
  const v = (x, y, z) => { pos.push(x, y, z); uv.push(x / tile, y / tile); };
  for (const s of [1, -1]) for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n], m = (p) => [cx + (p[0] - cx) * 0.55, cy + (p[1] - cy) * 0.55, (s * th) / 2];
    const tri = (p, q, r) => { s > 0 ? (v(...p), v(...q), v(...r)) : (v(...p), v(...r), v(...q)); };
    tri([cx, cy, (s * th) / 2], m(a), m(b)); tri(m(a), [a[0], a[1], 0], [b[0], b[1], 0]); tri(m(a), [b[0], b[1], 0], m(b));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
const flatGeo = (pos, tile, dir = [0, 1]) => {   // texture v runs along `dir` in the xz plane
  const g = new THREE.BufferGeometry(), uv = []; for (let i = 0; i < pos.length; i += 3) uv.push((pos[i] * dir[1] - pos[i + 2] * dir[0]) / tile, (pos[i] * dir[0] + pos[i + 2] * dir[1]) / tile);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
};
/** A single-layer surface between a leading and a trailing edge (lists of [x, y, z] running outwards along +z): membranes, wing panels. */
export function strip(lead, trail, tile = 1) {
  const pos = [];
  for (let i = 0; i < lead.length - 1; i++) pos.push(...lead[i], ...trail[i], ...lead[i + 1], ...lead[i + 1], ...trail[i], ...trail[i + 1]);
  return flatGeo(pos, tile);
}
/** A single flat feather or fan: a convex outline of [x, y, z] points going round from +z towards +x (so it faces up). */
export function fan(pts, tile = 1, dir) {
  const c = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length), pos = [];
  for (let i = 0; i < pts.length; i++) pos.push(...c, ...pts[i], ...pts[(i + 1) % pts.length]);
  return flatGeo(pos, tile, dir);
}
/** A solid between two ellipses (hooves, pillar feet): [x, y, z, a (fore-aft), b (sideways), tilt] at the bottom and the top. */
export function frustum(bot, top, segs = 12) {
  const pos = [], uv = [];
  const ring = (e, k) => { const an = (k / segs) * TAU, c = Math.cos(an) * e[3]; return [e[0] + c * Math.cos(e[5] || 0), e[1] + c * Math.sin(e[5] || 0), e[2] + Math.sin(an) * e[4]]; };
  const v = (p) => { pos.push(...p); uv.push(p[0] + p[2], p[1]); };
  for (let k = 0; k < segs; k++) {
    const a = ring(bot, k), b = ring(bot, k + 1), c = ring(top, k), d = ring(top, k + 1);
    v(a); v(c); v(b); v(b); v(c); v(d); v([bot[0], bot[1], bot[2]]); v(a); v(b); v([top[0], top[1], top[2]]); v(d); v(c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
/** Linear interpolation along a point list by x: at(pts, x)[k] for any column k. */
export function at(pts, x) {
  let i = 0; while (i < pts.length - 2 && pts[i + 1][0] < x) i++;
  const a = pts[i], b = pts[i + 1], t = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0] || 1)));
  return a.map((v, k) => v + (b[k] - v) * t);
}
/** The same piece on the other side of the body. */
export function mirror(g) {
  const m = g.clone(), p = m.attributes.position, n = m.attributes.normal;
  for (let i = 0; i < p.count; i++) { p.setZ(i, -p.getZ(i)); n.setZ(i, -n.getZ(i)); }
  if (m.index) { const ix = m.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } else for (const at of Object.values(m.attributes)) {
    const a = at.array, s = at.itemSize; for (let i = 0; i < p.count; i += 3) for (let k = 0; k < s; k++) { const t = a[(i + 1) * s + k]; a[(i + 1) * s + k] = a[(i + 2) * s + k]; a[(i + 2) * s + k] = t; }
  }
  return m;
}
/** One flat colour for a detail piece (values above 1 survive a dark material tint). */
export function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
/** Merge pieces (indexed or not) that all carry position, normal, uv, colour and skin weights. */
function join(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry(), index = new Uint32Array(ni);
  for (const [name, size, Arr] of [['position', 3, Float32Array], ['normal', 3, Float32Array], ['uv', 2, Float32Array], ['color', 3, Float32Array], ['skinIndex', 4, Uint16Array], ['skinWeight', 4, Float32Array]]) {
    const arr = new Arr(nv * size); let o = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes.position.count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  let o = 0, v = 0;
  for (const g of geos) { const n = g.attributes.position.count; if (g.index) for (let i = 0; i < g.index.count; i++) index[o++] = g.index.array[i] + v; else for (let i = 0; i < n; i++) index[o++] = v + i; v += n; }
  out.setIndex(new THREE.BufferAttribute(index, 1)); out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

// =====================================================================================
// Hide textures (tileable greyscale detail + normal map; colour comes from the material and vertex colours)
// =====================================================================================
export function hide(kind, seed) {
  const S = 512, r = rng(seed);
  const mk = (fill) => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, S, S); return [c, g]; };
  const [cc, col] = mk('#d4d4d4'), [hc, hgt] = mk('#808080');
  const wrap = (x, y, m, fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) if (x + ox > -m && x + ox < S + m && y + oy > -m && y + oy < S + m) fn(x + ox, y + oy); };
  const both = (fn) => { fn(col, 1); fn(hgt, 2.2); };
  for (let i = 0; i < 70; i++) {   // soft mottling so no two patches of hide are quite the same tone
    const x = r() * S, y = r() * S, rad = 30 + r() * 70, a = (r() - 0.5) * 0.16;
    wrap(x, y, rad, (px, py) => { const g = col.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); col.fillStyle = g; col.fillRect(px - rad, py - rad, rad * 2, rad * 2); });
  }
  const stroke = (ctx, x0, y0, x1, y1, bend, c, w) => wrap(x0, y0, Math.abs(x1 - x0) + Math.abs(y1 - y0) + 8, (px, py) => {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + (x1 - x0) / 2 + bend * (y1 - y0), py + (y1 - y0) / 2 - bend * (x1 - x0), px + x1 - x0, py + y1 - y0); ctx.stroke();
  });
  if (kind === 'short') {   // a short, close coat: thousands of fine hairs lying along the body
    for (let i = 0; i < 30000; i++) {
      const x = r() * S, y = r() * S, len = 3 + r() * 6, lean = (r() - 0.5) * 2.5, dark = r() < 0.5, a = 0.04 + r() * 0.1;
      both((ctx, k) => stroke(ctx, x, y, x + lean, y + len, 0, `rgba(${dark ? '0,0,0' : '255,250,240'},${Math.min(1, a * k)})`, 0.9));
    }
  } else if (kind === 'shag') {   // long hanging locks, clumped, with dark partings between them
    for (let i = 0; i < 5200; i++) {
      const x = r() * S, y = r() * S, len = 50 + r() * 110, dark = r() < 0.45, a = 0.06 + r() * 0.16, w = 1 + r() * 2.6;
      both((ctx, k) => stroke(ctx, x, y, x + len, y + (r() - 0.5) * 16, (r() - 0.5) * 0.25, `rgba(${dark ? '0,0,0' : '255,236,205'},${Math.min(1, a * k)})`, w));
    }
  } else if (kind === 'pebble' || kind === 'plates') {   // non-overlapping tubercles; 'plates' adds scattered larger feature scales
    const cell = kind === 'pebble' ? 9 : 12;
    for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) {
      const px = x + (r() - 0.5) * cell * 0.7 + ((y / cell) % 2) * cell * 0.5, py = y + (r() - 0.5) * cell * 0.7, big = kind === 'plates' && r() < 0.035, rad = cell * (big ? 1.3 : 0.44 + r() * 0.16), tone = r();
      wrap(px, py, rad, (qx, qy) => {
        const g = hgt.createRadialGradient(qx, qy, 0, qx, qy, rad); g.addColorStop(0, '#d0d0d0'); g.addColorStop(0.65, '#a8a8a8'); g.addColorStop(1, 'rgba(60,60,60,0)'); hgt.fillStyle = g; hgt.beginPath(); hgt.arc(qx, qy, rad, 0, 7); hgt.fill();
        col.fillStyle = `rgba(${tone < 0.5 ? '0,0,0' : '255,255,255'},${Math.abs(tone - 0.5) * 0.24})`; col.beginPath(); col.arc(qx, qy, rad * 0.9, 0, 7); col.fill();
        col.strokeStyle = 'rgba(0,0,0,0.13)'; col.lineWidth = 1; col.beginPath(); col.arc(qx, qy, rad, 0, 7); col.stroke();
      });
    }
    for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, len = 60 + r() * 140; both((ctx, k) => stroke(ctx, x, y, x + len, y + (r() - 0.5) * 30, (r() - 0.5) * 0.3, `rgba(0,0,0,${0.07 * k})`, 1.5 + r() * 2)); }
  } else if (kind === 'wrinkle') {   // thick bare hide: a net of creases over a fine grain
    for (let i = 0; i < 900; i++) {
      const x = r() * S, y = r() * S, len = 20 + r() * 90, across = r() < 0.7, a = 0.05 + r() * 0.13;
      both((ctx, k) => stroke(ctx, x, y, x + (across ? len : (r() - 0.5) * 14), y + (across ? (r() - 0.5) * 14 : len * 0.6), (r() - 0.5) * 0.5, `rgba(0,0,0,${Math.min(1, a * k)})`, 0.8 + r() * 1.6));
    }
    for (let i = 0; i < 9000; i++) { const dark = r() < 0.5, x = r() * S, y = r() * S; both((ctx, k) => { ctx.fillStyle = `rgba(${dark ? '0,0,0' : '255,255,255'},${0.05 * k})`; ctx.fillRect(x, y, 2, 2); }); }
  } else if (kind === 'feather') {   // rows of small overlapping contour feathers pointing along +v
    const cw = 30, ch = 20;
    for (let y = -ch, row = 0; y < S + ch; y += ch, row++) for (let x = -cw; x < S + cw; x += cw) {
      const px = x + (row % 2) * (cw / 2), tone = r();
      const g = hgt.createLinearGradient(0, y, 0, y + ch * 1.9); g.addColorStop(0, '#606060'); g.addColorStop(1, '#d8d8d8');
      for (const [ctx, fill, line] of [[hgt, g, 'rgba(0,0,0,0.7)'], [col, `rgba(${tone < 0.5 ? '0,0,0' : '255,255,255'},${Math.abs(tone - 0.5) * 0.14})`, 'rgba(0,0,0,0.2)']]) {
        ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(px, y + ch * 0.6, cw * 0.52, ch * 1.3, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + ch * 1.8); ctx.stroke();
      }
    }
  } else if (kind === 'vane') {   // flight feathers: long vanes side by side along v, fine barbs
    for (let x = 0; x < S; x += 32) {
      const g = hgt.createLinearGradient(x, 0, x + 32, 0); g.addColorStop(0, '#585858'); g.addColorStop(0.2, '#b8b8b8'); g.addColorStop(1, '#989898'); hgt.fillStyle = g; hgt.fillRect(x, 0, 32, S);
      col.fillStyle = 'rgba(0,0,0,0.3)'; col.fillRect(x, 0, 1.5, S); col.fillStyle = 'rgba(255,255,255,0.1)'; col.fillRect(x + 9, 0, 1.5, S);
      for (let y = 0; y < S; y += 4) { col.strokeStyle = 'rgba(0,0,0,0.06)'; col.lineWidth = 1; col.beginPath(); col.moveTo(x + 2, y + 4); col.lineTo(x + 10, y); col.lineTo(x + 31, y + 6); col.stroke(); }
    }
  }
  const hd = hgt.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = hd[i * 4] / 255;
  return { map: canvasTex(cc), normalMap: normalMap(h, S, kind === 'short' ? 1.2 : kind === 'shag' ? 3 : 2.6) };
}
export const skinMat = (tex, color, o = {}) => new THREE.MeshStandardMaterial({ color, map: tex.map, normalMap: tex.normalMap, roughness: 0.85, vertexColors: true, ...o });
let _detail;
export const detailMat = () => _detail || (_detail = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));

// =====================================================================================
// Skeleton builder
// =====================================================================================
const IDENT = new THREE.Matrix4();
export class Rig {
  constructor() { this.bones = []; this.ix = {}; this.parts = { skin: [], detail: [], wing: [] }; this.legs = []; this.anim = []; this.wings = []; this.jaw = -1; this.root = 0; }
  /** A joint at (x, y, z) in the standing pose; `end` is where its segment stops if no child continues it. */
  bone(name, parent, x, y, z = 0, end) { this.ix[name] = this.bones.length; this.bones.push({ name, parent: parent == null ? -1 : this.ix[parent], p: [x, y, z], end }); return name; }
  /** A run of joints, e.g. a tail or a neck: pts = [[x, y, z?], …, end]. Returns the names. */
  run(name, parent, pts) { return pts.slice(0, -1).map((p, i) => this.bone(name + i, i ? name + (i - 1) : parent, p[0], p[1], p[2] || 0, i === pts.length - 2 ? [pts[i + 1][0], pts[i + 1][1], pts[i + 1][2] || 0] : undefined)); }
  /** Segments for weighting a skin that runs along these bones, in order (e.g. tail tip → head). */
  path(names, blend = 0.3) {
    const B = names.map((n) => (Array.isArray(n) ? { i: this.ix[n[0]], p: n[1] } : { i: this.ix[n], p: this.bones[this.ix[n]].p })), segs = [];
    const ext = (b, o) => this.bones[b.i].end || (o ? b.p.map((v, k) => v * 2 - o.p[k]) : [b.p[0], b.p[1] - 0.1, b.p[2]]), L = B[B.length - 1];
    if (B.length > 1 && this.bones[B[0].i].parent === B[1].i) segs.push({ a: ext(B[0], B[1]), b: B[0].p, o: B[0].i });
    for (let k = 0; k < B.length - 1; k++) segs.push({ a: B[k].p, b: B[k + 1].p, o: this.bones[B[k].i].parent === B[k + 1].i ? B[k + 1].i : B[k].i });
    if (B.length === 1 || this.bones[L.i].parent === B[B.length - 2].i) segs.push({ a: L.p, b: ext(L, B[B.length - 2]), o: L.i });
    for (const s of segs) { s.d = s.b.map((v, k) => v - s.a[k]); s.l2 = s.d[0] ** 2 + s.d[1] ** 2 + s.d[2] ** 2 || 1e-9; s.len = Math.sqrt(s.l2); }
    segs.forEach((s, k) => { s.bw = k ? blend * Math.min(s.len, segs[k - 1].len) : 0; });
    return segs;
  }
  /** Give a piece skin weights: rigidly to one bone (name) or blended along a path. */
  weigh(g, to) {
    const n = g.attributes.position.count, p = g.attributes.position, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    if (typeof to === 'string') { const b = this.ix[to]; for (let i = 0; i < n; i++) { si[i * 4] = b; sw[i * 4] = 1; } } else for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let best = 1e9, bs = 0, bt = 0;
      to.forEach((s, k) => {
        const t = Math.max(0, Math.min(1, ((x - s.a[0]) * s.d[0] + (y - s.a[1]) * s.d[1] + (z - s.a[2]) * s.d[2]) / s.l2)), d = Math.hypot(x - s.a[0] - s.d[0] * t, y - s.a[1] - s.d[1] * t, z - s.a[2] - s.d[2] * t);
        if (d < best) { best = d; bs = k; bt = t; }
      });
      const s = to[bs], d0 = bt * s.len, d1 = (1 - bt) * s.len; let o = s.o, w = 1;
      if (bs > 0 && d0 < s.bw) { o = to[bs - 1].o; w = 0.5 + 0.5 * smooth(d0 / s.bw); } else if (bs < to.length - 1 && d1 < to[bs + 1].bw) { o = to[bs + 1].o; w = 0.5 + 0.5 * smooth(d1 / to[bs + 1].bw); }
      si[i * 4] = s.o; sw[i * 4] = w; si[i * 4 + 1] = o; sw[i * 4 + 1] = 1 - w;
    }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    return g;
  }
  /** Add hide (shaded later by the coat), an untextured detail in colour c, or wing surface. `tint` darkens / lightens a piece of hide. */
  skin(g, to, tint) { g.userData.tint = tint; this.parts.skin.push(this.weigh(g, to)); return this; }
  detail(g, to, c) { this.parts.detail.push(this.weigh(paint(g, c), to)); return this; }
  wing(g, to, tint) { g.userData.tint = tint; this.parts.wing.push(this.weigh(g, to)); return this; }
  /** Both sides at once: fn(s) builds the piece for side s = ±1 and returns [geometry, bone or path, colour / tint]. */
  pair(kind, fn) { for (const s of [1, -1]) { const [g, to, c] = fn(s); this[kind](g, to, c); } return this; }
  /** Rotate a bone with the gait (kg × cycle) and / or with time (kt): angle = base + amp · sin(…). */
  sway(name, axis, amp, { kg = 0, kt = 0, phase = 0, base = 0, kph = 1 } = {}) { this.anim.push({ b: this.ix[name], axis, amp, kg, kt, phase, base, kph }); return this; }
  /** Sway a run of bones as a travelling wave (tails, trunks, necks). */
  wave(names, axis, amp, o = {}) { names.forEach((n, i) => this.sway(n, axis, amp * (o.grow ? (i + 1) / names.length : 1), { ...o, phase: (o.phase || 0) - i * (o.lag ?? 0.5) })); return this; }
  /**
   * A leg in the plane z: joints J = [hip, knee, ankle, ball] as [x, y], `toe` the point the foot rolls over.
   * mode 'lock' keeps the lowest joint straight in stance and folds it in swing (forelegs, pillars);
   * mode 'panto' keeps the first and third segments parallel, as the hock follows the stifle (hind legs, birds).
   */
  leg(name, parent, z, J, toe, { mode = 'lock', phase = 0, fold = 0.9, lift = 0.12, toeOff = 0.5, curl = 0.7, reach = 0, bend = 0 } = {}) {
    const names = ['a', 'b', 'c', 'f'].map((k, i) => this.bone(name + k, i ? name + ['a', 'b', 'c'][i - 1] : parent, J[i][0], J[i][1], z, i === 3 ? [toe[0], toe[1], z] : undefined));
    const seg = [0, 1, 2].map((i) => [J[i + 1][0] - J[i][0], J[i + 1][1] - J[i][1]]), ang = seg.map((s) => Math.atan2(s[1], s[0])), len = seg.map((s) => Math.hypot(...s));
    const v = mode === 'lock' ? seg[0] : [seg[0][0] + seg[2][0], seg[0][1] + seg[2][1]], D = [J[3][0] - J[0][0], J[3][1] - J[0][1]];
    this.legs.push({ b: names.map((n) => this.ix[n]), J: J.map((p) => p.slice()), toe: toe.slice(), ang, len, lock: mode === 'lock', sgn: bend || Math.sign(v[0] * D[1] - v[1] * D[0]) || 1, phase, fold, lift, toeOff, curl, reach, F: [J[3][0] - toe[0], J[3][1] - toe[1]] });
    return names;
  }
  /**
   * A leg with its skin. R = [front, back, halfWidth] at the four joints; M = muscle bellies per segment [fraction along, front, back, halfWidth]
   * (or null); top = where the skin starts inside the body [dx, dy, dz, front, back, halfWidth]; ext = more skin points beyond the ball [x, y, front, back, halfWidth].
   */
  limb(name, parent, z, J, toe, R, M, { top, ext = [], tile = 1, segs = 10, cap = 0.6, swap, ...o } = {}) {
    const names = this.leg(name, parent, z, J, toe, o), pts = [], tp = top ? [J[0][0] + top[0], J[0][1] + top[1], z + top[2]] : null;
    if (top) pts.push([...tp, top[3], top[4], top[5]]);
    J.forEach((j, i) => {
      pts.push([j[0], j[1], z, ...R[i]]);
      if (i < 3 && M[i]) { const f = M[i][0]; pts.push([j[0] + (J[i + 1][0] - j[0]) * f, j[1] + (J[i + 1][1] - j[1]) * f, z, M[i][1], M[i][2], M[i][3]]); }
    });
    for (const e of ext) pts.push([e[0], e[1], z, e[2], e[3], e[4]]);
    this.skin(loft(pts, { segs, sub: 3, tile, ref: [1, 0, 0], capA: top ? 0.5 : 0, capB: cap, swap }), this.path([[parent, tp || [J[0][0], J[0][1] + 0.1, z]], ...names], 0.35));
    return names;
  }
  /** Finish: coat(x, y, z, ny) → brightness or [r, g, b] multiplies the countershaded hide. gait = { duty, stride, bob }. */
  build({ color, tex, coat, back = 0.82, belly = 1.2, rough = 0.85, wingTex, wingColor, wingMat, gait = { duty: 0.65, stride: 1 }, flight, scale = 1 }) {
    const shade = (g) => {
      const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), tint = g.userData.tint || [1, 1, 1];
      for (let i = 0; i < p.count; i++) {
        const ny = n.getY(i), sh = ny > 0 ? 1 + (back - 1) * ny : 1 - (belly - 1) * ny, k = coat ? coat(p.getX(i), p.getY(i), Math.abs(p.getZ(i)), ny) : 1;
        for (let j = 0; j < 3; j++) c[i * 3 + j] = sh * tint[j] * (k.length ? k[j] : k);
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
    };
    const meshes = [];
    if (this.parts.skin.length) meshes.push([join(this.parts.skin.map(shade)), skinMat(tex, color, { roughness: rough })]);
    if (this.parts.detail.length) meshes.push([join(this.parts.detail), detailMat()]);
    if (this.parts.wing.length) meshes.push([join(this.parts.wing.map(shade)), skinMat(wingTex || tex, wingColor || color, { roughness: 0.8, side: THREE.DoubleSide, ...wingMat })]);
    this.gait = gait; this.flight = flight;
    if (scale !== 1) {   // a smaller or larger individual of the same build
      const k = scale, mul = (a) => { for (let i = 0; i < a.length; i++) a[i] *= k; };
      for (const [geo] of meshes) { geo.scale(k, k, k); geo.computeBoundingBox(); geo.computeBoundingSphere(); }
      for (const b of this.bones) { mul(b.p); if (b.end) mul(b.end); }
      for (const l of this.legs) { l.J.forEach(mul); mul(l.toe); mul(l.len); mul(l.F); l.lift *= k; l.reach *= k; }
      this.gait = { ...gait, stride: gait.stride * k, bob: (gait.bob || 0) * k };
    }
    const inv = this.bones.map((b) => new THREE.Matrix4().makeTranslation(-b.p[0], -b.p[1], -b.p[2]));
    this.half = (Math.max(0, ...this.legs.map((l) => l.toe[0])) - Math.min(0, ...this.legs.map((l) => l.toe[0]))) / 2 || 0.5;   // half the wheelbase
    return () => {
      const obj = new THREE.Group(), bones = this.bones.map((b) => { const o = new THREE.Bone(); const q = b.parent < 0 ? [0, 0, 0] : this.bones[b.parent].p; o.position.set(b.p[0] - q[0], b.p[1] - q[1], b.p[2] - q[2]); return o; });
      this.bones.forEach((b, i) => (b.parent < 0 ? obj : bones[b.parent]).add(bones[i]));
      const skeleton = new THREE.Skeleton(bones, inv);
      for (const [geo, mat] of meshes) {
        const m = new THREE.SkinnedMesh(geo, mat); m.bind(skeleton, IDENT); m.castShadow = m.receiveShadow = true;
        m.boundingBox = geo.boundingBox.clone(); m.boundingSphere = geo.boundingSphere.clone(); m.boundingSphere.radius *= 1.25;   // the standing pose, with room to move
        obj.add(m);
      }
      return { obj, bones, def: this, legs: this.legs, wings: this.wings, jaw: this.jaw < 0 ? null : bones[this.jaw] };
    };
  }
}

/** A round weight-bearing foot on a fat pad with broad nails at the front (elephants, sauropods…). a = radius, bound to bone f. */
export function padFoot(b, f, z, toe, a, nails = 3, nail = hex(0x8a8070)) {
  b.skin(frustum([toe[0] - a, 0, z, a, a * 0.95], [toe[0] - a * 1.15, a * 1.2, z, a * 0.82, a * 0.8, 0.15], 14), f);
  for (let i = 0; i < nails; i++) { const k = i - (nails - 1) / 2; b.detail(mass(toe[0] - a * (0.06 + 0.2 * Math.abs(k)), a * 0.22, z + k * a * 0.55, a * 0.1, a * 0.22, a * 0.24, 0.2, -k * 0.6), f, nail); }
}

// =====================================================================================
// Posing
// =====================================================================================
/** Set an animal's joints for gait angle g (radians, 2π per stride) at time t. */
export function pose(a, g, t) {
  const B = a.bones, def = a.def, ph = a.ph || 0, { duty, bob = 0 } = def.gait, S = def.gait.stride;
  for (const c of def.anim) B[c.b].rotation[c.axis] = c.base + c.amp * Math.sin(c.kg * g + c.kt * t + c.phase + c.kph * ph);
  const dy = bob * Math.cos(2 * g + 0.6); B[def.root].position.y = def.bones[def.root].p[1] + dy;
  for (const l of def.legs) {
    let p = g / TAU + l.phase; p -= Math.floor(p);
    let x, y = 0, pitch, flex = 0;
    if (p < duty) { const u = p / duty; x = S * (0.5 - u); pitch = -l.toeOff * smooth((u - 0.72) / 0.28); }   // planted: the body passes over the foot, then the heel peels off
    else { const s = (p - duty) / (1 - duty), k = Math.sin(Math.PI * s); x = S * (smooth(s) - 0.5); y = l.lift * k; pitch = -l.toeOff * (1 - smooth(s * 1.6)) - l.curl * k; flex = -l.fold * Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 1.3; }
    const cp = Math.cos(pitch), sp = Math.sin(pitch), J = l.J, [l1, l2, l3] = l.len;
    const Dx = l.toe[0] + l.reach + x + l.F[0] * cp - l.F[1] * sp - J[0][0], Dy = l.toe[1] + y + l.F[0] * sp + l.F[1] * cp - J[0][1] - dy;
    // fold two of the three segments into one virtual link, then solve the triangle
    const c = (l.lock ? l.ang[2] - l.ang[1] : l.ang[2] - l.ang[0]) + flex, la = l.lock ? l2 : l1, vx = la + l3 * Math.cos(c), vy = l3 * Math.sin(c), lv = Math.hypot(vx, vy), off = Math.atan2(vy, vx);
    const A = l.lock ? l1 : lv, Bl = l.lock ? lv : l2, d = Math.max(Math.abs(A - Bl) + 1e-4, Math.min(A + Bl - 1e-4, Math.hypot(Dx, Dy))), dir = Math.atan2(Dy, Dx);
    const tA = dir - l.sgn * Math.acos(Math.max(-1, Math.min(1, (A * A + d * d - Bl * Bl) / (2 * A * d)))), tB = Math.atan2(d * Math.sin(dir) - A * Math.sin(tA), d * Math.cos(dir) - A * Math.cos(tA));
    const t1 = l.lock ? tA : tA - off, t2 = l.lock ? tB - off : tB, t3 = (l.lock ? t2 : t1) + c;
    const d1 = t1 - l.ang[0], d2 = t2 - l.ang[1], d3 = t3 - l.ang[2];
    B[l.b[0]].rotation.z = d1; B[l.b[1]].rotation.z = d2 - d1; B[l.b[2]].rotation.z = d3 - d2; B[l.b[3]].rotation.z = pitch - d3;
  }
  if (def.wings.length) {
    const F = def.flight, glide = Math.sin(t * F.glideRate + ph * 2) > F.glide ? 0.12 : 1, f = t * (a.flap || F.rate) + ph, down = Math.cos(f);
    for (const w of def.wings) {
      const s = w.side, up = F.dihedral + Math.sin(f) * F.amp * glide, tip = Math.sin(f - 1.0) * F.amp * 0.9 * glide - 0.06, fold = Math.max(0, -down) * F.fold * glide;   // the hand trails the arm and folds on the upstroke
      B[w.inner].rotation.x = -s * up; B[w.outer].rotation.x = -s * tip; B[w.outer].rotation.y = -s * fold; B[w.inner].rotation.y = s * fold * 0.4;
    }
  }
  if (a.jaw) a.jaw.rotation.z = -0.03 - Math.max(0, Math.sin(t * 0.35 + ph)) ** 12 * (def.gape || 0.5);
  if (def.custom) def.custom(a, g, t);   // a species' own motion (sprawling limbs, insect legs and wings)
}
