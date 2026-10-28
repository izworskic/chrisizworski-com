/* Apostle Islands visual atlas: official NPS cartography and dated campsite reference points.
   The NPS map image is the only displayed trail geometry. Do NOT infer routes to site dots.
   No Redis, site availability, invented marina waypoint or safety clearance. */
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
const isLetter=id=>/^[A-Z]$/.test(id);
const mapPoints=(island)=>{
 if(!island)return[];
 const choice=filter?.value||'all';
 return island.sites.filter(([id])=>choice==='all'||(choice==='group'&&isLetter(id))||(choice==='individual'&&!isLetter(id))||(choice==='accessible'&&island.accessible.includes(id)));
};
const getIsland=id=>atlas?.islands.find(i=>i.id===id);
function setTab(id){
 current=id;
 const selected=panels.find(p=>p.dataset.atlasIsland===id);
 if(!selected)return;
 for(const p of panels)p.hidden=p!==selected;
 for(const tab of tabs){tab.classList.toggle('is-active',tab.dataset.atlasPick===id);if(tab.dataset.atlasPick===id)tab.setAttribute('aria-current','true');else tab.removeAttribute('aria-current');}
 const dockSelect=document.getElementById('dock-island-choice');
 if(dockSelect&&dockSelect.value!==id){dockSelect.value=id;dockSelect.dispatchEvent(new Event('change'));}
 if(atlas)showCampsites();
}
function ensureMap(){
 if(map||!L)return;
 try{
  map=L.map(mapEl,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true});
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
  const marker=L.circleMarker([lat,lng],styleFor(island,id)).addTo(markerLayer);
  const box=document.createElement('div');
  const heading=document.createElement('strong');heading.textContent=island.name+' · Site '+id;box.append(heading);
  const desc=document.createElement('p');desc.textContent=(isLetter(id)?'NPS-listed group campsite. ':'NPS-listed individual campsite. ')+(island.accessible.includes(id)?'NPS documents a boardwalk-accessible connection. ':'')+'Published coordinates are not a route, reservation or guarantee of access.';box.append(desc);
  const link=document.createElement('a');link.href=atlas.siteSource;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Verify site with NPS ↗';box.append(link);
  marker.bindPopup(box);siteMarkers.set(id,marker);bounds.push([lat,lng]);
 }
 map.invalidateSize({pan:false});
 if(bounds.length>1)map.fitBounds(L.latLngBounds(bounds).pad(.18),{maxZoom:12,animate:false});
 else if(bounds.length===1)map.setView(bounds[0],12,{animate:false});
}
for(const tab of tabs)tab.addEventListener('click',e=>{e.preventDefault();setTab(tab.dataset.atlasPick);});
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
}).catch(err=>{
 // Preserve all eight maps and original NPS source links when the data request fails.
 root.classList.remove('is-interactive','is-withheld');
 for(const panel of panels)panel.hidden=false;
 if(note)note.textContent='Interactive campsite markers unavailable. Eight official island maps, trails and NPS sources remain available below.';
 if(filter)filter.disabled=true;
 console.warn('Island atlas data not available:',String(err?.message||err));
});
})();
