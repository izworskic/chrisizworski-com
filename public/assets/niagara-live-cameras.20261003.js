(() => {
  "use strict";

  const VIDEO_IDS = {
    "peace-qew": "SETJ79HmwI0",
    "peace-canadian-plaza": "WPMgP2C3_co",
    "peace-ca": "DnUFAShZKus",
    "peace-us": "9En2186vo5g",
    "peace-us-plaza": "yygTuX5JaKg",
  };

  const $ = (id) => document.getElementById(id);
  let syncQueued = false;
  let viewerObserver = null;
  let frameObserver = null;

  function selectedCameraId() {
    return document.querySelector("[data-niagara-camera][aria-pressed='true']")?.dataset.niagaraCamera || null;
  }

  function ensureVideoPlayer() {
    const frame = $("niagaraCameraFrame");
    if (!frame) return null;
    let iframe = $("niagaraCameraVideo");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "niagaraCameraVideo";
      iframe.className = "niagara-camera-video";
      iframe.loading = "lazy";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.setAttribute("allowfullscreen", "");
      iframe.hidden = true;
      frame.prepend(iframe);
    }
    return iframe;
  }

  function syncViewerMode() {
    syncQueued = false;
    const id = selectedCameraId();
    const iframe = ensureVideoPlayer();
    const image = $("niagaraCameraImage");
    const empty = $("niagaraCameraEmpty");
    const badge = $("niagaraCameraLiveBadge");
    const refresh = $("niagaraCameraRefresh");
    const updated = $("niagaraCameraUpdated");
    if (!id || !iframe || !image || !empty || !badge || !refresh || !updated) return;

    const videoId = VIDEO_IDS[id];
    if (videoId) {
      const nextSrc = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&playsinline=1&rel=0`;
      if (iframe.dataset.videoId !== videoId) {
        iframe.src = nextSrc;
        iframe.dataset.videoId = videoId;
      }
      iframe.title = `${$("niagaraCameraTitle")?.textContent || "Peace Bridge"} live traffic camera`;
      if (iframe.hidden) iframe.hidden = false;
      if (image.hasAttribute("src")) image.removeAttribute("src");
      if (!image.hidden) image.hidden = true;
      if (!empty.hidden) empty.hidden = true;
      if (!refresh.hidden) refresh.hidden = true;
      if (badge.hidden) badge.hidden = false;
      if (badge.textContent !== "LIVE VIDEO") badge.textContent = "LIVE VIDEO";
      if (updated.textContent !== "Live embedded video") updated.textContent = "Live embedded video";
      return;
    }

    if (!iframe.hidden) iframe.hidden = true;
    if (iframe.hasAttribute("src")) iframe.removeAttribute("src");
    delete iframe.dataset.videoId;

    if (id === "whirlpool") {
      if (!badge.hidden) badge.hidden = true;
      if (!refresh.hidden) refresh.hidden = true;
      return;
    }

    if (badge.textContent !== "LIVE STILL") badge.textContent = "LIVE STILL";
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(syncViewerMode);
  }

  function moveAndRetitleSection() {
    const section = $("bridgeCameras");
    const reality = document.querySelector(".reality-card");
    if (!section) return;
    section.classList.add("niagara-live-cameras-v2");
    const eyebrow = section.querySelector(".section-top .eyebrow");
    const heading = $("cameraHeading");
    const intro = section.querySelector(".section-top h2 + p");
    if (eyebrow) eyebrow.textContent = "See it before you commit";
    if (heading) heading.textContent = "Live bridge cameras";
    if (intro) intro.textContent = "Watch the bridge or plaza before you enter the approach. Peace Bridge uses embedded live video; Rainbow and Lewiston–Queenston use official camera stills that refresh automatically.";
    if (reality && reality.nextElementSibling !== section) reality.insertAdjacentElement("afterend", section);
  }

  function loadCanonicalCameraMap() {
    if (document.querySelector('script[data-niagara-canonical-camera-map="true"]')) return;
    const script = document.createElement("script");
    script.dataset.niagaraCanonicalCameraMap = "true";
    script.src = "/assets/niagara-camera-map-canonical.20261004c.js";
    document.head.appendChild(script);
  }

  function scheduleBridgeCameraMap() {
    // One final map owner only. The canonical map runs after the legacy visual
    // layer, deletes the four-bridge fallback and replaces the old map shell.
    if (document.readyState === "complete") loadCanonicalCameraMap();
    else window.addEventListener("load", loadCanonicalCameraMap, { once: true });
  }

  function bindSelectionObserver() {
    const tabs = document.querySelector(".niagara-camera-tabs");
    if (!tabs || !("MutationObserver" in window) || tabs.dataset.liveVideoObserved === "true") return;
    tabs.dataset.liveVideoObserved = "true";
    const observer = new MutationObserver(queueSync);
    observer.observe(tabs, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed", "class"],
    });
  }

  function bindFrameObserver() {
    const frame = $("niagaraCameraFrame");
    if (!frame || !("MutationObserver" in window) || frame.dataset.liveVideoObserved === "true") return;
    frame.dataset.liveVideoObserved = "true";
    frameObserver = new MutationObserver(queueSync);
    frameObserver.observe(frame, {
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "hidden"],
    });
  }

  function activateEnhancement() {
    if (!$("niagaraCameraFrame") || !document.querySelector(".niagara-camera-tabs")) return false;
    ensureVideoPlayer();
    bindSelectionObserver();
    bindFrameObserver();
    queueSync();
    if (viewerObserver) {
      viewerObserver.disconnect();
      viewerObserver = null;
    }
    return true;
  }

  function waitForViewer() {
    if (activateEnhancement() || !("MutationObserver" in window)) return;
    const section = $("bridgeCameras");
    if (!section) return;
    viewerObserver = new MutationObserver(() => activateEnhancement());
    viewerObserver.observe(section, { childList: true, subtree: true });
  }

  function init() {
    moveAndRetitleSection();
    waitForViewer();
    scheduleBridgeCameraMap();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
