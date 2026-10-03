const test = require("node:test");
const assert = require("node:assert/strict");

const niagaraHandler = require("../api/niagara-border-crossings");
const {
  buildDecision,
  evaluateEligibility,
  freshnessFromTimestamp,
  mergeNiagaraSources,
  parseNfbcTrafficHtml,
} = require("../lib/niagara-border-crossings");

const NOW = new Date("2026-10-02T16:10:00.000Z");

function cbpLane(delay, operational = delay == null ? "N/A" : "delay", lanes = "1", update = "At 12:00 pm EDT") {
  return {
    update_time: update,
    operational_status: operational,
    delay_minutes: delay == null ? "" : String(delay),
    lanes_open: lanes,
  };
}

function cbpPort(portNumber, name, passengerDelay, commercialDelay = null, nexusDelay = null, status = "Open") {
  return {
    port_number: portNumber,
    crossing_name: name,
    port_status: status,
    hours: portNumber === "090103" ? "7 am-11 pm" : "24 hrs/day",
    date: "10/2/2026",
    time: "12:05:00",
    passenger_vehicle_lanes: {
      standard_lanes: cbpLane(passengerDelay),
      NEXUS_SENTRI_lanes: nexusDelay == null ? cbpLane(null, "Lanes Closed", "") : cbpLane(nexusDelay, "delay", "1"),
      ready_lanes: cbpLane(null, "N/A", ""),
    },
    commercial_vehicle_lanes: {
      standard_lanes: commercialDelay == null ? cbpLane(null, "N/A", "") : cbpLane(commercialDelay),
      FAST_lanes: cbpLane(null, "N/A", ""),
    },
    construction_notice: "",
  };
}

function federalFixture({ peace = 8, rainbow = 3, whirlpool = null, lewiston = 5 } = {}) {
  return [
    cbpPort("090101", "Peace Bridge", peace, 4, 0),
    cbpPort("090102", "Rainbow Bridge", rainbow, null, null),
    cbpPort("090103", "Whirlpool Bridge", whirlpool, null, whirlpool),
    cbpPort("090104", "Lewiston Bridge", lewiston, 2, null),
  ];
}

function cbsaFixture({ peace = 8, rainbow = 3, lewiston = 5, updated = "2026-10-02 12:00 EDT" } = {}) {
  const format = (value) => value === 0 ? "No Delay" : `${value} minutes`;
  return `Customs Office;; Location;; Last updated;; Commercial Flow - Canada bound;; Commercial Flow - U.S. bound;; Travellers Flow - Canada bound;; Travellers Flow - U.S. bound;;\nQueenston Lewiston Bridge (Travellers and Commercial);; Niagara-on-the-Lake, ON/Lewiston, NY;; ${updated};; 2 minutes;; --;; ${format(lewiston)};; --;;\nNiagara Falls Rainbow Bridge(Travellers only);; Niagara Falls, ON/Niagara Falls, NY;; ${updated};; Not Applicable;; --;; ${format(rainbow)};; --;;\nFort Erie (Peace Bridge);; Fort Erie, ON/Buffalo, NY;; ${updated};; 4 minutes;; --;; ${format(peace)};; --;;`;
}

function nfbcFixture({ peaceUs = 8, rainbowUs = 3, lewistonUs = 5, peaceCa = 8, rainbowCa = 3, lewistonCa = 5 } = {}) {
  const label = (value) => value === 0 ? "No Delay" : `${value} min`;
  return `
    <p>Real-time traffic conditions as of: Fri Oct. 02, 2026 12:00 PM</p>
    <table>
      <tr><th>To U.S.A.</th><th>Lewiston Queenston</th><th>Rainbow</th><th>Whirlpool</th><th>Peace Bridge</th></tr>
      <tr><td>Autos</td><td>${label(lewistonUs)}</td><td>${label(rainbowUs)}</td><td>N/A</td><td>${label(peaceUs)}</td></tr>
      <tr><td>Trucks</td><td>No Delay</td><td>N/A</td><td>N/A</td><td>No Delay</td></tr>
      <tr><td>Nexus</td><td>N/A</td><td>N/A</td><td>No Delay</td><td>No Delay</td></tr>
      <tr><th>To Canada</th><th>Lewiston Queenston</th><th>Rainbow</th><th>Whirlpool</th><th>Peace Bridge</th></tr>
      <tr><td>Autos</td><td>${label(lewistonCa)}</td><td>${label(rainbowCa)}</td><td>N/A</td><td>${label(peaceCa)}</td></tr>
      <tr><td>Trucks</td><td>No Delay</td><td>N/A</td><td>N/A</td><td>No Delay</td></tr>
      <tr><td>Nexus</td><td>No Delay</td><td>N/A</td><td>No Delay</td><td>No Delay</td></tr>
    </table>
    <p>** Real-time technology is not currently available.</p>
  `;
}

function merged(fixtures = {}) {
  return mergeNiagaraSources(
    federalFixture(fixtures.us),
    cbsaFixture(fixtures.ca),
    nfbcFixture(fixtures.operator),
    NOW,
  );
}

function responseRecorder() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
    end() { this.body = null; return null; },
  };
}

test("NFBC parser preserves direction and marks Whirlpool as non-real-time context", () => {
  const parsed = parseNfbcTrafficHtml(nfbcFixture());
  assert.equal(parsed.to_us.rainbow.passenger.wait_minutes, 3);
  assert.equal(parsed.to_canada.peace.passenger.wait_minutes, 8);
  assert.equal(parsed.to_canada.whirlpool.nexus.wait_minutes, 0);
  assert.match(parsed.note, /real-time technology is not currently available/i);
  assert.equal(parsed.observed_at, "2026-10-02T16:00:00.000Z");
});

test("federal directions remain separate and CBSA does not invent Whirlpool coverage", () => {
  const crossings = merged({ us: { peace: 21 }, ca: { peace: 7 } });
  const peace = crossings.find((crossing) => crossing.id === "peace");
  const whirlpool = crossings.find((crossing) => crossing.id === "whirlpool");
  assert.equal(peace.waits.to_us.passenger.standard.wait_minutes, 21);
  assert.equal(peace.waits.to_canada.passenger.standard.wait_minutes, 7);
  assert.equal(whirlpool.source_available.to_canada, false);
  assert.equal(whirlpool.waits.to_canada.passenger.standard.available, false);
});

test("Rainbow Bridge is never eligible for a commercial vehicle", () => {
  const rainbow = merged().find((crossing) => crossing.id === "rainbow");
  const eligibility = evaluateEligibility(rainbow, { direction: "to_canada", vehicle: "commercial", program: "none" }, NOW);
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.state, "CROSSING_INELIGIBLE");
});

test("Whirlpool rejects non-NEXUS travelers and limits Global Entry to U.S.-bound", () => {
  const whirlpool = merged().find((crossing) => crossing.id === "whirlpool");
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_canada", vehicle: "passenger", program: "none" }, NOW).eligible, false);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_canada", vehicle: "passenger", program: "global_entry" }, NOW).eligible, false);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_us", vehicle: "passenger", program: "global_entry" }, NOW).eligible, true);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_canada", vehicle: "passenger", program: "nexus" }, NOW).eligible, true);
});

test("freshness degradation never erases static crossing restrictions", () => {
  const staleNow = new Date("2026-10-02T18:00:00.000Z");
  const crossings = mergeNiagaraSources(federalFixture(), cbsaFixture(), nfbcFixture(), staleNow);
  const rainbow = crossings.find((crossing) => crossing.id === "rainbow");
  assert.equal(rainbow.waits.to_us.passenger.standard.freshness.state, "expired");
  assert.equal(rainbow.eligibility.commercial, false);
  const decision = buildDecision(crossings, {
    direction: "to_us",
    vehicle: "commercial",
    program: "none",
    approach_id: "rainbow",
  }, staleNow);
  const rainbowResult = decision.results.find((result) => result.id === "rainbow");
  assert.equal(rainbowResult.eligible, false);
  assert.equal(rainbowResult.eligibility_state, "CROSSING_INELIGIBLE");
});

test("shorter posted wait does not justify a longer total trip after diversion buffer", () => {
  const crossings = merged({ ca: { peace: 12, rainbow: 0, lewiston: 0 }, operator: { peaceCa: 12, rainbowCa: 0, lewistonCa: 0 } });
  const decision = buildDecision(crossings, {
    direction: "to_canada",
    vehicle: "passenger",
    program: "none",
    approach_id: "peace",
  }, NOW);
  assert.equal(decision.state, "USE_PRIMARY_CROSSING");
  assert.equal(decision.recommended_id, "peace");
});

test("alternate is recommended only when wait savings survive the diversion threshold", () => {
  const crossings = merged({ ca: { peace: 55, rainbow: 5, lewiston: 20 }, operator: { peaceCa: 55, rainbowCa: 5, lewistonCa: 20 } });
  const decision = buildDecision(crossings, {
    direction: "to_canada",
    vehicle: "passenger",
    program: "none",
    approach_id: "peace",
  }, NOW);
  assert.equal(decision.state, "ALTERNATE_CROSSING_BETTER");
  assert.equal(decision.recommended_id, "rainbow");
  assert.ok(decision.advantage_minutes >= 10);
});

test("material operator/federal disagreement is exposed and excluded from confident comparison", () => {
  const crossings = merged({ ca: { peace: 5, rainbow: 5, lewiston: 5 }, operator: { peaceCa: 50, rainbowCa: 5, lewistonCa: 5 } });
  const decision = buildDecision(crossings, {
    direction: "to_canada",
    vehicle: "passenger",
    program: "none",
    approach_id: "peace",
  }, NOW);
  const peace = decision.results.find((result) => result.id === "peace");
  assert.equal(peace.source_conflict, true);
  assert.equal(peace.comparable, false);
});

test("all dynamic sources can disappear without changing the static persona matrix", () => {
  const crossings = mergeNiagaraSources([], "", "", NOW);
  const rainbow = crossings.find((crossing) => crossing.id === "rainbow");
  const whirlpool = crossings.find((crossing) => crossing.id === "whirlpool");
  assert.equal(rainbow.eligibility.commercial, false);
  assert.equal(whirlpool.nexus_required, true);
  const decision = buildDecision(crossings, {
    direction: "to_canada",
    vehicle: "passenger",
    program: "none",
    approach_id: "peace",
  }, NOW);
  assert.equal(decision.state, "INSUFFICIENT_DATA");
  assert.equal(decision.recommended_id, null);
});

test("freshness has explicit current, stale and expired transitions", () => {
  assert.equal(freshnessFromTimestamp("2026-10-02T16:00:00.000Z", "cbp", NOW).state, "current");
  assert.equal(freshnessFromTimestamp("2026-10-02T15:50:00.000Z", "cbp", NOW).state, "stale");
  assert.equal(freshnessFromTimestamp("2026-10-02T15:00:00.000Z", "cbp", NOW).state, "expired");
  assert.equal(freshnessFromTimestamp(null, "cbp", NOW).state, "unknown");
});

test("API returns a complete four-crossing contract when optional 511 keys are absent", async () => {
  const originalFetch = global.fetch;
  const oldNy = process.env.NY511_API_KEY;
  const oldOn = process.env.ONTARIO511_API_KEY;
  delete process.env.NY511_API_KEY;
  delete process.env.ONTARIO511_API_KEY;
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("bwt.cbp.gov")) return new Response(JSON.stringify(federalFixture()), { status: 200 });
    if (value.includes("bwt-eng.csv")) return new Response(cbsaFixture(), { status: 200 });
    if (value.includes("niagarafallsbridges.com")) return new Response(nfbcFixture(), { status: 200 });
    if (value.includes("api.weather.gov")) return new Response(JSON.stringify({ features: [] }), { status: 200 });
    throw new Error(`unexpected fetch ${value}`);
  };
  try {
    const response = responseRecorder();
    await niagaraHandler({ method: "GET", query: { direction: "to_canada", vehicle: "passenger", approach_id: "peace" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.crossings.length, 4);
    assert.equal(response.body.sources.ny511.configured, false);
    assert.equal(response.body.sources.ontario511.configured, false);
    assert.ok(response.body.decision);
    assert.match(response.headers["cache-control"], /s-maxage=60/);
  } finally {
    global.fetch = originalFetch;
    if (oldNy == null) delete process.env.NY511_API_KEY; else process.env.NY511_API_KEY = oldNy;
    if (oldOn == null) delete process.env.ONTARIO511_API_KEY; else process.env.ONTARIO511_API_KEY = oldOn;
  }
});
