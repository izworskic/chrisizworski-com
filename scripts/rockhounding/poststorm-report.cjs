'use strict';
// Research CLI. Reads NOAA GLWU-decoded point JSON and an optional previous archive.
// No user-facing route; never publish a beach-specific decision from this script.
const fs=require('node:fs'),path=require('node:path');
const {mergeArchive,forSite}=require('../../lib/rockhounding/glwu-archive.cjs');
const {assessPostStorm}=require('../../lib/rockhounding/poststorm-engine.cjs');
const {loadGrandMaraisHazards}=require('../../lib/rockhounding/nws-shore-hazards.cjs');
function parseArgs(argv){
 const o={};for(let i=0;i<argv.length;i++){
  const key=argv[i];if(!key.startsWith('--'))throw Error('Unexpected argument');
  if(key==='--check-nws'){o.checkNws=true;continue;}
  const val=argv[++i];if(!val||val.startsWith('--'))throw Error('Missing value for '+key);
  o[key.slice(2)]=val;
 }
 for(const k of ['input','archive','output','now'])if(!o[k])throw Error('--'+k+' required');
 return o;
}
function reportFromSamples({input,archive={},pilotConfig,nowISO,hazards={status:'UNKNOWN'}}){
 const merged=mergeArchive(archive,input,{nowISO});
 if(!Array.isArray(pilotConfig?.pilotSites)||pilotConfig.pilotSites.length!==2)
  throw Error('Two pilot site configurations required');
 const reports=pilotConfig.pilotSites.map(site=>{
  const timeSeries=forSite(merged,{siteId:site.id,cellId:site.modelCell?.id||'',nowISO});
  const peer=pilotConfig.pilotSites.find(s=>s.id!==site.id);
  return assessPostStorm({site,history:timeSeries.history,baseline:timeSeries.baseline,forecast:timeSeries.forecast,
   nowISO,hazards,peerCellId:peer?.modelCell?.id||null});
 });
 return {archive:merged,report:{schemaVersion:'rockhounding-poststorm-research-v1',
  nowISO,source:'NOAA_GLWU',researchOnly:true,canPublishSafeRockhoundingWindow:false,
  hazards:{status:hazards.status,source:'NWS_API_OR_UNKNOWN'},
  sourceSamplesRetained:merged.records.length,sites:reports,
  footnote:'Model-based relative change is not evidence of newly exposed rocks or safe shoreline access'}};
}
async function main(argv=process.argv.slice(2)){
 const opt=parseArgs(argv),nowISO=new Date(opt.now).toISOString();
 const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
 const input=json(opt.input),archive=fs.existsSync(opt.archive)?json(opt.archive):{};
 const pilotConfig=json(path.join(__dirname,'../../data/rockhounding/grand-marais-wave-pilot.json'));
 const hazards=opt.checkNws?await loadGrandMaraisHazards({nowISO}):{status:'UNKNOWN'};
 const result=reportFromSamples({input,archive,pilotConfig,nowISO,hazards});
 for(const [filename,content] of [[opt.archive,result.archive],[opt.output,result.report]]){
  const target=path.resolve(filename);fs.mkdirSync(path.dirname(target),{recursive:true});
  const temp=target+'.tmp-'+process.pid;
  fs.writeFileSync(temp,JSON.stringify(content,null,2)+'\n',{encoding:'utf8',mode:0o600});
  fs.renameSync(temp,target);
 }
 console.log(JSON.stringify({research:true,sites:result.report.sites.map(x=>({id:x.siteId,status:x.status})),
  retained:result.archive.records.length,output:opt.output}));
}
if(require.main===module)main().catch(e=>{console.error('ROCKHOUNDING_RESEARCH_FAILED:',e.message);process.exitCode=1;});
module.exports={parseArgs,reportFromSamples};
