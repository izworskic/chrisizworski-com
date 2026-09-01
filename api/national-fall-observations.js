const { finite, sourceMeta } = require("../lib/national-outdoor");

const NPN_OBSERVATIONS = "https://services.usanpn.org/npn_portal/observations/getObservations.json";
const PHENOPHASE_ID = 498; // USA-NPN "Colored leaves"
const LOOKBACK_DAYS = 21;
const RADIUS_MILES = 75;
const UA = "ChrisIzworskiNationalFallObservations/1.0 (+https://chrisizworski.com/national-tools/fall-color/)";

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}
function boundsFor(lat, lon, radiusMiles = RADIUS_MILES) {
  const latitude = finite(lat, -90, 90);
  const longitude = finite(lon, -180, 180);
  if (latitude == null || longitude == null) return null;
  const latDelta = radiusMiles / 69;
  const cos = Math.max(0.2, Math.cos(latitude * Math.PI / 180));
  const lonDelta = radiusMiles / (69 * cos);
  return {
    south: latitude - latDelta,
    west: longitude - lonDelta,
    north: latitude + latDelta,
    east: longitude + lonDelta,
  };
}
function haversineMiles(lat1, lon1, lat2, lon2) {
  const a = [lat1, lon1, lat2, lon2].map(Number);
  if (!a.every(Number.isFinite)) return null;
  const rad = Math.PI / 180;
  const dLat = (a[2] - a[0]) * rad;
  const dLon = (a[3] - a[1]) * rad;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(a[2] * rad) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function normalizedKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function field(row, ...names) {
  if (!row || typeof row !== "object") return null;
  for (const name of names) {
    if (row[name] != null) return row[name];
  }
  const wanted = new Set(names.map(normalizedKey));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(normalizedKey(key)) && value != null) return value;
  }
  return null;
}
function conflictFlag(row) {
  const value = field(row, "Observed_Status_Conflict_Flag", "observed_status_conflict_flag", "observer_status_conflict_flag");
  if (value == null || value === "" || value === -9999 || value === "-9999") return false;
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}
function record(row, origin) {
  const latitude = finite(field(row, "latitude", "Latitude"), -90, 90);
  const longitude = finite(field(row, "longitude", "Longitude"), -180, 180);
  const status = finite(field(row, "phenophase_status", "Phenophase_Status"), -1, 1);
  const date = String(field(row, "observation_date", "Observation_Date") || "").slice(0, 10);
  if (latitude == null || longitude == null || status == null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const distance = haversineMiles(origin.latitude, origin.longitude, latitude, longitude);
  if (distance == null || distance > RADIUS_MILES) return null;
  return {
    date,
    status,
    distance_miles: Math.round(distance * 10) / 10,
    site_key: String(field(row, "site_id", "Site_ID", "station_id", "Station_ID", "site_name", "Site_Name") || `${latitude.toFixed(3)},${longitude.toFixed(3)}`),
    common_name: String(field(row, "common_name", "Common_Name") || "").trim() || null,
    intensity: String(field(row, "intensity_value", "Intensity_Value") || "").trim().replace(/^-9999$/, "") || null,
    conflict: conflictFlag(row),
  };
}
function summarize(rows, origin) {
  const parsed = (Array.isArray(rows) ? rows : [])
    .map((row) => record(row, origin))
    .filter(Boolean)
    .filter((row) => !row.conflict)
    .sort((a, b) => b.date.localeCompare(a.date));

  const yes = parsed.filter((row) => row.status === 1);
  const no = parsed.filter((row) => row.status === 0);
  const uncertain = parsed.filter((row) => row.status === -1);
  const sites = new Set(parsed.map((row) => row.site_key));
  const yesSites = new Set(yes.map((row) => row.site_key));
  const latest = parsed[0] || null;
  const latestYes = yes[0] || null;
  let label;
  let detail;
  if (yes.length) {
    label = "Nearby observers reported colored leaves";
    detail = `${yes.length} recent yes record${yes.length === 1 ? "" : "s"} across ${yesSites.size} monitored site${yesSites.size === 1 ? "" : "s"} within ${RADIUS_MILES} miles.`;
  } else if (no.length) {
    label = "Nearby monitored plants have recent no-color records";
    detail = `${no.length} recent no record${no.length === 1 ? "" : "s"} were found within ${RADIUS_MILES} miles, with no recent yes record in this query.`;
  } else if (uncertain.length) {
    label = "Nearby colored-leaf observations are inconclusive";
    detail = "Recent records were uncertain rather than yes or no.";
  } else {
    label = "No nearby recent colored-leaf observations found";
    detail = `No USA-NPN Colored leaves records were found within ${RADIUS_MILES} miles during the last ${LOOKBACK_DAYS} days.`;
  }
  return {
    label,
    detail,
    radius_miles: RADIUS_MILES,
    lookback_days: LOOKBACK_DAYS,
    records: parsed.length,
    yes_records: yes.length,
    no_records: no.length,
    uncertain_records: uncertain.length,
    sites_reporting: sites.size,
    yes_sites: yesSites.size,
    latest_observation_date: latest?.date || null,
    latest_yes: latestYes ? {
      date: latestYes.date,
      intensity: latestYes.intensity,
      common_name: latestYes.common_name,
      distance_miles: latestYes.distance_miles,
    } : null,
    coverage: yesSites.size >= 2 && yes.length >= 3 ? "some current local coverage" : parsed.length ? "sparse current local coverage" : "no recent local coverage",
  };
}
async function fetchRows(lat, lon, now = new Date()) {
  const bounds = boundsFor(lat, lon);
  const end = isoDate(now);
  const start = isoDate(new Date(now.getTime() - (LOOKBACK_DAYS - 1) * 86400000));
  const body = new URLSearchParams({
    request_src: "Chris Izworski National Fall Color",
    climate_data: "0",
    start_date: start,
    end_date: end,
    bottom_left_x1: bounds.south.toFixed(5),
    bottom_left_y1: bounds.west.toFixed(5),
    upper_right_x2: bounds.north.toFixed(5),
    upper_right_y2: bounds.east.toFixed(5),
    "phenophase_id[1]": String(PHENOPHASE_ID),
    "additional_field[1]": "Site_Name",
    "additional_field[2]": "Common_Name",
    "additional_field[3]": "Observed_Status_Conflict_Flag",
  });
  const response = await fetch(NPN_OBSERVATIONS, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": UA,
    },
    body,
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`services.usanpn.org returned ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=43200");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const lat = finite(req.query?.lat, 24, 50);
  const lon = finite(req.query?.lon, -125, -66);
  if (lat == null || lon == null) return res.status(400).json({ error: "This observation context currently covers the contiguous United States" });

  try {
    const rows = await fetchRows(lat, lon);
    const summary = summarize(rows, { latitude: lat, longitude: lon });
    return res.status(200).json({
      retrieved_at: new Date().toISOString(),
      mode: "current-ground-observations",
      location: { latitude: lat, longitude: lon },
      colored_leaves: summary,
      method: {
        phenophase_id: PHENOPHASE_ID,
        phenophase: "Colored leaves",
        interpretation: "These are recent status/intensity records for individual monitored plants. They are current ground observations, not a landscape-wide leaf-color percentage or peak-color forecast.",
        quality: "Records flagged with an observer status conflict are excluded. Distance is calculated from the searched location and results are limited to 75 miles.",
      },
      disclaimer: "A Colored leaves 'yes' can reflect typical late-season color or yellow/brown color caused by drought or other stress. Sparse volunteer observations may not represent the surrounding landscape and do not alter the historical timing model.",
      sources: [
        sourceMeta({
          name: "USA National Phenology Network — Nature's Notebook observational data",
          url: "https://www.usanpn.org/data/observational",
          updatedAt: summary.latest_observation_date,
          staleAfterMinutes: LOOKBACK_DAYS * 1440,
          available: true,
          status: summary.records ? "recent Colored leaves observations" : "service available; no nearby recent records",
        }),
      ],
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "Current USA-NPN leaf observations are unavailable",
      detail: String(error?.message || error),
      degraded: true,
    });
  }
};

module.exports._test = { boundsFor, conflictFlag, field, haversineMiles, record, summarize };
