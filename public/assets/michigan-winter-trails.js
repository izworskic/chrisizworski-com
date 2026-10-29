/* FIELD_GUIDE_V1 winter trails: progressive filters, honest regional markers, CARTO / OSM fallback */
(()=>{'use strict';
/* Retain genuine credits; never substitute a photo of a different location.
   Offline/blocked originals fall back to an explicitly editorial panel, not a broken-image icon. */
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan winter trails';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The trail access notes and official links below remain available.';
 panel.append(label,title,explanation);fig.insertBefore(panel,fig.firstChild)}
 panel.hidden=false;
}
for(const im of document.querySelectorAll('.wf-photo img')){
 let fallbackAttempted=false;
 const fail=()=>{if(!fallbackAttempted&&im.dataset.fallbackSrc){fallbackAttempted=true;im.dataset.fallbackUsed='yes';im.src=im.dataset.fallbackSrc;return;}revealPhotoFallback(im)};
 im.addEventListener('error',fail);
 if(im.complete&&im.naturalWidth===0)fail();
}
const stories=[...document.querySelectorAll('.wf-story')];if(!stories.length)return;
const access=document.getElementById('trl-access'),regions=document.getElementById('wf-region'),efforts=document.getElementById('wf-effort'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');
let tag='all',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;
const message=(s,kind)=>{if(!status)return;status.textContent=s;status.dataset.state=kind||''};
const shown=()=>stories.filter(c=>!c.hidden);
const reset=()=>{tag='all';regions.value='all';efforts.value='all';access.value='all';filter()};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag;filter()}));
regions.addEventListener('change',filter);
efforts.addEventListener('change',filter);
access.addEventListener('change',filter);
document.getElementById('wf-reset')?.addEventListener('click',reset);
document.getElementById('wf-show-all')?.addEventListener('click',reset);
function filter(){
 for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));
 for(const c of stories)c.hidden=(tag!=='all'&&c.dataset.tag!==tag)||(regions.value!=='all'&&c.dataset.region!==regions.value)||(efforts.value!=='all'&&c.dataset.effort!==efforts.value)||(access.value!=='all'&&c.dataset.access!==access.value);
 let n=shown().length;
 count.textContent=n?`Showing ${n} Michigan winter trail ${n===1?'system':'systems'}. Check snow depth, grooming, and turn-in plowing before you head out.`:'No trail systems match those filters—try broadening the region, mode, or effort.';
 empty.hidden=n>0;
 refreshPins(false);
}
function refreshPins(initial){
 if(!map||!window.L)return;
 markers.forEach(m=>map.removeLayer(m));markers=[];
 const groups=new Map();
 for(const card of shown()){
  const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
  const key=lat.toFixed(5)+','+lng.toFixed(5);
  if(!groups.has(key))groups.set(key,{lat,lng,cards:[]});
  groups.get(key).cards.push(card);
 }
 const points=[];
 for(const group of groups.values()){
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Trail system';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' winter trail experiences here':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Trail corridor orientation. Check seasonal road plowing and closures with official sources; never use this pin as verified winter parking.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open trail note';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   const view=document.createElement('a');
   const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
   view.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
   view.target='_blank';view.rel='noopener noreferrer';view.className='trl-popup-map-link';
   view.textContent='View geographic area · not parking ↗';
   view.title='Location only: verify official winter parking, trail uses and closures';
   item.append(view);items.append(item);
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' winter trail experiences':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[23,23],maxZoom:7});else if(points.length)map.setView(points[0],7);fitOnce=true}
}
function showTiles(url,provider){
 if(!map)return;if(tiles)map.removeLayer(tiles);
 const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
 tiles=layer;let failed=0,loaded=0;
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Choose a regional trail marker.':'OpenStreetMap fallback loaded. Choose a regional trail marker.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. Trail dossiers and official source links remain accessible.','error')}});
 layer.addTo(map);
}
async function connectTiles(){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),6500);
 try{
  const r=await fetch('/api/carto-basemap-config',{credentials:'same-origin',signal:ac.signal});
  if(!r.ok)throw Error('config');
  const c=await r.json();
  if(c?.provider!=='CARTO'||typeof c.key!=='string'||!c.key.trim())throw Error('config');
  showTiles('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(c.key.trim()),'CARTO');
 }catch{
  message('Public CARTO map configuration unavailable. OpenStreetMap fallback.','fallback');
  showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM');
 }finally{clearTimeout(timer)}
}
function init(){
 if(!window.L){message('Interactive map unavailable; browse all trail systems below.','error');return}
 try{
  mapNode.textContent='';
  map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([44.8,-85.5],6);
  map.on('dragstart zoomstart',()=>{userZoomed=true});
  refreshPins(true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
  connectTiles();
 }catch{message('Map could not start. Every trail system remains readable.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

(function(){
const desc={
 snowshoe:{
  label:'FIELD LESSON 01 · DEDICATED SNOWSHOE SINGLETRACK',
  title:'Why dedicated snowshoe loops are the best stress-free winter walk',
  copy:'When you want to wander through deep hemlock and pine woods without worrying about ski etiquette, pick a dedicated snowshoe trail—like the 2.65-mile Munising Snowshoe Trail at Pictured Rocks, the Green (1.6 mi) and Blue (2.4 mi) loops at Lower Tahquamenon Falls, or the color-coded snowshoe loops at Traverse City\'s Vasa Trailhead.',
  alert:'Field tip: Even at parks with dedicated snowshoe trails, watch the signs at junctions—at Upper Tahquamenon Falls, the 1.0-mile Marked Snowshoe Trail welcomes snowshoes, while the neighboring 1.0-mile Lantern Loop is strictly reserved for cross-country skis.'
 },
 shared:{
  label:'FIELD LESSON 02 · SHARED SKI & SNOWSHOE CORRIDORS',
  title:'Walk the outer edge and keep the parallel classic ski rails clean',
  copy:'On shared winter pathways like the Sleeping Bear Heritage Trail, Paradise Pathway, and Hartwick Pines\' Mertz Grade, groomers or local skiers set two parallel classic tracks alongside a wider snow deck. Snowshoers and winter walkers are welcome—just stay on the outer edge of the corridor.',
  alert:'Field tip: A single boot or snowshoe print punched into a set ski groove freezes overnight into a rock-hard divot that can catch a skier\'s tip on a fast descent. Step wide when crossing tracks at junctions.'
 },
 fatbike:{
  label:'FIELD LESSON 03 · WINTER FAT-TIRE WINDOWS & PSI CRAFT',
  title:'How low tire pressure (3–5 PSI) lets fat bikes float on snow',
  copy:'Silver Lake State Park opens its 450 acres of open dunes to fat-tire bikes from December 15 through March 15 (minimum 3.5-inch tire width required), while groomed northern singletrack like Traverse City\'s Vasa Winter Sports Singletrack relies on sub-freezing snow crust and ultra-low tire pressures (3–5 PSI).',
  alert:'Field tip: If your tires leave a rut deeper than an inch or you have to dismount and push up climbs, the snow deck is too soft—air down further or save the ride for a colder morning.'
 },
 packed:{
  label:'FIELD LESSON 04 · MICROSPIKES VS. UNPLOWED ROADS',
  title:'Why microspikes beat snowshoes on packed trails—and where sedans get stuck',
  copy:'Popular state park loops like Hartwick Pines\' Old Growth Trail (1.25 mi), Tahquamenon\'s Upper Falls Brink Walk (0.75 mi), and Muskegon State Park\'s dune loops pack down into firm, icy troughs where steel-tooth microspikes grip far better than bulky snowshoes. Out on the backroads, however, unplowed seasonal approaches like Anderson Lake and Negwegon\'s Sand Hill Road will stop a passenger car cold.',
  alert:'Field tip: Always keep a pair of microspikes and a shovel in your trunk from December through March, and stick to highway-accessible trailheads right after a big lake-effect storm.'
 }
};
const labels=[...document.querySelectorAll('[data-use]')].filter(e=>e.tagName==='BUTTON'),art=document.getElementById('trl-use-art');
const lb=document.getElementById('trl-use-label'),title=document.getElementById('trl-use-title'),copy=document.getElementById('trl-use-copy'),alert=document.getElementById('trl-use-alert');
labels.forEach(b=>b.addEventListener('click',()=>{
 const d=desc[b.dataset.use];if(!d)return;
 labels.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 if(art)art.dataset.use=b.dataset.use;
 if(lb)lb.textContent=d.label;
 if(title)title.textContent=d.title;
 if(copy)copy.textContent=d.copy;
 if(alert)alert.textContent=d.alert;
}));
})();
