const NIAGARA_CORRIDOR = Object.freeze({
  min_lat: 42.80,
  max_lat: 43.30,
  min_lon: -79.30,
  max_lon: -78.75,
});

const OFFICIAL_LINKS = Object.freeze({
  ny511: "https://511ny.org/",
  on511: "https://511on.ca/",
  nittec: "https://www.nittec.org/",
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function inNiagaraCorridor(latitude, longitude) {
  const lat = finiteNumber(latitude);
  const lon = finiteNumber(longitude);
  if (lat == null || lon == null) return false;
  return lat >= NIAGARA_CORRIDOR.min_lat && lat <= NIAGARA_CORRIDOR.max_lat
    && lon >= NIAGARA_CORRIDOR.min_lon && lon <= NIAGARA_CORRIDOR.max_lon;
}

function unixToIso(value) {
  const seconds = finiteNumber(value);
  if (seconds == null) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nyDateToIso(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:${second}-04:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeNyEvent(item = {}) {
  if (!inNiagaraCorridor(item.Latitude, item.Longitude)) return null;
  return {
    id: item.ID == null ? null : String(item.ID),
    provider: "511 New York",
    source_url: OFFICIAL_LINKS.ny511,
    roadway: item.RoadwayName || null,
    direction: item.DirectionOfTravel || null,
    description: item.Description || null,
    location: item.Location || [item.PrimaryLocation, item.SecondaryLocation].filter(Boolean).join(" to ") || null,
    event_type: item.EventType || null,
    event_subtype: item.EventSubType || null,
    severity: item.Severity || null,
    lanes_affected: item.LanesAffected || null,
    lanes_status: item.LanesStatus || null,
    full_closure: /all\s+lanes/i.test(`${item.LanesAffected || ""} ${item.LanesStatus || ""}`) && /closed/i.test(`${item.LanesAffected || ""} ${item.LanesStatus || ""}`),
    latitude: finiteNumber(item.Latitude),
    longitude: finiteNumber(item.Longitude),
    updated_at: nyDateToIso(item.LastUpdated),
  };
}

function normalizeOntarioEvent(item = {}) {
  if (!inNiagaraCorridor(item.Latitude, item.Longitude)) return null;
  return {
    id: item.ID == null ? null : String(item.ID),
    provider: "Ontario 511",
    source_url: OFFICIAL_LINKS.on511,
    roadway: item.RoadwayName || null,
    direction: item.DirectionOfTravel || null,
    description: item.Description || null,
    location: item.Comment || null,
    event_type: item.EventType || null,
    event_subtype: item.EventSubType || null,
    severity: item.Severity || item.Impact || null,
    lanes_affected: item.LanesAffected || null,
    lanes_status: item.Impact || null,
    full_closure: Boolean(item.IsFullClosure),
    latitude: finiteNumber(item.Latitude),
    longitude: finiteNumber(item.Longitude),
    updated_at: unixToIso(item.LastUpdated),
  };
}

function normalizeNyCamera(item = {}) {
  if (!inNiagaraCorridor(item.Latitude, item.Longitude) || item.Disabled || item.Blocked) return null;
  return {
    id: item.ID == null ? null : String(item.ID),
    provider: "511 New York",
    source_url: OFFICIAL_LINKS.ny511,
    name: item.Name || item.RoadwayName || "Traffic camera",
    roadway: item.RoadwayName || null,
    direction: item.DirectionOfTravel || null,
    latitude: finiteNumber(item.Latitude),
    longitude: finiteNumber(item.Longitude),
    image_url: item.Url || null,
    video_url: item.VideoUrl || null,
  };
}

function normalizeOntarioCamera(item = {}) {
  if (!inNiagaraCorridor(item.Latitude, item.Longitude)) return null;
  const views = Array.isArray(item.Views) ? item.Views.filter((view) => String(view?.Status || "").toLowerCase() !== "disabled") : [];
  return {
    id: item.Id == null ? null : String(item.Id),
    provider: "Ontario 511",
    source_url: OFFICIAL_LINKS.on511,
    name: item.Location || item.SourceId || item.Roadway || "Traffic camera",
    roadway: item.Roadway || null,
    direction: item.Direction || null,
    latitude: finiteNumber(item.Latitude),
    longitude: finiteNumber(item.Longitude),
    image_url: views[0]?.Url || null,
    video_url: views[0]?.VideoUrl || null,
  };
}

function cleanList(payload, normalizer, limit) {
  return (Array.isArray(payload) ? payload : [])
    .map(normalizer)
    .filter(Boolean)
    .slice(0, limit);
}

function buildApproachContext(payloads = {}, sourceState = {}) {
  const events = [
    ...cleanList(payloads.nyEvents, normalizeNyEvent, 60),
    ...cleanList(payloads.ontarioEvents, normalizeOntarioEvent, 60),
  ].sort((a, b) => Number(b.full_closure) - Number(a.full_closure));
  const cameras = [
    ...cleanList(payloads.nyCameras, normalizeNyCamera, 30),
    ...cleanList(payloads.ontarioCameras, normalizeOntarioCamera, 30),
  ];
  const configured = Boolean(sourceState.ny?.configured || sourceState.ontario?.configured);
  const available = Boolean(sourceState.ny?.available || sourceState.ontario?.available);
  return {
    decision_role: "context_only",
    configured,
    available,
    complete: Boolean(sourceState.ny?.available && sourceState.ontario?.available),
    corridor: { ...NIAGARA_CORRIDOR },
    summary: {
      event_count: events.length,
      full_closure_count: events.filter((event) => event.full_closure).length,
      camera_count: cameras.length,
    },
    events,
    cameras,
    sources: {
      new_york: {
        name: "511 New York",
        url: OFFICIAL_LINKS.ny511,
        configured: Boolean(sourceState.ny?.configured),
        available: Boolean(sourceState.ny?.available),
        note: sourceState.ny?.configured ? "Developer API configured." : "Developer API key not configured.",
      },
      ontario: {
        name: "Ontario 511",
        url: OFFICIAL_LINKS.on511,
        configured: Boolean(sourceState.ontario?.configured),
        available: Boolean(sourceState.ontario?.available),
        note: sourceState.ontario?.configured ? "Developer API configured." : "Developer API key not configured.",
      },
      nittec: {
        name: "NITTEC",
        url: OFFICIAL_LINKS.nittec,
        configured: false,
        available: true,
        note: "Official traveler-information link only. NITTEC page content is not republished by this product.",
      },
    },
    note: available
      ? "Official 511 incidents and cameras are corridor context only. They do not alter the bridge recommendation unless a future, separately validated route-time model explicitly earns that role."
      : "The approach adapter is ready, but no structured 511 feed is currently available. Use the official traveler-information links before committing to a route.",
  };
}

module.exports = {
  NIAGARA_CORRIDOR,
  OFFICIAL_LINKS,
  buildApproachContext,
  inNiagaraCorridor,
  normalizeNyCamera,
  normalizeNyEvent,
  normalizeOntarioCamera,
  normalizeOntarioEvent,
  nyDateToIso,
  unixToIso,
};
