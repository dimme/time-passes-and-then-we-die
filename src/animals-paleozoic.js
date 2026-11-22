// Before the dinosaurs: trilobites, the first land arthropods, the first four-legged animals, giant dragonflies, sail-backs and the survivors of the Great Dying.
import * as THREE from 'three';
import { rng } from './util.js?v=fea1c89f';
import { Rig, loft, mass, cone, at, mirror, hide, hex, TAU, TOOTH, NAIL, IVORY, HORN } from './animals-rig.js?v=fea1c89f';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const EYE = hex(0x140e06);

// =====================================================================================
// Sprawling limbs: the upper bone points out sideways and swings fore and aft, the lower one stands on the foot, and the trunk bends from
// side to side so that each girdle turns towards its reaching foot. Solved in 3D here; the rig's own legs work in one vertical plane.
// =====================================================================================
const _a = new THREE.Vector3(), _p = new THREE.Vector3(), _u = new THREE.Vector3(), _l = new THREE.Vector3(), _n = new THREE.Vector3(), _y = new THREE.Vector3();
const _m = new THREE.Matrix4(), _qU = new THREE.Quaternion(), _qL = new THREE.Quaternion(), _qF = new THREE.Quaternion(), _e = new THREE.Euler();
/** The rotation that lays a bone along x with its bending axis along n. */
const aim = (q, x, n) => q.setFromRotationMatrix(_m.makeBasis(x, _y.crossVectors(n, x), n));

/**
 * One limb on side sd = ±1, hung from the girdle bone `parent` (reached from the root through the bones `chain`, which only turn about the vertical).
 * L = { J: [hip, knee, ankle] as [x, y, z] in the middle of the stance, R: skin radii [front, back, halfWidth] at hip, upper arm, knee, shank and ankle,
 * top: [dx, dy, dz, r] where the skin starts inside the body, foot: digits(…) options, phase, lift, toeOff, curl }.
 */
function sprawlLimb(b, name, parent, chain, sd, L, tile) {
  const J = L.J.map((p) => [p[0], p[1], sd * p[2]]), F = L.foot, psi = sd * (F.yaw ?? 0.35), toe = [J[2][0] + Math.cos(psi) * F.len * 0.7, 0, J[2][2] + Math.sin(psi) * F.len * 0.7];
  const names = ['a', 'b', 'f'].map((k, i) => b.bone(name + k, i ? name + 'ab'[i - 1] : parent, ...J[i], i === 2 ? toe : undefined));
  const mid = (i, f) => J[i].map((v, k) => v + (J[i + 1][k] - v) * f), tp = [J[0][0] + L.top[0], J[0][1] + L.top[1], J[0][2] + sd * L.top[2]];
  b.skin(loft([[...tp, L.top[3]], [...J[0], ...L.R[0]], [...mid(0, 0.45), ...L.R[1]], [...J[1], ...L.R[2]], [...mid(1, 0.35), ...L.R[3]], [...J[2], ...L.R[4]]], { segs: 10, sub: 3, tile, ref: [1, 0, 0], capA: 0.5, capB: 0.3 }),
    b.path([[parent, tp], ...names], 0.35));
  digits(b, names[2], J[2], sd, F);
  const H = new THREE.Vector3(...J[0]), u = new THREE.Vector3(...J[1]).sub(H), l = new THREE.Vector3(...J[2]).sub(new THREE.Vector3(...J[1])), l1 = u.length(), l2 = l.length();
  u.normalize(); l.normalize(); _n.crossVectors(u, l).normalize();
  const dir = new THREE.Vector3(...J[2]).sub(H).normalize(), pole = new THREE.Vector3(...J[1]).sub(H); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
  (b.sprawl ||= []).push({ b: names.map((n) => b.ix[n]), chain: chain.map((n) => b.ix[n]), H, l1, l2, pole, qU: aim(new THREE.Quaternion(), u, _n).invert(), qL: aim(new THREE.Quaternion(), l, _n).invert(),
    toe, F: J[2].map((v, k) => v - toe[k]), phase: L.phase + (sd > 0 ? 0 : 0.5), lift: L.lift ?? 0.06, toeOff: L.toeOff ?? 0.5, curl: L.curl ?? 0.4 });
  b.custom = sprawlPose;
}

/** Plant each foot, carry it forward in the swing, and bend the limb to reach it from wherever the swinging trunk has put the girdle. */
function sprawlPose(a, g) {
  const B = a.bones, def = a.def, { duty, stride: S } = def.gait, R0 = def.bones[def.root].p, dy = B[def.root].position.y - R0[1];
  for (const L of def.sprawl) {
    let px = R0[0], pz = R0[2], th = 0, prev = R0;   // where the girdle is now, and how far it has turned
    for (const i of L.chain) { const q = def.bones[i].p, dx = q[0] - prev[0], dz = q[2] - prev[2], c = Math.cos(th), s = Math.sin(th); px += dx * c + dz * s; pz += dz * c - dx * s; th += B[i].rotation.y; prev = q; }
    let p = g / TAU + L.phase, x, y = 0, pitch; p -= Math.floor(p);
    if (p < duty) { const u = p / duty; x = S * (0.5 - u); pitch = -L.toeOff * smooth((u - 0.72) / 0.28); }
    else { const s = (p - duty) / (1 - duty), k = Math.sin(Math.PI * s); x = S * (smooth(s) - 0.5); y = L.lift * k; pitch = -L.toeOff * (1 - smooth(s * 1.6)) - L.curl * k; }
    const cp = Math.cos(pitch), sp = Math.sin(pitch), dx = L.toe[0] + x + L.F[0] * cp - L.F[1] * sp - px, dz = L.toe[2] + L.F[2] - pz, c = Math.cos(th), s = Math.sin(th);
    _a.set(prev[0] + dx * c - dz * s, y + L.F[0] * sp + L.F[1] * cp - dy, prev[2] + dx * s + dz * c).sub(L.H);   // hip → ankle, in the girdle's own frame
    const len = _a.length(), d = clamp(len, Math.abs(L.l1 - L.l2) + 1e-4, L.l1 + L.l2 - 1e-4), k = (L.l1 * L.l1 - L.l2 * L.l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L.l1 * L.l1 - k * k));
    _a.divideScalar(len); _p.copy(L.pole).addScaledVector(_a, -L.pole.dot(_a)).normalize();
    _u.copy(_a).multiplyScalar(k).addScaledVector(_p, h); _l.copy(_a).multiplyScalar(d).sub(_u).normalize(); _u.normalize(); _n.crossVectors(_u, _l).normalize();
    aim(_qU, _u, _n).multiply(L.qU); aim(_qL, _l, _n).multiply(L.qL);
    B[L.b[0]].quaternion.copy(_qU); B[L.b[1]].quaternion.copy(_qU).invert().multiply(_qL);
    B[L.b[2]].quaternion.copy(_qL).invert().multiply(_qF.setFromEuler(_e.set(0, -th, pitch, 'YZX')));   // the foot stays flat and pointing ahead while planted
  }
}

/** A spreading foot on bone f at ankle A: n digits fanned over `fan` radians about a heading turned `yaw` outwards; claw > 0 adds nails that long (in toe radii). */
function digits(b, f, A, sd, { n = 5, len, r, fan = 1.1, yaw = 0.35, claw = 0, rel = [0.6, 0.85, 1, 0.95, 0.7], web = 0, segs = 6 }) {
  const psi = sd * yaw, pal = len * 0.42, cx = A[0] + Math.cos(psi) * pal * 0.55, cz = A[2] + Math.sin(psi) * pal * 0.55;
  b.skin(mass(cx, A[1] * 0.5, cz, pal * (1.15 + web), A[1] * 0.6, pal * (0.85 + web), 0, -psi, 1, 0.7), f);
  for (let i = 0; i < n; i++) {
    const an = psi + sd * (i / (n - 1) - 0.5) * fan, l = len * (0.4 + 0.6 * rel[i]), dx = Math.cos(an), dz = Math.sin(an), tip = [A[0] + dx * l, r * 0.7, A[2] + dz * l];
    b.skin(loft([[cx + dx * pal * 0.3, A[1] * 0.6, cz + dz * pal * 0.3, r * 1.1], [cx + dx * pal * 0.9, r * 0.95, cz + dz * pal * 0.9, r], [...tip, r * 0.75]], { segs, sub: 2, capB: 0.9 }), f);
    if (claw) b.detail(loft([[...tip, r * 0.6], [tip[0] + dx * r * claw * 0.55, r * 0.65, tip[2] + dz * r * claw * 0.55, r * 0.4], [tip[0] + dx * r * claw, r * 0.12, tip[2] + dz * r * claw, 0.002]], { segs: 5, sub: 2 }), f, NAIL);
  }
}

/**
 * A sprawling four-legged animal from side-view profiles (metres, snout towards +x, x = 0 midway between the shoulder and the hip).
 * trunk = one loft from the tail tip to the back of the skull; head = the skull as [x, top, tooth row, halfWidth], jaw = [x, top, bottom, halfWidth]; y = height of the backbone;
 * tailJ / neckJ = joint runs ending at the tail tip / the head joint; fore / hind = sprawlLimb specs for the right side;
 * bend = how far each girdle turns (radians), hinge = the jaw joint.
 */
function sprawler(s) {
  const b = new Rig(), T = s.tile, xs = s.fore.J[0][0], xh = s.hind.J[0][0], Y = s.y;
  b.bone('body', null, 0, Y, 0);
  b.bone('tho', 'body', xs * 0.3, Y); b.bone('chest', 'tho', xs * 0.8, Y); b.bone('lum', 'body', xh * 0.3, Y); b.bone('pelvis', 'lum', xh * 0.8, Y);
  const tail = b.run('tail', 'pelvis', s.tailJ), neck = b.run('neck', 'chest', s.neckJ), hj = s.neckJ[s.neckJ.length - 1];
  b.bone('head', neck[neck.length - 1], hj[0], hj[1], 0, [...s.nose, 0]);
  const spine = b.path([...tail.slice().reverse(), 'pelvis', 'lum', 'body', 'tho', 'chest', ...neck, 'head'], 0.5);
  const e = s.trunk[s.trunk.length - 1], tuck = [e[0] + (s.nose[0] - e[0]) * 0.3, e[1] + (s.nose[1] - e[1]) * 0.3, 0, e[3] * 0.5, e[4] * 0.5, e[5] * 0.5];   // the neck ends inside the skull
  b.skin(loft([...s.trunk, tuck], { segs: 18, tile: T, capA: 0.5 }), spine);
  // the skull is a dome over the tooth row and the jaw a trough under it, so that the lips meet along the whole side of the mouth
  const dome = (p) => { const e = (p[1] - p[2]) * 0.12; return [p[0], p[2] + e, 0, p[1] - p[2] - e, e, p[3]]; }, trough = (p) => { const e = (p[1] - p[2]) * 0.15; return [p[0], p[1] - e, 0, e, p[1] - p[2] - e, p[3]]; };
  b.skin(loft(s.head.map(dome), { segs: 16, tile: T, capA: 0.3, capB: 0.6 }), 'head');
  b.bone('jaw', 'head', s.hinge[0], s.hinge[1]); b.jaw = b.ix.jaw; b.gape = s.gape || 0.35;
  b.skin(loft(s.jaw.map(trough), { segs: 12, tile: T, capA: 0.6, capB: 0.6 }), 'jaw');
  // a walking trot: each forefoot lands just after the opposite hind foot, and the trunk bends into a C towards the pair that is reaching
  const pf = s.fore.phase = 0, ph = s.hind.phase = 0.58, bend = s.bend ?? 0.16, cf = { kg: 1, kph: 0, phase: TAU * pf + Math.PI / 2 }, ch = { kg: 1, kph: 0, phase: TAU * ph + Math.PI / 2 };
  b.sway('tho', 'y', bend / 2, cf).sway('chest', 'y', bend / 2, cf).sway('lum', 'y', bend / 2, ch).sway('pelvis', 'y', bend / 2, ch);
  neck.forEach((n) => b.sway(n, 'y', (-bend * 0.8) / neck.length, cf));   // the head keeps looking where the animal is going
  b.wave(tail, 'y', s.wag ?? bend * 0.9, { ...ch, phase: ch.phase + 2.6, lag: 0.75, grow: false });
  b.sway('head', 'y', 0.07, { kt: 0.27 }).sway('head', 'z', 0.03, { kt: 0.19 });
  for (const sd of [1, -1]) {
    sprawlLimb(b, 'f' + (sd > 0 ? 'r' : 'l'), 'chest', ['tho', 'chest'], sd, s.fore, T);
    sprawlLimb(b, 'h' + (sd > 0 ? 'r' : 'l'), 'pelvis', ['lum', 'pelvis'], sd, s.hind, T);
  }
  const [ex, ey, ez, er] = s.eye;
  b.pair('detail', (sd) => [mass(ex, ey, sd * ez, er, er, er * 0.7, 0, 0, 1, 0.6), 'head', EYE]);
  if (s.brow) b.pair('skin', (sd) => [mass(ex - er * 0.3, ey + er * s.brow, sd * (ez - er * 0.5), er * 2, er * 0.8, er * 1.1, -0.15, 0, 1, 0.6), 'head']);
  if (s.nostril) b.pair('detail', (sd) => [mass(s.nostril[0], s.nostril[1], sd * s.nostril[2], s.nostril[3], s.nostril[3] * 0.6, s.nostril[3] * 0.5), 'head', EYE]);
  if (s.extra) s.extra(b, spine);
  const make = b.build(s);
  b.half = (xs - xh) / 2;
  return make;
}

/**
 * A sail: skin stretched over a row of neural spines, each [x, y at the back, x, y at the tip], from tail to neck. `th` = thickness of a spine at its
 * base, `dip` = how far the skin sags between two tips, `bars` = how far little crossbars stand out along each spine (Edaphosaurus).
 */
function sail(spines, th, dip, tile, bars = 0, rows = 5, sub = 4) {
  const cols = (spines.length - 1) * sub + 1, pos = [], uv = [], idx = [];
  for (const sd of [1, -1]) {
    const o = pos.length / 3;
    for (let c = 0; c < cols; c++) {
      const i = Math.min(spines.length - 2, Math.floor(c / sub)), f = c / sub - i, A = spines[i], Bq = spines[i + 1], ridge = (0.5 + 0.5 * Math.cos(TAU * f)) ** 3, edge = c === 0 || c === cols - 1 ? 0 : 1;
      const x0 = A[0] + (Bq[0] - A[0]) * f, y0 = A[1] + (Bq[1] - A[1]) * f, x1 = A[2] + (Bq[2] - A[2]) * f, y1 = A[3] + (Bq[3] - A[3]) * f, top = 1 - dip * Math.sin(Math.PI * f) ** 2;
      for (let r = 0; r <= rows; r++) {
        const v = (r / rows) * top, bar = 1 + bars * (r % 2);
        pos.push(x0 + (x1 - x0) * v, y0 + (y1 - y0) * v, sd * edge * th * (0.22 + 0.78 * ridge * bar) * (1 - 0.75 * (r / rows)) * (r === rows ? 0.15 : 1)); uv.push(x0 / tile, (y0 + (y1 - y0) * v) / tile);
      }
    }
    for (let c = 0; c < cols - 1; c++) for (let r = 0; r < rows; r++) { const p = o + c * (rows + 1) + r, q = p + rows + 1; sd > 0 ? idx.push(p, p + 1, q, p + 1, q + 1, q) : idx.push(p, q, p + 1, p + 1, q, q + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// =====================================================================================
// Arthropods: armour seen from above, and many small legs that each swing about their base
// =====================================================================================
/** An armour surface on the grid xs × vs (xs rising, v = −1…1 across): half(x) is the half-width there and height(x, v) the top of the shell. */
function shell(xs, vs, half, height, tile) {
  const pos = [], uv = [], idx = [], W = vs.length;
  for (const x of xs) { const w = half(x); for (const v of vs) { pos.push(x, height(x, v), w * v); uv.push(x / tile, (w * v) / tile); } }
  for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < W - 1; k++) { const a = i * W + k, c = a + W; idx.push(a, a + 1, c, a + 1, c + 1, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const both = (vs) => [...vs, 0, ...vs.map((v) => -v).reverse()];

/** Planted on the backstroke, lifted on the return; ph staggers the legs into waves that run along the body. */
function crawlPose(a, g) {
  const B = a.bones;
  for (const L of a.def.crawl) { const f = g + L.ph; B[L.b].rotation.y = L.sd * L.swing * Math.cos(f); B[L.b].rotation.x = -L.sd * L.lift * Math.max(0, -Math.sin(f)); }
}
/** One jointed leg on its own bone at pts[0]; pts = [[x, y, z], …] out to the tip, r = radius at the base. */
function crawlLeg(b, name, parent, sd, pts, r, ph, { swing = 0.3, lift = 0.25, segs = 4, tint = [0.7, 0.65, 0.6] } = {}) {
  b.bone(name, parent, ...pts[0], pts[pts.length - 1]);
  b.skin(loft(pts.map((p, i) => [...p, r * (1 - (0.7 * i) / (pts.length - 1))]), { segs, sub: 2, ref: [1, 0, 0] }), name, tint);
  (b.crawl ||= []).push({ b: b.ix[name], sd, ph, swing, lift }); b.custom = crawlPose;
}

/**
 * A millipede or one of its giant kin: N body rings between a head and a tail plate, L long, W = half-width, H = thickness, y0 = clearance.
 * flat = rings drawn out sideways into plates (Arthropleura) instead of round; per = leg pairs under each ring.
 */
function myriapod({ L, N, W, H, y0, flat, per, rl, tile, tex, color, coat }) {
  const b = new Rig(), seg = L / (N + 2), U = (x) => (L / 2 - x) / seg, taper = (u) => Math.min(1, 0.72 + 0.1 * (u - 1), 0.5 + 0.1 * (N + 1 - u));
  const half = (x) => { const u = U(x), m = u - Math.floor(u); return u < 1 ? W * 0.62 * Math.sqrt(1 - (1 - u) ** 2 * 0.96) : u > N + 1 ? W * taper(N + 1) * Math.sqrt(Math.max(0.02, 1 - (u - N - 1) ** 2)) : W * taper(u) * (flat ? 0.8 + 0.2 * Math.sin(Math.PI * m) ** 0.6 : 1); };
  const height = (x, v) => {
    const u = U(x), m = u - Math.floor(u), ring = u >= 1 && u <= N + 1, lap = ring ? 1 + 0.16 * m : 1, a = 0.42, av = Math.abs(v), end = u < 1 ? Math.sqrt(1 - (1 - u) ** 2 * 0.8) : u > N + 1 ? Math.sqrt(Math.max(0, 1 - (u - N - 1) ** 2 * 0.8)) : 1;
    return y0 + H * end * lap * (flat ? (av < a ? 0.5 + 0.5 * Math.sqrt(1 - (av / a) ** 2) : 0.5 * (1 - 0.75 * ((av - a) / (1 - a)) ** 1.6)) : Math.sqrt(Math.max(0, 1 - v * v * 0.98)));
  };
  const xs = []; for (let j = 0; j < N + 2; j++) for (const m of flat ? [0, 0.35, 0.7, 0.97] : [0, 0.5, 0.97]) xs.push(L / 2 - seg * (j + m));
  xs.push(-L / 2); xs.reverse();
  const nb = Math.max(2, Math.round(N / 6)), step = L / (2 * nb + 1), yb = y0 + H * 0.4, spineJ = [];
  b.bone('b0', null, 0, yb, 0);
  for (const [n, s] of [['f', 1], ['r', -1]]) for (let k = 1; k <= nb; k++) b.bone(n + k, k > 1 ? n + (k - 1) : 'b0', s * k * step, yb, 0, k === nb ? [s * L / 2, yb, 0] : undefined);
  for (let k = nb; k >= 1; k--) spineJ.push('r' + k); spineJ.push('b0'); for (let k = 1; k <= nb; k++) spineJ.push('f' + k);
  const spine = b.path(spineJ, 0.5), boneAt = (x) => { const k = Math.min(nb, Math.round(Math.abs(x) / step)); return k ? (x > 0 ? 'f' : 'r') + k : 'b0'; };
  b.wing(shell(xs, both(flat ? [-1, -0.85, -0.66, -0.48, -0.38, -0.25, -0.12] : [-1, -0.92, -0.75, -0.5, -0.25]), half, height, tile), spine);
  let i = 0;
  for (let j = 0; j < N; j++) for (let q = 0; q < per; q++, i++) {
    const x = L / 2 - seg * (j + 1 + (q + 0.5) / per), hw = W * taper(j + 1.5), ph = i * (TAU / 11);   // eleven legs to a wave
    for (const sd of [1, -1]) crawlLeg(b, 'l' + i + (sd > 0 ? 'r' : 'l'), boneAt(x), sd, flat ? [[x, y0 + H * 0.1, sd * hw * 0.22], [x, y0 + H * 0.12, sd * hw * 0.66], [x, y0 * 0.4, sd * hw * 0.92], [x - seg * 0.1, 0, sd * hw * 1.02]]
      : [[x, y0 + H * 0.15, sd * hw * 0.3], [x, y0 + H * 0.3, sd * hw * 1.1], [x - seg * 0.1, 0, sd * hw * 1.5]], rl, ph, { swing: 0.3, lift: flat ? 0.1 : 0.2, segs: flat ? 4 : 3 });
  }
  // short antennae and a pair of small eyes on the head
  const hx = L / 2 - seg * 0.45, hy = height(hx, 0.5);
  b.pair('skin', (s) => [loft([[hx + seg * 0.1, hy * 0.8, s * W * 0.3, rl * 0.8], [hx + seg * 0.7, hy * 0.9, s * W * 0.55, rl * 0.6], [hx + seg * 1.2, hy * 0.5, s * W * 0.8, rl * 0.3]], { segs: 4, sub: 2 }), 'f' + nb, [0.7, 0.65, 0.6]]);
  b.pair('detail', (s) => [mass(hx, hy + rl * 0.3, s * W * 0.36, rl * 1.1, rl * 0.9, rl * 1.1, 0, 0, 1, 0.5), 'f' + nb, EYE]);
  spineJ.forEach((n, k) => { if (n !== 'b0') b.sway(n, 'y', 0.05, { kt: 0.8, phase: k * 0.9 }); });
  const make = b.build({ color, tex, wingTex: tex, coat, rough: 0.5, wingMat: { roughness: 0.5 }, back: 0.9, gait: { duty: 0.5, stride: 2 * W * (flat ? 0.85 : 1.15) * Math.sin(0.3) } });
  b.half = L * 0.35;
  return make;
}

/** Four stiff wings beating a little out of step, fore pair ahead of the hind pair. */
function flutter(a, g, t) {
  const B = a.bones, F = a.def.flutter, f = t * F.rate + (a.ph || 0) * 7;
  for (const w of F.wings) B[w.b].rotation.x = -w.sd * (F.dihedral + F.amp * Math.sin(f - w.lag));
}
/** A dragonfly wing along +z from its root: `len` long, chord(u) wide at u = 0…1 along it; the texture runs root → tip and trailing → leading edge. */
function insectWing(len, chord) {
  const pos = [], uv = [], idx = [], nu = 12, nv = 3;
  for (let i = 0; i <= nu; i++) { const u = i / nu, c = chord(u), le = 0.25 * chord(0) + 0.012 * Math.sin(Math.PI * u) * len; for (let k = 0; k <= nv; k++) { pos.push(le - c * (1 - k / nv), 0.004 * Math.sin(Math.PI * (k / nv)) * (1 - u), u * len); uv.push(u, k / nv); } }
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, c = a + nv + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** The membrane of an insect wing: clear, with a stiff leading edge, long veins fanning back from the root and a net of cross-veins between them. */
function veinTex() {
  const c = document.createElement('canvas'), W = c.width = 512, Hh = c.height = 128, g = c.getContext('2d'), r = rng(31);
  g.fillStyle = 'rgba(165,155,115,0.42)'; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = 'rgba(50,36,20,0.55)'; g.lineWidth = 1;
  for (let x = 4; x < W; x += 7) for (let y = 0; y < Hh; y += 13) { const o = r() * 6; g.beginPath(); g.moveTo(x + o, y + r() * 4); g.lineTo(x + o + (r() - 0.5) * 4, y + 13 + r() * 4); g.stroke(); }
  g.strokeStyle = 'rgba(45,30,16,0.95)';
  for (const [y, w] of [[3, 5], [12, 1.6], [22, 1.6]]) { g.lineWidth = w; g.beginPath(); g.moveTo(0, y + 20); g.quadraticCurveTo(W * 0.3, y, W, y + 4); g.stroke(); }
  g.lineWidth = 1.4;
  for (let k = 1; k <= 9; k++) { const x = W * (k / 9) ** 0.75; g.beginPath(); g.moveTo(0, 44); g.quadraticCurveTo(x * 0.55, 30 + k * 5, x, k === 9 ? 60 : Hh); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function paleozoic(M) {
  const SKIN = hide('wrinkle', 21), SHELL = hide('pebble', 22);

  // ---------- Dimetrodon limbatus: 3.2 m long with a 0.45 m skull; neural spines up to 1.1 m carry the sail from the neck to the hips (top 1.7 m above
  // the ground); humerus 0.21 m, femur 0.23 m, held out and down in a "high walk" with the belly clear of the ground; the tail is half the animal ----------
  {
    const trunk = [[-1.9, 0.13, 0, 0.012], [-1.6, 0.17, 0, 0.03, 0.03, 0.022], [-1.3, 0.23, 0, 0.055, 0.055, 0.04], [-1.0, 0.3, 0, 0.085, 0.085, 0.065], [-0.75, 0.36, 0, 0.12, 0.13, 0.1], [-0.5, 0.4, 0, 0.17, 0.2, 0.16],
      [-0.25, 0.41, 0, 0.2, 0.27, 0.21], [0, 0.41, 0, 0.21, 0.3, 0.23], [0.25, 0.41, 0, 0.21, 0.3, 0.23], [0.47, 0.42, 0, 0.2, 0.27, 0.2], [0.62, 0.45, 0, 0.16, 0.19, 0.14], [0.75, 0.48, 0, 0.13, 0.14, 0.105], [0.86, 0.5, 0, 0.12, 0.12, 0.09]];
    // a tall, narrow skull: convex snout, the eye high and far back, a step in the upper jaw behind the front teeth
    const skull = [[0.84, 0.63, 0.445, 0.085], [0.94, 0.66, 0.445, 0.09], [1.06, 0.655, 0.445, 0.072], [1.18, 0.625, 0.44, 0.058], [1.27, 0.58, 0.435, 0.048]];
    const jaw = [[0.86, 0.455, 0.35, 0.08], [1.0, 0.455, 0.352, 0.07], [1.15, 0.452, 0.357, 0.052], [1.26, 0.447, 0.365, 0.038]];
    const spines = [];
    for (let i = 0; i <= 25; i++) { const u = i / 25, x = -0.56 + u * 1.3, p = at(trunk, x), h = 1.12 * Math.sin(Math.PI * clamp(u * 0.94 + 0.03)) ** 0.62; spines.push([x, p[1] + p[3] - 0.03, x + (u - 0.45) * 0.34, p[1] + p[3] - 0.03 + h]); }
    M.dimetrodon = sprawler({
      color: 0x6f6846, tex: SKIN, tile: 0.7, rough: 0.8, gait: { duty: 0.7, stride: 0.38 }, y: 0.42, bend: 0.16, gape: 0.4,
      tailJ: [[-0.6, 0.39], [-0.85, 0.34], [-1.1, 0.28], [-1.35, 0.22], [-1.6, 0.17], [-1.9, 0.13]], neckJ: [[0.6, 0.45], [0.84, 0.5]], nose: [1.31, 0.47], hinge: [0.87, 0.45],
      trunk, head: skull, jaw, eye: [0.955, 0.6, 0.08, 0.017], brow: 0.9, nostril: [1.27, 0.53, 0.036, 0.012],
      fore: { J: [[0.47, 0.36, 0.16], [0.41, 0.25, 0.34], [0.46, 0.06, 0.3]], top: [0, 0.06, -0.08, 0.11], R: [[0.1, 0.115, 0.095], [0.085, 0.1, 0.08], [0.06, 0.065, 0.06], [0.055, 0.068, 0.054], [0.04, 0.042, 0.044]],
        foot: { len: 0.19, r: 0.017, claw: 3.2, yaw: 0.3 }, lift: 0.07 },
      hind: { J: [[-0.47, 0.38, 0.14], [-0.36, 0.26, 0.33], [-0.46, 0.065, 0.3]], top: [0, 0.06, -0.07, 0.12], R: [[0.115, 0.135, 0.1], [0.095, 0.115, 0.085], [0.065, 0.07, 0.064], [0.058, 0.075, 0.055], [0.042, 0.044, 0.046]],
        foot: { len: 0.22, r: 0.018, claw: 3.2, yaw: 0.45 }, lift: 0.07 },
      coat: (x, y, z, ny) => (y > 0.66 && z < 0.03 ? [1.5 - 0.5 * clamp((y - 1.1) * 2), 0.95, 0.7].map((c) => c * (0.8 + 0.25 * Math.sin(y * 9 + Math.sin(x * 6)))) : 1 - 0.22 * clamp(Math.sin(x * 9 + y * 5) * 2) * clamp(ny + 0.5)),
      extra: (b, spine) => {
        b.skin(sail(spines, 0.018, 0.1, 0.7), spine);
        // teeth of two kinds ("Dimetrodon" = two measures of tooth): long stabbing canines near the front of the upper jaw, small cutting teeth behind
        for (let i = 0; i < 13; i++) {
          const x = 1.27 - i * 0.027, u = at(skull, x), big = i === 0 || i === 1 ? 0.035 : i === 4 || i === 5 ? 0.06 : 0.02 + 0.006 * (i % 2);
          if (i !== 3) b.pair('detail', (s) => [cone(big * 0.24 + 0.002, big, x, u[2] + 0.012, s * u[3] * 0.9, Math.PI), 'head', TOOTH]);
          const l = at(jaw, x - 0.012); if (i < 12) b.pair('detail', (s) => [cone(0.005, i < 3 ? 0.03 : 0.017, x - 0.012, l[1] - 0.008, s * l[3] * 0.7), 'jaw', TOOTH]);
        }
      },
    });
  }

  // ---------- Ichthyostega / Acanthostega, the first animals with legs: 1.2 m long, a flat 0.2 m head with the eyes on top, a salamander's body on
  // limbs with 8 cm upper bones, seven-toed paddles for hind feet, and still a fish's tail with a rayed fin above and below ----------
  {
    const trunk = [[-0.7, 0.075, 0, 0.02, 0.02, 0.004], [-0.56, 0.08, 0, 0.045, 0.04, 0.012], [-0.43, 0.09, 0, 0.055, 0.05, 0.03], [-0.32, 0.1, 0, 0.062, 0.065, 0.06], [-0.22, 0.11, 0, 0.07, 0.075, 0.095],
      [0, 0.115, 0, 0.075, 0.085, 0.11], [0.2, 0.115, 0, 0.07, 0.08, 0.105], [0.3, 0.11, 0, 0.06, 0.065, 0.09], [0.36, 0.105, 0, 0.05, 0.05, 0.085]];
    const skull = [[0.34, 0.15, 0.072, 0.085], [0.42, 0.142, 0.07, 0.094], [0.495, 0.122, 0.066, 0.082], [0.54, 0.1, 0.063, 0.058]];
    const fin = (sgn, h, x0, x1) => { const sp = []; for (let i = 0; i <= 14; i++) { const u = i / 14, x = x0 + u * (x1 - x0), p = at(trunk, x), y = p[1] + sgn * (sgn > 0 ? p[3] : p[4]) * 0.8; sp.push([x, y, x - 0.05 * (1 - u), y + sgn * h * Math.sin(Math.PI * clamp(u * 0.9 + 0.12)) ** 0.7]); } return sail(sp, 0.004, 0.06, 0.25, 0, 3, 2); };
    M.tetrapod = sprawler({
      color: 0x6a7244, tex: SKIN, tile: 0.3, rough: 0.45, belly: 1.5, gait: { duty: 0.72, stride: 0.16 }, y: 0.11, bend: 0.3, wag: 0.3, gape: 0.3,
      tailJ: [[-0.3, 0.1], [-0.4, 0.092], [-0.5, 0.085], [-0.6, 0.08], [-0.7, 0.075]], neckJ: [[0.3, 0.11], [0.35, 0.105]], nose: [0.56, 0.08], hinge: [0.355, 0.085],
      trunk, head: skull, jaw: [[0.35, 0.078, 0.045, 0.08], [0.45, 0.075, 0.043, 0.082], [0.53, 0.07, 0.046, 0.06]], eye: [0.435, 0.132, 0.042, 0.011], brow: 0.5, nostril: [0.535, 0.092, 0.03, 0.005],
      fore: { J: [[0.25, 0.1, 0.09], [0.215, 0.1, 0.17], [0.26, 0.025, 0.19]], top: [0, 0.01, -0.04, 0.035], R: [[0.03, 0.035, 0.03], [0.027, 0.03, 0.025], [0.022, 0.024, 0.022], [0.02, 0.024, 0.02], [0.016, 0.018, 0.02]],
        foot: { len: 0.085, r: 0.006, n: 6, fan: 1.5, yaw: 0.45, rel: [0.6, 0.8, 0.95, 1, 0.9, 0.7], web: 0.15, segs: 4 }, lift: 0.03, toeOff: 0.3, curl: 0.2 },
      hind: { J: [[-0.25, 0.1, 0.085], [-0.2, 0.09, 0.17], [-0.25, 0.025, 0.19]], top: [0, 0.01, -0.04, 0.035], R: [[0.032, 0.036, 0.03], [0.028, 0.032, 0.026], [0.022, 0.024, 0.022], [0.02, 0.024, 0.02], [0.017, 0.019, 0.022]],
        foot: { len: 0.1, r: 0.006, n: 7, fan: 1.7, yaw: 0.9, rel: [0.55, 0.75, 0.9, 1, 1, 0.9, 0.7], web: 0.25, segs: 4 }, lift: 0.025, toeOff: 0.25, curl: 0.2 },
      coat: (x, y, z, ny) => { const d = clamp(Math.sin(x * 23 + Math.sin(z * 30) * 1.5) * Math.sin(z * 26 + x * 9) * 3) * clamp(ny + 0.4); return [1 - 0.5 * d, 1 - 0.45 * d, 1 - 0.3 * d].map((c) => c * (ny < -0.2 ? 1.5 : 1)); },
      extra: (b, spine) => {
        b.skin(fin(1, 0.075, -0.7, -0.33), spine, [1.15, 1.05, 0.8]).skin(fin(-1, 0.04, -0.7, -0.36), spine, [1.15, 1.05, 0.8]);
        for (let i = 0; i < 16; i++) { const x = 0.54 - i * 0.011, u = at(skull, x); b.pair('detail', (s) => [cone(0.002, 0.007, x, u[2] + 0.003, s * u[3] * 0.93, Math.PI, 0, 1, 5), 'head', TOOTH]); }
      },
    });
  }

  // ---------- Eryops, a temnospondyl amphibian: 2 m long and stout; a broad, flat 0.5 m skull with the eyes and nostrils on top; four fingers, five toes,
  // no claws; humerus 0.17 m, femur 0.2 m, held straight out from a heavy body ----------
  {
    const trunk = [[-0.95, 0.12, 0, 0.02, 0.02, 0.008], [-0.8, 0.15, 0, 0.07, 0.065, 0.03], [-0.6, 0.2, 0, 0.11, 0.11, 0.065], [-0.42, 0.25, 0, 0.15, 0.16, 0.14], [-0.3, 0.27, 0, 0.17, 0.2, 0.22], [0, 0.28, 0, 0.18, 0.22, 0.27],
      [0.25, 0.28, 0, 0.18, 0.21, 0.26], [0.4, 0.27, 0, 0.16, 0.18, 0.22], [0.52, 0.26, 0, 0.11, 0.11, 0.19]];
    const skull = [[0.5, 0.365, 0.2, 0.19], [0.65, 0.36, 0.2, 0.2], [0.8, 0.32, 0.198, 0.16], [0.92, 0.285, 0.195, 0.12], [1.0, 0.26, 0.193, 0.085]];
    const jaw = [[0.52, 0.21, 0.135, 0.185], [0.7, 0.21, 0.13, 0.18], [0.88, 0.207, 0.135, 0.125], [0.99, 0.203, 0.145, 0.08]];
    M.eryops = sprawler({
      color: 0x7a7448, tex: SKIN, tile: 0.5, rough: 0.5, belly: 1.45, gait: { duty: 0.72, stride: 0.28 }, y: 0.28, bend: 0.2, gape: 0.3,
      tailJ: [[-0.42, 0.25], [-0.6, 0.2], [-0.8, 0.15], [-0.95, 0.12]], neckJ: [[0.42, 0.27], [0.5, 0.26]], nose: [1.02, 0.21], hinge: [0.53, 0.215],
      trunk, head: skull, jaw, eye: [0.64, 0.348, 0.088, 0.02], brow: 0.6, nostril: [0.95, 0.268, 0.05, 0.012],
      fore: { J: [[0.33, 0.24, 0.2], [0.27, 0.2, 0.36], [0.34, 0.05, 0.36]], top: [0, 0.03, -0.1, 0.09], R: [[0.075, 0.085, 0.07], [0.065, 0.075, 0.06], [0.05, 0.055, 0.05], [0.045, 0.055, 0.045], [0.036, 0.04, 0.045]],
        foot: { len: 0.15, r: 0.016, n: 4, fan: 1.1, yaw: 0.35, rel: [0.75, 1, 1, 0.75] }, lift: 0.05, toeOff: 0.35, curl: 0.25 },
      hind: { J: [[-0.33, 0.25, 0.18], [-0.22, 0.2, 0.36], [-0.32, 0.05, 0.37]], top: [0, 0.03, -0.09, 0.1], R: [[0.085, 0.095, 0.075], [0.07, 0.085, 0.065], [0.052, 0.058, 0.052], [0.048, 0.06, 0.046], [0.038, 0.042, 0.046]],
        foot: { len: 0.17, r: 0.016, fan: 1.3, yaw: 0.6 }, lift: 0.05, toeOff: 0.35, curl: 0.25 },
      coat: (x, y, z, ny) => { const d = clamp(Math.sin(x * 11 + Math.sin(z * 14) * 1.6) * Math.sin(z * 13 + x * 5) * 3 - 0.3) * clamp(ny + 0.5); return [1 - 0.5 * d, 1 - 0.5 * d, 1 - 0.4 * d].map((c) => c * (ny < -0.25 ? 1.45 : 1)); },
      extra: (b) => {
        for (let i = 0; i < 22; i++) { const x = 0.99 - i * 0.02, u = at(skull, x); b.pair('detail', (s) => [cone(0.0035, 0.012, x, u[2] + 0.004, s * u[3] * 0.95, Math.PI, 0, 1, 5), 'head', TOOTH]); }   // a palisade of small pegs
      },
    });
  }

  // ---------- a gorgonopsid (Inostrancevia's smaller kin): 2.5 m long, 0.9 m at the back; a 0.45 m skull with 11 cm sabre canines and big incisors; forelimbs
  // still sprawl, but the hind legs are tucked half under the body; a short tail ----------
  {
    const trunk = [[-1.25, 0.38, 0, 0.015], [-1.05, 0.46, 0, 0.05, 0.05, 0.04], [-0.8, 0.56, 0, 0.1, 0.1, 0.08], [-0.6, 0.64, 0, 0.16, 0.17, 0.14], [-0.45, 0.68, 0, 0.21, 0.24, 0.2], [-0.2, 0.68, 0, 0.23, 0.29, 0.24],
      [0.1, 0.68, 0, 0.24, 0.32, 0.25], [0.35, 0.69, 0, 0.24, 0.32, 0.24], [0.5, 0.71, 0, 0.22, 0.28, 0.2], [0.65, 0.74, 0, 0.18, 0.2, 0.15], [0.78, 0.78, 0, 0.14, 0.15, 0.115]];
    const skull = [[0.75, 0.9, 0.715, 0.1], [0.87, 0.91, 0.715, 0.105], [1.0, 0.895, 0.712, 0.082], [1.12, 0.88, 0.708, 0.07], [1.19, 0.855, 0.705, 0.062]];
    const jaw = [[0.77, 0.725, 0.63, 0.09], [0.95, 0.725, 0.63, 0.075], [1.1, 0.722, 0.615, 0.06], [1.18, 0.718, 0.615, 0.05]];
    M.gorgonopsid = sprawler({
      color: 0x7a6a50, tex: SKIN, tile: 0.7, rough: 0.8, gait: { duty: 0.66, stride: 0.55 }, y: 0.68, bend: 0.1, gape: 0.75,
      tailJ: [[-0.55, 0.66], [-0.8, 0.56], [-1.05, 0.46], [-1.25, 0.38]], neckJ: [[0.55, 0.72], [0.75, 0.78]], nose: [1.22, 0.76], hinge: [0.78, 0.715],
      trunk, head: skull, jaw, eye: [0.89, 0.85, 0.094, 0.016], brow: 0.9, nostril: [1.2, 0.8, 0.04, 0.012],
      fore: { J: [[0.45, 0.56, 0.15], [0.33, 0.34, 0.32], [0.46, 0.07, 0.25]], top: [0, 0.1, -0.07, 0.14], R: [[0.12, 0.14, 0.11], [0.1, 0.12, 0.09], [0.07, 0.075, 0.068], [0.06, 0.078, 0.06], [0.045, 0.05, 0.05]],
        foot: { len: 0.2, r: 0.018, claw: 2.6, yaw: 0.2, fan: 0.9 }, lift: 0.1 },
      hind: { J: [[-0.45, 0.62, 0.13], [-0.27, 0.36, 0.24], [-0.47, 0.08, 0.2]], top: [0, 0.1, -0.06, 0.15], R: [[0.14, 0.17, 0.12], [0.12, 0.14, 0.1], [0.075, 0.08, 0.07], [0.065, 0.09, 0.06], [0.046, 0.05, 0.05]],
        foot: { len: 0.22, r: 0.018, claw: 2.6, yaw: 0.2, fan: 0.9 }, lift: 0.1 },
      coat: (x, y, z, ny) => 1 - 0.3 * clamp(Math.sin(x * 7 + Math.sin(y * 6) * 0.8) * 2 - 0.4) * clamp(ny + 0.3),
      extra: (b) => {
        // sabres: one long, back-curved canine each side behind five stout incisors; only a few small teeth behind them
        b.pair('detail', (s) => [loft([[1.08, 0.73, s * 0.064, 0.022, 0.022, 0.013], [1.075, 0.66, s * 0.068, 0.017, 0.017, 0.01], [1.058, 0.595, s * 0.068, 0.002]], { segs: 7, sub: 3 }), 'head', TOOTH]);
        for (let i = 0; i < 5; i++) b.pair('detail', (s) => [cone(0.008, 0.04, 1.2 - i * 0.006, 0.715, s * (0.008 + i * 0.011), Math.PI), 'head', TOOTH]);
        for (let i = 0; i < 4; i++) { const x = 1.02 - i * 0.022, u = at(skull, x); b.pair('detail', (s) => [cone(0.005, 0.016, x, u[2] + 0.006, s * u[3] * 0.9, Math.PI), 'head', TOOTH]); }
        for (let i = 0; i < 4; i++) b.pair('detail', (s) => [cone(0.007, 0.03, 1.185 - i * 0.008, 0.71, s * (0.008 + i * 0.01)), 'jaw', TOOTH]);
        b.pair('detail', (s) => [cone(0.011, 0.045, 1.13, 0.71, s * 0.043), 'jaw', TOOTH]);
      },
    });
  }

  // ---------- Lystrosaurus, which inherited the Earth after the Great Dying: 1 m long and 0.45 m at the back, a barrel on short legs; a short, deep face
  // bent downwards, a horny beak and two tusks; nostrils high in front of the eyes; a stub of a tail ----------
  {
    const trunk = [[-0.5, 0.2, 0, 0.012], [-0.4, 0.26, 0, 0.04, 0.04, 0.035], [-0.3, 0.3, 0, 0.1, 0.11, 0.1], [-0.2, 0.31, 0, 0.13, 0.16, 0.15], [0, 0.31, 0, 0.14, 0.18, 0.17], [0.15, 0.31, 0, 0.14, 0.17, 0.16], [0.26, 0.32, 0, 0.12, 0.14, 0.13], [0.34, 0.33, 0, 0.1, 0.1, 0.09]];
    const skull = [[0.32, 0.43, 0.285, 0.085], [0.4, 0.435, 0.285, 0.09], [0.47, 0.4, 0.265, 0.065], [0.52, 0.35, 0.24, 0.05]];
    M.lystrosaurus = sprawler({
      color: 0x8a7458, tex: SKIN, tile: 0.4, rough: 0.8, gait: { duty: 0.68, stride: 0.26 }, y: 0.31, bend: 0.14, gape: 0.25,
      tailJ: [[-0.3, 0.3], [-0.4, 0.26], [-0.5, 0.2]], neckJ: [[0.26, 0.32], [0.33, 0.34]], nose: [0.54, 0.26], hinge: [0.34, 0.285],
      trunk, head: skull, jaw: [[0.33, 0.295, 0.217, 0.075], [0.42, 0.295, 0.212, 0.065], [0.5, 0.275, 0.205, 0.04]], eye: [0.4, 0.4, 0.08, 0.011], brow: 0.9, nostril: [0.485, 0.365, 0.045, 0.008],
      fore: { J: [[0.2, 0.27, 0.12], [0.15, 0.19, 0.23], [0.2, 0.04, 0.2]], top: [0, 0.04, -0.05, 0.07], R: [[0.06, 0.07, 0.055], [0.05, 0.06, 0.048], [0.04, 0.044, 0.04], [0.036, 0.044, 0.036], [0.03, 0.032, 0.034]],
        foot: { len: 0.11, r: 0.012, claw: 2, yaw: 0.25, fan: 1 }, lift: 0.05 },
      hind: { J: [[-0.2, 0.29, 0.11], [-0.12, 0.17, 0.19], [-0.2, 0.045, 0.17]], top: [0, 0.04, -0.05, 0.08], R: [[0.07, 0.08, 0.06], [0.058, 0.07, 0.052], [0.042, 0.046, 0.042], [0.038, 0.048, 0.038], [0.03, 0.034, 0.034]],
        foot: { len: 0.12, r: 0.012, claw: 2, yaw: 0.25, fan: 1 }, lift: 0.05 },
      coat: (x, y, z, ny) => 1 + 0.25 * clamp(-ny * 2 - 0.4),
      extra: (b) => {
        b.detail(loft([[0.5, 0.285, 0, 0.045, 0.05, 0.048], [0.535, 0.245, 0, 0.03, 0.035, 0.03], [0.54, 0.2, 0, 0.004]], { segs: 8, sub: 3 }), 'head', HORN);   // the upper beak hooks down over the lower
        b.detail(loft([[0.49, 0.225, 0, 0.025, 0.02, 0.036], [0.52, 0.235, 0, 0.004]], { segs: 8, sub: 3 }), 'jaw', HORN);
        b.pair('detail', (s) => [loft([[0.465, 0.27, s * 0.055, 0.014], [0.473, 0.235, s * 0.058, 0.01], [0.485, 0.2, s * 0.058, 0.002]], { segs: 7, sub: 3 }), 'head', IVORY]);
      },
    });
  }

  // ---------- a trilobite (proportions of Elrathia and its kin): three lobes side by side - a raised axis between two flat flanks - and three parts end to end:
  // a crescent head shield with eyes and cheek spines, 11 hinged body segments, and a tail shield. Modelled 1 long, built 10 cm; the herd scales it 5-35 cm ----------
  {
    const b = new Rig(), W = 0.34, sg = 0.04, x0 = -0.26, x1 = 0.18, y0 = 0.035;
    const half = (x) => (x >= x1 ? W * Math.sqrt(1 - ((x - x1) / 0.32) ** 2.2) : x >= x0 ? W * (0.8 + 0.17 * ((x - x0) / 0.44)) * (0.9 + 0.1 * Math.sin(Math.PI * (((x - x0) / sg) % 1)) ** 0.5) : W * 0.78 * Math.sqrt(Math.max(0, 1 - ((x0 - x) / 0.24) ** 2)));
    const height = (x, v) => {
      const av = Math.abs(v), head = x >= x1, m = (((x - x0) / sg) % 1 + 1) % 1, groove = head ? 0 : (x >= x0 ? 0.014 : 0.007) * (m < 0.05 || m > 0.95 ? 1 : 0);
      const a = head ? 0.3 - 0.06 * ((x - x1) / 0.32) : x >= x0 ? 0.3 : 0.3 - 0.16 * ((x0 - x) / 0.24), s = clamp((av - a) / (1 - a)), end = head ? 1 - ((x - x1) / 0.32) ** 3 : x < x0 ? 1 - ((x0 - x) / 0.24) ** 2.5 : 1;
      const axis = av < a ? (head ? 0.062 * Math.sqrt(Math.max(0, 1 - ((x - x1) / 0.25) ** 2)) : 0.055 * (x < x0 ? 1 - 0.6 * ((x0 - x) / 0.24) : 1)) * Math.sqrt(1 - (av / a) ** 2) : 0;
      return y0 + Math.max(0, (0.06 * (1 - s ** 2.2) + axis - 0.014 * Math.exp(-(((av - a) / 0.045) ** 2)) - groove) * end);
    };
    const xs = []; for (let i = 0; i <= 12; i++) xs.push(-0.5 + i * 0.02); for (let i = 0; i < 11; i++) for (const m of [0.04, 0.5, 0.96]) xs.push(x0 + (i + m) * sg); for (let i = 0; i <= 10; i++) xs.push(x1 + 0.32 * Math.sin((i / 10) * Math.PI / 2));
    b.bone('body', null, 0, 0.06, 0); b.bone('head', 'body', x1, 0.06, 0, [0.5, 0.06, 0]); b.bone('pyg', 'body', x0, 0.06, 0, [-0.5, 0.06, 0]);
    const spine = b.path(['pyg', 'body', 'head'], 0.6), boneAt = (x) => (x > x1 ? 'head' : x < x0 ? 'pyg' : 'body');
    b.wing(shell(xs, both([-1, -0.9, -0.74, -0.56, -0.42, -0.33, -0.27, -0.18, -0.08]), half, height, 0.25), spine);
    for (const k of [-1, 0, 1]) b.pair('detail', (s) => [mass(0.3 + k * 0.02, height(0.3, 0.52) + 0.002, s * W * (0.5 - 0.03 * k * k), 0.017, 0.011, 0.009, 0, s * k * 0.5, 1, 0.5), 'head', [0.05, 0.035, 0.02]]);   // crescent eyes beside the swelling in the middle of the head
    b.pair('wing', (s) => [loft([[0.24, y0 + 0.004, s * W * 0.93, 0.004, 0.004, 0.03], [0.14, y0 + 0.004, s * W * 0.97, 0.004, 0.004, 0.022], [0.04, y0 + 0.003, s * W * 0.99, 0.003, 0.003, 0.012], [-0.08, y0, s * W * 0.97, 0.001]], { segs: 6, sub: 3, tile: 0.25 }), 'head']);   // cheek spines
    for (let i = 0; i < 14; i++) {   // a pair of legs under every segment, hidden from above
      const x = 0.36 - i * 0.05, hw = half(x);
      for (const sd of [1, -1]) crawlLeg(b, 'l' + i + (sd > 0 ? 'r' : 'l'), boneAt(x), sd, [[x, 0.04, sd * 0.06], [x, 0.045, sd * hw * 0.55], [x - 0.01, 0, sd * hw * 0.9]], 0.009, -i * 0.75 + (sd > 0 ? 0 : Math.PI), { swing: 0.32, lift: 0.12, segs: 3 });
    }
    for (const sd of [1, -1]) {
      const n = 'an' + (sd > 0 ? 'r' : 'l'); b.bone(n, 'head', 0.44, 0.03, sd * 0.05, [0.82, 0.03, sd * 0.3]);
      b.skin(loft([[0.44, 0.03, sd * 0.05, 0.006], [0.6, 0.04, sd * 0.13, 0.004], [0.82, 0.03, sd * 0.3, 0.0015]], { segs: 4, sub: 3 }), n, [0.7, 0.65, 0.6]).sway(n, 'y', 0.25, { kt: 1.3, phase: sd });
    }
    b.sway('head', 'y', 0.05, { kt: 0.6 }).sway('pyg', 'y', 0.06, { kt: 0.8, phase: 1 });
    M.trilobite = b.build({ color: 0x6e5236, tex: SHELL, wingTex: SHELL, rough: 0.5, wingMat: { roughness: 0.45 }, back: 0.95, scale: 0.1, gait: { duty: 0.5, stride: 2 * 0.22 * Math.sin(0.32) },
      coat: (x, y, z) => { const m = (((x - x0) / sg) % 1 + 1) % 1; return x < x1 && (m < 0.1 || m > 0.9) ? 0.6 : 1 + 0.25 * clamp(1 - z * 9); } });
    b.half = 0.03;
  }

  // ---------- Arthropleura, the largest land arthropod ever: 2.3 m long and 0.5 m wide but only a hand high; about 30 plates, each with a raised middle
  // and flat side lobes, and two pairs of legs under every plate (Montceau-les-Mines fossils, 2024) ----------
  M.arthropleura = myriapod({ L: 2.3, N: 30, W: 0.25, H: 0.075, y0: 0.075, flat: true, per: 2, rl: 0.013, tile: 0.35, tex: SHELL, color: 0x5a3e2a,
    coat: (x, y, z) => { const m = ((1.15 - x) / (2.3 / 32)) % 1; return (m > 0.86 ? 0.55 : 1) * (1 + 0.35 * clamp((z - 0.12) * 6)); } });

  // ---------- an early millipede (Pneumodesmus and its kin, among the first animals to breathe air): 6 cm of round rings, two pairs of legs to a ring ----------
  M.millipede = myriapod({ L: 0.06, N: 18, W: 0.0032, H: 0.0036, y0: 0.0024, flat: false, per: 2, rl: 0.0004, tile: 0.02, tex: SHELL, color: 0x3a2a22,
    coat: (x) => (((0.03 - x) / (0.06 / 20)) % 1 > 0.8 ? 0.6 : 1) });

  // ---------- an early scorpion, 14 cm from the claws to the sting (the herd scales it up to 28 cm; Pulmonoscorpius reached 70): a short head shield with
  // the eyes on top, seven broad body segments, a tail of five beads arched over the back to the sting, two clawed arms and four pairs of walking legs ----------
  {
    const b = new Rig(), T = 0.05, DARK = [0.5, 0.45, 0.4];
    b.bone('body', null, 0, 0.012, 0);
    b.skin(loft([[-0.036, 0.012, 0, 0.004, 0.004, 0.005], [-0.028, 0.012, 0, 0.006, 0.005, 0.008], [-0.012, 0.013, 0, 0.008, 0.006, 0.0105], [0.004, 0.013, 0, 0.008, 0.006, 0.0105], [0.016, 0.012, 0, 0.007, 0.005, 0.0095], [0.026, 0.011, 0, 0.005, 0.004, 0.008], [0.031, 0.01, 0, 0.003, 0.003, 0.006]], { segs: 10, tile: T, capA: 0.6, capB: 0.5 }), 'body');
    const tj = [[-0.036, 0.012], [-0.047, 0.016], [-0.056, 0.024], [-0.06, 0.035], [-0.057, 0.046], [-0.048, 0.053], [-0.037, 0.054]], tail = b.run('tail', 'body', tj);
    tail.forEach((n, i) => {
      const p = tj[i], q = tj[i + 1], an = Math.atan2(q[1] - p[1], q[0] - p[0]), l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      b.skin(mass((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0, l * 0.58, i < 5 ? 0.0036 - i * 0.0002 : 0.0034, i < 5 ? 0.0038 - i * 0.0002 : 0.003, an, 0, T, 0.6), n);
    });
    b.detail(loft([[-0.039, 0.054, 0, 0.002], [-0.033, 0.053, 0, 0.0013], [-0.03, 0.048, 0, 0.0002]], { segs: 5, sub: 3 }), tail[5], [0.02, 0.012, 0.008]);   // the sting
    b.wave(tail, 'z', 0.05, { kt: 0.9, lag: 0.5 });
    for (const sd of [1, -1]) {
      // arm: two segments out and forwards, then the hand with a fixed and a movable finger
      const n = 'arm' + (sd > 0 ? 'r' : 'l'), z = (v) => sd * v;
      b.bone(n, 'body', 0.027, 0.011, z(0.005), [0.076, 0.012, z(0.018)]);
      b.skin(loft([[0.027, 0.011, z(0.005), 0.0022], [0.035, 0.013, z(0.019), 0.0024], [0.037, 0.013, z(0.022), 0.0022], [0.05, 0.012, z(0.025), 0.0026]], { segs: 6, sub: 3, tile: T }), n);
      b.skin(mass(0.058, 0.012, z(0.022), 0.0095, 0.0036, 0.0052, 0, z(0.3), T, 0.6), n);
      for (const k of [1, -1]) b.skin(loft([[0.063, 0.012, z(0.02 + k * 0.0025), 0.0022], [0.072, 0.012, z(0.0175 + k * 0.003), 0.0014], [0.079, 0.012, z(0.0165), 0.0002]], { segs: 5, sub: 3 }), n, DARK);
      b.sway(n, 'y', 0.12, { kt: 0.5, phase: sd * 1.3 });
      b.skin(mass(0.032, 0.009, z(0.0028), 0.004, 0.002, 0.002, 0, 0, T, 0.5), 'body', DARK);   // the small pincers of the mouth
      b.detail(mass(0.021, 0.0172, z(0.0018), 0.0011, 0.0009, 0.0011, 0, 0, 1, 0.4), 'body', EYE);
      [[0.021, 0.042, 0.027], [0.015, 0.024, 0.038], [0.009, -0.003, 0.041], [0.003, -0.027, 0.036]].forEach(([bx, tx, tz], i) => {
        const base = [bx, 0.01, z(0.007)], tip = [tx, 0, z(tz)], knee = [bx + (tx - bx) * 0.4, 0.023, z(0.007 + (tz - 0.007) * 0.5)], shin = [bx + (tx - bx) * 0.8, 0.012, z(0.007 + (tz - 0.007) * 0.88)];
        crawlLeg(b, 'l' + i + (sd > 0 ? 'r' : 'l'), 'body', sd, [base, knee, shin, tip], 0.0017, ((i + (sd > 0 ? 0 : 1)) % 2) * Math.PI, { swing: 0.22, lift: 0.18 });
      });
    }
    M.scorpion = b.build({ color: 0x5a3c22, tex: SHELL, rough: 0.4, back: 0.9, gait: { duty: 0.5, stride: 2 * 0.03 * Math.sin(0.22) },
      coat: (x, y, z, ny) => (x > -0.036 && x < 0.014 && ny > 0.3 && ((x + 0.036) / 0.0071) % 1 > 0.82 ? 0.55 : 1) });
    b.half = 0.03;
  }

  // ---------- Meganeura, a griffinfly: 70 cm across the wings and 40 cm long; two pairs of long veined wings held straight out (it could not fold them),
  // a head that is mostly eyes, a stout thorax tilted to carry a basket of spiny legs, and a thin abdomen of ten segments ----------
  {
    const b = new Rig(), T = 0.06, abdJ = [[-0.03, 0.004], [-0.1, 0], [-0.17, -0.004], [-0.24, -0.008], [-0.34, -0.013]];
    b.bone('body', null, 0, 0, 0);
    const abd = b.run('abd', 'body', abdJ);
    b.bone('head', 'body', 0.03, 0.004, 0, [0.055, 0.004, 0]);
    b.skin(loft([[-0.036, 0.003, 0, 0.011, 0.011, 0.01], [-0.015, 0.005, 0, 0.02, 0.02, 0.016], [0.01, 0.005, 0, 0.021, 0.02, 0.017], [0.029, 0.004, 0, 0.012, 0.013, 0.011]], { segs: 10, tile: T, capA: 0.6, capB: 0.6 }), 'body');
    const ab = []; for (let i = 0; i <= 20; i++) { const x = -0.03 - i * 0.0155, joint = i % 2 ? 0.92 : 1.08; ab.push([x, 0.004 - (i * 0.0155 / 0.31) * 0.017, 0, (0.0085 - i * 0.00018) * joint]); }
    b.skin(loft(ab, { segs: 8, sub: 2, tile: T, capB: 0.8 }), b.path(['body', ...abd], 0.5));
    b.pair('skin', (s) => [loft([[-0.338, -0.013, s * 0.003, 0.0022], [-0.355, -0.013, s * 0.008, 0.0018], [-0.37, -0.014, s * 0.006, 0.0005]], { segs: 4, sub: 2 }), abd[abd.length - 1]]);   // claspers
    b.skin(mass(0.04, 0.004, 0, 0.011, 0.011, 0.014, 0, 0, T, 0.7), 'head');
    b.pair('detail', (s) => [mass(0.042, 0.008, s * 0.0095, 0.0095, 0.01, 0.008, 0, s * 0.3, 1, 0.8), 'head', [0.05, 0.07, 0.04]]);   // compound eyes that meet over the head
    for (let i = 0; i < 3; i++) b.pair('skin', (s) => [loft([[0.02 - i * 0.013, -0.012, s * 0.008, 0.0028], [0.034 - i * 0.008, -0.034, s * (0.017 + i * 0.003), 0.0022], [0.062 - i * 0.012, -0.046, s * (0.011 + i * 0.002), 0.0008]], { segs: 4, sub: 3 }), 'body', [0.5, 0.45, 0.4]]);
    const fore = insectWing(0.335, (u) => 0.066 * Math.sin(Math.PI * (0.1 + 0.9 * u) ** 0.75) ** 0.55), hind = insectWing(0.315, (u) => 0.08 * Math.sin(Math.PI * (0.16 + 0.84 * u) ** 0.9) ** 0.5), wings = [];
    for (const sd of [1, -1]) [[fore, 0.016, 0, 0.1], [hind, -0.022, 1.3, -0.14]].forEach(([geo, x, lag, sweep], i) => {
      const n = 'w' + i + (sd > 0 ? 'r' : 'l'), g = geo.clone().rotateY(sweep).translate(x, 0.021, 0.011);
      b.bone(n, 'body', x, 0.021, sd * 0.011, [x, 0.021, sd * 0.34]); b.wing(sd > 0 ? g : mirror(g), n); wings.push({ b: b.ix[n], sd, lag });
    });
    b.wave(abd, 'z', 0.03, { kt: 2.1, lag: 0.6 }).sway('head', 'y', 0.2, { kt: 0.7 });
    b.flutter = { wings, rate: 58, amp: 0.42, dihedral: 0.06 }; b.custom = flutter;
    M.meganeura = b.build({ color: 0x4e5a30, tex: SHELL, rough: 0.45, back: 1, belly: 1.1, wingTex: { map: veinTex(), normalMap: SHELL.normalMap }, wingColor: 0xb0a890,
      wingMat: { transparent: true, depthWrite: false, roughness: 0.5, normalScale: new THREE.Vector2(0.15, 0.15) },
      coat: (x, y, z, ny) => (x < -0.03 && ((-0.03 - x) / 0.031) % 1 > 0.75 ? [1.7, 1.5, 0.6] : 1) });
  }

  // ---------- Edaphosaurus, the plant-eater among the sail-backs: 3 m long with a barrel of a body and a skull of only 16 cm; its sail is lower and rounder
  // than Dimetrodon's, the front spines lean forwards, and every spine carries rows of little crossbars ----------
  {
    const trunk = [[-1.95, 0.12, 0, 0.012], [-1.6, 0.17, 0, 0.035, 0.035, 0.03], [-1.3, 0.24, 0, 0.07, 0.07, 0.055], [-1.0, 0.32, 0, 0.11, 0.11, 0.09], [-0.75, 0.38, 0, 0.15, 0.17, 0.15], [-0.5, 0.42, 0, 0.2, 0.25, 0.24],
      [-0.25, 0.43, 0, 0.22, 0.31, 0.3], [0, 0.43, 0, 0.23, 0.33, 0.33], [0.25, 0.43, 0, 0.22, 0.31, 0.31], [0.5, 0.42, 0, 0.19, 0.25, 0.24], [0.63, 0.43, 0, 0.12, 0.14, 0.13], [0.73, 0.44, 0, 0.08, 0.085, 0.075], [0.79, 0.445, 0, 0.065, 0.065, 0.055]];
    const skull = [[0.77, 0.515, 0.415, 0.055], [0.83, 0.517, 0.415, 0.058], [0.89, 0.495, 0.412, 0.045], [0.935, 0.47, 0.41, 0.03]], spines = [];
    for (let i = 0; i <= 23; i++) { const u = i / 23, x = -0.55 + u * 1.25, p = at(trunk, x), h = 0.92 * Math.sin(Math.PI * clamp(u * 0.9 + 0.05)) ** 0.5; spines.push([x, p[1] + p[3] - 0.03, x + (u - 0.45) * 0.5, p[1] + p[3] - 0.03 + h]); }
    M.edaphosaurus = sprawler({
      color: 0x74703e, tex: SKIN, tile: 0.7, rough: 0.8, gait: { duty: 0.72, stride: 0.34 }, y: 0.43, bend: 0.14, gape: 0.2,
      tailJ: [[-0.62, 0.4], [-0.85, 0.35], [-1.1, 0.29], [-1.35, 0.23], [-1.6, 0.17], [-1.95, 0.12]], neckJ: [[0.62, 0.43], [0.77, 0.45]], nose: [0.95, 0.43], hinge: [0.785, 0.42],
      trunk, head: skull, jaw: [[0.78, 0.425, 0.37, 0.05], [0.85, 0.425, 0.372, 0.045], [0.925, 0.42, 0.38, 0.028]], eye: [0.835, 0.49, 0.05, 0.01], brow: 0.9, nostril: [0.93, 0.455, 0.022, 0.006],
      fore: { J: [[0.5, 0.34, 0.2], [0.44, 0.24, 0.38], [0.5, 0.06, 0.36]], top: [0, 0.06, -0.1, 0.11], R: [[0.1, 0.115, 0.095], [0.085, 0.1, 0.08], [0.06, 0.065, 0.06], [0.055, 0.068, 0.054], [0.04, 0.042, 0.044]],
        foot: { len: 0.18, r: 0.017, claw: 2.6, yaw: 0.3 }, lift: 0.06 },
      hind: { J: [[-0.5, 0.36, 0.18], [-0.39, 0.25, 0.37], [-0.5, 0.065, 0.35]], top: [0, 0.06, -0.09, 0.12], R: [[0.115, 0.135, 0.1], [0.095, 0.115, 0.085], [0.065, 0.07, 0.064], [0.058, 0.075, 0.055], [0.042, 0.044, 0.046]],
        foot: { len: 0.2, r: 0.018, claw: 2.6, yaw: 0.45 }, lift: 0.06 },
      coat: (x, y, z, ny) => (y > 0.68 && z < 0.04 ? [1.35, 1.15, 0.6].map((c) => c * (0.75 + 0.3 * Math.sin(y * 14 - Math.abs(x - 0.1) * 5))) : 1 - 0.25 * clamp(Math.sin(x * 8 + z * 6) * 2 - 0.3) * clamp(ny + 0.5)),
      extra: (b, spine) => { b.skin(sail(spines, 0.022, 0.07, 0.7, 1.8, 8), spine); },
    });
  }
}
