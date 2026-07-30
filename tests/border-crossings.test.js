const test = require("node:test");
const assert = require("node:assert/strict");

const borderHandler = require("../api/border-crossings");
const trendHandler = require("../api/border-trends");
const {
  CROSSINGS,
  compareDetroitCrossings,
  mergeWaitSources,
  normalizeCbpLane,
  normalizeCbpTrend,
  normalizeOntarioEvents,
  parseAgencyTimestamp,
  parseCbsaCsv,
  parseWaitMinutes,
} = require("../lib/border-crossings");

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
    end() {
      this.body = null;
      return null;
    },
  };
}

const cbsaCsv = `Customs Office;; Location;; Last updated;; Commercial Flow - Canada bound;; Commercial Flow - U.S. bound;; Travellers Flow - Canada bound;; Travellers Flow - U.S. bound;;
Sault Ste. Marie;; Sault Ste. Marie, ON/Sault Ste. Marie, MI;; 2026-07-28 22:15 EDT;; No Delay;; --;; No Delay;; --;;
Blue Water Bridge;; Point Edward, ON/Port Huron, MI;; 2026-07-28 21:15 EDT;; 20 minutes;; --;; 10 minutes;; --;;
Windsor and Detroit Tunnel;; Windsor, ON/Detroit, MI;; 2026-07-28 21:15 EDT;; No Delay;; --;; No Delay;; --;;
Ambassador Bridge;; Windsor, ON/Detroit, MI;; 2026-07-28 22:11 EDT;; 35 minutes;; --;; 30 minutes;; --;;
Gordie Howe International Bridge;; Windsor, ON/Detroit, MI;; 2026-07-28 21:15 EDT;; No Delay;; --;; No Delay;; --;;`;

function cbpLane(delay, operational = delay == null ? "N/A" : "delay", lanes = "1") {
  return {
    update_time: "At 10:00 pm EDT",
    operational_status: operational,
    delay_minutes: delay == null ? "" : String(delay),
    lanes_open: lanes,
  };
}

function cbpPort(portNumber, crossingName, passengerDelay, commercialDelay = passengerDelay) {
  return {
    port_number: portNumber,
    crossing_name: crossingName,
    port_status: "Open",
    hours: "24 hrs/day",
    date: "7/28/2026",
    time: "22:25:51",
    passenger_vehicle_lanes: {
      standard_lanes: cbpLane(passengerDelay),
      NEXUS_SENTRI_lanes: cbpLane(null, "Lanes Closed", ""),
      ready_lanes: cbpLane(null, "N/A", ""),
    },
    commercial_vehicle_lanes: {
      standard_lanes: cbpLane(commercialDelay),
      FAST_lanes: cbpLane(null, "N/A", ""),
    },
  };
}

const cbpPayload = [
  cbpPort("380102", "Gordie Howe International Bridge", 5, 0),
  cbpPort("380001", "Ambassador Bridge", 10, 5),
  cbpPort("380002", "Windsor Tunnel", 0, 0),
  cbpPort("380201", "Bluewater Bridge", 0, 0),
  cbpPort("380301", "International Bridge - SSM", 2, 2),
];

test("official wait values distinguish no delay, a measured delay, and unavailable data", () => {
  assert.equal(parseWaitMinutes("No Delay"), 0);
  assert.equal(parseWaitMinutes("35 minutes"), 35);
  assert.equal(parseWaitMinutes("--"), null);
  assert.equal(parseWaitMinutes("Not Applicable"), null);

  const rows = parseCbsaCsv(cbsaCsv);
  assert.equal(rows.get("Ambassador Bridge").passenger.wait_minutes, 30);
  assert.equal(rows.get("Gordie Howe International Bridge").passenger.wait_minutes, 0);
  assert.equal(rows.get("Blue Water Bridge").commercial.wait_minutes, 20);
});

test("official agency timestamps normalize to ISO values without inventing a time", () => {
  assert.equal(
    parseAgencyTimestamp("2026-07-28 22:15 EDT"),
    "2026-07-29T02:15:00.000Z",
  );
  assert.equal(
    parseAgencyTimestamp("At 10:00 pm EDT", "7/28/2026"),
    "2026-07-29T02:00:00.000Z",
  );
  assert.equal(parseAgencyTimestamp("At 10:00 pm EDT"), null);
  assert.equal(parseAgencyTimestamp("update pending"), null);
});

test("CBP lane normalization never turns missing or closed data into a zero-minute wait", () => {
  assert.deepEqual(
    normalizeCbpLane(cbpLane(0, "no delay", "2"), "Open"),
    {
      available: true,
      status: "reported",
      wait_minutes: 0,
      display: "No delay",
      lanes_open: 2,
      updated_text: "At 10:00 pm EDT",
      operational_status: "no delay",
    },
  );
  assert.equal(normalizeCbpLane(cbpLane(null, "N/A", ""), "Open").available, false);
  assert.equal(normalizeCbpLane(cbpLane(null, "Lanes Closed", ""), "Open").status, "closed");
  assert.equal(normalizeCbpLane(cbpLane(0, "no delay", "1"), "Closed").status, "closed");
});

test("all five Michigan–Ontario crossings merge both official directions without mixing them", () => {
  const crossings = mergeWaitSources(cbpPayload, cbsaCsv);
  assert.equal(crossings.length, 5);
  assert.deepEqual(
    crossings.map((crossing) => crossing.id),
    ["gordie-howe", "ambassador", "detroit-windsor-tunnel", "blue-water", "sault-ste-marie"],
  );

  const ambassador = crossings.find((crossing) => crossing.id === "ambassador");
  assert.equal(ambassador.waits.to_canada.passenger.standard.wait_minutes, 30);
  assert.equal(ambassador.waits.to_us.passenger.standard.wait_minutes, 10);
  assert.equal(
    ambassador.waits.to_canada.passenger.standard.updated_at,
    "2026-07-29T02:11:00.000Z",
  );
  assert.equal(
    ambassador.waits.to_us.passenger.standard.updated_at,
    "2026-07-29T02:00:00.000Z",
  );
  assert.match(ambassador.waits.to_canada.note, /excludes approach-road/i);
  assert.match(ambassador.waits.to_us.note, /entering the United States/i);

  const sault = crossings.find((crossing) => crossing.id === "sault-ste-marie");
  assert.equal(sault.region, "Upper Peninsula");
  assert.equal(sault.waits.to_canada.passenger.standard.wait_minutes, 0);
  assert.equal(sault.waits.to_us.passenger.standard.wait_minutes, 2);
  assert.equal(sault.cameras[0].image_url, "/api/border-media?camera=sault-ontario-approach");
});

test("Detroit comparison names the shortest official wait and reports ties honestly", () => {
  const crossings = mergeWaitSources(cbpPayload, cbsaCsv);
  const toCanada = compareDetroitCrossings(crossings, {
    direction: "to_canada",
    vehicle: "passenger",
    lane: "standard",
  });
  assert.equal(toCanada.is_tie, true);
  assert.deepEqual(toCanada.fastest_ids, ["gordie-howe", "detroit-windsor-tunnel"]);
  assert.match(toCanada.headline, /are tied/i);

  const toUs = compareDetroitCrossings(crossings, {
    direction: "to_us",
    vehicle: "passenger",
    lane: "standard",
  });
  assert.equal(toUs.is_tie, false);
  assert.deepEqual(toUs.fastest_ids, ["detroit-windsor-tunnel"]);
  assert.equal(toUs.wait_minutes, 0);
});

test("Ontario road events are attached only to a nearby crossing and remain separate from waits", () => {
  const grouped = normalizeOntarioEvents([
    {
      ID: 1,
      RoadwayName: "Highway 402",
      DirectionOfTravel: "Westbound",
      Description: "Collision near Front Street",
      Latitude: 42.99,
      Longitude: -82.41,
      EventType: "incident",
      IsFullClosure: false,
      LastUpdated: 1785276000,
    },
    {
      ID: 2,
      RoadwayName: "Highway 17",
      Description: "Far away construction",
      Latitude: 48.7,
      Longitude: -87.2,
      EventType: "roadwork",
    },
  ]);
  assert.equal(grouped["blue-water"].length, 1);
  assert.match(grouped["blue-water"][0].description, /Collision/);
  assert.equal(grouped["sault-ste-marie"].length, 0);
});

test("CBP trend data is labeled as historical context, not a best-time prediction", () => {
  const trend = normalizeCbpTrend(
    [
      {
        crossing_name: "Ambassador Bridge",
        date: "2026-07-28",
        private_time_slots: {
          private_slot: [
            {
              time: "8",
              standard_lane_today_wait: "5",
              standard_lane_average_wait: "11",
              standard_lane_min_wait: "0",
              standard_lane_max_wait: "35",
            },
          ],
        },
      },
    ],
    "passenger",
    "standard",
  );
  assert.equal(trend.hours[0].today_minutes, 5);
  assert.equal(trend.hours[0].typical_minutes, 11);
  assert.match(trend.note, /not a prediction or recommended crossing time/i);
});

test("border endpoint fails soft while preserving the complete five-crossing contract", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("bwt.cbp.gov")) {
      return new Response(JSON.stringify(cbpPayload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (value.includes("bwt-eng.csv")) return new Response(cbsaCsv, { status: 200 });
    if (value.includes("/get/event")) {
      return new Response(
        JSON.stringify([
          {
            ID: 1,
            RoadwayName: "Highway 402",
            Description: "Road work near bridge",
            Latitude: 42.99,
            Longitude: -82.41,
            EventType: "roadwork",
          },
        ]),
        { status: 200 },
      );
    }
    if (value.includes("/get/alerts")) return new Response("[]", { status: 200 });
    if (value.includes("42.9709")) throw new Error("simulated regional weather outage");
    return new Response(JSON.stringify({ features: [] }), { status: 200 });
  };

  try {
    const response = responseRecorder();
    await borderHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.crossings.length, 5);
    assert.equal(response.body.degraded, false);
    assert.equal(response.body.sources.weather_alerts.available, true);
    assert.equal(response.body.sources.weather_alerts.complete, false);
    assert.equal(response.body.crossings.find((item) => item.id === "blue-water").approach_traffic.events.length, 1);
    assert.match(response.body.definitions.excluded_delay, /not included/i);
    assert.match(response.headers["cache-control"], /s-maxage=60/);
    assert.ok(response.body.comparisons["to_us:passenger:standard"]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("trend endpoint validates crossing IDs and returns an unavailable state without inventing data", async () => {
  const invalid = responseRecorder();
  await trendHandler({ method: "GET", query: { crossing: "../bad" } }, invalid);
  assert.equal(invalid.statusCode, 400);

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    assert.match(String(url), /03380102\/\d{4}-\d{2}-\d{2}$/);
    return new Response("[]", { status: 200 });
  };
  try {
    const response = responseRecorder();
    await trendHandler(
      { method: "GET", query: { crossing: "gordie-howe", vehicle: "passenger", lane: "standard" } },
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.available, false);
    assert.match(response.body.note, /does not currently provide/i);
  } finally {
    global.fetch = originalFetch;
  }
});

test("crossing configuration includes Detroit, Blue Water, and Upper Peninsula coverage", () => {
  assert.equal(CROSSINGS.filter((crossing) => crossing.detroit_comparison).length, 3);
  assert.ok(CROSSINGS.some((crossing) => crossing.id === "blue-water"));
  assert.ok(CROSSINGS.some((crossing) => crossing.id === "sault-ste-marie"));
  assert.equal(new Set(CROSSINGS.map((crossing) => crossing.detail_path)).size, 5);
});
