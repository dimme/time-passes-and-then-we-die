// Egypt · Giza, 2700–1250 BCE: the plateau above the Nile's flood plain, where three pyramids rise and then stand for a thousand years.
import * as THREE from 'three';
import { uToYear } from './timeline.js?v=c0a40a57';
import { shared } from './textures.js?v=c0a40a57';
import { animTime } from './organic.js?v=c0a40a57';
import { C, Parts, masonry, reedTex } from './site-egypt-kit.js?v=c0a40a57';
import { terrain, K1, K2, K3, RH, SLOPE, RAMP, rampScale, builtCourses } from './site-egypt-land.js?v=c0a40a57';
import { Obstacles } from './site-egypt-kit.js?v=c0a40a57';
import { buildMonuments } from './site-egypt-monuments.js?v=c0a40a57';
import { buildPlain } from './site-egypt-plain.js?v=c0a40a57';
import { buildPeople } from './site-egypt-people.js?v=c0a40a57';

const rgb = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const SKY = { top: rgb(0x3a84d8), hor: rgb(0xe6dcc4), sun: rgb(0xfff2d8), ground: rgb(0xd0b381), water: rgb(0x4f6f52), far: rgb(0xc8ac7c), cloudCol: rgb(0xffffff) };
const EVER = [-1e12, 1e12];
/** When each part of the place is there. */
const SPANS = {
  all: EVER, k1build: [K1.y0, K1.y1], k1done: [K1.y1, 1e12], k2done: [K2.y1, 1e12], k3done: [K3.y1, 1e12], building: [K1.y0 - 5, K3.y1],
  knoll: [-1e12, -2545], sphinx: [-2545, 1e12], drift: [-1950, -1400], nk: [-1500, 1e12], nk2: [-1400, 1e12],
  m1: [-2590, 1e12], m2: [-2570, 1e12], m3: [-2540, 1e12], m4: [-2480, 1e12], town: [-2605, -2450], crow: [-2605, 1e12], old: [-1e12, -2150], early: [-1e12, K1.y0],
};

const events = [
  [-2700, 'The plateau', 'A shelf of pale limestone above the flood plain, bare but for a few old tombs of mud brick. Below it the Nile floods every summer and leaves black mud behind; farmers plough it with oxen and cut the barley with flint-toothed sickles.', 'A day\'s walk south, at Saqqara, Imhotep is about to stack six stone benches into the first pyramid, for King Djoser.'],
  [-2600, 'The Great Pyramid begins', 'King Khufu\'s masons level the rock and lay the first courses. Gangs drag two-and-a-half-tonne blocks from the quarry on sledges, a man pouring water on the sand in front of the runners.', 'His father Sneferu built three pyramids before the angle came right. Egypt has had kings for five hundred years already.'],
  [-2585, 'The gangs', 'Some twenty thousand people work here. They are not slaves: they are paid in bread, beer and beef, sleep in barracks below the plateau, and scrawl the names of their crews on the stones — "Friends of Khufu".', 'Boats bring white casing stone across the river from Tura. One foreman, Merer, keeps a logbook; it will be found 4,500 years later.'],
  [-2560, 'Finished', 'Two million three hundred thousand blocks, 146 metres high, cased in white limestone polished until it glares. Nothing taller will be built anywhere for 3,800 years.', 'In Britain, people are dragging bluestones to Stonehenge. Manhattan is forest.'],
  [-2530, 'Khafre and the Sphinx', 'Khufu\'s son builds beside him, on higher ground. In the quarry his masons leave a knoll of rock and carve it into a lion with the king\'s face.', 'On the Indus, Mohenjo-daro is laid out with brick drains. In Sumer, the royal dead of Ur are buried with their servants.'],
  [-2500, 'Menkaure', 'The third pyramid is a tenth the mass of the first, its lower courses cased in red granite floated 800 km down the river from Aswan. The king dies early; his temples are finished in mud brick.', 'The age of giant pyramids is over after three generations. Later kings will build small ones, and they will fall down.'],
  [-2400, 'The priests\' town', 'The builders have gone. Priests keep the dead kings fed: bread, beer and incense, every day, paid for by farms the kings left for the purpose. Nobles cut their tombs in the old quarries.', 'The sarsens of Stonehenge are standing. In Peru, Caral has pyramids of its own.'],
  [-2180, 'The Old Kingdom ends', 'The floods fail for years on end. The court at Memphis loses its grip; the offerings stop, and the temples are stripped. The pyramids were robbed long ago.', 'The same drought breaks the Akkadian empire in Mesopotamia.'],
  [-1900, 'Already old', 'Egypt is one kingdom again, ruled from further south. Kings still build pyramids, of mud brick, and cart away loose stone from Giza to do it. The plateau belongs to the sand and the jackals.', 'Minoan palaces rise on Crete. Hammurabi of Babylon will be born within a century.'],
  [-1650, 'Horses', 'Foreign kings, the Hyksos, rule the delta. They bring things Egypt has never seen: the horse, the chariot, the composite bow.', 'In China, the Shang are casting bronze. On Thera, a volcano is waiting.'],
  [-1400, 'The dream', 'A prince hunting gazelle falls asleep in the shadow of the Sphinx, buried to its neck. It promises him the throne if he clears the sand. He does, becomes Thutmose IV, and sets a slab of granite between its paws to say so.', 'The pyramids are now eleven centuries old — as far behind the prince as the Vikings are behind you.'],
  [-1270, 'The first restorers', 'Egypt is an empire, and Giza a place to visit. Scribes scratch their names on the temples. Ramesses II quarries casing stone here for his own buildings, while his son Khaemwaset goes about restoring the pyramids of his ancestors.', 'Mycenae is at its height. Troy still stands.'],
].map(([y, t, h, w]) => ({ y, t, h, w }));

let eye = null;   // where the visitor is, for the grass

export default {
  place: 'Egypt · Giza', coords: [29.98, 31.13],
  terrain, spawn: { x: 536, z: 356, yaw: 0.95 }, events,
  env(year, e) {
    for (const k in SKY) for (let i = 0; i < 3; i++) e[k][i] = SKY[k][i];
    e.fogD = 0.00052; e.sunEl = 0.98; e.sunI = 2.5; e.amb = 1.05; e.sunSize = 0.035; e.sea = 0; e.ice = -60; e.cloud = 0.1; e.precip = 0; e.glow = 0; e.bloom = 0.2; e.exposure = 0.92; e.grass = 0; e.meteor = 0; e.moonHot = 0;
    for (let i = 0; i < 3; i++) e.lava[i] = 0;
    e.hill = rampScale(year);
  },
  build({ world, group }) {
    const T = shared(), std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, ...o });
    const blocks = masonry({ course: 64, len: [90, 170], joint: 0.42, jw: 3, vary: 0.24, seed: 4, bump: 5.5 }), fine = masonry({ course: 128, len: [180, 300], joint: 0.6, jw: 2.2, vary: 0.1, grain: 0.08, seed: 9, bump: 2.8 });
    const brick = masonry({ course: 16, len: [34, 40], joint: 0.8, jw: 1.5, vary: 0.2, grain: 0.3, seed: 6, bump: 2, stagger: 1 });
    const mats = {
      blocks: std({ map: blocks.map, normalMap: blocks.normalMap }), fine: std({ map: fine.map, normalMap: fine.normalMap, roughness: 0.7 }), brick: std({ map: brick.map, normalMap: brick.normalMap, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 1 }),
      rock: std({ map: T.rockMap, normalMap: T.rockNormal }), plain: std({}), reed: std({ map: reedTex(), roughness: 1, side: THREE.DoubleSide }), sand: world.terrainMat,
      field: std({ roughness: 1, map: T.groundMap, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    };
    mats.cap = mats.blocks.clone(); Object.assign(mats.cap, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -16 });
    mats.ramp = mats.brick.clone(); Object.assign(mats.ramp, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -8 });
    const P = new Parts(SPANS);
    const monuments = buildMonuments({ P, group, mats, world });
    const plain = buildPlain({ P, group, mats, world });
    const people = buildPeople({ world, group, mats });
    P.build(group, mats);
    const O = new Obstacles([...monuments.obstacles, ...plain.obstacles]), inside = monuments.insides;

    // The pyramids are solid, except that you can walk into their passages and chambers, up Khufu's ramp (the ground's relief) onto
    // whatever has been built of it so far, and up the ramps of the other two (obstacles with a top) onto theirs.
    const half = K1.b / 2, last = { x: 0, z: 0, ok: false }; let year = 0;
    const blocked = (x, z, feet) => {
      if (inside.find(x, z, feet) !== null) return false;   // in a passage or a chamber: its own walls keep you in
      if (O.blocked(x, z, feet)) return true;
      for (const K of [K1, K2, K3]) {   // under the ground near a pyramid (the lower passage of Khafre): only inside a passage
        const c = Math.max(Math.abs(x - K.x), Math.abs(z - K.z)) - K.b / 2; if (c < 25 && year >= K.y0 && feet < world.heightAt(x, z) - 0.6) return true;
        if (K === K1 || c > 0.3 || year < K.y0) continue;
        const built = year >= K.y1 ? K.H : (builtCourses(K, year) * K.H) / K.n, k = K.b / 2 / K.H, solid = K.lvl + Math.min(built, (0.3 - c + (year >= K.y1 ? 0.35 : 0)) / k);
        if (built > 0.5 && feet < solid - 0.6) return true;
      }
      const d = half - Math.max(Math.abs(x - K1.x), Math.abs(z - K1.z));
      if (d > -0.3 && year >= K1.y0) { const top = (builtCourses(K1, year) * K1.H) / K1.n;
        if (year >= K1.y1) { if (feet < K1.lvl + (d + 0.35) / (half / K1.H) - 0.6) return true; }   // the finished pyramid: you can stand on what stands outside its face (the stair)
        else if (d > 0 && top > 0.5 && (top > RH + 0.5 || world.hill * terrain.relief(x, z) < Math.min(top, d / SLOPE) - 0.6)) return true; }
      if (year >= K1.y0 && year < K1.y1 && z < RAMP.z0 && z > RAMP.z1) { const ax = Math.abs(x - RAMP.x), h = world.hill * RH * (RAMP.z0 - z) / (RAMP.z0 - RAMP.z1); if (h > 1.2 && ax > RAMP.half && ax < RAMP.half + h / 2 + 8) return true; }   // the ramp's embankments
      return false;
    };
    const api = {
      audit: { O, inside, P, mats, blocked: (x, z, f) => blocked(x, z, f) },   // for the numerical tests of what stops you and what carries you
      floorAt(x, z) { const y = inside.find(x, z, O.feet, 0); return y !== null ? y : O.floorAt(x, z); },
      update(u, t, env, camera, view) {
        year = uToYear(u); O.year = year; eye = camera.position; animTime.value = t;
        monuments.update(year, world.hill); P.update(u); plain.update(u, t, camera, year); people.update(u, t, view, year);
      },
      collide(pos) {
        O.feet = pos.y - 1.7; const f = Math.max(O.feet, world.surfaceAt(last.x, last.z) - 0.05); O.feet = f;   // stand on the floor you were on, even if the eye is still catching up
        if (blocked(pos.x, pos.z, f) && last.ok) { if (!blocked(pos.x, last.z, f)) pos.z = last.z; else if (!blocked(last.x, pos.z, f)) pos.x = last.x; else { pos.x = last.x; pos.z = last.z; } }
        last.x = pos.x; last.z = pos.z; last.ok = !blocked(pos.x, pos.z, f);
      },
    };
    // In the passages below the ground (Khufu's Subterranean Chamber is 30 m down in the rock) the floor of the passage is what the visitor stands on.
    api.underAt = (x, z) => inside.find(x, z, O.feet, 0);
    return api;
  },
};
