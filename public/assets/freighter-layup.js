/* Great Lakes Freighter Winter Layup Explorer — source-first historical release.
   Deliberately does not query AIS or infer any present-day position from historical records.
   Map markers represent APPROXIMATE HARBOR reference points, NEVER a dock or navigation waypoint. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const state = {archive:null,biographies:null,season:'2025-26',query:'',berth:'all',selected:null,activeHarbor:'all',map:null,markerLayer:null,markers:[],tiles:null,locMarker:null};
 const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text = (tag,content) => {const el=document.createElement(tag);el.textContent=content;return el};
 const seasonData = () => state.archive.seasons.find(x=>x.id===state.season);
 const records = () => seasonData()?.records || [];
 const harbor = id => state.archive.harbors.find(h=>h.id===id);
 const policy=()=>window.FreighterLayupModel;
 const filtered = () => records().filter(v=>(state.activeHarbor==='all'||v.harborId===state.activeHarbor) &&
   (state.berth==='all'||v.berth===state.berth) && policy().matchesSearch(v,state.query));

 const fmt = date => {if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return 'date not recorded';return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'})};
 const shipSVG = '<svg class="ship-illustration" viewBox="0 0 300 120" aria-hidden="true"><path fill="#234c59" d="M14 65h25l8 15h195l32-30h14l-24 44H56z"/><path fill="#457e87" d="M48 58V29h37v29z"/><path fill="#2f6370" d="M57 20h10v9H57z"/><path fill="#9dbfc0" d="M55 36h10v7H55zm16 0h8v7h-8z"/><path stroke="#497782" stroke-width="4" d="M105 68h115M90 60h151"/><path stroke="#bed6d7" stroke-width="3" d="M30 102h244"/></svg>';
 function photoHTML(v,detail=false){
   const p=v.photo;
   if(!p)return shipSVG;
   const url='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(p.file)+'?width=960';
   return '<img loading="lazy" decoding="async" src="'+esc(url)+'" alt="'+esc(p.alt)+'" onerror="this.hidden=true">';
 }
 function vesselCard(v){
   const selected=v.id===state.selected,h=harbor(v.harborId),label=policy().classify(v,seasonData());
   const hasPhoto=Boolean(v.photo),reported=Boolean(label.reported);
   const biog=state.biographies?.profiles?.some(p=>p.id===v.id);
   return '<article class="ship-card'+(selected?' is-selected':'')+'" data-card="'+esc(v.id)+'"><div class="ship-art">'+photoHTML(v)+(hasPhoto?'<span class="photo-hint">Historic vessel photo · '+esc(v.photo.date.slice(0,4))+'</span>':'')+'</div><div class="ship-card-copy"><h3>'+esc(v.name)+'</h3><span class="tag'+(reported?' tag-reported':'')+'">'+esc(label.label)+'</span><p class="berth">'+esc(v.berth)+' · '+esc(h.name)+'</p><p class="summary">'+esc(v.summary)+'</p><button type="button" data-ship="'+esc(v.id)+'" aria-label="Read '+esc(v.name)+' layup history">Explore this freighter →</button>'+(biog?'<a class="ship-biography-link" href="/great-lakes-freighter-winter-layup/vessels/'+esc(v.id)+'/">Read permanent biography ↗</a>':'')+'</div></article>';
 }
 function populateBerths(){
   const list=records().filter(r=>state.activeHarbor==='all'||r.harborId===state.activeHarbor);
   const options=['all',...new Set(list.map(r=>r.berth))];
   if(!options.includes(state.berth))state.berth='all';
   $('berth-filter').replaceChildren(...options.map(s=>{const o=document.createElement('option');o.value=s;o.textContent=s==='all'?'All documented berths':s;return o}));
   $('berth-filter').value=state.berth;
 }
 function renderCards(){
   const list=filtered(),total=policy().totals(seasonData());
   const scope=state.activeHarbor==='all'?'all sampled harbors':harbor(state.activeHarbor)?.name||'selected harbor';
   $('count-note').textContent=seasonData().state==='upcoming_unconfirmed'?'No confirmed 2026–27 layups yet. Previous-season docks are not forecasts.':
    list.length+' of '+total.documented+' sourced vessel records · '+scope+' · '+total.confirmed+' verified / '+total.reported+' reported overall.';
   $('ship-grid').innerHTML=seasonData().state==='upcoming_unconfirmed'?
     '<div class="current-empty"><h3>Winter 2026–27 is still being written.</h3><p>There are no sourced 2026–27 winter layup berths in this registry yet. A vessel that stopped moving has not necessarily laid up.</p><button type="button" id="view-archive" class="small-button">Explore the verified 2025–26 archive →</button></div>':
     list.length?list.map(vesselCard).join(''):'<div class="empty">No ships match those filters. Clear your search or choose another harbor or berth.</div>';
   const archiveBtn=$('view-archive');if(archiveBtn)archiveBtn.addEventListener('click',()=>{$('season').value='2025-26';setSeason('2025-26')});
   $('ship-grid').querySelectorAll('[data-ship]').forEach(b=>b.addEventListener('click',()=>selectShip(b.dataset.ship,true)));
 }
 function renderStats(){
   const s=seasonData(),count=policy().totals(s);
   $('stat-ships').textContent=count.documented;
   $('stat-harbors').textContent=count.harbors;
   $('stat-year').textContent=s.state==='historical_snapshot'?count.confirmed+' / '+count.reported:'Pending';
   $('season-note').textContent=s.note;
   $('map-intro').textContent=s.state==='historical_snapshot'?
      'Explore '+count.documented+' documented winter records from '+count.harbors+' harbors. Map markers identify approximate harbors, not dock positions or live vessels.':
      'No layup locations have been confirmed for this winter. Map is geographic context only; last year’s berth does not predict this year’s.';
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
   const warning=report.reported?'<p class="evidence-warning"><strong>Reported historical layup, not independently confirmed.</strong> '+(v.evidenceClass==='community_report'?'This report is based on local observers.':'This source describes a planned or reported arrival without confirming the final berth.')+' Check the cited source for scope and date.</p>':'';
   $('detail-body').innerHTML='<div class="detail-grid"><div><p class="tag'+(report.reported?' tag-reported':'')+'">'+esc(report.label)+'</p><p><b>Winter berth or facility:</b> '+esc(v.berth)+' · '+esc(h.name)+'</p>'+warning+'<p>'+esc(v.summary)+'</p><p class="note">Source as of '+esc(fmt(v.statusAsOf))+'. Berth precision: '+esc((v.berthPrecision||'unverified').replace(/_/g,' '))+'. This is not the vessel’s current position or proof it remained at that dock afterward.</p><h4>Winter timeline</h4><ol class="timeline">'+items+'</ol>'+(facts?'<h4>From this ship’s story</h4><ul class="fact-list">'+facts+'</ul>':'')+'<p><a href="'+esc(v.evidence.url)+'" target="_blank" rel="noopener">Read the documented source ↗</a></p>'+biography+(links?'<h4>This ship in other winters</h4><div class="winter-links">'+links+'</div>':'')+'</div><div>'+figure+'</div></div>';
   panel.querySelectorAll('[data-winter]').forEach(b=>b.addEventListener('click',()=>{$('season').value=b.dataset.winter;setSeason(b.dataset.winter);selectShip(b.dataset.vessel,true)}));
   $('ship-grid').querySelectorAll('[data-card]').forEach(x=>x.classList.toggle('is-selected',x.dataset.card===id));
   if(state.map){const m=state.markers.find(m=>m.id===v.harborId);if(m){state.map.setView([h.lat,h.lon],Math.max(state.map.getZoom(),9),{animate:false});m.marker.openPopup()}}
   if(scroll){panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});panel.focus({preventScroll:true})}
 }
 function setSeason(id){
   state.season=id;state.selected=null;state.berth='all';state.query='';state.activeHarbor='all';$('ship-search').value='';
   $('harbor-filter').value='all';$('ship-detail').hidden=true;
   populateBerths();renderStats();renderCards();renderMapPins();renderHarborPanel();
   if(state.map)fitLakes();
 }
 function renderHarborPanel(){
   const box=$('harbor-panel');box.replaceChildren();
   const list=records().filter(v=>state.activeHarbor==='all'||v.harborId===state.activeHarbor);
   if(!records().length){box.append(text('h3','The new winter has not been confirmed'),text('p','The 2025–26 archive remains available through the season selector. The map never assigns a past berth to the new season.'));return}
   if(state.activeHarbor==='all'){
     box.append(text('h3','Winter harbors · select a harbor'),text('p','Compare source-dated records in '+new Set(records().map(v=>v.harborId)).size+' harbors. The archive is partial; every marker is an approximate harbor reference. Choose a harbor on the map or filter to see its fleet.'));
     const wrap=document.createElement('div');wrap.className='harbor-chip';
     for(const id of [...new Set(records().map(v=>v.harborId))]){
       const h=harbor(id),ships=records().filter(v=>v.harborId===id),button=text('button',h.name+' · '+ships.length+' ships');
       button.type='button';button.addEventListener('click',()=>setHarbor(id,true));wrap.append(button)
     }
     box.append(wrap);return;
   }
   const h=harbor(state.activeHarbor);
   box.append(text('h3',h.name+' · '+h.lake),text('p',list.length+' dated layup reports. '+h.note));
   const wrap=document.createElement('div');wrap.className='harbor-chip';
   for(const v of list){const b=text('button',v.name+(v.status==='reported_historical'?' · reported':''));b.type='button';b.addEventListener('click',()=>selectShip(v.id,true));wrap.append(b)}
   box.append(wrap);
   const foot=document.createElement('div');foot.className='harbor-links';
   const src=text('a','Review original harbor sources ↗');src.href=list[0].evidence.url;src.target='_blank';src.rel='noopener';
   const publicMap=text('a','Find public waterfront locations ↗');publicMap.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('public waterfront parks '+h.name);publicMap.target='_blank';publicMap.rel='noopener';
   const all=text('button','Show both harbors');all.type='button';all.addEventListener('click',()=>setHarbor('all',true));
   foot.append(src,publicMap,all);box.append(foot);
 }
 function setHarbor(id,zoom){
   if(id!=='all'&&!harbor(id))return;
   state.activeHarbor=id;state.berth='all';state.selected=null;
   $('harbor-filter').value=id;$('ship-detail').hidden=true;populateBerths();renderCards();renderHarborPanel();
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
     const h=harbor(id),list=records().filter(v=>v.harborId===id),verified=list.filter(v=>v.status==='confirmed_historical').length;
     const marker=L.marker([h.lat,h.lon],{icon:shipIcon(list.length),title:h.name+' · '+list.length+' historical records; approximate harbor point',keyboard:true}).addTo(state.markerLayer);
     const pop=document.createElement('div');pop.append(text('strong',h.name),text('p',list.length+' historical records: '+verified+' verified, '+(list.length-verified)+' reported. Harbor-wide reference only, not precise shipyard berths.'));
     const button=text('button','Explore this harbor');button.type='button';button.addEventListener('click',()=>{setHarbor(id,true);$('fleet').scrollIntoView({behavior:'smooth',block:'start'})});pop.append(button);
     marker.bindPopup(pop);marker.on('click',()=>setHarbor(id,false));state.markers.push({id,marker});
   }
   $('map-status').textContent=ids.length?ids.length+' historical harbor references · no vessel positions implied · community reports labeled separately':'No confirmed harbor positions for the selected winter. Map shows geographic context only.';
 }
 function fitLakes(){if(!state.map)return;state.map.fitBounds([[40.9,-92.5],[49.2,-76.3]],{padding:[22,22],animate:false})}
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
     layer.on('load',()=>{$('map-status').textContent=(carto?'CARTO':'OpenStreetMap')+' map · harbor-level historical pins only · not navigation positions.'});
   };
   add(Boolean(key));
 }
 function initMap(){
   if(!window.L){$('map-status').textContent='Map library unavailable. All verified ship and harbor records remain accessible below.';return}
   try{
     state.map=L.map('layup-map',{scrollWheelZoom:false,worldCopyJump:true,zoomControl:true}).setView([44.7,-84.6],5);
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
     try{const br=await fetch('/assets/freighter-vessel-biographies.json',{signal:AbortSignal.timeout(7000)});if(br.ok){const d=await br.json();if(d.schemaVersion===1&&Array.isArray(d.profiles))state.biographies=d}}catch{}
   }catch{
     $('count-note').textContent='Historical archive could not be loaded. The source names below are retained as a static reference; check the official roster.';
     $('map-status').textContent='Layup data unavailable; no new locations can be confirmed.';
     $('harbor-panel').append(text('p','Archive data temporarily unavailable. Read the linked Duluth port authority roster for verification.'));
     return;
   }
   $('season').replaceChildren(...archive.seasons.slice().sort((a,b)=>b.id.localeCompare(a.id)).map(season=>{const option=document.createElement('option');option.value=season.id;option.textContent=season.label+(season.state==='upcoming_unconfirmed'?' · upcoming / unconfirmed':' · archive');return option}));
   $('season').value=state.season;
   $('harbor-filter').replaceChildren(...[{id:'all',name:'All documented harbors'},...archive.harbors.map(h=>({id:h.id,name:h.name}))].map(h=>{const option=document.createElement('option');option.value=h.id;option.textContent=h.name;return option}));
   $('harbor-filter').addEventListener('change',e=>setHarbor(e.target.value,true));
   $('season').addEventListener('change',e=>setSeason(e.target.value));
   $('ship-search').addEventListener('input',e=>{state.query=e.target.value;state.selected=null;$('ship-detail').hidden=true;renderCards()});
   $('berth-filter').addEventListener('change',e=>{state.berth=e.target.value;state.selected=null;$('ship-detail').hidden=true;renderCards()});
   $('clear-filters').addEventListener('click',()=>{state.query='';state.berth='all';state.activeHarbor='all';$('ship-search').value='';$('harbor-filter').value='all';$('ship-detail').hidden=true;populateBerths();renderCards();renderHarborPanel();fitLakes()});
   $('detail-close').addEventListener('click',()=>{state.selected=null;$('ship-detail').hidden=true;renderCards();$('ship-search').focus()});
   setSeason(state.season);initMap();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
