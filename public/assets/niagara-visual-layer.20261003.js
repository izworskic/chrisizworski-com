(() => {
  "use strict";

  // Compatibility shim only. The Niagara map and camera interaction are owned
  // exclusively by niagara-camera-map-leaflet.20261004.js.
  //
  // This file remains at its historical URL because the page still references
  // it, but it must never create a map, request CARTO tiles, build a second
  // camera viewer, or bind competing map/camera lifecycle handlers.
  window.__NIAGARA_LEGACY_VISUAL_LAYER_DISABLED__ = true;

  if (document.currentScript) {
    document.currentScript.dataset.niagaraLegacyVisualLayer = "disabled";
    document.currentScript.dataset.niagaraMapOwner = "none";
  }
})();
