'use strict';
(() => {
  const API = '/api/rocket-launch-usa';
  const $ = id => document.getElementById(id);
  const validRegions = new Set(['california', 'florida', 'texas', 'virginia', 'alaska', 'hawaii']);
  const state = { request: 0, data: null, map: null, markers: new Map(), regions: [], userFocusedMap: false };
  const el = (tag, className, value) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value !== undefined && value !== null) n.textContent = String(value);
    return n;
  };
  const set = (id, value) => { const n = $(id); if (n) n.textContent = value ?? '—'; };
  const safeUrl = url => typeof url === 'string' &&
    (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(url) || /^\/(?!\/)/.test(url));
  const anchor = (url, label, className) => {
    if (!safeUrl(url)) return null;
    const a = el('a', className, label);
    a.href = url;
    if (/^https:\/\//.test(url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  };
  const stamp = iso => {
    const d = new Date(iso || '');
    return Number.isNaN(+d) ? 'Not available' :
      d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  };
  function formattedDate(l, zone) {
    const d = new Date(l?.net || '');
    if (Number.isNaN(+d)) return 'Date not announced';
    const precision = l?.netPrecision;
    const year = () => new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).format(d);
    if (precision === 'year') return year();
    if (precision === 'month') return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    const timeZone = ['day', 'date-tbd'].includes(precision) ? 'UTC' : zone || 'UTC';
    return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  }
  function formattedTime(l, zone) {
    const d = new Date(l?.net || '');
    if (Number.isNaN(+d)) return 'Time unverified';
    const p = l?.netPrecision;
    if (!['minute', 'second', 'hour'].includes(p)) return 'Launch time TBD';
    const t = new Intl.DateTimeFormat('en-US', {
      timeZone: zone || 'UTC', hour: 'numeric',
      minute: p === 'hour' ? undefined : '2-digit', timeZoneName: 'short'
    }).format(d);
    return p === 'hour' ? 'Approx. ' + t : t;
  }
  function chip(n, label, stateName) {
    n.textContent = label || 'Unverified';
    n.dataset.state = stateName || 'unknown';
  }
  function board() {
    const root = $('rl-national-board');
    if (!root || !state.data) return;
    root.replaceChildren();
    for (const r of state.data.regions || []) {
      const card = el('article', 'rl-board-card');
      const head = el('div', 'rl-board-header');
      const name = el('h3', '', r.name);
      name.appendChild(el('small', '', r.subtitle));
      head.append(name, el('span', 'rl-board-count',
        r.feedState === 'unavailable' ? 'Feed unavailable' : r.launches.length + ' listed'));
      card.appendChild(head);
      const launches = (r.launches || []).slice(0, 2);
      if (launches.length) launches.forEach(l => {
        const item = el('div', 'rl-board-item');
        item.appendChild(el('strong', '', l.name || 'Upcoming mission'));
        item.appendChild(el('span', '', formattedDate(l, r.timezone) +
          ' · ' + formattedTime(l, r.timezone) + ' · ' + (l.scheduleConfidence?.label || 'Timing unconfirmed')));
        card.appendChild(item);
      });
      else card.appendChild(el('p', 'rl-board-empty',
        r.feedState === 'unavailable' ?
          'The schedule service could not be checked for this region. Use the official range source.' :
          'No upcoming mission in this bounded schedule window. This is not a claim that the range has no operations.'));
      const button = el('button', '', 'Explore ' + r.name);
      button.type = 'button';
      button.addEventListener('click', () => changeRegion(r.id, true));
      card.appendChild(button);
      root.appendChild(card);
    }
  }
  function sourceLinks(r) {
    const root = $('rl-region-links');
    if (!root) return;
    root.replaceChildren();
    const links = [
      [r.authority, 'Official launch notices'],
      [r.access, 'Viewing and access rules']
    ];
    if (r.specialist) links.unshift([r.specialist, 'Florida detailed viewer']);
    for (const [url, title] of links) {
      const a = anchor(url, title);
      if (a) root.appendChild(a);
    }
  }
  function showRegion(r) {
    set('rl-region-name', r.name);
    set('rl-region-description', r.description);
    set('rl-region-coast', r.coast);
    set('rl-region-timezone', r.timezone.replace(/_/g, ' '));
    const match = state.data.regions.find(x => x.id === r.id);
    set('rl-region-count', match?.feedState === 'unavailable' ? 'Feed offline' :
      (match?.launches?.length ?? 0) + (match?.feedTruncated ? '+ listed' : ' listed'));
    sourceLinks(r);
    for (const button of document.querySelectorAll('.rl-region-btn[data-region]')) {
      button.setAttribute('aria-pressed', button.dataset.region === r.id ? 'true' : 'false');
    }
    if (state.map && state.markers.has(r.id)) {
      for (const [id, circle] of state.markers) circle.setStyle({
        radius: id === r.id ? 12 : 8,
        fillColor: id === r.id ? '#dc754c' : '#163f4b',
        color: '#fff', weight: id === r.id ? 3 : 2, fillOpacity: 1
      });
      if (state.userFocusedMap) state.map.setView([match.lat, match.lon], r.id === 'hawaii' || r.id === 'alaska' ? 7 : 8, { animate: false });
    }
  }
  function initMap() {
    if (state.map || !window.L || !$('rl-coast-map') || !state.data?.regions?.length) return;
    const root = $('rl-coast-map');
    root.replaceChildren();
    try {
      const map = window.L.map(root, { scrollWheelZoom: false, zoomControl: true, preferCanvas: true });
      const osmCredit = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      // Never request a keyless CARTO tile: as of 2026 those tiles return
      // an "API KEY REQUIRED" watermark even though the HTTP response is 200.
      // Start with a working fallback, then replace it only after a keyed tile loads.
      const osm = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: osmCredit
      }).addTo(map);
      root.dataset.tiles = 'osm-fallback';
      fetch('/api/carto-basemap-config', { credentials: 'same-origin', signal: AbortSignal.timeout(6500) })
        .then(response => response.ok ? response.json() : null)
        .then(config => {
          if (config?.provider !== 'CARTO' || typeof config.key !== 'string' || !config.key.trim()) return;
          const keyedUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' +
            encodeURIComponent(config.key.trim());
          const carto = window.L.tileLayer(keyedUrl, {
            subdomains: 'abcd', maxZoom: 19,
            attribution: osmCredit + ' &copy; <a href="https://carto.com/attributions">CARTO</a>'
          });
          let confirmed = false, errors = 0;
          carto.on('tileload', () => {
            if (!confirmed && map.hasLayer(carto)) {
              confirmed = true;
              root.dataset.tiles = 'carto-keyed';
              if (map.hasLayer(osm)) map.removeLayer(osm);
            }
          });
          carto.on('tileerror', () => {
            if (++errors >= 2 && !confirmed) {
              if (map.hasLayer(carto)) map.removeLayer(carto);
              if (!map.hasLayer(osm)) osm.addTo(map);
              root.dataset.tiles = 'osm-fallback';
            }
          });
          carto.addTo(map);
        })
        .catch(() => { root.dataset.tiles = 'osm-fallback'; });
      const bounds = [];
      for (const r of state.data.regions) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
        const circle = window.L.circleMarker([r.lat, r.lon], {
          radius: 8, fillColor: '#163f4b', fillOpacity: 1, color: '#fff', weight: 2
        }).addTo(map);
        circle.bindTooltip(r.name + ' · ' + r.coast, { direction: 'top' });
        circle.on('click', () => changeRegion(r.id));
        state.markers.set(r.id, circle);
        bounds.push([r.lat, r.lon]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [27, 27] });
      state.map = map;
    } catch (_) {
      root.replaceChildren(el('div', 'rl-map-fallback', 'Map tiles unavailable. The coast buttons above remain fully functional.'));
    }
  }
  function renderMission(data) {
    const launch = data.selectedLaunch;
    const zone = data.region.timezone;
    set('rl-mission-name', launch?.name || 'No upcoming launch in this regional feed');
    const c = launch?.scheduleConfidence;
    chip($('rl-schedule-grade'),
      c?.label || (data.coverage.partial ? 'Schedule partly unavailable' : 'Timing unverified'),
      c?.level || 'unknown');
    set('rl-date', launch ? formattedDate(launch, zone) : 'No confirmed date');
    set('rl-time', launch ? formattedTime(launch, zone) : 'Time not announced');
    set('rl-schedule-detail', c?.detail ||
      (data.coverage.partial ?
        'At least one provider query failed. The absence of a mission is not evidence that the region has no launch.' :
        'No scheduled launch was returned within this provider’s bounded upcoming sample.'));
    set('rl-pad', launch?.pad || 'Not announced');
    set('rl-rocket', launch?.rocket || 'Not announced');
    set('rl-schedule-updated', launch?.lastUpdated ? stamp(launch.lastUpdated) : 'Not provided');
    set('rl-national-next', data.nationalNext ?
      data.nationalNext.name + ' · ' + formattedDate(data.nationalNext,
        data.regions.find(r => r.id === data.nationalNext.region)?.timezone) :
      'No upcoming coastal mission verified');
    set('rl-feed-health', data.coverage.partial ? 'Partial schedule coverage' : 'Six coastal regions checked');
    set('rl-updated-at', stamp(data.generatedAt));
  }
  function renderSelector(data) {
    const select = $('rl-launch-select');
    if (!select) return;
    const match = data.regions.find(r => r.id === data.selectedRegion);
    select.replaceChildren();
    const launches = match?.launches || [];
    for (const l of launches) {
      const option = el('option', '',
        l.name + ' · ' + formattedDate(l, match.timezone) +
        (['minute', 'second', 'hour'].includes(l.netPrecision) ?
          ' · ' + formattedTime(l, match.timezone) : ' · time TBD'));
      option.value = l.id;
      select.appendChild(option);
    }
    if (!launches.length) {
      const o = el('option', '', 'No current launch in this feed');
      o.value = '';
      select.appendChild(o);
    }
    select.disabled = !launches.length;
    if (data.selectedLaunchId) select.value = data.selectedLaunchId;
  }
  function renderAccess(data) {
    const access = data.access || {};
    const sites = $('rl-sites');
    if (sites) {
      sites.replaceChildren();
      for (const s of access.sites || []) {
        const card = el('article', 'rl-site-card');
        card.dataset.state = s.state || 'verify';
        card.appendChild(el('span', 'rl-site-kicker', s.bestFor || 'Viewing area'));
        card.appendChild(el('h3', '', s.name));
        card.appendChild(el('span', 'rl-site-status', s.label || 'Access must be checked'));
        card.appendChild(el('p', '', s.reason || 'Access conditions have not been confirmed for this launch.'));
        const actions = el('div', 'rl-site-actions');
        const source = anchor(s.source, s.kind === 'specialist' ? 'Open Florida decision engine' : 'Official / operator source', 'rl-mainlink');
        if (source) actions.appendChild(source);
        if (s.directionsAllowed && s.address && s.state !== 'restricted' && s.state !== 'hours') {
          const directions = anchor('https://www.google.com/maps/search/?api=1&query=' +
            encodeURIComponent(s.address), 'Map location · verify entry');
          if (directions) actions.appendChild(directions);
        }
        card.appendChild(actions);
        sites.appendChild(card);
      }
    }
    chip($('rl-access-grade'),
      data.region.id === 'florida' ? 'Open Florida detail engine' :
      data.region.id === 'alaska' || data.region.id === 'hawaii' ?
        'No public launch access verified' : 'Access requires confirmation',
      data.region.id === 'alaska' || data.region.id === 'hawaii' ? 'restricted' : 'unknown');
    set('rl-access-summary', access.guidance ||
      'Viewing and access guidance is not verified. Use the range’s official notice.');
    const notice = $('rl-official-notice');
    const live = access.liveOfficialNotice;
    if (notice) {
      notice.replaceChildren();
      if (live && data.region.id === 'texas') {
        notice.hidden = false;
        notice.dataset.state = live.state === 'closed' ? 'closed' :
          live.roadState === 'advisory' ? 'advisory' : 'unknown';
        const status = live.state === 'closed' ? 'Boca Chica Beach: closed on official site' :
          live.state === 'open-general' ? 'Boca Chica Beach: generally open on official site' :
          'Boca Chica Beach status unverified';
        notice.appendChild(el('strong', '', status));
        notice.appendChild(el('div', '',
          (live.roadState === 'advisory' ? 'Current road notice: ' + (live.description || 'Road advisory reported.') + '. ' : '') +
          'A currently open beach is not approval to enter a launch exclusion zone.'));
        notice.appendChild(el('div', '', 'Published page checked ' + stamp(live.checkedAt)));
        const a = anchor(live.url, 'Read official Starbase beach and road notices');
        if (a) notice.appendChild(a);
      } else notice.hidden = true;
    }
  }
  function renderWeather(data) {
    const weather = data.weather || {};
    const root = $('rl-regional-sky');
    if (!root) return;
    root.replaceChildren();
    const wrap = el('div', 'rl-sky-head');
    const info = el('div');
    info.appendChild(el('h3', '', weather.label || 'Viewing sky unverified'));
    info.appendChild(el('p', '', weather.detail || 'No launch-time conditions are available.'));
    wrap.appendChild(info);
    const weatherSource = anchor('https://www.weather.gov/', 'NWS source');
    if (weatherSource) wrap.appendChild(weatherSource);
    root.appendChild(wrap);
    const places = weather.places || [];
    if (places.length) {
      const grid = el('div', 'rl-sky-grid');
      for (const p of places) {
        const card = el('article', 'rl-sky-place');
        card.appendChild(el('span', 'rl-site-kicker', 'Spectator location'));
        card.appendChild(el('strong', '', p.name));
        card.appendChild(el('p', '', p.assessment?.label || 'NWS conditions unavailable'));
        card.appendChild(el('strong', '',
          p.cloudStatus === 'ok' && Number.isInteger(p.cloudCoverPercent) ?
            p.cloudCoverPercent + '% forecast cloud cover' : 'Cloud percentage unknown'));
        card.appendChild(el('p', '', p.period?.shortForecast ?
          'NWS: ' + p.period.shortForecast + '. ' + (p.assessment?.detail || '') :
          'No complete hourly forecast for this launch time.'));
        grid.appendChild(card);
      }
      root.appendChild(grid);
    }
    const compare = weather.comparison;
    if (compare) {
      const block = el('div', 'rl-sky-comparison');
      block.appendChild(el('strong', '', compare.label || 'Comparison unknown'));
      block.appendChild(el('p', '', compare.detail || 'No reliable comparison is available.'));
      root.appendChild(block);
    }
    chip($('rl-weather-grade'),
      weather.level === 'assessed' ? 'NWS forecast checked' :
      weather.level === 'partial' ? 'Incomplete weather evidence' : 'No exact-time sky verdict',
      weather.level === 'assessed' ? 'candidate' : 'unknown');
    set('rl-weather-summary', compare?.detail || weather.detail ||
      'A precise launch time inside the forecast horizon is required.');
  }
  function syncUrl(r, l) {
    const url = new URL(location.href);
    if (r && validRegions.has(r)) url.searchParams.set('region', r);
    else url.searchParams.delete('region');
    if (l && /^[0-9a-f-]{36}$/i.test(l)) url.searchParams.set('launchId', l);
    else url.searchParams.delete('launchId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function render(data) {
    state.data = data;
    state.regions = data.regions || [];
    initMap();
    showRegion(data.region);
    renderMission(data);
    renderSelector(data);
    renderAccess(data);
    renderWeather(data);
    board();
    const coverage = data.coverage || {};
    set('rl-schedule-coverage',
      'Source: Launch Library 2, checked ' + stamp(data.generatedAt) +
      '. Two bounded queries across seven launch location IDs. ' +
      (coverage.partial ? 'One or more queries were unavailable; some regions may show incomplete results. ' : '') +
      'This does not include every sounding rocket, military range test or far-future mission. Read each range’s official notice before traveling.');
  }
  async function load(region, launchId) {
    const sequence = ++state.request;
    const params = new URLSearchParams();
    if (region && validRegions.has(region)) params.set('region', region);
    if (launchId) params.set('launchId', launchId);
    const url = API + (params.size ? '?' + params.toString() : '');
    $('rl-launch-select').disabled = true;
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (sequence !== state.request) return;
      if (!response.ok || !data.ok) throw new Error(data.error || 'Launch data unavailable');
      render(data);
      syncUrl(data.selectedRegion, data.selectedLaunchId);
    } catch (err) {
      if (sequence !== state.request) return;
      chip($('rl-schedule-grade'), 'Schedule temporarily unavailable', 'unknown');
      chip($('rl-access-grade'), 'Official access must be checked', 'unknown');
      chip($('rl-weather-grade'), 'No current forecast', 'unknown');
      set('rl-schedule-detail', 'The national launch feed could not be verified right now. Check the launch operator and range authorities before planning travel.');
      set('rl-national-next', 'Live schedule unavailable');
      set('rl-feed-health', 'Source check failed');
      set('rl-updated-at', 'Not verified');
      set('rl-schedule-coverage', err.message + ' Official NASA and launch-range pages linked below remain the primary authority.');
      const root = $('rl-national-board');
      if (root && !state.data) root.textContent = 'National provider temporarily unavailable. Recheck the official NASA, Space Force, Starbase and Alaska Aerospace launch notices.';
      $('rl-launch-select').disabled = true;
    }
  }
  function changeRegion(region, scroll) {
    if (!validRegions.has(region)) return;
    state.userFocusedMap = true;
    load(region);
    if (scroll) $('choose-coast')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('.rl-region-btn[data-region]').forEach(b =>
    b.addEventListener('click', () => changeRegion(b.dataset.region)));
  $('rl-launch-select')?.addEventListener('change', event => {
    const id = event.target.value;
    if (id) load(state.data?.selectedRegion, id);
  });
  const initial = new URL(location.href);
  const region = validRegions.has(initial.searchParams.get('region')) ?
    initial.searchParams.get('region') : null;
  state.userFocusedMap = Boolean(region);
  const launch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    initial.searchParams.get('launchId') || '') ? initial.searchParams.get('launchId') : null;
  load(region, launch);
})();
