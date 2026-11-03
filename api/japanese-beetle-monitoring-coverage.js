'use strict';
// Read-only, statewide aggregate of USA-NPN repeated adult status visits.
// No observer identities, station identifiers or site coordinates leave this API.
const S=require('../lib/japanese-beetle-controlled-monitoring.cjs');
const F=require('../lib/japanese-beetle-forecast.cjs');
async function evaluate(year,{fetcher=fetch,now=new Date()}={}){
 const today=F.asOfMI(now),current=Number(today.slice(0,4));
 if(!Number.isInteger(year)||year<2025||year>current)throw Error('INVALID_YEAR');
 const url=S.queryURL(year);
 const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'FreighterViewFarms-BeetleMonitoring/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('OFFICIAL_NPN_SOURCE_UNAVAILABLE');
 const body=await response.text();
 if(body.length>4000000)throw Error('OFFICIAL_NPN_SIZE_LIMIT');
 const data=JSON.parse(body);
 if(!Array.isArray(data))throw Error('OFFICIAL_NPN_SCHEMA_INVALID');
 const c=S.cohort(data,year),k=5,series=c.sites.filter(s=>s.status==='BOUNDED_DETECTION_INTERVAL');
 const status=c.totalSites===0?'NO_NPN_MICHIGAN_ADULT_RECORDS':series.length<k?'INSUFFICIENT_INDEPENDENT_SITE_COHORT':'REPEATED_VISITS_FOUND_NOT_SKILL_VALIDATED';
 const result={schema:'japanese-beetle-monitoring-coverage-v1',year,status,checkedAt:now.toISOString(),
  source:{name:'USA National Phenology Network / Nature\'s Notebook Status & Intensity',url:'https://data.usanpn.org/observations/',endpoint:'https://services.usanpn.org/npn_portal/observations/getObservations.json',
   speciesId:S.SPECIES_ID,adultPhaseIds:S.PHENOPHASE_IDS,filter:'Michigan; January 1–December 31; raw adult yes/no visits, uncertain omitted'},
  coverage:{state:'MI',sourceRows:c.sourceRows,monitoredSites:c.totalSites,candidateIntervals:c.intervalSites,
   privacySuppressed:c.intervalSites<k,
   // No detailed report from fewer than five sites to protect individual observers.
   intervalWidthDays:c.intervalSites>=k?{min:Math.min(...series.map(s=>s.intervalDays)),max:Math.max(...series.map(s=>s.intervalDays))}:null},
  empiricalSkill:'NOT_ESTABLISHED',fullSeasonCoverage:'NOT_VERIFIED',
  accuracyClaimsAllowed:false,
  explanation:status==='NO_NPN_MICHIGAN_ADULT_RECORDS'?'No Michigan Japanese beetle adult status observations were returned in this specific USA-NPN query. This does not imply that no one monitored beetles elsewhere, nor that beetles were absent.':
  'Raw USA-NPN visits can constrain an adult-detection interval when multiple explicit no reports precede the first yes. They do not prove true insect emergence, fixed search effort or a calibrated forecast score.',
  nextScientificGate:'At least 10 independent stable sites across 3 model-comparable seasons, repeated no/yes visits plus verified species identification, prospective archived model snapshots, and source/season bias assessment. Do not score an opportunistic or one-season series.'};
 return result;
}
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const year=req.query?.year===undefined?Number(F.asOfMI().slice(0,4)):Number(req.query?.year);
 if(!Number.isInteger(year)||year<2025||year>Number(F.asOfMI().slice(0,4))||Array.isArray(req.query?.year)){
  res.setHeader('Cache-Control','no-store');return res.status(400).json({status:'UNAVAILABLE',code:'YEAR_OUTSIDE_VERIFIABLE_HISTORY'});
 }
 try{
  const result=await evaluate(year);
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=300');
  return res.status(200).json(result);
 }catch(error){
  res.setHeader('Cache-Control','public, s-maxage=120');
  return res.status(503).json({schema:'japanese-beetle-monitoring-coverage-v1',status:'SOURCE_UNAVAILABLE',code:'OFFICIAL_COHORT_NOT_VERIFIED',
   explanation:'USA-NPN adult yes/no visit coverage could not be checked. No absence, site count or model accuracy can be inferred.',
   sourceUrl:'https://data.usanpn.org/observations/'});
 }
};
module.exports.evaluate=evaluate;
