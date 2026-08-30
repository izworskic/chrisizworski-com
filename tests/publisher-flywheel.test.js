const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "public", "for-publishers", "index.html"), "utf8");
const widget = fs.readFileSync(path.join(root, "public", "publisher-widget.js"), "utf8");
const doc = fs.readFileSync(path.join(root, "docs", "PUBLISHER_FLYWHEEL.md"), "utf8");

test("publisher kit stays out of the search index", () => {
  assert.match(page, /<meta name="robots" content="noindex,follow,noarchive">/);
  assert.match(page, /rel="canonical" href="https:\/\/chrisizworski\.com\/for-publishers\/"/);
});

test("publisher widget preserves clean fallback attribution", () => {
  assert.match(page, /href="https:\/\/chrisizworski\.com\/northern-lights-michigan\/"/);
  assert.match(page, /href="https:\/\/chrisizworski\.com\/chris-izworski\/"/);
  assert.match(page, /src="https:\/\/chrisizworski\.com\/publisher-widget\.js"/);
});

test("publisher widget avoids invasive host-page collection", () => {
  assert.doesNotMatch(widget, /navigator\.geolocation/i);
  assert.doesNotMatch(widget, /document\.cookie/i);
  assert.doesNotMatch(widget, /localStorage/i);
  assert.doesNotMatch(widget, /sessionStorage/i);
  assert.doesNotMatch(widget, /sendBeacon/i);
  assert.match(widget, /credentials:\s*"omit"/);
});

test("publisher widget supports the initial flagship distribution set", () => {
  for (const key of [
    "aurora",
    "mackinac-bridge",
    "buoys",
    "fall-color",
    "soo-locks",
    "ship-tracker",
    "beaches",
    "boat-launches",
    "manistee",
    "au-sable",
  ]) {
    assert.match(widget, new RegExp('"' + key.replace(/[.*+?^$()|[\]\\]/g, "\\$&") + '"|\\b' + key.replace(/[.*+?^$()|[\]\\]/g, "\\$&") + "\\b"));
  }
});

test("live publisher modules use existing public CORS endpoints", () => {
  assert.match(widget, /\/api\/aurora/);
  assert.match(widget, /\/api\/mackinac/);
  assert.match(widget, /\/api\/buoys/);
  assert.match(widget, /mode:\s*"cors"/);
});

test("fall color exposes the existing RSS distribution channel", () => {
  assert.match(page, /https:\/\/chrisizworski\.com\/fall-color\/rss\.xml/);
  assert.match(doc, /fall-color\/rss\.xml/);
});

test("flywheel governance records current outreach exclusions", () => {
  assert.match(doc, /Bay City-area organizations/);
  assert.match(doc, /Saginaw-area organizations/);
  assert.match(doc, /Go Great Lakes Bay/);
  assert.match(doc, /Pure Michigan/);
  assert.match(doc, /paid-link networks/);
  assert.match(doc, /Pitch utility first/);
});
