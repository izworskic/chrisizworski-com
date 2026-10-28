/* FIELD_GUIDE_V1 Michigan First Snow Adventures: progressive filters, 4-Season Snowbelt Engine, CARTO/OSM fallback */
(()=>{'use strict';
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan first-snow destination';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The snowbelt elevation notes, backup plan and official links below remain available.';
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
const regions=document.getElementById('wf-region'),windows=document.getElementById('fsa-window'),efforts=document.getElementById('wf-effort'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');
let tag='all',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;

const message=(s,kind)=>{if(!status)return;status.textContent=s;status.dataset.state=kind||''};
const shown=()=>stories.filter(c=>!c.hidden);
const reset=()=>{
 tag='all';
 if(regions)regions.value='all';
 if(windows)windows.value='all';
 if(efforts)efforts.value='all';
 filter();
};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag||'all';filter()}));
[regions,windows,efforts].forEach(el=>el?.addEventListener('change',filter));
document.getElementById('wf-reset')?.addEventListener('click',reset);
document.getElementById('wf-show-all')?.addEventListener('click',reset);

function filter(){
 for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));
 for(const c of stories){
  const tags=(c.dataset.tag||'').split(/\s+/);
  const tagOk=tag==='all'||tags.includes(tag);
  const regOk=!regions||regions.value==='all'||c.dataset.region===regions.value;
  const winOk=!windows||windows.value==='all'||c.dataset.window===windows.value;
  const effOk=!efforts||efforts.value==='all'||c.dataset.effort===efforts.value;
  c.hidden=!(tagOk&&regOk&&winOk&&effOk);
 }
 const n=shown().length;
 if(count)count.textContent=n?`${n} of ${stories.length} researched Michigan first-snow & early-winter destinations shown. Always verify live snow depth and seasonal road closures before driving.`:'No first-snow destinations match these filters. Try another snowbelt region or activity.';
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
  if(month===12||month===1||month===2||(month===11&&day>=22))return 'winter';
  if(month===3||month===4)return 'spring';
  if(month>=5&&month<=9)return 'summer';
  return 'fall';
 }catch{return 'fall'}
}

function setSeasonView(seasonKey){
 const labels={
  fall:'First Lake-Effect Snow Window (Late Oct–Nov)',
  winter:'Deep Snowbelt & Holiday Base Window (Dec–Feb)',
  spring:'Late-Season U.P. Snowpack & Crust Window (Mar–Apr)',
  summer:'Warm-Season High Country Planning Window (May–Sep)'
 };
 const badge=document.getElementById('fsa-season-badge');
 if(badge)badge.textContent=`All 4 seasonal snowbelt guides available below · Current phase: ${labels[seasonKey]||labels.fall}`;
 document.querySelectorAll('[data-season-card]').forEach(card=>{
  const isCurrent=card.dataset.seasonCard===seasonKey;
  card.setAttribute('data-current-season',String(isCurrent));
  const pill=card.querySelector('[data-season-pill]');
  if(pill)pill.hidden=!isCurrent;
 });
}
setSeasonView(detectCurrentSeason());

const modeStage={
 lakeeffect:{
  label:'PLAYBOOK 01 · LAKE SUPERIOR EARLY LAKE-EFFECT BELTS',
  title:'Where cold northwest air over 42°F Lake Superior water drops the first deep snow',
  copy:'Michigan’s earliest natural snowpack forms where cold Canadian air crosses the relatively warm open surface of Lake Superior and rises abruptly into 1,400–1,900 foot coastal highlands. The Keweenaw Peninsula, the Gogebic Range around Ironwood/Bessemer, the Porcupine Mountains, Huron Mountains / Marquette high country, and the Munising–Tahquamenon ridge routinely record measurable snow events in late October and build skiable/snowshoeable base in November.',
  alert:'Verification rule: Early-season snow can melt between storms—always check the live Michigan Snow Depth Finder and 72-Hour Snow Totals before driving north.'
 },
 nordic:{
  label:'PLAYBOOK 02 · EARLY-SEASON NORDIC & BACKCOUNTRY CORRIDORS',
  title:'Pick smooth grassy trail beds that need only 4–6 inches of packed snow',
  copy:'Rocky backcountry footpaths need 12–18 inches of base to cover roots and cobbles, whereas mowed, rock-picked Nordic trail systems (ABR Trails in Ironwood, Swedetown in Calumet, Michigan Tech / Maasto Hiihto in Houghton, Noquemanon in Marquette, Forbush Corner / Hanson Hills near Grayling, and Vasa Pathway near Traverse City) can roll and pack skiable/snowshoeable loops on the very first 4-to-6 inch dense snow.',
  alert:'Backup rule: Pack both winter hiking boots with microspikes and snowshoes/skis during November and early December.'
 },
 waterfalls:{
  label:'PLAYBOOK 03 · EARLY-WINTER WATERFALLS & GORGE WALKS',
  title:'Visit high-flow U.P. waterfalls framed by fresh November and December snow',
  copy:'Late November and December are prime months for waterfall photography across the Upper Peninsula: autumn rain and early snowmelt keep river volume high at Upper and Lower Tahquamenon Falls, Bond Falls, Wagner Falls, and Black River Harbor waterfalls while fresh lake-effect snow blankets the surrounding hemlock and cedar gorges before mid-winter ice completely seals the chutes.',
  alert:'Safety rule: Early-winter boardwalks and gorge steps coat in black glaze ice beneath fresh powder—wear traction cleats and stay inside railings.'
 },
 plateau:{
  label:'PLAYBOOK 04 · NORTHERN LOWER 1,300-FT PLATEAU & SNOWMAKING',
  title:'How Gaylord, Boyne & Caberfae open Lower Peninsula winter weeks early',
  copy:'In the Lower Peninsula, elevation and distance from warm coastal water determine where early snow sticks. The Gaylord–Grayling–Hartwick Pines plateau (1,300–1,450 ft along I-75), the Boyne Falls / Harbor Springs / Petoskey valleys, and Caberfae Peaks (1,500+ ft in the Manistee National Forest near Cadillac) combine natural northwest lake-effect belts with sub-28°F snowmaking windows to open the earliest Lower Peninsula slopes and forest walks.',
  alert:'Backup rule: Combine early-season Northern Lower trail walks with heated vineyard igloos in Traverse City/Petoskey or Alpine Village dining in Gaylord.'
 }
};

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 const item=modeStage[btn.dataset.mode];
 if(!item)return;
 document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
 document.getElementById('fsa-mode-label').textContent=item.label;
 document.getElementById('fsa-mode-title').textContent=item.title;
 document.getElementById('fsa-mode-copy').textContent=item.copy;
 document.getElementById('fsa-mode-alert').textContent=item.alert;
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
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'First-snow destination';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' snowbelt stops here':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Regional snowbelt orientation only—never verified plowed winter parking or trailhead status.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open snowbelt destination';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   items.append(item);
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' snowbelt stops':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[24,24],maxZoom:7});else if(points.length)map.setView(points[0],7);fitOnce=true}
}

function showTiles(url,provider){
 if(!map)return;if(tiles)map.removeLayer(tiles);
 const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
 tiles=layer;let failed=0,loaded=0;
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Select any snowbelt marker.':'OpenStreetMap fallback loaded. Select any snowbelt marker.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. All 12 first-snow field notes remain readable below.','error')}});
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
 if(!window.L){message('Interactive map unavailable; browse all 12 first-snow destinations below.','error');return}
 try{
  mapNode.textContent='';
  map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([45.3,-86.2],6);
  map.on('dragstart zoomstart',()=>{userZoomed=true});
  refreshPins(true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
  connectTiles();
 }catch{message('Map could not start. Every first-snow destination remains readable.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
