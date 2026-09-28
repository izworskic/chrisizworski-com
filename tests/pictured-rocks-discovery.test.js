import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const robots = fs.readFileSync('public/robots.txt', 'utf8');
const sitemap = fs.readFileSync('public/sitemap-pictured-rocks.xml', 'utf8');
const preview = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');
const middleware = fs.readFileSync('middleware.ts', 'utf8');

test('Pictured Rocks canonical sitemap is advertised', () => {
  assert.match(robots, /Sitemap: https:\/\/picturedrocks\.chrisizworski\.com\/sitemap-pictured-rocks\.xml/);
});

test('Pictured Rocks sitemap contains only the canonical production owner', () => {
  assert.match(sitemap, /<loc>https:\/\/picturedrocks\.chrisizworski\.com\/<\/loc>/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 1);
  assert.doesNotMatch(sitemap, /chrisizworski\.com\/labs\/pictured-rocks-planner/);
});

test('lab preview stays noindex while middleware promotes only the canonical host', () => {
  assert.match(preview, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(preview, /<link rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/">/);
  assert.match(middleware, /const PICTURED_ROCKS_HOST = 'picturedrocks\.chrisizworski\.com';/);
  assert.match(middleware, /index,follow,max-image-preview:large/);
});
