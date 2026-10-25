'use strict';
/* CARTO raster / Leaflet. Screen-stable circular lock and park markers; AIS ship silhouettes.
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
 let viewportReports=[],mapRequest=0,mapTimer=null;
 let map=null,selected='john-day',reports=[],pendingAIS=null,shipsLayer=null,parkMarkers=new Map(),lockMarkers=new Map(),shipMarkers=new Map(),groupMarkers=new Map();
 const panel=$('lockMapSelection'),status=$('lockMapStatus');
 const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el};
 function link(label,url){const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener';return a}
 function lockDetail(site){
  selected=site.id;panel.replaceChildren(text('h3',site.name),text('p','River mile '+site.mile+' · reference lift '+site.lift+' ft. John Day maximum published project lift is 113 ft; these are not current water levels.'),link('USACE lock inventory ↗',SOURCE));
  for(const b of document.querySelectorAll('[data-river-lock]'))b.setAttribute('aria-pressed',String(b.dataset.riverLock===site.id));
  for(const [id,m] of lockMarkers)m.setStyle({fillColor:id===selected?'#be7130':'#126277',radius:id===selected?11:8});
 }
 function parkContent(p){const div=document.createElement('div');div.append(text('h3',p.name),text('p',p.text),link('Find your way to the park ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.query)),document.createElement('br'),link('Official access information ↗',p.source));return div}
 function vesselContent(v){const div=document.createElement('div');div.append(text('h3',v.name||'AIS vessel '+v.mmsi),text('p','Last heard '+new Date(v.seen).toLocaleString()+(Number.isFinite(v.speedKnots)?' · '+v.speedKnots.toFixed(1)+' knots':'')),text('p','A glimpse of this vessel’s journey: its last reported position, not a lock-queue record or a promised arrival. Map tiles simplify positions at wide zooms; zoom in for detail.'),link('Report details and source credits ↗','https://ais.openwaters.io/v1/vessels/'+encodeURIComponent(v.mmsi)));return div}
 function focusVessel(){if(!map)return;let marker=shipMarkers.get(pendingAIS);if(!marker){const v=[...reports,...viewportReports].find(v=>v.mmsi===pendingAIS);if(v){map.setView([v.lat,v.lon],12,{animate:false});drawAIS();marker=shipMarkers.get(pendingAIS)}}if(!marker)return;map.setView(marker.getLatLng(),Math.max(11,map.getZoom()),{animate:false});marker.openPopup()}
 function viewBounds(){const b=map.getBounds();return {west:b.getWest(),east:b.getEast(),south:b.getSouth(),north:b.getNorth()}}
 function clearShipSelection(){if(pendingAIS!==null){pendingAIS=null;drawAIS()}}
 function shipIcon(v){
  const selected=v.mmsi===pendingAIS,stopped=Number.isFinite(v.speedKnots)&&v.speedKnots<.5;
  const zoom=map.getZoom(),width=selected?64:zoom<=5?18:zoom<=9?24:v.kind==='toward'?50:38,height=selected?30:zoom<=5?12:zoom<=9?14:v.kind==='toward'?26:22;
  const key=[selected,stopped,width,height].join(':');
  const icon=L.divIcon({className:'aisShipMarker'+(selected?' is-selected':'')+(stopped?' is-stopped':''),html:'<span class="ship-glyph" aria-hidden="true"><svg viewBox="0 0 72 32" focusable="false"><path class="ship-hull" d="M3 19 L8 19 L11 24 L58 24 L67 18 L70 14 L62 14 L55 18 Z"/><path class="ship-house" d="M8 19 V10 H20 V19 Z"/><rect class="ship-stack" x="11" y="5" width="4" height="5" rx="1"/><rect class="ship-window" x="10" y="12" width="3" height="2" rx=".5"/><rect class="ship-window" x="15" y="12" width="3" height="2" rx=".5"/><rect class="ship-hatch" x="24" y="15" width="8" height="4" rx="1"/><rect class="ship-hatch" x="34" y="15" width="8" height="4" rx="1"/><rect class="ship-hatch" x="44" y="15" width="8" height="4" rx="1"/><path class="ship-waterline" d="M12 21.5 H59"/></svg></span>',iconSize:[width,height],iconAnchor:[Math.round(width/2),Math.round(height/2)],popupAnchor:[0,-Math.round(height/2)]});
  return {icon,key};
 }
 function drawAIS(){
  if(!map||!shipsLayer)return;
  const visible=window.JohnDayMapTiles.visibleReports(reports,viewportReports,viewBounds()).map(v=>window.JohnDayVessels.describe(v)).filter(Boolean);
  const overview=window.JohnDayMapTiles.groupReports(visible,map.getZoom(),pendingAIS);
  const ships=overview.filter(item=>item.type==='ship').map(item=>item.vessel),groups=overview.filter(item=>item.type==='group');
  const ids=new Set(ships.map(v=>v.mmsi)),groupIds=new Set(groups.map(g=>g.key));
  for(const [id,marker] of groupMarkers)if(!groupIds.has(id)){shipsLayer.removeLayer(marker);groupMarkers.delete(id)}
  for(const g of groups){
   let marker=groupMarkers.get(g.key);
   if(!marker){
    marker=L.marker([g.lat,g.lon],{icon:L.divIcon({className:'aisVesselGroup',html:'<span>'+g.count+'</span>',iconSize:[36,36],iconAnchor:[18,18]}),title:g.count+' loaded vessel reports · select to zoom in',keyboard:true}).addTo(shipsLayer);
    marker.on('click',()=>{clearShipSelection();map.fitBounds(marker._jdMembers.map(v=>[v.lat,v.lon]),{padding:[45,45],maxZoom:10,animate:false})});groupMarkers.set(g.key,marker);
   }else if(marker._jdCount!==g.count){
    marker.setIcon(L.divIcon({className:'aisVesselGroup',html:'<span>'+g.count+'</span>',iconSize:[36,36],iconAnchor:[18,18]}));
    const el=marker.getElement();if(el)el.setAttribute('title',g.count+' loaded vessel reports · select to zoom in');
   }
   marker._jdMembers=g.members;marker._jdCount=g.count;
  }
  for(const [id,marker] of shipMarkers)if(!ids.has(id)){shipsLayer.removeLayer(marker);shipMarkers.delete(id)}
  const countLabel=$('mapAISStatus');if(typeof countLabel.textContent==='string'&&/^\d+ recent vessel reports?/.test(countLabel.textContent))countLabel.textContent=countLabel.textContent.replace(/^\d+ recent vessel reports?/,visible.length+' recent vessel report'+(visible.length===1?'':'s'));
  for(const v of ships){
   let marker=shipMarkers.get(v.mmsi);const glyph=shipIcon(v);
   const stamp=[v.name,v.seen,v.speedKnots,v.lat,v.lon].join('|');
   if(!marker){
    marker=L.marker([v.lat,v.lon],{icon:glyph.icon,title:(v.name||v.mmsi)+' · recent AIS vessel',keyboard:true}).addTo(shipsLayer).bindPopup(vesselContent(v),{maxWidth:280});
    marker.on('click',()=>{pendingAIS=v.mmsi;drawAIS();window.dispatchEvent(new CustomEvent('john-day-ais-focus',{detail:{mmsi:v.mmsi}}))});shipMarkers.set(v.mmsi,marker);
   }else{
    if(marker._jdLat!==v.lat||marker._jdLon!==v.lon)marker.setLatLng([v.lat,v.lon]);
    if(marker._jdIcon!==glyph.key)marker.setIcon(glyph.icon);
    if(marker._jdStamp!==stamp)marker.setPopupContent(vesselContent(v));
   }
   marker._jdLat=v.lat;marker._jdLon=v.lon;marker._jdIcon=glyph.key;marker._jdStamp=stamp;
  }
 }
 async function loadViewport(){
  if(!map)return;const request=++mapRequest,b=map.getBounds(),z=Math.min(14,Math.max(0,Math.floor(map.getZoom()))),n=2**z;
  const row=lat=>{const r=Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180;return Math.max(0,Math.min(n-1,Math.floor((1-Math.asinh(Math.tan(r))/Math.PI)/2*n)))};
  const columns=new Set();const first=Math.floor((b.getWest()+180)/360*n),last=Math.floor((b.getEast()+180)/360*n);
  for(let raw=first;raw<=Math.min(last,first+n-1);raw++)columns.add(((raw%n)+n)%n);
  const tiles=[];for(const x of columns)for(let y=row(b.getNorth());y<=row(b.getSouth());y++)tiles.push({z,x,y});
  const label=$('mapAISStatus');label.textContent='Looking for vessel signals in this map view…';
  // Public browser tile service: each visitor uses their own provider quota. No site token or shared server proxy.
  const responses=await Promise.allSettled(tiles.slice(0,16).map(async t=>{
   const r=await fetch('https://ais.openwaters.io/v1/vessels/tiles/'+t.z+'/'+t.x+'/'+t.y+'?kind=vessel&max_age=28m',{signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw Error('Map AIS unavailable');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.byteLength>2e6)throw Error('Oversized tile');return window.JohnDayMapTiles.decodeTile(bytes,t);
  }));
  if(request!==mapRequest)return;
  const loaded=responses.filter(r=>r.status==='fulfilled');
  const fresh=window.JohnDayMapTiles.visibleReports([],loaded.flatMap(r=>r.value.vessels||[]),viewBounds());
  const partial=tiles.length>16||fresh.length>600||responses.some(r=>r.status==='rejected'||r.value?.truncated);
  viewportReports=(partial?window.JohnDayMapTiles.visibleReports([], [...viewportReports,...fresh],viewBounds()):fresh).slice(0,600);
  if(!loaded.length){drawAIS();label.textContent='The map vessel feed could not be reached. Pan, zoom or wait for the next refresh to try again. This is not a report of an empty waterway.';return}
  drawAIS();const count=window.JohnDayMapTiles.visibleReports(reports,viewportReports,viewBounds()).length;
  label.textContent=count+' recent vessel report'+(count===1?'':'s')+' in this map view. '+(partial?'Some reports could not be loaded. ':'')+'Pan or zoom to explore. Wide views are sampled and positions simplified; the cards beside the map stay focused on John Day.';
 }
 function queueViewport(){++mapRequest;drawAIS();clearTimeout(mapTimer);mapTimer=setTimeout(loadViewport,400)}
 function start(){
  if(map)return;
  try{
   if(!window.L)throw Error('Map library unavailable');
   map=L.map('lockMapSurface',{scrollWheelZoom:false,zoomControl:true,worldCopyJump:true}).setView([45.72,-120.695],12);
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
     layer.on('load',()=>{status.textContent=provider+' map · round dots: locks · blue freighters: AIS vessels · green circles: river recreation. Facility pins are not visitor entrances or navigation waypoints.'});
     layer.addTo(instance);
    }
    add(key?'CARTO':'OpenStreetMap');
   }
   shipsLayer=L.layerGroup().addTo(map);
   map.on('moveend',queueViewport);queueViewport();
   setInterval(()=>{if(!document.hidden)loadViewport()},120000);
   setInterval(drawAIS,30000);
   for(const s of LOCKS){const marker=L.circleMarker([s.lat,s.lon],{radius:s.id===selected?11:8,color:'#fff',weight:3,fillColor:s.id===selected?'#be7130':'#126277',fillOpacity:1}).addTo(map);marker.bindTooltip(s.name,{direction:'top'});marker.on('click',()=>{clearShipSelection();lockDetail(s);marker.bindPopup(text('strong',s.name+' · river mile '+s.mile)).openPopup()});lockMarkers.set(s.id,marker)}
   for(const p of PARKS){const marker=L.circleMarker([p.lat,p.lon],{radius:9,color:'#fff',weight:3,fillColor:'#34814e',fillOpacity:1}).addTo(map).bindTooltip(p.name,{direction:'top'}).bindPopup(parkContent(p),{maxWidth:280});parkMarkers.set(p.id,marker)}
   $('mapRecover').hidden=true;
   status.textContent='Unfolding the river map. Select a lock dot, a green park circle, or a ship silhouette to begin exploring.';
   drawAIS();focusVessel();void loadTiles();
  }catch(_){map=null;$('mapRecover').hidden=false;status.textContent='The map could not open. Keep exploring with the lock buttons and park cards below, then try the map again.'}
 }
 window.addEventListener('john-day-ais-observations',e=>{
  reports=(e.detail?.observations||[]).filter(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lon));
  if(![...reports,...viewportReports].some(v=>v.mmsi===pendingAIS))clearShipSelection();drawAIS();
 });
 window.addEventListener('john-day-ais-select',e=>{pendingAIS=e.detail?.mmsi;start();focusVessel()});
 document.querySelectorAll('[data-river-lock]').forEach(b=>b.addEventListener('click',()=>{clearShipSelection();const s=LOCKS.find(s=>s.id===b.dataset.riverLock);lockDetail(s);start();map?.setView([s.lat,s.lon],12,{animate:false});lockMarkers.get(s.id)?.openTooltip()}));
 document.querySelectorAll('[data-view-place]').forEach(b=>b.addEventListener('click',()=>{clearShipSelection();const p=PARKS.find(p=>p.id===b.dataset.viewPlace);start();map?.setView([p.lat,p.lon],14,{animate:false});parkMarkers.get(p.id)?.openPopup();$('lockMap').scrollIntoView({block:'center',behavior:'smooth'})}));
 $('lockMapFocus').addEventListener('click',()=>{clearShipSelection();start();map?.fitBounds(LOCKS.map(s=>[s.lat,s.lon]),{padding:[35,35]})});
 $('lockMapLocal').addEventListener('click',()=>{clearShipSelection();start();map?.setView([45.72,-120.695],12,{animate:false})});
 $('lockMapStart').addEventListener('click',start);
 $('lockMapLocate').addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='Device location unavailable.';return}
  navigator.geolocation.getCurrentPosition(pos=>{clearShipSelection();start();if(map){L.circleMarker([pos.coords.latitude,pos.coords.longitude],{radius:7,color:'#245dc5'}).addTo(map).bindPopup('Your approximate location');map.setView([pos.coords.latitude,pos.coords.longitude],11)}status.textContent='Location shown only on this map. The map provider receives ordinary map-tile requests; no route or navigation advice is calculated.'},()=>{status.textContent='Location denied or unavailable. Select a lock or park instead.'},{timeout:9000,maximumAge:300000});
 });
 lockDetail(LOCKS[2]);start();
})();
