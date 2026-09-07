const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'ontario-fishing-lake-finder', 'index.html'), 'utf8');

test('Ontario Fishing Lake Finder canonical route has no temporary-host redirect while permanent deployment is being attached', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/ontario-fishing-lake-finder\/">/);
  assert.match(html, /noindex,follow/);
  assert.doesNotMatch(html, /replit\.app/i);
  assert.doesNotMatch(html, /window\.location\.replace|http-equiv="refresh"/i);
  assert.match(html, /permanent deployment/i);
});
