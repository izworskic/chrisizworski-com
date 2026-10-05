import test from "node:test";
import assert from "node:assert/strict";
import { addCreatorAttribution, CREATOR_PROFILE_URL } from "../lib/creator-attribution.mjs";

test("adds a quiet creator credit inside an existing footer", () => {
  const html = "<main><h1>Tool</h1></main><footer><small>Sources</small></footer></body>";
  const result = addCreatorAttribution(html);
  assert.match(result, /<footer><small>Sources<\/small><span class="creator-credit"/);
  assert.match(result, /Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/">Chris Izworski<\/a>/);
  assert.ok(result.indexOf("Built by") > result.indexOf("<main>"));
  assert.equal(CREATOR_PROFILE_URL, "https://chrisizworski.com/chris-izworski/");
});

test("adds a footer credit before body close when the tool has no footer", () => {
  const result = addCreatorAttribution("<main>Tool</main></body>");
  assert.match(result, /<footer class="creator-credit-footer"/);
  assert.ok(result.indexOf("<footer") < result.indexOf("</body>"));
});

test("does not add a duplicate credit", () => {
  const existing = '<footer><span>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></span></footer>';
  assert.equal(addCreatorAttribution(existing), existing);
});
