'use strict';
// Local research CLI: append one authentic NOAA model-cycle file to a durable
// model ISSUE ledger. No per-visitor fetching, no public wave/safety verdict.
const fs=require('node:fs'),path=require('node:path');
const {mergeCycleLedger,verifyModelRevisions}=require('../../lib/rockhounding/glwu-cycle-ledger.cjs');
function argsOf(argv){
 const o={};
 for(let i=0;i<argv.length;i++){
  const name=argv[i];
  if(!['--input','--ledger','--report','--now'].includes(name)||!argv[i+1])
   throw Error('Expected --input, --ledger, --report and --now');
  if(o[name])throw Error('Duplicate CLI input');
  o[name]=argv[++i];
 }
 for(const k of ['--input','--ledger','--report','--now'])if(!o[k])throw Error('Missing '+k);
 if(!Number.isFinite(Date.parse(o['--now'])))throw Error('Invalid ISO timestamp');
 return o;
}
function createCycleReport(input,previous,nowISO){
 const ledger=mergeCycleLedger(previous,input,{nowISO,retentionDays:21});
 const comparisons=Object.fromEntries(['2p5km','500m-greatlakes'].map(grid=>[grid,
  verifyModelRevisions(ledger,{grid})]));
 const gridCells=Object.fromEntries(['2p5km','500m-greatlakes'].map(grid=>[grid,
  [...new Set(ledger.records.filter(x=>x.grid===grid).map(x=>x.cellId))]]));
 const status=(ledger.coverage['500m-greatlakes']?.cycles||0)>=3?
  'MULTIPLE_ISSUES_AVAILABLE_FOR_RESEARCH':'COLLECTING_MODEL_CYCLES';
 return {ledger,report:{schemaVersion:'glwu-research-cycle-summary-v1',
  generatedAt:nowISO,status,source:'NOAA_GLWU_MODEL_OUTPUT',modelCycleCounts:ledger.coverage,
  gridCells,comparisons,
  independentBuoyObservationsIncluded:false,siteSpecificWaveConditionsValidated:false,
  canPublishRockhoundingOpportunity:false,
  warning:'Forecast-versus-later-model-initial compares two model outputs, NOT NOAA buoy wave observations, and NOT stones exposed on the shore'}};
}
function atomicJSON(file,value){
 const dest=path.resolve(file);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 const temp=dest+'.tmp-'+process.pid;
 fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600});
 fs.renameSync(temp,dest);
}
function main(argv=process.argv.slice(2)){
 const args=argsOf(argv),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
 const input=read(args['--input']);
 const current=fs.existsSync(args['--ledger'])?read(args['--ledger']):null;
 const out=createCycleReport(input,current,new Date(args['--now']).toISOString());
 atomicJSON(args['--ledger'],out.ledger);
 atomicJSON(args['--report'],out.report);
 console.log('ROCKHOUNDING_WAVE_LEDGER '+JSON.stringify({status:out.report.status,
  cycles:out.ledger.coverage,comparisons:Object.fromEntries(Object.entries(out.report.comparisons).map(([grid,x])=>[grid,{matchedPairs:x.matchedPairs,status:x.status}])),
  siteForecast:false,beachSafety:false}));
}
if(require.main===module){try{main()}catch(e){console.error('ROCKHOUNDING_WAVE_LEDGER_FAILED '+e.message);process.exitCode=1}}
module.exports={argsOf,createCycleReport};
