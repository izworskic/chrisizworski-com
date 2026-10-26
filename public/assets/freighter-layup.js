/* Great Lakes Freighter Winter Layup Explorer — source-first historical release.
   Deliberately does not query AIS or infer any present-day position from historical records.
   Map markers represent APPROXIMATE HARBOR reference points, NEVER a dock or navigation waypoint. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const state = {archive:null,biographies:null,season:'2026-27',liveLedger:null,aisActivity:[],aisCheckedAt:null,aisLoaded:false,aisPartial:false,aisMonitoredHarbors:null,aisExpanded:false,query:'',berth:'all',selected:null,activeHarbor:'all',map:null,markerLayer:null,markers:[],tiles:null,locMarker:null};
 const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text = (tag,content) => {const el=document.createElement(tag);el.textContent=content;return el};
 const seasonData = () => state.archive.seasons.find(x=>x.id===state.season);
 const records = () => (seasonData()?.records || []).filter(v=>v.status!=='departed_current');
 const harbor = id => state.archive.harbors.find(h=>h.id===id);
 const policy=()=>window.FreighterLayupModel;
 const filtered = () => records().filter(v=>(state.activeHarbor==='all'||v.harborId===state.activeHarbor) &&
   (state.berth==='all'||v.berth===state.berth) && policy().matchesSearch(v,state.query));

 const fmtAIS = timestamp => {const d=new Date(timestamp);return Number.isFinite(d.valueOf())?d.toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'time unavailable'};
 const fmt = date => {if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return 'date not recorded';return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'})};
 const shipSVG = '<svg class="ship-illustration" viewBox="0 0 300 120" aria-hidden="true"><path fill="#234c59" d="M14 65h25l8 15h195l32-30h14l-24 44H56z"/><path fill="#457e87" d="M48 58V29h37v29z"/><path fill="#2f6370" d="M57 20h10v9H57z"/><path fill="#9dbfc0" d="M55 36h10v7H55zm16 0h8v7h-8z"/><path stroke="#497782" stroke-width="4" d="M105 68h115M90 60h151"/><path stroke="#bed6d7" stroke-width="3" d="M30 102h244"/></svg>';
 function photoHTML(v,detail=false){
   const p=v.photo;
   if(!p)return shipSVG;
   const url='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(p.file)+'?width=960';
   return '<span class="fallback-ship" hidden>'+shipSVG+'</span><img loading="lazy" decoding="async" src="'+esc(url)+'" alt="'+esc(p.alt)+'" onerror="this.hidden=true;this.previousElementSibling.hidden=false">';
 }
 function vesselCard(v){
   const selected=v.id===state.selected,h=harbor(v.harborId),biog=state.biographies?.profiles?.some(p=>p.id===v.id);
   const words=v.name.replace(/[^A-Za-z0-9 ]/g,' ').trim().split(/\s+/).filter(Boolean);
   const initials=(words.length>1?words[0][0]+words.at(-1)[0]:v.name.slice(0,2)).toUpperCase();
   const facility=v.berth.split(' — ')[0];
   return '<article class="ship-card'+(selected?' is-selected':'')+'" data-card="'+esc(v.id)+'"><div class="ship-art"><span class="ship-monogram" aria-hidden="true">'+esc(initials)+'</span></div><div class="ship-card-copy"><h3>'+esc(v.name)+'</h3><p class="berth">'+esc(facility)+' · '+esc(h.name)+'</p><button type="button" data-ship="'+esc(v.id)+'" aria-label="Read '+esc(v.name)+' layup history">Explore vessel record →</button>'+(biog?'<a class="ship-biography-link" href="/great-lakes-freighter-winter-layup/vessels/'+esc(v.id)+'/">Full biography ↗</a>':'')+'</div></article>';
 }

 function activeRecordsFromLedger(ledger,archive){
   const prior=archive.seasons.flatMap(s=>s.records||[]);
   const latest=new Map();
   for(const ev of ledger.events||[]){
     if(!ev?.vessel?.key||!archive.harbors.some(h=>h.id===ev.harborId))continue;
     if(!latest.has(ev.vessel.key))latest.set(ev.vessel.key,[]);
     latest.get(ev.vessel.key).push(ev);
   }
   return [...latest.entries()].map(([key,events])=>{
     events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
     const last=events.at(-1),old=prior.find(r=>r.id===key);
     const arrival=[...events].reverse().find(e=>e.kind==='arrival');
     const latestLocation=[...events].reverse().find(e=>e.kind==='arrival'||e.kind==='berth_change');
     const source=latestLocation?.source||last.source,confirmed=Boolean(latestLocation&&latestLocation.confidence==='confirmed'&&latestLocation.harborId===last.harborId&&['port_authority','operator','operator_statement','official_agency','maritime_historical_society','local_maritime_museum'].includes(latestLocation.source?.class));
     return {id:key,name:last.vessel.name,aliases:old?.aliases||[],identity:old?.identity||{key,imo:null,mmsi:null},
       harborId:last.harborId,berth:'Harbor report — specific berth not verified',
       berthPrecision:'berth_unverified',status:last.kind==='departure'?'departed_current':confirmed?'confirmed_current':'reported_current',
       statusAsOf:last.date,evidenceClass:source.class,evidence:{url:source.url,title:source.title,publisher:source.publisher,published:last.date},
       summary:last.summary+(last.kind==='departure'?' The winter berth is no longer current.':' Dated evidence; no live position is implied.'),
       events:events.map(e=>({date:e.date,type:e.kind,text:e.summary,source:e.source.url,sourceClass:e.source.class})),
       storyFacts:old?.storyFacts||[],photo:old?.photo||null};
   });
 }
 function mountLedger(data){
   if(data?.schemaVersion!==1||!/^\d{4}-\d{2}$/.test(data.season)||!Array.isArray(data.events)||!Array.isArray(data.previousSeasons))return false;
    if(data.events.some(e=>!e?.id||!e?.vessel?.key||!e?.vessel?.name||!/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')||!['arrival','berth_change','maintenance','departure','status_update'].includes(e.kind)||!['confirmed','reported'].includes(e.confidence)||!/^https:\/\//.test(e.source?.url||'')||!e.source?.publisher|| (e.confidence==='confirmed'&&!['port_authority','operator','operator_statement','official_agency','maritime_historical_society','local_maritime_museum'].includes(e.source?.class))))return false;
   const candidate={...state.archive,seasons:state.archive.seasons.map(s=>({...s,records:s.records.slice()}))};
   const season=candidate.seasons.find(s=>s.id===data.season);
   if(!season)return false;
   // A new winter can show live sourced reports without mutating last winter's archive.
   const stories=activeRecordsFromLedger(data,candidate);
   season.records=stories;
   season.state=stories.length?'active_current':'upcoming_unconfirmed';
   season.note=stories.length?'Live season: source-dated winter reports only, separate from AIS activity.':'No source-confirmed layup arrivals in the new-season ledger yet. AIS harbor traffic does not prove layup.';
   const historic=data.previousSeasons||[];
   for(const past of historic){
     if(!/^\d{4}-\d{2}$/.test(past.season)||!Array.isArray(past.events)||candidate.seasons.some(s=>s.id===past.season))continue;
     const records=activeRecordsFromLedger({...data,events:past.events},candidate).map(v=>({...v,status:v.status==='confirmed_current'?'confirmed_historical':'reported_historical'}));
     candidate.seasons.push({id:past.season,label:'Winter '+past.season.replace('-', '–20'),state:'historical_snapshot',asOf:past.season,records,note:'Dated winter ledger archive; reported statuses retain their uncertainty.'});
   }
   if(policy().validateRegistry(candidate).length)return false;
   state.archive=candidate;
   state.liveLedger=data;
   return true;
 }
 function renderLiveDesk(){
   const nowActive=Boolean(state.liveLedger);
   const view=$('winter-live');
   if(!view)return;
   view.hidden=!nowActive;
   if(!nowActive)return;
   const events=(state.liveLedger.events||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
   // Preseason or unreported winter: keep the desk visible but lead readers
   // to the sourced archive instead of repeating large empty-state messages.
   view.classList.toggle('is-preseason',events.length===0);
   const starts=Date.parse(state.liveLedger.startedAt||'');
   const beforeStart=Number.isFinite(starts)&&Date.now()<starts;

   const arrival=events.filter(e=>e.kind==='arrival'),departures=events.filter(e=>e.kind==='departure');
   $('live-season').textContent='Winter '+state.liveLedger.season.replace('-', '–20');
   $('live-arrivals').textContent=new Set(arrival.map(e=>e.vessel.key)).size;
   $('live-departures').textContent=new Set(departures.map(e=>e.vessel.key)).size;
   $('live-update-status').textContent=events.length?'Latest sourced update: '+fmt(events[0].date)+'. A dated report, not continuous vessel positioning.':
     (beforeStart?'Winter '+state.liveLedger.season.replace('-', '–20')+' begins November 1. No layups are forecast from last winter; explore the dated archive below.':'No verified arrivals reported in this winter yet. Source checks run seasonally; an empty record is not evidence of empty harbors.');
   $('winter-feed').innerHTML=events.length?events.slice(0,18).map(e=>
     '<article class="winter-update"><span class="winter-date">'+esc(fmt(e.date))+'</span><div><span class="tag'+(e.confidence==='reported'?' tag-reported':'')+'">'+esc(e.confidence==='confirmed'?'Confirmed source':'Reported source')+'</span><h3>'+esc(e.vessel.name)+'</h3><p>'+esc(e.summary)+'</p><a href="'+esc(e.source.url)+'" target="_blank" rel="noopener">Source: '+esc(e.source.publisher)+' ↗</a></div></article>').join(''):
      '<div class="live-empty"><h3>The winter story is about to begin.</h3><p>New ship arrivals will appear here as dated reporting is collected. Past winter berths are not carried over and AIS silence is not evidence of layup.</p><a href="#winter-ais">Watch harbor traffic while the season develops ↓</a></div>';
   renderAIS();
 }
 function renderAIS(){
   if(!$('ais-watch-list'))return;
   if(!state.aisLoaded){$('ais-watch-status').textContent='AIS harbor activity is loading. These are not confirmed layup records.';return}
   const rows=state.aisExpanded?state.aisActivity:state.aisActivity.slice(0,8);
   const harborScope=state.aisMonitoredHarbors?state.aisMonitoredHarbors+' monitored harbor areas':'monitored harbor areas';
   $('ais-watch-status').textContent=state.aisCheckedAt?'AIS checked '+new Date(state.aisCheckedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})+(state.aisPartial?' · Partial regional coverage':'')+'. Positions may be delayed; presence in port does not establish layup.':'AIS is currently unavailable. Dated reporting remains available above.';
   const more=$('ais-show-more');if(more){more.hidden=state.aisActivity.length<=8;more.textContent=state.aisExpanded?'Show fewer AIS vessels':'Show '+(state.aisActivity.length-8)+' more AIS vessels';more.setAttribute('aria-expanded',String(state.aisExpanded))}
   $('ais-watch-list').innerHTML=rows.length?rows.map(v=>
    '<li><strong>'+esc(v.name)+'</strong><span>'+esc(harbor(v.harborId)?.name||v.harborId)+'</span><small>'+esc(v.behavior==='moving'?'Under way':v.behavior==='movement_unknown'?'Movement not reported':'Slow/stationary signal')+' · last heard '+esc(fmtAIS(v.seen))+'</small></li>').join(''):
    '<li class="ais-empty">'+(state.aisCheckedAt?'No recent signals returned across '+harborScope+'. This does not mean the winter docks are empty.':'Live AIS feed unavailable. No conclusion can be drawn about '+harborScope+'.')+'</li>';
 }
 async function refreshAIS(){
   if(!$('ais-watch-status'))return;
   $('ais-watch-status').textContent='Checking current harbor AIS signals…';
   try{
     const r=await fetch('/api/freighter-layup-live',{signal:AbortSignal.timeout(15000)});
     if(!r.ok)throw new Error('AIS temporarily unavailable');
     const data=await r.json();
     if(!data.ok||data.notLayupConfirmations!==true||!Array.isArray(data.activity))throw new Error('AIS provider unavailable');
     state.aisActivity=data.activity;
     state.aisCheckedAt=typeof data.checkedAt==='string'&&Number.isFinite(Date.parse(data.checkedAt))?data.checkedAt:null;
     state.aisMonitoredHarbors=Array.isArray(data.harbors)?data.harbors.length:null;
     state.aisPartial=Boolean(data.partial);
   }catch{state.aisActivity=[];state.aisCheckedAt=null;state.aisPartial=false;state.aisMonitoredHarbors=null}
   state.aisExpanded=false;state.aisLoaded=true;renderAIS();
 }
 function populateHarborFilter(){
   const ids=new Set(records().map(v=>v.harborId));
   const harbors=[{id:'all',name:'All harbors'},...state.archive.harbors.filter(h=>ids.has(h.id))];
   $('harbor-filter').replaceChildren(...harbors.map(h=>{const option=document.createElement('option');option.value=h.id;option.textContent=h.name;return option}));
   if(state.activeHarbor!=='all'&&!ids.has(state.activeHarbor))state.activeHarbor='all';
   $('harbor-filter').value=state.activeHarbor;
 }
 function populateBerths(){
   const list=records().filter(r=>state.activeHarbor==='all'||r.harborId===state.activeHarbor);
   const options=['all',...new Set(list.map(r=>r.berth))];
   if(!options.includes(state.berth))state.berth='all';
   $('berth-filter').replaceChildren(...options.map(s=>{const o=document.createElement('option');o.value=s;o.textContent=s==='all'?'All berths':s;return o}));
   $('berth-filter').value=state.berth;
 }
 function renderCards(){
   const list=filtered(),total=policy().totals({...seasonData(),records:records()});
   const scope=state.activeHarbor==='all'?'all sampled harbors':harbor(state.activeHarbor)?.name||'selected harbor';
   $('count-note').textContent=seasonData().state==='upcoming_unconfirmed'||(seasonData().state==='active_current'&&!records().length)?'No confirmed '+seasonData().label+' layups yet. Previous-season docks are not forecasts.':
    'Showing vessels for '+scope+'.';
   $('ship-grid').innerHTML=seasonData().state==='upcoming_unconfirmed'||(seasonData().state==='active_current'&&!records().length)?
     '<div class="current-empty"><h3>'+esc(seasonData().label)+' is still being written.</h3><p>No active winter berth is documented in this season. Departed ships remain in the dated story feed but do not appear as occupied harbor pins. AIS silence does not prove layup.</p><button type="button" id="view-archive" class="small-button">Explore the verified 2025–26 archive →</button></div>':
     list.length?list.map(vesselCard).join(''):'<div class="empty">No ships match those filters. Clear your search or choose another harbor or berth.</div>';
   const archiveBtn=$('view-archive');if(archiveBtn)archiveBtn.addEventListener('click',()=>{$('season').value='2025-26';setSeason('2025-26')});
   $('ship-grid').querySelectorAll('[data-ship]').forEach(b=>b.addEventListener('click',()=>selectShip(b.dataset.ship,true)));
 }
 function renderStats(){
   const s=seasonData(),count=policy().totals({...s,records:records()});
   $('stat-ships').textContent=count.documented;
   $('stat-harbors').textContent=count.harbors;
   $('stat-year').textContent=s.state==='historical_snapshot'||s.state==='active_current'?count.confirmed+' / '+count.reported:'Pending';
   $('season-note').textContent=s.label+' selected.';
   $('map-intro').textContent='Select a harbor marker to see its documented vessels.';
 }
 function selectShip(id,scroll){
   const v=records().find(x=>x.id===id);if(!v)return;
   state.selected=id;renderCards();
   const panel=$('ship-detail');
   panel.hidden=false;
   $('detail-title').textContent=v.name;
   const h=harbor(v.harborId),report=policy().classify(v,seasonData());
   const items=(v.events||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>
     '<li><time datetime="'+esc(e.date)+'">'+esc(fmt(e.date))+' · '+esc(e.type.replace(/_/g,' '))+'</time>'+esc(e.text)+' <a href="'+esc(e.source)+'" target="_blank" rel="noopener">Evidence ↗</a></li>').join('');
   const facts=(v.storyFacts||[]).map(f=>'<li>'+esc(f.text)+' <a href="'+esc(f.source)+'" target="_blank" rel="noopener">Source ↗</a></li>').join('');
   const figure=v.photo?'<figure>'+photoHTML(v,true)+'<figcaption>'+esc(v.photo.alt)+' Photo: <a href="'+esc(v.photo.page)+'" target="_blank" rel="noopener">'+esc(v.photo.creator)+'</a> · '+esc(v.photo.license)+(v.photo.licenseUrl?' (<a href="'+esc(v.photo.licenseUrl)+'" target="_blank" rel="noopener">license ↗</a>)':'')+'. Not a photo of this winter’s layup.</figcaption></figure>':
      '<div class="empty"><strong>No rights-verified photograph yet.</strong><p>We would rather show a plain illustration than the wrong ship or an unlicensed image.</p></div>';
   const otherWinters=state.archive.seasons.filter(s=>s.id!==state.season&&s.records.some(rec=>rec.id===v.id)).sort((a,b)=>b.id.localeCompare(a.id));
   const links=otherWinters.map(s=>'<button type="button" class="winter-jump" data-winter="'+esc(s.id)+'" data-vessel="'+esc(v.id)+'">'+esc(s.label)+' · view recorded layup</button>').join('');
   const biography=state.biographies?.profiles?.some(p=>p.id===v.id)?'<p><a class="button small-button" href="/great-lakes-freighter-winter-layup/vessels/'+esc(v.id)+'/">Read '+esc(v.name)+' full ship biography ↗</a></p>':'';
   const warning=report.reported?'<p class="evidence-warning"><strong>Layup reported, not independently confirmed.</strong> '+(v.evidenceClass==='community_report'?'This report is based on local observers.':'This source describes a planned or reported arrival without confirming the final berth.')+' Check the cited source for scope and date.</p>':'';
   $('detail-body').innerHTML='<div class="detail-grid"><div><p class="tag'+(report.reported?' tag-reported':'')+'">'+esc(report.label)+'</p><p><b>Winter berth or facility:</b> '+esc(v.berth)+' · '+esc(h.name)+'</p>'+warning+'<p>'+esc(v.summary)+'</p><p class="note">Source as of '+esc(fmt(v.statusAsOf))+'. Berth precision: '+esc((v.berthPrecision||'unverified').replace(/_/g,' '))+'. This is not the vessel’s current position or proof it remained at that dock afterward.</p><h4>Winter timeline</h4><ol class="timeline">'+items+'</ol>'+(facts?'<h4>From this ship’s story</h4><ul class="fact-list">'+facts+'</ul>':'')+'<p><a href="'+esc(v.evidence.url)+'" target="_blank" rel="noopener">Read the documented source ↗</a></p>'+biography+(links?'<h4>This ship in other winters</h4><div class="winter-links">'+links+'</div>':'')+'</div><div>'+figure+'</div></div>';
   panel.querySelectorAll('[data-winter]').forEach(b=>b.addEventListener('click',()=>{$('season').value=b.dataset.winter;setSeason(b.dataset.winter);selectShip(b.dataset.vessel,true)}));
   $('ship-grid').querySelectorAll('[data-card]').forEach(x=>x.classList.toggle('is-selected',x.dataset.card===id));
   if(state.map){const m=state.markers.find(m=>m.id===v.harborId);if(m){state.map.setView([h.lat,h.lon],Math.max(state.map.getZoom(),9),{animate:false});m.marker.openPopup()}}
   if(scroll){panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});panel.focus({preventScroll:true})}
 }
 function setSeason(id){
   state.season=id;state.selected=null;state.berth='all';state.query='';state.activeHarbor='all';$('ship-search').value='';
   $('ship-detail').hidden=true;
   populateHarborFilter();populateBerths();renderStats();renderCards();renderMapPins();renderHarborPanel();renderLiveDesk();
   if(state.map)fitLakes();
 }
 function renderHarborPanel(){
  const aside=document.querySelector('.atlas-harbor-column'),box=$('harbor-panel');box.replaceChildren();
  if(state.activeHarbor==='all'||!records().length){if(aside)aside.hidden=true;return}
  const h=harbor(state.activeHarbor),ships=records().filter(v=>v.harborId===state.activeHarbor);
  if(aside)aside.hidden=false;
  const top=document.createElement('div');top.className='harbor-panel-heading';top.append(text('h3',h.name),text('span',h.lake));
  const reset=text('button','×');reset.type='button';reset.setAttribute('aria-label','Clear harbor selection');reset.addEventListener('click',()=>setHarbor('all',true));top.append(reset);box.append(top);
  const list=document.createElement('ul');list.className='harbor-vessels';
  for(const v of ships){const li=document.createElement('li'),button=text('button',v.name+' ↗');button.type='button';button.addEventListener('click',()=>selectShip(v.id,true));li.append(button);list.append(li)}
  box.append(list);
 }

 function setHarbor(id,zoom){
   if(id!=='all'&&!harbor(id))return;
   state.activeHarbor=id;state.berth='all';state.selected=null;
   $('harbor-filter').value=id;$('ship-detail').hidden=true;populateBerths();renderCards();renderHarborPanel();
   for(const p of state.markers)p.marker.getElement()?.classList.toggle('is-selected',p.id===id);
   if(zoom&&state.map){if(id==='all')fitLakes();else{const h=harbor(id);state.map.setView([h.lat,h.lon],10,{animate:false})}}
 }
 function shipIcon(count){
   const symbol='<svg viewBox="0 0 90 36" width="62" height="30" aria-hidden="true"><path d="M5 20h8l7 6h51l13-10h3L76 33H22Z" fill="#0d465a" stroke="#fff" stroke-width="2"/><path d="M17 17V7h16v12" fill="#0d465a" stroke="#fff" stroke-width="1.5"/><path d="M24 3h4v4" fill="#0d465a"/></svg>';
   return L.divIcon({className:'layup-pin',html:symbol+'<span>'+count+'</span>',iconSize:[66,48],iconAnchor:[33,34]});
 }
 function renderMapPins(){
   if(!state.map||!state.markerLayer)return;
   state.markerLayer.clearLayers();state.markers=[];
   const ids=[...new Set(records().map(x=>x.harborId))];
   for(const id of ids){
     const h=harbor(id),list=records().filter(v=>v.harborId===id),verified=list.filter(v=>policy().classify(v,seasonData()).confirmed).length;
     const marker=L.marker([h.lat,h.lon],{icon:shipIcon(list.length),title:h.name+' · '+list.length+' dated winter reports; approximate harbor point',keyboard:true}).addTo(state.markerLayer);
     const pop=document.createElement('div');pop.append(text('strong',h.name));
     const button=text('button','View harbor vessels');button.type='button';button.addEventListener('click',()=>setHarbor(id,true));pop.append(button);
     marker.bindPopup(pop);marker.on('click',()=>setHarbor(id,false));state.markers.push({id,marker});marker.getElement()?.classList.toggle('is-selected',state.activeHarbor===id);
   }
   $('map-status').textContent=ids.length?'Select a harbor marker to inspect its vessels.':'No harbor records for this season; choose an archive winter.';
 }
 function fitLakes(){if(!state.map)return;const bounds=[[41.3,-92.4],[48.9,-78.2]];state.map.fitBounds(bounds,{padding:[28,28],maxZoom:6,animate:false});$('layup-map').dataset.initialBounds=bounds.map(p=>p.join(',')).join('|')}
 function focusHarbor(){if(!state.map)return;const selected=state.markers.find(m=>m.id===state.activeHarbor);if(selected){state.map.setView(selected.marker.getLatLng(),10,{animate:false});return}const pins=state.markers;if(pins.length===1)state.map.setView(pins[0].marker.getLatLng(),10,{animate:false});else if(pins.length>1)state.map.fitBounds(pins.map(m=>m.marker.getLatLng()),{padding:[35,35],maxZoom:8,animate:false});else fitLakes()}
 async function addTiles(){
   if(!state.map)return;
   let key='';
   try{const r=await fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(6000)});if(r.ok){const d=await r.json();if(d.provider==='CARTO'&&typeof d.key==='string')key=d.key.trim()}}catch{}
   if(!state.map)return;
   let failed=false;
   const add=(carto)=>{
     const url=carto?'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(key):'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
     const layer=L.tileLayer(url,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'+(carto?' &copy; <a href="https://carto.com/attributions">CARTO</a>':'')}).addTo(state.map);
     state.tiles=layer;
     layer.on('tileerror',()=>{if(carto&&!failed){failed=true;state.map.removeLayer(layer);add(false)}});
     layer.on('load',()=>{$('map-status').textContent=(carto?'CARTO':'OpenStreetMap')+' basemap ready · choose a harbor marker.'});
   };
   add(Boolean(key));
 }
 function initMap(){
   if(!window.L){$('map-status').textContent='Map library unavailable. All verified ship and harbor records remain accessible below.';return}
   try{
     state.map=L.map('layup-map',{scrollWheelZoom:false,worldCopyJump:true,zoomControl:true}).setView([45.2,-85.3],5);
     const loadingHint=$('layup-map').querySelector('.map-loading');
     if(loadingHint)loadingHint.remove();
     state.markerLayer=L.layerGroup().addTo(state.map);
     fitLakes();addTiles();renderMapPins();
     $('reset-map').addEventListener('click',()=>setHarbor('all',true));
     $('focus-harbor').addEventListener('click',focusHarbor);
     $('locate').addEventListener('click',()=>{
       if(!navigator.geolocation){$('map-status').textContent='Location unavailable in this browser.';return}
       navigator.geolocation.getCurrentPosition(p=>{
         if(!state.map)return;
         const ll=[p.coords.latitude,p.coords.longitude];
         if(state.locMarker)state.map.removeLayer(state.locMarker);
         state.locMarker=L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:'#a64b29',fillOpacity:1}).addTo(state.map).bindPopup('Your approximate location; not a verified ship-viewing site.');
         state.map.setView(ll,9,{animate:false});
       },()=>{$('map-status').textContent='Location not shared. You can use All Great Lakes or the harbor button.'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
     });
   }catch(e){$('map-status').textContent='Map could not load; the documented vessel list below is still available.'}
 }
 async function boot(){
   let archive;
   try{
     const res=await fetch('/assets/freighter-layup-registry.json',{signal:AbortSignal.timeout(9000)});
     if(!res.ok)throw new Error('Archive not available');
     archive=await res.json();
     if(archive.schemaVersion!==2||!Array.isArray(archive.seasons)||!Array.isArray(archive.harbors))throw new Error('Unexpected archive format');
     if(!policy()||policy().validateRegistry(archive).length)throw new Error('Layup integrity check failed');
     state.archive=archive;
     try{
       const lr=await fetch('/assets/freighter-layup-live-season.json',{cache:'no-store',signal:AbortSignal.timeout(7000)});
       if(lr.ok){const live=await lr.json();if(!mountLedger(live))console.warn('Live layup ledger ignored due to validation failure')}
     }catch{ /* Archive remains available even when season data is offline. */ }

     try{const br=await fetch('/assets/freighter-vessel-biographies.json',{signal:AbortSignal.timeout(7000)});if(br.ok){const d=await br.json();if(d.schemaVersion===1&&Array.isArray(d.profiles))state.biographies=d}}catch{}
   }catch{
     $('count-note').textContent='Historical archive could not be loaded. The source names below are retained as a static reference; check the official roster.';
     $('map-status').textContent='Layup data unavailable; no new locations can be confirmed.';
     $('harbor-panel').append(text('p','Archive data temporarily unavailable. Read the linked Duluth port authority roster for verification.'));
     return;
   }
   archive=state.archive;
   const current=state.liveLedger&&archive.seasons.find(s=>s.id===state.liveLedger.season);
   if(!current?.records.some(v=>v.status!=='departed_current')){
     const lastYear=archive.seasons.filter(s=>s.state==='historical_snapshot'&&s.records.length).sort((a,b)=>b.id.localeCompare(a.id))[0];
     if(lastYear)state.season=lastYear.id;
   }
   $('season').replaceChildren(...archive.seasons.slice().sort((a,b)=>b.id.localeCompare(a.id)).map(season=>{const option=document.createElement('option');option.value=season.id;option.textContent=season.label+(season.state==='upcoming_unconfirmed'?' · upcoming / unconfirmed':' · archive');return option}));
   $('season').value=state.season;
   // Filter includes only harbors with a record in the selected season.
   $('harbor-filter').addEventListener('change',e=>setHarbor(e.target.value,true));
   $('season').addEventListener('change',e=>setSeason(e.target.value));
   $('ship-search').addEventListener('input',e=>{state.query=e.target.value;state.selected=null;$('ship-detail').hidden=true;renderCards()});
   $('berth-filter').addEventListener('change',e=>{state.berth=e.target.value;state.selected=null;$('ship-detail').hidden=true;renderCards()});
   $('clear-filters').addEventListener('click',()=>{state.query='';state.berth='all';state.activeHarbor='all';$('ship-search').value='';$('harbor-filter').value='all';$('ship-detail').hidden=true;populateBerths();renderCards();renderHarborPanel();fitLakes()});
   $('detail-close').addEventListener('click',()=>{state.selected=null;$('ship-detail').hidden=true;renderCards();$('ship-search').focus()});
   $('ais-refresh')?.addEventListener('click',refreshAIS);
     $('ais-show-more')?.addEventListener('click',()=>{state.aisExpanded=!state.aisExpanded;renderAIS()});
   setSeason(state.season);initMap();
   refreshAIS();
   document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(!state.aisCheckedAt||Date.now()-Date.parse(state.aisCheckedAt)>180000))refreshAIS()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
