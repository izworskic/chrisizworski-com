'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {windowsFor,backfill,argsOf}=require('../scripts/rockhounding/backfill-glos-spotter.cjs');
const NOW='2026-10-15T00:00:00.000Z';
const line=(t,h=1.4)=>[t,-86.00379943847656,46.69567108154297,h,321.17,4.4].join(',');
const HEADER='time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period';
const UNITS='UTC,degrees_east,degrees_north,m,degree,s';
const csv=arr=>[HEADER,UNITS,...arr].join('\n');
const parseStart=url=>{
 const m=url.match(/time>=([^&]+)/);
 if(!m)throw Error('Missing source time filter');
 return Date.parse(m[1]);
};
test('112-day query is bounded to exactly 16 consecutive seven-day UTC windows',()=>{
 const windows=windowsFor({nowISO:NOW,days:112});
 assert.equal(windows.length,16);
 assert.equal(windows[0].fromISO,'2026-06-25T00:00:00Z');
 assert.equal(windows.at(-1).toISO,'2026-10-15T00:00:00Z');
 for(let i=1;i<windows.length;i++)assert.equal(windows[i].fromISO,windows[i-1].toISO);
 assert.throws(()=>windowsFor({nowISO:NOW,days:365}),/limited/);
 assert.throws(()=>windowsFor({nowISO:'invalid',days:112}),/clock/);
});
test('provider rows from disjoint historical periods become deduped observed-only archive',async()=>{
 const visited=[];
 const fake=async url=>{
  visited.push(url);
  const d=parseStart(url);
  const t=new Date(d+3600000).toISOString().replace('.000Z','Z');
  return {ok:true,status:200,text:async()=>csv([line(t)])};
 };
 const r=await backfill({nowISO:NOW,days:14,fetchFn:fake});
 assert.equal(visited.length,2);
 assert.equal(r.audit.totalOriginalRowsReceived,2);
 assert.equal(r.audit.dedupedStoredRecords,2);
 assert.equal(r.audit.sourceUtcDays,2);
 assert.equal(r.study.eventCount,2);
 assert.equal(r.study.qualifiedDistinctEvents,0);
 assert.equal(r.study.canClaimBeachSafety,false);
 assert.equal(r.audit.noHistoricallyReconstructedNwsWarnings,true);
 assert.equal(r.audit.canPublishVisitWindow,false);
 const rerun=await backfill({previous:r.ledger,nowISO:NOW,days:14,fetchFn:fake});
 assert.equal(rerun.ledger.records.length,2);
 assert.equal(rerun.audit.dedupedStoredRecords,2);
});
test('ERDDAP no-result windows can be marked without making up zero waves',async()=>{
 let n=0;
 const fake=async url=>{
  n++;
  if(n===1)return {ok:false,status:404,text:async()=> 'Your query produced no matching results. (nRows = 0)'};
  const t=new Date(parseStart(url)+3600000).toISOString().replace('.000Z','Z');
  return {ok:true,status:200,text:async()=>csv([line(t,.25)])};
 };
 const r=await backfill({nowISO:NOW,days:14,fetchFn:fake});
 assert.equal(r.audit.noSourceResultWindows,1);
 assert.equal(r.audit.requestedWindows[0].status,'NO_SOURCE_ROWS_REPORTED');
 assert.equal(r.audit.dedupedStoredRecords,1);
 assert.equal(r.study.eventCount,0);
 assert.equal(r.study.canPublishVisitWindow,false);
});
test('HTTP outages and unexpected 404 fail instead of silently skipping history',async()=>{
 for(const [status,message] of [[429,'Too Many Requests'],[503,'Provider unavailable'],[404,'Unknown path']]){
  await assert.rejects(()=>backfill({nowISO:NOW,days:7,
   fetchFn:async()=>({ok:false,status,text:async()=>message})}),/failed HTTP/);
 }
});
test('unexpectedly shifted source UTC times abort before merging',async()=>{
 const wrong=async()=>({ok:true,status:200,text:async()=>csv([line('2026-01-01T00:16:01Z')])});
 await assert.rejects(()=>backfill({nowISO:NOW,days:7,fetchFn:wrong}),/outside requested/);
 let calls=0;
 const mismatched=async url=>{
  calls++;
  const wrongTime='2026-10-07T00:00:00Z';
  const correct=new Date(parseStart(url)+3600000).toISOString().replace('.000Z','Z');
  return {ok:true,status:200,text:async()=>csv([line(correct),...(calls===2?[line(wrongTime,5.0)]:[])])};
 };
 await assert.rejects(()=>backfill({nowISO:NOW,days:14,fetchFn:mismatched}),/outside requested/);
});
test('historical storm rows do not reconstruct past NWS warnings or certify shore safety',async()=>{
 const source=async url=>({ok:true,status:200,text:async()=>csv([line(new Date(parseStart(url)+3600000).toISOString().replace('.000Z','Z'))])});
 const r=await backfill({nowISO:NOW,days:7,fetchFn:source});
 assert.equal(r.audit.trueStormEndedOrBeachSurveyVerified,false);
 assert.equal(r.audit.notLiveBeachWaves,true);
 assert.equal(r.audit.noStoneProbability,true);
 assert.equal(r.ledger.originalObservationsOnly,true);
 assert.equal(r.ledger.canPublishVisitWindow,false);
 assert.equal(r.ledger.canClaimBeachSafety,false);
 assert.equal(argsOf(['--ledger','a','--report','b','--audit','c','--days','14']).days,14);
 assert.throws(()=>argsOf(['--ledger','a','--report','b','--audit','c','--days','200']));
});
