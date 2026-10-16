'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const baseline=require('../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const {decodeProvider}=require('../lib/rockhounding/commons-camera-discovery.cjs');
const {initialInbox,checkedPrevious,mergeInbox}=require('../lib/rockhounding/commons-photo-review-inbox.cjs');
const {archive}=require('../scripts/rockhounding/archive-commons-photo-review-inbox.cjs');
const T='2026-10-16T17:00:00Z';
function provider({add=false,changed=false,exclude=false,badSite=false,badDate=false}={}){
 const pages={};
 for(const p of baseline.results)pages[p.pageId]={
  pageid:p.pageId,ns:6,title:p.title,imageinfo:[{mime:'image/jpeg',
  timestamp:p.originalUploadUTC,descriptionurl:p.descriptionURL,
  extmetadata:{DateTimeOriginal:{value:p.sourceCaptureDateText},
   GPSLatitude:{value:String(p.lat)},GPSLongitude:{value:String(p.lon)},
   LicenseShortName:{value:p.license},LicenseUrl:{value:p.licenseURL||''}}}]
 };
 if(add&&!exclude)pages[400000000]={
  pageid:400000000,ns:6,title:changed?'File:Updated near Agate photo.jpg':'File:Possible near Agate research photo.jpg',
  imageinfo:[{mime:'image/jpeg',timestamp:'2026-10-16T12:00:00Z',
   descriptionurl:'https://commons.wikimedia.org/wiki/File:Possible_near_Agate_research_photo.jpg',
   extmetadata:{DateTimeOriginal:{value:badDate?'2030-10-13 13:00':'2026-10-13 13:00'},
    GPSLatitude:{value:badSite?'44.0':'46.67520'},
    GPSLongitude:{value:'-85.98747'},
    LicenseShortName:{value:'CC BY 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0'}}}]
 };
 return {batchcomplete:'',query:{pages}};
}
function decoded(options={}){return decodeProvider(provider(options))}
test('the dedicated branch initial inbox has zero claims and is valid for one request',()=>{
 const inbox=initialInbox();
 assert.equal(checkedPrevious(inbox),true);
 assert.equal(inbox.entries.length,0);
 assert.equal(inbox.canPredictNewAgates,false);
 assert.equal(inbox.verifiedFreshAgates,0);
 const r=mergeInbox(inbox,decoded(),{nowISO:T});
 assert.equal(r.diagnostics.sourceFilesReviewed,6);
 assert.equal(r.diagnostics.newCandidates,0);
 assert.equal(r.diagnostics.storedCandidates,0);
 assert.equal(r.inbox.lastSourceCheckUTC,T);
});
test('original geotag added near Agate is durable, with event linkage but no validated Agate view',()=>{
 const first=mergeInbox(initialInbox(),decoded({add:true}),{nowISO:T});
 assert.equal(first.diagnostics.newCandidates,1);
 assert.equal(first.diagnostics.additionalPageIds,1);
 const e=first.inbox.entries[0];
 assert.equal(e.pageId,400000000);
 assert.equal(e.originalCaptureDate,'2026-10-13');
 assert.equal(e.sourceGpsInsideResearchPolygon,true);
 assert.equal(e.status,'NEEDS_SCENE_AND_CAMERA_REVIEW');
 assert.equal(e.stormAssociations.length,1);
 assert.equal(e.stormAssociations[0].originalPhotoDateRole,
  'CAPTURE_INTERVAL_OVERLAPS_ACTIVE_OFFSHORE_EPISODE_NOT_POST');
 assert.equal(e.stormAssociations[0].verifiedAgateBeachScene,false);
 assert.equal(e.confirmedNewAgateExposure,false);
 assert.equal(e.viewAsAgateBeachVerified,false);
 assert.equal(first.inbox.canPublishVisitWindow,false);
 const again=mergeInbox(first.inbox,decoded({add:true}),{nowISO:T});
 assert.equal(again.diagnostics.newCandidates,0);
 assert.equal(again.diagnostics.changedCandidates,0);
 assert.deepEqual(again.inbox,first.inbox);
});
test('previous new source persists if it falls out of subsequent geographic source results',()=>{
 const first=mergeInbox(initialInbox(),decoded({add:true}),{nowISO:T});
 const later=mergeInbox(first.inbox,decoded(),{nowISO:'2026-10-23T12:00:00Z'});
 assert.equal(later.diagnostics.retainedPreviouslySeenNotReturned,1);
 assert.equal(later.inbox.entries[0].pageId,400000000);
 assert.equal(later.inbox.entries[0].firstSeenUTC,T);
 assert.equal(later.inbox.canClaimSafeShore,false);
});
test('same source changed later remains unreviewed, with source revision count',()=>{
 const first=mergeInbox(initialInbox(),decoded({add:true}),{nowISO:T});
 const later=mergeInbox(first.inbox,decoded({add:true,changed:true}),{
  nowISO:'2026-10-23T12:00:00Z'});
 assert.equal(later.diagnostics.changedCandidates,1);
 assert.equal(later.inbox.entries[0].priorMetadataRevisions,1);
 assert.equal(later.inbox.entries[0].status,'SOURCE_METADATA_CHANGED_NEEDS_REVIEW');
 assert.equal(later.inbox.entries[0].viewAsAgateBeachVerified,false);
 assert.equal(later.inbox.entries[0].matchedViewpointVerified,false);
 assert.equal(later.inbox.entries[0].confirmedNewAgateExposure,false);
});
test('false independent photo claims, duplicate media, future capture and wrong camera GPS reject',()=>{
 const prev=mergeInbox(initialInbox(),decoded({add:true}),{nowISO:T}).inbox;
 for(const mutate of [
  v=>{v.entries[0].viewAsAgateBeachVerified=true},
  v=>{v.entries[0].status='APPROVED'},
  v=>{v.entries[0].cameraLat=43},
  v=>{v.entries[0].canPublishVisitWindow=true},
  v=>{v.verifiedFreshAgates=1},
  v=>{v.entries.push({...v.entries[0]})}
 ]){
  const copy=structuredClone(prev);mutate(copy);
  assert.throws(()=>checkedPrevious(copy));
 }
 assert.throws(()=>mergeInbox(prev,decoded({add:true,badDate:true}),{nowISO:T}),/future/);
 assert.throws(()=>decoded({add:true,badSite:true}),/misplaced/);
});
test('one original provider metadata call creates independent metadata-only artifact, source outages fail without updates',async()=>{
 let calls=0;
 const mocked=async()=>{calls++;return {ok:true,text:async()=>JSON.stringify(provider({add:true}))}};
 const r=await archive({nowISO:T,fetchFn:mocked});
 assert.equal(calls,1);
 assert.equal(r.report.schemaVersion,'rockhounding-commons-evidence-inbox-check-v1');
 assert.equal(r.report.newMetadataCandidateCount,1);
 assert.equal(r.report.persistentReviewEntryCount,1);
 assert.equal(r.report.newStormPhotoReviewCandidates.length,1);
 assert.equal(r.report.canPredictNewAgates,false);
 assert.equal(r.report.noSourceEvidenceOfBeachSedimentChange,true);
 assert.equal(r.report.retainedCandidates[0].verifiedRockExposure,false);
 await assert.rejects(()=>archive({nowISO:T,fetchFn:async()=>({ok:false,status:503})}),/503/);
});
