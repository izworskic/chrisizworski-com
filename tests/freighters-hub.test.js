import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = name => readFileSync(path.join(root, name), "utf8");
const html = read("public/freighters/index.html");
const css = read("public/assets/freighters-hub.css");
const js = read("public/assets/freighters-hub.js");

test("Freighter Central owns a distinct, indexable search intent and Chris Izworski entity", () => {
  assert.match(html, /<title>Great Lakes Freighter Central:/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/freighters\/"/);
  assert.match(html, /Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/"/);
  assert.doesNotMatch(html, /<meta[^>]*name="robots"[^>]*noindex/);
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, "JSON-LD graph must exist");
  const graph = JSON.parse(match[1])["@graph"];
  assert.equal(graph.find(n => n["@type"] === "Person")["@id"], "https://chrisizworski.com/#person");
  const page = graph.find(n => n["@type"] === "CollectionPage");
  assert.equal(page.author["@id"], "https://chrisizworski.com/#person");
  assert.equal(page.isPartOf["@id"], "https://chrisizworski.com/#website");
});

test("Every static internal freighter hub link resolves to a local page", () => {
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map(m => m[1]);
  for (const href of hrefs) {
    const dest = href.split("#")[0].split("?")[0];
    if (dest === "/" || dest.startsWith("/assets/") || dest.startsWith("/_vercel/")) continue;
    const local = path.join(root, "public", dest.replace(/^\//, ""), dest.endsWith("/") ? "index.html" : "");
    assert.ok(existsSync(local), dest + " must resolve to a page");
  }
});

test("All six corridor deep links match the source AIS map view keys", () => {
  const tracker = read("public/assets/freighter-tracker.js");
  const keys = ["soo", "duluth", "detroit", "saginaw", "port-huron", "mackinac"];
  for (const key of keys) {
    assert.match(html, new RegExp('href="/great-lakes-freighter-tracking/#' + key + '"'));
    assert.ok(tracker.includes(key === "port-huron" ? '"port-huron":' : key + ":"), key + " AIS map view not defined");
    assert.ok(js.includes(key), key + " finder route not defined");
  }
});

test("Finder, styles, navigation, sitemap and active fallback are intact", () => {
  assert.match(html, /<select id="corridor">/);
  assert.match(html, /name="intent" value="shore"/);
  assert.match(html, /name="intent" value="news"/);
  assert.match(html, /<noscript>/);
  assert.match(html, /AIS.*delayed or incomplete/i);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /focus-visible/);
  assert.match(read("public/great-lakes/index.html"), /href="\/freighters\/"/);
  assert.match(read("public/tools/index.html"), /href="\/freighters\/"/);
  assert.match(read("public/great-lakes-freighter-tracking/index.html"), /href="\/freighters\/"/);
  assert.match(read("public/sitemap.xml"), /<loc>https:\/\/chrisizworski\.com\/freighters\/<\/loc>/);
});
