'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=3600000,NOW=Date.parse('2026-11-24T19:00:00Z'),at=offset=>new Date(NOW+offset).toISOString();
const js=fs.readFileSync('public/assets/shorefeel.js','utf8');
const a=js.indexOf('const HOUR='),b=js.indexOf('/* Water temperature is the product.',a);
assert.ok(a>=0&&b>a);
const project=vm.runInNewContext(js.slice(a,b)+'\nprojectEvidence');
const point=(key,age=-H,tempF=60)=>({key,measurement:{observedAt:at(age),tempF}});
const forecast=(key,level)=>({key,name:key,levelKind:'satellite',levelTempF:level.tempF,levelObservedAt:level.observedAt,points:[{leadH:0,tempF:60,low:58,high:62}]});
function fixture(){
 const west=point('west-bay'),east=point('east-bay',-H,62);
 return {generatedAt:at(-60000),water:{kind:'satellite',...west.measurement},local:{measurement:{observedAt:at(-H),tempF:0}},regionalSatellite:{cells:[west,east]},
  lakes:{michigan:{status:'recent',latest:{date:'2026-11-24',tempF:50},history:[{date:'2026-11-24',tempF:50}]}},
  weatherNow:{startsAt:at(-H/2),tempF:80,windMph:12},
  assessments:{swim:{beach:'air claim',water:'water claim',after:'combined air and wind',decision:'combined claim',band:'cold'}},
  weatherWindows:{swim:{startsAt:at(H),tempF:80,windMph:12}},
  beachForecast:{status:'available',cycle:at(-6*H),beaches:[forecast('clinch-park',west.measurement),forecast('tc-state-park',east.measurement)]}};
}
test('each destination water forecast requires its own matching recent source cell',()=>{
 const data=fixture();
 assert.equal(project(data,NOW).beachForecast.beaches.length,2);
 data.regionalSatellite.cells[0].measurement.observedAt=at(-73*H);
 const p=project(data,NOW);
 assert.equal(p.beachForecast.beaches.length,1);
 assert.equal(p.beachForecast.beaches[0].key,'tc-state-park');
 assert.equal(p.regionalSatellite.cells[0].measurement,null);
 assert.equal(p.local.measurement.tempF,0);
 data.regionalSatellite.cells[1].measurement.tempF=70;
 assert.equal(project(data,NOW).beachForecast.status,'unavailable');
});
test('weather-only, water-only and expired packets cannot preserve unsupported conclusions',()=>{
 const d=fixture();
 d.weatherNow.startsAt=at(-H);
 let p=project(d,NOW);
 assert.equal(p.weatherNow,null);assert.equal(p.water.tempF,60);
 assert.equal(p.assessments.swim.water,'water claim');
 assert.notEqual(p.assessments.swim.beach,'air claim');
 assert.notEqual(p.assessments.swim.decision,'combined claim');
 d.weatherNow.startsAt=at(0);d.water.observedAt=at(-73*H);
 p=project(d,NOW);
 assert.equal(p.water,null);assert.equal(p.weatherNow.tempF,80);
 assert.equal(p.assessments.swim.beach,'air claim');
 assert.notEqual(p.assessments.swim.water,'water claim');
 d.generatedAt=at(-31*60000);
 p=project(d,NOW);
 assert.equal(p.weatherNow,null);assert.equal(p.beachForecast.status,'unavailable');
 assert.equal(p.weatherWindows.swim,null);
 assert.equal(p.local.measurement.tempF,0);
});
test('calendar-dated lake context keeps history but withdraws stale current claim',()=>{
 const d=fixture();
 d.lakes.michigan.latest.date='2026-11-20';
 const p=project(d,NOW);
 assert.equal(p.lakes.michigan.status,'stale');
 assert.equal(p.lakes.michigan.history.length,1);
 assert.equal(project(fixture(),NOW).lakes.michigan.status,'recent');
 assert.equal(project(null,NOW),null);
});
test('model cycle, missing lead-zero and malformed range independently veto a numeric estimate',()=>{
 for(const mutate of [d=>d.beachForecast.cycle=at(-24*H),d=>d.beachForecast.cycle=at(1),d=>d.beachForecast.beaches.forEach(b=>b.points[0].leadH=24),d=>d.beachForecast.beaches.forEach(b=>b.points[0].low=100)]){
  const d=fixture();mutate(d);assert.equal(project(d,NOW).beachForecast.status,'unavailable');
 }
});
test('renderPlace consumes projected weather only; no arbitrary first period fallback',()=>{
 assert.match(js,/const w=payload\.weatherNow\|\|null;/);
 assert.doesNotMatch(js,/payload\.weatherNow\|\|d\.periods/);
});
