(() => {
  "use strict";

  const TILE_SIZE = 256;
  const MIN_ZOOM = 8;
  const MAX_ZOOM = 15;
  const START_ZOOM = 10;
  const DETAIL_ZOOM = 13;
  const START_CENTER = { lat: 43.031, lng: -79.005 };
  const TILE_TEMPLATE = "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
  const NITTEC_URL = "https://www.nittec.org/cameras/";
  const CAMERA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7.5 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L15 4H9Zm3 4.25A4.75 4.75 0 1 1 12 17.75 4.75 4.75 0 0 1 12 8.25Zm0 2A2.75 2.75 0 1 0 12 15.75 2.75 2.75 0 0 0 12 10.25Z"/></svg>';

  const cameras = [
    { id: "peace-qew", sourceId: 1004, title: "Peace Bridge looking toward QEW", label: "QEW", lat: 42.90774, lng: -78.91968, dx: -58, dy: -14, source: "NITTEC / Peace Bridge" },
    { id: "peace-canadian-plaza", sourceId: 1003, title: "Peace Bridge Canadian Plaza", label: "CA plaza", lat: 42.90743, lng: -78.90935, dx: -30, dy: 20, source: "NITTEC / Peace Bridge" },
    { id: "peace-ca", sourceId: 1002, title: "Peace Bridge Deck looking toward Canada", label: "→ Canada", lat: 42.90706, lng: -78.9062, dx: 0, dy: -22, source: "NITTEC / Peace Bridge" },
    { id: "peace-us", sourceId: 1001, title: "Peace Bridge Deck looking toward U.S.", label: "→ U.S.", lat: 42.90617, lng: -78.90079, dx: 30, dy: 20, source: "NITTEC / Peace Bridge" },
    { id: "peace-us-plaza", sourceId: 1005, title: "I-190 North Ramp to Peace Bridge U.S. Plaza", label: "US plaza", lat: 42.90174, lng: -78.89984, dx: 58, dy: -14, source: "NITTEC / Peace Bridge" },
    { id: "rainbow-ca", sourceId: 1011, title: "Rainbow Bridge looking toward Canada", label: "→ Canada", lat: 43.08906, lng: -79.06638, dx: -28, dy: -10, source: "NITTEC" },
    { id: "rainbow-us", sourceId: 688, title: "Rainbow Bridge looking toward U.S.", label: "→ U.S.", lat: 43.09151, lng: -79.06948, dx: 28, dy: 10, source: "NITTEC" },
    { id: "lewiston-us", sourceId: 1021, title: "Lewiston–Queenston Bridge U.S. Plaza", label: "US plaza", lat: 43.15271, lng: -79.04287, dx: -30, dy: 10, source: "NITTEC" },
    { id: "queenston-ca", sourceId: 1022, title: "Lewiston–Queenston Bridge Canadian Plaza", label: "CA plaza", lat: 43.15391, lng: -79.04839, dx: 30, dy: -10, source: "NITTEC" },
  ];

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
    if (eyebrow) eyebrow.textContent = "Live camera map";
    if (heading) heading.textContent = "Nine Niagara border cameras on the map";
    if (intro) intro.textContent = "Drag the CARTO map with one finger or a mouse. Use + and − to zoom. Tap any camera pin to open that exact bridge view.";
    if (note) note.innerHTML = `CARTO / OpenStreetMap basemap. Camera locations come from <a href="${NITTEC_URL}" target="_blank" rel="noopener">NITTEC</a> and the bridge authorities. Whirlpool Rapids has no dedicated official road camera, so no camera pin is invented there.`;
    if (fallback) {
      fallback.setAttribute("aria-label", "Niagara camera coverage summary");
      fallback.innerHTML = '<a href="#bridgeCameras"><strong>Peace Bridge · 5 cameras</strong><span>QEW, Canadian plaza, deck both ways and U.S. plaza.</span></a><a href="#bridgeCameras"><strong>Rainbow Bridge · 2 cameras</strong><span>Canada-bound and U.S.-bound views.</span></a><a href="#bridgeCameras"><strong>Lewiston–Queenston · 2 cameras</strong><span>U.S. and Canadian plaza views.</span></a>';
    }
  }

  function injectStyles() {
    if (document.getElementById("niagaraTouchCameraMapStyles")) return;
    const style = document.createElement("style");
    style.id = "niagaraTouchCameraMapStyles";
    style.textContent = `
      .niagara-touch-camera-map{position:relative;width:100%;height:100%;min-height:340px;overflow:hidden;background:#dfe7e9;cursor:grab;touch-action:none;overscroll-behavior:contain;-webkit-user-select:none;user-select:none}
      .niagara-touch-camera-map.is-dragging{cursor:grabbing}.niagara-touch-camera-map__tiles,.niagara-touch-camera-map__markers{position:absolute;inset:0}.niagara-touch-camera-map__tile{position:absolute;width:256px;height:256px;max-width:none;pointer-events:none;user-select:none}.niagara-touch-camera-map__marker{position:absolute;z-index:4;display:flex;align-items:center;justify-content:center;gap:4px;height:34px;min-width:36px;padding:0 7px;transform:translate(-50%,-50%);border:1px solid rgba(7,35,54,.3);border-radius:999px;background:#fff;color:#0b314c;box-shadow:0 3px 12px rgba(7,35,54,.24);cursor:pointer}.niagara-touch-camera-map__marker svg{width:15px;height:15px;flex:0 0 15px;fill:#0b5c8b}.niagara-touch-camera-map__marker span{font:700 8px/1 var(--sans);white-space:nowrap}.niagara-touch-camera-map__marker:hover,.niagara-touch-camera-map__marker:focus-visible{z-index:7;border-color:#0b5c8b;outline:3px solid rgba(11,92,139,.22);outline-offset:2px}.niagara-touch-camera-map__popup{position:absolute;z-index:9;width:min(280px,calc(100% - 24px));transform:translate(-50%,-100%);padding:14px 34px 14px 14px;border:1px solid #aebfc6;border-radius:12px;background:#fff;box-shadow:0 12px 28px rgba(7,35,54,.24);color:#183846}.niagara-touch-camera-map__popup[hidden]{display:none}.niagara-touch-camera-map__popup-close{position:absolute;top:5px;right:6px;width:28px;height:28px;border:0;background:transparent;color:#53656f;cursor:pointer;font-size:22px}.niagara-touch-camera-map__popup-kicker{display:block;color:#6a7b84;font:700 9px/1.2 var(--sans);letter-spacing:.08em;text-transform:uppercase}.niagara-touch-camera-map__popup-title{display:block;margin-top:4px;color:#0b314c;font:700 14px/1.3 var(--sans)}.niagara-touch-camera-map__popup-source{display:block;margin-top:5px;color:#5a6c75;font:10px/1.35 var(--sans)}.niagara-touch-camera-map__popup-open{margin-top:10px;padding:8px 10px;border:1px solid #0b5c8b;border-radius:8px;background:#0b5c8b;color:#fff;cursor:pointer;font:700 10px/1.2 var(--sans)}.niagara-touch-camera-map__controls{position:absolute;z-index:8;top:12px;right:12px;display:flex;flex-direction:column;border:1px solid rgba(7,35,54,.22);border-radius:9px;overflow:hidden;background:#fff;box-shadow:0 4px 14px rgba(7,35,54,.14)}.niagara-touch-camera-map__controls button{width:42px;height:40px;border:0;border-bottom:1px solid #d6dfe2;background:#fff;color:#173f56;cursor:pointer;font:700 20px/1 var(--sans)}.niagara-touch-camera-map__controls button:last-child{border-bottom:0;font-size:16px}.niagara-touch-camera-map__status{position:absolute;z-index:6;left:8px;top:8px;max-width:205px;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.94);color:#405965;font:700 9px/1.35 var(--sans);box-shadow:0 2px 8px rgba(7,35,54,.12)}.niagara-touch-camera-map__attribution{position:absolute;z-index:6;right:5px;bottom:5px;display:flex;gap:4px;padding:3px 5px;border-radius:4px;background:rgba(255,255,255,.9);color:#53656f;font:8px/1.2 var(--sans)}.niagara-touch-camera-map__attribution a{color:#315c70;text-decoration:none}@media(max-width:620px){.niagara-touch-camera-map{min-height:360px}.niagara-touch-camera-map__marker{height:32px;min-width:32px;padding:0 6px}.niagara-touch-camera-map__marker span{font-size:7px}.niagara-touch-camera-map__attribution{max-width:210px;flex-wrap:wrap;justify-content:flex-end}}
    `;
    document.head.appendChild(style);
  }

  function makeShell(container) {
    container.replaceChildren();
    container.removeAttribute("role");
    container.dataset.cameraMapReady = "touch-v3";
    container.setAttribute("aria-label", "Interactive CARTO map of nine Niagara border cameras");
    container.innerHTML = `
      <div class="niagara-touch-camera-map" tabindex="0" aria-label="CARTO map with nine Niagara bridge camera pins. Drag to pan and use plus or minus to zoom.">
        <div class="niagara-touch-camera-map__tiles" aria-hidden="true"></div>
        <div class="niagara-touch-camera-map__markers"></div>
        <div class="niagara-touch-camera-map__popup" hidden>
          <button type="button" class="niagara-touch-camera-map__popup-close" aria-label="Close camera details">×</button>
          <span class="niagara-touch-camera-map__popup-kicker">Official bridge camera</span>
          <strong class="niagara-touch-camera-map__popup-title"></strong>
          <span class="niagara-touch-camera-map__popup-source"></span>
          <button type="button" class="niagara-touch-camera-map__popup-open">Open this camera</button>
        </div>
        <div class="niagara-touch-camera-map__controls" aria-label="Map controls">
          <button type="button" data-touch-map-zoom="in" aria-label="Zoom in">+</button>
          <button type="button" data-touch-map-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-touch-map-reset aria-label="Reset map">↺</button>
        </div>
        <div class="niagara-touch-camera-map__status">9 bridge cameras · drag to move · + / − to zoom</div>
        <div class="niagara-touch-camera-map__attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a><span>·</span><a href="https://carto.com/attributions" target="_blank" rel="noopener">© CARTO</a><span>·</span><a href="${NITTEC_URL}" target="_blank" rel="noopener">cameras: NITTEC</a></div>
      </div>`;
    return container.querySelector(".niagara-touch-camera-map");
  }

  function openCamera(camera) {
    const tab = document.querySelector(`[data-niagara-camera="${camera.id}"]`);
    if (tab instanceof HTMLElement) tab.click();
    document.getElementById("niagaraCameraViewer")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window.va === "function") window.va("event", { name: "Niagara Camera Interaction", data: { action: "touch-map-select", camera: camera.id, sourceId: camera.sourceId } });
  }

  function init() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container) return;
    injectStyles();
    updateSectionCopy();
    const element = makeShell(container);
    const state = {
      center: { ...START_CENTER },
      zoom: START_ZOOM,
      tiles: element.querySelector(".niagara-touch-camera-map__tiles"),
      markers: element.querySelector(".niagara-touch-camera-map__markers"),
      popup: element.querySelector(".niagara-touch-camera-map__popup"),
    };

    const closePopup = () => { state.popup.hidden = true; };

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
      const tileFrag = document.createDocumentFragment();
      for (let y = minY; y <= maxY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        for (let x = minX; x <= maxX; x += 1) {
          const wrappedX = ((x % maxTile) + maxTile) % maxTile;
          const image = document.createElement("img");
          image.className = "niagara-touch-camera-map__tile";
          image.alt = "";
          image.draggable = false;
          image.decoding = "async";
          image.src = tileUrl(state.zoom, wrappedX, y);
          image.style.left = `${Math.round(x * TILE_SIZE - topLeft.x)}px`;
          image.style.top = `${Math.round(y * TILE_SIZE - topLeft.y)}px`;
          tileFrag.appendChild(image);
        }
      }
      state.tiles.replaceChildren(tileFrag);

      const markerFrag = document.createDocumentFragment();
      cameras.forEach((camera) => {
        const point = project(camera.lat, camera.lng, state.zoom);
        const regional = state.zoom < DETAIL_ZOOM;
        const left = point.x - topLeft.x + (regional ? camera.dx : 0);
        const top = point.y - topLeft.y + (regional ? camera.dy : 0);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "niagara-touch-camera-map__marker";
        button.dataset.cameraId = camera.id;
        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.setAttribute("aria-label", `${camera.title}. Open this live camera.`);
        button.title = camera.title;
        button.innerHTML = `${CAMERA_ICON}<span>${camera.label}</span>`;
        button.addEventListener("click", () => {
          const rect = element.getBoundingClientRect();
          const markerRect = button.getBoundingClientRect();
          state.popup.querySelector(".niagara-touch-camera-map__popup-title").textContent = camera.title;
          state.popup.querySelector(".niagara-touch-camera-map__popup-source").textContent = `${camera.source} · NITTEC camera ${camera.sourceId}`;
          state.popup.querySelector(".niagara-touch-camera-map__popup-open").onclick = () => openCamera(camera);
          state.popup.style.left = `${clamp(markerRect.left - rect.left + markerRect.width / 2, 140, rect.width - 140)}px`;
          state.popup.style.top = `${clamp(markerRect.top - rect.top - 8, 105, rect.height - 90)}px`;
          state.popup.hidden = false;
        });
        markerFrag.appendChild(button);
      });
      state.markers.replaceChildren(markerFrag);
    }

    function setZoom(nextZoom) {
      const next = clamp(Math.round(nextZoom), MIN_ZOOM, MAX_ZOOM);
      if (next === state.zoom) return;
      state.zoom = next;
      closePopup();
      render();
    }

    element.querySelector("[data-touch-map-zoom='in']")?.addEventListener("click", () => setZoom(state.zoom + 1));
    element.querySelector("[data-touch-map-zoom='out']")?.addEventListener("click", () => setZoom(state.zoom - 1));
    element.querySelector("[data-touch-map-reset]")?.addEventListener("click", () => { state.center = { ...START_CENTER }; state.zoom = START_ZOOM; closePopup(); render(); });
    element.querySelector(".niagara-touch-camera-map__popup-close")?.addEventListener("click", closePopup);
    element.addEventListener("wheel", (event) => { event.preventDefault(); setZoom(state.zoom + (event.deltaY < 0 ? 1 : -1)); }, { passive: false });
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
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest("button,a")) return;
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
      event.preventDefault();
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
    render();
  }

  function boot() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container) return;
    // This physical asset is deliberately loaded after the legacy visual layer.
    // Always take ownership of the visible map so stale four-bridge maps cannot win.
    init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
