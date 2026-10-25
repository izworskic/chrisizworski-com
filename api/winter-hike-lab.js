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
const ALLOWED=new Set(['catalog','preview']);
function compactRoute(r) {
 return {id:r.id,title:r.displayName,group:r.placeGroup,region:r.region,
  routeForm:r.routeForm,miles:r.lengthMiles,mileageStatus:r.lengthEvidence,
  activities:r.supportedActivity,winterUse:r.winterUse,
  point:{lat:r.referencePoint.lat,lon:r.referencePoint.lon,
   meaning:'DNR reference area only, not a confirmed trailhead/parking location'},
  officialUrl:r.officialPage,mapUrl:r.officialMap,caveats:r.caveats,
  summary:r.editorialSummary,sourceDnrTrailId:r.sourceDnrTrailId,
  geometryStatus:r.sourceDnrTrailId?'direct DNR source ID, extent unverified':'no route-specific GIS match',
  parking:'unverified',navigationReady:false};
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
   routes:Routes.catalog.routes.map(compactRoute),quarantinedCount:Routes.catalog.quarantined.length},1200);
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
 let weather,geometry;
 try{
  [weather,geometry]=await Promise.all([
   Live.getTripEvidence(dest,date),
   route.sourceDnrTrailId
    ? GIS.lookup({id:route.sourceDnrTrailId,name:route.sourceDnrTrailName},{displayRoute:true})
        .catch(()=>({status:'unavailable',reason:'DNR geometry source unavailable'}))
    : Promise.resolve({status:'no-direct-route-match',reason:'Named route has no independently linked digital DNR trail geometry'})
  ]);
 }catch(e){
  const message=String(e?.message||'Weather request could not be validated');
  return status(res,/outside NWS hourly horizon|outing date|Invalid YYYY-MM-DD/.test(message)?400:503,
    {error:message.includes('Trip date')||message.includes('outing date')?'Date outside forecast horizon':'Official forecast service unavailable'});
 }
 const access=Access.resolveAccess(dest);
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
  officialSource:route.officialPage,
  navigation:{enabled:false,reason:'No winter plowed parking coordinates or verified complete route have been certified'}
 },300);
}
module.exports=handler;
module.exports.compactRoute=compactRoute;
