"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const duluth = read("public/duluth-canal-park/index.html");
const welland = read("public/welland-canal/index.html");
const soo = read("public/soo-locks/index.html");
const wellandCss = read("public/assets/welland-canal.css");
const sitemap = read("public/sitemap.xml");

test("Duluth separates an evidence-based live watch from a published later-ship forecast", () => {
  assert.match(duluth, /<title>Duluth Ship Schedule & Live Canal Park Map \| Chris Izworski<\/title>/);
  assert.match(duluth, /rel="canonical" href="https:\/\/chrisizworski\.com\/duluth-canal-park\/"/);
  assert.ok(duluth.indexOf('id="watchPick"') < duluth.indexOf('id="published-arrivals"'));
  assert.ok(duluth.indexOf('id="published-arrivals"') < duluth.indexOf('id="live-map"'));
  assert.match(duluth, /No supported next passage does not mean no ships are scheduled today/);
  assert.match(duluth, /href="https:\/\/harborlookout\.com\/"[^>]*data-track-tool="duluth-harborlookout-forecast"/);
  assert.match(duluth, /href="#cameraMonitor"[^>]*data-track-tool="duluth-live-canal-camera"/);
  assert.match(duluth, /id="cameraMonitor"/);
  assert.match(duluth, /Ships may change speed, berth or use the Superior Entry/);
  assert.match(duluth, /src="\/assets\/duluth-canal\.js[^"]*"/);
});

test("Duluth's next visitor choices support a real winter berth and the independent Welland schedule", () => {
  assert.match(duluth, /href="\/great-lakes-freighter-winter-layup\/" data-track-tool="great-lakes-freighter-winter-layup" data-placement="duluth-shipping-season"/);
  assert.match(duluth, /href="\/welland-canal\/" data-track-tool="welland-canal" data-placement="duluth-shipping-season"/);
  assert.match(duluth, /A reported AIS position alone does not confirm a winter layup or a future canal transit/);
  assert.match(duluth, /@id"\s*:\s*"https:\/\/chrisizworski\.com\/#person"/);
});

test("Welland retains the official order-of-turn as first schedule authority and gives direct task paths", () => {
  assert.match(welland, /<title>Welland Canal Ship Tracker &amp; Schedule \| Chris Izworski<\/title>/);
  assert.match(welland, /rel="canonical" href="https:\/\/chrisizworski\.com\/welland-canal\/"/);
  assert.match(welland, /id="ship-watch"/);
  assert.match(welland, /id="ship-schedule"/);
  assert.match(welland, /https:\/\/www\.seaway-greatlakes\.com\/vessel-transit\/order-of-turn/);
  assert.match(welland, /href="\/great-lakes-freighter-tracking\/" data-track-tool="ship-tracker" data-placement="welland-shipping-sprint3"/);
  assert.match(welland, /href="\/great-lakes-freighter-winter-layup\/" data-track-tool="freighter-winter-layup" data-placement="welland-shipping-sprint3"/);
  assert.match(welland, /href="\/freighters\/" data-track-tool="freighters" data-placement="welland-shipping-sprint3"/);
  assert.match(welland, /A fresh AIS dot is not a confirmed lock appointment or winter berth/);
  assert.match(wellandCss, /\.shipping-continuation a:focus-visible/);
});

test("Soo's proven schedule answer stays first and connects a reader to Duluth only in related pages", () => {
  assert.match(soo, /<title>Soo Locks Schedule Today: Ships &amp; Map \| Chris Izworski<\/title>/);
  assert.match(soo, /rel="canonical" href="https:\/\/chrisizworski\.com\/soo-locks\/"/);
  assert.ok(soo.indexOf('id="soo-next-ship"') < soo.indexOf('id="soo-schedule-answer"'));
  assert.ok(soo.indexOf('id="soo-schedule-answer"') < soo.indexOf('data-placement="soo-locks-related"'));
  assert.match(soo, /href="\/duluth-canal-park\/" data-track-tool="duluth-canal-park" data-placement="soo-locks-related"/);
  assert.match(soo, /href="\/welland-canal\/" data-track-tool="welland-canal" data-placement="soo-locks-related"/);
  assert.match(soo, /https:\/\/ais\.boatnerd\.com\/passage\/port\/soo-locks/);
  assert.match(soo, /id="sooLiveMap"/);
});

test("shipping dates are truthful and sitemaps agree while identities and titles remain intact", () => {
  for (const [slug, html] of [
    ["duluth-canal-park", duluth],
    ["welland-canal", welland],
    ["soo-locks", soo]
  ]) {
    const date = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
    assert.ok(date && date >= "2026-11-09", "reviewed date on " + slug);
    const snippet = sitemap.slice(sitemap.indexOf("<loc>https://chrisizworski.com/" + slug + "/</loc>"));
    assert.match(snippet.slice(0, 160), new RegExp("<lastmod>" + date + "</lastmod>"), slug + " sitemap freshness");
    assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  }
});
