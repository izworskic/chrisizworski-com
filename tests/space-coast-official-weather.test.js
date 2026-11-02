'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../lib/space-coast-official-weather');
const { createHandler } = require('../api/space-coast-official-weather')._test;
const NOW = Date.parse('2026-11-01T20:00:00Z');
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const mission = {id:ID,name:'Falcon 9 Block 5 | Starlink Group 10-43',
  net:'2026-11-03T12:30:00Z',netPrecision:'minute',presentInUpcoming:true};
const source='https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/Falcon%209%20Starlink%2010-43%20L-2%20Forecast%20-%203%20Nov%20Launch.pdf';
function report(pov=60,extra={}) {
  return {missionId:ID,sourceMission:'Falcon 9 Starlink 10-43',
    sourceUrl:source,sourceSha256:'a'.repeat(64),
    issuedAt:'2026-11-01T18:30:00Z',validDate:'2026-11-03',
    povPercent:pov,primaryConcerns:['Thick Cloud Layers Rule'],
    additionalRisks:{boosterRecovery:'Moderate'},...extra};
}
const state=()=>model.initially();
function res() {return {statusCode:200,body:null,headers:{},setHeader(k,v){this.headers[k]=v;},
  status(c){this.statusCode=c;return this;},json(v){this.body=v;return this;}};}
test('official PDF URLs are strictly allowlisted and direct; LL2 comments are never PoV evidence',()=>{
  assert.equal(model.validPdfUrl(source),source);
  for(const u of [
    'https://45thweathersquadron.nebula.spaceforce.mil.evil.com/assets/LaunchForecasts/test.pdf',
    'http://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/test.pdf',
    'https://45thweathersquadron.nebula.spaceforce.mil/other/test.pdf',
    'https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/launch.pdf?x=1'
  ])assert.equal(model.validPdfUrl(u),null);
});
test('only exact mission marker, date, issued-at and official document hash qualify',()=>{
  assert.equal(model.exactMissionMarker(mission.name),'starlink:10-43');
  assert.equal(model.exactMissionMarker('Falcon 9 Starlink 10-43'),'starlink:10-43');
  assert.equal(model.exactMissionMarker('Falcon 9 Starlink 10-44'),'starlink:10-44');
  assert.equal(model.normalizeReport(report(),mission,NOW)?.povPercent,60);
  assert.equal(model.normalizeReport(report(60,{sourceMission:'Starlink 10-44'}),mission,NOW),null);
  assert.equal(model.normalizeReport(report(60,{validDate:'2026-11-10'}),mission,NOW),null);
  assert.equal(model.normalizeReport(report(60,{sourceSha256:'invalid'}),mission,NOW),null);
  assert.equal(model.normalizeReport(report(120),mission,NOW),null);
  assert.equal(model.normalizeReport(report(60,{sourceUrl:'https://kscwx.com/forecast/123'}),mission,NOW),null);
  assert.equal(model.normalizeReport(report(60,{issuedAt:'2026-11-04T20:00:00Z'}),mission,NOW),null);
});
test('missing PoV remains null while a verified source can still be linked',()=>{
  const p = model.normalizeReport(report(null),mission,NOW);
  assert.equal(p.transcriptionStatus,'official-document-verified-value-not-extracted');
  assert.equal(p.povPercent,null);
});
test('document history records a first discovery and material forecast revision with provenance',()=>{
  const first = model.ingest(state(),{discoveryStatus:'ok',inspected:1,verified:1,failed:0,reports:[report()]},[mission],NOW);
  assert.equal(first.accepted,1);assert.equal(first.changes,1);
  const repeated = model.ingest(first.state,{discoveryStatus:'ok',inspected:1,verified:1,failed:0,reports:[report()]},[mission],NOW+3600000);
  assert.equal(repeated.changes,0);
  const changed = report(30,{sourceSha256:'b'.repeat(64),issuedAt:'2026-11-02T18:00:00Z',
    primaryConcerns:['Liftoff Winds']});
  const next = model.ingest(first.state,{discoveryStatus:'ok',inspected:1,verified:1,failed:0,reports:[changed]},[mission],NOW+24*3600000);
  assert.equal(next.changes,1);
  const p=model.missionForecast(mission,next.state,NOW+24*3600000);
  assert.equal(p.status,'mission-matched-current');
  assert.equal(p.povPercent,30);
  assert.equal(p.timeline.length,2);
  assert.equal(p.latestChange.kind,'official-pov-revised');
  assert.equal(p.latestChange.priorPovPercent,60);
  assert.equal(p.officialDecision,'not-verified');
  assert.match(p.note,/not the probability the rocket will scrub/);
});
test('revised launch date invalidates old official percentage but retains dated evidence',()=>{
  const first=model.ingest(state(),{discoveryStatus:'ok',inspected:1,verified:1,reports:[report()],failed:0},[mission],NOW);
  const newDate={...mission,net:'2026-11-11T12:00:00Z'};
  const outcome=model.missionForecast(newDate,first.state,NOW);
  assert.notEqual(outcome.status,'mission-matched-current');
  assert.equal(outcome.povPercent,null);
  assert.equal(outcome.officialUrl,null);
});
test('a one-day launch slip never inherits the previous primary-window PoV',()=>{
  const first=model.ingest(state(),{discoveryStatus:'ok',inspected:1,verified:1,reports:[report()],failed:0},[mission],NOW);
  const rescheduled={...mission,net:'2026-11-04T12:30:00Z'};
  assert.equal(model.floridaCalendarDay(rescheduled.net),'2026-11-04');
  const p=model.missionForecast(rescheduled,first.state,NOW);
  assert.equal(p.povPercent,null);
  assert.notEqual(p.status,'mission-matched-current');
  assert.equal(p.officialUrl,null);
});
test('an overdue monitor cannot continue presenting an old official PoV as current',()=>{
  const first=model.ingest(state(),{discoveryStatus:'ok',inspected:1,verified:1,reports:[report()],failed:0},[mission],NOW);
  const p=model.missionForecast(mission,first.state,NOW+3*3600000);
  assert.equal(p.health.status,'overdue');
  assert.equal(p.povPercent,null);
  assert.notEqual(p.status,'mission-matched-current');
});
test('a healthy monitor cannot reuse an unrefreshed mission PDF',()=>{
  const first=model.ingest(state(),{discoveryStatus:'ok',inspected:1,verified:1,failed:0,reports:[report()]},[mission],NOW);
  const after=model.ingest(first.state,{discoveryStatus:'ok',inspected:1,verified:0,failed:0,reports:[]},[mission],NOW+2*3600000);
  assert.equal(after.state.monitorStatus,'ok');
  const stale=model.missionForecast(mission,after.state,NOW+2*3600000);
  assert.equal(stale.health.status,'ok');
  assert.equal(stale.povPercent,null);
  const checked=model.ingest(after.state,{discoveryStatus:'ok',inspected:1,verified:1,failed:0,reports:[report()]},[mission],NOW+2*3600000);
  assert.equal(checked.changes,0);
  const current=model.missionForecast(mission,checked.state,NOW+2*3600000);
  assert.equal(current.povPercent,60);
});
test('old and incorrect monitoring sources cannot publish a probability',()=>{
  const first=model.ingest(state(),{discoveryStatus:'partial',inspected:1,verified:0,failed:1,reports:[
    report(90,{sourceMission:'Starlink 10-99'})]},[mission],NOW);
  assert.equal(first.accepted,0);
  assert.equal(first.rejected,1);
  assert.equal(model.missionForecast(mission,first.state,NOW).povPercent,null);
  assert.equal(model.publicHealth(first.state,NOW+2*3600000).status,'overdue');
});
test('GET route never writes, POST requires a valid signed workflow token',async()=>{
  let writes=0,stored=null;
  const db={get:async()=>stored,set:async(k,v)=>{writes++;stored=v}};
  const make=createHandler({authorized:async()=>false,ready:()=>true,state:db,
    loadSchedule:async()=>({version:1,checkedAt:new Date(NOW).toISOString(),missions:[mission]}),
    now:()=>NOW});
  const failed=res();await make({method:'POST',headers:{authorization:'Bearer invalid'},body:{}},failed);
  assert.equal(failed.statusCode,401);assert.equal(writes,0);
  const health=res();await make({method:'GET',query:{}},health);
  assert.equal(health.statusCode,200);assert.equal(writes,0);
  const ok=createHandler({authorized:async()=>true,ready:()=>true,state:db,
    loadSchedule:async()=>({version:1,checkedAt:new Date(NOW).toISOString(),missions:[mission]}),
    now:()=>NOW});
  const saved=res();await ok({method:'POST',headers:{},body:{
    discoveryStatus:'ok',inspected:1,verified:1,failed:0,reports:[report()]}},saved);
  assert.equal(saved.statusCode,200);assert.equal(writes,1);
  const visible=res();await ok({method:'GET',query:{launchId:ID}},visible);
  assert.equal(visible.statusCode,200);
  assert.equal(visible.body.forecast.povPercent,60);
  assert.equal(visible.headers['X-Robots-Tag'],'noindex, nofollow');
});
test('both launch interfaces contain official evidence and preserve the canonical experience',()=>{
  const root=path.resolve(__dirname,'..','public','synced-national-tools');
  const fl=fs.readFileSync(path.join(root,'space-coast-launch','index.html'),'utf8');
  const national=fs.readFileSync(path.join(root,'rocket-launch-live','index.html'),'utf8');
  assert.match(fl,/id="fl-official-pov"/);
  assert.match(fl,/id="fl-official-history"/);
  assert.match(national,/id="rl-official-value"/);
  assert.match(fl,/app\.js\?v=20261101-official1/);
  assert.match(national,/app\.js\?v=20261101-official1/);
  assert.equal((national.match(/rel="canonical"/g)||[]).length,1);
});
