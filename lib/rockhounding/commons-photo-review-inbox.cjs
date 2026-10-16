'use strict';
// Persist metadata about NEW nearby Wikimedia photographs, never images,
// private identifiers, inferred sediment change, or an automatic visitor
// forecast. Source timestamps are not original camera timestamps.
const baseline=require('../../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const {distanceMeters}=require('./commons-camera-discovery.cjs');
const {pointInPolygon,sitePolygon}=require('./shoreline-photo-evidence.cjs');
const {eventQueue}=require('./storm-photo-review-queue.cjs');
const SCHEMA='rockhounding-commons-photo-review-inbox-v1';
const STATION={lat:46.67519,lon:-85.98748};
const LIMIT=500;
const CLAIMS=Object.freeze({
 verifiedBeforeAfterStormPairs:0,validatedShorelineChangeOutcomes:0,
 verifiedFreshAgates:0,canPredictNewAgates:false,
 canClaimSafeShore:false,canPublishVisitWindow:false
});
function initialInbox(){
 return {schemaVersion:SCHEMA,siteId:'grand-marais-agate',
  source:'WIKIMEDIA_COMMONS_ORIGINAL_CAMERA_GEOTAG_METADATA',
  lastSourceCheckUTC:null,reviewStatus:'RESEARCH_CANDIDATES_ONLY',
  sourceCameraLocationDoesNotProveAgateBeachView:true,
  uploadTimeIsNotOriginalCaptureTime:true,...CLAIMS,entries:[]};
}
function verifiedTime(s){
 if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s))
  return NaN;
 const t=Date.parse(s);
 return Number.isFinite(t)?t:NaN;
}
function checkedPrevious(p){
 if(!p||p.schemaVersion!==SCHEMA||p.siteId!=='grand-marais-agate'||
    p.source!=='WIKIMEDIA_COMMONS_ORIGINAL_CAMERA_GEOTAG_METADATA'||
    p.reviewStatus!=='RESEARCH_CANDIDATES_ONLY'||
    p.sourceCameraLocationDoesNotProveAgateBeachView!==true||
    p.uploadTimeIsNotOriginalCaptureTime!==true||
    Object.entries(CLAIMS).some(([key,val])=>p[key]!==val)||
    !Array.isArray(p.entries)||p.entries.length>LIMIT||
    p.lastSourceCheckUTC!==null&&!Number.isFinite(verifiedTime(p.lastSourceCheckUTC)))
  throw Error('Prior photo review inbox identity/safety invariants failed');
 const seen=new Set();
 for(const e of p.entries){
  if(!Number.isInteger(e.pageId)||seen.has(e.pageId)||
     baseline.results.some(b=>b.pageId===e.pageId)||
     !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(e.sourceURL)||
     !Number.isFinite(verifiedTime(e.firstSeenUTC))||
     !Number.isFinite(e.cameraLat)||!Number.isFinite(e.cameraLon)||
     distanceMeters(STATION,{lat:e.cameraLat,lon:e.cameraLon})>2020||
     !['NEEDS_SCENE_AND_CAMERA_REVIEW','SOURCE_METADATA_CHANGED_NEEDS_REVIEW'].includes(e.status)||
     e.viewAsAgateBeachVerified!==false||
     e.matchedViewpointVerified!==false||
     e.confirmedNewAgateExposure!==false||
     e.canPublishVisitWindow!==false||
     !Array.isArray(e.stormAssociations)||e.stormAssociations.length>11)
   throw Error('Persisted unreviewed photographic entry cannot be trusted');
  seen.add(e.pageId);
 }
 return true;
}
function checkRow(r,{nowISO}){
 const now=verifiedTime(nowISO),day=r?.capture?.day;
 if(!Number.isInteger(r?.pageId)||r.pageId<1||
    typeof r.title!=='string'||r.title.length>250||
    !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(r.descriptionURL||'')||
    !Number.isFinite(r.lat)||!Number.isFinite(r.lon)||
    distanceMeters(STATION,{lat:r.lat,lon:r.lon})>2020||
    typeof r.license!=='string'||r.license.length>100||
    typeof r.originalUploadUTC!=='string'||!Number.isFinite(Date.parse(r.originalUploadUTC))||
    !Number.isFinite(now))
  throw Error('Reject unsupported or untrusted original Wikimedia geotag');
 if(day!==null&&day!==undefined){
  const at=Date.parse(day+'T00:00:00Z');
  if(typeof day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(day)||
     !Number.isFinite(at)||at>now+36*3600000)
   throw Error('Original photo capture day is malformed or in future');
 }
 return true;
}
function eventAssociations(pageId,queue){
 return queue.stormCandidateWindows.flatMap(evt=>evt.sourceCandidates.filter(c=>
  c.id==='wikimedia-geotag-'+pageId).map(c=>({
   offshorePeakAtUTC:evt.observedOffshorePeakAtUTC,
   measuredOffshorePeakM:evt.observedOffshorePeakM,
   originalPhotoDateRole:c.timeRole,
   verifiedAgateBeachScene:false,verifiedPhotoViewpoint:false,
   observedShorelineChange:false
  })));
}
function mergeInbox(previous,rows,{nowISO}={}){
 const p=previous===null?initialInbox():previous;
 checkedPrevious(p);
 const now=verifiedTime(nowISO);
 if(!Number.isFinite(now)||!Array.isArray(rows)||rows.length>50)
  throw Error('Invalid one-request geotag watch or UTC clock');
 const ids=new Set(),newRows=[];
 const known=new Set(baseline.results.map(x=>x.pageId));
 for(const r of rows){
  checkRow(r,{nowISO});
  if(ids.has(r.pageId))throw Error('Duplicate source camera file in one watch');
  ids.add(r.pageId);
  if(!known.has(r.pageId))newRows.push(r);
 }
 // A newly observed geotag may be physically NEAR Agate but can face
 // inland: the original scene is still unverified even when within OSM.
 const queue=eventQueue({additionalGeoRows:newRows});
 const seen=new Map(p.entries.map(e=>[e.pageId,e]));
 const out=p.entries.map(e=>({...e}));
 let added=0,changed=0;
 for(const r of newRows){
  const assoc=eventAssociations(r.pageId,queue);
  const sourceInfo={
   title:r.title,sourceURL:r.descriptionURL,
   cameraLat:r.lat,cameraLon:r.lon,rightsLabel:r.license,
   originalCaptureDate:r.capture.day??null,
   originalDateQuality:r.capture.quality,
   originalUploadUTC:r.originalUploadUTC,
   captureDateNotVerifiedUTC:true,
   sourceGpsInsideResearchPolygon:pointInPolygon([r.lon,r.lat],sitePolygon()),
   stormAssociations:assoc
  };
  const prior=seen.get(r.pageId);
  if(!prior){
   added++;
   out.push({
    pageId:r.pageId,...sourceInfo,firstSeenUTC:nowISO,
    status:'NEEDS_SCENE_AND_CAMERA_REVIEW',
    viewAsAgateBeachVerified:false,matchedViewpointVerified:false,
    confirmedNewAgateExposure:false,canPublishVisitWindow:false,
    priorMetadataRevisions:0
   });
   continue;
  }
  const properties=['title','sourceURL','cameraLat','cameraLon','rightsLabel',
   'originalCaptureDate','originalDateQuality','originalUploadUTC','stormAssociations'];
  if(properties.some(k=>JSON.stringify(prior[k])!==JSON.stringify(sourceInfo[k]))){
   changed++;
   const idx=out.findIndex(e=>e.pageId===r.pageId);
   out[idx]={...prior,...sourceInfo,status:'SOURCE_METADATA_CHANGED_NEEDS_REVIEW',
    priorMetadataRevisions:(prior.priorMetadataRevisions||0)+1,
    // Never confer rights or source/scene validation through a metadata change.
    viewAsAgateBeachVerified:false,matchedViewpointVerified:false,
    confirmedNewAgateExposure:false,canPublishVisitWindow:false};
  }
 }
 if(out.length>LIMIT)throw Error('Source evidence exceeds bounded review-inbox capacity');
 out.sort((a,b)=>a.pageId-b.pageId);
 const inbox={...p,lastSourceCheckUTC:nowISO,entries:out};
 checkedPrevious(inbox);
 return {inbox,diagnostics:{
  sourceFilesReviewed:rows.length,additionalPageIds:newRows.length,
  newCandidates:added,changedCandidates:changed,
  storedCandidates:out.length,retainedPreviouslySeenNotReturned:out.filter(e=>!ids.has(e.pageId)).length,
  sourceEventAssociations:out.reduce((sum,e)=>sum+e.stormAssociations.length,0),
  readyVerifiedPairs:0,readyRockExposureClaims:0
 }};
}
module.exports={SCHEMA,initialInbox,checkedPrevious,mergeInbox,checkRow};
