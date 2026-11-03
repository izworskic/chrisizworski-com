'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../lib/garden-pest-watch.cjs');
const api=require('../api/michigan-garden-pest-watch.js');

const weather=(tags)=>({status:'AVAILABLE',tags,sourceUrl:'https://www.weather.gov/documentation/services-web-api',issuedAt:'2026-07-12T12:00:00Z'});
const select=(crop,month,stage='growing',extra={})=>core.decision({crop,month,stage,...extra});
test('portfolio covers at least 17 sourced uniquely identified pest or disease topics',()=>{
 assert.ok(core.PESTS.length>=17);
 assert.equal(new Set(core.PESTS.map(p=>p.id)).size,core.PESTS.length);
 for(const p of core.PESTS){
  assert.ok(p.source.startsWith('https://'),p.id);
  for(const name of ['where','sign','prevent','found','beneficial'])assert.ok(p[name].length>20,p.id+':'+name);
  assert.ok(p.crops.length&&p.months.length&&p.stages.length);
  assert.ok(p.crops.every(c=>core.CROPS.includes(c)));
 }
});
test('source-specific quantitative models are reference-only, not active forecast claims',()=>{
 assert.equal(core.MODELS.length,3);
 assert.equal(core.MODELS.find(m=>m.pest==='japanese-beetle').algorithm,'single-triangle');
 assert.equal(core.MODELS.find(m=>m.pest==='japanese-beetle').upperF,92);
 assert.equal(core.MODELS.find(m=>m.pest==='cabbage-maggot').baseF,43);
 assert.equal(core.MODELS.find(m=>m.pest==='squash-vine-borer').status,'RESEARCH_BLOCKED');
 assert.ok(core.MODELS.every(m=>m.status!=='PRODUCTION_VALIDATED'));
});
test('Michigan local day and month follow Detroit date across UTC midnight',()=>{
 const lateUTC=new Date('2027-03-01T02:00:00Z');
 assert.deepEqual(core.michiganDateParts(lateUTC),{month:2,date:'2027-02-28'});
 const earlyMI=new Date('2027-03-01T06:00:00Z');
 assert.deepEqual(core.michiganDateParts(earlyMI),{month:3,date:'2027-03-01'});
});
test('November Michigan garden never claims active summer pests',()=>{
 for(const crop of core.CROPS){
  const d=select(crop,11);
  assert.equal(d.mode,'OFF_SEASON');
  assert.ok(d.firstAction.length>45,'Crop-specific off-season assignment should be useful');
  assert.ok(d.featured.every(p=>p.label==='Plan for next growing season'));
  assert.ok(d.featured.every(p=>p.biologicalForecast==='UNAVAILABLE'));
 }
});
test('dormant watch cards prioritize the crop’s major preparation topics, not alphabetical labels',()=>{
 const squash=select('squash',11);
 const ids=squash.featured.map(p=>p.id);
 assert.ok(ids.includes('squash-vine-borer'),'Squash vine borer must appear with the next-season squash assignment');
 assert.ok(ids.includes('squash-bug'),'Squash bug must appear with the next-season squash assignment');
 assert.ok(squash.featured.every(p=>p.weatherFavorable===false));
 const suspected=select('squash',11,'growing',{observed:'aphids'});
 assert.equal(suspected.featured[0].id,'aphids','A visitor-reported suspect overrides editorial season priorities but remains unverified');
 assert.equal(suspected.featured[0].verifiedLocalOccurrence,false);
});
test('off-season plans differ by host crop and a reported clue is investigated without asserting emergence',()=>{
 const squash=select('squash',11,'growing'),grapes=select('grapes',11,'growing');
 assert.notEqual(squash.firstAction,grapes.firstAction);
 assert.match(squash.firstAction,/squash/i);
 assert.match(grapes.firstAction,/lanternfly/i);
 const suspected=select('grapes',11,'growing',{observed:'spotted-lanternfly'});
 assert.match(suspected.firstAction,/suspected spotted lanternfly/i);
 assert.equal(suspected.all.find(p=>p.id==='spotted-lanternfly').verifiedLocalOccurrence,false);
 assert.equal(suspected.mode,'OFF_SEASON');
});
test('early spring cabbage directs attention to seedling root pests',()=>{
 const d=select('brassicas',4,'seedling');
 assert.equal(d.crop,'brassicas');
 assert.ok(d.featured.some(p=>p.id==='cabbage-maggot'));
 assert.ok(d.featured.some(p=>p.id==='flea-beetles'));
 assert.ok(d.firstAction.toLowerCase().includes('soil'));
});
test('summer squash directs to vine borer and squash bugs',()=>{
 const d=select('squash',7,'growing');
 assert.equal(d.mode,'SCOUTING');
 assert.ok(d.featured.some(p=>p.id==='squash-vine-borer'));
 assert.ok(d.featured.some(p=>p.id==='squash-bug'));
 assert.ok(!d.featured.some(p=>p.id==='cabbage-maggot'));
});
test('every multi-host watch uses the selected crop, not another host’s inspection site',()=>{
 const squash=select('squash',7).all.find(p=>p.id==='cucumber-beetles');
 assert.match(squash.where,/squash/i);assert.doesNotMatch(squash.where,/melon seedlings/i);
 const cucumber=select('cucumbers',7).all.find(p=>p.id==='downy-mildew');
 const squashMildew=select('squash',7).all.find(p=>p.id==='downy-mildew');
 assert.match(cucumber.where,/cucumber/i);assert.match(squashMildew.where,/squash/i);
 const roseBeetle=select('roses',7).all.find(p=>p.id==='japanese-beetle');
 const grapeBeetle=select('grapes',7).all.find(p=>p.id==='japanese-beetle');
 assert.match(roseBeetle.where,/rose/i);assert.match(grapeBeetle.where,/grape/i);
 const eggplant=select('eggplant',7).all.find(p=>p.id==='colorado-potato-beetle');
 assert.match(eggplant.where,/eggplant/i);assert.match(eggplant.prevent,/eggplant/i);
 const tomatoWorm=select('tomatoes',8,'fruiting').all.find(p=>p.id==='corn-earworm');
 const cornWorm=select('corn',8,'fruiting').all.find(p=>p.id==='corn-earworm');
 assert.match(tomatoWorm.where,/tomato fruit/i);
 assert.doesNotMatch(tomatoWorm.found,/damaged ear tips/i);
 assert.match(cornWorm.where,/corn silks/i);
 assert.match(cornWorm.source,/corn\/kernalschewingdamage/);
 assert.match(tomatoWorm.source,/tomato\/fruitholes/);
 assert.equal(tomatoWorm.evidence[0].source,tomatoWorm.source);
 const tomatoDisease=select('tomatoes',8,'growing').all.find(p=>p.id==='tomato-leaf-spot');
 assert.match(tomatoDisease.source,/michigan_fresh_tomato_diseases_in_the_home_garden/);
});
test('plant-stage changes are causal and reversed state is deterministic',()=>{
 const a=select('beans',5,'seedling'),b=select('beans',5,'fruiting'),c=select('beans',5,'seedling');
 assert.notDeepEqual(a.featured.map(p=>p.id),b.featured.map(p=>p.id));
 assert.deepEqual(a.featured.map(p=>p.id),c.featured.map(p=>p.id));
});
test('seasons are not automatically promoted to observations',()=>{
 const d=select('grapes',8,'fruiting', {weather:weather(['wet'])});
 assert.ok(d.all.every(p=>p.verifiedLocalOccurrence===false));
 assert.equal(d.modelStatus,'NO_LIVE_BIOLOGICAL_FORECAST');
 assert.ok(d.all.every(p=>p.regionalReport==='UNAVAILABLE'));
});
test('hot-dry cue stays an uncalibrated weather preference and requires host and season',()=>{
 const july=select('tomatoes',7,'growing',{weather:weather(['hot_dry'])});
 const mites=july.all.find(p=>p.id==='spider-mites');
 assert.equal(mites.state,'CONDITIONS_FAVORABLE');assert.equal(mites.weatherFavorable,true);
 assert.equal(mites.biologicalForecast,'UNAVAILABLE');
 const november=select('tomatoes',11,'growing',{weather:weather(['hot_dry'])});
 assert.equal(november.all.find(p=>p.id==='spider-mites').weatherFavorable,false);
 const brassicas=select('brassicas',7,'growing',{weather:weather(['hot_dry'])});
 assert.ok(!brassicas.all.some(p=>p.id==='spider-mites'));
});
test('wet cue relates to slug or leaf-scouting without diagnosing the disease',()=>{
 const d=select('tomatoes',8,'growing',{weather:weather(['wet'])});
 const spots=d.all.find(p=>p.id==='tomato-leaf-spot');
 assert.equal(spots.state,'CONDITIONS_FAVORABLE');
 assert.ok(spots.found.includes('confirm the disease'));
});
test('unavailable weather never asserts zero risk or no pests',()=>{
 const d=select('cucumbers',6,'growing',{weather:{status:'UNAVAILABLE',tags:[]}});
 assert.equal(d.weatherStatus,'UNAVAILABLE');
 assert.ok(d.messages.some(x=>x.includes('not proof')));
 assert.ok(d.all.every(p=>p.weatherFavorable===false));
});
test('gardener reports are labeled self-reported and never expert confirmed',()=>{
 const d=select('squash',7,'flowering',{observed:'squash-vine-borer'});
 const p=d.all.find(x=>x.id==='squash-vine-borer');
 assert.equal(p.state,'GARDENER_REPORTED');
 assert.equal(p.verifiedLocalOccurrence,false);
 assert.ok(p.evidence.some(x=>x.kind==='GARDENER_REPORTED'));
});
test('unknown crop, stage, month and suspect fail to allowlisted defaults',()=>{
 const d=core.decision({crop:'<script>',stage:'fruit-bat',month:-999,observed:'dragon'});
 assert.equal(d.crop,'squash');assert.equal(d.stage,'growing');
 assert.ok(d.all.every(p=>p.state!=='GARDENER_REPORTED'));
});
test('repaired public reference links are exact checked sources, not expired shortcuts',()=>{
 assert.equal(core.SOURCE.msu,'https://msu-prod.dotcmscloud.com/resources/ipm_smart_pest_management_for_the_vegetable_garden');
 assert.equal(core.SOURCE.umn,'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects');
 assert.equal(core.SOURCE.lantern,'https://www.michigan.gov/invasives/id-report/insects/spotted-lanternfly');
});
test('seasonal and source links exist and do not create fake probabilities',()=>{
 for(const p of core.PESTS)assert.ok(p.source.startsWith('https://'));
 const json=JSON.stringify(select('roses',7,'flowering',{weather:weather(['hot_dry'])}));
 assert.ok(!/probability of (infestation|pests)|confirmed in your garden|local pests are absent/i.test(json));
});
function hourlyFixture(nowMs, {wet=false,hot=false}={}){
 const periods=Array.from({length:78},(_,i)=>({
  startTime:new Date(nowMs+i*3600000).toISOString(),
  temperatureUnit:'F',temperature:hot?87:wet?70:74,
  probabilityOfPrecipitation:{value:hot?10:wet?75:20},
  relativeHumidity:{value:hot?45:wet?94:56}
 }));
 return {properties:{updated:new Date(nowMs-1000).toISOString(),periods}};
}
test('NWS parser classifies 72h hot/dry cue and preserves scientific disclaimer',()=>{
 const now=Date.UTC(2026,6,12,12);
 const w=api._test.parseForecast(hourlyFixture(now,{hot:true}),now);
 assert.equal(w.status,'AVAILABLE');
 assert.ok(w.tags.includes('hot_dry'));assert.ok(!w.tags.includes('wet'));
 assert.ok(w.method.includes('not observed local pest'));
});
test('NWS production hourly API uses updateTime rather than updated',()=>{
 const now=Date.UTC(2026,10,2,12);
 const forecast=hourlyFixture(now,{wet:true});
 forecast.properties.updateTime=forecast.properties.updated;
 delete forecast.properties.updated;
 const actual=api._test.parseForecast(forecast,now);
 assert.equal(actual.status,'AVAILABLE');
 assert.equal(actual.issuedAt,forecast.properties.updateTime);
 assert.ok(actual.tags.includes('wet'));
});
test('NWS updateTime takes precedence over a conflicting deprecated updated field',()=>{
 const now=Date.UTC(2026,10,2,12);
 const forecast=hourlyFixture(now);
 forecast.properties.updateTime=new Date(now-48*3600000).toISOString();
 assert.throws(()=>api._test.parseForecast(forecast,now),/STALE/);
});
test('NWS parser identifies wet weather, not disease confirmation',()=>{
 const now=Date.UTC(2026,6,12,12);
 const w=api._test.parseForecast(hourlyFixture(now,{wet:true}),now);
 assert.ok(w.tags.includes('wet'));
 assert.ok(!w.tags.includes('hot_dry'));
});
test('missing NWS humidity and precipitation never become artificial dry or wet risk',()=>{
 const now=Date.UTC(2026,6,12,12);
 const payload=hourlyFixture(now,{hot:true});
 for(const period of payload.properties.periods){
  period.relativeHumidity={value:null};
  period.probabilityOfPrecipitation={value:null};
 }
 const w=api._test.parseForecast(payload,now);
 assert.equal(w.status,'PARTIAL');
 assert.equal(w.completePercentHours,0);
 assert.deepEqual(w.tags,[]);
 assert.match(w.summary,/incomplete/i);
 const d=select('tomatoes',7,'growing',{weather:w});
 assert.ok(d.all.every(p=>p.weatherFavorable===false));
});
test('NWS stale, missing, implausible and incomplete forecasts fail closed',()=>{
 const now=Date.UTC(2026,6,12,12);
 assert.throws(()=>api._test.parseForecast({},now));
 const old=hourlyFixture(now);old.properties.updated=new Date(now-48*3600000).toISOString();
 assert.throws(()=>api._test.parseForecast(old,now),/STALE/);
 const empty=hourlyFixture(now);empty.properties.periods=[];
 assert.throws(()=>api._test.parseForecast(empty,now),/INCOMPLETE/);
});
test('NWS link target is pinned to official HTTPS gridpoints, never third-party URL',async()=>{
 const site={lat:43.6028,lon:-83.9631};
 const fake=async()=>({ok:true,json:async()=>({properties:{forecastHourly:'https://not-weather-gov.example/gridpoints/GRR/10,10/forecast/hourly'}})});
 await assert.rejects(()=>api._test.nws(site,fake,Date.UTC(2026,6,12,12)),/UNTRUSTED_URL/);
});
test('invalid ZIP is rejected before weather request',async()=>{
 const req={method:'GET',query:{zip:'99999',crop:'squash'}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(s){this.code=s;return this;},json(data){this.body=data;return this;}};
 await api(req,res);
 assert.equal(res.code,400);assert.equal(res.body.code,'INVALID_ZIP');
});
