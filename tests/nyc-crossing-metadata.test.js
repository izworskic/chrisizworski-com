'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '../public/nyc-crossing/index.html'), 'utf8');

function meta(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = page.match(new RegExp('<meta (?:name|property)="' + escaped + '" content="([^"]*)">'));
  return match?.[1]?.replace(/&amp;/g, '&') || null;
}

test('NYC Crossing has complete canonical, search and social metadata', () => {
  assert.equal((page.match(/<link rel="canonical"/g) || []).length, 1);
  assert.equal(meta('og:url'), 'https://chrisizworski.com/nyc-crossing/');
  assert.equal(meta('og:type'), 'website');
  assert.equal(meta('og:site_name'), 'Chris Izworski');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('og:image'), 'https://chrisizworski.com/api/nyc-crossing-social-card');
  assert.equal(meta('twitter:image'), meta('og:image'));
  assert.equal(meta('og:image:type'), 'image/png');
  assert.equal(meta('og:image:width'), '1200');
  assert.equal(meta('og:image:height'), '630');
  assert.ok(meta('og:image:alt')?.includes('New York City skyline'));
  assert.ok(meta('twitter:image:alt')?.includes('suspension bridge'));

  const title = page.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/&amp;/g, '&');
  const description = meta('description');
  assert.ok(title && title.length <= 60, 'rendered title must fit the site SERP title limit');
  assert.ok(description && description.length <= 158, 'meta description must fit the site SERP description limit');
  assert.ok(title.includes('Chris Izworski'));
});

test('NYC Crossing schema defines its creator and connects page, software, image and breadcrumb', () => {
  const json = page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json, 'JSON-LD graph is present');
  const graph = JSON.parse(json)['@graph'];
  const byId = new Map(graph.map(item => [item['@id'], item]));
  assert.equal(byId.get('https://chrisizworski.com/#person')?.name, 'Chris Izworski');
  assert.equal(byId.get('https://chrisizworski.com/nyc-crossing/#page')?.dateModified, '2026-10-07');
  assert.equal(byId.get('https://chrisizworski.com/nyc-crossing/#page')?.mainEntity?.['@id'], 'https://chrisizworski.com/nyc-crossing/#app');
  assert.equal(byId.get('https://chrisizworski.com/nyc-crossing/#page')?.primaryImageOfPage?.['@id'], 'https://chrisizworski.com/nyc-crossing/#social-image');
  assert.equal(byId.get('https://chrisizworski.com/nyc-crossing/#app')?.author?.['@id'], 'https://chrisizworski.com/#person');
  assert.equal(byId.get('https://chrisizworski.com/nyc-crossing/#social-image')?.contentUrl, meta('og:image'));
  assert.deepEqual(
    byId.get('https://chrisizworski.com/nyc-crossing/#breadcrumb')?.itemListElement?.map(item => item.name),
    ['Home', 'National Tools', 'NYC Crossing']
  );
});

test('NYC Crossing links into the real transportation and decision network', () => {
  for (const href of [
    '/national-tools/',
    '/mackinac-bridge-live/',
    '/niagara-border-crossing/',
    '/chesapeake-bay-bridge-tunnel/',
    '/chesapeake-bay-bridge-maryland/'
  ]) assert.ok(page.includes('href="' + href + '"'), 'missing contextual link ' + href);
});

test('NYC social card responds with a crawl-safe 1200 by 630 PNG', async () => {
  const handler = require('../api/nyc-crossing-social-card.js');
  const makeResponse = () => ({
    headers: {}, code: 0, body: null, ended: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
    end() { this.ended = true; return this; }
  });
  const res = makeResponse();
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(res.body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(res.body.readUInt32BE(16), 1200);
  assert.equal(res.body.readUInt32BE(20), 630);
  assert.equal(Number(res.headers['content-length']), res.body.length);

  const head = makeResponse();
  await handler({ method: 'HEAD' }, head);
  assert.equal(head.code, 200);
  assert.equal(head.body, null);
  assert.equal(head.ended, true);

  const other = makeResponse();
  await handler({ method: 'POST' }, other);
  assert.equal(other.code, 405);
  assert.equal(other.headers.allow, 'GET, HEAD');
});
