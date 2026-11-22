// Everything that moves: animals, people and vehicles.
import * as THREE from 'three';
import { rng } from './util.js?v=c0a40a57';
import { buildAnimals } from './animals.js?v=c0a40a57';
import { buildPeople } from './people.js?v=c0a40a57';
import { buildVehicles } from './vehicles.js?v=c0a40a57';

export { staticPerson } from './people.js?v=c0a40a57';

const _vp = new THREE.Matrix4(), _view = { frustum: new THREE.Frustum(), eye: new THREE.Vector3() };
/** The camera's frustum and position, for culling instanced travellers. */
export function viewOf(camera) {
  _view.frustum.setFromProjectionMatrix(_vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  _view.eye.copy(camera.position); return _view;
}

export function buildFauna(world, scene) {
  const herd = buildAnimals(world, scene);
  const people = buildPeople(world, scene, rng(4242));
  const { movers: vehicles, fleets } = buildVehicles(world, scene, rng(777));
  const movers = [...people, ...vehicles];
  return {
    herd, movers,
    update(u, t, camera) {
      herd.update(u, t);
      const view = camera ? viewOf(camera) : null;
      for (const f of fleets) for (const it of f.items) it.alt = world.sea;
      for (const m of movers) m.update(u, t, view);
    },
  };
}
