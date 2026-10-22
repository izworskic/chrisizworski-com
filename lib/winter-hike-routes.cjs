'use strict';
/**
 * Curated static route identities for Michigan winter walking/snowshoe planning.
 * Sources establish NAMED ROUTES, not present-day snow/ice, parking, or access.
 * An official reference point is NEVER a routable entrance/verified trailhead.
 */
const catalog=require('../data/winter-hike/michigan-curated-routes.json');
const DNR=require('../data/winter-hike/michigan-dnr-candidates.json');
const ACCESS=require('../data/winter-hike/michigan-route-access-research.json');
const accessByGroup=new Map(ACCESS.records.map(r=>[r.group,r]));
const ROUTES=Object.freeze(catalog.routes);
const trailIndex=new Map(DNR.records.map(r=>[r.ID,r]));
const FORM=new Set(['loop','stacked_loop','network','trail','named_trail','winter_corridor']);
const MODES=new Set(['hike','snowshoe']);
const uri=url=>{try{const u=new URL(url);return u.protocol==='https:' &&
  !u.username&&!u.password &&
  (u.hostname==='michigan.gov'||u.hostname.endsWith('.michigan.gov'))}catch{return false}};
const close=(a,b)=>Math.abs(a-b)<0.000001;
function validateRoute(r){
 const errors=[];
 if(!r||typeof r!=='object')return ['Route is not an object'];
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id||''))errors.push('invalid route id');
 if(!r.displayName||typeof r.displayName!=='string')errors.push('missing name');
 if(!FORM.has(r.routeForm))errors.push('invalid route form');
 if(!Array.isArray(r.supportedActivity)||!r.supportedActivity.length ||
   r.supportedActivity.some(x=>!MODES.has(x)) ||
   new Set(r.supportedActivity).size!==r.supportedActivity.length)
   errors.push('bad activity list');
 if(r.lengthMiles===null){
  if(r.lengthEvidence!=='not_verified')errors.push('unknown mileage cannot carry length evidence');
 }else if(!Number.isFinite(r.lengthMiles)||r.lengthMiles<=0||r.lengthMiles>35||
   !['official_named_route','approximate_official','historical_official'].includes(r.lengthEvidence))
   errors.push('unsupported route distance');
 if(!uri(r.officialPage)||!uri(r.routeEvidenceUrl))errors.push('missing official source');
 if(r.officialMap!==null&&!uri(r.officialMap))errors.push('unverified map URL');
 const ref=r.referencePoint;
 if(!Number.isFinite(ref?.lat)||!Number.isFinite(ref?.lon)||ref.lat<41||
   ref.lat>49||ref.lon< -91||ref.lon> -82||
   !/not/i.test(ref?.meaning||''))errors.push('untrusted reference point');
 if(r.sourceDnrTrailId!==null){
  const matched=trailIndex.get(r.sourceDnrTrailId);
  if(!matched || matched.Title!==r.sourceDnrTrailName)errors.push('DNR identity mismatch');
  if(matched && (!close(matched.Latitude,ref?.lat)||!close(matched.Longitude,ref?.lon)))
    errors.push('DNR coordinates not reused without change');
 }
 if(r.navigationReady!==false||r.verifiedDriveTarget!==null ||
    r.verifiedWinterParking!==null||r.verifiedTrailhead!==null)
   errors.push('unverified navigation was enabled');
 if(r.currentWinterAccess!=='unverified')errors.push('a static catalog cannot assert active winter trail access');
 if(!Array.isArray(r.caveats)||!Array.isArray(r.needs))errors.push('missing caveats or verification list');
 return errors;
}
function auditCatalog(c=catalog){
 const errors=[],seen=new Set();
 if(!c||c.schema!=='winter-route-catalog-v1')errors.push('unknown schema');
 for(const r of c.routes||[]){
  if(seen.has(r.id))errors.push('duplicate route '+r.id);seen.add(r.id);
  for(const message of validateRoute(r))errors.push(r.id+': '+message);
 }
 const excluded=new Set();
 for(const q of c.quarantined||[]){
  if(!q.id||excluded.has(q.id)||seen.has(q.id))errors.push('quarantine collision');
  excluded.add(q.id);
  if(!uri(q.source)||typeof q.reason!=='string'||q.reason.length<35)
    errors.push('quarantine source/reason missing for '+q.id);
 }
 if(!Array.isArray(c.routes)||c.routes.length<30)errors.push('insufficient route coverage');
 for(const route of c.routes||[]){
  const item=accessByGroup.get(route.placeGroup);
  if(!item||item.navigationReady!==false||item.currentWinterParkingConfirmed!==false||
    item.currentAccessRoadConfirmed!==false||item.currentTrailOpenConfirmed!==false||
    item.verifiedWinterParkingCoordinates!==null||!uri(item.officialSource))
    errors.push(route.id+': unverified group winter access contract missing');
 }
 return {ok:errors.length===0,errors,count:c.routes?.length||0,
  measured:c.routes?.filter(r=>r.lengthMiles!==null).length||0,
  unknown:c.routes?.filter(r=>r.lengthMiles===null).length||0,
  groups:new Set(c.routes?.map(r=>r.placeGroup)).size};
}
function listRoutes({activity='either',region='all',placeGroup=null,onlyMeasured=false}={}){
 if(!['either','hike','snowshoe'].includes(activity))throw Error('Invalid activity');
 if(!['all','upper-peninsula','northern-lower','southern-lower'].includes(region))throw Error('Invalid region');
 return ROUTES.filter(r=>(activity==='either'||r.supportedActivity.includes(activity)) &&
   (region==='all'||r.region===region) &&
   (!placeGroup||r.placeGroup===placeGroup) &&
   (!onlyMeasured||r.lengthMiles!==null))
   .map(r=>({
    id:r.id,title:r.displayName,region:r.region,routeForm:r.routeForm,
    miles:r.lengthMiles,mileageStatus:r.lengthEvidence,allowedActivities:r.supportedActivity,
    winterUse:r.winterUse,officialPage:r.officialPage,
    map:r.officialMap,referencePoint:r.referencePoint,
    accessStatus:'requires-current-check',routeGeometryStatus:'not-verified',
    accessResearch:accessByGroup.has(r.placeGroup)?{
      restriction:accessByGroup.get(r.placeGroup).restriction,
      nextVerification:accessByGroup.get(r.placeGroup).requiredManagerCheck,
      source:accessByGroup.get(r.placeGroup).officialSource,
      winterParkingConfirmed:false,roadConfirmed:false
    }:null,
    navigationReady:false,parking:null,notes:r.caveats
   }));
}
function routeById(id){return ROUTES.find(r=>r.id===id)||null}
function routeToResearchDestination(id) {
 const r=routeById(id);
 if(!r)return null;
 return {id:r.sourceDnrTrailId||'curated:'+r.id,
   routeId:r.id,name:r.displayName,
   lat:r.referencePoint.lat,lon:r.referencePoint.lon,
   activities:{hike:r.supportedActivity.includes('hike'),snowshoe:r.supportedActivity.includes('snowshoe')},
   groomedXC:r.winterUse==='shared_ski_snowshoe',
   sourceDnrTrailId:r.sourceDnrTrailId,
   dnrIdNotRouteGeometry: true,
   winterParking:'unverified',winterAccess:'unverified',
   routeMiles:r.lengthMiles,routeLengthEvidence:r.lengthEvidence,
   navigationReady:false,routeGeometryObjectIds:null};
}
module.exports={catalog,validateRoute,auditCatalog,listRoutes,routeById,routeToResearchDestination};
