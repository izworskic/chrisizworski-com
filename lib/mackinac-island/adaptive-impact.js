"use strict";

// Chooses which follow-up question is worth a visitor's time.
//
// The intake asks four base questions and then at most one follow-up. That follow-up
// used to be whichever eligible question came first in code order. Measured across all
// 2,000 base-answer combinations that trigger a follow-up, that pick was the most
// useful question only 40% of the time, and for 32.7% of visitors it was a question
// whose answer changes nothing at all (kids_ages is normalized and stored but never read).
//
// Instead, for each eligible question, run every possible answer through the same
// engines that personalize the tool (persona archetype, tab order, per-page focus, the
// spatial day plan, and the dining, lodging and regional rankings) and measure how
// much the visitor's result would actually move. Ask the one that moves it most, and
// ask nothing when no candidate would change the trip.
//
// The classifier is passed in rather than required, so intelligence.js can call this
// lazily without a require cycle.

const catalog = require("./catalog");
const spatial = require("./spatial");
const platform = require("./platform");

const SURFACES = Object.freeze(["plan", "ferries", "stay", "eat", "explore", "events", "straits"]);
// What a persona actually sees change across the tool. Per-page focus carries the most
// weight because it is what every page past the landing page shows.
const WEIGHTS = Object.freeze({ archetype: .16, tabs: .10, focus: .20, spatial: .18, dining: .12, lodging: .10, regional: .08 });
// Below this, an answer does not visibly change the trip, so the question is not worth asking.
const MIN_IMPACT = .02;
const OVERNIGHT = new Set(["one-night", "two-three", "four-plus"]);

function localDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function signature(intel, rawAnswers, date) {
  const answers = intel.normalizeAnswers(rawAnswers);
  const vector = intel.vectorFromAnswers(answers);
  const primary = (intel.archetypeScores(answers)[0] || { id: "first-time-day" }).id;
  // A light profile: everything the downstream engines read, without recomputing the
  // follow-up choice, which is what would recurse.
  const visitor = { answers, vector };
  const places = catalog.recommendations(visitor, date);
  const trip = OVERNIGHT.has(answers.trip_duration) ? "overnight" : "day-trip";
  const plan = spatial.buildCandidates({ visitor, places, profile: { trip } }).sort((a, b) => b.score - a.score)[0];
  const ids = (list, n) => list.slice(0, n).map((x) => x.id).join(",");
  return {
    archetype: primary,
    tabs: intel.tabPriority(answers, primary).slice(0, 4).map((t) => t.id).join(","),
    focus: SURFACES.map((s) => (platform.rankedFocus(s, visitor)[0] || {}).id).join(","),
    spatial: plan ? `${plan.id}|${JSON.stringify(plan.days || [])}` : "",
    dining: ids(places.dining.recommended, 3),
    lodging: places.lodging.relevant ? ids(places.lodging.recommended, 3) : "",
    regional: places.regional.relevant ? ids(places.regional.recommended, 2) : "",
  };
}

function changed(a, b) {
  let total = 0;
  for (const key of Object.keys(WEIGHTS)) if (a[key] !== b[key]) total += WEIGHTS[key];
  return total;
}

function impactOf(intel, answers, questionId, date = localDate()) {
  const question = intel.QUESTION_LIBRARY[questionId];
  if (!question || !question.options.length) return 0;
  const base = signature(intel, answers, date);
  let total = 0;
  for (const [value] of question.options) {
    const answer = question.type === "multi" ? [value] : value;
    total += changed(signature(intel, { ...answers, [questionId]: answer }, date), base);
  }
  return Math.round((total / question.options.length) * 1000) / 1000;
}

function rankByImpact(intel, answers, candidates, date = localDate()) {
  return candidates
    .map((id, order) => ({ id, order, impact: impactOf(intel, answers, id, date) }))
    .filter((x) => x.impact >= MIN_IMPACT)
    .sort((a, b) => b.impact - a.impact || a.order - b.order)
    .map(({ id, impact }) => ({ id, impact }));
}

module.exports = { rankByImpact, impactOf, signature, WEIGHTS, MIN_IMPACT, SURFACES };
