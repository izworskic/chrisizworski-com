const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const html = readFileSync(join(__dirname, "..", "public", "northern-lights-michigan", "index.html"), "utf8");

test("Michigan aurora primary query and answer are meaningful before JavaScript", () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const lead = html.match(/<p class="sub">([^<]+)<\/p>/)?.[1];
  const h1 = html.match(/<h1 class="page-title">([^<]+)<\/h1>/)?.[1];
  assert.equal(title, "Northern Lights Michigan Tonight: Can You See Them?");
  assert.equal(h1, "Northern Lights Michigan Tonight");
  assert.ok(description && description.length <= 158, "Snippet length must satisfy current governance");
  assert.match(description, /^Can you see the northern lights in Michigan tonight\?/i);
  assert.match(description, /NOAA.*NWS.*best viewing hours/);
  assert.match(lead || "", /^Can you see the northern lights in Michigan tonight\?/i);
  assert.match(lead || "", /Choose your region/);
  assert.match(lead || "", /forecast cannot guarantee visibility/i);
  assert.ok(html.indexOf('<p class="sub">') < html.indexOf('id="aurora-decision"'), "Lead must precede live region verdict");
  assert.match(html, /id="aurora-static-answer"/);
  assert.match(html, /id="regionSelect"/);
});

test("Aurora intent update preserves canonical, Person entity and data-first controls", () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/northern-lights-michigan\/">/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /<div class="priority-decision-group" data-no-ads>/);
  assert.match(html, /fetch\('\/api\/aurora'/);
  assert.match(html, /id="selectedCloud"/);
  assert.match(html, /id="selectedMoon"/);
  assert.match(html, /"dateModified": "2026-10-26"/);
});
