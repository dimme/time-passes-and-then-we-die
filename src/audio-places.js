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
  bed(S.white, 'bandpass', 900, 0.6, Y(ALL), 0.06, 0.5);   // desert wind in gusts
  bed(S.white, 'bandpass', 5200, 0.7, Y(ALL), 0.018, 0.8);
  bed(S.white, 'bandpass', 1150, 1.4, Y(ALL), 0.012, 0.3);   // the river along its bank
  bed(S.white, 'bandpass', 4600, 14, Y(ALL), 0.012, 0.6);

  // copper chisels and wooden mallets on limestone: a whole quarry and the masons on the courses, then the tomb-builders
  E(Y(...BUILD, [-2440, -1250, 0.45]), 2.2, (v) => {
    const t0 = ctx.currentTime, pan = rnd(-0.9, 0.9), n = 4 + Math.floor(Math.random() * 9), step = rnd(0.48, 0.7), far = rnd(0.35, 1);
    for (let i = 0; i < n; i++) { const t = t0 + i * step + rnd(-0.02, 0.02); knock(v * 0.07 * far, t, 620, 2, 0.03, pan); tone(v * 0.05 * far, t, rnd(170, 200), 0.06, pan); knock(v * 0.05 * far, t + 0.004, rnd(2200, 2900), 3, 0.05, pan); }
  });
  // a work gang hauling a sledge: the overseer's call, the gang's answer, the heave on the rope
  E(Y(...BUILD, [-2440, -1250, 0.35]), 0.14, (v) => {
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
  E(Y(ALL), 0.25, (v) => { const t0 = ctx.currentTime, pan = rnd(-0.8, 0.8), groups = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < groups; k++) for (let i = 0; i < 3; i++) { const t = t0 + k * 1.1 + i * 0.19, o = tone(v * 0.04, t, 480, 0.13, pan, 'sine', 0.01); o.frequency.linearRampToValueAtTime(430, t + 0.12); } });
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
  E(Y(ALL), 0.05, (v) => {
    const t0 = ctx.currentTime, pan = rnd(-0.5, 0.5), shakes = 3 + Math.floor(Math.random() * 4);
    for (let k = 0; k < shakes; k++) { const t = t0 + k * 0.55; for (const hz of [2350, 3130, 4420, 5900]) { const g = S.out(pan); S.env(g, t, v * 0.008, 0.005, 0.45); const o = S.osc('sine', hz * rnd(0.99, 1.01), t, 0.45, g); const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = 16; tg.gain.value = v * 0.006; tr.connect(tg); tg.connect(g.gain); tr.start(t); tr.stop(t + 0.5); void o; } }
  });
  E(Y(ALL), 0.05, (v) => {
    const t0 = ctx.currentTime + 0.05, pan = rnd(-0.5, 0.5), notes = [196, 220, 261.6, 293.7, 329.6, 392, 440], n = 5 + Math.floor(Math.random() * 6);
    let k = (Math.random() * notes.length) | 0;
    for (let i = 0; i < n; i++) { k = Math.max(0, Math.min(notes.length - 1, k + ((Math.random() * 5) | 0) - 2)); const t = t0 + i * rnd(0.38, 0.6); tone(v * 0.03, t, notes[k], 1.6, pan, 'triangle'); tone(v * 0.012, t, notes[k] * 2, 0.8, pan); }
  });
  // New Kingdom: shadufs creaking as they lift water, and chariots on the causeway
  E(Y(...NEW), 0.05, (v) => { const t = ctx.currentTime, pan = rnd(-0.8, 0.8), c = S.out(pan); S.env(c, t, v * 0.025, 0.2, 1.1); const o = S.osc('sawtooth', 75, t, 1.2, S.filter('bandpass', 380, 11, c)); o.frequency.linearRampToValueAtTime(58, t + 1.1); const s = S.out(pan); S.env(s, t + 1.4, v * 0.04, 0.05, 0.6); S.noise(S.white, t + 1.4, 0.7, S.filter('bandpass', 1200, 1, s)); });
  E(Y(...NEW), 0.015, (v) => { const t = ctx.currentTime, g = S.out(rnd(-0.8, 0.8)); S.env(g, t, v * 0.05, 0.6, 3); S.noise(S.brown, t, 3.6, S.filter('bandpass', 130, 1.2, g)); S.hooves(v * 0.8); });
  // flies, always
  E(Y(ALL), 0.08, (v) => S.buzz(v * 0.35, rnd(180, 240), 1.6));
  // a reed flute (the end-blown ney of the tomb paintings) and wooden clappers keeping time for a song in the fields
  E(Y(ALL), 0.04, (v) => {
    const t0 = ctx.currentTime + 0.05, pan = rnd(-0.7, 0.7), scale = [293.7, 311.1, 370, 392, 440, 466.2, 554.4, 587.3], n = 8 + Math.floor(Math.random() * 10); let k = 3;
    for (let i = 0; i < n; i++) {
      k = Math.max(0, Math.min(scale.length - 1, k + Math.floor(Math.random() * 3) - 1)); const t = t0 + i * 0.42, g = S.out(pan);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.03, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      S.osc('sine', scale[k], t, 0.5, g); const breath = ctx.createGain(); breath.gain.value = 0.25; breath.connect(g); S.noise(S.white, t, 0.45, S.filter('bandpass', scale[k] * 2, 6, breath));
      if (i % 2 === 0) knock(v * 0.05, t, 1300, 3, 0.04, pan + 0.2);
    }
  });
  E(Y(ALL), 0.025, (v) => { const base = rnd(190, 230), t0 = ctx.currentTime + 0.1, pan = rnd(-0.7, 0.7), steps = [1, 1.12, 1.25, 1.12, 1, 0.89], vw = 'aeoaia'; for (let i = 0; i < 6; i++) S.voice(v * 0.03, t0 + i * 0.6, 0.62, [base * steps[i]], [vw[i]], pan, 0.1); });   // a woman singing at the quern
  E(Y(ALL), 0.3, (v) => { const g = S.out(rnd(-0.9, 0.9)), t = ctx.currentTime; S.env(g, t, v * 0.025, 0.08, 0.35); S.noise(S.white, t, 0.45, S.filter('bandpass', rnd(500, 900), 1.5, g)); });   // the river lapping at the bank

  // ---------------------------------------------------------------- more shared voices for the other places
  const p0 = () => rnd(-0.85, 0.85), N = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1)), now = () => ctx.currentTime;
  /** Stone on stone: a sharp tick with a ring, in a run of strokes (knapping flint, or a mason's point on marble). */
  const knap = (v, hz = 3200, ring = 0.04) => { const t0 = now(), pan = p0(), n = N(3, 9); for (let i = 0; i < n; i++) { const t = t0 + i * rnd(0.35, 0.9); knock(v * 0.06, t, hz, 4, 0.025, pan); tone(v * 0.02, t, hz * 1.4, ring, pan); } };
  /** A plucked string: lyre, harp. */
  const pluck = (v, notes, n, gap, pan = p0()) => { const t0 = now() + 0.05; let k = (Math.random() * notes.length) | 0; for (let i = 0; i < n; i++) { k = Math.max(0, Math.min(notes.length - 1, k + N(-2, 2))); const t = t0 + i * rnd(gap * 0.7, gap * 1.3); tone(v * 0.03, t, notes[k], 1.4, pan, 'triangle'); tone(v * 0.01, t, notes[k] * 2, 0.6, pan); } };
  /** A reed pipe (the Greek aulos, a shepherd's pipe): a buzzing tone through a nasal formant. */
  const reed = (v, notes, n, gap, pan = p0()) => { const t0 = now() + 0.05; let k = (Math.random() * notes.length) | 0; for (let i = 0; i < n; i++) { k = Math.max(0, Math.min(notes.length - 1, k + N(-1, 1))); S.voice(v * 0.025, t0 + i * gap, gap * 1.05, [notes[k], notes[k] * 1.01], ['e'], pan, 0.05); } };
  /** A frame drum or a drum of hide: a few beats, sometimes with hand claps. */
  const drum = (v, hz, beats, gap, claps = false) => { const t0 = now(), pan = p0(); for (let i = 0; i < beats; i++) { S.thump(v * (i % 4 ? 0.35 : 0.6), hz, 0.2, i * gap); if (claps && i % 2) knock(v * 0.05, t0 + i * gap + gap / 2, 1800, 1.2, 0.03, pan); } };
  /** A crowd or a gathering: many short syllables at once. */
  const murmur = (v, n, lo, hi, pan = p0()) => { const t0 = now(), vs = 'aeiou'; for (let i = 0; i < n; i++) { const f = Math.random() < 0.5 ? rnd(lo, lo * 1.3) : rnd(hi * 0.8, hi); S.voice(v * 0.011, t0 + i * rnd(0.08, 0.2), rnd(0.12, 0.25), [f * rnd(0.9, 1.15), f * rnd(0.85, 1.1)], [vs[N(0, 4)], vs[N(0, 4)]], pan + rnd(-0.2, 0.2), 0.3); } };
  /** Animal voices built from the singing voice: bleats, lows, barks, howls, crows, coos. */
  const bleat = (v, f = rnd(300, 420)) => { const t = now(), pan = p0(); for (let i = 0; i < N(1, 3); i++) S.voice(v * 0.04, t + i * 0.6, 0.45, [f, f * 1.05, f * 0.9], ['e', 'a'], pan, 0.4); };
  const low = (v) => { const f = rnd(80, 100); S.voice(v * 0.06, now(), rnd(1.2, 2), [f, f * 1.1, f * 0.9, f * 0.82], ['o', 'u', 'u'], p0(), 0.3); };
  const bark = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(1, 4); i++) S.voice(v * 0.04, t0 + i * 0.3, 0.13, [330, 260], ['a', 'o'], pan, 0.5); };
  const howl = (v) => { const t0 = now(), pan = p0(), n = N(1, 3); for (let i = 0; i < n; i++) { const f = rnd(380, 520); S.voice(v * 0.04, t0 + i * rnd(1.5, 3), rnd(2.5, 4), [f * 0.8, f, f * 1.02, f * 0.7], ['u', 'o', 'u'], pan + rnd(-0.3, 0.3), 0.05); } };
  const croakBird = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(1, 4); i++) S.voice(v * 0.035, t0 + i * 0.5, 0.22, [190, 150], ['a', 'o'], pan, 0.7); };
  const coo = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(2, 4); i++) { const t = t0 + i * 0.9; S.voice(v * 0.03, t, 0.3, [390, 420], ['u'], pan, 0.05); S.voice(v * 0.03, t + 0.35, 0.45, [420, 360], ['u'], pan, 0.05); } };
  const rooster = (v) => { const t = now(); S.voice(v * 0.045, t, 1.4, [520, 760, 780, 700, 520], ['a', 'e', 'o', 'o'], p0(), 0.4); };
  const goose = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(2, 6); i++) S.voice(v * 0.03, t0 + i * 0.25, 0.18, [380, 330], ['a'], pan, 0.5); };
  const chirps = (v, lo = 3200, hi = 5200) => { const t0 = now(), pan = p0(), n = N(3, 10); for (let i = 0; i < n; i++) { const t = t0 + i * rnd(0.08, 0.2), o = tone(v * 0.016, t, rnd(lo, hi), 0.05, pan); o.frequency.linearRampToValueAtTime(rnd(lo, hi), t + 0.05); } };
  const lark = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < 40; i++) { const t = t0 + i * 0.07, o = tone(v * 0.012, t, rnd(2600, 4800), 0.06, pan); o.frequency.linearRampToValueAtTime(rnd(2600, 4800), t + 0.06); } };
  const bellTinkle = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(3, 9); i++) { const t = t0 + i * rnd(0.2, 0.5); for (const m of [1, 2.7, 5.1]) tone(v * 0.012 / m, t, 1450 * m * rnd(0.98, 1.02), 0.5 / m, pan); } };
  const water = (v) => { const g = S.out(p0()), t = now(); S.env(g, t, v * 0.03, 0.05, 0.25); S.noise(S.white, t, 0.3, S.filter('bandpass', rnd(600, 1500), 2, g)); };
  const march = (v, n = 16, gap = 0.55) => { const t0 = now(), pan = p0(); for (let i = 0; i < n; i++) { S.thump(v * 0.35, 60, 0.15, i * gap); knock(v * 0.03, t0 + i * gap, 2600, 6, 0.08, pan); } };
  const wheels = (v, dur = 4, hz = 140, iron = false) => { const t = now(), g = S.out(p0()); S.env(g, t, v * 0.05, 0.8, dur); S.noise(S.brown, t, dur + 1, S.filter('bandpass', hz, 1.2, g)); if (iron) { const g2 = S.out(); S.env(g2, t, v * 0.015, 0.8, dur); S.noise(S.white, t, dur + 1, S.filter('bandpass', 2400, 3, g2)); } S.hooves(v * 0.7); };
  const saw = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(4, 10); i++) { const g = S.out(pan), t = t0 + i * 0.55; S.env(g, t, v * 0.03, 0.15, 0.3); S.noise(S.white, t, 0.45, S.filter('bandpass', i % 2 ? 2100 : 1700, 2, g)); } };
  const hammer = (v, hz = rnd(1500, 2400)) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(3, 9); i++) { const t = t0 + i * rnd(0.4, 0.65); for (const m of [1, 2.76, 5.4]) tone(v * 0.03 / m, t, hz * m, 0.7 / m, pan); knock(v * 0.03, t, 900, 2, 0.02, pan); } };
  const grind = (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(4, 8); i++) { const g = S.out(pan), t = t0 + i * 0.9; S.env(g, t, v * 0.035, 0.3, 0.5); S.noise(S.brown, t, 0.8, S.filter('bandpass', 420, 1.5, g)); } };
  const thud = (v, n = N(4, 9), gap = rnd(0.8, 1.3)) => { for (let i = 0; i < n; i++) S.thump(v * 0.35, rnd(70, 100), 0.12, i * gap); };   // hoes, flails, pounding
  const chant = (v, base, notes = [1, 1.12, 1.25, 1.12, 1, 0.89], voices = 6, syll = 0.7) => { const t0 = now() + 0.05, pan = p0(), vs = 'aeiou'; for (let i = 0; i < notes.length; i++) { const w = vs[N(0, 4)]; for (let j = 0; j < voices; j++) S.voice(v * 0.012, t0 + i * syll + rnd(0, 0.03), syll * 1.05, [base * notes[i] * rnd(0.99, 1.01)], [w], pan + rnd(-0.2, 0.2), 0.12); } };

  // ================================================================ EAST AFRICAN RIFT, 7 million – 70,000 years ago
  S.tag = 'africa';
  const AF = [-7e6, -70e3], STONE = [[-2.6e6, -70e3]], FIRE = [[-1e6, -70e3]], US = [[-300e3, -70e3]];
  bed(S.white, 'bandpass', 900, 0.6, Y(AF), 0.033, 0.5);                 // wind over the grass
  bed(S.white, 'bandpass', 3900, 9, Y(AF), 0.02, 0.5);                 // cicadas and grasshoppers in the heat
  bed(S.white, 'bandpass', 1150, 1.4, Y(AF), 0.012, 0.3);               // the lake on its shore
  E(Y(AF), 0.02, (v) => { const f = rnd(95, 120); S.voice(v * 0.07, now(), 2.2, [f, f * 1.4, f * 1.1, f * 0.8], ['a', 'o', 'u'], p0(), 0.5); for (let i = 0; i < N(3, 7); i++) S.voice(v * 0.04, now() + 2.3 + i * 0.7, 0.4, [f * 0.9, f * 0.7], ['o', 'u'], p0(), 0.5); });   // a lion, far off
  E(Y(AF), 0.02, (v) => { const t = now(); for (let i = 0; i < N(2, 4); i++) S.voice(v * 0.04, t + i * 1.4, 1.1, [220, 520], ['u', 'o'], p0(), 0.2); });   // hyenas' rising whoops
  E(Y(AF), 0.025, (v) => S.trumpet(v));                                // elephants
  E(Y(AF), 0.05, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(3, 6); i++) S.voice(v * 0.04, t0 + i * 0.28, 0.2, [1100, 900], ['e', 'a'], pan, 0.2); });   // a fish eagle's yelping cry
  E(Y(AF), 0.12, (v) => coo(v));                                       // doves
  E(Y(AF), 0.35, (v) => chirps(v, 2800, 4600));                        // weavers at their nests
  E(Y(AF), 0.04, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(4, 8); i++) S.voice(v * 0.03, t0 + i * 0.32, 0.22, [600, 480], ['a'], pan, 0.4); });   // hornbills
  E(Y(AF), 0.06, (v) => S.thunder(v * 0.6));                           // a storm over the escarpment
  E(Y(...STONE), 0.5, (v) => knap(v, 3000, 0.03));                     // stone tools being made
  E(Y(...FIRE), 0.4, (v) => S.crackle(v));                             // the hearths
  E(Y(...US), 0.35, (v) => murmur(v, N(3, 8), 110, 260));              // people talking at the camp, children
  E(Y([-150e3, -70e3]), 0.03, (v) => drum(v, 85, 16, 0.4, true));      // clapping and drumming at a dance
  E(Y(AF), 0.06, (v) => S.buzz(v * 0.3, rnd(180, 240), 1.4));

  // ================================================================ ICE-AGE DORDOGNE, 70,000 – 14,000 years ago
  S.tag = 'cave';
  const IC = [-70e3, -14e3];
  bed(S.white, 'bandpass', 900, 0.6, Y(IC), 0.045, 0.5);                 // cold wind down the valley
  bed(S.white, 'bandpass', 2600, 0.8, Y(IC), 0.03, 0.9);               // snow hissing over the steppe
  bed(S.white, 'bandpass', 1150, 1.4, Y(IC), 0.012, 0.3);                 // the Vézère
  E(Y(IC), 0.05, (v) => howl(v));                                      // wolves
  E(Y(IC), 0.08, (v) => croakBird(v));                                 // ravens
  E(Y(IC), 0.03, (v) => S.trumpet(v * 0.8));                           // mammoths
  E(Y(IC), 0.06, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(3, 8); i++) S.voice(v * 0.03, t0 + i * 0.5, 0.3, [130, 110], ['o', 'u'], pan + rnd(-0.2, 0.2), 0.6); for (let i = 0; i < 12; i++) knock(v * 0.02, t0 + i * 0.18, 1600, 4, 0.03, pan); });   // reindeer grunting, their ankles clicking
  E(Y(IC), 0.6, (v) => knap(v, 3400, 0.03));                           // flint knapping in the shelters
  E(Y(IC), 0.45, (v) => S.crackle(v));                                 // hearths
  E(Y(IC), 0.3, (v) => murmur(v, N(3, 7), 105, 240));                  // voices under the overhang
  E(Y([-42e3, -14e3]), 0.025, (v) => S.flute(v));                      // a bone flute
  E(Y([-42e3, -14e3]), 0.02, (v) => drum(v, 75, 12, 0.5));             // a drum of hide
  E(Y(IC), 0.15, (v) => water(v * 0.6));                               // water dripping in the cave

  // ================================================================ JERICHO, 9600 – 4000 BCE
  S.tag = 'crescent';
  const JE = [-9600, -4000], HERDS = [[-8500, -4000]];
  bed(S.white, 'bandpass', 900, 0.6, Y(JE), 0.030, 0.5);                  // wind off the hills
  bed(S.white, 'bandpass', 1150, 1.4, Y(JE), 0.012, 0.3);                // the spring running out into its channels
  bed(S.white, 'bandpass', 4300, 12, Y(JE), 0.012, 0.6);               // crickets
  E(Y(JE), 0.4, (v) => grind(v));                                      // grain on the querns
  E(Y(JE), 0.3, (v) => thud(v));                                       // hoes and digging sticks, flails on the threshing floor
  E(Y(JE), 0.3, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(4, 9); i++) { const g = S.out(pan), t = t0 + i * 0.7; S.env(g, t, v * 0.025, 0.08, 0.25); S.noise(S.white, t, 0.3, S.filter('bandpass', 3000, 2, g)); } });   // sickles through the stalks
  E(Y(...HERDS), 0.12, (v) => bleat(v));                               // goats and sheep
  E(Y([-6500, -4000]), 0.03, (v) => low(v));                           // cattle
  E(Y(JE), 0.3, (v) => murmur(v, N(3, 8), 110, 240));
  E(Y(JE), 0.02, (v) => bark(v));
  E(Y(JE), 0.12, (v) => coo(v));                                       // turtle doves
  E(Y(JE), 0.3, (v) => chirps(v, 3000, 5000));                         // sparrows and bee-eaters
  E(Y(JE), 0.3, (v) => S.crackle(v * 0.7));                            // cooking fires
  E(Y(JE), 0.05, (v) => S.buzz(v * 0.3, rnd(180, 240), 1.4));

  // ================================================================ URUK, 4000 – 2700 BCE
  S.tag = 'sumer';
  const UR = [-4000, -2700];
  bed(S.white, 'bandpass', 1150, 1.4, Y(UR), 0.012, 0.3);                // the Euphrates and the canals
  bed(S.white, 'bandpass', 2600, 0.9, Y(UR), 0.03, 0.8);               // wind in the reed beds
  E(Y(UR), 0.5, (v) => murmur(v, N(4, 10), 105, 250));                 // streets and the market
  E(Y(UR), 0.06, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(4, 8); i++) S.voice(v * 0.035, t0 + i * 0.85, 0.42, [210, 170], ['a', 'o'], pan, 0.4); });   // donkeys
  E(Y(UR), 0.04, (v) => low(v));                                       // oxen at the ploughs
  E(Y(UR), 0.1, (v) => bleat(v));                                      // sheep
  E(Y(UR), 0.15, (v) => S.croak(v));                                   // frogs in the canals
  E(Y(UR), 0.06, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(3, 6); i++) { const g = S.out(pan); S.env(g, t0 + i * 1.6, v * 0.035, 0.03, 0.35); S.noise(S.white, t0 + i * 1.6, 0.4, S.filter('bandpass', 900, 1.3, g)); } });   // paddles on the canal
  E(Y(UR), 0.25, (v) => { const t0 = now(), pan = p0(), g = S.out(pan); S.env(g, t0, v * 0.025, 1, 2.5); const o = S.osc('sine', 95, t0, 3.4, S.filter('lowpass', 300, 1, g)); o.frequency.linearRampToValueAtTime(110, t0 + 3); });   // the potter's wheel spinning
  E(Y([-3300, -2700]), 0.2, (v) => hammer(v, rnd(2000, 2800)));        // copper and bronze smiths
  E(Y([-3200, -2700]), 0.04, (v) => wheels(v, 4, 120));                // solid-wheeled carts
  E(Y(UR), 0.015, (v) => pluck(v, [196, 220, 247, 294, 330], N(6, 10), 0.5));   // a lyre in the temple
  E(Y(UR), 0.012, (v) => chant(v, rnd(130, 150)));                     // priests chanting on the terrace
  E(Y(UR), 0.25, (v) => chirps(v, 3000, 5000));
  E(Y(UR), 0.06, (v) => S.buzz(v * 0.3, rnd(180, 240), 1.4));

  // ================================================================ ATHENS, 1250 – 150 BCE
  S.tag = 'greece';
  const AT = [-1250, -150], CLASSICAL = [[-600, -150]];
  bed(S.white, 'bandpass', 4800, 10, Y(AT), 0.03, 0.9);                // cicadas, the sound of a Greek summer
  bed(S.white, 'bandpass', 900, 0.6, Y(AT), 0.021, 0.5);                 // wind from the sea
  E(Y(AT), 0.06, (v) => S.surf(v * 0.5));                              // the sea at Phaleron
  E(Y(AT), 0.12, (v) => bellTinkle(v));                                // goat bells on Hymettos
  E(Y(AT), 0.03, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(4, 7); i++) S.voice(v * 0.035, t0 + i * 0.85, 0.42, [210, 170], ['a', 'o'], pan, 0.4); });   // donkeys
  E(Y(AT), 0.03, (v) => rooster(v));
  E(Y(AT), 0.3, (v) => chirps(v, 3500, 5500));                         // swallows over the agora
  E(Y(AT), 0.4, (v) => murmur(v, N(4, 10), 105, 240));                 // the agora
  E(Y([-447, -405], [-600, -447, 0.4], [-405, -150, 0.3]), 0.8, (v) => knap(v, 4200, 0.12));   // masons' points ringing on marble (the Parthenon years loudest)
  E(Y(AT), 0.03, (v) => reed(v, [293.7, 330, 349.2, 392, 440, 466.2], N(6, 12), 0.35));   // an aulos
  E(Y(AT), 0.02, (v) => pluck(v, [220, 247, 293.7, 330, 392], N(5, 9), 0.6));            // a lyre
  E(Y(...CLASSICAL), 0.02, (v) => { march(v, 16, 0.6); for (let i = 0; i < 16; i++) knock(v * 0.02, now() + i * 0.6 + 0.1, 3200, 8, 0.15, 0); });   // a phalanx drilling: feet and bronze
  E(Y(...CLASSICAL), 0.015, (v) => { const t0 = now(); for (let i = 0; i < 12; i++) { knock(v * 0.05, t0 + i * 1.1, 900, 1.3, 0.3, -0.6); } reed(v * 0.7, [440, 392], 12, 1.1, -0.6); });   // a trireme at sea: oars to the piper's beat
  E(Y(AT), 0.08, (v) => S.gull(v * 0.6));

  // ================================================================ ROME, 150 BCE – 500 CE
  S.tag = 'rome';
  const RO = [-150, 500], PEAK = [[-150, 380, 1], [380, 500, 0.45]];
  bed(S.white, 'bandpass', 1900, 0.8, Y(RO), 0.03, 0.3);               // fountains, a thousand of them
  bed(S.white, 'bandpass', 1150, 1.4, Y(RO), 0.012, 0.3);                // the Tiber
  E(Y(...PEAK), 0.7, (v) => murmur(v, N(5, 12), 105, 250));            // the Forum, the shops
  E(Y(...PEAK), 0.06, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(1, 3); i++) S.voice(v * 0.045, t0 + i * 0.9, 0.7, [200, 230, 190], ['a', 'e', 'o'], pan, 0.3); });   // a hawker crying his wares
  E(Y(...PEAK), 0.1, (v) => wheels(v, 4, 160, true));                  // iron-tyred carts on the paving
  E(Y(RO), 0.03, (v) => { march(v, 20, 0.5); if (Math.random() < 0.5) S.horn(v * 0.5, [146.8, 220], 1.4, 'sawtooth', 900); });   // a legion on the road, a cornu
  E(Y(...PEAK), 0.4, (v) => (Math.random() < 0.5 ? hammer(v) : saw(v)));   // builders
  E(Y([-150, 410]), 0.3, (v) => knap(v, 3800, 0.1));                   // marble cutters
  E(Y(RO), 0.15, (v) => coo(v));                                       // pigeons
  E(Y(RO), 0.04, (v) => bark(v));
  E(Y([80, 435]), 0.02, (v) => { const t = now(), g = S.out(rnd(-0.3, 0.3)); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.09, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 5); S.noise(S.brown, t, 5.2, S.filter('bandpass', 700, 0.7, g)); });   // the roar of the crowd in the Colosseum
  E(Y(RO), 0.02, (v) => reed(v, [293.7, 330, 392, 440], N(6, 10), 0.4));   // a tibia player at a shrine
  E(Y(...PEAK), 0.12, (v) => water(v));                                // water from the fountains

  // ================================================================ CHARTRES, 500 – 1500
  S.tag = 'medieval';
  const ME = [500, 1500], PLAGUE = [[1348, 1352]];
  bed(S.white, 'bandpass', 900, 0.6, Y(ME), 0.024, 0.5);                 // wind over the Beauce
  bed(S.white, 'bandpass', 1150, 1.4, Y(ME), 0.012, 0.3);                // the Eure and the millrace
  E(Y(ME), 0.5, (v) => S.bird(v));                                     // songbirds in the hedges
  E(Y(ME), 0.06, (v) => lark(v));                                      // skylarks over the fields
  E(Y(ME), 0.04, (v) => rooster(v));
  E(Y(ME), 0.05, (v) => goose(v));
  E(Y(ME), 0.06, (v) => bleat(v));                                     // sheep
  E(Y(ME), 0.03, (v) => low(v));                                       // the plough oxen
  E(Y(ME), 0.03, (v) => bark(v));
  E(Y([800, 1347], [1352, 1500]), 0.035, (v) => S.bell(v));            // church bells
  E(Y(...PLAGUE), 0.06, (v) => S.bell(v * 0.6));                       // the passing bell, over and over
  E(Y([600, 1347], [1352, 1500]), 0.02, (v) => chant(v, rnd(110, 130), [1, 1, 1.12, 1.25, 1.12, 1.12, 1, 0.89, 1], 5, 0.8));   // monks singing the office
  E(Y([500, 1347], [1352, 1500]), 0.4, (v) => murmur(v, N(4, 10), 105, 240));   // market and street
  E(Y(ME), 0.2, (v) => hammer(v, rnd(1300, 1900)));                    // the smith
  E(Y([1194, 1230, 1], [1230, 1260, 0.3]), 0.9, (v) => (Math.random() < 0.7 ? knap(v, 3600, 0.08) : saw(v)));   // the cathedral masons
  E(Y([1194, 1230]), 0.05, (v) => { const t = now(), pan = p0(); for (let i = 0; i < 4; i++) { const c = S.out(pan); S.env(c, t + i * 1.2, v * 0.025, 0.1, 0.8); S.osc('sawtooth', rnd(60, 80), t + i * 1.2, 0.9, S.filter('bandpass', 360, 10, c)); } });   // the treadwheel crane creaking
  E(Y(ME), 0.05, (v) => wheels(v, 3.5, 140));                          // carts
  E(Y(ME), 0.15, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < 8; i++) knock(v * 0.03, t0 + i * 0.75, 500, 2, 0.08, pan); });   // the watermill's paddles

  // ================================================================ MANCHESTER, 1770 – 1840
  S.tag = 'manchester';
  const MA = [1770, 1840], MILLS = [[1790, 1840]], RAIL = [[1830, 1840]];
  bed(S.white, 'bandpass', 1400, 2.5, Y([1790, 1810, 0.4], [1810, 1840, 1]), 0.03, 0.15);   // the clatter of a thousand power looms through the mill walls
  E(Y([1770, 1810, 1], [1810, 1840, 0.4]), 0.3, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(6, 14); i++) { knock(v * 0.04, t0 + i * 0.55, 900, 3, 0.04, pan); knock(v * 0.03, t0 + i * 0.55 + 0.27, 1400, 3, 0.03, pan); } });   // a hand-loom: shuttle and batten
  E(Y(...MILLS), 0.25, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < 24; i++) knock(v * 0.035, t0 + i * 0.16, rnd(800, 1300), 3, 0.03, pan); });   // a mill's looms heard through an open door
  E(Y(...MILLS), 0.08, (v) => { const t0 = now(); for (let i = 0; i < 10; i++) { S.thump(v * 0.4, 50, 0.3, i * 1.6); const g = S.out(0); S.env(g, t0 + i * 1.6 + 0.4, v * 0.02, 0.1, 0.6); S.noise(S.white, t0 + i * 1.6 + 0.4, 0.7, S.filter('bandpass', 700, 0.8, g)); } });   // a beam engine: the stroke and the hiss of steam
  E(Y(...MILLS), 0.012, (v) => S.bell(v * 0.8));                       // the factory bell calling the shift
  E(Y(MA), 0.4, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(6, 16); i++) knock(v * 0.03, t0 + i * rnd(0.28, 0.36), rnd(900, 1300), 4, 0.04, pan); });   // clogs on the cobbles
  E(Y(MA), 0.12, (v) => wheels(v, 4, 150, true));                      // carts and drays on setts
  E(Y(MA), 0.35, (v) => murmur(v, N(4, 10), 105, 240));
  E(Y(MA), 0.04, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(1, 2); i++) S.voice(v * 0.04, t0 + i * 0.8, 0.7, [190, 220, 180], ['a', 'e', 'o'], pan, 0.3); });   // a street seller's cry
  E(Y(MA), 0.06, (v) => hammer(v));                                    // smiths and millwrights
  E(Y(MA), 0.08, (v) => croakBird(v));                                 // crows on the chimneys
  E(Y(MA), 0.3, (v) => chirps(v, 3200, 5000));                         // sparrows
  E(Y(MA), 0.02, (v) => S.bell(v));                                    // the Collegiate church
  E(Y(MA), 0.04, (v) => { const t0 = now(), pan = p0(); for (let i = 0; i < N(1, 3); i++) S.voice(v * 0.03, t0 + i * 0.6, 0.35, [150, 120], ['o', 'a'], pan, 0.8); });   // coughing in the smoke
  E(Y(...RAIL), 0.03, (v) => { const t0 = now(); S.horn(v * 0.5, [587, 740], 1.2, 'square', 2200); for (let i = 0; i < 24; i++) { const g = S.out(-0.3 + i * 0.03); S.env(g, t0 + 1.4 + i * 0.32, v * 0.05, 0.01, 0.22); S.noise(S.white, t0 + 1.4 + i * 0.32, 0.25, S.filter('bandpass', 600, 0.9, g)); } });   // a locomotive's whistle and its chuff

  S.tag = null;
  return new Set(['egypt', 'africa', 'cave', 'crescent', 'sumer', 'greece', 'rome', 'medieval', 'manchester']);
}
