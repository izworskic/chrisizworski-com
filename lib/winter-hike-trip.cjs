'use strict';
/**
 * Research-only join of live environmental evidence and static manager evidence.
 * A venue with a park description is not an inspected/plowed winter trailhead.
 * This module deliberately cannot confer managerConfirmed:true from static pages.
 */
const E=require('./winter-hike-decision.cjs');
const Live=require('./winter-hike-live.cjs');
const ArcGIS=require('./winter-hike-arcgis.cjs');
const Access=require('./winter-hike-access.cjs');
const catalog=require('../data/winter-hike/michigan-manager-evidence.json');
function resolveAccess(destination, records=catalog.records) {
  const r=(records||[]).find(x=>x.id===destination?.id);
  const parking=r?.winterParking?.status==='closed'?'closed':'unverified';
  const trail=r?.trailStatus==='closed'?'closed':
    r?.trailStatus==='partially-closed'?'partial-closure':'unverified';
  return {
    trail,parking,road:'unverified',managerConfirmed:false,winterSpecific:false,
    sourceUrl:r?.officialPublicPage||null,
    checkedAt:null, // webpage retrieval date cannot prove active winter access
    managerEvidence:r?{status:r.trailStatus,description:r.trailStatement,sourceUrl:r.officialPublicPage,
      retrievedDate:catalog.checkedDate}:null,
    winterParkingCoordinates:null,
    navigationReady:false
  };
}
async function evaluateTrip(destination,tripDate,options={}) {
  if(!destination?.id || !Live.validPoint(destination))throw new Error('Invalid curated destination');
  const now=options.now??Date.now();
  // GIS lookup is explicit in this research branch; cannot treat missing
  // geometry as an open route. Never accept unbounded client coordinates.
  const [evidence,geometry] = await Promise.all([
    Live.getTripEvidence(destination,tripDate,options),
    options.loadArcGIS===true
      ? ArcGIS.lookup(destination,{fetchJson:options.arcgisFetchJson,routeObjectIds:options.routeObjectIds})
          .catch(()=>({status:'unavailable',reason:'Official GIS source fetch failed',spatial:null}))
      : Promise.resolve({status:'unavailable',reason:'Geometry has not been checked for this outing',spatial:null})
  ]);
  const spatial=geometry.spatial;
  const access=Array.isArray(options.managerChecks)
    ? Access.accessFromChecks(destination.id,options.managerChecks,now)
    : resolveAccess(destination,options.managerRecords);
  const decision=E.interpret(destination,{
    activity:options.activity||'either',access,
    snow:evidence.snow,forecast:{...evidence.forecast,alerts:evidence.alerts.events},
    closure:spatial?.closure||options.closure||{},
    gisIdentityConflict:spatial?.identityConflicts?.length>0 || options.gisIdentityConflict===true
  },now);
  if(evidence.alerts.status!=='verified') {
    if(decision.state==='candidate') {decision.state='verify';decision.score=null;decision.confidence='limited';}
    decision.verification.push('Active NWS alert feed unavailable; cannot clear weather hazards');
  }
  if(geometry.status!=='fetched'||!spatial||!Array.isArray(options.routeObjectIds) || !options.routeObjectIds.length) {
    if(decision.state==='candidate') {decision.state='verify';decision.score=null;decision.confidence='limited';}
    decision.verification.push('Official route geometry or selected segment list not independently verified');
  }
  if(spatial?.identityConflicts?.length>0)decision.verification.push('DNR trail identity mismatch needs manager reconciliation');
  const navigationReady=decision.state==='candidate'&&access.navigationReady===true &&
    geometry.status==='fetched'&&spatial?.routeStatus==='no-matched-closure-unverified' &&
    spatial?.identityConflicts?.length===0;
  return {
    destination:{id:destination.id,name:destination.name,refLat:destination.lat,refLon:destination.lon,
      geometry:'DNR point; not a validated winter trailhead'},
    tripDate,decision,weather:evidence,
    geometry:{status:geometry.status,reason:geometry.reason||null,spatial:spatial||null},
    access, navigation:navigationReady ? {
      ready:true,parking:access.winterParkingCoordinates,
      meaning:'Explicit manager-confirmed winter lot, not raw DNR point'
    } : {ready:false,reason:'Winter parking, road and selected route not fully verified. No GPS directions.'},
    publication:'research-only, not a verified live outing recommendation'
  };
}
module.exports={resolveAccess,evaluateTrip};
