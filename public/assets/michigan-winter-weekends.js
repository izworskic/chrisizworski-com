/* FIELD_GUIDE_V1 Michigan Winter Weekend Getaways: progressive filters, Automatic 4-Season Engine, CARTO/OSM fallback */
(()=>{'use strict';
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan winter weekend base';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The weekend itinerary, backup plan and official links below remain available.';
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
const regions=document.getElementById('wf-region'),drives=document.getElementById('wkd-drive'),efforts=document.getElementById('wf-effort'),seasonSelect=document.getElementById('wkd-season'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');
let tag='all',activeSeasonTab='winter',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;

const message=(s,kind)=>{if(!status)return;status.textContent=s;status.dataset.state=kind||''};
const shown=()=>stories.filter(c=>!c.hidden);
const reset=()=>{
 tag='all';
 if(regions)regions.value='all';
 if(drives)drives.value='all';
 if(efforts)efforts.value='all';
 if(seasonSelect)seasonSelect.value='all';
 filter();
};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag||'all';filter()}));
[regions,drives,efforts,seasonSelect].forEach(el=>el?.addEventListener('change',filter));
document.getElementById('wf-reset')?.addEventListener('click',reset);
document.getElementById('wf-show-all')?.addEventListener('click',reset);

function filter(){
 for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));
 for(const c of stories){
  const tags=(c.dataset.tag||'').split(/\s+/);
  const seasons=(c.dataset.seasons||'').split(/\s+/);
  const tagOk=tag==='all'||tags.includes(tag);
  const regOk=!regions||regions.value==='all'||c.dataset.region===regions.value;
  const drvOk=!drives||drives.value==='all'||c.dataset.drive===drives.value;
  const effOk=!efforts||efforts.value==='all'||c.dataset.effort===efforts.value;
  const seaOk=!seasonSelect||seasonSelect.value==='all'||seasons.includes(seasonSelect.value);
  c.hidden=!(tagOk&&regOk&&drvOk&&effOk&&seaOk);
 }
 const n=shown().length;
 if(count)count.textContent=n?`${n} of ${stories.length} researched Michigan winter weekend getaways shown. Check road conditions, seasonal closures and official sources before travel.`:'No weekend getaways match these filters. Try another region, drive window or vibe.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

const seasonProfiles={
 winter:{
  badge:'Auto-calibrated to Michigan calendar · Peak Winter & Holiday Window (Dec–Feb)',
  title:'Deep Snowbelt Ski Weekends, Ice Curtains, Groomed Loops & Heated Igloos',
  copy:'Automatic seasonal focus for December through February: Lake Superior ice curtains and frozen waterfalls in Munising and Tahquamenon, deep snowpack Nordic and downhill weekends in Marquette, the Porkies, Houghton, Gaylord, and Boyne, plus snowshoe-and-sip vineyard igloos in Traverse City and Petoskey.',
  picks:'<strong>Top weekend bases for Peak Winter:</strong> <a href="#stop-1">Munising &amp; Pictured Rocks</a> · <a href="#stop-2">Marquette</a> · <a href="#stop-6">Traverse City &amp; Leelanau</a> · <a href="#stop-7">Petoskey &amp; Boyne</a> · <a href="#stop-9">Gaylord &amp; Hartwick Pines</a> · <a href="#stop-11">Muskegon Luge &amp; Silver Lake</a>',
  btnLabel:'Filter to all 12 Winter weekend bases ↓'
 },
 fall:{
  badge:'Auto-calibrated to Michigan calendar · Late Fall & First Snow Window (Oct–Nov)',
  title:'Early U.P. Lake-Effect Snowbelts, Tahquamenon Waterfalls, Freighters & Holiday Lights',
  copy:'In late October and November, winter arrives first in the Upper Peninsula snowbelts (Marquette, Houghton, Porkies, Munising) while Lower Peninsula weekends shine at Tahquamenon Falls, Sault Ste. Marie late-season freighter passages, Traverse City/Petoskey tasting rooms, and Saginaw Bay / Frankenmuth holiday lights.',
  picks:'<strong>Top weekend bases for Late Fall &amp; First Snow:</strong> <a href="#stop-5">Tahquamenon &amp; Soo Locks</a> · <a href="#stop-2">Marquette</a> · <a href="#stop-6">Traverse City Wine &amp; Trails</a> · <a href="#stop-12">Saginaw Bay &amp; Frankenmuth</a> · <a href="#stop-9">Hartwick Pines</a>',
  btnLabel:'Filter to 12 Late-Fall & Early-Winter bases ↓'
 },
 spring:{
  badge:'Auto-calibrated to Michigan calendar · Late Winter Crust, Ice-Out & Maple Thaw (Mar–Apr)',
  title:'March U.P. Spring Skiing, Maximum Ice Curtains, Maple Sap Runs & Migrating Birds',
  copy:'March is still deep winter across Upper Peninsula snowbelts and northern ski resorts (Marquette, Houghton, Porkies, Boyne, Munising ice curtains), while southern and central Lower Michigan transitions to maple sugaring, Tawas Point / Saginaw Bay waterfowl migration, and the March 25 Soo Locks reopening.',
  picks:'<strong>Top weekend bases for Late Winter &amp; Thaw:</strong> <a href="#stop-1">Munising March Ice</a> · <a href="#stop-4">Houghton &amp; Keweenaw</a> · <a href="#stop-5">Soo Locks March 25 Opener</a> · <a href="#stop-10">Tawas Point Birding</a> · <a href="#stop-12">Saginaw Bay Migration</a>',
  btnLabel:'Filter to 12 Late-Winter & Spring bases ↓'
 },
 summer:{
  badge:'Auto-calibrated to Michigan calendar · Warm-Season Circle Tour & Shoreline Window (May–Sep)',
  title:'Lake Superior Circle Tour Base Towns, Sleeping Bear Dunes & Bay Vineyards',
  copy:'Outside the snow season, these same 12 Michigan base towns anchor Lake Superior Circle Tour road trips, Pictured Rocks boat cruises, Porcupine Mountains backpacking, Mackinac Straits crossings, and Grand Traverse / Little Traverse Bay patio wine trails.',
  picks:'<strong>Top year-round base towns:</strong> <a href="#stop-2">Marquette</a> · <a href="#stop-3">Porcupine Mountains</a> · <a href="#stop-6">Traverse City</a> · <a href="#stop-7">Petoskey &amp; Harbor Springs</a> · <a href="#stop-8">Mackinac Straits</a>',
  btnLabel:'Filter to multi-season base towns ↓'
 }
};

function detectCurrentSeason(){
 try{
  const params=new URLSearchParams(window.location.search);
  const override=params.get('season');
  if(override&&seasonProfiles[override])return override;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const month=Number(parts.find(p=>p.type==='month')?.value||1);
  const day=Number(parts.find(p=>p.type==='day')?.value||1);
  if(month===12||month===1||month===2||(month===11&&day>=20))return 'winter';
  if(month===3||month===4)return 'spring';
  if(month>=5&&month<=9)return 'summer';
  return 'fall';
 }catch{return 'winter'}
}

function setSeasonView(seasonKey){
 const active=seasonKey in seasonProfiles?seasonKey:'winter';
 const profile=seasonProfiles[active]||seasonProfiles.winter;
 const badge=document.getElementById('wkd-season-badge');
 if(badge)badge.textContent=`All 4 seasonal weekend guides available below · ${profile.badge.split('·')[1]?.trim()||'Michigan calendar'}`;
 document.querySelectorAll('[data-season-card]').forEach(card=>{
  const isCurrent=card.dataset.seasonCard===active;
  card.setAttribute('data-current-season',String(isCurrent));
  const pill=card.querySelector('[data-season-pill]');
  if(pill)pill.hidden=!isCurrent;
 });
}
setSeasonView(detectCurrentSeason());

const modeStage={
 snowbelt:{
  label:'PLAYBOOK 01 · GUARANTEED SNOWBELT & SKI TOWNS',
  title:'Chase lake-effect elevation when southern Michigan is bare',
  copy:'When southern Lower Michigan sits in 40°F rain or brown grass, elevation and cold northwest fetch across Lake Superior and Lake Michigan build reliable winter bases further north. In the Upper Peninsula, Marquette, Munising, Houghton/Keweenaw, and the Porcupine Mountains average 140 to 250+ inches of seasonal snow. In the Northern Lower Peninsula, the Gaylord-Grayling plateau (over 1,300 feet elevation along I-75) and the Boyne-Petoskey hills combine lake-effect belts with high-capacity resort snowmaking.',
  alert:'Backup rule: If a heavy lake-effect warning makes rural trailhead roads impassable, pivot to town-adjacent groomed loops (Vasa Pathway, Hartwick Pines, Munising Snowshoe Trail) or lift-served resort slopes.'
 },
 ice:{
  label:'PLAYBOOK 02 · FROZEN WATERFALLS, ICE CURTAINS & LUGE',
  title:'Time inland cliff ice and waterfalls to cumulative cold, not a single storm',
  copy:'Upper Tahquamenon Falls thunders year-round through amber ice banks as early as December, whereas Pictured Rocks sandstone seepage curtains (Sand Point Road) and Eben Ice Caves build progressively from late December through February and March. In West Michigan, Muskegon State Park chills its natural outdoor ice luge track and lights its dune-forest XC loops whenever winter cold locks in.',
  alert:'Backup rule: Always view Great Lakes shoreline ice and harbor piers from safe land overlooks—never walk onto shelf ice or frozen bay channels.'
 },
 cozy:{
  label:'PLAYBOOK 03 · COZY HARBOR TOWNS, HEATED IGLOOS & HOLIDAY LIGHTS',
  title:'Pair morning trails with heated vineyard domes and walkable downtowns',
  copy:'For couples and mixed groups who want outdoor winter scenery without an all-day backcountry expedition, Traverse City (Old Mission & Leelanau peninsulas), Petoskey/Harbor Springs, and Frankenmuth/Bay City deliver guaranteed afternoon comfort. Snowshoe a 1-to-2 mile vineyard or state park loop before 2:00 PM, step into a reserved heated vineyard igloo at 3:00 PM, and move to a walkable downtown distillery or Bavarian inn after sunset at 5:00 PM.',
  alert:'Backup rule: Book heated vineyard igloos and seated domes ahead of time, and pick one peninsula or bay corridor per afternoon rather than crisscrossing icy highways.'
 },
 wildlife:{
  label:'PLAYBOOK 04 · WINTER EAGLES, FREIGHTER LAYUPS & DARK SKIES',
  title:'Follow open-water wildlife corridors, winter harbor layups & clear northern nights',
  copy:'Even when trail snow is thin or crusty, winter concentrates bald eagles and waterfowl along open-water river dams on the Au Sable River (Oscoda/Tawas) and the Saginaw River / Shiawassee flats. Up north, Headlands International Dark Sky Park near Mackinaw City offers year-round aurora and Milky Way horizons over the Straits, while Sault Ste. Marie and the Winter Layup guide track the Great Lakes freighter fleet into winter berths.',
  alert:'Backup rule: Bring binoculars or a spotting scope so you can watch wintering eagles and waterfowl from parked pull-offs without flushing resting birds in sub-freezing cold.'
 }
};

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 const item=modeStage[btn.dataset.mode];
 if(!item)return;
 document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
 document.getElementById('wkd-mode-label').textContent=item.label;
 document.getElementById('wkd-mode-title').textContent=item.title;
 document.getElementById('wkd-mode-copy').textContent=item.copy;
 document.getElementById('wkd-mode-alert').textContent=item.alert;
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
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Weekend destination';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' weekend bases here':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Regional destination orientation only. Check road conditions and official park sources; never use this pin as verified winter parking.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open weekend base';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   const view=document.createElement('a');
   const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
   view.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
   view.target='_blank';view.rel='noopener noreferrer';view.className='wkd-popup-map-link';
   view.textContent='View geographic area · not parking ↗';
   item.append(' · ',view);items.append(item);
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' weekend bases':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[24,24],maxZoom:7});else if(points.length)map.setView(points[0],7);fitOnce=true}
}

function showTiles(url,provider){
 if(!map)return;if(tiles)map.removeLayer(tiles);
 const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
 tiles=layer;let failed=0,loaded=0;
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Select any weekend base marker.':'OpenStreetMap fallback loaded. Select any weekend base marker.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. All 12 weekend getaway field notes remain readable below.','error')}});
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
 if(!window.L){message('Interactive map unavailable; browse all 12 weekend bases below.','error');return}
 try{
  mapNode.textContent='';
  map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([44.9,-85.5],6);
  map.on('dragstart zoomstart',()=>{userZoomed=true});
  refreshPins(true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
  connectTiles();
 }catch{message('Map could not start. Every weekend destination remains readable.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
