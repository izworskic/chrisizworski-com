const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const niagaraHandler = require("../api/niagara-border-crossings");
const {
  CROSSINGS,
  compareNiagaraCrossings,
  evaluateEligibility,
  freshnessFor,
  mergeNiagaraSources,
  parseOperatorTrafficHtml,
  selectedObservation,
} = require("../lib/niagara-border-crossings");

const NOW = new Date("2026-10-03T01:30:00.000Z");

function cbpLane(delay, operational = delay == null ? "N/A" : "delay", lanes = "1", time = "At 9:20 pm EDT") {
  return { update_time: time, operational_status: operational, delay_minutes: delay == null ? "" : String(delay), lanes_open: lanes };
}

function cbpPort(portNumber, passengerDelay, commercialDelay = passengerDelay, nexusDelay = null, status = "Open", time = "At 9:20 pm EDT") {
  return {
    port_number: portNumber,
    crossing_name: portNumber,
    port_status: status,
    hours: portNumber === "090103" ? "7 am-11 pm" : "24 hrs/day",
    date: "10/2/2026",
    time: "21:25:00",
    passenger_vehicle_lanes: {
      standard_lanes: cbpLane(passengerDelay, passengerDelay == null ? "N/A" : "delay", "2", time),
      NEXUS_SENTRI_lanes: cbpLane(nexusDelay, nexusDelay == null ? "N/A" : "delay", nexusDelay == null ? "" : "1", time),
      ready_lanes: cbpLane(null, "N/A", "", time),
    },
    commercial_vehicle_lanes: {
      standard_lanes: cbpLane(commercialDelay, commercialDelay == null ? "N/A" : "delay", "2", time),
      FAST_lanes: cbpLane(null, "N/A", "", time),
    },
    construction_notice: "",
  };
}

function cbsaCsv(values = {}) {
  const peace = values.peace ?? 10;
  const rainbow = values.rainbow ?? 15;
  const lewiston = values.lewiston ?? 5;
  const lewistonCommercial = values.lewistonCommercial ?? 7;
  const updated = values.updated ?? "2026-10-02 21:20 EDT";
  return `Customs Office;; Location;; Last updated;; Commercial Flow - Canada bound;; Commercial Flow - U.S. bound;; Travellers Flow - Canada bound;; Travellers Flow - U.S. bound;;
Fort Erie (Peace Bridge);; Fort Erie, ON/Buffalo, NY;; ${updated};; ${peace} minutes;; --;; ${peace} minutes;; --;;
Niagara Falls Rainbow Bridge(Travellers only);; Niagara Falls, ON/Niagara Falls, NY;; ${updated};; Not Applicable;; --;; ${rainbow} minutes;; --;;
Queenston Lewiston Bridge (Travellers and Commercial);; Niagara-on-the-Lake, ON/Lewiston, NY;; ${updated};; ${lewistonCommercial} minutes;; --;; ${lewiston} minutes;; --;;`;
}

function operatorHtml(values = {}) {
  const us = { lewiston: values.usLewiston ?? 5, rainbow: values.usRainbow ?? 10, peace: values.usPeace ?? 12 };
  const ca = { lewiston: values.caLewiston ?? 5, rainbow: values.caRainbow ?? 15, peace: values.caPeace ?? 10 };
  const nexusUsWhirlpool = values.nexusUsWhirlpool ?? 0;
  const nexusCaWhirlpool = values.nexusCaWhirlpool ?? 0;
  const nexusCaLewiston = values.nexusCaLewiston ?? 0;
  const nexusCaPeace = values.nexusCaPeace ?? 0;
  const fmt = (value) => value === "closed" ? "CLOSED" : value === 0 ? "No Delay" : `${value} min`;
  return `<!doctype html><html><body>
  <p>Real-time traffic conditions as of: Fri Oct. 02, 2026 09:20 PM</p>
  <table>
    <tr><th>To U.S.A.</th><th>Lewiston Queenston</th><th>Rainbow</th><th>Whirlpool</th><th>Peace Bridge</th></tr>
    <tr><td>Autos</td><td>${fmt(us.lewiston)}</td><td>${fmt(us.rainbow)}</td><td>N/A</td><td>${fmt(us.peace)} 4/12 Open</td></tr>
    <tr><td>Trucks</td><td>No Delay</td><td>N/A</td><td>N/A</td><td>No Delay 2/8 Open</td></tr>
    <tr><td>Nexus</td><td>N/A</td><td>N/A</td><td>${fmt(nexusUsWhirlpool)}</td><td>No Delay 1/2 Open</td></tr>
    <tr><th>To Canada</th><th>Lewiston Queenston</th><th>Rainbow</th><th>Whirlpool</th><th>Peace Bridge</th></tr>
    <tr><td>Autos</td><td>${fmt(ca.lewiston)}</td><td>${fmt(ca.rainbow)}</td><td>N/A</td><td>${fmt(ca.peace)} 4/12 Open</td></tr>
    <tr><td>Trucks</td><td>No Delay</td><td>N/A</td><td>N/A</td><td>No Delay 2/5 Open</td></tr>
    <tr><td>Nexus</td><td>${fmt(nexusCaLewiston)}</td><td>N/A</td><td>${fmt(nexusCaWhirlpool)}</td><td>${fmt(nexusCaPeace)} 1/2 Open</td></tr>
  </table>
  <p>** Real-time technology is not currently available. These bridges are updated hourly.</p>
  </body></html>`;
}

function peaceOperatorHtml(values = {}) {
  const usPeace = values.usPeace ?? 12;
  const caPeace = values.caPeace ?? 10;
  return `<!doctype html><html><body>
  <p>Real-time traffic conditions as of: Fri Oct. 02, 2026 09:20 PM</p>
  <table>
    <tr><th><img alt="US Flag"></th><th>car</th><th>truck</th><th>nexus</th></tr>
    <tr><td>Peace Bridge</td><td>${usPeace} min 4/12 Open</td><td>No Delay 3/8 Open</td><td>No Delay 1/2 Open</td></tr>
    <tr><td>L. Queenston</td><td>11 min</td><td>No Delay</td><td>N/A</td></tr>
    <tr><td>Rainbow Bridge</td><td>10 min</td><td>N/A</td><td>N/A</td></tr>
    <tr><td>Whirlpool **</td><td>N/A</td><td>N/A</td><td>No Delay</td></tr>
    <tr><th><img alt="Canada Flag"></th><th>car</th><th>truck</th><th>nexus</th></tr>
    <tr><td>Peace Bridge</td><td>${caPeace} min 7/12 Open</td><td>No Delay 5/5 Open</td><td>No Delay 2/2 Open</td></tr>
    <tr><td>L. Queenston</td><td>15 min</td><td>No Delay</td><td>No Delay</td></tr>
    <tr><td>Rainbow Bridge</td><td>12 min</td><td>N/A</td><td>N/A</td></tr>
    <tr><td>Whirlpool **</td><td>N/A</td><td>N/A</td><td>No Delay</td></tr>
  </table></body></html>`;
}

function baseSources(options = {}) {
  const cbp = [
    cbpPort("090101", options.usPeace ?? 12, options.usPeaceTruck ?? 4, options.usPeaceNexus ?? 0, options.peaceStatus ?? "Open", options.cbpTime),
    cbpPort("090102", options.usRainbow ?? 10, null, null, options.rainbowStatus ?? "Open", options.cbpTime),
    cbpPort("090103", null, null, null, options.whirlpoolStatus ?? "Open", options.cbpTime),
    cbpPort("090104", options.usLewiston ?? 5, options.usLewistonTruck ?? 3, options.usLewistonNexus ?? null, options.lewistonStatus ?? "Open", options.cbpTime),
  ];
  const nfbc = parseOperatorTrafficHtml(operatorHtml(options.operator || {}), "Niagara Falls Bridge Commission", "https://www.niagarafallsbridges.com/services/traffic-conditions");
  const peace = parseOperatorTrafficHtml(peaceOperatorHtml(options.operator || {}), "Buffalo and Fort Erie Public Bridge Authority", "https://www.peacebridge.com/Traffic/index.php");
  return mergeNiagaraSources(cbp, cbsaCsv(options.cbsa || {}), { nfbc, peace });
}

function responseRecorder() {
  return {
    body: undefined, headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
    end() { this.body = null; return null; },
  };
}

test("registry has exactly four Niagara crossings and static rules are explicit", () => {
  assert.deepEqual(CROSSINGS.map((c) => c.id), ["peace", "rainbow", "whirlpool", "lewiston-queenston"]);
  assert.equal(CROSSINGS.find((x) => x.id === "rainbow").eligibility.commercial, false);
  assert.equal(CROSSINGS.find((x) => x.id === "whirlpool").nexus_required, true);
  assert.equal(CROSSINGS.find((x) => x.id === "lewiston-queenston").eligibility.pedestrian, false);
});

test("operator parser keeps wait, lane count, direction and Whirlpool NEXUS separate", () => {
  const parsed = parseOperatorTrafficHtml(operatorHtml(), "NFBC", "https://example.test/");
  assert.equal(parsed.waits.peace.to_us.passenger.wait_minutes, 12);
  assert.equal(parsed.waits.peace.to_us.passenger.lanes_open, 4);
  assert.equal(parsed.waits.peace.to_us.commercial.wait_minutes, 0);
  assert.equal(parsed.waits.whirlpool.to_canada.nexus.wait_minutes, 0);
  assert.equal(parsed.updated_at, "2026-10-03T01:20:00.000Z");
  assert.match(parsed.technology_note, /Whirlpool/i);
});

test("Peace row-oriented operator table parses without turning lane counts into waits", () => {
  const parsed = parseOperatorTrafficHtml(peaceOperatorHtml(), "Peace Bridge Authority", "https://www.peacebridge.com/");
  assert.equal(parsed.waits.peace.to_us.passenger.wait_minutes, 12);
  assert.equal(parsed.waits.peace.to_us.passenger.lanes_open, 4);
  assert.equal(parsed.waits.peace.to_canada.passenger.wait_minutes, 10);
  assert.equal(parsed.waits.whirlpool.to_us.nexus.wait_minutes, 0);
});

test("Rainbow can never be recommended to commercial traffic", () => {
  const crossings = baseSources({ cbsa: { peace: 30, rainbow: 0, lewiston: 15, lewistonCommercial: 5 } });
  const rainbow = crossings.find((x) => x.id === "rainbow");
  const eligibility = evaluateEligibility(rainbow, { traveler: "commercial" });
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.state, "CROSSING_INELIGIBLE");
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "commercial", preferred: "rainbow" }, NOW);
  assert.notEqual(decision.recommended_id, "rainbow");
  assert.equal(decision.results.find((x) => x.id === "rainbow").state, "CROSSING_INELIGIBLE");
});

test("Whirlpool rejects ordinary passengers and Global Entry Canada-bound", () => {
  const whirlpool = baseSources().find((x) => x.id === "whirlpool");
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_us", traveler: "passenger" }).eligible, false);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_canada", traveler: "global_entry" }).eligible, false);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_us", traveler: "global_entry" }).eligible, true);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_canada", traveler: "nexus" }).eligible, true);
});

test("Whirlpool operator wait is context only and never justifies a detour", () => {
  const crossings = baseSources({ operator: { nexusCaWhirlpool: 0 } });
  const observation = selectedObservation(crossings.find((x) => x.id === "whirlpool"), { direction: "to_canada", traveler: "nexus" }, NOW);
  assert.equal(observation.context_only, true);
  assert.equal(observation.state, "OPERATOR_CONTEXT_ONLY");
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "nexus", preferred: "whirlpool" }, NOW);
  assert.equal(decision.state, "INSUFFICIENT_DATA");
  assert.equal(decision.recommended_id, null);
});

test("bus and trailer eligibility never inherits passenger-car wait data", () => {
  const crossings = baseSources();
  for (const traveler of ["bus", "tow"]) {
    const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler, preferred: "rainbow" }, NOW);
    assert.equal(decision.state, "INSUFFICIENT_DATA");
    assert.equal(decision.recommended_id, null);
    assert.match(decision.results.find((x) => x.id === "rainbow").note, /passenger-car proxy/i);
  }
});

test("shorter posted wait does not trigger a detour when diversion guardrail consumes the saving", () => {
  const crossings = baseSources({ cbsa: { peace: 20, rainbow: 0, lewiston: 0 }, operator: { caPeace: 20 } });
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "passenger", preferred: "peace" }, NOW);
  assert.equal(decision.recommended_id, "peace");
  assert.match(decision.reason, /detour buffer|required|normal crossing/i);
});

test("alternate is selected only when the net benefit clears diversion buffer and threshold", () => {
  const crossings = baseSources({ cbsa: { peace: 70, rainbow: 5, lewiston: 5 }, operator: { caPeace: 70 } });
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "passenger", preferred: "peace" }, NOW);
  assert.equal(decision.state, "ALTERNATE_CROSSING_BETTER");
  assert.equal(decision.recommended_id, "rainbow");
  assert.ok(decision.net_benefit_minutes >= 10);
});

test("closed preferred crossing is eliminated even with a nominal zero-minute wait", () => {
  const crossings = baseSources({ peaceStatus: "Closed", usPeace: 0, usRainbow: 10 });
  const decision = compareNiagaraCrossings(crossings, { direction: "to_us", traveler: "passenger", preferred: "peace" }, NOW);
  assert.equal(decision.results.find((x) => x.id === "peace").state, "CROSSING_CLOSED");
  assert.notEqual(decision.recommended_id, "peace");
});

test("operator closure hard-vetoes a favorable federal wait", () => {
  const crossings = baseSources({ operator: { caRainbow: "closed" }, cbsa: { rainbow: 0, peace: 25, lewiston: 15 } });
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "passenger", preferred: "rainbow" }, NOW);
  assert.equal(decision.results.find((x) => x.id === "rainbow").state, "CROSSING_CLOSED");
  assert.notEqual(decision.recommended_id, "rainbow");
});

test("stale dynamic data never erases authoritative static restrictions", () => {
  const crossings = baseSources({ cbpTime: "At 1:00 pm EDT" });
  const rainbow = crossings.find((x) => x.id === "rainbow");
  assert.equal(freshnessFor(rainbow.waits.to_us.passenger.standard, "cbp", NOW).state, "expired");
  assert.equal(rainbow.eligibility.commercial, false);
  assert.ok(rainbow.restrictions.some((r) => /commercial/i.test(r)));
  const decision = compareNiagaraCrossings(crossings, { direction: "to_us", traveler: "commercial", preferred: "rainbow" }, NOW);
  assert.equal(decision.results.find((x) => x.id === "rainbow").state, "CROSSING_INELIGIBLE");
});

test("eligible preferred crossing with unavailable live wait does not cause speculative detour", () => {
  const crossings = baseSources();
  const peace = crossings.find((x) => x.id === "peace");
  peace.waits.to_canada.passenger.standard = { ...peace.waits.to_canada.passenger.standard, available: false, wait_minutes: null, updated_at: null, status: "unavailable", display: "Not reported" };
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "passenger", preferred: "peace" }, NOW);
  assert.equal(decision.state, "INSUFFICIENT_DATA");
  assert.equal(decision.recommended_id, null);
  assert.match(decision.reason, /not enough evidence|does not have fresh/i);
});

test("material federal/operator disagreement is exposed as SOURCE_CONFLICT", () => {
  const crossings = baseSources({ usPeace: 0, operator: { usPeace: 45 } });
  const decision = compareNiagaraCrossings(crossings, { direction: "to_us", traveler: "passenger", preferred: "peace" }, NOW);
  const peace = decision.results.find((x) => x.id === "peace");
  assert.equal(peace.state, "SOURCE_CONFLICT");
  assert.equal(peace.usable_for_recommendation, false);
  assert.equal(decision.recommended_id, null);
});

test("Canada-bound and U.S.-bound observations never cross wires", () => {
  const crossings = baseSources({ usPeace: 55, cbsa: { peace: 2, rainbow: 35, lewiston: 40 }, operator: { usPeace: 55, caPeace: 2 } });
  const toCanada = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "passenger", preferred: "peace" }, NOW);
  const toUs = compareNiagaraCrossings(crossings, { direction: "to_us", traveler: "passenger", preferred: "peace" }, NOW);
  assert.equal(toCanada.results.find((x) => x.id === "peace").wait_minutes, 2);
  assert.equal(toUs.results.find((x) => x.id === "peace").wait_minutes, 55);
});

test("all dynamic sources can fail without deleting static crossing facts", () => {
  const crossings = mergeNiagaraSources([], "", {});
  const decision = compareNiagaraCrossings(crossings, { direction: "to_canada", traveler: "passenger", preferred: "rainbow" }, NOW);
  assert.equal(decision.state, "INSUFFICIENT_DATA");
  assert.equal(decision.recommended_id, null);
  const whirlpool = crossings.find((x) => x.id === "whirlpool");
  assert.equal(whirlpool.nexus_required, true);
  assert.equal(whirlpool.eligibility.commercial, false);
});

test("API fails soft per source and keeps road/weather context separate from processing waits", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("bwt.cbp.gov")) return new Response(JSON.stringify([cbpPort("090101", 10, 5, 0), cbpPort("090102", 12, null, null), cbpPort("090103", null, null, null), cbpPort("090104", 4, 2, null)]), { status: 200, headers: { "content-type": "application/json" } });
    if (value.includes("bwt-eng.csv")) return new Response(cbsaCsv(), { status: 200 });
    if (value.includes("niagarafallsbridges.com")) return new Response(operatorHtml(), { status: 200 });
    if (value.includes("peacebridge.com")) return new Response(peaceOperatorHtml(), { status: 200 });
    if (value.includes("api.weather.gc.ca")) throw new Error("simulated Canadian weather outage");
    return new Response(JSON.stringify({ features: [] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = responseRecorder();
    await niagaraHandler({ method: "GET", query: { direction: "to_canada", traveler: "passenger", preferred: "rainbow" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.crossings.length, 4);
    assert.equal(response.body.sources.eccc_weather.available, false);
    assert.equal(response.body.sources.nws_weather.available, true);
    assert.equal(response.body.sources.road_conditions.integrated, false);
    assert.match(response.body.definitions.diversion_buffer, /not a live route estimate/i);
    assert.match(response.headers["cache-control"], /s-maxage=60/);
    assert.ok(response.body.decision);
  } finally {
    global.fetch = originalFetch;
  }
});

test("canonical traveler page is decision-first, mobile-first, real-image, and avoids brittle camera embeds", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "public", "niagara-border-crossing", "index.html"), "utf8");
  const client = fs.readFileSync(path.join(root, "public", "assets", "niagara-border-crossing.js"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/niagara-border-crossing\/">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Which Niagara bridge should you take right now\?/i);
  assert.match(html, /id="travelerSelect"/);
  assert.match(html, /id="preferredSelect"/);
  assert.match(html, /@media\(max-width:620px\)/);
  assert.match(html, /nittec\.org/i);
  assert.match(html, /511ny\.org/i);
  assert.match(html, /511on\.ca/i);
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.match(html, /Rainbow_Bridge%2C_July_2026\.jpg/);
  assert.match(html, /Wikimedia Commons/);
  assert.match(client, /\/api\/niagara-border-crossings/);
  assert.match(client, /requestId/);
  assert.match(client, /OPERATOR_CONTEXT_ONLY/);
});

test("primary decision controls render before map, camera links and methodology", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "public", "niagara-border-crossing", "index.html"), "utf8");
  const controls = html.indexOf('id="decisionHeading"');
  assert.ok(controls >= 0);
  assert.ok(html.indexOf('class="river-map"') > controls);
  assert.ok(html.indexOf("Traffic cameras and road conditions") > controls);
  assert.ok(html.indexOf('id="methodHeading"') > controls);
});
