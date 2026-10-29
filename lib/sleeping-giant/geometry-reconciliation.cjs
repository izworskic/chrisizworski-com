'use strict';

/**
 * Sleeping Giant: high-detail source geometry reconciliation.
 *
 * All route shapes are RESEARCH overlays only. An OTN polyline is not a surveyed
 * legal route, an authenticated sign, a continuous parking-to-trail connection,
 * a permit, an operating-season report, or a current/safe trail.
 */
const fs=require('node:fs');
const path=require('node:path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/sleeping-giant',name),'utf8'));
const full=read('otn-unsimplified-core-research.geojson');
const low=read('otn-trail-geometry-research.geojson');
const official=read('official-routes.json');
const access=read('otn-access-points-research.geojson');
const EXPECTED_IDS=Object.freeze({
 'Kabeyun Trail':228033,'Sawyer Bay Trail':284289,'Talus Lake Trail':283985,
 'Top of the Giant Trail':284097,'Head Trail':284081,
 'Nanabosho Lookout Trail':284241,'Sea Lion Trail':284257
});
const SOURCE_URL='https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/19';
const PARKING_RESEARCH=Object.freeze({
 id:'osm-kabeyun-lot-center',
 label:'Approximate mapped Kabeyun Trail Head Parking Area (research only)',
 center:[-88.82183,48.34062],
 osmWayId:151289776,
 osmSourceUrl:'https://www.openstreetmap.org/way/151289776',
 sourceInterpretationUrl:'https://mapcarta.com/W151289776',
 attribution:'© OpenStreetMap contributors, ODbL; approximate mapped parking area center as republished by Mapcarta',
 isOfficialParkCoordinate:false,isParkingEntrance:false,eligibleForDirections:false,currentParkingAccessKnown:false
});
const CONTINUITY_TOLERANCE_METRES=1.5; // dataset joins only, not a safety or navigation snap tolerance
const lonScale=111195*Math.cos(48.4*Math.PI/180);
const xy=p=>[p[0]*lonScale,p[1]*111195];
function isPoint(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>-90&&p[0]<-88&&p[1]>48&&p[1]<49;}
function meters(a,b){const A=xy(a),B=xy(b);return Math.hypot(A[0]-B[0],A[1]-B[1]);}
function project(pt,a,b){
 const [x,y]=xy(pt),[ax,ay]=xy(a),[bx,by]=xy(b),dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/len)):0;
 const point=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
 return {meters:meters(pt,point),point,ratio:t};
}
function nearestPointOnPolyline(pt,coords){
 if(!isPoint(pt)||!Array.isArray(coords)||coords.length<2)throw Error('Invalid OTN point/line');
 let best=null;
 for(let i=0;i<coords.length-1;i++){
  const candidate=project(pt,coords[i],coords[i+1]);
  if(!best||candidate.meters<best.meters)best={...candidate,segmentIndex:i};
 }
 return best;
}
function polylineMeters(coords){
 if(!Array.isArray(coords)||coords.length<2)throw Error('Invalid source route geometry');
 let total=0;for(let i=1;i<coords.length;i++)total+=meters(coords[i-1],coords[i]);
 return total;
}
function validateHighDetailCollection(data=full,baseline=low){
 if(data.type!=='FeatureCollection'||data.metadata?.routeEligible!==false
   ||data.metadata?.parkSignedJunctionCoordinatesVerified!==false
   ||data.metadata?.currentTrailConditionsKnown!==false)throw Error('Uncertified OTN geometry source');
 if(!Array.isArray(data.features)||data.features.length!==7)throw Error('Seven core official source IDs required');
 const names=new Set();
 for(const f of data.features){
  const name=f.properties?.TRAIL_NAME;
  if(!name||names.has(name)||EXPECTED_IDS[name]!==f.properties.OBJECTID)throw Error('Unverified OTN source feature ID '+name);
  names.add(name);
  const old=baseline.features.find(g=>g.properties.OBJECTID===f.properties.OBJECTID);
  if(!old||old.properties.OGF_ID!==f.properties.OGF_ID
    ||f.geometry.type!=='LineString'||f.geometry.coordinates.length<=old.geometry.coordinates.length
    ||f.geometry.coordinates.some(p=>!isPoint(p)))throw Error('Full geometry lacks same-source identity or increased detail '+name);
 }
 return true;
}
const byName=name=>{
 const feature=full.features.find(f=>f.properties.TRAIL_NAME===name);
 if(!feature)throw Error('Missing core OTN feature '+name);
 return feature;
};
function sliceBetween(line,from,to){
 const p=nearestPointOnPolyline(from,line),q=nearestPointOnPolyline(to,line);
 if(p.meters>CONTINUITY_TOLERANCE_METRES||q.meters>CONTINUITY_TOLERANCE_METRES)
  throw Error('Unjoined OTN trail endpoint/connector');
 const startPos=p.segmentIndex+p.ratio,endPos=q.segmentIndex+q.ratio;
 if(Math.abs(startPos-endPos)<1e-6)throw Error('Zero-length mapped section');
 const low=Math.min(startPos,endPos),high=Math.max(startPos,endPos);
 const lo=Math.floor(low),hi=Math.floor(high);
 const pointAt=position=>{const i=Math.min(line.length-2,Math.floor(position));const t=position-i;
   return [line[i][0]+t*(line[i+1][0]-line[i][0]),line[i][1]+t*(line[i+1][1]-line[i][1])];};
 const coords=[pointAt(low)];
 for(let i=lo+1;i<=hi;i++)if(i>low&&i<high)coords.push(line[i]);
 coords.push(pointAt(high));
 if(coords.length<2)throw Error('Invalid split');
 if(startPos>endPos)coords.reverse();
 return {coordinates:coords,lengthMeters:polylineMeters(coords),fromGapMeters:p.meters,toGapMeters:q.meters};
}
const components=Object.freeze({
 'top-of-the-giant':[
  {trail:'Kabeyun Trail',mode:'bike',from:'south',to:'talus-kabeyun'},
  {trail:'Talus Lake Trail',mode:'walk',from:'talus-kabeyun',to:'top-spur'},
  {trail:'Top of the Giant Trail',mode:'walk',from:'top-spur',to:'top-end'}],
 'nanabosho-lookout':[
  {trail:'Sawyer Bay Trail',mode:'bike',from:'south',to:'sawyer-talus'},
  {trail:'Talus Lake Trail',mode:'walk',from:'sawyer-talus',to:'nanabosho-spur'},
  {trail:'Nanabosho Lookout Trail',mode:'walk',from:'nanabosho-spur',to:'nanabosho-end'}],
 'head-of-the-giant':[
  {trail:'Sawyer Bay Trail',mode:'bike',from:'south',to:'sawyer-kabeyun'},
  {trail:'Kabeyun Trail',mode:'walk',from:'sawyer-kabeyun',to:'head-spur'},
  {trail:'Head Trail',mode:'walk',from:'head-spur',to:'head-end'}],
 'sea-lion':[
  {trail:'Kabeyun Trail',mode:'walk',from:'south',to:'sea-spur'},
  {trail:'Sea Lion Trail',mode:'walk',from:'sea-spur',to:'sea-end'}]
});
function references(){
 const get=n=>byName(n).geometry.coordinates;
 return {
  'south':get('Sawyer Bay Trail')[0],
  'talus-kabeyun':get('Talus Lake Trail')[0],
  'top-spur':get('Top of the Giant Trail')[0],
  'top-end':get('Top of the Giant Trail').at(-1),
  'sawyer-talus':get('Talus Lake Trail').at(-1),
  'nanabosho-spur':get('Nanabosho Lookout Trail')[0],
  'nanabosho-end':get('Nanabosho Lookout Trail').at(-1),
  'sawyer-kabeyun':get('Sawyer Bay Trail').at(-1),
  'head-spur':get('Head Trail')[0],
  'head-end':get('Head Trail').at(-1),
  'sea-spur':get('Sea Lion Trail')[0],
  'sea-end':get('Sea Lion Trail').at(-1)
 };
}
function buildResearchOverlay(routeId,{withCoordinates=false}={}){
 validateHighDetailCollection();
 const list=components[routeId];
 if(!list)throw Error('No source-supported research overlay for route '+routeId);
 const points=references(),route=official.routes.find(r=>r.id===routeId),pieces=[];
 for(const spec of list){
  const feat=byName(spec.trail);
  const section=sliceBetween(feat.geometry.coordinates,points[spec.from],points[spec.to]);
  pieces.push({sourceObjectId:feat.properties.OBJECTID,sourceOgfId:feat.properties.OGF_ID,
    trail:spec.trail,modeOnMappedTrail:spec.mode,
    calculatedOneWaySectionKm:+(section.lengthMeters/1000).toFixed(3),
    fromLabel:spec.from,toLabel:spec.to,
    sourceEndpointGapMaxMeters:+Math.max(section.fromGapMeters,section.toGapMeters).toFixed(3),
    researchGeometry:withCoordinates?{type:'LineString',coordinates:section.coordinates}:null});
 }
 const totalOneWayMeters=pieces.reduce((s,p)=>s+p.calculatedOneWaySectionKm*1000,0);
 const missingRoundTripKm=route.roundTripKm-2*totalOneWayMeters/1000;
 const bikeDistKm=2*pieces.filter(p=>p.modeOnMappedTrail==='bike').reduce((s,p)=>s+p.calculatedOneWaySectionKm,0);
 const footDistKm=2*pieces.filter(p=>p.modeOnMappedTrail==='walk').reduce((s,p)=>s+p.calculatedOneWaySectionKm,0);
 // Dataset is not a survey. Differences may include the unsourced parking connector,
 // official map definition, trail changes, OTN positional accuracy, and rounding.
 if(missingRoundTripKm < -2 || missingRoundTripKm > 3)throw Error('Official mileage disagrees materially with available source lines');
 if(route.bikePermission==='official_documented'
   &&(Math.abs(bikeDistKm-route.bikeApproachRoundTripKm)>2||Math.abs(footDistKm-route.bikeHikeRemainingRoundTripKm)>2))
   throw Error('OTN cycling split inconsistent with Ontario Parks distance reference');
 return {routeId,sourceKind:'ON_TRAIL_OTN_RESEARCH_ONLY',sourceURL:SOURCE_URL,
   officialReturnKm:route.roundTripKm,
   mappedReturnKm:+(2*totalOneWayMeters/1000).toFixed(3),
   unmappedOrSourceDifferenceReturnKm:+missingRoundTripKm.toFixed(3),
   mappedCyclingReturnKm:+bikeDistKm.toFixed(3),
   mappedWalkingReturnKm:+footDistKm.toFixed(3),
   sections:pieces,parkingConnectorMapped:false,
   visitorRouteReady:false,turnByTurnEligible:false,
   activeTrailOpen:false,legalBikeCutoffCoordinatesCertified:false,
   statement:'Continuous mapped sections and local intersections have research geometry; there is no verified public-parking connector, certified turn-by-turn legal boundary, or current trail opening evidence.'};
}
function auditParkingCandidate(){
 const OTN=access.features.find(f=>f.properties.OBJECTID===6001);
 if(!OTN||OTN.properties.OGF_ID!==319510517||OTN.geometry.type!=='Point')throw Error('Expected separate OTN trail access point');
 const southern=references().south,center=PARKING_RESEARCH.center;
 const candidateDist=meters(center,OTN.geometry.coordinates);
 const trailStartDist=meters(center,southern);
 if(candidateDist>150||trailStartDist<200||trailStartDist>1500)throw Error('Parking research sources no longer converge');
 return {
  namedOfficialParkingFacilityVerified:true,
  mappedParkingResearchPoint:{...PARKING_RESEARCH},
  nearbyGovernmentTrailAccessPoint:{otnObjectId:6001,otnOgfId:319510517,
    coordinate:OTN.geometry.coordinates,parkingIdentificationVerified:false},
  osmCenterToOtnAccessMetres:+candidateDist.toFixed(1),
  osmCenterToMappedTrailStartStraightLineMetres:+trailStartDist.toFixed(1),
  completePedestrianConnectorAvailable:false,
  preciseParkSignedParkingEntranceVerified:false,carNavigationEligible:false,
  noOnRoadParkingAssurance:true,sourceDatesAreNotRealTime:true,
  statement:'Independent OSM mapped parking and OTN access point are nearby, but do not establish the signed driveway, legal car access or the public walking connector to the official trail distance baseline.'
 };
}
function audit(){
 const audits=Object.keys(components).map(id=>buildResearchOverlay(id));
 const joins=[];
 const pairings=[
  ['Kabeyun Trail','Sawyer Bay Trail','south'],
  ['Kabeyun Trail','Talus Lake Trail','talus-kabeyun'],
  ['Sawyer Bay Trail','Talus Lake Trail','sawyer-talus'],
  ['Talus Lake Trail','Top of the Giant Trail','top-spur'],
  ['Kabeyun Trail','Head Trail','head-spur'],
  ['Talus Lake Trail','Nanabosho Lookout Trail','nanabosho-spur'],
  ['Kabeyun Trail','Sea Lion Trail','sea-spur'],
  ['Sawyer Bay Trail','Kabeyun Trail','sawyer-kabeyun']];
 const pts=references();
 for(const [from,to,key] of pairings){
  const a=nearestPointOnPolyline(pts[key],byName(from).geometry.coordinates);
  const b=nearestPointOnPolyline(pts[key],byName(to).geometry.coordinates);
  joins.push({key,trailIds:[byName(from).properties.OBJECTID,byName(to).properties.OBJECTID],
    coordinateApprox:pts[key],maxSeparationMetres:+Math.max(a.meters,b.meters).toFixed(3),
    sameMappedLocation:Math.max(a.meters,b.meters)<=CONTINUITY_TOLERANCE_METRES,
    signedTrailJunctionCertified:false,publicNavigatorEligible:false});
 }
 if(joins.some(j=>!j.sameMappedLocation))throw Error('Mapped core-trail geometry connection failed');
 return {source:SOURCE_URL,sourceIds:EXPECTED_IDS,unsimplifiedSourceFeatures:full.features.length,
  measuredMappedJunctionCandidates:joins.length,allMappedJunctionsWithinResearchTolerance:true,
  signedJunctionsCertified:0,verifiedRoadToTrailLinks:0,parking:auditParkingCandidate(),
  routes:audits.map(x=>({...x,sections:x.sections.map(({researchGeometry,...rest})=>rest)})),
  navigatorEligible:false,seasonalTrailStatus:'unverified',conclusion:'RESEARCH_GEOMETRY_RECONCILED_NO_VISITOR_DIRECTIONS'};
}
module.exports={EXPECTED_IDS,PARKING_RESEARCH,validateHighDetailCollection,nearestPointOnPolyline,
  polylineMeters,meters,sliceBetween,buildResearchOverlay,auditParkingCandidate,audit,references,CONTINUITY_TOLERANCE_METRES};
if(require.main===module)console.log(JSON.stringify(audit(),null,2));
