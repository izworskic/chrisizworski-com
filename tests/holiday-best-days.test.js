import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The static "best day to fly" answer on /holiday-travel/ is computed from the same
// BTS dataset the engine reads. This test recomputes every published row so the
// visible numbers cannot drift from public/holiday-travel/data/national.json.
const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const nat = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8'));
const S = nat.meta.scale;
const k60 = nat.meta.xgrid.indexOf(60);

function rate(hol, off) {
  const i = off + 6;
  let sum = 0;
  let worst = 0;
  for (const s of nat.holidays[hol].seasons) {
    const n = s.n[i];
    const total = n.reduce((a, b) => a + b, 0);
    let bad = 0;
    for (let b = 0; b < n.length; b++) bad += (s.cd[i][b] + s.sop[i][b][k60]) * n[b];
    const v = bad / total / S;
    sum += v;
    worst = Math.max(worst, v);
  }
  return { avg: sum / nat.holidays[hol].seasons.length, worst };
}

const rows = [...page.matchAll(/data-holiday="(th|xm)" data-offset="(-?\d+)" data-avg="(\d+)" data-worst="(\d+)"/g)];

test('best-days answer publishes both holidays', () => {
  assert.ok(page.includes('id="best-days"'));
  assert.equal(rows.filter((r) => r[1] === 'th').length, 7);
  assert.equal(rows.filter((r) => r[1] === 'xm').length, 7);
});

test('every published best-days figure matches the BTS dataset', () => {
  for (const [, hol, off, avg, worst] of rows) {
    const r = rate(hol, Number(off));
    assert.equal(Math.round(r.avg * 100), Number(avg), `${hol} ${off} average`);
    assert.equal(Math.round(r.worst * 100), Number(worst), `${hol} ${off} worst season`);
  }
});

test('the headline claims stay true to the data', () => {
  const thOffsets = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((o) => [o, rate('th', o).avg]);
  thOffsets.sort((a, b) => a[1] - b[1]);
  assert.equal(thOffsets[0][0], 0, 'Thanksgiving Day is the lowest-trouble day');
  assert.equal(thOffsets.at(-1)[0], 3, 'the Sunday after is the highest-trouble day');
  assert.match(page, /Thanksgiving Day itself had the lowest share/);
  assert.match(page, /worst day was the Sunday after Thanksgiving/);
  assert.doesNotMatch(page, /—/);
});
