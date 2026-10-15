'use strict';
const fs=require('node:fs'),path=require('node:path');
const {mergeOffshoreModelIssues,verifyAgainstBuoy}=require('../../lib/rockhounding/buoy-model-verification.cjs');
function parseArgs(argv){
 const out={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i],v=argv[++i];
  if(!['--model','--buoy-text','--ledger','--report','--now'].includes(k)||!v||v.startsWith('--')||out[k])
   throw Error('Expected --model --buoy-text --ledger --report --now');
  out[k]=v;
 }
 for(const k of ['--model','--buoy-text','--ledger','--report','--now'])if(!out[k])throw Error('Missing '+k);
 if(!Number.isFinite(Date.parse(out['--now'])))throw Error('Invalid UTC research time');
 return out;
}
function compile(model,raw,previous,nowISO){
 const ledger=mergeOffshoreModelIssues(previous,model,{nowISO,retentionDays:21});
 const report=verifyAgainstBuoy(ledger,raw,{asOfISO:nowISO,toleranceMinutes:30,maxLeadHours:24});
 return {ledger,report};
}
function atomic(file,object){
 const dest=path.resolve(file);fs.mkdirSync(path.dirname(dest),{recursive:true});
 const tmp=dest+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(object,null,2)+'\n',{mode:0o600});
 fs.renameSync(tmp,dest);
}
function main(argv=process.argv.slice(2)){
 const a=parseArgs(argv);
 const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
 const model=read(a['--model']),raw=fs.readFileSync(a['--buoy-text'],'utf8');
 if(raw.length>1300000)throw Error('NDBC file exceeds expected bounds');
 const previous=fs.existsSync(a['--ledger'])?read(a['--ledger']):null;
 const {ledger,report}=compile(model,raw,previous,new Date(a['--now']).toISOString());
 atomic(a['--ledger'],ledger);atomic(a['--report'],report);
 console.log('ROCKHOUNDING_OFFSHORE_VERIFICATION '+JSON.stringify({
   station:report.stationId,cycles:ledger.counts.cycles,matchedPairs:report.matchedPairs,
   metrics:report.metrics,status:report.status,actualBuoy:true,beachCalibrated:false
 }));
}
if(require.main===module){try{main()}catch(e){console.error('ROCKHOUNDING_OFFSHORE_FAILED '+e.message);process.exitCode=1}}
module.exports={parseArgs,compile};
