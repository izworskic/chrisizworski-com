const borderData = require("../data/border-crossings.json");

const CROSSINGS = Object.freeze(
  borderData.crossings.map((crossing) =>
    Object.freeze({
      ...crossing,
      tolls: Object.freeze(crossing.tolls),
      cameras: Object.freeze(crossing.cameras),
    }),
  ),
);

const CROSSING_BY_ID = new Map(CROSSINGS.map((crossing) => [crossing.id, crossing]));

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstFiniteNumber(value) {
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function parseWaitMinutes(value) {
  const text = cleanText(value);
  if (!text || /^(?:--|—|-|n\/?a|not (?:applicable|available)|closed)$/i.test(text)) {
    return null;
  }
  if (/^no delay$/i.test(text)) return 0;
  const minutes = firstFiniteNumber(text);
  return minutes == null ? null : Math.max(0, Math.round(minutes));
}

function parseAgencyTimestamp(value, dateValue = "") {
  const text = cleanText(value);
  if (!text) return null;
  const offsets = {
    EDT: "-04:00",
    EST: "-05:00",
    CDT: "-05:00",
    CST: "-06:00",
  };

  let match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(EDT|EST|CDT|CST)$/i,
  );
  if (match) {
    const [, year, month, day, hour, minute, second = "00", zone] = match;
    const parsed = new Date(
      `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:${second}${offsets[zone.toUpperCase()]}`,
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  match = text.match(/^At\s+(\d{1,2}):(\d{2})\s+(am|pm)\s+(EDT|EST|CDT|CST)$/i);
  const dateMatch = cleanText(dateValue).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match || !dateMatch) return null;
  const [, hourText, minute, meridiem, zone] = match;
  const [, month, day, year] = dateMatch;
  let hour = Number(hourText) % 12;
  if (meridiem.toLowerCase() === "pm") hour += 12;
  const parsed = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:00${offsets[zone.toUpperCase()]}`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseCbsaCsv(csvText) {
  const rows = String(csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.split(";;").map((cell) => cleanText(cell)))
    .filter((row) => row.some(Boolean));

  if (rows.length < 2) return new Map();

  const headings = rows[0].map((heading) => heading.toLowerCase());
  const column = {
    name: headings.findIndex((heading) => heading === "customs office"),
    location: headings.findIndex((heading) => heading === "location"),
    updated: headings.findIndex((heading) => heading === "last updated"),
    commercial: headings.findIndex((heading) => heading.includes("commercial flow - canada bound")),
    passenger: headings.findIndex((heading) => heading.includes("travellers flow - canada bound")),
  };
  if (column.name < 0 || column.commercial < 0 || column.passenger < 0) return new Map();

  return new Map(
    rows.slice(1).map((row) => [
      row[column.name],
      {
        name: row[column.name],
        location: row[column.location] || null,
        updated_text: row[column.updated] || null,
        passenger: normalizeCbsaWait(row[column.passenger]),
        commercial: normalizeCbsaWait(row[column.commercial]),
      },
    ]),
  );
}

function normalizeCbsaWait(rawValue) {
  const raw = cleanText(rawValue);
  const waitMinutes = parseWaitMinutes(raw);
  const unavailable = !raw || /^(?:--|—|-|n\/?a|not (?:applicable|available))$/i.test(raw);
  const closed = /^closed$/i.test(raw);

  return {
    available: !unavailable && !closed && waitMinutes != null,
    status: closed ? "closed" : unavailable ? "unavailable" : "reported",
    wait_minutes: waitMinutes,
    display: closed ? "Closed" : unavailable ? "Not reported" : waitMinutes === 0 ? "No delay" : `${waitMinutes} min`,
    raw: raw || null,
    lanes_open: null,
    updated_text: null,
  };
}

function normalizeCbpLane(lane, portStatus) {
  const operational = cleanText(lane?.operational_status);
  const portClosed = /\bclosed\b/i.test(String(portStatus || ""));
  const laneClosed = /\blanes?\s+closed\b|\bclosed\b/i.test(operational);
  const notApplicable = !operational || /^(?:n\/?a|not applicable)$/i.test(operational);
  const waitMinutes = parseWaitMinutes(lane?.delay_minutes);
  const lanesOpen = firstFiniteNumber(lane?.lanes_open);

  if (portClosed || laneClosed) {
    return {
      available: false,
      status: "closed",
      wait_minutes: null,
      display: portClosed ? "Port closed" : "Lane closed",
      lanes_open: lanesOpen,
      updated_text: cleanText(lane?.update_time) || null,
      operational_status: operational || null,
    };
  }

  if (notApplicable || waitMinutes == null) {
    return {
      available: false,
      status: "unavailable",
      wait_minutes: null,
      display: "Not reported",
      lanes_open: lanesOpen,
      updated_text: cleanText(lane?.update_time) || null,
      operational_status: operational || null,
    };
  }

  return {
    available: true,
    status: "reported",
    wait_minutes: waitMinutes,
    display: waitMinutes === 0 ? "No delay" : `${waitMinutes} min`,
    lanes_open: lanesOpen,
    updated_text: cleanText(lane?.update_time) || null,
    operational_status: operational || null,
  };
}

function emptyLane(display = "Not reported") {
  return {
    available: false,
    status: "unavailable",
    wait_minutes: null,
    display,
    lanes_open: null,
    updated_text: null,
  };
}

function normalizeCbpPort(port = {}) {
  const passenger = port.passenger_vehicle_lanes || {};
  const commercial = port.commercial_vehicle_lanes || {};
  const portStatusText = cleanText(port.port_status);

  const normalized = {
    available: Boolean(port.port_number),
    port_status: /\bclosed\b/i.test(portStatusText)
      ? "closed"
      : /\bopen\b/i.test(portStatusText)
        ? "open"
        : "unknown",
    port_status_text: portStatusText || "Status unavailable",
    hours: cleanText(port.hours) || null,
    date: cleanText(port.date) || null,
    time: cleanText(port.time) || null,
    construction_notice: cleanText(port.construction_notice) || null,
    passenger: {
      standard: normalizeCbpLane(passenger.standard_lanes, portStatusText),
      nexus: normalizeCbpLane(passenger.NEXUS_SENTRI_lanes, portStatusText),
      ready: normalizeCbpLane(passenger.ready_lanes, portStatusText),
    },
    commercial: {
      standard: normalizeCbpLane(commercial.standard_lanes, portStatusText),
      fast: normalizeCbpLane(commercial.FAST_lanes, portStatusText),
    },
  };
  for (const vehicle of ["passenger", "commercial"]) {
    for (const lane of Object.values(normalized[vehicle])) {
      lane.updated_at = parseAgencyTimestamp(lane.updated_text, normalized.date);
    }
  }
  return normalized;
}

function toPublicCrossing(crossing) {
  return {
    id: crossing.id,
    name: crossing.name,
    short_name: crossing.short_name,
    region: crossing.region,
    michigan_city: crossing.michigan_city,
    ontario_city: crossing.ontario_city,
    route: crossing.route,
    latitude: crossing.latitude,
    longitude: crossing.longitude,
    detail_path: crossing.detail_path,
    operator_url: crossing.operator_url,
    official_wait_url: crossing.official_wait_url,
    hours: crossing.hours,
    detroit_comparison: crossing.detroit_comparison,
    commercial_allowed: crossing.commercial_allowed,
    notes: crossing.notes,
    tolls: crossing.tolls,
    cameras: crossing.cameras.map((camera) => ({
      id: camera.id,
      label: camera.label,
      description: camera.description,
      type: camera.type,
      source_name: camera.source_name,
      source_url: camera.source_url,
      image_url: `/api/border-media?camera=${encodeURIComponent(camera.id)}`,
    })),
    live_video: crossing.live_video || [],
    camera_note: crossing.camera_note,
  };
}

function mergeWaitSources(cbpPayload, cbsaCsv) {
  const cbpPorts = new Map(
    (Array.isArray(cbpPayload) ? cbpPayload : [])
      .filter((port) => port?.port_number)
      .map((port) => [String(port.port_number), normalizeCbpPort(port)]),
  );
  const cbsaRows = parseCbsaCsv(cbsaCsv);

  return CROSSINGS.map((crossing) => {
    const cbp = cbpPorts.get(crossing.cbp_port_number) || normalizeCbpPort();
    const cbsa = cbsaRows.get(crossing.cbsa_name);
    const toCanadaPassenger = cbsa?.passenger || emptyLane();
    const toCanadaCommercial = cbsa?.commercial || emptyLane();

    if (cbsa?.updated_text) {
      toCanadaPassenger.updated_text = cbsa.updated_text;
      toCanadaCommercial.updated_text = cbsa.updated_text;
      toCanadaPassenger.updated_at = parseAgencyTimestamp(cbsa.updated_text);
      toCanadaCommercial.updated_at = parseAgencyTimestamp(cbsa.updated_text);
    }

    return {
      ...toPublicCrossing(crossing),
      status: {
        port: cbp.port_status,
        text: cbp.port_status_text,
        hours: cbp.hours || crossing.hours,
        construction_notice: cbp.construction_notice,
      },
      waits: {
        to_canada: {
          source: "Canada Border Services Agency",
          source_url: "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html",
          note: "Reported border-processing delay entering Canada. It excludes approach-road and toll-plaza traffic.",
          passenger: {
            standard: toCanadaPassenger,
            nexus: emptyLane("CBSA does not publish this lane separately"),
            ready: emptyLane("Not applicable entering Canada"),
          },
          commercial: {
            standard: toCanadaCommercial,
            fast: emptyLane("CBSA does not publish this lane separately"),
          },
        },
        to_us: {
          source: "U.S. Customs and Border Protection",
          source_url: crossing.official_wait_url,
          note: "Reported border-processing delay entering the United States. It excludes approach-road and toll-plaza traffic.",
          passenger: cbp.passenger,
          commercial: cbp.commercial,
        },
      },
      source_available: {
        to_canada: Boolean(cbsa),
        to_us: cbp.available,
      },
      official_updated: {
        to_canada: cbsa?.updated_text || null,
        to_us: [cbp.date, cbp.time].filter(Boolean).join(" ") || null,
      },
    };
  });
}

function selectedLane(crossing, selection = {}) {
  const direction = selection.direction === "to_us" ? "to_us" : "to_canada";
  const vehicle = selection.vehicle === "commercial" ? "commercial" : "passenger";
  const allowedLanes =
    vehicle === "commercial"
      ? direction === "to_us"
        ? ["standard", "fast"]
        : ["standard"]
      : direction === "to_us"
        ? ["standard", "nexus", "ready"]
        : ["standard"];
  const lane = allowedLanes.includes(selection.lane) ? selection.lane : "standard";
  return crossing?.waits?.[direction]?.[vehicle]?.[lane] || emptyLane();
}

function compareDetroitCrossings(crossings, selection = {}) {
  const candidates = (crossings || [])
    .filter((crossing) => crossing.detroit_comparison)
    .map((crossing) => ({ crossing, lane: selectedLane(crossing, selection) }));
  const available = candidates.filter(
    ({ crossing, lane }) =>
      crossing.status?.port !== "closed" && lane.available && Number.isFinite(lane.wait_minutes),
  );

  if (!available.length) {
    return {
      available: false,
      fastest_ids: [],
      wait_minutes: null,
      is_tie: false,
      headline: "No comparable Detroit wait is available",
      note: "Check each official crossing source before leaving.",
    };
  }

  const lowestWait = Math.min(...available.map(({ lane }) => lane.wait_minutes));
  const fastest = available.filter(({ lane }) => lane.wait_minutes === lowestWait);
  const names = fastest.map(({ crossing }) => crossing.short_name);
  const waitLabel = lowestWait === 0 ? "no reported delay" : `${lowestWait} min`;

  return {
    available: true,
    fastest_ids: fastest.map(({ crossing }) => crossing.id),
    wait_minutes: lowestWait,
    is_tie: fastest.length > 1,
    headline:
      fastest.length > 1
        ? `${names.join(" and ")} are tied`
        : `${names[0]} has the shortest reported wait`,
    note:
      fastest.length > 1
        ? `Each currently reports ${waitLabel} for the selected direction and lane.`
        : `It currently reports ${waitLabel} for the selected direction and lane.`,
  };
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineMiles(latitude1, longitude1, latitude2, longitude2) {
  const earthRadiusMiles = 3958.8;
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function epochToIso(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function normalizeOntarioEvents(payload, radiusMiles = 25) {
  const events = Array.isArray(payload) ? payload : [];
  const grouped = Object.fromEntries(CROSSINGS.map((crossing) => [crossing.id, []]));

  for (const event of events) {
    const latitude = Number(event?.Latitude);
    const longitude = Number(event?.Longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const nearest = CROSSINGS.map((crossing) => ({
      crossing,
      distance: haversineMiles(latitude, longitude, crossing.latitude, crossing.longitude),
    })).sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > radiusMiles) continue;

    grouped[nearest.crossing.id].push({
      id: String(event.ID ?? event.Id ?? ""),
      type: cleanText(event.EventType) || "road event",
      description: cleanText(event.Description) || "Ontario 511 road event",
      roadway: cleanText(event.RoadwayName) || null,
      direction: cleanText(event.DirectionOfTravel) || null,
      lanes_affected: cleanText(event.LanesAffected) || null,
      full_closure: Boolean(event.IsFullClosure),
      severity: cleanText(event.Severity) || "Unknown",
      distance_miles: Math.round(nearest.distance * 10) / 10,
      updated_at: epochToIso(event.LastUpdated),
      source_name: "Ontario 511",
      source_url: "https://511on.ca/",
    });
  }

  for (const crossing of CROSSINGS) {
    grouped[crossing.id] = grouped[crossing.id]
      .sort(
        (a, b) =>
          Number(b.full_closure) - Number(a.full_closure) ||
          a.distance_miles - b.distance_miles,
      )
      .slice(0, 8);
  }
  return grouped;
}

function normalizeOntarioAlerts(payload) {
  return (Array.isArray(payload) ? payload : [])
    .filter((alert) => alert?.HighImportance)
    .map((alert) => ({
      id: `on-${alert.Id}`,
      source: "Ontario 511",
      headline: cleanText(alert.Message) || "Ontario travel alert",
      description: cleanText(alert.Notes) || null,
      severity: alert.HighImportance ? "important" : "unknown",
      regions: Array.isArray(alert.Regions) ? alert.Regions.map(cleanText).filter(Boolean) : [],
      starts_at: epochToIso(alert.StartTime),
      ends_at: epochToIso(alert.EndTime),
      updated_at: epochToIso(alert.LastUpdated),
      source_url: "https://511on.ca/",
    }))
    .slice(0, 6);
}

function normalizeNwsAlerts(payload, regionId, regionLabel) {
  return (Array.isArray(payload?.features) ? payload.features : []).map((feature) => {
    const properties = feature.properties || {};
    return {
      id: cleanText(feature.id || properties.id) || `${regionId}-${cleanText(properties.event)}`,
      region_id: regionId,
      region: regionLabel,
      source: "National Weather Service",
      headline: cleanText(properties.headline || properties.event) || "Weather alert",
      description: cleanText(properties.description) || null,
      instruction: cleanText(properties.instruction) || null,
      severity: cleanText(properties.severity) || "Unknown",
      urgency: cleanText(properties.urgency) || "Unknown",
      starts_at: properties.onset || properties.effective || null,
      ends_at: properties.ends || properties.expires || null,
      source_url: feature.id || "https://www.weather.gov/",
    };
  });
}

function localDateInDetroit(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseTrendNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function normalizeCbpTrend(payload, vehicle = "passenger", lane = "standard") {
  const report = Array.isArray(payload) ? payload[0] : payload;
  if (!report || typeof report !== "object") return null;

  const commercial = vehicle === "commercial";
  const slots = commercial
    ? report.commercial_time_slots?.commercial_slot
    : report.private_time_slots?.private_slot;
  if (!Array.isArray(slots)) return null;

  const prefix = commercial
    ? lane === "fast"
      ? "fast_lane"
      : "standard_lane"
    : lane === "nexus"
      ? "nexus_lane"
      : lane === "ready"
        ? "ready_lane"
        : "standard_lane";

  return {
    crossing_name: cleanText(report.crossing_name) || null,
    date: cleanText(report.date) || null,
    vehicle: commercial ? "commercial" : "passenger",
    lane,
    direction: "to_us",
    hours: slots.map((slot) => ({
      hour: Number(slot.time),
      today_minutes: parseTrendNumber(slot[`${prefix}_today_wait`]),
      typical_minutes: parseTrendNumber(slot[`${prefix}_average_wait`]),
      typical_min_minutes: parseTrendNumber(slot[`${prefix}_min_wait`]),
      typical_max_minutes: parseTrendNumber(slot[`${prefix}_max_wait`]),
    })),
    note: "CBP observed and typical waits for entering the United States. Typical values are historical context, not a prediction or recommended crossing time.",
  };
}

module.exports = {
  CROSSINGS,
  CROSSING_BY_ID,
  cleanText,
  compareDetroitCrossings,
  emptyLane,
  haversineMiles,
  localDateInDetroit,
  mergeWaitSources,
  normalizeCbsaWait,
  normalizeCbpLane,
  normalizeCbpPort,
  normalizeCbpTrend,
  normalizeNwsAlerts,
  normalizeOntarioAlerts,
  normalizeOntarioEvents,
  parseAgencyTimestamp,
  parseCbsaCsv,
  parseWaitMinutes,
  selectedLane,
  toPublicCrossing,
};
