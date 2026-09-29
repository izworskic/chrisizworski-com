const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function transforms() {
  return import('../scripts/apply-breakout-constraints.mjs');
}

test('freighter tracker keeps the live map ahead of the Gazette', async () => {
  const { enhanceFreighter } = await transforms();
  const source = fs.readFileSync('public/great-lakes-freighter-tracking/index.html', 'utf8');
  const output = enhanceFreighter(source);
  const map = output.indexOf('id="live-map"');
  const gazette = output.indexOf('data-gazette-placement="freighter-tracker"');
  const howTo = output.indexOf('aria-labelledby="how-to-track"');
  assert.ok(map >= 0 && gazette > map, 'live map must appear before the Gazette');
  assert.ok(howTo > gazette, 'Gazette should remain before the deeper how-to content');
  assert.match(output, /data-breakout-relocated="2026-09-29"/);
});

test('Mackinac direct answer flows immediately into official status before the Gazette', async () => {
  const { enhanceMackinac } = await transforms();
  const source = fs.readFileSync('public/mackinac-bridge-live/index.html', 'utf8');
  const output = enhanceMackinac(source);
  const direct = output.indexOf('id="mackinac-conditions-answer"');
  const status = output.indexOf('id="statusCard"');
  const gazette = output.indexOf('data-gazette-placement="mackinac-conditions"');
  assert.ok(direct >= 0 && status > direct, 'official status must follow the direct-answer section');
  assert.ok(gazette > status, 'Gazette must not interrupt open/closed intent');
  assert.match(output, /data-breakout-relocated="2026-09-29"/);
});

test('boat-launch near-me enhancement is explicit, ephemeral and preserves canonical ownership', async () => {
  const { enhanceBoatLaunches } = await transforms();
  const source = fs.readFileSync('public/michigan-boat-launches/index.html', 'utf8');
  const output = enhanceBoatLaunches(source);
  assert.match(output, /id="launch-near-me"/);
  assert.match(output, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(output, /fetch\('\/api\/boat-launches'/);
  assert.match(output, /coordinates stay in this browser, are not stored, and are not sent to this site/i);
  assert.doesNotMatch(output, /localStorage|sessionStorage|document\.cookie/);
  assert.match(output, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\/">/);
  assert.match(output, /<title>Michigan Boat Launch Map & Finder \| Chris Izworski<\/title>/);
  const description = output.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  assert.ok(description.includes('near you') && description.includes('Use your location'));
  assert.ok(description.length <= 158, `description is ${description.length} chars`);
  assert.equal(enhanceBoatLaunches(output), output, 'enhancement must be idempotent');
});
