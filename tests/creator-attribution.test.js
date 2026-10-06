import test from "node:test";
import assert from "node:assert/strict";
import { addCreatorAttribution, CREATOR_PROFILE_URL, hasVisibleCreatorAttribution, inspectVisibleHtml } from "../lib/creator-attribution.mjs";

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

test("preserves an existing visible credit and stays idempotent", () => {
  const existing = '<footer><span>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></span></footer>';
  assert.equal(hasVisibleCreatorAttribution(existing), true);
  assert.equal(addCreatorAttribution(existing), existing);
  assert.equal(addCreatorAttribution(addCreatorAttribution(existing)), existing);
  const quiet = '<footer><span style="opacity:0.72">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></span></footer>';
  assert.equal(hasVisibleCreatorAttribution(quiet), true);
  assert.equal(addCreatorAttribution(quiet), quiet);
});

test("does not accept creator text or links hidden in comments, scripts, or hidden elements", () => {
  const falseCredits = [
    '<!-- Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> -->',
    '<script>document.write("Built by <a href=\\"https://chrisizworski.com/chris-izworski/\\">Chris Izworski</a>")</script>',
    '<div hidden>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></div>',
    '<div aria-hidden="true">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></div>',
    '<div style="display:none">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></div>',
    '<div hidden><div>Other</div>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></div>',
    '<template><footer>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></footer></template>',
  ];
  for (const falseCredit of falseCredits) {
    const result = addCreatorAttribution(`<main>${falseCredit}</main></body>`);
    assert.equal(hasVisibleCreatorAttribution(result), true);
    assert.match(result, /class="creator-credit-footer"/);
  }
});

test("inserts into a visible body when the only footer is hidden", () => {
  const result = addCreatorAttribution('<body><footer hidden>Hidden</footer></body>');
  assert.match(result, /<footer class="creator-credit-footer"/);
  assert.equal(hasVisibleCreatorAttribution(result), true);
});

test("does not pair unrelated visible words and a profile link from different regions", () => {
  const html = '<main><p>Built by the field crew.</p></main><nav><a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></nav></body>';
  const result = addCreatorAttribution(html);
  assert.match(result, /class="creator-credit-footer"/);
  assert.equal(hasVisibleCreatorAttribution(result), true);
});


test("skips raw script and style text without misreading fake closing tags", () => {
  const html = '<body><script>const x = "</body><footer>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></footer>";</script><style>.x::after{content:"</body><footer>"}</style><main>Useful tool</main></body>';
  const result = addCreatorAttribution(html);
  assert.equal(hasVisibleCreatorAttribution(result), true);
  assert.match(result, /class="creator-credit-footer"/);
  assert.ok(result.lastIndexOf('<footer class="creator-credit-footer"') > result.indexOf("</style>"));
});

test("hidden template closing tags cannot close visible ancestors", () => {
  const html = '<body><main><template></main></template><p>Useful page content</p></main></body>';
  const result = addCreatorAttribution(html);
  assert.equal(hasVisibleCreatorAttribution(result), true);
  assert.match(result, /class="creator-credit-footer"/);
});

test("a later repeated name does not invalidate an existing visible credit", () => {
  const html = '<footer>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a>. See <a href="/about/">Chris Izworski</a></footer>';
  assert.equal(hasVisibleCreatorAttribution(html), true);
  assert.equal(addCreatorAttribution(html), html);
});


test("recognizes contextual and fully clickable creator bylines", () => {
  const contextual = '<footer><span>By <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></span></footer>';
  const fullyClickable = '<footer><a href="https://chrisizworski.com/chris-izworski/">Built by Chris Izworski</a></footer>';
  assert.equal(hasVisibleCreatorAttribution(contextual), true);
  assert.equal(addCreatorAttribution(contextual), contextual);
  assert.equal(hasVisibleCreatorAttribution(fullyClickable), true);
  assert.equal(addCreatorAttribution(fullyClickable), fullyClickable);
});


test("reports only headings visible in the full document context", () => {
  const html = '<template><h1>Template heading</h1></template><div hidden><h1>Hidden heading</h1></div><h1>Useful visible heading</h1>';
  assert.deepEqual(inspectVisibleHtml(html).headings, ["Useful visible heading"]);
});
