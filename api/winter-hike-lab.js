'use strict';
/**
 * Winter hiking/snowshoe LAB, not a production-ready route recommender.
 * Read-only; all upstream coordinates, IDs and source URLs are server-curated.
 * An arbitrary query cannot turn on parking directions or create manager checks.
 */
const Routes=require('../lib/winter-hike-routes.cjs');
const Live=require('../lib/winter-hike-live.cjs');
const GIS=require('../lib/winter-hike-arcgis.cjs');
const Eval=require('../lib/winter-hike-decision.cjs');
const Access=require('../lib/winter-hike-trip.cjs');
const Parking=require('../lib/winter-hike-parking.cjs');
const NpsAlerts=require('../lib/winter-hike-nps-alerts.cjs');
const History=require('../lib/winter-hike-history.cjs');
const Season=require('../lib/winter-hike-season.cjs');
const ALLOWED=new Set(['catalog','access','preview','history','season']);
function compactRoute(r) {
 return {id:r.id,title:r.displayName,group:r.placeGroup,region:r.region,
  routeForm:r.routeForm,miles:r.lengthMiles,mileageStatus:r.lengthEvidence,
  activities:r.supportedActivity,winterUse:r.winterUse,
  point:{lat:r.referencePoint.lat,lon:r.referencePoint.lon,
   meaning:'Regional map or forecast reference, not a confirmed trailhead or winter parking location. '+r.referencePoint.meaning},
  officialUrl:r.officialPage,mapUrl:r.officialMap,caveats:r.caveats,
  summary:r.editorialSummary,sourceDnrTrailId:r.sourceDnrTrailId,
  geometryStatus:r.sourceDnrTrailId?'direct DNR source ID, extent unverified':'no route-specific GIS match',
  parking:'unverified',navigationReady:false,winterAccess:Parking.assess(r.id)};
}
function status(res,code,body,maxAge=0){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Cache-Control',maxAge?'public, s-maxage='+maxAge+', stale-while-revalidate=300':'no-store');
 return res.status(code).json(body);
}
async function handler(req,res) {
 if(req.method!=='GET') {
  res.setHeader('Allow','GET');
  return status(res,405,{error:'GET only'});
 }
 const mode=String(req.query?.mode||'catalog');
 if(!ALLOWED.has(mode))return status(res,400,{error:'Invalid mode'});
 if(mode==='catalog'){
  return status(res,200,{status:'research-only',compiledAt:Routes.catalog.compiledAt,
   warning:'Destination points are NOT winter parking. Named routes do not imply open roads, plowed lots, packed trails or safe travel.',
   routes:Routes.catalog.routes.map(compactRoute),quarantinedCount:Routes.catalog.quarantined.length,
   accessCoverage:Parking.coverage()},1200);
 }
 if(mode==='access'){
  const id=String(req.query?.route||'');
  const route=Routes.routeById(id);
  if(!route)return status(res,400,{error:'Choose an inventoried route to check official access notices'});
  const nps=await NpsAlerts.forRouteLive(id).catch(()=>({
   status:'unavailable',checkedAt:null,sourceUrl:null,closures:[],advisories:[],
   meaning:'Official NPS alert check unavailable; do not infer the road or lot is open'
  }));
  const staticAccess=Parking.assess(id);
  const closure=Array.isArray(nps.blockedKinds)&&nps.blockedKinds.length>0;
  return status(res,200,{
   status:'research-only',routeId:id,checkedAt:nps.checkedAt,
   parkAlerts:nps,parkingVerification:staticAccess,
   accessVerdict:closure?'OFFICIAL_CLOSURE':'PARKING_NOT_CONFIRMED',
   meaning:closure?'Current official NPS closure requires following the park\'s restrictions.':
    'No confirmed current winter lot, road, or route clearance. An empty official alert feed is not approval.'
  },180);
 }
 if(mode==='season'){
  const id=String(req.query?.route||'');
  if(!Routes.routeById(id))
   return status(res,400,{error:'Choose a named catalog route for four completed winter seasons'});
  try {
   const record=await Season.fullSeasonForRoute(id);
   if(record.status==='source-unavailable')
    return status(res,503,{error:'NOAA station discovery unavailable; historical snow is unknown, not zero'});
   // Station measurements from completed winters do not need daily refresh.
   return status(res,200,{status:'full-season-station-history-not-trip-clearance',...record},86400);
  }catch{
   return status(res,503,{error:'NOAA full-winter station history unavailable; no snow-depth values estimated'});
  }
 }
 if(mode==='history'){
  const id=String(req.query?.route||'');
  const anchor=String(req.query?.anchor||'02-15');
  if(!Routes.routeById(id)||!History.ANCHORS.has(anchor))
   return status(res,400,{error:'Choose a curated route and one of Jan 15, Feb 15 or Mar 15'});
  try {
   const record=await History.historyForRoute(id,anchor);
   if(record.discoveryStatus==='source-unavailable')
    return status(res,503,{error:'NOAA station discovery unavailable; historical snow is unknown, not zero'});
   // Public historical station measurements are slow-changing; cache this
   // bounded result for a day. Requests are explicit per selected route.
   return status(res,200,{status:'historical-station-context-not-trip-clearance',...record},86400);
  }catch{
   return status(res,503,{error:'NOAA historical station context unavailable. No values estimated.'});
  }
 }
 const id=String(req.query?.route||'');
 const activity=String(req.query?.activity||'either');
 const date=String(req.query?.date||'');
 const route=Routes.routeById(id);
 if(!route||!['snowshoe','hike','either'].includes(activity)||!Live.validDate(date))
  return status(res,400,{error:'Choose an inventoried route, valid activity and YYYY-MM-DD date'});
 if(activity!=='either'&&!route.supportedActivity.includes(activity))
  return status(res,400,{error:'Selected activity is not documented for this route'});
 const dest=Routes.routeToResearchDestination(id);
 let weather,geometry,officialAlerts;
 try{
  [weather,geometry,officialAlerts]=await Promise.all([
   Live.getTripEvidence(dest,date),
   route.sourceDnrTrailId
    ? GIS.lookup({id:route.sourceDnrTrailId,name:route.sourceDnrTrailName},{displayRoute:true})
        .catch(()=>({status:'unavailable',reason:'DNR geometry source unavailable'}))
    : Promise.resolve({status:'no-direct-route-match',reason:'Named route has no independently linked digital DNR trail geometry'}),
   NpsAlerts.forRouteLive(id).catch(()=>({status:'unavailable',closures:[],advisories:[],blockedKinds:[],checkedAt:null,meaning:'Official NPS alert check unavailable'}))
  ]);
 }catch(e){
  const message=String(e?.message||'Weather request could not be validated');
  return status(res,/outside NWS hourly horizon|outing date|Invalid YYYY-MM-DD/.test(message)?400:503,
    {error:message.includes('Trip date')||message.includes('outing date')?'Date outside forecast horizon':'Official forecast service unavailable'});
 }
 const access=Access.resolveAccess(dest);
 const parkingAccess=Parking.assess(route.id,{tripDay:date});
 // A source-backed CURRENT NPS closure can only close the applicable road
 // or trail. Absence of an NPS alert cannot open parking or upgrade a verdict.
 if(officialAlerts?.status==='official-closure'){
  for(const kind of officialAlerts.blockedKinds||[])if(kind==='road'||kind==='trail')access[kind]='closed';
 }
 // Explicit, dated manager closures constrain the weather decision; unknown
 // parking is never promoted to open from a static park page.
 for(const k of ['trail','road','parking']){
  if(['open','closed','restricted'].includes(parkingAccess[k]))access[k]=parkingAccess[k];
 }
 const gis=geometry?.spatial||null;
 const decision=Eval.interpret(dest,{
  activity,access,snow:weather.snow,
  forecast:{...weather.forecast,alerts:weather.alerts.events},
  closure:gis?.closure||{},gisIdentityConflict:(gis?.identityConflicts?.length||0)>0
 });
 if(weather.alerts.status!=='verified')decision.verification.push('Current weather alert feed unavailable');
 if(geometry.status!=='fetched' || gis?.routeStatus==='partial-closure-route-unknown' ||
    gis?.identityConflicts?.length)decision.verification.push('Route geometry and/or identity not independently verified');
 // Never publish provisional score or green-light from model analysis alone.
 if(decision.state==='candidate'){decision.state='verify';decision.score=null;decision.confidence='limited'}
 return status(res,200,{
  status:'research-only',
  selected:compactRoute(route),tripDate:date,activityRequested:activity,
  outcome:{state:decision.state,mode:decision.activity,
   reasons:decision.reasons,verification:decision.verification,
   blockers:decision.blockers,confidence:'research-screening-not-trip-clearance'},
  sourceWeather:{snow:weather.snow,forecast:weather.forecast,
   alerts:weather.alerts,newSnowfall:weather.newSnowfall,
   provenance:weather.provenance,checkedAt:weather.generatedAt},
  sourceGeometry:{status:geometry.status,counts:geometry.counts||null,
   closure:gis?.closure||null,routeStatus:gis?.routeStatus||'not-verified',
   identityConflicts:gis?.identityConflicts||[],
   overlay:geometry.geometryOverlay||{status:'unavailable',features:[]},
   meaning:'DNR source geometry fragments are not an independently verified complete walking itinerary'},
  access:{trail:access.trail,parking:access.parking,road:access.road,
   navigationReady:false,verifiedWinterParking:null},
  parkingVerification:parkingAccess,officialAlerts,
  officialSource:route.officialPage,
  navigation:{enabled:false,reason:'No winter plowed parking coordinates or verified complete route have been certified'}
 },300);
}
module.exports=handler;
module.exports.compactRoute=compactRoute;
