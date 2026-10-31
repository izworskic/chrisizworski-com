/* FIELD_GUIDE_V1 · Great Lakes Rockhound Field Guide Engine
 * Connects 15 beach stories to live wave data from /api/michigan-rockhounding,
 * provides progressive target-stone and legal filtering, and powers the interactive map.
 */
(() => {
  'use strict';

  const stories = [...document.querySelectorAll('.wf-story')];
  if (!stories.length) return;

  const stoneChips = [...document.querySelectorAll('[data-stone-filter]')];
  const regionSelect = document.getElementById('wf-region');
  const ruleSelect = document.getElementById('wf-rule');
  const countEl = document.getElementById('wf-count');
  const emptyEl = document.getElementById('wf-empty');
  const mapNode = document.getElementById('wf-map');
  const mapStatus = document.getElementById('wf-map-message');

  let activeStone = 'all';
  let map = null;
  let markers = [];
  let tiles = null;
  let userZoomed = false;
  let fitOnce = false;
  let liveData = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  const message = (msg, state) => {
    if (mapStatus) {
      mapStatus.textContent = msg;
      mapStatus.dataset.state = state || '';
    }
  };

  const isVisible = (card) => {
    if (card.hidden) return false;
    return true;
  };

  function applyFilters() {
    let matchCount = 0;
    const selectedRegion = regionSelect ? regionSelect.value : 'all';
    const selectedRule = ruleSelect ? ruleSelect.value : 'all';

    stories.forEach(card => {
      const cardStones = (card.dataset.stones || '').split(' ');
      const cardRegion = card.dataset.region || '';
      const cardRule = card.dataset.rule || '';

      const stoneMatch = (activeStone === 'all') || cardStones.includes(activeStone);
      const regionMatch = (selectedRegion === 'all') || (cardRegion === selectedRegion);
      const ruleMatch = (selectedRule === 'all') || (selectedRule === 'collect' && cardRule !== 'nps');

      const ok = stoneMatch && regionMatch && ruleMatch;
      card.hidden = !ok;
      if (ok) matchCount++;
    });

    stoneChips.forEach(chip => {
      chip.setAttribute('aria-pressed', String(chip.dataset.stoneFilter === activeStone));
    });

    if (countEl) {
      countEl.textContent = matchCount
        ? `Showing ${matchCount} of 15 Great Lakes rockhounding beaches. Confirm wave conditions and check land boundaries before you hunt.`
        : 'No beaches match that exact combination. Try clearing the stone filter or choosing another region.';
    }

    if (emptyEl) {
      emptyEl.hidden = matchCount > 0;
    }

    refreshMapMarkers(false);
  }

  function resetFilters() {
    activeStone = 'all';
    if (regionSelect) regionSelect.value = 'all';
    if (ruleSelect) ruleSelect.value = 'all';
    applyFilters();
  }

  stoneChips.forEach(chip => {
    chip.addEventListener('click', () => {
      activeStone = chip.dataset.stoneFilter;
      applyFilters();
    });
  });

  if (regionSelect) regionSelect.addEventListener('change', applyFilters);
  if (ruleSelect) ruleSelect.addEventListener('change', applyFilters);

  document.getElementById('wf-reset')?.addEventListener('click', resetFilters);
  document.getElementById('wf-show-all')?.addEventListener('click', resetFilters);

  // Map support
  function refreshMapMarkers(initial) {
    if (!map || !window.L) return;

    markers.forEach(m => map.removeLayer(m));
    markers = [];
    const points = [];

    stories.filter(isVisible).forEach(card => {
      const lat = parseFloat(card.dataset.lat);
      const lng = parseFloat(card.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const name = card.querySelector('h3')?.textContent || 'Rockhounding Beach';
      const isNps = card.dataset.rule === 'nps';
      const siteId = card.id;

      let waveText = 'Checking 72h wave work...';
      if (liveData && liveData.sites) {
        const site = liveData.sites.find(s => s.id === siteId);
        if (site && site.verdict) {
          waveText = site.verdict.label;
        }
      }

      const popup = document.createElement('div');
      popup.innerHTML = `
        <strong style="display:block;font-size:13px;color:#1b2624">${esc(name)}</strong>
        <span style="display:inline-block;margin:3px 0;font-size:11px;font-weight:700;color:${isNps ? '#b23f1c' : '#255d54'}">${isNps ? 'LOOK ONLY · NPS BAN' : '25 LB/YR STATE LIMIT'}</span>
        <p style="margin:4px 0 6px;font-size:11.5px;color:#51635f">${esc(waveText)}</p>
        <a href="#${siteId}" style="font-size:11px;font-weight:700;color:#255d54">Read Shoreline Field Note ↓</a>
      `;

      popup.querySelector('a').addEventListener('click', (ev) => {
        ev.preventDefault();
        card.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start'
        });
        card.querySelector('h3')?.focus({ preventScroll: true });
        map.closePopup();
      });

      const pinColor = isNps ? '#b23f1c' : '#255d54';
      const icon = window.L.divIcon({
        className: '',
        html: `<span class="wf-pin" style="background:${pinColor}" aria-hidden="true"></span>`,
        iconSize: [17, 17],
        iconAnchor: [8, 8]
      });

      const marker = window.L.marker([lat, lng], { title: name, icon }).bindPopup(popup).addTo(map);
      markers.push(marker);
      points.push([lat, lng]);
    });

    if (initial || (!userZoomed && !fitOnce)) {
      if (points.length > 1) {
        map.fitBounds(points, { padding: [24, 24], maxZoom: 7 });
      } else if (points.length === 1) {
        map.setView(points[0], 7);
      }
      fitOnce = true;
    }
  }

  function showTiles(url, provider) {
    if (!map) return;
    if (tiles) map.removeLayer(tiles);

    const layer = window.L.tileLayer(url, {
      subdomains: provider === 'CARTO' ? 'abcd' : 'abc',
      maxZoom: 18,
      attribution: provider === 'CARTO'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles = layer;
    let failed = 0, loaded = 0;

    layer.on('tileload', () => {
      if (tiles !== layer) return;
      loaded++;
      if (loaded >= 2) {
        message(provider === 'CARTO' ? 'CARTO basemap loaded. Choose a shoreline pin.' : 'OpenStreetMap basemap loaded.', 'ready');
      }
    });

    layer.on('tileerror', () => {
      if (tiles !== layer) return;
      if (++failed >= 2) {
        if (provider === 'CARTO') {
          message('CARTO unavailable; switching to OpenStreetMap.', 'fallback');
          showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OSM');
        } else {
          message('Map tiles unavailable. All 15 beach field notes remain accessible below.', 'error');
        }
      }
    });

    layer.addTo(map);
  }

  async function connectTiles() {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 6500);
    try {
      const r = await fetch('/api/carto-basemap-config', { credentials: 'same-origin', signal: ac.signal });
      if (!r.ok) throw new Error('config');
      const c = await r.json();
      if (c?.provider !== 'CARTO' || typeof c.key !== 'string' || !c.key.trim()) throw new Error('config');
      showTiles('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(c.key.trim()), 'CARTO');
    } catch {
      message('Public CARTO map unavailable; using OpenStreetMap fallback.', 'fallback');
      showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OSM');
    } finally {
      clearTimeout(timer);
    }
  }

  function initMap() {
    if (!window.L || !mapNode) {
      message('Interactive map optional; browse all 15 beaches below.', 'error');
      return;
    }
    try {
      mapNode.textContent = '';
      map = window.L.map(mapNode, { scrollWheelZoom: false }).setView([45.9, -86.3], 6);
      map.on('dragstart zoomstart', () => { userZoomed = true; });
      refreshMapMarkers(true);
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => map?.invalidateSize({ pan: false })).observe(mapNode);
      }
      requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      connectTiles();
    } catch {
      message('Map could not initialize. Every field note remains readable.', 'error');
    }
  }

  // Connect live rockhounding wave engine
  async function loadLiveWaveConditions() {
    try {
      const res = await fetch('/api/michigan-rockhounding', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      liveData = data;

      if (!data || !Array.isArray(data.sites)) return;

      data.sites.forEach(site => {
        const badge = document.querySelector(`[data-beach-badge="${site.id}"]`);
        const metricsEl = document.querySelector(`[data-beach-metrics="${site.id}"]`);
        if (!badge) return;

        const code = site.verdict?.code || 'UNAVAILABLE';
        badge.dataset.status = code;

        let badgeLabel = site.verdict?.label || 'Wave data unavailable';
        let badgeIcon = '🌊';
        if (code === 'PRIME') badgeIcon = '🟢';
        else if (code === 'GOOD') badgeIcon = '🔵';
        else if (code === 'STORM' || code === 'BUILDING') badgeIcon = '⚠️';
        else if (code === 'QUIET') badgeIcon = '⚪';

        badge.innerHTML = `<span aria-hidden="true">${badgeIcon}</span> <span>${esc(badgeLabel)}</span>`;

        if (metricsEl) {
          const parts = [];
          if (site.storm && site.storm.peakWindMph) {
            parts.push(`Peak 72h onshore wind: <strong>${site.storm.peakWindMph} mph from ${site.storm.peakFrom}</strong>`);
          }
          if (site.buoy && site.buoy.wvhtFt != null) {
            parts.push(`Open-lake waves: <strong>${site.buoy.wvhtFt} ft</strong> (Buoy ${site.buoy.id})`);
          }
          if (site.nextWindow) {
            parts.push(`Next after-storm window: <strong>${site.nextWindow.t ? 'approaching' : 'check forecast'}</strong>`);
          }
          if (parts.length) {
            metricsEl.innerHTML = parts.join(' &middot; ');
            metricsEl.hidden = false;
          }
        }
      });

      // Update map popup texts with live data
      refreshMapMarkers(false);
    } catch (err) {
      // Graceful offline fallback
      document.querySelectorAll('[data-beach-badge]').forEach(el => {
        el.textContent = 'Live waves: View conditions tool ↗';
        el.style.opacity = '0.85';
      });
    }
  }

  applyFilters();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMap();
      loadLiveWaveConditions();
    }, { once: true });
  } else {
    initMap();
    loadLiveWaveConditions();
  }
})();
