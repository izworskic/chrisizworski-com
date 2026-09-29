import responseChecks from './helpers/pictured-rocks-response.cjs';
const {canonicalResponse} = responseChecks;
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const middleware = fs.readFileSync('middleware.ts', 'utf8');
const preview = fs.readFileSync('public/labs/pictured-rocks-planner/index.html', 'utf8');

test('canonical Pictured Rocks shell emits share and favicon metadata', async t => {
  const {html} = await canonicalResponse(t);
  assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/);
  assert.match(html, /<meta property="og:title" content="Pictured Rocks Trip Planner 2026: Map, Itinerary & Weather">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/picturedrocks\.chrisizworski\.com\/">/);
  assert.match(html, /<meta property="og:image" content="https:[^"]+">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta name="twitter:image" content="https:[^"]+">/);
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
  assert.match(preview, /<link rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
  assert.match(middleware, /PICTURED_ROCKS_INDEXABLE_ROBOTS/);
  assert.match(middleware, /X-Robots-Tag', 'index, follow, max-image-preview:large'/);
});
