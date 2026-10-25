'use strict';
/**
 * Winter road/parking source-of-truth layer for the noindex hiking lab.
 * Published park maps, an address and retrieval timestamps are NOT operational
 * observations of a plowed 2026–27 lot. No client can supply observation rows.
 */
const routes=require('./winter-hike-routes.cjs');
const registry=require('../data/winter-hike/winter-parking-checkpoints.json');
const operational=require('../data/winter-hike/winter-access-operational-observations.json');
const official=require('./winter-hike-access.cjs').official;
const KINDS=['trail','road','parking'];
const STATES=['open','closed','restricted'];
const MAX_AGE=72*3600000;
const index=new Map();
for(const site of registry.checkpoints)for(const id of site.routeIds)index.set(id,site);
const parse=x=>typeof x==='string'&&x.trim()?Date.parse(x):NaN;
const isoDay=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'));
const seasonOf=day=>{
 const year=Number(day?.slice(0,4)),month=Number(day?.slice(5,7));
 return month>=10?String(year)+'-'+String(year+1).slice(-2):month<=5?String(year-1)+'-'+String(year).slice(-2):null;
};
const publicSource=(url,manager)=>{
 if(!official(url))return false;
 const u=new URL(url);
 const host=u.hostname.toLowerCase();
 return manager==='nps'?['nps.gov','www.nps.gov'].includes(host):
   ['michigan.gov','www.michigan.gov'].includes(host);
};
function audit(){
 const failures=[],seen=new Set(),assigned=new Set(),catalog=new Set(routes.catalog.routes.map(x=>x.id));
 if(registry.schema!=='winter-parking-checkpoints-v1'||registry.checkpoints.length!==10)
  failures.push('invalid checkpoint schema/count');
 for(const site of registry.checkpoints){
  if(seen.has(site.id))failures.push('duplicate checkpoint '+site.id);seen.add(site.id);
  if(!Array.isArray(site.routeIds)||!site.routeIds.length)failures.push('empty checkpoint '+site.id);
  const manager=site.group==='sleepbear'?'nps':'dnr';
  if(!publicSource(site.source,manager))failures.push('unofficial source '+site.id);
  if(site.secondarySource&&!publicSource(site.secondarySource,manager))failures.push('unofficial secondary '+site.id);
  if(site.observationalMeaning!=='STATIC_MANAGER_DESCRIPTION_NOT_2026_27_OPERATIONAL_REPORT'||
   site.trailStatus!=='unknown'||site.roadStatus!=='unknown'||site.winterParkingStatus!=='unknown'||
   site.winterParkingVerified!==false||site.parkingEntranceCoordinates!==null||
   site.drivingDirectionsEnabled!==false)failures.push('static research elevated to current access '+site.id);
  for(const id of site.routeIds){
   if(!catalog.has(id))failures.push('unknown route '+id);
   if(assigned.has(id))failures.push('duplicate route assignment '+id);
   assigned.add(id);
   if(routes.routeById(id)?.placeGroup!==site.group)failures.push('wrong group '+id);
  }
 }
 return {ok:failures.length===0,failures,checkpoints:seen.size,assignedRoutes:assigned.size};
}
/**
 * Operational rows are editorial-only review artifacts (not crowdsourced). An
 * assertion needs actual manager-observed time AND target-date validity. The
 * date when our script visited a static page cannot substitute for either.
 */
function validateObservation(row,site,routeId,tripDay,now=Date.now()){
 if(!site||!row||row.routeId!==routeId||row.checkpointId!==site.id||
    !KINDS.includes(row.kind)||!STATES.includes(row.status)||
    row.winterSpecific!==true||row.sourceType!=='dated-manager-operational'||
    !publicSource(row.sourceUrl,site.group==='sleepbear'?'nps':'dnr'))return false;
 if(!isoDay(tripDay)||seasonOf(tripDay)!==registry.season||row.season!==registry.season)return false;
 if(!isoDay(row.effectiveFrom)||!isoDay(row.effectiveThrough)||
   row.effectiveFrom>tripDay||row.effectiveThrough<tripDay||
   Date.parse(row.effectiveThrough+'T12:00:00Z')-Date.parse(row.effectiveFrom+'T12:00:00Z')>7*86400000)return false;
 const observed=parse(row.managerObservedAt);
 if(!Number.isFinite(observed)||observed>now||now-observed>MAX_AGE)return false;
 if(row.kind==='parking'&&row.status==='open'&&row.plowedConfirmed!==true)return false;
 if(row.kind==='road'&&row.status==='open'&&row.roadMaintenanceConfirmed!==true)return false;
 if(row.kind==='trail'&&row.status==='open'&&row.namedRouteConfirmed!==true)return false;
 if(row.kind==='parking'&&row.status==='open' &&
   (row.parkingEntranceConfirmed!==true||row.waypoint?.kind!=='winter-parking-lot'||
     !Number.isFinite(row.waypoint?.lat)||!Number.isFinite(row.waypoint?.lon)||
     row.waypoint.lat<41||row.waypoint.lat>49||row.waypoint.lon< -91||row.waypoint.lon> -82))
   return false;
 return true;
}
function assess(routeId,{observations=operational.observations,tripDay=null,now=Date.now()}={}){
 const site=index.get(routeId);
 if(!site)return {tracked:false,status:'verification-needed',trail:'unknown',road:'unknown',parking:'unknown',
   navigationReady:false,warning:'No specific winter vehicle-access verification checkpoint is available'};
 const day=tripDay||(new Date(now)).toISOString().slice(0,10);
 const selected={},sources={},warnings=[];
 for(const kind of KINDS){
  const rows=(Array.isArray(observations)?observations:[]).filter(r=>
   r?.kind===kind&&validateObservation(r,site,routeId,day,now));
  const statuses=new Set(rows.map(r=>r.status));
  if(statuses.size>1){
   // A dated closure must not be overridden by another unresolved open report.
   // A later reopening needs an explicit reviewed supersession, not a timestamp alone.
   selected[kind]=statuses.has('closed')?'closed':'conflict';
   warnings.push('Conflicting dated manager '+kind+' reports; closure or restriction takes priority until reconciled');
  }else if(rows.length){
   const newest=rows.sort((a,b)=>parse(b.managerObservedAt)-parse(a.managerObservedAt))[0];
   selected[kind]=newest.status;
   sources[kind]={sourceUrl:newest.sourceUrl,managerObservedAt:newest.managerObservedAt,
    effectiveThrough:newest.effectiveThrough,verifiedKind:kind};
   if(kind==='parking'&&newest.status==='open')sources.parkingWaypoint={...newest.waypoint};
  }else selected[kind]='unknown';
 }
 const blocked=KINDS.some(k=>selected[k]==='closed');
 const conflict=KINDS.some(k=>selected[k]==='conflict');
 const ready=KINDS.every(k=>selected[k]==='open')&&!conflict;
 const status=blocked?'access-closed':conflict?'contradictory-access':
  ready?'manager-access-evidence-complete':'verification-needed';
 return {tracked:true,checkpointId:site.id,title:site.title,source:site.source,
   sourceReviewedAt:site.sourceReviewedAt,staticEvidence:site.sourceMeaning,
   parkingHint:site.parkingHint,parkingType:site.parkingType,roadHint:site.roadHint,
   restriction:site.restriction,managerQuestion:site.question,
   trail:selected.trail,road:selected.road,parking:selected.parking,status,
   evidence:sources,warning:warnings.join(' ')||'Road and lot conditions require fresh, winter-specific manager confirmation',
   managerAccessConfirmed:ready,
   // Separate route-line closure and weather gates are *not* satisfied by these records.
   navigationReady:false,drivingDirectionsUrl:null,parkingWaypoint:null};
}
function list({tripDay=null,now=Date.now()}={}){
 return registry.checkpoints.map(site=>({
  id:site.id,title:site.title,source:site.source,group:site.group,
  routeCount:site.routeIds.length,status:assess(site.routeIds[0],{tripDay,now}).status,
  parkingHint:site.parkingHint,roadHint:site.roadHint}));
}
module.exports={registry,operational,audit,seasonOf,validateObservation,assess,list};
