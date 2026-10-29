'use strict';

/**
 * Sleeping Giant Ontario Trail Network topology RESEARCH audit.
 * The OTN map is an inventory, not a routing authority.
 *
 * Endpoint-to-polyline proximity identifies a potential junction. It does not
 * certify a traversable junction, public parking, current access or legal use.
 * Ontario Parks' current named-use restrictions override generic OTN attributes.
 */
const trails = require('../../data/sleeping-giant/otn-trail-geometry-research.geojson');
const access = require('../../data/sleeping-giant/otn-access-points-research.geojson');

const OFFICIAL = Object.freeze({
  parkActivities:'https://www.ontarioparks.ca/park/sleepinggiant/activities',
  parkBikeGuide:'https://blog.ontarioparks.ca/bike-hike-sleeping-giant/',
  parkManagementPlan:'https://www.ontario.ca/page/sleeping-giant-provincial-park-management-plan',
  historicParkMap:'https://www.ontarioparks.ca/pdf/maps/sleepinggiant/trails_map.pdf'
});
const JUNCTION_TOLERANCE_METRES = 20; // AUDIT CANDIDATE threshold, NOT a snap tolerance for navigation.
const CORE_TRAIL_PAIRS = Object.freeze([
  ['Kabeyun Trail','Sawyer Bay Trail','Sawyer approach from South Kabeyun'],
  ['Kabeyun Trail','Talus Lake Trail','Official Kabeyun/Talus bike cutoff'],
  ['Sawyer Bay Trail','Talus Lake Trail','Talus/Sawyer connector'],
  ['Talus Lake Trail','Top of the Giant Trail','Top of Giant walking-only spur'],
  ['Kabeyun Trail','Head Trail','Head Trail connector to Kabeyun walking-only segment'],
  ['Talus Lake Trail','Nanabosho Lookout Trail','Nanabosho walking-only spur'],
  ['Kabeyun Trail','Sea Lion Trail','Sea Lion spur'],
  ['Sawyer Bay Trail','Sawbill Lake Trail','Sawbill and Sawyer Bay trail network'],
  ['Kabeyun Trail','Tee Harbour Trail','Tee Harbour spur']
]);
const TRAIL_PERMISSION = Object.freeze({
  'Kabeyun Trail':{bike:'partial_only',description:'Only SOUTH Kabeyun up to Talus Lake junction; other Kabeyun mileage is not certified for cycling.',source:'parkActivities'},
  'Sawyer Bay Trail':{bike:'yes',description:'Ontario Parks explicitly lists Sawyer Bay Trail as cycling-permitted.',source:'parkActivities'},
  'Sawbill Lake Trail':{bike:'yes',description:'Ontario Parks permits cycling although OTN PERMITTED_USES omits cycling.',source:'parkActivities'},
  'Talus Lake Trail':{bike:'no',description:'Not included in cycling-permitted trail list; hiking-only for summit plans.',source:'parkActivities'},
  'Top of the Giant Trail':{bike:'no',description:'Summit trail is walking-only.',source:'parkBikeGuide'},
  'Head Trail':{bike:'no',description:'Summit trail is walking-only.',source:'parkBikeGuide'},
  'Nanabosho Lookout Trail':{bike:'no',description:'Summit trail is walking-only.',source:'parkBikeGuide'},
  'Sea Lion Trail':{bike:'no',description:'Not in cycling-permitted list. Do not infer cycling.',source:'parkActivities'},
  'Tee Harbour Trail':{bike:'no',description:'Not in cycling-permitted list. Do not infer cycling.',source:'parkActivities'},
  'Burma Trail':{bike:'yes',description:'Explicit Ontario Parks cycling permission.',source:'parkActivities'},
  'Pickerel Lake Trail':{bike:'yes',description:'Explicit Ontario Parks cycling permission.',source:'parkActivities'},
  'Thunder Bay Lookout Road':{bike:'yes_road',description:'Cycling permitted on the road; check road conditions.',source:'parkActivities'},
  'Marie Louise Lake Loop':{bike:'yes_road',description:'Ontario Parks allows riding on Marie Louise Lake Drive, not all adjacent paths.',source:'parkActivities'}
});

function normalizeLines(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates;
  throw new TypeError('Expected polyline geometry');
}
function metresXY(point) {
  if (!Array.isArray(point) || point.length !== 2 ||
      !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
      point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) {
    throw new TypeError('Invalid lon/lat coordinate');
  }
  // Meter approximation on a fixed latitude; suitable only for close-range
  // junction candidate screening, not trail or hiking distance calculation.
  return [point[0]*111195*Math.cos(48.4*Math.PI/180),point[1]*111195];
}
function pointSegmentMetres(point,a,b) {
  const p=metresXY(point), v=metresXY(a), w=metresXY(b);
  const dx=w[0]-v[0],dy=w[1]-v[1];
  const lengthSq=dx*dx+dy*dy;
  const t=lengthSq ? Math.max(0,Math.min(1,((p[0]-v[0])*dx+(p[1]-v[1])*dy)/lengthSq)) : 0;
  return Math.hypot(p[0]-v[0]-t*dx,p[1]-v[1]-t*dy);
}
function nearestMetresToLine(point,geometry) {
  let best=Infinity;
  for(const line of normalizeLines(geometry)) {
    for(let i=1;i<line.length;i++) best=Math.min(best,pointSegmentMetres(point,line[i-1],line[i]));
  }
  return best;
}
function endpointsOf(geometry) {
  return normalizeLines(geometry).flatMap(line=>{
    if(line.length<2)throw new Error('Polyline with insufficient vertices');
    return [line[0],line[line.length-1]];
  });
}
function candidateDistance(a,b) {
  // Need only one endpoint to touch or closely approach another line.
  // Intersections in the interiors are NOT validated by this method.
  const d1=endpointsOf(a.geometry).map(point=>nearestMetresToLine(point,b.geometry));
  const d2=endpointsOf(b.geometry).map(point=>nearestMetresToLine(point,a.geometry));
  return Math.min(...d1,...d2);
}
function sourceFeatures(data=trails) {
  if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Invalid GIS research collection');
  const ids=new Set(),names=new Set();
  for(const f of data.features){
    if(f.geometry?.type!=='LineString'&&f.geometry?.type!=='MultiLineString')throw new Error('Invalid feature geometry');
    if(!Number.isInteger(f.properties?.OBJECTID) || ids.has(f.properties.OBJECTID))throw new Error('Missing or duplicate Ontario OBJECTID');
    ids.add(f.properties.OBJECTID);
    if(!f.properties.TRAIL_NAME||names.has(f.properties.TRAIL_NAME))throw new Error('Unreviewed duplicate trail name');
    names.add(f.properties.TRAIL_NAME);
    for(const line of normalizeLines(f.geometry))for(const point of line)metresXY(point);
  }
  return data.features;
}
function permissionFor(name) {
  const rule=TRAIL_PERMISSION[name];
  return rule ? {...rule,sourceURL:OFFICIAL[rule.source]} :
    {bike:'unverified',description:'No park-authorized cycling restriction mapped for this trail.',sourceURL:OFFICIAL.parkActivities};
}
function audit({segmentCollection=trails,accessCollection=access}={}) {
  const features=sourceFeatures(segmentCollection);
  const byName=new Map(features.map(f=>[f.properties.TRAIL_NAME,f]));
  const links=CORE_TRAIL_PAIRS.map(([from,to,description])=>{
    const a=byName.get(from),b=byName.get(to);
    const metres=a&&b ? candidateDistance(a,b) : null;
    return {
      from,to,description,sourceFeatureIds:[a?.properties.OBJECTID??null,b?.properties.OBJECTID??null],
      nearMetres:metres===null?null:Math.round(metres*10)/10,
      candidateOnly:metres!==null && metres<=JUNCTION_TOLERANCE_METRES,
      manuallyCertified:false,routeEligible:false,
      reason:'Mapped proximity + named Ontario Parks trail relationship; exact junction, travel mode at cutoffs and real access not independently certified.'
    };
  });
  const accessPoints=accessCollection.features.map(point=>{
    if(point.geometry?.type!=='Point'||!Number.isInteger(point.properties?.OBJECTID))throw new Error('Unexpected OTN access point');
    const nearest=features.map(f=>({id:f.properties.OBJECTID,name:f.properties.TRAIL_NAME,
      distance:nearestMetresToLine(point.geometry.coordinates,f.geometry)}))
      .sort((a,b)=>a.distance-b.distance)[0];
    return {otnObjectId:point.properties.OBJECTID,nearestTrail:nearest.name,
      nearestTrailSourceId:nearest.id,approxMetres:Math.round(nearest.distance),
      accessPointVerified:true,parkingVerified:false,roadAccessVerified:false,
      routeEligible:false,reason:'OTN access point only; no named signed parking/road entry certified.'};
  });
  const knownMileageDisagreements=[
    {name:'Kabeyun Trail',parkKm:37,otnKm:byName.get('Kabeyun Trail')?.properties.TRAIL_LENGTH_KM??null,source:OFFICIAL.parkActivities},
    {name:'Nanabosho Lookout Trail',parkKm:0.8,otnKm:byName.get('Nanabosho Lookout Trail')?.properties.TRAIL_LENGTH_KM??null,source:OFFICIAL.parkActivities},
    {name:'Sibley Creek Nature Trail',parkKm:2.3,otnKm:byName.get('Sibley Creek Nature Trail')?.properties.TRAIL_LENGTH_KM??null,source:OFFICIAL.parkActivities}
  ].map(d=>({...d,needsReconciliation:d.otnKm!==null&&Math.abs(d.otnKm-d.parkKm)>0.05}));
  const permissionConflicts=features.map(f=>{
    const park=permissionFor(f.properties.TRAIL_NAME);
    const otnCycling=(f.properties.PERMITTED_USES||'').split(',').map(x=>x.trim()).includes('Cycling');
    return {name:f.properties.TRAIL_NAME,sourceFeatureId:f.properties.OBJECTID,
      parkBikeRule:park.bike,otnCycling,parkRuleSource:park.sourceURL,
      conflict:park.bike==='partial_only'||(park.bike==='yes'&&!otnCycling)||(park.bike==='no'&&otnCycling),
      routingEligible:false};
  }).filter(x=>x.conflict);
  return {
    schemaVersion:1,sourceDate:segmentCollection.metadata?.retrieved??null,
    sourceFeatures:features.length,otnAccessPoints:accessPoints.length,
    geometryNature:'simplified OTN source inventory, not calibrated or ready-to-use navigation paths',
    sourceUrls:{...OFFICIAL,otn:segmentCollection.metadata?.sourceUrl??null},
    gate:{junctionsCertified:0,parkingAnchorsCertified:0,routeEligibleEdges:0,cyclingRulesFromParkOnly:true},
    junctionCandidates:links,accessPointAudit:accessPoints,permissionConflicts,knownMileageDisagreements,
    outcome:'RESEARCH_ONLY_DO_NOT_ROUTE'
  };
}

module.exports={audit,sourceFeatures,normalizeLines,metresXY,pointSegmentMetres,nearestMetresToLine,
  candidateDistance,permissionFor,CORE_TRAIL_PAIRS,TRAIL_PERMISSION,JUNCTION_TOLERANCE_METRES};

if(require.main===module){
  const result=audit();
  console.log(JSON.stringify(result,null,2));
}
