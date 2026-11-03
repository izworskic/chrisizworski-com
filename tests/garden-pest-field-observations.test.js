'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../lib/garden-pest-field-observations.cjs');
const API=require('../api/garden-pest-field-observations.js');
const site={name:'Bay City',lat:43.5945,lon:-83.8889},asOf='2026-11-03';
function row({id=101,date='2026-07-06',lat=site.lat,lon=site.lon,grade='research',taxon=1410301,
  name='Eichlinia cucurbitae',privacy=null,accuracy=90,photos=[{id:2}],uri}={}){
 return {id,observed_on:date,geojson:{type:'Point',coordinates:[lon,lat]},quality_grade:grade,
   taxon:{id:taxon,name},geoprivacy:privacy,positional_accuracy:accuracy,photos,
   uri:uri||'https://www.inaturalist.org/observations/'+id};
}
function body(rows,total=rows.length){return {results:rows,total_results:total,page:1,per_page:F.MAX_ROWS};}
function res(){return {code:200,headers:{},body:null,setHeader(n,v){this.headers[n]=v;return this},status(n){this.code=n;return this},json(o){this.body=o;return this}};}
test('verified squash borer taxonomy and bounded V2 query contract',()=>{
 const u=new URL(F.buildQuery(site,2026,asOf));
 assert.equal(u.origin,'https://api.inaturalist.org');
 assert.equal(u.pathname,'/v2/observations');
 for(const [k,v] of Object.entries({taxon_id:'1410301',place_id:'29',radius:'25',quality_grade:'research',
  captive:'false',photos:'true',d1:'2026-01-01',d2:asOf,order:'asc',per_page:'100'}))assert.equal(u.searchParams.get(k),v);
 assert.equal(new URL(F.buildQuery(site,2025,asOf)).searchParams.get('d2'),'2025-12-31');
 for(const [place,y,d,species] of [[site,2027,asOf,'squash-vine-borer'],[null,2026,asOf,'squash-vine-borer'],
  [site,2026,asOf,'unknown']])assert.throws(()=>F.buildQuery(place,y,d,species));
});
test('strict species, public coordinates, range, date and photo qualification',()=>{
 const rows=[row(),row({id:102,taxon:67760}),row({id:103,name:'Popillia japonica'}),row({id:104,privacy:'obscured'}),
   row({id:105,accuracy:null}),row({id:106,accuracy:8000}),row({id:107,grade:'casual'}),
   row({id:108,photos:[]}),row({id:109,date:'2027-07-03'}),row({id:110,lat:46.4,lon:-87.4}),
   row({id:111,uri:'https://bad.example/observations/111'})];
 const d=F.parse(body(rows),{site,year:2026,asOf});
 assert.equal(d.status,'DOCUMENTED_SPECIES_PHOTO');assert.equal(d.qualifyingRecords,1);
 assert.equal(d.firstSampledDate,'2026-07-06');assert.equal(d.examples[0].url,'https://www.inaturalist.org/observations/101');
 assert.doesNotMatch(JSON.stringify(d),/geojson|positional_accuracy|user|longitude|latitude/);
});
test('zero eligible records does not turn into a negative survey',()=>{
 const d=F.parse(body([row({privacy:'private'})],30),{site,year:2026,asOf});
 assert.equal(d.status,'NO_QUALIFYING_RECORDS_IN_SAMPLE');
 assert.equal(d.firstSampledDate,null);assert.equal(d.limitedSearch,true);
 assert.match(d.explanation,/does not mean the insect is absent/i);
});
test('source incomplete, suspicious and mismatched JSON fails closed',()=>{
 const q={site,year:2026,asOf};
 for(const b of [null,{},body([],5),{...body([]),page:2},{...body([]),per_page:0},
   {...body([]),total_results:-1},{...body([row()]),total_results:0}]) {
  if(b?.page===1&&b?.per_page===F.MAX_ROWS&&b.total_results===5&&Array.isArray(b.results)&&b.results.length===0){
   assert.equal(F.parse(b,q).status,'NO_QUALIFYING_RECORDS_IN_SAMPLE');continue;
  }
  assert.throws(()=>F.parse(b,q));
 }
});
test('source dates and canonical links are preserved, adult life stage never presumed',async()=>{
 const fetcher=async(url,opts)=>{
  assert.equal(new URL(url).searchParams.get('taxon_id'),'1410301');
  assert.equal(opts.redirect,'error');
  return {ok:true,json:async()=>body([row({date:'2026-07-06'})])};
 };
 const d=await F.fetchRecords(site,2026,{fetcher,now:new Date('2026-11-03T16:00:00Z')});
 assert.equal(d.schema,F.SCHEMA);
 assert.equal(d.seasonContext,'PAST_OR_DORMANT_SEASON_RECORDS');
 assert.equal(d.lifeStage,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(d.status,'DOCUMENTED_SPECIES_PHOTO');
 assert.equal(d.records.firstSampledDate,'2026-07-06');
 assert.ok(!JSON.stringify(d).includes('43.5945'));
 await assert.rejects(F.fetchRecords(site,2026,{fetcher:async()=>({ok:false}),now:new Date('2026-11-03T16:00:00Z')}),/UNAVAILABLE/);
});
test('API rejects future season, unknown species and bad Michigan ZIP',async()=>{
 for(const [req,status] of [
   [{method:'POST',query:{}},405],[{method:'GET',query:{year:'2027'}},400],
   [{method:'GET',query:{species:'unknown'}},400],[{method:'GET',query:{zip:'90210'}},400],
   [{method:'GET',query:{site:'non-existent'}},400]
 ]){const x=res();await API(req,x);assert.equal(x.code,status);}
});
test('API returns 503 UNKNOWN on provider failure; no fake zero',async()=>{
 const original=F.fetchRecords;F.fetchRecords=async()=>{throw Error('timeout')};
 try{
  const x=res();await API({method:'GET',query:{species:'squash-vine-borer',year:'2026',site:'bay-city'}},x);
  assert.equal(x.code,503);assert.equal(x.body.status,'UNAVAILABLE');
  assert.match(x.body.note,/unavailable source is not zero sightings|source is not zero sightings/i);
  assert.match(x.headers['Cache-Control'],/s-maxage=120/);
 }finally{F.fetchRecords=original;}
});
