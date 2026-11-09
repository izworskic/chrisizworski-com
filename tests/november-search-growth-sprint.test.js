"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (name) => readFileSync(path.join(__dirname, "..", "public", name, "index.html"), "utf8");

test("freighter tracker sends visitors to an existing named-vessel search without replacing live AIS", () => {
  const html = read("great-lakes-freighter-tracking");
  assert.match(html, /<title>Great Lakes Ship Tracker Live Now \| Chris Izworski<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-freighter-tracking\/"/);
  assert.match(html, /href="#freighterNameSearch" data-growth-cta="freighter-hero-name-search"/);
  assert.match(html, /id="freighterNameSearch" type="search"/);
  assert.match(html, /data-freighter-view="soo"/);
  assert.match(html, /href="\/soo-locks\/" data-track-tool="soo-locks"/);
  assert.match(html, /AIS positions are informational, may be delayed or incomplete/);
  assert.match(html, /Built by Chris Izworski/);
});

test("bridge status and bridge toll paths retain distinct jobs and verifiable official sources", () => {
  const status = read("mackinac-bridge-live");
  const toll = read("mackinac-bridge-tolls");
  assert.match(status, /<title>Mackinac Bridge Conditions Today: Live Status &amp; Wind<\/title>/);
  assert.match(status, /Is the Mackinac Bridge open today\?/);
  assert.match(status, /will not infer an “open” answer if that official source is unavailable/);
  assert.match(status, /href="\/mackinac-bridge-tolls\/" data-growth-cta="mackinac-conditions-to-toll-calculator"/);
  assert.match(status, /Toll prices do not indicate whether the bridge is open/);
  assert.match(toll, /Mackinac Bridge Toll: \$4 Car \| Calculator \| Chris Izworski/);
  assert.match(toll, /a normal round trip is \$8 in 2026/);
  assert.match(toll, /2\.3% fee/);
  assert.match(toll, /href="\/mackinac-bridge-live\/"/);
  assert.match(toll, /https:\/\/www\.mackinacbridge\.org\/fares-traffic\/fare-schedule\//);
});

test("initial aurora state is an honest loading state, while stale or missing data remains unavailable", () => {
  const html = read("northern-lights-michigan");
  assert.match(html, /<title>Northern Lights Michigan Tonight: Verdict \| Chris Izworski<\/title>/);
  assert.match(html, /id="tonightsVerdictTitle" data-verdict-state>Checking tonight’s NOAA aurora forecast<\/h2>/);
  assert.match(html, /data-verdict-best>No reliable window available/);
  assert.match(html, /data-verdict-asof>As of: no current assessment/);
  assert.match(html, /href="\/national-tools\/dark-sky\/michigan\/"/);
  assert.match(html, /href="\/michigan-dark-sky-field-guide\/"/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  const source = readFileSync(path.join(__dirname, "..", "public", "assets", "verdict-card.js"), "utf8");
  assert.match(source, /'UNAVAILABLE': 'Forecast currently unavailable'/);
  assert.match(source, /stale \|\| missing/);
});
