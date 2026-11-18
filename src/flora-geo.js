// Plant and rock geometry: tapering wood, leafy ribbons, branching skeletons, boulders.
import * as THREE from 'three';

const WHITE = [1, 1, 1];
export const norm = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const along = (a, d, s) => [a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s];

/** Collects triangles; a vertex is [position, normal, u, v, colour?]. */
export class Builder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  tri(...vs) { for (const [p, n, u, v, c = WHITE] of vs) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(u, v); this.c.push(c[0], c[1], c[2]); } }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  build() {
    const g = new THREE.BufferGeometry();
    for (const [name, arr, size] of [['position', this.p, 3], ['normal', this.n, 3], ['uv', this.uv, 2], ['color', this.c, 3]]) g.setAttribute(name, new THREE.Float32BufferAttribute(arr, size));
    return g;
  }
}

/** Tapering tube through `pts`; rad(i, angle) is the radius of ring i. The bark runs `uRep` times around. */
export function tube(b, pts, rad, sides, uRep = 1, vScale = 0.35) {
  const n = pts.length - 1; let s = null, v = 0, prev = null;
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], e = pts[Math.min(n, i + 1)], d = norm(e[0] - a[0], e[1] - a[1], e[2] - a[2]);
    if (!s) s = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const k = dot(s, d); s = norm(s[0] - d[0] * k, s[1] - d[1] * k, s[2] - d[2] * k);   // carry the frame along without twisting
    const t = cross(d, s), ring = [];
    if (i) v += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]) * vScale;
    for (let j = 0; j <= sides; j++) {
      const an = (j / sides) * 6.2832, c = Math.cos(an), sn = Math.sin(an), nn = [s[0] * c + t[0] * sn, s[1] * c + t[1] * sn, s[2] * c + t[2] * sn];
      ring.push([along(pts[i], nn, rad(i, an % 6.2832)), nn, (j / sides) * uRep, v]);
    }
    if (prev) for (let j = 0; j < sides; j++) b.quad(prev[j], prev[j + 1], ring[j + 1], ring[j]);
    prev = ring;
  }
}

/** Nodes [point, direction, side, normal] of a curve leaving `o` at azimuth az and pitch p0, bending by `bend` radians over its length L. */
export function arc(o, az, p0, bend, L, segs, pw = 1) {
  const ca = Math.cos(az), sa = Math.sin(az), side = [-sa, 0, ca], out = []; let p = o;
  const dir = (t) => { const ph = p0 + bend * t ** pw, c = Math.cos(ph), s = Math.sin(ph); return [[c * ca, s, c * sa], [-s * ca, c, -s * sa]]; };
  for (let i = 0; i <= segs; i++) {
    if (i) p = along(p, dir((i - 0.5) / segs)[0], L / segs);
    const [d, n] = dir(i / segs); out.push([p, d, side, n]);
  }
  return out;
}
/** The arc that leaves point `p` in direction `d`. */
export const arcFrom = (p, d, bend, L, segs) => arc(p, Math.atan2(d[2], d[0]), Math.asin(Math.max(-1, Math.min(1, d[1]))), bend, L, segs);

/**
 * Alpha-textured ribbon of width w along an arc: two halves folded up about the midrib by `fold`, rolled about it by `roll`.
 * uv = [u0, v0, u1, v1]; the texture runs along u, or along v if `tall`. `vol` = [centre, k] blends normals away from a
 * crown centre so a cloud of ribbons shades like a volume; `shade` darkens from base to tip; `cut(t)` crops the width along
 * the length, so that no ribbon shows a square outline however coarse its texture gets with distance.
 */
export const kite = (a, b) => (t) => (t < 0.4 ? a + ((1 - a) * t) / 0.4 : 1 - ((1 - b) * (t - 0.4)) / 0.6);
export function ribbon(b, A, w, { fold = 0, roll = 0, uv = [0, 0, 1, 1], tall = false, from = 0, vol, col = WHITE, shade = [1, 1], cut } = {}) {
  const cr = Math.cos(roll), sr = Math.sin(roll), cf = Math.cos(fold), sf = Math.sin(fold), n = A.length - 1 - from, edges = fold ? [-1, 0, 1] : [-1, 1];
  let prev = null;
  for (let i = from; i < A.length; i++) {
    const [p, , s0, n0] = A[i], t = (i - from) / n, k = cut ? cut(t) : 1, sh = shade[0] + (shade[1] - shade[0]) * t, c = [col[0] * sh, col[1] * sh, col[2] * sh];
    const s = [s0[0] * cr + n0[0] * sr, s0[1] * cr + n0[1] * sr, s0[2] * cr + n0[2] * sr], nr = [n0[0] * cr - s0[0] * sr, n0[1] * cr - s0[1] * sr, n0[2] * cr - s0[2] * sr];
    const row = edges.map((e) => {
      const q = [0, 1, 2].map((j) => p[j] + (s[j] * cf * e + nr[j] * sf * Math.abs(e)) * w * 0.5 * k);
      let nn = [0, 1, 2].map((j) => nr[j] * cf - s[j] * sf * e);
      if (vol) {
        const o = norm(q[0] - vol[0][0], q[1] - vol[0][1], q[2] - vol[0][2]), f = dot(nn, o) < 0 ? -1 : 1, m = vol[1];
        nn = norm(nn[0] * f * (1 - m) + o[0] * m, nn[1] * f * (1 - m) + o[1] * m, nn[2] * f * (1 - m) + o[2] * m);
      }
      const a = (e * k + 1) / 2, u = uv[0] + (uv[2] - uv[0]) * (tall ? a : t), v = uv[1] + (uv[3] - uv[1]) * (tall ? t : a);
      return [q, nn, u, v, c];
    });
    if (prev) for (let j = 0; j < row.length - 1; j++) b.quad(prev[j], prev[j + 1], row[j + 1], row[j]);
    prev = row;
  }
}

/**
 * Recursive branching skeleton. S[level] describes trunk, limbs, branches … twigs:
 *   segs, sides (0 on the last level: sprays sit straight on the branch), flare, taper (end radius / start radius), wob (random wander), up (bend per segment towards the sky; negative droops),
 *   kids (side branches), from (where along the parent they start), ang [min, max] from the parent's axis, lift (bias upwards),
 *   ratio (child length / parent length), fall (shortening of children towards the tip), rr (child radius / parent radius there),
 *   lead (length of the continuing leader / parent length), and for the last level tufts (foliage anchors).
 * Twig anchors are pushed to `tips` as [point, direction].
 */
export function grow(wood, tips, r, S, o, d, len, rad, lv = 0) {
  const P = S[lv], n = P.segs, ts = [], pts = [o], dirs = [d], phase = r() * 6.28, lobes = 4 + ((r() * 3) | 0);
  for (let i = 0; i <= n; i++) ts.push(i / n);
  if (!lv) ts.splice(1, 0, (rad * 0.8) / len, (rad * 2.4) / len);   // extra rings to shape the root flare
  for (let i = 1; i < ts.length; i++) {
    const w = (P.wob || 0) * (lv || i > 2 ? 1 : 0);
    d = norm(d[0] + (r() - 0.5) * w, d[1] + (r() - 0.5) * w * 0.5 + (P.up || 0) * (ts[i] - ts[i - 1]) * n, d[2] + (r() - 0.5) * w);
    pts.push(along(pts[i - 1], d, len * (ts[i] - ts[i - 1]))); dirs.push(d);
  }
  const radAt = (t) => rad * (1 - (1 - P.taper) * t);
  const at = (t) => { let i = 1; while (i < ts.length - 1 && ts[i] < t) i++; const k = (t - ts[i - 1]) / (ts[i] - ts[i - 1]); return [along(pts[i - 1], dirs[i], len * (ts[i] - ts[i - 1]) * k), dirs[i]]; };
  if (P.sides) tube(wood, pts, (i, an) => {
    const fl = lv ? 0 : (P.flare ?? 1) * Math.exp(-Math.max(0, pts[i][1]) / (rad * 0.9));   // buttressed flare at the foot of the trunk
    return radAt(ts[i]) * (1 + fl * (0.55 + 0.3 * Math.sin(an * lobes + phase)));
  }, P.sides, Math.max(1, Math.round(rad * 9)));
  if (lv === S.length - 1) { for (let k = 0; k < P.tufts; k++) tips.push(P.sides ? at(1 - (k / P.tufts) * 0.8) : [o, dirs[n]]); return; }
  let phi = r() * 6.28;
  for (let k = 0; k < P.kids; k++) {
    const t = P.from + (1 - P.from) * (k + r() * 0.8) / P.kids, [p, pd] = at(t), a = P.ang[0] + r() * (P.ang[1] - P.ang[0]);
    phi += 2.4 + (r() - 0.5) * 0.9;   // about the golden angle between successive branches
    const s = norm(...cross(pd, Math.abs(pd[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), q = cross(pd, s), ca = Math.cos(a), cp = Math.cos(phi) * Math.sin(a), sp = Math.sin(phi) * Math.sin(a);
    const cd = norm(pd[0] * ca + s[0] * cp + q[0] * sp, pd[1] * ca + s[1] * cp + q[1] * sp + (P.lift || 0), pd[2] * ca + s[2] * cp + q[2] * sp);
    grow(wood, tips, r, S, p, cd, len * P.ratio * (1 - (P.fall || 0) * t) * (0.75 + r() * 0.5), Math.min(radAt(t) * P.rr, rad * 0.75), lv + 1);
  }
  if (P.lead) grow(wood, tips, r, S, pts[pts.length - 1], dirs[dirs.length - 1], len * P.lead, radAt(1), lv + 1);
}

/**
 * Leaf sprays on the twig anchors of a skeleton. F: size, wide (width / length), droop, spread, cells (atlas uv rects).
 * Sprays deep in the crown are darker, those on its sunlit shell lighter.
 */
export function foliage(b, tips, r, F) {
  const c = [0, 0, 0]; for (const [p] of tips) { c[0] += p[0] / tips.length; c[1] += p[1] / tips.length; c[2] += p[2] / tips.length; }
  let R = 0; for (const [p] of tips) R = Math.max(R, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  const core = [c[0], c[1] - R * 0.35, c[2]];
  for (const [p, d] of tips) {
    const out = norm(p[0] - core[0], p[1] - core[1], p[2] - core[2]), k = F.spread, dir = norm(d[0] + out[0] * 0.5 + (r() - 0.5) * k, d[1] + out[1] * 0.3 + F.droop + (r() - 0.5) * k, d[2] + out[2] * 0.5 + (r() - 0.5) * k);
    const q = Math.min(1, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) / R), lit = Math.min(0.95, 0.5 + 0.4 * q * q + 0.14 * Math.max(-1, (p[1] - c[1]) / R)), L = F.size * (0.75 + r() * 0.5);
    ribbon(b, arcFrom(along(p, dir, -L * 0.08), dir, -0.25, L, 1), L * F.wide, {
      fold: 0.15 + r() * 0.45, roll: (r() - 0.5) * 2.2, uv: F.cells[(r() * F.cells.length) | 0], tall: true, vol: [core, 0.72],
      col: [lit * (0.94 + r() * 0.12), lit, lit * (0.88 + r() * 0.12)], shade: [0.8, 1.05], cut: (t) => 0.35 + 0.65 * t,
    });
  }
}

/** A boulder: a ball cut by random planes into flattish faces with softened edges, slumped onto the ground. */
export function boulder(r, { planes = 10, sx = 1.3, sy = 0.9, sz = 1.05, depth = 0.25, lump = 0.05 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  const cuts = [];
  for (let i = 0; i < planes; i++) cuts.push([norm(r() - 0.5, (r() - 0.35) * 0.9, r() - 0.5), 1 - depth * (0.25 + r() * 0.75)]);
  const f = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    const d = norm(p.getX(i), p.getY(i), p.getZ(i)); let rho = 1, w = 1, nn = [...d], min = 1;
    const hits = cuts.map(([cn, h]) => { const k = dot(d, cn); return k > 0.05 ? h / k : 9; });
    for (const h of hits) min = Math.min(min, h);
    w = Math.exp(-(1 - min) / 0.03); rho = w; nn = [d[0] * w, d[1] * w, d[2] * w];
    hits.forEach((h, j) => { const wj = Math.exp(-(h - min) / 0.03); w += wj; rho += h * wj; for (let k = 0; k < 3; k++) nn[k] += cuts[j][0][k] * wj; });
    rho = (rho / w) * (1 + lump * (Math.sin(d[0] * 5 + f[0]) * Math.cos(d[2] * 4 + f[1]) + 0.5 * Math.sin(d[1] * 9 + f[2])));
    const y = Math.max(-0.12, d[1] * rho * sy + sy * 0.5);
    p.setXYZ(i, d[0] * rho * sx, y, d[2] * rho * sz);
    const m = norm(nn[0] / sx, nn[1] / sy, nn[2] / sz); nrm.setXYZ(i, m[0], m[1], m[2]);
    uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2);
    const c = 0.62 + 0.4 * Math.min(1, Math.max(0, y / (sy * 0.6))); col.set([c, c, c], i * 3);   // damp and soil-stained near the ground
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
