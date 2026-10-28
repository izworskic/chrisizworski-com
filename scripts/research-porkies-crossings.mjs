#!/usr/bin/env node
/**
 * Compare exact DNR hiking geometries to state EGLE streams and rivers.
 * Strict output: candidates only; no bridge/ford point is certified.
 * Full candidate coordinates stay in GitHub Actions research artifact.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {candidates,crossingPolicy} from "../lib/porkies/crossing-candidates.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const OUT=path.join(ROOT,"artifacts/porkies-crossings");
const PUBLIC=path.join(ROOT,"public/porcupine-mountains");
const TRAILS="https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/2/query";
const HYDRO="https://gisagoegle.state.mi.us/arcgis/rest/services/EGLE/MiEnviroBasemap/MapServer/1/query";
const BRIDGES="https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/0/query";
const BRIDGE_AREA="-90.06,46.61,-89.55,46.90";
const AREA="-90.04,46.66,-89.57,46.86";
function url(base,obj){let x=new URL(base);for(let [k,v] of Object.entries(obj))x.searchParams.set(k,String(v));return x.href;}
async function arc(base,obj){
 let error;
 for(let i=0;i<3;i++)try{
  const response=await fetch(url(base,obj),{signal:AbortSignal.timeout(35000),headers:{accept:"application/geo+json,application/json"}});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  if(data.error)throw Error(JSON.stringify(data.error));
  return data;
 }catch(e){error=e;if(i<2)await new Promise(r=>setTimeout(r,350*(i+1)));}
 throw new Error("Official GIS unavailable: "+error.message);
}
async function all(base,where,fields,location){
 const params={where,...location};
 const count=(await arc(base,{...params,returnCountOnly:true,f:"json"})).count;
 if(!Number.isInteger(count)||count<20||count>2200)throw Error("Unexpected feature count "+count);
 const items=[],seen=new Set();
 for(let offset=0;offset<count;offset+=65){
  const x=await arc(base,{...params,outFields:fields,returnGeometry:true,outSR:4326,resultOffset:offset,resultRecordCount:65,orderByFields:"OBJECTID ASC",f:"geojson"});
  if(x.type!=="FeatureCollection"||!Array.isArray(x.features)||!x.features.length)throw Error("Missing source batch "+offset);
  for(let f of x.features){
   const id=Number(f.properties?.OBJECTID??f.id);
   if(!Number.isInteger(id)||seen.has(id)||!f.geometry)throw Error("Bad feature "+id);
   seen.add(id);items.push(f);
  }
 }
 if(items.length!==count)throw Error("Source incomplete "+items.length+"/"+count);
 return items;
}
function groupBy(v,k){return v.reduce((x,e)=>(x[e[k]||"Unnamed"]=(x[e[k]||"Unnamed"]||0)+1,x),{});}
const ledger=JSON.parse(await fs.readFile(path.join(ROOT,"data/porkies-junction-crossing-ledger.json"),"utf8"));
const bridges=JSON.parse(await fs.readFile(path.join(ROOT,"data/porkies-bridge-crossing-structures.json"),"utf8"));
if(bridges.entries.length!==9||bridges.entries.some(x=>x.authorizedAsRoutingEdge!==false||x.physicalOpeningEvidence!==false))throw Error("Unreviewed bridge structure decision");
const trail=await all(TRAILS,"FacilityName='Porcupine Mountains Wilderness State Park'","OBJECTID,TrailNamePrimary,SegmentLengthMiles", {});
const stream=await all(HYDRO,"1=1","OBJECTID,GNIS_Name,FType,ReachCode",{geometry:AREA,geometryType:"esriGeometryEnvelope",inSR:4326,spatialRel:"esriSpatialRelIntersects"});
if(trail.length!==819)throw Error("DNR trail source changed; manual review required");
const bridgeFilter={where:"1=1",geometry:BRIDGE_AREA,geometryType:"esriGeometryEnvelope",inSR:"4326",spatialRel:"esriSpatialRelIntersects"};
const count=(await arc(BRIDGES,{...bridgeFilter,returnCountOnly:true,f:"json"})).count;
const bridgeData=await arc(BRIDGES,{...bridgeFilter,outFields:"OBJECTID,ASSETTYPE,ASSETDETAILTYPE,DESCRIP,CONDITION,OWNEDBY,ADMINBY",returnGeometry:false,f:"json",resultRecordCount:100});
const officialBridgeAssets=bridgeData.features?.map(x=>x.attributes)||[];
if(count!==officialBridgeAssets.length||count>100||!Number.isInteger(count))throw Error("DNR managed bridge inventory count mismatch");
const certifiedPedestrian=officialBridgeAssets.filter(x=>/pedestrian|foot|trail/i.test(String(x.ASSETDETAILTYPE||""))&&x.CONDITION==="Good");
if(certifiedPedestrian.length>0)throw Error("New footbridge asset evidence requires individual official current review, not automatic route approval");
if(count!==bridges.officialBridgeAssetLookup.recordsFound)throw Error("DNR managed-bridge inventory updated; refresh bridge-source ledger before release");

const geometry=candidates(trail,stream,{nearMeters:12,maxResults:2500});
const exact=geometry.filter(x=>x.relationship==="line-intersection");
const near=geometry.filter(x=>x.relationship==="near-line");
const interesting=geometry.filter(x=>/Big Carp|Little Carp|Presque Isle|Pinkerton|Speaker|Government Peak|Beaver Creek/i.test((x.river||"")+" "+x.trail));
const targets=[
 {ledgerId:"beaver-littlecarp-ford",trail:/Beaver Creek Trail/i,river:/^Little Carp River$/i,comment:"DNR narrative explicitly names crossing; candidate GIS intersection agrees, bridge condition unknown."},
 {ledgerId:"govtpeak-uppercarp-cross",trail:/Government Peak Trail/i,river:/Carp River|Carp River Inlet/i,comment:"DNR narrative names upper Carp river; EGLE labels Carp River Inlet near a Government Peak line. Waterway-name match must be confirmed."},
 {ledgerId:"presque-east",trail:/East River Trail/i,river:/^Presque Isle River$/i,comment:"A riverside trail touching the river centerline is NOT proof of a crossing."},
 {ledgerId:"presque-west",trail:/West River Trail/i,river:/^Presque Isle River$/i,comment:"A riverbank near-line is NOT proof of a cross-river bridge."},
 {ledgerId:"pinkerton-creek",trail:/Pinkerton Trail/i,river:/^Pinkerton Creek$/i,comment:"DNR trail description names Pinkerton Creek as a segment break, NOT explicitly as a ford."}
];
const targetReview=targets.map(t=>{
 const matches=geometry.filter(x=>t.trail.test(x.trail)&&t.river.test(x.river||""));
 return {ledgerId:t.ledgerId,candidateCount:matches.length,lineIntersections:matches.filter(x=>x.relationship==="line-intersection").length,
 sourceIDs:matches.map(x=>({trailId:x.trailId,hydroId:x.hydroId,location:x.location,offsetMeters:x.offsetMeters,relationship:x.relationship})),
 navigationStatus:"blocked-until-bridge-ford-junction-review",comment:t.comment};
});

const doc={
  asOf:"2026-10-28",classification:crossingPolicy,sourceTrail:TRAILS,sourceHydro:HYDRO,
  sourceOfficialGPSMap:ledger.sources.dnrGPSParkMap,sourceDNRDescriptions:ledger.sources.dnrTrailDescriptions,
  sourceFeatures:{trail:trail.length,stream:stream.length,managedBridgeAssets:count},
  officialBridgeAssets:officialBridgeAssets.map(x=>({id:x.OBJECTID,type:x.ASSETDETAILTYPE,description:x.DESCRIP,condition:x.CONDITION,owner:x.OWNEDBY})),measured:{totalCandidates:geometry.length,lineIntersections:exact.length,nearLines:near.length,namedHydroCandidates:geometry.filter(x=>x.river).length,interestingCandidates:interesting.length},
  caveats:["Hydrographic centerlines are not surveyed ford/bridge locations.","An intersection can represent digitization overlap, culvert, cul-de-sac, bridge, waterfall route, or no navigable trail at all.","Near-line candidates are deliberately lower-confidence than line intersections; both remain unverified.","DNR map unbridged-crossing symbols have not been machine-georeferenced to an exact official crossing point.","2016 Big Carp bridge storm notice does not establish present condition.","No candidate may be used to route a person or infer dry, safe, accessible stream crossing."],
  namedRiverSummary:groupBy(geometry.filter(x=>x.river),"river"),
  priorityRiverMatches:interesting.slice(0,80),targetReview,
  allCandidates:geometry
};
await fs.mkdir(OUT,{recursive:true});
await fs.writeFile(path.join(OUT,"candidate-crossings-private-review.json"),JSON.stringify(doc,null,2));
if(process.argv.includes("--emit-public-summary")){
 const summary={
  status:"crossing-research-not-route-approved",reviewedOn:doc.asOf,
  sources:{trailGIS:TRAILS,streamGIS:HYDRO,dnrGPSMap:ledger.sources.dnrGPSParkMap,descriptions:ledger.sources.dnrTrailDescriptions},
  counts:{sourceTrails:trail.length,sourceStreams:stream.length,geometricIntersections:exact.length,nearLineCandidates:near.length,totalCandidates:geometry.length,sourceDescribedJunctionRecords:ledger.records.length},
  registry:ledger.records.map(({id,trail,site,type,status,referenceMiles,note,source})=>({id,trail,site,type,status,referenceMiles,note,source,coordinatesPublished:false,bridgeOrFord:"unknown",routeEligible:false})),
  priorityEvidence:targetReview.map(({ledgerId,candidateCount,lineIntersections,navigationStatus,comment})=>({ledgerId,candidateCount,lineIntersections,navigationStatus,comment,coordinatePublished:false})),
  structureReview:{mapEdition:bridges.mapEdition,compiledOn:bridges.compiledOn,conditionCertified:0,officialClosureReview:bridges.officialClosureReview,managedBridgeAssetAudit:bridges.officialBridgeAssetLookup,entries:bridges.entries.map(({id,label,district,kind,mapMarkerReview,structure,latestCondition,sourceUrls,sourceIds})=>({id,label,district,kind,mapMarkerReview,structure,latestCondition,sourceUrls,sourceIds,publicCoordinate:null,routeEligible:false}))},
  safety:{currentBridgeStatus:"unknown",officialCrossingCoordinatesCertified:false,anyAutoRouteAcrossStream:false,historicalBigCarpBridgeStatus:"2016 report only, no current assertion",fieldVerificationRequired:true,currentPassableCrossings:0,exactMapSymbolToCrossingMatches:0},
  advisory:"Evidence of a river crossing or connected trail is not evidence of a safe, open, bridged route. No GPS crossing pin, route time, or ford status is published."
 };
 await fs.writeFile(path.join(PUBLIC,"crossing-evidence.json"),JSON.stringify(summary,null,2)+"\n");
}
console.log(JSON.stringify({class:doc.classification,features:doc.sourceFeatures,managedBridgeAssetRecords:count,candidates:doc.measured,known:ledger.records.length,priorityRivers:doc.namedRiverSummary,priorityReview:targetReview.map(x=>({id:x.ledgerId,candidates:x.candidateCount,exact:x.lineIntersections})),publicSummary:process.argv.includes("--emit-public-summary")},null,2));
