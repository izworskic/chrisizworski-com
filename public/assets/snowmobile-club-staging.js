/*
 * Keweenaw staging supplement — not a DNR GIS parking lot and not a live
 * inspection. Source: Keweenaw Snowmobile Club official FAQ, corroborated by
 * Visit Keweenaw's snowmobile-trailer parking information. Reviewed Nov 13,
 * 2026. Text-based addresses intentionally avoid false GPS lot entrances.
 *
 * Clubs and private landowners can change permissions or winter access.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SnowmobileClubStaging=api;
})(typeof window==='object'?window:null,function(){
'use strict';
const SOURCE='https://www.keweenawsnowmobileclub.com/faq/';
const SECONDARY='https://www.visitkeweenaw.com/plan/transportation/parking/';
const REVIEWED='2026-11-13';
const PLACES=Object.freeze([
  {id:'calumet',name:'Keweenaw Snowmobile Club Trailhead',address:'56953 Osceola Road, Calumet, MI 49913, USA',
   access:'The snowmobile club identifies this trailhead as directly on Trail 17 near the trestle.',
   parking:'Overnight parking permitted; limited block-heater power; restrooms available.',overnight:'YES',trail:'17'},
  {id:'eagle-harbor',name:'Eagle Harbor Cutoff Road Trailhead',address:'8527 Eagle Harbor Road, Eagle Harbor, MI 49950, USA',
   access:'Club-listed snowmobile staging location; exact legal trail entry must be checked at the site.',
   parking:'No overnight parking. Restrooms listed by club.',overnight:'NO',trail:null},
  {id:'houghton',name:'Ray Kestner Waterfront Park',address:'1100 W Lakeshore Drive, Houghton, MI 49931, USA',
   access:'Club-listed snowmobile parking along the regional trail system. Exact trail connection is not independently mapped here.',
   parking:'Restrooms listed by club; overnight permissions not established.',overnight:'UNKNOWN',trail:null},
  {id:'laurium',name:'George Gipp Ice Arena',address:'200 Isle Royale Street, Laurium, MI 49913, USA',
   access:'Club-listed trailer staging near the trailhead; do not cross private or restricted areas.',
   parking:'Park behind the rink on the east side, or north of the rink before the trailhead. Do not park in front of the chain-link fence. Overnight permission not established.',
   overnight:'UNKNOWN',trail:null},
  {id:'south-range',name:'South Range Baseball Fields',address:'44969 Baltic Avenue, South Range, MI 49963, USA',
   access:'Club-listed trailer staging, not permission to operate on the ball fields.',
   parking:'No overnight parking. Restrooms listed by club. Do not ride on the ball fields.',overnight:'NO',trail:null}
]);
function directionsUrl(place){
 const p=PLACES.find(x=>x.id===place?.id);
 if(!p)return null;
 return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p.address);
}
function safe(value){return String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function render(host){
 if(!host)return;
 host.innerHTML='<h3>Keweenaw club-listed trailer staging</h3><p class="small">These five locations are named by the Keweenaw Snowmobile Club. Directions use its published street addresses, not inferred GIS pins. Check the club before departure for changes to parking and trail access.</p><div class="club-staging-grid">'+
 PLACES.map(p=>'<article class="club-staging-card"><strong>'+safe(p.name)+'</strong><p class="club-staging-address">'+safe(p.address)+'</p>'+
 '<p>'+safe(p.access)+'</p><p class="club-staging-rules">'+safe(p.parking)+'</p>'+
 '<a href="'+safe(directionsUrl(p))+'" target="_blank" rel="noopener" data-club-staging="'+safe(p.id)+'">Driving directions to published address</a></article>').join('')+
 '</div><p class="small club-staging-source">Club information reviewed '+REVIEWED+'. Parking permission and trail conditions may change. <a href="'+SOURCE+'" target="_blank" rel="noopener">Keweenaw Snowmobile Club parking guidance</a> · <a href="'+SECONDARY+'" target="_blank" rel="noopener">Visit Keweenaw staging summary</a>. Club locations are not added to the route graph.</p>';
}
return Object.freeze({SOURCE,SECONDARY,REVIEWED,PLACES,directionsUrl,render});
});
