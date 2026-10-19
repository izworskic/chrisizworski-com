'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const adapter=require('../api/winter-eagle-evidence.js');
const P=adapter._test;
const asOf=Date.UTC(2026,1,21,17);
const rows=[
' Great Lakes Average Ice Concentration',
' Year Day    Sup.   Mich.   Huron    Erie    Ont.  St.Clr  GL Total',
' 2026 045  17.00  22.00  44.00  60.00  15.00  31.00  35.00',
' 2026 051  33.20  28.50  55.00  81.22  20.20  40.00  40.00',
' 2026 400  12.20  12.20  12.20  12.20  12.20  12.20  12.20',
' bogus text'
].join('\n');
const inat={
 total_results:2,
 results:[
  {id:11,quality_grade:'research',captive:false,observed_on:'2026-02-18',taxon:{id:5305}},
  {id:12,quality_grade:'research',captive:false,observed_on:'2026-02-19',taxon:{id:1222,ancestor_ids:[5305]}},
  {id:13,quality_grade:'casual',captive:false,observed_on:'2026-02-19',taxon:{id:5305}},
  {id:14,quality_grade:'research',captive:true,observed_on:'2026-02-20',taxon:{id:5305}},
  {id:12,quality_grade:'research',captive:false,observed_on:'2026-02-19',taxon:{id:5305}}
 ]
};
function res(){return {headers:{},code:null,body:null,setHeader(k,v){this.headers[k]=v},status(v){this.code=v;return this},json(v){this.body=v;return this}}}
test('NOAA ice parser respects lake columns, fractional ice, valid days and five-to-ten-day change',()=>{
 const sup=P.parseIce(rows,'superior',asOf),erie=P.parseIce(rows,'erie',asOf);
 assert.equal(sup.percent,33.2);
 assert.equal(erie.percent,81.22);
 assert.equal(erie.deltaPctPoints,21.22);
 assert.equal(erie.date,'2026-02-20');
 assert.equal(erie.recency,'recent');
 assert.equal(P.parseIce(rows,'nonesuch',asOf),null);
 const old=P.parseIce(rows,'huron',Date.UTC(2026,9,18));
 assert.equal(old.recency,'historical');
 assert.ok(old.ageDays>200);
});
test('seasonal NOAA file selection matches NOAA late-November to spring product',()=>{
 assert.equal(P.winterSeason(Date.UTC(2026,9,18)).url.endsWith('g2025_2026_ice.dat'),true);
 assert.equal(P.winterSeason(Date.UTC(2026,11,2)).url.endsWith('g2026_2027_ice.dat'),true);
 assert.equal(P.winterSeason(Date.UTC(2027,1,14)).start,2026);
});
test('iNaturalist summary treats research-grade uploads as reports, not actual eagle counts',()=>{
 const s=P.summarizeObservations(inat,asOf);
 assert.equal(s.observationsSampled,2);
 assert.equal(s.latestObservedOn,'2026-02-19');
 assert.equal(s.hasObservations,true);
 assert.equal(Object.hasOwn(s,'lat'),false);
 assert.equal(Object.hasOwn(s,'latitude'),false);
 assert.equal(Object.hasOwn(s,'coordinates'),false);
 assert.ok(!JSON.stringify(s).includes('username'));
 assert.equal(P.summarizeObservations({results:[]},asOf),null);
});
test('every supported eagle viewing site is whitelisted with lat/lon',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../public/winter-eagle-watching/app.js'),'utf8');
 const names=[...app.matchAll(/\{id:"([^"]+)",name:"[^"]+",city:"[^"]+",state:"[^"]+",lat:([-\d.]+),lon:([-\d.]+)/g)];
 assert.equal(Object.keys(P.SITES).length,names.length);
 assert.equal(names.length,19);
 for(const m of names)assert.deepEqual(P.SITES[m[1]]&&[P.SITES[m[1]].lat,P.SITES[m[1]].lon],[Number(m[2]),Number(m[3])]);
});
test('public evidence endpoint contains only broad summaries, no reported nest or bird coordinates',async()=>{
 const oldFetch=global.fetch;
 const originalDateNow=Date.now;Date.now=()=>asOf;
 const urls=[];
 global.fetch=async url=>{urls.push(String(url));if(String(url).includes('inaturalist'))return {ok:true,text:async()=>JSON.stringify(inat)};
 return {ok:true,text:async()=>rows}};
 try{
  const r=res();await adapter({method:'GET',query:{site:'soo-rotary'}},r);
  assert.equal(r.code,200);
  assert.equal(r.body.observations.observationsSampled,2);
  assert.equal(r.body.observations.latestObservedOn,'2026-02-19');
  assert.equal(r.body.ice.percent,33.2);
  assert.equal(r.body.ice.lake,'superior');
  assert.equal(r.body.ice.status,'recent');
  assert.equal(r.headers['X-Robots-Tag'],'noindex, nofollow');
  assert.match(r.body.observations.scope,/40 km/);
  assert.ok(urls.some(x=>x.includes('taxon_id=5305')));
  assert.ok(urls.some(x=>x.includes('g2025_2026_ice.dat')));
  assert.equal(r.body.observations.results,undefined);
  assert.equal(r.body.observations.coordinates,undefined);
  assert.equal(r.body.ice.openWater,undefined);
 }finally{global.fetch=oldFetch;Date.now=originalDateNow}
});
test('inland locations cannot present lake-wide ice as measured river ice',async()=>{
 const old=global.fetch;
 global.fetch=async url=>({ok:true,text:async()=>String(url).includes('inaturalist')?JSON.stringify(inat):rows});
 try{const r=res();await adapter({method:'GET',query:{site:'croton'}},r);
 assert.equal(r.body.ice.status,'not_applicable');
 assert.equal(r.body.ice.percent,undefined);
 }finally{global.fetch=old}
});
test('upstream failure is unknown, not zero, for both evidence feeds',async()=>{
 const old=global.fetch;
 global.fetch=async()=>({ok:false,status:503,text:async()=>''});
 try{const r=res();await adapter({method:'GET',query:{site:'soo-rotary'}},r);
 assert.equal(r.body.observations.status,'unavailable');
 assert.equal(r.body.ice.status,'unavailable');
 assert.equal(r.body.observations.observationsSampled,undefined);
 }finally{global.fetch=old}
});
test('no arbitrary upstream locations or unsupported HTTP verbs',async()=>{
 const unknown=res();await adapter({method:'GET',query:{site:'https://example.com'}},unknown);
 assert.equal(unknown.code,400);
 const rejected=res();await adapter({method:'POST',query:{site:'soo-rotary'}},rejected);
 assert.equal(rejected.code,405);
});
test('frontend uses date-aware evidence and includes no individual observation pins',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../public/winter-eagle-watching/app.js'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'../public/winter-eagle-watching/index.html'),'utf8');
 assert.match(app,/async function loadEvidence\(s\)/);
 assert.match(app,/loadEvidence\(s\)/);
 assert.match(app,/token!==evidenceToken\|\|selected.id!==s.id/);
 assert.match(app,/\/api\/winter-eagle-evidence\?site=/);
 assert.match(page,/id="eagle-evidence"/);
 assert.match(page,/id="eagle-reports-number"/);
 assert.match(page,/id="eagle-ice-date"/);
 assert.match(page,/one submitted report/i);
});

test('stale NOAA measurements do not present a current ice headline and missing sightings remain unknown',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/winter-eagle-watching/app.js'),'utf8');
 assert.match(js,/No current ice data/);
 assert.match(js,/Last season only:/);
 assert.match(js,/Regional observation feed unavailable · eagle activity unknown/);
 assert.match(js,/No qualifying regional reports in this search window/);
});

test('when iNaturalist fails, dated GBIF human observations provide fallback, not imaginary birds',async()=>{
 const oldFetch=global.fetch,oldNow=Date.now;Date.now=()=>asOf;
 const queried=[];
 const gbif={count:4,results:[
  {key:10001,basisOfRecord:'HUMAN_OBSERVATION',species:'Haliaeetus leucocephalus',decimalLatitude:46.48,decimalLongitude:-84.31,eventDate:'2026-02-19T15:45:00'},
  {key:10002,basisOfRecord:'HUMAN_OBSERVATION',species:'Haliaeetus leucocephalus',decimalLatitude:45.3,decimalLongitude:-84.31,eventDate:'2026-02-20T12:00:00'},
  {key:10003,basisOfRecord:'PRESERVED_SPECIMEN',species:'Haliaeetus leucocephalus',decimalLatitude:46.48,decimalLongitude:-84.31,eventDate:'2026-02-20T12:00:00'},
  {key:10004,basisOfRecord:'HUMAN_OBSERVATION',species:'Falco peregrinus',decimalLatitude:46.48,decimalLongitude:-84.31,eventDate:'2026-02-20T12:00:00'}
 ]};
 global.fetch=async url=>{
  queried.push(String(url));
  if(String(url).includes('inaturalist'))return {ok:false,status:502,text:async()=>''};
  if(String(url).includes('gbif'))return {ok:true,text:async()=>JSON.stringify(gbif)};
  return {ok:true,text:async()=>rows};
 };
 try{
  const r=res();await adapter({method:'GET',query:{site:'soo-rotary'}},r);
  assert.equal(r.code,200);
  assert.equal(r.body.observations.status,'ok');
  assert.equal(r.body.observations.source,'GBIF');
  assert.equal(r.body.observations.observationsSampled,1);
  assert.equal(r.body.observations.latestObservedOn,'2026-02-19');
  assert.equal(r.body.observations.moreRecords,false);
  assert.match(r.body.observations.note,/indexed late/i);
  assert.equal(r.body.ice.percent,33.2);
  assert.ok(queried.some(u=>u.includes('api.gbif.org/v1/occurrence/search')));
  assert.ok(queried.some(u=>u.includes('eventDate=')));
  assert.ok(queried.some(u=>u.includes('decimalLatitude=')));
  assert.equal(r.body.observations.results,undefined);
  assert.equal(r.body.observations.coordinates,undefined);
  assert.equal(r.body.observations.records,undefined);
 }finally{global.fetch=oldFetch;Date.now=oldNow}
});
test('GBIF fallback does not treat invalid or unavailable observations as eagle sightings',async()=>{
 const oldFetch=global.fetch;
 global.fetch=async url=>{
  if(String(url).includes('inaturalist'))return {ok:false,status:429,text:async()=>''};
  if(String(url).includes('gbif'))return {ok:true,text:async()=>JSON.stringify({count:0,results:[]})};
  return {ok:true,text:async()=>rows};
 };
 try{
  const r=res();await adapter({method:'GET',query:{site:'croton'}},r);
  assert.equal(r.body.observations.status,'ok');
  assert.equal(r.body.observations.source,'GBIF');
  assert.equal(r.body.observations.observationsSampled,0);
  assert.equal(r.body.observations.latestObservedOn,null);
  assert.equal(r.body.ice.status,'not_applicable');
 }finally{global.fetch=oldFetch}
});
