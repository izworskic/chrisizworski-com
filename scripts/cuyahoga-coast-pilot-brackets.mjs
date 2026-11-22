#!/usr/bin/env node
// Research only. NOAA Coast Pilot chart-reference proximity is NOT a bridge crossing, opening, ETA or safe route.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const EARTH_RADIUS_METERS=6371000;
const NEAR_REFERENCE_RADIUS_M=85;
const MAX_ADJACENT_GAP_MIN=3;
const MIN_ADJACENT_MOVEMENT_M=15;
const MONOTONE_DISTANCE_MARGIN_M=5;
const MIN_SEPARATE_EPISODE_MIN=20;
const MAX_CONFLICT_BETWEEN_OFFICIAL_POINTS_M=180;
const round=n=>Math.round(n*10)/10;
const sec=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(s) && Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
export function separationMeters(a,b) {
  if (![a.lat,a.lon,b.lat,b.lon].every(Number.isFinite)) throw Error('Invalid geographic reference');
  const p=Math.PI/180, dLat=(b.lat-a.lat)*p,dLon=(b.lon-a.lon)*p;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLon/2)**2;
  return EARTH_RADIUS_METERS*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
function decimalDegrees(dms,positive) {
  const match=/^(\d{1,3}):(\d{2}):(\d{2})$/.exec(dms);
  if(!match)throw Error('Invalid NOAA DMS');
  const [deg,min,secs]=match.slice(1).map(Number);
  if(min>59||secs>59||deg>(positive?90:180))throw Error('Out-of-range NOAA DMS');
  return (positive?1:-1)*(deg+min/60+secs/3600);
}
export function validateCoastPilot(catalog) {
  if(catalog?.schemaVersion!==1||catalog?.excludedFromFutureEtas!==true||
     !/^https:\/\/.*\.pdf$/.test(catalog.sourceUrl||'')||
     !Array.isArray(catalog.bridges)||catalog.bridges.length<20 ||
     !catalog.bridges.some(b=>b.channel==='old'))throw Error('Not a complete reviewed NOAA Coast Pilot research catalog');
  let last=-Infinity;
  const ids=new Set();
  for(const b of catalog.bridges) {
    if(!b.id||ids.has(b.id)||!['main','old'].includes(b.channel)||
       !Number.isFinite(b.riverMile)||b.riverMile<0||b.riverMile>8||
       !b.name||b.coordinateRole!=='NOAA_COAST_PILOT_ROUNDED_REFERENCE_NOT_SURVEYED_SPAN_AXIS'||
       b.bridgeOpeningState!=='UNKNOWN')throw Error('Invalid or falsely precise NOAA bridge record');
    ids.add(b.id);
    const la=decimalDegrees(b.latitudeDms,true),lo=decimalDegrees(b.longitudeDms,false);
    if(Math.abs(la-b.latitude)>0.00000001 || Math.abs(lo-b.longitude)>0.00000001)throw Error('NOAA DMS/decimal transcription disagreement');
    if(b.channel==='main') {if(b.riverMile<=last)throw Error('Main river mile order must be increasing');last=b.riverMile;}
  }
  if(!catalog.knownConflicts?.some(c=>c.id==='center-st-139'&&c.coastPilotRiverMile===1.39&&c.cfr117848ListedRiverMile===1.28))throw Error('Unresolved NOAA/CFR Center Street mile discrepancy must remain');
  if(!catalog.closeFeatureGroups?.some(g=>g.ids?.includes('city-rr-242')&&g.ids?.includes('carter-243')))throw Error('Closely spaced structures must not be independently timed');
  return true;
}
function normalizePoints(track) {
  if(!/^\d{9}$/.test(String(track?.mmsi??''))||!Array.isArray(track.points)||track.points.length>30000)throw Error('Invalid AIS track');
  const points=track.points.map(p=>{
    const t=sec(p.seen);
    if(!Number.isFinite(t)||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||
       p.lat<41.4||p.lat>41.6||p.lon< -81.8||p.lon> -81.6)throw Error('Invalid, non-Cuyahoga or untimestamped NOAA position');
    return {lat:p.lat,lon:p.lon,t,seen:new Date(t).toISOString()};
  }).sort((a,b)=>a.t-b.t);
  const unique=[];
  for(const p of points)if(!unique.length||p.t>unique[unique.length-1].t)unique.push(p);
  return unique;
}
function officialIndependentPoint(catalog,odot,b) {
  const bridgeIds={
    'center-st-139':'1869345','columbus-193':'1833758','carter-243':'1869264',
    'eagle-280':'1869604','west-third-369':'1869728','main-avenue-101':'1800035'
  };
  const sfn=bridgeIds[b.id];
  if(!sfn)return {status:'SINGLE_SOURCE_CHART_REFERENCE',odotDistanceMeters:null};
  const f=odot.bridges?.find(x=>x.officialStructureFileNumber===sfn);
  if(!f||f.coordinateRole!=='ODOT_INVENTORY_POINT'||f.bridgeOperationalStatus!=='UNKNOWN')
    return {status:'ODOT_REFERENCE_NOT_VERIFIED',odotDistanceMeters:null};
  const m=separationMeters({lat:b.latitude,lon:b.longitude},{lat:f.lat,lon:f.lon});
  return {status:m>MAX_CONFLICT_BETWEEN_OFFICIAL_POINTS_M?'OFFICIAL_POSITION_CONFLICT':'TWO_AGENCY_PROXIMITY_AGREEMENT',
    odotDistanceMeters:round(m),odotStructureFileNumber:sfn};
}
function nearbyReference(points,b,crossAgency) {
  const target={lat:b.latitude,lon:b.longitude};
  const distances=points.map(p=>separationMeters(p,target));
  let nearest=Infinity,nearestAt=null;
  for(let i=0;i<points.length;i++)if(distances[i]<nearest){nearest=distances[i];nearestAt=points[i].seen;}
  const valid=[];
  for(let i=1;i<points.length-1;i++){
    if(distances[i]>NEAR_REFERENCE_RADIUS_M)continue;
    const a=points[i-1],p=points[i],z=points[i+1];
    if(p.t-a.t>MAX_ADJACENT_GAP_MIN*60000||z.t-p.t>MAX_ADJACENT_GAP_MIN*60000)continue;
    if(distances[i]>distances[i-1]-MONOTONE_DISTANCE_MARGIN_M||
       distances[i]>distances[i+1]-MONOTONE_DISTANCE_MARGIN_M)continue;
    if(separationMeters(a,p)<MIN_ADJACENT_MOVEMENT_M||
       separationMeters(p,z)<MIN_ADJACENT_MOVEMENT_M)continue;
    valid.push({referenceId:b.id,kind:'AIS_BRACKET_NEAR_CHART_POINT_NOT_BRIDGE_CROSSING',
      nearestObservedAt:p.seen,nearestReferenceDistanceMeters:round(distances[i]),
      observedBracketStart:a.seen,observedBracketEnd:z.seen,
      bracketDurationMinutes:round((z.t-a.t)/60000),
      beforeGapMinutes:round((p.t-a.t)/60000),afterGapMinutes:round((z.t-p.t)/60000),
      source:'NOAA historic AIS fixes and NOAA Coast Pilot rounded bridge point'});
  }
  const clusters=[];
  for(const v of valid){
    const old=clusters[clusters.length-1];
    if(old && (Date.parse(v.nearestObservedAt)-Date.parse(old.lastSeen))<=MIN_SEPARATE_EPISODE_MIN*60000){
      old.lastSeen=v.nearestObservedAt;old.nearbyCandidates++;
      if(v.nearestReferenceDistanceMeters<old.best.nearestReferenceDistanceMeters)old.best=v;
    }else clusters.push({lastSeen:v.nearestObservedAt,nearbyCandidates:1,best:v});
  }
  const conflict=crossAgency.status==='OFFICIAL_POSITION_CONFLICT';
  let status=conflict?'OFFICIAL_POSITION_CONFLICT':
    clusters.length>1?'AMBIGUOUS_REPEATED_REFERENCE_APPROACH':
    clusters.length===1?'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET':
    nearest<=NEAR_REFERENCE_RADIUS_M?'NEARBY_BUT_GAP_OR_MOVEMENT_INSUFFICIENT':'NO_NEARBY_AIS_FIX';
  return {
    id:b.id,name:b.name,channel:b.channel,riverMile:b.riverMile,structureType:b.structureType,
    coordinateBasis:b.coordinateRole,referenceSource:b.sourceDocument,
    crossAgency,
    status,
    nearestAisDistanceMeters:Number.isFinite(nearest)?round(nearest):null,
    nearestAisAt:nearestAt,
    bracket:status==='OBSERVED_NEAR_CHART_POINT_WITH_BRACKET'?clusters[0].best:null,
    candidatesDetected:clusters.length,
    note:'Bracket represents observed vessel proximity to approximate NOAA chart coordinate, not a bridge-axis intersection or opening.'};
}
function overlappingGroups(events,groups){
  for(const group of groups){
    const selected=events.filter(x=>group.ids.includes(x.id));
    if(selected.length<2)continue;
    for(const e of selected){
      e.collocatedFeatureWarning='INSUFFICIENT_SPATIAL_RESOLUTION_TO_SEPARATE_NEARBY_BRIDGES';
      e.useForIndividualBridgeCalibration=false;
    }
  }
}
function intervals(events){
  const bracketed=events.filter(e=>e.status==='OBSERVED_NEAR_CHART_POINT_WITH_BRACKET'&&e.bracket)
    .sort((a,b)=>Date.parse(a.bracket.nearestObservedAt)-Date.parse(b.bracket.nearestObservedAt));
  const arr=[];
  for(let i=0;i<bracketed.length-1;i++){
    const a=bracketed[i],b=bracketed[i+1];
    const gapMin=(Date.parse(b.bracket.observedBracketStart)-Date.parse(a.bracket.observedBracketEnd))/60000;
    const gapMax=(Date.parse(b.bracket.observedBracketEnd)-Date.parse(a.bracket.observedBracketStart))/60000;
    if(gapMax<=0||gapMin>180||a.riverMile===b.riverMile)continue;
    arr.push({
      from:a.id,to:b.id,
      direction:a.riverMile<b.riverMile?'INCREASING_COAST_PILOT_MILES':'DECREASING_COAST_PILOT_MILES',
      minimumMinutesBetweenReferenceBrackets:round(Math.max(0,gapMin)),
      maximumMinutesBetweenReferenceBrackets:round(gapMax),
      timeBracketsOverlap:gapMin<=0,
      label:'OBSERVED_NEARBY_REFERENCE_INTERVAL_NOT_BRIDGE_TO_BRIDGE_TIME',
      calibrationEligible:a.useForIndividualBridgeCalibration!==false&&b.useForIndividualBridgeCalibration!==false&&gapMin>0
    });
  }
  return arr;
}
export function analyzeCoastPilotStudy(study,catalog,odot){
  validateCoastPilot(catalog);
  if(study?.schemaVersion!==1||study.observationKind!=='historical'||!Array.isArray(study.tracks)||
     odot?.schemaVersion!==1||!Array.isArray(odot.bridges))throw Error('Expected independent NOAA historical AIS and Ohio DOT bridge inventory');
  const main=catalog.bridges.filter(x=>x.channel==='main');
  const vessels=study.tracks.map(t=>{
    const points=normalizePoints(t);
    const events=main.map(b=>nearbyReference(points,b,officialIndependentPoint(catalog,odot,b)));
    overlappingGroups(events,catalog.closeFeatureGroups);
    return {mmsi:t.mmsi,observedVesselNames:t.vesselNames||[],
      observedPositions:points.length,bridgeReferenceEvents:events,
      sourceObservedReferenceIntervals:intervals(events)};
  });
  return {
    schemaVersion:1,kind:'NOAA_CHART_REFERENCE_PROXIMITY_INTERVALS',
    chartSource:catalog.source,chartSourceUrl:catalog.sourceUrl,chartPublicationDate:catalog.publicationDate,
    historicalSource:study.source,checkedDate:catalog.checkedDate,
    unresolvedSourceConflicts:catalog.knownConflicts,excludedOldRiverReferences:catalog.bridges.filter(x=>x.channel==='old').map(x=>x.id),
    projectionModel:'NONE_NO_INTERPOLATED_VESSEL_POSITIONS',
    surveyedBridgeAxisValidated:false,bridgeCrossingTimestampValidated:false,bridgeOpeningTimestampValidated:false,
    futureArrivalPredictionEnabled:false,
    researchGuard:'No visitor ETA can be enabled from rounded points and proximity brackets; independent crossing observations and held-out dates are missing.',
    vessels};
}
async function main(args){
  if(args.length!==8||args[0]!=='--input'||args[2]!=='--coast-pilot'||args[4]!=='--odot'||args[6]!=='--out')throw Error('Usage: --input NOAA-normalized.json --coast-pilot catalog.json --odot inventory.json --out result.json');
  const [study,catalog,odot]=await Promise.all([args[1],args[3],args[5]].map(p=>readFile(p,'utf8').then(JSON.parse)));
  const report=analyzeCoastPilotStudy(study,catalog,odot);
  await writeFile(args[7],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  for(const vessel of report.vessels)console.log(JSON.stringify({
    mmsi:vessel.mmsi,observedPositions:vessel.observedPositions,
    bracketed:vessel.bridgeReferenceEvents.filter(x=>x.status==='OBSERVED_NEAR_CHART_POINT_WITH_BRACKET').map(x=>({id:x.id,mile:x.riverMile,at:x.bracket.nearestObservedAt,distance:x.bracket.nearestReferenceDistanceMeters,sourceAgreement:x.crossAgency.status})),
    insufficient:vessel.bridgeReferenceEvents.filter(x=>x.status!=='OBSERVED_NEAR_CHART_POINT_WITH_BRACKET').map(x=>({id:x.id,reason:x.status})),
    intervals:vessel.sourceObservedReferenceIntervals,
    visitorArrivalPredictionEnabled:false
  }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
