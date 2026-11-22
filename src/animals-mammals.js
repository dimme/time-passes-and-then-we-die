// Mammals: deer, wolf, horse, the first small hoofed mammals, brontotheres and the elephants of the ice age.
import { Rig, loft, mass, cone, slab, frustum, put, padFoot, hide, hex, BLACK, IVORY, HOOF, NAIL } from './animals-rig.js?v=740e009b';

/** Vertex-colour multipliers that turn a hide of colour `base` into `target` (both hex). */
const tone = (base, target) => { const a = hex(base), b = hex(target); return b.map((v, i) => v / a[i]); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const ONE = [1, 1, 1];

// ---------- feet: everything below the ball joint (at `ball`), carried by the foot bone ----------
const FEET = {
  /** Two toes side by side with dew claws behind (deer). a = half length of one hoof. */
  cloven(b, f, z, toe, a, ball) {
    for (const s of [1, -1]) {
      b.detail(frustum([toe[0] - a, 0, z + s * a * 0.55, a, a * 0.48], [toe[0] - a * 1.7, a * 1.5, z + s * a * 0.45, a * 0.62, a * 0.44, 0.45], 8), f, HOOF);
      b.detail(cone(a * 0.22, a * 0.7, ball[0] - a * 0.55, ball[1] - a * 0.3, z + s * a * 0.45, 2.5), f, HOOF);
    }
  },
  /** One solid hoof (horses). */
  hoof(b, f, z, toe, a) { b.detail(frustum([toe[0] - a, 0, z, a, a * 0.85], [toe[0] - a * 1.45, a * 1.1, z, a * 0.7, a * 0.72, 0.4], 12), f, HOOF); },
  /** A pad with four clawed toes (dogs and other small runners). */
  paw(b, f, z, toe, a) {
    b.skin(mass(toe[0] - a * 1.5, a * 0.55, z, a * 1.1, a * 0.6, a * 0.95), f);
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const x = toe[0] - a * (0.45 + 0.25 * Math.abs(k)), zz = z + k * a * 0.5;
      b.skin(mass(x, a * 0.4, zz, a * 0.55, a * 0.4, a * 0.3, 0, 0, 1, 0.5), f); b.detail(cone(a * 0.12, a * 0.45, x + a * 0.4, a * 0.4, zz, -1.9), f, NAIL);
    }
  },
  pillar: padFoot,
};

/**
 * A four-legged mammal from side-view profiles. Everything is in metres with the nose towards +x.
 * torso / neck / head / tail are loft point lists; joints: body [x, y], tailJ and neckJ (runs ending at the tail tip / the head joint), nose.
 * fore / hind: { z, J, toe, R, M, top, ext, foot: [kind, size], … leg options }.
 */
function quadruped(s) {
  const b = new Rig(), T = s.tile;
  b.bone('body', null, ...s.body);
  const tail = b.run('tail', 'body', s.tailJ), neck = b.run('neck', 'body', s.neckJ), hj = s.neckJ[s.neckJ.length - 1];
  b.bone('head', neck[neck.length - 1], hj[0], hj[1], 0, [...s.nose, 0]);
  const spine = b.path([...tail.slice().reverse(), 'body', ...neck, 'head'], 0.45);
  b.skin(loft(s.torso, { segs: 20, tile: T, capA: 0.7, capB: 0.7 }), spine);
  b.skin(loft(s.neck, { segs: 14, tile: T, capA: 0.5 }), spine);
  b.skin(loft(s.head, { segs: 14, tile: T, capA: 0.8, capB: 0.7, ref: s.headRef }), 'head');
  if (s.tail) b.skin(loft(s.tail, { segs: 8, tile: T, capA: 0.5, capB: 1, ref: [1, 0, 0] }), spine, s.tailTint);
  [['f', s.fore, [0.25, 0.75]], ['h', s.hind, [0, 0.5]]].forEach(([n, L, ph]) => [1, -1].forEach((sd, i) => {
    const z = sd * L.z, names = b.limb(n + (i ? 'r' : 'l'), 'body', z, L.J, L.toe, L.R, L.M, { ...L, top: L.top && [L.top[0], L.top[1], sd * L.top[2], L.top[3], L.top[4], L.top[5]], tile: T, phase: ph[i] + (s.trot && n === 'f' ? 0.25 : 0), mode: L.mode || (n === 'f' ? 'lock' : 'panto') });
    FEET[L.foot[0]](b, names[3], z, L.toe, L.foot[1], L.J[3]);
  }));
  // face
  const [ex, ey, ez, er] = s.eye;
  b.pair('detail', (sd) => [mass(ex, ey, sd * ez, er, er, er * 0.8), 'head', BLACK]);
  b.pair('skin', (sd) => [mass(ex - er * 0.2, ey + er * 0.75, sd * (ez - er * 0.35), er * 1.5, er * 0.7, er, -0.25), 'head']);   // brow
  if (s.nosePad) b.detail(mass(...s.nosePad), 'head', BLACK);
  if (s.nostril) b.pair('detail', (sd) => [mass(s.nostril[0], s.nostril[1], sd * s.nostril[2], s.nostril[3], s.nostril[3] * 0.6, s.nostril[3] * 0.5, -0.9), 'head', BLACK]);
  if (s.ear) { const [x, y, z, len, w, out, fwd] = s.ear, o = [[-w * 0.35, 0], [-w, len * 0.4], [-w * 0.6, len * 0.8], [0, len], [w * 0.6, len * 0.8], [w, len * 0.4], [w * 0.35, 0]]; b.pair('skin', (sd) => [put(slab(o, w * 0.5, T), x, y, sd * z, sd * out, sd * fwd, -0.15), 'head', s.earTint]); }
  b.wave(tail, 'x', s.wag || 0.12, { kt: 1.7, lag: 0.7 }).sway(neck[0], 'z', s.nod || 0.03, { kg: 2, kph: 0 }).sway('head', 'z', -(s.nod || 0.03) * 0.8, { kg: 2, phase: 0.5, kph: 0 }).sway('head', 'y', 0.1, { kt: 0.31 });
  if (s.extra) s.extra(b, spine);
  return b.build({ color: s.color, tex: s.tex, coat: s.coat, gait: s.gait, rough: s.rough || 0.9, back: s.back, belly: s.belly, scale: s.scale });
}

export function mammals(M) {
  const SHORT = hide('short', 5), SHAG = hide('shag', 6), WRINKLE = hide('wrinkle', 4);

  // ---------- white-tailed deer: buck ~1.0 m at the shoulder, 1.8 m nose to rump; legs half the height, metatarsus the longest bone ----------
  const deer = (antlers, scale) => {
    const C = 0x8a6644, white = tone(C, 0xe8e2d4), dark = tone(C, 0x4a3828);
    return quadruped({
      color: C, tex: SHORT, tile: 0.35, scale, gait: { duty: 0.62, stride: 0.5 },
      body: [0, 0.8], tailJ: [[-0.55, 0.93], [-0.61, 0.83], [-0.65, 0.72]], neckJ: [[0.4, 0.9], [0.55, 1.12], [0.67, 1.36]], nose: [0.97, 1.25],
      torso: [[-0.56, 0.86, 0, 0.09, 0.12, 0.09, 0.2], [-0.46, 0.85, 0, 0.165, 0.2, 0.155, 0.2], [-0.3, 0.83, 0, 0.195, 0.19, 0.175, 0.15], [-0.1, 0.81, 0, 0.175, 0.17, 0.175, 0.1],
        [0.1, 0.79, 0, 0.185, 0.21, 0.19, 0.2], [0.3, 0.78, 0, 0.22, 0.235, 0.18, 0.35], [0.42, 0.79, 0, 0.2, 0.22, 0.15, 0.4], [0.52, 0.81, 0, 0.13, 0.16, 0.1, 0.4]],
      neck: [[0.36, 0.86, 0, 0.14, 0.19, 0.115], [0.47, 1.0, 0, 0.1, 0.125, 0.078], [0.58, 1.17, 0, 0.07, 0.085, 0.06], [0.66, 1.31, 0, 0.058, 0.068, 0.054], [0.69, 1.38, 0, 0.052, 0.058, 0.05]],
      head: [[0.65, 1.385, 0, 0.05, 0.055, 0.052], [0.73, 1.365, 0, 0.062, 0.07, 0.064], [0.82, 1.325, 0, 0.045, 0.06, 0.046], [0.9, 1.285, 0, 0.032, 0.045, 0.033], [0.955, 1.257, 0, 0.027, 0.032, 0.028]],
      tail: [[-0.53, 0.94, 0, 0.04, 0.04, 0.045], [-0.6, 0.84, 0, 0.035, 0.035, 0.05], [-0.65, 0.73, 0, 0.02, 0.02, 0.03]],
      eye: [0.775, 1.385, 0.056, 0.017], nosePad: [0.972, 1.252, 0, 0.02, 0.02, 0.024], ear: [0.665, 1.42, 0.05, 0.15, 0.04, 0.75, -0.5],
      fore: { z: 0.085, J: [[0.44, 0.74], [0.33, 0.6], [0.345, 0.33], [0.35, 0.085]], toe: [0.4, 0], foot: ['cloven', 0.03], top: [-0.03, 0.1, -0.035, 0.06, 0.09, 0.04],
        R: [[0.06, 0.09, 0.05], [0.038, 0.05, 0.034], [0.024, 0.022, 0.022], [0.02, 0.022, 0.019]], M: [null, [0.25, 0.034, 0.042, 0.029], [0.5, 0.015, 0.017, 0.014]], ext: [[0.375, 0.045, 0.019, 0.019, 0.02]], lift: 0.1, fold: 1.1 },
      hind: { z: 0.09, J: [[-0.36, 0.86], [-0.25, 0.63], [-0.47, 0.42], [-0.45, 0.09]], toe: [-0.4, 0], foot: ['cloven', 0.03], top: [-0.01, 0.06, -0.04, 0.09, 0.11, 0.05],
        R: [[0.1, 0.13, 0.065], [0.06, 0.065, 0.042], [0.026, 0.03, 0.022], [0.02, 0.022, 0.019]], M: [[0.5, 0.09, 0.11, 0.058], [0.3, 0.04, 0.052, 0.03], [0.5, 0.016, 0.019, 0.015]], ext: [[-0.425, 0.045, 0.019, 0.019, 0.02]], lift: 0.09 },
      coat: (x, y, z, ny) => {
        let c = mix(ONE, dark, (ny - 0.75) * 2.5);                                    // darker along the spine
        c = mix(c, white, Math.min((0.74 - y) * 12, -ny * 3 - 0.9) * (y > 0.5 ? 1 : 0));          // belly
        if (x < -0.5) c = mix(c, white, (-0.2 - ny) * 3 + (0.93 - y) * 4);                           // under the tail and between the hams
        if (x > 0.5 && y > 1.1) c = mix(c, white, Math.min((1.36 - y) * 10, -ny * 4 - 1.2));        // throat patch
        if (x > 0.88) c = mix(c, white, 1 - Math.abs(x - 0.915) * 50);                                // band behind the nose
        return c;
      },
      extra: (b) => {
        if (!antlers) return;   // main beams sweep back, out and then forward; the tines rise from them
        const A = hex(0xb09a78), br = (pts) => loft(pts, { segs: 6, sub: 4, capB: 2 });
        b.pair('detail', (s) => [br([[0.69, 1.42, s * 0.04, 0.017], [0.66, 1.52, s * 0.11, 0.015], [0.69, 1.63, s * 0.2, 0.014], [0.81, 1.69, s * 0.23, 0.012], [0.93, 1.67, s * 0.17, 0.005]]), 'head', A]);
        for (const [x, y, z, dx, dy, dz] of [[0.7, 1.46, 0.06, 0.03, 0.11, 0], [0.665, 1.57, 0.155, -0.03, 0.2, 0.02], [0.75, 1.67, 0.22, 0.03, 0.16, -0.02], [0.86, 1.685, 0.21, 0.04, 0.1, -0.04]])
          b.pair('detail', (s) => [br([[x, y, s * z, 0.011], [x + dx * 0.5, y + dy * 0.55, s * (z + dz * 0.4), 0.009], [x + dx, y + dy, s * (z + dz), 0.003]]), 'head', A]);
      },
    });
  };
  M.deer = deer(true, 1); M.doe = deer(false, 0.9);

  // ---------- grey wolf: 0.8 m at the shoulder, 1.4 m nose to rump plus a 0.45 m brush; deep narrow chest, long legs, trots ----------
  {
    const C = 0x7c766c, pale = tone(C, 0xb4ac9c), dark = tone(C, 0x3a3834);
    M.wolf = quadruped({
      color: C, tex: SHORT, tile: 0.3, trot: true, gait: { duty: 0.5, stride: 0.5, bob: 0.012 }, wag: 0.08,
      body: [0, 0.63], tailJ: [[-0.43, 0.72], [-0.53, 0.6], [-0.6, 0.46], [-0.63, 0.31]], neckJ: [[0.3, 0.68], [0.45, 0.76], [0.58, 0.83]], nose: [0.91, 0.76],
      torso: [[-0.44, 0.67, 0, 0.09, 0.11, 0.1], [-0.34, 0.655, 0, 0.125, 0.15, 0.14], [-0.15, 0.64, 0, 0.135, 0.135, 0.15], [0.05, 0.62, 0, 0.155, 0.175, 0.16, 0.15], [0.22, 0.61, 0, 0.185, 0.21, 0.16, 0.3], [0.34, 0.62, 0, 0.17, 0.2, 0.14, 0.35], [0.43, 0.64, 0, 0.115, 0.14, 0.1, 0.35]],
      neck: [[0.28, 0.66, 0, 0.16, 0.17, 0.135], [0.42, 0.74, 0, 0.135, 0.14, 0.12], [0.54, 0.81, 0, 0.115, 0.115, 0.105], [0.6, 0.84, 0, 0.1, 0.1, 0.098]],
      head: [[0.56, 0.845, 0, 0.08, 0.08, 0.09], [0.64, 0.845, 0, 0.092, 0.09, 0.105], [0.72, 0.82, 0, 0.064, 0.07, 0.075], [0.81, 0.79, 0, 0.047, 0.05, 0.05], [0.875, 0.772, 0, 0.04, 0.042, 0.042]],
      tail: [[-0.42, 0.74, 0, 0.035], [-0.52, 0.61, 0, 0.06], [-0.6, 0.46, 0, 0.065], [-0.63, 0.33, 0, 0.03]],
      eye: [0.7, 0.872, 0.073, 0.013], nosePad: [0.905, 0.776, 0, 0.02, 0.018, 0.026], ear: [0.585, 0.91, 0.068, 0.1, 0.042, 0.25, -0.35],
      fore: { z: 0.1, J: [[0.36, 0.56], [0.25, 0.44], [0.27, 0.2], [0.275, 0.05]], toe: [0.335, 0], foot: ['paw', 0.035], top: [-0.02, 0.09, -0.03, 0.06, 0.08, 0.04],
        R: [[0.088, 0.112, 0.062], [0.05, 0.062, 0.044], [0.035, 0.033, 0.033], [0.033, 0.033, 0.033]], M: [null, [0.25, 0.045, 0.053, 0.037], [0.5, 0.026, 0.027, 0.025]], lift: 0.09, fold: 1.0, toeOff: 0.7 },
      hind: { z: 0.1, J: [[-0.34, 0.66], [-0.22, 0.46], [-0.42, 0.26], [-0.39, 0.05]], toe: [-0.33, 0], foot: ['paw', 0.033], top: [-0.01, 0.05, -0.035, 0.08, 0.09, 0.045],
        R: [[0.112, 0.138, 0.069], [0.069, 0.075, 0.05], [0.035, 0.037, 0.03], [0.031, 0.033, 0.031]], M: [[0.5, 0.1, 0.125, 0.062], [0.3, 0.05, 0.056, 0.037], [0.5, 0.025, 0.027, 0.024]], lift: 0.08, toeOff: 0.7 },
      coat: (x, y, z, ny) => {
        let c = mix(ONE, dark, (ny - 0.45) * 1.6 * (x < 0.55 ? 1 : 0.3));              // dark saddle
        c = mix(c, pale, Math.max((0.42 - y) * 4, -ny * 1.5 - 0.3));                     // legs and underparts
        if (x > 0.66) c = mix(c, pale, (0.82 - y) * 14);                                  // muzzle and cheeks
        if (x < -0.55 && y < 0.4) c = mix(c, dark, (0.4 - y) * 12);                      // tail tip
        return c;
      },
    });
  }

  // ---------- horse: 1.55 m at the withers and as long from breast to buttock; knee at 0.48 m, hock at 0.6 m, head 0.6 m ----------
  {
    const C = 0x6a4428, black = [0.05, 0.05, 0.06], dark = tone(C, 0x1c1410);
    M.horse = quadruped({
      color: C, tex: SHORT, tile: 0.6, rough: 0.7, gait: { duty: 0.63, stride: 0.95, bob: 0.012 }, nod: 0.05, wag: 0.05,
      body: [0, 1.15], tailJ: [[-0.84, 1.42], [-0.93, 1.25], [-0.98, 0.95], [-0.97, 0.55]], neckJ: [[0.55, 1.36], [0.85, 1.58], [1.17, 1.82]], nose: [1.56, 1.37],
      torso: [[-0.86, 1.22, 0, 0.16, 0.2, 0.14, 0.2], [-0.72, 1.2, 0, 0.3, 0.33, 0.27, 0.15], [-0.5, 1.18, 0, 0.345, 0.34, 0.3, 0.1], [-0.2, 1.16, 0, 0.31, 0.33, 0.31], [0.1, 1.14, 0, 0.32, 0.36, 0.32, 0.1],
        [0.35, 1.14, 0, 0.37, 0.38, 0.29, 0.25], [0.5, 1.15, 0, 0.39, 0.37, 0.25, 0.35], [0.66, 1.17, 0, 0.3, 0.33, 0.2, 0.4], [0.78, 1.18, 0, 0.18, 0.2, 0.14, 0.4]],
      neck: [[0.48, 1.28, 0, 0.25, 0.31, 0.16], [0.7, 1.47, 0, 0.2, 0.22, 0.12], [0.92, 1.65, 0, 0.15, 0.16, 0.095], [1.1, 1.78, 0, 0.115, 0.12, 0.08], [1.19, 1.84, 0, 0.095, 0.1, 0.075]],
      head: [[1.15, 1.85, 0, 0.08, 0.09, 0.085], [1.24, 1.75, 0, 0.1, 0.15, 0.1], [1.34, 1.63, 0, 0.082, 0.115, 0.078], [1.44, 1.5, 0, 0.064, 0.08, 0.058], [1.52, 1.4, 0, 0.06, 0.066, 0.06]],
      eye: [1.265, 1.775, 0.092, 0.026], nostril: [1.55, 1.39, 0.038, 0.022], ear: [1.16, 1.9, 0.055, 0.16, 0.04, 0.3, -0.5],
      fore: { z: 0.17, J: [[0.66, 1.12], [0.5, 0.9], [0.52, 0.48], [0.525, 0.2]], toe: [0.63, 0], foot: ['hoof', 0.065], top: [-0.06, 0.2, -0.07, 0.12, 0.17, 0.07],
        R: [[0.13, 0.17, 0.09], [0.075, 0.105, 0.065], [0.052, 0.046, 0.046], [0.04, 0.046, 0.038]], M: [null, [0.25, 0.07, 0.088, 0.056], [0.5, 0.033, 0.04, 0.03]], ext: [[0.565, 0.09, 0.036, 0.036, 0.04]], lift: 0.16, fold: 1.1 },
      hind: { z: 0.18, J: [[-0.55, 1.25], [-0.38, 0.95], [-0.72, 0.6], [-0.68, 0.2]], toe: [-0.575, 0], foot: ['hoof', 0.065], top: [-0.02, 0.1, -0.08, 0.2, 0.22, 0.1],
        R: [[0.21, 0.25, 0.125], [0.115, 0.125, 0.08], [0.056, 0.066, 0.046], [0.04, 0.046, 0.038]], M: [[0.5, 0.18, 0.215, 0.11], [0.3, 0.08, 0.1, 0.06], [0.5, 0.035, 0.042, 0.03]], ext: [[-0.635, 0.09, 0.036, 0.036, 0.04]], lift: 0.14 },
      coat: (x, y) => mix(mix(ONE, dark, (0.62 - y) * 5), dark, x > 1.4 ? (1.5 - y) * 6 : 0),   // a bay: black points and a dark muzzle
      extra: (b, spine) => {
        b.skin(loft([[1.22, 1.9, 0.01, 0.03, 0.08, 0.03], [1.12, 1.84, 0.03, 0.04, 0.1, 0.03], [0.9, 1.68, 0.05, 0.05, 0.16, 0.03], [0.68, 1.53, 0.05, 0.05, 0.17, 0.03], [0.5, 1.5, 0.03, 0.03, 0.08, 0.03]], { segs: 8, tile: 0.6, capA: 1, capB: 1 }), spine, black);   // mane, falling to one side
        b.skin(loft([[-0.82, 1.42, 0, 0.06], [-0.92, 1.3, 0, 0.085], [-0.98, 0.95, 0, 0.11, 0.09], [-0.98, 0.6, 0, 0.09, 0.07], [-0.96, 0.4, 0, 0.03]], { segs: 9, tile: 0.6, capA: 1, ref: [1, 0, 0] }), spine, black);   // tail hair from the dock
      },
    });
  }

  // ---------- the first small hoofed mammals (Hyracotherium, the "dawn horse"): 0.4 m at the hips, arched back, four-toed feet, long tail ----------
  {
    const C = 0x7a5c44, pale = tone(C, 0xcabca0);
    M.small = quadruped({
      color: C, tex: SHORT, tile: 0.18, trot: true, gait: { duty: 0.5, stride: 0.2, bob: 0.005 },
      body: [0, 0.33], tailJ: [[-0.26, 0.38], [-0.36, 0.31], [-0.44, 0.22], [-0.5, 0.14]], neckJ: [[0.16, 0.35], [0.24, 0.4], [0.3, 0.445]], nose: [0.45, 0.4],
      torso: [[-0.27, 0.36, 0, 0.05, 0.06, 0.05], [-0.2, 0.35, 0, 0.085, 0.09, 0.075], [-0.08, 0.34, 0, 0.092, 0.085, 0.085], [0.04, 0.32, 0, 0.085, 0.095, 0.085, 0.15], [0.14, 0.31, 0, 0.08, 0.1, 0.075, 0.3], [0.21, 0.32, 0, 0.06, 0.07, 0.055, 0.3]],
      neck: [[0.14, 0.33, 0, 0.07, 0.08, 0.058], [0.23, 0.395, 0, 0.05, 0.055, 0.046], [0.3, 0.44, 0, 0.042, 0.045, 0.04]],
      head: [[0.285, 0.45, 0, 0.036, 0.036, 0.038], [0.33, 0.445, 0, 0.04, 0.042, 0.042], [0.38, 0.425, 0, 0.028, 0.032, 0.03], [0.43, 0.402, 0, 0.018, 0.022, 0.02]],
      tail: [[-0.25, 0.39, 0, 0.022], [-0.36, 0.31, 0, 0.016], [-0.44, 0.22, 0, 0.011], [-0.5, 0.14, 0, 0.006]],
      eye: [0.355, 0.458, 0.032, 0.008], nosePad: [0.447, 0.402, 0, 0.01, 0.009, 0.012], ear: [0.3, 0.478, 0.03, 0.05, 0.02, 0.4, -0.4],
      fore: { z: 0.05, J: [[0.17, 0.27], [0.11, 0.2], [0.125, 0.1], [0.13, 0.03]], toe: [0.162, 0], foot: ['paw', 0.017], top: [-0.01, 0.04, -0.02, 0.035, 0.045, 0.025],
        R: [[0.035, 0.045, 0.028], [0.022, 0.028, 0.02], [0.014, 0.013, 0.013], [0.013, 0.013, 0.013]], M: [null, [0.25, 0.019, 0.022, 0.016], [0.5, 0.011, 0.011, 0.01]], lift: 0.04, fold: 1.0 },
      hind: { z: 0.055, J: [[-0.16, 0.34], [-0.09, 0.23], [-0.21, 0.13], [-0.19, 0.03]], toe: [-0.158, 0], foot: ['paw', 0.017], top: [0, 0.03, -0.02, 0.045, 0.05, 0.028],
        R: [[0.05, 0.06, 0.032], [0.03, 0.033, 0.023], [0.015, 0.016, 0.013], [0.013, 0.013, 0.013]], M: [[0.5, 0.045, 0.055, 0.03], [0.3, 0.022, 0.025, 0.017], [0.5, 0.011, 0.011, 0.01]], lift: 0.035 },
      coat: (x, y, z, ny) => {
        let c = mix(ONE, pale, Math.max((0.16 - y) * 14, -ny * 2 - 0.9));
        if (x > -0.25 && x < 0.2 && y > 0.27) for (const row of [0.3, 0.345, 0.39]) c = mix(c, pale, (1 - Math.abs(y - row) * 70) * (Math.sin(x * 95 + row * 40) > 0.1 ? 0.8 : 0));   // broken pale stripes along the flanks
        return c;
      },
    });
  }

  // ---------- brontothere (Megacerops): 2.5 m at the humped shoulders, 4.7 m long, a pair of blunt horns side by side on the nose ----------
  {
    const C = 0x7e766a;
    M.bronto = quadruped({
      color: C, tex: WRINKLE, tile: 1.1, rough: 0.8, gait: { duty: 0.66, stride: 1.25, bob: 0.02 }, wag: 0.08, nod: 0.02,
      body: [0, 1.6], tailJ: [[-1.9, 1.95], [-2.03, 1.5], [-2.08, 1.0]], neckJ: [[1.4, 1.78], [1.75, 1.72], [2.05, 1.64]], nose: [2.9, 1.3],
      torso: [[-1.9, 1.75, 0, 0.3, 0.4, 0.3], [-1.6, 1.7, 0, 0.6, 0.65, 0.6], [-1.0, 1.65, 0, 0.72, 0.75, 0.75], [-0.3, 1.6, 0, 0.7, 0.8, 0.82], [0.5, 1.6, 0, 0.82, 0.8, 0.8, 0.1], [1.0, 1.65, 0, 0.87, 0.75, 0.7, 0.2], [1.4, 1.7, 0, 0.65, 0.65, 0.55, 0.2], [1.7, 1.72, 0, 0.4, 0.45, 0.4]],
      neck: [[1.3, 1.76, 0, 0.56, 0.55, 0.42], [1.75, 1.7, 0, 0.4, 0.42, 0.33], [2.1, 1.62, 0, 0.32, 0.34, 0.28]],
      head: [[2.0, 1.63, 0, 0.3, 0.3, 0.27], [2.25, 1.55, 0, 0.25, 0.3, 0.26], [2.5, 1.44, 0, 0.19, 0.27, 0.2], [2.72, 1.34, 0, 0.19, 0.22, 0.18], [2.83, 1.3, 0, 0.14, 0.17, 0.15]],
      tail: [[-1.88, 1.98, 0, 0.07], [-2.03, 1.5, 0, 0.045], [-2.08, 1.05, 0, 0.05], [-2.08, 0.9, 0, 0.02]],
      eye: [2.33, 1.64, 0.235, 0.028], nostril: [2.9, 1.33, 0.07, 0.035], ear: [2.02, 1.86, 0.2, 0.17, 0.06, 0.5, -0.4],
      fore: { z: 0.5, J: [[1.05, 1.5], [0.85, 1.15], [0.9, 0.5], [0.9, 0.17]], toe: [1.1, 0], foot: ['pillar', 0.19], top: [-0.08, 0.3, -0.2, 0.28, 0.36, 0.18],
        R: [[0.3, 0.34, 0.24], [0.2, 0.24, 0.18], [0.14, 0.14, 0.13], [0.15, 0.15, 0.15]], M: [null, [0.3, 0.19, 0.22, 0.16], null], cap: 0.3, lift: 0.18, fold: 0.7, toeOff: 0.35, curl: 0.4 },
      hind: { z: 0.52, J: [[-1.2, 1.6], [-0.95, 1.05], [-1.3, 0.55], [-1.25, 0.17]], toe: [-1.05, 0], foot: ['pillar', 0.19], top: [-0.03, 0.2, -0.2, 0.38, 0.42, 0.24],
        R: [[0.42, 0.48, 0.3], [0.26, 0.28, 0.2], [0.14, 0.16, 0.13], [0.15, 0.15, 0.15]], M: [[0.5, 0.38, 0.44, 0.28], [0.3, 0.2, 0.24, 0.16], null], cap: 0.3, lift: 0.16, toeOff: 0.35, curl: 0.4 },
      coat: (x, y, z, ny) => 1 - Math.max(0, ny) * 0.15,
      extra: (b) => b.pair('skin', (s) => [loft([[2.66, 1.42, s * 0.08, 0.13], [2.76, 1.6, s * 0.14, 0.12], [2.86, 1.78, s * 0.22, 0.1], [2.91, 1.88, s * 0.27, 0.085]], { segs: 10, tile: 1.1, capB: 1 }), 'head']),
    });
  }

  // ---------- elephants of the ice age ----------
  // Woolly mammoth: 3.0 m at the shoulder hump, domed head higher still, back sloping to 2.3 m at the rump, small ears, tusks ~3 m curling up and in.
  // American mastodon: 2.6 m, longer and lower with a level back, a low flat skull and gently curved 2.5 m tusks.
  const elephant = ({ C, sh, rump, crown, len, tusk, shag, earR }) => {
    const hair = [0.7, 0.62, 0.55], k = sh / 3, X = (x) => x * len;
    const top = (x) => (x > 0.3 ? sh - (x - 1) ** 2 * 0.45 * k : rump + (sh - 0.2 * k - rump) * ((x + 1.5) / 1.8) ** 0.8);   // the line of the back
    const st = (x, w, up, down) => { const t = top(x), bot = 1.2 * k + Math.abs(x - 0.2) * 0.04; return [X(x), bot + (t - bot) * (down / (up + down)), 0, (t - bot) * (up / (up + down)), (t - bot) * (down / (up + down)), w * k]; };
    return quadruped({
      color: C, tex: shag ? SHAG : WRINKLE, tile: shag ? 1.3 : 1.2, rough: 1, back: 0.9, belly: 1.05, gait: { duty: 0.68, stride: 1.15 * k, bob: 0.02 }, wag: 0.1, nod: 0.015, headRef: [1, 0, 0],
      body: [0, 2 * k], tailJ: [[X(-1.55), rump - 0.25], [X(-1.68), rump - 0.8], [X(-1.72), rump - 1.3]], neckJ: [[X(1.35), sh - 0.5], [X(1.7), sh - 0.35]], nose: [X(2.15), 2.2 * k],
      torso: [[X(-1.55), rump - 0.45, 0, 0.32 * k, 0.45 * k, 0.4 * k], st(-1.3, 0.68, 1, 1.1), st(-0.7, 0.82, 1, 1.1), st(0, 0.88, 1, 1.15), st(0.6, 0.86, 1, 1.1), st(1.0, 0.76, 1, 1.05), st(1.35, 0.6, 1, 1.1), [X(1.6), 2.2 * k, 0, 0.4 * k, 0.5 * k, 0.42 * k]],
      neck: [[X(1.3), sh - 0.55, 0, 0.55 * k, 0.65 * k, 0.5 * k], [X(1.7), sh - 0.4, 0, 0.5 * k, 0.55 * k, 0.46 * k]],
      head: [[X(1.72), crown - 0.05, 0, 0.26 * k, 0.3 * k, 0.3 * k], [X(1.78) + 0.04, crown - 0.3 * k, 0, 0.42 * k, 0.45 * k, 0.43 * k], [X(1.9) + 0.05, crown - 0.65 * k, 0, 0.4 * k, 0.45 * k, 0.42 * k], [X(2.02) + 0.06, 2.42 * k, 0, 0.32 * k, 0.36 * k, 0.33 * k], [X(2.1) + 0.06, 2.15 * k, 0, 0.25 * k, 0.26 * k, 0.24 * k]],
      tail: [[X(-1.53), rump - 0.22, 0, 0.07], [X(-1.68), rump - 0.8, 0, 0.05], [X(-1.72), rump - 1.25, 0, 0.07], [X(-1.72), rump - 1.45, 0, 0.02]], tailTint: hair,
      eye: [X(1.98) + 0.07, crown - 0.62 * k, 0.37 * k, 0.035],
      fore: { z: 0.5 * k, J: [[X(1.1), 2.0 * k], [X(1.1) - 0.15 * k, 1.45 * k], [X(1.1) - 0.1 * k, 0.55 * k], [X(1.1) - 0.1 * k, 0.24 * k]], toe: [X(1.1) + 0.17 * k, 0], foot: ['pillar', 0.27 * k], top: [0, 0.3 * k, -0.18 * k, 0.34 * k, 0.38 * k, 0.22 * k], swap: shag,
        R: [[0.36 * k, 0.4 * k, 0.3 * k], [0.26 * k, 0.3 * k, 0.24 * k], [0.22 * k, 0.22 * k, 0.21 * k], [0.24 * k, 0.24 * k, 0.24 * k]], M: [null, null, null], cap: 0.2, lift: 0.2, fold: 0.6, toeOff: 0.3, curl: 0.35, reach: -0.1 * k },
      hind: { z: 0.5 * k, mode: 'lock', J: [[X(-1.05), 1.75 * k], [X(-1.05) + 0.15 * k, 1.1 * k], [X(-1.05) - 0.05 * k, 0.45 * k], [X(-1.05) - 0.03 * k, 0.24 * k]], toe: [X(-1.05) + 0.22 * k, 0], foot: ['pillar', 0.26 * k], top: [0, 0.3 * k, -0.18 * k, 0.38 * k, 0.42 * k, 0.24 * k], swap: shag,
        R: [[0.42 * k, 0.46 * k, 0.32 * k], [0.3 * k, 0.3 * k, 0.25 * k], [0.22 * k, 0.23 * k, 0.21 * k], [0.24 * k, 0.24 * k, 0.24 * k]], M: [[0.5, 0.36 * k, 0.4 * k, 0.29 * k], null, null], cap: 0.2, lift: 0.18, fold: 0.35, toeOff: 0.3, curl: 0.3, reach: -0.13 * k },
      coat: (x, y, z, ny) => 1 - Math.max(0, ny) * 0.12 - (y < 0.5 * k ? 0.15 : 0),
      extra: (b) => {
        const trunk = b.run('trunk', 'head', [[X(2.12) + 0.06, 2.1 * k], [X(2.2) + 0.06, 1.65 * k], [X(2.25) + 0.06, 1.2 * k], [X(2.28) + 0.06, 0.8 * k], [X(2.36) + 0.06, 0.48 * k], [X(2.55) + 0.06, 0.4 * k]]);
        b.skin(loft([[X(2.07) + 0.06, 2.3 * k, 0, 0.23 * k], [X(2.14) + 0.06, 2.0 * k, 0, 0.2 * k], [X(2.2) + 0.06, 1.65 * k, 0, 0.17 * k], [X(2.25) + 0.06, 1.2 * k, 0, 0.14 * k], [X(2.28) + 0.06, 0.8 * k, 0, 0.115 * k], [X(2.36) + 0.06, 0.5 * k, 0, 0.095 * k], [X(2.52) + 0.06, 0.4 * k, 0, 0.075 * k]], { segs: 12, tile: 0.9, ref: [1, 0, 0], capB: 0.6 }), b.path(['head', ...trunk], 0.5), [0.85, 0.85, 0.85]);
        b.wave(trunk, 'z', 0.1, { kt: 0.8, lag: 0.6, grow: true }).wave(trunk, 'y', 0.07, { kt: 0.55, lag: 0.5, grow: true });
        b.pair('detail', (s) => [loft(tusk.map(([x, y, z, r]) => [X(2.05) + 0.06 + x * k, y * k, s * z * k, r * k]), { segs: 9, sub: 6, capB: 2 }), 'head', IVORY]);
        b.pair('skin', (s) => [put(slab([[0, 0], [-0.9, -0.5], [-1, -1.3], [-0.3, -1.9], [0.4, -1.5], [0.5, -0.5]].map((p) => [p[0] * earR, p[1] * earR]), 0.05, 1), X(1.62), crown - 0.5 * k, s * 0.42 * k, 0, s * 0.35, 0), 'head', [0.9, 0.9, 0.9]]);
        if (!shag) return;
        const lock = (x, y, z, h, r) => b.skin(cone(r, h, x, y, z, Math.PI + (Math.sin(x * 7 + z * 5) * 0.12), 0, 0.5, 6), 'body', hair);   // long guard hair hanging below the belly and flanks
        for (let x = -1.45; x < 1.5; x += 0.1) for (const z of [-0.78, -0.45, -0.1, 0.25, 0.6]) {
          const zz = (z + Math.sin(x * 11) * 0.08) * k, w = 1 - (zz / (0.9 * k)) ** 2;
          lock(X(x) + Math.sin(z * 9) * 0.04, 1.2 * k + (1 - w) * 0.45 + 0.12, zz, (0.5 + 0.2 * Math.sin(x * 13 + z * 4)) * k, 0.13 * k);
        }
        for (const s of [1, -1]) for (let i = 0; i < 9; i++) b.skin(cone(0.12 * k, 0.5 * k, X(1.95) + 0.05 + (i % 3) * 0.06, 2.35 * k - (i % 2) * 0.1, s * (0.08 + i * 0.035) * k, Math.PI, 0, 0.5, 6), 'head', hair);   // beard under the jaw
        b.skin(mass(X(1.72), crown + 0.02, 0, 0.3 * k, 0.16 * k, 0.26 * k), 'head', hair);   // topknot
      },
    });
  };
  M.mammoth = elephant({ C: 0x5e3c22, sh: 3.0, rump: 2.3, crown: 3.4, len: 1, shag: true, earR: 0.22,
    tusk: [[0.05, 2.3, 0.2, 0.1], [0.4, 1.6, 0.42, 0.098], [0.95, 1.12, 0.62, 0.09], [1.55, 1.3, 0.62, 0.075], [1.85, 1.85, 0.4, 0.05], [1.75, 2.3, 0.15, 0.015]] });
  M.mastodon = elephant({ C: 0x54402e, sh: 2.6, rump: 2.45, crown: 2.75, len: 1.18, shag: false, earR: 0.3,
    tusk: [[0.05, 2.3, 0.2, 0.1], [0.5, 1.9, 0.36, 0.098], [1.2, 1.7, 0.5, 0.085], [1.9, 1.85, 0.52, 0.06], [2.4, 2.2, 0.42, 0.015]] });
}
