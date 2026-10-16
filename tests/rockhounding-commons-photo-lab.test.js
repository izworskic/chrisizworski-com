'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const baseline=require('../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const audit=require('../public/rockhounding-lab/commons-geotagged-repeat-views-2026.json');
const {originalCaptureDay,reviewDiscovery}=require('../lib/rockhounding/commons-camera-discovery.cjs');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('frozen six actual source rows roundtrip through geosearch fixed-camera model',()=>{
 const data=baseline.results.map(x=>({
  pageId:x.pageId,title:x.title,originalUploadUTC:x.originalUploadUTC,
  sourceCaptureDateText:x.sourceCaptureDateText,
  capture:originalCaptureDay(x.sourceCaptureDateText),
  lat:x.lat,lon:x.lon,license:x.license,
  descriptionURL:x.descriptionURL,licenseURL:x.licenseURL
 }));
 const computed=reviewDiscovery(data);
 for(const [key,val] of Object.entries(computed))
  assert.deepEqual(audit[key],val,'Original geotagged audit mismatch: '+key);
 assert.equal(audit.sourceNearbyFiles,6);
 assert.equal(audit.independentlyTaggedShoreCandidates,2);
 assert.equal(audit.historicalCameraDistanceMeters,192.08);
 assert.equal(audit.camerasAreNotSameVantage,true);
 assert.equal(audit.sameVantageReviewedPairs,0);
 assert.equal(audit.verifiedStormToSedimentChanges,0);
 assert.equal(audit.verifiedFreshAgates,0);
 assert.equal(audit.canPublishVisitWindow,false);
});
test('only genuine Agate-site geotagged camera photos, no imagined fixed view or current beach forecast',()=>{
 assert.match(html,/id="agate-camera-repeat-discovery"/);
 assert.match(html,/id="agateCameraNearby"/);
 assert.match(html,/id="agateCameraDistance"/);
 assert.match(html,/id="agateCameraPairs"/);
 assert.match(html,/id="agateCameraAuditCaption"/);
 assert.match(html,/commons-geotagged-repeat-views-2026\.json/);
 assert.match(html,/October 5, 2016/);
 assert.match(html,/July 5, 2026/);
 assert.match(html,/192 m apart/);
 assert.match(html,/No before\/after source images from the same frame/);
 assert.match(html,/Dated source ≠ documented exposed rocks/);
 assert.match(html,/not the same surveyed viewpoint/i);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('original Commons 2026 photo uses authenticated thumbnail origin and creator/license attribution',()=>{
 assert.match(html,/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\/b\/b9\/Grand_Marais_Agate_Beach\.jpg/);
 assert.match(html,/TCP04 \/ Wikimedia Commons/);
 assert.match(html,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(html,/https:\/\/commons\.wikimedia\.org\/wiki\/File:Lake_Superior_Coast_-_Grand_Marais/);
 assert.equal(audit.allResults.find(x=>x.pageId===54799113).rights,'CC BY-SA 2.0');
 assert.equal(audit.allResults.find(x=>x.pageId===195534341).rights,'CC BY 4.0');
});
