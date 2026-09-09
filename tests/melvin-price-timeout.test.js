const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../api/melvin-price.js')._test;

test('Melvin Price provider deadline returns fallback instead of blocking the page API', async () => {
  const started = Date.now();
  const result = await api.within(
    new Promise(resolve => setTimeout(() => resolve({ ok: true }), 250)),
    25,
    () => ({ ok: false, error: 'deadline' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, 'deadline');
  assert.ok(Date.now() - started < 180, 'deadline fallback should return promptly');
});
