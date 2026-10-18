'use strict';
(function(){
 const $=id=>document.getElementById(id);
 const state={locations:[],site:'bay-city',data:null,day:0,busy:false,request:0};
 const fmt=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
 const weekday=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'});
 const seasonNow=()=>state.data?.season||'OFF_SEASON';
 function judge(day,ground){
  if(seasonNow()!=='SEARCH_SEASON')return {status:'seasonal',score:null,label:'Plan for late winter / spring',reason:'This is outside the core January–April search-planning window. A weather forecast does not indicate antler casting.'};
  if(!day)return {status:'unavailable',score:null,label:'Weather unavailable',reason:'A date-level NWS forecast is needed; do not infer conditions from missing data.'};
  if(ground==='unknown')return {status:'needs-ground',score:null,label:'Check your snow cover first',reason:'Today’s forecast cannot establish how deeply sheds are buried. Check NOAA snow analysis and inspect the ground where you will walk.'};
  if(ground==='deep')return {status:'protect-wildlife',score:12,label:'Wait — deep snow',reason:'Deep snow hides sheds and makes winter travel energetically costly for deer. Avoid entering winter cover or pushing concentrated animals.'};
  const base={bare:88,patchy:75,shallow:53}[ground]||0;
  const snowPenalty=Math.min(31,day.snowHours*3);
  const windPenalty=day.maxWindMph!=null&&day.maxWindMph>=24?12:0;
  const rainPenalty=day.rainHours>=8?13:day.rainHours>=3?6:0;
  const frozenPenalty=day.highF<15?12:0;
  const thawBonus=ground!=='bare'&&day.thawHours>=5?7:0;
  const score=Math.max(10,Math.min(95,base-snowPenalty-windPenalty-rainPenalty-frozenPenalty+thawBonus));
  const status=score>=73?'good':score>=49?'possible':'wait';
  return {status,score,label:status==='good'?'Worth a look':status==='possible'?'Possible — check locally':'Wait for better conditions',
  reason:status==='good'?'Your reported ground cover and the weather outlook are relatively favorable for searching. Visibility can still differ greatly within a short walk.'
   :status==='possible'?'Ground visibility or walking conditions may be mixed. Scout only accessible, legal ground and recheck snow before leaving.'
   :'Snow-weather, hard cold or exposure could make the search difficult. A thaw or a clearer day may help.'};
 }
 function setStatus(message,klass){
  $('loaded').textContent=message;$('loaded').className='pill '+(klass||'');
 }
 function render(){
  const data=state.data;if(!data){$('decision').textContent='Live outlook unavailable';$('classification').textContent='No current forecast';$('reason').textContent='Please try another region or refresh. No search recommendation is available without source data.';return;}
  const days=data.daily||[];
  const ground=$('ground').value;
  const decisions=days.map(d=>({...judge(d,ground),date:d.date,weather:d}));
  const ranked=decisions.filter(d=>d.score!=null).sort((a,b)=>b.score-a.score);
  const best=ranked.length?ranked[0]:null;
  const focus=days[state.day]||days[0]||null;
  const current=focus?judge(focus,ground):null;
  const overall=best?.status==='protect-wildlife'?best:best;
  const verdict=seasonNow()==='SEARCH_SEASON'&&ground!=='unknown'&&best?overall:current;
  $('decision').textContent=verdict?.label||'Forecast unavailable';
  $('classification').textContent=verdict?.status==='good'?'Search visibility: favorable':verdict?.status==='possible'?'Search visibility: mixed':verdict?.status==='protect-wildlife'?'Wildlife disturbance risk':verdict?.status==='needs-ground'?'Snow information required':verdict?.status==='seasonal'?'Seasonal context only':'Unverified';
  $('classification').className='pill '+(verdict?.status||'unavailable');
  $('reason').textContent=verdict?.reason||'No current NWS forecast.';
  $('provenance').textContent='NWS hourly forecast updated '+(data.forecastUpdatedAt?new Date(data.forecastUpdatedAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}):'time not supplied')+' · Cover selection supplied by you. No antler-drop estimate.';
  $('best-day').textContent=seasonNow()==='SEARCH_SEASON'&&best&&ground!=='unknown'?(fmt(best.date)):'Not ranked';
  $('thaw').textContent=focus?String(focus.thawHours)+' h':'—';
  $('snow').textContent=focus?String(focus.snowHours)+' h':'—';
  $('temperature').textContent=focus?focus.lowF+'°–'+focus.highF+'°':'—';
  const holder=$('days');holder.replaceChildren();
  for(const [i,d] of days.entries()){
   const decision=judge(d,ground);
   const node=document.createElement('div');node.className='day';node.dataset.selected=String(state.day===i);
   const t=document.createElement('strong');t.textContent=weekday(d.date);
   const dt=document.createElement('small');dt.textContent=fmt(d.date);
   const therm=document.createElement('div');therm.className='thermo';
   const bar=document.createElement('i');bar.style.height=Math.max(5,Math.min(100,Math.round((d.highF+15)/100*100)))+'%';therm.append(bar);
   const num=document.createElement('div');num.className='bar-value';num.textContent=d.lowF+'° / '+d.highF+'°';
   const note=document.createElement('small');note.textContent=d.snowHours>0?d.snowHours+'h snow wx':d.thawHours>4?'Thaw window':'No snow wx';
   const pick=document.createElement('button');pick.type='button';pick.textContent=state.day===i?'Selected':'Inspect';
   pick.setAttribute('aria-label','Inspect '+weekday(d.date)+', '+fmt(d.date)+' NWS outlook');pick.setAttribute('aria-pressed',String(state.day===i));
   pick.addEventListener('click',()=>{state.day=i;render();});
   const verdictTag=document.createElement('small');verdictTag.textContent=decision.score==null?'Unranked':decision.status==='good'?'Good visibility':decision.status==='possible'?'Mixed':'Wait';
   node.append(t,dt,therm,num,note,verdictTag,pick);holder.append(node);
  }
  if(!days.length)holder.textContent='No seven-day forecast is available.';
 }
 async function loadForecast(){
  const id=++state.request;const region=state.site;
  state.data=null;state.day=0;setStatus('Loading NWS forecast…');$('decision').textContent='Checking NWS…';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
  try{
   const r=await fetch('/api/shed-antlers?mode=forecast&site='+encodeURIComponent(region),{signal:controller.signal,headers:{'Accept':'application/json'}});
   if(!r.ok)throw new Error('NWS forecast currently unavailable');
   const json=await r.json();
   if(id!==state.request)return;
   if(!Array.isArray(json.daily)||json.daily.length<3)throw Error('Incomplete forecast');
   state.data=json;setStatus('NWS forecast loaded · '+fmt(new Date().toISOString().slice(0,10)),'good');render();
  }catch(err){if(id!==state.request)return;state.data=null;setStatus('NWS data unavailable','unavailable');render();$('provenance').textContent='No rating or best day is issued when the weather feed is unavailable.';$('days').textContent='Live forecast unavailable. Try updating again or choose a different region.';}
  finally{clearTimeout(timer);}
 }
 function pick(id){
  if(!state.locations.some(x=>x.id===id))return;
  const changed=state.site!==id;
  state.site=id;$('location').value=id;
  if(changed){$('ground').value='unknown';loadForecast();}
  document.querySelectorAll('.map-pin').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.site===id)));
 }
 function initMap(){
  const map=$('map');map.querySelectorAll('button').forEach(x=>x.remove());
  const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  const latPercent=lat=>100*(merc(50)-merc(lat))/(merc(50)-merc(33.5));
  const lonPercent=lon=>100*(lon+101)/24;
  state.locations.forEach((s,i)=>{
   const b=document.createElement('button');b.type='button';b.className='map-pin';b.dataset.site=s.id;
   b.textContent=String(i+1);
   b.style.left=lonPercent(s.lon).toFixed(2)+'%';b.style.top=latPercent(s.lat).toFixed(2)+'%';
   b.title=s.name;b.setAttribute('aria-label','Select '+s.name+' weather region');
   b.setAttribute('aria-pressed',String(s.id===state.site));
   b.addEventListener('click',()=>pick(s.id));map.append(b);
  });
 }
 function initCompare(){
  const holder=$('comparison');holder.replaceChildren();
  const alternatives=['bay-city','traverse-city','marquette'];
  for(const id of alternatives){
   const item=state.locations.find(x=>x.id===id);if(!item)continue;
   const b=document.createElement('button');b.type='button';b.textContent=item.name;
   const small=document.createElement('small');small.textContent='View regional forecast';b.append(small);b.addEventListener('click',()=>pick(id));holder.append(b);
  }
 }
 async function init(){
  $('ground').addEventListener('change',render);
  $('location').addEventListener('change',e=>pick(e.target.value));
  $('refresh').addEventListener('click',loadForecast);
  try{
   const r=await fetch('/api/shed-antlers?mode=locations');
   if(!r.ok)throw Error('Location lookup unavailable');
   const json=await r.json();if(!Array.isArray(json.locations)||!json.locations.length)throw Error('Empty locations');
   state.locations=json.locations;
   const select=$('location');select.replaceChildren();
   for(const s of state.locations){const opt=document.createElement('option');opt.value=s.id;opt.textContent=s.name+' · '+s.region;select.append(opt);}
   state.site=state.locations.some(x=>x.id==='bay-city')?'bay-city':state.locations[0].id;select.value=state.site;
   initMap();initCompare();
  }catch(err){
   $('comparison').textContent='Regional list temporarily unavailable. Reload to retry.';
   setStatus('Location service unavailable','unavailable');
   state.locations=[{id:'bay-city',name:'Bay City / Saginaw Bay'}];
  }
  loadForecast();
 }
 init();
})();
