/* Historical winter atlas. Harbor reference markers are never live vessel positions.
   One validated state drives filters, selection, history and the map. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), policy=()=>window.FreighterLayupModel;
 const state={archive:null,biographies:null,map:null,markerLayer:null,markers:[],tiles:null,locMarker:null};
 let renderedSeason=null,loading=false,locationRequest=0,renderedListKey=null;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=(tag,content)=>{const el=document.createElement(tag);el.textContent=content;return el;};
 const seasonData=()=>state.archive.seasons.find(s=>s.id===state.season);
 const records=()=>seasonData()?.records||[];
 const harbor=id=>state.archive.harbors.find(h=>h.id===id);
 const filtered=()=>policy().selectRecords(state.archive,state);
 const scrollTo=(el,block='nearest')=>el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block});
 function writeURL(mode='push'){
   const u=policy().stateURL(state.archive,state,location.href);
   if(u.href!==location.href)history[mode==='replace'?'replaceState':'pushState'](null,'',u.href);
 }
 function change(patch,{mode='push',fit=false,keepPopup=false}={}){
   if(!state.archive)return;
   locationRequest++;
   if(!keepPopup&&state.map)state.map.closePopup();
   Object.assign(state,policy().normalizeState(state.archive,{...state,...patch}));
   render();writeURL(mode);
   if(fit)focusHarbor();
 }
 const fmt = date => {if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return 'date not recorded';return new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'})};
 const shipSVG = '<svg class="ship-illustration" viewBox="0 0 300 120" aria-hidden="true"><path fill="#234c59" d="M14 65h25l8 15h195l32-30h14l-24 44H56z"/><path fill="#457e87" d="M48 58V29h37v29z"/><path fill="#2f6370" d="M57 20h10v9H57z"/><path fill="#9dbfc0" d="M55 36h10v7H55zm16 0h8v7h-8z"/><path stroke="#497782" stroke-width="4" d="M105 68h115M90 60h151"/><path stroke="#bed6d7" stroke-width="3" d="M30 102h244"/></svg>';
 function photoHTML(v,detail=false){
   const p=v.photo;
   if(!p)return shipSVG;
   const url=p.url||'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(p.file)+'?width=960';
   return '<span class="fallback-ship" hidden>'+shipSVG+'</span><img loading="lazy" decoding="async" src="'+esc(url)+'" alt="'+esc(p.alt)+'" onerror="this.hidden=true;this.previousElementSibling.hidden=false">';
 }

 function vesselCard(v){
   const h=harbor(v.harborId),label=policy().classify(v,seasonData());
   return '<article class="ship-card'+(v.id===state.selected?' is-selected':'')+'" data-card="'+esc(v.id)+'"><div class="ship-art">'+photoHTML(v)+'</div><div class="ship-card-copy"><h3>'+esc(v.name)+'</h3><span class="tag'+(label.reported?' tag-reported':'')+'">'+(label.reported?'Reported historical':'Verified historical')+'</span><p class="berth">'+esc(h.name)+' · '+esc(v.berth)+'</p><button type="button" data-ship="'+esc(v.id)+'" aria-label="Read '+esc(v.name)+' layup history" aria-pressed="'+(v.id===state.selected)+'">Explore this freighter →</button><span data-bio-vessel="'+esc(v.id)+'"></span></div></article>';
 }
 function options(id,list,value){
   $(id).replaceChildren(...list.map(([val,label])=>{const o=text('option',label);o.value=val;return o;}));$(id).value=value;
 }
 function renderControls(){
   $('season').value=state.season;$('ship-search').value=state.query;
   for(const id of ['harbor-filter','harbor-filter-mobile'])options(id,[['all','All documented harbors'],...policy().harborCounts(state.archive,state.season).map(h=>[h.id,h.name])],state.activeHarbor);
   const list=records().filter(v=>state.activeHarbor==='all'||v.harborId===state.activeHarbor);
   options('berth-filter',[['all','All documented berths'],...[...new Set(list.map(v=>v.berth))].map(b=>[b,b])],state.berth);
   $('evidence-filter').value=state.evidence;$('sort-order').value=state.sort;
   $('focus-harbor').disabled=!state.map||!filtered().length;
   $('refinement-summary').textContent='Refine results'+(state.activeHarbor!=='all'?' · '+harbor(state.activeHarbor).name:'')+(state.berth!=='all'?' · berth selected':'')+(state.evidence!=='all'?' · '+state.evidence+' only':'')+(state.sort==='recent'?' · newest record first':'');
   const upcoming=seasonData().state==='upcoming_unconfirmed';
   for(const id of ['harbor-filter','harbor-filter-mobile','berth-filter','evidence-filter','sort-order'])$(id).disabled=upcoming;
 }
 function renderCards(){
   const list=filtered(),key=state.season+'|'+list.map(v=>v.id).join('|');
   const previousScroll=renderedListKey===key?$('ship-grid').scrollTop:0;
   const suggestions=policy().otherWinterMatches(state.archive,state);
   const other=suggestions.length?'<div class="other-winters"><h3>Found in another winter</h3><p>These matches come from a different archive. Open one to keep your search and change winters.</p><div class="winter-links">'+suggestions.map(s=>'<button type="button" class="winter-jump" data-action="other-winter" data-season="'+esc(s.id)+'">'+esc(s.label)+' · '+s.count+' matching '+(s.count===1?'record':'records')+'</button>').join('')+'</div></div>':'';
   const confirmed=list.filter(v=>v.status==='confirmed_historical').length;
   const scope=state.activeHarbor==='all'?'all documented harbors':harbor(state.activeHarbor).name;
   $('count-note').textContent=seasonData().state==='upcoming_unconfirmed'?'No sourced layup locations for '+seasonData().label+'.':
     list.length+' of '+records().length+' records · '+scope+' · '+confirmed+' verified / '+(list.length-confirmed)+' reported in these results.';
   $('ship-grid').innerHTML=seasonData().state==='upcoming_unconfirmed'?
     '<div class="current-empty"><h3>'+esc(seasonData().label)+' is still being written.</h3><p>No sourced winter berths are recorded here yet. A quiet transmitter does not establish layup.</p><button type="button" data-action="archive" class="small-button">Explore the latest documented archive →</button></div>'+other:
     list.length?list.map(vesselCard).join(''):
     '<div class="empty"><h3>No ships match this view.</h3><p>Try a shorter name, or widen the berth or evidence filter. Your selected winter stays the same.</p><button type="button" class="small-button" data-action="clear-search">Clear search &amp; refinements</button> <button type="button" class="small-button" data-action="reset">Reset all filters</button></div>'+other;
   $('ship-grid').scrollTop=previousScroll||0;renderedListKey=key;
 }
 function renderStats(){
   const s=seasonData(),count=policy().totals(s),upcoming=s.state==='upcoming_unconfirmed';
   $('stat-ships').textContent=count.documented;$('stat-harbors').textContent=count.harbors;
   $('stat-year').textContent=upcoming?'Pending':count.confirmed+' / '+count.reported;
   $('season-note').textContent=upcoming?'Not confirmed yet. Last winter’s berth does not predict this winter’s.':'Partial historical sample · not live ship positions.';
   $('coverage-method').textContent=s.note+' Sources have different dates; a documented berth does not establish continued occupancy.';
   const upcomingArchive=state.archive.seasons.filter(s=>s.state==='upcoming_unconfirmed').sort((a,b)=>b.id.localeCompare(a.id))[0];
   $('upcoming-status').textContent=upcomingArchive?upcomingArchive.label+': no records in this archive yet.':'Source-dated archives · not live positions.';
   $('map-title').textContent=upcoming?'A new winter is taking shape':'Where the ships spent winter';
   $('map-intro').textContent=upcoming?'Geographic context only; no locations are confirmed for this winter.':'Harbor areas, not live ship positions.';
 }
 function renderDetail(){
   const v=records().find(v=>v.id===state.selected);
   if(!v){$('ship-detail').hidden=true;return;}
   const panel=$('ship-detail');
   panel.hidden=false;
   $('detail-title').textContent=v.name;
   const h=harbor(v.harborId),report=policy().classify(v,seasonData());
   const items=(v.events||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>
     '<li><time datetime="'+esc(e.date)+'">'+esc(fmt(e.date))+' · '+esc(e.type.replace(/_/g,' '))+'</time>'+esc(e.text)+' <a href="'+esc(e.source)+'" target="_blank" rel="noopener">Evidence ↗</a></li>').join('');
   const facts=(v.storyFacts||[]).map(f=>'<li>'+esc(f.text)+' <a href="'+esc(f.source)+'" target="_blank" rel="noopener">Source ↗</a></li>').join('');
   const figure=v.photo?'<figure>'+photoHTML(v,true)+'<figcaption>'+esc(v.photo.alt)+' Photo: <a href="'+esc(v.photo.page)+'" target="_blank" rel="noopener">'+esc(v.photo.creator)+'</a> · '+esc(v.photo.license)+(v.photo.licenseUrl?' (<a href="'+esc(v.photo.licenseUrl)+'" target="_blank" rel="noopener">license ↗</a>)':'')+'. Not a photo of this winter’s layup.</figcaption></figure>':
      '<div class="empty"><strong>The story comes first.</strong><p>A photograph has not been added for this ship yet. Follow its documented winter chapter and the sources below.</p></div>';
   const otherWinters=state.archive.seasons.filter(s=>s.id!==state.season&&s.records.some(rec=>rec.id===v.id)).sort((a,b)=>b.id.localeCompare(a.id));
   const links=otherWinters.map(s=>'<button type="button" class="winter-jump" data-winter="'+esc(s.id)+'" data-vessel="'+esc(v.id)+'">'+esc(s.label)+' · view recorded layup</button>').join('');
   const biography='<p data-bio-vessel="'+esc(v.id)+'"></p>';
   const warning=report.reported?'<p class="evidence-warning"><strong>Reported historical layup, not independently confirmed.</strong> '+(v.evidenceClass==='community_report'?'This report is based on local observers.':'This source describes a planned or reported arrival without confirming the final berth.')+' Check the cited source for scope and date.</p>':'';
   $('detail-body').innerHTML='<div class="detail-grid"><div><p class="tag'+(report.reported?' tag-reported':'')+'">'+esc(report.label)+' · '+esc(seasonData().label)+'</p><p><b>Winter berth or facility:</b> '+esc(v.berth)+' · '+esc(h.name)+'</p>'+warning+'<p>'+esc(v.summary)+'</p><p class="note">Source as of '+esc(fmt(v.statusAsOf))+'. Berth precision: '+esc((v.berthPrecision||'unverified').replace(/_/g,' '))+'. This is not the vessel’s current position or proof it remained at that dock afterward.</p><h4>Winter timeline</h4><ol class="timeline">'+items+'</ol>'+(facts?'<h4>From this ship’s story</h4><ul class="fact-list">'+facts+'</ul>':'')+'<p><a href="'+esc(v.evidence.url)+'" target="_blank" rel="noopener">Read the documented source ↗</a></p>'+biography+(links?'<h4>This ship in other winters</h4><div class="winter-links">'+links+'</div>':'')+'</div><div>'+figure+'</div></div>';

 }
 function appendBiographyLinks(){
   if(!state.biographies)return;
   const known=new Set(state.biographies.profiles.map(p=>p.id));
   document.querySelectorAll('[data-bio-vessel]').forEach(el=>{
     const id=el.dataset.bioVessel;if(!known.has(id)||el.querySelector('a'))return;
     const a=text('a','Full ship biography ↗');a.href='/great-lakes-freighter-winter-layup/vessels/'+id+'/?season='+encodeURIComponent(state.season);a.className='ship-biography-link';el.append(a);
   });
 }
 function selectShip(id,scroll=true){
   if(!filtered().some(v=>v.id===id))return;
   change({selected:id});
   const v=records().find(v=>v.id===id),h=harbor(v.harborId);
   if(state.map)state.map.setView([h.lat,h.lon],9,{animate:false});
   if(scroll){scrollTo($('ship-detail'),'start');$('ship-detail').focus({preventScroll:true});}
 }
 function closeDetail(){
   const id=state.selected;change({selected:null});
   const origin=id&&$('ship-grid').querySelector('[data-ship="'+id+'"]');
   if(origin){origin.focus({preventScroll:true});scrollTo(origin);}else $('ship-search').focus();
 }
 function setSeason(id,selected=null){
   change({season:id,activeHarbor:'all',query:'',berth:'all',evidence:'all',sort:'name',selected},{fit:true});
 }
 function setHarbor(id,zoom=true,keepPopup=false){change({activeHarbor:id,berth:'all',selected:null},{fit:zoom,keepPopup});}
 function focusFleet(){scrollTo($('fleet-title'));$('fleet-title').focus({preventScroll:true});}
 function resetAll(){change({query:'',berth:'all',activeHarbor:'all',selected:null,evidence:'all',sort:'name'});if(state.map){state.map.closePopup();fitLakes();}}
 function clearSearch(){change({query:'',berth:'all',evidence:'all',selected:null});$('ship-search').focus();}
 function renderHarborPanel(){
   const box=$('harbor-panel');box.replaceChildren();
   const counts=policy().harborCounts(state.archive,state.season);
   if(!counts.length){box.append(text('h3','No confirmed harbor locations yet'),text('p','Choose a documented archive above to explore the earlier winters.'));return;}
   if(state.activeHarbor==='all'){
     box.append(text('h3','Choose a winter harbor'),text('p','Tap a harbor to narrow the fleet. Counts describe this archive sample only.'));
     const chart=document.createElement('div');chart.className='harbor-comparison';
     const max=Math.max(...counts.map(h=>h.count));
     const more=document.createElement('details');more.className='harbor-more';
     more.append(text('summary','Explore '+Math.max(0,counts.length-5)+' more harbors'));
     const otherChart=document.createElement('div');otherChart.className='harbor-comparison';more.append(otherChart);
     for(const [index,h] of counts.entries()){
       const b=text('button','');b.type='button';b.className='harbor-bar';b.setAttribute('data-harbor',h.id);b.setAttribute('aria-label',h.name+' · '+h.count+' documented records');
       const name=text('span',h.name);name.className='harbor-name';
       const graphic=document.createElementNS('http://www.w3.org/2000/svg','svg');graphic.setAttribute('viewBox','0 0 100 10');graphic.setAttribute('aria-hidden','true');
       const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('width',String(100*h.count/max));rect.setAttribute('height','10');rect.setAttribute('rx','2');graphic.append(rect);
       b.append(name,graphic,text('strong',String(h.count)));b.addEventListener('click',()=>{setHarbor(h.id,true);focusFleet();});(index<5?chart:otherChart).append(b);
     }
     box.append(chart);if(counts.length>5)box.append(more);return;
   }
   const h=harbor(state.activeHarbor),list=records().filter(v=>v.harborId===h.id);
   box.append(text('h3',h.name+' · '+h.lake),text('p',list.length+' documented '+(list.length===1?'record':'records')+'. '+h.note));
   const foot=document.createElement('div');foot.className='harbor-links';
   const src=text('a','Harbor evidence ↗');src.href=list[0].evidence.url;src.target='_blank';src.rel='noopener';
   const publicMap=text('a','Find public waterfront locations ↗');publicMap.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('public waterfront parks '+h.name);publicMap.target='_blank';publicMap.rel='noopener';
   const all=text('button','Show all harbors');all.type='button';all.addEventListener('click',()=>{resetAll();focusFleet();});foot.append(src,publicMap,all);box.append(foot);
 }
 function shipIcon(count,active=false){
   return L.divIcon({className:'layup-pin'+(active?' is-active':''),html:'<span>'+count+'</span>',iconSize:[44,44],iconAnchor:[22,22]});
 }
 function syncMapSelection(){
   const selected=records().find(v=>v.id===state.selected)?.harborId||state.activeHarbor;
   for(const m of state.markers)m.marker.setIcon(shipIcon(m.count,m.id===selected));
 }
 function renderMapPins(){
   if(!state.map||!state.markerLayer)return;
   state.map.closePopup();state.markerLayer.clearLayers();state.markers=[];
   for(const h of policy().harborCounts(state.archive,state.season)){
     const point=harbor(h.id),list=records().filter(v=>v.harborId===h.id),verified=list.filter(v=>v.status==='confirmed_historical').length;
     const marker=L.marker([point.lat,point.lon],{icon:shipIcon(h.count),title:h.name+' · '+h.count+' historical records; approximate harbor point',keyboard:true}).addTo(state.markerLayer);
     const pop=document.createElement('div');pop.append(text('strong',h.name),text('p',seasonData().label+' · '+verified+' verified / '+(list.length-verified)+' reported. Approximate harbor reference, not a ship position.'));
     const b=text('button','Explore this harbor');b.type='button';b.addEventListener('click',()=>{setHarbor(h.id,true);focusFleet();});pop.append(b);
     marker.bindPopup(pop,{maxWidth:260});marker.on('click',()=>setHarbor(h.id,false,true));state.markers.push({id:h.id,count:h.count,marker});
   }
   renderMapStatus();
 }
 function renderMapStatus(){
   if(!state.map||!state.markerLayer)return;
   $('map-status').textContent=state.markers.length?'All '+state.markers.length+' harbor references for this winter remain visible; filters narrow the ship list.':'No sourced locations for this winter; map is context only.';
 }
 function fitLakes(){if(state.map)state.map.fitBounds([[40.9,-92.5],[49.2,-73.0]],{padding:[22,22],animate:false});}
 function focusHarbor(){
   if(!state.map)return;
   locationRequest++;renderMapStatus();
   state.map.closePopup();
   const ids=new Set(filtered().map(v=>v.harborId)),pins=state.markers.filter(m=>ids.has(m.id));
   if(pins.length===1)state.map.setView(pins[0].marker.getLatLng(),9,{animate:false});
   else if(pins.length)state.map.fitBounds(pins.map(m=>m.marker.getLatLng()),{padding:[35,35],maxZoom:8,animate:false});else fitLakes();
 }
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
     let successes=0,errors=0;
     const status=()=>{
       if(state.tiles!==layer)return;
       $('tile-status').textContent=!successes?'Basemap unavailable · harbor and ship lists still work':
         errors?'Partial basemap · some tiles unavailable':(carto?'CARTO':'OpenStreetMap')+' basemap';
     };
     layer.on('tileload',()=>{successes++;status();});
     layer.on('tileerror',()=>{
       if(state.tiles!==layer)return;
       errors++;
       if(carto&&!failed){failed=true;state.map.removeLayer(layer);add(false);}else status();
     });
     layer.on('load',status);
   };
   add(Boolean(key));
 }

 function locate(){
   if(!state.map){$('map-status').textContent='Map unavailable. Choose a documented harbor from the list.';return;}
   if(!navigator.geolocation){$('map-status').textContent='Location unavailable in this browser. Choose a harbor instead.';return;}
   const request=++locationRequest;
   $('map-status').textContent='Waiting for your location…';
   navigator.geolocation.getCurrentPosition(p=>{
     if(request!==locationRequest)return;
     const ll=[p.coords.latitude,p.coords.longitude];
     if(state.locMarker)state.map.removeLayer(state.locMarker);
     state.locMarker=L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:'#a64b29',fillOpacity:1}).addTo(state.map).bindPopup('Your approximate location; not a verified ship-viewing site.');
     state.map.setView(ll,9,{animate:false});$('map-status').textContent='Your location shown. Harbor pins remain historical references.';
   },()=>{if(request!==locationRequest)return;$('map-status').textContent='Location not shared. Choose a harbor or All Great Lakes instead.';},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
 }
 function initMap(){
   if(!window.L){$('map-status').textContent='Map unavailable. All source-dated records remain in the harbor and ship lists.';$('layup-map').querySelector('.map-loading').textContent='Use the harbor comparison and ship list below.';return;}
   try{
     state.map=L.map('layup-map',{scrollWheelZoom:false,worldCopyJump:true,zoomControl:true}).setView([44.7,-84.6],5);
     $('layup-map').querySelector('.map-loading')?.remove();state.markerLayer=L.layerGroup().addTo(state.map);fitLakes();addTiles();
   }catch{ $('map-status').textContent='Map could not load. The source-dated harbor and vessel lists remain available.'; }
 }
 function render(){
   const seasonChanged=renderedSeason!==state.season;
   renderControls();renderStats();renderCards();renderDetail();renderHarborPanel();appendBiographyLinks();
   if(seasonChanged){renderMapPins();renderedSeason=state.season;}
   syncMapSelection();renderMapStatus();
 }
 async function loadBiographies(){
   try{
     const r=await fetch('/assets/freighter-vessel-biographies.json',{signal:AbortSignal.timeout(7000)});
     if(!r.ok)return;const d=await r.json();
     if(d.schemaVersion===1&&Array.isArray(d.profiles)){state.biographies=d;appendBiographyLinks();}
   }catch{/* Optional enrichment: search and map are already usable. */}
 }
 async function boot(){
   if(loading)return;loading=true;$('archive-retry').disabled=true;$('archive-error').hidden=true;
   try{
     const r=await fetch('/assets/freighter-layup-registry.json',{signal:AbortSignal.timeout(9000)});
     if(!r.ok)throw Error('Archive unavailable');const archive=await r.json();
     if(archive.schemaVersion!==2||!policy()||policy().validateRegistry(archive).length)throw Error('Archive integrity check failed');
     state.archive=archive;Object.assign(state,policy().readState(archive,location.href));
     options('season',archive.seasons.slice().sort((a,b)=>b.id.localeCompare(a.id)).map(s=>[s.id,s.label+(s.state==='upcoming_unconfirmed'?' · unconfirmed':' · archive')]),state.season);
     $('atlas-controls').disabled=false;initMap();render();writeURL('replace');
     if(state.selected){focusHarbor();scrollTo($('ship-detail'),'start');}
     // Intentionally not awaited: optional metadata cannot hold core tasks hostage.
     loadBiographies();
   }catch{
     $('archive-error').hidden=false;
     const hint=$('layup-map').querySelector('.map-loading');if(hint)hint.textContent='Map paused until the archive loads. Read the historical roster below, or retry.';
     $('map-status').textContent='Archive data unavailable. Static historical records and original sources remain below.';
   }finally{loading=false;$('archive-retry').disabled=false;}
 }
 function winterWork(step){
   const steps=[['Come into harbor','A winter berth is the opening chapter, not proof of a particular repair. Look for a dated arrival or port roster.'],['Make room for the work','Inspections, repairs and upgrades can use the pause between seasons. A ship may move between berths; each move needs its own dated evidence.'],['Return to the lakes','A sourced departure begins a new chapter. Ice, freight demand and lock schedules help set the wider scene; they do not promise a sailing date for one ship.']];
   const s=steps[step];$('work-title').textContent=s[0];$('work-copy').textContent=s[1];
   document.querySelectorAll('[data-work-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.workStep)===step)));
 }
 function bind(){
   $('season').addEventListener('change',e=>setSeason(e.target.value));
   for(const id of ['harbor-filter','harbor-filter-mobile'])$(id).addEventListener('change',e=>setHarbor(e.target.value));
   $('ship-search').addEventListener('input',e=>change({query:e.target.value,selected:null},{mode:'replace'}));
   $('ship-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();scrollTo($('fleet'));}});
   for(const [id,key] of [['berth-filter','berth'],['evidence-filter','evidence'],['sort-order','sort']])$(id).addEventListener('change',e=>change({[key]:e.target.value,selected:null}));
   $('clear-filters').addEventListener('click',resetAll);$('reset-map').addEventListener('click',resetAll);
   $('focus-harbor').addEventListener('click',focusHarbor);$('locate').addEventListener('click',locate);
   $('detail-close').addEventListener('click',closeDetail);$('archive-retry').addEventListener('click',boot);
   $('ship-grid').addEventListener('click',e=>{
     const b=e.target.closest('button');if(!b)return;
     if(b.dataset.ship)selectShip(b.dataset.ship);
     if(b.dataset.action==='reset'){resetAll();focusFleet();}
     if(b.dataset.action==='clear-search')clearSearch();
     if(b.dataset.action==='archive'){setSeason(policy().defaultSeason(state.archive));focusFleet();}
     if(b.dataset.action==='other-winter'&&policy().otherWinterMatches(state.archive,state).some(s=>s.id===b.dataset.season)){change({season:b.dataset.season,activeHarbor:'all',berth:'all',evidence:'all',selected:null},{fit:true});focusFleet();}
   });
   $('detail-body').addEventListener('click',e=>{const b=e.target.closest('[data-winter]');if(!b)return;setSeason(b.dataset.winter,b.dataset.vessel);scrollTo($('ship-detail'),'start');$('ship-detail').focus({preventScroll:true});});
   window.addEventListener('popstate',()=>{if(!state.archive)return;Object.assign(state,policy().readState(state.archive,location.href));render();focusHarbor();});
   document.querySelectorAll('[data-work-step]').forEach(b=>b.addEventListener('click',()=>winterWork(Number(b.dataset.workStep))));
   boot();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
