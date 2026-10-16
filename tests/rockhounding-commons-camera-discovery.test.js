'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const baseline=require('../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const {distanceMeters,originalCaptureDay,mediaWikiUrl,decodeProvider,reviewDiscovery}=
 require('../lib/rockhounding/commons-camera-discovery.cjs');
const {run}=require('../scripts/rockhounding/discover-commons-repeat-views.cjs');
function mockProvider(){
 const pages={};
 for(const p of baseline.results)pages[p.pageId]={
  pageid:p.pageId,ns:6,title:p.title,
  imageinfo:[{
   mime:'image/jpeg',timestamp:p.originalUploadUTC,
   descriptionurl:p.descriptionURL,
   extmetadata:{
    DateTimeOriginal:{value:p.sourceCaptureDateText},
    GPSLatitude:{value:String(p.lat)},GPSLongitude:{value:String(p.lon)},
    LicenseShortName:{value:p.license},LicenseUrl:{value:p.licenseURL}
   }
  }]
 };
 return {batchcomplete:'',query:{pages}};
}
test('source query is bounded to two-kilometer original camera vicinity and only Wikimedia files',()=>{
 const u=new URL(mediaWikiUrl());
 assert.equal(u.hostname,'commons.wikimedia.org');
 assert.equal(u.searchParams.get('generator'),'geosearch');
 assert.equal(u.searchParams.get('ggsradius'),'2000');
 assert.equal(u.searchParams.get('ggslimit'),'50');
 assert.equal(u.searchParams.get('ggsnamespace'),'6');
 assert.equal(u.searchParams.get('iiprop'),'timestamp|url|extmetadata|size|mime');
});
test('actual original API file metadata: 6 GPS files, two shore-named photos, not same 192m camera',()=>{
 const rows=decodeProvider(mockProvider());
 assert.equal(rows.length,6);
 const s=reviewDiscovery(rows);
 assert.equal(s.sourceNearbyFiles,6);
 assert.equal(s.independentlyTaggedShoreCandidates,2);
 assert.ok(Math.abs(s.historicalCameraDistanceMeters-192.08)<.02);
 assert.equal(s.camerasAreNotSameVantage,true);
 assert.equal(s.spatiallyAndTemporallyPotentialPairs.length,0);
 assert.equal(s.sameVantageReviewedPairs,0);
 assert.equal(s.actualSedimentChangePairs,0);
 assert.equal(s.canPredictNewAgates,false);
 assert.equal(s.canClaimSafeConditions,false);
 assert.equal(s.canPublishVisitWindow,false);
 assert.equal(s.historicWaveEventCount,11);
});
test('upload timestamp is not original photo capture time; English free text never turned into false UTC',()=>{
 assert.deepEqual(originalCaptureDay('2016-10-05 17:53'),{
  day:'2016-10-05',quality:'PUBLISHED_ORIGINAL_DATE_LOCAL_ZONE_UNVERIFIED'});
 assert.deepEqual(originalCaptureDay('Taken on 14 July 2015'),{
  day:null,quality:'UNSTRUCTURED_OR_UNVERIFIED_SOURCE_DATE'});
 const rows=decodeProvider(mockProvider());
 assert.equal(rows.find(p=>p.pageId===195534341).capture.day,'2026-07-05');
 assert.equal(rows.find(p=>p.pageId===195534341).originalUploadUTC,'2026-07-12T00:52:20Z');
 assert.equal(rows.find(p=>p.pageId===54799113).capture.day,'2016-10-05');
 assert.equal(rows.find(p=>p.pageId===54799113).originalUploadUTC,'2017-01-06T00:05:08Z');
});
test('wrong location, duplicate, wrong image type and MediaWiki pagination fail closed',()=>{
 const x=mockProvider();
 x.continue={continue:'-||'};
 assert.throws(()=>decodeProvider(x),/pagination/);
 const wrong=mockProvider();
 wrong.query.pages['195534341'].imageinfo[0].extmetadata.GPSLatitude.value='44';
 assert.throws(()=>decodeProvider(wrong),/misplaced/);
 const wrongMime=mockProvider();
 wrongMime.query.pages['195534341'].imageinfo[0].mime='image/svg+xml';
 assert.throws(()=>decodeProvider(wrongMime),/Invalid/);
 const badHost=mockProvider();
 badHost.query.pages['195534341'].imageinfo[0].descriptionurl='https://bad.example/wiki/File:fake';
 assert.throws(()=>decodeProvider(badHost),/Untrusted/);
});
test('metadata drift is an explicit manual review event, never silently a new geotagged same-camera pair',()=>{
 const rows=decodeProvider(mockProvider());
 rows[0].originalUploadUTC='2026-07-11T00:00:00Z';
 assert.throws(()=>reviewDiscovery(rows),/drifted/);
 const r=decodeProvider(mockProvider());
 r[0].lat+=.001;
 assert.throws(()=>reviewDiscovery(r),/shifted/);
});
test('15m camera proximity is necessary, never sufficient evidence of comparable beach geomorphology',()=>{
 const p={lat:46.675190,lon:-85.98748};
 assert.ok(distanceMeters(p,{lat:46.675205,lon:-85.98750})<15);
 assert.ok(distanceMeters(p,{lat:46.675613,lon:-85.985039})>190);
 assert.throws(()=>distanceMeters(p,{lat:NaN,lon:-85.98}),/GPS/);
});
test('one actual Wikimedia fetch can produce deterministic research audit with no visitor dependencies',async()=>{
 const observed=await run({fetchFn:async(_url,_settings)=>({
  ok:true,status:200,text:async()=>JSON.stringify(mockProvider())
 })});
 assert.equal(observed.sourceNearbyFiles,6);
 assert.equal(observed.sameVantageReviewedPairs,0);
 assert.equal(observed.verifiedFreshAgates,0);
 assert.equal(observed.canPublishVisitWindow,false);
 await assert.rejects(()=>run({fetchFn:async()=>({ok:false,status:429})}),/HTTP 429/);
});
