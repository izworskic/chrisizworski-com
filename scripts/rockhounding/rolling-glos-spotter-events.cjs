#!/usr/bin/env node
'use strict';
// One bounded GLOS Seagull + existing NWS hazard research capture.
// Writes only a separate archival branch, never public visitor data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {requestUrl,parseSpotterCSV}=require('../../lib/rockhounding/glos-spotter.cjs');
const {mergeSpotterLedger,offshoreEvents}=require('../../lib/rockhounding/glos-spotter-event-ledger.cjs');
const {loadGrandMaraisHazards,URLS}=require('../../lib/rockhounding/nws-shore-hazards.cjs');
const {photoFreeWaveHistory}=require('../../lib/rockhounding/photo-free-wave-pulse.cjs');
const H=3600000;
function isoUTC(ms){return new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');}
async function capture({previous=null,nowISO=new Date().toISOString(),fetchFn=fetch,hazardsFn=loadGrandMaraisHazards}={}){
 const now=Date.parse(nowISO);
 if(!Number.isFinite(now))throw Error('Valid collection clock required');
 // The source is re-fetched with a broad overlap to allow delayed archive
 // delivery and idempotent, original-measurement deduplication.
 const start=isoUTC(now-96*H),end=isoUTC(now);
 const originalUrl=requestUrl({startISO:start,endISO:end});
 const response=await fetchFn(originalUrl,{
  headers:{Accept:'text/csv','User-Agent':'ChrisIzworskiRockhoundingResearch/1.0 (chrisizworski.com)'},
  signal:AbortSignal.timeout(30000)});
 if(!response?.ok)throw Error('Original GLOS source unavailable: HTTP '+(response?.status??'UNKNOWN'));
 const csv=await response.text();
 if(csv.length>2500000)throw Error('Original GLOS source exceeds bounded size');
 const parsed=parseSpotterCSV(csv);
 const ledger=mergeSpotterLedger(previous,parsed,{nowISO});
 const analysis=offshoreEvents(ledger,{nowISO});
 // Explicitly record NWS alerts as independent CURRENT alert information.
 // Unknown means UNKNOWN, never "clear". No safe-condition claim even if clear.
 let hazards;
 try{hazards=await hazardsFn({nowISO})}
 catch{hazards={status:'UNKNOWN',reason:'NWS_REQUEST_FAILED'};}
 if(!['ACTIVE','CLEAR','UNKNOWN'].includes(hazards?.status))
  hazards={status:'UNKNOWN',reason:'INVALID_NWS_RESPONSE'};
 const hazard={
  checkedAtUTC:nowISO,
  status:hazards.status,
  matchedAlertEvents:Array.isArray(hazards.alerts)?
    hazards.alerts.slice(0,30).map(x=>({event:String(x.event||'').slice(0,140),
      severity:String(x.severity||'Unknown').slice(0,40),
      expiresAtUTC:x.ends||null})):[],
  sources:URLS,
  coverageNote:'Current selected NWS point/nearshore-zone alerts only; no alert is NOT a beach safety clearance',
  noPresentDayMarineSafetyCertification:true
 };
 const photoFreeLakePulse=photoFreeWaveHistory(ledger,{nowISO,hazardSnapshot:hazard});
 const report={...analysis,hazardSnapshot:hazard,
  photoFreeLakePulse,
  sourceQueryStartUTC:start,sourceQueryEndUTC:end,
  sourceRecordCount:parsed.rows.length,rejectedOriginalRows:parsed.rejectedRows,
  originalCsvSha256:crypto.createHash('sha256').update(csv,'utf8').digest('hex'),
  sourceUrl:'https://seagull-erddap.glos.org/erddap/tabledap/obs_140.csv',
  observedWaveEventsNotModeledForecasts:true,
  dailyObservationsNotIndependentStorms:true,
  measuredBeachBreakingWaveHeightM:null,
  calibratedToRockFindings:false,
  canClaimHazardFreeVisit:false,
  canPublishRockhoundingWindow:false,
  canClaimCollectingPermission:false,
  summary:'Actual offshore Spotter observations and separate current NWS alerts. Not a beach wave, fresh-stone, access or safety forecast.'};
 return {ledger,report};
}
function readArgs(argv){
 const out={};
 for(let i=0;i<argv.length;i+=2){
  if(!['--ledger','--report','--now'].includes(argv[i])||!argv[i+1]||out[argv[i]])
   throw Error('Expected --ledger, --report and optional --now');
  out[argv[i]]=argv[i+1];
 }
 if(!out['--ledger']||!out['--report'])throw Error('Missing persistent archive output paths');
 return out;
}
function writeAtomic(filename,data){
 const name=path.resolve(filename);fs.mkdirSync(path.dirname(name),{recursive:true});
 const tmp=name+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{encoding:'utf8',mode:0o600});
 fs.renameSync(tmp,name);
}
async function main(args=process.argv.slice(2)){
 const a=readArgs(args),nowISO=a['--now']||new Date().toISOString();
 const previous=fs.existsSync(a['--ledger'])?
  JSON.parse(fs.readFileSync(a['--ledger'],'utf8')):null;
 const {ledger,report}=await capture({previous,nowISO});
 writeAtomic(a['--ledger'],ledger);
 writeAtomic(a['--report'],report);
 console.log('ROCKHOUNDING_GLOS_OFFSHORE_HISTORY '+JSON.stringify({
  status:report.sourceStatus,records:report.recordCount,
  sourceLatestAt:report.latestObservedAt,added:ledger.diagnostics.added,
  correlatedEvents:report.eventCount,distinctQualifiedEvents:report.qualifiedDistinctEvents,
  nwsAlertsStatus:report.hazardSnapshot.status,canPublishRockhoundingWindow:false,
  actualBeachSafety:false}));
}
if(require.main===module)main().catch(e=>{
 console.error('ROCKHOUNDING_GLOS_HISTORY_FAILED '+(e?.message||String(e)));process.exitCode=1;
});
module.exports={capture,readArgs};
