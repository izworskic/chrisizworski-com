'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const NOW=Date.parse('2026-11-24T23:00:00Z'),H=3600000;
const stamp=offset=>new Date(NOW+offset).toISOString();
const js=fs.readFileSync('public/assets/shorefeel-saginaw.js','utf8');
const start=js.indexOf('const sourceRecent='),end=js.indexOf('const evidence=',start);
class FixedDate extends Date {static now(){return NOW;}}
const {usableSnapshot,waterRecent,nextEvidenceExpiry}=vm.runInNewContext(js.slice(start,end)+'\n({usableSnapshot,waterRecent,nextEvidenceExpiry})',{Date:FixedDate});
function fixture(){
 const water={kind:'satellite',tempF:58.5,observedAt:stamp(-H)};
 const weatherNow={startsAt:stamp(-H/2),tempF:82};
 return {generatedAt:stamp(-60000),water,weatherNow,beachFeel:{startsAt:weatherNow.startsAt,status:'forecast-based',waterF:58.5,apparentF:83,label:'Cooling possible'},shorelinePhysics:{status:'research-only',paired:{nwsDifferenceF:-4},independentMarineAir:{tempF:48,observedAt:stamp(-H)}},windTurn:{water,forecastAirWaterContrastF:23.5},hourlyAirComparison:{rows:[]},assessments:{swim:{heading:'Swim'}},weatherWindows:{swim:{startsAt:stamp(0)}}};
}
test('independent water stays usable during air outage; derived weather claims do not',()=>{
 const d=fixture();d.weatherNow=null;
 const s=usableSnapshot(d);
 assert.equal(s.water.tempF,58.5);assert.equal(s.weatherNow,null);assert.equal(s.beachFeel,null);
 assert.equal(s.shorelinePhysics.paired,null);assert.equal(s.shorelinePhysics.status,undefined);
 assert.equal(s.shorelinePhysics.independentMarineAir.tempF,48);
 assert.equal(s.windTurn,null);assert.equal(s.assessments,null);assert.equal(s.weatherWindows,null);
});
test('expired water does not contaminate current forecast or physical model',()=>{
 const d=fixture();d.water.observedAt=stamp(-73*H);
 const s=usableSnapshot(d);assert.equal(s.water,null);assert.equal(s.weatherNow.tempF,82);
 assert.equal(s.beachFeel.apparentF,83);assert.equal(s.beachFeel.waterF,null);
 assert.equal(s.beachFeel.waterAirContrastF,null);assert.equal(s.shorelinePhysics.status,undefined);
 assert.equal(s.windTurn.water,null);assert.equal(s.assessments,null);
 assert.equal(s.shorelinePhysics.paired.nwsDifferenceF,-4);
});
test('whole response expiry and future observations fail closed; fresh zero is real',()=>{
 const d=fixture();d.generatedAt=stamp(-31*60000);assert.equal(usableSnapshot(d),null);
 assert.equal(waterRecent({tempF:0,observedAt:stamp(0)},'buoy'),true);
 assert.equal(waterRecent({tempF:0,observedAt:stamp(1)},'buoy'),false);
 assert.equal(waterRecent({tempF:0,observedAt:stamp(-6*H-1)},'buoy'),false);
 assert.equal(waterRecent({tempF:0,observedAt:stamp(-72*H)},'satellite'),true);
 assert.equal(usableSnapshot(fixture()).shorelinePhysics.status,'research-only');
});

test('temporal deadlines independently withdraw water, hour and packet in chronological order',()=>{
 const d=fixture();
 d.generatedAt=stamp(-25*60000);
 d.water.observedAt=stamp(-72*H+60000);
 d.weatherNow.startsAt=stamp(-H+120000);
 d.beachFeel.startsAt=d.weatherNow.startsAt;
 d.regionalSatellite={cells:[{key:'inner-bay',measurement:{...d.water}},{key:'west-bay',measurement:{tempF:60,observedAt:stamp(-H)}}]};
 d.weatherWindows.swim.startsAt=stamp(H);
 let p=usableSnapshot(d,NOW);
 assert.equal(nextEvidenceExpiry(p,NOW),NOW+60001);
 assert.equal(usableSnapshot(p,NOW+60000).water.tempF,58.5);
 p=usableSnapshot(p,NOW+60001);
 assert.equal(p.water,null);
 assert.equal(p.regionalSatellite.cells[0].measurement,null);
 assert.equal(p.regionalSatellite.cells[1].measurement.tempF,60);
 assert.equal(p.weatherNow.tempF,82);
 assert.equal(p.beachFeel.waterF,null);
 assert.equal(nextEvidenceExpiry(p,NOW+60001),NOW+120000);
 p=usableSnapshot(p,NOW+120000);
 assert.equal(p.weatherNow,null);
 assert.equal(p.beachFeel,null);
 assert.equal(p.assessments,null);
 assert.equal(p.weatherWindows,null);
 assert.equal(p.regionalSatellite.cells[1].measurement.tempF,60);
 assert.equal(nextEvidenceExpiry(p,NOW+120000),NOW+300001);
 assert.equal(usableSnapshot(p,NOW+300001),null);
 assert.equal(nextEvidenceExpiry(null,NOW+300001),null);
});
test('36-hour scenario, individual buoy and calendar date deadlines are distinct',()=>{
 const d=fixture();
 d.water.observedAt=stamp(-36*H+500);
 d.local={measurement:{tempF:0,observedAt:stamp(-6*H+1000)}};
 let p=usableSnapshot(d,NOW);
 assert.equal(p.shorelinePhysics.status,'research-only');
 assert.equal(nextEvidenceExpiry(p,NOW),NOW+501);
 p=usableSnapshot(p,NOW+501);
 assert.equal(p.shorelinePhysics.status,undefined);
 assert.equal(p.water.tempF,58.5);
 assert.equal(nextEvidenceExpiry(p,NOW+501),NOW+1001);
 p=usableSnapshot(p,NOW+1001);
 assert.equal(p.local.measurement,null);
 assert.equal(p.water.tempF,58.5);
 const midnight=Date.parse('2026-11-25T00:00:00Z');
 const lastDay={generatedAt:new Date(midnight-1000).toISOString(),lakes:{huron:{status:'recent',latest:{date:'2026-11-21',tempF:48}}}};
 const l=usableSnapshot(lastDay,midnight-1000);
 assert.equal(nextEvidenceExpiry(l,midnight-1000),midnight);
 assert.equal(usableSnapshot(l,midnight).lakes.huron.status,'stale');
});
test('reprojected invalid future sources cannot resurrect without a new response',()=>{
 const d=fixture();
 d.local={measurement:{tempF:55,observedAt:stamp(1000)}};
 d.regionalSatellite={cells:[{key:'west-bay',measurement:{tempF:55,observedAt:stamp(H+1000)}}]};
 const p=usableSnapshot(d,NOW);
 assert.equal(p.local.measurement,null);
 assert.equal(p.regionalSatellite.cells[0].measurement,null);
 assert.equal(usableSnapshot(p,NOW+2000).local.measurement,null);
 assert.equal(usableSnapshot(d,NOW+2000).local.measurement.tempF,55);
});
