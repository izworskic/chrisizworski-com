(function(){
 'use strict';
 const host=document.getElementById('lighthouse-results');
 const headline=document.getElementById('current-verdict');
 const checked=document.getElementById('feed-time');
 const sourceNote=document.getElementById('source-status');
 if(!host||!headline||!checked||!sourceNote)return;
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
 const shortFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',hour:'numeric',timeZoneName:'short'});
 const time=iso=>{const ms=Date.parse(iso||'');return Number.isFinite(ms)?fmt.format(ms):'Not reported';};
 const compact=iso=>{const ms=Date.parse(iso||'');return Number.isFinite(ms)?shortFmt.format(ms):'Unknown time';};
 const node=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
 const line=(label,value)=>{const x=node('p','reading-line');x.append(node('strong','',label+' '),document.createTextNode(value));return x;};
 const strong=(parent,text)=>{parent.append(node('strong','',text));};
 const sourceAnchor=(href,text)=>{
  const a=node('a','',text);a.href=href;a.rel='noopener noreferrer';a.target='_blank';return a;
 };
 function stateLabel(pier){
  if(!pier.available)return {label:'Not enough verified evidence',detail:pier.reason};
  if(pier.best)return {label:'Potential ice-building window',detail:compact(pier.best.startTime)+' | relative index '+pier.best.score+'/100'};
  if(pier.hours.some(h=>h.score===null))return {label:'Incomplete hourly evidence',detail:'One or more inputs could not be evaluated'};
  return {label:'No spray gate crossing in 72 hours',detail:'Forecast does not meet all modeled freezing-spray conditions'};
 }
 function explain(h,pier){
  if(!h)return 'An hourly forecast is not available.';
  const wind=h.windDirection||'Unknown direction',windMph=Number.isFinite(h.windMph)?Math.round(h.windMph)+' mph':'unknown wind';
  const air=Number.isFinite(h.airF)?Math.round(h.airF)+' F':'unknown air';
  const water=Number.isFinite(h.waterF)?Math.round(h.waterF)+' F':'unknown water';
  const direction=h.score===null?'direction unavailable':h.reason.includes('offshore')?'offshore or cross-shore':'onshore sector '+Math.round(pier.onshoreBearing)+' degrees';
  return wind+' '+windMph+', '+direction+', '+air+' air, '+water+' water. '+(h.reason||'');
 }
 function setTop(data){
  checked.textContent='Calculated '+time(data.generatedAt)+'. Forecasts and observations below have independent issue times.';
  const qualified=data.piers.filter(p=>p.best&&p.available);
  const missing=data.piers.filter(p=>!p.available).length;
  if(qualified.length){
   qualified.sort((a,b)=>b.best.score-a.best.score);
   headline.textContent=qualified[0].town+': strongest modeled window '+compact(qualified[0].best.startTime);
  }else if(missing===data.piers.length){
   headline.textContent='No complete lighthouse icing forecast is available';
  }else{
   headline.textContent='No modeled ice-building window in the next 72 hours';
  }
  sourceNote.textContent=missing+' of '+data.piers.length+' pier readings are incomplete. Water from GLSEA is a lakewide proxy where no nearby gauge is available. Wave height and pier-level pack ice are not measured. Recheck official forecasts before deciding to view from shore.';
 }
 function chart(pier,details){
  const heading=node('h4','','Next 72 hours');
  details.append(heading);
  if(!pier.hours.length){details.append(node('p','muted','No current NWS hourly product was available.'));return;}
  const chartEl=node('div','hour-chart');
  chartEl.setAttribute('role','img');
  chartEl.setAttribute('aria-label','72 hourly icing potential index bars. A blank slot means missing data. The index does not indicate visitor safety.');
  for(const h of pier.hours){
   const bar=node('span','hour-bar '+(h.score===null?'hour-missing':h.score===0?'hour-zero':'hour-active'));
   bar.style.setProperty('--level',Math.max(2,Number.isFinite(h.score)?h.score:2)+'%');
   bar.title=compact(h.startTime)+' | '+(h.score===null?'missing evidence':h.score+'/100')+' | '+h.reason;
   chartEl.append(bar);
  }
  details.append(chartEl,node('p','chart-scale','Each bar is one forecast hour, left to right. Taller bars mean stronger modeled spray icing. Blank bars mean missing evidence, not zero icing.'));
  const table=node('table','hour-table');
  const cap=node('caption','','First 24 forecast hours, including missing data');
  table.append(cap);
  const th=node('thead'),headrow=node('tr');
  ['Hour','Wind from','Air','Water source','Index'].forEach(t=>headrow.append(node('th','',t)));th.append(headrow);table.append(th);
  const body=node('tbody');
  pier.hours.slice(0,24).forEach(h=>{
   const row=node('tr'),parts=[
    compact(h.startTime),
    (h.windDirection||'Unknown')+' '+(Number.isFinite(h.windMph)?Math.round(h.windMph)+' mph':'unknown'),
    Number.isFinite(h.airF)?Math.round(h.airF)+' F':'Unknown',
    Number.isFinite(h.waterF)?Math.round(h.waterF)+' F':'Unknown',
    h.score===null?'Unknown':h.score+'/100'
   ];parts.forEach(x=>row.append(node('td','',x)));body.append(row);
  });table.append(body);details.append(table);
 }
 function card(pier){
  const card=node('article','pier-card');card.id='light-'+pier.id;
  const hdr=node('div','pier-card__head'),loc=node('p','eyebrow',pier.town+' | USCG light '+pier.lightList);
  const title=node('h3','',pier.name);
  hdr.append(loc,title);card.append(hdr);
  const status=stateLabel(pier),stat=node('p','pier-status',status.label);card.append(stat,node('p','status-detail',status.detail));
  const target=pier.best||pier.current;
  card.append(line('Why:',explain(target,pier)));
  if(pier.best&&pier.persistence){
   const est=pier.persistence.estimate.replace(/after (\d{4}-\d{2}-\d{2}T[^\s]+)/,(_whole,stamp)=>'after '+compact(stamp));
   card.append(line('How long might it last?',est+' '+pier.persistence.reason));
  }else card.append(line('How long might it last?','Cannot estimate without a modeled buildup window. Existing ice may be present and must be confirmed visually.'));
  if(pier.water){
   card.append(line('Water:',pier.water.tempF+' F from '+pier.water.station+
    (Number.isFinite(pier.water.distanceMiles)?' ('+pier.water.distanceMiles+' miles from this light)':'')+
    '; observed '+time(pier.water.observedAt)+'.'+(pier.water.kind==='lakewide-proxy'?' Lakewide proxy only, not a pier reading.':' Regional shore gauge, not a pier sensor.')));
  }else card.append(line('Water:','Unavailable or stale. Icing intensity cannot be calculated.'));
  card.append(line('NWS forecast as of:',time(pier.forecastIssuedAt)));
  card.append(line('GLERL ice:',pier.ice.coverage==='lakewide-only'?
   pier.ice.pct+'% Lake Michigan lakewide on '+time(pier.ice.observedAt)+'; pier pack ice unknown.':
   'Current regional ice status unavailable. Do not assume open water.'));
  if(pier.alerts?.status==='unavailable'){
   card.append(line('NWS freezing spray alert:','Alert feed unavailable or stale.'));
  }else if(pier.alerts?.events?.length){
   const box=node('p','official-alert'),event=pier.alerts.events[0];
   box.textContent='NWS freezing spray alert: '+event.name+'. Issued feed updated '+time(pier.alerts.updatedAt)+'. ';
   if(/^https:\/\/api\.weather\.gov\//.test(event.uri||''))box.append(sourceAnchor(event.uri,'Read official alert'));
   card.append(box);
  }else card.append(line('NWS freezing spray alert:','No active event in the queried feed as of '+time(pier.alerts?.updatedAt)+'. This is not an all-clear.'));
  const safety=node('p','card-safety','Never walk on icy or wave-swept piers. View from shore.');
  card.append(safety);
  const details=node('details','pier-details'),summary=node('summary','','Inspect 72 forecast hours');
  details.append(summary);chart(pier,details);card.append(details);
  const source=node('p','light-source','Light location and name: ');source.append(sourceAnchor('https://www.navcen.uscg.gov/sites/default/files/pdf/lightLists/LightList_V7_2024.pdf','US Coast Guard Light List'));card.append(source);
  return card;
 }
 async function load(){
  try{
   const response=await fetch('/api/lighthouse-ice',{headers:{Accept:'application/json'},cache:'no-store'});
   if(!response.ok)throw Error('The lighthouse feed is unavailable.');
   const data=await response.json();
   if(!data||!Array.isArray(data.piers)||!data.generatedAt)throw Error('Forecast data is incomplete.');
   setTop(data);
   host.replaceChildren();
   for(const pier of data.piers)host.append(card(pier));
  }catch(_error){
   headline.textContent='Live icing readings are temporarily unavailable';
   checked.textContent='No fresh data timestamp could be confirmed.';
   sourceNote.textContent='A failed feed is not a low-risk or no-ice reading. Consult the official NWS marine forecast and view only from shore.';
   host.replaceChildren(node('p','feed-error','The source could not be verified. No hourly icing scores are displayed.'));
  }
 }
 load();
 document.getElementById('reload-icing')?.addEventListener('click',load);
})();
