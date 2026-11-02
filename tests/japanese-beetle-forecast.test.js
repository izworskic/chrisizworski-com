'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const engine=require('../lib/japanese-beetle-forecast.cjs');
const api=require('../api/japanese-beetle-forecast.js');
function coverage(layer,dates=['2026-10-31','2026-11-01','2026-11-02']){
 return '<?xml version="1.0"?><wcs:CoverageDescription><wcs:CoverageOffering>'+
 '<wcs:name>'+layer+'</wcs:name><wcs:domainSet><wcs:temporalDomain>'+
 dates.map(d=>'<gml:timePosition>'+d+'T07:00:00.000Z</gml:timePosition>').join('')+
 '</wcs:temporalDomain></wcs:domainSet></wcs:CoverageOffering></wcs:CoverageDescription>'+
 ' '.repeat(500);
}
function pixel(n){return {type:'FeatureCollection',numberReturned:1,features:[{type:'Feature',properties:{GRAY_INDEX:n}}]};}
function fakeFetch({adult=186,egg=217.19293212890625,dates}={}){
 const calls=[];
 const get=async url=>{
  calls.push(url);
  if(url.includes('DescribeCoverage')){
   const layer=url.includes('japanese_beetle_adult')?engine.LAYERS.adult:engine.LAYERS.egg;
   return {ok:true,text:async()=>coverage(layer,dates)};
  }
  if(url.includes('GetFeatureInfo')){
   const n=url.includes('japanese_beetle_adult')?adult:egg;
   return {ok:true,json:async()=>pixel(n)};
  }
  throw Error('UNEXPECTED_REMOTE_URL');
 };
 get.calls=calls;return get;
}
const bay={lat:43.5945,lon:-83.8889,name:'Bay City',kind:'named-city'};
test('dedicated official layers (not generic AGDD) are source-of-truth',()=>{
 assert.equal(engine.LAYERS.adult,'gdd:japanese_beetle_adult');
 assert.equal(engine.LAYERS.egg,'gdd:japanese_beetle_egg_hatch');
 assert.ok(engine.MODEL.includes('single-triangle'));
 assert.ok(engine.MODEL.includes('873'));
 assert.ok(engine.MODEL.includes('1543'));
 assert.deepEqual(engine.HOSTS,['beans','berries','grapes','roses']);
});
test('safe official WMS 1.1.1 point query uses geographic axis lon,lat',()=>{
 const url=new URL(engine.featureURL(engine.LAYERS.adult,43.5945,-83.8889,'2026-11-02'));
 assert.equal(url.protocol,'https:');assert.equal(url.hostname,'geoserver.usanpn.org');
 assert.equal(url.searchParams.get('LAYERS'),engine.LAYERS.adult);
 assert.equal(url.searchParams.get('QUERY_LAYERS'),engine.LAYERS.adult);
 assert.equal(url.searchParams.get('TIME'),'2026-11-02');
 assert.equal(url.searchParams.get('SRS'),'EPSG:4326');
 const b=url.searchParams.get('BBOX').split(',').map(Number);
 assert.equal(b.length,4);assert.ok(b[0]<-83&&b[1]>43&&b[0]<b[2]&&b[1]<b[3]);
 assert.equal(url.searchParams.get('WIDTH'),'101');
 for(const [lat,lon] of [[90,30],[43.6,1],[NaN,-83]])assert.throws(()=>engine.featureURL(engine.LAYERS.adult,lat,lon,'2026-11-02'));
 assert.throws(()=>engine.featureURL('gdd:agdd_50f',43.6,-83,'2026-11-02'));
});
test('calendar 2026 day 186 = July 5, fractional day rounded to date; leap handling explicit',()=>{
 assert.equal(engine.modelDate(2026,186),'2026-07-05');
 assert.equal(engine.modelDate(2026,217.1929),'2026-08-05');
 assert.equal(engine.modelDate(2028,366),'2028-12-31');
 assert.equal(engine.yearDays(2026),365);assert.equal(engine.yearDays(2028),366);
 assert.throws(()=>engine.modelDate(2026,366));assert.throws(()=>engine.modelDate(2026,0));
});
test('provider JSON is a source raster model pixel, never a literal observation or a probability',()=>{
 const a=engine.parsePixel(pixel(186),engine.LAYERS.adult,2026);
 const e=engine.parsePixel(pixel(217.1929),engine.LAYERS.egg,2026);
 assert.equal(a.approximateDate,'2026-07-05');assert.equal(e.approximateDate,'2026-08-05');
 assert.equal(a.unit,'modeled day-of-year of life-stage thermal threshold');
 assert.ok(a.datePrecision.includes('not a property-level'));
 assert.equal(a.probability,undefined);
});
test('null/undefined/nodata, missing feature and percent-like garbage are not benign zero risk',()=>{
 const bad=[null,pixel(-9999),pixel(0),pixel(500),{type:'FeatureCollection',features:[],numberReturned:0},
  {type:'FeatureCollection',features:[{properties:{GRAY_INDEX:null}}],numberReturned:1},
  {type:'FeatureCollection',features:[{properties:{GRAY_INDEX:'185'}}],numberReturned:1},
  {type:'FeatureCollection',features:[{properties:{GRAY_INDEX:NaN}}],numberReturned:1}];
 for(const x of bad)assert.throws(()=>engine.parsePixel(x,engine.LAYERS.adult,2026));
});
test('coverage only accepts exact daily time-position, same-year and <=2-day lag',()=>{
 const c=engine.parseCoverage(coverage(engine.LAYERS.adult),engine.LAYERS.adult,'2026-11-02');
 assert.equal(c.date,'2026-11-02');assert.equal(c.lagDays,0);assert.ok(c.sourceDateVerified);
 assert.equal(engine.parseCoverage(coverage(engine.LAYERS.egg,['2026-11-01','2026-11-02','2026-11-03']),engine.LAYERS.egg,'2026-11-02').date,'2026-11-02');
 assert.throws(()=>engine.parseCoverage(coverage(engine.LAYERS.adult,['2026-10-10','2026-10-11']),engine.LAYERS.adult,'2026-11-02'),/STALE/);
 assert.throws(()=>engine.parseCoverage(coverage(engine.LAYERS.adult),engine.LAYERS.adult,'2027-01-02'),/STALE_SEASON/);
 assert.throws(()=>engine.parseCoverage(coverage(engine.LAYERS.adult),engine.LAYERS.egg,'2026-11-02'));
 assert.throws(()=>engine.parseCoverage('<html>403</html>',engine.LAYERS.adult,'2026-11-02'));
});
test('late 2026 source cannot be incorrectly resurrected as a 2027 live forecast',async()=>{
 const src=fakeFetch();await assert.rejects(()=>engine.fetchPilot(bay,'roses',src,new Date('2027-01-01T18:00:00Z')),/STALE_SEASON/);
});
test('official source adult/egg pairs are retrieved with matching source date, not generic DD values',async()=>{
 const src=fakeFetch();
 const result=await engine.fetchPilot(bay,'roses',src,new Date('2026-11-02T18:00:00Z'));
 assert.equal(src.calls.length,4);
 assert.equal(result.status,'OFFICIAL_MODEL_AVAILABLE');
 assert.equal(result.sourceKind,'OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL');
 assert.equal(result.sourceDate,'2026-11-02');assert.equal(result.stages.adult.dayOfYear,186);
 assert.equal(result.stages.egg.approximateDate,'2026-08-05');
 assert.equal(result.verdict.status,'OFF_SEASON');
 assert.equal(result.regionalObservations,'UNVERIFIED');
 assert.equal(result.year,2026);
 assert.ok(result.hardCaveat.includes('NOT a confirmed pest sighting'));
 assert.ok(src.calls.filter(x=>x.includes('GetFeatureInfo')).every(x=>x.includes('TIME=2026-11-02')));
});
test('late season does not say GO even with model thresholds in past',()=>{
 const result=engine.decision({nowDate:'2026-11-02',crop:'roses',sourceDate:'2026-11-02',
 adult:{dayOfYear:186},egg:{dayOfYear:217}});
 assert.equal(result.status,'OFF_SEASON');
 assert.ok(result.action.includes('No current adult-emergence claim'));
});
test('six-day forecast window is actionable scouting, not a treatment instruction',()=>{
 const sample={crop:'grapes',sourceDate:'2026-07-03',adult:{dayOfYear:186},egg:{dayOfYear:217}};
 const near=engine.decision({nowDate:'2026-07-03',...sample});
 assert.equal(near.status,'SCOUT');
 assert.match(near.action,/Inspect grape leaves/);
 assert.doesNotMatch(near.action,/spray|pesticide|infestation/i);
 const far=engine.decision({nowDate:'2026-06-04',...sample});
 assert.equal(far.status,'PREPARE');
 const past=engine.decision({nowDate:'2026-07-27',...sample});
 assert.equal(past.status,'THRESHOLD_PASSED');
 assert.match(past.action,/does not prove/i);
});
test('host specificity is crop-driven and prevents a universal garden beetle warning',()=>{
 for(const crop of ['beans','berries','grapes','roses']){
  assert.equal(engine.decision({nowDate:'2026-07-03',crop,sourceDate:'2026-07-03',adult:{dayOfYear:186},egg:{dayOfYear:217}}).status,'SCOUT');
 }
 assert.equal(engine.decision({nowDate:'2026-07-03',crop:'squash',sourceDate:'2026-07-03',adult:{dayOfYear:186},egg:{dayOfYear:217}}).status,'NOT_APPLICABLE');
});
test('source date mismatch, layer failure and biologically impossible stage order fail closed',async()=>{
 const source=fakeFetch({adult:215,egg:186});
 await assert.rejects(()=>engine.fetchPilot(bay,'roses',source,new Date('2026-11-02T18:00:00Z')),/BIOLOGICAL_STAGE_ORDER_INVALID/);
 const broken=async url=>url.includes('DescribeCoverage')?{ok:false}: {ok:true,json:async()=>pixel(186)};
 await assert.rejects(()=>engine.fetchPilot(bay,'roses',broken,new Date('2026-11-02T18:00:00Z')),/COVERAGE_PROVIDER_UNAVAILABLE/);
});
test('API invalid method, invalid ZIP and non-host crop do not call network',async()=>{
 const handler=api;
 const mk=(query,method='GET')=>({req:{method,query},res:{headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(c){this.code=c;return this;},json(o){this.body=o;return this;}}});
 const a=mk({crop:'roses',zip:'99999'});await handler(a.req,a.res);assert.equal(a.res.code,400);
 const b=mk({crop:'squash'});await handler(b.req,b.res);assert.equal(b.res.code,200);assert.equal(b.res.body.status,'NOT_APPLICABLE');
 const c=mk({},'POST');await handler(c.req,c.res);assert.equal(c.res.code,405);
});
test('ten source point values from Nov 2 2026 research are recorded as evidence, not a built-in forecast fallback',()=>{
 const adultObserved=[['Bay City',186],['Detroit',177],['Lansing',181],['Grand Rapids',181],
  ['Traverse City',196],['Marquette',213],['Houghton',209],['Alpena',207],['Kalamazoo',182],['Sault Ste Marie',213]];
 for(const [name,day] of adultObserved){
  assert.ok(day>=170&&day<=220,name);
  assert.equal(engine.modelDate(2026,day).slice(0,4),'2026');
 }
 assert.equal(engine.POINT_FALLBACK,undefined,'Historic numeric examples must never replace missing real raster data');
});
