import * as THREE from 'three';
import { clamp, smooth } from './util.js';

// ---------- terrain shape (pure functions, shared with gameplay) ----------
export const ISLAND = 240;       // half-width of the island (m)
export const LAND = 3;           // street level above sea level
const BED = -8;

function landBase(x) {
  const ax = Math.abs(x);
  if (ax < ISLAND) return LAND;
  if (ax < 285) return LAND + (BED - LAND) * smooth((ax - ISLAND) / 45);
  if (ax < 560) return BED;
  let h = BED + (4 - BED) * smooth((ax - 560) / 40);
  if (x < -640) h += 45 * smooth((-x - 640) / 30);   // the Palisades
  return h;
}
function hills(x, z) {
  const n = 5 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 + 0.4)
    + 3.5 * Math.sin(x * 0.043 + z * 0.031 + 2)
    + 1.5 * Math.sin(z * 0.09 - x * 0.07);
  const ax = Math.abs(x);
  const mask = ax < 215 ? 1 : ax < 255 ? 1 - smooth((ax - 215) / 40) : ax < 600 ? 0 : smooth((ax - 600) / 60);
  return Math.max(0, n + 3) * mask;
}
const iceBumps = (x, z) => 3 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + 1.5 * Math.sin(x * 0.11 + z * 0.07);

export class World {
  constructor(scene) {
    this.scene = scene;
    this.hill = 1;
    this.ice = -60;
    this.sea = 0;
    this.shapeVersion = 0;   // bumps whenever ground heights change

    // --- sky ---
    this.skyU = {
      top: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
      sunCol: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunSize: { value: 0.035 }, cloud: { value: 0.4 }, time: { value: 0 },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(5000, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top, hor, sunCol, sunDir; uniform float sunSize, cloud, time; varying vec3 vDir;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
          void main(){
            vec3 d = normalize(vDir);
            float h = max(d.y, 0.0);
            vec3 col = mix(hor, top, pow(h, 0.55));
            float ang = acos(clamp(dot(d, sunDir), -1.0, 1.0));
            float disc = 1.0 - smoothstep(sunSize*0.94, sunSize*1.04 + 0.002, ang);
            float halo = exp(-max(ang - sunSize, 0.0) / (0.06 + sunSize*0.6));
            col += sunCol * halo * 0.45;
            float gran = 0.82 + 0.36 * fbm(d.xy * 9.0 + d.z * 5.0 + time * 0.02);
            vec3 sunSurf = mix(sunCol * 1.5, sunCol * gran * 1.3, smoothstep(0.08, 0.4, sunSize));
            col = mix(col, sunSurf, disc);
            if (cloud > 0.01 && d.y > 0.0) {
              vec2 p = d.xz / (d.y + 0.12) * 1.3 + vec2(time * 0.006, 0.0);
              float c = smoothstep(1.0 - cloud * 0.75, 1.25 - cloud * 0.75, fbm(p) * 1.25) * smoothstep(0.0, 0.2, d.y);
              vec3 cc = mix(hor, vec3(1.0), 0.55) * (0.55 + 0.45 * clamp(length(top + hor) * 0.6, 0.0, 1.0));
              col = mix(col, cc, c * 0.8 * (1.0 - disc * 0.5));
            }
            if (d.y < 0.0) col = mix(col, hor, smoothstep(0.0, -0.05, d.y) * (1.0 - disc));
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    sky.frustumCulled = false; sky.renderOrder = -10;
    this.sky = sky; scene.add(sky);

    // --- lights ---
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
    scene.add(this.hemi, this.sunLight, this.sunLight.target);
    scene.fog = new THREE.FogExp2(0xffffff, 0.002);

    // --- terrain ---
    const W = 2000, D = 2400, SX = 200, SZ = 240;
    const g = new THREE.PlaneGeometry(W, D, SX, SZ); g.rotateX(-Math.PI / 2);
    const n = g.attributes.position.count, p = g.attributes.position.array;
    this.tBase = new Float32Array(n); this.tHill = new Float32Array(n);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], z = p[i * 3 + 2];
      const b = landBase(x); this.tBase[i] = b; this.tHill[i] = hills(x, z);
      let t = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(x * 0.13 + Math.sin(z * 0.11) * 2) * Math.cos(z * 0.09 + x * 0.02));
      if (b < 2.6 && b > -2) t *= 1.18;      // beaches
      if (b < -2) t *= 0.72;                // river bed
      if (x < -650) t *= 0.8;               // cliffs
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = t;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrain = new THREE.Mesh(g, this.terrainMat);
    scene.add(this.terrain);
    // endless floor under everything so the horizon is never empty
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(6000, 24).rotateX(-Math.PI / 2), this.terrainMat.clone());
    this.floor.material.vertexColors = false;
    this.floor.position.y = BED - 0.5; scene.add(this.floor);
    this._applyHill(1);

    // --- water ---
    this.waterMat = new THREE.MeshLambertMaterial({ color: 0x2f6f8f, transparent: true, opacity: 0.88 });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2), this.waterMat);
    scene.add(this.water);

    // --- ice sheet ---
    const ig = new THREE.PlaneGeometry(2400, 2400, 80, 80); ig.rotateX(-Math.PI / 2);
    const ip = ig.attributes.position.array;
    for (let i = 0; i < ig.attributes.position.count; i++) ip[i * 3 + 1] = iceBumps(ip[i * 3], ip[i * 3 + 2]);
    ig.computeVertexNormals();
    this.iceMesh = new THREE.Mesh(ig, new THREE.MeshLambertMaterial({ color: 0xeaf4fb, flatShading: true }));
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(6000, 24).rotateX(-Math.PI / 2), this.iceMesh.material);
    skirt.position.y = -3.2; this.iceMesh.add(skirt);
    scene.add(this.iceMesh);

    // --- weather particles ---
    const PN = 5000; this.PN = PN;
    const pp = new Float32Array(PN * 3);
    for (let i = 0; i < PN; i++) { pp[i * 3] = (Math.random() - 0.5) * 90; pp[i * 3 + 1] = Math.random() * 50 - 10; pp[i * 3 + 2] = (Math.random() - 0.5) * 90; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 32;
    const dg = dot.getContext('2d'), grad = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.8)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = grad; dg.fillRect(0, 0, 32, 32);
    this.pMat = new THREE.PointsMaterial({ size: 0.25, map: new THREE.CanvasTexture(dot), transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    this.particles = new THREE.Points(pg, this.pMat); this.particles.frustumCulled = false;
    scene.add(this.particles);

    this._c = new THREE.Color();
  }

  heightAt(x, z) { return landBase(x) + this.hill * hills(x, z); }
  /** What the player (and objects that must stay on the surface) stand on. */
  surfaceAt(x, z) {
    const h = this.heightAt(x, z);
    return this.ice > -50 ? Math.max(h, this.ice + iceBumps(x, z)) : h;
  }

  _applyHill(hill) {
    this.hill = hill; this.shapeVersion++;
    const pos = this.terrain.geometry.attributes.position, p = pos.array;
    for (let i = 0; i < pos.count; i++) p[i * 3 + 1] = this.tBase[i] + hill * this.tHill[i];
    pos.needsUpdate = true;
    this.terrain.geometry.computeVertexNormals();
  }

  update(env, dt, time, camera) {
    const c = this._c, set = (col, a, m = 1) => col.setRGB(a[0] * m, a[1] * m, a[2] * m, THREE.SRGBColorSpace);
    if (Math.abs(env.hill - this.hill) > 0.004 || (env.hill !== this.hill && (env.hill === 0 || env.hill === 1))) this._applyHill(env.hill);
    if (Math.abs(env.ice - this.ice) > 0.01) { this.ice = env.ice; this.shapeVersion++; }
    this.sea = env.sea;

    const u = this.skyU;
    set(u.top.value, env.top); set(u.hor.value, env.hor); set(u.sunCol.value, env.sun);
    u.sunSize.value = env.sunSize; u.cloud.value = env.cloud; u.time.value = time;
    const az = 0.7; u.sunDir.value.set(Math.cos(env.sunEl) * Math.sin(az), Math.sin(env.sunEl), Math.cos(env.sunEl) * Math.cos(az));
    this.sky.position.copy(camera.position);

    set(this.scene.fog.color, env.hor); this.scene.fog.density = env.fogD;
    set(this.hemi.color, [0.5 + env.hor[0] * 0.5, 0.5 + env.hor[1] * 0.5, 0.5 + env.hor[2] * 0.5]);
    set(this.hemi.groundColor, env.ground, 0.6); this.hemi.intensity = env.amb * 1.1;
    set(this.sunLight.color, env.sun); this.sunLight.intensity = env.sunI;
    this.sunLight.position.copy(camera.position).addScaledVector(u.sunDir.value, 100);
    this.sunLight.target.position.copy(camera.position);

    set(this.terrainMat.color, env.ground); set(this.terrainMat.emissive, env.lava);
    set(this.floor.material.color, env.ground, 0.72); set(this.floor.material.emissive, env.lava);
    set(this.waterMat.color, env.water);
    this.water.position.y = env.sea; this.water.visible = env.sea > BED - 0.4;
    this.iceMesh.position.y = env.ice; this.iceMesh.visible = env.ice > -50;

    // particles
    const count = Math.floor(clamp(env.precip, 0, 1) * this.PN);
    this.particles.visible = count > 0;
    if (count > 0) {
      this.particles.geometry.setDrawRange(0, count);
      set(this.pMat.color, env.pCol); this.pMat.size = env.pSize;
      const a = this.particles.geometry.attributes.position.array, cp = camera.position;
      const vy = env.pVy * dt, wx = (1.5 + Math.abs(env.pVy) * 0.08) * dt;
      for (let i = 0; i < count; i++) {
        const j = i * 3;
        a[j] += wx + Math.sin(time * 1.3 + i) * 0.01; a[j + 1] += vy * (0.7 + (i % 7) * 0.08);
        let dx = a[j] - cp.x, dy = a[j + 1] - cp.y, dz = a[j + 2] - cp.z;
        if (dx > 45) a[j] -= 90; else if (dx < -45) a[j] += 90;
        if (dy > 40) a[j + 1] -= 50; else if (dy < -10) a[j + 1] += 50;
        if (dz > 45) a[j + 2] -= 90; else if (dz < -45) a[j + 2] += 90;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
