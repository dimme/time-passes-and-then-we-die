import * as THREE from 'three';
import { NOW, yearToU, uToYear, envAt } from './timeline.js';
import { World } from './world.js';
import { buildFlora } from './flora.js';
import { buildFauna } from './fauna.js';
import { buildCity } from './city.js';
import { Player } from './controls.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 12000);

const world = new World(scene, renderer);
const flora = buildFlora(world, scene);
const fauna = buildFauna(world, scene);
const city = buildCity(world, scene);
const player = new Player(camera, canvas, world, city);

// HDR pipeline: render → bloom (sun, fire, neon, lava) → filmic tone mapping
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.7, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let uTarget = yearToU(NOW), u = uTarget, playing = false;
const setU = (v) => { uTarget = Math.max(0, Math.min(1, v)); };
const ui = new UI({
  onScrub: (v) => { setU(v); stop(); },
  onPlay: () => { playing = !playing; if (playing && uTarget >= 0.999) { uTarget = u = 0; } ui.setPlaying(playing); },
  onNow: () => { stop(); setU(yearToU(NOW)); },
});
function stop() { if (playing) { playing = false; ui.setPlaying(false); } }

// scrub with the wheel or Q / E so you never have to let go of the mouse-look
addEventListener('wheel', (e) => { e.preventDefault(); stop(); setU(uTarget + Math.sign(e.deltaY) * Math.min(120, Math.abs(e.deltaY)) * 0.00004); }, { passive: false });
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); document.getElementById('play').click(); }
  if (e.code === 'KeyN') document.getElementById('now').click();
  if (e.code === 'KeyM') document.getElementById('mute').click();
});

const sound = new Sound();
const muteBtn = document.getElementById('mute');
const wake = () => sound.start();          // browsers only allow audio after a gesture
addEventListener('pointerdown', wake); addEventListener('keydown', wake);
muteBtn.addEventListener('click', () => { sound.setMuted(!sound.muted); muteBtn.textContent = sound.muted ? 'Sound: off' : 'Sound: on'; });
const intro = document.getElementById('intro');
document.getElementById('begin').addEventListener('click', () => { intro.classList.add('gone'); });

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const env = {};
let last = performance.now(), time = 0;
function frame(nowMs) {
  const dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs; time += dt;
  const k = player.keys, fast = k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1;
  if (k.has('KeyE') || k.has('Period')) { stop(); setU(uTarget + dt * 0.012 * fast); }
  if (k.has('KeyQ') || k.has('Comma')) { stop(); setU(uTarget - dt * 0.012 * fast); }
  if (playing) { setU(uTarget + dt / 150); if (uTarget >= 1) stop(); }
  u += (uTarget - u) * Math.min(1, dt * 12);
  if (Math.abs(uTarget - u) < 1e-7) u = uTarget;

  envAt(u, env);
  world.update(env, dt, time, camera, u);
  flora.update(u);
  fauna.update(u, time);
  city.update(u, time);
  player.update(dt);
  world.sky.position.copy(camera.position);
  ui.update(u, env.glow);
  sound.update(u, dt);
  bloom.strength = env.bloom; renderer.toneMappingExposure = env.exposure;
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handy for poking at the world from the console
window.game = { setYear: (y) => { uTarget = u = yearToU(y); }, setU: (v) => { uTarget = u = v; }, get year() { return uToYear(u); }, player, renderer, city, sound };
