'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseSolarWind,parseKpForecast}=require('../lib/aurora');
const {nowPeriod}=require('../lib/shorefeel/engine.js');
const river=require('../api/manistee-river-conditions.js')._test;
const NOW=Date.parse('2026-11-24T19:00:00Z');
const H=3600000;
const at=offset=>new Date(NOW+offset).toISOString();

test('aurora never attaches old magnetic data to fresh proton speed',()=>{
 const mag=[{time_tag:at(-7*H),bz_gsm:-14,bt:18}];
 const speed=[{time_tag:at(-60000),proton_speed:500}];
 const result=parseSolarWind(mag,speed,NOW);
 assert.equal(result.bz_gsm_nt,null);
 assert.equal(result.bt_nt,null);
 assert.equal(result.speed_km_s,500);
 assert.equal(result.observed_at,at(-60000));
 assert.equal(parseSolarWind(mag,[{...speed[0],time_tag:at(1)}],NOW),null);
 const restored=parseSolarWind([{...mag[0],time_tag:at(-120000)}],speed,NOW);
 assert.equal(restored.bz_gsm_nt,-14);
});

test('Kp expired windows and impossible readings do not produce a peak',()=>{
 const forecast=parseKpForecast([{time_tag:at(-3*H),kp:8},{time_tag:at(H),kp:99},{time_tag:at(2*H),kp:-1}],NOW);
 assert.equal(forecast.peak_24h,null);
 assert.deepEqual(forecast.periods,[]);
 assert.equal(parseKpForecast([{time_tag:at(H),kp:0}],NOW).peak_24h,0);
});

test('ShoreFeel does not describe a future or expired forecast hour as now',()=>{
 const expired={startsAt:at(-H),tempF:42};
 const future={startsAt:at(H),tempF:68};
 const current={startsAt:at(-H/2),tempF:50};
 assert.equal(nowPeriod([expired,future],new Date(NOW)),null);
 assert.equal(nowPeriod([future,current],new Date(NOW)),current);
 assert.equal(nowPeriod([{startsAt:at(0),tempF:0}],new Date(NOW)).tempF,0);
});

test('cached ice response is checked against the source clock, not the fetch flag',()=>{
 const js=fs.readFileSync('public/michigan-ice/ice.js','utf8');
 const start=js.indexOf('  function iceSourceRecent('),end=js.indexOf('  function paintTrack(',start);
 assert.ok(start>=0&&end>start);
 class FixedDate extends Date {static now(){return NOW;}}
 const api=vm.runInNewContext(js.slice(start,end)+'\n({iceSourceRecent,usableRegional,usableLakeWide})',{Date:FixedDate});
 for(const offset of [-49*H,3*H]){
  const regional={supported:true,available:true,stale:false,rangeLabel:'0%',validAt:at(offset)};
  assert.equal(api.usableRegional(regional),false);
  assert.equal(api.usableLakeWide({observed:{lakeWide:{current:{total:0},stale:false,observedAt:at(offset)}}}),null);
 }
 assert.equal(api.iceSourceRecent(at(-48*H),NOW),true);
 assert.equal(api.iceSourceRecent(null,NOW),false);
 assert.equal(api.usableLakeWide({observed:{lakeWide:{current:{total:0},stale:false,observedAt:at(-H)}}}).current.total,0);
 assert.equal(api.usableRegional({supported:true,available:true,stale:true,rangeLabel:'0%',validAt:at(-H)}),false);
});

function series(code,points){
 return {sourceInfo:{siteCode:[{value:river.SITES[0]}]},variable:{variableCode:[{value:code}]},values:[{value:points}]};
}
test('fresh temperature cannot promote stale flow and future or missing readings',()=>{
 const point=(value,offset)=>({value,dateTime:at(offset)});
 const payload={value:{timeSeries:[series('00060',[point('800',-4*H),point('1000',1)]),series('00010',[point('10',-H),point(null,-60000)]),series('00065',[point('',-60000)])]}};
 const result=river.normalize(payload,NOW)[0];
 assert.equal(result.discharge_cfs,null);
 assert.equal(result.water_temp_f,50);
 assert.equal(result.gage_height_ft,null);
 assert.equal(result.measured_at,at(-H));
 assert.equal(river.flowContext(result.discharge_cfs,{p50:400}).percent_of_median,null);
 const valid=river.normalize({value:{timeSeries:[series('00060',[point('0',-2*H)]),series('00010',[point('10',-H)])]}},NOW)[0];
 assert.equal(valid.discharge_cfs,0);
 assert.equal(valid.measured_at,at(-2*H));
 assert.equal(river.latest(series('00060',[point('10',-60000),point('20',-H)]),NOW).value,10);
});
