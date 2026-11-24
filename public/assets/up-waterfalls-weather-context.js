/* Regional weather evidence, separate from river measurements and waterfall access. */
(function(root){
'use strict';
const HOUR=3600000;
const sites=Object.freeze([{id:'KERY',name:'Newberry, Luce County Airport',region:'Eastern U.P. weather context'},{id:'KIWD',name:'Ironwood, Gogebic-Iron County Airport',region:'Western U.P. weather context'}]);
function validQuantity(q,units){
 return !!q&&typeof q.value==='number'&&Number.isFinite(q.value)&&units.includes(q.unitCode)&&(!q.qualityControl||['V','S','C'].includes(q.qualityControl));
}
function weatherContext(payload,id,now){
 const fail=reason=>({status:'UNAVAILABLE',reason});
 if(!Number.isFinite(now)||!Array.isArray(payload?.features)||payload.pagination?.next||payload.links?.some(l=>l.rel==='next'))return fail('Incomplete or unavailable NWS observations.');
 const rows=new Map(),conflicts=new Set();
 for(const f of payload.features){
  const p=f?.properties;
  if(p?.station!=='https://api.weather.gov/stations/'+id||typeof p.timestamp!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(p.timestamp))continue;
  const t=Date.parse(p.timestamp);
  if(!Number.isFinite(t)||t>now||t<now-24*HOUR)continue;
  const temp=validQuantity(p.temperature,['wmoUnit:degC'])&&p.temperature.value>=-100&&p.temperature.value<=70?p.temperature.value:null;
  const q=p.precipitationLast24Hours;
  const precip=validQuantity(q,['wmoUnit:mm','wmoUnit:m'])&&q.value>=0?q.value*(q.unitCode==='wmoUnit:m'?1000:1):null;
  const row={t,temp,precip};
  if(rows.has(t)){const old=rows.get(t);if(old.temp!==temp||old.precip!==precip)conflicts.add(t);}
  else rows.set(t,row);
 }
 const observations=[...rows.values()].filter(r=>!conflicts.has(r.t)).sort((a,b)=>a.t-b.t);
 const last=observations.at(-1);
 if(!last||now-last.t>3*HOUR)return fail('No station observation within the past three hours.');
 const temperatures=observations.filter(r=>r.temp!==null);
 const recent=temperatures.at(-1);
 const covered=temperatures.length>=6&&now-temperatures[0].t>=20*HOUR&&now-recent.t<=3*HOUR&&temperatures.every((r,i)=>i===0||r.t-temperatures[i-1].t<=4*HOUR);
 const min=covered?Math.min(...temperatures.map(r=>r.temp)):null,max=covered?Math.max(...temperatures.map(r=>r.temp)):null;
 const precip=observations.filter(r=>r.precip!==null&&now-r.t<=3*HOUR).at(-1);
 let cue=null;
 if(covered)cue=max<=0?'Sampled air temperatures stayed at or below freezing.':min>0?'Sampled air temperatures stayed above freezing; existing snow could melt.':'Sampled air temperatures straddled freezing; melting and refreezing are possible where snow or ice exists.';
 return {status:covered&&precip?'AVAILABLE':'PARTIAL',latest:new Date(last.t).toISOString(),temp:recent&&now-recent.t<=3*HOUR?{c:recent.temp,at:new Date(recent.t).toISOString()}:null,
 range:covered?{min,max,samples:temperatures.length,from:new Date(temperatures[0].t).toISOString(),to:new Date(recent.t).toISOString()}:null,
 precipitation:precip?{mm:precip.precip,at:new Date(precip.t).toISOString()}:null,cue};
}
function query(id,now){
 return 'https://api.weather.gov/stations/'+encodeURIComponent(id)+'/observations?'+new URLSearchParams({start:new Date(now-24*HOUR).toISOString(),end:new Date(now).toISOString(),limit:'500'});
}
if(typeof module!=='undefined'&&module.exports){module.exports={sites,weatherContext,query};return;}
const d=root.document,b=d?.getElementById('waterfall-weather-load'),result=d?.getElementById('waterfall-weather-results'),status=d?.getElementById('waterfall-weather-status');
if(!b||!result||!status)return;
const f=c=>Math.round(c*9/5+32)+'°F';
const time=t=>new Date(t).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
function add(parent,tag,text){const e=d.createElement(tag);e.textContent=text;parent.appendChild(e);return e;}
async function fetchSite(site,now){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),8000);
 try{const r=await fetch(query(site.id,now),{signal:c.signal,credentials:'omit',headers:{Accept:'application/geo+json'}});if(!r.ok)throw Error('NWS unavailable');return weatherContext(await r.json(),site.id,now);}
 catch{return {status:'UNAVAILABLE',reason:'Weather station data could not be retrieved.'};}finally{clearTimeout(timer);}
}
function render(site,r){
 const card=d.createElement('article');card.className='upfall-river-reading';result.appendChild(card);
 add(card,'h4',site.name);add(card,'p',site.region+' · point observations, not basin averages.');
 if(r.status==='UNAVAILABLE')add(card,'p',r.reason);
 else{
  add(card,'p',r.temp?'Recent air temperature: '+f(r.temp.c)+' · '+time(r.temp.at):'Recent air temperature unavailable.');
  add(card,'p',r.range?'Sampled 24-hour temperatures: '+f(r.range.min)+' to '+f(r.range.max)+' ('+r.range.samples+' readings).':'Not enough temperature observations for a 24-hour range.');
  if(r.range)add(card,'p','Samples from '+time(r.range.from)+' to '+time(r.range.to)+'.');
  add(card,'p',r.precipitation?'Reported 24-hour precipitation: '+(r.precipitation.mm>0&&r.precipitation.mm/25.4<0.01?'<0.01':(r.precipitation.mm/25.4).toFixed(2))+' in · period ending '+time(r.precipitation.at)+'.':'24-hour precipitation not reported recently.');
  if(r.cue)add(card,'p',r.cue+' This does not measure snowmelt, ice thickness or river response.');
 }
 const a=add(card,'a','Official NWS station history');a.href='https://forecast.weather.gov/data/obhistory/'+site.id+'.html';
}
b.addEventListener('click',async()=>{
 b.disabled=true;result.replaceChildren();status.textContent='Checking regional weather observations…';
 try{const now=Date.now(),readings=await Promise.all(sites.map(s=>fetchSite(s,now)));readings.forEach((r,i)=>render(sites[i],r));status.textContent='Regional weather observations only. Check the snow analysis and river readings separately.';}
 catch{status.textContent='Weather observations unavailable. Use the official links below.';}
 finally{b.disabled=false;b.textContent='Refresh regional weather';}
});
})(typeof window!=='undefined'?window:globalThis);
