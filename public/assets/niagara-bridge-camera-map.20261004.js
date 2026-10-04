(() => {
  "use strict";

  const TILE_SIZE = 256;
  const MIN_ZOOM = 8;
  const MAX_ZOOM = 15;
  const START_ZOOM = 10;
  const DETAIL_ZOOM = 13;
  const START_CENTER = { lat: 43.031, lng: -79.005 };
  const TILE_TEMPLATE = "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
  const NITTEC_CAMERAS_URL = "https://www.nittec.org/cameras/";

  const cameras = [
    { id: "peace-qew", sourceId: 1004, group: "peace", groupLabel: "Peace", title: "Peace Bridge looking toward QEW", lat: 42.90774, lng: -78.91968, source: "NITTEC / Peace Bridge" },
    { id: "peace-canadian-plaza", sourceId: 1003, group: "peace", groupLabel: "Peace", title: "Peace Bridge Canadian Plaza", lat: 42.90743, lng: -78.90935, source: "NITTEC / Peace Bridge" },
    { id: "peace-ca", sourceId: 1002, group: "peace", groupLabel: "Peace", title: "Peace Bridge Deck looking toward Canada", lat: 42.90706, lng: -78.9062, source: "NITTEC / Peace Bridge" },
    { id: "peace-us", sourceId: 1001, group: "peace", groupLabel: "Peace", title: "Peace Bridge Deck looking toward U.S.", lat: 42.90617, lng: -78.90079, source: "NITTEC / Peace Bridge" },
    { id: "peace-us-plaza", sourceId: 1005, group: "peace", groupLabel: "Peace", title: "I-190 North Ramp to Peace Bridge U.S. Plaza", lat: 42.90174, lng: -78.89984, source: "NITTEC / Peace Bridge" },
    { id: "rainbow-ca", sourceId: 1011, group: "rainbow", groupLabel: "Rainbow", title: "Rainbow Bridge looking toward Canada", lat: 43.08906, lng: -79.06638, source: "NITTEC" },
    { id: "rainbow-us", sourceId: 688, group: "rainbow", groupLabel: "Rainbow", title: "Rainbow Bridge looking toward U.S.", lat: 43.09151, lng: -79.06948, source: "NITTEC" },
    { id: "lewiston-us", sourceId: 1021, group: "lewiston-queenston", groupLabel: "Lewiston–Queenston", title: "Lewiston–Queenston Bridge U.S. Plaza", lat: 43.15271, lng: -79.04287, source: "NITTEC" },
    { id: "queenston-ca", sourceId: 1022, group: "lewiston-queenston", groupLabel: "Lewiston–Queenston", title: "Lewiston–Queenston Bridge Canadian Plaza", lat: 43.15391, lng: -79.04839, source: "NITTEC" },
  ];

  const groupCenters = Object.values(
    cameras.reduce((groups, camera) => {
      const group = groups[camera.group] || { id: camera.group, label: camera.groupLabel, lat: 0, lng: 0, count: 0 };
      group.lat += camera.lat;
      group.lng += camera.lng;
      group.count += 1;
      groups[camera.group] = group;
      return groups;
    }, {}),
  ).map((group) => ({ ...group, lat: group.lat / group.count, lng: group.lng / group.count }));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function project(lat, lng, zoom) {
    const scale = TILE_SIZE * 2 ** zoom;
    const safeLat = clamp(lat, -85.05112878, 85.05112878);
    const sin = Math.sin((safeLat * Math.PI) / 180);
    return {
      x: ((lng + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
    };
  }

  function unproject(x, y, zoom) {
    const scale = TILE_SIZE * 2 ** zoom;
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng };
  }

  function tileUrl(z, x, y) {
    return TILE_TEMPLATE.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
  }

  function updateSectionCopy() {
    const section = document.getElementById("bridgeMap");
    if (!section) return;
    const eyebrow = section.querySelector(".section-top .eyebrow");
    const heading = document.getElementById("orientationHeading");
    const intro = heading?.nextElementSibling;
    const note = section.querySelector(".niagara-map-note");
    const fallback = section.querySelector(".niagara-visual-map__fallback");
    if (eyebrow) eyebrow.textContent = "Official bridge camera map";
    if (heading) heading.textContent = "Nine Niagara border cameras, mapped";
    if (intro) intro.textContent = "Only the international-bridge cameras are shown: five at Peace Bridge, two at Rainbow Bridge and two at Lewiston–Queenston. Tap a camera group to zoom in, then tap a camera to open that exact live view.";
    if (note) note.innerHTML = `Camera locations and feeds are sourced from <a href="${NITTEC_CAMERAS_URL}" target="_blank" rel="noopener">NITTEC</a> and the bridge authorities. Whirlpool Rapids currently has no dedicated camera, so no camera marker is invented there.`;
    if (fallback) {
      fallback.setAttribute("aria-label", "Niagara bridge camera groups");
      fallback.innerHTML = `
        <a href="#bridgeCameras" data-camera-map-fallback="peace"><strong>Peace Bridge · 5 cameras</strong><span>QEW, Canadian plaza, bridge deck both ways and U.S. plaza approach.</span></a>
        <a href="#bridgeCameras" data-camera-map-fallback="rainbow"><strong>Rainbow Bridge · 2 cameras</strong><span>Looking toward Canada and toward the United States.</span></a>
        <a href="#bridgeCameras" data-camera-map-fallback="lewiston-queenston"><strong>Lewiston–Queenston · 2 cameras</strong><span>U.S. plaza and Canadian plaza.</span></a>`;
    }
  }

  function makeShell(container) {
    container.replaceChildren();
    container.removeAttribute("role");
    container.setAttribute("aria-label", "Interactive map of the nine official Niagara international-bridge cameras");
    container.innerHTML = `
      <div class="niagara-camera-map" tabindex="0" aria-label="Nine official Niagara international-bridge cameras. Camera groups expand into individual camera markers as you zoom in.">
        <div class="niagara-camera-map__tiles" aria-hidden="true"></div>
        <div class="niagara-camera-map__markers"></div>
        <div class="niagara-camera-map__popup" hidden>
          <button type="button" class="niagara-camera-map__popup-close" aria-label="Close camera details">×</button>
          <span class="niagara-camera-map__popup-kicker">Official bridge camera</span>
          <strong class="niagara-camera-map__popup-title"></strong>
          <span class="niagara-camera-map__popup-source"></span>
          <button type="button" class="niagara-camera-map__popup-open">Open this camera</button>
        </div>
        <div class="niagara-camera-map__controls" aria-label="Map controls">
          <button type="button" data-camera-map-zoom="in" aria-label="Zoom in">+</button>
          <button type="button" data-camera-map-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-camera-map-reset aria-label="Reset map">↺</button>
        </div>
        <div class="niagara-camera-map__legend"><span class="niagara-camera-map__legend-icon" aria-hidden="true">●</span> camera location</div>
        <div class="niagara-camera-map__attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a><span>·</span><a href="https://carto.com/attributions" target="_blank" rel="noopener">© CARTO</a><span>·</span><a href="${NITTEC_CAMERAS_URL}" target="_blank" rel="noopener">camera data: NITTEC</a></div>
      </div>`;
    return container.querySelector(".niagara-camera-map");
  }

  function injectStyles() {
    if (document.getElementById("niagaraBridgeCameraMapStyles")) return;
    const style = document.createElement("style");
    style.id = "niagaraBridgeCameraMapStyles";
    style.textContent = `
      .niagara-camera-map{position:relative;width:100%;height:100%;overflow:hidden;background:#dfe7e9;cursor:grab;touch-action:pan-y}.niagara-camera-map.is-dragging{cursor:grabbing}.niagara-camera-map__tiles,.niagara-camera-map__markers{position:absolute;inset:0}.niagara-camera-map__tile{position:absolute;width:256px;height:256px;max-width:none;pointer-events:none;user-select:none}.niagara-camera-map__marker,.niagara-camera-map__cluster{position:absolute;z-index:4;transform:translate(-50%,-50%);border:1px solid rgba(7,35,54,.28);background:#fff;color:#0b314c;box-shadow:0 3px 12px rgba(7,35,54,.2);cursor:pointer}.niagara-camera-map__marker{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;padding:0}.niagara-camera-map__marker svg{width:17px;height:17px;fill:currentColor}.niagara-camera-map__marker:hover,.niagara-camera-map__marker:focus-visible,.niagara-camera-map__cluster:hover,.niagara-camera-map__cluster:focus-visible{z-index:7;outline:3px solid rgba(11,92,139,.22);outline-offset:2px;border-color:#0b5c8b}.niagara-camera-map__cluster{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;font:700 10px/1.1 var(--sans);white-space:nowrap}.niagara-camera-map__cluster-count{display:grid;place-items:center;min-width:23px;height:23px;padding:0 5px;border-radius:999px;background:#0b314c;color:#fff;font-size:11px}.niagara-camera-map__popup{position:absolute;z-index:9;width:min(280px,calc(100% - 24px));transform:translate(-50%,-100%);padding:14px 34px 14px 14px;border:1px solid #aebfc6;border-radius:12px;background:#fff;box-shadow:0 12px 28px rgba(7,35,54,.24);color:#183846}.niagara-camera-map__popup[hidden]{display:none}.niagara-camera-map__popup-close{position:absolute;top:5px;right:6px;width:28px;height:28px;border:0;background:transparent;color:#53656f;cursor:pointer;font-size:22px}.niagara-camera-map__popup-kicker{display:block;color:#6a7b84;font:700 9px/1.2 var(--sans);letter-spacing:.08em;text-transform:uppercase}.niagara-camera-map__popup-title{display:block;margin-top:4px;color:#0b314c;font:700 14px/1.3 var(--sans)}.niagara-camera-map__popup-source{display:block;margin-top:5px;color:#5a6c75;font:10px/1.35 var(--sans)}.niagara-camera-map__popup-open{margin-top:10px;padding:8px 10px;border:1px solid #0b5c8b;border-radius:8px;background:#0b5c8b;color:#fff;cursor:pointer;font:700 10px/1.2 var(--sans)}.niagara-camera-map__controls{position:absolute;z-index:8;top:12px;right:12px;display:flex;flex-direction:column;border:1px solid rgba(7,35,54,.22);border-radius:9px;overflow:hidden;background:#fff;box-shadow:0 4px 14px rgba(7,35,54,.14)}.niagara-camera-map__controls button{width:38px;height:36px;border:0;border-bottom:1px solid #d6dfe2;background:#fff;color:#173f56;cursor:pointer;font:700 19px/1 var(--sans)}.niagara-camera-map__controls button:last-child{border-bottom:0;font-size:16px}.niagara-camera-map__legend{position:absolute;z-index:6;left:8px;bottom:8px;padding:5px 7px;border-radius:6px;background:rgba(255,255,255,.92);color:#53656f;font:700 9px/1 var(--sans)}.niagara-camera-map__legend-icon{color:#0b5c8b}.niagara-camera-map__attribution{position:absolute;z-index:6;right:5px;bottom:5px;display:flex;gap:4px;padding:3px 5px;border-radius:4px;background:rgba(255,255,255,.9);color:#53656f;font:8px/1.2 var(--sans)}.niagara-camera-map__attribution a{color:#315c70;text-decoration:none}@media(max-width:620px){.niagara-camera-map__cluster{padding:6px 8px;font-size:9px}.niagara-camera-map__popup{width:min(250px,calc(100% - 20px))}.niagara-camera-map__attribution{max-width:205px;flex-wrap:wrap;justify-content:flex-end}.niagara-camera-map__legend{bottom:34px}}
    `;
    document.head.appendChild(style);
  }

  function openCamera(camera) {
    const button = document.querySelector(`[data-niagara-camera="${camera.id}"]`);
    if (button instanceof HTMLElement) button.click();
    const viewer = document.getElementById("niagaraCameraViewer");
    if (viewer) viewer.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window.va === "function") {
      window.va("event", { name: "Niagara Camera Interaction", data: { action: "map-select", camera: camera.id, sourceId: camera.sourceId } });
    }
  }

  function initCameraMap() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container || container.dataset.cameraMapReady === "true") return;
    container.dataset.cameraMapReady = "true";
    injectStyles();
    updateSectionCopy();
    const element = makeShell(container);
    const state = {
      element,
      tiles: element.querySelector(".niagara-camera-map__tiles"),
      markers: element.querySelector(".niagara-camera-map__markers"),
      popup: element.querySelector(".niagara-camera-map__popup"),
      center: { ...START_CENTER },
      zoom: START_ZOOM,
    };

    function closePopup() { state.popup.hidden = true; }

    function render() {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const centerWorld = project(state.center.lat, state.center.lng, state.zoom);
      const topLeft = { x: centerWorld.x - width / 2, y: centerWorld.y - height / 2 };
      const maxTile = 2 ** state.zoom;
      const minX = Math.floor(topLeft.x / TILE_SIZE);
      const maxX = Math.floor((topLeft.x + width) / TILE_SIZE);
      const minY = Math.floor(topLeft.y / TILE_SIZE);
      const maxY = Math.floor((topLeft.y + height) / TILE_SIZE);
      const tiles = document.createDocumentFragment();
      for (let y = minY; y <= maxY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        for (let x = minX; x <= maxX; x += 1) {
          const wrappedX = ((x % maxTile) + maxTile) % maxTile;
          const image = document.createElement("img");
          image.className = "niagara-camera-map__tile";
          image.alt = "";
          image.draggable = false;
          image.decoding = "async";
          image.src = tileUrl(state.zoom, wrappedX, y);
          image.style.left = `${Math.round(x * TILE_SIZE - topLeft.x)}px`;
          image.style.top = `${Math.round(y * TILE_SIZE - topLeft.y)}px`;
          tiles.appendChild(image);
        }
      }
      state.tiles.replaceChildren(tiles);

      const markers = document.createDocumentFragment();
      const items = state.zoom < DETAIL_ZOOM ? groupCenters : cameras;
      items.forEach((item) => {
        const point = project(item.lat, item.lng, state.zoom);
        const left = point.x - topLeft.x;
        const top = point.y - topLeft.y;
        const button = document.createElement("button");
        button.type = "button";
        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        if (state.zoom < DETAIL_ZOOM) {
          button.className = "niagara-camera-map__cluster";
          button.dataset.cameraGroup = item.id;
          button.setAttribute("aria-label", `${item.label}: ${item.count} bridge cameras. Zoom in to show individual cameras.`);
          button.innerHTML = `<span class="niagara-camera-map__cluster-count">${item.count}</span><span>${item.label}</span>`;
        } else {
          button.className = "niagara-camera-map__marker";
          button.dataset.cameraId = item.id;
          button.setAttribute("aria-label", `${item.title}. ${item.source}. Open camera.`);
          button.title = item.title;
          button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7.5 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L15 4H9Zm3 4.25A4.75 4.75 0 1 1 12 17.75 4.75 4.75 0 0 1 12 8.25Zm0 2A2.75 2.75 0 1 0 12 15.75 2.75 2.75 0 0 0 12 10.25Z"/></svg>`;
        }
        markers.appendChild(button);
      });
      state.markers.replaceChildren(markers);

      state.markers.querySelectorAll("[data-camera-group]").forEach((button) => {
        button.addEventListener("click", () => {
          const group = groupCenters.find((item) => item.id === button.dataset.cameraGroup);
          if (!group) return;
          state.center = { lat: group.lat, lng: group.lng };
          state.zoom = DETAIL_ZOOM;
          closePopup();
          render();
        });
      });
      state.markers.querySelectorAll("[data-camera-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const camera = cameras.find((item) => item.id === button.dataset.cameraId);
          if (!camera) return;
          const rect = element.getBoundingClientRect();
          const markerRect = button.getBoundingClientRect();
          const popup = state.popup;
          popup.querySelector(".niagara-camera-map__popup-title").textContent = camera.title;
          popup.querySelector(".niagara-camera-map__popup-source").textContent = `${camera.source} · NITTEC camera ${camera.sourceId}`;
          popup.querySelector(".niagara-camera-map__popup-open").onclick = () => openCamera(camera);
          popup.style.left = `${clamp(markerRect.left - rect.left + markerRect.width / 2, 140, rect.width - 140)}px`;
          popup.style.top = `${clamp(markerRect.top - rect.top - 10, 105, rect.height - 100)}px`;
          popup.hidden = false;
        });
      });
    }

    function setZoom(next) {
      state.zoom = clamp(Math.round(next), MIN_ZOOM, MAX_ZOOM);
      closePopup();
      render();
    }

    element.querySelector("[data-camera-map-zoom='in']")?.addEventListener("click", () => setZoom(state.zoom + 1));
    element.querySelector("[data-camera-map-zoom='out']")?.addEventListener("click", () => setZoom(state.zoom - 1));
    element.querySelector("[data-camera-map-reset]")?.addEventListener("click", () => { state.center = { ...START_CENTER }; state.zoom = START_ZOOM; closePopup(); render(); });
    element.querySelector(".niagara-camera-map__popup-close")?.addEventListener("click", closePopup);
    element.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom(state.zoom + 1); }
      else if (event.key === "-") { event.preventDefault(); setZoom(state.zoom - 1); }
      else if (event.key === "Escape") closePopup();
    });

    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startCenter = null;
    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest("button,a")) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startCenter = project(state.center.lat, state.center.lng, state.zoom);
      element.classList.add("is-dragging");
      element.setPointerCapture(pointerId);
      closePopup();
    });
    element.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      state.center = unproject(startCenter.x - (event.clientX - startX), startCenter.y - (event.clientY - startY), state.zoom);
      render();
    });
    const stopDrag = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      element.classList.remove("is-dragging");
      try { element.releasePointerCapture(pointerId); } catch (_error) {}
      pointerId = null;
    };
    element.addEventListener("pointerup", stopDrag);
    element.addEventListener("pointercancel", stopDrag);

    if ("ResizeObserver" in window) new ResizeObserver(render).observe(element);
    else window.addEventListener("resize", render);

    document.querySelectorAll("[data-camera-map-fallback]").forEach((link) => {
      link.addEventListener("click", () => {
        const group = groupCenters.find((item) => item.id === link.dataset.cameraMapFallback);
        if (!group) return;
        state.center = { lat: group.lat, lng: group.lng };
        state.zoom = DETAIL_ZOOM;
        closePopup();
        render();
      });
    });

    render();
  }

  function boot() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container) return;
    window.setTimeout(initCameraMap, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
