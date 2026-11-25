(function () {
  'use strict';
  const container = document.getElementById('sooVesselMap');
  const status = document.getElementById('vesselMapStatus');
  const dot = document.getElementById('vesselMapDot');
  const refresh = document.getElementById('vesselMapRefresh');
  const list = document.getElementById('sooVesselList');
  const credits = document.getElementById('sooAisCredits');
  const card = document.getElementById('soo-next-ship');
  const cardKicker = document.getElementById('sooNextKicker');
  const cardHeading = document.getElementById('soo-next-ship-heading');
  const cardBody = document.getElementById('sooNextBody');
  const cardNow = document.getElementById('sooNextNow');
  let map, layer, focusLayer, detailPopup, fitted = false, busy = false, mapStarted = false, polling = false, previous, previousFailed = false;
  let selectedMarker = null;
  const visibleMarkers = new Map();
  // Shared local SVG silhouettes, also used by the Seaway map.
  const Icons = window.SeawayVesselIcons;
  const TZ = 'America/Detroit';
  const title = v => v.name || 'Vessel ' + v.mmsi;
  const age = v => Math.max(0, Math.round((Date.now() - Date.parse(v.seen)) / 60000));
  function text(tag, content, cls) { const el = document.createElement(tag); el.textContent = content; if (cls) el.className = cls; return el; }
  const clock = iso => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
  const clockZone = iso => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' });
  function feet(m) { return Number.isFinite(m) ? Math.round(m * 3.28084).toLocaleString('en-US') + ' ft' : null; }
  function sizeTag(v) {
    const L = v.lengthMeters;
    if (Number.isFinite(L) && L >= 298) return '1,000-footer';
    if (Number.isFinite(L) && L >= 190) return 'laker ' + feet(L);
    if (Number.isFinite(L) && L >= 90) return feet(L);
    return null;
  }
  function details(v) {
    return (v.speedKnots === null ? 'Speed unavailable' : (v.speedKnots * 1.15078).toFixed(1) + ' mph (' + v.speedKnots.toFixed(1) + ' kn)') +
      ' · reported ' + age(v) + ' min ago · ' + v.source;
  }
  function radius(v) {
    const L = v.lengthMeters;
    if (Number.isFinite(L)) return L >= 298 ? 11 : L >= 190 ? 9 : L >= 90 ? 7 : 5;
    return v.shipType >= 70 && v.shipType < 90 ? 9 : 6;
  }
  function typeLabel(v) {
    if (!Icons) return 'Type unknown';
    const kind = Icons.classify(v);
    return Icons.KINDS.find(item => item.kind === kind)?.label || 'Type unknown';
  }
  function shipIcon(v, selected = false) {
    if (!Icons) return null;
    const shape = Icons.icon(v, { zoom: map ? map.getZoom() : 13, selected });
    const [w, h] = shape.size;
    return L.divIcon({
      className: shape.className + ' soo-ais-symbol',
      html: shape.html, iconSize: shape.size,
      iconAnchor: [w / 2, h / 2], popupAnchor: [0, -h / 2]
    });
  }
  function labelShipMarker(marker, v) {
    const el = marker.getElement();
    if (!el) return;
    el.setAttribute('aria-label', title(v) + ' · ' + typeLabel(v));
    marker.sooLabel = title(v) + ' · ' + typeLabel(v);
  }
  function addShipMarker(v, into, selected = false) {
    const icon = shipIcon(v, selected);
    // If the optional symbol module fails, the map still retains clickable AIS observations.
    if (icon) {
      const marker = L.marker([v.lat, v.lon], { icon, keyboard: true }).addTo(into);
      // A single detail popup on click; an aria-label replaces the extra hover card.
      labelShipMarker(marker, v);
      return marker;
    }
    return L.circleMarker([v.lat, v.lon], {
      radius: radius(v), color: '#fff', weight: 2,
      fillColor: v.speedKnots === null ? '#64748b' : v.speedKnots > 0.5 ? '#146c86' : '#a6651e',
      fillOpacity: 0.95
    }).addTo(into);
  }
  // One Leaflet popup object is shared by every vessel, so selection cannot stack cards.
  function openShipPopup(marker) {
    if (!map || !marker.sooContent) return;
    if (!detailPopup) detailPopup = L.popup({ autoClose: true, closeOnClick: true, maxWidth: 240, autoPanPaddingTopLeft: L.point(50, 12), autoPanPaddingBottomRight: L.point(10, 12) });
    const anchor = marker.options.icon?.options?.popupAnchor || [0, -8];
    detailPopup.options.offset = L.point(anchor[0], anchor[1]);
    detailPopup.setLatLng(marker.getLatLng()).setContent(marker.sooContent).openOn(map);
  }
  // Moored boats at the same dock draw on top of each other, so a tap there could only ever
  // reach the top symbol. When symbols overlap the tapped one, offer every vessel at that spot
  // in the same single popup. A keyboard user has already focused one marker: open it directly.
  function crowdAt(marker) {
    const el = marker.getElement && marker.getElement();
    if (!layer || !el) return [marker];
    const a = el.getBoundingClientRect();
    const crowd = [];
    layer.eachLayer(other => {
      const o = other.sooContent && other.getElement && other.getElement();
      if (!o) return;
      const b = o.getBoundingClientRect();
      const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapW > 0 && overlapH > 0) crowd.push(other);
    });
    return crowd.length ? crowd : [marker];
  }
  function openCrowdChooser(marker, crowd) {
    if (!detailPopup) detailPopup = L.popup({ autoClose: true, closeOnClick: true, maxWidth: 240, autoPanPaddingTopLeft: L.point(50, 12), autoPanPaddingBottomRight: L.point(10, 12) });
    const box = document.createElement('div');
    box.className = 'soo-ais-crowd';
    box.append(text('p', crowd.length + ' vessels are reported at this spot. Choose one:', 'soo-ais-crowd-lead'));
    const ul = document.createElement('ul');
    crowd.forEach(m => {
      const li = document.createElement('li');
      const b = text('button', m.sooLabel || 'Vessel'); b.type = 'button';
      b.addEventListener('click', () => openShipPopup(m));
      li.append(b); ul.append(li);
    });
    box.append(ul);
    const anchor = marker.options.icon?.options?.popupAnchor || [0, -8];
    detailPopup.options.offset = L.point(anchor[0], anchor[1]);
    detailPopup.setLatLng(marker.getLatLng()).setContent(box).openOn(map);
    const first = box.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  function attachShipPopup(marker, content) {
    marker.sooContent = content;
    marker.on('click', e => {
      const viaKeyboard = /^key/.test(e?.originalEvent?.type || '');
      const crowd = viaKeyboard ? [marker] : crowdAt(marker);
      if (crowd.length > 1) openCrowdChooser(marker, crowd);
      else openShipPopup(marker);
    });
    // Leaflet 1.9 only opens popups bound with bindPopup on Enter. This shared popup is opened
    // by hand, so a focused marker (role="button") needs Enter and Space wired explicitly.
    marker.on('keydown', e => {
      const k = e?.originalEvent?.key;
      if (k !== 'Enter' && k !== ' ') return;
      e.originalEvent.preventDefault();
      openShipPopup(marker);
    });
  }
  function renderLegend() {
    const target = document.getElementById('sooVesselLegend');
    if (!target || !Icons) return;
    target.replaceChildren();
    for (const kind of Icons.KINDS) {
      const item = text('span', '', 'soo-vessel-legend-item type-' + kind.kind);
      const glyph = text('span', '', 'soo-vessel-legend-glyph');
      glyph.setAttribute('aria-hidden', 'true');
      glyph.innerHTML = Icons.svg(kind.kind); // Authored, static SVG paths, never provider markup.
      item.append(glyph, text('span', kind.label));
      target.append(item);
    }
  }
  const directionText = d => d === 'upbound' ? 'Upbound from Lake Huron, heading up to Lake Superior' : d === 'downbound' ? 'Downbound from Lake Superior, heading to the lower lakes' : 'Direction not reported';
  // USACE maintains the boat-schedule hotline only while the Visitor Center is open, May 1 to October 31.
  const hotlineSeason = () => { const m = Number(new Date().toLocaleString('en-US', { month: 'numeric', timeZone: TZ })); return m >= 5 && m <= 10; };
  const checkElsewhere = () => hotlineSeason() ? 'Call the hotline at 906-202-1333, or see the other ways to check further down this page.' : 'See the other ways to check further down this page; the USACE boat hotline runs only May 1 to October 31.';
  const chamberWhere = chamber => chamber === 'poe' ? 'The Poe is the second chamber out from the viewing platform.' : 'The MacArthur is the chamber right below the viewing platform.';

  // ---- next-ship card ----
  function renderCard(data, failed) {
    if (!card) return;
    const n = data && data.nextShip;
    cardBody.replaceChildren();
    if (cardNow) { cardNow.hidden = true; cardNow.replaceChildren(); }
    if (failed) {
      cardKicker.textContent = 'Next ship at the locks';
      cardHeading.textContent = 'Live ship reports are unavailable right now';
      cardBody.append(text('p', data ? 'The last refresh failed. Earlier arrival estimates and chamber observations are not current. Check the last-known positions on the map, then refresh before planning your visit.' : 'The feed did not return usable reports. This does not mean the river is empty.')); 
      cardBody.append(text('p', checkElsewhere()));
      return;
    }
    if (!n || !n.ok) {
      cardKicker.textContent = 'Next ship at the locks';
      cardHeading.textContent = 'The next-ship estimate is unavailable right now';
      cardBody.append(text('p', 'The live vessel map below still shows ships near the locks.'));
      return;
    }
    const inLock = n.inLock || [];
    const pick = n.pick;
    if (inLock.length) {
      const s = inLock[0];
      if (pick && cardNow) {
        cardNow.append(text('strong', 'In the ' + s.chamberName + ' now: '), document.createTextNode(title(s) + ', ' + s.sizeLabel + (s.direction ? ', ' + s.direction : '') + '. ' + chamberWhere(s.chamber)));
        cardNow.hidden = false;
      } else {
        cardKicker.textContent = 'In the locks now';
        cardHeading.textContent = title(s);
        cardBody.append(tags([s.sizeLabel, s.lengthFeet ? s.lengthFeet.toLocaleString('en-US') + ' ft' : null, s.chamberName]));
        cardBody.append(text('p', directionText(s.direction) + '. ' + chamberWhere(s.chamber) + ' Reported ' + s.ageMinutes + ' min ago.'));
        cardBody.append(actions(s));
        cardBody.append(text('p', 'No other freighter is clearly heading for the locks in reports under 30 minutes old.', 'next-ship-also'));
        return;
      }
    }
    if (!pick) {
      cardKicker.textContent = 'Next ship at the locks';
      cardHeading.textContent = 'No ship is clearly heading for the locks right now';
      cardBody.append(text('p', 'Nothing in reports under 30 minutes old shows a freighter moving toward the locks. That does not mean none is coming: ships wait at docks and anchorages, and AIS coverage has gaps. ' + checkElsewhere()));
      return;
    }
    cardKicker.textContent = 'Next ship heading for the locks';
    cardHeading.textContent = title(pick);
    cardBody.append(tags([pick.sizeLabel, pick.lengthFeet ? pick.lengthFeet.toLocaleString('en-US') + ' ft' : null]));
    const win = document.createElement('div'); win.className = 'next-ship-window';
    win.append(text('span', 'Planning window at the locks'), text('strong', clock(pick.window.start) + '–' + clockZone(pick.window.end)),
      text('small', pick.channelMilesToLocks + ' river miles away at ' + (pick.speedKnots * 1.15078).toFixed(1) + ' mph, reported ' + pick.ageMinutes + ' min ago'));
    cardBody.append(win);
    cardBody.append(text('p', directionText(pick.direction) + '. ' + (pick.lockCertain ? pick.lockNote + ' ' + chamberWhere('poe') : 'Small enough for either chamber; the lockmaster assigns it. ' + chamberWhere('macarthur'))));
    cardBody.append(actions(pick));
    const others = (n.candidates || []).filter(c => c.id !== pick.id).slice(0, 3);
    if (others.length) cardBody.append(text('p', 'Also heading in: ' + others.map(c => title(c) + ' (' + c.direction + ', about ' + clock(c.window.start) + '–' + clock(c.window.end) + ')').join('; ') + '.', 'next-ship-also'));
    cardBody.append(text('p', 'This planning window uses reported position, speed and river distance. It is not a lock schedule. Ships can slow or stop before reaching the locks. Recheck movement on the map before leaving; the actual arrival can be outside this window. Not for navigation.', 'next-ship-note'));
  }
  function tags(items) {
    const ul = document.createElement('ul'); ul.className = 'next-ship-tags';
    items.filter(Boolean).forEach(t => { const li = text('li', t); if (t === '1,000-footer' || t === 'ocean-going saltie' || t === 'cruise ship') li.className = 'big'; ul.append(li); });
    return ul;
  }
  function actions(ship) {
    const box = document.createElement('div'); box.className = 'next-ship-actions';
    const show = text('button', 'Show it on the live map'); show.type = 'button';
    show.addEventListener('click', () => focusShip(ship));
    let other;
    if (hotlineSeason()) { other = text('a', 'Boat hotline 906-202-1333'); other.href = 'tel:+19062021333'; }
    // Off season, the next step stays in the tool: line this ship up against a visit.
    else { other = text('a', 'Plan your platform time \u2193'); other.href = '#soo-lock-watch'; }
    box.append(show, other);
    return box;
  }
  function focusShip(ship) {
    startMap();
    container.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (!map || !Number.isFinite(ship.lat) || !Number.isFinite(ship.lon)) return;
    if (selectedMarker?.getElement()) selectedMarker.getElement()?.classList.remove('is-selected');
    focusLayer.clearLayers();
    const mmsi = String(ship.mmsi || ship.id || '');
    const present = visibleMarkers.get(mmsi);
    const observed = previous?.vessels?.find(v => String(v.mmsi) === mmsi);
    const m = present?.marker || addShipMarker(observed || ship, focusLayer, true);
    selectedMarker = m;
    m.getElement()?.classList.add('is-selected');
    if (!present) attachShipPopup(m, text('strong', title(ship)));
    const zoom = Number(ship.channelMilesToLocks) > 8 ? 11 : 14;
    map.setView([ship.lat, ship.lon], zoom);
    // Re-centre once smooth scrolling settles.
    setTimeout(() => { map.invalidateSize(); map.setView([ship.lat, ship.lon], zoom, { animate: false }); openShipPopup(m); }, 600);
  }

  // ---- map and list ----
  function render(data, failed) {
    const vessels = data.vessels.filter(v => Number.isFinite(Date.parse(v.seen)) && Date.now() >= Date.parse(v.seen) && Date.now() - Date.parse(v.seen) <= 1800000);
    const inLock = new Map((failed ? [] : ((data.nextShip && data.nextShip.inLock) || [])).map(s => [s.mmsi, s]));
    list.replaceChildren();
    if (detailPopup && map?.hasLayer(detailPopup)) map.removeLayer(detailPopup);
    if (layer) layer.clearLayers();
    if (focusLayer) focusLayer.clearLayers();
    visibleMarkers.clear();
    selectedMarker = null;
    const points = [];
    vessels.forEach(v => {
      const content = document.createElement('div'); content.append(text('strong', title(v)));
      const size = sizeTag(v);
      content.append(text('p', 'Reported AIS type: ' + typeLabel(v)));
      if (size) content.append(text('p', size));
      else if (Number.isFinite(v.lengthMeters)) content.append(text('p', 'Reported length: ' + feet(v.lengthMeters)));
      if (inLock.has(v.mmsi)) content.append(text('p', 'In the ' + inLock.get(v.mmsi).chamberName + ' now'));
      content.append(text('p', details(v)), text('p', 'MMSI ' + v.mmsi));
      if (v.course !== null) content.append(text('p', 'Course ' + Math.round(v.course) + '°'));
      if (v.destination) content.append(text('p', 'Reported destination: ' + v.destination));
      let marker;
      if (map) {
        marker = addShipMarker(v, layer);
        attachShipPopup(marker, content);
        visibleMarkers.set(String(v.mmsi), { marker, v });
        points.push([v.lat, v.lon]);
      }
      const item = document.createElement('li');
      if (marker) {
        const button = text('button', title(v)); button.type = 'button'; button.addEventListener('click', () => { map.setView([v.lat, v.lon], 15, { animate: false }); openShipPopup(marker); container.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); item.append(button);
      } else item.append(text('strong', title(v)));
      const extra = [typeLabel(v), inLock.has(v.mmsi) ? 'in the ' + inLock.get(v.mmsi).chamberName + ' now' : null, size || feet(v.lengthMeters)].filter(Boolean).join(' · ');
      item.append(text('span', (extra ? extra + ' · ' : '') + details(v))); list.append(item);
    });
    if (!vessels.length) list.append(text('li', failed ? 'No last-known positions remain within 30 minutes. Live reports are unavailable; this is not a zero-traffic report.' : 'No reports less than 30 minutes old were returned for this area. This does not mean there are no ships.'));
    if (map && points.length && !fitted) { map.fitBounds(points, { padding: [30, 30], maxZoom: 13 }); fitted = true; }
    const count = vessels.length + (failed ? ' last-known vessel report' : ' recent vessel report') + (vessels.length === 1 ? '' : 's');
    status.textContent = failed ? 'Refresh unavailable. ' + count + ' retained from the earlier check; see report ages below.' :
      count + ' near the Soo · checked ' + new Date(data.checkedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' }) + (map || !mapStarted ? '' : ' · map unavailable; vessel list below');
    dot.className = 'vessel-map-status-dot' + (failed ? ' offline' : vessels.length ? ' live' : '');
    credits.textContent = 'Source credits: ' + data.attribution.map(a => a.credit).join(' · ');
    renderCard(data, failed);
    share(data, failed);
  }
  // Hand each check to the Lock Watch planner (public/assets/soo-lock-watch.js).
  function share(data, failed) {
    window.SooAis.last = { data, failed };
    try { document.dispatchEvent(new CustomEvent('soo-ais:data', { detail: window.SooAis.last })); } catch (_) { /* planner optional */ }
  }
  async function load() {
    if (busy) return;
    busy = true; refresh.disabled = true;
    try {
      const r = await fetch('/api/soo-ais', { signal: AbortSignal.timeout(15000) }); const data = await r.json();
      if (!r.ok || !data.ok || !Array.isArray(data.vessels)) throw new Error('AIS unavailable');
      previous = data; previousFailed = false; render(data, false);
    } catch (_) {
      previousFailed = true;
      if (previous) render(previous, true);
      else {
        status.textContent = 'Vessel reports are temporarily unavailable. Try again, or see the other ways to check above the map.'; dot.className = 'vessel-map-status-dot offline';
        list.replaceChildren(text('li', 'The feed did not return usable data. This is not a zero-traffic report.'));
        renderCard(null, true);
        share(null, true);
      }
    } finally { busy = false; refresh.disabled = false; }
  }
  function startPolling() {
    if (polling) return; polling = true;
    load(); setInterval(() => { if (!document.hidden) load(); }, 60000);
  }
  // The map is built only when it nears the viewport; the card needs data at once.
  function startMap() {
    if (mapStarted) return; mapStarted = true;
    if (typeof L !== 'undefined') {
      map = L.map(container, { scrollWheelZoom: false }).setView([46.5036,-84.36], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      layer = L.layerGroup().addTo(map);
      focusLayer = L.layerGroup().addTo(map);
      map.on('zoomend', () => {
        for (const { marker, v } of visibleMarkers.values()) {
          const updated = shipIcon(v, marker === selectedMarker);
          if (updated && marker.setIcon) {
            marker.setIcon(updated);
            labelShipMarker(marker, v);
          }
        }
      });
    } else container.textContent = 'Map could not load. Recent vessel reports remain available in the list below.';
    if (previous) render(previous, previousFailed);
  }
  window.SooAis = { focusShip, last: null };
  refresh.addEventListener('click', () => { startMap(); load(); });
  renderLegend();
  startPolling();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); startMap(); } }, { rootMargin: '300px' });
    observer.observe(container);
  } else startMap();
})();
