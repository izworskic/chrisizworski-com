(function () {
  'use strict';

  const API = '/api/duluth-canal';
  const ZONE = 'America/Chicago';
  const CANAL = [46.7783, -92.0908];
  const $ = id => document.getElementById(id);
  let map = null;
  let vesselLayer = null;
  let previous = null;
  let busy = false;
  const markers = new Map();

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    if (className) node.className = className;
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
    const sameDay = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(start) ===
      new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(end);
    return sameDay ? `${dayTime(start)}–${time(end)}` : `${dayTime(start)}–${dayTime(end)}`;
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

  function renderPick(data, failed) {
    const card = $('watchPick');
    card.replaceChildren();
    const pick = data.watchPick;
    if (!pick) {
      card.className = 'watch-card quiet';
      card.append(
        el('div', 'NEXT SHIP TO WATCH', 'watch-kicker'),
        el('h2', 'No supported Canal Park passage to call yet.'),
        el('p', 'That is not a zero-traffic report. It means the live AIS evidence does not support a useful passage window right now.'),
        el('p', 'Use the live map below, or check Harbor Lookout for the published arrival and departure list.', 'watch-note')
      );
      return;
    }

    card.className = 'watch-card';
    const direction = pick.direction === 'departure' ? 'Departing through the canal' : 'Arriving through the canal';
    const heading = el('div', '', 'watch-heading');
    heading.append(el('span', direction, 'direction-pill'), el('span', confidenceLabel(pick.confidence), 'confidence-pill'));
    const why = el('p', explainCandidate(pick), 'watch-why');
    const action = el('div', '', 'arrival-action');
    action.append(
      el('span', 'Plan around', 'arrival-label'),
      el('strong', range(pick.window), 'arrival-time'),
      el('span', `Modeled midpoint ${time(pick.window.midpoint)} · ${pick.distanceNm} NM away at last report`, 'arrival-detail')
    );
    card.append(
      el('div', 'BEST SUPPORTED WATCH', 'watch-kicker'),
      el('h2', pick.name),
      heading,
      action,
      why,
      el('p', 'Aim to be at the canal before the start of the window. Ships can change speed, berth, destination or entrance; this is a planning window, not a bridge schedule.', 'watch-note')
    );
    if (failed) card.append(el('p', 'Live refresh failed; this card is retained from the previous successful check.', 'stale-warning'));
  }

  function candidateMeta(c) {
    const parts = [c.sizeLabel, `${c.distanceNm} NM`, `${Number(c.speedKnots).toFixed(1)} kn`, `AIS ${c.ageMinutes} min old`];
    return parts.join(' · ');
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
    candidates.slice(0, 6).forEach((c, index) => {
      const card = el('article', '', 'ship-card');
      const top = el('div', '', 'ship-card-top');
      top.append(el('span', index === 0 ? 'Soonest candidates' : c.direction === 'departure' ? 'Departure candidate' : 'Arrival candidate', 'ship-label'));
      const title = el('h3', c.name);
      const timing = el('div', range(c.window), 'ship-window');
      const meta = el('p', candidateMeta(c), 'ship-meta');
      const why = el('p', explainCandidate(c), 'ship-why');
      const button = el('button', 'Show on map', 'map-jump');
      button.type = 'button';
      button.addEventListener('click', () => focusVessel(c.mmsi));
      card.append(top, title, timing, meta, why, button);
      list.append(card);
    });
  }

  function popup(v) {
    const wrap = el('div');
    wrap.append(el('strong', v.name || `Vessel ${v.mmsi}`));
    const motion = v.speedKnots == null ? 'speed unavailable' : `${(v.speedKnots * 1.15078).toFixed(1)} mph (${Number(v.speedKnots).toFixed(1)} kn)`;
    wrap.append(el('p', `${motion} · report ${age(v)}`));
    if (v.destination) wrap.append(el('p', `AIS destination: ${v.destination}`));
    if (v.lengthMeters) wrap.append(el('p', `Length: ${Math.round(v.lengthMeters)} m`));
    return wrap;
  }

  function initMap() {
    if (map || typeof L === 'undefined') return;
    map = L.map('duluthVesselMap', { scrollWheelZoom: false }).setView(CANAL, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    vesselLayer = L.layerGroup().addTo(map);
    L.circleMarker(CANAL, { radius: 9, color: '#fff', weight: 2, fillColor: '#c35f2d', fillOpacity: 1 })
      .addTo(map)
      .bindPopup('<strong>Duluth Ship Canal</strong><br>Canal Park watch zone');
  }

  function renderMap(data) {
    initMap();
    if (!map || !vesselLayer) {
      $('duluthVesselMap').textContent = 'Map could not load. Live vessel details remain available above.';
      return;
    }
    vesselLayer.clearLayers();
    markers.clear();
    const points = [CANAL];
    (data.mapVessels || []).forEach(v => {
      const moving = Number(v.speedKnots) > 0.5;
      const marker = L.circleMarker([v.lat, v.lon], {
        radius: v.lengthMeters >= 220 ? 9 : 6,
        color: '#fff',
        weight: 2,
        fillColor: moving ? '#146c86' : '#8a6a42',
        fillOpacity: 0.95
      }).addTo(vesselLayer).bindTooltip(v.name || `Vessel ${v.mmsi}`, { direction: 'top' }).bindPopup(popup(v));
      markers.set(String(v.mmsi), marker);
      points.push([v.lat, v.lon]);
    });
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 12 });
  }

  function focusVessel(mmsi) {
    const marker = markers.get(String(mmsi));
    if (!marker || !map) {
      $('mapStatus').textContent = 'That anticipated vessel is still outside the close-in Canal Park map. Its timing card uses the wider western Lake Superior AIS view.';
      $('duluthVesselMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const latlng = marker.getLatLng();
    map.setView(latlng, 13);
    marker.openPopup();
    $('duluthVesselMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderSource(data, failed) {
    const count = Array.isArray(data.mapVessels) ? data.mapVessels.length : 0;
    $('mapStatus').textContent = failed
      ? `Refresh unavailable. Showing the last successful check with ${count} recent nearby vessel report${count === 1 ? '' : 's'}.`
      : `${count} recent nearby vessel report${count === 1 ? '' : 's'} · checked ${time(data.checkedAt)} CT`;
    $('liveDot').className = `live-dot${failed ? ' offline' : count ? ' on' : ''}`;
    const credits = (data.attribution || []).map(a => a.credit).filter(Boolean);
    $('sourceCredits').textContent = credits.length ? `AIS credits: ${credits.join(' · ')}` : 'AIS source credits unavailable for this refresh.';
    $('updated').textContent = failed ? 'Last successful live check retained' : `Live AIS checked ${time(data.checkedAt)} CT`;
  }

  function render(data, failed) {
    renderPick(data, failed);
    renderCandidates(data);
    renderMap(data);
    renderSource(data, failed);
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
          el('h2', 'Use the published Duluth ship list for this check.'),
          el('p', 'The page will not substitute stale or invented vessel timing when the AIS feed is unavailable.')
        );
        $('anticipatedShips').replaceChildren(el('div', 'Anticipated ship estimates are unavailable until fresh AIS data returns.', 'empty-state'));
        $('mapStatus').textContent = 'Live vessel refresh unavailable. This is not a zero-traffic report.';
        $('liveDot').className = 'live-dot offline';
      }
    } finally {
      busy = false;
      $('refreshVessels').disabled = false;
    }
  }

  $('refreshVessels').addEventListener('click', load);
  initMap();
  load();
  setInterval(() => { if (!document.hidden) load(); }, 60000);
})();