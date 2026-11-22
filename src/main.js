import * as THREE from 'three';
import { NOW, yearToU, uToYear, envAt } from './timeline.js?v=fea1c89f';
import { World } from './world.js?v=fea1c89f';
import { buildFlora } from './flora.js?v=fea1c89f';
import { buildFauna, viewOf } from './fauna.js?v=fea1c89f';
import { Travel } from './sites.js?v=fea1c89f';
import { Space, LIFT } from './space.js?v=fea1c89f';
import { buildCity } from './city.js?v=fea1c89f';
import { Player } from './controls.js?v=fea1c89f';
import { UI } from './ui.js?v=fea1c89f';
import { Sound } from './audio.js?v=fea1c89f';
import { LIVE as ACTORS } from './people-actors.js?v=fea1c89f';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js?v=fea1c89f';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js?v=fea1c89f';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js?v=fea1c89f';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js?v=fea1c89f';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js?v=fea1c89f';
import { FXAAShader } from '../vendor/jsm/shaders/FXAAShader.js?v=fea1c89f';

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
    if (travel.atHome) {
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

  // ---- the space elevator (2990–9600): board at the pad on the shore, a shuttle takes you out to the ground station in the
  // harbour, and the climber carries you up the tether to the station at geostationary height, 35,786 km up; then back down.
  const LIFT_YEARS = [2990, 9600], BASE = { x: 420, z: 200 }, PAD = { x: 226, z: 200 }, GEO = 35786, CLIMB = 42, GLIDE = 4;
  const pad = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8adfe8, transparent: true, opacity: 0.8, depthWrite: false })); home.add(pad);
  let ride = null;   // { stage: 'out' | 'up' | 'top' | 'down' | 'back', t, from }
  const altAt = (s) => 0.02 + (GEO - 0.02) * (Math.exp(7 * s) - 1) / (Math.exp(7) - 1);   // km: slow off the ground, fast in the empty middle
  const rideBtn = $('ride'), rideHud = $('ridehud');
  const fmtKm = (km) => (km < 10 ? (km * 1000).toFixed(0) + ' m' : Math.round(km).toLocaleString('en') + ' km');
  const realTime = (km) => { const h = km / 200; return h < 1 / 60 ? 'under a minute' : h < 1 ? Math.round(h * 60) + ' min' : h < 48 ? h.toFixed(1) + ' hours' : (h / 24).toFixed(1) + ' days'; };
  const startRide = () => { if (!ride) { ride = { stage: 'out', t: 0, from: { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw } }; zoom = zoomTarget = 0; } else if (ride.stage === 'top') { ride.stage = 'down'; ride.t = 0; } };
  rideBtn.addEventListener('click', (e) => { e.stopPropagation(); startRide(); rideBtn.blur(); });
  addEventListener('keydown', (e) => { if (e.code === 'Enter' && (rideBtn.classList.contains('on'))) startRide(); });
  const endRide = () => { if (!ride) return; player.pos.x = ride.from.x; player.pos.z = ride.from.z; player.yaw = ride.from.yaw; player.pos.y = ride.from.y; ride = null; space.ride = null; zoom = zoomTarget = 0; };
  /** Advance the ride; returns the altitude in km (0 while gliding over the harbour). */
  const stepRide = (dt, year) => {
    if (!travel.atHome || year < LIFT_YEARS[0] || year >= LIFT_YEARS[1]) { endRide(); return 0; }
    ride.t += dt;
    if (ride.stage === 'out' && ride.t > GLIDE) { ride.stage = 'up'; ride.t = 0; }
    if (ride.stage === 'up' && ride.t > CLIMB) { ride.stage = 'top'; ride.t = 0; }
    if (ride.stage === 'down' && ride.t > CLIMB) { ride.stage = 'back'; ride.t = 0; }
    if (ride.stage === 'back' && ride.t > GLIDE) { endRide(); return 0; }
    const s = Math.min(1, ride.t / CLIMB);
    return ride.stage === 'up' ? altAt(s) : ride.stage === 'top' ? GEO : ride.stage === 'down' ? altAt(1 - s) : 0;
  };
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
    // the space elevator
    const liftOn = travel.atHome && year >= LIFT_YEARS[0] && year < LIFT_YEARS[1];
    pad.visible = liftOn; if (liftOn) pad.position.set(PAD.x, world.surfaceAt(PAD.x, PAD.z) + 0.08, PAD.z);
    const alt = ride ? stepRide(dt, year) : 0, near = liftOn && !ride && zoom === 0 && Math.hypot(player.pos.x - PAD.x, player.pos.z - PAD.z) < 9;
    rideBtn.classList.toggle('on', near || (ride && ride.stage === 'top')); rideBtn.textContent = ride ? 'Ride back down to the ground (Enter)' : 'Take the space elevator (Enter)';
    rideHud.classList.toggle('on', !!ride);
    if (ride) {
      rideHud.innerHTML = ride.stage === 'out' || ride.stage === 'back' ? (ride.stage === 'out' ? 'Shuttle to the ground station' : 'Back to the shore') : `<b>${fmtKm(alt)}</b><br>${ride.stage === 'top' ? 'Geostationary station: you circle the Earth once a day, hanging over the same spot' : ride.stage === 'up' ? 'Climbing' : 'Descending'} · a real climber would take ${realTime(Math.max(alt, 0.001))} to get here`;
      zoom = zoomTarget = alt > 3 ? LIFT + 0.004 : 0; space.ride = alt > 3 ? alt : null;
    }
    const k = player.keys;
    if (!ride && k.has('KeyR')) zoomTarget = Math.min(1, zoomTarget + dt * 0.22);
    if (!ride && k.has('KeyF')) zoomTarget = Math.max(0, zoomTarget - dt * 0.22);
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 6); if (Math.abs(zoomTarget - zoom) < 1e-4) zoom = zoomTarget;
    if (document.activeElement !== zoomEl) zoomEl.value = Math.round(zoomTarget * 1000);
    $('lift').style.opacity = ride ? Math.max(0, 1 - Math.abs(alt - 3) / 0.6) * 0.8 : Math.max(0, 1 - Math.abs(zoom - LIFT) / 0.014);   // a brief fade where the ride leaves the city for space
    $('tags').style.display = zoom > LIFT && !ride ? 'block' : 'none'; document.body.classList.toggle('away', zoom > LIFT);
    sound.setDistance(Math.min(1, zoom / (LIFT * 2.5)));
    if (zoom > LIFT) {
      envAt(u, envWorld);
      space.update(zoom, year, envWorld, travel.site, time, innerWidth / innerHeight, innerWidth, innerHeight);
      renderer.toneMappingExposure = 1; return;
    }
    world.update(env, dt, time, camera, u);
    player.update(zoom > 0.002 || ride ? 0 : dt);
    if (ride) {   // in the shuttle over the harbour, or in the climber below 3 km: the camera rides along
      const gy = Math.max(world.heightAt(BASE.x, BASE.z), world.sea), g = Math.min(1, ride.t / GLIDE), e = g * g * (3 - 2 * g), f = ride.from;
      if (ride.stage === 'out' || ride.stage === 'back') {
        const k2 = ride.stage === 'out' ? e : 1 - e, tx = BASE.x + 12, tz = BASE.z + 12, ty = gy + 52;
        camera.position.set(f.x + (tx - f.x) * k2, f.y + (ty - f.y) * k2, f.z + (tz - f.z) * k2);
        camera.rotation.set(0.15 * k2, -Math.PI / 2 + (f.yaw + Math.PI / 2) * (1 - k2) * 0 + 0, 0, 'YXZ'); camera.lookAt(BASE.x, gy + 60 + 400 * k2, BASE.z);
      } else {
        camera.position.set(BASE.x + 12, gy + 52 + alt * 1000, BASE.z + 12); camera.rotation.set(-0.12 - Math.min(0.5, alt * 0.2), Math.PI / 2, 0, 'YXZ');
      }
    }
    if (zoom > 0) {   // lifting off: rise and look down
      const s = zoom / LIFT; camera.position.y += s * s * 700; camera.rotation.x += (-1.3 - camera.rotation.x) * Math.min(1, s * 1.4);
    }
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();   // culling below needs this frame's view
    flora.update(u, time, env, camera, travel.atHome);
    travel.updateContent(u, time, env, camera, viewOf(camera));
    world.sky.position.copy(camera.position);
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
  window.game = { setYear: (y) => { uTarget = u = yearToU(y); }, setU: (v) => { uTarget = u = v; }, get year() { return uToYear(u); }, get quality() { return quality; }, travel, setZoom: (z) => { zoom = zoomTarget = z; }, get post() { return post; }, timings, player, renderer, city, sound, fauna, THREE };
}
boot().catch((err) => fatal('The game could not start.', err && err.stack ? err.stack : err));
