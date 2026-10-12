/* Welland Canal watch desk. Deliberately avoids speculative lock ETAs. */
(function () {
  'use strict';
  const API = '/api/welland-canal';
  const ZONE = 'America/Toronto';
  const LOCKS = [
    {id:'1',name:'Lock 1',lat:43.217484,lon:-79.212992,place:'St. Catharines',note:'Northern lift lock. Shore access varies; use established public paths.'},
    {id:'2',name:'Lock 2',lat:43.193131,lon:-79.202178,place:'St. Catharines',note:'Near the central St. Catharines canal reach.'},
    {id:'3',name:'Lock 3',lat:43.155230,lon:-79.193058,place:'St. Catharines',note:'Museum and public observation platform — easiest first stop.',url:'https://www.stcatharines.ca/arts-culture-and-events/st-catharines-museum-and-welland-canals-centre/visiting-us/'},
    {id:'4',name:'Lock 4',lat:43.1426,lon:-79.1920,place:'Thorold flight locks',note:'Twin flight complex; approximate map center.'},
    {id:'5',name:'Lock 5',lat:43.1379,lon:-79.1919,place:'Thorold flight locks',note:'Twin flight complex; approximate map center.'},
    {id:'6',name:'Lock 6',lat:43.134283,lon:-79.191899,place:'Thorold flight locks',note:'Twin flight complex; approximate map center.'},
    {id:'7',name:'Lock 7',lat:43.123446,lon:-79.193895,place:'Thorold',note:'Lock 7 Viewing Centre gives a view of the flight locks.',url:'https://www.thorold.ca/recreation-culture-community/canals/lock-7-viewing-centre/'},
    {id:'8',name:'Lock 8',lat:42.899122,lon:-79.246166,place:'Port Colborne',note:'Gateway Park and the Lake Erie end of the route.'}
  ];
  const $ = id => document.getElementById(id);
  const list = $('vesselList'), results = $('vesselCount'), status = $('liveStatus'), updated = $('lastUpdated'), select = $('lockSelect');
  let map=null, shipsLayer=null, vesselData=[], selected='all', busy=false;
  const shipMarkers=new Map(), lockMarkers=new Map();
  let lockLayer=null, flightMarker=null, aisState='loading';

  function el(tag,text,cls) { const x=document.createElement(tag); if(text!==undefined)x.textContent=text; if(cls)x.className=cls; return x; }
  function when(iso) {
    const date=new Date(iso);
    return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date):'time not reported';
  }
  function minutesOld(iso) {
    const n=Math.floor((Date.now()-Date.parse(iso))/60000);
    return Number.isFinite(n)&&n>=0?n:null;
  }
  function distanceKm(a,b) {
    const toRad=n=>n*Math.PI/180, dlat=toRad(a.lat-b.lat),dlon=toRad(a.lon-b.lon);
    const h=Math.sin(dlat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dlon/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function nearest(v) {
    let lock=null,km=Infinity;
    LOCKS.forEach(l=>{const d=distanceKm(v,l);if(d<km){km=d;lock=l;}});
    return {lock,km};
  }
  function heading(v) {
    const c=Number(v.course);
    if(v.course===null||v.course===undefined||!Number.isFinite(c)||v.speedKnots===null||v.speedKnots<1) return 'Direction not established';
    if(c>=315||c<=45) return 'Northbound (toward Lake Ontario)';
    if(c>=135&&c<=225) return 'Southbound (toward Lake Erie)';
    return 'Cross-channel / direction uncertain';
  }
  function currentVessels() {
    const term=$('shipSearch').value.trim().toLowerCase();
    const near=selected==='all'?v=>true:v=>nearest(v).lock.id===selected&&nearest(v).km<=1.5;
    return vesselData.filter(v=>near(v)&&(!term||(v.name||v.mmsi).toLowerCase().includes(term)))
      .sort((a,b)=>nearest(a).km-nearest(b).km);
  }
  function timeLabel(v) {
    const age=minutesOld(v.seen);
    return age===null?'Report time unknown':age===0?'Reported just now':'Reported '+age+' min ago';
  }
  function renderList() {
    list.replaceChildren();
    const found=currentVessels(); results.textContent=found.length+' recent AIS '+(found.length===1?'vessel':'vessels')+(selected==='all'?' in the wider corridor':' near selected lock');
    if(!found.length) {
      list.append(el('p',vesselData.length?'No matching reported vessels near this lock. Try all locks.':'No recent AIS vessel reports returned. This does not prove the canal is empty.','empty'));
      return;
    }
    found.slice(0,30).forEach(v=>{
      const n=nearest(v),card=el('article',undefined,'ship-card');
      const title=el('h3',v.name||'Unnamed AIS vessel');
      const meta=el('p',timeLabel(v)+' · '+(Number.isFinite(v.speedKnots)?v.speedKnots.toFixed(1)+' kn':'Speed unavailable'),'muted');
      const relation=n.km<=1.5?'Reported near '+n.lock.name:'Nearest listed lock: '+n.lock.name+' ('+n.km.toFixed(1)+' km away)';
      const detail=el('p',relation+'. '+heading(v)+'.');
      const btn=el('button','Find on map','subtle-btn');
      btn.type='button';btn.addEventListener('click',()=>{if(!map)return;map.setView([v.lat,v.lon],13);const marker=shipMarkers.get(String(v.mmsi));if(marker)marker.openPopup();const node=$('shipMap');node.scrollIntoView({behavior:'smooth',block:'center'});});
      card.append(title,meta,detail,btn);list.append(card);
    });
  }
  function renderLocks() {
    const rail=$('lockRail');rail.replaceChildren();
    LOCKS.forEach(l=>{
      const b=el('button',undefined,'lock-pill');b.type='button';b.dataset.lock=l.id;
      const number=el('span',l.id,'lock-pill__number');
      const copy=el('span',undefined,'lock-pill__copy');
      copy.append(el('strong',l.name),el('span',l.place));
      b.append(number,copy);
      b.setAttribute('aria-pressed',String(selected===l.id));
      b.addEventListener('click',()=>chooseLock(l.id));
      rail.append(b);
    });
  }
  function hideLockPreview(){
    $('mapLockPreview').hidden=true;
  }
  // A persistent, map-adjacent mobile preview survives Leaflet marker redraws
  // and offers a deliberate path to the premium full-size lock profile.
  function showLockPreview(lock){
    if(!window.matchMedia||!window.matchMedia('(max-width: 900px)').matches){
      hideLockPreview();
      return;
    }
    $('mapLockPreviewNumber').textContent='LOCK '+lock.id;
    $('mapLockPreviewTitle').textContent=lock.name+' · '+lock.place;
    $('mapLockPreviewText').textContent=lock.note;
    $('mapLockPreview').hidden=false;
  }
  function chooseLock(id,recenter=true,fromMap=false){
    selected=id;select.value=id;
    for(const b of $('lockRail').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.lock===id));
    const lock=LOCKS.find(l=>l.id===id);
    if(map&&recenter&&lock){
      const zoom=['4','5','6'].includes(id)?15:13;
      const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduced)map.setView([lock.lat,lock.lon],zoom);
      else map.flyTo([lock.lat,lock.lon],zoom,{duration:0.7});
    }else if(map&&recenter&&!lock){
      map.fitBounds([[42.87,-79.30],[43.26,-79.16]],{padding:[26,26]});
    }
    renderLockDetail();
    if(fromMap&&lock)showLockPreview(lock);else hideLockPreview();
    lockMarkers.forEach((marker,key)=>marker.setIcon(lockIcon(LOCKS.find(l=>l.id===key),selected===key)));
    if(flightMarker){
      const wide=map&&map.getZoom()<12;
      flightMarker.setIcon(flightIcon(wide?['3','4','5','6','7'].includes(selected):['4','5','6'].includes(selected),wide));
    }
    $('lockMapHint').textContent=lock?'Exploring '+lock.name+' · approximate location':'Select a numbered lock to see its guide';
    const focus=$('lockFocus');
    focus.replaceChildren();
    if(lock)focus.append(el('strong',lock.name+' — '+lock.place),el('p',lock.note));
    else focus.append(el('strong','Explore the eight locks'),el('p','Select a lock above or below the map. Closely spaced locks are grouped until you zoom in.'));
    renderList();
  }
  function renderLockDetail(){
    const lock=LOCKS.find(l=>l.id===selected);
    $('lockDetailIndex').textContent=lock?String(lock.id).padStart(2,'0')+' / 08':'01 — 08';
    $('lockDetailMedallion').textContent=lock?lock.id:'8';
    $('lockDetailLabel').textContent=lock?'LOCK PROFILE':'THE CANAL AT A GLANCE';
    $('lockDetailTitle').textContent=lock?lock.name:'Eight locks. One waterway.';
    $('lockDetailPlace').textContent=lock?lock.place:'Lake Ontario → Lake Erie';
    $('lockDetailDescription').textContent=lock?lock.note:'Follow the Welland Canal from north to south. Select a numbered marker to learn about its location, nearby reported vessels and visitor access.';
    $('lockDetail').classList.toggle('has-selection',Boolean(lock));
    const visitor=$('lockDetailVisitor');
    visitor.hidden=!lock?.url;
    if(lock?.url)visitor.href=lock.url;else visitor.removeAttribute('href');
    const next=lock?(Number(lock.id)%8)+1:1;
    $('lockDetailNext').textContent=lock?'Next · Lock '+next+' →':'Explore Lock 1 →';
    $('lockDetailNext').dataset.next=String(next);
    const count=lock?vesselData.filter(v=>nearest(v).lock.id===lock.id&&nearest(v).km<=1.5).length:vesselData.length;
    if(aisState==='loading'){
      $('lockDetailAIS').textContent='Checking vessel reports…';
      $('lockDetailAISNote').textContent='Reports refresh from the AIS provider.';
    }else if(aisState==='unavailable'){
      $('lockDetailAIS').textContent='AIS coverage unavailable';
      $('lockDetailAISNote').textContent='Check the official Seaway transit information.';
    }else{
      $('lockDetailAIS').textContent=count===0?'No recent reports nearby':count+' recent AIS '+(count===1?'vessel':'vessels');
      $('lockDetailAISNote').textContent=lock?'Reported within about 1.5 km of this lock. Not a lock occupancy count.':'Recent reports in the wider corridor. Not a vessel transit schedule.';
    }
  }
  // Minimalist lock markers: the information lives in the editorial card.
  function lockIcon(lock,active=false){
    const html='<span class="lock-pin__dot">'+lock.id+'</span>';
    const size=active?32:27;
    return L.divIcon({className:'welland-lock-pin'+(active?' is-active':''),html,iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]});
  }
  function flightIcon(active=false,wide=false){
    const html='<span class="lock-pin__group">'+(wide?'3–7':'4–6')+'</span>';
    const width=wide?48:46,height=27;
    return L.divIcon({className:'welland-lock-pin is-flight'+(active?' is-active':''),html,iconSize:[width,height],iconAnchor:[width/2,height/2],popupAnchor:[0,-height/2]});
  }
  function renderLockMarkers(){
    if(!map||!lockLayer)return;
    lockLayer.clearLayers();
    lockMarkers.clear();
    flightMarker=null;
    const wide=map.getZoom()<12;
    const combine=map.getZoom()<14;
    LOCKS.forEach(lock=>{
      if(wide&&['3','4','5','6','7'].includes(lock.id))return;
      if(combine&&['4','5','6'].includes(lock.id))return;
      const marker=L.marker([lock.lat,lock.lon],{icon:lockIcon(lock,selected===lock.id),keyboard:true,zIndexOffset:750})
        .addTo(lockLayer);
      marker.getElement()?.setAttribute('aria-label',lock.name+', '+lock.place+'. Show lock details');
      marker.on('click',()=>chooseLock(lock.id,true,true));
      lockMarkers.set(lock.id,marker);
    });
    if(wide){
      flightMarker=L.marker([43.1382,-79.1920],{icon:flightIcon(['3','4','5','6','7'].includes(selected),true),keyboard:true,zIndexOffset:780})
        .addTo(lockLayer);
      flightMarker.getElement()?.setAttribute('aria-label','Locks 3 to 7. Zoom in to explore');
      flightMarker.on('click',()=>{hideLockPreview();map.flyTo([43.1382,-79.1920],12,{duration:0.65});$('lockMapHint').textContent='Zoom in and choose an individual numbered lock';});
    }else if(combine){
      flightMarker=L.marker([43.1382,-79.1920],{icon:flightIcon(['4','5','6'].includes(selected)),keyboard:true,zIndexOffset:780})
        .addTo(lockLayer);
      flightMarker.getElement()?.setAttribute('aria-label','Locks 4 to 6. Zoom in to explore');
      flightMarker.on('click',()=>{hideLockPreview();map.flyTo([43.1382,-79.1920],14,{duration:0.65});$('lockMapHint').textContent='Choose Lock 4, 5, or 6 to explore';});
    }
  }
  function initMap() {
    if(!window.L){$('mapFallback').hidden=false;return;}
    map=L.map('shipMap',{scrollWheelZoom:false}).setView([43.075,-79.21],10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:18}).addTo(map);
    shipsLayer=L.layerGroup().addTo(map);
    lockLayer=L.layerGroup().addTo(map);
    map.on('zoomend',renderLockMarkers);
    renderLockMarkers();
    L.polyline([[43.24,-79.22],[43.2175,-79.213],[43.193,-79.202],[43.155,-79.193],[43.123,-79.194],[43.075,-79.202],[43.030,-79.217],[42.970,-79.240],[42.899,-79.246],[42.862,-79.25]],
      {color:'#397e98',weight:3,opacity:.55,dashArray:'5 7'}).addTo(map);
    L.control.scale({imperial:false}).addTo(map);
    window.setTimeout(()=>map.invalidateSize(),250);
  }
  // Same freighter silhouette as the Duluth Canal Park monitor. This side-view
  // glyph indicates a ship's position, not its compass course or lock assignment.
  function shipIcon(v) {
    const speed=Number(v.speedKnots);
    const unknown=v.speedKnots===null||v.speedKnots===undefined||!Number.isFinite(speed);
    const stopped=!unknown&&speed<=0.5;
    const width=stopped?38:46, height=stopped?22:26;
    const className='welland-ship-marker'+(stopped?' is-stopped':unknown?' is-unknown':' is-moving');
    const html='<span class="ship-glyph" aria-hidden="true"><svg viewBox="0 0 72 32" focusable="false"><path class="ship-hull" d="M3 19 L8 19 L11 24 L58 24 L67 18 L70 14 L62 14 L55 18 Z"/><path class="ship-house" d="M8 19 V10 H20 V19 Z"/><rect class="ship-stack" x="11" y="5" width="4" height="5" rx="1"/><rect class="ship-window" x="10" y="12" width="3" height="2" rx=".5"/><rect class="ship-window" x="15" y="12" width="3" height="2" rx=".5"/><rect class="ship-hatch" x="24" y="15" width="8" height="4" rx="1"/><rect class="ship-hatch" x="34" y="15" width="8" height="4" rx="1"/><rect class="ship-hatch" x="44" y="15" width="8" height="4" rx="1"/><path class="ship-waterline" d="M12 21.5 H59"/></svg></span>';
    return L.divIcon({className,html,iconSize:[width,height],iconAnchor:[Math.round(width/2),Math.round(height/2)],popupAnchor:[0,-Math.round(height/2)]});
  }
  function renderMarkers() {
    if(!shipsLayer)return;
    shipsLayer.clearLayers();
    shipMarkers.clear();
    vesselData.forEach(v=>{
      const n=nearest(v);
      const name=v.name||'Vessel '+v.mmsi;
      const marker=L.marker([v.lat,v.lon],{icon:shipIcon(v),keyboard:true,title:name,zIndexOffset:1050}).addTo(shipsLayer);
      const pop=document.createElement('div');
      pop.append(el('strong',name),el('p',timeLabel(v)+'. '+heading(v)+'.'));
      pop.append(el('p',n.km<=1.5?'Reported near '+n.lock.name:'Nearest mapped lock: '+n.lock.name));
      marker.bindTooltip(name,{direction:'top'}).bindPopup(pop);
      shipMarkers.set(String(v.mmsi),marker);
    });
  }
  async function refresh() {
    if(busy)return;
    busy=true;$('refreshShips').disabled=true;
    status.textContent='Checking recent AIS reports…';
    try {
      const response=await fetch(API,{cache:'no-store'});
      if(!response.ok)throw new Error('service unavailable');
      const data=await response.json();
      if(!data.ok||!Array.isArray(data.vessels))throw new Error('invalid vessel response');
      vesselData=data.vessels.filter(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lon)&&minutesOld(v.seen)!==null&&minutesOld(v.seen)<=30);
      status.textContent=vesselData.length?'Recent AIS positions available':'No recent AIS positions in returned coverage';
      updated.textContent='Last checked '+when(data.checkedAt)+' · positions at most 30 minutes old';
      aisState='available';renderList();renderMarkers();renderLockDetail();
      const credits=$('sourceCredit');credits.replaceChildren();
      (data.attribution||[]).forEach(a=>credits.append(el('span',a.credit||a.source)));
    } catch (_) {
      vesselData=[];
      status.textContent='AIS data unavailable — official vessel schedule remains available below';
      updated.textContent='Unable to verify fresh AIS positions';
      aisState='unavailable';renderList();renderMarkers();renderLockDetail();
    } finally {
      busy=false;$('refreshShips').disabled=false;
    }
  }
  $('shipSearch').addEventListener('input',renderList);
  select.addEventListener('change',()=>chooseLock(select.value));
  $('refreshShips').addEventListener('click',refresh);
  $('showAllLocks').addEventListener('click',()=>chooseLock('all'));
  $('lockDetailNext').addEventListener('click',()=>chooseLock($('lockDetailNext').dataset.next));
  $('mapLockPreviewDismiss').addEventListener('click',hideLockPreview);
  $('mapLockPreviewOpen').addEventListener('click',()=>{
    hideLockPreview();
    const card=$('lockDetail');
    card.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    card.focus({preventScroll:true});
  });
  renderLocks();chooseLock('all');initMap();refresh();
  window.setInterval(refresh,120000);
})();
