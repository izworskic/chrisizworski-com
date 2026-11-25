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
const {usableSnapshot,waterRecent}=vm.runInNewContext(js.slice(start,end)+'\n({usableSnapshot,waterRecent})',{Date:FixedDate});
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
