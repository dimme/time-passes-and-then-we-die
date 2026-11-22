import * as THREE from 'three';
import { NOW, yearToU, uToYear, envAt } from './timeline.js?v=c0a40a57';
import { World, LAND } from './world.js?v=c0a40a57';
import { Elevator, BASE, YEARS } from './elevator.js?v=c0a40a57';
import { buildFlora } from './flora.js?v=c0a40a57';
import { buildFauna, viewOf } from './fauna.js?v=c0a40a57';
import { Travel } from './sites.js?v=c0a40a57';
import { Space, LIFT } from './space.js?v=c0a40a57';
import { buildCity } from './city.js?v=c0a40a57';
import { Player } from './controls.js?v=c0a40a57';
import { UI } from './ui.js?v=c0a40a57';
import { Sound } from './audio.js?v=c0a40a57';
import { LIVE as ACTORS } from './people-actors.js?v=c0a40a57';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js?v=c0a40a57';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js?v=c0a40a57';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js?v=c0a40a57';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js?v=c0a40a57';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js?v=c0a40a57';
import { FXAAShader } from '../vendor/jsm/shaders/FXAAShader.js?v=c0a40a57';

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
  const PLAY_SECONDS = 720;   // "Let time pass" crosses the whole timeline in twelve minutes
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
  // where a sound of each kind comes from: a person, vehicle, aircraft or animal near the listener (none in range: no sound)
  const REACH = { people: 70, car: 160, horse: 120, flyer: 400, ship: 900, aircraft: 4000, animal: 220 };
  sound.locate = (kind) => {
    const e = sound.ear, R = REACH[kind] || 150, best = []; let total = 0;
    const take = (x, y, z) => { const d = Math.hypot(x - e[0], y - e[1], z - e[2]); if (d < R) { const w = 1 / (d + 8); best.push([x, y, z, w]); total += w; } };
    if (sound.inside) { if (kind !== 'people') return null; const now = performance.now(); for (const g of ACTORS) if (now - g.t < 600) for (let i = 0; i < g.np; i++) take(g.pts[i * 3], g.pts[i * 3 + 1], g.pts[i * 3 + 2]); }
    else if (travel.atHome) {
      if (kind === 'animal') { for (const a of fauna.herd.list) if (a.in && a.obj) take(a.obj.position.x, a.obj.position.y + 1, a.obj.position.z); }
      else for (const m of fauna.movers) if (m.sound === kind && m.np) for (let i = 0; i < m.np; i++) take(m.pts[i * 3], m.pts[i * 3 + 1], m.pts[i * 3 + 2]);
    } else if (kind === 'people') {
      const now = performance.now(); for (const g of ACTORS) if (now - g.t < 600) for (let i = 0; i < g.np; i++) take(g.pts[i * 3], g.pts[i * 3 + 1], g.pts[i * 3 + 2]);
    }
    if (!best.length) return null;
    let r = Math.random() * total; for (const b of best) { r -= b[3]; if (r <= 0) return [b[0], b[1], b[2]]; } return best[0].slice(0, 3);
  };
  const wake = () => sound.start();          // browsers only allow audio after a gesture
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);
  $('mute').addEventListener('click', () => { sound.setMuted(!sound.muted); $('mute').textContent = sound.muted ? 'Sound: off' : 'Sound: on'; });
  beginBtn.addEventListener('click', () => { $('intro').classList.add('gone'); });

  const env = {}, envWorld = {};

  // zooming out: 0 = standing on the ground, 1 = the whole solar system
  const space = new Space($('tags')), zoomEl = $('zoom');
  let zoom = 0, zoomTarget = 0;

  // ---- the space elevator (2990–9600): walk into the car in its plaza, ride up to the station, walk round, ride down.
  // Inside, the visitor walks in the car's (and the station's) own coordinates; the world outside is drawn from where the car is.
  const lift = new Elevator(), liftFloor = LAND + 0.25; home.add(lift.outside);
  const room = { surfaceAt: () => 0, heightAt: () => 0, sea: -1e9, profile: { bounds: { x: 1e4, z: 1e4 } }, deck: null };
  const worldCam = camera.clone(), lastIn = { x: 0, z: 0 }; let inLift = null;   // { world, collide } saved while inside
  const rideBtn = $('ride'), rideHud = $('ridehud');
  const fmtKm = (km) => (km < 10 ? (km * 1000).toFixed(0) + ' m' : Math.round(km).toLocaleString('en') + ' km');
  const realTime = (km) => { const h = km / 200; return h < 1 / 60 ? 'under a minute' : h < 1 ? Math.round(h * 60) + ' min' : h < 48 ? h.toFixed(1) + ' hours' : (h / 24).toFixed(1) + ' days'; };
  const enterLift = () => {
    inLift = { world: player.world, collide: player.collide };
    player.pos.x -= BASE.x; player.pos.z -= BASE.z; player.pos.y = 1.7; lastIn.x = player.pos.x; lastIn.z = player.pos.z;
    player.world = room; player.collide = (pos) => { lift.collide(pos, lastIn); lastIn.x = pos.x; lastIn.z = pos.z; };
    sound.inside = true;
  };
  const leaveLift = () => {
    if (!inLift) return; player.world = inLift.world; player.collide = inLift.collide; inLift = null; sound.inside = false;
    if (lift.stage !== 'ground') { lift.stage = 'ground'; lift.alt = 0; player.pos.x = 7; player.pos.z = 0; }   // the timeline moved on mid-ride: you are back in the plaza
    player.pos.x += BASE.x; player.pos.z += BASE.z; player.pos.y = liftFloor + 1.7; zoom = zoomTarget = 0;
  };
  const startLift = () => { if (inLift && lift.inCar(player.pos.x, player.pos.z)) lift.go(); };
  rideBtn.addEventListener('click', (e) => { e.stopPropagation(); startLift(); rideBtn.blur(); });
  addEventListener('keydown', (e) => { if (e.code === 'Enter') startLift(); });
  zoomEl.addEventListener('input', () => { zoomTarget = zoomEl.value / 1000; });
  mark('@wired');
  const draw = () => {
    const away = zoom > LIFT, sc = away ? space.scene : scene, cam = away ? space.camera : inLift ? worldCam : camera;
    if (post) { renderPass.scene = sc; renderPass.camera = cam; bloom.strength = away ? 0.55 : env.bloom; composer.render(); } else renderer.render(sc, cam);
    if (inLift) {   // the car (and the station) drawn over the outside, which shows through their windows
      const ex = renderer.toneMappingExposure; renderer.autoClear = false; renderer.clearDepth(); renderer.toneMappingExposure = 1;
      renderer.render(lift.scene, camera); renderer.autoClear = true; renderer.toneMappingExposure = ex;
    }
  };
  const simulate = (dt, time) => {
    const year = uToYear(u);
    travel.update(year, dt);
    envAt(u, env); travel.applyEnv(year, env); env.grass *= Q.grass;
    // the view from above
    // the space elevator
    const liftOn = travel.atHome && year >= YEARS[0] && year < YEARS[1];
    if (inLift && !liftOn) leaveLift();
    lift.outside.visible = liftOn && !inLift; lift.outside.position.set(BASE.x, liftFloor, BASE.z);
    if (liftOn && !inLift && zoom === 0 && lift.atDoor(player.pos.x - BASE.x, player.pos.z - BASE.z)) enterLift();
    if (inLift) { lift.update(dt, u, time); if (lift.outDoor(player.pos.x, player.pos.z)) leaveLift(); }
    const inCar = inLift && lift.inCar(player.pos.x, player.pos.z), ready = inCar && (lift.stage === 'ground' || lift.stage === 'top');
    rideBtn.classList.toggle('on', ready); rideBtn.textContent = lift.stage === 'top' ? 'Ride back down to the ground (Enter)' : 'Start the climb (Enter)';
    rideHud.classList.toggle('on', !!inLift && lift.stage !== 'ground');
    if (inLift && lift.stage !== 'ground') rideHud.innerHTML = `<b>${fmtKm(lift.alt)}</b><br>${lift.stage === 'top' ? 'The geostationary station: walk out of the door to look round; come back to the car to ride down' : lift.stage === 'up' ? 'Climbing' : 'Descending'}${lift.stage === 'top' ? '' : ` · a real climber would take ${realTime(Math.max(lift.alt, 0.001))} to get here`}`;
    const liftSpace = !!inLift && lift.alt > 2.5;   // above the weather: the outside is drawn by the space view
    if (inLift) { zoom = zoomTarget = liftSpace ? LIFT + 0.004 : 0; }
    if (inLift && lift.alt > 0.02) env.fogD /= 1 + (lift.alt * 1000) / 60;   // climbing out of the haze: the ground stays sharp below
    const k = player.keys;
    if (!inLift && k.has('KeyR')) zoomTarget = Math.min(1, zoomTarget + dt * 0.22);
    if (!inLift && k.has('KeyF')) zoomTarget = Math.max(0, zoomTarget - dt * 0.22);
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 6); if (Math.abs(zoomTarget - zoom) < 1e-4) zoom = zoomTarget;
    if (document.activeElement !== zoomEl) zoomEl.value = Math.round(zoomTarget * 1000);
    $('lift').style.opacity = inLift ? Math.max(0, 1 - Math.abs(lift.alt - 2.5) / 0.5) * 0.85 : Math.max(0, 1 - Math.abs(zoom - LIFT) / 0.014);   // a brief fade where the ride leaves the city for space
    $('tags').style.display = zoom > LIFT && !inLift ? 'block' : 'none'; document.body.classList.toggle('away', zoom > LIFT);
    sound.setDistance(inLift ? 0 : Math.min(1, zoom / (LIFT * 2.5)));
    if (zoom > LIFT) {
      envAt(u, envWorld);
      space.update(zoom, year, envWorld, travel.site, time, innerWidth / innerHeight, innerWidth, innerHeight);
      if (liftSpace) { player.update(dt); camera.updateMatrixWorld(); space.inside(lift.alt, camera.quaternion); sound.listen(camera); }
      renderer.toneMappingExposure = 1; return;
    }
    player.update(zoom > 0.002 ? 0 : dt);
    let view = camera;
    if (inLift) {   // the outside as seen from where the car is: the same view, from the plaza or from up the tether
      camera.updateMatrixWorld(); view = worldCam; worldCam.quaternion.copy(camera.quaternion);
      worldCam.position.set(BASE.x + camera.position.x, liftFloor + lift.alt * 1000 + camera.position.y, BASE.z + camera.position.z);
      worldCam.aspect = camera.aspect; worldCam.far = Math.max(camera.far, 30000); worldCam.near = camera.near; worldCam.updateProjectionMatrix();
    }
    world.update(env, dt, time, view, u);
    if (zoom > 0) {   // lifting off: rise and look down
      const s = zoom / LIFT; camera.position.y += s * s * 700; camera.rotation.x += (-1.3 - camera.rotation.x) * Math.min(1, s * 1.4);
    }
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();   // culling below needs this frame's view
    if (view !== camera) { view.updateMatrixWorld(); view.matrixWorldInverse.copy(view.matrixWorld).invert(); }
    flora.update(u, time, env, view, travel.atHome);
    travel.updateContent(u, time, env, view, viewOf(view));
    world.sky.position.copy(view.position);
    sound.listen(camera);
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
    if (playing) { setU(uTarget + dt / PLAY_SECONDS); if (uTarget >= 1) stop(); }
    u += (uTarget - u) * Math.min(1, dt * 12);
    if (Math.abs(uTarget - u) < 1e-7) u = uTarget;
    try {
      simulate(dt, time);
      ui.update(u, env.glow, travel.eventAt(uToYear(u)), travel.site.place);
      sound.setPlace(travel.atHome ? 'home' : travel.id); sound.update(u, dt);
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
  window.game = { lift: null, setYear: (y) => { uTarget = u = yearToU(y); }, setU: (v) => { uTarget = u = v; }, get year() { return uToYear(u); }, get quality() { return quality; }, travel, setZoom: (z) => { zoom = zoomTarget = z; }, get post() { return post; }, timings, player, renderer, city, sound, fauna, THREE };
  window.game.lift = lift;
}
boot().catch((err) => fatal('The game could not start.', err && err.stack ? err.stack : err));
