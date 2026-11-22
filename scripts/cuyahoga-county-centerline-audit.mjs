#!/usr/bin/env node
// Offline geographic crosswalk of county road centerlines and USACE channel area.
// Road centerlines and channel polygons are NOT survey-grade bridge span axes.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const METERS_PER_DEG = 111195;
const LAT_COS = Math.cos(41.5 * Math.PI / 180);
const MAX_NEAR_REFERENCE_METERS = 50;
const MIN_CHANNEL_OVERLAP_METERS = 10;
const byId = {
  'center-st-139': 'Center Street',
  'columbus-193': 'Columbus Road',
  'carter-243': 'Carter Road',
  'west-third-369': 'W 3rd Street',
  'main-avenue-101': 'Main Avenue',
  'eagle-280': 'Eagle Avenue'
};
const xy = c => ({ x: (c[0] + 81.7) * METERS_PER_DEG * LAT_COS, y: (c[1] - 41.5) * METERS_PER_DEG });
const delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const cross = (a, b) => a.x * b.y - a.y * b.x;
const clamp = n => Math.max(0, Math.min(1, n));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const round = n => Math.round(n*10)/10;
const coords = f => f?.geometry?.type === 'LineString' ? f.geometry.coordinates : null;
const projectSegments = line => {
  if (!Array.isArray(line) || line.length < 2) return [];
  const points=line.map(xy);return points.slice(1).map((b,i)=>[points[i],b]).filter(([a,b])=>dist(a,b)>.001);
};
function lineDistance(p, segments) {
  let best=Infinity;
  for (const [a,b] of segments) {
    const v=delta(a,b), len2=v.x*v.x+v.y*v.y;
    const t=clamp(((p.x-a.x)*v.x+(p.y-a.y)*v.y)/len2);
    best=Math.min(best,dist(p,{x:a.x+v.x*t,y:a.y+v.y*t}));
  }
  return best;
}
function pointInsideRing(p, ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
function pointInsidePolygons(p, polygons){
  return polygons.some(rings=>rings.length && pointInsideRing(p,rings[0]) &&
    !rings.slice(1).some(hole=>pointInsideRing(p,hole)));
}
function intersectionTs(a,b,ring) {
  const d=delta(a,b),out=[];
  for (let i=0;i<ring.length;i++) {
    const s=ring[i],e=ring[(i+1)%ring.length],v=delta(s,e),den=cross(d,v);
    if(Math.abs(den)<1e-9)continue;
    const q=delta(a,s),t=cross(q,v)/den,u=cross(q,d)/den;
    if(t>=0&&t<=1&&u>=0&&u<=1)out.push(t);
  }
  return out;
}
export function segmentOverlapMeters(a,b,polygons) {
  const v=delta(a,b),len=dist(a,b);
  if(len<=0)return 0;
  const t=[0,1];
  for(const rings of polygons)for(const ring of rings)t.push(...intersectionTs(a,b,ring));
  t.sort((x,y)=>x-y);
  let overlap=0;
  for(let i=1;i<t.length;i++){
    if(t[i]-t[i-1]<1e-10)continue;
    const mid=(t[i]+t[i-1])/2;
    if(pointInsidePolygons({x:a.x+v.x*mid,y:a.y+v.y*mid},polygons))
      overlap+=len*(t[i]-t[i-1]);
  }
  return overlap;
}
function polygonShapes(geojson) {
  if(geojson?.type!=='FeatureCollection'||!Array.isArray(geojson.features))throw Error('Expected USACE GeoJSON FeatureCollection');
  const f=geojson.features.filter(x=>String(x.properties?.sdsfeaturename||'').toUpperCase()==='CUYAHOGA RIVER');
  if(f.length!==1||f[0].geometry?.type!=='Polygon')throw Error('Exactly one valid USACE Cuyahoga channel polygon required');
  const rings=f[0].geometry.coordinates.map(r=>r.map(xy));
  if(!rings.length || rings[0].length<4)throw Error('Empty channel polygon');
  return [rings];
}
function readRoads(geojson) {
  if(geojson?.type!=='FeatureCollection'||!Array.isArray(geojson.features))throw Error('Expected county centerline GeoJSON');
  const roads=new Map();
  for(const f of geojson.features) {
    const name=String(f.properties?.fullname||'');
    if(!Object.values(byId).includes(name))continue;
    const line=coords(f);
    if(!line||line.length<2)continue;
    const entries=roads.get(name)||[];
    entries.push({id:f.properties?.OBJECTID,geometry:projectSegments(line)});
    roads.set(name,entries);
  }
  return roads;
}
export function auditCountyCenterlines(catalog,county,usace) {
  if(catalog?.schemaVersion!==1||!Array.isArray(catalog.bridges)||catalog.excludedFromFutureEtas!==true)
    throw Error('Expected source-validated NOAA Coast Pilot catalog with ETA disabled');
  const polygons=polygonShapes(usace),roads=readRoads(county);
  const rows=Object.entries(byId).map(([bridgeId,roadName])=>{
    const bridge=catalog.bridges.find(x=>x.id===bridgeId);
    if(!bridge||bridge.channel!=='main'||bridge.coordinateRole!=='NOAA_COAST_PILOT_ROUNDED_REFERENCE_NOT_SURVEYED_SPAN_AXIS')
      throw Error('Missing NOAA charted bridge point');
    const p=xy([bridge.longitude,bridge.latitude]);
    const lines=roads.get(roadName)||[];
    const examined=lines.map(line=>{
      const nearestMeters=lineDistance(p,line.geometry);
      const overlapMeters=line.geometry.reduce((n,[a,b])=>n+segmentOverlapMeters(a,b,polygons),0);
      return {countyObjectId:line.id,nearestMeters:round(nearestMeters),
        channelOverlapMeters:round(overlapMeters)};
    }).sort((a,b)=>a.nearestMeters-b.nearestMeters);
    const matching=examined.filter(x=>x.nearestMeters<=MAX_NEAR_REFERENCE_METERS&&
      x.channelOverlapMeters>=MIN_CHANNEL_OVERLAP_METERS);
    const nearest=examined[0]||null;
    return {
      bridgeId,riverMile:bridge.riverMile,roadName,countySourceFeatureCount:examined.length,
      closestRoadCenterlineMeters:nearest?.nearestMeters??null,
      closestCountyObjectId:nearest?.countyObjectId??null,
      matchedSegments:matching,
      status:matching.length?'COUNTY_ROAD_CENTERLINE_OVERLAPS_CHANNEL_NEAR_CHART_REFERENCE':
        !examined.length?'NO_NAMED_COUNTY_ROAD_GEOMETRY':
        nearest.nearestMeters>MAX_NEAR_REFERENCE_METERS?'COUNTY_ROAD_GEOMETRY_TOO_FAR':
        'NEARBY_COUNTY_ROAD_WITHOUT_CONFIRMED_CHANNEL_OVERLAP',
      surveyedBridgeAxisValidated:false,bridgeOperatingStatus:'UNKNOWN'
    };
  });
  return {
    schemaVersion:1,kind:'OFFICIAL_ROAD_CENTERLINE_CHANNEL_OVERLAP_RESEARCH',
    sources:[
      'https://gis.cuyahogacounty.gov/server/rest/services/NCGIDE/Addressing_Sites_Streets/FeatureServer/1',
      'https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/National_Channel_Framework/MapServer/1',
      catalog.sourceUrl
    ], projection:'LOCAL_EQUIRECTANGULAR_APPROXIMATION_FOR_RESEARCH_METRIC_DISTANCES',
    statusesNotBridgeAxisProof:true,surveyedBridgeAxisValidated:false,
    bridgeCrossingTimeValidated:false,visitorDirectionsVerified:false,
    futureArrivalPredictionEnabled:false,checks:rows,
    warning:'A mapped road centerline overlapping the USACE authorized channel area is not a surveyed movable bridge span or opening event. No inference for missing segments.'
  };
}
async function main(args) {
  if(args.length!==8||args[0]!=='--county'||args[2]!=='--usace'||args[4]!=='--coast-pilot'||args[6]!=='--out')
    throw Error('Usage: --county road-lines.geojson --usace channel-area.geojson --coast-pilot catalog.json --out summary.json');
  const [county,usace,catalog]=await Promise.all([args[1],args[3],args[5]].map(path=>readFile(path,'utf8').then(JSON.parse)));
  const result=auditCountyCenterlines(catalog,county,usace);
  await writeFile(args[7],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({kind:result.kind,checks:result.checks.map(({bridgeId,status,closestRoadCenterlineMeters,matchedSegments})=>({bridgeId,status,closestRoadCenterlineMeters,matchedSegments})),futureArrivalPredictionEnabled:false},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
