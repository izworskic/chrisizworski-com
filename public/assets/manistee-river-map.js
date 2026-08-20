(()=>{
'use strict';
const DATA=window.MANISTEE_FIELD_DATA;
if(!DATA)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={map:null,layers:{},hydro:null,graphs:{},selected:null,routeLayer:null,gauges:new Map()};
const colors={manistee:'#0d5c63',pine:'#2f7d32','bear-creek':'#7b5b2a','little-manistee':'#76558f',access:'#c56b28',camp:'#5d7046',gauge:'#2764a8'};

function ensureLeafletCss(){
  if(document.querySelector('link[data-manistee-leaflet]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin='anonymous';
  link.dataset.manisteeLeaflet='true';
  document.head.appendChild(link);
}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));}
function fmt(v,d=1){const n=Number(v);return Number.isFinite(n)?n.toFixed(d):'—';}
function hav(a,b){const R=3958.7613,k=Math.PI/180,p1=a[0]*k,p2=b[0]*k,dp=(b[0]-a[0])*k,dl=(b[1]-a[1])*k;const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function nodeKey(c){return `${Number(c[1]).toFixed(5)},${Number(c[0]).toFixed(5)}`;}
function waterwayName(id){return DATA.waterways.find(w=>w.id===id)?.name||id;}
function reachName(id){return DATA.reaches.find(r=>r.id===id)?.name||id;}
function badge(conf){const label={agency:'Agency coordinate','mapped-agency-site':'Agency site · mapped coordinate','community-verified':'Community coordinate'}[conf]||conf;return `<span class="trust trust-${esc(conf)}">${esc(label)}</span>`;}
function directions(p){const q=encodeURIComponent(`${p.lat},${p.lon}`);return `https://www.google.com/maps/dir/?api=1&destination=${q}`;}
function hydroId(name){return name==='Manistee River'?'manistee':name==='Pine River'?'pine':name==='Bear Creek'?'bear-creek':name==='Little Manistee River'?'little-manistee':null;}

function initMap(){
  ensureLeafletCss();
  state.map=L.map('manistee-map',{zoomControl:true,scrollWheelZoom:false,preferCanvas:true}).setView([44.42,-85.55],8);
  const topo=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:'Tiles © Esri · Hydrography © USGS'}).addTo(state.map);
  const street=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
  state.layers={mainstem:L.layerGroup().addTo(state.map),tributaries:L.layerGroup().addTo(state.map),companion:L.layerGroup(),access:L.layerGroup().addTo(state.map),gauges:L.layerGroup().addTo(state.map)};
  L.control.layers({'Topo':topo,'Street':street},{'Manistee River':state.layers.mainstem,'Tributaries':state.layers.tributaries,'Little Manistee companion':state.layers.companion,'Access & places':state.layers.access,'USGS gauges':state.layers.gauges},{collapsed:true}).addTo(state.map);
  renderPlaces();
  loadHydrography();
  loadConditions();
  setTimeout(()=>state.map.invalidateSize(),120);
}

function markerFor(p){
  const fill=p.type.includes('camp')?colors.camp:colors.access;
  const m=L.circleMarker([p.lat,p.lon],{radius:7,color:'#fff',weight:2,fillColor:fill,fillOpacity:.95});
  m.bindTooltip(p.name,{direction:'top'});
  m.on('click',()=>selectPlace(p.id,true));
  return m;
}
function currentActivities(){return $$('.activity-chip[aria-pressed="true"]').map(b=>b.dataset.activity).filter(x=>x!=='all');}
function filteredPlaces(){
  const q=($('#place-search')?.value||'').trim().toLowerCase(),active=currentActivities();
  return DATA.places.filter(p=>{
    const text=`${p.name} ${waterwayName(p.waterway)} ${reachName(p.reach)} ${p.note} ${p.activities.join(' ')}`.toLowerCase();
    return (!q||text.includes(q))&&(!active.length||active.some(a=>p.activities.includes(a)));
  });
}
function renderPlaces(){
  const visible=filteredPlaces();
  state.layers.access.clearLayers();
  visible.forEach(p=>markerFor(p).addTo(state.layers.access));
  const list=$('#place-list');
  if(list){
    list.innerHTML=visible.map(p=>`<button class="place-row" data-id="${esc(p.id)}"><span><strong>${esc(p.name)}</strong><small>${esc(waterwayName(p.waterway))} · ${esc(reachName(p.reach))}</small></span>${badge(p.confidence)}</button>`).join('')||'<p class="empty">No places match those filters.</p>';
    $$('.place-row',list).forEach(b=>b.addEventListener('click',()=>selectPlace(b.dataset.id,true)));
  }
  $('#place-count').textContent=`${visible.length} mapped places`;
}
function selectPlace(id,move=false){
  const p=DATA.places.find(x=>x.id===id);if(!p)return;
  state.selected=p;
  const detail=$('#place-detail');
  detail.innerHTML=`<div class="detail-kicker">${esc(waterwayName(p.waterway))} · ${esc(reachName(p.reach))}</div><h2>${esc(p.name)}</h2><div class="detail-badges">${badge(p.confidence)} <span class="trust">${esc(p.type.replaceAll('-',' '))}</span></div><p>${esc(p.note)}</p><div class="activity-line">${p.activities.map(a=>`<span>${esc(a)}</span>`).join('')}</div><dl><div><dt>Coordinates</dt><dd>${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</dd></div><div><dt>Coordinate source</dt><dd>${esc(p.locationSource)}</dd></div></dl><div class="action-row"><a class="btn primary" href="${directions(p)}" target="_blank" rel="noopener">Directions</a><a class="btn" href="${esc(p.source.url)}" target="_blank" rel="noopener">Source</a><a class="btn" href="${esc(DATA.sources.regulationMap.url)}" target="_blank" rel="noopener">DNR regulations</a></div><p class="micro">Fishing rules can change by reach and season. This map does not turn a point location into a legal-rule claim; verify the current Michigan DNR regulation map before fishing.</p>`;
  $$('.place-row').forEach(b=>b.classList.toggle('active',b.dataset.id===id));
  if(move){state.map.flyTo([p.lat,p.lon],Math.max(state.map.getZoom(),12),{duration:.6});if(innerWidth<900)detail.scrollIntoView({behavior:'smooth',block:'nearest'});}
  history.replaceState(null,'',`#${encodeURIComponent(id)}`);
}

function geometryLines(g){return g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];}
function buildGraph(features){
  const coordByKey=new Map(),edges=new Map();
  const edge=(a,b,w)=>{if(!edges.has(a))edges.set(a,[]);edges.get(a).push([b,w]);};
  for(const f of features)for(const line of geometryLines(f.geometry))for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],ka=nodeKey(a),kb=nodeKey(b),w=hav([a[1],a[0]],[b[1],b[0]]);
    coordByKey.set(ka,a);coordByKey.set(kb,b);
    if(w>0&&w<5){edge(ka,kb,w);edge(kb,ka,w);}
  }
  return {nodes:[...coordByKey.keys()],coordByKey,edges};
}
function nearestNode(graph,p){
  if(!graph?.nodes.length)return null;let best=null,bestMiles=Infinity;
  for(const k of graph.nodes){const c=graph.coordByKey.get(k),d=hav([p.lat,p.lon],[c[1],c[0]]);if(d<bestMiles){bestMiles=d;best=k;}}
  return {key:best,snapMiles:bestMiles};
}
function routeGraph(graph,start,end){
  const a=nearestNode(graph,start),b=nearestNode(graph,end);if(!a||!b||a.snapMiles>.8||b.snapMiles>.8)return null;
  const dist=new Map([[a.key,0]]),prev=new Map(),seen=new Set();
  while(true){
    let u=null,du=Infinity;
    for(const [k,d] of dist)if(!seen.has(k)&&d<du){u=k;du=d;}
    if(!u||u===b.key)break;seen.add(u);
    for(const [v,w] of graph.edges.get(u)||[]){const nd=du+w;if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);prev.set(v,u);}}
  }
  if(!dist.has(b.key))return null;
  const path=[];let cur=b.key;
  while(cur){const c=graph.coordByKey.get(cur);path.push([c[1],c[0]]);if(cur===a.key)break;cur=prev.get(cur);}path.reverse();
  return {distance:dist.get(b.key),path,startSnap:a.snapMiles,endSnap:b.snapMiles};
}
async function loadHydrography(){
  const status=$('#hydro-status');status.textContent='Loading USGS river geometry…';
  try{
    const r=await fetch('/api/manistee-river-hydrography');if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const payload=await r.json();state.hydro=payload;
    const grouped={manistee:[],pine:[],'bear-creek':[],'little-manistee':[]};
    for(const f of payload.features||[]){
      const id=hydroId(f.properties?.name);if(!id)continue;grouped[id].push(f);
      const layer=id==='manistee'?state.layers.mainstem:id==='little-manistee'?state.layers.companion:state.layers.tributaries;
      L.geoJSON(f,{style:{color:colors[id],weight:id==='manistee'?4:3,opacity:id==='little-manistee'?.65:.9,dashArray:id==='little-manistee'?'5 6':null}}).bindTooltip(`${f.properties.name} · USGS NHD`).addTo(layer);
    }
    for(const [id,features] of Object.entries(grouped))state.graphs[id]=buildGraph(features);
    status.textContent=`USGS NHD geometry loaded · ${payload.features.length} named flowline segments`;status.classList.add('ok');
    $('#planner-status').textContent='River-network routing ready.';
  }catch(e){
    status.textContent='USGS river geometry unavailable — access points and guide still work.';status.classList.add('warn');
    $('#planner-status').textContent='Route mileage unavailable until USGS hydrography loads.';
  }
}

function plannerOptions(){
  const opts=DATA.places.filter(p=>p.type==='access'||p.type==='access-camp').map(p=>`<option value="${esc(p.id)}">${esc(p.name)} — ${esc(waterwayName(p.waterway))}</option>`).join('');
  $('#plan-from').innerHTML='<option value="">Choose put-in</option>'+opts;
  $('#plan-to').innerHTML='<option value="">Choose takeout</option>'+opts;
}
function runPlanner(){
  const from=DATA.places.find(p=>p.id===$('#plan-from').value),to=DATA.places.find(p=>p.id===$('#plan-to').value),out=$('#plan-result');
  if(state.routeLayer){state.map.removeLayer(state.routeLayer);state.routeLayer=null;}
  if(!from||!to){out.innerHTML='<p>Choose a put-in and takeout.</p>';return;}
  if(from.id===to.id){out.innerHTML='<p>Put-in and takeout must be different.</p>';return;}
  if(from.waterway!==to.waterway){out.innerHTML='<p class="loss">Planner refuses cross-waterway routing. Pick two points on the same mapped river.</p>';return;}
  if(!['manistee','pine'].includes(from.waterway)){out.innerHTML='<p>Route planning is enabled only where a continuous source-backed NHD network is available.</p>';return;}
  const route=routeGraph(state.graphs[from.waterway],from,to);
  if(!route){out.innerHTML='<p class="loss">No trustworthy NHD route could be built between these points. No mileage was invented.</p>';return;}
  const speed=Math.max(1.5,Math.min(5,Number($('#plan-speed').value)||3)),hours=route.distance/speed,h=Math.floor(hours),m=Math.round((hours-h)*60);
  out.innerHTML=`<div class="plan-number">${fmt(route.distance,1)} mi</div><strong>about ${h?`${h} hr `:''}${m} min at ${speed.toFixed(1)} mph</strong><p>NHD river-network distance. Endpoints snap ${route.startSnap.toFixed(2)} mi and ${route.endSnap.toFixed(2)} mi to the mapped channel.</p><p class="micro">${esc(DATA.planner.disclaimer)}</p>`;
  state.routeLayer=L.polyline(route.path,{color:'#c43b2f',weight:7,opacity:.75}).addTo(state.map);state.map.fitBounds(state.routeLayer.getBounds(),{padding:[30,30]});
}

function gaugeCard(meta,g){
  if(meta.historic)return `<article class="gauge-card muted"><div><strong>${esc(meta.name)}</strong><small>Historic station · no current telemetry</small></div><a href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">USGS</a></article>`;
  return `<article class="gauge-card"><div class="gauge-head"><strong>${esc(meta.name)}</strong><span class="fresh ${g?.fresh?'yes':'no'}">${g?.fresh?'Live':'Stale / unavailable'}</span></div><div class="gauge-numbers"><span><b>${g?.discharge_cfs!=null?fmt(g.discharge_cfs,0):'—'}</b> cfs</span><span><b>${g?.water_temp_f!=null?fmt(g.water_temp_f,1):'—'}</b> °F</span><span><b>${g?.gage_height_ft!=null?fmt(g.gage_height_ft,2):'—'}</b> ft</span></div><p>${esc(g?.temperature_context?.label||'Temperature not reported')}</p><small>${g?.measured_at?`Measured ${new Date(g.measured_at).toLocaleString()}`:'No measurement returned'}</small><a href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">Open USGS station</a></article>`;
}
async function loadConditions(){
  const cards=$('#gauge-cards');cards.innerHTML='<p class="loading">Loading current USGS readings…</p>';
  try{
    const r=await fetch('/api/manistee-river-conditions');if(!r.ok)throw new Error(`HTTP ${r.status}`);const payload=await r.json();
    state.gauges=new Map(payload.gauges.map(g=>[g.id,g]));
    cards.innerHTML=DATA.gauges.map(meta=>gaugeCard(meta,state.gauges.get(meta.id))).join('');
    state.layers.gauges.clearLayers();
    for(const meta of DATA.gauges.filter(g=>!g.historic)){
      const g=state.gauges.get(meta.id),fill=g?.temperature_context?.key==='thermal-stress'?'#b32727':g?.fresh?colors.gauge:'#777';
      L.circleMarker([meta.lat,meta.lon],{radius:8,color:'#fff',weight:2,fillColor:fill,fillOpacity:.95}).bindPopup(`<strong>${esc(meta.name)}</strong><br>${g?.discharge_cfs!=null?`${fmt(g.discharge_cfs,0)} cfs`:''}${g?.water_temp_f!=null?` · ${fmt(g.water_temp_f,1)}°F`:''}<br><small>${g?.fresh?'current':'stale / unavailable'} · USGS</small>`).addTo(state.layers.gauges);
    }
    $('#conditions-source').textContent=`Updated ${new Date(payload.fetched_at).toLocaleString()} · USGS provisional data`;
  }catch(e){cards.innerHTML='<p class="loss">Live USGS readings are unavailable right now. Static access, hydrography and source links remain usable.</p>';}
}

function toggleActivity(button){
  if(button.dataset.activity==='all')$$('.activity-chip').forEach(x=>x.setAttribute('aria-pressed',x===button?'true':'false'));
  else{
    $('.activity-chip[data-activity="all"]').setAttribute('aria-pressed','false');
    button.setAttribute('aria-pressed',button.getAttribute('aria-pressed')==='true'?'false':'true');
    if(!$$('.activity-chip[aria-pressed="true"]').length)$('.activity-chip[data-activity="all"]').setAttribute('aria-pressed','true');
  }
  renderPlaces();
}
function nearestAccess(){
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(pos=>{
    const here=[pos.coords.latitude,pos.coords.longitude];let best=null,bestMiles=Infinity;
    for(const p of DATA.places){const d=hav(here,[p.lat,p.lon]);if(d<bestMiles){bestMiles=d;best=p;}}
    if(best){selectPlace(best.id,true);$('#nearest-note').textContent=`Nearest mapped place: ${best.name} · ${bestMiles.toFixed(1)} mi straight-line`;}
  },()=>{$('#nearest-note').textContent='Location was not available. You can still search or tap a place.';},{enableHighAccuracy:false,timeout:7000,maximumAge:600000});
}
function exportCsv(){
  const rows=[['name','waterway','reach','latitude','longitude','type','confidence','source_url'],...DATA.places.map(p=>[p.name,waterwayName(p.waterway),reachName(p.reach),p.lat,p.lon,p.type,p.confidence,p.source.url])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.href=url;a.download='manistee-river-field-map-points.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}
function bindUI(){
  $$('.tab-button').forEach(b=>b.addEventListener('click',()=>{$$('.tab-button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));$$('.tab-panel').forEach(p=>p.hidden=p.id!==`panel-${b.dataset.tab}`);if(b.dataset.tab==='places')setTimeout(()=>state.map.invalidateSize(),20);}));
  $('#place-search').addEventListener('input',renderPlaces);
  $$('.activity-chip').forEach(b=>b.addEventListener('click',()=>toggleActivity(b)));
  $('#plan-from').addEventListener('change',runPlanner);$('#plan-to').addEventListener('change',runPlanner);
  $('#plan-speed').addEventListener('input',()=>{$('#speed-value').textContent=`${Number($('#plan-speed').value).toFixed(1)} mph`;runPlanner();});
  $('#swap-plan').addEventListener('click',()=>{const a=$('#plan-from').value;$('#plan-from').value=$('#plan-to').value;$('#plan-to').value=a;runPlanner();});
  $('#locate-me').addEventListener('click',nearestAccess);$('#export-csv').addEventListener('click',exportCsv);$('#print-guide').addEventListener('click',()=>window.print());
}
function applyHash(){const id=decodeURIComponent(location.hash.slice(1));if(DATA.places.some(p=>p.id===id))selectPlace(id,false);}
function init(){plannerOptions();bindUI();initMap();applyHash();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.ManisteeFieldMapTest={hav,nodeKey,geometryLines,buildGraph,nearestNode,routeGraph,directions};
})();
