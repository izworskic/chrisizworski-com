(function(){
 'use strict';
 const panel=document.getElementById('forecast-desk');
 const list=document.getElementById('coast-lights');
 const title=document.getElementById('desk-place');
 const outcome=document.getElementById('desk-outcome');
 const windowText=document.getElementById('desk-window');
 const timeLabel=document.getElementById('desk-time');
 const slider=document.getElementById('desk-slider');
 const chart=document.getElementById('desk-chart');
 const readings=document.getElementById('desk-readings');
 const provenance=document.getElementById('desk-provenance');
 const maps=document.getElementById('desk-maps');
 const next=document.getElementById('desk-next');
 const previous=document.getElementById('desk-previous');
 if(!panel||!list||!title||!outcome||!slider||!chart||!readings)return;

 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
 const short=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',hour:'numeric',timeZoneName:'short'});
 const when=iso=>{const t=Date.parse(iso||'');return Number.isFinite(t)?fmt.format(t):'Time not reported';};
 const compact=iso=>{const t=Date.parse(iso||'');return Number.isFinite(t)?short.format(t):'Time unknown';};
 const element=(tag,cls,content)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(content!==undefined)el.textContent=content;
  return el;
 };
 const row=(label,value)=>{
  const el=element('div','desk-reading'),name=element('dt','',label),v=element('dd','',value);
  el.append(name,v);return el;
 };
 const state={data:null,id:null,time:null};
 const params=new URLSearchParams(window.location.search);
 const requested=params.get('light');
 const savedTime=Date.parse(params.get('at')||'');
 if(Number.isFinite(savedTime))state.time=savedTime;

 function nearest(hours,stamp){
  if(!hours?.length)return 0;
  if(!Number.isFinite(stamp))return 0;
  let best=0,delta=Infinity;
  hours.forEach((h,i)=>{
   const distance=Math.abs(Date.parse(h.startTime)-stamp);
   if(Number.isFinite(distance)&&distance<delta){delta=distance;best=i;}
  });
  return best;
 }
 function at(pier){return pier?.hours?.[nearest(pier.hours,state.time)]||null;}
 function selected(){return state.data?.piers?.find(p=>p.id===state.id)||null;}
 function firstWindow(pier){return pier.windows?.[0]||null;}
 function placeStatus(pier){
  if(!pier.available)return 'Evidence incomplete';
  const first=firstWindow(pier);
  if(first)return 'Possible spray '+compact(first.startTime);
  if(pier.hours?.some(h=>h.score===null))return 'Some hours unknown';
  return 'No modeled spray window';
 }
 function hourStatus(pier,stamp){
  const hours=pier.hours||[];
  if(!hours.length||!Number.isFinite(stamp))return 'Selected hour: forecast unknown';
  const candidate=hours[nearest(hours,stamp)];
  if(!candidate||Math.abs(Date.parse(candidate.startTime)-stamp)>3600000)return 'Selected hour: no matching forecast';
  if(candidate.score===null)return 'Selected hour: evidence unknown';
  return candidate.score>0?'Selected hour: possible spray '+candidate.score+'/100':'Selected hour: no modeled spray';
 }
 function makeList(){
  list.replaceChildren();
  const piers=state.data.piers; // USCG light list is ordered St. Joseph to Frankfort.
  for(const p of piers){
   const button=element('button','desk-location');
   button.type='button';
   button.dataset.pier=p.id;
   button.setAttribute('aria-pressed',String(state.id===p.id));
   button.append(element('span','desk-location__town',p.town));
   button.append(element('span','desk-location__light',p.name));
   button.append(element('span','desk-location__window',placeStatus(p)));
   button.append(element('span','desk-location__state','Selected hour: waiting'));
   button.addEventListener('click',()=>{state.id=p.id;render(true);});
   list.append(button);
  }
 }
 function renderChart(pier,index){
  chart.replaceChildren();
  chart.setAttribute('role','img');
  chart.setAttribute('aria-label',pier.name+': '+pier.hours.length+' issued hourly forecast periods. Bars show relative possible spray only; striped slots mean missing inputs. Use the hour slider to read individual values.');
  for(let i=0;i<pier.hours.length;i++){
   const h=pier.hours[i],invalid=h.score===null;
   const b=element('span','desk-bar '+(invalid?'desk-bar--missing':h.score>0?'desk-bar--spray':'desk-bar--none')+(i===index?' desk-bar--current':''));
   b.style.height=(invalid?24:h.score===0?8:Math.max(12,Math.min(100,h.score)))+'%';
   b.title=compact(h.startTime)+': '+(invalid?'unknown':h.score+'/100');
   b.setAttribute('aria-hidden','true');
   chart.append(b);
  }
 }
 function fixUrl(){
  try{
   const url=new URL(window.location.href);
   url.searchParams.set('light',state.id);
   if(Number.isFinite(state.time))url.searchParams.set('at',new Date(state.time).toISOString());
   window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  }catch(_ignore){/* Browsers without history support keep the tool usable. */}
 }
 function render(updateUrl){
  const pier=selected();
  if(!pier)return;
  title.textContent=pier.name;
  const hours=pier.hours||[];
  const idx=nearest(hours,state.time);
  const h=hours[idx]||null;
  if(h)state.time=Date.parse(h.startTime);
  slider.max=String(Math.max(0,hours.length-1));
  slider.value=String(idx);
  slider.disabled=!hours.length;
  previous.disabled=!hours.length||idx===0;
  next.disabled=!hours.length||idx===hours.length-1;
  timeLabel.textContent=h?when(h.startTime):'No hourly forecast available';
  slider.setAttribute('aria-valuetext',h?when(h.startTime):'Unavailable');
  maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(pier.lat.toFixed(6)+','+pier.lon.toFixed(6));
  maps.setAttribute('aria-label','Locate '+pier.name+' in Google Maps. This is the light, not a parking location.');
  const first=firstWindow(pier);
  const numberOfRuns=pier.windows?.length||0;
  const c=pier.coverage||{forecastHours:hours.length,evaluatedHours:hours.filter(x=>x.score!==null).length};
  if(!pier.available){
   outcome.textContent='A forecast verdict is unavailable';
  }else if(first){
   outcome.textContent='Possible spray window beginning '+compact(first.startTime);
  }else if(c.evaluatedHours<c.forecastHours){
   outcome.textContent='No window found in evaluated hours. Some hours are unknown.';
  }else{
   outcome.textContent='No modeled spray window in the available forecast';
  }
  if(first){
   const duration=first.hours===1?'1 consecutive forecast hour':first.hours+' consecutive forecast hours';
   windowText.textContent='First window: '+compact(first.startTime)+' to '+compact(first.endTime)+'. '+duration+'. '+numberOfRuns+' separate possible-spray '+(numberOfRuns===1?'window':'windows')+' in the available period. The model cannot confirm ice already on the tower.';
  }else{
   windowText.textContent='No continuous spray window identified. '+c.evaluatedHours+' of '+c.forecastHours+' issued hours could be evaluated. Existing ice may still be present.';
  }
  for(const button of list.querySelectorAll('button[data-pier]')){
   button.setAttribute('aria-pressed',String(button.dataset.pier===pier.id));
   const candidate=state.data.piers.find(p=>p.id===button.dataset.pier);
   const label=button.querySelector('.desk-location__state');
   if(candidate&&label)label.textContent=hourStatus(candidate,state.time);
  }
  // Keep the chosen location visible in the mobile coast selector.
  // Adjust horizontal scroll only; never move the page vertically on load.
  if(window.matchMedia('(max-width: 820px)').matches){
   const active=list.querySelector('button[aria-pressed="true"]');
   if(active){
    const left=active.getBoundingClientRect().left-list.getBoundingClientRect().left+list.scrollLeft;
    list.scrollLeft=Math.max(0,left-12);
   }
  }
  renderChart(pier,idx);
  readings.replaceChildren();
  if(!h){
   readings.append(element('p','desk-empty','NWS hourly evidence is unavailable or stale for this location.'));
  }else{
   const label=h.score===null?'Unknown from available evidence':
    h.score>0?'Possible freezing spray, index '+h.score+'/100':
    h.category==='suppressed'?'Lakewide ice suppression, local spray unverified':'No modeled spray gate crossing';
   readings.append(element('p','desk-hour-verdict',label));
   const dl=element('dl','desk-metrics');
   dl.append(
    row('Wind from',h.windDirection?String(h.windDirection)+' / '+(Number.isFinite(h.windMph)?Math.round(h.windMph)+' mph':'speed unavailable'):'Direction unavailable'),
    row('Air',Number.isFinite(h.airF)?Math.round(h.airF)+' F':'Unavailable'),
    row('Water',Number.isFinite(h.waterF)?Math.round(h.waterF)+' F':'Unavailable'),
    row('Lakewide ice',pier.ice?.coverage==='lakewide-only'?pier.ice.pct+'% (not local)':'Unavailable'),
    row('Reported gust',Number.isFinite(h.gustMph)?Math.round(h.gustMph)+' mph':'Not reported')
   );
   readings.append(dl,element('p','desk-hour-reason',h.reason||'No reason supplied'));
  }
  provenance.replaceChildren();
  const water=pier.water?pier.water.station+' at '+when(pier.water.observedAt):'Unavailable or stale';
  provenance.append(element('p','', 'NWS issued: '+when(pier.forecastIssuedAt)+'. Water: '+water+'. '+(pier.water?.kind==='lakewide-proxy'?'Lakewide average is a proxy, not a reading at the pier.':'Coastal gauge is not a pier sensor.')));
  const alert=pier.alerts;
  if(alert?.events?.length){
   provenance.append(element('p','desk-alert','NWS marine freezing spray alert: '+alert.events.map(e=>e.name).join('; ')+'. Check the official warning.'));
  }else if(alert?.status!=='complete'){
   provenance.append(element('p','desk-alert','Marine warning feed incomplete or unavailable. This is not an all-clear.'));
  }else{
   provenance.append(element('p','', 'No active freezing spray alert in the checked marine zones at '+when(alert.updatedAt)+'. This is not an all-clear.'));
  }
  provenance.append(element('p','desk-caution','View from shore. A wind-driven ice buildup signal says nothing about safe access.'));
  if(updateUrl)fixUrl();
 }
 function selectHour(index){
  const pier=selected();
  const h=pier?.hours?.[index];
  if(!h)return;
  state.time=Date.parse(h.startTime);render(true);
 }
 slider.addEventListener('input',()=>selectHour(Number(slider.value)));
 previous.addEventListener('click',()=>selectHour(Number(slider.value)-1));
 next.addEventListener('click',()=>selectHour(Number(slider.value)+1));
 window.addEventListener('frozen-lighthouse-ready',event=>{
  const incoming=event.detail;
  if(!incoming||!Array.isArray(incoming.piers))return;
  const priorId=state.id||requested;
  state.data=incoming;
  state.id=incoming.piers.some(p=>p.id===priorId)?priorId:
   incoming.piers.find(p=>p.id==='st-joseph-outer')?.id||incoming.piers[0]?.id||null;
  if(!state.id)return;
  makeList();render(false);
  panel.classList.add('desk-loaded');
 });
 window.addEventListener('frozen-lighthouse-failed',()=>{
  state.data=null;
  list.replaceChildren(element('p','desk-empty','The forecast feed could not be verified.'));
  title.textContent='Hourly outlook unavailable';
  outcome.textContent='No reliable model verdict';
  windowText.textContent='Source connection failed. Please check the official NWS marine forecast.';
  timeLabel.textContent='No forecast hours loaded';
  slider.disabled=true;previous.disabled=true;next.disabled=true;
  readings.replaceChildren();chart.replaceChildren();provenance.replaceChildren();
  maps.removeAttribute('href');
 });
})();