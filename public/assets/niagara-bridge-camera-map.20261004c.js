(() => {
  "use strict";

  const LEAFLET_MAP_SRC = "/assets/niagara-camera-map-leaflet.20261004.js?v=20261004singleowner1";
  const PRODUCT_CSS = "/assets/niagara-product-v2.20261004.css?v=20261004singleowner1";
  const PRODUCT_JS = "/assets/niagara-product-v2.20261004.js?v=20261004singleowner1";
  const MAP_ID = "niagaraBridgeMap";

  if (document.currentScript) {
    document.currentScript.dataset.niagaraBridgeCameraMap = "true";
    document.currentScript.dataset.niagaraMapOwner = "leaflet-osm";
  }

  function installProductCss() {
    if (document.querySelector('link[data-niagara-product-v2="true"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PRODUCT_CSS;
    link.dataset.niagaraProductV2 = "true";
    document.head.appendChild(link);
  }

  function installCriticalContrast() {
    if (document.getElementById("niagaraCriticalContrast20261004")) return;
    const style = document.createElement("style");
    style.id = "niagaraCriticalContrast20261004";
    style.textContent = `
      .niagara-page .niagara-hero .hero-question{
        color:#072f49!important;
        font-weight:800!important;
        font-size:clamp(20px,2.2vw,26px)!important;
        line-height:1.25!important;
        opacity:1!important;
        text-shadow:none!important;
      }
      @media(max-width:620px){
        .niagara-page .niagara-hero .hero-question{font-size:19px!important;line-height:1.3!important}
      }
    `;
    document.head.appendChild(style);
  }

  function clearLegacyMapSurface() {
    const container = document.getElementById(MAP_ID);
    if (!container) return;

    // Defensive cleanup for clients that may have an older visual-layer asset
    // in cache. The final map owner always starts from a clean container.
    container.querySelectorAll(
      ".niagara-carto-map,.niagara-carto-tiles,.niagara-carto-markers,.niagara-carto-popup,.niagara-visual-map__fallback"
    ).forEach((node) => node.remove());
    delete container.dataset.mapReady;
    delete container.dataset.legacyMapSuppressed;
    container.dataset.mapOwner = "leaflet-osm";
  }

  function loadScriptOnce(selector, src, datasetKey) {
    const existing = document.querySelector(selector);
    if (existing) return existing;
    const script = document.createElement("script");
    script.async = false;
    script.dataset[datasetKey] = "true";
    script.src = src;
    document.head.appendChild(script);
    return script;
  }

  function init() {
    document.documentElement.dataset.niagaraMapOwner = "leaflet-osm-v3";
    clearLegacyMapSurface();
    installCriticalContrast();
    installProductCss();
    loadScriptOnce('script[data-niagara-product-v2="true"]', PRODUCT_JS, "niagaraProductV2");
    loadScriptOnce('script[data-niagara-leaflet-camera-map="true"]', LEAFLET_MAP_SRC, "niagaraLeafletCameraMap");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
