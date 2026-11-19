import * as THREE from 'three';
import { NOW, yearToU, uToYear, envAt } from './timeline.js';
import { World } from './world.js';
import { buildFlora } from './flora.js';
import { buildFauna, viewOf } from './fauna.js';
import { Travel } from './sites.js';
import { Space, LIFT } from './space.js';
import { buildCity } from './city.js';
import { Player } from './controls.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from '../vendor/jsm/shaders/FXAAShader.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view'), beginBtn = $('begin'), statusEl = $('loadstatus');

// ---------- quality levels ----------
const LEVELS = {
  low: { ratio: 1, shadow: 0, post: false, grass: 0.35, label: 'Low' },
  medium: { ratio: 1.5, shadow: 2048, post: true, grass: 0.7, label: 'Medium' },
  high: { ratio: 2, shadow: 4096, post: true, grass: 1, label: 'High' },
};
const store = { get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } } };
const asked = new URLSearchParams(location.search).get('q') || store.get('quality');
let quality = LEVELS[asked] ? asked : 'medium';
let Q = LEVELS[quality];

// ---------- anything that goes wrong is shown on screen, not just in the console ----------
function fatal(msg, detail) {
  const el = $('fatal'); el.style.display = 'block';
  el.innerHTML = `<b>${msg}</b>${detail ? `<pre>${String(detail).replace(/</g, '&lt;').slice(0, 1200)}</pre>` : ''}<p>Try <a href="?q=low">low quality</a>, or a different browser.</p>`;
  console.error(msg, detail || '');
}
addEventListener('error', (e) => fatal('Something broke while running the game.', e.error && e.error.stack ? e.error.stack : e.message));
addEventListener('unhandledrejection', (e) => fatal('Something broke while loading the game.', e.reason && e.reason.stack ? e.reason.stack : e.reason));
const pause = () => new Promise((r) => setTimeout(r, 20));   // let the browser paint between heavy steps

async function boot() {
  const t0 = performance.now(), timings = {};
  const mark = (label) => { timings[label] = Math.round(performance.now() - t0); };
  const step = async (label, fn) => { statusEl.textContent = label + '…'; await pause(); const t = performance.now(); const v = await fn(); timings[label] = Math.round(performance.now() - t); return v; };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q.post, powerPreference: 'high-performance' });
  } catch (err) { fatal('This browser could not start WebGL, which the game needs.', err); return; }
  const gl = renderer.getContext();
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.ratio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 12000);

  // if the GPU drops us (usually out of memory), come back once at the lowest setting
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (quality !== 'low' && !sessionStorage.getItem('ctxlost')) { sessionStorage.setItem('ctxlost', '1'); store.set('quality', 'low'); location.search = '?q=low'; }
    else fatal('The browser lost its graphics context.', 'The GPU ran out of memory or was reset. Reload the page to try again.');
  });

  mark('@renderer');
  const world = await step('Shaping the land and sky', () => new World(scene, renderer));
  // Manhattan lives in its own group, so it can step aside while another place is on screen
  const home = new THREE.Group(); scene.add(home);
  const flora = await step('Growing 400 million years of plants', () => buildFlora(world, home));
  const fauna = await step('Raising the animals and the people', () => buildFauna(world, home));
  const city = await step('Building and demolishing Manhattan', () => buildCity(world, home));
  scene.add(flora.cover.mesh);   // the ground cover goes wherever the visitor goes
  mark('@built');
  const player = new Player(camera, canvas, world, city);
  const travel = new Travel({ world, scene, player, home: {
    group: home, collide: (pos) => city.collide(pos),
    update: (u, t, env, cam) => { fauna.update(u, t, cam); city.update(u, t); },
  } });
  $('follow').addEventListener('click', () => { travel.follow = !travel.follow; $('follow').textContent = travel.follow ? 'Place: follow history' : 'Place: stay in Manhattan'; });

  // HDR pipeline: render → bloom (sun, fire, neon, lava) → filmic tone mapping → anti-aliasing.
  // Multisampled float targets are not available everywhere, so ask before relying on them.
  let post = Q.post, composer = null, bloom = null, fxaa = null, renderPass = null;
  const floatOK = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  if (floatOK) {
    let msaa = 0;
    if (quality === 'high') { try { const s = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES); if (s && Array.from(s).includes(4)) msaa = 4; } catch (_) { msaa = 0; } }
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaa }));
    renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.7, 1.0); composer.addPass(bloom);
    composer.addPass(new OutputPass());
    if (!msaa) { fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa); }
  } else post = false;

  function applyQuality(name, remember) {
    quality = name; Q = LEVELS[name]; if (remember) store.set('quality', name);
    post = Q.post && !!composer;
    world.shadows = Q.shadow > 0;
    const sun = world.sunLight;
    if (Q.shadow && sun.shadow.mapSize.x !== Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    renderer.setPixelRatio(Math.min(devicePixelRatio, Q.ratio));
    $('quality').textContent = 'Quality: ' + Q.label;
    resize();
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
    if (fxaa) fxaa.material.uniforms.resolution.value.set(1 / (innerWidth * renderer.getPixelRatio()), 1 / (innerHeight * renderer.getPixelRatio()));
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  applyQuality(quality, false);
  $('quality').addEventListener('click', () => { const order = ['low', 'medium', 'high']; autoTune = false; applyQuality(order[(order.indexOf(quality) + 1) % 3], true); });

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
    if (e.code === 'Space') { e.preventDefault(); $('play').click(); }
    if (e.code === 'KeyN') $('now').click();
    if (e.code === 'KeyM') $('mute').click();
    if (e.code === 'KeyG') zoomTarget = 0;   // straight back to the ground
  });

  const sound = new Sound();
  const wake = () => sound.start();          // browsers only allow audio after a gesture
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);
  $('mute').addEventListener('click', () => { sound.setMuted(!sound.muted); $('mute').textContent = sound.muted ? 'Sound: off' : 'Sound: on'; });
  beginBtn.addEventListener('click', () => { $('intro').classList.add('gone'); });

  const env = {}, envWorld = {};

  // zooming out: 0 = standing on the ground, 1 = the whole solar system
  const space = new Space($('tags')), zoomEl = $('zoom');
  let zoom = 0, zoomTarget = 0;
  zoomEl.addEventListener('input', () => { zoomTarget = zoomEl.value / 1000; });
  mark('@wired');
  const draw = () => {
    const away = zoom > LIFT, sc = away ? space.scene : scene, cam = away ? space.camera : camera;
    if (post) { renderPass.scene = sc; renderPass.camera = cam; bloom.strength = away ? 0.55 : env.bloom; composer.render(); } else renderer.render(sc, cam);
  };
  const simulate = (dt, time) => {
    const year = uToYear(u);
    travel.update(year, dt);
    envAt(u, env); travel.applyEnv(year, env); env.grass *= Q.grass;
    // the view from above
    const k = player.keys;
    if (k.has('KeyR')) zoomTarget = Math.min(1, zoomTarget + dt * 0.22);
    if (k.has('KeyF')) zoomTarget = Math.max(0, zoomTarget - dt * 0.22);
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 6); if (Math.abs(zoomTarget - zoom) < 1e-4) zoom = zoomTarget;
    if (document.activeElement !== zoomEl) zoomEl.value = Math.round(zoomTarget * 1000);
    $('lift').style.opacity = Math.max(0, 1 - Math.abs(zoom - LIFT) / 0.014);
    $('tags').style.display = zoom > LIFT ? 'block' : 'none'; document.body.classList.toggle('away', zoom > LIFT);
    sound.setDistance(Math.min(1, zoom / (LIFT * 2.5)));
    if (zoom > LIFT) {
      envAt(u, envWorld);
      space.update(zoom, year, envWorld, travel.site, time, innerWidth / innerHeight, innerWidth, innerHeight);
      renderer.toneMappingExposure = 1; return;
    }
    world.update(env, dt, time, camera, u);
    player.update(zoom > 0.002 ? 0 : dt);
    if (zoom > 0) {   // lifting off: rise and look down
      const s = zoom / LIFT; camera.position.y += s * s * 700; camera.rotation.x += (-1.3 - camera.rotation.x) * Math.min(1, s * 1.4);
    }
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();   // culling below needs this frame's view
    flora.update(u, time, env, camera, travel.atHome);
    travel.updateContent(u, time, env, camera, viewOf(camera));
    world.sky.position.copy(camera.position);
    renderer.toneMappingExposure = env.exposure;
  };

  // warm up: compile the shaders for the opening scene before showing it, instead of freezing on the first frame
  await step('Compiling shaders', async () => { simulate(0, 0); if (renderer.compileAsync) await renderer.compileAsync(scene, camera); });
  await step('Drawing the first frame', () => { simulate(0.016, 0.016); draw(); });
  // some browsers silently draw nothing through the post-processing chain; if the picture is pure black, bypass it
  if (post) {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(4 * 16 * 16); let sum = 0;
    for (const [fx, fy] of [[0.5, 0.8], [0.3, 0.5], [0.7, 0.3]]) { gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px); for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2]; }
    if (sum === 0) { console.warn('Post-processing produced a black frame; falling back to direct rendering.'); composer = null; post = false; draw(); }
  }
  timings.total = Math.round(performance.now() - t0);
  console.info('Load timings (ms):', timings, '| quality:', quality, '| post-processing:', post);
  statusEl.textContent = ''; beginBtn.disabled = false; beginBtn.textContent = 'Begin';

  let last = performance.now(), time = 0.016, slow = 0, frames = 0, autoTune = !asked, failed = false;
  function frame(nowMs) {
    if (failed) return;
    requestAnimationFrame(frame);
    const raw = (nowMs - last) / 1000, dt = Math.min(0.1, Math.max(0, raw)); last = nowMs; time += dt;
    const k = player.keys, fast = k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1;
    if (k.has('KeyE') || k.has('Period')) { stop(); setU(uTarget + dt * 0.012 * fast); }
    if (k.has('KeyQ') || k.has('Comma')) { stop(); setU(uTarget - dt * 0.012 * fast); }
    if (playing) { setU(uTarget + dt / 150); if (uTarget >= 1) stop(); }
    u += (uTarget - u) * Math.min(1, dt * 12);
    if (Math.abs(uTarget - u) < 1e-7) u = uTarget;
    try {
      simulate(dt, time);
      ui.update(u, env.glow, travel.eventAt(uToYear(u)), travel.site.place);
      sound.update(u, dt);
      draw();
    } catch (err) {
      if (post) { console.warn('Post-processing failed; falling back to direct rendering.', err); composer = null; post = false; return; }
      failed = true; fatal('The 3D view stopped working.', err && err.stack ? err.stack : err);
    }
    // if nobody chose a quality and the machine is struggling, step down by itself
    if (autoTune && document.visibilityState === 'visible' && ++frames > 40) {
      slow = raw > 0.045 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 90 && quality !== 'low') { slow = 0; frames = 0; applyQuality(quality === 'high' ? 'medium' : 'low', false); }
    }
  }
  requestAnimationFrame(frame);

  // handy for poking at the world from the console
  window.game = { setYear: (y) => { uTarget = u = yearToU(y); }, setU: (v) => { uTarget = u = v; }, get year() { return uToYear(u); }, get quality() { return quality; }, travel, setZoom: (z) => { zoom = zoomTarget = z; }, get post() { return post; }, timings, player, renderer, city, sound, fauna, THREE };
}
boot().catch((err) => fatal('The game could not start.', err && err.stack ? err.stack : err));
