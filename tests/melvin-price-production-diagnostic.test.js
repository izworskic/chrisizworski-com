const test = require('node:test');
const assert = require('node:assert/strict');

test('diagnose Melvin Price production API', { timeout: 45000 }, async () => {
  const url = `https://chrisizworski.com/api/melvin-price?_diagnostic=${Date.now()}`;
  const started = Date.now();
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache', 'user-agent': 'MelvinPriceCIDiagnostic/1.0' },
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  console.log(`MELVIN_PROD_DIAG status=${response.status} elapsed=${Date.now()-started} content-type=${response.headers.get('content-type')}`);
  console.log(`MELVIN_PROD_BODY ${text.slice(0, 6000)}`);
  assert.equal(response.status, 200, `production API status ${response.status}; body=${text.slice(0,1500)}`);
  const data = JSON.parse(text);
  assert.ok(data.generatedAt, 'generatedAt missing');
});
