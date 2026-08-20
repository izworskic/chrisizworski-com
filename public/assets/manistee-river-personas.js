(()=>{
'use strict';
const DATA=window.MANISTEE_FIELD_DATA;
if(!DATA)return;

const PERSONAS={
  trout:{
    label:'Trout angler',icon:'🎣',title:'Upper-river trout day',
    promise:'Get to cold-water access, the closest useful gauge, and the current rule source without mixing lower-river salmon logic into a trout trip.',
    tab:'places',activity:'fish',search:'Upper Manistee',gauge:'Manistee near Grayling',
    placeIds:['manistee-bridge','ccc','sharon','deward'],
    checks:['Check the Grayling gauge before choosing a reach.','Treat temperature as local context, not a river-wide closure.','Open the DNR trout map for the exact water you will fish.'],
    primary:{label:'Show upper trout access',kind:'places'},secondary:{label:'Check Grayling gauge',kind:'gauge'},
    links:[{label:'Current DNR trout & salmon map',url:'https://www.michigan.gov/dnr/things-to-do/fishing/maps'}]
  },
  salmon:{
    label:'Salmon / steelhead',icon:'🐟',title:'Lower Manistee migratory-fish trip',
    promise:'Start below Tippy, look at the lower-river gauge, then verify the current rules and official fishery information before committing to a spot.',
    tab:'places',activity:'fish',search:'Lower Manistee',gauge:'Manistee near Wellston',
    placeIds:['tippy-dam','blacksmith','high-bridge','bear-creek-access','rainbow-bend'],
    checks:['Use the Wellston gauge as lower-river context.','Expect access pressure to vary sharply by season and day.','Do not treat this tool as a live run-status claim; verify current DNR information.'],
    primary:{label:'Show lower-river fishing access',kind:'places'},secondary:{label:'Check Wellston gauge',kind:'gauge'},
    links:[{label:'Michigan DNR fishing regulations',url:'https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations'},{label:'Tippy Dam official page',url:'https://www.michigan.gov/recsearch/parks/TippyDam'}]
  },
  paddle:{
    label:'Paddler',icon:'🛶',title:'Build a float without fake mileage',
    promise:'Choose real put-in and takeout points, route along USGS hydrography, and keep permit/site-status checks outside the mileage estimate.',
    tab:'plan',activity:'paddle',search:'',gauge:'Manistee near Sherman',
    placeIds:['manistee-bridge','ccc','sharon','pine-elm-flats','pine-peterson','pine-low-bridge'],
    checks:['Pick both endpoints on the same mapped river.','Add time for fishing, stops, wind, logs and shuttles.','For the Pine, verify current Forest Service permit and site status before departure.'],
    primary:{label:'Open river-distance planner',kind:'plan'},secondary:{label:'Show paddling access',kind:'places'},
    links:[{label:'Pine National Scenic River — official',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation/pine-national-scenic-river-0'}]
  },
  camp:{
    label:'Camper / hiker',icon:'🥾',title:'Camp, trail and river together',
    promise:'Find the places that actually connect the river to camping or trail logistics instead of treating every access pin as an overnight option.',
    tab:'places',activity:'camp',search:'',gauge:null,
    placeIds:['seaton-creek','red-bridge','government-landing','tippy-dam','pine-peterson'],
    checks:['Distinguish designated camping from general dispersed camping.','Check the managing agency for current closures and operating status.','Use Seaton Creek / Red Bridge as the map anchors for Manistee River Trail planning.'],
    primary:{label:'Show camp-connected places',kind:'places'},secondary:{label:'Read reach guide',kind:'guide'},
    links:[{label:'Huron-Manistee recreation status',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation'},{label:'Seaton Creek — Recreation.gov',url:'https://www.recreation.gov/camping/campgrounds/250045'}]
  },
  boat:{
    label:'Boat angler',icon:'🚤',title:'Launch and lower-river logistics',
    promise:'Start from a source-documented boat-launch location and separate launch facts from conditions or safety judgments the map cannot make.',
    tab:'places',activity:'boat',search:'Tippy',gauge:'Manistee near Wellston',
    placeIds:['tippy-dam'],
    checks:['Tippy Dam Recreation Area is the source-documented launch in this curated set.','Check the lower gauge, weather and official site notices separately.','Do not infer ramp suitability or navigation safety from flow alone.'],
    primary:{label:'Open Tippy launch details',kind:'place',placeId:'tippy-dam'},secondary:{label:'Check lower-river gauge',kind:'gauge'},
    links:[{label:'Tippy Dam official amenities',url:'https://www.michigan.gov/recsearch/parks/TippyDam'}]
  },
  family:{
    label:'First timer / family',icon:'🌲',title:'Start with the easiest decisions',
    promise:'Reduce the river to a few source-backed places with obvious facilities or trail context, then let the map add detail only when you need it.',
    tab:'places',activity:'scenic',search:'',gauge:null,
    placeIds:['tippy-dam','seaton-creek','high-bridge'],
    checks:['Open the official facility page before driving.','Use directions to the exact mapped point rather than a generic river name.','Pick one activity first; the Manistee is too large for one generic “best spot.”'],
    primary:{label:'Show first-trip starting points',kind:'curated'},secondary:{label:'Find nearest mapped place',kind:'nearest'},
    links:[{label:'Tippy Dam official page',url:'https://www.michigan.gov/recsearch/parks/TippyDam'},{label:'Huron-Manistee recreation',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation'}]
  },
  access:{
    label:'Accessibility',icon:'♿',title:'Accessible fishing first',
    promise:'Surface only accessibility information backed by the managing agency, with a direct path to the official accessibility source.',
    tab:'places',activity:'fish',search:'Tippy',gauge:'Manistee near Wellston',
    placeIds:['tippy-dam'],
    checks:['Michigan DNR identifies an accessible fishing pier below Tippy Dam.','Verify current facility conditions before travel.','No other place is labeled accessible here unless an agency source explicitly supports it.'],
    primary:{label:'Show Tippy accessible-fishing access',kind:'place',placeId:'tippy-dam'},secondary:{label:'Open DNR accessibility info',kind:'link',url:'https://www.michigan.gov/dnr/about/accessibility/fishing'},
    links:[{label:'Michigan DNR accessible fishing',url:'https://www.michigan.gov/dnr/about/accessibility/fishing'}]
  }
};
window.MANISTEE_PERSONAS=PERSONAS;

const style=`
.persona-deck{padding:14px 14px 10px;background:#eef3ef;border-bottom:1px solid #d9d4c7}.persona-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:9px}.persona-head strong{font-family:Georgia,serif;font-size:18px;font-weight:500}.persona-head span{font-size:10px;color:#65706b;text-transform:uppercase;letter-spacing:.08em}.persona-scroller{display:flex;gap:7px;overflow:auto;padding-bottom:4px;scrollbar-width:none}.persona-button{white-space:nowrap;border:1px solid #c5cec8;background:#fff;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:750;color:#3d4d46;cursor:pointer}.persona-button[aria-pressed=true]{background:#173a34;color:#fff;border-color:#173a34}.persona-card{margin-top:10px;background:#fff;border:1px solid #d8ddd9;border-radius:12px;padding:12px;box-shadow:0 7px 18px rgba(28,40,34,.06)}.persona-card h3{font-family:Georgia,serif;font-size:20px;font-weight:500;margin:2px 0 6px}.persona-card>p{font-size:12px;line-height:1.5;color:#53615b;margin:0}.persona-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.persona-action{border:1px solid #b8c3bd;background:#fff;border-radius:8px;padding:8px 9px;font-size:10px;font-weight:800;color:#22433a;cursor:pointer;text-decoration:none}.persona-action.primary{background:#0d5c63;color:#fff;border-color:#0d5c63}.persona-checks{margin:8px 0 0;padding-left:18px}.persona-checks li{font-size:10px;line-height:1.45;color:#5c6862;margin:4px 0}.persona-picks{display:flex;gap:5px;overflow:auto;margin-top:9px}.persona-pick{white-space:nowrap;border:0;background:#f2f4f1;border-radius:999px;padding:6px 8px;font-size:9px;color:#44534d;cursor:pointer}.persona-share{margin-left:auto;border:0;background:none;color:#53615b;text-decoration:underline;font-size:9px;cursor:pointer}.persona-status{font-size:9px;color:#6c7772;margin-top:6px}.persona-card[hidden]{display:none}.persona-card a{color:#0d5c63}
@media(max-width:900px){.persona-deck{padding:11px 10px 9px}.persona-head{align-items:center}.persona-card h3{font-size:18px}.persona-actions{display:grid;grid-template-columns:1fr 1fr}.persona-action{text-align:center}.persona-picks{margin-bottom:2px}}
`;

function $(s,r=document){return r.querySelector(s)}
function $$(s,r=document){return [...r.querySelectorAll(s)]}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));}
function placeName(id){return DATA.places.find(p=>p.id===id)?.name||id}
function setTab(tab){const b=$(`.tab-button[data-tab="${tab}"]`);if(b)b.click()}
function setActivity(activity){
  const all=$('.activity-chip[data-activity="all"]');
  const target=$(`.activity-chip[data-activity="${activity}"]`);
  if(!target)return;
  if(target.getAttribute('aria-pressed')!=='true')target.click();
  if(all&&all.getAttribute('aria-pressed')==='true'&&activity!=='all')target.click();
}
function setSearch(q){const input=$('#place-search');if(!input)return;input.value=q||'';input.dispatchEvent(new Event('input',{bubbles:true}));}
function showPlaces(p){setTab('places');setSearch(p.search||'');if(p.activity)setActivity(p.activity);setTimeout(()=>$('#place-list')?.scrollIntoView({behavior:'smooth',block:'nearest'}),40)}
function showCurated(p){
  setTab('places');setSearch('');const first=p.placeIds[0];
  const list=$('#place-list');if(!list)return;
  $$('.place-row',list).forEach(row=>row.hidden=!p.placeIds.includes(row.dataset.id));
  const count=p.placeIds.filter(id=>list.querySelector(`[data-id="${CSS.escape(id)}"]`)).length;
  const c=$('#place-count');if(c)c.textContent=`${count} persona starting points`;
  if(first)setTimeout(()=>list.querySelector(`[data-id="${CSS.escape(first)}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
}
function showPlace(id){setTab('places');setSearch(placeName(id));setTimeout(()=>document.querySelector(`.place-row[data-id="${CSS.escape(id)}"]`)?.click(),60)}
function showGauge(name){setTab('river');setTimeout(()=>{const card=$$('.gauge-card').find(x=>x.textContent.includes(name));card?.scrollIntoView({behavior:'smooth',block:'center'})},350)}
function runAction(persona,action){
  if(!action)return;
  if(action.kind==='places')showPlaces(persona);
  else if(action.kind==='curated')showCurated(persona);
  else if(action.kind==='place')showPlace(action.placeId);
  else if(action.kind==='gauge')showGauge(persona.gauge);
  else if(action.kind==='plan')setTab('plan');
  else if(action.kind==='guide')setTab('guide');
  else if(action.kind==='nearest')$('#locate-me')?.click();
  else if(action.kind==='link'&&action.url)window.open(action.url,'_blank','noopener');
}
function updateUrl(key){const u=new URL(location.href);u.searchParams.set('persona',key);history.replaceState(null,'',u)}
function sharePersona(key){
  const u=new URL(location.href);u.searchParams.set('persona',key);u.hash='';
  if(navigator.share)navigator.share({title:'Manistee River field map',url:u.href}).catch(()=>{});
  else if(navigator.clipboard)navigator.clipboard.writeText(u.href).then(()=>setStatus('Persona link copied.')).catch(()=>setStatus('Copy the URL from your address bar.'));
  else setStatus('Copy the URL from your address bar.');
}
function setStatus(text){const s=$('#persona-status');if(s)s.textContent=text}
function renderCard(key){
  const p=PERSONAS[key];
  const picks=p.placeIds.map(id=>`<button type="button" class="persona-pick" data-place="${esc(id)}">${esc(placeName(id))}</button>`).join('');
  const links=p.links.map(l=>`<a class="persona-action" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
  return `<div class="persona-card" id="persona-card"><div class="persona-head"><span>Decision path</span><button class="persona-share" type="button" data-share="${esc(key)}">Share this view</button></div><h3>${esc(p.title)}</h3><p>${esc(p.promise)}</p><div class="persona-actions"><button type="button" class="persona-action primary" data-action="primary">${esc(p.primary.label)}</button><button type="button" class="persona-action" data-action="secondary">${esc(p.secondary.label)}</button>${links}</div><ul class="persona-checks">${p.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="persona-picks">${picks}</div><div class="persona-status" id="persona-status" aria-live="polite"></div></div>`;
}
function selectPersona(key,apply=true){
  const p=PERSONAS[key];if(!p)return;
  $$('.persona-button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.persona===key?'true':'false'));
  const holder=$('#persona-card-holder');holder.innerHTML=renderCard(key);
  holder.querySelector('[data-action="primary"]')?.addEventListener('click',()=>runAction(p,p.primary));
  holder.querySelector('[data-action="secondary"]')?.addEventListener('click',()=>runAction(p,p.secondary));
  holder.querySelector('[data-share]')?.addEventListener('click',()=>sharePersona(key));
  $$('.persona-pick',holder).forEach(b=>b.addEventListener('click',()=>showPlace(b.dataset.place)));
  updateUrl(key);
  if(apply)runAction(p,p.primary);
}
function init(){
  if($('#manistee-persona-deck'))return;
  const panel=$('.panel');if(!panel)return;
  const st=document.createElement('style');st.dataset.manisteePersonas='true';st.textContent=style;document.head.appendChild(st);
  const deck=document.createElement('section');deck.className='persona-deck';deck.id='manistee-persona-deck';deck.setAttribute('aria-label','Choose a Manistee River trip type');
  deck.innerHTML=`<div class="persona-head"><strong>What are you here to do?</strong><span>Choose your river lens</span></div><div class="persona-scroller">${Object.entries(PERSONAS).map(([k,p])=>`<button type="button" class="persona-button" data-persona="${esc(k)}" aria-pressed="false">${p.icon} ${esc(p.label)}</button>`).join('')}</div><div id="persona-card-holder"></div>`;
  panel.insertBefore(deck,panel.firstChild);
  $$('.persona-button',deck).forEach(b=>b.addEventListener('click',()=>selectPersona(b.dataset.persona,true)));
  const requested=new URL(location.href).searchParams.get('persona');
  selectPersona(PERSONAS[requested]?requested:'trout',false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,60),{once:true});else setTimeout(init,60);
})();
