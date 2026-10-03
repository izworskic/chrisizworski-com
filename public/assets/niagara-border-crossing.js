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

  const $ = (id) => document.getElementById(id);
  const directionButtons = [...document.querySelectorAll("[data-direction]")];
  const mapCrossings = [...document.querySelectorAll("[data-map-crossing]")];
  const travelerSelect = $("travelerSelect");
  const preferredSelect = $("preferredSelect");
  const decisionState = $("decisionState");
  const decisionHeadline = $("decisionHeadline");
  const decisionReason = $("decisionReason");
  const freshnessTime = $("freshnessTime");
  const crossingGrid = $("crossingGrid");
  const liveDot = $("liveDot");
  const ribbonStatus = $("ribbonStatus");
  const ribbonTime = $("ribbonTime");
  const weatherAlerts = $("weatherAlerts");
  const sourceStatus = $("sourceStatus");
  const eligibilityGrid = $("eligibilityGrid");
  const proofHeadline = $("proofHeadline");
  const proofText = $("proofText");
  const experienceHeadline = $("experienceHeadline");
  const experienceText = $("experienceText");
  const experienceRole = $("experienceRole");
  const commitHeadline = $("commitHeadline");
  const commitText = $("commitText");
  const humanLinks = $("humanLinks");
  const approachState = $("approachState");
  const approachSummary = $("approachSummary");
  const approachEvents = $("approachEvents");

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

  function freshnessLabel(freshness) {
    if (!freshness) return "No timestamp";
    if (freshness.state === "fresh") return freshness.age_minutes == null ? "Fresh" : `${freshness.age_minutes} min old`;
    if (freshness.state === "stale") return `Stale · ${freshness.age_minutes ?? "?"} min old`;
    if (freshness.state === "expired") return `Expired · ${freshness.age_minutes ?? "?"} min old`;
    return freshness.state || "Unknown age";
  }

  function waitLabel(result) {
    if (!result) return "not available";
    if (Number.isFinite(result.wait_minutes)) return `${Math.round(result.wait_minutes)} min`;
    if (result.display && result.display !== "Not reported") return result.display;
    return "not reported";
  }

  function resultKicker(result, decision) {
    if (!result?.eligibility?.eligible) return "Not eligible";
    if (result.state === "CROSSING_CLOSED") return "Closed";
    if (result.state === "SOURCE_CONFLICT") return "Source conflict";
    if (result.state === "OPERATOR_CONTEXT_ONLY" || result.context_only) return "Context only";
    if (result.id === decision?.recommended_id) return decision.state === "COMPARABLE_OPTIONS" ? "Stay on route" : "Recommended";
    if (result.id === state.preferred) return "Your normal route";
    if (!result.usable_for_recommendation) return "Not comparable";
    return "Alternate";
  }

  function resultClass(result, decision) {
    const classes = ["crossing-result"];
    if (!result?.eligibility?.eligible) classes.push("is-ineligible");
    if (!result?.usable_for_recommendation) classes.push("is-unavailable");
    if (result?.id === decision?.recommended_id && decision?.state !== "INSUFFICIENT_DATA") classes.push("is-recommended");
    return classes.join(" ");
  }

  function renderResult(result, decision) {
    const chips = [];
    if (result.route) chips.push(result.route);
    if (result.freshness) chips.push(freshnessLabel(result.freshness));
    if (result.diversion_buffer_minutes > 0) chips.push(`${result.diversion_buffer_minutes} min switch guardrail`);
    if (result.context_only) chips.push("Lower-confidence operator context");
    if (result.eligibility?.state === "RESTRICTION_ACTIVE") chips.push("Approval required");
    const restrictions = (result.restrictions || []).slice(0, 2).join(" · ");
    const note = result.note || restrictions || result.eligibility?.reason || "Current comparable evidence is available.";
    return `<article class="${resultClass(result, decision)}">
      <p class="result-kicker">${escapeHtml(resultKicker(result, decision))}</p>
      <h4>${escapeHtml(result.short_name || result.name)}</h4>
      <strong class="wait-value${Number.isFinite(result.wait_minutes) ? "" : " is-unknown"}">${escapeHtml(waitLabel(result))}</strong>
      <p class="result-note">${escapeHtml(note)}</p>
      <div class="metric-row">${chips.map((chip) => `<span class="metric-chip">${escapeHtml(chip)}</span>`).join("")}</div>
    </article>`;
  }

  function decisionTone(decision) {
    if (["USE_PRIMARY_CROSSING", "ALTERNATE_CROSSING_BETTER"].includes(decision?.state)) return "good";
    if (decision?.state === "COMPARABLE_OPTIONS") return "caution";
    return "stop";
  }

  function renderDecision(payload) {
    const decision = payload?.decision || {};
    const tone = decisionTone(decision);
    decisionState.textContent = decision.state === "USE_PRIMARY_CROSSING" ? "Stay on route"
      : decision.state === "ALTERNATE_CROSSING_BETTER" ? "Switch bridge"
        : decision.state === "COMPARABLE_OPTIONS" ? "Options close"
          : "Uncertain";
    decisionState.className = `decision-state${tone === "caution" ? " is-caution" : tone === "stop" ? " is-stop" : ""}`;
    decisionHeadline.textContent = decision.headline || "Current crossing comparison is unavailable";
    decisionReason.textContent = decision.reason || "No confident live decision is available.";
    const checked = formatCheckedAt(payload?.fetched_at);
    freshnessTime.textContent = checked;
    ribbonTime.textContent = checked;
    liveDot.className = `live-dot${payload?.degraded || tone === "stop" ? " is-degraded" : " is-live"}`;
    ribbonStatus.textContent = payload?.degraded ? "Some official sources are degraded; uncertainty is preserved." : decision.headline || "Official crossing data checked.";

    const ordered = [...(decision.results || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    crossingGrid.innerHTML = ordered.length
      ? ordered.map((result) => renderResult(result, decision)).join("")
      : `<article class="crossing-result is-unavailable"><p class="result-kicker">Unavailable</p><h4>No comparison</h4><strong class="wait-value is-unknown">No data</strong></article>`;
    renderMap(decision);
  }

  function proofFor(payload) {
    const decision = payload?.decision || {};
    const results = decision.results || [];
    const preferred = results.find((result) => result.id === state.preferred);
    const recommended = results.find((result) => result.id === decision.recommended_id);
    const minBenefit = decision.minimum_net_benefit_minutes || 10;

    if (decision.state === "ALTERNATE_CROSSING_BETTER") {
      if (!preferred?.eligibility?.eligible) {
        return { headline: "Eligibility decided this before wait time did", text: `${preferred?.short_name || "Your normal crossing"} is not eligible for this traveler. ${recommended?.short_name || "The recommended crossing"} is the strongest fresh eligible option.` };
      }
      if (preferred?.state === "CROSSING_CLOSED") {
        return { headline: "Your normal crossing is closed", text: `${recommended?.short_name || "The alternate"} is the strongest fresh eligible option. This is a closure-driven diversion, not a claim that its route is normally faster.` };
      }
      const buffer = recommended?.diversion_buffer_minutes || 0;
      return {
        headline: `The alternate cleared the switch guardrail`,
        text: `${preferred?.short_name || "Your normal bridge"} is reporting ${waitLabel(preferred)}; ${recommended?.short_name || "the alternate"} is reporting ${waitLabel(recommended)}. The engine adds a conservative ${buffer}-minute route-switch guardrail to the alternate, and it still clears the comparison by about ${decision.net_benefit_minutes ?? minBenefit} minutes.`,
      };
    }
    if (decision.state === "USE_PRIMARY_CROSSING") {
      return {
        headline: "The wait difference is not worth leaving your route",
        text: `${preferred?.short_name || "Your normal bridge"} remains the recommendation. No eligible alternate beats it after the alternate's route-switch guardrail and the required ${minBenefit}-minute benefit are applied.`,
      };
    }
    if (decision.state === "COMPARABLE_OPTIONS") {
      return {
        headline: "The bridges are too close to justify a detour",
        text: `An alternate may show a shorter border wait, but it does not clear the route-switch guardrail by the required ${minBenefit} minutes. Staying on the natural route avoids manufacturing precision from a small difference.`,
      };
    }
    return {
      headline: "The engine is refusing to turn uncertainty into a detour",
      text: decision.reason || "Your normal bridge lacks fresh comparable evidence, so static rules remain valid but the live data are not strong enough to justify switching crossings.",
    };
  }

  function renderInterpretation(payload) {
    const decision = payload?.decision || {};
    const focusId = decision.recommended_id || state.preferred;
    const crossing = (payload?.crossings || []).find((item) => item.id === focusId)
      || (payload?.crossings || []).find((item) => item.id === state.preferred);
    const experience = crossing?.experience || {};
    const proof = proofFor(payload);

    proofHeadline.textContent = proof.headline;
    proofText.textContent = proof.text;
    experienceHeadline.textContent = crossing ? `What ${crossing.short_name || crossing.name} means on the ground` : "Your crossing experience";
    experienceText.textContent = experience.on_the_ground || experience.human_summary || "Bridge-specific experience context is unavailable.";
    experienceRole.textContent = experience.role || "Crossing role unavailable";
    commitHeadline.textContent = crossing ? `Before committing to ${crossing.short_name || crossing.name}` : "Before you commit";
    commitText.textContent = experience.watch_for || "Check current official approach conditions before leaving your natural route.";
    humanLinks.innerHTML = (experience.official_links || [])
      .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`)
      .join("");
  }

  function renderMap(decision) {
    mapCrossings.forEach((row) => {
      const id = row.dataset.mapCrossing;
      row.classList.toggle("is-natural", id === state.preferred);
      row.classList.toggle("is-recommended", Boolean(decision?.recommended_id) && id === decision.recommended_id && decision.state !== "INSUFFICIENT_DATA");
    });
  }

  function renderWeather(payload) {
    const alerts = Array.isArray(payload?.warnings?.weather) ? payload.warnings.weather : [];
    if (!alerts.length) {
      weatherAlerts.innerHTML = `<p class="all-clear">No active weather alert was returned by the connected NWS / Environment Canada checks.</p>`;
      return;
    }
    weatherAlerts.innerHTML = alerts.slice(0, 5).map((alert) => `<div class="weather-alert"><strong>${escapeHtml(alert.headline || "Weather alert")}</strong><span>${escapeHtml(alert.source || "Official weather authority")}</span></div>`).join("");
  }

  function renderSources(payload) {
    const sources = payload?.sources || {};
    const entries = [
      ["CBP · U.S.-bound waits", sources.to_us_waits?.available],
      ["CBSA · Canada-bound waits", sources.to_canada_waits?.available],
      ["NFBC · bridge operations", sources.nfbc_operations?.available],
      ["Peace Bridge Authority", sources.peace_operations?.available],
      ["NWS / Environment Canada", Boolean(sources.nws_weather?.available || sources.eccc_weather?.available)],
    ];
    sourceStatus.innerHTML = entries.map(([name, available]) => `<div class="${available ? "" : "is-down"}"><strong>${escapeHtml(name)}</strong>${available ? "Available" : "Unavailable / degraded"}</div>`).join("")
      + `<div class="is-down" id="approachSourceStatus"><strong>511 approach context</strong>Checking key-gated adapter…</div>`;
  }

  function humanEligibility(crossing) {
    const allowed = [];
    if (crossing.eligibility?.passenger) allowed.push("passenger vehicles");
    if (crossing.eligibility?.commercial) allowed.push("commercial trucks");
    if (crossing.eligibility?.bus) allowed.push("buses");
    if (crossing.eligibility?.tow) allowed.push("trailers / tow");
    if (crossing.eligibility?.pedestrian) allowed.push("pedestrians");
    if (crossing.eligibility?.bicycle) allowed.push("bicycles");
    return allowed.join(", ");
  }

  function renderEligibility(payload) {
    const crossings = Array.isArray(payload?.crossings) ? payload.crossings : [];
    if (!crossings.length) return;
    const ordered = [...crossings].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    eligibilityGrid.innerHTML = ordered.map((crossing) => {
      const restrictions = (crossing.restrictions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const role = crossing.experience?.role ? `<p><strong>Role:</strong> ${escapeHtml(crossing.experience.role)}</p>` : "";
      return `<article class="eligibility-card"><h3>${escapeHtml(crossing.short_name || crossing.name)}</h3>${role}<p><strong>Allowed:</strong> ${escapeHtml(humanEligibility(crossing))}</p><p><strong>Hours:</strong> ${escapeHtml(crossing.hours)}</p><p><strong>Toll:</strong> ${escapeHtml(crossing.toll?.[state.direction] || "Check operator")}</p>${crossing.nexus_required ? "<p><strong>NEXUS required.</strong></p>" : ""}${restrictions ? `<ul>${restrictions}</ul>` : ""}</article>`;
    }).join("");
  }

  function renderApproachContext(payload) {
    const statusNode = $("approachSourceStatus");
    if (payload?.available) {
      approachState.textContent = payload.complete ? "Official 511 live" : "Official 511 partial";
      approachState.className = "approach-state is-live";
      const summary = payload.summary || {};
      approachSummary.textContent = `${summary.event_count || 0} matching corridor event${summary.event_count === 1 ? "" : "s"} and ${summary.camera_count || 0} camera${summary.camera_count === 1 ? "" : "s"} were returned by the connected official 511 feeds. These are last-mile context, not inputs to the bridge recommendation.`;
      const events = Array.isArray(payload.events) ? payload.events.slice(0, 3) : [];
      approachEvents.innerHTML = events.length ? events.map((event) => `<div class="approach-event"><strong>${escapeHtml(event.full_closure ? "Full closure · " : "")}${escapeHtml(event.roadway || event.provider)}</strong><span>${escapeHtml(event.description || event.location || "Official corridor event")}</span><span>${escapeHtml(event.provider)}</span></div>`).join("") : `<div class="approach-event"><strong>No matching corridor events returned</strong><span>This only describes the connected feeds and filtered corridor; it is not a guarantee of clear roads.</span></div>`;
      if (statusNode) { statusNode.className = ""; statusNode.innerHTML = `<strong>511 approach context</strong>${payload.complete ? "New York + Ontario available" : "Partial official feed available"}`; }
      return;
    }
    approachState.textContent = payload?.configured ? "511 unavailable" : "511 key-gated";
    approachState.className = "approach-state";
    approachSummary.textContent = payload?.configured
      ? "A configured 511 source did not return usable data. The bridge decision remains independent; use the official links before committing to an approach."
      : "The structured 511 adapter is built but the developer feeds are not configured on this deployment. Use the official 511 and NITTEC links for approach traffic until keys are connected.";
    approachEvents.innerHTML = `<div class="approach-event"><strong>No invented approach estimate</strong><span>The product will not scrape NITTEC or turn an unavailable keyed feed into a made-up travel-time claim.</span></div>`;
    if (statusNode) statusNode.innerHTML = `<strong>511 approach context</strong>${payload?.configured ? "Configured but unavailable" : "Developer feed not configured"}`;
  }

  function renderApproachFailure() {
    approachState.textContent = "Approach check failed";
    approachState.className = "approach-state";
    approachSummary.textContent = "The optional approach-context endpoint failed. This does not change the border-crossing recommendation; use the official 511 and NITTEC links below.";
    approachEvents.innerHTML = `<div class="approach-event"><strong>Approach evidence unavailable</strong><span>No route claim is being inferred from the failure.</span></div>`;
    const statusNode = $("approachSourceStatus");
    if (statusNode) statusNode.innerHTML = "<strong>511 approach context</strong>Unavailable";
  }

  function renderFailure(error) {
    decisionState.textContent = "Live data unavailable";
    decisionState.className = "decision-state is-stop";
    decisionHeadline.textContent = "Current crossing comparison cannot be determined";
    decisionReason.textContent = "The live decision endpoint failed. Do not infer a fastest bridge from this page right now; static eligibility remains valid.";
    proofHeadline.textContent = "There is no defensible live comparison";
    proofText.textContent = "The interpretation layer does not fill missing evidence with a guess. Use the official source links and static crossing rules.";
    liveDot.className = "live-dot is-degraded";
    ribbonStatus.textContent = "Live crossing data is temporarily unavailable.";
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
    decisionHeadline.textContent = "Checking official crossing data…";
    liveDot.className = "live-dot is-loading";
    ribbonStatus.textContent = "Checking official border reports…";
    try {
      const response = await fetch(`/api/niagara-border-crossings?${queryString()}`, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const payload = await response.json();
      if (requestId !== state.requestId) return;
      renderDecision(payload);
      renderInterpretation(payload);
      renderWeather(payload);
      renderSources(payload);
      renderEligibility(payload);
      if (track && typeof window.va === "function") {
        window.va("event", { name: "niagara_crossing_decision", data: { direction: state.direction, traveler: state.traveler, preferred: state.preferred, state: payload.decision?.state, recommended: payload.decision?.recommended_id } });
      }
    } catch (error) {
      if (requestId !== state.requestId) return;
      renderFailure(error);
    }
  }

  async function loadApproachContext() {
    try {
      const response = await fetch("/api/niagara-approach-context", { headers: { accept: "application/json" } });
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
  }

  function readInitialState() {
    const params = new URLSearchParams(window.location.search);
    if (["to_canada", "to_us"].includes(params.get("direction"))) state.direction = params.get("direction");
    if (["passenger", "nexus", "commercial", "pedestrian", "bicycle", "bus", "tow"].includes(params.get("traveler"))) state.traveler = params.get("traveler");
    if (["peace", "rainbow", "whirlpool", "lewiston-queenston"].includes(params.get("preferred"))) state.preferred = params.get("preferred");
    state.oversize = state.traveler === "commercial" && params.get("oversize") === "1";
  }

  directionButtons.forEach((button) => button.addEventListener("click", () => { state.direction = button.dataset.direction; applyControls(); refresh(true); }));
  travelerSelect.addEventListener("change", () => { state.traveler = travelerSelect.value; if (state.traveler !== "commercial") state.oversize = false; applyControls(); refresh(true); });
  preferredSelect.addEventListener("change", () => { state.preferred = preferredSelect.value; refresh(true); });

  readInitialState();
  applyControls();
  refresh(false);
  loadApproachContext();
})();
