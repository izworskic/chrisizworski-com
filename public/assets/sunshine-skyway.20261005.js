(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const els = {
    direction: $('direction'), vehicle: $('vehicle'), refresh: $('refresh'),
    statusPanel: $('statusPanel'), freshness: $('freshness'), statusWord: $('statusWord'), statusHeading: $('statusHeading'), statusCopy: $('statusCopy'),
    operationalSignal: $('operationalSignal'), officialText: $('officialText'),
    vehicleTitle: $('vehicleTitle'), vehicleResult: $('vehicleResult'), vehicleState: $('vehicleState'), vehicleReason: $('vehicleReason'),
    trafficTitle: $('trafficTitle'), trafficCopy: $('trafficCopy'), mentionMetric: $('mentionMetric'), sourceMetric: $('sourceMetric'),
    axles: $('axles'), payment: $('payment'), tollHeadline: $('tollHeadline'), plazaCopy: $('plazaCopy'), tollResult: $('tollResult'), tollNote: $('tollNote'),
    windRisk: $('windRisk'), maxWind: $('maxWind'), forecast: $('forecast'), events: $('events'), cameras: $('cameras'),
    tripDecision: $('tripDecision'), tripReason: $('tripReason'), outlookItems: $('outlookItems'),
    routeContext: $('routeContext'), routeSteps: $('routeSteps'), routePlanner: $('routePlanner'), shareTrip: $('shareTrip'),
  };
  let requestSerial = 0;
  let selectedCameraId = null;
  let activeHls = null;
  let hlsLoaderPromise = null;
  let cameraRefreshTimer = null;
  let cameraPlaybackTimer = null;
  const HLS_JS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  function fmtTime(value) {
    if (!value) return 'time unavailable';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'time unavailable';
    return new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', timeZoneName:'short', hour:'numeric', minute:'2-digit', month:'short', day:'numeric' }).format(date);
  }
  function params() {
    return new URLSearchParams({
      direction: els.direction.value,
      vehicle: els.vehicle.value,
      axles: els.axles.value,
      payment: els.payment.value,
    });
  }
  function setTone(tone) { els.statusPanel.className = `status-panel ${tone}`; }

  function renderStatus(data) {
    const status = data.officialStatus || {};
    let word = 'UNKNOWN';
    let tone = 'unknown';
    let headline = 'Official Skyway status is unavailable.';
    let copy = 'Use FL511 and follow law-enforcement direction before relying on this page.';
    if (status.state === 'CLOSED') {
      word = 'CLOSED'; tone = 'danger';
      headline = 'An explicit official Sunshine Skyway closure signal was found.';
      copy = 'Do not proceed on the assumption you can cross. Follow FL511, road signs and law enforcement.';
    } else if (status.state === 'IMPACTED') {
      word = 'IMPACTED'; tone = 'warn';
      headline = 'FL511 is reporting a Skyway-specific traffic impact.';
      copy = 'The bridge is not being labeled closed unless an explicit closure signal is present.';
    } else if (status.state === 'NO_CLOSURE_SIGNAL_FOUND') {
      word = 'NO CLOSURE SIGNAL'; tone = 'ok';
      headline = status.reason === 'EXPLICIT_OFFICIAL_REOPEN_SIGNAL' ? 'An official source reports the prior closure cleared.' : 'No explicit Sunshine Skyway closure signal was found in the live official sources checked.';
      copy = 'This is deliberately not a weather-derived “OPEN” declaration. Conditions can change quickly.';
    }
    setTone(tone);
    els.statusWord.textContent = word;
    els.statusHeading.textContent = headline;
    els.statusCopy.textContent = copy;
    els.operationalSignal.textContent = status.label || 'Unknown';
    els.officialText.textContent = status.officialText || (status.staleSignals?.length ? 'Only stale Skyway evidence was available; it was not promoted into the current operational state.' : 'No explicit bridge-specific operational message was returned.');
    els.freshness.textContent = `Page snapshot ${fmtTime(data.generatedAt)}`;
  }

  function renderVehicle(vehicle) {
    const state = vehicle?.state || 'UNKNOWN';
    const title = {
      PROHIBITED: 'Do not cross in this vehicle',
      CAUTION: 'Use extra wind caution',
      NO_SPECIAL_RESTRICTION_FOUND: 'No class-specific restriction applied',
      UNKNOWN: 'Vehicle result unavailable',
    }[state] || 'Vehicle context';
    els.vehicleTitle.textContent = title;
    els.vehicleState.textContent = vehicle?.label || state.replaceAll('_', ' ');
    els.vehicleReason.textContent = vehicle?.reason || 'No vehicle context returned.';
    els.vehicleResult.className = 'vehicle-result';
    if (state === 'PROHIBITED') els.vehicleResult.classList.add('prohibited');
    else if (state === 'CAUTION' || state === 'UNKNOWN') els.vehicleResult.classList.add('caution');
    else els.vehicleResult.classList.add('allowed');
  }

  function renderTraffic(traffic, sourceHealth) {
    const mentions = traffic?.officialMentions || [];
    const alertsState = sourceHealth?.alerts?.state || 'unavailable';
    const trafficState = sourceHealth?.traffic?.state || 'unavailable';
    const speedsState = sourceHealth?.trafficSpeeds?.state || 'unavailable';
    const eventLiveCount = [alertsState, trafficState].filter(state => state === 'ok').length;
    const sourceLiveCount = eventLiveCount + (speedsState === 'ok' ? 1 : 0);
    const flow = traffic?.flow || {};
    const selected = flow?.selected || {};
    const flowUsable = selected.state && selected.state !== 'UNAVAILABLE' && speedsState === 'ok';
    const directionLabel = flow?.selectedDirection === 'southbound' ? 'southbound' : 'northbound';
    const noEvent = eventLiveCount === 2 && mentions.length === 0;
    els.mentionMetric.textContent = String(mentions.length);
    els.sourceMetric.textContent = `${sourceLiveCount}/3 live`;

    if (traffic?.state === 'CLOSED') {
      els.trafficTitle.textContent = 'Official bridge closure signal';
      els.trafficCopy.textContent = 'The closure state above is based on explicit Sunshine Skyway language from an official FL511 source.';
      return;
    }
    if (traffic?.state === 'ACTIVE_IMPACT') {
      els.trafficTitle.textContent = 'Active Skyway traffic impact';
      els.trafficCopy.textContent = 'FL511 returned bridge-specific impact language. Read the current evidence below.';
      return;
    }

    if (flowUsable) {
      els.trafficTitle.textContent = selected.label || 'Live Skyway traffic';
      const eventSuffix = noEvent ? ' No Skyway-specific crash, closure or traffic event is being reported in the two event feeds.' : '';
      const coverageSuffix = speedsState === 'ok' ? '' : ' Speed-layer coverage is partial, so treat this as directional context.';
      const copy = {
        MOVING_WELL: `FL511's live Traffic Speeds layer shows ${directionLabel} traffic moving well across the Skyway.`,
        SOME_SLOWING: `FL511's live Traffic Speeds layer is showing some slower ${directionLabel} segments on the Skyway.`,
        HEAVY_SLOWING: `FL511's live Traffic Speeds layer is showing heavy ${directionLabel} slowing on at least part of the Skyway.`,
        STOP_AND_GO: `FL511's live Traffic Speeds layer is showing stop-and-go ${directionLabel} traffic on the Skyway.`,
        MIXED: `FL511's live Traffic Speeds layer is mixed ${directionLabel}; some sampled bridge segments are moving differently from others.`,
      }[selected.state] || `FL511's live Traffic Speeds layer is available for the ${directionLabel} crossing.`;
      els.trafficCopy.textContent = `${copy}${eventSuffix}${coverageSuffix} We do not turn the map colors into made-up mph or delay minutes.`;
      return;
    }

    if (eventLiveCount === 2) {
      els.trafficTitle.textContent = 'Nothing specific is being reported on the Skyway';
      els.trafficCopy.textContent = "We checked both live FL511 event feeds. Neither is showing a Skyway-specific crash, closure or traffic event right now. The Traffic Speeds layer is unavailable or not fresh enough to use, so we do not guess at congestion or delay.";
    } else {
      els.trafficTitle.textContent = 'Traffic source coverage is partial';
      els.trafficCopy.textContent = 'Open FL511 before traveling if current traffic conditions are important to your decision.';
    }
  }

  function renderToll(toll) {
    const directionLabel = toll?.direction === 'southbound' ? 'Southbound toll' : 'Northbound toll';
    els.tollHeadline.textContent = directionLabel;
    els.tollResult.textContent = toll?.amount == null ? 'Check official rate' : `$${Number(toll.amount).toFixed(2)}`;
    els.plazaCopy.textContent = toll?.plaza ? `${toll.plaza}. One charge for the one-way crossing.` : 'The bridge charges once per one-way crossing.';
    els.tollNote.textContent = toll?.note || 'Florida’s Turnpike rate table · effective Apr. 12, 2026.';
  }

  function windLabel(level) {
    return ({
      HIGH_WIND_CLOSURE_RISK_CONTEXT: 'High-wind risk',
      ELEVATED_WIND_CONTEXT: 'Elevated',
      ROUTINE_CONTEXT: 'Routine',
      UNAVAILABLE: 'Unavailable',
    })[level] || 'Unknown';
  }

  function renderWind(context) {
    els.windRisk.textContent = windLabel(context?.level);
    els.maxWind.textContent = context?.maxWindMph != null ? `${Math.round(context.maxWindMph)} mph` : '—';
    const periods = context?.periods || [];
    if (!periods.length) {
      els.forecast.innerHTML = '<p class="empty">NWS forecast context is unavailable. The operational bridge state above is not replaced by weather.</p>';
      return;
    }
    els.forecast.innerHTML = periods.slice(0, 4).map(period => {
      const when = period.startTime ? new Date(period.startTime).toLocaleTimeString('en-US', { hour:'numeric', timeZone:'America/New_York', timeZoneName:'short' }) : period.name || 'Forecast';
      return `<div class="forecast-item"><strong>${esc(when)}</strong><span>${period.temperature != null ? `${esc(period.temperature)}°${esc(period.temperatureUnit || 'F')}` : 'temp n/a'}</span><span>${esc(period.windSpeed || 'wind n/a')} ${esc(period.windDirection || '')}</span><span>${esc(period.shortForecast || '')}</span></div>`;
    }).join('');
  }

  function renderEvents(traffic, windContext) {
    const items = [];
    for (const mention of (traffic?.officialMentions || []).slice(0, 5)) {
      items.push(`<div class="list-item"><strong>FL511 · ${esc(mention.level || 'Skyway mention')}</strong><span>${esc(mention.text || '')}</span></div>`);
    }
    for (const alert of (windContext?.alerts || []).slice(0, Math.max(0, 5 - items.length))) {
      items.push(`<div class="list-item"><strong>NWS · ${esc(alert.event || 'Weather alert')}</strong><span>${esc(alert.headline || 'Active weather alert')}</span><p>${esc(alert.severity || '')}${alert.expires ? ` · expires ${esc(fmtTime(alert.expires))}` : ''}</p></div>`);
    }
    els.events.innerHTML = items.length ? items.join('') : '<p class="empty">No Sunshine Skyway-specific FL511 mention or active NWS alert was returned in this snapshot.</p>';
  }

  function destroyHls() {
    if (cameraRefreshTimer) clearInterval(cameraRefreshTimer);
    cameraRefreshTimer = null;
    if (cameraPlaybackTimer) clearTimeout(cameraPlaybackTimer);
    cameraPlaybackTimer = null;
    if (!activeHls) return;
    try { activeHls.destroy(); } catch {}
    activeHls = null;
  }

  function ensureHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoaderPromise) return hlsLoaderPromise;
    hlsLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-skyway-hls]');
      if (existing) {
        existing.addEventListener('load', () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS_LIBRARY_UNAVAILABLE')), { once:true });
        existing.addEventListener('error', () => reject(new Error('HLS_LIBRARY_LOAD_FAILED')), { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = HLS_JS_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.skywayHls = '1';
      script.addEventListener('load', () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS_LIBRARY_UNAVAILABLE')), { once:true });
      script.addEventListener('error', () => reject(new Error('HLS_LIBRARY_LOAD_FAILED')), { once:true });
      document.head.appendChild(script);
    });
    return hlsLoaderPromise;
  }

  function showVideoFallback(message) {
    const fallback = $('skywayCameraFallback');
    const video = $('skywayCameraVideo');
    const backup = $('skywayCameraBackup');
    if (cameraPlaybackTimer) clearTimeout(cameraPlaybackTimer);
    cameraPlaybackTimer = null;
    if (video) { video.pause(); video.hidden = true; }
    if (backup && backup.dataset.cameraSource) {
      backup.hidden = false;
      loadCameraImage(backup, backup.dataset.cameraSource);
    }
    const badge = $('skywayCameraBadge');
    if (badge) badge.textContent = backup ? 'OFFICIAL FL511 · CAMERA IMAGE' : 'FL511 VIDEO UNAVAILABLE';
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = message || 'Video could not start here. The official camera image or FL511 map is available instead.';
    }
  }

  // FL511 exposes a public JPEG at /map/Cctv/{id}; the tooltip URL is HTML only.
  // Reload actual JPEGs every 60s, record success only on image decode, never imply continuous video.
  function loadCameraImage(image, source) {
    const stamp = Date.now(); // Explicit refresh requests must bypass the previous image, even within one minute.
    const url = new URL(source);
    url.searchParams.set('frame', String(stamp));
    image.src = url.toString();
  }
  function attachStillCamera(camera) {
    const image = $('skywayCameraImage');
    const status = $('skywayCameraImageStatus');
    if (!image || !camera.imageUrl) return;
    let lastAttempt = 0;
    function refresh() {
      lastAttempt = Date.now();
      if (status) status.textContent = 'Requesting an updated image from FL511…';
      loadCameraImage(image, camera.imageUrl);
    }
    image.addEventListener('load', () => {
      image.hidden = false;
      const fallback = $('skywayCameraFallback');
      if (fallback) fallback.hidden = true;
      if (status) status.textContent = 'Official image received ' + fmtTime(new Date(lastAttempt).toISOString()) + '. Still image, not continuous video.';
    });
    image.addEventListener('error', () => {
      image.hidden = true;
      const fallback = $('skywayCameraFallback');
      if (fallback) {
        fallback.hidden = false;
        fallback.textContent = 'The FL511 image is unavailable at the moment. Open the official FL511 map to see current camera options.';
      }
      if (status) status.textContent = 'Image unavailable · FL511 map link below';
    });
    refresh();
    const refreshButton = $('skywayCameraRefresh');
    if (refreshButton) refreshButton.addEventListener('click', refresh);
    cameraRefreshTimer = setInterval(() => {
      if (!document.hidden && document.body.contains(image)) refresh();
    }, 60000);
  }

  function attachHlsVideo(camera) {
    destroyHls();
    const video = $('skywayCameraVideo');
    if (!video || !camera?.videoUrl) return;
    const source = camera.videoUrl;
    video.addEventListener('error', () => showVideoFallback(), { once:true });
    // Missing manifests, authorization and cross-origin restrictions must not leave a black player.
    cameraPlaybackTimer = setTimeout(() => {
      if (video.readyState < 2) showVideoFallback('FL511 video did not begin here. Showing the camera image if available; open FL511 for video.');
    }, 12000);
    video.addEventListener('playing', () => {
      if (cameraPlaybackTimer) clearTimeout(cameraPlaybackTimer);
      cameraPlaybackTimer = null;
    }, { once:true });
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.play().catch(() => showVideoFallback('This browser could not start FL511 video. Showing the official image instead.'));
      return;
    }
    ensureHls().then(Hls => {
      if (!document.body.contains(video)) return;
      if (!Hls.isSupported()) {
        showVideoFallback('HLS playback is not supported in this browser. Open the official FL511 view below.');
        return;
      }
      activeHls = new Hls({ enableWorker:true });
      activeHls.loadSource(source);
      activeHls.attachMedia(video);
      activeHls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => showVideoFallback('FL511 playback was blocked. Showing the camera image if available.')));
      activeHls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;
        showVideoFallback('The FL511 live stream is temporarily unavailable. Open the official FL511 view below.');
        destroyHls();
      });
    }).catch(() => showVideoFallback('The embedded player could not load. Open the official FL511 view below.'));
  }

  function cameraStage(camera) {
    if (camera.videoUrl) {
      return `<div class="camera-stage"><video id="skywayCameraVideo" controls autoplay muted playsinline preload="metadata" aria-label="Official FL511 live video: ${esc(camera.name || 'Sunshine Skyway Bridge')}"></video>${camera.imageUrl ? `<img id="skywayCameraBackup" hidden data-camera-source="${esc(camera.imageUrl)}" alt="Official FL511 still image of ${esc(camera.name || 'Sunshine Skyway Bridge')}">` : ''}<div class="camera-fallback" id="skywayCameraFallback" hidden></div><div class="camera-badge" id="skywayCameraBadge">OFFICIAL FL511 · VIDEO</div></div>`;
    }
    if (camera.imageUrl) {
      return `<div class="camera-stage"><img id="skywayCameraImage" alt="Official FL511 camera image: ${esc(camera.name || 'Sunshine Skyway Bridge')}" loading="eager"><div class="camera-fallback" id="skywayCameraFallback" hidden></div><div class="camera-badge">OFFICIAL FL511 · UPDATED IMAGE</div></div>`;
    }
    return `<div class="camera-stage camera-stage-unavailable"><p>FL511 has not supplied a usable image or browser-playable video for this camera. Open the FL511 map below.</p></div>`;
  }

  function renderCameras(cameras) {
    destroyHls();
    const usable = (cameras || []).filter(camera => camera.official && camera.embedUrl).slice(0, 6);
    if (!usable.length) {
      selectedCameraId = null;
      els.cameras.innerHTML = '<p class="empty">The official embedded camera is unavailable. Use FL511 directly.</p>';
      return;
    }
    if (!selectedCameraId || !usable.some(camera => camera.id === selectedCameraId)) selectedCameraId = usable[0].id;
    const active = usable.find(camera => camera.id === selectedCameraId) || usable[0];
    const tabs = usable.map((camera, index) => `<button type="button" role="tab" aria-selected="${camera.id === active.id ? 'true' : 'false'}" class="camera-tab" data-camera-id="${esc(camera.id)}">${esc(camera.name || `Camera ${index + 1}`)}</button>`).join('');
    els.cameras.innerHTML = `<div class="camera-shell"><div class="camera-tabs" role="tablist" aria-label="Choose Sunshine Skyway camera">${tabs}</div>${cameraStage(active)}<div class="camera-meta"><div><strong>${esc(active.name || 'Sunshine Skyway camera')}</strong><small>${esc(active.note || 'Visual conditions only')}</small><small id="skywayCameraImageStatus" role="status" aria-live="polite"></small><small>To watch video, open the FL511 map, enable Traffic Cameras, choose Skyway Bridge View and select Show Video.</small></div><div class="cta-row">${active.imageUrl && !active.videoUrl ? '<button id="skywayCameraRefresh" type="button" class="button-link">Refresh camera image</button>' : ''}<a class="button-link" href="https://fl511.com/map" target="_blank" rel="noopener">Open in FL511 map · video ↗</a></div></div></div>`;
    if (active.videoUrl) attachHlsVideo(active);
    else if (active.imageUrl) attachStillCamera(active);
    els.cameras.querySelectorAll('[data-camera-id]').forEach(button => button.addEventListener('click', () => {
      if (button.dataset.cameraId === selectedCameraId) return;
      selectedCameraId = button.dataset.cameraId;
      renderCameras(usable);
      if (window.gtag) window.gtag('event', 'sunshine_skyway_camera_select', { camera_id: selectedCameraId });
    }));
  }


  // Keep geographic route and deep link synchronized immediately on input changes.
  function updateRouteSelection() {
  const helper=window.SkywayCompanion;
  if(!helper)return;
  const route=helper.routeFor(els.direction.value);
  els.routeContext.textContent=`${route.label}. This is an example corridor around Tampa Bay, not an official detour. Compare the live road picture before leaving.`;
  els.routeSteps.innerHTML=route.steps.map(step=>`<li>${esc(step)}</li>`).join('');
  els.routePlanner.href=route.url;
  els.shareTrip.href=helper.shareHref(els.direction.value,els.vehicle.value);
}

  // Companion is interpretive guidance; FL511 always owns bridge closure status.
  function renderCompanion(data) {
    const helper = window.SkywayCompanion;
    if (!helper) {
      els.tripDecision.textContent = 'Check current Skyway conditions on FL511.';
      els.tripReason.textContent = 'Personalized guidance is temporarily unavailable. The official FL511 link remains available.';
      els.outlookItems.innerHTML = '<p class="empty">Forecast guidance unavailable. Check NWS directly.</p>';
      return;
    }
    const next = helper.decision(data);
    els.tripDecision.parentElement.dataset.tone = next.tone;
    els.tripDecision.textContent = next.title;
    els.tripReason.textContent = next.detail;
    updateRouteSelection();
    const periods = helper.outlook(data);
    els.outlookItems.innerHTML = periods.length
      ? periods.map(period => `<div class="outlook-row"><strong>${esc(period.label)}</strong><span>${esc(period.wind)} ${esc(period.direction)}</span></div>`).join('')
      : '<p class="empty">A current, time-qualified NWS outlook is unavailable. No wind forecast is inferred.</p>';
}
  function applyTripLink() {
    const qs = new URLSearchParams(window.location.search);
    for (const field of ['direction','vehicle']) {
      const value=qs.get(field),select=els[field];
      if(value && [...select.options].some(option=>option.value===value)) select.value=value;
    }
}
  async function load() {
    const serial = ++requestSerial;
    els.refresh.disabled = true;
    els.refresh.textContent = 'Refreshing…';
    els.statusPanel.classList.add('loading');
    try {
      const response = await fetch(`/api/sunshine-skyway?${params().toString()}`, { headers: { accept:'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (serial !== requestSerial) return;
      renderStatus(data);
      renderVehicle(data.vehicle);
      renderTraffic(data.traffic, data.sourceHealth);
      renderToll(data.toll);
      renderWind(data.windContext);
      renderEvents(data.traffic, data.windContext);
      renderCompanion(data);
      renderCameras(data.cameras);
      if (window.gtag) window.gtag('event', 'sunshine_skyway_snapshot', { status: data.officialStatus?.state || 'unknown', wind_context: data.windContext?.level || 'unknown', traffic_flow: data.traffic?.flow?.selected?.state || 'unknown' });
    } catch (error) {
      if (serial !== requestSerial) return;
      destroyHls();
      setTone('unknown');
      els.statusWord.textContent = 'UNAVAILABLE';
      els.statusHeading.textContent = 'Live Sunshine Skyway data could not be loaded';
      els.statusCopy.textContent = 'Use FL511 and follow law-enforcement direction before traveling.';
      els.operationalSignal.textContent = 'Unknown';
      els.officialText.textContent = 'No operational conclusion was made.';
      els.vehicleTitle.textContent = 'Vehicle result unavailable';
      els.vehicleState.textContent = 'Unknown';
      els.vehicleReason.textContent = 'Official bridge data is unavailable.';
      els.trafficTitle.textContent = 'Traffic data unavailable';
      els.events.innerHTML = '<p class="empty">Live source data could not be loaded. Open FL511 directly.</p>';
      renderCompanion(null);
      console.error('Sunshine Skyway load failed', error);
    } finally {
      if (serial === requestSerial) {
        els.refresh.disabled = false;
        els.refresh.textContent = 'Refresh live data';
        els.statusPanel.classList.remove('loading');
      }
    }
  }

  function changed() {
    els.tripDecision.textContent = 'Refreshing the selected crossing context…';
    els.tripReason.textContent = 'Waiting for a matching official data snapshot. Do not use the previous direction as a current traffic assessment.';
    updateRouteSelection();
    load();
  }
  els.direction.addEventListener('change', changed);
  els.vehicle.addEventListener('change', changed);
  els.axles.addEventListener('change', changed);
  els.payment.addEventListener('change', changed);
  els.refresh.addEventListener('click', load);
  $('compareRoute').addEventListener('click', event => {
    event.preventDefault();
    const alternative = $('alternativeRoute');
    alternative.open = true;
    alternative.querySelector('summary').focus();
  });
  window.addEventListener('pagehide', destroyHls, { once:true });
  applyTripLink();
  load();
})();