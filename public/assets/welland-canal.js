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
  let lockLayer=null, flightMarker=null;

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
  function chooseLock(id,recenter=true) {
    selected=id;select.value=id;
    for(const b of $('lockRail').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.lock===id));
    const l=LOCKS.find(x=>x.id===id);
    if(map&&recenter&&l)map.setView([l.lat,l.lon],['4','5','6'].includes(id)?14:13);
    else if(map&&recenter&&!l)map.fitBounds([[42.87,-79.30],[43.26,-79.16]],{padding:[26,26]});
    const focus=$('lockFocus');
    focus.replaceChildren();
    if(l){
      focus.append(el('strong',l.name+' · '+l.place),el('p',l.note));
      if(l.url){
        const link=el('a','Official viewing information ↗','lock-detail-link');
        link.href=l.url;link.target='_blank';link.rel='noopener noreferrer';focus.append(link);
      }
    }else{
      focus.append(el('strong','Eight locks. One connected waterway.'),el('p','Tap a numbered lock on the map or choose one below. The central 3–7 badge expands at closer zoom, then Thorold Locks 4–6 separate as you zoom in further. Lock locations are approximate.'));
    }
    lockMarkers.forEach((marker,key)=>marker.setIcon(lockIcon(LOCKS.find(item=>item.id===key),selected===key,Boolean(map&&map.getZoom()<12))));
    if(flightMarker){
      const wide=map&&map.getZoom()<12;
      flightMarker.setIcon(flightIcon(wide?['3','4','5','6','7'].includes(selected):['4','5','6'].includes(selected),wide));
    }
    const note=$('lockMapHint');
    if(note)note.textContent=l?'Viewing '+l.name+' near '+l.place+' · positions approximate':'Tap a gold lock to explore all eight locations';
    renderList();
  }
  // The eight locks are permanent landmarks, never AIS contacts. At wide zoom
  // the tightly spaced Thorold flight (4-6) shares one expandable landmark.
  function lockIcon(lock,active=false,compact=false){
    const html='<span class="lock-pin__shield"><span class="lock-pin__word">LOCK</span><span class="lock-pin__digit">'+lock.id+'</span></span><span class="lock-pin__point"></span>';
    const width=compact?30:52,height=compact?35:66;
    return L.divIcon({className:'welland-lock-pin'+(active?' is-active':'')+(compact?' is-compact':''),html,iconSize:[width,height],iconAnchor:[Math.round(width/2),height-4],popupAnchor:[0,-height+10]});
  }
  function flightIcon(active=false,wide=false){
    const title=wide?'CENTRAL':'THOROLD';
    const number=wide?'3–7':'4–6';
    const subtitle=wide?'TAP TO EXPAND':'FLIGHT LOCKS';
    const html='<span class="lock-pin__shield"><span class="lock-pin__word">'+title+'</span><span class="lock-pin__digit">'+number+'</span><span class="lock-pin__flight">'+subtitle+'</span></span><span class="lock-pin__point"></span>';
    return L.divIcon({className:'welland-lock-pin is-flight'+(active?' is-active':''),html,iconSize:[86,71],iconAnchor:[43,67],popupAnchor:[0,-62]});
  }
  function lockPopup(lock){
    const pop=document.createElement('div');
    pop.append(el('strong',lock.name+' · '+lock.place),el('p',lock.note));
    const note=el('p','Approximate lock location; not a live occupancy or passage-status indicator.');
    note.className='small';
    pop.append(note);
    const btn=el('button','Explore this lock','subtle-btn');
    btn.type='button';
    btn.addEventListener('click',()=>chooseLock(lock.id));
    pop.append(btn);
    if(lock.url){
      const link=el('a','Official visitor details ↗','lock-popup-link');
      link.href=lock.url;link.target='_blank';link.rel='noopener noreferrer';
      pop.append(link);
    }
    return pop;
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
      const marker=L.marker([lock.lat,lock.lon],{icon:lockIcon(lock,selected===lock.id,wide),keyboard:true,title:lock.name+', '+lock.place,zIndexOffset:750})
        .addTo(lockLayer).bindTooltip(lock.name,{direction:'top'}).bindPopup(lockPopup(lock));
      marker.on('click',()=>chooseLock(lock.id,false));
      lockMarkers.set(lock.id,marker);
    });
    if(wide){
      flightMarker=L.marker([43.1382,-79.1920],{icon:flightIcon(['3','4','5','6','7'].includes(selected),true),keyboard:true,title:'Central locks 3 through 7, click to expand',zIndexOffset:780})
        .addTo(lockLayer).bindTooltip('Locks 3–7 · click to zoom in',{direction:'top'});
      flightMarker.on('click',()=>{map.setView([43.1382,-79.1920],12);chooseLock('3',false);});
    }else if(combine){
      flightMarker=L.marker([43.1382,-79.1920],{icon:flightIcon(['4','5','6'].includes(selected)),keyboard:true,title:'Thorold flight locks 4 through 6, click to expand',zIndexOffset:780})
        .addTo(lockLayer).bindTooltip('Locks 4–6 · click to zoom in',{direction:'top'});
      flightMarker.on('click',()=>{map.setView([43.1382,-79.1920],14);chooseLock('5',false);});
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
      renderList();renderMarkers();
      const credits=$('sourceCredit');credits.replaceChildren();
      (data.attribution||[]).forEach(a=>credits.append(el('span',a.credit||a.source)));
    } catch (_) {
      vesselData=[];
      status.textContent='AIS data unavailable — official vessel schedule remains available below';
      updated.textContent='Unable to verify fresh AIS positions';
      renderList();renderMarkers();
    } finally {
      busy=false;$('refreshShips').disabled=false;
    }
  }
  $('shipSearch').addEventListener('input',renderList);
  select.addEventListener('change',()=>chooseLock(select.value));
  $('refreshShips').addEventListener('click',refresh);
  $('showAllLocks').addEventListener('click',()=>chooseLock('all'));
  renderLocks();chooseLock('all');initMap();refresh();
  window.setInterval(refresh,120000);
})();
