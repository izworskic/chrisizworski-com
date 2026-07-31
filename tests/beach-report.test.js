const test = require("node:test");
const assert = require("node:assert/strict");

const beachesHandler = require("../api/beaches");
const {
  chooseNearestStation,
  getSeasonStatus,
  matchAlertToBeach,
  matchNwsAlertsToBeach,
  matchNwsSwimRiskToBeach,
  normalizeBeachGuardAlerts,
  normalizeNwsAlerts,
  parsePointWkt,
  parseNwsSurfForecast,
  postedFlagStatus,
  scoreBeach,
} = require("../lib/beach-report");

function responseRecorder() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return body;
    },
  };
}

test("the daily ranking season turns on and off on Michigan calendar dates", () => {
  assert.equal(getSeasonStatus(new Date("2026-05-14T16:00:00Z")).active, false);
  assert.equal(getSeasonStatus(new Date("2026-05-15T16:00:00Z")).active, true);
  assert.equal(getSeasonStatus(new Date("2026-09-15T16:00:00Z")).active, true);
  assert.equal(getSeasonStatus(new Date("2026-09-16T16:00:00Z")).active, false);
  assert.equal(getSeasonStatus(new Date("2026-12-01T16:00:00Z")).starts_on, "2027-05-15");
});

test("BeachGuard point data normalizes and matches catalog names without broad proximity claims", () => {
  assert.deepEqual(parsePointWkt("POINT(-83.2719 43.9469)"), { lng: -83.2719, lat: 43.9469 });
  assert.equal(parsePointWkt("POLYGON((-83 43))"), null);
  const alerts = normalizeBeachGuardAlerts({
    insertUpdateList: [
      {
        id: "alert-1",
        siteId: "site-1",
        siteName: "Caseville County Park Beach",
        geographyWKT: "POINT(-83.2719 43.9469)",
        color: "#FF0000",
      },
    ],
  });
  assert.equal(alerts[0].state, "closure");
  assert.match(alerts[0].official_url, /site-1/);
  assert.equal(matchAlertToBeach({ name: "Caseville County Park", aliases: [], lat: 43.9469, lng: -83.2719 }, alerts).id, "alert-1");
  assert.equal(matchAlertToBeach({ name: "Unrelated Beach", aliases: [], lat: 44.5, lng: -84.2 }, alerts), null);
});

test("NWS land and marine alerts include relevant statements without treating every advisory as a beach hazard", () => {
  const alerts = normalizeNwsAlerts({
    features: [
      {
        id: "hazard-1",
        properties: {
          event: "Beach Hazards Statement",
          severity: "Moderate",
          urgency: "Expected",
          areaDesc: "Ottawa; Muskegon",
          headline: "Dangerous swimming conditions expected",
        },
        geometry: null,
      },
      {
        id: "statement-1",
        properties: {
          event: "Special Weather Statement",
          severity: "Moderate",
          areaDesc: "Ottawa",
          headline: "Strong thunderstorms with lightning moving toward Lake Michigan beaches",
          description: "Sudden wind gusts and lightning are possible near the shoreline.",
        },
        geometry: null,
      },
      {
        id: "marine-1",
        properties: {
          event: "Special Marine Warning",
          severity: "Severe",
          areaDesc: "Lake Huron nearshore waters",
          headline: "Waterspouts and damaging winds observed",
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[-83.5, 43.7], [-83.0, 43.7], [-83.0, 44.1], [-83.5, 44.1], [-83.5, 43.7]]],
        },
      },
      {
        id: "gale-1",
        properties: {
          event: "Gale Warning",
          severity: "Severe",
          areaDesc: "Lake Huron nearshore waters",
          headline: "Gale force winds and high waves expected",
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[-83.5, 43.7], [-83.0, 43.7], [-83.0, 44.1], [-83.5, 44.1], [-83.5, 43.7]]],
        },
      },
      {
        id: "small-craft-1",
        properties: { event: "Small Craft Advisory", areaDesc: "Lake Huron nearshore waters" },
        geometry: null,
      },
      {
        id: "irrelevant-statement",
        properties: {
          event: "Special Weather Statement",
          areaDesc: "Ottawa",
          headline: "Patchy frost possible inland",
        },
        geometry: null,
      },
      {
        id: "fire-weather-1",
        properties: { event: "Red Flag Warning", areaDesc: "Ottawa" },
        geometry: null,
      },
      {
        id: "winter-1",
        properties: { event: "Winter Weather Advisory", areaDesc: "Ottawa" },
        geometry: null,
      },
    ],
  });
  assert.equal(alerts.length, 4);
  assert.equal(matchNwsAlertsToBeach({ county: "Ottawa", lat: 43.05, lng: -86.25 }, alerts).length, 2);
  assert.equal(matchNwsAlertsToBeach({ county: "Huron", lat: 43.94, lng: -83.27 }, alerts).length, 2);
  assert.equal(alerts.find((alert) => alert.id === "statement-1").ranking_action, "exclude");
  assert.ok(alerts.every((alert) => alert.id !== "fire-weather-1"));
});

test("NWS Surf Zone Forecast swim risk parses, stays fresh, and matches a beach", () => {
  const now = new Date("2026-07-31T16:00:00Z");
  const product = {
    id: "surf-1",
    issuingOffice: "KDTX",
    issuanceTime: "2026-07-31T12:00:00Z",
    productText: `MIZ049-312200-
Huron-
Including the beaches of Caseville County Park Beach and Port Crescent State Park
1200 PM EDT Fri Jul 31 2026

.REST OF TODAY...
Swim Risk*..................Low.
Wave Height.................1 foot or less.
Water Temperature...........72 degrees.
Weather.....................Sunny.
Winds.......................North winds 5 mph.
UV Index*...................Very high.

&&
$$`,
  };
  const forecasts = parseNwsSurfForecast(product, new Map([["MIZ049", "Huron"]]), now);
  assert.equal(forecasts.length, 1);
  assert.equal(forecasts[0].status, "low");
  assert.equal(forecasts[0].wave_height, "1 foot or less");
  assert.equal(forecasts[0].office, "DTX");
  assert.equal(
    matchNwsSwimRiskToBeach(
      { name: "Caseville County Park", aliases: ["Caseville County Park Beach"], county: "Huron" },
      forecasts,
    ).zone_id,
    "MIZ049",
  );
  assert.deepEqual(
    parseNwsSurfForecast({ ...product, issuanceTime: "2026-07-29T12:00:00Z" }, { MIZ049: "Huron" }, now),
    [],
  );
  assert.equal(
    matchNwsSwimRiskToBeach(
      { name: "Whitefish Point", aliases: [], county: "Chippewa", lake: "Lake Superior" },
      [{ ...forecasts[0], zone_name: "Southeast Chippewa", including: "the Lake Huron beaches of Chippewa County" }],
    ),
    null,
  );
  assert.equal(
    matchNwsSwimRiskToBeach(
      { name: "Unrelated Beach", aliases: [], county: "Elsewhere", lake: "Lake Michigan" },
      [{ ...forecasts[0], zone_name: "Other", including: "" }],
    ),
    null,
  );

  const flag = postedFlagStatus({ access: "State park" });
  assert.equal(flag.status, "unknown");
  assert.match(flag.label, /check at the beach/i);
  assert.match(flag.interpretation, /not the posted flag/i);
});

test("fresh NOAA observations are converted while old readings never earn score points", () => {
  const now = new Date("2026-07-31T16:00:00Z");
  const stations = [
    { id: "fresh", name: "Fresh station", lake: "Huron", lat: 43.9, lng: -83.3, obs_time: "2026-07-31T13:00:00Z", wave_ht: 0.5, water_t: 22, wind_spd: 3 },
    { id: "old", name: "Old station", lake: "Huron", lat: 43.94, lng: -83.27, obs_time: "2026-07-30T12:00:00Z", wave_ht: 0.1, water_t: 28, wind_spd: 1 },
  ];
  const selected = chooseNearestStation({ lake: "Lake Huron", lat: 43.94, lng: -83.27 }, stations, now);
  assert.equal(selected.station_id, "fresh");
  assert.equal(selected.fresh, true);
  assert.equal(selected.water_temp_f, 72);
});

test("official closure and advisory states override an otherwise perfect planning score", () => {
  const input = {
    beach: { destinationScore: 15, swimming: true },
    weather: { temperature_max_f: 82, precipitation_probability_max: 0, wind_gusts_max_mph: 8 },
    lakeConditions: { fresh: true, water_temp_f: 72, wave_height_ft: 0.5 },
    hazards: [],
    swimRisk: { status: "low" },
  };
  const closure = scoreBeach({ ...input, waterQuality: { state: "closure" } });
  assert.equal(closure.score, 0);
  assert.equal(closure.level, "closed");
  assert.equal(closure.eligible, false);
  const advisory = scoreBeach({ ...input, waterQuality: { state: "advisory" } });
  assert.equal(advisory.score, 20);
  assert.equal(advisory.level, "advisory");
  const noAlert = scoreBeach({ ...input, waterQuality: { state: "no-active-alert" } });
  assert.equal(noAlert.score, 100);
  assert.equal(noAlert.eligible, true);
  assert.ok(noAlert.reasons.every((reason) => !/safe to swim|water is safe/i.test(reason)));

  const moderateRisk = scoreBeach({ ...input, waterQuality: { state: "no-active-alert" }, swimRisk: { status: "moderate" } });
  assert.equal(moderateRisk.score, 45);
  assert.equal(moderateRisk.eligible, false);
  assert.match(moderateRisk.label, /moderate nws swim risk/i);

  const highRisk = scoreBeach({ ...input, waterQuality: { state: "no-active-alert" }, swimRisk: { status: "high" } });
  assert.equal(highRisk.score, 20);
  assert.equal(highRisk.level, "danger");
  assert.equal(highRisk.eligible, false);

  const missingRisk = scoreBeach({ ...input, waterQuality: { state: "no-active-alert" }, swimRisk: null });
  assert.equal(missingRisk.eligible, false);
  assert.match(missingRisk.reasons.join(" "), /not matched/i);

  const severeMarineWarning = scoreBeach({
    ...input,
    waterQuality: { state: "no-active-alert" },
    hazards: [{ event: "Special Marine Warning", headline: "Waterspouts observed", category: "severe-weather", severity: "Severe" }],
  });
  assert.equal(severeMarineWarning.score, 20);
  assert.equal(severeMarineWarning.level, "danger");
  assert.equal(severeMarineWarning.eligible, false);
});

test("missing, incomplete, and stale required inputs produce N/A instead of fallback points", () => {
  const input = {
    beach: { destinationScore: 15, swimming: true },
    weather: { temperature_max_f: 82, precipitation_probability_max: 0, wind_gusts_max_mph: 8 },
    waterQuality: { state: "no-active-alert" },
    hazards: [],
    swimRisk: { status: "low" },
  };

  const noLakeObservation = scoreBeach({ ...input, lakeConditions: null });
  assert.equal(noLakeObservation.score, null);
  assert.equal(noLakeObservation.label, "Insufficient current data");
  assert.equal(noLakeObservation.eligible, false);
  assert.equal(noLakeObservation.data_complete, false);

  const incompleteObservation = scoreBeach({
    ...input,
    lakeConditions: { fresh: true, water_temp_f: 72, wave_height_ft: null },
  });
  assert.equal(incompleteObservation.score, null);
  assert.match(incompleteObservation.reasons.join(" "), /does not include both water temperature and wave height/i);

  const staleObservation = scoreBeach({
    ...input,
    lakeConditions: { fresh: false, water_temp_f: 72, wave_height_ft: 0.5 },
  });
  assert.equal(staleObservation.score, null);
  assert.match(staleObservation.reasons.join(" "), /six hours old or newer/i);

  const incompleteForecast = scoreBeach({
    ...input,
    weather: { temperature_max_f: 82, precipitation_probability_max: null, wind_gusts_max_mph: 8 },
    lakeConditions: { fresh: true, water_temp_f: 72, wave_height_ft: 0.5 },
  });
  assert.equal(incompleteForecast.score, null);
  assert.match(incompleteForecast.reasons.join(" "), /missing one or more required/i);
});

test("beach API keeps source truth and exclusion rules in its browser contract", async () => {
  const originalFetch = global.fetch;
  const latest = `#STN LAT LON YYYY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES PTDY ATMP WTMP DEWP VIS TIDE
#text units units yr mo dy hr mn degT m/s m/s m sec sec degT hPa hPa degC degC degC nmi ft
45163 43.984 -83.271 2026 07 31 12 00 240 3.0 4.0 0.4 5.0 MM 230 1015.3 MM 24.0 22.0 MM MM MM`;
  const surfProduct = {
    id: "surf-api-1",
    issuingOffice: "KDTX",
    issuanceTime: new Date().toISOString(),
    productText: `MIZ049-312200-
Huron-
Including the beaches of Caseville County Park Beach
1200 PM EDT Fri Jul 31 2026

.REST OF TODAY...
Swim Risk*..................Low.
Wave Height.................1 foot or less.
Water Temperature...........72 degrees.
Winds.......................North winds 5 mph.

&&
$$`,
  };
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("getWslSettings")) return new Response("{}", { status: 200, headers: { "set-cookie": "ASP.NET_SessionId=test; path=/" } });
    if (value.includes("/ss/explorersites")) {
      return new Response(JSON.stringify({ insertUpdateList: [{ id: "a1", siteId: "s1", siteName: "Caseville County Park Beach", geographyWKT: "POINT(-83.2719 43.9469)", color: "#FF0000" }] }), { status: 200 });
    }
    if (value.includes("open-meteo.com")) {
      return new Response(JSON.stringify({
        current: { time: "2026-07-31T12:00", temperature_2m: 81, apparent_temperature: 82, weather_code: 0, wind_speed_10m: 6, wind_gusts_10m: 9, precipitation: 0 },
        daily: { time: ["2026-07-31"], temperature_2m_max: [84], temperature_2m_min: [65], apparent_temperature_max: [85], precipitation_probability_max: [5], weather_code: [0], sunshine_duration: [36000], wind_gusts_10m_max: [10], sunrise: ["2026-07-31T06:15"], sunset: ["2026-07-31T21:00"] },
      }), { status: 200 });
    }
    if (value.includes("latest_obs.txt")) return new Response(latest, { status: 200 });
    if (value.includes("/zones/forecast")) {
      return new Response(JSON.stringify({ features: [{ properties: { id: "MIZ049", name: "Huron" } }] }), { status: 200 });
    }
    if (value.includes("/products/types/SRF/")) {
      return new Response(JSON.stringify(surfProduct), { status: 200 });
    }
    if (value.includes("/alerts/active")) return new Response(JSON.stringify({ features: [] }), { status: 200 });
    throw new Error("unexpected URL " + value);
  };

  try {
    const response = responseRecorder();
    await beachesHandler({ method: "GET", query: { slug: "caseville-county-park" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.count, 1);
    assert.equal(response.body.beaches[0].water_quality.state, "closure");
    assert.equal(response.body.beaches[0].swim_risk.status, "low");
    assert.equal(response.body.beaches[0].posted_flag.status, "unknown");
    assert.equal(response.body.beaches[0].rating.score, 0);
    assert.deepEqual(response.body.daily_top_slugs, []);
    assert.equal(response.body.daily_ranking.available, true);
    assert.equal(response.body.daily_ranking.state, "live");
    assert.match(response.body.sources.beachguard.truth_rule, /not the same as a recent test/i);
    assert.match(response.body.sources.swim_risk.truth_rule, /not the posted flag/i);
    assert.equal(response.body.sources.hazards.active_alert_count, 0);
    assert.equal(response.headers["x-robots-tag"], "noindex, nofollow");
  } finally {
    global.fetch = originalFetch;
  }
});
