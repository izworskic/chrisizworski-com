#!/usr/bin/env node
/**
 * County Road 519 western approach SOURCE TRACE, not a legal live turn-by-turn route.
 * Official DNR explicitly directs winter visitors to US-28 -> County Road 519 north.
 * Michigan Geographic Framework road centerlines use PR 1475809 and names
 * "Thomaston Rd"/"Presque Isle Rd" rather than the visitor-facing CR519 designation.
 * Road class/name association remains a research crosswalk, not governmental route signage.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {graphAudit,closestLine,parts,lengthMeters,distance} from "../lib/porkies/route-topology.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const AREA="-90.045,46.40,-89.90,46.72", SCENIC="-89.990,46.688,-89.958,46.719";
const MGF="https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20/query";
const DNR="https://www.michigan.gov/recsearch/parks/porkies";
const PROGRAM="https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/Explorer/Porkies-VC-programs.pdf";
const query=(base,p)=>base+"?"+Object.entries(p).map(([k,v])=>k+"="+encodeURIComponent(v)).join("&");
const region=(bbox)=>({geometry:bbox,geometryType:"esriGeometryEnvelope",inSR:4326,spatialRel:"esriSpatialRelIntersects"});
async function arc(params){
 let error;
 for(let i=0;i<3;i++){
  try{const r=await fetch(query(MGF,params),{headers:{accept:"application/geo+json,application/json"},signal:AbortSignal.timeout(35000)});if(!r.ok)throw Error("HTTP "+r.status);const j=await r.json();if(j.error)throw Error(JSON.stringify(j.error));return j;}
  catch(e){error=e;if(i<2)await new Promise(resolve=>setTimeout(resolve,700*(i+1)));}
 }
 throw Error("Official road source unavailable "+error);
}
async function geometry(where,bbox,limit){
 const geo=region(bbox), count=(await arc({where,...geo,returnCountOnly:true,f:"json"})).count;
 if(!Number.isInteger(count)||count<1||count>limit)throw Error("Unexpected MGF count "+count);
 const r=await arc({where,...geo,outFields:"OBJECTID,RDNAME,NAME,NFC,FETYPE,PR,LEGALSYSTEM,LENGTH",returnGeometry:true,outSR:4326,orderByFields:"OBJECTID ASC",resultRecordCount:100,f:"geojson"});
 if(r.type!=="FeatureCollection"||r.features?.length!==count||r.features.some(f=>!parts(f).length))throw Error("Incomplete MGF geometry "+where);
 const ids=r.features.map(f=>f.properties.OBJECTID);
 if(new Set(ids).size!==count)throw Error("Duplicate road IDs");
 return r.features;
}
function simplify(line,t=8){
 if(line.length<=2)return line.map(p=>p.map(x=>+x.toFixed(6)));
 function meter(p){const r=46.6*Math.PI/180;return [p[0]*111320*Math.cos(r),p[1]*111320];}
 const p=line.map(meter),keep=new Set([0,p.length-1]),stack=[[0,p.length-1]];
 while(stack.length){const [a,b]=stack.pop(),v=[p[b][0]-p[a][0],p[b][1]-p[a][1]];let best=t,idx=-1;const z=v[0]*v[0]+v[1]*v[1]||1;
  for(let i=a+1;i<b;i++){const q=p[i],h=Math.max(0,Math.min(1,((q[0]-p[a][0])*v[0]+(q[1]-p[a][1])*v[1])/z));const d=Math.hypot(q[0]-p[a][0]-h*v[0],q[1]-p[a][1]-h*v[1]);if(d>best){best=d;idx=i;}}
  if(idx>0){keep.add(idx);stack.push([a,idx],[idx,b]);}
 }
 return [...keep].sort((a,b)=>a-b).map(i=>line[i].map(n=>+n.toFixed(6)));
}
const parking=JSON.parse(await fs.readFile(path.join(root,"public/porcupine-mountains/access-points.json"),"utf8")).points.find(x=>x.id==="presque");
if(!parking||parking.parkingAssetId!==841)throw Error("Parking crosswalk changed");
const west=await geometry("PR = 1475809",AREA,75);
const boundary=await geometry("RDNAME = 'S Boundary Rd'",SCENIC,25);
const interior=await geometry("RDNAME = 'Porcupine Mtn W SP Access'",SCENIC,25);
if(west.length!==27||boundary.length!==3||interior.length!==9)throw Error("MGF source ID/name inventory changed: manual review");
if(west.some(f=>!["Presque Isle Rd","Thomaston Rd"].includes(f.properties.RDNAME)))throw Error("Unexpected route name in PR group");
const metrics=[3,5,10].map(m=>graphAudit(west,m,"RDNAME"));
const nearLot=closestLine([parking.lon,parking.lat],west),nearPublicAccess=closestLine([parking.lon,parking.lat],interior);
const hasName=Object.fromEntries([...new Set(west.map(x=>x.properties.RDNAME))].map(name=>[name,west.filter(x=>x.properties.RDNAME===name).length]));
const allMiles=west.flatMap(parts).reduce((n,c)=>n+lengthMeters(c),0)/1609.344;
// Road source linkage is not certified to reach either exact US-28 turn or the DNR parking lot.
const evidence={
 asOf:"2026-10-28",status:"west-approach-source-crosswalk-not-road-route",sourceMGF:MGF,
 originalRoadIDs:west.map(f=>f.properties.OBJECTID),
 sourceMGFPropertyReference:1475809,sourceNames:hasName,westRecords:west.length,
 northBoundaryRecords:boundary.length,scenicAreaAccessRecords:interior.length,
 sourceLineworkMiles:+allMiles.toFixed(2),
 graphComponents:metrics.map(q=>({toleranceMeters:q.snapMeters,components:q.componentCount,endpoints:q.degreeOneNodes})),
 parkingAssetId:parking.parkingAssetId,sourceLineDistanceToParkingMeters:+nearLot.meters.toFixed(1),
 nearestParkAccessCenterlineMeters:+nearPublicAccess.meters.toFixed(1),
 sourceEvidence:[{name:"Michigan DNR current park access rules",url:DNR},{name:"Michigan DNR winter programs, Feb 2026",url:PROGRAM}],
 visitorGuidance:"DNR directs visitors approaching Presque Isle in winter to use County Road 519 north from US-28 just east of Wakefield. The separate ski area is approached from the east via M-64. Do not drive South Boundary Road as a winter cross-park shortcut.",
 mapDisplayRule:"The MGF records follow Thomaston Road and Presque Isle Road under road-network PR 1475809. Neither the name change nor apparent continuity certifies official road 519 signage, live gate conditions, legal turns or drivable clearance. This is not an independently verified complete path from US-28 to the mapped parking asset.",
 crossParkThroughVehicleRouteCertified:false,pointToPointDrivingDirectionsCertified:false,seasonalRoadOpeningCertified:false,currentRoadStatus:"unverified",
 warnings:["South Boundary Road has documented seasonal vehicle closures. Never infer access to east-side attractions through closed segments.","MGF road name/PR continuity is source geometry, not state route designation signage.","Current winter plowing, ice, closures, precise parking entrance and road-to-lot turn remain unknown.","MGF road centerlines do not include live closures, barricades, directionality, speed, driving time or user-specific origin."]
};
const publicGeo={type:"FeatureCollection",features:west.map(f=>({type:"Feature",properties:{id:f.properties.OBJECTID,name:f.properties.RDNAME,mgfPR:f.properties.PR,source:"Michigan Geographic Framework",notRoute:true,seasonalStatus:"not-live-verified",roadDesignation:"candidate-west-approach-crosswalk"},geometry:{type:f.geometry.type,coordinates:f.geometry.type==="LineString"?simplify(f.geometry.coordinates):f.geometry.coordinates.map(x=>simplify(x))}}))};
const dir=path.join(root,"public/porcupine-mountains");
await fs.writeFile(path.join(dir,"west-approach-evidence.json"),JSON.stringify(evidence,null,2));
await fs.writeFile(path.join(dir,"west-approach-reference.geojson"),JSON.stringify(publicGeo));
console.log(JSON.stringify({status:evidence.status,sourceCounts:{west:west.length,boundary:boundary.length,access:interior.length},graphComponents:evidence.graphComponents,sourceNames:hasName,miles:evidence.sourceLineworkMiles,parkingOffsetMeters:evidence.sourceLineDistanceToParkingMeters},null,2));
