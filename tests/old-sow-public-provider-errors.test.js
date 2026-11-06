'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const frontend = fs.readFileSync(path.join(root, 'public/assets/old-sow-live.js'), 'utf8');
const sourceMjs = fs.readFileSync(path.join(root, 'lib/old-sow/harness-client.mjs'), 'utf8');
const sourceJs = fs.readFileSync(path.join(root, 'lib/old-sow/harness-client.js'), 'utf8');

test('Old Sow visitor page never interpolates raw model-service reason text', () => {
  assert.doesNotMatch(frontend, /rec\?\.reason/);
  assert.match(frontend, /Optional AI ranking was not used/);
  for (const source of [sourceMjs, sourceJs]) {
    assert.doesNotMatch(source, /Harness HTTP \$\{res\.status\}: \$\{detail\}/);
    assert.doesNotMatch(source, /error instanceof Error \? error\.message : String\(error\)/);
  }
});

test('provider billing responses cannot escape into Old Sow JSON; deterministic fallback remains usable', async () => {
  const beforeFetch = globalThis.fetch;
  const beforeKey = process.env.HARNESS_ACCESS_KEY;
  process.env.HARNESS_ACCESS_KEY = 'test-credential';
  const leak = 'TypeSafe 402 billing_error unavailable credits sk-proj-sensitive-payload';
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ detail: { error_type: 'billing_error', message: leak } })
  });
  try {
    const {
      recommendViewingWindowWithHarness,
      classifyVisibilityWithHarness,
      screenUntrustedEvidence
    } = await import('../lib/old-sow/harness-client.mjs');
    const candidate = {
      id: 'source-window-1',
      start: '2026-11-06T14:00:00Z',
      end: '2026-11-06T16:00:00Z',
      peak: '2026-11-06T15:00:00Z',
      daylightAtPeak: true,
      predictedMaxFloodKnots: 2,
      decisionScore: 75
    };
    const rank = await recommendViewingWindowWithHarness(
      [candidate], { generatedAt: '2026-11-05T23:00:00Z' }
    );
    const visibility = await classifyVisibilityWithHarness('Sunny with clear skies at the coast.');
    const evidence = await screenUntrustedEvidence('Official forecast data.', 'forecast');
    assert.equal(rank.mode, 'deterministic');
    assert.equal(rank.choiceId, null);
    assert.equal(visibility.mode, 'deterministic');
    assert.ok(visibility.baseline, 'forecast text still receives a deterministic classification');
    assert.equal(evidence.safe, null);
    const publicFallback = JSON.stringify({rank, visibility, evidence});
    assert.doesNotMatch(publicFallback, /billing_error|TypeSafe|credits|sk-proj-sensitive|HTTP 500/);
    assert.match(publicFallback, /NOAA-based guidance remains active/);
  } finally {
    globalThis.fetch = beforeFetch;
    if (beforeKey === undefined) delete process.env.HARNESS_ACCESS_KEY;
    else process.env.HARNESS_ACCESS_KEY = beforeKey;
  }
});
