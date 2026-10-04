(() => {
  "use strict";

  const CAMERA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7.5 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L15 4H9Zm3 4.25A4.75 4.75 0 1 1 12 17.75 4.75 4.75 0 0 1 12 8.25Zm0 2A2.75 2.75 0 1 0 12 15.75 2.75 2.75 0 0 0 12 10.25Z"/></svg>';

  const groups = {
    peace: [
      { id: "peace-qew", label: "QEW", title: "Peace Bridge looking toward QEW", dx: -58, dy: -14 },
      { id: "peace-canadian-plaza", label: "CA plaza", title: "Peace Bridge Canadian Plaza", dx: -30, dy: 20 },
      { id: "peace-ca", label: "→ Canada", title: "Peace Bridge Deck looking toward Canada", dx: 0, dy: -22 },
      { id: "peace-us", label: "→ U.S.", title: "Peace Bridge Deck looking toward U.S.", dx: 30, dy: 20 },
      { id: "peace-us-plaza", label: "US plaza", title: "I-190 North Ramp to Peace Bridge U.S. Plaza", dx: 58, dy: -14 },
    ],
    rainbow: [
      { id: "rainbow-ca", label: "→ Canada", title: "Rainbow Bridge looking toward Canada", dx: -28, dy: -10 },
      { id: "rainbow-us", label: "→ U.S.", title: "Rainbow Bridge looking toward U.S.", dx: 28, dy: 10 },
    ],
    "lewiston-queenston": [
      { id: "lewiston-us", label: "US plaza", title: "Lewiston–Queenston Bridge U.S. Plaza", dx: -30, dy: 10 },
      { id: "queenston-ca", label: "CA plaza", title: "Lewiston–Queenston Bridge Canadian Plaza", dx: 30, dy: -10 },
    ],
  };

  let observer = null;
  let raf = 0;

  function injectStyles() {
    if (document.getElementById("niagaraNineCameraPinsStyles")) return;
    const style = document.createElement("style");
    style.id = "niagaraNineCameraPinsStyles";
    style.textContent = `
      .niagara-camera-map__marker--regional{display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;width:auto!important;min-width:36px!important;height:34px!important;padding:0 7px!important;border-radius:999px!important;background:#fff!important;color:#0b314c!important;box-shadow:0 3px 12px rgba(7,35,54,.24)!important}
      .niagara-camera-map__marker--regional svg{width:15px!important;height:15px!important;flex:0 0 15px!important;fill:#0b5c8b!important}
      .niagara-camera-map__marker-label{font:700 8px/1 var(--sans);white-space:nowrap;letter-spacing:.01em}
      .niagara-camera-map__marker--regional:hover,.niagara-camera-map__marker--regional:focus-visible{z-index:8!important;border-color:#0b5c8b!important;outline:3px solid rgba(11,92,139,.22)!important;outline-offset:2px!important}
      .niagara-camera-map__regional-note{position:absolute;z-index:6;left:8px;top:8px;max-width:210px;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.94);color:#405965;font:700 9px/1.35 var(--sans);box-shadow:0 2px 8px rgba(7,35,54,.12)}
      @media(max-width:620px){.niagara-camera-map__marker--regional{height:32px!important;min-width:32px!important;padding:0 6px!important}.niagara-camera-map__marker-label{font-size:7px}.niagara-camera-map__regional-note{max-width:180px;font-size:8px}}
    `;
    document.head.appendChild(style);
  }

  function openCamera(camera) {
    const tab = document.querySelector(`[data-niagara-camera="${camera.id}"]`);
    if (tab instanceof HTMLElement) tab.click();
    const viewer = document.getElementById("niagaraCameraViewer");
    if (viewer) viewer.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window.va === "function") {
      window.va("event", {
        name: "Niagara Camera Interaction",
        data: { action: "regional-map-select", camera: camera.id },
      });
    }
  }

  function addMapNote(map) {
    if (map.querySelector(".niagara-camera-map__regional-note")) return;
    const note = document.createElement("div");
    note.className = "niagara-camera-map__regional-note";
    note.textContent = "9 bridge cameras · nearby pins are spread slightly here so every camera is tappable";
    map.appendChild(note);
  }

  function updateCopy() {
    const heading = document.getElementById("orientationHeading");
    const intro = heading?.nextElementSibling;
    const map = document.querySelector(".niagara-camera-map");
    if (intro) intro.textContent = "All nine official international-bridge cameras are visible on the CARTO map. Nearby cameras are spread slightly at this regional view so every pin is tappable; zoom in and they return to their exact NITTEC coordinates.";
    if (map) map.setAttribute("aria-label", "CARTO map showing nine official Niagara international-bridge camera pins. Nearby cameras are spread slightly at regional zoom for selection.");
  }

  function expandRegionalClusters() {
    const map = document.querySelector(".niagara-camera-map");
    const layer = map?.querySelector(".niagara-camera-map__markers");
    if (!map || !layer) return false;

    injectStyles();
    addMapNote(map);
    updateCopy();

    const clusters = [...layer.querySelectorAll(".niagara-camera-map__cluster[data-camera-group]")];
    if (!clusters.length) return true;

    clusters.forEach((cluster) => {
      const cameras = groups[cluster.dataset.cameraGroup];
      if (!cameras?.length) return;
      const baseLeft = Number.parseFloat(cluster.style.left || "0");
      const baseTop = Number.parseFloat(cluster.style.top || "0");
      const fragment = document.createDocumentFragment();

      cameras.forEach((camera) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "niagara-camera-map__marker niagara-camera-map__marker--regional";
        button.dataset.cameraId = camera.id;
        button.dataset.regionalCameraPin = "true";
        button.style.left = `${baseLeft + camera.dx}px`;
        button.style.top = `${baseTop + camera.dy}px`;
        button.setAttribute("aria-label", `${camera.title}. Open this live camera.`);
        button.title = camera.title;
        button.innerHTML = `${CAMERA_ICON}<span class="niagara-camera-map__marker-label">${camera.label}</span>`;
        button.addEventListener("click", () => openCamera(camera));
        fragment.appendChild(button);
      });

      cluster.replaceWith(fragment);
    });
    return true;
  }

  function queueExpand() {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      expandRegionalClusters();
    });
  }

  function attach() {
    if (!expandRegionalClusters()) return false;
    const layer = document.querySelector(".niagara-camera-map__markers");
    if (!layer || !("MutationObserver" in window)) return true;
    if (observer) observer.disconnect();
    observer = new MutationObserver(queueExpand);
    observer.observe(layer, { childList: true });
    return true;
  }

  function boot() {
    if (attach()) return;
    if (!("MutationObserver" in window)) return;
    const rootObserver = new MutationObserver(() => {
      if (!attach()) return;
      rootObserver.disconnect();
    });
    rootObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();