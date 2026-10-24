import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import handler from '../api/ice-history.js';

const client=fs.readFileSync('public/michigan-ice/freeze-up.js','utf8');

test('historical season selector, enlarged chart and playback share the one NOAA archive',()=>{
  execFileSync(process.execPath,['--check','api/ice-history.js']);
  execFileSync(process.execPath,['--check','public/michigan-ice/freeze-up.js']);
  assert.match(client,/id=\"ice-ex-season\"/);
  assert.match(client,/id=\"ice-ex-modal-season\"/);
  assert.match(client,/function latestSeasonStart\(\)/);
  assert.match(client,/function setSeason\(value\)/);
  assert.match(client,/function syncSeasonMenus\(\)/);
  assert.match(client,/\/api\/ice-history\?season=/);
  assert.match(client,/selectedSeason === 'auto'/);
  assert.match(client,/ticket!==seasonRequest/);
  assert.match(client,/archiveLoading=true/);
  assert.match(client,/archiveError/);
  assert.match(client,/syncDailyFrame\(\)/);
  assert.match(client,/The CARTO map above remains current-only/);
  assert.match(client,/No NOAA daily series is available for this selection/);
  assert.match(client,/get\('ice-season'\)/);
  assert.doesNotMatch(client,/safeIceThickness|estimatedIceThickness/);
});

test('the NOAA winter API parses actual leap dates and independent lake percentages',async()=>{
  const original=globalThis.fetch;
  let called=[];
  globalThis.fetch=async input=>{
    const u=String(input);called.push(u);
    assert.match(u,/g2023_2024_ice\.dat$/);
    return new Response('Great Lakes Average Ice Concentration\nYear Day Sup. Mich. Huron Erie Ont. St.Clr GL Total\n'+
      '2023 329 0.06 0.00 0.03 0.00 0.00 0.00 0.03\n'+
      '2024 060 33.40 24.20 22.10 9.50 7.00 50.01 23.40\n'+
      '2024 061 30.40 22.20 21.10 6.50 5.00 48.01 20.40\n'+
      '2024 061 30.40 22.20 21.10 6.50 5.00 48.01 20.40\n'+
      '2024 099 NaN 22.20 21.10 6.50 5.00 48.01 20.40\n'+
      '2024 155 1.00 1.00 1.00 1.00 1.00 1.00 1.00\n',
      {status:200});
  };
  try{
    const result=await handler({url:'https://chrisizworski.com/api/ice-history?season=2023'});
    assert.equal(result.status,200);
    assert.match(result.headers.get('cache-control'),/s-maxage/);
    const d=await result.json();
    assert.equal(d.ok,true);
    assert.equal(d.seasonLabel,'2023–24');
    assert.equal(d.series.length,3,'duplicated dates, corrupt values and off-season dates must be rejected');
    assert.deepEqual(d.series.map(x=>x.date),['2023-11-25','2024-02-29','2024-03-01']);
    assert.equal(d.series[1].huron,22.1);
    assert.equal(d.series[1].superior,33.4);
    assert.equal(d.series[1].erie,9.5);
    assert.match(d.scope,/No local bay coverage/);
    assert.equal(called.length,1,'no NWS or current NOAA calls are allowed');
  }finally{globalThis.fetch=original;}
});

test('bad seasons and empty NOAA archives fail closed without invented days',async()=>{
  const original=globalThis.fetch;
  let count=0;
  globalThis.fetch=async ()=>{count++;return new Response('no NOAA observations',{status:200})};
  try{
    for(const value of ['2027','2010','blah','2024%2f2025']){
      const r=await handler({url:'https://example.org/api/ice-history?season='+value});
      assert.equal(r.status,400);
    }
    assert.equal(count,0,'invalid seasons must not contact NOAA');
    const r=await handler({url:'https://example.org/api/ice-history?season=2020'});
    assert.equal(r.status,503);
    const data=await r.json();
    assert.equal(data.ok,false);
    assert.match(data.error,/no usable daily record/);
    assert.equal(data.series,undefined);
  }finally{globalThis.fetch=original;}
});
