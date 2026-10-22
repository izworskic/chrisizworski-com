'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Live=require('../lib/winter-hike-live.cjs');
const Trip=require('../lib/winter-hike-trip.cjs');
const E=require('../lib/winter-hike-decision.cjs');
const manager=require('../data/winter-hike/michigan-manager-evidence.json');
const raw=require('../data/winter-hike/michigan-dnr-candidates.json');
const site=E.normalizePoint(raw.records.find(x=>x.Title==='Muncie Lake Pathway'));
const fixed=Date.parse('2026-12-12T15:00:00Z'),date='2026-12-12';
const noaa=(value='0.09',dateText='12/12/2026 8:00:00 AM')=>({results:[
  {layerId:2,layerName:'Footprint',attributes:{idp_validtime:dateText}},
  {layerId:3,layerName:'Image',attributes:{'Service Pixel Value':value}}
]});
const hours=(date='2026-12-12',options={})=>({
 properties:{updateTime:options.updateTime||'2026-12-12T14:00:00Z',periods:
 Array.from({length:24},(_,hour)=>({
 startTime:date+'T'+String(hour).padStart(2,'0')+':00:00-05:00',
 temperature:options.temp??26,temperatureUnit:options.unit||'F',
 windSpeed:options.wind||'9 mph',
 shortForecast:options.forecast||'Cloudy'
 }))}});
const alert=(event='Winter Storm Warning',onset='2026-12-12T14:00:00Z',ends='2026-12-12T22:00:00Z')=>
 ({features:[{properties:{event,onset,ends,expires:ends}}]});
function mockFetch({snow=noaa(),forecast=hours(),alerts={features:[]},points=null,fail=[]}={}) {
 let urls=[];
 const read=async url=>{
  urls.push(url);if(fail.some(s=>url.includes(s)))throw Error('Simulated upstream failure');
  if(url.includes('NOHRSC_Snow_Analysis'))return snow;
  if(url.includes('/points/'))return points||{properties:{forecastHourly:'https://api.weather.gov/gridpoints/APX/35,42/forecast/hourly'}};
  if(url.includes('/gridpoints/'))return forecast;
  if(url.includes('/alerts/active'))return alerts;
  throw Error('Unexpected target '+url);
 };
 read.urls=urls;return read;
}
test('NOAA map query uses point geometry, snow layer, and correct service hostname',()=>{
 const u=Live.snowUrl(site);assert.match(u,/NOHRSC_Snow_Analysis/);
 assert.match(u,/layers=all%3A0/);assert.match(u,/geometryType=esriGeometryPoint/);
 assert.ok(u.includes(encodeURIComponent(site.lon)));
});
test('NOAA raster pixel metres convert to inches; zero is a valid modeled zero',()=>{
 const result=Live.parseNoaa(noaa(),fixed);assert.equal(result.kind,'modeled');
 assert.equal(result.depthInches,3.54);assert.equal(result.validDate,date);
 const zero=Live.parseNoaa(noaa('0'),fixed);assert.equal(zero.depthInches,0);
 assert.match(result.scope,/not measured/);
});
test('NOAA missing/stale/future dates and missing pixel never pretend bare snow',()=>{
 for (const b of [null,{},noaa(''),noaa('-1'),noaa('NaN'),noaa('0','12/07/2026 8:00:00 AM'),noaa('0','12/15/2026 8:00:00 AM'),noaa('0','not-a-date')]){
  const r=Live.parseNoaa(b,fixed);assert.equal(r.kind,'unavailable');assert.equal(r.depthInches,null);
 }
});
test('NWS strictly covers requested local daytime rather than current day',()=>{
 const f=Live.parseHourly(hours(),date,fixed);
 assert.equal(f.targetCovered,true);assert.equal(f.hours,7);
 assert.equal(f.windMph,9);assert.equal(f.tempMinF,26);
 assert.equal(Live.parseHourly(hours(), '2026-12-13', fixed).targetCovered,false);
});
test('NWS accepts Celsius and km/h with wind chill as a weather screening signal',()=>{
 const f=Live.parseHourly(hours(date,{temp:-4,unit:'C',wind:'20 km/h'}),date,fixed);
 assert.equal(f.targetCovered,true);assert.ok(f.windMph>12&&f.windMph<13);
 assert.ok(f.windChillF<25);
});
test('NWS missing or stale updateTime and invalid data never become usable weather',()=>{
 assert.equal(Live.parseHourly(null,date,fixed).targetCovered,false);
 assert.equal(Live.parseHourly(hours(date,{updateTime:'2026-12-10T10:00:00Z'}),date,fixed).targetCovered,false);
 assert.equal(Live.parseHourly(hours(date,{wind:'unknown units'}),date,fixed).targetCovered,false);
});
test('NWS weather identifies freeze-thaw, rain and freezing rain as risks only',()=>{
 const o=hours(date,{forecast:'Freezing Rain'});o.properties.periods[12].temperature=35;
 const f=Live.parseHourly(o,date,fixed);assert.equal(f.freezeThaw,true);
 assert.equal(f.rainOrFreezingRain,true);assert.equal(f.freezingRain,true);
});
test('alert gaps are unknown; active warnings overlapping trip date survive',()=>{
 assert.equal(Live.parseAlerts(null,date,fixed).status,'unavailable');
 assert.deepEqual(Live.parseAlerts({features:[]},date,fixed).events,[]);
 assert.deepEqual(Live.parseAlerts(alert(),date,fixed).events,['Winter Storm Warning']);
 assert.deepEqual(Live.parseAlerts(alert('Blizzard Warning','2026-12-14T12:00:00Z','2026-12-14T20:00:00Z'),date,fixed).events,[]);
});
test('returned NWS forecast URL must remain on the actual forecast endpoint',()=>{
 assert.equal(Live.validForecastUrl('https://api.weather.gov/gridpoints/APX/35,42/forecast/hourly'),true);
 for(const x of ['https://example.com/gridpoints/APX/35,42/forecast/hourly','http://api.weather.gov/gridpoints/APX/35,42/forecast/hourly','https://api.weather.gov@evil.com/gridpoints/APX/35,42/forecast/hourly','https://api.weather.gov/alerts/active']){
 assert.equal(Live.validForecastUrl(x),false);
 }
});
test('bounded per-destination live load caches successful upstream result for fifteen minutes',async()=>{
 const read=mockFetch(),memo=new Map();
 const a=await Live.getTripEvidence(site,date,{fetchJson:read,cache:memo,now:fixed});
 assert.equal(read.urls.length,4);assert.equal(a.snow.kind,'modeled');
 assert.equal(a.forecast.targetCovered,true);assert.equal(a.alerts.status,'verified');
 const b=await Live.getTripEvidence(site,date,{fetchJson:read,cache:memo,now:fixed+10000});
 assert.equal(b,a);assert.equal(read.urls.length,4);
});
test('independent source failures do not fabricate zero snow or no weather warnings',async()=>{
 const read=mockFetch({fail:['NOHRSC_','/alerts/active','/gridpoints/']});
 const r=await Live.getTripEvidence(site,date,{fetchJson:read,cache:new Map(),now:fixed});
 assert.equal(r.snow.kind,'unavailable');assert.equal(r.snow.depthInches,null);
 assert.equal(r.forecast.targetCovered,false);assert.equal(r.alerts.status,'unavailable');
});
test('refuses off-horizon trip dates and out-of-Michigan source points',async()=>{
 const read=mockFetch();
 await assert.rejects(Live.getTripEvidence(site,'2026-12-25',{fetchJson:read,cache:new Map(),now:fixed}));
 await assert.rejects(Live.getTripEvidence({...site,lat:35},date,{fetchJson:read,cache:new Map(),now:fixed}));
 assert.equal(read.urls.length,0);
});
test('an untrusted NWS URL never causes an arbitrary outbound fetch',async()=>{
 const read=mockFetch({points:{properties:{forecastHourly:'https://attacker.example/path'}}});
 const r=await Live.getTripEvidence(site,date,{fetchJson:read,cache:new Map(),now:fixed});
 assert.equal(r.forecast.targetCovered,false);
 assert.ok(read.urls.every(x=>!x.includes('attacker.example')));
});
test('static manager information never grants current winter parking or road access',()=>{
 const a=Trip.resolveAccess(site);
 assert.equal(a.managerConfirmed,false);assert.equal(a.road,'unverified');
 assert.equal(a.navigationReady,false);assert.equal(a.winterParkingCoordinates,null);
});
test('full trip assembly is not a public go recommendation without manager evidence',async()=>{
 const r=await Trip.evaluateTrip(site,date,{fetchJson:mockFetch(),now:fixed,cache:new Map()});
 assert.equal(r.decision.state,'verify');assert.equal(r.decision.activity,'hike');
 // With 3.54 modeled inches, hiking can be a reviewable possibility,
 // but no directions or guarantee follows from a reference point.
 assert.equal(r.navigation.ready,false);assert.equal(r.access.managerConfirmed,false);
});
test('trip assembly holds serious overlapping NWS warning even without access verification',async()=>{
 const r=await Trip.evaluateTrip(site,date,{fetchJson:mockFetch({alerts:alert()}),now:fixed,cache:new Map()});
 assert.equal(r.decision.state,'weather-hold');assert.equal(r.navigation.ready,false);
});
test('missing NWS alert feed is surfaced as a distinct unresolved safety check',async()=>{
 const r=await Trip.evaluateTrip(site,date,{fetchJson:mockFetch({fail:['/alerts/active']}),now:fixed,cache:new Map()});
 assert.equal(r.decision.state,'verify');assert.match(r.decision.verification.join(' '),/alert feed unavailable/);
});
test('manager documented partial closure remains review-needed, not open or fully closed',()=>{
 const hart={id:'090650cb-9a90-4507-92c0-7520eca49af7'};
 const a=Trip.resolveAccess(hart);
 assert.equal(a.trail,'partial-closure');assert.equal(a.managerConfirmed,false);
});
test('cache key distinguishes destination and local outing date',async()=>{
 const read=mockFetch();const c=new Map();
 await Live.getTripEvidence(site,date,{now:fixed,fetchJson:read,cache:c});
 await Live.getTripEvidence(site,'2026-12-13',{now:fixed,fetchJson:read,cache:c});
 assert.equal(c.size,2);assert.equal(read.urls.length,8);
});
