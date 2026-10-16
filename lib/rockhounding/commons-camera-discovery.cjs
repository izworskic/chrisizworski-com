'use strict';
// Near-agate Wikimedia geosearch is a discovery tool, NOT a source of observed
// beach changes. Uploaded timestamp is not photo capture date. GPS at the
// camera is not view direction. License text is not permission for other media.
const baseline=require('../../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json');
const season=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const EARTH=6371000;
const MAX_RADIUS=2000;
const expectedIds=[54799113,59461349,72533762,74520656,112940348,195534341];
const denied=Object.freeze({
 verifiedSameVantagePairs:0,
 verifiedStormToSedimentChanges:0,
 verifiedFreshAgates:0,
 canPredictNewAgates:false,canClaimSafeConditions:false,
 canPublishVisitWindow:false
});
function distanceMeters(a,b){
 if(!a||!b||![a.lat,a.lon,b.lat,b.lon].every(Number.isFinite))
  throw Error('Cannot compute camera separation without two GPS points');
 const rad=Math.PI/180,p1=a.lat*rad,p2=b.lat*rad,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dlon/2)**2;
 return 2*EARTH*Math.asin(Math.min(1,Math.sqrt(h)));
}
function originalCaptureDay(text){
 // English free-text originalDate is not a verified UTC time.
 if(typeof text!=='string')return {day:null,quality:'NO_SOURCE_CAPTURE_TIME'};
 const match=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/);
 if(!match)return {day:null,quality:'UNSTRUCTURED_OR_UNVERIFIED_SOURCE_DATE'};
 const day=match[1]+'-'+match[2]+'-'+match[3];
 if(Number.isNaN(Date.parse(day+'T00:00:00Z')))return {day:null,quality:'UNREADABLE_SOURCE_DATE'};
 return {day,quality:'PUBLISHED_ORIGINAL_DATE_LOCAL_ZONE_UNVERIFIED'};
}
function mediaWikiUrl(){
 const p=baseline.sourceQuery;
 if(baseline.schemaVersion!=='rockhounding-commons-grand-marais-geotagged-source-v1'||
  baseline.sourceAPI!=='https://commons.wikimedia.org/w/api.php'||
  p.ggscoord!=='46.675190|-85.987480'||p.ggsradius!==MAX_RADIUS||
  p.ggsnamespace!==6||p.ggslimit!==50||p.generator!=='geosearch'||
  p.prop!=='imageinfo'||p.iiprop!=='timestamp|url|extmetadata|size|mime'||
  baseline.numberOfGeotaggedResults!==6||JSON.stringify(baseline.results.map(x=>x.pageId).sort((a,b)=>a-b))!==JSON.stringify(expectedIds)||
  baseline.verifiedBeforeAfterShorelinePairs!==0||
  baseline.canClaimNewAgates!==false||baseline.canPublishRockhoundingWindow!==false||
  baseline.automaticVisualSimilarityNotConducted!==true)
  throw Error('Source geosearch provenance drifted; verify before publication');
 const url=new URL(baseline.sourceAPI);
 for(const [k,v] of Object.entries(p))url.searchParams.set(k,String(v));
 return url.toString();
}
function decodeProvider(json){
 if(!json||json.batchcomplete===undefined||!json.query?.pages||
   typeof json.query.pages!=='object'||json.continue)
  throw Error('Incomplete Wikimedia camera-geosearch source; do not silently drop pagination');
 const pages=Object.values(json.query.pages);
 if(pages.length>50)throw Error('Wikimedia geosearch exceeded bounded result count');
 const seen=new Set(),r=[];
 for(const p of pages){
  const i=p.imageinfo?.[0],m=i?.extmetadata;
  if(!Number.isInteger(p.pageid)||seen.has(p.pageid)||
    p.ns!==6||typeof p.title!=='string'||p.title.length>250||
    i?.mime!=='image/jpeg'||!m)
   throw Error('Invalid or duplicate Wikimedia file record');
  seen.add(p.pageid);
  const lat=Number(m.GPSLatitude?.value),lon=Number(m.GPSLongitude?.value);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||
    distanceMeters({lat,lon},{lat:46.67519,lon:-85.98748})>MAX_RADIUS+20)
    throw Error('Wikimedia geosearch misplaced / missing camera coordinates');
  const u=new URL(i.descriptionurl);
  if(u.hostname!=='commons.wikimedia.org'||!u.pathname.startsWith('/wiki/File:'))
    throw Error('Untrusted Wikimedia file description origin');
  if(typeof i.timestamp!=='string'||!Number.isFinite(Date.parse(i.timestamp))||
     !m.LicenseShortName?.value||typeof m.DateTimeOriginal?.value!=='string')
   throw Error('Source file lacks upload/date/license metadata');
  r.push({pageId:p.pageid,title:p.title,originalUploadUTC:i.timestamp,
    sourceCaptureDateText:m.DateTimeOriginal.value.replace(/\u00a0/g,' '),
    capture:originalCaptureDay(m.DateTimeOriginal.value.replace(/\u00a0/g,' ')),
    lat,lon,license:m.LicenseShortName.value,
    descriptionURL:i.descriptionurl.split('?')[0],
    licenseURL:m.LicenseUrl?.value||null});
 }
 return r.sort((a,b)=>a.pageId-b.pageId);
}
function reviewDiscovery(rows,{historic=season}={}){
 mediaWikiUrl();
 if(!Array.isArray(rows)||rows.length!==6||
   historic.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
   historic.rows?.length!==11)
  throw Error('Discovery must use the complete audited original six-file source and 2026 GLOS season');
 const stored=new Map(baseline.results.map(x=>[x.pageId,x]));
 for(const row of rows){
  const expected=stored.get(row.pageId);
  if(!expected||expected.title!==row.title||expected.originalUploadUTC!==row.originalUploadUTC||
     expected.sourceCaptureDateText.replace(/\u00a0/g,' ')!==row.sourceCaptureDateText||
     Math.abs(expected.lat-row.lat)>0.000002||Math.abs(expected.lon-row.lon)>0.000002||
     expected.license!==row.license)
   throw Error('Original Wikimedia source metadata shifted: manual review required');
 }
 const shore=rows.filter(r=>[54799113,195534341].includes(r.pageId));
 if(shore.length!==2)throw Error('Expected geotagged 2016 and 2026 independent shore source missing');
 const a=shore.find(r=>r.pageId===54799113),b=shore.find(r=>r.pageId===195534341);
 const cameraGap=distanceMeters(a,b);
 const temporalPairs=[];
 for(const evt of historic.rows){
  for(const photoBefore of shore)for(const photoAfter of shore){
   if(photoBefore.pageId===photoAfter.pageId||!photoBefore.capture.day||!photoAfter.capture.day)continue;
   const t0=Date.parse(photoBefore.capture.day+'T00:00:00Z');
   const t1=Date.parse(photoAfter.capture.day+'T00:00:00Z');
   const from=Date.parse(evt.firstElevatedAt),to=Date.parse(evt.lastElevatedAt);
   const cameraMeters=distanceMeters(photoBefore,photoAfter);
   const within= t0<from&&t0>=from-48*3600000&&t1>to&&t1<=to+72*3600000;
   if(within)temporalPairs.push({
    eventAt:evt.peakObservedAt,before:photoBefore.pageId,after:photoAfter.pageId,
    cameraSeparationMeters:+cameraMeters.toFixed(2),
    cameraWithin15Meters:cameraMeters<=15,
    orientationAndLandmarkMatchReviewed:false,
    verifiedSedimentChange:false
   });
  }
 }
 return {
  schemaVersion:'rockhounding-grand-marais-repeat-photo-proximity-audit-v1',
  provider:'Wikimedia Commons geosearch: original camera GPS and media metadata',
  radiusMeters:MAX_RADIUS,
  sourceNearbyFiles:rows.length,
  independentlyTaggedShoreCandidates:shore.length,
  firstShoreCaptureDay:a.capture.day,
  laterShoreCaptureDay:b.capture.day,
  historicalCameraDistanceMeters:+cameraGap.toFixed(2),
  photoUploadIsNotCaptureDate:true,
  camerasAreNotSameVantage:cameraGap>15,
  manualCameraHeadingVerificationMissing:true,
  spatiallyAndTemporallyPotentialPairs:temporalPairs,
  sameVantageReviewedPairs:0,
  actualSedimentChangePairs:0,
  historicWaveEventCount:historic.rows.length,
  nearbyPhotoSiteLabelsAreNotVerifiedViews:true,
  allResults:rows.map(r=>({pageId:r.pageId,title:r.title,day:r.capture.day,
    dateQuality:r.capture.quality,lat:r.lat,lon:r.lon,
    rights:r.license,source:r.descriptionURL,
    originalUploadedAt:r.originalUploadUTC})),
  ...denied
 };
}
function discoverSourceChanges(rows){
 mediaWikiUrl();
 if(!Array.isArray(rows)||rows.length>50)throw Error('Unbounded camera discovery watch');
 const known=new Map(baseline.results.map(x=>[x.pageId,x]));
 const incoming=new Set(rows.map(x=>x.pageId));
 const additions=[],metadataChanges=[],notReturned=[];
 for(const row of rows){
  const expected=known.get(row.pageId);
  if(!expected){
   additions.push({pageId:row.pageId,title:row.title,source:row.descriptionURL,
    sourceCaptureDate:row.capture.day,
    dateQuality:row.capture.quality,
    camera: [row.lat,row.lon],
    candidateOnly:true,verifiedAgateBeachView:false,
    canClaimBeachRockChange:false});
   continue;
  }
  if(expected.title!==row.title||expected.originalUploadUTC!==row.originalUploadUTC||
     expected.sourceCaptureDateText.replace(/\u00a0/g,' ')!==row.sourceCaptureDateText||
     Math.abs(expected.lat-row.lat)>.000002||Math.abs(expected.lon-row.lon)>.000002||
     expected.license!==row.license)
   metadataChanges.push({pageId:row.pageId,status:'ORIGINAL_SOURCE_METADATA_CHANGED_NEEDS_REVIEW'});
 }
 for(const x of baseline.results)
  if(!incoming.has(x.pageId))notReturned.push(x.pageId);
 return {
  schemaVersion:'rockhounding-commons-new-camera-discovery-watch-v1',
  originalSource:'Wikimedia Commons geosearch',
  originalReviewedFileCount:baseline.results.length,
  nowNearbyGeoTaggedFiles:rows.length,
  unreviewedNewSourceCount:additions.length,
  originalMediaMetadataChangedCount:metadataChanges.length,
  previouslyReviewedFilesNoLongerReturned:notReturned,
  sourceState:additions.length||metadataChanges.length||notReturned.length?
   'NEEDS_MANUAL_ORIGINAL_PHOTO_REVIEW':'NO_NEW_SOURCE_PHOTOS',
  unreviewedAdditions:additions,
  changedExistingFiles:metadataChanges,
  potentialPairAutomaticallyValidated:false,
  beachRockChangeAutomaticallyValidated:false,
  historicalWaveEventsAutomaticallyCalibrated:false,
  ...denied
 };
}
module.exports={distanceMeters,originalCaptureDay,mediaWikiUrl,decodeProvider,reviewDiscovery,discoverSourceChanges};
