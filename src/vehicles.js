// Vehicles: carts, cars, pods, flying traffic, ships and (from vehicles-air.js) aircraft.
import * as THREE from 'three';
import { yearToU } from './timeline.js?v=fea1c89f';
import { species, pose } from './animals.js?v=fea1c89f';
import { Movers, traffic, CROSS_SPAN } from './movers.js?v=fea1c89f';
import { Bag, fin, curve, loft, sweep, oval, revolve, spokedWheel, vehicleMat, at } from './vehicles-kit.js?v=fea1c89f';
import { carParts } from './vehicles-cars.js?v=fea1c89f';
import { shipParts } from './vehicles-ships.js?v=fea1c89f';
import { buildAircraft } from './vehicles-air.js?v=fea1c89f';

export { carParts, shipParts };

const PI = Math.PI;
// =====================================================================================
// Horse and wagon
// =====================================================================================
const C = {
  coat: fin(0x6a4428, 0.85), plain: fin(0xffffff, 0.7), leather: fin(0x1e150f, 0.55), wood: fin(0x7a5a36, 0.85), plank: fin(0x8f7450, 0.9), green: fin(0x34503a, 0.7), wheel: fin(0x8a3220, 0.7),
  iron: fin(0x26262a, 0.5, 0.7), sack: fin(0xb09a6c, 0.95), cask: fin(0x6e4a28, 0.8), coatCloth: fin(0x2a2c34, 0.9), trousers: fin(0x5a4a38, 0.9), skin: fin(0xc89a78, 0.8), hat: fin(0x1a1614, 0.9), hair: fin(0x3a2a1e, 0.9), eyeWhite: fin(0xe8e2d8, 0.4), pupil: fin(0x241a14, 0.2), lips: fin(0x9a5a50, 0.7),
};
const HORSE_X = 2.8;   // the horse stands this far ahead of the wagon's origin
/** `horse` false leaves the horse out (the game puts a living, walking one in the shafts); the harness is still fitted to it. */
export function cartParts(M, { horse: keep = true } = {}) {
  const bag = new Bag(), horse = M.horse().obj, hx = HORSE_X; horse.updateMatrixWorld(true);
  horse.traverse((o) => { if (o.isMesh) bag.add(o.geometry, o.material.map ? C.coat : C.plain, at(hx, 0, 0).multiply(o.matrixWorld), true); });
  const horseVerts = bag.p.length / 3;
  // measure the horse where the harness sits: back, belly (on the centre line, clear of the legs) and half-width
  const P = bag.p.slice(), probe = (x) => {
    let top = 0, bot = 9, w = 0;
    for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i] - hx - x) < 0.09) { top = Math.max(top, P[i + 1]); if (Math.abs(P[i + 2]) < 0.07) bot = Math.min(bot, P[i + 1]); }
    for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i] - hx - x) < 0.09 && P[i + 1] > (top + bot) / 2) w = Math.max(w, Math.abs(P[i + 2]));
    return { top, bot, w, mid: (top + bot) / 2, h: (top - bot) / 2 };
  };
  let nose = [0, 0, 0]; for (let i = 0; i < P.length; i += 3) if (P[i] > nose[0]) nose = [P[i], P[i + 1], 0];
  const girth = probe(0.12), neck = probe(0.55), band = (g, x, w, t, tilt = 0) => revolve(bag, [[-w, 1], [-w, 1 + t / g.h], [w, 1 + t / g.h], [w, 1]], C.leather, at(hx + x, g.mid, 0, 0, 0, tilt, 1, g.h, g.w + 0.005), 14);
  band(girth, 0.12, 0.035, 0.02); band(neck, 0.55, 0.05, 0.06, -0.25); bag.box(C.leather, 0.3, 0.03, 0.26, hx + 0.12, girth.top + 0.01, 0);
  for (const s of [1, -1]) {
    bag.rod(C.wood, [0.45, 0.72, s * 0.5], [hx + 0.75, girth.mid + 0.08, s * (girth.w + 0.07)], 0.032, 6, 0.024);
    bag.rod(C.leather, [hx + 0.5, neck.mid - 0.1, s * (neck.w + 0.03)], [0.5, 0.68, s * 0.42], 0.012, 4);
    bag.rod(C.leather, nose.map((v, k) => (k === 0 ? v - 0.12 : k === 1 ? v + 0.02 : s * 0.07)), [hx + 0.5, neck.top + 0.06, s * 0.1], 0.008, 3);
    bag.rod(C.leather, [hx + 0.5, neck.top + 0.06, s * 0.1], [0.5, 1.93, s * 0.09], 0.008, 3);
    bag.rod(C.leather, [hx + 0.12, girth.mid + 0.1, s * (girth.w + 0.03)], [hx + 0.12, girth.mid + 0.1, s * (girth.w + 0.09)], 0.03, 5);
  }
  // running gear
  for (const [x, r] of [[-1.6, 0.62], [0.15, 0.47]]) {
    for (const s of [1, -1]) spokedWheel(bag, x, s * 0.8, r, 0.07, 12, { tyre: C.iron, rim: C.wheel, hub: C.wheel, hubR: 0.085, spokeR: 0.022, depth: 0.08 });
    bag.rod(C.iron, [x, r, -0.8], [x, r, 0.8], 0.035, 6); bag.box(C.wheel, 0.14, 0.98 - r - 0.03, 1.16, x, (0.98 + r + 0.03) / 2, 0);
  }
  bag.rod(C.wheel, [-1.6, 0.62, 0], [0.15, 0.5, 0], 0.04, 5); bag.box(C.wheel, 0.08, 0.06, 1.0, 0.5, 0.7, 0);
  // box, seat and footboard
  bag.box(C.plank, 2.74, 0.06, 1.2, -0.85, 1.0, 0);
  for (const s of [1, -1]) {
    bag.box(C.green, 2.74, 0.44, 0.045, -0.85, 1.24, s * 0.63, s * 0.14);
    for (const x of [-2.0, -0.85, 0.3]) bag.box(C.iron, 0.05, 0.5, 0.03, x, 1.22, s * 0.665, s * 0.14);
    bag.box(C.wood, 0.05, 0.3, 0.05, 0.1, 1.58, s * 0.5);
  }
  bag.box(C.green, 0.045, 0.44, 1.26, 0.52, 1.24, 0); bag.box(C.green, 0.045, 0.44, 1.26, -2.22, 1.24, 0, 0, 0, 0.1);
  bag.box(C.wood, 0.42, 0.05, 1.2, 0.1, 1.74, 0); bag.box(C.wood, 0.04, 0.22, 1.2, -0.1, 1.9, 0, 0, 0, 0.15); bag.box(C.wood, 0.4, 0.04, 1.1, 0.7, 1.28, 0, 0, 0, 0.7);
  // load: casks, sacks and a crate
  const cask = [[-0.42, 0], [-0.42, 0.23], [-0.3, 0.27], [-0.24, 0.285], [-0.04, 0.3], [0.04, 0.3], [0.24, 0.285], [0.3, 0.27], [0.42, 0.23], [0.42, 0]];
  for (const [x, z] of [[-1.85, 0.27], [-1.85, -0.27], [-1.28, 0.25]]) revolve(bag, cask, (i) => (i === 2 || i === 4 || i === 6 ? C.iron : C.cask), at(x, 1.45, z, 0, 0, PI / 2), 10);
  for (const [x, y, z, a] of [[-1.2, 1.17, -0.28, 0.3], [-0.65, 1.17, 0.2, -0.5], [-0.7, 1.19, -0.3, 1.2], [-0.72, 1.43, -0.05, 0.4]]) bag.ball(C.sack, x, y, z, 0.36, 0.15, 0.24, 0, a, 0);
  bag.box(C.wood, 0.5, 0.42, 0.55, -0.2, 1.24, 0.22);
  // driver
  const fig = { ref: [0, 0, 1], sub: 2 };
  sweep(bag, [[0.08, 1.8, 0, 0.9], [0.1, 2.05, 0, 1.05], [0.14, 2.3, 0, 0.85], [0.15, 2.36, 0, 0.4]], oval(0.1, 0.18), C.coatCloth, fig);
  bag.ball(C.skin, 0.17, 2.48, 0, 0.1, 0.115, 0.095); bag.cyl(C.hat, 0.2, 0.2, 0.02, 0.17, 2.56, 0, 12);
  // a face: hair under the hat, eyes, brows, nose and ears (he looks ahead, along +x, to the horse)
  bag.ball(C.hair, 0.13, 2.52, 0, 0.09, 0.06, 0.1);
  for (const s of [1, -1]) {
    bag.ball(C.eyeWhite, 0.257, 2.5, s * 0.034, 0.012, 0.011, 0.017); bag.ball(C.pupil, 0.267, 2.5, s * 0.034, 0.005, 0.008, 0.008);
    bag.ball(C.hair, 0.262, 2.522, s * 0.035, 0.007, 0.005, 0.02); bag.ball(C.skin, 0.17, 2.485, s * 0.098, 0.018, 0.03, 0.01);
  }
  bag.ball(C.skin, 0.272, 2.475, 0, 0.022, 0.03, 0.014); bag.ball(C.lips, 0.262, 2.437, 0, 0.008, 0.007, 0.022); bag.cyl(C.hat, 0.095, 0.11, 0.12, 0.17, 2.62, 0, 10);
  for (const s of [1, -1]) {
    sweep(bag, [[0.08, 1.83, s * 0.09], [0.47, 1.82, s * 0.11], [0.68, 1.42, s * 0.11]], oval(0.07, 0.07, 6), C.trousers, fig); bag.ball(C.hat, 0.75, 1.36, s * 0.11, 0.13, 0.06, 0.055, 0, 0, 0.7);
    sweep(bag, [[0.13, 2.26, s * 0.2], [0.2, 2.02, s * 0.23], [0.46, 1.94, s * 0.1]], oval(0.048, 0.048, 6), C.coatCloth, fig); bag.ball(C.skin, 0.5, 1.93, s * 0.09, 0.05);
  }
  if (!keep) for (const [arr, size] of [[bag.p, 3], [bag.n, 3], [bag.c, 3], [bag.s, 4], [bag.w, 3]]) arr.splice(0, horseVerts * size);
  return [{ geo: bag.geo(), mat: vehicleMat(), tint: false }];
}

// =====================================================================================
// Flying cars
// =====================================================================================
const A = {
  dark: fin(0x2a2e36, 0.28, 0.8), trim: fin(0x101216, 0.4, 0.6), glass: fin(0x18242e, 0.04, 1), white: fin(0xf4f8ff, 0.22, 0.25), pearl: fin(0xc8d4e4, 0.2, 0.7), gold: fin(0x6a4c1a, 0.05, 1),
  nose: fin(0xfff4dc, 0.3, 0, 3), tail: fin(0xff1408, 0.3, 0, 2.2), lift: fin(0x1c9cff, 0.3, 0, 2.6), port: fin(0xff1408, 0.3, 0, 2.5), star: fin(0x10ff40, 0.3, 0, 2.5), halo: fin(0x58a8ff, 0.3, 0, 2.2), sun: fin(0xffc060, 0.3, 0, 2.6),
};
/** Loft a streamlined body from curves over x: centre height, height above and below it, half-width; p squares off the section. */
function fuselage(bag, xs, d, f, n = 8) {
  const yc = curve(d.y), up = curve(d.up), down = curve(d.down), w = curve(d.w), e = 2 / (d.p || 2.4);
  loft(bag, xs, (x) => Array.from({ length: n + 1 }, (_, k) => { const a = -PI / 2 + (k / n) * PI, s = Math.sin(a); return [yc(x) + (s > 0 ? up(x) : down(x)) * Math.sign(s) * Math.abs(s) ** e, w(x) * Math.abs(Math.cos(a)) ** e]; }), f, { crease: 0.3 });
}
const xsOf = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => a + (b - a) * (0.5 - 0.5 * Math.cos((k / n) * PI)));
/** bright: the white craft of the far future; otherwise a dark four-fan air car. Hangs around y = 0. */
export function flyerParts(bright) {
  const bag = new Bag();
  if (bright) {
    const xs = xsOf(-3.3, 3.3, 30);
    fuselage(bag, xs, { p: 1.8, y: [[-3.3, 0.22], [0, 0], [3.3, -0.1]], up: [[-3.3, 0.04], [-2.2, 0.3], [-0.4, 0.62], [0.8, 0.6], [2.2, 0.3], [3.3, 0.03]], down: [[-3.3, 0.04], [-1.5, 0.3], [0.8, 0.34], [3.3, 0.03]],
      w: [[-3.3, 0.5], [-2.7, 1.0], [-1.3, 1.5], [0.1, 1.42], [1.6, 0.95], [2.6, 0.5], [3.2, 0.16], [3.3, 0.05]] },
    (i, k) => { const x = xs[i]; return k === 3 || k === 4 ? A.halo : k >= 6 && x > -0.9 && x < 1.9 ? A.gold : k === 0 && x > -2.2 && x < 1.6 ? A.sun : k < 3 ? A.pearl : A.white; });
    for (const s of [1, -1]) {
      revolve(bag, [[0.5, 0.05], [0.3, 0.26], [-0.25, 0.3], [-0.5, 0.26], [-0.44, 0.2], [-0.3, 0.19], [-0.3, 0]], (i) => (i < 3 ? A.white : i === 3 ? A.pearl : A.sun), at(-2.9, 0.22, s * 0.62), 12);
      sweep(bag, [[-2.2, 0.3, s * 1.25, 1], [-2.7, 0.75, s * 1.6, 0.7], [-3.1, 1.15, s * 1.85, 0.3]], oval(0.03, 0.3, 6), A.white, { ref: [1, 0, 0], sub: 2 });
      bag.ball(s > 0 ? A.star : A.port, -3.12, 1.17, s * 1.86, 0.05);
    }
    return [{ geo: bag.geo(), mat: vehicleMat(), tint: false }];
  }
  const xs = xsOf(-2.75, 2.75, 28);
  fuselage(bag, xs, { p: 2.6, y: [[-2.75, 0.28], [0, 0.04], [2.75, -0.12]], up: [[-2.75, 0.1], [-1.8, 0.4], [-0.5, 0.66], [0.5, 0.7], [1.4, 0.52], [2.2, 0.28], [2.75, 0.06]], down: [[-2.75, 0.1], [-1.5, 0.36], [0.5, 0.42], [1.8, 0.34], [2.75, 0.06]],
    w: [[-2.75, 0.3], [-2.3, 0.64], [-1.2, 0.92], [0.3, 1.0], [1.6, 0.86], [2.3, 0.55], [2.66, 0.25], [2.75, 0.1]] },
  (i, k) => { const x = xs[i]; return x > 2.6 && k > 1 && k < 6 ? A.nose : x < -2.62 ? A.tail : k >= 5 && x > -0.7 && x < 1.75 ? A.glass : k === 0 && Math.abs(x) < 1.9 ? A.lift : k < 2 ? A.trim : A.dark; });
  const duct = [[0.12, 0.92], [0.07, 1.06], [-0.1, 1.08], [-0.16, 1.0], [-0.1, 0.9], [0.06, 0.88], [0.12, 0.92]];
  for (const s of [1, -1]) for (const [x, y, z, r] of [[1.3, -0.08, 1.5, 0.46], [-1.6, 0.14, 1.68, 0.62]]) {
    revolve(bag, duct, (i) => (i > 2 && i < 5 ? A.trim : A.dark), at(x, y, s * z, 0, 0, PI / 2, r, r, r), 14);
    revolve(bag, [[0, 0.9], [0, 0.16], [0.04, 0.12], [0.1, 0]], (i, j) => (i === 0 && j % 2 ? A.dark : A.trim), at(x, y, s * z, 0, 0, PI / 2, r, r, r), 14);
    revolve(bag, [[-0.05, 0.9], [-0.05, 0]], A.lift, at(x, y, s * z, 0, 0, PI / 2, r, r, r), 14, { flip: true });
    sweep(bag, [[x + 0.1, y + 0.1, s * 0.6, 1.2], [x, y + 0.02, s * (z - r * 0.9), 0.8]], oval(0.26, 0.05, 6), A.dark, { sub: 2, caps: false });
    bag.ball(s > 0 ? A.star : A.port, x, y + 0.02, s * (z + r * 1.07), 0.05);
  }
  for (const s of [1, -1]) sweep(bag, [[-1.9, 0.5, s * 0.35, 1], [-2.35, 0.95, s * 0.7, 0.75], [-2.7, 1.3, s * 0.95, 0.4]], oval(0.03, 0.3, 6), A.dark, { ref: [1, 0, 0], sub: 2 });
  return [{ geo: bag.geo(), mat: vehicleMat(), tint: false }];
}

// =====================================================================================
// Horses in harness: one living, walking horse for every wagon on the road
// =====================================================================================
class Teams {
  constructor(world, scene, carts) { this.world = world; this.scene = scene; this.carts = carts; this.horses = []; this.meshes = []; this.items = carts.items; this.ground = true; }
  update(u, t, view) {
    const { carts, horses } = this, flooded = this.world.sea > carts.floodAt;
    carts.items.forEach((it, i) => {
      let on = !flooded && u >= it.u0 && u < it.u1, at;
      if (on) {
        at = carts.where(it, t);
        if (view) { const dx = at.x - view.eye.x, dz = at.z - view.eye.z; _ball.center.set(at.x, at.y + 1, at.z); on = dx * dx + dz * dz < 4900 || view.frustum.intersectsSphere(_ball); }
      }
      let h = horses[i];
      if (!on) { if (h && h.in) { h.in = false; this.scene.remove(h.obj); } return; }
      if (!h) { h = horses[i] = species().horse(); h.obj.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
      if (!h.in) { h.in = true; this.scene.add(h.obj); }
      const c = Math.cos(at.yaw), s = Math.sin(at.yaw);
      h.obj.position.set(at.x + c * HORSE_X, at.y, at.z - s * HORSE_X); h.obj.rotation.y = at.yaw;
      // the gait turns exactly as fast as the ground goes by, so the hooves do not slide
      pose(h, (2 * PI * h.def.gait.duty * at.run) / h.def.gait.stride, t);
    });
  }
}
const _ball = new THREE.Sphere(new THREE.Vector3(), 6);

// =====================================================================================
// Traffic through the ages
// =====================================================================================
export function buildVehicles(world, scene, r) {
  const { lanes, cloth } = traffic(r), Y = yearToU, movers = [];
  const mk = (parts, items, opts = {}) => { const m = new Movers(world, parts, items, { crossSpan: opts.ground === false ? 0 : CROSS_SPAN, ...opts }); movers.push(m); scene.add(...m.meshes); return m; };
  // wheels
  const carts = mk(cartParts(species(), { horse: false }), lanes(26, 1640, 1905, { jf: 200, jt: 22, v: [2, 3.5], off: (ax) => (ax === 'z' ? 3 : 1.8) })); carts.sound = 'horse';
  movers.push(new Teams(world, scene, carts));
  const lane = (ax) => (ax === 'z' ? 1.8 + Math.floor(r() * 2) * 3 : 1.8);
  const cars = (style, n, from, to, jf, jt, v, pal) => { const m = mk(carParts(style), lanes(n, from, to, { jf, jt, v, off: lane, alt: 0.02, tint: cloth(pal) })); m.sound = 'car'; return m; };
  cars('old', 40, 1903, 1944, 25, 10, [6, 10], [0x101010, 0x141414, 0x1a1210, 0x10141c, 0x3a1410, 0x1c2a20]);
  cars('fifties', 60, 1936, 1968, 14, 12, [8, 13], [0x18181a, 0x5e1418, 0x24463a, 0x86b0a4, 0xd6d0b8, 0x26385a, 0x74848e, 0x8a2a20, 0xc8b070]);
  cars('cab', 26, 1962, 2030, 10, 14, [9, 15], [0xf2c018]);
  cars('sedan', 48, 1962, 2018, 14, 14, [9, 15], [0xe8e8e8, 0x202428, 0x8a1a1a, 0x2a4a7a, 0x9aa0a8, 0x3a5a3a, 0x6a5a40, 0x70202a, 0xb8b094]);
  cars('suv', 60, 1998, 2060, 20, 40, [9, 15], [0xf0f0f0, 0x16181c, 0x9aa0a8, 0x50565e, 0x1e3a66, 0x8a1a1a, 0xf0f0f0, 0x2a3a34]);
  cars('pod', 60, 2035, 2170, 40, 30, [10, 14], [0xffffff, 0xe0f0ff, 0xd0d8e0]);
  // the sky fills up
  mk(flyerParts(false), lanes(170, 2140, 2850, { jf: 120, jt: 130, v: [25, 50], off: () => r() * 16 - 8, alt: () => 25 + Math.floor(r() * 7) * 28 + r() * 4, cross: 0.45 }), { ground: false }).sound = 'flyer';
  mk(flyerParts(true), lanes(40, 2960, 9200, { jf: 40, jt: 600, v: [30, 60], off: () => r() * 80 - 40, alt: () => 60 + r() * 250, cross: 0.5 }), { ground: false }).sound = 'flyer';
  // ships on both rivers
  const river = (n, from, to, v = 3, jt = 30) => Array.from({ length: n }, (_, i) => {
    const dir = i % 2 ? 1 : -1;
    return { lane: (i % 2 ? 1 : -1) * (360 + r() * 140), alt: 0, off: r() * 3000, v: dir * (v + r() * 2), axis: 'z', u0: Y(from + i * 6), u1: Y(to + r() * jt), tint: [1, 1, 1] };
  });
  const shipOpts = { span: 1500, ground: false };
  const fleets = [
    mk(shipParts('sail'), [...river(1, 1524, 1525, 3, 0), ...river(1, 1609, 1611, 3, 0), ...river(8, 1624, 1880)], shipOpts),
    mk(shipParts('steam'), river(6, 1838, 1960, 6), shipOpts),
    mk(shipParts('cargo'), river(5, 1955, 2150, 5), shipOpts),
  ];
  for (const f of fleets) f.sound = 'ship';
  movers.push(...buildAircraft(world, scene));

  return { movers, fleets };
}
