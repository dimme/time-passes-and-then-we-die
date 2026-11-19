// The view from above: pull back from the place on screen to the whole Earth, the Moon,
// the neighbouring planets and the solar system — as they were (or will be) in the year shown.
// Distances are true (1 unit = 1,000 km); bodies are enlarged just enough to stay visible.
import * as THREE from 'three';
import { smooth } from './util.js';
import { canvasTex } from './textures.js';
import { moonDistance } from './timeline.js';

export const LIFT = 0.07;          // zoom below this is still the ground view, rising
const AU = 149600, R_EARTH = 6.371, D0 = R_EARTH * 1.16, DMAX = 46 * AU;
const PLANETS = [
  // name, orbit (AU), radius (1000 km), colour, period (years)
  ['Mercury', 0.387, 2.44, 0x9a8f86, 0.24], ['Venus', 0.723, 6.05, 0xe0c890, 0.62], ['Earth', 1, R_EARTH, 0x4a80c0, 1],
  ['Mars', 1.524, 3.39, 0xc0623a, 1.88], ['Jupiter', 5.203, 69.9, 0xd0b090, 11.86], ['Saturn', 9.58, 58.2, 0xe0cc98, 29.5],
  ['Uranus', 19.2, 25.4, 0xa8dce0, 84], ['Neptune', 30.07, 24.6, 0x4a6ae0, 165],
];

// ---------- a coarse map of today's continents: [latitude of the 10° band, [lonFrom, lonTo] …] ----------
const LAND = [
  [85, [-50, -20]], [75, [-120, -70], [-62, -18], [90, 112], [12, 28]],
  [65, [-166, -62], [-54, -36], [-24, -14], [6, 180]], [55, [-132, -58], [-9, 1], [6, 142], [156, 164]],
  [45, [-124, -62], [-6, 142]], [35, [-121, -76], [-9, 2], [22, 122], [134, 141]],
  [25, [-112, -97], [-16, 60], [62, 121]], [15, [-102, -84], [-17, 52], [73, 84], [95, 109], [120, 125]],
  [5, [-78, -51], [-11, 46], [98, 119]], [-5, [-80, -35], [10, 41], [100, 150]],
  [-15, [-77, -38], [12, 40], [45, 50], [124, 146]], [-25, [-71, -44], [15, 35], [114, 153]],
  [-35, [-72, -54], [18, 28], [116, 150], [172, 178]], [-45, [-74, -66], [168, 172]], [-55, [-72, -66]],
  [-68, [-66, -58]], [-76, [-180, 180]], [-85, [-180, 180]],
];
function landMask() {
  const c = document.createElement('canvas'); c.width = 720; c.height = 360; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 720, 360); g.fillStyle = '#fff'; g.filter = 'blur(5px)';
  for (const [lat, ...spans] of LAND) for (const [a, b] of spans) { const y = (90 - lat) * 2; g.beginPath(); g.ellipse((a + b) / 2 * 2 + 360, y, (b - a) + 4, 13, 0, 0, 7); g.fill(); }
  const t = canvasTex(c, false); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// ---------- where the continents were: data/plates.png holds one land mask per time below (see data/README.md) ----------
const PLATE_MA = [0, 10, 20, 35, 50, 66, 80, 100, 120, 150, 175, 200, 225, 250, 275, 300, 330, 360, 400, 440, 480, 540, 600, 700, 750, 800, 900, 1000];
/** Manhattan's own latitude and longitude at those times, carried along on its plate (the same model). */
const HOME_PATH = [[40.71, -74.01], [39.06, -67.12], [37.29, -63.54], [36.61, -56.06], [36.83, -47.94], [38.87, -39.77], [38.3, -34.84], [38.54, -26.48], [36.38, -15.55],
  [27.57, -7.2], [21.6, -8.95], [15.44, -10.1], [10.37, -9.17], [8.58, -6.26], [4.23, -7.01], [-3.63, -10.24], [-8.0, -16.54], [-31.17, -49.74], [-38.13, -71.74], [-21.65, -107.65], [-19.66, -130.83], [-20.76, -159.38], [-33.5, -173.7]];
/** Position in the list of times for a year: whole part = the earlier frame, fraction = how far towards the next. */
function plateFrame(year) {
  const ma = Math.max(0, -year / 1e6); let i = 0;
  while (i < PLATE_MA.length - 2 && PLATE_MA[i + 1] <= ma) i++;
  return i + Math.min(1, Math.max(0, (ma - PLATE_MA[i]) / (PLATE_MA[i + 1] - PLATE_MA[i])));
}
/** Unit vector for a latitude / longitude in the globe's own frame (matches the shader). */
const UP = new THREE.Vector3(0, 1, 0);
const onGlobe = (lat, lon) => { const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180; return new THREE.Vector3(Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l)); };

const NOISE = `
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n3(p); p = p * 2.03 + 11.0; a *= 0.5; } return s; }`;

function earthMaterial(mask) {
  return new THREE.ShaderMaterial({
    uniforms: {
      mask: { value: mask }, atlas: { value: null }, frameA: { value: 0 }, frameB: { value: 0 }, frameMix: { value: 0 }, lights: { value: 0 },
      sea: { value: new THREE.Color() }, land: { value: new THREE.Color() }, lava: { value: new THREE.Color() }, cloudCol: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(1, 0, 0) }, site: { value: new THREE.Vector3(0, 1, 0) }, clumpDir: { value: new THREE.Vector3(0.3, 0.2, 0.9).normalize() },
      ice: { value: 0.12 }, cloud: { value: 0.4 }, landFrac: { value: 0.3 }, clump: { value: 0 }, modern: { value: 1 }, dry: { value: 0 }, marker: { value: 1 }, time: { value: 0 }, seed: { value: 0 }, veg: { value: 1 },
    },
    vertexShader: `varying vec3 vP, vN, vV; void main(){ vP = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform sampler2D mask, atlas; uniform float frameA, frameB, frameMix, lights; uniform vec3 sea, land, lava, cloudCol, sunDir, site, clumpDir;
      uniform float ice, cloud, landFrac, clump, modern, dry, marker, time, seed, veg; varying vec3 vP, vN, vV;
      ${NOISE}
      // one cell of the 4 × 7 atlas of past continents
      float plate(float f, vec2 uv){ float c = mod(f, 4.0), r = floor(f / 4.0); return texture2D(atlas, vec2((c + clamp(uv.x, 0.001, 0.999)) / 4.0, 1.0 - (r + clamp(1.0 - uv.y, 0.002, 0.998)) / 7.0)).r; }
      float landAt(vec2 uv){ return mix(plate(frameA, uv), plate(frameB, uv), frameMix); }
      void main(){
        vec3 p = normalize(vP);
        vec2 uv = vec2(atan(-p.z, p.x) / 6.2831853 + 0.5, asin(clamp(p.y, -1.0, 1.0)) / 3.14159265 + 0.5);
        float rough = fbm(p * 7.0 + seed);
        #ifdef HAS_ATLAS
          float m0 = landAt(uv), today = smoothstep(0.42, 0.58, m0 + (fbm(p * 26.0) - 0.5) * 0.1);
          // shallow shelf seas beside the land
          float near = (landAt(uv + vec2(0.006, 0.0)) + landAt(uv - vec2(0.006, 0.0)) + landAt(uv + vec2(0.0, 0.008)) + landAt(uv - vec2(0.0, 0.008))) * 0.25;
        #else
          float today = smoothstep(0.42, 0.56, texture2D(mask, uv).r + (rough - 0.5) * 0.22), near = today;
        #endif
        float old = fbm(p * 1.9 + seed * 3.7) + (dot(p, clumpDir) * 0.5) * clump;
        float th = mix(0.8, 0.4, landFrac) + clump * 0.12;
        float isLand = mix(smoothstep(th, th + 0.035, old), today, modern);
        // plant cover: green where it rains, tan in the desert belts either side of the tropics
        float desert = smoothstep(0.16, 0.0, abs(abs(p.y) - 0.42)) * smoothstep(0.35, 0.6, fbm(p * 2.6 + 3.0));
        vec3 ground = mix(land, mix(vec3(0.16, 0.3, 0.1), vec3(0.62, 0.5, 0.3), desert), veg) * (0.75 + 0.5 * rough);
        // mountains: darker rock, snow on the highest where it is cold enough
        float high = smoothstep(0.56, 0.78, fbm(p * 9.0 + seed + 20.0)) * isLand;
        ground = mix(ground, vec3(0.3, 0.26, 0.22) * (0.8 + 0.5 * rough), high * 0.6);
        ground = mix(ground, vec3(0.9), high * smoothstep(0.35, 0.75, abs(p.y)) * veg);
        vec3 water = mix(sea, mix(sea, vec3(0.25, 0.62, 0.66), 0.55), smoothstep(0.02, 0.5, near) * (1.0 - dry) * modern);
        vec3 surf = mix(mix(water, ground * 0.8, dry), ground, isLand);
        float lat = abs(p.y) + (rough - 0.5) * 0.12;
        surf = mix(surf, vec3(0.74, 0.78, 0.82), smoothstep(1.0 - ice * 1.05, 1.03 - ice, lat));
        float glow = max(max(lava.r, lava.g), lava.b);
        surf = mix(surf, lava * (0.6 + 1.6 * fbm(p * 5.0 + time * 0.02)), clamp(glow * 1.2, 0.0, 1.0) * (0.45 + 0.55 * rough));
        float cl = smoothstep(0.56, 0.8, fbm(p * 3.2 + vec3(time * 0.004, 0.0, seed))) * cloud;
        surf = mix(surf, cloudCol, cl * 0.85);
        float d = dot(vN, sunDir), day = smoothstep(-0.12, 0.25, d);
        vec3 col = surf * (0.03 + 1.25 * max(d, 0.0)) + lava * glow * 0.9 * (1.0 - cl);
        // sunlight glinting off open water, and the lights of cities on the night side
        col += vec3(1.0, 0.95, 0.85) * pow(max(dot(reflect(-sunDir, vN), vV), 0.0), 60.0) * (1.0 - isLand) * (1.0 - dry) * (1.0 - cl) * 0.6 * day;
        col += vec3(1.0, 0.8, 0.45) * lights * isLand * (1.0 - day) * (1.0 - cl) * smoothstep(0.62, 0.8, fbm(p * 60.0)) * smoothstep(0.75, 0.2, abs(p.y)) * 0.9;
        float rim = pow(1.0 - max(dot(vN, vV), 0.0), 2.6);
        col += mix(sea, vec3(0.5, 0.7, 1.0), 0.6) * rim * day * (1.0 - dry) * 0.9;
        float a = acos(clamp(dot(p, site), -1.0, 1.0));
        col = mix(col, vec3(1.0, 0.85, 0.25), marker * clamp(smoothstep(0.004, 0.0, abs(a - 0.022 - 0.005 * sin(time * 2.5))) + smoothstep(0.004, 0.0, a), 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export class Space {
  constructor(labelRoot) {
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
    const cam = this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 4e8);
    this.sunLight = new THREE.PointLight(0xffffff, 3.2, 0, 0); scene.add(this.sunLight, new THREE.AmbientLight(0xffffff, 0.03));

    // stars
    const sp = new Float32Array(3600 * 3); for (let i = 0; i < 3600; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(2e8); sp.set([v.x, v.y, v.z], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false })); this.stars.frustumCulled = false; scene.add(this.stars);

    // Sun
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(this.sun);

    // planets, their orbits, the Moon
    const ball = new THREE.SphereGeometry(1, 48, 24);
    this.bodies = PLANETS.map(([name, au, radius, color, period], i) => {
      const earth = name === 'Earth';
      const mesh = new THREE.Mesh(ball, earth ? (this.earthMat = earthMaterial(landMask())) : new THREE.MeshStandardMaterial({ color, roughness: 1 }));
      const pts = []; for (let k = 0; k <= 256; k++) { const a = (k / 256) * Math.PI * 2; pts.push(Math.cos(a) * au * AU, 0, Math.sin(a) * au * AU); }
      const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const orbit = new THREE.Line(og, new THREE.LineBasicMaterial({ color: earth ? 0x6f9fff : 0x556070, transparent: true, opacity: 0.6 })); orbit.frustumCulled = false;
      scene.add(mesh, orbit);
      if (name === 'Saturn') { const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 2.25, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcdbb90, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })); ring.rotation.z = 0.45; mesh.add(ring); }
      return { name, au, radius, period, mesh, orbit, phase: i * 2.4 + 0.7 };
    });
    this.earth = this.bodies[2];
    // the atlas of past continents arrives a moment later; until then the coarse hand-drawn map stands in
    new THREE.TextureLoader().load('data/plates.png', (t) => {
      t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.NoColorSpace;
      this.earthMat.uniforms.atlas.value = t; this.earthMat.defines = { HAS_ATLAS: 1 }; this.earthMat.needsUpdate = true; this.hasAtlas = true;
    });
    this.moon = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 1 })); scene.add(this.moon);
    const mo = []; for (let k = 0; k <= 128; k++) { const a = (k / 128) * Math.PI * 2; mo.push(Math.cos(a), 0, Math.sin(a)); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mo, 3));
    this.moonOrbit = new THREE.Line(mg, new THREE.LineBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.5 })); this.moonOrbit.frustumCulled = false; scene.add(this.moonOrbit);

    // the space elevator of the far future: a tether from the ground out past geostationary orbit, with a station on it
    const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xcfefff }));
    tether.scale.y = 8.6; tether.position.y = 1;                                            // from the surface to 61,000 km up, in Earth radii
    const station = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); station.position.y = 6.62;   // geostationary
    const weight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), new THREE.MeshBasicMaterial({ color: 0xbfe8ff })); weight.position.y = 9.6;
    this.elevator = new THREE.Group(); this.elevator.add(tether, station, weight); this.station = station; this.earth.mesh.add(this.elevator);

    // rubble: the asteroid belt always, and a disc of debris while the planets are still forming
    const cloud = (n, r0, r1, thick, color, size) => {
      const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const an = Math.random() * 6.283, r = (r0 + Math.random() * (r1 - r0)) * AU; a.set([Math.cos(an) * r, (Math.random() - 0.5) * thick * AU, Math.sin(an) * r], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
      const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0.45 })); m.frustumCulled = false; scene.add(m); return m;
    };
    this.belt = cloud(700, 2.1, 3.3, 0.25, 0x8a8478, 1);
    this.disc = cloud(7000, 0.3, 34, 0.6, 0xc09060, 1.5);

    // name tags
    this.labels = new Map();
    for (const n of ['Sun', 'Moon', 'place', 'lift', ...PLANETS.map((p) => p[0])]) { const el = document.createElement('div'); el.className = 'tag'; el.textContent = n; labelRoot.appendChild(el); this.labels.set(n, el); }
    this.caption = document.createElement('div'); this.caption.className = 'scale'; labelRoot.appendChild(this.caption);
    this._v = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._t = new THREE.Vector3();
  }

  /** zoom ∈ (LIFT, 1]; env is the timeline's (Manhattan's) environment; site = { place, coords }. */
  update(zoom, year, env, site, time, aspect, w, h) {
    const k = (zoom - LIFT) / (1 - LIFT), d = D0 * Math.pow(DMAX / D0, k), set = (c, a, m = 1) => c.setRGB(a[0] * m, a[1] * m, a[2] * m, THREE.SRGBColorSpace);
    const cam = this.camera, v = this._v;

    // the Sun: brighter and redder with age, and at the very end as large as the Earth's orbit
    const sunR = 696 * Math.pow(env.sunSize / 0.035, 1.19);
    set(this.sun.material.color, env.sun, 2.2); set(this.sunLight.color, env.sun); this.sunLight.intensity = 1.6 + env.sunI * 0.7;

    for (const b of this.bodies) {
      const a = b.phase + (time * 0.02) / b.period;
      b.mesh.position.set(Math.cos(a) * b.au * AU, 0, Math.sin(a) * b.au * AU);
      b.mesh.visible = b.au * AU > sunR * 0.97;            // swallowed
    }
    const E = this.earth.mesh.position;

    // the Earth as it looked: seas, land, ice, lava and cloud come from the timeline
    const u = this.earthMat.uniforms, dry = year > 0.95e9 || year < -4.3e9 ? 1 : 0;   // no oceans before the first rain, or after they boil away
    set(u.sea.value, env.water, 0.75); set(u.land.value, env.far); set(u.lava.value, env.lava); set(u.cloudCol.value, env.cloudCol, 0.95);
    u.dry.value = dry; u.cloud.value = env.cloud * 0.9; u.time.value = time;
    u.veg.value = env.ice > -50 || dry ? 0 : smooth((year + 430e6) / 60e6) * (1 - smooth((year - 450e6) / 150e6)) * (1 - Math.min(1, env.precip * (env.pVy > -14 ? 1 : 0))) * 0.85;
    // ice: the whole planet in the two Snowball Earths, broad caps in the recent ice ages, small caps or none otherwise
    const snowball = (year > -2.34e9 && year < -2.15e9) || (year > -717e6 && year < -636e6);
    u.ice.value = snowball ? 1 : env.ice > -50 ? 0.3 : year < -34e6 || year > 2e6 ? 0.03 : 0.1;
    // continents: today's map near the present, generated shapes in deep time (one clump when there was a supercontinent)
    // with the atlas, real positions back to a billion years ago; before that, and in the far future, invented ones
    u.modern.value = (this.hasAtlas ? 1 - smooth((-year - 1000e6) / 80e6) : smooth((year + 150e6) / 110e6)) * (1 - smooth((year - 20e6) / 130e6));
    const pf = plateFrame(year); u.frameA.value = Math.floor(pf); u.frameB.value = Math.min(PLATE_MA.length - 1, Math.floor(pf) + 1); u.frameMix.value = pf - Math.floor(pf);
    u.lights.value = smooth((year - 1880) / 120) * (1 - smooth((year - 9000) / 3000));
    const superC = Math.max(smooth((year + 340e6) / 40e6) * (1 - smooth((year + 200e6) / 60e6)), smooth((year + 1.2e9) / 1e8) * (1 - smooth((year + 800e6) / 1e8)), smooth((year - 150e6) / 1e8) * (1 - smooth((year - 500e6) / 2e8)));
    u.clump.value = superC; u.landFrac.value = year < -4.3e9 ? 1 : year < -2.5e9 ? 0.12 : 0.3; u.seed.value = Math.floor((year + 4.6e9) / 250e6) * 1.37;
    let [lat, lon] = site.paleo || site.coords || HOME_PATH[0];
    if (site.home ? year < 0 : !site.coords && year < 0) {   // Manhattan rides its plate: follow it back through time
      const f = Math.min(HOME_PATH.length - 1, pf), i = Math.min(HOME_PATH.length - 2, Math.floor(f)), t = f - i, a = HOME_PATH[i], b = HOME_PATH[i + 1];
      let dl = b[1] - a[1]; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
      lat = a[0] + (b[0] - a[0]) * t; lon = a[1] + dl * t;
    }
    u.site.value.copy(onGlobe(lat, lon)); u.marker.value = site.coords ? 1 - smooth((k - 0.2) / 0.12) : 0;   // no marker where no one can say where the place was

    // turn the globe so the place on screen is in daylight, facing the camera's starting point
    const toSun = v.copy(E).multiplyScalar(-1).normalize().clone();
    const facing = toSun.clone().multiplyScalar(0.78).add(new THREE.Vector3(0, 0.5, 0)).add(new THREE.Vector3(-toSun.z, 0, toSun.x).multiplyScalar(0.38)).normalize();
    this.earth.mesh.quaternion.setFromUnitVectors(u.site.value, facing);
    this.elevator.visible = site.elevator && year >= 2990 && year < 9600;
    if (this.elevator.visible) this.elevator.quaternion.setFromUnitVectors(UP, u.site.value);
    u.sunDir.value.copy(toSun);

    // the Moon was far closer when it was new (env.moon is its apparent size from the ground)
    const moonKm = moonDistance(year), hasMoon = moonKm > 0, moonD = hasMoon ? moonKm / 1000 : 1;
    this.moon.position.set(E.x + Math.cos(time * 0.05 + 1) * moonD, moonD * 0.09 * Math.sin(time * 0.05 + 1), E.z + Math.sin(time * 0.05 + 1) * moonD);
    this.moon.material.emissive.setRGB(env.moonHot * 0.9, env.moonHot * 0.25, env.moonHot * 0.04);
    this.moonOrbit.position.copy(E); this.moonOrbit.scale.setScalar(moonD);

    // camera: straight above the place, tilting towards a view from above the planets as it pulls away
    // (a little off to one side from the start, so that anything rising from the ground is seen in profile)
    const lean = smooth((k - 0.03) / 0.1) * 0.5, sideways = new THREE.Vector3(-facing.z, 0, facing.x).normalize();
    const tilt = smooth((k - 0.3) / 0.3), dir = facing.clone().addScaledVector(sideways, lean).normalize().lerp(new THREE.Vector3(0.2, 0.86, 0.47), tilt).normalize();
    const target = this._t.copy(E).multiplyScalar(1 - smooth((k - 0.62) / 0.2));
    cam.position.copy(target).addScaledVector(dir, d); cam.up.set(0, 1, 0); cam.lookAt(target);
    cam.aspect = aspect; cam.near = Math.max(0.05, d * 0.01); cam.far = 6e8; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.stars.position.copy(cam.position);

    // sizes: true until a body would shrink below a few pixels, then held there
    const fit = (mesh, radius, min = 0.0045) => mesh.scale.setScalar(Math.max(radius, cam.position.distanceTo(mesh.position) * min));
    for (const b of this.bodies) fit(b.mesh, b.radius);
    fit(this.moon, 1.737, 0.003); this.sun.scale.setScalar(Math.max(sunR, d * 0.006));
    const far = d > 0.12 * AU;                           // beyond this the Moon would sit on top of the Earth
    this.moon.visible = hasMoon && !far; this.moonOrbit.visible = hasMoon && d > 60 && !far;
    for (const b of this.bodies) b.orbit.visible = d > 0.02 * AU && b.mesh.visible;
    this.belt.visible = d > 0.3 * AU; this.disc.visible = env.meteor > 0.3 && d > 0.05 * AU; this.disc.rotation.y = time * 0.01; this.belt.rotation.y = time * 0.004;

    // name tags
    const tag = (name, pos, show, text) => {
      const el = this.labels.get(name); v.copy(pos).project(cam);
      const on = show && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.display = on ? 'block' : 'none'; if (!on) return;
      el.style.left = ((v.x * 0.5 + 0.5) * w).toFixed(1) + 'px'; el.style.top = ((-v.y * 0.5 + 0.5) * h).toFixed(1) + 'px'; if (text) el.textContent = text;
    };
    tag('Sun', this.sun.position, d > 0.2 * AU);
    tag('Moon', this.moon.position, this.moon.visible && d > 40, `Moon · ${(Math.round(moonKm / 1000) * 1000).toLocaleString('en-US')} km`);
    for (const b of this.bodies) tag(b.name, b.mesh.position, b.mesh.visible && (b.name === 'Earth' ? d > 90 : d > 0.25 * AU * Math.min(b.au, 6)) && (b.au > 2 || d < 9 * AU));
    tag('place', E.clone().addScaledVector(facing, R_EARTH * 1.01), d < 90 && !!site.coords, site.place);
    tag('lift', this.station.getWorldPosition(v.clone()), this.elevator.visible && d > 25 && d < 3000, 'Space elevator');
    this.caption.textContent = d < 60 ? 'The Earth' : d < 0.03 * AU ? (hasMoon ? 'The Earth and the Moon' : 'The Earth, before the Moon') : d < 3 * AU ? 'The inner planets' : 'The solar system';
  }
}
