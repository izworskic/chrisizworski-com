const CBBT_COORDINATES = Object.freeze({ latitude: 37.0329, longitude: -76.0833 });

const PARSER_VERSION = "cbbt-2026-10-01.1";

const URLS = Object.freeze({
  cbbtStatusHtml: "https://www.cbbt.com/home/tunnel-traffic/",
  cbbtStatusWp: "https://www.cbbt.com/wp-json/wp/v2/pages?slug=tunnel-traffic&_fields=id,modified_gmt,link,slug,content",
  cbbtHomepage: "https://www.cbbt.com/",
  cbbtAlertsHtml: "https://www.cbbt.com/alerts-info/",
  cbbtAlertsWp: "https://www.cbbt.com/wp-json/wp/v2/pages?slug=alerts-info&_fields=id,modified_gmt,link,slug,content",
  cbbtAdvisoryHtml: "https://www.cbbt.com/travel-advisory/",
  cbbtAdvisoryWp: "https://www.cbbt.com/wp-json/wp/v2/pages?slug=travel-advisory&_fields=id,modified_gmt,link,slug,content",
  cbbtWeather: "https://www.cbbt.com/weather/",
  cbbtWindPolicyPdf: "https://cbbt.com/wp-content/uploads/2022/06/Wind-Restriction-Policy-eff.-July-1-2022.pdf",
  cbbtTolls: "https://www.cbbt.com/tolls/",
  cbbtTollPdf: "https://www.cbbt.com/wp-content/uploads/2023/11/CBBTtollschedule2024FINAL.pdf",
  cbbtFaq: "https://www.cbbt.com/faqs/",
  noaaWind: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8638901&product=wind&time_zone=gmt&units=english&application=ChrisIzworskiCBBT&format=json",
  noaaAirTemp: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8638901&product=air_temperature&time_zone=gmt&units=english&application=ChrisIzworskiCBBT&format=json",
  noaaPressure: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8638901&product=air_pressure&time_zone=gmt&units=english&application=ChrisIzworskiCBBT&format=json",
  noaaMetadata: "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8638901.json?expand=sensors",
  nwsPoints: `https://api.weather.gov/points/${CBBT_COORDINATES.latitude},${CBBT_COORDINATES.longitude}`,
  nwsAlerts: `https://api.weather.gov/alerts/active?point=${CBBT_COORDINATES.latitude},${CBBT_COORDINATES.longitude}`,
  vdotIncidents: "https://www.511virginia.org/data/geojson/icons.incident.geojson",
  vdotConstruction: "https://www.511virginia.org/data/geojson/icons.construction.geojson",
});

const CACHE_POLICY = Object.freeze({
  cbbtStatus: { ttlMs: 30_000, staleFallbackMs: 5 * 60_000 },
  cbbtIncidents: { ttlMs: 60_000, staleFallbackMs: 10 * 60_000 },
  cbbtAdvisories: { ttlMs: 10 * 60_000, staleFallbackMs: 6 * 60 * 60_000 },
  noaa: { ttlMs: 2 * 60_000, staleFallbackMs: 30 * 60_000 },
  nwsPoints: { ttlMs: 6 * 60 * 60_000, staleFallbackMs: 24 * 60 * 60_000 },
  nwsForecast: { ttlMs: 10 * 60_000, staleFallbackMs: 3 * 60 * 60_000 },
  nwsAlerts: { ttlMs: 60_000, staleFallbackMs: 10 * 60_000 },
  vdot: { ttlMs: 3 * 60_000, staleFallbackMs: 60 * 60_000 },
});

const FRESHNESS = Object.freeze({
  cbbtStatus: { agingMs: 3 * 60_000, staleMs: 10 * 60_000 },
  cbbtIncident: { agingMs: 5 * 60_000, staleMs: 15 * 60_000 },
  noaaObservation: { agingMs: 18 * 60_000, staleMs: 30 * 60_000 },
  nwsForecast: { agingMs: 3 * 60 * 60_000, staleMs: 6 * 60 * 60_000 },
  nwsAlerts: { agingMs: 5 * 60_000, staleMs: 15 * 60_000 },
  vdot: { agingMs: 5 * 60_000, staleMs: 15 * 60_000 },
});

const TOLL_EFFECTIVE_DATE = "2024-01-01";
const TOLL_SOURCE_URL = URLS.cbbtTolls;

const TOLL_CLASSES = Object.freeze({
  1: { classId: 1, description: "Two-axle passenger/light vehicle; qualifying two-axle six-tire vehicle under 8 ft", initialOffPeak: 16, initialPeak: 21, returnOffPeak: 6, returnPeak: 1 },
  75: { classId: 75, description: "Class 1 with 30 or more one-way trips in 30 days", initial: 7, requiresEzPass: true, commuterOnly: true },
  2: { classId: 2, description: "Class 1 towing one-axle trailer", initial: 22, return: 12 },
  3: { classId: 3, description: "Class 1 towing two-axle trailer or other two-axle vehicle", initial: 26, return: 16 },
  4: { classId: 4, description: "Class 1 towing three-axle trailer", initial: 31, return: 21 },
  8: { classId: 8, description: "School bus as defined by Virginia law", initial: 1 },
  9: { classId: 9, description: "Two-axle six-tire vehicle over 8 ft, except bus, <= 42,000 lb", initial: 23 },
  10: { classId: 10, description: "Three-axle vehicle except bus; or class 9 towing one-axle trailer, <= 63,000 lb", initial: 28 },
  11: { classId: 11, description: "Four-axle vehicle; specified class 9/10 combinations, <= 77,700 lb", initial: 37 },
  12: { classId: 12, description: "Five-axle vehicle; specified class 9/10/11 combinations, < 84,000 lb", initial: 48 },
  13: { classId: 13, description: "Six-axle vehicle; specified class 10/11/12 combinations, < 84,000 lb", initial: 57 },
  14: { classId: 14, description: "Two-axle bus", initial: 40 },
  15: { classId: 15, description: "Three-axle bus", initial: 40 },
  16: { classId: 16, description: "Special over-dimension vehicle; escort and prior approval required", initial: 266, manualApproval: true },
});

const OFFICIAL_RESTRICTION_RULES = Object.freeze({
  NONE: {
    officialLabel: "No official wind restriction identified",
    speedLimitMph: null,
    noPassing: false,
    sourceUrl: URLS.cbbtWeather,
    policyText: "No Advisory or Level 1-3 restriction was identified in the official current-status source.",
  },
  ADVISORY: {
    officialLabel: "Advisory",
    windPolicyReferenceMph: 35,
    speedLimitMph: 45,
    noPassing: true,
    sourceUrl: URLS.cbbtWindPolicyPdf,
    policyText: "Speed limit reduced to 45 mph. No passing.",
  },
  LEVEL_1: {
    officialLabel: "Level 1",
    windPolicyReferenceMph: 40,
    speedLimitMph: 45,
    noPassing: true,
    sourceUrl: URLS.cbbtWindPolicyPdf,
    prohibited: [
      "Motorcycles",
      "Large pick-up campers (RVs)",
      "Camper trailers",
      "House trailers",
      "Anything being towed, except the explicitly listed empty-trailer configurations",
      "Vehicles with exterior cargo that may become unsecured due to high winds",
      "Six-wheel trucks such as moving vans, rental trucks, and box trucks",
      "Buses",
      "Empty tractor-trailers with less than 15,000 lb cargo",
    ],
    allowedExceptions: [
      "Tractors without trailers",
      "Empty flatbed trailers",
      "Empty car carriers",
      "Empty low-boys",
      "Empty logging trailers",
      "Tractor-trailers and tankers with at least 15,000 lb payload in addition to rig weight",
    ],
  },
  LEVEL_2: {
    officialLabel: "Level 2",
    windPolicyReferenceMph: 50,
    sourceUrl: URLS.cbbtWindPolicyPdf,
    allowedOnly: [
      "Cars without exterior cargo",
      "Pick-up trucks, including two-axle six-wheel pickups, without cargo",
      "Mini-vans",
      "Vans excluding high-profile/conversion vans",
      "SUVs",
    ],
  },
  LEVEL_3: {
    officialLabel: "Level 3",
    windPolicyReferenceMph: 60,
    closed: true,
    sourceUrl: URLS.cbbtWindPolicyPdf,
    policyText: "Closed to all traffic due to weather conditions or safety concerns.",
  },
  OTHER: { officialLabel: "Other official restriction", speedLimitMph: null, noPassing: null, sourceUrl: URLS.cbbtStatusHtml },
  UNKNOWN: { officialLabel: "Unknown", speedLimitMph: null, noPassing: null, sourceUrl: URLS.cbbtStatusHtml },
});

module.exports = {
  CACHE_POLICY,
  CBBT_COORDINATES,
  FRESHNESS,
  OFFICIAL_RESTRICTION_RULES,
  PARSER_VERSION,
  TOLL_CLASSES,
  TOLL_EFFECTIVE_DATE,
  TOLL_SOURCE_URL,
  URLS,
};
