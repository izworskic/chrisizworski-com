'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('Rocky Mountain elk route is owned by the main-site composition layer before the National Tools catch-all', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rewrites = config.rewrites || [];
  const bySource = new Map(rewrites.map(item => [item.source, item.destination]));

  assert.equal(bySource.get('/national-tools/elk-rut'), '/api/elk-rut-page');
  assert.equal(bySource.get('/national-tools/elk-rut/'), '/api/elk-rut-page');
  assert.equal(bySource.get('/national-tools/elk-rut/_api/live'), '/api/elk-rut-live');

  const elkIndex = rewrites.findIndex(item => item.source === '/national-tools/elk-rut/');
  const hubIndex = rewrites.findIndex(item => item.source === '/national-tools/:path*');
  assert.ok(elkIndex >= 0 && hubIndex >= 0 && elkIndex < hubIndex, 'elk route must precede the National Tools wildcard');
});

test('elk composition proxies use the authoritative elk repository instead of a nonexistent Vercel origin', () => {
  const pageProxy = fs.readFileSync(path.join(root, 'api', 'elk-rut-page.js'), 'utf8');
  const liveProxy = fs.readFileSync(path.join(root, 'api', 'elk-rut-live.js'), 'utf8');

  assert.match(pageProxy, /izworskic\/rocky-mountain-elk-rut-live/);
  assert.match(liveProxy, /izworskic\/rocky-mountain-elk-rut-live/);
  assert.doesNotMatch(pageProxy, /rocky-mountain-elk-rut-live\.vercel\.app/);
  assert.doesNotMatch(liveProxy, /rocky-mountain-elk-rut-live\.vercel\.app/);
});
