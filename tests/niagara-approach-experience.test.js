const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildApproachContext,
  inNiagaraCorridor,
  normalizeNyCamera,
  normalizeNyEvent,
  normalizeOntarioCamera,
  normalizeOntarioEvent,
} = require("../lib/niagara-approach-context");
const experienceData = require("../data/niagara-crossing-experience.json");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Niagara approach corridor rejects unrelated statewide data", () => {
  assert.equal(inNiagaraCorridor(43.09, -79.05), true);
  assert.equal(inNiagaraCorridor(42.90, -78.88), true);
  assert.equal(inNiagaraCorridor(40.71, -74.00), false);
  assert.equal(inNiagaraCorridor(45.42, -75.69), false);
});

test("511 New York events normalize as context without inventing route time", () => {
  const event = normalizeNyEvent({
    ID: "ny-1",
    Latitude: 43.08,
    Longitude: -79.02,
    RoadwayName: "I-190",
    DirectionOfTravel: "Northbound",
    Description: "Roadwork near Niagara Falls",
    LanesAffected: "1 lane",
    LanesStatus: "closed",
    EventType: "roadwork",
    LastUpdated: "03/10/2026 09:15:00",
  });
  assert.equal(event.provider, "511 New York");
  assert.equal(event.roadway, "I-190");
  assert.equal(Object.hasOwn(event, "travel_time_minutes"), false);
  assert.equal(Object.hasOwn(event, "delay_minutes"), false);
});

test("Ontario 511 full closures stay explicit", () => {
  const event = normalizeOntarioEvent({
    ID: 42,
    Latitude: 43.15,
    Longitude: -79.05,
    RoadwayName: "Highway 405",
    DirectionOfTravel: "Eastbound",
    Description: "Closure near Queenston",
    EventType: "closures",
    IsFullClosure: true,
    LastUpdated: 1791018000,
  });
  assert.equal(event.provider, "Ontario 511");
  assert.equal(event.full_closure, true);
});

test("official cameras are filtered to the Niagara corridor", () => {
  assert.ok(normalizeNyCamera({ ID: "cam-1", Latitude: 43.1, Longitude: -79.04, Name: "Niagara camera", Disabled: false, Blocked: false }));
  assert.equal(normalizeNyCamera({ ID: "cam-2", Latitude: 40.7, Longitude: -74, Name: "NYC camera", Disabled: false, Blocked: false }), null);
  assert.ok(normalizeOntarioCamera({ Id: 3, Latitude: 43.16, Longitude: -79.06, Location: "Queenston", Views: [{ Url: "https://example.invalid/camera", Status: "Enabled" }] }));
});

test("approach data is structurally context-only", () => {
  const context = buildApproachContext(
    { nyEvents: [], nyCameras: [], ontarioEvents: [], ontarioCameras: [] },
    { ny: { configured: true, available: true }, ontario: { configured: false, available: false } },
  );
  assert.equal(context.decision_role, "context_only");
  assert.equal(context.available, true);
  assert.equal(context.complete, false);
  assert.match(context.note, /do not alter the bridge recommendation/i);
});

test("all four crossings have a human experience layer and official proof links", () => {
  const ids = ["peace", "rainbow", "whirlpool", "lewiston-queenston"];
  for (const id of ids) {
    const experience = experienceData.crossings[id];
    assert.ok(experience, `${id} experience is required`);
    assert.ok(experience.role);
    assert.ok(experience.human_summary);
    assert.ok(experience.on_the_ground);
    assert.ok(experience.watch_for);
    assert.ok(Array.isArray(experience.official_links) && experience.official_links.length >= 2);
    for (const link of experience.official_links) assert.match(link.url, /^https:\/\//);
  }
});

test("exact NFBC camera links remain pinned", () => {
  const rainbow = experienceData.crossings.rainbow.official_links.map((link) => link.url);
  const lewiston = experienceData.crossings["lewiston-queenston"].official_links.map((link) => link.url);
  assert.ok(rainbow.includes("https://www.nittec.org/cameras/index.html?cid=1011"));
  assert.ok(lewiston.includes("https://www.nittec.org/cameras/index.html?cid=1021"));
  assert.ok(lewiston.includes("https://www.nittec.org/cameras/index.html?cid=1022"));
});

test("traveler page follows answer then proof experience understanding exploration", () => {
  const html = read("public/niagara-border-crossing/index.html");
  const answer = html.indexOf("<p class=\"eyebrow\">Answer</p>");
  const interpretation = html.indexOf("Proof → Experience → Understanding");
  const map = html.indexOf("Four bridges, four different jobs");
  const exploration = html.indexOf("Open the official systems");
  assert.ok(answer >= 0);
  assert.ok(interpretation > answer);
  assert.ok(map > interpretation);
  assert.ok(exploration > map);
});

test("human interpretation is downstream of the deterministic decision", () => {
  const js = read("public/assets/niagara-border-crossing.js");
  assert.match(js, /renderDecision\(payload\);\s*renderInterpretation\(payload\);/);
  assert.match(js, /const focusId = decision\.recommended_id \|\| state\.preferred/);
  assert.doesNotMatch(js, /experience.*recommended_id\s*=/i);
});

test("approach adapter is isolated from the decision endpoint", () => {
  const decisionApi = read("api/niagara-border-crossings.js");
  const approachApi = read("api/niagara-approach-context.js");
  assert.doesNotMatch(decisionApi, /require\(["']\.\.\/lib\/niagara-approach-context["']\)/);
  assert.match(approachApi, /NY511_API_KEY/);
  assert.match(approachApi, /ONTARIO511_API_KEY/);
  assert.match(approachApi, /s-maxage=180/);
});

test("NITTEC is not scraped by the production approach adapter", () => {
  const approachApi = read("api/niagara-approach-context.js");
  assert.doesNotMatch(approachApi, /fetchJson\([^\n]*nittec/i);
  const helper = read("lib/niagara-approach-context.js");
  assert.match(helper, /not republished by this product/i);
});

test("UI refuses to convert approach context into an exact route claim", () => {
  const html = read("public/niagara-border-crossing/index.html");
  const js = read("public/assets/niagara-border-crossing.js");
  assert.match(html, /never converted into an exact arrival-time claim/i);
  assert.match(js, /last-mile context, not inputs to the bridge recommendation/i);
  assert.match(js, /No invented approach estimate/);
});
