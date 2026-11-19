// Developer tool: rebuilds data/plates.png, the atlas of continental positions used by the zoomed-out globe.
// It is 4 columns × 7 rows of equirectangular land masks, one per time in TIMES (millions of years ago).
//
// Source: reconstructed present-day coastlines from the GPlates Web Service (https://gws.gplates.org),
// plate model MERDITH2021 (Merdith et al. 2021, Earth-Science Reviews 214, 103477; CC BY 4.0). Fetch them first:
//   mkdir -p tools/plates-src && for t in 0 10 20 35 50 66 80 100 120 150 175 200 225 250 275 300 330 360 400 440 480 540 600 700 750 800 900 1000; do
//     curl -o tools/plates-src/c$t.json "https://gws.gplates.org/reconstruct/coastlines/?time=$t&model=MERDITH2021"; done
// then run: node tools/build-plates.js   (needs Playwright; convert the result to 8-bit greyscale to keep it small)
const { chromium } = require('playwright');
const fs = require('fs');
const TIMES = [0, 10, 20, 35, 50, 66, 80, 100, 120, 150, 175, 200, 225, 250, 275, 300, 330, 360, 400, 440, 480, 540, 600, 700, 750, 800, 900, 1000];
const W = 1024, H = 512, COLS = 4;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(`<canvas id="c" width="${W * COLS}" height="${H * Math.ceil(TIMES.length / COLS)}"></canvas>`);
  await p.evaluate(() => { const g = document.getElementById('c').getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 1e5, 1e5); });
  for (let i = 0; i < TIMES.length; i++) {
    const gj = JSON.parse(fs.readFileSync(`${__dirname}/plates-src/c${TIMES[i]}.json`, 'utf8'));
    const polys = []; for (const f of gj.features) { const g = f.geometry; if (!g) continue; if (g.type === 'Polygon') polys.push(g.coordinates); else if (g.type === 'MultiPolygon') polys.push(...g.coordinates); }
    const n = await p.evaluate(([polys, i, W, H, COLS]) => {
      const g = document.getElementById('c').getContext('2d'), ox = (i % COLS) * W, oy = Math.floor(i / COLS) * H;
      g.save(); g.beginPath(); g.rect(ox, oy, W, H); g.clip(); g.fillStyle = '#fff';
      for (const poly of polys) {
        // unwrap rings that cross the date line, then draw them at −360, 0 and +360 so both halves appear
        const rings = poly.map((ring) => { let prev = null, off = 0; return ring.map(([lon, lat]) => { if (prev !== null) { if (lon - prev > 180) off -= 360; else if (lon - prev < -180) off += 360; } prev = lon; return [lon + off, lat]; }); });
        for (const shift of [-360, 0, 360]) {
          g.beginPath();
          for (const ring of rings) { ring.forEach(([lon, lat], k) => { const x = ox + ((lon + shift + 180) / 360) * W, y = oy + ((90 - lat) / 180) * H; if (k) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
          g.fill('evenodd');
        }
      }
      g.restore(); return polys.length;
    }, [polys, i, W, H, COLS]);
    console.log(TIMES[i], 'Ma', n, 'polygons');
  }
  const url = await p.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(`${__dirname}/../data/plates.png`, Buffer.from(url.split(',')[1], 'base64'));
  await b.close();
})();
