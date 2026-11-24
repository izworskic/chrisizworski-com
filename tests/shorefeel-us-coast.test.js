'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {data,bySlug,validLocation,officialNwsUrl,windMph,selectPeriod,interpret}=require('../lib/shorefeel/us-coast.js');
const handler=require('../api/shorefeel-us.js');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'public/great-lakes-beaches/around-the-lakes/index.html'),'utf8');
const now=new Date('2026-07-15T12:30:00Z');
const point={properties:{type:'land',forecastHourly:'https://api.weather.gov/gridpoints/LOT/70,75/forecast/hourly'}};
const period={startTime:'2026-07-15T12:00:00Z',endTime:'2026-07-15T13:00:00Z',
  temperature:86,temperatureUnit:'F',windSpeed:'10 to 14 mph',windDirection:'NE',
  relativeHumidity:{value:52},shortForecast:'Sunny'};
const hourly={properties:{updateTime:'2026-07-15T11:30:00Z',periods:[period]}};
function response(){
 return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},
  status(n){this.statusCode=n;return this;},json(x){this.body=x;return x;}};
}

test('US catalog covers 16 verified destinations in seven non-Michigan states and four lakes',()=>{
 assert.equal(data.beaches.length,16);
 assert.deepEqual([...new Set(data.beaches.map(b=>b.state))].sort(),['IL','IN','MN','NY','OH','PA','WI']);
 assert.deepEqual([...new Set(data.beaches.map(b=>b.lake))].sort(),['Erie','Michigan','Ontario','Superior']);
 assert.equal(bySlug.size,16);
 assert.match(data.coverage.Michigan,/Lake Huron/);
 for(const b of data.beaches){
   assert.ok(validLocation(b),b.slug+' must be a valid source-vetted US Great Lakes beach');
   assert.ok(b.coordinateSource.startsWith('https://'),b.slug);
   assert.ok(b.safety.url.startsWith('https://'),b.slug);
   assert.ok(b.parkUrl.startsWith('https://'),b.slug);
   assert.notEqual(b.safety.name,'Michigan BeachGuard',b.slug+' cannot inherit Michigan advisories');
 }
 assert.ok(data.beaches.find(b=>b.slug==='big-bay-state-park').accessAlert.includes('construction'));
});


test('four NWS shoreline references remain in vetted land locations, within the beach area',async()=>{
 // Each location was checked against the live NWS /points endpoint on 2026-11-22.
 // Prior references were classified "marine" and blanked an otherwise available forecast.
 const corrected={
  'park-point-beach-house':{lat:46.722,lon:-92.04},
  'big-bay-state-park':{lat:46.814,lon:-90.677},
  'presque-isle-beach-6':{lat:42.1453,lon:-80.1375},
  'woodlawn-beach-state-park':{lat:42.7895,lon:-78.8524}
 };
 const distanceKm=(lat1,lon1,lat2,lon2)=>{
  const rad=Math.PI/180;
  const x=(lon2-lon1)*rad*Math.cos((lat1+lat2)*rad/2);
  const y=(lat2-lat1)*rad;
  return Math.hypot(x,y)*6371;
 };
 const saved=global.fetch;
 try{
  for(const [slug,expected] of Object.entries(corrected)){
   const beach=bySlug.get(slug);
   assert.ok(beach,slug);
   assert.equal(beach.forecastReference.lat,expected.lat,slug+' verified NWS land latitude');
   assert.equal(beach.forecastReference.lon,expected.lon,slug+' verified NWS land longitude');
   assert.ok(distanceKm(beach.lat,beach.lon,expected.lat,expected.lon)<3,slug+' should use a nearby area forecast');
   const called=[];
   global.fetch=async url=>{
    called.push(String(url));
    return {ok:true,json:async()=>String(url).includes('/points/')?point:hourly};
   };
   const got=await handler.lookup(beach,now);
   assert.equal(got.status,'forecast-based',slug);
   assert.ok(called.find(url=>url.includes('api.weather.gov/points/'))?.endsWith('/points/'+expected.lat.toFixed(4)+','+expected.lon.toFixed(4)),slug+' uses its vetted point');
   assert.equal(called.filter(url=>url.includes('api.weather.gov/')).length,2,slug+' retrieves two source-authenticated NWS calls');
   assert.equal(called.filter(url=>url.includes('apps.glerl.noaa.gov/')).length,1,slug+' checks NOAA water context in parallel');
  }
 }finally{global.fetch=saved;}
});

test('NWS endpoints are same-host official allowlist, not proxy redirects',()=>{
 assert.equal(officialNwsUrl('https://api.weather.gov/gridpoints/LOT/70,75/forecast/hourly'),
  'https://api.weather.gov/gridpoints/LOT/70,75/forecast/hourly');
 for(const invalid of [
  'https://evil.example/gridpoints/LOT/70,75/forecast/hourly',
  'http://api.weather.gov/gridpoints/LOT/70,75/forecast/hourly',
  'https://api.weather.gov.evil.example/gridpoints/LOT/70,75/forecast/hourly',
  'https://api.weather.gov/gridpoints/LOT/70,75/forecast/hourly?redirect=http://evil.example',
  'https://api.weather.gov/alerts/active'
 ])assert.equal(officialNwsUrl(invalid),null,invalid);
});

test('hourly source parser honors forecast period and units without numeric invention',()=>{
 assert.equal(windMph('10 to 14 mph'),14);
 assert.equal(windMph('Calm'),0);
 assert.equal(windMph('8 kt'),null);
 assert.equal(windMph('unknown'),null);
 assert.equal(selectPeriod(hourly.properties.periods,now).temperature,86);
 assert.equal(selectPeriod(hourly.properties.periods,new Date('2026-07-15T15:30:00Z')),null);
 const got=interpret(data.beaches[0],point,hourly,now);
 assert.equal(got.status,'forecast-based');
 assert.equal(got.airF,86);
 assert.equal(got.windMph,14);
 assert.equal(got.windFrom,'NE');
 assert.equal(got.source,'National Weather Service hourly area forecast');
 assert.equal(got.feelsLikeF>86,true,'NWS heat-index effect is not a lake-driven correction');
 assert.match(got.scope,/not a thermometer on the sand/);
 assert.equal(got.risk,'unknown');
 assert.match(got.swimmingSafety,/Not evaluated/);
 assert.match(got.water,/No swimming-area water temperature/);
});

test('marine grid, stale issuance, stale period, incorrect units and bad weather fail closed',()=>{
 const b=data.beaches[0];
 const marine=interpret(b,{properties:{type:'marine'}},hourly,now);
 const outdated=interpret(b,point,{properties:{...hourly.properties,updateTime:'2026-07-13T11:30:00Z'}},now);
 const old=interpret(b,point,{properties:{...hourly.properties,periods:[{...period,startTime:'2026-07-14T12:00:00Z',endTime:'2026-07-14T13:00:00Z'}]}},now);
 const badunit=interpret(b,point,{properties:{...hourly.properties,periods:[{...period,temperatureUnit:'C'}]}},now);
 const noair=interpret(b,point,{properties:{...hourly.properties,periods:[{...period,temperature:null}]}},now);
 for(const result of [marine,outdated,old,badunit,noair]){
   assert.equal(result.status,'unavailable');
   assert.equal(result.feelsLikeF,null);
   assert.equal(result.risk,'unknown');
 }
});

test('API only permits the catalog slug, never returns a false beach safety status',async()=>{
 const bad=response();
 await handler({query:{beach:'../../etc/passwd'}},bad);
 assert.equal(bad.statusCode,400);
 assert.equal(bad.headers['Cache-Control'],'no-store');
 const saved=global.fetch;
 try{
   const calls=[];
   global.fetch=async url=>{
     calls.push(url);
     return {ok:true,json:async()=>url.includes('/points/')?point:hourly};
   };
   const got=await handler.lookup(data.beaches[0],now);
   assert.equal(got.status,'forecast-based');
   assert.equal(calls.filter(url=>url.startsWith('https://api.weather.gov/')).length,2);
   assert.equal(calls.filter(url=>url.startsWith('https://apps.glerl.noaa.gov/')).length,1);
   assert.equal(got.shorelineRealFeel.calibratedOnSand,false);
 }finally{global.fetch=saved;}
});

test('curated list is crawlable and consistent across five lake choices',()=>{
 assert.equal((page.match(/class="shore-stop"/g)||[]).length,16);
 for(const b of data.beaches){
   assert.match(page,new RegExp('data-slug="'+b.slug+'"'));
   assert.ok(page.includes('href="'+b.parkUrl+'"'),b.slug+' official park page');
   assert.ok(page.includes('data-safety-url="'+b.safety.url+'"'),b.slug+' state authority');
 }
 for(const lake of ['Superior','Michigan','Huron','Erie','Ontario'])
   assert.ok(page.includes('data-lake-filter="'+lake+'"'));
 assert.match(page,/href="\/great-lakes-beaches\/"/);
 assert.match(page,/not a thermometer on the sand|not a sand thermometer/i);
 assert.match(page,/No beach is labeled safe, open or recently tested here/);
 for(const link of ['mnbeaches.org/','apps.dnr.wi.gov/beachhealth/','idph.illinois.gov/envhealth/ilbeaches/','portal.idem.in.gov/beachalert/','odh.ohio.gov/know-our-programs/','eriecountypa.gov/departments/health/','beachadvisory.health.ny.gov/'])assert.ok(page.includes(link),'static source fallback for '+link);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-beaches\/around-the-lakes\//);
 assert.match(page,/"dateModified":"2026-11-22"/);
 assert.match(fs.readFileSync(path.join(root,'public/sitemap-beaches.xml'),'utf8'),/around-the-lakes\/</);
 assert.match(fs.readFileSync(path.join(root,'public/great-lakes-beaches/index.html'),'utf8'),/Explore Great Lakes ShoreFeel/);
});

test('the selected client uses textContent and aborts stale requests',()=>{
 const client=fs.readFileSync(path.join(root,'public/assets/shorefeel-us.js'),'utf8');
 assert.match(client,/textContent=text/);
 assert.match(client,/request\.abort\(\)/);
 assert.match(client,/current!==d\.slug/);
 assert.match(client,/mapError/);
 assert.match(client,/Michigan Beach Report/);
 assert.doesNotMatch(client,/api\.open-meteo\.com/);
 assert.doesNotThrow(()=>new Function(client));
});
