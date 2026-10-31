/**
 * Reviewed OpenStreetMap trail centerlines for Hattie Cove, Pukaskwa.
 *
 * This is a STATIC, APPROVED EXTRACT (2026-10-31) of named ways. It is not an
 * officially surveyed Parks Canada trail GPS service and not navigation.
 * Never accept new route IDs, name-only matches, nearby campsite routes or
 * anonymous forest paths without manual geospatial review.
 *
 * Original ways: https://api.openstreetmap.org/api/0.6/way/<ID>/full
 * License: https://opendatacommons.org/licenses/odbl/1-0/
 */
export const TRAIL_GEOJSON_URL='/pukaskwa-national-park/trail-centerlines.geojson';
export const OSM_COPYRIGHT_URL='https://www.openstreetmap.org/copyright';
export const ODBL_URL='https://opendatacommons.org/licenses/odbl/1-0/';
export const APPROVED_WAYS=Object.freeze({
  'beach':Object.freeze([443602400,742968743,742968746,1434966488,1434966489,1434966490,1434966491]),
  'boardwalk-beach':Object.freeze([742332531,1307756994]),
  'southern-headland':Object.freeze([742973686,742973687,769800690]),
  'manito-miikana':Object.freeze([742973685]),
  'bimose-kinoomagewnan':Object.freeze([1115333798]),
});
export const OFFICIAL_OUTING_KM=Object.freeze({
  beach:2,'boardwalk-beach':1.2,'southern-headland':2.2,'manito-miikana':2,
  'bimose-kinoomagewnan':3.7,
});
const EXPECTED_CENTERLINE_KM=Object.freeze({
  beach:1.239,'boardwalk-beach':.216,'southern-headland':1.032,
  'manito-miikana':.846,'bimose-kinoomagewnan':2.033,
});
const R=6371000, TO_RAD=Math.PI/180;
const MAX_VERTEX_LEG_METRES=350; // flag a synthetic gap rather than draw it
const LIMITS={west:-86.31,east:-86.287,south:48.586,north:48.598};
const LANDMARKS=[
  {trailId:'boardwalk-beach',target:[-86.296686,48.589730],maximumMetres:60,label:'Parks Canada Horseshoe Beach'},
  {trailId:'beach',target:[-86.300158,48.591302],maximumMetres:60,label:'Parks Canada Middle Beach'},
  {trailId:'southern-headland',target:[-86.293675,48.589424],maximumMetres:60,label:'Parks Canada red chairs'},
];
const allWayIds=new Set(Object.values(APPROVED_WAYS).flat());

export function metreDistance(a,b){
  const deltaLon=(b[0]-a[0])*TO_RAD,deltaLat=(b[1]-a[1])*TO_RAD;
  const h=Math.sin(deltaLat/2)**2+
    Math.cos(a[1]*TO_RAD)*Math.cos(b[1]*TO_RAD)*Math.sin(deltaLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function lengthMetres(coords){
  return coords.slice(1).reduce((s,p,i)=>s+metreDistance(coords[i],p),0);
}
function pointToSegment(p,a,b) {
  // Within a 2 km park-area envelope, local tangent-plane projection errs by
  // far less than the 60 m correlation gate. Not a navigation algorithm.
  const x=(a[0]-p[0])*73500,y=(a[1]-p[1])*111190,
        dx=(b[0]-a[0])*73500,dy=(b[1]-a[1])*111190;
  const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x+t*dx,y+t*dy);
}
export function closestPointMetres(point,features){
  const ds=features.flatMap(f=>f.geometry.coordinates.slice(1)
    .map((p,i)=>pointToSegment(point,f.geometry.coordinates[i],p)));
  return ds.length?Math.min(...ds):Infinity;
}

export function verifyCommunityCenterlines(data){
  if(!data||data.schemaVersion!==1||data.park!=='pukaskwa'||
      data.type!=='FeatureCollection'||data.createdOn!=='2026-10-31'||
      data.licenseUrl!==ODBL_URL||data.copyrightUrl!==OSM_COPYRIGHT_URL||
      data.safety?.sourceIsNotParksCanadaCertifiedGPS!==true||
      data.safety?.noConnectingSyntheticLines!==true||
      data.safety?.noRouteNavigationOrGPXDownload!==true||
      data.safety?.noClosedWhiteRiverTrail!==true||
      data.safety?.noBackcountryTracks!==true||
      data.safety?.checkOfficialTrailConditionsFirst!==true||
      !Array.isArray(data.features)||data.features.length!==allWayIds.size||
      !Array.isArray(data.trailSummary)||data.trailSummary.length!==5) {
    throw new Error('Trail centerline source metadata or safety contract invalid');
  }
  const seen=new Set();
  const byTrail=Object.fromEntries(Object.keys(APPROVED_WAYS).map(k=>[k,[]]));
  for(const f of data.features){
    const p=f?.properties,coords=f?.geometry?.coordinates,group=p?.trailId;
    if(f?.type!=='Feature'||f?.geometry?.type!=='LineString'||!group||
       !Object.hasOwn(APPROVED_WAYS,group)||!allWayIds.has(p.osmWayId)||
       !APPROVED_WAYS[group].includes(p.osmWayId)||seen.has(p.osmWayId)||
       p.highway!=='footway'||!p.name||p.name==='Pukaskwa Coastal Hiking Trail'||
       !p.sourceUrl?.endsWith('/way/'+p.osmWayId)||
       p.license!=='ODbL 1.0'||!Number.isFinite(Date.parse(p.osmTimestamp))||
       !Array.isArray(coords)||coords.length<2||coords.length>180||
       !Number.isFinite(p.segmentLengthKm)) {
      throw new Error('Unapproved or unreviewed trail way '+String(p?.osmWayId));
    }
    for(let i=0;i<coords.length;i++){
      const [lon,lat]=coords[i]||[];
      if(!Array.isArray(coords[i])||coords[i].length!==2||
         !Number.isFinite(lon)||!Number.isFinite(lat)||
         lon<LIMITS.west||lon>LIMITS.east||lat<LIMITS.south||lat>LIMITS.north){
        throw new Error('Out-of-envelope trail vertex in '+p.osmWayId);
      }
      if(i>0&&metreDistance(coords[i-1],coords[i])>MAX_VERTEX_LEG_METRES)
        throw new Error('Potential synthetic routing gap in '+p.osmWayId);
    }
    const km=lengthMetres(coords)/1000;
    if(Math.abs(km-p.segmentLengthKm)>.007)
      throw new Error('Shape length disagrees with source in '+p.osmWayId);
    seen.add(p.osmWayId);
    byTrail[group].push(f);
  }
  const summaryIds=new Set();
  for(const summary of data.trailSummary){
    const id=summary.id,features=byTrail[id];
    if(!features||summaryIds.has(id)||summary.officialEntireOutingKm!==OFFICIAL_OUTING_KM[id]||
       summary.mappedSegmentCount!==APPROVED_WAYS[id].length||
       !Number.isFinite(summary.mappedCenterlineKm)||
       Math.abs(summary.mappedCenterlineKm-EXPECTED_CENTERLINE_KM[id])>.008)
      throw new Error('Unreviewed trail mileage or incomplete route summary '+String(id));
    summaryIds.add(id);
    const endpoints=features.map(f=>[f.geometry.coordinates[0],f.geometry.coordinates.at(-1)]);
    const reachable=new Set([0]);
    let changed=true;
    while(changed){
      changed=false;
      for(let i=0;i<features.length;i++){
        if(reachable.has(i))continue;
        for(const other of reachable){
          if(endpoints[i].some(a=>endpoints[other].some(b=>metreDistance(a,b)<=3))){
            reachable.add(i);changed=true;break;
          }
        }
      }
    }
    if(reachable.size!==features.length) throw new Error('Disconnected path fragments for '+id);
  }
  for(const ref of LANDMARKS){
    if(closestPointMetres(ref.target,byTrail[ref.trailId])>ref.maximumMetres)
      throw new Error('Named route no longer correlates with '+ref.label);
  }
  return data;
}

export function groupForTrail(data,trailId) {
  if(!data||!Object.hasOwn(APPROVED_WAYS,trailId))return [];
  return data.features.filter(f=>f.properties.trailId===trailId);
}
export function summaryForTrail(data,trailId) {
  return data?.trailSummary?.find(r=>r.id===trailId)||null;
}
