/* Porkies source-status desk: fresh GIS inventory checks, never an "open" verdict.
 * The official trail closure and bridge-asset datasets do NOT provide live road gates,
 * parking occupancy, ford depth, or bridge inspections. Fails closed to "unknown".
 */
(function(root){
 "use strict";
 const SOURCES={
   park:"https://www.michigan.gov/recsearch/parks/porkies",
   closures:"https://www.michigan.gov/dnr/about/newsroom/closures",
   trails:"https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/",
   bridges:"https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/0"
 };
 const ENVELOPE="-90.06,46.59,-89.55,46.93";
 const MAX_ROWS=30;
 function sourceQuery(layer){
   return SOURCES.trails+layer+"/query?"+
     [["f","json"],["where","1=1"],["geometry",ENVELOPE],
     ["geometryType","esriGeometryEnvelope"],["spatialRel","esriSpatialRelIntersects"],
     ["inSR","4326"],["returnGeometry","false"],["outFields","*"],
     ["resultRecordCount",String(MAX_ROWS)]].map(p=>p[0]+"="+encodeURIComponent(p[1])).join("&");
 }
 function bridgeQuery(){
   return SOURCES.bridges+"/query?"+[
     ["f","json"],["where","1=1"],["geometry",ENVELOPE],
     ["geometryType","esriGeometryEnvelope"],["spatialRel","esriSpatialRelIntersects"],
     ["inSR","4326"],["returnGeometry","false"],["outFields","OBJECTID,ASSETDETAILTYPE,CONDITION,DESCRIP,OWNEDBY"],["resultRecordCount",String(MAX_ROWS)]
   ].map(p=>p[0]+"="+encodeURIComponent(p[1])).join("&");
 }
 function modeForDate(date,engine){
   const season=engine?.seasonFor?.(date)||"unknown";
   if(season==="winter")return {code:"restricted",title:"Seasonal vehicle closures apply",text:"From December 1, the DNR closes the M-107 overlook approach at Whitetail parking and South Boundary Road from Headquarters Road toward Pinkerton. Do not plan a through-park drive. County Road 519 is the separate western Presque Isle approach; its same-day surface and parking are not verified."};
   if(season==="reopening")return {code:"uncertain",title:"Reopening is not date-certified",text:"Spring access begins only when the Ontonagon County Road Commission determines it is safe. An automatically chosen May date does not certify the gates open. Use DNR/road commission notices."};
   if(season==="prewinter")return {code:"uncertain",title:"Shoulder-season road status unverified",text:"November can bring early winter restrictions or icy travel. Road gates, parking and bridge conditions remain unverified even though the published seasonal closure begins December 1."};
   if(season==="normal")return {code:"unknown",title:"Normal-season road plan, not an opening report",text:"June–October is the typical scenic-road season, but this tool has no authoritative live open-gate or plowed-parking feed. Do not interpret a navigation link as an assurance."};
   return {code:"unknown",title:"Date is missing or invalid",text:"Choose a travel date to see the published seasonal rule. No current or future road-open verdict is available."};
 }
 function assessSample(layer,data){
   if(!data||data.error||!Array.isArray(data.features)||data.exceededTransferLimit===true)return {state:"unknown",count:null,reason:"ArcGIS response unavailable or incomplete."};
   const count=data.features.length;
   return {state:"observed",count,mayBeTruncated:count===MAX_ROWS,layer};
 }
 function bridgeAssessment(data){
   const base=assessSample("bridges",data);
   if(base.state!=="observed")return {state:"unknown",count:null,described:0,inspected:0};
   const a=data.features.map(f=>f.attributes||{});
   return {state:"observed",count:a.length,described:a.filter(f=>f.ASSETDETAILTYPE).length,
     inspected:a.filter(f=>f.CONDITION!==null&&f.CONDITION!==undefined&&String(f.CONDITION).trim()!=="").length,
     types:a.map(f=>String(f.ASSETDETAILTYPE||"unspecified")).slice(0,MAX_ROWS)};
 }
 async function fetchLayer(url,fetchFn){
   const ctrl=typeof AbortController!=="undefined"?new AbortController():null;
   const timer=root.setTimeout(()=>ctrl?.abort(),7000);
   try{
     const res=await fetchFn(url,{signal:ctrl?.signal,cache:"no-store",mode:"cors"});
     if(!res.ok)throw Error("GIS HTTP "+res.status);
     const data=await res.json();
     if(data.error||!Array.isArray(data.features))throw Error("Invalid GIS query result");
     return data;
   }finally{root.clearTimeout(timer);}
 }
 function text(id,value){
   const e=root.document.getElementById(id);
   if(e)e.textContent=value;
 }
 function addSource(linkId,href,caption){
   const e=root.document.getElementById(linkId);
   if(e){e.href=href;e.textContent=caption;}
 }
 function renderDate(){
   const selected=root.document.getElementById("travel-date")?.value||"";
   const verdict=modeForDate(selected,root.PorkiesEngine);
   const tile=root.document.getElementById("park-road-verdict");
   if(tile)tile.dataset.confidence=verdict.code;
   text("park-road-label",verdict.title);
   text("park-road-detail",verdict.text);
 }
 function renderTrailheadNotes(){
   const lookup={
     "Summit Peak Tower Trail": ["summit","DNR-matched Summit Peak parking asset, not confirmation of passability."],
     "Visitor Center Nature Trail":["visitor","DNR-matched visitor-center nature trail parking asset; visitor center hours vary."],
     "West River Trail":["presque","DNR-matched Presque Isle river-trail area, not a specific waterfall entry or bridge."],
     "East River Trail":["presque","DNR-matched Presque Isle river-trail area; East/West trail access and bridges are distinct."],
     "Escarpment Trail":["lake","DNR-matched Lake of the Clouds lot; an overlook is not a substitute for a strenuous ridge hike."],
     "Pinkerton Trail":["pinkerton","DNR-matched Pinkerton asset; river crossings and current trail access remain unknown."]
   };
   root.document.querySelectorAll(".trail-see-map[data-source-trail]").forEach(button=>{
     const card=button.closest(".trail-truth-card"); if(!card||card.querySelector(".porkies-access-truth"))return;
     const label=button.getAttribute("data-source-trail")||"";
     const info=lookup[label];
     const note=root.document.createElement("p");note.className="porkies-access-truth";
     if(info){
       note.textContent="Mapped access reference: "+info[1]+" ";
       const jump=root.document.createElement("a");jump.href="#access-atlas";jump.textContent="See mapped parking area";
       jump.addEventListener("click",()=>{root.document.getElementById("parking-all")?.click();});
       note.appendChild(jump);
       note.dataset.match="crosschecked";
     }else{
       note.textContent="Parking-to-trailhead connection NOT verified. Consult the DNR GPS map and signed on-site trailhead. Do not navigate to the trail's generic GIS coordinate.";
       note.dataset.match="unverified";
     }
     card.appendChild(note);
   });
 }
 function renderGIS(c,r,b,checked){
   const cs=assessSample("closure",c), rs=assessSample("reroute",r), bs=bridgeAssessment(b);
   let sentences=[];
   if(cs.state==="observed"&&rs.state==="observed"){
     sentences.push(cs.count===0&&rs.count===0 ?
       "DNR GIS returned zero temporary closure lines and zero reroute lines in the study area." :
       "DNR GIS returned "+cs.count+" temporary closure line(s) and "+rs.count+" reroute line(s) in the surrounding study area; inspect the official sources before entering any affected trail.");
     if(cs.mayBeTruncated||rs.mayBeTruncated)sentences.push("Results may be truncated; no all-clear can be inferred.");
   }else sentences.push("Official temporary trail closure GIS could not be checked. Trail status is UNKNOWN.");
   if(bs.state==="observed"){
     sentences.push("DNR managed-bridge asset inventory returned "+bs.count+" area record(s). "+bs.inspected+" supplied a nonempty condition field; none is a certified current pedestrian-bridge inspection. Unbridged crossings on the park map may be absent from this asset inventory.");
   }else sentences.push("The DNR managed-bridge asset inventory was unavailable. Bridge and ford conditions are UNKNOWN.");
   sentences.push("These datasets are not live parking occupancy, opening times, river depth, road gates, pedestrian bridge inspections, or a complete list of local closures.");
   text("park-gis-verdict",sentences.join(" "));
   const stamp=checked?.toLocaleString?.("en-US",{timeZone:"America/Detroit",dateStyle:"medium",timeStyle:"short"})||"";
   text("park-gis-checked",stamp?"DNR GIS check: "+stamp+" Eastern. This is a source query, not a same-day safety certification or forecast for a future travel date.":"Could not confirm source status.");
   const banner=root.document.getElementById("park-gis-panel");
   if(banner)banner.dataset.check=(cs.state==="observed"&&rs.state==="observed"&&bs.state==="observed")?"queried":"partial";
 }
 async function refresh(){
   text("park-gis-verdict","Checking Michigan DNR GIS source records. The page will not treat an empty result as proof of safe access.");
   const urls=[sourceQuery(0),sourceQuery(1),bridgeQuery()];
   const now=new Date();
   const results=await Promise.allSettled(urls.map(u=>fetchLayer(u,root.fetch.bind(root))));
   const data=results.map(r=>r.status==="fulfilled"?r.value:null);
   renderGIS(data[0],data[1],data[2],now);
 }
 function init(){
   if(!root.document.getElementById("park-access-evidence"))return;
   addSource("park-gis-closure-source",SOURCES.trails+"0","Official DNR temporary closures GIS");
   addSource("park-gis-bridge-source",SOURCES.bridges,"DNR managed-bridge asset inventory");
   renderDate();renderTrailheadNotes();
   root.document.getElementById("travel-date")?.addEventListener("change",renderDate);
   root.document.getElementById("planner")?.addEventListener("submit",renderDate);
   root.document.getElementById("park-gis-refresh")?.addEventListener("click",refresh);
   refresh();
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={sourceQuery,bridgeQuery,modeForDate,assessSample,bridgeAssessment};
 if(root.document){
   if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init,{once:true});else init();
 }
})(typeof window!=="undefined"?window:globalThis);
