'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const lib=require('../lib/shorefeel/canada.js');
const handler=require('../api/shorefeel-canada.js');
const root=path.resolve(__dirname,'..'),now=new Date('2026-11-21T14:30:00Z');
const park=lib.catalogue.beaches.find(p=>p.slug==='sandbanks');
function feature({lat=43.88,lon=-77.30,updated='2026-11-21T14:00:00Z',
  validAt='2026-11-21T15:00:00Z',celsius=6,units='C',wind=22,windUnit='km/h'}={}){
 return {type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{
  name:{en:'Picton',fr:'Picton'},lastUpdated:updated,
  hourlyForecastGroup:{timestamp:{en:updated},hourlyForecasts:[{
    timestamp:validAt,temperature:{units:{en:units},value:{en:celsius}},
    wind:{speed:{units:{en:windUnit},value:{en:wind}},direction:{value:{en:'NW'}}}
  }]}}};
}
const collection=(...features)=>({type:'FeatureCollection',features});
test('16 documented Ontario Parks locations span precisely four Canadian Great Lakes',()=>{
 assert.equal(lib.catalogue.beaches.length,16);
 assert.equal(lib.bySlug.size,16);
 assert.deepEqual([...new Set(lib.catalogue.beaches.map(x=>x.lake))].sort(),['Erie','Huron','Ontario','Superior']);
 assert.equal(lib.catalogue.lakeMichigan,'Lake Michigan has no Canadian coastline');
 assert.ok(!lib.catalogue.beaches.some(x=>x.lake==='Michigan'));
 for(const p of lib.catalogue.beaches){
  assert.ok(lib.validLocation(p),p.slug);
  assert.match(p.coordinatesSource,/^https:\/\/www\.ontarioparks\.ca\/park\/.*\/maps$/);
  assert.equal(p.waterSafety.url,'https://www.ontarioparks.ca/beachresults');
  assert.match(p.coordinateNote,/gatehouse|reference|park/i);
  assert.match(p.parkUrl,/^https:\/\/www\.ontarioparks\.ca\//);
 }
});
test('official MSC GeoMet source URL is bounded and takes only reviewed coordinates',()=>{
 const u=new URL(lib.sourceUrl(park));
 assert.equal(u.hostname,'api.weather.gc.ca');
 assert.equal(u.pathname,'/collections/citypageweather-realtime/items');
 assert.equal(u.searchParams.get('limit'),'100');
 assert.equal(u.searchParams.get('f'),'json');
 assert.equal(u.searchParams.get('bbox').split(',').length,4);
 assert.equal(lib.sourceUrl({...park,country:'US'}),null);
});
test('metric ECCC hourly forecast becomes clearly attributed regional air, never a sand thermometer',()=>{
 const got=lib.chooseForecast(park,collection(feature()),now);
 assert.equal(got.status,'regional-forecast');
 assert.equal(got.city,'Picton');
 assert.equal(got.temperatureC,6);
 assert.equal(got.temperatureF,43);
 assert.equal(got.windKmh,22);
 assert.equal(got.windFrom,'NW');
 assert.equal(got.forecastValidAt,'2026-11-21T15:00:00Z');
 assert.match(got.scope,/city forecast/);
 assert.match(got.scope,/Not a measurement or calibrated temperature on the sand/);
 assert.equal(got.swimSafety,'not-checked');
 assert.equal(got.waterTemperature,'not-measured');
});
test('closest eligible city used, with no false remote-city substitution',()=>{
 const close=feature({lat:43.89,lon:-77.29});
 const far=feature({lat:44.05,lon:-77.45});
 const pick=lib.chooseForecast(park,collection(far,close),now);
 assert.equal(pick.status,'regional-forecast');
 assert.ok(pick.cityDistanceKm<20);
 const remote=lib.chooseForecast(park,collection(feature({lat:45.5,lon:-77.3})),now);
 assert.equal(remote.status,'unavailable');
 assert.equal(remote.temperatureC,null);
});
test('stale, invalid units, invalid times and empty source fail closed',()=>{
 const variants=[
  collection(feature({updated:'2026-11-20T01:00:00Z'})),
  collection(feature({validAt:'2026-11-22T15:00:00Z'})),
  collection(feature({units:'F'})),
  collection(feature({celsius:null})),
  collection(),{type:'Garbage',features:[feature()]}
 ];
 for(const response of variants){
  const got=lib.chooseForecast(park,response,now);
  assert.equal(got.status,'unavailable');
  assert.equal(got.temperatureC,null);
  assert.equal(got.swimSafety,'not-checked');
 }
});
test('Canada API allows only reviewed parks and always sets noindex',async()=>{
 function response(){return {headers:{},statusCode:200,body:null,setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this},json(v){this.body=v;return v}}}
 const bad=response();await handler({query:{beach:'../../etc/passwd'}},bad);
 assert.equal(bad.statusCode,400);assert.equal(bad.headers['X-Robots-Tag'],'noindex, nofollow');
 const save=global.fetch;
 try{
  const calls=[];
  global.fetch=async url=>{calls.push(url);return {ok:true,json:async()=>collection(feature())}};
  const got=await handler.fetchCityForecast(park,now);
  assert.equal(got.status,'regional-forecast');
  assert.equal(calls.length,1);
  assert.ok(calls[0].startsWith('https://api.weather.gc.ca/collections/citypageweather-realtime/items?'));
 }finally{global.fetch=save}
});
test('Canadian field guide exposes all 16 source links without client JavaScript',()=>{
 const html=fs.readFileSync(path.join(root,'public/great-lakes-beaches/canada/index.html'),'utf8');
 assert.equal((html.match(/class="park-item"/g)||[]).length,16);
 for(const p of lib.catalogue.beaches){
  assert.ok(html.includes('data-park="'+p.slug+'"'),p.slug);
  assert.ok(html.includes('href="'+p.parkUrl+'"'),p.slug+' must have original park link');
 }
 for(const l of lib.LAKES)assert.ok(html.includes('data-lake="'+l+'"'));
 assert.match(html,/<noscript>/);
 assert.match(html,/https:\/\/www\.ontarioparks\.ca\/beachresults/);
 assert.match(html,/Lake Michigan lies entirely within the United States/);
 assert.match(html,/Not a measurement|not an on-sand thermometer/i);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-beaches\/canada\//);
 assert.match(fs.readFileSync(path.join(root,'public/sitemap-beaches.xml'),'utf8'),/great-lakes-beaches\/canada\//);
});
test('browser client resets source state when changing parks and avoids untrusted HTML',()=>{
 const js=fs.readFileSync(path.join(root,'public/assets/shorefeel-canada.js'),'utf8');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/controller\.abort\(\)/);
 assert.match(js,/active!==d\.park/);
 assert.match(js,/textContent=v/);
 assert.match(js,/mapUnavailable/);
 assert.doesNotMatch(js,/api\.open-meteo\.com|api\.weather\.gov/);
});
