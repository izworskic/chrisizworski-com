import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const middleware = fs.readFileSync('middleware.ts', 'utf8');
const preview = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');

test('canonical Pictured Rocks shell emits share and favicon metadata', () => {
  assert.match(middleware, /<link rel="icon" href="\/favicon\.ico" sizes="any">/);
  assert.match(middleware, /<meta property="og:title" content="Pictured Rocks Planner — What to Do Today">/);
  assert.match(middleware, /<meta property="og:url" content="https:\/\/picturedrocks\.chrisizworski\.com\/">/);
  assert.match(middleware, /<meta property="og:image"/);
  assert.match(middleware, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(middleware, /<meta name="twitter:image"/);
});

test('canonical shell renders four decision thumbnails before client JavaScript', () => {
  assert.match(middleware, /PICTURED_ROCKS_TRIP_THUMBNAILS/);
  for (const heading of ['Boat cruise', 'Guided kayak', 'Chapel hike', 'Drive + short walks']) {
    assert.match(middleware, new RegExp(heading.replace(/[+]/g, '\\+')));
  }
  assert.match(middleware, /addPicturedRocksTripThumbnails\(html\)/);
  assert.match(middleware, /class="trip-thumb"/);
});

test('preview remains noindex and canonical ownership remains the subdomain', () => {
  assert.match(preview, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(preview, /<link rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/">/);
  assert.match(middleware, /PICTURED_ROCKS_INDEXABLE_ROBOTS/);
  assert.match(middleware, /X-Robots-Tag', 'index, follow, max-image-preview:large'/);
});
