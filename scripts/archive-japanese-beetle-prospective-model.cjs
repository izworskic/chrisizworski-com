'use strict';
// Trusted GitHub Actions capture of *prospective* near-term USA-NPN adult model
// point values. GitHub issue comment timestamp establishes capture chronology.
// Never creates a pest presence or true-emergence report.
const fs=require('node:fs'),path=require('node:path');
const F=require('../lib/japanese-beetle-forecast.cjs');
const {LOCATIONS}=require('../lib/maple-sap-engine.cjs');
const IDS=Object.freeze(['detroit','kalamazoo','grand-rapids','lansing','flint','bay-city','west-branch','traverse-city','escanaba','marquette']);
const ISSUE=1451,DAY=86400000;
const dateGap=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/DAY);
async function audit({now=new Date(),provider=F.fetchPilot,sleep=async()=>{}}={}){
 const day=F.asOfMI(now),year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
 const frame={schema:'japanese-beetle-prospective-model-archive-v1',checkedAt:now.toISOString(),localDay:day,season:year,
  source:'https://www.usanpn.org/data/maps/forecasts/Japanese_beetle',issue:ISSUE,
  siteCount:IDS.length,records:[],unavailable:[],eligibleNearTerm:0,status:'OUTSIDE_DESIGNATED_MONITORING_SEASON',
  restrictions:'Modeled thermal adult threshold, NOT beetle presence, field onset, issued-at timestamp or accuracy score.'};
 if(year<2027||year>2029||month<5||month>9)return frame;
 for(const id of IDS){
  const loc=LOCATIONS.find(x=>x.id===id);if(!loc)throw Error('UNKNOWN_REFERENCE_SITE_'+id);
  try{
   const data=await provider(loc,'roses',fetch,now);
   if(data?.schema!=='japanese-beetle-forecast-truth-v1'||data.status!=='OFFICIAL_MODEL_AVAILABLE'||
      data.sourceKind!=='OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL'||data.year!==year||
      !data.stages?.adult?.approximateDate||!data.sourceDate||!data.source?.layerIds?.adult)throw Error('INVALID_SPECIES_MODEL');
   const modelDate=data.stages.adult.approximateDate,sourceDate=data.sourceDate;
   const daysFromSource=dateGap(modelDate,sourceDate),daysFromToday=dateGap(modelDate,day);
   // Ensure *today's check* happens before the modeled window and its
   // source layer actually contained the six-day forecast, not later hindcast.
   if(daysFromSource>=0&&daysFromSource<=6&&daysFromToday>=0&&daysFromToday<=6&&
      data.source?.timeDimensionAgeDays>=0&&data.source.timeDimensionAgeDays<=2){
    frame.records.push({name:loc.name,id,adultModelDate:modelDate,sourceRasterDate:sourceDate,
      observedBeetles:'NOT_CHECKED',verifiedLayer:data.source.layerIds.adult,
      rasterUrl:data.source.adultFeatureUrl,sourceCoverageUrl:data.source.coverageUrl,
      sourceAgeDays:data.source.timeDimensionAgeDays});
   }
  }catch(e){frame.unavailable.push({id,code:String(e.message||e).slice(0,90)})}
  await sleep(200);
 }
 frame.eligibleNearTerm=frame.records.length;
 frame.status=frame.unavailable.length?'SOURCE_PARTIAL_NO_ARCHIVE':
  frame.records.length?'COMPLETE_NEAR_TERM_SNAPSHOTS':'COMPLETE_NO_NEAR_TERM_SNAPSHOTS';
 // Partial results are kept as health evidence but never promoted to a
 // timestamped complete cross-site record.
 return frame;
}
function markdown(frame){
 if(frame.status!=='COMPLETE_NEAR_TERM_SNAPSHOTS'||!frame.records.length)throw Error('NO_ELIGIBLE_SNAPSHOT');
 const out=['### Official Japanese beetle *prospective* adult model capture — '+frame.localDay,
  '', '**Captured by GitHub Actions:** '+frame.checkedAt,
  '', '**Evidence:** USA-NPN exact-dated adult species raster at 10 fixed Michigan named-city reference coordinates, not any private property.',
  '', '| Michigan reference | Model adult threshold date | Official raster source date | Age (days) |',
  '| --- | --- | --- | --- |'];
 for(const x of frame.records)out.push('| '+x.name+' | '+x.adultModelDate+' | '+x.sourceRasterDate+' | '+x.sourceAgeDays+' |');
 out.push('','Provider: '+frame.source,'','Metadata is documented in workflow artifact for this run.',
  '**Guardrail:** Source layer coverage date is not a verified model issuance timestamp. This GH comment was created after retrieving the source and cannot be altered to imply a prior measurement. Predicted adult heat threshold is not an adult detection, true emergence, pesticide trigger or accuracy statistic.');
 return out.join('\n')+'\n';
}
if(require.main===module)audit({sleep:ms=>new Promise(r=>setTimeout(r,ms))}).then(result=>{
 const dir=path.join(process.cwd(),'artifacts','japanese-beetle-prospective');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'source-health.json'),JSON.stringify(result,null,2)+'\n');
 if(result.status==='COMPLETE_NEAR_TERM_SNAPSHOTS')fs.writeFileSync(path.join(dir,'issue-comment.md'),markdown(result));
 console.log('MODEL_ARCHIVE_HEALTH '+JSON.stringify({status:result.status,date:result.localDay,eligibleNearTerm:result.eligibleNearTerm,sourceFailures:result.unavailable.length,issue:ISSUE}));
 if(result.status==='SOURCE_PARTIAL_NO_ARCHIVE')process.exitCode=1;
}).catch(e=>{console.error('MODEL_ARCHIVE_ERROR',String(e.message||e));process.exitCode=1});
module.exports={audit,markdown,IDS,ISSUE};
