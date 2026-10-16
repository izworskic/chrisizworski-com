'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const s=require('../data/rockhounding/noaa-marquette-water-level-source-2026.json');
const {checkRegistry,sourceURL,toRows,waterLevelContext}=
 require('../lib/rockhounding/noaa-marquette-water-level.cjs');
const NOW='2026-10-16T12:00:00Z';
function originalRows(n=280,hoursOld=27){
 const start=Date.parse(NOW)-hoursOld*3600000;
 return Array.from({length:n},(_,i)=>({
  t:new Date(start+i*6*60000).toISOString().slice(0,16).replace('T',' '),
  v:(183.42+i*.0002).toFixed(3),s:'.003',f:'0,0,0,0',q:'p'
 }));
}
function response(rows=originalRows()){
 return {metadata:{id:'9099018',name:'Marquette C.G.',lat:'46.5456',lon:'-87.3786'},data:rows};
}
test('source keeps Marquette Michigan NOAA IGLD 1985 distinct from Grand Marais Minnesota station',()=>{
 assert.equal(checkRegistry(),true);
 const url=sourceURL(NOW);
 assert.match(url,/station=9099018/);
 assert.match(url,/datum=IGLD/);
 assert.match(url,/units=metric/);
 assert.match(url,/time_zone=gmt/);
 assert.match(url,/begin_date=20261014/);
 assert.match(url,/end_date=20261016/);
 assert.equal(s.interpretation.doNotUseStation9099090,true);
 assert.equal(s.interpretation.station9099090IsInMinnesota,true);
 assert.equal(s.interpretation.notMeasuredBeachWaterline,true);
});
test('24 hour Marquette IGLD lake-level trend is descriptive and does not predict rocks',()=>{
 const original=toRows(response());
 const result=waterLevelContext(original,{nowISO:NOW});
 assert.equal(result.stationId,'9099018');
 assert.equal(result.status,'REMOTE_LAKE_LEVEL_OBSERVED_24H_CHANGE');
 assert.equal(result.gaugeMeaning,'REMOTE_LAKE_SUPERIOR_LEVEL_CONTEXT_ONLY');
 assert.ok(result.gaugeWaterLevelM>183.4);
 assert.ok(result.delta24hCm>0);
 assert.equal(result.levelDatum,'IGLD 1985');
 assert.equal(result.measuredAtAgateBeach,false);
 assert.equal(result.beachWaterlineElevationM,null);
 assert.equal(result.canPredictNewAgates,false);
 assert.equal(result.canClaimBeachSafety,false);
 assert.equal(result.canPublishVisitWindow,false);
});
test('wrong station, dubious datum-like readings, bad quality and identical timestamp conflicts fail closed',()=>{
 const wrong=response();
 wrong.metadata.id='9099090';
 assert.throws(()=>toRows(wrong),/NOT Marquette Michigan/);
 const bad=response([
  {t:'2026-10-16 10:00',v:'0.93',q:'p',f:'0,0,0,0'},
  {t:'2026-10-16 10:06',v:'183.45',q:'x',f:'0,0,0,0'},
  {t:'2026-10-16 10:12',v:'183.47',q:'p',f:'1,0,0,0'},
  {t:'2026-10-16 10:18',v:'183.48',q:'p',f:'0,0,0,0'}
 ]);
 const parsed=toRows(bad);
 assert.equal(parsed.rows.length,1);
 assert.equal(parsed.rejectedQualityRows,3);
 const dup=response([
  {t:'2026-10-16 11:00',v:'183.40',q:'p'},
  {t:'2026-10-16 11:00',v:'183.49',q:'p'}]);
 assert.throws(()=>toRows(dup),/Conflicting/);
});
test('data gaps, stale timestamps and missing records never imply low-water safety',()=>{
 const few=toRows(response(originalRows(10,1)));
 const r=waterLevelContext(few,{nowISO:NOW});
 assert.equal(r.status,'REMOTE_LAKE_LEVEL_RECENT_BUT_24H_COMPARISON_GAPPY');
 assert.equal(r.delta24hCm,null);
 const stale=toRows(response(originalRows(80,60)));
 const old=waterLevelContext(stale,{nowISO:NOW});
 assert.equal(old.status,'REMOTE_WATER_LEVEL_STALE');
 assert.equal(old.gaugeWaterLevelM,null);
 const missing=waterLevelContext(toRows(response([])),{nowISO:NOW});
 assert.equal(missing.status,'NO_REMOTE_WATER_LEVEL_DATA');
 assert.equal(missing.canClaimBeachSafety,false);
});
test('remote source can never be retargeted to Minnesota or claim a beach safety verdict',()=>{
 const corruptions=[
  v=>{v.stationId='9099090'},v=>{v.sourceDatum='MLLW'},
  v=>{v.interpretation.station9099090IsInMinnesota=false},
  v=>{v.interpretation.canPublishVisitWindow=true},
  v=>{v.interpretation.notMeasuredBeachWaves=false}
 ];
 for(const edit of corruptions){
  const x=structuredClone(s);edit(x);
  assert.throws(()=>checkRegistry(x));
 }
});
