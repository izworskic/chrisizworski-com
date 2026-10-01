const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "public/assets/mackinac-island.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public/assets/mackinac-island.css"), "utf8");
const html = fs.readFileSync(path.join(root, "public/mackinac-island/index.html"), "utf8");
const route = require("../lib/mackinac-island/route.js");

// Rewritten 2026-09-29 for the one-screen day sheet. The questionnaire these tests guarded is
// gone; the guarantees are the same: every choice visibly replans the day, in place, with no
// stale answer winning a race, and the answer sits on the first screen.
const intent = fs.readFileSync(path.join(root, "public/assets/mackinac-intent.css"), "utf8");
const sheetSrc = fs.readFileSync(path.join(root, "lib/mackinac-island/day-sheet.js"), "utf8");

test("every change to the sentence replans the day", () => {
  assert.match(js, /change\(\{ \[key\]: el\.value \}, "sentence"\)/);
  assert.match(js, /function change\(changes, source\) \{[\s\S]*?plan\(source\);/);
  assert.match(js, /change\(action\.set, "heads-up"\)/);
});

test("a slower, older plan response never overwrites a newer one", () => {
  assert.match(js, /const id = \+\+seq;/);
  assert.match(js, /if \(id !== seq\) return;/);
});

test("changes are shown in place, with one kind of feedback", () => {
  assert.doesNotMatch(html, /id="planToast"|id="liveBar"|id="intakePreview"/);
  assert.match(css, /\.sheet\[aria-busy="true"\] \.sheet-headline/);
  assert.match(css, /\.pick\.changed\{animation:/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(html, /id="sheetStatus" role="status" aria-live="polite"/);
});

test("the answer is on the first screen, right under a one-sentence form", () => {
  assert.ok(html.indexOf('id="page-title"') < html.indexOf('id="tripForm"'));
  assert.ok(html.indexOf('id="tripForm"') < html.indexOf('id="sheetHeadline"'));
  assert.match(css, /\.sheet-wrap\{position:relative;z-index:2;margin-top:-64px\}/);
  assert.ok(!sheetSrc.includes("\u2014"), "no em dashes in visitor-facing sheet copy");
});

// overflow-x:hidden on both html and body makes body the scroll container, which
// silently disables every position:sticky element on the page.
test("sticky navigation actually sticks", () => {
  assert.match(intent, /@supports \(overflow:clip\)\{html,body\{overflow-x:clip\}\}/);
  assert.match(intent, /\.destination-nav-wrap\{position:sticky;top:0/);
  assert.doesNotMatch(css, /(html|body)[^{]*\{[^}]*overflow(-x)?:hidden/);
});

test("hidden pieces stay hidden despite display rules", () => {
  // .heads sets display:grid, which beats the browser's [hidden] rule without this.
  assert.match(css, /\.heads\[hidden\]/);
  assert.match(js, /heads\.hidden = !s\.heads_up\?\.length/);
});

// Sep 29 2026, Chris: "You begin by asking questions then you build an itinerary then you ask
// for more info? That's odd." One straight line: one question, then the plan, then nothing
// that asks again (no question headings, no pill buttons that look like choices, no follow-up
// question on the guide pages).
test("nothing after the plan asks for anything", () => {
  const afterPlan = html.slice(html.indexOf('id="sheet"'), html.indexOf("</main>"));
  assert.doesNotMatch(afterPlan, /<h[1-4][^>]*>[^<]*\?\s*<\/h[1-4]>/, "a question heading after the plan");
  assert.doesNotMatch(afterPlan, /class="related-links"|<select|<input/, "choice-looking controls after the plan");
  assert.doesNotMatch(html, /"@type":"FAQPage"/, "the page no longer asks questions, so no FAQ markup");
  const hub = fs.readFileSync(path.join(root, "public/assets/mackinac-hub.js"), "utf8");
  assert.doesNotMatch(hub, /data-adaptive-value|One more question/, "guide pages ask a follow-up question again");
  assert.doesNotMatch(sheetSrc, /Pick a date/, "the tomorrow notice tells people to do something");
});

test("engine headline reason is plain language", () => {
  const src = fs.readFileSync(path.join(root, "lib/mackinac-island/route.js"), "utf8");
  assert.match(src, /hours on the Island, \$\{conditionPhrase\(/);
  assert.doesNotMatch(src, /hours with a \$\{scoreLabel/);
  assert.doesNotMatch(src, /activity window and a return buffer/);
  assert.equal(typeof route, "function");
});
