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

  const CAMERAS = [
    { id: "peace-qew", label: "QEW", title: "Peace Bridge looking toward QEW", lat: 42.90774, lng: -78.91968, dx: -58, dy: -14 },
    { id: "peace-canadian-plaza", label: "CA plaza", title: "Peace Bridge Canadian Plaza", lat: 42.90743, lng: -78.90935, dx: -30, dy: 20 },
    { id: "peace-ca", label: "→ Canada", title: "Peace Bridge Deck looking toward Canada", lat: 42.90706, lng: -78.9062, dx: 0, dy: -22 },
    { id: "peace-us", label: "→ U.S.", title: "Peace Bridge Deck looking toward U.S.", lat: 42.90617, lng: -78.90079, dx: 30, dy: 20 },
    { id: "peace-us-plaza", label: "US plaza", title: "I-190 North Ramp to Peace Bridge U.S. Plaza", lat: 42.90174, lng: -78.89984, dx: 58, dy: -14 },
    { id: "rainbow-ca", label: "→ Canada", title: "Rainbow Bridge looking toward Canada", lat: 43.08906, lng: -79.06638, dx: -28, dy: -10 },
    { id: "rainbow-us", label: "→ U.S.", title: "Rainbow Bridge looking toward U.S.", lat: 43.09151, lng: -79.06948, dx: 28, dy: 10 },
    { id: "lewiston-us", label: "US plaza", title: "Lewiston–Queenston Bridge U.S. Plaza", lat: 43.15271, lng: -79.04287, dx: -30, dy: 10 },
    { id: "queenston-ca", label: "CA plaza", title: "Lewiston–Queenston Bridge Canadian Plaza", lat: 43.15391, lng: -79.04839, dx: 30, dy: -10 },
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

  function injectStyles() {
    if (document.getElementById("niagaraCanonicalCameraMapStyles")) return;
    const style = document.createElement("style");
    style.id = "niagaraCanonicalCameraMapStyles";
    style.textContent = `
      #niagaraBridgeMap{position:relative!important;display:block!important;min-height:390px!important;overflow:hidden!important}
      .niagara-visual-map__fallback{display:none!important}
      .niagara-canonical-map{position:absolute;inset:0;overflow:hidden;background:#dfe7e9;cursor:grab;touch-action:none;overscroll-behavior:contain}
      .niagara-canonical-map.is-dragging{cursor:grabbing}
      .niagara-canonical-map__tiles,.niagara-canonical-map__markers{position:absolute;inset:0}
      .niagara-canonical-map__tile{position:absolute;width:256px;height:256px;max-width:none;pointer-events:none;user-select:none}
      .niagara-canonical-map__pin{position:absolute;z-index:5;display:flex;align-items:center;gap:4px;transform:translate(-50%,-50%);min-width:34px;height:34px;padding:0 7px;border:1px solid rgba(7,35,54,.28);border-radius:999px;background:#fff;color:#0b314c;box-shadow:0 3px 12px rgba(7,35,54,.24);cursor:pointer;font:700 8px/1 var(--sans,system-ui,sans-serif);white-space:nowrap}
      .niagara-canonical-map__pin svg{width:15px;height:15px;flex:0 0 15px;fill:#0b5c8b}
      .niagara-canonical-map__pin:hover,.niagara-canonical-map__pin:focus-visible{z-index:9;border-color:#0b5c8b;outline:3px solid rgba(11,92,139,.22);outline-offset:2px}
      .niagara-canonical-map__controls{position:absolute;z-index:10;top:10px;right:10px;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(7,35,54,.22);border-radius:9px;background:#fff;box-shadow:0 4px 14px rgba(7,35,54,.14)}
      .niagara-canonical-map__controls button{width:42px;height:40px;border:0;border-bottom:1px solid #d6dfe2;background:#fff;color:#173f56;cursor:pointer;font:700 20px/1 system-ui,sans-serif}
      .niagara-canonical-map__controls button:last-child{border-bottom:0;font-size:16px}
      .niagara-canonical-map__note{position:absolute;z-index:7;left:8px;top:8px;max-width:205px;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.94);color:#405965;box-shadow:0 2px 8px rgba(7,35,54,.12);font:700 9px/1.35 var(--sans,system-ui,sans-serif)}
      .niagara-canonical-map__attribution{position:absolute;z-index:7;right:5px;bottom:5px;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:245px;padding:3px 5px;border-radius:4px;background:rgba(255,255,255,.9);color:#53656f;font:8px/1.2 system-ui,sans-serif}
      .niagara-canonical-map__attribution a{color:#315c70;text-decoration:none}
      @media(max-width:620px){#niagaraBridgeMap{min-height:360px!important}.niagara-canonical-map__pin{height:32px;min-width:32px;padding:0 6px;font-size:7px}.niagara-canonical-map__note{max-width:175px;font-size:8px}.niagara-canonical-map__controls button{width:40px;height:38px}}
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
    if (eyebrow) eyebrow.textContent = "Official bridge camera map";
    if (heading) heading.textContent = "Nine Niagara border cameras, mapped";
    if (intro) intro.textContent = "Drag the CARTO map, zoom in or out, and tap any camera pin to open that exact bridge view. Nine official international-bridge cameras are shown; Whirlpool Rapids has no dedicated camera.";
    if (note) note.innerHTML = `Camera locations and feeds are sourced from <a href="${NITTEC_URL}" target="_blank" rel="noopener">NITTEC</a> and the bridge authorities. Whirlpool Rapids has no dedicated camera, so no marker is invented there.`;
  }

  function openCamera(camera) {
    const tab = document.querySelector(`[data-niagara-camera="${camera.id}"]`);
    if (tab instanceof HTMLElement) tab.click();
    const viewer = document.getElementById("niagaraCameraViewer");
    if (viewer) viewer.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window.va === "function") window.va("event", { name: "Niagara Camera Interaction", data: { action: "canonical-map-select", camera: camera.id } });
  }

  function buildMap(container) {
    injectStyles();
    updateSectionCopy();
    document.querySelectorAll(".niagara-visual-map__fallback").forEach((node) => node.remove());

    container.replaceChildren();
    container.removeAttribute("role");
    container.dataset.canonicalCameraMap = "true";
    container.setAttribute("aria-label", "Interactive CARTO map with nine official Niagara international-bridge camera locations");
    container.innerHTML = `
      <div class="niagara-canonical-map" tabindex="0" aria-label="CARTO bridge camera map. Drag to pan. Use plus and minus to zoom. Tap a camera to open it.">
        <div class="niagara-canonical-map__tiles" aria-hidden="true"></div>
        <div class="niagara-canonical-map__markers"></div>
        <div class="niagara-canonical-map__note">9 bridge cameras · drag map · tap a camera</div>
        <div class="niagara-canonical-map__controls" aria-label="Map controls">
          <button type="button" data-canonical-map-zoom="in" aria-label="Zoom in">+</button>
          <button type="button" data-canonical-map-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-canonical-map-reset aria-label="Reset map">↺</button>
        </div>
        <div class="niagara-canonical-map__attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a><span>·</span><a href="https://carto.com/attributions" target="_blank" rel="noopener">© CARTO</a><span>·</span><a href="${NITTEC_URL}" target="_blank" rel="noopener">cameras: NITTEC</a></div>
      </div>`;

    const element = container.querySelector(".niagara-canonical-map");
    const tiles = element.querySelector(".niagara-canonical-map__tiles");
    const markers = element.querySelector(".niagara-canonical-map__markers");
    const state = { center: { ...START_CENTER }, zoom: START_ZOOM };

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
      const tileFragment = document.createDocumentFragment();
      for (let y = minY; y <= maxY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        for (let x = minX; x <= maxX; x += 1) {
          const wrappedX = ((x % maxTile) + maxTile) % maxTile;
          const image = document.createElement("img");
          image.className = "niagara-canonical-map__tile";
          image.alt = "";
          image.draggable = false;
          image.decoding = "async";
          image.src = tileUrl(state.zoom, wrappedX, y);
          image.style.left = `${Math.round(x * TILE_SIZE - topLeft.x)}px`;
          image.style.top = `${Math.round(y * TILE_SIZE - topLeft.y)}px`;
          tileFragment.appendChild(image);
        }
      }
      tiles.replaceChildren(tileFragment);

      const markerFragment = document.createDocumentFragment();
      CAMERAS.forEach((camera) => {
        const point = project(camera.lat, camera.lng, state.zoom);
        const fan = state.zoom < DETAIL_ZOOM ? { x: camera.dx, y: camera.dy } : { x: 0, y: 0 };
        const button = document.createElement("button");
        button.type = "button";
        button.className = "niagara-canonical-map__pin";
        button.dataset.cameraId = camera.id;
        button.style.left = `${point.x - topLeft.x + fan.x}px`;
        button.style.top = `${point.y - topLeft.y + fan.y}px`;
        button.title = camera.title;
        button.setAttribute("aria-label", `${camera.title}. Open this live camera.`);
        button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7.5 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L15 4H9Zm3 4.25A4.75 4.75 0 1 1 12 17.75 4.75 4.75 0 0 1 12 8.25Zm0 2A2.75 2.75 0 1 0 12 15.75 2.75 2.75 0 0 0 12 10.25Z"/></svg><span>${camera.label}</span>`;
        button.addEventListener("click", () => openCamera(camera));
        markerFragment.appendChild(button);
      });
      markers.replaceChildren(markerFragment);
    }

    function setZoom(nextZoom) {
      state.zoom = clamp(Math.round(nextZoom), MIN_ZOOM, MAX_ZOOM);
      render();
    }

    element.querySelector('[data-canonical-map-zoom="in"]')?.addEventListener("click", () => setZoom(state.zoom + 1));
    element.querySelector('[data-canonical-map-zoom="out"]')?.addEventListener("click", () => setZoom(state.zoom - 1));
    element.querySelector("[data-canonical-map-reset]")?.addEventListener("click", () => {
      state.center = { ...START_CENTER };
      state.zoom = START_ZOOM;
      render();
    });

    element.addEventListener("wheel", (event) => {
      event.preventDefault();
      setZoom(state.zoom + (event.deltaY < 0 ? 1 : -1));
    }, { passive: false });

    let dragging = false;
    let pointerId = null;
    let start = null;
    let startCenterWorld = null;

    element.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button,a")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      pointerId = event.pointerId;
      start = { x: event.clientX, y: event.clientY };
      startCenterWorld = project(state.center.lat, state.center.lng, state.zoom);
      element.classList.add("is-dragging");
      element.setPointerCapture(pointerId);
      event.preventDefault();
    });

    element.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      state.center = unproject(startCenterWorld.x - dx, startCenterWorld.y - dy, state.zoom);
      render();
      event.preventDefault();
    });

    const finishDrag = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      element.classList.remove("is-dragging");
      try { element.releasePointerCapture(pointerId); } catch (_error) {}
      pointerId = null;
    };
    element.addEventListener("pointerup", finishDrag);
    element.addEventListener("pointercancel", finishDrag);

    element.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom(state.zoom + 1); }
      else if (event.key === "-") { event.preventDefault(); setZoom(state.zoom - 1); }
    });

    if ("ResizeObserver" in window) new ResizeObserver(render).observe(element);
    else window.addEventListener("resize", render);
    render();
  }

  function takeOver() {
    const container = document.getElementById("niagaraBridgeMap");
    if (!container) return false;
    buildMap(container);
    return true;
  }

  function boot() {
    if (takeOver()) return;
    if (!("MutationObserver" in window)) return;
    const observer = new MutationObserver(() => {
      if (!takeOver()) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Run after every legacy/deferred Niagara layer has had its chance. This file is
  // the final map owner and physically removes the old four-bridge fallback.
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });
})();
