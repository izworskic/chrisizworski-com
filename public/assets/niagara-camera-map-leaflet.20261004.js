(() => {
  "use strict";

  const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  const LEAFLET_CSS_INTEGRITY = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  const LEAFLET_JS_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
  const NITTEC_URL = "https://www.nittec.org/cameras/";
  const DETAIL_ZOOM = 13;

  const BRIDGES = [
    { key: "peace", name: "Peace Bridge", short: "Peace", route: "Buffalo ↔ Fort Erie", lat: 42.90657, lng: -78.90591, cameraCount: 5 },
    { key: "rainbow", name: "Rainbow Bridge", short: "Rainbow", route: "Niagara Falls ↔ Niagara Falls", lat: 43.0902417, lng: -79.0677694, cameraCount: 2 },
    { key: "whirlpool", name: "Whirlpool Rapids Bridge", short: "Whirlpool", route: "NEXUS-only auto crossing", lat: 43.1092611, lng: -79.0583722, cameraCount: 0 },
    { key: "lewiston-queenston", name: "Lewiston–Queenston Bridge", short: "Lewiston–Queenston", route: "Lewiston ↔ Queenston", lat: 43.1530611, lng: -79.0446611, cameraCount: 2 },
  ];

  const CAMERAS = [
    { id: "peace-qew", title: "Peace Bridge looking toward QEW", label: "QEW", source: "NITTEC / Peace Bridge", sourceUrl: NITTEC_URL, lat: 42.90774, lng: -78.91968, dx: -58, dy: -14, videoId: "SETJ79HmwI0" },
    { id: "peace-canadian-plaza", title: "Peace Bridge Canadian Plaza", label: "CA plaza", source: "NITTEC / Peace Bridge", sourceUrl: NITTEC_URL, lat: 42.90743, lng: -78.90935, dx: -30, dy: 20, videoId: "WPMgP2C3_co" },
    { id: "peace-ca", title: "Peace Bridge deck looking toward Canada", label: "→ Canada", source: "NITTEC / Peace Bridge", sourceUrl: NITTEC_URL, lat: 42.90706, lng: -78.9062, dx: 0, dy: -22, videoId: "DnUFAShZKus" },
    { id: "peace-us", title: "Peace Bridge deck looking toward U.S.", label: "→ U.S.", source: "NITTEC / Peace Bridge", sourceUrl: NITTEC_URL, lat: 42.90617, lng: -78.90079, dx: 30, dy: 20, videoId: "9En2186vo5g" },
    { id: "peace-us-plaza", title: "I-190 North Ramp to Peace Bridge U.S. Plaza", label: "US plaza", source: "NITTEC / Peace Bridge", sourceUrl: NITTEC_URL, lat: 42.90174, lng: -78.89984, dx: 58, dy: -14, videoId: "yygTuX5JaKg" },
    { id: "rainbow-ca", title: "Rainbow Bridge looking toward Canada", label: "→ Canada", source: "NITTEC", sourceUrl: NITTEC_URL, lat: 43.08906, lng: -79.06638, dx: -28, dy: -10, imageUrl: "https://nyssnapshot.com/R5_102.png" },
    { id: "rainbow-us", title: "Rainbow Bridge looking toward U.S.", label: "→ U.S.", source: "NITTEC", sourceUrl: NITTEC_URL, lat: 43.09151, lng: -79.06948, dx: 28, dy: 10, imageUrl: "https://nyssnapshot.com/R5_103.png" },
    { id: "lewiston-us", title: "Lewiston–Queenston Bridge U.S. Plaza", label: "US plaza", source: "NITTEC", sourceUrl: NITTEC_URL, lat: 43.15271, lng: -79.04287, dx: -30, dy: 10, imageUrl: "https://nyssnapshot.com/R5_101.png" },
    { id: "queenston-ca", title: "Lewiston–Queenston Bridge Canadian Plaza", label: "CA plaza", source: "NITTEC", sourceUrl: NITTEC_URL, lat: 43.15391, lng: -79.04839, dx: 30, dy: -10, imageUrl: "https://nyssnapshot.com/R5_100.png" },
  ];

  let map = null;
  const cameraMarkers = new Map();

  function installLeafletCss() {
    if (document.querySelector('link[data-niagara-leaflet="true"]') || document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    link.integrity = LEAFLET_CSS_INTEGRITY;
    link.crossOrigin = "";
    link.dataset.niagaraLeaflet = "true";
    document.head.appendChild(link);
  }

  function loadLeaflet() {
    installLeafletCss();
    if (window.L && typeof window.L.map === "function") return Promise.resolve(window.L);
    const existing = document.querySelector('script[data-niagara-leaflet="true"]');
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(window.L), { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.integrity = LEAFLET_JS_INTEGRITY;
      script.crossOrigin = "";
      script.dataset.niagaraLeaflet = "true";
      script.addEventListener("load", () => resolve(window.L), { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function injectMapStyles() {
    if (document.getElementById("niagaraLeafletMapStylesV2")) return;
    const style = document.createElement("style");
    style.id = "niagaraLeafletMapStylesV2";
    style.textContent = `
      #niagaraBridgeMap{display:block!important;position:relative!important;min-height:430px!important;overflow:hidden!important;background:#dfe7e9!important}
      #niagaraBridgeMap.niagara-leaflet-camera-map{height:430px!important;border-radius:12px;isolation:isolate}
      #niagaraBridgeMap .leaflet-container{font-family:var(--sans,Arial,sans-serif)}
      #niagaraBridgeMap .leaflet-control-zoom a{color:#173f56!important}
      #niagaraBridgeMap .leaflet-control-attribution{font:10px/1.25 var(--sans,Arial,sans-serif)}
      .niagara-visual-map__fallback{display:none!important}
      .niagara-leaflet-bridge-icon,.niagara-leaflet-camera-icon{background:transparent!important;border:0!important}
      .niagara-leaflet-bridge-chip{display:flex;align-items:center;gap:6px;width:max-content;min-height:34px;padding:6px 10px;border:2px solid #fff;border-radius:10px;background:#0b314c;color:#fff;box-shadow:0 4px 14px rgba(7,35,54,.34);font:800 11px/1.1 var(--sans,Arial,sans-serif);white-space:nowrap}
      .niagara-leaflet-bridge-chip::before{content:"";width:8px;height:8px;border-radius:50%;background:#71c7e8;box-shadow:0 0 0 2px rgba(255,255,255,.28)}
      .niagara-leaflet-bridge-chip.is-restricted::before{background:#f4c25a}
      .niagara-leaflet-camera-chip{display:flex;align-items:center;gap:4px;width:max-content;min-width:38px;height:36px;padding:0 8px;border:1px solid rgba(7,35,54,.30);border-radius:999px;background:#fff;color:#0b314c;box-shadow:0 3px 12px rgba(7,35,54,.24);font:800 10px/1 var(--sans,Arial,sans-serif);white-space:nowrap;transform:translate(var(--camera-dx,0px),var(--camera-dy,0px));transform-origin:center}
      .niagara-leaflet-camera-chip svg{width:16px;height:16px;flex:0 0 16px;fill:#0b5c8b}
      .niagara-leaflet-camera-icon:hover .niagara-leaflet-camera-chip,.niagara-leaflet-camera-icon:focus .niagara-leaflet-camera-chip{border-color:#0b5c8b;box-shadow:0 0 0 3px rgba(11,92,139,.18),0 3px 12px rgba(7,35,54,.24)}
      .niagara-leaflet-popup{min-width:190px;color:#183846;font:13px/1.45 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-popup strong{display:block;color:#0b314c;font-size:14px}.niagara-leaflet-popup span{display:block;margin-top:4px;color:#435b67;font-size:12px}
      .niagara-leaflet-map-note{position:absolute;z-index:500;left:10px;bottom:28px;max-width:255px;padding:7px 9px;border-radius:7px;background:rgba(255,255,255,.96);color:#213f4c;box-shadow:0 2px 8px rgba(7,35,54,.12);pointer-events:none;font:800 11px/1.35 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-map-error{display:grid;place-items:center;min-height:380px;padding:24px;text-align:left;color:#213f4c;background:#edf3f5;font:14px/1.55 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-map-error strong{display:block;color:#0b314c;margin-bottom:8px;font-size:17px}.niagara-leaflet-map-error ul{margin:8px 0 12px;padding-left:18px}.niagara-leaflet-map-error a{color:#0b5c8b;font-weight:800}
      @media(max-width:620px){#niagaraBridgeMap,#niagaraBridgeMap.niagara-leaflet-camera-map{min-height:390px!important;height:390px!important}.niagara-leaflet-bridge-chip{min-height:32px;padding:5px 8px;font-size:10px}.niagara-leaflet-camera-chip{height:34px;min-width:34px;padding:0 6px;font-size:9px}.niagara-leaflet-map-note{max-width:205px;font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  function updateSectionCopy() {
    const section = document.getElementById("bridgeMap");
    if (!section) return;
    const eyebrow = section.querySelector(".section-top .eyebrow");
    const heading = document.getElementById("orientationHeading");
    const intro = heading?.nextElementSibling;
    const note = section.querySelector(".niagara-map-note");
    if (eyebrow) eyebrow.textContent = "Map + cameras";
    if (heading) heading.textContent = "Bridges and cameras — one map";
    if (intro) intro.textContent = "Tap a bridge to orient yourself. Tap a camera icon to open that live view here without leaving the map.";
    if (note) note.innerHTML = `OpenStreetMap basemap. Official camera locations come from <a href="${NITTEC_URL}" target="_blank" rel="noopener">NITTEC</a> and the bridge authorities. Whirlpool Rapids is mapped but has no dedicated official road camera.`;
  }

  function ensureCameraDialog() {
    let dialog = document.getElementById("niagaraMapCameraDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "niagaraMapCameraDialog";
    dialog.className = "niagara-camera-dialog";
    dialog.innerHTML = `
      <div class="niagara-camera-dialog__head">
        <div><strong data-camera-dialog-title>Bridge camera</strong><span data-camera-dialog-source></span></div>
        <button type="button" class="niagara-camera-dialog__close" data-camera-dialog-close aria-label="Close camera">×</button>
      </div>
      <div class="niagara-camera-dialog__media" data-camera-dialog-media></div>
      <div class="niagara-camera-dialog__foot"><span>Use this as a visual queue check; the official direction-specific border wait remains the decision source.</span><a data-camera-dialog-source-link target="_blank" rel="noopener">Official camera source</a></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("[data-camera-dialog-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      const media = dialog.querySelector("[data-camera-dialog-media]");
      if (media) media.replaceChildren();
    });
    return dialog;
  }

  function renderMediaFallback(media, camera) {
    media.replaceChildren();
    const fallback = document.createElement("div");
    fallback.className = "niagara-camera-dialog__fallback";
    fallback.textContent = "This camera feed did not load here. Use the official source link below to check it directly.";
    media.appendChild(fallback);
    if (typeof window.va === "function") window.va("event", { name: "Niagara Camera Media Failure", data: { camera: camera.id } });
  }

  function openCameraModal(camera) {
    const dialog = ensureCameraDialog();
    const title = dialog.querySelector("[data-camera-dialog-title]");
    const source = dialog.querySelector("[data-camera-dialog-source]");
    const sourceLink = dialog.querySelector("[data-camera-dialog-source-link]");
    const media = dialog.querySelector("[data-camera-dialog-media]");
    if (!title || !source || !sourceLink || !media) return;
    title.textContent = camera.title;
    source.textContent = camera.source;
    sourceLink.href = camera.sourceUrl || NITTEC_URL;
    media.replaceChildren();

    if (camera.videoId) {
      const frame = document.createElement("iframe");
      frame.title = `${camera.title} live traffic camera`;
      frame.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.setAttribute("allowfullscreen", "");
      frame.src = `https://www.youtube.com/embed/${encodeURIComponent(camera.videoId)}?autoplay=1&mute=1&playsinline=1&rel=0`;
      media.appendChild(frame);
    } else if (camera.imageUrl) {
      const image = document.createElement("img");
      image.alt = camera.title;
      image.referrerPolicy = "no-referrer";
      image.src = `${camera.imageUrl}${camera.imageUrl.includes("?") ? "&" : "?"}cb=${Date.now()}`;
      image.addEventListener("error", () => renderMediaFallback(media, camera), { once: true });
      media.appendChild(image);
    } else {
      renderMediaFallback(media, camera);
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    if (typeof window.va === "function") window.va("event", { name: "Niagara Camera Interaction", data: { action: "map-modal-open", camera: camera.id } });
  }

  function bridgePopupContent(bridge) {
    const wrap = document.createElement("div");
    wrap.className = "niagara-leaflet-popup";
    const title = document.createElement("strong");
    title.textContent = bridge.name;
    const route = document.createElement("span");
    route.textContent = bridge.route;
    const camera = document.createElement("span");
    camera.textContent = bridge.cameraCount ? `${bridge.cameraCount} official camera${bridge.cameraCount === 1 ? "" : "s"} nearby` : "No dedicated official road camera";
    wrap.append(title, route, camera);
    return wrap;
  }

  function bridgeIcon(bridge) {
    const restricted = bridge.key === "whirlpool" ? " is-restricted" : "";
    return window.L.divIcon({
      className: "niagara-leaflet-bridge-icon",
      iconSize: [1, 1],
      iconAnchor: [0, 0],
      popupAnchor: [0, -18],
      html: `<div class="niagara-leaflet-bridge-chip${restricted}">${bridge.short}</div>`,
    });
  }

  function cameraIcon(camera, zoom) {
    const fanned = zoom < DETAIL_ZOOM;
    const dx = fanned ? camera.dx : 0;
    const dy = fanned ? camera.dy : 0;
    return window.L.divIcon({
      className: "niagara-leaflet-camera-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      html: `<div class="niagara-leaflet-camera-chip" style="--camera-dx:${dx}px;--camera-dy:${dy}px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7.5 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L15 4H9Zm3 4.25A4.75 4.75 0 1 1 12 17.75 4.75 4.75 0 0 1 12 8.25Zm0 2A2.75 2.75 0 1 0 12 15.75 2.75 2.75 0 0 0 12 10.25Z"/></svg><span>${camera.label}</span></div>`,
    });
  }

  function refreshCameraIcons() {
    if (!map) return;
    const zoom = map.getZoom();
    CAMERAS.forEach((camera) => cameraMarkers.get(camera.id)?.setIcon(cameraIcon(camera, zoom)));
  }

  function addResetControl(L, bounds) {
    const ResetControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const box = L.DomUtil.create("div", "leaflet-bar");
        const button = L.DomUtil.create("a", "", box);
        button.href = "#";
        button.title = "Reset Niagara bridge map";
        button.setAttribute("role", "button");
        button.setAttribute("aria-label", "Reset Niagara bridge map");
        button.textContent = "↺";
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.on(button, "click", (event) => {
          L.DomEvent.preventDefault(event);
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
        });
        return box;
      },
    });
    new ResetControl().addTo(map);
  }

  function buildMap(L) {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container || container.dataset.leafletCameraMap === "true") return;
    injectMapStyles();
    updateSectionCopy();
    document.querySelectorAll(".niagara-visual-map__fallback").forEach((node) => node.remove());
    container.replaceChildren();
    container.classList.add("niagara-leaflet-camera-map");
    container.dataset.leafletCameraMap = "true";
    container.dataset.mapRuntime = "leaflet-1.9.4-osm-v2";
    container.setAttribute("aria-label", "Interactive OpenStreetMap map of all four Niagara international bridges with nine official camera locations");

    map = L.map(container, {
      scrollWheelZoom: false,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const bounds = L.latLngBounds([
      ...BRIDGES.map((bridge) => [bridge.lat, bridge.lng]),
      ...CAMERAS.map((camera) => [camera.lat, camera.lng]),
    ]);

    BRIDGES.forEach((bridge) => {
      const marker = L.marker([bridge.lat, bridge.lng], {
        icon: bridgeIcon(bridge),
        title: bridge.name,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: 300,
      }).addTo(map);
      marker.bindPopup(() => bridgePopupContent(bridge), { maxWidth: 280, closeButton: true, autoPan: true });
      marker.bindTooltip(bridge.name, { direction: "top", opacity: 0.94 });
    });

    CAMERAS.forEach((camera) => {
      const marker = L.marker([camera.lat, camera.lng], {
        icon: cameraIcon(camera, 10),
        title: camera.title,
        keyboard: true,
        riseOnHover: true,
      }).addTo(map);
      marker.bindTooltip(`${camera.title} — open camera`, { direction: "top", opacity: 0.94 });
      marker.on("click", () => openCameraModal(camera));
      cameraMarkers.set(camera.id, marker);
    });

    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
    addResetControl(L, bounds);
    map.on("zoomend", refreshCameraIcons);

    const note = document.createElement("div");
    note.className = "niagara-leaflet-map-note";
    note.textContent = "4 bridges · 9 official cameras · tap a camera to open it here";
    container.appendChild(note);
    window.setTimeout(() => map.invalidateSize(), 100);
    if ("ResizeObserver" in window) new ResizeObserver(() => map?.invalidateSize({ pan: false })).observe(container);
  }

  function showLoadError() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container || container.dataset.leafletCameraMap === "true") return;
    injectMapStyles();
    updateSectionCopy();
    container.replaceChildren();
    const message = document.createElement("div");
    message.className = "niagara-leaflet-map-error";
    message.innerHTML = `<div><strong>The interactive map did not load.</strong><span>You can still orient by crossing:</span><ul><li>Peace Bridge — Buffalo / Fort Erie</li><li>Rainbow Bridge — Niagara Falls</li><li>Whirlpool Rapids Bridge — NEXUS-only auto crossing</li><li>Lewiston–Queenston Bridge — Lewiston / Queenston</li></ul><a href="${NITTEC_URL}" target="_blank" rel="noopener">Open official NITTEC cameras</a></div>`;
    container.appendChild(message);
  }

  function init() {
    updateSectionCopy();
    loadLeaflet().then(buildMap).catch(showLoadError);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
