/* Great Lakes Freighter Winter Layup Explorer — source-first historical release.
   Deliberately does not query AIS or infer any present-day position from historical records.
   Map markers represent APPROXIMATE HARBOR reference points, NEVER a dock or navigation waypoint. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const state = {archive:null,season:'2025-26',query:'',berth:'all',selected:null,map:null,markerLayer:null,markers:[],tiles:null,locMarker:null};
 const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text = (tag,content) => {const el=document.createElement(tag);el.textContent=content;return el};
 const seasonData = () => state.archive.seasons.find(x=>x.id===state.season);
 const records = () => seasonData()?.records || [];
 const harbor = id => state.archive.harbors.find(h=>h.id===id);
 const filtered = () => records().filter(v => {
   const q=state.query.trim().toLocaleLowerCase();
   return (state.berth==='all'||v.berth===state.berth) &&
      (!q||[v.name,...(v.aliases||[]),v.berth].join(' ').toLocaleLowerCase().includes(q));
 });
 const fmt = date => {if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return 'date not recorded';return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'})};
 const shipSVG = '<svg class="ship-illustration" viewBox="0 0 300 120" aria-hidden="true"><path fill="#234c59" d="M14 65h25l8 15h195l32-30h14l-24 44H56z"/><path fill="#457e87" d="M48 58V29h37v29z"/><path fill="#2f6370" d="M57 20h10v9H57z"/><path fill="#9dbfc0" d="M55 36h10v7H55zm16 0h8v7h-8z"/><path stroke="#497782" stroke-width="4" d="M105 68h115M90 60h151"/><path stroke="#bed6d7" stroke-width="3" d="M30 102h244"/></svg>';
 function photoHTML(v,detail=false){
   const p=v.photo;
   if(!p)return shipSVG;
   const url='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(p.file)+'?width=960';
   return '<img loading="lazy" decoding="async" src="'+esc(url)+'" alt="'+esc(p.alt)+'" onerror="this.hidden=true">';
 }
 function vesselCard(v){
   const selected=v.id===state.selected;
   const hasPhoto=Boolean(v.photo);
   return '<article class="ship-card'+(selected?' is-selected':'')+'" data-card="'+esc(v.id)+'"><div class="ship-art">'+photoHTML(v)+(hasPhoto?'<span class="photo-hint">Historic vessel photo · '+esc(v.photo.date.slice(0,4))+'</span>':'')+'</div><div class="ship-card-copy"><h3>'+esc(v.name)+'</h3><span class="tag">Confirmed historical layup</span><p class="berth">'+esc(v.berth)+' · Superior, Wisconsin</p><p class="summary">'+esc(v.summary)+'</p><button type="button" data-ship="'+esc(v.id)+'" aria-label="Read '+esc(v.name)+' layup history">Explore this freighter →</button></div></article>';
 }
 function populateBerths(){
   const options=['all',...new Set(records().map(r=>r.berth))];
   if(!options.includes(state.berth))state.berth='all';
   $('berth-filter').replaceChildren(...options.map(s=>{const o=document.createElement('option');o.value=s;o.textContent=s==='all'?'All documented berths':s;return o}));
   $('berth-filter').value=state.berth;
 }
 function renderCards(){
   const list=filtered();
   const count=records().length;
   $('count-note').textContent=state.season==='2026-27'?'No confirmed 2026–27 layups yet. Previous-season docks are not forecasts.':
    list.length+' of '+count+' ships in a verified, partial Superior harbor archive · source roster dated Jan 30, 2026.';
   $('ship-grid').innerHTML=state.season==='2026-27'?
     '<div class="current-empty"><h3>Winter 2026–27 is still being written.</h3><p>There are no sourced 2026–27 winter layup berths in this registry yet. A vessel that stopped moving has not necessarily laid up.</p><button type="button" id="view-archive" class="small-button">Explore the verified 2025–26 archive →</button></div>':
     list.length?list.map(vesselCard).join(''):'<div class="empty">No ships match those filters. Clear your search or choose another berth.</div>';
   const archiveBtn=$('view-archive');if(archiveBtn)archiveBtn.addEventListener('click',()=>{$('season').value='2025-26';setSeason('2025-26')});
   $('ship-grid').querySelectorAll('[data-ship]').forEach(b=>b.addEventListener('click',()=>selectShip(b.dataset.ship,true)));
 }
 function renderStats(){
   const s=seasonData(),list=records();
   $('stat-ships').textContent=list.length;
   $('stat-harbors').textContent=new Set(list.map(r=>r.harborId)).size;
   $('stat-year').textContent=s.state==='historical_snapshot'?'Jan 30':'Pending';
   $('season-note').textContent=s.note;
   $('map-intro').textContent=s.state==='historical_snapshot'?
      'Six named vessels at three facilities in Superior, Wisconsin, on a dated historical port roster. Map pin is the harbor area, not an individual dock.':
      'No layup locations have been confirmed for this winter. Map is geographic context only; last year’s berth does not predict this year’s.';
 }
 function selectShip(id,scroll){
   const v=records().find(x=>x.id===id);if(!v)return;
   state.selected=id;renderCards();
   const panel=$('ship-detail');
   panel.hidden=false;
   $('detail-title').textContent=v.name;
   const h=harbor(v.harborId);
   const items=(v.events||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>
     '<li><time datetime="'+esc(e.date)+'">'+esc(fmt(e.date))+' · '+esc(e.type)+'</time>'+esc(e.text)+' <a href="'+esc(e.source)+'" target="_blank" rel="noopener">Evidence ↗</a></li>').join('');
   const figure=v.photo?'<figure>'+photoHTML(v,true)+'<figcaption>'+esc(v.photo.alt)+' Photo: <a href="'+esc(v.photo.page)+'" target="_blank" rel="noopener">'+esc(v.photo.creator)+'</a> · '+esc(v.photo.license)+(v.photo.licenseUrl?' (<a href="'+esc(v.photo.licenseUrl)+'" target="_blank" rel="noopener">license ↗</a>)':'')+'. Not a photo of this winter’s layup.</figcaption></figure>':
      '<div class="empty"><strong>No rights-verified photograph yet.</strong><p>We would rather show a plain illustration than the wrong ship or an unlicensed image.</p></div>';
   $('detail-body').innerHTML='<div class="detail-grid"><div><p class="tag">Documented winter 2025–26</p><p><b>Winter berth:</b> '+esc(v.berth)+' · '+esc(h.name)+'</p><p>'+esc(v.summary)+'</p><p class="note">The historical snapshot was dated '+esc(fmt(v.statusAsOf))+'. It is not this vessel’s current position or an assertion it remained berthed after that date.</p><h4>Events with sources</h4><ol class="timeline">'+items+'</ol><p><a href="'+esc(v.evidence.url)+'" target="_blank" rel="noopener">Read official harbor roster ↗</a></p></div><div>'+figure+'</div></div>';
   $('ship-grid').querySelectorAll('[data-card]').forEach(x=>x.classList.toggle('is-selected',x.dataset.card===id));
   if(state.map){const m=state.markers.find(m=>m.id===v.harborId);if(m){state.map.setView([h.lat,h.lon],Math.max(state.map.getZoom(),9),{animate:false});m.marker.openPopup()}}
   if(scroll){panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});panel.focus({preventScroll:true})}
 }
 function setSeason(id){
   state.season=id;state.selected=null;state.berth='all';state.query='';$('ship-search').value='';
   $('ship-detail').hidden=true;populateBerths();renderStats();renderCards();renderMapPins();renderHarborPanel();
 }
 function renderHarborPanel(){
   const box=$('harbor-panel');box.replaceChildren();
   const list=records();
   if(!list.length){box.append(text('h3','The new winter has not been confirmed'),text('p','The 2025–26 archive remains available through the season selector. The map never assigns a past berth to the new season.'));return}
   box.append(text('h3','Superior harbor · Lake Superior'),text('p','The port authority identifies six wintering vessels and their docks. A single harbor marker groups the vessels, because exact berth coordinates are not verified.'));
   const wrap=document.createElement('div');wrap.className='harbor-chip';
   for(const v of list){const b=text('button',v.name);b.type='button';b.addEventListener('click',()=>selectShip(v.id,true));wrap.append(b)}
   box.append(wrap);
   const foot=document.createElement('div');foot.className='harbor-links';
   const a=text('a','Official port roster ↗');a.href=list[0].evidence.url;a.target='_blank';a.rel='noopener';
   const b=text('a','Find public waterfront options on Google Maps ↗');b.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('public waterfront parks Superior Wisconsin');b.target='_blank';b.rel='noopener';
   foot.append(a,b);box.append(foot);
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
     const h=harbor(id),list=records().filter(v=>v.harborId===id);
     const marker=L.marker([h.lat,h.lon],{icon:shipIcon(list.length),title:h.name+' · '+list.length+' historical vessels; approximate harbor point',keyboard:true}).addTo(state.markerLayer);
     const pop=document.createElement('div');pop.append(text('strong',h.name),text('p',list.length+' documented historical layups. Marker represents the harbor, not individual ships or shipyard entrances.'));
     const button=text('button','Show ships in this harbor');button.type='button';button.addEventListener('click',()=>{$('fleet').scrollIntoView({behavior:'smooth',block:'start'});$('ship-search').focus({preventScroll:true})});pop.append(button);
     marker.bindPopup(pop);marker.on('click',renderHarborPanel);state.markers.push({id,marker});
   }
   $('map-status').textContent=ids.length?ids.length+' verified harbor in this historical sample · coordinates approximate · no vessel positions implied':'No confirmed harbor positions for the selected winter. Map shows geographic context only.';
 }
 function fitLakes(){if(!state.map)return;state.map.fitBounds([[40.9,-92.5],[49.2,-76.3]],{padding:[22,22],animate:false})}
 function focusHarbor(){const ids=state.markers;if(!state.map)return;if(ids.length)state.map.setView(ids[0].marker.getLatLng(),10,{animate:false});else fitLakes()}
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
     $('reset-map').addEventListener('click',fitLakes);
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
   try{
     const res=await fetch('/assets/freighter-layup-registry.json',{signal:AbortSignal.timeout(9000)});
     if(!res.ok)throw new Error('Archive not available');
     const archive=await res.json();
     if(archive.schemaVersion!==1||!Array.isArray(archive.seasons)||!Array.isArray(archive.harbors))throw new Error('Unexpected archive format');
     state.archive=archive;
   }catch{
     $('count-note').textContent='Historical archive could not be loaded. The source names below are retained as a static reference; check the official roster.';
     $('map-status').textContent='Layup data unavailable; no new locations can be confirmed.';
     $('harbor-panel').append(text('p','Archive data temporarily unavailable. Read the linked Duluth port authority roster for verification.'));
     return;
   }
   $('season').addEventListener('change',e=>setSeason(e.target.value));
   $('ship-search').addEventListener('input',e=>{state.query=e.target.value;state.selected=null;$('ship-detail').hidden=true;renderCards()});
   $('berth-filter').addEventListener('change',e=>{state.berth=e.target.value;state.selected=null;$('ship-detail').hidden=true;renderCards()});
   $('clear-filters').addEventListener('click',()=>{state.query='';state.berth='all';$('ship-search').value='';$('berth-filter').value='all';renderCards()});
   $('detail-close').addEventListener('click',()=>{state.selected=null;$('ship-detail').hidden=true;renderCards();$('ship-search').focus()});
   setSeason(state.season);initMap();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
