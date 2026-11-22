import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Field from '../lib/winter-trail-field-weather.cjs';
import {interpretAreaEvidence} from '../public/assets/michigan-winter-trail-weather.js';

const read=path=>readFileSync(path,'utf8');
const html=read('public/michigan-winter-trails/index.html');
const api=read('api/winter-hike-lab.js');
const browser=read('public/assets/michigan-winter-trail-weather.js');
const leaflet=read('public/assets/michigan-winter-trails.js');
const css=read('public/assets/michigan-winter-trails.css');
const epoch=Date.parse('2026-12-12T17:00:00Z');
const date='2026-12-12';
const points=[...html.matchAll(/<article class="wf-story" id="([^"]+)" data-tag="[^"]+" data-access="[^"]+" data-region="[^"]+" data-effort="[^"]+" data-lat="([^"]+)" data-lng="([^"]+)"/g)]
 .map(([,id,lat,lon])=>({id,lat:+lat,lon:+lon}));
const fixture=(overrides={})=>({
 generatedAt:'2026-12-12T16:58:00Z',
 snow:{kind:'modeled',depthInches:7.6,validDate:'2026-12-12'},
 forecast:{targetCovered:true,updatedAt:'2026-12-12T16:40:00Z',sourceUrl:'https://api.weather.gov/gridpoints/APX/35,42/forecast/hourly',
  tempMinF:18,tempMaxF:27,windMph:12,windChillF:8,freezeThaw:false,rainOrFreezingRain:false,hours:7},
 alerts:{status:'verified',events:[],checkedAt:'2026-12-12T16:55:00Z'},
 ...overrides
});

test('all and only 15 published trail weather-reference coordinates are allowlisted',()=>{
 assert.equal(points.length,15);
 assert.deepEqual(Object.keys(Field.POINTS).sort(),points.map(x=>x.id).sort());
 for(const p of points){
  assert.ok(Math.abs(Field.POINTS[p.id].lat-p.lat)<0.000001,p.id+' latitude drift');
  assert.ok(Math.abs(Field.POINTS[p.id].lon-p.lon)<0.000001,p.id+' longitude drift');
  assert.ok(Object.isFrozen(Field.POINTS[p.id]),p.id+' must be immutable');
 }
 assert.equal(Field.POINTS['stop-7'].lat,Field.POINTS['stop-8'].lat,'shared Vasa area');
 assert.equal(Field.POINTS['stop-7'].lon,Field.POINTS['stop-8'].lon,'shared Vasa area');
});

test('unknown, prototype, query-injected, and nonpublished trail IDs fail before any network request',async()=>{
 for(const bad of ['stop-0','stop-16','__proto__','constructor','stop-1?lat=0','../../stop-1','']){
  assert.ok(Field.input(bad,date,epoch).error,bad);
  let calls=0;
  await assert.rejects(Field.forTrail(bad,date,{now:epoch,load:async()=>{calls++;return fixture()}}),
   /Choose one of the published/);
  assert.equal(calls,0);
 }
 for(const bad of ['2026-02-30','2025-01-01','2027-01-01','evil','2026-12-20']){
  assert.ok(Field.input('stop-1',bad,epoch).error,bad);
 }
});

test('weather evidence remains distinct from trail access, grooming, route geometry and parking',async()=>{
 let seen=null;
 const result=await Field.forTrail('stop-1',date,{now:epoch,
  load:async(point,day,options)=>{seen={point,day,options};return fixture()}});
 assert.deepEqual(seen.point,Field.POINTS['stop-1']);
 assert.equal(seen.day,date);
 assert.equal(seen.options.now,epoch);
 assert.equal(result.status,'area-weather-context-not-trip-clearance');
 assert.equal(result.snow.depthInches,7.6);
 assert.equal(result.forecast.tempMinF,18);
 assert.equal(result.alerts.status,'checked');
 assert.equal(result.access.status,'not-verified');
 assert.equal(result.access.navigationReady,false);
 for(const field of ['routeGeometry','grooming','road','parking'])assert.equal(result.access[field],'not-verified');
 assert.match(result.referencePoint.meaning,/not a route/);
 assert.match(result.snow.meaning,/not snow on the named trail/);
 assert.match(result.forecast.meaning,/not a ground observation/);
});

test('stale, future, malformed and incomplete sources fail closed independently',()=>{
 const invalid=Field.scopeEvidence('stop-1',date,fixture({
  snow:{kind:'modeled',depthInches:18,validDate:'2026-12-07'},
  forecast:{...fixture().forecast,updatedAt:'2026-12-10T14:00:00Z'},
  alerts:{status:'verified',events:[],checkedAt:'2026-12-10T16:55:00Z'}
 }),epoch);
 assert.equal(invalid.snow.status,'unavailable');
 assert.equal(invalid.snow.depthInches,null);
 assert.equal(invalid.forecast.status,'unavailable');
 assert.equal(invalid.forecast.tempMinF,null);
 assert.equal(invalid.alerts.status,'unavailable');
 assert.equal(invalid.alerts.events.length,0);
 const partial=Field.scopeEvidence('stop-1',date,fixture({
  snow:{kind:'unavailable'},
  forecast:fixture().forecast,
  alerts:{status:'unavailable',events:[],checkedAt:null}
 }),epoch);
 assert.equal(partial.snow.status,'unavailable');
 assert.equal(partial.forecast.status,'forecast');
 assert.equal(partial.alerts.status,'unavailable');
 const future=Field.scopeEvidence('stop-1',date,fixture({
  snow:{kind:'modeled',depthInches:0,validDate:'2026-12-15'}
 }),epoch);
 assert.equal(future.snow.status,'unavailable');
 const zero=Field.scopeEvidence('stop-1',date,fixture({
  snow:{kind:'modeled',depthInches:0,validDate:date}
 }),epoch);
 assert.equal(zero.snow.status,'modeled');
 assert.equal(zero.snow.depthInches,0,'zero snow cannot be turned into missing data');
});

test('client refuses mismatched responses and expires late cached weather',()=>{
 const good=Field.scopeEvidence('stop-1',date,fixture(),epoch);
 const interpreted=interpretAreaEvidence(good,'stop-1',date,epoch);
 assert.equal(interpreted.valid,true);
 assert.equal(interpreted.snow.inches,7.6);
 assert.equal(interpreted.forecast.known,true);
 assert.equal(interpreted.alerts.known,true);
 assert.deepEqual(interpreted.alerts.events,[]);
 assert.equal(interpretAreaEvidence(good,'stop-2',date,epoch).valid,false);
 assert.equal(interpretAreaEvidence(good,'stop-1','2026-12-13',epoch).valid,false);
 assert.equal(interpretAreaEvidence({...good,referencePoint:{lat:0,lon:0}},'stop-1',date,epoch).valid,false);
 const expired=interpretAreaEvidence(good,'stop-1',date,epoch+4*86400000);
 assert.equal(expired.valid,true);
 assert.equal(expired.snow.known,false);
 assert.equal(expired.forecast.known,false);
 assert.equal(expired.alerts.known,false);
});

test('NWS alerts are reported without clearing roads or declaring future safety',()=>{
 const f=fixture({alerts:{status:'verified',events:['Winter Storm Warning'],checkedAt:'2026-12-12T16:55:00Z'}});
 const data=Field.scopeEvidence('stop-9',date,f,epoch);
 assert.deepEqual(data.alerts.events,['Winter Storm Warning']);
 assert.equal(data.access.navigationReady,false);
 assert.match(data.alerts.meaning,/not a forecast of future warnings/);
 const ui=interpretAreaEvidence(data,'stop-9',date,epoch);
 assert.deepEqual(ui.alerts.events,['Winter Storm Warning']);
});

test('existing API reuses the weather adapter with strict read-only method and no new service',()=>{
 assert.match(api,/const FieldWeather=require\('\.\.\/lib\/winter-trail-field-weather\.cjs'\)/);
 assert.match(api,/if\(mode==='field-weather'\)/);
 assert.match(api,/FieldWeather\.input\(id,date\)/);
 assert.match(api,/await FieldWeather\.forTrail\(id,date\)/);
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/X-Robots-Tag/);
 assert.match(api,/field-weather'\]/);
 assert.doesNotMatch(api,/req\.query\?\.lat|req\.query\?\.lon|req\.query\?\.url/);
});

test('weather is a collapsed map-adjacent action, not another above-fold hero or ad slot',()=>{
 const m=html.indexOf('id="wf-map"'),w=html.indexOf('id="trl-weather-lens"'),
  access=html.indexOf('id="trl-winter-access"'),story=html.indexOf('id="wf-stories"');
 assert.ok(m<w&&w<access&&access<story);
 assert.match(html,/<details class="trl-weather-lens" id="trl-weather-lens">/);
 assert.doesNotMatch(html,/<details class="trl-weather-lens"[^>]*\bopen\b/);
 assert.match(html,/id="trl-weather-check" hidden/);
 assert.match(html,/id="trl-weather-trail" disabled/);
 assert.match(html,/id="trl-weather-date" type="date" disabled/);
 assert.match(html,/href="https:\/\/www.nohrsc.noaa.gov\/nsa\/"/);
 assert.match(html,/href="https:\/\/www.weather.gov\/documentation\/services-web-api"/);
 assert.match(html,/script type="module" src="\/assets\/michigan-winter-trail-weather.js"/);
 assert.match(browser,/winter-trails:check-weather/);
 assert.match(leaflet,/winter-trails:check-weather/);
 assert.match(browser,/new AbortController/);
 assert.match(browser,/ticket!==sequence/);
 assert.match(browser,/card\.dataset\.lat/);
 assert.match(css,/\.trl \.trl-weather-controls/);
 assert.match(css,/\.trl \.trl-weather-lens>summary:focus-visible/);
 assert.equal((html.match(/class="wf-story"/g)||[]).length,15);
 assert.match(html,/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/michigan-winter-trails\/"/);
});
