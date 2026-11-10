'use strict';
(() => {
  const API = '/api/rocket-launch-usa';
  const OFFICIAL_EVIDENCE_API = '/api/rocket-official-notices';
  const KSC_OFFICIAL_API = '/api/space-coast-ksc-watch';
  const $ = id => document.getElementById(id);
  const validRegions = new Set(['california', 'florida', 'texas', 'virginia', 'alaska', 'hawaii']);
  const state = { request: 0, data: null, scheduleFailed: false, map: null, markers: new Map(), rocketPins: null, regions: [], userFocusedMap: false, officialEvidence: null, officialEvidenceLoaded: false, kscEvidence: null, kscMissionId: null, kscRequest: 0, floridaEvidence: null, floridaRequest: 0, floridaController: null };
  const el = (tag, className, value) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value !== undefined && value !== null) n.textContent = String(value);
    return n;
  };
  const set = (id, value) => { const n = $(id); if (n) n.textContent = value ?? '—'; };
  function updateAtlasStatus(){
    const offline=$('rl-coast-map')?.dataset.tiles==='reference-only';
    const prefix=offline?'The map background isn’t loading; coastlines are shown instead. ':'';
    const message=state.scheduleFailed?
      'The launch calendar isn’t loading, but you can still browse the launch sites.':
      state.data?
        'Region circles are references, not public entrances. Rocket icons reflect the selected schedule source.':
        'Reference launch regions. Checking mission data.';
    set('rl-atlas-status',prefix+message);
  }

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
        r.feedState === 'unavailable' ? 'Schedule unavailable' : r.launches.length + ' listed'));
      card.appendChild(head);
      const launches = (r.launches || []).slice(0, 2);
      if (launches.length) launches.forEach(l => {
        const item = el('div', 'rl-board-item');
        item.appendChild(el('strong', '', l.name || 'Next flight'));
        item.appendChild(el('span', '', formattedDate(l, r.timezone) +
          ' · ' + formattedTime(l, r.timezone) + ' · ' + (l.scheduleConfidence?.label || 'Time not confirmed')));
        const locate=el('button','rl-map-locate','Find the pad on the map');
        locate.type='button';
        locate.dataset.region=r.id;
        locate.dataset.launchId=l.id;
        locate.setAttribute('aria-label','Show launch location for '+(l.name||'this mission'));
        locate.addEventListener('click',()=>{
          state.userFocusedMap=true;void load(r.id,l.id);
          $('rl-coast-map')?.scrollIntoView({behavior:'smooth',block:'nearest'});
        });
        item.appendChild(locate);
        card.appendChild(item);
      });
      else card.appendChild(el('p', 'rl-board-empty',
        r.feedState === 'unavailable' ?
          'We couldn’t refresh this region’s launch calendar. Check the official range announcements.' :
          'No upcoming launch listed here right now. Smaller research and military flights may be announced elsewhere.'));
      const button = el('button', '', 'Explore ' + r.name);
      button.type = 'button';
      button.addEventListener('click', () => changeRegion(r.id, true, 'national_board'));
      card.appendChild(button);
      root.appendChild(card);
    }
  }
  // Schedule-first visitor surface. Use the SAME bounded national snapshot and
  // mission selection pipeline as the decision desk, never a second feed.
  const frontFilters = { query: '', region: 'all', window: 'all', next: null };
  const visitorZone = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch { return 'UTC'; }
  })();
  const targetIsPrecise = launch => ['minute', 'second'].includes(launch?.netPrecision) &&
    Number.isFinite(Date.parse(launch?.net || ''));
  function frontSelectMission(region, launchId, surface = 'schedule_roster') {
    if (!state.data?.regions?.some(r => r.id === region &&
      (r.launches || []).some(l => l.id === launchId))) return;
    document.dispatchEvent(new CustomEvent('rocket-experience:choose',
      { detail: { region, launchId, surface } }));
    // The roster promises a viewing plan; land on actual named places,
    // not an introductory panel that makes visitors hunt for the answer.
    ($('rl-access-decision') || $('rl-flight-desk'))?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }
  function renderFrontCountdown() {
    const node = $('rl-front-countdown-value');
    if (!node) return;
    const launch = frontFilters.next;
    if (!launch || !targetIsPrecise(launch) || state.data?.scheduleFreshness === 'stale' ||
      launch.sourceStale === true) {
      node.textContent = launch ? 'Exact launch time not announced' : 'Liftoff time not listed';
      return;
    }
    const ms = Date.parse(launch.net) - Date.now();
    if (ms <= 0) {
      node.textContent = 'Target time has passed · check launch status';
      return;
    }
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    node.textContent = [days + 'd', String(hours).padStart(2, '0') + 'h',
      String(minutes).padStart(2, '0') + 'm', String(secs).padStart(2, '0') + 's'].join('  :  ');
  }
  function renderFrontSchedule(data) {
    const list = $('rl-front-launch-list');
    if (!list) return;
    list.replaceChildren();
    const regions = data?.regions || [];
    const all = regions.flatMap(r => (r.launches || []).filter(l => l && l.id).map(l => ({ l, r })));
    const byDate = (a, b) => {
      const da = Date.parse(a.l.net || '');
      const db = Date.parse(b.l.net || '');
      return (Number.isFinite(da) ? da : Infinity) -
        (Number.isFinite(db) ? db : Infinity);
    };
    all.sort(byDate);
    const nextRegion = regions.find(r => r.id === data?.nationalNext?.region);
    const featured = (data?.nationalNext && nextRegion)
      ? { l: data.nationalNext, r: nextRegion }
      : all[0] || null;
    frontFilters.next = featured?.l || null;
    set('rl-front-timezone', 'Launch times shown in your local zone · ' + visitorZone.replace(/_/g, ' '));
    set('rl-front-feature-region', featured?.r.name || 'Choose a launch');
    set('rl-front-feature-vehicle', featured?.l.rocket || 'Launch schedule');
    set('rl-front-next-title', featured?.l.name || (data ? 'No upcoming launches listed' : 'Launch calendar unavailable'));
    set('rl-front-feature-pad', featured?.l.pad || 'Launch pad not announced');
    set('rl-front-feature-date', featured ? formattedDate(featured.l, visitorZone) : 'Date not announced');
    set('rl-front-feature-clock', featured ? formattedTime(featured.l, visitorZone) : 'Time unavailable');
    const stale = data?.scheduleFreshness === 'stale' || featured?.l.sourceStale === true;
    set('rl-front-feature-precision', !data ?
      'We can’t refresh the launch calendar right now. Check with the launch operator.' :
      stale ? 'This launch listing may be out of date. Check the latest update from the operator.' :
      featured ? (featured.l.scheduleConfidence?.label || 'Current listed launch target') +
        ' · The countdown and viewing conditions may change.' :
        'No upcoming flight listed here. Check the launch range for other announcements.');
    const featureButton = $('rl-front-feature-action');
    if (featureButton) {
      featureButton.disabled = !featured || !data;
      featureButton.onclick = featured && data ?
        () => frontSelectMission(featured.r.id, featured.l.id, 'next_launch') : null;
    }
    renderFrontCountdown();
    const q = frontFilters.query.trim().toLocaleLowerCase();
    const tenDays = Date.now() + 10 * 86400000;
    const filtered = all.filter(({ l, r }) => {
      if (frontFilters.region !== 'all' && r.id !== frontFilters.region) return false;
      if (q && ![l.name, l.rocket, l.pad, r.name, r.subtitle]
        .some(v => String(v || '').toLocaleLowerCase().includes(q))) return false;
      if (frontFilters.window === '10') {
        const net = Date.parse(l.net || '');
        if (!Number.isFinite(net) || net < Date.now() - 60000 || net > tenDays ||
          !['minute', 'second', 'hour', 'day'].includes(l.netPrecision)) return false;
      }
      return true;
    });
    if (!data) {
      list.appendChild(el('p', 'rl-front-wait',
        'Our launch calendar isn’t responding right now. Check the official operator before making plans.'));
    } else if (!filtered.length) {
      list.appendChild(el('p', 'rl-front-wait', all.length ?
        'No launches match that search. Try another coast or a longer date range.' :
        'No upcoming launches are showing right now. Smaller research or military flights may still be planned.'));
    } else {
      filtered.slice(0, 10).forEach(({ l, r }) => {
        const item = el('button', 'rl-front-mission');
        item.type = 'button';
        item.dataset.selected = String(data.selectedLaunchId === l.id && data.selectedRegion === r.id);
        const when = el('span', 'rl-front-mission-date');
        when.appendChild(el('strong', '', formattedDate(l, visitorZone)));
        when.appendChild(el('small', '', formattedTime(l, visitorZone)));
        const body = el('span', 'rl-front-mission-copy');
        body.appendChild(el('span', 'rl-front-mission-region', r.name + ' / ' + (l.rocket || 'Rocket not named')));
        body.appendChild(el('strong', 'rl-front-mission-name', l.name || 'Mission name not announced'));
        body.appendChild(el('small', '', (l.pad || 'Pad not announced') + ' · ' +
          (l.scheduleConfidence?.label || 'Time not confirmed')));
        item.append(when, body, el('span', 'rl-front-mission-arrow', '↗'));
        item.setAttribute('aria-label', 'Plan viewing for ' + (l.name || 'this launch') +
          ' from ' + r.name + ', ' + formattedDate(l, visitorZone));
        item.addEventListener('click', () => frontSelectMission(r.id, l.id));
        list.appendChild(item);
      });
    }
    set('rl-front-result-count', data ?
      'Showing ' + Math.min(filtered.length, 10) + ' of ' + filtered.length +
      ' matching launches' : 'Launch calendar unavailable');
    set('rl-front-source-status', data ?
      (data?.coverage?.partial ? 'Some flights may be missing · ' : '') +
      (data?.scheduleFreshness === 'stale' ? 'Calendar last checked earlier · ' : '') +
      'Observed ' + stamp(data.scheduleCheckedAt) : 'Check the launch operator for the latest word');
  }
  $('rl-front-search-input')?.addEventListener('input', event => {
    frontFilters.query = event.target.value;
    renderFrontSchedule(state.data);
  });
  $('rl-front-region-filter')?.addEventListener('change', event => {
    frontFilters.region = event.target.value;
    renderFrontSchedule(state.data);
  });
  document.querySelectorAll('.rl-front-window [data-window]').forEach(button => {
    button.addEventListener('click', () => {
      frontFilters.window = button.dataset.window;
      document.querySelectorAll('.rl-front-window [data-window]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.window === frontFilters.window)));
      renderFrontSchedule(state.data);
    });
  });
  // A timer updates display only. It never changes published schedules or
  // declares launch GO; it stops implying a live countdown after the target.
  window.setInterval(renderFrontCountdown, 1000);

  function floridaSpecialistLink(url, data = state.data) {
    if (typeof url !== 'string') return url;
    const region = url.startsWith('/national-tools/space-coast-launch/')?'florida':
      url.startsWith('/starbase-rocket-launch-viewing/')?'texas':
      url.startsWith('/wallops-rocket-launch-viewing/')?'virginia':
      url.startsWith('/kodiak-rocket-launch-viewing/')?'alaska':
      url.startsWith('/barking-sands-rocket-launch-viewing/')?'hawaii':
      url.startsWith('/vandenberg-rocket-launch-viewing/')?'california':null;
    if (!region) return url;
    const selected = data?.selectedRegion === region ? data.selectedLaunchId : null;
    return selected && /^[0-9a-f-]{36}$/i.test(selected) ?
      url + '?launchId=' + encodeURIComponent(selected) : url;
  }
  function sourceLinks(r) {
    const root = $('rl-region-links');
    if (!root) return;
    root.replaceChildren();
    const links = [
      [r.authority, 'Latest launch announcements'],
      [r.access, 'Viewing rules and closures']
    ];
    if (r.specialist) links.unshift([floridaSpecialistLink(r.specialist),
      r.id === 'texas' ? 'Starbase viewing map for this launch' :
      r.id === 'virginia' ? 'Wallops viewing spots for this launch' :
      r.id === 'alaska' ? 'Kodiak launch access guide' :
      r.id === 'hawaii' ? 'Barking Sands access guide' :
      r.id === 'california' ? 'Vandenberg viewing spots for this launch' :
      'Florida launch viewing guide']);
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
    set('rl-region-count', match?.feedState === 'unavailable' ? 'Calendar unavailable' :
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
      if (state.userFocusedMap) {
        state.map.setView([match.lat, match.lon], r.id === 'hawaii' || r.id === 'alaska' ? 7 : 8, { animate: false });
        state.rocketPins?.focusSelected();
      }
    }
  }
  function mountMapTouchControls(map, root) {
    const wrap=$('rl-map-wrap'),toggle=$('rl-map-expand'),details=$('rl-map-details');
    if(!wrap||!toggle)return;
    let expanded=false;
    const updateZoom=()=>{root.dataset.zoom=String(map.getZoom());};
    map.on('zoomend',updateZoom);
    updateZoom();
    const resize=()=>requestAnimationFrame(()=>map.invalidateSize({pan:false,animate:false}));
    function setExpanded(next){
      if(expanded===next)return;
      expanded=next;
      wrap.dataset.expanded=String(expanded);
      document.documentElement.classList.toggle('rl-map-fullscreen',expanded);
      toggle.textContent=expanded?'Close map':'Expand map';
      toggle.setAttribute('aria-expanded',String(expanded));
      toggle.setAttribute('aria-label',expanded?'Close full-screen map':'Expand map for easier zooming');
      resize();
    }
    toggle.disabled=false;
    toggle.setAttribute('aria-label','Expand map for easier zooming');
    toggle.addEventListener('click',()=>setExpanded(!expanded));
    document.addEventListener('keydown',event=>{
      if(expanded&&event.key==='Escape'){
        event.preventDefault();
        setExpanded(false);
        toggle.focus({preventScroll:true});
      }
    });
    details?.addEventListener('click',()=>setExpanded(false));
    window.addEventListener('pagehide',()=>setExpanded(false));
  }
  // The six geographic bounds already used by the Rocket pins provide a
  // source-independent regional atlas. They never invent a mission, pad or
  // viewing entrance when the launch-schedule API is unavailable.
  function referenceMapRegions(){
    const boxes=window.RocketMapPins?.BOX||{};
    return [...validRegions].map(id=>{
      const bounds=boxes[id];
      if(!Array.isArray(bounds)||bounds.length!==4||
         !bounds.every(Number.isFinite))return null;
      const button=document.querySelector('.rl-region-btn[data-region="'+id+'"]');
      return {
        id,lat:(bounds[0]+bounds[1])/2,lon:(bounds[2]+bounds[3])/2,
        name:button?.querySelector('small')?.textContent?.trim()||id,
        coast:button?.querySelector('span')?.textContent?.trim()||'Coastal range'
      };
    }).filter(Boolean);
  }
  function initMap() {
    const root=$('rl-coast-map');
    if(state.map||!root)return;
    const regions=state.data?.regions?.length?state.data.regions:referenceMapRegions();
    if(!window.L?.map){
      root.dataset.mapState='unavailable';
      root.replaceChildren(el('div','rl-map-fallback',
        'The interactive map could not start. Use the coast buttons above while the map library is unavailable.'));
      return;
    }
    root.replaceChildren();
    root.dataset.mapState='initializing';
    try {
      const map = window.L.map(root, { scrollWheelZoom: false, zoomControl: true, preferCanvas: true, touchZoom: true, dragging: true, bounceAtZoomLimits: false, tapHold: false });
      // Public-domain Natural Earth 1:110m coastline backup. It sits *behind*
      // live raster tiles, cannot accept clicks, and contains no invented pads
      // or visitor directions. When OSM/CARTO is blocked, a geographic map
      // still appears instead of an empty gray canvas.
      const referencePane=map.createPane('rocket-reference-land');
      referencePane.style.zIndex='180'; // Leaflet tile pane is z-index 200.
      referencePane.style.pointerEvents='none';
      fetch('/assets/rocket-reference-land.geojson',{
        cache:'force-cache',signal:AbortSignal.timeout(8000)
      }).then(response=>{
        if(!response.ok)throw new Error('reference-geography-unavailable');
        return response.json();
      }).then(geo=>{
        if(geo?.type!=='FeatureCollection'||!Array.isArray(geo.features)||
           !geo.features.length)throw new Error('invalid-reference-geography');
        // Explicit SVG: the mission pins prefer Canvas, but the coastline
        // needs its own deterministic under-tile vector renderer.
        const outlineRenderer=window.L.svg({pane:'rocket-reference-land'});
        window.L.geoJSON(geo,{
          renderer:outlineRenderer,pane:'rocket-reference-land',interactive:false,
          style:{color:'#719993',weight:1.3,opacity:1,
            fillColor:'#eef0e2',fillOpacity:1}
        }).addTo(map);
        root.dataset.outline='ready';
        updateAtlasStatus();
      }).catch(()=>{root.dataset.outline='unavailable';});
      const osmCredit = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      // Never request a keyless CARTO tile: as of 2026 those tiles return
      // an "API KEY REQUIRED" watermark even though the HTTP response is 200.
      // Start with a working fallback, then replace it only after a keyed tile loads.
      const osm = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: osmCredit
      }).addTo(map);
      root.dataset.tiles = 'osm-fallback';
      let osmLoaded=false,osmErrors=0;
      osm.on('tileload',()=>{
        osmLoaded=true;
        if(root.dataset.tiles!=='carto-keyed'){
          root.dataset.tiles='osm-fallback';
          updateAtlasStatus();
        }
      });
      osm.on('tileerror',()=>{
        if(++osmErrors>=2&&!osmLoaded&&root.dataset.tiles!=='carto-keyed'){
          root.dataset.tiles='reference-only';
          updateAtlasStatus();
        }
      });
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
              updateAtlasStatus();
              if (map.hasLayer(osm)) map.removeLayer(osm);
            }
          });
          carto.on('tileerror', () => {
            if (++errors >= 2 && !confirmed) {
              if (map.hasLayer(carto)) map.removeLayer(carto);
              if (!map.hasLayer(osm)) osm.addTo(map);
              root.dataset.tiles = osmLoaded?'osm-fallback':'reference-only';
              updateAtlasStatus();
            }
          });
          carto.addTo(map);
        })
        .catch(() => { if(root.dataset.tiles!=='reference-only')root.dataset.tiles='osm-fallback';updateAtlasStatus(); });
      const bounds = [];
      for (const r of regions) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
        const circle = window.L.circleMarker([r.lat, r.lon], {
          radius: 8, fillColor: '#163f4b', fillOpacity: 1, color: '#fff', weight: 2
        }).addTo(map);
        circle.bindTooltip(r.name + ' · ' + r.coast, { direction: 'top' });
        circle.on('click', () => changeRegion(r.id, false, 'region_map'));
        state.markers.set(r.id, circle);
        bounds.push([r.lat, r.lon]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [27, 27] });
      else map.setView([38,-98],3,{animate:false});
      state.map = map;
      mountMapTouchControls(map,root);
      state.rocketPins=window.RocketMapPins?.mount(map,{
        region:'all',
        centers:window.RocketMapPins.centersOf(regions),
        onSelect:(id,region)=>{
          document.dispatchEvent(new CustomEvent('rocket-experience:map-choose',{detail:{launchId:id,region}}));
          state.userFocusedMap=true;void load(region,id);
          // Never steal page scroll during a map tap or pinch; the explicit
          // 'View mission details' link below the map handles navigation.
        }
      });
      state.rocketPins?.update(state.data?.regions?.flatMap(r=>r.launches||[])||[],state.data?.selectedLaunchId||null);
      root.dataset.mapState='ready';
      updateAtlasStatus();
    } catch (_) {
      root.dataset.mapState='unavailable';
      state.map=null;
      state.rocketPins=null;
      $('rl-map-expand')?.setAttribute('disabled','');
      root.replaceChildren(el('div','rl-map-fallback',
        'The map isn’t loading. Choose a coast above to see its launches and viewing options.'));
    }
  }
  function renderMission(data) {
    const launch = data.selectedLaunch;
    const zone = data.region.timezone;
    set('rl-mission-name', launch?.name || 'No upcoming flights listed for this coast');
    const c = launch?.scheduleConfidence;
    const sourceStale=data.scheduleFreshness==='stale'||launch?.sourceStale===true;
    chip($('rl-schedule-grade'),
      sourceStale?'Launch time may be out of date':
        c?.label || (data.coverage.partial ? 'Some launches may be missing' : 'Launch time not confirmed'),
      sourceStale?'unknown':c?.level || 'unknown');
    set('rl-date', launch ? formattedDate(launch, zone) : 'Date not confirmed');
    set('rl-time', launch ? formattedTime(launch, zone) : 'Liftoff time not announced');
    set('rl-schedule-detail',
      (sourceStale?'This launch time hasn’t been checked recently. ':'')+
      (data.scheduleWarning?data.scheduleWarning+' ':'')+
      (c?.detail || (data.coverage.partial ?
        'Some public launch listings are unavailable right now; other flights may still be planned.' :
        'No upcoming flight is currently listed in this calendar.')));
    set('rl-pad', launch?.pad || 'Not announced');
    set('rl-rocket', launch?.rocket || 'Not announced');
    set('rl-schedule-updated', launch?.lastUpdated ? stamp(launch.lastUpdated) : 'Not provided');
    set('rl-national-next', data.nationalNext ?
      data.nationalNext.name + ' · ' + formattedDate(data.nationalNext,
        data.regions.find(r => r.id === data.nationalNext.region)?.timezone) :
      'No upcoming launch confirmed');
    set('rl-feed-health', data.coverage.partial ? 'Some launch calendars unavailable' : 'Six U.S. launch regions checked');
    set('rl-updated-at', data.scheduleCheckedAt?stamp(data.scheduleCheckedAt):'No recent calendar update');
  }

  // Static NASA catalog is built by an independently tested Python source review.
  // No NASA or launch-provider API requests are issued by the visitor’s browser.
  const VISUAL_CATALOG = '/national-tools/rocket-launch-live/visual-catalog.json';
  const FAMILY_ORDER = ['falcon-9', 'starship', 'vulcan', 'new-glenn'];
  const NASA_IMAGE = /^https:\/\/images-assets\.nasa\.gov\/image\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+~(?:small|medium|large|thumb)\.(?:jpg|jpeg|png|webp)$/i;
  const NASA_PAGE = /^https:\/\/images\.nasa\.gov\/details\/[A-Za-z0-9_-]+$/i;
  const NASA_CREDIT = /^NASA(?:\/|$)/i;
  function visualImageApproved(item) {
    return Boolean(item && typeof item.imageUrl==='string' && NASA_IMAGE.test(item.imageUrl) &&
      NASA_PAGE.test(item.sourceUrl||'') && typeof item.nasaId==='string' &&
      typeof item.credit==='string' && NASA_CREDIT.test(item.credit) &&
      !/spacex|blue origin|copyright|courtesy|licensed/i.test(item.credit));
  }
  function visualPhoto(host, item, fallback, size) {
    host.replaceChildren();
    if (!visualImageApproved(item)) {
      host.appendChild(el('div', 'rl-visual-unavailable', fallback));
      return;
    }
    const photo=el('img', 'rl-visual-image');
    photo.src=item.imageUrl;
    photo.alt='NASA archive: '+(item.title||item.nasaId||'Rocket or spacecraft photo')+
      '. Representative archival photo, not a current launch camera.';
    photo.loading='lazy';
    photo.decoding='async';
    photo.referrerPolicy='no-referrer';
    if(size==='small') {photo.width=360;photo.height=230;}
    else {photo.width=920;photo.height=550;}
    photo.addEventListener('error',()=>{
      host.replaceChildren(el('div','rl-visual-unavailable',
        'Archived photo could not be loaded. The NASA source record remains linked below.'));
    }, {once:true});
    host.appendChild(photo);
    host.appendChild(el('span','rl-visual-caption',
      'NASA archive · '+item.credit+' · representative image'));
  }
  function rocketFamily(launch) {
    const value=((launch?.rocket||'')+' '+(launch?.name||'')).toLowerCase();
    if (/\bfalcon\s*heavy\b/.test(value)) return null;
    if (/\bfalcon[\s-]*9\b/.test(value)) return 'falcon-9';
    if (/\bstarship\b|\bsuper[\s-]*heavy\b/.test(value)) return 'starship';
    if (/\bvulcan\b/.test(value)) return 'vulcan';
    if (/\bnew[\s-]*glenn\b/.test(value)) return 'new-glenn';
    return null;
  }
  function matchedPayload(launch,catalog) {
    const value=((launch?.mission||'')+' '+(launch?.name||'')).toLowerCase();
    const tokens=['escapade','imap','europa-clipper','psyche','pace'];
    for (const key of tokens) {
      if (!catalog?.payloads?.[key]) continue;
      const word=key.replace(/-/g,'[\\s-]*');
      if(new RegExp('(?:^|[^a-z0-9])'+word+'(?:$|[^a-z0-9])','i').test(value))
        return catalog.payloads[key];
    }
    return null;
  }
  function renderVisuals(data) {
    const rocketHost=$('rl-visual-rocket-photo');
    const payloadHost=$('rl-visual-payload-photo');
    if(!rocketHost||!payloadHost)return;
    const launch=data?.selectedLaunch;
    const catalog=state.visualCatalog;
    const family=rocketFamily(launch);
    const rocket=family?catalog?.rockets?.[family]:null;
    const payload=matchedPayload(launch,catalog);
    const rocketLinks=$('rl-visual-rocket-links');
    const payloadLinks=$('rl-visual-payload-links');
    rocketLinks.replaceChildren();payloadLinks.replaceChildren();
    if (!launch) {
      visualPhoto(rocketHost,null,'Select a launch to explore its rocket.');
      visualPhoto(payloadHost,null,'No payload selected yet.');
      set('rl-visual-rocket-title','Choose a mission to meet the vehicle');
      set('rl-visual-rocket-story','Rocket-family images are selected from independently credited NASA archive assets.');
      set('rl-visual-rocket-evidence','No mission-selected rocket match.');
      set('rl-visual-payload-title','Choose a mission to learn about its payload');
      set('rl-visual-payload-story','A mission label alone does not prove a NASA spacecraft-photo match.');
      set('rl-visual-payload-evidence','No payload image claim.');
    } else {
      set('rl-visual-rocket-title',rocket?.family||launch.rocket||'Rocket identity not announced');
      set('rl-visual-rocket-story',rocket?.summary||
        'This rocket has not yet been matched to a NASA-credited family image in the catalog.');
      set('rl-visual-rocket-evidence',visualImageApproved(rocket)?
        rocket.context+' Source: '+rocket.credit+'.':
        'No suitable NASA-credited vehicle photo has been cleared for this rocket. Do not substitute another type.');
      visualPhoto(rocketHost,rocket,'NASA-cleared rocket photo not available for this vehicle.');
      if(visualImageApproved(rocket)){
        const a=anchor(rocket.sourceUrl,'Photo and original NASA caption');if(a)rocketLinks.appendChild(a);
      }
      if(rocket?.operatorUrl){const a=anchor(rocket.operatorUrl,'Explore the vehicle at its operator');if(a)rocketLinks.appendChild(a);}
      const payloadName=launch.mission||launch.name?.split('|').slice(1).join('|').trim()||'Payload not yet identified';
      set('rl-visual-payload-title',payload?.name||payloadName);
      if(payload&&visualImageApproved(payload)){
        visualPhoto(payloadHost,payload,'NASA payload photo unavailable.');
        set('rl-visual-payload-story',payload.summary||'Mission spacecraft photographed by NASA.');
        set('rl-visual-payload-evidence',payload.context+' Credit: '+payload.credit+'.');
        const a=anchor(payload.sourceUrl,'Open this spacecraft photo at NASA');if(a)payloadLinks.appendChild(a);
      }else{
        visualPhoto(payloadHost,null,'No NASA-credited photo matched to this specific payload.');
        set('rl-visual-payload-story',
          'Launch Library identifies this mission, but an independently cleared NASA photo of its payload has not been matched. That is not evidence the payload lacks public imagery.');
        set('rl-visual-payload-evidence','Payload photography is not inferred from another mission or a similar satellite.');
        const operator=anchor(data?.mediaDesk?.operator?.url||data?.region?.authority,
          'Check operator or range for mission details');
        if(operator)payloadLinks.appendChild(operator);
      }
    }
    const gallery=$('rl-visual-family-gallery');
    if(!gallery)return;
    gallery.replaceChildren();
    for(const key of FAMILY_ORDER){
      const item=catalog?.rockets?.[key];
      if(!item)continue;
      const card=el('article','rl-visual-family-card');
      card.dataset.selected=family===key?'true':'false';
      const pic=el('div','rl-visual-family-photo');
      visualPhoto(pic,item,'NASA photo not cleared for '+item.family,'small');
      card.appendChild(pic);
      const copy=el('div','rl-visual-family-copy');
      copy.appendChild(el('strong','',item.family));
      copy.appendChild(el('span','',item.provider+' · '+(visualImageApproved(item)?
        'NASA-credited historical photo':'vehicle image awaiting clearance')));
      const a=anchor(visualImageApproved(item)?item.sourceUrl:item.operatorUrl,
        visualImageApproved(item)?'View NASA original':'Explore at operator');
      if(a)copy.appendChild(a);
      card.appendChild(copy);gallery.appendChild(card);
    }
    if(!catalog?.rockets)gallery.appendChild(el('p','rl-visual-unavailable',
      'The image catalog is unavailable; no unsourced rocket or payload photos are substituted.'));
  }
  async function loadVisualCatalog() {
    try {
      const response=await fetch(VISUAL_CATALOG,{credentials:'same-origin',cache:'force-cache',
        signal:AbortSignal.timeout(9000),headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('catalog not available');
      const parsed=await response.json();
      if(parsed?.schemaVersion!==1||!parsed?.rockets||!parsed?.payloads)
        throw new Error('unrecognized image catalog version');
      state.visualCatalog=parsed;
    }catch(_){state.visualCatalog=null;}
    if(state.data)renderVisuals(state.data);
  }

  // Reuse the exact LL2 mission’s sanitized media records from the shared collector.
  // These buttons never claim player health, pad alignment, range GO, or launch success.
  function renderMediaDesk(data) {
    const root = $('rl-watch-mission-videos');
    const general = $('rl-watch-general');
    if (!root || !general) return;
    root.replaceChildren();
    general.replaceChildren();
    const launch = data?.selectedLaunch;
    const desk = data?.mediaDesk;
    const matched = Boolean(launch?.id && desk?.launchId === launch.id);
    set('rl-watch-mission', launch?.name || 'Choose a launch to find its video');
    const current = matched && desk.sourceFreshness === 'recent' &&
      launch.sourceStale !== true && data.scheduleFreshness !== 'stale';
    set('rl-watch-status', !matched ? 'No video tied to this launch' :
      current ? 'Video listing recently checked' : 'Video links may be out of date');
    set('rl-watch-evidence', !matched ?
      'Choose a launch to look for its webcast. Operators sometimes post video links just before liftoff.' :
      (desk.missionVideoCount || 0) + ' video link(s) listed for this flight. ' +
      'Checked ' + stamp(desk.checkedAt) + '. ' +
      (current ? 'The video may not be live yet.' :
        'These links may have changed since the last update.') +
      ' A listing does not guarantee a live broadcast.');
    if (!matched) {
      root.appendChild(el('p', 'rl-watch-empty',
        'Select an upcoming launch to see any video links published for that mission.'));
      general.appendChild(el('p', 'rl-watch-empty',
        'Area cameras may show the spaceport, but not necessarily your rocket.'));
      return;
    }
    function videoCard(item, camera) {
      const card = el('article', 'rl-watch-card');
      card.appendChild(el('span', 'rl-watch-card-kind',
        camera ? 'Spaceport camera' :
          item.sourceLabel || 'Video listed for this mission'));
      card.appendChild(el('strong', 'rl-watch-card-title',
        camera ? item.title : item.title || 'Mission video'));
      card.appendChild(el('small', 'rl-watch-card-publisher',
        (camera ? item.publisher : item.publisher || 'Publisher not listed') +
        ' · ' + (camera ? 'link checked ' + item.verifiedAsSourceOn :
          item.sourceReportedEnded ? 'listed as a replay or ended stream' :
          current && item.sourceReportedLive === true ?
            'listed as live at last check' :
            'live status not confirmed')));
      const source = anchor(camera ? item.siteUrl : item.url,
        camera ? 'View this camera' : 'Watch on the publisher’s site', 'rl-watch-link');
      if (source) card.appendChild(source);
      const id = item.youtubeId;
      if (typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)) {
        const frameHost = el('div', 'rl-watch-frame');
        if (!camera && item.url === desk.primaryVideo?.url) {
          const preview = el('img', 'rl-watch-preview');
          preview.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
          preview.loading = 'lazy';
          preview.alt = 'Video thumbnail provided by the publisher';
          frameHost.appendChild(preview);
        }
        const play = el('button', 'rl-watch-play',
          camera ? 'Play camera on YouTube' : 'Play mission video on YouTube');
        play.type = 'button';
        play.addEventListener('click', () => {
          const frame = el('iframe', 'rl-watch-player');
          frame.title = (camera ? 'Area camera: ' : 'Mission video: ') + item.title;
          frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0';
          frame.loading = 'lazy';
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
          frame.allowFullscreen = true;
          frameHost.replaceChildren(frame);
          play.remove();
        });
        card.append(frameHost, play);
      }
      return card;
    }
    const videos = Array.isArray(desk.videos) ? desk.videos.slice(0, 5) : [];
    if (videos.length) videos.forEach(item => root.appendChild(videoCard(item, false)));
    else root.appendChild(el('p', 'rl-watch-empty',
      'No webcast linked to this flight yet. The operator may announce one as launch day approaches.'));
    const cameras = data.selectedRegion === 'florida' && Array.isArray(desk.cameras) ?
      desk.cameras : [];
    if (cameras.length) cameras.forEach(item => general.appendChild(videoCard(item, true)));
    else general.appendChild(el('p', 'rl-watch-empty',
      'No public spaceport camera is listed for this coast right now.'));
    if (desk.operator?.url) {
      const source = anchor(desk.operator.url,
        desk.operator.label || 'Open launch operator updates', 'rl-watch-operator');
      if (source) general.appendChild(source);
    }
    if (desk.operator?.videoChannelUrl) {
      const channel=anchor(desk.operator.videoChannelUrl,
        desk.operator.videoChannelLabel||'Operator’s video channel',
        'rl-watch-operator');
      if(channel)general.appendChild(channel);
    }
    if (data.region?.specialist) {
      const detail = anchor(floridaSpecialistLink(data.region.specialist,data),
        data.region?.id === 'texas' ? 'Texas viewing map and latest road notices' :
          'Florida viewing places, tickets and sky', 'rl-watch-operator');
      if (detail) general.appendChild(detail);
    }
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
      const o = el('option', '', 'No upcoming launch listed');
      o.value = '';
      select.appendChild(o);
    }
    select.disabled = !launches.length;
    if (data.selectedLaunchId) select.value = data.selectedLaunchId;
  }
  function renderIndependentReporting(data) {
    const desk=data?.independentReporting || {};
    const current=desk.status==='ok';
    set('rl-news-checked', current ?
      'Reporting updated ' + stamp(desk.checkedAt) :
      'Spaceflight Now updates aren’t loading right now');
    const list=$('rl-news-stories');
    if(!list)return;
    list.replaceChildren();
    const articles=Array.isArray(desk.stories)?desk.stories.slice(0,3):[];
    const trusted=u=>typeof u==='string' &&
      /^https:\/\/(?:www\.)?spaceflightnow\.com\/20\d\d\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/[a-z0-9-]+\/$/i.test(u);
    if(current && articles.length)for(const item of articles){
      if(!trusted(item.url) || typeof item.title!=='string')continue;
      const card=el('article','rl-news-article');
      card.appendChild(el('p','rl-news-meta',
        (item.match==='mission-identifier' ? 'This mission' :
          'Related rocket or spacecraft') +
        ' · published ' + stamp(item.publishedAt)));
      const a=anchor(item.url,item.title.slice(0,170));
      if(a)card.appendChild(a);
      list.appendChild(card);
    }
    if(!list.children.length)list.appendChild(el('p','rl-news-note',
      current ? 'No recent article tied to this flight is listed. You can still browse Spaceflight Now’s launch coverage.' :
        'Recent reporting couldn’t load. That doesn’t mean the launch has changed.'));
    set('rl-news-note',desk.note || 'For the current liftoff time, check the operator’s latest announcement.');
  }

  // A Google Maps SEARCH to a documented PUBLIC place is location discovery,
  // never mission admission, a reserved parking space or a drive to the pad.
  function siteMapHref(site) {
    if (!site || !site.address || typeof site.address !== 'string' ||
      site.address.length > 240 || ['closed','restricted','hours'].includes(site.state) ||
      ['range-restricted','specialist'].includes(site.kind)) return null;
    const permitted = site.mapsLocationAllowed === true ||
      (site.mapsLocationAllowed == null && site.directionsAllowed === true);
    if (!permitted) return null;
    // NASA’s public Visitor Center can be found on a map even when the
    // separate launch-viewing lawn has no confirmed opening for this mission.
    if (site.kind === 'mission-confirm' &&
      !(site.id === 'wallops-visitor' &&
        site.address.toLowerCase().startsWith('175 chincoteague road,'))) return null;
    return 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(site.address);
  }
  function renderQuickViewingPlaces(data, cards) {
    const root = $('rl-access-quick');
    if (!root) return;
    root.replaceChildren();
    const region = data?.region?.id;
    const selected = data?.selectedLaunch && data?.selectedLaunchId === data.selectedLaunch.id;
    const places = (cards || []).filter(site => siteMapHref(site)).slice(0, 3);
    const top = el('div','rl-access-quick-top');
    top.append(el('span','rl-access-quick-label','DOCUMENTED PUBLIC VIEWING PLACES'),
      el('small','',selected?'For your selected launch · entry not guaranteed':
        'General regional choices · no event-specific entry confirmed'));
    root.appendChild(top);
    if (!places.length) {
      root.appendChild(el('p','rl-access-quick-empty',
        'We don’t have a public viewing spot to recommend for this flight. The launch pad and restricted gates are not public destinations.'));
      const guide = anchor(floridaSpecialistLink(data?.region?.specialist,data),
        'Read the local viewing guide');
      if (guide) root.appendChild(guide);
      return;
    }
    const list=el('div','rl-access-quick-list');
    places.forEach((site,index) => {
      const item=el('article','rl-access-quick-item');
      item.dataset.state=site.state||'verify';
      const copy=el('div','rl-access-quick-copy');
      copy.appendChild(el('span','rl-access-quick-number',String(index+1).padStart(2,'0')+
        (site.kind==='mission-confirm'?' / VISITOR CENTER':' / PUBLIC VIEWING SPOT')));
      copy.appendChild(el('strong','rl-access-quick-name',site.name));
      copy.appendChild(el('span','rl-access-quick-role',site.bestFor||site.role||
        'Public place to watch'));
      copy.appendChild(el('p','rl-access-quick-status',
        site.kind==='mission-confirm'?
          'NASA opens this viewing lawn only for certain launches. If it opens, entry is first-come and parking can fill.' :
          site.reason || site.note || site.label || 'Check access and parking before you go'));
      const links=el('div','rl-access-quick-links');
      const maps=anchor(siteMapHref(site),
        site.kind==='mission-confirm'?'Find the NASA Visitor Center on Google Maps':
          'Open Google Maps','rl-access-map');
      const official=anchor(site.source,
        site.kind==='mission-confirm'?'NASA’s viewing rules':'View official local rules',
        'rl-access-official');
      if(maps)links.appendChild(maps);
      if(official)links.appendChild(official);
      item.append(copy,links);
      list.appendChild(item);
    });
    root.appendChild(list);
    root.appendChild(el('p','rl-access-quick-caution',
      region==='virginia'?
      'For Wallops, navigate to the public NASA Visitor Center at 175 Chincoteague Road, not the base gate. Don’t park or wait along Route 175. Check for launch-day closures and parking changes.' :
      'These links show public places to consider, not reserved parking or a guarantee they’re open for this launch. Check local rules before leaving.'));
  }

  function renderAccess(data) {
    const access = data.access || {};
    const florida=data.region?.id==='florida'?
      window.RocketFloridaAccess?.assess(data,state.floridaEvidence):null;
    const safety=$('rl-access-safety');if(safety)safety.hidden=Boolean(florida);
    const floridaAnswer=$('rl-access-answer');
    if(floridaAnswer){
      floridaAnswer.replaceChildren();floridaAnswer.hidden=!florida;
      if(florida){
        floridaAnswer.dataset.state=florida.state;
        floridaAnswer.appendChild(el('strong','',florida.npsClosed?
          'Playalinda may be closed for this launch':
          'Before you go, check launch-day access'));
        floridaAnswer.appendChild(el('p','',florida.note));
        floridaAnswer.appendChild(el('p','rl-access-source-age',florida.matched?
          'Florida notices checked. National Park Service updates last checked '+stamp(florida.sourceCheckedAt)+
          '. Parking and entry may still be restricted for this launch.':
          'Florida access updates aren’t confirmed right now. Check with the park or venue before making the drive.'));
        const nps=anchor('https://www.nps.gov/cana/planyourvisit/conditions.htm',
          'Check Playalinda Beach hours and closures');
        if(nps)floridaAnswer.appendChild(nps);
        const detail=anchor(florida.detailUrl,'Compare Florida viewing spots, tickets and sky');
        if(detail)floridaAnswer.appendChild(detail);
        const ksc=florida.kscMatched?anchor(florida.kscUrl,'See Kennedy’s event details for this launch'):null;
        if(ksc)floridaAnswer.appendChild(ksc);
      }
    }
    const viewingCards=(florida?.cards?.length?florida.cards:access.sites)||[];
    renderQuickViewingPlaces(data,viewingCards);
    const sites = $('rl-sites');
    if (sites) {
      sites.replaceChildren();
      for (const s of viewingCards) {
        const card = el('article', 'rl-site-card');
        card.dataset.state = s.state || 'verify';
        card.appendChild(el('span', 'rl-site-kicker', s.role || s.bestFor || 'Viewing area'));
        card.appendChild(el('h3', '', s.name));
        card.appendChild(el('span', 'rl-site-status', s.label || 'Check opening and parking'));
        card.appendChild(el('p', '', s.reason || 'Check the local venue for any launch-day restrictions.'));
        const actions = el('div', 'rl-site-actions');
        const source = anchor(s.kind === 'specialist' ?
          floridaSpecialistLink(s.source,data) : s.source,
          s.kind === 'specialist' ? 'Explore this launch on Florida’s guide' : 'Official viewing information', 'rl-mainlink');
        if (source) actions.appendChild(source);
        const mapHref=siteMapHref(s);
        if (mapHref) {
          const location=anchor(mapHref,
            s.kind === 'mission-confirm' ? 'Visitor Center on Google Maps · check opening' :
            'Find this spot on Google Maps');
          if (location) actions.appendChild(location);
        }
        card.appendChild(actions);
        sites.appendChild(card);
      }
    }
    chip($('rl-access-grade'),
      florida ? florida.status :
      data.region.id === 'alaska' || data.region.id === 'hawaii' ?
        'No public launch viewing confirmed' : 'Check before you go',
      data.region.id === 'alaska' || data.region.id === 'hawaii' ? 'restricted' : florida ? florida.state : 'unknown');
    set('rl-access-summary', florida?.answer || access.guidance ||
      'We can’t confirm which viewing spots are open for this flight. Check the local authority.');
    const notice = $('rl-official-notice');
    const live = access.liveOfficialNotice;
    if (notice) {
      notice.replaceChildren();
      if (live && data.region.id === 'texas') {
        notice.hidden = false;
        notice.dataset.state = live.state === 'closed' ? 'closed' :
          live.roadState === 'advisory' ? 'advisory' : 'unknown';
        const status = live.state === 'closed' ? 'Boca Chica Beach: reported closed' :
          live.state === 'open-general' ? 'Boca Chica Beach: generally open' :
          'Boca Chica Beach: check current status';
        notice.appendChild(el('strong', '', status));
        notice.appendChild(el('div', '',
          (live.roadState === 'advisory' ? 'Road update: ' + (live.description || 'Road advisory reported.') + '. ' : '') +
          'A currently open beach is not approval to enter a launch exclusion zone.'));
        notice.appendChild(el('div', '', 'City update checked ' + stamp(live.checkedAt)));
        const a = anchor(live.url, 'Check Starbase beach and road notices');
        if (a) notice.appendChild(a);
      } else notice.hidden = true;
    }
  }
  // The existing Florida source resolves mission-specific public sites and NPS
  // restrictions. Do not block the national answer or admit another mission’s
  // conditions if a slow response races a selector change.
  async function loadFloridaEvidence(data){
    const seq=++state.floridaRequest;
    const id=data?.selectedLaunchId;
    if(data?.selectedRegion!=='florida'||data.scheduleFreshness!=='recent'||
      id!==data.selectedLaunch?.id||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||''))return;
    const controller=new AbortController();state.floridaController=controller;
    const timer=AbortSignal.timeout(18000);
    const cancel=()=>controller.abort();timer.addEventListener('abort',cancel,{once:true});
    let detail={ok:false};
    try{
      const response=await fetch('/api/space-coast-launch?launchId='+encodeURIComponent(id),{
        headers:{Accept:'application/json'},signal:controller.signal});
      if(response.ok)detail=await response.json();
    }catch{}finally{timer.removeEventListener('abort',cancel);}
    if(seq!==state.floridaRequest||state.data?.selectedLaunchId!==id||
      state.data?.selectedRegion!=='florida')return;
    state.floridaEvidence=detail;
    renderAccess(state.data);
  }
  // These are NWS *hypothetical delayed target* samples, not a launch forecast.
  // No extra calls: all four cases come with the existing regional weather API.
  function renderSlipForecast(data) {
    const root=$('rl-slip-options'),detail=$('rl-slip-detail');
    if (!root || !detail) return;
    root.replaceChildren();detail.replaceChildren();
    const forecast=data?.weather?.slip;
    const scenarios=Array.isArray(forecast?.scenarios)?forecast.scenarios:[];
    const safe=scenarios.filter(s=>[0,1,3,6].includes(s.offsetHours));
    const sourceStale=data.scheduleFreshness==='stale'||forecast?.sourceOverdue===true;
    if (!safe.length) {
      set('rl-slip-brief','We need a more precise launch time and enough hourly weather data to compare possible delays.');
      detail.appendChild(el('p','rl-slip-empty',
        'These are only forecast possibilities. Keep watching the operator for any real delay.'));
      return;
    }
    set('rl-slip-brief',
      (sourceStale?'The published launch time may be old, so we aren’t comparing delayed weather yet. ':
        forecast?.outlook+' ') +
      'These are imagined delays to help you plan, not an announcement that the launch has moved.');
    const buttons=[];
    const timeLabel=iso=>{
      const parsed=Date.parse(iso||'');
      if(!Number.isFinite(parsed))return 'Time not available';
      return new Intl.DateTimeFormat('en-US',{
        timeZone:data.region?.timezone||'UTC',weekday:'short',hour:'numeric',minute:'2-digit',
        timeZoneName:'short'
      }).format(new Date(parsed));
    };
    function update(index) {
      for(const [i,button] of buttons.entries()){
        button.setAttribute('aria-pressed',i===index?'true':'false');
      }
      detail.replaceChildren();
      const item=safe[index];
      const head=el('div','rl-slip-detail-head');
      head.appendChild(el('strong','',item.offsetHours===0?'The scheduled target':
        '+'+item.offsetHours+' hour'+(item.offsetHours===1?'':'s')+' from the target'));
      head.appendChild(el('span','',timeLabel(item.targetAt)));
      detail.appendChild(head);
      const rows=el('div','rl-slip-site-grid');
      for(const point of item.places||[]){
        const card=el('div','rl-slip-site');
        card.appendChild(el('span','rl-slip-site-label',point.name||'Regional forecast reference'));
        const numeric=point.cloudStatus==='ok'&&Number.isInteger(point.cloudCoverPercent);
        const val=el('strong','rl-slip-number',
          numeric?point.cloudCoverPercent+'% total sky cover':'Cloud value unavailable');
        card.appendChild(val);
        if(numeric){
          const track=el('div','rl-slip-track');
          const fill=el('span','rl-slip-fill');
          fill.style.width=point.cloudCoverPercent+'%';
          track.appendChild(fill);
          track.setAttribute('aria-hidden','true');
          card.appendChild(track);
        }
        card.appendChild(el('small','',
          point.assessment?.level==='poor'?
            'Weather hazards also indicated; do not favor this area solely for lower cloud cover.':
          !numeric?'NWS grid value missing, stale, or outside this forecast hour.':
          point.status!=='forecast-hour'?'No hourly forecast for this time yet. We can’t say what the sky will look like.':
          (point.shortForecast||'Hourly surface forecast checked')+' · regional reference, not a pad sightline'));
        rows.appendChild(card);
      }
      detail.appendChild(rows);
      const comp=item.comparison||{};
      const desc=item.status==='outside-horizon'?
        'That later time is too far away for an hourly forecast.':
        sourceStale?'This launch time needs an update before we can compare weather.':
        comp.state==='relative'?comp.label+' '+comp.detail:
        comp.state==='similar'?'Both areas have similar cloud cover in the forecast. Neither has a clear advantage.':
        'A reliable two-point comparison is unavailable for this hour. Missing data and surface hazards are not treated as clear skies.';
      detail.appendChild(el('p','rl-slip-verdict',desc));
    }
    for(const [index,scenario] of safe.entries()){
      const button=el('button','rl-slip-choice');
      button.type='button';
      button.appendChild(el('strong','',scenario.offsetHours===0?'Scheduled':
        '+'+scenario.offsetHours+' hr'));
      button.appendChild(el('small','',timeLabel(scenario.targetAt)));
      button.addEventListener('click',()=>update(index));
      root.appendChild(button);buttons.push(button);
    }
    update(0);
  }

  function renderWeather(data) {
    const weather = data.weather || {};
    const root = $('rl-regional-sky');
    if (!root) return;
    root.replaceChildren();
    const wrap = el('div', 'rl-sky-head');
    const info = el('div');
    info.appendChild(el('h3', '', weather.label || 'Viewing forecast not yet available'));
    info.appendChild(el('p', '', weather.detail || 'No weather forecast is available for this launch time yet.'));
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
            p.cloudCoverPercent + '% forecast cloud cover' : 'Cloud cover not available'));
        card.appendChild(el('p', '', p.period?.shortForecast ?
          'NWS: ' + p.period.shortForecast + '. ' + (p.assessment?.detail || '') :
          'The hourly forecast doesn’t cover this launch time yet.'));
        grid.appendChild(card);
      }
      root.appendChild(grid);
    }
    const compare = weather.comparison;
    if (compare) {
      const block = el('div', 'rl-sky-comparison');
      block.appendChild(el('strong', '', compare.label || 'Not enough data to compare'));
      block.appendChild(el('p', '', compare.detail || 'We can’t compare the viewing skies with the available forecast.'));
      root.appendChild(block);
    }
    chip($('rl-weather-grade'),
      weather.level === 'assessed' ? 'NWS forecast checked' :
      weather.level === 'partial' ? 'Only part of the forecast is available' : 'No launch-time sky forecast',
      weather.level === 'assessed' ? 'candidate' : 'unknown');
    set('rl-weather-summary', compare?.detail || weather.detail ||
      'A precise launch time inside the forecast horizon is required.');
  }

  function renderLaunchWeather(data) {
    const forecast = data.launchWeather || {};
    const verified = forecast.status === 'forecast';
    chip($('rl-range-grade'), verified ? 'Nearby forecast available' : 'Weather near the pad not confirmed',
      verified ? (forecast.level === 'elevated' ? 'poor' : forecast.level === 'watch' ? 'medium' : 'unknown') : 'unknown');
    set('rl-range-headline', forecast.label || 'Launch-pad weather forecast not available');
    set('rl-range-summary', forecast.detail ||
      'We don’t yet have a reliable forecast for the area around the launch pad.');
    const readings = $('rl-range-readings');
    readings.replaceChildren();
    const metrics = [
      ['Thunder chance', forecast.readings?.thunderPercent, '%'],
      ['Precipitation chance', forecast.readings?.precipitationPercent, '%'],
      ['Wind gust', forecast.readings?.gustMph, ' mph'],
      ['Forecast sky cover', forecast.readings?.cloudCoverPercent, '%']
    ];
    for (const [name, value, unit] of metrics) {
      const card = el('div', 'rl-range-metric');
      card.appendChild(el('span', '', name));
      card.appendChild(el('strong', '', Number.isFinite(value) ? value + unit : 'Not provided'));
      readings.appendChild(card);
    }
    const signals = $('rl-range-signals');
    signals.replaceChildren();
    if (forecast.signals?.length) {
      for (const signal of forecast.signals) {
        const item = el('article', 'rl-range-signal');
        item.dataset.level = signal.level;
        item.appendChild(el('strong', '', signal.label + (signal.value ? ' · ' + signal.value : '')));
        item.appendChild(el('p', '', signal.detail));
        signals.appendChild(item);
      }
    } else {
      signals.appendChild(el('p', '', verified ?
        'No standout concerns in the public surface forecast, but that does not mean the rocket is cleared to fly.' :
        'The public forecast is incomplete. That’s not a green light to launch.'));
    }
    const timeline = $('rl-range-timeline');
    timeline.replaceChildren();
    const rows = (forecast.timeline || []).filter(v => v.level !== 'unknown');
    if (rows.length) {
      const rail = el('ol', 'rl-range-timeline-list');
      const timeZone = data.region?.timezone || 'UTC';
      for (const row of rows) {
        const item = el('li', 'rl-range-timepoint');
        item.dataset.level = row.level;
        item.appendChild(el('span', 'rl-range-offset', row.hoursFromTarget === 0 ?
          'Target time' : row.hoursFromTarget < 0 ? 'T−' + Math.abs(row.hoursFromTarget) + 'h' :
            'T+' + row.hoursFromTarget + 'h'));
        const d = new Date(row.at);
        const local = Number.isNaN(+d) ? 'Time unavailable' :
          d.toLocaleString('en-US', { timeZone, month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit' });
        item.appendChild(el('strong', '', local));
        const vals = row.readings || {};
        const pieces = [
          Number.isFinite(vals.thunderPercent) ? vals.thunderPercent + '% thunder' : null,
          Number.isFinite(vals.precipitationPercent) ? vals.precipitationPercent + '% rain' : null,
          Number.isFinite(vals.gustMph) ? vals.gustMph + ' mph gust' : null
        ].filter(Boolean);
        item.appendChild(el('small', '', pieces.join(' · ') || vals.shortForecast || 'Limited hourly fields'));
        rail.appendChild(item);
      }
      timeline.appendChild(rail);
    } else timeline.appendChild(el('p', '', 'There aren’t enough hourly forecasts yet to show how conditions may change.'));
    set('rl-range-provenance', (forecast.site?.name || 'Launch site') +
      ' · ' + (forecast.site?.approximation || 'Regional reference only') + '. ' +
      (forecast.forecastUpdatedAt ? 'NWS grid updated ' + stamp(forecast.forecastUpdatedAt) + '. ' :
        'Nearby weather forecast not available. ') +
      'Only the launch range and operator decide whether weather permits liftoff. ' +
      'These public forecasts don’t tell us the odds of a launch scrub.');
    const links = $('rl-range-links');
    links.replaceChildren();
    const official = anchor(forecast.officialUrl || data.region?.authority,
      data.region?.id === 'florida' ? 'Florida’s official launch forecast' : 'Official range and mission updates');
    const nws = anchor(forecast.sourceUrl || 'https://www.weather.gov/', 'NWS forecast source');
    if (official) links.appendChild(official);
    if (nws) links.appendChild(nws);
  }

  function renderOfficial45ws(data) {
    const box = $('rl-official-wrap');
    if (!box) return;
    box.hidden = data.region?.id !== 'florida';
    if (box.hidden) return; // 45WS is the Florida range forecast, not a national forecast.
    const d = data.officialLaunchWeather || {};
    const story = d.weatherStory || {};
    set('rl-story-headline', story.headline || 'No official forecast for this mission yet');
    set('rl-story-detail', story.explanation ||
      'The launch-day weather picture is still coming together.');
    set('rl-story-when', story.nextUpdate || 'Next forecast update not announced.');
    const matched = d.status === 'mission-matched-current';
    const numeric = matched && Number.isInteger(d.povPercent);
    set('rl-official-title', d.label || 'Official launch forecast not yet available');
    set('rl-official-value', numeric ? d.povPercent + '% PoV' : 'Unverified');
    set('rl-official-detail', numeric ?
      'The official forecast lists: ' + (d.primaryConcerns?.join(', ') ||
        'weather concerns were not clearly listed') +
      '. Other hazards, including recovery and upper-level wind limits, may be outside this percentage.' :
      matched ? 'A mission-matched official document was found, but its violation percentage could not be safely extracted.' :
      'No official 45th Weather Squadron forecast has been matched to this flight yet. That doesn’t mean weather will be favorable.');
    const latest = d.latestChange;
    set('rl-official-trend', story.changes ||
      (matched && latest ? latest.headline + '. ' + latest.detail +
      ' Detected ' + stamp(latest.detectedAt) + '.' :
      'Earlier forecast updates aren’t available for comparison yet.'));
    const target = $('rl-official-source');
    target.replaceChildren();
    const official = matched && typeof d.officialUrl === 'string' &&
      /^https:\/\/45thweathersquadron\.nebula\.spaceforce\.mil\/assets\/LaunchForecasts\//.test(d.officialUrl) ?
      anchor(d.officialUrl,'Read the official forecast PDF') : null;
    if (official) target.appendChild(official);
    if(d.agencyWeather?.status==='nasa-reported-current' &&
      /^https:\/\/www\.nasa\.gov\/blogs\/[a-z0-9_-]+\/20\d\d\/\d\d\/\d\d\/[a-z0-9-]+\/$/.test(d.agencyWeather.sourceUrl||'')){
      const report = anchor(d.agencyWeather.sourceUrl,'NASA mission weather report');
      if(report) target.appendChild(report);
    }
    const portal = anchor('https://www.patrick.spaceforce.mil/About-Us/Weather/',
      '45WS weather portal');
    if (portal) target.appendChild(portal);
    if (d.health?.checkedAt) target.appendChild(el('small', '',
      'Discovery checked ' + stamp(d.health.checkedAt) + ' · ' + d.health.status));
    const horizon = d.health?.forecastWindow || {};
    if(horizon.candidates7Days===0 &&
       ['before-forecast-window','no-launches-in-21-days'].includes(horizon.status))
      target.appendChild(el('small','',
        horizon.candidates21Days>0 ?
        'This Florida flight is still outside the seven-day forecast window; ' +
        horizon.candidates21Days + ' within the 21-day lookahead.' :
        'No Florida launch is close enough for the official forecast search yet.'));
    if((d.health?.nasaSourceChecks || []).some(x=>x.status==='unavailable'))
      target.appendChild(el('small','','NASA weather-report source checks were partly unavailable.'));
    const upstream = (d.health?.sourceChecks || []).filter(x =>
      ['45ws-home','45ws-forecast-support','45ws-sitemap','45ws-parent-weather'].includes(x.id));
    const unavailable = upstream.filter(x => x.status === 'unavailable').length;
    if (unavailable) target.appendChild(el('small','',
      'Direct official-page checks unavailable: ' + unavailable + ' of ' + upstream.length +
      '. Coverage is incomplete.'));
    else if (upstream.length && !upstream.some(x => x.links > 0))
      target.appendChild(el('small','','Official pages listed no forecast PDFs during the last check.'));
    if (matched) target.appendChild(el('small','',
      d.discoveredVia === '45ws-public-page' ? 'Discovered on a first-party weather page.' :
      'Official PDF verified; link discovery does not establish forecast coverage.'));
  }

  function syncUrl(r, l) {
    const url = new URL(location.href);
    if (r && validRegions.has(r)) url.searchParams.set('region', r);
    else url.searchParams.delete('region');
    if (l && /^[0-9a-f-]{36}$/i.test(l)) url.searchParams.set('launchId', l);
    else url.searchParams.delete('launchId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  // Python produces a signed, bounded source ledger. Client never scrapes
  // authority websites, promotes archived orders into closures or merges
  // raw page text into a selected LL2 mission record.
  const officialName = {
    'vandenberg-news':'Vandenberg / Space Force news',
    'vandenberg-alerts':'Space Force launch-alert subscriptions',
    'canaveral-nps':'Canaveral / NPS Playalinda policy',
    'ksc-viewing':'Kennedy Visitor Complex viewing rules',
    'starbase-city':'City of Starbase beach & road notices',
    'wallops-schedule':'NASA Wallops launch schedule',
    'wallops-range-blog':'NASA Wallops Range official articles',
    'wallops-visitor':'NASA Wallops Visitor Center',
    'alaska-aerospace':'Alaska Aerospace road-closure desk',
    'alaska-news':'Alaska Aerospace operator news',
    'pmrf-beach':'Navy / Barking Sands shoreline policy'
  };
  const evidenceKind = {
    'access-status':'Published status · checked at source',
    'road-status':'Published road report · checked at source',
    'historical-order-index':'Previous order · not active by inference',
    'notice-check-required':'Current notice requires official review',
    'schedule-status':'NASA public schedule statement',
    'access-policy':'General policy · not event clearance',
    'source-link':'Official alert subscription',
    'official-article':'Official article · event not independently matched',
    'scheduled-road-activity':'Dated city transport window · not a closure'
  };
  function launchLocalDay(launch,timezone){
    const stamp=Date.parse(launch?.net||'');
    if(!Number.isFinite(stamp))return null;
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone||'UTC',
        year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(stamp));
      const part=t=>parts.find(x=>x.type===t)?.value;
      return part('year')+'-'+part('month')+'-'+part('day');
    }catch{return null;}
  }
  // Existing mission-specific KSC event monitor already verifies the actual
  // official event page and sourcePad against the selected Florida snapshot.
  // Do NOT duplicate the scraper, infer admission or recast general policy
  // as a launch ticket. This is a read-only same-site evidence bridge.
  function officialKscEventUrl(value) {
    try {
      const u=new URL(value);
      return u.origin==='https://www.kennedyspacecenter.com'&&
        /^\/event\/[a-z0-9-]{5,160}\/?$/.test(u.pathname)&&
        !u.search&&!u.hash?u.href:null;
    }catch{return null;}
  }
  function renderKscMission(data){
    const root=$('rl-ksc-official-viewing');
    if(!root)return;
    const florida=data?.region?.id==='florida';
    root.hidden=!florida;
    if(!florida)return;
    root.replaceChildren();
    root.appendChild(el('span','rl-match-eyebrow','FLORIDA · KENNEDY VISITOR COMPLEX'));
    const launch=data?.selectedLaunch;
    if(!launch?.id||data.scheduleFreshness!=='recent'){
      root.dataset.status='unknown';
      root.appendChild(el('h3','','KSC event cannot be linked without a recent mission'));
      root.appendChild(el('p','','A mission and a recent schedule are needed before checking specific Kennedy Space Center visitor viewing arrangements.'));
      return;
    }
    const evidence=state.kscMissionId===launch.id?state.kscEvidence:null;
    if(!evidence){
      root.dataset.status='unknown';
      root.appendChild(el('h3','',state.kscMissionId===launch.id?'Checking the KSC verified-event watcher':'Looking for KSC event-specific viewing notices'));
      root.appendChild(el('p','','Kennedy announces viewing opportunities for individual launches. Check its event page for tickets and entry.'));
      return;
    }
    const health=evidence.health||{},timeline=evidence.timeline||{};
    const source=officialKscEventUrl(timeline.officialSourceUrl);
    const day=launchLocalDay(launch,'America/New_York');
    const target=timeline.officialEventDate;
    const dateGap=day&&target?Math.abs((Date.parse(day+'T12:00:00Z')-Date.parse(target+'T12:00:00Z'))/86400000):Infinity;
    const valid=evidence.ok===true&&evidence.selectedLaunchId===launch.id&&
      (health.status==='checked'||health.status==='partial')&&
      timeline.verifiedPageIsRecent===true&&source&&dateGap<=1;
    if(valid){
      root.dataset.status='matched';
      root.appendChild(el('h3','','KSC published a viewing event for this mission'));
      root.appendChild(el('p','rl-match-heading','Official event date: '+target+
        ' · Mission designation: '+timeline.missionMarker));
      root.appendChild(el('p','rl-match-meta','Official page last verified: '+
        stamp(timeline.officialPageLastVerifiedAt)+' · Watcher: '+health.status));
      root.appendChild(el('p','rl-match-caution',
        'A matched KSC event is not admission. Check current ticket offers, viewing location availability, visitor-center entry, launch-specific closures and delay rules on the original page before purchasing or traveling.'));
      const link=anchor(source,'Inspect official KSC event and ticket conditions');
      if(link)root.appendChild(link);
    }else{
      root.dataset.status='unverified';
      root.appendChild(el('h3','','Kennedy viewing isn’t announced for this flight yet'));
      const overdue=health.status==='overdue'||health.status==='not-initialized'||!evidence.ok;
      root.appendChild(el('p','',overdue?
        'Kennedy’s latest event listing isn’t available here. That doesn’t mean viewing is closed.':
        'We haven’t found a Kennedy viewing event for this specific flight. Regular park hours don’t guarantee launch viewing.'));
      root.appendChild(el('p','rl-match-meta','Kennedy event listing checked: '+
        stamp(health.lastCalendarCheckedAt)+'.'));
      const link=anchor(health.calendarUrl,'See Kennedy’s launch events calendar');
      if(link)root.appendChild(link);
    }
    const specialist=anchor(floridaSpecialistLink('/national-tools/space-coast-launch/',data),
      'See Florida viewing options and tickets');
    if(specialist)root.appendChild(specialist);
  }
  async function loadKscMission(data){
    const sequence=++state.kscRequest;
    const id=data?.selectedLaunch?.id;
    const use=data?.region?.id==='florida'&&data.scheduleFreshness==='recent'&&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||'');
    state.kscEvidence=null;
    state.kscMissionId=use?id:null;
    renderKscMission(data);
    if(!use)return;
    try{
      const response=await fetch(KSC_OFFICIAL_API+'?launchId='+encodeURIComponent(id),
        {headers:{Accept:'application/json'},signal:AbortSignal.timeout(9500)});
      if(!response.ok)throw new Error('ksc-event-source-not-available');
      const result=await response.json();
      if(sequence!==state.kscRequest)return;
      if(result?.ok!==true||result.selectedLaunchId!==id)throw new Error('ksc-event-mismatch');
      state.kscEvidence=result;
    }catch{
      if(sequence!==state.kscRequest)return;
      state.kscEvidence={ok:false,selectedLaunchId:id,health:{status:'overdue'},
        timeline:null};
    }
    if(state.data?.selectedLaunch?.id===id&&state.data?.region?.id==='florida'){
      renderKscMission(state.data);
      document.dispatchEvent(new CustomEvent('rocket-viewing:ksc-evidence',
        {detail:{region:'florida',launchId:id,
          status:$('rl-ksc-official-viewing')?.dataset.status||'unknown'}}));
    }
  }

  // Keep the signed Python source ledger and mission matching in the API.
  // Visitors see only useful official announcements, independently verified
  // access notices, and curated authority links—not collector failures.
  function renderOfficialMatch(data) {
    const root=$('rl-mission-official-match');
    if(!root)return;
    root.replaceChildren();
    root.hidden=true;
    const rec=state.officialEvidence?.reconciliation;
    const launch=data?.selectedLaunch;
    if(!launch?.id||
      state.officialEvidence?.health!=='recent'||
      rec?.health==='unavailable-or-stale'||
      rec?.health==='schedule-unavailable'||
      !rec?.manifestCheckedAt||data.scheduleFreshness!=='recent')return;
    const match=rec?.matches?.find(m=>m.launchId===launch.id&&m.region===data.region?.id);
    if(!match||!['exact-designation-and-local-date','official-rss-exact-designation-and-local-date'].includes(match.matchRule))return;
    const day=launchLocalDay(launch,data.region?.timezone);
    const dateGap=day&&match.officialEventDate?
      Math.abs((Date.parse(day+'T12:00:00Z')-Date.parse(match.officialEventDate+'T12:00:00Z'))/86400000):Infinity;
    root.hidden=false;
    if(dateGap>1){
      root.dataset.status='unverified';
      root.appendChild(el('h3','','Check the official launch date'));
      root.appendChild(el('p','','The latest schedule and the matched government announcement give different dates. Check the operator before making plans.'));
    }else{
      root.dataset.status='matched';
      root.appendChild(el('span','rl-match-eyebrow','OFFICIAL LAUNCH ANNOUNCEMENT'));
      root.appendChild(el('h3','','The range has announced this flight'));
      root.appendChild(el('p','rl-match-heading',match.noticeTitle));
      root.appendChild(el('p','rl-match-meta',
        'Official event date: '+match.officialEventDate+
        (match.publishedDate?' · Article published: '+match.publishedDate:'')));
      root.appendChild(el('p','rl-match-caution',
        'An announcement is a good sign, but the time and public viewing rules can still change.'));
    }
    const link=anchor(match.articleUrl,'Read the range announcement');
    if(link)root.appendChild(link);
  }

  function renderOfficialEvidence(data) {
    const root=$('rl-evidence-sources');
    if(!root)return;
    renderOfficialMatch(data);
    root.replaceChildren();
    const region=data?.region?.id;
    if(!validRegions.has(region)){
      set('rl-evidence-status','Choose a coast for its official notices.');
      set('rl-evidence-checked','Viewing access and launch times must be checked with the responsible authorities.');
      return;
    }
    const feed=state.officialEvidence;
    const fresh=feed?.health==='recent';
    const records=Array.isArray(feed?.regions?.[region])?feed.regions[region]:[];
    const good=fresh?records.filter(s=>s.status==='retrieved'):[];
    const useful=new Set(['access-status','road-status','notice-check-required',
      'scheduled-road-activity','schedule-status']);
    const hasNotice=good.some(s=>(s.signals||[]).some(n=>useful.has(n.kind)&&
      n.relevance!=='historical-only'&&n.relevance!=='unmatched-official-article'));
    set('rl-evidence-status',hasNotice?
      'New official notices to read before you go':
      'Before you leave, check the range and local access');
    set('rl-evidence-checked',hasNotice?
      'These notices were checked recently, but things can change before liftoff.':
      'Not seeing an update here doesn’t mean the launch is off or a viewing spot is closed.');

    // These are source-registered destination URLs, not last-run scraper links.
    // A stale snapshot may still contain an obsolete subscription URL.
    const links=el('nav','rl-official-links');
    links.setAttribute('aria-label','Official launch and access links');
    const seen=new Set();
    const add=(url,label)=>{
      if(!safeUrl(url)||seen.has(url))return;
      seen.add(url);
      const link=anchor(url,label,'rl-official-source-link');
      if(link)links.appendChild(link);
    };
    if(region==='california')
      add('https://public.govdelivery.com/accounts/USDODSFVANDENBERGPA/subscriber/new',
        'Get Vandenberg launch alerts');
    add(data.region?.authority,'Launch updates from the range');
    add(data.region?.access,'Beach, road and visitor rules');
    if(links.childElementCount)root.appendChild(links);

    // Display only recently retrieved, substantive land-manager notices.
    // Never show an "unreachable source" card, a stale open condition,
    // a generic subscription as a mission announcement, or prior orders
    // as current road closures.
    let shown=0;
    for(const source of good){
      for(const notice of source.signals||[]){
        if(shown>=2)break;
        if(!useful.has(notice.kind)||notice.relevance==='historical-only'||
          notice.relevance==='unmatched-official-article'||!notice.title)continue;
        const article=el('article','rl-evidence-notice');
        article.appendChild(el('strong','',notice.title));
        if(notice.detail)article.appendChild(el('p','',notice.detail));
        // An official transport window is not itself a beach closure.
        // Warn only if a fresh, minute-precise mission target actually overlaps.
        const launch=data?.selectedLaunch;
        if(notice.kind==='scheduled-road-activity'&&region==='texas'&&
          data.scheduleFreshness==='recent'&&
          ['minute','second'].includes(launch?.netPrecision)){
          const target=Date.parse(launch.net||'');
          const from=Date.parse(notice.windowStart||'');
          const through=Date.parse(notice.windowEnd||'');
          if(Number.isFinite(target)&&Number.isFinite(from)&&Number.isFinite(through)&&
            target>=from&&target<=through)
            article.appendChild(el('p','rl-evidence-change',
              'Heads up: a city-listed vehicle movement overlaps the planned launch time. Check Highway 4 before driving; this is not itself a road closure.'));
        }
        const a=anchor(notice.sourceUrl,'Read the full notice');
        if(a)article.appendChild(a);
        article.appendChild(el('small','',
          'Observed '+stamp(feed.checkedAt)+'; check again on launch day.'));
        root.appendChild(article);
        shown++;
      }
      if(shown>=2)break;
    }
  }
  async function loadOfficialEvidence() {
    try {
      const response=await fetch(OFFICIAL_EVIDENCE_API,{
        headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('evidence-source-unavailable');
      const result=await response.json();
      if(result?.ok!==true||result.version!==1||!result.regions)
        throw new Error('invalid-evidence');
      state.officialEvidence=result;
    }catch{
      state.officialEvidence=null;
    }
    state.officialEvidenceLoaded=true;
    if(state.data)renderOfficialEvidence(state.data);
  }

  function render(data) {
    state.data = data;
    state.scheduleFailed=false;
    state.regions = data.regions || [];
    const floridaNav = $('rl-nav-florida');
    if (floridaNav) floridaNav.href = floridaSpecialistLink('/national-tools/space-coast-launch/',data);
    const texasNav = $('rl-nav-starbase');
    if (texasNav) texasNav.href = floridaSpecialistLink('/starbase-rocket-launch-viewing/',data);
    initMap();
    for(const region of data.regions||[]){
      const marker=state.markers.get(region.id);
      if(marker&&Number.isFinite(region.lat)&&Number.isFinite(region.lon))
        marker.setLatLng([region.lat,region.lon]);
    }
    updateAtlasStatus();
    state.rocketPins?.update(data.regions.flatMap(r=>r.launches||[]),data.selectedLaunchId);
    showRegion(data.region);
    renderMission(data);
    renderMediaDesk(data);
    renderVisuals(data);
    renderIndependentReporting(data);
    renderSelector(data);
    renderAccess(data);
    void loadFloridaEvidence(data);
    renderWeather(data);
    renderSlipForecast(data);
    renderLaunchWeather(data);
    renderOfficial45ws(data);
    renderOfficialEvidence(data);
    void loadKscMission(data);
    board();
    renderFrontSchedule(data);
    document.dispatchEvent(new CustomEvent('rocket-viewing:data',{detail:data}));
    const coverage = data.coverage || {};
    set('rl-schedule-coverage',
      'Source: Launch Library 2 shared Postgres snapshot, observed ' +
      stamp(data.scheduleCheckedAt) +
      '. No upstream launch calendar calls from this visitor request. Two provider groups across seven location IDs. ' +
      (coverage.partial ? 'At least one source group was unavailable, stale or truncated; not every mission is guaranteed present. ' : '') +
      'This does not include every sounding rocket, military range test or far-future mission. Read each range’s official notice before traveling.');
  }
  async function load(region, launchId) {
    const sequence = ++state.request;
    ++state.floridaRequest;
    state.floridaController?.abort();
    state.floridaController=null;
    state.floridaEvidence=null;
    const params = new URLSearchParams();
    if (region && validRegions.has(region)) params.set('region', region);
    if (launchId) params.set('launchId', launchId);
    const url = API + (params.size ? '?' + params.toString() : '');
    $('rl-launch-select').disabled = true;
    $('rl-access-quick')?.replaceChildren(el('p','rl-access-quick-empty',
      'Checking public viewing locations for the selected mission…'));
    let responseStatus=0;
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      responseStatus=response.status;
      const data = await response.json();
      if (sequence !== state.request) return;
      if (!response.ok || !data.ok) throw new Error(data.error || 'Launch data unavailable');
      render(data);
      document.dispatchEvent(new CustomEvent('rocket-truth:mission-selected',{
        detail:{launchId:data.selectedLaunchId||null,
          net:data.selectedLaunch?.net||null,
          netPrecision:data.selectedLaunch?.netPrecision||null,
          timezone:data.region?.timezone||'America/New_York'}
      }));
      syncUrl(data.selectedRegion, data.selectedLaunchId);
    } catch (err) {
      if (sequence !== state.request) return;
      // A previously selected mission may have vanished or the shared source
      // may be offline. Retaining clickable old rockets would imply a current
      // schedule after this request has explicitly failed.
      state.rocketPins?.update([],null);
      state.data=null;
      state.scheduleFailed=true;
      updateAtlasStatus();
      renderFrontSchedule(null);
      document.dispatchEvent(new CustomEvent('rocket-truth:mission-selected',
        {detail:{launchId:null}}));
      document.dispatchEvent(new CustomEvent('rocket-viewing:data',{detail:null}));
      document.dispatchEvent(new CustomEvent('rocket-viewing:failure',
        {detail:{removed:responseStatus===404,region,reason:responseStatus===404?'removed':'unavailable'}}));
      chip($('rl-schedule-grade'), 'Schedule temporarily unavailable', 'unknown');
      renderVisuals(null);
      set('rl-watch-status', 'Media unavailable');
      set('rl-watch-evidence', 'No current mission-media response. Use the operator or official launch source.');
      $('rl-watch-mission-videos')?.replaceChildren(el('p', 'rl-watch-empty', 'Video listing unavailable; not a claim that there is no broadcast.'));
      $('rl-watch-general')?.replaceChildren();
      chip($('rl-access-grade'), 'Official access must be checked', 'unknown');
      $('rl-access-answer')?.replaceChildren();
      $('rl-access-quick')?.replaceChildren(el('p','rl-access-quick-empty',
        'The selected mission could not be verified. No current access or viewing-site opening is established. Use the official regional guide before making a trip.'));
      set('rl-access-summary','The selected mission could not be verified. No public viewing access can be confirmed.');
      chip($('rl-weather-grade'), 'No current forecast', 'unknown');
      set('rl-slip-brief','Delay comparisons unavailable until the mission and weather sources can be checked.');
      $('rl-slip-options')?.replaceChildren();
      $('rl-slip-detail')?.replaceChildren(el('p','rl-slip-empty','No verified current forecast data for delay scenarios.'));
      chip($('rl-range-grade'), 'Launch-side forecast unavailable', 'unknown');
      set('rl-range-headline', 'Current launch-side evidence unavailable');
      set('rl-range-summary', 'The launch schedule or forecast request failed. Consult official launch weather and range notices.');
      if ($('rl-official-wrap')) $('rl-official-wrap').hidden = true;
      $('rl-range-readings')?.replaceChildren();
      $('rl-range-signals')?.replaceChildren();
      $('rl-range-timeline')?.replaceChildren();
      set('rl-schedule-detail', 'The national launch feed could not be verified right now. Check the launch operator and range authorities before planning travel.');
      set('rl-national-next', 'Live schedule unavailable');
      set('rl-feed-health', 'Source check failed');
      set('rl-updated-at', 'Not verified');
      set('rl-schedule-coverage', err.message + ' Official NASA and launch-range pages linked below remain the primary authority.');
      const mapRoot=$('rl-coast-map');
      if(mapRoot&&!state.map){
        mapRoot.dataset.mapState='source-unavailable';
        mapRoot.replaceChildren(el('div','rl-map-fallback',
          'The launch calendar is unavailable, so no current rocket locations can be shown. Use the coast buttons above and check official launch sources.'));
      }
      const root = $('rl-national-board');
      if (root && !state.data) root.textContent = 'National provider temporarily unavailable. Recheck the official NASA, Space Force, Starbase and Alaska Aerospace launch notices.';
      $('rl-launch-select').disabled = true;
    }
  }
  function changeRegion(region, scroll, surface='coast_picker') {
    if (!validRegions.has(region)) return;
    document.dispatchEvent(new CustomEvent('rocket-experience:region-selected',{detail:{region,surface}}));
    state.userFocusedMap = true;
    load(region);
    if (scroll) $('choose-coast')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('.rl-region-btn[data-region]').forEach(b =>
    b.addEventListener('click', () => changeRegion(b.dataset.region, false, 'coast_picker')));
  $('rl-launch-select')?.addEventListener('change', event => {
    const id=event.target.value;
    if(id){state.userFocusedMap=true;void load(state.data?.selectedRegion,id);}
  });
  document.addEventListener('rocket-map:choose-mission',event=>{
    const id=event.detail?.launchId,region=event.detail?.region;
    if(validRegions.has(region)&&state.data?.regions.some(r=>(r.launches||[]).some(m=>m.id===id&&m.region===region))){
      state.userFocusedMap=true;void load(region,id);
    }
  });
  // Experience OS v1.2.1: a first-screen mission selector and map handoff
  // must use the SAME validated ID and fetch pipeline as the native roster,
  // source/visitor desks and map. Never create a parallel schedule API.
  document.addEventListener('rocket-experience:choose',event=>{
    const region=event.detail?.region,id=event.detail?.launchId;
    const selected=state.data?.regions?.find(r=>r.id===region);
    if(!validRegions.has(region)||!selected?.launches?.some(l=>l.id===id))return;
    state.userFocusedMap=true;
    void load(region,id);
  });
  document.addEventListener('rocket-experience:locate',event=>{
    const region=event.detail?.region,id=event.detail?.launchId;
    if(!state.data||state.data.selectedLaunchId!==id||state.data.selectedRegion!==region)return;
    state.userFocusedMap=true;
    const map=$('rl-coast-map');
    const focused=Boolean(state.map&&state.rocketPins?.focusSelected());
    document.dispatchEvent(new CustomEvent('rocket-experience:locate-result',{detail:{region,focused}}));
    if(focused){
      map?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      map?.focus({preventScroll:true});
    }else{
      // The same coast buttons and source links remain usable without map tiles.
      const source=$('rl-region-picker');
      source?.scrollIntoView({behavior:'auto',block:'start'});
      const chosen=source?.querySelector('[aria-pressed="true"]');
      chosen?.focus({preventScroll:true});
    }
  });
  const initial = new URL(location.href);
  const region = validRegions.has(initial.searchParams.get('region')) ?
    initial.searchParams.get('region') : null;
  state.userFocusedMap = Boolean(region);
  const launch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    initial.searchParams.get('launchId') || '') ? initial.searchParams.get('launchId') : null;
  initMap(); // Geographic reference does not depend on live launch data.
  loadVisualCatalog();
  void loadOfficialEvidence();
  load(region, launch);
})();
