// Building kit for the towns of the later ages (Chartres, Manchester): textured masonry gathered into a few meshes per
// span of years, walls pierced by real window and door openings, props in one draw call, colliders, and things that follow paths.
import * as THREE from 'three';
import { rng } from './util.js';
import { Bag, vehicleMat, fin } from './vehicles-kit.js';

export { fin };
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _n3 = new THREE.Matrix3(), _c = new THREE.Color(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const WHITE = [1, 1, 1], COLS = new Map();
export const lin = (c) => { if (Array.isArray(c)) return c; let v = COLS.get(c); if (!v) { _c.set(c); COLS.set(c, v = [_c.r, _c.g, _c.b]); } return v; };
export const mat4 = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));

// =====================================================================================
// Textures (all drawn here; every one tiles)
// =====================================================================================
function canvas(S, fill) { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, S, S); return [c, g]; }
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const shade = (base, k) => rgb(base[0] * k, base[1] * k, base[2] * k);
function speckle(g, S, r, n, lo, hi, size = 2) { for (let i = 0; i < n; i++) { const v = r() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${lo + r() * (hi - lo)})`; g.fillRect(r() * S, r() * S, 1 + r() * size, 1 + r() * size); } }
/** Courses of blocks: rows of height h, blocks w0..w1 wide, staggered; colour(r) gives each block's [r, g, b]. */
function courses(g, S, r, h, w0, w1, colour, joint, jw = 2, bond) {
  for (let y = 0, row = 0; y < S; y += h, row++) {
    let x = -r() * w1;
    if (bond) x = row % 2 ? -bond[0] / 2 : -bond[1] / 4;
    while (x < S) {
      const w = bond ? bond[row % 2] : w0 + r() * (w1 - w0), c = colour(r);
      for (const ox of [0, -S]) { g.fillStyle = joint; g.fillRect(x + ox, y, w, h); g.fillStyle = rgb(...c); g.fillRect(x + ox + jw / 2, y + jw / 2, w - jw, h - jw); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + ox + jw / 2, y + jw / 2, w - jw, 1.5); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + ox + jw / 2, y + h - jw / 2 - 1.5, w - jw, 1.5); }
      x += w;
    }
  }
}
const vary = (base, amt) => (r) => { const k = 1 - amt + r() * amt * 2; return [base[0] * k, base[1] * k * (0.98 + r() * 0.04), base[2] * k]; };
const DRAW = {
  stone(g, S, r) { courses(g, S, r, S / 8, S / 5, S / 2.6, vary([214, 200, 172], 0.07), '#8a826e'); speckle(g, S, r, 5000, 0.02, 0.08); },
  rubble(g, S, r) { courses(g, S, r, S / 10, S / 12, S / 5, vary([150, 142, 126], 0.2), '#5e5a50', 3); speckle(g, S, r, 6000, 0.03, 0.12, 3); },
  brick(g, S, r) { const b = S / 5.2; courses(g, S, r, S / 16, 0, 0, (q) => (q() < 0.12 ? [98, 62, 52] : vary([158, 84, 60], 0.14)(q)), '#b8ab98', 2, [b, b / 2]); speckle(g, S, r, 4000, 0.02, 0.1); },
  thatch(g, S, r) {
    for (let i = 0; i < 5200; i++) { const k = 0.62 + r() * 0.5; g.fillStyle = shade([190, 160, 96], k); const x = r() * S, y = r() * S, l = 14 + r() * 50; g.fillRect(x, y, 1.3, l); g.fillRect(x, y - S, 1.3, l); }
    for (let y = 0; y < S; y += S / 4) { const gr = g.createLinearGradient(0, y, 0, y + 18); gr.addColorStop(0, 'rgba(40,28,10,0.5)'); gr.addColorStop(1, 'rgba(40,28,10,0)'); g.fillStyle = gr; g.fillRect(0, y, S, 18); }
  },
  tile(g, S, r) {
    const h = S / 8, w = S / 12;
    for (let y = 0, row = 0; y < S; y += h, row++) for (let x = (row % 2) * -w / 2; x < S; x += w) {
      const c = vary([176, 92, 58], 0.2)(r); g.fillStyle = rgb(...c); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(40,14,6,0.55)'; g.fillRect(x, y, 1.5, h);
      const gr = g.createLinearGradient(0, y + h - 9, 0, y + h); gr.addColorStop(0, 'rgba(30,10,4,0)'); gr.addColorStop(1, 'rgba(30,10,4,0.6)'); g.fillStyle = gr; g.fillRect(x, y + h - 9, w, 9);
    }
    speckle(g, S, r, 2500, 0.03, 0.12, 3);
  },
  slate(g, S, r) {
    const h = S / 10, w = S / 8;
    for (let y = 0, row = 0; y < S; y += h, row++) for (let x = (row % 2) * -w / 2; x < S; x += w) {
      g.fillStyle = rgb(...vary([98, 104, 116], 0.14)(r)); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(10,12,18,0.6)'; g.fillRect(x, y, 1.2, h); g.fillRect(x, y + h - 2, w, 2);
    }
  },
  lead(g, S, r) {
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,10,${r() * 0.05})`; g.fillRect(r() * S, r() * S, 10 + r() * 50, 10 + r() * 50); }
    for (let x = 0; x < S; x += S / 4) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, 0, 3, S); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 3, 0, 3, S); }
    for (let y = 0; y < S; y += S / 2) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y, S, 2.5); }
  },
  frame(g, S, r) {
    for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? `rgba(60,50,30,${r() * 0.07})` : `rgba(255,250,230,${r() * 0.07})`; g.fillRect(r() * S, r() * S, 4 + r() * 30, 4 + r() * 30); }
    const T = (x, y, w, h) => { g.fillStyle = shade([62, 46, 34], 0.85 + r() * 0.3); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + h - 1.5, w, 1.5); g.fillRect(x + w - 1.5, y, 1.5, h); }, t = S / 20;
    g.lineWidth = t * 0.8; g.strokeStyle = '#3e2e22';
    for (const [a, b] of [[0, 0], [2, 1]]) { g.beginPath(); g.moveTo((a * S) / 4 + t / 2, b ? S / 2 : S); g.lineTo(((a + 1) * S) / 4 + t / 2, b ? 0 : S / 2); g.stroke(); }
    for (let x = 0; x < S; x += S / 4) T(x, 0, t, S);
    T(0, 0, S, t * 0.9); T(0, S / 2 - t / 2, S, t); T(0, S - t * 0.5, S, t * 0.5);
  },
  daub(g, S, r) { for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? `rgba(70,55,30,${r() * 0.08})` : `rgba(255,245,220,${r() * 0.08})`; g.fillRect(r() * S, r() * S, 3 + r() * 36, 3 + r() * 26); } speckle(g, S, r, 3000, 0.02, 0.08); },
  plank(g, S, r) {
    const w = S / 8;
    for (let x = 0; x < S; x += w) { g.fillStyle = shade([128, 98, 66], 0.75 + r() * 0.45); g.fillRect(x, 0, w, S); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(30,18,8,${0.05 + r() * 0.12})`; g.fillRect(x + r() * w, 0, 1, S); } g.fillStyle = 'rgba(14,8,4,0.8)'; g.fillRect(x, 0, 2, S); }
  },
  cobble(g, S, r) {
    const n = 14, d = S / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + (j % 2) * 0.5) * d, y = j * d; for (const ox of [0, -S]) { g.fillStyle = rgb(...vary([150, 144, 134], 0.1)(r)); g.beginPath(); g.ellipse(x + ox + d / 2, y + d / 2, d * 0.46, d * 0.42, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.ellipse(x + ox + d * 0.42, y + d * 0.4, d * 0.22, d * 0.18, 0, 0, 7); g.fill(); } }
  },
  earth(g, S, r) { for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? `rgba(40,30,16,${r() * 0.09})` : `rgba(255,240,200,${r() * 0.09})`; g.fillRect(r() * S, r() * S, 3 + r() * 40, 3 + r() * 14); } speckle(g, S, r, 5000, 0.03, 0.1, 3); },
  // open-field strips (selions) across u, each a little different and ridged along v; the crop colour comes from the vertices
  strips(g, S, r) {
    const n = 8, w = S / n;
    for (let i = 0; i < n; i++) { const k = 0.78 + r() * 0.3; g.fillStyle = rgb(255 * k, 255 * k * (0.94 + r() * 0.08), 255 * k * (0.85 + r() * 0.2)); g.fillRect(i * w, 0, w, S); for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.07 * (x % 8 ? 1 : 0)})`; g.fillRect(i * w + x, 0, 2, S); } g.fillStyle = 'rgba(40,60,20,0.55)'; g.fillRect(i * w, 0, 3, S); }
    speckle(g, S, r, 6000, 0.02, 0.07, 3);
  },
  // stained glass: left half a lancet of medallions, right half a rose
  glass(g, S, r) {
    const H = S / 2, jewel = () => ['#1c3fb0', '#1c3fb0', '#b0201c', '#d8a628', '#2a7a3a', '#6a2a8a', '#3a68d8'][Math.floor(r() * 7)];
    g.fillStyle = '#0a0a10'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 16) for (let x = 6; x < H - 6; x += 16) { g.fillStyle = r() < 0.6 ? '#1a3aa8' : jewel(); g.fillRect(x + 1, y + 1, 14, 14); }
    g.fillStyle = '#9a1c1a'; g.fillRect(0, 0, 6, S); g.fillRect(H - 6, 0, 6, S);
    for (let y = S / 8; y < S; y += S / 4) { g.fillStyle = '#0a0a10'; g.beginPath(); g.arc(H / 2, y, 52, 0, 7); g.fill(); for (let k = 0; k < 8; k++) { g.fillStyle = jewel(); g.beginPath(); g.moveTo(H / 2, y); g.arc(H / 2, y, 48, (k / 8) * 6.283 + 0.04, ((k + 1) / 8) * 6.283 - 0.04); g.fill(); } g.fillStyle = '#e8c860'; g.beginPath(); g.arc(H / 2, y, 14, 0, 7); g.fill(); }
    const cx = H + H / 2, cy = S / 2;
    for (const [n, r0, r1] of [[24, 180, 236], [12, 96, 172], [12, 40, 90]]) for (let k = 0; k < n; k++) { g.fillStyle = jewel(); g.beginPath(); g.arc(cx, cy, r1, (k / n) * 6.283 + 0.03, ((k + 1) / n) * 6.283 - 0.03); g.arc(cx, cy, r0, ((k + 1) / n) * 6.283 - 0.03, (k / n) * 6.283 + 0.03, true); g.fill(); }
    g.fillStyle = '#e8c860'; g.beginPath(); g.arc(cx, cy, 32, 0, 7); g.fill();
  },
  // small leaded or sashed panes; `lit` ones glow
  pane(g, S, r) { g.fillStyle = '#20262c'; g.fillRect(0, 0, S, S); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = shade([52, 62, 72], 0.7 + r() * 0.6); g.fillRect(i * S / 4 + 2, j * S / 4 + 2, S / 4 - 4, S / 4 - 4); } },
  lit(g, S, r) { g.fillStyle = '#2a1c10'; g.fillRect(0, 0, S, S); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = shade([255, 200, 120], 0.7 + r() * 0.3); g.fillRect(i * S / 4 + 2, j * S / 4 + 2, S / 4 - 4, S / 4 - 4); } },
  wheat(g, S, r) {
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 170; i++) { const x = r() * S, top = S * (0.08 + r() * 0.25), lean = (r() - 0.5) * 16; g.strokeStyle = shade([200, 168, 88], 0.7 + r() * 0.4); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, S); g.quadraticCurveTo(x, S / 2, x + lean, top); g.stroke(); g.fillStyle = shade([222, 186, 96], 0.8 + r() * 0.3); g.beginPath(); g.ellipse(x + lean, top, 1.7, 9, lean * 0.03, 0, 7); g.fill(); }
  },
  smoke(g, S) { g.clearRect(0, 0, S, S); const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); },
};
const BASE = { stone: '#cec4ac', rubble: '#5e5a50', brick: '#b8ab98', thatch: '#8a7040', tile: '#b05c3a', slate: '#626874', lead: '#8a9096', frame: '#dcd0b4', daub: '#d4c4a0', plank: '#80623e', cobble: '#7a756b', earth: '#a08660', strips: '#ffffff', glass: '#000', pane: '#000', lit: '#000', wheat: 'rgba(0,0,0,0)', smoke: 'rgba(0,0,0,0)' };
/** How many metres one repeat of each texture covers. */
export const TILE = { stone: 3, rubble: 3, brick: 1.2, thatch: 2.4, tile: 2.6, slate: 2.6, lead: 3, frame: 3, daub: 2.5, plank: 2, cobble: 1.8, earth: 5, strips: 44, glass: 1, pane: 0.9, lit: 0.9 };
const SIZE = { glass: 512, strips: 512, pane: 64, lit: 64, smoke: 64 };
const texCache = {};
export function texture(name) {
  if (texCache[name]) return texCache[name];
  const S = SIZE[name] || 256, [c, g] = canvas(S, BASE[name]); DRAW[name](g, S, rng(name.length * 77 + name.charCodeAt(0)));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return (texCache[name] = t);
}
/** The year on screen: geometry carries the span of years it stands for (aSpan) and is drawn only within it. */
export const YEAR = { value: 0 };
function chain(m, key, fn) { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, rd) => { if (prev) prev(sh, rd); fn(sh); }; m.customProgramCacheKey = () => key; return m; }
const spanCode = (sh) => { sh.uniforms.uYear = YEAR; sh.vertexShader = 'attribute vec2 aSpan; uniform float uYear;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n if (uYear < aSpan.x || uYear >= aSpan.y) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);'); };
export const spanned = (m, key = 'span') => chain(m, key, spanCode);
let DEPTH;
const depthMat = () => DEPTH || (DEPTH = spanned(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'span-depth'));
let MATS;
/** One material per texture, shared by every place built with this kit. */
export function materials() {
  if (MATS) return MATS;
  const M = {}, std = (name, o = {}) => (M[name] = new THREE.MeshStandardMaterial({ map: texture(name), vertexColors: true, roughness: 0.92, side: THREE.DoubleSide, ...o }));
  for (const n of ['stone', 'rubble', 'brick', 'tile', 'slate', 'frame', 'thatch']) std(n, { bumpMap: texture(n), bumpScale: 1.5 });
  for (const n of ['daub', 'plank', 'cobble', 'earth', 'strips']) std(n);
  std('lead', { roughness: 0.6, metalness: 0.35 });
  std('glass', { roughness: 0.3, emissive: 0xffffff, emissiveMap: texture('glass'), emissiveIntensity: 0.55 });
  std('pane', { roughness: 0.25, metalness: 0.3 });
  std('lit', { emissive: 0xffffff, emissiveMap: texture('lit'), emissiveIntensity: 1.3 });
  for (const n in M) spanned(M[n], 'span-' + n);
  for (const n of ['earth', 'strips', 'cobble']) { M[n].polygonOffset = true; M[n].polygonOffsetFactor = -2; M[n].polygonOffsetUnits = -2; }
  return (MATS = M);
}
/** Make a material (and its shadow) vanish above the world height in `uniform.value`: a building going up. */
export function clipped(mat, uniform, vehicle) {
  const inject = (m, key) => chain(spanned(m), key, (sh) => {
    sh.uniforms.uClipY = uniform;
    sh.vertexShader = 'varying float vClipY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vClipY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'varying float vClipY; uniform float uClipY;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (vClipY > uClipY) discard;');
  });
  const plain = () => { const c = mat.clone(); c.onBeforeCompile = () => {}; return c; };   // (a clone must not inherit the span code twice)
  const m = inject(vehicle ? vehicleMat({ side: THREE.DoubleSide }) : plain(),'clip-' + (vehicle ? 'veh' : mat.map ? mat.map.uuid : '')); m.userData.depth = inject(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'clip-depth');
  return m;
}

// =====================================================================================
// Openings
// =====================================================================================
/** Outline of an opening { x (centre), y (sill), w, h, arch: 'flat' | 'round' | 'point' | 'circle' } as [[x, y] …]. */
export function outline(o) {
  const { x, y, w, h } = o, P = [];
  if (o.arch === 'circle') { for (let k = 0; k < 20; k++) P.push([x + Math.cos((k / 20) * 6.2832) * w / 2, y + h / 2 + Math.sin((k / 20) * 6.2832) * w / 2]); return P; }
  P.push([x - w / 2, y], [x + w / 2, y]);
  if (o.arch === 'round') { const ys = y + h - w / 2; for (let k = 0; k <= 8; k++) P.push([x + Math.cos((k / 8) * Math.PI) * w / 2, ys + Math.sin((k / 8) * Math.PI) * w / 2]); }
  else if (o.arch === 'point') {
    const rise = Math.min(h * 0.6, w * (o.sharp || 0.9)), ys = y + h - rise, R = (w * w / 4 + rise * rise) / w, a1 = Math.atan2(rise, R - w / 2);
    for (let k = 0; k <= 5; k++) { const a = (k / 5) * a1; P.push([x + w / 2 - R + Math.cos(a) * R, ys + Math.sin(a) * R]); }
    for (let k = 4; k >= 0; k--) { const a = (k / 5) * a1; P.push([x - w / 2 + R - Math.cos(a) * R, ys + Math.sin(a) * R]); }
  } else P.push([x + w / 2, y + h], [x - w / 2, y + h]);
  return P;
}
const shapeOf = (P) => new THREE.Shape(P.map((p) => new THREE.Vector2(p[0], p[1])));

// =====================================================================================
// Kit: textured geometry gathered by material and by the span of years it stands for
// =====================================================================================
export class Kit {
  constructor() { this.B = new Map(); this.M = new THREE.Matrix4(); this.stack = []; this.span = [-Infinity, Infinity]; this.tag = ''; this.solids = []; }
  /** Everything added inside fn stands from year a to year b. */
  during(a, b, fn) { const s = this.span, t = this.tag; this.span = [a, b]; fn(); this.span = s; this.tag = t; }
  bucket(mat) { const k = mat + '|' + this.tag; let b = this.B.get(k); if (!b) this.B.set(k, b = { mat, tag: this.tag, p: [], n: [], uv: [], c: [], sp: [] }); b.s0 = Math.max(-1e9, this.span[0]); b.s1 = Math.min(1e9, this.span[1]); return b; }
  /** Run fn with the local frame moved to (x, y, z) and turned ry about the vertical (local +x then points along (cos ry, −sin ry)). */
  at(x, y, z, ry, fn) { this.stack.push(this.M.clone()); this.M.multiply(mat4(x, y, z, ry)); fn(); this.M.copy(this.stack.pop()); }
  /** A frame whose +x runs along the ground from (x0, z0) to (x1, z1) with +z pointing out of the wall; fn(length). */
  along(x0, z0, x1, z1, y, fn) { const dx = x1 - x0, dz = z1 - z0; this.at(x0, y, z0, Math.atan2(-dz, dx), () => fn(Math.hypot(dx, dz))); }
  /** A flat convex polygon; the texture runs along its first edge and up towards its third point. */
  poly(mat, P, col = WHITE, uo = 0, vo = 0) {
    const b = this.bucket(mat), tile = TILE[mat] || 1, c = lin(col), Q = P.map((p) => _v.set(p[0], p[1], p[2]).applyMatrix4(this.M).toArray());
    _a.set(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1], Q[1][2] - Q[0][2]).normalize(); _b.set(Q[2][0] - Q[0][0], Q[2][1] - Q[0][1], Q[2][2] - Q[0][2]);
    _n.crossVectors(_a, _b).normalize(); _b.crossVectors(_n, _a);
    const uv = Q.map((q) => [uo + ((q[0] - Q[0][0]) * _a.x + (q[1] - Q[0][1]) * _a.y + (q[2] - Q[0][2]) * _a.z) / tile, vo + ((q[0] - Q[0][0]) * _b.x + (q[1] - Q[0][1]) * _b.y + (q[2] - Q[0][2]) * _b.z) / tile]);
    for (let i = 1; i < Q.length - 1; i++) for (const k of [0, i, i + 1]) { b.p.push(Q[k][0], Q[k][1], Q[k][2]); b.n.push(_n.x, _n.y, _n.z); b.uv.push(uv[k][0], uv[k][1]); b.c.push(c[0], c[1], c[2]); b.sp.push(b.s0, b.s1); }
    return this;
  }
  /** Any three.js geometry, placed by matrix m in the local frame; its own UVs are multiplied by (su, sv). */
  add(mat, geo, m, col = WHITE, su = 1, sv = su) {
    const g = geo.index ? geo.toNonIndexed() : geo, b = this.bucket(mat), c = lin(col), P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const mm = m ? _m.multiplyMatrices(this.M, m) : _m.copy(this.M); _n3.getNormalMatrix(mm);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(mm); b.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); b.n.push(_v.x, _v.y, _v.z);
      b.uv.push(U ? U.getX(i) * su : 0, U ? U.getY(i) * sv : 0); b.c.push(c[0], c[1], c[2]); b.sp.push(b.s0, b.s1);
    }
    return this;
  }
  /** A box between two corners with the texture at its true scale; `skip` names faces to leave out ('b' bottom, 't' top, n s e w). */
  box(mat, x0, y0, z0, x1, y1, z1, col, skip = 'b') {
    const F = { s: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], n: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], e: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], w: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], t: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], b: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] };
    for (const k in F) if (!skip.includes(k)) this.poly(mat, F[k], col);
    return this;
  }
  /** A round or many-sided shaft, tower, cone or spire standing at (x, z) from y0 to y1. */
  cyl(mat, x, z, y0, y1, r0, r1, seg = 12, col, { open = true, a0 = 0, arc = Math.PI * 2 } = {}) {
    const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open, a0, arc), tile = TILE[mat] || 1;
    return this.add(mat, g, mat4(x, (y0 + y1) / 2, z), col, (Math.max(r0, r1) * arc) / tile, Math.hypot(y1 - y0, r0 - r1) / tile);
  }
  /** A pitched roof over the rectangle (ridge along `axis`), with its gable ends in `wall`. h: height of the ridge above y. */
  gable(roof, wall, x0, z0, x1, z1, y, h, { axis = 'x', over = 0.35, col, wcol, hip = 0 } = {}) {
    const P = (a, b, c) => (axis === 'x' ? [a, b, c] : [c, b, a]), [a0, a1, c0, c1] = axis === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1], cm = (c0 + c1) / 2, drop = (over * h) / ((c1 - c0) / 2);
    const r0 = a0 - over + hip, r1 = a1 + over - hip;
    this.poly(roof, [P(a0 - over, y - drop, c1 + over), P(a1 + over, y - drop, c1 + over), P(r1, y + h, cm), P(r0, y + h, cm)], col);
    this.poly(roof, [P(a1 + over, y - drop, c0 - over), P(a0 - over, y - drop, c0 - over), P(r0, y + h, cm), P(r1, y + h, cm)], col);
    if (hip) { this.poly(roof, [P(a0 - over, y - drop, c0 - over), P(a0 - over, y - drop, c1 + over), P(r0, y + h, cm)], col); this.poly(roof, [P(a1 + over, y - drop, c1 + over), P(a1 + over, y - drop, c0 - over), P(r1, y + h, cm)], col); }
    else if (wall) { this.poly(wall, [P(a0, y, c0), P(a0, y, c1), P(a0, y + h, cm)], wcol); this.poly(wall, [P(a1, y, c1), P(a1, y, c0), P(a1, y + h, cm)], wcol); }
    return this;
  }
  /**
   * A wall panel standing in the local xy plane (x 0..w, y 0..h), `depth` thick towards +z, pierced by `holes`
   * ({ x, y, w, h, arch, fill: [material, colour, 'fit' | 'tile', uvRect] } — the filling sits back in the reveal).
   */
  panel(mat, w, h, holes = [], depth = 0.3, col, x0 = 0) {
    const s = shapeOf([[x0, 0], [w, 0], [w, h], [x0, h]]), tile = TILE[mat] || 1;
    for (const o of holes) s.holes.push(new THREE.Path(outline(o).map((p) => new THREE.Vector2(p[0], p[1]))));
    this.add(mat, new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 }), null, col, 1 / tile);
    for (const o of holes) if (o.fill) {
      const [fm, fc, mode = 'tile', rect = [0, 0, 1, 1]] = o.fill, g = new THREE.ShapeGeometry(shapeOf(outline(o))), U = g.attributes.uv, t = TILE[fm] || 1;
      for (let i = 0; i < U.count; i++) {
        if (mode === 'fit') U.setXY(i, rect[0] + ((U.getX(i) - (o.x - o.w / 2)) / o.w) * (rect[2] - rect[0]), rect[1] + ((U.getY(i) - o.y) / o.h) * (rect[3] - rect[1]));
        else U.setXY(i, (U.getX(i) - (o.x - o.w / 2)) / t, (U.getY(i) - o.y) / t);
      }
      this.add(fm, g, mat4(0, 0, depth * (o.back ?? 0.35)), fc);
    }
    return this;
  }
  /** Register a rectangle (local x0..x1, z0..z1) the visitor cannot walk through, for as long as the current span lasts. */
  solid(x0, z0, x1, z1) {
    const e = this.M.elements, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.solids.push({ x: e[0] * cx + e[8] * cz + e[12], z: e[2] * cx + e[10] * cz + e[14], hx: Math.abs(x1 - x0) / 2, hz: Math.abs(z1 - z0) / 2, c: e[0], s: e[2], y0: this.span[0], y1: this.span[1] });
    return this;
  }
  /** Turn everything gathered into meshes under `group`. swap: { tag: (material) => material } gives a tag its own materials. */
  build(group, swap = {}) {
    const M = materials(), made = {}; this.meshes = [];
    for (const b of this.B.values()) {
      if (!b.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setAttribute('aSpan', new THREE.Float32BufferAttribute(b.sp, 2));
      const key = b.tag + '|' + b.mat, mat = b.tag && swap[b.tag] ? made[key] || (made[key] = swap[b.tag](M[b.mat])) : M[b.mat], mesh = new THREE.Mesh(g, mat);
      const flat = b.mat === 'earth' || b.mat === 'strips' || b.mat === 'cobble';
      mesh.castShadow = !flat; mesh.receiveShadow = true; mesh.customDepthMaterial = mat.userData.depth || depthMat();
      group.add(mesh); this.meshes.push({ mesh });
    }
    this.B.clear(); return this;
  }
  get tris() { let n = 0; for (const m of this.meshes) n += m.mesh.geometry.attributes.position.count / 3; return n; }
  update(year) { YEAR.value = year; }
  /** collide(pos, year): push the visitor out of whatever stands in that year. */
  collider(extra) {
    const S = this.solids, R = 0.45;
    return (pos, year) => {
      for (let i = 0; i < S.length; i++) {
        const b = S[i]; if (year < b.y0 || year >= b.y1) continue;
        const dx = pos.x - b.x, dz = pos.z - b.z; if (Math.abs(dx) + Math.abs(dz) > (b.hx + b.hz) * 1.5 + 2) continue;
        const lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c, px = b.hx + R - Math.abs(lx), pz = b.hz + R - Math.abs(lz);
        if (px <= 0 || pz <= 0) continue;
        let ox = 0, oz = 0; if (px < pz) ox = Math.sign(lx) * px; else oz = Math.sign(lz) * pz;
        pos.x += ox * b.c - oz * b.s; pos.z += ox * b.s + oz * b.c;
      }
      if (extra) extra(pos, year);
    };
  }
}

// =====================================================================================
// Props: untextured things (carts, cranes, looms, engines) whose finish is set per vertex, one draw call per span of years
// =====================================================================================
/** Copy a bag of triangles into another, placed by matrix m. */
export function append(dst, src, m) {
  _n3.getNormalMatrix(m);
  for (let i = 0; i < src.p.length; i += 3) {
    _v.set(src.p[i], src.p[i + 1], src.p[i + 2]).applyMatrix4(m); dst.p.push(_v.x, _v.y, _v.z);
    _v.set(src.n[i], src.n[i + 1], src.n[i + 2]).applyMatrix3(_n3).normalize(); dst.n.push(_v.x, _v.y, _v.z); dst.w.push(0, 0, 0);
  }
  for (let i = 0; i < src.c.length; i++) dst.c.push(src.c[i]);
  for (let i = 0; i < src.s.length; i++) dst.s.push(src.s[i]);
  return dst;
}
export class Props {
  constructor() { this.bags = new Map(); this.mat = spanned(vehicleMat({ side: THREE.DoubleSide }), 'veh-span'); }
  bag(a = -Infinity, b = Infinity, tag = '') { const k = a + '|' + b + '|' + tag; if (!this.bags.has(k)) this.bags.set(k, { bag: new Bag(), y0: a, y1: b, tag }); return this.bags.get(k).bag; }
  /** Place a ready-made bag at (x, y, z) turned ry, for the years a..b. */
  put(src, x, y, z, ry = 0, a, b, tag) { append(this.bag(a, b, tag), src, mat4(x, y, z, ry)); return this; }
  /** One mesh for everything (and one more per tag), each vertex knowing its years. */
  build(group, swap = {}) {
    this.meshes = []; const tags = new Map();
    for (const e of this.bags.values()) { if (!e.bag.p.length) continue; if (!tags.has(e.tag)) tags.set(e.tag, { all: new Bag(), sp: [] }); const t = tags.get(e.tag); for (const k of ['p', 'n', 'c', 's', 'w']) for (let i = 0; i < e.bag[k].length; i++) t.all[k].push(e.bag[k][i]); for (let i = 0; i < e.bag.p.length / 3; i++) t.sp.push(Math.max(-1e9, e.y0), Math.min(1e9, e.y1)); }
    for (const [tag, t] of tags) {
      const mat = tag && swap[tag] ? swap[tag](this.mat) : this.mat, geo = t.all.geo(); geo.setAttribute('aSpan', new THREE.Float32BufferAttribute(t.sp, 2));
      const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.customDepthMaterial = mat.userData.depth || depthMat();
      group.add(mesh); this.meshes.push({ mesh });
    }
    return this;
  }
  /** A loose mesh (something that moves) drawn with the props' material: it needs the span attribute too. */
  loose(geo, a = -1e9, b = 1e9) { const n = geo.attributes.position.count, sp = new Float32Array(n * 2); for (let i = 0; i < n; i++) { sp[i * 2] = a; sp[i * 2 + 1] = b; } geo.setAttribute('aSpan', new THREE.BufferAttribute(sp, 2)); return geo; }
  update() {}
}

// =====================================================================================
// Paths: where something that walks with an actor (an ox team, a barrow, a mount) is at time t
// =====================================================================================
/** The same walk the actors make along `pts` ([[x, z] …], a loop if it ends where it began). */
export function pathOf(pts) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], loop = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-3;
  return { pts, cum, L, loop, route: loop ? L : 2 * L };
}
function point(P, d, out) {
  const n = P.cum.length - 1; d = ((d % P.route) + P.route) % P.route; if (d > P.L) d = 2 * P.L - d;
  let i = 0; while (i < n - 1 && P.cum[i + 1] < d) i++;
  const t = (d - P.cum[i]) / (P.cum[i + 1] - P.cum[i] || 1), p = P.pts[i], q = P.pts[i + 1];
  out[0] = p[0] + (q[0] - p[0]) * t; out[1] = p[1] + (q[1] - p[1]) * t; return out;
}
const _p0 = [0, 0], _p1 = [0, 0], _p2 = [0, 0];
/** Where a walker `d` metres along path P is: out = { x, z, rot } (rot as the actors use it: 0 faces +x). */
export function where(P, d, out) {
  const back = !P.loop && ((d % P.route) + P.route) % P.route > P.L ? -1 : 1;
  point(P, d, _p0); point(P, d - 0.3 * back, _p1); point(P, d + 0.3 * back, _p2);
  out.x = _p0[0]; out.z = _p0[1]; out.rot = Math.atan2(_p1[1] - _p2[1], _p2[0] - _p1[0]); return out;
}
/** A rectangle walked round and round: [[x, z] …] closed. */
export const loop = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];

/** Instances of one geometry that each follow a path in step with an actor: items [{ path, speed, phase, ahead?, side?, y?, u0?, u1? }]. */
export class Followers {
  constructor(world, geo, mat, items) {
    this.world = world; this.items = items.map((it) => ({ ahead: 0, side: 0, y: 0, ...it, u0: it.u0 ?? -Infinity, u1: it.u1 ?? Infinity, P: pathOf(it.path) }));
    this.mesh = new THREE.InstancedMesh(geo, mat, items.length); this.mesh.frustumCulled = false; this.mesh.castShadow = this.mesh.receiveShadow = true; this.o = { x: 0, z: 0, rot: 0 };
  }
  update(u, t) {
    let k = 0; const o = this.o, UP = _a.set(0, 1, 0);
    for (const it of this.items) {
      if (u < it.u0 || u >= it.u1) continue;
      where(it.P, it.phase * it.P.route + it.speed * t + it.ahead, o);
      const c = Math.cos(o.rot), s = Math.sin(o.rot), x = o.x + s * it.side, z = o.z + c * it.side;
      _m.compose(_v.set(x, this.world.heightAt(x, z) + it.y, z), _q.setFromAxisAngle(UP, o.rot), _b.set(1, 1, 1)); this.mesh.setMatrixAt(k++, _m);
    }
    this.mesh.count = k; this.mesh.visible = k > 0; this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Smoke: soft puffs that rise from points and drift downwind, all in one draw call. sources: [{ x, y, z, size, from?, to?, dark? }] (years). */
export function smoke(sources, { per = 9, rise = 5, wind = [3.2, 0.9], life = 14, grey = 0.16 } = {}) {
  const n = sources.length * per, g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
  g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  const org = new Float32Array(n * 4), par = new Float32Array(n * 4), r = rng(5);
  sources.forEach((s, i) => { for (let k = 0; k < per; k++) { const j = (i * per + k) * 4; org.set([s.x, s.y, s.z, s.size || 3], j); par.set([(k + r()) / per, s.from ?? -1e9, s.to ?? 1e9, s.dark ?? 1], j); } });
  g.setAttribute('aOrg', new THREE.InstancedBufferAttribute(org, 4)); g.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4)); g.instanceCount = n;
  const U = { uT: { value: 0 }, uYear: { value: 0 }, uCol: { value: new THREE.Color(grey, grey, grey) }, uFog: { value: new THREE.Color() }, uFogD: { value: 0 }, map: { value: texture('smoke') }, uWind: { value: new THREE.Vector3(wind[0], rise, wind[1]) }, uLife: { value: life }, uAmount: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aOrg, aPar; uniform float uT, uYear, uLife, uAmount; uniform vec3 uWind; varying vec2 vUv; varying float vA, vDark, vDist;
      void main(){ float age = fract(aPar.x + uT / uLife), on = step(aPar.y, uYear) * step(uYear, aPar.z);
        vec3 c = aOrg.xyz + uWind * vec3(age * age * 0.6 + age * 0.4, sqrt(age), age * age * 0.6 + age * 0.4) * uLife * vec3(1.0, 0.55, 1.0);
        c.xz += vec2(sin(aPar.x * 40.0 + uT * 0.3), cos(aPar.x * 31.0 + uT * 0.23)) * age * aOrg.w * 0.8;
        float size = aOrg.w * (0.7 + age * 5.0) * on;
        vec4 mv = viewMatrix * modelMatrix * vec4(c, 1.0); mv.xy += position.xy * size;
        vUv = uv; vA = smoothstep(0.0, 0.06, age) * (1.0 - age) * (1.0 - age) * uAmount; vDark = aPar.w; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uCol, uFog; uniform float uFogD; varying vec2 vUv; varying float vA, vDark, vDist;
      void main(){ float a = texture2D(map, vUv).a * vA; if (a < 0.004) discard; float f = 1.0 - exp(-uFogD * uFogD * vDist * vDist);
        gl_FragColor = vec4(mix(mix(vec3(0.75), uCol, vDark), uFog, f * 0.8), a * 0.85);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 5;
  return { mesh, U, update(year, t, scene) { U.uT.value = t; U.uYear.value = year; if (scene && scene.fog) { U.uFog.value.copy(scene.fog.color); U.uFogD.value = scene.fog.density; } } };
}

/**
 * Trees that stand still: one instanced mesh per kind and per wedge of the compass about (cx, cz), so that whatever is
 * behind the visitor is not drawn. parts: [{ geo, mat, tint? }] as flora's kinds; items: [{ x, z, s, rot, tint }].
 */
export function grove(world, parts, items, { wedges = 5, cx = 0, cz = 0 } = {}) {
  const out = [], by = Array.from({ length: wedges }, () => []), UP = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  for (const it of items) by[Math.floor(((Math.atan2(it.z - cz, it.x - cx) + Math.PI) / (2 * Math.PI)) * wedges) % wedges].push(it);
  for (const list of by) {
    if (!list.length) continue; let first = null;
    for (const { geo, mat, tint = true, cast = true } of parts) {
      const m = new THREE.InstancedMesh(geo, mat, list.length); m.castShadow = false; m.receiveShadow = true;
      list.forEach((it, i) => { if (!first) m.setMatrixAt(i, _m.compose(_v.set(it.x, world.heightAt(it.x, it.z) - 0.1, it.z), _q.setFromAxisAngle(UP, it.rot), _b.set(it.s, it.s, it.s))); m.setColorAt(i, tint ? col.setRGB(it.tint[0], it.tint[1], it.tint[2]) : col.setRGB(1, 1, 1)); });
      if (first) m.instanceMatrix = first.instanceMatrix; else first = m;
      m.computeBoundingSphere(); out.push(m);
    }
  }
  return out;
}
