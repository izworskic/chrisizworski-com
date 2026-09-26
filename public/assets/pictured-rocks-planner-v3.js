(function(){
'use strict';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const form=$('#tripForm'),result=$('#result'),engine=window.PicturedRocksPlannerEngine;
let liveState=null,map=null,markers={};
const MAP_POINTS={
  minersCastle:[46.4929,-86.5489],minersBeach:[46.4776,-86.5432],minersFalls:[46.4720,-86.5847],sandPoint:[46.4422,-86.6174],
  cruise:[46.4112,-86.6571],kayak:[46.4130,-86.6530],chapel:[46.5264,-86.4391],sable:[46.6730,-86.0570],
  sableFalls:[46.6743,-85.9906],hurricane:[46.6358,-86.1383],twelvemile:[46.6320,-86.1940],grandMarais:[46.6713,-85.9850]
};
function pointFor(id){const pair=MAP_POINTS[id];return pair?{lat:pair[0],lon:pair[1]}:null;}

function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function val(name){return form.elements[name].value;}
function chosen(){return {time:val('time'),base:val('base'),walk:val('walk'),party:val('party'),priority:val('priority'),water:val('water')};}
function inferDayBreak(ids){if(ids.length<2)return null;const firstSide=engine.PLACES[ids[0]]&&engine.PLACES[ids[0]].side;for(let i=1;i<ids.length;i++){const side=engine.PLACES[ids[i]]&&engine.PLACES[ids[i]].side;if(side&&firstSide&&side!==firstSide)return i;}return Math.max(1,Math.ceil(ids.length/2));}
function sequence(ids,start='8:00 AM',twoDay=false){let minute=start==='1:00 PM'?13*60:8*60,day=1;const dayBreak=twoDay?inferDayBreak(ids):null;return ids.map((id,i)=>{if(dayBreak!==null&&i===dayBreak){day=2;minute=8*60;}const p=engine.PLACES[id],h=Math.floor(minute/60),m=minute%60,ap=h>=12?'PM':'AM',hh=((h+11)%12)+1,time=`${hh}:${String(m).padStart(2,'0')} ${ap}`;minute+=p.mins+30;return {...p,time,id,day,isDayStart:i===0||i===dayBreak};});}

function currentAccessBlocks(){
  const ids=new Set();
  if(liveState&&Array.isArray(liveState.accessNotices)){
    liveState.accessNotices.forEach(n=>{if(n.id==='sand-point-active')ids.add('sandPoint');});
  }
  if(liveState&&liveState.season&&liveState.season.id==='winter'){ids.add('cruise');ids.add('kayak');}
  return ids;
}

function routeWithLiveConstraints(plan){
  const blocked=currentAccessBlocks();
  const removed=plan.ids.filter(id=>blocked.has(id));
  const ids=plan.ids.filter(id=>!blocked.has(id));
  let liveHard='';
  if(removed.includes('sandPoint')) liveHard='Current access update: Sand Point is removed from this route while the scheduled road closure is active.';
  if(removed.some(id=>id==='cruise'||id==='kayak')) liveHard='Seasonal operating mode: the water-tour stops are removed from this route. Verify winter road and trail access before departure.';
  return {...plan,ids,liveHard};
}

function render(a,{scroll=true}={}){
  const raw=engine.plan(a),p=routeWithLiveConstraints(raw);
  $('#resultTitle').textContent=p.title;
  $('#resultSummary').textContent=p.summary;
  $('#fitBadge').textContent=a.time==='two'?'2-day fit':a.time==='day'?'full-day fit':'short-trip fit';
  $('#skipText').textContent=p.skip;
  $('#fallbackText').textContent=p.fallback;
  const hs=$('#hardStop');
  const hard=[p.hard,p.liveHard].filter(Boolean).join(' ');
  hs.hidden=!hard;hs.textContent=hard;
  const steps=sequence(p.ids,p.start,a.time==='two');
  $('#timeline').innerHTML=steps.map(s=>`<article class="stop${s.isDayStart&&a.time==='two'?' day-start':''}"><div class="stop-time">${a.time==='two'?`Day ${s.day} · ${s.time}`:s.time}</div><div><h3>${esc(s.title)}</h3><p>${esc(s.why)}</p><div class="meta">${esc(s.effort)} · allow about ${Math.round(s.mins/15)*15} min</div></div></article>`).join('');
  result.hidden=false;
  highlightMap(p.ids);
  if(scroll)result.scrollIntoView({behavior:'smooth',block:'start'});
  try{localStorage.setItem('pictured-rocks-plan-v3',JSON.stringify(a));}catch(e){}
}

function formatWeather(reading){
  const period=reading&&reading.periods&&reading.periods[0];
  if(!period)return '<span class="live-missing">Live NWS feed unavailable</span>';
  const temp=period.temperature!=null?`${period.temperature}°${esc(period.temperatureUnit||'F')}`:'—';
  const precip=period.precipProbability!=null?`${Math.round(period.precipProbability)}% precip`:'precip n/a';
  const updated=reading.updatedAt?new Date(reading.updatedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'current';
  return `<strong>${temp}</strong><span>${esc(period.shortForecast||'Forecast available')}</span><small>${esc(period.windDirection||'')} ${esc(period.windSpeed||'wind n/a')} · ${precip}</small><small>NWS · ${esc(updated)}</small>`;
}

function renderLive(data){
  liveState=data;
  const stamp=$('#liveStamp');
  if(stamp){const d=data.generatedAt?new Date(data.generatedAt):new Date();stamp.textContent=`Updated ${d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} · NWS + NPS`;}
  const dot=$('#liveDot');if(dot)dot.className='live-dot '+(data.ok?'live':'offline');
  const label=$('#liveLabel');if(label)label.textContent=data.degraded?'Current read · partial sources':'Current field read';
  const read=data.fieldRead||{};
  $('#fieldHeadline').textContent=read.label||'Use the park as three zones, not one attraction list.';
  $('#fieldDetail').textContent=read.detail||'Check current NPS access and weather before leaving reliable service.';
  const board=$('#today');if(board)board.dataset.tone=read.tone||'mixed';
  $('#seasonLabel').textContent=data.season&&data.season.label||'Seasonal context';
  $('#seasonNote').textContent=data.season&&data.season.note||'Verify seasonal access before departure.';
  $('#westWeather').innerHTML=formatWeather(data.weather&&data.weather.west);
  $('#eastWeather').innerHTML=formatWeather(data.weather&&data.weather.east);
  renderNotices(data.accessNotices||[],data.alerts||[]);
  updateModeStatus(data);
  if(result&&!result.hidden)render(chosen(),{scroll:false});
}

function renderNotices(access,alerts){
  const list=$('#noticeList');
  const items=[];
  alerts.forEach(a=>items.push(`<article class="notice weather"><div class="notice-kicker">NWS alert</div><h3>${esc(a.event||'Weather alert')}</h3><p>${esc(a.headline||'Open the official alert before committing to exposed shoreline, water, or a long trail.')}</p>${a.source?`<a href="${esc(a.source)}" target="_blank" rel="noopener">Official alert ↗</a>`:''}</article>`));
  access.forEach(n=>items.push(`<article class="notice ${esc(n.level||'info')}"><div class="notice-kicker">Park access</div><h3>${esc(n.title)}</h3><p>${esc(n.detail)}</p><a href="${esc(n.source)}" target="_blank" rel="noopener">NPS source · ${esc(n.sourceDate)} ↗</a></article>`));
  list.innerHTML=items.length?items.join(''):'<article class="notice info"><div class="notice-kicker">Park access</div><h3>No additional planner notice loaded</h3><p>Still open the NPS current-conditions page before departure; this tool does not replace official closures.</p></article>';
}

function updateModeStatus(data){
  const read=data.fieldRead||{};
  const landGood=read.tone==='good';
  const season=data.season&&data.season.id;
  const statuses={
    cruise:season==='winter'?'Seasonally out of the plan':'Marine forecast + schedule decide',
    kayak:season==='winter'?'Seasonally out of the plan':'Guide + marine forecast decide',
    hike:landGood?'Strong land option today':'Weather-aware land option',
    drive:'Most resilient to changing conditions'
  };
  Object.entries(statuses).forEach(([k,v])=>{const el=$(`[data-mode-status="${k}"]`);if(el)el.textContent=v;});
}

async function loadLive(){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);
  try{
    const r=await fetch('/api/pictured-rocks-live',{cache:'no-store',signal:controller.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    renderLive(await r.json());
  }catch(e){
    $('#liveLabel').textContent='Current feed unavailable';
    $('#liveDot').className='live-dot offline';
    $('#fieldHeadline').textContent='Build the trip, then verify the live check.';
    $('#fieldDetail').textContent='The live weather feed did not load. The planner still works, but use the NPS current-conditions page and marine forecast before committing.';
    $('#westWeather').innerHTML='<span class="live-missing">NWS feed unavailable</span>';
    $('#eastWeather').innerHTML='<span class="live-missing">NWS feed unavailable</span>';
    renderNotices([],[]);
  }finally{clearTimeout(timer);}
}

function markerStyle(side,selected=false){
  const colors={west:'#0c6672',central:'#9b6a2f',east:'#486844'};
  return {radius:selected?9:6,color:'#fff',weight:2,fillColor:colors[side]||'#536568',fillOpacity:selected?1:.86};
}

function initMap(){
  const target=$('#parkMap');
  if(!target)return;
  if(!window.L){target.innerHTML='<div class="map-fallback">Interactive map did not load. Use the official NPS map before navigating in the park.</div>';return;}
  map=L.map(target,{scrollWheelZoom:false,zoomControl:true}).setView([46.54,-86.31],9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  Object.entries(engine.PLACES).forEach(([id,p])=>{
    const pt=pointFor(id);if(!pt)return;
    const m=L.circleMarker([pt.lat,pt.lon],markerStyle(p.side)).addTo(map);
    m.bindPopup(`<strong>${esc(p.title)}</strong><br>${esc(p.effort)}<br><span>${esc(p.why)}</span>`);
    markers[id]=m;
  });
  const all=Object.keys(engine.PLACES).map(pointFor).filter(Boolean).map(p=>[p.lat,p.lon]);
  if(all.length)map.fitBounds(all,{padding:[18,18]});
  $$('#mapZones [data-zone]').forEach(btn=>btn.addEventListener('click',()=>focusZone(btn.dataset.zone)));
}

function focusZone(zone){
  if(!map)return;
  const ids=Object.entries(engine.PLACES).filter(([,p])=>p.side===zone).map(([id])=>id);
  const pts=ids.map(pointFor).filter(Boolean).map(p=>[p.lat,p.lon]);
  if(pts.length)map.fitBounds(pts,{padding:[35,35],maxZoom:11});
  const info={west:['West end','Munising, Miners Castle, Miners Beach and most scheduled water departures.'],central:['Chapel country','A major hiking commitment with limited parking—not a quick stop.'],east:['East end','Grand Sable Dunes, Hurricane River, Twelvemile Beach and Grand Marais.']}[zone];
  if(info){$('#mapStoryTitle').textContent=info[0];$('#mapStoryText').textContent=info[1];}
}

function highlightMap(ids){
  Object.entries(markers).forEach(([id,m])=>m.setStyle(markerStyle(engine.PLACES[id].side,ids.includes(id))));
  if(!map)return;
  const pts=ids.map(pointFor).filter(Boolean).map(p=>[p.lat,p.lon]);
  if(pts.length)map.fitBounds(pts,{padding:[38,38],maxZoom:11});
}

form.addEventListener('submit',e=>{e.preventDefault();render(chosen());});
$('#resetBtn').addEventListener('click',()=>{form.reset();result.hidden=true;highlightMap([]);try{localStorage.removeItem('pictured-rocks-plan-v3');}catch(e){}});
$('#printBtn').addEventListener('click',()=>window.print());
$$('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;if(p==='one-day')form.elements.time.value='day';if(p==='dog'){form.elements.time.value='day';form.elements.party.value='dog';form.elements.water.value='land';}if(p==='land'){form.elements.time.value='day';form.elements.water.value='land';}if(p==='two')form.elements.time.value='two';render(chosen());}));
$$('[data-trip-shape]').forEach(btn=>btn.addEventListener('click',()=>{
  const mode=btn.dataset.tripShape;
  if(mode==='cruise'){form.elements.time.value='day';form.elements.water.value='cruise';form.elements.priority.value='cliffs';}
  if(mode==='kayak'){form.elements.time.value='day';form.elements.water.value='kayak';form.elements.walk.value='moderate';form.elements.priority.value='cliffs';}
  if(mode==='hike'){form.elements.time.value='day';form.elements.water.value='land';form.elements.walk.value='long';form.elements.priority.value='hike';}
  if(mode==='drive'){form.elements.time.value='half';form.elements.water.value='land';form.elements.walk.value='easy';form.elements.priority.value='family';}
  render(chosen());
}));
$('#refreshLive').addEventListener('click',()=>loadLive());
try{const saved=JSON.parse(localStorage.getItem('pictured-rocks-plan-v3')||localStorage.getItem('pictured-rocks-plan-v2')||'null');if(saved){Object.entries(saved).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v;});}}catch(e){}
window.addEventListener('load',()=>{initMap();loadLive();});
})();