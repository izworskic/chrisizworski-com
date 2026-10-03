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
    return labels[state.vehicle] || "Traveler";
  }

  function freshnessLabel(wait) {
    var freshness = wait && wait.freshness;
    if (!freshness) return "Freshness unknown";
    if (freshness.state === "current") return freshness.age_minutes == null ? "Current" : "Current · " + freshness.age_minutes + "m old";
    if (freshness.state === "stale") return "Stale · " + freshness.age_minutes + "m old";
    if (freshness.state === "expired") return "Expired · " + freshness.age_minutes + "m old";
    return "Freshness unknown";
  }

  function decisionClass(decision) {
    if (!decision) return "";
    if (["INSUFFICIENT_DATA"].includes(decision.state)) return " is-danger";
    if (["COMPARABLE_OPTIONS", "BEST_CURRENT_CROSSING"].includes(decision.state)) return " is-warning";
    return "";
  }

  function renderDecision(payload) {
    var decision = payload.decision;
    byId("comparisonEyebrow").textContent = directionLabel() + " · " + vehicleLabel();
    byId("decisionState").className = "decision-state" + decisionClass(decision);
    byId("decisionState").textContent = String(decision.state || "CURRENT DECISION").replace(/_/g, " ");
    byId("comparisonHeadline").textContent = decision.headline || "Current comparison unavailable";
    byId("comparisonNote").textContent = decision.note || "Use the official crossing links below.";
    byId("netAdvantage").textContent = Number.isFinite(decision.advantage_minutes) && decision.advantage_minutes > 0
      ? "Net advantage after diversion buffer: about " + decision.advantage_minutes + " min"
      : "";
    byId("freshnessTime").textContent = new Date(payload.fetched_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function renderCrossings(payload) {
    var crossings = new Map(payload.crossings.map(function (crossing) { return [crossing.id, crossing]; }));
    var recommendedId = payload.decision.recommended_id;
    byId("niagaraCrossingGrid").innerHTML = payload.decision.results.map(function (result) {
      var crossing = crossings.get(result.id) || {};
      var classes = ["crossing-result"];
      if (result.id === recommendedId) classes.push("is-fastest");
      if (!result.eligible) classes.push("is-ineligible");
      if (result.source_conflict) classes.push("is-conflict");
      if (!result.comparable && result.eligible) classes.push("is-unavailable");

      var waitText = "Not comparable";
      var kicker = "Eligible · live comparison unavailable";
      if (!result.eligible) {
        waitText = "Not eligible";
        kicker = "Eliminated by crossing rules";
      } else if (result.closed) {
        waitText = "Closed";
        kicker = "Do not use this crossing";
      } else if (result.source_conflict) {
        waitText = "Source conflict";
        kicker = "Official observations disagree";
      } else if (result.wait && result.wait.available) {
        waitText = result.wait.display || (result.wait.wait_minutes + " min");
        kicker = result.wait.context_only ? "Operator context only" : result.id === recommendedId ? "Current recommendation" : "Current eligible option";
      }

      var sourceName = state.direction === "to_us"
        ? crossing.waits && crossing.waits.to_us && crossing.waits.to_us.source_name
        : crossing.waits && crossing.waits.to_canada && crossing.waits.to_canada.source_name;
      if (result.wait && result.wait.source_name) sourceName = result.wait.source_name;
      var detail = result.eligibility_reason || crossing.route || "Niagara River crossing";
      var buffer = result.diversion_buffer_minutes === 0
        ? "On your selected approach"
        : "Conservative switch buffer: " + result.diversion_buffer_minutes + " min";

      return '<article class="' + classes.join(" ") + '" data-crossing-result="' + esc(result.id) + '">' +
        '<p class="result-kicker">' + esc(kicker) + '</p>' +
        '<h4>' + esc(result.name) + '</h4>' +
        '<strong class="wait-value' + (!result.wait || !result.wait.available ? ' is-unknown' : '') + '">' + esc(waitText) + '</strong>' +
        '<p class="wait-detail">' + esc(detail) + '</p>' +
        '<div class="result-meta">' +
          '<span><strong>Route:</strong> ' + esc(crossing.route || "—") + '</span>' +
          '<span><strong>Diversion:</strong> ' + esc(buffer) + '</span>' +
          '<span><strong>Data:</strong> ' + esc(freshnessLabel(result.wait)) + '</span>' +
        '</div>' +
        '<p class="source-line">' + esc(sourceName || crossing.operator || "Official source") + '</p>' +
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
      byId("weatherWarnings").innerHTML = '<div class="all-clear">No active NWS alert returned for the Buffalo or Niagara approach points.</div>';
    } else {
      byId("weatherWarnings").innerHTML = '<ul class="alert-list">' + alerts.slice(0, 6).map(function (alert) {
        return '<li class="alert-item"><strong>' + esc(alert.headline) + '</strong><span>' + esc(alert.region) + ' · ' + esc(alert.severity) + '</span></li>';
      }).join("") + '</ul>';
    }

    var crossing = payload.crossings.find(function (item) { return item.id === state.approach_id; });
    var events = crossing && crossing.approach_traffic || [];
    if (!events.length) {
      byId("approachEvents").innerHTML = '<div class="all-clear">No official approach events are available in the configured feeds for this crossing.</div>';
    } else {
      byId("approachEvents").innerHTML = '<ul class="alert-list">' + events.map(function (event) {
        return '<li class="alert-item"><strong>' + esc(event.roadway || event.event_type || "Road event") + '</strong><span>' + esc(event.description || "Official road event") + '</span></li>';
      }).join("") + '</ul>';
    }
  }

  function renderSources(payload) {
    var sources = payload.sources || {};
    byId("sourceStatusGrid").innerHTML = Object.keys(sources).map(function (key) {
      var source = sources[key] || {};
      var status = source.available ? "Available" : source.configured === false ? "Not configured" : "Unavailable";
      return '<div class="source-status"><strong>' + esc(source.name || key) + '</strong><span>' + esc(status) + '</span>' +
        (source.note ? '<div>' + esc(source.note) + '</div>' : '') +
        (source.url ? '<div><a href="' + esc(source.url) + '" target="_blank" rel="noopener">Official source</a></div>' : '') +
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
    var resultMap = new Map(payload.decision.results.map(function (result) { return [result.id, result]; }));
    payload.crossings.forEach(function (crossing) {
      var point = MAP_POINTS[crossing.id];
      if (!point) return;
      var result = resultMap.get(crossing.id) || {};
      var status = !result.eligible ? "Not eligible" : result.closed ? "Closed" : result.wait && result.wait.available ? (result.wait.display || "Wait reported") : "No comparable live wait";
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
    byId("ribbonStatus").textContent = payload.degraded ? "Official wait feeds partially degraded" : "Official Niagara wait feeds connected";
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
