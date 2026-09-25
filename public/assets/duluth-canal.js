(function () {
  'use strict';

  const API = '/api/duluth-canal';
  const ZONE = 'America/Chicago';
  const CANAL = [46.7783, -92.0908];
  const WATCH_SPOTS = [
    { id: 'north', number: 1, name: 'North side / Visitor Center', lat: 46.779847, lon: -92.092464, note: 'Classic close-up viewing beside the Lake Superior Maritime Visitor Center.' },
    { id: 'south', number: 2, name: 'South side / Park Point', lat: 46.778722, lon: -92.092028, note: 'South-breakwater side for a strong bridge-and-ship composition.' },
    { id: 'lakewalk', number: 3, name: 'Canal Park / Lakewalk', lat: 46.780067, lon: -92.091333, note: 'Broader waterfront staging point at the Canal Park end of the Lakewalk.' }
  ];
  const CAMERAS = [
    {
      id: 'canal', name: 'Canal Cam — Maritime Visitor Center', shortName: 'Canal Cam', lat: 46.779861, lon: -92.092361,
      youtubeId: 'HPS48TMmNag', directUrl: 'https://www.youtube.com/live/HPS48TMmNag', operator: 'Duluth Harbor Cam',
      note: 'Closest visual cross-check for the Duluth Ship Canal and Aerial Lift Bridge.'
    },
    {
      id: 'lodge', name: 'Ship Cam — Lift Bridge Lodge', shortName: 'Ship Cam', lat: 46.7818492, lon: -92.0929547,
      youtubeId: 'H6cm5Hf-yFY', directUrl: 'https://www.youtube.com/live/H6cm5Hf-yFY', operator: 'Vibe with Mike',
      note: 'A second nearby angle from the Canal Park side of the bridge.'
    }
  ];

  const $ = id => document.getElementById(id);
  let map = null;
  let vesselLayer = null;
  let candidateLayer = null;
  let previous = null;
  let currentData = null;
  let busy = false;
  let activeCameraId = CAMERAS[0].id;
  const markers = new Map();
  const spotMarkers = new Map();
  const cameraMarkers = new Map();

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, className, handler) {
    const node = el('button', text, className);
    node.type = 'button';
    node.addEventListener('click', handler);
    return node;
  }

  function time(value) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return 'time unavailable';
    return new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(d);
  }

  function dayTime(value) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return 'time unavailable';
    return new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
  }

  function range(window) {
    if (!window) return 'window unavailable';
    const start = new Date(window.start);
    const end = new Date(window.end);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'window unavailable';
    const df = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    return df.format(start) === df.format(end) ? `${dayTime(start)}–${time(end)}` : `${dayTime(start)}–${dayTime(end)}`;
  }

  function age(v) {
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(v.seen)) / 60000));
    return mins === 0 ? 'just now' : `${mins} min ago`;
  }

  function confidenceLabel(value) {
    const n = Number(value);
    if (n >= 0.8) return 'strong evidence';
    if (n >= 0.65) return 'good evidence';
    return 'moderate evidence';
  }

  function explainCandidate(c) {
    if (c.evidenceType === 'harbor-motion') return 'Fresh AIS motion inside the harbor points toward the Duluth Ship Canal.';
    if (c.evidenceType === 'lake-approach') return 'Fresh AIS motion on the lake side points toward the Duluth Ship Canal.';
    return 'The vessel reports a Duluth destination and its current AIS motion points toward the canal.';
  }

  function scrollMap() {
    const node = $('duluthVesselMap');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => { if (map) map.invalidateSize(); }, 250);
  }

  function renderPick(data, failed) {
    const card = $('watchPick');
    card.replaceChildren();
    const pick = data.watchPick;
    if (!pick) {
      card.className = 'watch-card quiet';
      card.append(
        el('div', 'NEXT SHIP TO WATCH', 'watch-kicker'),
        el('h2', 'No supported Canal Park passage to call yet.'),
        el('p', 'That is not a zero-traffic report. The current AIS evidence does not support a useful passage window right now.'),
        el('p', 'The monitor still gives you recent local vessel reports, both live camera locations and all three in-person watch spots.', 'watch-note')
      );
      return;
    }

    card.className = 'watch-card';
    const direction = pick.direction === 'departure' ? 'Departing through the canal' : 'Arriving through the canal';
    const heading = el('div', '', 'watch-heading');
    heading.append(el('span', direction, 'direction-pill'), el('span', confidenceLabel(pick.confidence), 'confidence-pill'));
    const action = el('div', '', 'arrival-action');
    action.append(
      el('span', 'Plan around', 'arrival-label'),
      el('strong', range(pick.window), 'arrival-time'),
      el('span', `Modeled midpoint ${time(pick.window.midpoint)} · ${pick.distanceNm} NM away at last report`, 'arrival-detail')
    );
    const actions = el('div', '', 'watch-actions');
    actions.append(
      button('Locate this ship', 'button compact', () => focusVessel(pick.mmsi)),
      button('Open live camera', 'button secondary compact', () => openCameraMonitor(false))
    );
    card.append(
      el('div', 'BEST SUPPORTED WATCH', 'watch-kicker'),
      el('h2', pick.name), heading, action, el('p', explainCandidate(pick), 'watch-why'), actions,
      el('p', 'Aim to be at the canal before the start of the window. Ships can change speed, berth, destination or entrance; this is a planning window, not a bridge schedule.', 'watch-note')
    );
    if (failed) card.append(el('p', 'Live refresh failed; this card is retained from the previous successful check.', 'stale-warning'));
  }

  function candidateMeta(c) {
    return [c.sizeLabel, `${c.distanceNm} NM`, `${Number(c.speedKnots).toFixed(1)} kn`, `AIS ${c.ageMinutes} min old`].join(' · ');
  }

  function renderCandidates(data) {
    const list = $('anticipatedShips');
    list.replaceChildren();
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    if (!candidates.length) {
      const empty = el('div', '', 'empty-state');
      empty.append(el('strong', 'Nothing supported yet.'), el('p', 'The estimator only publishes a ship when fresh position, motion and route evidence are strong enough to be useful.'));
      list.append(empty);
      return;
    }
    const selectedId = data.watchPick ? String(data.watchPick.mmsi) : null;
    candidates.slice(0, 6).forEach(c => {
      const card = el('article', '', 'ship-card');
      const selected = String(c.mmsi) === selectedId;
      const top = el('div', '', 'ship-card-top');
      top.append(el('span', selected ? 'NEXT WATCH' : c.direction === 'departure' ? 'Departure candidate' : 'Arrival candidate', 'ship-label'));
      card.append(
        top,
        el('h3', c.name),
        el('div', range(c.window), 'ship-window'),
        el('p', candidateMeta(c), 'ship-meta'),
        el('p', explainCandidate(c), 'ship-why'),
        button('Show on monitor', 'map-jump', () => focusVessel(c.mmsi))
      );
      list.append(card);
    });
  }

  function renderMonitorSummary(data, failed) {
    const pick = data.watchPick;
    const next = $('monitorNext');
    if (next) {
      next.replaceChildren(el('div', 'NEXT WATCH', 'monitor-kicker'));
      if (pick) {
        next.append(
          el('strong', pick.name, 'monitor-title'),
          el('span', range(pick.window), 'monitor-detail'),
          el('span', `${pick.distanceNm} NM · ${Number(pick.speedKnots).toFixed(1)} kn · ${confidenceLabel(pick.confidence)}`, 'monitor-meta'),
          button('Locate next ship', 'map-jump', () => focusVessel(pick.mmsi))
        );
      } else {
        next.append(el('strong', 'No supported passage yet', 'monitor-title'), el('span', 'Local AIS, cameras and watch locations remain useful.', 'monitor-detail'));
      }
      if (failed) next.append(el('span', 'Last successful AIS picture retained.', 'monitor-stale'));
    }
    const visual = $('monitorVisual');
    if (visual) {
      visual.replaceChildren(
        el('div', 'VISUAL CHECK', 'monitor-kicker'),
        el('strong', '2 mapped live cameras', 'monitor-title'),
        el('span', 'Canal Cam at the Maritime Visitor Center + Ship Cam at Lift Bridge Lodge.', 'monitor-detail'),
        button('Focus cameras', 'map-jump', focusAllCameras)
      );
    }
    const inPerson = $('monitorInPerson');
    if (inPerson) {
      inPerson.replaceChildren(
        el('div', 'IN PERSON', 'monitor-kicker'),
        el('strong', '3 mapped watch spots', 'monitor-title'),
        el('span', 'North side, Park Point and Lakewalk are tied to green numbered markers.', 'monitor-detail'),
        button('Show watch spots', 'map-jump', focusAllWatchSpots)
      );
    }
  }

  function vesselPopup(v) {
    const wrap = el('div');
    wrap.append(el('strong', v.name || `Vessel ${v.mmsi}`));
    const motion = v.speedKnots == null ? 'speed unavailable' : `${(v.speedKnots * 1.15078).toFixed(1)} mph (${Number(v.speedKnots).toFixed(1)} kn)`;
    wrap.append(el('p', `${motion} · report ${age(v)}`));
    if (v.destination) wrap.append(el('p', `AIS destination: ${v.destination}`));
    if (v.lengthMeters) wrap.append(el('p', `Length: ${Math.round(v.lengthMeters)} m`));
    wrap.append(button('Open live camera monitor', 'map-jump', () => openCameraMonitor(false)));
    return wrap;
  }

  function candidatePopup(c, selected) {
    const wrap = el('div');
    wrap.append(el('strong', selected ? `NEXT WATCH · ${c.name}` : c.name));
    wrap.append(el('p', `${c.direction === 'departure' ? 'Departure' : 'Arrival'} planning window: ${range(c.window)}`));
    wrap.append(el('p', `${c.distanceNm} NM · ${Number(c.speedKnots).toFixed(1)} kn · AIS ${c.ageMinutes} min old`));
    wrap.append(el('p', `${confidenceLabel(c.confidence)} · ${c.sizeLabel}`));
    wrap.append(button('Open live camera monitor', 'map-jump', () => openCameraMonitor(false)));
    return wrap;
  }

  function installMonitorStyles() {
    if ($('duluthMonitorStyles')) return;
    const style = document.createElement('style');
    style.id = 'duluthMonitorStyles';
    style.textContent = `
      .watch-place-card{position:relative;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}
      .watch-place-card.is-active{border-color:#2f7057;box-shadow:0 0 0 2px rgba(47,112,87,.12),0 5px 18px rgba(28,43,50,.07);transform:translateY(-1px)}
      .watch-place-head{display:flex;align-items:flex-start;gap:9px;margin-bottom:6px}.watch-place-head h3{margin:1px 0 0}
      .watch-place-number{flex:0 0 26px;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#2f7057;color:#fff;border:2px solid #fff;box-shadow:0 1px 5px rgba(23,63,80,.25);font:700 11px/1 Arial,sans-serif}
      .watch-place-actions{margin-top:10px}.watch-spot-marker,.camera-map-marker,.candidate-map-marker{background:transparent;border:0}
      .watch-spot-marker span{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#2f7057;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(18,52,64,.35);font:700 12px/1 Arial,sans-serif;transition:transform .15s ease,background .15s ease}
      .watch-spot-marker.is-active span{background:#173f50;transform:scale(1.18)}
      .camera-map-marker span{width:34px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:#6a4c86;color:#fff;border:2px solid #fff;box-shadow:0 2px 9px rgba(18,52,64,.4);font:700 10px/1 Arial,sans-serif;transition:transform .15s ease,background .15s ease}
      .camera-map-marker.is-active span{background:#b9572a;transform:scale(1.12)}
      .candidate-map-marker span{width:28px;height:28px;border-radius:50% 50% 50% 12%;display:flex;align-items:center;justify-content:center;transform:rotate(-45deg);background:#146c86;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(18,52,64,.35)}
      .candidate-map-marker span b{transform:rotate(45deg);font:700 9px Arial,sans-serif}.candidate-map-marker.is-selected span{width:35px;height:35px;background:#b9572a;box-shadow:0 0 0 4px rgba(185,87,42,.2),0 2px 9px rgba(18,52,64,.4)}
    `;
    document.head.append(style);
  }

  function watchSpotIcon(spot, active) {
    return L.divIcon({ className: `watch-spot-marker${active ? ' is-active' : ''}`, html: `<span>${spot.number}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16] });
  }

  function cameraIcon(camera, active) {
    return L.divIcon({ className: `camera-map-marker${active ? ' is-active' : ''}`, html: '<span>CAM</span>', iconSize: [34, 28], iconAnchor: [17, 14], popupAnchor: [0, -15] });
  }

  function candidateIcon(selected) {
    return L.divIcon({
      className: `candidate-map-marker${selected ? ' is-selected' : ''}`,
      html: `<span><b>${selected ? 'NEXT' : 'AIS'}</b></span>`,
      iconSize: selected ? [35, 35] : [28, 28], iconAnchor: selected ? [18, 31] : [14, 25], popupAnchor: [0, -25]
    });
  }

  function watchSpotPopup(spot) {
    const wrap = el('div');
    wrap.append(el('strong', `${spot.number}. ${spot.name}`), el('p', spot.note));
    return wrap;
  }

  function cameraPopup(camera) {
    const wrap = el('div');
    wrap.append(el('strong', camera.name), el('p', camera.note), el('p', `Feed operator: ${camera.operator}`));
    const watchButton = button('Watch this camera', 'map-jump', () => {
      activeCameraId = camera.id;
      openCameraMonitor(true);
    });
    wrap.append(watchButton);
    return wrap;
  }

  function setActiveWatchSpot(id) {
    document.querySelectorAll('[data-watch-spot]').forEach(card => card.classList.toggle('is-active', card.dataset.watchSpot === id));
    WATCH_SPOTS.forEach(spot => {
      const marker = spotMarkers.get(spot.id);
      if (marker) marker.setIcon(watchSpotIcon(spot, spot.id === id));
    });
  }

  function focusWatchSpot(id) {
    const spot = WATCH_SPOTS.find(item => item.id === id);
    const marker = spotMarkers.get(id);
    if (!spot || !map || !marker) return;
    setActiveWatchSpot(id);
    map.setView([spot.lat, spot.lon], 16, { animate: true });
    marker.openPopup();
    scrollMap();
  }

  function focusAllWatchSpots() {
    if (!map) return;
    setActiveWatchSpot('');
    map.fitBounds(WATCH_SPOTS.map(spot => [spot.lat, spot.lon]), { padding: [45, 45], maxZoom: 15 });
    scrollMap();
  }

  function setupWatchSpots() {
    installMonitorStyles();
    const section = document.querySelector('[aria-labelledby="where-title"]');
    const cards = section ? Array.from(section.querySelectorAll('.place-card')).slice(0, WATCH_SPOTS.length) : [];
    cards.forEach((card, index) => {
      const spot = WATCH_SPOTS[index];
      card.id = `watch-spot-${spot.id}`;
      card.dataset.watchSpot = spot.id;
      card.classList.add('watch-place-card');
      const heading = card.querySelector('h3');
      if (heading && !heading.parentElement.classList.contains('watch-place-head')) {
        const head = el('div', '', 'watch-place-head');
        heading.parentNode.insertBefore(head, heading);
        head.append(el('span', String(spot.number), 'watch-place-number'), heading);
      }
      if (!card.querySelector('[data-watch-focus]')) {
        const actions = el('div', '', 'watch-place-actions');
        const mapButton = button('Show on monitor', 'map-jump', () => focusWatchSpot(spot.id));
        mapButton.dataset.watchFocus = spot.id;
        actions.append(mapButton);
        card.append(actions);
      }
    });
    if (!map || typeof L === 'undefined') return;
    WATCH_SPOTS.forEach(spot => {
      if (spotMarkers.has(spot.id)) return;
      const marker = L.marker([spot.lat, spot.lon], { icon: watchSpotIcon(spot, false), keyboard: true, title: `${spot.number}. ${spot.name}`, zIndexOffset: 900 })
        .addTo(map).bindTooltip(`${spot.number}. ${spot.name}`, { direction: 'top' }).bindPopup(watchSpotPopup(spot));
      marker.on('click', () => setActiveWatchSpot(spot.id));
      spotMarkers.set(spot.id, marker);
    });
  }

  function updateCameraButtons() {
    document.querySelectorAll('[data-camera-id]').forEach(cameraButton => {
      const active = cameraButton.dataset.cameraId === activeCameraId;
      cameraButton.classList.toggle('is-active', active);
      cameraButton.setAttribute('aria-pressed', String(active));
    });
    CAMERAS.forEach(camera => {
      const marker = cameraMarkers.get(camera.id);
      if (marker) marker.setIcon(cameraIcon(camera, camera.id === activeCameraId));
    });
  }

  function renderCameraPlaceholder(camera) {
    const player = $('cameraPlayer');
    if (!player) return;
    player.replaceChildren();
    const placeholder = el('div', '', 'camera-placeholder');
    placeholder.append(el('strong', camera.shortName), el('span', 'Live video stays unloaded until you ask for it.'));
    placeholder.append(button('Load live camera', 'button', () => loadCamera(camera.id)));
    player.append(placeholder);
  }

  function loadCamera(id) {
    const camera = CAMERAS.find(item => item.id === id);
    const player = $('cameraPlayer');
    if (!camera || !player) return;
    activeCameraId = camera.id;
    updateCameraButtons();
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${camera.youtubeId}?rel=0&autoplay=1&mute=1`;
    frame.title = `${camera.name} live stream`;
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    player.replaceChildren(frame);
  }

  function selectCamera(id, load = false) {
    const camera = CAMERAS.find(item => item.id === id);
    if (!camera) return;
    activeCameraId = camera.id;
    if ($('cameraTitle')) $('cameraTitle').textContent = camera.name;
    if ($('cameraContext')) $('cameraContext').textContent = `${camera.note} Feed operator: ${camera.operator}.`;
    if ($('cameraDirect')) $('cameraDirect').href = camera.directUrl;
    updateCameraButtons();
    if (load) loadCamera(camera.id); else renderCameraPlaceholder(camera);
  }

  function focusCamera(id, load = false) {
    const camera = CAMERAS.find(item => item.id === id);
    const marker = cameraMarkers.get(id);
    if (!camera || !map || !marker) return;
    selectCamera(id, load);
    map.setView([camera.lat, camera.lon], 16, { animate: true });
    marker.openPopup();
    scrollMap();
  }

  function focusAllCameras() {
    if (!map) return;
    map.fitBounds(CAMERAS.map(camera => [camera.lat, camera.lon]), { padding: [45, 45], maxZoom: 16 });
    scrollMap();
  }

  function openCameraMonitor(load = false) {
    selectCamera(activeCameraId, load);
    const monitor = $('cameraMonitor');
    if (monitor) monitor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setupCameras() {
    if (!map || typeof L === 'undefined') return;
    CAMERAS.forEach(camera => {
      if (cameraMarkers.has(camera.id)) return;
      const marker = L.marker([camera.lat, camera.lon], { icon: cameraIcon(camera, camera.id === activeCameraId), keyboard: true, title: camera.name, zIndexOffset: 1000 })
        .addTo(map).bindTooltip(camera.shortName, { direction: 'top' }).bindPopup(cameraPopup(camera));
      marker.on('click', () => selectCamera(camera.id, false));
      cameraMarkers.set(camera.id, marker);
    });
    document.querySelectorAll('[data-camera-id]').forEach(cameraButton => cameraButton.addEventListener('click', () => selectCamera(cameraButton.dataset.cameraId, true)));
    const locate = $('cameraOnMap');
    if (locate) locate.addEventListener('click', () => focusCamera(activeCameraId, false));
    selectCamera(activeCameraId, false);
  }

  function setupMonitorControls() {
    const next = $('focusNext');
    if (next) next.addEventListener('click', () => currentData?.watchPick && focusVessel(currentData.watchPick.mmsi));
    const cameras = $('focusCameras');
    if (cameras) cameras.addEventListener('click', focusAllCameras);
    const spots = $('focusSpots');
    if (spots) spots.addEventListener('click', focusAllWatchSpots);
    const canal = $('resetCanal');
    if (canal) canal.addEventListener('click', () => { if (map) { map.setView(CANAL, 13, { animate: true }); scrollMap(); } });
  }

  function initMap() {
    if (map || typeof L === 'undefined') return;
    installMonitorStyles();
    map = L.map('duluthVesselMap', { scrollWheelZoom: false }).setView(CANAL, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    vesselLayer = L.layerGroup().addTo(map);
    candidateLayer = L.layerGroup().addTo(map);
    L.circleMarker(CANAL, { radius: 9, color: '#fff', weight: 2, fillColor: '#c35f2d', fillOpacity: 1 }).addTo(map).bindTooltip('Duluth Ship Canal', { direction: 'top' }).bindPopup('<strong>Duluth Ship Canal</strong><br>Canal Park watch zone');
  }

  function renderMap(data) {
    initMap();
    if (!map || !vesselLayer || !candidateLayer) {
      $('duluthVesselMap').textContent = 'Map could not load. Live vessel details remain available above.';
      return;
    }
    vesselLayer.clearLayers();
    candidateLayer.clearLayers();
    markers.clear();

    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const candidateIds = new Set(candidates.map(c => String(c.mmsi)));
    const selectedId = data.watchPick ? String(data.watchPick.mmsi) : null;

    (data.mapVessels || []).forEach(v => {
      if (candidateIds.has(String(v.mmsi))) return;
      const moving = Number(v.speedKnots) > 0.5;
      const marker = L.circleMarker([v.lat, v.lon], { radius: v.lengthMeters >= 220 ? 9 : 6, color: '#fff', weight: 2, fillColor: moving ? '#146c86' : '#8a6a42', fillOpacity: 0.95 })
        .addTo(vesselLayer).bindTooltip(v.name || `Vessel ${v.mmsi}`, { direction: 'top' }).bindPopup(vesselPopup(v));
      markers.set(String(v.mmsi), marker);
    });

    candidates.forEach(c => {
      if (!Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lon))) return;
      const selected = String(c.mmsi) === selectedId;
      const marker = L.marker([c.lat, c.lon], { icon: candidateIcon(selected), keyboard: true, title: selected ? `Next watch: ${c.name}` : `Anticipated: ${c.name}`, zIndexOffset: selected ? 1200 : 760 })
        .addTo(candidateLayer).bindTooltip(selected ? `NEXT · ${c.name}` : c.name, { direction: 'top' }).bindPopup(candidatePopup(c, selected));
      markers.set(String(c.mmsi), marker);
    });

    if (data.watchPick && Number.isFinite(Number(data.watchPick.lat)) && Number.isFinite(Number(data.watchPick.lon))) {
      map.fitBounds([CANAL, [data.watchPick.lat, data.watchPick.lon]], { padding: [55, 55], maxZoom: 11 });
    } else {
      const local = (data.mapVessels || []).map(v => [v.lat, v.lon]);
      const points = [CANAL, ...WATCH_SPOTS.map(spot => [spot.lat, spot.lon]), ...CAMERAS.map(camera => [camera.lat, camera.lon]), ...local];
      if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 12 });
    }

    const caption = document.querySelector('.map-caption');
    if (caption) caption.textContent = 'Rust NEXT pin = selected watch. Blue AIS pins = other supported passage candidates. Small blue/brown circles = recent nearby AIS reports. Purple CAM markers = live cameras. Green 1–3 = in-person viewing spots.';
  }

  function focusVessel(mmsi) {
    const marker = markers.get(String(mmsi));
    if (!marker || !map) {
      $('mapStatus').textContent = 'That vessel has no current mappable AIS position.';
      scrollMap();
      return;
    }
    const latlng = marker.getLatLng();
    map.fitBounds([CANAL, [latlng.lat, latlng.lng]], { padding: [55, 55], maxZoom: 11 });
    marker.openPopup();
    scrollMap();
  }

  function renderSource(data, failed) {
    const count = Array.isArray(data.mapVessels) ? data.mapVessels.length : 0;
    const candidates = Array.isArray(data.candidates) ? data.candidates.length : 0;
    $('mapStatus').textContent = failed
      ? `Refresh unavailable. Last successful AIS picture retained · ${candidates} supported passage candidate${candidates === 1 ? '' : 's'} · 2 cameras · 3 viewing spots.`
      : `${count} nearby AIS report${count === 1 ? '' : 's'} · ${candidates} supported passage candidate${candidates === 1 ? '' : 's'} · 2 cameras · 3 viewing spots · checked ${time(data.checkedAt)} CT`;
    $('liveDot').className = `live-dot${failed ? ' offline' : ' on'}`;
    const credits = (data.attribution || []).map(a => a.credit).filter(Boolean);
    $('sourceCredits').textContent = credits.length ? `AIS credits: ${credits.join(' · ')}` : 'AIS source credits unavailable for this refresh.';
    $('updated').textContent = failed ? 'Last successful live check retained' : `Live AIS checked ${time(data.checkedAt)} CT`;
  }

  function render(data, failed) {
    currentData = data;
    renderPick(data, failed);
    renderMonitorSummary(data, failed);
    renderMap(data);
    renderCandidates(data);
    renderSource(data, failed);
    window.setTimeout(() => { if (map) map.invalidateSize(); }, 80);
  }

  async function load() {
    if (busy) return;
    busy = true;
    $('refreshVessels').disabled = true;
    try {
      const response = await fetch(API, { signal: AbortSignal.timeout(14000) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data?.error || 'Live vessel feed unavailable');
      previous = data;
      render(data, false);
    } catch (_) {
      if (previous) render(previous, true);
      else {
        $('watchPick').className = 'watch-card quiet';
        $('watchPick').replaceChildren(
          el('div', 'LIVE DATA TEMPORARILY UNAVAILABLE', 'watch-kicker'),
          el('h2', 'The cameras and watch locations still work.'),
          el('p', 'The page will not substitute stale or invented vessel timing when the AIS feed is unavailable.'),
          el('p', 'Harbor Lookout remains available below as a published schedule cross-check.', 'watch-note')
        );
        $('anticipatedShips').replaceChildren(el('div', 'Anticipated ship estimates are unavailable until fresh AIS data returns.', 'empty-state'));
        renderMonitorSummary({ watchPick: null }, true);
        $('mapStatus').textContent = 'Live vessel refresh unavailable. The 2 camera locations and 3 viewing spots remain available on the monitor. This is not a zero-traffic report.';
        $('liveDot').className = 'live-dot offline';
      }
    } finally {
      busy = false;
      $('refreshVessels').disabled = false;
    }
  }

  $('refreshVessels').addEventListener('click', load);
  initMap();
  setupWatchSpots();
  setupCameras();
  setupMonitorControls();
  load();
  setInterval(() => { if (!document.hidden) load(); }, 60000);
})();