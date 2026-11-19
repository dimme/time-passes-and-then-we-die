// Before the dinosaurs: trilobites, the first land arthropods, the first four-legged animals, giant dragonflies, sail-backs and the survivors of the Great Dying.
import * as THREE from 'three';
import { Rig, loft, mass, cone, at, hide, hex, TAU, TOOTH, NAIL, IVORY, HORN } from './animals-rig.js';

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
function digits(b, f, A, sd, { n = 5, len, r, fan = 1.1, yaw = 0.35, claw = 0, rel = [0.6, 0.85, 1, 0.95, 0.7], web = 0 }) {
  const psi = sd * yaw, pal = len * 0.42, cx = A[0] + Math.cos(psi) * pal * 0.55, cz = A[2] + Math.sin(psi) * pal * 0.55;
  b.skin(mass(cx, A[1] * 0.5, cz, pal * (1.15 + web), A[1] * 0.6, pal * (0.85 + web), 0, -psi, 1, 0.7), f);
  for (let i = 0; i < n; i++) {
    const an = psi + sd * (i / (n - 1) - 0.5) * fan, l = len * (0.4 + 0.6 * rel[i]), dx = Math.cos(an), dz = Math.sin(an), tip = [A[0] + dx * l, r * 0.7, A[2] + dz * l];
    b.skin(loft([[cx + dx * pal * 0.3, A[1] * 0.6, cz + dz * pal * 0.3, r * 1.1], [cx + dx * pal * 0.9, r * 0.95, cz + dz * pal * 0.9, r], [...tip, r * 0.75]], { segs: 6, sub: 2, capB: 0.9 }), f);
    if (claw) b.detail(loft([[...tip, r * 0.6], [tip[0] + dx * r * claw * 0.55, r * 0.65, tip[2] + dz * r * claw * 0.55, r * 0.4], [tip[0] + dx * r * claw, r * 0.12, tip[2] + dz * r * claw, 0.002]], { segs: 5, sub: 2 }), f, NAIL);
  }
}

/**
 * A sprawling four-legged animal from side-view profiles (metres, snout towards +x, x = 0 midway between the shoulder and the hip).
 * trunk = one loft from the tail tip to the back of the skull, head / jaw = lofts on the head and jaw bones; y = height of the backbone;
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
  b.skin(loft(s.trunk, { segs: 18, tile: T, capA: 0.5 }), spine);
  b.skin(loft(s.head, { segs: 16, tile: T, capA: 0.6, capB: 0.6 }), 'head');
  b.bone('jaw', 'head', s.hinge[0], s.hinge[1]); b.jaw = b.ix.jaw; b.gape = s.gape || 0.35;
  b.skin(loft(s.jaw, { segs: 12, tile: T, capA: 0.6, capB: 0.6 }), 'jaw');
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
  b.pair('detail', (sd) => [mass(ex, ey, sd * ez, er, er, er * 0.7), 'head', EYE]);
  if (s.brow) b.pair('skin', (sd) => [mass(ex - er * 0.3, ey + er * 0.9, sd * (ez - er * 0.5), er * 2, er * 0.8, er * 1.1, -0.15), 'head']);
  if (s.nostril) b.pair('detail', (sd) => [mass(s.nostril[0], s.nostril[1], sd * s.nostril[2], s.nostril[3], s.nostril[3] * 0.6, s.nostril[3] * 0.5), 'head', EYE]);
  if (s.extra) s.extra(b, spine);
  const make = b.build(s);
  b.half = (xs - xh) / 2;
  return make;
}

/**
 * A sail: skin stretched over a row of neural spines, each [x, y at the back, x, y at the tip], from tail to neck. `th` = thickness of a spine at its
 * base, `dip` = how far the skin sags between two tips, `bars` = little crossbars along each spine (Edaphosaurus).
 */
function sail(spines, th, dip, tile, bars = 0) {
  const sub = 4, rows = 7, cols = (spines.length - 1) * sub + 1, pos = [], uv = [], idx = [];
  for (const sd of [1, -1]) {
    const o = pos.length / 3;
    for (let c = 0; c < cols; c++) {
      const i = Math.min(spines.length - 2, Math.floor(c / sub)), f = c / sub - i, A = spines[i], Bq = spines[i + 1], ridge = (0.5 + 0.5 * Math.cos(TAU * f)) ** 3, edge = c === 0 || c === cols - 1 ? 0 : 1;
      const x0 = A[0] + (Bq[0] - A[0]) * f, y0 = A[1] + (Bq[1] - A[1]) * f, x1 = A[2] + (Bq[2] - A[2]) * f, y1 = A[3] + (Bq[3] - A[3]) * f, top = 1 - dip * Math.sin(Math.PI * f) ** 2;
      for (let r = 0; r <= rows; r++) {
        const v = (r / rows) * top, bar = bars ? 1 + bars * ridge * Math.max(0, Math.sin(v * 38)) ** 4 : 1;
        pos.push(x0 + (x1 - x0) * v, y0 + (y1 - y0) * v, sd * edge * th * (0.22 + 0.78 * ridge * bar) * (1 - 0.75 * (r / rows)) * (r === rows ? 0.15 : 1)); uv.push(x0 / tile, (y0 + (y1 - y0) * v) / tile);
      }
    }
    for (let c = 0; c < cols - 1; c++) for (let r = 0; r < rows; r++) { const p = o + c * (rows + 1) + r, q = p + rows + 1; sd > 0 ? idx.push(p, p + 1, q, p + 1, q + 1, q) : idx.push(p, q, p + 1, p + 1, q, q + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function paleozoic(M) {
  const SKIN = hide('wrinkle', 21);

  // ---------- Dimetrodon limbatus: 3.2 m long with a 0.45 m skull; neural spines up to 1.1 m carry the sail from the neck to the hips (top 1.7 m above
  // the ground); humerus 0.21 m, femur 0.23 m, held out and down in a "high walk" with the belly clear of the ground; the tail is half the animal ----------
  {
    const trunk = [[-1.9, 0.13, 0, 0.012], [-1.6, 0.17, 0, 0.03, 0.03, 0.022], [-1.3, 0.23, 0, 0.055, 0.055, 0.04], [-1.0, 0.3, 0, 0.085, 0.085, 0.065], [-0.75, 0.36, 0, 0.12, 0.13, 0.1], [-0.5, 0.4, 0, 0.17, 0.2, 0.16],
      [-0.25, 0.41, 0, 0.2, 0.27, 0.21], [0, 0.41, 0, 0.21, 0.3, 0.23], [0.25, 0.41, 0, 0.21, 0.3, 0.23], [0.47, 0.42, 0, 0.2, 0.27, 0.2], [0.62, 0.45, 0, 0.16, 0.19, 0.14], [0.75, 0.48, 0, 0.13, 0.14, 0.105], [0.86, 0.5, 0, 0.12, 0.12, 0.09]];
    // a tall, narrow skull: convex snout, the eye high and far back, a step in the upper jaw behind the front teeth
    const skull = [[0.84, 0.52, 0, 0.11, 0.08, 0.085], [0.94, 0.53, 0, 0.13, 0.085, 0.09], [1.06, 0.525, 0, 0.125, 0.08, 0.072], [1.18, 0.505, 0, 0.105, 0.07, 0.058], [1.27, 0.48, 0, 0.075, 0.055, 0.046]];
    const jaw = [[0.86, 0.415, 0, 0.045, 0.06, 0.08], [1.0, 0.41, 0, 0.045, 0.055, 0.07], [1.15, 0.405, 0, 0.04, 0.05, 0.052], [1.26, 0.4, 0, 0.03, 0.04, 0.038]];
    const spines = [];
    for (let i = 0; i <= 25; i++) { const u = i / 25, x = -0.56 + u * 1.3, p = at(trunk, x), h = 1.12 * Math.sin(Math.PI * clamp(u * 0.94 + 0.03)) ** 0.62; spines.push([x, p[1] + p[3] - 0.03, x + (u - 0.45) * 0.34, p[1] + p[3] - 0.03 + h]); }
    M.dimetrodon = sprawler({
      color: 0x6f6846, tex: SKIN, tile: 0.7, rough: 0.8, gait: { duty: 0.7, stride: 0.38 }, y: 0.42, bend: 0.16, gape: 0.4,
      tailJ: [[-0.6, 0.39], [-0.85, 0.34], [-1.1, 0.28], [-1.35, 0.22], [-1.6, 0.17], [-1.9, 0.13]], neckJ: [[0.6, 0.45], [0.84, 0.5]], nose: [1.31, 0.47], hinge: [0.87, 0.45],
      trunk, head: skull, jaw, eye: [0.955, 0.6, 0.08, 0.017], brow: true, nostril: [1.27, 0.53, 0.036, 0.012],
      fore: { J: [[0.47, 0.36, 0.16], [0.41, 0.25, 0.34], [0.46, 0.06, 0.3]], top: [0, 0.06, -0.08, 0.1], R: [[0.09, 0.1, 0.085], [0.075, 0.085, 0.07], [0.055, 0.06, 0.055], [0.05, 0.06, 0.05], [0.038, 0.04, 0.042]],
        foot: { len: 0.19, r: 0.017, claw: 3.2, yaw: 0.3 }, lift: 0.07 },
      hind: { J: [[-0.47, 0.38, 0.14], [-0.36, 0.26, 0.33], [-0.46, 0.065, 0.3]], top: [0, 0.06, -0.07, 0.11], R: [[0.1, 0.12, 0.09], [0.085, 0.1, 0.075], [0.06, 0.065, 0.06], [0.055, 0.07, 0.052], [0.04, 0.042, 0.044]],
        foot: { len: 0.22, r: 0.018, claw: 3.2, yaw: 0.45 }, lift: 0.07 },
      coat: (x, y, z, ny) => (y > 0.66 && z < 0.03 ? [1.5 - 0.5 * clamp((y - 1.1) * 2), 0.95, 0.7].map((c) => c * (0.8 + 0.25 * Math.sin(y * 9 + Math.sin(x * 6)))) : 1 - 0.22 * clamp(Math.sin(x * 9 + y * 5) * 2) * clamp(ny + 0.5)),
      extra: (b, spine) => {
        b.skin(sail(spines, 0.018, 0.1, 0.7), spine);
        // teeth of two kinds ("Dimetrodon" = two measures of tooth): long stabbing canines near the front of the upper jaw, small cutting teeth behind
        for (let i = 0; i < 13; i++) {
          const x = 1.27 - i * 0.027, u = at(skull, x), big = i === 0 || i === 1 ? 0.035 : i === 4 || i === 5 ? 0.06 : 0.02 + 0.006 * (i % 2);
          if (i !== 3) b.pair('detail', (s) => [cone(big * 0.24 + 0.002, big, x, u[1] - u[4] + 0.012, s * u[5] * 0.82, Math.PI), 'head', TOOTH]);
          const l = at(jaw, x - 0.012); if (i < 12) b.pair('detail', (s) => [cone(0.005, i < 3 ? 0.03 : 0.017, x - 0.012, l[1] + l[3] - 0.008, s * l[5] * 0.72), 'jaw', TOOTH]);
        }
      },
    });
  }

  // ---------- Ichthyostega / Acanthostega, the first animals with legs: 1.2 m long, a flat 0.2 m head with the eyes on top, a salamander's body on
  // limbs with 8 cm upper bones, seven-toed paddles for hind feet, and still a fish's tail with a rayed fin above and below ----------
  {
    const trunk = [[-0.7, 0.075, 0, 0.02, 0.02, 0.004], [-0.56, 0.08, 0, 0.045, 0.04, 0.012], [-0.43, 0.09, 0, 0.055, 0.05, 0.03], [-0.32, 0.1, 0, 0.062, 0.065, 0.06], [-0.22, 0.11, 0, 0.07, 0.075, 0.095],
      [0, 0.115, 0, 0.075, 0.085, 0.11], [0.2, 0.115, 0, 0.07, 0.08, 0.105], [0.3, 0.11, 0, 0.06, 0.065, 0.09], [0.36, 0.105, 0, 0.05, 0.05, 0.085]];
    const skull = [[0.34, 0.105, 0, 0.045, 0.035, 0.085], [0.42, 0.1, 0, 0.042, 0.033, 0.092], [0.5, 0.09, 0, 0.03, 0.028, 0.072], [0.55, 0.082, 0, 0.02, 0.022, 0.045]];
    const fin = (sgn, h, x0, x1) => { const sp = []; for (let i = 0; i <= 14; i++) { const u = i / 14, x = x0 + u * (x1 - x0), p = at(trunk, x), y = p[1] + sgn * (sgn > 0 ? p[3] : p[4]) * 0.8; sp.push([x, y, x - 0.05 * (1 - u), y + sgn * h * Math.sin(Math.PI * clamp(u * 0.9 + 0.12)) ** 0.7]); } return sail(sp, 0.004, 0.06, 0.25); };
    M.tetrapod = sprawler({
      color: 0x56603a, tex: SKIN, tile: 0.3, rough: 0.45, belly: 1.5, gait: { duty: 0.72, stride: 0.16 }, y: 0.11, bend: 0.3, wag: 0.3, gape: 0.3,
      tailJ: [[-0.3, 0.1], [-0.4, 0.092], [-0.5, 0.085], [-0.6, 0.08], [-0.7, 0.075]], neckJ: [[0.3, 0.11], [0.35, 0.105]], nose: [0.56, 0.08], hinge: [0.355, 0.085],
      trunk, head: skull, jaw: [[0.35, 0.07, 0, 0.014, 0.025, 0.08], [0.45, 0.065, 0, 0.014, 0.022, 0.078], [0.535, 0.062, 0, 0.01, 0.016, 0.05]], eye: [0.435, 0.137, 0.04, 0.011], brow: true, nostril: [0.535, 0.092, 0.03, 0.005],
      fore: { J: [[0.25, 0.1, 0.09], [0.215, 0.1, 0.17], [0.26, 0.025, 0.19]], top: [0, 0.01, -0.04, 0.035], R: [[0.03, 0.035, 0.03], [0.027, 0.03, 0.025], [0.022, 0.024, 0.022], [0.02, 0.024, 0.02], [0.016, 0.018, 0.02]],
        foot: { len: 0.085, r: 0.006, n: 6, fan: 1.5, yaw: 0.45, rel: [0.6, 0.8, 0.95, 1, 0.9, 0.7], web: 0.15 }, lift: 0.03, toeOff: 0.3, curl: 0.2 },
      hind: { J: [[-0.25, 0.1, 0.085], [-0.2, 0.09, 0.17], [-0.25, 0.025, 0.19]], top: [0, 0.01, -0.04, 0.035], R: [[0.032, 0.036, 0.03], [0.028, 0.032, 0.026], [0.022, 0.024, 0.022], [0.02, 0.024, 0.02], [0.017, 0.019, 0.022]],
        foot: { len: 0.1, r: 0.006, n: 7, fan: 1.7, yaw: 0.9, rel: [0.55, 0.75, 0.9, 1, 1, 0.9, 0.7], web: 0.25 }, lift: 0.025, toeOff: 0.25, curl: 0.2 },
      coat: (x, y, z, ny) => { const d = clamp(Math.sin(x * 23 + Math.sin(z * 30) * 1.5) * Math.sin(z * 26 + x * 9) * 3) * clamp(ny + 0.4); return [1 - 0.5 * d, 1 - 0.45 * d, 1 - 0.3 * d].map((c) => c * (ny < -0.2 ? 1.5 : 1)); },
      extra: (b, spine) => {
        b.skin(fin(1, 0.075, -0.7, -0.2), spine, [1.15, 1.05, 0.8]).skin(fin(-1, 0.04, -0.7, -0.36), spine, [1.15, 1.05, 0.8]);
        for (let i = 0; i < 16; i++) { const x = 0.54 - i * 0.011, u = at(skull, x); b.pair('detail', (s) => [cone(0.0025, 0.009, x, u[1] - u[4] + 0.004, s * u[5] * 0.85, Math.PI), 'head', TOOTH]); }
      },
    });
  }

  // ---------- Eryops, a temnospondyl amphibian: 2 m long and stout; a broad, flat 0.5 m skull with the eyes and nostrils on top; four fingers, five toes,
  // no claws; humerus 0.17 m, femur 0.2 m, held straight out from a heavy body ----------
  {
    const trunk = [[-1.0, 0.12, 0, 0.015], [-0.8, 0.15, 0, 0.06, 0.06, 0.035], [-0.6, 0.2, 0, 0.1, 0.1, 0.07], [-0.42, 0.25, 0, 0.14, 0.15, 0.13], [-0.3, 0.27, 0, 0.16, 0.19, 0.2], [0, 0.28, 0, 0.17, 0.21, 0.24],
      [0.25, 0.28, 0, 0.17, 0.2, 0.23], [0.4, 0.27, 0, 0.15, 0.17, 0.2], [0.52, 0.26, 0, 0.11, 0.11, 0.19]];
    const skull = [[0.5, 0.265, 0, 0.1, 0.07, 0.19], [0.65, 0.26, 0, 0.1, 0.065, 0.2], [0.8, 0.245, 0, 0.075, 0.055, 0.16], [0.92, 0.23, 0, 0.055, 0.045, 0.12], [1.0, 0.22, 0, 0.04, 0.035, 0.085]];
    const jaw = [[0.52, 0.19, 0, 0.03, 0.055, 0.185], [0.7, 0.18, 0, 0.03, 0.05, 0.18], [0.88, 0.175, 0, 0.025, 0.04, 0.125], [0.99, 0.175, 0, 0.02, 0.03, 0.08]];
    M.eryops = sprawler({
      color: 0x5c5a3c, tex: SKIN, tile: 0.5, rough: 0.5, belly: 1.45, gait: { duty: 0.72, stride: 0.28 }, y: 0.28, bend: 0.2, gape: 0.3,
      tailJ: [[-0.42, 0.25], [-0.6, 0.2], [-0.8, 0.15], [-1.0, 0.12]], neckJ: [[0.42, 0.27], [0.5, 0.26]], nose: [1.02, 0.21], hinge: [0.53, 0.215],
      trunk, head: skull, jaw, eye: [0.64, 0.352, 0.085, 0.02], brow: true, nostril: [0.95, 0.268, 0.05, 0.012],
      fore: { J: [[0.33, 0.24, 0.2], [0.27, 0.2, 0.36], [0.34, 0.05, 0.36]], top: [0, 0.03, -0.1, 0.09], R: [[0.075, 0.085, 0.07], [0.065, 0.075, 0.06], [0.05, 0.055, 0.05], [0.045, 0.055, 0.045], [0.036, 0.04, 0.045]],
        foot: { len: 0.15, r: 0.016, n: 4, fan: 1.1, yaw: 0.35, rel: [0.75, 1, 1, 0.75] }, lift: 0.05, toeOff: 0.35, curl: 0.25 },
      hind: { J: [[-0.33, 0.25, 0.18], [-0.22, 0.2, 0.36], [-0.32, 0.05, 0.37]], top: [0, 0.03, -0.09, 0.1], R: [[0.085, 0.095, 0.075], [0.07, 0.085, 0.065], [0.052, 0.058, 0.052], [0.048, 0.06, 0.046], [0.038, 0.042, 0.046]],
        foot: { len: 0.17, r: 0.016, fan: 1.3, yaw: 0.6 }, lift: 0.05, toeOff: 0.35, curl: 0.25 },
      coat: (x, y, z, ny) => { const d = clamp(Math.sin(x * 11 + Math.sin(z * 14) * 1.6) * Math.sin(z * 13 + x * 5) * 3 - 0.3) * clamp(ny + 0.5); return [1 - 0.5 * d, 1 - 0.5 * d, 1 - 0.4 * d].map((c) => c * (ny < -0.25 ? 1.45 : 1)); },
      extra: (b) => {
        for (let i = 0; i < 22; i++) { const x = 0.99 - i * 0.02, u = at(skull, x), l = at(jaw, x - 0.01); b.pair('detail', (s) => [cone(0.005, 0.02, x, u[1] - u[4] + 0.008, s * u[5] * 0.9, Math.PI), 'head', TOOTH]); b.pair('detail', (s) => [cone(0.004, 0.014, x - 0.01, l[1] + l[3] - 0.006, s * l[5] * 0.84), 'jaw', TOOTH]); }
      },
    });
  }

  // ---------- a gorgonopsid (Inostrancevia's smaller kin): 2.5 m long, 0.9 m at the back; a 0.45 m skull with 11 cm sabre canines and big incisors; forelimbs
  // still sprawl, but the hind legs are tucked half under the body; a short tail ----------
  {
    const trunk = [[-1.3, 0.35, 0, 0.012], [-1.05, 0.45, 0, 0.04, 0.04, 0.03], [-0.8, 0.55, 0, 0.08, 0.08, 0.06], [-0.6, 0.64, 0, 0.13, 0.14, 0.11], [-0.45, 0.68, 0, 0.18, 0.2, 0.17], [-0.2, 0.68, 0, 0.2, 0.25, 0.2],
      [0.1, 0.68, 0, 0.21, 0.28, 0.21], [0.35, 0.69, 0, 0.21, 0.28, 0.2], [0.5, 0.71, 0, 0.19, 0.24, 0.17], [0.65, 0.74, 0, 0.15, 0.16, 0.12], [0.76, 0.77, 0, 0.13, 0.13, 0.1]];
    const skull = [[0.75, 0.79, 0, 0.11, 0.08, 0.1], [0.87, 0.795, 0, 0.115, 0.08, 0.105], [1.0, 0.785, 0, 0.105, 0.08, 0.08], [1.12, 0.775, 0, 0.095, 0.075, 0.068], [1.19, 0.765, 0, 0.075, 0.065, 0.058]];
    const jaw = [[0.77, 0.69, 0, 0.04, 0.06, 0.09], [0.95, 0.685, 0, 0.04, 0.055, 0.075], [1.1, 0.68, 0, 0.04, 0.065, 0.058], [1.18, 0.68, 0, 0.035, 0.065, 0.048]];
    M.gorgonopsid = sprawler({
      color: 0x7a6a50, tex: SKIN, tile: 0.7, rough: 0.8, gait: { duty: 0.66, stride: 0.55 }, y: 0.68, bend: 0.1, gape: 0.75,
      tailJ: [[-0.55, 0.66], [-0.8, 0.55], [-1.05, 0.45], [-1.3, 0.35]], neckJ: [[0.55, 0.72], [0.75, 0.78]], nose: [1.22, 0.76], hinge: [0.78, 0.715],
      trunk, head: skull, jaw, eye: [0.89, 0.85, 0.094, 0.016], brow: true, nostril: [1.2, 0.8, 0.04, 0.012],
      fore: { J: [[0.45, 0.56, 0.15], [0.33, 0.34, 0.32], [0.46, 0.07, 0.25]], top: [0, 0.1, -0.07, 0.12], R: [[0.1, 0.12, 0.09], [0.08, 0.1, 0.075], [0.06, 0.065, 0.058], [0.05, 0.065, 0.05], [0.038, 0.042, 0.042]],
        foot: { len: 0.2, r: 0.018, claw: 2.6, yaw: 0.2, fan: 0.9 }, lift: 0.1 },
      hind: { J: [[-0.45, 0.62, 0.13], [-0.27, 0.36, 0.24], [-0.47, 0.08, 0.2]], top: [0, 0.1, -0.06, 0.13], R: [[0.12, 0.14, 0.1], [0.1, 0.12, 0.085], [0.065, 0.07, 0.062], [0.055, 0.075, 0.052], [0.04, 0.044, 0.042]],
        foot: { len: 0.22, r: 0.018, claw: 2.6, yaw: 0.2, fan: 0.9 }, lift: 0.1 },
      coat: (x, y, z, ny) => 1 - 0.3 * clamp(Math.sin(x * 7 + Math.sin(y * 6) * 0.8) * 2 - 0.4) * clamp(ny + 0.3),
      extra: (b) => {
        // sabres: one long, back-curved canine each side behind five stout incisors; only a few small teeth behind them
        b.pair('detail', (s) => [loft([[1.075, 0.72, s * 0.06, 0.017, 0.017, 0.011], [1.07, 0.66, s * 0.062, 0.013, 0.013, 0.008], [1.058, 0.6, s * 0.062, 0.002]], { segs: 7, sub: 3 }), 'head', TOOTH]);
        for (let i = 0; i < 5; i++) b.pair('detail', (s) => [cone(0.008, 0.04, 1.2 - i * 0.006, 0.715, s * (0.008 + i * 0.011), Math.PI), 'head', TOOTH]);
        for (let i = 0; i < 4; i++) { const x = 1.02 - i * 0.022, u = at(skull, x); b.pair('detail', (s) => [cone(0.005, 0.016, x, u[1] - u[4] + 0.008, s * u[5] * 0.85, Math.PI), 'head', TOOTH]); }
        for (let i = 0; i < 4; i++) b.pair('detail', (s) => [cone(0.007, 0.03, 1.185 - i * 0.008, 0.705, s * (0.008 + i * 0.01)), 'jaw', TOOTH]);
        b.pair('detail', (s) => [cone(0.011, 0.045, 1.13, 0.705, s * 0.043), 'jaw', TOOTH]);
      },
    });
  }

  // ---------- Lystrosaurus, which inherited the Earth after the Great Dying: 1 m long and 0.45 m at the back, a barrel on short legs; a short, deep face
  // bent downwards, a horny beak and two tusks; nostrils high in front of the eyes; a stub of a tail ----------
  {
    const trunk = [[-0.5, 0.2, 0, 0.012], [-0.4, 0.26, 0, 0.04, 0.04, 0.035], [-0.3, 0.3, 0, 0.1, 0.11, 0.1], [-0.2, 0.31, 0, 0.13, 0.16, 0.15], [0, 0.31, 0, 0.14, 0.18, 0.17], [0.15, 0.31, 0, 0.14, 0.17, 0.16], [0.26, 0.32, 0, 0.12, 0.14, 0.13], [0.34, 0.33, 0, 0.1, 0.1, 0.09]];
    const skull = [[0.32, 0.35, 0, 0.08, 0.07, 0.085], [0.4, 0.35, 0, 0.085, 0.07, 0.09], [0.47, 0.33, 0, 0.07, 0.075, 0.065], [0.52, 0.3, 0, 0.05, 0.075, 0.05]];
    M.lystrosaurus = sprawler({
      color: 0x8a7458, tex: SKIN, tile: 0.4, rough: 0.8, gait: { duty: 0.68, stride: 0.26 }, y: 0.31, bend: 0.14, gape: 0.25,
      tailJ: [[-0.3, 0.3], [-0.4, 0.26], [-0.5, 0.2]], neckJ: [[0.26, 0.32], [0.33, 0.34]], nose: [0.54, 0.26], hinge: [0.34, 0.285],
      trunk, head: skull, jaw: [[0.33, 0.262, 0, 0.022, 0.045, 0.075], [0.42, 0.252, 0, 0.022, 0.04, 0.065], [0.5, 0.24, 0, 0.02, 0.035, 0.04]], eye: [0.4, 0.4, 0.08, 0.011], brow: true, nostril: [0.485, 0.365, 0.045, 0.008],
      fore: { J: [[0.2, 0.27, 0.12], [0.15, 0.19, 0.23], [0.2, 0.04, 0.2]], top: [0, 0.04, -0.05, 0.07], R: [[0.06, 0.07, 0.055], [0.05, 0.06, 0.048], [0.04, 0.044, 0.04], [0.036, 0.044, 0.036], [0.03, 0.032, 0.034]],
        foot: { len: 0.11, r: 0.012, claw: 2, yaw: 0.25, fan: 1 }, lift: 0.05 },
      hind: { J: [[-0.2, 0.29, 0.11], [-0.12, 0.17, 0.19], [-0.2, 0.045, 0.17]], top: [0, 0.04, -0.05, 0.08], R: [[0.07, 0.08, 0.06], [0.058, 0.07, 0.052], [0.042, 0.046, 0.042], [0.038, 0.048, 0.038], [0.03, 0.034, 0.034]],
        foot: { len: 0.12, r: 0.012, claw: 2, yaw: 0.25, fan: 1 }, lift: 0.05 },
      coat: (x, y, z, ny) => 1 + 0.25 * clamp(-ny * 2 - 0.4),
      extra: (b) => {
        b.detail(loft([[0.5, 0.285, 0, 0.045, 0.05, 0.048], [0.535, 0.245, 0, 0.03, 0.035, 0.03], [0.54, 0.2, 0, 0.004]], { segs: 8, sub: 3 }), 'head', HORN);   // the upper beak hooks down over the lower
        b.detail(loft([[0.49, 0.225, 0, 0.025, 0.02, 0.036], [0.52, 0.235, 0, 0.004]], { segs: 8, sub: 3 }), 'jaw', HORN);
        b.pair('detail', (s) => [loft([[0.465, 0.27, s * 0.055, 0.014], [0.475, 0.22, s * 0.058, 0.01], [0.49, 0.175, s * 0.058, 0.002]], { segs: 7, sub: 3 }), 'head', IVORY]);
      },
    });
  }
}
