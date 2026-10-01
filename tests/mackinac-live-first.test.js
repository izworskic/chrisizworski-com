const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function loadTransforms() {
  const breakout = await import('../scripts/apply-breakout-constraints.mjs');
  const liveFirst = await import('../scripts/apply-mackinac-live-first.mjs');
  return { ...breakout, ...liveFirst };
}

test('Mackinac production ordering puts official live status before explanatory copy and Gazette', async () => {
  const { enhanceMackinac, prioritizeMackinacLiveStatus } = await loadTransforms();
  const source = fs.readFileSync('public/mackinac-bridge-live/index.html', 'utf8');
  const breakout = enhanceMackinac(source);
  const output = prioritizeMackinacLiveStatus(breakout);

  const status = output.indexOf('id="statusCard"');
  const direct = output.indexOf('id="mackinac-conditions-answer"');
  const gazette = output.indexOf('data-gazette-placement="mackinac-conditions"');

  assert.ok(status >= 0 && status < direct, 'official live status must be the first decision block');
  assert.ok(direct < gazette, 'explanatory answer must remain ahead of the Gazette');
  assert.match(output, /data-live-first="2026-10-01"/);
  assert.equal(prioritizeMackinacLiveStatus(output), output, 'live-first transform must be idempotent');
});
