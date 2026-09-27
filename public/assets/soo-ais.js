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
  let map, layer, focusLayer, fitted = false, busy = false, mapStarted = false, polling = false, previous;
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
  const directionText = d => d === 'upbound' ? 'Upbound from Lake Huron, heading up to Lake Superior' : d === 'downbound' ? 'Downbound from Lake Superior, heading to the lower lakes' : 'Direction not reported';
  const chamberWhere = chamber => chamber === 'poe' ? 'The Poe is the second chamber out from the viewing platform.' : 'The MacArthur is the chamber right below the viewing platform.';

  // ---- next-ship card ----
  function renderCard(data, failed) {
    if (!card) return;
    const n = data && data.nextShip;
    cardBody.replaceChildren();
    if (cardNow) { cardNow.hidden = true; cardNow.replaceChildren(); }
    if (failed && !n) {
      cardKicker.textContent = 'Next ship at the locks';
      cardHeading.textContent = 'Live ship reports are unavailable right now';
      cardBody.append(text('p', 'Call the official boat hotline at 906-202-1333 while the Visitor Center is open, or check the BoatNerd passage list below.'));
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
      cardBody.append(text('p', 'Nothing in reports under 30 minutes old shows a freighter moving toward the locks. That does not mean none is coming: ships wait at docks and anchorages, and AIS coverage has gaps. Call the hotline at 906-202-1333 or check the BoatNerd passage list below.'));
      return;
    }
    cardKicker.textContent = 'Next ship heading for the locks';
    cardHeading.textContent = title(pick);
    cardBody.append(tags([pick.sizeLabel, pick.lengthFeet ? pick.lengthFeet.toLocaleString('en-US') + ' ft' : null]));
    const win = document.createElement('div'); win.className = 'next-ship-window';
    win.append(text('span', 'Estimated at the locks'), text('strong', clock(pick.window.start) + '–' + clockZone(pick.window.end)),
      text('small', pick.channelMilesToLocks + ' river miles away at ' + (pick.speedKnots * 1.15078).toFixed(1) + ' mph, reported ' + pick.ageMinutes + ' min ago'));
    cardBody.append(win);
    cardBody.append(text('p', directionText(pick.direction) + '. ' + (pick.lockCertain ? pick.lockNote + ' ' + chamberWhere('poe') : 'Small enough for either chamber; the lockmaster assigns it. ' + chamberWhere('macarthur'))));
    cardBody.append(actions(pick));
    const others = (n.candidates || []).filter(c => c.id !== pick.id).slice(0, 3);
    if (others.length) cardBody.append(text('p', 'Also heading in: ' + others.map(c => title(c) + ' (' + c.direction + ', about ' + clock(c.window.start) + '–' + clock(c.window.end) + ')').join('; ') + '.', 'next-ship-also'));
    const how = n.selection && n.selection.mode === 'shared-harness-jev' ? 'Picked by JEV.' : 'Picked by timing rules.';
    cardBody.append(text('p', how + ' An estimate from live AIS position, speed and river distance, not a lock schedule; ships can wait for a chamber or stop at a dock. Not for navigation.', 'next-ship-note'));
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
    const hotline = text('a', 'Boat hotline 906-202-1333'); hotline.href = 'tel:+19062021333';
    box.append(show, hotline);
    return box;
  }
  function focusShip(ship) {
    startMap();
    container.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (!map) return;
    focusLayer.clearLayers();
    const m = L.circleMarker([ship.lat, ship.lon], { radius: 13, color: '#165d71', weight: 3, fillColor: '#fff', fillOpacity: 0.6 }).addTo(focusLayer);
    m.bindPopup(text('strong', title(ship)));
    const zoom = Number(ship.channelMilesToLocks) > 8 ? 11 : 14;
    map.setView([ship.lat, ship.lon], zoom);
    // Re-centre once the smooth scroll settles, so the ship is not left at the map's edge.
    setTimeout(() => { map.invalidateSize(); map.setView([ship.lat, ship.lon], zoom); m.openPopup(); }, 600);
  }

  // ---- map and list ----
  function render(data, failed) {
    const vessels = data.vessels.filter(v => Number.isFinite(Date.parse(v.seen)) && Date.now() - Date.parse(v.seen) <= 1800000);
    const inLock = new Map(((data.nextShip && data.nextShip.inLock) || []).map(s => [s.mmsi, s]));
    list.replaceChildren();
    if (layer) layer.clearLayers();
    const points = [];
    vessels.forEach(v => {
      const content = document.createElement('div'); content.append(text('strong', title(v)));
      const size = sizeTag(v);
      if (size) content.append(text('p', size));
      if (inLock.has(v.mmsi)) content.append(text('p', 'In the ' + inLock.get(v.mmsi).chamberName + ' now'));
      content.append(text('p', details(v)), text('p', 'MMSI ' + v.mmsi));
      if (v.course !== null) content.append(text('p', 'Course ' + Math.round(v.course) + '°'));
      if (v.destination) content.append(text('p', 'Reported destination: ' + v.destination));
      let marker;
      if (map) {
        marker = L.circleMarker([v.lat, v.lon], { radius: radius(v), color: '#fff', weight: 2, fillColor: v.speedKnots === null ? '#64748b' : v.speedKnots > 0.5 ? '#146c86' : '#a6651e', fillOpacity: 0.95 }).addTo(layer);
        marker.bindTooltip(text('span', title(v)), { direction: 'top' }).bindPopup(content);
        points.push([v.lat, v.lon]);
      }
      const item = document.createElement('li');
      if (marker) {
        const button = text('button', title(v)); button.type = 'button'; button.addEventListener('click', () => { map.setView([v.lat, v.lon], 15); marker.openPopup(); container.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); item.append(button);
      } else item.append(text('strong', title(v)));
      const extra = [inLock.has(v.mmsi) ? 'in the ' + inLock.get(v.mmsi).chamberName + ' now' : null, size].filter(Boolean).join(' · ');
      item.append(text('span', (extra ? extra + ' · ' : '') + details(v))); list.append(item);
    });
    if (!vessels.length) list.append(text('li', 'No reports less than 30 minutes old were returned for this area. This does not mean there are no ships.'));
    if (map && points.length && !fitted) { map.fitBounds(points, { padding: [30, 30], maxZoom: 13 }); fitted = true; }
    const count = vessels.length + ' recent vessel report' + (vessels.length === 1 ? '' : 's');
    status.textContent = failed ? 'Refresh unavailable. ' + count + ' retained from the earlier check; see report ages below.' :
      count + ' near the Soo · checked ' + new Date(data.checkedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' }) + (map || !mapStarted ? '' : ' · map unavailable; vessel list below');
    dot.className = 'vessel-map-status-dot' + (failed ? ' offline' : vessels.length ? ' live' : '');
    credits.textContent = 'Source credits: ' + data.attribution.map(a => a.credit).join(' · ');
    renderCard(data, failed);
  }
  async function load() {
    if (busy) return;
    busy = true; refresh.disabled = true;
    try {
      const r = await fetch('/api/soo-ais', { signal: AbortSignal.timeout(15000) }); const data = await r.json();
      if (!r.ok || !data.ok || !Array.isArray(data.vessels)) throw new Error('AIS unavailable');
      previous = data; render(data, false);
    } catch (_) {
      if (previous) render(previous, true);
      else {
        status.textContent = 'Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.'; dot.className = 'vessel-map-status-dot offline';
        list.replaceChildren(text('li', 'The feed did not return usable data. This is not a zero-traffic report.'));
        renderCard(null, true);
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
    } else container.textContent = 'Map could not load. Recent vessel reports remain available in the list below.';
    if (previous) render(previous, false);
  }
  refresh.addEventListener('click', () => { startMap(); load(); });
  startPolling();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); startMap(); } }, { rootMargin: '300px' });
    observer.observe(container);
  } else startMap();
})();
