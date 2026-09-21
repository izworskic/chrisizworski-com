import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const routeApi = require('../api/snowmobile-route.js');

test('snowmobile-route parsePoint accepts a valid lat,lon pair and rejects malformed input', () => {
  assert.deepEqual(routeApi._test.parsePoint('44.6614,-84.7148'), { lat: 44.6614, lon: -84.7148 });
  assert.equal(routeApi._test.parsePoint('Grayling'), null);
  assert.equal(routeApi._test.parsePoint('91,-84'), null, 'latitude out of range must be rejected');
  assert.equal(routeApi._test.parsePoint('44.6,-181'), null, 'longitude out of range must be rejected');
  assert.equal(routeApi._test.parsePoint(''), null);
  assert.equal(routeApi._test.parsePoint(undefined), null);
});

function mockRes() {
  const r = {};
  r.status = (s) => { r._status = s; return r; };
  r.setHeader = () => {};
  r.json = (p) => { r._json = p; };
  return r;
}

test('snowmobile-route rejects a non-GET method', async () => {
  const res = mockRes();
  await routeApi({ method: 'POST', query: {} }, res);
  assert.equal(res._status, 405);
});

test('snowmobile-route requires region, from and to before doing any work', async () => {
  let res = mockRes();
  await routeApi({ method: 'GET', query: {} }, res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /region/i);

  res = mockRes();
  await routeApi({ method: 'GET', query: { region: 'grayling-gaylord' } }, res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /from/i);

  res = mockRes();
  await routeApi({ method: 'GET', query: { region: 'grayling-gaylord', from: '44.66,-84.71' } }, res);
  assert.equal(res._status, 400);
  assert.match(res._json.error, /to/i);
});

test('snowmobile-route returns 404 for an unknown region without doing any DNR fetch', async () => {
  const res = mockRes();
  await routeApi({ method: 'GET', query: { region: 'not-a-real-region', from: '44.66,-84.71', to: '44.70,-84.75' } }, res);
  assert.equal(res._status, 404);
  assert.ok(Array.isArray(res._json.knownRegions));
});
