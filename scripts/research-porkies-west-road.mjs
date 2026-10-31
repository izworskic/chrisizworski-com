#!/usr/bin/env node
/** Reconstruct MGF Presque Isle Road (DNR CR519) and western South Boundary.
 * Data are evidence traces, never legal/open driving directions.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {graphAudit,parts,distance,lengthMeters} from "../lib/porkies/route-topology.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ledger=JSON.parse(await fs.readFile(path.join(root,"data/porkies-west-road-ledger.json"),"utf8"));
const park=JSON.parse(await fs.readFile(path.join(root,"public/porcupine-mountains/park-road-reference.geojson"),"utf8"));
const endpoint="https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20/query";
function url(q) { const u=new URL(endpoint);for(const [k,v] of Object.entries(q))u.searchParams.set(k,String(v));return u.href; }
async function source(q){
 let err;
 for(let i=0;i<3;i++){try{
  const r=await fetch(url(q),{headers:{Accept:"application/geo+json,application/json"},signal:AbortSignal.timeout(35000)});
  if(!r.ok)throw Error("Source HTTP "+r.status);
  const j=await r.json();
  if(j.error)throw Error("MGF error "+JSON.stringify(j.error));
  return j;
 }catch(e){err=e;if(i<2)await new Promise(r=>setTimeout(r,500+i*750));}}
 throw new Error("MGF unavailable: "+String(err));
}
const where="RDNAME = 'Presque Isle Rd' AND PR = 1475809";
const filter={where,geometry:"-90.38,46.34,-89.71,46.83",geometryType:"esriGeometryEnvelope",inSR:4326,spatialRel:"esriSpatialRelIntersects"};
const count=(await source({...filter,returnCountOnly:true,f:"json"})).count;
if(count!==ledger.westApproach.namedMgFeatureIds.length)throw Error("Named west-road MGF inventory drift; current="+count+", ledger="+ledger.westApproach.namedMgFeatureIds.length);
const fetched=await source({...filter,outFields:"OBJECTID,RDNAME,NAME,PR,NFC,LEGALSYSTEM,LENGTH",returnGeometry:true,outSR:4326,orderByFields:"OBJECTID ASC",resultRecordCount:40,f:"geojson"});
if(fetched.type!=="FeatureCollection"||fetched.features.length!==count)throw Error("Missing/partial west road line source");
const expected=new Set(ledger.westApproach.namedMgFeatureIds);
const found=new Set();
for(const f of fetched.features){
 const p=f.properties||{},id=Number(p.OBJECTID);
 if(!expected.has(id)||found.has(id)||p.RDNAME!=="Presque Isle Rd"||p.PR!==1475809||p.NFC!==5||parts(f).length<1)throw Error("Unreviewed west road feature "+id);
 found.add(id);
}
if(found.size!==expected.size)throw Error("MGF centerline missing signed-off feature");
const existing=park.features.filter(f=>ledger.westernSouthBoundary.featureIds.includes(f.properties.id));
if(existing.length!==15||new Set(existing.map(f=>f.properties.id)).size!==15)throw Error("Missing west of Pinkerton South Boundary segments");
for(const f of existing){if(f.properties.corridor!=="south-boundary"||f.geometry==null)throw Error("Invalid west-side road identity "+f.properties.id);}
function geoBounds(f){
 const coords=parts(f).flat();return {minX:Math.min(...coords.map(x=>x[0])),maxX:Math.max(...coords.map(x=>x[0])),minY:Math.min(...coords.map(x=>x[1])),maxY:Math.max(...coords.map(x=>x[1]))};
}
for(const f of existing)if(geoBounds(f).maxX>-89.89875)throw Error("Seasonal-closure boundary moved beyond approved Pinkerton x-coordinate");
const south=fetched.features.reduce((a,b)=>geoBounds(a).minY<geoBounds(b).minY?a:b);
const north=fetched.features.reduce((a,b)=>geoBounds(a).maxY>geoBounds(b).maxY?a:b);
const northTerminus=parts(north).flat().reduce((a,b)=>b[1]>a[1]?b:a);
const westernJunction=parts(existing.find(f=>f.properties.id===9688)).flat();
const endpointMeters=Math.min(...westernJunction.map(x=>distance(northTerminus,x)));
if(endpointMeters>15)throw Error("MGF CR519 centerline does not join western S Boundary evidence at expected position "+endpointMeters);
const graph=graphAudit(fetched.features,5,"RDNAME");
if(graph.componentCount!==1||graph.degreeOneNodes!==2)throw Error("Named Presque Isle centerline connectivity drift: "+JSON.stringify({component:graph.componentCount,endpoints:graph.degreeOneNodes}));
function strip(f){
 return {type:"Feature",properties:{
  id:f.properties?.OBJECTID??f.properties?.id,
  name:f.properties?.RDNAME||f.properties?.name,
  corridor:f.properties?.RDNAME==="Presque Isle Rd"?"mgf-presque-isle-west-road":"west-of-pinkerton-south-boundary",
  source:"MGF mapped road centerline",sourceFeatureId:f.properties?.OBJECTID??f.properties?.id,
  routingCertified:false,temporaryGateVerified:false,plowingVerified:false,
  noThroughParkDrive:true,winterPolicy:"separate-west-approach-described-by-DNR-not-real-time-open",
  dataReviewed:"2026-10-28"},
  geometry:f.geometry};
}
const west=fetched.features.map(strip);
const boundary=existing.map(strip);
const gj={type:"FeatureCollection",name:"Porkies mapped separate western road approach — evidence only",properties:{routingCertified:false,routeTimeVerified:false,openNowVerified:false,officialParkAccessName:"County Road 519",MGFcenterlineName:"Presque Isle Rd"},features:[...west,...boundary]};
const summary={
 status:"western-approach-evidence-not-turn-by-turn",reviewedOn:"2026-10-28",
 sources:ledger.sources,sourceIdentity:ledger.sourceNameCrosswalk,
 westRoadFeatureCount:west.length,westSouthBoundaryFeatureCount:boundary.length,
 presquIsleRoadNetworkAt5m:graph.componentCount,unjoinedEndpoints:graph.degreeOneNodes,
 westRoadGeometryMiles:graph.totalGeometryMiles,
 westToBoundarySourceOffsetMeters:+endpointMeters.toFixed(1),
 parkLot:{...ledger.parkingAsset,routeFromRoadCertified:false},
 seasonal:{
 westOfPinkerton:"DNR identifies the County Road 519 west approach as distinct from the South Boundary vehicle closure ending at Pinkerton Trailhead.",
 easternSouthBoundary:"M-107 and the portion of South Boundary from Headquarters south to Pinkerton remain seasonally closed for vehicles Dec 1 until deemed safe.",
 presentAccessVerified:false,countyTurnByTurnVerified:false,parkParkingOpenVerified:false},
 restrictions:ledger.evidenceLimitations,
 routesAllowed:false,ETAallowed:false,
 doNotConfuse:"The named 17 MGF Presque Isle Rd pieces connect to western South Boundary. Neither data source certifies a full legal trip from Wakefield, plowed road, signed last-mile entrance, or bridge safety.",
 officialDnrSaysWinterAccess:true
};
const out=path.join(root,"public/porcupine-mountains");
await fs.writeFile(path.join(out,"west-access-evidence.json"),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(out,"west-road-reference.geojson"),JSON.stringify(gj));
console.log(JSON.stringify({status:summary.status,roadCount:west.length,southBoundaryCount:boundary.length,roadComponent5m:graph.componentCount,roadEndpointNodes:graph.degreeOneNodes,roadGeometryMiles:graph.totalGeometryMiles,junctionOffsetMeters:summary.westToBoundarySourceOffsetMeters},null,2));
