'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const screen = $('launch-geo-map');
  const panel = $('geo-choice-list');
  if (!screen || !panel) return;
  const valid = n => typeof n === 'number' && Number.isFinite(n);
  const geoPointValid = x => valid(x?.lat) && valid(x?.lon) &&
    x.lat > 27.5 && x.lat < 29.5 && x.lon > -81.5 && x.lon < -79.8;
  const say = (id, value) => { const n = $(id); if (n) n.textContent = value; };
  const node = (tag, klass, text) => {
    const el = document.createElement(tag);
    if (klass) el.className = klass;
    if (text != null) el.textContent = String(text);
    return el;
  };
  const link = (href, label, klass) => {
    const el = node('a', klass || 'geo-link', label);
    el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer';
    return el;
  };
  const isOfficialSource = url => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && [
        'www.brevardfl.gov','www.nps.gov','www.kennedyspacecenter.com',
        'www.portcanaveral.com','www.cityofcocoabeach.com'
      ].includes(u.hostname);
    } catch { return false; }
  };
  const isCoordinateSource = url => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && [
        'www.saltchef.com', 'floridahikes.com',
        'www.nps.gov', 'www.kennedyspacecenter.com'
      ].includes(u.hostname);
    } catch { return false; }
  };
  const directionsUrl = nav => {
    if (!nav || !['address','coordinates'].includes(nav.type) ||
        typeof nav.value !== 'string' || nav.value.length > 160) return null;
    if (nav.type === 'coordinates' && !/^-?\d{1,3}(?:\.\d+)?,-?\d{1,3}(?:\.\d+)?$/.test(nav.value)) return null;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(nav.value);
  };
  const profileDescription = {
    family: 'Start with parks whose managers list restrooms, open space or family facilities. No parking or unobstructed view is guaranteed.',
    photo: 'Favor published riverfront, beach and pier locations; bearings describe the direction to the pad, not the rocket’s flight path or a verified sightline.',
    close: 'Sort mapped public sites by approximate straight-line pad distance. Never confuse a closer site with an open site, a shorter drive, or a better view.',
    'low-walk': 'Highlight published parking and on-site facilities, but the accessible route and exact spectator position still require operator confirmation.'
  };
  let current = null, profile = 'family', selected = null;
  let map = null, padMarker = null, connectors = null, lotBoundaries = null, policyLine = null, lotFilter = 'all';
  let markers = new Map(), leafletPromise = null, mapPromise = null, lastMissionId = null;
  const options = document.querySelectorAll('input[name="geo-intent"]');
  function updateExplanation() { say('geo-intent-explainer', profileDescription[profile]); }
  options.forEach(r => r.addEventListener('change', () => {
    if (!r.checked) return;
    profile = r.value;
    selected = null;
    updateExplanation();
    render();
  }));

  function verdict(v) {
    if (v?.level === 'closed') return 'Closure reported';
    if (v?.level === 'ineligible') return 'Not eligible for this pad';
    if (v?.level === 'candidate') return 'General public launch access documented';
    if (v?.level === 'unknown') return 'Entry not verified';
    return 'Check launch-day access';
  }
  function scoring(p) {
    // Presentation order only; this is not a scored certainty of access.
    const blocked = ['closed','ineligible'].includes(p.level) ? 100 : 0;
    const category = p.category === 'public-viewpoint' ? 0 :
      p.category === 'ticketed-entry' ? 18 : 35;
    if (profile === 'close') {
      // True GIS ordering within the category. Do not let editorial tags
      // override the actual measured reference-point distance.
      return blocked + category + (validViewGeometry(p) ? p.geometry.miles : 60);
    }
    const fit = (p.profiles || []).includes(profile) ? -20 : 0;
    return blocked + category + fit;
  }
  function validViewGeometry(p) {
    return (p.category === 'public-viewpoint' || p.category === 'beach-parking') &&
      ['site-reference','nps-verified-parking-footprint'].includes(p.coordinateRole) && !!p.geometry &&
      valid(p.geometry.miles) && p.geometry.miles >= 0 && p.geometry.miles < 80 &&
      valid(p.geometry.bearingDegrees);
  }
  function iconHtml(kind, selectedPoint, unavailable, number) {
    const glyph = kind === 'lot' ? String(Number.isInteger(number) && number>=1 && number<=13?number:'?') :
      kind === 'pad' ? '🚀' : kind === 'entry' ? '↳' : '•';
    const klass = 'geo-pin geo-pin-' + kind + (selectedPoint ? ' geo-pin-active' : '') +
      (unavailable ? ' geo-pin-restricted' : '');
    return '<span class="' + klass + '" aria-hidden="true">' + glyph + '</span>';
  }
  function leafletIcon(kind, active, blocked, number) {
    return window.L.divIcon({
      className: 'geo-pin-shell', html: iconHtml(kind, active, blocked, number),
      iconSize: [34, 38], iconAnchor: [17, 34], popupAnchor: [0, -26]
    });
  }
  function showOnMap(p, fit = false) {
    if (!map || !geoPointValid(p)) return;
    const L = window.L;
    if (fit) map.setView([p.lat,p.lon], p.category==='beach-parking'?14:12, { animate: true });
    if (connectors) { map.removeLayer(connectors); connectors = null; }
    if (validViewGeometry(p) && geoPointValid(current?.pad)) {
      connectors = L.polyline([
        [p.lat,p.lon],[current.pad.lat,current.pad.lon]
      ], { color: '#a86a30', weight: 2, dashArray: '5 9', opacity: .8,
        interactive: false }).addTo(map);
    }
    markers.forEach(({ marker, point }) => {
      const kind = point.category === 'beach-parking' ? 'lot' :
        point.category === 'public-viewpoint' ? 'view' : 'entry';
      marker.setIcon(leafletIcon(kind, point.id === p.id,
        ['closed','ineligible'].includes(point.level),point.number));
    });
    const selectedMarker = markers.get(p.id)?.marker;
    if (selectedMarker) selectedMarker.openPopup();
  }
  function focusPoint(id, move = true) {
    selected = id;
    document.querySelectorAll('[data-geo-id]').forEach(el => {
      el.dataset.active = el.dataset.geoId === id ? 'true' : 'false';
    });
    const target = current?.points?.find(p => p.id === id);
    if (target) showOnMap(target, move);
  }

  function weatherEvidence(p) {
    const w=p?.weather;
    const row=node('p','geo-weather');
    if (!w || w.status!=='ok' || w.cloudStatus!=='ok' ||
        !Number.isInteger(w.cloudCoverPercent)) {
      row.textContent='NWS site-specific sky comparison: ' +
        (w?.status==='not-in-forecast-window'?'awaiting a precise launch time within seven days':'not verified for the selected launch window') + '.';
      row.dataset.state='unknown';
      return row;
    }
    row.dataset.state=w.assessmentLevel==='poor'?'poor':'observed-forecast';
    row.appendChild(node('strong','','NWS '+w.cloudCoverPercent+'% total sky cover'));
    row.appendChild(node('span','',
      ' · '+(w.forecastShortDescription||'local sky forecast')+
      (p.category==='beach-parking'?' · same representative Lot 8 grid for all beach lots.':
       ' · not a rocket flight-path or sightline forecast.')));
    return row;
  }
  const lotFilterNodes=document.querySelectorAll('input[name="geo-lot-filter"]');
  lotFilterNodes.forEach(input=>input.addEventListener('change',()=>{
    if (!input.checked)return;
    lotFilter=input.value;
    renderPlayalindaLots();
  }));
  function renderPlayalindaLots() {
    const grid=$('geo-lot-grid');
    if(!grid)return;
    const lots=(current?.points||[])
      .filter(p=>p.category==='beach-parking' && geoPointValid(p));
    grid.replaceChildren();
    if(lots.length===0) {
      grid.appendChild(node('p','geo-choice-empty',
        'Official NPS numbered lot geography is temporarily unavailable. Use the park source links and the mapped entrance only.'));
      return;
    }
    let ordered=lots.slice();
    if(lotFilter==='ramps')ordered=ordered.filter(p=>p.accessibility?.beachRampInOfficialFaq);
    if(lotFilter==='close')ordered.sort((a,b)=>(a.geometry?.miles ?? 100)-(b.geometry?.miles ?? 100));
    else ordered.sort((a,b)=>a.number-b.number);
    for(const p of ordered) {
      const card=node('article','geo-lot-card');
      card.dataset.geoId=p.id;
      card.dataset.state=p.level||'unknown';
      card.dataset.active=p.id===selected?'true':'false';
      const top=node('div','geo-lot-top');
      top.append(node('span','geo-lot-number',String(p.number)),
        node('strong','','Beach parking #'+p.number));
      card.appendChild(top);
      const badge=node('p','geo-lot-access',verdict(p));
      badge.dataset.state=p.level||'unknown';
      card.appendChild(badge);
      if(p.accessibility?.beachRampInOfficialFaq)
        card.appendChild(node('p','geo-lot-ramp',
          'NPS FAQ lists an accessible beach ramp. Condition not verified.'));
      else card.appendChild(node('p','geo-lot-ramp',
        'Accessible parking is documented, but an accessible beach ramp is not confirmed in the NPS FAQ.'));
      if(p.accessibility?.coastalDuneNote)
        card.appendChild(node('p','geo-lot-dune',p.accessibility.coastalDuneNote+'.'));
      if(validViewGeometry(p))card.appendChild(node('p','geo-lot-geometry',
        '~'+p.geometry.miles.toFixed(1)+' mi to assigned pad · '+p.geometry.bearingDegrees+
        '° '+p.geometry.bearingCardinal+' (ground only)'));
      if(p.level==='closed')card.appendChild(node('p','geo-lot-alert',
        'Current checked NPS source reports a closure. Do not travel to this lot without confirmation.'));
      card.appendChild(weatherEvidence(p));
      const actions=node('div','geo-lot-actions');
      const zoom=node('button','geo-map-focus','Inspect official footprint');
      zoom.type='button';zoom.setAttribute('aria-label','Locate Playalinda lot '+p.number+' on the NPS GIS map');
      zoom.addEventListener('click',()=>{
        focusPoint(p.id);
        if(window.innerWidth<850)screen.scrollIntoView({behavior:'smooth',block:'center'});
      });
      actions.appendChild(zoom);
      if(isOfficialSource(p.accessSource))actions.appendChild(link(p.accessSource,'NPS restrictions','geo-link'));
      card.appendChild(actions);
      grid.appendChild(card);
    }
    const explained=$('geo-lot-explain');
    if(explained)explained.textContent=
      (lotFilter==='ramps'?'Showing '+ordered.length+' lots with accessible beach ramps specifically named in the NPS FAQ. ':
       lotFilter==='close'?'Sorted by straight-line pad distance from official parking centroids, NOT predicted visibility, route time or parking access. ':
       'All '+lots.length+' numbered lots come from NPS public GIS polygons, not crowdsourced coordinates. ')+
      'NPS describes accessible parking, but lot opening, ramp condition and NASA launch security must be verified independently.';
  }

  function row(p, idx) {
    const card = node('article', 'geo-choice');
    card.dataset.geoId = p.id;
    card.dataset.active = p.id === selected ? 'true' : 'false';
    const head = node('div', 'geo-choice-top');
    const ordinal = node('span', 'geo-choice-index', String(idx + 1).padStart(2, '0'));
    const cat = p.category === 'public-viewpoint' ? 'Public park reference' :
      p.category === 'ticketed-entry' ? 'Ticketed visitor entrance' : 'NPS entry checkpoint';
    head.append(ordinal, node('span', 'geo-choice-type', cat));
    card.appendChild(head);
    const h = node('h5', '', p.name);
    card.appendChild(h);
    const state = node('p','geo-choice-state',verdict(p));
    state.dataset.state = p.level || 'unknown';
    card.appendChild(state);
    const info = node('div', 'geo-choice-measure');
    if (validViewGeometry(p)) {
      info.appendChild(node('strong','', '~' + p.geometry.miles.toFixed(1) + ' mi'));
      info.appendChild(node('span','',p.geometry.bearingDegrees + '° ' +
        p.geometry.bearingCardinal + ' toward pad'));
    } else {
      info.appendChild(node('strong','', p.category === 'access-checkpoint' ?
        'Not a viewing location' : 'Arrival point only'));
    }
    card.appendChild(info);
    card.appendChild(node('p','geo-choice-summary',
      p.geographyCaveat || 'This pin does not guarantee a safe or legal viewing position.'));
    const chips = node('div','geo-facility-tags');
    (p.visitorFeatures || []).slice(0,4).forEach(f => chips.appendChild(node('span','',f)));
    card.appendChild(chips);
    if(p.weather)card.appendChild(weatherEvidence(p));
    const actions = node('div','geo-choice-actions');
    const focus = node('button','geo-map-focus','See on map');
    focus.type = 'button';
    focus.setAttribute('aria-label','Show '+p.name+' on the interactive map');
    focus.addEventListener('click',() => {
      focusPoint(p.id);
      if (window.innerWidth < 850) screen.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    actions.appendChild(focus);
    const destination = directionsUrl(p.navigation);
    if (destination && !['closed','ineligible'].includes(p.level)) {
      actions.appendChild(link(destination,
        p.category === 'public-viewpoint' ? 'Navigate to listed address' : 'Find official entrance'));
    }
    if (isOfficialSource(p.accessSource)) actions.appendChild(link(p.accessSource, 'Official access rules'));
    if (isCoordinateSource(p.geographicSource)) actions.appendChild(link(p.geographicSource, 'GPS provenance'));
    card.appendChild(actions);
    if (p.sourceChecked) card.appendChild(node('p','geo-navigation-caveat',
      'Geographic source audit: ' + p.sourceChecked + '. Map points are not live parking updates.'));
    if (p.navigation?.caveat) card.appendChild(node('p','geo-navigation-caveat',p.navigation.caveat));
    return card;
  }
  function render() {
    const geo = current;
    if (!geo || !Array.isArray(geo.points)) {
      panel.replaceChildren(node('p','geo-choice-empty','The geographic inventory is unavailable; please use the official access links below.'));
      say('geo-map-status','The map cannot verify locations right now. Existing official access links remain available.');
      return;
    }
    const pad = geo.pad;
    say('geo-pad-label', pad ? pad.name : 'Precise launch pad not verified');
    say('geo-pad-detail', pad ?
      'LL2 pad coordinates are matched to the selected mission, but this launch facility is restricted. Do not navigate there.' :
      'No trusted Florida pad coordinate for this mission. Pad-distance comparisons are withheld.');
    const sorted = geo.points.slice().filter(p=>geoPointValid(p) && p.category!=='beach-parking')
      .sort((a,b)=>scoring(a)-scoring(b) || a.name.localeCompare(b.name));
    panel.replaceChildren();
    say('geo-site-count', geo.points.filter(p=>p.category==='public-viewpoint').length+
      ' public park references · '+
      geo.points.filter(p=>p.category==='beach-parking').length+' NPS mapped lots · '+
      geo.points.filter(p=>['ticketed-entry','access-checkpoint'].includes(p.category)).length+' entrance points');
    sorted.forEach((p,i) => panel.appendChild(row(p,i)));
    const unlocated = Array.isArray(geo.unlocated) ? geo.unlocated : [];
    if (unlocated.length) {
      const note = node('div','geo-unlocated');
      note.appendChild(node('strong','','Not pinned until we verify a precise visitor position'));
      note.appendChild(node('p','','Restricted ticketed launch-viewing sites and any unverified park position retain official access descriptions but no visitor GPS marker. All 13 numbered Playalinda lots now have NPS map polygons.'));
      const names = unlocated.map(x=>x.name).slice(0,6).join(' · ');
      note.appendChild(node('p','geo-unlocated-names',names));
      panel.appendChild(note);
    }
    const policy = $('geo-policy-desk');
    if (policy) {
      policy.dataset.verified = geo.npsAlertsVerified ? 'true' : 'false';
      let checked = geo.npsAlertCheckedAt ? new Date(geo.npsAlertCheckedAt) : null;
      if (checked && Number.isNaN(+checked)) checked = null;
      const meta = checked ? checked.toLocaleString('en-US',{timeZone:'America/New_York',
        month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}) : null;
      const p = policy.querySelector('p');
      const road=geo.roadDecision || {};
      const cutoff=Date.parse(road.estimatedRoadRestrictionAt || '');
      const threshold=Number.isFinite(cutoff) ?
        new Date(cutoff).toLocaleString('en-US',{timeZone:'America/New_York',
          month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}) : null;
      const heading=policy.querySelector('strong');
      if(heading)heading.textContent=road.label || 'Published NPS road-entry policy (not live status)';
      if (p) p.textContent = (geo.npsAlertsVerified ?
        'NPS official park alerts last checked ' + (meta || 'recently') + '. ' :
        'Current NPS alerts are unverified. ') +
        (threshold?'Schedule-based T−30 estimate: '+threshold+'. ':'No reliable exact T−30 deadline for this mission. ')+
        (road.detail || geo.policy?.detail || 'Launch-specific gate access is never guaranteed.') +
        ' The map overlays an NPS road centerline, NOT live gate status or a current closure order.';
      policy.dataset.level=road.level||'unknown';
    }
    renderPlayalindaLots();
    if (!selected || !geo.points.some(p=>p.id===selected)) selected = sorted.find(p=>p.category==='public-viewpoint')?.id || sorted[0]?.id;
    focusPoint(selected, false);
    void drawMap();
  }
  function addCss(url) {
    if (document.querySelector('link[data-geo-leaflet]')) return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=url;l.dataset.geoLeaflet='true';document.head.appendChild(l);
  }
  function loadLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve,reject) => {
      addCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
      script.defer=true;script.crossOrigin='anonymous';
      script.onload=()=>window.L?.map?resolve(window.L):reject(new Error('Leaflet unavailable'));
      script.onerror=()=>reject(new Error('Mapping library unavailable'));
      document.head.appendChild(script);
      setTimeout(()=>{if(!window.L?.map)reject(new Error('Map library timed out'));},9500);
    }).catch(error=>{leafletPromise=null;throw error});
    return leafletPromise;
  }
  async function loadTiles(L,m) {
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const fallback = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:18, attribution
    });
    // Keep map usable even if the CARTO configuration service is temporarily out.
    fallback.addTo(m);
    screen.dataset.tiles = 'osm';
    try {
      const r=await fetch('/api/carto-basemap-config',{
        credentials:'same-origin',signal:AbortSignal.timeout(5500)
      });
      if (!r.ok) return;
      const cfg=await r.json();
      if (cfg.provider !== 'CARTO' || typeof cfg.key !== 'string' ||
          !/^[a-zA-Z0-9._~+-]{10,512}$/.test(cfg.key.trim())) return;
      const tile=L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key='+
        encodeURIComponent(cfg.key.trim()),{
          subdomains:'abcd',maxZoom:19,
          attribution:attribution+' &copy; <a href="https://carto.com/attributions">CARTO</a>'
        });
      let loaded=0,errors=0;
      tile.on('tileload',()=>{
        if (++loaded === 1) {
          if (m.hasLayer(fallback))m.removeLayer(fallback);
          screen.dataset.tiles='carto';
        }
      });
      tile.on('tileerror',()=>{
        if (++errors>2 && loaded===0) {
          if (m.hasLayer(tile))m.removeLayer(tile);
          if (!m.hasLayer(fallback))fallback.addTo(m);
          screen.dataset.tiles='osm-fallback';
        }
      });
      tile.addTo(m);
    } catch {
      // Attribution and location markers remain usable with OSM fallback.
    }
  }
  async function drawMap() {
    if (mapPromise) { await mapPromise; renderMapMarkers(); return; }
    mapPromise=(async()=>{
      const L=await loadLeaflet();
      screen.replaceChildren();
      map=L.map(screen,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true});
      map.setView([28.56,-80.68],10);
      void loadTiles(L,map); // Draw markers immediately; basemap configuration can arrive afterward.
      const resize=()=>map?.invalidateSize({pan:false});
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(screen);
      window.addEventListener('load',resize,{once:true});
      screen.dataset.ready='true';
    })();
    try {await mapPromise;renderMapMarkers();}
    catch {
      say('geo-map-status','Interactive map tiles unavailable. Locations, sources and safe navigation options remain listed beside the map.');
      screen.replaceChildren(node('div','geo-map-placeholder',
        'Map could not load. Use the verified location cards and official directions; do not assume access.'));
      mapPromise=null; map=null;
    }
  }
  function renderMapMarkers() {
    if (!map || !current) return;
    const L=window.L;
    markers.forEach(obj=>map.removeLayer(obj.marker));
    markers.clear();
    if (padMarker) {map.removeLayer(padMarker);padMarker=null;}
    if (connectors) {map.removeLayer(connectors);connectors=null;}
    if (lotBoundaries) {map.removeLayer(lotBoundaries);lotBoundaries=null;}
    if (policyLine) {map.removeLayer(policyLine);policyLine=null;}
    const points=(current.points||[]).filter(geoPointValid);
    const bounds=[];
    if (geoPointValid(current.pad)) {
      const pad=current.pad;
      padMarker=L.marker([pad.lat,pad.lon],{icon:leafletIcon('pad',false,false),
        keyboard:true,title:'Restricted launch facility: '+pad.name}).addTo(map);
      const pop=node('div','geo-popup');
      pop.append(node('strong','',pad.name),
        node('p','','Restricted launch pad. These coordinates are not a visitor entrance or driving destination.'));
      padMarker.bindPopup(pop);
      bounds.push([pad.lat,pad.lon]);
    }
    points.forEach(p=>{
      const kind=p.category==='beach-parking'?'lot':p.category==='public-viewpoint'?'view':'entry';
      const marker=L.marker([p.lat,p.lon],{
        title:p.name,keyboard:true,
        icon:leafletIcon(kind,p.id===selected,['closed','ineligible'].includes(p.level),p.number)
      }).addTo(map);
      const popup=node('div','geo-popup');
      popup.appendChild(node('strong','',p.name));
      popup.appendChild(node('p','',verdict(p)));
      popup.appendChild(node('p','',p.mapAccuracy));
      const b=node('button','geo-map-focus','Inspect this location');
      b.type='button'; b.addEventListener('click',()=>focusPoint(p.id,false));
      popup.appendChild(b);
      marker.bindPopup(popup);
      marker.on('click',()=>focusPoint(p.id,false));
      markers.set(p.id,{marker,point:p});
      bounds.push([p.lat,p.lon]);
    });
    if(bounds.length)map.fitBounds(bounds,{padding:[28,28],maxZoom:12});
    const chosen=points.find(p=>p.id===selected);
    if(chosen)showOnMap(chosen,false);
    say('geo-map-status',
      (current.pad ? 'Mapped the selected mission’s launch pad with ' :
        'Launch-pad GPS unavailable; mapped ') +
      points.filter(p=>p.category==='public-viewpoint').length+
      ' public park references, '+
      points.filter(p=>p.category==='beach-parking').length+
      ' actual NPS lot footprints and 2 official entrances. No inferred live closures.');
  }
  updateExplanation();
  document.addEventListener('space-coast:launch-loaded',event=>{
    const d=event.detail;
    if(!d || !d.geographicViewing) {
      current=null;render();return;
    }
    if(d.selectedLaunchId!==lastMissionId)selected=null;
    lastMissionId=d.selectedLaunchId;
    current=d.geographicViewing;
    render();
  });
}());
