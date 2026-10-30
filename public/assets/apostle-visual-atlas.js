/* Apostle Islands visual atlas: official NPS cartography and dated campsite reference points.
   The NPS map image is the only displayed trail geometry. Do NOT infer routes to site dots.
   No external state, booking availability, invented marina waypoint or safety clearance. */
(() => {'use strict';
const root=document.getElementById('island-atlas');
const mapEl=document.getElementById('atlas-geographic-map');
const panels=[...document.querySelectorAll('.atlas-scene')];
const tabs=[...document.querySelectorAll('[data-atlas-pick]')];
const note=document.getElementById('atlas-map-note');
const withheld=document.getElementById('atlas-coordinates-withheld');
const filter=document.getElementById('atlas-marker-filter');
if(!root||!mapEl||!panels.length)return;
let atlas=null,map=null,L=window.L,markerLayer=null,siteMarkers=new Map(),current='stockton',mapLoaded=false;
let pathways=null,activePath=null;
const pathReadout=document.getElementById('atlas-connection-readout');
const pathTrip=document.getElementById('trip-selected-path');
const isLetter=id=>/^[A-Z]$/.test(id);
const mapPoints=(island)=>{
 if(!island)return[];
 const choice=filter?.value||'all';
 return island.sites.filter(([id])=>choice==='all'||(choice==='group'&&isLetter(id))||(choice==='individual'&&!isLetter(id))||(choice==='accessible'&&island.accessible.includes(id)));
};
const getIsland=id=>atlas?.islands.find(i=>i.id===id);
function setTab(id){
 if(current!==id)activePath=null;
 current=id;
 const selected=panels.find(p=>p.dataset.atlasIsland===id);
 if(!selected)return;
 for(const p of panels)p.hidden=p!==selected;
 for(const tab of tabs){tab.classList.toggle('is-active',tab.dataset.atlasPick===id);if(tab.dataset.atlasPick===id)tab.setAttribute('aria-current','true');else tab.removeAttribute('aria-current');}
 const dockSelect=document.getElementById('dock-island-choice');
 if(dockSelect&&dockSelect.value!==id){dockSelect.value=id;dockSelect.dispatchEvent(new Event('change'));}
 if(atlas)showCampsites();
 if(pathReadout&&!activePath){pathReadout.querySelector('strong').textContent='Choose a documented island sequence';pathReadout.querySelector('p').textContent='Select a dock, trail and site relationship. Where NPS publishes campsite coordinates, the matching site dots can be highlighted; no route is drawn.';}
}
function ensureMap(){
 if(map||!L)return;
 try{
  map=L.map(mapEl,{scrollWheelZoom:false,zoomControl:true,preferCanvas:false});
  map.attributionControl.setPrefix('Leaflet');
  map.setView([46.93,-90.7],10);
  const osm=()=>L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'});
  let active=osm().addTo(map);
  mapEl.dataset.mapState='loaded';
  markerLayer=L.layerGroup().addTo(map);
  mapLoaded=true;
  // Reuse the site's CARTO key/fallback pattern without moving a user-supplied key into page source.
  fetch('/api/carto-basemap-config',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(conf=>{
   if(!conf||conf.provider!=='CARTO'||typeof conf.key!=='string'||!conf.key.trim())return;
   const layer=L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(conf.key.trim()),{subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap contributors © CARTO'});
   let loaded=false,failed=0;
   layer.on('tileload',()=>{loaded=true;mapEl.dataset.tiles='carto';});
   layer.on('tileerror',()=>{if(++failed>=2){if(map.hasLayer(layer))map.removeLayer(layer);mapEl.dataset.tiles='osm-fallback';}});
   layer.addTo(map);
   layer.once('load',()=>{if(loaded&&map.hasLayer(active)){map.removeLayer(active);active=layer;}});
  }).catch(()=>{mapEl.dataset.tiles='osm';});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapEl);
  window.addEventListener('load',()=>map?.invalidateSize({pan:false}),{once:true});
 }catch(err){mapEl.dataset.mapState='fallback';map=null;markerLayer=null;mapLoaded=false;console.warn('Island atlas basemap unavailable:',String(err?.message||err));}
}
function styleFor(island,id){
 const accessible=island.accessible.includes(id);
 return {radius:accessible?8:6,weight:2,color:accessible?'#fbfbf5':'#fff',fillColor:accessible?'#168264':isLetter(id)?'#d48a39':'#16566a',fillOpacity:.94};
}
function showCampsites(){
 const island=getIsland(current);
 if(!island)return;
 const pts=mapPoints(island),total=island.sites.length,withheldState=!total;
 const chosen=pathways?.rows.find(p=>p.id===activePath&&p.island===current)||null;
 root.classList.toggle('is-withheld',withheldState);
 if(withheld)withheld.hidden=!withheldState;
 const noData=island.withheldReason||'NPS provides no verified campsite coordinate points for this island.';
 if(withheldState){
  if(withheld)withheld.querySelector('p').textContent=noData;
  if(note)note.textContent=island.name+': no campsite location markers. '+noData;
  if(filter)filter.disabled=true;
  return;
 }
 if(filter)filter.disabled=false;
 if(note)note.textContent=island.name+': '+pts.length+' of '+total+' NPS-published campsite reference positions shown. These are not walking routes, landing waypoints, campsite availability, or current conditions.';
 if(!mapLoaded)ensureMap();
 if(!map||!markerLayer)return;
 markerLayer.clearLayers();siteMarkers=new Map();
 const bounds=[];
 for(const [id,lat,lng] of pts){
  const match=chosen&&chosen.siteIds.includes(id);
 const base=styleFor(island,id);
 if(chosen&&chosen.siteIds.length){base.fillOpacity=match?1:.2;base.weight=match?4:1;base.radius=match?10:5;}
 const marker=L.circleMarker([lat,lng],base).addTo(markerLayer);
  const box=document.createElement('div');
  const heading=document.createElement('strong');heading.textContent=island.name+' · Site '+id;box.append(heading);
  const desc=document.createElement('p');desc.textContent=(isLetter(id)?'NPS-listed group campsite. ':'NPS-listed individual campsite. ')+(island.accessible.includes(id)?'NPS documents a boardwalk-accessible connection. ':'')+'Published coordinates are not a route, reservation or guarantee of access.';box.append(desc);
  const related=pathways?.rows.filter(p=>p.island===current&&p.siteIds.includes(id))||[];
  if(related.length){const connection=document.createElement('p');connection.textContent='NPS-described arrival: '+related.map(p=>p.routeLabel).join(' · ');box.append(connection);}
  const link=document.createElement('a');link.href=atlas.siteSource;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Verify site with NPS ↗';box.append(link);
  marker.bindPopup(box);siteMarkers.set(id,marker);bounds.push([lat,lng]);
  marker.on('click',()=>{const rel=related[0];if(rel&&activePath!==rel.id)choosePath(rel.id,{fromMarker:true});});
 }
 map.invalidateSize({pan:false});
 if(bounds.length>1)map.fitBounds(L.latLngBounds(bounds).pad(.18),{maxZoom:12,animate:false});
 else if(bounds.length===1)map.setView(bounds[0],12,{animate:false});
}
function choosePath(id,options={}){
 const rel=pathways?.rows.find(x=>x.id===id);
 if(!rel)return;
 if(current!==rel.island)setTab(rel.island);
 activePath=id;
 root.dataset.activePath=id;
 const own=mapPoints(getIsland(current));
 if(filter&&rel.siteIds.length&&rel.siteIds.some(site=>!own.some(x=>x[0]===site)))filter.value='all';
 document.querySelectorAll('.atlas-path-card').forEach(el=>el.classList.toggle('is-selected',el.dataset.pathId===id));
 const card=document.getElementById('atlas-path-'+id);
 if(card)card.open=true;
 if(pathReadout){
  pathReadout.querySelector('strong').textContent=rel.title;
  const siteLabel=rel.siteIds.length?' · NPS site '+rel.siteIds.join(', '):' · no campsite reference';
  const withheld=rel.island==='sand'||rel.island==='devils'||rel.island==='raspberry';
  pathReadout.querySelector('p').textContent=rel.routeLabel+siteLabel+(withheld?'. No campsite markers plotted; use NPS original maps and written site evidence.':'. Highlighted dots mark published campsite reference positions, NOT a trail path.');
 }
 showCampsites();
 if(map&&rel.siteIds.length){
  const found=rel.siteIds.map(site=>siteMarkers.get(site)).filter(Boolean);
  if(found.length===1)map.setView(found[0].getLatLng(),13,{animate:false});
  else if(found.length>1)map.fitBounds(L.latLngBounds(found.map(m=>m.getLatLng())).pad(.32),{maxZoom:13,animate:false});
 }
 if(options.fromMarker&&card)card.scrollIntoView({behavior:'smooth',block:'nearest'});
}
for(const b of document.querySelectorAll('[data-path-select]')){
 b.addEventListener('click',()=>choosePath(b.dataset.pathSelect));
}
for(const link of document.querySelectorAll('[data-path-dock]')){
 link.addEventListener('click',()=>{
  const dock=document.getElementById('dock-'+link.dataset.pathDock);
  const select=document.getElementById('dock-island-choice');
  if(select&&dock){select.value=dock.dataset.island;select.dispatchEvent(new Event('change'));}
 });
}
for(const link of document.querySelectorAll('[data-path-trip]')){
 link.addEventListener('click',()=>{
  const rel=pathways?.rows.find(x=>x.id===link.dataset.pathTrip);
  if(!rel)return;
  choosePath(rel.id);
  const tripIsland=document.getElementById('trip-island');
  if(tripIsland){tripIsland.value=rel.island;tripIsland.dispatchEvent(new Event('change',{bubbles:true}));}
  if(pathTrip)pathTrip.textContent='NPS relationship to verify: '+rel.title+' · '+rel.routeLabel+'. '+rel.caution+' No landing, campsite permit or boat return has been confirmed.';
 });
}
for(const tab of tabs)tab.addEventListener('click',e=>{e.preventDefault();setTab(tab.dataset.atlasPick);});
for(const link of document.querySelectorAll('[data-atlas-go]')){
 link.addEventListener('click',e=>{
  e.preventDefault();
  setTab(link.dataset.atlasGo);
  root.scrollIntoView({behavior:'smooth',block:'start'});
 });
}
if(filter)filter.addEventListener('change',showCampsites);
for(const link of document.querySelectorAll('.atlas-site-link')){
 link.addEventListener('click',e=>{
  const targetIsland=link.dataset.atlasIsland,id=link.dataset.atlasSite;
  if(!atlas||!L)return; e.preventDefault();
  if(current!==targetIsland)setTab(targetIsland);
  if(filter&&mapPoints(getIsland(current)).every(([site])=>site!==id)){
   filter.value='all';showCampsites();
  }
  const marker=siteMarkers.get(id);
  if(marker&&map){map.setView(marker.getLatLng(),14,{animate:false});marker.openPopup();mapEl.scrollIntoView({behavior:'smooth',block:'nearest'});}
  else window.open(atlas.siteSource,'_blank','noopener,noreferrer');
 });
}
root.classList.add('is-interactive');
for(const panel of panels)panel.hidden=panel.dataset.atlasIsland!=='stockton';
fetch('/apostle-islands/island-atlas.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('atlas data '+r.status);return r.json();}).then(data=>{
 if(!Array.isArray(data.islands)||data.islands.length!==8||!data.coordinatePolicy?.sand)throw Error('invalid atlas data');
 atlas=data;setTab(current);
 return fetch('/apostle-islands/verified-pathways.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('pathway evidence '+r.status);return r.json();}).then(paths=>{
  if(!Array.isArray(paths.rows)||paths.rows.length!==21)throw Error('invalid NPS route evidence');
  pathways=paths;
  for(const b of document.querySelectorAll('[data-path-select]'))b.hidden=false;
  showCampsites();
 }).catch(err=>{
  if(pathReadout)pathReadout.querySelector('p').textContent='Interactive campsite-to-trail highlighting unavailable. The NPS source-linked planning sequences remain readable below.';
  console.warn('NPS pathway relationship data unavailable:',String(err?.message||err));
 });
}).catch(err=>{
 // Preserve all eight maps and original NPS source links when the data request fails.
 root.classList.remove('is-interactive','is-withheld');
 for(const panel of panels)panel.hidden=false;
 if(note)note.textContent='Interactive campsite markers unavailable. Eight official island maps, trails and NPS sources remain available below.';
 if(filter)filter.disabled=true;
 console.warn('Island atlas data not available:',String(err?.message||err));
});
})();
