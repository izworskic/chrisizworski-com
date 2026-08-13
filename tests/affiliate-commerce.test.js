const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const trackingId = "websitetools06-20";
const requiredDisclosure = "As an Amazon Associate I earn from qualifying purchases.";

const placements = [
  {
    path: "/northern-lights-michigan/",
    file: "public/northern-lights-michigan/index.html",
    module: "aurora-field-gear",
    context: "aurora",
    expectedItems: ["camera-tripod", "red-light-headlamp", "hand-warmers", "power-bank"],
    title: "<title>Northern Lights Michigan Tonight: Aurora | Chris Izworski</title>",
    h1: '<h1 class="page-title">Northern Lights Michigan Tonight</h1>',
    canonical: '<link rel="canonical" href="https://chrisizworski.com/northern-lights-michigan/">'
  },
  {
    path: "/soo-locks/",
    file: "public/soo-locks/index.html",
    module: "soo-locks-visitor-gear",
    context: "soo-locks",
    expectedItems: ["waterproof-binoculars", "phone-tripod", "rain-shell", "power-bank"],
    title: "<title>Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski</title>",
    h1: '<h1 class="page-title">Soo Locks Schedule Today</h1>',
    canonical: '<link rel="canonical" href="https://chrisizworski.com/soo-locks/">'
  }
];

function moduleMarkup(html, moduleId) {
  const start = html.indexOf(`data-affiliate-module="${moduleId}"`);
  assert.notEqual(start, -1, `missing affiliate module ${moduleId}`);
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  assert.notEqual(sectionStart, -1, `missing section start for ${moduleId}`);
  assert.notEqual(sectionEnd, -1, `missing section end for ${moduleId}`);
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

function anchorTags(markup) {
  return [...markup.matchAll(/<a\s+[^>]*data-affiliate-item="[^"]+"[^>]*>/g)].map((match) => match[0]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] || "";
}

test("affiliate ledger records the scoped top-page pilot and measurement boundary", async () => {
  const config = JSON.parse(await readFile(path.join(root, "benchmarks/affiliate-commerce.json"), "utf8"));
  assert.equal(config.trackingId, trackingId);
  assert.equal(config.compliance.disclosure, requiredDisclosure);
  assert.deepEqual(config.placements.map((placement) => placement.path), placements.map((placement) => placement.path));
  assert.equal(config.placements[0].selectionEvidence.impressions, 18461);
  assert.equal(config.placements[1].selectionEvidence.impressions, 11919);
  assert.ok(config.measurement.siteCannotMeasure.includes("commission income"));
  assert.match(config.measurement.amazonSource, /Amazon Associates/);
});

for (const placement of placements) {
  test(`${placement.path} has one compliant, contextual affiliate module`, async () => {
    const html = await readFile(path.join(root, placement.file), "utf8");
    const module = moduleMarkup(html, placement.module);
    const links = anchorTags(module);

    assert.equal((html.match(new RegExp(`data-affiliate-module="${placement.module}"`, "g")) || []).length, 1);
    assert.ok(html.includes('<link rel="stylesheet" href="/assets/affiliate-commerce.css">'));
    assert.ok(html.includes('<script defer src="/assets/affiliate-commerce.js"></script>'));
    assert.ok(module.includes(`<strong>Paid links:</strong> ${requiredDisclosure}`));
    assert.equal((module.match(/data-affiliate-view-marker/g) || []).length, 1);
    assert.ok(module.indexOf(requiredDisclosure) < module.indexOf("data-affiliate-item="));
    assert.equal(attribute(module.match(/<section[^>]*>/)[0], "data-affiliate-context"), placement.context);
    assert.equal(links.length, placement.expectedItems.length);

    const actualItems = links.map((link) => attribute(link, "data-affiliate-item"));
    assert.deepEqual(actualItems, placement.expectedItems);

    for (const link of links) {
      const href = new URL(attribute(link, "href").replaceAll("&amp;", "&"));
      const rel = new Set(attribute(link, "rel").split(/\s+/));
      assert.equal(href.protocol, "https:");
      assert.equal(href.hostname, "www.amazon.com");
      assert.equal(href.searchParams.get("tag"), trackingId);
      assert.ok(href.searchParams.get("k"));
      assert.equal(attribute(link, "target"), "_blank");
      assert.equal(attribute(link, "data-affiliate-context"), placement.context);
      assert.ok(rel.has("sponsored"));
      assert.ok(rel.has("nofollow"));
      assert.ok(rel.has("noopener"));
      assert.match(attribute(link, "aria-label"), /paid link/i);
      assert.match(attribute(link, "aria-label"), /opens in a new tab/i);
    }

    assert.equal(module.includes("<img"), false);
    assert.doesNotMatch(module, /\$\d|\bstars?\b|\bratings?\b|\breviews?\b/i);
  });

  test(`${placement.path} preserves its search-critical title, H1, and canonical`, async () => {
    const html = await readFile(path.join(root, placement.file), "utf8");
    assert.ok(html.includes(placement.title));
    assert.ok(html.includes(placement.h1));
    assert.ok(html.includes(placement.canonical));
  });
}

test("affiliate analytics records only placement metadata and no destination URL", async () => {
  const js = await readFile(path.join(root, "public/assets/affiliate-commerce.js"), "utf8");
  assert.ok(js.includes('send("Affiliate Module View"'));
  assert.ok(js.includes('send("Affiliate Click"'));
  assert.ok(js.includes("IntersectionObserver"));
  assert.ok(js.includes('[data-affiliate-view-marker]'));
  assert.ok(js.includes("intersectionRatio < 0.5"));
  assert.ok(js.includes('retailer: "amazon"'));
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie|link\.href|location\.href/);
});
