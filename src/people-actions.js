// What people do: each action poses the body (see Pose in people-rig.js) for a moment of its cycle.
import { HIP, ANKLE } from './people-body.js?v=c0a40a57';
import { HOLD } from './people-props.js?v=c0a40a57';

const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const fract = (v) => v - Math.floor(v), mix = (a, b, t) => a + (b - a) * t, ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** A working blow through one cycle f = 0..1: 1 = raised, 0 = struck. The tool rises slowly, falls fast and rests where it lands. */
const blow = (f, up = 0.58, hit = 0.72) => (f < up ? ss(0, up, f) : f < hit ? 1 - ((f - up) / (hit - up)) ** 2 : 0);
/** There and back, smoothly: 0 → 1 → 0 over one cycle. */
const wave = (f) => 0.5 - 0.5 * cos(TAU * f);

// ---- stances shared between actions ----
/** Feet apart, one ahead of the other: `fwd` is how far the left foot leads. */
const stance = (P, y, lean, fwd = 0, wide = 0.11, bend = 0) => P.pelvis(0, y, 0, lean).back(bend).stand(0, -fwd * 0.5, wide).stand(1, fwd * 0.5, -wide);
/** Sitting cross-legged on the ground, or (seat > 0.2) on a stool with the feet flat. */
function seated(P, seat, lean = 0.05, bend = 0.1) {
  if (seat > 0.2) { P.pelvis(0, seat + 0.1, 0, lean).back(bend); for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; P.stand(i, 0.4, s * 0.13, 1, 0.3, s * 0.2).reach(i, 0.3, seat + 0.21, s * 0.15); } return P; }
  P.pelvis(-0.05, 0.11 + seat, 0, lean).back(bend);
  for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; P.loose(i, 0.38 - i * 0.1, 0.085 + seat, s * 0.03, -0.5, 0.3, 0.2, s).reach(i, 0.26, 0.3 + seat, s * 0.3); }
  return P;
}
/** Sitting on the ground with the knees up and apart, something between the feet. */
function astride(P, seat, lean, bend) {
  P.pelvis(-0.08, 0.11 + seat, 0, lean).back(bend);
  for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; P.stand(i, 0.36, s * 0.3, 0.6, 0.6, s * 0.7); P.foot[i].p.y += seat; }
  return P;
}
/** Squatting on flat feet. */
const squat = (P, lean = 0.45, bend = 0.35) => P.pelvis(-0.14, 0.33, 0, lean).back(bend).stand(0, 0.02, 0.15, 1, 0, 0.45).stand(1, 0.02, -0.15, 1, 0, -0.45);
/** Kneeling: up = 0 sitting back on the heels, 1 upright on the knees. */
function kneeling(P, up, lean, bend = 0) {
  P.pelvis(mix(-0.12, 0.14, up), mix(0.33, 0.49, up), 0, lean).back(bend);
  for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; P.loose(i, -0.21, 0.06, s * 0.11, -1.3, 1, -0.5, 0).reach(i, 0.1, mix(0.32, 0.5, up), s * 0.14); }
  return P;
}
/** Carrying something in the working hand at the side of the chest (a staff, a torch, an umbrella). */
const carried = (P, w) => (w.tool ? P.reach(0, 0.3, w.prop === 'umbrella' ? 1.2 : 1.08, 0.22) : P);
/** A two-handed swing in the vertical plane ahead: the shaft points at angle a (0 = forward, pi/2 = up), its edge leading the swing. */
const swung = (P, a, x, y, z, gap) => P.grip(0, x, y, z, cos(a), sin(a), 0, gap, sin(a), -cos(a), 0);
const soldier = (P) => P.reach(1, 0.24, 1.08, 0.1, -0.3, -0.5, 1);   // shield arm across the front
const idle = (P, c) => P.pelvis(0, HIP - 0.006, 0.012 * sin(c * 0.5), 0.01).face(0, 0.25 * sin(c * 0.23));

/**
 * name → { pose(P, c, w), prop, walk?, left?, seat? }. c is the actor's own clock in seconds; w = { ph (strides walked), stride, seat, tool, prop }.
 * walk: the action travels along a path (its value scales the stride). left: the tool is in the left hand.
 */
const A = {
  stand: { pose: (P, c, w) => carried(idle(P, c), w) },
  talk: { pose: (P, c) => idle(P, c).reach(0, 0.36, 1.12 + 0.1 * sin(c * 2.2), 0.2 + 0.08 * sin(c * 1.3)).swing(1, 0.25, 0.08, 0, 1.1 + 0.2 * sin(c * 0.9)).face(0.05 * sin(c * 3), 0.2 * sin(c * 0.4)) },
  point: { pose: (P, c, w) => { idle(P, c).reach(0, 0.58, 1.46 + 0.03 * sin(c), 0.24).reach(1, 0.02, 1.02, -0.2, -0.8, 0, 1); if (w.tool) P.reach(0, 0.5, 1.22, 0.24).aim(0.3, 0.95, 0); } },
  walk: { walk: 1, pose: (P, c, w) => carried(P.gait(w.ph, w.stride), w) },
  sit: { pose: (P, c, w) => seated(P, w.seat, 0.03, 0.1 + 0.02 * sin(c * 0.8)).face(0.05, 0.3 * sin(c * 0.2)) },
  crouch: { pose: (P, c) => { squat(P).face(0.3); for (let i = 0; i < 2; i++) P.reach(i, 0.42 + 0.06 * sin(c * 2.6 + i * 2), 0.17 + 0.05 * sin(c * 1.7 + i), (i ? -1 : 1) * 0.1); } },
  kneel: { pose: (P, c) => kneeling(P, 0, 0.05, 0.05 + 0.02 * sin(c * 0.8)) },
  // curled up on the right side, head towards the actor's +z
  sleep: { pose: (P, c) => {
    P.pelvis(0, 0.165, 0, 0, 0, Math.PI / 2).back(0.3 + 0.02 * sin(c * 1.2)).face(0.25).swing(0, 1.7, 0, 0, 2.1).swing(1, 0.7, 0, 0, 1.2);
    P.loose(0, 0.02, 0.075, -0.44, -0.3).loose(1, 0.12, 0.2, -0.4, -0.3);
  } },
  // flat on the back, head towards the actor's -x
  lie: { pose: (P, c) => P.pelvis(0, 0.11, 0, -Math.PI / 2).back(0.02 * sin(c)).swing(0, 0, 0.18, 0, 0.3).reach(1, -0.14, 0.27, -0.03).loose(0, 0.83, 0.075, 0.1, 0.25).loose(1, 0.52, 0.085, -0.1, -0.5) },

  // ---- farming ----
  hoe: { prop: 'hoe', pose: (P, c) => { const r = blow(fract(c * 0.5)); stance(P, 0.82 + 0.06 * r, 0.5 - 0.35 * r, 0.36, 0.11, 0.45 - 0.35 * r).face(0.2); swung(P, mix(-0.9, 2, r), mix(0.5, 0.18, r), mix(0.6, 1.56, r), 0.1, -0.45); } },
  dig: { prop: 'stick', pose: (P, c) => { const r = blow(fract(c * 0.45), 0.5, 0.65), l = ss(0.7, 0.95, fract(c * 0.45)); stance(P, 0.86, 0.3 - 0.15 * r, 0.2, 0.13, 0.3 - 0.15 * r).face(0.4); swung(P, -1.4 + 0.3 * l * (1 - l) * 4, 0.42 + 0.06 * l, mix(0.84, 1.12, r), 0.06, -0.3); } },
  sow: { prop: 'seedbag', walk: 0.85, pose: (P, c, w) => { const a = wave(w.ph); P.gait(w.ph, w.stride).reach(1, 0.15, 1.04, -0.13).reach(0, 0.2 + 0.32 * a, 1.04 + 0.06 * a, -0.02 + 0.55 * a).face(0.1, -0.3 * a); } },
  reap: { prop: 'sickle', pose: (P, c) => {
    const f = fract(c * 0.6), a = ss(0.1, 0.6, f) * (1 - ss(0.75, 1, f));
    stance(P, 0.84, 0.75, 0.1, 0.16, 0.5).face(-0.1).reach(1, 0.62, 0.52, -0.08).reach(0, mix(0.5, 0.56, a), 0.5, mix(0.4, 0.04, a)).aim(mix(0.9, 0.6, a), 0, mix(0.4, -0.8, a), 0, 0, -1);
  } },
  thresh: { prop: 'flail', pose: (P, c) => { const r = blow(fract(c * 0.55)); stance(P, 0.88, 0.3 - 0.22 * r, 0.25, 0.12, 0.2 - 0.15 * r); swung(P, mix(-0.2, 2.3, r), mix(0.42, 0.08, r), mix(0.98, 1.52, r), 0.12, -0.4); } },
  grind: { prop: 'quern', pose: (P, c) => { const a = wave(c * 0.8); kneeling(P, 0.35 * a, 0.35 + 0.5 * a, 0.2).face(0.35); for (let i = 0; i < 2; i++) P.reach(i, 0.4 + 0.28 * a, 0.2, i ? -0.09 : 0.09); } },
  plough: { prop: 'ard', walk: 0.7, pose: (P, c, w) => P.gait(w.ph, w.stride, 0.03, 0.2).reach(0, 0.24, 0.97, 0.15).reach(1, 0.24, 0.97, -0.15).face(0.15) },

  // ---- carrying ----
  carry: { prop: 'basket', walk: 0.9, pose: (P, c, w) => { P.gait(w.ph, w.stride).back(0, 0); const h = HOLD[w.prop]; if (h) P.reach(0, h[0], h[1], h[2], -0.1, -0.7, 0.7); } },
  haul: { prop: 'rope', walk: 0.6, pose: (P, c, w) => P.gait(w.ph, w.stride, 0.1, 0.55).back(0.15).face(-0.3).reach(0, 0.42, 1.2, 0.12).reach(1, 0.52, 1.12, 0.03) },
  push: { walk: 0.7, pose: (P, c, w) => P.gait(w.ph, w.stride, 0.06, 0.4).face(-0.25).reach(0, 0.62, 1.02, 0.2).reach(1, 0.62, 1.02, -0.2) },
  'fetch-water': { prop: 'bucket', walk: 0.9, pose: (P, c, w) => {
    if (w.moving) return P.gait(w.ph, w.stride).reach(0, 0.04, 0.84, 0.27);
    const a = wave(c * 0.22); stance(P, 0.9 - 0.08 * a, 0.1 + 0.6 * a, 0.2, 0.14, 0.45 * a).face(0.3 * a).reach(0, 0.3 + 0.26 * a, mix(0.95, 0.56, a), 0.18).reach(1, 0.2 + 0.1 * a, mix(0.8, 0.6, a), -0.2);
  } },

  // ---- crafts ----
  knap: { prop: 'hammerstone', pose: (P, c) => { const r = blow(fract(c * 1.1), 0.5, 0.7); seated(P, 0, 0.1, 0.3).face(0.45).reach(1, 0.3, 0.33, -0.12).reach(0, 0.3, 0.4 + 0.24 * r, -0.05 + 0.12 * r); } },
  hammer: { prop: 'hammer+anvil', pose: (P, c) => { const r = blow(fract(c * 0.75)); stance(P, 0.88, 0.22 - 0.14 * r, 0.24, 0.12, 0.25 - 0.2 * r).face(0.3).reach(1, 0.4, 0.82, -0.12).grip(0, mix(0.32, 0.1, r), mix(0.9, 1.74, r), mix(0.1, 0.2, r), cos(mix(-0.3, 1.8, r)), sin(mix(-0.3, 1.8, r)), 0, 0); } },
  chisel: { prop: 'mallet+chisel+block', pose: (P, c) => { const r = blow(fract(c * 1.3), 0.5, 0.7); stance(P, 0.9, 0.12, 0.2, 0.12, 0.12).face(0.35).reach(1, 0.5, 0.96, -0.02).grip(0, mix(0.3, 0.22, r), mix(1.02, 1.3, r), 0.06, cos(mix(0.2, 1.5, r)), sin(mix(0.2, 1.5, r)), 0, 0); } },
  saw: { prop: 'saw+log', pose: (P, c) => { const a = wave(c * 1.1); stance(P, 0.86, 0.32, 0.3, 0.13, 0.25).face(0.35).reach(1, 0.44, 0.75, -0.24).reach(0, 0.1 + 0.3 * a, 0.86, 0.1).aim(1, -0.16, 0, 0, -1, 0); } },
  potter: { prop: 'wheel', seat: 0.25, pose: (P, c, w) => {
    const a = wave(c * 0.3); P.pelvis(-0.05, w.seat + 0.1, 0, 0.3).back(0.4).face(0.4);
    for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; P.stand(i, 0.32, s * 0.34, 1, 0.2, s * 0.9).reach(i, 0.45, 0.5 + 0.1 * a, s * 0.1); }
  } },
  weave: { prop: 'loom', pose: (P, c) => { const f = fract(c * 0.4), z = cos(TAU * f), up = ss(0.8, 0.9, f) * (1 - ss(0.9, 1, f)); idle(P, c).face(-0.05, -0.2 * z).reach(0, 0.5, 1.2 + 0.25 * up, 0.14 + 0.2 * z).reach(1, 0.5, 1.2 + 0.25 * up, -0.14 + 0.2 * z); } },
  spin: { prop: 'spindle', pose: (P, c) => idle(P, c).face(0.2, -0.2).reach(1, 0.24, 1.3, -0.24).reach(0, 0.3, 1.12 + 0.12 * wave(c * 0.35), 0.2 + 0.02 * sin(c * 9)) },
  write: { prop: 'tablet', pose: (P, c) => seated(P, 0, 0.12, 0.32).face(0.5).reach(1, 0.33, 0.3, -0.07).reach(0, 0.34 + 0.015 * sin(c * 6), 0.38, -0.02 + 0.05 * sin(c * 1.2)).aim(0.3, 0.9, 0.3) },
  paint: { prop: 'brush', pose: (P, c) => idle(P, c).face(-0.3).reach(1, 0.3, 1.12, -0.2).reach(0, 0.54, 1.62 + 0.16 * sin(c * 1.4), 0.12 + 0.1 * sin(c * 0.9)).aim(0.95, 0.3, 0) },
  cook: { prop: 'hearth', pose: (P, c) => squat(P, 0.4, 0.3).face(0.3).reach(1, 0.24, 0.5, -0.2).reach(0, 0.56 + 0.05 * cos(c * 2.4), 0.62, 0.04 + 0.05 * sin(c * 2.4)).aim(0.1, -1, 0) },

  // ---- hunting and war ----
  spear: { prop: 'spear', pose: (P, c) => {
    const f = fract(c * 0.4), r = f < 0.55 ? ss(0, 0.55, f) : 1 - ss(0.55, 0.68, f);   // 1 = drawn back
    P.pelvis(mix(0.1, -0.06, r), 0.87, 0, 0.1 - 0.12 * r, -0.5 - 0.25 * r).back(0, 0.35 - 0.5 * r).face(-0.05, 0.5 + 0.3 * r).stand(1, 0.3, -0.1).stand(0, -0.28, 0.14);
    P.reach(0, mix(0.62, -0.22, r), mix(1.46, 1.64, r), mix(0.1, 0.22, r), -0.6, 0.2, 0.8).aim(1, mix(-0.12, 0.08, r), 0).reach(1, mix(0.2, 0.52, r), mix(1.1, 1.32, r), -0.26);
  } },
  bow: { prop: 'bow', left: 1, pose: (P, c) => {
    const f = fract(c * 0.22), k = (a, b) => ss(a, b, f);
    P.pelvis(0, 0.9, 0, 0, -1.25).face(0, 1.1).stand(1, 0.22, 0).stand(0, -0.22, 0.03).reach(1, 0.7, 1.46, -0.03);
    // quiver → nock → draw → hold → loose
    const x = mix(mix(mix(-0.22, 0.5, k(0.08, 0.22)), 0.1, k(0.3, 0.55)), 0, k(0.78, 0.8)), y = mix(1.62, 1.47, k(0.08, 0.22)) + 0.03 * k(0.3, 0.55);
    P.reach(0, mix(x, -0.22, k(0.9, 1)), mix(y, 1.62, k(0.9, 1)), 0, -0.3, 0.2, 0.95);
  } },
  stalk: { prop: 'spear', walk: 0.6, pose: (P, c, w) => P.gait(w.ph, w.stride, 0.2, 0.45).back(0.2).face(-0.45, 0.2 * sin(c * 0.5)).reach(0, 0.22, 0.78, 0.25).aim(1, 0.06, 0).reach(1, 0.45, 0.86, -0.2) },
  guard: { prop: 'spear+shield', pose: (P, c) => soldier(idle(P, c)).reach(0, 0.14, 0.93, 0.3).face(0, 0.5 * sin(c * 0.3)) },
  march: { prop: 'spear+shield', walk: 1, pose: (P, c, w) => soldier(P.gait(w.ph, w.stride, 0, 0.02)).reach(0, 0.18, 0.98, 0.25).aim(-0.2, 0.98, 0) },
  patrol: { prop: 'spear', walk: 0.9, pose: (P, c, w) => P.gait(w.ph, w.stride).reach(0, 0.2, 1, 0.25).aim(-0.2, 0.98, 0).face(0, 0.6 * sin(c * 0.4)) },
  herd: { prop: 'staff', walk: 0.85, pose: (P, c, w) => P.gait(w.ph, w.stride).reach(0, 0.3, 1.06, 0.26).aim(0.18 * cos(TAU * w.ph), 1, 0).face(0, 0.4 * sin(c * 0.3)) },
  fight: { prop: 'sword+shield', pose: (P, c) => { const r = blow(fract(c * 0.7)), a = mix(-0.1, 1.9, r); soldier(stance(P, 0.86, 0.15 - 0.1 * r, 0.4, 0.13).back(0, 0.3 - 0.5 * r)).reach(0, mix(0.5, 0, r), mix(1.15, 1.66, r), mix(0.15, 0.3, r)).aim(cos(a), sin(a), 0, sin(a), -cos(a), 0); } },

  // ---- water ----
  row: { prop: 'oar', seat: 0.3, pose: (P, c, w) => {
    const a = wave(c * 0.4), y = w.seat, x = 0.6 - 0.45 * a, h = y + 0.42 + 0.1 * a;
    P.pelvis(0, y + 0.1, 0, 0.5 - 0.75 * a).back(0.1).stand(0, 0.55, 0.12).stand(1, 0.55, -0.12).face(-0.2 + 0.3 * a).grip(0, x, h, 0.17, 0.2 - x, y + 0.36 - h, 0.6, -0.32, 0, 1, 0);
  } },
  paddle: { prop: 'paddle', seat: 0.2, pose: (P, c, w) => {
    const f = fract(c * 0.5), a = f < 0.6 ? f / 0.6 : 1 - (f - 0.6) / 0.4, lift = f < 0.6 ? 0 : sin((f - 0.6) / 0.4 * Math.PI) * 0.2, y = w.seat, tx = 0.3 - 0.1 * a, ty = y + 0.95, gx = 0.6 - 0.6 * a, gy = y + 0.5 + lift;
    seated(P, y, 0.25 - 0.2 * a, 0.15).back(0.15, -0.2).grip(0, gx, gy, 0.36, gx - tx, gy - ty, 0.22, -0.5, 1, 0, 0);
  } },
  fish: { prop: 'fishspear', pose: (P, c) => { const f = fract(c * 0.2), r = 1 - ss(0.8, 0.86, f) * (1 - ss(0.9, 1, f)); stance(P, 0.86, 0.3 - 0.05 * r, 0.3, 0.14, 0.3 - 0.1 * r).face(0.45).grip(0, mix(0.4, 0.02, r), mix(1.12, 1.62, r), 0.2, 0.72, -0.7, -0.05, 0.55); } },

  // ---- ritual and social ----
  pray: { pose: (P, c) => { idle(P, c).face(-0.25); for (let i = 0; i < 2; i++) P.reach(i, 0.2, 1.72 + 0.03 * sin(c * 0.6), i ? -0.42 : 0.42, -0.2, -0.9, 0.5); } },
  'bow-down': { pose: (P, c) => { const a = ss(0.25, 0.75, wave(c * 0.12)); kneeling(P, 0.25 * (1 - a), 0.15 + 1.15 * a, 0.6 * a).face(0.3 * a - 0.1); for (let i = 0; i < 2; i++) P.reach(i, mix(0.28, 0.72, a), mix(1.22, 0.05, a), i ? -0.2 : 0.2, -0.2, -0.9, 0.4); } },
  dance: { pose: (P, c) => {
    const f = c * 1.1, b = sin(Math.PI * f);
    P.pelvis(0, 0.89 + 0.03 * Math.abs(b), 0.05 * b, 0.02, 0.25 * b).back(0, -0.3 * b, 0.08 * b).face(-0.1, 0.2 * b);
    for (let i = 0; i < 2; i++) { const s = i ? -1 : 1, up = Math.max(0, s * b); P.step(i, 0.03 + 0.12 * up, ANKLE + 0.13 * up, s * 0.14, -0.4 * up).reach(i, 0.2, 1.48 + 0.26 * s * b, 0.4, -0.2, -0.9, 0.4); }
  } },
  drum: { prop: 'drum', pose: (P, c) => { astride(P, 0, 0.15, 0.25).face(0.2, 0.15 * sin(c)); for (let i = 0; i < 2; i++) P.reach(i, 0.34, 0.48 + 0.15 * Math.max(0, sin(c * 9 + i * Math.PI)), i ? -0.08 : 0.08); } },
  trade: { prop: 'bowl', pose: (P, c) => { const a = wave(c * 0.25); idle(P, c).pelvis(0, HIP - 0.01, 0, 0.08 * a).face(0.1, 0).reach(0, 0.3 + 0.28 * a, 1.08 + 0.06 * a, 0.12).reach(1, 0.26, 1, -0.2); } },
  // astride a mount: the actor's y is the height of its back
  ride: { pose: (P, c) => { P.pelvis(0, 0.1 + 0.02 * sin(c * 4), 0, -0.03).back(0.06); for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; P.loose(i, 0.12, -0.6, s * 0.33, 0.1, 1, 0, s * 0.9).reach(i, 0.38, 0.47 + 0.02 * sin(c * 4), s * 0.08); } } },
};
for (const [name, of, prop] of [['carry2', 'carry', 'yoke'], ['scrape', 'grind', 'hide'], ['tend-fire', 'cook']]) A[name] = { ...A[of], prop: prop || A[of].prop };
export const ACTION = A;
