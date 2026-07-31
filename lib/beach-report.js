const beachCatalog = require("../data/beaches.json");

const MICHIGAN_TIMEZONE = beachCatalog.season.timezone || "America/Detroit";
const CLOSURE_COLOR = "#FF0000";
const ADVISORY_COLOR = "#FFFF00";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MICHIGAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number.parseInt(values.year, 10),
    month: Number.parseInt(values.month, 10),
    day: Number.parseInt(values.day, 10),
  };
}

function monthDayNumber(value) {
  const [month, day] = String(value).split("-").map((part) => Number.parseInt(part, 10));
  return month * 100 + day;
}

function getSeasonStatus(date = new Date()) {
  const current = localDateParts(date);
  const today = current.month * 100 + current.day;
  const start = monthDayNumber(beachCatalog.season.start);
  const end = monthDayNumber(beachCatalog.season.end);
  const active = today >= start && today <= end;
  const seasonYear = today > end ? current.year + 1 : current.year;
  const [startMonth, startDay] = beachCatalog.season.start.split("-").map(Number);
  const [endMonth, endDay] = beachCatalog.season.end.split("-").map(Number);

  return {
    active,
    timezone: MICHIGAN_TIMEZONE,
    label: active ? "Daily rankings are active" : "Daily rankings are paused for the season",
    starts_on: [seasonYear, String(startMonth).padStart(2, "0"), String(startDay).padStart(2, "0")].join("-"),
    ends_on: [seasonYear, String(endMonth).padStart(2, "0"), String(endDay).padStart(2, "0")].join("-"),
  };
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/\b(state|county|township|city|village|national)\b/g, " ")
    .replace(/\b(park|beach|day use|recreation area|public)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parsePointWkt(value) {
  const match = String(value || "").match(/^POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i);
  if (!match) return null;
  return { lng: Number.parseFloat(match[1]), lat: Number.parseFloat(match[2]) };
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const first = Math.sin(dLat / 2) ** 2;
  const second = Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(first + second));
}

function normalizeBeachGuardAlerts(payload) {
  const rows = Array.isArray(payload?.insertUpdateList) ? payload.insertUpdateList : [];
  return rows
    .map((row) => {
      const point = parsePointWkt(row.geographyWKT);
      const color = String(row.color || "").toUpperCase();
      const state = color === CLOSURE_COLOR ? "closure" : color === ADVISORY_COLOR ? "advisory" : "unknown";
      if (!point || state === "unknown") return null;
      const siteId = String(row.siteId || "");
      return {
        id: String(row.id || ""),
        site_id: siteId,
        name: String(row.siteName || "Unnamed beach"),
        lat: point.lat,
        lng: point.lng,
        state,
        label: state === "closure" ? "Active beach closure" : "Active contamination advisory",
        official_url:
          "https://mienviro.michigan.gov/nsite/beach/map/results/detail/" +
          encodeURIComponent(siteId) +
          "/Advisories",
      };
    })
    .filter(Boolean);
}

function matchAlertToBeach(beach, alerts) {
  const candidates = [beach.name, ...(beach.aliases || [])].map(normalizeName).filter(Boolean);
  let nearest = null;

  for (const alert of alerts || []) {
    const alertName = normalizeName(alert.name);
    const nameMatch = candidates.some(
      (candidate) => candidate === alertName || candidate.includes(alertName) || alertName.includes(candidate),
    );
    const distance = haversineMiles(beach.lat, beach.lng, alert.lat, alert.lng);
    if (nameMatch || distance <= 0.9) {
      if (!nearest || distance < nearest.distance_miles) nearest = { ...alert, distance_miles: distance };
    }
  }
  return nearest;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previous];
    const intersects =
      y1 > point.lat !== y2 > point.lat &&
      point.lng < ((x2 - x1) * (point.lat - y1)) / ((y2 - y1) || Number.EPSILON) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return false;
  if (geometry.type === "Polygon") return geometry.coordinates.some((ring) => pointInRing(point, ring));
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => polygon.some((ring) => pointInRing(point, ring)));
  }
  return false;
}

function normalizeNwsAlerts(payload) {
  const relevantEvents = /beach hazards|rip current|lakeshore flood|lakeshore hazard|high surf/i;
  return (payload?.features || [])
    .filter((feature) => relevantEvents.test(String(feature?.properties?.event || "")))
    .map((feature) => ({
      id: feature.id || feature.properties?.id || "",
      event: feature.properties?.event || "Beach hazard",
      severity: String(feature.properties?.severity || "Unknown"),
      urgency: String(feature.properties?.urgency || "Unknown"),
      area: feature.properties?.areaDesc || "",
      headline: feature.properties?.headline || feature.properties?.event || "Beach hazard",
      instruction: feature.properties?.instruction || null,
      effective: feature.properties?.effective || null,
      expires: feature.properties?.expires || null,
      official_url: feature.properties?.["@id"] || feature.id || "https://www.weather.gov/greatlakes/beachhazards",
      geometry: feature.geometry || null,
    }));
}

function matchNwsAlertsToBeach(beach, alerts) {
  const escapedCounty = String(beach.county || "").replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
  const countyPattern = new RegExp("\\b" + escapedCounty + "\\b", "i");
  return (alerts || []).filter((alert) => {
    if (pointInGeometry({ lat: beach.lat, lng: beach.lng }, alert.geometry)) return true;
    return beach.county && countyPattern.test(alert.area);
  });
}

function freshnessHours(isoDate, now = new Date()) {
  const timestamp = Date.parse(isoDate || "");
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (now.getTime() - timestamp) / 3_600_000);
}

function convertStation(station, now = new Date()) {
  if (!station) return null;
  const ageHours = freshnessHours(station.obs_time, now);
  return {
    station_id: station.id,
    station_name: station.name || station.id,
    observed_at: station.obs_time || null,
    age_hours: ageHours == null ? null : Math.round(ageHours * 10) / 10,
    fresh: ageHours != null && ageHours <= 6,
    distance_miles: station.distance_miles == null ? null : Math.round(station.distance_miles),
    wave_height_ft: station.wave_ht == null ? null : Math.round(station.wave_ht * 3.28084 * 10) / 10,
    water_temp_f: station.water_t == null ? null : Math.round(station.water_t * 9 / 5 + 32),
    wind_mph: station.wind_spd == null ? null : Math.round(station.wind_spd * 2.23694),
    wind_gust_mph: station.wind_gst == null ? null : Math.round(station.wind_gst * 2.23694),
  };
}

function chooseNearestStation(beach, stations, now = new Date()) {
  const lake = String(beach.lake || "").replace(/^Lake\s+/i, "").toLowerCase();
  const candidates = (stations || [])
    .filter((station) => String(station.lake || "").toLowerCase() === lake)
    .filter((station) => station.obs_time)
    .map((station) => ({
      ...station,
      distance_miles: haversineMiles(beach.lat, beach.lng, station.lat, station.lng),
    }))
    .sort((first, second) => {
      const firstAge = freshnessHours(first.obs_time, now);
      const secondAge = freshnessHours(second.obs_time, now);
      const firstFresh = firstAge != null && firstAge <= 6 ? 0 : 1;
      const secondFresh = secondAge != null && secondAge <= 6 ? 0 : 1;
      return firstFresh - secondFresh || first.distance_miles - second.distance_miles;
    });
  return convertStation(candidates[0] || null, now);
}

function scoreAirTemperature(maximum) {
  if (maximum == null) return 0;
  if (maximum >= 76 && maximum <= 88) return 25;
  if (maximum >= 70 && maximum <= 94) return 19;
  if (maximum >= 62 && maximum <= 99) return 10;
  return 3;
}

function scorePrecipitation(probability) {
  if (probability == null) return 0;
  if (probability <= 10) return 20;
  if (probability <= 25) return 16;
  if (probability <= 40) return 10;
  if (probability <= 60) return 4;
  return 0;
}

function scoreWind(gust) {
  if (gust == null) return 0;
  if (gust <= 12) return 15;
  if (gust <= 18) return 12;
  if (gust <= 25) return 7;
  if (gust <= 32) return 2;
  return 0;
}

function scoreWaterTemperature(temperature) {
  if (temperature == null) return 0;
  if (temperature >= 70) return 12;
  if (temperature >= 65) return 10;
  if (temperature >= 60) return 6;
  if (temperature >= 55) return 2;
  return 0;
}

function scoreWaves(height) {
  if (height == null) return 0;
  if (height < 1) return 13;
  if (height < 2) return 10;
  if (height < 3) return 6;
  if (height < 4) return 2;
  return 0;
}

function recommendationForScore(score) {
  if (score >= 85) return { level: "excellent", label: "Excellent beach weather" };
  if (score >= 72) return { level: "good", label: "Good beach day" };
  if (score >= 58) return { level: "mixed", label: "Mixed beach day" };
  return { level: "caution", label: "Conditions may disappoint" };
}

function isFiniteMetric(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function scoreBeach({ beach, weather, lakeConditions, waterQuality, hazards = [] }) {
  const weatherComplete =
    weather &&
    isFiniteMetric(weather.temperature_max_f) &&
    isFiniteMetric(weather.precipitation_probability_max) &&
    isFiniteMetric(weather.wind_gusts_max_mph);
  const lakeObservationCurrent = lakeConditions?.fresh === true;
  const lakeObservationComplete =
    lakeObservationCurrent &&
    isFiniteMetric(lakeConditions.water_temp_f) &&
    isFiniteMetric(lakeConditions.wave_height_ft);
  const dataComplete = Boolean(weatherComplete && lakeObservationComplete);

  if (waterQuality?.state === "closure") {
    return {
      score: 0,
      level: "closed",
      label: "Beach closure: stay out of the water",
      components: null,
      confidence: "high",
      eligible: false,
      data_complete: dataComplete,
      reasons: ["Michigan BeachGuard lists an active closure."],
    };
  }

  if (beach.swimming === false) {
    return {
      score: 0,
      level: "not-swim-beach",
      label: "Not a designated swim beach",
      components: null,
      confidence: "high",
      eligible: false,
      data_complete: dataComplete,
      reasons: ["This shoreline stop is not a designated swim beach."],
    };
  }

  if (!dataComplete) {
    const reasons = [];
    if (!weather) {
      reasons.push("The weather forecast did not load.");
    } else if (!weatherComplete) {
      reasons.push("The forecast is missing one or more required air, rain, or wind readings.");
    }
    if (!lakeObservationCurrent) {
      reasons.push("No NOAA lake observation six hours old or newer is available.");
    } else if (!lakeObservationComplete) {
      reasons.push("The recent NOAA observation does not include both water temperature and wave height.");
    }
    if (waterQuality?.state === "advisory") {
      reasons.unshift("Michigan BeachGuard lists an active contamination advisory.");
    } else if (waterQuality?.state === "unavailable") {
      reasons.push("The official water-quality feed is temporarily unavailable.");
    } else if (waterQuality?.state === "no-active-alert") {
      reasons.push("No active EGLE closure or contamination advisory was found.");
    }
    if (hazards.length) reasons.push(hazards[0].headline || hazards[0].event);

    return {
      score: null,
      level: waterQuality?.state === "advisory" ? "advisory" : hazards.length ? "caution" : "unknown",
      label:
        waterQuality?.state === "advisory"
          ? "Water-quality advisory"
          : hazards.length
            ? "Beach hazard in effect"
            : "Insufficient current data",
      components: null,
      confidence: "low",
      eligible: false,
      data_complete: false,
      reasons,
    };
  }

  const components = {
    air_comfort: scoreAirTemperature(weather.temperature_max_f),
    dry_weather: scorePrecipitation(weather.precipitation_probability_max),
    wind: scoreWind(weather.wind_gusts_max_mph),
    water_temperature: scoreWaterTemperature(lakeConditions.water_temp_f),
    waves: scoreWaves(lakeConditions.wave_height_ft),
    destination_fit: clamp(Number(beach.destinationScore) || 8, 0, 15),
  };
  let score = Object.values(components).reduce((total, value) => total + value, 0);
  const reasons = [];

  if (waterQuality?.state === "advisory") {
    score = Math.min(score, 20);
    reasons.push("Michigan BeachGuard lists an active contamination advisory.");
  } else if (waterQuality?.state === "unavailable") {
    reasons.push("The official water-quality feed is temporarily unavailable.");
  } else {
    reasons.push("No active EGLE closure or contamination advisory was found.");
  }

  if (hazards.length) {
    const serious = hazards.some((alert) => /extreme|severe/i.test(alert.severity));
    score = Math.min(score, serious ? 20 : 45);
    reasons.push(hazards[0].headline || hazards[0].event);
  }

  if (lakeConditions?.fresh && lakeConditions.wave_height_ft >= 4) {
    score = Math.min(score, 35);
    reasons.push("Observed waves are rough for casual swimming.");
  }
  if (lakeConditions?.fresh && lakeConditions.water_temp_f < 55) {
    score = Math.min(score, 55);
    reasons.push("Observed water temperature is cold enough to limit comfortable swimming.");
  }
  score = Math.round(clamp(score, 0, 100));
  const recommendation = recommendationForScore(score);
  if (waterQuality?.state === "advisory") {
    recommendation.level = "advisory";
    recommendation.label = "Water-quality advisory";
  } else if (hazards.length) {
    recommendation.level = "caution";
    recommendation.label = "Beach hazard in effect";
  }

  const confidence =
    waterQuality?.state !== "unavailable" && lakeConditions?.fresh
      ? "high"
      : waterQuality?.state !== "unavailable"
        ? "medium"
        : "low";

  return {
    score,
    level: recommendation.level,
    label: recommendation.label,
    components,
    confidence,
    eligible:
      waterQuality?.state === "no-active-alert" &&
      hazards.length === 0,
    data_complete: true,
    reasons,
  };
}

module.exports = {
  chooseNearestStation,
  getSeasonStatus,
  haversineMiles,
  matchAlertToBeach,
  matchNwsAlertsToBeach,
  normalizeBeachGuardAlerts,
  normalizeName,
  normalizeNwsAlerts,
  parsePointWkt,
  scoreBeach,
};
