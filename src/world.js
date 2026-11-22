import * as THREE from 'three';
import { clamp, smooth } from './util.js?v=ef07112a';
import { shared } from './textures.js?v=ef07112a';

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
/** Manhattan: an island between two rivers. Other places supply their own profile (see src/sites.js). */
export const MANHATTAN = { base: (x) => landBase(x), relief: hills, bounds: { x: ISLAND - 6, z: 340 } };
const iceBumps = (x, z) => 3 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + 1.5 * Math.sin(x * 0.11 + z * 0.07);

const SKY_FRAG = `
  uniform vec3 top, hor, sunCol, sunDir, moonDir, cloudCol; uniform float sunSize, cloud, cirrus, stars, flash, time, sunBright, moonSize, moonHot; varying vec3 vDir;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<6;i++){ s+=a*noise(p); p=p*2.03+vec2(17.0,5.0); a*=0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0), mu = dot(d, sunDir), ang = acos(clamp(mu, -1.0, 1.0));
    // atmosphere: deep zenith, bright hazy horizon, warm forward scattering around the sun
    vec3 col = mix(hor, top, 1.0 - exp(-h * 3.4));
    col = mix(col, hor * 1.12, exp(-h * 14.0) * 0.6);
    float mie = pow(max(mu, 0.0), 6.0) * 0.22 + pow(max(mu, 0.0), 90.0) * 0.5;
    col += sunCol * mie * (0.35 + 0.65 * exp(-h * 2.0));
    // stars, wherever the sky is dark enough to show them
    if (stars > 0.01 && d.y > 0.0) {
      vec3 sp = d * 190.0, sc = floor(sp);
      float sh = fract(sin(dot(sc, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      float tw = 0.75 + 0.25 * sin(time * (1.5 + sh * 4.0) + sh * 40.0);
      col += vec3(0.9, 0.95, 1.0) * stars * step(0.9955, sh) * smoothstep(0.42, 0.05, length(fract(sp) - 0.5)) * tw * smoothstep(0.0, 0.12, d.y) * (0.5 + fract(sh * 91.7));
    }
    // sun
    float disc = 1.0 - smoothstep(sunSize * 0.96, sunSize * 1.03 + 0.0015, ang);
    float corona = exp(-max(ang - sunSize, 0.0) / (0.03 + sunSize * 0.5));
    col += sunCol * corona * 0.35;
    float gran = 0.75 + 0.5 * fbm(d.xy * 14.0 + d.z * 9.0 + time * 0.03);
    float limb = mix(1.0, 0.45 + 0.55 * sqrt(max(1.0 - pow(ang / max(sunSize, 1e-3), 2.0), 0.0)), smoothstep(0.06, 0.3, sunSize));
    vec3 sunSurf = sunCol * sunBright * mix(1.0, gran, smoothstep(0.06, 0.3, sunSize)) * limb;
    // clouds, lit from the sun's side
    float cl = 0.0; vec3 cc = vec3(1.0);
    // high, thin ice cloud drawn out into streaks by the wind
    if (cirrus > 0.01 && d.y > 0.0) {
      vec2 q = d.xz / (d.y + 0.35) * vec2(0.55, 2.2) + vec2(time * 0.0015, 3.0);
      float ci = smoothstep(0.5, 0.82, fbm(q * 1.6 + fbm(q * 0.7) * 0.8)) * smoothstep(0.02, 0.3, d.y) * cirrus;
      col = mix(col, mix(vec3(1.0), sunCol, 0.3) * cloudCol * (0.8 + 0.4 * length(hor) * 0.5), ci * 0.42);
    }
    if (cloud > 0.01 && d.y > 0.0) {
      vec2 p = d.xz / (d.y + 0.14) * 1.15 + vec2(time * 0.004, time * 0.0015);
      p += (vec2(noise(p * 2.7), noise(p * 2.7 + 9.0)) - 0.5) * 0.22;   // billowing edges
      float n = fbm(p), n2 = fbm(p + sunDir.xz * 0.12);
      float th = 1.0 - cloud * 0.78;
      cl = smoothstep(th, th + 0.32, n * 1.3) * smoothstep(0.0, 0.16, d.y);
      float lit = clamp(0.5 + (n - n2) * 5.0, 0.0, 1.0);
      vec3 base = mix(hor, top, 0.35);
      vec3 shade = base * 0.55, bright = mix(vec3(dot(base + sunCol, vec3(0.33)) * 0.9), sunCol, 0.45) * (0.75 + 0.9 * length(sunCol) * 0.4);
      cc = mix(shade, bright, lit * (0.55 + 0.45 * smoothstep(0.2, 0.9, n * 1.3)));
      cc *= cloudCol; cc += vec3(0.85, 0.9, 1.0) * flash * (0.5 + n);
      cc = mix(cc, hor, exp(-d.y * 7.0) * 0.8);
      cc += sunCol * pow(max(mu, 0.0), 24.0) * 0.6 * (1.0 - cl * 0.5);
    }
    col = mix(col, sunSurf, disc * (1.0 - cl * 0.92));
    // the Moon: pale by day, and vast and glowing when it was new
    if (moonSize > 0.001) {
      float mang = acos(clamp(dot(d, moonDir), -1.0, 1.0)), mr = mang / moonSize;
      float mdisc = 1.0 - smoothstep(0.97, 1.02, mr);
      vec3 side = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0))), up2 = cross(side, moonDir);
      vec2 mp = vec2(dot(d, side), dot(d, up2)) / moonSize;
      float maria = fbm(mp * 2.6 + 7.0), sphere = sqrt(max(1.0 - mr * mr, 0.0)), phase = clamp(0.55 + mp.x * 0.8, 0.0, 1.0);
      vec3 cold = mix(col, vec3(1.0, 0.98, 0.94), 0.82) * (0.72 + 0.28 * smoothstep(0.35, 0.65, maria));
      vec3 hot = vec3(1.0, 0.3, 0.05) * (0.35 + 1.6 * pow(maria, 2.0)) * (0.55 + 0.45 * sphere);
      col = mix(col, mix(cold, hot, moonHot), mdisc * mix(phase * 0.8, 1.0, moonHot) * (1.0 - cl * 0.9));
      col += vec3(1.0, 0.3, 0.05) * moonHot * exp(-max(mr - 1.0, 0.0) * 3.0) * 0.25 * (1.0 - mdisc);
    }
    col = mix(col, cc, cl * 0.94);
    if (d.y < 0.0) col = mix(col, hor, smoothstep(0.0, -0.04, d.y) * (1.0 - disc));
    gl_FragColor = vec4(col, 1.0);
  }`;

const WATER_FRAG = `
  uniform vec3 top, hor, sunCol, sunDir, waterCol, fogCol; uniform float time, fogD, sunI;
  varying vec3 vWorld;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  float wave(vec2 p){
    return sin(dot(p, vec2(0.31, 0.17)) + time * 1.1) * 0.5 + sin(dot(p, vec2(-0.22, 0.61)) + time * 1.6) * 0.28
      + noise(p * 0.55 + time * 0.25) * 0.9 + noise(p * 1.9 - time * 0.45) * 0.35 + noise(p * 5.3 + time * 0.8) * 0.12;
  }
  void main(){
    vec2 p = vWorld.xz; float dist = length(cameraPosition - vWorld);
    float e = 0.12 + dist * 0.004, w0 = wave(p), amp = 0.5 / (1.0 + dist * 0.03);
    vec3 n = normalize(vec3((w0 - wave(p + vec2(e, 0.0))) / e * amp, 1.0, (w0 - wave(p + vec2(0.0, e))) / e * amp));
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.03 + 0.97 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    vec3 R = reflect(-V, n); R.y = abs(R.y);
    vec3 sky = mix(hor, top, 1.0 - exp(-R.y * 3.4));
    float sd = max(dot(R, sunDir), 0.0);
    vec3 spec = sunCol * (pow(sd, 500.0) * 20.0 * smoothstep(0.4, 1.2, sunI) + pow(sd, 60.0) * 0.5) * min(sunI, 2.5) * 0.5;
    vec3 body = waterCol * (0.18 + 0.32 * min(sunI, 2.5) * 0.4 + 0.25 * length(hor) * 0.5);
    vec3 col = mix(body, sky, fres) + spec;
    float f = 1.0 - exp(-fogD * fogD * dist * dist);
    gl_FragColor = vec4(mix(col, fogCol, f), 1.0);
  }`;

export class World {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.hill = 1; this.ice = -60; this.sea = 0; this.night = 0;
    this.shapeVersion = 0;   // bumps whenever ground heights change
    const T = shared();

    // --- sky ---
    this.skyU = {
      top: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
      sunCol: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunSize: { value: 0.035 }, cloud: { value: 0.4 }, time: { value: 0 }, sunBright: { value: 30 },
      moonDir: { value: new THREE.Vector3(0.55, 0.42, 0.72).normalize() }, moonSize: { value: 0.034 }, moonHot: { value: 0 },
      cloudCol: { value: new THREE.Color(1, 1, 1) }, cirrus: { value: 0 }, stars: { value: 0 }, flash: { value: 0 },
    };
    this.sunDir = this.skyU.sunDir.value;
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: SKY_FRAG,
    });
    const skyGeo = new THREE.SphereGeometry(5000, 48, 24);
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.frustumCulled = false; sky.renderOrder = -10;
    this.sky = sky; scene.add(sky);
    // the same sky, rendered into a small cube map so surfaces can reflect it
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    const sky2 = new THREE.Mesh(skyGeo, skyMat); sky2.scale.setScalar(0.01); sky2.frustumCulled = false; this.envScene.add(sky2);
    this.envRT = null; this.envU = -9; this.envT = -9;

    // --- lights ---
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    const sun = this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -190; sc.right = sc.top = 190; sc.near = 10; sc.far = 2600;
    sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.7;
    scene.add(this.hemi, sun, sun.target);
    scene.fog = new THREE.FogExp2(0xffffff, 0.002);

    // --- terrain ---
    const W = 2000, D = 2400, SX = 200, SZ = 240;
    const g = new THREE.PlaneGeometry(W, D, SX, SZ); g.rotateX(-Math.PI / 2);
    const n = g.attributes.position.count, p = g.attributes.position.array, uv = g.attributes.uv.array;
    this.tBase = new Float32Array(n); this.tHill = new Float32Array(n);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { uv[i * 2] = p[i * 3] / 9; uv[i * 2 + 1] = p[i * 3 + 2] / 9; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.profile = MANHATTAN;
    this.terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: T.groundMap, normalMap: T.groundNormal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.96, metalness: 0 });
    this.terrain = new THREE.Mesh(g, this.terrainMat); this.terrain.receiveShadow = true;
    scene.add(this.terrain);
    // endless floor under everything so the horizon is never empty
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(6000, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 1 }));
    this.floor.position.y = BED - 0.5; scene.add(this.floor);
    this.setProfile(MANHATTAN);

    // --- water ---
    this.waterU = {
      top: this.skyU.top, hor: this.skyU.hor, sunCol: this.skyU.sunCol, sunDir: this.skyU.sunDir, time: this.skyU.time,
      waterCol: { value: new THREE.Color() }, fogCol: { value: scene.fog.color }, fogD: { value: 0.002 }, sunI: { value: 2 },
    };
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: this.waterU, fog: false,
      vertexShader: `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: WATER_FRAG,
    }));
    scene.add(this.water);

    // --- ice sheet ---
    const ig = new THREE.PlaneGeometry(2400, 2400, 160, 160); ig.rotateX(-Math.PI / 2);
    const ip = ig.attributes.position.array, iuv = ig.attributes.uv.array;
    for (let i = 0; i < ig.attributes.position.count; i++) { ip[i * 3 + 1] = iceBumps(ip[i * 3], ip[i * 3 + 2]); iuv[i * 2] = ip[i * 3] / 14; iuv[i * 2 + 1] = ip[i * 3 + 2] / 14; }
    ig.computeVertexNormals();
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xe6f1fa, roughness: 0.55, metalness: 0, normalMap: T.iceNormal, normalScale: new THREE.Vector2(1.4, 1.4), map: T.groundMap });
    this.iceMesh = new THREE.Mesh(ig, iceMat); this.iceMesh.receiveShadow = true;
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(6000, 24).rotateX(-Math.PI / 2), iceMat);
    skirt.position.y = -3.2; this.iceMesh.add(skirt);
    scene.add(this.iceMesh);

    // --- weather particles: soft flakes / ash / embers, and streaks when it is really coming down ---
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
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PN * 6), 3));
    this.streakMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.32, depthWrite: false, fog: false });
    this.streaks = new THREE.LineSegments(sg, this.streakMat); this.streaks.frustumCulled = false;
    scene.add(this.streaks);

    this._c = new THREE.Color();
  }

  /** Shooting stars and falling rock: `rate` 0..1 sets how often one crosses the sky. */
  updateMeteors(rate, dt, camera) {
    if (!this.meteors) {
      const g = new THREE.ConeGeometry(1, 1, 6, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.5);   // tail trails behind along +z
      this.meteors = Array.from({ length: 7 }, () => {
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        m.visible = false; m.frustumCulled = false; m.userData = { life: 0, v: new THREE.Vector3() }; this.scene.add(m); return m;
      });
    }
    for (const m of this.meteors) {
      const d = m.userData;
      if (d.life <= 0) {
        m.visible = false;
        if (rate > 0.02 && Math.random() < dt * rate * 0.5) {
          const a = Math.random() * 6.283, r = 900 + Math.random() * 2600, big = Math.random() < 0.25 ? 2.5 : 1;
          m.position.set(camera.position.x + Math.cos(a) * r, 900 + Math.random() * 1500, camera.position.z + Math.sin(a) * r);
          const b = a + 1.6 + (Math.random() - 0.5) * 1.6;
          d.v.set(Math.cos(b), -(0.25 + Math.random() * 0.5), Math.sin(b)).normalize().multiplyScalar(700 + Math.random() * 900);
          d.life = d.span = 1.2 + Math.random() * 2.2; m.scale.set(9 * big, 9 * big, (260 + Math.random() * 500) * big);
          m.lookAt(m.position.clone().sub(d.v)); m.visible = true;
        }
        continue;
      }
      if (rate <= 0.02) d.life = 0;   // none left hanging when the era changes
      d.life -= dt; m.position.addScaledVector(d.v, dt);
      const f = Math.sin(Math.PI * Math.max(0, d.life / d.span));
      m.material.color.setRGB(5 * f, 2.6 * f, 0.9 * f);
      if (m.position.y < 60) d.life = 0;
    }
  }

  /** Reshape the ground for another place: { base(x, z), relief(x, z), bounds: { x, z } }. Height = base + hill × relief. */
  setProfile(profile) {
    this.profile = profile;
    const g = this.terrain.geometry, p = g.attributes.position.array, col = g.attributes.color.array, n = g.attributes.position.count;
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], z = p[i * 3 + 2], b = profile.base(x, z);
      this.tBase[i] = b; this.tHill[i] = profile.relief(x, z);
      let t = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(x * 0.13 + Math.sin(z * 0.11) * 2) * Math.cos(z * 0.09 + x * 0.02));
      if (b < 2.6 && b > -2) t *= 1.18;                          // beaches and banks
      if (b < -2) t *= 0.72;                                    // river and sea bed
      if (profile === MANHATTAN && x < -650) t *= 0.8;          // the Palisades
      if (profile.tint) t *= profile.tint(x, z, b);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = t;
    }
    g.attributes.color.needsUpdate = true;
    this._applyHill(this.hill);
  }

  heightAt(x, z) { return this.profile.base(x, z) + this.hill * this.profile.relief(x, z); }
  /** What the player (and objects that must stay on the surface) stand on. */
  surfaceAt(x, z) {
    if (this.underAt) { const y = this.underAt(x, z); if (y !== null) return y; }   // inside a place's tunnels and chambers: their floor, even below the ground
    let h = this.heightAt(x, z);
    if (this.floorAt) h = Math.max(h, this.floorAt(x, z));   // a place's walkable platforms and stairs, for the visitor's feet
    return this.ice > -50 ? Math.max(h, this.ice + iceBumps(x, z)) : h;
  }

  _applyHill(hill) {
    this.hill = hill; this.shapeVersion++;
    const pos = this.terrain.geometry.attributes.position, p = pos.array;
    for (let i = 0; i < pos.count; i++) p[i * 3 + 1] = this.tBase[i] + hill * this.tHill[i];
    pos.needsUpdate = true;
    this.terrain.geometry.computeVertexNormals();
  }

  update(env, dt, time, camera, u) {
    const set = (col, a, m = 1) => col.setRGB(a[0] * m, a[1] * m, a[2] * m, THREE.SRGBColorSpace);
    if (Math.abs(env.hill - this.hill) > 0.004 || (env.hill !== this.hill && (env.hill === 0 || env.hill === 1))) this._applyHill(env.hill);
    if (Math.abs(env.ice - this.ice) > 0.01) { this.ice = env.ice; this.shapeVersion++; }
    this.sea = env.sea;
    this.night = clamp(1 - env.sunI / 1.1, 0, 1);

    const su = this.skyU;
    set(su.top.value, env.top); set(su.hor.value, env.hor); set(su.sunCol.value, env.sun);
    su.sunSize.value = env.sunSize; su.cloud.value = env.cloud; su.time.value = time;
    su.sunBright.value = (2.2 + 26 * (1 - smooth((env.sunSize - 0.04) / 0.3))) * clamp(env.sunI / 2, 0.15, 1.6);
    su.moonSize.value = env.moon; su.moonHot.value = env.moonHot;
    set(su.cloudCol.value, env.cloudCol);
    su.cirrus.value = env.cloud > 0.02 ? Math.min(0.7, env.cloud * 1.3) * (1 - smooth((env.cloud - 0.72) / 0.2)) : 0;
    su.stars.value = clamp(1 - (env.top[0] + env.top[1] + env.top[2]) * 2.2, 0, 1) * (1 - env.cloud * 0.9);
    // lightning in heavy rain
    const raining = env.precip > 0.7 && env.pVy < -14;
    if (raining && !(this.flashT > 0) && Math.random() < dt * 0.14) this.flashT = 0.22;
    this.flashT = Math.max(0, (this.flashT || 0) - dt);
    su.flash.value = this.flashT > 0 ? (Math.sin(this.flashT * 90) > -0.3 ? 1.6 : 0.2) : 0;
    this.updateMeteors(env.meteor, dt, camera);
    const az = -0.45; su.sunDir.value.set(Math.cos(env.sunEl) * Math.sin(az), Math.sin(env.sunEl), Math.cos(env.sunEl) * Math.cos(az));
    this.sky.position.copy(camera.position);

    set(this.scene.fog.color, env.hor); this.scene.fog.density = env.fogD;
    set(this.hemi.color, [0.5 + env.hor[0] * 0.5, 0.5 + env.hor[1] * 0.5, 0.5 + env.hor[2] * 0.5]);
    set(this.hemi.groundColor, env.ground, 0.6); this.hemi.intensity = env.amb * 0.35 + (this.flashT > 0 ? 2.2 : 0);
    this.scene.environmentIntensity = env.amb * 0.9;
    const sun = this.sunLight;
    set(sun.color, env.sun); sun.intensity = env.sunI * 1.5;
    const cast = env.sunI > 0.45 && this.shadows !== false; if (cast !== sun.castShadow) sun.castShadow = cast;
    const cx = Math.round(camera.position.x / 6) * 6, cz = Math.round(camera.position.z / 6) * 6;   // snap so shadows do not crawl
    sun.target.position.set(cx, camera.position.y - 1.7, cz);
    sun.position.copy(sun.target.position).addScaledVector(su.sunDir.value, 1300);
    // When frames are slow, redraw the shadow map only every other frame — but at once if the light, place or era changed.
    this.avgDt = (this.avgDt || dt) * 0.95 + dt * 0.05; this.tick = (this.tick || 0) + 1;
    const shadowKey = cx * 31 + cz * 17 + su.sunDir.value.y * 1e4 + u * 1e7;
    sun.shadow.autoUpdate = false;
    if (shadowKey !== this.shadowKey || this.avgDt < 0.02 || this.tick % 2 === 0) { sun.shadow.needsUpdate = true; this.shadowKey = shadowKey; }

    // refresh the reflected sky now and then (cheap, but not free)
    if (this.renderer && ((Math.abs(u - this.envU) > 0.0004 && time - this.envT > 0.4) || time - this.envT > 6)) {
      this.envU = u; this.envT = time;
      const bright = su.sunBright.value; su.sunBright.value = Math.min(bright, 6);   // keep the blurred reflection free of fireflies
      const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 200);
      su.sunBright.value = bright;
      this.scene.environment = rt.texture;
      if (this.envRT) this.envRT.dispose(); this.envRT = rt;
    }

    set(this.terrainMat.color, env.ground); set(this.terrainMat.emissive, env.lava);
    set(this.floor.material.color, env.ground, 0.72); set(this.floor.material.emissive, env.lava);
    set(this.waterU.waterCol.value, env.water); this.waterU.fogD.value = env.fogD; this.waterU.sunI.value = env.sunI;
    this.water.position.y = env.sea; this.water.visible = env.sea > BED - 0.4;
    this.iceMesh.position.y = env.ice; this.iceMesh.visible = env.ice > -50;

    // particles
    const count = Math.floor(clamp(env.precip, 0, 1) * this.PN);
    const rain = Math.abs(env.pVy) > 14;
    this.particles.visible = count > 0 && !rain; this.streaks.visible = count > 0 && rain;
    if (count > 0) {
      const a = this.particles.geometry.attributes.position.array, cp = camera.position;
      const vy = env.pVy * dt, wx = (1.5 + Math.abs(env.pVy) * 0.08) * dt;
      for (let i = 0; i < count; i++) {
        const j = i * 3;
        a[j] += wx + Math.sin(time * 1.3 + i) * 0.01; a[j + 1] += vy * (0.7 + (i % 7) * 0.08);
        const dx = a[j] - cp.x, dy = a[j + 1] - cp.y, dz = a[j + 2] - cp.z;
        if (dx > 45) a[j] -= 90; else if (dx < -45) a[j] += 90;
        if (dy > 40) a[j + 1] -= 50; else if (dy < -10) a[j + 1] += 50;
        if (dz > 45) a[j + 2] -= 90; else if (dz < -45) a[j + 2] += 90;
      }
      if (rain) {
        const s = this.streaks.geometry.attributes.position.array, len = Math.abs(env.pVy) * 0.03;
        for (let i = 0; i < count; i++) { const j = i * 3, k = i * 6; s[k] = a[j]; s[k + 1] = a[j + 1]; s[k + 2] = a[j + 2]; s[k + 3] = a[j] + len * 0.12; s[k + 4] = a[j + 1] + len; s[k + 5] = a[j + 2]; }
        this.streaks.geometry.setDrawRange(0, count * 2); this.streaks.geometry.attributes.position.needsUpdate = true;
        set(this.streakMat.color, env.pCol);
      } else {
        this.particles.geometry.setDrawRange(0, count);
        set(this.pMat.color, env.pCol); this.pMat.size = env.pSize;
        this.particles.geometry.attributes.position.needsUpdate = true;
      }
    }
  }
}
