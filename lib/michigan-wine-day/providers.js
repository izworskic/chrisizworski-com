"use strict";

const {
  TC_FALLBACKS,
  PETOSKEY_FALLBACK,
  SOUTHWEST_CONTRACT,
} = require("./regions");

const UA = "ChrisIzworskiMichiganWineDay/1.0 (+https://chrisizworski.com/michigan-wine-day/)";

const KNOWN_ORIGINS = {
  "detroit": { label: "Detroit, MI", lat: 42.3314, lng: -83.0458, class: "southeast-michigan" },
  "ann arbor": { label: "Ann Arbor, MI", lat: 42.2808, lng: -83.7430, class: "southeast-michigan" },
  "lansing": { label: "Lansing, MI", lat: 42.7325, lng: -84.5555, class: "mid-michigan" },
  "east lansing": { label: "East Lansing, MI", lat: 42.73698, lng: -84.48387, class: "mid-michigan" },
  "grand rapids": { label: "Grand Rapids, MI", lat: 42.9634, lng: -85.6681, class: "west-michigan" },
  "kalamazoo": { label: "Kalamazoo, MI", lat: 42.2917, lng: -85.5872, class: "southwest-michigan" },
  "battle creek": { label: "Battle Creek, MI", lat: 42.3212, lng: -85.1797, class: "southwest-michigan" },
  "bay city": { label: "Bay City, MI", lat: 43.5945, lng: -83.8889, class: "mid-michigan" },
  "saginaw": { label: "Saginaw, MI", lat: 43.4195, lng: -83.9508, class: "mid-michigan" },
  "midland": { label: "Midland, MI", lat: 43.6156, lng: -84.2472, class: "mid-michigan" },
  "flint": { label: "Flint, MI", lat: 43.0125, lng: -83.6875, class: "southeast-michigan" },
  "traverse city": { label: "Traverse City, MI", lat: 44.7631, lng: -85.6206, class: "northwest-michigan" },
  "petoskey": { label: "Petoskey, MI", lat: 45.3733, lng: -84.9553, class: "northwest-michigan" },
  "charlevoix": { label: "Charlevoix, MI", lat: 45.3181, lng: -85.2584, class: "northwest-michigan" },
  "st joseph": { label: "St. Joseph, MI", lat: 42.1098, lng: -86.4800, class: "southwest-michigan" },
  "saint joseph": { label: "St. Joseph, MI", lat: 42.1098, lng: -86.4800, class: "southwest-michigan" },
  "benton harbor": { label: "Benton Harbor, MI", lat: 42.1167, lng: -86.4542, class: "southwest-michigan" },
  "south haven": { label: "South Haven, MI", lat: 42.4031, lng: -86.2736, class: "southwest-michigan" },
  "saugatuck": { label: "Saugatuck, MI", lat: 42.6550, lng: -86.2019, class: "southwest-michigan" },
  "paw paw": { label: "Paw Paw, MI", lat: 42.2178, lng: -85.8911, class: "southwest-michigan" },
  "new buffalo": { label: "New Buffalo, MI", lat: 41.7939, lng: -86.7439, class: "southwest-michigan" },
  "holland": { label: "Holland, MI", lat: 42.7875, lng: -86.1089, class: "west-michigan" },
  "grand haven": { label: "Grand Haven, MI", lat: 43.0631, lng: -86.2284, class: "west-michigan" },
  "muskegon": { label: "Muskegon, MI", lat: 43.2342, lng: -86.2484, class: "west-michigan" },
  "mount pleasant": { label: "Mount Pleasant, MI", lat: 43.5978, lng: -84.7675, class: "mid-michigan" },
  "chicago": { label: "Chicago, IL", lat: 41.8781, lng: -87.6298, class: "chicago-area" },
  "south bend": { label: "South Bend, IN", lat: 41.6764, lng: -86.2520, class: "indiana" },
  "toledo": { label: "Toledo, OH", lat: 41.6528, lng: -83.5379, class: "ohio" },
};

function cleanOrigin(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function originKey(value) {
  return cleanOrigin(value).toLowerCase().replace(/,?\s*(mi|michigan|il|illinois|in|indiana|oh|ohio|usa)$/i, "").trim();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": UA,
      "accept": "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(options.timeoutMs || 2200),
  });
  if (!response.ok) throw new Error("upstream " + response.status);
  return response.json();
}

async function resolveOrigin(raw) {
  const input = cleanOrigin(raw);
  if (!input) throw new Error("origin_required");
  const key = originKey(input);
  if (KNOWN_ORIGINS[key]) return { ...KNOWN_ORIGINS[key], source: "curated-origin" };

  const isZip = /^\d{5}$/.test(input);
  const isCity = /^[A-Za-z .'-]{2,60}(?:,\s*[A-Za-z .'-]{2,30})?$/.test(input);
  if (!isZip && !isCity) throw new Error("city_or_zip_only");

  const q = isZip ? input + ", Michigan, USA" : input + (/,/.test(input) ? "" : ", Michigan, USA");
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=" + encodeURIComponent(q);
  try {
    const rows = await fetchJson(url, {
      timeoutMs: 1800,
      headers: { "referer": "https://chrisizworski.com/michigan-wine-day/" },
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    const lat = Number(row?.lat);
    const lng = Number(row?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("not_found");
    return {
      label: input,
      lat,
      lng,
      class: isZip ? "zip-origin" : "other-city",
      source: "nominatim-user-query",
      attribution: "OpenStreetMap Nominatim",
    };
  } catch {
    throw new Error("origin_not_found");
  }
}

function withStatus(contract, status, source) {
  return { contract, status, source };
}

async function loadRegionContracts({ intent, date }) {
  const tcUrl = "https://tcwine.chrisizworski.com/api/region-contract";
  const [oldMission, leelanau, petoskey] = await Promise.all([
    fetchJson(tcUrl + "?area=old-mission&intent=" + encodeURIComponent(intent) + "&date=" + encodeURIComponent(date), { timeoutMs: 1800 })
      .then((contract) => withStatus(contract, "live", tcUrl))
      .catch(() => withStatus(TC_FALLBACKS["old-mission"], "snapshot-fallback", "owner snapshot")),
    fetchJson(tcUrl + "?area=leelanau&intent=" + encodeURIComponent(intent) + "&date=" + encodeURIComponent(date), { timeoutMs: 1800 })
      .then((contract) => withStatus(contract, "live", tcUrl))
      .catch(() => withStatus(TC_FALLBACKS.leelanau, "snapshot-fallback", "owner snapshot")),
    fetchJson("https://chrisizworski.com/petoskey-wine/region-contract.json", { timeoutMs: 1800 })
      .then((contract) => withStatus(contract, "live", "Petoskey owner export"))
      .catch(() => withStatus(PETOSKEY_FALLBACK, "snapshot-fallback", "owner snapshot")),
  ]);

  return [
    oldMission,
    leelanau,
    petoskey,
    withStatus(SOUTHWEST_CONTRACT, "local", "Michigan Wine Day Southwest adapter"),
  ];
}

function travelTargets(contracts) {
  const targets = [];
  for (const contract of contracts) {
    if (contract.region?.clusters) {
      for (const cluster of Object.values(contract.region.clusters)) {
        targets.push({ key: contract.region.id + ":" + cluster.id, lat: cluster.anchor.lat, lng: cluster.anchor.lng });
      }
    } else {
      targets.push({ key: contract.region.id, lat: contract.region.anchor.lat, lng: contract.region.anchor.lng });
    }
  }
  return targets;
}

function haversineMiles(a, b) {
  const R = 3958.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const la1 = a.lat * rad;
  const la2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fallbackTravelMinutes(origin, targets) {
  return Object.fromEntries(targets.map((target) => {
    const miles = haversineMiles(origin, target);
    const roadMiles = miles * 1.24;
    const minutes = Math.round((roadMiles / 53) * 60 + 6);
    return [target.key, minutes];
  }));
}

async function travelMinutes(origin, contracts) {
  const targets = travelTargets(contracts);
  const fallback = fallbackTravelMinutes(origin, targets);
  const coords = [{ key: "origin", lat: origin.lat, lng: origin.lng }, ...targets];
  const coordText = coords.map((point) => point.lng + "," + point.lat).join(";");
  const url = "https://router.project-osrm.org/table/v1/driving/" + coordText + "?sources=0&annotations=duration";
  try {
    const payload = await fetchJson(url, {
      timeoutMs: 2600,
      headers: { "referer": "https://chrisizworski.com/michigan-wine-day/" },
    });
    const durations = payload?.durations?.[0];
    if (!Array.isArray(durations) || durations.length !== coords.length) throw new Error("bad_matrix");
    const result = {};
    targets.forEach((target, index) => {
      const seconds = Number(durations[index + 1]);
      result[target.key] = Number.isFinite(seconds) ? Math.round(seconds / 60) : fallback[target.key];
    });
    return { values: result, mode: "road-routing", provider: "OSRM demo", fallbackUsed: false };
  } catch {
    return { values: fallback, mode: "estimated", provider: "great-circle road-factor fallback", fallbackUsed: true };
  }
}

function targetDateWithinForecast(date) {
  const target = new Date(date + "T12:00:00Z");
  if (Number.isNaN(target.getTime())) return false;
  const now = new Date();
  const days = (target - now) / 86400000;
  return days >= -1 && days <= 7.5;
}

async function weatherForPoint(point, date) {
  if (!targetDateWithinForecast(date)) return { state: "not-in-forecast-range" };
  try {
    const p = await fetchJson("https://api.weather.gov/points/" + point.lat.toFixed(4) + "," + point.lng.toFixed(4), { timeoutMs: 1600 });
    const forecastUrl = p?.properties?.forecast;
    if (!forecastUrl) throw new Error("no_forecast");
    const f = await fetchJson(forecastUrl, { timeoutMs: 1600 });
    const period = (f?.properties?.periods || []).find((row) => String(row.startTime || "").slice(0, 10) === date && row.isDaytime !== false);
    if (!period) return { state: "unavailable" };
    const pop = Number(period.probabilityOfPrecipitation?.value);
    const short = String(period.shortForecast || "");
    const rainy = Number.isFinite(pop) ? pop >= 55 : /rain|showers|thunder/i.test(short);
    return {
      state: "forecast",
      source: "National Weather Service",
      summary: short,
      precipitationChance: Number.isFinite(pop) ? pop : null,
      rainy,
      outdoorFriendly: !rainy && !/storm|snow/i.test(short),
    };
  } catch {
    return { state: "unavailable" };
  }
}

async function weatherByRegion(contracts, date) {
  const pairs = await Promise.all(contracts.map(async (contract) => {
    const weather = await weatherForPoint(contract.region.anchor, date);
    return [contract.region.id, weather];
  }));
  return Object.fromEntries(pairs);
}

module.exports = {
  KNOWN_ORIGINS,
  resolveOrigin,
  loadRegionContracts,
  travelTargets,
  travelMinutes,
  weatherByRegion,
};
