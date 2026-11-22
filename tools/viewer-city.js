// Developer tool: the city's landmarks, props and corner buildings from four angles (the shared viewer only knows the building types).
//   tools/viewer-city.html?m=landmark:esb|chrysler|north|south|wtc1|bridge
//                          prop:camp|village|fort|windmill|palisade|park|pool|elevator|fire|gas|crook|cobra|signal|hydrant|subway
//                          building:<type>[:seed[:corner]]          &zoom=2&focus=x,y,z&night=1
import * as THREE from 'three';
import { rng } from '../src/util.js?v=740e009b';
import { setNight } from '../src/city-kit.js?v=740e009b';
import { TYPES } from '../src/city-types.js?v=740e009b';
import { empireState, chrysler, twinTower, oneWTC, bridge } from '../src/city-landmarks.js?v=740e009b';
import * as P from '../src/city-props.js?v=740e009b';

const q = new URLSearchParams(location.search), [kind, name, seed, corner] = (q.get('m') || 'landmark:esb').split(':'), r = rng(parseInt(seed || '7', 10)), night = q.get('night') === '1';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(night ? 0x0a1020 : 0xa9c0d2);
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 d; void main(){ d = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'varying vec3 d; void main(){ float h = normalize(d).y; gl_FragColor = vec4(mix(vec3(0.75,0.82,0.88), vec3(0.25,0.5,0.9), clamp(h,0.0,1.0)) * (h < 0.0 ? 0.35 : 1.0), 1.0); }' });
const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), skyMat));
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0, 0.1, 100).texture; scene.environmentIntensity = night ? 0.08 : 0.9;
const sun = new THREE.DirectionalLight(0xfff2dc, night ? 0.15 : 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target, new THREE.HemisphereLight(0xffffff, 0x556655, night ? 0.05 : 0.35));
const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x74806a, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);


const parts = (list) => { const g = new THREE.Group(); for (const p of list) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = p.cast; m.receiveShadow = true; g.add(m); } return g; };
const make = {
  landmark: { esb: () => empireState(r).obj, chrysler: () => chrysler(r).obj, north: () => twinTower(r, true).obj, south: () => twinTower(r, false).obj, wtc1: () => oneWTC(r).obj, bridge: () => { ground.position.y = -8; return bridge(r); } },
  prop: { camp: () => P.paleoCamp(r), village: () => P.lenapeVillage(r), fort: () => P.fort(r), windmill: () => P.windmill(r), palisade: () => P.palisade(r), park: () => P.park(r), pool: P.pool, elevator: P.elevator, fire: P.campfire,
    gas: () => parts(P.lampParts('gas')), crook: () => parts(P.lampParts('crook')), cobra: () => parts(P.lampParts('cobra')), signal: () => parts(P.signalParts()), hydrant: () => parts(P.hydrantParts()), subway: () => parts(P.subwayParts()) },
  building: new Proxy({}, { get: (_, t) => () => TYPES[t](r, parseInt(corner || '0', 10)).obj }),
};
const label = document.getElementById('label');
let obj;
try { obj = make[kind][name](); } catch (err) { label.textContent = 'ERROR: ' + (err.stack || err); console.error(err); }
setNight(night ? 1 : 0);
if (!obj) window.viewerReady = true;
else {
  scene.add(obj); if (obj.userData.tick) obj.userData.tick(1.3);
  obj.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3()), R = Math.max(size.x, size.y, size.z) * 0.62 + 0.05;
  let tris = 0, calls = 0; obj.traverse((m) => { if (m.isMesh) { calls++; tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; } });
  sun.position.copy(mid).add(new THREE.Vector3(-0.5, 0.9, 0.6).multiplyScalar(R * 6)); sun.target.position.copy(mid);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -R * 2.2; sc.right = sc.top = R * 2.2; sc.near = R * 0.5; sc.far = R * 14; sc.updateProjectionMatrix();
  label.textContent = `${kind}:${name} — ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m, ${Math.round(tris)} triangles, ${calls} draw calls`;
  const cam = new THREE.PerspectiveCamera(30, 1, R * 0.05, R * 60), views = [[0.75, 0.22, 0.65], [0, 0.08, 1], [1, 0.1, 0], [-0.7, 0.55, -0.6]];
  const zoom = parseFloat(q.get('zoom') || '1'), look = mid.clone(); if (q.get('focus')) look.set(...q.get('focus').split(',').map(Number));
  const draw = () => {
    const W = innerWidth, H = innerHeight; renderer.setScissorTest(true);
    views.forEach((v, i) => {
      const x = (i % 2) * (W / 2), y = (i < 2 ? 1 : 0) * (H / 2);
      renderer.setViewport(x, y, W / 2, H / 2); renderer.setScissor(x, y, W / 2, H / 2);
      cam.aspect = W / H; cam.position.copy(look).add(new THREE.Vector3(...v).normalize().multiplyScalar(((R / Math.tan(0.26)) * 1.05) / zoom)); cam.lookAt(look); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
    });
  };
  draw(); requestAnimationFrame(() => { draw(); window.viewerReady = true; });
}
