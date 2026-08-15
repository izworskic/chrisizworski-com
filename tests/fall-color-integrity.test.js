const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const fallRoot = path.join(root, "public", "fall-color");
const canonicalPersonId = "https://chrisizworski.com/#person";

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function fallPages(directory = fallRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return fallPages(full);
    return entry.name === "index.html" ? [full] : [];
  });
}

function structuredData(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

function graphNodes(block) {
  return Array.isArray(block["@graph"]) ? block["@graph"] : [block];
}

test("every fall-color page defines the one canonical Chris Izworski entity", () => {
  const files = fallPages();
  assert.equal(files.length, 15);

  for (const file of files) {
    const html = readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    const people = structuredData(html)
      .flatMap(graphNodes)
      .filter((node) => node["@type"] === "Person");

    assert.ok(people.length >= 1, `${relative} needs a full Person definition`);
    assert.ok(people.every((person) => person["@id"] === canonicalPersonId), relative);
    assert.ok(!html.includes("https://chrisizworski.com/#chris"), relative);
    assert.ok(html.slice(html.indexOf("<body")).includes("Chris Izworski"), `${relative} needs a visible byline`);
    const modified = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    assert.ok(modified, `${relative} needs schema freshness`);
    assert.ok(Date.parse(modified[1]) <= Date.now(), `${relative} dateModified cannot be in the future`);
  }
});

test("planner and drives schema URLs match their trailing-slash canonicals", () => {
  const pages = [
    ["public/fall-color/michigan-leaf-peeping-planner/index.html", "WebApplication"],
    ["public/fall-color/michigan-fall-color-drives/index.html", "ItemList"],
  ];

  for (const [file, mainType] of pages) {
    const html = read(file);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const nodes = structuredData(html).flatMap(graphNodes);
    const mainEntity = nodes.find((node) => node["@type"] === mainType);
    const webPage = nodes.find((node) => node["@type"] === "WebPage");

    assert.ok(canonical?.endsWith("/"), file);
    assert.equal(mainEntity?.url, canonical, file);
    assert.equal(webPage?.url, canonical, file);
    assert.equal(webPage?.name, title, file);
  }
});

test("fall trip tools record useful, privacy-safe interactions", () => {
  const planner = read("public/fall-color/michigan-leaf-peeping-planner/index.html");
  const drives = read("public/fall-color/michigan-fall-color-drives/index.html");

  for (const html of [planner, drives]) {
    assert.ok(html.includes("window.va=window.va||function()"));
    assert.ok(html.includes('window.va("event"'));
  }
  for (const event of ["Fall Planner Run", "Fall Planner Location", "Fall Planner Guide Open"]) {
    assert.ok(planner.includes(event), event);
  }
  for (const event of ["Fall Drives Filter", "Fall Drives Map Open", "Fall Drives Guide Open"]) {
    assert.ok(drives.includes(event), event);
  }
  assert.doesNotMatch(planner, /track\([^;]*(?:coords|latitude|longitude)/);
});

test("the browser and daily writer share the August 20 to November 15 reporting window", () => {
  const { isFallReportSeason: serverInSeason } = require("../lib/fall-color/model.js");
  const hub = read("public/fall-color/index.html");
  const browserHelper = hub.match(
    /function isFallReportSeason\(m,d\)\{return ([^;]+);\}/,
  );
  assert.ok(browserHelper, "fall hub needs a testable browser season helper");
  const browserInSeason = Function("m", "d", `return ${browserHelper[1]};`);
  const cases = [
    [8, 19, false],
    [8, 20, true],
    [8, 31, true],
    [9, 1, true],
    [10, 31, true],
    [11, 15, true],
    [11, 16, false],
    [12, 1, false],
  ];

  for (const [month, day, expected] of cases) {
    assert.equal(serverInSeason(month, day), expected, `server ${month}/${day}`);
    assert.equal(browserInSeason(month, day), expected, `browser ${month}/${day}`);
  }
  assert.match(hub, /const todayIdx=inSeason\?todayFromSep1:null;/);
});

test("static and dynamic fall sitemaps make only supportable freshness claims", () => {
  const sitemap = read("public/sitemap.xml");
  const pages = fallPages();
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const modified = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
    assert.ok(modified, `${path.relative(root, file)} needs dateModified`);
    const relative = path.relative(fallRoot, path.dirname(file));
    const pathname = relative === "" ? "fall-color/" : `fall-color/${relative}/`;
    const escaped = pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      sitemap,
      new RegExp(`<loc>https:\\/\\/chrisizworski\\.com\\/${escaped}<\\/loc>\\s*<lastmod>${modified}<\\/lastmod>`),
      pathname,
    );
  }

  const handler = require("../lib/fall-color/routes/sitemap.js");
  let statusCode = null;
  let body = "";
  const response = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    send(value) { body = value; return this; },
  };
  handler({}, response);

  assert.equal(statusCode, 200);
  assert.ok(!body.includes("<lastmod>"));
  assert.ok(body.includes("/michigan-leaf-peeping-planner/"));
  assert.ok(body.includes("/michigan-fall-color-drives/"));
  assert.equal((body.match(/<url>/g) || []).length, 15);
});

test("priority-page schema and sitemap dates agree and are not in the future", () => {
  // This originally pinned literal dates (aurora and soo-locks 2026-08-07, mackinac 2026-08-06).
  // The intent was right and it caught a real bug: PR #44 changed mackinac's content on Aug 9 and
  // left both its stamp and its sitemap entry at Aug 6. But a literal pin goes stale on the next
  // legitimate edit of any of these pages, so it now asserts the property that actually matters,
  // which is that the two freshness signals agree with each other. scripts/stamp-freshness.mjs
  // derives both from git and `npm run freshness -- --check` is the gate.
  const routes = ["northern-lights-michigan", "soo-locks", "mackinac-bridge-live"];
  const sitemap = read("public/sitemap.xml");

  for (const route of routes) {
    const html = read(`public/${route}/index.html`);
    const stamp = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    assert.ok(stamp, `${route}: dateModified missing`);
    assert.ok(Date.parse(stamp[1]) <= Date.now(), `${route}: dateModified is in the future`);

    const entry = sitemap.match(
      new RegExp(`<loc>https://chrisizworski\\.com/${route}/</loc>\\s*<lastmod>(\\d{4}-\\d{2}-\\d{2})</lastmod>`),
    );
    assert.ok(entry, `${route}: missing sitemap entry with lastmod`);
    assert.equal(entry[1], stamp[1], `${route}: sitemap lastmod disagrees with dateModified`);
  }
});
