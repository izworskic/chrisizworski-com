/* Visitor map link contract.
 * Google Maps location searches identify a place or feature, not a safe route.
 * Directions require separately verified arrival evidence.
 * Keep restricted facilities and live vessel positions out of visitor routing.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.VisitorMapLinks=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const PLACE_ROLES=new Set(['public-place','regional-reference','natural-feature','parking-reference']);
const validCoord=(lat,lng)=>typeof lat==='number'&&typeof lng==='number'&&
  Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&
  (Math.abs(lat)>0.001||Math.abs(lng)>0.001);
function placeSearch({role,query}={}){
  if(!PLACE_ROLES.has(role)||typeof query!=='string')return null;
  const value=query.trim();
  if(!value||value.length>180||/[\r\n\x00-\x1f]/.test(value))return null;
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(value);
}
function featureSearch({role,lat,lng}={}){
  if(!PLACE_ROLES.has(role)||!validCoord(lat,lng))return null;
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
}
function verifiedDirections({role,lat,lng,sourceUrl}={}){
  if(role!=='verified-visitor-entrance'||!validCoord(lat,lng))return null;
  if(typeof sourceUrl!=='string'||!/^https:\/\/[^\s/]+\//.test(sourceUrl))return null;
  return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(lat+','+lng)+'&travelmode=driving';
}
return Object.freeze({placeSearch,featureSearch,verifiedDirections});
});
