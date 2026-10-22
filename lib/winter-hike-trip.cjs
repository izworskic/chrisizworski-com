'use strict';
/**
 * Research-only join of live environmental evidence and static manager evidence.
 * A venue with a park description is not an inspected/plowed winter trailhead.
 * This module deliberately cannot confer managerConfirmed:true from static pages.
 */
const E=require('./winter-hike-decision.cjs');
const Live=require('./winter-hike-live.cjs');
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
  const evidence=await Live.getTripEvidence(destination,tripDate,options);
  const access=resolveAccess(destination,options.managerRecords);
  const decision=E.interpret(destination,{
    activity:options.activity||'either',access,
    snow:evidence.snow,forecast:{...evidence.forecast,alerts:evidence.alerts.events},
    closure:options.closure||{},gisIdentityConflict:options.gisIdentityConflict===true
  },now);
  // Do not interpret missing alert feed as 'no warnings'. A public service must
  // additionally check closure geometry and dated winter road/parking reports.
  if(evidence.alerts.status!=='verified') {
    if(decision.state==='candidate') {decision.state='verify';decision.score=null;decision.confidence='limited';}
    decision.verification.push('Active NWS alert feed unavailable; cannot clear weather hazards');
  }
  const missing=['winter parking','winter access road','actual trailhead geometry','manager-confirmed route status'];
  return {
    destination:{id:destination.id,name:destination.name,refLat:destination.lat,refLon:destination.lon,
      geometry:'DNR point, not validated winter trailhead'},
    tripDate,decision,weather:evidence,
    access:{...access,missingVerification:missing},
    navigation:{ready:false,reason:'No verified winter parking coordinates. Do not route to the DNR reference point.'},
    publication:'research-only, not a verified live outing recommendation'
  };
}
module.exports={resolveAccess,evaluateTrip};
