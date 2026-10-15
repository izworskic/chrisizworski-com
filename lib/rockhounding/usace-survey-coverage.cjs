'use strict';
// A dated USACE *entrance-channel* survey must never be silently treated as
// measured bathymetry, waves or new-rock exposure at either public beach.
// Envelope non-overlap can reject geographic coverage; envelope intersection
// can NOT confirm survey soundings at a location.
const reviewed=require('../../data/rockhounding/grand-marais-usace-survey-coverage-guard-2026-10-15.json');
const OSM=require('../../data/rockhounding/grand-marais-research-footprints.geojson');
const SURVEY_ID='GR_01_MAS_20260730_CS';
const EXPECTED_BOUNDS=[-85.971734,46.675899,-85.969027,46.685841];
function finiteBbox(v){
 return Array.isArray(v)&&v.length===4&&v.every(Number.isFinite)&&
  v[0]<v[2]&&v[1]<v[3]&&v[0]>-90&&v[2]<-80&&v[1]>40&&v[3]<50;
}
function validateSource(e=reviewed){
 const s=e?.survey, geo=s?.originalGeometry, c=e?.meaning, src=e?.siteInputs;
 if(e?.schemaVersion!=='rockhounding-usace-2026-survey-footprint-guard-v1'||
    s?.jobId!==SURVEY_ID||s?.objectId!==125722||s?.surveyDateUTC!=='2026-07-30'||
    s?.sourceRun!=='https://github.com/izworskic/chrisizworski-com/actions/runs/38826041981'||
    geo?.ringCount!==1||geo?.vertexCount!==161||
    !finiteBbox(geo?.boundsWgs84)||
    !geo.boundsWgs84.every((v,i)=>Math.abs(v-EXPECTED_BOUNDS[i])<=.0000005)||
    geo?.preciseSurveyPolygonNotEmbedded!==true||
    geo?.dataProjection!=='NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet'||
    s?.sampledOriginalXYZ?.archiveSHA256!=='6dce01ac993dd991219be0da4718fd90b83f3e465099c67e1b3186394081ac5c'||
    s?.sampledOriginalXYZ?.xyzPreviewRows!==1500||
    s?.sampledOriginalXYZ?.xyzFullSurveyRowsValidated!==false||
    s?.sampledOriginalXYZ?.xyzGeoreferencingIndependentlyChecked!==false||
    src?.geoJSONPath!=='data/rockhounding/grand-marais-research-footprints.geojson'||
    src?.normalOrAccessSurveyed!==false||
    JSON.stringify(src?.siteIds)!=='["grand-marais-agate","grand-marais-harbor"]'||
    !c||Object.values(c).some((value,key)=>typeof value!=='boolean')||
    c.boundingBoxesCanRejectDisjointCoverage!==true||
    c.boundingBoxesCannotProveCoveredWater!==true||
    c.bathymetryDoesNotMeasureWaves!==true||
    c.canClaimSiteDepthFromSurvey!==false||
    c.canPublishHarborSurf!==false||
    c.canPredictNewStones!==false||
    c.canPublishVisitWindow!==false||
    c.canClaimSafeAccess!==false)
  throw Error('USACE 2026 survey geographic provenance or safety gate changed');
 return true;
}
function polygonBox(feature){
 if(feature?.geometry?.type!=='Polygon'||!Array.isArray(feature.geometry.coordinates)||
    feature.geometry.coordinates.length<1||feature.geometry.coordinates.length>20)
  throw Error('Unexpected public-site study geometry');
 let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity,n=0;
 for(const ring of feature.geometry.coordinates){
  if(!Array.isArray(ring)||ring.length<4||ring.length>5000)
   throw Error('Malformed OSM research polygon');
  for(const point of ring){
   if(!Array.isArray(point)||point.length<2||!Number.isFinite(point[0])||
      !Number.isFinite(point[1])||point[0]<=-90||point[0]>=-80||
      point[1]<=40||point[1]>=50)throw Error('Invalid OSM coordinate');
   xmin=Math.min(xmin,point[0]);xmax=Math.max(xmax,point[0]);
   ymin=Math.min(ymin,point[1]);ymax=Math.max(ymax,point[1]);n++;
  }
 }
 const out=[xmin,ymin,xmax,ymax];
 if(n>10000||!finiteBbox(out))throw Error('Unusable beach polygon');
 return out;
}
function boxesDisjoint(a,b){
 return a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1];
}
function siteSurveyCoverage(siteId,{source=reviewed,sitePolygons=OSM}={}){
 validateSource(source);
 if(!source.siteInputs.siteIds.includes(siteId))
  return {siteId,status:'UNKNOWN_SITE',isInside2026SurveyCoverage:false,
    canUseSurveyForSiteDepth:false,canClaimSafeAccess:false};
 const features=sitePolygons?.features;
 if(!Array.isArray(features)||features.length!==2)throw Error('Site footprint source changed');
 const ids=features.map(x=>x.properties?.siteId).sort();
 if(JSON.stringify(ids)!=='["grand-marais-agate","grand-marais-harbor"]')
  throw Error('Site footprint identity mismatch');
 const feature=features.find(x=>x.properties?.siteId===siteId);
 if(!feature||feature.properties.featureStatus!=='OSM_RESEARCH_GEOMETRY_ONLY'||
    feature.properties.shorelineWaterwardNormalDeg!==null)
  throw Error('Unreviewed beach has been promoted to surveyed boundary');
 const box=polygonBox(feature), survey=source.survey.originalGeometry.boundsWgs84;
 const disjoint=boxesDisjoint(box,survey);
 return {
  siteId, surveyJobId:SURVEY_ID,surveyEndUTC:'2026-07-30',
  siteSource:'OSM_UNSURVEYED_RESEARCH_POLYGON',
  surveyEvidenceClass:'USACE_SURVEY_JOB_POLYGON_ENVELOPE_NOT_QC_VERIFIED_XYZ',
  siteResearchBoundingBox:box,
  surveyResearchBoundingBox:[...survey],
  status:disjoint?'OUTSIDE_2026_USACE_SURVEY_FOOTPRINT_ENVELOPE':'ENVELOPES_INTERSECT_COVERAGE_NOT_VERIFIED',
  isInside2026SurveyCoverage:disjoint?false:null,
  canUseSurveyForSiteDepth:false,
  canInferLocalHarborWaves:false,
  canPredictFreshStones:false,
  canPublishVisitWindow:false,
  canClaimSafeAccess:false
 };
}
module.exports={validateSource,polygonBox,boxesDisjoint,siteSurveyCoverage};
