'use strict';

// Authoritative geometry is *not* a permission or a constructed walking path.
// Match exact NPS named assets, then cross-check official active park alerts.
// No browser-supplied geometry and no inferred NASA exclusion polygons.
const EDDY = require('../data/space-coast-eddy-creek-nps-gis.json');
const { npsLotClosure, npsParkWideClosure } = require('./space-coast-decision');

const OFFICIAL_NPS = 'https://www.nps.gov/cana/park-alerts-cana.json';
const CONDITIONS_URL = 'https://www.nps.gov/cana/planyourvisit/conditions.htm';
const MAX_CHECK_AGE_MS = 90 * 60000;
const EARTH_M_PER_DEG = 111195;
const MAX_REASONABLE_GAP_M = 100;

function validCoordinate(pair) {
  return Array.isArray(pair) && pair.length === 2 &&
    pair.every(Number.isFinite) &&
    pair[0] > -81 && pair[0] < -80 &&
    pair[1] > 28.4 && pair[1] < 29;
}
function distMeters(a, b) {
  const cos = Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  return Math.hypot((a[0] - b[0]) * EARTH_M_PER_DEG * cos,
    (a[1] - b[1]) * EARTH_M_PER_DEG);
}
function pointToEdgeMeters(p, a, b) {
  const cos = Math.cos(p[1] * Math.PI / 180);
  const vx = (b[0] - a[0]) * cos, vy = b[1] - a[1];
  const qx = (p[0] - a[0]) * cos, qy = p[1] - a[1];
  const sq = vx * vx + vy * vy;
  const t = sq > 0 ? Math.max(0, Math.min(1, (qx*vx+qy*vy)/sq)) : 0;
  return distMeters(p,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
}
function pointWithinRing(p, ring) {
  let yes = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
      p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) yes=!yes;
  }
  return yes;
}
function endpointAudit(boardwalk, parking) {
  if (!boardwalk || !parking ||
      !Array.isArray(boardwalk.geometry?.coordinates) ||
      !Array.isArray(parking.polygons) || !parking.polygons.length) return null;
  const ends=[];
  for (const line of boardwalk.geometry.coordinates) {
    if (!Array.isArray(line) || line.length < 2) continue;
    ends.push(line[0],line[line.length-1]);
  }
  if (!ends.length || !ends.every(validCoordinate)) return null;
  let min=Infinity,inside=false;
  for(const p of ends)for(const ring of parking.polygons) {
    if (!Array.isArray(ring)||ring.length<3||!ring.every(validCoordinate)) return null;
    if (pointWithinRing(p,ring)) inside=true;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];
      min=Math.min(min,pointToEdgeMeters(p,a,b));
    }
  }
  if (!Number.isFinite(min)||min>MAX_REASONABLE_GAP_M) return null;
  return {
    source:'official-nps-two-layer-spatial-audit',
    nearestLotFootprintBoundaryMeters:inside?0:Math.round(min*10)/10,
    endpointFallsWithinMappedLot:inside,
    namedFacilityAssociationVerified:boardwalk.number===parking.number,
    confidence:inside?'gis-overlap-not-certified-access':'gis-proximity-not-certified-access',
    legalPedestrianConnectionVerified:false,
    currentWalkabilityVerified:false,
    wheelchairContinuityVerified:false,
    note:inside ?
      'A historic NPS boardwalk endpoint intersects its matching parking GIS footprint. That does not establish a walkable, open or accessible route.' :
      'The closest historical NPS boardwalk endpoint is near the matching parking GIS boundary. The intervening distance is NOT a mapped walking connection or route length.'
  };
}
function currentSource(access, now) {
  const ts=Date.parse(access?.checkedAt || '');
  const elapsed=Number.isFinite(ts)?now-ts:Infinity;
  if(access?.verified!==true)return 'unavailable';
  if(!Number.isFinite(elapsed) || elapsed < -5*60000 || elapsed > MAX_CHECK_AGE_MS) return 'stale';
  return 'fresh';
}
function validAlertUrl(url) {
  try {
    const parsed=new URL(url);
    return parsed.protocol==='https:' && (parsed.hostname==='www.nps.gov'||parsed.hostname==='nps.gov')?
      parsed.href:CONDITIONS_URL;
  } catch {return CONDITIONS_URL;}
}
function notice(a, checkedAt) {
  return {
    id:typeof a.id==='string'?a.id.slice(0,100):null,
    title:String(a.title||'NPS closure notice').slice(0,140),
    firstPosted:a.start || null,
    checkedAt,
    sourceUrl:validAlertUrl(a.url),
    issuingAuthority:'National Park Service, Canaveral National Seashore'
  };
}
function closureText(a) {
  if (!/closure/i.test(String(a.category||''))) return '';
  const text=(String(a.title||'')+' '+String(a.description||'')).slice(0,1700);
  return /\bclosed\b|closure|restricted|off limits|no access/i.test(text)?text:'';
}
function roadwayNorthOfEddy(alert) {
  const text=closureText(alert);
  return /\b(?:main\s+)?playalinda\s+(?:beach\s+)?road\s+north\s+of\s+eddy\s+creek\b/i.test(text);
}
function shorelineNorthOfEddy(alert) {
  const text=closureText(alert);
  return /\bbeach\s+north\s+of\s+eddy\s+creek\s+boardwalk\b/i.test(text);
}
function alertHasActiveLot(a, number) {
  return Boolean(closureText(a)) && npsLotClosure([a],number,number);
}
function buildCurrentNpsAccess(lots, boardwalks, source, now=Date.now()) {
  const confidence=currentSource(source,now);
  const checkedAt=typeof source?.checkedAt==='string'?source.checkedAt:null;
  const result={
    version:1,sourceStatus:confidence,checkedAt,
    parkAlertSource:OFFICIAL_NPS,conditionsUrl:CONDITIONS_URL,
    preciseNASAExclusionGeometryVerified:false,
    npsPublishedMissionLandExclusionPolygonVerified:false,
    conditionScope:'official-current-alerts-plus-historical-geospatial-references',
    historicGISNotPhysicalInspection:true,
    lotClosures:[],roadClosure:null,beachRestriction:null,
    evidenceNotices:[],features:{type:'FeatureCollection',features:[]}
  };
  if(confidence!=='fresh')return result;
  const active=(source?.alerts||[]).filter(a=>Boolean(closureText(a)));
  const used=new Map();
  const addNotice=a=>{const n=notice(a,checkedAt);
    used.set(n.id||n.title,n);return n};
  const parkwide=active.filter(a=>npsParkWideClosure([a]));
  for(const lot of lots||[]){
    const match=active.find(a=>npsParkWideClosure([a]) || alertHasActiveLot(a,lot.number));
    if(!match)continue;
    const ref=addNotice(match);
    const item={number:lot.number,lotId:lot.id,notice:ref,
      severity:'official-reported-closure',
      geometryConfidence:'official-parking-footprint-not-enforcement-perimeter',
      origin:'explicit-nps-park-alert'};
    result.lotClosures.push(item);
    if(lot.polygons?.length) result.features.features.push({
      type:'Feature',geometry:{type:'Polygon',coordinates:lot.polygons},
      properties:{id:'nps-reported-closed-lot-'+lot.number,
        category:'official-alert-on-mapped-parking-footprint',
        lotNumber:lot.number,source:ref.sourceUrl,
        checkedAt,noticeId:ref.id,
        not:'exact-barricade-boundary-or-nasa-hazard-polygon'}
    });
  }
  const roadAlert=active.find(roadwayNorthOfEddy);
  if(roadAlert) {
    const ref=addNotice(roadAlert);
    result.roadClosure={status:'official-alert-road-north-of-eddy',notice:ref,
      geometryInterpretation:'nps-historic-road-centerline-clipped-near-eddy-boardwalk',
      boundaryLocationVerified:false,
      detail:'NPS says the main road north of Eddy Creek is closed. The line is an approximate spatial reference to its wording, NOT a surveyed barricade position or current traffic feed.'};
    result.features.features.push({type:'Feature',
      geometry:EDDY.road.northOfEddyReference,
      properties:{id:'nps-reported-road-north-of-eddy',
        category:'interpreted-nps-road-closure-reference',source:ref.sourceUrl,
        roadSource:EDDY.roadSource,checkedAt,noticeId:ref.id,
        exactClosureLimitsVerified:false,
        not:'turn-by-turn-route-or-exact-barricade'}});
  }
  const beachAlert=active.find(shorelineNorthOfEddy);
  if(beachAlert){
    const ref=addNotice(beachAlert);
    result.beachRestriction={status:'official-alert-beach-north-of-eddy',
      notice:ref,scopeText:'Beach north of Eddy Creek boardwalk',
      exactAreaGeometryVerified:false,
      boundaryReference:'named-eddy-creek-nps-mapped-boardwalk',
      detail:'The NPS notice closes the beach north of Eddy Creek boardwalk. Only the historic named boardwalk boundary reference is mapped; no inferred beach closure polygon is drawn.'};
    result.features.features.push({type:'Feature',
      geometry:EDDY.eddyCreekBoardwalk.geometry,
      properties:{id:'nps-eddy-creek-named-boundary',
        category:'historic-nps-named-beach-closure-reference',
        source:ref.sourceUrl,boundarySource:EDDY.boundarySource,
        checkedAt,exactBeachClosurePolygonVerified:false,
        not:'walkable-connection-or-precise-exclusion-polygon'}});
  }
  result.evidenceNotices=[...used.values()];
  result.summary={
    closedParkingLots:result.lotClosures.map(x=>x.number),
    roadNorthOfEddyReportedClosed:Boolean(result.roadClosure),
    beachNorthOfEddyReportedClosed:Boolean(result.beachRestriction),
    physicallyInspectedBoardwalkCount:0,
    sourceLastChecked:checkedAt,
    note:'No unreported closure is inferred, and absence of an alert does not confirm access is open.'
  };
  return result;
}
module.exports={
  EDDY,validCoordinate,distMeters,pointToEdgeMeters,pointWithinRing,
  endpointAudit,currentSource,validAlertUrl,closureText,roadwayNorthOfEddy,
  shorelineNorthOfEddy,alertHasActiveLot,buildCurrentNpsAccess
};
