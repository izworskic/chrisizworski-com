'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const middleware = fs.readFileSync('middleware.js', 'utf8');
const preview = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');

test('canonical Pictured Rocks hostname is the only host promoted by middleware', () => {
  assert.match(middleware, /PICTURED_ROCKS_HOST\s*=\s*'picturedrocks\.chrisizworski\.com'/);
  assert.match(middleware, /requestHostname\(request\)\s*!==\s*PICTURED_ROCKS_HOST/);
  assert.match(middleware, /matcher:\s*\[\s*['"]\/['"]\s*,\s*['"]\/index\.html['"]\s*\]/);
});

test('canonical shell serves the tested lab planner rather than a second implementation', () => {
  assert.match(middleware, /PICTURED_ROCKS_SOURCE\s*=\s*'\/labs\/pictured-rocks-planner\/'/);
  assert.match(middleware, /new URL\(PICTURED_ROCKS_SOURCE, request\.url\)/);
  assert.match(middleware, /fetch\(sourceUrl/);
});

test('lab preview remains noindex while canonical shell promotes only its response', () => {
  assert.match(preview, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(preview, /<link rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/">/);
  assert.match(middleware, /noindexPattern/);
  assert.match(middleware, /index,follow,max-image-preview:large/);
  assert.match(middleware, /X-Robots-Tag', 'index, follow, max-image-preview:large'/);
});

test('cutover fails closed if the committed preview contract disappears', () => {
  assert.match(middleware, /if \(!noindexPattern\.test\(html\)\)/);
  const failureNoindex = middleware.match(/X-Robots-Tag': 'noindex, nofollow'/g) || [];
  assert.ok(failureNoindex.length >= 2, 'upstream and exception failures must both remain noindex');
  assert.match(middleware, /status:\s*503/);
});

test('subdomain shell keeps live data and assets on the same deployment', () => {
  assert.match(preview, /href="\/assets\/pictured-rocks-planner-v3\.css"/);
  assert.match(preview, /src="\/assets\/pictured-rocks-planner-v3\.js"/);
  const ui = fs.readFileSync('public/assets/pictured-rocks-planner-v3.js', 'utf8');
  assert.match(ui, /fetch\('\/api\/pictured-rocks-live'/);
});
