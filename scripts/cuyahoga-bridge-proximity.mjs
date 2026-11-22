#!/usr/bin/env node
// Offline source-backed proximity diagnostics only. NEVER bridge openings, confirmed crossing times or future ETA.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const EARTH_RADIUS_M = 6371000;
const MAX_OBSERVATION_GAP_MINUTES = 3;
const MIN_MOVEMENT_METERS = 18;
const EPISODE_SEPARATION_MINUTES = 20;
function haversineMeters(a,b) {
  const lat1=a.lat*Math.PI/180, lat2=b.lat*Math.PI/180;
  const dlat=(b.lat-a.lat)*Math.PI/180, dlon=(b.lon-a.lon)*Math.PI/180;
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  return 2*EARTH_RADIUS_M*Math.asin(Math.min(1,Math.sqrt(h)));
}
const round=n=>Math.round(n*10)/10;
const parsedTime=value=>typeof value==='string'&&/Z$/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):NaN;
function checkReferences(refs) {
  if(refs?.schemaVersion!==1||!Array.isArray(refs.references)||refs.references.length<2||
     refs.usage!=='OFFLINE_OBSERVATION_CHECKPOINTS_NOT_BRIDGE_CROSSINGS') throw Error('Invalid bridge research reference configuration');
  for(const p of refs.references) {
    if(!p.id||!p.coordinateSource||!Number.isFinite(p.riverMile)||p.pointStatus!=='NEARBY_REFERENCE_NOT_CROSSING'||
       !Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||
       !Number.isFinite(p.referenceRadiusMeters)||p.referenceRadiusMeters>150||p.referenceRadiusMeters<20)
       throw Error('An unsourced or over-precise bridge reference was supplied');
  }
}
function validObservations(track) {
  if(!/^\d{9}$/.test(String(track?.mmsi||''))||!Array.isArray(track.points)||track.points.length>30000) throw Error('Invalid vessel track');
  const points=track.points.map(p=>{
    const t=parsedTime(p.seen);
    if(!Number.isFinite(t)||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||p.lat<40||p.lat>43||p.lon< -83||p.lon>-80)
      throw Error('Invalid recorded AIS fix');
    return {lat:p.lat,lon:p.lon,seen:new Date(t).toISOString(),t};
  }).sort((a,b)=>a.t-b.t);
  const unique=[];
  for(const p of points)if(!unique.length||p.t>unique[unique.length-1].t) unique.push(p);
  return unique;
}
function evaluateReference(points,ref){
  const target={lat:ref.latitude,lon:ref.longitude};
  const candidates=[];
  let bestDistanceMeters=Infinity,bestObservedAt=null,allNearbyCount=0;
  for(let i=0;i<points.length;i++){
    const d=haversineMeters(points[i],target);
    if(d<bestDistanceMeters){bestDistanceMeters=d;bestObservedAt=points[i].seen;}
    if(d>ref.referenceRadiusMeters) continue;
    allNearbyCount++;
    const prev=points[i-1],next=points[i+1];
    if(!prev||!next)continue;
    const beforeGap=(points[i].t-prev.t)/60000,afterGap=(next.t-points[i].t)/60000;
    if(beforeGap>MAX_OBSERVATION_GAP_MINUTES||afterGap>MAX_OBSERVATION_GAP_MINUTES)continue;
    if(haversineMeters(points[i],prev)<MIN_MOVEMENT_METERS||
       haversineMeters(points[i],next)<MIN_MOVEMENT_METERS)continue;
    candidates.push({
      kind:'MOVING_NEAR_REFERENCE_NOT_CONFIRMED_BRIDGE_CROSSING',
      nearestObservedAt:points[i].seen,nearestObservedDistanceMeters:round(d),
      nearbyObservedBracketStart:prev.seen,nearbyObservedBracketEnd:next.seen,
      beforeSampleGapMinutes:round(beforeGap),afterSampleGapMinutes:round(afterGap),
      observedMovementBeforeMeters:round(haversineMeters(points[i],prev)),
      observedMovementAfterMeters:round(haversineMeters(points[i],next)),
      evidenceSource:'NOAA historical timestamped AIS points'
    });
  }
  const episodes=[];
  for(const e of candidates){
    const prior=episodes[episodes.length-1];
    if(prior&&Date.parse(e.nearestObservedAt)-Date.parse(prior.lastCandidateAt)<=EPISODE_SEPARATION_MINUTES*60000){
      prior.lastCandidateAt=e.nearestObservedAt;
      if(e.nearestObservedDistanceMeters<prior.closest.nearestObservedDistanceMeters) prior.closest=e;
      prior.candidateCount++;
    }else episodes.push({closest:e,lastCandidateAt:e.nearestObservedAt,candidateCount:1});
  }
  return {referenceId:ref.id,riverMile:ref.riverMile,pointStatus:ref.pointStatus,
    coordinateSource:ref.coordinateSource,coordinateRole:ref.coordinateRole,
    status:episodes.length?'MOVING_NEAR_REFERENCE_ONLY':allNearbyCount?'NEARBY_BUT_MOVEMENT_OR_GAP_INSUFFICIENT':'NO_NEARBY_OBSERVATIONS',
    closestObservedDistanceMeters:Number.isFinite(bestDistanceMeters)?round(bestDistanceMeters):null,
    closestObservedAt:bestObservedAt,allNearbyCount,
    episodes:episodes.map(x=>({...x.closest,candidateCount:x.candidateCount}))};
}
export function analyzeReferenceProximity(study,refs) {
  checkReferences(refs);
  if(study?.schemaVersion!==1||!Array.isArray(study.tracks)||study.observationKind!=='historical') throw Error('Expected historical NOAA broadcast points only');
  const analyses=study.tracks.map(track=>{
    const observations=validObservations(track);
    const referenceChecks=refs.references.map(ref=>evaluateReference(observations,ref));
    const witnessed=referenceChecks.flatMap(ref=>ref.episodes.map(e=>({referenceId:ref.referenceId,riverMile:ref.riverMile,at:e.nearestObservedAt}))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    const observedOrder=[];
    for(let i=0;i<witnessed.length-1;i++){
      const a=witnessed[i],b=witnessed[i+1],delta=(Date.parse(b.at)-Date.parse(a.at))/60000;
      if(a.referenceId===b.referenceId||delta<=0||delta>180)continue;
      observedOrder.push({fromReference:a.referenceId,toReference:b.referenceId,minutesBetweenNearestAisObservations:round(delta),
        interpretation:a.riverMile<b.riverMile?'ORDER_CONSISTENT_WITH_UPRIVER_MOVEMENT':'ORDER_CONSISTENT_WITH_DOWNRIVER_MOVEMENT',
        warning:'Approximate proximity points, not verified bridge crossings or elapsed travel between spans'});
    }
    return {mmsi:track.mmsi,names:track.vesselNames||[],observations:observations.length,referenceChecks,observedOrder};
  });
  return {classification:'HISTORICAL_NEAR_BRIDGE_REFERENCES_ONLY',bridgeCrossingsValidated:false,bridgeOpeningTimesValidated:false,
    bridgeEtasEnabled:false,referenceAsOf:refs.asOf,analysisSource:study.source,analyses,
    warnings:refs.limitations};
}
async function main(args){
  if(args.length!==6||args[0]!=='--input'||args[2]!=='--references'||args[4]!=='--out')throw Error('Usage: node scripts/cuyahoga-bridge-proximity.mjs --input normalized.json --references bridge-observation-references.json --out report.json');
  const [study,refs]=await Promise.all([readFile(args[1],'utf8').then(JSON.parse),readFile(args[3],'utf8').then(JSON.parse)]);
  const out=analyzeReferenceProximity(study,refs);
  await writeFile(args[5],JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({classification:out.classification,bridgeEtasEnabled:out.bridgeEtasEnabled,analyses:out.analyses},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
