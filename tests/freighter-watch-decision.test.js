'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../public/assets/freighter-watch-decision.js');
const {publicSite,sites}=require('../lib/freighter-watch-sites');
const now=Date.parse('2026-11-08T17:30:00Z');
const iso=ms=>new Date(ms).toISOString();
const ship=(extra={})=>({mmsi:'366123456',name:'Sample freighter',lat:46.504,lon:-84.355,
  seen:iso(now-3*60000),speedKnots:8,lengthMeters:230,shipType:70,confidence:.77,...extra});
const window={start:iso(now+30*60000),end:iso(now+90*60000)};
const report=(extra={})=>({status:'window',when:'now',checkedAt:iso(now-40*1000),
  pick:{ship:ship(),window},observations:[ship()],...extra});
function forecast(extra={}){
 const current={starts:iso(now-30*60000),ends:iso(now+30*60000),isDaytime:true,
   temperatureF:45,windMph:8,precipProbability:10,shortForecast:'Mostly sunny'};
 const future={...current,starts:iso(now+30*60000),ends:iso(now+90*60000)};
 const tomorrow={...current,starts:'2026-11-09T18:00:00Z',ends:'2026-11-09T19:00:00Z'};
 return {ok:true,checkedAt:iso(now-60000),sourceUrl:'https://www.weather.gov/',
   alertsStatus:'available',alerts:[],periods:[current,future,tomorrow],...extra};
}
const context=(id='soo',weather=forecast())=>({site:publicSite(id),weather});
test('six named public spots have linked official access sources, forecast points and named directions',()=>{
 assert.equal(Object.keys(sites).length,6);
 for(const id of Object.keys(sites)){
   const site=publicSite(id);
   assert.ok(site.name&&site.address&&site.notes);
   assert.match(site.accessUrl,/^https:\/\//);
   assert.match(site.directionsUrl,/^https:\/\/www.google.com\/maps\/search\//);
   assert.ok(Number.isFinite(site.lat)&&Number.isFinite(site.lon));
   assert.equal(site.reviewed,'2026-11-08');
 }
});
test('existing Soo corridor window produces a qualified destination, arrival lead and source boundary',()=>{
 const plan=engine.recommendation(report(),context(),now);
 assert.equal(plan.code,'PROMISING');
 assert.match(plan.title,/Sample freighter/);
 assert.match(plan.where,/Soo Locks observation platform/);
 assert.match(plan.when,/Modeled passage/);
 assert.match(plan.when,/by/);
 assert.equal(plan.access.level,'published');
 assert.equal(plan.weather.level,'favorable');
 assert.match(plan.disclaimer,/never guarantees/);
});
test('weather unknown never becomes an affirmative trip recommendation',()=>{
 const plan=engine.recommendation(report(),context('soo',{ok:false}),now);
 assert.equal(plan.code,'VERIFY_BEFORE_TRAVEL');
 assert.equal(plan.weather.level,'unknown');
});
test('out of park hours blocks even supported vessel passage',()=>{
 const late={start:'2026-11-09T02:00:00Z',end:'2026-11-09T02:40:00Z'};
 const plan=engine.recommendation(report({pick:{ship:ship(),window:late}}),context(),now);
 assert.equal(plan.code,'HOURS_CONFLICT');
 assert.equal(plan.access.level,'outside');
});
test('severe NWS warning blocks a model-backed outing',()=>{
 const alerts=[{event:'High Wind Warning',severity:'Severe',starts:iso(now-3600000),expires:iso(now+3*3600000)}];
 const plan=engine.recommendation(report(),context('soo',forecast({alerts})),now);
 assert.equal(plan.code,'WEATHER_HOLD');
 assert.equal(plan.weather.level,'avoid');
 assert.match(plan.weather.note,/High Wind Warning/);
});
test('wind forecast can veto a sunny-looking passage even without an active alert',()=>{
 const periods=forecast().periods.map(p=>({...p,windMph:41}));
 const plan=engine.recommendation(report(),context('soo',forecast({periods})),now);
 assert.equal(plan.code,'WEATHER_HOLD');
});
test('NWS alerts unavailable prevents a weather clearance',()=>{
 const plan=engine.recommendation(report(),context('soo',forecast({alertsStatus:'unavailable'})),now);
 assert.equal(plan.code,'VERIFY_BEFORE_TRAVEL');
 assert.equal(plan.weather.level,'unverified');
});

test('fresh source-classified Soo in-lock vessel gives only an immediate nearby opportunity',()=>{
 const inLock={...ship({speedKnots:0}),state:'in-lock',chamberName:'Poe Lock'};
 const r=report({status:'in-lock',pick:null,inLock,observations:[inLock],when:'now'});
 const plan=engine.recommendation(r,context('soo'),now);
 assert.equal(plan.code,'LOCAL_IN_LOCK');
 assert.match(plan.title,/reported in the locks now/);
 assert.match(plan.when,/not a future arrival/);
});
test('near Port Huron moving commercial AIS yields only a local opportunistic look',()=>{
 const nearby=ship({lat:42.997,lon:-82.423,speedKnots:6,seen:iso(now-2*60000)});
 const r=report({status:'observed',pick:null,observations:[nearby]});
 const plan=engine.recommendation(r,context('port'),now);
 assert.equal(plan.code,'NEARBY_ONLY');
 assert.match(plan.title,/already nearby/);
 assert.doesNotMatch(plan.when,/Modeled passage/);
 assert.ok(plan.nearNm<1);
});
test('a ship anywhere in Saginaw Bay does not imply a downtown Bay City viewing opportunity',()=>{
 const far=ship({lat:43.96,lon:-83.5,speedKnots:10});
 const r=report({status:'observed',pick:null,observations:[far]});
 const plan=engine.recommendation(r,context('saginaw'),now);
 assert.equal(plan.code,'NO_SHIP_TRIP');
 assert.match(plan.summary,/far away or stationary/);
});
test('stale, stopped, noncommercial and older vessel reports cannot trigger drive advice',()=>{
 const cases=[
  ship({lat:42.997,lon:-82.423,speedKnots:0}),
  ship({lat:42.997,lon:-82.423,seen:iso(now-12*60000)}),
  ship({lat:42.997,lon:-82.423,lengthMeters:28,shipType:60})
 ];
 for(const v of cases){
  const r=report({status:'observed',pick:null,observations:[v]});
  assert.equal(engine.recommendation(r,context('port'),now).code,'NO_SHIP_TRIP');
 }
});
test('tomorrow selects actual next-day daylight forecast, never an AIS arrival',()=>{
 const r=report({status:'unknown',when:'tomorrow',pick:null,observations:[]});
 const plan=engine.recommendation(r,context('detroit'),now);
 assert.equal(plan.code,'PLAN_SHORE');
 assert.match(plan.when,/No vessel schedule/);
 assert.match(plan.where,/Cullen Plaza/);
 assert.equal(engine.dayKey(plan.weather.at,'America/Detroit'),'2026-11-09');
});
test('a nighttime shoreline time is caution, not a carefree outing',()=>{
 const night={starts:'2026-11-09T02:00:00Z',ends:'2026-11-09T03:00:00Z',isDaytime:false,
  temperatureF:41,windMph:5,precipProbability:5,shortForecast:'Clear'};
 const after=Date.parse('2026-11-09T02:05:00Z');
 const r=report({checkedAt:iso(after-5000),pick:null,status:'observed',observations:[],
  when:'now'});
 const weather=forecast({checkedAt:iso(after-10000),periods:[night]});
 const plan=engine.recommendation(r,context('port',weather),after);
 assert.equal(plan.weather.level,'caution');
 assert.equal(plan.code,'NO_SHIP_TRIP');
});
test('published hours expire into verify-only rather than evergreen open-now claims',()=>{
 const farLater=Date.parse('2027-09-01T17:30:00Z');
 const site=publicSite('soo');
 const access=engine.publishedAccess(site,farLater,farLater);
 assert.equal(access.level,'unverified');
 assert.match(access.note,/older than six months/);
});
test('weather fails closed when timestamp stale or period not relevant',()=>{
 const old=forecast({checkedAt:iso(now-90*60000)});
 assert.equal(engine.chooseHour(old,'now',window,now,'America/Detroit').level,'unknown');
 const other=forecast({periods:[{...forecast().periods[0],starts:'2026-11-15T15:00:00Z',ends:'2026-11-15T16:00:00Z'}]});
 assert.equal(engine.chooseHour(other,'now',window,now,'America/Detroit').level,'unknown');
});
test('the no-ship weather view does not promise safe public access',()=>{
 const r=report({status:'unavailable',pick:null,observations:[],checkedAt:null});
 const plan=engine.recommendation(r,context('duluth'),now);
 assert.equal(plan.code,'NO_SHIP_TRIP');
 assert.equal(plan.access.level,'unverified');
 assert.match(plan.summary,/unavailable/);
});
