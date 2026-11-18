// Everything that moves: animals, people and vehicles.
import { rng } from './util.js';
import { buildAnimals } from './animals.js';
import { buildPeople } from './people.js';
import { buildVehicles } from './vehicles.js';

export { staticPerson } from './people.js';

export function buildFauna(world, scene) {
  const herd = buildAnimals(world, scene);
  const people = buildPeople(world, scene, rng(4242));
  const { movers: vehicles, fleets } = buildVehicles(world, scene, rng(777));
  const movers = [...people, ...vehicles];
  return {
    herd, movers,
    update(u, t) {
      herd.update(u, t);
      for (const f of fleets) for (const it of f.items) it.alt = world.sea;
      for (const m of movers) m.update(u, t);
    },
  };
}
