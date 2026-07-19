const test = require("node:test");
const assert = require("node:assert/strict");

const buoysHandler = require("../api/buoys");
const buoyDetailHandler = require("../api/buoy/[id]");
const matchmakerHandler = require("../api/matchmaker");

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
    assert.equal(listResponse.body.stations.find((station) => station.id === "45001").wave_ht, 1);

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
});
