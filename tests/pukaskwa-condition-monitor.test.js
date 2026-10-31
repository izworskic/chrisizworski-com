const test = require('node:test');
const assert = require('node:assert/strict');

const read = () => import('../lib/pukaskwa/condition-monitor.mjs');
const sourceUrl = 'https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions';
const t0 = '2026-10-31T14:00:00.000Z';
const t1 = '2026-10-31T20:00:00.000Z';

function snapshot({ bridge = 'closed', bridgeDate = '2026-10-22', headland = 'open', headlandDate = '2026-10-12', headlandComment = 'Respect closures', fetched = t0, extra = [] } = {}) {
  const row = (name, status, date, comment = 'Respect closures') => ({
    name, difficulty: 'Moderate', rawStatus: status === 'open' ? 'Open.' : status === 'closed' ? 'Closed.' : 'Unknown.',
    status, issuedOn: date, comment,
  });
  return {
    schemaVersion: 1, park: 'pukaskwa', sourceUrl, collectionMethod: 'public-html-table',
    retrievedAt: fetched,
    sourceRecords: [
      row('White River Suspension Bridge Trail', bridge, bridgeDate),
      row('Southern Headland trail', headland, headlandDate, headlandComment),
      ...extra,
    ],
  };
}

test('initial source snapshot establishes baseline without fake changed-status alert', async () => {
  const { recordSuccess, contentFingerprint } = await read();
  const { feed, report } = recordSuccess(null, snapshot(), t0);
  assert.equal(report.baseline, true);
  assert.equal(report.changed, false);
  assert.equal(feed.health, 'ok');
  assert.equal(feed.lastSuccessAt, t0);
  assert.equal(feed.snapshot.retrievedAt, t0);
  assert.equal(feed.fingerprint, contentFingerprint(feed.snapshot));
  assert.equal(feed.recentChanges.length, 0);
});

test('unchanged source produces a heartbeat but not a change event', async () => {
  const { recordSuccess } = await read();
  const old = recordSuccess(null, snapshot(), t0);
  const next = recordSuccess(old.feed, snapshot({ fetched: t1 }), t1);
  assert.equal(next.report.changed, false);
  assert.equal(next.feed.lastChangeAt, t0);
  assert.equal(next.feed.checkedAt, t1);
  assert.equal(next.feed.snapshot.retrievedAt, t1);
  assert.equal(next.feed.fingerprint, old.feed.fingerprint);
});

test('earlier or same-dated open cannot erase a recorded bridge closure', async () => {
  const { recordSuccess } = await read();
  const before = recordSuccess(null, snapshot(), t0).feed;
  const current = snapshot({ bridge: 'open', bridgeDate: '2026-10-22', fetched: t1 });
  const next = recordSuccess(before, current, t1);
  assert.equal(next.feed.snapshot.sourceRecords[0].status, 'closed');
  assert.equal(next.feed.health, 'review-required');
  assert.equal(next.report.holds.length, 1);
  assert.equal(next.report.changed, false);
  assert.equal(next.feed.snapshot.sourceRecords[0].issuedOn, '2026-10-22');
});

test('only explicit strictly later source open clears prior closure', async () => {
  const { recordSuccess } = await read();
  const before = recordSuccess(null, snapshot(), t0).feed;
  const next = recordSuccess(before, snapshot({ bridge: 'open', bridgeDate: '2026-10-24', fetched: t1 }), t1);
  assert.equal(next.feed.snapshot.sourceRecords[0].status, 'open');
  assert.equal(next.report.holds.length, 0);
  assert.equal(next.report.changes.find(c => c.name.includes('White River')).type, 'status');
  assert.equal(next.feed.health, 'ok');
});

test('unknown or missing current bridge cannot silently reopen a prior closure', async () => {
  const { recordSuccess } = await read();
  const before = recordSuccess(null, snapshot(), t0).feed;
  const unknown = recordSuccess(before, snapshot({ bridge: 'unknown', bridgeDate: '2026-10-25' }), t1);
  assert.equal(unknown.feed.snapshot.sourceRecords[0].status, 'closed');
  assert.equal(unknown.report.holds.length, 1);
  const noBridge = snapshot();
  noBridge.sourceRecords.shift();
  assert.throws(() => recordSuccess(before, noBridge, t1), /Missing bridge/);
});

test('source failure retains the old issue time and increments failure count without fake freshness', async () => {
  const { recordSuccess, recordFailure } = await read();
  const previous = recordSuccess(null, snapshot(), t0).feed;
  const broken = recordFailure(previous, new Error('Official page HTTP 503'), t1);
  assert.equal(broken.feed.health, 'source-error');
  assert.equal(broken.feed.consecutiveFailures, 1);
  assert.equal(broken.feed.lastSuccessAt, t0);
  assert.equal(broken.feed.snapshot.retrievedAt, t0);
  assert.equal(broken.report.changed, false);
  assert.equal(recordFailure(broken.feed, 'Still unavailable', '2026-11-01T02:00:00Z').feed.consecutiveFailures, 2);
});

test('recovery resets the failure count and reports recovery without inventing status changes', async () => {
  const { recordSuccess, recordFailure } = await read();
  const prior = recordSuccess(null, snapshot(), t0).feed;
  const failed = recordFailure(prior, 'Temporary source outage', t1).feed;
  const recovered = recordSuccess(failed, snapshot({ fetched: '2026-11-01T02:00:00Z' }), '2026-11-01T02:00:00Z');
  assert.equal(recovered.report.recovered, true);
  assert.equal(recovered.feed.consecutiveFailures, 0);
  assert.equal(recovered.feed.health, 'ok');
  assert.equal(recovered.report.changed, false);
});

test('metadata, comment and dated changes are detected without treating retrieval as change', async () => {
  const { recordSuccess } = await read();
  const prior = recordSuccess(null, snapshot(), t0).feed;
  const comment = recordSuccess(prior, snapshot({ headlandComment: 'New warning about boardwalk' }), t1);
  assert.equal(comment.report.changes.length, 1);
  assert.equal(comment.report.changes[0].type, 'comment');
  const date = recordSuccess(comment.feed, snapshot({ headlandComment: 'New warning about boardwalk', headlandDate: '2026-10-31' }), '2026-10-31T22:00:00Z');
  assert.equal(date.report.changes[0].type, 'source-date');
});

test('a corrupt saved feed fails rather than silently resetting source history', async () => {
  const { recordSuccess, recordFailure } = await read();
  const previous = recordSuccess(null, snapshot(), t0).feed;
  previous.fingerprint = 'tampered';
  assert.throws(() => recordSuccess(previous, snapshot(), t1), /fingerprint mismatch/);
  assert.throws(() => recordFailure(previous, 'network down', t1), /fingerprint mismatch/);
});

test('scheduled runner converts collection failure into a persisted error report', async () => {
  const { runMonitor } = await import('../scripts/pukaskwa/monitor-conditions.mjs');
  const result = await runMonitor({ checkedAt: t0, collectImpl: async () => { throw new Error('timeout'); } });
  assert.equal(result.feed.health, 'source-error');
  assert.equal(result.report.failureCount, 1);
  assert.equal(result.feed.snapshot, null);
});

test('source transitions have a bounded audit trail', async () => {
  const { recordSuccess } = await read();
  let feed = recordSuccess(null, snapshot(), t0).feed;
  for (let i = 0; i < 50; i++) {
    feed = recordSuccess(feed, snapshot({ headlandComment: 'Revision ' + i }), '2026-11-01T03:00:00Z').feed;
  }
  assert.equal(feed.recentChanges.length, 40);
});
