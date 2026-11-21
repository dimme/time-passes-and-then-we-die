// Hand-made landmarks: true heights, plans scaled to this small Manhattan's 80 × 48 m blocks.
import * as THREE from 'three';
import { Kit, M, facadeOf, lin } from './city-kit.js';
import { around, stage, piers, flatRoof, decoBase, facets, cap, mast, lobby, mul, LAMP, OFFICE } from './city-types.js';

const PI = Math.PI, TAR = 0x2c2c2e, STEEL = 0xc6cace;

/** Empire State Building, 1931: 381 m to the top of the mooring mast, 443 m with the antenna. */
export function empireState(r) {
  const k = new Kit(r), F = facadeOf('deco'), tint = [0.9, 0.9, 0.87], wc = mul(F.wall, tint), pc = mul(F.pier, tint), g = 2 * F.ch;
  // [width, depth, top]: the five-storey base, the setbacks at the 21st, 25th and 30th floors, the shaft and its shoulders at the 72nd and 81st
  const T = [[62, 40, 21], [54, 34, 80], [48, 29, 96], [43, 26, 113], [38, 23, 276], [33, 20, 300], [28, 18, 320]];
  let y = g;
  T.forEach(([w, d, top], ti) => {
    stage(k, F, w, d, 0, 0, y, top, tint, (f, fw, i) => {
      piers(k, f, fw, top - y, pc, 0.5, 0.26, 1.2, 2);
      if (!ti) k.at(0, -g, 0, 0, () => decoBase(k, f, fw, g, lin(0xcfc6b0), lin(0x34322e), STEEL, i % 2 === 0));
    });
    flatRoof(k, w, d, 0, top, 0, wc, 1.1, TAR, pc); y = top;
  });
  // the centre of every face stands forward of the corners all the way up the shaft
  stage(k, F, 17.6, 26, 0, 0, 113, 292, tint, (f, fw, i) => { if (i % 2 === 0) piers(k, f, fw, 179, pc, 0.5, 0.26, 2, 1); });
  stage(k, F, 41, 11, 0, 0, 113, 284, tint, (f, fw, i) => { if (i % 2) piers(k, f, fw, 171, pc, 0.5, 0.26, 2, 1); });
  // the mooring mast: a stepped base, a glass and steel shaft between four winged buttresses, a conical cap
  stage(k, F, 17.6, 13.2, 0, 0, 320, 334, tint, (f, fw) => piers(k, f, fw, 14, pc, 0.5, 0.26, 1.5, 2)); flatRoof(k, 17.6, 13.2, 0, 334, 0, wc, 1, TAR, pc);
  k.cyl(M.metal, STEEL, 4.6, 5, 30, 0, 334, 0, 16); k.cyl(M.metal, STEEL, 5.6, 5.6, 1, 0, 363.5, 0, 16); k.cyl(M.lit, LAMP, 4.4, 4.4, 2.6, 0, 364.5, 0, 16, true);
  k.cyl(M.metal, STEEL, 3.4, 4.7, 5.5, 0, 367, 0, 16); k.cyl(M.metal, STEEL, 0.9, 3.4, 8.5, 0, 372.5, 0, 16);
  for (let i = 0; i < 4; i++) k.at(0, 334, 0, (i * PI) / 2, () => {
    k.box(M.metal, STEEL, 1.3, 27, 2.6, 0, 0, 5.9, 'b'); k.box(M.metal, STEEL, 1.1, 19, 2, 0, 0, 7.9, 'b'); k.box(M.metal, STEEL, 0.9, 11, 1.6, 0, 0, 9.4, 'b');
    k.at(0, 0, 0, PI / 4, () => k.quad(M.lit, LAMP, [-1.1, 1.5, 5.02], [1.1, 1.5, 5.02], [1, 28, 4.72], [-1, 28, 4.72]));
  });
  k.cyl(M.metal, STEEL, 0.5, 1, 22, 0, 381, 0, 8); k.cyl(M.metal, STEEL, 0.1, 0.45, 40, 0, 403, 0, 6);
  for (const a of [386, 394, 403, 415]) k.cyl(M.metal, STEEL, 1.5, 1.5, 0.5, 0, a, 0, 8);
  k.box(M.glow, 0xff2a1a, 0.6, 0.6, 0.6, 0, 443, 0);
  return { obj: k.build(), fw: 62, fd: 40 };
}

/** Chrysler Building, 1930: 282 m of brick under seven tiers of stainless-steel sunbursts, 319 m to the tip of the needle. */
export function chrysler(r) {
  const k = new Kit(r), F = facadeOf('deco'), tint = [0.94, 0.95, 0.98], wc = mul(F.wall, tint), pc = mul(F.pier, tint), g = 2 * F.ch, a0 = 11.2, yc = 238;
  const T = [[38, 36, 62], [33, 31, 98], [28, 27, 120], [a0 * 2, a0 * 2, yc]];
  let y = g;
  T.forEach(([w, d, top], ti) => {
    stage(k, F, w, d, 0, 0, y, top, tint, (f, fw, i) => {
      piers(k, f, fw, top - y, pc, 0.5, 0.26, 1.2, 2);
      if (!ti) k.at(0, -g, 0, 0, () => decoBase(k, f, fw, g, lin(0xbfb8a8), lin(0x1c1c1e), STEEL, i === 0));
      if (ti === 3) for (const q of [0.3, 0.55, 0.8]) k.box(M.trim, 0x4a4a4e, fw + 0.2, 3.6, 0.1, 0, (top - y) * q, 0.04, 'k');      // bands of dark brick
    });
    flatRoof(k, w, d, 0, top, 0, wc, 1.1, TAR, pc); y = top;
  });
  for (let i = 0; i < 4; i++) k.at(0, 0, 0, PI / 4 + (i * PI) / 2, () => {
    // winged radiator caps at the 31st floor, eagles at the 61st
    const c = 19.2; k.box(M.metal, STEEL, 2.2, 3.4, 2.2, 0, 120, c - 0.6); k.cyl(M.metal, STEEL, 0.3, 1.1, 2, 0, 123.4, c - 0.6, 8);
    for (const s of [-1, 1]) k.sheet(M.metal, STEEL, [s * 0.8, 121, c], [s * 4.6, 122.6, c - 2.2], [s * 4.4, 123.6, c - 2.2], [s * 0.8, 123, c]);
    const e = a0 * Math.SQRT2 - 0.6; k.rod(M.metal, STEEL, 1.1, [0, yc - 3.2, e], [0, yc - 2, e + 3.6], 4, 1); k.geo(M.metal, STEEL, new THREE.ConeGeometry(0.75, 2.6, 6), 0, yc - 1.75, e + 4.6, PI / 2 + 0.25, 0, 0);
    for (const s of [-1, 1]) k.sheet(M.metal, STEEL, [s * 0.5, yc - 2.9, e + 1], [s * 2.2, yc - 2.2, e + 0.2], [s * 0.5, yc - 1.9, e + 2.6]);
  });
  // the crown: on every face seven arches, each set back behind and above the last, pierced with triangular windows that are lit at night
  let w = a0; y = yc; const N = 12;
  for (let t = 0; t < 7; t++) {
    const a = w * 1.15, w2 = w * 0.78, s = w2 / w, P = Array.from({ length: N + 1 }, (_, j) => [w * Math.cos((j / N) * PI), y + a * Math.sin((j / N) * PI)]);
    for (let i = 0; i < 4; i++) k.at(0, 0, 0, (i * PI) / 2, () => {
      for (let j = 0; j < N; j++) {
        k.quad(M.metal, STEEL, [0, y, w], [P[j][0], P[j][1], w], [P[j + 1][0], P[j + 1][1], w]);
        k.quad(M.metal, STEEL, [P[j][0], P[j][1], w], [P[j][0] * s, P[j][1], w2], [P[j + 1][0] * s, P[j + 1][1], w2], [P[j + 1][0], P[j + 1][1], w]);
      }
      for (let m = 0; m < 6; m++) {
        const th = ((m + 0.5) / 6) * PI, c = Math.cos(th), sn = Math.sin(th), tx = -sn * w * 0.085, ty = c * a * 0.085, z = w + 0.06;
        k.quad(M.lit, [2.2, 2, 1.7], [0.76 * w * c + tx, y + 0.76 * a * sn + ty, z], [0.76 * w * c - tx, y + 0.76 * a * sn - ty, z], [0.95 * w * c, y + 0.95 * a * sn, z]);
      }
    });
    y += a * 0.75; w = w2;
  }
  k.cyl(M.metal, STEEL, w * 0.5, w * 1.05, 5, 0, y, 0, 8); k.cyl(M.metal, STEEL, 0.05, w * 0.5, 319 - y - 5, 0, y + 5, 0, 8);
  return { obj: k.build(), fw: 38, fd: 36 };
}

/** One of the Twin Towers, 1970–2001: a 110-storey square tube of close-set aluminium columns, 417 m (north, with the mast) and 415 m (south). */
export function twinTower(r, north) {
  const k = new Kit(r), F = facadeOf('wtc'), a = 20, c = 1.5, H = north ? 417 : 415, g = 22, alu = 0xc2c6ca, n = Math.round((2 * (a - c)) / F.cw / 3);
  const pts = (s = 1) => [[-a + c, a], [a - c, a], [a, a - c], [a, -a + c], [a - c, -a], [-a + c, -a], [-a, -a + c], [-a, a - c]].map(([x, z]) => [x * s, z * s]);
  k.skin(F, [{ y: g, pts: pts() }, { y: H, pts: pts() }]); cap(k, pts(), H - 1.2, 0x5a5c5e);
  // plant floors and sky lobbies read as darker bands
  for (const y of [g, 152, 277, 399]) { const P = pts(1.004); P.forEach((p, j) => { const q = P[(j + 1) % 8]; k.quad(M.trim, 0x6e7276, [p[0], y, p[1]], [q[0], y, q[1]], [q[0], y + 7.3, q[1]], [p[0], y + 7.3, p[1]]); }); }
  // at the foot every three columns gather into one, branching like tracery over a glass lobby
  around(k, a * 2, a * 2, 0, 0, 0, (fw) => {
    const x0 = -a + c, sp = (2 * (a - c)) / n;
    k.quad(M.lit, OFFICE, [x0, 0.4, -0.7], [-x0, 0.4, -0.7], [-x0, g, -0.7], [x0, g, -0.7]); k.box(M.trim, alu, fw - 2 * c, 0.9, 0.5, 0, 7.5, -0.45, 'k'); k.box(M.trim, 0x38383a, fw, 0.4, 0.3, 0, 0, -0.5, 'kb');
    for (let q = 0; q <= n; q++) {
      const x = x0 + q * sp; k.box(M.trim, alu, 0.8, 17, 0.8, x, 0, -0.4, 'kb'); k.box(M.trim, alu, 0.45, 5, 0.6, x, 17, -0.3, 'kb');
      for (const s of [-1, 1]) if ((s < 0 && q) || (s > 0 && q < n)) k.rod(M.trim, alu, 0.42, [x + s * 0.15, 16.6, -0.3], [x + (s * sp) / 3, g, -0.3], 4, 0.6);
    }
    k.at(a - c / 2, 0, -c / 2, PI / 4, () => k.box(M.trim, alu, c * Math.SQRT2, g, 0.2, 0, 0, 0, 'kb'));
  });
  if (north) { mast(k, 0, H - 1.2, 0, 108, 2.6); for (let i = 0; i < 5; i++) k.cyl(M.trim, i % 2 ? 0xd8d8d8 : 0xb03020, 0.5 - i * 0.07, 0.6 - i * 0.07, 21, 0, H - 1.2 + i * 21, 0, 6, true); k.box(M.trim, 0x8a8e92, 12, 3, 12, 0, H - 1.2, 0, 'b'); }
  else { k.box(M.trim, 0x8a8e92, 24, 2.4, 24, 0, H - 1.2, 0, 'b'); around(k, 26, 26, 0, H + 1.2, 0, (fw) => k.rail(0x30343a, -fw / 2, 0, fw / 2, 0, 0, 2.2)); }
  return { obj: k.build(), fw: a * 2, fd: a * 2 };
}

/** One World Trade Center, 2014: a cube that turns into eight tall triangles, 417 m to the parapet, 541 m (1,776 ft) to the tip of the spire. */
export function oneWTC(r) {
  const k = new Kit(r), F = facadeOf('clear'), a = 15, tint = [0.8, 0.92, 1.06], pod = 57, top = 407, dia = [[0, a], [a, 0], [0, -a], [-a, 0]], frame = lin(0xc8d0d6);
  around(k, a * 2, a * 2, 0, 0, 0, (fw) => lobby(k, r, fw, 8, frame, OFFICE));
  // the podium: a windowless concrete base behind glass fins
  stage(k, F, a * 2, a * 2, 0, 0, 8, pod, mul(tint, [0.8, 0.84, 0.88]), (f, fw) => piers(k, f, fw, pod - 8, frame, 0.1, 0.34, 0, 1));
  facets(k, F, a, a, pod, top, tint);
  k.skin(F, [{ y: top, pts: dia }, { y: 417, pts: dia }], mul(tint, [0.7, 0.75, 0.8])); cap(k, dia, 415.5, 0x8a8e92);
  // the communications ring and the mast
  k.cyl(M.trim, 0xd4d8dc, 4.2, 4.6, 6, 0, 415.5, 0, 16); k.geo(M.metal, STEEL, new THREE.TorusGeometry(7.2, 0.35, 6, 24), 0, 422, 0, PI / 2); k.geo(M.metal, STEEL, new THREE.TorusGeometry(6, 0.3, 6, 24), 0, 426, 0, PI / 2);
  for (let i = 0; i < 8; i++) { const an = (i * PI) / 4; k.rod(M.metal, STEEL, 0.14, [Math.sin(an) * 7.2, 422, Math.cos(an) * 7.2], [0, 452, 0]); k.rod(M.metal, STEEL, 0.14, [Math.sin(an) * 7.2, 422, Math.cos(an) * 7.2], [Math.sin(an) * 4.2, 418, Math.cos(an) * 4.2]); }
  k.cyl(M.metal, STEEL, 0.9, 1.7, 40, 0, 417, 0, 10); k.cyl(M.metal, STEEL, 0.35, 0.9, 50, 0, 457, 0, 8); k.cyl(M.metal, STEEL, 0.08, 0.35, 33.5, 0, 507, 0, 6);
  for (const y of [457, 474, 491, 507]) k.cyl(M.metal, STEEL, 1.5, 1.5, 0.4, 0, y, 0, 10);
  k.box(M.glow, 0xff2a1a, 0.7, 0.7, 0.7, 0, 540.6, 0);
  return { obj: k.build(), fw: a * 2, fd: a * 2 };
}

/**
 * Brooklyn Bridge, 1883, lying along +x from the Manhattan approach (x ≈ 112) across the East River to Brooklyn; y is height above the sea.
 * Granite towers with paired Gothic arches, four main cables, vertical suspenders crossed by diagonal stays, a promenade down the middle.
 */
/**
 * The bridge's deck as something to stand and drive on (the numbers match bridge() below). x is world x, z is measured
 * from the bridge's centre line. The roadway climbs from the street at x0, runs level over the river and comes down in
 * Brooklyn at `end`; pedestrians cross on the raised boardwalk down the middle.
 */
export const BRIDGE_DECK = {
  x0: 112, end: 742, hw: 6, road: 3.9, walk: 0.85,
  yAt(x, z) {
    if (x < 112 || x > 742 || Math.abs(z) > 6) return null;
    const y = x < 212 ? 3.5 + (20.4 * (x - 112)) / 100 : x > 638 ? 4.6 + (19.3 * (742 - x)) / 104 : 24;
    if (Math.abs(z) > 1.7 || x < 222 || x > 628) return y;
    return y + 1.63 * Math.min(1, (x - 222) / 8, (628 - x) / 8);   // the boardwalk, ramped at each end
  },
};

export function bridge(r) {
  const k = new Kit(r), G = facadeOf('granite'), gt = [0.96, 0.93, 0.9], iron = 0x4c4842, DY = 24, TOP = 59, T0 = 330, T1 = 520, A0 = 222, A1 = 628, HW = 6;
  const ext = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
  k.su = k.sv = 1 / 12;
  // towers: stepped buttresses below the roadway, two pointed arches above it, a heavy cornice on top
  const sh = new THREE.Shape(), prof = [[10, -9], [10, 9], [9.2, 9], [9.2, 30], [8.6, 30], [8.6, 51], [9.3, 51.6], [9.3, 54], [8.3, 54.6], [8.3, TOP]];
  prof.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); prof.slice().reverse().forEach(([x, y]) => sh.lineTo(-x, y));
  for (const zc of [-3.7, 3.7]) { const h = new THREE.Path(), hw = 2.45, y0 = DY - 1.3; h.moveTo(zc - hw, y0); h.lineTo(zc + hw, y0); h.lineTo(zc + hw, 40); h.quadraticCurveTo(zc + hw, 46, zc, 49); h.quadraticCurveTo(zc - hw, 46, zc - hw, 40); sh.holes.push(h); }
  const tower = ext(sh, 9);
  for (const x of [T0, T1]) { k.geo(G.side, gt, tower, x + 4.5, 0, 0, 0, -PI / 2); k.box(G.side, gt, 13, 7, 24, x, -9, 0, 'b'); }
  // anchorages and the arcaded approaches
  const ramp = (x) => (x < A0 ? 3.5 + ((DY - 3.6) * Math.max(0, x - 112)) / (A0 - 10 - 112) : 4.6 + ((DY - 4.7) * Math.max(0, 742 - x)) / (742 - A1 - 10));
  const arcade = (x0, x1, y0, arches) => {
    const s = new THREE.Shape(); s.moveTo(x0, y0 - 0.6); s.lineTo(x1, y0 - 0.6); s.lineTo(x1, ramp(x1) + 0.9); s.lineTo(x0, ramp(x0) + 0.9);
    for (const [xc, hw] of arches) { const top = Math.min(ramp(xc - hw), ramp(xc + hw)) - 1.7, rise = Math.min(hw, (top - y0) * 0.55); if (top - y0 < 3) continue; const h = new THREE.Path(); h.moveTo(xc - hw, y0 - 0.4); h.lineTo(xc + hw, y0 - 0.4); h.lineTo(xc + hw, top - rise); h.bezierCurveTo(xc + hw, top - rise * 0.45, xc + hw * 0.55, top, xc, top); h.bezierCurveTo(xc - hw * 0.55, top, xc - hw, top - rise * 0.45, xc - hw, top - rise); s.holes.push(h); }
    const g = ext(s, 1); for (const z of [HW - 1, -HW]) k.geo(G.side, gt, g, 0, 0, z);
  };
  arcade(112, A0 - 10, 3, [[123, 3.6], [134, 3.8], [145.5, 4], [157, 4], [168.5, 4], [180, 4], [200, 10]]);
  arcade(A1 + 10, 742, 4, [[650, 4], [662, 4], [674, 4], [686, 4], [698, 4], [710, 3.8], [721, 3.6]]);
  for (const [x, y0] of [[A0, 3], [A1, 4]]) { k.box(G.side, gt, 20, DY - y0 + 0.55, HW * 2 + 5, x, y0 - 0.6, 0, 'b'); for (const s of [-1, 1]) k.box(G.side, gt, 20, 1.3, 1.2, x, DY - 0.05, s * (HW + 1.9), 'b'); }
  k.su = k.sv = 1;
  // roadway, stiffening trusses and the raised boardwalk
  const road = 0x403c38;
  k.rod(M.trim, road, 1.1, [112, ramp(112) - 0.55, 0], [A0 - 10, DY - 0.55, 0], 4, HW * 2); k.rod(M.trim, road, 1.1, [A1 + 10, DY - 0.55, 0], [742, ramp(742) - 0.55, 0], 4, HW * 2);
  k.box(M.trim, road, A1 - A0 + 20, 1.1, HW * 2, (A0 + A1) / 2, DY - 1.1, 0); k.box(M.trim, 0x7a6850, A1 - A0, 0.25, 3.4, (A0 + A1) / 2, DY + 1.5, 0);
  for (const z of [-HW, HW, -1.75, 1.75]) k.strip(iron, [A0 + 10, DY, z], [A1 - 10, DY, z], [0, Math.abs(z) > 2 ? 2.4 : 1.5, 0], 1);
  for (const z of [-1.7, 1.7]) k.rail(iron, A0, z, A1, z, DY + 1.75, 1.1);
  // four cables: nearly straight over the land spans, a deep curve over the river
  const cable = (x) => { const m = x < T0 ? (x - A0) / (T0 - A0) : x > T1 ? (A1 - x) / (A1 - T1) : -1; if (m >= 0) return DY + 1 + (TOP - 1.5 - DY - 1) * m - 5 * m * (1 - m); const t = (2 * (x - T0)) / (T1 - T0) - 1; return DY + 3 + (TOP - 1.5 - DY - 3) * t * t; };
  for (const z of [-HW + 0.4, -1.3, 1.3, HW - 0.4]) for (let x = A0; x < A1 - 0.1;) { const x1 = Math.min(A1, x + 9.5); k.rod(M.trim, iron, 0.42, [x, cable(x), z], [x1, cable(x1), z]); x = x1; }
  const obj = k.build();
  // the web of suspenders and stays hangs in four planes; all three spans are drawn as one see-through sheet
  const c = document.createElement('canvas'), W = 1024, Hh = 256, g = c.getContext('2d'), p = [], uv = [], n = [];
  c.width = W; c.height = Hh * 3; g.strokeStyle = '#fff'; g.lineWidth = 1.3;
  [[A0, T0], [T0, T1], [T1, A1]].forEach(([x0, x1], row) => {
    const L = x1 - x0, X = (x) => ((x - x0) / L) * W, Y = (y) => (row + 1) * Hh - 2 - ((y - DY) / (TOP - DY)) * (Hh - 4), B = (row + 1) * Hh - 2;
    for (let x = x0 + 2.4; x < x1 - 1; x += 2.4) { g.beginPath(); g.moveTo(X(x), Y(cable(x))); g.lineTo(X(x), B); g.stroke(); }
    for (const tx of [T0, T1]) if (tx >= x0 && tx <= x1) for (const s of [-1, 1]) for (let q = 1; q <= 13; q++) { const x = tx + s * q * 5.4; if (x < x0 || x > x1) continue; g.beginPath(); g.moveTo(X(tx + s * 4.5), Y(TOP - 1.5)); g.lineTo(X(x), B); g.stroke(); }
    const v0 = 1 - (B / (Hh * 3)), v1 = 1 - (row * Hh + 2) / (Hh * 3);
    for (const z of [-HW + 0.4, -1.3, 1.3, HW - 0.4]) { for (const [x, y, u, v] of [[x0, DY, 0, v0], [x1, DY, 1, v0], [x1, TOP, 1, v1], [x0, DY, 0, v0], [x1, TOP, 1, v1], [x0, TOP, 0, v1]]) { p.push(x, y, z); uv.push(u, v); n.push(0, 0, 1); } }
  });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  obj.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, color: iron, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.7 })));
  return obj;
}
