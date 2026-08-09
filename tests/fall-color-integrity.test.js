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
    assert.ok(html.includes('"dateModified": "2026-08-09"'), `${relative} needs truthful schema freshness`);
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

test("static and dynamic fall sitemaps make only supportable freshness claims", () => {
  const sitemap = read("public/sitemap.xml");
  const pages = fallPages();
  for (const file of pages) {
    const relative = path.relative(fallRoot, path.dirname(file));
    const pathname = relative === "" ? "fall-color/" : `fall-color/${relative}/`;
    const escaped = pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      sitemap,
      new RegExp(`<loc>https:\\/\\/chrisizworski\\.com\\/${escaped}<\\/loc>\\s*<lastmod>2026-08-09<\\/lastmod>`),
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

test("priority-page schema and sitemap dates match their actual August edits", () => {
  const expectations = [
    ["northern-lights-michigan", "2026-08-07"],
    ["soo-locks", "2026-08-07"],
    ["mackinac-bridge-live", "2026-08-06"],
  ];
  const sitemap = read("public/sitemap.xml");

  for (const [route, date] of expectations) {
    const html = read(`public/${route}/index.html`);
    assert.ok(html.includes(`"dateModified": "${date}"`) || html.includes(`"dateModified":"${date}"`), route);
    assert.match(
      sitemap,
      new RegExp(`<loc>https:\\/\\/chrisizworski\\.com\\/${route}\\/<\\/loc>\\s*<lastmod>${date}<\\/lastmod>`),
      route,
    );
  }
});
