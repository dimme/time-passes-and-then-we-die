import * as THREE from 'three';
import { rng } from './util.js?v=ef07112a';

/** Tileable fractal value noise, returned as a Float32Array of size*size values in 0..1. */
export function tileNoise(size, period = 4, octaves = 5, seed = 1) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const P = period << o, r = rng(seed * 131 + o * 17), lat = new Float32Array(P * P);
    for (let i = 0; i < P * P; i++) lat[i] = r();
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * P, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = (y0 % P) * P, yb = ((y0 + 1) % P) * P;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * P, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % P, xb = (x0 + 1) % P;
        const a = lat[ya + xa] + (lat[ya + xb] - lat[ya + xa]) * sx, b = lat[yb + xa] + (lat[yb + xb] - lat[yb + xa]) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function finish(tex, repeat, srgb) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
  if (repeat) tex.repeat.set(repeat, repeat);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true; return tex;
}
function canvasOf(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

/** Tangent-space normal map from a tileable height field. */
export function normalMap(h, size, strength = 2) {
  const c = canvasOf(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x + size - 1) % size)], r = h[y * size + ((x + 1) % size)];
    const u = h[((y + size - 1) % size) * size + x], dn = h[((y + 1) % size) * size + x];
    let nx = (l - r) * strength, ny = (dn - u) * strength, nz = 1; const il = 1 / Math.hypot(nx, ny, nz);
    const i = (y * size + x) * 4; d[i] = (nx * il * 0.5 + 0.5) * 255; d[i + 1] = (ny * il * 0.5 + 0.5) * 255; d[i + 2] = (nz * il * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finish(new THREE.CanvasTexture(c), 0, false);
}

/** Greyscale albedo detail from a height field: value = lo + (hi-lo)*h, with optional colour tint function. */
export function detailMap(h, size, lo = 0.6, hi = 1, tint) {
  const c = canvasOf(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = lo + (hi - lo) * h[i], t = tint ? tint(h[i], i) : [1, 1, 1];
    d[i * 4] = Math.min(255, v * t[0] * 255); d[i * 4 + 1] = Math.min(255, v * t[1] * 255); d[i * 4 + 2] = Math.min(255, v * t[2] * 255); d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finish(new THREE.CanvasTexture(c), 0, true);
}

/** Wrap a 2D canvas as a repeating texture. */
export function canvasTex(c, srgb = true) { return finish(new THREE.CanvasTexture(c), 0, srgb); }

// shared ground / rock / bark detail, built once
let _shared;
export function shared() {
  if (_shared) return _shared;
  const S = 512;
  const ground = tileNoise(S, 4, 6, 3), fine = tileNoise(S, 32, 3, 9);
  const mix = new Float32Array(S * S); for (let i = 0; i < mix.length; i++) mix[i] = ground[i] * 0.6 + fine[i] * 0.4;
  const rock = tileNoise(S, 3, 6, 21);
  const ridged = new Float32Array(S * S); for (let i = 0; i < ridged.length; i++) ridged[i] = 1 - Math.abs(rock[i] * 2 - 1);
  // bark: noise stretched along the trunk
  const bn = tileNoise(S, 8, 4, 5), bark = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) bark[y * S + x] = 0.5 + 0.5 * Math.sin(x * 0.2 + bn[((y >> 3) % S) * S + x] * 14) * (0.6 + 0.4 * bn[y * S + x]);
  _shared = {
    groundMap: detailMap(mix, S, 0.62, 1.08), groundNormal: normalMap(mix, S, 5),
    rockMap: detailMap(ridged, S, 0.55, 1.05), rockNormal: normalMap(ridged, S, 7),
    barkMap: detailMap(bark, S, 0.45, 1.0), barkNormal: normalMap(bark, S, 4),
    iceNormal: normalMap(rock, S, 3),
  };
  return _shared;
}
