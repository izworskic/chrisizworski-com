(function () {
  "use strict";

  var API = "/api/niagara-border-crossings";
  var state = {
    direction: "to_canada",
    vehicle: "passenger",
    program: "none",
    approach_id: "peace",
    oversize: false,
    controller: null,
    payload: null,
    map: null,
    markers: [],
  };

  var MAP_POINTS = {
    peace: [42.9067, -78.9056],
    rainbow: [43.0903, -79.0672],
    whirlpool: [43.1087, -79.0584],
    "lewiston-queenston": [43.1532, -79.0453],
  };

  function byId(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function queryString() {
    var params = new URLSearchParams({
      direction: state.direction,
      vehicle: state.vehicle,
      program: state.program,
      approach_id: state.approach_id,
    });
    if (state.oversize) params.set("oversize", "1");
    return params.toString();
  }

  function directionLabel() {
    return state.direction === "to_us" ? "To United States" : "To Canada";
  }

  function vehicleLabel() {
    var labels = {
      passenger: "Passenger vehicle",
      commercial: "Commercial truck",
      pedestrian: "Pedestrian",
      bicycle: "Bicycle",
      bus: "Bus",
      tow: "RV / vehicle in tow",
    };
    var base = labels[state.vehicle] || "Traveler";
    if (state.program === "nexus") return base + " · NEXUS";
    if (state.program === "global_entry") return base + " · Global Entry";
    return base;
  }

  function freshnessLabel(freshness) {
    if (!freshness) return "Freshness not applicable";
    if (freshness.state === "fresh") return freshness.age_minutes == null ? "Fresh" : "Fresh · " + freshness.age_minutes + "m old";
    if (freshness.state === "stale") return "Stale · " + freshness.age_minutes + "m old";
    if (freshness.state === "expired") return "Expired · " + freshness.age_minutes + "m old";
    if (freshness.state === "unavailable") return "Unavailable";
    return "Freshness unknown";
  }

  function decisionClass(decision) {
    if (!decision) return "";
    if (decision.state === "INSUFFICIENT_DATA") return " is-danger";
    if (decision.state === "COMPARABLE_OPTIONS") return " is-warning";
    return "";
  }

  function renderDecision(payload) {
    var decision = payload.decision || {};
    byId("comparisonEyebrow").textContent = directionLabel() + " · " + vehicleLabel();
    byId("decisionState").className = "decision-state" + decisionClass(decision);
    byId("decisionState").textContent = String(decision.state || "CURRENT DECISION").replace(/_/g, " ");
    byId("comparisonHeadline").textContent = decision.headline || "Current comparison unavailable";
    byId("comparisonNote").textContent = decision.reason || "Use the official crossing links below.";
    byId("netAdvantage").textContent = Number.isFinite(decision.net_benefit_minutes) && decision.net_benefit_minutes > 0
      ? "Net advantage after diversion buffer: about " + decision.net_benefit_minutes + " min"
      : "";
    byId("freshnessTime").textContent = new Date(payload.fetched_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function resultPresentation(result, recommendedId) {
    var eligible = Boolean(result.eligibility && result.eligibility.eligible);
    if (!eligible || result.state === "CROSSING_INELIGIBLE") {
      return { wait: "Not eligible", kicker: "Eliminated by crossing rules", unknown: true };
    }
    if (result.state === "RESTRICTION_ACTIVE") {
      return { wait: "Approval required", kicker: "Restriction requires operator review", unknown: true };
    }
    if (result.state === "CROSSING_CLOSED") {
      return { wait: "Closed", kicker: "Do not use this crossing", unknown: true };
    }
    if (result.state === "SOURCE_CONFLICT") {
      return { wait: "Source conflict", kicker: "Official observations disagree", unknown: true };
    }
    if (result.context_only || result.state === "OPERATOR_CONTEXT_ONLY") {
      return { wait: result.display || "Operator context", kicker: "Operator context only · not used to justify a detour", unknown: false };
    }
    if (result.state === "SOURCE_STALE") {
      return { wait: result.display || "Stale", kicker: "Wait is too old for recommendation logic", unknown: false };
    }
    if (Number.isFinite(result.wait_minutes)) {
      return {
        wait: result.display || (result.wait_minutes === 0 ? "No delay" : result.wait_minutes + " min"),
        kicker: result.id === recommendedId ? "Current recommendation" : "Current eligible option",
        unknown: false,
      };
    }
    return { wait: "Not comparable", kicker: "Eligible · live comparison unavailable", unknown: true };
  }

  function renderCrossings(payload) {
    var crossings = new Map(payload.crossings.map(function (crossing) { return [crossing.id, crossing]; }));
    var recommendedId = payload.decision && payload.decision.recommended_id;
    byId("niagaraCrossingGrid").innerHTML = (payload.decision.results || []).map(function (result) {
      var crossing = crossings.get(result.id) || {};
      var eligible = Boolean(result.eligibility && result.eligibility.eligible);
      var classes = ["crossing-result"];
      if (result.id === recommendedId) classes.push("is-fastest");
      if (!eligible) classes.push("is-ineligible");
      if (result.state === "SOURCE_CONFLICT") classes.push("is-conflict");
      if (!result.usable_for_recommendation && eligible) classes.push("is-unavailable");

      var presentation = resultPresentation(result, recommendedId);
      var detail = result.note || (result.eligibility && result.eligibility.reason) || crossing.route || "Niagara River crossing";
      var buffer = result.diversion_buffer_minutes === 0
        ? "On your selected approach"
        : "Conservative switch buffer: " + result.diversion_buffer_minutes + " min";
      var sourceName = result.source && result.source.name || crossing.operator || "Official source";

      return '<article class="' + classes.join(" ") + '" data-crossing-result="' + esc(result.id) + '">' +
        '<p class="result-kicker">' + esc(presentation.kicker) + '</p>' +
        '<h4>' + esc(result.name) + '</h4>' +
        '<strong class="wait-value' + (presentation.unknown ? ' is-unknown' : '') + '">' + esc(presentation.wait) + '</strong>' +
        '<p class="wait-detail">' + esc(detail) + '</p>' +
        '<div class="result-meta">' +
          '<span><strong>Route:</strong> ' + esc(crossing.route || result.route || "—") + '</span>' +
          '<span><strong>Diversion:</strong> ' + esc(buffer) + '</span>' +
          '<span><strong>Data:</strong> ' + esc(freshnessLabel(result.freshness)) + '</span>' +
        '</div>' +
        '<p class="source-line">' + esc(sourceName) + '</p>' +
        '<div class="result-actions"><a href="' + esc(crossing.traffic_url || crossing.operator_url || "#sources") + '" target="_blank" rel="noopener">Official traffic</a>' +
        '<button class="link-button" type="button" data-map-crossing="' + esc(result.id) + '">Show on map</button></div>' +
      '</article>';
    }).join("");

    document.querySelectorAll("[data-map-crossing]").forEach(function (button) {
      button.addEventListener("click", function () { focusMap(button.getAttribute("data-map-crossing")); });
    });
  }

  function yesNo(value) {
    return value ? '<span class="yes">Yes</span>' : '<span class="no">No</span>';
  }

  function renderMatrix(payload) {
    byId("eligibilityMatrix").innerHTML = payload.crossings.map(function (crossing) {
      return '<article class="matrix-card"><h3>' + esc(crossing.short_name || crossing.name) + '</h3><ul class="matrix-list">' +
        '<li>Passenger ' + yesNo(crossing.eligibility && crossing.eligibility.passenger) + '</li>' +
        '<li>Commercial truck ' + yesNo(crossing.eligibility && crossing.eligibility.commercial) + '</li>' +
        '<li>Pedestrian ' + yesNo(crossing.eligibility && crossing.eligibility.pedestrian) + '</li>' +
        '<li>Bicycle ' + yesNo(crossing.eligibility && crossing.eligibility.bicycle) + '</li>' +
        '<li>Bus ' + yesNo(crossing.eligibility && crossing.eligibility.bus) + '</li>' +
        '<li>Trailer / tow ' + yesNo(crossing.eligibility && crossing.eligibility.tow) + '</li>' +
        '<li>NEXUS required ' + yesNo(crossing.nexus_required) + '</li>' +
        '<li><strong>Hours:</strong> ' + esc(crossing.hours) + '</li>' +
      '</ul></article>';
    }).join("");
  }

  function renderWarnings(payload) {
    var alerts = payload.warnings && payload.warnings.weather || [];
    if (!alerts.length) {
      byId("weatherWarnings").innerHTML = '<div class="all-clear">No active NWS or Environment Canada alert was returned for the Niagara crossing area.</div>';
    } else {
      byId("weatherWarnings").innerHTML = '<ul class="alert-list">' + alerts.slice(0, 8).map(function (alert) {
        var region = alert.region ? alert.region + " · " : "";
        return '<li class="alert-item"><strong>' + esc(alert.headline) + '</strong><span>' + esc(region + (alert.severity || alert.source || "Official weather alert")) + '</span></li>';
      }).join("") + '</ul>';
    }

    byId("approachEvents").innerHTML =
      '<div class="source-status"><strong>Official approach systems</strong>' +
      '<div>V1 does not silently scrape key-gated 511 APIs or convert camera imagery into a traffic estimate.</div>' +
      '<div class="result-actions"><a href="https://www.nittec.org/" target="_blank" rel="noopener">NITTEC</a>' +
      '<a href="https://511ny.org/" target="_blank" rel="noopener">511NY</a>' +
      '<a href="https://511on.ca/" target="_blank" rel="noopener">Ontario 511</a></div></div>';
  }

  function renderSources(payload) {
    var sources = payload.sources || {};
    byId("sourceStatusGrid").innerHTML = Object.keys(sources).map(function (key) {
      var source = sources[key] || {};
      var status = source.available === true ? "Available" : source.integrated === false ? "Official links only" : "Unavailable";
      var url = source.url || (Array.isArray(source.urls) ? source.urls[0] : null);
      return '<div class="source-status"><strong>' + esc(source.name || key) + '</strong><span>' + esc(status) + '</span>' +
        (source.role ? '<div>' + esc(source.role) + '</div>' : '') +
        (source.reason ? '<div>' + esc(source.reason) + '</div>' : '') +
        (url ? '<div><a href="' + esc(url) + '" target="_blank" rel="noopener">Official source</a></div>' : '') +
      '</div>';
    }).join("");
  }

  function initMap() {
    var el = byId("niagaraMap");
    if (!el) return;
    if (!window.L) {
      el.innerHTML = '<div class="map-fallback">Map tiles are unavailable. The crossing cards still show the conservative bridge-switch buffers used by the decision engine.</div>';
      return;
    }
    state.map = window.L.map(el, { scrollWheelZoom: false }).setView([43.04, -79.01], 10);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(state.map);
  }

  function renderMap(payload) {
    if (!state.map || !window.L) return;
    state.markers.forEach(function (marker) { marker.remove(); });
    state.markers = [];
    var resultMap = new Map((payload.decision.results || []).map(function (result) { return [result.id, result]; }));
    payload.crossings.forEach(function (crossing) {
      var point = MAP_POINTS[crossing.id];
      if (!point) return;
      var result = resultMap.get(crossing.id) || {};
      var eligible = Boolean(result.eligibility && result.eligibility.eligible);
      var status = !eligible ? "Not eligible" : result.state === "CROSSING_CLOSED" ? "Closed" : Number.isFinite(result.wait_minutes) ? (result.display || "Wait reported") : "No comparable live wait";
      var marker = window.L.marker(point).addTo(state.map).bindPopup(
        '<strong>' + esc(crossing.name) + '</strong><br>' + esc(status) + '<br>' + esc(crossing.route || "")
      );
      marker.__crossingId = crossing.id;
      state.markers.push(marker);
    });
  }

  function focusMap(id) {
    if (!state.map) return;
    var point = MAP_POINTS[id];
    if (!point) return;
    state.map.setView(point, 12);
    var marker = state.markers.find(function (item) { return item.__crossingId === id; });
    if (marker) marker.openPopup();
    byId("mapSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render(payload) {
    state.payload = payload;
    renderDecision(payload);
    renderCrossings(payload);
    renderMatrix(payload);
    renderWarnings(payload);
    renderSources(payload);
    renderMap(payload);
    byId("ribbonStatus").textContent = payload.degraded ? "Official sources partially degraded" : "Official Niagara sources connected";
    byId("liveDot").className = "live-dot " + (payload.degraded ? "is-degraded" : "is-live");
    byId("ribbonTime").textContent = "Checked " + new Date(payload.fetched_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function renderError(error) {
    byId("comparisonHeadline").textContent = "Live comparison is temporarily unavailable";
    byId("comparisonNote").textContent = "Static crossing eligibility below remains useful. Use the official source links before committing to a bridge.";
    byId("decisionState").className = "decision-state is-danger";
    byId("decisionState").textContent = "SOURCE UNAVAILABLE";
    byId("ribbonStatus").textContent = "Live refresh failed";
    byId("liveDot").className = "live-dot is-degraded";
    console.error("[niagara-border]", error);
  }

  async function refresh() {
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    byId("comparisonHeadline").textContent = "Checking authoritative crossing data…";
    byId("comparisonNote").textContent = "Eligibility is applied before any wait-time comparison.";
    try {
      var response = await fetch(API + "?" + queryString(), { signal: state.controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("API returned " + response.status);
      render(await response.json());
    } catch (error) {
      if (error && error.name === "AbortError") return;
      renderError(error);
    }
  }

  function wireControls() {
    document.querySelectorAll("[data-direction]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.direction = button.getAttribute("data-direction");
        document.querySelectorAll("[data-direction]").forEach(function (item) {
          var selected = item === button;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        refresh();
      });
    });
    byId("vehicleSelect").addEventListener("change", function (event) { state.vehicle = event.target.value; refresh(); });
    byId("programSelect").addEventListener("change", function (event) { state.program = event.target.value; refresh(); });
    byId("approachSelect").addEventListener("change", function (event) { state.approach_id = event.target.value; refresh(); });
    byId("oversizeCheck").addEventListener("change", function (event) { state.oversize = event.target.checked; refresh(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireControls();
    initMap();
    refresh();
    window.setInterval(refresh, 60000);
  });
})();
