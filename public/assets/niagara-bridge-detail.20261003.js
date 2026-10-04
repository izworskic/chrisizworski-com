(() => {
  "use strict";

  const body = document.body;
  const crossingId = body.dataset.niagaraDetail;
  if (!crossingId) return;

  const $ = (id) => document.getElementById(id);
  const buttons = [...document.querySelectorAll("[data-detail-direction]")];
  const travelerSelect = $("detailTraveler");
  const nexusDefinition = "NEXUS = a Canada–U.S. trusted-traveler program for pre-approved, low-risk travelers. Everyone in the vehicle must be a NEXUS member to use a NEXUS lane.";

  const nexusOption = travelerSelect?.querySelector('option[value="nexus"]');
  if (nexusOption) {
    nexusOption.textContent = "NEXUS member";
    if (!$("detailNexusDefinition")) {
      const note = document.createElement("p");
      note.id = "detailNexusDefinition";
      note.className = "mode-note";
      note.textContent = nexusDefinition;
      travelerSelect.insertAdjacentElement("afterend", note);
    }
  }

  const state = {
    direction: new URLSearchParams(location.search).get("direction") === "to_us" ? "to_us" : "to_canada",
    traveler: travelerSelect?.value || body.dataset.defaultTraveler || "passenger",
    requestId: 0,
  };

  const fmtTime = (value) => {
    if (!value) return "Update time unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Update time unavailable";
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
  };

  const selectedLane = (crossing) => {
    const waits = crossing?.waits?.[state.direction];
    if (!waits) return null;
    if (state.traveler === "commercial") return waits.commercial?.standard || null;
    if (state.traveler === "nexus") return waits.passenger?.nexus || null;
    return waits.passenger?.standard || null;
  };

  const sourceName = (crossing) => {
    const waits = crossing?.waits?.[state.direction];
    if (state.traveler === "nexus" && waits?.operator_source?.available) {
      return waits.operator_source.name;
    }
    if (state.direction === "to_canada") return waits?.source?.name || "Canada Border Services Agency";
    return waits?.source?.name || "U.S. Customs and Border Protection";
  };

  function setDirection(direction) {
    state.direction = direction === "to_us" ? "to_us" : "to_canada";
    buttons.forEach((button) => {
      const selected = button.dataset.detailDirection === state.direction;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const url = new URL(location.href);
    if (state.direction === "to_canada") url.searchParams.delete("direction");
    else url.searchParams.set("direction", "to_us");
    history.replaceState({}, "", url);
    load();
  }

  function render(payload) {
    const crossing = payload.crossings?.find((item) => item.id === crossingId);
    if (!crossing) throw new Error("Crossing missing from live payload");
    const lane = selectedLane(crossing);
    const source = sourceName(crossing);
    const directionLabel = state.direction === "to_canada" ? "entering Canada" : "entering the United States";

    $("detailWait").textContent = lane?.available ? lane.display : lane?.display || "Not reported";
    $("detailHeadline").textContent = `${crossing.name} wait ${directionLabel}`;
    $("detailWaitNote").textContent = lane?.available
      ? `${source} is reporting ${lane.display.toLowerCase()} for this selected traffic stream.`
      : `${source} is not publishing a comparable current wait for this selected traffic stream.`;
    $("detailUpdated").textContent = lane?.updated_at ? `Updated ${fmtTime(lane.updated_at)}` : "Freshness unavailable";
    $("detailSource").textContent = source;
    $("detailHours").textContent = crossing.hours || "Hours vary";
    $("detailToll").textContent = crossing.toll?.[state.direction] || "Check official toll schedule";
    $("detailEligibility").textContent = crossing.restrictions?.length ? crossing.restrictions.join(" ") : "No special restriction returned for this selection.";

    const liveDot = $("liveDot");
    if (liveDot) liveDot.className = "live-dot is-live";
    if ($("ribbonStatus")) $("ribbonStatus").textContent = lane?.available ? `${crossing.short_name}: ${lane.display}` : `${crossing.short_name}: live wait unavailable`;
    if ($("ribbonTime")) $("ribbonTime").textContent = lane?.updated_at ? fmtTime(lane.updated_at) : "";

    const compare = $("compareLinks");
    if (compare && Array.isArray(payload.decision?.results)) {
      compare.innerHTML = payload.decision.results
        .filter((result) => result.id !== crossingId)
        .map((result) => `<a href="/niagara-border-crossing/?direction=${encodeURIComponent(state.direction)}&traveler=${encodeURIComponent(state.traveler)}&preferred=${encodeURIComponent(result.id)}"><span>${result.name}</span><br><small>${result.display || result.state.replaceAll("_", " ")}</small></a>`)
        .join("");
    }
  }

  async function load() {
    const requestId = ++state.requestId;
    if ($("detailWait")) $("detailWait").textContent = "Checking…";
    try {
      const preferred = crossingId;
      const params = new URLSearchParams({ direction: state.direction, traveler: state.traveler, preferred });
      const response = await fetch(`/api/niagara-border-crossings?${params}`, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const payload = await response.json();
      if (requestId !== state.requestId) return;
      render(payload);
    } catch (error) {
      if (requestId !== state.requestId) return;
      $("detailWait").textContent = "Live wait unavailable";
      $("detailWaitNote").textContent = "Use the official agency or bridge-operator source and recheck before entering the approach.";
      const liveDot = $("liveDot");
      if (liveDot) liveDot.className = "live-dot";
      if ($("ribbonStatus")) $("ribbonStatus").textContent = "Official live report unavailable";
    }
  }

  buttons.forEach((button) => button.addEventListener("click", () => setDirection(button.dataset.detailDirection)));
  travelerSelect?.addEventListener("change", () => {
    state.traveler = travelerSelect.value;
    load();
  });
  $("detailRefresh")?.addEventListener("click", load);

  setDirection(state.direction);
})();