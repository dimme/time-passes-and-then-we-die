// Dinosaurs and pterosaurs.
import { Rig, loft, mass, cone, slab, strip, fan, put, at, mirror, padFoot, hide, hex, IVORY, HORN, TOOTH, NAIL } from './animals-rig.js?v=740e009b';

const clamp = (v) => Math.max(0, Math.min(1, v));
const EYE = hex(0x1a1206);

/**
 * A dinosaur from side-view profiles (metres, snout towards +x). trunk = one loft from the tail tip to the back of the skull, head = the skull;
 * joints: body [x, y], tailJ and neckJ (runs ending at the tail tip / the head joint), nose;
 * legs = [{ n, z, J, toe, R, M, top, mode, phase, foot(b, bone, z, side), … }], the left one of each pair.
 */
function walker(s) {
  const b = new Rig(), T = s.tile;
  b.bone('body', null, ...s.body);
  const tail = b.run('tail', 'body', s.tailJ), neck = b.run('neck', 'body', s.neckJ), hj = s.neckJ[s.neckJ.length - 1];
  b.bone('head', neck[neck.length - 1], hj[0], hj[1], 0, [...s.nose, 0]);
  const spine = b.path([...tail.slice().reverse(), 'body', ...neck, 'head'], 0.5);
  b.skin(loft(s.trunk, { segs: 20, tile: T, capA: 0.5 }), spine);
  b.skin(loft(s.head, { segs: 16, tile: T, capA: 0.7, capB: 0.6 }), 'head');
  for (const L of s.legs) for (const [sd, ph] of [[1, 0], [-1, 0.5]]) {
    const z = sd * L.z, names = b.limb(L.n + (sd > 0 ? 'l' : 'r'), 'body', z, L.J, L.toe, L.R, L.M, { ...L, top: [L.top[0], L.top[1], sd * L.top[2], L.top[3], L.top[4], L.top[5]], tile: T, phase: L.phase + ph });
    L.foot(b, names[3], z, sd);
  }
  const [ex, ey, ez, er] = s.eye;
  b.pair('detail', (sd) => [mass(ex, ey, sd * ez, er, er, er * 0.7), 'head', EYE]);
  b.pair('skin', (sd) => [mass(ex - er * 0.3, ey + er * 0.9, sd * (ez - er * 0.5), er * 2, er * 0.8, er * 1.1, -0.15), 'head']);   // the bony brow over the eye
  b.wave(tail, 'y', s.wag || 0.06, { kt: s.wagRate || 0.9, lag: 0.6, grow: true }).wave(neck, 'y', s.look || 0.04, { kt: 0.3, lag: 0.4 }).wave(neck, 'z', s.nod || 0.012, { kg: 2, kph: 0, lag: 0.3 });
  if (s.extra) s.extra(b, spine);
  return b.build(s);
}

/** Three splayed, clawed toes and a small inner toe (theropods, and the hind feet of other dinosaurs in miniature). */
function clawFoot(b, f, z, sd, ball, len, r) {
  for (const [an, k] of [[-0.42, 0.78], [0, 1], [0.42, 0.78]]) {
    const dx = Math.cos(an), dz = Math.sin(an), l = len * k, tip = [ball[0] + dx * l, r * 0.55, z + dz * l];
    b.skin(loft([[ball[0] - dx * r * 0.5, ball[1] * 0.85, z, r], [ball[0] + dx * l * 0.5, r * 0.8, z + dz * l * 0.5, r * 0.85], [...tip, r * 0.62]], { segs: 8, sub: 3, capB: 0.8 }), f);
    b.detail(loft([[...tip, r * 0.5], [tip[0] + dx * r * 1.4, r * 0.5, tip[2] + dz * r * 1.4, r * 0.34], [tip[0] + dx * r * 2.5, r * 0.1, tip[2] + dz * r * 2.5, 0.01]], { segs: 6, sub: 2 }), f, NAIL);
  }
  b.skin(loft([[ball[0], ball[1], z - sd * r * 0.6, r * 0.6], [ball[0] - len * 0.1, ball[1] * 0.6, z - sd * len * 0.28, r * 0.45], [ball[0] - len * 0.16, r * 0.4, z - sd * len * 0.36, r * 0.25]], { segs: 6, sub: 2, capB: 1 }), f);
}

export function dinosaurs(M) {
  const PEBBLE = hide('pebble', 1), PLATES = hide('plates', 3), WRINKLE = hide('wrinkle', 8);

  // ---------- theropods ----------
  // The base build is Allosaurus: 8.5 m long, hip joint at 1.95 m, 0.85 m skull with horns over the eyes, three-fingered arms, the back held level
  // and balanced over the hips by a tail half the animal's length. hs / gw / nk / arm scale the head, girth, neck and arms for other kinds.
  const theropod = ({ scale = 1, hs = 1, gw = 1, nk = 1, tw = 1, lr = 1, arm = 1, fingers = 3, horns = 0, color, coat, stride = 1.3 }) => {
    const NB = [1.95, 2.15], np = (dx, dy, u, d, w) => [NB[0] + dx * nk, NB[1] + dy * nk, 0, u * gw, d * gw, w * gw], O = [NB[0] + 0.9 * nk, NB[1] + 0.68 * nk];
    const hp = ([x, y, u, d, w]) => [O[0] + x * hs, O[1] + y * hs, 0, u * hs, d * hs, w * hs], G = (x, y, u, d, w) => [x, y, 0, u * gw, d * gw, w * gw];
    const skull = [[0, 0, 0.17, 0.14, 0.17], [0.15, -0.01, 0.2, 0.16, 0.2], [0.35, -0.05, 0.18, 0.15, 0.17], [0.6, -0.11, 0.15, 0.13, 0.13], [0.8, -0.17, 0.11, 0.1, 0.1]].map(hp);
    const jaw = [[0.02, -0.16, 0.07, 0.1, 0.17], [0.25, -0.21, 0.06, 0.1, 0.16], [0.55, -0.26, 0.05, 0.08, 0.12], [0.76, -0.3, 0.04, 0.05, 0.08]].map(hp);
    const ball = [0.19, 0.13], Tl = (x, y, u, d, w) => [x, y, 0, u * tw, d * tw, w * tw];
    return walker({
      color, coat, scale, tex: PEBBLE, tile: 1.1, gait: { duty: 0.6, stride, bob: 0.035 }, wag: 0.09, wagRate: 1.2, nod: 0.03, look: 0.05,
      body: [0.3, 2.05], tailJ: [[-0.5, 2.1], [-1.3, 2.12], [-2.1, 2.1], [-2.9, 2.08], [-3.7, 2.05], [-4.7, 2.0]], neckJ: [NB, [NB[0] + 0.45 * nk, NB[1] + 0.36 * nk], O], nose: [O[0] + 0.82 * hs, O[1] - 0.17 * hs],
      trunk: [[-4.7, 2.0, 0, 0.02], Tl(-3.8, 2.05, 0.09, 0.1, 0.07), Tl(-2.8, 2.1, 0.18, 0.21, 0.13), Tl(-1.8, 2.12, 0.27, 0.33, 0.2), G(-0.9, 2.12, 0.33, 0.45, 0.29), G(-0.3, 2.1, 0.38, 0.58, 0.38), G(0.3, 2.05, 0.42, 0.66, 0.42),
        G(0.9, 2.02, 0.43, 0.64, 0.45), G(1.5, 2.05, 0.43, 0.6, 0.42), G(1.95, 2.15, 0.36, 0.48, 0.33), np(0.35, 0.23, 0.3, 0.34, 0.24), np(0.6, 0.47, 0.25, 0.27, 0.2), np(0.8, 0.63, 0.21, 0.22, 0.18), np(0.95, 0.67, 0.19, 0.2, 0.17)],
      head: skull, eye: [O[0] + 0.2 * hs, O[1] + 0.06 * hs, 0.185 * hs, 0.035 * hs],
      legs: [{ n: 'h', z: 0.36 * gw, mode: 'panto', phase: 0, J: [[0.05, 1.95], [0.55, 1.27], [0.05, 0.62], ball], toe: [0.66, 0], top: [-0.05, 0.25, -0.1 * gw, 0.36 * lr, 0.42 * lr, 0.16 * lr], lift: 0.3, toeOff: 0.8, curl: 0.5,
        R: [[0.46 * lr, 0.5 * lr, 0.22 * lr], [0.22 * lr, 0.22 * lr, 0.15 * lr], [0.11 * lr, 0.13 * lr, 0.09 * lr], [0.09 * lr, 0.09 * lr, 0.095 * lr]], M: [[0.5, 0.42 * lr, 0.48 * lr, 0.22 * lr], [0.25, 0.22 * lr, 0.3 * lr, 0.14 * lr], [0.5, 0.08 * lr, 0.09 * lr, 0.075 * lr]],
        foot: (b, f, z, sd) => clawFoot(b, f, z, sd, ball, 0.36, 0.075 * lr) }],
      extra: (b) => {
        b.bone('jaw', 'head', O[0] + 0.03 * hs, O[1] - 0.12 * hs); b.jaw = b.ix.jaw; b.gape = 0.4;
        b.skin(loft(jaw, { segs: 12, tile: 1.1, capA: 0.6, capB: 0.6 }), 'jaw');
        for (let i = 0; i < 12; i++) {   // blade teeth, longest in the middle of the row
          const xu = O[0] + (0.2 + i * 0.05) * hs, u = at(skull, xu), l = at(jaw, xu), h = (0.06 + 0.035 * Math.sin((i / 11) * Math.PI) + (i % 2) * 0.012) * hs;
          b.pair('detail', (s) => [cone(0.02 * hs, h, xu, u[1] - u[4] + 0.015 * hs, s * u[5] * 0.8, Math.PI), 'head', TOOTH]);
          if (i < 11) b.pair('detail', (s) => [cone(0.016 * hs, h * 0.7, xu + 0.02 * hs, l[1] + l[3] - 0.012 * hs, s * l[5] * 0.72), 'jaw', TOOTH]);
        }
        b.pair('detail', (s) => [mass(O[0] + 0.72 * hs, O[1] - 0.1 * hs, s * 0.085 * hs, 0.03 * hs, 0.018 * hs, 0.015 * hs), 'head', EYE]);   // nostril
        if (horns) b.pair('skin', (s) => [mass(O[0] + 0.13 * hs, O[1] + 0.19 * hs, s * 0.13 * hs, 0.09 * hs, 0.1 * hs * horns, 0.035 * hs, 0.35), 'head']);
        b.pair('skin', (s) => [mass(O[0] + 0.5 * hs, O[1] + 0.06 * hs, s * 0.07 * hs, 0.2 * hs, 0.03 * hs, 0.03 * hs, -0.13), 'head']);   // ridges along the top of the snout
        const S = [1.9, 1.72], A = (dx, dy) => [S[0] + dx * arm, S[1] + dy * arm];
        b.pair('skin', (s) => [loft([[...A(0, 0.05), s * 0.3 * gw, 0.11 * arm], [...A(-0.12, -0.27), s * 0.36 * gw, 0.08 * arm], [...A(0.1, -0.42), s * 0.33 * gw, 0.055 * arm], [...A(0.17, -0.47), s * 0.33 * gw, 0.05 * arm]], { segs: 8, sub: 3, capB: 0.8 }), 'body']);
        for (let k = 0; k < fingers; k++) b.pair('detail', (s) => [cone(0.028 * arm, 0.17 * arm, ...A(0.17 + k * 0.01, -0.47), s * (0.33 * gw + (k - 1) * 0.05 * arm), -2.1 - k * 0.15), 'body', NAIL]);
      },
    });
  };
  const stripes = (dark, pale, k) => (x, y, z, ny) => {
    const band = Math.sin(x * k + Math.sin(y * 2.2) * 0.8 + z * 1.5), up = clamp(ny * 1.5 + 0.9), d = clamp((band - 0.25) * 3) * up * dark, p = clamp(-ny * 2 - 0.5) * pale;
    return (1 - d) * (1 + p);
  };
  M.theropod = theropod({ color: 0x7c6844, horns: 1, coat: stripes(0.55, 0.5, 5) });
  // Tyrannosaurus: 12.3 m long, hips at 3.6 m, a 1.5 m skull as deep as it is wide, a barrel chest and two-fingered arms no longer than a man's
  M.tyrannosaur = theropod({ scale: 1.45, hs: 1.27, gw: 1.28, tw: 1.4, lr: 1.22, arm: 0.5, fingers: 2, color: 0x5e5646, stride: 1.4, coat: stripes(0.3, 0.6, 2.3) });
  // Coelophysis, an early hunter: 3 m long and only 0.75 m at the hips, slender, with a long neck and a narrow head
  M.raptor = theropod({ scale: 0.37, hs: 0.8, gw: 0.66, nk: 1.45, arm: 1.5, color: 0x7c8250, stride: 1.5, coat: stripes(0.5, 0.5, 7) });

  // ---------- sauropod (Diplodocus / Apatosaurus): 22 m long, hips the highest point of the back at 4.1 m, columnar legs, whip tail ----------
  {
    const trunk = [[-12, 1.7, 0, 0.03], [-9, 2.2, 0, 0.1, 0.1, 0.08], [-6, 2.7, 0, 0.22, 0.24, 0.18], [-3, 3.1, 0, 0.4, 0.45, 0.32], [-0.8, 3.3, 0, 0.75, 0.9, 0.7], [0, 3.2, 0, 0.9, 1.3, 0.92], [1.2, 3.0, 0, 0.85, 1.5, 1.0], [2.4, 2.85, 0, 0.75, 1.4, 0.95],
      [3.3, 2.85, 0, 0.6, 1.05, 0.75], [4.2, 3.2, 0, 0.45, 0.6, 0.42], [5.3, 3.9, 0, 0.36, 0.45, 0.3], [6.6, 4.8, 0, 0.3, 0.36, 0.25], [8.0, 5.6, 0, 0.26, 0.3, 0.22], [9.0, 6.05, 0, 0.22, 0.26, 0.2], [9.6, 6.2, 0, 0.2, 0.22, 0.19]];
    const leg = (n, phase, z, J, toe, a, R, M, top, nails) => ({ n, phase, z, J, toe, R, M, top, reach: (J[0][0] - toe[0]) * 0.55, cap: 0.2, lift: 0.3, fold: 0.5, toeOff: 0.25, curl: 0.3, foot: (b, f, zz) => padFoot(b, f, zz, toe, a, nails, NAIL) });
    M.sauropod = walker({
      color: 0x7a7860, tex: WRINKLE, tile: 2.2, rough: 0.8, gait: { duty: 0.7, stride: 1.6, bob: 0.03 }, wag: 0.1, wagRate: 0.7, look: 0.05, nod: 0.008,
      body: [1.5, 3.0], tailJ: [[-0.8, 3.3], [-2.6, 3.15], [-4.6, 2.9], [-6.6, 2.6], [-8.6, 2.25], [-10.4, 1.95], [-12, 1.7]], neckJ: [[3.6, 3.0], [4.9, 3.65], [6.2, 4.5], [7.5, 5.3], [8.7, 5.95], [9.55, 6.2]], nose: [10.25, 5.95],
      trunk, head: [[9.5, 6.22, 0, 0.19, 0.18, 0.17], [9.75, 6.2, 0, 0.2, 0.18, 0.17], [10.0, 6.08, 0, 0.13, 0.14, 0.15], [10.2, 5.98, 0, 0.1, 0.1, 0.13]], eye: [9.8, 6.28, 0.15, 0.035],
      legs: [leg('h', 0, 0.75, [[0, 3.1], [0.3, 1.8], [0, 0.5], [0.05, 0.27]], [0.5, 0], 0.42, [[0.6, 0.7, 0.42], [0.4, 0.42, 0.34], [0.32, 0.34, 0.3], [0.36, 0.36, 0.36]], [[0.45, 0.58, 0.65, 0.42], null, null], [0, 0.4, -0.25, 0.55, 0.6, 0.35], 3),
        leg('f', 0.25, 0.7, [[3.2, 2.45], [3.0, 1.4], [3.12, 0.42], [3.12, 0.27]], [3.42, 0], 0.36, [[0.42, 0.5, 0.34], [0.3, 0.34, 0.28], [0.27, 0.27, 0.26], [0.3, 0.3, 0.3]], [null, null, null], [0, 0.4, -0.2, 0.4, 0.48, 0.3], 1)],
      coat: (x, y, z, ny) => (1 - clamp(ny) * 0.3) * (1 + clamp(-ny * 2 - 0.6) * 0.35) * (1 - 0.12 * clamp(Math.sin(x * 1.7 + y) * 3) * clamp(ny + 0.6)),
      extra: (b, spine) => {
        for (let x = -9; x < 8.6; x += 0.45) { const p = at(trunk, x), h = 0.1 + 0.16 * clamp(1 - Math.abs(x + 1) / 9); b.skin(cone(h * 0.45, h, x, p[1] + p[3] - 0.02, 0, 0.25, 0, 0.5, 6), spine, [0.7, 0.7, 0.65]); }   // a low row of spines down the back
        b.pair('detail', (s) => [mass(9.86, 6.4, s * 0.06, 0.035, 0.02, 0.025), 'head', EYE]);   // nostrils high on the head
      },
    });
  }

  // ---------- Stegosaurus: 7 m long, 2.75 m at the hips (3.5 m with plates), hind legs twice the length of the fore, head carried below a metre ----------
  {
    const trunk = [[-3.3, 1.75, 0, 0.05], [-2.6, 1.85, 0, 0.13, 0.14, 0.1], [-1.7, 2.0, 0, 0.25, 0.28, 0.2], [-0.8, 2.15, 0, 0.42, 0.5, 0.4], [0, 2.15, 0, 0.6, 0.85, 0.62], [0.8, 1.95, 0, 0.62, 0.95, 0.72], [1.6, 1.65, 0, 0.52, 0.8, 0.62],
      [2.2, 1.4, 0, 0.38, 0.55, 0.42], [2.7, 1.2, 0, 0.24, 0.28, 0.22], [3.1, 1.05, 0, 0.16, 0.17, 0.14], [3.35, 0.98, 0, 0.13, 0.13, 0.12]];
    const leg = (n, phase, z, J, toe, a, R, M, top, nails) => ({ n, phase, z, J, toe, R, M, top, reach: (J[0][0] - toe[0]) * 0.55, cap: 0.2, lift: 0.2, fold: 0.6, toeOff: 0.3, curl: 0.3, foot: (b, f, zz) => padFoot(b, f, zz, toe, a, nails, HORN) });
    M.stego = walker({
      color: 0x74764c, tex: PLATES, tile: 1.3, gait: { duty: 0.7, stride: 1.05, bob: 0.02 }, wag: 0.12, wagRate: 0.8,
      body: [0.8, 1.9], tailJ: [[-0.6, 2.15], [-1.4, 2.05], [-2.1, 1.93], [-2.7, 1.84], [-3.3, 1.75]], neckJ: [[2.3, 1.38], [2.8, 1.17], [3.3, 0.99]], nose: [3.8, 0.86],
      trunk, head: [[3.3, 0.98, 0, 0.11, 0.11, 0.11], [3.5, 0.95, 0, 0.11, 0.1, 0.1], [3.68, 0.9, 0, 0.07, 0.08, 0.07], [3.78, 0.865, 0, 0.05, 0.05, 0.05]], eye: [3.52, 1.0, 0.09, 0.022],
      legs: [leg('h', 0, 0.5, [[0, 1.9], [0.3, 1.05], [0.05, 0.32], [0.1, 0.17]], [0.36, 0], 0.24, [[0.42, 0.48, 0.3], [0.24, 0.26, 0.2], [0.17, 0.19, 0.16], [0.2, 0.2, 0.2]], [[0.45, 0.4, 0.45, 0.3], null, null], [0, 0.25, -0.18, 0.4, 0.44, 0.24], 3),
        leg('f', 0.25, 0.5, [[2.1, 1.15], [1.9, 0.7], [2.05, 0.24], [2.05, 0.14]], [2.26, 0], 0.19, [[0.24, 0.28, 0.2], [0.17, 0.19, 0.15], [0.14, 0.14, 0.13], [0.16, 0.16, 0.16]], [null, null, null], [0, 0.2, -0.12, 0.22, 0.26, 0.16], 4)],
      coat: (x, y, z, ny) => (1 - clamp(ny) * 0.25) * (1 + clamp(-ny * 2 - 0.6) * 0.4) * (1 - 0.2 * clamp(Math.sin(x * 3.1 + y * 2) * 2 - 0.6) * clamp(ny + 0.7)),
      extra: (b, spine) => {
        // 17 plates in two staggered rows, small on the neck, largest over the hips, then shrinking down the tail
        const o = [[-0.3, 0], [-0.5, 0.32], [-0.33, 0.72], [0, 1], [0.33, 0.72], [0.5, 0.32], [0.3, 0]];
        for (let i = 0; i < 17; i++) {
          const x = 3.0 - i * 0.335, sz = 0.2 + 0.6 * Math.exp(-(((x + 0.1) / 1.5) ** 2)) + (x < -0.5 ? 0.08 : 0), p = at(trunk, x), sd = i % 2 ? 1 : -1;
          b.skin(put(slab(o.map((q) => [q[0] * sz * 0.9, q[1] * sz]), 0.07 * sz + 0.02, 0.8), x, p[1] + p[3] - 0.08 * sz, sd * (0.05 + 0.07 * sz), sd * 0.22, 0, -0.12), spine, [1.25, 0.8, 0.55]);
        }
        for (const x of [-2.75, -3.1]) b.pair('detail', (s) => [cone(0.065, 0.8, x, at(trunk, x)[1], s * 0.05, 0.5, s * 1.15), 'tail4', IVORY]);   // the four tail spikes
        b.detail(cone(0.045, 0.1, 3.78, 0.86, 0, -1.9, 0, 1, 8), 'head', HORN);   // horny beak
      },
    });
  }

  // ---------- Triceratops: 8.5 m long, 2.9 m over the hips, a 2.3 m skull with a solid frill, metre-long brow horns, a short nose horn and a beak ----------
  {
    const leg = (n, phase, z, J, toe, a, R, M, top, nails) => ({ n, phase, z, J, toe, R, M, top, reach: (J[0][0] - toe[0]) * 0.55, cap: 0.2, lift: 0.22, fold: 0.6, toeOff: 0.3, curl: 0.3, foot: (b, f, zz) => padFoot(b, f, zz, toe, a, nails, HORN) });
    M.triceratops = walker({
      color: 0x80745a, tex: PLATES, tile: 1.4, gait: { duty: 0.68, stride: 1.2, bob: 0.025 }, wag: 0.07, look: 0.03, nod: 0.01,
      body: [1.0, 2.0], tailJ: [[-0.7, 2.1], [-1.5, 1.95], [-2.3, 1.65], [-2.9, 1.42], [-3.4, 1.2]], neckJ: [[2.3, 1.88], [2.95, 1.8]], nose: [4.6, 1.02],
      trunk: [[-3.4, 1.2, 0, 0.04], [-2.6, 1.55, 0, 0.2, 0.2, 0.15], [-1.7, 1.9, 0, 0.4, 0.4, 0.32], [-0.8, 2.1, 0, 0.62, 0.7, 0.6], [0, 2.1, 0, 0.75, 1.0, 0.8], [1.0, 2.0, 0, 0.8, 1.1, 0.92], [1.9, 1.9, 0, 0.7, 0.95, 0.8], [2.6, 1.85, 0, 0.5, 0.6, 0.5], [3.05, 1.8, 0, 0.4, 0.42, 0.38]],
      head: [[2.95, 1.8, 0, 0.4, 0.38, 0.36], [3.4, 1.72, 0, 0.4, 0.42, 0.4], [3.9, 1.5, 0, 0.29, 0.36, 0.27], [4.3, 1.25, 0, 0.2, 0.26, 0.16], [4.52, 1.1, 0, 0.11, 0.15, 0.09]], eye: [3.62, 1.9, 0.33, 0.04],
      legs: [leg('h', 0, 0.6, [[0, 1.95], [0.4, 1.1], [0.05, 0.36], [0.1, 0.2]], [0.42, 0], 0.3, [[0.5, 0.56, 0.36], [0.3, 0.32, 0.25], [0.22, 0.24, 0.2], [0.25, 0.25, 0.25]], [[0.45, 0.48, 0.54, 0.36], null, null], [0, 0.3, -0.2, 0.46, 0.5, 0.28], 4),
        leg('f', 0.25, 0.68, [[2.4, 1.45], [2.15, 0.85], [2.35, 0.27], [2.35, 0.17]], [2.62, 0], 0.25, [[0.34, 0.4, 0.27], [0.24, 0.27, 0.21], [0.19, 0.19, 0.18], [0.21, 0.21, 0.21]], [[0.5, 0.3, 0.36, 0.25], null, null], [0, 0.25, -0.18, 0.32, 0.36, 0.2], 5)],
      coat: (x, y, z, ny) => (1 - clamp(ny) * 0.25) * (1 + clamp(-ny * 2 - 0.6) * 0.4),
      extra: (b) => {
        const C = [2.6, 2.42], rz = 0.9, Ry = 1.05, Rz = 1.05;   // the frill: a broad shield leaning back over the neck
        b.skin(mass(C[0], C[1], 0, 0.15, Ry, Rz, rz, 0, 1.4), 'head', [0.95, 0.85, 0.8]);
        for (let a = -2.1; a <= 2.11; a += 0.3) b.skin(mass(C[0] - Math.cos(a) * Ry * Math.sin(rz), C[1] + Math.cos(a) * Ry * Math.cos(rz), Math.sin(a) * Rz, 0.07, 0.1, 0.1, rz), 'head', [1.15, 1.1, 1]);
        b.pair('detail', (s) => [loft([[3.5, 2.0, s * 0.27, 0.13], [3.8, 2.4, s * 0.36, 0.105], [4.2, 2.72, s * 0.42, 0.065], [4.5, 2.82, s * 0.43, 0.01]], { segs: 9, sub: 5 }), 'head', IVORY]);
        b.detail(loft([[4.12, 1.52, 0, 0.1], [4.22, 1.72, 0, 0.065], [4.3, 1.86, 0, 0.01]], { segs: 8, sub: 4 }), 'head', IVORY);
        b.detail(loft([[4.42, 1.2, 0, 0.11, 0.13, 0.075], [4.6, 1.03, 0, 0.06, 0.07, 0.04], [4.66, 0.9, 0, 0.01]], { segs: 8, sub: 3 }), 'head', HORN);   // parrot beak
        b.pair('skin', (s) => [cone(0.09, 0.25, 3.5, 1.42, s * 0.36, Math.PI - 0.3, s * 0.9), 'head']);   // cheek horns
        b.pair('detail', (s) => [mass(4.3, 1.38, s * 0.13, 0.04, 0.025, 0.02, -0.6), 'head', EYE]);
      },
    });
  }

  // ---------- Pteranodon: 6 m wingspan; each wing is skin stretched from one enormous finger to the ankle; long toothless beak, crest behind the skull ----------
  {
    const b = new Rig(), T = 1.2, tip = [-0.2, 0.03, 3.0];
    b.bone('body', null, 0, 0, 0);
    const neck = b.run('neck', 'body', [[0.15, 0.04], [0.4, 0.16], [0.6, 0.25]]);
    b.bone('head', neck[neck.length - 1], 0.6, 0.25, 0, [1.7, 0.12, 0]);
    b.skin(loft([[-0.55, 0, 0, 0.02], [-0.35, 0, 0, 0.1, 0.1, 0.09], [-0.1, 0, 0, 0.14, 0.16, 0.13], [0.1, 0.02, 0, 0.13, 0.15, 0.13], [0.3, 0.1, 0, 0.08, 0.08, 0.07], [0.5, 0.2, 0, 0.065], [0.62, 0.25, 0, 0.065]], { segs: 12, tile: T }), b.path(['body', ...neck, 'head'], 0.5));
    b.skin(loft([[0.58, 0.26, 0, 0.07, 0.07, 0.06], [0.75, 0.26, 0, 0.085, 0.07, 0.055], [1.0, 0.22, 0, 0.06, 0.05, 0.035], [1.35, 0.17, 0, 0.035, 0.03, 0.02], [1.7, 0.12, 0, 0.006]], { segs: 10, tile: T, capA: 0.8 }), 'head', [1.5, 1.3, 0.9]);
    b.skin(loft([[0.78, 0.31, 0, 0.05, 0.05, 0.02], [0.55, 0.44, 0, 0.07, 0.07, 0.014], [0.3, 0.58, 0, 0.05, 0.05, 0.01], [0.1, 0.66, 0, 0.01]], { segs: 8, tile: T }), 'head', [1.6, 0.7, 0.45]);   // crest
    b.pair('detail', (s) => [mass(0.77, 0.29, s * 0.05, 0.016, 0.016, 0.01), 'head', EYE]);
    // arm = [z, x, y, radius] from the shoulder out along the wing finger; the membrane's trailing edge runs down the flank and the leg to the ankle
    const arm = [[0.12, 0.08, 0.06, 0.06], [0.4, -0.02, 0.06, 0.05], [0.8, 0.3, 0.06, 0.04], [1.3, 0.38, 0.06, 0.035], [1.9, 0.3, 0.05, 0.028], [2.5, 0.1, 0.04, 0.02], [3.0, tip[0], tip[1], 0.006]];
    const trailX = (z) => (z < 0.28 ? -0.5 - 0.45 * ((z - 0.12) / 0.16) : -0.95 + 0.75 * ((z - 0.28) / 2.72) ** 1.5), lead = [], trail = [];
    for (let i = 0; i <= 24; i++) { const z = 0.12 + (i / 24) ** 1.15 * 2.88, a = at(arm, z); lead.push([a[1], a[2], z]); trail.push([trailX(z), i === 0 ? 0 : 0.01, z]); }
    for (const s of [1, -1]) {
      const n = s > 0 ? 'wl' : 'wr', side = (g) => (s > 0 ? g : mirror(g));
      b.bone(n + '0', 'body', 0.08, 0.06, s * 0.12); b.bone(n + '1', n + '0', 0.38, 0.06, s * 1.3, [tip[0], tip[1], s * tip[2]]);
      const path = b.path([n + '0', n + '1'], 0.6);
      b.wing(side(strip(lead, trail, T)), path).wing(side(fan([[0.08, 0.06, 0.12], [0.3, 0.07, 0.14], [0.3, 0.06, 0.8], [-0.02, 0.06, 0.4]], T)), n + '0');
      b.skin(side(loft(arm.map((a) => [a[1], a[2], a[0], a[3]]), { segs: 8, sub: 3, tile: T })), path);
      for (let k = 0; k < 3; k++) b.detail(side(cone(0.012, 0.09, 0.4, 0.06, 1.28 + k * 0.03, -1.4 - k * 0.2)), n + '1', NAIL);   // the three small free fingers
      b.skin(side(loft([[-0.38, -0.03, 0.1, 0.055], [-0.68, -0.03, 0.2, 0.035], [-0.95, -0.02, 0.28, 0.02], [-1.12, -0.02, 0.3, 0.012]], { segs: 7, sub: 3, tile: T, capB: 1 })), 'body');
      b.wings.push({ inner: b.ix[n + '0'], outer: b.ix[n + '1'], side: s });
    }
    b.wave(neck, 'y', 0.05, { kt: 0.4, lag: 0.5 });
    M.pterosaur = b.build({ color: 0x8a7a66, tex: WRINKLE, wingColor: 0x8a6a56, rough: 0.8, coat: (x, y, z, ny) => 1 + clamp(-ny) * 0.3, flight: { rate: 2.4, amp: 0.34, dihedral: 0.1, fold: 0.1, glide: 0.1, glideRate: 0.17 } });
  }
}
