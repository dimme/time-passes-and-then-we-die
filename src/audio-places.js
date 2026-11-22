// Soundscapes of their own for the places the game travels to. While one of these places is on screen its own beds and events
// play, the timeline's general events fall silent and the general beds drop to a murmur (see Sound.update).
//
// placeSounds(S, { bed, E, curve, rnd }) is called once from Sound.start(): bed(...) and E(...) register a loop or a one-shot
// voice for the place named by S.tag.

/** Vowel formants [F1, F2] for the synthesised voices. */
const VOWEL = { a: [750, 1200], o: [500, 860], e: [450, 1900], i: [300, 2300], u: [330, 800] };

export function placeSounds(S, { bed, E, curve, rnd }) {
  const ctx = S.ctx;

  // ---------------------------------------------------------------- shared voices
  /** A sung or called syllable: a buzzing source shaped by two formants, with a pitch contour. */
  S.voice = (v, t, dur, f0s, vowels, pan, breathy = 0.15) => {
    const g = S.out(pan);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.08, dur * 0.25));
    g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    f0s.forEach((f, i) => o.frequency.linearRampToValueAtTime(f, t + (dur * i) / Math.max(1, f0s.length - 1)));
    o.frequency.setValueAtTime(f0s[0], t);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = rnd(4.5, 6); vg.gain.value = f0s[0] * 0.012; vib.connect(vg); vg.connect(o.frequency);
    const f1 = S.filter('bandpass', VOWEL[vowels[0]][0], 7, g), f2g = ctx.createGain(); f2g.gain.value = 0.45; f2g.connect(g);
    const f2 = S.filter('bandpass', VOWEL[vowels[0]][1], 9, f2g);
    vowels.forEach((w, i) => { const at = t + (dur * i) / vowels.length; f1.frequency.setTargetAtTime(VOWEL[w][0], at, 0.04); f2.frequency.setTargetAtTime(VOWEL[w][1], at, 0.04); });
    o.connect(f1); o.connect(f2); o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
    if (breathy) { const n = ctx.createGain(); n.gain.value = breathy; n.connect(f1); S.noise(S.white, t, dur, n); }
  };
  const knock = (v, t, hz, q, dur, pan) => { const g = S.out(pan); S.env(g, t, v, 0.001, dur); S.noise(S.white, t, dur, S.filter('bandpass', hz, q, g)); };
  const tone = (v, t, hz, dur, pan, type = 'sine', attack = 0.002) => { const g = S.out(pan); S.env(g, t, v, attack, dur); return S.osc(type, hz, t, dur, g); };

  // ================================================================ GIZA, 2700–1250 BCE
  S.tag = 'egypt';
  const Y = (...spans) => curve(...spans);
  const ALL = [-2700, -1250], BUILD = [[-2620, -2490, 1], [-2700, -2620, 0.35], [-2490, -2440, 0.3]], NEW = [[-1550, -1250, 1]];

  // beds: the desert wind and the sand it carries, the river, insects in the fields
  bed(S.brown, 'lowpass', 380, 0.6, Y(ALL), 0.32, 0.55);
  bed(S.white, 'bandpass', 5200, 0.7, Y(ALL), 0.018, 0.8);
  bed(S.brown, 'bandpass', 230, 0.8, Y(ALL), 0.12, 0.2);
  bed(S.white, 'bandpass', 4600, 14, Y(ALL), 0.012, 0.6);

  // copper chisels and wooden mallets on limestone: a whole quarry and the masons on the courses, then the tomb-builders
  E(Y(...BUILD, [-2440, -1250, 0.25]), 1.4, (v) => {
    const t0 = ctx.currentTime, pan = rnd(-0.9, 0.9), n = 4 + Math.floor(Math.random() * 9), step = rnd(0.48, 0.7), far = rnd(0.35, 1);
    for (let i = 0; i < n; i++) { const t = t0 + i * step + rnd(-0.02, 0.02); knock(v * 0.07 * far, t, 620, 2, 0.03, pan); tone(v * 0.05 * far, t, rnd(170, 200), 0.06, pan); knock(v * 0.05 * far, t + 0.004, rnd(2200, 2900), 3, 0.05, pan); }
  });
  // a work gang hauling a sledge: the overseer's call, the gang's answer, the heave on the rope
  E(Y(...BUILD), 0.07, (v) => {
    const t0 = ctx.currentTime + 0.1, pan = rnd(-0.6, 0.6), base = rnd(118, 135), rounds = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < rounds; k++) {
      const t = t0 + k * 3.2, lead = rnd(150, 175);
      S.voice(v * 0.05, t, 0.55, [lead, lead * 1.2, lead * 1.1], ['e', 'a'], pan);
      S.voice(v * 0.045, t + 0.6, 0.45, [lead * 1.1, lead * 0.92], ['i', 'o'], pan);
      for (let j = 0; j < 7; j++) { const f = base * rnd(0.94, 1.08); S.voice(v * 0.02, t + 1.35 + rnd(0, 0.05), 0.5, [f, f * 1.12], ['o', 'a'], pan + rnd(-0.25, 0.25), 0.25); S.voice(v * 0.02, t + 1.95 + rnd(0, 0.05), 0.6, [f * 1.05, f * 0.9], ['e', 'o'], pan + rnd(-0.25, 0.25), 0.25); }
      S.thump(v * 0.4, 55, 0.25, (t + 2.05) - ctx.currentTime);
    }
  });
  // water poured in front of the sledge, then the long scrape of stone over wet ground and the creak of the ropes
  E(Y(...BUILD), 0.05, (v) => {
    const t = ctx.currentTime, pan = rnd(-0.7, 0.7), g = S.out(pan), dur = rnd(4, 6.5);
    const sp = S.out(pan); S.env(sp, t, v * 0.06, 0.15, 0.9); S.noise(S.white, t, 1, S.filter('bandpass', 1500, 1.2, sp));
    g.gain.setValueAtTime(0.0001, t + 0.6); g.gain.linearRampToValueAtTime(v * 0.08, t + 1.6); g.gain.setValueAtTime(v * 0.08, t + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    S.noise(S.brown, t + 0.6, dur, S.filter('bandpass', 320, 1, g));
    for (let i = 0; i < 4; i++) { const c = S.out(pan); S.env(c, t + 1 + i * rnd(0.8, 1.3), v * 0.02, 0.05, 0.5); S.osc('sawtooth', rnd(70, 95), t + 1 + i * 1.1, 0.55, S.filter('bandpass', 420, 9, c)); }
  });
  // oxen in the fields and at the threshing floor
  E(Y(ALL), 0.05, (v) => { const t = ctx.currentTime, f = rnd(82, 98); S.voice(v * 0.06, t, rnd(1.3, 2), [f, f * 1.12, f * 0.95, f * 0.85], ['o', 'u', 'u'], rnd(-0.8, 0.8), 0.3); });
  // donkeys, the porters of Egypt
  E(Y(ALL), 0.035, (v) => {
    const t0 = ctx.currentTime, pan = rnd(-0.8, 0.8), n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const t = t0 + i * 0.85; S.voice(v * 0.05, t, 0.38, [430, 520, 470], ['i', 'e'], pan, 0.3); S.voice(v * 0.05, t + 0.42, 0.42, [210, 170], ['a', 'o'], pan, 0.4); }
  });
  // birds of the Nile valley: the hoopoe's "oop-oop-oop", a black kite's whistle, sparrows in the palms, an ibis
  E(Y(ALL), 0.12, (v) => { const t0 = ctx.currentTime, pan = rnd(-0.8, 0.8), groups = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < groups; k++) for (let i = 0; i < 3; i++) { const t = t0 + k * 1.1 + i * 0.19, o = tone(v * 0.04, t, 480, 0.13, pan, 'sine', 0.01); o.frequency.linearRampToValueAtTime(430, t + 0.12); } });
  E(Y(ALL), 0.06, (v) => { const t = ctx.currentTime, o = tone(v * 0.025, t, 2700, 0.9, rnd(-0.6, 0.6), 'sine', 0.05); o.frequency.exponentialRampToValueAtTime(1700, t + 0.8); });
  E(Y(ALL), 0.4, (v) => { const t0 = ctx.currentTime, pan = rnd(-0.9, 0.9), n = 3 + Math.floor(Math.random() * 8); for (let i = 0; i < n; i++) { const t = t0 + i * rnd(0.09, 0.22), o = tone(v * 0.018, t, rnd(3400, 4800), 0.05, pan); o.frequency.linearRampToValueAtTime(rnd(3000, 5200), t + 0.05); } });
  E(Y(ALL), 0.02, (v) => { const t = ctx.currentTime; for (let i = 0; i < 3; i++) S.voice(v * 0.03, t + i * 0.35, 0.28, [140, 110], ['a', 'o'], rnd(-0.7, 0.7), 0.6); });
  // palm fronds rattling in a gust
  E(Y(ALL), 0.15, (v) => { const t = ctx.currentTime, g = S.out(rnd(-0.9, 0.9)); S.env(g, t, v * 0.025, 0.5, 1.4); S.noise(S.white, t, 2, S.filter('bandpass', rnd(2400, 3600), 1.5, g)); });
  // village dogs
  E(Y(ALL), 0.015, (v) => { const t0 = ctx.currentTime, pan = rnd(-0.9, 0.9), n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) S.voice(v * 0.04, t0 + i * 0.3, 0.13, [330, 260], ['a', 'o'], pan, 0.5); });
  // people talking in the workers' town and the village: a murmur of short syllables
  E(Y(ALL), 0.3, (v) => {
    const t0 = ctx.currentTime, pan = rnd(-0.8, 0.8), f = Math.random() < 0.5 ? rnd(105, 135) : rnd(190, 240), n = 3 + Math.floor(Math.random() * 6), vs = 'aeiou';
    for (let i = 0; i < n; i++) S.voice(v * 0.012, t0 + i * rnd(0.16, 0.28), rnd(0.12, 0.22), [f * rnd(0.9, 1.15), f * rnd(0.85, 1.1)], [vs[(Math.random() * 5) | 0], vs[(Math.random() * 5) | 0]], pan, 0.3);
  });
  // oars and paddles on the river
  E(Y(ALL), 0.06, (v) => { const t0 = ctx.currentTime, pan = rnd(-0.8, 0.8), n = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) { const g = S.out(pan); S.env(g, t0 + i * 1.7, v * 0.035, 0.03, 0.35); S.noise(S.white, t0 + i * 1.7, 0.4, S.filter('bandpass', 900, 1.3, g)); } });
  // temple music: the sistrum shaken for Hathor, an arched harp
  E(Y(ALL), 0.012, (v) => {
    const t0 = ctx.currentTime, pan = rnd(-0.5, 0.5), shakes = 3 + Math.floor(Math.random() * 4);
    for (let k = 0; k < shakes; k++) { const t = t0 + k * 0.55; for (const hz of [2350, 3130, 4420, 5900]) { const g = S.out(pan); S.env(g, t, v * 0.008, 0.005, 0.45); const o = S.osc('sine', hz * rnd(0.99, 1.01), t, 0.45, g); const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = 16; tg.gain.value = v * 0.006; tr.connect(tg); tg.connect(g.gain); tr.start(t); tr.stop(t + 0.5); void o; } }
  });
  E(Y(ALL), 0.01, (v) => {
    const t0 = ctx.currentTime + 0.05, pan = rnd(-0.5, 0.5), notes = [196, 220, 261.6, 293.7, 329.6, 392, 440], n = 5 + Math.floor(Math.random() * 6);
    let k = (Math.random() * notes.length) | 0;
    for (let i = 0; i < n; i++) { k = Math.max(0, Math.min(notes.length - 1, k + ((Math.random() * 5) | 0) - 2)); const t = t0 + i * rnd(0.38, 0.6); tone(v * 0.03, t, notes[k], 1.6, pan, 'triangle'); tone(v * 0.012, t, notes[k] * 2, 0.8, pan); }
  });
  // New Kingdom: shadufs creaking as they lift water, and chariots on the causeway
  E(Y(...NEW), 0.05, (v) => { const t = ctx.currentTime, pan = rnd(-0.8, 0.8), c = S.out(pan); S.env(c, t, v * 0.025, 0.2, 1.1); const o = S.osc('sawtooth', 75, t, 1.2, S.filter('bandpass', 380, 11, c)); o.frequency.linearRampToValueAtTime(58, t + 1.1); const s = S.out(pan); S.env(s, t + 1.4, v * 0.04, 0.05, 0.6); S.noise(S.white, t + 1.4, 0.7, S.filter('bandpass', 1200, 1, s)); });
  E(Y(...NEW), 0.015, (v) => { const t = ctx.currentTime, g = S.out(rnd(-0.8, 0.8)); S.env(g, t, v * 0.05, 0.6, 3); S.noise(S.brown, t, 3.6, S.filter('bandpass', 130, 1.2, g)); S.hooves(v * 0.8); });
  // flies, always
  E(Y(ALL), 0.08, (v) => S.buzz(v * 0.35, rnd(180, 240), 1.6));

  S.tag = null;
  return new Set(['egypt']);
}
