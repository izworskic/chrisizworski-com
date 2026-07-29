(function () {
  "use strict";

  var API_URL = "/api/border-crossings";
  var TREND_URL = "/api/border-trends";
  var REFRESH_MS = 60 * 1000;
  var CROSSING_IDS = [
    "gordie-howe",
    "ambassador",
    "detroit-windsor-tunnel",
    "blue-water",
    "sault-ste-marie",
  ];
  var body = document.body;
  var pageType = body.dataset.borderPage;
  var detailId = body.dataset.borderDetail || "";
  var search = new URLSearchParams(window.location.search);
  var state = {
    direction: search.get("direction") === "to_us" ? "to_us" : "to_canada",
    vehicle: search.get("vehicle") === "commercial" ? "commercial" : "passenger",
    lane: ["standard", "nexus", "ready", "fast"].includes(search.get("lane"))
      ? search.get("lane")
      : "standard",
    crossing: CROSSING_IDS.includes(search.get("crossing"))
      ? search.get("crossing")
      : detailId || "gordie-howe",
    camera: "",
  };
  var liveData = null;
  var refreshTimer = null;
  var trendRequestKey = "";
  var trendAbortController = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function track(action, details) {
    if (typeof window.va !== "function") return;
    window.va("event", {
      name: "Border Tool Interaction",
      action: action,
      page: pageType || "unknown",
      crossing: details && details.crossing ? details.crossing : state.crossing,
      direction: state.direction,
      vehicle: state.vehicle,
      lane: state.lane,
    });
  }

  function allowedLanes(direction, vehicle) {
    if (direction === "to_canada") return ["standard"];
    return vehicle === "commercial"
      ? ["standard", "fast"]
      : ["standard", "nexus", "ready"];
  }

  function laneLabel(lane) {
    return {
      standard: "Standard",
      nexus: "NEXUS",
      ready: "Ready Lane",
      fast: "FAST",
    }[lane] || "Standard";
  }

  function directionLabel(direction) {
    return direction === "to_us" ? "Entering the United States" : "Entering Canada";
  }

  function vehicleLabel(vehicle) {
    return vehicle === "commercial" ? "Commercial" : "Passenger";
  }

  function adjustLane() {
    var lanes = allowedLanes(state.direction, state.vehicle);
    if (!lanes.includes(state.lane)) state.lane = "standard";
    var select = pageType === "detail" ? byId("detailLaneSelect") : byId("laneSelect");
    if (!select) return;
    var labels = {
      standard: "Standard lane",
      nexus: "NEXUS lane",
      ready: "Ready Lane",
      fast: "FAST lane",
    };
    select.textContent = "";
    lanes.forEach(function (lane) {
      var option = document.createElement("option");
      option.value = lane;
      option.textContent = labels[lane];
      option.selected = lane === state.lane;
      select.appendChild(option);
    });
  }

  function formatWait(lane) {
    if (!lane) return "Not reported";
    if (lane.status === "closed") return lane.display || "Closed";
    if (!lane.available || !Number.isFinite(lane.wait_minutes)) return "Not reported";
    return lane.wait_minutes === 0 ? "No delay" : lane.wait_minutes + " min";
  }

  function formatAgencyUpdate(lane) {
    if (!lane || !lane.updated_text) return "update unavailable";
    if (!lane.updated_at) return lane.updated_text;
    var timestamp = new Date(lane.updated_at).getTime();
    if (!Number.isFinite(timestamp)) return lane.updated_text;
    var ageMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (ageMinutes > 120) {
      var ageLabel =
        ageMinutes >= 1440
          ? Math.floor(ageMinutes / 1440) + "d"
          : Math.floor(ageMinutes / 60) + "h";
      return lane.updated_text + " · stale report (" + ageLabel + " old)—verify with agency";
    }
    if (ageMinutes < 2) return lane.updated_text + " · just updated";
    return lane.updated_text + " · " + ageMinutes + " min ago";
  }

  function getLane(crossing) {
    if (!crossing) return null;
    var direction = crossing.waits && crossing.waits[state.direction];
    var vehicle = direction && direction[state.vehicle];
    return vehicle && vehicle[state.lane] ? vehicle[state.lane] : null;
  }

  function crossingById(id) {
    if (!liveData) return null;
    return liveData.crossings.find(function (crossing) {
      return crossing.id === id;
    });
  }

  function formatClock(value) {
    var date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Detroit",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function setPressed(selector, attribute, value) {
    all(selector).forEach(function (button) {
      var selected = button.dataset[attribute] === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateUrl() {
    var params = new URLSearchParams();
    if (state.direction !== "to_canada") params.set("direction", state.direction);
    if (state.vehicle !== "passenger") params.set("vehicle", state.vehicle);
    if (state.lane !== "standard") params.set("lane", state.lane);
    if (pageType === "main" && state.crossing !== "gordie-howe") {
      params.set("crossing", state.crossing);
    }
    var query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : ""));
  }

  function updateRibbon(data) {
    var dot = byId("liveDot");
    var status = byId("ribbonStatus");
    var time = byId("ribbonTime");
    if (!dot || !status) return;
    dot.classList.remove("is-loading", "is-live", "is-degraded");
    dot.classList.add(data.degraded ? "is-degraded" : "is-live");
    status.textContent = data.degraded
      ? "Official waits loaded · one supporting source is unavailable"
      : "All five official crossing reports loaded";
    if (time) time.textContent = "Checked " + formatClock(data.fetched_at);
  }

  function renderComparison() {
    var key = [state.direction, state.vehicle, state.lane].join(":");
    var comparison = liveData.comparisons[key];
    var eyebrow = byId("comparisonEyebrow");
    var headline = byId("comparisonHeadline");
    var note = byId("comparisonNote");
    if (eyebrow) {
      eyebrow.textContent =
        directionLabel(state.direction) +
        " · " +
        vehicleLabel(state.vehicle) +
        " · " +
        laneLabel(state.lane);
    }
    if (headline) headline.textContent = comparison.headline;
    if (note) note.textContent = comparison.note;

    all("[data-crossing-result]").forEach(function (card) {
      var crossing = crossingById(card.dataset.crossingResult);
      var lane = getLane(crossing);
      var fastest = comparison.fastest_ids.includes(crossing.id);
      var wait = card.querySelector('[data-role="wait"]');
      var kicker = card.querySelector('[data-role="kicker"]');
      var detail = card.querySelector('[data-role="detail"]');
      var source = card.querySelector('[data-role="source"]');
      var value = formatWait(lane);

      card.classList.toggle("is-fastest", fastest);
      card.classList.toggle("is-unavailable", !lane || !lane.available);
      kicker.textContent = fastest
        ? comparison.is_tie
          ? "Tied for shortest report"
          : "Shortest reported wait"
        : lane && lane.status === "closed"
          ? "Closed for this selection"
          : lane && lane.available
            ? "Official reported wait"
            : "No comparable report";
      wait.textContent = value;
      wait.classList.toggle(
        "is-long",
        Boolean(lane && Number.isFinite(lane.wait_minutes) && lane.wait_minutes >= 30),
      );
      wait.classList.toggle("is-unknown", !lane || !lane.available);
      detail.textContent =
        crossing.route +
        (lane && lane.lanes_open != null ? " · " + lane.lanes_open + " lane(s) open" : "");
      source.textContent =
        (state.direction === "to_us" ? "CBP" : "CBSA") +
        " · " +
        formatAgencyUpdate(lane);
    });
  }

  function renderCorridor(id) {
    var card = document.querySelector('[data-corridor-card="' + id + '"]');
    var crossing = crossingById(id);
    if (!card || !crossing) return;
    ["to_canada", "to_us"].forEach(function (direction) {
      var vehicle = crossing.waits[direction][state.vehicle];
      var lane = vehicle && vehicle[state.lane] ? vehicle[state.lane] : vehicle.standard;
      var wait = card.querySelector('[data-corridor-wait="' + direction + '"]');
      var source = card.querySelector('[data-corridor-source="' + direction + '"]');
      wait.textContent = formatWait(lane);
      source.textContent =
        (direction === "to_us" ? "CBP" : "CBSA") +
        " · " +
        formatAgencyUpdate(lane);
    });
  }

  function cameraMetadata(cameraId) {
    if (!liveData) return null;
    for (var index = 0; index < liveData.crossings.length; index += 1) {
      var crossing = liveData.crossings[index];
      var camera = crossing.cameras.find(function (candidate) {
        return candidate.id === cameraId;
      });
      if (camera) return { crossing: crossing, camera: camera };
    }
    return null;
  }

  function chooseCrossing(id, shouldScroll) {
    if (!CROSSING_IDS.includes(id)) return;
    state.crossing = id;
    var crossing = crossingById(id);
    if (crossing && !crossing.cameras.some(function (camera) { return camera.id === state.camera; })) {
      state.camera = crossing.cameras[0] ? crossing.cameras[0].id : "";
    }
    var trendSelect = byId("trendCrossing");
    if (trendSelect) trendSelect.value = id;
    updateUrl();
    renderCamera();
    renderWarnings();
    loadTrend();
    track("select_crossing", { crossing: id });
    if (shouldScroll && byId("cameraSection")) {
      byId("cameraSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderCamera() {
    if (!liveData || pageType !== "main") return;
    var crossing = crossingById(state.crossing) || liveData.crossings[0];
    if (!crossing) return;
    if (!state.camera || !crossing.cameras.some(function (camera) { return camera.id === state.camera; })) {
      state.camera = crossing.cameras[0] ? crossing.cameras[0].id : "";
    }
    var metadata = cameraMetadata(state.camera);
    if (!metadata) return;
    var image = byId("cameraImage");
    var unavailable = byId("cameraUnavailable");
    var title = byId("cameraTitle");
    var description = byId("cameraDescription");
    var source = byId("cameraSource");
    var note = byId("cameraNote");
    var liveVideo = byId("liveVideoLinks");

    all("[data-camera]").forEach(function (button) {
      var selected = button.dataset.camera === state.camera;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    image.hidden = false;
    unavailable.hidden = true;
    image.alt =
      metadata.camera.label +
      ", " +
      metadata.camera.description +
      " near " +
      metadata.crossing.name;
    image.src =
      metadata.camera.image_url +
      "&refresh=" +
      Math.floor(Date.now() / REFRESH_MS);
    title.textContent = metadata.camera.label;
    description.textContent =
      metadata.camera.description + " · " + metadata.camera.source_name;
    source.href = metadata.camera.source_url;
    note.textContent = metadata.crossing.camera_note;

    liveVideo.textContent = "";
    if (metadata.crossing.live_video && metadata.crossing.live_video.length) {
      var lead = document.createElement("strong");
      lead.textContent = "Official Sault Ste. Marie live video: ";
      liveVideo.appendChild(lead);
      metadata.crossing.live_video.forEach(function (video, index) {
        var link = document.createElement("a");
        link.href = video.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = video.label;
        liveVideo.appendChild(link);
        if (index < metadata.crossing.live_video.length - 1) {
          liveVideo.appendChild(document.createTextNode(" · "));
        }
      });
      liveVideo.hidden = false;
    } else {
      liveVideo.hidden = true;
    }
  }

  function appendAlert(list, headline, detail, link) {
    var item = document.createElement("li");
    item.className = "alert-item";
    var strong = document.createElement("strong");
    strong.textContent = headline;
    item.appendChild(strong);
    if (detail) {
      var span = document.createElement("span");
      span.textContent = detail;
      item.appendChild(span);
    }
    if (link) {
      var source = document.createElement("a");
      source.href = link;
      source.target = "_blank";
      source.rel = "noopener";
      source.textContent = "Official details";
      item.appendChild(source);
    }
    list.appendChild(item);
  }

  function appendAllClear(list, message) {
    var item = document.createElement("li");
    item.className = "all-clear";
    item.textContent = message;
    list.appendChild(item);
  }

  function weatherRegionForCrossing(crossing) {
    if (!crossing) return "";
    if (crossing.id === "blue-water") return "port-huron";
    if (crossing.id === "sault-ste-marie") return "sault-ste-marie";
    return "detroit";
  }

  function renderWarnings() {
    if (!liveData || pageType !== "main") return;
    var crossing = crossingById(state.crossing);
    if (!crossing) return;
    var roadList = byId("roadEventList");
    var weatherList = byId("weatherAlertList");
    var roadContext = byId("roadWarningContext");
    var weatherContext = byId("weatherWarningContext");
    roadList.textContent = "";
    weatherList.textContent = "";
    roadContext.textContent =
      "Ontario 511 events within 25 miles of " + crossing.short_name + ".";
    weatherContext.textContent =
      "Active National Weather Service alerts for the " + crossing.region + " corridor.";

    if (!crossing.approach_traffic.available) {
      appendAlert(
        roadList,
        "Ontario approach feed temporarily unavailable",
        "Use the Ontario 511 and Mi Drive links below before travel.",
        "https://511on.ca/",
      );
    } else if (!crossing.approach_traffic.events.length && !liveData.warnings.ontario.length) {
      appendAllClear(roadList, "No nearby Ontario 511 road event is currently reported.");
    } else {
      crossing.approach_traffic.events.forEach(function (event) {
        appendAlert(
          roadList,
          event.description,
          [
            event.roadway,
            event.direction,
            event.distance_miles + " mi from crossing",
            event.lanes_affected,
          ]
            .filter(Boolean)
            .join(" · "),
          event.source_url,
        );
      });
      liveData.warnings.ontario.forEach(function (alert) {
        appendAlert(
          roadList,
          alert.headline,
          alert.regions.length ? alert.regions.join(", ") : "Ontario travel alert",
          alert.source_url,
        );
      });
    }

    var region = weatherRegionForCrossing(crossing);
    var alerts = liveData.warnings.weather.filter(function (alert) {
      return alert.region_id === region;
    });
    if (!liveData.sources.weather_alerts.available) {
      appendAlert(
        weatherList,
        "Weather alert feed temporarily unavailable",
        "Check the National Weather Service directly.",
        "https://www.weather.gov/",
      );
    } else if (!alerts.length) {
      appendAllClear(weatherList, "No active NWS warning is currently returned for this corridor.");
    } else {
      alerts.forEach(function (alert) {
        appendAlert(
          weatherList,
          alert.headline,
          [alert.severity, alert.ends_at ? "Ends " + formatClock(alert.ends_at) : ""]
            .filter(Boolean)
            .join(" · "),
          alert.source_url,
        );
      });
    }
  }

  function currentTrendLane() {
    var lanes = allowedLanes("to_us", state.vehicle);
    return lanes.includes(state.lane) ? state.lane : "standard";
  }

  function renderTrendChart(trend, chart, status, legend) {
    if (!trend.available || !trend.hours || !trend.hours.length) {
      chart.hidden = true;
      legend.hidden = true;
      status.hidden = false;
      status.textContent = trend.note || "Official hourly history is not available for this crossing.";
      return;
    }
    var maximum = Math.max(
      5,
      ...trend.hours.flatMap(function (hour) {
        return [hour.today_minutes || 0, hour.typical_minutes || 0];
      }),
    );
    var bars = document.createElement("div");
    bars.className = "trend-bars";
    trend.hours.forEach(function (hour) {
      var wrapper = document.createElement("div");
      wrapper.className = "trend-hour";
      wrapper.setAttribute(
        "aria-label",
        hour.hour +
          ":00: today " +
          (hour.today_minutes == null ? "not reported" : hour.today_minutes + " minutes") +
          ", typical " +
          (hour.typical_minutes == null ? "not reported" : hour.typical_minutes + " minutes"),
      );
      var today = document.createElement("span");
      today.className = "bar today";
      today.style.height =
        hour.today_minutes == null ? "0" : Math.max(2, (hour.today_minutes / maximum) * 100) + "%";
      today.title =
        hour.today_minutes == null ? "Today not reported" : "Today: " + hour.today_minutes + " min";
      var typical = document.createElement("span");
      typical.className = "bar typical";
      typical.style.height =
        hour.typical_minutes == null
          ? "0"
          : Math.max(2, (hour.typical_minutes / maximum) * 100) + "%";
      typical.title =
        hour.typical_minutes == null
          ? "Typical not reported"
          : "Typical: " + hour.typical_minutes + " min";
      var label = document.createElement("span");
      label.className = "hour-label";
      label.textContent =
        hour.hour % 3 === 0
          ? hour.hour === 0
            ? "12a"
            : hour.hour < 12
              ? hour.hour + "a"
              : hour.hour === 12
                ? "12p"
                : hour.hour - 12 + "p"
          : "";
      wrapper.appendChild(today);
      wrapper.appendChild(typical);
      wrapper.appendChild(label);
      bars.appendChild(wrapper);
    });
    chart.textContent = "";
    chart.appendChild(bars);
    chart.hidden = false;
    legend.hidden = false;
    status.hidden = false;
    status.textContent =
      trend.crossing_name +
      " · " +
      vehicleLabel(trend.vehicle) +
      " " +
      laneLabel(trend.lane) +
      " · " +
      trend.date +
      ". Historical context only—not a forecast.";
  }

  async function loadTrend() {
    if (!liveData || pageType !== "main") return;
    var chart = byId("trendChart");
    var status = byId("trendStatus");
    var legend = byId("trendLegend");
    if (!chart || !status || !legend) return;
    var vehicle = state.vehicle;
    var lane = currentTrendLane();
    var key = [state.crossing, vehicle, lane].join(":");
    if (key === trendRequestKey) return;
    trendRequestKey = key;
    if (trendAbortController) trendAbortController.abort();
    trendAbortController = new AbortController();
    chart.hidden = true;
    legend.hidden = true;
    status.hidden = false;
    status.textContent = "Loading official CBP hourly context…";
    try {
      var response = await fetch(
        TREND_URL +
          "?crossing=" +
          encodeURIComponent(state.crossing) +
          "&vehicle=" +
          encodeURIComponent(vehicle) +
          "&lane=" +
          encodeURIComponent(lane),
        { signal: trendAbortController.signal },
      );
      if (!response.ok) throw new Error("Trend request failed");
      renderTrendChart(await response.json(), chart, status, legend);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      chart.hidden = true;
      legend.hidden = true;
      status.textContent =
        "Official hourly context is temporarily unavailable. Current live waits above are unaffected.";
    }
  }

  function renderMain() {
    adjustLane();
    setPressed("[data-direction]", "direction", state.direction);
    setPressed("[data-vehicle]", "vehicle", state.vehicle);
    renderComparison();
    renderCorridor("blue-water");
    renderCorridor("sault-ste-marie");
    var freshness = byId("freshnessTime");
    if (freshness) freshness.textContent = formatClock(liveData.fetched_at);
    renderCamera();
    renderWarnings();
    loadTrend();
    updateUrl();
  }

  function renderDetail() {
    var crossing = crossingById(detailId);
    if (!crossing) return;
    state.crossing = detailId;
    adjustLane();
    setPressed("[data-detail-direction]", "detailDirection", state.direction);
    setPressed("[data-detail-vehicle]", "detailVehicle", state.vehicle);
    var lane = getLane(crossing);
    var wait = byId("detailWait");
    var headline = byId("detailLiveHeadline");
    var note = byId("detailWaitNote");
    var source = byId("detailOfficialSource");
    var updated = byId("detailUpdated");
    var port = byId("detailPortStatus");
    var toll = byId("detailToll");
    var tollNote = byId("detailTollNote");
    var directionText = directionLabel(state.direction);

    wait.textContent = formatWait(lane);
    wait.classList.toggle(
      "is-long",
      Boolean(lane && Number.isFinite(lane.wait_minutes) && lane.wait_minutes >= 30),
    );
    headline.textContent =
      directionText + " at " + crossing.short_name + " · " + vehicleLabel(state.vehicle);
    note.textContent =
      crossing.waits[state.direction].note +
      (lane && lane.lanes_open != null ? " " + lane.lanes_open + " lane(s) currently reported open." : "");
    source.href = crossing.waits[state.direction].source_url;
    source.textContent = crossing.waits[state.direction].source;
    updated.textContent =
      "Agency update: " + formatAgencyUpdate(lane);
    port.textContent =
      crossing.status.port === "closed"
        ? "Port closed"
        : crossing.status.port === "open"
          ? "Port reported open"
          : "Port status unavailable";
    port.className = "status-pill";

    var tollDirection = state.direction === "to_us" ? "to_us" : "to_canada";
    toll.textContent = crossing.tolls[tollDirection].label;
    tollNote.textContent =
      crossing.tolls[tollDirection].note +
      " Effective " +
      crossing.tolls[tollDirection].effective +
      ".";

    renderDetailCamera(crossing);
    renderDetailWarnings(crossing);
    updateUrl();
  }

  function renderDetailCamera(crossing) {
    var image = byId("detailCameraImage");
    var caption = byId("detailCameraCaption");
    if (!image || !crossing.cameras.length) return;
    var requested = image.dataset.cameraId;
    var camera =
      crossing.cameras.find(function (candidate) {
        return candidate.id === requested;
      }) || crossing.cameras[0];
    image.dataset.cameraId = camera.id;
    image.hidden = false;
    image.alt = camera.label + ", " + camera.description + " near " + crossing.name;
    image.src = camera.image_url + "&refresh=" + Math.floor(Date.now() / REFRESH_MS);
    caption.textContent =
      camera.label +
      " · " +
      camera.description +
      " · " +
      camera.source_name +
      ". Camera context is not a measured wait time.";
    all("[data-detail-camera]").forEach(function (button) {
      var selected = button.dataset.detailCamera === camera.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    var videoBox = byId("detailVideoLinks");
    if (videoBox) {
      videoBox.textContent = "";
      if (crossing.live_video && crossing.live_video.length) {
        var lead = document.createElement("strong");
        lead.textContent = "Official live video: ";
        videoBox.appendChild(lead);
        crossing.live_video.forEach(function (video, index) {
          var link = document.createElement("a");
          link.href = video.url;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = video.label;
          videoBox.appendChild(link);
          if (index < crossing.live_video.length - 1) {
            videoBox.appendChild(document.createTextNode(" · "));
          }
        });
        videoBox.hidden = false;
      } else {
        videoBox.hidden = true;
      }
    }
  }

  function renderDetailWarnings(crossing) {
    var roadList = byId("detailRoadEvents");
    var weatherList = byId("detailWeatherAlerts");
    if (roadList) {
      roadList.textContent = "";
      if (!crossing.approach_traffic.available) {
        appendAlert(
          roadList,
          "Ontario approach feed temporarily unavailable",
          "Check Ontario 511 directly.",
          "https://511on.ca/",
        );
      } else if (!crossing.approach_traffic.events.length) {
        appendAllClear(roadList, "No nearby Ontario 511 road event is currently reported.");
      } else {
        crossing.approach_traffic.events.forEach(function (event) {
          appendAlert(
            roadList,
            event.description,
            [event.roadway, event.direction, event.distance_miles + " mi away"].filter(Boolean).join(" · "),
            event.source_url,
          );
        });
      }
    }
    if (weatherList) {
      weatherList.textContent = "";
      var region = weatherRegionForCrossing(crossing);
      var alerts = liveData.warnings.weather.filter(function (alert) {
        return alert.region_id === region;
      });
      if (!liveData.sources.weather_alerts.available) {
        appendAlert(
          weatherList,
          "Weather alert feed temporarily unavailable",
          "Check the NWS directly.",
          "https://www.weather.gov/",
        );
      } else if (!alerts.length) {
        appendAllClear(weatherList, "No active NWS warning is currently returned for this corridor.");
      } else {
        alerts.forEach(function (alert) {
          appendAlert(weatherList, alert.headline, alert.severity, alert.source_url);
        });
      }
    }
  }

  function renderFailure() {
    var dot = byId("liveDot");
    var ribbon = byId("ribbonStatus");
    if (dot) {
      dot.classList.remove("is-loading", "is-live");
      dot.classList.add("is-degraded");
    }
    if (ribbon) ribbon.textContent = "Live reports temporarily unavailable · use official links";
    if (pageType === "main") {
      var headline = byId("comparisonHeadline");
      var note = byId("comparisonNote");
      if (headline) headline.textContent = "Official wait comparison is temporarily unavailable";
      if (note) note.textContent = "No zero-minute or open status has been assumed. Use the official CBP and CBSA links below.";
      all("[data-crossing-result]").forEach(function (card) {
        card.classList.add("is-unavailable");
        card.querySelector('[data-role="wait"]').textContent = "Not reported";
        card.querySelector('[data-role="kicker"]').textContent = "Live source unavailable";
      });
    } else if (pageType === "detail") {
      byId("detailWait").textContent = "Not reported";
      byId("detailLiveHeadline").textContent = "Official live report temporarily unavailable";
      byId("detailWaitNote").textContent =
        "No wait or open status has been assumed. Use the official agency link on this page.";
    }
  }

  async function loadData(manual) {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    var refreshButton = byId("refreshButton") || byId("detailRefreshButton");
    if (refreshButton) refreshButton.disabled = true;
    try {
      var response = await fetch(
        API_URL + "?refresh=" + Math.floor(Date.now() / REFRESH_MS),
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Live border request failed");
      liveData = await response.json();
      updateRibbon(liveData);
      if (pageType === "main") renderMain();
      if (pageType === "detail") renderDetail();
      if (manual) track("manual_refresh");
    } catch (error) {
      renderFailure();
    } finally {
      if (refreshButton) refreshButton.disabled = false;
      refreshTimer = window.setTimeout(function () {
        loadData(false);
      }, REFRESH_MS);
    }
  }

  async function shareComparison() {
    updateUrl();
    var url = window.location.href;
    var title =
      "Michigan border waits · " +
      directionLabel(state.direction) +
      " · " +
      vehicleLabel(state.vehicle);
    var status = byId("shareStatus");
    try {
      if (navigator.share) {
        await navigator.share({ title: title, url: url });
        if (status) status.textContent = "Share sheet opened.";
      } else {
        await navigator.clipboard.writeText(url);
        if (status) status.textContent = "Current comparison link copied.";
        var button = byId("shareButton");
        if (button) {
          var old = button.textContent;
          button.textContent = "Link copied";
          window.setTimeout(function () {
            button.textContent = old;
          }, 1800);
        }
      }
      track("share_comparison");
    } catch (error) {
      if (status) status.textContent = "Could not share automatically. Copy the page address from your browser.";
    }
  }

  function bindMain() {
    all("[data-direction]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.direction = button.dataset.direction;
        adjustLane();
        renderMain();
        track("change_direction");
      });
    });
    all("[data-vehicle]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.vehicle = button.dataset.vehicle;
        adjustLane();
        trendRequestKey = "";
        renderMain();
        track("change_vehicle");
      });
    });
    byId("laneSelect").addEventListener("change", function (event) {
      state.lane = event.target.value;
      trendRequestKey = "";
      renderMain();
      track("change_lane");
    });
    all("[data-select-crossing]").forEach(function (button) {
      button.addEventListener("click", function () {
        chooseCrossing(button.dataset.selectCrossing, true);
      });
    });
    all("[data-camera]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.camera = button.dataset.camera;
        state.crossing = button.dataset.cameraCrossing;
        var trendSelect = byId("trendCrossing");
        if (trendSelect) trendSelect.value = state.crossing;
        renderCamera();
        renderWarnings();
        trendRequestKey = "";
        loadTrend();
        updateUrl();
        track("change_camera", { crossing: state.crossing });
      });
    });
    byId("cameraImage").addEventListener("error", function () {
      byId("cameraImage").hidden = true;
      byId("cameraUnavailable").hidden = false;
    });
    byId("cameraImage").addEventListener("load", function () {
      byId("cameraImage").hidden = false;
      byId("cameraUnavailable").hidden = true;
    });
    byId("refreshButton").addEventListener("click", function () {
      loadData(true);
    });
    byId("shareButton").addEventListener("click", shareComparison);
    byId("trendCrossing").addEventListener("change", function (event) {
      trendRequestKey = "";
      chooseCrossing(event.target.value, false);
    });
  }

  function bindDetail() {
    all("[data-detail-direction]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.direction = button.dataset.detailDirection;
        adjustLane();
        renderDetail();
        track("change_direction");
      });
    });
    all("[data-detail-vehicle]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.vehicle = button.dataset.detailVehicle;
        adjustLane();
        renderDetail();
        track("change_vehicle");
      });
    });
    var lane = byId("detailLaneSelect");
    if (lane) {
      lane.addEventListener("change", function (event) {
        state.lane = event.target.value;
        renderDetail();
        track("change_lane");
      });
    }
    all("[data-detail-camera]").forEach(function (button) {
      button.addEventListener("click", function () {
        var image = byId("detailCameraImage");
        image.dataset.cameraId = button.dataset.detailCamera;
        renderDetailCamera(crossingById(detailId));
        track("change_camera");
      });
    });
    var image = byId("detailCameraImage");
    if (image) {
      image.addEventListener("error", function () {
        image.hidden = true;
        var caption = byId("detailCameraCaption");
        if (caption) {
          caption.textContent =
            "Live camera temporarily unavailable. The official wait report above is unaffected.";
        }
      });
    }
    var refresh = byId("detailRefreshButton");
    if (refresh) {
      refresh.addEventListener("click", function () {
        loadData(true);
      });
    }
  }

  adjustLane();
  if (pageType === "main") bindMain();
  if (pageType === "detail") bindDetail();
  loadData(false);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && liveData) {
      var age = Date.now() - Date.parse(liveData.fetched_at);
      if (age > REFRESH_MS) loadData(false);
    }
  });
})();
