#!/usr/bin/env node
'use strict';
// ONE-TIME research backfill of original GLOS SPOT-1361 observations.
// Disjoint historical UTC windows, no NOAA model reconstructions or
// interpolated surf, NWS warning histories, stone exposure or safety claims.
// Do not schedule: the six-hour operational workflow handles future data.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {requestUrl,parseSpotterCSV}=require('../../lib/rockhounding/glos-spotter.cjs');
const {mergeSpotterLedger,offshoreEvents}=require('../../lib/rockhounding/glos-spotter-event-ledger.cjs');
const {capture}=require('./rolling-glos-spotter-events.cjs');
const DAY=86400000,MAX_DAYS=119,WINDOW_DAYS=7;
const SOURCE='https://seagull-erddap.glos.org/erddap/tabledap/obs_140.csv';
const iso=t=>new Date(t).toISOString().replace(/\.\d{3}Z$/,'Z');
function validateSettings({nowISO,days}){
 const now=Date.parse(nowISO);
 if(!Number.isFinite(now)||!Number.isInteger(days)||days<7||days>MAX_DAYS)
  throw Error('Original GLOS backfill limited to 7-119 days and a valid UTC clock');
 return now;
}
function windowsFor({nowISO,days=112}={}){
 const now=validateSettings({nowISO,days});
 const out=[],start=now-days*DAY;
 for(let from=start;from<now;from+=WINDOW_DAYS*DAY)
  out.push({fromISO:iso(from),toISO:iso(Math.min(now,from+WINDOW_DAYS*DAY))});
 if(out.length>18||out.length<1)throw Error('Unexpected historical source window count');
 return out;
}
async function backfill({previous=null,nowISO=new Date().toISOString(),days=112,
 fetchFn=fetch}={}){
 const now=validateSettings({nowISO,days});
 const chunks=windowsFor({nowISO,days});
 let ledger=previous,accepted=0,rejected=0,noResults=0;
 const provenance=[];
 for(const {fromISO,toISO} of chunks){
  const url=requestUrl({startISO:fromISO,endISO:toISO});
  const response=await fetchFn(url,{
   headers:{Accept:'text/csv','User-Agent':'ChrisIzworskiRockhoundingResearch/1.0 (chrisizworski.com)'},
   signal:AbortSignal.timeout(25000)
  });
  if(!response)throw Error('GLOS archival source response missing');
  const data=await response.text();
  if(typeof data!=='string'||data.length>2500000)
   throw Error('Oversized or invalid GLOS historical response');
  const hash=crypto.createHash('sha256').update(data,'utf8').digest('hex');
  if(response.status===404&&/no matching results|no data found|no matching rows/i.test(data)){
   noResults++;
   provenance.push({fromISO,toISO,status:'NO_SOURCE_ROWS_REPORTED',rows:0,sha256:hash});
   continue;
  }
  if(!response.ok)throw Error('GLOS archival query failed HTTP '+(response.status||'UNKNOWN')+' at '+fromISO);
  const parsed=parseSpotterCSV(data);
  const lower=Date.parse(fromISO),upper=Date.parse(toISO);
  for(const obs of parsed.rows){
   const t=Date.parse(obs.time);
   if(!Number.isFinite(t)||t<lower-60000||t>upper+60000||t>now+300000)
    throw Error('GLOS source row lies outside requested original historical UTC window');
  }
  ledger=mergeSpotterLedger(ledger,parsed,{nowISO,retentionDays:120});
  accepted+=parsed.rows.length;
  rejected+=parsed.rejectedRows;
  provenance.push({fromISO,toISO,status:parsed.rows.length?'ORIGINAL_OBSERVATIONS_RECEIVED':'EMPTY_SOURCE_WINDOW',
   rows:parsed.rows.length,rejectedRows:parsed.rejectedRows,sha256:hash});
 }
 // A long-provider outage is not a success or a zero-storm declaration.
 if(!ledger||!ledger.records?.length)
  throw Error('No verified original GLOS observations, refusing empty historic backfill');
 if(!provenance.some(w=>w.rows>0))throw Error('All GLOS source windows empty');
 const study=offshoreEvents(ledger,{nowISO});
 const audit={schemaVersion:'rockhounding-glos-2026-historical-backfill-audit-v1',
  runAtUTC:nowISO,station:'SPOT-1361',source:'GLOS_SEAGULL_OBS_140',
  originalProviderEndpoint:SOURCE,daysRequested:days,
  independentSourceWindows:provenance.length,noSourceResultWindows:noResults,
  totalOriginalRowsReceived:accepted,originalRowsRejected:rejected,
  dedupedStoredRecords:ledger.records.length,
  firstRetainedUTC:ledger.records[0].time,
  lastRetainedUTC:ledger.records.at(-1).time,
  sourceUtcDays:[...new Set(ledger.records.map(r=>r.time.slice(0,10)))].length,
  distinctOffshoreEpisodeGroups:study.eventCount,
  qualifiedDistinctMeasuredEpisodes:study.qualifiedDistinctEvents,
  trueStormEndedOrBeachSurveyVerified:false,
  noHistoricallyReconstructedNwsWarnings:true,
  notLiveBeachWaves:true,noStoneProbability:true,
  canPublishVisitWindow:false,canClaimSafeConditions:false,
  requestedWindows:provenance};
 return {ledger,audit,study};
}
function argsOf(argv){
 const o={};
 for(let i=0;i<argv.length;i+=2){
  if(!['--ledger','--report','--audit','--now','--days'].includes(argv[i])||
   !argv[i+1]||o[argv[i]])throw Error('Invalid backfill CLI argument');
  o[argv[i]]=argv[i+1];
 }
 for(const k of ['--ledger','--report','--audit'])if(!o[k])throw Error('Missing '+k);
 const days=o['--days']===undefined?112:Number(o['--days']);
 if(!Number.isInteger(days)||days<7||days>MAX_DAYS)throw Error('Invalid --days');
 return {...o,days};
}
function atomic(file,v){
 const dest=path.resolve(file);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 const tmp=dest+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(v,null,2)+'\n',{mode:0o600});
 fs.renameSync(tmp,dest);
}
async function main(argv=process.argv.slice(2)){
 const a=argsOf(argv),nowISO=a['--now']||new Date().toISOString();
 const prior=fs.existsSync(a['--ledger'])?JSON.parse(fs.readFileSync(a['--ledger'],'utf8')):null;
 const result=await backfill({previous:prior,nowISO,days:a.days});
 // Re-fetch the *current* 96 hours and current NWS status; old waves are
 // historical. NEVER backdate today's NWS alerts into earlier storm events.
 const current=await capture({previous:result.ledger,nowISO});
 const report={...current.report,historicalBackfillAudit:{
   runAtUTC:result.audit.runAtUTC,daysRequested:result.audit.daysRequested,
   originalQueryWindows:result.audit.independentSourceWindows,
   sourceDayCount:result.audit.sourceUtcDays,
   sampleCount:current.ledger.records.length,
   distinctOffshoreEpisodeGroups:current.report.eventCount,
   noHistoricNwsAlertReconstruction:true,
   canPublishVisitWindow:false}};
 // All API requests and parsing have succeeded before the archive is replaced.
 atomic(a['--ledger'],current.ledger);
 atomic(a['--report'],report);
 atomic(a['--audit'],result.audit);
 console.log('GLOS_SPOTTER_HISTORIC_BACKFILL '+JSON.stringify({
  rows:current.ledger.records.length,days:result.audit.sourceUtcDays,
  independentWindows:result.audit.independentSourceWindows,
  noSourceWindows:result.audit.noSourceResultWindows,
  eventGroups:current.report.eventCount,
  qualifiedMeasuredEpisodes:current.report.qualifiedDistinctEvents,
  lastObservedAtUTC:current.report.latestObservedAt,
  currentNwsStatus:current.report.hazardSnapshot.status,
  canPublishVisitWindow:false,canClaimSafeConditions:false}));
}
if(require.main===module)main().catch(e=>{console.error('GLOS_BACKFILL_FAILED '+String(e?.message||e));process.exitCode=1});
module.exports={windowsFor,backfill,argsOf};
