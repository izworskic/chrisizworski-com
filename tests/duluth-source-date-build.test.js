"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const sourceFiles = [
  "public/duluth-canal-park/index.html",
  "public/assets/duluth-canal.js",
  "public/great-lakes-freighter-tracking/index.html",
  "public/sitemap.xml"
];

test("Duluth SEO and social build steps preserve a newly reviewed page date and its sitemap", () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "duluth-source-date-"));
  try {
    for (const rel of sourceFiles) {
      const dest = path.join(work, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(root, rel), dest);
    }
    const htmlPath = path.join(work, sourceFiles[0]);
    const original = fs.readFileSync(htmlPath, "utf8");
    const stamp = /"dateModified"\s*:\s*"\d{4}-\d{2}-\d{2}"/;
    assert.match(original, stamp);
    // A future revision date is a local test fixture, never published. A hardcoded SEO
    // or social-card date (such as Oct 2) would fail this exact regression.
    fs.writeFileSync(htmlPath, original.replace(stamp, '"dateModified": "2026-11-19"'));

    for (const script of ["tune-duluth-discovery.mjs", "tune-duluth-social.mjs"]) {
      const run = spawnSync(process.execPath, [path.join(root, "scripts", script)], {
        cwd: work, encoding: "utf8", timeout: 30000
      });
      assert.equal(run.status, 0, script + " failed:\n" + run.stdout + "\n" + run.stderr);
    }

    const after = fs.readFileSync(htmlPath, "utf8");
    const embedded = after.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(embedded, "Duluth retains JSON-LD");
    const graph = JSON.parse(embedded[1])["@graph"];
    const page = graph.find((x) => x["@type"] === "WebPage" && x["@id"] === "https://chrisizworski.com/duluth-canal-park/");
    assert.equal(page?.dateModified, "2026-11-19");
    assert.match(after, /<title>Duluth Ship Schedule Today & Live Cams \| Chris Izworski<\/title>/);
    assert.match(after, /id="published-arrivals"/);
    assert.match(after, /src="\/assets\/tool-engagement\.js"/);

    const sitemap = fs.readFileSync(path.join(work, "public/sitemap.xml"), "utf8");
    const index = sitemap.indexOf("<loc>https://chrisizworski.com/duluth-canal-park/</loc>");
    assert.ok(index >= 0);
    assert.match(sitemap.slice(index, index + 150), /<lastmod>2026-11-19<\/lastmod>/);
    assert.equal((sitemap.match(/<loc>https:\/\/chrisizworski\.com\/duluth-canal-park\/<\/loc>/g) || []).length, 1);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});
