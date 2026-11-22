#!/usr/bin/env node
// Offline research. A straight chord between two AIS fixes is NOT the ship's observed path.
// Its intersection with county road geometry is NOT a confirmed crossing or bridge opening.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {auditCountyCenterlines} from './cuyahoga-county-centerline-audit.mjs';

const RAD=Math.PI/180,MX=111195*Math.cos(41.5*RAD),MY=111195;
const xy=(lon,lat)=>({x:(lon+81.7)*MX,y:(lat-41.5)*MY});
const vector=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round=n=>Math.round(n*10)/10;
const MAX_GAP_SECONDS=180,MIN_MOVEMENT_METERS=15,MAX_MOVEMENT_METERS=650;
const EPISODE_SEPARATION_MINUTES=15;

export function straightChordIntersection(a,b,c,d){
  const ab=vector(a,b),cd=vector(c,d),v=cross(ab,cd);
  if(Math.abs(v)<1e-9)return null;
  const ac=vector(a,c),t=cross(ac,cd)/v,u=cross(ac,ab)/v;
  // Strict interior avoids touching an arbitrary road endpoint or a coincident point.
  return t>1e-7&&t<1-1e-7&&u>1e-7&&u<1-1e-7 ? {fractionOnAisChord:t,fractionOnRoadSegment:u}:null;
}
function validTrack(t){
  if(!/^\d{9}$/.test(String(t?.mmsi??''))||!Array.isArray(t.points)||t.points.length>30000)
    throw Error('Invalid NOAA historical track');
  return t.points.map(p=>{
    const s=Date.parse(p.seen);
    if(!Number.isFinite(s)||!p.seen.endsWith('Z')||
       !Number.isFinite(p.lat)||!Number.isFinite(p.lon)||
       p.lat<41.4||p.lat>41.6||p.lon < -81.8||p.lon > -81.6)throw Error('Invalid study-area AIS observation');
    return {...p,t:s,x:xy(p.lon,p.lat)};
  }).sort((a,b)=>a.t-b.t).filter((p,i,rows)=>i===0||p.t>rows[i-1].t);
}
export function analyzeRoadChords(study,catalog,county,channel){
  if(study?.schemaVersion!==1||study.observationKind!=='historical'||!Array.isArray(study.tracks))
    throw Error('Requires immutable historical NOAA timestamped point study');
  const crosswalk=auditCountyCenterlines(catalog,county,channel);
  const targets=crosswalk.checks.filter(e=>
    e.status==='COUNTY_ROAD_CENTERLINE_OVERLAPS_CHANNEL_NEAR_CHART_REFERENCE');
  const records=targets.map(ref=>{
    const sourceFeatures=county.features.filter(f=>f.properties?.fullname===ref.roadName&&
      ref.matchedSegments.some(s=>s.countyObjectId===f.properties?.OBJECTID));
    const segments=sourceFeatures.flatMap(f=>{
      const coords=f.geometry?.coordinates;
      if(f.geometry?.type!=='LineString'||!Array.isArray(coords))return [];
      return coords.slice(1).map((b,i)=>({from:xy(coords[i][0],coords[i][1]),to:xy(b[0],b[1]),roadObjectId:f.properties.OBJECTID}));
    });
    return {...ref,roadSegments:segments};
  });
  const vesselReports=study.tracks.map(track=>{
    const points=validTrack(track);
    const results=records.map(ref=>{
      const found=[];
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],gap=(b.t-a.t)/1000,moved=length(a.x,b.x);
        if(gap<=0||gap>MAX_GAP_SECONDS||moved<MIN_MOVEMENT_METERS||moved>MAX_MOVEMENT_METERS)continue;
        const hits=ref.roadSegments.filter(s=>straightChordIntersection(a.x,b.x,s.from,s.to));
        if(!hits.length)continue;
        found.push({
          label:'STRAIGHT_AIS_FIX_CHORD_INTERSECTION_CANDIDATE_NOT_CONFIRMED_CROSSING',
          observedBracketStart:a.seen,observedBracketEnd:b.seen,
          bracketSeconds:round(gap),
          chordLengthMeters:round(moved),
          officialCountyRoadObjectIds:[...new Set(hits.map(h=>h.roadObjectId))].sort((x,y)=>x-y),
          interpretation:'Two actual NOAA observations straddle a mapped road centerline if connected by a straight chord. No intermediate ship position was observed.'
        });
      }
      const episodes=[];
      for(const hit of found){
        const prev=episodes[episodes.length-1];
        if(prev&&(Date.parse(hit.observedBracketStart)-Date.parse(prev.lastBracketEnd))<=EPISODE_SEPARATION_MINUTES*60000){
          prev.lastBracketEnd=hit.observedBracketEnd;prev.candidateChords++;
        }else episodes.push({firstBracketStart:hit.observedBracketStart,lastBracketEnd:hit.observedBracketEnd,candidateChords:1,representative:hit});
      }
      return {bridgeReferenceId:ref.bridgeId,riverMile:ref.riverMile,
        roadName:ref.roadName,matchedCountyRoadObjects:ref.matchedSegments.map(s=>s.countyObjectId),
        status:episodes.length?'POTENTIAL_CHORD_INTERSECTION_NOT_SURVEYED_BRIDGE_CROSSING':'NO_VALID_AIS_CHORD_INTERSECTION',
        episodes,confirmedBridgePassages:0};
    });
    return {mmsi:track.mmsi,vesselNames:track.vesselNames||[],observations:points.length,
      roadLineIntersectionCandidates:results};
  });
  return {
    kind:'NOAA_AIS_FIX_CHORD_AND_COUNTY_ROAD_CENTERLINE_RESEARCH',
    source:study.source,observationKind:'historical',
    sourceFilesProvenance:crosswalk.sources,
    matchedRoadReferences:targets.map(x=>x.bridgeId),
    caveat:'Straight geographic chords between AIS fixes do not reconstruct the actual vessel path. A road centerline and authorized channel polygon do not survey a bridge crossing axis.',
    crossedBridgeAxisValidated:false,bridgeOpeningObserved:false,predictedArrivalAccuracyMeasured:false,
    futureBridgeEtaEnabled:false,vessels:vesselReports};
}
async function main(args){
  if(args.length!==10||args[0]!=='--input'||args[2]!=='--coast-pilot'||args[4]!=='--county'||args[6]!=='--usace'||args[8]!=='--out')
    throw Error('Usage: --input normalized-noaa.json --coast-pilot catalog.json --county county-roads.geojson --usace channel.geojson --out report.json');
  const [study,catalog,county,usace]=await Promise.all([args[1],args[3],args[5],args[7]].map(f=>readFile(f,'utf8').then(JSON.parse)));
  const result=analyzeRoadChords(study,catalog,county,usace);
  await writeFile(args[9],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({kind:result.kind,futureBridgeEtaEnabled:false,vessels:result.vessels.map(v=>({mmsi:v.mmsi,observations:v.observations,
    bridgeCandidates:v.roadLineIntersectionCandidates.map(x=>({id:x.bridgeReferenceId,status:x.status,episodes:x.episodes.map(e=>({start:e.firstBracketStart,end:e.lastBracketEnd,candidateChords:e.candidateChords}))}))}))},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
