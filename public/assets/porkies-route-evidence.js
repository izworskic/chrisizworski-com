/* Evidence overlays only. No shortest path, turn-by-turn routing, trail ETA,
 * bridge/ford passability or assertion of current open roads.
 */
(function(root){
 "use strict";
 const BASE="/porcupine-mountains/",MAX_FEATURES={trails:819,roads:250},layers={};
 const paths={trails:"trail-reference.geojson",roads:"park-road-reference.geojson",ski:"ski-reference.geojson"};
 let atlas=null,evidence=null;
 function currentSeason(){
  const e=root.document.getElementById("travel-date");
  return root.PorkiesEngine?.seasonFor(e?.value||"")||"unknown";
 }
 function restricted(c){
  return c==="south-boundary"||c==="m107"||c==="summit-road";
 }
 function winter(season){return season==="winter"||season==="reopening";}
 function roadStyle(feature) {
  const corridor=feature?.properties?.corridor;
  if(restricted(corridor))return winter(currentSeason())||currentSeason()==="prewinter"
   ?{color:"#ad4839",weight:4,opacity:.95,dashArray:"7,6"}
   :{color:"#b47d3c",weight:3,opacity:.85,dashArray:"9,5"};
  return {color:"#496e84",weight:3,opacity:.72};
 }
 function skiStyle(){return {color:"#496f9f",weight:3,opacity:.82,dashArray:"7,3"};}
 function trailStyle(){
  return {color:"#256c57",weight:2.5,opacity:.7,dashArray:"4,4"};
 }
 function safe(s){return String(s||"Unnamed").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
 // Explicit names audited against the published DNR GIS feature labels. Do not use
 // substring matching: the shared Cross/Correction source label is ambiguous.
 const reviewedTrailNames=Object.freeze({
  "east river trail":["Porcupine Mountains East River Trail"],
  "correction line trail":["Porcupine Mountains Correction Line Trail"],
  "cross trail":["Porcupine Mountain Wilderness Cross Trail Correction Line Trail"]
 });
 function trailSourceMatch(source,name){
  const named=String(name||"").trim().toLowerCase();
  const label=String(source||"").trim().toLowerCase();
  if(!named||!label)return false;
  return label===named || label==="porcupine mountain wilderness "+named ||
    (reviewedTrailNames[named]||[]).some(alias=>alias.toLowerCase()===label);
 }

 function message(s){const e=root.document.getElementById("route-evidence-status");if(e)e.textContent=s;}
 async function loadManifest(){
  if(evidence)return evidence;
  const response=await root.fetch(BASE+"routing-evidence.json",{credentials:"same-origin"});
  if(!response.ok)throw Error("no published GIS audit file");
  const data=await response.json();
  if(data.status!=="geometry-not-navigable"||!data.noPublicRouteTimes||!data.noCrossingSafetyCertification||data.audit?.trailFeatures!==819||data.audit?.skiFeatures!==40)throw Error("unreviewed routing manifest");
  evidence=data;
  return data;
 }
 async function show(kind) {
  if(!atlas){message("The map is not available. Please use the official DNR GPS map above.");return false;}
  const button=root.document.getElementById(kind==="trails"?"porkies-trails-toggle":kind==="ski"?"porkies-ski-toggle":"porkies-roads-toggle");
  if(layers[kind]){atlas.removeLayer(layers[kind]);delete layers[kind];button?.setAttribute("aria-pressed","false");message("Map layer hidden. No navigable park route is certified by these GIS layers.");return false;}
  button?.setAttribute("aria-pressed","true");
  message("Loading official "+(kind==="trails"?"DNR hiking geometry":kind==="ski"?"DNR ski-trail geometry":"Michigan road geometry")+"…");
  try{
   await loadManifest();
   const r=await root.fetch(BASE+paths[kind],{credentials:"same-origin"});
   if(!r.ok)throw Error("Geometry not available");
   const geo=await r.json();
   if(geo.type!=="FeatureCollection"||!Array.isArray(geo.features)||geo.features.length<20||geo.features.length>(kind==="trails"?1000:250)||kind==="ski"&&geo.features.length!==40)throw Error("Unexpected geometry coverage");
   if(geo.features.some(f=>f.properties?.routingCertified!==false))throw Error("Unreviewed route status");
   const pane=kind==="trails"?"porkies-trail-evidence":kind==="ski"?"porkies-ski-evidence":"porkies-road-evidence";
   if(!atlas.getPane(pane))atlas.createPane(pane);
   atlas.getPane(pane).style.zIndex=kind==="trails"?"352":kind==="ski"?"354":"348";
   atlas.getPane(pane).style.pointerEvents="auto";
   const layer=root.L.geoJSON(geo,{
    pane,style:kind==="trails"?trailStyle:kind==="ski"?skiStyle:roadStyle,
    onEachFeature:(feature,part)=>{
     const p=feature.properties||{};
     const road=kind==="roads";
     const caut=road?(restricted(p.corridor)?"This road corridor is seasonally restricted. Check its current status with the DNR.":"Road centerline only; no turn restrictions, gate or plowing status are provided."):kind==="ski"?"DNR ski-trail source geometry; not a live trail-grooming, snow or operations report.":"Trail source geometry only. The named trail may be incomplete, and crossings are unverified.";
     part.bindPopup("<strong>"+safe(p.name)+"</strong><p>"+safe(caut)+"</p><p>Official source record "+safe(p.id)+". Not a generated hiking or driving route.</p>");
    }
   }).addTo(atlas);
   layers[kind]=layer;
   button?.setAttribute("aria-pressed","true");
   message(kind==="trails"?"Showing "+geo.features.length+" DNR hiking features. Connected lines do not certify crossings, bridges or full named-trail distances.":kind==="ski"?"Showing "+geo.features.length+" DNR ski-trail records. This is NOT a current snow or grooming report and does not establish that any ski trail is open.":"Showing "+geo.features.length+" selected park-area road centerlines from the 296-record research extract. Red dashed roads have documented seasonal vehicle restrictions; current opening is not inferred.");
   return true;
  }catch(err){
   button?.setAttribute("aria-pressed","false");
   message("Could not validate or display the GIS reference layer. Use the official DNR GPS map; no route suggestions are inferred.");
   return false;
  }
 }
 async function inspectNamedTrail(name) {
  if(!atlas){message("Official line map is unavailable. Read the DNR descriptions and GPS map linked below.");return;}
  if(typeof name!=="string"||!name.trim()||name.length>150)return;
  if(!layers.trails) {
   const ready=await show("trails");
   if(!ready)return;
  }
  const selected=[],normal=trailStyle();
  layers.trails.eachLayer(layer=>{
   const source=String(layer.feature?.properties?.name||"");
   const match=trailSourceMatch(source,name);
   if(layer.setStyle)layer.setStyle(match?{color:"#d07d31",weight:5,opacity:1,dashArray:null}:normal);
   if(match){selected.push(layer);if(layer.bringToFront)layer.bringToFront();}
  });
  if(!selected.length){
   message(name+": not present as a separately named line in the DNR hiking GIS. No substitute line, artificial route or estimated walk is shown.");
   return;
  }
  const bounds=root.L.featureGroup(selected).getBounds();
  if(bounds.isValid())atlas.fitBounds(bounds.pad(.25),{maxZoom:13});
  const sharedLabel=name.trim().toLowerCase()==="cross trail" ? " The DNR labels these features 'Cross Trail Correction Line Trail'; their individual trail identity is unresolved." : "";
  message(name+": showing "+selected.length+" source line fragment"+(selected.length===1?"":"s")+"."+sharedLabel+" This is NOT a verified continuous route; check the published map for missing parts, return trip and unbridged crossings.");
 }
 function refresh(){
  if(layers.roads)layers.roads.setStyle(roadStyle);
  if(layers.roads)message("Road restrictions shown for the selected date. Red dashed lines are flagged as seasonally restricted; geometry is not live closure data.");
 }
 function init(){
  const buttonT=root.document.getElementById("porkies-trails-toggle");
  const buttonR=root.document.getElementById("porkies-roads-toggle");
  const buttonS=root.document.getElementById("porkies-ski-toggle");
  if(!buttonT||!buttonR)return;
  buttonT.addEventListener("click",()=>show("trails"));
  buttonR.addEventListener("click",()=>show("roads"));
  if(buttonS)buttonS.addEventListener("click",()=>show("ski"));
  root.addEventListener("porkies:trail-reference",e=>inspectNamedTrail(e?.detail?.name));
  root.document.getElementById("travel-date")?.addEventListener("change",refresh);
  root.document.getElementById("planner")?.addEventListener("submit",()=>root.setTimeout(refresh,0));
  atlas=root.PorkiesAtlas?.map||null;
  root.addEventListener("porkies:map-ready",()=>{atlas=root.PorkiesAtlas?.map||null;});
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={restricted,winter,roadStyle,trailSourceMatch};
 if(root.document)init();
})(typeof window!=="undefined"?window:globalThis);
