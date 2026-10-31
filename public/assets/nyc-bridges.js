(function(){
"use strict";
var bridges=[
{id:"brooklyn",num:1,year:1883,name:"Brooklyn Bridge",types:"walk photo history skyline",lat:40.7061,lng:-73.9969,route:"Lower Manhattan ↔ DUMBO / Brooklyn Heights",walkway:"Elevated wooden boardwalk (pedestrians only since 2021)",approach:"Manhattan: City Hall Park · Brooklyn: Tillary & Adams St"},
{id:"manhattan",num:2,year:1909,name:"Manhattan Bridge",types:"walk photo history skyline",lat:40.7075,lng:-73.9903,route:"Chinatown ↔ DUMBO",walkway:"South walkway for pedestrians; North path for bicycles",approach:"Manhattan: Bowery & Canal St · Brooklyn: Jay & Sands St"},
{id:"williamsburg",num:3,year:1903,name:"Williamsburg Bridge",types:"walk photo history",lat:40.7132,lng:-73.9719,route:"Lower East Side ↔ Williamsburg",walkway:"Separated south pedestrian walkway / north bikeway",approach:"Manhattan: Delancey & Clinton · Brooklyn: Roebling & S 4th St"},
{id:"queensboro",num:4,year:1909,name:"Ed Koch Queensboro Bridge",types:"walk photo engineering skyline",lat:40.7567,lng:-73.9541,route:"Midtown East ↔ Long Island City",walkway:"South Outer Roadway (dedicated pedestrian promenade)",approach:"Manhattan: E 60th St & 2nd Ave · Queens: Queens Plaza North"},
{id:"george-washington",num:5,year:1931,name:"George Washington Bridge",types:"walk photo skyline engineering",lat:40.8517,lng:-73.9527,route:"Washington Heights ↔ Fort Lee, NJ",walkway:"Renovated South Walk with Hudson viewing balconies",approach:"Manhattan: W 178th & Cabrini · Fort Lee: Hudson Terrace"},
{id:"high-bridge",num:6,year:1848,name:"The High Bridge",types:"walk history engineering",lat:40.8423,lng:-73.9309,route:"Washington Heights ↔ Highbridge, Bronx",walkway:"Car-free brick promenade 140 ft above Harlem River",approach:"Manhattan: W 172nd & Amsterdam · Bronx: W 170th & University"}
];
var map=null,markers=[],active="all";

function filterBridges(next){
 active=next;
 document.querySelectorAll(".filter").forEach(function(b){var on=b.dataset.filter===next;b.setAttribute("aria-pressed",String(on));b.classList.toggle("active",on)});
 var count=0;
 document.querySelectorAll(".bridge-entry").forEach(function(c){var on=next==="all"||c.dataset.types.split(" ").includes(next);c.hidden=!on;if(on)count++});
 document.querySelectorAll("[data-list-id]").forEach(function(c){c.hidden=next!=="all"&&!c.dataset.types.split(" ").includes(next)});
 markers.forEach(function(pair){var on=next==="all"||pair.record.types.split(" ").includes(next);if(!map)return;if(on&&!map.hasLayer(pair.marker))pair.marker.addTo(map);if(!on&&map.hasLayer(pair.marker))map.removeLayer(pair.marker)});
 var status=document.getElementById("filter-status");if(status)status.textContent="Showing "+count+" bridges for "+next+".";
 document.getElementById("empty-filter").hidden=count>0;
}
document.querySelectorAll(".filter").forEach(function(b){b.addEventListener("click",function(){filterBridges(b.dataset.filter)})});

function focusBridge(id){
 var pair=markers.find(function(m){return m.record.id===id});
 if(!pair||!map)return;
 if(active!=="all"&&!pair.record.types.split(" ").includes(active)){
  filterBridges("all");
 }
 map.setView([pair.record.lat,pair.record.lng],14,{animate:true});
 pair.marker.openPopup();
 document.querySelectorAll(".bridge-marker").forEach(function(m){m.classList.remove("active")});
 var el=pair.marker.getElement();
 if(el){
  var inner=el.querySelector(".bridge-marker");
  if(inner)inner.classList.add("active");
 }
}

function startMap(){
 var status=document.getElementById("map-status"),el=document.getElementById("bridge-map");
 if(!el)return;
 if(map)return;
 if(!window.L){
  if(document.readyState!=="complete"){
   window.addEventListener("load",startMap,{once:true});
  }else{
   setTimeout(startMap,150);
  }
  return;
 }
 try{
 map=L.map(el,{scrollWheelZoom:false,attributionControl:true}).setView([40.773,-73.968],11);
 
 var cartoKey="cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88";
 var cartoUri="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key="+encodeURIComponent(cartoKey);
 var carto=L.tileLayer(cartoUri,{subdomains:"abcd",maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; CARTO'});
 var osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
 
 var cartoLoaded=0,cartoErrors=0;
 carto.on("tileload",function(){cartoLoaded++;el.dataset.tiles="carto"});
 carto.on("tileerror",function(){
  cartoErrors++;
  if(cartoErrors>=3&&cartoLoaded===0){
   if(map.hasLayer(carto))map.removeLayer(carto);
   osm.addTo(map);
   el.dataset.tiles="osm-fallback";
  }
 });
 carto.addTo(map);
 el.dataset.tiles="carto";

 fetch("/api/carto-basemap-config",{credentials:"same-origin"}).then(function(res){return res.ok?res.json():null}).then(function(conf){
  if(!conf||conf.provider!=="CARTO"||typeof conf.key!=="string"||!conf.key.trim())return;
  var freshKey=conf.key.trim();
  if(freshKey===cartoKey)return;
  var freshUri="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key="+encodeURIComponent(freshKey);
  var freshLayer=L.tileLayer(freshUri,{subdomains:"abcd",maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; CARTO'});
  freshLayer.on("tileload",function(){
   if(map.hasLayer(carto))map.removeLayer(carto);
   carto=freshLayer;
   el.dataset.tiles="carto";
  });
  freshLayer.addTo(map);
 }).catch(function(){});

 bridges.forEach(function(b){
  var icon=L.divIcon({className:"bridge-pin-wrap",html:'<span class="bridge-marker" aria-hidden="true"><span class="pin-num">'+b.num+'</span></span>',iconSize:[28,28],iconAnchor:[14,14]});
  var mark=L.marker([b.lat,b.lng],{icon:icon,title:b.name}).addTo(map);
  var safeName=b.name.replaceAll("&","&amp;").replaceAll("<","&lt;");
  var popupHtml='<div class="map-popup">' +
    '<div class="popup-badge">0'+b.num+' · '+b.year+'</div>' +
    '<h4 class="popup-title">'+safeName+'</h4>' +
    '<p class="popup-route">'+b.route+'</p>' +
    '<div class="popup-detail"><span class="popup-label">Walkway:</span> '+b.walkway+'</div>' +
    '<div class="popup-access"><span class="popup-label">Approach:</span> '+b.approach+'</div>' +
    '<a class="popup-link" href="#'+b.id+'">Explore this bridge in guide ↓</a>' +
  '</div>';
  mark.bindPopup(popupHtml,{maxWidth:280,minWidth:220});
  mark.on("click",function(){
   document.querySelectorAll(".bridge-marker").forEach(function(m){m.classList.remove("active")});
   var mel=mark.getElement();
   if(mel){
    var minn=mel.querySelector(".bridge-marker");
    if(minn)minn.classList.add("active");
   }
  });
  markers.push({marker:mark,record:b});
 });

 if(window.ResizeObserver){new ResizeObserver(function(){map.invalidateSize({pan:false})}).observe(el)}
 if(window.IntersectionObserver){
  new IntersectionObserver(function(entries){
   entries.forEach(function(entry){
    if(entry.isIntersecting&&map){map.invalidateSize({pan:false})}
   });
  }).observe(el);
 }
 window.addEventListener("load",function(){if(map)map.invalidateSize({pan:false})},{once:true});
 setTimeout(function(){if(map)map.invalidateSize({pan:false})},100);

 function checkHash(){
  var hash=(window.location.hash||"").replace("#","");
  if(!hash)return;
  var pair=markers.find(function(m){return m.record.id===hash});
  if(pair){
   focusBridge(hash);
  }
 }
 window.addEventListener("hashchange",checkHash);
 setTimeout(checkHash,400);

 }catch(e){if(status)status.prepend(document.createTextNode("Interactive map unavailable. Use the bridge list and direct map links. "))}
}

if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",startMap);
}else{
 startMap();
}

document.addEventListener("click",function(e){
 var btn=e.target.closest("[data-focus]");
 if(!btn)return;
 var id=btn.dataset.focus;
 if(!id)return;
 e.preventDefault();
 focusBridge(id);
 var mapEl=document.getElementById("bridge-map");
 if(mapEl && btn.classList.contains("btn-focus-map")){
  mapEl.scrollIntoView({behavior:"smooth",block:"center"});
 }
});

var routes={
classic:{title:"The classic river walk",description:"Walk the Brooklyn Bridge, then discover the two great suspension bridges from the DUMBO waterfront. The streets and waterfront may be busy; allow time to linger.",steps:["Brooklyn Bridge pedestrian promenade","Brooklyn Bridge Park / Empire Fulton Ferry lawn","Washington Street view of Manhattan Bridge"],link:"https://www.google.com/maps/search/?api=1&query=Brooklyn+Bridge+Park"},
river:{title:"Architecture and the East River",description:"Explore the Queensboro Bridge's cantilever geometry, then see it from the waterfront in Long Island City. The view, rather than a fixed route time, is the point of this outing.",steps:["Queensboro Bridge pedestrian path, current DOT guidance","Long Island City waterfront near the bridge","Optional Roosevelt Island perspective, subject to access and transit"],link:"https://www.google.com/maps/search/?api=1&query=Queensboro+Bridge+Long+Island+City+waterfront"},
uptown:{title:"Two centuries of uptown crossings",description:"Pair the old Croton water story of the High Bridge with the vast Hudson River scale of the George Washington Bridge. These are separate destinations: plan transit between them.",steps:["High Bridge and water tower terrace","Check transport toward the George Washington Bridge","George Washington Bridge South Walk and viewing platforms"],link:"https://www.google.com/maps/search/?api=1&query=High+Bridge+New+York"}
};
function renderRoute(id){
 var d=routes[id];if(!d)return;
 document.querySelectorAll("[data-day]").forEach(function(btn){var isOn=btn.dataset.day===id;btn.classList.toggle("selected",isOn);btn.setAttribute("aria-pressed",String(isOn))});
 var panel=document.getElementById("day-panel");panel.replaceChildren();
 var title=document.createElement("h3");title.textContent=d.title;panel.append(title);
 var p=document.createElement("p");p.textContent=d.description;panel.append(p);
 var ol=document.createElement("ol");d.steps.forEach(function(step){var li=document.createElement("li");li.textContent=step;ol.append(li)});panel.append(ol);
 var a=document.createElement("a");a.href=d.link;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Open a planning map ↗";panel.append(a)
}
document.querySelectorAll("[data-day]").forEach(function(btn){btn.addEventListener("click",function(){renderRoute(btn.dataset.day)})});
var dt=document.getElementById("light-date"),form=document.getElementById("light-form"),result=document.getElementById("light-results");
if(dt){
 var localDate=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 if(/^\d{4}-\d{2}-\d{2}$/.test(localDate))dt.value=localDate;
 else dt.value=new Date().toISOString().slice(0,10)
}
function solarEvent(base,zenith,afterNoon){
 var year=base.getUTCFullYear(), start=Date.UTC(year,0,0), day=(base.getTime()-start)/86400000;
 var gamma=2*Math.PI/365*(day-1);
 var eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 var dec=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 var lat=40.7128*Math.PI/180, lng=-74.0060;
 var cosH=(Math.cos(zenith*Math.PI/180)-Math.sin(lat)*Math.sin(dec))/(Math.cos(lat)*Math.cos(dec));
 if(cosH<-1||cosH>1)return null;
 var ha=Math.acos(cosH)*180/Math.PI;
 var noon=720-4*lng-eq;
 return new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate())+(noon+(afterNoon?4*ha:-4*ha))*60000)
}
function fmt(t){return t?new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit"}).format(t):"—"}
function calculate(){
 if(!dt||!dt.value||!result)return;
 var base=new Date(dt.value+"T12:00:00Z");
 if(Number.isNaN(base.getTime())){result.textContent="Please choose a valid date.";return}
 var rise=solarEvent(base,90.833,false),morningEnd=solarEvent(base,84,false),eveningBegin=solarEvent(base,84,true),set=solarEvent(base,90.833,true);
 if(!rise||!morningEnd||!eveningBegin||!set){result.textContent="Solar times unavailable for this date.";return}
 result.replaceChildren();
 var grid=document.createElement("div");grid.className="sun-grid";
 [["Sunrise",fmt(rise)],["Morning low-angle light",fmt(rise)+"–"+fmt(morningEnd)],["Evening low-angle light",fmt(eveningBegin)+"–"+fmt(set)],["Sunset",fmt(set)]].forEach(function(row){var cell=document.createElement("div"),label=document.createElement("span"),value=document.createElement("strong");label.textContent=row[0];value.textContent=row[1];cell.append(label,value);grid.append(cell)});
 result.append(grid);
 var note=document.createElement("p");note.style.fontSize=".74rem";note.style.marginTop="12px";note.textContent="Approximate NYC local time (ET). Low-angle windows are defined here as the sun between the horizon and 6° elevation, not guaranteed 'golden hour' for any specific viewpoint.";result.append(note)
}
if(form)form.addEventListener("submit",function(e){e.preventDefault();calculate()});
calculate();
})();
