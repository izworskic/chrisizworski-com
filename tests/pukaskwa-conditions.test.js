const test = require('node:test');
const assert = require('node:assert/strict');

const dayNames = [
  'Beach Trail',
  'Boardwalk Beach Trail',
  'Southern Headland trail',
  'Bimose Kinoomagewnan Trail',
  'Manito Miikana Trail',
  'White River Suspension Bridge Trail',
];

function row(name, date = '2026-10-12', state = 'Open.') {
  return '<tr><td data-order="2"><img src="/icon.gif"> Moderate</td><td>' + name + '</td><td>' + state + '</td><td><strong>' + date + ':</strong> Follow posted notices and closures.</td><td>&nbsp;</td></tr>';
}
function officialFixture() {
  const entries = dayNames.map(name => row(name, name === 'White River Suspension Bridge Trail' ? '2026-10-22' : '2026-10-12', name === 'White River Suspension Bridge Trail' ? 'Closed.' : 'Open.'));
  for (let i = 0; i < 5; i++) entries.push(row('Mdaabii Miikna: ' + i + ' KM - ' + (i + 1) + ' KM: Segment ' + i));
  for (let i = 0; i < 12; i++) entries.push(row('Coastal Hiking Trail: ' + i + ' KM - ' + (i + 1) + ' KM: Segment ' + i));
  return '<!doctype html><html><head><title>Pukaskwa National Park</title></head><body><h1>Trail Conditions at Pukaskwa National Park</h1><table><tbody>' + entries.join('') + '</tbody></table></body></html>';
}
const read = () => import('../lib/pukaskwa/conditions.mjs');

test('parses dated individual rows, separate from retrieval time', async () => {
  const { parsePukaskwaConditions } = await read();
  const snapshot = parsePukaskwaConditions(officialFixture(), '2026-10-31T13:00:00.000Z');
  assert.equal(snapshot.sourceRecords.length, 23);
  assert.equal(snapshot.retrievedAt, '2026-10-31T13:00:00.000Z');
  const bridge = snapshot.sourceRecords.find(r => r.name === 'White River Suspension Bridge Trail');
  assert.equal(bridge.status, 'closed');
  assert.equal(bridge.issuedOn, '2026-10-22');
});

test('closed bridge is never recommended on Oct 31 despite age', async () => {
  const { parsePukaskwaConditions, evaluatePukaskwaTrail } = await read();
  const snapshot = parsePukaskwaConditions(officialFixture(), '2026-10-31T13:00:00Z');
  const choice = evaluatePukaskwaTrail(snapshot, 'white-river-bridge', { visitDate: '2026-10-31' });
  assert.equal(choice.status, 'closed');
  assert.equal(choice.evidence[0].issuedOn, '2026-10-22');
});

test('October 12 open trails are stale by October 31, not presented as open now', async () => {
  const { parsePukaskwaConditions, evaluatePukaskwaTrail } = await read();
  const snapshot = parsePukaskwaConditions(officialFixture());
  assert.equal(evaluatePukaskwaTrail(snapshot, 'southern-headland', { visitDate: '2026-10-31' }).status, 'stale');
  assert.equal(evaluatePukaskwaTrail(snapshot, 'southern-headland', { visitDate: '2026-10-13' }).status, 'recently-reported-open');
});

test('out-of-season backcountry takes precedence over old open row', async () => {
  const { parsePukaskwaConditions, evaluatePukaskwaTrail } = await read();
  const snapshot = parsePukaskwaConditions(officialFixture());
  assert.equal(evaluatePukaskwaTrail(snapshot, 'coastal-hiking-trail', { visitDate: '2026-10-31' }).status, 'out-of-season');
  assert.equal(evaluatePukaskwaTrail(snapshot, 'mdaabii-miikna', { visitDate: '2026-10-15' }).status, 'out-of-season');
  assert.equal(evaluatePukaskwaTrail(snapshot, 'mdaabii-miikna', { visitDate: '2026-10-13' }).status, 'unverified');
});

test('do not infer short spur or combination connector access from other trails', async () => {
  const { parsePukaskwaConditions, evaluatePukaskwaTrail } = await read();
  const snapshot = parsePukaskwaConditions(officialFixture());
  assert.equal(evaluatePukaskwaTrail(snapshot, 'hattie-cove-fire-walk', { visitDate: '2026-10-13' }).status, 'unverified');
  assert.equal(evaluatePukaskwaTrail(snapshot, 'combination-hike', { visitDate: '2026-10-13' }).status, 'unverified');
});

test('reject broken or ambiguous HTML rather than silently accepting a green trail', async () => {
  const { parsePukaskwaConditions } = await read();
  assert.throws(() => parsePukaskwaConditions('<html>Pukaskwa</html>'), /Invalid|missing/);
  assert.throws(() => parsePukaskwaConditions(officialFixture().replace('Boardwalk Beach Trail', 'Missing Trail')), /Required official/);
  assert.throws(() => parsePukaskwaConditions(officialFixture().replace('</tbody>', row('Beach Trail') + '</tbody>')), /Duplicate/);
});

test('unrecognized condition text cannot mean open', async () => {
  const { parsePukaskwaConditions, evaluatePukaskwaTrail } = await read();
  const html = officialFixture().replace('<td>Open.</td>', '<td>Unknown.</td>');
  const snapshot = parsePukaskwaConditions(html);
  assert.equal(evaluatePukaskwaTrail(snapshot, 'beach', { visitDate: '2026-10-13' }).status, 'unverified');
});

test('collector refuses a non-official redirect and does not emit a status snapshot', async () => {
  const { collect } = await import('../scripts/pukaskwa/refresh-conditions.mjs');
  await assert.rejects(collect({ fetchImpl: async () => ({
    ok: true, status: 200, url: 'https://example.org/fake',
    headers: new Map([['content-type', 'text/html']]),
    text: async () => officialFixture(),
  }) }), /redirected/);
});
