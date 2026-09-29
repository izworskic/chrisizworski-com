const test = require('node:test');
const assert = require('node:assert/strict');

// A source-only test misses npm's files allowlist. Exercise the actual hub import.
test('installed lake API serves indexed list and map modes through the hub wrapper', async t => {
  t.mock.method(globalThis, 'fetch', async () => {throw new Error('Indexed remote modes must not need a live source');});
  const handler = require('../api/lakes.js');
  for (const mode of ['remote', 'remote-map']) {
    const headers = {};
    let status = 200;
    let body;
    const res = {setHeader(k, v) {headers[k] = v;}, status(value) {status = value; return this;}, json(value) {body = value; return this;}};
    await handler({method: 'GET', query: {mode, species: 'Brook Trout', remote: 'easy', limit: '6', bbox: '-96,41,-74,57'}}, res);
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow');
    assert.equal(body.coverageComplete, true);
    if (mode === 'remote') {
      assert.equal(body.candidateCount, 3414);
      assert.equal(body.lakes.length, 6);
      assert.ok(body.lakes.every(lake => Number.isFinite(lake.troutFit) && lake.targetEvidence.length));
    } else {
      assert.ok(body.markers.length > 3000);
    }
  }
});
