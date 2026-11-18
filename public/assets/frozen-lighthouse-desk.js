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
 const chartAxis=document.getElementById('desk-chart-axis');
 const readings=document.getElementById('desk-readings');
 const provenance=document.getElementById('desk-provenance');
 const maps=document.getElementById('desk-maps');
 const next=document.getElementById('desk-next');
 const previous=document.getElementById('desk-previous');
 if(!panel||!list||!title||!outcome||!slider||!chart||!chartAxis||!readings)return;

 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
 const short=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',hour:'numeric',timeZoneName:'short'});
 const chartTick=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',hour:'numeric'});
 const when=iso=>{const t=Date.parse(iso||'');return Number.isFinite(t)?fmt.format(t):'Time not reported';};
 const compact=iso=>{const t=Date.parse(iso||'');return Number.isFinite(t)?short.format(t):'Time unknown';};
 function plainReason(reason){
  if(!reason)return 'This hour has no detailed weather explanation.';
  if(reason.startsWith('All spray gates met'))return 'The wind, air and water readings line up for possible freezing spray. We cannot tell whether ice has formed.';
  if(reason.includes('offshore or cross-shore'))return 'The wind is not coming in from the lake toward this pier.';
  if(reason.startsWith('Wind below'))return 'The wind is below the 15 mph level this watch uses for freezing spray.';
  if(reason==='Air at or above freezing')return 'The air is at or above freezing, so this watch does not show new spray ice forming.';
  if(reason.startsWith('Source water temperature'))return 'The available water reading is 40 F or warmer, above this watch\'s threshold.';
  if(reason.startsWith('Widespread lake ice'))return 'Widespread lake ice may be keeping waves from reaching this pier. Conditions right beside the lighthouse remain uncertain.';
  if(reason.startsWith('Missing wind')||reason.startsWith('Formula inputs'))return 'One or more weather readings needed for this hour are missing or cannot be used.';
  if(reason==='Invalid lake ice observation')return 'The latest lake ice reading could not be used.';
  return 'The weather source did not provide a clear explanation for this hour.';
 }
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
  if(!pier.available)return 'Not enough weather readings yet';
  const first=firstWindow(pier);
  if(first)return 'Possible freezing spray '+compact(first.startTime);
  if(pier.hours?.some(h=>h.score===null))return 'Some hours lack readings';
  return 'No spray-ice weather forecast';
 }
 function hourStatus(pier,stamp){
  const hours=pier.hours||[];
  if(!hours.length||!Number.isFinite(stamp))return 'This hour: no forecast available';
  const candidate=hours[nearest(hours,stamp)];
  if(!candidate||Math.abs(Date.parse(candidate.startTime)-stamp)>3600000)return 'This hour: no matching forecast';
  if(candidate.score===null)return 'This hour: missing weather readings';
  return candidate.score>0?'This hour: possible freezing spray, signal '+candidate.score+'/100':'This hour: conditions not met';
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
   button.append(element('span','desk-location__state','Checking this hour'));
   button.addEventListener('click',()=>{state.id=p.id;render(true);});
   list.append(button);
  }
 }
 function renderChart(pier,index){
  chart.replaceChildren();
  chart.setAttribute('role','img');
  chart.setAttribute('aria-label',pier.name+': '+pier.hours.length+' forecast hours, ordered left to right. Taller red bars show stronger modeled conditions for freezing spray, gray bars mean conditions were not met, and striped bars mean missing evidence. The outlined bar is the selected hour. This does not show observed ice or probability.');
  chartAxis.replaceChildren();
  if(pier.hours.length){
   const last=pier.hours.length-1;
   for(const position of [0,Math.floor(pier.hours.length/3),Math.floor(2*pier.hours.length/3),last]){
    const stamp=Date.parse(pier.hours[Math.min(position,last)].startTime||'');
    chartAxis.append(element('span','',Number.isFinite(stamp)?chartTick.format(stamp):'Time unknown'));
   }
  }else{
   chartAxis.append(element('span','','Forecast times unavailable'));
  }
  for(let i=0;i<pier.hours.length;i++){
   const h=pier.hours[i],invalid=h.score===null;
   const b=element('span','desk-bar '+(invalid?'desk-bar--missing':h.score>0?'desk-bar--spray':'desk-bar--none')+(i===index?' desk-bar--current':''));
   b.style.height=(invalid?24:h.score===0?8:Math.max(12,Math.min(100,h.score)))+'%';
   b.title=compact(h.startTime)+': '+(invalid?'weather evidence missing':h.score>0?'possible freezing spray signal '+h.score+'/100':'freezing-spray conditions not met');
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
   outcome.textContent='We do not have enough readings for this lighthouse yet';
  }else if(first){
   outcome.textContent='Weather for freezing spray could begin '+compact(first.startTime);
  }else if(c.evaluatedHours<c.forecastHours){
   outcome.textContent='No freezing-spray window in the hours we could check. Some hours are missing.';
  }else{
   outcome.textContent='The forecast does not show the conditions needed for freezing spray';
  }
  if(first){
   const duration=first.hours===1?'1 consecutive forecast hour':first.hours+' consecutive forecast hours';
   windowText.textContent='First possible stretch: '+compact(first.startTime)+' to '+compact(first.endTime)+'. That is '+duration+' with weather favorable for freezing spray. We found '+numberOfRuns+' separate '+(numberOfRuns===1?'stretch':'stretches')+' in this forecast. Ice already on the tower must be checked visually.';
  }else{
   windowText.textContent='We could check '+c.evaluatedHours+' of '+c.forecastHours+' forecast hours. None of those hours met all the conditions for new freezing spray. Ice may already be on the lighthouse, and any hours with missing data remain unknown.';
  }
  for(const link of document.querySelectorAll('a[data-select-lighthouse]')){
   link.setAttribute('aria-current',String(link.dataset.selectLighthouse===pier.id));
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
   readings.append(element('p','desk-empty','We do not have a current hourly weather forecast for this lighthouse.'));
  }else{
   const label=h.score===null?'We do not have enough readings for this hour':
    h.score>0?'Freezing spray is possible. Relative signal '+h.score+'/100':
    h.category==='suppressed'?'Lake ice may be blocking spray; conditions at this pier are unknown':'This hour does not meet the conditions for freezing spray';
   readings.append(element('p','desk-hour-verdict',label));
   const dl=element('dl','desk-metrics');
   dl.append(
    row('Wind from',h.windDirection?String(h.windDirection)+' / '+(Number.isFinite(h.windMph)?Math.round(h.windMph)+' mph':'speed unavailable'):'Direction unavailable'),
    row('Air temperature',Number.isFinite(h.airF)?Math.round(h.airF)+' F':'Unavailable'),
    row('Water temperature',Number.isFinite(h.waterF)?Math.round(h.waterF)+' F':'Unavailable'),
    row('Lake Michigan ice (lakewide)',pier.ice?.coverage==='lakewide-only'?pier.ice.pct+'% (not local)':'Unavailable'),
    row('Wind gust',Number.isFinite(h.gustMph)?Math.round(h.gustMph)+' mph':'Not reported')
   );
   readings.append(dl,element('p','desk-hour-reason',plainReason(h.reason)));
  }
  provenance.replaceChildren();
  const water=pier.water?pier.water.station+' at '+when(pier.water.observedAt):'Unavailable or stale';
  provenance.append(element('p','', 'National Weather Service forecast issued '+when(pier.forecastIssuedAt)+'. Water reading: '+water+'. '+(pier.water?.kind==='lakewide-proxy'?'This is an average for the lake, not a reading at the pier.':'This gauge measures the coast, not the lighthouse pier.')));
  const alert=pier.alerts;
  if(alert?.events?.length){
   provenance.append(element('p','desk-alert','The National Weather Service has a freezing-spray alert for this area: '+alert.events.map(e=>e.name).join('; ')+'. Read the official warning.'));
  }else if(alert?.status!=='complete'){
   provenance.append(element('p','desk-alert','We could not check every marine warning for this area. Do not assume there are no warnings.'));
  }else{
   provenance.append(element('p','', 'No freezing-spray alert was listed for the marine zones checked as of '+when(alert.updatedAt)+'. That does not mean the pier is safe.'));
  }
  provenance.append(element('p','desk-caution','Watch from shore and stay off icy or wave-swept piers. A weather signal cannot tell you whether the pier is safe.'));
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
 document.querySelectorAll('a[data-select-lighthouse]').forEach(link=>{
  link.addEventListener('click',()=>{
   const id=link.dataset.selectLighthouse;
   if(state.data?.piers?.some(p=>p.id===id)){
    state.id=id;
    render(true);
   }
  });
 });
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
  list.replaceChildren(element('p','desk-empty','We could not get the latest weather readings.'));
  title.textContent='Weather forecast unavailable';
  outcome.textContent='No trustworthy forecast available right now';
  windowText.textContent='We could not check the forecast. Please use the official National Weather Service marine forecast before heading out.';
  timeLabel.textContent='No current hourly forecast';
  slider.disabled=true;previous.disabled=true;next.disabled=true;
  readings.replaceChildren();chart.replaceChildren();chartAxis.replaceChildren();provenance.replaceChildren();
  maps.removeAttribute('href');
 });
})();