#!/usr/bin/env node
/**
 * Porkies DNR geographic source research, deliberately NOT a visitor route release.
 *
 * Run: node scripts/research-porkies-gis.mjs
 * Output: artifacts/porkies/ (not public assets). An audited parking asset point
 * is NOT an approved parking entrance; DNR GIS Open is NOT live trail status.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts', 'porkies');
const TRAILS = 'https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/2/query';
const PARKING = 'https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/6/query';
const FACILITY = "FacilityName='Porcupine Mountains Wilderness State Park'";
const BBOX = '-90,46.65,-89.55,46.92';
const EXPECTED_REFERENCE = {
  'Porcupine Mountain Wilderness Escarpment Trail': 3.7,
  'Porcupine Mountain Wilderness Lake Superior Trail': 15.6,
  'Porcupine Mountain Wilderness Government Peak Trail': 6.4,
  'Porcupine Mountain Wilderness North Mirror Lake Trail': 3.5
};
function buildUrl(base, params) {
  const u = new URL(base);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  return u.href;
}
async function request(base, params) {
  const url = buildUrl(base, params);
  let error;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const response = await fetch(url, { headers:{accept:'application/geo+json, application/json'}, signal:AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('HTTP '+response.status);
      const data = await response.json();
      if (data.error) throw new Error('ArcGIS error '+JSON.stringify(data.error));
      return data;
    } catch (e) { error = e; if (attempt<2) await new Promise(r=>setTimeout(r,500*(attempt+1))); }
  }
  throw new Error('DNR GIS request failed: '+error.message);
}
function haversineMiles(a,b) {
  if(!Array.isArray(a)||!Array.isArray(b)||a.length<2||b.length<2) return 0;
  const R=3958.7613, rad=Math.PI/180;
  const dlat=(b[1]-a[1])*rad, dlon=(b[0]-a[0])*rad;
  const h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function featureMiles(feature) {
  const geometry=feature.geometry || {};
  const groups=geometry.type==='LineString'?[geometry.coordinates]:geometry.type==='MultiLineString'?geometry.coordinates:[];
  return groups.reduce((total,line)=>total+line.slice(1).reduce((m,point,i)=>m+haversineMiles(line[i],point),0),0);
}
function endpoint(feature) {
  const g=feature.geometry || {};
  const parts=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
  return parts.flatMap(line=>line?.length>1?[line[0],line[line.length-1]]:[]);
}
async function main() {
  if(process.argv.includes('--help')) {
    console.log('Fetch source data without publishing routes: node scripts/research-porkies-gis.mjs');
    return;
  }
  const countData=await request(TRAILS,{where:FACILITY,returnCountOnly:true,f:'json'});
  const expected=Number(countData.count);
  if(!Number.isInteger(expected)||expected<700||expected>1800) throw new Error('Unexpected DNR trail inventory size: '+expected);
  const items=[], ids=new Set(), size=60;
  for(let offset=0;offset<expected;offset+=size){
    const page=await request(TRAILS,{
      where:FACILITY,
      outFields:'OBJECTID,TrailNamePrimary,SegmentLengthMiles,OpenClosedStatusNonmotor,ADAAccessible,TrailApprovalStatus,last_edited_date',
      outSR:4326,returnGeometry:true,resultOffset:offset,resultRecordCount:size,
      orderByFields:'OBJECTID ASC',f:'geojson'
    });
    if(page.type!=='FeatureCollection'||!Array.isArray(page.features)) throw new Error('Unusable GIS page at '+offset);
    if(!page.features.length)throw new Error('Empty GIS batch at '+offset);
    for(const f of page.features){
      const id=Number(f.properties?.OBJECTID??f.id);
      if(!Number.isInteger(id)||ids.has(id))throw new Error('Duplicate or missing OBJECTID '+id);
      ids.add(id);
      if(!['LineString','MultiLineString'].includes(f.geometry?.type))throw new Error('Nonline geometry id '+id);
      items.push(f);
    }
    console.log('DNR trail segments extracted: '+items.length+'/'+expected);
  }
  if(items.length!==expected)throw new Error('Incomplete GIS extract '+items.length+' / '+expected);
  const groups=new Map(), snapped=new Map();
  for(const feature of items){
    const p=feature.properties||{}, name=p.TrailNamePrimary||'UNNAMED', prev=groups.get(name)||{name,segments:0,reportedMiles:0,geometryMiles:0,openGIS:0,unapproved:0};
    prev.segments++;
    prev.reportedMiles+=Number(p.SegmentLengthMiles)||0;
    prev.geometryMiles+=featureMiles(feature);
    if(p.OpenClosedStatusNonmotor==='Open')prev.openGIS++;
    if(p.TrailApprovalStatus!=='Approved')prev.unapproved++;
    groups.set(name,prev);
    for(const pt of endpoint(feature)){
      if(!Number.isFinite(pt[0])||!Number.isFinite(pt[1]))throw new Error('Invalid WGS84 endpoint');
      const key=Math.round(pt[0]*1e4)+','+Math.round(pt[1]*1e4); // approximately 8–11 m; research only
      snapped.set(key,(snapped.get(key)||0)+1);
    }
  }
  const byName=Array.from(groups.values()).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>({
    ...x,
    reportedMiles:Math.round(x.reportedMiles*1000)/1000,
    geometryMiles:Math.round(x.geometryMiles*1000)/1000,
    publishedMapMiles:EXPECTED_REFERENCE[x.name]??null,
    discrepancyRequiresReview:EXPECTED_REFERENCE[x.name]!=null&&Math.abs(x.reportedMiles-EXPECTED_REFERENCE[x.name])>0.5
  }));
  // County-scale bbox includes the park area but does not itself confer park or visitor access.
  const parking=await request(PARKING,{geometry:BBOX,geometryType:'esriGeometryEnvelope',inSR:4326,spatialRel:'esriSpatialRelIntersects',
    outFields:'OBJECTID,ASSETTYPE,ASSETDETAILTYPE,DESCRIP,OWNEDBY',outSR:4326,returnGeometry:true,resultRecordCount:200,f:'geojson'});
  if(parking.type!=='FeatureCollection'||!Array.isArray(parking.features))throw new Error('Parking layer unreadable');
  for(const f of parking.features){
    if(f.geometry?.type!=='Point'||!Array.isArray(f.geometry.coordinates))throw new Error('Parking asset geometry unusable');
  }
  const audit={
    reviewedAtUTC:new Date().toISOString(),
    status:'research-only-not-route-approved',
    sources:{trails:TRAILS,parking:PARKING},
    query:{facility:FACILITY,parkingBBoxWGS84:BBOX,expectedTrailFeatureCount:expected},
    observed:{trailSegments:items.length,distinctNames:byName.length,openGIS:items.filter(f=>f.properties?.OpenClosedStatusNonmotor==='Open').length,parkingAssetPoints:parking.features.length,
      snappedEndpointBuckets:snapped.size,isolatedEndBuckets:Array.from(snapped.values()).filter(v=>v===1).length},
    trails:byName,
    sourceTruth:['A DNR GIS Open value is not a live operational status.','A DNR managed parking asset is not necessarily the signed visitor trailhead or open parking today.','Raw lines have not been checked for NCT overlaps, bridge/ford status, connecting road access, or complete walk routes.','No visitor navigation coordinates, claimed accessibility, walking ETA or public route page should be generated directly from these raw files.'],
    blockers:['Match raw geometry against both official park maps and signed trailheads','Verify individual parking assets against DNR visitor access, legal route and public approach','Reconcile named-trail mileage mismatches, NCT overlaps and disconnected segments','Validate seasonal vehicle network independently of GIS Open status']
  };
  await fs.mkdir(OUT,{recursive:true});
  await Promise.all([
    fs.writeFile(path.join(OUT,'dnr-trails-raw.geojson'),JSON.stringify({type:'FeatureCollection',features:items})),
    fs.writeFile(path.join(OUT,'dnr-parking-asset-research.geojson'),JSON.stringify(parking)),
    fs.writeFile(path.join(OUT,'source-audit.json'),JSON.stringify(audit,null,2))
  ]);
  console.log(JSON.stringify({status:audit.status,observed:audit.observed,discrepancies:byName.filter(x=>x.discrepancyRequiresReview)},null,2));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
