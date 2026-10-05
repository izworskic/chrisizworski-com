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
  };
  let requestSerial = 0;
  let selectedCameraId = null;
  let activeHls = null;
  let hlsLoaderPromise = null;
  const HLS_JS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  function fmtTime(value) {
    if (!value) return 'time unavailable';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'time unavailable';
    return new Intl.DateTimeFormat(undefined, { hour:'numeric', minute:'2-digit', month:'short', day:'numeric' }).format(date);
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
    const flowUsable = selected.state && selected.state !== 'UNAVAILABLE' && speedsState !== 'unavailable';
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
      els.trafficCopy.textContent = "We checked both live FL511 event feeds. Neither is showing a Skyway-specific crash, closure or traffic event right now. The Traffic Speeds layer is unavailable, so we do not guess at congestion or delay.";
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
      const when = period.startTime ? new Date(period.startTime).toLocaleTimeString([], { hour:'numeric' }) : period.name || 'Forecast';
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
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = message || 'Live video could not start in this browser. Use the FL511 button below.';
    }
  }

  function attachHlsVideo(camera) {
    destroyHls();
    const video = $('skywayCameraVideo');
    if (!video || !camera?.videoUrl) return;
    const source = camera.videoUrl;
    video.addEventListener('error', () => showVideoFallback(), { once:true });
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.play().catch(() => {});
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
      activeHls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      activeHls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;
        showVideoFallback('The FL511 live stream is temporarily unavailable. Open the official FL511 view below.');
        destroyHls();
      });
    }).catch(() => showVideoFallback('The embedded player could not load. Open the official FL511 view below.'));
  }

  function cameraStage(camera) {
    if (camera.videoUrl) {
      return `<div class="camera-stage"><video id="skywayCameraVideo" controls autoplay muted playsinline preload="metadata" aria-label="Official FL511 live video: ${esc(camera.name || 'Sunshine Skyway Bridge')}"></video><div class="camera-fallback" id="skywayCameraFallback" hidden></div><div class="camera-badge">OFFICIAL FL511 · LIVE VIDEO</div></div>`;
    }
    if (camera.imageUrl) {
      return `<div class="camera-stage"><img src="${esc(camera.imageUrl)}" alt="Official FL511 camera: ${esc(camera.name || 'Sunshine Skyway Bridge')}" loading="lazy"><div class="camera-badge">OFFICIAL FL511 · LIVE IMAGE</div></div>`;
    }
    return `<div class="camera-stage"><iframe id="skywayCameraFrame" src="${esc(camera.embedUrl)}" title="Official FL511 camera: ${esc(camera.name || 'Sunshine Skyway Bridge')}" loading="lazy" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="camera-badge">OFFICIAL FL511 · EMBEDDED VIEW</div></div>`;
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
    els.cameras.innerHTML = `<div class="camera-shell"><div class="camera-tabs" role="tablist" aria-label="Choose Sunshine Skyway camera">${tabs}</div>${cameraStage(active)}<div class="camera-meta"><div><strong>${esc(active.name || 'Sunshine Skyway camera')}</strong><small>${esc(active.note || 'Visual conditions only')}</small></div><a class="button-link" href="${esc(active.sourceUrl || active.embedUrl)}" target="_blank" rel="noopener">Open in FL511 ↗</a></div></div>`;
    if (active.videoUrl) attachHlsVideo(active);
    els.cameras.querySelectorAll('[data-camera-id]').forEach(button => button.addEventListener('click', () => {
      if (button.dataset.cameraId === selectedCameraId) return;
      selectedCameraId = button.dataset.cameraId;
      renderCameras(usable);
      if (window.gtag) window.gtag('event', 'sunshine_skyway_camera_select', { camera_id: selectedCameraId });
    }));
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
      console.error('Sunshine Skyway load failed', error);
    } finally {
      if (serial === requestSerial) {
        els.refresh.disabled = false;
        els.refresh.textContent = 'Refresh live data';
        els.statusPanel.classList.remove('loading');
      }
    }
  }

  function changed() { load(); }
  els.direction.addEventListener('change', changed);
  els.vehicle.addEventListener('change', changed);
  els.axles.addEventListener('change', changed);
  els.payment.addEventListener('change', changed);
  els.refresh.addEventListener('click', load);
  window.addEventListener('pagehide', destroyHls, { once:true });
  load();
})();