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
  const text = `${title || ""} ${message || ""}`.toLowerCase();
  const hasClosureMention =
    /\bclosures?\b/.test(text) && !/\bno(?:\s+(?:active|current|weather))?\s+closures?\b/.test(text);

  if (
    /partial\s+(?:closure|closing|closed)/.test(text) ||
    /closed\s+to\s+(?:all\s+)?high[- ]profile/.test(text) ||
    /high[- ]profile\s+vehicles?\s+(?:are|is|remain)?\s*(?:prohibited|not permitted|not allowed)/.test(text)
  ) {
    return "partial";
  }
  if (
    /\bbridge\s+(?:is\s+|remains\s+)?closed\b/.test(text) ||
    /\bclosed\s+to\s+all\s+traffic\b/.test(text) ||
    /\bfull\s+closure\b/.test(text) ||
    hasClosureMention
  ) {
    return "closed";
  }
  if (/\bescort(?:s|ed|ing)?\b/.test(text)) return "escort";
  if (
    /\bhigh[- ]wind\b/.test(text) ||
    /\b(?:weather|wind|travel)\s+(?:warning|advisory)\b/.test(text) ||
    /\bicy\b|\bwhiteout\b|\bfreezing rain\b|\breduced speed\b/.test(text)
  ) {
    return "advisory";
  }
  if (/\ball clear\b|\bpleasant trip\b|\bno significant weather conditions\b/.test(text)) return "open";
  return "unknown";
}

function parseOfficialBridgeWind(title, message) {
  const text = `${title || ""} ${message || ""}`;
  if (!/\bwinds?\b/i.test(text)) return null;

  const rangePattern =
    /(\d{1,3}(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d{1,3}(?:\.\d+)?)\s*(?:mph|miles?\s+per\s+hour)/gi;
  const ranges = [...text.matchAll(rangePattern)];
  const range = ranges.find((match) => {
    const contextStart = Math.max(0, match.index - 160);
    return /\bwinds?\b/i.test(text.slice(contextStart, match.index + match[0].length));
  });

  if (range) {
    const minMph = Number(range[1]);
    const maxMph = Number(range[2]);
    if (Number.isFinite(minMph) && Number.isFinite(maxMph) && minMph <= maxMph) {
      return {
        min_mph: minMph,
        max_mph: maxMph,
        label: `${minMph}–${maxMph} mph`,
        basis: "sustained",
        kind: "range",
        exact: false,
        is_bridge_gauge: true,
        source_name: "Mackinac Bridge Authority",
      };
    }
  }

  const minimumPattern =
    /(\d{1,3}(?:\.\d+)?)\s*(?:mph|miles?\s+per\s+hour)\s*(?:and\s+above|\+|or\s+(?:higher|greater|more))/gi;
  const minimums = [...text.matchAll(minimumPattern)];
  const minimum = minimums.find((match) => {
    const contextStart = Math.max(0, match.index - 160);
    return /\bwinds?\b/i.test(text.slice(contextStart, match.index + match[0].length));
  });

  if (minimum) {
    const minMph = Number(minimum[1]);
    if (Number.isFinite(minMph)) {
      return {
        min_mph: minMph,
        max_mph: null,
        label: `${minMph}+ mph`,
        basis: "sustained",
        kind: "minimum",
        exact: false,
        is_bridge_gauge: true,
        source_name: "Mackinac Bridge Authority",
      };
    }
  }

  return null;
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
  const bridgeWind = parseOfficialBridgeWind(title, message);

  return {
    available: Boolean(title),
    level: classifyBridgeStatus(title, message),
    title: title || "Official bridge status unavailable",
    message: message || "The Mackinac Bridge Authority condition report could not be read.",
    updated_text: updatedText || null,
    bridge_wind: bridgeWind,
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
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const unit = String(unitCode || "").toLowerCase();
  if (unit.includes("km_h") || unit.includes("km/h")) return number * 0.621371;
  if (unit.includes("m_s") || unit.includes("m/s")) return number * 2.23694;
  if (unit.includes("knot") || unit.includes("kt")) return number * 1.15078;
  return number;
}

function windThresholdBand(speedMph) {
  const speed = Number(speedMph);
  if (!Number.isFinite(speed)) return null;
  return (
    WIND_THRESHOLDS.find(
      (threshold) => speed >= threshold.min_mph && (threshold.max_mph == null || speed < threshold.max_mph),
    ) || WIND_THRESHOLDS[0]
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
      temperature_f: Number.isFinite(Number(period.temperature)) ? Number(period.temperature) : null,
      wind_mph: windMph == null ? null : Math.round(windMph),
      gust_mph: gustMph == null ? null : Math.round(gustMph),
      wind_direction: period.windDirection || null,
      precip_probability:
        period.probabilityOfPrecipitation?.value == null
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
    const latest = [...samples]
      .reverse()
      .find((sample) => sample.wind_spd != null || sample.wind_gst != null);
    if (!latest) continue;
    observations.push({ station, sample: latest });
  }

  observations.sort((a, b) => b.sample.t - a.sample.t);
  const selected = observations[0];
  if (!selected) return null;

  const { station, sample } = selected;
  const windMph = convertWindToMph(sample.wind_spd, "m/s");
  const gustMph = convertWindToMph(sample.wind_gst, "m/s");
  const ageMinutes = Math.max(0, Math.round((now - sample.t) / 60_000));

  return {
    station_id: station.id,
    station_name: station.name,
    latitude: station.latitude,
    longitude: station.longitude,
    observed_at: new Date(sample.t).toISOString(),
    age_minutes: ageMinutes,
    stale: ageMinutes > 90,
    wind_mph: windMph == null ? null : Math.round(windMph * 10) / 10,
    gust_mph: gustMph == null ? null : Math.round(gustMph * 10) / 10,
    wind_direction_degrees: sample.wind_dir,
    threshold_band: windThresholdBand(windMph)?.level || null,
    source_name: "NOAA National Data Buoy Center",
    source_url: `https://www.ndbc.noaa.gov/station_page.php?station=${String(station.id).toLowerCase()}`,
    is_bridge_gauge: false,
  };
}

module.exports = {
  WIND_THRESHOLDS,
  classifyBridgeStatus,
  convertWindToMph,
  gridValueAt,
  htmlToText,
  mergeNwsForecast,
  parseDurationMs,
  parseOfficialBridgeWind,
  parseOfficialConditions,
  parseWindSpeedMph,
  selectWindObservation,
  windThresholdBand,
};
