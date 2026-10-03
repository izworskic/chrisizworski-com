(() => {
  "use strict";

  const MAP_ID = "niagaraBridgeMap";
  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  const crossings = [
    {
      id: "peace",
      name: "Peace Bridge",
      role: "Buffalo, NY ↔ Fort Erie, ON · southern QEW / I-190 route",
      lat: 42.90691,
      lng: -78.90600,
      camera: "https://www.peacebridge.com/media-room/canadian-webcams/",
    },
    {
      id: "rainbow",
      name: "Rainbow Bridge",
      role: "Niagara Falls, NY ↔ Niagara Falls, ON · visitor / passenger route",
      lat: 43.08998,
      lng: -79.06735,
      camera: "https://www.nittec.org/cameras/index.html?cid=1011",
    },
    {
      id: "whirlpool",
      name: "Whirlpool Rapids Bridge",
      role: "Niagara Falls · NEXUS-only specialist crossing",
      lat: 43.10942,
      lng: -79.05845,
      camera: null,
    },
    {
      id: "lewiston-queenston",
      name: "Lewiston–Queenston Bridge",
      role: "Lewiston, NY ↔ Queenston, ON · northern highway / truck route",
      lat: 43.15448,
      lng: -79.04502,
      camera: "https://www.nittec.org/cameras/index.html?cid=1021",
    },
  ];

  function loadStylesheet(href) {
    if ([...document.styleSheets].some((sheet) => sheet.href === href)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.crossOrigin = "";
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.L) return resolve();
      const existing = [...document.scripts].find((script) => script.src === src);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.crossOrigin = "";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function popupHtml(crossing) {
    const camera = crossing.camera
      ? `<a href="${crossing.camera}" target="_blank" rel="noopener">Open live camera ↗</a>`
      : `<span>No dedicated live road camera identified for this crossing.</span>`;
    return `<div class="niagara-map-popup"><strong>${crossing.name}</strong><span>${crossing.role}</span>${camera}</div>`;
  }

  async function initMap() {
    const el = document.getElementById(MAP_ID);
    if (!el) return;

    loadStylesheet(LEAFLET_CSS);
    try {
      await loadScript(LEAFLET_JS);
    } catch (error) {
      el.setAttribute("aria-label", "Interactive map unavailable. Bridge locations remain listed below.");
      el.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#53656f;font:12px/1.5 var(--sans)">Map tiles could not be loaded. Use the bridge location list below.</div>';
      return;
    }

    if (!window.L || el.dataset.mapReady === "true") return;
    el.dataset.mapReady = "true";

    const map = window.L.map(el, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const bounds = [];
    crossings.forEach((crossing) => {
      const point = [crossing.lat, crossing.lng];
      bounds.push(point);
      window.L.circleMarker(point, {
        radius: 9,
        weight: 3,
        color: "#ffffff",
        fillColor: crossing.id === "whirlpool" ? "#8a651e" : "#0b5c8b",
        fillOpacity: 1,
      }).addTo(map).bindPopup(popupHtml(crossing), { maxWidth: 260 });
    });

    map.fitBounds(bounds, { padding: [28, 28] });
    window.setTimeout(() => map.invalidateSize(), 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap, { once: true });
  } else {
    initMap();
  }
})();