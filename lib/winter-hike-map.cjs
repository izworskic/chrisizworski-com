'use strict';
/**
 * DNR GIS display overlay. NOT a complete track, winter route, parking,
 * closed-trail substitute or geometry-derived mileage.
 * Only matching source ID and exact trail name are displayed.
 */
const G=require('./winter-hike-spatial.cjs');
const MAX_LINES=45,MAX_POINTS=5000;
function toLines(destination, gisRows) {
 if(!destination?.sourceDnrTrailId) return {
  status:'no-direct-dnr-geometry-id',features:[],note:'A manager winter-map loop is documented, but no digital route shape was independently matched.'};
 if(!gisRows || !Array.isArray(gisRows.hiking) || !Array.isArray(gisRows.snowshoe) || !Array.isArray(gisRows.closure))
  return {status:'source-unavailable',features:[],note:'DNR line layers unavailable. No route shape is inferred.'};
 const dest={id:destination.sourceDnrTrailId,name:destination.sourceDnrTrailName};
 const sets=[['hiking',gisRows.hiking],['snowshoe',gisRows.snowshoe],['closure',gisRows.closure]];
 const byID=new Map();
 let bad=0;
 for(const [kind,group] of sets){
  for(const f of group){
   if(!G.identityMatch(dest,f))continue;
   const paths=G.lines(f);
   const id=f.attributes?.OBJECTID;
   if(!Number.isInteger(id) || !paths.length){bad++;continue}
   for(const coordinates of paths){
    if(coordinates.length<2)continue;
    const key=id+':'+coordinates[0][0]+':'+coordinates[0][1]+':'+coordinates.length;
    const existing=byID.get(key);
    const closed=kind==='closure' && G.closedRecord(f);
    if(existing){if(closed)existing.properties.kind='closed-segment';continue}
    byID.set(key,{type:'Feature',properties:{
      sourceObjectId:id,kind:closed?'closed-segment':'unverified-trail-line',
      meaning:closed?'DNR mapped closure segment, not a full park closure':'DNR GIS line; not a verified complete named walking circuit',
      sourceLayer:kind
    },geometry:{type:'LineString',coordinates}});
   }
  }
 }
 const features=[...byID.values()];
 const count=features.reduce((n,x)=>n+x.geometry.coordinates.length,0);
 if(features.length>MAX_LINES||count>MAX_POINTS)
  return {status:'geometry-too-large',features:[],note:'DNR GIS route geometry exceeded the bounded display limit; map omits unsafe partial truncation.'};
 return {status:features.length?'partial-source-lines':'no-matched-geometry',
  features,note:'Official DNR line fragments matching this exact trail identity; NOT a complete verified route, trailhead or permitted winter circuit.',
  source:'Michigan DNR Trails OPENDATA',invalidFeatures:bad,
  count:features.length,vertices:count};
}
module.exports={toLines};
