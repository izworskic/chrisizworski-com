/* FIELD_GUIDE_V1 Great Lakes Winter Freighter & Harbor Guide: progressive filters, 4-Season Maritime Engine, CARTO/OSM fallback */
(()=>{'use strict';
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Great Lakes winter harbor hub';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The shore-viewing vantage points, season timing and official links below remain available.';
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
const regions=document.getElementById('wf-region'),corridors=document.getElementById('wfg-corridor'),efforts=document.getElementById('wf-effort'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');
let tag='all',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;

const message=(s,kind)=>{if(!status)return;status.textContent=s;status.dataset.state=kind||''};
const shown=()=>stories.filter(c=>!c.hidden);
const reset=()=>{
 tag='all';
 if(regions)regions.value='all';
 if(corridors)corridors.value='all';
 if(efforts)efforts.value='all';
 filter();
};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag||'all';filter()}));
[regions,corridors,efforts].forEach(el=>el?.addEventListener('change',filter));
document.getElementById('wf-reset')?.addEventListener('click',reset);
document.getElementById('wf-show-all')?.addEventListener('click',reset);

function filter(){
 for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));
 for(const c of stories){
  const tags=(c.dataset.tag||'').split(/\s+/);
  const tagOk=tag==='all'||tags.includes(tag);
  const regOk=!regions||regions.value==='all'||c.dataset.region===regions.value;
  const corOk=!corridors||corridors.value==='all'||c.dataset.corridor===corridors.value;
  const effOk=!efforts||efforts.value==='all'||c.dataset.effort===efforts.value;
  c.hidden=!(tagOk&&regOk&&corOk&&effOk);
 }
 const n=shown().length;
 if(count)count.textContent=n?`${n} of ${stories.length} researched Great Lakes winter freighter & harbor viewing hubs shown. Observe strictly from public shore overlooks; never enter private shipyards or step onto harbor ice.`:'No harbor viewing hubs match these filters. Try another lake corridor or maritime experience.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

function detectCurrentSeason(){
 try{
  const params=new URLSearchParams(window.location.search);
  const override=params.get('season');
  if(override&&['winter','spring','summer','fall'].includes(override))return override;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const month=Number(parts.find(p=>p.type==='month')?.value||1);
  const day=Number(parts.find(p=>p.type==='day')?.value||1);
  if(month===1||month===2||(month===12&&day>=26))return 'winter';
  if(month===3||month===4)return 'spring';
  if(month>=5&&month<=9)return 'summer';
  return 'fall';
 }catch{return 'fall'}
}

function setSeasonView(seasonKey){
 const labels={
  fall:'Late Fall & Closing Rush Window (Oct–Jan 15)',
  winter:'Deep Winter Layup & Lock Dewatering (Jan 16–Feb 28)',
  spring:'Spring Fit-Out, Icebreaking & March 25 Opener (Mar–Apr)',
  summer:'Open-Water Five-Lake Navigation Window (May–Sep)'
 };
 const badge=document.getElementById('wfg-season-badge');
 if(badge)badge.textContent=`All 4 seasonal maritime guides available below · Current phase: ${labels[seasonKey]||labels.fall}`;
 document.querySelectorAll('[data-season-card]').forEach(card=>{
  const isCurrent=card.dataset.seasonCard===seasonKey;
  card.setAttribute('data-current-season',String(isCurrent));
  const pill=card.querySelector('[data-season-pill]');
  if(pill)pill.hidden=!isCurrent;
 });
}
setSeasonView(detectCurrentSeason());

const modeStage={
 layup:{
  label:'PLAYBOOK 01 · WINTER LAYUP SHIPYARDS & GRAVING DOCKS',
  title:'Photograph 1,000-footers in winter berths from public bridges and boardwalks',
  copy:'When the Soo Locks close on January 15, the Great Lakes thousand-footers tie up at heavy repair shipyards and bulk terminals in Superior/Duluth, Sturgeon Bay, Milwaukee, Toledo, Sarnia, Owen Sound, and Port Colborne. While every commercial dock and shipyard is closed industrial property, public bridges in Sturgeon Bay, Barker’s Island in Superior, and inner-harbour walls in Owen Sound look directly across the water at the sleeping hulls.',
  alert:'Safety & access rule: Never enter private shipyard gates or terminal roads—use the public bridge walkways and municipal waterfront parks listed on each card.'
 },
 locks:{
  label:'PLAYBOOK 02 · SOO LOCKS & WELLAND CANAL CLOSINGS / REOPENINGS',
  title:'Time the January 15 final lockage and the March 25 First Boat ceremony',
  copy:'Two calendar dates govern the entire upper-lakes shipping year: January 15 (when the U.S. Army Corps of Engineers closes and dewaters the Poe Lock at Sault Ste. Marie for 10 weeks of winter floor and gate maintenance) and March 25 (when the locks reopen and waiting freighters race into Lake Superior). On the lower lakes, the Welland Canal closes in late December / early January and hosts winter "Top Hat" lock tours at Lock 3 in St. Catharines and Port Colborne.',
  alert:'Backup rule: Pair any winter trip to Sault Ste. Marie with Tahquamenon Falls (45 minutes west) and the live Soo Locks vessel schedule.'
 },
 icebreakers:{
  label:'PLAYBOOK 03 · USCG ICEBREAKING & WINTER RIVER RUNS',
  title:'Watch cutters and winter coal/salt shuttles on the rivers and Straits',
  copy:'Even during the deep-winter Soo Locks closure, shipping never completely stops on the lower rivers. U.S. and Canadian Coast Guard icebreakers (USCGC Mackinaw, Bristol Bay, Neah Bay, Morro Bay, CCGS Samuel Risley) carve tracks through the St. Clair River (Port Huron/Sarnia), Detroit River, Straits of Mackinac, and Green Bay, escorting winter tug-barges and early-March breakout convoys.',
  alert:'Safety rule: Icebreaker wakes fracture shoreline ice hundreds of yards away—never walk onto river or harbor ice anywhere near shipping channels.'
 },
 museums:{
  label:'PLAYBOOK 04 · MUSEUM FREIGHTERS & ALL-WEATHER MARITIME HUBS',
  title:'Combine outdoor harbor watching with indoor museum ships and visitor centers',
  copy:'Subzero wind off Lake Superior or Lake Huron makes a 20-minute shore watch feel like an hour. Anchor your winter maritime road trip around harbors that pair public ship overlooks with warm indoor maritime centers: the Lake Superior Maritime Visitor Center in Duluth Canal Park, the Soo Locks Visitor Center corridor, the Door County Maritime Museum beside Sturgeon Bay’s bridges, and the National Museum of the Great Lakes (Col. James M. Schoonmaker) in Toledo.',
  alert:'Backup rule: Check winter museum hours before driving; when outdoor piers are glazed in ice, stay inside heated observation decks and waterfront parks.'
 }
};

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 const item=modeStage[btn.dataset.mode];
 if(!item)return;
 document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
 document.getElementById('wfg-mode-label').textContent=item.label;
 document.getElementById('wfg-mode-title').textContent=item.title;
 document.getElementById('wfg-mode-copy').textContent=item.copy;
 document.getElementById('wfg-mode-alert').textContent=item.alert;
}));

function refreshPins(initial){
 if(!map||!window.L)return;
 markers.forEach(m=>map.removeLayer(m));markers=[];
 const groups=new Map();
 for(const card of shown()){
  const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
  const key=lat.toFixed(4)+','+lng.toFixed(4);
  if(!groups.has(key))groups.set(key,{lat,lng,cards:[]});
  groups.get(key).cards.push(card);
 }
 const points=[];
 for(const group of groups.values()){
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Winter harbor hub';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' harbor hubs here':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Approximate harbor reference only—never a private shipyard gate, berth coordinate or safe ice route.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open harbor hub';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   items.append(item);
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' harbor hubs':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[24,24],maxZoom:6});else if(points.length)map.setView(points[0],7);fitOnce=true}
}

function showTiles(url,provider){
 if(!map)return;if(tiles)map.removeLayer(tiles);
 const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
 tiles=layer;let failed=0,loaded=0;
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Select any winter harbor marker.':'OpenStreetMap fallback loaded. Select any winter harbor marker.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. All 12 winter harbor field notes remain readable below.','error')}});
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
 if(!window.L){message('Interactive map unavailable; browse all 12 winter harbor hubs below.','error');return}
 try{
  mapNode.textContent='';
  map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([44.9,-85.5],5);
  map.on('dragstart zoomstart',()=>{userZoomed=true});
  refreshPins(true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
  connectTiles();
 }catch{message('Map could not start. Every winter harbor destination remains readable.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
