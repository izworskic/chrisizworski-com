/* FIELD_GUIDE_V1 Michigan White Christmas & Christmas-Week Escapes: 4 visual holiday doors, Climatology Blueprint, CARTO/OSM fallback */
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
for(const im of document.querySelectorAll('.wf-photo img, .wce-door-media img')){
 let fallbackAttempted=false;
 const fail=()=>{if(!fallbackAttempted&&im.dataset.fallbackSrc){fallbackAttempted=true;im.dataset.fallbackUsed='yes';im.src=im.dataset.fallbackSrc;return;}revealPhotoFallback(im)};
 im.addEventListener('error',fail);
 if(im.complete&&im.naturalWidth===0)fail();
}

const stories=[...document.querySelectorAll('.wf-story')];if(!stories.length)return;
const regions=document.getElementById('wf-region'),efforts=document.getElementById('wf-effort'),chips=[...document.querySelectorAll('.wf-chip')],doors=[...document.querySelectorAll('[data-door]')],count=document.getElementById('wf-count'),empty=document.getElementById('wf-empty'),mapNode=document.getElementById('wf-map'),status=document.getElementById('wf-map-message');
let tag='all',map=null,markers=[],tiles=null,userZoomed=false,fitOnce=false;

const message=(s,kind)=>{if(!status)return;status.textContent=s;status.dataset.state=kind||''};
const shown=()=>stories.filter(c=>!c.hidden);
const reset=()=>{
 tag='all';
 if(regions)regions.value='all';
 if(efforts)efforts.value='all';
 filter();
};
chips.forEach(b=>b.addEventListener('click',()=>{tag=b.dataset.tag||'all';filter()}));
doors.forEach(card=>{
 const btn=card.querySelector('[data-door-filter]');
 if(!btn)return;
 btn.addEventListener('click',()=>{
  const nextTag=card.dataset.door||'all';
  tag=nextTag;
  if(regions)regions.value='all';
  if(efforts)efforts.value='all';
  filter();
  const target=document.getElementById('find-escape');
  if(target)target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 });
});
[regions,efforts].forEach(el=>el?.addEventListener('change',filter));
document.getElementById('wf-reset')?.addEventListener('click',reset);
document.getElementById('wf-show-all')?.addEventListener('click',reset);

function filter(){
 for(const b of chips)b.setAttribute('aria-pressed',String(b.dataset.tag===tag));
 for(const d of doors)d.setAttribute('data-active-door',String(d.dataset.door===tag));
 for(const c of stories){
  const tags=(c.dataset.tag||'').split(/\s+/);
  const tagOk=tag==='all'||tags.includes(tag);
  const regOk=!regions||regions.value==='all'||c.dataset.region===regions.value;
  const effOk=!efforts||efforts.value==='all'||c.dataset.effort===efforts.value;
  c.hidden=!(tagOk&&regOk&&effOk);
 }
 const n=shown().length;
 if(count)count.textContent=n?`${n} of ${stories.length} researched Michigan Christmas-week escape towns shown. Historical NOAA odds do not guarantee current-year December 25 snow.`:'No Christmas-week towns match these filters. Try another probability tier or region.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

const blueprintStage={
 noaa:{
  label:'CLIMATOLOGY 01 · THE NOAA 1-INCH SNOW-DEPTH RULE (1991–2020)',
  title:'Why Marquette is ~96% while Metro Detroit is 34.7%',
  copy:'NOAA defines an official White Christmas as at least 1 inch of snow on the ground at 7:00 AM on December 25—not necessarily snow falling that morning. In the 1991–2020 U.S. Climate Normals, Detroit sits at 34.7% and Saginaw at 45.7% because mid-December Ohio Valley rain systems regularly wash away early southern snowpacks. North of the 45th parallel and along Lake Superior, cold northwest winds over 39°F open water replenish snowpack all December, pushing Gaylord to ~75–80% and Marquette/Keweenaw to ~95–96%.',
  foot:'Decision rule: Use historical NOAA odds when booking Christmas lodging in October or November; switch to live snowpack inside 45 days.',
  links:[
   {label:'Open White Christmas Calculator ↗',href:'/national-tools/white-christmas/'},
   {label:'Open Michigan Station Breakdown ↗',href:'/white-christmas-michigan/'},
   {label:'Open NOAA Probability Map ↗',href:'/white-christmas-probability-map/'}
  ]
 },
 windows:{
  label:'CLIMATOLOGY 02 · THE 3 HOLIDAY DECISION WINDOWS',
  title:'When to look at history vs. ground snowpack vs. 7-day NWS forecasts',
  copy:'Holiday weather planning fails when travelers use the wrong signal at the wrong time. (1) More than 45 days before December 25, use 30-year NOAA station climatology to pick a high-probability snowbelt or a snowmaking resort. (2) Between November 11 and December 17 (the 45-day window), check NOHRSC observed snow depth—deep early U.P. snowpack survives brief warm-ups. (3) Inside 7 days (December 18–25), check local National Weather Service rain vs. snow forecasts.',
  foot:'Decision rule: Never treat a 30-year historical percentage as a Christmas Eve weather forecast.',
  links:[
   {label:'Open Christmas 2026 Forecast Outlook ↗',href:'/national-tools/white-christmas/forecast/'},
   {label:'Open Michigan Snow Depth Finder ↗',href:'/michigan-snow-depth/'},
   {label:'Open White Christmas Calculator ↗',href:'/national-tools/white-christmas/'}
  ]
 },
 snowmaking:{
  label:'CLIMATOLOGY 03 · MACHINE SNOWMAKING & ELEVATION INSURANCE',
  title:'How Northern Michigan ski resorts save mild El Niño Decembers',
  copy:'Even during a warm December when natural woods trails in southern and central Michigan turn bare, high-capacity fan guns at Boyne Mountain, The Highlands at Harbor Springs, Nub\'s Nob, Treetops, Crystal Mountain, Marquette Mountain, and Mont Ripley build deep machine-snow bases whenever overnight wet-bulb temperatures dip below 28°F. Pairing a 70%+ snowbelt town with a snowmaking resort gives families guaranteed holiday snow play.',
  foot:'Decision rule: Book a base town with both natural lake-effect elevation and a commercial snowmaking hill within 20 minutes.',
  links:[
   {label:'Compare Michigan Ski Hills ↗',href:'/michigan-ski-hills/'},
   {label:'Open Cross-Country Ski Finder ↗',href:'/michigan-cross-country-skiing/'},
   {label:'Open Winter Weekend Getaways ↗',href:'/michigan-winter-weekends/'}
  ]
 },
 logistics:{
  label:'CLIMATOLOGY 04 · CHRISTMAS-TO-NEW-YEAR WEEK RESERVATIONS & ROAD RULES',
  title:'December 24–25 closures vs. December 26–January 1 peak week',
  copy:'Many Michigan tasting rooms, museums, and independent restaurants close on Christmas Eve afternoon and Christmas Day, then reopen at full throttle from December 26 through New Year\'s Day. Reserve heated vineyard igloos (Traverse City/Petoskey), ski rentals, and Frankenmuth dining weeks ahead. Before driving north up I-75 or across the Mackinac Bridge, verify live MDOT MiDrive plows and bridge wind advisories.',
  foot:'Decision rule: Always pack a full tank of fuel, winter wiper fluid, traction cleats, and a town-based no-snow backup.',
  links:[
   {label:'Open Wine, Cider & Spirits Igloo Guide ↗',href:'/michigan-wine-cider-spirits/'},
   {label:'Open Michigan Winter Activities ↗',href:'/michigan-winter-activities/'},
   {label:'Open First Snow Adventures ↗',href:'/michigan-first-snow-adventures/'}
  ]
 }
};

document.querySelectorAll('[data-blueprint]').forEach(btn=>btn.addEventListener('click',()=>{
 const item=blueprintStage[btn.dataset.blueprint];
 if(!item)return;
 document.querySelectorAll('[data-blueprint]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
 document.getElementById('wce-blueprint-label').textContent=item.label;
 document.getElementById('wce-blueprint-title').textContent=item.title;
 document.getElementById('wce-blueprint-copy').textContent=item.copy;
 document.getElementById('wce-blueprint-foot').textContent=item.foot;
 const linksWrap=document.getElementById('wce-blueprint-links');
 if(linksWrap&&Array.isArray(item.links)){
  linksWrap.textContent='';
  for(const l of item.links){
   const a=document.createElement('a');
   a.href=l.href;
   a.textContent=l.label;
   linksWrap.append(a);
  }
 }
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
