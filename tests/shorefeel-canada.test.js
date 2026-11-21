'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {catalog,bySlug,validBeach,bboxUrl,sourceValue,kmBetween,chooseFeature,forecastPeriod,interpret}=require('../lib/shorefeel/canada.js');
const handler=require('../api/shorefeel-ca.js');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'public/great-lakes-beaches/canada/index.html'),'utf8');
const now=new Date('2026-11-21T14:30:00Z');
const b=catalog.locations[0];
const feature={
 type:'Feature',geometry:{type:'Point',coordinates:[b.reference.lon+.08,b.reference.lat+.04]},
 properties:{
  identifier:'on-145',name:{en:'Nearby ECCC town'},
  lastUpdated:'2026-11-21T14:00:00Z',
  hourlyForecastGroup:{timestamp:{en:'2026-11-21T14:00:00Z'},
   hourlyForecasts:[{timestamp:'2026-11-21T15:00:00Z',temperature:{value:{en:-6}},
    wind:{speed:{value:{en:21}},direction:{value:{en:'NW'}}}}]}
 }
};
const collection={type:'FeatureCollection',features:[feature]};
const sample=()=>JSON.parse(JSON.stringify(collection));
test('all 18 curated Canadian locations are unique, source-linked and only on actual Canadian Great Lakes',()=>{
 assert.equal(catalog.locations.length,18);
 assert.equal(bySlug.size,18);
 assert.deepEqual([...new Set(catalog.locations.map(x=>x.lake))].sort(),['Erie','Huron','Ontario','Superior']);
 for(const beach of catalog.locations){
  assert.equal(validBeach(beach),true,beach.slug);
  assert.equal(beach.country,'Canada');
  assert.equal(beach.province,'Ontario');
  assert.ok(beach.officialUrl.startsWith('https://'),beach.slug);
  assert.ok(beach.advisory.url.startsWith('https://'),beach.slug);
  assert.match(bboxUrl(beach),/^https:\/\/api\.weather\.gc\.ca\/collections\/citypageweather-realtime\/items\?bbox=/);
  assert.match(beach.reference.precision,/not verified parking/i);
 }
 assert.match(catalog.doesNotCover,/Michigan/);
});
test('choose geographically nearest ECCC city point and do not substitute remote forecast',()=>{
 const far=sample().features[0];far.geometry.coordinates=[-89.5,42];far.properties.identifier='on-123';
 const closer=sample().features[0];
 const pick=chooseFeature(b,{features:[far,closer]});
 assert.equal(pick.feature.properties.identifier,'on-145');
 assert.ok(pick.distanceKm<55);
 assert.equal(chooseFeature(b,{features:[far]}),null);
 assert.ok(kmBetween(43,-80,43,-80)<0.01);
});
test('missing, stale, marine and invalid hours never become an on-sand temperature',()=>{
 const no=sample();no.features[0].properties.lastUpdated='2026-11-19T12:00:00Z';
 const old=sample();old.features[0].properties.hourlyForecastGroup.hourlyForecasts[0].timestamp='2026-11-21T10:00:00Z';
 const marine=sample();marine.features[0].geometry.coordinates=[-87,43];
 const wrong=sample();wrong.features[0].properties.hourlyForecastGroup.hourlyForecasts[0].temperature.value.en=null;
 for(const x of [no,old,marine,wrong,{features:[]}]){
  const p=interpret(b,x,now);
  assert.equal(p.status,'unavailable');
  assert.equal(p.temperatureC,null);
  assert.equal(p.waterTemperature,null);
  assert.equal(p.swimmingStatus,'not-checked');
 }
});
test('cold Canadian hourly forecast uses valid wind chill and source distance',()=>{
 const p=interpret(b,collection,now);
 assert.equal(p.status,'forecast-based');
 assert.equal(p.temperatureC,-6);
 assert.equal(p.temperatureF,21);
 assert.ok(p.apparentC<-6);
 assert.equal(p.windKmh,21);
 assert.equal(p.windDirection,'NW');
 assert.equal(p.forecastPlace,'Nearby ECCC town');
 assert.ok(p.forecastDistanceKm>0&&p.forecastDistanceKm<55);
 assert.equal(p.isUpcoming,true);
 assert.match(p.scope,/not a thermometer on the sand/);
 assert.equal(p.waterTemperature,null);
 assert.equal(p.swimmingStatus,'not-checked');
 assert.match(p.method,/Canadian wind chill/);
 const warm=sample();warm.features[0].properties.hourlyForecastGroup.hourlyForecasts[0].temperature.value.en=24;
 const result=interpret(b,warm,now);
 assert.equal(result.apparentC,24);
 assert.match(result.method,/forecast air temperature/);
});
test('user cannot supply an arbitrary URL and endpoint is never indexable',async()=>{
 const res={headers:{},statusCode:200,setHeader(n,v){this.headers[n]=v;},status(n){this.statusCode=n;return this;},json(x){this.body=x;return x;}};
 await handler({query:{beach:'https://evil.example'}},res);
 assert.equal(res.statusCode,400);
 assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
 const original=global.fetch;
 try{
  let calls=[];
  global.fetch=async url=>{calls.push(url);return {ok:true,json:async()=>collection};};
  const got=await handler.lookup(b,now);
  assert.equal(got.status,'forecast-based');
  assert.equal(calls.length,1);
  assert.match(calls[0],/^https:\/\/api\.weather\.gc\.ca\/collections\//);
  assert.equal(calls[0].includes('evil.example'),false);
 }finally{global.fetch=original;}
});
test('static Canada page preserves park links and explicit public-health paths when JavaScript is off',()=>{
 assert.equal((page.match(/class="shore-stop"/g)||[]).length,18);
 for(const item of catalog.locations){
  assert.ok(page.includes('data-slug="'+item.slug+'"'),item.slug);
  assert.ok(page.includes('href="'+item.officialUrl+'"'),item.slug);
  assert.ok(page.includes('data-advisory="'+item.advisory.url+'"'),item.slug);
 }
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-beaches\/canada\//);
 assert.match(page,/not a swimming advisory/i);
 assert.match(page,/Data Server End-use Licence of Environment and Climate Change Canada/);
 assert.match(page,/Ontario Parks beach results/);
 assert.match(page,/noscript/);
 assert.match(page,/data-lake-filter="Michigan"/);
 assert.match(fs.readFileSync(path.join(root,'public/sitemap-beaches.xml'),'utf8'),/great-lakes-beaches\/canada\//);
 assert.match(fs.readFileSync(path.join(root,'public/great-lakes-beaches/around-the-lakes/index.html'),'utf8'),/18 Canadian beaches/);
});
test('Canada browser code uses text-only source data, cancels outdated requests, and retains map fallback',()=>{
 const js=fs.readFileSync(path.join(root,'public/assets/shorefeel-ca.js'),'utf8');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/textContent=v/);
 assert.match(js,/controller\.abort\(\)/);
 assert.match(js,/current!==d\.slug/);
 assert.match(js,/mapFailed/);
 assert.match(js,/Lake Michigan/);
});
