// Animals: every species, and the herd that wanders the island. Models live in animals-*.js, the rig in animals-rig.js.
import { rng } from './util.js';
import { yearToU } from './timeline.js';
import { animTime } from './organic.js';
import { TAU, pose } from './animals-rig.js';
import { mammals } from './animals-mammals.js';
import { dinosaurs } from './animals-dinos.js';
import { birds } from './animals-birds.js';
import { paleozoic } from './animals-paleozoic.js';

export { pose };

class Herd {
  constructor(world, scene) { this.world = world; this.scene = scene; this.list = []; this.r = rng(77); }
  /** n animals circling at radius R (m) and walking speed (m/s) between two years; `fly` is the cruising height of a flyer. */
  add(make, n, from, to, { R = [20, 70], speed = 1.5, fly = 0, scale = [0.9, 1.1] } = {}) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const a = make(), sc = scale[0] + r() * (scale[1] - scale[0]); a.obj.scale.setScalar(sc);
      const Rr = R[0] + r() * (R[1] - R[0]), v = speed * (0.8 + r() * 0.4), { duty, stride } = a.def.gait;
      // the gait turns exactly fast enough for a planted foot to stay where it is on the ground
      this.list.push({ ...a, cx: (r() * 2 - 1) * (215 - Rr), cz: (r() * 2 - 1) * 260, R: Rr, w: (v / Rr) * (r() < 0.5 ? -1 : 1), gait: (TAU * duty * v) / (stride * sc), half: a.def.half * sc, flap: a.def.flight && a.def.flight.rate * (0.85 + r() * 0.3), ph: r() * 6.28, u0: yearToU(from), u1: yearToU(to), fly: fly && fly * (0.6 + r() * 0.8), in: false });
    }
  }
  update(u, t) {
    animTime.value = t;
    const W = this.world;
    for (const a of this.list) {
      const vis = u >= a.u0 && u < a.u1;
      if (vis !== a.in) { a.in = vis; vis ? this.scene.add(a.obj) : this.scene.remove(a.obj); }
      if (!vis) continue;
      const ang = a.ph + t * a.w, c = Math.cos(ang), sn = Math.sin(ang), x = a.cx + c * a.R, z = a.cz + sn * a.R, s = Math.sign(a.w), dx = -sn * s, dz = c * s;
      a.obj.rotation.y = Math.atan2(-dz, dx);
      if (a.fly) { a.obj.position.set(x, a.fly + Math.sin(t * 0.4 + a.ph) * 4, z); a.obj.rotation.z = Math.cos(t * 0.4 + a.ph) * 0.08; a.obj.rotation.x = s * 0.3; }
      else {   // stand on the ground at the fore and hind feet, pitched to the slope
        const yf = W.surfaceAt(x + dx * a.half, z + dz * a.half), yb = W.surfaceAt(x - dx * a.half, z - dz * a.half);
        a.obj.position.set(x, (yf + yb) / 2, z); a.obj.rotation.z = Math.atan2(yf - yb, a.half * 2);
      }
      pose(a, t * a.gait + a.ph, t);
    }
  }
}

let MAKERS;
/** Factories for every species, built once: each returns { obj, … } facing +x with its feet at y = 0. */
export function species() {
  if (!MAKERS) { MAKERS = {}; paleozoic(MAKERS); dinosaurs(MAKERS); mammals(MAKERS); birds(MAKERS); }
  return MAKERS;
}

export function buildAnimals(world, scene) {
  const M = species(), herd = new Herd(world, scene);
  // dinosaurs
  herd.add(M.raptor, 7, -236e6, -66.02e6, { R: [15, 50], speed: 2.2, scale: [0.8, 1.15] });      // small early hunters
  herd.add(M.sauropod, 5, -190e6, -66.02e6, { R: [50, 120], speed: 1.3, scale: [0.8, 1.1] });
  herd.add(M.stego, 4, -160e6, -100e6, { R: [25, 60], speed: 1 });
  herd.add(M.theropod, 3, -160e6, -90e6, { R: [40, 90], speed: 2.4 });
  herd.add(M.tyrannosaur, 2, -90e6, -66.02e6, { R: [40, 90], speed: 2.4, scale: [0.9, 1.05] });
  herd.add(M.triceratops, 5, -100e6, -66.02e6, { R: [25, 70], speed: 1.2, scale: [0.85, 1.05] });
  herd.add(M.pterosaur, 7, -210e6, -66.02e6, { R: [40, 140], speed: 11, fly: 45, scale: [0.75, 1.15] });
  // mammals
  herd.add(M.small, 8, -62e6, -30e6, { R: [8, 30], speed: 1.5 });
  herd.add(M.bronto, 5, -45e6, -30e6, { R: [25, 70], speed: 1.2 });
  herd.add(M.mastodon, 6, -20e6, -1.2e6, { R: [30, 80], speed: 1.2 });
  herd.add(M.deer, 4, -20e6, -1.2e6, { R: [15, 50], speed: 1.2 });
  herd.add(M.doe, 5, -20e6, -1.2e6, { R: [15, 50], speed: 1.2 });
  herd.add(M.mastodon, 5, -130e3, -100e3, { R: [30, 80], speed: 1.2 });
  herd.add(M.mammoth, 7, -95e3, -27e3, { R: [30, 90], speed: 1.2 });
  herd.add(M.mammoth, 5, -16.5e3, -10.5e3, { R: [30, 90], speed: 1.2 });
  herd.add(M.mastodon, 4, -15e3, -9500, { R: [30, 80], speed: 1.2 });
  herd.add(M.horse, 4, -16.5e3, -10.5e3, { R: [25, 70], speed: 1.5, scale: [0.85, 0.95] });   // the wild horses of ice-age America
  herd.add(M.deer, 8, -15e3, -9000, { R: [20, 60], speed: 1.2, scale: [1.15, 1.3] });   // caribou
  herd.add(M.wolf, 4, -15e3, 1650, { R: [30, 90], speed: 2.3 });
  herd.add(M.deer, 6, -9000, 1700, { R: [12, 50], speed: 1.1 });
  herd.add(M.doe, 9, -9000, 1700, { R: [12, 50], speed: 1.1 });
  herd.add(M.deer, 6, 9500, 140e6, { R: [12, 50], speed: 1.1 });
  herd.add(M.doe, 9, 9500, 140e6, { R: [12, 50], speed: 1.1 });
  herd.add(M.wolf, 4, 12000, 140e6, { R: [30, 90], speed: 2.3 });
  herd.add(M.mastodon, 5, 2e6, 140e6, { R: [30, 80], speed: 1.2, scale: [0.7, 1.2] });   // whatever comes next
  // birds: woodland, then city and harbour, then woodland again
  herd.add(M.crow, 8, -60e6, 2e8, { R: [20, 90], speed: 9, fly: 22, scale: [0.95, 1.15] });
  herd.add(M.hawk, 4, -30e6, 1850, { R: [60, 140], speed: 11, fly: 45, scale: [0.95, 1.15] });
  herd.add(M.hawk, 4, 9500, 2e8, { R: [60, 140], speed: 11, fly: 45, scale: [0.95, 1.15] });
  herd.add(M.gull, 9, -6000, 2165, { R: [50, 150], speed: 10, fly: 30, scale: [0.95, 1.15] });
  herd.add(M.gull, 6, 2960, 1e6, { R: [50, 150], speed: 10, fly: 30, scale: [0.95, 1.15] });
  return herd;
}
