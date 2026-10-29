/* FIELD_GUIDE_V1 winter: progressive filters, honest regional markers, CARTO / OSM fallback */
(()=>{'use strict';
/* Retain genuine credits; never substitute a photo of a different location.
   Offline/blocked originals fall back to an explicitly editorial panel, not a broken-image icon. */
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan in winter';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The access notes and official links below remain available.';
 panel.append(label,title,explanation);fig.insertBefore(panel,fig.firstChild)}
 panel.hidden=false;
}
for(const im of document.querySelectorAll('.wf-photo img')){
 let fallbackAttempted=false;
 const fail=()=>{if(!fallbackAttempted&&im.dataset.fallbackSrc){fallbackAttempted=true;im.dataset.fallbackUsed='yes';im.src=im.dataset.fallbackSrc;return;}revealPhotoFallback(im)};
 im.addEventListener('error',fail);
 if(im.complete&&im.naturalWidth===0)fail();
}const stories=[...document.querySelectorAll('.wf-story')];if(!stories.length)return;const access=document.getElementById('fzn-access'),regions=document.getElementById('wf-region'),efforts=document.getElementById('wf-effort'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');let tag='all',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;const message=(s,kind)=>{status.textContent=s;status.dataset.state=kind||''};const shown=()=>stories.filter(c=>!c.hidden);const reset=()=>{tag='all';regions.value='all';efforts.value='all';access.value='all';filter()};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag;filter()}));regions.addEventListener('change',filter);efforts.addEventListener('change',filter);access.addEventListener('change',filter);document.getElementById('wf-reset')?.addEventListener('click',reset);document.getElementById('wf-show-all')?.addEventListener('click',reset);
function filter(){for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));for(const c of stories)c.hidden=(tag!=='all'&&c.dataset.tag!==tag)||(regions.value!=='all'&&c.dataset.region!==regions.value)||(efforts.value!=='all'&&c.dataset.effort!==efforts.value)||(access.value!=='all'&&c.dataset.access!==access.value);let n=shown().length;count.textContent=n?`Showing ${n} frozen Michigan ${n===1?'stop':'stops'}. Check park snow-plowing and trail notices before you head out.`:'No stops match those filters—try broadening the region or winter access type.';empty.hidden=n>0;refreshPins(false)}
function refreshPins(initial){
 if(!map||!window.L)return;
 markers.forEach(m=>map.removeLayer(m));markers=[];
 const groups=new Map();
 for(const card of shown()){const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;const key=lat.toFixed(5)+','+lng.toFixed(5);if(!groups.has(key))groups.set(key,{lat,lng,cards:[]});groups.get(key).cards.push(card)}
 const points=[];
 for(const group of groups.values()){
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Destination';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' winter viewpoints in this area':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Jump to the field notes below for winter parking and safe land-based approach details.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open field note';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   const view=document.createElement('a');
   const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
   view.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
   view.target='_blank';view.rel='noopener noreferrer';view.className='fzn-popup-map-link';
   view.textContent='View geographic area · not parking ↗';
   view.title='Location only: verify official winter parking, access and closures';
   item.append(view);items.append(item)
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

(function(){
const desc={
 curtain:{label:'FIELD LESSON 01 · SANDSTONE SEEPAGE',title:'Why Pictured Rocks and Eben weep blue and amber ice',copy:'Even when air temperatures plunge below zero, groundwater inside the porous Munising and Jacobsville sandstone stays above freezing until the moment it hits the cliff face. Drop by drop, that slow seepage freezes into 30-to-50-foot vertical columns—tinted pale blue by trapped air or golden-tan by iron and forest tannins.',alert:'Field rule: Multi-ton ice columns can detach from warm rock without warning during a sunny afternoon or thaw—admire them from the trail, never directly underneath an overhang.'},
 fall:{label:'FIELD LESSON 02 · RIVER MIST & RIM ICE',title:'How Upper Peninsula waterfalls build hollow winter ice bells',copy:'A big river like the Tahquamenon or Middle Branch Ontonagon rarely freezes solid. Instead, turbulent rapids throw fine mist into the sub-freezing gorge air, building thick collars, overhangs, and hollow ice bells around the rushing amber core.',alert:'Field rule: A waterfall shell that looks six feet thick from above is often hollow over fast, freezing current—stay inside the park overlooks and never step onto river ice.'},
 spray:{label:'FIELD LESSON 03 · GALE SPRAY & SHORE SCULPTURES',title:'When early-winter Lake Michigan gales become sculptors',copy:'Before nearshore ice locks in, December and January gales hurl 10-to-15-foot waves against concrete piers at Grand Haven and St. Joseph. Airborne droplets freeze on contact with cold steel catwalks and lighthouse towers, adding foot after foot of sculpted white glaze.',alert:'Field rule: Photograph frozen lighthouses from the beach or park overlook with a telephoto lens—an ice-domed pier has zero footing and waves can sweep the deck without warning.'}
};
const labels=[...document.querySelectorAll('[data-form]')].filter(e=>e.tagName==='BUTTON'),stage=document.getElementById('fzn-form-stage'),art=document.getElementById('fzn-form-art');
const lb=document.getElementById('fzn-form-label'),title=document.getElementById('fzn-form-title'),copy=document.getElementById('fzn-form-copy'),alert=document.getElementById('fzn-form-alert');
labels.forEach(b=>b.addEventListener('click',()=>{const d=desc[b.dataset.form];if(!d)return;labels.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));art.dataset.form=b.dataset.form;lb.textContent=d.label;title.textContent=d.title;copy.textContent=d.copy;alert.textContent=d.alert}));
})();