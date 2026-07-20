const test = require("node:test");
const assert = require("node:assert/strict");

const buoysHandler = require("../api/buoys");
const buoyDetailHandler = require("../api/buoy/[id]");
const matchmakerHandler = require("../api/matchmaker");
const sooVesselsHandler = require("../api/soo-vessels");

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

test("all dynamic endpoints retain their browser-facing JSON contracts", async () => {
  const originalFetch = global.fetch;
  const latest = `#STN LAT LON YYYY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES PTDY ATMP WTMP DEWP VIS TIDE
#text units units yr mo dy hr mn degT m/s m/s m sec sec degT hPa hPa degC degC degC nmi ft
45001 48.061 -87.793 2026 07 19 12 00 240 7.0 8.0 1.0 5.0 MM 230 1015.3 MM 7.7 3.7 MM MM MM`;
  const history = `#YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
#yr  mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft
2026 07 19 12 00 240 7 8 1.0 5 MM 230 1015.3 7.7 3.7 MM MM MM MM`;

  global.fetch = async (url) => new Response(String(url).includes("latest_obs") ? latest : history, { status: 200 });

  try {
    const listResponse = responseRecorder();
    await buoysHandler({ method: "GET" }, listResponse);
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.count, listResponse.body.stations.length);
    assert.ok(listResponse.body.stations.length > 100);
    const station = listResponse.body.stations.find((item) => item.id === "45001");
    assert.equal(station.wave_ht, 1);
    for (const field of ["id", "name", "lake", "lat", "lng", "obs_time", "wind_spd", "wave_ht", "water_t"]) {
      assert.ok(Object.hasOwn(station, field), `station is missing ${field}`);
    }

    global.fetch = async () => {
      throw new Error("simulated NOAA outage");
    };
    const fallbackResponse = responseRecorder();
    await buoysHandler({ method: "GET" }, fallbackResponse);
    assert.equal(fallbackResponse.statusCode, 200);
    assert.equal(fallbackResponse.headers["x-data-fallback"], "snapshot");
    assert.equal(fallbackResponse.body.count, fallbackResponse.body.stations.length);
    assert.ok(fallbackResponse.body.stations.length > 100);

    global.fetch = async () => new Response(history, { status: 200 });

    const detailResponse = responseRecorder();
    await buoyDetailHandler({ method: "GET", query: { id: "45001" } }, detailResponse);
    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.body.id, "45001");
    assert.equal(detailResponse.body.count, 1);
    assert.equal(detailResponse.body.samples[0].water_t, 3.7);

    const matchmakerResponse = responseRecorder();
    await matchmakerHandler(
      {
        method: "POST",
        body: {
          zone: "Zone 6a: Bay City, Michigan area",
          sun: "Full sun: 8+ hours",
          space: "Medium in-ground garden",
          experience: "Beginner",
          goal: "Best flavor",
        },
      },
      matchmakerResponse,
    );
    assert.equal(matchmakerResponse.statusCode, 200);
    assert.equal(matchmakerResponse.body.varieties.length, 3);
    for (const variety of matchmakerResponse.body.varieties) {
      assert.deepEqual(Object.keys(variety).sort(), ["name", "seed_saving", "type", "why"]);
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test("dynamic endpoints reject unsupported or malformed requests predictably", async () => {
  const invalidStationResponse = responseRecorder();
  await buoyDetailHandler({ method: "GET", query: { id: "../bad" } }, invalidStationResponse);
  assert.equal(invalidStationResponse.statusCode, 400);

  const malformedJsonResponse = responseRecorder();
  await matchmakerHandler({ method: "POST", body: "{" }, malformedJsonResponse);
  assert.equal(malformedJsonResponse.statusCode, 400);

  const wrongMethodResponse = responseRecorder();
  await matchmakerHandler({ method: "GET" }, wrongMethodResponse);
  assert.equal(wrongMethodResponse.statusCode, 405);

  const wrongSooMethodResponse = responseRecorder();
  await sooVesselsHandler({ method: "POST" }, wrongSooMethodResponse);
  assert.equal(wrongSooMethodResponse.statusCode, 405);
  assert.equal(wrongSooMethodResponse.headers.allow, "GET");
});

test("Soo Locks AIS endpoint keeps missing credentials private and falls back safely", async () => {
  const previousKey = process.env.AISSTREAM_API_KEY;
  delete process.env.AISSTREAM_API_KEY;

  try {
    const response = responseRecorder();
    await sooVesselsHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["x-data-fallback"], "map-only");
    assert.equal(response.body.status, "unavailable");
    assert.equal(response.body.reason, "missing_configuration");
    assert.deepEqual(response.body.vessels, []);
    assert.ok(!JSON.stringify(response.body).includes("AISSTREAM_API_KEY"));
  } finally {
    if (previousKey === undefined) delete process.env.AISSTREAM_API_KEY;
    else process.env.AISSTREAM_API_KEY = previousKey;
  }
});

test("Soo Locks AIS parser accepts valid position reports and rejects bad coordinates", () => {
  const valid = sooVesselsHandler.parseAisMessage({
    MessageType: "PositionReport",
    MetaData: {
      MMSI: 366904930,
      ShipName: "LAKE FREIGHTER@@@@",
      time_utc: "2026-07-20T03:00:00Z",
    },
    Message: {
      PositionReport: {
        UserID: 366904930,
        Latitude: 46.5036,
        Longitude: -84.36,
        Sog: 7.4,
        Cog: 92.5,
        TrueHeading: 91,
      },
    },
  });

  assert.deepEqual(valid, {
    mmsi: "366904930",
    name: "LAKE FREIGHTER",
    latitude: 46.5036,
    longitude: -84.36,
    course: 92.5,
    heading: 91,
    speed: 7.4,
    received_at: "2026-07-20T03:00:00Z",
  });

  assert.equal(
    sooVesselsHandler.parseAisMessage({
      MessageType: "PositionReport",
      MetaData: { MMSI: 366904930 },
      Message: { PositionReport: { Latitude: 0, Longitude: 0 } },
    }),
    null,
  );

  const missingMotion = sooVesselsHandler.parseAisMessage({
    MessageType: "PositionReport",
    MetaData: { MMSI: 366904930 },
    Message: { PositionReport: { Latitude: 46.5036, Longitude: -84.36, Sog: null, Cog: null } },
  });
  assert.equal(missingMotion.speed, null);
  assert.equal(missingMotion.course, null);
});

test("Soo Locks AIS snapshot sends a bounded server-side subscription and deduplicates vessels", async () => {
  let subscription;

  class FakeWebSocket {
    constructor() {
      this.readyState = 0;
      setImmediate(() => {
        this.readyState = 1;
        this.onopen();
      });
    }

    send(value) {
      subscription = JSON.parse(value);
      const message = JSON.stringify({
        MessageType: "StandardClassBPositionReport",
        MetaData: { MMSI: 316001234, ShipName: "TEST SHIP" },
        Message: {
          StandardClassBPositionReport: {
            UserID: 316001234,
            Latitude: 46.51,
            Longitude: -84.35,
            Sog: 3.2,
            Cog: 180,
          },
        },
      });
      setImmediate(() => {
        this.onmessage({ data: message });
        this.onmessage({ data: message });
      });
    }

    close() {
      this.readyState = 3;
    }
  }

  const vessels = await sooVesselsHandler.collectVesselSnapshot("server-only-key", {
    WebSocketImpl: FakeWebSocket,
    captureMs: 20,
    connectTimeoutMs: 100,
  });

  assert.equal(subscription.APIKey, "server-only-key");
  assert.deepEqual(subscription.BoundingBoxes, [[[46.36, -84.58], [46.66, -84.14]]]);
  assert.ok(subscription.FilterMessageTypes.includes("PositionReport"));
  assert.equal(vessels.length, 1);
  assert.equal(vessels[0].name, "TEST SHIP");
});
