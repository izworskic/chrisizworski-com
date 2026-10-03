(() => {
  "use strict";

  const crossingOrder = ["peace", "rainbow", "whirlpool", "lewiston-queenston"];
  const state = {
    direction: "to_canada",
    traveler: "passenger",
    preferred: "rainbow",
    oversize: false,
    requestId: 0,
  };

  let latestPayload = null;
  let latestApproach = null;

  const $ = (id) => document.getElementById(id);
  const directionButtons = [...document.querySelectorAll("[data-direction]")];
  const travelerSelect = $("travelerSelect");
  const preferredSelect = $("preferredSelect");
  const oversizeToggle = $("oversizeToggle");
  const commercialOptions = $("commercialOptions");
  const decisionState = $("decisionState");
  const decisionHeadline = $("decisionHeadline");
  const decisionReason = $("decisionReason");
  const decisionSceneNote = $("decisionSceneNote");
  const freshnessTime = $("freshnessTime");
  const crossingGrid = $("crossingGrid");
  const compareGrid = $("compareGrid");
  const realityGrid = $("realityGrid");
  const realityHeading = $("realityHeading");
  const realityIntro = $("realityIntro");
  const journeyHeading = $("journeyHeading");
  const journeyRole = $("journeyRole");
  const journeySteps = $("journeySteps");
  const journeyActions = $("journeyActions");
  const journeySummary = $("journeySummary");
  const journeyWatch = $("journeyWatch");
  const eligibilityBody = $("eligibilityBody");
  const weatherAlerts = $("weatherAlerts");
  const sourceStatus = $("sourceStatus");
  const approachSummary = $("approachSummary");
  const approachEvents = $("approachEvents");
  const liveDot = $("liveDot");
  const ribbonStatus = $("ribbonStatus");
  const ribbonTime = $("ribbonTime");
  const refreshButton = $("refreshButton");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatCheckedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }

  function formatUpdated(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "timestamp unavailable";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }

  function waitLabel(result) {
    if (!result) return "Not available";
    if (Number.isFinite(result.wait_minutes)) return result.wait_minutes === 0 ? "No delay" : `${Math.round(result.wait_minutes)} min`;
    if (result.display && result.display !== "Not reported") return result.display;
    return "Not reported";
  }

  function shortWait(result) {
    if (!result) return "—";
    if (Number.isFinite(result.wait_minutes)) return result.wait_minutes === 0 ? "No delay" : `${Math.round(result.wait_minutes)} min`;
    if (result.display && result.display !== "Not reported") return result.display;
    return "Unavailable";
  }

  function focusId(payload) {
    return payload?.decision?.recommended_id || state.preferred;
  }

  function getResult(payload, id) {
    return (payload?.decision?.results || []).find((item) => item.id === id) || null;
  }

  function getCrossing(payload, id) {
    return (payload?.crossings || []).find((item) => item.id === id) || null;
  }

  function focusPair(payload) {
    const id = focusId(payload);
    return { id, result: getResult(payload, id), crossing: getCrossing(payload, id) };
  }

  function resultKicker(result, decision) {
    if (!result?.eligibility?.eligible) return "Not for this trip";
    if (result.state === "CROSSING_CLOSED") return "Closed";
    if (result.state === "SOURCE_CONFLICT") return "Reports disagree";
    if (result.context_only) return "Limited live data";
    if (result.id === decision?.recommended_id) return result.id === state.preferred ? "Recommended · stay on route" : "Recommended · switch";
    if (result.id === state.preferred) return "Your usual route";
    if (!result.usable_for_recommendation) return "Live wait unavailable";
    return "Alternate";
  }

  function bridgeChoiceClass(result, decision) {
    const classes = ["bridge-choice"];
    if (result?.id === state.preferred) classes.push("is-natural");
    if (result?.id === decision?.recommended_id && decision?.state !== "INSUFFICIENT_DATA") classes.push("is-recommended");
    if (!result?.eligibility?.eligible) classes.push("is-ineligible");
    return classes.join(" ");
  }

  function travelerLabel() {
    const labels = {
      passenger: "passenger vehicle",
      nexus: "NEXUS auto traveler",
      commercial: state.oversize ? "oversize commercial vehicle" : "commercial truck",
      bus: "bus",
      tow: "vehicle with trailer",
      pedestrian: "pedestrian",
      bicycle: "bicycle",
    };
    return labels[state.traveler] || "traveler";
  }

  function selectedTravelerKey() {
    if (state.traveler === "commercial") return "commercial";
    if (state.traveler === "nexus") return "nexus";
    return "passenger";
  }

  function operatorContext(crossing) {
    if (!crossing) return null;
    if (["pedestrian", "bicycle"].includes(state.traveler)) return null;
    return crossing?.waits?.[state.direction]?.operator_validation?.[selectedTravelerKey()] || null;
  }

  function destinationSide(crossing) {
    const route = String(crossing?.route || "");
    const sides = route.split("↔").map((part) => part.trim());
    if (sides.length < 2) return route || "the other side of the Niagara River";
    return state.direction === "to_canada" ? sides[1] : sides[0];
  }

  function currentRule(crossing, result) {
    if (!result?.eligibility?.eligible) return result?.eligibility?.reason || "This crossing is not available for your selected trip.";
    if (crossing?.nexus_required) return "NEXUS is required for this crossing.";
    if (state.traveler === "commercial" && !crossing?.eligibility?.commercial) return "Commercial trucks cannot use this crossing.";
    if (state.traveler === "pedestrian" && !crossing?.eligibility?.pedestrian) return "Pedestrians cannot use this crossing.";
    if (state.traveler === "bicycle" && !crossing?.eligibility?.bicycle) return "Bicycles cannot use this crossing.";
    if (state.traveler === "tow" && !crossing?.eligibility?.tow) return "Vehicles towing are not permitted here.";
    return crossing?.restrictions?.[0] || "Your selected traveler type is allowed under the published crossing rules.";
  }

  function decisionTone(decision) {
    if (["USE_PRIMARY_CROSSING", "ALTERNATE_CROSSING_BETTER"].includes(decision?.state)) return "good";
    if (decision?.state === "COMPARABLE_OPTIONS") return "caution";
    return "stop";
  }

  function humanDecisionReason(payload) {
    const decision = payload?.decision || {};
    const preferred = getResult(payload, state.preferred);
    const recommended = getResult(payload, decision.recommended_id);
    if (decision.state === "USE_PRIMARY_CROSSING") {
      return `Stay on the route you were already going to use. None of the eligible alternates saves enough border time to make leaving that corridor worthwhile.`;
    }
    if (decision.state === "ALTERNATE_CROSSING_BETTER") {
      if (!preferred?.eligibility?.eligible) return `${preferred?.short_name || "Your usual bridge"} does not work for this trip. ${recommended?.short_name || "The recommended bridge"} is the strongest current eligible option.`;
      if (preferred?.state === "CROSSING_CLOSED") return `${preferred?.short_name || "Your usual bridge"} is closed. Use ${recommended?.short_name || "the recommended alternate"} if its approach works for your trip.`;
      return `${recommended?.short_name || "The alternate"} has a large enough current advantage to justify leaving your usual Niagara route.`;
    }
    if (decision.state === "COMPARABLE_OPTIONS") return `The reported differences are small enough that your starting point and destination matter more than chasing the lowest number.`;
    return decision.reason || "The official live reports are not strong enough to make a confident bridge choice right now.";
  }

  function renderDecision(payload) {
    const decision = payload?.decision || {};
    const tone = decisionTone(decision);
    const focus = focusPair(payload);
    decisionState.textContent = decision.state === "USE_PRIMARY_CROSSING" ? "Stay on route"
      : decision.state === "ALTERNATE_CROSSING_BETTER" ? "Switch bridge"
        : decision.state === "COMPARABLE_OPTIONS" ? "Routes are close"
          : "Check before leaving";
    decisionState.className = `trip-state${tone === "caution" ? " is-caution" : tone === "stop" ? " is-stop" : ""}`;
    decisionHeadline.textContent = decision.headline || "Current crossing comparison is unavailable";
    decisionReason.textContent = humanDecisionReason(payload);
    decisionSceneNote.textContent = focus.crossing
      ? `${focus.crossing.short_name || focus.crossing.name} · ${travelerLabel()} · ${state.direction === "to_canada" ? "entering Canada" : "entering the United States"}`
      : "Check the official bridge and border links before committing.";

    const checked = formatCheckedAt(payload?.fetched_at);
    freshnessTime.textContent = checked;
    ribbonTime.textContent = checked;
    liveDot.className = `live-dot${payload?.degraded || tone === "stop" ? " is-degraded" : " is-live"}`;
    ribbonStatus.textContent = decision.headline || "Official crossing data checked.";

    const ordered = [...(decision.results || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    crossingGrid.innerHTML = ordered.map((result) => {
      const crossing = getCrossing(payload, result.id);
      const role = crossing?.experience?.role || crossing?.route || "Niagara River crossing";
      return `<article class="${bridgeChoiceClass(result, decision)}">
        <p class="bridge-choice-kicker">${escapeHtml(resultKicker(result, decision))}</p>
        <h3>${escapeHtml(result.short_name || result.name)}</h3>
        <strong class="bridge-choice-wait">${escapeHtml(shortWait(result))}</strong>
        <p class="bridge-choice-note">${escapeHtml(result.eligibility?.eligible ? role : result.eligibility?.reason || "Not eligible")}</p>
        <span class="bridge-choice-route">${escapeHtml(result.route || "")}</span>
      </article>`;
    }).join("");
  }

  function realityItem(label, value, detail, tone = "") {
    return `<div class="reality-item${tone ? ` is-${tone}` : ""}"><span class="reality-label">${escapeHtml(label)}</span><strong class="reality-value">${escapeHtml(value)}</strong><span class="reality-detail">${escapeHtml(detail)}</span></div>`;
  }

  function renderReality(payload) {
    const { result, crossing } = focusPair(payload);
    if (!crossing) return;
    const operator = operatorContext(crossing);
    const alerts = Array.isArray(payload?.warnings?.weather) ? payload.warnings.weather : [];
    const approach = latestApproach;
    const waitDetail = result?.source?.available
      ? `${result.source.name || "Official border agency"} · updated ${formatUpdated(result.source.updated_at)}`
      : "No matching current official wait is available.";
    const operatorValue = operator?.available ? (operator.wait_minutes === 0 ? "No delay" : operator.display || `${operator.wait_minutes} min`) : "No matching report";
    const operatorDetail = operator?.available ? `${crossing.operator} plaza / traffic context` : "Use the operator traffic link before entering the approach.";
    let approachValue = "Open live maps";
    let approachDetail = "511 New York, Ontario 511 and NITTEC";
    if (approach?.available) {
      const count = Number(approach?.summary?.event_count || 0);
      approachValue = count ? `${count} nearby event${count === 1 ? "" : "s"}` : "No matching event returned";
      approachDetail = "Filtered official 511 corridor context; this is not a travel-time estimate.";
    }
    const weatherValue = alerts.length ? `${alerts.length} active alert${alerts.length === 1 ? "" : "s"}` : "No active alert returned";
    const weatherDetail = alerts.length ? (alerts[0]?.headline || "Official weather warning active") : "NWS / Environment Canada check";
    const toll = crossing?.toll?.[state.direction] || "Check operator";
    const eligibleTone = result?.eligibility?.eligible ? "good" : "warn";

    realityHeading.textContent = `${crossing.short_name || crossing.name} right now`;
    realityIntro.textContent = crossing.experience?.human_summary || crossing.route || "Current bridge and border context.";
    realityGrid.innerHTML = [
      realityItem("Border wait", shortWait(result), waitDetail, result?.usable_for_recommendation ? "good" : "warn"),
      realityItem("Bridge traffic", operatorValue, operatorDetail, operator?.available ? "good" : "warn"),
      realityItem("Approach", approachValue, approachDetail),
      realityItem("Weather", weatherValue, weatherDetail, alerts.length ? "warn" : "good"),
      realityItem("Toll / hours", toll, `${crossing.hours || "Check hours"} · ${result?.eligibility?.eligible ? "Allowed for your trip" : "Not eligible for your trip"}`, eligibleTone),
    ].join("");
  }

  function renderJourney(payload) {
    const { result, crossing } = focusPair(payload);
    if (!crossing) return;
    const exp = crossing.experience || {};
    const operator = operatorContext(crossing);
    const plazaText = result?.source?.available
      ? `The border agency is currently reporting ${waitLabel(result).toLowerCase()} for your selected trip${result.source.updated_at ? `, last updated ${formatUpdated(result.source.updated_at)}` : ""}.`
      : `A matching current border wait is not available for this traveler, so do not substitute a passenger-car number.`;
    const operatorText = operator?.available ? ` The bridge operator is also showing ${String(operator.display || shortWait(operator)).toLowerCase()} in its plaza/traffic context.` : "";
    const steps = [
      ["Approach", exp.approach_character || crossing.route || "Follow the signed bridge approach for this corridor."],
      ["Plaza", `${plazaText}${operatorText}`],
      ["Cross", `${exp.role || "Niagara River crossing"}. ${currentRule(crossing, result)}`],
      ["Come off the bridge", `You emerge toward ${destinationSide(crossing)}. ${exp.on_the_ground || "Stay with the route that matches your destination."}`],
    ];

    journeyHeading.textContent = `If you take ${crossing.short_name || crossing.name} right now`;
    journeyRole.textContent = exp.role || crossing.route || "Niagara River crossing";
    journeySteps.innerHTML = steps.map(([title, text], index) => `<article class="journey-step"><span class="journey-step-num">${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("");

    const camera = crossing.cameras?.[0];
    const actions = [];
    if (camera?.url) actions.push(`<a class="primary" href="${escapeHtml(camera.url)}" target="_blank" rel="noopener">Open live camera / traffic view ↗</a>`);
    if (crossing.traffic_url) actions.push(`<a href="${escapeHtml(crossing.traffic_url)}" target="_blank" rel="noopener">Open ${escapeHtml(crossing.short_name || crossing.name)} traffic ↗</a>`);
    if (result?.source?.url) actions.push(`<a href="${escapeHtml(result.source.url)}" target="_blank" rel="noopener">Open official border wait ↗</a>`);
    journeyActions.innerHTML = actions.join("");

    journeySummary.textContent = exp.watch_for || "Check the live camera and bridge operator immediately before entering the approach.";
    const watch = [
      ["Your traveler", currentRule(crossing, result)],
      ["Hours", crossing.hours || "Check operator"],
      ["Toll this direction", crossing.toll?.[state.direction] || "Check operator"],
    ];
    journeyWatch.innerHTML = watch.map(([label, text]) => `<li><strong>${escapeHtml(label)}</strong>${escapeHtml(text)}</li>`).join("");
  }

  function renderCompare(payload) {
    const decision = payload?.decision || {};
    const ordered = [...(decision.results || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    compareGrid.innerHTML = ordered.map((result) => {
      const crossing = getCrossing(payload, result.id);
      const exp = crossing?.experience || {};
      const classes = ["compare-bridge"];
      if (result.id === decision.recommended_id && decision.state !== "INSUFFICIENT_DATA") classes.push("is-recommended");
      if (!result.eligibility?.eligible) classes.push("is-ineligible");
      let action = result.eligibility?.reason || result.note || "Check this crossing before departure.";
      if (result.id === decision.recommended_id && decision.state !== "INSUFFICIENT_DATA") action = result.id === state.preferred ? "Best fit now: stay on the route you were already going to use." : "Best fit now: the current advantage is large enough to justify changing crossings.";
      else if (result.id === state.preferred && result.eligibility?.eligible) action = "This is your natural route; the tool only moves you off it for a meaningful reason.";
      return `<article class="${classes.join(" ")}"><div class="compare-head"><div><p class="bridge-choice-kicker">${escapeHtml(resultKicker(result, decision))}</p><h3>${escapeHtml(result.short_name || result.name)}</h3></div><strong class="compare-wait">${escapeHtml(shortWait(result))}</strong></div><p class="compare-role">${escapeHtml(exp.human_summary || exp.role || result.route || "Niagara River crossing")}</p><div class="compare-meta"><span>${escapeHtml(result.route || "")}</span><span>${escapeHtml(crossing?.hours || "Hours vary")}</span></div><p class="compare-action">${escapeHtml(action)}</p></article>`;
    }).join("");
  }

  function renderEligibility(payload) {
    const results = new Map((payload?.decision?.results || []).map((item) => [item.id, item]));
    const crossings = [...(payload?.crossings || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    eligibilityBody.innerHTML = crossings.map((crossing) => {
      const result = results.get(crossing.id);
      const eligible = Boolean(result?.eligibility?.eligible);
      const rule = currentRule(crossing, result);
      return `<tr><td><strong>${escapeHtml(crossing.short_name || crossing.name)}</strong><br><span class="scene-note">${escapeHtml(crossing.experience?.role || crossing.route || "")}</span></td><td class="${eligible ? "yes" : "no"}">${eligible ? "Eligible" : "Not eligible"}</td><td>${escapeHtml(crossing.hours || "Check operator")}</td><td>${escapeHtml(crossing.toll?.[state.direction] || "Check operator")}</td><td>${escapeHtml(rule)}</td></tr>`;
    }).join("");
  }

  function renderWeather(payload) {
    const alerts = Array.isArray(payload?.warnings?.weather) ? payload.warnings.weather : [];
    if (!alerts.length) {
      weatherAlerts.innerHTML = `<p class="all-clear">No active weather alert was returned by the current NWS / Environment Canada checks. Recheck before departure.</p>`;
      return;
    }
    weatherAlerts.innerHTML = alerts.slice(0, 5).map((alert) => `<div class="weather-alert"><strong>${escapeHtml(alert.headline || "Weather alert")}</strong><span>${escapeHtml(alert.source || "Official weather authority")}</span></div>`).join("");
  }

  function renderSources(payload) {
    const s = payload?.sources || {};
    const entries = [
      ["CBP · entering the U.S.", s.to_us_waits?.available],
      ["CBSA · entering Canada", s.to_canada_waits?.available],
      ["Niagara Falls Bridge Commission", s.nfbc_operations?.available],
      ["Peace Bridge Authority", s.peace_operations?.available],
      ["NWS / Environment Canada", Boolean(s.nws_weather?.available || s.eccc_weather?.available)],
      ["511 approach feeds", Boolean(latestApproach?.available)],
    ];
    sourceStatus.innerHTML = entries.map(([name, available]) => `<div><strong>${escapeHtml(name)}</strong>${available ? "Available" : "Unavailable / not connected"}</div>`).join("");
  }

  function renderApproachContext(payload) {
    latestApproach = payload;
    if (payload?.available) {
      const events = Array.isArray(payload.events) ? payload.events.slice(0, 3) : [];
      const count = Number(payload?.summary?.event_count || 0);
      const cameras = Number(payload?.summary?.camera_count || 0);
      approachSummary.textContent = count
        ? `Official 511 feeds returned ${count} matching corridor event${count === 1 ? "" : "s"} near the Niagara crossings, plus ${cameras} camera${cameras === 1 ? "" : "s"}. These are approach conditions, not customs wait time.`
        : `The connected 511 feeds returned no matching corridor events in the filtered Niagara area and ${cameras} camera${cameras === 1 ? "" : "s"}. That is not a guarantee of clear roads—check the live maps before leaving.`;
      approachEvents.innerHTML = events.length
        ? events.map((event) => `<div class="approach-event"><strong>${escapeHtml(event.full_closure ? "Full closure · " : "")}${escapeHtml(event.roadway || event.provider || "Road event")}</strong><span>${escapeHtml(event.description || event.location || "Official corridor event")}</span><span>${escapeHtml(event.provider || "Official 511")}</span></div>`).join("")
        : `<div class="approach-event"><strong>No matching event returned</strong><span>Use the live 511 maps and NITTEC cameras immediately before entering the bridge approach.</span></div>`;
    } else {
      approachSummary.textContent = payload?.configured
        ? "The configured structured 511 feed did not return usable data. Use the official live maps and NITTEC cameras below before entering the approach."
        : "Structured 511 data is not connected on this deployment. Use the official live maps and NITTEC cameras below for the road picture before you commit.";
      approachEvents.innerHTML = `<div class="approach-event"><strong>Use the live approach views</strong><span>The crossing recommendation is still based on border and bridge authority data; no road-delay estimate is being invented.</span></div>`;
    }
    if (latestPayload) {
      renderReality(latestPayload);
      renderSources(latestPayload);
    }
  }

  function renderApproachFailure() {
    renderApproachContext({ available: false, configured: true });
  }

  function renderAll(payload) {
    latestPayload = payload;
    renderDecision(payload);
    renderReality(payload);
    renderJourney(payload);
    renderCompare(payload);
    renderEligibility(payload);
    renderWeather(payload);
    renderSources(payload);
  }

  function renderFailure(error) {
    decisionState.textContent = "Live data unavailable";
    decisionState.className = "trip-state is-stop";
    decisionHeadline.textContent = "Check the official bridge reports before leaving";
    decisionReason.textContent = "The live Niagara comparison failed. Do not assume the lowest-looking route or substitute an old wait time.";
    decisionSceneNote.textContent = "Static crossing restrictions still apply.";
    crossingGrid.innerHTML = `<article class="bridge-choice is-ineligible"><p class="bridge-choice-kicker">Live comparison unavailable</p><h3>Use official reports</h3><strong class="bridge-choice-wait">Verify</strong><span class="bridge-choice-route">CBP / CBSA / bridge operator</span></article>`;
    liveDot.className = "live-dot is-degraded";
    ribbonStatus.textContent = "Live crossing comparison is temporarily unavailable.";
    ribbonTime.textContent = "";
    console.error("[niagara-border-crossing] live refresh failed", error);
  }

  function queryString() {
    const params = new URLSearchParams({ direction: state.direction, traveler: state.traveler, preferred: state.preferred });
    if (state.oversize) params.set("oversize", "1");
    return params.toString();
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("direction", state.direction);
    url.searchParams.set("traveler", state.traveler);
    url.searchParams.set("preferred", state.preferred);
    if (state.oversize) url.searchParams.set("oversize", "1"); else url.searchParams.delete("oversize");
    window.history.replaceState(null, "", url);
  }

  async function refresh(track = false) {
    const requestId = ++state.requestId;
    syncUrl();
    decisionHeadline.textContent = "Checking the bridges that fit your trip…";
    liveDot.className = "live-dot is-loading";
    ribbonStatus.textContent = "Checking official border and bridge reports…";
    try {
      const response = await fetch(`/api/niagara-border-crossings?${queryString()}`, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const payload = await response.json();
      if (requestId !== state.requestId) return;
      renderAll(payload);
      if (track && typeof window.va === "function") {
        window.va("event", { name: "niagara_crossing_decision", data: { direction: state.direction, traveler: state.traveler, preferred: state.preferred, decision_state: payload.decision?.state, recommended: payload.decision?.recommended_id } });
      }
    } catch (error) {
      if (requestId !== state.requestId) return;
      renderFailure(error);
    }
  }

  async function loadApproachContext() {
    try {
      const response = await fetch("/api/niagara-approach-context", { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Approach API returned ${response.status}`);
      renderApproachContext(await response.json());
    } catch (error) {
      renderApproachFailure();
      console.error("[niagara-border-crossing] approach context failed", error);
    }
  }

  function applyControls() {
    directionButtons.forEach((button) => {
      const selected = button.dataset.direction === state.direction;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    travelerSelect.value = state.traveler;
    preferredSelect.value = state.preferred;
    commercialOptions.hidden = state.traveler !== "commercial";
    oversizeToggle.checked = state.oversize;
  }

  function readInitialState() {
    const params = new URLSearchParams(window.location.search);
    if (["to_canada", "to_us"].includes(params.get("direction"))) state.direction = params.get("direction");
    if (["passenger", "nexus", "commercial", "pedestrian", "bicycle", "bus", "tow"].includes(params.get("traveler"))) state.traveler = params.get("traveler");
    if (["peace", "rainbow", "whirlpool", "lewiston-queenston"].includes(params.get("preferred"))) state.preferred = params.get("preferred");
    state.oversize = state.traveler === "commercial" && params.get("oversize") === "1";
  }

  directionButtons.forEach((button) => button.addEventListener("click", () => {
    state.direction = button.dataset.direction;
    applyControls();
    refresh(true);
  }));
  travelerSelect.addEventListener("change", () => {
    state.traveler = travelerSelect.value;
    if (state.traveler !== "commercial") state.oversize = false;
    applyControls();
    refresh(true);
  });
  preferredSelect.addEventListener("change", () => {
    state.preferred = preferredSelect.value;
    refresh(true);
  });
  oversizeToggle.addEventListener("change", () => {
    state.oversize = oversizeToggle.checked;
    refresh(true);
  });
  refreshButton.addEventListener("click", () => refresh(true));

  readInitialState();
  applyControls();
  refresh(false);
  loadApproachContext();
  window.setInterval(() => {
    if (!document.hidden) refresh(false);
  }, 60_000);
})();