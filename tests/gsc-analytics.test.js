const test = require('node:test');
const assert = require('node:assert/strict');

async function load(name) { return import(`../lib/gsc/${name}.mjs`); }

test('buildWindows uses final-data lag and aligned 28 day windows', async () => {
  const { buildWindows } = await load('search-console');
  const w = buildWindows({ now: new Date('2026-10-04T16:00:00Z'), finalLagDays: 2 });
  assert.deepEqual(w.current, { startDate: '2026-09-05', endDate: '2026-10-02' });
  assert.deepEqual(w.previous, { startDate: '2026-08-08', endDate: '2026-09-04' });
  assert.deepEqual(w.current7, { startDate: '2026-09-26', endDate: '2026-10-02' });
});

test('pageFamily groups national tools without losing nested families', async () => {
  const { pageFamily } = await load('classify');
  assert.equal(pageFamily('https://chrisizworski.com/fall-color/porcupine-mountains-fall-color/'), 'fall-color');
  assert.equal(pageFamily('https://chrisizworski.com/national-tools/niagara-rainbow/'), 'niagara-rainbow');
  assert.equal(pageFamily('https://chrisizworski.com/national-tools/coastal/thunder-hole-live/'), 'coastal/thunder-hole-live');
});

test('compareDimension identifies breakout, decay, seasonal return, and CTR leak', async () => {
  const { compareDimension } = await load('classify');
  const current = [
    { page: 'https://x.test/new/', clicks: 30, impressions: 900, ctr: 0.033, position: 8 },
    { page: 'https://x.test/seasonal/', clicks: 20, impressions: 500, ctr: 0.04, position: 6 },
    { page: 'https://x.test/decay/', clicks: 5, impressions: 200, ctr: 0.025, position: 12 },
    { page: 'https://x.test/benchmark/', clicks: 50, impressions: 500, ctr: 0.10, position: 8 },
  ];
  const previous = [
    { page: 'https://x.test/new/', clicks: 5, impressions: 200, ctr: 0.025, position: 18 },
    { page: 'https://x.test/seasonal/', clicks: 2, impressions: 80, ctr: 0.025, position: 20 },
    { page: 'https://x.test/decay/', clicks: 20, impressions: 600, ctr: 0.033, position: 8 },
    { page: 'https://x.test/benchmark/', clicks: 45, impressions: 480, ctr: 0.094, position: 8 },
  ];
  const yearAgo = [
    { page: 'https://x.test/new/', clicks: 0, impressions: 10, ctr: 0, position: 30 },
    { page: 'https://x.test/seasonal/', clicks: 18, impressions: 450, ctr: 0.04, position: 7 },
    { page: 'https://x.test/decay/', clicks: 10, impressions: 300, ctr: 0.033, position: 10 },
  ];
  const { rows } = compareDimension(current, previous, yearAgo, 'page');
  const by = Object.fromEntries(rows.map((r) => [r.page, r]));
  assert.equal(by['https://x.test/new/'].classification, 'BREAKOUT');
  assert.equal(by['https://x.test/seasonal/'].classification, 'SEASONAL');
  assert.equal(by['https://x.test/decay/'].classification, 'DECAYING');
  assert.ok(by['https://x.test/new/'].potentialClicks > 0);
});

test('querySearchAnalytics paginates beyond a single response', async () => {
  const { querySearchAnalytics } = await load('search-console');
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    const rows = body.startRow === 0 ? Array.from({ length: 2 }, (_, i) => ({ keys: [`q${i}`] })) : [{ keys: ['q2'] }];
    return { ok: true, status: 200, json: async () => ({ rows }) };
  };
  const rows = await querySearchAnalytics({ accessToken: 'x', siteUrl: 'sc-domain:x.test', startDate: '2026-01-01', endDate: '2026-01-02', dimensions: ['query'], rowLimit: 2, maxRows: 10, fetchImpl });
  assert.equal(calls, 2);
  assert.equal(rows.length, 3);
});
