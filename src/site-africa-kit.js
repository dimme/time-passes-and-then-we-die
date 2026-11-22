// Shared by the two Stone Age places (site-africa.js, site-cave.js): scenery placed on the drawn ground and
// shown for its span of years, camp fires with smoke, herds of animals, and a few hand-made textures.
import * as THREE from 'three';
import { rng, merge, part, ball, cyl } from './util.js?v=fea1c89f';
import { yearToU } from './timeline.js?v=fea1c89f';
import { species, pose } from './animals.js?v=fea1c89f';
import { animTime } from './organic.js?v=fea1c89f';
import { canvasTex } from './textures.js?v=fea1c89f';

export const Y = yearToU, TAU = Math.PI * 2;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();

/** The ground as it is drawn: the terrain is a 10 m grid of flat triangles (as in animals.js). */
export function drawnGround(W, x, z) {
  const x0 = Math.floor(x / 10) * 10, z0 = Math.floor(z / 10) * 10, fx = (x - x0) / 10, fz = (z - z0) / 10, hb = W.heightAt(x0, z0 + 10), hd = W.heightAt(x0 + 10, z0);
  if (fx + fz <= 1) { const ha = W.heightAt(x0, z0); return ha + (hd - ha) * fx + (hb - ha) * fz; }
  const hc = W.heightAt(x0 + 10, z0 + 10); return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}

/** The value at `year` of keys [[year, value] …], interpolated along the slider as the environment is. */
export function keyed(keys, year) {
  if (year <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (year < keys[i][0]) { const a = keys[i - 1], b = keys[i], ua = Y(a[0]); return a[1] + (b[1] - a[1]) * (Y(year) - ua) / (Y(b[0]) - ua); }
  return keys[keys.length - 1][1];
}
export const rgb = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
/** out = a + (b − a) t, for colours as [r, g, b]. */
export function tone(out, a, b, t) { for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * t; return out; }
/** Heading (as actors take it: 0 = facing +x) that looks from (x, z) to (tx, tz). */
export const facing = (x, z, tx, tz) => Math.atan2(z - tz, tx - x);

/** Make any geometry mergeable: unindexed, with normals, uvs and a vertex colour. */
function prep(g) {
  const o = g.index ? g.toNonIndexed() : g.clone(), n = o.attributes.position.count;
  if (!o.attributes.normal) o.computeVertexNormals();
  if (!o.attributes.uv) o.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!o.attributes.color) o.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  for (const k of Object.keys(o.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) o.deleteAttribute(k);
  return o;
}

/** Static scenery: geometry set on the ground, merged into one mesh per material and span of years. */
export class Stuff {
  constructor(world, group) { this.world = world; this.group = group; this.mats = {}; this.buckets = new Map(); this.meshes = []; }
  mat(name, material, cast = true) { this.mats[name] = { material, cast }; return this; }
  /** geos: one or more geometries modelled about the origin with y = 0 on the ground. `from`, `to` are years. */
  add(mat, geos, x, z, { rot = 0, s = 1, sy = 1, y = 0, from = -Infinity, to = Infinity, ground = true } = {}) {
    const key = mat + '|' + from + '|' + to; let b = this.buckets.get(key); if (!b) this.buckets.set(key, b = { mat, from, to, geos: [] });
    _m.compose(_p.set(x, (ground ? drawnGround(this.world, x, z) : 0) + y, z), _q.setFromAxisAngle(UP, rot), _s.set(s, s * sy, s));
    for (const g of [].concat(geos)) b.geos.push(prep(g).applyMatrix4(_m));
  }
  build() {
    for (const b of this.buckets.values()) {
      const { material, cast } = this.mats[b.mat], m = new THREE.Mesh(merge(b.geos), material); m.castShadow = cast; m.receiveShadow = true;
      m.userData.u0 = b.from === -Infinity ? -Infinity : Y(b.from); m.userData.u1 = b.to === Infinity ? Infinity : Y(b.to);
      this.group.add(m); this.meshes.push(m);
    }
    this.buckets.clear(); return this;
  }
  update(u) { for (const m of this.meshes) m.visible = u >= m.userData.u0 && u < m.userData.u1; }
}

/**
 * Plants and rocks: instances of one kind (parts sharing their transforms, as flora.js makes them), each there for its own
 * span of the slider. The field is cut into a few cells so that what is behind the visitor is not drawn.
 * items: [{ x, z, s, rot, u0, u1, tint }]
 */
export class Field {
  constructor(world, group, parts, items, { cast = true, grid = 3 } = {}) {
    this.world = world; this.cells = []; this.lastU = -9; this.lastV = -1;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, reach = 0; for (const it of items) { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x + 0.01); z0 = Math.min(z0, it.z); z1 = Math.max(z1, it.z + 0.01); }
    for (const { geo } of parts) { if (!geo.boundingSphere) geo.computeBoundingSphere(); reach = Math.max(reach, geo.boundingSphere.radius + geo.boundingSphere.center.length()); }
    for (let q = 0; q < grid * grid; q++) {
      const list = items.filter((it) => Math.floor((it.x - x0) / (x1 - x0) * grid) + grid * Math.floor((it.z - z0) / (z1 - z0) * grid) === q); if (!list.length) continue;
      let cx = 0, cz = 0, rad = 0, big = 0; for (const it of list) { cx += it.x / list.length; cz += it.z / list.length; big = Math.max(big, it.s); }
      for (const it of list) rad = Math.max(rad, Math.hypot(it.x - cx, it.z - cz));
      const sphere = new THREE.Sphere(new THREE.Vector3(cx, world.heightAt(cx, cz), cz), rad + reach * big + 4), meshes = parts.map(({ geo, mat, tint = true, cast: c = true }) => {
        const m = new THREE.InstancedMesh(geo, mat, list.length); m.boundingSphere = sphere; m.castShadow = cast && c; m.receiveShadow = true;
        list.forEach((it, i) => m.setColorAt(i, tint ? _c.setRGB(it.tint[0], it.tint[1], it.tint[2]) : _c.setRGB(1, 1, 1))); group.add(m); return m;
      });
      for (let k = 1; k < meshes.length; k++) meshes[k].instanceMatrix = meshes[0].instanceMatrix;
      this.cells.push({ list, meshes });
    }
  }
  update(u) {
    if (u === this.lastU && this.world.shapeVersion === this.lastV) return;
    this.lastU = u; this.lastV = this.world.shapeVersion;
    for (const c of this.cells) {
      let alive = 0;
      c.list.forEach((it, i) => {
        const f = it.s * Math.min(1, Math.max(0, (u - it.u0) / 0.003)) * Math.min(1, Math.max(0, (it.u1 - u) / 0.003));
        if (f <= 0.001) _m.makeScale(0, 0, 0); else { alive++; _m.compose(_p.set(it.x, drawnGround(this.world, it.x, it.z) - 0.1, it.z), _q.setFromAxisAngle(UP, it.rot), _s.setScalar(f)); }
        c.meshes[0].setMatrixAt(i, _m);
      });
      c.meshes[0].instanceMatrix.needsUpdate = true; for (const m of c.meshes) m.visible = alive > 0;
    }
  }
}

/** Camp fires: flickering flames and a thread of smoke each, alight for their span of years. */
export class Fires {
  constructor(group) { this.group = group; this.list = []; }
  /** A fire with its foot at (x, y, z); size 1 is a cooking fire. smoke: height of the column in metres (0 for none). */
  add(x, y, z, { size = 1, from = -Infinity, to = Infinity, smoke = 7 } = {}) { this.list.push({ x, y, z, size, smoke, u0: from === -Infinity ? -Infinity : Y(from), u1: to === Infinity ? Infinity : Y(to), ph: this.list.length * 1.7 }); }
  build() {
    const n = this.list.length; if (!n) return this;
    const prof = []; for (let i = 0; i <= 7; i++) { const t = i / 7; prof.push(new THREE.Vector2(0.4 * Math.sin(Math.PI * Math.sqrt(t)) * (1 - 0.55 * t) + 0.001, t)); }
    this.flames = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.05, 0.2), transparent: true, opacity: 0.92, depthWrite: false }), n * 2);
    this.flames.frustumCulled = false;
    // smoke: a widening, leaning column whose noise scrolls upwards and whose ends fade away
    const sg = new THREE.CylinderGeometry(1, 0.16, 1, 10, 8, true).translate(0, 0.5, 0), sp = sg.attributes.position, col = new Float32Array(sp.count * 4);
    for (let i = 0; i < sp.count; i++) { const t = sp.getY(i); sp.setX(i, sp.getX(i) * (0.3 + 0.7 * t) + 0.9 * t * t); col.set([1, 1, 1, Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.2 * (1 - 0.5 * t)], i * 4); }
    sg.setAttribute('color', new THREE.BufferAttribute(col, 4));
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = rng(8);
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) { const x = r() * 128, y = r() * 128, rad = 8 + r() * 22; for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); gr.addColorStop(0, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2); } }
    this.smokeTex = canvasTex(c, false);
    this.smoke = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xb4b0a8, alphaMap: this.smokeTex, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), n);
    this.smoke.frustumCulled = false; this.smoke.renderOrder = 2; this.flames.renderOrder = 3;
    this.group.add(this.smoke, this.flames); this.lastU = -9; return this;
  }
  update(u, t) {
    if (!this.flames) return;
    let k = 0, j = 0;
    for (const f of this.list) {
      if (u < f.u0 || u >= f.u1) continue;
      for (let i = 0; i < 2; i++) {   // two tongues, flickering out of step
        const a = t * (7 + i * 2.3) + f.ph + i * 2, w = f.size * (0.5 - i * 0.14) * (1 + 0.12 * Math.sin(a * 1.7)), h = f.size * (0.75 + i * 0.25) * (1 + 0.22 * Math.sin(a) + 0.1 * Math.sin(a * 2.7));
        _q.setFromAxisAngle(UP, a * 0.3); _m.compose(_p.set(f.x + 0.05 * Math.sin(a * 0.9) * f.size, f.y, f.z + 0.05 * Math.cos(a * 1.3) * f.size), _q, _s.set(w, h, w)); this.flames.setMatrixAt(k++, _m);
      }
      if (f.smoke && u !== this.lastU) { _q.identity(); _m.compose(_p.set(f.x, f.y + 0.6 * f.size, f.z), _q, _s.set(f.smoke * 0.16, f.smoke, f.smoke * 0.16)); this.smoke.setMatrixAt(j, _m); }
      if (f.smoke) j++;
    }
    this.flames.count = k; this.flames.visible = k > 0; this.flames.instanceMatrix.needsUpdate = true;
    if (u !== this.lastU) { this.smoke.count = j; this.smoke.visible = j > 0; this.smoke.instanceMatrix.needsUpdate = true; this.lastU = u; }
    this.smokeTex.offset.y = -t * 0.11; this.smokeTex.offset.x = Math.sin(t * 0.2) * 0.05;
  }
}

/** Animals of this place: single wanderers, or herds that keep together as they circle their range. */
export class Beasts {
  constructor(world, group, seed = 5) { this.world = world; this.group = group; this.list = []; this.r = rng(seed); this.M = species(); }
  /**
   * n animals of `kind` between two years. at: centre of the range; R: radius of the circle walked; spread: how far each strays
   * from the others (a herd shares one circle; with `apart` each has its own). fly: height above the ground for birds.
   * ok(x, z): where an animal may be (dry, open ground); a range is tried again until its whole circle passes.
   */
  add(kind, n, from, to, { at = [0, 0], R = [30, 50], spread = 20, speed = 1, scale = [0.9, 1.1], fly = 0, apart = false, ok = null } = {}) {
    const r = this.r, pickRange = () => {
      for (let tries = 0; tries < 60; tries++) {
        const cx = at[0] + (apart ? (r() * 2 - 1) * spread : 0), cz = at[1] + (apart ? (r() * 2 - 1) * spread : 0), Rr = (R[0] + r() * (R[1] - R[0])) * (tries > 30 ? 0.5 : 1); let good = true;
        if (ok && !fly) for (let k = 0; k < 16 && good; k++) good = ok(cx + Math.cos(k * 0.3927) * Rr, cz + Math.sin(k * 0.3927) * Rr);
        if (good) return [cx, cz, Rr];
      }
      return [at[0], at[1], R[0] * 0.5];
    };
    let range = pickRange(); const dir = r() < 0.5 ? -1 : 1, ph0 = r() * TAU;
    for (let i = 0; i < n; i++) {
      if (apart && i) range = pickRange();
      const a = this.M[kind](), sc = scale[0] + r() * (scale[1] - scale[0]); a.obj.scale.setScalar(sc);
      const [cx, cz, Rr] = range, v = speed * (apart ? 0.8 + r() * 0.4 : 1), { duty, stride } = a.def.gait;
      let ox = 0, oz = 0; if (!apart && i) for (let k = 0; k < 20; k++) { ox = (r() * 2 - 1) * spread; oz = (r() * 2 - 1) * spread; if (!ok || fly || ok(cx + ox, cz + oz)) break; }
      this.list.push({ ...a, cx: cx + ox, cz: cz + oz, R: Rr, w: (v / Rr) * (apart ? (r() < 0.5 ? -1 : 1) : dir), gait: (TAU * duty * v) / (stride * sc), half: a.def.half * sc,
        flap: a.def.flight && a.def.flight.rate * (0.85 + r() * 0.3), ph: apart ? r() * TAU : ph0 + (r() - 0.5) * 0.25, u0: Y(from), u1: to === Infinity ? Infinity : Y(to), fly: fly && fly * (0.7 + r() * 0.6), in: false });
    }
    return this;
  }
  update(u, t, camera) {
    animTime.value = t;
    const W = this.world, ex = camera.position.x, ez = camera.position.z;
    for (const a of this.list) {
      const vis = u >= a.u0 && u < a.u1;
      if (vis !== a.in) { a.in = vis; vis ? this.group.add(a.obj) : this.group.remove(a.obj); }
      if (!vis) continue;
      const ang = a.ph + t * a.w, c = Math.cos(ang), sn = Math.sin(ang), x = a.cx + c * a.R, z = a.cz + sn * a.R, s = Math.sign(a.w), dx = -sn * s, dz = c * s;
      const near = (x - ex) * (x - ex) + (z - ez) * (z - ez) < 520 * 520; a.obj.visible = near; if (!near) continue;
      a.obj.rotation.y = Math.atan2(-dz, dx);
      if (a.fly) { a.obj.position.set(x, W.heightAt(a.cx, a.cz) + a.fly + Math.sin(t * 0.4 + a.ph) * 3, z); a.obj.rotation.z = Math.cos(t * 0.4 + a.ph) * 0.08; a.obj.rotation.x = s * 0.3; }
      else {
        const yf = drawnGround(W, x + dx * a.half, z + dz * a.half), yb = drawnGround(W, x - dx * a.half, z - dz * a.half);
        a.obj.position.set(x, (yf + yb) / 2, z); a.obj.rotation.z = Math.atan2(yf - yb, a.half * 2);
      }
      pose(a, t * a.gait + a.ph, t);
    }
  }
}

// ---------- things left on the ground ----------
const ASH = 0x8a8680, CHAR = 0x1c1a18, LOG = 0x4a3524, cos = Math.cos, sin = Math.sin;
/** A fire place: charred logs on a bed of ash, ringed with stones once people do that. */
export function hearth(seed, stones, STONE = 0x4a4642) {
  const r = rng(seed), g = [part(new THREE.SphereGeometry(1, 10, 4), ASH, 0, 0, 0, 0, 0, 0, 0.62, 0.035, 0.6)];
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + r(); g.push(cyl(0.035, 0.05, 0.7 + r() * 0.3, i % 2 ? CHAR : LOG, cos(a) * 0.2, 0.09 + 0.03 * i, sin(a) * 0.2, 6, 1.25, a, 0)); }
  if (stones) for (let i = 0; i < 9; i++) { const a = i * 0.698 + r() * 0.2; g.push(ball(0.11 + r() * 0.05, STONE, cos(a) * 0.55, 0.05, sin(a) * 0.55, 1.2, 0.7, 1, 1)); }
  return g;
}
/** Knapping waste: cores and flakes lying where they fell (with finished hand-axes among them when asked). */
export function debitage(seed, n, spread, axes = 0, LAVA = 0x4a4642) {
  const r = rng(seed), g = [];
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * spread, s = 0.025 + r() * 0.05; g.push(ball(s, r() < 0.3 ? 0x2c2a2a : LAVA, cos(a) * d, s * 0.3, sin(a) * d, 1.3, 0.45, 1, 0)); }
  for (let i = 0; i < axes; i++) { const a = r() * TAU, d = 0.5 + r() * spread; g.push(part(new THREE.SphereGeometry(1, 7, 5), 0x3a3836, cos(a) * d, 0.02, sin(a) * d, 0, r() * 6, 0, 0.085, 0.022, 0.05)); }
  return g;
}


// ---------- textures ----------
function canvas(size, fill) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, size, size); return g; }
/** Scraped hides sewn together: blotchy leather, darker seams, a row of stitches along each. */
export function hideTex(seed = 3) {
  const S = 256, g = canvas(S, '#8f7150'), r = rng(seed);
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, rad = 6 + r() * 26, v = r(); g.fillStyle = v < 0.5 ? `rgba(60,40,24,${0.05 + r() * 0.08})` : `rgba(200,170,120,${0.04 + r() * 0.08})`; for (const ox of [0, S, -S]) for (const oy of [0, S, -S]) { g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * (0.4 + r() * 0.6), r() * 3, 0, TAU); g.fill(); } }
  for (let i = 0; i < 1400; i++) { const x = r() * S, y = r() * S; g.strokeStyle = `rgba(${40 + r() * 40},${28 + r() * 30},${16 + r() * 20},0.16)`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y + 3 + r() * 6); g.stroke(); }
  for (const x of [20, 84, 148, 212]) {   // seams
    g.strokeStyle = 'rgba(46,30,18,0.75)'; g.lineWidth = 2.2; g.beginPath(); for (let y = 0; y <= S; y += 16) g.lineTo(x + 5 * Math.sin(y * 0.0491 + x), y); g.stroke();
    g.strokeStyle = 'rgba(214,196,150,0.8)'; g.lineWidth = 1.2; for (let y = 4; y < S; y += 9) { const sx = x + 5 * Math.sin(y * 0.0491 + x); g.beginPath(); g.moveTo(sx - 4, y - 1.5); g.lineTo(sx + 4, y + 1.5); g.stroke(); }
  }
  g.strokeStyle = 'rgba(46,30,18,0.6)'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= S; x += 16) g.lineTo(x, 128 + 6 * Math.sin(x * 0.0491)); g.stroke();
  return canvasTex(g.canvas);
}
/** Dry grass and leafy brush laid over a frame. */
export function thatchTex(seed = 4, base = '#7d6c3e', lo = [70, 58, 30], hi = [205, 180, 112]) {
  const S = 256, g = canvas(S, base), r = rng(seed);
  for (let i = 0; i < 5200; i++) {
    const x = r() * S, y = r() * S, k = r(), len = 10 + r() * 30, lean = (r() - 0.5) * 9;
    g.strokeStyle = `rgba(${lo[0] + (hi[0] - lo[0]) * k | 0},${lo[1] + (hi[1] - lo[1]) * k | 0},${lo[2] + (hi[2] - lo[2]) * k | 0},${0.5 + r() * 0.4})`; g.lineWidth = 0.6 + r() * 1.1;
    for (const oy of [0, -S]) for (const ox of [0, S, -S]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + lean, y + oy + len); g.stroke(); }
  }
  return canvasTex(g.canvas);
}
