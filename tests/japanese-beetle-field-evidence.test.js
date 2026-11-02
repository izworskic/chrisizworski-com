'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../lib/japanese-beetle-field-evidence.cjs');
const A=require('../api/japanese-beetle-field-evidence.js');
const V=require('../scripts/audit-japanese-beetle-field-validation.cjs');
const LAT=43.5945,LON=-83.8889,ASOF='2026-11-02';
function row({id=11,date='2026-07-05',lat=LAT,lon=LON,grade='research',geo=null,accuracy=80,photos=[{id:2}],taxon=67760,observer=18}={}){
 return {id,observed_on:date,geojson:{type:'Point',coordinates:[lon,lat]},quality_grade:grade,geoprivacy:geo,positional_accuracy:accuracy,
  taxon:{id:taxon,name:'Popillia japonica'},user:{id:observer},photos,uri:'https://www.inaturalist.org/observations/'+id};
}
function body(rows,total=rows.length){return {total_results:total,results:rows,page:1,per_page:E.MAX_ROWS}}
test('query is geographically bounded, historical-year bound, species-specific and has narrow fields',()=>{
 const u=new URL(E.sourceURL(LAT,LON,2026,ASOF));
 assert.equal(u.hostname,'api.inaturalist.org');assert.equal(u.pathname,'/v2/observations');
 for(const [k,v] of Object.entries({taxon_id:'67760',place_id:'29',radius:'25',quality_grade:'research',photos:'true',
  captive:'false',d1:'2026-01-01',d2:ASOF,per_page:'100',order_by:'observed_on',order:'asc'}))assert.equal(u.searchParams.get(k),v);
 assert.match(u.searchParams.get('fields'),/positional_accuracy/);
 assert.equal(new URL(E.sourceURL(LAT,LON,2025,ASOF)).searchParams.get('d2'),'2025-12-31');
 assert.throws(()=>E.sourceURL(LAT,LON,2027,ASOF));assert.throws(()=>E.sourceURL(0,0,2026,ASOF));
});
test('validates date, location accuracy, species, photo, quality and public URI',()=>{
 const ok=row(),bad=[
  row({id:12,grade:'casual'}),row({id:13,geo:'obscured'}),row({id:14,accuracy:null}),row({id:15,accuracy:99999}),
  row({id:16,photos:[]}),row({id:17,taxon:99999}),row({id:18,date:'2027-06-02'}),
  row({id:19,lon:-87.3954,lat:46.5436}),{...row({id:20}),uri:'https://evil.example/observations/20'}
 ];
 const p=E.parseObservations(body([ok,...bad]),{lat:LAT,lon:LON,year:2026,asOf:ASOF});
 assert.equal(p.status,'DOCUMENTED_PRESENCE');assert.equal(p.qualifyingRecords,1);
 assert.equal(p.firstObservationDate,'2026-07-05');
 assert.equal(p.examples[0].url,'https://www.inaturalist.org/observations/11');
 assert.ok(!JSON.stringify(p).includes('geojson'));
 assert.ok(!JSON.stringify(p).includes('user'));
});
test('earliest eligible date sorting and unique observer count are deterministic',()=>{
 const p=E.parseObservations(body([row({id:30,date:'2026-07-30',observer:1}),row({id:29,date:'2026-07-01',observer:2}),row({id:29,date:'2026-07-01',observer:2})]),{lat:LAT,lon:LON,year:2026,asOf:ASOF});
 assert.equal(p.firstObservationDate,'2026-07-01');assert.equal(p.qualifyingRecords,2);
 assert.equal(p.uniqueObserverCount,2);
});
test('absence of a qualifying public sighting cannot mean absence of beetles',()=>{
 const p=E.parseObservations(body([row({geo:'private'})],11),{lat:LAT,lon:LON,year:2026,asOf:ASOF});
 assert.equal(p.status,'NO_QUALIFYING_RECORDS_IN_SAMPLE');assert.equal(p.firstObservationDate,null);
 assert.equal(p.limitedSearch,true);assert.match(p.interpretation,/NOT a claim/i);
});
test('malformed or partial provider data is rejected',()=>{
 const opts={lat:LAT,lon:LON,year:2026,asOf:ASOF};
 for(const d of [null,{results:[]},body([],0),{...body([]),page:2},{...body([]),per_page:0}]){
  if(d?.page===1&&d.per_page===100&&d.total_results===0){assert.equal(E.parseObservations(d,opts).status,'NO_QUALIFYING_RECORDS_IN_SAMPLE');continue;}
  assert.throws(()=>E.parseObservations(d,opts));
 }
});
test('signed calendar offset is contextual, never a scored accuracy claim',()=>{
 assert.deepEqual(E.comparison('2026-07-02','2026-07-05').status,'SIGHTING_BEFORE_MODEL');
 assert.equal(E.comparison('2026-07-08','2026-07-05').dayOffset,3);
 assert.equal(E.comparison('2026-07-05','2026-07-05').status,'SAME_CALENDAR_DAY');
 assert.equal(E.comparison('2025-07-05','2026-07-05').status,'NOT_COMPARABLE');
});
test('fetch evidence retains data lineage and refuses failed iNaturalist source',async()=>{
 const site={name:'Bay City',lat:LAT,lon:LON};
 const fetcher=async()=>({ok:true,json:async()=>body([row()],12)});
 const d=await E.fetchEvidence(site,2026,{fetcher,now:new Date('2026-11-02T18:00:00Z')});
 assert.equal(d.schema,E.SCHEMA);assert.equal(d.status,'DOCUMENTED_PRESENCE');
 assert.equal(d.observationalEvidence.firstObservationDate,'2026-07-05');
 assert.equal(d.modelComparison,'UNAVAILABLE_UNLESS_MATCHED_TO_SAME_YEAR_OFFICIAL_LAYER');
 assert.equal(d.observationalEvidence.limitedSearch,true);
 await assert.rejects(E.fetchEvidence(site,2026,{fetcher:async()=>({ok:false}),now:new Date('2026-11-02T18:00:00Z')}));
});
function fakeRes(){return {code:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(data){this.body=data;return this}}}
test('API validates method, Michigan reference and future dates',async()=>{
 for(const [req,status] of [[{method:'POST',query:{}},405],[{method:'GET',query:{year:'2027'}},400],
  [{method:'GET',query:{zip:'00000'}},400],[{method:'GET',query:{site:'invalid-site'}},400]]){
  const res=fakeRes();await A(req,res);assert.equal(res.code,status);
 }
});
test('API provider outage yields 503 unknown instead of no sightings',async()=>{
 const saved=E.fetchEvidence;E.fetchEvidence=async()=>{throw Error('network')};
 try{const res=fakeRes();await A({method:'GET',query:{site:'bay-city',year:'2026'}},res);
  assert.equal(res.code,503);assert.equal(res.body.status,'UNAVAILABLE');assert.match(res.body.note,/cannot be shown as zero sightings/)}
 finally{E.fetchEvidence=saved}
});
test('20-site-year archive pilot is explicitly exploratory, never model accuracy',async()=>{
 const now=new Date('2026-11-02T18:00:00Z');
 const fake=async url=>{
  if(url.includes('DescribeCoverage'))return {ok:true,text:async()=>'<wcs:CoverageDescription><gml:timePosition>2025-10-15T07:00:00.000Z</gml:timePosition><gml:timePosition>2026-10-15T07:00:00.000Z</gml:timePosition></wcs:CoverageDescription>'};
  if(url.includes('GetFeatureInfo'))return {ok:true,json:async()=>({type:'FeatureCollection',numberReturned:1,features:[{properties:{GRAY_INDEX:186}}]})};
  if(url.includes('api.inaturalist.org')){const u=new URL(url),year=Number(u.searchParams.get('d1').slice(0,4));
   const lat=Number(u.searchParams.get('lat')),lon=Number(u.searchParams.get('lng'));
   return {ok:true,json:async()=>body([row({date:year+'-07-05',lat,lon})])};}
  throw Error('UNEXPECTED_URL');
 };
 const d=await V.evaluate({fetcher:fake,now,sleep:async()=>{}});
 assert.equal(d.count,20);assert.equal(d.summary.pairedOpportunisticRecords,20);
 assert.equal(d.benchmark.empiricalForecastAccuracyEstablished,false);
 assert.equal(d.benchmark.seasonsWithVerifiedArchivedSource,2);
 assert.equal(d.status,'EXPLORATORY_NOT_MODEL_ACCURACY');
});
test('archive pilot refuses unlisted model dates instead of silently substituting a pixel',async()=>{
 const fake=async()=>({ok:true,text:async()=>'<wcs:CoverageDescription/>'});
 await assert.rejects(V.evaluate({fetcher:fake,sleep:async()=>{}}),/MODEL_ARCHIVE_DATE_NOT_VERIFIED/);
});
