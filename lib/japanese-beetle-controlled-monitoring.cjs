'use strict';
// Japanese beetle adult *detection* cohort, not a proof of biological emergence.
// Repeated yes/no visits make a bounded detection interval, not an exact first emergence.
const SPECIES_ID=2392;
const PHENOPHASE_IDS=Object.freeze([327,552]); // official USA-NPN adult phenophase variants
const PROTOCOL='japanese-beetle-controlled-adult-detection-v1';
const MAX_SOURCE_ROWS=5000,MAX_GAP_DAYS=7,MAX_BASELINE_DAYS=14;
const SOURCE='https://services.usanpn.org/npn_portal/observations/getObservations.json';
const DAY=86400000;
function validDay(s){return typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
function diff(a,b){return Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/DAY);}
function validPoint(lat,lon){return typeof lat==='number'&&typeof lon==='number'&&lat>=41.4&&lat<=48.7&&lon>=-90.7&&lon<=-81.9;}
function queryURL(year,{state='MI'}={}){
 if(!Number.isInteger(year)||year<2025||year>2100||state!=='MI')throw Error('INVALID_MONITORING_QUERY');
 const u=new URL(SOURCE);
 for(const [k,v] of Object.entries({start_date:year+'-01-01',end_date:year+'-12-31',
 'species_id[1]':SPECIES_ID,'state[1]':state,request_src:'FreighterViewFarms',climate_data:0}))u.searchParams.set(k,String(v));
 return u.href;
}
function normalizeNpn(rows,year){
 if(!Array.isArray(rows)||rows.length>MAX_SOURCE_ROWS)throw Error('NPN_UNBOUNDED_OR_INVALID');
 const result=[],invalid={wrongTaxon:0,wrongRegion:0,wrongPhenophase:0,invalidRecord:0,uncertain:0};
 for(const r of rows){
  if(r?.species_id!==SPECIES_ID){invalid.wrongTaxon++;continue;}
  if(r.state!=='MI'){invalid.wrongRegion++;continue;}
  if(!PHENOPHASE_IDS.includes(r.phenophase_id)||String(r.phenophase_description||'').trim()!=='Adults'){invalid.wrongPhenophase++;continue;}
  const date=r.observation_date,site=Number(r.site_id),status=Number(r.phenophase_status);
  if(!validDay(date)||Number(date.slice(0,4))!==year||!Number.isSafeInteger(site)||site<1||
     !validPoint(r.latitude,r.longitude)||![0,1,-1].includes(status)){invalid.invalidRecord++;continue;}
  if(status===-1){invalid.uncertain++;continue;}
  result.push({site,date,status,lat:r.latitude,lon:r.longitude,sourceId:Number.isSafeInteger(Number(r.observation_id))?Number(r.observation_id):null});
 }
 return {records:result,filtered:invalid,sourceRows:rows.length};
}
function groupSites(records){
 const sites=new Map();
 for(const r of records){
  let site=sites.get(r.site);
  if(!site){site={site:r.site,lat:r.lat,lon:r.lon,visits:new Map(),invalidCoordinate:false};sites.set(r.site,site)}
  // NPN station coordinates should be stable; reject location shifts or mixed sites.
  if(Math.abs(r.lat-site.lat)>.005||Math.abs(r.lon-site.lon)>.005)site.invalidCoordinate=true;
  if(!site.visits.has(r.date))site.visits.set(r.date,new Set());
  site.visits.get(r.date).add(r.status);
 }
 return [...sites.values()].sort((a,b)=>a.site-b.site);
}
function deriveInterval(visits){
 if(!Array.isArray(visits)||visits.length===0)return {status:'NO_MONITORING_VISITS',lastNegative:null,firstPositive:null,intervalDays:null,observationEffort:false};
 const seen=new Map();
 for(const x of visits){
  if(!validDay(x.date)||![0,1,-1].includes(x.status))throw Error('INVALID_VISIT');
  if(!seen.has(x.date))seen.set(x.date,new Set());
  seen.get(x.date).add(x.status);
 }
 const conflicts=[...seen.entries()].filter(([,status])=>status.has(0)&&status.has(1));
 if(conflicts.length)return {status:'CONFLICTING_SAME_DAY_REPORTS',lastNegative:null,firstPositive:null,intervalDays:null,observationEffort:false};
 const valid=[...seen.entries()].filter(([,s])=>s.size===1&&!s.has(-1)).map(([date,s])=>({date,status:[...s][0]})).sort((a,b)=>a.date.localeCompare(b.date));
 const first=valid.find(x=>x.status===1);
 if(!first)return {status:'NO_POSITIVE_RECORDED',lastNegative:valid.filter(x=>x.status===0).at(-1)?.date||null,firstPositive:null,intervalDays:null,observationEffort:false};
 const before=valid.filter(x=>x.status===0&&x.date<first.date);
 const last=before.at(-1);
 if(!last)return {status:'LEFT_CENSORED',lastNegative:null,firstPositive:first.date,intervalDays:null,observationEffort:false};
 const gap=diff(first.date,last.date);
 const earlier=before.filter(x=>x.date!==last.date&&diff(last.date,x.date)<=MAX_BASELINE_DAYS);
 const sufficient=gap<=MAX_GAP_DAYS&&earlier.length>=1;
 return {status:sufficient?'BOUNDED_DETECTION_INTERVAL':gap>MAX_GAP_DAYS?'GAP_TOO_LARGE':'BASELINE_TOO_SHORT',
  lastNegative:last.date,firstPositive:first.date,intervalDays:gap,baselineNegatives:before.length,baselineWithin14Days:earlier.length,
  // NPN reports yes/no at site, but source does not certify fixed 5-min timed effort.
  observationEffort:false,certainty:'First observed adults within (last no, first yes]; not direct proof of first biological emergence'};
}
function cohort(rows,year){
 const n=normalizeNpn(rows,year);
 const sites=groupSites(n.records).map(site=>{
  const visits=[...site.visits].map(([date,statuses])=>[...statuses].map(status=>({date,status}))).flat();
  const d=site.invalidCoordinate?{status:'SITE_GEOGRAPHY_UNSTABLE',lastNegative:null,firstPositive:null,intervalDays:null,observationEffort:false}:deriveInterval(visits);
  return {siteKey:'npn-'+site.site,year,region:'MI',coordinatesForInternalMatching:{lat:site.lat,lon:site.lon},
   visits:site.visits.size,adultYes:visits.filter(x=>x.status===1).length,adultNo:visits.filter(x=>x.status===0).length,
   ...d};
 });
 return {schema:PROTOCOL,year,sourceRows:n.sourceRows,filtered:n.filtered,
  totalSites:sites.length,intervalSites:sites.filter(x=>x.status==='BOUNDED_DETECTION_INTERVAL').length,
  noData:sites.length===0,sites,
  limitation:'An interval is a repeat-visit adult detection interval, not true emergence, abundance, model skill, pesticide threshold or standardized observation effort.'};
}
function validateLocalVisit(row,{today,season=2027}){
 const error=[];
 if(!validDay(row.date)||Number(row.date.slice(0,4))!==season||row.date>today)error.push('DATE_OUTSIDE_SEASON_OR_FUTURE');
 if(!['no','yes','uncertain'].includes(row.adults))error.push('INVALID_ADULT_STATUS');
 if(!['visual-host-check','leaf-inspection','fixed-transect'].includes(row.method))error.push('METHOD_NOT_COMPARABLE');
 if(!Number.isInteger(row.minutes)||row.minutes<5||row.minutes>90)error.push('INVALID_EFFORT');
 if(!['beans','roses','grapes','berries'].includes(row.crop))error.push('HOST_NOT_IN_PILOT');
 if(row.adults==='yes'&&row.count!==null&&(!Number.isInteger(row.count)||row.count<1||row.count>10000))error.push('ADULT_COUNT_INVALID');
 if(row.adults==='no'&&row.count!==0)error.push('ZERO_COUNT_REQUIRED_FOR_NO');
 if(typeof row.site!=='string'||!/^[a-z0-9][a-z0-9-_]{1,29}$/.test(row.site))error.push('SITE_ID_INVALID');
 return error;
}
function localCohort(logs,{today,season=2027}){
 if(!Array.isArray(logs)||logs.length>400)throw Error('JOURNAL_TOO_LARGE');
 const valid=[],errors=[];
 for(const [i,raw] of logs.entries()){
  const row={...raw},issues=validateLocalVisit(row,{today,season});
  if(issues.length){errors.push({index:i,code:issues[0]});continue}
  valid.push({...row,status:row.adults==='yes'?1:row.adults==='no'?0:-1});
 }
 const groups=new Map();
 for(const x of valid){
  const key=x.site+'|'+x.method+'|'+x.crop+'|'+x.minutes;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({date:x.date,status:x.status});
 }
 const sites=[...groups.entries()].map(([key,visits])=>({station:key,visits:visits.length,...deriveInterval(visits)}));
 const eligible=sites.filter(s=>s.status==='BOUNDED_DETECTION_INTERVAL');
 return {schema:PROTOCOL,year:season,localVisits:valid.length,invalidRows:errors,
  intervals:eligible.length,results:sites,ranking:'SELF_REPORTED_UNREVIEWED_NOT_SCIENTIFIC_VALIDATION',
  interpretation:'An interval requires 2 negative visits (including an earlier baseline within 14 days), then a positive within 7 days, at the same method, crop and effort. The journal is not an independent truth dataset; export to external qualified monitoring programs for review.'};
}
function compareModel(interval,model){
 if(interval?.status!=='BOUNDED_DETECTION_INTERVAL'||!validDay(model?.date))return {status:'NOT_COMPARABLE'};
 if(model.date.slice(0,4)!==interval.firstPositive.slice(0,4))return {status:'YEAR_MISMATCH'};
 // To evaluate *prospective* forecast skill we must have a dated archived snapshot
 // recorded before outcome, within the official 6-day near-term source horizon.
 if(!validDay(model.sourceDate)||!validDay(model.capturedOn)||model.sourceDate>model.capturedOn||
    model.capturedOn>=interval.firstPositive||model.date<model.sourceDate||diff(model.date,model.sourceDate)>6)
  return {status:'RETROSPECTIVE_OR_UNVERIFIED_SNAPSHOT',isSkillEvidence:false};
 const p=model.date;
 return {status:p>interval.lastNegative&&p<=interval.firstPositive?'WITHIN_DETECTION_INTERVAL':p<=interval.lastNegative?'BEFORE_LAST_NEGATIVE':'AFTER_FIRST_POSITIVE',
  isSkillEvidence:false, // requires independent design review, cohort size and site representativeness
  caveat:'A prospective recorded prediction can be compared with the adult-detection interval, but cannot alone quantify model accuracy or prove local biological emergence.'};
}
module.exports={SPECIES_ID,PHENOPHASE_IDS,PROTOCOL,SOURCE,validDay,diff,validPoint,queryURL,
 normalizeNpn,groupSites,deriveInterval,cohort,validateLocalVisit,localCohort,compareModel};
