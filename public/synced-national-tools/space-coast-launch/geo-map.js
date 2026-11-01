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
  let map = null, padMarker = null, connectors = null, lotBoundaries = null, policyLine = null, boardwalkLayer = null, activeClosureLayer = null, lotFilter = 'all';
  const boardwalkSegments = new Map();
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
    boardwalkSegments.forEach((line,number)=>{
      const picked=p.category==='beach-parking' && number===p.number;
      line.setStyle({weight:picked?6:3,opacity:picked?1:.75});
      if(picked&&boardwalkToggle?.checked)line.bringToFront();
    });
    if (selectedMarker) selectedMarker.openPopup();
  }
  function focusPoint(id, move = true) {
    selected = id;
    document.querySelectorAll('[data-geo-id]').forEach(el => {
      el.dataset.active = el.dataset.geoId === id ? 'true' : 'false';
    });
    const target = current?.points?.find(p => p.id === id);
    if (target) showOnMap(target, move);
    renderWalkDetails();
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

  function officialDate(iso) {
    const ts=Date.parse(iso||'');
    return Number.isFinite(ts)?new Date(ts).toLocaleString('en-US',{
      timeZone:'America/New_York',
      month:'short',day:'numeric',year:'numeric',
      hour:'numeric',minute:'2-digit',timeZoneName:'short'
    }):'time not verified';
  }
  function renderLiveAccess() {
    const container=$('geo-live-access');
    const desk=$('geo-live-evidence');
    const data=current?.liveAccess;
    if(!container||!desk)return;
    desk.replaceChildren();
    if(!data || data.sourceStatus!=='fresh') {
      container.dataset.state='unknown';
      say('geo-live-checked',data?.sourceStatus==='stale'?
        'NPS alert evidence is older than 90 minutes':'NPS alert feed could not be verified');
      say('geo-live-verdict',
        'Do not assume Playalinda parking, road or beach access. Please check the National Park Service directly.');
      desk.appendChild(node('p','geo-live-item',
        'The official park alerts are not sufficiently fresh for a current closure comparison. Historical boardwalk lines remain visible as references only.'));
      return;
    }
    say('geo-live-checked','NPS alert feed checked '+officialDate(data.checkedAt));
    const closed=data.summary?.closedParkingLots||[];
    const road=Boolean(data.roadClosure);
    const beach=Boolean(data.beachRestriction);
    const any=closed.length||road||beach;
    container.dataset.state=any?'warning':'unconfirmed';
    say('geo-live-verdict',any?
      'Current NPS closure notice: plan around restricted areas, not just launch timing.' :
      'No matching numbered-lot or Eddy Creek closure in the checked NPS feed. This does NOT confirm access is open.');
    if(closed.length){
      const item=node('div','geo-live-item');
      item.dataset.state='closed';
      item.appendChild(node('strong','','Parking lots '+closed.join(', ')+' · NPS reports closed'));
      item.appendChild(node('p','',
        'The red outlines on the map use actual NPS lot footprints. These are named closed parking facilities, not surveyed emergency barricades.'));
      desk.appendChild(item);
    }
    if(road){
      const item=node('div','geo-live-item');
      item.dataset.state='closed';
      item.appendChild(node('strong','','Road north of Eddy Creek · NPS reports closed'));
      item.appendChild(node('p','',
        'The map traces an official road centerline from the historic Eddy Creek boardwalk reference northward. The exact roadblock location is NOT established.'));
      desk.appendChild(item);
    }
    if(beach){
      const item=node('div','geo-live-item');
      item.dataset.state='closed';
      item.appendChild(node('strong','','Beach north of Eddy Creek boardwalk · NPS reports closed'));
      item.appendChild(node('p','',
        'The named boardwalk is an official GIS landmark, not a precise beach exclusion polygon. Do not walk into closed beach areas.'));
      desk.appendChild(item);
    }
    if(!any)desk.appendChild(node('p','geo-live-item',
      'No explicit matching parking, road or shoreline closure was returned during this check. Capacity limits, storm damage, NASA restrictions and additional posted closures remain possible.'));
    const refs=node('div','geo-live-links');
    const seen=new Set();
    for(const n of data.evidenceNotices||[]) {
      const url=isOfficialSource(n.sourceUrl)?n.sourceUrl:data.conditionsUrl;
      if(!url||seen.has(url))continue;
      seen.add(url);
      refs.appendChild(link(url,'Official NPS notice: '+n.title,'geo-link'));
    }
    if(!seen.size&&isOfficialSource(data.conditionsUrl))
      refs.appendChild(link(data.conditionsUrl,'NPS current conditions','geo-link'));
    desk.appendChild(refs);
    const confidence=node('p','geo-live-confidence',
      'NPS check '+officialDate(data.checkedAt)+
      '. Mapped infrastructure was last edited in 2025. No boardwalk physical inspection, continuous pedestrian access or NASA mission-specific land exclusion polygon is verified.');
    desk.appendChild(confidence);
  }

  function renderWalkDetails() {
    const target=$('geo-boardwalk-detail');
    if(!target)return;
    target.replaceChildren();
    const lot=(current?.points||[]).find(p=>p.id===selected &&
      p.category==='beach-parking');
    const head=node('div','geo-boardwalk-heading');
    head.appendChild(node('p','eyebrow','Lot-to-beach evidence · NPS GIS'));
    if(!lot) {
      head.appendChild(node('h5','','Pick a numbered Playalinda lot'));
      head.appendChild(node('p','',
        'Select any parking area to inspect its actual NPS mapped boardwalk. A geographic line is not a guarantee of an open or accessible pedestrian route.'));
      target.appendChild(head);
      return;
    }
    const boardwalk=(current?.boardwalks||[]).find(b=>b.matchingParkingLot===lot.number);
    head.appendChild(node('h5','','Lot '+lot.number+' · Follow the evidence, not an invented trail'));
    head.appendChild(node('p','',
      boardwalk ? 'NPS GIS identifies a boardwalk with the same number near this parking area. We can show the historic centerline without inventing any connector between your car and the start of that line.' :
      'No official matching boardwalk line is available for this numbered lot.'));
    target.appendChild(head);
    const stages=node('div','geo-walk-stages');
    const stage=(number,title,level,headline,description)=>{
      const el=node('div','geo-walk-stage');
      el.dataset.state=level;
      el.appendChild(node('div','geo-walk-step',number));
      const copy=node('div','geo-walk-copy');
      copy.appendChild(node('h6','',title));
      const status=node('strong','geo-walk-verdict',headline);
      copy.appendChild(status);
      copy.appendChild(node('p','',description));
      el.appendChild(copy);
      stages.appendChild(el);
    };
    const topology=boardwalk?.spatialConnectionAudit;
    if(topology) {
      const audit=node('p','geo-topology-audit',
        topology.endpointFallsWithinMappedLot ?
          'NPS GIS topology: a mapped boardwalk endpoint falls inside the matching parking footprint. This does not certify an open or accessible connection.' :
          'NPS GIS topology: a mapped boardwalk endpoint is approximately '+
          Math.round(topology.nearestLotFootprintBoundaryMeters*3.28084)+
          ' ft from the parking footprint edge. That gap is NOT a mapped walkway or safe walking distance.');
      target.appendChild(audit);
    }
    stage('01','Parking footprint',lot.level==='closed'?'warning':'unverified',
      lot.level==='closed'?'NPS closure reported for this parking area':
        'Official location mapped · current entry not confirmed',
      'NPS public GIS maps the lot polygon, but reports its open-to-public attribute as unknown. The official park closure notice and NASA launch security can override normal access.');
    stage('02','Boardwalk over the dunes',
      ['official-closure','parking-restricted'].includes(boardwalk?.access?.status)?'warning':'unverified',
      boardwalk?('NPS mapped segment: approximately '+Math.round(boardwalk.segmentMeters*3.28084)+' ft'):
        'No numbered boardwalk centerline verified',
      boardwalk?
        ('This is the GIS centerline length ONLY, not the complete walk from a parked car. '+boardwalk.access.detail+
        ' The NPS trail record was last edited '+new Date(boardwalk.sourceEditedAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})+'.'):
        'Do not infer where to walk. Look for current park signs and instructions.');
    stage('03','Beach viewing position','unverified',
      'No verified walkable beach-viewing endpoint',
      (lot.accessibility?.beachRampInOfficialFaq?
        'The NPS FAQ lists an accessible beach ramp here, but today’s condition, gradients and continuity remain unknown. ':
        'The NPS FAQ does not specifically identify this lot as having an accessible beach ramp. ')+
      'Neither the boardwalk map nor its length establishes a legal, unobstructed rocket-viewing spot.');
    target.appendChild(stages);
    const footer=node('div','geo-walk-footer');
    footer.appendChild(node('p','',
      'No route or directions are drawn between the parking polygon, boardwalk and shoreline unless NPS supplies a verified connected public path. Follow on-site closures and accessible-route signs.'));
    const sources=node('div','geo-walk-sources');
    if(boardwalk?.geographicSource) sources.appendChild(link(boardwalk.geographicSource,
      'NPS historic boardwalk GIS','geo-link'));
    sources.appendChild(link('https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
      'NPS current launch restrictions','geo-link'));
    sources.appendChild(link('https://www.nps.gov/cana/faqs.htm',
      'Official ramp guidance','geo-link'));
    footer.appendChild(sources);
    target.appendChild(footer);
  }

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
        p.activeNpsClosure ?
        'NPS current closure identifies this lot. Last checked '+
          officialDate(p.activeNpsClosure.notice?.checkedAt)+'.':
        'Current checked NPS source reports a closure. Do not travel to this lot without confirmation.'));
      if(p.boardwalk?.spatialConnectionAudit){
        const topology=p.boardwalk.spatialConnectionAudit;
        card.appendChild(node('p','geo-lot-topology',
          topology.endpointFallsWithinMappedLot ?
            'Historic NPS boardwalk endpoint intersects the parking footprint. Route condition not inspected.' :
            'Historic mapped endpoint ~'+Math.round(topology.nearestLotFootprintBoundaryMeters*3.28084)+
            ' ft from the parking edge. No legal walking connector is confirmed.'));
      }
      if(p.boardwalk){
        const b=node('p','geo-lot-boardwalk',
          'NPS boardwalk #'+p.number+' mapped · ~'+Math.round(p.boardwalk.segmentMeters*3.28084)+
          ' ft of historic boardwalk centerline (not full walking distance)');
        card.appendChild(b);
        if(['official-closure','parking-restricted'].includes(p.boardwalk.access?.status)){
          const warn=node('p','geo-lot-alert',p.boardwalk.access.label);
          card.appendChild(warn);
        }
      }
      card.appendChild(weatherEvidence(p));
      const actions=node('div','geo-lot-actions');
      const zoom=node('button','geo-map-focus','Inspect lot and boardwalk');
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
    renderLiveAccess();
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
  const activeClosureToggle=$('geo-current-closure-toggle');
  function updateActiveClosureDisplay(){
    if(!map||!activeClosureLayer)return;
    if(activeClosureToggle?.checked){
      if(!map.hasLayer(activeClosureLayer))activeClosureLayer.addTo(map);
    }else if(map.hasLayer(activeClosureLayer))map.removeLayer(activeClosureLayer);
  }
  if(activeClosureToggle)
    activeClosureToggle.addEventListener('change',updateActiveClosureDisplay);
  const boardwalkToggle=$('geo-boardwalk-toggle');
  function updateBoardwalkDisplay() {
    if(!map || !boardwalkLayer)return;
    if(boardwalkToggle?.checked){
      if(!map.hasLayer(boardwalkLayer))boardwalkLayer.addTo(map);
    }else if(map.hasLayer(boardwalkLayer))map.removeLayer(boardwalkLayer);
  }
  if(boardwalkToggle)boardwalkToggle.addEventListener('change',updateBoardwalkDisplay);
  const roadToggle=$('geo-road-toggle');
  function updateRoadDisplay() {
    if(!map || !policyLine)return;
    if(roadToggle?.checked) {
      if(!map.hasLayer(policyLine))policyLine.addTo(map);
    } else if(map.hasLayer(policyLine))map.removeLayer(policyLine);
  }
  if(roadToggle)roadToggle.addEventListener('change',updateRoadDisplay);

  function renderMapMarkers() {
    if (!map || !current) return;
    const L=window.L;
    markers.forEach(obj=>map.removeLayer(obj.marker));
    markers.clear();
    if (padMarker) {map.removeLayer(padMarker);padMarker=null;}
    if (connectors) {map.removeLayer(connectors);connectors=null;}
    if (lotBoundaries) {map.removeLayer(lotBoundaries);lotBoundaries=null;}
    if (boardwalkLayer) {map.removeLayer(boardwalkLayer);boardwalkLayer=null;}
    boardwalkSegments.clear();
    if (policyLine) {map.removeLayer(policyLine);policyLine=null;}
    if (activeClosureLayer) {map.removeLayer(activeClosureLayer);activeClosureLayer=null;}
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
    // These are the actual *NPS public parking polygons*, not NASA safety
    // exclusion areas or dynamic geofences. Only verified active park notices
    // may change their status styling; unknown is not painted as open.
    lotBoundaries=L.layerGroup().addTo(map);
    for (const p of points.filter(x=>x.category==='beach-parking')) {
      if(!Array.isArray(p.polygons) || !p.polygons.length)continue;
      const paths=p.polygons.filter(r=>Array.isArray(r)&&r.length>=3)
        .map(r=>r.filter(c=>Array.isArray(c)&&c.length>=2&&
          geoPointValid({lon:c[0],lat:c[1]}))
          .map(c=>[c[1],c[0]])).filter(r=>r.length>=3);
      if(!paths.length)continue;
      const closed=p.level==='closed';
      const boundary=L.polygon(paths,{
        color:closed?'#a24b39':'#3b7f57',
        weight:2,opacity:.9,fillColor:closed?'#a24b39':'#7bad8a',
        fillOpacity:closed?.19:.12,
        interactive:true
      }).addTo(lotBoundaries);
      boundary.bindTooltip('NPS parking #'+p.number+
        (closed?' · NPS closure reported':' · live opening unverified'),
        {direction:'top'});
      boundary.on('click',()=>focusPoint(p.id,false));
    }
    // Boardwalk alignments come from the official NPS Trails Geographic
    // FeatureServer; they are 2025 mapped assets, not verified walkable paths.
    // Never draw a synthetic connector between a lot and boardwalk.
    boardwalkLayer=L.layerGroup();
    for(const route of current.boardwalks||[]) {
      if(route?.geometry?.type!=='MultiLineString' ||
         !Array.isArray(route.geometry.coordinates))continue;
      const lines=route.geometry.coordinates.map(path=>
        Array.isArray(path)?path.filter(c=>Array.isArray(c)&&c.length===2&&
          geoPointValid({lon:c[0],lat:c[1]})).map(c=>[c[1],c[0]]):[])
        .filter(path=>path.length>=2);
      if(!lines.length)continue;
      const restricted=['official-closure','parking-restricted'].includes(route.access?.status);
      const unpaired=route.matchingParkingLot===null;
      const color=restricted?'#b64f40':unpaired?'#806c8b':'#2e826b';
      const line=L.polyline(lines,{
        color,weight:3,dashArray:'6 5',opacity:.8,interactive:true
      }).addTo(boardwalkLayer);
      line.bindTooltip('NPS mapped boardwalk '+route.number+
        ' · edited 2025 · current walkability not verified',{sticky:true});
      const popup=node('div','geo-popup');
      popup.appendChild(node('strong','','NPS mapped boardwalk #'+route.number));
      popup.appendChild(node('p','','Historic GIS centerline ~'+
        Math.round(route.segmentMeters*3.28084)+
        ' ft. Not total walking distance or current route approval.'));
      popup.appendChild(node('p','',route.access?.detail ||
        'No present-day pedestrian access verification.'));
      if(route.matchingParkingLot) {
        const b=node('button','geo-map-focus','Inspect matching lot');
        b.type='button';
        b.addEventListener('click',()=>focusPoint('playalinda-lot-'+route.number,true));
        popup.appendChild(b);
        line.on('click',()=>focusPoint('playalinda-lot-'+route.number,false));
      }else {
        popup.appendChild(node('p','',
          'No numbered public parking lot #14 exists in the NPS parking GIS. Do not construct a walking connection.'));
      }
      line.bindPopup(popup);
      boardwalkSegments.set(route.number,line);
    }
    updateBoardwalkDisplay();
    const road=current.roadCorridor;
    if(Array.isArray(road?.coordinates) && road.coordinates.length>4 &&
       road.coordinates.every(c=>Array.isArray(c)&&c.length===2&&
         geoPointValid({lat:c[1],lon:c[0]}))) {
      policyLine=L.polyline(road.coordinates.map(c=>[c[1],c[0]]),{
        color:'#a86b38',weight:5,dashArray:'10 8',opacity:.72,
        interactive:true
      });
      policyLine.bindPopup(
        'Published NPS launch-day inbound restriction corridor (T−30 policy). '+
        'This is historical official road geometry, NOT a live closure, traffic or driving route.'
      );
      updateRoadDisplay();
    }
    // Only source-fresh official NPS alert records create a restriction
    // overlay. The polygons are the actual named parking facilities, while
    // Eddy Creek & road lines are historical LANDMARK REFERENCES, NOT current
    // barricades, beach exclusion polygons or turn-by-turn route geometry.
    activeClosureLayer=L.layerGroup();
    const active=current.liveAccess;
    if(active?.sourceStatus==='fresh'){
      for(const feature of active.features?.features||[]) {
        const type=feature?.geometry?.type;
        const category=feature?.properties?.category;
        const raw=feature?.geometry?.coordinates;
        let layer=null;
        if(type==='Polygon' && category==='official-alert-on-mapped-parking-footprint') {
          const paths=Array.isArray(raw)?raw.map(ring=>
            Array.isArray(ring)?ring.filter(c=>Array.isArray(c)&&c.length===2&&
              geoPointValid({lon:c[0],lat:c[1]})).map(c=>[c[1],c[0]]):[])
            .filter(ring=>ring.length>=3):[];
          if(paths.length)layer=L.polygon(paths,{
            color:'#ab3334',weight:4,fillColor:'#cf5948',
            fillOpacity:.27,opacity:.97,interactive:true
          });
        }else if(type==='LineString' &&
            category==='interpreted-nps-road-closure-reference') {
          if(Array.isArray(raw)&&raw.length>=2&&raw.every(c=>
            Array.isArray(c)&&c.length===2&&geoPointValid({lon:c[0],lat:c[1]}))){
            layer=L.polyline(raw.map(c=>[c[1],c[0]]),{
              color:'#c43937',weight:6,dashArray:'9 5',opacity:.91,interactive:true
            });
          }
        }else if(type==='MultiLineString' &&
            category==='historic-nps-named-beach-closure-reference'){
          const paths=Array.isArray(raw)?raw.map(path=>
            Array.isArray(path)?path.filter(c=>Array.isArray(c)&&c.length===2&&
              geoPointValid({lon:c[0],lat:c[1]})).map(c=>[c[1],c[0]]):[])
            .filter(path=>path.length>=2):[];
          if(paths.length)layer=L.polyline(paths,{
            color:'#a44b7f',weight:7,dashArray:'3 6',opacity:.95,interactive:true
          });
        }
        if(!layer)continue;
        const pop=node('div','geo-popup');
        pop.appendChild(node('strong','',
          category==='official-alert-on-mapped-parking-footprint'?
            'NPS current notice · lot '+String(feature.properties.lotNumber) :
          category==='interpreted-nps-road-closure-reference'?
            'NPS closure notice · road north of Eddy Creek' :
            'NPS notice · beach north of Eddy Creek boardwalk'));
        pop.appendChild(node('p','',
          category==='official-alert-on-mapped-parking-footprint'?
            'The named parking lot is under an active NPS reported closure. Map shape is the verified NPS lot footprint, NOT the barricade line.' :
          category==='interpreted-nps-road-closure-reference'?
            'This is a historic NPS road centerline north of the named Eddy Creek reference, not a verified barricade position or road navigation route.' :
            'Historic Eddy Creek boardwalk line identifies a named reference in the current NPS beach closure. NO beach exclusion polygon or safe path is implied.'));
        if(isOfficialSource(feature.properties?.source))
          pop.appendChild(link(feature.properties.source,'Check official NPS conditions','geo-link'));
        layer.bindPopup(pop);
        layer.addTo(activeClosureLayer);
      }
    }
    updateActiveClosureDisplay();
    if(bounds.length)map.fitBounds(bounds,{padding:[28,28],maxZoom:12});
    const chosen=points.find(p=>p.id===selected);
    if(chosen)showOnMap(chosen,false);
    say('geo-map-status',
      (current.pad ? 'Mapped the selected mission’s launch pad with ' :
        'Launch-pad GPS unavailable; mapped ') +
      points.filter(p=>p.category==='public-viewpoint').length+
      ' public park references, '+
      points.filter(p=>p.category==='beach-parking').length+
      ' NPS parking footprints, '+boardwalkSegments.size+
      ' historically mapped boardwalks and 2 official entrances. '+
      ((active?.sourceStatus==='fresh'&&activeClosureLayer.getLayers().length)?
      'NPS active notice references: '+activeClosureLayer.getLayers().length+
        ' mapped land features; exact barricades and beach polygons unknown.' :
      'No source-verified new closure boundaries; walkability unverified.'));
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
