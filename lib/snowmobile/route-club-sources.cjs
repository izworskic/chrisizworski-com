/*
 * Route-specific club source crosswalk, grounded ONLY in the Michigan DNR
 * DNRTrailsOPENDATA FeatureServer/15 TrailGrooming field. Verified distinct
 * DNR groomer values on November 13, 2026. This is source discovery, not
 * recent grooming, trail condition, legal access or a route recommendation.
 *
 * A numeric ID AND the entire normalized DNR sponsor name must agree.
 * Unknown/reassigned/blank sponsors stay unmapped. Do not infer from a
 * county, neighboring trail, approximate name, or a club's report text.
 */
'use strict';
const BASE='https://misorva.org/trail-reports/';
const CATALOG=Object.freeze({
  1105:['North Country Snowmobile Club','North Country Snowmobile Club','north-country-snowmobile-club/'],
  1107:['Baraga County Convention And Visitors Bureau','Baraga County','baraga-county-convention-visitors-bureau/'],
  1149:['Keweenaw Trails Services Inc','Keweenaw Trails Services','keweenaw-trails-services-inc/'],
  1179:['Gogebic Area Grooming Inc','Gogebic Area Grooming','gogebic-area-grooming-inc/'],
  1306:['Big Bay 550 Snowmobile Club','Big Bay 550 Snowmobile Club','big-bay-550-snowmobile-club-2/'],
  1363:['Moose Country Snowmobile Club','Moose Country Snowmobile Club','moose-country-snowmobile-club/'],
  1635:['Paradise Area Night Riders','Paradise Area Night Riders','paradise-area-night-riders/'],
  1647:['Tahquamenon Snowmobile Association','Tahquamenon Snowmobile Association','tahquamenon-snowmobile-association/'],
  1714:['Sault Snowmobile Association','Sault Snowmobile Association','sault-snowmobile-association/'],
  2139:['Petoskey Snowmobile Club','Petoskey Snowmobile Club','petoskey-snowmobile-club/'],
  2141:['Jordan Valley Trails Council','Jordan Valley Trails Council','jordan-valley-trails-council/'],
  2152:['Gaylord Area Snow Trails Council','Gaylord Area Snowmobile Trails Council','gaylord-area-snowmobile-trials-council/'],
  2158:['Cheboygan Trail Blazers','Cheboygan Trail Blazers','cheboygan-trail-blazers/'],
  2256:['Presque Isle Snow Trails Club','Presque Isle Sno-Trails','presque-isle-sno-trails-club/'],
  2342:['Grand Traverse Area Snowmobile Club','Grand Traverse Area Snowmobile Club','grand-traverse-area-snowmobile-club/'],
  2360:['Benzie Manistee Snowmobile Club','Benzie-Manistee Snowmobile Club','im-bybenzie-manistee-snowmobile-club/'],
  2422:['Cadillac Winter Promotions','Cadillac Winter Promotions','cadillac-winter-promotions/'],
  2432:['Pere Marquette Snowmobile Club','Pere Marquette Snowmobile Club','pere-marquette-snowmobile-club/'],
  2570:['Greater Grayling Snowmobile Association','Greater Grayling Snowmobile Association','greater-grayling-snowmobile-assoc/']
});
function canonical(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function matchSponsor(value){
 const s=String(value||'').trim().replace(/\s+/g,' ');
 const m=s.match(/^(\d{3,5}) Snow (.+)$/i)||s.match(/^Snow (.+) (\d{3,5})$/i);
 if(!m)return null;
 const suffix=/^Snow /i.test(s),id=Number(suffix?m[2]:m[1]),name=suffix?m[1]:m[2];
 const match=CATALOG[id];
 if(!match||canonical(name)!==canonical(match[0]))return null;
 return {sponsorId:id,name:match[1],url:BASE+match[2],dnrSponsor:s};
}
function routeClubEvidence(route,geometry){
 if(route?.routable!==true)return null;
 const ids=[...new Set((Array.isArray(route.segmentIds)?route.segmentIds:[]).map(x=>String(x)).filter(Boolean))];
 if(!ids.length)return {method:'OFFICIAL_DNR_GROOMING_SPONSOR',totalDnrSegments:0,matchedSegments:0,unmappedSegments:0,sources:[],advisory:'No mapped trail segments supplied by the router.'};
 const byId=new Map();
 for(const f of Array.isArray(geometry?.features)?geometry.features:[]){
   const p=f?.properties||{},id=p.id==null?'':String(p.id);
   if(!id||!ids.includes(id))continue;
   const sponsor=String(p.groomingSponsor||'');
   if(!byId.has(id))byId.set(id,sponsor);
   else if(byId.get(id)!==sponsor)byId.set(id,''); // conflicting GIS sponsorship: do not choose one
 }
 const sources=new Map();
 let matched=0;
 for(const id of ids){
   const source=matchSponsor(byId.get(id));
   if(!source)continue;
   matched++;
   const existing=sources.get(source.sponsorId);
   if(existing){existing.matchedSegmentCount++;continue;}
   sources.set(source.sponsorId,{...source,matchedSegmentCount:1,scope:'Only those route segments explicitly attributed to this groomer by Michigan DNR'});
 }
 return {
   method:'OFFICIAL_DNR_GROOMING_SPONSOR',
   totalDnrSegments:ids.length,
   matchedSegments:matched,
   unmappedSegments:ids.length-matched,
   sources:[...sources.values()].sort((a,b)=>b.matchedSegmentCount-a.matchedSegmentCount||a.name.localeCompare(b.name)),
   advisory:'Official DNR grooming sponsor association only. A linked club page may be months old. This does not establish recent grooming, legal trail opening, the condition of other segments, or permission to ride.'
 };
}
module.exports={CATALOG,canonical,matchSponsor,routeClubEvidence};
