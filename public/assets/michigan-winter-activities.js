/* FIELD_GUIDE_V1 winter: progressive filters, honest regional markers, CARTO / OSM fallback */
(()=>{'use strict';
for(const im of document.querySelectorAll('img[data-fallback-src]'))im.addEventListener('error',()=>{if(im.dataset.fallbackUsed)return;im.dataset.fallbackUsed='yes';im.src=im.dataset.fallbackSrc});const stories=[...document.querySelectorAll('.wf-story')];if(!stories.length)return;const regions=document.getElementById('wf-region'),efforts=document.getElementById('wf-effort'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');let tag='all',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;const message=(s,kind)=>{status.textContent=s;status.dataset.state=kind||''};const shown=()=>stories.filter(c=>!c.hidden);const reset=()=>{tag='all';regions.value='all';efforts.value='all';filter()};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag;filter()}));regions.addEventListener('change',filter);efforts.addEventListener('change',filter);document.getElementById('wf-reset')?.addEventListener('click',reset);document.getElementById('wf-show-all')?.addEventListener('click',reset);
function filter(){for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));for(const c of stories)c.hidden=(tag!=='all'&&c.dataset.tag!==tag)||(regions.value!=='all'&&c.dataset.region!==regions.value)||(efforts.value!=='all'&&c.dataset.effort!==efforts.value);let n=shown().length;count.textContent=n?n+' experiences match. Confirm current access, conditions and official sources before leaving.':'No experiences match these choices. Try another region or effort.';empty.hidden=n>0;refreshPins(false)}
function refreshPins(initial){
 if(!map||!window.L)return;
 markers.forEach(m=>map.removeLayer(m));markers=[];
 const groups=new Map();
 for(const card of shown()){const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;const key=lat.toFixed(5)+','+lng.toFixed(5);if(!groups.has(key))groups.set(key,{lat,lng,cards:[]});groups.get(key).cards.push(card)}
 const points=[];
 for(const group of groups.values()){
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Destination';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' winter experiences in this area':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Orientation only. Verify winter access, parking and trail rules using each official source.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open field note';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);items.append(item)
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' winter destinations':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[23,23],maxZoom:7});else if(points.length)map.setView(points[0],7);fitOnce=true}
}
function showTiles(url,provider){if(!map)return;if(tiles)map.removeLayer(tiles);const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});tiles=layer;let failed=0,loaded=0;layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Choose a regional marker.':'OpenStreetMap fallback loaded. Choose a regional marker.',provider==='CARTO'?'ready':'fallback')});layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. Destination stories and source links remain accessible.','error')}});layer.addTo(map)}
async function connectTiles(){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),6500);try{const r=await fetch('/api/carto-basemap-config',{credentials:'same-origin',signal:ac.signal});if(!r.ok)throw Error('config');const c=await r.json();if(c?.provider!=='CARTO'||typeof c.key!=='string'||!c.key.trim())throw Error('config');showTiles('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(c.key.trim()),'CARTO')}catch{message('Public CARTO map configuration unavailable. OpenStreetMap fallback.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}finally{clearTimeout(timer)}}
function init(){if(!window.L){message('Interactive map unavailable; browse all experiences below.','error');return}try{mapNode.textContent='';map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([44.8,-85.5],6);map.on('dragstart zoomstart',()=>{userZoomed=true});refreshPins(true);if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);requestAnimationFrame(()=>map?.invalidateSize({pan:false}));connectTiles()}catch{message('Map could not start. Every experience remains readable.','error')}}filter();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();
