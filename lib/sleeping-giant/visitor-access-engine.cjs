'use strict';

/**
 * Source-backed named access and legal travel-mode boundaries for Sleeping Giant.
 * Not a current trail-status feed, road router, parking GPS database or elevation graph.
 * Keeping these four questions separate prevents a known parking facility or named
 * junction from being misrepresented as an exact navigable waypoint.
 */
const EVIDENCE = require('../../data/sleeping-giant/visitor-access-evidence.json');
const ROUTES = require('../../data/sleeping-giant/official-routes.json');
const REQUIRED_SOURCES = new Set(['parkCamping','parkBikeGuide','parkActivities','parkManagementPlan','parkMap','parkAlerts']);
const ROUTE_ANCHORS = Object.freeze({
  'sea-lion':['south-kabeyun'],
  'top-of-the-giant':['south-kabeyun','kabeyun-talus','talus-top'],
  'head-of-the-giant':['south-kabeyun','kabeyun-sawyer','head-foot-transition'],
  'nanabosho-lookout':['south-kabeyun','kabeyun-sawyer','sawyer-talus','nanabosho-foot-transition'],
  'middlebrun-beach':[],
  'pass-lake-overlook':[]
});
const SOURCE_REVIEWED_NOT_LIVE = 'Official route/access description reviewed, not a live inspection or opening report';

function validateLedger(data=EVIDENCE) {
  if(data.schemaVersion!==2||!Array.isArray(data.anchors))throw Error('Unexpected Sleeping Giant access evidence schema');
  if(data.policies?.turnByTurnRouteEnabled!==false||data.policies?.anyCoordinateCertified!==false
      ||data.policies?.publicMapNavigationEnabled!==false)throw Error('Unapproved navigation gate in source evidence');
  for(const source of REQUIRED_SOURCES) {
    if(typeof data.sources?.[source]!=='string'||!data.sources[source].startsWith('https://'))throw Error('Missing official source '+source);
  }
  const ids=new Set();
  for(const a of data.anchors){
    if(!a.id||ids.has(a.id))throw Error('Duplicate or missing access evidence id');
    ids.add(a.id);
    if(!a.namedAccessVerified||!Array.isArray(a.evidence)||a.evidence.length===0)throw Error('Unsupported named access claim '+a.id);
    if(a.evidence.some(e=>!REQUIRED_SOURCES.has(e.source)||!e.claim))throw Error('Bad official evidence reference '+a.id);
    if(a.coordinates!==null||a.parkingCoordinates!==null||a.precisePointCertified!==false
      ||a.currentOpeningVerified!==false||a.turnByTurnEligible!==false)throw Error('Uncertified precise/live access asserted for '+a.id);
    if(a.existingParkingVerified && (a.id!=='south-kabeyun'||a.kind!=='signed_parking_lot'))throw Error('Unsourced parking certification '+a.id);
    if(a.bikeRackVerified && a.id!=='kabeyun-talus')throw Error('Unverified rack '+a.id);
    if(a.bikeRoundTripKmFromSouthKabeyun!==undefined){
      if(!Number.isFinite(a.bikeRoundTripKmFromSouthKabeyun)||!Number.isFinite(a.footRoundTripKmAfterBike)||!a.route)
        throw Error('Invalid bike/walk split '+a.id);
      const route=ROUTES.routes.find(r=>r.id===a.route);
      if(!route||Math.abs(route.bikeApproachRoundTripKm-a.bikeRoundTripKmFromSouthKabeyun)>0.001
        ||Math.abs(route.bikeHikeRemainingRoundTripKm-a.footRoundTripKmAfterBike)>0.001
        ||Math.abs(route.roundTripKm-(a.bikeRoundTripKmFromSouthKabeyun+a.footRoundTripKmAfterBike))>0.001)
        throw Error('Official return-distance conflict '+a.id);
    }
  }
  for(const [id,anchors] of Object.entries(ROUTE_ANCHORS)){
    if(!ROUTES.routes.some(r=>r.id===id))throw Error('Unknown route in anchor graph '+id);
    if(anchors.some(a=>!ids.has(a)))throw Error('Missing route access anchor '+id);
  }
  if(!ids.has('south-kabeyun')||!ids.has('kabeyun-talus'))throw Error('Missing primary named access anchors');
  const lot=data.anchors.find(a=>a.id==='south-kabeyun');
  if(lot.existingParkingVerified!==true||lot.roadApproachTextVerified!==true
    ||lot.roadKmAsPublished!==36.5||!lot.evidence.some(e=>e.source==='parkCamping'))
    throw Error('Unsigned or undocumented South Kabeyun lot');
  const cutoff=data.anchors.find(a=>a.id==='kabeyun-talus');
  if(cutoff.legalBikeBoundaryVerified!==true||cutoff.bikeRackVerified!==true
    ||!cutoff.evidence.some(e=>e.source==='parkActivities')||!cutoff.evidence.some(e=>e.source==='parkBikeGuide'))
    throw Error('Missing official cycling cutoff and rack proofs');
  return true;
}

function anchorById(id,data=EVIDENCE){
  validateLedger(data);
  const a=data.anchors.find(x=>x.id===id);
  if(!a)throw Error('Unknown Sleeping Giant access anchor '+id);
  return a;
}

function evaluateAccess({routeId,mode='walk'}={},data=EVIDENCE) {
  validateLedger(data);
  if(!['walk','bike_and_hike'].includes(mode))throw Error('Invalid travel mode');
  const route=ROUTES.routes.find(r=>r.id===routeId);
  if(!route)throw Error('Unknown Sleeping Giant route');
  const needed=ROUTE_ANCHORS[routeId];
  const anchors=needed.map(id=>data.anchors.find(a=>a.id===id));
  const hasOfficialBikeSplit=route.bikePermission==='official_documented'
    && Number.isFinite(route.bikeApproachRoundTripKm) && Number.isFinite(route.bikeHikeRemainingRoundTripKm);
  const bikePlanAllowed=mode==='bike_and_hike'&&hasOfficialBikeSplit;
  const bikePlanDenied=mode==='bike_and_hike'&&!hasOfficialBikeSplit;
  const sourceKeys=new Set(anchors.flatMap(a=>a.evidence.map(e=>e.source)));
  sourceKeys.add('parkAlerts');
  const sourceLinks=[...sourceKeys].map(key=>({name:key,url:data.sources[key]}));
  const lot=anchors.find(a=>a.id==='south-kabeyun');
  const switches=anchors.filter(a=>a.legalBikeBoundaryVerified);
  const lastOfficialBikeStop=(routeId==='top-of-the-giant')?
    anchors.find(a=>a.id==='kabeyun-talus'):
    anchors.find(a=>a.id===routeId.replace('head-of-the-giant','head-foot-transition').replace('nanabosho-lookout','nanabosho-foot-transition'));
  const report={
    routeId:route.id,routeName:route.name,mode,
    journeyDistanceRoundTripKm:route.roundTripKm,
    officialNarrativeWayfinding:anchors.map(a=>({id:a.id,name:a.name,description:a.visitorNote,
      verifiedName:a.namedAccessVerified,exactPointKnown:false,sourceNames:a.evidence.map(e=>e.source)})),
    lot:lot?{name:lot.name,existsByOfficialSource:lot.existingParkingVerified,
      signedRoadApproach:lot.approach,roadDistanceKmReferenceOnly:lot.roadKmAsPublished,
      gpsParkingPin:null,parkingCapacityNow:'unverified'}:null,
    legalModeBoundaries:switches.map(a=>({id:a.id,name:a.name,legalUseDocumented:true,
      gpsBoundaryPoint:null,hasOfficialBikeRack:a.bikeRackVerified})),
    modePermittedBySource:mode==='walk'||hasOfficialBikeSplit,
    bikePlan:bikePlanAllowed?{officialBikeKmReturn:route.bikeApproachRoundTripKm,
      officialWalkKmReturn:route.bikeHikeRemainingRoundTripKm,
      leaveBikeAt:lastOfficialBikeStop?.name??null,
      rackDocumented:lastOfficialBikeStop?.bikeRackVerified??false,
      actualBikeStopCoordinates:null}:null,
    modeRejection:bikePlanDenied?'Ontario Parks does not document a complete authorized bike-and-hike split for this route.':null,
    liveAccess:'unverified',
    visitorNavigationEligible:false,googleMapsParkingDirectionsEligible:false,
    gpsTrailRouteEligible:false,elevationProfileRouteEligible:false,
    sourceStatement:SOURCE_REVIEWED_NOT_LIVE,sourceLinks,
    verificationRequired:['actual signed entry coordinates','current road and trail access',
      'full-resolution segment junction verification','permit status for chosen visit date']
  };
  if(bikePlanAllowed && !report.bikePlan.leaveBikeAt)throw Error('Missing source-described bike stop');
  return report;
}

function auditAccess(data=EVIDENCE) {
  validateLedger(data);
  return {
    evidenceReviewedAt:data.reviewedAt,
    namedAnchorsVerified:data.anchors.filter(a=>a.namedAccessVerified).length,
    existingParkingFacilitiesVerified:data.anchors.filter(a=>a.existingParkingVerified).length,
    legalModeBoundariesDocumented:data.anchors.filter(a=>a.legalBikeBoundaryVerified).length,
    bikeRacksConfirmed:data.anchors.filter(a=>a.bikeRackVerified).length,
    coordinateCertified:0,
    roadAccessOpenNowConfirmed:0,
    parkingDirectionsEligible:0,
    routeGeometryCertified:0,
    sourceNarrativeSupported:true,
    sourceDatesAreNotLive:true,
    outcome:'OFFICIAL_NAMED_WAYFINDING_ONLY_NO_GPS_ROUTING'
  };
}

module.exports={validateLedger,evaluateAccess,auditAccess,anchorById,ROUTE_ANCHORS,SOURCE_REVIEWED_NOT_LIVE};

if(require.main===module)console.log(JSON.stringify(auditAccess(),null,2));
