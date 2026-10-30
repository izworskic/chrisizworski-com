
(function(){
"use strict";
var bridges=[
{id:"brooklyn",name:"Brooklyn Bridge",types:"walk photo history skyline",lat:40.7061,lng:-73.9969},
{id:"manhattan",name:"Manhattan Bridge",types:"walk photo history skyline",lat:40.7075,lng:-73.9903},
{id:"williamsburg",name:"Williamsburg Bridge",types:"walk photo history",lat:40.7132,lng:-73.9719},
{id:"queensboro",name:"Ed Koch Queensboro Bridge",types:"walk photo engineering skyline",lat:40.7567,lng:-73.9541},
{id:"george-washington",name:"George Washington Bridge",types:"walk photo skyline engineering",lat:40.8517,lng:-73.9527},
{id:"high-bridge",name:"The High Bridge",types:"walk history engineering",lat:40.8423,lng:-73.9309}
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
function startMap(){
 var status=document.getElementById("map-status"),el=document.getElementById("bridge-map");
 if(!el||!window.L){if(status)status.prepend(document.createTextNode("Interactive map unavailable. Use the bridge list and map links. "));return}
 try{
 map=L.map(el,{scrollWheelZoom:false,attributionControl:true}).setView([40.773,-73.968],11);
 var tiles=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
 tiles.addTo(map);
 var errors=0,loaded=0;tiles.on("tileload",function(){loaded++});tiles.on("tileerror",function(){errors++;if(errors>=3&&loaded===0&&status){status.prepend(document.createTextNode("Map imagery could not load. Use the bridge links or open the full city map. "))}});
 bridges.forEach(function(b){var icon=L.divIcon({className:"",html:'<span class="bridge-marker" aria-hidden="true"></span>',iconSize:[24,24],iconAnchor:[12,12]});var mark=L.marker([b.lat,b.lng],{icon:icon,title:b.name}).addTo(map);var safeName=b.name.replaceAll("&","&amp;").replaceAll("<","&lt;");mark.bindPopup('<div class="map-popup"><strong>'+safeName+'</strong><br>Approximate bridge location, not a walkway entrance.<br><a href="#'+b.id+'">Explore this bridge →</a></div>');markers.push({marker:mark,record:b})});
 if(window.ResizeObserver){new ResizeObserver(function(){map.invalidateSize({pan:false})}).observe(el)}
 setTimeout(function(){map.invalidateSize({pan:false})},100);
 }catch(e){if(status)status.prepend(document.createTextNode("Interactive map unavailable. Use the bridge list and direct map links. "))}
}
startMap();
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
if(form){form.addEventListener("submit",function(e){e.preventDefault();calculate()});calculate()}
})();
