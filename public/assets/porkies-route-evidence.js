/* Evidence overlays only. No shortest path, turn-by-turn routing, trail ETA,
 * bridge/ford passability or assertion of current open roads.
 */
(function(root){
 "use strict";
 const BASE="/porcupine-mountains/",MAX_FEATURES={trails:819,roads:250},layers={};
 const paths={trails:"trail-reference.geojson",roads:"park-road-reference.geojson",ski:"ski-reference.geojson",west:"west-road-reference.geojson"};
 const WEST_BOUNDARY_IDS=new Set([9688,9685,9684,9533,9429,9372,9218,9121,9107,9071,9042,8963,8910,8892,8884]);
 let westGeo=null;
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
  if(corridor==="south-boundary"&&WEST_BOUNDARY_IDS.has(Number(feature?.properties?.id)))return {color:"#4a8c77",weight:3.5,opacity:.9,dashArray:"8,4"}; // DNR's separate western access, NOT live opening.
  if(restricted(corridor))return winter(currentSeason())||currentSeason()==="prewinter"
   ?{color:"#ad4839",weight:4,opacity:.95,dashArray:"7,6"}
   :{color:"#b47d3c",weight:3,opacity:.85,dashArray:"9,5"};
  return {color:"#496e84",weight:3,opacity:.72};
 }
 function westStyle(feature){return feature?.properties?.corridor==="mgf-presque-isle-west-road"?{color:"#1d735d",weight:5,opacity:.9}:{color:"#499d78",weight:4,opacity:.9,dashArray:"6,4"};}
 function skiStyle(){return {color:"#496f9f",weight:3,opacity:.82,dashArray:"7,3"};}
 function trailStyle(){
  return {color:"#256c57",weight:2.5,opacity:.7,dashArray:"4,4"};
 }
 function safe(s){return String(s||"Unnamed").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
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
 async function loadWest(){
   if(westGeo)return westGeo;
   const [r,g]=await Promise.all([
    root.fetch(BASE+"west-access-evidence.json",{credentials:"same-origin"}),
    root.fetch(BASE+"west-road-reference.geojson",{credentials:"same-origin"})
   ]);
   if(!r.ok||!g.ok)throw Error("West approach source evidence missing");
   const m=await r.json(),geo=await g.json();
   if(m.status!=="western-approach-evidence-not-turn-by-turn"||m.westRoadFeatureCount!==17||m.westSouthBoundaryFeatureCount!==15||m.presquIsleRoadNetworkAt5m!==1||m.routesAllowed!==false||m.ETAallowed!==false||m.seasonal?.presentAccessVerified!==false||geo.features?.length!==32)throw Error("West route source drift");
   if(geo.features.some(x=>x.properties?.routingCertified!==false||x.properties?.plowingVerified!==false||x.properties?.temporaryGateVerified!==false))throw Error("Unverified road permissions changed");
   const segments=geo.features.filter(x=>x.properties?.corridor==="west-of-pinkerton-south-boundary");
   if(segments.length!==15||segments.some(x=>!WEST_BOUNDARY_IDS.has(Number(x.properties.id))))throw Error("Wrong seasonal corridor");
   westGeo=geo;return westGeo;
 }
 async function show(kind) {
  if(!atlas){message("The map is not available. Please use the official DNR GPS map above.");return false;}
  const button=root.document.getElementById(kind==="trails"?"porkies-trails-toggle":kind==="ski"?"porkies-ski-toggle":kind==="west"?"porkies-west-toggle":"porkies-roads-toggle");
  if(layers[kind]){atlas.removeLayer(layers[kind]);delete layers[kind];button?.setAttribute("aria-pressed","false");message("Map layer hidden. No navigable park route is certified by these GIS layers.");return false;}
  button?.setAttribute("aria-pressed","true");
  message("Loading official "+(kind==="trails"?"DNR hiking geometry":kind==="ski"?"DNR ski-trail geometry":kind==="west"?"DNR-identified west road approach":"Michigan road geometry")+"…");
  try{
   await loadManifest();
   let geo;
   if(kind==="west")geo=await loadWest();
   else{
    const r=await root.fetch(BASE+paths[kind],{credentials:"same-origin"});
    if(!r.ok)throw Error("Geometry not available");
    geo=await r.json();
   }
   if(geo.type!=="FeatureCollection"||!Array.isArray(geo.features)||geo.features.length<20||geo.features.length>(kind==="trails"?1000:250)||kind==="ski"&&geo.features.length!==40)throw Error("Unexpected geometry coverage");
   if(geo.features.some(f=>f.properties?.routingCertified!==false))throw Error("Unreviewed route status");
   const pane=kind==="trails"?"porkies-trail-evidence":kind==="ski"?"porkies-ski-evidence":kind==="west"?"porkies-west-evidence":"porkies-road-evidence";
   if(!atlas.getPane(pane))atlas.createPane(pane);
   atlas.getPane(pane).style.zIndex=kind==="trails"?"352":kind==="ski"?"354":kind==="west"?"355":"348";
   atlas.getPane(pane).style.pointerEvents="auto";
   const layer=root.L.geoJSON(geo,{
    pane,style:kind==="trails"?trailStyle:kind==="ski"?skiStyle:kind==="west"?westStyle:roadStyle,
    onEachFeature:(feature,part)=>{
     const p=feature.properties||{};
     const road=kind==="roads"||kind==="west";
     const caut=road?(kind==="west"?"DNR documents the separate western CR519 approach. MGF calls its line Presque Isle Rd. Current plowing, parking access, gates and legal driving route are NOT verified.":p.corridor==="south-boundary"&&WEST_BOUNDARY_IDS.has(Number(p.id))?"Western South Boundary section from CR519 toward Pinkerton: distinct from the east-side seasonal closure. NOT a current-open guarantee.":restricted(p.corridor)?"This road corridor is seasonally restricted. Check its current status with the DNR.":"Road centerline only; no turn restrictions, gate or plowing status are provided."):kind==="ski"?"DNR ski-trail source geometry; not a live trail-grooming, snow or operations report.":"Trail source geometry only. The named trail may be incomplete, and crossings are unverified.";
     part.bindPopup("<strong>"+safe(p.name)+"</strong><p>"+safe(caut)+"</p><p>Official source record "+safe(p.id)+". Not a generated hiking or driving route.</p>");
    }
   }).addTo(atlas);
   layers[kind]=layer;
   button?.setAttribute("aria-pressed","true");
   message(kind==="trails"?"Showing "+geo.features.length+" DNR hiking features. Connected lines do not certify crossings, bridges or full named-trail distances.":kind==="ski"?"Showing "+geo.features.length+" DNR ski-trail records. This is NOT a current snow or grooming report and does not establish that any ski trail is open.":kind==="west"?"Showing 17 mapped Presque Isle Road centerlines (DNR's County Road 519 western approach) and 15 western South Boundary segments. These are map references, NOT a verified legal drive, open road, plowing, gate or ETA.":"Showing "+geo.features.length+" selected park-area road centerlines from the 296-record research extract. Western South Boundary before Pinkerton is a distinct DNR-described approach; red dashed sections are seasonally restricted. Neither style means live-open.");
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
   const match=source.trim().toLowerCase()===name.trim().toLowerCase() ||
      source.trim().toLowerCase()==="porcupine mountain wilderness "+name.trim().toLowerCase();
   if(layer.setStyle)layer.setStyle(match?{color:"#d07d31",weight:5,opacity:1,dashArray:null}:normal);
   if(match){selected.push(layer);if(layer.bringToFront)layer.bringToFront();}
  });
  if(!selected.length){
   message(name+": not present as a separately named line in the DNR hiking GIS. No substitute line, artificial route or estimated walk is shown.");
   return;
  }
  const bounds=root.L.featureGroup(selected).getBounds();
  if(bounds.isValid())atlas.fitBounds(bounds.pad(.25),{maxZoom:13});
  message(name+": showing "+selected.length+" source line fragment"+(selected.length===1?"":"s")+". This is NOT a verified continuous route; check the published map for missing parts, return trip and unbridged crossings.");
 }
 function refresh(){
  if(layers.roads)layers.roads.setStyle(roadStyle);
  if(layers.roads)message("Road restrictions shown for the selected date. Red dashed lines are flagged as seasonally restricted; geometry is not live closure data.");
 }
 function init(){
  const buttonT=root.document.getElementById("porkies-trails-toggle");
  const buttonR=root.document.getElementById("porkies-roads-toggle");
  const buttonS=root.document.getElementById("porkies-ski-toggle");
  const buttonW=root.document.getElementById("porkies-west-toggle");
  if(!buttonT||!buttonR)return;
  buttonT.addEventListener("click",()=>show("trails"));
  buttonR.addEventListener("click",()=>show("roads"));
  if(buttonS)buttonS.addEventListener("click",()=>show("ski"));
  if(buttonW)buttonW.addEventListener("click",()=>show("west"));
  root.addEventListener("porkies:trail-reference",e=>inspectNamedTrail(e?.detail?.name));
  root.document.getElementById("travel-date")?.addEventListener("change",refresh);
  root.document.getElementById("planner")?.addEventListener("submit",()=>root.setTimeout(refresh,0));
  atlas=root.PorkiesAtlas?.map||null;
  root.addEventListener("porkies:map-ready",()=>{atlas=root.PorkiesAtlas?.map||null;});
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={restricted,winter,roadStyle};
 if(root.document)init();
})(typeof window!=="undefined"?window:globalThis);
