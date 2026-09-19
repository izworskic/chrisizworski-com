const $=(s)=>document.querySelector(s);const $$=(s)=>[...document.querySelectorAll(s)];
const state={data:null,range:'today',selected:null,map:null,viewMarkers:[],stationMarkers:[],stationsVisible:false};
const DEER_ZONE='America/Moncton', EASTPORT_ZONE='America/New_York';
const esc=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dt=(t,z=DEER_ZONE,opts={})=>new Intl.DateTimeFormat('en-US',{timeZone:z,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...opts}).format(new Date(t));
const tm=(t,z=DEER_ZONE)=>new Intl.DateTimeFormat('en-US',{timeZone:z,hour:'numeric',minute:'2-digit'}).format(new Date(t));
const dateKey=(t,z=DEER_ZONE)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(t));const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`};
const addMin=(t,n)=>new Date(new Date(t).getTime()+n*60000);
const setText=(id,v)=>{const e=$(id);if(e)e.textContent=v??'—'};
const LETETE_DEPARTURES=['06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:30','21:30','22:30'];
const hmToMinutes=(s)=>{const [h,m]=s.split(':').map(Number);return h*60+m};
const clock12=(s)=>{const [h,m]=s.split(':').map(Number),hh=((h+11)%12)+1;return `${hh}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`};
function localParts(t,z=DEER_ZONE){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t));
  return Object.fromEntries(p.map(x=>[x.type,x.value]));
}
function ferryPlanForArrival(arrival){
  const p=localParts(arrival,DEER_ZONE);
  const arrivalMinutes=Number(p.hour)*60+Number(p.minute);
  const isSunday=p.weekday==='Sun';
  const departures=LETETE_DEPARTURES.filter(t=>!(isSunday&&(t==='08:30'||t==='10:00')));
  const latestComfortable=arrivalMinutes-60;
  const eligible=departures.filter(t=>hmToMinutes(t)<=latestComfortable);
  const target=eligible.at(-1)||null;
  const next=target?departures[departures.indexOf(target)+1]||null:departures[0]||null;
  return {target,next,isSunday,date:`${p.year}-${p.month}-${p.day}`,arrivalMinutes};
}
function renderFerryPlan(){
  const w=selectedWindow();if(!w)return;
  const arrive=addMin(w.start,-30);
  const plan=ferryPlanForArrival(arrive);
  if(!plan.target){
    setText('#targetFerry','Come over the night before');
    setText('#targetFerryDetail','No same-day Letete departure leaves a full one-hour ferry + island-road buffer before this early viewing window.');
    setText('#ferryPlanSummary','For this early recommendation, camping on Deer Island the night before is the cleanest plan.');
    return;
  }
  const nowP=localParts(new Date(),DEER_ZONE);
  const sameDay=`${nowP.year}-${nowP.month}-${nowP.day}`===plan.date;
  const nowMinutes=Number(nowP.hour)*60+Number(nowP.minute);
  const passed=sameDay&&hmToMinutes(plan.target)<=nowMinutes;
  if(passed){
    setText('#targetFerry',`${clock12(plan.target)} has passed`);
    setText('#targetFerryDetail','If you are still on the mainland, use a later Old Sow viewing window instead of rushing the ferry connection.');
    setText('#ferryPlanSummary','This recommended window is no longer a comfortable same-day connection from Letete.');
    return;
  }
  setText('#targetFerry',`Target the ${clock12(plan.target)} ferry from Letete`);
  setText('#targetFerryDetail',`Free, year-round · Atlantic Time${plan.isSunday?' · Sunday maintenance schedule applied':''}`);
  setText('#ferryPlanSummary',`To be at Deer Island Point by ${tm(arrive,DEER_ZONE)}, the planner leaves about an hour between the Letete departure and your recommended arrival. ${plan.next?`The next scheduled ferry is ${clock12(plan.next)}, but it cuts into that buffer.`:''}`);
}
function strength(w){const p=Number(w?.currentPercentile);if(!Number.isFinite(p))return 'Current strength unavailable';if(p>=85)return 'well above average';if(p>=65)return 'above average';if(p>=35)return 'near average';return 'below average'}
function weather(w){const c=w?.weather?.visibility?.classification;if(c==='impaired')return 'NWS flags poor visibility for this period.';if(c==='possibly_impaired')return 'NWS mentions weather that could reduce visibility.';if(c==='clear')return 'NWS indicates good visibility.';if(c==='not_stated')return 'NWS does not currently flag fog, mist or poor visibility.';return 'Weather detail is not available for this window yet.'}
function highTide(w){const h=w?.nearestEastportHigh;if(!h||!Number.isFinite(Number(h.offsetMinutesFromPeak)))return 'High-tide cross-check unavailable';const n=Math.abs(Math.round(Number(h.offsetMinutesFromPeak)));return `${n} min ${Number(h.offsetMinutesFromPeak)>=0?'before':'after'} Eastport high tide`}
function expectation(w){const s=strength(w);if(s==='well above average')return 'This is one of the stronger predicted flood-current cycles in the forecast set. Expect more energetic water, with broad rotation, boils and strong seams possible.';if(s==='above average')return 'This is a stronger-than-average predicted flood-current cycle, making it a solid window for visibly active water.';if(s==='near average')return 'This is a normal predicted flood-current cycle. It is still a valid viewing window, but not an unusually energetic one.';if(s==='below average')return 'This is a below-average predicted flood-current cycle. The timing is still valid, but stronger water is likely in other upcoming cycles.';return 'Current strength could not be compared with the rest of the forecast set.'}
function selectedWindow(){return state.selected||state.data?.decision?.nextWindow||null}
function renderAnswer(){
  const d=state.data,w=selectedWindow();if(!d||!w)return;
  const recommended=w.id===d.decision?.nextWindow?.id;
  const now=Date.now(),start=new Date(w.start).getTime(),end=new Date(w.end).getTime();
  let kicker=recommended?'Best next viewing window':'Selected viewing window';
  if(recommended&&now>=start&&now<=end)kicker='Viewing window is open now';
  else if(recommended&&start-now<6*3600000)kicker='Best upcoming window today';
  setText('#answerKicker',kicker);
  const arrive=addMin(w.start,-30);
  setText('#answerHeading',`Be at Deer Island Point by ${dt(arrive,DEER_ZONE,{weekday:undefined,month:undefined,day:undefined})}`);
  setText('#answerSummary',`Recommended viewing period: ${dt(w.start,DEER_ZONE)} to ${tm(w.end,DEER_ZONE)}. Eastport clock at arrival: ${dt(arrive,EASTPORT_ZONE,{weekday:undefined,month:undefined,day:undefined})}.`);
  setText('#arriveBy',tm(arrive,DEER_ZONE));
  setText('#bestWater',tm(w.peak,DEER_ZONE));
  setText('#stayThrough',tm(w.end,DEER_ZONE));
  const relativeStrength=strength(w);
  setText('#tripOutlook',relativeStrength==='below average'?'Good timing, calmer cycle':relativeStrength==='near average'?'Good timing, normal cycle':relativeStrength==='above average'?'Good timing, stronger cycle':relativeStrength==='well above average'?'Strong viewing opportunity':'Viewing window available');
  setText('#tripConditions',`Predicted flood current is ${relativeStrength}. ${weather(w)}`);
  setText('#answerWhy',`${expectation(w)} ${highTide(w)}.`);
  renderFerryPlan();
}
function renderNow(){
  const p=state.data?.decision?.phase||{};const x=String(p.phase||'').toLowerCase();let h='Current phase could not be determined.';
  if(x.includes('flood'))h='Flood current is underway or building now.';
  if(x.includes('ebb'))h='This is not the prime Old Sow viewing phase.';
  if(x.includes('slack')&&x.includes('flood'))h='The next flood current is beginning to build.';
  if(x.includes('slack')&&x.includes('ebb'))h='The flood window has faded toward ebb.';
  setText('#nowHeadline',h);setText('#nowDetail',p.detail||'Derived from nearby NOAA current predictions, not a direct Old Sow sensor.');
}
function renderEngine(){
  const d=state.data,rec=d?.decision?.jevRecommendation,mode=d?.decision?.recommendationEngine;
  if(mode==='shared-harness-jev'){
    setText('#engineStatus',`Recommendation engine: JEV ranked the fixed NOAA-derived candidate windows for visitor practicality. The selected window is ${d.decision.nextWindow?.id?'the JEV choice':'the deterministic fallback'}; JEV did not create or alter any tide/current time.`);
  }else{
    setText('#engineStatus',`Recommendation engine: deterministic NOAA ranking. JEV did not supply an accepted candidate recommendation${rec?.reason?` (${rec.reason})`:''}.`);
  }
}
function rowsForRange(){
  const all=(state.data?.windows||[]).filter(w=>new Date(w.end).getTime()>=Date.now()-60000);
  const today=dateKey(new Date()),tomorrow=dateKey(addMin(new Date(),1440));
  if(state.range==='today')return all.filter(w=>dateKey(w.peak)===today);
  if(state.range==='tomorrow')return all.filter(w=>dateKey(w.peak)===tomorrow);
  const cutoff=Date.now()+7*86400000;return all.filter(w=>new Date(w.start).getTime()<=cutoff);
}
function renderWindows(){
  const host=$('#windowList'),recommended=state.data?.decision?.nextWindow?.id;let rows=rowsForRange().slice(0,state.range==='7'?10:5);
  if(!rows.length){host.innerHTML='<div class="empty">No matching future flood-current window is available in this range.</div>';return}
  rows.sort((a,b)=>new Date(a.start)-new Date(b.start));
  host.innerHTML=rows.map(w=>`<article class="window-row ${w.id===recommended?'best':''}">
    <div><span>${w.id===recommended?'Recommended':'Viewing window'}</span><strong class="window-time">${esc(dt(w.start,DEER_ZONE,{timeZoneName:undefined}))}</strong><small>Arrive by ${esc(tm(addMin(w.start,-30),DEER_ZONE))} · stay through ${esc(tm(w.end,DEER_ZONE))}</small></div>
    <div><span>Water strength</span><strong>${esc(strength(w))}</strong><small>${Number.isFinite(Number(w.predictedMaxFloodKnots))?Number(w.predictedMaxFloodKnots).toFixed(1)+' kt nearby prediction':'Unavailable'}</small></div>
    <div><span>Visibility</span><strong>${esc(weather(w))}</strong><small>${esc(highTide(w))}</small></div>
    <button type="button" data-window-id="${esc(w.id)}">Use this time</button>
  </article>`).join('');
  $$('[data-window-id]').forEach(b=>b.addEventListener('click',()=>{state.selected=(state.data.windows||[]).find(w=>w.id===b.dataset.windowId)||null;renderAnswer();document.querySelector('#old-sow-answer').scrollIntoView({behavior:'smooth'});}));
}
function linePath(points,min,max,yMin,yMax,h=245,top=28){if(!points.length)return '';const span=max-min||1,ys=yMax-yMin||1;return points.map((p,i)=>{const x=55+((new Date(p.time)-min)/span)*790,y=top+h-((p.value-yMin)/ys)*h;return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ')}
function renderChart(){
  const d=state.data,svg=$('#pulseChart');if(!svg)return;
  const tide=(d?.chart?.tide||[]).map(r=>({time:r.time,value:Number(r.value)})).filter(r=>Number.isFinite(r.value));
  const current=(d?.chart?.current||[]).map(r=>({time:r.time,value:Number(r.velocity),type:r.type})).filter(r=>Number.isFinite(r.value));
  const all=[...tide,...current];if(!all.length){svg.innerHTML='<text x="40" y="70">Tide/current chart unavailable.</text>';return}
  const min=Math.min(...all.map(p=>new Date(p.time).getTime())),max=Math.max(...all.map(p=>new Date(p.time).getTime()));
  const tMin=Math.min(...tide.map(p=>p.value),0),tMax=Math.max(...tide.map(p=>p.value),1),cMin=Math.min(...current.map(p=>p.value),-1),cMax=Math.max(...current.map(p=>p.value),1);
  const currentName=d?.chart?.currentStation?`${d.chart.currentStation.id} · ${d.chart.currentStation.name}`:'Nearby current';setText('#chartCurrentLegend',`${currentName} · + flood / − ebb`);
  let html='';for(let i=0;i<5;i++){const y=28+i*61.25;html+=`<line class="grid-line" x1="55" y1="${y}" x2="845" y2="${y}"/>`}
  for(const b of d.chart.daylight||[]){if(!b.sunrise||!b.sunset)continue;const a=Math.max(min,new Date(b.sunrise).getTime()),z=Math.min(max,new Date(b.sunset).getTime());if(z>a){const x=55+((a-min)/(max-min))*790,w=((z-a)/(max-min))*790;html+=`<rect class="day-band" x="${x}" y="28" width="${w}" height="245"/>`}}
  for(let i=0;i<current.length-1;i++){const a=current[i],b=current[i+1];if(!['flood','ebb'].includes(a.type))continue;const ta=new Date(a.time).getTime(),tb=new Date(b.time).getTime();if(tb<=ta)continue;const x=55+((ta-min)/(max-min))*790,w=((tb-ta)/(max-min))*790;html+=`<rect class="${a.type==='flood'?'flood-band':'ebb-band'}" x="${x}" y="28" width="${w}" height="245"/>`}
  html+=`<path class="tide-line" d="${linePath(tide,min,max,tMin,tMax)}"/><path class="current-line" d="${linePath(current,min,max,cMin,cMax)}"/><line id="chartMarker" class="marker-line" x1="55" y1="28" x2="55" y2="273"/><text class="axis-label" x="8" y="20">Tide ft</text><text class="axis-label" x="802" y="20">Current kt</text>`;svg.innerHTML=html;
  const scrub=$('#timeScrubber');scrub.oninput=()=>{const ratio=Number(scrub.value)/1000,t=min+ratio*(max-min),x=55+ratio*790;const m=$('#chartMarker');m?.setAttribute('x1',x);m?.setAttribute('x2',x);const near=arr=>arr.reduce((best,p)=>!best||Math.abs(new Date(p.time)-t)<Math.abs(new Date(best.time)-t)?p:best,null);const a=near(tide),b=near(current);setText('#scrubReadout',`${dt(t,DEER_ZONE)} · Eastport tide ${a?.value?.toFixed(1)??'—'} ft · nearby current ${b?.value?.toFixed(1)??'—'} kt ${b?.type?`(${b.type})`:''}`)};scrub.dispatchEvent(new Event('input'));
}
function renderSources(){
  const d=state.data;setText('#methodCurrent',d?.representativeCurrentStation?`Primary nearby current proxy: ${d.representativeCurrentStation.id} — ${d.representativeCurrentStation.name}. It is a NOAA prediction station used for timing, not a current sensor at Old Sow.`:'No representative current station is available.');
  const rows=[...(d?.sources||[]),...(d?.sourceFailures||[]).map(f=>({provider:'Source failure',product:f.source,error:f.message}))];
  $('#sourceList').innerHTML=rows.map(r=>`<div class="source-row"><div><strong>${esc(r.provider||'Source')}</strong><small>${esc(r.sourceId||r.product||'')}</small></div><div>${r.error?`<strong>${esc(String(r.error).slice(0,90))}</strong>`:`<small>${r.fetchedAt?esc('fetched '+dt(r.fetchedAt,DEER_ZONE,{weekday:undefined,month:undefined,day:undefined})):''}</small>`}</div></div>`).join('');
}
function initMap(){
  const d=state.data;if(!window.L||!d)return;const map=L.map('map',{scrollWheelZoom:false,dragging:false,tap:false}).setView([44.9239,-66.9866],13);state.map=map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const views=(d.viewpoints||[]).map(p=>({...p,kind:'viewpoint'})),stations=(d.stations||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>({...p,kind:'station'}));
  state.viewMarkers=views.map(p=>{const m=L.circleMarker([p.lat,p.lon],{radius:p.id==='deer-point'?9:6,weight:2,fillOpacity:.85}).addTo(map).bindPopup(`<strong>${esc(p.name)}</strong><br>${esc(p.note||'Land viewpoint.')}`);return {p,m}});
  state.stationMarkers=stations.map(p=>{const m=L.circleMarker([p.lat,p.lon],{radius:5,weight:1,fillOpacity:.65}).bindPopup(`<strong>${esc(p.name)}</strong><br>NOAA prediction reference; not a vortex location.`);return {p,m}});
  const list=()=>{const arr=[...state.viewMarkers,...(state.stationsVisible?state.stationMarkers:[])];$('#mapList').innerHTML=arr.map((x,i)=>`<button type="button" data-map-index="${i}">${esc(x.p.name)}</button>`).join('');$$('[data-map-index]').forEach((b,i)=>b.addEventListener('click',()=>{arr[i].m.openPopup();map.panTo(arr[i].m.getLatLng())}))};list();
  $('#toggleStations').onclick=()=>{state.stationsVisible=!state.stationsVisible;state.stationMarkers.forEach(x=>state.stationsVisible?x.m.addTo(map):x.m.remove());$('#toggleStations').textContent=state.stationsVisible?'Hide NOAA forecast stations':'Show NOAA forecast stations';list()};
  $('#enableMap').onclick=()=>{map.dragging.enable();map.scrollWheelZoom.enable();$('#enableMap').hidden=true};
}
function renderLiveState(){
  const mode=state.data?.operational?.dataState||'unknown',dot=$('#liveDot');dot.className='live-dot '+(mode==='fresh'||mode==='cached-fresh'?'good':mode==='stale-last-known'?'bad':'');
  setText('#liveStatus',mode==='fresh'?'NOAA/NWS sources refreshed · forecast ready':mode==='cached-fresh'?'Fresh cached forecast':mode==='stale-last-known'?'Using last-known forecast data':'Forecast source status uncertain');
}
async function boot(){
  try{
    const res=await fetch('/api/old-sow-live',{headers:{accept:'application/json'}}),data=await res.json();if(!res.ok||data.error)throw new Error(data.detail||data.error||`HTTP ${res.status}`);
    state.data=data;state.selected=null;renderLiveState();renderAnswer();renderNow();renderEngine();renderWindows();renderChart();renderSources();initMap();
  }catch(e){
    $('#liveDot').className='live-dot bad';setText('#liveStatus','Live forecast unavailable');setText('#answerHeading','Live source bundle is unavailable.');setText('#answerSummary','No viewing time is being fabricated.');setText('#answerWhy',e.message);
  }
}
$$('#rangeTabs button').forEach(b=>b.addEventListener('click',()=>{$$('#rangeTabs button').forEach(x=>x.classList.toggle('active',x===b));state.range=b.dataset.range;renderWindows()}));
boot();