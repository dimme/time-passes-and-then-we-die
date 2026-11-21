// The stone of Giza: three pyramids that rise course by course, their ramps, quarry, temples, causeways and tombs, and the Sphinx.
import * as THREE from 'three';
import { rng, clamp, merge } from './util.js';
import { C, lin, shade, put, block, wall, skin, fin, rectOb, boxOb, stripOb } from './site-egypt-kit.js';
import { buildInsides } from './site-egypt-inside.js';
import { K1, K2, K3, RAMP, QUARRY, SPHINX, RH, SLOPE, ground, builtCourses } from './site-egypt-land.js';

const SIDES = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/** A pyramid whose core of stepped courses and smooth casing follow the year. */
class Pyramid {
  constructor(P, group, mats, hole) {
    this.P = P; this.hole = hole; const n = P.n, ch = this.ch = P.H / n, half = P.b / 2, r = rng(P.n * 7 + 3);
    const pos = [], nor = [], uv = [], col = [], base = lin(C.lime);
    const pt = (s, dist, tang, y) => pos.push(P.x + s[0] * dist - s[1] * tang, P.lvl + y, P.z + s[1] * dist + s[0] * tang);
    for (let i = 0; i < n; i++) {
      const y0 = i * ch, y1 = y0 + ch, a0 = half * (1 - y0 / P.H), a1 = half * (1 - y1 / P.H), k = 0.86 + 0.2 * r(), v0 = (i % 8) / 8, o = r() * 5;
      // the north face of a course the entrance passes through is drawn round the opening: left of it here, the rest in 18 more corners
      const H = hole && hole[3] > y0 && hole[2] < y1 ? hole : null, face = (t0, t1, ya, yb) => [[a0, t0, ya, t0, v0, 0], [a0, t1, ya, t1, v0, 0], [a0, t1, yb, t1, v0 + 0.125, 0], [a0, t0, ya, t0, v0, 0], [a0, t1, yb, t1, v0 + 0.125, 0], [a0, t0, yb, t0, v0 + 0.125, 0]];
      const extra = [];
      for (const s of SIDES) {
        let vf = face(a0, -a0, y0, y1);
        if (H && s[1] === -1) {
          const h0 = Math.max(-a0, H[0]), h1 = Math.min(a0, H[1]), ya = Math.max(y0, H[2]), yb = Math.min(y1, H[3]);
          vf = face(h0, -a0, y0, y1); extra.push(...face(a0, h1, y0, y1));
          extra.push(...(yb < y1 ? face(h1, h0, yb, y1) : face(0, 0, y1, y1)), ...(ya > y0 ? face(h1, h0, y0, ya) : face(0, 0, y0, y0)));
        }
        for (const [d, t, y, u, v, ny] of [...vf, [a0, a0, y1, a0, a0, 1], [a0, -a0, y1, -a0, a0, 1], [a1, -a1, y1, -a1, a1, 1], [a0, a0, y1, a0, a0, 1], [a1, -a1, y1, -a1, a1, 1], [a1, a1, y1, a1, a1, 1]]) {
          pt(s, d, t, y); if (ny) { nor.push(0, 1, 0); uv.push(u / 6 + o, v / 6); col.push(base[0] * k * 0.94, base[1] * k * 0.94, base[2] * k * 0.94); } else { nor.push(s[0], 0, s[1]); uv.push(u / 6 + o, v); col.push(base[0] * k, base[1] * k, base[2] * k); }
        }
      }
      while (extra.length < 18) extra.push([a0, 0, y0, 0, v0, 0]);
      for (const [d, t, y, u, v] of extra) { pt([0, -1], d, t, y); nor.push(0, 0, -1); uv.push(u / 6 + o, v); col.push(base[0] * k, base[1] * k, base[2] * k); }
    }
    const g = new THREE.BufferGeometry();
    for (const [name, a, sz] of [['position', pos, 3], ['normal', nor, 3], ['uv', uv, 2], ['color', col, 3]]) g.setAttribute(name, new THREE.Float32BufferAttribute(a, sz));
    g.computeBoundingSphere(); this.core = new THREE.Mesh(g, mats.blocks); this.core.castShadow = this.core.receiveShadow = true;
    // the working platform on top
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3)); cg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill([0, 1, 0]).flat(), 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(Array(6).fill(shade(C.lime, 0.9)).flat(), 3));
    this.cap = new THREE.Mesh(cg, mats.cap); this.cap.receiveShadow = true; this.cap.frustumCulled = false;
    // casing: a band of granite below (if any) and white Tura limestone above
    this.bands = [[0, P.granite, C.granite], [P.granite, P.H, C.tura]].filter((b) => b[1] > b[0]).map(([y0, y1, c]) => {
      const bg = new THREE.BufferGeometry(), hyp = Math.hypot(P.H, half), q = lin(c), nn = [], cc = [];
      for (const s of SIDES) for (let k = 0; k < 6; k++) { nn.push((s[0] * P.H) / hyp, half / hyp, (s[1] * P.H) / hyp); cc.push(...q); }
      for (let k = 0; k < 18; k++) { nn.push(0, half / hyp, -P.H / hyp); cc.push(...q); }   // the north face, cut round the entrance
      bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(126), 3)); bg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(84), 2));
      bg.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
      const m = new THREE.Mesh(bg, mats.fine); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; group.add(m); return { y0, y1, m };
    });
    group.add(this.core, this.cap); this.n = -1; this.done = null;
  }
  update(year) {
    const P = this.P, n = builtCourses(P, year), done = year >= P.y1; if (n === this.n && done === this.done) return;
    this.n = n; this.done = done; const half = P.b / 2, top = n * this.ch, a = half * (1 - top / P.H);
    const cased = done ? P.H : Math.max(0, top - 6), skip = Math.max(0, Math.floor(cased / this.ch) - 1);   // courses hidden behind the casing are not drawn
    this.core.visible = n > 0 && !done; this.core.geometry.setDrawRange(skip * 66, (n - skip) * 66);
    this.cap.visible = n > 0 && n < P.n;
    if (this.cap.visible) {
      const p = this.cap.geometry.attributes.position, t = this.cap.geometry.attributes.uv;
      [[-1, -1], [-1, 1], [1, 1], [-1, -1], [1, 1], [1, -1]].forEach(([sx, sz], i) => { p.setXYZ(i, P.x + sx * a, P.lvl + top, P.z + sz * a); t.setXY(i, (sx * a) / 6, (sz * a) / 6); });
      p.needsUpdate = t.needsUpdate = true;
    }
    const hyp = Math.hypot(P.H, half) / P.H;
    for (const b of this.bands) {
      const y0 = b.y0, y1 = Math.min(b.y1, cased); b.m.visible = y1 > y0; if (!b.m.visible) continue;
      const p = b.m.geometry.attributes.position, t = b.m.geometry.attributes.uv, e0 = half * (1 - y0 / P.H) + 0.35, e1 = Math.max(0, half * (1 - y1 / P.H) + (y1 >= P.H ? 0 : 0.35)); let i = 0;
      const E = (y) => (y <= y0 ? e0 : y >= y1 ? e1 : e0 + ((e1 - e0) * (y - y0)) / (y1 - y0)), put4 = (s, ta0, tb0, ya, ta1, tb1, yb) => { for (const [tt, y] of [[ta0, ya], [tb0, ya], [tb1, yb], [ta0, ya], [tb1, yb], [ta1, yb]]) { p.setXYZ(i, P.x - s[1] * tt + s[0] * E(y), P.lvl + y, P.z + s[1] * E(y) + s[0] * tt); t.setXY(i, tt / 5, (y * hyp) / 5); i++; } };
      for (const s of SIDES) {
        const Hh = this.hole && s[1] === -1 && this.hole[3] > y0 && this.hole[2] < y1 ? this.hole : null;
        if (!Hh) { put4(s, E(y0), -E(y0), y0, E(y1), -E(y1), y1); continue; }
        const ya = Math.max(y0, Hh[2]), yb = Math.min(y1, Hh[3]);   // round the opening: below it, above it, and either side
        put4(s, E(y0), -E(y0), y0, E(ya), -E(ya), ya); put4(s, E(yb), -E(yb), yb, E(y1), -E(y1), y1);
        put4(s, -Hh[0], -E(ya), ya, -Hh[0], -E(yb), yb); put4(s, E(ya), -Hh[1], ya, E(yb), -Hh[1], yb);
      }
      for (let k = 0; i < 42; k++) { p.setXYZ(i, 0, -50, 0); i++; }
      p.needsUpdate = t.needsUpdate = true;
    }
  }
}

/**
 * A building ramp along +x: rising from 0 to `h` over length L, then level for `land` metres to meet the pyramid's face.
 * Rubble embankments at the sides, and timbers laid across the roadway for the sledges to run on.
 */
function rampGeo(L, h, half, land, sink = 0.5) {
  const out = [], P = [], N = Math.ceil((L + land) / 5);
  for (let i = 0; i <= N; i++) { const x = ((L + land) * i) / N, y = h * Math.min(1, x / L), foot = half + Math.max(y / 2 + 6 * Math.min(1, x / 30), 10 * Math.min(1, x / 30)) + 1.5; P.push([x, y, foot]); }
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < N; i++) {
    const [x0, y0, f0] = P[i], [x1, y1, f1] = P[i + 1], t = half + 0.3;
    quad([x0, y0, t - 0.01], [x1, y1, t - 0.01], [x1, y1, -t + 0.01], [x0, y0, -t + 0.01]);
    quad([x0, -sink, f0], [x1, -sink, f1], [x1, y1, t], [x0, y0, t]);
    quad([x0, y0, -t], [x1, y1, -t], [x1, -sink, -f1], [x0, -sink, -f0]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  out.push(fin(g, (x, y, z) => shade(Math.abs(z) > half + 0.295 ? C.mud : C.sand, 0.8 + 0.12 * Math.sin(x * 0.9 + z * 0.4)), 3));
  for (let x = 3; x < L; x += 3) out.push(fin(put(block(0.32, 0.14, half * 2 - 1.5), x, (h * x) / L - 0.05, 0, 0, 0, Math.atan2(h, L)), C.wood));
  return merge(out);
}

/** A walled road (a causeway, or with roof = true a covered corridor) through points [x, y, z], reaching `deep` below them. */
function roadGeo(pts, width, high, deep = 3, roof = false) {
  const pos = [], quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d), w = width / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz), nx = (-dz / l) * w, nz = (dx / l) * w;
    const A = (p, s, y) => [p[0] + nx * s, p[1] + y, p[2] + nz * s];
    for (const s of [1, -1]) {
      const q = [A(a, s, -deep), A(b, s, -deep), A(b, s, high), A(a, s, high)]; if (s > 0) q.reverse(); quad(...q);
      const t = 1 - 1.2 / w, top = [A(a, s, high), A(b, s, high), A(b, s * t, high), A(a, s * t, high)]; if (s > 0) top.reverse(); quad(...top);
      const inn = [A(a, s * t, high), A(b, s * t, high), A(b, s * t, 0), A(a, s * t, 0)]; if (s > 0) inn.reverse(); if (!roof) quad(...inn);
    }
    if (roof) quad(A(a, -1, high), A(a, 1, high), A(b, 1, high), A(b, -1, high)); else quad(A(a, -1, 0), A(a, 1, 0), A(b, 1, 0), A(b, -1, 0));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const roadPts = (x0, z0, x1, z1, yAt, step = 8) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step), out = []; for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n; out.push([x, yAt(x, z, i / n), z]); } return out; };

/** A doorway: a dark recess with jambs and lintel, standing against a wall facing `ry`. */
function door(P, mat, span, x, y, z, ry, w = 2.2, h = 4.2, c = C.granite, open = false) {
  if (!open) P.add(mat, span, put(block(w, h, 0.5), x, y, z, ry), C.dark);
  for (const s of [-1, 1]) P.add(mat, span, put(put(block(0.7, h + 0.7, 0.9), s * (w / 2 + 0.35), 0, 0), x, y, z, ry), c);
  P.add(mat, span, put(put(block(w + 2.2, 0.9, 1), 0, h, 0), x, y, z, ry), c);
}
/** A temple: battered outer walls round an open court of square pillars, with a roofed sanctuary at the back (west). */
function temple(P, span, x0, x1, z0, z1, h, { mat = 'fine', c = C.tura, pillar = C.granite, floor = C.lime, doors = [0], t = 5, rows = 2, sanct = 1.2, back = false } = {}) {
  const y = Math.min(ground(x0, z0), ground(x1, z1), ground(x0, z1), ground(x1, z0)) - 0.6, H = h + 0.6, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = x1 - x0, W = z1 - z0;
  const dh = Math.min(5, h * 0.55), DW = 2.4, obs = [rectOb([x0, x1, z0, z1], -1e9, 1e9, { top: y + 0.9 })], solid = (r) => obs.push(rectOb(r));
  P.add(mat, span, put(block(L, 0.9, W), cx, y, cz), floor);
  P.add(mat, span, put(block(L, H, t, 0.05, 0), cx, y, z0 + t / 2), c).add(mat, span, put(block(L, H, t, 0.05, 0), cx, y, z1 - t / 2), c);
  solid([x0, x1, z0, z0 + t]); solid([x0, x1, z1 - t, z1]);
  // the east wall, with its doors open: the wall in pieces between them and a lintel over each
  const runs = []; let za = z0; for (const d of [...doors].sort((p, q) => p - q)) { runs.push([za, cz + d - DW / 2]); za = cz + d + DW / 2; } runs.push([za, z1]);
  for (const [a, b] of runs) { P.add(mat, span, put(block(t, H, b - a), x1 - t / 2, y, (a + b) / 2), c); P.add(mat, span, put(block(t + 0.7, 1.3, b - a + (a === z0 ? 0.35 : 0) + (b === z1 ? 0.35 : 0), 0.2, 0), x1 - t / 2, y, (a + b) / 2 + (a === z0 ? -0.175 : 0) + (b === z1 ? 0.175 : 0)), shade(c, 0.86)); solid([x1 - t - 0.35, x1 + 0.35, a, b]); }
  for (const d of doors) { P.add(mat, span, put(block(t, H - 0.9 - dh, DW), x1 - t / 2, y + 0.9 + dh, cz + d), c); for (const sd of [-1, 1]) solid([x1 - 0.3, x1 + 0.7, cz + d + sd * (DW / 2) + (sd < 0 ? -0.7 : 0), cz + d + sd * (DW / 2) + (sd > 0 ? 0.7 : 0)]); }
  // the sanctuary block at the back; where the causeway comes in from the west (back), a passage through it to the court
  if (!back) { P.add(mat, span, put(block(L * 0.36, H + sanct, W, 0.04), x0 + L * 0.18, y, cz), c); solid([x0, x0 + L * 0.36, z0, z1]); door(P, mat, span, x0 + L * 0.36 + 0.2, y + 0.9, cz, Math.PI / 2, 1.6, 3.2, pillar); }
  else {
    for (const [a, b] of [[z0, cz - 2], [cz + 2, z1]]) { P.add(mat, span, put(block(L * 0.36, H + sanct, b - a, 0.04, 0), x0 + L * 0.18, y, (a + b) / 2), c); solid([x0, x0 + L * 0.36, a, b]); }
    P.add(mat, span, put(block(L * 0.36, H + sanct - 4.9, 4, 0.04, 0), x0 + L * 0.18, y + 4.9, cz), c);
    door(P, mat, span, x0 + L * 0.36 + 0.2, y + 0.9, cz, Math.PI / 2, 4, 4, pillar, true);
  }
  // in the court: an altar of alabaster for the offerings, and two seated statues of the king facing the doors
  { const ax = x0 + L * 0.36 + (L * 0.64 - t) * 0.45; P.add(mat, span, put(block(2.2, 1.0, 1.6), ax, y + 0.9, cz), shade(C.linen, 0.95)); solid([ax - 1.1, ax + 1.1, cz - 0.8, cz + 0.8]);
    for (const sd of [-1, 1]) { const sx = x0 + L * 0.36 + 2.2, sz = cz + sd * (back ? 4.5 : 3.2); P.add(mat, span, put(block(1.6, 1.3, 1.2), sx, y + 0.9, sz), lin(C.basalt)).add(mat, span, put(block(0.8, 1.6, 0.9), sx - 0.35, y + 2.2, sz), lin(C.basalt)).add(mat, span, put(block(0.55, 0.65, 0.6), sx - 0.35, y + 3.8, sz), lin(C.basalt)); solid([sx - 0.8, sx + 0.8, sz - 0.6, sz + 0.6]); } }
  if (sanct) P.add(mat, span, put(block(L * 0.36 - 0.08 * (H + sanct) + 0.5, 0.55, W - 0.08 * (H + sanct) + 0.5), x0 + L * 0.18, y + H + sanct, cz), shade(c, 1.06));
  // a plinth course at the foot of each wall and a coping stone along its top
  for (const zc of [z0 + t / 2, z1 - t / 2]) P.add(mat, span, put(block(L + 0.7, 1.3, t + 0.7, 0, 0.2), cx, y, zc), shade(c, 0.86)).add(mat, span, put(block(L - 0.1 * H + 0.3, 0.5, t + 0.45), cx, y + H, zc), shade(c, 1.06));
  P.add(mat, span, put(block(t + 0.7, 1.3, W + 0.7, 0.2, 0), x1 - t / 2, y, cz), shade(c, 0.86));
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) P.add(mat, span, put(block(0.5, 0.35, 1.5), x0 + L * (0.45 + k * 0.13), y + H - 0.9, cz + s * (W / 2 + 0.6)), shade(c, 0.9));   // spouts to shed the rain from the roof
  P.add(mat, span, put(block(0.8, 0.5, W), x1 - 0.4, y + H, cz), c);
  const n = Math.max(2, Math.floor((L * 0.6 - 2 * t) / 5.5));
  for (let i = 0; i < n; i++) for (let k = 0; k < rows; k++) for (const s of [-1, 1]) {
    const px = x0 + L * 0.4 + 3 + i * ((L * 0.6 - t - 6) / Math.max(1, n - 1)), pz = cz + s * (W / 2 - t - 2.5 - k * 4.5);
    P.add(mat, span, put(block(1.3, h * 0.72, 1.3), px, y + 0.9, pz), pillar).add(mat, span, put(block(1.7, 0.5, 5.2), px, y + 0.9 + h * 0.72, pz - s * 1.6), c);
    solid([px - 0.65, px + 0.65, pz - 0.65, pz + 0.65]);
  }
  for (const d of doors) door(P, mat, span, x1 + 0.2, y + 0.9, cz + d, Math.PI / 2, DW, dh, pillar, true);
  obs.floor = y + 0.9; return obs;
}
/** A mastaba tomb: a bench of stone with sloping sides, two false doors in its east face and the mouths of its shafts on the roof. */
function mastaba(P, span, r, x, z, w, l, h, mud = false) {
  const y = Math.min(ground(x - w / 2, z - l / 2), ground(x + w / 2, z + l / 2), ground(x - w / 2, z + l / 2), ground(x + w / 2, z - l / 2)) - 0.4, mat = mud ? 'brick' : 'fine', c = shade(mud ? C.mud : C.tura, 0.9 + r() * 0.12);
  P.add(mat, span, put(block(w, h + 0.4, l, 0.14), x, y, z), c);
  P.add(mat, span, put(block(w - 0.28 * (h + 0.4) + 0.36, 0.32, l - 0.28 * (h + 0.4) + 0.36), x, y + h + 0.4, z), shade(c, 1.07));   // a coping course round the top
  P.add(mat, span, put(block(w + 0.5, 0.5, l + 0.5, 0.25), x, y, z), shade(c, 0.84));   // and a foot course
  const chapel = !mud && w > 10 && (Math.round(x * 0.5 + z) & 1), obs = [rectOb([x - w / 2, x + w / 2, z - l / 2, z + l / 2])];
  if (chapel) {   // an offering chapel built against the southern false door, its doorway open: inside, the false door and an offering table
    const xa = x + w / 2 - 0.9, xb = x + w / 2 + 2.5, cz = z - l * 0.3, hc = Math.max(2.8, h * 0.66), dh = Math.min(2.2, hc - 0.4), yg = y + 0.4, cc = shade(c, 0.97);
    for (const sd of [-1, 1]) { P.add(mat, span, put(block(xb - xa, hc + 0.4, 0.4), (xa + xb) / 2, y, cz + sd * 2.1), cc); obs.push(rectOb([xa, xb, cz + sd * 2.1 - 0.2, cz + sd * 2.1 + 0.2])); }
    for (const sd of [-1, 1]) { P.add(mat, span, put(block(0.4, hc + 0.4, 1.55), xb - 0.2, y, cz + sd * 1.325), cc); obs.push(rectOb([xb - 0.4, xb, cz + sd * 1.325 - 0.78, cz + sd * 1.325 + 0.78])); }
    P.add(mat, span, put(block(0.4, hc - dh, 1.1), xb - 0.2, yg + dh, cz), cc).add(mat, span, put(block(xb - xa + 0.3, 0.3, 4.9), (xa + xb) / 2, yg + hc, cz), shade(c, 1.06));
    P.add(mat, span, put(block(0.3, 0.06, 1.3), xb + 0.05, yg - 0.03, cz), shade(c, 0.8));   // the threshold
    const ex = x + w / 2 - 0.14 * h * 0.5; P.add(mat, span, put(block(0.6, 0.45, 0.9), ex + 0.75, yg, cz), shade(C.linen, 0.9)); obs.push(rectOb([ex + 0.45, ex + 1.05, cz - 0.45, cz + 0.45]));
  }
  const e = x + w / 2 - 0.14 * h * 0.5;
  for (const dz of [-l * 0.3, l * 0.28]) { P.add(mat, span, put(block(0.5, h * 0.6, 1.1), e + 0.02, y + 0.4, z + dz, 0, 0, 0.14), C.dark); P.add(mat, span, put(block(0.7, 0.35, 2), e + 0.05, y + 0.4 + h * 0.6, z + dz, 0, 0, 0.14), c); }
  if (mud) for (let k = -l / 2 + 1.2; k < l / 2 - 1; k += 2.2) P.add(mat, span, put(block(0.5, h * 0.8, 1.1), x - w / 2 + 0.14 * h * 0.4 - 0.1, y + 0.3, z + k, 0, 0, -0.14), shade(c, 0.9));   // palace-façade niches
  for (let k = 0; k < 2; k++) P.add(mat, span, put(block(1.5, 0.1, 1.5), x - w * 0.12 + r() * w * 0.2, y + h + 0.66, z + (k ? 1 : -1) * l * 0.25), C.dark);
  return obs;
}

/** The Great Sphinx, facing east: a lion couchant with a king's head in the striped nemes headcloth, carved from the living rock. */
function sphinx(P, span) {
  const S = SPHINX, at = (g) => put(g, S.x, S.lvl - 0.3, S.z), rock = lin(C.rock);
  const strata = (x, y, z) => { const k = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(y * 2.3 + 0.4 * Math.sin(x * 0.21 + z * 0.13))) - (y < 9 ? 0.05 : 0); return [rock[0] * k, rock[1] * k, rock[2] * k * 0.97]; };
  const add = (g, c = strata) => P.add('rock', span, at(g), c, 5);
  add(skin([[-36, 3.5, 0, 2.5, 3.5, 3.5, 2.2], [-32.5, 5, 0, 5.2, 5, 6.4, 2.3], [-24, 5.6, 0, 6.5, 5.6, 7.4, 2.5], [-12, 5.6, 0, 6.3, 5.6, 6.2, 2.5], [0, 5.6, 0, 6.2, 5.6, 5.6, 2.5], [8, 6, 0, 6.6, 6, 6, 2.5], [13, 6.5, 0, 6.6, 6.5, 6.3, 2.4], [16.6, 6.6, 0, 5.2, 6.6, 5.4, 2.4]], { segs: 20 }));
  for (const s of [-1, 1]) {
    add(skin([[-34, 2.4, s * 7.2, 2.4, 2.4, 1.8, 2.4], [-28, 4, s * 7.8, 4.8, 4, 2.7, 2.3], [-21.5, 4.2, s * 8, 5.2, 4.2, 2.9, 2.3], [-15, 3, s * 8.1, 3.4, 3, 2.5, 2.4], [-8, 1.4, s * 8.5, 1.6, 1.4, 1.7, 3], [-2.5, 1.1, s * 8.5, 1.2, 1.1, 1.5, 3]], { segs: 14 }));   // haunch and hind paw
    add(skin([[5, 3.2, s * 6.2, 3.6, 3.2, 2.2, 2.6], [12, 2.7, s * 6.4, 3, 2.7, 2.4, 2.8], [20, 2.1, s * 6.4, 2.3, 2.1, 2.3, 3], [30, 1.8, s * 6.4, 2, 1.8, 2.3, 3.2], [35.2, 1.6, s * 6.4, 1.9, 1.6, 2.4, 3.2], [36.6, 1.2, s * 6.4, 1.3, 1.2, 2.2, 3]], { segs: 14 }));   // foreleg and paw
    for (let k = -1; k <= 1; k++) add(put(block(1.6, 0.9, 0.12), 36.2, 0.4, s * 6.4 + k * 1.15), shade(C.rock, 0.6));   // the clefts between the toes
  }
  // the nemes: striped blue and gold, as the traces of paint suggest
  const stripe = (x, y, z) => { const k = Math.floor((y + Math.abs(z - S.z) * 0.35) / 0.55) % 2, a = lin(k ? C.blue : C.gold); return [rock[0] * 0.55 + a[0] * 0.45, rock[1] * 0.55 + a[1] * 0.45, rock[2] * 0.55 + a[2] * 0.45]; };
  add(skin([[14, 10.6, 0, 3, 5.6, 5.7], [14.5, 13, 0, 3.2, 4.6, 5.5], [15, 15.5, 0, 3, 3.8, 4.8], [15.3, 18, 0, 2.9, 3.3, 3.9], [15.4, 19.6, 0, 2.4, 2.6, 2.9], [15.4, 20.3, 0, 1, 1.2, 1.2]], { segs: 20, axis: 'y' }), stripe);
  for (const s of [-1, 1]) add(put(block(0.9, 5, 2.3, 0.02), 17.2, 8.2, s * 3.5), stripe);   // lappets on the chest
  const face = shade(C.red, 1.25), g = new THREE.SphereGeometry(1, 20, 14);
  add(put(g.clone(), 17.5, 15.6, 0, 0, 0, 0, 1.75, 3.1, 2.45), face);
  add(put(block(0.9, 1.5, 0.75, 0.25, 0.12), 19, 14.9, 0, 0, 0, -0.12), face);                                           // nose
  add(put(g.clone(), 18.9, 14.1, 0, 0, 0, 0, 0.35, 0.22, 0.95), shade(C.red, 0.95));                                      // lips
  add(put(g.clone(), 18.2, 12.9, 0, 0, 0, 0, 1, 0.8, 1.3), face);                                                          // chin
  for (const s of [-1, 1]) { add(put(g.clone(), 18.95, 16.55, s * 0.95, 0, 0, 0, 0.22, 0.26, 0.55), [0.03, 0.03, 0.03]); add(put(g.clone(), 18.8, 17.15, s * 0.95, 0, 0, 0, 0.3, 0.14, 0.7), shade(C.red, 0.8)); add(put(g.clone(), 17.1, 15.9, s * 2.5, 0, 0, 0, 0.5, 1.15, 0.35), face); }
  add(put(block(0.5, 1.5, 0.5, 0.1), 18.1, 17.9, 0, 0, 0, -0.25), lin(C.gold));                                           // uraeus
  return [S.x - 37, S.x + 38.5, S.z - 10, S.z + 10];
}

export function buildMonuments({ P, group, mats }) {
  const r = rng(2560), obstacles = [];
  /** Obstacles in years [a, b): a rectangle [x0, x1, z0, z1], or a list of obstacle entries (rectOb, boxOb...). */
  const ob = (it, a = -1e9, b = 1e9) => { for (const e of typeof it[0] === 'number' ? [rectOb(it)] : it) obstacles.push({ ...e, a: Math.max(e.a ?? -1e9, a), b: Math.min(e.b ?? 1e9, b) }); return it; };
  const insides = buildInsides(group, mats.fine.map);
  const pyramids = [K1, K2, K3].map((k, i) => new Pyramid(k, group, mats, insides.defs[i].hole));
  // stairs of blocks up to the entrances of Khufu and Menkaure, and the mouth of Khafre's lower passage in the pavement
  insides.defs.forEach((d, i) => { const K = d.K, sp = ['k1done', 'k2done', 'k3done'][i];
    for (const [x, z, w, dd, top] of d.stair || []) { P.add('blocks', sp, put(block(w, top + 0.4, dd), K.x + x, K.lvl - 0.4, K.z + z), shade(C.lime, 0.92), 6); ob([boxOb(K.x + x, K.z + z, w, dd, 0, -1e9, 1e9, { top: K.lvl + top })], K.y1); }
    if (d.mouth) { const [x, w, za, zb] = d.mouth, yg = ground(K.x + x, K.z + za) + 0.03; P.add('plain', 'all', put(new THREE.PlaneGeometry(w * 2, zb - za).rotateX(-Math.PI / 2), K.x + x, yg, K.z + (za + zb) / 2), C.dark); for (const sd of [-1, 1]) P.add('fine', 'all', put(block(0.35, 0.25, zb - za + 0.7), K.x + x + sd * (w + 0.18), yg - 0.1, K.z + (za + zb) / 2), C.granite); }
  });

  // ---- ramps ----
  const ramps = [];
  const ramp = (K, x, z, L, h, half) => {
    const m = new THREE.Mesh(rampGeo(L, h, half, h * SLOPE + 2, 3), mats.ramp);
    m.position.set(x, K.lvl, z); m.rotation.y = Math.PI / 2; m.castShadow = m.receiveShadow = true; m.frustumCulled = false; group.add(m); ramps.push({ m, K, h });
  };
  ramp(K1, RAMP.x, RAMP.z0, RAMP.z0 - RAMP.z1, RH, RAMP.half);
  ramp(K2, K2.x - 30, K2.z + K2.b / 2 + 160, 160, 24, 10);
  ramp(K3, K3.x, K3.z + K3.b / 2 + 105, 105, 15, 8);
  // the ramps of Khafre and Menkaure are walkable: up the roadway (and its rubble sides) to whatever has been built
  for (const [K, x, zs, L, h, half] of [[K2, K2.x - 30, K2.z + K2.b / 2 + 160, 160, 24, 10], [K3, K3.x, K3.z + K3.b / 2 + 105, 105, 15, 8]]) {
    const land = h * SLOPE + 2, top = (X, Z, year) => { const sc = Math.min(1, (builtCourses(K, year) * K.H) / K.n / h), y = sc * h * Math.min(1, (zs - Z) / L); return K.lvl + y - Math.max(0, Math.abs(X - x) - half) * 2; };
    ob([rectOb([x - half - h / 2 - 2, x + half + h / 2 + 2, zs - L - land, zs], -1e9, 1e9, { top })], K.y0, K.y1);
  }

  // ---- the quarry: stepped faces, and blocks being cut free on its floor ----
  {
    const q = QUARRY, f = q.floor;
    const tier = (x0, z0, x1, z1, inx, inz, y, h, depth) => {
      const L = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0); let d = 0;
      while (d < L - 2) { const len = Math.min(L - d, 6 + r() * 12), t = (d + len / 2) / L, dd = depth * (0.7 + r() * 0.6), hh = h * (0.75 + r() * 0.4), bx = x0 + (x1 - x0) * t + inx * dd * 0.5, bz = z0 + (z1 - z0) * t + inz * dd * 0.5; P.add('rock', 'all', put(block(len - 0.15, hh, dd), bx, y, bz, ry), shade(C.rock, 0.82 + r() * 0.2), 5); ob([boxOb(bx, bz, len - 0.15, dd, ry, -1e9, 1e9, { top: y + hh })]); d += len; }
    };
    for (const [y, h, off, depth] of [[f - 0.5, 4.2, 7.5, 4.5], [f + 3, 5.4, 3.2, 4.2]]) {
      tier(q.x0 + off, q.z0 + 2, q.x0 + off, q.z1 - 2, -1, 0, y, h, depth); tier(q.x1 - off, q.z0 + 2, q.x1 - off, q.z1 - 2, 1, 0, y, h, depth);
      tier(q.x0 + 2, q.z1 - off, q.x1 - 2, q.z1 - off, 0, 1, y, h, depth);
      tier(q.x0 + 2, q.z0 + off, RAMP.x - 17, q.z0 + off, 0, -1, y, h, depth); tier(RAMP.x + 17, q.z0 + off, q.x1 - 2, q.z0 + off, 0, -1, y, h, depth);
    }
    // the working face: a bench in the south-east corner scored into blocks by trenches a man can stand in
    for (let i = 0; i < 7; i++) for (let k = 0; k < 4; k++) { if ((i + k * 2) % 5 === 4) continue; const hh = 1.5 + (k > 1 ? 1.4 : 0), bx = q.x1 - 34 + i * 2.5, bz = q.z1 - 22 + k * 2; P.add('rock', 'all', put(block(1.9, hh, 1.4), bx, f - 0.3, bz), shade(C.lime, 0.85 + r() * 0.2), 5); ob([boxOb(bx, bz, 1.9, 1.4, 0, -1e9, 1e9, { top: f - 0.3 + hh })]); }
    for (let i = 0; i < 16; i++) { const bx = q.x0 + 30 + r() * 60, bz = q.z0 + 16 + r() * 40, ry = r() * 3; P.add('blocks', 'all', put(block(1.5, 0.95, 1.1), bx, f - 0.05, bz, ry), shade(C.lime, 0.9 + r() * 0.15), 6); ob([boxOb(bx, bz, 1.5, 1.1, ry, -1e9, 1e9, { top: f + 0.9 })]); }
    for (let i = 0; i < 40; i++) P.add('rock', 'all', put(new THREE.DodecahedronGeometry(0.3 + r() * 0.5), q.x0 + 14 + r() * 100, f + 0.1, q.z0 + 12 + r() * 64, r() * 3), shade(C.rock, 0.8 + r() * 0.2), 5);
  }

  // ---- Khufu: mortuary temple (black basalt floor), causeway, valley temple, queens' pyramids, enclosure, boat pits ----
  const east = K1.x + K1.b / 2;
  const upper1 = ob(temple(P, 'k1done', east + 12, east + 52, K1.z - 26, K1.z + 26, 8, { floor: C.basalt, doors: [0] }), K1.y1);
  {
    const x0 = east + 52, z0 = K1.z, x1 = 457, z1 = -475, yAt = (x, z) => Math.max(ground(x, z) + 0.3, 30.3 + (2.9 - 30.3) * clamp((x - 262) / (x1 - 262), 0, 1));
    const lower = ob(temple(P, 'k1done', 457, 499, -503, -447, 8, { doors: [-12, 12], floor: C.basalt, back: true }), K1.y1);
    causeway('fine', 'k1done', [[x0, z0], [x0 + 10, z0], [x1 - 10, z1], [x1, z1]], yAt, 9, 3.4, true, upper1.floor, lower.floor, K1.y1);
    const qy = ground(478, -475) - 0.6; P.add('blocks', 'k1build', put(block(46, 1.1, 60), 478, qy, -475), C.lime, 6); ob([rectOb([455, 501, -505, -445], -1e9, 1e9, { top: qy + 1.1 })], K1.y0 - 5, K1.y1);   // the harbour quay while the building goes on
  }
  for (let i = 0; i < 3; i++) { const b = 47 - i * 1.5, x = east + 68, z = K1.z + 62 + i * 58, y = ground(x, z) - 0.3; P.add('fine', 'k1done', put(block(b, b * 0.636, b, SLOPE), x, y, z), C.tura); ob([x - b / 2, x + b / 2, z - b / 2, z + b / 2], K1.y1); }
  const enclosure = (K, span, gap, h) => {
    const a = K.b / 2 + gap, y = K.lvl - 0.4;
    SIDES.forEach((s, i) => {
      if (i === 0) { for (const k of [-1, 1]) P.add('fine', span, wall(K.x + a, K.z + k * 30, K.x + a, K.z + k * a, h, 2.6, y), shade(C.tura, 0.93)); return; }   // the temple stands in the east wall
      P.add('fine', span, wall(K.x + s[0] * a - s[1] * a, K.z + s[1] * a + s[0] * a, K.x + s[0] * a + s[1] * a, K.z + s[1] * a - s[0] * a, h, 2.6, y), shade(C.tura, 0.93));
    });
  };
  /** A causeway along the polyline pts ([x, z]): its walls stop you, its roadway carries you, from the floor of one temple to the other's. */
  function causeway(mat, span, path, yAt, width, high, roof, yStart, yEnd, from) {
    const yHi = (x, z) => { let y = -Infinity; for (const [dx, dz] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) y = Math.max(y, yAt(x + dx, z + dz)); return y; };   // never below the ground on either side of a point
    const pts = []; path.forEach((p, i) => { if (!i) return; const q = path[i - 1], leg = roadPts(q[0], q[1], p[0], p[1], yHi, 4); pts.push(...(i > 1 ? leg.slice(1) : leg)); });
    pts[0][1] = yStart; pts[pts.length - 1][1] = yEnd;
    const deep = Math.max(...pts.map((p) => p[1] - ground(p[0], p[2]))) + 2;
    P.add(mat, span, roadGeo(pts, width, high, deep, roof), mat === 'fine' ? shade(C.tura, 0.95) : C.plaster);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, e = 0.9;
      const ya = a[1], yb = b[1], top = (X, Z) => ya + (yb - ya) * clamp(((X - a[0]) * ux + (Z - a[2]) * uz) / L, 0, 1);
      const A = [a[0] - ux * e, a[2] - uz * e], B = [b[0] + ux * e, b[2] + uz * e];
      ob([stripOb([a[0], a[2]], [b[0], b[2]], width / 2 - 1.2, -1e9, 1e9, { top })], from);
      for (const sd of [-1, 1]) { const o = sd * (width / 2 - 0.6); ob([stripOb([A[0] + nx * o, A[1] + nz * o], [B[0] + nx * o, B[1] + nz * o], 0.6)], from); }
    }
  }
  enclosure(K1, 'k1done', 10.5, 7); enclosure(K2, 'k2done', 13, 7); enclosure(K3, 'k3done', 10, 5);
  for (const [K, gap] of [[K1, 10.5], [K2, 13], [K3, 10]]) {   // the enclosure walls stop you; the gaps either side of the temple let you in
    const a = K.b / 2 + gap, yr = [K1.y1, K2.y1, K3.y1][[K1, K2, K3].indexOf(K)];
    ob([stripOb([K.x - a, K.z - a], [K.x + a, K.z - a], 1.3), stripOb([K.x - a, K.z + a], [K.x + a, K.z + a], 1.3), stripOb([K.x - a, K.z - a], [K.x - a, K.z + a], 1.3), stripOb([K.x + a, K.z - a], [K.x + a, K.z - 30], 1.3), stripOb([K.x + a, K.z + 30], [K.x + a, K.z + a], 1.3)], yr);
  }
  for (const x of [K1.x - 20, K1.x + 30]) for (let i = 0; i < 20; i++) P.add('fine', 'k1done', put(block(1.52, 0.5, 5.2), x + (i - 9.5) * 1.6, K1.lvl - 0.2, K1.z + K1.b / 2 + 24), shade(C.tura, 0.82 + r() * 0.1));   // roofing slabs over the boat pits

  // ---- Khafre: mortuary temple, causeway down to the valley temple beside the Sphinx ----
  const e2 = K2.x + K2.b / 2;
  const upper2 = ob(temple(P, 'k2done', e2 + 14, e2 + 118, K2.z - 24, K2.z + 24, 10, { doors: [0], rows: 2 }), K2.y1);
  {
    const y = ground(372, 228) - 0.5, VZ = 212.5;   // valley temple: a great square block cased in red granite, two doors to the quay, the causeway coming in at the north-west
    causeway('fine', 'k2done', [[e2 + 118, K2.z], [e2 + 128, K2.z], [245, 200], [339, VZ], [349, VZ]], (x, z) => ground(x, z) + 0.5, 7, 3.2, true, upper2.floor, y + 0.6, K2.y1);
    // its walls of granite five metres thick, and inside them the T-shaped hall of square granite pillars, statues of the king round it, under a roof of slabs
    const G = C.granite, V = (a) => ob([rectOb(a)], K2.y1);
    for (const sd of [-1, 1]) { P.add('fine', 'k2done', put(block(46, 13.5, 5, 0, 0.075), 372, y, 228 + sd * 20.5), G); V([349, 395, 228 + sd * 20.5 - 2.5, 228 + sd * 20.5 + 2.5]); }
    const seg = (x, a, b, gaps, gh) => { let za = a; for (const [g0, g1] of gaps) { P.add('fine', 'k2done', put(block(5, 13.5, g0 - za, 0.075, 0), x, y, (za + g0) / 2), G); V([x - 2.5, x + 2.5, za, g0]); P.add('fine', 'k2done', put(block(5 - 0.15 * gh, 13.5 - gh, g1 - g0, 0.075, 0), x, y + gh, (g0 + g1) / 2), G); za = g1; } P.add('fine', 'k2done', put(block(5, 13.5, b - za, 0.075, 0), x, y, (za + b) / 2), G); V([x - 2.5, x + 2.5, za, b]); };
    seg(392.5, 210, 246, [[213.7, 216.3], [239.7, 242.3]], 6.6); seg(351.5, 210, 246, [[VZ - 1.5, VZ + 1.5]], 4.6);
    P.add('fine', 'k2done', put(block(36, 0.6, 36), 372, y, 228), shade(C.tura, 0.97)).add('fine', 'k2done', put(block(36, 13.5 - 6.2, 36), 372, y + 6.2, 228), shade(G, 0.8));
    P.add('fine', 'k2done', put(block(40, 0.6, 40), 372, y + 13.5, 228), shade(C.granite, 0.9));
    for (const dz of [-13, 13]) door(P, 'fine', 'k2done', 372 + 23 - 0.075 * 3, y + 0.6, 228 + dz, Math.PI / 2, 2.6, 6, shade(C.granite, 0.8), true);
    const pil = (px, pz) => { P.add('fine', 'k2done', put(block(1.05, 5.6, 1.05), px, y + 0.6, pz), G).add('fine', 'k2done', put(block(1.05, 0.6, 6), px, y + 5.6, pz), shade(G, 0.9)); V([px - 0.55, px + 0.55, pz - 0.55, pz + 0.55]); };
    for (let k = 0; k < 6; k++) pil(380, 213 + k * 6); for (let k = 0; k < 4; k++) for (const pz of [222, 234]) pil(358 + k * 5.5, pz);
    for (let k = 0; k < 10; k++) { const sx = k < 5 ? 356 + k * 6 : 356 + (k - 5) * 6, sz = k < 5 ? 211.4 : 244.6, sd = k < 5 ? 1 : -1;   // seated statues of the king in diorite and alabaster, along the north and south walls
      const c = k % 3 ? lin(C.basalt) : shade(C.linen, 0.9); P.add('fine', 'k2done', put(block(1.2, 1.1, 1.3), sx, y + 0.6, sz), c).add('fine', 'k2done', put(block(0.8, 1.5, 0.6), sx, y + 1.7, sz - sd * 0.3), c).add('fine', 'k2done', put(block(0.5, 0.6, 0.55), sx, y + 3.2, sz - sd * 0.3), c); V([sx - 0.6, sx + 0.6, sz - 0.65, sz + 0.65]); }
    for (const [lx, lz, bw, bd] of [[0, 21.2, 44, 1.6], [0, -21.2, 44, 1.6], [21.2, 0, 1.6, 44], [-21.2, 0, 1.6, 44]]) P.add('fine', 'k2done', put(block(bw, 1.5, bd), 372 + lx, y + 13.5, 228 + lz), shade(C.granite, 0.94));   // the parapet round its roof
    for (const sd of [-1, 1]) P.add('fine', 'k2done', put(block(47, 0.9, 1.2), 372, y, 228 + sd * 23), shade(C.granite, 0.82));   // plinth, left open at the doors
    for (const [a, b] of [[204.5, 213.7], [216.3, 239.7], [242.3, 251.5]]) P.add('fine', 'k2done', put(block(1.2, 0.9, b - a), 395, y, (a + b) / 2), shade(C.granite, 0.82));
    for (const [a, b] of [[204.5, VZ - 1.5], [VZ + 1.5, 251.5]]) P.add('fine', 'k2done', put(block(1.2, 0.9, b - a), 349, y, (a + b) / 2), shade(C.granite, 0.82));
    P.add('fine', 'k2done', put(block(3.4, 5.6, 5.4, 0.04), 396.6, y + 0.4, 228), shade(C.granite, 0.9)).add('fine', 'k2done', put(block(4, 0.5, 6.2), 396.6, y + 6, 228), shade(C.granite, 1.05)).add('fine', 'k2done', put(block(0.4, 3.6, 2.2), 398.2, y + 1.2, 228), C.dark);   // a shrine between them
    V([394.9, 398.3, 225.3, 230.7]);
    for (const dz of [-13, 13]) for (const s of [-1, 1]) {   // a pair of sphinxes couched by each door
      const sx = 402, sz = 228 + dz + s * 5.4; V([sx - 4.3, sx + 4.3, sz - 1.4, sz + 1.4]); P.add('fine', 'k2done', put(block(8.6, 1, 2.8), sx, y + 0.8, sz), shade(C.granite, 0.85)).add('fine', 'k2done', put(block(7.4, 1.7, 2, 0.12, 0.2), sx - 0.3, y + 1.8, sz), C.tura)
        .add('fine', 'k2done', put(block(1.5, 2.3, 1.9, 0.12), sx + 2.6, y + 2.6, sz), C.tura).add('fine', 'k2done', put(block(3, 0.7, 2.2, 0.05), sx + 3, y + 1.8, sz), shade(C.tura, 0.96));
    }
    P.add('blocks', 'k2done', put(block(42, 1.2, 58), 418, y - 0.2, 222), shade(C.lime, 1.05), 6); ob([rectOb([397, 439, 193, 251], -1e9, 1e9, { top: y + 1.0 })], K2.y1);   // the quay before its doors
    ob([rectOb([354, 390, 210, 246], -1e9, 1e9, { top: y + 0.6 })], K2.y1);
    // the Sphinx temple in front of the paws
    ob(temple(P, 'k2done', 345, 391, SPHINX.z - 24, SPHINX.z + 22, 5.2, { sanct: 0, c: shade(C.lime, 1.1), doors: [-14, 14], rows: 2, t: 6 }), K2.y1);
  }
  ob(sphinx(P, 'sphinx'), -2545);
  {   // before the Sphinx: the knoll of harder rock the quarrymen left standing; and round the Sphinx the faces they cut it from
    const S = SPHINX, kn = skin([[-33, 2, 2, 3, 2, 5], [-22, 5, 1, 7, 5, 9, 2.6], [-6, 5, -1, 8, 5, 10, 2.8], [8, 6, 1, 10, 6, 9, 2.6], [17, 6, 0, 13, 6, 7, 2.4], [24, 4, 0, 6, 4, 6], [31, 1.5, 0, 2, 1.5, 3]], { segs: 14 });
    P.add('rock', 'knoll', put(kn, S.x, S.lvl - 0.3, S.z), (x, y) => shade(C.rock, 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(y * 2.1 + x * 0.05))), 5); ob([S.x - 34, S.x + 32, S.z - 10, S.z + 10], -1e9, -2545);
    for (const [x0, z0, x1, z1] of [[S.x - 49, S.z - 20, S.x - 49, S.z + 20], [S.x - 49, S.z - 21, S.x - 10, S.z - 21], [S.x - 49, S.z + 21, S.x - 10, S.z + 21]]) { P.add('rock', 'sphinx', wall(x0, z0, x1, z1, 7.5, 3, S.lvl - 1, 0.06), shade(C.rock, 0.9), 5); ob([stripOb([x0, z0], [x1, z1], 1.6, -1e9, 1e9, { top: S.lvl + 6.5 })], -2545); }   // the rock faces of the hollow: you can stand on their tops
    // sand: by the New Kingdom the desert has buried it to the shoulders, until a prince has it dug out
    P.add('sand', 'drift', put(skin([[-50, 0, 0, 0.6, 0.5, 8], [-34, 0, 2, 9.5, 1, 17], [-5, 0, -1, 11.5, 1, 20], [22, 0, 1, 10.5, 1, 17], [40, 0, 0, 5, 1, 12], [52, 0, 0, 0.6, 0.5, 7]], { segs: 18 }), S.x, S.lvl - 0.2, S.z), [1, 1, 1], 9);
    P.add('sand', 'nk2', put(skin([[-52, 0, 0, 0.5, 0.5, 5], [-40, 0, 0, 5, 1, 13], [-28, 0, 0, 0.6, 0.5, 9]], { segs: 12 }), S.x - 2, S.lvl + 2, S.z - 6), [1, 1, 1], 9);
    // the Dream Stele between the paws, and a small temple of mud brick to Horemakhet beside the hollow
    P.add('fine', 'nk2', put(block(2.2, 3.6, 0.7), S.x + 18.5, S.lvl - 0.2, S.z, Math.PI / 2), C.granite);
    P.add('fine', 'nk2', put(new THREE.CylinderGeometry(1.1, 1.1, 0.7, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), S.x + 18.5, S.lvl + 3.4, S.z), C.granite);
    const tx = S.x - 6, tz = S.z - 44, ty = ground(tx, tz) - 0.4; P.add('brick', 'nk', put(block(22, 5.5, 16, 0.05), tx, ty, tz), C.plaster); door(P, 'brick', 'nk', tx + 11 - 0.2, ty + 0.4, tz, Math.PI / 2, 2, 3.4, C.tura); ob([tx - 11, tx + 11, tz - 8, tz + 8], -1500);
  }

  // ---- Menkaure: temple finished in mud brick, causeway, three queens' pyramids to the south ----
  const e3 = K3.x + K3.b / 2;
  const upper3 = ob(temple(P, 'k3done', e3 + 8, e3 + 62, K3.z - 22, K3.z + 22, 7, { mat: 'brick', c: C.plaster, pillar: C.tura, floor: C.mud, t: 4 }), K3.y1);
  const lower3 = ob(temple(P, 'k3done', 57, 103, 348, 396, 6.5, { mat: 'brick', c: C.plaster, pillar: C.tura, floor: C.mud, t: 4, back: true }), K3.y1);
  causeway('brick', 'k3done', [[e3 + 62, K3.z], [e3 + 72, K3.z], [47, 372], [57, 372]], (x, z) => ground(x, z) + 0.4, 6, 2.6, false, upper3.floor, lower3.floor, K3.y1);
  for (let i = 0; i < 3; i++) {
    const b = 44 - (i ? 12 : 0), x = K3.x + (1 - i) * 50, z = K3.z + K3.b / 2 + 44, y = ground(x, z) - 0.4;
    if (!i) P.add('fine', 'k3done', put(block(b, b * 0.64, b, SLOPE), x, y, z), C.tura);
    else for (let k = 0; k < 4; k++) P.add('blocks', 'k3done', put(block(b - k * 7.4, 5.2, b - k * 7.4, 0.12), x, y + k * 5.2, z), shade(C.lime, 0.95 + r() * 0.08), 6);   // two were left as steps
    ob([x - b / 2, x + b / 2, z - b / 2, z + b / 2], K3.y1);
  }

  // ---- cemeteries: streets of mastabas west and east of the Great Pyramid, laid out on a grid as it rose ----
  for (let i = 0; i < 9; i++) for (let k = 0; k < 8; k++) {
    if (r() < 0.12) continue;
    const x = -112 - i * 26, z = -562 + k * 36;
    const span = ['m1', 'm3'][Math.min(1, Math.floor((i + k * 0.6 + r()) / 6))];
    ob(mastaba(P, span, r, x, z, 12 + r() * 3, 26 + r() * 4, 4 + r() * 1.5), span === 'm1' ? -2590 : -2540);   // in the years its span draws it
  }
  for (let k = 0; k < 5; k++) ob(mastaba(P, 'm3', r, 272, -330 + k * 38, 22, 32, 6), -2540);
  for (const [x, z, w, l] of [[170, 300, 9, 20], [198, 318, 11, 24], [232, 302, 8, 17], [150, 338, 7, 15]]) ob(mastaba(P, 'all', r, x, z, w, l, 3.2, true));   // older tombs of mud brick

  return {
    obstacles, pyramids, insides,
    update(year, hill) {
      for (const p of pyramids) p.update(year); insides.update(year);
      for (const q of ramps) { const n = builtCourses(q.K, year), on = year >= q.K.y0 && year < q.K.y1 && n > 0; q.m.visible = on; if (on) q.m.scale.y = q.K === K1 ? Math.max(hill, 1e-3) : Math.min(1, (n * q.K.H) / q.K.n / q.h); }
    },
  };
}
