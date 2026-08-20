(()=>{
'use strict';
const DATA=window.MANISTEE_FIELD_DATA;
if(!DATA)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={map:null,layers:{},hydro:null,graphs:{},selected:null,routeLayer:null,gauges:new Map(),conditionsPromise:null};
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
function reachSummary(id){return DATA.reaches.find(r=>r.id===id)?.summary||'';}
function badge(conf){const label={agency:'Agency coordinate','mapped-agency-site':'Agency site · mapped coordinate','community-verified':'Community coordinate'}[conf]||conf;return `<span class="trust trust-${esc(conf)}">${esc(label)}</span>`;}
function confidenceLabel(conf){return {agency:'Agency coordinate','mapped-agency-site':'Agency facility · mapped coordinate','community-verified':'Community-verified coordinate'}[conf]||conf;}
function typeLabel(type){return String(type||'access').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function activityLabel(activity){return String(activity||'').replace(/\b\w/g,c=>c.toUpperCase());}
function directions(p){const q=encodeURIComponent(`${p.lat},${p.lon}`);return `https://www.google.com/maps/dir/?api=1&destination=${q}`;}
function pointMap(latlng){const q=encodeURIComponent(`${latlng.lat},${latlng.lng}`);return `https://www.google.com/maps/search/?api=1&query=${q}`;}
function hydroId(name){return name==='Manistee River'?'manistee':name==='Pine River'?'pine':name==='Bear Creek'?'bear-creek':name==='Little Manistee River'?'little-manistee':null;}
function accessPopupHtml(p){
  const activities=p.activities.map(a=>`<span class="mrp-chip">${esc(activityLabel(a))}</span>`).join('');
  return `<article class="mrp-card" data-manistee-popup="${esc(p.id)}">
    <div class="mrp-kicker">${esc(typeLabel(p.type))} · ${esc(waterwayName(p.waterway))}</div>
    <h3>${esc(p.name)}</h3>
    <div class="mrp-reach">${esc(reachName(p.reach))}</div>
    <div class="mrp-chips">${activities}</div>
    <p class="mrp-note">${esc(p.note)}</p>
    <div class="mrp-facts">
      <div><span>Reach</span><b>${esc(reachName(p.reach))}</b><small>${esc(reachSummary(p.reach))}</small></div>
      <div><span>Location confidence</span><b>${esc(confidenceLabel(p.confidence))}</b><small>${esc(p.locationSource||'Source not listed')}</small></div>
    </div>
    <section class="mrp-live" data-popup-live="${esc(p.id)}"><div class="mrp-loading">Loading nearest USGS gauge and NWS weather…</div></section>
    <div class="mrp-actions">
      <a class="mrp-nav" href="${directions(p)}" target="_blank" rel="noopener">Navigate here</a>
      <a href="${esc(p.source.url)}" target="_blank" rel="noopener">Official / location source</a>
      ${p.activities.includes('fish')?`<a href="${esc(DATA.sources.regulationMap.url)}" target="_blank" rel="noopener">DNR fishing map</a>`:''}
    </div>
    <p class="mrp-source">${esc(p.source.name||p.locationSource||'Mapped source')} · exact point ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</p>
  </article>`;
}
function gaugePopupHtml(meta,g){
  const stats=g?.seasonal_stats||{},fc=g?.flow_context||{};
  const freshness=g?.measured_at?`${g?.fresh?'Current':'Stale / verify'} · ${new Date(g.measured_at).toLocaleString()}`:'No recent timestamp returned';
  const optional=[g?.turbidity_fnu!=null?`<li><span>Turbidity</span><b>${fmt(g.turbidity_fnu,1)} FNU</b></li>`:'',g?.dissolved_oxygen_mgl!=null?`<li><span>Dissolved oxygen</span><b>${fmt(g.dissolved_oxygen_mgl,1)} mg/L</b></li>`:''].join('');
  return `<article class="mrp-card mrp-gauge">
    <div class="mrp-kicker">USGS river conditions · ${esc(waterwayName(meta.waterway))}</div>
    <h3>${esc(meta.name)}</h3>
    <div class="mrp-live-badge ${g?.fresh?'yes':'no'}">${g?.fresh?'Live / recent':'Stale / unavailable'}</div>
    <ul class="mrp-stat-list">
      <li><span>Flow</span><b>${g?.discharge_cfs!=null?`${fmt(g.discharge_cfs,0)} cfs`:'Not reported'}</b><small>${fc.percent_of_median!=null?`${fc.percent_of_median}% of seasonal median`:esc(fc.label||'Seasonal comparison unavailable')}</small></li>
      <li><span>Seasonal median</span><b>${stats.p50!=null?`${fmt(stats.p50,0)} cfs`:'Unavailable'}</b><small>USGS daily p50 for this calendar date</small></li>
      <li><span>Water</span><b>${g?.water_temp_f!=null?`${fmt(g.water_temp_f,1)}°F`:'Not reported'}</b><small>${esc(g?.temperature_context?.label||'Temperature context unavailable')}</small></li>
      <li><span>Gage height</span><b>${g?.gage_height_ft!=null?`${fmt(g.gage_height_ft,2)} ft`:'Not reported'}</b></li>
      ${optional}
    </ul>
    <p class="mrp-source">${esc(freshness)} · provisional USGS data</p>
    <div class="mrp-actions"><a class="mrp-nav" href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">Open USGS station</a></div>
  </article>`;
}
function waterwayKind(id){
  const kind=DATA.waterways.find(w=>w.id===id)?.kind||'river';
  return kind==='mainstem'?'Mainstem':kind==='tributary'?'Tributary':kind==='companion'?'Companion river':typeLabel(kind);
}
function nearestRiverAccess(id,latlng){
  let best=null,bestMiles=Infinity;
  for(const p of DATA.places.filter(p=>p.waterway===id)){
    const d=hav([latlng.lat,latlng.lng],[p.lat,p.lon]);
    if(d<bestMiles){best=p;bestMiles=d;}
  }
  return best?{place:best,distance:bestMiles}:null;
}
function nearestRiverGauge(id,latlng){
  let best=null,bestMiles=Infinity;
  for(const meta of DATA.gauges.filter(g=>g.waterway===id&&!g.historic)){
    const d=hav([latlng.lat,latlng.lng],[meta.lat,meta.lon]);
    if(d<bestMiles){best=meta;bestMiles=d;}
  }
  return best?{meta:best,reading:state.gauges.get(best.id)||null,distance:bestMiles}:null;
}
function riverPopupHtml(id,name,latlng){
  const water=DATA.waterways.find(w=>w.id===id)||{};
  const access=nearestRiverAccess(id,latlng),gauge=nearestRiverGauge(id,latlng),g=gauge?.reading||null;
  const stats=g?.seasonal_stats||{},fc=g?.flow_context||{};
  const context=water.note||`${waterwayKind(id)} in the mapped Manistee River field system. The colored line is source-backed USGS hydrography, not a road or public-access claim.`;
  const freshness=g?.measured_at?`${g.fresh?'Current':'Stale / verify'} · measured ${new Date(g.measured_at).toLocaleString()}`:'Live reading not loaded yet';
  const gaugeRows=gauge?`
      <li><span>Nearest active gauge</span><b>${esc(gauge.meta.name)}</b><small>${fmt(gauge.distance,1)} mi straight-line from this river point</small></li>
      <li><span>Flow</span><b>${g?.discharge_cfs!=null?`${fmt(g.discharge_cfs,0)} cfs`:'Loading / unavailable'}</b><small>${fc.percent_of_median!=null?`${fc.percent_of_median}% of seasonal median${stats.p50!=null?` · median ${fmt(stats.p50,0)} cfs`:''}`:esc(fc.label||'Seasonal comparison loads with the USGS reading')}</small></li>
      <li><span>Water / stage</span><b>${g?.water_temp_f!=null?`${fmt(g.water_temp_f,1)}°F`:'Temp not reported'} · ${g?.gage_height_ft!=null?`${fmt(g.gage_height_ft,2)} ft`:'stage not reported'}</b><small>${esc(g?.temperature_context?.label||freshness)}</small></li>
      <li><span>Freshness</span><b>${esc(g?.fresh?'Live / recent':g?'Stale / verify':'Loading')}</b><small>${esc(freshness)}</small></li>`:
      `<li><span>Live river gauge</span><b>No active gauge mapped to this waterway</b><small>Use the river/source links below for broader context.</small></li>`;
  const accessRow=access?`<li><span>Nearest mapped access</span><b>${esc(access.place.name)}</b><small>${fmt(access.distance,1)} mi straight-line · ${esc(reachName(access.place.reach))}</small></li>`:
    `<li><span>Mapped access</span><b>No access point cataloged on this waterway</b></li>`;
  return `<article class="mrp-card mrp-river" data-manistee-river-popup="${esc(id)}">
    <div class="mrp-kicker">${esc(waterwayKind(id))} · river point</div>
    <h3>${esc(name)}</h3>
    <p class="mrp-note">${esc(context)}</p>
    <ul class="mrp-stat-list">
      ${gaugeRows}
      ${accessRow}
    </ul>
    <div class="mrp-actions">
      <a class="mrp-nav" href="${pointMap(latlng)}" target="_blank" rel="noopener">Map this river point</a>
      ${access?`<a href="${directions(access.place)}" target="_blank" rel="noopener">Directions to nearest mapped access</a>`:''}
      ${gauge?`<a href="${esc(gauge.meta.sourceUrl)}" target="_blank" rel="noopener">Open USGS gauge</a>`:''}
      <a href="${esc(DATA.sources.regulationMap.url)}" target="_blank" rel="noopener">DNR fishing map</a>
      <a href="${esc(DATA.sources.hydrography.url)}" target="_blank" rel="noopener">USGS NHD source</a>
    </div>
    <p class="mrp-source">Clicked river point ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)} · USGS NHD geometry. Gauge readings describe the gauge location, not this exact point. A river point is not necessarily public access.</p>
  </article>`;
}
async function getConditionsPayload(){
  if(!state.conditionsPromise){
    state.conditionsPromise=fetch('/api/manistee-river-conditions').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(payload=>{
      state.gauges=new Map((payload.gauges||[]).map(g=>[g.id,g]));
      return payload;
    }).catch(error=>{state.conditionsPromise=null;throw error;});
  }
  return state.conditionsPromise;
}
function openRiverPopup(id,name,latlng){
  const popup=L.popup({className:'manistee-rich-popup manistee-river-popup',minWidth:285,maxWidth:360,maxHeight:520,autoPanPadding:[18,18]})
    .setLatLng(latlng)
    .setContent(riverPopupHtml(id,name,latlng))
    .openOn(state.map);
  if(!state.gauges.size){
    getConditionsPayload().then(()=>{
      if(popup.isOpen()&&state.map.hasLayer(popup))popup.setContent(riverPopupHtml(id,name,latlng)).update();
    }).catch(()=>{
      if(popup.isOpen()&&state.map.hasLayer(popup))popup.setContent(riverPopupHtml(id,name,latlng)).update();
    });
  }
}

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
  m.bindPopup(()=>accessPopupHtml(p),{className:'manistee-rich-popup',minWidth:285,maxWidth:360,maxHeight:520,autoPanPadding:[18,18]});
  m.on('click',()=>selectPlace(p.id,false));
  m.on('popupopen',()=>document.dispatchEvent(new CustomEvent('manistee:popup-open',{detail:{id:p.id}})));
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
      const river=L.geoJSON(f,{style:{color:colors[id],weight:id==='manistee'?5:4,opacity:id==='little-manistee'?.68:.92,dashArray:id==='little-manistee'?'5 6':null}});
      river.eachLayer(path=>{
        if(window.matchMedia?.('(hover:hover) and (pointer:fine)').matches)path.bindTooltip(`${f.properties.name}`,{sticky:true,direction:'top'});
        path.on('click',event=>openRiverPopup(id,f.properties.name,event.latlng));
      });
      river.addTo(layer);
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
    const payload=await getConditionsPayload();
    cards.innerHTML=DATA.gauges.map(meta=>gaugeCard(meta,state.gauges.get(meta.id))).join('');
    state.layers.gauges.clearLayers();
    for(const meta of DATA.gauges.filter(g=>!g.historic)){
      const g=state.gauges.get(meta.id),fill=g?.temperature_context?.key==='thermal-stress'?'#b32727':g?.fresh?colors.gauge:'#777';
      L.circleMarker([meta.lat,meta.lon],{radius:8,color:'#fff',weight:2,fillColor:fill,fillOpacity:.95}).bindPopup(()=>gaugePopupHtml(meta,g),{className:'manistee-rich-popup',minWidth:285,maxWidth:360,maxHeight:520,autoPanPadding:[18,18]}).addTo(state.layers.gauges);
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
window.ManisteeFieldMapTest={hav,nodeKey,geometryLines,buildGraph,nearestNode,routeGraph,directions,accessPopupHtml,gaugePopupHtml,riverPopupHtml,nearestRiverAccess,nearestRiverGauge};
})();