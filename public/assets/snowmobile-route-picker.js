/*
 * Search only selectable junctions already returned by the official-DNR
 * snowmobile route API. No geocoding, inferred intersections or fabricated
 * waypoints. Shared by the browser and Node regression tests.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SnowmobileRoutePicker=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const valid=f=>f?.type==='Feature'
    &&f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)
    &&f.geometry.coordinates.length>=2
    &&Number.isFinite(f.geometry.coordinates[0])
    &&Number.isFinite(f.geometry.coordinates[1])
    &&typeof f.properties?.id==='string'
    &&Number.isInteger(f.properties?.component);
  const text=f=>String(f.properties.label||'Mapped trail junction');
  function findJunctions(features,query,component,limit=8){
    const needle=String(query||'').trim().toLocaleLowerCase();
    if(needle.length<2||!Array.isArray(features))return [];
    const count=Math.max(1,Math.min(12,Number.isFinite(limit)?Math.trunc(limit):8));
    return features
      .filter(f=>valid(f)&&(component===undefined||f.properties.component===component)
        &&(text(f).toLocaleLowerCase().includes(needle)||f.properties.id.toLocaleLowerCase()===needle))
      .sort((a,b)=>text(a).localeCompare(text(b))||a.properties.id.localeCompare(b.properties.id,'en',{numeric:true}))
      .slice(0,count);
  }
  function routeEvidence(route,{closureVerified=false,seasonActive=false}={}){
    if(!route?.routable)return null;
    const segments=Array.isArray(route.segments)?route.segments:[];
    const unverified=segments.filter(s=>!Number.isFinite(s?.score)).length;
    const closed=segments.filter(s=>s?.band==='CLOSED'||s?.legalState==='CLOSED').length;
    return Object.freeze({
      legs:Array.isArray(route.legs)?route.legs.length:1,
      unverifiedSegments:unverified,
      scoredSegments:segments.length-unverified,
      closureVerified:closureVerified===true,
      seasonActive:seasonActive===true,
      inconsistentClosedSegment:closed>0,
      // This is always distance planning, never an authorization to ride.
      travelVerdict:'DISTANCE PLANNING ONLY'
    });
  }
  return Object.freeze({findJunctions,routeEvidence});
});
