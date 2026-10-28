#!/usr/bin/env node
/**
 * Research-grade trail/road topology from official DNR and MGF geometry.
 * Does not create a public driving/hiking router or claim any on-the-ground crossing is safe.
 * Run: node scripts/research-porkies-routing.mjs [--emit-public-research]
 */
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {graphAudit,closestLine,parts,metric,classifyRoad,roadGate} from "../lib/porkies/route-topology.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ART=path.join(ROOT,"artifacts/porkies-routing");
const PAGE=path.join(ROOT,"public/porcupine-mountains");
const TRAIL="https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/2/query";
const SKI="https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/5/query";
const ROAD="https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20/query";
const FACILITY="FacilityName='Porcupine Mountains Wilderness State Park'";
const BBOX="-90.04,46.69,-89.57,46.86";
const CURRENT_MAP={"Porcupine Mountain Wilderness Escarpment Trail":3.7,"Porcupine Mountain Wilderness Lake Superior Trail":15.6,"Porcupine Mountain Wilderness Government Peak Trail":6.4,"Porcupine Mountain Wilderness North Mirror Lake Trail":3.5};
const KNOWN_CROSSING="https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf";
function u(base,params){let x=new URL(base);for(let [k,v] of Object.entries(params))x.searchParams.set(k,String(v));return x.href;}
async function get(base,params){
 let err;
 for(let retry=0;retry<3;retry++){
  try{
   let r=await fetch(u(base,params),{signal:AbortSignal.timeout(35000),headers:{accept:"application/geo+json, application/json"}});
   if(!r.ok)throw Error("HTTP "+r.status);
   const x=await r.json();
   if(x.error)throw Error("ArcGIS "+JSON.stringify(x.error));
   return x;
  }catch(e){err=e;if(retry<2)await new Promise(resolve=>setTimeout(resolve,500+retry*700));}
 }
 throw Error("ArcGIS data unavailable after retries: "+err.message);
}
async function download(base,filter,fields,maxExpected){
 const count=(await get(base,{...filter,where:filter.where||"1=1",returnCountOnly:true,f:"json"})).count;
 if(!Number.isInteger(count)||count<30||count>maxExpected)throw Error("Unexpected source count "+count+" (max "+maxExpected+")");
 const result=[],seen=new Set(),size=55;
 for(let offset=0;offset<count;offset+=size){
  const x=await get(base,{...filter,where:filter.where||"1=1",outFields:fields,returnGeometry:true,outSR:4326,orderByFields:"OBJECTID ASC",resultOffset:offset,resultRecordCount:size,f:"geojson"});
  if(x.type!=="FeatureCollection"||!x.features?.length)throw Error("Missing source geometry at offset "+offset);
  for(const f of x.features){
   const id=Number(f.properties?.OBJECTID??f.id);
   if(!Number.isInteger(id)||seen.has(id)||!parts(f).length)throw Error("Duplicate/bad geometry ID "+id);
   seen.add(id);result.push(f);
  }
 }
 if(result.length!==count)throw Error("Incomplete source "+result.length+"/"+count);
 return result;
}
function simplify(line,toleranceMeters=8){
 if(line.length<3)return line;
 const q=line.map(metric),keep=new Set([0,line.length-1]),stack=[[0,line.length-1]];
 while(stack.length){
  const [i,j]=stack.pop(),a=q[i],b=q[j];let best=toleranceMeters,k=-1;
  const vx=b[0]-a[0],vy=b[1]-a[1],l=Math.max(1e-8,vx*vx+vy*vy);
  for(let t=i+1;t<j;t++){
   const z=q[t],f=Math.max(0,Math.min(1,((z[0]-a[0])*vx+(z[1]-a[1])*vy)/l));
   const d=Math.hypot(z[0]-a[0]-f*vx,z[1]-a[1]-f*vy);
   if(d>best){best=d;k=t;}
  }
  if(k>=0){keep.add(k);stack.push([i,k],[k,j]);}
 }
 return [...keep].sort((a,b)=>a-b).map(i=>line[i].map(n=>+n.toFixed(6)));
}
function preview(f,nameField){
 const lines=parts(f).map(line=>simplify(line)).filter(x=>x.length>=2);
 return {type:"Feature",properties:{id:f.properties?.OBJECTID??f.id,name:f.properties?.[nameField]??"Unnamed",source:"official-source-geometry",routingCertified:false},geometry:lines.length===1?{type:"LineString",coordinates:lines[0]}:{type:"MultiLineString",coordinates:lines}};
}
async function run(){
 if(process.argv.includes("--help")){console.log("Research DNR/MDOT roads and trails only; --emit-public-research creates non-routable map overlays");return;}
 const park=JSON.parse(await fs.readFile(path.join(PAGE,"access-points.json"),"utf8"));
 if(park.points.length!==6)throw Error("Access crosswalk must have six signed-off candidates");
 const trails=await download(TRAIL,{where:FACILITY},"OBJECTID,TrailNamePrimary,SegmentLengthMiles,OpenClosedStatusNonmotor,TrailApprovalStatus,ADAAccessible,last_edited_date",2000);
 const roads=await download(ROAD,{where:"1=1",geometry:BBOX,geometryType:"esriGeometryEnvelope",inSR:4326,spatialRel:"esriSpatialRelIntersects"},"OBJECTID,RDNAME,NAME,FETYPE,NFC,PR,LEGALSYSTEM,LENGTH",1200);
 const ski=await download(SKI,{where:FACILITY},"OBJECTID,TrailNamePrimary,SegmentLengthMiles,OpenClosedStatusNonmotor,TrailApprovalStatus",400);
 const tests=[3,5,10,15].map(n=>graphAudit(trails,n));
 const roadTests=[3,5,10].map(n=>graphAudit(roads,n,"RDNAME"));
 const skiTests=[3,5,10].map(n=>graphAudit(ski,n));
 const tagged={};
 for(let f of roads){const t=classifyRoad(f);tagged[t]=(tagged[t]||0)+1;}
 const references=park.points.map(p=>{
  let n=closestLine([p.lon,p.lat],trails),r=closestLine([p.lon,p.lat],roads);
  return {id:p.id,parkingAssetId:p.parkingAssetId,trailNearest:n&&{meters:+n.meters.toFixed(1),sourceId:n.sourceId,name:n.name},roadNearest:r&&{meters:+r.meters.toFixed(1),sourceId:r.sourceId,name:r.name},footRouteCertified:false,driveRouteCertified:false};
 });
 const discrepancies=tests[1].names.filter(z=>CURRENT_MAP[z.name]!=null).map(z=>({
  name:z.name,sourceGeometryMiles:z.miles,publishedMapMiles:CURRENT_MAP[z.name],coverageRatio:+(z.miles/CURRENT_MAP[z.name]).toFixed(3),fullTrailClaimAllowed:false
 }));
 const audit={
  status:"source-geometry-research-not-verified-directions",reviewedOn:"2026-10-28",
  sources:{trailService:TRAIL,roadService:ROAD,skiService:SKI,map:KNOWN_CROSSING},
  footprints:{roadBoundingBox:BBOX,trailFacility:FACILITY,limits:"Road data clipped to research envelope; not a complete trip from Wisconsin, Ontonagon or across county."},
  features:{trailCount:trails.length,roadCount:roads.length,skiCount:ski.length},
  trailAudits:tests,roadAudits:roadTests,skiAudits:skiTests,roadNameClasses:tagged,parkingConnections:references,discrepancies,
  unverifiedHazards:["Winter ski GIS Open is administrative and not a live grooming or ski-area operating report","Unbridged stream crossing map symbols lack crosswalked machine coordinates","No verified bridge passability, water level or season","Non-endpoint intersections are deliberately NOT snapped as junctions","Cross-trail/shared NCT overlapping designations are not route deduplicated","Road geospatial records provide no open gate, legal turn or winter plowing information","Snapped geometric components are not guaranteed usable trails","Walking distance and driving ETA remain unpublished"]
 };
 if(trails.length!==819||ski.length!==40||tests[1].componentCount<2||tests[1].componentCount>40||discrepancies.find(x=>x.name.includes("Escarpment"))?.coverageRatio>0.35)throw Error("Unexpected geometry coverage audit: manual source review required");
 const visibleTrail=trails.filter(f=>f.properties?.TrailApprovalStatus==="Approved");
 const highlights=roads.filter(f=>classifyRoad(f)!=="unclassified");
 const trailsGeo={type:"FeatureCollection",features:visibleTrail.map(f=>preview(f,"TrailNamePrimary"))};
 const skiGeo={type:"FeatureCollection",features:ski.map(f=>preview(f,"TrailNamePrimary"))};
 const roadsGeo={type:"FeatureCollection",features:highlights.map(f=>{
  const z=preview(f,"RDNAME");z.properties.corridor=classifyRoad(f);z.properties.seasonalRoadClosureRisk=["south-boundary","m107","summit-road"].includes(z.properties.corridor);return z;
 })};
 await fs.mkdir(ART,{recursive:true});
 await Promise.all([
  fs.writeFile(path.join(ART,"routing-source-audit.json"),JSON.stringify(audit,null,2)),
  fs.writeFile(path.join(ART,"trail-reference.geojson"),JSON.stringify(trailsGeo)),
  fs.writeFile(path.join(ART,"ski-reference.geojson"),JSON.stringify(skiGeo)),
  fs.writeFile(path.join(ART,"park-road-reference.geojson"),JSON.stringify(roadsGeo))
 ]);
 if(process.argv.includes("--emit-public-research")){
  await fs.writeFile(path.join(PAGE,"routing-evidence.json"),JSON.stringify({
   status:"geometry-not-navigable",reviewedOn:audit.reviewedOn,sources:audit.sources,
   audit:{trailFeatures:trails.length,roadFeatures:roads.length,skiFeatures:ski.length,trailComponents5m:tests[1].componentCount,roadComponents5m:roadTests[1].componentCount,skiComponents5m:skiTests[1].componentCount,sourceTrailMiles:tests[1].totalGeometryMiles,knownRouteCoverageDiscrepancies:discrepancies},
   parkingConnections:references,
   noPublicRouteTimes:true,noCrossingSafetyCertification:true,seasonalRoadRules:{m107:roadGate("m107","winter"),southBoundary:roadGate("south-boundary","spring")},
   geometryFiles:["trail-reference.geojson","park-road-reference.geojson","ski-reference.geojson"]
  },null,2));
  await fs.writeFile(path.join(PAGE,"trail-reference.geojson"),JSON.stringify(trailsGeo));
  await fs.writeFile(path.join(PAGE,"ski-reference.geojson"),JSON.stringify(skiGeo));
  await fs.writeFile(path.join(PAGE,"park-road-reference.geojson"),JSON.stringify(roadsGeo));
 }
 console.log(JSON.stringify({status:audit.status,features:audit.features,components:tests.map(t=>({snapMeters:t.snapMeters,count:t.componentCount,ends:t.degreeOneNodes})),roadNames:tagged,parking:references,discrepancies,emitted:process.argv.includes("--emit-public-research")},null,2));
}
run().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
