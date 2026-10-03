(() => {
  "use strict";

  const CAMERA_REFRESH_MS = 30000;
  const cameras = [
    {
      id: "rainbow-ca",
      crossing: "rainbow",
      direction: "to_canada",
      label: "Rainbow → Canada",
      title: "Rainbow Bridge looking toward Canada",
      src: "https://nyssnapshot.com/R5_102.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/?cid=1011",
      note: "Official NITTEC still image looking from the U.S. side toward Canada.",
    },
    {
      id: "rainbow-us",
      crossing: "rainbow",
      direction: "to_us",
      label: "Rainbow → U.S.",
      title: "Rainbow Bridge looking toward the United States",
      src: "https://nyssnapshot.com/R5_103.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/?cid=1011",
      note: "Official NITTEC still image looking toward the United States.",
    },
    {
      id: "lewiston-us",
      crossing: "lewiston-queenston",
      direction: "to_us",
      label: "Lewiston U.S. plaza",
      title: "Lewiston–Queenston Bridge U.S. plaza",
      src: "https://nyssnapshot.com/R5_101.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/?cid=1021",
      note: "Official NITTEC still image of the U.S. plaza at Lewiston.",
    },
    {
      id: "queenston-ca",
      crossing: "lewiston-queenston",
      direction: "to_canada",
      label: "Queenston Canada plaza",
      title: "Lewiston–Queenston Bridge Canadian plaza",
      src: "https://nyssnapshot.com/R5_100.png",
      source: "NITTEC",
      sourceUrl: "https://www.nittec.org/cameras/?cid=1022",
      note: "Official NITTEC still image of the Canadian plaza at Queenston.",
    },
    {
      id: "peace-ca",
      crossing: "peace",
      direction: "to_canada",
      label: "Peace deck → Canada",
      title: "Peace Bridge deck looking toward Canada",
      src: "https://i.ytimg.com/vi/DnUFAShZKus/maxresdefault_live.jpg",
      fallbackSrc: "https://i.ytimg.com/vi/DnUFAShZKus/hqdefault_live.jpg",
      source: "Peace Bridge / NITTEC",
      sourceUrl: "https://www.peacebridge.com/media-room/canadian-webcams/",
      note: "Live Peace Bridge deck view published through the bridge/NITTEC camera network.",
    },
    {
      id: "peace-us",
      crossing: "peace",
      direction: "to_us",
      label: "Peace deck → U.S.",
      title: "Peace Bridge deck looking toward the United States",
      src: "https://i.ytimg.com/vi/9En2186vo5g/maxresdefault_live.jpg",
      fallbackSrc: "https://i.ytimg.com/vi/9En2186vo5g/hqdefault_live.jpg",
      source: "Peace Bridge / NITTEC",
      sourceUrl: "https://www.peacebridge.com/media-room/canadian-webcams/",
      note: "Live Peace Bridge deck view published through the bridge/NITTEC camera network.",
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
    retryingFallback: false,
    refreshTimer: null,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheBust(url) {
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`;
  }

  function currentCamera() {
    return cameras.find((camera) => camera.id === state.camera) || cameras[0];
  }

  function renderMap() {
    const map = byId("niagaraBridgeMap");
    if (!map) return;

    map.dataset.mapReady = "true";
    map.setAttribute(
      "aria-label",
      "Map of the four Niagara River border crossings from Peace Bridge in Buffalo and Fort Erie north to Lewiston and Queenston.",
    );
    map.innerHTML = `
      <svg class="niagara-static-map" viewBox="0 0 900 520" role="img" aria-labelledby="niagaraMapTitle niagaraMapDesc">
        <title id="niagaraMapTitle">Niagara River border crossings</title>
        <desc id="niagaraMapDesc">A north-up orientation map showing Peace Bridge, Rainbow Bridge, Whirlpool Rapids Bridge, and Lewiston–Queenston Bridge between Ontario and New York.</desc>
        <rect class="map-land map-land-canada" x="0" y="0" width="420" height="520"></rect>
        <rect class="map-land map-land-us" x="480" y="0" width="420" height="520"></rect>
        <path class="map-water" d="M449 0 C432 65 444 115 455 155 C468 204 431 247 443 292 C456 338 471 382 456 430 C449 455 448 486 450 520"></path>
        <path class="map-road map-road-canada" d="M228 500 C245 430 275 362 286 302 C297 244 304 175 304 62"></path>
        <path class="map-road map-road-us" d="M670 502 C640 440 620 368 610 304 C600 241 592 168 592 62"></path>
        <text class="map-country" x="56" y="48">ONTARIO · CANADA</text>
        <text class="map-country" x="626" y="48">NEW YORK · U.S.</text>
        <text class="map-water-label" x="468" y="326" transform="rotate(88 468 326)">NIAGARA RIVER</text>
        <g class="map-city"><text x="238" y="104">Queenston</text><text x="610" y="104">Lewiston</text></g>
        <g class="map-city"><text x="218" y="257">Niagara Falls, ON</text><text x="610" y="257">Niagara Falls, NY</text></g>
        <g class="map-city"><text x="250" y="458">Fort Erie</text><text x="610" y="458">Buffalo</text></g>
        <g class="map-crossing map-crossing-lq">
          <line x1="404" y1="118" x2="496" y2="118"></line>
          <circle cx="450" cy="118" r="10"></circle>
          <text x="450" y="97">LEWISTON–QUEENSTON</text>
        </g>
        <g class="map-crossing map-crossing-whirlpool">
          <line x1="404" y1="198" x2="496" y2="198"></line>
          <circle cx="450" cy="198" r="9"></circle>
          <text x="450" y="180">WHIRLPOOL RAPIDS</text>
        </g>
        <g class="map-crossing map-crossing-rainbow">
          <line x1="404" y1="276" x2="496" y2="276"></line>
          <circle cx="450" cy="276" r="10"></circle>
          <text x="450" y="258">RAINBOW BRIDGE</text>
        </g>
        <g class="map-crossing map-crossing-peace">
          <line x1="404" y1="438" x2="496" y2="438"></line>
          <circle cx="450" cy="438" r="10"></circle>
          <text x="450" y="420">PEACE BRIDGE</text>
        </g>
        <g class="map-north"><path d="M838 75 L838 35 L827 50 M838 35 L849 50"></path><text x="838" y="94">N</text></g>
        <text class="map-lake-label" x="435" y="505">LAKE ERIE</text>
        <text class="map-lake-label" x="435" y="28">toward LAKE ONTARIO</text>
      </svg>`;
  }

  function cameraButtons() {
    return cameras
      .map(
        (camera) => `<button class="niagara-camera-tab${camera.id === state.camera ? " is-selected" : ""}" type="button" role="tab" data-niagara-camera="${camera.id}" aria-selected="${camera.id === state.camera ? "true" : "false"}">${camera.label}</button>`,
      )
      .join("");
  }

  function buildCameraViewer() {
    const grid = document.querySelector("#bridgeCameras .camera-grid");
    if (!grid) return;

    grid.className = "niagara-camera-viewer";
    grid.innerHTML = `
      <div class="niagara-camera-tabs" role="tablist" aria-label="Choose a Niagara border camera">
        ${cameraButtons()}
      </div>
      <figure class="niagara-camera-card">
        <div class="niagara-camera-frame" id="niagaraCameraFrame">
          <img id="niagaraCameraImage" alt="" decoding="async" referrerpolicy="no-referrer">
          <div class="niagara-camera-empty" id="niagaraCameraEmpty" hidden></div>
          <span class="niagara-camera-live-badge">LIVE STILL</span>
        </div>
        <figcaption>
          <div class="niagara-camera-caption-main">
            <span class="camera-source-kicker" id="niagaraCameraSource"></span>
            <strong id="niagaraCameraTitle"></strong>
            <span id="niagaraCameraNote"></span>
          </div>
          <div class="niagara-camera-caption-actions">
            <span id="niagaraCameraUpdated">Loading camera…</span>
            <button type="button" id="niagaraCameraRefresh">↻ Refresh image</button>
            <a id="niagaraCameraOfficial" href="https://www.nittec.org/cameras/" target="_blank" rel="noopener">Open official source ↗</a>
          </div>
        </figcaption>
      </figure>`;

    document.querySelectorAll("[data-niagara-camera]").forEach((button) => {
      button.addEventListener("click", () => selectCamera(button.dataset.niagaraCamera, true));
    });
    byId("niagaraCameraRefresh")?.addEventListener("click", () => refreshCamera(true));

    const image = byId("niagaraCameraImage");
    image?.addEventListener("load", () => {
      const camera = currentCamera();
      if (!camera.src) return;
      image.hidden = false;
      byId("niagaraCameraEmpty").hidden = true;
      state.retryingFallback = false;
      byId("niagaraCameraUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    });
    image?.addEventListener("error", () => {
      const camera = currentCamera();
      if (camera.fallbackSrc && !state.retryingFallback) {
        state.retryingFallback = true;
        image.src = cacheBust(camera.fallbackSrc);
        return;
      }
      showCameraEmpty("This camera image is temporarily unavailable. The official source link remains available below.");
      byId("niagaraCameraUpdated").textContent = "Camera image unavailable";
    });

    selectCamera(state.camera, false);
    state.refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshCamera(false);
    }, CAMERA_REFRESH_MS);
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
    if (!camera.src || !image) return;
    state.retryingFallback = false;
    byId("niagaraCameraUpdated").textContent = "Refreshing…";
    image.hidden = false;
    byId("niagaraCameraEmpty").hidden = true;
    image.src = cacheBust(camera.src);
    if (trackInteraction && typeof window.va === "function") {
      window.va("event", { name: "Niagara Camera Interaction", data: { action: "refresh", camera: camera.id } });
    }
  }

  function selectCamera(id, trackInteraction) {
    const camera = cameras.find((item) => item.id === id);
    if (!camera) return;
    state.camera = camera.id;

    document.querySelectorAll("[data-niagara-camera]").forEach((button) => {
      const selected = button.dataset.niagaraCamera === camera.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });

    byId("niagaraCameraSource").textContent = camera.source;
    byId("niagaraCameraTitle").textContent = camera.title;
    byId("niagaraCameraNote").textContent = camera.note;
    const official = byId("niagaraCameraOfficial");
    official.href = camera.sourceUrl;
    official.textContent = `Open ${camera.source} ↗`;

    const image = byId("niagaraCameraImage");
    if (camera.src) {
      image.alt = `${camera.title} live traffic camera still`;
      refreshCamera(false);
    } else {
      image.removeAttribute("src");
      image.alt = "";
      showCameraEmpty("Whirlpool Rapids does not have a dedicated official road camera in the current Niagara camera network.");
      byId("niagaraCameraUpdated").textContent = "No dedicated camera";
    }

    if (trackInteraction && typeof window.va === "function") {
      window.va("event", { name: "Niagara Camera Interaction", data: { action: "select", camera: camera.id } });
    }
  }

  function tripDirection() {
    const selected = document.querySelector("[data-direction][aria-pressed='true']");
    return selected?.dataset.direction || "to_canada";
  }

  function syncCameraToTrip() {
    const preferred = byId("preferredSelect")?.value;
    if (!preferred) return;
    const direction = tripDirection();
    let candidate = cameras.find((camera) => camera.crossing === preferred && camera.direction === direction);
    if (!candidate) candidate = cameras.find((camera) => camera.crossing === preferred);
    if (candidate) selectCamera(candidate.id, false);
  }

  function bindTripSync() {
    byId("preferredSelect")?.addEventListener("change", syncCameraToTrip);
    document.querySelectorAll("[data-direction]").forEach((button) => {
      button.addEventListener("click", () => window.setTimeout(syncCameraToTrip, 0));
    });
  }

  function init() {
    renderMap();
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
