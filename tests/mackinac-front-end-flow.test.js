const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "public/assets/mackinac-island.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public/assets/mackinac-island.css"), "utf8");
const html = fs.readFileSync(path.join(root, "public/mackinac-island/index.html"), "utf8");
const route = require("../lib/mackinac-island/route.js");

// Before this, answering all four questions only showed a profile label; the plan
// rebuilt only after date, city and leave time were also entered. Answers must visibly move the trip.
test("every intake answer rebuilds the live plan", () => {
  assert.match(js, /function liveRefine\(label\)\{[\s\S]*?applyProfileToPlanner\(null\);[\s\S]*?loadDecision\(\{reason:/);
  assert.match(js, /state\.intakeStep\+\+;renderIntakeStep\(\);\s*liveRefine\(/);
  assert.match(js, /renderProfile\(j\.profile\);applyProfileToPlanner\(j\.profile\);\s*loadDecision\(\{reason:/);
});

test("a slower, older plan response never overwrites a newer one", () => {
  assert.match(js, /const seq=\+\+decisionSeq/);
  assert.match(js, /if\(seq!==decisionSeq\)return;/);
});

test("changes are shown to the visitor and announced to screen readers", () => {
  assert.match(html, /id="planToast" role="status" aria-live="polite"/);
  assert.match(js, /function announcePlanChanges\(before,reason\)/);
  assert.match(js, /classList\.add\('just-changed'\)/);
  assert.match(css, /\.just-changed\{animation:/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("the hero leads with the answer and carries no em dash in the verdict", () => {
  const hero = html.slice(html.indexOf('<section class="hero"'), html.indexOf("</section>", html.indexOf('<section class="hero"')));
  assert.ok(hero.indexOf('id="primaryRec"') < hero.indexOf('id="decisionGrid"'), "the answer must come before the metrics");
  assert.ok(hero.includes('data-scroll="#trip-intake"'), "the hero must lead into the questions");
  assert.doesNotMatch(js, /labelScore\(score\)\} — /);
});

test("the day renders before the form that adjusts it", () => {
  const planner = html.slice(html.indexOf('id="planner"'), html.indexOf('id="why"'));
  assert.ok(planner.indexOf('id="itinerary"') < planner.indexOf('id="tripBuilder"'));
});

// overflow-x:hidden on both html and body makes body the scroll container, which
// silently disables every position:sticky element on the page.
test("sticky navigation actually sticks", () => {
  assert.match(css, /@supports \(overflow:clip\)\{html,body\{overflow-x:clip\}\}/);
  assert.doesNotMatch(css, /body:not\(\.mackinac-plan-ready\)\s*\.trip-tabs-wrap/);
  assert.match(js, /renderTripTabs\(DEFAULT_TABS\)/);
});

test("hidden intake pieces stay hidden despite display rules", () => {
  assert.match(css, /\.intake-actions\[hidden\]/);
  assert.match(css, /\.ferry-columns>\*\{min-width:0\}/);
  assert.match(css, /\.timeline\{flex-wrap:wrap/);
});

test("engine prose uses the right article", () => {
  const src = fs.readFileSync(path.join(root, "lib/mackinac-island/route.js"), "utf8");
  assert.match(src, /usable island hours with \$\{withArticle\(/);
  assert.doesNotMatch(src, /hours with a \$\{scoreLabel/);
  assert.equal(typeof route, "function");
});
