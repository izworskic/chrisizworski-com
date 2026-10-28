/* FIELD_GUIDE_V1 Michigan White Christmas & Christmas-Week Escapes: progressive filters, Christmas Countdown Engine, CARTO/OSM fallback */
(()=>{'use strict';
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan Christmas-week escape';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The NOAA climatology, backup itinerary and live calculator links below remain available.';
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
const regions=document.getElementById('wf-region'),efforts=document.getElementById('wf-effort'),seasonSelect=document.getElementById('wce-season'),chips=[...document.querySelectorAll('.wf-chip')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');
let tag='all',activeSeasonTab='early',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;

const message=(s,kind)=>{if(!status)return;status.textContent=s;status.dataset.state=kind||''};
const shown=()=>stories.filter(c=>!c.hidden);
const reset=()=>{
 tag='all';
 if(regions)regions.value='all';
 if(efforts)efforts.value='all';
 if(seasonSelect)seasonSelect.value='all';
 filter();
};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag||'all';filter()}));
[regions,efforts,seasonSelect].forEach(el=>el?.addEventListener('change',filter));
document.getElementById('wf-reset')?.addEventListener('click',reset);
document.getElementById('wf-show-all')?.addEventListener('click',reset);

function filter(){
 for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));
 for(const c of stories){
  const tags=(c.dataset.tag||'').split(/\s+/);
  const seasons=(c.dataset.seasons||'').split(/\s+/);
  const tagOk=tag==='all'||tags.includes(tag);
  const regOk=!regions||regions.value==='all'||c.dataset.region===regions.value;
  const effOk=!efforts||efforts.value==='all'||c.dataset.effort===efforts.value;
  const seaOk=!seasonSelect||seasonSelect.value==='all'||seasons.includes(seasonSelect.value);
  c.hidden=!(tagOk&&regOk&&effOk&&seaOk);
 }
 const n=shown().length;
 if(count)count.textContent=n?`${n} of ${stories.length} researched Michigan Christmas-week escape towns shown. Historical NOAA odds do not guarantee current-year December 25 snow.`:'No Christmas-week towns match these filters. Try another probability tier or region.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

const seasonProfiles={
 early:{
  badge:'Auto-calibrated to Michigan calendar · Pre-Holiday Climatology & Lodging Window (Oct–Nov 10)',
  title:'Use NOAA 30-Year Climatology & Machine-Snow Backups to Pick Your Holiday Base',
  copy:'More than 45 days before December 25, no weather model can predict Christmas Day snowfall for a specific street. Right now, your strongest decision signal is NOAA 1991–2020 1-inch snow-depth climatology: choose 90%+ Upper Peninsula towns (Marquette, Houghton, Ironwood, Munising), 65–80% Northern Lower snowbelts with resort snowmaking (Gaylord, Petoskey/Boyne, Traverse City), or holiday-lights towns that shine even without snow (Frankenmuth).',
  picks:'<strong>Best holiday bases to book now:</strong> <a href="#stop-1">Marquette (~96%)</a> · <a href="#stop-2">Houghton &amp; Keweenaw (95%+)</a> · <a href="#stop-6">Gaylord &amp; Otsego (75–80%)</a> · <a href="#stop-7">Petoskey &amp; Boyne (68–72%)</a> · <a href="#stop-8">Traverse City (60–65%)</a> · <a href="#stop-9">Frankenmuth Lights</a>',
  btnLabel:'Filter towns for early holiday booking ↓'
 },
 pack:{
  badge:'Auto-calibrated to Michigan calendar · 45-Day Snowpack Build Window (Nov 11–Dec 17)',
  title:'Existing NOHRSC Ground Snowpack Joins Historical Climatology',
  copy:'Inside 45 days of Christmas, surviving snow on the ground begins shifting local White Christmas odds above or below the 30-year baseline. Track early lake-effect snowpack across the Upper Peninsula and Gaylord/Boyne plateau using the Michigan Snow Depth Finder and the White Christmas Calculator.',
  picks:'<strong>Watch early snowpack in:</strong> <a href="#stop-1">Marquette</a> · <a href="#stop-2">Houghton</a> · <a href="#stop-3">Ironwood &amp; Porkies</a> · <a href="#stop-4">Munising</a> · <a href="#stop-6">Gaylord &amp; Hartwick Pines</a> · <a href="#stop-7">Petoskey &amp; Boyne</a>',
  btnLabel:'Filter to 10 snowpack-tracked towns ↓'
 },
 forecast:{
  badge:'Auto-calibrated to Michigan calendar · 7-Day NWS Christmas Forecast Lock-In (Dec 18–25)',
  title:'Short-Range NWS Snow vs. Rain & Temperature Forecasts Now Decide the Outcome',
  copy:'Inside the final week before December 25, local National Weather Service hourly forecasts for rain, snow, and above-freezing dewpoints overtake historical climatology. Check whether existing snowpack will survive through Christmas morning or if a lake-effect band will whiten the ground on Christmas Eve.',
  picks:'<strong>Check final Christmas-week conditions:</strong> <a href="#stop-1">Marquette</a> · <a href="#stop-6">Gaylord</a> · <a href="#stop-7">Petoskey &amp; Boyne</a> · <a href="#stop-8">Traverse City</a> · <a href="#stop-9">Frankenmuth</a> · <a href="#stop-10">Muskegon &amp; West Coast</a>',
  btnLabel:'Filter to Christmas-week escapes ↓'
 },
 post:{
  badge:'Auto-calibrated to Michigan calendar · New Year Week & Deep Winter Window (Dec 26–Mar)',
  title:'Christmas-to-New-Year Escapes & Peak January–March Snowpack',
  copy:'Between December 26 and March, Michigan enters its deepest snowpack and ice-formation window. Use these same 10 holiday escape towns for New Year’s week ski trips, January/February ice curtain expeditions in Munising and Tahquamenon, and early-bird planning for next Christmas.',
  picks:'<strong>Top New Year &amp; Deep Winter towns:</strong> <a href="#stop-1">Marquette</a> · <a href="#stop-2">Houghton</a> · <a href="#stop-4">Munising Ice Curtains</a> · <a href="#stop-5">Tahquamenon Falls</a> · <a href="#stop-7">Petoskey &amp; Boyne</a> · <a href="#stop-8">Traverse City Igloos</a>',
  btnLabel:'Filter to all 10 winter escape towns ↓'
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
  if(month===10||(month===11&&day<=10))return 'early';
  if((month===11&&day>=11)||(month===12&&day<=17))return 'pack';
  if(month===12&&day>=18&&day<=25)return 'forecast';
  return 'post';
 }catch{return 'early'}
}

function setSeasonView(seasonKey){
 const active=seasonKey in seasonProfiles?seasonKey:'early';
 const profile=seasonProfiles[active]||seasonProfiles.early;
 const badge=document.getElementById('wce-season-badge');
 if(badge)badge.textContent=`All 4 holiday planning windows available below · ${profile.badge.split('·')[1]?.trim()||'Michigan calendar'}`;
 document.querySelectorAll('[data-season-card]').forEach(card=>{
  const isCurrent=card.dataset.seasonCard===active;
  card.setAttribute('data-current-season',String(isCurrent));
  const pill=card.querySelector('[data-season-pill]');
  if(pill)pill.hidden=!isCurrent;
 });
}
setSeasonView(detectCurrentSeason());

const modeStage={
 up90:{
  label:'TIER 01 · 90%–96% UPPER PENINSULA SUPERIOR SNOWBELTS',
  title:'Near-certain December 25 snowpack along Lake Superior',
  copy:'In NOAA\'s 1991–2020 U.S. Climate Normals, the Lake Superior snowbelt across Michigan\'s Upper Peninsula ranks among the most reliable White Christmas zones in North America outside the high Rockies. Marquette (~96%), Houghton/Hancock (95%+), the Ironwood/Porcupine Mountains Gogebic Range (92%+), Munising (90%+), and Sault Ste. Marie/Tahquamenon (~88%) regularly build multi-foot lake-effect bases before winter solstice.',
  alert:'Travel rule: Pack winter emergency gear, check MDOT MiDrive and Mackinac Bridge wind advisories, and always keep a town-based backup plan if a Christmas Eve blizzard closes rural U.P. trailheads.'
 },
 north70:{
  label:'TIER 02 · 60%–80% NORTHERN LOWER PLATEAU, SKI HILLS & BAYS',
  title:'Combine high-plateau lake-effect snow with resort snowmaking',
  copy:'If you want strong White Christmas odds without driving into the Upper Peninsula, target Northern Lower Michigan\'s inland elevation and snowmaking resorts. Gaylord and Grayling sit above 1,300 feet along I-75 (~75–80% historical odds), Petoskey, Harbor Springs, and Boyne (~68–72%) add massive resort snowmaking at Boyne Mountain, The Highlands, and Nub\'s Nob, and Traverse City / Sleeping Bear (~60–65%) pairs coastal moraine snow with heated vineyard igloos.',
  alert:'Travel rule: Even in a warm El Niño December when natural woods snow is thin, Northern Michigan ski resorts keep machine-made slopes open for Christmas week.'
 },
 lights:{
  label:'TIER 03 · 40%–51% HOLIDAY LIGHTS, LUGE & NO-SNOW PROOF TOWNS',
  title:'Enjoy 100% Christmas spirit even when southern snow is a coin flip',
  copy:'Across East-Central and West Michigan, historical December 25 snow cover is roughly a 40% to 51% proposition (Saginaw 45.7%, Flint 51.1%, West Coast ~38–45%). Frankenmuth (Bronner\'s CHRISTmas Wonderland, Main Street lights, Bavarian inns) and Muskegon State Park (Winter Sports Complex luge/skating + dune trails) guarantee a memorable Christmas-week outing regardless of the thermometer.',
  alert:'Travel rule: Use Frankenmuth or Bay City as an easy I-75 base, then check the Michigan Snow Depth tool for a 90-minute day trip north to Hartwick Pines if you want forest snow.'
 },
 south35:{
  label:'TIER 04 · WHY DETROIT (34.7%) & SOUTHERN MICHIGAN FLIP YEAR TO YEAR',
  title:'One December rainstorm can erase an early southern Michigan snowpack',
  copy:'Why does Metro Detroit only average a 34.7% White Christmas in the 1991–2020 normals? Southeast Michigan sits on the leeward side of the state, shielded from northwest Lake Michigan lake-effect bands and exposed to mild Ohio Valley rain systems in mid-December. A 6-inch snowstorm on December 10 often melts completely before December 24 unless sub-freezing air locks in.',
  alert:'Travel rule: Check your exact southern Michigan ZIP in our White Christmas Calculator, and inside 7 days of Christmas switch to the live Christmas 2026 Forecast Outlook.'
 }
};

document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 const item=modeStage[btn.dataset.mode];
 if(!item)return;
 document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
 document.getElementById('wce-mode-label').textContent=item.label;
 document.getElementById('wce-mode-title').textContent=item.title;
 document.getElementById('wce-mode-copy').textContent=item.copy;
 document.getElementById('wce-mode-alert').textContent=item.alert;
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
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Christmas-week town';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' holiday stops here':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Regional town marker only. Verify current snow depth, road conditions and official park sources; never use this pin as verified winter parking.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open town note';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   const view=document.createElement('a');
   const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
   view.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
   view.target='_blank';view.rel='noopener noreferrer';view.className='wce-popup-map-link';
   view.textContent='View geographic area · not parking ↗';
   item.append(' · ',view);items.append(item);
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' holiday stops':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[24,24],maxZoom:7});else if(points.length)map.setView(points[0],7);fitOnce=true}
}

function showTiles(url,provider){
 if(!map)return;if(tiles)map.removeLayer(tiles);
 const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
 tiles=layer;let failed=0,loaded=0;
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Select any Christmas-week town marker.':'OpenStreetMap fallback loaded. Select any Christmas-week town marker.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. All 10 Christmas-week town notes remain readable below.','error')}});
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
 if(!window.L){message('Interactive map unavailable; browse all 10 Christmas-week towns below.','error');return}
 try{
  mapNode.textContent='';
  map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([44.9,-85.5],6);
  map.on('dragstart zoomstart',()=>{userZoomed=true});
  refreshPins(true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
  connectTiles();
 }catch{message('Map could not start. Every Christmas-week town remains readable.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
