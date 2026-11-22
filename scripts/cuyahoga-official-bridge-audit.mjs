#!/usr/bin/env node
// Offline official source crosswalk. Bridge inventory points and channel polygons are not surveyed crossing axes.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CHANNEL_ID = 'CELRB_LB_05_CUY';
const CLAIM = 'BRIDGE_INVENTORY_POINT_NOT_EXACT_SPAN';
function nearMeters(a,b) {
  const r = Math.PI / 180;
  const dLat = (a[1]-b[1])*r, dLon = (a[0]-b[0])*r;
  const lat1=a[1]*r, lat2=b[1]*r;
  return 2*6371000*Math.asin(Math.min(1, Math.sqrt(Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2)));
}
function signed(v) { return Number.isFinite(v) && Math.abs(v) <= 180; }
function pointInRing(point, ring) {
  let inside=false;
  const [x,y]=point;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [a,b]=ring[i],[c,d]=ring[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
  }
  return inside;
}
function inPolygon(point, poly) {
  if(!Array.isArray(poly)||!Array.isArray(poly[0])||!pointInRing(point,poly[0])) return false;
  return !poly.slice(1).some(ring=>pointInRing(point,ring));
}
export function auditOfficialGeometry(odot, usace, curated) {
  if(odot?.type!=='FeatureCollection'||usace?.type!=='FeatureCollection'||
    !Array.isArray(odot.features)||!Array.isArray(usace.features)||
    curated?.schemaVersion!==1||curated.pointStatus!==CLAIM||
    !Array.isArray(curated.bridges)||curated.bridges.length<2) throw Error('Missing official GIS provenance or invalid curated references');
  const channel = usace.features.filter(f=>f?.properties?.channelareaidpk===CHANNEL_ID);
  if(channel.length!==1||channel[0].geometry?.type!=='Polygon'||!Array.isArray(channel[0].geometry.coordinates)) throw Error('Cuyahoga official channel area absent or ambiguous');
  const bySfn=new Map();
  for(const f of odot.features) {
    const sfn=String(f?.properties?.SFN||'');
    if(bySfn.has(sfn)) throw Error('Duplicate official ODOT SFN');
    bySfn.set(sfn,f);
  }
  const ids=new Set();
  const checks=curated.bridges.map(b=>{
    if(ids.has(b.officialStructureFileNumber)) throw Error('Duplicate curated bridge');
    ids.add(b.officialStructureFileNumber);
    if(!b.id||b.id!==b.officialStructureFileNumber||b.coordinateRole!=='ODOT_INVENTORY_POINT'||
       b.verifiedVisitorEntrance!==false||b.bridgeOperationalStatus!=='UNKNOWN'||b.coordinateSource!==curated.sourceUrl||
       !signed(b.lon)||!signed(b.lat)||Math.abs(b.lat)>90||
       (b.riverMile!==null&&!Number.isFinite(b.riverMile))) throw Error('Unverified bridge status or coordinate claim');
    const feature=bySfn.get(b.officialStructureFileNumber);
    if(feature?.geometry?.type!=='Point'||!Array.isArray(feature.geometry.coordinates)||feature.geometry.coordinates.length<2) throw Error('ODOT inventory bridge absent');
    const coordinate = feature.geometry.coordinates.slice(0,2);
    if(!coordinate.every(signed))throw Error('Invalid official position');
    const delta=nearMeters([b.lon,b.lat],coordinate);
    if(delta>2) throw Error('Curated bridge point drifted from ODOT source');
    if(String(feature.properties?.STR_LOC_CARRIED||'')!==b.odotCarried ||
       String(feature.properties?.INVENT_FEAT||'')!==b.odotCrossed ||
       (feature.properties?.GEN_OPR_STATUS??null)!==b.rawGeneralOperatingStatusCode)
       throw Error('Curated bridge metadata differs from official source');
    const polygon=channel[0].geometry.coordinates;
    return {bridgeId:b.id,name:b.name,odotSfn:b.officialStructureFileNumber,lat:b.lat,lon:b.lon,
      cfrRiverMile:b.riverMile,officialPointMatchMeters:Math.round(delta*10)/10,
      withinUsaceAuthorizedChannelArea:inPolygon([b.lon,b.lat],polygon),
      evidence:'ODOT_BRIDGE_POINT_USACE_CHANNEL_AREA_REFERENCE_ONLY',
      crossingAxisValidated:false,bridgeOpenStatusValidated:false,visitorAccessValidated:false};
  });
  return {audit:'OFFICIAL_BRIDGE_POINTS_MATCH_NOAA_ETA_DISABLED',checkedAt:curated.checkedAt,
    sourceUrls:[curated.sourceUrl,'https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/National_Channel_Framework/MapServer/1'],
    usaceFeatureId:CHANNEL_ID,usaceSourceDataset:channel[0].properties.mediaidfk||null,
    officialInventoryCount:odot.features.length,selectedBridgeCount:checks.length,
    bridgeCrossingsValidated:false,bridgeEtasEnabled:false,checks,
    limitation:'ODOT points do not locate surveyed span axes, and USACE authorized channel polygon cannot be assumed to be a vessel path or a safe public approach.'};
}
async function main(args){
  if(args.length!==8||args[0]!=='--odot'||args[2]!=='--usace'||args[4]!=='--curated'||args[6]!=='--out')
    throw Error('Usage: node scripts/cuyahoga-official-bridge-audit.mjs --odot geojson --usace geojson --curated inventory.json --out report.json');
  const files=await Promise.all([args[1],args[3],args[5]].map(f=>readFile(f,'utf8').then(JSON.parse)));
  const report=auditOfficialGeometry(...files);
  await writeFile(args[7],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({selectedBridgeCount:report.selectedBridgeCount,bridgeEtasEnabled:report.bridgeEtasEnabled,
    checks:report.checks.map(x=>({bridgeId:x.bridgeId,withinUsaceAuthorizedChannelArea:x.withinUsaceAuthorizedChannelArea}))},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
