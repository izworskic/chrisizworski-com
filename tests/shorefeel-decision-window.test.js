'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {decisionWindow}=require('../lib/shorefeel/decision-window.js');
const {weatherPeriods}=require('../lib/shorefeel/engine.js');
const H=3600000,NOW=Date.parse('2026-11-24T14:00:00Z'),at=offset=>new Date(NOW+offset).toISOString(),now=new Date(NOW),issue=at(-H);
const row=(hour,overrides={})=>({startsAt:at(hour*H),endsAt:at((hour+1)*H),daylight:true,tempF:76,windMph:5,rainChance:0,...overrides});
const choose=(rows,activity='relax',time=now,issuedAt=issue)=>decisionWindow(rows,activity,time,issuedAt);
test('two complete daylight hours, not an isolated excellent hour or a gap',()=>{
 const w=choose([row(5),row(1,{tempF:64}),row(2,{tempF:66,windMph:8,rainChance:20})]);
 assert.equal(w.startsAt,at(H));assert.equal(w.endsAt,at(3*H));
 assert.equal(w.durationMinutes,120);assert.equal(w.airMinF,64);assert.equal(w.airMaxF,66);
 assert.equal(w.windMaxMph,8);assert.equal(w.rainMaxPct,20);
 assert.equal(w.issuedAt,issue);
 assert.equal(choose([row(1),row(3)]),null);
 assert.equal(choose([row(1),row(2,{daylight:false})]),null);
});
test('unknown inputs are not imputed; legitimate zero is preserved',()=>{
 for(const override of [{rainChance:null},{rainChance:-1},{rainChance:101},{tempF:null},{windMph:null},{windMph:-1},{endsAt:at(2.5*H)}])
  assert.equal(choose([row(1),row(2,override)]),null);
 const w=choose([row(1,{windMph:0,rainChance:0}),row(2,{windMph:0,rainChance:0})]);
 assert.equal(w.rainMaxPct,0);assert.equal(w.windMaxMph,0);
});
test('duplicate equal rows do not manufacture duration; conflicting or incomplete duplicates quarantine the hour',()=>{
 assert.equal(choose([row(1),row(1)]),null);
 assert.equal(choose([row(1),row(1,{windMph:12}),row(2)]),null);
 assert.equal(choose([row(2),row(1,{rainChance:null}),row(1)]),null);
 assert.equal(choose([row(2),row(1),row(1)]).durationMinutes,120);
});
test('worst hour ranks first, then mean and earliest time; activity uses existing preference',()=>{
 const rows=[row(1,{tempF:76}),row(2,{tempF:40}),row(4,{tempF:72}),row(5,{tempF:72}),row(7),row(8)];
 assert.equal(choose(rows,'relax').startsAt,at(7*H));
 assert.equal(choose(rows,'paddle').startsAt,at(4*H));
 assert.equal(choose([row(4),row(5),row(1),row(2)]).startsAt,at(H));
 assert.equal(choose(rows.slice().reverse(),'relax').startsAt,at(7*H));
});
test('expired, underway, beyond horizon and invalid issuance are excluded',()=>{
 assert.equal(choose([row(-1),row(0)]),null);
 assert.equal(choose([row(0),row(1)],'relax',new Date(NOW+1)),null);
 assert.equal(choose([row(35),row(36)]),null);
 for(const i of [null,'bad',at(-18*H-1),at(H+1)])assert.equal(choose([row(1),row(2)],'relax',now,i),null);
 assert.equal(choose([row(1),row(2)],'bogus'),null);
 assert.equal(choose([row(1),row(2)],'relax',now,at(-18*H)).durationMinutes,120);
});
test('UTC continuity works across daylight-saving offset transition; no fabricated hour',()=>{
 const raw=[
 {startTime:'2026-11-01T01:00:00-04:00',endTime:'2026-11-01T01:00:00-05:00',isDaytime:true,temperature:76,temperatureUnit:'F',windSpeed:'5 mph',probabilityOfPrecipitation:{value:0}},
 {startTime:'2026-11-01T01:00:00-05:00',endTime:'2026-11-01T02:00:00-05:00',isDaytime:true,temperature:76,temperatureUnit:'F',windSpeed:'5 mph',probabilityOfPrecipitation:{value:0}}
 ];
 // Synthetic daylight flags solely test timestamp arithmetic, not solar conditions.
 const w=decisionWindow(weatherPeriods(raw),'relax',new Date('2026-11-01T04:00:00Z'),'2026-11-01T03:00:00Z');
 assert.equal(w.startsAt,'2026-11-01T05:00:00.000Z');assert.equal(w.endsAt,'2026-11-01T07:00:00.000Z');
});
const js=fs.readFileSync('public/assets/shorefeel-saginaw.js','utf8');
const start=js.indexOf('const sourceRecent='),end=js.indexOf('const evidence=',start);
const {usableSnapshot,nextEvidenceExpiry,validDecisionWindow}=vm.runInNewContext(js.slice(start,end)+'\n({usableSnapshot,nextEvidenceExpiry,validDecisionWindow})',{Date});
test('future decision window remains independent of current air and water; expires on source or packet deadline',()=>{
 const w=choose([row(1),row(2)]);
 const data={generatedAt:at(0),weatherNow:null,water:null,decisionWindows:{relax:w}};
 const projected=usableSnapshot(data,NOW);
 assert.equal(projected.weatherNow,null);assert.equal(projected.decisionWindows.relax.startsAt,at(H));
 assert.equal(projected.decisionWindows.swim,null);
 assert.equal(nextEvidenceExpiry(projected,NOW),NOW+30*60000+1);
 assert.equal(usableSnapshot(projected,NOW+30*60000+1),null);
 assert.equal(validDecisionWindow(w,NOW+3*H,'relax'),null);
 assert.equal(validDecisionWindow({...w,issuedAt:at(-18*H-1)},NOW,'relax'),null);
 assert.equal(validDecisionWindow({...w,endsAt:at(4*H)},NOW,'relax'),null);
 assert.equal(validDecisionWindow(w,NOW,'paddle'),null);
});
