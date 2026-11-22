// Developer tool: shows one model from four angles on neutral ground.
//   tools/viewer.html?m=animal:theropod&t=1.2      t = animation time / gait phase
//   m = animal:<species> | person:<variant> | car[:old|pod] | cart | flyer | ship:<sail|steam|cargo>
//       | air:<kind>[:trail] | tree:<kind> | building:<type>[:seed] | list
//       | actor:<outfit>:<action>[:prop]      a person doing something at time t (prop: names joined with '+', or 'none')
import * as THREE from 'three';
import { rng } from '../src/util.js?v=c0a40a57';
import { animTime } from '../src/organic.js?v=c0a40a57';
import { species, pose } from '../src/animals.js?v=c0a40a57';
import { personParts } from '../src/people.js?v=c0a40a57';
import { actors, OUTFITS, ACTIONS, PROPS } from '../src/people-actors.js?v=c0a40a57';
import { carParts, cartParts, flyerParts, shipParts } from '../src/vehicles.js?v=c0a40a57';
import { airParts, AIR_KINDS } from '../src/vehicles-air.js?v=c0a40a57';
import { makeKinds } from '../src/flora.js?v=c0a40a57';
import { TYPES } from '../src/city.js?v=c0a40a57';

const q = new URLSearchParams(location.search), spec = (q.get('m') || 'list').split(':'), t = parseFloat(q.get('t') || '0');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c0d2);

// a plain sky to reflect, a sun and a fill light
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 d; void main(){ d = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'varying vec3 d; void main(){ float h = normalize(d).y; gl_FragColor = vec4(mix(vec3(0.75,0.82,0.88), vec3(0.25,0.5,0.9), clamp(h,0.0,1.0)) * (h < 0.0 ? 0.35 : 1.0), 1.0); }' });
const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), skyMat));
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0, 0.1, 100).texture; scene.environmentIntensity = 0.9;
const sun = new THREE.DirectionalLight(0xfff2dc, 3); sun.position.set(-30, 60, 40); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target, new THREE.HemisphereLight(0xffffff, 0x556655, 0.35));
const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x74806a, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);

/** Instanced part lists (people, vehicles, trees) → a group with one instance, tinted with sample colours. */
function fromParts(parts, tints = {}) {
  const g = new THREE.Group(), m4 = new THREE.Matrix4().makeTranslation(t * 1.3, 0, 0), c = new THREE.Color();   // walking shaders read the instance position
  for (const p of parts) {
    const im = new THREE.InstancedMesh(p.geo, p.mat, 1); im.setMatrixAt(0, m4); im.frustumCulled = false; im.castShadow = p.cast !== false; im.receiveShadow = true;
    const tint = p.tint === false ? [1, 1, 1] : tints[p.tintKey || 'tint'] || [1, 1, 1]; im.setColorAt(0, c.setRGB(...tint)); g.add(im);
  }
  g.userData.offset = t * 1.3; return g;
}
const lin = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const outfit = { tint: lin(q.get('top') || '#7a2a2a'), legs: lin(q.get('legs') || '#2a3a5a'), skin: lin(q.get('skin') || '#c8956c'), glow: [0.1, 1.5, 1.8] };
const kinds = { animal: () => Object.keys(species()), person: () => [...OUTFITS, 'umbrella'], actor: () => ACTIONS, car: () => ['', 'old', 'pod'], ship: () => ['sail', 'steam', 'cargo'], air: () => AIR_KINDS, tree: () => Object.keys(makeKinds()), building: () => Object.keys(TYPES) };

function build() {
  const [kind, name, extra] = spec;
  if (kind === 'animal') { const a = species()[name](); pose(a, t * 3, t); return a.obj; }
  if (kind === 'person') return fromParts(personParts(name || 'modern'), outfit);
  if (kind === 'actor') {   // walking actions travel along +x; the colours are the outfit's own unless given in the URL
    const tints = {}; for (const [k, key] of [['top', 'tint'], ['legs', 'legs'], ['skin', 'skin']]) if (q.get(k)) tints[key] = lin(q.get(k));
    const site = actors(null, [{ outfit: name, action: extra, prop: spec[3], x: 0, z: 0, rot: 0, phase: 0, s: 1, path: [[0, 0], [4000, 0]], speed: 1.2, ...tints }], { seed: parseInt(q.get('seed') || '1', 10) });
    site.update(0, t);
    const g = new THREE.Group(), m4 = new THREE.Matrix4(); g.add(...site.meshes); site.meshes[0].getMatrixAt(0, m4);
    const off = g.userData.offset = Math.abs(m4.elements[12]) > 0.6 ? 1.2 * t : 0; g.userData.box = new THREE.Box3(new THREE.Vector3(off - 1.2, 0, -1.2), new THREE.Vector3(off + 1.2, 2.2, 1.2));
    g.userData.note = `${site.meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0)} triangles in ${site.meshes.length} draw calls`;
    return g;
  }
  if (kind === 'car') return fromParts(carParts(name || undefined), { tint: lin(q.get('top') || '#b01818') });
  if (kind === 'cart') return fromParts(cartParts(species()));
  if (kind === 'flyer') { const g = fromParts(flyerParts(name === 'bright')); g.position.y = 1.5; return g; }
  if (kind === 'ship') return fromParts(shipParts(name || 'sail'));
  if (kind === 'air') { const g = fromParts(airParts(name, { trail: extra === 'trail' }), { tint: lin(q.get('top') || '#1c3a8a') }); g.position.y = 60; return g; }
  if (kind === 'tree') return fromParts(makeKinds()[name], { tint: [1, 1, 1] });
  if (kind === 'building') { const o = TYPES[name](rng(parseInt(extra || '7', 10))).obj; o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; }
  return null;
}

const label = document.getElementById('label');
let obj = null;
try { obj = build(); } catch (err) { label.textContent = 'ERROR: ' + (err.stack || err); console.error(err); }
if (!obj) {
  if (!label.textContent) label.innerHTML = 'models: ' + Object.entries(kinds).map(([k, f]) => f().map((n) => `${k}${n ? ':' + n : ''}`).join(', ')).join(' | ') + ' | cart | flyer | actor:&lt;outfit&gt;:&lt;action&gt;[:prop], props: ' + PROPS.join(', ');
  window.viewerReady = true;
} else {
  scene.add(obj); animTime.value = t;
  const box = obj.userData.box || new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z) * 0.62 + 0.05;
  sun.position.copy(mid).add(new THREE.Vector3(-0.5, 0.9, 0.6).multiplyScalar(R * 6)); sun.target.position.copy(mid);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -R * 2.2; sc.right = sc.top = R * 2.2; sc.near = R * 0.5; sc.far = R * 14; sc.updateProjectionMatrix();
  label.textContent = `${spec.join(':')}  —  ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m (length × height × width), t=${t}` + (obj.userData.note ? ', ' + obj.userData.note : '');
  const cam = new THREE.PerspectiveCamera(30, 1, R * 0.05, R * 60);
  // three-quarter front, side, front, three-quarter back from above
  const views = [[0.75, 0.22, 0.65], [0, 0.08, 1], [1, 0.1, 0], [-0.7, 0.55, -0.6]];
  const zoom = parseFloat(q.get('zoom') || '1'), look = mid.clone(); if (q.get('focus')) { const [fx, fy, fz] = q.get('focus').split(',').map(Number); look.set(fx + (obj.userData.offset || 0), fy, fz); }
  const draw = () => {
    const W = innerWidth, Hh = innerHeight; renderer.setScissorTest(true);
    views.forEach((v, i) => {
      const x = (i % 2) * (W / 2), y = (i < 2 ? 1 : 0) * (Hh / 2);
      renderer.setViewport(x, y, W / 2, Hh / 2); renderer.setScissor(x, y, W / 2, Hh / 2);
      cam.aspect = W / Hh; cam.position.copy(look).add(new THREE.Vector3(...v).normalize().multiplyScalar((R / Math.tan(0.26)) * 1.05 / zoom)); cam.lookAt(look); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
    });
  };
  draw(); requestAnimationFrame(() => { draw(); window.viewerReady = true; });
}
