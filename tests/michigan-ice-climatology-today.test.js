import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIceRecord, ICE_LAKES, dailyLabel, parseDailyClimatology,
  parseSeasonCover } from '../lib/michigan-ice/climatology.mjs';
import { michiganIceClock } from '../lib/michigan-ice/season.mjs';
import handler from '../api/ice.js';

// Dates and ice-year columns follow the runtime clock. Nothing is tied to a
// particular November / February observation that will rot tomorrow.
function seasonalFixture(date = new Date(Date.now())) {
  const clock = michiganIceClock(date);
  const years = Array.from({ length: 54 }, (_, i) => clock.seasonYear - 53 + i);
  const stamp = dailyLabel(clock.today);
  const values = years.map((y, i) => i === 2 ? 'NA' : (i === 3 ? '0.0' : (i * 1.4 % 100).toFixed(1)));
  const climate = years.join(' ') + '\n' +
    stamp + ' ' + values.join(' ') + '\n' +
    'Feb-18 ' + years.map((y, i) => (i % 4 === 0 ? 'NA' : (25 + i / 4).toFixed(1))).join(' ') + '\n';
  // winterObservationDate wants year + day-of-year, not a year-relative day.
  const d = new Date(clock.today + 'T12:00:00Z');
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - jan1) / 86400000) + 1;
  const season = [d.getUTCFullYear(), doy, 37.1, 22, 14, 0, 8, 3, 18].join(' ') + '\n';
  return { clock, stamp, climate, season };
}

test('NOAA daily parser keeps NA distinct from recorded 0 and respects 54 historical columns', () => {
  const f = seasonalFixture();
  const parsed = parseDailyClimatology(f.climate);
  assert.equal(parsed.years.length, 54);
  assert.equal([...parsed.dates.values()][0].size, 54);
  const values = parsed.dates.get(f.stamp);
  assert.equal(values.get(parsed.years[2]), null);
  assert.equal(values.get(parsed.years[3]), 0);
});

test('NOAA daily records cover Superior, Michigan, Huron, Erie, Ontario and total independently', async () => {
  const clockNow = new Date(Date.now());
  // Anchor test to a winter in the current-year neighborhood, never a literal date.
  const winter = new Date(Date.UTC(clockNow.getUTCFullYear(), 1, 20, 12));
  const f = seasonalFixture(winter);
  const fetchStub = async url => {
    const u = String(url);
    if (u.includes('glerl.noaa.gov/data/ice/glicd/daily/')) {
      // Simulate Ontario upstream absence without hiding five other records.
      if (u.endsWith('/ont.txt')) return new Response('missing', { status: 404 });
      return new Response(f.climate, { status: 200 });
    }
    if (u.includes('_ice.dat')) return new Response(f.season, { status: 200 });
    throw new Error('Unexpected NOAA fixture route ' + u);
  };
  const history = await buildIceRecord(winter, fetchStub);
  assert.deepEqual(ICE_LAKES.map(x => x.key),
    ['superior', 'michigan', 'huron', 'erie', 'ontario', 'total']);
  assert.equal(Object.keys(history.lakes).length, 6);
  assert.equal(history.lakes.ontario, null);
  for (const key of ['superior','michigan','huron','erie','total']) {
    const value = history.lakes[key];
    assert.ok(value && value.yearsOfRecord >= 1);
    assert.ok(value.rank >= 1 && value.rank <= value.yearsOfRecord);
    assert.ok(value.mean >= 0 && value.max >= value.min);
    assert.equal(value.lastYearIceYear, f.clock.seasonYear);
    assert.equal(history.series[key].length, 2);
    assert.ok(history.peaks[key]);
  }
  assert.equal(history.lakes.erie.current, 0);
  assert.equal(history.lakes.ontario, null);
  assert.equal(history.series.ontario.length, 0);
});

test('current ice seasonal feed preserves individually missing lake values', () => {
  const f = seasonalFixture(new Date(Date.now()));
  const partial = f.season.replace(' 22 ', ' NA ');
  const parsed = parseSeasonCover(partial, f.clock.seasonYear, f.clock.today);
  if (f.clock.today >= f.clock.seasonStart && f.clock.today <= (f.clock.seasonYear+1) + '-05-31') {
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].michigan, null);
    assert.equal(parsed[0].superior, 37.1);
    assert.equal(parsed[0].erie, 0);
  } else assert.equal(parsed.length, 0);
});

test('existing /api/ice retains 6-hour cache, six lake records and no CORS leak', async () => {
  const f = seasonalFixture();
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/glicd/daily/')) return new Response(f.climate, { status: 200 });
    if (u.includes('_ice.dat')) return new Response(f.season, { status: 200 });
    return new Response('{"data":[]}', { status: 200 });
  };
  try {
    const response = await handler({ url: 'https://chrisizworski.com/api/ice' });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(Object.keys(data.climatology),
      ['superior', 'michigan', 'huron', 'erie', 'ontario', 'total']);
    assert.equal(Object.keys(data.history.lakes).length, 6);
    assert.ok(!response.headers.has('access-control-allow-origin'));
    assert.match(response.headers.get('cache-control'), /max-age=21600|no-store/);
    if (data.history.offSeason) {
      assert.equal(data.history.lakes.total, null);
      assert.equal(data.history.peaks.total?.date, 'Feb-18');
    }
  } finally { globalThis.fetch = previous; }
});

test('generated history page owns today query and keeps the canonical and safety banner', () => {
  const html = readFileSync('public/michigan-ice/ice-cover-history.html', 'utf8');
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  assert.equal(title, 'Great Lakes Ice Cover Today vs Record | Chris Izworski');
  assert.match(html, /<h1[^>]*>Great Lakes ice cover today, against 54 years of record<\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski.com\/michigan-ice\/ice-cover-history.html"/);
  assert.ok(!html.includes('\u2014'), 'no em dash in history HTML');
  assert.match(html, /id="hist-board"/);
  assert.match(html, /id="hist-chart"/);
  assert.match(html, /id="hist-chart-data"/);
  assert.match(html, /Michigan DNR/);
  const answer = (html.match(/<p class="lede" id="hist-answer">([^<]+)<\/p>/) || [])[1] || '';
  assert.ok(answer.trim().split(/\s+/).length >= 134 && answer.trim().split(/\s+/).length <= 167);
  assert.match(answer, /Across 54 recorded ice years/);
  const description = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  assert.ok(description.length <= 158);
});
