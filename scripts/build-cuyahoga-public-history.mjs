#!/usr/bin/env node
// One-time local export of public-domain NOAA historical broadcast FIXES.
// No network, bridge ETAs, invented interpolated points or production API calls.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const examples=[
 {id:'barker-2025-07-07',name:'Mark W. Barker',date:'2025-07-07',mmsi:'368251670',file:'MARK_W_BARKER-2025-07-07-observations.json',checksum:'MARK_W_BARKER-2025-07-07-source.sha256'},
 {id:'laud-2025-08-15',name:'Sam Laud',date:'2025-08-15',mmsi:'366938760',file:'SAM_LAUD-2025-08-15-observations.json',checksum:'SAM_LAUD-2025-08-15-source.sha256'},
 {id:'barker-2025-08-21',name:'Mark W. Barker',date:'2025-08-21',mmsi:'368251670',file:'MARK_W_BARKER-2025-08-21-observations.json',checksum:'MARK_W_BARKER-2025-08-21-source.sha256'}
];
export function compileHistorical(extracted,checksums){
 const voyages=[];
 for(const sel of examples){
  const data=extracted[sel.file],hashText=checksums[sel.checksum];
  if(!data||data.schemaVersion!==1||data.observationKind!=='historical'||data.stats.matchedTimeAndBox<100)
    throw Error('Missing original NOAA archival evidence for '+sel.id);
  const tracks=data.tracks||[];
  if(tracks.length!==1||tracks[0].mmsi!==sel.mmsi||!Array.isArray(tracks[0].points))
    throw Error('Unexpected MMSI or NOAA track schema for '+sel.id);
  const hash=/^([a-f0-9]{64})\s/.exec(hashText||'')?.[1];
  if(!hash)throw Error('Missing immutable original NOAA source SHA256 for '+sel.id);
  const seen=new Set(),fixes=[];
  for(const fix of tracks[0].points){
   if(!Number.isFinite(fix.lat)||!Number.isFinite(fix.lon)||fix.lat<41.44||fix.lat>41.54||
      fix.lon< -81.75||fix.lon > -81.65||!fix.seen.startsWith(sel.date)||!fix.seen.endsWith('Z')||
      !Number.isFinite(Date.parse(fix.seen)))throw Error('Out-of-study-area or invalid NOAA point');
   if(seen.has(fix.seen))continue;seen.add(fix.seen);
   fixes.push({seen:fix.seen,lat:fix.lat,lon:fix.lon});
  }
  fixes.sort((a,b)=>a.seen.localeCompare(b.seen));
  if(fixes.length<100||fixes.length>25000)throw Error('Unexpected point count');
  voyages.push({id:sel.id,name:sel.name,date:sel.date,mmsi:sel.mmsi,
    originalNationwideNoaaArchive:'https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+sel.date+'.csv.zst',
    originalArchiveSha256:hash,firstObservedAt:fixes[0].seen,lastObservedAt:fixes.at(-1).seen,
    note:'These are genuine historical AIS fix locations inside a broad Cuyahoga research envelope. They are NOT a continuous river course or actual bridge crossing timestamps.',
    fixes});
 }
 return {schemaVersion:1,observationKind:'NOAA_HISTORICAL_BROADCAST_FIXES',
  dataset:'NOAA Office for Coastal Management, USCG NAIS Historical AIS 2025',
  publisherUrl:'https://coast.noaa.gov/accessais/',checkedOn:'2026-11-22',timezone:'UTC',
  dates:examples.map(e=>e.date),sourceLicense:'NOAA historical CC0 public domain data',
  disclaimers:['Archived points only; not live positions or a transit schedule',
   'There may be missing reports, stationary ships, and multiple directions per day',
   'Positions are observations. Connecting points does not prove the ship followed a straight course',
   'No drawbridge status, vessel ETA or official public route is inferred'],
  voyages};
}
async function main(args){
 if(args.length!==4||args[0]!=='--dir'||args[2]!=='--out')throw Error('Usage: --dir downloaded-actions-artifact --out public/noaa-historical-2025.json');
 const {join}=await import('node:path');
 const source={},hash={};
 for(const e of examples){
  source[e.file]=JSON.parse(await readFile(join(args[1],e.file),'utf8'));
  hash[e.checksum]=await readFile(join(args[1],e.checksum),'utf8');
 }
 const data=compileHistorical(source,hash);
 await writeFile(args[3],JSON.stringify(data)+'\n',{flag:'wx'});
 console.log(JSON.stringify({out:args[3],dates:data.dates,tracks:data.voyages.map(v=>({id:v.id,observations:v.fixes.length,first:v.firstObservedAt,last:v.lastObservedAt})),futureEtaEnabled:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
