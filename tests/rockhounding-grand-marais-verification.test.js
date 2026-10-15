'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assessAll,assessSite,snapshot}=require('../lib/rockhounding/grand-marais-verification.cjs');

test('source audit keeps both municipal beaches public but not collection-cleared',()=>{
 const status=assessAll();
 assert.deepEqual(status.map(x=>x.siteId).sort(),['grand-marais-agate','grand-marais-harbor']);
 assert.equal(status.filter(x=>x.publicBeachDocumented).length,2);
 assert.equal(status.filter(x=>x.canPublishCollectingRecommendation).length,0);
 assert.equal(status.filter(x=>x.canPublishWaveBasedRecommendation).length,0);
 assert.ok(status.every(x=>x.unresolved.includes('COLLECTION_RULE_UNCONFIRMED')));
});
test('statewide 25 pound rule and absence of a listed township ordinance cannot equal permission',()=>{
 assert.ok(snapshot.governance.generalWeightRule.includes('25 pounds'));
 assert.ok(snapshot.sites.every(x=>x.rockCollectionRule==='AWAIT_OPERATOR_CONFIRMATION'));
 assert.ok(snapshot.sources.find(x=>x.id==='TOWNSHIP_ORDINANCE_INDEX').doesNotEstablish.includes('Permission to collect on municipal park property'));
});
test('September township draft minutes do not establish an ADA ramp or beach-specific completion',()=>{
 const minutes=snapshot.sources.find(x=>x.id==='TOWNSHIP_MINUTES_SEPT2026');
 assert.equal(minutes.documentStatus,'DRAFT');
 assert.ok(minutes.doesNotEstablish.some(x=>x.includes('Installation location')));
 assert.ok(snapshot.sites.every(x=>x.wheelchairAccessToSand==='UNKNOWN'));
 assert.ok(assessAll().every(x=>!x.wheelchairToSandVerified));
});
test('published park GPS and mapped footways cannot become legal turn-by-turn directions',()=>{
 assert.ok(snapshot.sites.every(x=>x.ownerVerifiedParkingGate===null));
 assert.ok(snapshot.sites.every(x=>x.legalParkingToShoreLine===null));
 assert.equal(assessAll().filter(x=>x.exactLegalParkingAndEntryVerified).length,0);
});
test('synthetic partial municipal approval does not lift parking/path/wave gates',()=>{
 const candidate=structuredClone(snapshot.sites[0]);
 candidate.rockCollectionRule={status:'PERMITTED',sourceUrl:snapshot.sources.find(s=>s.id==='TOWNSHIP_AGATE').url,areaDescription:'Loose agates only within the municipal beach footprint'};
 const result=assessSite(candidate);
 assert.equal(result.collectingPermissionVerified,true);
 assert.equal(result.canPublishCollectingRecommendation,false);
 assert.equal(result.canPublishWaveBasedRecommendation,false);
});
test('wave readiness is independently gated by validated wet cell and shoreline normal',()=>{
 const site=structuredClone(snapshot.sites[0]);
 site.shorelineNormalDeg=0;site.modelWetCell={validated:true};
 assert.equal(assessSite(site).researchWaveSamplingReady,false); // unsupported raw angle is NOT validated shoreline geometry
 site.shorelineModelGeometry={status:'VALIDATED_SHORE_NORMAL',outwardBearingDeg:0,sourceUrl:'https://example.org/survey'};
 assert.equal(assessSite(site).researchWaveSamplingReady,true);
 assert.equal(assessSite(site).canPublishWaveBasedRecommendation,false); // route and collecting rules still unknown
});
test('authority source must come from municipality, not tourism or mapping sites',()=>{
 const site=structuredClone(snapshot.sites[0]);
 site.ownerVerifiedParkingGate={lat:46.675,lon:-85.985,verifiedByOperator:true,sourceUrl:'https://www.openstreetmap.org/way/369178056'};
 assert.equal(assessSite(site).exactLegalParkingAndEntryVerified,false);
 site.ownerVerifiedParkingGate.sourceUrl='https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/';
 assert.equal(assessSite(site).exactLegalParkingAndEntryVerified,true);
});
