const $=(s)=>document.querySelector(s);const $$=(s)=>[...document.querySelectorAll(s)];
const state={data:null,mode:'today',range:'today',selectedWindow:null,map:null,viewMarkers:[],stationMarkers:[],stationsVisible:false};
const ZONE='America/Moncton';const EASTPORT_ZONE='America/New_York';
const esc=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(t,opts={})=>new Intl.DateTimeFormat('en-US',{timeZone:ZONE,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...opts}).format(new Date(t));
const timeOnly=(t)=>new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(new Date(t));
const eastportTime=(t)=>new Intl.DateTimeFormat('en-US',{timeZone:EASTPORT_ZONE,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(t));
const dateKey=(t)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(t));const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`};
const addMinutes=(t,n)=>new Date(new Date(t).getTime()+n*60000);
const setText=(id,v)=>{const e=$(id);if(e)e.textContent=v??'—'};
function strengthLabel(w){const p=w?.currentPercentile;if(p==null)return 'Signal unknown';if(p>=85)return 'Strong flood signal';if(p>=65)return 'Good flood signal';if(p>=35)return 'Typical flood signal';return 'Weaker flood signal'}
function visibilityLabel(w){const c=w?.weather?.visibility?.classification;if(!c)return 'Forecast not available yet';if(c==='impaired')return 'Poor visibility possible';if(c==='possibly_impaired')return 'Visibility may be reduced';if(c==='clear')return 'Good visibility';return 'No visibility issue stated'}
function expectationText(w){const p=w?.currentPercentile;const weather=visibilityLabel(w);if(p>=85)return `This is one of the stronger nearby predicted flood-current periods in the next two weeks. Look for broad rotation, boils and energetic eddies. ${weather}. A deep funnel is still not guaranteed.`;if(p>=65)return `This is a solid nearby flood-current window. Expect moving, textured water and rotating eddies more than a perfect funnel. ${weather}.`;if(p>=35)return `This is a usable viewing window, but the nearby predicted flood current is fairly typical. You may see active eddies and boils without a dramatic central vortex. ${weather}.`;return `The timing is usable, but this is a weaker nearby flood-current signal. If your schedule is flexible, compare the stronger windows below. ${weather}.`}
function sourceModeLabel(d){const m=d?.operational?.dataState;return m==='fresh'?'Live sources updated':m==='cached-fresh'?'Fresh cached sources':m==='stale-last-known'?'Using last-known sources':'Source status uncertain'}
function getActiveWindow(){return state.selectedWindow||state.data?.decision?.nextWindow||null}
function highTideContext(w){const h=w?.nearestEastportHigh;if(!h||h.offsetMinutesFromPeak==null)return 'High-tide cross-check unavailable';const mins=Math.round(Math.abs(h.offsetMinutesFromPeak));return h.offsetMinutesFromPeak>=0?`${mins} min before high tide`:`${mins} min after high tide`}
function renderHero(){
  const d=state.data,w=getActiveWindow();if(!d||!w)return;
  const now=Date.now(),start=new Date(w.start).getTime(),end=new Date(w.end).getTime();
  let label='NEXT USEFUL VIEWING WINDOW';
  if(now>=start&&now<=end)label='GO NOW · VIEWING WINDOW IS OPEN';
  else if(start-now<6*3600000)label='GO LATER TODAY';
  else if(dateKey(w.start)===dateKey(new Date()))label='BEST WINDOW TODAY';
  setText('#decisionLabel',label);
  setText('#sourceState',sourceModeLabel(d));
  const dot=$('#statusDot');dot.className='status-dot '+(d.operational?.dataState==='stale-last-known'?'bad':'good');
  const arrive=addMinutes(w.start,-30);
  setText('#arrivalTime',fmt(arrive,{weekday:undefined,month:undefined,day:undefined,timeZoneName:'short'}));
  setText('#windowTime',`${fmt(w.start)} – ${timeOnly(w.end)} · ${highTideContext(w)}`);
  setText('#stayUntil',timeOnly(w.end));
  setText('#signal',strengthLabel(w));
  setText('#visibility',visibilityLabel(w));
  setText('#expectation',expectationText(w));
}
function renderNow(){
  const p=state.data?.decision?.phase;const phase=String(p?.phase||'').toLowerCase();
  let headline='Current phase is uncertain.';
  if(phase.includes('ebb'))headline='Not the prime viewing phase right now.';
  else if(phase.includes('flood'))headline='Flood current is underway now.';
  else if(phase.includes('flood onset'))headline='The water is building toward the next flood window.';
  else if(phase.includes('slack'))headline='Near slack water — wait for the flood to build.';
  setText('#nowDecision',headline);
  setText('#nowDetail',p?.detail||'Timing is based on nearby NOAA current predictions, not a direct Old Sow sensor.');
}
function modeCopy(){
  const w=getActiveWindow();if(!w)return;
  const arrival=timeOnly(addMinutes(w.start,state.mode==='photo'?-45:-30));
  const copies={
    today:[`Today:`,`Aim to be at Deer Island Point by ${arrival}. Stay through ${timeOnly(w.end)} rather than chasing one exact peak minute.`],
    deer:[`Already on Deer Island:`,`You’re in the right place. Head for Deer Island Point Park by ${arrival}; the best land view is from the Point, not from an arbitrary spot along the island.`],
    eastport:[`From Eastport:`,`The best land viewing is across Western Passage at Deer Island Point Park. Recommended arrival is ${arrival} Deer Island time (${eastportTime(addMinutes(w.start,-30))} on the Eastport clock). Do not assume a direct Eastport–Deer Island ferry.`],
    photo:[`For photos:`,`Arrive about 45 minutes early (${arrival}), stay through ${timeOnly(w.end)}, and favor daylight windows with the best visibility. Strong current improves the opportunity but does not guarantee a funnel.`]
  };
  const [a,b]=copies[state.mode];$('#modeAnswer').innerHTML=`<strong>${esc(a)}</strong><span>${esc(b)}</span>`;
}
function rangeRows(){
  const rows=state.data?.windows||[];const today=dateKey(new Date());const tomorrow=dateKey(addMinutes(new Date(),1440));
  if(state.range==='today')return rows.filter(w=>dateKey(w.peak)===today);
  if(state.range==='tomorrow')return rows.filter(w=>dateKey(w.peak)===tomorrow);
  const days=Number(state.range)||7;const cutoff=Date.now()+days*86400000;return rows.filter(w=>new Date(w.end).getTime()>=Date.now()&&new Date(w.start).getTime()<=cutoff);
}
function renderWindows(){
  const host=$('#windowList');let rows=rangeRows();
  if(!rows.length){host.innerHTML='<div class="empty">No daylight-friendly flood window is available in this range. Try the next range.</div>';return}
  rows=rows.slice(0,state.range==='today'||state.range==='tomorrow'?4:8);
  host.innerHTML=rows.map((w,i)=>`<article class="window-card ${i===0?'recommended':''}">
    <div><span>${i===0?'BEST IN THIS RANGE':'VIEWING WINDOW'}</span><strong class="big-time">${esc(fmt(w.start,{timeZoneName:undefined}))}</strong><div class="why-line">Arrive by ${esc(timeOnly(addMinutes(w.start,-30)))} · stay to ${esc(timeOnly(w.end))}</div></div>
    <div><span>Nearby current</span><strong>${esc(strengthLabel(w))}</strong><div class="why-line">${w.predictedMaxFloodKnots?.toFixed?.(1)??'—'} kt · ${w.currentPercentile??'?'}th percentile</div></div>
    <div><span>Trip context</span><strong>${esc(visibilityLabel(w))}</strong><div class="why-line">${esc(highTideContext(w))}</div></div>
    <div class="window-actions"><button class="button primary choose-window" data-index="${i}" type="button">Use this time</button><button class="button secondary calendar-window" data-index="${i}" type="button">Calendar</button></div>
  </article>`).join('');
  $$('.choose-window').forEach((b,i)=>b.addEventListener('click',()=>{state.selectedWindow=rows[i];renderHero();modeCopy();$('#answer').scrollIntoView({behavior:'smooth'});}));
  $$('.calendar-window').forEach((b,i)=>b.addEventListener('click',()=>calendarDownload(rows[i])));
}
function calendarDownload(w){const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace('.000','');const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Chris Izworski//Old Sow Live//EN','BEGIN:VEVENT',`UID:${w.id}@chrisizworski.com`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(addMinutes(w.start,-30))}`,`DTEND:${stamp(w.end)}`,'SUMMARY:Old Sow viewing window','LOCATION:Deer Island Point Park, New Brunswick','DESCRIPTION:Arrive before the NOAA-derived flood-current viewing window. This is a forecast, not a guaranteed whirlpool observation.','URL:https://chrisizworski.com/old-sow-live/','END:VEVENT','END:VCALENDAR'].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));a.download='old-sow-viewing-window.ics';a.click();URL.revokeObjectURL(a.href)}
function linePath(points,min,max,yMin,yMax,h=250,top=30){if(!points.length)return '';const span=max-min||1,ys=yMax-yMin||1;return points.map((p,i)=>{const x=55+((new Date(p.time)-min)/span)*790;const y=top+h-((p.value-yMin)/ys)*h;return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ')}
function renderChart(){
  const d=state.data,svg=$('#pulseChart');if(!svg)return;
  const tide=(d?.chart?.tide||[]).map(r=>({time:r.time,value:Number(r.value)})).filter(r=>Number.isFinite(r.value));
  const current=(d?.chart?.current||[]).map(r=>({time:r.time,value:Number(r.velocity),type:r.type})).filter(r=>Number.isFinite(r.value));
  const all=[...tide,...current];if(!all.length){svg.innerHTML='<text x="40" y="80">Chart data unavailable.</text>';return}
  const min=Math.min(...all.map(p=>new Date(p.time).getTime())),max=Math.max(...all.map(p=>new Date(p.time).getTime()));
  const tMin=Math.min(...tide.map(p=>p.value),0),tMax=Math.max(...tide.map(p=>p.value),1),cMin=Math.min(...current.map(p=>p.value),-1),cMax=Math.max(...current.map(p=>p.value),1);
  const currentName=d?.chart?.currentStation?`${d.chart.currentStation.id} · ${d.chart.currentStation.name}`:'Nearby current';
  setText('#chartCurrentLegend',`${currentName} · knots (+ flood / − ebb)`);
  let html='';for(let i=0;i<5;i++){const y=30+i*62.5;html+=`<line class="grid-line" x1="55" y1="${y}" x2="845" y2="${y}"/>`}
  for(const b of d.chart.daylight||[]){if(!b.sunrise||!b.sunset)continue;const a=Math.max(min,new Date(b.sunrise).getTime()),z=Math.min(max,new Date(b.sunset).getTime());if(z>a){const x=55+((a-min)/(max-min))*790,w=((z-a)/(max-min))*790;html+=`<rect class="day-band" x="${x}" y="30" width="${w}" height="250"/>`}}
  for(let i=0;i<current.length-1;i++){const a=current[i],b=current[i+1];if(!['flood','ebb'].includes(a.type))continue;const ta=new Date(a.time).getTime(),tb=new Date(b.time).getTime();if(tb<=ta)continue;const x=55+((ta-min)/(max-min))*790,w=((tb-ta)/(max-min))*790;html+=`<rect class="${a.type==='flood'?'flood-band':'ebb-band'}" x="${x}" y="30" width="${w}" height="250"/>`}
  html+=`<path class="tide-line" d="${linePath(tide,min,max,tMin,tMax)}"/><path class="current-line" d="${linePath(current,min,max,cMin,cMax)}"/><line id="chartMarker" class="marker-line" x1="55" y1="30" x2="55" y2="280"/><text class="axis-label" x="8" y="22">Tide ft</text><text class="axis-label" x="805" y="22">Current kt</text>`;svg.innerHTML=html;
  const scrub=$('#timeScrubber');scrub.oninput=()=>{const t=min+(Number(scrub.value)/1000)*(max-min),x=55+Number(scrub.value)/1000*790;$('#chartMarker')?.setAttribute('x1',x);$('#chartMarker')?.setAttribute('x2',x);const near=(arr)=>arr.reduce((best,p)=>!best||Math.abs(new Date(p.time)-t)<Math.abs(new Date(best.time)-t)?p:best,null);const a=near(tide),b=near(current);setText('#scrubReadout',`${fmt(t)} · tide ${a?.value?.toFixed(1)??'—'} ft · current ${b?.value?.toFixed(1)??'—'} kt ${b?.type?`(${b.type})`:''}`)};scrub.dispatchEvent(new Event('input'));
}
function showMapPoint(p){setText('#mapName',p.name);setText('#mapText',p.note||p.label||'Forecast reference point.');$('#mapCard').hidden=false;if(state.map&&Number.isFinite(p.lat)&&Number.isFinite(p.lon))state.map.panTo([p.lat,p.lon])}
function initMap(){
  const d=state.data;if(!window.L||!d)return;const map=L.map('map',{scrollWheelZoom:false,dragging:false,tap:false}).setView([44.9239,-66.9866],13);state.map=map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const views=(d.viewpoints||[]).map(p=>({...p,kind:'viewpoint'}));const stations=(d.stations||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>({...p,kind:'station'}));
  state.viewMarkers=views.map(p=>{const m=L.circleMarker([p.lat,p.lon],{radius:p.id==='deer-point'?10:7,weight:2,fillOpacity:.9}).addTo(map).bindTooltip(p.name);m.on('click',()=>showMapPoint(p));return {p,m}});
  state.stationMarkers=stations.map(p=>{const m=L.circleMarker([p.lat,p.lon],{radius:5,weight:1,fillOpacity:.65}).bindTooltip(p.name);m.on('click',()=>showMapPoint(p));return {p,m}});
  const renderList=()=>{$('#mapList').innerHTML=[...state.viewMarkers,...(state.stationsVisible?state.stationMarkers:[])].map((x,i)=>`<button type="button" data-map-index="${i}">${esc(x.p.name)}</button>`).join('');$$('[data-map-index]').forEach((b,i)=>b.addEventListener('click',()=>{const arr=[...state.viewMarkers,...(state.stationsVisible?state.stationMarkers:[])];showMapPoint(arr[i].p);arr[i].m.openTooltip()}))};renderList();
  $('#toggleStations').onclick=()=>{state.stationsVisible=!state.stationsVisible;state.stationMarkers.forEach(x=>state.stationsVisible?x.m.addTo(map):x.m.remove());$('#toggleStations').textContent=state.stationsVisible?'Hide forecast stations':'Show forecast stations';renderList()};
  $('#enableMap').onclick=()=>{map.dragging.enable();map.scrollWheelZoom.enable();$('#mapGate').hidden=true};
  $('#closeMapCard').onclick=()=>{$('#mapCard').hidden=true};
}
function renderSources(){const d=state.data;const rows=[...(d.sources||[]),...(d.sourceFailures||[]).map(f=>({provider:'Source failure',product:f.source,error:f.message}))];$('#sourceList').innerHTML=rows.map(r=>`<div class="source-row"><div><strong>${esc(r.provider||'Source')}</strong><small>${esc(r.sourceId||r.product||'')}</small></div><div>${r.error?`<strong>${esc(r.error.slice(0,90))}</strong>`:`<small>${esc(r.fetchedAt?`fetched ${fmt(r.fetchedAt,{weekday:undefined,month:undefined,day:undefined})}`:'')}</small>`}</div></div>`).join('');setText('#methodCurrent',d.representativeCurrentStation?`${d.representativeCurrentStation.id} — ${d.representativeCurrentStation.name} is the provisional nearby-current proxy used for visit timing. It is not a direct sensor at Old Sow.`:'Representative current station unavailable.')}
async function boot(){
  try{
    const res=await fetch('/api/old-sow-live',{headers:{accept:'application/json'}});const data=await res.json();if(!res.ok||data.error)throw new Error(data.detail||data.error||`HTTP ${res.status}`);
    state.data=data;state.selectedWindow=data.decision?.nextWindow||null;$('#decisionCard').setAttribute('aria-busy','false');renderHero();renderNow();modeCopy();renderWindows();renderChart();renderSources();initMap();
  }catch(e){$('#decisionCard').setAttribute('aria-busy','false');$('#statusDot').className='status-dot bad';setText('#decisionLabel','LIVE SOURCES UNAVAILABLE');setText('#sourceState','The visitor forecast could not be built');setText('#arrivalTime','Check back soon');setText('#windowTime','No timing claim is being fabricated.');setText('#expectation',e.message)}
}
$('#nextTimesButton').addEventListener('click',()=>$('#times').scrollIntoView({behavior:'smooth'}));
$$('#modeButtons button').forEach(b=>b.addEventListener('click',()=>{$$('#modeButtons button').forEach(x=>x.classList.toggle('active',x===b));state.mode=b.dataset.mode;modeCopy()}));
$$('#timeFilters button').forEach(b=>b.addEventListener('click',()=>{$$('#timeFilters button').forEach(x=>x.classList.toggle('active',x===b));state.range=b.dataset.range;renderWindows()}));
boot();