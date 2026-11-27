/* River Ship Map: draws the channel, the public viewing spots, the live cameras and the ships from
 * the same reports the River Ship Watch board already loaded. No second request for ship data.
 *
 * Leaflet (self-hosted) loads only when the map is about to scroll into view. The list on the
 * board stays the primary answer; the map is a picture of it, with a text summary for screen
 * readers. Ships are drawn from their own latest report, not from a forecast track.
 * Not a navigation chart. Needs: #rswBoard (river-ship-watch.js), #rswModel, a [data-rsw-map] holder, and optionally
 * #rswCams (JSON list of {id, short, lat, lon}). */
(function () {
  'use strict';
  const doc = document;
  const holder = doc.querySelector('[data-rsw-map]');
  const board = doc.getElementById('rswBoard');
  const modelEl = doc.getElementById('rswModel');
  if (!holder || !board || !modelEl) return;
  let model, cams = [];
  try { model = JSON.parse(modelEl.textContent); } catch (_) { return; }
  try { const c = doc.getElementById('rswCams'); if (c) cams = JSON.parse(c.textContent); } catch (_) { cams = []; }

  const ZONE = 'America/Detroit';
  const COMMERCIAL = t => t === null || t === undefined || (t >= 60 && t <= 89);
  const clock = ms => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const summary = holder.querySelector('[data-rsw-map-summary]');
  const canvas = holder.querySelector('[data-rsw-map-canvas]');
  const vp = model.geometry.viewpoints;
  const towns = {};
  board.querySelectorAll('[data-rsw-view]').forEach(b => { towns[b.dataset.rswView] = (b.querySelector('strong') || b).textContent; });

  let L = null, map = null, shipLayer = null, spotMarkers = {}, started = false, framedShips = false;

  // One Leaflet per page. The Detroit relation map looks for script[data-detroit-leaflet], so this
  // tags its own copy the same way and waits for whichever copy is already loading.
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return new Promise((resolve, reject) => {
      const done = () => window.L ? resolve(window.L) : reject(new Error('no Leaflet'));
      const existing = doc.querySelector('script[data-detroit-leaflet],script[data-rsw-leaflet]');
      if (existing) { existing.addEventListener('load', done, { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
      if (!doc.querySelector('link[data-detroit-leaflet],link[data-rsw-leaflet]')) {
        const css = doc.createElement('link');
        css.rel = 'stylesheet'; css.href = '/assets/leaflet-1.9.4.css';
        css.dataset.rswLeaflet = '1'; css.dataset.detroitLeaflet = '1';
        doc.head.appendChild(css);
      }
      const s = doc.createElement('script');
      s.src = '/assets/leaflet-1.9.4.js'; s.async = true;
      s.dataset.rswLeaflet = '1'; s.dataset.detroitLeaflet = '1';
      s.onload = done; s.onerror = reject;
      doc.head.appendChild(s);
    });
  }

  function selectSpot(id) {
    const btn = board.querySelector('[data-rsw-view="' + id + '"]');
    if (btn) btn.click();
  }

  function shipIcon(moving, inWindow, course) {
    const cls = 'rsw-ship-icon' + (moving ? ' is-moving' : ' is-stopped') + (inWindow ? ' is-forecast' : '');
    const rot = moving && Number.isFinite(course) ? course : 0;
    const shape = moving
      ? '<svg viewBox="0 0 20 20" aria-hidden="true" style="transform:rotate(' + rot + 'deg)"><path d="M10 1 L16 17 L10 13.5 L4 17 Z"/></svg>'
      : '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6"/></svg>';
    return L.divIcon({ className: cls, html: shape, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  }

  function build() {
    map = L.map(canvas, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomSnap: 0.5, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    // The model's channel line is an approximate centreline for the arithmetic, not a chart, so it is not drawn.
    const pts = [];
    // Labels go right on a north-south river (St. Clair). On an east-west reach (Detroit) the
    // westernmost spot's label goes above so neighbouring labels do not collide.
    const list = Object.values(vp);
    const lats = list.map(v => v.lat), lons = list.map(v => v.lon);
    const eastWest = (Math.max(...lons) - Math.min(...lons)) > (Math.max(...lats) - Math.min(...lats));
    const west = Math.min(...lons);
    for (const [id, v] of Object.entries(vp)) {
      const dir = eastWest && v.lon === west ? 'top' : 'right';
      pts.push([v.lat, v.lon]);
      const m = L.circleMarker([v.lat, v.lon], { radius: 9, color: '#0f2a3a', weight: 2, fillColor: '#e0b970', fillOpacity: 1 })
        .addTo(map)
        .bindTooltip(towns[id] || v.name, { permanent: true, direction: dir, offset: dir === 'top' ? [0, -10] : [10, 0], className: 'rsw-spot-label' });
      m.on('click', () => selectSpot(id));
      spotMarkers[id] = m;
    }
    for (const c of cams) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon)) continue;
      L.marker([c.lat, c.lon], { icon: L.divIcon({ className: 'rsw-cam-icon', html: '<span aria-hidden="true">▶</span>', iconSize: [20, 20], iconAnchor: [32, 10], popupAnchor: [-22, -8] }), title: c.short + ' live camera' })
        .addTo(map)
        .bindPopup('<strong>' + esc(c.short) + ' live camera</strong><br><a href="#cam-' + esc(c.id) + '">Watch it below</a>');
    }
    shipLayer = L.layerGroup().addTo(map);
    for (const c of cams) if (Number.isFinite(c.lat) && Number.isFinite(c.lon)) pts.push([c.lat, c.lon]);
    const box = L.latLngBounds(pts);
    const span = Math.max(box.getNorth() - box.getSouth(), box.getEast() - box.getWest());
    map.fitBounds(box.pad(span < 0.15 ? 0.12 : 0.08));
    highlight(board.dataset.view);
    if (board.rswData) draw(board.rswData);
  }

  function highlight(view) {
    for (const [id, m] of Object.entries(spotMarkers)) m.setStyle(id === view ? { radius: 12, fillColor: '#e0b970', weight: 3 } : { radius: 8, fillColor: '#f3e3bf', weight: 2 });
  }

  function draw(data) {
    if (!shipLayer) return;
    shipLayer.clearLayers();
    if (data.error) { summary.textContent = 'Ship reports are unavailable right now, so the map shows only the viewing spots.'; return; }
    const now = Date.now();
    const maxAge = data.maxReportAgeMin ? data.maxReportAgeMin * 60000 : Infinity;
    const view = board.dataset.view;
    const next = {};
    for (const r of data.rows || []) if (r.viewpoint === view && !next[r.mmsi]) next[r.mmsi] = r;
    let moving = 0, stopped = 0, inBox = 0;
    const bounds = map.getBounds();
    for (const v of data.vessels || []) {
      if (!COMMERCIAL(v.shipType) || (Number.isFinite(v.lengthMeters) && v.lengthMeters < 50)) continue;
      const seen = Date.parse(v.seen);
      if (!Number.isFinite(seen) || now - seen > maxAge || !Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
      const isMoving = !!(v.motion && v.motion.approachEligible);
      const course = v.motion && Number.isFinite(v.motion.courseOverGround) ? v.motion.courseOverGround : v.course;
      const f = next[String(v.mmsi)];
      const mins = Math.max(0, Math.round((now - seen) / 60000));
      const lines = ['<strong>' + esc(v.name || 'Unnamed vessel') + '</strong>',
        (isMoving ? (Number.isFinite(v.speedKnots) ? v.speedKnots.toFixed(1) + ' kn' : 'Moving') : 'Stopped, anchored or barely moving') +
          (Number.isFinite(v.lengthMeters) ? ' · ' + Math.round(v.lengthMeters * 3.28084) + ' ft' : ''),
        'Reported ' + (mins < 1 ? 'just now' : mins + ' min ago') + ' (' + clock(seen) + ')'];
      if (f) lines.push('Window at ' + esc(towns[view] || view) + ': <strong>' + esc(clock(f.earliest)) + '–' + esc(clock(f.latest)) + '</strong>');
      L.marker([v.lat, v.lon], { icon: shipIcon(isMoving, !!f, course), title: (v.name || 'Unnamed vessel') + (f ? ', forecast at ' + (towns[view] || view) : ''), keyboard: true })
        .addTo(shipLayer).bindPopup(lines.join('<br>'));
      if (isMoving) moving++; else stopped++;
      if (bounds.contains([v.lat, v.lon])) inBox++;
    }
    // Once per page view: if a highlighted ship is off the map, widen the view to include it.
    if (!framedShips && Object.keys(next).length) {
      const want = (data.vessels || []).filter(v => next[String(v.mmsi)] && Number.isFinite(v.lat)).map(v => [v.lat, v.lon]);
      if (want.some(p => !bounds.contains(p))) { map.fitBounds(bounds.extend(L.latLngBounds(want)).pad(0.05)); }
      framedShips = true;
    }
    const forecast = Object.keys(next).length;
    summary.textContent = (moving + stopped === 0
      ? 'No commercial ship has reported on the river recently.'
      : moving + ' moving and ' + stopped + ' stopped commercial ' + (moving + stopped === 1 ? 'ship' : 'ships') + ' on the river from reports checked at ' + clock(data.checkedAt) +
        (inBox < moving + stopped ? '; zoom out to see the rest' : '') + '.') +
      (forecast ? ' ' + forecast + ' highlighted with a window at ' + (towns[view] || view) + '.' : '');
  }

  board.addEventListener('rsw:data', e => { if (map) draw(e.detail); });
  board.addEventListener('rsw:view', e => { if (map) { highlight(e.detail.view); if (board.rswData) draw(board.rswData); } });

  function start() {
    if (started) return; started = true;
    holder.setAttribute('data-state', 'loading');
    loadLeaflet().then(lib => { L = lib; build(); holder.setAttribute('data-state', 'ready'); })
      .catch(() => { holder.setAttribute('data-state', 'error'); summary.textContent = 'The map could not load. The list above has every forecast ship.'; });
  }
  holder.setAttribute('data-js', '');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '400px 0px' });
    io.observe(holder);
  } else start();
})();
