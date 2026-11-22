// Every sound is synthesised with Web Audio — there are no audio files.
// Continuous "beds" (wind, water, traffic, rain, drones …) and random one-shot
// "events" (birds, roars, bells, horns …) each have a loudness curve over the timeline.
import { yearToU, START } from './timeline.js';
import { smooth } from './util.js';
import { placeSounds } from './audio-places.js';

const Y = yearToU, FADE = 0.006;
/** [fromYear, toYear, level] spans → function of slider position returning 0..1 */
function curve(...spans) {
  const s = spans.map(([a, b, l = 1]) => [a <= START ? -1 : Y(a), b >= 7.59e9 ? 2 : Y(b), l]);
  return (u) => { let v = 0; for (const [a, b, l] of s) v = Math.max(v, l * smooth((u - a) / FADE) * smooth((b - u) / FADE)); return v; };
}
const rnd = (a, b) => a + Math.random() * (b - a);

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.beds = []; this.events = []; this.t = 0; this.place = 'home'; this.own = new Set(); this.tag = null; }
  /** Which place is on screen: one with a soundscape of its own replaces the timeline's general sounds. */
  setPlace(id) { this.place = id; }

  /** Must be called from a user gesture. */
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.analyser = ctx.createAnalyser(); this.master.connect(this.analyser);

    // noise sources
    const len = ctx.sampleRate * 3, white = ctx.createBuffer(1, len, ctx.sampleRate), brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = white.getChannelData(0), b = brown.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
    this.white = white; this.brown = brown;

    const noiseBed = (buf, type, freq, q, level, max, wobble) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = rnd(0.9, 1.1);
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      this.beds.push({ g, f, freq, level, max, wobble, place: this.tag });
      return g;
    };
    const toneBed = (freqs, type, lp, level, max) => {
      const g = ctx.createGain(); g.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.connect(g); g.connect(this.master);
      for (const hz of freqs) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz; o.detune.value = rnd(-8, 8);
        const og = ctx.createGain(); og.gain.value = 1 / freqs.length; o.connect(og); og.connect(f); o.start();
        const l = ctx.createOscillator(); l.frequency.value = rnd(0.05, 0.2); const lg = ctx.createGain(); lg.gain.value = 0.4 / freqs.length;
        l.connect(lg); lg.connect(og.gain); l.start();
      }
      this.beds.push({ g, level, max });
    };

    // ---- beds ----
    // open-country wind: everywhere there is no city, strongest on ice and bare rock
    noiseBed(white, 'bandpass', 420, 0.7, curve([-4.54e9, -236e6, 0.55], [-2.33e9, -2.16e9, 1], [-716e6, -636e6, 1], [-236e6, 1700, 0.35], [-2.2e6, -1.0e6, 0.5], [-420e3, -150e3, 1], [-90e3, -15e3, 0.8], [-27e3, -16.5e3, 1], [-16.5e3, -7000, 0.7], [1700, 1900, 0.15], [1900, 2160, 0.08], [2960, 120e6, 0.3], [120e6, 7.6e9, 0.8]), 0.22, 0.5);
    // the thin howl over the ice sheet
    noiseBed(white, 'bandpass', 900, 9, curve([-2.33e9, -2.16e9], [-716e6, -636e6], [-420e3, -150e3], [-27e3, -16.5e3], [-80e3, -27e3, 0.4]), 0.1, 0.35);
    // water: rivers, shore, later the canals
    noiseBed(brown, 'lowpass', 700, 0.5, curve([-4.27e9, -2.34e9, 0.6], [-2.15e9, -720e6, 0.6], [-632e6, -236e6, 0.7], [-236e6, -1.2e6, 0.6], [-131e3, -100e3, 0.6], [-7000, 1850, 0.7], [1850, 2160, 0.2], [2160, 2900, 0.7], [2960, 90e6, 0.6]), 0.22, 0.2);
    // insects in warm forests
    const bugs = noiseBed(white, 'bandpass', 5600, 14, curve([-335e6, -253e6, 0.8], [-236e6, -66.03e6, 1], [-64e6, -30e6, 0.9], [-30e6, -2.6e6, 0.4], [-7000, 1750, 0.3], [9000, 120e6, 0.35], [280e6, 520e6, 0.25]), 0.07, 0.03);
    const pulse = ctx.createGain(); pulse.gain.value = 0.6; bugs.disconnect(); bugs.connect(pulse); pulse.connect(this.master);
    const trem = ctx.createOscillator(); trem.frequency.value = 17; const tg = ctx.createGain(); tg.gain.value = 0.4; trem.connect(tg); tg.connect(pulse.gain); trem.start();
    // deep rumble: eruptions, the impact, machinery, megacity, the swelling Sun
    noiseBed(brown, 'lowpass', 110, 0.7, curve([-4.54e9, -4.42e9, 1], [-4.13e9, -3.86e9, 0.6], [-254e6, -251.3e6, 0.8], [-203e6, -192e6, 0.8], [-66.035e6, -65.97e6, 1], [1850, 1935, 0.25], [2180, 2900, 0.3], [4.6e9, 7.6e9, 1]), 0.75, 0.25);
    // fire roar
    noiseBed(white, 'bandpass', 900, 0.4, curve([-4.54e9, -4.43e9, 1], [-66.03e6, -65.985e6, 0.9], [6.2e9, 7.6e9, 1]), 0.22, 0.4);
    // traffic
    noiseBed(brown, 'bandpass', 190, 0.6, curve([1905, 1945, 0.5], [1945, 2050, 1], [2050, 2165, 0.4]), 0.42, 0.15);
    // crowd murmur
    noiseBed(brown, 'bandpass', 480, 1.6, curve([1660, 1800, 0.3], [1800, 1900, 0.7], [1900, 2160, 1], [2160, 2880, 0.5]), 0.1, 0.25);
    // rain that never stops
    noiseBed(white, 'highpass', 2400, 0.3, curve([-4.43e9, -4.26e9, 1], [2185, 2900, 1]), 0.11, 0.05);
    // the oceans boiling off
    noiseBed(white, 'bandpass', 3200, 0.8, curve([0.85e9, 2.2e9, 1], [-203e6, -196e6, 0.3]), 0.1, 0.3);
    // neon megacity drone, and the calm chord of the star age
    toneBed([55, 82.4, 110.6, 164.8], 'sawtooth', 520, curve([2185, 2900]), 0.13);
    toneBed([220, 277.2, 329.6, 440, 659.3], 'sine', 2000, curve([2965, 9400, 1], [9400, 20000, 0.25]), 0.07);

    // ---- one-shot events: [loudness curve, events per second at full level, play function] ----
    const E = (level, rate, play) => this.events.push({ level, rate, play, place: this.tag });
    const forest = [[-60e6, -1.2e6, 0.8], [-131e3, -100e3, 0.8], [-9500, 1700, 1], [1700, 1840, 0.6], [1840, 2165, 0.18], [2960, 120e6, 1], [280e6, 520e6, 0.2]];
    E(curve(...forest), 1.3, (v) => this.bird(v));
    E(curve([-210e6, -66.03e6]), 0.07, (v) => this.screech(v));
    E(curve([-236e6, -66.03e6]), 0.09, (v) => this.roar(v, rnd(45, 85), rnd(1.2, 2.4)));
    E(curve([-190e6, -66.03e6]), 0.3, (v) => this.thump(v * 0.5, 38, 0.5));                    // giants walking
    E(curve([-45e6, -1.2e6, 0.6], [-131e3, -100e3, 0.7], [-95e3, -27e3, 1], [-16.5e3, -9500, 1], [2e6, 140e6, 0.5]), 0.07, (v) => this.trumpet(v));
    E(curve([-2.33e9, -2.16e9], [-716e6, -636e6], [-420e3, -150e3], [-27e3, -16.5e3]), 0.06, (v) => this.crack(v));                 // the glacier groaning
    E(curve([-4.54e9, -4.43e9, 1], [-1e6, -14e3, 0.5], [-11.4e3, -9200, 0.7], [1500, 1640, 0.7], [-66.03e6, -65.985e6, 1], [-203e6, -196e6, 0.5], [6.5e9, 7.6e9, 1]), 16, (v) => this.crackle(v));
    E(curve([-300e3, -14e3, 0.5], [-4000, -2700, 0.3], [1500, 1640]), 0.45, (v) => { this.thump(v * 0.7, 95, 0.25); this.thump(v * 0.45, 95, 0.25, 0.28); });   // a drum by the fire
    E(curve([-40e3, -14e3, 0.4], [-11.4e3, -9200, 0.5], [-9600, 500, 0.5], [1500, 1640, 0.6]), 0.05, (v) => this.flute(v));
    E(curve([-150, 1500, 0.5], [1640, 1915]), 0.3, (v) => this.hooves(v));
    E(curve([1000, 1500, 0.9], [1640, 1900]), 0.035, (v) => this.bell(v));   // church bells: Chartres, then New York and Manchester
    E(curve([-2.6e6, -14e3, 0.35], [-9600, -2700, 0.5], [-2700, 1500, 0.8], [1626, 1900]), 0.18, (v) => this.clink(v));   // stone on stone, then chisels, then smiths
    E(curve([1609, 1770], [1840, 1900]), 0.12, (v) => this.gull(v));
    E(curve([1790, 1840, 0.9], [1845, 1930]), 1.6, (v) => this.thump(v * 0.35, 60, 0.12));                        // engines
    E(curve([1829, 1960]), 0.035, (v) => this.horn(v, [146.8, 185], 1.6, 'sawtooth', 500));    // steam whistle / ship horn
    E(curve([1905, 1945, 0.6], [1945, 2050, 1]), 0.16, (v) => this.horn(v * 0.5, [392, 494], rnd(0.15, 0.5), 'square', 1800));
    E(curve([1955, 2110]), 0.02, (v) => this.siren(v));
    E(curve([2035, 2170]), 0.25, (v) => this.whoosh(v * 0.35, 500, 900, 1.2));                 // electric pods
    E(curve([2150, 2850]), 0.5, (v) => this.whoosh(v, 250, 1500, rnd(1.2, 2.2)));              // flying traffic
    E(curve([2190, 2850]), 0.07, (v) => this.jingle(v));
    E(curve([2190, 2900]), 0.035, (v) => this.thunder(v));
    E(curve([2965, 9400, 1], [9400, 30000, 0.2]), 0.5, (v) => this.chime(v));
    E(curve([2960, 9200]), 0.12, (v) => this.whoosh(v * 0.4, 800, 2400, 2.5));
    E(curve([-4.54e9, -3.86e9, 0.8], [-254e6, -251.3e6, 0.8], [3e9, 7.6e9, 0.6], [-203e6, -196e6, 0.6], [-66.03e6, -65.99e6, 1]), 0.12, (v) => this.thunder(v));
    // --- before the dinosaurs ---
    E(curve([-4.54e9, -4.42e9]), 1.4, (v) => this.bubble(v));                                 // the magma ocean
    E(curve([-4.54e9, -4.45e9, 1], [-4.13e9, -3.86e9, 0.8], [-254e6, -251.3e6, 0.7], [-66.03e6, -65.995e6, 0.7]), 0.13, (v) => this.boom(v));   // impacts and eruptions
    E(curve([-4.27e9, -2.34e9, 0.7], [-2.15e9, -720e6, 0.7], [-632e6, -478e6, 1], [-470e6, -253e6, 0.35]), 0.16, (v) => this.surf(v));           // waves on a shore with nothing living on it
    E(curve([-375e6, -255e6]), 0.2, (v) => this.croak(v));                                    // the first voices: amphibians
    E(curve([-326e6, -294e6]), 0.22, (v) => this.buzz(v, rnd(55, 80), 1.6));                  // giant dragonflies
    E(curve([-300e6, -252.2e6]), 0.09, (v) => this.hiss(v));
    E(curve([-296e6, -252.2e6]), 0.045, (v) => this.roar(v * 0.55, rnd(75, 115), rnd(0.8, 1.4)));
    // --- things in the sky ---
    E(curve([1911, 1962]), 0.03, (v) => this.engine(v, rnd(85, 110), 7, 'sawtooth', 700));     // propeller aircraft
    E(curve([1924, 1937, 1], [1937, 2100, 0.3], [2180, 2850, 0.8]), 0.02, (v) => this.engine(v * 0.7, rnd(48, 60), 11, 'sawtooth', 320));   // airships
    E(curve([1958, 2110]), 0.035, (v) => this.jet(v));
    E(curve([1950, 2110]), 0.028, (v) => this.chopper(v));
    E(curve([2016, 2160]), 0.07, (v) => this.buzz(v * 0.5, rnd(190, 260), 2.6));              // delivery drones

    this.own = placeSounds(this, { bed: noiseBed, E, curve, rnd });
  }

  setMuted(m) { this.muted = m; this._level(); }
  /** 0 on the ground … 1 far out in space, where there is nothing to hear. */
  setDistance(k) { if (k !== this.far) { this.far = k; this._level(); } }
  _level() { if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9 * (1 - (this.far || 0)), this.ctx.currentTime, 0.08); }

  update(u, dt) {
    const ctx = this.ctx; if (!ctx || ctx.state !== 'running') return;
    this.t += dt; const now = ctx.currentTime;
    const own = this.own.has(this.place), gate = (x) => (x.place ? (x.place === this.place ? 1 : 0) : own ? 0 : 1);   // a place's own soundscape replaces the general one entirely
    for (const b of this.beds) {
      let v = b.level(u) * b.max * gate(b);
      if (b.wobble) { v *= 1 + b.wobble * Math.sin(this.t * 0.37 + b.max * 40) * Math.sin(this.t * 0.13 + 1); b.f.frequency.setTargetAtTime(b.freq * (1 + 0.35 * Math.sin(this.t * 0.21 + b.freq)), now, 0.3); }
      b.g.gain.setTargetAtTime(v, now, 0.18);
    }
    if (this.muted) return;
    for (const e of this.events) { const l = e.level(u) * (e.place ? (e.place === this.place ? 1 : 0) : own ? 0 : 1); if (l > 0.02 && Math.random() < e.rate * l * dt) e.play(l); }
  }

  // ---------- one-shot voices ----------
  out(pan = rnd(-0.8, 0.8)) {
    const g = this.ctx.createGain();
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.master); } else g.connect(this.master);
    return g;
  }
  env(g, t, peak, attack, decay) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); }
  osc(type, freq, t, dur, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.1); return o; }
  noise(buf, t, dur, dest, rate = 1) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.connect(dest); s.start(t, Math.random() * 2, dur + 0.1); return s; }
  filter(type, freq, q, dest) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(dest); return f; }

  bird(v) {
    const t0 = this.ctx.currentTime, g = this.out(), base = rnd(2200, 4800), n = 1 + Math.floor(Math.random() * 5), kind = Math.random();
    g.gain.value = v * rnd(0.02, 0.06);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * rnd(0.09, 0.16), eg = this.ctx.createGain(); eg.connect(g); this.env(eg, t, 1, 0.01, 0.08);
      const o = this.osc('sine', base, t, 0.1, eg);
      o.frequency.exponentialRampToValueAtTime(base * (kind < 0.5 ? rnd(1.2, 1.6) : rnd(0.6, 0.85)), t + 0.08);
    }
  }
  screech(v) {
    const t = this.ctx.currentTime, g = this.out(); this.env(g, t, v * 0.07, 0.05, 0.7);
    const f = this.filter('bandpass', 1500, 4, g), o = this.osc('sawtooth', rnd(900, 1300), t, 0.8, f);
    o.frequency.exponentialRampToValueAtTime(rnd(450, 650), t + 0.7);
  }
  roar(v, hz, dur) {
    const t = this.ctx.currentTime, g = this.out(); this.env(g, t, v * 0.3, dur * 0.25, dur);
    const f = this.filter('lowpass', 380, 3, g), o = this.osc('sawtooth', hz * 1.4, t, dur * 1.3, f);
    o.frequency.exponentialRampToValueAtTime(hz * 0.7, t + dur);
    const l = this.osc('sine', 23, t, dur * 1.3, this.ctx.createGain()); const lg = this.ctx.createGain(); lg.gain.value = hz * 0.25; l.disconnect(); l.connect(lg); lg.connect(o.frequency);
    const ng = this.ctx.createGain(); ng.gain.value = 0.5; ng.connect(f); this.noise(this.brown, t, dur * 1.2, ng);
  }
  trumpet(v) {
    const t = this.ctx.currentTime, g = this.out(); this.env(g, t, v * 0.09, 0.12, 1.1);
    const f = this.filter('bandpass', 700, 2.5, g), hz = rnd(260, 340), o = this.osc('sawtooth', hz, t, 1.3, f);
    o.frequency.linearRampToValueAtTime(hz * 1.5, t + 0.35); o.frequency.linearRampToValueAtTime(hz * 0.9, t + 1.1);
  }
  thump(v, hz, dur, delay = 0) {
    const t = this.ctx.currentTime + delay, g = this.out(rnd(-0.4, 0.4)); this.env(g, t, v * 0.5, 0.005, dur);
    const o = this.osc('sine', hz * 1.6, t, dur, g); o.frequency.exponentialRampToValueAtTime(hz * 0.6, t + dur);
  }
  crack(v) {
    const t = this.ctx.currentTime, g = this.out(); this.env(g, t, v * 0.35, 0.005, 1.6);
    this.noise(this.brown, t, 1.8, this.filter('lowpass', rnd(300, 900), 1, g), rnd(0.5, 1));
    const o = this.osc('sine', rnd(60, 110), t, 1.5, g); o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
  }
  crackle(v) {
    const t = this.ctx.currentTime + Math.random() * 0.06, g = this.out(rnd(-0.5, 0.5)); this.env(g, t, v * rnd(0.01, 0.07), 0.001, rnd(0.01, 0.05));
    this.noise(this.white, t, 0.06, this.filter('highpass', rnd(1500, 5000), 1, g));
  }
  flute(v) {
    const t0 = this.ctx.currentTime, g = this.out(), scale = [392, 440, 523.3, 587.3, 659.3, 784]; g.gain.value = v * 0.05;
    let t = t0; const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const d = rnd(0.35, 0.9), eg = this.ctx.createGain(); eg.connect(g); this.env(eg, t, 1, 0.08, d);
      const o = this.osc('sine', scale[Math.floor(Math.random() * scale.length)], t, d, eg);
      const vib = this.osc('sine', 5, t, d, this.ctx.createGain()), vg = this.ctx.createGain(); vg.gain.value = 5; vib.disconnect(); vib.connect(vg); vg.connect(o.frequency);
      const bg = this.ctx.createGain(); bg.gain.value = 0.15; bg.connect(eg); this.noise(this.white, t, d, this.filter('bandpass', 1800, 3, bg));
      t += d * 0.8;
    }
  }
  hooves(v) {
    const t0 = this.ctx.currentTime, pan = rnd(-0.8, 0.8), n = 6 + Math.floor(Math.random() * 8), step = rnd(0.24, 0.34);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * step + (i % 2) * step * 0.25, g = this.out(pan + (i / n - 0.5) * 0.5);
      this.env(g, t, v * 0.09 * Math.sin((Math.PI * (i + 0.5)) / n), 0.002, 0.05);
      this.noise(this.white, t, 0.06, this.filter('bandpass', i % 2 ? 1100 : 1500, 7, g));
    }
  }
  bell(v) {
    const t0 = this.ctx.currentTime, pan = rnd(-0.6, 0.6), hz = rnd(180, 260), n = 1 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) for (const [m, a, d] of [[0.5, 0.6, 5], [1, 1, 4], [1.19, 0.5, 3], [1.5, 0.35, 2.5], [2, 0.4, 2], [2.66, 0.2, 1.2], [4.1, 0.1, 0.6]]) {
      const t = t0 + k * 1.9, g = this.out(pan); this.env(g, t, v * 0.045 * a, 0.004, d); this.osc('sine', hz * m, t, d, g);
    }
  }
  clink(v) {
    const t0 = this.ctx.currentTime, pan = rnd(-0.8, 0.8), hz = rnd(1700, 2600), n = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) { const t = t0 + i * 0.42, g = this.out(pan); this.env(g, t, v * 0.03, 0.001, 0.25); this.osc('sine', hz, t, 0.3, g); this.osc('sine', hz * 1.52, t, 0.3, g); }
  }
  gull(v) {
    const t0 = this.ctx.currentTime, pan = rnd(-0.8, 0.8), n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.32, g = this.out(pan); this.env(g, t, v * 0.03, 0.04, 0.22);
      const o = this.osc('sawtooth', 1100, t, 0.3, this.filter('bandpass', 1900, 5, g));
      o.frequency.linearRampToValueAtTime(1500, t + 0.08); o.frequency.linearRampToValueAtTime(900, t + 0.26);
    }
  }
  horn(v, freqs, dur, type, lp) {
    const t = this.ctx.currentTime, g = this.out(), f = this.filter('lowpass', lp, 1, g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.07, t + 0.04); g.gain.setValueAtTime(v * 0.07, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.15);
    for (const hz of freqs) this.osc(type, hz, t, dur + 0.2, f);
  }
  siren(v) {
    const t = this.ctx.currentTime, dur = 7, g = this.out(rnd(-1, 1));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.035, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const o = this.osc('triangle', 650, t, dur, this.filter('lowpass', 1600, 1, g));
    for (let i = 0; i < dur; i++) { o.frequency.linearRampToValueAtTime(950, t + i + 0.5); o.frequency.linearRampToValueAtTime(650, t + i + 1); }
  }
  whoosh(v, lo, hi, dur) {
    const t = this.ctx.currentTime, g = this.ctx.createGain(), dir = Math.random() < 0.5 ? -1 : 1;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.setValueAtTime(-dir, t); p.pan.linearRampToValueAtTime(dir, t + dur); g.connect(p); p.connect(this.master); } else g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.1, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = this.filter('bandpass', lo, 2.5, g); f.frequency.exponentialRampToValueAtTime(hi, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(lo * 0.8, t + dur);
    this.noise(this.white, t, dur, f);
    const o = this.osc('sawtooth', lo * 0.5, t, dur, f); o.frequency.exponentialRampToValueAtTime(hi * 0.25, t + dur * 0.5); o.frequency.exponentialRampToValueAtTime(lo * 0.35, t + dur);
  }
  jingle(v) {
    const t0 = this.ctx.currentTime, pan = rnd(-0.8, 0.8), notes = [[659.3, 830.6, 987.8, 1318.5], [523.3, 659.3, 784, 659.3], [880, 740, 587.3, 880]][Math.floor(Math.random() * 3)];
    notes.forEach((hz, i) => { const t = t0 + i * 0.16, g = this.out(pan); this.env(g, t, v * 0.022, 0.005, 0.3); this.osc('square', hz, t, 0.3, this.filter('lowpass', 2600, 1, g)); });
  }
  thunder(v) {
    const t = this.ctx.currentTime, g = this.out(), dur = rnd(2, 4.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(v * 0.12, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.noise(this.brown, t, dur, this.filter('lowpass', rnd(140, 320), 0.7, g), rnd(0.6, 1));
  }
  bubble(v) {
    const t = this.ctx.currentTime + Math.random() * 0.3, g = this.out(), hz = rnd(55, 140);
    this.env(g, t, v * rnd(0.05, 0.16), 0.02, rnd(0.12, 0.35));
    const o = this.osc('sine', hz, t, 0.4, g); o.frequency.exponentialRampToValueAtTime(hz * rnd(1.8, 3), t + 0.18);
    const ng = this.ctx.createGain(); ng.gain.value = 0.35; ng.connect(g); this.noise(this.brown, t, 0.3, this.filter('lowpass', 500, 1, ng));
  }
  boom(v) {
    const t = this.ctx.currentTime, g = this.out(), dur = rnd(3, 6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.6, t + 0.05); g.gain.exponentialRampToValueAtTime(v * 0.15, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = this.osc('sine', rnd(46, 60), t, dur, g); o.frequency.exponentialRampToValueAtTime(24, t + dur * 0.8);
    this.noise(this.brown, t, dur, this.filter('lowpass', rnd(70, 130), 0.8, g), 0.6);
  }
  surf(v) {
    const t = this.ctx.currentTime, g = this.out(rnd(-0.6, 0.6)), dur = rnd(3.5, 6.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.11, t + dur * 0.3); g.gain.linearRampToValueAtTime(v * 0.05, t + dur * 0.55); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = this.filter('lowpass', 350, 0.7, g); f.frequency.exponentialRampToValueAtTime(rnd(1600, 2600), t + dur * 0.3); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    this.noise(this.white, t, dur, f);
  }
  croak(v) {
    const t0 = this.ctx.currentTime, pan = rnd(-0.8, 0.8), hz = rnd(85, 150), n = 2 + Math.floor(Math.random() * 5), gap = rnd(0.16, 0.3);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * gap, g = this.out(pan); this.env(g, t, v * 0.08, 0.02, gap * 0.6);
      const f = this.filter('bandpass', hz * 5, 3, g), o = this.osc('sawtooth', hz, t, gap, f); o.frequency.linearRampToValueAtTime(hz * 0.8, t + gap * 0.6);
      const am = this.osc('square', 34, t, gap, this.ctx.createGain()), ag = this.ctx.createGain(); ag.gain.value = hz * 0.3; am.disconnect(); am.connect(ag); ag.connect(o.frequency);   // the rattle in it
    }
  }
  hiss(v) {
    const t = this.ctx.currentTime, g = this.out(), dur = rnd(0.7, 1.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.06, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.noise(this.white, t, dur, this.filter('bandpass', rnd(2600, 4200), 1.2, g));
  }
  /** A fast wing-beat passing by: giant dragonflies at low pitch, small drones higher. */
  buzz(v, hz, dur) {
    const t = this.ctx.currentTime, g = this.ctx.createGain(), dir = Math.random() < 0.5 ? -1 : 1;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.setValueAtTime(-dir, t); p.pan.linearRampToValueAtTime(dir, t + dur); g.connect(p); p.connect(this.master); } else g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.07, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = this.filter('bandpass', hz * 7, 1.5, g);
    for (const k of [1, 1.035]) { const o = this.osc('sawtooth', hz * k * 1.06, t, dur, f); o.frequency.linearRampToValueAtTime(hz * k * 0.94, t + dur); }
  }
  /** A droning engine crossing the sky: propellers, or the slow motors of an airship. */
  engine(v, hz, dur, type, lp) {
    const t = this.ctx.currentTime, g = this.ctx.createGain(), dir = Math.random() < 0.5 ? -1 : 1;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.setValueAtTime(-dir * 0.9, t); p.pan.linearRampToValueAtTime(dir * 0.9, t + dur); g.connect(p); p.connect(this.master); } else g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.06, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = this.filter('lowpass', lp, 1, g);
    for (const k of [1, 1.012, 2.01]) { const o = this.osc(type, hz * k * 1.05, t, dur, f); o.frequency.linearRampToValueAtTime(hz * k * 0.93, t + dur); }   // slight Doppler fall
  }
  jet(v) {
    const t = this.ctx.currentTime, g = this.ctx.createGain(), dur = rnd(9, 14), dir = Math.random() < 0.5 ? -1 : 1;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.setValueAtTime(-dir * 0.8, t); p.pan.linearRampToValueAtTime(dir * 0.8, t + dur); g.connect(p); p.connect(this.master); } else g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.1, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = this.filter('bandpass', 900, 0.6, g); f.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.4); f.frequency.exponentialRampToValueAtTime(260, t + dur);
    this.noise(this.white, t, dur, f); this.noise(this.brown, t, dur, this.filter('lowpass', 160, 0.7, g));
  }
  chopper(v) {
    const t = this.ctx.currentTime, g = this.out(rnd(-0.7, 0.7)), dur = rnd(6, 10);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.16, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const chop = this.ctx.createGain(); chop.gain.value = 0.5; chop.connect(g);
    const lfo = this.osc('square', rnd(10, 13), t, dur, this.ctx.createGain()), lg = this.ctx.createGain(); lg.gain.value = 0.5; lfo.disconnect(); lfo.connect(lg); lg.connect(chop.gain);   // blade slap
    this.noise(this.brown, t, dur, this.filter('lowpass', 420, 1, chop)); this.osc('sawtooth', 62, t, dur, this.filter('lowpass', 300, 1, chop));
  }
  chime(v) {
    const t = this.ctx.currentTime, g = this.out(), scale = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5], hz = scale[Math.floor(Math.random() * scale.length)];
    this.env(g, t, v * 0.035, 0.01, rnd(1.5, 3.5)); this.osc('sine', hz, t, 3.6, g);
    const g2 = this.out(); this.env(g2, t, v * 0.012, 0.01, 1.2); this.osc('sine', hz * 2.76, t, 1.4, g2);
  }
}
