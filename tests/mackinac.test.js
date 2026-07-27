const test = require("node:test");
const assert = require("node:assert/strict");

const mackinacHandler = require("../api/mackinac");
const {
  classifyBridgeStatus,
  mergeNwsForecast,
  parseOfficialBridgeWind,
  parseOfficialConditions,
  parseWindSpeedMph,
  selectWindObservation,
} = require("../lib/mackinac");

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

const officialAllClear = {
  content: {
    rendered: `
      <div class="pf-content">
        <h2 class="status">Status:</h2>
        <h3 class="status">All Clear, Have a Pleasant Trip!</h3>
        <div class="date">Monday, Jul 27 - 8:49 AM</div>
        <div class="condition-description condition-1">
          <p>Currently there are no significant weather conditions to report.<br>
          Have a safe and pleasant trip!</p>
          <p>Construction SB Lane</p>
        </div>
      </div>`,
  },
};

const officialHighWind = {
  content: {
    rendered: `
      <div class="pf-content">
        <h3 class="status">High Wind Warning</h3>
        <div class="date">Monday, Jul 27 - 9:43 AM</div>
        <div class="condition-description condition-2">
          <p>Currently we are experiencing winds of sufficient force in the Straits area
          (20 - 34 mph) to issue a warning to all motorists preparing to cross the Mackinac Bridge.</p>
          <p>Motorists are instructed to reduce their speed to 20 miles per hour, turn on their
          four way flashers, and utilize the outside lane.</p>
          <p>The Mackinac Bridge Authority is monitoring wind speeds at various points along the structure.</p>
          <p>Construction SB Lane</p>
        </div>
      </div>`,
  },
};

const ndbcWind = `#YY  MM DD hh mm WDIR WSPD GST  WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
#yr  mo dy hr mn degT m/s  m/s     m sec sec degT hPa degC degC degC nmi hPa ft
2026 07 27 12 18 180  5.0  7.0    MM MM MM MM 1006.0 20.5 20.2 MM MM MM MM
2026 07 27 12 12 190  4.0  6.0    MM MM MM MM 1006.1 20.5 19.8 MM MM MM MM`;

test("official Bridge Authority HTML becomes a normalized live status", () => {
  const parsed = parseOfficialConditions(officialAllClear);
  assert.equal(parsed.available, true);
  assert.equal(parsed.level, "open");
  assert.equal(parsed.title, "All Clear, Have a Pleasant Trip!");
  assert.equal(parsed.updated_text, "Monday, Jul 27 - 8:49 AM");
  assert.equal(parsed.bridge_wind, null);
  assert.equal(parsed.wind_related, false);
  assert.deepEqual(parsed.traffic_notes, ["Construction SB Lane"]);
  assert.match(parsed.message, /no significant weather/i);
});

test("the official wind band outranks off-bridge weather without inventing an exact gust", () => {
  const parsed = parseOfficialConditions(officialHighWind);
  assert.equal(parsed.level, "advisory");
  assert.equal(parsed.wind_related, true);
  assert.deepEqual(parsed.bridge_wind, {
    min_mph: 20,
    max_mph: 34,
    label: "20–34 mph",
    basis: "sustained",
    kind: "range",
    exact: false,
    is_bridge_gauge: true,
    source_name: "Mackinac Bridge Authority",
  });
  assert.deepEqual(parsed.traffic_notes, ["Construction SB Lane"]);
  assert.deepEqual(parseOfficialBridgeWind("Bridge Closed", "Winds of 65 mph and above"), {
    min_mph: 65,
    max_mph: null,
    label: "65+ mph",
    basis: "sustained",
    kind: "minimum",
    exact: false,
    is_bridge_gauge: true,
    source_name: "Mackinac Bridge Authority",
  });
});

test("status classification preserves the official restriction hierarchy", () => {
  assert.equal(classifyBridgeStatus("Partial Closure", "Closed to high-profile vehicles"), "partial");
  assert.equal(classifyBridgeStatus("Bridge Closed", "Closed to all traffic"), "closed");
  assert.equal(classifyBridgeStatus("High Wind Warning", "RVs will be escorted"), "escort");
  assert.equal(classifyBridgeStatus("High Wind Warning", "Reduce speed to 20 mph"), "advisory");
  assert.equal(classifyBridgeStatus("All Clear", "Have a pleasant trip"), "open");
  assert.equal(classifyBridgeStatus("All Clear", "No current closures or advisories"), "open");
});

test("NWS hourly periods gain gusts and threshold bands from grid data", () => {
  const hourly = {
    properties: {
      periods: [
        {
          startTime: "2026-07-27T08:00:00-04:00",
          endTime: "2026-07-27T09:00:00-04:00",
          isDaytime: true,
          temperature: 72,
          probabilityOfPrecipitation: { value: 37 },
          windSpeed: "18 to 22 mph",
          windDirection: "SW",
          shortForecast: "Chance Thunderstorms",
        },
      ],
    },
  };
  const grid = {
    properties: {
      windGust: {
        uom: "wmoUnit:km_h-1",
        values: [{ validTime: "2026-07-27T12:00:00+00:00/PT1H", value: 48.28 }],
      },
    },
  };

  const [period] = mergeNwsForecast(hourly, grid);
  assert.equal(period.wind_mph, 22);
  assert.equal(period.gust_mph, 30);
  assert.equal(period.threshold_band, "advisory");
  assert.equal(period.precip_probability, 37);
  assert.equal(parseWindSpeedMph("Calm"), 0);
  assert.equal(parseWindSpeedMph("Light Wind"), 3);
});

test("the freshest nearby NOAA wind observation is selected and labeled as a proxy", () => {
  const observation = selectWindObservation(
    [
      {
        id: "MACM4",
        name: "Mackinaw City",
        latitude: 45.777,
        longitude: -84.721,
        text: ndbcWind,
      },
    ],
    Date.parse("2026-07-27T12:30:00Z"),
  );

  assert.equal(observation.station_id, "MACM4");
  assert.equal(observation.wind_mph, 11.2);
  assert.equal(observation.gust_mph, 15.7);
  assert.equal(observation.age_minutes, 12);
  assert.equal(observation.is_bridge_gauge, false);
});

test("Mackinac endpoint combines official status, NOAA wind, and NWS forecast", async () => {
  const originalFetch = global.fetch;
  const hourly = {
    properties: {
      generatedAt: "2026-07-27T12:20:00Z",
      periods: [
        {
          startTime: "2026-07-27T08:00:00-04:00",
          endTime: "2026-07-27T09:00:00-04:00",
          isDaytime: true,
          temperature: 72,
          probabilityOfPrecipitation: { value: 10 },
          windSpeed: "10 mph",
          windDirection: "W",
          shortForecast: "Mostly Sunny",
        },
      ],
    },
  };
  const grid = {
    properties: {
      windGust: {
        uom: "wmoUnit:km_h-1",
        values: [{ validTime: "2026-07-27T12:00:00+00:00/PT1H", value: 24.14 }],
      },
    },
  };

  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("wp-json")) return new Response(JSON.stringify(officialAllClear), { status: 200 });
    if (value.includes("MACM4")) return new Response(ndbcWind, { status: 200 });
    if (value.includes("45175")) return new Response("", { status: 200 });
    if (value.endsWith("/forecast/hourly")) {
      return new Response(JSON.stringify(hourly), { status: 200 });
    }
    return new Response(JSON.stringify(grid), { status: 200 });
  };

  try {
    const response = responseRecorder();
    await mackinacHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.degraded, false);
    assert.equal(response.body.official.level, "open");
    assert.equal(response.body.current_wind.station_id, "MACM4");
    assert.equal(response.body.forecast.hours.length, 1);
    assert.equal(response.body.forecast.hours[0].gust_mph, 15);
    assert.equal(response.body.cameras.length, 2);
    assert.equal(response.body.thresholds[2].level, "escort");
    assert.match(response.headers["cache-control"], /s-maxage=60/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Mackinac endpoint fails safe when the official status source is unavailable", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("simulated source outage");
  };

  try {
    const response = responseRecorder();
    await mackinacHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.degraded, true);
    assert.equal(response.body.official.available, false);
    assert.equal(response.body.official.level, "unknown");
    assert.equal(response.body.current_wind, null);
    assert.deepEqual(response.body.forecast.hours, []);
  } finally {
    global.fetch = originalFetch;
  }
});
