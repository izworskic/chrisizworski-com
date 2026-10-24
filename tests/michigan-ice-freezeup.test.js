import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import handler from '../api/ice-now.js';

const load = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('freeze-up explorer parses, leaves source pages generated, and keeps one canonical hub', () => {
  for (const path of ['public/michigan-ice/ice.js','public/michigan-ice/freeze-up.js','api/ice-now.js']) {
    execFileSync(process.execPath, ['--check', path]);
  }
  const page = load('public/michigan-ice/index.html');
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-ice\/">/);
  assert.match(page, /Michigan ice conditions today/);
  const oldClient=load('public/michigan-ice/ice.js');
  assert.match(oldClient, /__michiganIceNow/);
  assert.match(oldClient, /\/michigan-ice\/freeze-up\.js/);
  const explorer=load('public/michigan-ice/freeze-up.js');
  assert.match(explorer, /NOAA\/NWS USNIC/);
  assert.match(explorer, /basemaps\.cartocdn\.com/);
  assert.match(explorer, /isFreshRegion/);
  assert.match(explorer, /Date\.now\(\) - valid <= 48 \* 3600000/);
  assert.match(explorer, /map and historical timeline describe different observations/i);
  assert.match(explorer, /not a safe-ice assessment/i);
  assert.doesNotMatch(explorer, /[?&]time=|forecastIceThickness|safeToWalk/);
});

test('off-season NOAA history stays separate from the current ice feed', async () => {
  const realFetch=globalThis.fetch, RealDate=globalThis.Date;
  class Clock extends RealDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-22T17:00:00Z'])); }
  }
  try {
    globalThis.Date=Clock;
    globalThis.fetch=async (input) => {
      const url=String(input);
      if (url.includes('g2025_2026_ice.dat')) {
        const rows=[
          '2025 350 10 20 30 40 50 60 70',
          '2026 070 11 21 31 41 51 61 71'
        ].join('\n');
        return new Response(rows, {status:200});
      }
      if (url.includes('g2026_2027_ice.dat')) return new Response('Unavailable', {status:404});
      if (url.includes('/usnic_greatlakes_ice_chart/')) {
        return new Response(JSON.stringify({features:[]}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      throw new Error('Deliberate test: no current forecast');
    };
    const res=await handler({url:'https://chrisizworski.com/api/ice-now?region=saginaw-bay'});
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.iceSeason,false);
    assert.equal(data.observed.lakeWide,null);
    assert.equal(data.historical.seasonStartYear,2025);
    assert.equal(data.historical.series.length,2);
    assert.deepEqual(data.historical.series.map(x=>x.date),['2025-12-16','2026-03-11']);
    assert.equal(data.historical.series[1].huron,31);
    assert.equal(data.observed.regions['saginaw-bay'].available,false);
    assert.match(data.safety,/Nothing returned by this endpoint is a safety rating/);
  } finally {
    globalThis.fetch=realFetch;
    globalThis.Date=RealDate;
  }
});

test('time series includes ice categories for all five Great Lakes and Lake St Clair without inventing bay percentages',()=>{
  const api=load('api/ice-now.js');
  assert.match(api,/rows\.slice\(-180\)/);
  assert.match(api,/series: rows\.slice/);
  assert.match(api,/superior: r\.superior, michigan: r\.michigan, huron: r\.huron/);
  assert.match(api,/erie: r\.erie, ontario: r\.ontario, stclair: r\.stclair, total: r\.total/);
  const explorer=load('public/michigan-ice/freeze-up.js');
  assert.match(explorer,/whole-lake mean/);
  assert.match(explorer,/The date slider synchronizes the GLERL whole-lake percentage and a genuine archived GLERL daily ice map/);
  assert.match(explorer,/if \(overlay\) \{map\.removeLayer\(overlay\);overlay=null;\}/);
});
