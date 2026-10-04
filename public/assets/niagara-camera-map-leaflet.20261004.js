(() => {
  "use strict";

  const CARTO_BASEMAP_KEY = "cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88";
  const CARTO_TILE_URL = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_BASEMAP_KEY)}`;
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
    { id: "peace-qew", title: "Peace Bridge looking toward QEW", label: "QEW", source: "NITTEC / Peace Bridge", lat: 42.90774, lng: -78.91968, dx: -58, dy: -14 },
    { id: "peace-canadian-plaza", title: "Peace Bridge Canadian Plaza", label: "CA plaza", source: "NITTEC / Peace Bridge", lat: 42.90743, lng: -78.90935, dx: -30, dy: 20 },
    { id: "peace-ca", title: "Peace Bridge deck looking toward Canada", label: "→ Canada", source: "NITTEC / Peace Bridge", lat: 42.90706, lng: -78.9062, dx: 0, dy: -22 },
    { id: "peace-us", title: "Peace Bridge deck looking toward U.S.", label: "→ U.S.", source: "NITTEC / Peace Bridge", lat: 42.90617, lng: -78.90079, dx: 30, dy: 20 },
    { id: "peace-us-plaza", title: "I-190 North Ramp to Peace Bridge U.S. Plaza", label: "US plaza", source: "NITTEC / Peace Bridge", lat: 42.90174, lng: -78.89984, dx: 58, dy: -14 },
    { id: "rainbow-ca", title: "Rainbow Bridge looking toward Canada", label: "→ Canada", source: "NITTEC", lat: 43.08906, lng: -79.06638, dx: -28, dy: -10 },
    { id: "rainbow-us", title: "Rainbow Bridge looking toward U.S.", label: "→ U.S.", source: "NITTEC", lat: 43.09151, lng: -79.06948, dx: 28, dy: 10 },
    { id: "lewiston-us", title: "Lewiston–Queenston Bridge U.S. Plaza", label: "US plaza", source: "NITTEC", lat: 43.15271, lng: -79.04287, dx: -30, dy: 10 },
    { id: "queenston-ca", title: "Lewiston–Queenston Bridge Canadian Plaza", label: "CA plaza", source: "NITTEC", lat: 43.15391, lng: -79.04839, dx: 30, dy: -10 },
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

  function injectStyles() {
    if (document.getElementById("niagaraLeafletCameraMapStyles")) return;
    const style = document.createElement("style");
    style.id = "niagaraLeafletCameraMapStyles";
    style.textContent = `
      #niagaraBridgeMap{display:block!important;position:relative!important;min-height:430px!important;overflow:hidden!important;background:#dfe7e9!important}
      #niagaraBridgeMap.niagara-leaflet-camera-map{height:430px!important;border-radius:12px;isolation:isolate}
      #niagaraBridgeMap .leaflet-container{font-family:var(--sans,Arial,sans-serif)}
      #niagaraBridgeMap .leaflet-control-zoom a{color:#173f56!important}
      #niagaraBridgeMap .leaflet-control-attribution{font:9px/1.25 var(--sans,Arial,sans-serif)}
      .niagara-visual-map__fallback{display:none!important}
      .niagara-leaflet-bridge-icon,.niagara-leaflet-camera-icon{background:transparent!important;border:0!important}
      .niagara-leaflet-bridge-chip{display:flex;align-items:center;gap:6px;width:max-content;min-height:34px;padding:6px 10px;border:2px solid #fff;border-radius:10px;background:#0b314c;color:#fff;box-shadow:0 4px 14px rgba(7,35,54,.34);font:800 10px/1.1 var(--sans,Arial,sans-serif);white-space:nowrap}
      .niagara-leaflet-bridge-chip::before{content:"";width:8px;height:8px;border-radius:50%;background:#71c7e8;box-shadow:0 0 0 2px rgba(255,255,255,.28)}
      .niagara-leaflet-bridge-chip.is-restricted::before{background:#f4c25a}
      .niagara-leaflet-camera-chip{display:flex;align-items:center;gap:4px;width:max-content;min-width:36px;height:34px;padding:0 7px;border:1px solid rgba(7,35,54,.30);border-radius:999px;background:#fff;color:#0b314c;box-shadow:0 3px 12px rgba(7,35,54,.24);font:700 8px/1 var(--sans,Arial,sans-serif);white-space:nowrap;transform:translate(var(--camera-dx,0px),var(--camera-dy,0px));transform-origin:center;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
      .niagara-leaflet-camera-chip svg{width:15px;height:15px;flex:0 0 15px;fill:#0b5c8b}
      .niagara-leaflet-camera-icon:hover .niagara-leaflet-camera-chip,.niagara-leaflet-camera-icon:focus .niagara-leaflet-camera-chip{border-color:#0b5c8b;box-shadow:0 0 0 3px rgba(11,92,139,.18),0 3px 12px rgba(7,35,54,.24)}
      .niagara-leaflet-popup{min-width:190px;color:#183846;font:12px/1.4 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-popup strong{display:block;color:#0b314c;font-size:13px}
      .niagara-leaflet-popup span{display:block;margin-top:4px;color:#5a6c75;font-size:10px}
      .niagara-leaflet-popup button{margin-top:9px;padding:8px 10px;border:1px solid #0b5c8b;border-radius:8px;background:#0b5c8b;color:#fff;cursor:pointer;font:700 10px/1.2 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-map-note{position:absolute;z-index:500;left:10px;bottom:28px;max-width:245px;padding:7px 9px;border-radius:7px;background:rgba(255,255,255,.95);color:#405965;box-shadow:0 2px 8px rgba(7,35,54,.12);pointer-events:none;font:700 9px/1.35 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-map-error{display:grid;place-items:center;min-height:380px;padding:24px;text-align:left;color:#314d5d;background:#edf3f5;font:13px/1.5 var(--sans,Arial,sans-serif)}
      .niagara-leaflet-map-error strong{display:block;color:#0b314c;margin-bottom:8px}.niagara-leaflet-map-error ul{margin:8px 0 0;padding-left:18px}.niagara-leaflet-map-error a{color:#0b5c8b;font-weight:700}
      @media(max-width:620px){#niagaraBridgeMap,#niagaraBridgeMap.niagara-leaflet-camera-map{min-height:390px!important;height:390px!important}.niagara-leaflet-bridge-chip{min-height:32px;padding:5px 8px;font-size:9px}.niagara-leaflet-camera-chip{height:32px;min-width:32px;padding:0 6px;font-size:7px}.niagara-leaflet-map-note{max-width:205px;font-size:8px}}
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
    if (eyebrow) eyebrow.textContent = "Crossings + live cameras";
    if (heading) heading.textContent = "All four Niagara bridges on one live map";
    if (intro) intro.textContent = "Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston are all marked. Drag with one finger or a mouse, pinch to zoom, and tap a camera marker where an official view exists.";
    if (note) note.innerHTML = `CARTO Voyager basemap. Bridge locations are mapped independently from camera availability. Official camera locations come from <a href="${NITTEC_URL}" target="_blank" rel="noopener">NITTEC</a> and the bridge authorities. Whirlpool Rapids has no dedicated official road camera, so no camera marker is invented there.`;
  }

  function openCamera(camera) {
    const tab = document.querySelector(`[data-niagara-camera="${camera.id}"]`);
    if (tab instanceof HTMLElement) tab.click();
    const viewer = document.getElementById("niagaraCameraViewer");
    if (viewer) viewer.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window.va === "function") {
      window.va("event", { name: "Niagara Camera Interaction", data: { action: "leaflet-map-select", camera: camera.id } });
    }
  }

  function bridgePopupContent(bridge) {
    const wrap = document.createElement("div");
    wrap.className = "niagara-leaflet-popup";
    const title = document.createElement("strong");
    title.textContent = bridge.name;
    const route = document.createElement("span");
    route.textContent = bridge.route;
    const camera = document.createElement("span");
    camera.textContent = bridge.cameraCount ? `${bridge.cameraCount} official camera${bridge.cameraCount === 1 ? "" : "s"} mapped nearby` : "No dedicated official road camera; bridge still mapped";
    wrap.append(title, route, camera);
    return wrap;
  }

  function cameraPopupContent(camera) {
    const wrap = document.createElement("div");
    wrap.className = "niagara-leaflet-popup";
    const title = document.createElement("strong");
    title.textContent = camera.title;
    const source = document.createElement("span");
    source.textContent = camera.source;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Open this camera";
    button.addEventListener("click", () => {
      map?.closePopup();
      openCamera(camera);
    });
    wrap.append(title, source, button);
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
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -16],
      html: `<div class="niagara-leaflet-camera-chip" style="--camera-dx:${dx}px;--camera-dy:${dy}px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7.5 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L15 4H9Zm3 4.25A4.75 4.75 0 1 1 12 17.75 4.75 4.75 0 0 1 12 8.25Zm0 2A2.75 2.75 0 1 0 12 15.75 2.75 2.75 0 0 0 12 10.25Z"/></svg><span>${camera.label}</span></div>`,
    });
  }

  function refreshMarkerIcons() {
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

    injectStyles();
    updateSectionCopy();
    document.querySelectorAll(".niagara-visual-map__fallback").forEach((node) => node.remove());
    container.replaceChildren();
    container.classList.add("niagara-leaflet-camera-map");
    container.dataset.leafletCameraMap = "true";
    container.dataset.mapRuntime = "leaflet-1.9.4-carto";
    container.setAttribute("aria-label", "Interactive CARTO map of all four Niagara international bridges with nine official camera locations");

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

    L.tileLayer(CARTO_TILE_URL, {
      maxZoom: 20,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const allPoints = [
      ...BRIDGES.map((bridge) => [bridge.lat, bridge.lng]),
      ...CAMERAS.map((camera) => [camera.lat, camera.lng]),
    ];
    const bounds = L.latLngBounds(allPoints);

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
      marker.bindPopup(() => cameraPopupContent(camera), { maxWidth: 280, closeButton: true, autoPan: true });
      marker.bindTooltip(camera.title, { direction: "top", opacity: 0.92 });
      cameraMarkers.set(camera.id, marker);
    });

    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
    addResetControl(L, bounds);
    map.on("zoomend", refreshMarkerIcons);

    const note = document.createElement("div");
    note.className = "niagara-leaflet-map-note";
    note.textContent = "4 bridges · 9 bridge cameras · drag · pinch to zoom · tap markers";
    container.appendChild(note);

    window.setTimeout(() => map.invalidateSize(), 100);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
      observer.observe(container);
    }
  }

  function showLoadError() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container || container.dataset.leafletCameraMap === "true") return;
    injectStyles();
    updateSectionCopy();
    container.replaceChildren();
    const message = document.createElement("div");
    message.className = "niagara-leaflet-map-error";
    message.innerHTML = `<div><strong>The interactive basemap did not load.</strong><span>Bridge orientation remains:</span><ul><li>Peace Bridge — Buffalo / Fort Erie</li><li>Rainbow Bridge — Niagara Falls</li><li>Whirlpool Rapids Bridge — NEXUS-only auto crossing</li><li>Lewiston–Queenston Bridge — Lewiston / Queenston</li></ul><a href="${NITTEC_URL}" target="_blank" rel="noopener">Open the official NITTEC cameras</a></div>`;
    container.appendChild(message);
  }

  function init() {
    updateSectionCopy();
    loadLeaflet().then(buildMap).catch(showLoadError);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
