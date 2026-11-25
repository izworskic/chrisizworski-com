'use strict';
const {makeCorridor,dateMs}=require('./corridor-intelligence.cjs');
const soo=require('./soo-locks-next');
const engine=makeCorridor(soo.ROUTES,soo);
const geometrySource='lib/soo-locks-next.js:ROUTES (existing OSM-based modeled channel, 2026-09-27; not a surveyed route)';
function replayLibraryDay(day){
 if(day?.schemaVersion!==1||day.kind!=='NOAA_HISTORICAL_VESSEL_LIBRARY_DAY'||day.forecastEnabled!==false||
   day.timezone!=='UTC'||!/^2025-\d{2}-\d{2}$/.test(day.date)||!/^[a-f0-9]{64}$/.test(day.archiveSha256)||
   day.sourceUrl!=='https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+day.date+'.csv.zst'||
   JSON.stringify(day.pointFields)!==JSON.stringify(['seen','lat','lon','speedKnots','course','heading','shipType','lengthMeters']))throw Error('Expected source-identified NOAA library day');
 const r=day.regions?.find(x=>x.id==='soo');
 if(!r||JSON.stringify(r.bbox)!==JSON.stringify(soo.RIVER_BBOX)||!Array.isArray(r.tracks))throw Error('Missing exact Soo study box');
 const states={},pairs={},directions={},ids=new Set();
 let fixes=0,adjacentPairs=0,supportedPairs=0;
 const bump=(o,k)=>o[k]=(o[k]||0)+1;
 for(const t of r.tracks){
  if(!/^\d{9}$/.test(t.mmsi)||ids.has(t.mmsi)||!Array.isArray(t.points))throw Error('Invalid or repeated track');
  ids.add(t.mmsi);let prior=null;
  for(const p of t.points){
   if(!Array.isArray(p)||p.length!==8||!Number.isFinite(dateMs(p[0]))||!p[0].startsWith(day.date+'T')||
      !Number.isFinite(p[1])||!Number.isFinite(p[2])||!Number.isInteger(p[6])||p[6]<70||p[6]>89)throw Error('Invalid source fix');
   const v={mmsi:t.mmsi,seen:p[0],lat:p[1],lon:p[2],speedKnots:p[3],course:p[4],heading:p[5],shipType:p[6],lengthMeters:p[7]};
   if(!soo.inBox(v,soo.RIVER_BBOX)||prior&&dateMs(prior.seen)>=dateMs(v.seen))throw Error('Outside source box or unordered track');
   const c=engine.classify(v);bump(states,c.state);fixes++;
   if(prior){const move=engine.pair(prior,v);bump(pairs,move.state);adjacentPairs++;
    if(move.state==='OBSERVED_PAIR_SUPPORTS_PROGRESS'){supportedPairs++;bump(directions,move.direction);}
   }
   prior=v;
  }
 }
 if(fixes!==r.points||ids.size!==r.vessels)throw Error('Archive count mismatch');
 return {date:day.date,sourceUrl:day.sourceUrl,archiveSha256:day.archiveSha256,fixes,vessels:ids.size,
  adjacentPairs,supportedPairs,states,pairStates:pairs,directions,geometrySource,forecastEnabled:false};
}
module.exports={engine,replayLibraryDay,geometrySource};
