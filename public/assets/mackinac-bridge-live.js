(function () {
  "use strict";

  var API_URL = "/api/mackinac";
  var RADAR_LOOP_URL = "https://radar.weather.gov/ridge/standard/KAPX_loop.gif";
  var STATUS_KEY = "mackinac-bridge-live:last-status:v1";
  var ALERT_KEY = "mackinac-bridge-live:page-alerts:v1";
  var HISTORY_KEY = "mackinac-bridge-live:status-history:v1";
  var DETROIT_ZONE = "America/Detroit";
  var FALLBACK_CAMERAS = [
    {
      id: "north",
      label: "Mackinaw City looking north",
      image_url: "https://www.mackinacbridge.org/wp-content/camimages/MacBridge_image4_medium.jpg",
    },
    {
      id: "south",
      label: "St. Ignace looking south",
      image_url: "https://www.mackinacbridge.org/wp-content/camimages/MacBridge_image2_large.jpg",
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
    camera: "north",
    selectedHour: null,
    loading: false,
    assistance: false,
    classifiedVehicle: "car",
    tollDirty: false,
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

  function showWindContextWarning() {
    var official = state.data?.official;
    var nearby = state.data?.current_wind;
    return Boolean(
      official?.wind_related &&
        !["open", "unknown"].includes(official.level) &&
        (Number.isFinite(Number(nearby?.wind_mph)) ||
          Number.isFinite(Number(nearby?.gust_mph))),
    );
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
    var official = state.data?.official;
    if (!official?.available) {
      return {
        code: "VERIFY",
        label: "Verify official status",
        level: "unknown",
        basis: "The official condition report is unavailable, so this tool will not infer a crossing answer.",
      };
    }

    var officialLevel = official.level || "unknown";
    var highProfile = isHighProfile();
    var impact = laneImpact();
    var confidence = {
      code: "VERIFY",
      label: "Verify official status",
      level: officialLevel,
      basis: "The official condition level could not be classified.",
    };

    if (officialLevel === "closed") {
      confidence = {
        code: "CLOSED",
        label: "Cannot cross",
        level: officialLevel,
        basis: "The Bridge Authority reports a full closure for every vehicle.",
      };
    } else if (officialLevel === "partial" && highProfile) {
      confidence = {
        code: "NO",
        label: "Vehicle prohibited",
        level: officialLevel,
        basis: "High-profile vehicles and vehicles towing are prohibited during a partial closure.",
      };
    } else if (officialLevel === "partial") {
      confidence = {
        code: "LIMITED",
        label: "Strict limits",
        level: officialLevel,
        basis: "Only passenger vehicles not towing may cross, subject to the posted restriction.",
      };
    } else if (officialLevel === "escort" && highProfile) {
      confidence = {
        code: "ESCORT",
        label: "Escort required",
        level: officialLevel,
        basis: "Your selected vehicle must wait for a Bridge Authority escort.",
      };
    } else if (officialLevel === "escort") {
      confidence = {
        code: "CAUTION",
        label: "Restricted crossing",
        level: officialLevel,
        basis: "Passenger traffic may continue, but an official wind restriction is active.",
      };
    } else if (officialLevel === "advisory") {
      confidence = {
        code: "CAUTION",
        label: highProfile && official.wind_related ? "Wind-sensitive trip" : "Use caution",
        level: officialLevel,
        basis: official.wind_related
          ? "An official high-wind advisory is active; follow posted speed and lane instructions."
          : "An official weather advisory is active; follow the condition report and posted instructions.",
      };
    } else if (officialLevel === "open" && impact.matching) {
      confidence = {
        code: "AWARE",
        label: "Open with lane note",
        level: officialLevel,
        basis: "The bridge is open, but the official report names your travel direction in a lane note.",
      };
    } else if (officialLevel === "open" && impact.general) {
      confidence = {
        code: "AWARE",
        label: "Open with traffic note",
        level: officialLevel,
        basis: "The bridge is open, with an official lane or construction note to review.",
      };
    } else if (officialLevel === "open") {
      confidence = {
        code: "CLEAR",
        label: "High confidence",
        level: officialLevel,
        basis: "The official report says open and includes no current lane restriction for your selection.",
      };
    }

    return confidence;
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

    var wind = state.data?.current_wind;
    setText("nearbyWind", formatNearbyWind(wind));
    setText(
      "nearbyWindDetail",
      wind
        ? formatObserved(wind) + " • off-bridge • " + cardinalDirection(wind.wind_direction_degrees)
        : "NOAA off-bridge feed unavailable",
    );

    var mismatchNotice = byId("windMismatchNotice");
    if (showWindContextWarning()) {
      mismatchNotice.hidden = false;
      mismatchNotice.textContent =
        "Nearby NOAA is not a bridge reading. The Bridge Authority currently reports " +
        official.title +
        ". Even when the nearby number looks lower, use the official status for crossing decisions.";
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
    ring.style.setProperty("--ring-color", meta.ring);
    ring.dataset.level = confidence.level;
    setText("confidenceScore", confidence.code);
    setText("confidenceLabel", confidence.label);
    setText(
      "confidenceContext",
      VEHICLES[state.vehicle].label + " • " + (state.direction === "northbound" ? "to U.P." : "to L.P."),
    );
    setText("confidenceBasis", confidence.basis);
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
      if (!state.data?.official?.wind_related) {
        return "An official weather advisory is active. Slow down and follow the posted condition-specific instructions.";
      }
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

  function forecastVehicleContext(level) {
    if (level === "closed") {
      return "MDOT closes the bridge at 65 mph sustained wind, but this approach forecast is not the Bridge Authority's deck reading.";
    }
    if (level === "partial") {
      return isHighProfile()
        ? "High-profile vehicles are prohibited during an official partial closure. This approach forecast cannot establish that restriction."
        : "Only passenger vehicles not towing may cross during an official partial closure. This approach forecast cannot establish that restriction.";
    }
    if (level === "escort") {
      return isHighProfile()
        ? "High-profile vehicles need an escort when that official restriction is active. Check the current Bridge Authority report before leaving."
        : "This range can prompt high-profile escorts when confirmed by the Bridge Authority. It does not predict a future restriction.";
    }
    if (level === "advisory") {
      return "This overlaps MDOT's advisory reference range, but only the Bridge Authority can declare a bridge advisory.";
    }
    return "The approach forecast is below MDOT's first wind reference range, but it does not guarantee unrestricted bridge conditions.";
  }

  function currentAnswerCopy(level) {
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
        headline:
          highProfile && state.data?.official?.wind_related
            ? "You can cross, but expect a slow wind-sensitive trip."
            : "You can cross, but slow down and stay alert.",
        detail: state.data?.official?.wind_related
          ? "The Bridge Authority has an active wind advisory. Follow the posted 20 mph instructions where directed."
          : "The Bridge Authority has an active weather advisory. Follow its condition-specific speed and lane instructions.",
      };
    }
    if (level === "open") {
      return laneImpact().general
        ? {
            headline: "The bridge is open; review the current lane note.",
            detail: "The Bridge Authority reports no weather restriction, but it has posted traffic information.",
          }
        : {
            headline: "You should have a straightforward crossing right now.",
            detail: "The Bridge Authority reports the bridge open without a weather restriction.",
          };
    }
    return {
      headline: "Check the official report before you leave.",
      detail: "This tool cannot confirm the current Bridge Authority status.",
    };
  }

  function renderCurrentAnswer() {
    var official = state.data?.official || { level: "unknown", title: "Status unavailable" };
    var copy = currentAnswerCopy(official.level);
    if (state.assistance) {
      if (official.level === "closed") {
        copy = {
          headline: "Driver assistance cannot operate during a closure.",
          detail: "Wait for the official status to show that the bridge has reopened before requesting transport.",
        };
      } else if (official.level === "partial" && isHighProfile()) {
        copy = {
          headline: "Driver assistance does not override this vehicle restriction.",
          detail: "Your selected high-profile vehicle remains prohibited during the reported partial closure.",
        };
      } else if (official.available) {
        copy = {
          headline: "Bridge Authority driver assistance is available 24/7.",
          detail: "The service costs $10 plus the vehicle toll. Follow the direction-specific request instructions below.",
        };
      }
    }
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
    if (showWindContextWarning()) {
      appendListItem(
        list,
        "The nearby NOAA number is not measured on the bridge and must not override the official advisory or restriction.",
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
    if (state.assistance && !["closed", "unknown"].includes(official.level)) {
      appendListItem(
        list,
        state.direction === "northbound"
          ? "For northbound assistance, stop on the wide shoulder just north of Exit 339 near the booth and call 906-643-7600."
          : "For southbound assistance, request service inside the administration building on the north side.",
      );
    }
  }

  function renderAssistanceDirection() {
    setText(
      "assistanceDirection",
      state.direction === "northbound"
        ? "Northbound to the U.P.: stop on the wide shoulder just north of Exit 339 near the booth, then call Bridge Services at 906-643-7600."
        : "Southbound to the L.P.: request driver assistance inside the Bridge Authority administration building on the north side.",
    );
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
    var headline;
    if (band === "closed") headline = "Approach wind is forecast at 65 mph or higher.";
    else if (band === "partial") headline = "Approach wind is forecast in MDOT's 50–64 mph reference range.";
    else if (band === "escort") headline = "Approach wind is forecast in MDOT's 35–49 mph reference range.";
    else if (band === "advisory") headline = "Approach wind is forecast in MDOT's 20–34 mph reference range.";
    else headline = "The approach forecast is below MDOT's first wind reference range.";

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
    appendListItem(list, forecastVehicleContext(band));
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

  function readStatusHistory() {
    try {
      var parsed = JSON.parse(storageGet(HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function currentStatusHistory() {
    var cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return readStatusHistory()
      .filter(function (entry) {
        return Number(entry?.lastSeen) >= cutoff;
      })
      .slice(-12);
  }

  function recordStatusObservation(official) {
    if (!official?.available) return;
    var now = Date.now();
    var history = currentStatusHistory();
    var signature = [official.level, official.title].join("|");
    var latest = history[history.length - 1];

    if (latest?.signature === signature) {
      latest.lastSeen = now;
    } else {
      history.push({
        signature: signature,
        level: official.level || "unknown",
        title: official.title || "Official status",
        firstSeen: now,
        lastSeen: now,
      });
    }
    storageSet(HISTORY_KEY, JSON.stringify(history.slice(-12)));
  }

  function renderStatusHistory() {
    var history = currentStatusHistory();
    var list = byId("statusHistory");
    if (!list) return;
    list.replaceChildren();

    if (!history.length) {
      setText("historySummary", "History begins after this browser successfully checks the official status.");
      return;
    }

    var changeCount = Math.max(0, history.length - 1);
    var first = history[0];
    setText(
      "historySummary",
      changeCount
        ? changeCount +
            (changeCount === 1 ? " status change" : " status changes") +
            " observed on this device since " +
            formatDetroitTime(first.firstSeen, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) +
            "."
        : "No status change observed on this device since " +
            formatDetroitTime(first.firstSeen, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) +
            ".",
    );

    history
      .slice()
      .reverse()
      .forEach(function (entry, index) {
        var item = document.createElement("li");
        item.dataset.level = entry.level || "unknown";

        var marker = document.createElement("i");
        marker.setAttribute("aria-hidden", "true");
        item.appendChild(marker);

        var copy = document.createElement("div");
        var title = document.createElement("strong");
        title.textContent = entry.title;
        copy.appendChild(title);
        var time = document.createElement("span");
        time.textContent =
          (index === 0 ? "Latest check " : "First observed ") +
          formatDetroitTime(index === 0 ? entry.lastSeen : entry.firstSeen, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        copy.appendChild(time);
        item.appendChild(copy);
        list.appendChild(item);
      });
  }

  function renderApproachTraffic() {
    var approach = state.data?.approach_traffic;
    var list = byId("approachEvents");
    if (!list) return;
    list.replaceChildren();

    if (!approach?.available) {
      setText("approachSummary", "The nearby Mi Drive feed is temporarily unavailable; use the direct map link.");
      return;
    }

    var events = Array.isArray(approach.events) ? approach.events : [];
    if (!events.length) {
      setText(
        "approachSummary",
        approach.complete
          ? "No active nearby event was returned by Mi Drive."
          : "No nearby event was returned by the available portion of the Mi Drive feed.",
      );
      return;
    }

    setText(
      "approachSummary",
      events.length +
        (events.length === 1 ? " active event" : " active events") +
        " returned near the bridge. Review the direction and distance before traveling.",
    );
    events.forEach(function (event) {
      var item = document.createElement("li");
      var top = document.createElement("div");
      var title = document.createElement("strong");
      title.textContent = event.title || "Mi Drive event";
      top.appendChild(title);
      if (event.source_url) {
        var link = document.createElement("a");
        link.href = event.source_url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Map ↗";
        top.appendChild(link);
      }
      item.appendChild(top);

      var meta = document.createElement("span");
      var metaParts = [];
      if (event.direction && event.direction !== "both") metaParts.push(event.direction.toUpperCase());
      if (Number.isFinite(Number(event.distance_miles))) {
        metaParts.push(Number(event.distance_miles).toFixed(1) + " mi from bridge");
      }
      meta.textContent = metaParts.join(" • ") || "Near the bridge";
      item.appendChild(meta);

      if (event.summary && event.summary !== event.title) {
        var summary = document.createElement("p");
        summary.textContent = event.summary;
        item.appendChild(summary);
      }
      list.appendChild(item);
    });
  }

  function classifyVehicleFeatures() {
    var selected = Array.from(document.querySelectorAll("[data-vehicle-feature]:checked")).map(function (input) {
      return input.dataset.vehicleFeature;
    });
    if (selected.includes("rv")) return "rv";
    if (selected.includes("trailer")) return "trailer";
    if (selected.includes("pickup") || selected.includes("equipment")) return "high";
    return "car";
  }

  function renderVehicleChecker() {
    var vehicle = classifyVehicleFeatures();
    state.classifiedVehicle = vehicle;
    var result = byId("vehicleCheckerResult");
    if (!result) return;
    var title = result.querySelector("strong");
    var detail = result.querySelector("span");
    var copy = {
      car: [
        "Passenger vehicle",
        "A normal car, SUV, or empty pickup without the listed features is not treated as high-profile by this checker.",
      ],
      rv: [
        "High-profile: RV or camper",
        "Choose the RV or camper profile. Wind advisories, escorts, and partial-closure rules can apply.",
      ],
      trailer: [
        "High-profile: towing",
        "Choose the towing profile. Enclosed trailers and open trailers carrying anything are high-profile.",
      ],
      high: [
        "High-profile: van or pickup",
        "Choose the van / pickup profile because the selected cap, cargo, ladder, toolbox, or equipment catches wind.",
      ],
    }[vehicle];
    title.textContent = copy[0];
    detail.textContent = copy[1];
    result.dataset.classification = vehicle;
  }

  function calculateToll(vehicleClass, leadAxles, towedAxles, motorhomeTowingAuto) {
    var lead = clamp(Math.round(Number(leadAxles) || 2), 2, 12);
    var towed = clamp(Math.round(Number(towedAxles) || 0), 0, 12);
    var isOther = vehicleClass === "other";
    var leadRate = isOther ? 5 : 2;
    var towedRate = isOther && motorhomeTowingAuto && towed > 0 ? 2 : leadRate;
    return {
      total: lead * leadRate + towed * towedRate,
      leadAxles: lead,
      towedAxles: towed,
      leadRate: leadRate,
      towedRate: towedRate,
      exceptionApplied: isOther && motorhomeTowingAuto && towed > 0,
    };
  }

  function renderToll() {
    var classInput = byId("tollClass");
    var leadInput = byId("leadAxles");
    var towedInput = byId("towedAxles");
    var exceptionInput = byId("motorhomeTowingAuto");
    if (!classInput || !leadInput || !towedInput || !exceptionInput) return;

    var result = calculateToll(
      classInput.value,
      leadInput.value,
      towedInput.value,
      exceptionInput.checked,
    );
    leadInput.value = String(result.leadAxles);
    towedInput.value = String(result.towedAxles);
    exceptionInput.disabled = classInput.value !== "other" || result.towedAxles === 0;
    if (exceptionInput.disabled) exceptionInput.checked = false;

    setText("tollEstimate", "$" + result.total.toFixed(2));
    var formula = result.leadAxles + " lead axles × $" + result.leadRate.toFixed(2);
    if (result.towedAxles) {
      formula += " + " + result.towedAxles + " towed axles × $" + result.towedRate.toFixed(2);
    }
    if (result.exceptionApplied) formula += " • motorhome/auto exception";
    setText("tollFormula", formula);
  }

  function syncTollToVehicle() {
    if (state.tollDirty) return;
    var classInput = byId("tollClass");
    var leadInput = byId("leadAxles");
    var towedInput = byId("towedAxles");
    if (!classInput || !leadInput || !towedInput) return;
    classInput.value = state.vehicle === "rv" ? "other" : "passenger";
    leadInput.value = "2";
    towedInput.value = state.vehicle === "trailer" ? "2" : "0";
    byId("motorhomeTowingAuto").checked = false;
    renderToll();
  }

  function selectComfort(value) {
    state.assistance = value === "assistance";
    document.querySelectorAll("[data-comfort]").forEach(function (button) {
      var selected = button.dataset.comfort === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (state.data) renderPlanner();
    track("driver-assistance-preference", { selected: state.assistance });
  }

  function shareUrl() {
    var url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("vehicle", state.vehicle);
    url.searchParams.set("direction", state.direction);
    return url.toString();
  }

  async function shareCrossingReport() {
    var official = state.data?.official;
    var confidence = currentConfidence();
    var direction = state.direction === "northbound" ? "northbound to the U.P." : "southbound to the L.P.";
    var text =
      "Mackinac Bridge: " +
      (official?.title || "official status unavailable") +
      ". " +
      VEHICLES[state.vehicle].label +
      ", " +
      direction +
      ": " +
      confidence.label +
      ". Checked " +
      formatDetroitTime(Date.now(), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) +
      ". Recheck the official status before leaving.";
    var payload = {
      title: "Mackinac Bridge crossing report",
      text: text,
      url: shareUrl(),
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        setText("shareStatus", "Crossing report shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text + " " + payload.url);
        setText("shareStatus", "Timestamped crossing report copied to your clipboard.");
      } else {
        window.prompt("Copy this crossing report:", text + " " + payload.url);
        setText("shareStatus", "Crossing report ready to copy.");
      }
      track("share-report", { vehicle: state.vehicle, direction: state.direction });
    } catch (error) {
      if (error?.name !== "AbortError") {
        setText("shareStatus", "Sharing was unavailable. Copy the page address instead.");
      }
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

    hours.slice(0, 30).forEach(function (hour, index) {
      var band = hour.threshold_band || "normal";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "forecast-hour " + band;
      button.dataset.index = String(index);
      button.setAttribute("aria-label", forecastAriaLabel(hour));
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

  function refreshRadar() {
    var image = byId("radarImage");
    var loading = byId("radarLoading");
    if (!image || !loading) return;
    image.classList.remove("is-loaded");
    loading.hidden = false;
    loading.textContent = "Loading official NWS radar...";
    image.src = RADAR_LOOP_URL + "?fiveMinute=" + Math.floor(Date.now() / 300_000);
    setText(
      "radarRefreshed",
      "Requested " + formatDetroitTime(Date.now(), { hour: "numeric", minute: "2-digit" }),
    );
  }

  function renderAll() {
    renderOfficialStatus();
    renderConfidence();
    renderPlanner();
    renderForecast();
    renderTraffic();
    renderApproachTraffic();
    renderStatusHistory();
    renderAssistanceDirection();
    renderToll();
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
      approach_traffic: { available: false, complete: false, events: [] },
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
      recordStatusObservation(data.official);
      checkRestrictionChange(data.official);
      renderAll();
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
    syncTollToVehicle();
    if (state.data) {
      renderConfidence();
      renderPlanner();
      renderForecast();
    }
    track("vehicle", { vehicle: vehicle });
  }

  function selectDirection(direction) {
    if (!["northbound", "southbound"].includes(direction)) return;
    state.direction = direction;
    state.camera = direction === "southbound" ? "south" : "north";
    document.querySelectorAll("[data-direction]").forEach(function (button) {
      var selected = button.dataset.direction === direction;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderCameraTabs();
    refreshCamera();
    renderAssistanceDirection();
    if (state.data) {
      renderConfidence();
      renderPlanner();
      renderForecast();
    }
    track("direction", { direction: direction });
  }

  function setupEvents() {
    byId("refreshButton").addEventListener("click", function () {
      loadData({ manual: true });
    });
    byId("alertButton").addEventListener("click", toggleAlerts);
    byId("shareButton").addEventListener("click", shareCrossingReport);

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
    document.querySelectorAll("[data-comfort]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectComfort(button.dataset.comfort);
      });
    });
    document.querySelectorAll("[data-vehicle-feature]").forEach(function (input) {
      input.addEventListener("change", renderVehicleChecker);
    });
    byId("applyVehicleClassification").addEventListener("click", function () {
      selectVehicle(state.classifiedVehicle);
      track("vehicle-checker-apply", { vehicle: state.classifiedVehicle });
    });

    ["tollClass", "leadAxles", "towedAxles", "motorhomeTowingAuto"].forEach(function (id) {
      var input = byId(id);
      input.addEventListener("input", function () {
        state.tollDirty = true;
        renderToll();
      });
      input.addEventListener("change", function () {
        state.tollDirty = true;
        renderToll();
        track("toll-calculator", {
          vehicle_class: byId("tollClass").value,
          towed: Number(byId("towedAxles").value) > 0,
        });
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

    byId("radarImage").addEventListener("load", function () {
      byId("radarImage").classList.add("is-loaded");
      byId("radarLoading").hidden = true;
    });
    byId("radarImage").addEventListener("error", function () {
      byId("radarImage").classList.remove("is-loaded");
      byId("radarLoading").hidden = false;
      byId("radarLoading").textContent =
        "The NWS radar loop is temporarily unavailable. Use the interactive-radar link above.";
    });

    byId("clearForecastSelection").addEventListener("click", function () {
      state.selectedHour = null;
      renderForecast();
      renderPlanner();
      track("forecast-clear");
    });

  }

  function applySharedSelection() {
    var params = new URLSearchParams(window.location.search);
    var vehicle = params.get("vehicle");
    var direction = params.get("direction");
    if (VEHICLES[vehicle]) selectVehicle(vehicle);
    else selectVehicle(state.vehicle);
    if (["northbound", "southbound"].includes(direction)) selectDirection(direction);
    else selectDirection(state.direction);
  }

  function init() {
    setupEvents();
    renderVehicleChecker();
    renderToll();
    applySharedSelection();
    updateAlertButton();
    refreshRadar();
    loadData();
    window.setInterval(loadData, 60_000);
    window.setInterval(refreshCamera, 60_000);
    window.setInterval(refreshRadar, 300_000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
