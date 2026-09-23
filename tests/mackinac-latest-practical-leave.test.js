const test = require("node:test");
const assert = require("node:assert/strict");
const t = require("../lib/mackinac-island/route.js")._test;

// Salvaged from PR #444. With a future trip date and no leave-home time, the planner used
// to anchor the trip at midnight and park the visitor at the dock. Reproduced in production
// on 2026-09-23 for a Detroit trip on 2026-09-26: leave 12:00 AM, 405 idle minutes before the
// 7:30 AM ferry, door-to-island 470 minutes. It must work backward from the chosen ferry.
function ctxFor(date, query) {
  const profile = t.profileFromQuery(query, ["day-trip"], "lower");
  return {
    ctx: {
      date, personas: profile.personas, origin: "lower", profile, hourly: [],
      marine: { score: 90 }, attractions: t.attractionState(date, 8 * 60), events: [],
      sunrise: t.solarMinutes(date, 45.8497, -84.6189, true),
      sunset: t.solarMinutes(date, 45.8497, -84.6189, false),
      sameDay: false, nowMinutes: 7 * 60,
    },
    records: [...t.arnoldSchedule(date, true), ...t.sheplersSchedule(date, true)],
  };
}

test("a future trip with no leave time never starts at midnight or idles at the dock", () => {
  const { ctx, records } = ctxFor("2026-09-26", { origin_city: "detroit" });
  const plans = t.planCandidates(records, ctx);
  assert.ok(plans.length, "no plans produced");
  for (const plan of plans) {
    assert.ok(plan.trip_start_minutes > 0, `${plan.id} starts at midnight`);
    assert.ok(plan.pre_ferry_idle_minutes <= 30, `${plan.id} idles ${plan.pre_ferry_idle_minutes} min at the dock`);
  }
});

test("an explicit leave-home time is still honored exactly", () => {
  const { ctx, records } = ctxFor("2026-09-26", { origin_city: "detroit", depart_at: "05:00" });
  const plan = t.planCandidates(records, ctx)[0];
  assert.equal(plan.trip_start_minutes, 5 * 60);
});

test("a not-before constraint is respected when no leave time is given", () => {
  const { ctx, records } = ctxFor("2026-09-26", { origin_city: "detroit", depart_not_before: "08:00" });
  for (const plan of t.planCandidates(records, ctx)) {
    assert.ok(plan.trip_start_minutes >= 8 * 60, `${plan.id} leaves before the 8:00 AM floor`);
  }
});
