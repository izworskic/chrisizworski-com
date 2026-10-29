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
 if(count)count.textContent=n?`Showing ${n} of ${stories.length} Michigan Christmas-week escape towns. Use the 30-year NOAA odds to book early, then check live snow depth inside 45 days.`:'No Christmas-week towns match that exact combination. Try another probability tier or region.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

const blueprintStage={
 noaa:{
  label:'FIELD LESSON 01 · HOW THE NOAA 1-INCH RULE ACTUALLY WORKS',
  title:'Why Marquette is a 96% lock while Metro Detroit is a 1-in-3 coin flip',
  copy:'Most people assume a "White Christmas" means fresh flakes falling out of the sky on December 25. Climatologists measure something much more practical: whether at least 1 inch of snow is sitting on the ground at 7:00 AM on Christmas morning across NOAA\'s 1991–2020 climate normals. Down in Metro Detroit (34.7%) or here around Saginaw Bay (45.7%), a single December rainstorm tracking up from the Ohio Valley regularly washes our early snowpack down the storm drains. Once you drive north of the 45th parallel onto the 1,350-foot Gaylord plateau (~75–80%) or cross the Mackinac Bridge into the Lake Superior snowbelt (88–96%), cold northwest winds blowing across 39°F open water rebuild the snowpack after every warm spell.',
  foot:'How I use this: Historical NOAA percentages tell you where to book a cabin in October or November—never whether a specific storm will hit on December 24.',
  links:[
   {label:'Open White Christmas Calculator ↗',href:'/national-tools/white-christmas/'},
   {label:'Open Michigan Station Breakdown ↗',href:'/white-christmas-michigan/'},
   {label:'Open NOAA Probability Map ↗',href:'/white-christmas-probability-map/'}
  ]
 },
 windows:{
  label:'FIELD LESSON 02 · THE 3 HOLIDAY WEATHER WINDOWS',
  title:'When to stop looking at 30-year history and start watching the ground',
  copy:'Holiday trip planning goes sideways when people use the wrong weather tool at the wrong time. (1) More than 45 days before Christmas, all long-range forecasts are noise—use 30-year NOAA station odds to choose a high-elevation snowbelt or a snowmaking resort. (2) Starting around November 11 (the 45-day window), watch actual ground snowpack on our Snow Depth Finder; once the Keweenaw or Ironwood builds a two-foot base, it takes an extraordinary thaw to erase it. (3) Inside 7 days (December 18–25), switch to hourly National Weather Service forecasts to time your highway drive.',
  foot:'How I use this: I check the 30-year odds when booking lodging, the NOHRSC snowpack map at Thanksgiving, and the NWS radar the week of Christmas.',
  links:[
   {label:'Open Christmas 2026 Forecast Outlook ↗',href:'/national-tools/white-christmas/forecast/'},
   {label:'Open Michigan Snow Depth Finder ↗',href:'/michigan-snow-depth/'},
   {label:'Open White Christmas Calculator ↗',href:'/national-tools/white-christmas/'}
  ]
 },
 snowmaking:{
  label:'FIELD LESSON 03 · MACHINE SNOWMAKING & ELEVATION INSURANCE',
  title:'How Northern Michigan ski hills save a mild El Niño December',
  copy:'Every few years, a mild December leaves backyards green from Detroit all the way to Traverse City. That is when modern resort snowmaking earns its keep. Whenever overnight wet-bulb temperatures dip below 28°F, the high-capacity fan guns at Boyne Mountain, The Highlands at Harbor Springs, Nub\'s Nob, Treetops, Crystal Mountain, Marquette Mountain, and Mont Ripley blow deep, durable base snow that survives 45°F afternoons. If you are traveling with kids who want to ski or tube between Christmas and New Year\'s, booking near a snowmaking hill is the smartest insurance policy in Michigan.',
  foot:'How I use this: In the Lower Peninsula, I always pair a snowbelt town with a commercial snowmaking hill within a 20-minute drive.',
  links:[
   {label:'Compare Michigan Ski Hills ↗',href:'/michigan-ski-hills/'},
   {label:'Open Cross-Country Ski Finder ↗',href:'/michigan-cross-country-skiing/'},
   {label:'Open Winter Weekend Getaways ↗',href:'/michigan-winter-weekends/'}
  ]
 },
 logistics:{
  label:'FIELD LESSON 04 · CHRISTMAS EVE QUIET VS. NEW YEAR\'S PEAK WEEK',
  title:'How to navigate December 24–25 closures and December 26–January 1 crowds',
  copy:'Christmas week in northern Michigan has two completely different rhythms. On Christmas Eve afternoon and Christmas Day, most independent restaurants, museums, and tasting rooms close so local staff can be with their families—meaning you want a cabin kitchen, a resort dining room reservation, or a thermos of hot soup for a quiet trail walk. Then, on the morning of December 26, every ski lift, heated vineyard igloo, and downtown pub erupts into the busiest winter week of the year. Book igloos in Petoskey or Traverse City and chicken dinners in Frankenmuth weeks ahead.',
  foot:'How I use this: Keep winter wiper fluid, traction cleats, and a half tank of fuel in the car before crossing the Mackinac Bridge or the Gaylord snowbelt.',
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
