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
      btn.type='button';btn.addEventListener('click',()=>{if(!map)return;map.setView([v.lat,v.lon],13);const node=$('shipMap');node.scrollIntoView({behavior:'smooth',block:'center'});});
      card.append(title,meta,detail,btn);list.append(card);
    });
  }
  function renderLocks() {
    const rail=$('lockRail');rail.replaceChildren();
    LOCKS.forEach(l=>{
      const b=el('button',undefined,'lock-pill');b.type='button';b.dataset.lock=l.id;
      const heading=el('strong',l.name),caption=el('span',l.place);
      b.append(heading,caption);
      b.setAttribute('aria-pressed',String(selected===l.id));
      b.addEventListener('click',()=>chooseLock(l.id));
      rail.append(b);
    });
  }
  function chooseLock(id) {
    selected=id;select.value=id;
    for(const b of $('lockRail').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.lock===id));
    const l=LOCKS.find(x=>x.id===id);
    if(map&&l) map.setView([l.lat,l.lon],id==='4'||id==='5'||id==='6'?14:13);
    else if(map)map.fitBounds([[42.87,-79.30],[43.26,-79.16]]);
    const text=l?l.name+' · '+l.place+': '+l.note:'All eight locks, from Lake Ontario to Lake Erie. Select a lock for an approximate location and nearby AIS reports.';
    $('lockFocus').textContent=text;
    renderList();
  }
  function initMap() {
    if(!window.L){$('mapFallback').hidden=false;return;}
    map=L.map('shipMap',{scrollWheelZoom:false}).setView([43.075,-79.21],10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:18}).addTo(map);
    shipsLayer=L.layerGroup().addTo(map);
    const markers=L.layerGroup().addTo(map);
    LOCKS.forEach(l=>{
      const marker=L.circleMarker([l.lat,l.lon],{radius:7,color:'#113a4d',weight:2,fillColor:'#e6ad53',fillOpacity:1}).addTo(markers);
      const pop=document.createElement('div');
      pop.append(el('strong',l.name),el('p',l.place+' — '+l.note));
      const btn=el('button','Show nearby vessels');btn.type='button';btn.addEventListener('click',()=>chooseLock(l.id));pop.append(btn);
      marker.bindPopup(pop);
    });
    L.polyline([[43.24,-79.22],[43.2175,-79.213],[43.193,-79.202],[43.155,-79.193],[43.123,-79.194],[43.075,-79.202],[43.030,-79.217],[42.970,-79.240],[42.899,-79.246],[42.862,-79.25]],
      {color:'#397e98',weight:3,opacity:.55,dashArray:'5 7'}).addTo(map);
    L.control.scale({imperial:false}).addTo(map);
    window.setTimeout(()=>map.invalidateSize(),250);
  }
  function renderMarkers() {
    if(!shipsLayer)return;
    shipsLayer.clearLayers();
    vesselData.forEach(v=>{
      const n=nearest(v);
      const marker=L.circleMarker([v.lat,v.lon],{radius:6,color:'#fff',weight:1.5,fillColor:'#188f9c',fillOpacity:.95}).addTo(shipsLayer);
      const pop=document.createElement('div');
      pop.append(el('strong',v.name||v.mmsi),el('p',timeLabel(v)+'. '+heading(v)+'.'));
      pop.append(el('p',n.km<=1.5?'Reported near '+n.lock.name:'Nearest mapped lock: '+n.lock.name));
      marker.bindPopup(pop);
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
  renderLocks();chooseLock('all');initMap();refresh();
  window.setInterval(refresh,120000);
})();
