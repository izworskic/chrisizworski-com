const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const I = require("../lib/mackinac-island/intelligence.js");
const AI = require("../lib/mackinac-island/adaptive-impact.js");
const Q = I.QUESTION_LIBRARY;
const DATE = "2026-09-26";

// Deterministic sample spanning every party, duration and trip-loss the intake offers.
const opts = (id) => Q[id].options.map((o) => o[0]);
const SAMPLE = [];
opts("party").forEach((party, i) => opts("trip_duration").forEach((trip_duration, j) => {
  const vision = opts("trip_vision")[(i + j) % 8], loss = opts("trip_loss")[(i * 3 + j) % 8];
  SAMPLE.push({ trip_duration, party, trip_vision: [vision], trip_loss: loss });
}));

test("kids_ages is never asked: nothing downstream reads it", () => {
  for (const a of SAMPLE) {
    assert.ok(!I.deterministicProfile(a).adaptive_candidates.includes("kids_ages"), JSON.stringify(a));
    assert.equal(AI.impactOf(I, a, "kids_ages", DATE), 0, "kids_ages started affecting output; reconsider asking it");
  }
});

test("the one follow-up is the eligible question with the highest measured impact", () => {
  for (const a of SAMPLE) {
    const p = I.deterministicProfile(a);
    const eligible = I.adaptiveCandidates(a).filter((id) => Q[id].stage === "adaptive");
    if (!eligible.length) continue;
    const scores = eligible.map((id) => AI.impactOf(I, a, id, DATE));
    const best = Math.max(...scores);
    if (best < AI.MIN_IMPACT) { assert.equal(p.next_question_id, null, "asked a question that changes nothing"); continue; }
    const chosen = AI.impactOf(I, a, p.next_question_id, DATE);
    assert.ok(best - chosen < 0.03, `${JSON.stringify(a)} chose ${p.next_question_id} (${chosen}) over a ${best} option`);
  }
});

test("no visitor is asked a follow-up whose answer changes nothing", () => {
  for (const a of SAMPLE) {
    const id = I.deterministicProfile(a).next_question_id;
    if (id) assert.ok(AI.impactOf(I, a, id, DATE) >= AI.MIN_IMPACT, `${id} changes nothing for ${JSON.stringify(a)}`);
  }
});

test("base questions are still asked first and in order", () => {
  assert.equal(I.deterministicProfile({}).next_question_id, "trip_duration");
  assert.equal(I.deterministicProfile({ trip_duration: "day" }).next_question_id, "party");
});

test("JEV's follow-up pick is grounded in measured impact", () => {
  const src = readFileSync(path.join(__dirname, "../lib/mackinac-island/intelligence.js"), "utf8");
  assert.match(src, /measured-follow-up-impact/);
  assert.match(src, /adaptive_impact:adaptiveImpact/);
});

test("visitor-facing question text holds no em dashes", () => {
  for (const q of Object.values(Q)) {
    assert.ok(!q.prompt.includes("\u2014"), q.id);
    for (const [, label] of q.options) assert.ok(!label.includes("\u2014"), `${q.id}: ${label}`);
  }
});

test("the fine-tune form leads with what the intake never asks and collapses the rest", () => {
  const html = readFileSync(path.join(__dirname, "../public/mackinac-island/index.html"), "utf8");
  const form = html.slice(html.indexOf('id="tripBuilder"'), html.indexOf("</form>", html.indexOf('id="tripBuilder"')));
  const more = form.indexOf('id="builderMore"');
  assert.ok(more > 0, "fine-tune corrections are no longer collapsed");
  // Measured: must-dos changed the itinerary in every run and dinner changed the plan in two
  // thirds, and neither is asked by the intake, so both stay visible.
  assert.ok(form.indexOf('id="mustDoChoices"') < more, "must-dos were hidden");
  assert.ok(form.indexOf('id="dinner"') < more, "dinner was hidden");
  // Everything the intake already sets lives inside the collapsed corrections.
  for (const id of ["tripMode", "childCount", "adultCount", "bikePlan", "pace", "mobility", "interestChoices", "tripDate", "departTime"]) {
    assert.ok(form.indexOf(`id="${id}"`) > more, `${id} is back in the always-visible ask`);
  }
});
