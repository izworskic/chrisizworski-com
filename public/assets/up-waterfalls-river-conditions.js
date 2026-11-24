/* Version 1: descriptive, station-specific USGS daily mean discharge, never waterfall flow or access. */
(function(root){
'use strict';
const stations=Object.freeze([
 {id:'USGS-04045500',name:'Tahquamenon River',place:'Near Paradise'},
 {id:'USGS-04031000',name:'Black River',place:'Near Bessemer'},
 {id:'USGS-04032150',name:'Presque Isle River',place:'Near Connorville'}
]);
const endpoint='https://api.waterdata.usgs.gov/ogcapi/v1/collections/daily/items';
const DAY=86400000;
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
  const row={day,ms,value,qualifier,approval:String(p.approval_status??'Not supplied')};
  if(byDate.has(day)){
   const old=byDate.get(day);
   if(old.value!==row.value||old.qualifier!==row.qualifier||old.approval!==row.approval)conflicts.add(day);
  }else byDate.set(day,row);
 }
 if(!byDate.size)return unavailable;
 const rows=[...byDate.values()].sort((a,b)=>b.ms-a.ms);
 const last=rows[0],age=(cutoff-last.ms)/DAY;
 if(conflicts.has(last.day))return {...unavailable,reason:'Conflicting latest station records; see USGS.'};
 if(age>3)return {schemaVersion:1,status:'STALE',day:last.day,age,reason:'Latest completed daily reading is more than three calendar days old.'};
 const prior=rows.find(r=>r.ms===last.ms-7*DAY);
 const clear=r=>!r.qualifier.trim()||/^(P|A|Provisional|Approved)$/i.test(r.qualifier.trim());
 const comparable=prior&&!conflicts.has(prior.day)&&prior.value>0&&clear(last)&&clear(prior);
 return {schemaVersion:1,status:'AVAILABLE',day:last.day,age,value:last.value,approval:last.approval,qualifier:last.qualifier,
  prior:comparable?{day:prior.day,value:prior.value,percent:Math.round(100*(last.value-prior.value)/prior.value)}:null};
}
function query(id,today){
 const start=new Date(dateMs(today)-14*DAY).toISOString().slice(0,10);
 const end=new Date(dateMs(today)-DAY).toISOString().slice(0,10);
 return endpoint+'?'+new URLSearchParams({monitoring_location_id:id,parameter_code:'00060',statistic_id:'00003',datetime:start+'/'+end,limit:'100',f:'json'});
}
if(typeof module!=='undefined'&&module.exports){module.exports={stations,classify,query,localDay};return;}
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
 }else{
  add(item,'p',reading.status==='STALE'?'Older reading only ('+reading.day+')':'Reading unavailable');
  add(item,'p',reading.reason);
 }
 const a=add(item,'a','Open USGS station');a.href='https://waterdata.usgs.gov/monitoring-location/'+station.id+'/';
 results.appendChild(item);
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
  readings.forEach((r,i)=>show(stations[i],r));
  const n=readings.filter(r=>r.status==='AVAILABLE').length;
  status.textContent=n+' of '+stations.length+' stations have a recent completed daily reading. These are river observations, not waterfall or trail conditions.';
 }catch{status.textContent='River readings unavailable. Use the official links below.';}
 finally{button.disabled=false;button.textContent='Refresh river readings';}
});
})(typeof window!=='undefined'?window:globalThis);
