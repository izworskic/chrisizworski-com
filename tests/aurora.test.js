const test = require("node:test");
const assert = require("node:assert/strict");

const auroraHandler = require("../api/aurora");
const {
  buildRegionalOutlook,
  parseCurrentKp,
  parseKpForecast,
  parseOvation,
  parseSolarWind,
  regionVerdict,
  toFiniteNumber,
} = require("../lib/aurora");

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

const kpForecast = [
  { time_tag: "2026-08-03T12:00:00", kp: 3.33, observed: "observed" },
  { time_tag: "2026-08-03T15:00:00", kp: 4.67, observed: "predicted" },
  { time_tag: "2026-08-04T03:00:00", kp: 6.0, observed: "predicted", noaa_scale: "G2" },
  { time_tag: "2026-08-05T18:00:00", kp: 4.0, observed: "predicted" },
];

const currentKp = [
  { time_tag: "2026-08-03T09:00:00", Kp: 2.67, a_running: 11, station_count: 8 },
  { time_tag: "2026-08-03T12:00:00", Kp: 3.33, a_running: 18, station_count: 8 },
];

const magnetic = [{ time_tag: "2026-08-03T14:40:00Z", bz_gsm: -11.4, bt: 14.2 }];
const speed = [{ time_tag: "2026-08-03T14:41:00Z", proton_speed: 612 }];
const ovation = {
  "Observation Time": "2026-08-03T14:40:00Z",
  "Forecast Time": "2026-08-03T15:45:00Z",
  coordinates: [
    [272, 47, 18],
    [276, 47, 7],
    [277, 42, 0],
  ],
};

test("NOAA Kp products become bounded Michigan forecast values", () => {
  const parsed = parseKpForecast(kpForecast, Date.parse("2026-08-03T14:00:00Z"));
  assert.equal(parsed.peak_24h, 6);
  assert.equal(parsed.peak_24h_at, "2026-08-04T03:00:00.000Z");
  assert.equal(parsed.peak_72h, 6);
  assert.equal(parsed.periods.length, 4);

  const current = parseCurrentKp(currentKp);
  assert.equal(current.kp, 3.33);
  assert.equal(current.observed_at, "2026-08-03T12:00:00.000Z");
});

test("solar-wind and OVATION products retain timestamps and regional values", () => {
  const wind = parseSolarWind(magnetic, speed);
  assert.equal(wind.bz_gsm_nt, -11.4);
  assert.equal(wind.speed_km_s, 612);
  assert.equal(wind.observed_at, "2026-08-03T14:41:00.000Z");

  const parsed = parseOvation(ovation);
  assert.equal(parsed.valueAt(47.47, -87.89), 18);
  assert.equal(parsed.valueAt(46.5, -84.35), 7);
  assert.equal(toFiniteNumber(null), null);
  assert.equal(
    parseSolarWind([{ time_tag: "2026-08-03T14:40:00Z", bz_gsm: null, bt: null }], []),
    null,
  );
});

test("regional verdicts stay conditional instead of promising visibility", () => {
  const outlook = buildRegionalOutlook(ovation, 6);
  const keweenaw = outlook.regions.find((region) => region.id === "keweenaw");
  const detroit = outlook.regions.find((region) => region.id === "detroit");
  assert.equal(keweenaw.level, "active");
  assert.equal(detroit.level, "watch");
  assert.match(keweenaw.detail, /cloud cover/i);

  const unavailable = regionVerdict({ planning_kp: 5 }, null, null);
  assert.equal(unavailable.level, "unavailable");
});

test("aurora endpoint combines official NOAA sources with CDN caching", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("forecast.json")) return new Response(JSON.stringify(kpForecast), { status: 200 });
    if (value.endsWith("planetary-k-index.json")) return new Response(JSON.stringify(currentKp), { status: 200 });
    if (value.includes("mag-field")) return new Response(JSON.stringify(magnetic), { status: 200 });
    if (value.includes("wind-speed")) return new Response(JSON.stringify(speed), { status: 200 });
    if (value.includes("ovation_aurora")) return new Response(JSON.stringify(ovation), { status: 200 });
    return new Response("Not found", { status: 404 });
  };

  try {
    const response = responseRecorder();
    await auroraHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.degraded, false);
    assert.equal(response.body.forecast.current.kp, 3.33);
    assert.equal(response.body.forecast.peak_24h, 6);
    assert.equal(response.body.solar_wind.bz_gsm_nt, -11.4);
    assert.equal(response.body.ovation.regions.length, 8);
    assert.match(response.headers["cache-control"], /s-maxage=300/);
    assert.equal(response.headers["x-robots-tag"], "noindex, nofollow");
  } finally {
    global.fetch = originalFetch;
  }
});

test("aurora endpoint degrades safely when every NOAA source is unavailable", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("simulated NOAA outage");
  };

  try {
    const response = responseRecorder();
    await auroraHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.degraded, true);
    assert.equal(response.body.forecast.peak_24h, null);
    assert.equal(response.body.solar_wind, null);
    assert.ok(response.body.ovation.regions.every((region) => region.level === "unavailable"));
  } finally {
    global.fetch = originalFetch;
  }
});
