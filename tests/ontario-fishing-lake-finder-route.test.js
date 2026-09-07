const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'ontario-fishing-lake-finder', 'index.html'), 'utf8');

test('Ontario Fishing Lake Finder canonical route no longer 404s and hands off to the published standalone app', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/ontario-fishing-lake-finder\/">/);
  assert.match(html, /https:\/\/intelligent-lightgray-texts\.replit\.app\//);
  assert.match(html, /window\.location\.replace/);
});
