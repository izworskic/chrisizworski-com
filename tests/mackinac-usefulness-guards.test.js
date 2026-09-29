// Static guards for the usefulness pass (docs/mackinac-usefulness-loss.md). The browser
// benchmark measures the experience; these keep its fixes from silently regressing.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const {lookupOrigin, originResponse, ORIGINS} = require("../lib/mackinac-island/origins.js");

test("common starting cities resolve offline, with both ports", () => {
  assert.ok(ORIGINS.length >= 50);
  for (const q of ["Detroit", "Detroit, MI", "grand rapids michigan", "Saginaw, MI", "Bay City", "Marquette MI", "Chicago, IL", "Toronto", "St Ignace"]) {
    const row = lookupOrigin(q);
    assert.ok(row, `${q} should resolve without the public geocoder`);
    const r = originResponse(q, row);
    assert.equal(r.routes.length, 2);
    assert.ok(r.routes.every((x) => Number.isFinite(x.drive_minutes)));
  }
  assert.equal(originResponse("Marquette", lookupOrigin("Marquette")).preferred_port, "St. Ignace");
  assert.equal(originResponse("Detroit", lookupOrigin("Detroit")).preferred_port, "Mackinaw City");
  assert.equal(lookupOrigin("48706"), null, "ZIPs still go to the live geocoder");
});

test("origin API tries the built-in list before the rate-limited geocoder", () => {
  const src = read("api/mackinac-origin.js");
  assert.ok(src.indexOf("lookupOrigin(q)") > 0 && src.indexOf("lookupOrigin(q)") < src.indexOf("await geocode(q)"));
});

test("the hero asks starting city and leave time first, one tap each", () => {
  const html = read("public/mackinac-island/index.html");
  const hero = html.slice(html.indexOf('id="primaryRec"'), html.indexOf('class="decision-head"'));
  assert.match(hero, /id="heroStart"/, "start chips sit directly under the answer");
  assert.ok((hero.match(/data-city="/g) || []).length >= 5);
  assert.ok((hero.match(/data-leave="/g) || []).length >= 5);
  const js = read("public/assets/mackinac-island.js");
  assert.match(js, /async function applyStart/);
  assert.match(js, /if\(state\.originResolved&&state\.departTime\)\{\s*document\.body\.classList\.add\('mackinac-plan-ready'\)/);
});

test("every answer lands on screen: day-so-far preview and live bar", () => {
  const html = read("public/mackinac-island/index.html");
  const q = html.indexOf('id="intakeQuestion"'), prev = html.indexOf('id="intakePreview"'), opts = html.indexOf('id="intakeOptions"');
  assert.ok(q < prev && prev < opts, "preview sits between the question and its options");
  assert.match(html, /id="liveBar"/);
  const js = read("public/assets/mackinac-island.js");
  assert.match(js, /function renderIntakePreview/);
  assert.match(js, /querySelector\('\.hero-lede'\)/, "live bar tracks the answer, not the whole hero");
  assert.match(js, /if\(r&&r\.bottom>0&&r\.top<innerHeight\)return;/, "no toast over an answer already on screen");
});

test("base questions are one tap; no Continue step", () => {
  const js = read("public/assets/mackinac-island.js");
  assert.match(js, /if\(actions\)actions\.hidden=true;/);
  assert.match(js, /state\.intakeAnswers\[q\.id\]=oneTap\?\[value\]:value;/);
  assert.doesNotMatch(js, /Choose up to two/);
});

test("a late start gets an honest short visit, in plain language", () => {
  const src = read("lib/mackinac-island/route.js");
  assert.match(src, /shortVisit:true/);
  assert.match(src, /A short visit: about/);
  assert.doesNotMatch(src, /un-dated|Your entered/);
});
