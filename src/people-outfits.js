// What people wore: each outfit dresses the body for its time and place, with real shape rather than paint.
import { hex, WHITE } from './organic.js';
import { BODY, LEG, ARM, SKIRT, HOLD, ANKLE, sm, tag, loft, ell, join, torso, torsoAt, ARM_RINGS, LEG_RINGS, limb, hand, shoe, head, shell, hairline } from './people-body.js';
import { umbrella } from './people-props.js';

const HAIR = hex(0x3a2a1c), LEATHER = hex(0x2a1c14), SOLE = hex(0x14100c), LINEN = hex(0xe8e2d4), FELT = hex(0x1c1a18), BUCKSKIN = hex(0x9a7448), EYE = hex(0xe6e2dc), IRIS = hex(0x2a1a10);
const FUR = hex(0x8a7458), BRONZE = hex(0xb08434), STEEL = hex(0x9a9ea4), MAIL = hex(0x6a6e74), GOLD = hex(0xc8a040), LAPIS = hex(0x1c3a8a), TURQ = hex(0x2a8a84), ROPE = hex(0xa89868);
const dark = (c, k) => c.map((v) => v * k);

/** Tuck part of a garment under the skin, leaving a neckline or a bare shoulder: where(y, z, x) is true for what goes. */
function cut(g, where) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (where(p.getY(i), p.getZ(i), p.getX(i))) p.setXYZ(i, p.getX(i) * 0.7, p.getY(i), p.getZ(i) * 0.7);
  g.computeVertexNormals(); return g;
}
/** An uneven hem: hides and fleece do not hang straight. */
function ragged(g, hem, amp, n) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < hem + 0.03) p.setY(i, p.getY(i) + amp * Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * n + 1));
  g.computeVertexNormals(); return g;
}
/** Horizontal stripes of two fixed colours. */
function striped(g, a, b, step) {
  const p = g.attributes.position, c = g.attributes.color;
  for (let i = 0; i < p.count; i++) c.setXYZ(i, ...(Math.floor(p.getY(i) / step) % 2 ? a : b));
  return g;
}
/** Neckline of a garment pinned on the left shoulder only, leaving the right shoulder and arm free. */
const oneShoulder = (y, z) => y > 1.3 + 0.55 * (0.1 - z);
/** A hood or helmet covers the skull but leaves the face open in front of `open` (0 = ears, 1 = nose). */
const hooded = (open) => (dx, dy) => sm(-0.05, 0.07, open - dx + 0.3 * Math.max(0, -dy - 0.3));
const crown = (rings, c, fixed = 1) => tag(loft(rings.map(([y, rx, rz]) => [-0.006, y, 0, rx, rz]), { segs: 16, cap: 'top' }), c, BODY, 0, fixed);
const brim = (rx, rz, c, tilt = 0, fixed = 1) => tag(ell(rx, 0.007, rz, -0.006, 1.7, 0, tilt, 18, 4), c, BODY, 0, fixed);

/**
 * f: 1 = female build. coat: hem height of the upper garment (it follows the legs below the hips); without one the torso is bare.
 * sleeve: cuff height (2 = sleeveless). legs: 'trousers' | 'breeches' | 'bare' | 'none'. skirt: hem height of a skirt in the trouser colour.
 * hair: 'short' | 'bob' | 'long' | 'bun' | 'wig' | 'tonsure' | 'none'. feet: 'bare' | 'sandal' (shoes otherwise). cut: neckline, see cut().
 * under: the coat takes the `legs` tint, leaving `tint` for what is draped over it. extra(K): pieces only this outfit has.
 * kit: this outfit's own versions of the props an action asks for.
 */
export const OUTFITS = {
  modern: { coat: 0.87, grow: 0.014, collar: 1, hair: 'short', shoes: [hex(0x8a8a8a), LINEN] },
  longhair: { f: 1, coat: 0.9, grow: 0.008, hair: 'long', slim: 1 },
  suit: { buttons: 2, coat: 0.82, grow: 0.014, flare: 0.25, shirt: 1, hat: 'fedora', hair: 'short', cuffs: 1 },
  skirt: { f: 1, coat: 1.04, grow: 0.01, collar: 1, skirt: 0.5, legs: 'bare', hair: 'bob' },
  hat: { buttons: 4, coat: 0.53, grow: 0.016, flare: 0.5, shirt: 1, hat: 'top', hair: 'short' },
  colonial: { buttons: 6, coat: 0.56, grow: 0.018, flare: 0.6, falling: 1, legs: 'breeches', hat: 'brim', hair: 'bob', shoes: [LEATHER, SOLE, hex(0xb8b0a0)] },
  dress: { f: 1, coat: 1.04, grow: 0.008, falling: 1, skirt: 0.04, legs: 'none', hat: 'coif', hair: 'short', puff: 0.01, spread: 0.035, stride: 1 },
  robe: { coat: 0.98, grow: 0.022, skirt: 0.07, legs: 'none', hair: 'short', wide: 0.12, sash: 1, cowl: 1, spread: 0.02, stride: 1.05, shoes: [LINEN, hex(0x8a8478)] },
  native: { coat: 0.68, grow: 0.012, flare: 0.5, sleeve: 1.22, hair: 'long', band: 1, sash: 1, fringe: 1, shoes: [BUCKSKIN, hex(0x5a4028)], soft: 1 },

  // the first people, East Africa: a hide wrap and little else
  paleo: { bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'short', beard: 1, extra: (K) => K.top.push(ragged(K.wrap(0.63, 1.04, 0.014, 0.3), 0.63, 0.035, 5)) },
  'paleo-f': { f: 1, coat: 0.58, grow: 0.012, flare: 0.3, cut: oneShoulder, ragged: 1, bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'short' },
  // ice-age Europe: sewn reindeer hide with fur trim, hood, leggings and boots
  iceage: { coat: 0.66, grow: 0.03, flare: 0.3, puff: 0.014, thick: 0.012, hat: 'hood', cowl: 1, beard: 1, hair: 'short', boots: 0.4, shoes: [dark(FUR, 0.6), SOLE], stride: 1.2, extra: furTrim },
  'iceage-f': { f: 1, coat: 0.52, grow: 0.03, flare: 0.3, puff: 0.014, thick: 0.012, hat: 'hood', cowl: 1, hair: 'short', boots: 0.4, shoes: [dark(FUR, 0.6), SOLE], stride: 1.15, extra: furTrim },
  // the first farmers of the Fertile Crescent: belted tunics of wool and flax
  neolithic: { coat: 0.56, flare: 0.32, sleeve: 1.27, sash: 1, legs: 'bare', feet: 'bare', hair: 'bob', beard: 1 },
  'neolithic-f': { f: 1, coat: 0.3, flare: 0.22, sleeve: 1.25, sash: 1, legs: 'bare', feet: 'bare', hair: 'bun', stride: 1.1 },
  // Sumer: wool skirts with a tufted hem, the long fleece kaunakes for temple and court, women's robes pinned on one shoulder
  sumerian: { bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'none', extra: (K) => K.top.push(K.wrap(0.52, 1.06, 0.014, 0.2), K.tier(0.43, 0.55, 0.3), K.band(1.02, 1.075, 0.022, dark(WHITE, 0.8), 0)) },
  'sumerian-priest': { bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'none', stride: 1.05,
    extra: (K) => { for (let i = 0; i < 5; i++) K.top.push(K.tier(0.92 - i * 0.165, 1.08 - i * 0.165, 0.16 + i * 0.03)); K.top.push(K.band(1.03, 1.085, 0.024, dark(WHITE, 0.8), 0)); } },
  'sumerian-f': { f: 1, coat: 0.2, grow: 0.014, flare: 0.14, cut: oneShoulder, bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'bun', fillet: 1, stride: 1, extra: (K) => K.top.push(K.tier(0.12, 0.24, 0.18)) },
  // Egypt: white linen, kilts for men and sheath dresses for women, wigs and broad collars for those who could afford them
  egyptian: { bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'short', extra: (K) => K.top.push(K.wrap(0.6, 1.04, 0.012, 0.2), K.band(1, 1.045, 0.018, dark(WHITE, 0.85), 0), tag(ell(0.012, 0.11, 0.05, 0.118, 0.92, 0, 0.06), dark(WHITE, 0.9), SKIRT, 1)) },
  'egyptian-f': { f: 1, coat: 0.15, grow: 0.008, flare: 0.05, cut: (y) => y > 1.36, bare: 1, sleeve: 2, legs: 'bare', feet: 'bare', hair: 'wig', stride: 0.95,
    extra: (K) => { for (const s of [1, -1]) K.top.push(tag(ell(0.108, 0.11, 0.022, 0.004, 1.352, s * 0.08), WHITE)); K.top.push(collar(K)); } },
  overseer: { bare: 1, sleeve: 2, legs: 'bare', feet: 'sandal', hair: 'wig', short: 1,
    extra: (K) => K.top.push(K.wrap(0.42, 1.04, 0.014, 0.3), K.band(1, 1.05, 0.02, dark(WHITE, 0.85), 0), tag(loft([[0.12, 1, 0, 0.012, 0.05], [0.17, 0.75, 0, 0.012, 0.11], [0.2, 0.5, 0, 0.012, 0.17]], { segs: 8, n: 4, cap: 'bottom' }), WHITE, SKIRT, 1), collar(K)) },
  pharaoh: { bare: 1, sleeve: 2, legs: 'bare', feet: 'sandal', hair: 'none', hat: 'nemes', beard: 3,
    extra: (K) => K.top.push(K.wrap(0.58, 1.04, 0.013, 0.24), K.band(1, 1.05, 0.02, GOLD), tag(loft([[0.125, 1, 0, 0.012, 0.045], [0.16, 0.6, 0, 0.012, 0.08]], { segs: 8, n: 4, cap: 'bottom' }), GOLD, SKIRT, 1, 1), collar(K)) },
  // Greece: the working man's exomis, the woman's peplos, the citizen's himation, the hoplite's bronze
  greek: { coat: 0.58, flare: 0.36, cut: oneShoulder, bare: 1, sleeve: 2, sash: 1, legs: 'bare', feet: 'bare', hair: 'short', beard: 1 },
  'greek-f': { f: 1, coat: 0.1, flare: 0.17, sleeve: 2, sash: 1, legs: 'bare', feet: 'sandal', hair: 'bun', fillet: 1, stride: 1.05, extra: (K) => K.top.push(K.wrap(0.97, 1.47, 0.026, 0, dark(WHITE, 0.92))) },
  himation: { coat: 0.3, under: 1, flare: 0.2, sleeve: 1.3, legs: 'bare', feet: 'sandal', hair: 'short', beard: 1, stride: 1.1, extra: (K) => drape(K, K.top, 0.34, 0.034) },
  hoplite: { coat: 0.68, flare: 0.5, sleeve: 1.3, legs: 'bare', feet: 'sandal', hair: 'none', extra: (K) => {
    K.metal.push(K.band(1, 1.478, 0.022, BRONZE), K.cap((dx, dy, dz) => 1 - Math.max(sm(0.45, 0.6, dx) * sm(0.22, 0.1, Math.abs(dy - 0.05)), sm(0.45, 0.6, dx) * sm(0.24, 0.14, Math.abs(dz)) * sm(0.1, 0, dy)), 0.022, BRONZE, 1));
    K.top.push(K.wrap(0.72, 1.01, 0.03, 0.55, LINEN, 1), tag(ell(0.17, 0.075, 0.016, -0.03, 1.8, 0, -0.22, 10, 6), WHITE));   // linen flaps below the cuirass; a horsehair crest
    for (const s of [1, -1]) K.metal.push(K.shin(s, 0.1, 0.53, 0.012, BRONZE, 1));
  } },
  // Rome: belted tunic, the matron's stola and palla, the citizen's toga, the legionary's banded armour
  roman: { coat: 0.52, flare: 0.36, sleeve: 1.22, sash: 1, legs: 'bare', feet: 'sandal', hair: 'short' },
  'roman-f': { f: 1, coat: 0.09, flare: 0.18, sleeve: 1.25, sash: 1, legs: 'bare', feet: 'sandal', hair: 'bun', stride: 1.05, extra: (K) => drape(K, K.bottom, 0.5, 0.03) },
  toga: { coat: 0.5, under: 1, flare: 0.3, sleeve: 1.22, legs: 'bare', hair: 'short', stride: 1.05, extra: (K) => drape(K, K.top, 0.24, 0.036) },
  legionary: { coat: 0.62, flare: 0.45, sleeve: 1.3, legs: 'bare', feet: 'sandal', hair: 'short', extra: (K) => {
    for (let i = 0; i < 6; i++) K.metal.push(K.band(1.01 + i * 0.072, 1.1 + i * 0.072, 0.019 + (i % 2) * 0.005, STEEL));
    for (const s of [1, -1]) K.metal.push(tag(ell(0.075, 0.03, 0.07, 0, 1.452, s * 0.15, 0, 8, 5), STEEL, BODY, 0, 1), tag(ell(0.012, 0.055, 0.03, 0.05, 1.6, s * 0.083), STEEL, BODY, 0, 1));
    K.metal.push(K.cap((dx, dy) => Math.max(sm(0.22, 0.4, dy), sm(0, 0.25, -dx) * sm(-0.8, -0.6, dy)), 0.018, STEEL, 1), tag(ell(0.075, 0.008, 0.105, -0.115, 1.578, 0, 0.4, 10, 4), STEEL, BODY, 0, 1), tag(ell(0.014, 0.012, 0.085, 0.092, 1.69, 0), STEEL, BODY, 0, 1));
    K.top.push(K.band(0.985, 1.035, 0.03, LEATHER), tag(loft([[0.125, 1, 0, 0.012, 0.07], [0.15, 0.76, 0, 0.012, 0.08]], { segs: 8, n: 4, cap: 'bottom' }), LEATHER, SKIRT, 1, 1));   // belt and its apron of studded straps
  }, kit: { shield: 'scutum', spear: 'pilum' } },
  // medieval Europe: tunic, hose and hood; kirtle and veil; the monk's habit; mail, surcoat and helm
  medieval: { coat: 0.6, flare: 0.42, grow: 0.014, sash: 1, slim: 1, soft: 1, hat: 'hood', cowl: 1, hair: 'short' },
  'medieval-f': { f: 1, coat: 1.04, grow: 0.01, skirt: 0.05, legs: 'none', hat: 'veil', hair: 'short', spread: 0.035, stride: 1, soft: 1,
    extra: (K) => K.top.push(tag(loft([[0.115, 1.06, 0, 0.02, 0.1], [0.225, 0.75, 0, 0.02, 0.15], [0.3, 0.45, 0, 0.02, 0.18]], { segs: 8, n: 4, cap: 'bottom' }), LINEN, SKIRT, 0.55, 1)) },
  monk: { coat: 0.98, grow: 0.022, skirt: 0.07, legs: 'none', hair: 'tonsure', wide: 0.12, sash: 1, rope: 1, cowl: 1, spread: 0.02, stride: 1.05, feet: 'sandal' },
  knight: { coat: 0.56, flare: 0.4, grow: 0.018, mail: 1, slim: 1, hair: 'none', extra: (K) => {
    K.top.push(K.wrap(0.5, 1.47, 0.032, 0.45), K.band(0.99, 1.04, 0.036, LEATHER));   // surcoat over the hauberk
    K.metal.push(K.cap(hooded(0.45), 0.014, MAIL, 1), K.band(1.4, 1.5, 0.03, MAIL), crown([[1.675, 0.104, 0.091], [1.74, 0.095, 0.083], [1.8, 0.062, 0.054], [1.835, 0.012, 0.012]], STEEL), tag(ell(0.008, 0.05, 0.013, 0.1, 1.64, 0), STEEL, BODY, 0, 1));
  }, kit: { shield: 'kite' } },
  // the neon megacity: a glossy hooded rain cape with a light strip at the hem
  raincoat: { coat: 0.42, grow: 0.028, flare: 0.5, wide: 0.1, hat: 'hood', cowl: 1, hair: 'short', gloss: 1, extra: (K) => K.glow.push(K.wrap(0.42, 0.45, 0.034, 0.5)) },
  'raincoat-f': { f: 1, coat: 0.42, grow: 0.026, flare: 0.5, wide: 0.1, hat: 'hood', cowl: 1, hair: 'short', gloss: 1, extra: (K) => K.glow.push(K.wrap(0.42, 0.45, 0.032, 0.5)) },
  // the same under an umbrella, for the street walkers: the walk shader keeps the right arm raised, and the umbrella rides with the body
  umbrella: { coat: 0.42, grow: 0.028, flare: 0.5, wide: 0.1, hat: 'hood', cowl: 1, hair: 'short', gloss: 1, hold: 1, walkOnly: 1, extra: (K) => {
    const u = umbrella(); K.glow.push(K.wrap(0.42, 0.45, 0.034, 0.5), tag(u.glow.translate(0.352, 1.242, K.armZ + 0.033), WHITE)); K.hair.push(tag(u.solid.translate(0.352, 1.242, K.armZ + 0.033), FELT, BODY, 0, 1));
  } },
};
function furTrim(K) {
  K.top.push(K.wrap(K.o.coat - 0.02, K.o.coat + 0.045, 0.046, 0.3, FUR, 1), K.cap((dx, dy) => sm(0.16, 0.04, Math.abs(0.46 - dx + 0.3 * Math.max(0, -dy - 0.3))), 0.05, FUR, 1));
  for (const s of [1, -1]) K.top.push(K.sleeve(s, 0.895, 0.95, 0.036, FUR, 1));
}
/** The broad bead collar (wesekh). */
const collar = (K) => striped(tag(loft([[-0.008, 1.5, 0, 0.066, 0.07], [-0.004, 1.455, 0, 0.09, 0.115], [0.002, 1.4, 0, 0.118, 0.158]], { segs: 14, sub: 2 }), GOLD, BODY, 0, 1), TURQ, GOLD, 0.02);
/** A mantle (himation, toga, palla) wound round the body: over the left shoulder and arm, under the right arm. */
function drape(K, to, hem, grow) {
  to.push(tag(cut(torso(K.f, hem, 1.494, grow, { flare: 0.2, cap: 'bottom' }), oneShoulder), WHITE, SKIRT, 1), K.sleeve(-1, 1.04, 1.462, grow));
}

/** Returns { top, bottom, skin, hair, metal?, glow? } geometries, facing +x, plus the stride the outfit allows. */
export function personGeo(variant) {
  const o = OUTFITS[variant], f = o.f || 0, top = [], bottom = [], skin = [], hair = [], metal = [], glow = [], grow = o.grow || 0.012;
  const armZ = (f ? 0.158 : 0.178) + (o.spread || 0), armK = f ? 0.86 : 1, legZ = f ? 0.09 : 0.088, legK = f ? 0.96 : 1;
  const fn = (g) => (typeof g === 'function' ? g : () => g), arm = (g, s, c = WHITE, fixed = 0) => tag(g, c, o.hold && s > 0 ? HOLD : ARM, s * armZ, fixed);
  const K = {
    o, f, top, bottom, skin, hair, metal, glow, armZ,
    /** cloth hanging between two heights; below the hips it follows the legs */
    wrap: (y0, y1, g, flare, c = WHITE, fixed = 0) => tag(torso(f, y0, y1, g, { flare, cap: 'bottom' }), c, SKIRT, 1, fixed),
    /** a flounce of fleece or fringe, wider at its ragged lower edge */
    tier: (y0, y1, flare) => tag(ragged(loft([torsoAt(f, y1, 0.012, flare), torsoAt(f, (y0 + y1) / 2, 0.026, flare), torsoAt(f, y0, 0.036, flare)], { segs: 16, sub: 2, cap: 'bottom' }), y0, 0.022, 8), dark(WHITE, 0.9), SKIRT, 1),
    band: (y0, y1, g, c, fixed = 1) => tag(torso(f, y0, y1, g, { flare: 0 }), c, BODY, 0, fixed),
    sleeve: (s, y0, y1, g, c = WHITE, fixed = 0) => arm(limb(ARM_RINGS, s, armZ, y0, y1, { k: armK, grow: fn(g), cap: 'both' }), s, c, fixed),
    shin: (s, y0, y1, g, c = WHITE, fixed = 0, cap = '') => tag(limb(LEG_RINGS, s, legZ, y0, y1, { k: legK, grow: fn(g), cap }), c, LEG, s, fixed),
    cap: (mask, thick, c = WHITE, fixed = 0) => tag(shell(mask, thick), c, BODY, 0, fixed),
  };
  const coat = o.mail ? metal : o.under ? bottom : top, cloth = o.mail ? MAIL : WHITE, cf = o.mail ? 1 : 0;

  // upper garment, hem to collar; anything below the hips swings with the thighs
  if (o.coat) {
    const g = torso(f, o.coat, 1.494, grow, { flare: o.flare || 0.12, cap: 'bottom' });
    if (o.cut) cut(g, o.cut);
    if (o.ragged) ragged(g, o.coat, 0.03, 5);
    coat.push(tag(g, cloth, SKIRT, 1, cf));
  }
  if (o.bare) skin.push(tag(torso(f, 0.9, 1.494, 0), WHITE));
  if (o.collar) top.push(tag(loft([[-0.008, 1.47, 0, 0.082, 0.094], [-0.01, 1.5, 0, 0.071, 0.075], [-0.01, 1.516, 0, 0.066, 0.069]], { segs: 12 }), dark(WHITE, 0.82)));
  if (o.cowl) top.push(tag(loft([[-0.01, 1.42, 0, 0.11, 0.15], [-0.014, 1.47, 0, 0.1, 0.12], [-0.02, 1.52, 0, 0.085, 0.09], [-0.02, 1.535, 0, 0.07, 0.074]], { segs: 12 }), dark(WHITE, 0.9)));
  if (o.falling) top.push(tag(torso(f, 1.385, 1.5, grow + 0.012, { cap: 'bottom' }), LINEN, BODY, 0, 1));   // broad linen collar / kerchief
  if (o.shirt) {   // shirt front and collar showing between the lapels, with a dark tie
    const front = (y) => { const t = torsoAt(f, y, grow); return t[0] + t[3]; }, cx = front(1.41), tilt = Math.atan2(front(1.31) - front(1.46), 0.15);
    top.push(tag(ell(0.018, 0.075, 0.034, cx - 0.007, 1.412, 0, tilt), LINEN, BODY, 0, 1), tag(ell(0.018, 0.06, 0.011, cx - 0.002, 1.41, 0, tilt), FELT, BODY, 0, 1),
      tag(loft([[-0.009, 1.478, 0, 0.074, 0.08], [-0.01, 1.52, 0, 0.062, 0.064]], { segs: 12 }), LINEN, BODY, 0, 1));
  }
  for (let i = 0; i < (o.buttons || 0); i++) { const y = 1.24 - i * 0.075, t = torsoAt(f, y, grow, o.flare || 0.12); top.push(tag(ell(0.006, 0.011, 0.011, t[0] + t[3], y, 0, 0, 6, 4), o.buttons > 3 ? hex(0xa08a50) : FELT, BODY, 0, 1)); }
  if (o.sash) coat.push(tag(torso(f, 0.99, 1.05, grow + 0.008, { flare: 0 }), o.band ? LEATHER : o.rope ? ROPE : dark(WHITE, 0.55), BODY, 0, o.band || o.rope ? 1 : 0));
  if (o.fringe) top.push(tag(torso(f, o.coat - 0.05, o.coat + 0.005, grow + 0.004, { flare: (o.flare || 0) + 0.12 }), dark(WHITE, 0.7), SKIRT, 1));

  const legs = o.legs || 'trousers';
  for (const s of [1, -1]) {
    // arms: sleeve to the cuff, bare forearm below a short sleeve, then the hand
    const cuff = o.sleeve || 0.895, wide = (y) => grow * 0.7 + (o.puff || 0) + (o.wide || 0) * sm(1.4, 0.9, y) * 0.5;
    if (cuff < 1.45) coat.push(K.sleeve(s, cuff, 1.462, wide, cloth, cf));
    if (o.cuffs || o.falling) top.push(arm(limb(ARM_RINGS, s, armZ, cuff, cuff + 0.024, { k: armK, grow: (y) => wide(y) + 0.006, cap: 'bottom' }), s, LINEN, 1));
    if (cuff > 0.9) skin.push(arm(limb(ARM_RINGS, s, armZ, 0.885, Math.min(cuff + 0.03, 1.462), { k: armK, cap: cuff > 1.45 ? 'top' : '' }), s));
    skin.push(...hand(s, armZ, armK).map((g) => arm(g, s)));

    // legs
    const L = (y0, y1, g, cap) => limb(LEG_RINGS, s, legZ, y0, y1, { k: legK, grow: g, cap });
    if (legs === 'trousers') (o.mail ? metal : bottom).push(tag(L(0.062, 0.98, (y) => (o.slim ? 0.005 : 0.009 + 0.02 * sm(0.42, 0.1, y)) + (o.slim ? 0.012 : 0.004) * sm(0.2, 0.07, y) + (o.thick || 0), 'bottom'), cloth, LEG, s, cf));
    if (legs === 'breeches') bottom.push(tag(L(0.44, 0.98, (y) => 0.012 + 0.006 * sm(0.5, 0.44, y), 'bottom'), WHITE, LEG, s), tag(L(ANKLE, 0.47, () => 0.002), LINEN, LEG, s, 1));
    if (legs === 'bare') skin.push(tag(L(ANKLE, 0.98, () => 0), WHITE, LEG, s));
    if (legs === 'none') (o.feet ? skin : bottom).push(tag(L(ANKLE, 0.3, () => 0), o.feet ? WHITE : dark(WHITE, 0.5), LEG, s));
    if (o.boots) top.push(K.shin(s, ANKLE, o.boots, 0.016, dark(FUR, 0.6), 1), K.shin(s, o.boots - 0.03, o.boots + 0.02, 0.03, FUR, 1));
    if (o.feet) {   // a bare foot, or one on a leather sole held by a strap
      const g = shoe(s, legZ, WHITE, o.feet === 'sandal' ? SOLE : WHITE, 0.88), rig = g.attributes.aRig, c = g.attributes.color;
      for (let i = 0; i < rig.count; i++) if (c.getX(i) > 0.5) rig.setZ(i, 0);
      skin.push(g);
      if (o.feet === 'sandal') bottom.push(tag(ell(0.02, 0.018, 0.045, 0.045, 0.072, s * (legZ - 0.01), -0.5), LEATHER, LEG, s, 1), K.shin(s, 0.1, 0.125, 0.006, LEATHER, 1));
    } else {
      const [upper, sole, buckle] = o.shoes || [LEATHER, SOLE];
      bottom.push(shoe(s, legZ, upper, sole, o.soft ? 0.9 : 1));
      if (buckle) bottom.push(tag(ell(0.016, 0.01, 0.02, 0.07, 0.078, s * (legZ - 0.01), -0.5), buckle, LEG, s, 1));
    }
  }
  if (legs !== 'none') (legs === 'bare' ? coat : o.mail ? metal : bottom).push(tag(torso(f, 0.8, 1.04, 0.006, { cap: 'both', n: 2.2 }), cloth, BODY, 0, cf));   // seat of the trousers, or a loincloth of the garment's cloth
  if (o.skirt) {
    const w = torsoAt(f, 1.07, 0.022), h = o.skirt, full = h < 0.2, R = (y, rx, rz) => [-0.012 * sm(1.06, 0.9, y), y, 0, rx, rz];
    const rings = full ? [w, R(0.99, 0.125, 0.172), R(0.9, 0.16, 0.19), R(0.75, 0.2, 0.215), R(0.5, 0.265, 0.275), R(0.25, 0.315, 0.325), R(h, 0.345, 0.355)]
      : [w, R(0.99, 0.122, 0.178), R(0.9, 0.132, 0.195), R(0.7, 0.16, 0.215), R(h, 0.19, 0.24)];
    if (o.wide) rings.splice(1, 6, R(0.9, 0.14, 0.19), R(0.5, 0.19, 0.235), R(0.25, 0.22, 0.26), R(h, 0.24, 0.275));   // a robe falls straighter than a dress
    bottom.push(tag(loft(rings, { segs: 16, sub: 2, cap: 'bottom' }), WHITE, SKIRT, full ? 0.55 : 1));
  }

  // neck, head and face
  const { g: skull, faceX } = head(), mid = faceX(1.612, 0);
  skin.push(tag(torso(f, 1.476, 1.59, -0.003, { n: 2 }), WHITE), tag(skull, WHITE),
    tag(loft([[mid - 0.006, 1.662, 0, 0.008, 0.008], [mid - 0.001, 1.63, 0, 0.011, 0.0095], [mid + 0.007, 1.604, 0, 0.016, 0.0155], [mid + 0.002, 1.591, 0, 0.012, 0.0135]], { segs: 8, cap: 'bottom' }), WHITE),   // nose: narrow bridge to a broader tip
    tag(ell(0.007, 0.006, 0.022, faceX(1.57, 0) - 0.001, 1.57, 0), [0.74, 0.44, 0.42]));   // lips
  for (const s of [1, -1]) {
    const ex = faceX(1.647, 0.032);
    skin.push(tag(ell(0.012, 0.03, 0.007, -0.006, 1.634, s * 0.078, 0.2), dark(WHITE, 0.92)),   // ear
      tag(ell(0.006, 0.0068, 0.0145, ex + 0.002, 1.647, s * 0.032), EYE, BODY, 0, 1), tag(ell(0.004, 0.0064, 0.0066, ex + 0.0056, 1.647, s * 0.0315), IRIS, BODY, 0, 1));
    hair.push(tag(ell(0.006, 0.0034, 0.019, faceX(1.667, 0.033) + 0.003, 1.667, s * 0.033), dark(HAIR, 0.8)));   // eyebrow
  }

  // hair and beards
  const tress = (rings, segs = 14) => tag(loft(rings, { segs, sub: 2, cap: 'bottom' }), HAIR);
  if (o.hair === 'tonsure') hair.push(tag(shell((dx, dy, dz) => hairline(-0.07)(dx, dy, dz) * sm(0.8, 0.62, dy), 0.017), HAIR));
  else if (o.hair !== 'none') hair.push(tag(shell(hairline(o.hair === 'short' ? -0.07 : o.hair === 'bun' ? 0.08 : 0.25), o.hair === 'wig' ? 0.028 : 0.017), HAIR));
  if (o.hair === 'bob') hair.push(tag(loft([[-0.022, 1.7, 0, 0.085, 0.086], [-0.032, 1.62, 0, 0.082, 0.096], [-0.04, 1.55, 0, 0.07, 0.1], [-0.045, 1.5, 0, 0.05, 0.085]], { segs: 14, cap: 'bottom' }), HAIR));
  if (o.hair === 'long') hair.push(tag(loft([[-0.022, 1.7, 0, 0.085, 0.086], [-0.035, 1.62, 0, 0.08, 0.097], [-0.055, 1.54, 0, 0.066, 0.104], [-0.088, 1.45, 0, 0.044, 0.118], [-0.112, 1.34, 0, 0.03, 0.105], [-0.118, 1.26, 0, 0.012, 0.06]], { segs: 12, sub: 2, cap: 'bottom' }), HAIR));
  if (o.hair === 'bun') hair.push(tag(ell(0.052, 0.046, 0.054, -0.118, 1.672, 0, 0, 8, 6), HAIR));
  if (o.hair === 'wig') hair.push(tress(o.short ? [[-0.02, 1.71, 0, 0.094, 0.094], [-0.026, 1.62, 0, 0.096, 0.108], [-0.03, 1.535, 0, 0.088, 0.112]] : [[-0.02, 1.71, 0, 0.094, 0.094], [-0.026, 1.62, 0, 0.096, 0.108], [-0.032, 1.5, 0, 0.086, 0.116], [-0.03, 1.4, 0, 0.082, 0.124]]));
  if (o.beard === 1) hair.push(tag(shell((dx, dy) => sm(0.36, 0.56, -dy) * sm(-0.35, 0.05, dx), 0.016), HAIR));
  if (o.beard === 3) hair.push(tag(loft([[0.07, 1.535, 0, 0.015, 0.016], [0.082, 1.44, 0, 0.02, 0.021]], { segs: 8, cap: 'bottom' }), LAPIS, BODY, 0, 1));   // the king's false beard
  if (o.band || o.fillet) hair.push(tag(loft([[-0.004, 1.69, 0, 0.097, 0.081], [-0.004, 1.712, 0, 0.094, 0.078]], { segs: 14 }), o.band ? hex(0x8a2a1c) : LINEN, BODY, 0, 1));

  // hats, hoods and headcloths
  if (o.hat === 'top') hair.push(crown([[1.695, 0.1, 0.086], [1.72, 0.097, 0.083], [1.8, 0.097, 0.083], [1.87, 0.103, 0.089]], FELT), brim(0.15, 0.132, FELT));
  if (o.hat === 'brim') hair.push(crown([[1.695, 0.1, 0.086], [1.75, 0.093, 0.08], [1.82, 0.08, 0.068]], FELT), brim(0.215, 0.205, FELT));
  if (o.hat === 'fedora') top.push(crown([[1.695, 0.1, 0.086], [1.75, 0.098, 0.083], [1.8, 0.092, 0.072], [1.812, 0.07, 0.04]], dark(WHITE, 0.75), 0), brim(0.158, 0.14, dark(WHITE, 0.7), -0.08, 0),
    tag(loft([[-0.006, 1.7, 0, 0.102, 0.088], [-0.006, 1.725, 0, 0.1, 0.086]], { segs: 16 }), FELT, BODY, 0, 1));
  if (o.hat === 'coif') hair.push(tag(shell((dx, dy, dz) => sm(-0.05, 0.1, dy * 0.7 - dx + 0.4 - 0.1 * Math.abs(dz)), 0.026), LINEN, BODY, 0, 1));
  if (o.hat === 'hood') top.push(K.cap(hooded(0.5), 0.028, dark(WHITE, 0.9)));
  if (o.hat === 'veil') hair.push(K.cap(hooded(0.42), 0.02, LINEN, 1), tag(loft([[-0.005, 1.47, 0, 0.072, 0.078], [0, 1.555, 0, 0.07, 0.08]], { segs: 12 }), LINEN, BODY, 0, 1),
    tag(loft([[-0.02, 1.72, 0, 0.09, 0.09], [-0.035, 1.62, 0, 0.088, 0.108], [-0.055, 1.5, 0, 0.07, 0.13], [-0.07, 1.38, 0, 0.05, 0.15]], { segs: 14, sub: 2, cap: 'bottom' }), LINEN, BODY, 0, 1));
  if (o.hat === 'nemes') {   // the striped royal headcloth: wings behind the ears, two lappets on the chest
    const cloth = [K.cap(hooded(0.5), 0.02, GOLD, 1), tag(loft([[-0.02, 1.71, 0, 0.09, 0.1], [-0.03, 1.6, 0, 0.085, 0.145], [-0.04, 1.49, 0, 0.06, 0.155]], { segs: 14, sub: 2, cap: 'bottom' }), GOLD, BODY, 0, 1)];
    for (const s of [1, -1]) cloth.push(tag(loft([[0.03, 1.6, s * 0.085, 0.02, 0.034], [0.05, 1.5, s * 0.098, 0.018, 0.044], [0.088, 1.4, s * 0.09, 0.014, 0.045], [0.104, 1.3, s * 0.085, 0.01, 0.04]], { segs: 8, sub: 2, cap: 'bottom' }), GOLD, BODY, 0, 1));
    hair.push(...cloth.map((g) => striped(g, LAPIS, GOLD, 0.02)));
  }
  if (o.extra) o.extra(K);

  const all = (list) => (list.length ? join(list) : null);
  return { top: all(top), bottom: all(bottom), skin: all(skin), hair: all(hair), metal: all(metal), glow: all(glow), stride: o.stride || 1.3, gloss: !!o.gloss, armZ, f };
}
const cache = {};
export const personOf = (v) => cache[v] || (cache[v] = personGeo(v));
