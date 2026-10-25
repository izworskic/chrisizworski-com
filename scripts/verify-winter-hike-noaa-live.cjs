#!/usr/bin/env node
'use strict';
/**
 * Explicit one-off NOAA NCEI live integration gate, not a fake mocked test.
 * Hits the same serverless API that the selected route detail calls.
 * No credentials, no park contacts, no inferred parking or live trip clearance.
 */
const handler=require('../api/winter-hike-lab.js');
const sites=[
 {id:'vasa-snowshoe-orange',name:'Vasa / Traverse City'},
 {id:'hartwick-old-growth',name:'Hartwick Pines / Grayling'},
 {id:'bay-tobico-marsh',name:'Tobico Marsh / Saginaw Bay'},
 {id:'sleepbear-alligator-easy',name:'Sleeping Bear / Leelanau'}
];
async function runAPI(route){
 let code=0,headers={},payload=null;
 const res={
  setHeader(k,v){headers[k]=v;return this},
  status(n){code=n;return this},
  json(j){payload=j;return j}
 };
 const start=Date.now();
 await handler({method:'GET',query:{mode:'season',route}},res);
 return {code,headers,payload,elapsed:Date.now()-start};
}
async function main(){
 let meaningful=0,hadReports=0;const rows=[];
 console.log('NOAA LIVE E2E: NCEI daily-summaries SNWD, one station per trail, 2023-2026 complete winters');
 for(const loc of sites){
  const H=require('../lib/winter-hike-history.cjs');
  const Routes=require('../lib/winter-hike-routes.cjs');
  const point=Routes.routeById(loc.id).referencePoint;
  const discovered=await H.discoverStations(point,2025,'02-15');
  console.log('NOAA DISCOVERY '+JSON.stringify({
   route:loc.id,status:discovered.status,
   candidates:discovered.candidates.map(x=>({id:x.id,name:x.name,miles:x.miles,coverage:x.coverage}))
  }));
  if(['bay-tobico-marsh','sleepbear-alligator-easy'].includes(loc.id)){
   for(const c of discovered.candidates.slice(0,3)){
    for(const year of [2025]){
     const url=H.stationRequestUrl(c.id,year,'02-15');
     try{
      const rr=await fetch(url,{signal:AbortSignal.timeout(12000)});
      const raw=await rr.text();let data;try{data=JSON.parse(raw)}catch{}
      const rows=Array.isArray(data)?data:null;
      console.log('NOAA SAMPLE DIAGNOSTIC '+JSON.stringify({
       route:loc.id,station:c.id,http:rr.status,bytes:raw.length,
       records:rows?.length||0,first:rows?.[0]||null,
       accepted:rows?.filter(x=>H.normalizeObservation(x,year,'02-15',point)).length||0,
       error:!rr.ok?raw.slice(0,180):null
      }));
     }catch(e){console.log('NOAA SAMPLE DIAGNOSTIC '+JSON.stringify({
      route:loc.id,station:c.id,error:String(e.message||e)}));}
    }
   }
  }
  const r=await runAPI(loc.id),p=r.payload||{};
  const yrs=Array.isArray(p.winterYears)?p.winterYears:[];
  const valid=p.station&&p.station.id&&p.kind==='NOAA_NCEI_GHCN_DAILY_FULL_WINTER_STATION_SNOW_DEPTH';
  const reportDays=yrs.reduce((t,y)=>t+(y.reportedDays||0),0);
  const complete=yrs.filter(y=>y.reportedDays>=120).length;
  const classified=Array.isArray(p.weeks)?p.weeks.filter(w=>w.status==='historically-frequent-6in-station-snow'):[];
  const sourceSafe=yrs.every(y=>typeof y.sourceUrl==='string'&&
   y.sourceUrl.startsWith('https://www.ncei.noaa.gov/access/services/data/v1?')&&
   new URL(y.sourceUrl).searchParams.get('stations')===p.station?.id);
  if(valid&&r.code===200&&sourceSafe&&p.parkingVerified===false&&p.routeOpenVerified===false&&
    yrs.length===4&&p.weeks.length===26&&reportDays>0)hadReports++;
  if(valid&&r.code===200&&sourceSafe&&complete>=3&&reportDays>=400)meaningful++;
  for(const w of classified){
   if(w.qualifyingWinters<3||w.reportWinters<3||w.rows.filter(x=>x.eligible&&x.qualifies).length<3)
    throw new Error('SOURCE CLASSIFICATION INVALID: '+loc.id+' week '+w.week);
  }
  rows.push({place:loc.name,route:loc.id,http:r.code,latencyMs:r.elapsed,
   source:p.kind||p.status,spatial:p.stationSpatialInterpretation||'unknown',station:p.station?{
    id:p.station.id,name:p.station.name,miles:p.station.miles
   }:null,observedDays:reportDays,completeWinters:complete,
   weeks:p.weeks?.length||0,historicallyFrequentWeeks:classified.length,
   upstreamStatuses:yrs.map(y=>({year:y.year,status:y.status,days:y.reportedDays})),
   noGPS:p.parkingVerified===false && p.routeOpenVerified===false,
   err:r.code!==200?p.error:null});
  console.log('NOAA ROUTE RESULT '+JSON.stringify(rows.at(-1)));
 }
 console.log('NOAA LIVE SUMMARY '+JSON.stringify({tested:sites.length,
  withRealObservedSnow:hadReports,with3HighCoverageWinters:meaningful,results:rows}));
 if(hadReports<2||meaningful<1){
  console.error('LIVE SOURCE GATE FAILED. Insufficient verified NOAA records; never replace missing data with fake historical values.');
  process.exitCode=1;
 } else console.log('NOAA LIVE SOURCE GATE PASSED. Historical station data only; parking and travel remain unverified.');
}
main().catch(e=>{console.error('NOAA live integration error: '+String(e.message||e));process.exitCode=1});
