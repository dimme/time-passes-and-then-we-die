// Things people hold, carry and work at. Each prop is a list of pieces [where, geometry, group?]:
//   'tool'   in the working hand, grip at the origin, long axis +y, working edge +x; the action points it
//   'off'    fixed to the other forearm: grip at the origin, elbow at +y 0.335, +x the way the palm closes, z away from the body
//   'head' | 'chest'   riding on the head / the ribcage, in the standing figure's coordinates
//   'ground' standing in front of the actor, in the actor's coordinates
// A piece in the 'glow' group is drawn unlit (flames, light strips). s = +1 when the working hand is the right one.
import * as THREE from 'three';
import { hex, WHITE } from './organic.js';
import { tag, loft, ell, join } from './people-body.js';

const WOOD = hex(0x6a4a2a), PALE = hex(0x9a7a4a), STONE = hex(0x8a8478), FLINT = hex(0x4a4640), CLAY = hex(0xa8683c), REED = hex(0xb8985a), GRAIN = hex(0xd0b060), IRON = hex(0x4a4c50), STEEL = hex(0xa0a4aa),
  BRONZE = hex(0xb08434), HIDE = hex(0x8a6a48), ROPE = hex(0xa89868), CLOTH = hex(0xd8d0bc), SACK = hex(0x9a8a68), FLAME = [2.4, 1.1, 0.25], EMBER = [1.6, 0.4, 0.08], RED = hex(0x8a1c14), SOOT = hex(0x1c1a18), WOOL = hex(0xe0d8c8);
const fix = (g, c) => tag(g, c, 0, 0, 1), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
/** A round bar from a to b. */
function rod(c, a, b, r0, r1 = r0, segs = 6) {
  _a.set(...a); _b.set(...b).sub(_a); const len = _b.length(), g = new THREE.CylinderGeometry(r1, r0, len, segs);
  g.translate(0, len / 2, 0).applyQuaternion(_q.setFromUnitVectors(UP, _b.normalize())).translate(...a); return fix(g, c);
}
const bars = (c, pts, r, segs) => pts.slice(1).map((p, i) => rod(c, pts[i], p, r, r, segs));
const slab = (c, w, h, d, x, y, z, rz = 0, ry = 0) => fix(new THREE.BoxGeometry(w, h, d).rotateZ(rz).rotateY(ry).translate(x, y, z), c);
const blob = (c, rx, ry, rz, x, y, z, tilt = 0, segs = 8, rows = 5) => fix(ell(rx, ry, rz, x, y, z, tilt, segs, rows), c);
/** A pot turned from a profile [[height, radius] …] standing at (x, y, z). */
const pot = (c, prof, x = 0, y = 0, z = 0, segs = 10) => fix(loft(prof.map(([h, r]) => [x, y + h, z, r, r]), { segs, sub: 2, cap: 'both' }), c);
const BASKET = [[0, 0.11], [0.1, 0.17], [0.2, 0.21], [0.215, 0.2]], JAR = [[0, 0.06], [0.08, 0.13], [0.2, 0.15], [0.3, 0.1], [0.35, 0.055], [0.39, 0.07]], BOWL = [[0, 0.03], [0.03, 0.065], [0.06, 0.08]];
const shaft = (c, y0, y1, r = 0.016) => rod(c, [0, y0, 0], [0, y1, 0], r);

/** An open umbrella with its grip at the origin: the dark canopy (seen from both sides) and the lit rim and shaft. */
export function umbrella() {
  const dome = new THREE.SphereGeometry(0.62, 12, 3, 0, Math.PI * 2, 0, 1.05).scale(1, 0.55, 1).translate(0, 0.4, 0), under = dome.clone().scale(0.99, 0.97, 0.99);
  under.setIndex([...under.index.array].reverse());
  const p = under.attributes.normal; for (let i = 0; i < p.count; i++) p.setXYZ(i, -p.getX(i), -p.getY(i), -p.getZ(i));
  return { solid: join([fix(dome, SOOT), fix(under, SOOT), shaft(SOOT, -0.09, 0.02, 0.014)]), glow: join([tag(new THREE.TorusGeometry(0.538, 0.009, 4, 20).rotateX(Math.PI / 2).translate(0, 0.57, 0), WHITE), tag(shaft(WHITE, 0.02, 0.73, 0.007), WHITE)]) };
}
const spear = (len, tip) => [shaft(WOOD, -0.9, len, 0.014), rod(tip, [0, len, 0], [0, len + 0.24, 0], 0.024, 0.002, 4)];
const loads = (x) => [rod(ROPE, [x, 1.5, 0.14], [x, 0.9, 0.14], 0.006), pot(REED, BASKET, x, 0.68, 0.14), blob(GRAIN, 0.17, 0.05, 0.17, x, 0.88, 0.14)];

/** name → (s) => pieces */
export const PROPS = {
  // farming
  hoe: () => [['tool', join([shaft(WOOD, -0.55, 0.75), slab(FLINT, 0.2, 0.014, 0.1, 0.085, 0.72, 0, -0.38)])]],
  adze: () => [['tool', join([shaft(WOOD, -0.12, 0.4), slab(STONE, 0.12, 0.02, 0.055, 0.05, 0.38, 0, -0.5)])]],
  stick: () => [['tool', join([rod(WOOD, [0, -0.35, 0], [0, 1, 0], 0.019, 0.008), blob(STONE, 0.05, 0.04, 0.05, 0, 0.62, 0)])]],
  sickle: () => [['tool', join([shaft(WOOD, -0.06, 0.1, 0.015), ...bars(FLINT, [[0, 0.1, 0], [0.02, 0.2, 0], [0.09, 0.29, 0], [0.19, 0.31, 0], [0.27, 0.25, 0]], 0.011, 4)])]],
  flail: () => [['tool', join([shaft(WOOD, -0.5, 0.85), rod(PALE, [0, 0.86, 0], [0.5, 0.6, 0], 0.022)])]],
  seedbag: () => [['chest', join([blob(SACK, 0.08, 0.12, 0.1, 0.1, 1, -0.16), ...bars(SACK, [[0.1, 1.08, -0.17], [0.125, 1.3, 0], [0, 1.475, 0.1], [-0.12, 1.3, 0], [-0.07, 1.08, -0.17]], 0.012, 4)])]],
  ard: () => [['ground', join([rod(WOOD, [0.3, 0.06, 0], [0.95, 0.02, 0], 0.04, 0.015), rod(WOOD, [0.42, 0.06, 0], [0.24, 0.97, 0], 0.024), rod(WOOD, [0.24, 0.97, -0.17], [0.24, 0.97, 0.17], 0.018), rod(WOOD, [0.55, 0.08, 0], [2.7, 0.78, 0], 0.03)])]],
  quern: () => [['ground', join([blob(STONE, 0.3, 0.055, 0.15, 0.52, 0.05, 0, 0.06), blob(CLOTH, 0.16, 0.012, 0.09, 0.56, 0.1, 0)])], ['tool', blob(FLINT, 0.045, 0.04, 0.13, 0, -0.03, 0)]],
  // carrying
  basket: () => [['head', join([pot(REED, BASKET, 0, 1.752, 0), blob(GRAIN, 0.17, 0.05, 0.17, 0, 1.95, 0)])]],
  jar: () => [['head', pot(CLAY, JAR, 0, 1.752, 0)]],
  amphora: () => [['chest', fix(pot(CLAY, [[0, 0.02], [0.1, 0.09], [0.32, 0.14], [0.5, 0.1], [0.6, 0.04], [0.7, 0.05]]).rotateZ(-1.25).translate(-0.3, 1.5, 0.17), CLAY)]],
  sack: () => [['chest', join([blob(SACK, 0.16, 0.27, 0.19, -0.2, 1.3, 0.08, 0.15), rod(SACK, [-0.12, 1.5, 0.12], [0.11, 1.47, 0.17], 0.05, 0.025)])]],
  yoke: () => [['chest', join([rod(WOOD, [-0.95, 1.5, 0.14], [0.95, 1.5, 0.14], 0.018), ...loads(-0.9), ...loads(0.9)])]],
  waterskin: () => [['tool', join([blob(HIDE, 0.09, 0.16, 0.07, 0, -0.24, 0), shaft(HIDE, -0.1, 0.02, 0.02)])]],
  bucket: () => [['tool', join([pot(PALE, [[0, 0.1], [0.24, 0.13]], 0, -0.42, 0), shaft(ROPE, -0.2, 0, 0.007)])]],
  rope: () => [['tool', join(bars(ROPE, [[0.1, -0.02, 0], [-0.35, 0.02, 0], [-1.5, -0.42, 0], [-3.2, -0.98, 0]], 0.015, 5))]],
  // crafts
  handaxe: () => [['tool', blob(FLINT, 0.034, 0.062, 0.02, 0, 0.01, 0)]],
  hammerstone: () => [['tool', blob(STONE, 0.042, 0.036, 0.042, 0, -0.01, 0)], ['off', blob(FLINT, 0.05, 0.04, 0.045, 0.035, -0.01, 0)]],
  hammer: () => [['tool', join([shaft(WOOD, -0.1, 0.3, 0.014), slab(IRON, 0.12, 0.05, 0.05, 0, 0.3, 0)])]],
  mallet: () => [['tool', join([shaft(WOOD, -0.1, 0.24, 0.014), slab(PALE, 0.16, 0.08, 0.08, 0, 0.25, 0)])]],
  chisel: () => [['off', rod(IRON, [0.03, -0.04, 0], [0.03, 0.14, 0], 0.009)]],
  saw: () => [['tool', join([shaft(WOOD, -0.06, 0.06, 0.018), slab(STEEL, 0.08, 0.62, 0.004, 0.02, 0.37, 0)])]],
  anvil: () => [['ground', join([rod(WOOD, [0.55, 0, 0], [0.55, 0.56, 0], 0.17, 0.15, 8), slab(IRON, 0.3, 0.14, 0.13, 0.55, 0.63, 0), slab(IRON, 0.2, 0.05, 0.035, 0.6, 0.72, 0, -0.5)])]],
  block: () => [['ground', slab(hex(0xb8ae98), 0.5, 0.82, 0.7, 0.8, 0.41, 0)]],
  log: () => [['ground', join([rod(PALE, [0.5, 0.62, -0.8], [0.5, 0.62, 0.8], 0.09, 0.08, 8), ...[-0.5, 0.5].flatMap((z) => [rod(WOOD, [0.28, 0, z], [0.6, 0.72, z], 0.025), rod(WOOD, [0.72, 0, z], [0.4, 0.72, z], 0.025)])])]],
  wheel: () => [['ground', join([rod(STONE, [0.46, 0.02, 0], [0.46, 0.09, 0], 0.3, 0.3, 14), rod(WOOD, [0.46, 0.09, 0], [0.46, 0.4, 0], 0.03), rod(PALE, [0.46, 0.4, 0], [0.46, 0.44, 0], 0.2, 0.2, 14), pot(CLAY, [[0, 0.05], [0.07, 0.1], [0.17, 0.085], [0.21, 0.06]], 0.46, 0.44, 0)])]],
  loom: () => [['ground', join([...[-0.72, 0.72].map((z) => rod(WOOD, [0.62, 0, z], [0.56, 1.95, z], 0.035)), rod(WOOD, [0.56, 1.92, -0.8], [0.56, 1.92, 0.8], 0.04), rod(WOOD, [0.585, 1.1, -0.74], [0.585, 1.1, 0.74], 0.018),
    slab(CLOTH, 0.012, 0.55, 1.26, 0.566, 1.63, 0, 0.03), slab(WOOL, 0.006, 1, 1.26, 0.59, 0.86, 0, 0.03), ...[-0.5, -0.25, 0, 0.25, 0.5].map((z) => blob(CLAY, 0.04, 0.05, 0.04, 0.6, 0.33, z))])]],
  spindle: () => [['tool', join([shaft(WOOL, -0.4, 0, 0.004), shaft(WOOD, -0.66, -0.38, 0.007), blob(WOOL, 0.03, 0.06, 0.03, 0, -0.5, 0), blob(CLAY, 0.035, 0.012, 0.035, 0, -0.6, 0)])],
    ['off', join([rod(WOOD, [0.03, -0.12, 0], [0.03, 0.4, 0], 0.009), blob(WOOL, 0.06, 0.1, 0.06, 0.03, 0.36, 0)])]],
  tablet: () => [['tool', rod(REED, [0, -0.03, 0], [0, 0.13, 0], 0.005)], ['off', slab(CLAY, 0.1, 0.16, 0.022, 0.06, -0.01, 0)]],
  brush: () => [['tool', join([shaft(WOOD, -0.06, 0.16, 0.006), blob(RED, 0.012, 0.03, 0.012, 0, 0.18, 0)])], ['off', join([pot(CLAY, BOWL, 0.04, -0.03, 0), blob(RED, 0.06, 0.008, 0.06, 0.04, 0.025, 0)])]],
  hearth: () => [['ground', join([...[0, 1, 2, 3, 4, 5, 6].map((i) => blob(STONE, 0.07, 0.05, 0.06, 0.6 + 0.24 * Math.cos(i * 0.9), 0.04, 0.24 * Math.sin(i * 0.9), 0, 6, 4)), pot(SOOT, [[0, 0.07], [0.08, 0.14], [0.17, 0.13], [0.2, 0.11]], 0.6, 0.1, 0)])],
    ['ground', tag(ell(0.17, 0.035, 0.17, 0.6, 0.05, 0, 0, 8, 4), EMBER, 0, 0, 1), 'glow'], ['tool', shaft(WOOD, -0.06, 0.42, 0.011)]],
  hide: () => [['ground', blob(HIDE, 0.5, 0.012, 0.34, 0.62, 0.012, 0)], ['tool', blob(FLINT, 0.03, 0.03, 0.06, 0, -0.03, 0)]],
  // hunting and war
  spear: () => [['tool', join(spear(1.05, FLINT))]],
  pilum: () => [['tool', join([...spear(0.75, IRON), shaft(IRON, 0.55, 0.78, 0.008)])]],
  fishspear: () => [['tool', join([shaft(WOOD, -0.9, 1.05, 0.013), ...[-0.03, 0, 0.03].map((x) => rod(PALE, [0, 1.02, 0], [x, 1.26, 0], 0.007, 0.002, 4))])]],
  net: () => [['tool', fix(new THREE.CylinderGeometry(0.03, 0.42, 0.95, 9, 2).translate(0, -0.5, 0), hex(0x9a9078))]],
  bow: () => [['tool', join([...bars(WOOD, [[-0.17, -0.64, 0], [-0.03, -0.32, 0], [0.02, 0, 0], [-0.03, 0.32, 0], [-0.17, 0.64, 0]], 0.012, 5), rod(CLOTH, [-0.17, -0.64, 0], [-0.17, 0.64, 0], 0.004, 0.004, 3)])],
    ['chest', join([rod(HIDE, [-0.15, 1.02, -0.1], [-0.13, 1.52, 0.1], 0.04, 0.05), ...[0, 1, 2].map((i) => rod(WOOD, [-0.13, 1.5, 0.1], [-0.12 - i * 0.012, 1.68, 0.16 + i * 0.012], 0.005, 0.005, 3))])]],
  shield: () => [['off', fix(new THREE.SphereGeometry(1, 14, 6).scale(0.44, 0.44, 0.07).translate(0, 0.18, 0.1), BRONZE)]],
  scutum: () => [['off', join([fix(loft([[0, -0.36, 0.1, 0.33, 0.03], [0, 0.72, 0.1, 0.33, 0.03]], { segs: 12, n: 5, cap: 'both' }), RED), blob(BRONZE, 0.09, 0.09, 0.05, 0, 0.18, 0.13)])]],
  kite: () => [['off', fix(loft([[0, -0.62, 0.09, 0.02, 0.02], [0, -0.2, 0.09, 0.2, 0.025], [0, 0.2, 0.09, 0.29, 0.03], [0, 0.42, 0.09, 0.27, 0.03], [0, 0.5, 0.09, 0.16, 0.025]], { segs: 12, n: 3, cap: 'both' }), hex(0x2a3a6a))]],
  sword: () => [['tool', join([slab(STEEL, 0.045, 0.74, 0.008, 0, 0.45, 0), slab(BRONZE, 0.16, 0.025, 0.03, 0, 0.07, 0), shaft(WOOD, -0.07, 0.07, 0.016)])]],
  staff: () => [['tool', shaft(WOOD, -1.08, 0.72, 0.017)]],
  torch: () => [['tool', join([shaft(WOOD, -0.2, 0.36, 0.016), blob(SOOT, 0.035, 0.06, 0.035, 0, 0.38, 0)])], ['tool', tag(ell(0.055, 0.13, 0.055, 0, 0.5, 0, 0, 6, 5), FLAME, 0, 0, 1), 'glow']],
  umbrella: () => { const u = umbrella(); return [['tool', u.solid], ['tool', u.glow, 'glow']]; },
  // water
  paddle: () => [['tool', join([shaft(WOOD, -0.42, 0.78), blob(WOOD, 0.012, 0.24, 0.075, 0, 0.98, 0)])]],
  oar: () => [['tool', join([shaft(WOOD, -0.42, 2, 0.02), blob(WOOD, 0.012, 0.42, 0.075, 0, 2.38, 0)])]],
  // ritual and trade
  drum: () => [['ground', join([rod(WOOD, [0.36, 0, 0], [0.36, 0.42, 0], 0.13, 0.17, 10), rod(CLOTH, [0.36, 0.42, 0], [0.36, 0.43, 0], 0.172, 0.172, 10)])]],
  bowl: () => [['tool', join([pot(CLAY, BOWL, 0, 0.0, 0), blob(GRAIN, 0.06, 0.02, 0.06, 0, 0.055, 0)])]],
};
/** Where the free hand steadies a load carried on the head or shoulder. */
export const HOLD = { basket: [0.04, 1.87, 0.2], jar: [0.03, 1.92, 0.15], amphora: [0.2, 1.6, 0.17], sack: [0.13, 1.48, 0.17], yoke: [0.3, 1.52, 0.15] };
