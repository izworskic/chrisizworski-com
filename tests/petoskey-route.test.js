const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/petoskey-route');

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
}

test('routing accepts a full twelve-stop loop and rejects oversized or invalid coordinates', async t => {
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls++;
    return { ok: true, json: async () => ({ routes: [{ geometry: { coordinates: [[-84.95, 45.37], [-85, 45.3]] }, legs: [{ duration: 600, distance: 1609.34 }] }] }) };
  });
  const coords = Array.from({ length: 14 }, () => [-84.95, 45.37]);
  const ok = response();
  await handler({ method: 'POST', body: { coordinates: coords } }, ok);
  assert.equal(ok.code, 200);
  assert.deepEqual(ok.body.geometry[0], [45.37, -84.95]);
  assert.deepEqual(ok.body.legs[0], { durationMin: 10, distanceMi: 1 });
  for (const invalid of [[...coords, coords[0]], [[181, 45], coords[0]], [[-85, 91], coords[0]]]) {
    const bad = response();
    await handler({ method: 'POST', body: { coordinates: invalid } }, bad);
    assert.equal(bad.code, 400);
  }
  assert.equal(calls, 1);
});
