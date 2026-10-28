/* Source-corroborated DNR parking atlas. A pin is not a guarantee that the lot is open.
 * No auto-routing, live occupancy, road opening, walking-ETA or crossing inference.
 */
(function (root) {
 "use strict";
 var PARK="/porcupine-mountains/access-points.json";
 var GEO="https://www.michigan.gov/recsearch/parks/porkies";
 var SOURCE="https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf";
 var markerById={}, siteById={}, map=null, focusSelected=false, planIds=[];
 function nameFor(stop) {
   var s=(stop && stop.name || "").toLowerCase();
   if(s.includes("winter sports")) return "ski";
   if(s.includes("lake of the clouds")) return "lake";
   if(s.includes("presque isle")) return "presque";
   if(s.includes("summit peak")) return "summit";
   if(s.includes("union bay") || s.includes("visitor center")) return "visitor";
   return null; // backcountry unresolved trailheads MUST NOT be mapped to a random parking lot
 }
 function season(date) {
   var match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||"");
   if(!match) return "unknown";
   var year=+match[1],month=+match[2],day=+match[3];
   var d=new Date(Date.UTC(year,month-1,day));
   if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day)return "unknown";
   if(month===12||month<=4)return "winter";
   if(month===5)return "spring";
   if(month===11)return "november";
   return "normal";
 }
 function eligibility(point,date,arrival) {
   var s=season(date), road=point.roadRule;
   arrival = ["west","east","inpark"].includes(arrival) ? arrival : "inpark";
   if(s==="unknown")return {canDirect:false,notice:"Choose a valid travel date before opening directions."};
   if(road==="west"){
     var limited = s==="winter" || s==="spring";
     return {canDirect:!limited||arrival==="west",notice:limited
       ? (arrival==="west"?"DNR identifies the west-side County Road 519 approach to Presque Isle during the park's main road closures. Individual parking operations are NOT verified.":"County Road 519 is a western approach: no verified open east-to-west driving route. Change 'Approaching from' to Western U.P. only if that is your actual approach, and confirm official road conditions.")
       : "Follow the County Road 519 scenic-area approach; choose signed public day-use parking on arrival."};
   }
   if(road==="ski"){
     var allowed = s==="normal" || (s==="winter" && arrival==="east");
     return {canDirect:allowed,notice:s==="winter"
       ? (arrival==="east"?"East-side approach to winter sports complex. Verify operations, snow report and parking; not proof of open access.":"No verified west-to-east through-park winter vehicle route. Switch to the eastern approach only if that reflects your travel.")
       : s==="normal"?"East-side trail-network lot; verify the relevant activity and signed parking.":"No verified active season or operating lot: map reference only."};
   }
   if(road==="seasonal")return {canDirect:s==="normal",notice:s==="normal"?"DNR source-matched lot. Confirm road openings and signed parking before traveling.":"M-107/South Boundary seasonal restrictions or uncertain reopening: directions withheld, map view only."};
   return {canDirect:s==="normal",notice:s==="normal"?"DNR mapped asset close to named trail reference; on-site access and hours must be confirmed.":"Visitor center or lot operating status not established on this date: map view only."};
 }
 function urlFor(point,driving) {
   var xy=point.lat.toFixed(6)+","+point.lon.toFixed(6);
   if(driving)return "https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(xy)+"&travelmode=driving";
   return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(xy);
 }
 function elt(tag,cls,content){
   var e=root.document.createElement(tag);
   if(cls)e.className=cls;
   if(content!==undefined)e.textContent=content;
   return e;
 }
 function renderCard(point) {
   var node=root.document.querySelector('[data-parking-id="'+point.id+'"]');
   if(!node)return;
   var date=root.document.getElementById("travel-date")?.value||"";
   var state=eligibility(point,date,root.document.getElementById("arrival")?.value);
   var actions=node.querySelector(".access-actions");
   if(actions) {
     actions.replaceChildren();
     if(map && markerById[point.id]){
       var locate=elt("button","parking-locate","Show on park map");
       locate.type="button";
       locate.addEventListener("click",function(){
         var marker=markerById[point.id];
         map.setView([point.lat,point.lon],13,{animate:false});
         marker.openPopup();
         root.document.getElementById("parking-map")?.scrollIntoView({behavior:"auto",block:"center"});
       });
       actions.appendChild(locate);
     }
     var mapLink=elt("a","parking-maplink","View DNR mapped point");
     mapLink.href=urlFor(point,false);mapLink.target="_blank";mapLink.rel="noopener noreferrer";actions.appendChild(mapLink);
     if(state.canDirect){
       var drive=elt("a","parking-drive","Driving directions to mapped lot");
       drive.href=urlFor(point,true);drive.target="_blank";drive.rel="noopener noreferrer";
       actions.appendChild(drive);
     }else{
       actions.appendChild(elt("span","parking-withheld","Driving directions withheld for this season"));
     }
     var official=elt("a","parking-official","Official DNR trail information");
     official.href=point.pageUrl;official.target="_blank";official.rel="noopener noreferrer";actions.appendChild(official);
   }
   var caveat=node.querySelector(".access-date-note");
   if(caveat)caveat.textContent=state.notice;
   node.classList.toggle("selected-plan",planIds.includes(point.id));
   node.hidden=focusSelected && planIds.length>0 && !planIds.includes(point.id);
 }
 function updateFilter(){
   Object.values(siteById).forEach(renderCard);
   var status=root.document.getElementById("parking-status");
   if(status)status.textContent=focusSelected&&planIds.length ? "Showing "+planIds.length+" DNR mapped access points relevant to your preliminary plan. Other areas remain on the full map." : "Showing all six DNR source-corroborated parking areas. Pins are not road or trail status.";
   var selected=root.document.getElementById("parking-focus");
   if(selected)selected.setAttribute("aria-pressed",focusSelected?"true":"false");
   if(map) {
     Object.entries(markerById).forEach(function ([id,marker]){
       var strong=planIds.includes(id);
       marker.setStyle({radius:strong?10:7,weight:strong?3:1.5,fillOpacity:strong?.95:.6,color:strong?"#d89551":"#173e36",fillColor:strong?"#d89551":"#276452"});
     });
     if(focusSelected&&planIds.length){
       var bounds=planIds.map(id=>markerById[id]?.getLatLng()).filter(Boolean);
       if(bounds.length)map.fitBounds(root.L.latLngBounds(bounds).pad(.3),{maxZoom:12});
     }
   }
 }
 function onPlan(result) {
   planIds=Array.from(new Set((result?.stops||[]).map(nameFor).filter(id=>id && siteById[id])));
   if(planIds.length===0)focusSelected=false;
   updateFilter();
 }
 function initMap(points) {
   var frame=root.document.getElementById("parking-map");
   if(!frame || !root.L){
     var warning=root.document.getElementById("parking-map-message");
     if(warning)warning.textContent="Map tiles unavailable. All named DNR parking locations and official map links remain below.";
     return;
   }
   map=root.L.map(frame,{scrollWheelZoom:false,zoomControl:true});
   root.PorkiesAtlas={map:map};
   root.dispatchEvent(new Event('porkies:map-ready'));

   var fallback=root.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',crossOrigin:true});
   fallback.addTo(map);
   var active=fallback;
   for (var point of points){
     var marker=root.L.circleMarker([point.lat,point.lon],{radius:7,color:"#173e36",weight:1.5,fillColor:"#276452",fillOpacity:.6}).addTo(map);
     marker.bindPopup("<strong>"+point.title.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</strong><p>DNR mapped parking asset #"+point.parkingAssetId+". Not proof of open parking or trail access.</p><p><a href='"+urlFor(point,false)+"' target='_blank' rel='noopener noreferrer'>View mapped point</a></p>");
     markerById[point.id]=marker;
     marker.on("click",function(id){return function(){root.document.querySelector('[data-parking-id="'+id+'"]')?.scrollIntoView({behavior:"smooth",block:"nearest"});};}(point.id));
   }
   map.fitBounds(root.L.latLngBounds(points.map(p=>[p.lat,p.lon])).pad(.12),{maxZoom:11});
   var message=root.document.getElementById("parking-map-message");
   if(message)message.textContent="Six DNR parking-asset markers. Select a marker or a card; the map does not show road or trail routes.";
   root.setTimeout(()=>map.invalidateSize(),250);
   if(root.ResizeObserver){new root.ResizeObserver(()=>map.invalidateSize()).observe(frame);}
   // Use the existing site-owner publishable CARTO configuration. Never write keys into source.
   root.fetch("/api/carto-basemap-config",{credentials:"same-origin",signal:AbortSignal.timeout(6500)}).then(r=>r.ok?r.json():null).then(config=>{
     if(config?.provider!=="CARTO"||typeof config.key!=="string"||!config.key.trim())return;
     var url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key="+encodeURIComponent(config.key.trim());
     var layer=root.L.tileLayer(url,{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',crossOrigin:true});
     var loaded=0,errors=0;
     layer.on("tileload",()=>{loaded++;if(loaded>=3&&active!==layer){active=layer;map.removeLayer(fallback);}});
     layer.on("tileerror",()=>{errors++;if(errors>=2&&active!==fallback){active=fallback;if(!map.hasLayer(fallback))fallback.addTo(map);map.removeLayer(layer);}});
     layer.addTo(map);
   }).catch(()=>{}); // OSM fallback remains usable if CARTO config or tiles fail.
 }
 async function main(){
   var list=root.document.getElementById("parking-list");if(!list)return;
   try{
     var r=await root.fetch(PARK,{credentials:"same-origin"});
     if(!r.ok)throw Error("DNR crosswalk data unavailable "+r.status);
     var body=await r.json();
     if(!Array.isArray(body.points)||body.points.length!==6||body.points.some(x=>x.status!=="dnr-mapped-crosschecked-not-current"))throw Error("Invalid parking source data");
     body.points.forEach(p=>{siteById[p.id]=p;});
     initMap(body.points);
     var planner=root.document.getElementById("planner");
     if(planner){
       planner.addEventListener("submit",()=>root.setTimeout(()=>{var eng=root.PorkiesEngine?.recommend;if(typeof eng==="function"){onPlan(eng({date:root.document.getElementById("travel-date").value,arrival:root.document.getElementById("arrival").value,hours:+root.document.getElementById("hours").value,ability:root.document.getElementById("ability").value,interest:root.document.getElementById("interest").value}));}},0));
     }
     var focus=root.document.getElementById("parking-focus");
     if(focus)focus.addEventListener("click",function(){focusSelected=!focusSelected;updateFilter();});
     var all=root.document.getElementById("parking-all");
     if(all)all.addEventListener("click",function(){focusSelected=false;updateFilter();if(map)map.fitBounds(root.L.latLngBounds(body.points.map(p=>[p.lat,p.lon])).pad(.12));});
     // Selected itinerary state must be coherent even when JS modules load at different times.
     var eng=root.PorkiesEngine?.recommend;
     if(typeof eng==="function"){
       onPlan(eng({date:root.document.getElementById("travel-date").value,arrival:root.document.getElementById("arrival").value,hours:+root.document.getElementById("hours").value,ability:root.document.getElementById("ability").value,interest:root.document.getElementById("interest").value}));
     }else updateFilter();
   }catch(e){
     var status=root.document.getElementById("parking-status");
     if(status)status.textContent="Live crosswalk file could not be loaded; use the static DNR-labeled cards and official map below.";
     var msg=root.document.getElementById("parking-map-message");
     if(msg)msg.textContent="Map unavailable. Official DNR sources and static parking descriptions remain accessible.";
   }
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={season,eligibility,urlFor,nameFor};
 if(root.document)main();
})(typeof window!=="undefined"?window:globalThis);
