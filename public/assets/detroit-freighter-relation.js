(()=>{"use strict";
if(document.body.dataset.detroitIntent!=="freighter")return;

const RIVERFRONT={lat:42.3314,lng:-83.0458,label:"Detroit Riverfront reference"};
const MAX_AIS_AGE_MS=10*60*1000;
const REFRESH_MS=5*60*1000;
let map=null,layer=null,userLocation=null,lastLoadAt=0,loading=false,currentVessel=null;

function esc(value){return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function rad(value){return value*Math.PI/180;}
function miles(a,b){
 const R=3958.8,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
 const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
 return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function ageMinutes(iso){const t=Date.parse(iso||"");return Number.isFinite(t)?Math.max(0,(Date.now()-t)/60000):null;}
function candidateName(candidate){return String(candidate&&candidate.specialist&&candidate.specialist.headline||"").split("·")[0].trim();}
function freshCandidate(candidate){
 const age=ageMinutes(candidate&&candidate.timeWindow&&candidate.timeWindow.start);
 return Boolean(candidate&&age!==null&&age<=10);
}
function freshMovingVessel(vessel){
 const lat=finite(vessel&&vessel.lat),lng=finite(vessel&&vessel.lon),speed=finite(vessel&&vessel.speedKnots),type=finite(vessel&&vessel.shipType),age=ageMinutes(vessel&&vessel.seen);
 return lat!==null&&lng!==null&&speed!==null&&speed>0.5&&type!==null&&type>=70&&type<=89&&age!==null&&age<=10;
}
function vesselPoint(v){return{lat:Number(v.lat),lng:Number(v.lon)};}

function injectStyles(){
 if(document.getElementById("detroit-freighter-relation-style"))return;
 const style=document.createElement("style");
 style.id="detroit-freighter-relation-style";
 style.textContent=`
 .freighter-relation{margin:0 0 28px;border:1px solid var(--line,#d8d8d0);border-radius:7px;background:#fff;overflow:hidden}
 .freighter-relation[hidden]{display:none}
 .freighter-relation-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;padding:22px 24px;border-bottom:1px solid #e8e8e1}
 .freighter-relation h2{font-size:27px;line-height:1.15;font-weight:400;margin:4px 0 7px}
 .freighter-relation-copy{max-width:760px;font-size:14px;line-height:1.55;color:#4f5a55;margin:0}
 .freighter-location-button{appearance:none;border:1px solid #b9c3bd;background:#f7f8f6;border-radius:5px;padding:10px 13px;font:700 12px/1.2 Arial,sans-serif;color:#24342d;cursor:pointer;white-space:nowrap}
 .freighter-location-button:hover{background:#edf1ee}
 .freighter-location-button:disabled{opacity:.55;cursor:default}
 .freighter-map-wrap{position:relative}
 .freighter-relation-map{height:370px;background:#e8ece8}
 .freighter-map-status{padding:13px 18px;border-top:1px solid #e8e8e1;font:12px/1.45 Arial,sans-serif;color:#59645f;background:#fafbf9}
 .freighter-map-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #e8e8e1}
 .freighter-map-stat{padding:14px 16px;border-right:1px solid #e8e8e1;min-width:0}
 .freighter-map-stat:last-child{border-right:0}
 .freighter-map-stat span{display:block;font:800 9px/1.2 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b7670;margin-bottom:4px}
 .freighter-map-stat strong{display:block;font-size:15px;line-height:1.25;font-weight:600;color:#23332c;overflow-wrap:anywhere}
 .freighter-map-privacy{padding:0 24px 18px;margin:0;font:11px/1.45 Arial,sans-serif;color:#707a75}
 @media(max-width:720px){.freighter-relation-head{grid-template-columns:1fr;align-items:start;padding:18px}.freighter-location-button{width:100%}.freighter-relation-map{height:320px}.freighter-map-stats{grid-template-columns:1fr 1fr}.freighter-map-stat:nth-child(2){border-right:0}.freighter-map-stat:nth-child(-n+2){border-bottom:1px solid #e8e8e1}.freighter-map-privacy{padding:0 18px 16px}}
 `;
 document.head.append(style);
}
function ensureShell(){
 let shell=document.getElementById("freighter-relation");
 if(shell)return shell;
 injectStyles();
 shell=document.createElement("section");
 shell.id="freighter-relation";
 shell.className="freighter-relation";
 shell.hidden=true;
 shell.setAttribute("aria-labelledby","freighter-relation-title");
 shell.innerHTML=`
  <div class="freighter-relation-head">
   <div><div class="eyebrow">Live position</div><h2 id="freighter-relation-title">Where is the ship relative to you?</h2><p class="freighter-relation-copy">Plot the current AIS position against the Detroit Riverfront reference point. Add your location only if you want the map to show your position relative to the river and ship.</p></div>
   <button class="freighter-location-button" id="freighter-use-location" type="button">Use my location</button>
  </div>
  <div class="freighter-map-wrap" id="freighter-map-wrap" hidden><div class="freighter-relation-map" id="freighter-relation-map" role="img" aria-label="Map showing the current freighter position, Detroit Riverfront reference point, and optional user location"></div></div>
  <div class="freighter-map-stats" id="freighter-map-stats" hidden></div>
  <div class="freighter-map-status" id="freighter-map-status">Checking the current AIS position…</div>
  <p class="freighter-map-privacy">Your coordinates are not sent to the Detroit Outdoors API, JEV or Haiku. Distances shown here are straight-line map distances, not driving distance or a visibility guarantee.</p>`;
 const live=document.querySelector(".intent-live");
 if(live)live.insertAdjacentElement("afterend",shell);else document.querySelector("main")?.prepend(shell);
 shell.querySelector("#freighter-use-location")?.addEventListener("click",useLocation);
 return shell;
}
function setStatus(message){const el=document.getElementById("freighter-map-status");if(el)el.textContent=message;}
function setStats(vessel){
 const el=document.getElementById("freighter-map-stats");if(!el)return;
 const ship=vesselPoint(vessel),age=ageMinutes(vessel.seen),shipToRiver=miles(ship,RIVERFRONT);
 const rows=[
  ["Ship → riverfront",shipToRiver.toFixed(1)+" mi"],
  ["AIS age",age===null?"Unknown":Math.max(0,Math.round(age))+" min"],
  ["Reported speed",finite(vessel.speedKnots)===null?"Unknown":Number(vessel.speedKnots).toFixed(1)+" kn"],
  [userLocation?"You → riverfront":"Your position",userLocation?miles(userLocation,RIVERFRONT).toFixed(1)+" mi":"Add location"]
 ];
 el.innerHTML=rows.map(([label,value])=>`<div class="freighter-map-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
 el.hidden=false;
}
function loadLeaflet(){
 if(window.L)return Promise.resolve();
 if(!document.querySelector('link[data-detroit-leaflet]')){
  const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";link.integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";link.crossOrigin="";link.dataset.detroitLeaflet="1";document.head.append(link);
 }
 return new Promise((resolve,reject)=>{
  let script=document.querySelector('script[data-detroit-leaflet]');
  if(script){script.addEventListener("load",()=>resolve(),{once:true});script.addEventListener("error",reject,{once:true});return;}
  script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";script.crossOrigin="";script.dataset.detroitLeaflet="1";script.onload=()=>resolve();script.onerror=reject;document.head.append(script);
 });
}
function renderMap(vessel){
 currentVessel=vessel;
 const shell=ensureShell();shell.hidden=false;
 const wrap=document.getElementById("freighter-map-wrap");if(wrap)wrap.hidden=false;
 return loadLeaflet().then(()=>{
  const ship=vesselPoint(vessel);
  if(!map){
   map=L.map("freighter-relation-map",{scrollWheelZoom:false}).setView([RIVERFRONT.lat,RIVERFRONT.lng],11);
   L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
   layer=L.layerGroup().addTo(map);
  }
  layer.clearLayers();
  const river=L.circleMarker([RIVERFRONT.lat,RIVERFRONT.lng],{radius:7,weight:2,fillOpacity:.9}).addTo(layer).bindPopup("Detroit Riverfront reference point");
  const shipMarker=L.circleMarker([ship.lat,ship.lng],{radius:9,weight:2,fillOpacity:.95}).addTo(layer).bindPopup(`<strong>${esc(vessel.name||"Current freighter")}</strong><br>${esc(Number(vessel.speedKnots).toFixed(1)+" kn")}<br>AIS ${esc(Math.max(0,Math.round(ageMinutes(vessel.seen)))+" min ago")}`);
  L.polyline([[RIVERFRONT.lat,RIVERFRONT.lng],[ship.lat,ship.lng]],{weight:2,dashArray:"6 7"}).addTo(layer);
  const bounds=[[RIVERFRONT.lat,RIVERFRONT.lng],[ship.lat,ship.lng]];
  if(userLocation){
   L.circleMarker([userLocation.lat,userLocation.lng],{radius:7,weight:2,fillOpacity:.9}).addTo(layer).bindPopup("Your location");
   L.polyline([[userLocation.lat,userLocation.lng],[RIVERFRONT.lat,RIVERFRONT.lng]],{weight:2,dashArray:"3 7"}).addTo(layer);
   bounds.push([userLocation.lat,userLocation.lng]);
  }
  map.fitBounds(bounds,{padding:[34,34],maxZoom:13});
  setTimeout(()=>map.invalidateSize(),0);
  setStats(vessel);
  setStatus(`${vessel.name||"Current vessel"} is plotted from its fresh AIS report. The line to the riverfront is geographic context, not a predicted route or ETA.`);
  shipMarker.openTooltip?.();
  river.closePopup?.();
 }).catch(()=>setStatus("The live position is available, but the map library could not load. Use the full Great Lakes Ship Tracker for the current map."));
}
function clearMap(message){
 currentVessel=null;
 const shell=ensureShell();shell.hidden=false;
 const wrap=document.getElementById("freighter-map-wrap");if(wrap)wrap.hidden=true;
 const stats=document.getElementById("freighter-map-stats");if(stats)stats.hidden=true;
 if(layer)layer.clearLayers();
 setStatus(message||"No qualifying moving commercial vessel is close enough to Detroit to plot right now.");
}
async function loadRelation(force=false){
 if(loading)return;
 if(!force&&lastLoadAt&&Date.now()-lastLoadAt<REFRESH_MS)return;
 loading=true;
 try{
  const coreRes=await fetch("/api/detroit-outdoors?intent=freighter",{headers:{accept:"application/json"}});
  const core=await coreRes.json();
  lastLoadAt=Date.now();
  const candidate=coreRes.ok&&core&&core.ok&&core.intent?core.intent.candidate:null;
  if(!freshCandidate(candidate)){clearMap("No fresh qualifying Detroit passage exists right now, so there is no ship position to plot.");return;}
  const wanted=candidateName(candidate).toLowerCase();
  if(!wanted){clearMap("A live passage exists, but the named vessel could not be resolved for the map.");return;}
  const aisRes=await fetch("/api/freighter-ais",{headers:{accept:"application/json"}});
  const ais=await aisRes.json();
  if(!aisRes.ok||!ais||!Array.isArray(ais.vessels)){throw new Error("AIS map feed unavailable");}
  const vessel=ais.vessels.filter(freshMovingVessel).find(v=>String(v.name||"").trim().toLowerCase()===wanted);
  if(!vessel){clearMap("The decision signal changed before the map refresh could bind to the same vessel. Recheck the live tracker or wait for the next five-minute refresh.");return;}
  await renderMap(vessel);
 }catch(_){clearMap("The relation map could not refresh. The decision card remains available; use the full Great Lakes Ship Tracker for the current vessel map.");}
 finally{loading=false;}
}
function useLocation(){
 const button=document.getElementById("freighter-use-location");
 if(!navigator.geolocation){setStatus("This browser does not provide location access. The ship and riverfront map still work without it.");return;}
 if(button){button.disabled=true;button.textContent="Locating…";}
 navigator.geolocation.getCurrentPosition(position=>{
  userLocation={lat:position.coords.latitude,lng:position.coords.longitude};
  if(button){button.disabled=false;button.textContent="Update my location";}
  if(currentVessel)renderMap(currentVessel);
  if(typeof window.gtag==="function")window.gtag("event","detroit_freighter_relation_map",{action:"location_added",transport_type:"beacon"});
 },()=>{
  if(button){button.disabled=false;button.textContent="Use my location";}
  setStatus("Location was not available. The ship-to-riverfront map still works without it.");
 },{enableHighAccuracy:false,timeout:8000,maximumAge:10*60*1000});
}

document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Date.now()-lastLoadAt>=REFRESH_MS)loadRelation();});
ensureShell();
loadRelation(true);
setInterval(()=>{if(document.visibilityState==="visible")loadRelation();},REFRESH_MS);
})();