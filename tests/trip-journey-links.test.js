import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import tripJourneyLinks from '../lib/trip-journey-links.js';

const CASES = [
  ['public/lake-superior-circle-tour/index.html', '/lake-superior-circle-tour/index.html'],
  ['public/mackinac-bridge-live/index.html', '/mackinac-bridge-live/index.html'],
  ['public/mackinac-bridge-tolls/index.html', '/mackinac-bridge-tolls/index.html'],
];

function titleOf(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
}

function canonicalOf(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || '';
}

test('Mackinac and Circle Tour journey links preserve search ownership', async () => {
  const transformed = new Map();

  for (const [file, pathname] of CASES) {
    const source = await readFile(file, 'utf8');
    const output = tripJourneyLinks(source, pathname);
    assert.equal(titleOf(output), titleOf(source), `${pathname} title changed`);
    assert.equal(canonicalOf(output), canonicalOf(source), `${pathname} canonical changed`);
    transformed.set(pathname, output);
  }

  const circle = transformed.get('/lake-superior-circle-tour/index.html');
  assert.match(circle, /data-journey-link="mackinac-live"/);
  assert.match(circle, /href="\/mackinac-bridge-live\/"/);
  assert.match(circle, /data-journey-link="mackinac-toll"/);
  assert.match(circle, /href="\/mackinac-bridge-tolls\/"/);
  assert.match(circle, /not one of the 31 Circle Tour stops/);
  assert.match(circle, /31 major stops/);
  assert.doesNotMatch(circle, /32 major stops/);

  const live = transformed.get('/mackinac-bridge-live/index.html');
  assert.match(live, /data-journey-link="circle-tour"/);
  assert.match(live, /href="\/lake-superior-circle-tour\/"/);
  assert.match(live, /href="\/mackinac-bridge-tolls\/"/);

  const toll = transformed.get('/mackinac-bridge-tolls/index.html');
  assert.match(toll, /data-journey-link="circle-tour"/);
  assert.match(toll, /href="\/lake-superior-circle-tour\/"/);
  assert.match(toll, /href="\/mackinac-bridge-live\/"/);
});

test('journey link transform is idempotent', async () => {
  for (const [file, pathname] of CASES) {
    const source = await readFile(file, 'utf8');
    const once = tripJourneyLinks(source, pathname);
    const twice = tripJourneyLinks(once, pathname);
    assert.equal(twice, once, `${pathname} changed on second transform`);
  }
});
