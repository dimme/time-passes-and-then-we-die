// Places. The timeline is shown wherever each age was most pronounced: STAGES says which place is on
// screen for which years. "home" is Manhattan, built by flora / fauna / city; every other place is a
// module in src/site-*.js with this shape:
//
//   export default {
//     place: 'Egypt · Giza',                         // shown top right
//     coords: [29.98, 31.13],                        // latitude, longitude (for the globe)
//     terrain: { base(x, z), relief(x, z), bounds: { x, z } },   // metres; height = base + env.hill × relief
//     spawn: { x, z, yaw },                          // where the visitor arrives (yaw 0 = facing −z)
//     env(year, env) {},                             // adjust the interpolated environment in place
//     events: [{ y, t, h, w }],                      // captions: year, title, here, wider world
//     build({ world, group }) → { update(u, t, env, camera, view), collide?(pos), floorAt?(x, z) },   // floorAt: height of walkable platforms (−Infinity where none)
//   }
//
// A module without `build` is a placeholder: its years stay in Manhattan until it is written.
import * as THREE from 'three';
import { MANHATTAN } from './world.js';
import africa from './site-africa.js';
import cave from './site-cave.js';
import crescent from './site-crescent.js';
import sumer from './site-sumer.js';
import egypt from './site-egypt.js';
import greece from './site-greece.js';
import rome from './site-rome.js';
import medieval from './site-medieval.js';
import manchester from './site-manchester.js';

export const SITES = { africa, cave, crescent, sumer, egypt, greece, rome, medieval, manchester };
const NY = [40.71, -74.01];
/**
 * Before people, the "home" landscape stands for the place each age is best known from: [from year, name,
 * where that is today, where it was then]. Entries with NY are Manhattan itself, which rides its plate (see
 * space.js); entries with no position are too old for any reconstruction.
 */
const HOME_PLACES = [
  [-Infinity, 'The newborn Earth'], [-4.25e9, 'A shore of the first ocean'], [-3.6e9, 'Pilbara · Western Australia'], [-2.45e9, 'Hamersley · Western Australia'],
  [-2.34e9, 'The Huronian ice · Ontario'], [-2.1e9, 'A bare shore of an early continent'], [-1.2e9, 'The Grenville mountains · where New York will be', NY],
  [-760e6, 'Under the ice of Snowball Earth'], [-632e6, 'Ediacara Hills · South Australia', [-31.3, 138.6], [15.03, 124.26]],
  [-545e6, 'A shore of Laurentia · the future New York', NY], [-400e6, 'Gilboa · New York', [42.4, -74.4], [-31.84, -60.26]],
  [-345e6, 'Mazon Creek · Illinois', [41.3, -88.3], [-0.29, -20.61]], [-300e6, 'The Texas red beds · Pangaea', [33.6, -99.3], [3.1, -29.28]],
  [-262e6, 'Karoo Basin · South Africa', [-32, 24], [-57.77, -22.27]], [-240e6, 'Ischigualasto · Argentina', [-30.1, -67.9], [-42.8, -31.32]],
  [-205e6, 'The Newark rift · New York and New Jersey', NY], [-165e6, 'Morrison plains · western North America', [39.6, -105.2], [35.99, -33.42]],
  [-110e6, 'The western interior · North America', [47.5, -106.9], [51.9, -55.86]], [-70e6, 'Hell Creek · Montana', [47.5, -106.9], [54.38, -67.67]],
  [-60e6, 'Bighorn Basin · Wyoming', [41.5, -109.5], [46.46, -80.43]], [-40e6, 'The Badlands · South Dakota', [43.8, -102.3], [44.51, -82.62]],
  [-7e6, 'Manhattan · New York', NY], [1.1e9, 'What is left of the Earth'],
].map(([from, place, coords, paleo]) => ({ from, place, coords: coords || null, paleo: paleo || null, home: coords === NY, elevator: coords === NY }));
function homeAt(year) { let h = HOME_PLACES[0]; for (const p of HOME_PLACES) if (p.from <= year) h = p; else break; return h; }

/** [from year, site id] in order; a stage lasts until the next one begins. */
export const STAGES = [
  [-Infinity, 'home'], [-7e6, 'africa'], [-70e3, 'cave'], [-14e3, 'home'], [-9600, 'crescent'], [-4000, 'sumer'],
  [-2700, 'egypt'], [-1250, 'greece'], [-150, 'rome'], [500, 'medieval'], [1500, 'home'], [1770, 'manchester'], [1840, 'home'],
];
export function siteIdAt(year) { let id = 'home'; for (const [from, s] of STAGES) if (from <= year) id = s; else break; return id; }

const FADE = 0.28;   // seconds of darkness either side of a journey

/** Decides which place is on screen, carries the visitor there, and keeps each place's content updated. */
export class Travel {
  /** home: { group, update(u, t, env, camera, view), collide(pos) } */
  constructor({ world, scene, home, player, onArrive }) {
    Object.assign(this, { world, scene, home, player, onArrive });
    this.follow = true;             // (tests may switch this off to hold the view in Manhattan)
    this.year = 2026; this.id = 'home'; this.active = null; this.built = {}; this.fade = 0; this.dir = 0; this.pending = null;
    this.homePos = null; this.veil = document.getElementById('veil'); this.veilText = document.getElementById('veiltext');
  }
  get atHome() { return this.id === 'home'; }
  get site() { return this.atHome ? homeAt(this.year) : SITES[this.id]; }
  wanted(year) { const id = this.follow ? siteIdAt(year) : 'home'; return id !== 'home' && !SITES[id].build ? 'home' : id; }

  _go(id) {
    const { world, player } = this;
    if (this.atHome) this.homePos = { ...player.pos, yaw: player.yaw };
    if (this.active && this.active.group) this.active.group.visible = false;
    this.id = id;
    if (id === 'home') {
      this.active = null; this.home.group.visible = true; world.setProfile(MANHATTAN); world.floorAt = null;
      player.collide = this.home.collide;
      if (this.homePos) { player.pos.x = this.homePos.x; player.pos.z = this.homePos.z; player.yaw = this.homePos.yaw; }
    } else {
      const site = SITES[id]; this.home.group.visible = false; world.deck = null;
      world.setProfile(site.terrain);
      if (!this.built[id]) { const group = new THREE.Group(); this.scene.add(group); this.built[id] = { group, ...site.build({ world, group }) }; }
      this.active = this.built[id]; this.active.group.visible = true;
      player.collide = this.active.collide || null; world.floorAt = this.active.floorAt || null;
      player.pos.x = site.spawn.x; player.pos.z = site.spawn.z; player.yaw = site.spawn.yaw; player.pitch = 0.05;
    }
    player.pos.y = world.heightAt(player.pos.x, player.pos.z) + 1.7;
    if (this.onArrive) this.onArrive(this.site);
  }

  /** Call first each frame. Starts or continues a journey when the timeline has moved to another place. */
  update(year, dt) {
    this.year = year;
    const want = this.wanted(year);
    if (want !== this.id && this.dir === 0) { this.dir = 1; this.pending = want; this.veilText.textContent = (want === 'home' ? homeAt(year) : SITES[want]).place; }
    if (this.dir === 1) {
      this.fade = Math.min(1, this.fade + dt / FADE);
      if (this.fade >= 1) { this._go(this.wanted(year)); this.dir = -1; }
    } else if (this.dir === -1) {
      this.fade = Math.max(0, this.fade - dt / FADE);
      if (this.fade <= 0) this.dir = 0;
    }
    this.veil.style.opacity = this.fade; this.veil.style.display = this.fade > 0 ? 'flex' : 'none';
  }
  /** The place's own light, ground, water and weather, laid over the timeline's. */
  applyEnv(year, env) { if (!this.atHome && this.site.env) this.site.env(year, env); }
  /** The caption for this year, if the place has its own. */
  eventAt(year) {
    const ev = this.atHome ? null : this.site.events; if (!ev || !ev.length) return null;
    let e = ev[0]; for (const x of ev) if (x.y <= year + 1e-6) e = x; else break; return e;
  }
  updateContent(u, t, env, camera, view) {
    if (this.atHome) this.home.update(u, t, env, camera, view);
    else this.active.update(u, t, env, camera, view);
  }
}
