'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const curated=require('../data/shorefeel-us-coast.json').beaches;
const mi=require('../data/shorefeel-epa-mi-2025.json');
const other=require('../data/shorefeel-epa-other-2025.json');
const pub=require('../public/assets/shorefeel-us-epa-2025.json');
const {bySlug,epaBeaches,validLocation}=require('../lib/shorefeel/us-coast.js');
const api=require('../api/shorefeel-us.js');
const lookup=id=>bySlug.get('epa-'+id.toLowerCase());

test('EPA 2025 coverage is source-identified across all eight Great Lakes U.S. states',()=>{
 const source=[...mi.records,...other.records];
 assert.equal(source.length,981);
 assert.equal(epaBeaches.length,981);
 assert.equal(pub.count,981);
 assert.equal(pub.year,2025);
 assert.equal(pub.retrieved,'2026-11-24');
 assert.deepEqual([...new Set(source.map(b=>b.state))].sort(),
  ['IL','IN','MI','MN','NY','OH','PA','WI']);
 assert.deepEqual([...new Set(source.map(b=>b.id))].length,source.length);
 assert.equal(lookup('WI721390').name,'North Beach');
 assert.equal(lookup('MI000290').name,'Bay City State Recreation Area');
 assert.equal(epaBeaches.filter(b=>b.lake==='Huron').length>80,true);
 assert.equal(epaBeaches.filter(b=>b.lake==='Great Lakes').length>100,true);
 for(const b of source){
  assert.match(b.id,/^[A-Z]{2}[A-Z0-9]{4,14}$/);
  assert.equal(typeof b.name,'string');
  assert.ok(b.name.length>2);
  assert.ok(Number.isFinite(b.lat)&&b.lat>=40&&b.lat<=49,b.id);
  assert.ok(Number.isFinite(b.lon)&&b.lon>=-93&&b.lon<=-75,b.id);
  assert.doesNotMatch(b.name,/\bhistorical\b|\bprivate beach\b/i,b.id);
  const found=lookup(b.id);
  assert.ok(found&&validLocation(found),b.id);
  assert.equal(found.country,'US');
  assert.match(found.coordinateNote,/not a verified swim boundary.*parking location/);
  assert.match(found.story,/EPA 2025/);
  assert.ok(found.safety.url.startsWith('https://'));
  assert.ok(found.parkUrl.startsWith('https://beacon.epa.gov/'));
 }
});
test('published manifest matches source snapshots exactly, and never claims current bathing status',()=>{
 const originals=[...mi.records,...other.records];
 const compact=x=>[x.id,x.name,x.state,x.county,x.lat,x.lon,x.lake||null];
 assert.deepEqual(pub.records.map(compact).sort(),originals.map(compact).sort());
 assert.equal(pub.states.length,8);
 assert.match(pub.disclaimer,/not necessarily open, monitored or safe/);
 assert.match(pub.sourceUrl,/epa_beaches_program/);
 assert.ok(mi.scope.includes('non-historical'));
 assert.ok(other.scope.includes('non-dormant'));
});
test('a source-mapped EPA line with marine weather uses only an NWS-verified nearby land grid',async()=>{
 const b=lookup('MI000290'),now=new Date('2026-07-15T12:30:00Z');
 const original=global.fetch,calls=[];
 const land={properties:{type:'land',forecastHourly:'https://api.weather.gov/gridpoints/DTX/75,50/forecast/hourly'}};
 const marine={properties:{type:'marine'}};
 const hourly={properties:{updateTime:'2026-07-15T12:00:00Z',periods:[{
  startTime:'2026-07-15T12:00:00Z',endTime:'2026-07-15T13:00:00Z',
  temperature:73,temperatureUnit:'F',windSpeed:'8 mph',windDirection:'NE',
  relativeHumidity:{value:50}}]}};
 try{
  global.fetch=async url=>{
   calls.push(String(url));
   if(String(url).startsWith('https://apps.glerl.noaa.gov/'))
    return {ok:false,status:503};
   if(String(url).includes('/forecast/hourly'))return {ok:true,json:async()=>hourly};
   if(String(url).includes('/points/'+(b.lat+.014).toFixed(4)+','+b.lon.toFixed(4)))
    return {ok:true,json:async()=>land};
   return {ok:true,json:async()=>marine};
  };
  const answer=await api.lookup(b,now);
  assert.equal(answer.status,'forecast-based');
  assert.equal(answer.epaRecord.beachId,b.epaId);
  assert.equal(answer.epaRecord.inventoryYear,2025);
  assert.equal(answer.airF,73);
  assert.equal(answer.shorelineRealFeel.calibratedOnSand,false);
  assert.equal(answer.shorelineRealFeel.beachAirCorrectionF,null);
  assert.equal(answer.shorelineRealFeel.lakeEffect.status,'unverified');
  assert.equal(calls.filter(url=>url.includes('api.weather.gov/points/')).length,5);
  assert.equal(calls.filter(url=>url.includes('forecast/hourly')).length,1);
  assert.equal(calls.filter(url=>url.includes('apps.glerl.noaa.gov/')).length,1);
  assert.ok(Math.abs(answer.reference.lat-b.lat)<=.015);
 }finally{global.fetch=original;}
});
test('source IDs only, not arbitrary caller coordinates, and no fake swim status',async()=>{
 const response=()=>({statusCode:200,headers:{},
  setHeader(n,v){this.headers[n]=v},
  status(n){this.statusCode=n;return this},
  json(v){this.body=v;return v}});
 for(const id of ['epa-mi999999','epa-../../etc','40.0,-89.0']){
  const r=response();await api({query:{beach:id}},r);
  assert.equal(r.statusCode,400);
  assert.equal(r.headers['X-Robots-Tag'],'noindex, nofollow');
 }
});
test('one existing U.S. canonical explorer loads every EPA record without 981 thin new article URLs',()=>{
 const html=fs.readFileSync(path.join(root,'public/great-lakes-beaches/around-the-lakes/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/assets/shorefeel-us.js'),'utf8');
 const source=fs.readFileSync(path.join(root,'public/assets/shorefeel-us-epa-2025.js'),'utf8');
 assert.match(html,/981 EPA-listed Great Lakes shoreline/);
 assert.ok(html.indexOf('shorefeel-us-epa-2025.js')<html.indexOf('shorefeel-us.js'));
 assert.match(html,/id="shore-show-more"/);
 assert.match(js,/window\.ShoreFeelEPACatalog/);
 assert.match(js,/document\.createElement\('li'\)/);
 assert.match(js,/epaId/);
 assert.match(js,/Math\.min\(zoom\+2,11\)/);
 assert.match(js,/displayLimit\+=48/);
 assert.match(js,/URLSearchParams\(location\.search\)/);
 assert.match(js,/sourceAdded/);
 assert.match(js,/source.*records|sourceRows/);
 assert.doesNotThrow(()=>new Function(source));
 assert.doesNotThrow(()=>new Function(js));
 assert.equal((html.match(/class="shore-stop"/g)||[]).length,16);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.match(html,/#person/);
 assert.equal(html.includes('adsbygoogle.js')||html.includes('pagead2.googlesyndication.com'),false);
});
