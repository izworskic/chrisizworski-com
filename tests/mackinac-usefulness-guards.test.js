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

test("the first choice is the starting city, on the first screen", () => {
  const html = read("public/mackinac-island/index.html");
  const sentence = html.slice(html.indexOf('id="tripForm"'), html.indexOf("</form>"));
  assert.match(sentence, /<label class="pick pick-from is-empty" data-pick="from">/);
  assert.match(sentence, /<option value="" selected>your city<\/option>/);
  assert.ok(html.indexOf('id="tripForm"') < html.indexOf('id="sheet"'));
});

test("every choice is one pick with a sensible default; no Continue or Build step", () => {
  const html = read("public/mackinac-island/index.html");
  assert.equal((html.match(/<select id="pick\w+"/g) || []).length, 6);
  assert.doesNotMatch(html, /Continue|Build my|intakeContinue|profileBuildTrip/);
  assert.match(html, /<option value="couple" selected>two adults<\/option>/);
  assert.match(html, /<option value="06:00" selected>6 AM<\/option>/);
});

test("a late start gets an honest short visit, in plain language", () => {
  const src = read("lib/mackinac-island/route.js");
  assert.match(src, /shortVisit:true/);
  assert.match(src, /A short visit: about/);
  assert.doesNotMatch(src, /un-dated|Your entered/);
});

test("the page stays simple: four sections, nothing folded away", () => {
  const html = read("public/mackinac-island/index.html");
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.equal((main.match(/<section /g) || []).length, 4);
  assert.doesNotMatch(main, /<details/);
  assert.ok(read("public/assets/mackinac-island.js").length < 20000, "the planner client grew past 20 KB");
});
