const test = require("node:test");
const assert = require("node:assert");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const { createHash } = require("node:crypto");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "scripts", "ice", "generated.json");
const outDir = path.join(root, "public", "michigan-ice");

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function htmlFiles(dir, prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full, path.join(prefix, entry)));
    else if (entry.endsWith(".html")) found.push(path.join(prefix, entry));
  }
  return found;
}

// The pages under public/michigan-ice/ come out of scripts/ice/gen_site.py. Editing
// one of them by hand looks like it worked and is then silently destroyed the next
// time anyone runs `npm run generate:ice`. This turns that invisible loss into a
// red build: if the committed HTML no longer matches what the generator produced,
// somebody edited the wrong layer.
test("generated ice pages match the generator output", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const recorded = manifest.files;

  const onDisk = htmlFiles(outDir).sort();
  const listed = Object.keys(recorded).sort();

  assert.deepEqual(
    onDisk,
    listed,
    "public/michigan-ice/ and the checksum manifest disagree about which pages exist. " +
      "Run: npm run generate:ice",
  );

  const actualHashes = Object.fromEntries(
    listed.map(rel => [rel, sha256(path.join(outDir, rel))]),
  );
  assert.deepEqual(
    actualHashes,
    recorded,
    "public/michigan-ice/ does not match the generator checksum manifest. " +
      "Edit scripts/ice/gen_site.py or gen_chrome.py, regenerate, and refresh generated.json.",
  );
});

test("the ice generator stays pinned to its base path", () => {
  const chrome = readFileSync(path.join(root, "scripts", "ice", "gen_chrome.py"), "utf8");
  const site = readFileSync(path.join(root, "scripts", "ice", "gen_site.py"), "utf8");

  assert.ok(chrome.includes('BASE = "/michigan-ice"'), "BASE must stay /michigan-ice");
  assert.ok(
    site.includes('assert BASE == "/michigan-ice"'),
    "the generator must keep asserting BASE agrees with its hardcoded hrefs",
  );
  // Content links stay under /michigan-ice/. Shared /assets/ links and the
  // deliberate cross-season /fall-color/ and pre-trip /up-north-michigan/ handoffs are
  // valid because this
  // section is deployed inside the chrisizworski.com hub.
  for (const [name, src] of [["gen_chrome.py", chrome], ["gen_site.py", site]]) {
    const stray = src.match(/href=\\?"\/(?!michigan-ice\/|api\/|assets\/|fall-color\/|up-north-michigan\/)[a-z]/g) || [];
    assert.equal(stray.length, 0, `${name} has a root-relative href that escapes /michigan-ice/`);
  }
});

test("every generated ice page stays inside the hub SERP limits", () => {
  for (const rel of htmlFiles(outDir)) {
    const html = readFileSync(path.join(outDir, rel), "utf8");
    const title = (html.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
    const desc = (html.match(/<meta name="description" content="(.*?)"/s) || [])[1] || "";
    assert.ok(title.length > 0 && title.length <= 60, `${rel} title is ${title.length} chars`);
    assert.ok(desc.length > 0 && desc.length <= 158, `${rel} description is ${desc.length} chars`);
    assert.ok(
      html.includes("https://chrisizworski.com/#person"),
      `${rel} must resolve to the canonical Person @id`,
    );
    assert.ok(!html.includes("ice.chrisizworski.com"), `${rel} still references the retired subdomain`);
  }
});

test("the generated ice section includes search and measurement foundations", () => {
  const files = htmlFiles(outDir);
  for (const rel of files) {
    const html = readFileSync(path.join(outDir, rel), "utf8");
    assert.equal(
      (html.match(/\/_vercel\/insights\/script\.js/g) || []).length,
      1,
      `${rel} needs Web Analytics exactly once`,
    );
    assert.equal(
      (html.match(/\/_vercel\/speed-insights\/script\.js/g) || []).length,
      1,
      `${rel} needs Speed Insights exactly once`,
    );
  }

  const hub = readFileSync(path.join(outDir, "index.html"), "utf8");
  assert.equal((hub.match(/<h1\b/g) || []).length, 1, "ice hub needs exactly one H1");
  assert.match(hub, /<h1 class="page-title">Michigan ice conditions today<\/h1>/);
  assert.match(hub, /id="ice-current-answer"/);
  assert.match(hub, /ice-tracking season runs November through March/);
  assert.match(hub, /reports off season rather than implying that ice exists/);
});
