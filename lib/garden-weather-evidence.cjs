'use strict';
// Shared garden weather bridge. No provider requests here.
module.exports=(function factory(){
'use strict';
const H=require('../public/assets/garden-tools/garden-harvest.js');
const M=require('../public/assets/garden-tools/garden-microclimate.js');
const schema='garden-weather-evidence-v1', HOUR=3600000, DAY=24*HOUR;
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const add=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
const fOK=n=>Number.isFinite(n)&&n>=-80&&n<=140;
const instant=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s)?Date.parse(s):NaN;
function clock(zone){
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  return t=>{const p=Object.fromEntries(fmt.formatToParts(t).map(x=>[x.type,x.value]));return {date:p.year+'-'+p.month+'-'+p.day,hour:+p.hour,minute:+p.minute,second:+p.second};};
}
function nwsEvidence({periods,issuedAt,now,zone,siteId,sourceUrl}={}){
 const r={schema,status:'UNAVAILABLE',provider:'National Weather Service',scope:'regional-grid-hourly-sampled-air-temperature',sourceUrl:null,siteId:null,issuedAt:null,asOf:null,zone:null,daily:[],harvestWeather:[],flags:[]};
 let local;try{local=clock(zone);}catch{r.flags.push('INVALID_TIMEZONE');return r;}
 const issue=instant(issuedAt),t=now instanceof Date?+now:instant(now);
 if(!['America/Detroit','America/Chicago','America/New_York','US/Eastern','US/Central'].includes(zone)||!Number.isFinite(t)||!Number.isFinite(issue)||typeof siteId!=='string'||!siteId||typeof sourceUrl!=='string'||!/^https:\/\/api\.weather\.gov\/gridpoints\/[A-Z]{3}\/\d+,\d+\/forecast\/hourly\/?$/i.test(sourceUrl)||!Array.isArray(periods)||periods.length>220){r.flags.push('INVALID_SOURCE');return r;}
 const today=local(t).date;
 Object.assign(r,{issuedAt,siteId,sourceUrl,asOf:today,zone});
 if(issue>t||t-issue>18*HOUR){r.status='STALE';r.flags.push('ISSUE_OUTSIDE_FRESHNESS_WINDOW');return r;}
 const slots=new Map(),conflicts=new Set();
 for(const p of periods){
  if(!p)continue;
  const a=instant(p.startTime),b=instant(p.endTime),n=p.temperature;
  if(!Number.isFinite(a)||b-a!==HOUR||!Number.isFinite(n)||!['F','C'].includes(p.temperatureUnit))continue;
  const x=local(a),v=p.temperatureUnit==='C'?n*9/5+32:n;
  if(x.minute!==0||x.second!==0||!fOK(v)||a<t||x.date<today||x.date>add(today,7))continue;
  if(slots.has(a)&&slots.get(a)!==v)conflicts.add(a);
  slots.set(a,v);
 }
 // Generate actual civil-day hour slots from UTC; covers 23/25-hour DST days without guessing.
 const midnight=Date.parse(today+'T00:00:00Z'),byDate=new Map();
 for(let a=midnight-12*HOUR;a<midnight+9*DAY;a+=HOUR){
  const d=local(a).date;if(d<today||d>add(today,7))continue;
  if(!byDate.has(d))byDate.set(d,[]);byDate.get(d).push(a);
 }
 for(const [date,expected] of byDate){
  const good=expected.filter(a=>slots.has(a)&&!conflicts.has(a));
  const vals=good.map(a=>slots.get(a));
  const complete=good.length===expected.length;
  r.daily.push({date,coverage:complete?'complete':'partial',hours:good.length,expectedHours:expected.length,minF:complete?Math.min(...vals):null,maxF:complete?Math.max(...vals):null,sampledRemainingLowF:vals.length?Math.min(...vals):null,conflictingHours:expected.filter(a=>conflicts.has(a)).length});
  // Existing engine requires same-local-date issue; do not mislabel yesterday's fresh forecast.
  if(complete&&local(issue).date===today)r.harvestWeather.push({date,kind:'forecast',siteId,source:sourceUrl,minF:Math.min(...vals),maxF:Math.max(...vals),issuedDate:today,issuedAt});
 }
 r.status=r.harvestWeather.length?'AVAILABLE':r.daily.some(d=>d.hours)?'PARTIAL':'UNAVAILABLE';
 if(local(issue).date!==today)r.flags.push('PRIOR_LOCAL_DAY_ISSUE_NOT_FOR_HARVEST');
 r.flags.push('HOURLY_SAMPLED_EXTREMA_NOT_STATION_OBSERVATIONS','PARTIAL_DAYS_NOT_USED_FOR_DAILY_HEAT');
 return r;
}
function parseDaymet(csv,{siteId,latitude,longitude}={}){
 if(typeof csv!=='string'||typeof siteId!=='string'||!siteId||!Number.isFinite(latitude)||!Number.isFinite(longitude))throw Error('Invalid Daymet input');
 const rows=csv.trim().split(/\r?\n/),geo=/^Latitude:\s*(-?\d+(?:\.\d+)?)\s+Longitude:\s*(-?\d+(?:\.\d+)?)/.exec(rows[0]);
 if(!geo||Math.abs(+geo[1]-latitude)>0.0001||Math.abs(+geo[2]-longitude)>0.0001)throw Error('Daymet location mismatch');
 const header=rows.findIndex(s=>s.trim()==='year,yday,tmax (deg c),tmin (deg c)');
 if(header<0||!rows.slice(0,header).some(s=>s.includes('Daymet Software Version 4.0')))throw Error('Daymet header mismatch');
 const days=new Map();
 for(const line of rows.slice(header+1)){
  const a=line.split(',').map(s=>s.trim());if(a.length!==4||a.some(s=>s===''||!Number.isFinite(Number(s))))throw Error('Invalid Daymet row');
  const [year,yday,hi,lo]=a.map(Number),minF=lo*9/5+32,maxF=hi*9/5+32;
  if(!Number.isInteger(year)||year<2021||year>2025||!Number.isInteger(yday)||yday<1||yday>365||!fOK(minF)||!fOK(maxF)||minF>maxF)throw Error('Invalid Daymet range');
  const date=add(year+'-01-01',yday-1);if(days.has(date))throw Error('Duplicate Daymet row');
  days.set(date,{date,minF,maxF});
 }
 for(let y=2021;y<=2025;y++)for(let i=0;i<365;i++)if(!days.has(add(y+'-01-01',i)))throw Error('Missing Daymet row');
 return {siteId,latitude,longitude,source:'https://doi.org/10.3334/ORNLDAAC/2129',scope:'historical-gridded-weather-not-observation',days};
}
function replay(archive,{modelId,biofix,monthDay,packetDays}={}){
 const model=Object.hasOwn(H.models,modelId)?H.models[modelId]:null;
 if(!model||biofix!==model.biofix||typeof monthDay!=='string'||!dateOK('2025-'+monthDay)||!archive?.days||archive.scope!=='historical-gridded-weather-not-observation')throw Error('Invalid replay input');
 const seasons=[];
 for(let year=2021;year<=2025;year++){
  const start=year+'-'+monthDay;let total=0,crossing=null,days=0;
  for(let d=start;d<=year+'-12-31';d=add(d,1)){
   const w=archive.days.get(d);if(!w)break;
   total+=H.dailyGdd(w.minF,w.maxF,model.baseF,model.capF);days++;
   if(total>=model.targetGddF){crossing=d;break;}
  }
  seasons.push({year,start,heatCrossingDate:crossing,elapsedDays:crossing?(Date.parse(crossing)-Date.parse(start))/DAY:null,packetDate:Number.isInteger(packetDays)&&packetDays>=1&&packetDays<=365?add(start,packetDays):null,daysEvaluated:days});
 }
 return {schema:'garden-harvest-history-v1',scope:'historical-heat-crossings-not-observed-harvests',siteId:archive.siteId,source:archive.source,modelId,seasons,allReached:seasons.every(x=>x.heatCrossingDate!==null)};
}
function referenceScenario(evidence,{date,siteId,regime,pairs=[],site={},thresholdF=32}={}){
 const day=evidence?.daily?.find(x=>x.date===date);
 if(!['AVAILABLE','PARTIAL'].includes(evidence?.status)||day?.coverage!=='complete')return {schema:M.schema,status:'UNAVAILABLE',scenario:null,flags:['NO_COMPLETE_FRESH_REFERENCE_DAY']};
 // A daily low is not automatically an overnight low. No weather-regime inference or
 // paired sensor claim from a grid forecast. Return reference-only evidence for now.
 return {schema:M.schema,status:'PARTIAL',scope:'reference-day-low-only-not-night-or-property',referenceId:evidence.siteId,siteId,referenceDate:date,referenceLowF:day.minF,scenario:null,flags:['NEED_MATCHED_NIGHT_WINDOW_AND_REGIME','NO_FROST_SAFETY_GUARANTEE']};
}
return {schema,nwsEvidence,parseDaymet,replay,referenceScenario};
})();
