import { ERAS, EVENTS, START, END, NOW, yearToU, uToYear, formatYear, eraAt, eventAt } from './timeline.js?v=740e009b';

const $ = (id) => document.getElementById(id);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** HUD + draggable timeline. Calls onScrub(u) while the user drags. */
export class UI {
  constructor({ onScrub, onPlay, onNow }) {
    this.track = $('track'); this.handle = $('handle'); this.fill = $('fill');
    this.last = {};

    // era bands
    const bands = $('bands'), labels = $('labels');
    ERAS.forEach((e, i) => {
      const a = yearToU(e.from), b = i + 1 < ERAS.length ? yearToU(ERAS[i + 1].from) : 1;
      const d = document.createElement('div'); d.className = 'band';
      d.style.left = a * 100 + '%'; d.style.width = (b - a) * 100 + '%'; d.style.background = e.color; d.title = e.name;
      bands.appendChild(d);
      const l = document.createElement('div'); l.className = 'label'; l.textContent = e.name;
      l.style.left = a * 100 + '%'; l.style.width = (b - a) * 100 + '%';
      if (b - a < 0.035) l.classList.add('narrow');
      labels.appendChild(l);
    });
    // event ticks
    for (const ev of EVENTS) {
      const t = document.createElement('div'); t.className = 'tick'; t.style.left = yearToU(ev.y) * 100 + '%';
      bands.appendChild(t);
    }
    const now = document.createElement('div'); now.className = 'nowmark'; now.style.left = yearToU(NOW) * 100 + '%'; now.textContent = 'now';
    this.track.appendChild(now);

    // dragging
    const setFrom = (e) => { const r = this.track.getBoundingClientRect(); onScrub(clamp01((e.clientX - r.left) / r.width)); };
    let drag = false;
    this.track.addEventListener('pointerdown', (e) => { drag = true; this.track.setPointerCapture(e.pointerId); document.exitPointerLock && document.exitPointerLock(); setFrom(e); e.preventDefault(); });
    this.track.addEventListener('pointermove', (e) => { if (drag) setFrom(e); });
    const stop = () => { drag = false; };
    this.track.addEventListener('pointerup', stop); this.track.addEventListener('pointercancel', stop);

    $('play').addEventListener('click', () => onPlay());
    $('now').addEventListener('click', () => onNow());

    // true-scale bar: the same span, drawn honestly
    const span = END - START;
    $('ts-dino').style.left = ((-235e6 - START) / span) * 100 + '%'; $('ts-dino').style.width = ((-66e6 + 235e6) / span) * 100 + '%';
    $('ts-now').style.left = ((NOW - START) / span) * 100 + '%';
    const scaleText = () => {
      const w = $('truescale').getBoundingClientRect().width || 1000, perPx = span / w;
      const f = (n) => (n >= 0.01 ? n.toFixed(2) : n.toExponential(0).replace('e-', ' × 10⁻').replace(/⁻(\d+)/, (_, d) => '⁻' + [...d].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')));
      $('ts-text').innerHTML = `The same timeline at <b>true scale</b>: 1 pixel ≈ ${(perPx / 1e6).toFixed(1)} million years. `
        + `All of human existence (300,000 years) is <b>${f(300e3 / perPx)} px</b> wide. Your whole life: <b>${f(80 / perPx)} px</b>.`;
    };
    scaleText(); addEventListener('resize', scaleText);
    this.span = span;
  }

  setPlaying(p) { $('play').textContent = p ? '❚❚ Pause' : '▶ Let time pass'; $('play').classList.toggle('on', p); }

  /** ev: a caption from the place on screen, if it has its own; place: its name. */
  update(u, glow, ev, place) {
    const y = uToYear(u), L = this.last;
    this.handle.style.left = u * 100 + '%'; this.fill.style.width = u * 100 + '%';
    $('ts-marker').style.left = ((y - START) / this.span) * 100 + '%';
    const fy = formatYear(y);
    if (fy.main !== L.main) { L.main = fy.main; $('year').textContent = fy.main; }
    if (fy.sub !== L.sub) { L.sub = fy.sub; $('yearsub').textContent = fy.sub; }
    const era = eraAt(y);
    if (era !== L.era) { L.era = era; $('era').textContent = era.name; $('era').style.color = era.color; }
    ev = ev || eventAt(y);
    if (place !== L.place) { L.place = place; $('place').textContent = place; }
    if (ev !== L.ev) {
      L.ev = ev;
      $('ev-title').textContent = ev.t; $('ev-here').textContent = ev.h; $('ev-world').textContent = ev.w;
      const c = $('caption'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
    }
    const g = clamp01(glow);
    if (g !== L.glow) {
      L.glow = g; $('glow').style.opacity = g;
      $('endtext').style.opacity = clamp01((g - 0.75) * 4);
      $('hud').style.opacity = 1 - clamp01((g - 0.6) * 4);
    }
  }
}
