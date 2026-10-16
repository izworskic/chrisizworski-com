#!/usr/bin/env node
'use strict';
// One existing Commons geosearch fetch; archive only metadata on a dedicated
// branch. NEVER publish new agates, shore safety or live visitor conditions.
const fs=require('node:fs'),path=require('node:path');
const {watch}=require('./watch-commons-camera-sources.cjs');
const {initialInbox}=require('../../lib/rockhounding/commons-photo-review-inbox.cjs');
function parseArgs(args){
 const o={};
 for(let i=0;i<args.length;i+=2){
  if(!['--inbox','--report'].includes(args[i])||!args[i+1]||o[args[i]])
   throw Error('Usage: --inbox persistent.json --report research-artifact.json');
  o[args[i]]=args[i+1];
 }
 if(!o['--inbox']||!o['--report'])throw Error('Missing research inbox/report paths');
 return o;
}
function writeAtomic(file,data){
 const target=path.resolve(file);fs.mkdirSync(path.dirname(target),{recursive:true});
 const tmp=target+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600});
 fs.renameSync(tmp,target);
}
async function archive({previous=initialInbox(),fetchFn=fetch,nowISO=new Date().toISOString()}={}){
 const data=await watch({previousInbox:previous,fetchFn,nowISO});
 const inbox=data.photoReviewInbox,diagnostics=data.photoReviewInboxDiagnostics;
 return {inbox,report:{
  schemaVersion:'rockhounding-commons-evidence-inbox-check-v1',
  sourceCheckUTC:nowISO,originalGeotagResults:data.nowNearbyGeoTaggedFiles,
  newMetadataCandidateCount:diagnostics.newCandidates,
  changedMetadataCandidateCount:diagnostics.changedCandidates,
  persistentReviewEntryCount:diagnostics.storedCandidates,
  noNewImageConfirmsAgateBeachScene:true,
  noSourceEvidenceOfBeachSedimentChange:true,
  canPredictNewAgates:false,canPublishVisitWindow:false,
  sourceChanges:data.sourceState,
  newStormPhotoReviewCandidates:data.stormPhotoResearch.stormEventsWithNewNearbyDatedMedia,
  retainedCandidates:inbox.entries.map(x=>({pageId:x.pageId,source:x.sourceURL,
   originalCaptureDate:x.originalCaptureDate,dateQuality:x.originalDateQuality,
   camera:{lat:x.cameraLat,lon:x.cameraLon},
   status:x.status,stormAssociations:x.stormAssociations,
   verifiedScene:false,verifiedRockExposure:false}))
 }};
}
async function main(args=process.argv.slice(2)){
 const a=parseArgs(args);
 const previous=fs.existsSync(a['--inbox'])?
  JSON.parse(fs.readFileSync(a['--inbox'],'utf8')):initialInbox();
 // No mutations at all on HTTP error or untrusted source metadata.
 const {inbox,report}=await archive({previous});
 writeAtomic(a['--inbox'],inbox);
 writeAtomic(a['--report'],report);
 console.log('COMMONS_STORM_PHOTO_REVIEW_INBOX '+JSON.stringify({
  nearbyOriginalMedia:report.originalGeotagResults,
  newCandidates:report.newMetadataCandidateCount,
  changedCandidates:report.changedMetadataCandidateCount,
  retainedInbox:report.persistentReviewEntryCount,
  associatedObservedStorms:report.newStormPhotoReviewCandidates.length,
  canPredictNewAgates:false,safeBeach:false
 }));
}
if(require.main===module)main().catch(e=>{
 console.error('COMMONS_PHOTO_INBOX_FAILED '+(e?.message||String(e)));process.exitCode=1;
});
module.exports={archive,parseArgs};
