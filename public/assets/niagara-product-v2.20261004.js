(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const TRAVELER_LABELS = {
    passenger: "Car / SUV",
    nexus: "NEXUS auto",
    commercial: "Commercial truck",
    bus: "Bus",
    tow: "Trailer / towing",
    pedestrian: "Walking",
    bicycle: "Bicycle",
  };

  function dispatchChange(element) {
    element?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function syncDirectionButtons(value) {
    document.querySelectorAll("[data-quick-direction]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.quickDirection === value));
    });
  }

  function setDirection(value) {
    const original = document.querySelector(`[data-direction="${value}"]`);
    if (original instanceof HTMLElement && original.getAttribute("aria-pressed") !== "true") original.click();
    syncDirectionButtons(value);
  }

  function syncCorridorButtons(value) {
    document.querySelectorAll("[data-quick-corridor]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.quickCorridor === value));
    });
  }

  function setCorridor(value) {
    const select = $("preferredSelect");
    if (!select) return;
    const changed = select.value !== value;
    select.value = value;
    syncCorridorButtons(value);
    if (changed) dispatchChange(select);
  }

  function syncTraveler(value) {
    const original = $("travelerSelect");
    const proxy = $("niagaraQuickTraveler");
    const summary = $("niagaraTravelerSummary");
    const oversizeRow = $("niagaraQuickOversizeRow");
    if (original && original.value !== value) {
      original.value = value;
      dispatchChange(original);
    }
    if (proxy && proxy.value !== value) proxy.value = value;
    if (summary?.firstChild) summary.firstChild.textContent = `${TRAVELER_LABELS[value] || "Traveler"} `;
    document.body.classList.toggle("niagara-v2-nexus", value === "nexus");
    if (oversizeRow) oversizeRow.hidden = value !== "commercial";
    if (value !== "nexus" && $("preferredSelect")?.value === "whirlpool") setCorridor("rainbow");
  }

  function buildQuickControls() {
    const controls = document.querySelector(".trip-controls");
    if (!controls || controls.querySelector(".niagara-quick-controls")) return;

    [...controls.children].forEach((child) => child.classList.add("niagara-v2-legacy-control"));

    const quick = document.createElement("div");
    quick.className = "niagara-quick-controls";
    quick.setAttribute("aria-label", "Choose your Niagara crossing in two steps");
    quick.innerHTML = `
      <div class="niagara-quick-step">
        <div class="niagara-quick-step__head"><strong>1. Which way are you crossing?</strong><span>Pick a direction</span></div>
        <div class="niagara-quick-buttons">
          <button type="button" class="niagara-quick-button" data-quick-direction="to_canada"><span>To Canada</span><small>New York → Ontario</small></button>
          <button type="button" class="niagara-quick-button" data-quick-direction="to_us"><span>To United States</span><small>Ontario → New York</small></button>
        </div>
      </div>
      <div class="niagara-quick-step">
        <div class="niagara-quick-step__head"><strong>2. Which corridor are you already near?</strong><span>This keeps us from recommending a pointless detour</span></div>
        <div class="niagara-quick-buttons is-corridors">
          <button type="button" class="niagara-quick-button" data-quick-corridor="peace"><span>Buffalo / Fort Erie</span><small>Peace Bridge corridor</small></button>
          <button type="button" class="niagara-quick-button" data-quick-corridor="rainbow"><span>Niagara Falls</span><small>Rainbow Bridge corridor</small></button>
          <button type="button" class="niagara-quick-button" data-quick-corridor="lewiston-queenston"><span>Lewiston / Queenston</span><small>Lewiston–Queenston corridor</small></button>
          <button type="button" class="niagara-quick-button" data-quick-corridor="whirlpool"><span>Whirlpool Rapids</span><small>NEXUS auto only</small></button>
        </div>
      </div>
      <details class="niagara-traveler-details">
        <summary id="niagaraTravelerSummary">Car / SUV </summary>
        <div class="niagara-traveler-panel">
          <label for="niagaraQuickTraveler">Traveler type
            <select id="niagaraQuickTraveler">
              <option value="passenger">Car / SUV / personal vehicle</option>
              <option value="nexus">NEXUS auto traveler</option>
              <option value="commercial">Commercial truck</option>
              <option value="bus">Bus</option>
              <option value="tow">Vehicle with trailer / towing</option>
              <option value="pedestrian">Walking</option>
              <option value="bicycle">Bicycle</option>
            </select>
          </label>
          <label id="niagaraQuickOversizeRow" hidden><span>Special commercial</span><span><input type="checkbox" id="niagaraQuickOversize"> Oversize / approval required</span></label>
          <p class="niagara-traveler-note">Most people can leave this on Car / SUV. Change it only when your traveler type changes which bridges are legal or useful.</p>
        </div>
      </details>`;
    controls.prepend(quick);

    quick.querySelectorAll("[data-quick-direction]").forEach((button) => {
      button.addEventListener("click", () => setDirection(button.dataset.quickDirection));
    });
    quick.querySelectorAll("[data-quick-corridor]").forEach((button) => {
      button.addEventListener("click", () => setCorridor(button.dataset.quickCorridor));
    });

    const proxy = $("niagaraQuickTraveler");
    proxy?.addEventListener("change", () => syncTraveler(proxy.value));
    const oversizeProxy = $("niagaraQuickOversize");
    const oversizeOriginal = $("oversizeToggle");
    if (oversizeProxy && oversizeOriginal) oversizeProxy.checked = oversizeOriginal.checked;
    oversizeProxy?.addEventListener("change", () => {
      if (!oversizeOriginal) return;
      oversizeOriginal.checked = oversizeProxy.checked;
      dispatchChange(oversizeOriginal);
    });

    const direction = document.querySelector("[data-direction][aria-pressed='true']")?.dataset.direction || "to_canada";
    const corridor = $("preferredSelect")?.value || "rainbow";
    const traveler = $("travelerSelect")?.value || "passenger";
    syncDirectionButtons(direction);
    syncCorridorButtons(corridor);
    syncTraveler(traveler);

    document.querySelectorAll("[data-direction]").forEach((button) => {
      button.addEventListener("click", () => syncDirectionButtons(button.dataset.direction));
    });
    $("preferredSelect")?.addEventListener("change", () => syncCorridorButtons($("preferredSelect").value));
    $("travelerSelect")?.addEventListener("change", () => syncTraveler($("travelerSelect").value));
  }

  function simplifyShortcuts() {
    const nav = document.querySelector(".decision-shortcuts");
    if (!nav) return;
    nav.innerHTML = '<a href="#bridgeMap">Map + cameras</a><a href="#niagaraMoreDetails">Rules + more detail</a>';
  }

  function reorderPrimaryValue() {
    const tripDesk = document.querySelector(".trip-desk");
    const reality = document.querySelector(".reality-card");
    const bridgeMap = $("bridgeMap");
    if (tripDesk && reality && tripDesk.nextElementSibling !== reality) tripDesk.insertAdjacentElement("afterend", reality);
    if (reality && bridgeMap && reality.nextElementSibling !== bridgeMap) reality.insertAdjacentElement("afterend", bridgeMap);
  }

  function buildProgressiveDisclosure() {
    if ($("niagaraMoreDetails")) return;
    const pageShell = document.querySelector("main .page-shell");
    const bridgeMap = $("bridgeMap");
    if (!pageShell || !bridgeMap) return;

    const details = document.createElement("details");
    details.className = "niagara-more-details";
    details.id = "niagaraMoreDetails";
    details.innerHTML = '<summary>More detail — rules, special vehicles, all bridges and sources</summary><div class="niagara-more-details__body"></div>';
    bridgeMap.insertAdjacentElement("afterend", details);
    const body = details.querySelector(".niagara-more-details__body");

    const move = [];
    document.querySelectorAll("main .journey-card, main .compare-card, main .details-stack").forEach((node) => move.push(node));
    document.querySelectorAll("main .support-card").forEach((node) => {
      if (node.id !== "bridgeMap" && !move.includes(node)) move.push(node);
    });
    move.forEach((node) => body.appendChild(node));

    const openForTarget = () => {
      if (!location.hash) return;
      const target = document.querySelector(location.hash);
      if (target && body.contains(target)) details.open = true;
    };
    window.addEventListener("hashchange", openForTarget);
    openForTarget();
  }

  function simplifyCopy() {
    const lede = document.querySelector(".niagara-hero .lede");
    if (lede) lede.textContent = "Pick your direction and the corridor you are already near. We compare the official waits and tell you whether changing bridges is actually worth it.";
    const heroQuestion = document.querySelector(".niagara-hero .hero-question");
    if (heroQuestion) heroQuestion.textContent = "Which bridge should you take?";
    const mapHeading = $("orientationHeading");
    const mapIntro = mapHeading?.nextElementSibling;
    if (mapHeading) mapHeading.textContent = "Bridges and cameras — one map";
    if (mapIntro) mapIntro.textContent = "Tap a bridge to orient yourself. Tap a camera icon to open that live view here without leaving the map.";
  }

  function init() {
    document.body.classList.add("niagara-v2-active");
    buildQuickControls();
    simplifyShortcuts();
    reorderPrimaryValue();
    buildProgressiveDisclosure();
    simplifyCopy();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
