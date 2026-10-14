// Version ShoreFeel's stylesheet and script in every ShoreFeel page by content hash.
// The assets are cached by browsers for hours; without a version, a deploy can pair new HTML with
// old JavaScript and leave the temperatures blank. Run after editing public/assets/shorefeel.{css,js}.
// tests/shorefeel-asset-version.test.js fails if a page references a stale hash.
import fs from 'node:fs';
import crypto from 'node:crypto';
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 10);
export const PAGES = ['great-lakes-water-temperature', 'lake-michigan-water-temperature',
  'lake-michigan-water-temperature/traverse-city', 'lake-michigan-water-temperature/grand-haven'].map(p => `public/${p}/index.html`);
const v = { css: hash('public/assets/shorefeel.css'), js: hash('public/assets/shorefeel.js') };
for (const page of PAGES) {
  const html = fs.readFileSync(page, 'utf8');
  const out = html.replace(/\/assets\/shorefeel\.css(\?v=[0-9a-f]+)?"/g, `/assets/shorefeel.css?v=${v.css}"`)
                  .replace(/\/assets\/shorefeel\.js(\?v=[0-9a-f]+)?"/g, `/assets/shorefeel.js?v=${v.js}"`);
  if (out !== html) fs.writeFileSync(page, out);
}
console.log('ShoreFeel assets stamped', v);
