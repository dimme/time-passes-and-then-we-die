// Cache busting: gives every file the game loads a version in its URL (`?v=<hash>`), so a browser never runs a stale mix of
// old and new modules after an update. The version is a hash of the content of everything the game loads, so it changes
// exactly when something changes, and running this twice gives the same result.
//
//   node tools/stamp.mjs          stamp everything (the git pre-commit hook in tools/hooks runs this for you)
//   node tools/stamp.mjs --check  exit 1 if anything is unstamped or out of date
//
// Every reference gets the same version, so a module is never loaded twice under two different URLs.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((n) => { const p = join(dir, n); return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p]; });
const loaded = ['index.html', 'style.css', ...walk('src'), ...walk('vendor'), ...walk('data')].filter((p) => !p.endsWith('.md'));
const stamped = ['index.html', ...walk('src'), ...walk('vendor/jsm'), ...walk('tools').filter((p) => /\.(js|html)$/.test(p) && !p.includes(`${sep}hooks${sep}`) && !p.endsWith('stamp.mjs'))].filter((p) => /\.(js|mjs|html)$/.test(p));

const V = /\?v=[0-9a-f]{8}/g;
// a quoted relative path to something the game loads: ./x.js, ../vendor/y.js, src/main.js, data/plates.png, style.css
const REF = /(['"])((?:\.{1,2}\/|src\/|vendor\/|data\/)[^'"?\s]*?\.(?:js|css|png|json|jpg)|style\.css)(?:\?v=[0-9a-f]{8})?\1/g;

const hash = createHash('sha1');
for (const p of loaded.sort()) { const b = readFileSync(join(ROOT, p)); hash.update(p); hash.update(/\.(js|html|css)$/.test(p) ? b.toString('utf8').replace(V, '') : b); }
const version = hash.digest('hex').slice(0, 8);

let changed = 0;
for (const p of stamped) {
  const file = join(ROOT, p), before = readFileSync(file, 'utf8'), after = before.replace(REF, (m, q, path) => `${q}${path}?v=${version}${q}`);
  if (after !== before) { changed++; if (!process.argv.includes('--check')) writeFileSync(file, after); console.log((process.argv.includes('--check') ? 'out of date: ' : 'stamped ') + relative(ROOT, file)); }
}
if (process.argv.includes('--check') && changed) process.exit(1);
console.log(`version ${version}${changed ? `, ${changed} files updated` : ', everything already up to date'}`);
