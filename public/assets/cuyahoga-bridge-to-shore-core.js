/* Cuyahoga bridge-to-public-shore handoff: pure geographic comparisons.
 * NOAA points and mapped park areas are approximate, not travel routes or sightlines. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CuyahogaBridgeToShore=api;
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function miles(a,b){
  if(!a||!b||![a.lat,a.lon,b.lat,b.lon].every(finite))return null;
  if(Math.abs(a.lat)>90||Math.abs(b.lat)>90||Math.abs(a.lon)>180||Math.abs(b.lon)>180)return null;
  const k=Math.PI/180;
  const dLat=(b.lat-a.lat)*k,dLon=(b.lon-a.lon)*k;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin(dLon/2)**2;
  return 3958.7613*2*Math.asin(Math.min(1,Math.sqrt(h)));
 }
 function candidates(bridge,parks){
  if(!bridge||!Array.isArray(parks)||bridge.channel!=='main'||!finite(bridge.latitude)||!finite(bridge.longitude))return [];
  const reference={lat:bridge.latitude,lon:bridge.longitude};
  return parks.filter(p=>p?.visitStatus==='PUBLIC_PARK_ACCESS_VERIFY_CURRENT_CLOSURES'&&
    p?.officialUrl?.startsWith('https://www.clevelandmetroparks.com/')&&p?.coordinateNote)
   .map(p=>({park:p,distanceMiles:miles(reference,p)}))
   .filter(x=>x.distanceMiles!==null)
   .sort((a,b)=>a.distanceMiles-b.distanceMiles||a.park.id.localeCompare(b.park.id));
 }
 function handoff(bridge,parks){
  const ranked=candidates(bridge,parks);
  if(!ranked.length)return {state:'NO_VERIFIED_PUBLIC_REFERENCE',closest:null};
  return {state:'APPROXIMATE_GEOGRAPHIC_CONTEXT_ONLY',closest:ranked[0],alternatives:ranked.slice(1),
    note:'Straight-line distance joins a rounded NOAA bridge landmark to an approximate Metroparks park-area point. It is not a visible ship viewpoint, legal approach, walking route, parking entrance, ship arrival or bridge opening.'};
 }
 return Object.freeze({miles,candidates,handoff});
});