// Guards for the Mackinac sub-page frame (Sep 27 2026). Chris reported that clicking from
// My Trip into Ferries/Stay/Eat made "the first page flash": every sub-page opened on the
// same harbor photo as My Trip, the header changed height, and mackinac-hub.js injected a
// card (or two, plus a nav re-order) ABOVE the hero after paint. Measured CLS on the live
// sub-pages was 0.27-0.48 with a saved trip. These tests keep those causes out.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SUBPAGES = fs.readdirSync(path.join(root, "public/mackinac-island"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, "public/mackinac-island", d.name, "index.html")))
  .map((d) => d.name);

test("every sub-page ships the saved-trip strip in its HTML and flags the trip before paint", () => {
  assert.ok(SUBPAGES.length >= 17);
  for (const slug of SUBPAGES) {
    const html = read(`public/mackinac-island/${slug}/index.html`);
    const head = html.slice(0, html.indexOf("</head>"));
    assert.match(head, /classList\.add\("has-trip"\)/, `${slug} does not flag a saved trip in <head>`);
    assert.ok(html.includes("data-trip-strip") && html.includes("data-trip-context"), `${slug} lacks the static trip strip`);
    assert.ok(html.includes("data-mackinac-platform-focus"), `${slug} lacks the reserved focus slot`);
    assert.ok(html.indexOf("data-mackinac-platform-focus") > html.indexOf("decision-strip"), `${slug} focus slot sits above the decisions`);
  }
});

test("sub-pages use the same header as My Trip and a hero distinct from it", () => {
  const front = read("public/mackinac-island/index.html");
  assert.ok(front.includes('<header class="sitebar">'));
  for (const slug of SUBPAGES) {
    const html = read(`public/mackinac-island/${slug}/index.html`);
    assert.ok(html.includes('<header class="sitebar">'), `${slug} header differs from My Trip`);
    assert.match(html, /class="page-hero tone-[a-z]+"/, `${slug} reuses the My Trip hero`);
    assert.ok(html.includes("fonts.googleapis.com/css2?family=Fraunces"), `${slug} missing shared type`);
  }
});

test("the hub client never injects above the hero or reorders the primary nav", () => {
  const js = read("public/assets/mackinac-hub.js");
  assert.doesNotMatch(js, /insertAdjacentElement\("beforebegin"/);
  assert.doesNotMatch(js, /main\.prepend/);
  assert.doesNotMatch(js, /nav\.appendChild/);
  assert.match(js, /mackinac-surface-cache-v1/);
});

test("My Trip and sub-pages pin the header and nav across navigations", () => {
  for (const file of ["public/assets/mackinac-island.css", "public/assets/mackinac-intent.css"]) {
    const css = read(file);
    assert.match(css, /@view-transition\{navigation:auto\}/, `${file} lacks cross-page transitions`);
    assert.match(css, /view-transition-name:mack-sitebar/);
    assert.match(css, /view-transition-name:mack-nav/);
  }
});
