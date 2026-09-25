(function () {
  'use strict';

  if (!window.L || typeof window.L.map !== 'function') return;

  const DHC_BASE = 'https://www.duluthharborcam.com';
  const CAMERA_API = '/api/duluth-camera';
  const PRIMARY_CANAL_CAMERA_TITLE = 'Canal Cam — Maritime Visitor Center';
  const INDEPENDENT_SHIP_CAM = {
    id: 'lodge',
    name: 'Ship Cam — Lift Bridge Lodge',
    shortName: 'Ship Cam',
    lat: 46.7818492,
    lon: -92.0929547,
    embedUrl: 'https://www.youtube-nocookie.com/embed/H6cm5Hf-yFY?autoplay=1&mute=1&rel=0'
  };

  const FEEDS = [
    { id: 'canal', name: 'Canal Cam', siteId: 'visitor-center', url: `${DHC_BASE}/p/canal-park-cams.html` },
    { id: 'bridge', name: 'Bridge Cam', siteId: 'visitor-center', url: `${DHC_BASE}/p/bridge-cam.html` },
    { id: 'lighthouse', name: 'Lighthouse Cam', siteId: 'visitor-center', url: `${DHC_BASE}/p/lighthouse-cam.html` },
    { id: 'south-pier', name: 'South Pier Lighthouse Cam', siteId: 'south-pier', url: `${DHC_BASE}/p/south-pier-lighthouse-cam.html` },
    { id: 'gla', name: 'GLA / Harbor Plaza Cam', siteId: 'gla', url: `${DHC_BASE}/p/great-lakes-aquarium.html` },
    { id: 'pier-b', name: 'Pier B Cam', siteId: 'pier-b', url: `${DHC_BASE}/p/pier-b-cam.html` },
    { id: 'bayfront', name: 'Bayfront Cam', siteId: 'hillside', url: `${DHC_BASE}/p/dualc.html` },
    { id: 'hillside', name: 'Hillside Cam', siteId: 'hillside', url: `${DHC_BASE}/p/hillside-can.html` },
    { id: 'harbor', name: 'Harbor Cam', siteId: 'hillside', url: `${DHC_BASE}/p/harbor-cam.html` },
    { id: 'cargo-connect', name: 'Duluth Cargo Connect', siteId: 'cargo', url: `${DHC_BASE}/p/duluth-cargo-connect.html` },
    { id: 'western-harbor', name: 'Western Harborcam', siteId: 'western', url: `${DHC_BASE}/p/western-harborcam.html` },
    { id: 'ami', name: 'AMI / Connors Point Cam', siteId: 'ami', url: `${DHC_BASE}/p/ami-cam.html` },
    { id: 'fairlawn', name: 'Fairlawn Cam', siteId: 'fairlawn', url: `${DHC_BASE}/p/fairlawn-cam.html` },
    { id: 'two-harbors-boat', name: 'Two Harbors Boat Launch', siteId: 'two-harbors-boat', url: `${DHC_BASE}/p/two-harbors-boat.html` },
    { id: 'wisconsin-point', name: 'Wisconsin Point Cam', siteId: 'wisconsin-point', url: `${DHC_BASE}/p/wisconsin-point-cam.html` },
    { id: 'split-rock', name: 'Split Rock Lighthouse Cam', siteId: 'split-rock', url: `${DHC_BASE}/p/split-rock-lighthouse-cam.html` },
    { id: 'two-harbors-depot', name: 'Two Harbors Depot Cam', siteId: 'two-harbors-depot', url: `${DHC_BASE}/p/two-harbors-depot-cam.html` },
    { id: 'silver-bay', name: 'Silver Bay Marina Cam', siteId: 'silver-bay', url: `${DHC_BASE}/p/silver-bay-marina-cam.html` }
  ];

  const SITES = [
    { id: 'visitor-center', name: 'Lake Superior Maritime Visitor Center', lat: 46.779847, lon: -92.092464, scope: 'twin-ports', note: 'Canal, Bridge and Lighthouse cameras share the Visitor Center rooftop area.' },
    { id: 'south-pier', name: 'Duluth South Pier Outer Lighthouse', lat: 46.78008, lon: -92.08755, scope: 'twin-ports', note: 'South Pier Lighthouse camera.' },
    { id: 'gla', name: 'Great Lakes Aquarium / Harbor Plaza', lat: 46.77896, lon: -92.10009, scope: 'twin-ports', note: 'Harbor Plaza view from the Great Lakes Aquarium.' },
    { id: 'pier-b', name: 'Pier B Resort', lat: 46.776533, lon: -92.103277, scope: 'twin-ports', note: 'Pier B harbor view.' },
    { id: 'hillside', name: 'Duluth Hillside camera hub', lat: 46.78667, lon: -92.10049, scope: 'twin-ports', approximate: true, note: 'Bayfront, Hillside and Harbor feeds originate from the Duluth hillside camera hub. Marker is site-level because the operator does not publish a precise mount point in the camera descriptions.' },
    { id: 'cargo', name: 'Duluth Cargo Connect / Port Terminal', lat: 46.7609, lon: -92.1013, scope: 'twin-ports', approximate: true, note: 'Port Terminal loading-area camera. Marker is facility-level rather than a surveyed camera mount.' },
    { id: 'western', name: 'Lincoln Park Middle School', lat: 46.762758, lon: -92.149447, scope: 'twin-ports', note: 'Western Harborcam.' },
    { id: 'ami', name: 'AMI / Connors Point', lat: 46.747776, lon: -92.099182, scope: 'twin-ports', note: 'Connors Point view in Superior near the Blatnik Bridge.' },
    { id: 'fairlawn', name: 'Fairlawn Mansion', lat: 46.717964, lon: -92.063027, scope: 'twin-ports', note: 'Fairlawn camera overlooking Barker’s Island and the harbor area.' },
    { id: 'wisconsin-point', name: 'Wisconsin Point / Superior Entry', lat: 46.710139, lon: -92.00639, scope: 'twin-ports', note: 'Superior Entry / Wisconsin Point view.' },
    { id: 'two-harbors-boat', name: 'Two Harbors Boat Launch', lat: 47.0151, lon: -91.6655, scope: 'north-shore', note: 'Agate Bay public water access / boat-launch view.' },
    { id: 'two-harbors-depot', name: 'Two Harbors Depot', lat: 47.018963, lon: -91.671181, scope: 'north-shore', note: 'Historic depot camera in Two Harbors.' },
    { id: 'split-rock', name: 'Split Rock Lighthouse', lat: 47.20018, lon: -91.36677, scope: 'north-shore', note: 'Split Rock Lighthouse camera.' },
    { id: 'silver-bay', name: 'Silver Bay Marina', lat: 47.29575, lon: -91.27152, scope: 'north-shore', note: 'Silver Bay Marina camera.' }
  ];

  const feedsBySite = new Map();
  FEEDS.forEach(feed => {
    if (!feedsBySite.has(feed.siteId)) feedsBySite.set(feed.siteId, []);
    feedsBySite.get(feed.siteId).push(feed);
  });

  const embedCache = new Map();
  let boatMap = null;
  const siteMarkers = new Map();
  const originalMapFactory = window.L.map;

  function cameraSiteIcon(site) {
    return L.divIcon({
      className: `camera-network-marker${site.scope === 'north-shore' ? ' is-regional' : ''}`,
      html: '<span>CAM</span>',
      iconSize: [42, 30],
      iconAnchor: [21, 15],
      popupAnchor: [0, -16]
    });
  }

  function autoplayUrl(value) {
    const url = new URL(value, window.location.href);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '1');
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('rel', '0');
    return url.toString();
  }

  function playerFrame(feedName, embedUrl) {
    const frame = document.createElement('iframe');
    frame.src = autoplayUrl(embedUrl);
    frame.title = `${feedName} live stream`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    return frame;
  }

  function popOut(url) {
    const popup = window.open(autoplayUrl(url), 'duluthCameraPopout', 'popup=yes,width=1100,height=700,noopener,noreferrer,resizable=yes,scrollbars=yes');
    if (popup) popup.opener = null;
  }

  async function resolveEmbed(feed) {
    if (embedCache.has(feed.id)) return embedCache.get(feed.id);
    const response = await fetch(`${CAMERA_API}?feed=${encodeURIComponent(feed.id)}`, { signal: AbortSignal.timeout(9000) });
    const data = await response.json();
    if (!response.ok || !data?.ok || !data.embedUrl) throw new Error(data?.error || 'Live video unavailable');
    embedCache.set(feed.id, data.embedUrl);
    return data.embedUrl;
  }

  function liveCameraPopup(title, note, feeds) {
    const wrap = document.createElement('div');
    wrap.className = 'camera-live-popup';

    const heading = document.createElement('strong');
    heading.className = 'camera-live-title';
    heading.textContent = title;
    wrap.append(heading);

    if (note) {
      const context = document.createElement('p');
      context.className = 'camera-live-note';
      context.textContent = note;
      wrap.append(context);
    }

    const tabs = document.createElement('div');
    tabs.className = 'camera-live-tabs';
    if (feeds.length > 1) wrap.append(tabs);

    const player = document.createElement('div');
    player.className = 'camera-live-player';
    wrap.append(player);

    const actions = document.createElement('div');
    actions.className = 'camera-live-actions';
    const pop = document.createElement('button');
    pop.type = 'button';
    pop.className = 'camera-popup-popout';
    pop.textContent = 'Pop out';
    pop.disabled = true;
    actions.append(pop);
    wrap.append(actions);

    let activeId = '';
    let loadToken = 0;

    function activate(feed) {
      activeId = feed.id;
      const token = ++loadToken;
      tabs.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.feedId === feed.id));
      pop.disabled = true;
      pop.onclick = null;
      player.replaceChildren();
      const state = document.createElement('div');
      state.className = 'camera-live-loading';
      state.textContent = 'Starting live camera…';
      player.append(state);

      const mount = embedUrl => {
        if (token !== loadToken || activeId !== feed.id) return;
        player.replaceChildren(playerFrame(feed.name, embedUrl));
        pop.disabled = false;
        pop.onclick = () => popOut(embedUrl);
      };

      const direct = feed.embedUrl ? Promise.resolve(feed.embedUrl) : resolveEmbed(feed);
      direct.then(mount).catch(() => {
        if (token !== loadToken || activeId !== feed.id) return;
        const error = document.createElement('div');
        error.className = 'camera-live-loading is-error';
        error.textContent = 'Live video unavailable right now.';
        player.replaceChildren(error);
        pop.disabled = true;
      });
    }

    feeds.forEach(feed => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.dataset.feedId = feed.id;
      tab.textContent = feed.name;
      tab.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        activate(feed);
      });
      tabs.append(tab);
    });

    activate(feeds[0]);
    return wrap;
  }

  function sitePopup(site) {
    const feeds = feedsBySite.get(site.id) || [];
    const notes = [site.note];
    if (site.approximate) notes.push('Map position is approximate at the published facility/site level.');
    return liveCameraPopup(site.name, notes.filter(Boolean).join(' '), feeds);
  }

  function independentPopup() {
    return liveCameraPopup(INDEPENDENT_SHIP_CAM.name, 'Independent Ship Cam from the Canal Park side of the bridge.', [{
      id: INDEPENDENT_SHIP_CAM.id,
      name: INDEPENDENT_SHIP_CAM.shortName,
      embedUrl: INDEPENDENT_SHIP_CAM.embedUrl
    }]);
  }

  function feedLink(feed) {
    const a = document.createElement('a');
    a.href = feed.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = `${feed.name} →`;
    a.className = 'camera-network-feed';
    return a;
  }

  function injectStyles() {
    if (document.getElementById('duluthCameraNetworkStyles')) return;
    const style = document.createElement('style');
    style.id = 'duluthCameraNetworkStyles';
    style.textContent = `
      .camera-network-marker{background:transparent;border:0}.camera-network-marker span{height:30px;min-width:42px;padding:0 7px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:#6a4c86;color:#fff;border:2px solid #fff;box-shadow:0 2px 9px rgba(18,52,64,.4);font:700 10px/1 Arial,sans-serif;white-space:nowrap}.camera-network-marker.is-regional span{background:#4d617e}
      .camera-live-popup{width:min(340px,76vw);font:12px/1.35 Arial,sans-serif}.camera-live-title{display:block;color:#173f50;font-size:14px;margin:0 0 4px}.camera-live-note{margin:0 0 7px!important;color:#647178!important;font-size:11px!important}.camera-live-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 7px}.camera-live-tabs button{border:1px solid #bac8cc;background:#fff;color:#245b70;border-radius:999px;padding:4px 7px;font:700 10px Arial,sans-serif;cursor:pointer}.camera-live-tabs button.is-active{background:#173f50;color:#fff;border-color:#173f50}.camera-live-player{width:100%;aspect-ratio:16/9;background:#102d38;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center}.camera-live-player iframe{display:block;width:100%;height:100%;border:0}.camera-live-loading{padding:14px;text-align:center;color:#dbe9ed;font:700 11px/1.4 Arial,sans-serif}.camera-live-loading.is-error{color:#f1d4cf}.camera-live-actions{display:flex;justify-content:flex-end;margin-top:7px}.camera-popup-popout{border:1px solid #173f50;background:#173f50;color:#fff;border-radius:3px;padding:6px 10px;font:700 11px Arial,sans-serif;cursor:pointer}.camera-popup-popout:disabled{opacity:.45;cursor:wait}
      .camera-network-panel{border-top:1px solid #d7dcdd;padding:10px 14px 14px;background:#f8faf9}.camera-network-panel summary{cursor:pointer;color:#1b5368;font:700 12px Arial,sans-serif}.camera-network-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 12px;margin-top:10px}.camera-network-links a{font:700 11px/1.35 Arial,sans-serif}.camera-network-note{margin-top:8px!important;color:#778186!important}.camera-network-count{font-weight:700}.camera-network-control{border-color:#bfcad0!important}.camera-network-control.is-network{background:#6a4c86!important;color:#fff!important;border-color:#6a4c86!important}@media(max-width:700px){.camera-network-links{grid-template-columns:1fr 1fr}.camera-live-popup{width:min(320px,74vw)}}
    `;
    document.head.append(style);
  }

  function findMarkerByTitle(title) {
    if (!boatMap || typeof boatMap.eachLayer !== 'function') return null;
    let match = null;
    boatMap.eachLayer(layer => {
      if (match || !layer || !layer.options) return;
      if (layer.options.title === title && typeof layer.bindPopup === 'function') match = layer;
    });
    return match;
  }

  function bindCameraPopup(marker, popupFactory) {
    if (!marker) return null;
    if (typeof marker.unbindPopup === 'function') marker.unbindPopup();
    if (typeof marker.setZIndexOffset === 'function') marker.setZIndexOffset(1800);
    marker.bindPopup(popupFactory, { maxWidth: 380, minWidth: 305, autoPanPadding: [24, 24] });
    return marker;
  }

  function adoptPrimaryCanalMarker(site) {
    const marker = findMarkerByTitle(PRIMARY_CANAL_CAMERA_TITLE);
    if (!marker) return null;
    const feeds = feedsBySite.get(site.id) || [];
    if (typeof marker.unbindTooltip === 'function') marker.unbindTooltip();
    marker.bindTooltip(`${site.name} · ${feeds.length} cams`, { direction: 'top' });
    bindCameraPopup(marker, () => sitePopup(site));
    siteMarkers.set(site.id, marker);
    return marker;
  }

  function adoptIndependentShipMarker() {
    const marker = findMarkerByTitle(INDEPENDENT_SHIP_CAM.name);
    return bindCameraPopup(marker, () => independentPopup());
  }

  function addSiteMarkers() {
    if (!boatMap || typeof L === 'undefined') return;
    SITES.forEach(site => {
      if (siteMarkers.has(site.id)) return;
      if (site.id === 'visitor-center' && adoptPrimaryCanalMarker(site)) return;
      const marker = L.marker([site.lat, site.lon], {
        icon: cameraSiteIcon(site),
        keyboard: true,
        title: `${site.name} camera site`,
        zIndexOffset: site.scope === 'north-shore' ? 1700 : 1800
      }).addTo(boatMap).bindTooltip(`${site.name} · ${(feedsBySite.get(site.id) || []).length} cam${(feedsBySite.get(site.id) || []).length === 1 ? '' : 's'}`, { direction: 'top' });
      bindCameraPopup(marker, () => sitePopup(site));
      siteMarkers.set(site.id, marker);
    });
    adoptIndependentShipMarker();
  }

  function allBounds() {
    return [...SITES.map(site => [site.lat, site.lon]), [INDEPENDENT_SHIP_CAM.lat, INDEPENDENT_SHIP_CAM.lon]];
  }

  function focusNetwork() {
    if (!boatMap) return;
    boatMap.fitBounds(allBounds(), { padding: [42, 42], maxZoom: 10 });
    const node = document.getElementById('duluthVesselMap');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => boatMap && boatMap.invalidateSize(), 250);
  }

  function buildFeedPanel() {
    const monitor = document.getElementById('cameraMonitor');
    if (!monitor || monitor.querySelector('.camera-network-panel')) return;
    const panel = document.createElement('div');
    panel.className = 'camera-network-panel';
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.innerHTML = '<span class="camera-network-count">18 Duluth Harbor Cam feeds</span> across 14 mapped sites — browse all';
    details.append(summary);
    const links = document.createElement('div');
    links.className = 'camera-network-links';
    FEEDS.forEach(feed => links.append(feedLink(feed)));
    details.append(links);
    const note = document.createElement('p');
    note.className = 'camera-network-note';
    note.textContent = 'Click a CAM marker and the live video starts in that map bubble. Pop out opens that same video larger. The existing Ship Cam is an additional independent feed, so the monitor exposes 19 camera feeds in total. Markers identify the named host site or landmark, not a surveyed camera mount point; Hillside and Cargo Connect are explicitly approximate facility/site positions. Regional North Shore cameras stay off the default Canal Park extent until you choose Camera network.';
    details.append(note);
    panel.append(details);
    monitor.append(panel);
  }

  function patchStaticCopy() {
    const visual = document.getElementById('monitorVisual');
    if (visual) {
      const title = visual.querySelector('.monitor-title');
      const detail = visual.querySelector('.monitor-detail');
      if (title) title.textContent = '19 mapped camera feeds';
      if (detail) detail.textContent = 'Click a CAM marker to play its live view immediately. 18 Duluth Harbor Cam feeds across 14 sites + the independent Ship Cam.';
    }

    const focus = document.getElementById('focusCameras');
    if (focus) {
      focus.textContent = 'Camera network';
      focus.classList.add('camera-network-control', 'is-network');
    }

    const status = document.getElementById('mapStatus');
    if (status && /2 cameras|2 camera locations/.test(status.textContent)) {
      status.textContent = status.textContent.replace(/2 camera locations/g, '19 camera feeds / 15 sites').replace(/2 cameras/g, '19 camera feeds / 15 sites');
    }

    const watchPick = document.getElementById('watchPick');
    if (watchPick) {
      watchPick.querySelectorAll('.watch-note').forEach(note => {
        if (/both live camera locations/.test(note.textContent || '')) {
          note.textContent = (note.textContent || '').replace('both live camera locations', 'both primary live camera views, the wider mapped camera network');
        }
      });
    }

    document.querySelectorAll('.source-item').forEach(item => {
      const heading = item.querySelector('strong');
      if (!heading || heading.textContent !== 'Duluth Harbor Cam') return;
      const span = item.querySelector('span');
      if (span) span.textContent = 'Complete mapped “Our Live Cams” network: 18 named feeds across Canal Park, the Twin Ports and the North Shore.';
    });
  }

  function interceptControls() {
    const focus = document.getElementById('focusCameras');
    if (focus && !focus.dataset.cameraNetworkBound) {
      focus.dataset.cameraNetworkBound = 'true';
      focus.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        focusNetwork();
      }, true);
    }

    const visual = document.getElementById('monitorVisual');
    if (visual && !visual.dataset.cameraNetworkBound) {
      visual.dataset.cameraNetworkBound = 'true';
      visual.addEventListener('click', event => {
        const jump = event.target.closest('.map-jump');
        if (!jump) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        focusNetwork();
      }, true);
    }
  }

  function observeCopy() {
    const targets = [document.getElementById('monitorVisual'), document.getElementById('mapStatus'), document.getElementById('watchPick')].filter(Boolean);
    if (!targets.length) return;
    const observer = new MutationObserver(() => window.requestAnimationFrame(() => {
      patchStaticCopy();
      interceptControls();
    }));
    targets.forEach(target => observer.observe(target, { childList: true, subtree: true, characterData: true }));
  }

  function attach(map) {
    boatMap = map;
    injectStyles();
    window.setTimeout(() => {
      addSiteMarkers();
      buildFeedPanel();
      patchStaticCopy();
      interceptControls();
      observeCopy();
    }, 0);
  }

  function wrappedMapFactory(id, options) {
    const instance = originalMapFactory.call(window.L, id, options);
    const targetId = typeof id === 'string' ? id : id && id.id;
    if (targetId === 'duluthVesselMap') attach(instance);
    return instance;
  }

  Object.assign(wrappedMapFactory, originalMapFactory);
  window.L.map = wrappedMapFactory;

  window.DuluthCameraNetwork = Object.freeze({
    feedCount: FEEDS.length,
    siteCount: SITES.length,
    focus: focusNetwork
  });
})();
