const { parseRealtimeObservations } = require("./ndbc");

const WIND_THRESHOLDS = Object.freeze([
  {
    min_mph: 0,
    max_mph: 20,
    level: "normal",
    label: "No wind restriction",
    guidance: "Normal bridge rules apply. The posted bridge speed limit is 45 mph.",
  },
  {
    min_mph: 20,
    max_mph: 35,
    level: "advisory",
    label: "High-wind advisory range",
    guidance: "High-profile vehicles should travel no faster than 20 mph.",
  },
  {
    min_mph: 35,
    max_mph: 50,
    level: "escort",
    label: "Escort range",
    guidance: "High-profile vehicles must wait for a Mackinac Bridge Authority escort.",
  },
  {
    min_mph: 50,
    max_mph: 65,
    level: "partial",
    label: "Partial-closure range",
    guidance: "High-profile vehicles are prohibited. Passenger vehicles not towing may cross at no more than 20 mph.",
  },
  {
    min_mph: 65,
    max_mph: null,
    level: "closed",
    label: "Full-closure range",
    guidance: "The bridge is closed to all traffic.",
  },
]);

const BRIDGE_COORDINATES = Object.freeze({
  latitude: 45.8174,
  longitude: -84.7278,
});

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(value) {
  return decodeHtml(
    String(value || "")
      .replace(/\r/g, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n+ */g, "\n")
    .trim();
}

function classifyBridgeStatus(title, message) {
  const heading = String(title || "").trim().toLowerCase();
  const body = String(message || "").toLowerCase();
  // The status heading is the authority's explicit state. Traffic notes and
  // conditional descriptions of future restrictions are not status changes.
  function classify(text) {
    if (/^(?:(?:mackinac )?bridge (?:is |remains )?)?(?:full closure|closed(?: to all traffic)?)(?:[.!:]|$)/.test(text) ||
        /\b(?:bridge (?:is|remains) closed to all traffic|(?:bridge )?closed to all (?:traffic|vehicles))\b/.test(text)) return "closed";
    if (/^partial\s+(?:closure|closing|closed)\b/.test(text) ||
        /\bclosed to (?:all )?high[- ]profile\b/.test(text) ||
        /\bhigh[- ]profile vehicles? (?:are |remain )?(?:prohibited|not permitted|not allowed)\b/.test(text)) return "partial";
    if (/\bescort(?:s|ed|ing)?\b/.test(text) && !/\b(?:no|without) escorts?\b/.test(text)) return "escort";
    if (/\bhigh[- ]wind\b|\b(?:weather|wind|travel|fog|visibility)\s+(?:warning|advisory)\b|\bicy\b|\bwhiteout\b|\bfreezing rain\b|\breduced speed\b/.test(text)) return "advisory";
    if (/^all clear\b|^bridge (?:is )?open\b|\bno significant weather conditions\b/.test(text)) return "open";
    return "unknown";
  }
  // Explicit full or partial restrictions in either field outrank other states.
  // Do not treat generic "closure", lane work, or a hypothetical closure as full.
  const explicit = classify(heading);
  const actualBody = body.split(/\n|[.!?]\s+/).filter(line =>
    !/\b(?:if|may|might|could|would|will be closed|in the event|during a closure|when closed|no current closures)\b/.test(line)
  );
  const closed = actualBody.some(line => /^(?:the )?(?:mackinac )?bridge (?:is |remains )?closed(?:\s+due to|\s+because|\s+to all (?:traffic|vehicles)|\s+until|[.!]?$)/.test(line.trim()) ||
    /^closed to all (?:traffic|vehicles)\b/.test(line.trim()));
  if (explicit === "closed" || closed) return "closed";
  if (explicit === "partial") return "partial";
  if (actualBody.some(line => classify(line.trim()) === "partial")) return "partial";
  if (explicit === "open" || explicit === "escort") return explicit;
  if (explicit === "advisory") return actualBody.some(line => /\b(?:will be escorted|must wait for an escort|escorts? (?:are )?required)\b/.test(line)) ? "escort" : "advisory";
  // A changed or unrecognized heading must not produce an inferred permission.
  return "unknown";
}

function isTrafficNote(paragraph) {
  const text = String(paragraph || "");
  return (
    /\b(?:construction|work zone|lane (?:closure|closed|restriction|shift)|traffic (?:delay|backup))\b/i.test(text) ||
    /\b(?:nb|sb|northbound|southbound)\b.*\blane\b/i.test(text) ||
    /\blane\b.*\b(?:nb|sb|northbound|southbound)\b/i.test(text)
  );
}

function parseOfficialConditions(payload) {
  const rendered = payload?.content?.rendered ?? payload?.rendered ?? payload ?? "";
  const statusMatch = String(rendered).match(
    /<h3\b[^>]*class=["'][^"']*\bstatus\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
  );
  const dateMatch = String(rendered).match(
    /<div\b[^>]*class=["'][^"']*\bdate\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  const descriptionMatch = String(rendered).match(
    /<div\b[^>]*class=["'][^"']*\bcondition-description\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  const descriptionHtml = descriptionMatch?.[1] || "";
  const paragraphs = [...descriptionHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => htmlToText(match[1]))
    .filter(Boolean);
  const message = paragraphs.length ? paragraphs.join("\n") : htmlToText(descriptionHtml);
  const title = htmlToText(statusMatch?.[1] || "");
  const updatedText = htmlToText(dateMatch?.[1] || "");
  const trafficNotes = paragraphs
    .filter(isTrafficNote)
    .filter((note, index, notes) => notes.indexOf(note) === index);

  return {
    available: Boolean(title),
    level: classifyBridgeStatus(title, message),
    title: title || "Official bridge status unavailable",
    message: message || "The Mackinac Bridge Authority condition report could not be read.",
    updated_text: updatedText || null,
    wind_related: /\bwinds?\b|\bgusts?\b/i.test(`${title} ${message}`),
    traffic_notes: trafficNotes,
    source_name: "Mackinac Bridge Authority",
    source_url: "https://www.mackinacbridge.org/fares-traffic/conditions/",
  };
}

function parseWindSpeedMph(value) {
  if (/\bcalm\b/i.test(String(value || ""))) return 0;
  if (/\blight wind\b/i.test(String(value || ""))) return 3;
  const numbers = String(value || "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite);
  return numbers?.length ? Math.max(...numbers) : null;
}

function parseDurationMs(value) {
  const match = String(value || "").match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (!match) return 0;
  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = match;
  return (
    Number(days) * 86_400_000 +
    Number(hours) * 3_600_000 +
    Number(minutes) * 60_000 +
    Number(seconds) * 1_000
  );
}

function gridValueAt(values, timestamp) {
  const target = Number(timestamp);
  for (const row of values || []) {
    const [startText, durationText] = String(row.validTime || "").split("/");
    const start = Date.parse(startText);
    const duration = parseDurationMs(durationText);
    if (Number.isFinite(start) && target >= start && target < start + duration) return row.value;
  }
  return null;
}

function convertWindToMph(value, unitCode) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const number = value;
  const unit = String(unitCode || "").toLowerCase();
  if (unit.includes("km_h") || unit.includes("km/h")) return number * 0.621371;
  if (unit.includes("m_s") || unit.includes("m/s")) return number * 2.23694;
  if (unit.includes("knot") || unit.includes("kt")) return number * 1.15078;
  if (/mph|mi_h|mi\/h/.test(unit)) return number;
  return null;
}

function windThresholdBand(speedMph) {
  if (typeof speedMph !== "number" || !Number.isFinite(speedMph) || speedMph < 0) return null;
  const speed = speedMph;
  return (
    WIND_THRESHOLDS.find(
      (threshold) => speed >= threshold.min_mph && (threshold.max_mph == null || speed < threshold.max_mph),
    ) || null
  );
}

function mergeNwsForecast(hourlyPayload, gridPayload, limit = 36) {
  const hourly = hourlyPayload?.properties || {};
  const grid = gridPayload?.properties || {};
  const gustSeries = grid.windGust || {};

  return (hourly.periods || []).slice(0, limit).map((period) => {
    const start = Date.parse(period.startTime);
    const windMph = parseWindSpeedMph(period.windSpeed);
    const gustRaw = Number.isFinite(start) ? gridValueAt(gustSeries.values, start) : null;
    const gustMph = convertWindToMph(gustRaw, gustSeries.uom);
    const band = windThresholdBand(windMph);

    return {
      start_time: period.startTime,
      end_time: period.endTime,
      is_daytime: Boolean(period.isDaytime),
      temperature_f: Number.isFinite(period.temperature) ? period.temperature : null,
      wind_mph: windMph == null ? null : Math.round(windMph),
      gust_mph: gustMph == null ? null : Math.round(gustMph),
      wind_direction: period.windDirection || null,
      precip_probability:
        !Number.isFinite(period.probabilityOfPrecipitation?.value) || period.probabilityOfPrecipitation.value < 0 || period.probabilityOfPrecipitation.value > 100
          ? null
          : Math.round(Number(period.probabilityOfPrecipitation.value)),
      summary: period.shortForecast || "Forecast available",
      threshold_band: band?.level || null,
    };
  });
}

function selectWindObservation(stations, now = Date.now()) {
  const observations = [];

  for (const station of stations || []) {
    if (!station?.text) continue;
    let samples;
    try {
      samples = parseRealtimeObservations(station.text);
    } catch {
      continue;
    }
    const valid = samples.filter(s => Number.isFinite(s.t) && s.t<=now+60000);
    const latest = [...valid]
      .reverse()
      .find(sample => [sample.wind_spd,sample.wind_gst].some(v=>Number.isFinite(v)&&v>=0));
    if (!latest) continue;
    observations.push({ station, sample: latest, samples:valid });
  }

  observations.sort((a, b) => b.sample.t - a.sample.t);
  const selected = observations[0];
  if (!selected) return null;

  const { station, sample, samples } = selected;
  const windMph = convertWindToMph(sample.wind_spd, "m/s");
  const gustMph = convertWindToMph(sample.wind_gst, "m/s");
  const ageMinutes = Math.max(0, Math.round((now - sample.t) / 60_000));

  const change = {};
  if (now-sample.t<=90*60000) {
    const target=sample.t-3*3600000;
    const prior=samples.filter(s=>Math.abs(s.t-target)<=30*60000)
      .sort((a,b)=>Math.abs(a.t-target)-Math.abs(b.t-target)||a.t-b.t)[0];
    if(prior) {
      for(const field of ["wind_spd","wind_gst"]) {
        const a=convertWindToMph(prior[field],"m/s"),b=convertWindToMph(sample[field],"m/s");
        const consistent = [prior,sample].every(row=>samples.filter(s=>s.t===row.t).every(s=>s[field]===row[field]));
        if(a!==null&&b!==null&&consistent) change[field==="wind_spd"?"wind_mph":"gust_mph"]=Math.round((b-a)*10)/10;
      }
      if(Object.keys(change).length)Object.assign(change,{from:new Date(prior.t).toISOString(),to:new Date(sample.t).toISOString(),hours:(sample.t-prior.t)/3600000});
    }
  }
  return {
    observed_change: Object.keys(change).length ? change : null,
    station_id: station.id,
    station_name: station.name,
    latitude: station.latitude,
    longitude: station.longitude,
    observed_at: new Date(sample.t).toISOString(),
    age_minutes: ageMinutes,
    stale: now - sample.t > 90*60000,
    wind_mph: windMph == null ? null : Math.round(windMph * 10) / 10,
    gust_mph: gustMph == null ? null : Math.round(gustMph * 10) / 10,
    wind_direction_degrees: sample.wind_dir,
    source_name: "NOAA National Data Buoy Center",
    source_url: `https://www.ndbc.noaa.gov/station_page.php?station=${String(station.id).toLowerCase()}`,
    is_bridge_gauge: false,
  };
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineMiles(latitudeA, longitudeA, latitudeB, longitudeB) {
  const values = [latitudeA, longitudeA, latitudeB, longitudeB].map(Number);
  if (!values.every(Number.isFinite)) return null;

  const [latA, lonA, latB, lonB] = values;
  const latitudeDelta = toRadians(latB - latA);
  const longitudeDelta = toRadians(lonB - lonA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 3_958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceMilesToEvent(event, center = BRIDGE_COORDINATES) {
  const points = [
    [Number(event?.longitude), Number(event?.latitude)],
    ...(Array.isArray(event?.coordinatePoints) ? event.coordinatePoints : []),
  ].filter(
    (point) =>
      Array.isArray(point) &&
      Number.isFinite(Number(point[0])) &&
      Number.isFinite(Number(point[1])),
  );

  if (!points.length) return null;

  return points.reduce((closest, [longitude, latitude]) => {
    const distance = haversineMiles(
      center.latitude,
      center.longitude,
      latitude,
      longitude,
    );
    if (!Number.isFinite(distance)) return closest;
    return closest == null ? distance : Math.min(closest, distance);
  }, null);
}

function eventDirection(value) {
  const text = String(value || "").toLowerCase();
  const northbound = /\bnb\b|\bnorthbound\b/.test(text);
  const southbound = /\bsb\b|\bsouthbound\b/.test(text);
  if (northbound && southbound) return "both";
  if (northbound) return "northbound";
  if (southbound) return "southbound";
  return "both";
}

function normalizeMdotApproachEvents(
  incidents,
  construction,
  {
    center = BRIDGE_COORDINATES,
    radiusMiles = 25,
    limit = 8,
  } = {},
) {
  const routePattern = /\b(?:I-75|US-2|US-23|M-108|Mackinac)\b/i;
  const combined = [
    ...(Array.isArray(incidents)
      ? incidents.map((event) => ({ ...event, kind: "incident" }))
      : []),
    ...(Array.isArray(construction)
      ? construction.map((event) => ({ ...event, kind: "construction" }))
      : []),
  ];

  return combined
    .filter((event) => event.kind !== "construction" || event.active !== false)
    .filter((event) =>
      routePattern.test(`${event.title || ""} ${htmlToText(event.message || "")}`),
    )
    .map((event) => {
      const distanceMiles = distanceMilesToEvent(event, center);
      const message = htmlToText(event.message || "");
      return {
        id: String(event.id || ""),
        kind: event.kind,
        title: htmlToText(event.title || "") || "MDOT road event",
        summary: message ? message.slice(0, 360) : null,
        direction: eventDirection(`${event.title || ""} ${message}`),
        distance_miles:
          distanceMiles == null ? null : Math.round(distanceMiles * 10) / 10,
        source_url: "https://mdotjboss.state.mi.us/MiDrive/",
      };
    })
    .filter(
      (event) =>
        Number.isFinite(event.distance_miles) &&
        event.distance_miles <= Number(radiusMiles),
    )
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, Math.max(0, Number(limit) || 0));
}

module.exports = {
  BRIDGE_COORDINATES,
  WIND_THRESHOLDS,
  classifyBridgeStatus,
  convertWindToMph,
  distanceMilesToEvent,
  eventDirection,
  gridValueAt,
  haversineMiles,
  htmlToText,
  mergeNwsForecast,
  normalizeMdotApproachEvents,
  parseDurationMs,
  parseOfficialConditions,
  parseWindSpeedMph,
  selectWindObservation,
  windThresholdBand,
};
