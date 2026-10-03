(() => {
  "use strict";

  const CAMERA_REFRESH_MS = 30000;
  const CARTO_BASEMAP_KEY = "cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88";
  const CARTO_TILE_TEMPLATE =
    "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=" +
    encodeURIComponent(CARTO_BASEMAP_KEY);
  const TILE_SIZE = 256;
  const MAP_MIN_ZOOM = 8;
  const MAP_MAX_ZOOM = 15;
  const MAP_START_ZOOM = 10;
  const MAP_START_CENTER = { lat: 43.031, lng: -79.005 };

  const crossings = [
    {
      id: "peace",
      name: "Peace Bridge",
      shortLabel: "Peace",
      role: "Buffalo, NY ↔ Fort Erie, ON · southern QEW / I-190 route",
      lat: 42.90691,
      lng: -78.906,
      cameraCount: 5,
    },
    {
      id: "rainbow",
      name: "Rainbow Bridge",
      shortLabel: "Rainbow",
      role: "Niagara Falls, NY ↔ Niagara Falls, ON · visitor / passenger route",
      lat: 43.08998,
      lng: -79.06735,
      cameraCount: 2,
    },
    {
      id: "whirlpool",
      name: "Whirlpool Rapids Bridge",
      shortLabel: "Whirlpool",
      role: "Niagara Falls · NEXUS-only specialist crossing",
      lat: 43.10942,
      lng: -79.05845,
      cameraCount: 0,
    },
    {
      id: "lewiston-queenston",
      name: "Lewiston–Queenston Bridge",
      shortLabel: "Lewiston–Queenston",
      role: "Lewiston, NY ↔ Queenston, ON · northern highway / truck route",
      lat: 43.15448,
      lng: -79.04502,
      cameraCount: 2,
    },
  ];

  const cameras = [
    {
      id: "peace-qew",
      crossing: "peace",
      direction: "to_canada",
      label: "Peace → QEW",
      title: "Peace Bridge looking toward the QEW",
      src: "https://i.ytimg.com/vi/SETJ79HmwI0/maxresdefault_live.jpg",
      fallbackSrc: "https://i.ytimg.com/vi/SETJ79HmwI0/hqdefault_live.jpg",
      source: "NITTEC / Peace Bridge",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official international-bridge view looking toward the QEW.",
    },
    {
      id: "peace-canadian-plaza",
      crossing: "peace",
      direction: "to_canada",
      label: "Peace Canada plaza",
      title: "Peace Bridge Canadian plaza",
      src: "https://i.ytimg.com/vi/WPMgP2C3_co/maxresdefault_live.jpg",
      fallbackSrc: "https://i.ytimg.com/vi/WPMgP2C3_co/hqdefault_live.jpg",
      source: "NITTEC / Peace Bridge",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official international-bridge view of the Canadian plaza.",
    },
    {
      id: "peace-ca",
      crossing: "peace",
      direction: "to_canada",
      label: "Peace deck → Canada",
      title: "Peace Bridge deck looking toward Canada",
      src: "https://i.ytimg.com/vi/DnUFAShZKus/maxresdefault_live.jpg",
      fallbackSrc: "https://i.ytimg.com/vi/DnUFAShZKus/hqdefault_live.jpg",
      source: "NITTEC / Peace Bridge",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official international-bridge view from the deck toward Canada.",
      preferred: true,
    },
    {
      id: "peace-us",
      crossing: "peace",
      direction: "to_us",
      label: "Peace deck → U.S.",
      title: "Peace Bridge deck looking toward the United States",
      src: "https://i.ytimg.com/vi/9En2186vo5g/maxresdefault_live.jpg",
      fallbackSrc: "https://i.ytimg.com/vi/9En2186vo5g/hqdefault_live.jpg",
      source: "NITTEC / Peace Bridge",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official international-bridge view from the deck toward the United States.",
      preferred: true,
    },
    {
      id: "peace-us-plaza",
      crossing: "peace",
      direction: "to_us",
      label: "Peace U.S. plaza",
      title: "I-190 north ramp to Peace Bridge U.S. plaza",
      src: "https://i.ytimg.com/vi/yygTuX5JaKg/hqdefault_live.jpg",
      source: "NITTEC / Peace Bridge",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official international-bridge approach view of the U.S. plaza.",
    },
    {
      id: "rainbow-ca",
      crossing: "rainbow",
      direction: "to_canada",
      label: "Rainbow → Canada",
      title: "Rainbow Bridge looking toward Canada",
      src: "https://nyssnapshot.com/R5_102.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official NITTEC still image looking from the U.S. side toward Canada.",
      preferred: true,
    },
    {
      id: "rainbow-us",
      crossing: "rainbow",
      direction: "to_us",
      label: "Rainbow → U.S.",
      title: "Rainbow Bridge looking toward the United States",
      src: "https://nyssnapshot.com/R5_103.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official NITTEC still image looking toward the United States.",
      preferred: true,
    },
    {
      id: "lewiston-us",
      crossing: "lewiston-queenston",
      direction: "to_us",
      label: "Lewiston U.S. plaza",
      title: "Lewiston–Queenston Bridge U.S. plaza",
      src: "https://nyssnapshot.com/R5_101.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official NITTEC still image of the U.S. plaza at Lewiston.",
      preferred: true,
    },
    {
      id: "queenston-ca",
      crossing: "lewiston-queenston",
      direction: "to_canada",
      label: "Queenston Canada plaza",
      title: "Lewiston–Queenston Bridge Canadian plaza",
      src: "https://nyssnapshot.com/R5_100.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/",
      note: "Official NITTEC still image of the Canadian plaza at Queenston.",
      preferred: true,
    },
    {
      id: "whirlpool",
      crossing: "whirlpool",
      direction: "any",
      label: "Whirlpool",
      title: "Whirlpool Rapids Bridge",
      src: null,
      source: "Niagara Falls Bridge Commission",
      sourceUrl: "https://www.niagarafallsbridges.com/services/traffic-conditions",
      note: "No dedicated official road camera is currently identified for Whirlpool Rapids. Use the bridge commission traffic page for operator status.",
    },
  ];

  const state = {
    camera: "rainbow-ca",
    viewerActive: false,
    retryingFallback: false,
    refreshTimer: null,
    map: null,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cacheBust(url) {
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`;
  }

  function currentCamera() {
    return cameras.find((camera) => camera.id === state.camera) || cameras[0];
  }

  function tripDirection() {
    const selected = document.querySelector("[data-direction][aria-pressed='true']");
    return selected?.dataset.direction || "to_canada";
  }

  function cameraForCrossing(crossingId, direction) {
    return (
      cameras.find(
        (camera) =>
          camera.crossing === crossingId &&
          camera.direction === direction &&
          camera.preferred,
      ) ||
      cameras.find(
        (camera) =>
          camera.crossing === crossingId && camera.direction === direction,
      ) ||
      cameras.find((camera) => camera.crossing === crossingId)
    );
  }

  function cartoTileUrl(z, x, y) {
    return CARTO_TILE_TEMPLATE.replace("{z}", String(z))
      .replace("{x}", String(x))
      .replace("{y}", String(y));
  }

  function mercatorProject(lat, lng, zoom) {
    const scale = TILE_SIZE * 2 ** zoom;
    const safeLat = clamp(lat, -85.05112878, 85.05112878);
    const sin = Math.sin((safeLat * Math.PI) / 180);
    return {
      x: ((lng + 180) / 360) * scale,
      y:
        (0.5 -
          Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) *
        scale,
    };
  }

  function mercatorUnproject(x, y, zoom) {
    const scale = TILE_SIZE * 2 ** zoom;
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
    return { lat, lng };
  }

  function createMapShell(container) {
    container.innerHTML = `
      <div class="niagara-carto-map" tabindex="0" aria-label="Interactive CARTO map of the four Niagara River border crossings. Use the plus and minus buttons to zoom and drag with a mouse to pan.">
        <div class="niagara-carto-tiles" aria-hidden="true"></div>
        <div class="niagara-carto-markers"></div>
        <div class="niagara-carto-popup" hidden>
          <button class="niagara-carto-popup__close" type="button" aria-label="Close bridge details">×</button>
          <strong class="niagara-carto-popup__title"></strong>
          <span class="niagara-carto-popup__role"></span>
          <button class="niagara-carto-popup__camera" type="button"></button>
        </div>
        <div class="niagara-carto-controls" aria-label="Map controls">
          <button type="button" data-carto-zoom="in" aria-label="Zoom in">+</button>
          <button type="button" data-carto-zoom="out" aria-label="Zoom out">−</button>
          <button type="button" data-carto-reset aria-label="Reset map">↺</button>
        </div>
        <div class="niagara-carto-attribution">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>
          <span>·</span>
          <a href="https://carto.com/attributions" target="_blank" rel="noopener">© CARTO</a>
        </div>
      </div>`;
    return container.querySelector(".niagara-carto-map");
  }

  function renderMapTiles(mapState) {
    const { element, tileLayer, markerLayer } = mapState;
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (!width || !height) return;

    const centerWorld = mercatorProject(
      mapState.center.lat,
      mapState.center.lng,
      mapState.zoom,
    );
    const topLeft = {
      x: centerWorld.x - width / 2,
      y: centerWorld.y - height / 2,
    };
    const maxTile = 2 ** mapState.zoom;
    const minX = Math.floor(topLeft.x / TILE_SIZE);
    const maxX = Math.floor((topLeft.x + width) / TILE_SIZE);
    const minY = Math.floor(topLeft.y / TILE_SIZE);
    const maxY = Math.floor((topLeft.y + height) / TILE_SIZE);

    const tileFragment = document.createDocumentFragment();
    for (let tileY = minY; tileY <= maxY; tileY += 1) {
      if (tileY < 0 || tileY >= maxTile) continue;
      for (let tileX = minX; tileX <= maxX; tileX += 1) {
        const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;
        const image = document.createElement("img");
        image.className = "niagara-carto-tile";
        image.alt = "";
        image.draggable = false;
        image.decoding = "async";
        image.src = cartoTileUrl(mapState.zoom, wrappedX, tileY);
        image.style.left = `${Math.round(tileX * TILE_SIZE - topLeft.x)}px`;
        image.style.top = `${Math.round(tileY * TILE_SIZE - topLeft.y)}px`;
        tileFragment.appendChild(image);
      }
    }
    tileLayer.replaceChildren(tileFragment);

    const markerFragment = document.createDocumentFragment();
    crossings.forEach((crossing) => {
      const point = mercatorProject(crossing.lat, crossing.lng, mapState.zoom);
      const left = point.x - topLeft.x;
      const top = point.y - topLeft.y;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `niagara-carto-marker${
        crossing.id === "whirlpool" ? " is-special" : ""
      }`;
      button.dataset.mapCrossing = crossing.id;
      button.style.left = `${left}px`;
      button.style.top = `${top}px`;
      button.setAttribute(
        "aria-label",
        `${crossing.name}. ${crossing.role}. ${
          crossing.cameraCount
            ? `${crossing.cameraCount} embedded camera view${
                crossing.cameraCount === 1 ? "" : "s"
              }.`
            : "No dedicated embedded camera."
        }`,
      );
      button.innerHTML = `<span class="niagara-carto-marker__dot" aria-hidden="true"></span><span class="niagara-carto-marker__label">${crossing.shortLabel}</span>`;
      markerFragment.appendChild(button);
    });
    markerLayer.replaceChildren(markerFragment);

    markerLayer.querySelectorAll("[data-map-crossing]").forEach((button) => {
      button.addEventListener("click", () => {
        showCrossingPopup(mapState, button.dataset.mapCrossing, button);
      });
    });
  }

  function showCrossingPopup(mapState, crossingId, marker) {
    const crossing = crossings.find((item) => item.id === crossingId);
    if (!crossing) return;
    const popup = mapState.popup;
    const title = popup.querySelector(".niagara-carto-popup__title");
    const role = popup.querySelector(".niagara-carto-popup__role");
    const cameraButton = popup.querySelector(".niagara-carto-popup__camera");

    title.textContent = crossing.name;
    role.textContent = crossing.role;
    const camera = cameraForCrossing(crossing.id, tripDirection());
    if (camera?.src) {
      cameraButton.hidden = false;
      cameraButton.disabled = false;
      cameraButton.textContent = `Show embedded camera${
        crossing.cameraCount > 1 ? ` (${crossing.cameraCount} views)` : ""
      }`;
      cameraButton.onclick = () => {
        selectCamera(camera.id, true);
        activateCameraViewer();
        byId("niagaraCameraViewer")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      };
    } else {
      cameraButton.hidden = false;
      cameraButton.textContent = "No dedicated live road camera";
      cameraButton.disabled = true;
      cameraButton.onclick = null;
    }

    const mapRect = mapState.element.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const x = markerRect.left - mapRect.left + markerRect.width / 2;
    const y = markerRect.top - mapRect.top;
    popup.style.left = `${clamp(x, 130, mapRect.width - 130)}px`;
    popup.style.top = `${clamp(y - 12, 100, mapRect.height - 110)}px`;
    popup.hidden = false;
  }

  function closeMapPopup(mapState) {
    mapState.popup.hidden = true;
  }

  function setMapZoom(mapState, nextZoom) {
    const zoom = clamp(Math.round(nextZoom), MAP_MIN_ZOOM, MAP_MAX_ZOOM);
    if (zoom === mapState.zoom) return;
    mapState.zoom = zoom;
    closeMapPopup(mapState);
    renderMapTiles(mapState);
  }

  function resetMap(mapState) {
    mapState.zoom = MAP_START_ZOOM;
    mapState.center = { ...MAP_START_CENTER };
    closeMapPopup(mapState);
    renderMapTiles(mapState);
  }

  function bindMapPan(mapState) {
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startCenter = null;

    mapState.element.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (event.target.closest("button, a")) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startCenter = mercatorProject(
        mapState.center.lat,
        mapState.center.lng,
        mapState.zoom,
      );
      mapState.element.classList.add("is-dragging");
      mapState.element.setPointerCapture(pointerId);
      closeMapPopup(mapState);
    });

    mapState.element.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const next = mercatorUnproject(
        startCenter.x - (event.clientX - startX),
        startCenter.y - (event.clientY - startY),
        mapState.zoom,
      );
      mapState.center = next;
      renderMapTiles(mapState);
    });

    const stop = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      mapState.element.classList.remove("is-dragging");
      try {
        mapState.element.releasePointerCapture(pointerId);
      } catch (_error) {
        // Pointer capture may already be released.
      }
      pointerId = null;
    };
    mapState.element.addEventListener("pointerup", stop);
    mapState.element.addEventListener("pointercancel", stop);
  }

  function initMap() {
    const container = byId("niagaraBridgeMap");
    if (!container) return;

    container.dataset.mapReady = "true";
    container.setAttribute("role", "region");
    const element = createMapShell(container);
    const mapState = {
      element,
      tileLayer: element.querySelector(".niagara-carto-tiles"),
      markerLayer: element.querySelector(".niagara-carto-markers"),
      popup: element.querySelector(".niagara-carto-popup"),
      center: { ...MAP_START_CENTER },
      zoom: MAP_START_ZOOM,
    };
    state.map = mapState;

    element.querySelector("[data-carto-zoom='in']")?.addEventListener("click", () => {
      setMapZoom(mapState, mapState.zoom + 1);
    });
    element.querySelector("[data-carto-zoom='out']")?.addEventListener("click", () => {
      setMapZoom(mapState, mapState.zoom - 1);
    });
    element.querySelector("[data-carto-reset]")?.addEventListener("click", () => {
      resetMap(mapState);
    });
    element.querySelector(".niagara-carto-popup__close")?.addEventListener("click", () => {
      closeMapPopup(mapState);
    });
    element.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setMapZoom(mapState, mapState.zoom + 1);
      } else if (event.key === "-") {
        event.preventDefault();
        setMapZoom(mapState, mapState.zoom - 1);
      } else if (event.key === "Escape") {
        closeMapPopup(mapState);
      }
    });

    bindMapPan(mapState);
    renderMapTiles(mapState);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => renderMapTiles(mapState));
      observer.observe(element);
    } else {
      window.addEventListener("resize", () => renderMapTiles(mapState));
    }
  }

  function cameraButtons() {
    return cameras
      .map(
        (camera) =>
          `<button class="niagara-camera-tab${
            camera.id === state.camera ? " is-selected" : ""
          }" type="button" data-niagara-camera="${camera.id}" aria-pressed="${
            camera.id === state.camera ? "true" : "false"
          }">${camera.label}</button>`,
      )
      .join("");
  }

  function buildCameraViewer() {
    const sourceGrid = document.querySelector("#bridgeCameras .camera-grid");
    if (!sourceGrid) return;

    const host = document.createElement("div");
    sourceGrid.before(host);
    host.id = "niagaraCameraViewer";
    host.className = "niagara-camera-viewer";
    host.innerHTML = `
      <div class="niagara-camera-tabs" aria-label="Choose an embedded Niagara border camera">
        ${cameraButtons()}
      </div>
      <figure class="niagara-camera-card">
        <div class="niagara-camera-frame" id="niagaraCameraFrame">
          <img id="niagaraCameraImage" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
          <div class="niagara-camera-empty" id="niagaraCameraEmpty">Camera loads when this section comes into view.</div>
          <span class="niagara-camera-live-badge" id="niagaraCameraLiveBadge" hidden>LIVE STILL</span>
        </div>
        <figcaption>
          <div class="niagara-camera-caption-main">
            <span class="camera-source-kicker" id="niagaraCameraSource"></span>
            <strong id="niagaraCameraTitle"></strong>
            <span id="niagaraCameraNote"></span>
          </div>
          <div class="niagara-camera-caption-actions">
            <span id="niagaraCameraUpdated">Camera not loaded yet</span>
            <button type="button" id="niagaraCameraRefresh">↻ Refresh image</button>
            <a id="niagaraCameraOfficial" href="https://www.nittec.org/cameras/" target="_blank" rel="noopener">Open official source ↗</a>
          </div>
        </figcaption>
      </figure>`;

    host.querySelectorAll("[data-niagara-camera]").forEach((button) => {
      button.addEventListener("click", () =>
        selectCamera(button.dataset.niagaraCamera, true),
      );
    });
    byId("niagaraCameraRefresh")?.addEventListener("click", () => {
      activateCameraViewer();
      refreshCamera(true);
    });

    const image = byId("niagaraCameraImage");
    image?.addEventListener("load", () => {
      const camera = currentCamera();
      if (!camera.src) return;
      image.hidden = false;
      byId("niagaraCameraEmpty").hidden = true;
      byId("niagaraCameraLiveBadge").hidden = false;
      state.retryingFallback = false;
      byId("niagaraCameraUpdated").textContent = `Updated ${new Date().toLocaleTimeString(
        [],
        { hour: "numeric", minute: "2-digit" },
      )}`;
    });
    image?.addEventListener("error", () => {
      const camera = currentCamera();
      if (camera.fallbackSrc && !state.retryingFallback) {
        state.retryingFallback = true;
        image.src = cacheBust(camera.fallbackSrc);
        return;
      }
      showCameraEmpty(
        "This camera image is temporarily unavailable. The official source link remains available below.",
      );
      byId("niagaraCameraUpdated").textContent = "Camera image unavailable";
      byId("niagaraCameraLiveBadge").hidden = true;
    });

    selectCamera(state.camera, false);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          activateCameraViewer();
          observer.disconnect();
        },
        { rootMargin: "500px 0px" },
      );
      observer.observe(host);
    } else {
      activateCameraViewer();
    }
  }

  function activateCameraViewer() {
    if (state.viewerActive) return;
    state.viewerActive = true;
    refreshCamera(false);
    if (!state.refreshTimer) {
      state.refreshTimer = window.setInterval(() => {
        if (!document.hidden) refreshCamera(false);
      }, CAMERA_REFRESH_MS);
    }
  }

  function showCameraEmpty(message) {
    const image = byId("niagaraCameraImage");
    const empty = byId("niagaraCameraEmpty");
    if (image) image.hidden = true;
    if (empty) {
      empty.hidden = false;
      empty.textContent = message;
    }
  }

  function refreshCamera(trackInteraction) {
    const camera = currentCamera();
    const image = byId("niagaraCameraImage");
    if (!camera.src || !image || !state.viewerActive) return;
    state.retryingFallback = false;
    byId("niagaraCameraUpdated").textContent = "Refreshing…";
    image.hidden = false;
    byId("niagaraCameraEmpty").hidden = true;
    byId("niagaraCameraLiveBadge").hidden = false;
    image.src = cacheBust(camera.src);
    if (trackInteraction && typeof window.va === "function") {
      window.va("event", {
        name: "Niagara Camera Interaction",
        data: { action: "refresh", camera: camera.id },
      });
    }
  }

  function selectCamera(id, trackInteraction) {
    const camera = cameras.find((item) => item.id === id);
    if (!camera) return;
    state.camera = camera.id;

    document.querySelectorAll("[data-niagara-camera]").forEach((button) => {
      const selected = button.dataset.niagaraCamera === camera.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    byId("niagaraCameraSource").textContent = camera.source;
    byId("niagaraCameraTitle").textContent = camera.title;
    byId("niagaraCameraNote").textContent = camera.note;
    const official = byId("niagaraCameraOfficial");
    official.href = camera.sourceUrl;
    official.textContent = `Open ${camera.source} ↗`;

    const image = byId("niagaraCameraImage");
    const badge = byId("niagaraCameraLiveBadge");
    const refresh = byId("niagaraCameraRefresh");

    if (camera.src) {
      image.alt = `${camera.title} live traffic camera still`;
      badge.hidden = !state.viewerActive;
      refresh.hidden = false;
      if (state.viewerActive) {
        refreshCamera(false);
      } else {
        image.removeAttribute("src");
        showCameraEmpty("Camera loads when this section comes into view.");
        byId("niagaraCameraUpdated").textContent = "Camera not loaded yet";
      }
    } else {
      image.removeAttribute("src");
      image.alt = "";
      badge.hidden = true;
      refresh.hidden = true;
      showCameraEmpty(
        "Whirlpool Rapids does not have a dedicated official road camera in the current Niagara camera network.",
      );
      byId("niagaraCameraUpdated").textContent = "No dedicated camera";
    }

    if (trackInteraction && typeof window.va === "function") {
      window.va("event", {
        name: "Niagara Camera Interaction",
        data: { action: "select", camera: camera.id },
      });
    }
  }

  function syncCameraToTrip() {
    const preferred = byId("preferredSelect")?.value;
    if (!preferred) return;
    const camera = cameraForCrossing(preferred, tripDirection());
    if (camera) selectCamera(camera.id, false);
  }

  function bindTripSync() {
    byId("preferredSelect")?.addEventListener("change", syncCameraToTrip);
    document.querySelectorAll("[data-direction]").forEach((button) => {
      button.addEventListener("click", () =>
        window.setTimeout(syncCameraToTrip, 0),
      );
    });
  }

  function init() {
    initMap();
    buildCameraViewer();
    bindTripSync();
    syncCameraToTrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
