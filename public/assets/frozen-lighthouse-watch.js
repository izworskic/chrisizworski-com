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
 function plainReason(reason){
  if(!reason)return 'There is no detailed explanation for this hour.';
  if(reason.startsWith('All spray gates met'))return 'The wind and temperatures line up for possible freezing spray. That does not mean ice is already on the lighthouse.';
  if(reason.includes('offshore or cross-shore'))return 'The wind is not blowing waves from the lake toward this pier.';
  if(reason.startsWith('Wind below'))return 'The wind is below the 15 mph level this watch uses for freezing spray.';
  if(reason==='Air at or above freezing')return 'The air is at or above freezing.';
  if(reason.startsWith('Source water temperature'))return 'The water reading is 40 F or warmer.';
  if(reason.startsWith('Widespread lake ice'))return 'Widespread lake ice may hold down the waves, but we cannot see the water right at the pier.';
  if(reason.startsWith('Missing wind')||reason.startsWith('Formula inputs'))return 'One or more weather readings are missing or cannot be used.';
  if(reason==='Invalid lake ice observation')return 'The latest lake ice reading could not be used.';
  return 'The weather source does not provide a clear explanation for this hour.';
 }
 function stateLabel(pier){
  if(!pier.available)return {label:'Not enough weather readings yet',detail:'We cannot make a trustworthy forecast for this light from the readings available.'};
  if(pier.best)return {label:'Weather could build spray ice',detail:'First possible stretch: '+compact(pier.best.startTime)+'. Relative signal '+pier.best.score+'/100'};
  if(pier.hours.some(h=>h.score===null))return {label:'Some hours are still uncertain',detail:'A weather reading is missing for one or more hours'};
  return {label:'No freezing-spray window in the available forecast',detail:'The hours we could check did not have all the needed wind and cold'};
 }
 function explain(h,pier){
  if(!h)return 'We do not have an hourly forecast for this lighthouse.';
  const wind=h.windDirection||'an unknown direction';
  const speed=Number.isFinite(h.windMph)?Math.round(h.windMph)+' mph':'an unknown speed';
  const gust=Number.isFinite(h.gustMph)?' Gusts may reach '+Math.round(h.gustMph)+' mph.':' Wind gust not reported.';
  const air=Number.isFinite(h.airF)?Math.round(h.airF)+' F':'unavailable';
  const water=Number.isFinite(h.waterF)?Math.round(h.waterF)+' F':'unavailable';
  return 'Wind from '+wind+' at '+speed+'.'+gust+' Air: '+air+'. Water: '+water+'. '+plainReason(h.reason);
 }
 function setTop(data){
  checked.textContent='Weather checked '+time(data.generatedAt)+'. The forecast and water readings may have been updated at different times.';
  const qualified=data.piers.filter(p=>p.best&&p.available);
  const missing=data.piers.filter(p=>!p.available).length;
  if(qualified.length){
   qualified.sort((a,b)=>b.best.score-a.best.score);
   headline.textContent=qualified[0].town+': possible freezing spray around '+compact(qualified[0].best.startTime);
  }else if(missing===data.piers.length){
   headline.textContent='We cannot make a reliable freezing-spray forecast right now';
  }else{
   headline.textContent='No freezing-spray window found in the hours we could check';
  }
  sourceNote.textContent=(missing?missing+' of '+data.piers.length+' lighthouse forecasts are incomplete. ':'')+'Some water temperatures come from a lakewide average, not a sensor at the pier. We cannot measure the waves or ice right beside each lighthouse. Check official forecasts before going to watch from shore.';
 }
 function chart(pier,details){
  const heading=node('h4','','Next 72 hours');
  details.append(heading);
  if(!pier.hours.length){details.append(node('p','muted','We do not have a current hour-by-hour forecast for this lighthouse.'));return;}
  const chartEl=node('div','hour-chart');
  chartEl.setAttribute('role','img');
  chartEl.setAttribute('aria-label','Up to 72 hours of possible freezing-spray conditions. Taller bars indicate stronger weather signals. Striped bars mean missing readings. The chart does not show ice already on the tower or safe pier access.');
  for(const h of pier.hours){
   const bar=node('span','hour-bar '+(h.score===null?'hour-missing':h.score===0?'hour-zero':'hour-active'));
   bar.style.setProperty('--level',Math.max(2,Number.isFinite(h.score)?h.score:2)+'%');
   bar.title=compact(h.startTime)+' | '+(h.score===null?'weather readings missing':h.score>0?'possible freezing spray, signal '+h.score+'/100':'conditions not met')+' | '+plainReason(h.reason);
   chartEl.append(bar);
  }
  details.append(chartEl,node('p','chart-scale','Each bar is one forecast hour. Taller bars show a stronger signal for freezing spray; stripes mean missing readings, not a zero reading. This is weather guidance, not a record of ice on the lighthouse.'));
  const table=node('table','hour-table');
  const cap=node('caption','','The first 24 forecast hours, with any missing readings shown');
  table.append(cap);
  const th=node('thead'),headrow=node('tr');
  ['Hour','Wind from','Air','Water','Relative signal'].forEach(t=>headrow.append(node('th','',t)));th.append(headrow);table.append(th);
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
  card.append(line('What the weather says:',explain(target,pier)));
  if(pier.best&&pier.persistence){
   const est=pier.persistence.estimate.replace(/after (\d{4}-\d{2}-\d{2}T[^\s]+)/,(_whole,stamp)=>'after '+compact(stamp));
   card.append(line('Could ice last?',est+'. '+pier.persistence.reason));
  }else card.append(line('Could ice last?','We cannot tell from this forecast. Ice may already be on the lighthouse, so look for a current photograph or camera view.'));
  if(pier.water){
   card.append(line('Water temperature:',pier.water.tempF+' F from '+pier.water.station+
    (Number.isFinite(pier.water.distanceMiles)?' ('+pier.water.distanceMiles+' miles from this light)':'')+
    '; observed '+time(pier.water.observedAt)+'.'+(pier.water.kind==='lakewide-proxy'?' This is the average for the lake, not a reading at this pier.':' This gauge measures water near the shore, not at the lighthouse.')));
  }else card.append(line('Water temperature:','We do not have a current reading, so the forecast signal cannot be calculated.'));
  card.append(line('Weather forecast updated:',time(pier.forecastIssuedAt)));
  card.append(line('Lake Michigan ice (lakewide):',pier.ice.coverage==='lakewide-only'?
   pier.ice.pct+'% Lake Michigan lakewide on '+time(pier.ice.observedAt)+'; pier pack ice unknown.':
   'No recent lakewide ice reading is available. Do not assume open water.'));
  const zones=(pier.alerts?.zones||[]).join(', ')||'unverified marine zone';
  if(pier.alerts?.events?.length){
   const box=node('p','official-alert'),event=pier.alerts.events[0];
   box.textContent='National Weather Service alert: '+event.name+' for '+zones+'. Last checked '+time(pier.alerts.updatedAt)+'. '+(pier.alerts.status==='partial'?'Some neighboring marine zones could not be checked. ':'');
   if(/^https:\/\/api\.weather\.gov\//.test(event.uri||''))box.append(sourceAnchor(event.uri,'Read official alert'));
   card.append(box);
  }else if(pier.alerts?.status!=='complete'){
   card.append(line('Freezing-spray alerts:','We could not check all the marine warnings for '+zones+'. Do not assume there is no warning.'));
  }else{
   card.append(line('Freezing-spray alerts:','No active alert was listed for marine zones '+zones+' as of '+time(pier.alerts.updatedAt)+'. That does not mean the pier is safe.'));
  }
    const safety=node('p','card-safety','Never walk on icy or wave-swept piers. View from shore.');
  card.append(safety);
  const details=node('details','pier-details'),summary=node('summary','','See the next 72 hours');
  details.append(summary);chart(pier,details);card.append(details);
  const source=node('p','light-source','Light location and name: ');source.append(sourceAnchor('https://www.navcen.uscg.gov/sites/default/files/pdf/lightLists/LightList_V7_2024.pdf','US Coast Guard Light List'));card.append(source);
  return card;
 }
 async function load(){
  try{
   const response=await fetch('/api/lighthouse-ice',{headers:{Accept:'application/json'},cache:'no-store'});
   if(!response.ok)throw Error('The lighthouse feed is unavailable.');
   const data=await response.json();
   // The server allows 60 minutes of edge cache plus 30 minutes of stale revalidation.
   // A failed revalidation must not keep an old forecast on either live surface.
   const age=Date.now()-Date.parse(data?.generatedAt||'');
   if(!data||!Array.isArray(data.piers)||!data.piers.length||!Number.isFinite(age)||age<0||age>90*60000)throw Error('Forecast packet is missing or outdated.');
   setTop(data);
   host.replaceChildren();
   for(const pier of data.piers)host.append(card(pier));
   window.dispatchEvent(new CustomEvent('frozen-lighthouse-ready',{detail:data}));
  }catch(_error){
   headline.textContent='We cannot reach the latest lighthouse forecast right now';
   checked.textContent='We could not confirm when the weather readings were last updated.';
   sourceNote.textContent='No forecast does not mean no ice. Check the official National Weather Service marine forecast and stay on shore.';
   host.replaceChildren(node('p','feed-error','We could not verify the weather readings, so there is no hour-by-hour forecast to show.'));
   window.dispatchEvent(new Event('frozen-lighthouse-failed'));
  }
 }
 load();
 document.getElementById('reload-icing')?.addEventListener('click',load);
})();
