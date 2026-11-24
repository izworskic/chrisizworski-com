/* Version 2: station-specific USGS daily mean and day-of-year historical bands, never waterfall flow or access. */
(function(root){
'use strict';
const stations=Object.freeze([
 {id:'USGS-04045500',name:'Tahquamenon River',place:'Near Paradise'},
 {id:'USGS-04031000',name:'Black River',place:'Near Bessemer'},
 {id:'USGS-04032150',name:'Presque Isle River',place:'Near Connorville'}
]);
const endpoint='https://api.waterdata.usgs.gov/ogcapi/v1/collections/daily/items';
const DAY=86400000;
const normalsEndpoint='https://api.waterdata.usgs.gov/statistics/v0/observationNormals';
const clearQualifier=r=>typeof r?.qualifier==='string'&&(!r.qualifier.trim()||/^(P|A|Provisional|Approved)$/i.test(r.qualifier.trim()));
function number(v){return (typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):NaN;}
function dateMs(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;
 const t=Date.parse(s+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s?t:NaN;
}
function localDay(now=new Date()){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=t=>p.find(x=>x.type===t).value;
 return get('year')+'-'+get('month')+'-'+get('day');
}
function classify(payload,id,today){
 const cutoff=dateMs(today);
 const unavailable={schemaVersion:1,status:'UNAVAILABLE',reason:'No valid completed daily discharge reading returned.'};
 if(!Number.isFinite(cutoff)||!Array.isArray(payload?.features))return unavailable;
 const byDate=new Map(),conflicts=new Set();
 for(const f of payload.features){
  const p=f?.properties;
  if(!p||p.monitoring_location_id!==id||p.parameter_code!=='00060'||p.statistic_id!=='00003'||p.unit_of_measure!=='ft^3/s')continue;
  const day=p.time,ms=dateMs(day);
  if(!Number.isFinite(ms)||ms>=cutoff||ms<cutoff-14*DAY)continue;
  if(p.value===null||p.value===undefined||!['number','string'].includes(typeof p.value)||String(p.value).trim()==='')continue;
  const value=Number(p.value);
  if(!Number.isFinite(value)||value<0)continue;
  const qualifier=Array.isArray(p.qualifier)?p.qualifier.join(', '):String(p.qualifier??'');
  // Ice, equipment and estimated values retain their agency flag; do not calculate changes from qualified observations.
  const row={day,ms,value,qualifier,approval:String(p.approval_status??'Not supplied'),series:typeof p.time_series_id==='string'?p.time_series_id:null};
  if(byDate.has(day)){
   const old=byDate.get(day);
   if(old.value!==row.value||old.qualifier!==row.qualifier||old.approval!==row.approval||old.series!==row.series)conflicts.add(day);
  }else byDate.set(day,row);
 }
 if(!byDate.size)return unavailable;
 const rows=[...byDate.values()].sort((a,b)=>b.ms-a.ms);
 const last=rows[0],age=(cutoff-last.ms)/DAY;
 if(conflicts.has(last.day))return {...unavailable,reason:'Conflicting latest station records; see USGS.'};
 if(age>3)return {schemaVersion:1,status:'STALE',day:last.day,age,reason:'Latest completed daily reading is more than three calendar days old.'};
 const prior=rows.find(r=>r.ms===last.ms-7*DAY);
 const comparable=prior&&!conflicts.has(prior.day)&&prior.value>0&&last.series===prior.series&&clearQualifier(last)&&clearQualifier(prior);
 return {schemaVersion:1,status:'AVAILABLE',day:last.day,age,value:last.value,approval:last.approval,qualifier:last.qualifier,series:last.series,
  prior:comparable?{day:prior.day,value:prior.value,percent:Math.round(100*(last.value-prior.value)/prior.value)}:null};
}
function query(id,today){
 const start=new Date(dateMs(today)-14*DAY).toISOString().slice(0,10);
 const end=new Date(dateMs(today)-DAY).toISOString().slice(0,10);
 return endpoint+'?'+new URLSearchParams({monitoring_location_id:id,parameter_code:'00060',statistic_id:'00003',datetime:start+'/'+end,limit:'100',f:'json'});
}
// Historical bands use the exact series and calendar date of the latest observation.
function seasonalQuery(id,reading){
 const md=reading.day.slice(5);
 return normalsEndpoint+'?'+new URLSearchParams({monitoring_location_id:id,parameter_code:'00060',parent_time_series_id:reading.series,computation_type:'percentile',normal_type:'DOY',start_date:md,end_date:md,page_size:'10'});
}
function eligible(reading){
 return reading?.status==='AVAILABLE'&&typeof reading.series==='string'&&reading.series.length>0&&Number.isFinite(dateMs(reading.day))&&Number.isFinite(reading.value)&&reading.value>=0&&clearQualifier(reading)&&/^(Approved|Provisional)$/.test(reading.approval);
}
function seasonal(payload,id,reading){
 const fail=reason=>({status:'UNAVAILABLE',reason});
 if(!eligible(reading))return fail('A comparable, unflagged daily reading is required.');
 if(!Array.isArray(payload?.features)||payload.next||payload.links?.some(l=>l.rel==='next'))return fail('Incomplete USGS historical statistics.');
 const md=reading.day.slice(5),matches=[];
 for(const feature of payload.features){
  const p=feature?.properties;
  if(p?.monitoring_location_id!==id||!Array.isArray(p.data))continue;
  for(const series of p.data){
   if(series.parameter_code!=='00060'||series.parent_statistic_id!=='00003'||series.parent_time_series_id!==reading.series||series.unit_of_measure!=='ft^3/s'||!Array.isArray(series.values))continue;
   for(const row of series.values){
    if(row.time_of_year===md&&row.time_of_year_type==='day_of_year'&&row.computation==='percentile')matches.push(row);
   }
  }
 }
 if(matches.length!==1)return fail('No unique historical record for this station, series and calendar day.');
 const row=matches[0],count=number(row.sample_count);
 if(!Number.isInteger(count)||count<20)return fail('Fewer than 20 comparable historical daily observations, or sample count unavailable.');
 if(!Array.isArray(row.percentiles)||!Array.isArray(row.values)||row.percentiles.length!==row.values.length)return fail('Invalid historical percentile response.');
 const bands=new Map();
 for(let i=0;i<row.percentiles.length;i++){
  const p=number(row.percentiles[i]),v=number(row.values[i]);
  if(!Number.isFinite(p)||p<0||p>100||!Number.isFinite(v)||v<0||bands.has(p))return fail('Missing or conflicting historical percentile values.');
  bands.set(p,v);
 }
 const ordered=[...bands].sort((a,b)=>a[0]-b[0]);
 if(ordered.some((x,i)=>i>0&&x[1]<ordered[i-1][1]))return fail('Historical percentile values are not monotonic.');
 const [p10,p25,p50,p75,p90]=[10,25,50,75,90].map(p=>bands.get(p));
 if([p10,p25,p50,p75,p90].some(v=>!Number.isFinite(v))||p10===p90)return fail('Historical percentile range is incomplete or indistinguishable.');
 const v=reading.value;
 const label=v<p10?'Unusually low for the date':v<p25?'Below the typical range':v>p90?'Unusually high for the date':v>p75?'Above the typical range':'Within the typical range';
 return {status:'AVAILABLE',label,p10,p25,p50,p75,p90,count,monthDay:md};
}
if(typeof module!=='undefined'&&module.exports){module.exports={stations,classify,query,localDay,seasonal,seasonalQuery,eligible};return;}
const doc=root.document,button=doc?.getElementById('river-conditions-load'),results=doc?.getElementById('river-conditions-results'),status=doc?.getElementById('river-conditions-status');
if(!button||!results||!status)return;
const fmt=new Intl.NumberFormat('en-US',{maximumFractionDigits:1});
function add(parent,tag,text){const e=doc.createElement(tag);e.textContent=text;parent.appendChild(e);return e;}
function show(station,reading){
 const item=doc.createElement('article');item.className='upfall-river-reading';
 add(item,'h4',station.name);add(item,'p',station.place);
 if(reading.status==='AVAILABLE'){
  const n=add(item,'p',fmt.format(reading.value)+' cfs');n.className='upfall-river-value';
  add(item,'p','Daily mean · '+reading.day+' · '+reading.approval);
  if(reading.qualifier)add(item,'p','USGS qualifier: '+reading.qualifier);
  if(reading.prior){const p=reading.prior.percent;add(item,'p',(p>0?'+':'')+fmt.format(p)+'% compared with '+reading.prior.day+' at this station.');}
  else add(item,'p','Seven-day comparison unavailable.');
  const season=reading.seasonal;
  if(season?.status==='AVAILABLE'){
   const section=doc.createElement('div');section.className='upfall-seasonal-band';item.appendChild(section);
   add(section,'h5',season.label);
   add(section,'p','Typical range: '+fmt.format(season.p25)+'–'+fmt.format(season.p75)+' cfs. Historical median: '+fmt.format(season.p50)+' cfs.');
   const track=doc.createElement('div');track.className='upfall-seasonal-track';track.setAttribute('aria-hidden','true');
   const range=season.p90-season.p10;
   const pos=v=>Math.max(0,Math.min(100,(v-season.p10)/range*100));
   const band=doc.createElement('span');band.className='upfall-seasonal-middle';band.style.left=pos(season.p25)+'%';band.style.width=(pos(season.p75)-pos(season.p25))+'%';track.appendChild(band);
   const marker=doc.createElement('span');marker.className='upfall-seasonal-marker';marker.style.left=pos(reading.value)+'%';track.appendChild(marker);section.appendChild(track);
   add(section,'p','Range shown: historical 10th–90th percentiles; shaded middle half; marker is the recent reading, clipped at the ends.');
   add(section,'p',season.count+' historical daily observations for '+season.monthDay+' in the USGS period of record. Not a forecast or a waterfall measurement.');
  }else add(item,'p','Seasonal comparison unavailable: '+(season?.reason||'No comparable historical record.'));
  const history=add(item,'a','USGS historical statistics');history.href='https://waterdata.usgs.gov/monitoring-location/'+station.id+'/statistics/';
 }else{
  add(item,'p',reading.status==='STALE'?'Older reading only ('+reading.day+')':'Reading unavailable');
  add(item,'p',reading.reason);
 }
 const a=add(item,'a','Open USGS station');a.href='https://waterdata.usgs.gov/monitoring-location/'+station.id+'/';
 results.appendChild(item);
}
async function readSeason(station,reading){
 if(!eligible(reading))return {status:'UNAVAILABLE',reason:'A comparable, unflagged daily reading is required.'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(seasonalQuery(station.id,reading),{signal:controller.signal,credentials:'omit'});
  if(!response.ok)throw Error('statistics unavailable');
  return seasonal(await response.json(),station.id,reading);
 }catch{return {status:'UNAVAILABLE',reason:'USGS historical statistics could not be retrieved.'};}
 finally{clearTimeout(timer);}
}
async function read(station,today){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(query(station.id,today),{signal:controller.signal,credentials:'omit'});
  if(!response.ok)throw Error('source unavailable');
  const payload=await response.json();
  if(payload.links?.some(l=>l.rel==='next'))return {status:'UNAVAILABLE',reason:'Incomplete station response; see USGS.'};
  return classify(payload,station.id,today);
 }catch{return {status:'UNAVAILABLE',reason:'Could not retrieve the station reading. Open USGS directly.'};}
 finally{clearTimeout(timer);}
}
button.addEventListener('click',async()=>{
 button.disabled=true;results.replaceChildren();status.textContent='Checking USGS daily readings…';
 try{
  const today=localDay(),readings=await Promise.all(stations.map(s=>read(s,today)));
  status.textContent='Comparing recent readings with historical seasonal ranges…';
  const enriched=await Promise.all(readings.map(async(r,i)=>({...r,seasonal:await readSeason(stations[i],r)})));
  enriched.forEach((r,i)=>show(stations[i],r));
  const n=readings.filter(r=>r.status==='AVAILABLE').length;
  status.textContent=n+' of '+stations.length+' stations have a recent completed daily reading. These are river observations, not waterfall or trail conditions.';
 }catch{status.textContent='River readings unavailable. Use the official links below.';}
 finally{button.disabled=false;button.textContent='Refresh river readings';}
});
})(typeof window!=='undefined'?window:globalThis);
