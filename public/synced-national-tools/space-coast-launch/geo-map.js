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
  let map = null, padMarker = null, connectors = null;
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
    return p.category === 'public-viewpoint' &&
      p.coordinateRole === 'site-reference' && !!p.geometry &&
      valid(p.geometry.miles) && p.geometry.miles >= 0 && p.geometry.miles < 80 &&
      valid(p.geometry.bearingDegrees);
  }
  function iconHtml(kind, selectedPoint, unavailable) {
    const glyph = kind === 'pad' ? '🚀' : kind === 'entry' ? '↳' : '•';
    const klass = 'geo-pin geo-pin-' + kind + (selectedPoint ? ' geo-pin-active' : '') +
      (unavailable ? ' geo-pin-restricted' : '');
    return '<span class="' + klass + '" aria-hidden="true">' + glyph + '</span>';
  }
  function leafletIcon(kind, active, blocked) {
    return window.L.divIcon({
      className: 'geo-pin-shell', html: iconHtml(kind, active, blocked),
      iconSize: [34, 38], iconAnchor: [17, 34], popupAnchor: [0, -26]
    });
  }
  function showOnMap(p, fit = false) {
    if (!map || !geoPointValid(p)) return;
    const L = window.L;
    if (fit) map.setView([p.lat,p.lon], 12, { animate: true });
    if (connectors) { map.removeLayer(connectors); connectors = null; }
    if (validViewGeometry(p) && geoPointValid(current?.pad)) {
      connectors = L.polyline([
        [p.lat,p.lon],[current.pad.lat,current.pad.lon]
      ], { color: '#a86a30', weight: 2, dashArray: '5 9', opacity: .8,
        interactive: false }).addTo(map);
    }
    markers.forEach(({ marker, point }) => {
      const kind = point.category === 'public-viewpoint' ? 'view' : 'entry';
      marker.setIcon(leafletIcon(kind, point.id === p.id, ['closed','ineligible'].includes(point.level)));
    });
    const selectedMarker = markers.get(p.id)?.marker;
    if (selectedMarker) selectedMarker.openPopup();
  }
  function focusPoint(id, move = true) {
    selected = id;
    panel.querySelectorAll('.geo-choice').forEach(el => {
      el.dataset.active = el.dataset.geoId === id ? 'true' : 'false';
    });
    const target = current?.points?.find(p => p.id === id);
    if (target) showOnMap(target, move);
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
    if (isOfficialSource(p.accessSource)) actions.appendChild(link(p.accessSource, 'Official rules'));
    card.appendChild(actions);
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
    const sorted = geo.points.slice().filter(geoPointValid)
      .sort((a,b)=>scoring(a)-scoring(b) || a.name.localeCompare(b.name));
    panel.replaceChildren();
    say('geo-site-count', geo.points.filter(p=>p.category==='public-viewpoint').length+
      ' public park references · '+
      geo.points.filter(p=>p.category!=='public-viewpoint').length+' entry points');
    sorted.forEach((p,i) => panel.appendChild(row(p,i)));
    const unlocated = Array.isArray(geo.unlocated) ? geo.unlocated : [];
    if (unlocated.length) {
      const note = node('div','geo-unlocated');
      note.appendChild(node('strong','','Not pinned until we verify a precise visitor position'));
      note.appendChild(node('p','','Some Playalinda parking groups and restricted ticketed viewing areas have official access rules but no sufficiently verified public GPS point in this inventory.'));
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
      if (p) p.textContent = (geo.npsAlertsVerified ?
        'NPS official park alerts last checked ' + (meta || 'recently') + '. ' :
        'Current NPS alerts are unverified. ') +
        (geo.policy?.detail || 'Launch-specific gate access is never guaranteed.');
    }
    if (!selected || !sorted.some(p=>p.id===selected)) selected = sorted.find(p=>p.category==='public-viewpoint')?.id || sorted[0]?.id;
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
      const kind=p.category==='public-viewpoint'?'view':'entry';
      const marker=L.marker([p.lat,p.lon],{
        title:p.name,keyboard:true,
        icon:leafletIcon(kind,p.id===selected,['closed','ineligible'].includes(p.level))
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
      ' public park references and '+
      points.filter(p=>p.category!=='public-viewpoint').length+
      ' official entrance points. No assumed hazard polygons.');
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
