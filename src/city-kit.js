// Building kit: procedural facade textures, the handful of materials every structure shares,
// and a geometry accumulator that merges all the detail of one structure into one mesh per material.
import * as THREE from 'three';
import { rng } from './util.js';
import { shared, canvasTex, normalMap, tileNoise } from './textures.js';

export const NEON = [0xff3ad8, 0x3af0ff, 0xffd23a, 0x7a5cff, 0xff5a3a, 0xe8f4ff];
const css = (h) => '#' + h.toString(16).padStart(6, '0');
const LIN = new Map(), _col = new THREE.Color();
/** sRGB hex → linear [r, g, b] (cached); arrays pass through as linear tints */
export const lin = (c) => { if (Array.isArray(c)) return c; let v = LIN.get(c); if (!v) { _col.set(c); LIN.set(c, v = [_col.r, _col.g, _col.b]); } return v; };
export const WHITE = [1, 1, 1];
export const pick = (r, a) => a[Math.floor(r() * a.length)];

// ---------- facade styles ----------
// cw × ch: one bay × one storey in metres. ww × wh: the window as fractions of that cell, its sill wy above the floor.
const STYLES = {
  hollandbrick: { kind: 'brick', wall: '#b98558', mortar: '#d6cab0', blank: true, cw: 2.4, ch: 3 },
  redbrick: { kind: 'brick', wall: '#9a543e', mortar: '#cfc3ae', bond: true, blank: true, cw: 2.4, ch: 3 },
  tenement: { kind: 'brick', wall: '#a66048', cw: 2.05, ch: 3.15, ww: 0.5, wh: 0.56, wy: 0.2, frame: '#d2c8b4', sash: true, home: true, sill: '#c9bfae', lintel: '#c9bfae' },
  tenementarch: { kind: 'brick', wall: '#a66048', cw: 2.05, ch: 3.15, ww: 0.5, wh: 0.58, wy: 0.2, frame: '#3a3a36', sash: true, home: true, sill: '#b9ad98', arch: 0.09, archCol: '#7c4030' },
  brownstone: { kind: 'stone', wall: '#80583f', cw: 2.3, ch: 3.5, ww: 0.44, wh: 0.6, wy: 0.17, frame: '#2e221c', sash: true, home: true, sill: '#8c6248', hood: '#8c6248' },
  castiron: { kind: 'smooth', wall: '#d9d2c0', cw: 1.9, ch: 4.1, ww: 0.7, wh: 0.7, wy: 0.15, frame: '#77705f', sash: true, mun: [2, 1], arch: 0.07, archCol: '#c2baa6', cols: '#e6dfcd', band: '#c9c1ad' },
  factory: { kind: 'brick', wall: '#8e4e3a', cw: 3.4, ch: 4.2, ww: 0.68, wh: 0.6, wy: 0.22, frame: '#2a2e30', mun: [4, 5], arch: 0.06, archCol: '#6e3a2a', sill: '#a09080', glass: '#5a6c74' },
  deco: { kind: 'stone', wall: '#d2c6aa', cw: 2.2, ch: 3.6, ww: 0.56, wh: 0.56, wy: 0.25, frame: '#4c4a44', sash: true, piers: '#ddd1b6', spandrel: '#8f866f' },
  decobrick: { kind: 'brick', wall: '#a67c5c', mortar: '#c9b9a0', cw: 2.2, ch: 3.6, ww: 0.56, wh: 0.56, wy: 0.25, frame: '#40342c', sash: true, piers: '#b08a68', spandrel: '#6a5644' },
  decodark: { kind: 'brick', wall: '#5a4a44', mortar: '#7a6a60', cw: 2.2, ch: 3.6, ww: 0.56, wh: 0.56, wy: 0.25, frame: '#b8a070', sash: true, piers: '#66544c', spandrel: '#2c2826' },
  glass: { kind: 'metal', curtain: true, grid: 8, wall: '#b4bcc2', cw: 1.5, ch: 3.8, ww: 0.93, wh: 0.66, wy: 0.3, glass: '#7ea6c2', spandrel: '#4f7690', lit: 'office' },
  dark: { kind: 'metal', curtain: true, grid: 8, wall: '#16191c', cw: 1.5, ch: 3.8, ww: 0.95, wh: 0.68, wy: 0.28, glass: '#4a5c6c', spandrel: '#262e36', lit: 'office' },
  bronze: { kind: 'metal', curtain: true, grid: 8, wall: '#3a2a1c', cw: 1.4, ch: 3.8, ww: 0.9, wh: 0.66, wy: 0.3, glass: '#8a6a44', spandrel: '#4a3826', lit: 'office' },
  clear: { kind: 'metal', curtain: true, grid: 8, wall: '#c8d0d6', cw: 1.5, ch: 4, ww: 0.97, wh: 0.82, wy: 0.15, glass: '#9fc0d6', spandrel: '#86a8c0', lit: 'office' },
  grid: { kind: 'smooth', grid: 8, wall: '#e6e4de', cw: 4.6, ch: 4.6, ww: 0.7, wh: 0.7, wy: 0.15, glass: '#7f9db4', lit: 'office', rough: 0.7 },
  wtc: { kind: 'metal', grid: 8, wall: '#c2c6ca', cw: 1.02, ch: 3.66, ww: 0.5, wh: 0.62, wy: 0.26, glass: '#5c6a76', lit: 'office', rough: 0.35 },
  green: { kind: 'smooth', grid: 8, wall: '#eceee8', cw: 3, ch: 3.6, ww: 0.9, wh: 0.62, wy: 0.3, glass: '#7fb0c6', planter: '#3f8a3a', lit: 'office' },
  neon: { kind: 'smooth', grid: 8, S: 512, wall: '#101018', cw: 3, ch: 3.5, ww: 0.5, wh: 0.34, wy: 0.33, glass: '#06060a', lit: 'neon', glow: true, panels: true },
  white: { kind: 'smooth', S: 512, wall: '#f2f6f6', cw: 3, ch: 3.5, ww: 1, wh: 0.16, wy: 0.42, glass: '#8adfe8', rough: 0.35, lit: 'none' },
  ruin: { kind: 'stone', wall: '#77766a', cw: 3, ch: 3.5, ww: 0.5, wh: 0.6, wy: 0.2, glass: '#141412', dead: true, holes: 34, lit: 'none' },
  granite: { kind: 'stone', wall: '#a39684', blank: true, cw: 3, ch: 3, block: [1.5, 0.75] },
};

function facade(st, seed) {
  const S = st.S || 1024, G = st.grid || 4, C = S / G, r = rng(seed), mx = C / st.cw, my = C / st.ch;   // pixels per metre
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c.getContext('2d'); };
  const col = mk(), hgt = mk(), orm = mk();
  const grey = (v) => { const b = Math.round(v * 255); return `rgb(${b},${b},${b})`; };
  const metal = st.kind === 'metal', wr = st.rough || (metal ? 0.4 : 0.9), wm = metal ? 0.8 : 0;
  /** fill a path in every map: colour, height, roughness, metalness and the lit-window mask */
  const P = (path, c, h, ro, me = 0, mask = 0) => {
    for (const [g, f] of [[col, c], [hgt, h === undefined ? 0 : grey(h)], [orm, ro === undefined ? 0 : `rgb(${Math.round(mask * 255)},${Math.round(ro * 255)},${Math.round(me * 255)})`]]) if (f) { g.fillStyle = f; g.beginPath(); path(g); g.fill(); }
  };
  const R = (x, y, w, h, ...a) => P((g) => g.rect(x, y, w, h), ...a);
  const shade = (x, y, w, h, a) => { col.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`; col.fillRect(x, y, w, h); };
  const fade = (x, y, w, h, a, up) => { const g = col.createLinearGradient(0, y, 0, y + h); g.addColorStop(up ? 1 : 0, `rgba(0,0,0,${a})`); g.addColorStop(up ? 0 : 1, 'rgba(0,0,0,0)'); col.fillStyle = g; col.fillRect(x, y, w, h); };

  // ---- the wall itself ----
  R(0, 0, S, S, st.kind === 'brick' ? st.mortar || '#b5a994' : st.wall, 0.42, wr, wm);
  if (st.kind === 'brick') {
    // real brick: 215 × 65 mm on a 75 mm course. Flemish bond alternates stretchers and headers.
    const rows = Math.round(S / (0.075 * my)), bh = S / rows, units = Math.round(S / ((st.bond ? 0.3225 : 0.215) * mx)), bw = S / units / (st.bond ? 1.5 : 1), j = Math.max(1, 0.011 * mx), hx = parseInt(st.wall.slice(1), 16);
    for (let row = 0; row < rows; row++) for (let x = (row % 2) * bw * (st.bond ? 0.75 : 0.5), k = 0; x < S + bw; k++) {
      const w = st.bond && k % 2 ? bw / 2 : bw, v = 1 + (r() - 0.5) * 0.26 - (r() < 0.07 ? 0.22 : 0) - (st.bond && k % 2 ? 0.1 : 0), y = row * bh, h = 0.52 + r() * 0.12;
      const c = `rgb(${Math.round((hx >> 16) * v * (1 + (r() - 0.5) * 0.08))},${Math.round(((hx >> 8) & 255) * v)},${Math.round((hx & 255) * v * (1 + (r() - 0.5) * 0.1))})`;
      for (const xx of [x, x - S]) { col.fillStyle = c; col.fillRect(xx, y, w - j, bh - j); hgt.fillStyle = grey(h); hgt.fillRect(xx, y, w - j, bh - j); }
      x += w;
    }
  } else if (st.kind === 'stone') {
    const [sw, sh] = st.block || [0.62, 0.31], rows = Math.round(S / (sh * my)), bh = S / rows, cols = Math.round(S / (sw * mx)), bw = S / cols;
    for (let row = 0; row < rows; row++) for (let i = 0; i <= cols; i++) {
      const x = (i - (row % 2) * 0.5) * bw, y = row * bh;
      shade(x, y, bw, bh, (r() - 0.5) * 0.13); hgt.fillStyle = grey(0.5 + r() * 0.1); hgt.fillRect(x, y, bw, bh);
      shade(x, y + bh - 1.5, bw, 1.5, -0.3); shade(x, y, 1.5, bh, -0.25); shade(x, y, bw, 1, 0.1);
      hgt.fillStyle = grey(0.3); hgt.fillRect(x, y + bh - 2, bw, 2); hgt.fillRect(x, y, 2, bh);
    }
  }
  if (!metal) {
    for (let i = 0; i < S * 5; i++) shade(r() * S, r() * S, 1 + r() * 5, 1 + r() * 3, (r() - 0.5) * 0.08);     // grime
    for (let i = 0; i < 18; i++) { const x = r() * S, y = r() * S, a = (r() - 0.5) * 0.1; col.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`; for (const [ox, oy] of [[0, 0], [-S, 0], [0, -S], [-S, -S]]) { col.beginPath(); col.ellipse(x + ox, y + oy, 40 + r() * 120, 30 + r() * 90, 0, 0, 7); col.fill(); } }
  }
  if (st.piers) for (let cx = 0; cx <= G; cx++) { const w = 0.5 * mx; R(cx * C - w / 2, 0, w, S, st.piers, 0.8, wr, wm); shade(cx * C - w / 2, 0, 3, S, 0.14); shade(cx * C + w / 2 - 3, 0, 3, S, -0.2); }
  if (st.spandrel && !st.curtain) for (let cx = 0; cx < G; cx++) {
    // ornamented spandrel panels run up the bay between the windows
    const w = C * st.ww, x = cx * C + (C - w) / 2; R(x, 0, w, S, st.spandrel, 0.5, 0.7, 0.2);
    for (let cy = 0; cy < G; cy++) { const y0 = (cy + 1) * C - C * st.wy + 6, hh = C * (1 - st.wh) - 12; col.strokeStyle = 'rgba(255,255,255,0.22)'; col.lineWidth = 3; for (let q = 0; q < 3; q++) { col.beginPath(); col.moveTo(x + 6, y0 + hh * (0.3 + q * 0.3)); col.lineTo(x + w / 2, y0 + hh * (0.05 + q * 0.3)); col.lineTo(x + w - 6, y0 + hh * (0.3 + q * 0.3)); col.stroke(); } }
  }

  // ---- windows ----
  const lightGlass = st.glass || '#56666f';
  if (!st.blank) for (let cy = 0; cy < G; cy++) for (let cx = 0; cx < G; cx++) {
    const w = C * st.ww, h = C * st.wh, x = cx * C + (C - w) / 2, yb = (cy + 1) * C - C * st.wy, y = yb - h, rise = (st.arch || 0) * C;
    /** the opening, grown by e */
    const open = (e) => (g) => { if (rise) { g.moveTo(x - e, yb + e); g.lineTo(x - e, y + rise); g.quadraticCurveTo(x + w / 2, y - rise - e * 2, x + w + e, y + rise); g.lineTo(x + w + e, yb + e); } else g.rect(x - e, y - e, w + 2 * e, h + 2 * e); };
    if (st.curtain) R(x, cy * C + 0.05 * my, w, C - 0.1 * my, st.spandrel, 0.5, 0.12, 0.85);
    if (rise) { const e = 0.24 * my; P((g) => { g.moveTo(x - e * 0.4, y + rise + e * 0.5); g.quadraticCurveTo(x + w / 2, y - rise - e * 2, x + w + e * 0.4, y + rise + e * 0.5); g.lineTo(x + w, y + rise); g.quadraticCurveTo(x + w / 2, y - rise, x, y + rise); }, st.archCol, 0.62, 0.85); }
    if (st.frame) P(open(0.055 * mx), st.frame, 0.7, 0.6);
    P(open(0), lightGlass, 0.2, st.dead ? 1 : 0.07, st.dead ? 0 : 0.9, 1);
    col.save(); col.beginPath(); open(0)(col); col.clip();
    shade(x, y - rise, w, h + rise, (r() - 0.55) * 0.3);
    if (!st.dead) {
      const g = col.createLinearGradient(0, y, 0, yb); g.addColorStop(0, `rgba(235,245,255,${0.16 + r() * 0.12})`); g.addColorStop(1, `rgba(0,0,10,${0.2 + r() * 0.2})`); col.fillStyle = g; col.fillRect(x, y - rise, w, h + rise);
      const q = r();
      if (q < (st.home ? 0.3 : 0.4)) { const bl = h * (0.15 + r() * (st.curtain ? 0.5 : 0.7)); col.fillStyle = `rgba(232,226,208,${st.curtain ? 0.08 + r() * 0.2 : 0.35 + r() * 0.35})`; col.fillRect(x, y - rise, w, bl + rise); orm.fillStyle = `rgb(150,${st.curtain ? 60 : 110},120)`; orm.fillRect(x, y, w, bl); }     // blinds
      else if (st.home && q < 0.6) { col.fillStyle = `rgba(${220 + r() * 30},${205 + r() * 30},${185 + r() * 40},0.5)`; col.fillRect(x, y - rise, w * 0.24, h + rise); col.fillRect(x + w * 0.76, y - rise, w * 0.24, h + rise); }   // curtains
      fade(x, y - rise, w, 0.14 * my + rise, 0.5); shade(x, y, 0.035 * mx, h, -0.3);     // the reveal's shadow
    }
    col.restore();
    const fc = st.frame || st.wall;
    if (st.sash) R(x, y + h * 0.5 - 0.025 * my, w, 0.05 * my, fc, 0.7, 0.6);
    if (st.mun) { for (let q = 1; q < st.mun[0]; q++) R(x + (w * q) / st.mun[0] - 1.5, y, 3, h, fc, 0.7, 0.6); for (let q = 1; q < st.mun[1]; q++) R(x, y + (h * q) / st.mun[1] - 1.5, w, 3, fc, 0.7, 0.6); }
    const lip = 0.12 * mx;
    if (st.sill) { R(x - lip, yb + 0.05 * my, w + 2 * lip, 0.1 * my, st.sill, 0.95, 0.8); fade(x - lip, yb + 0.15 * my, w + 2 * lip, 0.14 * my, 0.4); fade(x, yb + 0.15 * my, w, 0.9 * my, 0.08); }
    if (st.lintel) R(x - lip, y - 0.3 * my, w + 2 * lip, 0.24 * my, st.lintel, 0.85, 0.8);
    if (st.hood) { R(x - lip * 1.5, y - 0.42 * my, w + 3 * lip, 0.3 * my, st.hood, 0.95, 0.8); shade(x - lip * 1.5, y - 0.42 * my, w + 3 * lip, 3, 0.2); fade(x - lip * 1.5, y - 0.12 * my, w + 3 * lip, 0.1 * my, 0.45); }
  }
  if (st.cols) for (let cx = 0; cx <= G; cx++) {
    // cast-iron columns between the bays, an entablature at every storey
    const w = 0.34 * mx, x = cx * C - w / 2, g = col.createLinearGradient(x, 0, x + w, 0);
    R(x, 0, w, S, st.cols, 0.9, 0.6); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.35, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); col.fillStyle = g; col.fillRect(x, 0, w, S);
  }
  if (st.band) for (let cy = 0; cy <= G; cy++) { const e = 0.5 * my; R(0, cy * C - e / 2, S, e, st.band, 0.95, 0.7); shade(0, cy * C - e / 2, S, 3, 0.2); fade(0, cy * C + e / 2, S, 0.2 * my, 0.45); for (let q = 0; q < S; q += 0.16 * mx) shade(q, cy * C + e * 0.1, 0.07 * mx, e * 0.3, -0.16); }
  if (st.planter) for (let cy = 0; cy < G; cy++) { const yb = (cy + 1) * C - C * st.wy; R(0, yb, S, 0.35 * my, st.planter, 0.9, 0.95); for (let q = 0; q < 220; q++) shade(r() * S, yb - 3 + r() * (0.35 * my + 6), 3 + r() * 6, 2 + r() * 5, (r() - 0.6) * 0.5); fade(0, yb + 0.35 * my, S, 0.25 * my, 0.35); }
  if (st.panels) for (let i = 0; i < 60; i++) { const x = Math.floor(r() * G * 2) * C / 2, y = r() * S; shade(x, y, 2, 40 + r() * 200, -0.5); shade(r() * S, Math.floor(r() * G * 4) * C / 4, 30 + r() * 160, 2, 0.08); }
  if (st.kind === 'metal' && !st.curtain) for (let cx = 0; cx < G; cx++) { shade(cx * C + C * (1 - st.ww) / 2 - 2, 0, 2, S, -0.3); shade(cx * C, 0, 2, S, 0.2); }
  for (let i = 0; i < (st.holes || 0); i++) {
    const x = r() * S, y = r() * S, a = 8 + r() * 26, b = 8 + r() * 36, moss = r() < 0.75;
    for (const [g, c] of [[col, moss ? `rgba(${50 + r() * 30},${85 + r() * 30},40,0.8)` : '#141412'], [hgt, grey(moss ? 0.7 : 0.1)], [orm, 'rgb(0,255,0)']]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, a, b, r() * 3, 0, 7); g.fill(); }
  }
  const hd = hgt.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = hd[i * 4] / 255;
  const small = document.createElement('canvas'); small.width = small.height = 512; small.getContext('2d').drawImage(orm.canvas, 0, 0, 512, 512);
  return { map: canvasTex(col.canvas), normalMap: normalMap(h, S, metal ? 2 : 3), orm: canvasTex(small, false) };
}

// ---------- which windows are lit: one texel per window, sampled through a second UV set so no two walls match ----------
export const LIT = 64;
const LITS = {};
function litTex(kind) {
  if (LITS[kind]) return LITS[kind];
  const c = document.createElement('canvas'); c.width = c.height = LIT; const g = c.getContext('2d'), r = rng(kind.length * 77);
  g.fillStyle = '#000'; g.fillRect(0, 0, LIT, LIT);
  const warm = ['#ffd9a0', '#fff0d0', '#ffe6b0', '#ffe2a8', '#ffcf90', '#cfe4ff'], office = ['#fff4e0', '#f0f6ff', '#fff0d0', '#e6f0ff'];
  if (kind !== 'none') for (let y = 0; y < LIT; y++) {
    const whole = kind === 'office' && r() < 0.14;      // a whole office floor working late
    for (let x = 0; x < LIT; x++) {
      const p = kind === 'neon' ? 0.42 : kind === 'office' ? (whole ? 0.9 : 0.2) : 0.24;
      if (r() < p) { g.globalAlpha = 0.4 + r() * 0.6; g.fillStyle = kind === 'neon' ? css(pick(r, NEON)) : pick(r, kind === 'office' ? office : warm); g.fillRect(x, y, 1, 1); }
    }
  }
  const t = canvasTex(c); t.magFilter = THREE.NearestFilter; t.channel = 1;
  return LITS[kind] = t;
}

const FAC = {}, NIGHT = [];
/** The facade of a style: its wall material plus the measurements needed to line real geometry up with the painted windows. */
export function facadeOf(name) {
  if (!FAC[name]) {
    const st = STYLES[name], t = facade(st, name.length * 131 + name.charCodeAt(0) * 7 + name.charCodeAt(name.length - 1));
    const side = new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, roughnessMap: t.orm, metalnessMap: t.orm, roughness: 1, metalness: 1, emissive: 0xffffff, emissiveMap: litTex(st.lit || 'warm'), emissiveIntensity: st.glow ? 2.2 : 0 });
    // the red channel of the roughness map marks glass: only windows glow
    side.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= texture2D( roughnessMap, vRoughnessMapUv ).r;'); };
    const G = st.grid || 4; side.userData = { uv: 2, tile: [G * st.cw, G * st.ch] };
    if (!st.glow) NIGHT.push(side);
    const hex = (c) => lin(parseInt(c.slice(1), 16));
    FAC[name] = { side, st, G, cw: st.cw, ch: st.ch, ww: st.ww, wh: st.wh, wy: st.wy, wall: hex(st.wall), pier: hex(st.piers || st.wall), dark: hex(st.spandrel || st.wall) };
  }
  return FAC[name];
}

// ---------- shared materials ----------
const vc = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, ...o });
function surface(paint, tile, o = {}) {
  let m; const S = 256;
  return () => {
    if (!m) {
      const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), hc = document.createElement('canvas'); hc.width = hc.height = S; const hg = hc.getContext('2d');
      paint(g, hg, S, rng(tile[0] * 100 + tile[1] * 7));
      const d = hg.getImageData(0, 0, S, S).data, h = new Float32Array(S * S); for (let i = 0; i < S * S; i++) h[i] = d[i * 4] / 255;
      m = vc({ map: canvasTex(c), normalMap: normalMap(h, S, o.bump || 4), side: THREE.DoubleSide, ...o.mat }); m.userData = { uv: 1, tile };
    }
    return m;
  };
}
const rows = (n, lap, draw) => (g, hg, S, r) => {
  // overlapping courses of roofing, each course shaded darker under the one above
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  for (let j = 0; j < n; j++) { const y = (j * S) / n, h = S / n; for (let i = -1; i < lap; i++) draw(g, hg, ((i + (j % 2) * 0.5) * S) / lap, y, S / lap, h, r); const sh = g.createLinearGradient(0, y, 0, y + h); sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, y, S, h); const hh = hg.createLinearGradient(0, y, 0, y + h); hh.addColorStop(0, '#303030'); hh.addColorStop(1, '#c0c0c0'); hg.globalAlpha = 0.6; hg.fillStyle = hh; hg.fillRect(0, y, S, h); hg.globalAlpha = 1; }
};
const tone = (g, x, y, w, h, r, a = 0.25) => { const v = Math.round(255 - r() * 255 * a); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + 0.5, y, w - 1, h); };
export const M = {
  trim: vc({}),                                              // painted wood, stone, tar: everything matt
  metal: vc({ roughness: 0.25, metalness: 0.92 }),           // stainless steel, chrome, gilding
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }), // neon, beacons
  // glazing: dark reflective glass by day, lit from inside in its vertex colour by night
  lit: vc({ color: 0x8a9aa8, roughness: 0.06, metalness: 0.95, emissive: 0xffffff, emissiveIntensity: 0 }),
  // roofing and rough surfaces, mapped in metres
  tile: surface(rows(6, 8, (g, hg, x, y, w, h, r) => { tone(g, x, y, w, h, r); const s = hg.createLinearGradient(x, 0, x + w, 0); s.addColorStop(0, '#404040'); s.addColorStop(0.5, '#ffffff'); s.addColorStop(1, '#404040'); hg.fillStyle = s; hg.fillRect(x, y, w, h); }), [2, 1.8], { bump: 5 }),
  slate: surface(rows(8, 8, (g, hg, x, y, w, h, r) => tone(g, x, y, w, h, r, 0.3)), [2.4, 2], { bump: 3 }),
  shingle: surface(rows(8, 12, (g, hg, x, y, w, h, r) => tone(g, x, y, w * (0.8 + r() * 0.2), h, r, 0.4)), [2.4, 2.4], { bump: 4 }),
  thatch: surface((g, hg, S, r) => { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S); for (let i = 0; i < 5000; i++) { const x = r() * S, y = r() * S, l = 10 + r() * 30, v = Math.round(130 + r() * 125); for (const c of [g, hg]) { c.strokeStyle = `rgb(${v},${v},${v})`; c.lineWidth = 1 + r(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 5, y + l); c.stroke(); } } }, [2, 2], { bump: 5, mat: { roughness: 1 } }),
  // elm bark laid in overlapping sheets over a sapling frame
  bark: surface((g, hg, S, r) => {
    g.fillStyle = '#b0b0b0'; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
    for (let j = 0; j < 5; j++) for (let i = -1; i < 4; i++) { const x = (i + (j % 2) * 0.5 + (r() - 0.5) * 0.2) * S / 4, y = j * S / 5, w = S / 4, h = S / 5 + 6, v = Math.round(150 + r() * 105); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, w - 2, h); hg.fillStyle = `rgb(${90 + j * 8},${90 + j * 8},${90 + j * 8})`; hg.fillRect(x, y, w - 2, h); for (let q = 0; q < 14; q++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(x + r() * w, y, 1 + r() * 2, h); } g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + h - 3, w, 3); hg.fillStyle = '#202020'; hg.fillRect(x, y + h - 3, w, 3); hg.fillRect(x + w - 3, y, 3, h); }
  }, [3, 3], { bump: 5, mat: { roughness: 1 } }),
  plank: surface((g, hg, S, r) => { for (let i = 0; i < 8; i++) { const v = Math.round(170 + r() * 85); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect((i * S) / 8, 0, S / 8, S); hg.fillStyle = '#909090'; hg.fillRect((i * S) / 8, 0, S / 8, S); hg.fillStyle = '#202020'; hg.fillRect((i * S) / 8, 0, 2, S); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect((i * S) / 8, 0, 2, S); for (let q = 0; q < 30; q++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect((i * S) / 8 + r() * S / 8, r() * S, 1, 20 + r() * 80); } } }, [1.6, 1.6], { bump: 3 }),
  earth: surface((g, hg, S) => { const n = tileNoise(S, 6, 5, 31), a = g.createImageData(S, S), b = hg.createImageData(S, S); for (let i = 0; i < S * S; i++) { const v = 150 + n[i] * 105; a.data.set([v, v, v, 255], i * 4); b.data.set([n[i] * 255, 0, 0, 255], i * 4); } g.putImageData(a, 0, 0); hg.putImageData(b, 0, 0); }, [4, 4], { bump: 6, mat: { roughness: 1 } }),
};
M.lit.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '').replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= vColor.rgb;'); };
M.lamp = new THREE.MeshBasicMaterial({ vertexColors: true });      // street-lamp glass: brightens at night
M.lit.userData.cast = false; M.glow.userData.cast = false; M.lamp.userData.cast = false;

/** Railings, fences and lattice steelwork: one alpha-tested strip; the lower half is balusters, the upper half a braced truss. */
let _grille;
M.grille = () => {
  if (!_grille) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    for (let x = 0; x < 64; x += 16) g.fillRect(x, 66, 4, 60);
    g.fillRect(0, 66, 64, 7); g.fillRect(0, 108, 64, 4); g.fillRect(0, 122, 64, 5);
    g.fillRect(0, 2, 64, 7); g.fillRect(0, 53, 64, 7); g.fillRect(0, 2, 5, 58); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 6); g.lineTo(64, 56); g.moveTo(64, 6); g.lineTo(0, 56); g.stroke();
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
    _grille = vc({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.15 }); _grille.userData = { uv: 1 };
  }
  return _grille;
};
/** Windows and shop fronts come on as the light fails. */
/** Settle a structure built with a lift function onto the land as it is now (hill: 1 = the original relief, 0 = graded flat). */
export function conform(obj, hill) {
  obj.traverse((m) => { const d = m.geometry && m.geometry.userData.lift; if (!d) return; const p = m.geometry.attributes.position; for (let i = 0; i < d.l.length; i++) p.setY(i, d.y[i] + d.l[i] * hill); p.needsUpdate = true; m.geometry.computeBoundingSphere(); });
}
export function setNight(n) { for (const m of NIGHT) m.emissiveIntensity = n * 1.6; M.lit.emissiveIntensity = n * 1.3; M.lamp.color.setRGB(1, 0.92, 0.75).multiplyScalar(0.35 + n * 5); }
export const groundNormal = () => shared().groundNormal;

// ---------- geometry accumulator ----------
const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const UNIT = new THREE.BoxGeometry(1, 1, 1), CYL = {};
const unitCyl = (seg) => CYL[seg] || (CYL[seg] = new THREE.CylinderGeometry(1, 1, 1, seg));
export class Kit {
  /** r: random source. lift(x, z): optional height of the ground at a point relative to the origin, for things spread over rolling land. */
  constructor(r, lift) { this.r = r; this.lift = lift; this.lf = 0; this.bk = new Map(); this.su = this.sv = 1;       // su, sv: texture repeats for geometries that bring their own UVs
    this.co = 1; this.si = 0; this.ox = 0; this.oy = 0; this.oz = 0; }
  bucket(mat) {
    let b = this.bk.get(mat);
    if (!b) this.bk.set(mat, b = { p: [], n: [], c: [], i: [], l: this.lift ? [] : null, uv: mat.userData.uv ? [] : null, uv1: mat.userData.uv > 1 ? [] : null, tile: mat.userData.tile || WHITE });
    return b;
  }
  /** Run fn in a local frame: origin (x, y, z), turned ry about the vertical. Local +z ends up pointing along (sin ry, 0, cos ry). */
  at(x, y, z, ry, fn) {
    const s = [this.co, this.si, this.ox, this.oy, this.oz], c = Math.cos(ry), sn = Math.sin(ry);
    this.ox += x * s[0] + z * s[1]; this.oy += y; this.oz += -x * s[1] + z * s[0];
    this.co = s[0] * c - s[1] * sn; this.si = s[1] * c + s[0] * sn;
    fn(); [this.co, this.si, this.ox, this.oy, this.oz] = s;
  }
  /** Like at(), for something standing on the ground at (x, z): everything built inside rides up and down with the land there. */
  on(x, z, ry, fn) { const old = this.lf; this.at(x, 0, z, ry, () => { this.lf = this.lift ? this.lift(this.ox, this.oz) : 0; fn(); }); this.lf = old; }
  v(b, x, y, z, nx, ny, nz, c, u = 0, w = 0, u1 = 0, w1 = 0) {
    const co = this.co, si = this.si;
    b.p.push(x * co + z * si + this.ox, y + this.oy, -x * si + z * co + this.oz); b.n.push(nx * co + nz * si, ny, -nx * si + nz * co); b.c.push(c[0], c[1], c[2]);
    if (b.uv) b.uv.push(u, w); if (b.uv1) b.uv1.push(u1, w1); if (b.l) b.l.push(this.lf);
    return b.p.length / 3 - 1;
  }
  /** Flat polygon from 3 or 4 corners, anticlockwise seen from outside. Textured materials are mapped in metres along the dominant axes. */
  quad(mat, col, ...P) {
    const b = this.bucket(mat), c = lin(col), [A, B] = P, D = P[P.length - 1];
    _a.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]).cross(_b.set(D[0] - A[0], D[1] - A[1], D[2] - A[2])).normalize();
    const nx = _a.x, ny = _a.y, nz = _a.z, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const lf = this.lf, i = P.map((p) => {
      const u = ay > 0.9 ? p[0] : ax > az ? p[2] : p[0], w = ay > 0.9 ? p[2] : ay > 0.25 ? p[1] / Math.sqrt(1 - ny * ny) : p[1];
      if (p[5] !== undefined) this.lf = p[5];      // a sixth number pins that corner to the land on its own
      return this.v(b, p[0], p[1], p[2], nx, ny, nz, c, p[3] ?? u / b.tile[0], p[4] ?? w / b.tile[1]);
    });
    this.lf = lf;
    b.i.push(i[0], i[1], i[2]); if (i.length > 3) b.i.push(i[0], i[2], i[3]);
  }
  /** Axis-aligned box standing on y, centred on x, z. skip lists faces to leave out: l r (x), b t (y), k f (back, front). */
  box(mat, col, w, h, d, x = 0, y = 0, z = 0, skip = '') {
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2, f = (k, ...p) => { if (!skip.includes(k)) this.quad(mat, col, ...p); };
    f('f', [x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1]); f('k', [x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0]);
    f('r', [x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1]); f('l', [x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0]);
    f('t', [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); f('b', [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]);
  }
  /** Any three.js geometry, transformed by the matrix in _m. */
  put(mat, col, g) {
    const b = this.bucket(mat), c = lin(col), P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, base = b.p.length / 3;
    _nm.getNormalMatrix(_m);
    for (let i = 0; i < P.count; i++) { _a.fromBufferAttribute(P, i).applyMatrix4(_m); _b.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); this.v(b, _a.x, _a.y, _a.z, _b.x, _b.y, _b.z, c, U ? U.getX(i) * this.su : 0, U ? U.getY(i) * this.sv : 0); }
    if (g.index) for (let i = 0; i < g.index.count; i++) b.i.push(base + g.index.getX(i)); else for (let i = 0; i < P.count; i++) b.i.push(base + i);
  }
  geo(mat, col, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { _m.compose(_a.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); this.put(mat, col, g); }
  /** Upright cylinder or cone frustum standing on y. */
  cyl(mat, col, rt, rb, h, x = 0, y = 0, z = 0, seg = 10, open = false) { this.geo(mat, col, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), x, y + h / 2, z); }
  /** Round bar (seg > 4) or square beam w × d between two points. */
  rod(mat, col, w, A, B, seg = 4, d = w) {
    _a.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); const len = _a.length(); _q.setFromUnitVectors(UP, _a.divideScalar(len));
    _m.compose(_b.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2), _q, _s.set(w, len, d)); this.put(mat, col, seg > 4 ? unitCyl(seg) : UNIT);
  }
  /** Surface of revolution from a profile of [radius, height] pairs, bottom to top. */
  lathe(mat, col, pts, x = 0, y = 0, z = 0, seg = 12) { this.geo(mat, col, new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), x, y, z); }
  /** A strip of railing (kind 0) or lattice truss (kind 1) running from A to B and reaching `up` from that line. */
  strip(col, A, B, up, kind = 0, every = 0) {
    const b = this.bucket(M.grille()), c = lin(col), h = Math.hypot(up[0], up[1], up[2]), n = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) / (every || (kind ? h : 0.5)), v0 = kind ? 0.53 : 0.01, v1 = kind ? 0.99 : 0.485;
    _a.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]).cross(_b.set(up[0], up[1], up[2])).normalize();
    const i = this.v(b, A[0], A[1], A[2], _a.x, _a.y, _a.z, c, 0, v0); this.v(b, B[0], B[1], B[2], _a.x, _a.y, _a.z, c, n, v0);
    this.v(b, B[0] + up[0], B[1] + up[1], B[2] + up[2], _a.x, _a.y, _a.z, c, n, v1); this.v(b, A[0] + up[0], A[1] + up[1], A[2] + up[2], _a.x, _a.y, _a.z, c, 0, v1);
    b.i.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  /** A railing on the ground plan from (x0, z0) at height y to (x1, z1) at height y1, h tall. */
  rail(col, x0, z0, x1, z1, y, h = 1, kind = 0, y1 = y) { this.strip(col, [x0, y, z0], [x1, y1, z1], [0, h, 0], kind); }
  /**
   * A rectangle of facade in the plane z of the current frame, facing +z. Bays and storeys keep their real size,
   * every wall starts at a random place in the tile and lights a different set of windows.
   */
  wall(F, x0, x1, y0, y1, z = 0, tint = WHITE, bays = 0, floors = 0) {
    const b = this.bucket(F.side), r = this.r, G = F.G, n = bays || Math.max(1, Math.round((x1 - x0) / F.cw)), nf = floors || Math.max(1, Math.round((y1 - y0) / F.ch));
    const u = Math.floor(r() * G) / G, w = Math.floor(r() * G) / G, a = Math.floor(r() * LIT) / LIT, c = Math.floor(r() * LIT) / LIT;
    const i = this.v(b, x0, y0, z, 0, 0, 1, tint, u, w, a, c); this.v(b, x1, y0, z, 0, 0, 1, tint, u + n / G, w, a + n / LIT, c);
    this.v(b, x1, y1, z, 0, 0, 1, tint, u + n / G, w + nf / G, a + n / LIT, c + nf / LIT); this.v(b, x0, y1, z, 0, 0, 1, tint, u, w + nf / G, a, c + nf / LIT);
    b.i.push(i, i + 1, i + 2, i, i + 2, i + 3);
    return { n, nf, bw: (x1 - x0) / n, fh: (y1 - y0) / nf, x0, y0 };
  }
  /**
   * Facade stretched over any closed shape: rings are [{ y, pts: [[x, z], …] }] bottom to top, each going round to the
   * right as seen from outside (front-left, front-right, back-right, back-left). Used for tapered, chamfered and twisted towers.
   */
  skin(F, rings, tint = WHITE, round = false) {
    const b = this.bucket(F.side), r = this.r, G = F.G, np = rings[0].pts.length, us = [Math.floor(r() * G)];
    for (let j = 0; j < np; j++) { const p = rings[0].pts[j], q = rings[0].pts[(j + 1) % np]; us.push(us[j] + Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / F.cw))); }
    let vv = Math.floor(r() * G); const a = Math.floor(r() * LIT);
    for (let k = 0; k + 1 < rings.length; k++) {
      const lo = rings[k], hi = rings[k + 1], nf = Math.max(1, Math.round((hi.y - lo.y) / F.ch));
      for (let j = 0; j < np; j++) {
        const j1 = (j + 1) % np, Q = [[lo.pts[j], lo.y, us[j], vv], [lo.pts[j1], lo.y, us[j + 1], vv], [hi.pts[j1], hi.y, us[j + 1], vv + nf], [hi.pts[j], hi.y, us[j], vv + nf]];
        _a.set(Q[1][0][0] - Q[0][0][0], 0, Q[1][0][1] - Q[0][0][1]).cross(_b.set(Q[3][0][0] - Q[0][0][0], Q[3][1] - Q[0][1], Q[3][0][1] - Q[0][0][1])).normalize();
        const i = Q.map(([p, y, u, v]) => { const l = round ? Math.hypot(p[0], p[1]) || 1 : 0; return this.v(b, p[0], y, p[1], round ? p[0] / l : _a.x, round ? 0 : _a.y, round ? p[1] / l : _a.z, tint, u / G, v / G, (a + u) / LIT, (a + v) / LIT); });
        b.i.push(i[0], i[1], i[2], i[0], i[2], i[3]);
      }
      vv += nf;
    }
    return us[np] - us[0];
  }
  /** Both faces of a thin sheet (awnings, sails, flags). */
  sheet(mat, col, ...P) { this.quad(mat, col, ...P); this.quad(mat, col, ...P.slice().reverse()); }
  /** One triangle of facade; each corner is [x, y, z, bay, storey]. */
  facet(F, tint, ...P) {
    const b = this.bucket(F.side), r = this.r, G = F.G, u = Math.floor(r() * G), w = Math.floor(r() * G), a = Math.floor(r() * LIT);
    _a.set(P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]).cross(_b.set(P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2])).normalize();
    const i = P.map((p) => this.v(b, p[0], p[1], p[2], _a.x, _a.y, _a.z, tint, (u + p[3]) / G, (w + p[4]) / G, (a + p[3]) / LIT, (a + p[4]) / LIT));
    b.i.push(i[0], i[1], i[2]);
  }
  /** The same, as parts for an instanced Scatter. */
  parts() { return this.build().children.map((m) => ({ geo: m.geometry, mat: m.material, cast: m.castShadow })); }
  /** One mesh per material used. */
  build() {
    const g = new THREE.Group();
    for (const [mat, b] of this.bk) {
      if (!b.i.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
      if (b.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); if (b.uv1) geo.setAttribute('uv1', new THREE.Float32BufferAttribute(b.uv1, 2));
      geo.setIndex(b.i);
      if (b.l && b.l.some((v) => v)) geo.userData.lift = { l: Float32Array.from(b.l), y: Float32Array.from(b.p.filter((_, i) => i % 3 === 1)) };
      const m = new THREE.Mesh(geo, mat); m.castShadow = mat.userData.cast !== false; m.receiveShadow = true; g.add(m);
    }
    return g;
  }
}
