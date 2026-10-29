/* FIELD_GUIDE_V1 Michigan Late-Fall & November Adventure Guide: 4 visual doors, Late-Fall Field Notebook, CARTO/OSM fallback */
(()=>{'use strict';
function revealPhotoFallback(im){
 const fig=im.closest('.wf-photo');if(!fig||fig.dataset.mediaStatus==='fallback')return;
 fig.dataset.mediaStatus='fallback';im.hidden=true;im.setAttribute('aria-hidden','true');
 let panel=fig.querySelector('.wf-photo-unavailable');
 if(!panel){panel=document.createElement('div');panel.className='wf-photo-unavailable';
 const label=document.createElement('span');label.className='wf-photo-unavailable-kicker';label.textContent='FIELD NOTE / PHOTOGRAPH OFFLINE';
 const title=document.createElement('strong');title.textContent=fig.closest('.wf-story')?.querySelector('h3')?.textContent||'Michigan late-fall destination';
 const explanation=document.createElement('span');explanation.textContent='The photograph could not load right now, but the full field notes, foul-weather backup plan, and live conditions tools below are ready to use.';
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
 if(count)count.textContent=n?`Showing ${n} of ${stories.length} late-fall places across Michigan. Every stop below pairs an outdoor plan with a backup if November weather turns sideways.`:'Nothing matches that exact combination—try widening the region or picking another late-fall experience.';
 if(empty)empty.hidden=n>0;
 refreshPins(false);
}

const blueprintStage={
 gales:{
  label:'FIELD LESSON 01 · WHY NOVEMBER IS THE BEST ROCKHOUNDING MONTH OF THE YEAR',
  title:'Let the Gales of November do the digging—then walk the beach when the wind lays down',
  copy:'If you walk a famous Lake Superior or Lake Michigan beach in July, you are looking at gravel that three thousand other people have already picked over since breakfast. November is a different world. When a deep autumn low crosses Superior or Northern Lake Michigan, eight-to-fifteen-foot waves act like a conveyor belt: they pull tired summer sand offshore and roll fresh tiers of cobble up onto the beach. The trick is patience. Never go out on the breakwalls or wet rock ledges while the gale is blowing. Watch the buoy wave heights, wait for the wind to drop, and show up the next morning with waterproof boots. On state park beaches and state-owned Great Lakes bottomlands, Michigan EGLE lets you keep up to 25 pounds of stones a year for personal use—just remember that inside Pictured Rocks and Sleeping Bear Dunes National Lakeshores, you have to leave every stone on the beach.',
  foot:'My rule of thumb: Watch the onshore wind over the past 72 hours, wait for the surf to settle, and hunt the wet gravel band right at the waterline.',
  links:[
   {label:'Check Live Post-Storm Rockhounding Beaches ↗',href:'/michigan-rockhounding/'},
   {label:'Check Great Lakes Wave Buoys ↗',href:'/great-lakes-buoys/'},
   {label:'Read the Edmund Fitzgerald & November Gales Guide ↗',href:'/edmund-fitzgerald/'}
  ]
 },
 waterfalls:{
  label:'FIELD LESSON 02 · WHY WATERFALLS LOOK BETTER AFTER THE LEAVES DROP',
  title:'Cold autumn rain fills the cedar swamps just as the canyon views open up',
  copy:'Everybody photographs Upper Peninsula waterfalls in early October for the maple leaves, or in July when they are already in town. But late summer is actually low-water season on most U.P. rivers, and thick summer foliage hides half the gorge. Come back in November and two things happen at once: the birch and maple leaves are on the ground—opening long, clean sightlines down into the volcanic basalt and sandstone canyons—and cold November rain recharges the headwater swamps that feed the Tahquamenon, the Ontonagon at Bond Falls, and the Black River. Because waterfall mist freezes on wooden stairs long before the woods have real snowpack, throw a pair of slip-on microspikes in your daypack starting the first week of November.',
  foot:'My rule of thumb: Late fall gives you spring-like water volume without spring bugs—just expect frosty boardwalk steps in the morning.',
  links:[
   {label:'Explore 43 Upper Peninsula Waterfalls ↗',href:'/upper-peninsula-waterfalls/'},
   {label:'Check Live Waterfall River Flow ↗',href:'/michigan-waterfall-conditions/'},
   {label:'See Where Early Snow Arrives First ↗',href:'/michigan-first-snow-adventures/'}
  ]
 },
 orange:{
  label:'FIELD LESSON 03 · SHARING THE WOODS DURING NOVEMBER 15–30 FIREARM DEER SEASON',
  title:'Wear blaze orange in the big woods—or pick places where hunting isn\'t allowed',
  copy:'If you grow up in Michigan, November 15 is practically a state holiday. Regular firearm deer season runs November 15 through November 30 every year (with muzzleloader season following in December), and state forests, national forests, and many state recreation areas are open to public hunting. That doesn\'t mean hikers, birders, or waterfall chasers have to stay home for two weeks—it just means being neighborly and smart. If you are walking trails in the Huron-Manistee, Hiawatha, or Ottawa National Forests, wear a bright blaze-orange hat and vest (and put an orange vest on your dog), stick to the middle of the day rather than dawn and dusk, or choose places where hunting is prohibited altogether—like Michigan Audubon\'s Haehnle Crane Sanctuary, downtown riverwalks, or the paved Old Growth loop right beside the Hartwick Pines visitor center.',
  foot:'My rule of thumb: Keep two blaze-orange beanies in the glovebox all November; they weigh nothing and keep everyone comfortable on shared public land.',
  links:[
   {label:'Open Michigan Whitetail Rut & Season Guide ↗',href:'https://whitetail.chrisizworski.com/'},
   {label:'Browse Michigan Winter Trail Systems ↗',href:'/michigan-winter-trails/'},
   {label:'Open Porcupine Mountains Guide ↗',href:'/porcupine-mountains/'}
  ]
 },
 migration:{
  label:'FIELD LESSON 04 · THE 40°F RIVER & THE 32°F MARSH SQUEEZE',
  title:'Why cooling water packs chrome steelhead into the rivers and cranes into the marshes',
  copy:'Late fall is a season of movement driven by water temperature. As northern Michigan rivers cool through the 40s (°F) in November, fresh, silver-bright Lake Michigan and Lake Huron steelhead push upstream into the Big Manistee, the Pere Marquette, and the lower Au Sable below Foote Dam, feeding behind the fall salmon spawn. At the same time, as shallow ponds across Canada and the Upper Peninsula skim over with 32°F ice, hundreds of thousands of tundra swans, canvasbacks, mallards, and hunting bald eagles get squeezed southward into the open marshes of Saginaw Bay, the Shiawassee Flats, and the lower Detroit River—while thousands of sandhill cranes bugle into Jackson County\'s Mud Lake Marsh every evening before dark.',
  foot:'My rule of thumb: Bring binoculars even on a fishing or hiking trip in November—when the northern marshes freeze, the sky over Saginaw Bay and southern Michigan fills up.',
  links:[
   {label:'Track the Waterfowl Freeze-Line ↗',href:'/waterfowl-freeze-line/'},
   {label:'Check Salmon & Steelhead River Runs ↗',href:'https://michigantroutreport.com/salmon-run/'},
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
  const note=document.createElement('p');note.textContent='General area pin to help you orient the trip—check the field note below for actual trailhead, road-gate, and deer-season details.';root.append(note);
  const items=document.createElement('ul');
  for(const card of group.cards){
   const title=card.querySelector('h3')?.textContent||'Read field note';
   const item=document.createElement('li');const a=document.createElement('a');a.href='#'+card.id;a.textContent=title;
   a.addEventListener('click',ev=>{ev.preventDefault();card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const h=card.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}map.closePopup()});item.append(a);
   const view=document.createElement('a');
   const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
   view.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
   view.target='_blank';view.rel='noopener noreferrer';view.className='lfa-popup-map-link';
   view.textContent='Open area in Google Maps ↗';
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
 layer.on('tileload',()=>{if(tiles!==layer)return;loaded++;if(loaded>=2)message(provider==='CARTO'?'Map ready—click any pin to jump to its field note below.':'OpenStreetMap loaded—click any pin to jump to its field note below.',provider==='CARTO'?'ready':'fallback')});
 layer.on('tileerror',()=>{if(tiles!==layer)return;if(++failed>=2){if(provider==='CARTO'){message('Switching map tiles to OpenStreetMap…','fallback');showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM')}else message('Map tiles unavailable right now; all 12 field notes below work without the map.','error')}});
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
 }catch{message('Map could not start. Every late-fall destination remains readable below.','error')}
}
filter();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
