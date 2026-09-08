const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const api = fs.readFileSync(path.join(root, 'api', 'lakes.js'), 'utf8');
const sync = fs.readFileSync(path.join(root, 'scripts', 'sync-ontario-finder.mjs'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'ontario-fishing-lake-finder', 'index.html'), 'utf8');

test('Ontario fishing surfaces deploy from the pinned standalone release without Replit', () => {
  assert.equal(
    pkg.dependencies?.['ontario-fishing-lake-finder'],
    'github:izworskic/ontario-fishing-lake-finder#7e72cbaeb35b969a06e6ed66a5e8cc5d8669a148'
  );
  assert.match(pkg.scripts?.['vercel-build'] || '', /sync-ontario-finder\.mjs/);
  assert.match(api, /ontario-fishing-lake-finder\/api\/lakes/);
  assert.match(sync, /Ontario Hydro Network/);
  assert.match(sync, /Remote Trout Lake Finder/);
  assert.match(sync, /remote-trout-lake-finder/);
  assert.match(sync, /Trout Fit ≠ Remote Context/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/ontario-fishing-lake-finder\/">/);
  assert.doesNotMatch(api + sync + html, /replit\.app/i);
});
