(() => {
  "use strict";

  const LEAFLET_MAP_SRC = "/assets/niagara-camera-map-leaflet.20261004.js?v=20261004v2";
  const PRODUCT_CSS = "/assets/niagara-product-v2.20261004.css?v=20261004v2";
  const PRODUCT_JS = "/assets/niagara-product-v2.20261004.js?v=20261004v2";

  if (document.currentScript) document.currentScript.dataset.niagaraBridgeCameraMap = "true";

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

  function loadScriptOnce(selector, src, datasetKey) {
    if (document.querySelector(selector)) return;
    const script = document.createElement("script");
    script.defer = true;
    script.dataset[datasetKey] = "true";
    script.src = src;
    document.head.appendChild(script);
  }

  function init() {
    installCriticalContrast();
    installProductCss();
    loadScriptOnce('script[data-niagara-product-v2="true"]', PRODUCT_JS, "niagaraProductV2");
    loadScriptOnce('script[data-niagara-leaflet-camera-map="true"]', LEAFLET_MAP_SRC, "niagaraLeafletCameraMap");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
