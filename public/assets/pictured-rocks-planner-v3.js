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
const MAP_DETAILS={
  minersCastle:{best:'Best fast cliff payoff',access:'Drive to the cliff area; the upper paved overlook is wheelchair accessible.',watch:'The lower overlook adds stairs and a steeper path. Pets are limited to paved trails, overlooks, and the picnic area.',source:'https://www.nps.gov/places/miners-castle.htm'},
  minersBeach:{best:'Best easy beach + cliff context',access:'Nearly a mile of beach with vehicle access at both ends; the west lot has a boardwalk to an overlook.',watch:'Beach access itself uses stairs. Elliot Falls is at the far east end if you want to extend the stop.',source:'https://www.nps.gov/places/miners-beach.htm'},
  minersFalls:{best:'Best waterfall in the west cluster',access:'About 0.6 mile each way on a rolling gravel/dirt trail.',watch:'The lower platform is 64 steps down. This is not the same low-walking stop as Miners Castle.',source:'https://www.nps.gov/places/miners-falls.htm'},
  sandPoint:{best:'Best low-friction shoreline reset',access:'Close to Munising, sheltered on the bay, with an accessible beach mat and picnic area.',watch:'Use this as a short shoreline stop, not as a substitute for the exposed Lake Superior cliff coast.',source:'https://www.nps.gov/piro/planyourvisit/beaches.htm'},
  cruise:{best:'Best first-timer view of the continuous cliff wall',access:'Departs from downtown Munising and usually takes roughly 2 to 2.5 hours.',watch:'Fixed departure + marine conditions control the day. Pets are not allowed aboard; the concessionaire offers kennels for customers.',source:'https://www.nps.gov/piro/planyourvisit/pictured-rocks-boat-cruises.htm'},
  kayak:{best:'Most immersive cliff experience',access:'Use an authorized guide unless you already have the cold-water skills and equipment for Lake Superior.',watch:'This is the most weather-sensitive choice on the map. A shoreline forecast is not a paddle go/no-go.',source:'https://www.nps.gov/piro/planyourvisit/kayak-tours.htm'},
  chapel:{best:'Best all-day land experience',access:'The full loop is about 10.5 miles and reaches Chapel Falls, Chapel Rock, Chapel Beach, cliffs, and Mosquito area.',watch:'Chapel Road is rough and the trailhead lot is limited. Arrive early. No pets on Chapel trails or beaches.',source:'https://www.nps.gov/piro/planyourvisit/hikes.htm'},
  sable:{best:'Best dune-scale east-end view',access:'A short trail from the Sable Falls area reaches the top of the Grand Sable Dunes.',watch:'Expect sand, sun, and wind. Pets are not allowed on the Grand Sable Dunes Trail.',source:'https://www.nps.gov/places/grand-sable-dunes-trail.htm'},
  sableFalls:{best:'Best compact east-end waterfall stop',access:'A short approach leads to a 75-foot cascade; continuing to Lake Superior makes the round trip about 0.4 mile.',watch:'The best view is below a 168-step staircase. Wet decking can be slippery; verify current pet rules for the exact trail segment.',source:'https://www.nps.gov/places/sable-falls.htm'},
  hurricane:{best:'Best lighthouse + shipwreck-history combo',access:'Easy beach access at Hurricane River; Au Sable Light is about 1.5 miles east along the shore when lake level permits.',watch:'That lighthouse extension turns a quick beach stop into roughly a 3-mile round trip.',source:'https://www.nps.gov/places/hurricane-river-beach.htm'},
  twelvemile:{best:'Best long, quiet beach feel',access:'Day-use access is at Twelvemile Beach Campground with a short walk from parking.',watch:'There is a long flight of stairs to the sand. Pet access applies at the campground beach, not the Beaver Basin wilderness section.',source:'https://www.nps.gov/places/twelvemile-beach.htm'},
  grandMarais:{best:'Best east-end finish',access:'Use town as the natural service/food reset after the east-side park stops.',watch:'Do not treat Grand Marais as a quick add-on to a short Munising itinerary; the value is ending an east-side day here.',source:'https://www.nps.gov/piro/planyourvisit/index.htm'}
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
  const selectedStory=$('#mapStory');
  if(selectedStory&&selectedStory.dataset.selectedPoint){selectMapPoint(selectedStory.dataset.selectedPoint,{openPopup:false});}
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
  return {radius:selected?10:7,color:'#fff',weight:3,fillColor:colors[side]||'#536568',fillOpacity:selected?1:.92};
}
function currentPlannedIds(){
  try{return routeWithLiveConstraints(engine.plan(chosen())).ids||[];}catch(e){return [];}
}
function mapPopupHtml(id){
  const p=engine.PLACES[id],d=MAP_DETAILS[id]||{};
  const state=mapFitState(id);
  const fitLabel=state.label;
  const fitClass=state.className;
  const zone=p.side==='west'?'West / Munising':p.side==='central'?'Chapel country':'East / Grand Marais';
  const allow=Math.round(p.mins/15)*15;
  return `<div class="park-popup">
    <div class="park-popup-top"><span class="park-popup-zone">${esc(zone)}</span><span class="park-popup-fit ${fitClass}">${esc(fitLabel)}</span></div>
    <h3>${esc(p.title)}</h3>
    <p class="park-popup-why">${esc(p.why)}</p>
    <div class="park-popup-meta"><span>${esc(p.effort)}</span><span>Allow ~${allow} min</span></div>
    ${d.best?`<div class="park-popup-row"><strong>Why pick it</strong><span>${esc(d.best)}</span></div>`:''}
    ${d.access?`<div class="park-popup-row"><strong>What it takes</strong><span>${esc(d.access)}</span></div>`:''}
    ${d.watch?`<div class="park-popup-row watch"><strong>Know before you go</strong><span>${esc(d.watch)}</span></div>`:''}
    ${d.source?`<a class="park-popup-link" href="${esc(d.source)}" target="_blank" rel="noopener">Official details ↗</a>`:''}
  </div>`;
}
function mapFitState(id){
  const blocked=currentAccessBlocks().has(id);
  const fit=currentPlannedIds().includes(id);
  return {blocked,fit,label:blocked?'Current access issue':fit?'Fits your current plan':'Optional for this plan',className:blocked?'blocked':fit?'fit':'optional'};
}
function mapDecisionHtml(id){
  const p=engine.PLACES[id],d=MAP_DETAILS[id]||{},state=mapFitState(id);
  const zone=p.side==='west'?'West / Munising':p.side==='central'?'Chapel country':'East / Grand Marais';
  const allow=Math.round(p.mins/15)*15;
  return `<div class="map-decision-card" data-map-detail="${esc(id)}">
    <div class="map-decision-top"><span class="map-decision-zone">${esc(zone)}</span><span class="park-popup-fit ${state.className}">${esc(state.label)}</span></div>
    <p class="map-decision-why">${esc(p.why)}</p>
    <div class="park-popup-meta"><span>${esc(p.effort)}</span><span>Allow ~${allow} min</span></div>
    ${d.best?`<div class="park-popup-row"><strong>Why pick it</strong><span>${esc(d.best)}</span></div>`:''}
    ${d.access?`<div class="park-popup-row"><strong>What it takes</strong><span>${esc(d.access)}</span></div>`:''}
    ${d.watch?`<div class="park-popup-row watch"><strong>Know before you go</strong><span>${esc(d.watch)}</span></div>`:''}
    ${d.source?`<a class="park-popup-link" href="${esc(d.source)}" target="_blank" rel="noopener">Official details ↗</a>`:''}
  </div>`;
}
function selectMapPoint(id,{openPopup=true,moveFocus=false}={}){
  const p=engine.PLACES[id],m=markers[id];
  if(!p)return;
  const title=$('#mapStoryTitle'),detail=$('#mapStoryText'),story=$('#mapStory');
  if(title)title.textContent=p.title;
  if(detail)detail.innerHTML=mapDecisionHtml(id);
  Object.entries(markers).forEach(([mid,marker])=>marker.setStyle(markerStyle(engine.PLACES[mid].side,mid===id)));
  if(m&&openPopup){
    m.setPopupContent(mapPopupHtml(id));
    m.openPopup();
  }
  if(story){
    story.dataset.selectedPoint=id;
    if(moveFocus){story.setAttribute('tabindex','-1');story.focus({preventScroll:true});}
    if(window.matchMedia&&window.matchMedia('(max-width:900px)').matches){requestAnimationFrame(()=>story.scrollIntoView({behavior:'smooth',block:'nearest'}));}
  }
}
function ensureMapPopupStyles(){
  if(document.getElementById('parkMapPopupStyles'))return;
  const st=document.createElement('style');st.id='parkMapPopupStyles';st.textContent=`
    .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 12px 32px rgba(18,38,42,.22)}
    .leaflet-popup-content{margin:14px 15px;line-height:1.35}
    .park-popup{font:500 13px/1.35 Inter,system-ui,sans-serif;color:#173236;min-width:240px}
    .park-popup-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
    .park-popup-zone{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#607579}
    .park-popup-fit{font-size:10px;font-weight:800;border-radius:999px;padding:4px 7px;background:#eef2f2;color:#516669;white-space:nowrap}
    .park-popup-fit.fit{background:#e3f2ea;color:#215c3f}.park-popup-fit.blocked{background:#f7e6df;color:#8c3d25}
    .park-popup h3{font-size:17px;line-height:1.15;margin:0 0 7px;color:#0d3339}
    .park-popup-why{margin:0 0 9px;color:#334d51}
    .park-popup-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.park-popup-meta span{background:#f1f4f3;border-radius:6px;padding:4px 6px;font-size:11px;font-weight:700}
    .park-popup-row{display:grid;grid-template-columns:82px 1fr;gap:8px;padding:8px 0;border-top:1px solid #e5ebea}.park-popup-row strong{font-size:11px;color:#546b6e}.park-popup-row span{font-size:12px}.park-popup-row.watch span{color:#5e452f}
    .park-popup-link{display:inline-block;margin-top:7px;font-weight:800;color:#0c6672;text-decoration:none}
    @media(max-width:430px){.park-popup{min-width:220px}.park-popup-row{grid-template-columns:74px 1fr}.park-popup-top{align-items:flex-start;flex-direction:column}}
  `;document.head.appendChild(st);
}
function initMap(){
  const target=$('#parkMap');
  if(!target)return;
  if(!window.L){target.innerHTML='<div class="map-fallback">Interactive map did not load. Use the official NPS map before navigating in the park.</div>';return;}
  const parkBounds=L.latLngBounds([[45.75,-87.20],[47.15,-85.20]]);
  map=L.map(target,{scrollWheelZoom:false,zoomControl:true,minZoom:8,maxBounds:parkBounds,maxBoundsViscosity:1,worldCopyJump:false}).setView([46.54,-86.31],9);
  if(!document.getElementById('parkMapLabelStyles')){const st=document.createElement('style');st.id='parkMapLabelStyles';st.textContent='.leaflet-tooltip.park-place-label{background:rgba(255,255,255,.96);border:1px solid rgba(22,39,42,.22);border-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.15);color:#173236;font:700 11px/1.2 Inter,system-ui,sans-serif;padding:6px 8px;white-space:nowrap;pointer-events:auto!important;cursor:pointer;touch-action:manipulation}.leaflet-tooltip-top.park-place-label:before{border-top-color:rgba(255,255,255,.96)}';document.head.appendChild(st);}
  ensureMapPopupStyles();
  const cartoLayer=L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88',{tileSize:256,zoomOffset:0,minZoom:8,maxNativeZoom:20,maxZoom:20,noWrap:true,bounds:parkBounds,updateWhenZooming:false,keepBuffer:3,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);
  let cartoFailures=0,fallbackAdded=false;
  cartoLayer.on('tileerror',()=>{cartoFailures++;if(fallbackAdded||cartoFailures<4)return;fallbackAdded=true;map.removeLayer(cartoLayer);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:8,maxZoom:19,noWrap:true,bounds:parkBounds,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);});
  Object.entries(engine.PLACES).forEach(([id,p])=>{
    const pt=pointFor(id);if(!pt)return;
    const m=L.circleMarker([pt.lat,pt.lon],{...markerStyle(p.side),interactive:true,bubblingMouseEvents:false}).addTo(map);
    m.bindPopup(mapPopupHtml(id),{maxWidth:340,minWidth:260,className:'park-value-popup'});
    m.bindTooltip(esc(p.title),{permanent:true,interactive:true,direction:'top',offset:[0,-8],opacity:.96,className:'park-place-label'});
    markers[id]=m;
    const activate=(opts={})=>selectMapPoint(id,opts);
    m.on('click',()=>activate({openPopup:true}));
    m.on('add',()=>{
      const el=m.getElement();
      if(el){
        el.setAttribute('tabindex','0');
        el.setAttribute('role','button');
        el.setAttribute('aria-label',`${p.title}: open planning details`);
        el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate({openPopup:true,moveFocus:false});}});
      }
    });
    const tip=m.getTooltip();
    if(tip){
      tip.on('click',()=>activate({openPopup:true}));
      tip.on('add',()=>{
        const el=tip.getElement();
        if(el){
          el.setAttribute('role','button');
          el.setAttribute('tabindex','0');
          el.setAttribute('aria-label',`${p.title}: open planning details`);
          el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate({openPopup:true});}});
        }
      });
    }
  });
  const all=Object.keys(engine.PLACES).map(pointFor).filter(Boolean).map(p=>[p.lat,p.lon]);
  if(all.length){map.fitBounds(all,{padding:[18,18],maxZoom:10});setTimeout(()=>map.invalidateSize({pan:false}),0);}
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
const visualLayer=document.createElement('script');
visualLayer.src='/assets/pictured-rocks-visual-layer.js?v=20260926-1';
visualLayer.defer=true;
document.body.appendChild(visualLayer);
})();