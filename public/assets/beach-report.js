(function () {
  "use strict";

  var state = {
    data: null,
    beaches: [],
    filtered: [],
    query: "",
    lake: "all",
    trait: "all",
    sort: "score",
    userLocation: null,
    map: null,
    markers: [],
  };

  var pageType = document.body.dataset.beachReportPage || "explorer";
  var beachSlug = document.body.dataset.beachSlug || "";

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function finite(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  }

  function round(value) {
    return finite(value) ? Math.round(Number(value)) : null;
  }

  function formatDate(value, options) {
    if (!value) return "Unknown";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat("en-US", options || {
      timeZone: "America/Detroit",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function weatherLabel(code) {
    var value = Number(code);
    if (value === 0) return "Clear";
    if (value === 1) return "Mostly clear";
    if (value === 2) return "Partly cloudy";
    if (value === 3) return "Cloudy";
    if (value === 45 || value === 48) return "Foggy";
    if (value >= 51 && value <= 57) return "Drizzle";
    if (value >= 61 && value <= 67) return "Rain";
    if (value >= 71 && value <= 77) return "Snow";
    if (value >= 80 && value <= 82) return "Rain showers";
    if (value >= 85 && value <= 86) return "Snow showers";
    if (value >= 95) return "Thunderstorms";
    return "Forecast available";
  }

  function scoreText(beach) {
    return beach.rating && beach.rating.score != null ? String(beach.rating.score) : "—";
  }

  function level(beach) {
    return beach.rating && beach.rating.level ? beach.rating.level : "unknown";
  }

  function track(name, data) {
    if (typeof window.va === "function") {
      window.va("event", { name: name, data: data || {} });
    }
  }

  function haversineMiles(lat1, lng1, lat2, lng2) {
    var toRadians = function (degrees) { return degrees * Math.PI / 180; };
    var dLat = toRadians(lat2 - lat1);
    var dLng = toRadians(lng2 - lng1);
    var first = Math.sin(dLat / 2) * Math.sin(dLat / 2);
    var second = Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 3958.8 * 2 * Math.asin(Math.sqrt(first + second));
  }

  function formatMetric(value, suffix, fallback) {
    if (!finite(value)) return fallback || "Not available";
    var number = Number(value);
    var formatted = suffix.indexOf("ft") !== -1 ? number.toFixed(1).replace(/\.0$/, "") : String(Math.round(number));
    return formatted + suffix;
  }

  function facts(beach) {
    var today = beach.weather && beach.weather.today ? beach.weather.today : {};
    var lake = beach.lake_conditions || {};
    return [
      { label: "High", value: formatMetric(today.temperature_max_f, "°F", "—") },
      { label: "Water", value: lake.fresh ? formatMetric(lake.water_temp_f, "°F", "—") : "—" },
      { label: "Waves", value: lake.fresh ? formatMetric(lake.wave_height_ft, " ft", "—") : "—" },
    ];
  }

  function beachStatus(beach) {
    var quality = beach.water_quality || {};
    if (quality.state === "closure" || quality.state === "advisory") return quality.label;
    if (beach.hazards && beach.hazards.length) return beach.hazards[0].event || "Beach hazard in effect";
    return beach.rating && beach.rating.label ? beach.rating.label : "Conditions unavailable";
  }

  function beachCardHtml(beach) {
    var beachFacts = facts(beach);
    var distance = finite(beach.distance_miles)
      ? '<span class="condition-chip">' + Math.round(beach.distance_miles) + " mi away</span>"
      : "";
    return '<button class="beach-card" type="button" data-open-beach="' + escapeHtml(beach.slug) + '" aria-label="Open details for ' + escapeHtml(beach.name) + '">' +
      '<span class="beach-card-top"><span><span class="beach-card-title">' + escapeHtml(beach.name) + '</span><span class="beach-card-meta">' + escapeHtml(beach.region) + " · " + escapeHtml(beach.lake) + '</span></span>' +
      '<span class="mini-score" data-level="' + escapeHtml(level(beach)) + '" aria-label="Beach Day Score ' + escapeHtml(scoreText(beach)) + '">' + escapeHtml(scoreText(beach)) + '</span></span>' +
      '<span class="card-status">' + escapeHtml(beachStatus(beach)) + '</span>' +
      '<span class="card-facts">' + beachFacts.map(function (fact) {
        return '<span class="card-fact"><span>' + escapeHtml(fact.label) + '</span><strong>' + escapeHtml(fact.value) + '</strong></span>';
      }).join("") + '</span>' +
      '<span class="condition-chips">' + distance + (beach.traits || []).slice(0, 2).map(function (trait) {
        return '<span class="trait-chip">' + escapeHtml(trait) + '</span>';
      }).join("") + '</span></button>';
  }

  function dailyCardHtml(beach, index) {
    var today = beach.weather && beach.weather.today ? beach.weather.today : {};
    var lake = beach.lake_conditions || {};
    var chips = [
      weatherLabel(today.weather_code),
      finite(today.temperature_max_f) ? round(today.temperature_max_f) + "°F high" : null,
      lake.fresh && finite(lake.water_temp_f) ? round(lake.water_temp_f) + "°F water" : null,
      lake.fresh && finite(lake.wave_height_ft) ? lake.wave_height_ft + " ft waves" : null,
    ].filter(Boolean);
    return '<article class="daily-card"><span class="daily-rank">' + (index + 1) + '</span><h3 class="daily-title">' + escapeHtml(beach.name) + '</h3>' +
      '<div class="daily-meta">' + escapeHtml(beach.region) + " · " + escapeHtml(beach.lake) + '</div>' +
      '<div class="condition-chips">' + chips.map(function (chip) { return '<span class="condition-chip">' + escapeHtml(chip) + '</span>'; }).join("") + '</div>' +
      '<div class="score-row"><div class="score-value">' + escapeHtml(scoreText(beach)) + '<small>/100</small></div><div class="score-label">' + escapeHtml(beach.rating.label) + '</div></div>' +
      '<button class="button button-secondary" type="button" data-open-beach="' + escapeHtml(beach.slug) + '" style="margin-top:18px">See today\'s details</button></article>';
  }

  function dailyListHtml(beach, index) {
    var today = beach.weather && beach.weather.today ? beach.weather.today : {};
    var summary = [
      beach.region,
      finite(today.temperature_max_f) ? round(today.temperature_max_f) + "°F" : null,
      finite(today.precipitation_probability_max) ? round(today.precipitation_probability_max) + "% rain" : null,
    ].filter(Boolean).join(" · ");
    return '<button class="daily-list-row" type="button" data-open-beach="' + escapeHtml(beach.slug) + '" aria-label="Open ' + escapeHtml(beach.name) + '">' +
      '<span class="daily-list-rank">' + (index + 1) + '</span><span><span class="daily-list-title">' + escapeHtml(beach.name) + '</span><span class="daily-list-meta">' + escapeHtml(summary) + '</span></span>' +
      '<span class="daily-list-score" aria-label="Beach Day Score ' + escapeHtml(scoreText(beach)) + '">' + escapeHtml(scoreText(beach)) + '</span></button>';
  }

  function renderSeason() {
    var panel = byId("seasonPanel");
    if (!panel || !state.data) return;
    var season = state.data.season;
    panel.classList.toggle("is-paused", !season.active);
    var title = panel.querySelector("[data-season-title]");
    var copy = panel.querySelector("[data-season-copy]");
    var link = panel.querySelector("[data-season-link]");
    if (title) title.textContent = season.active ? "The daily beach ranking is on" : "The daily ranking is paused";
    if (copy) {
      copy.textContent = season.active
        ? "Updated throughout the day through September 15. The year-round beach explorer stays live in every season."
        : "The next daily ranking begins " + formatDate(season.starts_on + "T12:00:00-04:00", { month: "long", day: "numeric", year: "numeric" }) + ". Live conditions and official alerts remain available below.";
    }
    if (link) {
      link.hidden = !season.active;
      link.href = "/best-michigan-beaches-today/";
    }
  }

  function renderSourceHealth() {
    var health = byId("sourceHealth");
    var updated = byId("liveUpdated");
    if (!state.data) return;
    if (updated) updated.textContent = "Updated " + formatDate(state.data.generated_at);
    if (!health) return;
    var keys = ["beachguard", "weather", "buoys", "hazards"];
    health.innerHTML = keys.map(function (key) {
      var source = state.data.sources[key];
      return '<span title="' + escapeHtml(source.label) + '"><span class="source-dot ' + escapeHtml(source.status) + '"></span> ' + escapeHtml(key === "beachguard" ? "BeachGuard" : key === "buoys" ? "NOAA buoys" : key === "hazards" ? "NWS hazards" : "Forecast") + '</span>';
    }).join("");
  }

  function renderAlertPanel() {
    var panel = byId("activeAlertPanel");
    if (!panel || !state.data) return;
    var source = state.data.sources.beachguard;
    var count = source.active_alert_count;
    var title = panel.querySelector("[data-alert-title]");
    var copy = panel.querySelector("[data-alert-copy]");
    if (source.status === "unavailable") {
      panel.classList.add("show");
      if (title) title.textContent = "Official water-quality feed is unavailable";
      if (copy) copy.textContent = "Do not interpret missing data as an all-clear. Check Michigan BeachGuard before entering the water.";
    } else if (count > 0) {
      panel.classList.add("show");
      if (title) title.textContent = count + " active Michigan closure" + (count === 1 ? " or advisory" : "s or advisories");
      if (copy) copy.textContent = "Affected beaches are flagged and excluded from today’s ranked picks. Always read the official notice.";
    } else {
      panel.classList.remove("show");
    }
  }

  function topBeaches() {
    if (!state.data) return [];
    var lookup = new Map(state.beaches.map(function (beach) { return [beach.slug, beach]; }));
    return (state.data.daily_top_slugs || []).map(function (slug) { return lookup.get(slug); }).filter(Boolean);
  }

  function renderDaily() {
    var container = byId("dailyPicks");
    if (!container || !state.data) return;
    if (!state.data.season.active) {
      container.innerHTML = '<div class="error-card" style="grid-column:1/-1"><h3>Daily picks return May 15</h3><p>The live explorer below remains available all year for forecasts, waves, water temperatures, BeachGuard notices, and National Weather Service hazards.</p></div>';
      return;
    }
    if (state.data.daily_ranking && !state.data.daily_ranking.available) {
      container.innerHTML = '<div class="error-card" style="grid-column:1/-1"><h3>Today’s ranking is temporarily withheld</h3><p>An official notice, hazard, or forecast source did not return. The explorer still shows the available inputs, and the official source links remain below.</p></div>';
      return;
    }
    var beaches = topBeaches().slice(0, 3);
    container.innerHTML = beaches.length ? beaches.map(dailyCardHtml).join("") : errorHtml();
  }

  function renderDailyList() {
    var container = byId("dailyList");
    if (!container || !state.data) return;
    if (!state.data.season.active) {
      container.innerHTML = '<div class="error-card"><h3>The seasonal ranking is paused</h3><p>It automatically returns May 15. The <a href="/great-lakes-beaches/">Michigan Beach Report</a> remains live all year.</p></div>';
      return;
    }
    if (state.data.daily_ranking && !state.data.daily_ranking.available) {
      container.innerHTML = '<div class="error-card"><h3>Today’s ranking is temporarily withheld</h3><p>An official notice, hazard, or forecast source did not return, so no “best” list is being published. Use the <a href="/great-lakes-beaches/">year-round report</a> and check the official links directly.</p></div>';
      return;
    }
    var beaches = topBeaches().slice(0, 10);
    container.innerHTML = beaches.length ? beaches.map(dailyListHtml).join("") : errorHtml();
  }

  function matchesQuery(beach) {
    var haystack = [beach.name, beach.lake, beach.region, beach.county, beach.summary]
      .concat(beach.aliases || [])
      .concat(beach.traits || [])
      .join(" ")
      .toLowerCase();
    return !state.query || haystack.indexOf(state.query.toLowerCase()) !== -1;
  }

  function applyFilters() {
    var filtered = state.beaches.filter(function (beach) {
      var lakeMatch = state.lake === "all" || beach.lake === state.lake;
      var traitMatch = state.trait === "all" || (beach.traits || []).indexOf(state.trait) !== -1;
      return lakeMatch && traitMatch && matchesQuery(beach);
    });
    filtered.sort(function (first, second) {
      if (state.sort === "name") return first.name.localeCompare(second.name);
      if (state.sort === "distance" && state.userLocation) return (first.distance_miles || 9999) - (second.distance_miles || 9999);
      var firstScore = first.rating && first.rating.score != null ? first.rating.score : -1;
      var secondScore = second.rating && second.rating.score != null ? second.rating.score : -1;
      return secondScore - firstScore || first.name.localeCompare(second.name);
    });
    state.filtered = filtered;
    renderBeachList();
    updateMapMarkers();
  }

  function renderBeachList() {
    var container = byId("beachList");
    var resultCount = byId("resultCount");
    if (!container) return;
    if (resultCount) resultCount.textContent = state.filtered.length + " of " + state.beaches.length + " beaches";
    if (!state.filtered.length) {
      container.innerHTML = '<div class="empty-state"><strong>No beaches match those filters.</strong><br>Try a lake or a broader search.</div>';
      return;
    }
    container.innerHTML = state.filtered.map(beachCardHtml).join("");
  }

  function markerColor(beach) {
    var value = level(beach);
    if (value === "closed" || value === "advisory") return "#b42318";
    if (value === "excellent" || value === "good") return "#177657";
    if (value === "mixed" || value === "caution") return "#9a6700";
    return "#68777a";
  }

  function updateMapMarkers() {
    if (!state.map || !window.L) return;
    state.markers.forEach(function (marker) { marker.remove(); });
    state.markers = state.filtered.map(function (beach) {
      var marker = window.L.circleMarker([beach.lat, beach.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: markerColor(beach),
        fillOpacity: 0.94,
      }).addTo(state.map);
      var popup = '<div class="map-popup"><strong>' + escapeHtml(beach.name) + '</strong><span>' + escapeHtml(beachStatus(beach)) + ' · Score ' + escapeHtml(scoreText(beach)) + '</span><button type="button" data-map-beach="' + escapeHtml(beach.slug) + '">View details</button></div>';
      marker.bindPopup(popup);
      marker.on("popupopen", function () {
        var button = document.querySelector('[data-map-beach="' + CSS.escape(beach.slug) + '"]');
        if (button) button.addEventListener("click", function () { openDetail(beach.slug, "map"); }, { once: true });
      });
      return marker;
    });
  }

  function loadMap() {
    var mapElement = byId("beachMap");
    if (!mapElement || state.map) return;
    function start() {
      if (!window.L || state.map) return;
      mapElement.innerHTML = "";
      state.map = window.L.map(mapElement, { scrollWheelZoom: false }).setView([44.7, -85.4], 6);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(state.map);
      updateMapMarkers();
    }
    if (window.L) return start();
    if (!document.querySelector('link[data-beach-leaflet]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.beachLeaflet = "true";
      document.head.appendChild(link);
    }
    var script = document.querySelector('script[data-beach-leaflet]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.dataset.beachLeaflet = "true";
      script.onload = start;
      script.onerror = function () { mapElement.innerHTML = '<div class="map-placeholder">The map could not load. The beach list remains available.</div>'; };
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", start, { once: true });
    }
  }

  function requestLocation() {
    var button = byId("nearMeButton") || byId("heroNearMe");
    if (!navigator.geolocation) {
      if (button) button.textContent = "Location unavailable";
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = "Finding you…";
    }
    navigator.geolocation.getCurrentPosition(function (position) {
      state.userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      state.beaches.forEach(function (beach) {
        beach.distance_miles = haversineMiles(state.userLocation.lat, state.userLocation.lng, beach.lat, beach.lng);
      });
      state.sort = "distance";
      var select = byId("sortFilter");
      if (select) select.value = "distance";
      if (button) {
        button.disabled = false;
        button.textContent = "Sorted near you";
      }
      applyFilters();
      var explorer = byId("beachExplorer");
      if (explorer) explorer.scrollIntoView({ behavior: "smooth", block: "start" });
      track("Beach Near Me", { result_count: state.beaches.length });
    }, function () {
      if (button) {
        button.disabled = false;
        button.textContent = "Use my location";
      }
      var summary = byId("resultCount");
      if (summary) summary.textContent = "Location access was not available. Search by name or lake instead.";
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  }

  function detailMarkup(beach) {
    var quality = beach.water_quality || {};
    var today = beach.weather && beach.weather.today ? beach.weather.today : {};
    var current = beach.weather && beach.weather.current ? beach.weather.current : {};
    var lake = beach.lake_conditions || {};
    var reasons = beach.rating && beach.rating.reasons ? beach.rating.reasons : [];
    var metrics = [
      ["Air now", formatMetric(current.temperature_f, "°F", "—")],
      ["Today’s high", formatMetric(today.temperature_max_f, "°F", "—")],
      ["Rain chance", formatMetric(today.precipitation_probability_max, "%", "—")],
      ["Water", lake.fresh ? formatMetric(lake.water_temp_f, "°F", "—") : "Not current"],
      ["Waves", lake.fresh ? formatMetric(lake.wave_height_ft, " ft", "—") : "Not current"],
      ["Wind gusts", formatMetric(today.wind_gusts_max_mph, " mph", "—")],
    ];
    var hazardMarkup = (beach.hazards || []).map(function (hazard) {
      return '<li><a href="' + escapeHtml(hazard.official_url) + '" target="_blank" rel="noopener">' + escapeHtml(hazard.headline || hazard.event) + '</a></li>';
    }).join("");
    return '<div class="dialog-hero"><h2>' + escapeHtml(beach.name) + '</h2><p>' + escapeHtml(beach.region) + " · " + escapeHtml(beach.lake) + '</p>' +
      '<div class="dialog-score"><strong>' + escapeHtml(scoreText(beach)) + '</strong><span>' + escapeHtml(beach.rating.label) + '<br>Beach Day Score</span></div></div>' +
      '<div class="dialog-body"><div class="truth-status" data-state="' + escapeHtml(quality.state) + '"><strong>' + escapeHtml(quality.label || "Official status unavailable") + '</strong><p>' + escapeHtml(quality.interpretation || "Check the official source before entering the water.") + '</p></div>' +
      '<div class="metric-grid">' + metrics.map(function (metric) { return '<div class="metric"><span>' + escapeHtml(metric[0]) + '</span><strong>' + escapeHtml(metric[1]) + '</strong></div>'; }).join("") + '</div>' +
      '<h3>Why this score</h3><ul class="reason-list">' + reasons.map(function (reason) { return '<li>' + escapeHtml(reason) + '</li>'; }).join("") + hazardMarkup + '</ul>' +
      (lake.station_id ? '<p><small>Lake observations: NOAA station ' + escapeHtml(lake.station_id) + (lake.distance_miles != null ? ", about " + escapeHtml(lake.distance_miles) + " miles away" : "") + (lake.observed_at ? ", observed " + escapeHtml(formatDate(lake.observed_at)) : "") + '.</small></p>' : "") +
      '<div class="dialog-actions"><a class="button" href="' + escapeHtml(beach.url) + '">Full beach page</a><a class="button button-secondary" href="' + escapeHtml(quality.official_url || "https://mienviro.michigan.gov/nsite/beach/map/results") + '" target="_blank" rel="noopener">Check BeachGuard</a></div></div>';
  }

  function findBeach(slug) {
    return state.beaches.find(function (beach) { return beach.slug === slug; });
  }

  function openDetail(slug, placement) {
    var beach = findBeach(slug);
    var dialog = byId("beachDetailDialog");
    var content = byId("beachDetailContent");
    if (!beach || !dialog || !content) {
      if (beach) window.location.href = beach.url;
      return;
    }
    content.innerHTML = detailMarkup(beach);
    dialog.showModal();
    document.body.classList.add("dialog-open");
    track(placement === "daily" ? "Daily Pick Open" : "Beach Detail Open", { beach: beach.slug, placement: placement || "list" });
  }

  function renderIndividual() {
    var container = document.querySelector("[data-beach-live]");
    if (!container || !state.beaches.length) return;
    var beach = state.beaches[0];
    var quality = beach.water_quality || {};
    var today = beach.weather && beach.weather.today ? beach.weather.today : {};
    var lake = beach.lake_conditions || {};
    var metrics = [
      ["Beach Day Score", scoreText(beach) + "/100"],
      ["Today’s high", formatMetric(today.temperature_max_f, "°F", "—")],
      ["Rain chance", formatMetric(today.precipitation_probability_max, "%", "—")],
      ["Water temperature", lake.fresh ? formatMetric(lake.water_temp_f, "°F", "—") : "Not current"],
      ["Wave height", lake.fresh ? formatMetric(lake.wave_height_ft, " ft", "—") : "Not current"],
      ["Max wind gust", formatMetric(today.wind_gusts_max_mph, " mph", "—")],
    ];
    container.innerHTML = '<h2>Conditions today</h2><p class="detail-summary">' + escapeHtml(beach.rating.label) + '. Updated ' + escapeHtml(formatDate(state.data.generated_at)) + '.</p>' +
      '<div class="truth-status" data-state="' + escapeHtml(quality.state) + '"><strong>' + escapeHtml(quality.label) + '</strong><p>' + escapeHtml(quality.interpretation) + '</p></div>' +
      '<div class="metric-grid">' + metrics.map(function (metric) { return '<div class="metric"><span>' + escapeHtml(metric[0]) + '</span><strong>' + escapeHtml(metric[1]) + '</strong></div>'; }).join("") + '</div>' +
      '<h3>What is shaping the score</h3><ul class="reason-list">' + (beach.rating.reasons || []).map(function (reason) { return '<li>' + escapeHtml(reason) + '</li>'; }).join("") + '</ul>' +
      '<div class="dialog-actions"><a class="button" href="' + escapeHtml(quality.official_url) + '" target="_blank" rel="noopener">Check BeachGuard</a><a class="button button-secondary" href="/great-lakes-beaches/">Compare all beaches</a></div>';
  }

  function bindControls() {
    document.addEventListener("click", function (event) {
      var opener = event.target.closest("[data-open-beach]");
      if (opener) openDetail(opener.dataset.openBeach, opener.closest("#dailyPicks, #dailyList") ? "daily" : "list");
      var close = event.target.closest("[data-close-dialog]");
      if (close) {
        var dialog = byId("beachDetailDialog");
        if (dialog) dialog.close();
      }
      var trait = event.target.closest("[data-trait-filter]");
      if (trait) {
        document.querySelectorAll("[data-trait-filter]").forEach(function (button) { button.classList.remove("active"); });
        trait.classList.add("active");
        state.trait = trait.dataset.traitFilter;
        applyFilters();
      }
    });
    var dialog = byId("beachDetailDialog");
    if (dialog) {
      dialog.addEventListener("close", function () { document.body.classList.remove("dialog-open"); });
      dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
    }
    var search = byId("beachSearch");
    if (search) search.addEventListener("input", function () { state.query = search.value.trim(); applyFilters(); });
    var lake = byId("lakeFilter");
    if (lake) lake.addEventListener("change", function () { state.lake = lake.value; applyFilters(); });
    var sort = byId("sortFilter");
    if (sort) sort.addEventListener("change", function () {
      state.sort = sort.value;
      if (state.sort === "distance" && !state.userLocation) requestLocation();
      else applyFilters();
    });
    var near = byId("nearMeButton");
    if (near) near.addEventListener("click", requestLocation);
    var heroNear = byId("heroNearMe");
    if (heroNear) heroNear.addEventListener("click", requestLocation);
    var heroSearch = byId("heroBeachSearch");
    var heroFind = byId("heroFindButton");
    function submitHeroSearch() {
      if (!heroSearch) return;
      state.query = heroSearch.value.trim();
      if (search) search.value = state.query;
      applyFilters();
      var explorer = byId("beachExplorer");
      if (explorer) explorer.scrollIntoView({ behavior: "smooth", block: "start" });
      track("Beach Search", { query_length: state.query.length, result_count: state.filtered.length });
    }
    if (heroFind) heroFind.addEventListener("click", submitHeroSearch);
    if (heroSearch) heroSearch.addEventListener("keydown", function (event) { if (event.key === "Enter") submitHeroSearch(); });
  }

  function errorHtml() {
    return '<div class="error-card"><h3>Live conditions could not load</h3><p>Try again shortly, and check <a href="https://mienviro.michigan.gov/nsite/beach/map/results" target="_blank" rel="noopener">Michigan BeachGuard</a> plus <a href="https://www.weather.gov/greatlakes/beachhazards" target="_blank" rel="noopener">National Weather Service beach hazards</a> before entering the water.</p></div>';
  }

  function renderError() {
    ["dailyPicks", "dailyList", "beachList"].forEach(function (id) {
      var element = byId(id);
      if (element) element.innerHTML = errorHtml();
    });
    var individual = document.querySelector("[data-beach-live]");
    if (individual) individual.innerHTML = errorHtml();
    var updated = byId("liveUpdated");
    if (updated) updated.textContent = "Live update unavailable";
  }

  function initializeFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var query = params.get("q");
    if (!query) return;
    state.query = query.slice(0, 80);
    var hero = byId("heroBeachSearch");
    var search = byId("beachSearch");
    if (hero) hero.value = state.query;
    if (search) search.value = state.query;
  }

  async function load() {
    bindControls();
    initializeFromQuery();
    try {
      var endpoint = "/api/beaches" + (beachSlug ? "?slug=" + encodeURIComponent(beachSlug) : "");
      var response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Beach API returned " + response.status);
      state.data = await response.json();
      state.beaches = Array.isArray(state.data.beaches) ? state.data.beaches : [];
      renderSeason();
      renderSourceHealth();
      renderAlertPanel();
      if (pageType === "detail") renderIndividual();
      if (pageType === "daily") renderDailyList();
      if (pageType === "explorer") {
        renderDaily();
        applyFilters();
        loadMap();
      }
    } catch (error) {
      renderError();
      if (window.console) console.error(error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
