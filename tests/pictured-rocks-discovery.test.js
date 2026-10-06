import responseChecks from './helpers/pictured-rocks-response.cjs';
const {canonicalResponse, assertIndexableRobots} = responseChecks;
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

test('lab preview stays noindex while middleware promotes only the canonical host', async t => {
  assert.match(preview, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(preview, /<link rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/">/);
  assert.match(middleware, /const PICTURED_ROCKS_HOST = 'picturedrocks\.chrisizworski\.com';/);
  assertIndexableRobots((await canonicalResponse(t)).html);
});

test('canonical response has one consistent creator entity, quiet credit, and current published date', async t => {
  const {html} = await canonicalResponse(t);
  const graph = html.split('<script type="application/ld+json">').slice(1).map(script => JSON.parse(script.split('</script>')[0])['@graph'] || []).flat();
  const people = graph.filter(node => node['@type'] === 'Person');
  assert.ok(people.length > 0);
  assert.ok(people.every(person => person['@id'] === 'https://chrisizworski.com/#person' && person.url === 'https://chrisizworski.com/'));
  assert.ok(html.includes('Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a>'));
  assert.ok(html.includes('href="https://chrisizworski.com/lake-superior-circle-tour/"'));
  assert.ok(html.includes('href="https://chrisizworski.com/northern-lights-michigan/"'));
  const published = /<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/.exec(sitemap)?.[1];
  assert.ok(published);
  assert.ok(middleware.includes(`dateModified: '${published}'`));
});
