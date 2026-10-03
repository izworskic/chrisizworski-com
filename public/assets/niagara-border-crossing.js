(() => {
  "use strict";

  const state = {
    direction: "to_canada",
    traveler: "passenger",
    preferred: "rainbow",
    requestId: 0,
  };

  const directionButtons = [...document.querySelectorAll("[data-direction]")];
  const travelerSelect = document.getElementById("travelerSelect");
  const preferredSelect = document.getElementById("preferredSelect");
  const crossingGrid = document.getElementById("crossingGrid");
  const decisionState = document.getElementById("decisionState");
  const decisionHeadline = document.getElementById("decisionHeadline");
  const decisionReason = document.getElementById("decisionReason");
  const freshnessTime = document.getElementById("freshnessTime");
  const ribbonStatus = document.getElementById("ribbonStatus");
  const ribbonTime = document.getElementById("ribbonTime");
  const liveDot = document.getElementById("liveDot");
  const weatherAlerts = document.getElementById("weatherAlerts");
  const sourceStatus = document.getElementById("sourceStatus");
  const eligibilityGrid = document.getElementById("eligibilityGrid");

  const labelForState = {
    USE_PRIMARY_CROSSING: "Use normal bridge",
    ALTERNATE_CROSSING_BETTER: "Alternate better",
    COMPARABLE_OPTIONS: "Comparable",
    INSUFFICIENT_DATA: "Uncertain",
  };

  const crossingOrder = ["peace", "rainbow", "whirlpool", "lewiston-queenston"];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatAge(freshness) {
    if (!freshness) return "No live timestamp";
    if (freshness.age_minutes == null) return "Timestamp unavailable";
    if (freshness.age_minutes < 1) return "Updated just now";
    if (freshness.age_minutes === 1) return "Updated 1 min ago";
    return `Updated ${freshness.age_minutes} min ago`;
  }

  function formatChecked(iso) {
    if (!iso) return "Unavailable";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Unavailable";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function sourceName(source) {
    return source?.name || "Authoritative source unavailable";
  }

  function resultKicker(result, recommendedId) {
    if (!result.eligibility?.eligible) return "Not eligible";
    if (result.state === "CROSSING_CLOSED") return "Closed";
    if (result.state === "SOURCE_CONFLICT") return "Official sources conflict";
    if (result.state === "SOURCE_STALE") return "Wait too old to recommend";
    if (result.state === "SOURCE_UNAVAILABLE" || result.state === "INSUFFICIENT_DATA") return "Current wait unavailable";
    if (result.id === recommendedId) return "Recommended";
    return "Eligible option";
  }

  function renderResult(result, recommendedId) {
    const classNames = ["crossing-result"];
    if (result.id === recommendedId) classNames.push("is-recommended");
    if (!result.eligibility?.eligible) classNames.push("is-ineligible");
    if (!result.usable_for_recommendation && result.id !== recommendedId) classNames.push("is-unavailable");

    const wait =
      Number.isFinite(result.wait_minutes)
        ? result.wait_minutes === 0
          ? "No delay"
          : `${result.wait_minutes} min`
        : result.state === "CROSSING_CLOSED"
          ? "Closed"
          : result.state === "CROSSING_INELIGIBLE"
            ? "Not eligible"
            : "Not current";

    const waitClass =
      Number.isFinite(result.wait_minutes) && result.wait_minutes >= 30
        ? "wait-value is-long"
        : Number.isFinite(result.wait_minutes)
          ? "wait-value"
          : "wait-value is-unknown";

    const buffer =
      result.diversion_buffer_minutes === 0
        ? "Normal route"
        : result.diversion_buffer_minutes >= 900
          ? "Detour not scored"
          : `${result.diversion_buffer_minutes} min guardrail`;

    const chips = [
      buffer,
      result.freshness ? formatAge(result.freshness) : null,
      Number.isFinite(result.lanes_open) ? `${result.lanes_open} lane${result.lanes_open === 1 ? "" : "s"} open` : null,
    ].filter(Boolean);

    const note =
      result.note ||
      (!result.eligibility?.eligible
        ? result.eligibility.reason
        : result.route || "");

    return `<article class="${classNames.join(" ")}" data-crossing="${escapeHtml(result.id)}">
      <p class="result-kicker">${escapeHtml(resultKicker(result, recommendedId))}</p>
      <h4>${escapeHtml(result.short_name || result.name)}</h4>
      <strong class="${waitClass}">${escapeHtml(wait)}</strong>
      <p class="wait-detail">${escapeHtml(result.route || "")}</p>
      <p class="source-line">${escapeHtml(sourceName(result.source))}</p>
      <p class="source-line">${escapeHtml(note || "")}</p>
      <div class="metric-row">${chips.map((chip) => `<span class="metric-chip">${escapeHtml(chip)}</span>`).join("")}</div>
    </article>`;
  }

  function stateTone(value) {
    if (value === "INSUFFICIENT_DATA") return "is-stop";
    if (value === "COMPARABLE_OPTIONS") return "is-caution";
    return "";
  }

  function renderDecision(payload) {
    const decision = payload.decision;
    decisionState.textContent = labelForState[decision.state] || decision.state.replaceAll("_", " ");
    decisionState.className = `decision-state ${stateTone(decision.state)}`.trim();
    decisionHeadline.textContent = decision.headline;
    decisionReason.textContent = decision.reason;
    freshnessTime.textContent = formatChecked(payload.fetched_at);

    const ordered = [...decision.results].sort(
      (a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id),
    );
    crossingGrid.innerHTML = ordered.map((result) => renderResult(result, decision.recommended_id)).join("");

    liveDot.className = `live-dot ${payload.degraded ? "is-degraded" : "is-live"}`;
    ribbonStatus.textContent = payload.degraded
      ? "Live comparison is degraded; static crossing rules are still active."
      : "Official crossing sources checked.";
    ribbonTime.textContent = `Checked ${formatChecked(payload.fetched_at)}`;
  }

  function renderWeather(payload) {
    const alerts = Array.isArray(payload?.warnings?.weather) ? payload.warnings.weather : [];
    if (!alerts.length) {
      weatherAlerts.innerHTML = '<p class="all-clear">No active official weather alerts were returned for the Niagara crossing corridor.</p>';
      return;
    }
    weatherAlerts.innerHTML = `<ul class="alert-list">${alerts
      .slice(0, 8)
      .map((alert) => {
        const headline = alert.headline || alert.event || "Weather alert";
        const detail = [alert.severity, alert.area || alert.region, alert.impact].filter(Boolean).join(" · ");
        return `<li class="alert-item"><strong>${escapeHtml(headline)}</strong><span>${escapeHtml(detail || alert.description || "See the issuing weather authority for details.")}</span></li>`;
      })
      .join("")}</ul>`;
  }

  function renderSources(payload) {
    const sources = payload?.sources || {};
    const entries = [
      ["CBP · U.S.-bound", sources.to_us_waits?.available],
      ["CBSA · Canada-bound", sources.to_canada_waits?.available],
      ["NFBC operations", sources.nfbc_operations?.available],
      ["Peace Bridge operations", sources.peace_operations?.available],
      ["NWS alerts", sources.nws_weather?.available],
      ["Environment Canada alerts", sources.eccc_weather?.available],
      ["511 structured incidents", sources.road_conditions?.integrated],
    ];
    sourceStatus.innerHTML = entries
      .map(
        ([name, available]) =>
          `<div class="${available ? "" : "is-down"}"><strong>${escapeHtml(name)}</strong>${available ? "Available" : "Not integrated / unavailable"}</div>`,
      )
      .join("");
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
    eligibilityGrid.innerHTML = ordered
      .map((crossing) => {
        const restrictions = (crossing.restrictions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        return `<article class="eligibility-card">
          <h3>${escapeHtml(crossing.short_name || crossing.name)}</h3>
          <p><strong>Allowed:</strong> ${escapeHtml(humanEligibility(crossing))}</p>
          <p><strong>Hours:</strong> ${escapeHtml(crossing.hours)}</p>
          <p><strong>Toll:</strong> ${escapeHtml(crossing.toll?.[state.direction] || "Check operator")}</p>
          ${crossing.nexus_required ? "<p><strong>NEXUS required.</strong></p>" : ""}
          ${restrictions ? `<ul>${restrictions}</ul>` : ""}
        </article>`;
      })
      .join("");
  }

  function renderFailure(error) {
    decisionState.textContent = "Live data unavailable";
    decisionState.className = "decision-state is-stop";
    decisionHeadline.textContent = "Current crossing comparison cannot be determined";
    decisionReason.textContent =
      "The live endpoint failed. Do not infer a fastest bridge from this page right now; static eligibility below remains valid.";
    crossingGrid.querySelectorAll(".crossing-result").forEach((card) => card.classList.add("is-unavailable"));
    liveDot.className = "live-dot is-degraded";
    ribbonStatus.textContent = "Live crossing data is temporarily unavailable.";
    ribbonTime.textContent = "";
    console.error("[niagara-border-crossing] live refresh failed", error);
  }

  function queryString() {
    const params = new URLSearchParams({
      direction: state.direction,
      traveler: state.traveler,
      preferred: state.preferred,
    });
    return params.toString();
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("direction", state.direction);
    url.searchParams.set("traveler", state.traveler);
    url.searchParams.set("preferred", state.preferred);
    window.history.replaceState(null, "", url);
  }

  async function refresh(track = false) {
    const requestId = ++state.requestId;
    syncUrl();
    decisionHeadline.textContent = "Checking official crossing data…";
    liveDot.className = "live-dot is-loading";
    ribbonStatus.textContent = "Checking official border reports…";

    try {
      const response = await fetch(`/api/niagara-border-crossings?${queryString()}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const payload = await response.json();
      if (requestId !== state.requestId) return;

      renderDecision(payload);
      renderWeather(payload);
      renderSources(payload);
      renderEligibility(payload);

      if (track && typeof window.va === "function") {
        window.va("event", {
          name: "niagara_crossing_decision",
          data: {
            direction: state.direction,
            traveler: state.traveler,
            preferred: state.preferred,
            state: payload.decision?.state,
            recommended: payload.decision?.recommended_id,
          },
        });
      }
    } catch (error) {
      if (requestId !== state.requestId) return;
      renderFailure(error);
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
    const direction = params.get("direction");
    const traveler = params.get("traveler");
    const preferred = params.get("preferred");
    if (["to_canada", "to_us"].includes(direction)) state.direction = direction;
    if (["passenger", "nexus", "commercial", "pedestrian", "bicycle", "bus", "tow"].includes(traveler)) {
      state.traveler = traveler;
    }
    if (["peace", "rainbow", "whirlpool", "lewiston-queenston"].includes(preferred)) {
      state.preferred = preferred;
    }
  }

  directionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.direction = button.dataset.direction;
      applyControls();
      refresh(true);
    });
  });

  travelerSelect.addEventListener("change", () => {
    state.traveler = travelerSelect.value;
    refresh(true);
  });

  preferredSelect.addEventListener("change", () => {
    state.preferred = preferredSelect.value;
    refresh(true);
  });

  readInitialState();
  applyControls();
  refresh(false);
})();
