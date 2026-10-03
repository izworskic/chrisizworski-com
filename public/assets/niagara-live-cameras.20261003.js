(() => {
  "use strict";

  const REFRESH_MS = 30000;
  const cameras = [
    { id: "peace-qew", crossing: "peace", direction: "to_canada", label: "Peace → QEW", title: "Peace Bridge toward QEW", kind: "youtube", videoId: "SETJ79HmwI0", source: "NITTEC / Peace Bridge", sourceUrl: "https://www.nittec.org/cameras/" },
    { id: "peace-canada-plaza", crossing: "peace", direction: "to_canada", label: "Peace Canada plaza", title: "Peace Bridge Canadian plaza", kind: "youtube", videoId: "WPMgP2C3_co", source: "NITTEC / Peace Bridge", sourceUrl: "https://www.nittec.org/cameras/" },
    { id: "peace-deck-canada", crossing: "peace", direction: "to_canada", label: "Peace deck → Canada", title: "Peace Bridge deck toward Canada", kind: "youtube", videoId: "DnUFAShZKus", source: "NITTEC / Peace Bridge", sourceUrl: "https://www.nittec.org/cameras/", preferred: true },
    { id: "peace-deck-us", crossing: "peace", direction: "to_us", label: "Peace deck → U.S.", title: "Peace Bridge deck toward United States", kind: "youtube", videoId: "9En2186vo5g", source: "NITTEC / Peace Bridge", sourceUrl: "https://www.nittec.org/cameras/", preferred: true },
    { id: "peace-us-plaza", crossing: "peace", direction: "to_us", label: "Peace U.S. plaza", title: "Peace Bridge U.S. inspection plaza", kind: "youtube", videoId: "yygTuX5JaKg", source: "NITTEC / Peace Bridge", sourceUrl: "https://www.nittec.org/cameras/" },
    { id: "rainbow-canada", crossing: "rainbow", direction: "to_canada", label: "Rainbow → Canada", title: "Rainbow Bridge toward Canada", kind: "still", src: "https://nyssnapshot.com/R5_102.png", source: "NITTEC", sourceUrl: "https://www.nittec.org/cameras/", preferred: true },
    { id: "rainbow-us", crossing: "rainbow", direction: "to_us", label: "Rainbow → U.S.", title: "Rainbow Bridge toward United States", kind: "still", src: "https://nyssnapshot.com/R5_103.png", source: "NITTEC", sourceUrl: "https://www.nittec.org/cameras/", preferred: true },
    { id: "lewiston-us", crossing: "lewiston-queenston", direction: "to_us", label: "Lewiston U.S. plaza", title: "Lewiston–Queenston U.S. plaza", kind: "still", src: "https://nyssnapshot.com/R5_101.png", source: "NITTEC", sourceUrl: "https://www.nittec.org/cameras/", preferred: true },
    { id: "queenston-canada", crossing: "lewiston-queenston", direction: "to_canada", label: "Queenston Canada plaza", title: "Lewiston–Queenston Canadian plaza", kind: "still", src: "https://nyssnapshot.com/R5_100.png", source: "NITTEC", sourceUrl: "https://www.nittec.org/cameras/", preferred: true },
    { id: "whirlpool", crossing: "whirlpool", direction: "any", label: "Whirlpool", title: "Whirlpool Rapids Bridge", kind: "none", source: "Niagara Falls Bridge Commission", sourceUrl: "https://www.niagarafallsbridges.com/services/traffic-conditions" }
  ];

  let selectedId = "rainbow-canada";
  let stillTimer = null;

  const $ = (id) => document.getElementById(id);

  function currentDirection() {
    return document.querySelector("[data-direction][aria-pressed='true']")?.dataset.direction || "to_canada";
  }

  function currentPreferred() {
    return $("preferredSelect")?.value || "rainbow";
  }

  function preferredCamera(crossing, direction) {
    return cameras.find((camera) => camera.crossing === crossing && camera.direction === direction && camera.preferred)
      || cameras.find((camera) => camera.crossing === crossing && camera.direction === direction)
      || cameras.find((camera) => camera.crossing === crossing)
      || cameras[0];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function tabsHtml() {
    return cameras.map((camera) => `<button type="button" class="niagara-live-camera-tab${camera.id === selectedId ? " is-selected" : ""}" data-live-camera="${camera.id}" aria-pressed="${camera.id === selectedId ? "true" : "false"}">${escapeHtml(camera.label)}</button>`).join("");
  }

  function stopStillRefresh() {
    if (stillTimer) {
      window.clearInterval(stillTimer);
      stillTimer = null;
    }
  }

  function renderViewer(track = false) {
    const viewer = $("niagaraLiveCameraViewer");
    const camera = cameras.find((item) => item.id === selectedId) || cameras[0];
    if (!viewer || !camera) return;
    stopStillRefresh();

    document.querySelectorAll("[data-live-camera]").forEach((button) => {
      const selected = button.dataset.liveCamera === camera.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    const sourceLink = `<a href="${escapeHtml(camera.sourceUrl)}" target="_blank" rel="noopener">Open official source ↗</a>`;

    if (camera.kind === "youtube") {
      const embed = `https://www.youtube.com/embed/${encodeURIComponent(camera.videoId)}?autoplay=1&mute=1&playsinline=1&rel=0`;
      viewer.innerHTML = `<div class="niagara-live-camera-media is-video"><iframe src="${embed}" title="${escapeHtml(camera.title)} live traffic camera" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><span class="niagara-live-camera-badge">LIVE VIDEO</span></div><div class="niagara-live-camera-caption"><div><span>${escapeHtml(camera.source)}</span><strong>${escapeHtml(camera.title)}</strong><p>Live embedded bridge camera. Use it to judge visible queues and approach flow; official border wait and closure reports remain controlling.</p></div>${sourceLink}</div>`;
    } else if (camera.kind === "still") {
      const imageUrl = () => `${camera.src}${camera.src.includes("?") ? "&" : "?"}cb=${Date.now()}`;
      viewer.innerHTML = `<div class="niagara-live-camera-media"><img id="niagaraLiveStill" src="${imageUrl()}" alt="${escapeHtml(camera.title)} live traffic camera still" loading="eager" decoding="async" referrerpolicy="no-referrer"><span class="niagara-live-camera-badge">LIVE STILL · 30s</span></div><div class="niagara-live-camera-caption"><div><span>${escapeHtml(camera.source)}</span><strong>${escapeHtml(camera.title)}</strong><p>Official camera still automatically refreshes every 30 seconds.</p></div><button type="button" id="niagaraLiveRefresh">↻ Refresh now</button>${sourceLink}</div>`;
      $("niagaraLiveRefresh")?.addEventListener("click", () => {
        const image = $("niagaraLiveStill");
        if (image) image.src = imageUrl();
      });
      stillTimer = window.setInterval(() => {
        if (document.hidden) return;
        const image = $("niagaraLiveStill");
        if (image) image.src = imageUrl();
      }, REFRESH_MS);
    } else {
      viewer.innerHTML = `<div class="niagara-live-camera-empty"><strong>No dedicated official Whirlpool road camera</strong><p>The Niagara Falls Bridge Commission does not publish a dedicated Whirlpool Rapids traffic camera in the current source set. Use its live traffic/status page instead.</p>${sourceLink}</div>`;
    }

    if (track && typeof window.va === "function") {
      window.va("event", { name: "Niagara Camera Interaction", data: { camera: camera.id, kind: camera.kind } });
    }
  }

  function selectCamera(id, track = true) {
    if (!cameras.some((camera) => camera.id === id)) return;
    selectedId = id;
    renderViewer(track);
  }

  function syncToTrip() {
    const next = preferredCamera(currentPreferred(), currentDirection());
    if (next) selectCamera(next.id, false);
  }

  function build() {
    const section = $("bridgeCameras");
    const reality = document.querySelector(".reality-card");
    if (!section) return;

    section.classList.add("niagara-live-cameras-v2");
    section.innerHTML = `<div class="section-top"><div><p class="eyebrow">See it before you commit</p><h2 id="cameraHeading">Live bridge cameras</h2><p>Watch the bridge or plaza before you enter the approach. Peace Bridge uses embedded live video; Rainbow and Lewiston–Queenston use official camera stills that refresh automatically.</p></div></div><div class="niagara-live-camera-tabs" aria-label="Choose a Niagara border camera">${tabsHtml()}</div><div id="niagaraLiveCameraViewer" class="niagara-live-camera-viewer" aria-live="polite"></div><p class="niagara-live-camera-caveat">Camera views show visible traffic, not customs processing time. Use the reported border wait and bridge status above for the actual crossing decision.</p>`;

    if (reality && reality.nextElementSibling !== section) reality.insertAdjacentElement("afterend", section);

    section.querySelectorAll("[data-live-camera]").forEach((button) => {
      button.addEventListener("click", () => selectCamera(button.dataset.liveCamera, true));
    });

    $("preferredSelect")?.addEventListener("change", syncToTrip);
    document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => window.setTimeout(syncToTrip, 0)));

    syncToTrip();
  }

  build();
})();
