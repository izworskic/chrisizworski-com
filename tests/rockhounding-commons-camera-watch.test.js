'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const source=require('../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const {decodeProvider,discoverSourceChanges}=require('../lib/rockhounding/commons-camera-discovery.cjs');
const {watch}=require('../scripts/rockhounding/watch-commons-camera-sources.cjs');
function provider({plus=false,modified=false}={}){
 const pages={};
 for(const x of source.results)pages[x.pageId]={
  pageid:x.pageId,ns:6,title:x.title,imageinfo:[{
   timestamp:x.originalUploadUTC,mime:'image/jpeg',descriptionurl:x.descriptionURL,
   extmetadata:{GPSLatitude:{value:String(x.lat)},GPSLongitude:{value:String(x.lon)},
    DateTimeOriginal:{value:x.sourceCaptureDateText},
    LicenseShortName:{value:x.license},LicenseUrl:{value:x.licenseURL}}
  }]
 };
 if(modified)pages[195534341].imageinfo[0].extmetadata.DateTimeOriginal.value='2026-07-06 12:57:56';
 if(plus)pages[400000000]={
  pageid:400000000,ns:6,title:'File:Agate Beach later possible research scene.jpg',
  imageinfo:[{timestamp:'2026-10-16T12:00:00Z',mime:'image/jpeg',
   descriptionurl:'https://commons.wikimedia.org/wiki/File:Agate_Beach_later_possible_research_scene.jpg',
   extmetadata:{
    GPSLatitude:{value:'46.67520'},GPSLongitude:{value:'-85.98746'},
    DateTimeOriginal:{value:'2026-10-13 13:00'},LicenseShortName:{value:'CC BY 4.0'},
    LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0'}}}]
 };
 return {batchcomplete:'',query:{pages}};
}
test('actual six source photos repeated => zero changes, no agate opportunity',()=>{
 const r=discoverSourceChanges(decodeProvider(provider()));
 assert.equal(r.sourceState,'NO_NEW_SOURCE_PHOTOS');
 assert.equal(r.nowNearbyGeoTaggedFiles,6);
 assert.equal(r.unreviewedNewSourceCount,0);
 assert.equal(r.originalMediaMetadataChangedCount,0);
 assert.equal(r.verifiedSameVantagePairs,0);
 assert.equal(r.canPredictNewAgates,false);
});
test('a geotagged near-camera post storm image is UNREVIEWED, not suddenly a verified pair',()=>{
 const r=discoverSourceChanges(decodeProvider(provider({plus:true})));
 assert.equal(r.nowNearbyGeoTaggedFiles,7);
 assert.equal(r.unreviewedNewSourceCount,1);
 assert.equal(r.sourceState,'NEEDS_MANUAL_ORIGINAL_PHOTO_REVIEW');
 assert.equal(r.unreviewedAdditions[0].candidateOnly,true);
 assert.equal(r.unreviewedAdditions[0].verifiedAgateBeachView,false);
 assert.equal(r.unreviewedAdditions[0].canClaimBeachRockChange,false);
 assert.equal(r.potentialPairAutomaticallyValidated,false);
 assert.equal(r.verifiedSameVantagePairs,0);
 assert.equal(r.canPublishVisitWindow,false);
});
test('metadata date changes are flagged, not quietly counted as new exposed stones',()=>{
 const r=discoverSourceChanges(decodeProvider(provider({modified:true})));
 assert.equal(r.originalMediaMetadataChangedCount,1);
 assert.equal(r.changedExistingFiles[0].pageId,195534341);
 assert.equal(r.sourceState,'NEEDS_MANUAL_ORIGINAL_PHOTO_REVIEW');
 assert.equal(r.verifiedFreshAgates,0);
});
test('one full original-provider metadata query is sufficient; outages cannot fabricate new photos',async()=>{
 let calls=0;
 const r=await watch({nowISO:'2026-10-16T14:00:00Z',
  fetchFn:async()=>{calls++;return {ok:true,text:async()=>JSON.stringify(provider())};}});
 assert.equal(calls,1);
 assert.equal(r.checkedAtUTC,'2026-10-16T14:00:00Z');
 assert.equal(r.unreviewedNewSourceCount,0);
 assert.equal(r.stormPhotoResearch.sourceQualifiedOffshoreEvents,8);
 assert.equal(r.stormPhotoResearch.priorNamedSitePotentialPhotoDateLinks,1);
 assert.equal(r.stormPhotoResearch.newGeoPhotosNeedingHumanSceneReview,0);
 assert.equal(r.stormPhotoResearch.stormEventsWithNewNearbyDatedMedia.length,0);
 assert.equal(r.stormPhotoResearch.namedBeachCollisionFromToivolaExcluded,true);
 assert.equal(r.stormPhotoResearch.canPublishVisitWindow,false);
 await assert.rejects(()=>watch({fetchFn:async()=>({ok:false,status:429})}),/429/);
});

test('one existing weekly source request also annotates UNREVIEWED during-storm dated geotags without converting them to after-storm changes',async()=>{
 let calls=0;
 const q=await watch({nowISO:'2026-10-16T16:00:00Z',fetchFn:async()=>{
  calls++;
  return {ok:true,status:200,text:async()=>JSON.stringify(provider({plus:true}))};
 }});
 assert.equal(calls,1);
 assert.equal(q.unreviewedNewSourceCount,1);
 assert.equal(q.stormPhotoResearch.newGeoPhotosNeedingHumanSceneReview,1);
 assert.equal(q.stormPhotoResearch.stormEventsWithNewNearbyDatedMedia.length,1);
 const photo=q.stormPhotoResearch.stormEventsWithNewNearbyDatedMedia[0].media[0];
 assert.equal(photo.timeRole,'CAPTURE_INTERVAL_OVERLAPS_ACTIVE_OFFSHORE_EPISODE_NOT_POST');
 assert.equal(photo.agateSceneConfirmed,false);
 assert.equal(photo.confirmsSedimentChange,false);
 assert.equal(q.stormPhotoResearch.calibratedAgateExposure,false);
 assert.equal(q.stormPhotoResearch.retrospectivelyMeasuredSedimentChanges,0);
});
