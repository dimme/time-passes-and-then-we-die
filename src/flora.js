import * as THREE from 'three';
import { rng, smooth, box, vcMat } from './util.js';
import { yearToU } from './timeline.js';
import { shared, canvasTex } from './textures.js';
import { ISLAND } from './world.js';

const FADE = 0.003;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const windTime = { value: 0 };

/** A field of instanced things, each alive for its own span of time. `parts` share one set of transforms. */
export class Scatter {
  constructor(world, parts, items) {
    this.world = world; this.items = items;
    this.meshes = parts.map(({ geo, mat, tint = true, cast = true }) => {
      const m = new THREE.InstancedMesh(geo, mat, items.length);
      m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true;
      items.forEach((it, i) => m.setColorAt(i, tint ? _c.setRGB(it.tint[0], it.tint[1], it.tint[2]) : _c.setRGB(1, 1, 1)));
      return m;
    });
    for (let k = 1; k < this.meshes.length; k++) this.meshes[k].instanceMatrix = this.meshes[0].instanceMatrix;
    this.minU = Infinity; this.maxU = -Infinity;
    for (const it of items) { this.minU = Math.min(this.minU, it.u0); this.maxU = Math.max(this.maxU, it.u1); }
    this.lastU = -9; this.lastV = -1;
  }
  update(u) {
    const on = !(u < this.minU - FADE || u > this.maxU + FADE);
    for (const m of this.meshes) m.visible = on;
    if (!on || (u === this.lastU && this.world.shapeVersion === this.lastV)) return;
    this.lastU = u; this.lastV = this.world.shapeVersion;
    const w = this.world, first = this.meshes[0];
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const f = it.s * smooth((u - it.u0) / FADE + (it.u0 <= 0 ? 1 : 0)) * smooth((it.u1 - u) / FADE + (it.u1 >= 1 ? 1 : 0));
      if (f <= 0.001) { _m.makeScale(0, 0, 0); }
      else {
        _p.set(it.x, w.heightAt(it.x, it.z) - 0.1, it.z); _q.setFromAxisAngle(UP, it.rot);
        _m.compose(_p, _q, _s.set(it.sx ? it.sx * f : f, it.sy ? it.sy * f : f, it.sx ? it.sx * f : f));
      }
      first.setMatrixAt(i, _m);
    }
    first.instanceMatrix.needsUpdate = true;
  }
}

// ---------- foliage textures (drawn once, tinted per instance) ----------
function leafCanvas(kind, seed) {
  const r = rng(seed), long = kind === 'frond' || kind === 'needle', W = long ? 512 : 256, H = long ? 128 : 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const green = (l) => `hsl(${80 + r() * 36}, ${30 + r() * 22}%, ${l * 0.8 + r() * 13}%)`;
  if (kind === 'broad') {
    for (let i = 0; i < 700; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 116, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, s = 4.5 + r() * 5;
      g.save(); g.translate(x, y); g.rotate(r() * 6.28);
      g.fillStyle = green(i < 250 ? 14 : 24 + (i / 700) * 16); g.beginPath(); g.ellipse(0, 0, s, s * 0.5, 0, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(20,40,10,0.3)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore();
    }
  } else if (kind === 'skirt') {
    // a ring of drooping needle branches: solid at the top, ragged at the bottom
    for (let i = 0; i < 520; i++) {
      const x = r() * W, top = r() * H * 0.35, len = H * (0.35 + r() * 0.62), w = 3 + r() * 7;
      g.fillStyle = green(12 + (top / H) * 30);
      for (const o of [0, -W, W]) { g.beginPath(); g.moveTo(x - w + o, top); g.lineTo(x + w + o, top); g.lineTo(x + o, top + len); g.fill(); }
    }
    g.fillStyle = 'hsl(105,45%,16%)'; g.fillRect(0, 0, W, H * 0.12);
  } else {
    // a pinnate frond (or needle branch) growing left → right
    const needle = kind === 'needle', mid = H / 2;
    g.lineCap = 'round';
    for (let x = 14; x < W - 8; x += needle ? 3 : 7) {
      const t = x / W, len = (needle ? 30 : 56) * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)) ** 0.7 * (0.85 + r() * 0.3);
      for (const s of [-1, 1]) {
        g.strokeStyle = green(needle ? 14 : 22); g.lineWidth = needle ? 2.2 : 5.5;
        g.beginPath(); g.moveTo(x, mid); g.quadraticCurveTo(x + len * 0.35, mid + s * len * 0.6, x + len * (needle ? 0.5 : 0.75), mid + s * len); g.stroke();
      }
    }
    g.strokeStyle = needle ? '#3a2e1c' : '#3f5a22'; g.lineWidth = needle ? 6 : 4; g.beginPath(); g.moveTo(0, mid); g.lineTo(W - 10, mid); g.stroke();
  }
  return c;
}
function leafMat(kind, seed, sway = 0.012, fadeR = 0) {
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(leafCanvas(kind, seed)), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.78, metalness: 0 });
  m.alphaToCoverage = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.17;
      #else
        float ph = 0.0;
      #endif
      float sw = (sin(uTime * 1.3 + ph + position.y * 0.3) + 0.5 * sin(uTime * 2.9 + ph * 1.7 + position.x)) * ${sway.toFixed(4)} * position.y;
      transformed.x += sw; transformed.z += sw * 0.6;
      ${fadeR ? `#ifdef USE_INSTANCING
        transformed *= 1.0 - smoothstep(${(fadeR * 0.55).toFixed(1)}, ${(fadeR * 0.95).toFixed(1)}, distance(cameraPosition.xz, (modelMatrix * instanceMatrix[3]).xz));
      #endif` : ''}`);
    // leaf cards share soft "volume" normals; do not flip them on back faces
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
  };
  return m;
}

// ---------- geometry ----------
class Builder {
  constructor() { this.p = []; this.n = []; this.uv = []; }
  tri(a, b, c, na, nb, nc, ua, ub, uc) { this.p.push(...a, ...b, ...c); this.n.push(...na, ...nb, ...nc); this.uv.push(...ua, ...ub, ...uc); }
  quad(a, b, c, d, na, nb, nc, nd, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {   // a,b bottom; d,c top
    this.tri(a, b, c, na, nb, nc, [u0, v0], [u1, v0], [u1, v1]); this.tri(a, c, d, na, nc, nd, [u0, v0], [u1, v1], [u0, v1]);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}
const norm = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

/** Cloud of leaf cards filling an ellipsoid; normals point away from its centre so it shades like a volume. */
function crown(b, r, cx, cy, cz, rx, ry, rz, count, size) {
  for (let i = 0; i < count; i++) {
    const th = r() * 6.283, ph = Math.acos(r() * 2 - 1), rad = 0.45 + r() * 0.55;
    const px = cx + Math.sin(ph) * Math.cos(th) * rx * rad, py = cy + Math.cos(ph) * ry * rad, pz = cz + Math.sin(ph) * Math.sin(th) * rz * rad;
    const a = norm(r() - 0.5, r() - 0.5, r() - 0.5), t = norm(r() - 0.5, r() - 0.5, r() - 0.5);
    const up = norm(a[1] * t[2] - a[2] * t[1], a[2] * t[0] - a[0] * t[2], a[0] * t[1] - a[1] * t[0]);
    const s = size * (0.75 + r() * 0.5), v = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i2, j2]) => [px + (a[0] * i2 + up[0] * j2) * s, py + (a[1] * i2 + up[1] * j2) * s, pz + (a[2] * i2 + up[2] * j2) * s]);
    const nn = v.map((q) => norm(q[0] - cx, q[1] - cy + ry * 0.35, q[2] - cz));
    b.quad(v[0], v[1], v[2], v[3], nn[0], nn[1], nn[2], nn[3]);
  }
}
/** A tapering trunk or branch from point a to point e. */
function limb(b, a, e, r0, r1, sides = 8, vScale = 0.35) {
  const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], len = Math.hypot(...d), dir = norm(...d);
  const ref = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const s = norm(dir[1] * ref[2] - dir[2] * ref[1], dir[2] * ref[0] - dir[0] * ref[2], dir[0] * ref[1] - dir[1] * ref[0]);
  const t = [dir[1] * s[2] - dir[2] * s[1], dir[2] * s[0] - dir[0] * s[2], dir[0] * s[1] - dir[1] * s[0]];
  const ring = (c, rr, k) => { const an = (k / sides) * 6.2832, nx = Math.cos(an) * s[0] + Math.sin(an) * t[0], ny = Math.cos(an) * s[1] + Math.sin(an) * t[1], nz = Math.cos(an) * s[2] + Math.sin(an) * t[2]; return [[c[0] + nx * rr, c[1] + ny * rr, c[2] + nz * rr], [nx, ny, nz]]; };
  for (let k = 0; k < sides; k++) {
    const [p0, n0] = ring(a, r0, k), [p1, n1] = ring(a, r0, k + 1), [p2, n2] = ring(e, r1, k + 1), [p3, n3] = ring(e, r1, k);
    b.quad(p0, p1, p2, p3, n0, n1, n2, n3, (k / sides) * 2, 0, ((k + 1) / sides) * 2, len * vScale);
  }
}
/** Ring of drooping needle branches (an open cone). */
function skirt(b, y0, y1, rb, rt, segs = 10) {
  for (let k = 0; k < segs; k++) {
    const a0 = (k / segs) * 6.2832, a1 = ((k + 1) / segs) * 6.2832, P = (a, rr, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr], N = (a) => norm(Math.cos(a), 0.55, Math.sin(a));
    b.quad(P(a0, rb, y0), P(a1, rb, y0), P(a1, rt, y1), P(a0, rt, y1), N(a0), N(a1), N(a1), N(a0), (k / segs) * 2, 1, ((k + 1) / segs) * 2, 0);
  }
}
/** One arching frond leaving `base` in direction `ang`. */
function frond(b, base, ang, L, w, rise, droop, segs = 6) {
  const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx;
  const at = (t) => {
    const rr = L * t * (1 - 0.12 * t), y = base[1] + rise * L * t - droop * L * t * t, hw = (w / 2) * Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)) ** 0.6;
    return [[base[0] + dx * rr - px * hw, y + hw * 0.18, base[2] + dz * rr - pz * hw], [base[0] + dx * rr + px * hw, y + hw * 0.18, base[2] + dz * rr + pz * hw]];
  };
  const slope = (t) => norm(-dx * (rise - 2 * droop * t), 1, -dz * (rise - 2 * droop * t));
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs, [l0, r0] = at(t0), [l1, r1] = at(t1), n0 = slope(t0), n1 = slope(t1);
    b.quad(l0, l1, r1, r0, n0, n1, n1, n0, t0, 0, t1, 1);
  }
}

export function makeKinds() {
  const T = shared(), r = rng(555);
  const bark = new THREE.MeshStandardMaterial({ map: T.barkMap, normalMap: T.barkNormal, color: 0x6a5140, roughness: 0.95 });
  const palmBark = new THREE.MeshStandardMaterial({ map: T.barkMap, normalMap: T.barkNormal, color: 0x8a7558, roughness: 0.95 });
  const rockMat = new THREE.MeshStandardMaterial({ map: T.rockMap, normalMap: T.rockNormal, normalScale: new THREE.Vector2(1.5, 1.5), color: 0xb0aca4, roughness: 0.92 });
  const L = { broad: leafMat('broad', 1), broad2: leafMat('broad', 2), skirt: leafMat('skirt', 3, 0.006), frond: leafMat('frond', 4, 0.02), needle: leafMat('needle', 5, 0.006) };
  const K = {};

  const broadleaf = (seed, hTrunk, R, squash, mat) => {
    const rr = rng(seed), wood = new Builder(), leaves = new Builder(), top = hTrunk + R * squash * 0.5;
    limb(wood, [0, -0.3, 0], [0.15, hTrunk * 0.55, 0.1], 0.5, 0.36); limb(wood, [0.15, hTrunk * 0.55, 0.1], [0, top, 0], 0.36, 0.14);
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + rr(), y = hTrunk * (0.5 + rr() * 0.3); limb(wood, [0.1, y, 0.05], [Math.cos(a) * R * 0.6, y + R * (0.35 + rr() * 0.4), Math.sin(a) * R * 0.6], 0.16, 0.05, 6); }
    crown(leaves, rr, 0, top, 0, R, R * squash, R, 54, R * 0.4);
    for (let i = 0; i < 3; i++) { const a = rr() * 6.28; crown(leaves, rr, Math.cos(a) * R * 0.6, top - R * 0.3 + rr() * R * 0.5, Math.sin(a) * R * 0.6, R * 0.55, R * 0.45, R * 0.55, 12, R * 0.34); }
    return [{ geo: wood.build(), mat: bark, tint: false }, { geo: leaves.build(), mat }];
  };
  K.broadleaf = broadleaf(11, 5.5, 4.3, 0.8, L.broad);
  K.broadleaf2 = broadleaf(12, 8, 3.6, 1.05, L.broad2);

  const fir = (h, rb, tiers) => {
    const wood = new Builder(), leaves = new Builder();
    limb(wood, [0, -0.3, 0], [0, h * 0.97, 0], rb * 0.13, 0.04);
    for (let i = 0; i < tiers; i++) { const t = i / tiers, y0 = h * (0.16 + 0.78 * t), rad = rb * (1 - t * 0.86), th = ((h * 0.95) / tiers) * 1.9; skirt(leaves, y0, Math.min(h, y0 + th), rad, rad * 0.12, 11); }
    skirt(leaves, h * 0.9, h * 1.04, rb * 0.16, 0.02, 7);
    return [{ geo: wood.build(), mat: bark, tint: false }, { geo: leaves.build(), mat: L.skirt }];
  };
  K.conifer = fir(15, 3.4, 8);
  K.spruce = fir(11, 1.9, 9);

  const fronded = (hTrunk, rTrunk, n, Lf, w, rise, droop, trunkMat, mat = L.frond) => {
    const wood = new Builder(), leaves = new Builder();
    limb(wood, [0, -0.2, 0], [0, hTrunk, 0], rTrunk * 1.15, rTrunk * 0.85, 9, 0.6);
    for (let i = 0; i < n; i++) frond(leaves, [0, hTrunk - 0.1, 0], (i / n) * 6.283 + r() * 0.3, Lf * (0.85 + r() * 0.3), w, rise * (0.7 + r() * 0.6), droop * (0.8 + r() * 0.4));
    const m = Math.ceil(n / 2); for (let i = 0; i < m; i++) frond(leaves, [0, hTrunk, 0], (i / m) * 6.283 + 0.4, Lf * 0.6, w * 0.8, rise + 1.1, droop * 0.7);
    return [{ geo: wood.build(), mat: trunkMat, tint: false }, { geo: leaves.build(), mat }];
  };
  K.cycad = fronded(1.5, 0.42, 16, 3.0, 0.9, 0.75, 0.95, bark);
  K.treefern = fronded(6.5, 0.24, 15, 4.2, 1.3, 0.45, 0.8, bark);
  K.palm = fronded(10.5, 0.24, 17, 4.6, 1.3, 0.5, 1.0, palmBark);

  { // araucaria: a bare pole with whorls of stiff needle branches near the top
    const wood = new Builder(), leaves = new Builder(), h = 21;
    limb(wood, [0, -0.3, 0], [0, h, 0], 0.72, 0.2, 9);
    for (let y = 8.5, k = 0; y < h; y += 1.25, k++) { const t = (y - 8.5) / (h - 8.5), len = 6 * (1 - t * 0.72), n = 9; for (let i = 0; i < n; i++) frond(leaves, [0, y, 0], (i / n) * 6.283 + k * 0.5, len, 2.6, 0.3 - t * 0.1, 0.42 - t * 0.2, 5); }
    for (let i = 0; i < 6; i++) frond(leaves, [0, h - 0.2, 0], i * 1.05, 1.6, 0.9, 1.3, 0.6, 4);
    K.araucaria = [{ geo: wood.build(), mat: bark, tint: false }, { geo: leaves.build(), mat: L.needle }];
  }
  {
    const wood = new Builder(); limb(wood, [0, -0.3, 0], [0.3, 5, 0], 0.42, 0.26); limb(wood, [0.3, 5, 0], [-0.2, 9.5, 0.3], 0.26, 0.06);
    for (const [a, y, l] of [[0.3, 4.5, 3.4], [2.4, 6, 2.8], [4.2, 7, 2.2], [5.4, 5.2, 2.6], [1.3, 8, 1.6]]) limb(wood, [0.2, y, 0], [Math.cos(a) * l, y + l * 0.7, Math.sin(a) * l], 0.13, 0.03, 5);
    K.dead = [{ geo: wood.build(), mat: bark }];
  }
  {
    const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = 1 + 0.22 * Math.sin(x * 3.1 + y * 1.7) * Math.cos(z * 2.9 + x) + 0.12 * Math.sin(y * 6.3 + z * 4.1) + 0.06 * Math.sin(x * 11 + z * 9);
      p.setXYZ(i, x * d * 1.35, Math.max(-0.15, y * d * 0.85 + 0.45), z * d * 1.1); nrm.setXYZ(i, x, y * 1.2, z);
    }
    g.normalizeNormals(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2);
    K.rock = [{ geo: g, mat: rockMat }];
  }
  {
    const leaves = new Builder(), wood = new Builder(), rr = rng(8); limb(wood, [0, -0.1, 0], [0, 0.6, 0], 0.08, 0.03, 5);
    crown(leaves, rr, 0, 0.75, 0, 1.1, 0.65, 1.1, 14, 0.5); K.shrub = [{ geo: wood.build(), mat: bark, tint: false }, { geo: leaves.build(), mat: L.broad2 }];
  }
  K.lowrise = [{ geo: box(1, 1, 1, 0xffffff, 0, 0.5, 0), mat: vcMat({ flatShading: false, roughness: 0.8 }) }];
  return K;
}

// ---------- ground cover: tufts that follow the player ----------
class GroundCover {
  constructor(world, scene) {
    this.world = world;
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), r = rng(31);
    g.lineCap = 'round';
    for (let i = 0; i < 150; i++) {
      const x = 8 + r() * 240, h = 40 + r() * 84, lean = (r() - 0.5) * 50;
      g.strokeStyle = `hsl(${70 + r() * 40}, ${22 + r() * 22}%, ${40 + r() * 38}%)`; g.lineWidth = 1.2 + r() * 2;
      g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + lean * 0.2, 128 - h * 0.6, x + lean, 128 - h); g.stroke();
    }
    const tex = canvasTex(c); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    this.mat = leafMat('broad', 1, 0.09, 46); this.mat.map = tex; this.mat.roughness = 0.9;
    const b = new Builder(), up = [0, 1, 0];
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI, dx = Math.cos(a) * 0.55, dz = Math.sin(a) * 0.55; b.quad([-dx, 0, -dz], [dx, 0, dz], [dx, 0.62, dz], [-dx, 0.62, -dz], up, up, up, up); }
    const N = this.N = 14000, R = this.R = 46;
    this.mesh = new THREE.InstancedMesh(b.build(), this.mat, N); this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    this.off = new Float32Array(N * 2); this.rnd = new Float32Array(N); this.cell = new Int32Array(N * 2).fill(1e9);
    for (let i = 0; i < N; i++) { this.off[i * 2] = r() * R * 2; this.off[i * 2 + 1] = r() * R * 2; this.rnd[i] = r(); }
    this.lastV = -1; this.lastSea = 0;
    scene.add(this.mesh);
  }
  update(env, camera) {
    const n = Math.floor(Math.min(1, env.grass) * this.N);
    this.mesh.visible = n > 0; if (!n) return;
    this.mesh.count = n;
    this.mat.color.setRGB(Math.min(1, env.ground[0] * 1.18 + 0.02), Math.min(1, env.ground[1] * 1.1 + 0.02), Math.min(1, env.ground[2] * 1.0), THREE.SRGBColorSpace);
    const w = this.world, D = this.R * 2, cx = camera.position.x, cz = camera.position.z;
    const all = w.shapeVersion !== this.lastV || Math.abs(env.sea - this.lastSea) > 0.3; if (all) { this.lastV = w.shapeVersion; this.lastSea = env.sea; }
    let dirty = false;
    for (let i = 0; i < n; i++) {
      const kx = Math.floor((cx + this.R - this.off[i * 2]) / D), kz = Math.floor((cz + this.R - this.off[i * 2 + 1]) / D);
      if (!all && kx === this.cell[i * 2] && kz === this.cell[i * 2 + 1]) continue;
      this.cell[i * 2] = kx; this.cell[i * 2 + 1] = kz; dirty = true;
      const x = this.off[i * 2] + kx * D, z = this.off[i * 2 + 1] + kz * D, y = w.heightAt(x, z), q = this.rnd[i];
      const s = Math.abs(x) > ISLAND + 12 || y < env.sea + 0.25 ? 0 : 0.6 + q * 0.9;
      _m.compose(_p.set(x, y - 0.03, z), _q.setFromAxisAngle(UP, q * 6.283), _s.set(s, s * (0.7 + ((q * 7) % 1) * 0.8), s));
      this.mesh.setMatrixAt(i, _m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function buildFlora(world, scene) {
  const r = rng(1234);
  const Y = yearToU, K = makeKinds();
  const sets = [];
  const island = () => [(r() * 2 - 1) * 222, (r() * 2 - 1) * 620];
  const shore = () => [(r() < 0.5 ? -1 : 1) * (585 + r() * 330) - (r() < 0.2 ? 60 : 0), (r() * 2 - 1) * 900];
  const green = () => { const g = 0.72 + r() * 0.5; return [g * (0.8 + r() * 0.4), g, g * (0.7 + r() * 0.3)]; };
  const autumnal = () => { const g = 0.75 + r() * 0.45; return r() < 0.12 ? [g * 1.5, g * 0.95, g * 0.5] : [g * (0.8 + r() * 0.4), g, g * (0.7 + r() * 0.3)]; };
  const grey = () => { const g = 0.6 + r() * 0.5; return [g, g, g]; };

  /** add n instances; span(x,z) returns [yearFrom, yearTo] */
  function add(kind, n, place, span, size = [0.7, 1.5], tint = green, extra) {
    const items = [];
    for (let i = 0; i < n; i++) {
      const [x, z] = place();
      const [a, b] = span(x, z);
      const it = { x, z, s: size[0] + r() * (size[1] - size[0]), rot: r() * 6.28, u0: a <= -235e6 ? -1 : Y(a), u1: Y(b), tint: tint() };
      if (extra) extra(it);
      items.push(it);
    }
    const s = new Scatter(world, K[kind], items); sets.push(s); scene.add(...s.meshes);
  }
  const both = () => () => (r() < 0.82 ? island() : shore());
  const span = (a, b, ja = 0, jb = 0) => () => [a + r() * ja, b + r() * jb];

  // Mesozoic
  add('cycad', 480, both(), span(-236e6, -66.03e6, 0, 1e4), [0.7, 1.7]);
  add('treefern', 360, both(), span(-236e6, -66.03e6, 0, 1e4));
  add('araucaria', 360, both(), span(-236e6, -66.03e6, 0, 1e4), [0.7, 1.6]);
  add('conifer', 240, both(), span(-190e6, -66.03e6, 20e6, 1e4), [0.8, 1.8]);
  // ash and stumps after the impact
  add('dead', 400, both(), span(-66.025e6, -65.9e6, 5e3, 5e4), [0.6, 1.4], () => { const g = 0.25 + r() * 0.3; return [g, g, g]; });
  add('cycad', 300, both(), span(-65.95e6, -60e6, 3e4, 20e6), [0.3, 0.7]);
  // Cenozoic
  add('palm', 330, both(), span(-65.5e6, -36e6, 8e6, 4e6));
  add('broadleaf', 420, both(), span(-64e6, -1.5e6, 12e6, 1e6), [0.8, 2]);
  add('broadleaf2', 380, both(), span(-64e6, -1.5e6, 12e6, 1e6), [0.8, 1.9]);
  add('conifer', 280, both(), span(-40e6, -1.2e6, 5e6, 6e5), [0.8, 1.7]);
  // warm pause between glaciations
  add('broadleaf', 260, both(), span(-152e3, -95e3, 4e3, 20e3));
  add('broadleaf2', 240, both(), span(-152e3, -95e3, 4e3, 20e3));
  // tundra & thaw
  add('spruce', 250, both(), span(-128e3, -34e3, 8e3, 6e3), [0.6, 1.3]);
  add('shrub', 300, both(), span(-100e3, -30e3, 20e3, 3e3), [0.6, 1.4], autumnal);
  add('rock', 160, both(), span(-17e3, 1700, 800, 111), [0.6, 2.6], grey);
  add('shrub', 300, both(), span(-16e3, -9000, 1000, 2000), [0.6, 1.4], autumnal);
  add('spruce', 450, both(), span(-14.5e3, -7000, 3000, 2500), [0.7, 1.5]);
  // Mannahatta: cleared outward from the tip of the island as the town grows
  const clear = (x, z) => (Math.abs(x) > 300 ? 1840 + r() * 40 : Math.min(1845, 1626 + Math.hypot(x, z - 40) * 0.5 + r() * 30));
  add('broadleaf', 800, both(), (x, z) => [-9500 + r() * 3500, clear(x, z)], [0.8, 2.1], autumnal);
  add('broadleaf2', 650, both(), (x, z) => [-9500 + r() * 3500, clear(x, z)], [0.8, 2], autumnal);
  add('conifer', 380, both(), (x, z) => [-9000 + r() * 3000, clear(x, z)], [0.8, 1.6]);
  add('shrub', 500, both(), (x, z) => [-9000 + r() * 3000, clear(x, z)], [0.6, 1.6]);
  // street trees
  add('broadleaf2', 260, () => [Math.round(r() * 4 - 2) * 100 + (r() < 0.5 ? -8.4 : 8.4), Math.round((r() * 2 - 1) * 40) * 12 + 6], span(1860, 2140, 120, 60), [0.45, 0.8]);
  // the park by the starting corner
  add('broadleaf', 16, () => { for (;;) { const x = (r() - 0.5) * 70, z = (r() - 0.5) * 40; if (Math.abs(x) > 7 || Math.abs(z) > 7) return [-50 + x, 30 + z]; } }, span(1733, 2160, 20, 30), [0.7, 1.2]);
  // far-shore city
  const cityTint = () => { const g = 0.45 + r() * 0.35; return [g * (1 + r() * 0.15), g, g * (0.9 + r() * 0.2)]; };
  add('lowrise', 420, shore, span(1700, 2930, 220, 60), [1, 1], cityTint, (it) => { it.rot = 0; it.sx = 12 + r() * 22; it.sy = 8 + r() * 22; });
  add('lowrise', 160, shore, span(1930, 2920, 150, 60), [1, 1], cityTint, (it) => { it.rot = 0; it.sx = 18 + r() * 16; it.sy = 50 + r() * 150; });
  add('lowrise', 90, shore, span(2180, 2900, 200, 60), [1, 1], () => [0.16, 0.14, 0.22], (it) => { it.rot = 0; it.sx = 30 + r() * 30; it.sy = 250 + r() * 500; });
  // gardens of the star age, then the forest that takes it all back
  add('broadleaf', 750, both(), span(2940, 150e6, 500, 90e6), [0.7, 2]);
  add('broadleaf2', 600, both(), span(2940, 150e6, 500, 90e6), [0.7, 2]);
  add('conifer', 330, both(), span(9000, 120e6, 20000, 90e6), [0.8, 1.7]);
  add('shrub', 400, both(), span(3000, 120e6, 3000, 90e6), [0.6, 1.6]);
  // the long drying
  add('rock', 300, both(), span(120e6, 7.6e9, 100e6, 0), [0.6, 2.6], () => { const g = 0.8 + r() * 0.4; return [g * 1.25, g * 0.95, g * 0.8]; });
  add('shrub', 400, both(), span(280e6, 560e6, 60e6, 80e6), [0.6, 1.5], () => { const g = 0.8 + r() * 0.3; return [g * 1.3, g * 1.1, g * 0.6]; });
  add('palm', 120, both(), span(300e6, 540e6, 40e6, 60e6), [0.5, 0.9]);
  add('dead', 350, both(), span(520e6, 1.0e9, 100e6, 150e6), [0.5, 1.3], grey);

  const cover = new GroundCover(world, scene);
  return { update(u, time, env, camera) { windTime.value = time; for (const s of sets) s.update(u); cover.update(env, camera); } };
}
