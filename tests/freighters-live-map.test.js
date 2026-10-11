import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(path.join(root,p),"utf8");
const html = read("public/freighters/index.html");
const css = read("public/assets/freighters-hub.css");
const finder = read("public/assets/freighters-hub.js");
const tracker = read("public/assets/freighter-tracker.js");

test("Live five-lake AIS map is prominently ahead of finder and directory", () => {
  const loc = html.indexOf('id="live-map"');
  assert.ok(loc > 0);
  assert.ok(loc < html.indexOf('id="watch-finder"'));
  assert.ok(loc < html.indexOf('class="intro"'));
  assert.match(html, /href="#live-map">Explore the live ship map/);
  assert.match(html, /href="\/great-lakes-freighter-tracking\/".*?Open the full ship tracker/);
  assert.match(html, /#live-map">Live map/);
});

test("Map embeds existing specialized engine and does not introduce another AIS request", () => {
  const paths = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "/assets/freighter-tracker.js?v=20260917",
    "/assets/freighters-hub.js"
  ];
  for(const p of paths) assert.ok(html.includes(p), "missing "+p);
  assert.ok(paths.map(p=>html.indexOf(p)).every((p,i,a)=>i===0||p>a[i-1]), "Leaflet must initialize before the shared map");
  assert.ok(tracker.includes('fetch("/api/freighter-ais"'), "shared AIS endpoint changed");
  assert.doesNotMatch(finder, /fetch\(\s*["']\/api\/freighter-ais/);
  assert.match(html, /id="freighterMap"/);
  assert.match(html, /id="mapStatusText"/);
  assert.match(html, /id="mapRefresh"/);
});

test("Every shared map UI dependency exists exactly once in Freighter Central", () => {
  const ids = ["freighterMap","mapStatusDot","mapStatusText","mapRefresh",
    "corridorLabel","corridorTitle","corridorCopy","watchNote","passageLink",
    "stationTitle","stationSource","windValue","waveValue","waterValue","conditionTime",
    "freighterVessels","freighterCredits"];
  for(const id of ids) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id+" missing or duplicated");
  }
});

test("All map tabs correspond to live tracker views and preserve keyboard state", () => {
  for(const key of ["overview","soo","duluth","detroit","saginaw","port-huron","mackinac"]) {
    assert.ok(html.includes('data-freighter-view="' + key + '"'), "no tab for "+key);
    assert.ok(tracker.includes(key === "port-huron" ? '"port-huron":' : key + ":"), "no tracker view for "+key);
  }
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true" data-freighter-view="overview"/);
  assert.match(finder, /tab\.click\(\)/);
  assert.match(finder, /typeof window\.L === "undefined"/);
  assert.match(finder, /leaflet-container/);
});

test("Mobile responsive, request timestamps, data outage and readable fallback remain", () => {
  assert.match(css, /#freighterMap\{height:360px/);
  assert.match(css, /\.hub-map-tabs\{display:flex;overflow-x:auto/);
  assert.match(tracker, /1800000/);
  assert.match(tracker, /Vessel reports unavailable/);
  assert.match(tracker, /No recent reports returned/);
  assert.match(html, /<noscript>/);
  assert.match(html, /For shore watching only/);
  assert.match(html, /must not be used for navigation/);
  assert.match(html, /id="freighterCredits"/);
  assert.match(html, /href="\/great-lakes-freighter-tracking\/"/);
});

test("Search canonical, entity, Person byline and intent boundary stay stable", () => {
  assert.match(html, /<title>Great Lakes Freighter Central: Ports \| Chris Izworski<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/freighters\/"/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/"/);
  assert.doesNotMatch(html, /<meta[^>]+noindex/);
  assert.match(html, /class="hub-map-legal"/);
});
