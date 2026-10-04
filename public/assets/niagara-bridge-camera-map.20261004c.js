(() => {
  "use strict";

  const LEAFLET_MAP_SRC = "/assets/niagara-camera-map-leaflet.20261004.js?v=20261004c";

  if (document.currentScript) document.currentScript.dataset.niagaraBridgeCameraMap = "true";

  function installCriticalContrast() {
    if (document.getElementById("niagaraCriticalContrast20261004")) return;
    const style = document.createElement("style");
    style.id = "niagaraCriticalContrast20261004";
    style.textContent = `
      .niagara-page .niagara-hero .hero-question{
        color:#072336!important;
        font-weight:800!important;
        font-size:clamp(20px,2.2vw,26px)!important;
        line-height:1.25!important;
        opacity:1!important;
        text-shadow:none!important;
      }
      @media(max-width:620px){
        .niagara-page .niagara-hero .hero-question{
          font-size:18px!important;
          line-height:1.3!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function loadFinalMapOwner() {
    if (document.querySelector('script[data-niagara-leaflet-camera-map="true"]')) return;
    const script = document.createElement("script");
    script.defer = true;
    script.dataset.niagaraLeafletCameraMap = "true";
    script.src = LEAFLET_MAP_SRC;
    document.head.appendChild(script);
  }

  function init() {
    installCriticalContrast();
    loadFinalMapOwner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
