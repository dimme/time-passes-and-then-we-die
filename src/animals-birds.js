// Birds on the wing: crow, gull and hawk from one plan with different proportions.
import { Rig, loft, mass, strip, fan, mirror, hide, hex } from './animals-rig.js';

const clamp = (v) => Math.max(0, Math.min(1, v));
let FEATHER, VANE;
/** One flat feather from `b` pointing along the unit direction d = [dx, dz], l long and w wide, lying at height y. */
function feather(b, d, l, w, y, tile) {
  const n = [-d[1], d[0]], P = (a, s, dy = 0) => [b[0] + d[0] * a + n[0] * s, y + dy, b[1] + d[1] * a + n[1] * s];
  return fan([P(0, w * 0.3), P(l * 0.55, w * 0.5), P(l * 0.9, w * 0.36, -l * 0.02), P(l, 0, -l * 0.03), P(l * 0.9, -w * 0.36, -l * 0.02), P(l * 0.55, -w * 0.5), P(0, -w * 0.3)], tile, d);
}

/**
 * B = body length without bill and tail, R = body radius, hs = half wingspan, c = wing chord at the root, wf = where the wrist is along the wing,
 * back / taper / tipC shape the hand (swept and pointed, or broad), slots = how far the outer primaries separate into fingers,
 * tail = [length, half-angle of the fan], bill = [length, depth, hook], tint(kind, t, q) → colour multiplier for wing ('p', 's', 'c') and tail ('t') feathers.
 */
function bird({ B, R, hs, c, wf, back, taper, tipC, slots, tail, bill, billC, color, wingColor, coat, tint, flight }) {
  const b = new Rig(), T = 0.12, S = [0.1 * B, 0.3 * R, 0.8 * R];
  b.bone('body', null, 0, 0, 0);
  b.bone('head', 'body', 0.3 * B, 0.02 * B, 0, [0.55 * B, 0.03 * B, 0]);
  b.skin(loft([[-0.5 * B, 0, 0, R * 0.3], [-0.3 * B, 0, 0, R * 0.8, R * 0.85, R * 0.85], [-0.05 * B, -0.01, 0, R, R * 1.15, R * 1.05], [0.15 * B, 0, 0, R * 0.95, R * 1.05, R], [0.3 * B, 0.02 * B, 0, R * 0.66, R * 0.7, R * 0.66], [0.42 * B, 0.04 * B, 0, R * 0.64], [0.5 * B, 0.04 * B, 0, R * 0.5]], { segs: 12, tile: T, capA: 1, capB: 0.9 }), b.path(['body', 'head'], 0.6));
  const bx = 0.5 * B + R * 0.3, by = 0.035 * B;
  b.detail(loft([[bx, by, 0, bill[1], bill[1] * 0.9, bill[1] * 0.8], [bx + bill[0] * 0.55, by - bill[0] * 0.05 * bill[2], 0, bill[1] * 0.75, bill[1] * 0.7, bill[1] * 0.55], [bx + bill[0], by - bill[0] * 0.3 * bill[2], 0, 0.002]], { segs: 8, sub: 4 }), 'head', billC);
  b.pair('detail', (s) => [mass(0.44 * B, 0.07 * B, s * R * 0.5, R * 0.13, R * 0.13, R * 0.08), 'head', [0.01, 0.01, 0.01]]);
  // tail: a fan of feathers, each a little lower than the one inside it so they overlap like a hand of cards
  for (let j = -4; j <= 4; j++) { const an = (j / 4) * tail[1]; b.wing(feather([-0.42 * B, 0], [-Math.cos(an), Math.sin(an)], tail[0] * (1 - 0.1 * (j / 4) ** 2), tail[0] * tail[1] * 0.36 + 0.012, -0.004 - Math.abs(j) * 0.0015, T), 'body', tint('t', j / 4, 0)); }
  // wing planform along the span u = 0…1: leading edge runs forward to the wrist, then sweeps back to the tip
  const le = (u) => S[0] + c * 0.45 + hs * (u < wf ? 0.07 * (u / wf) : 0.07 - back * ((u - wf) / (1 - wf)) ** 1.3), chord = (u) => c * (u < wf ? 1 : 1 - (1 - tipC) * ((u - wf) / (1 - wf)) ** taper), Z = (u) => S[2] + u * (hs - S[2]);
  const N = 20, tw = 0.5, lead = [], trail = [], hand = 0.8;
  for (let i = 0; i <= 12; i++) { const u = (i / 12) * hand; lead.push([le(u), S[1], Z(u)]); trail.push([le(u) - chord(u) * 0.55, S[1] - 0.003, Z(u)]); }
  for (const s of [1, -1]) {
    const n = s > 0 ? 'wl' : 'wr', side = (g) => (s > 0 ? g : mirror(g));
    b.bone(n + '0', 'body', S[0], S[1], s * S[2]); b.bone(n + '1', n + '0', le(wf) - 0.02, S[1], s * Z(wf), [le(1), S[1], s * hs]);
    const path = b.path([n + '0', n + '1'], 0.5);
    b.skin(side(loft([0, wf * 0.5, wf, hand * 0.8, hand].map((u, i) => [le(u) - 0.012, S[1], Z(u), 0.011 - i * 0.0018, 0.011 - i * 0.0018, 0.022 - i * 0.003]), { segs: 8, sub: 3, tile: T, capB: 1 })), path);   // the arm inside the wing
    b.wing(side(strip(lead, trail, T)), path, tint('c', 0, 0));   // coverts
    for (let i = 0; i < N; i++) {   // secondaries point back; primaries swing round to point outwards at the tip
      const t = i / (N - 1), q = clamp((t - tw) / (1 - tw)), u = (q ? wf + (hand - wf) * q ** 0.9 : (t / tw) * wf * 0.98 + 0.02), an = 0.06 + 1.42 * q ** 1.25;
      const base = [le(u) - chord(u) * 0.4, Z(u)], tipU = q ? wf + (1 - wf) * q ** 0.75 : u, tip = [le(tipU) - chord(tipU) * (q ? 1 - 0.75 * q ** 2 : 1), Z(tipU) + (q ? 0 : chord(u) * 0.05)];
      const l = Math.hypot(tip[0] - base[0], tip[1] - base[1]), d = q ? [(tip[0] - base[0]) / l, (tip[1] - base[1]) / l] : [-Math.cos(an), Math.sin(an)];
      const w = q ? Math.min(c * 0.36, hs * 0.115) * (1 - slots * 0.55 * q) : (wf * (hs - S[2]) / (N * tw)) * 2.4;
      b.wing(side(feather(base, d, l, w, S[1] - 0.004 - i * 0.0006, T * 0.5)), q ? n + '1' : n + '0', tint(q ? 'p' : 's', t, q));
    }
    b.wings.push({ inner: b.ix[n + '0'], outer: b.ix[n + '1'], side: s });
  }
  b.sway('head', 'y', 0.25, { kt: 0.5 });
  return b.build({ color, wingColor, coat, tex: FEATHER, wingTex: VANE, rough: 0.7, back: 0.9, belly: 1.1, flight });
}

export function birds(M) {
  FEATHER = hide('feather', 7); VANE = hide('vane', 9);
  const ONE = [1, 1, 1];
  // American crow: 0.46 m long, 0.95 m span; broad wings with fingered tips, fan tail, all black
  M.crow = bird({ B: 0.28, R: 0.055, hs: 0.47, c: 0.17, wf: 0.4, back: 0.16, taper: 2.4, tipC: 0.5, slots: 0.7, tail: [0.19, 0.38], bill: [0.055, 0.015, 0.6], billC: hex(0x18181a), color: 0x1c1c22, wingColor: 0x1a1a20,
    tint: () => ONE, flight: { rate: 19, amp: 0.6, dihedral: 0.05, fold: 0.35, glide: 0.96, glideRate: 0.31 } });
  // Herring gull: 0.6 m long, 1.4 m span; long, narrow, pointed wings, grey above with black tips; white body and tail, yellow bill
  M.gull = bird({ B: 0.36, R: 0.07, hs: 0.7, c: 0.19, wf: 0.36, back: 0.26, taper: 1.9, tipC: 0.2, slots: 0, tail: [0.15, 0.3], bill: [0.06, 0.017, 0.8], billC: hex(0xd8a020), color: 0xe6e6e2, wingColor: 0x8e969e,
    tint: (k, t, q) => (k === 't' ? [2.6, 2.5, 2.4] : k === 'p' && q > 0.55 ? [0.08, 0.08, 0.09] : ONE), coat: (x, y, z, ny) => (ny > 0.3 && x < 0.08 && x > -0.14 ? [0.42, 0.45, 0.5] : 1),
    flight: { rate: 14, amp: 0.45, dihedral: 0.06, fold: 0.25, glide: 0.5, glideRate: 0.27 } });
  // Red-tailed hawk: 0.55 m long, 1.25 m span; broad soaring wings with five slotted primaries, wide rufous tail, hooked bill, pale underparts
  M.hawk = bird({ B: 0.33, R: 0.075, hs: 0.63, c: 0.25, wf: 0.42, back: 0.1, taper: 3, tipC: 0.6, slots: 0.9, tail: [0.21, 0.5], bill: [0.035, 0.017, 2.2], billC: hex(0x30302c), color: 0x6e5034, wingColor: 0x5e442c,
    tint: (k, t, q) => (k === 't' ? [2.4, 0.9, 0.5] : k === 'p' && q > 0.6 ? [0.35, 0.35, 0.35] : k === 'c' ? [1.15, 1.1, 1] : [1 - 0.25 * (Math.round(t * 19) % 2), 1 - 0.25 * (Math.round(t * 19) % 2), 1 - 0.25 * (Math.round(t * 19) % 2)]),
    coat: (x, y, z, ny) => (ny < -0.1 ? [2.6, 2.3, 1.9] : 1), flight: { rate: 15, amp: 0.5, dihedral: 0.14, fold: 0.3, glide: -0.3, glideRate: 0.21 } });
}
