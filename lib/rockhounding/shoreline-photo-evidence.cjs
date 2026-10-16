'use strict';
// Original independently dated Sentinel-2 scene METADATA and historical
// author photos. This gate can identify a pre/post storm *imagery candidate*
// but MUST NEVER translate imagery dates/cloud percentages into measured
// gravel exposure, shoreline-change area or new stones.
const sentinel=require('../../data/rockhounding/grand-marais-2026-sentinel-shoreline-candidate-scenes.json');
const authorPhotos=require('../../data/rockhounding/grand-marais-2026-independent-shore-photo-register.json');
const history=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const H=3600000,DAY=24*H;
const SAFE=Object.freeze({
 observedPebbleExposure:false,shorelineChangeVerified:false,
 canClaimStormCausedStoneExposure:false,canPublishVisitWindow:false,
 canClaimSafeAccess:false,canInferHarborSurf:false
});
function sceneSourceValidated(doc=sentinel){
 if(doc?.schemaVersion!=='rockhounding-grand-marais-sentinel-scene-catalog-v1'||
   doc?.collection!=='sentinel-2-c1-l2a'||
   doc?.source!=='ELEMENT84_EARTH_SEARCH_STAC_SENTINEL2_C1_L2A'||
   doc?.nativeVisualGsdMeters!==10||doc?.scenePixelReviewCompleted!==false||
   doc?.beachWaterlineChangeMeasured!==false||doc?.newlyExposedRockObserved!==false||
   doc?.aoiStatus!=='APPROXIMATE_OSM_AGATE_BEACH_RESEARCH_WINDOW_NOT_CURRENT_WETLINE'||
   doc?.cloudPercentMeaning!=='WHOLE_SCENE_METADATA_NOT_VERIFIED_LOCAL_BEACH_CLOUDS'||
   !Array.isArray(doc.scenes)||doc.scenes.length!==9||
   !Array.isArray(doc.researchAoiBboxWGS84)||doc.researchAoiBboxWGS84.join(',')!=='-85.991,46.673,-85.981,46.679'||
   !doc.publication||Object.values(doc.publication).some(v=>v!==false))
  throw Error('Original Sentinel-2 remote scene catalog/safety contract changed');
 const ids=new Set(),times=new Set();
 for(const s of doc.scenes){
  const match=/^S2[ABC]_T16TES_(20\d{6})T\d{6}_L2A$/.exec(s?.id||'');
  const t=Date.parse(s?.datetime||'');
  if(!match||!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==
    match[1].slice(0,4)+'-'+match[1].slice(4,6)+'-'+match[1].slice(6,8)||
    !Number.isFinite(s.sceneCloudCoverPercent)||s.sceneCloudCoverPercent<0||s.sceneCloudCoverPercent>100||
    s.mgrsTile!=='16TES'||s.epsg!==32616||s.visualGsdMeters!==10||
    s.stacItemUrl!=='https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/'+s.id||
    s.localAgateBeachVisibleWithoutClouds!==null||
    s.waterlineChangeReviewed!==false||s.sameTideOrLakeLevelControlled!==false||
    s.differenceInExposedGravelMeasured!==false||s.beachChangeDirection!=='UNASSESSED'||
    ids.has(s.id)||times.has(s.datetime))
   throw Error('Original Sentinel scene date, ID, provider or local-QA boundary changed');
  ids.add(s.id);times.add(s.datetime);
 }
 return true;
}
function photoSourceValidated(doc=authorPhotos){
 if(doc?.schemaVersion!=='grand-marais-independent-2026-shore-photo-register-v1'||
  doc.siteId!=='grand-marais-agate'||doc.noPairSameVantageVerified!==true||
  doc.fieldValidatedShorelineChangeCount!==0||
  doc.licensePolicy!=='LINK_TO_ORIGINAL_SOURCES_ONLY_DO_NOT_COPY_LICENSED_PHOTOS'||
  doc.canPublishNewRockExposure!==false||
  doc.canPublishRockhoundingVisitWindow!==false||doc.canClaimSafeAccess!==false||
  !Array.isArray(doc.photoRecords)||doc.photoRecords.length!==3)
  throw Error('Independent ground-level photo source registry mutated');
 const ids=new Set();
 for(const p of doc.photoRecords){
  if(!/^https:\/\/(?:commons\.wikimedia\.org|www\.flickr\.com|www\.reddit\.com)\//.test(p?.sourceUrl||'')||
   ids.has(p.id)||!Number.isFinite(Date.parse(p.originalReportedCaptureDate))||
   !Number.isFinite(Date.parse(p.uploadDate))||p.originalReportedCaptureDate>p.uploadDate||
   !['CAMERA_EXIF_SELF_DECLARED_UNAUDITED','PHOTO_PAGE_TAKEN_ON_SELF_DECLARED','AUTHOR_RELATIVE_DATE_APPROXIMATE'].includes(p.dateConfidence)||
   p.independentPerspectiveCompared!==false||p.originalImagePixelChangeReviewed!==false||
   p.visibleNewlyExposedRocksVerified!==false||p.rockDepositChangeMeters!==null||
   p.usableAsPostStormOutcome!==false)
   throw Error('Single self-reported shoreline photo cannot become post-storm exposure proof');
  if(p.geolocationWgs84){
   if(!Array.isArray(p.geolocationWgs84)||p.geolocationWgs84.length!==2||
      Math.abs(p.geolocationWgs84[0]+85.98748)>.001||
      Math.abs(p.geolocationWgs84[1]-46.67519)>.001)
    throw Error('Historical photo location not Agate Beach');
  }
  ids.add(p.id);
 }
 return true;
}
function validateWaveHistory(h=history){
 if(h?.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
    h.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||
    !Array.isArray(h.rows)||h.rows.length!==11||h.actualObservedWaveRecords!==5243||
    h.qualifyingMeasuredOffshoreEpisodes!==8||h.actualRockExposureFieldObservations!==0||
    h.canPredictNewAgates!==false||h.canPublishRockhoundingWindow!==false||
    h.canClaimSafeShore!==false)
  throw Error('Not the independently measured GLOS offshore episode history');
 return true;
}
function pairForEvent(event,{catalog=sentinel}={}){
 sceneSourceValidated(catalog);
 if(!event||!event.qualifyingOffshoreEpisode||!Number.isFinite(Date.parse(event.firstElevatedAt))||
    !Number.isFinite(Date.parse(event.lastElevatedAt))||
    !Number.isFinite(Date.parse(event.peakObservedAt))||
    Date.parse(event.firstElevatedAt)>Date.parse(event.peakObservedAt)||
    Date.parse(event.peakObservedAt)>Date.parse(event.lastElevatedAt))
  return {status:'UNQUALIFIED_OR_BAD_OFFSHORE_EPISODE',before:null,after:null,
   ...SAFE};
 const begin=Date.parse(event.firstElevatedAt),end=Date.parse(event.lastElevatedAt);
 const sorted=[...catalog.scenes].sort((a,b)=>Date.parse(a.datetime)-Date.parse(b.datetime));
 // These checks reject whole-scene *high-cloud* images but can NEVER prove
 // local beach cloud-free status; that requires actual image pixel inspection.
 const reasonable=sorted.filter(x=>x.sceneCloudCoverPercent<=35);
 const pre=reasonable.filter(x=>{
  const t=Date.parse(x.datetime);
  return t<begin&&t>=begin-10*DAY
 }).at(-1);
 const post=reasonable.find(x=>{
  const t=Date.parse(x.datetime);
  return t>=end+6*H&&t<=end+10*DAY;
 });
 const summarize=x=>x?{id:x.id,capturedUTC:x.datetime,
  sceneCloudCoverPercent:x.sceneCloudCoverPercent,
  visualGsdMeters:x.visualGsdMeters,stacItemUrl:x.stacItemUrl,
  sitePixelCloudQc:false,registeredSameVantage:false,
  waterlineOrGravelChangeReviewed:false}:null;
 const status=pre&&post?'DATED_IMAGERY_PAIR_CANDIDATE_NOT_REVIEWED':
   !pre?'NO_QUALIFYING_PRE_STORM_SCENE':'NO_QUALIFYING_POST_STORM_SCENE';
 return {status,
  firstElevatedAt:event.firstElevatedAt,lastElevatedAt:event.lastElevatedAt,
  peakObservedAt:event.peakObservedAt,observedOffshorePeakM:event.peakWaveHeightM,
  before:summarize(pre),after:summarize(post),
  sameBeachPixelsRegistered:false,
  lakeLevelNormalizationDone:false,
  satelliteTenMetersCannotResolvePebbles:true,
  metadataCloudCoverIsWholeTileNotBeach:true,
  noTwoSameVantageBeachPhotos:true,
  actualBeachChangeDirection:'UNKNOWN',measuredGravelExposureAreaM2:null,
  shorelineChangeEvidenceLevel:'CATALOG_METADATA_ONLY',
  ...SAFE
 };
}
function shoreChangeResearch({siteId='grand-marais-agate',waveHistory=history,
 sceneCatalog=sentinel,photos=authorPhotos}={}){
 sceneSourceValidated(sceneCatalog);photoSourceValidated(photos);
 validateWaveHistory(waveHistory);
 if(siteId!=='grand-marais-agate')return {
  siteId,status:siteId==='grand-marais-harbor'?'BAYSHORE_NO_INDEPENDENT_IMAGERY_OR_WAVE_TRANSFER':'UNKNOWN_SITE',
  pairedResearchEvents:0,independentlyVerifiedBeachChanges:0,
  canClaimSafeAccess:false,canPublishVisitWindow:false,...SAFE
 };
 const rows=waveHistory.rows.map(event=>({eventPeakAt:event.peakObservedAt,
  ...pairForEvent(event,{catalog:sceneCatalog})}));
 const paired=rows.filter(x=>x.status==='DATED_IMAGERY_PAIR_CANDIDATE_NOT_REVIEWED');
 return {schemaVersion:'grand-marais-poststorm-shoreline-evidence-v1',
  siteId,status:'HISTORIC_IMAGERY_CANDIDATES_ONLY_NO_SHORELINE_CHANGE_VERDICT',
  observedOffshoreEpisodeGroups:rows.length,
  qualifiedOffshoreEpisodes:waveHistory.qualifyingMeasuredOffshoreEpisodes,
  authoredGroundPhotoRecords:photos.photoRecords.length,
  independentlyVerifiedBeachChanges:0,
  directlyMeasuredPostStormRockChanges:0,
  pairedResearchEvents:paired.length,
  source:'GLOS_OBSERVATIONS_PLUS_INDEPENDENT_SENTINEL_CATALOG_AND_AUTHOR_PHOTOS',
  pairs:rows,
  waveBuoyIsNotBeachWaveGauge:true,
  satelliteSceneMetadataIsNotPixelDifference:true,
  exposedPebbleProbability:null,rockhoundingOpportunityScore:null,
  ...SAFE};
}
module.exports={sceneSourceValidated,photoSourceValidated,validateWaveHistory,pairForEvent,shoreChangeResearch};
