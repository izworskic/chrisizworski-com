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
test('existing Soo corridor window gives a useful on-shore watch target and source boundary',()=>{
 const plan=engine.recommendation(report(),context(),now);
 assert.equal(plan.code,'PROMISING');
 assert.match(plan.title,/Sample freighter/);
 assert.match(plan.where,/Soo Locks observation platform/);
 assert.match(plan.when,/Modeled passage/);
 assert.match(plan.when,/If you are already on the waterfront/);
 assert.match(plan.when,/If a short walk away/);
 assert.doesNotMatch(plan.when,/parking|drive|trip/i);
 assert.equal(plan.access.level,'published');
 assert.equal(plan.weather.level,'favorable');
 assert.match(plan.disclaimer,/never guarantees/);
});
test('unknown weather prevents an unconditional on-shore recommendation',()=>{
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
test('Soo window beginning before park closure but ending afterward is not an open-hours recommendation',()=>{
 const crossing={start:'2026-11-08T20:49:00Z',end:'2026-11-09T00:53:00Z'};
 const access=engine.publishedAccess(publicSite('soo'),Date.parse(crossing.start),now,Date.parse(crossing.end));
 assert.equal(access.level,'partial');
 assert.match(access.note,/extends outside published park hours/);
 const plan=engine.recommendation(report({pick:{ship:ship(),window:crossing}}),context(),now);
 assert.equal(plan.code,'HOURS_CONFLICT');
 assert.match(plan.title,/beyond published park hours/);
 assert.match(plan.summary,/ship could arrive after closing/);
 assert.match(plan.when,/Do not expect the park to remain open/);
 assert.notEqual(plan.access.level,'published');
});
test('a window ending at the exact closing minute is acceptable, but one minute later is not',()=>{
 const site=publicSite('soo');
 const start=Date.parse('2026-11-08T20:30:00Z');
 const closing=Date.parse('2026-11-08T23:00:00Z');
 assert.equal(engine.publishedAccess(site,start,now,closing).level,'published');
 assert.equal(engine.publishedAccess(site,start,now,closing+60000).level,'partial');
});
test('overnight passage window cannot borrow tomorrow’s published hours',()=>{
 const site=publicSite('soo');
 const start=Date.parse('2026-11-08T21:00:00Z');
 const tomorrowMorning=Date.parse('2026-11-09T15:00:00Z');
 assert.equal(engine.publishedAccess(site,start,now,tomorrowMorning).level,'partial');
});
test('severe NWS warning blocks a model-backed outing',()=>{
 const alerts=[{event:'High Wind Warning',severity:'Severe',starts:iso(now-3600000),expires:iso(now+3*3600000)}];
 const plan=engine.recommendation(report(),context('soo',forecast({alerts})),now);
 assert.equal(plan.code,'WEATHER_HOLD');
 assert.equal(plan.weather.level,'avoid');
 assert.match(plan.weather.note,/High Wind Warning/);
});
test('wind becoming hazardous in a later hour overrides a favorable first hour',()=>{
 const wideWindow={start:iso(now+30*60000),end:iso(now+150*60000)};
 const periods=[
   {...forecast().periods[1],starts:iso(now+30*60000),ends:iso(now+90*60000),windMph:6},
   {...forecast().periods[1],starts:iso(now+90*60000),ends:iso(now+150*60000),windMph:42}
 ];
 const plan=engine.recommendation(report({pick:{ship:ship(),window:wideWindow}}),
   context('soo',forecast({periods})),now);
 assert.equal(plan.code,'WEATHER_HOLD');
 assert.equal(plan.weather.level,'avoid');
 assert.match(plan.weather.note,/wind up to 42 mph/);
});
test('an alert beginning after the window starts still blocks the outing',()=>{
 const wideWindow={start:iso(now+30*60000),end:iso(now+150*60000)};
 const periods=[
  {...forecast().periods[1],starts:iso(now+30*60000),ends:iso(now+90*60000)},
  {...forecast().periods[1],starts:iso(now+90*60000),ends:iso(now+150*60000)}
 ];
 const alerts=[{event:'Storm Warning',severity:'Severe',starts:iso(now+110*60000),expires:iso(now+180*60000)}];
 const plan=engine.recommendation(report({pick:{ship:ship(),window:wideWindow}}),
   context('soo',forecast({periods,alerts})),now);
 assert.equal(plan.code,'WEATHER_HOLD');
 assert.match(plan.weather.note,/Storm Warning/);
});
test('a missing forecast hour in a broad passage cannot produce favorable conditions',()=>{
 const wideWindow={start:iso(now+30*60000),end:iso(now+150*60000)};
 const periods=[{...forecast().periods[1],starts:iso(now+30*60000),ends:iso(now+90*60000)}];
 const plan=engine.recommendation(report({pick:{ship:ship(),window:wideWindow}}),
   context('soo',forecast({periods})),now);
 assert.equal(plan.code,'VERIFY_BEFORE_TRAVEL');
 assert.equal(plan.weather.level,'unknown');
 assert.match(plan.weather.note,/does not cover the whole ship window/);
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
 assert.match(plan.title,/Look toward the locks/);
 assert.match(plan.when,/not a future passage estimate/);
});
test('near Port Huron moving commercial AIS gives a nearby ship signal without an ETA',()=>{
 const nearby=ship({lat:42.997,lon:-82.423,speedKnots:6,seen:iso(now-2*60000)});
 const r=report({status:'observed',pick:null,observations:[nearby]});
 const plan=engine.recommendation(r,context('port'),now);
 assert.equal(plan.code,'NEARBY_ONLY');
 assert.match(plan.title,/Moving freighter reported near this shoreline/);
 assert.doesNotMatch(plan.summary,/make a trip|drive|parking/i);
 assert.doesNotMatch(plan.when,/Modeled passage/);
 assert.ok(plan.nearNm<1);
});
test('a ship anywhere in Saginaw Bay does not imply a downtown Bay City viewing opportunity',()=>{
 const far=ship({lat:43.96,lon:-83.5,speedKnots:10});
 const r=report({status:'observed',pick:null,observations:[far]});
 const plan=engine.recommendation(r,context('saginaw'),now);
 assert.equal(plan.code,'NO_CLOSE_REPORT');
 assert.match(plan.summary,/vessels missing from receivers/);
});
test('stale, stopped, noncommercial and older vessel reports cannot trigger a nearby ship claim',()=>{
 const cases=[
  ship({lat:42.997,lon:-82.423,speedKnots:0}),
  ship({lat:42.997,lon:-82.423,seen:iso(now-12*60000)}),
  ship({lat:42.997,lon:-82.423,lengthMeters:28,shipType:60})
 ];
 for(const v of cases){
  const r=report({status:'observed',pick:null,observations:[v]});
  assert.equal(engine.recommendation(r,context('port'),now).code,'NO_CLOSE_REPORT');
 }
});
test('no AIS passage model never produces a fictional full modeled access window',()=>{
 const site=publicSite('soo');
 const access=engine.publishedAccess(site,now,now);
 assert.equal(access.level,'published');
 assert.match(access.label,/Selected viewing hour/);
 assert.doesNotMatch(access.label,/modeled window/i);
 const r=report({status:'unknown',pick:null,observations:[],when:'now'});
 const plan=engine.recommendation(r,context('soo'),now);
 assert.equal(plan.code,'NO_CLOSE_REPORT');
 assert.match(plan.access.label,/Selected viewing hour/);
 assert.doesNotMatch(plan.access.label,/modeled window/i);
});
test('on-shore empty signal tells visitors to keep watching rather than leave',()=>{
 const r=report({status:'unknown',pick:null,observations:[],when:'now'});
 const plan=engine.recommendation(r,context('soo'),now);
 assert.equal(plan.code,'NO_CLOSE_REPORT');
 assert.match(plan.title,/No nearby moving freighter confirmed/);
 assert.match(plan.when,/Keep an eye on the waterway/);
 assert.doesNotMatch(plan.title+' '+plan.summary+' '+plan.when,/drive|trip|departure|parking/i);
});
test('source outage offers on-shore unknown rather than a travel recommendation',()=>{
 const r=report({status:'unavailable',pick:null,checkedAt:null,observations:[]});
 const plan=engine.recommendation(r,context('port'),now);
 assert.equal(plan.code,'NO_CLOSE_REPORT');
 assert.match(plan.title,/Live ship positions unavailable/);
 assert.match(plan.summary,/watch the waterway/);
});
test('tomorrow selects actual next-day daylight forecast, never an AIS arrival',()=>{
 const r=report({status:'unknown',when:'tomorrow',pick:null,observations:[]});
 const plan=engine.recommendation(r,context('detroit'),now);
 assert.equal(plan.code,'PLAN_SHORE');
 assert.match(plan.when,/weather hour, not a ship passage time/);
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
 assert.equal(plan.code,'NO_CLOSE_REPORT');
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
 assert.equal(plan.code,'NO_CLOSE_REPORT');
 assert.equal(plan.access.level,'unverified');
 assert.match(plan.summary,/live vessel check could not be completed/);
});
