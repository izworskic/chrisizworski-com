(()=>{
'use strict';
const DATA=window.MANISTEE_FIELD_DATA;if(!DATA)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const presets={
  'upper-short':['manistee-bridge','ccc'],
  'upper-long':['ccc','sharon'],
  'tippy-lower':['tippy-dam','high-bridge'],
  'lower':['high-bridge','rainbow-bend'],
  'pine-upper':['pine-elm-flats','pine-peterson'],
  'pine-lower':['pine-peterson','pine-low-bridge']
};
let applyingReach=false;

function ensureStyles(){
  if(document.querySelector('link[data-manistee-ausable-ui]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/manistee-ausable-ui.css';link.dataset.manisteeAusableUi='true';document.head.appendChild(link);
}
function augmentMarkup(){
  const mast=$('.mast');
  if(mast&&!$('.field-brandbar',mast)){
    mast.insertAdjacentHTML('afterbegin','<div class="field-brandbar"><strong>The Manistee Field Map</strong><span class="field-live-dot" aria-hidden="true"></span><span>river: live data</span><span class="field-secondary">·</span><a class="field-secondary" href="/">by Chris Izworski</a></div><p class="field-kicker">From headwaters trout water to Tippy and Lake Michigan</p>');
    mast.insertAdjacentHTML('beforeend','<div class="field-counts"><span><b>'+DATA.places.filter(p=>p.confidence==='agency').length+'</b> agency coordinates</span><span><b>'+DATA.places.length+'</b> mapped places</span><span><b>'+DATA.gauges.filter(g=>!g.historic).length+'</b> live gauges</span></div>');
  }
  const riverTab=$('.tab-button[data-tab="river"]');if(riverTab)riverTab.textContent='River';
  const places=$('#panel-places');
  if(places&&!$('.reach-filter-row',places)){
    const search=$('#place-search');
    search?.insertAdjacentHTML('afterend','<div class="field-section-label">Reach</div><div class="reach-filter-row" aria-label="River reach filters"><button class="reach-filter" data-reach="" aria-pressed="true">All water</button><button class="reach-filter" data-reach="Upper Manistee" aria-pressed="false">Upper Manistee</button><button class="reach-filter" data-reach="Middle Manistee" aria-pressed="false">Middle / Hodenpyl</button><button class="reach-filter" data-reach="Tippy" aria-pressed="false">Tippy</button><button class="reach-filter" data-reach="Lower Manistee" aria-pressed="false">Lower Manistee</button><button class="reach-filter" data-reach="Pine River" aria-pressed="false">Pine River</button></div><div class="field-section-label">Plan by</div>');
  }
  const plan=$('#panel-plan');
  if(plan&&!$('.popular-floats',plan)){
    const form=$('.planner-form',plan);
    form?.insertAdjacentHTML('beforebegin','<div class="field-section-label">Popular starts</div><div class="popular-floats" aria-label="Popular Manistee trip presets"><button class="popular-float" data-preset="upper-short">M-72 → CCC</button><button class="popular-float" data-preset="upper-long">CCC → Sharon</button><button class="popular-float" data-preset="tippy-lower">Tippy → High Bridge</button><button class="popular-float" data-preset="lower">High Bridge → Rainbow Bend</button><button class="popular-float" data-preset="pine-upper">Elm Flats → Peterson</button><button class="popular-float" data-preset="pine-lower">Peterson → Low Bridge</button></div>');
    const result=$('#plan-result');
    result?.insertAdjacentHTML('afterend','<div class="trip-tools"><button id="copy-trip-link" type="button">Copy trip link</button><button id="field-export-csv" type="button">Download access CSV</button><span id="trip-link-status" aria-live="polite"></span></div>');
    $('#field-export-csv')?.addEventListener('click',()=>$('#export-csv')?.click());
  }
  const river=$('#panel-river');
  if(river&&!$('#conditions-now-strip')){
    $('#gauge-cards')?.insertAdjacentHTML('beforebegin','<div class="field-section-label">Conditions now</div><div id="conditions-now-strip" aria-live="polite"><div><span>Upper flow</span><strong>Loading</strong></div><div><span>Upper water</span><strong>Loading</strong></div><div><span>Lower flow</span><strong>Loading</strong></div><div><span>Pine flow</span><strong>Loading</strong></div></div><div class="field-section-label">Live river flow</div>');
  }
  const mapButton=$('#locate-me');if(mapButton){mapButton.textContent='Near me';mapButton.setAttribute('aria-label','Nearest access');mapButton.title='Nearest access';}
}
function selectTab(tab){$('.tab-button[data-tab="'+tab+'"]')?.click();}
function setReach(button){
  $$('.reach-filter').forEach(b=>b.setAttribute('aria-pressed',b===button?'true':'false'));
  const input=$('#place-search');if(!input)return;
  const reach=button.dataset.reach||'';
  applyingReach=true;input.value=reach;input.dispatchEvent(new Event('input',{bubbles:true}));applyingReach=false;
}
function bindReachFilters(){
  $$('.reach-filter').forEach(b=>b.addEventListener('click',()=>setReach(b)));
  $('#place-search')?.addEventListener('input',()=>{if(applyingReach)return;$$('.reach-filter').forEach(b=>b.setAttribute('aria-pressed',b.dataset.reach===''?'true':'false'));});
}
function setPlanner(from,to){
  selectTab('plan');const a=$('#plan-from'),b=$('#plan-to');if(!a||!b)return;
  a.value=from;b.value=to;a.dispatchEvent(new Event('change',{bubbles:true}));b.dispatchEvent(new Event('change',{bubbles:true}));$('#plan-result')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function bindPresets(){$$('.popular-float').forEach(button=>button.addEventListener('click',()=>{const pair=presets[button.dataset.preset];if(pair)setPlanner(pair[0],pair[1]);}));}
function copyTrip(){
  const from=$('#plan-from')?.value,to=$('#plan-to')?.value,speed=$('#plan-speed')?.value,status=$('#trip-link-status');
  if(!from||!to){if(status)status.textContent='Choose a put-in and takeout first.';return;}
  const u=new URL(location.href);u.searchParams.set('from',from);u.searchParams.set('to',to);u.searchParams.set('speed',speed||'3');u.hash='';
  const done=()=>{if(status)status.textContent='Trip link copied.';};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(u.href).then(done).catch(()=>{history.replaceState(null,'',u);if(status)status.textContent='Trip is in the address bar; copy the URL.';});
  else{history.replaceState(null,'',u);if(status)status.textContent='Trip is in the address bar; copy the URL.';}
}
function restoreTrip(){
  const u=new URL(location.href),from=u.searchParams.get('from'),to=u.searchParams.get('to'),speed=u.searchParams.get('speed');if(!from||!to)return;
  const a=$('#plan-from'),b=$('#plan-to'),s=$('#plan-speed');if(!a||!b||!a.querySelector('option[value="'+CSS.escape(from)+'"]')||!b.querySelector('option[value="'+CSS.escape(to)+'"]'))return;
  if(speed&&s){const n=Math.max(1.5,Math.min(5,Number(speed)||3));s.value=String(n);$('#speed-value').textContent=n.toFixed(1)+' mph';}
  a.value=from;b.value=to;selectTab('plan');b.dispatchEvent(new Event('change',{bubbles:true}));
}
function bindTripShare(){$('#copy-trip-link')?.addEventListener('click',copyTrip);}
function groupPlaces(){
  const list=$('#place-list');if(!list||list.dataset.grouped==='true')return;
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>applyGroups(list)));observer.observe(list,{childList:true});applyGroups(list);list.dataset.grouped='true';
}
function applyGroups(list){
  const rows=$$('.place-row',list);if(!rows.length)return;$$('.reach-divider',list).forEach(x=>x.remove());let last='';
  for(const row of rows){if(row.hidden)continue;const p=DATA.places.find(x=>x.id===row.dataset.id);if(!p)continue;const label=DATA.reaches.find(r=>r.id===p.reach)?.name||p.reach;if(label!==last){const h=document.createElement('div');h.className='reach-divider';h.textContent=label;row.before(h);last=label;}}
}
function compactDeepIntel(){
  const detail=$('#place-detail');if(!detail)return;
  const wrap=()=>{const intel=$('.manistee-intel',detail);if(intel&&!intel.closest('details')){const d=document.createElement('details');d.className='field-more';d.innerHTML='<summary>River, weather & field details</summary>';intel.before(d);d.appendChild(intel);}};
  new MutationObserver(()=>queueMicrotask(wrap)).observe(detail,{childList:true,subtree:true});wrap();
}
function compactSystemDepth(){
  const panel=$('#panel-river');if(!panel)return;
  const wrap=()=>{const depth=$('#manistee-system-depth');if(depth&&!depth.closest('details')){const d=document.createElement('details');d.className='field-more system-more';d.innerHTML='<summary>Seasonal gauge detail</summary>';depth.before(d);d.appendChild(depth);}};
  new MutationObserver(()=>queueMicrotask(wrap)).observe(panel,{childList:true,subtree:true});wrap();
}
function updateConditionsStrip(){
  const cards=$('#gauge-cards'),strip=$('#conditions-now-strip');if(!cards||!strip)return;
  const refresh=()=>{const all=$$('.gauge-card',cards);if(!all.length)return;const find=name=>all.find(c=>c.textContent.includes(name));const upper=find('Grayling'),lower=find('Wellston'),pine=find('Pine');const firstMetric=card=>card?.querySelector('.gauge-numbers span')?.textContent.replace(/\s+/g,' ').trim()||'Unavailable';const water=card=>card?.querySelector('.gauge-numbers span:nth-child(2)')?.textContent.replace(/\s+/g,' ').trim()||'Unavailable';strip.innerHTML=`<div><span>Upper flow</span><strong>${firstMetric(upper)}</strong></div><div><span>Upper water</span><strong>${water(upper)}</strong></div><div><span>Lower flow</span><strong>${firstMetric(lower)}</strong></div><div><span>Pine flow</span><strong>${firstMetric(pine)}</strong></div>`;};
  new MutationObserver(()=>requestAnimationFrame(refresh)).observe(cards,{childList:true,subtree:true});refresh();
}
function syncMapHeight(){const map=$('#manistee-map');if(!map||!window.ResizeObserver)return;const ro=new ResizeObserver(()=>{try{window.dispatchEvent(new Event('resize'));}catch{}});ro.observe(map);}
function init(){
  ensureStyles();document.documentElement.classList.add('ausable-ui');augmentMarkup();bindReachFilters();bindPresets();bindTripShare();groupPlaces();compactDeepIntel();compactSystemDepth();updateConditionsStrip();syncMapHeight();restoreTrip();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.ManisteeAuSableUITest={presets};
})();