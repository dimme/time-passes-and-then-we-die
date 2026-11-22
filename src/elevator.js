// The space elevator of the far future (2990–9600), as a place you can use: the climber car standing at the foot of the
// tether in a plaza in Manhattan, which you walk into; the ride up the tether to geostationary height, 35,786 km, with the
// city and then the Earth outside its windows; and the station up there, where people live, which you can walk round
// before riding back down.
//
// The car and the station are drawn in a small scene of their own, in their own coordinates (the car's floor at the origin,
// its door facing +x). main.js draws the outside first (the city, or the space view from the right height) and this scene
// over it, so the windows show whatever is outside at that altitude.
import * as THREE from 'three';
import { actors } from './people-actors.js?v=740e009b';

export const BASE = { x: 150, z: 150 };          // the ground station: a plaza cleared for it in the garden city
export const YEARS = [2990, 9600];
export const GEO = 35786;                         // km
const R = 3.6, WALL = 0.25, H = 3.2, CONSOLE = 1.15, DOOR = 0.42;   // the car: radius, wall, height; the console round the tether; the door's half-angle
const HUB = 16, HUB_H = 6;                         // the station's hall round the docked car
const CLIMB = 60;                                  // seconds for the ride, either way

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, ...o });
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });

/** A ring wall of `n` panels between angles, with windows between y0 and y1 and solid parts above and below. */
function ringWall(g, r, h, n, { a0 = 0, a1 = Math.PI * 2, skip = () => false, y0 = 0.9, y1 = h - 0.5, frame, glass, wall }) {
  const da = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + 0.5) * da; if (skip(a)) continue;
    const w = 2 * r * Math.sin(da / 2), x = Math.cos(a) * r, z = Math.sin(a) * r, rot = -a + Math.PI / 2;
    const piece = (geo, m, y) => { const p = new THREE.Mesh(geo, m); p.position.set(x, y, z); p.rotation.y = rot; g.add(p); return p; };
    piece(new THREE.BoxGeometry(w + 0.02, y0, WALL), wall, y0 / 2);
    piece(new THREE.BoxGeometry(w + 0.02, h - y1, WALL), wall, (y1 + h) / 2);
    piece(new THREE.PlaneGeometry(w, y1 - y0), glass, (y0 + y1) / 2);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, WALL + 0.06), frame); m.position.set(Math.cos(a0 + i * da) * r, h / 2, Math.sin(a0 + i * da) * r); m.rotation.y = -(a0 + i * da) + Math.PI / 2; g.add(m);
  }
}

/** The climber car: a glass-walled round room with a glass floor, a console round the tether, seats, and a door facing +x. */
function buildCar() {
  const g = new THREE.Group(), white = mat(0xeef3f5), frame = mat(0xb8c4cc, { metalness: 0.7, roughness: 0.3 }), glass = glassMat(), glow = new THREE.MeshBasicMaterial({ color: 0x8adfe8 });
  // a ring of floor plates round a glass centre, and the same over our heads
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(2.6, R, 40).rotateX(-Math.PI / 2), white); g.add(floorRing);
  const glassFloor = new THREE.Mesh(new THREE.RingGeometry(CONSOLE + 0.25, 2.6, 40).rotateX(-Math.PI / 2), glass); glassFloor.position.y = 0.01; g.add(glassFloor);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.06), frame); b.position.set(Math.cos(a) * 1.9, 0.02, Math.sin(a) * 1.9); b.rotation.y = -a; g.add(b); }
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(R, 40).rotateX(Math.PI / 2), white); ceil.position.y = H; g.add(ceil);
  const roof = new THREE.Mesh(new THREE.CircleGeometry(R + 0.1, 40).rotateX(-Math.PI / 2), white); roof.position.y = H + 0.05; g.add(roof);
  const under = new THREE.Mesh(new THREE.CircleGeometry(R + 0.1, 40).rotateX(Math.PI / 2), frame); under.position.y = -0.05; g.add(under);
  const lamp = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.05, 6, 40).rotateX(Math.PI / 2), glow); lamp.position.y = H - 0.05; g.add(lamp);
  // the walls: windows all round except the door
  ringWall(g, R, H, 16, { skip: (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < DOOR, y0: 0.3, frame, glass, wall: white });   // windows down to knee height, to see the ground (and later the Earth) falling away
  for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, WALL + 0.1), frame); j.position.set(Math.cos(s * DOOR) * R, H / 2, Math.sin(s * DOOR) * R); j.rotation.y = -s * DOOR + Math.PI / 2; g.add(j); }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(WALL, H - 2.3, 2 * R * Math.sin(DOOR)), white); lintel.position.set(R * Math.cos(DOOR), (H + 2.3) / 2, 0); g.add(lintel);
  // the door: a curved glass leaf that slides shut for the ride
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 2 * R * Math.sin(DOOR)), new THREE.MeshPhysicalMaterial({ color: 0xa8d8ee, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }));
  door.position.set(R * Math.cos(DOOR) - 0.02, 1.15, 0); g.add(door);
  // the tether through the middle, the console round it with its lit panels, and seats facing out
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, H + 0.2, 16), frame); tether.position.y = H / 2; g.add(tether);
  const desk = new THREE.Mesh(new THREE.CylinderGeometry(CONSOLE, CONSOLE + 0.1, 1.05, 32), white); desk.position.y = 0.52; g.add(desk);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(CONSOLE + 0.08, CONSOLE, 0.06, 32), mat(0x22323a, { metalness: 0.5 })); top.position.y = 1.07; g.add(top);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3, p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), new THREE.MeshBasicMaterial({ color: i === 0 ? 0x7cf5a0 : 0x6ad0ff })); p.position.set(Math.cos(a) * (CONSOLE + 0.02), 0.82, Math.sin(a) * (CONSOLE + 0.02)); p.rotation.y = -a + Math.PI / 2; p.rotation.x = -0.35; g.add(p); }
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < DOOR + 0.35) continue;
    const seat = new THREE.Group(), cush = mat(0x3c6e86, { roughness: 0.8, metalness: 0 });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), cush); s1.position.y = 0.45; seat.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.1), cush); s2.position.set(0, 0.78, -0.27); seat.add(s2);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8), frame); leg.position.y = 0.21; seat.add(leg);
    seat.position.set(Math.cos(a) * (R - 0.9), 0, Math.sin(a) * (R - 0.9)); seat.rotation.y = -a - Math.PI / 2; g.add(seat);
  }
  g.userData.door = door;
  return g;
}

/** The station at geostationary height, round the docked car: a round hall with glass in the floor and the walls, and four rooms off it. */
function buildStation() {
  const g = new THREE.Group(), white = mat(0xf2f5f6), floorM = mat(0xd9dfe2, { roughness: 0.7 }), frame = mat(0xaab6be, { metalness: 0.7, roughness: 0.3 }), glass = glassMat(), glow = new THREE.MeshBasicMaterial({ color: 0xbff4ff });
  // the hall: floor plates with a ring of glass to look down at the Earth, a domed ceiling, windows all round
  g.add(new THREE.Mesh(new THREE.RingGeometry(R + 0.2, 7, 48).rotateX(-Math.PI / 2), floorM));
  const gf = new THREE.Mesh(new THREE.RingGeometry(7, 11, 48).rotateX(-Math.PI / 2), glass); gf.position.y = 0.01; g.add(gf);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.08), frame); b.position.set(Math.cos(a) * 9, 0.02, Math.sin(a) * 9); b.rotation.y = -a; g.add(b); }
  g.add(new THREE.Mesh(new THREE.RingGeometry(11, HUB, 48).rotateX(-Math.PI / 2), floorM));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(HUB, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.scale.y = 0.35; dome.position.y = HUB_H; dome.material = white.clone(); dome.material.side = THREE.BackSide; g.add(dome);
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(6 + k * 3.5, 0.06, 6, 48).rotateX(Math.PI / 2), glow); l.position.y = HUB_H + 1.5 - k * 0.6; g.add(l); }
  const doorways = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  ringWall(g, HUB, HUB_H, 32, { skip: (a) => doorways.some((d) => Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d))) < 0.09), y0: 0.25, y1: HUB_H - 0.4, frame, glass, wall: white });
  // the four rooms: quarters, galley, garden, observatory; each 9 m deep and 8 m wide, reached through a doorway in the hall
  const rooms = [];
  doorways.forEach((d, k) => {
    const room = new THREE.Group(), L = 9, W = 8, h = 3.4; room.position.set(Math.cos(d) * HUB, 0, Math.sin(d) * HUB); room.rotation.y = -d; g.add(room);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(L, W).rotateX(-Math.PI / 2), floorM); fl.position.x = L / 2; room.add(fl);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(L, W).rotateX(Math.PI / 2), white); cl.position.set(L / 2, h, 0); room.add(cl);
    for (const s of [-1, 1]) { const wl = new THREE.Mesh(new THREE.BoxGeometry(L, h, 0.2), white); wl.position.set(L / 2, h / 2, s * W / 2); room.add(wl); }
    const end = k === 3;   // the observatory ends in glass from floor to ceiling
    if (end) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(W, h), glass); gl.position.set(L, h / 2, 0); gl.rotation.y = Math.PI / 2; room.add(gl); for (let i = -2; i <= 2; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, 0.1), frame); m.position.set(L, h / 2, i * 1.9); room.add(m); } }
    else { const wl = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, W), white); wl.position.set(L, h / 2, 0); room.add(wl); const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), glass); win.position.set(L - 0.12, 1.8, 0); win.rotation.y = -Math.PI / 2; room.add(win); }
    const strip = new THREE.Mesh(new THREE.BoxGeometry(L - 1, 0.05, 0.3), glow); strip.position.set(L / 2, h - 0.05, 0); room.add(strip);
    // furniture for each room
    const box = (w, hh, dd, x, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dd), m); b.position.set(x, hh / 2, z); room.add(b); return b; };
    if (k === 0) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { box(2.1, 0.5, 1, 2 + i * 2.6, s * 3.2, mat(0x8aa0b0)); box(2.1, 0.12, 1, 2 + i * 2.6, s * 3.2, mat(0xe8eef2)).position.y = 0.56; }   // bunks
    if (k === 1) { for (let i = 0; i < 2; i++) { box(2.6, 0.75, 1.2, 3 + i * 3.5, 0, mat(0xdfe6ea)); } box(5, 1, 0.7, 5, -3.5, mat(0x9aa8b2)); }   // galley: tables and a counter
    if (k === 2) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { box(2, 0.7, 1.3, 2.2 + i * 2.5, s * 2.6, mat(0x7a6048, { roughness: 0.9 })); const p = box(1.8, 0.5, 1.1, 2.2 + i * 2.5, s * 2.6, mat(0x3f8a3a, { roughness: 0.9 })); p.position.y = 0.95; }   // garden: planters of greens under the lights
    rooms.push({ d, L, W });
  });
  return { group: g, rooms };
}

export class Elevator {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa0b0, 1.6));
    const key = new THREE.PointLight(0xffffff, 40, 30, 1.6); key.position.set(0, 2.9, 0); this.scene.add(key);
    this.car = buildCar(); this.scene.add(this.car);
    const st = buildStation(); this.station = st.group; this.rooms = st.rooms; this.station.visible = false; this.scene.add(this.station);
    const sl = new THREE.PointLight(0xeaf8ff, 60, 40, 1.4); sl.position.set(0, 5, 0); this.station.add(sl);
    // the car as it is seen from outside in the plaza, before you step in
    this.outside = buildCar();
    this.stage = 'ground'; this.t = 0; this.alt = 0;
    this.people = this._people();
  }
  /** People living on the station: sleeping and reading in the quarters, eating and talking in the galley, tending the garden, looking down at the Earth. */
  _people() {
    const list = [], at = (k, x, z) => { const { d } = this.rooms[k], c = Math.cos(d), s = Math.sin(d); return [Math.cos(d) * HUB + c * x + s * z, Math.sin(d) * HUB + s * x - c * z]; };
    const put = (outfit, action, p, rot, o = {}) => list.push({ outfit, action, x: p[0], z: p[1], rot, ...o });
    const O = ['modern', 'longhair', 'skirt', 'suit'];
    put('modern', 'sleep', at(0, 2, 3.2), 0, { y: 0.62 }); put('longhair', 'sit', at(0, 4.6, -3.2), 0, { seat: 0.62 }); put('suit', 'write', at(0, 7.2, -3.2), 0, { seat: 0.62 });
    for (let i = 0; i < 4; i++) put(O[i], i % 2 ? 'talk' : 'sit', at(1, 3 + (i >> 1) * 3.5, i % 2 ? 1 : -1), (i % 2 ? -1 : 1) * Math.PI / 2 - this.rooms[1].d, { seat: 0.45 });
    put('skirt', 'cook', at(1, 5, -2.8), -this.rooms[1].d + Math.PI / 2);
    for (let i = 0; i < 3; i++) put(O[(i + 1) % 4], i === 1 ? 'reap' : 'hoe', at(2, 2.2 + i * 2.5, 1.4), -this.rooms[2].d, { prop: 'none' });
    for (let i = 0; i < 3; i++) put(O[i], i === 2 ? 'point' : 'stand', at(3, 7.6, -2 + i * 2), -this.rooms[3].d);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, r0 = 12.5 + (i % 2) * 1.5; put(O[i % 4], i % 2 ? 'talk' : 'stand', [Math.cos(a) * r0, Math.sin(a) * r0], -a + Math.PI); }
    const loop = Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [Math.cos(a) * 13.8, Math.sin(a) * 13.8]; });
    for (let i = 0; i < 4; i++) put(O[(i + 2) % 4], 'walk', loop[0], 0, { path: loop, phase: i / 4, speed: 1.1 });
    const a = actors(null, list, { seed: 7 }); for (const m of a.meshes) this.station.add(m);
    return a;
  }
  get riding() { return this.stage === 'up' || this.stage === 'down'; }
  /** Start the ride from wherever the car is: up from the ground, or down from the station. */
  go() { if (this.stage === 'ground') { this.stage = 'up'; this.t = 0; } else if (this.stage === 'top') { this.stage = 'down'; this.t = 0; } }
  update(dt, u, time) {
    if (this.riding) {
      this.t += dt; const s = Math.min(1, this.t / CLIMB), k = this.stage === 'up' ? s : 1 - s;
      this.alt = 0.002 + (GEO - 0.002) * (Math.exp(7 * k) - 1) / (Math.exp(7) - 1);
      if (s >= 1) { this.stage = this.stage === 'up' ? 'top' : 'ground'; this.alt = this.stage === 'top' ? GEO : 0; }
    }
    const shut = this.riding ? 1 : 0, door = this.car.userData.door; door.position.z += ((shut ? 0 : 2 * R * Math.sin(DOOR) * 0.98) - door.position.z) * Math.min(1, dt * 3);
    this.station.visible = this.stage === 'top';
    if (this.station.visible) this.people.update(u, time, null);
  }
  /** Inside the car or the station: keep the visitor on the floor and out of the walls. pos is in this scene's coordinates. */
  collide(pos, last) {
    if (!this._walkable(pos.x, pos.z)) { if (this._walkable(pos.x, last.z)) pos.z = last.z; else if (this._walkable(last.x, pos.z)) pos.x = last.x; else { pos.x = last.x; pos.z = last.z; } }
  }
  _walkable(x, z) {
    const r = Math.hypot(x, z), a = Math.atan2(z, x), doorOpen = !this.riding, inDoor = Math.abs(a) < DOOR - 0.06;
    if (r < CONSOLE + 0.35) return false;                          // the console round the tether
    if (r < R - 0.45) return true;                                 // inside the car
    if (r < R + 0.45) return inDoor && doorOpen;                    // through the wall only at the door, and only while it is open
    if (this.stage === 'ground') return inDoor && r < R + 1.5;      // out onto the plaza (main.js takes over from there)
    if (this.stage !== 'top') return false;
    if (r < HUB - 0.5) return true;                                 // the station's hall
    for (const { d, L, W } of this.rooms) { const c = Math.cos(d), s = Math.sin(d), lx = x * c + z * s - HUB, lz = -x * s + z * c; if (lx > -1 && lx < L - 0.6 && Math.abs(lz) < (lx < 0.6 ? 1.3 : W / 2 - 0.5)) return true; }
    return false;
  }
  /** Is a point inside the car (as opposed to its doorway or the station)? */
  inCar(x, z) { return Math.hypot(x, z) < R - 0.3; }
  /** Has the visitor walked out of the car's door onto the plaza? */
  outDoor(x, z) { return this.stage === 'ground' && Math.hypot(x, z) > R + 1.0; }
  /** Is a point in the plaza at the car's door (relative to the car), so that walking on takes you in? */
  atDoor(x, z) { return Math.hypot(x, z) < R + 0.9 && Math.abs(Math.atan2(z, x)) < DOOR - 0.06; }
}
