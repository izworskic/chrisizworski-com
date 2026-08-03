(function () {
  "use strict";

  var views = {
    overview: {
      label: "All Great Lakes",
      lat: 44.8,
      lng: -84.7,
      zoom: 5,
      description: "The lake-wide view shows AIS-equipped traffic across all five Great Lakes. Zoom in or choose a corridor for a faster read on a known commercial route.",
      watch: "Start here when you do not know which lake a vessel is on. For named passage activity, open BoatNerd's lake-wide map.",
      passage: "https://ais.boatnerd.com/",
      passageLabel: "Open BoatNerd lake-wide map",
      conditions: false
    },
    soo: {
      label: "Soo Locks",
      lat: 46.5036,
      lng: -84.36,
      zoom: 13,
      description: "This view centers on the Soo Locks and the St. Marys River approaches. Downbound vessels arrive from Lake Superior; upbound vessels approach from the lower river.",
      watch: "Best shore view: the Soo Locks Visitor Center observation deck. Use the passage list to see recent named-vessel activity without guessing from the map alone.",
      passage: "https://ais.boatnerd.com/passage/port/soo-locks",
      passageLabel: "Open Soo Locks passage list",
      conditions: true
    },
    mackinac: {
      label: "Straits of Mackinac",
      lat: 45.817,
      lng: -84.74,
      zoom: 11,
      description: "This view covers the Straits of Mackinac, where Lake Michigan and Lake Huron traffic converges beneath and around the bridge corridor.",
      watch: "Best shore views: the Mackinaw City waterfront and Bridge View Park in St. Ignace. Check bridge conditions separately if your trip includes a crossing.",
      passage: "https://ais.boatnerd.com/passage/port/straits-of-mackinac",
      passageLabel: "Open Straits passage list",
      conditions: true
    },
    duluth: {
      label: "Duluth–Superior",
      lat: 46.779,
      lng: -92.087,
      zoom: 12,
      description: "This view centers on Duluth–Superior harbor and the Aerial Lift Bridge approach, a major western Lake Superior cargo gateway.",
      watch: "Best shore view: Canal Park beside the Aerial Lift Bridge. Port timing can change, so use the live map and current passage activity together.",
      passage: "https://ais.boatnerd.com/passage/port/duluth-superior",
      passageLabel: "Open Duluth–Superior passage list",
      conditions: true
    },
    "port-huron": {
      label: "Port Huron",
      lat: 42.987,
      lng: -82.424,
      zoom: 12,
      description: "This view follows the Blue Water Bridge and upper St. Clair River, a narrow corridor used by vessels moving between Lake Huron and the lower lakes.",
      watch: "Best shore view: Vantage Point and the riverwalk south of the Blue Water Bridge. Current and traffic direction are easiest to read here at close range.",
      passage: "https://ais.boatnerd.com/passage/port/port-huron",
      passageLabel: "Open Port Huron passage list",
      conditions: true
    },
    detroit: {
      label: "Detroit River",
      lat: 42.255,
      lng: -83.02,
      zoom: 11,
      description: "This view follows the Detroit River between Lake St. Clair and Lake Erie, including the downtown reach and the Rouge River industrial corridor.",
      watch: "Best broad view: Belle Isle. Riverfront parks provide closer looks, but vessel speed and sight lines vary through the corridor.",
      passage: "https://ais.boatnerd.com/passage/port/detroit",
      passageLabel: "Open Detroit passage list",
      conditions: true
    },
    saginaw: {
      label: "Saginaw Bay",
      lat: 43.657,
      lng: -83.874,
      zoom: 10,
      description: "This view covers the lower Saginaw River and Inner Saginaw Bay, where freighters serving Bay City and Saginaw move between the dredged channel and Lake Huron.",
      watch: "Best shore views: Bay City's riverfront parks and bridge approaches. Traffic is less continuous than at the Soo or St. Clair River, so the passage list matters.",
      passage: "https://ais.boatnerd.com/passage/port/saginaw-river",
      passageLabel: "Open Saginaw River passage list",
      conditions: true
    }
  };

  var mapFrame = document.getElementById("freighterMap");
  if (!mapFrame) return;

  var statusText = document.getElementById("mapStatusText");
  var statusDot = document.getElementById("mapStatusDot");
  var refreshButton = document.getElementById("mapRefresh");
  var corridorLabel = document.getElementById("corridorLabel");
  var corridorTitle = document.getElementById("corridorTitle");
  var corridorCopy = document.getElementById("corridorCopy");
  var watchNote = document.getElementById("watchNote");
  var passageLink = document.getElementById("passageLink");
  var stationTitle = document.getElementById("stationTitle");
  var stationSource = document.getElementById("stationSource");
  var windValue = document.getElementById("windValue");
  var waveValue = document.getElementById("waveValue");
  var waterValue = document.getElementById("waterValue");
  var conditionTime = document.getElementById("conditionTime");
  var activeView = "overview";
  var loadTimer = null;
  var stationsPromise = null;

  function mapUrl(view, refresh) {
    var ref = encodeURIComponent("https://chrisizworski.com/great-lakes-freighter-tracking/");
    var url = "https://embed.myshiptracking.com/embed?myst&zoom=" + view.zoom +
      "&lat=" + view.lat + "&lng=" + view.lng +
      "&show_names=1&scroll_wheel=0&show_menu=0&map_style=simple&ref=" + ref;
    return refresh ? url + "&refresh=" + Date.now() : url;
  }

  function cleanHash(value) {
    return String(value || "").replace(/^#/, "").toLowerCase();
  }

  function selectedFromHash() {
    var requested = cleanHash(window.location.hash);
    return Object.prototype.hasOwnProperty.call(views, requested) ? requested : "overview";
  }

  function setStatus(message, state) {
    statusText.textContent = message;
    statusDot.className = "map-state-dot" + (state ? " " + state : "");
  }

  function markButtons(key) {
    document.querySelectorAll("[data-freighter-view]").forEach(function (button) {
      var selected = button.getAttribute("data-freighter-view") === key;
      if (button.classList.contains("view-tab")) {
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.setAttribute("tabindex", selected ? "0" : "-1");
      }
    });
  }

  function trackView(key) {
    if (typeof window.va !== "function") return;
    window.va("event", {
      name: "Freighter Map View",
      data: { corridor: key }
    });
  }

  function toRad(value) {
    return value * Math.PI / 180;
  }

  function distanceMiles(lat1, lng1, lat2, lng2) {
    var radius = 3958.8;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function finite(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function knots(value) {
    var number = finite(value);
    return number === null ? "—" : Math.round(number * 1.94384) + " kt";
  }

  function feet(value) {
    var number = finite(value);
    return number === null ? "—" : (number * 3.28084).toFixed(1) + " ft";
  }

  function fahrenheit(value) {
    var number = finite(value);
    return number === null ? "—" : Math.round(number * 9 / 5 + 32) + "°F";
  }

  function resetConditions(message) {
    stationTitle.textContent = "Choose a corridor";
    stationSource.textContent = message || "Nearby NOAA observations appear after you choose a corridor.";
    windValue.textContent = "—";
    waveValue.textContent = "—";
    waterValue.textContent = "—";
    conditionTime.textContent = "AIS positions and NOAA station reports update on different schedules.";
  }

  function loadStations() {
    if (!stationsPromise) {
      stationsPromise = fetch("/api/buoys", { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("NOAA endpoint returned " + response.status);
          return response.json();
        })
        .then(function (payload) {
          return Array.isArray(payload.stations) ? payload.stations : [];
        });
    }
    return stationsPromise;
  }

  function renderNearestCondition(key) {
    var view = views[key];
    if (!view.conditions) {
      resetConditions();
      return;
    }

    stationTitle.textContent = "Loading nearby NOAA station…";
    stationSource.textContent = "Finding the nearest station with a current wind, wave, or water reading.";
    windValue.textContent = "…";
    waveValue.textContent = "…";
    waterValue.textContent = "…";
    conditionTime.textContent = "";

    loadStations().then(function (stations) {
      if (activeView !== key) return;
      var candidates = stations
        .filter(function (station) {
          return finite(station.lat) !== null && finite(station.lng) !== null &&
            [station.wind_spd, station.wave_ht, station.water_t].some(function (value) { return finite(value) !== null; });
        })
        .map(function (station) {
          return {
            station: station,
            distance: distanceMiles(view.lat, view.lng, finite(station.lat), finite(station.lng))
          };
        })
        .sort(function (a, b) { return a.distance - b.distance; });

      if (!candidates.length) throw new Error("No nearby station observation");
      var nearest = candidates[0];
      var station = nearest.station;
      var observed = station.obs_time ? new Date(station.obs_time) : null;
      var ageHours = observed && !Number.isNaN(observed.getTime()) ? (Date.now() - observed.getTime()) / 3600000 : null;
      var freshness = ageHours !== null && ageHours <= 6 ? "Latest nearby NOAA observation" : "Latest available NOAA observation";

      stationTitle.textContent = station.name || ("Station " + station.id);
      stationSource.textContent = freshness + " · about " + Math.round(nearest.distance) + " miles from the map center";
      windValue.textContent = knots(station.wind_spd);
      waveValue.textContent = feet(station.wave_ht);
      waterValue.textContent = fahrenheit(station.water_t);
      conditionTime.textContent = observed && !Number.isNaN(observed.getTime())
        ? "Reported " + observed.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) + ". This is nearby lake context, not a condition report for a vessel."
        : "Observation time unavailable. Use the NOAA dashboard before making a weather-sensitive decision.";
    }).catch(function () {
      if (activeView !== key) return;
      resetConditions("The nearby NOAA observation could not be loaded. The full buoy dashboard remains available.");
    });
  }

  function selectView(key, options) {
    var view = views[key] || views.overview;
    var settings = options || {};
    activeView = key;
    markButtons(key);
    corridorLabel.textContent = "Current map: " + view.label;
    corridorTitle.textContent = view.label;
    corridorCopy.textContent = view.description;
    watchNote.textContent = view.watch;
    passageLink.href = view.passage;
    passageLink.textContent = view.passageLabel + " ↗";
    setStatus("Loading " + view.label + " AIS view…", "");
    refreshButton.disabled = true;
    mapFrame.title = "Live AIS vessel map centered on " + view.label;
    mapFrame.src = mapUrl(view, Boolean(settings.refresh));
    window.clearTimeout(loadTimer);
    loadTimer = window.setTimeout(function () {
      if (activeView !== key) return;
      setStatus("The live map is taking longer than expected. Passage links remain available below.", "slow");
      refreshButton.disabled = false;
    }, 12000);
    renderNearestCondition(key);

    if (settings.updateHash !== false) {
      var nextHash = key === "overview" ? window.location.pathname : window.location.pathname + "#" + key;
      window.history.replaceState(null, "", nextHash);
    }
    if (settings.track !== false) trackView(key);
  }

  mapFrame.addEventListener("load", function () {
    window.clearTimeout(loadTimer);
    setStatus("Map frame loaded: " + views[activeView].label + ". AIS coverage may be delayed or incomplete.", "loaded");
    refreshButton.disabled = false;
  });

  refreshButton.addEventListener("click", function () {
    selectView(activeView, { refresh: true, updateHash: false, track: false });
  });

  document.querySelectorAll("[data-freighter-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      var key = button.getAttribute("data-freighter-view");
      if (!views[key]) return;
      selectView(key, { updateHash: true, track: true });
      if (button.classList.contains("corridor-jump")) {
        document.getElementById("live-map").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  document.querySelectorAll(".view-tab").forEach(function (tab) {
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".view-tab"));
      var index = tabs.indexOf(tab);
      var next = event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  window.addEventListener("hashchange", function () {
    var key = selectedFromHash();
    if (key !== activeView) selectView(key, { updateHash: false, track: false });
  });

  selectView(selectedFromHash(), { updateHash: false, track: false });
})();
