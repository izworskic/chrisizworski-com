#!/usr/bin/env node
'use strict';
// Existing 6-hour research cadence can reuse this bounded NOAA query. Neither
// water level gauge is in Grand Marais. No beach safety or new-rock verdict.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sourceURL,decodeGaugeData,lakeLevelContext}=require('../../lib/rockhounding/noaa-regional-water-level.cjs');
const {pictureFreeReport}=require('../../lib/rockhounding/photo-free-poststorm.cjs');
const {loadGrandMaraisHazards}=require('../../lib/rockhounding/nws-shore-hazards.cjs');
const SOURCES=['9099018','9099004'],H=3600000;
async function capture({waveLedger,nowISO=new Date().toISOString(),fetchFn=fetch,
 hazardsFn=loadGrandMaraisHazards}={}){
 const now=Date.parse(nowISO);
 if(!waveLedger||waveLedger.stationId!=='SPOT-1361'||!Number.isFinite(now))
  throw Error('Photo-free research requires original GLOS ledger and explicit clock');
 const from=new Date(now-72*H).toISOString().replace('.000Z','Z'),
   to=new Date(now).toISOString().replace('.000Z','Z');
 const gauges=[],audit=[];
 for(const id of SOURCES){
  const url=sourceURL(id,{startISO:from,endISO:to});
  try{
   const response=await fetchFn(url,{headers:{
    Accept:'application/json','User-Agent':'ChrisIzworskiRockhoundingResearch/1.0 (chrisizworski.com)'},
    signal:AbortSignal.timeout(25000)});
   if(!response?.ok)throw Error('NOAA HTTP '+(response?.status??'UNKNOWN'));
   const body=await response.text();
   if(typeof body!=='string'||body.length>5500000)throw Error('NOAA response exceeded size limit');
   const parsed=decodeGaugeData(body,id);
   // Source may deliver preliminary q=p before monthly verification.
   gauges.push(parsed);
   audit.push({station:id,url,sourceResult:'ORIGINAL_OBSERVATIONS',
    sourceRecords:parsed.rawRows,accepted:parsed.accepted.length,
    rejected:parsed.rejectedRows,sha256:crypto.createHash('sha256').update(body).digest('hex')});
  }catch(err){
   // A failed sensor is UNKNOWN, not a measured zero or a safe beach.
   gauges.push({station:id,accepted:[],rejectedRows:0});
   audit.push({station:id,url,sourceResult:'UNAVAILABLE',
    reason:String(err?.message||err).slice(0,180),sourceRecords:0,accepted:0});
  }
 }
 const regional=lakeLevelContext(gauges,{nowISO});
 let hazards;
 try{hazards=await hazardsFn({nowISO})}
 catch{hazards={status:'UNKNOWN'};}
 if(!['ACTIVE','CLEAR','UNKNOWN'].includes(hazards?.status))hazards={status:'UNKNOWN'};
 const evaluation=pictureFreeReport({waveLedger,regionalWaterLevels:regional,
  nwsHazards:hazards,nowISO});
 return {...evaluation,sourceQueryUTC:{from,to},noaaSourceAudit:audit,
  isArchivedResearchOutput:true,automaticallyPublishedVisitorVerdict:false,
  noPhotosOrSatelliteRequired:true,paidApiKeysRequired:false,
  sourceLimit:'72-hour NOAA observations per distant station; no derived Grand Marais waterline'};
}
function writeAtomic(filename,object){
 const target=path.resolve(filename);fs.mkdirSync(path.dirname(target),{recursive:true});
 const temp=target+'.tmp-'+process.pid;
 fs.writeFileSync(temp,JSON.stringify(object,null,2)+'\n');fs.renameSync(temp,target);
}
async function main(args=process.argv.slice(2)){
 if(args.length!==4||args[0]!=='--ledger'||args[2]!=='--out')
  throw Error('Usage: --ledger ORIGINAL_GLOS_LEDGER.json --out RESEARCH_REPORT.json');
 const ledger=JSON.parse(fs.readFileSync(args[1],'utf8'));
 const report=await capture({waveLedger:ledger});
 writeAtomic(args[3],report);
 console.log('ROCKHOUNDING_NO_PHOTO_POSTSTORM '+JSON.stringify({
  state:report.state,offshore:report.originalOffshoreWaveEvidence.status,
  gauges:report.regionalLakeLevelContext.stations.map(s=>({
   id:s.station,status:s.dataStatus,observed6hRangeM:s.observedRangeM,ageHours:s.ageHours})),
  nws:report.nwsHazardStatus,rockProbability:false,safeBeach:false}));
}
if(require.main===module)main().catch(e=>{
 console.error('ROCKHOUNDING_NO_PHOTO_FAILED '+String(e?.message||e));process.exitCode=1;
});
module.exports={capture};
