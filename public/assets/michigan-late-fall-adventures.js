/* FIELD_GUIDE_V1 Michigan Late-Fall & November Adventure Guide: 4 visual doors, Late-Fall Physics & Safety Blueprint, CARTO/OSM fallback */
(()=>{'use strict';
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / IMAGE UNAVAILABLE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan late-fall destination';
 const explanation=document.createElement('span');explanation.textContent='The source photograph could not load. The late-fall field plan, storm backup and live tool links below remain available.';
 panel.append(label,title,explanation);fig.insertBefore(panel,fig.firstChild)}
 panel.hidden=false;
}
for(const im of document.querySelectorAll('.wf-photo img, .lfa-door-media img')){
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
  const target=document.getElementById('find-adventure');
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
 if(count)count.textContent=n?`${n} of ${stories.length} researched Michigan late-fall & November destinations shown. Check deer-season blaze-orange rules, collecting regulations and live river/wave tools before traveling.`:'No late-fall destinations match these filters. Try another experience door or region.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

const blueprintStage={
 gales:{
  label:'BLUEPRINT 01 · THE POST-GALE 72-HOUR ROCKHOUNDING WINDOW',
  title:'Why November northwest gales expose fresh agates & Petoskey stones',
  copy:'Summer beaches are picked over by thousands of daily walkers. In late October and November, intense low-pressure systems (the "Gales of November") drive 8-to-18-foot waves against the gravel shelves of Lake Superior and Little Traverse Bay. Wait until the wind subsides and the surf drops, then walk the newly reworked cobble tiers at Whitefish Point, Grand Marais, McLain State Park, and Petoskey State Park within 24–72 hours of the gale. Remember: Michigan EGLE allows up to 25 pounds per year of rocks/minerals from state-owned Great Lakes bottomlands and state parks, whereas collecting is strictly prohibited inside Pictured Rocks and Sleeping Bear Dunes National Lakeshores.',
  foot:'Decision rule: Never step onto active storm-washed breakwalls or wave-swept black rocks during the gale—hunt the newly sorted gravel after the swell subsides.',
  links:[
   {label:'Open Michigan Rockhounding Map ↗',href:'/michigan-rockhounding/'},
   {label:'Open Great Lakes Buoys & Waves ↗',href:'/great-lakes-buoys/'},
   {label:'Open Gales of November & Fitzgerald Guide ↗',href:'/edmund-fitzgerald/'}
  ]
 },
 waterfalls:{
  label:'BLUEPRINT 02 · LEAF-OFF CANYON SIGHTLINES & AUTUMN RAIN PEAKS',
  title:'Why November waterfalls out-perform late summer',
  copy:'By August and September, many Upper Peninsula waterfalls drop to a trickle hidden behind dense maple foliage. In late October and November, two things happen simultaneously: deciduous leaves drop—opening unobstructed sightlines down into volcanic and sandstone gorges—and cold autumn rains recharge the cedar swamps feeding the Tahquamenon, Ontonagon (Bond Falls), Black, and Dead rivers. Bring microspikes starting in early November, because mist and sleet glaze wooden viewing stairs long before deep snow arrives.',
  foot:'Decision rule: Pair USGS river discharge with microspikes for glazed canyon boardwalks; note that the Munising Falls canyon trail remains closed.',
  links:[
   {label:'Open U.P. Waterfalls Explorer (43 Falls) ↗',href:'/upper-peninsula-waterfalls/'},
   {label:'Open Waterfall Conditions Tool ↗',href:'/michigan-waterfall-conditions/'},
   {label:'Open First Snow Adventures Guide ↗',href:'/michigan-first-snow-adventures/'}
  ]
 },
 orange:{
  label:'BLUEPRINT 03 · NOVEMBER 15–30 FIREARM DEER SEASON & TRAIL STRATEGY',
  title:'When to wear hunter orange—and where hunting is prohibited',
  copy:'Michigan\'s regular firearm deer season runs November 15–30 every year (followed by muzzleloader season in December), and state forests, national forests, and many state recreation areas are open to public hunting. Non-hunting hikers and birders have two smart plays during Nov 15–30: (1) wear a high-visibility blaze-orange hat and vest on any state/national forest trail (and put an orange vest on your dog), or (2) choose dedicated non-hunting sanctuaries and urban/park corridors such as Michigan Audubon\'s Phyllis Haehnle Crane Sanctuary, downtown riverwalks, or posted visitor-center loops.',
  foot:'Decision rule: Between November 15 and 30, treat blaze orange as standard trail gear across northern and southern Michigan woods.',
  links:[
   {label:'Open Whitetail Rut & Deer Forecast ↗',href:'https://whitetail.chrisizworski.com/'},
   {label:'Open Michigan Winter Trails Guide ↗',href:'/michigan-winter-trails/'},
   {label:'Open Porcupine Mountains Explorer ↗',href:'/porcupine-mountains/'}
  ]
 },
 migration:{
  label:'BLUEPRINT 04 · THE 39°F RIVER & 32°F MARSH FREEZE-LINE',
  title:'How cooling water concentrates fall steelhead, cranes & diving ducks',
  copy:'Late fall is a thermal squeeze across Michigan waters. As Great Lakes tributaries cool through the 40s (°F) in November, fresh lake-run chrome steelhead ascend the Manistee, Pere Marquette, Au Sable (below Foote Dam), and St. Joseph rivers to feed behind spawning trout and salmon. Simultaneously, as shallow northern marshes freeze near 32°F, tens of thousands of tundra swans, diving ducks, and bald eagles compress into Saginaw Bay (Tobico Marsh / Shiawassee), the lower Detroit River, and Jackson County\'s Haehnle Crane Sanctuary.',
  foot:'Decision rule: Check live river flows for steelhead and the 32°F marsh freeze-line for peak November waterfowl staging.',
  links:[
   {label:'Open Waterfowl Freeze-Line Tracker ↗',href:'/waterfowl-freeze-line/'},
   {label:'Open Salmon & Steelhead Run Tracker ↗',href:'https://michigantroutreport.com/salmon-run/'},
   {label:'Open Winter Eagle Watching Guide ↗',href:'/winter-eagle-watching/'}
  ]
 }
};

document.querySelectorAll('[data-blueprint]').forEach(btn=>btn.addEventListener('click',()=>{
 const item=blueprintStage[btn.dataset.blueprint];
 if(!item)return;
 document.querySelectorAll('[data-blueprint]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
 document.getElementById('lfa-blueprint-label').textContent=item.label;
 document.getElementById('lfa-blueprint-title').textContent=item.title;
 document.getElementById('lfa-blueprint-copy').textContent=item.copy;
 document.getElementById('lfa-blueprint-foot').textContent=item.foot;
 const linksWrap=document.getElementById('lfa-blueprint-links');
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
  const multi=group.cards.length>1,firstName=group.cards[0].querySelector('h3')?.textContent||'Late-fall destination';
  const root=document.createElement('div');root.className='wf-map-popup';
  const heading=document.createElement('strong');heading.textContent=multi?group.cards.length+' late-fall stops here':firstName;root.append(heading);
  const note=document.createElement('p');note.textContent='Regional corridor marker only. Verify seasonal road gates, hunting-season boundaries and official park notices before travel.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Open field note';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   const view=document.createElement('a');
   const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
   view.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
   view.target='_blank';view.rel='noopener noreferrer';view.className='lfa-popup-map-link';
   view.textContent='View geographic area · not parking ↗';
   item.append(' · ',view);items.append(item);
  }
  root.append(items);
  const markerClass=multi?'wf-pin wf-pin-multi':'wf-pin';
  const icon=window.L.divIcon({className:'',html:'<span class="'+markerClass+'" aria-hidden="true">'+(multi?group.cards.length:'')+'</span>',iconSize:multi?[24,24]:[17,17],iconAnchor:multi?[12,12]:[8,8]});
  markers.push(window.L.marker([group.lat,group.lng],{title:multi?group.cards.length+' late-fall stops':firstName,icon}).bindPopup(root).addTo(map));
  points.push([group.lat,group.lng]);
 }
 if(initial||(!userZoomed&&!fitOnce)){if(points.length>1)map.fitBounds(points,{padding:[24,24],maxZoom:7});else if(points.length)map.setView(points[0],7);fitOnce=true}
}

function showTiles(url,provider){
 if(!map)return;if(tiles)map.removeLayer(tiles);
 const layer=window.L.tileLayer(url,{subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,attribution:provider==='CARTO'?'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
 tiles=layer;let failed=0,loaded=0;
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'CARTO basemap loaded. Select any late-fall destination marker.':'OpenStreetMap fallback loaded. Select any late-fall destination marker.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('CARTO unavailable; switching to OpenStreetMap.','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map unavailable. All 12 late-fall destination notes remain readable below.','error')}});
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
 if(!window.L){message('Interactive map unavailable; browse all 12 late-fall destinations below.','error');return}
 try{
  mapNode.textContent='';
  map=window.L.map(mapNode,{scrollWheelZoom:false}).setView([44.9,-85.5],6);
  map.on('dragstart zoomstart',()=>{userZoomed=true});
  refreshPins(true);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapNode);
  requestAnimationFrame(()=>map?.invalidateSize({pan:false}));
  connectTiles();
 }catch{message('Map could not start. Every late-fall destination remains readable.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
