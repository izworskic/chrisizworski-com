const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const publicRoot = path.join(root, 'public', 'national-tools', 'coastal', 'oregon');
const app = fs.readFileSync(path.join(publicRoot, 'app.js'), 'utf8');
const proxy = fs.readFileSync(path.join(root, 'api', 'oregon-coastal-proxy.js'), 'utf8');

const pages = [
  ['index.html', 'Oregon Coast'],
  ['yaquina-head/index.html', 'YAQUINA'],
  ['haystack-rock/index.html', 'HAYSTACK'],
  ['hug-point/index.html', 'HUG_POINT'],
  ['thors-well/index.html', 'THORS_WELL'],
];

test('canonical Oregon public pages are backed by local static files', () => {
  for (const [relative, marker] of pages) {
    const file = path.join(publicRoot, relative);
    assert.ok(fs.existsSync(file), `${relative} must exist in the main deployment`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /\/national-tools\/coastal\/oregon\/app\.js/);
    assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});

test('Oregon frontend uses same-origin API instead of child clean-path routing', () => {
  assert.match(app, /const API='\/api\/oregon-coastal-proxy'/);
  assert.doesNotMatch(app, /\/national-tools\/coastal\/oregon\/_api\/decision/);
});

test('first-party Oregon proxy targets the specialist API endpoint directly', () => {
  assert.match(proxy, /national-coastal-water\.vercel\.app\/api\/oregon-coastal/);
  assert.match(proxy, /AbortSignal\.timeout\(8000\)/);
  assert.match(proxy, /Oregon coastal decision service is temporarily unavailable/);
});
