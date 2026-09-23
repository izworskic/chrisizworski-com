const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const { LODGING, DINING, REGIONAL } = require("../lib/mackinac-island/catalog.js");

const root = path.join(__dirname, "..");
const page = (slug) => readFileSync(path.join(root, "public/mackinac-island", slug, "index.html"), "utf8");

// The generator has always emitted data-place-id on every catalog card, and
// mackinac-hub.js ranks those cards by the visitor's fit_score. But the committed pages
// had drifted stale and carried zero data-place-id attributes, so the ranking had nothing
// to act on and personalization silently degraded to an injected banner. Guard the wire.
const SURFACES = [
  ["where-to-stay", LODGING],
  ["dining", DINING],
  ["around-the-straits", REGIONAL],
];

for (const [slug, catalog] of SURFACES) {
  test(`/${slug}/ renders a rankable card for every catalog entry`, () => {
    const html = page(slug);
    assert.ok(html.includes("catalog-grid"), `${slug} lost its catalog grid container`);
    for (const item of catalog) {
      assert.ok(
        html.includes(`data-place-id="${item.id}"`),
        `${slug} is stale: no rankable card for catalog entry "${item.id}". Run npm run benchmark:mackinac-hub and commit the output.`
      );
    }
  });
}

test("Mackinac generated pages hold no em dashes", () => {
  // Scoped to generator output. The hand-authored /mackinac-island/index.html uses an em
  // dash as a loading placeholder inside elements the script overwrites on boot
  // (<strong id="recommendedReturn">-</strong>), which is a UI glyph rather than prose, so
  // it is deliberately out of scope here and left for an editorial call.
  const dir = path.join(root, "public/mackinac-island");
  const offenders = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    let html;
    try { html = readFileSync(path.join(dir, name.name, "index.html"), "utf8"); } catch { continue; }
    const count = (html.match(/\u2014/g) || []).length;
    if (count) offenders.push(`${name.name} (${count})`);
  }
  assert.deepEqual(offenders, [], `em dashes found in generated pages: ${offenders.join(", ")}`);
});
