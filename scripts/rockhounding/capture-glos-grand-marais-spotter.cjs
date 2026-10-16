#!/usr/bin/env node
'use strict';
// One bounded GLOS Seagull research fetch on a CI runner. Never a per-visitor
// fetch, current Agate breaking surf, or permission/safety recommendation.
const fs=require('node:fs');
const path=require('node:path');
const {requestUrl,parseSpotterCSV,observedSpotterStudy}=
 require('../../lib/rockhounding/glos-spotter.cjs');
const {compareSpotterToHistoricShore}=require('../../lib/rockhounding/glos-spotter-facing.cjs');
const HOUR=3600000;
function utcSeconds(ms){return new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');}
async function main(){
 const i=process.argv.indexOf('--out');
 if(i<0||!process.argv[i+1])throw Error('An explicit research JSON output path is required');
 const now=new Date();
 const nowISO=now.toISOString(),endISO=utcSeconds(now.getTime());
 const startISO=utcSeconds(now.getTime()-96*HOUR);
 const sourceUrl=requestUrl({startISO,endISO});
 const response=await fetch(sourceUrl,{headers:{Accept:'text/csv','User-Agent':'RockhoundingWaveResearch/1.0'},
   signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('GLOS Seagull observed offshore source HTTP '+response.status);
 const csv=await response.text();
 const parsed=parseSpotterCSV(csv);
 const report=observedSpotterStudy(parsed,{nowISO});
 const directionStudy=parsed.rows.length
   ? compareSpotterToHistoricShore({observation:parsed.rows.at(-1),sourceFreshness:report.status})
   : null;
 const evidence={...report,collectedAtUTC:nowISO,
   historicAgateDirectionComparisonResearchOnly:directionStudy,
   sourceDataEndpoint:'https://seagull-erddap.glos.org/erddap/tabledap/obs_140.csv',
   sourceQueryFromUTC:startISO,sourceQueryToUTC:endISO,
   sourceRowCount:parsed.rows.length,
   firstObservedAt:parsed.rows[0]?.time??null,
   lastObservedAt:parsed.rows.at(-1)?.time??null,
   observedRecentRows:parsed.rows.slice(-36),
   statement:'GLOS SPOT-1361 observed open-lake wave height/direction/period. These readings are not breaking waves or new rock exposure at either beach.',
   canPublishRockhoundingOpportunity:false,
   canClaimNewlyExposedStones:false,
   canClaimBeachSafety:false};
 const file=path.resolve(process.argv[i+1]);fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(evidence,null,2)+'\n');
 process.stdout.write('GLOS_GRAND_MARAIS_SPOTTER '+JSON.stringify({
   status:evidence.status,recordCount:evidence.recordCount,sourceRowCount:evidence.sourceRowCount,
   firstObservedAt:evidence.firstObservedAt,lastObservedAt:evidence.lastObservedAt,
   peakObservedWaveM:evidence.peakObservedWaveM,latestWaveM:evidence.latestWaveM,
   latestWaveFromDeg:evidence.latestWaveFromDeg,
   historicResearchRelativeAngleDeg:directionStudy?.relativeWaveFromAngleDeg??null,
   measuredOffshoreOnly:true,siteSafety:false,rockExposure:false})+'\n');
}
main().catch(e=>{process.stderr.write('GLOS_SPOTTER_UNAVAILABLE '+(e?.message||e)+'\n');process.exitCode=1;});
