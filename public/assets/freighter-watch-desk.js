/* Freighter Watch Desk: source-preserving composition of existing AIS engines.
 * Arrival windows belong exclusively to Soo and Duluth source models.
 * Other corridors show recent observations only. No predicted itinerary.
 */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root && root.document) {
    root.FreighterWatchDesk = engine;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => engine.mount(root.document));
    else engine.mount(root.document);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const MAX_REPORT_MS = 30 * 60 * 1000;
  const MAX_CHECK_MS = 3 * 60 * 1000;
  const CONFIG = Object.freeze({
    soo: {label:'Soo Locks',zone:'America/Detroit',kind:'soo',endpoint:'/api/soo-ais',
      center:[46.503,-84.352],zoom:12,link:'/soo-locks/',visit:'/soo-locks/plan-your-visit/',
      spot:'Soo Locks observation platform',note:'Confirm observation-platform and Visitor Center access before traveling.'},
    duluth: {label:'Duluth Canal Park',zone:'America/Chicago',kind:'duluth',endpoint:'/api/duluth-canal',
      center:[46.7783,-92.0908],zoom:13,viewPoint:[46.779847,-92.092464],link:'/duluth-canal-park/',visit:'/duluth-canal-park/',
      spot:'Ship Canal / Canal Park',note:'Use the Duluth guide to compare the north pier, Park Point and Lakewalk viewing areas.'},
    port: {label:'Port Huron',zone:'America/Detroit',kind:'observation',endpoint:'/api/freighter-ais',
      center:[42.977,-82.423],zoom:11,bbox:[42.84,-82.58,43.14,-82.34],
      link:'/great-lakes-freighter-tracking/#port-huron',visit:'/great-lakes-ship-watching-spots/#viewing-guide',
      spot:'Vantage Point / Thomas Edison Parkway',note:'This map centers on the general river area, not an entrance or guaranteed view.'},
    mackinac: {label:'Straits of Mackinac',zone:'America/Detroit',kind:'observation',endpoint:'/api/freighter-ais',
      center:[45.79,-84.76],zoom:10,bbox:[45.58,-85.22,45.95,-84.43],
      link:'/great-lakes-freighter-tracking/#mackinac',visit:'/great-lakes-ship-watching-spots/#viewing-guide',
      spot:'Mackinaw City / St. Ignace public shoreline',note:'Open-water vessels may be distant from shore. This is an area reference, not a parking pin.'},
    detroit: {label:'Detroit River',zone:'America/Detroit',kind:'observation',endpoint:'/api/freighter-ais',
      center:[42.32,-83.05],zoom:11,bbox:[42.12,-83.24,42.44,-82.82],
      link:'/detroit-river-freighters/',visit:'/detroit-river-freighters/',
      spot:'Public Detroit Riverfront',note:'Choose a legal public viewpoint; recent river positions do not prove a visible passage.'},
    saginaw: {label:'Saginaw Bay / Bay City',zone:'America/Detroit',kind:'observation',endpoint:'/api/freighter-ais',
      center:[43.63,-83.88],zoom:10,bbox:[43.38,-84.15,44.08,-83.14],
      link:'/great-lakes-freighter-tracking/#saginaw',visit:'/great-lakes-ship-watching-spots/#viewing-guide',
      spot:'Bay City public riverfront',note:'Bay reports are broad-area observations. They do not establish a Saginaw River arrival.'}
  });
  function validDate(value, now, maxAge) {
    const t = Date.parse(value || '');
    return Number.isFinite(t) && t <= now + 60000 && now - t >= -60000 && now - t <= maxAge ? t : null;
  }
  function finiteCoord(v) { return v && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lon)) && Math.abs(Number(v.lat)) <= 90 && Math.abs(Number(v.lon)) <= 180; }
  function usableVessel(v, now) {
    return !!(v && /^\d{9}$/.test(String(v.mmsi || v.id || '')) && finiteCoord(v) &&
      validDate(v.seen, now, MAX_REPORT_MS) !== null);
  }
  function inBounds(v, box) {
    return finiteCoord(v) && v.lat >= box[0] && v.lat <= box[2] && v.lon >= box[1] && v.lon <= box[3];
  }
  function identity(v) { return String(v && (v.mmsi || v.id) || ''); }
  function safeWindow(candidate, candidates, now, maxHours) {
    if (!usableVessel(candidate, now)) return null;
    const list = Array.isArray(candidates) ? candidates : [];
    const match = list.find(item => identity(item) === identity(candidate) && item.seen === candidate.seen &&
      item.window && candidate.window && item.window.start === candidate.window.start && item.window.end === candidate.window.end);
    if (!match) return null;
    const start = Date.parse(candidate.window && candidate.window.start);
    const end = Date.parse(candidate.window && candidate.window.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now ||
      end > now + maxHours * 3600000 || start < now - 2 * 3600000) return null;
    const confidence = Number(candidate.confidence);
    if (!Number.isFinite(confidence) || confidence < 0.48 || confidence > 1) return null;
    return { start:new Date(start).toISOString(),end:new Date(end).toISOString() };
  }
  function localDay(iso, zone) {
    return new Intl.DateTimeFormat('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
  }
  function eligibleForWhen(window, when, now, zone) {
    if (!window) return false;
    if (when === 'now') return Date.parse(window.start) <= now + 90 * 60000 && Date.parse(window.end) > now;
    if (when === 'today') return localDay(window.start, zone) === localDay(now, zone) ||
      (Date.parse(window.start) < now && Date.parse(window.end) > now);
    return false;
  }
  function evaluate(key, data, when = 'today', now = Date.now()) {
    const config = CONFIG[key] || CONFIG.soo;
    const base = {config,when,source:'Open Waters AIS via existing site engine',observations:[],pick:null,
      status:'unknown',reason:'No reliable recent evidence is available.',checkedAt:null,attribution:[]};
    if (when === 'tomorrow') {
      base.reason = 'Current AIS does not establish tomorrow’s ship passages. Use the local guide and return when fresh evidence is available.';
      return base;
    }
    if (!data || data.ok !== true || validDate(data.checkedAt, now, MAX_CHECK_MS) === null) {
      base.status = 'unavailable';
      base.reason = 'The source check failed or is too old to support a current viewing decision.';
      return base;
    }
    base.checkedAt = data.checkedAt;
    base.attribution = Array.isArray(data.attribution) ? data.attribution : [];
    let vessels = config.kind === 'duluth' ? data.mapVessels : data.vessels;
    vessels = Array.isArray(vessels) ? vessels : [];
    base.observations = vessels.filter(v => usableVessel(v, now) &&
      (!config.bbox || inBounds(v, config.bbox))).sort((a,b) => Date.parse(b.seen) - Date.parse(a.seen)).slice(0,20);
    let candidate = null;
    let candidateList = [];
    if (config.kind === 'soo' && data.nextShip && data.nextShip.ok === true) {
      candidate = data.nextShip.pick;
      candidateList = data.nextShip.candidates;
    } else if (config.kind === 'duluth') {
      candidate = data.watchPick;
      candidateList = data.candidates;
    }
    const window = safeWindow(candidate,candidateList,now,config.kind === 'soo' ? 10 : 26);
    if (window && eligibleForWhen(window,when,now,config.zone)) {
      base.pick = {ship:candidate,window};
      // Corridor models may see an approaching vessel beyond the map's local AIS box.
      if (!base.observations.some(v => identity(v) === identity(candidate))) base.observations.unshift(candidate);
      base.status = 'window';
      base.reason = 'A corridor-specific engine supports a modeled viewing window. Movement, waiting and access can still change.';
      return base;
    }
    if (base.observations.length) {
      base.status = 'observed';
      base.reason = config.kind === 'observation'
        ? 'Ships have reported positions in this general area, but we cannot confirm when one will pass your viewing spot. Check the map before you drive.'
        : 'There are recent vessel reports, but no reliable passage window for the time you selected.';
    } else {
      base.reason = 'No vessel report under 30 minutes old meets this location filter. This does not mean the waterway is empty.';
    }
    return base;
  }
  function formatTime(iso,zone) {
    return new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
  }
  function make(doc,tag,value,className) {
    const node=doc.createElement(tag);
    if (value != null) node.textContent=String(value);
    if(className) node.className=className;
    return node;
  }
  function link(doc,text,href,className) {
    const a=make(doc,'a',text,className);
    a.href=href;
    return a;
  }
  function render(result,doc) {
    const config=result.config;
    const headline=doc.getElementById('fwd-headline');
    const body=doc.getElementById('fwd-message');
    const status=doc.getElementById('fwd-status');
    const source=doc.getElementById('fwd-source');
    const ships=doc.getElementById('fwd-ships');
    const next=doc.getElementById('fwd-next');
    const watching=doc.getElementById('fwd-viewing-location');
    if(!headline||!body||!ships||!status||!source||!next)return;
    if(watching) watching.textContent='Watching from: '+config.spot+' (check access and hours in the local guide).';
    status.dataset.status=result.status;
    status.textContent = result.status==='window'?'MODELED WINDOW':result.status==='observed'?'RECENT OBSERVATIONS':result.status==='unavailable'?'SOURCE UNAVAILABLE':'NOT CONFIRMED';
    if (result.pick) {
      headline.textContent = result.pick.ship.name || 'Reported vessel';
      const w=result.pick.window;
      body.textContent='Estimated passage: '+formatTime(w.start,config.zone)+' to '+formatTime(w.end,config.zone)+'. '+result.reason;
    } else {
      headline.textContent = result.status==='observed'
        ? String(result.observations.length)+' recent ship report'+(result.observations.length===1?'':'s')+' in the selected area'
        : result.when==='tomorrow'?'Tomorrow is not confirmed':result.status==='unavailable'?'Live source unavailable':'No supported passage to call';
      body.textContent=result.reason;
    }
    source.textContent=result.checkedAt ? 'Source checked '+formatTime(result.checkedAt,config.zone)+' · reports expire after 30 minutes · Open Waters AIS' :
      'No current verified source check · no passage forecast';
    next.replaceChildren(
      link(doc,'Where to watch from shore',config.visit,'fwd-button'),
      link(doc,'Open local ship tracker',config.link,'fwd-button fwd-button-alt'));
    ships.replaceChildren();
    const records = result.observations.slice();
    if(result.pick && !records.some(v=>identity(v)===identity(result.pick.ship)))records.unshift(result.pick.ship);
    if(!records.length) {
      ships.append(make(doc,'p','No eligible live vessel records to show. The viewing guide below remains available.','fwd-empty'));
      return;
    }
    for(const v of records.slice(0,8)){
      const card=make(doc,'li',null,'fwd-ship-row');
      const name=make(doc,'strong',v.name || 'Vessel '+identity(v));
      const mins=Math.max(0,Math.floor((Date.now()-Date.parse(v.seen))/60000));
      const speed=Number.isFinite(v.speedKnots)?' · '+Number(v.speedKnots).toFixed(1)+' kn':'';
      const detail=make(doc,'span','AIS '+mins+' min ago'+speed+' · reported position, not an itinerary');
      card.append(name,detail);
      if(finiteCoord(v)){
        const b=make(doc,'button','Locate on map','fwd-locate');
        b.type='button';b.dataset.mmsi=identity(v);
        card.append(b);
      }
      ships.append(card);
    }
  }
  function mount(doc) {
    const shell=doc.getElementById('freighter-watch-desk');
    if(!shell)return;
    const select=doc.getElementById('fwd-place');
    const when=doc.getElementById('fwd-when');
    const refresh=doc.getElementById('fwd-refresh');
    const mapBox=doc.getElementById('fwd-map');
    const mapStatus=doc.getElementById('fwd-map-note');
    const next=doc.getElementById('fwd-next');
    const localDate=doc.getElementById('fwd-local-date');
    if(!select||!when||!refresh||!mapBox||!next)return;
    let map=null, layer=null, generation=0, active=null, lastResult=null;
    let fallbackRequested=false;
    function showLocalDate(){
      if(!localDate)return;
      const config=CONFIG[select.value] || CONFIG.soo;
      const time=new Intl.DateTimeFormat('en-US',{
        timeZone:config.zone,weekday:'long',month:'long',day:'numeric',year:'numeric',
        hour:'numeric',minute:'2-digit',timeZoneName:'short'
      }).format(new Date());
      localDate.textContent='Local date and time in '+config.label+': '+time;
    }
    function track(action) {
      if (typeof window.gtag === 'function') window.gtag('event', action, {
        corridor:select.value, visit_window:when.value,
        evidence_status:lastResult ? lastResult.status : 'unknown', surface:'freighter-watch-desk'
      });
    }
    const params=new URLSearchParams(location.search);
    if(CONFIG[params.get('place')])select.value=params.get('place');
    if(['now','today','tomorrow'].includes(params.get('when')))when.value=params.get('when');
    function initMap(){
      if(map)return;
      if(typeof window.L === 'undefined'){
        mapStatus.textContent='Loading map library. Ship evidence and viewing links remain available.';
        if(!fallbackRequested){
          fallbackRequested=true;
          const stylesheet=doc.createElement('link');
          stylesheet.rel='stylesheet';
          stylesheet.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
          doc.head.append(stylesheet);
          const backup=doc.createElement('script');
          backup.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
          backup.onload=()=>{if(lastResult)draw(lastResult);};
          backup.onerror=()=>{
            mapStatus.textContent='Map library unavailable. Use the vessel list and specialist tracking links instead.';
            mapBox.replaceChildren(make(doc,'p','Map unavailable. The ship list and public-viewing links above still work.','fwd-map-loading'));
          };
          doc.head.append(backup);
        }
        return;
      }
      mapBox.replaceChildren();
      map=window.L.map(mapBox,{scrollWheelZoom:false,zoomControl:true}).setView(CONFIG[select.value].center,CONFIG[select.value].zoom);
      const tiles=window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
        attribution:'&copy; OpenStreetMap contributors &copy; CARTO',maxZoom:18,subdomains:'abcd'
      });
      let failedTiles=0, alternate=false;
      tiles.on('tileerror',()=>{
        failedTiles++;
        if(failedTiles>=5 && !alternate){
          alternate=true;
          map.removeLayer(tiles);
          window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
            attribution:'&copy; OpenStreetMap contributors',maxZoom:18
          }).on('tileerror',()=>{mapStatus.textContent='Base map unavailable. The vessel evidence list is still usable.';}).addTo(map);
        }
      });
      tiles.addTo(map);
      layer=window.L.layerGroup().addTo(map);
      mapBox.dataset.ready='true';
    }
    function shipMarker(v){
      const size=Number(v.lengthMeters)>=298?42:Number(v.lengthMeters)>=190?36:30;
      const course=Number.isFinite(v.course)?v.course:Number.isFinite(v.heading)?v.heading:null;
      const deg=course===null?0:course-90;
      const drawing='<span class="fwd-vessel-symbol" style="width:'+size+'px;height:'+size+'px;transform:rotate('+deg+'deg)" aria-hidden="true"><svg viewBox="0 0 48 48" width="'+size+'" height="'+size+'" focusable="false"><path d="M5 22h28l9 8-9 8H5l5-8z" fill="#113c50" stroke="#fff" stroke-width="2.5"/><path d="M13 26h18v8H13z" fill="#a9d7df"/><path d="M18 18h9v4h-9z" fill="#113c50"/></svg></span>';
      return L.marker([v.lat,v.lon],{icon:L.divIcon({html:drawing,className:'fwd-map-ship',iconSize:[size,size],iconAnchor:[size/2,size/2]})});
    }
    function draw(result){
      initMap();
      if(!map||!layer)return;
      const conf=result.config;
      layer.clearLayers();
      const coords=[];
      for(const v of result.observations){
        if(!finiteCoord(v))continue;
        const m=shipMarker(v).addTo(layer);
        const pop=make(doc,'div',null,'fwd-map-popup');
        pop.append(make(doc,'strong',v.name||'Vessel '+identity(v)),
          make(doc,'p','AIS reported '+Math.max(0,Math.floor((Date.now()-Date.parse(v.seen))/60000))+' min ago. Passage not guaranteed.'));
        m.bindPopup(pop);
        m.options.shipMmsi=identity(v);
        coords.push([Number(v.lat),Number(v.lon)]);
      }
      if(conf.viewPoint){
        const watching=window.L.circleMarker(conf.viewPoint,{radius:10,color:'#fff',weight:3,fillColor:'#c68e31',fillOpacity:1}).addTo(layer);
        const info=make(doc,'div',null,'fwd-map-popup');
        info.append(make(doc,'strong','Public viewing reference: '+conf.spot),
          make(doc,'p','Approximate location from the existing Duluth viewing guide. Confirm access and hours before traveling.'));
        watching.bindPopup(info);
      }
      if(!coords.length)map.setView(conf.center,conf.zoom);
      else map.fitBounds([conf.center,...coords],{padding:[32,32],maxZoom:conf.zoom});
      mapStatus.textContent=coords.length?coords.length+' recent AIS ship position'+(coords.length===1?'':'s')+' · not guaranteed shore sightings':'No eligible ship reports in this area at the last check. Map still shows the waterway.';
      map.invalidateSize();
    }
    async function load(){
      const key=select.value, windowChoice=when.value;
      const conf=CONFIG[key];const thisGen=++generation;
      if(active)active.abort();
      active=new AbortController();
      refresh.disabled=true; refresh.textContent='Checking…';
      showLocalDate();
      const fetchNow=Date.now();
      // No current position can substantiate a next-day visit. Avoid unnecessary upstream calls.
      if(windowChoice==='tomorrow'){
        lastResult=evaluate(key,null,windowChoice,fetchNow);
        render(lastResult,doc);draw(lastResult);refresh.disabled=false;refresh.textContent='Check again';return;
      }
      const controller=active;
      const timeoutId=setTimeout(()=>controller.abort(),12000);
      try{
        const r=await fetch(conf.endpoint,{signal:controller.signal,cache:'no-store'});
        if(!r.ok)throw new Error('provider response');
        const data=await r.json();
        if(thisGen!==generation)return;
        lastResult=evaluate(key,data,windowChoice,Date.now());
      }catch(error){
        if(thisGen!==generation)return;
        lastResult=evaluate(key,null,windowChoice,Date.now());
      }finally{
        clearTimeout(timeoutId);
      }
      if(thisGen!==generation)return;
      render(lastResult,doc);draw(lastResult);
      refresh.disabled=false;refresh.textContent='Check again';
    }
    select.addEventListener('change',()=>{
      const u=new URL(location.href);u.searchParams.set('place',select.value);u.searchParams.set('when',when.value);history.replaceState(null,'',u);
      track('freighter_watch_select');
      load();
    });
    when.addEventListener('change',()=>{
      const u=new URL(location.href);u.searchParams.set('place',select.value);u.searchParams.set('when',when.value);history.replaceState(null,'',u);
      track('freighter_watch_time');
      load();
    });
    refresh.addEventListener('click',()=>{ track('freighter_watch_refresh'); load(); });
    next.addEventListener('click',e=>{ if(e.target.closest('a'))track('freighter_watch_next_action'); });
    doc.getElementById('fwd-ships').addEventListener('click',e=>{
      const b=e.target.closest('button[data-mmsi]');
      if(!b||!map||!layer)return;
      layer.eachLayer(m=>{
        if(m.options.shipMmsi===b.dataset.mmsi){
          map.setView(m.getLatLng(),Math.max(map.getZoom(),12));m.openPopup();
          mapBox.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
        }
      });
    });
    // Map initialization is attempted after each source evaluation, with a secondary Leaflet CDN if needed.
    // A once-valid prediction must not sit on screen indefinitely after a tab is left open.
    setInterval(()=>{ if(!doc.hidden)load(); },90000);
    doc.addEventListener('visibilitychange',()=>{ if(!doc.hidden)load(); });
    showLocalDate();
    load();
  }
  return {CONFIG,validDate,usableVessel,safeWindow,eligibleForWhen,evaluate,mount};
});
