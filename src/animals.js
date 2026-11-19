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

/** The ground as it is drawn: the terrain is a 10 m grid of flat triangles, which sag and bulge by up to half a metre against the smooth surface. */
function groundAt(W, x, z) {
  if (W.ice > -50) return W.surfaceAt(x, z);
  const x0 = Math.floor(x / 10) * 10, z0 = Math.floor(z / 10) * 10, fx = (x - x0) / 10, fz = (z - z0) / 10, hb = W.heightAt(x0, z0 + 10), hd = W.heightAt(x0 + 10, z0);
  if (fx + fz <= 1) { const ha = W.heightAt(x0, z0); return ha + (hd - ha) * fx + (hb - ha) * fz; }
  const hc = W.heightAt(x0 + 10, z0 + 10); return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}

class Herd {
  constructor(world, scene) { this.world = world; this.scene = scene; this.list = []; this.r = rng(77); }
  /**
   * n animals circling at radius R (m) and walking speed (m/s) between two years; `fly` is the cruising height of a flyer (above the ground it passes
   * over if `skim`). `near` keeps small animals within that many metres of where the walk begins, so that they can be found; `level` looks there
   * for ground of that height at full relief (the edge of a pool); `wide` (half the track width, m) makes a low, broad animal lean with the slope across its path.
   */
  add(make, n, from, to, { R = [20, 70], speed = 1.5, fly = 0, skim = false, near = 0, level = 0, wide = 0, scale = [0.9, 1.1] } = {}) {
    const r = this.r;
    for (let i = 0; i < n; i++) {
      const a = make(), sc = scale[0] + r() * (scale[1] - scale[0]); a.obj.scale.setScalar(sc);
      const Rr = R[0] + r() * (R[1] - R[0]), v = speed * (0.8 + r() * 0.4), { duty, stride } = a.def.gait;
      // the gait turns exactly fast enough for a planted foot to stay where it is on the ground
      if (wide) a.obj.rotation.order = 'YZX';   // heading, then pitch, then roll
      this.list.push({ ...a, skim, wide: wide * sc, cx: (r() * 2 - 1) * (near || 215 - Rr), cz: (r() * 2 - 1) * (near || 260), R: Rr, w: (v / Rr) * (r() < 0.5 ? -1 : 1), gait: (TAU * duty * v) / (stride * sc), half: a.def.half * sc, flap: a.def.flight && a.def.flight.rate * (0.85 + r() * 0.3), ph: r() * 6.28, u0: yearToU(from), u1: yearToU(to), fly: fly && fly * (0.6 + r() * 0.8), in: false });
      if (level) for (let k = 0, q = this.list[this.list.length - 1], off = (x, z) => Math.abs(groundAt(this.world, x, z) - level); k < 250; k++) { const x = (r() * 2 - 1) * near, z = (r() * 2 - 1) * near; if (off(x, z) < off(q.cx, q.cz)) { q.cx = x; q.cz = z; } }
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
      if (a.fly) { a.obj.position.set(x, a.skim ? W.surfaceAt(x, z) + a.fly * (1 + 0.35 * Math.sin(t * 0.4 + a.ph)) : a.fly + Math.sin(t * 0.4 + a.ph) * 4, z); a.obj.rotation.z = Math.cos(t * 0.4 + a.ph) * 0.08; a.obj.rotation.x = s * 0.3; }
      else {   // stand on the ground at the fore and hind feet, pitched to the slope
        const yf = groundAt(W, x + dx * a.half, z + dz * a.half), yb = groundAt(W, x - dx * a.half, z - dz * a.half);
        a.obj.position.set(x, (yf + yb) / 2, z); a.obj.rotation.z = Math.atan2(yf - yb, a.half * 2);
        if (a.wide) a.obj.rotation.x = Math.atan2(groundAt(W, x + dz * a.wide, z - dx * a.wide) - groundAt(W, x - dz * a.wide, z + dx * a.wide), a.wide * 2);
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
  // before the dinosaurs (added last, so that everything above keeps its place)
  herd.add(M.trilobite, 36, -532e6, -476e6, { R: [0.4, 1.2], speed: 0.03, near: 115, level: 4.15, scale: [0.5, 3.5] });   // on the wet sand at the water's edge, while this spot is a tidal flat
  herd.add(M.millipede, 10, -425e6, -300e6, { R: [1, 4], speed: 0.02, near: 12, scale: [0.8, 1.6] });
  herd.add(M.scorpion, 12, -425e6, -300e6, { R: [2, 9], speed: 0.06, near: 30, wide: 0.03, scale: [0.6, 2] });
  herd.add(M.tetrapod, 5, -375e6, -330e6, { R: [6, 20], speed: 0.22, near: 60, wide: 0.19, scale: [0.8, 1.1] });
  herd.add(M.arthropleura, 4, -345e6, -290e6, { R: [12, 40], speed: 0.4, near: 90, wide: 0.25, scale: [0.6, 1.05] });
  herd.add(M.meganeura, 7, -325e6, -295e6, { R: [10, 40], speed: 5, fly: 2.4, skim: true, near: 60, scale: [0.85, 1.05] });
  herd.add(M.eryops, 4, -310e6, -255e6, { R: [10, 30], speed: 0.35, near: 90, wide: 0.36, scale: [0.8, 1.05] });
  herd.add(M.edaphosaurus, 4, -303e6, -280e6, { R: [15, 45], speed: 0.5, near: 110, wide: 0.36, scale: [0.8, 1.05] });
  herd.add(M.dimetrodon, 4, -295e6, -272e6, { R: [20, 60], speed: 0.65, near: 130, wide: 0.3, scale: [0.8, 1.05] });
  herd.add(M.gorgonopsid, 3, -265e6, -252.2e6, { R: [25, 70], speed: 1, near: 150, wide: 0.22, scale: [0.85, 1.1] });
  herd.add(M.lystrosaurus, 8, -253e6, -245e6, { R: [10, 40], speed: 0.45, near: 110, wide: 0.18, scale: [0.85, 1.15] });
  return herd;
}
