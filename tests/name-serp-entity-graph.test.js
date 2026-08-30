import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(
  new URL("../public/chris-izworski/index.html", import.meta.url),
  "utf8",
);

function jsonLdBlocks(source) {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

test("canonical Chris profile uses Google ProfilePage mainEntity semantics", () => {
  const blocks = jsonLdBlocks(html);
  const nodes = blocks.flatMap((block) => block["@graph"] || [block]);
  const person = nodes.find((node) => node["@id"] === "https://chrisizworski.com/#person");
  const profile = nodes.find(
    (node) =>
      node["@type"] === "ProfilePage" &&
      node["@id"] === "https://chrisizworski.com/chris-izworski/",
  );

  assert.ok(person);
  assert.ok(profile);
  assert.deepEqual(profile.mainEntity, { "@id": "https://chrisizworski.com/#person" });
  assert.equal(profile.dateModified, "2026-08-30");
});

test("sameAs is identity-oriented while authored projects live in hasPart", () => {
  const blocks = jsonLdBlocks(html);
  const nodes = blocks.flatMap((block) => block["@graph"] || [block]);
  const person = nodes.find((node) => node["@id"] === "https://chrisizworski.com/#person");
  const profile = nodes.find((node) => node["@type"] === "ProfilePage");

  const sameAs = new Set(person.sameAs || []);
  for (const url of [
    "https://github.com/izworskic",
    "https://www.linkedin.com/in/chris-izworski-15294510",
    "https://www.wikidata.org/wiki/Q138283432",
    "https://orcid.org/0009-0002-7268-6083",
    "https://medium.com/@izworski",
    "https://about.me/chrisizworski",
    "https://www.youtube.com/@izworskic",
  ]) {
    assert.ok(sameAs.has(url), `missing identity sameAs: ${url}`);
  }

  assert.ok(Array.isArray(profile.hasPart));
  assert.ok(profile.hasPart.length >= 6);
  for (const work of profile.hasPart) {
    assert.deepEqual(work.author, { "@id": "https://chrisizworski.com/#person" });
    assert.match(work.url, /^https:\/\//);
  }

  const workUrls = new Set(profile.hasPart.map((work) => work.url));
  assert.ok(workUrls.has("https://michiganoutdoorsnow.chrisizworski.com/"));
  assert.ok(workUrls.has("https://tcwine.chrisizworski.com/"));
  assert.ok(workUrls.has("https://gazette.chrisizworski.com/"));
  assert.ok(workUrls.has("https://michigantroutreport.com/"));
  assert.ok(workUrls.has("https://michiganbirdingreport.com/"));
});

test("canonical profile exposes rel-me identity links and visible work", () => {
  assert.match(html, /rel="me" href="https:\/\/github\.com\/izworskic"/);
  assert.match(html, /rel="me" href="https:\/\/orcid\.org\/0009-0002-7268-6083"/);
  assert.match(html, /Selected Work and Live Projects/);
  assert.match(html, /Michigan Outdoors Now/);
  assert.match(html, /Traverse City Wine Country/);
  assert.match(html, /Great Lakes Gazette/);
  assert.match(html, /identity verification/);
});
