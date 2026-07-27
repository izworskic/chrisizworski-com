(function () {
  "use strict";

  var API_URL = "/api/mackinac";
  var STATUS_KEY = "mackinac-bridge-live:last-status:v1";
  var ALERT_KEY = "mackinac-bridge-live:page-alerts:v1";
  var DETROIT_ZONE = "America/Detroit";
  var FALLBACK_CAMERAS = [
    {
      id: "south",
      label: "St. Ignace looking south",
      image_url: "https://www.mackinacbridge.org/wp-content/camimages/MacBridge_image2_large.jpg",
    },
    {
      id: "north",
      label: "Mackinaw City looking north",
      image_url: "https://www.mackinacbridge.org/wp-content/camimages/MacBridge_image4_medium.jpg",
    },
  ];

  var STATUS_META = {
    open: { ribbon: "OPEN", icon: "✓", ring: "#75d6a7" },
    advisory: { ribbon: "ADVISORY", icon: "!", ring: "#e7bd60" },
    escort: { ribbon: "ESCORTS", icon: "E", ring: "#ef8849" },
    partial: { ribbon: "PARTIAL CLOSURE", icon: "!", ring: "#dc655c" },
    closed: { ribbon: "CLOSED", icon: "×", ring: "#cc4b52" },
    unknown: { ribbon: "VERIFY STATUS", icon: "?", ring: "#aab3b0" },
  };

  var VEHICLES = {
    car: { label: "Car or SUV", highProfile: false },
    rv: { label: "RV or camper", highProfile: true },
    trailer: { label: "Vehicle towing a trailer", highProfile: true },
    high: { label: "Van or high-profile pickup", highProfile: true },
  };

  var state = {
    data: null,
    vehicle: "car",
    direction: "northbound",
    camera: "south",
    selectedHour: null,
    bestWindow: null,
    loading: false,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function track(action, detail) {
    if (typeof window.va !== "function") return;
    window.va("event", {
      name: "Bridge Tool Interaction",
      data: Object.assign({ action: action }, detail || {}),
    });
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // The tool still works when storage is blocked.
    }
  }

  function cardinalDirection(degrees) {
    if (!Number.isFinite(Number(degrees))) return "Direction unavailable";
    var points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return points[Math.round(Number(degrees) / 45) % 8] + " wind";
  }

  function formatDetroitTime(value, options) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";
    return new Intl.DateTimeFormat(
      "en-US",
      Object.assign({ timeZone: DETROIT_ZONE }, options || {}),
    ).format(date);
  }

  function formatObserved(observation) {
    if (!observation) return "Observation unavailable";
    if (observation.stale) return observation.station_name + " reading may be stale";
    if (Number.isFinite(observation.age_minutes) && observation.age_minutes < 2) {
      return observation.station_name + " just now";
    }
    if (Number.isFinite(observation.age_minutes)) {
      return observation.station_name + " " + observation.age_minutes + " min ago";
    }
    return observation.station_name;
  }

  function detroitParts(value) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DETROIT_ZONE,
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    var output = {};
    parts.forEach(function (part) {
      output[part.type] = part.value;
    });
    return {
      weekday: output.weekday || "",
      hour: Number.parseInt(output.hour, 10),
    };
  }

  function formatForecastTime(value) {
    var day = formatDetroitTime(value, { weekday: "short" });
    var time = formatDetroitTime(value, { hour: "numeric" });
    return day + " " + time;
  }

  function formatForecastLong(value) {
    return formatDetroitTime(value, {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatWindow(hours) {
    if (!hours || !hours.length) return "No forecast window available";
    var first = hours[0];
    var last = hours[hours.length - 1];
    var firstDay = formatDetroitTime(first.start_time, { weekday: "short", month: "short", day: "numeric" });
    var firstTime = formatDetroitTime(first.start_time, { hour: "numeric" });
    var endTime = formatDetroitTime(last.end_time, { hour: "numeric" });
    return firstDay + ", " + firstTime + "–" + endTime;
  }

  function isHighProfile() {
    return VEHICLES[state.vehicle].highProfile;
  }

  function noteMatchesDirection(note) {
    var text = String(note || "").toLowerCase();
    if (state.direction === "southbound") return /\bsb\b|southbound/.test(text);
    return /\bnb\b|northbound/.test(text);
  }

  function laneImpact() {
    var notes = state.data?.official?.traffic_notes || [];
    if (!notes.length) return { penalty: 0, matching: null, general: null };
    var matching = notes.find(noteMatchesDirection) || null;
    return {
      penalty: matching ? 8 : 4,
      matching: matching,
      general: notes[0],
    };
  }

  function officialBridgeWind() {
    return state.data?.official?.bridge_wind || null;
  }

  function windMismatch() {
    var bridge = officialBridgeWind();
    var nearby = state.data?.current_wind;
    if (!bridge || !Number.isFinite(Number(bridge.min_mph))) return false;

    var nearbyValues = [nearby?.wind_mph, nearby?.gust_mph]
      .map(Number)
      .filter(Number.isFinite);
    if (!nearbyValues.length) return false;

    return Number(bridge.min_mph) - Math.max.apply(null, nearbyValues) >= 5;
  }

  function formatNearbyWind(observation) {
    if (!observation || !Number.isFinite(Number(observation.wind_mph))) {
      return "Unavailable";
    }
    var value = Number(observation.wind_mph).toFixed(1) + " mph";
    if (Number.isFinite(Number(observation.gust_mph))) {
      value += " • gust " + Number(observation.gust_mph).toFixed(1) + " mph";
    }
    return value;
  }

  function currentConfidence() {
    if (!state.data?.official) {
      return { score: 15, label: "Verify official status", level: "unknown" };
    }

    var officialLevel = state.data.official.level || "unknown";
    var highProfile = isHighProfile();
    var scores = highProfile
      ? { open: 91, advisory: 56, escort: 30, partial: 0, closed: 0, unknown: 15 }
      : { open: 95, advisory: 80, escort: 72, partial: 50, closed: 0, unknown: 20 };
    var score = scores[officialLevel] ?? scores.unknown;
    var observation = state.data.current_wind;
    var wind = Number(observation?.wind_mph);
    var gust = Number(observation?.gust_mph);

    if (Number.isFinite(wind)) {
      if (highProfile) {
        if (wind >= 65) score = Math.min(score, 0);
        else if (wind >= 50) score = Math.min(score, 5);
        else if (wind >= 35) score = Math.min(score, 32);
        else if (wind >= 20) score = Math.min(score, 58);
      } else {
        if (wind >= 65) score = Math.min(score, 5);
        else if (wind >= 50) score = Math.min(score, 42);
        else if (wind >= 35) score = Math.min(score, 62);
        else if (wind >= 20) score = Math.min(score, 77);
      }
    }

    if (Number.isFinite(gust)) {
      if (gust >= 50) score -= highProfile ? 14 : 7;
      else if (gust >= 35) score -= highProfile ? 8 : 4;
      else if (gust >= 25) score -= highProfile ? 4 : 2;
    }

    var officialCaps = highProfile
      ? { advisory: 55, escort: 30, partial: 0, closed: 0 }
      : { advisory: 69, escort: 64, partial: 45, closed: 0 };
    if (Number.isFinite(officialCaps[officialLevel])) {
      score = Math.min(score, officialCaps[officialLevel]);
    }

    var currentHour = state.data.forecast?.hours?.[0];
    var weather = String(currentHour?.summary || "").toLowerCase();
    if (/thunder|freezing|ice|snow|whiteout/.test(weather)) score -= 8;
    else if (/fog|heavy rain/.test(weather)) score -= 4;

    score -= laneImpact().penalty;
    if (observation?.stale) score -= 8;
    if (!state.data.official.available) score = Math.min(score, 20);
    score = clamp(Math.round(score), 0, 100);

    var label = "Do not proceed";
    if (score >= 85) label = "High confidence";
    else if (score >= 70) label = "Good with awareness";
    else if (score >= 50) label = "Use caution";
    else if (score >= 25) label = "Restrictions likely";

    return { score: score, label: label, level: officialLevel };
  }

  function forecastSuitability(hour) {
    if (!hour || !Number.isFinite(Number(hour.wind_mph))) return 0;
    var highProfile = isHighProfile();
    var wind = Number(hour.wind_mph);
    var gust = Number(hour.gust_mph);
    var score = 98;

    if (highProfile) {
      if (wind >= 65) score = 0;
      else if (wind >= 50) score = 4;
      else if (wind >= 35) score = 24;
      else if (wind >= 20) score = 55;
      else score -= wind * 0.75;
    } else {
      if (wind >= 65) score = 0;
      else if (wind >= 50) score = 34;
      else if (wind >= 35) score = 58;
      else if (wind >= 20) score = 76;
      else score -= wind * 0.45;
    }

    if (Number.isFinite(gust)) {
      score -= highProfile ? Math.max(0, gust - 15) * 0.55 : Math.max(0, gust - 20) * 0.25;
    }

    var weather = String(hour.summary || "").toLowerCase();
    if (/thunder/.test(weather)) score -= 20;
    if (/freezing|ice|snow|whiteout/.test(weather)) score -= 25;
    else if (/fog/.test(weather)) score -= 10;
    else if (/rain|shower/.test(weather)) score -= 6;
    if (Number(hour.precip_probability) >= 60) score -= 6;

    var parts = detroitParts(hour.start_time);
    if (["Fri", "Sat", "Sun"].includes(parts.weekday) && parts.hour >= 10 && parts.hour < 16) {
      score -= 12;
    }
    score -= laneImpact().penalty;
    return clamp(Math.round(score), 0, 100);
  }

  function computeBestWindow() {
    if (state.data?.official?.level !== "open") {
      state.bestWindow = null;
      return;
    }

    var hours = state.data?.forecast?.hours || [];
    var now = Date.now() - 30 * 60 * 1000;
    var candidates = hours
      .map(function (hour, index) {
        return { hour: hour, index: index, score: forecastSuitability(hour) };
      })
      .filter(function (entry) {
        return Date.parse(entry.hour.end_time) > now;
      })
      .slice(0, 24);

    if (!candidates.length) {
      state.bestWindow = null;
      return;
    }

    var best = null;
    candidates.forEach(function (entry, candidateIndex) {
      var next = candidates[candidateIndex + 1];
      var pair = next ? [entry, next] : [entry];
      var average = pair.reduce(function (sum, item) {
        return sum + item.score;
      }, 0) / pair.length;
      if (!best || average > best.score) {
        best = { entries: pair, score: average };
      }
    });

    state.bestWindow = {
      indices: best.entries.map(function (entry) {
        return entry.index;
      }),
      hours: best.entries.map(function (entry) {
        return entry.hour;
      }),
      score: Math.round(best.score),
    };
  }

  function setText(id, value) {
    var element = byId(id);
    if (element) element.textContent = value;
  }

  function renderOfficialStatus() {
    var official = state.data?.official;
    var level = official?.level || "unknown";
    var meta = STATUS_META[level] || STATUS_META.unknown;
    var statusCard = byId("statusCard");
    statusCard.classList.remove("is-loading");
    statusCard.dataset.level = level;

    setText("ribbonStatus", official?.title || "Official status unavailable");
    setText("ribbonTime", official?.updated_text ? "• " + official.updated_text : "");
    byId("liveDot").className = "live-dot " + level;
    setText("officialPill", "OFFICIAL " + meta.ribbon);
    setText("officialUpdated", official?.updated_text || "Current report time unavailable");
    setText("officialStatusHeading", official?.title || "Verify the official bridge status");
    setText(
      "officialMessage",
      official?.message ||
        "The live Bridge Authority report could not be read. Open the official source before traveling.",
    );

    var bridgeWind = officialBridgeWind();
    if (bridgeWind) {
      setText("bridgeWind", bridgeWind.label);
      setText("bridgeWindDetail", "Authority warning band • sustained wind");
    } else if (level === "open") {
      setText("bridgeWind", "No wind restriction");
      setText("bridgeWindDetail", "Exact bridge wind and gust are not published");
    } else if (official?.wind_related) {
      setText("bridgeWind", "Wind restriction active");
      setText("bridgeWindDetail", "Exact bridge reading is not published");
    } else {
      setText("bridgeWind", "Not publicly reported");
      setText("bridgeWindDetail", "Use the official status above");
    }

    var wind = state.data?.current_wind;
    setText("nearbyWind", formatNearbyWind(wind));
    setText(
      "nearbyWindDetail",
      wind
        ? formatObserved(wind) + " • off-bridge • " + cardinalDirection(wind.wind_direction_degrees)
        : "NOAA off-bridge feed unavailable",
    );

    var mismatchNotice = byId("windMismatchNotice");
    if (windMismatch()) {
      mismatchNotice.hidden = false;
      mismatchNotice.textContent =
        "Wind readings differ: the official report places bridge conditions in the " +
        bridgeWind.label +
        " sustained-wind band, while nearby off-bridge NOAA reports " +
        Number(wind.wind_mph).toFixed(1) +
        " mph sustained" +
        (Number.isFinite(Number(wind.gust_mph))
          ? " and a " + Number(wind.gust_mph).toFixed(1) + " mph gust"
          : "") +
        ". Use the official bridge report for crossing decisions.";
    } else {
      mismatchNotice.hidden = true;
      mismatchNotice.textContent = "";
    }

    var notes = official?.traffic_notes || [];
    setText("laneSummary", notes[0] || "No lane note posted");
  }

  function renderConfidence() {
    var confidence = currentConfidence();
    var meta = STATUS_META[confidence.level] || STATUS_META.unknown;
    var ring = byId("confidenceRing");
    ring.style.setProperty("--confidence", confidence.score);
    ring.style.setProperty("--ring-color", meta.ring);
    setText("confidenceScore", String(confidence.score));
    setText("confidenceLabel", confidence.label);
    setText(
      "confidenceContext",
      VEHICLES[state.vehicle].label + " • " + (state.direction === "northbound" ? "to U.P." : "to L.P."),
    );
  }

  function appendListItem(list, text) {
    var item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
  }

  function vehicleGuidance(level) {
    var highProfile = isHighProfile();
    if (level === "closed") return "The bridge is closed to every vehicle.";
    if (level === "partial") {
      return highProfile
        ? "Your vehicle is not permitted during a partial closure."
        : "Only passenger vehicles not towing may cross, at no more than 20 mph.";
    }
    if (level === "escort") {
      return highProfile
        ? "Wait in the designated queue for an Authority escort. Do not enter the bridge on your own."
        : "Passenger vehicles may cross, but follow the posted reduced speed and staff instructions.";
    }
    if (level === "advisory") {
      return highProfile
        ? "Travel no faster than 20 mph, turn on your lights, and use the outside lane."
        : "Slow down, turn on your lights, and follow the posted wind instructions.";
    }
    if (level === "open") {
      return highProfile
        ? "Secure awnings, covers, cargo, ladders, and mounted equipment before you approach."
        : "Normal bridge rules apply. The posted maximum speed is 45 mph.";
    }
    return "Open the official Bridge Authority report before leaving.";
  }

  function currentAnswerCopy(level, score) {
    var highProfile = isHighProfile();
    if (level === "closed") {
      return {
        headline: "Do not proceed to the bridge.",
        detail: "The Mackinac Bridge Authority currently reports a full closure.",
      };
    }
    if (level === "partial") {
      return highProfile
        ? {
            headline: "Your vehicle cannot cross right now.",
            detail: "The official report indicates a partial closure affecting high-profile vehicles.",
          }
        : {
            headline: "Passenger vehicles may cross with strict limits.",
            detail: "Do not tow anything, keep to 20 mph or less, and follow all staff directions.",
          };
    }
    if (level === "escort") {
      return highProfile
        ? {
            headline: "Plan to wait for an escort.",
            detail: "The bridge may be open, but your vehicle must cross behind a Bridge Authority vehicle.",
          }
        : {
            headline: "You may cross, but expect wind restrictions.",
            detail: "Passenger traffic can continue while high-profile vehicles are escorted.",
          };
    }
    if (level === "advisory") {
      return {
        headline: highProfile
          ? "You can cross, but expect a slow wind-sensitive trip."
          : "You can cross, but slow down and stay alert.",
        detail: "The Bridge Authority has an active advisory. Follow the posted 20 mph instructions where directed.",
      };
    }
    if (level === "open") {
      return score >= 70
        ? {
            headline: "You should have a straightforward crossing right now.",
            detail: "The Bridge Authority reports the bridge open without a weather restriction.",
          }
        : {
            headline: "The bridge is open, but conditions deserve extra attention.",
            detail: "Nearby weather or lane information lowered the planning score even though the official status is open.",
          };
    }
    return {
      headline: "Check the official report before you leave.",
      detail: "This tool cannot confirm the current Bridge Authority status.",
    };
  }

  function renderCurrentAnswer() {
    var official = state.data?.official || { level: "unknown", title: "Status unavailable" };
    var confidence = currentConfidence();
    var copy = currentAnswerCopy(official.level, confidence.score);
    var answer = byId("personalAnswer");
    answer.dataset.level = official.level || "unknown";
    setText("planningMode", "RIGHT NOW");
    setText("answerIcon", STATUS_META[official.level]?.icon || "?");
    setText("answerOverline", (STATUS_META[official.level]?.ribbon || "VERIFY STATUS") + " • RIGHT NOW");
    setText("answerHeadline", copy.headline);
    setText("answerDetail", copy.detail);

    var list = byId("answerList");
    list.replaceChildren();
    appendListItem(list, vehicleGuidance(official.level));

    var wind = state.data?.current_wind;
    var bridgeWind = officialBridgeWind();
    if (bridgeWind) {
      appendListItem(
        list,
        "Official Authority wind band: " +
          bridgeWind.label +
          " sustained. This is the active restriction band, not an exact live gust.",
      );
    }
    if (windMismatch()) {
      appendListItem(
        list,
        "The off-bridge NOAA reading is much lower than the official bridge band. Do not use it to override the advisory or restriction.",
      );
    }
    if (wind && Number.isFinite(wind.wind_mph)) {
      appendListItem(
        list,
        "Nearby off-bridge NOAA context: " +
          wind.wind_mph.toFixed(1) +
          " mph sustained" +
          (Number.isFinite(wind.gust_mph) ? ", gusting " + wind.gust_mph.toFixed(1) + " mph" : "") +
          ". This is not the bridge gauge.",
      );
    }

    var impact = laneImpact();
    if (impact.matching) {
      appendListItem(list, "Your direction is named in the official note: " + impact.matching);
    } else if (impact.general) {
      appendListItem(list, "Official traffic note: " + impact.general);
    }

    if (official.level === "escort" && isHighProfile()) {
      appendListItem(
        list,
        state.direction === "northbound"
          ? "Queue on the east side after Jamet Street, Exit 339."
          : "Queue on the west side after the toll booths.",
      );
    }
  }

  function forecastBandForVehicle(hour) {
    var wind = Number(hour?.wind_mph);
    if (!Number.isFinite(wind)) return "unknown";
    if (wind >= 65) return "closed";
    if (wind >= 50) return "partial";
    if (wind >= 35) return "escort";
    if (wind >= 20) return "advisory";
    return "open";
  }

  function renderForecastAnswer(hour) {
    var band = forecastBandForVehicle(hour);
    var score = forecastSuitability(hour);
    var highProfile = isHighProfile();
    var headline;
    if (band === "closed") headline = "Forecast wind reaches the full-closure range.";
    else if (band === "partial") {
      headline = highProfile
        ? "Forecast wind reaches the no-high-profile-vehicle range."
        : "Forecast wind reaches the partial-closure range.";
    } else if (band === "escort") {
      headline = highProfile
        ? "Forecast wind reaches the escort range."
        : "A wind-restricted crossing may be possible.";
    } else if (band === "advisory") headline = "Forecast wind reaches the advisory range.";
    else if (score >= 75) headline = "Forecast conditions look favorable for crossing.";
    else headline = "Forecast weather calls for extra caution.";

    var answer = byId("personalAnswer");
    answer.dataset.level = band;
    setText("planningMode", "FORECAST OUTLOOK");
    setText("answerIcon", STATUS_META[band]?.icon || "?");
    setText("answerOverline", "FORECAST OUTLOOK • " + formatForecastTime(hour.start_time).toUpperCase());
    setText("answerHeadline", headline);
    setText(
      "answerDetail",
      "This is a weather estimate for the Mackinaw City approach. The current official status is " +
        (state.data?.official?.title || "unavailable") +
        ", and it cannot predict the Bridge Authority's future decision.",
    );

    var list = byId("answerList");
    list.replaceChildren();
    appendListItem(
      list,
      "Forecast: " +
        hour.wind_mph +
        " mph sustained" +
        (Number.isFinite(hour.gust_mph) ? ", gusting " + hour.gust_mph + " mph" : "") +
        " from " +
        (hour.wind_direction || "an unknown direction") +
        ".",
    );
    appendListItem(
      list,
      hour.summary +
        (Number.isFinite(hour.precip_probability)
          ? " with a " + hour.precip_probability + "% precipitation chance."
          : "."),
    );
    appendListItem(list, vehicleGuidance(band));
    appendListItem(list, "Recheck the official bridge status immediately before leaving.");
  }

  function renderPlanner() {
    if (state.selectedHour != null) {
      var selected = state.data?.forecast?.hours?.[state.selectedHour];
      if (selected) {
        renderForecastAnswer(selected);
        return;
      }
    }
    state.selectedHour = null;
    renderCurrentAnswer();
  }

  function renderBestWindow() {
    var officialLevel = state.data?.official?.level || "unknown";
    var showWindowButton = byId("showWindowButton");
    if (officialLevel !== "open") {
      setText("bestWindow", "No confirmed crossing window");
      setText("bestWindowShort", "No confirmed window");
      setText(
        "bestWindowReason",
        officialLevel === "unknown" ? "Official status unavailable" : "Official restriction active",
      );
      setText(
        "bestWindowDetail",
        officialLevel === "unknown"
          ? "A crossing window cannot be recommended until the official bridge status is available."
          : "The bridge is under an official restriction. An off-bridge approach forecast cannot predict bridge-deck wind or when the Authority will change the status.",
      );
      showWindowButton.disabled = true;
      showWindowButton.textContent = "No official window available";
      return;
    }

    var best = state.bestWindow;
    if (!best) {
      setText("bestWindow", "Hourly forecast unavailable");
      setText("bestWindowShort", "Unavailable");
      setText("bestWindowReason", "Check the NWS source");
      setText("bestWindowDetail", "No reliable hour-by-hour window can be calculated right now.");
      showWindowButton.disabled = true;
      showWindowButton.textContent = "Forecast unavailable";
      return;
    }

    var range = formatWindow(best.hours);
    var peakWind = Math.max.apply(
      null,
      best.hours.map(function (hour) {
        return Number(hour.wind_mph) || 0;
      }),
    );
    var peakGust = Math.max.apply(
      null,
      best.hours.map(function (hour) {
        return Number(hour.gust_mph) || 0;
      }),
    );
    var reason =
      peakWind +
      " mph forecast wind" +
      (peakGust ? ", gusts up to " + peakGust + " mph" : "");

    setText("bestWindow", range);
    setText("bestWindowShort", range);
    setText("bestWindowReason", reason);
    showWindowButton.disabled = false;
    showWindowButton.textContent = "Show in forecast ↓";

    setText(
      "bestWindowDetail",
      "This window has the strongest combined score for your vehicle, forecast wind, weather, and typical peak traffic timing.",
    );
  }

  function renderTraffic() {
    var official = state.data?.official;
    var notes = official?.traffic_notes || [];
    var list = byId("trafficNotes");
    list.replaceChildren();

    if (notes.length) {
      setText("trafficHeadline", "Lane or construction information is posted");
      notes.forEach(function (note) {
        appendListItem(list, note);
      });
    } else if (official?.available) {
      setText("trafficHeadline", "No lane restriction was included in the current report");
      appendListItem(
        list,
        "That does not guarantee a delay-free crossing. Recheck signs and the official report as you approach.",
      );
    } else {
      setText("trafficHeadline", "Official lane information is unavailable");
      appendListItem(list, "Use the Bridge Authority report and MDOT Mi Drive before traveling.");
    }
  }

  function renderForecast() {
    var trackElement = byId("forecastTrack");
    var hours = state.data?.forecast?.hours || [];
    trackElement.replaceChildren();
    trackElement.classList.remove("is-loading");

    if (!hours.length) {
      var placeholder = document.createElement("div");
      placeholder.className = "forecast-placeholder";
      placeholder.textContent = "The NWS hourly forecast is temporarily unavailable.";
      trackElement.appendChild(placeholder);
      byId("forecastDetail").hidden = true;
      return;
    }

    var bestIndices = new Set(
      state.data?.official?.level === "open" ? state.bestWindow?.indices || [] : [],
    );
    hours.slice(0, 30).forEach(function (hour, index) {
      var band = hour.threshold_band || "normal";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "forecast-hour " + band;
      button.dataset.index = String(index);
      button.setAttribute("aria-label", forecastAriaLabel(hour));
      if (bestIndices.has(index)) button.classList.add("is-best");
      if (state.selectedHour === index) button.classList.add("is-selected");

      var time = document.createElement("span");
      time.className = "forecast-time";
      time.textContent = formatForecastTime(hour.start_time);
      button.appendChild(time);

      var wind = document.createElement("strong");
      wind.className = "forecast-wind";
      wind.textContent = Number.isFinite(hour.wind_mph) ? hour.wind_mph : "--";
      var unit = document.createElement("small");
      unit.textContent = " mph";
      wind.appendChild(unit);
      button.appendChild(wind);

      var gust = document.createElement("span");
      gust.className = "forecast-gust";
      gust.textContent = Number.isFinite(hour.gust_mph) ? "Gust " + hour.gust_mph + " mph" : "Gust unavailable";
      button.appendChild(gust);

      var direction = document.createElement("span");
      direction.className = "forecast-dir";
      direction.textContent = hour.wind_direction ? "From " + hour.wind_direction : "Direction unavailable";
      button.appendChild(direction);

      var weather = document.createElement("span");
      weather.className = "forecast-weather";
      weather.textContent = hour.summary || "Forecast available";
      button.appendChild(weather);

      button.addEventListener("click", function () {
        state.selectedHour = index;
        renderForecast();
        renderPlanner();
        renderForecastDetail();
        track("forecast-hour", { hour: index, vehicle: state.vehicle });
      });
      trackElement.appendChild(button);
    });

    renderForecastDetail();
  }

  function forecastAriaLabel(hour) {
    return (
      formatForecastLong(hour.start_time) +
      ": sustained wind " +
      (Number.isFinite(hour.wind_mph) ? hour.wind_mph + " miles per hour" : "unavailable") +
      (Number.isFinite(hour.gust_mph) ? ", gusting " + hour.gust_mph + " miles per hour" : "") +
      ". " +
      (hour.summary || "")
    );
  }

  function renderForecastDetail() {
    var detail = byId("forecastDetail");
    var hour = state.selectedHour == null ? null : state.data?.forecast?.hours?.[state.selectedHour];
    if (!hour) {
      detail.hidden = true;
      return;
    }
    detail.hidden = false;
    setText("forecastDetailTime", formatForecastLong(hour.start_time));
    setText(
      "forecastDetailWind",
      hour.wind_mph +
        " mph" +
        (Number.isFinite(hour.gust_mph) ? " • gust " + hour.gust_mph + " mph" : ""),
    );
    setText(
      "forecastDetailText",
      hour.summary +
        (Number.isFinite(hour.precip_probability)
          ? " • " + hour.precip_probability + "% precipitation chance"
          : "") +
        ". This card uses the Mackinaw City approach forecast, not the bridge gauge.",
    );
  }

  function cameraList() {
    return state.data?.cameras?.length ? state.data.cameras : FALLBACK_CAMERAS;
  }

  function selectedCamera() {
    return cameraList().find(function (camera) {
      return camera.id === state.camera;
    }) || cameraList()[0];
  }

  function refreshCamera() {
    var camera = selectedCamera();
    if (!camera) return;
    var image = byId("cameraImage");
    var loading = byId("cameraLoading");
    image.classList.remove("is-loaded");
    loading.hidden = false;
    loading.textContent = "Loading the latest bridge image...";
    image.alt = "Current Mackinac Bridge camera view from " + camera.label;
    var separator = camera.image_url.includes("?") ? "&" : "?";
    image.src = camera.image_url + separator + "minute=" + Math.floor(Date.now() / 60_000);
    setText(
      "cameraCaption",
      camera.id === "south"
        ? "Camera 2 from the St. Ignace dock looking south."
        : "Camera 4 from Mackinaw City looking north.",
    );
    setText(
      "cameraRefreshed",
      "Requested " + formatDetroitTime(Date.now(), { hour: "numeric", minute: "2-digit" }),
    );
  }

  function renderCameraTabs() {
    document.querySelectorAll(".camera-tab").forEach(function (button) {
      var selected = button.dataset.camera === state.camera;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  }

  function renderAll() {
    renderOfficialStatus();
    computeBestWindow();
    renderConfidence();
    renderPlanner();
    renderBestWindow();
    renderForecast();
    renderTraffic();
    refreshCamera();
  }

  function renderUnavailable(message) {
    var official = {
      available: false,
      level: "unknown",
      title: "Live status temporarily unavailable",
      message:
        message ||
        "This tool could not reach its live data endpoint. Open the official Bridge Authority report before traveling.",
      updated_text: null,
      traffic_notes: [],
    };
    state.data = {
      official: official,
      current_wind: null,
      forecast: { hours: [] },
      cameras: FALLBACK_CAMERAS,
    };
    state.selectedHour = null;
    renderAll();
  }

  async function loadData(options) {
    if (state.loading) return;
    state.loading = true;
    var manual = Boolean(options?.manual);
    var refreshButton = byId("refreshButton");
    refreshButton.disabled = true;

    try {
      var response = await fetch(API_URL + "?minute=" + Math.floor(Date.now() / 60_000), {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("Live endpoint returned " + response.status);
      var data = await response.json();
      state.data = data;
      if (
        state.selectedHour != null &&
        !state.data?.forecast?.hours?.[state.selectedHour]
      ) {
        state.selectedHour = null;
      }
      renderAll();
      checkRestrictionChange(data.official);
      if (manual) track("manual-refresh", { status: data.official?.level || "unknown" });
    } catch (_error) {
      if (!state.data) renderUnavailable();
      else {
        setText("ribbonTime", "• refresh failed; showing last result");
      }
    } finally {
      state.loading = false;
      refreshButton.disabled = false;
    }
  }

  function checkRestrictionChange(official) {
    if (!official?.available) return;
    var signature = [official.level, official.title].join("|");
    var previous = storageGet(STATUS_KEY);
    storageSet(STATUS_KEY, signature);
    if (!previous || previous === signature) return;

    var toast = byId("statusChangeToast");
    toast.hidden = false;
    toast.textContent = "Official bridge status changed: " + official.title;
    window.setTimeout(function () {
      toast.hidden = true;
    }, 12_000);

    if (
      storageGet(ALERT_KEY) === "on" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Mackinac Bridge status changed", {
        body: official.title + ". Open the tool for the full condition report.",
      });
    }
  }

  function updateAlertButton() {
    var button = byId("alertButton");
    if (!("Notification" in window)) {
      button.disabled = true;
      button.textContent = "Page alerts unsupported";
      return;
    }
    var enabled = storageGet(ALERT_KEY) === "on" && Notification.permission === "granted";
    button.textContent = enabled ? "Page alerts on" : "Enable page alerts";
    button.setAttribute("aria-pressed", String(enabled));
  }

  async function toggleAlerts() {
    if (!("Notification" in window)) return;
    var currentlyEnabled = storageGet(ALERT_KEY) === "on" && Notification.permission === "granted";
    if (currentlyEnabled) {
      storageSet(ALERT_KEY, "off");
      updateAlertButton();
      track("page-alerts", { enabled: false });
      return;
    }

    var permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission === "granted") {
      storageSet(ALERT_KEY, "on");
      updateAlertButton();
      new Notification("Mackinac Bridge page alerts are on", {
        body: "Keep this page open and you will be notified when the official restriction status changes.",
      });
      track("page-alerts", { enabled: true });
    } else {
      storageSet(ALERT_KEY, "off");
      setText("alertExplainer", "Browser notifications were not allowed. Use the official text-alert button instead.");
      updateAlertButton();
    }
  }

  function selectVehicle(vehicle) {
    if (!VEHICLES[vehicle]) return;
    state.vehicle = vehicle;
    document.querySelectorAll("[data-vehicle]").forEach(function (button) {
      var selected = button.dataset.vehicle === vehicle;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (state.data) {
      computeBestWindow();
      renderConfidence();
      renderPlanner();
      renderBestWindow();
      renderForecast();
    }
    track("vehicle", { vehicle: vehicle });
  }

  function selectDirection(direction) {
    state.direction = direction;
    document.querySelectorAll("[data-direction]").forEach(function (button) {
      var selected = button.dataset.direction === direction;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (state.data) {
      computeBestWindow();
      renderConfidence();
      renderPlanner();
      renderBestWindow();
      renderForecast();
    }
    track("direction", { direction: direction });
  }

  function setupEvents() {
    byId("refreshButton").addEventListener("click", function () {
      loadData({ manual: true });
    });
    byId("alertButton").addEventListener("click", toggleAlerts);

    document.querySelectorAll("[data-vehicle]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectVehicle(button.dataset.vehicle);
      });
    });
    document.querySelectorAll("[data-direction]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectDirection(button.dataset.direction);
      });
    });
    document.querySelectorAll(".camera-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        state.camera = button.dataset.camera;
        renderCameraTabs();
        refreshCamera();
        track("camera", { camera: state.camera });
      });
    });

    byId("cameraImage").addEventListener("load", function () {
      byId("cameraImage").classList.add("is-loaded");
      byId("cameraLoading").hidden = true;
    });
    byId("cameraImage").addEventListener("error", function () {
      byId("cameraImage").classList.remove("is-loaded");
      byId("cameraLoading").hidden = false;
      byId("cameraLoading").textContent =
        "The camera image is temporarily unavailable. Use the official camera-page link above.";
    });

    byId("clearForecastSelection").addEventListener("click", function () {
      state.selectedHour = null;
      renderForecast();
      renderPlanner();
      track("forecast-clear");
    });

    byId("showWindowButton").addEventListener("click", function () {
      byId("forecastSection").scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(function () {
        var best = document.querySelector(".forecast-hour.is-best");
        if (best) best.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }, 350);
      track("best-window");
    });
  }

  function init() {
    setupEvents();
    updateAlertButton();
    renderCameraTabs();
    refreshCamera();
    loadData();
    window.setInterval(loadData, 60_000);
    window.setInterval(refreshCamera, 60_000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
