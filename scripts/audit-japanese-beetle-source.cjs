'use strict';
// Optional operator audit. A scheduled GitHub Actions run checks that the
// official USA-NPN species-specific point service is usable. No live result is
// promoted to a pest presence or product treatment claim.
const fs=require('node:fs'),path=require('node:path');
const f=require('../lib/japanese-beetle-forecast.cjs');
const SITES=Object.freeze([
 {name:'Bay City',kind:'named-city',lat:43.5945,lon:-83.8889},
 {name:'Traverse City',kind:'named-city',lat:44.7631,lon:-85.6206},
 {name:'Marquette',kind:'named-city',lat:46.5436,lon:-87.3954}
]);
async function audit(now=new Date(),provider=f.fetchPilot){
 const date=f.asOfMI(now),year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
 const results=await Promise.allSettled(SITES.map(site=>provider(site,'roses',fetch,now)));
 const checks=results.map((r,i)=>{
  if(r.status==='rejected')return {name:SITES[i].name,scope:'OFFICIAL_RASTER',state:'ERROR',error:String(r.reason?.message||r.reason).slice(0,120)};
  const d=r.value;
  return {name:SITES[i].name,scope:'OFFICIAL_RASTER',state:d.status,sourceDate:d.sourceDate,
   modelAdultDoy:d.stages.adult.dayOfYear,modelEggDoy:d.stages.egg.dayOfYear,
   verdict:d.verdict.status,kind:d.sourceKind};
 });
 const successful=checks.filter(x=>x.state==='OFFICIAL_MODEL_AVAILABLE').length;
 const coldStart=results.every(x=>x.status==='rejected'&&String(x.reason?.message).includes('COVERAGE_STALE_SEASON'));
 // Early April sometimes precedes provider's annual production. Record
 // NOT_YET_PUBLISHED rather than counting that absence as low pest pressure.
 const earlySeason=!coldStart?false:month===4;
 const status=successful===checks.length?'HEALTHY':earlySeason?'MODEL_NOT_YET_PUBLISHED':'PROVIDER_DEGRADED';
 return {schema:'garden-beetle-source-health-v1',checkedAt:now.toISOString(),referenceDate:date,year,
  status,successful,attempted:checks.length,checks,source:f.SOURCE,
  note:'This audit checks technical source response, not pest population, biological forecast error, or garden-level detection.'};
}
if(require.main===module)(async()=>{
 const data=await audit();
 const dest=process.env.GITHUB_WORKSPACE?path.join(process.env.GITHUB_WORKSPACE,'artifacts','japanese-beetle-source-health'):path.resolve('artifacts/japanese-beetle-source-health');
 fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'source-health.json'),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({status:data.status,date:data.referenceDate,success:data.successful,attempted:data.attempted,locations:data.checks},null,2));
 if(data.status==='PROVIDER_DEGRADED')process.exitCode=1;
})().catch(e=>{console.error('SOURCE_AUDIT_FAILED',String(e.message||e));process.exitCode=1;});
module.exports={audit,SITES};
