'use strict';
// Offline bounded multi-waterway NOAA point archive collector.
// Coordinates are inclusion boxes, never navigable geometry.
const MAX_ROWS=250000,MAX_INPUT_ROWS=12000000;
const key=s=>String(s).replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[_\s-]/g,'');
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
function numeric(s,min,max){
 if(typeof s!=='string'||!s.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s.trim()))return null;
 const n=Number(s);return finite(n,min,max)?n:null;
}
function columns(header){
 const fields=header.map(key);
 const aliases={mmsi:['mmsi','mmis'],time:['basedatetime'],lat:['lat','latitude'],lon:['lon','longitude'],
  type:['vesseltype'],speed:['sog'],course:['cog'],heading:['heading'],length:['length','vessellength']};
 const out={};
 for(const [k,names] of Object.entries(aliases)){
  const matches=fields.map((f,i)=>names.includes(f)?i:-1).filter(i=>i>=0);
  if(matches.length!==1)throw Error('Missing or ambiguous NOAA column: '+k);
  out[k]=matches[0];
 }
 return out;
}
function createLibraryDay({date,regions,archiveSha256,parseCsvLine,noaaUtc}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||
    !/^[a-f0-9]{64}$/.test(archiveSha256)||!Array.isArray(regions)||!regions.length||regions.length>20)
  throw Error('Invalid source manifest');
 const ids=new Set(),areas=regions.map(r=>{
  if(!/^[a-z0-9-]+$/.test(r.id)||ids.has(r.id)||!Array.isArray(r.bbox)||r.bbox.length!==4||
    !r.bbox.every(Number.isFinite)||r.bbox[0]>=r.bbox[2]||r.bbox[1]>=r.bbox[3]||
    r.bbox[0]<40||r.bbox[2]>50||r.bbox[1]< -94||r.bbox[3]> -73)throw Error('Invalid study box');
  ids.add(r.id);return {...r,groups:new Map(),inside:0,unknownType:0,outsideCohort:0,invalidIdentityTime:0,duplicates:0,conflicts:0};
 });
 let header=null,inputRows=0,stored=0,invalidPosition=0;
 const box=(r,lat,lon)=>lat>=r.bbox[0]&&lat<=r.bbox[2]&&lon>=r.bbox[1]&&lon<=r.bbox[3];
 function accept(line){
  if(!line.trim())return;
  if(!header){header=columns(parseCsvLine(line));return;}
  if(++inputRows>MAX_INPUT_ROWS)throw Error('Archive row budget exceeded');
  const fields=parseCsvLine(line),get=k=>fields[header[k]];
  const lat=numeric(get('lat'),-90,90),lon=numeric(get('lon'),-180,180);
  if(lat===null||lon===null){invalidPosition++;return;}
  const local=areas.filter(r=>box(r,lat,lon));
  if(!local.length)return;
  const type=numeric(get('type'),1,99),mmsi=String(get('mmsi')||'').trim(),seen=noaaUtc(get('time'));
  for(const r of local){
   r.inside++;
   if(!Number.isInteger(type)){r.unknownType++;continue;}
   if(type<70||type>89){r.outsideCohort++;continue;}
   if(!/^\d{9}$/.test(mmsi)||!seen||!seen.startsWith(date+'T')){r.invalidIdentityTime++;continue;}
   const s=numeric(get('speed'),0,102.2),speed=s===102.2?null:s;
   const course=numeric(get('course'),0,359.9),heading=numeric(get('heading'),0,359),length=numeric(get('length'),1,500);
   const row=[seen,lat,lon,speed,course,heading,type,length];
   let group=r.groups.get(mmsi);
   if(!group){group=new Map();r.groups.set(mmsi,group);}
   if(group.has(seen)){
    const old=group.get(seen);
    if(old===null){r.duplicates++;continue;}
    if(JSON.stringify(old)===JSON.stringify(row)){r.duplicates++;continue;}
    group.set(seen,null);r.conflicts++;continue;
   }
   if(++stored>MAX_ROWS)throw Error('Selected-row budget exceeded; narrow regions or dates');
   group.set(seen,row);
  }
 }
 function finish(){
  if(!header||!inputRows)throw Error('Archive contains no data rows');
  const regions=areas.map(r=>{
   const tracks=[...r.groups].sort(([a],[b])=>a.localeCompare(b)).map(([mmsi,group])=>({mmsi,points:[...group.values()].filter(Boolean).sort((a,b)=>a[0].localeCompare(b[0]))})).filter(t=>t.points.length);
   let gapsOver3Minutes=0,maxGapSeconds=0,points=0,unknownSpeed=0;
   for(const t of tracks){
    points+=t.points.length;
    for(let i=0;i<t.points.length;i++){
     if(t.points[i][3]===null)unknownSpeed++;
     if(i){const gap=(Date.parse(t.points[i][0])-Date.parse(t.points[i-1][0]))/1000;maxGapSeconds=Math.max(maxGapSeconds,gap);if(gap>180)gapsOver3Minutes++;}
    }
   }
   return {id:r.id,bbox:r.bbox,reference:r.reference,insideSourceRows:r.inside,unknownTypeRows:r.unknownType,
    outsideCohortRows:r.outsideCohort,invalidIdentityTime:r.invalidIdentityTime,duplicates:r.duplicates,conflictingTimestamps:r.conflicts,
    points,vessels:tracks.length,unknownSpeed,gapsOver3Minutes,maxGapSeconds:tracks.some(t=>t.points.length>1)?maxGapSeconds:null,
    state:points?'OBSERVED_REPORTS':'NO_QUALIFYING_REPORTS_NOT_ABSENCE',tracks};
  });
  return {schemaVersion:1,kind:'NOAA_HISTORICAL_VESSEL_LIBRARY_DAY',date,sourceUrl:'https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+date+'.csv.zst',archiveSha256,
   timezone:'UTC',cohort:'reported AIS cargo or tanker type 70-89',pointFields:['seen','lat','lon','speedKnots','course','heading','shipType','lengthMeters'],
   inputRows,invalidPositionRows:invalidPosition,regions,forecastEnabled:false};
 }
 return {accept,finish};
}
function summarize(days,plan){
 if(!Array.isArray(days)||!days.length||days.length>plan.dates.length)throw Error('Invalid day collection');
 const seen=new Set();
 for(const d of days){
  if(d.kind!=='NOAA_HISTORICAL_VESSEL_LIBRARY_DAY'||d.forecastEnabled!==false||!plan.dates.includes(d.date)||seen.has(d.date)||
     d.regions.map(r=>r.id).join('|')!==plan.regions.map(r=>r.id).join('|'))throw Error('Invalid or repeated library day');
  seen.add(d.date);
 }
 return {schemaVersion:1,kind:'HISTORICAL_OBSERVATION_COVERAGE_NOT_PASSAGE_CALIBRATION',
  plannedDates:plan.dates,processedDates:[...seen].sort(),missingDates:plan.dates.filter(d=>!seen.has(d)),state:seen.size===plan.dates.length?'PILOT_DATES_PROCESSED':'PARTIAL',
  regions:plan.regions.map(p=>{
   const rows=days.map(d=>({date:d.date,region:d.regions.find(r=>r.id===p.id)}));
   const ships=new Set(rows.flatMap(x=>x.region.tracks.map(t=>t.mmsi)));
   return {id:p.id,observedDates:rows.filter(x=>x.region.points>0).map(x=>x.date).sort(),distinctVessels:ships.size,
    regionalPointCount:rows.reduce((n,x)=>n+x.region.points,0),days:rows.map(({date,region:r})=>({date,points:r.points,vessels:r.vessels,gapsOver3Minutes:r.gapsOver3Minutes,state:r.state})),
    passageGroundTruth:'NOT_ESTABLISHED'};
  }),forecastEnabled:false,
  limitations:'Regional counts may overlap. NOAA coverage, vessel type and complete voyages are not guaranteed, particularly in Canadian waters. A zero is no qualifying source report, not no traffic.'};
}
module.exports={columns,createLibraryDay,summarize};
