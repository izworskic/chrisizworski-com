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
 function eligibility(point,date,arrival,vehicle) {
   var s=season(date), road=point.roadRule;
   if(s==="unknown")return {canDirect:false,notice:"Choose a valid visit date before driving directions are considered."};
   vehicle=vehicle||"car";
   if(!["car","rv","trailer"].includes(vehicle))return {canDirect:false,notice:"Vehicle type is not recognized. Consult the official DNR map before driving."};
   // The park's 2025 visitor guide explicitly directs campers and trailers away
   // from the upper Lake of the Clouds and Summit Peak parking areas. We have not
   // verified a navigation coordinate for either lower staging area.
   if(vehicle==="rv"||vehicle==="trailer"){
     if(point.id==="lake")return {canDirect:false,notice:"DNR recommends campers and trailers use the middle ski-hill parking area on busy summer and fall days, not this upper overlook lot. The correct staging-lot coordinates are not verified here; ask the park before driving."};
     if(point.id==="summit")return {canDirect:false,notice:"DNR recommends trailers and campers stop at the designated lower lot near the South Boundary Road turnoff, not this upper approach. Its exact navigation location is not verified here."};
     return {canDirect:false,notice:"This mapped point has not been verified for RV or trailer turning, parking or a safe approach. Consult the park office and official map before taking a large vehicle to this lot."};
   }
   // Wakefield Township's 2026-09-22 public notice closes the CR519/M-28
   // junction for water-main work and names Johnson Road as a detour. We have
   // not verified a reopening, legal detour turn sequence, or last-mile lot
   // entrance. Fail closed for trips after the notice, across all seasons;
   // changing a visit date must never silently enable unsafe Google routing.
   if(road==="west" && date>="2026-09-22"){
     return {canDirect:false,notice:"Wakefield Township published a September 22, 2026 closure notice for County Road 519 at M-28 and identifies Johnson Road as the detour. No reopening or complete driving route has been verified here. View this DNR map location only, read the township notice, and confirm signed roads before traveling."};
   }
   // No origin-to-parking road sequence has been audited end-to-end. In the
   // shoulder and closure seasons, a Google Maps destination alone could
   // inadvertently send the traveler across a restricted park corridor.
   if(s!=="normal"){
     if(road==="west"){
       return {canDirect:false,notice:"The DNR describes the western County Road 519 approach from the Wakefield side, including during seasonal interior-road closures. Only the approach is documented, not an end-to-end car route. View the lot on a map, confirm current road notices, and do not let navigation send you across the closed park roads."};
     }
     if(road==="ski"){
       return {canDirect:false,notice:"In winter the ski area is approached from the eastern side, but the online map cannot verify your actual start point, route, plowing or complex operations. Check the DNR ski report and access notices before driving."};
     }
     return {canDirect:false,notice:"The M-107 and South Boundary scenic-road gates may be closed, not yet reopened or affected by early snow. Driving directions are withheld pending current official confirmation."};
   }
   if(road==="west" && arrival==="east"){
     return {canDirect:false,notice:"This destination is on the far western County Road 519 approach. A cross-park drive has not been verified; check official park-road notices and approach from the western side if appropriate."};
   }
   if(road==="seasonal")return {canDirect:true,notice:"June–October is the usual scenic-road season, not proof the gate is open. Check DNR notices and posted conditions; navigation to a DNR parking coordinate is not a verified road or trail route."};
   if(road==="ski")return {canDirect:true,notice:"This is a DNR parking asset near the eastern trail network. Confirm the road, designated parking and activity status before travel."};
   if(road==="west")return {canDirect:true,notice:"Approach the river country on signed County Road 519 from the western side. Check road and lot conditions; this is not a guaranteed start for every waterfall path."};
   return {canDirect:true,notice:"Mapped parking asset near a named DNR nature trail. Check the visitor center hours and designated day-use parking before driving."};
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
   var state=eligibility(point,date,root.document.getElementById("arrival")?.value,root.document.getElementById("vehicle")?.value);
   var actions=node.querySelector(".access-actions");
   if(actions) {
     actions.replaceChildren();
     if(map && markerById[point.id]){
       var locate=elt("button","parking-locate","Find on the park map");
       locate.type="button";
       locate.addEventListener("click",function(){
         var marker=markerById[point.id];
         map.setView([point.lat,point.lon],13,{animate:false});
         marker.openPopup();
         root.document.getElementById("parking-map")?.scrollIntoView({behavior:"auto",block:"center"});
       });
       actions.appendChild(locate);
     }
     var mapLink=elt("a","parking-maplink","See this DNR map location");
     mapLink.href=urlFor(point,false);mapLink.target="_blank";mapLink.rel="noopener noreferrer";actions.appendChild(mapLink);
     if(state.canDirect){
       var drive=elt("a","parking-drive","Directions to mapped parking area");
       drive.href=urlFor(point,true);drive.target="_blank";drive.rel="noopener noreferrer";
       actions.appendChild(drive);
     }else{
       actions.appendChild(elt("span","parking-withheld","Check seasonal access before driving"));
     }
     var official=elt("a","parking-official","Official park trail details");
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
   if(status)status.textContent=focusSelected&&planIds.length ? "Showing "+planIds.length+" DNR mapped access points relevant to your preliminary plan. Other areas remain on the full map." : "Explore six DNR-mapped places where a visit might begin. A pin never confirms that its parking or trail is open.";
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
     if(warning)warning.textContent="The interactive map is unavailable, but the six mapped parking areas and official park links are still listed below.";
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
     marker.bindPopup("<strong>"+point.title.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</strong><p>Michigan DNR mapped parking point #"+point.parkingAssetId+". Check road, parking and trail conditions before leaving.</p><p><a href='"+urlFor(point,false)+"' target='_blank' rel='noopener noreferrer'>View mapped point</a></p>");
     markerById[point.id]=marker;
     marker.on("click",function(id){return function(){root.document.querySelector('[data-parking-id="'+id+'"]')?.scrollIntoView({behavior:"smooth",block:"nearest"});};}(point.id));
   }
   map.fitBounds(root.L.latLngBounds(points.map(p=>[p.lat,p.lon])).pad(.12),{maxZoom:11});
   var message=root.document.getElementById("parking-map-message");
   if(message)message.textContent="Six possible places to begin exploring. Select a marker to learn about the area; road and trail lines are shown separately when available.";
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
     ["travel-date","arrival","vehicle"].forEach(function(id){
       var control=root.document.getElementById(id);
       if(control){control.addEventListener("change",updateFilter);if(id==="travel-date")control.addEventListener("input",updateFilter);}
     });
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
     if(status)status.textContent="The mapped access records could not be refreshed. The park descriptions and official DNR map are still available below.";
     var msg=root.document.getElementById("parking-map-message");
     if(msg)msg.textContent="The map is unavailable right now. Use the signed parking details and official DNR links below.";
   }
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={season,eligibility,urlFor,nameFor};
 if(root.document)main();
})(typeof window!=="undefined"?window:globalThis);
