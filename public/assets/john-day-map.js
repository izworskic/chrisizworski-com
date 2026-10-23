'use strict';
/* CARTO raster / Leaflet. Screen-stable circular lock and park markers; AIS arrows.
   USACE historic lock inventory / Lock Characteristics positions are facility references,
   not public dam entrances or safe nautical waypoints. WGS84, [lat, lon] in Leaflet. */
(()=>{
 const $=id=>document.getElementById(id);
 const LOCKS=[
  {id:'bonneville',name:'Bonneville Lock',lon:-121.947259,lat:45.638124,mile:145.3,lift:65},
  {id:'the-dalles',name:'The Dalles Lock',lon:-121.139626,lat:45.614994,mile:191.7,lift:88},
  {id:'john-day',name:'John Day Lock',lon:-120.697630,lat:45.719149,mile:216.5,lift:110},
  {id:'mcnary',name:'McNary Lock',lon:-119.300560,lat:45.940161,mile:292.0,lift:103}
 ];
 const PARKS=[
  {id:'giles',name:'Giles French Park',lat:45.709987,lon:-120.695347,query:'Giles French Park Rufus Oregon',text:'Pause on the Oregon shore below the dam for the broad river-and-dam landscape. Look for passing traffic; a close-up lock-chamber view is not confirmed here.',source:'https://corpslakes.erdc.dren.mil/visitors/projects.cfm?Id=G208480'},
  {id:'lepage',name:'LePage Park',lat:45.7283972,lon:-120.6512639,query:'LePage Park Rufus Oregon',text:'Discover where the John Day River meets the Columbia, upstream of the dam. Come for river recreation, not a lock-chamber view. Check seasonal access before setting out.',source:'https://www.recreation.gov/camping/campgrounds/233536'}
 ];
 const SOURCE='https://services7.arcgis.com/n1YM8pTrFmm7L4hs/ArcGIS/rest/services/Locks/FeatureServer/0';
 let map=null,selected='john-day',reports=[],pendingAIS=null,shipsLayer=null,parkMarkers=new Map(),lockMarkers=new Map(),shipMarkers=new Map();
 const panel=$('lockMapSelection'),status=$('lockMapStatus');
 const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el};
 function link(label,url){const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener';return a}
 function lockDetail(site){
  selected=site.id;panel.replaceChildren(text('h3',site.name),text('p','River mile '+site.mile+' · reference lift '+site.lift+' ft. John Day maximum published project lift is 113 ft; these are not current water levels.'),link('USACE lock inventory ↗',SOURCE));
  for(const b of document.querySelectorAll('[data-river-lock]'))b.setAttribute('aria-pressed',String(b.dataset.riverLock===site.id));
  for(const [id,m] of lockMarkers)m.setStyle({fillColor:id===selected?'#be7130':'#126277',radius:id===selected?11:8});
 }
 function parkContent(p){const div=document.createElement('div');div.append(text('h3',p.name),text('p',p.text),link('Find your way to the park ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.query)),document.createElement('br'),link('Official access information ↗',p.source));return div}
 function vesselContent(v){const div=document.createElement('div');div.append(text('h3',v.name||'AIS vessel '+v.mmsi),text('p','Last heard '+new Date(v.seen).toLocaleString()+(Number.isFinite(v.speedKnots)?' · '+v.speedKnots.toFixed(1)+' knots':'')),text('p','A glimpse of this vessel’s journey: its last reported position, not a lock-queue record or a promised arrival.'));return div}
 function focusVessel(){const marker=shipMarkers.get(pendingAIS);if(!map||!marker)return;map.setView(marker.getLatLng(),Math.max(11,map.getZoom()),{animate:false});marker.openPopup()}
 function drawAIS(){
  if(!map||!shipsLayer)return;shipsLayer.clearLayers();shipMarkers.clear();
  for(const v of reports){
   const rotation=Number.isFinite(v.course)?v.course:0;
   const icon=L.divIcon({className:'aisShipMarker',html:'<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style="transform:rotate('+rotation+'deg)"><path d="M16 2L27 27 16 22 5 27Z" fill="#803ba0" stroke="#fff" stroke-width="2.5"/></svg>',iconSize:[32,32],iconAnchor:[16,16]});
   const marker=L.marker([v.lat,v.lon],{icon,title:(v.name||v.mmsi)+' · recent AIS vessel',keyboard:true}).addTo(shipsLayer).bindPopup(vesselContent(v),{maxWidth:280});
   marker.on('click',()=>window.dispatchEvent(new CustomEvent('john-day-ais-focus',{detail:{mmsi:v.mmsi}})));shipMarkers.set(v.mmsi,marker);
  }
 }
 function start(){
  if(map)return;
  try{
   if(!window.L)throw Error('Map library unavailable');
   map=L.map('lockMapSurface',{scrollWheelZoom:false,zoomControl:true}).setView([45.72,-120.695],12);
   // Use the site's existing PUBLIC CARTO basemap key for every raster tile.
   // Keep markers usable while key lookup runs; OSM is the no-key outage fallback.
   const instance=map;
   async function loadTiles(){
    let key='';
    try{const r=await fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(8000)});if(r.ok){const d=await r.json();if(d.provider==='CARTO'&&typeof d.key==='string')key=d.key}}catch{}
    if(map!==instance)return;
    let fallback=false;
    function add(provider){
     const carto=provider==='CARTO';
     const url=carto?'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(key):'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
     const layer=L.tileLayer(url,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'+(carto?' &copy; <a href="https://carto.com/attributions">CARTO</a>':'')});
     layer.on('tileerror',()=>{if(carto&&!fallback){fallback=true;instance.removeLayer(layer);add('OpenStreetMap')}else status.textContent='Part of the map is taking a break. You can still select the lock, park and vessel markers, or follow the cards and park directions below.'});
     layer.on('load',()=>{status.textContent=provider+' map · round dots: locks · purple arrows: AIS vessels · green circles: river recreation. Facility pins are not visitor entrances or navigation waypoints.'});
     layer.addTo(instance);
    }
    add(key?'CARTO':'OpenStreetMap');
   }
   shipsLayer=L.layerGroup().addTo(map);
   for(const s of LOCKS){const marker=L.circleMarker([s.lat,s.lon],{radius:s.id===selected?11:8,color:'#fff',weight:3,fillColor:s.id===selected?'#be7130':'#126277',fillOpacity:1}).addTo(map);marker.bindTooltip(s.name,{direction:'top'});marker.on('click',()=>{pendingAIS=null;lockDetail(s);marker.bindPopup(text('strong',s.name+' · river mile '+s.mile)).openPopup()});lockMarkers.set(s.id,marker)}
   for(const p of PARKS){const marker=L.circleMarker([p.lat,p.lon],{radius:9,color:'#fff',weight:3,fillColor:'#34814e',fillOpacity:1}).addTo(map).bindTooltip(p.name,{direction:'top'}).bindPopup(parkContent(p),{maxWidth:280});parkMarkers.set(p.id,marker)}
   $('mapRecover').hidden=true;
   status.textContent='Unfolding the river map. Select a lock dot, a green park circle, or a vessel arrow to begin exploring.';
   drawAIS();focusVessel();void loadTiles();
  }catch(_){map=null;$('mapRecover').hidden=false;status.textContent='The map could not open. Keep exploring with the lock buttons and park cards below, then try the map again.'}
 }
 window.addEventListener('john-day-ais-observations',e=>{
  reports=(e.detail?.observations||[]).filter(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lon));
  if(!reports.some(v=>v.mmsi===pendingAIS))pendingAIS=null;drawAIS();
 });
 window.addEventListener('john-day-ais-select',e=>{pendingAIS=e.detail?.mmsi;start();focusVessel()});
 document.querySelectorAll('[data-river-lock]').forEach(b=>b.addEventListener('click',()=>{pendingAIS=null;const s=LOCKS.find(s=>s.id===b.dataset.riverLock);lockDetail(s);start();map?.setView([s.lat,s.lon],12,{animate:false});lockMarkers.get(s.id)?.openTooltip()}));
 document.querySelectorAll('[data-view-place]').forEach(b=>b.addEventListener('click',()=>{pendingAIS=null;const p=PARKS.find(p=>p.id===b.dataset.viewPlace);start();map?.setView([p.lat,p.lon],14,{animate:false});parkMarkers.get(p.id)?.openPopup();$('lockMap').scrollIntoView({block:'center',behavior:'smooth'})}));
 $('lockMapFocus').addEventListener('click',()=>{pendingAIS=null;start();map?.fitBounds(LOCKS.map(s=>[s.lat,s.lon]),{padding:[35,35]})});
 $('lockMapLocal').addEventListener('click',()=>{pendingAIS=null;start();map?.setView([45.72,-120.695],12,{animate:false})});
 $('lockMapStart').addEventListener('click',start);
 $('lockMapLocate').addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='Device location unavailable.';return}
  navigator.geolocation.getCurrentPosition(pos=>{pendingAIS=null;start();if(map){L.circleMarker([pos.coords.latitude,pos.coords.longitude],{radius:7,color:'#245dc5'}).addTo(map).bindPopup('Your approximate location');map.setView([pos.coords.latitude,pos.coords.longitude],11)}status.textContent='Location shown only on this map. The map provider receives ordinary map-tile requests; no route or navigation advice is calculated.'},()=>{status.textContent='Location denied or unavailable. Select a lock or park instead.'},{timeout:9000,maximumAge:300000});
 });
 lockDetail(LOCKS[2]);start();
})();
