const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) found.push(full);
  }
  return found;
}

test("Michigan summer darkness copy matches the page's astronomical threshold", () => {
  const aurora = read("public/northern-lights-michigan/index.html");

  assert.ok(aurora.includes("the fully dark window is much shorter than it is in fall and winter"));
  assert.ok(aurora.includes("the sun is 18 degrees below the horizon"));
  assert.ok(aurora.includes("could not be calculated for the next 24 hours"));
  assert.ok(!aurora.includes("astronomical darkness never fully arrives"));
  assert.ok(!aurora.includes("Michigan does not get truly dark in June or July"));
  assert.ok(!aurora.includes("does not reach full astronomical darkness at this time of year"));
});

test("Soo Locks copy distinguishes gravity-fed level change from complete vessel passage", () => {
  const soo = read("public/soo-locks/index.html");

  assert.ok(soo.includes("A lockage raises or lowers the chamber by gravity alone, with no pumps"));
  assert.ok(soo.includes("The complete vessel passage takes longer"));
  assert.ok(soo.includes("timing varies with vessel size, traffic, weather, and ice"));
  assert.ok(!soo.includes("roughly fifteen minutes"));
});

test("Michigan Ice separates ten-year accumulated cold from lake-wide ice climatology", () => {
  const api = read("api/ice.js");
  const generator = read("scripts/ice/gen_site.py");
  const index = read("public/michigan-ice/index.html");

  assert.match(api, /slug: 'saginaw-bay', acis: 'KMBS', lake: 'huron'/);
  assert.match(api, /slug: 'grand-traverse-bay', acis: 'KTVC', lake: 'michigan'/);
  assert.ok(index.includes("ten year station normal"));
  assert.ok(index.includes("Saginaw Bay displays the Lake Huron average"));
  assert.ok(index.includes("directional parent-lake signal rather than an observation of that bay"));
  assert.ok(index.includes("54 year ice-cover climatology"));
  assert.ok(!generator.includes("there is an actual observation of how much of the surface is frozen"));
  assert.ok(!generator.includes("accumulated cold figure and the 54 year comparison"));
});

test("FVF distribution grows from established pages without touching active snippets", () => {
  const sources = [
    ["public/index.html", "home-fvf-authority"],
    ["public/about/index.html", "about-fvf-authority"],
    ["public/guides/index.html", "guides-fvf-authority"],
  ];
  for (const [file, action] of sources) {
    const html = read(file);
    assert.ok(html.includes('href="/chris-izworski-freighter-view-farms/"'));
    assert.ok(html.includes(`data-growth-cta="${action}"`));
    assert.ok(html.includes('/assets/growth-cta.js'));
  }

  const inbound = htmlFiles(path.join(root, "public")).filter((file) =>
    readFileSync(file, "utf8").includes('href="/chris-izworski-freighter-view-farms/"'),
  );
  assert.ok(inbound.length >= 9, `expected at least 9 inbound FVF pages, found ${inbound.length}`);

  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const tomato = ledger.experiments.find((item) => item.id === "2026-08-03-tomato-snippet");
  const frost = ledger.experiments.find((item) => item.id === "2026-08-03-frost-snippet");
  const fvf = ledger.experiments.find((item) => item.id === "2026-08-03-fvf-gardening-authority");
  assert.equal(tomato.status, "running");
  assert.equal(frost.status, "running");
  assert.equal(fvf.status, "pending-clean-window");
  assert.equal(fvf.releaseDate, null);
  assert.equal(fvf.evaluationWindow, null);
  assert.equal(fvf.invalidatedWindow.invalidatedOn, "2026-08-11");
  assert.match(fvf.invalidatedWindow.reason, /confounding/);
  assert.equal(fvf.distributionExpansion.status, "released");
  assert.equal(fvf.distributionExpansion.releaseDate, "2026-08-11");
  assert.deepEqual(fvf.distributionExpansion.sourcePaths, ["/", "/about/", "/guides/"]);
  assert.match(ledger.measurementProtocol.parallelExecutionPolicy, /page-specific, not site-wide/);
  assert.match(ledger.measurementProtocol.parallelExecutionPolicy, /Stop or roll back an affected experiment/);
});
